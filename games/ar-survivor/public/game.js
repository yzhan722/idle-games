// game.js — DeepSeek娘桌面宠物级实景交互（抓边爬台 / 蹲伏戳物体 / 坐边缘晃腿 / 摸头傲娇 / 物理轨迹回归中心）

import { ARVisionEngine } from './vision.js?v=hd31';
import {
  drawHeroSprite,
  drawEnemySprite,
  drawStarGoal,
  drawFoodItem,
  drawToyItem,
  drawFurnitureItem,
  drawStudyCompanionProp,
  drawAfternoonTeaProp,
  drawTerrariumDeskShelf,
  drawGoodnightMusicboxProp,
  drawCollageKeepsakeFrame,
  drawCozyTabletopRadio,
  drawCrochetKeepsakeDesk,
  drawHotCocoaProp,
  drawPressedFlowerDesk,
  drawStargazeTelescopeProp,
  drawWatercolorWallGallery,
  drawWatercolorEaselProp,
  drawMailboxDeskProp,
  getWatercolorGalleryLayout,
  getMailboxDeskAnchor,
  drawMemoryWallBoard,
  drawBentoLunchDesk,
  drawBentoKitchenProp,
  getMemoryWallLayout,
  getBentoDeskAnchor,
  getWindowSillLayout,
  drawWindowsillVisitors,
  drawGreetingCardCraftProp,
  getPicnicBasketDeskAnchor,
  getPicnicBlanketLayout,
  drawPicnicBasketDesk,
  drawPicnicOutingProp,
  drawDiaryWritingProp,
  getPotteryShelfLayout,
  drawPotteryShelf,
  drawPotteryWheelProp,
  getAromaTableDeskAnchor,
  drawAromaTableDesk,
  drawAromaBlendProp,
  getAr15CornerLayout,
  drawAr15WindowCorner,
  drawStarCardProp,
  drawRainListenProp,
  getAr16WallLayout,
  drawAr16WallHoop,
  getAr16FloorLayout,
  drawAr16FloorHearth,
  drawEmbroideryProp,
  drawHearthSnackProp,
  drawInteractionVfx,
  images,
  isReady
} from './sprites.js?v=hd31';
import { petAudio } from './audio.js?v=hd31';

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

function formatLocalDateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getPrevDateKey(d = new Date()) {
  const prev = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
  return formatLocalDateKey(prev);
}

function getPast7DateKeys(d = new Date()) {
  const keys = [];
  for (let offset = 6; offset >= 0; offset--) {
    const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate() - offset);
    keys.push(formatLocalDateKey(dt));
  }
  return keys;
}

function getWeekCycleKey(d = new Date()) {
  const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((utc - yearStart) / 86400000 + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function deriveClockWindowAmbience(d = new Date()) {
  const hour = d.getHours();
  let period = 'starry';
  if (hour >= 5 && hour < 11) {
    period = 'morning';
  } else if (hour >= 11 && hour < 17) {
    period = 'noon';
  } else if (hour >= 17 && hour < 20) {
    period = 'dusk';
  }
  const month = d.getMonth() + 1;
  let season = 'winter';
  if (month >= 3 && month <= 5) {
    season = 'spring';
  } else if (month >= 6 && month <= 8) {
    season = 'summer';
  } else if (month >= 9 && month <= 11) {
    season = 'autumn';
  }
  return { period, season };
}

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
        windowAmbience: player.windowAmbience,
        pomodoro: player.pomodoro,
        afternoonTea: player.afternoonTea,
        weeklyJournal: player.weeklyJournal,
        terrarium: player.terrarium,
        goodnightMusicbox: player.goodnightMusicbox,
        collageKeepsake: player.collageKeepsake,
        cozyRadio: player.cozyRadio,
        crochetBasket: player.crochetBasket,
        hotCocoa: player.hotCocoa,
        pressedFlowers: player.pressedFlowers,
        telescope: player.telescope,
        watercolor: player.watercolor,
        mailbox: player.mailbox,
        bentoKitchen: player.bentoKitchen,
        memoryPuzzle: player.memoryPuzzle,
        kittenCorner: player.kittenCorner,
        greetingCards: player.greetingCards,
        picnicBasket: player.picnicBasket,
        diaryBook: player.diaryBook,
        potteryWheel: player.potteryWheel,
        aromaTable: player.aromaTable,
        starProjector: player.starProjector,
        rainCorner: player.rainCorner,
        embroideryHoop: player.embroideryHoop,
        hearthCorner: player.hearthCorner,
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
  isFocusStudying: false,
  isGoodnightSleeping: false,
  isRadioListening: false,
  cozyRadioVisual: { playing: false, code: 'CH-01 播音' },
  crochetDeskVisual: { displayed: false, knitId: 'whale_scarf', spriteKey: 'knitWhaleScarf', shortName: '蓝鲸围巾', level: 0, totalLevel: 0 },
  displayedTerrariumPlants: [],
  hideTerrariumLabels: false,
  teaPlatterTimer: 0,
  cocoaCupTimer: 0,
  cocoaToppingId: 'star_marshmallow',
  pressedDeskVisual: { displayed: false, items: [], totalLevel: 0 },
  isStargazing: false,
  stargazeCheerTimer: 0,
  watercolorWallVisual: { items: [], gallerySize: 0, total: 9 },
  isPainting: false,
  paintingCheerTimer: 0,
  paintingWashColor: 'rgba(214, 228, 244, 0.5)',
  mailboxVisual: { unread: 0 },
  memoryWallVisual: { items: [], count: 0, total: 6 },
  bentoDeskVisual: { bagCount: 0 },
  isCookingBento: false,
  bentoCheerTimer: 0,
  kittenVisual: { active: false, kittenId: '', spriteKey: '', label: '', fed: false, eating: false, petPulse: 0, arriveAge: 1, facing: 1 },
  sillCardVisual: { count: 0 },
  sillCamX: 0,
  isCraftingCard: false,
  craftStickerKey: '',
  cardCheerTimer: 0,
  picnicVisual: { packed: false, weekend: false, outing: false, spotId: '', foods: [], shared: [], packing: false, packKey: '' },
  picnicCheerTimer: 0,
  isWritingDiary: false,
  diaryStickerKey: '',
  diaryCheerTimer: 0,
  potteryVisual: { pieces: [], shaping: false, progress: 0, shapeKey: '', glazeRgb: '', firing: false, phase: 'shape', cheer: 0 },
  aromaVisual: { active: false, blending: false, moodRgb: '', seasonRgb: '', label: '', drops: 0, cheer: 0 },
  potteryCheerTimer: 0,
  aromaCheerTimer: 0,
  starVisual: { active: false, cardId: '', rgb: '', aligning: false, taps: 0, need: 0, cheer: 0, label: '' },
  rainVisual: { listening: false, weatherId: '', rgb: '', cardOpen: false, ring: 0, cheer: 0, label: '' },
  starCheerTimer: 0,
  rainCheerTimer: 0,
  embroideryVisual: { active: false, patternId: '', patternRgb: '', threadRgb: '', progress: 0, stitches: 0, taps: 0, need: 0, cardOpen: false, cheer: 0, hung: 0, label: '', wall: [] },
  hearthVisual: { level: 0, rgb: '', cuddle: false, cardOpen: false, roasting: false, flips: 0, need: 0, snackRgb: '', flip: 0, cheer: 0, label: '' },
  embroideryCheerTimer: 0,
  hearthCheerTimer: 0,
  ar16FloorBottom: 0,
  windowAmbience: (() => {
    const clockAmb = deriveClockWindowAmbience();
    const rawAmb = savedPet.windowAmbience || {};
    const autoSync = rawAmb.autoSync !== undefined ? Boolean(rawAmb.autoSync) : true;
    const validPeriod = ['morning', 'noon', 'dusk', 'starry'].includes(rawAmb.period)
      ? rawAmb.period
      : clockAmb.period;
    const validSeason = ['spring', 'summer', 'autumn', 'winter'].includes(rawAmb.season)
      ? rawAmb.season
      : clockAmb.season;
    return {
      autoSync,
      period: autoSync ? clockAmb.period : validPeriod,
      season: autoSync ? clockAmb.season : validSeason
    };
  })(),
  pomodoro: (() => {
    const rawPomo = savedPet.pomodoro || {};
    const todayKey = formatLocalDateKey();
    const savedTodayKey = typeof rawPomo.todayDate === 'string' ? rawPomo.todayDate : '';
    const lastDoneKey = typeof rawPomo.lastCompletedDate === 'string' ? rawPomo.lastCompletedDate : '';
    const prevKey = getPrevDateKey();
    let streakDays = Math.max(0, Number(rawPomo.streakDays) || 0);
    if (lastDoneKey && lastDoneKey !== todayKey && lastDoneKey !== prevKey) {
      streakDays = 0;
    }
    return {
      selectedMinutes: [15, 25, 45].includes(Number(rawPomo.selectedMinutes))
        ? Number(rawPomo.selectedMinutes)
        : 25,
      taskTag:
        typeof rawPomo.taskTag === 'string' && rawPomo.taskTag.trim()
          ? rawPomo.taskTag.trim().slice(0, 18)
          : '敲代码',
      totalStamps: Math.max(0, Number(rawPomo.totalStamps) || 0),
      completedSessions: Math.max(0, Number(rawPomo.completedSessions) || 0),
      totalFocusMinutes: Math.max(0, Number(rawPomo.totalFocusMinutes) || 0),
      streakDays,
      lastCompletedDate: lastDoneKey,
      todayDate: todayKey,
      todaySessions: savedTodayKey === todayKey ? Math.max(0, Number(rawPomo.todaySessions) || 0) : 0
    };
  })(),
  afternoonTea: (() => {
    const rawTea = savedPet.afternoonTea || {};
    const validBases = ['peach_oolong', 'blueberry_foam', 'osmanthus_milk'];
    const validPastries = ['souffle', 'whale_macaron', 'pudding_tart'];
    const discovered = {};
    if (rawTea.discoveredRecipes && typeof rawTea.discoveredRecipes === 'object') {
      for (const [k, v] of Object.entries(rawTea.discoveredRecipes)) {
        if (v && typeof v === 'object') {
          discovered[k] = {
            count: Math.max(1, Number(v.count) || 1),
            firstDate: typeof v.firstDate === 'string' ? v.firstDate : formatLocalDateKey()
          };
        } else if (v) {
          discovered[k] = { count: 1, firstDate: formatLocalDateKey() };
        }
      }
    }
    let activeBuff = null;
    if (rawTea.activeBuff && typeof rawTea.activeBuff === 'object' && Number(rawTea.activeBuff.remainingSec) > 0) {
      activeBuff = {
        recipeId: String(rawTea.activeBuff.recipeId || 'peach_oolong__whale_macaron'),
        name: String(rawTea.activeBuff.name || '桃汐蓝鲸马卡龙席'),
        buffTitle: String(rawTea.activeBuff.buffTitle || '星汐全吸力'),
        magnetBonusPct: Math.max(0, Number(rawTea.activeBuff.magnetBonusPct) || 0),
        attackHastePct: Math.max(0, Number(rawTea.activeBuff.attackHastePct) || 0),
        startingShield: Math.max(0, Math.round(Number(rawTea.activeBuff.startingShield) || 0)),
        coinBonusPct: Math.max(0, Number(rawTea.activeBuff.coinBonusPct) || 0),
        durationSec: Math.max(60, Number(rawTea.activeBuff.durationSec) || 420),
        remainingSec: Math.max(0, Number(rawTea.activeBuff.remainingSec) || 0)
      };
    }
    return {
      selectedTea: validBases.includes(rawTea.selectedTea) ? rawTea.selectedTea : 'peach_oolong',
      selectedPastry: validPastries.includes(rawTea.selectedPastry) ? rawTea.selectedPastry : 'whale_macaron',
      discoveredRecipes: discovered,
      totalServed: Math.max(0, Number(rawTea.totalServed) || 0),
      activeBuff
    };
  })(),
  weeklyJournal: (() => {
    const rawJ = savedPet.weeklyJournal || {};
    const validMoods = ['bliss', 'focus', 'cozy', 'star', 'goodnight'];
    const cleanDays = {};
    if (rawJ.days && typeof rawJ.days === 'object') {
      const sortedKeys = Object.keys(rawJ.days)
        .filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k))
        .sort()
        .slice(-24);
      for (const k of sortedKeys) {
        const d = rawJ.days[k] || {};
        cleanDays[k] = {
          feeds: Math.max(0, Number(d.feeds) || 0),
          chats: Math.max(0, Number(d.chats) || 0),
          snaps: Math.max(0, Number(d.snaps) || 0),
          focusMins: Math.max(0, Number(d.focusMins) || 0),
          teas: Math.max(0, Number(d.teas) || 0),
          shifts: Math.max(0, Number(d.shifts) || 0),
          sleepMins: Math.max(0, Number(d.sleepMins) || 0),
          plantCares: Math.max(0, Number(d.plantCares) || 0),
          radioMins: Math.max(0, Number(d.radioMins) || 0),
          collages: Math.max(0, Number(d.collages) || 0),
          cocoas: Math.max(0, Number(d.cocoas) || 0),
          knits: Math.max(0, Number(d.knits) || 0),
          presses: Math.max(0, Number(d.presses) || 0),
          stargazes: Math.max(0, Number(d.stargazes) || 0),
          paints: Math.max(0, Number(d.paints) || 0),
          letters: Math.max(0, Number(d.letters) || 0),
          bentos: Math.max(0, Number(d.bentos) || 0),
          puzzles: Math.max(0, Number(d.puzzles) || 0),
          kittens: Math.max(0, Number(d.kittens) || 0),
          cards: Math.max(0, Number(d.cards) || 0),
          picnics: Math.max(0, Math.min(99, Math.round(Number(d.picnics) || 0))),
          picnicPreps: Math.max(0, Math.min(99, Math.round(Number(d.picnicPreps) || 0))),
          diaries: Math.max(0, Math.min(999, Math.round(Number(d.diaries) || 0))),
          potteries: Math.max(0, Math.min(99, Math.round(Number(d.potteries) || 0))),
          aromas: Math.max(0, Math.min(99, Math.round(Number(d.aromas) || 0))),
          stars: Math.max(0, Math.min(99, Math.round(Number(d.stars) || 0))),
          rains: Math.max(0, Math.min(99, Math.round(Number(d.rains) || 0))),
          embroideries: Math.max(0, Math.min(99, Math.round(Number(d.embroideries) || 0))),
          snacks: Math.max(0, Math.min(99, Math.round(Number(d.snacks) || 0))),
          stamped: Boolean(d.stamped),
          moodId: validMoods.includes(d.moodId) ? d.moodId : 'bliss'
        };
      }
    }
    const rawCum = rawJ.cumulative || {};
    const cleanClaimed = {};
    if (rawJ.claimedBoxesByWeek && typeof rawJ.claimedBoxesByWeek === 'object') {
      for (const [wk, val] of Object.entries(rawJ.claimedBoxesByWeek)) {
        if (val && typeof val === 'object') {
          cleanClaimed[wk] = {
            tier1: Boolean(val.tier1),
            tier2: Boolean(val.tier2),
            tier3: Boolean(val.tier3)
          };
        }
      }
    }
    return {
      selectedMood: validMoods.includes(rawJ.selectedMood) ? rawJ.selectedMood : 'bliss',
      days: cleanDays,
      cumulative: {
        totalFeeds: Math.max(0, Number(rawCum.totalFeeds) || 0),
        totalChats: Math.max(0, Number(rawCum.totalChats) || Number(savedPet.topicsChatted) || 0),
        totalSnaps: Math.max(0, Number(rawCum.totalSnaps) || 0),
        totalFocusMins: Math.max(
          0,
          Number(rawCum.totalFocusMins) || Number(savedPet.pomodoro?.totalFocusMinutes) || 0
        ),
        totalTeas: Math.max(0, Number(rawCum.totalTeas) || Number(savedPet.afternoonTea?.totalServed) || 0),
        totalShifts: Math.max(0, Number(rawCum.totalShifts) || 0),
        totalSleepMins: Math.max(
          0,
          Number(rawCum.totalSleepMins) || Number(savedPet.goodnightMusicbox?.totalSleepMinutes) || 0
        ),
        totalPlantCares: Math.max(
          0,
          Number(rawCum.totalPlantCares) || Number(savedPet.terrarium?.totalCares) || 0
        ),
        totalRadioMins: Math.max(
          0,
          Number(rawCum.totalRadioMins) || Number(savedPet.cozyRadio?.totalListenMinutes) || 0
        ),
        totalCollages: Math.max(
          0,
          Number(rawCum.totalCollages) || Number(savedPet.collageKeepsake?.savedCount) || 0
        ),
        totalCocoas: Math.max(
          0,
          Number(rawCum.totalCocoas) || Number(savedPet.hotCocoa?.totalServed) || 0
        ),
        totalKnits: Math.max(
          0,
          Number(rawCum.totalKnits) || Number(savedPet.crochetBasket?.totalStitches) || 0
        ),
        totalPresses: Math.max(
          0,
          Number(rawCum.totalPresses) || Number(savedPet.pressedFlowers?.totalPresses) || 0
        ),
        totalStargazes: Math.max(
          0,
          Number(rawCum.totalStargazes) || Number(savedPet.telescope?.totalSessions) || 0
        ),
        totalPaints: Math.max(
          0,
          Number(rawCum.totalPaints) || Number(savedPet.watercolor?.totalPaintings) || 0
        ),
        totalLetters: Math.max(
          0,
          Number(rawCum.totalLetters) || Number(savedPet.mailbox?.totalReplies) || 0
        ),
        totalBentos: Math.max(
          0,
          Number(rawCum.totalBentos) || Number(savedPet.bentoKitchen?.totalBentos) || 0
        ),
        totalPuzzles: Math.max(
          0,
          Number(rawCum.totalPuzzles) || Number(savedPet.memoryPuzzle?.totalPuzzles) || 0
        ),
        totalKittenCares: Math.max(
          0,
          Number(rawCum.totalKittenCares) ||
            (Number(savedPet.kittenCorner?.totalFeeds) || 0) + (Number(savedPet.kittenCorner?.totalPets) || 0) ||
            0
        ),
        totalCards: Math.max(
          0,
          Number(rawCum.totalCards) || Number(savedPet.greetingCards?.totalCards) || 0
        ),
        totalPicnics: Math.max(
          0,
          Math.round(Number(rawCum.totalPicnics) || Number(savedPet.picnicBasket?.totalPicnics) || 0)
        ),
        totalPicnicPreps: Math.max(
          0,
          Math.round(Number(rawCum.totalPicnicPreps) || Number(savedPet.picnicBasket?.totalPreps) || 0)
        ),
        totalDiaryStickers: Math.max(
          0,
          Math.round(Number(rawCum.totalDiaryStickers) || Number(savedPet.diaryBook?.totalStickers) || 0)
        ),
        totalPotteries: Math.max(
          0,
          Math.min(999999, Math.round(Number(rawCum.totalPotteries) || Number(savedPet.potteryWheel?.totalPieces) || 0))
        ),
        totalAromas: Math.max(
          0,
          Math.min(999999, Math.round(Number(rawCum.totalAromas) || Number(savedPet.aromaTable?.totalBlends) || 0))
        ),
        totalStars: Math.max(
          0,
          Math.min(999999, Math.round(Number(rawCum.totalStars) || Number(savedPet.starProjector?.totalLights) || 0))
        ),
        totalRains: Math.max(
          0,
          Math.min(999999, Math.round(Number(rawCum.totalRains) || Number(savedPet.rainCorner?.totalNotes) || 0))
        ),
        totalEmbroideries: Math.max(
          0,
          Math.min(999999, Math.round(Number(rawCum.totalEmbroideries) || Number(savedPet.embroideryHoop?.totalPieces) || 0))
        ),
        totalSnacks: Math.max(
          0,
          Math.min(999999, Math.round(Number(rawCum.totalSnacks) || Number(savedPet.hearthCorner?.totalSnacks) || 0))
        )
      },
      claimedBoxesByWeek: cleanClaimed
    };
  })(),
  terrarium: (() => {
    const rawT = savedPet.terrarium || {};
    const validIds = ['peach_succulent', 'star_lily', 'blue_hydrangea'];
    const rawPlants = rawT.plants && typeof rawT.plants === 'object' ? rawT.plants : {};
    const makePlant = (id, defMoist, defSun, defDew, defDisp) => {
      const p = rawPlants[id] || {};
      const lv = Math.max(1, Math.min(5, Math.round(Number(p.level) || 1)));
      return {
        level: lv,
        growthXp: lv >= 5 ? 0 : Math.max(0, Math.round(Number(p.growthXp) || 0)),
        moisture: Math.max(10, Math.min(100, Math.round(p.moisture !== undefined ? Number(p.moisture) : defMoist))),
        sunlight: Math.max(10, Math.min(100, Math.round(p.sunlight !== undefined ? Number(p.sunlight) : defSun))),
        dewStacks: Math.max(0, Math.min(3, Math.round(p.dewStacks !== undefined ? Number(p.dewStacks) : defDew))),
        dewAcc: Math.max(0, Number(p.dewAcc) || 0),
        deskDisplayed: p.deskDisplayed !== undefined ? Boolean(p.deskDisplayed) : defDisp,
        cares: Math.max(0, Math.round(Number(p.cares) || 0))
      };
    };
    return {
      selectedPlant: validIds.includes(rawT.selectedPlant) ? rawT.selectedPlant : 'peach_succulent',
      totalCares: Math.max(0, Math.round(Number(rawT.totalCares) || 0)),
      totalDewHarvested: Math.max(0, Math.round(Number(rawT.totalDewHarvested) || 0)),
      plants: {
        peach_succulent: makePlant('peach_succulent', 64, 62, 1, true),
        star_lily: makePlant('star_lily', 58, 56, 0, false),
        blue_hydrangea: makePlant('blue_hydrangea', 55, 58, 0, false)
      }
    };
  })(),
  goodnightMusicbox: (() => {
    const rawMb = savedPet.goodnightMusicbox || {};
    const validMelodies = ['star_lullaby', 'rain_chime', 'cloud_waltz'];
    return {
      selectedMinutes: [15, 30, 45].includes(Number(rawMb.selectedMinutes))
        ? Number(rawMb.selectedMinutes)
        : 30,
      melodyId: validMelodies.includes(rawMb.melodyId) ? rawMb.melodyId : 'star_lullaby',
      chimeMuted: Boolean(rawMb.chimeMuted),
      totalStamps: Math.max(0, Math.round(Number(rawMb.totalStamps) || 0)),
      completedSessions: Math.max(0, Math.round(Number(rawMb.completedSessions) || 0)),
      totalSleepMinutes: Math.max(0, Math.round(Number(rawMb.totalSleepMinutes) || 0)),
      lastCompletedDate: typeof rawMb.lastCompletedDate === 'string' ? rawMb.lastCompletedDate : ''
    };
  })(),
  collageKeepsake: (() => {
    const rawC = savedPet.collageKeepsake || {};
    const validStyles = ['lace_ivory', 'honey_kraft', 'sakura_letter'];
    const validPhotos = ['peace_snap', 'cheer_snap', 'study_snap', 'album_latest'];
    const rawSt = rawC.stickers && typeof rawC.stickers === 'object' ? rawC.stickers : {};
    const makeSticker = (id, defX, defY, defRot) => {
      const s = rawSt[id] || {};
      return {
        enabled: s.enabled !== undefined ? Boolean(s.enabled) : true,
        xPct: Math.max(10, Math.min(90, Math.round(s.xPct !== undefined ? Number(s.xPct) : defX))),
        yPct: Math.max(10, Math.min(88, Math.round(s.yPct !== undefined ? Number(s.yPct) : defY))),
        rotDeg: Math.max(-45, Math.min(45, Math.round(s.rotDeg !== undefined ? Number(s.rotDeg) : defRot)))
      };
    };
    const savedCount = Math.max(0, Math.round(Number(rawC.savedCount) || 0));
    const discoveredCombos =
      rawC.discoveredCombos && typeof rawC.discoveredCombos === 'object' ? { ...rawC.discoveredCombos } : {};
    return {
      frameStyle: validStyles.includes(rawC.frameStyle) ? rawC.frameStyle : 'lace_ivory',
      photoId: validPhotos.includes(rawC.photoId) ? rawC.photoId : 'peace_snap',
      presetIdx: Math.max(0, Math.min(3, Math.round(Number(rawC.presetIdx) || 0))),
      deskDisplayed: rawC.deskDisplayed !== undefined ? Boolean(rawC.deskDisplayed) : true,
      savedCount,
      blessingActive: rawC.blessingActive !== undefined ? Boolean(rawC.blessingActive) : savedCount > 0,
      discoveredCombos,
      stickers: {
        lace_garland: makeSticker('lace_garland', 50, 16, 0),
        pressed_daisy: makeSticker('pressed_daisy', 23, 75, -12),
        whale_stamp: makeSticker('whale_stamp', 79, 24, 9)
      }
    };
  })(),
  cozyRadio: (() => {
    const rawR = savedPet.cozyRadio || {};
    const validChannels = ['ch01_guitar', 'ch02_rain_tea', 'ch03_hearth_jazz'];
    return {
      channelId: validChannels.includes(rawR.channelId) ? rawR.channelId : 'ch01_guitar',
      totalListenMinutes: Math.max(0, Math.round(Number(rawR.totalListenMinutes) || 0)),
      totalTuneSessions: Math.max(0, Math.round(Number(rawR.totalTuneSessions) || 0)),
      lastDailyAffectionDate: typeof rawR.lastDailyAffectionDate === 'string' ? rawR.lastDailyAffectionDate : ''
    };
  })(),
  crochetBasket: (() => {
    const rawCb = savedPet.crochetBasket || {};
    const validKnits = ['whale_scarf', 'star_coaster', 'cloud_pillow'];
    const rawKnits = rawCb.knits && typeof rawCb.knits === 'object' ? rawCb.knits : {};
    const makeKnit = (id) => {
      const k = rawKnits[id] || {};
      const lv = Math.max(0, Math.min(3, Math.round(Number(k.level) || 0)));
      return {
        level: lv,
        gifts: Math.max(lv, Math.round(Number(k.gifts) || 0))
      };
    };
    const knits = {
      whale_scarf: makeKnit('whale_scarf'),
      star_coaster: makeKnit('star_coaster'),
      cloud_pillow: makeKnit('cloud_pillow')
    };
    const yarnSkeins =
      rawCb.yarnSkeins !== undefined ? Math.max(0, Math.round(Number(rawCb.yarnSkeins) || 0)) : 3;
    return {
      yarnSkeins,
      totalYarnCollected: Math.max(yarnSkeins, Math.round(Number(rawCb.totalYarnCollected) || 3)),
      lastDailyYarnDate: typeof rawCb.lastDailyYarnDate === 'string' ? rawCb.lastDailyYarnDate : '',
      careDropCount: Math.max(0, Math.round(Number(rawCb.careDropCount) || 0)),
      selectedKnit: validKnits.includes(rawCb.selectedKnit) ? rawCb.selectedKnit : 'whale_scarf',
      displayedKnitId: validKnits.includes(rawCb.displayedKnitId) ? rawCb.displayedKnitId : 'whale_scarf',
      deskDisplayed: rawCb.deskDisplayed !== undefined ? Boolean(rawCb.deskDisplayed) : true,
      totalStitches: Math.max(
        knits.whale_scarf.level + knits.star_coaster.level + knits.cloud_pillow.level,
        Math.round(Number(rawCb.totalStitches) || 0)
      ),
      knits
    };
  })(),
  hotCocoa: (() => {
    const rawHc = savedPet.hotCocoa || {};
    const validBases = ['mellow_dark', 'sea_salt_caramel', 'hazelnut_cream'];
    const validToppings = ['star_marshmallow', 'cinnamon_stick'];
    const discovered = {};
    if (rawHc.discoveredBlends && typeof rawHc.discoveredBlends === 'object') {
      for (const [k, v] of Object.entries(rawHc.discoveredBlends)) {
        if (v && typeof v === 'object') {
          discovered[k] = {
            count: Math.max(1, Number(v.count) || 1),
            firstDate: typeof v.firstDate === 'string' ? v.firstDate : formatLocalDateKey()
          };
        } else if (v) {
          discovered[k] = { count: 1, firstDate: formatLocalDateKey() };
        }
      }
    }
    let activeBuff = null;
    if (rawHc.activeBuff && typeof rawHc.activeBuff === 'object' && Number(rawHc.activeBuff.remainingSec) > 0) {
      activeBuff = {
        blendId: String(rawHc.activeBuff.blendId || 'mellow_dark__star_marshmallow'),
        name: String(rawHc.activeBuff.name || '星芒烤棉醇黑巧'),
        buffTitle: String(rawHc.activeBuff.buffTitle || '暖可可疾风财运'),
        attackHastePct: Math.max(0, Number(rawHc.activeBuff.attackHastePct) || 0),
        coinLuckPct: Math.max(0, Number(rawHc.activeBuff.coinLuckPct) || 0),
        luckyDropBonus: Math.max(0, Number(rawHc.activeBuff.luckyDropBonus) || 0),
        durationSec: Math.max(60, Number(rawHc.activeBuff.durationSec) || 480),
        remainingSec: Math.max(0, Number(rawHc.activeBuff.remainingSec) || 0)
      };
    }
    return {
      selectedBase: validBases.includes(rawHc.selectedBase) ? rawHc.selectedBase : 'mellow_dark',
      selectedTopping: validToppings.includes(rawHc.selectedTopping) ? rawHc.selectedTopping : 'star_marshmallow',
      discoveredBlends: discovered,
      totalServed: Math.max(0, Math.round(Number(rawHc.totalServed) || 0)),
      activeBuff
    };
  })(),
  pressedFlowers: (() => {
    // AR-9 干花标本压花册：旧存档无该字段时安全回落到初始 2/2/2 花材与 Lv.0 书签
    const rawPf = savedPet.pressedFlowers && typeof savedPet.pressedFlowers === 'object' ? savedPet.pressedFlowers : {};
    const validIds = ['sakura', 'ginkgo', 'babysbreath'];
    const rawPetals = rawPf.petals && typeof rawPf.petals === 'object' ? rawPf.petals : {};
    const rawMarks = rawPf.bookmarks && typeof rawPf.bookmarks === 'object' ? rawPf.bookmarks : {};
    const petals = {};
    const bookmarks = {};
    let levelSum = 0;
    for (const id of validIds) {
      petals[id] =
        rawPetals[id] !== undefined ? Math.max(0, Math.min(999, Math.round(Number(rawPetals[id]) || 0))) : 2;
      const m = rawMarks[id] && typeof rawMarks[id] === 'object' ? rawMarks[id] : {};
      const lv = Math.max(0, Math.min(3, Math.round(Number(m.level) || 0)));
      levelSum += lv;
      bookmarks[id] = {
        level: lv,
        strokes: Math.max(lv, Math.round(Number(m.strokes) || 0))
      };
    }
    return {
      petals,
      totalPetalsCollected: Math.max(6, Math.round(Number(rawPf.totalPetalsCollected) || 6)),
      lastDailyGatherDate: typeof rawPf.lastDailyGatherDate === 'string' ? rawPf.lastDailyGatherDate : '',
      careDropCount: Math.max(0, Math.round(Number(rawPf.careDropCount) || 0)),
      selectedBookmark: validIds.includes(rawPf.selectedBookmark) ? rawPf.selectedBookmark : 'sakura',
      deskDisplayed: rawPf.deskDisplayed !== undefined ? Boolean(rawPf.deskDisplayed) : true,
      totalPresses: Math.max(levelSum, Math.round(Number(rawPf.totalPresses) || 0)),
      bookmarks
    };
  })(),
  telescope: (() => {
    // AR-9 窗畔星夜天文望远镜：仅持久化已收录星座与累计数据，进行中的连星局为运行时状态
    const rawTs = savedPet.telescope && typeof savedPet.telescope === 'object' ? savedPet.telescope : {};
    const validIds = ['summer_triangle', 'cassiopeia', 'lyra', 'cygnus', 'big_dipper', 'orion'];
    const collected = {};
    if (rawTs.constellations && typeof rawTs.constellations === 'object') {
      for (const [k, v] of Object.entries(rawTs.constellations)) {
        if (!validIds.includes(k) || !v) continue;
        const o = typeof v === 'object' ? v : {};
        collected[k] = {
          count: Math.max(1, Math.round(Number(o.count) || 1)),
          firstDate: typeof o.firstDate === 'string' ? o.firstDate : formatLocalDateKey(),
          bestMistakes: Math.max(0, Math.round(Number(o.bestMistakes) || 0))
        };
      }
    }
    const collectedCount = Object.keys(collected).length;
    return {
      constellations: collected,
      totalSessions: Math.max(collectedCount, Math.round(Number(rawTs.totalSessions) || 0)),
      totalStarsLinked: Math.max(0, Math.round(Number(rawTs.totalStarsLinked) || 0)),
      perfectSessions: Math.max(0, Math.round(Number(rawTs.perfectSessions) || 0)),
      lastConstellationId: validIds.includes(rawTs.lastConstellationId) ? rawTs.lastConstellationId : ''
    };
  })(),
  watercolor: (() => {
    // AR-10 窗畔雨天水彩写生画架：旧存档无该字段时安全回落到空画廊（仅持久化成画与选择，进行中的写生为运行时状态）
    const rawWc = savedPet.watercolor && typeof savedPet.watercolor === 'object' ? savedPet.watercolor : {};
    const subjectIds = ['rainy_window', 'potted_plant', 'whale_plush'];
    const paletteIds = ['mist_blue', 'peach_cream', 'matcha_latte'];
    const paintings = {};
    if (rawWc.paintings && typeof rawWc.paintings === 'object') {
      for (const [k, v] of Object.entries(rawWc.paintings)) {
        const [sid, pid] = String(k).split('__');
        if (!subjectIds.includes(sid) || !paletteIds.includes(pid) || !v) continue;
        const o = typeof v === 'object' ? v : {};
        paintings[`${sid}__${pid}`] = {
          count: Math.max(1, Math.min(9999, Math.round(Number(o.count) || 1))),
          firstDate:
            typeof o.firstDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.firstDate) ? o.firstDate : formatLocalDateKey(),
          bestMistakes: Math.max(0, Math.min(99, Math.round(Number(o.bestMistakes) || 0)))
        };
      }
    }
    const rawHung = Array.isArray(rawWc.hung) ? rawWc.hung : [];
    const hung = rawHung.filter((k, i) => typeof k === 'string' && paintings[k] && rawHung.indexOf(k) === i).slice(-6);
    const hungFinal = hung.length > 0 ? hung : Object.keys(paintings).slice(-6);
    const paintedSum = Object.values(paintings).reduce((acc, pt) => acc + pt.count, 0);
    return {
      selectedSubject: subjectIds.includes(rawWc.selectedSubject) ? rawWc.selectedSubject : 'rainy_window',
      selectedPalette: paletteIds.includes(rawWc.selectedPalette) ? rawWc.selectedPalette : 'mist_blue',
      paintings,
      hung: hungFinal,
      totalPaintings: Math.max(paintedSum, Math.min(99999, Math.round(Number(rawWc.totalPaintings) || 0))),
      perfectPaintings: Math.max(0, Math.min(99999, Math.round(Number(rawWc.perfectPaintings) || 0))),
      totalStrokes: Math.max(0, Math.min(999999, Math.round(Number(rawWc.totalStrokes) || 0))),
      lastPaintingId: paintings[rawWc.lastPaintingId] ? rawWc.lastPaintingId : hungFinal[hungFinal.length - 1] || ''
    };
  })(),
  mailbox: (() => {
    // AR-10 奶油手账小邮差信箱：旧存档无该字段时回落为空信箱（启动后由她投递一封初见来信）
    const rawMb = savedPet.mailbox && typeof savedPet.mailbox === 'object' ? savedPet.mailbox : {};
    const moods = ['bliss', 'focus', 'cozy', 'star', 'goodnight'];
    const stampIds = ['whale', 'moon', 'daisy'];
    const validDate = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : formatLocalDateKey());
    const cleanLetter = (l) => {
      if (!l || typeof l !== 'object') return null;
      const id = typeof l.id === 'string' ? l.id.slice(0, 40) : '';
      if (!id) return null;
      return {
        id,
        writtenAt: Math.max(0, Number(l.writtenAt) || 0),
        dateKey: validDate(l.dateKey),
        moodId: moods.includes(l.moodId) ? l.moodId : 'bliss',
        tier: Math.max(0, Math.min(2, Math.round(Number(l.tier) || 0))),
        variant: Math.max(0, Math.min(1, Math.round(Number(l.variant) || 0))),
        weeklyLine: typeof l.weeklyLine === 'string' ? l.weeklyLine.slice(0, 120) : '',
        welcome: Boolean(l.welcome),
        opened: Boolean(l.opened)
      };
    };
    const seenIds = new Set();
    const letters = (Array.isArray(rawMb.letters) ? rawMb.letters : [])
      .map(cleanLetter)
      .filter((l) => {
        if (!l || seenIds.has(l.id)) return false;
        seenIds.add(l.id);
        return true;
      })
      .slice(-3);
    const album = (Array.isArray(rawMb.album) ? rawMb.album : [])
      .map((a) => {
        const base = cleanLetter(a);
        if (!base) return null;
        return {
          ...base,
          opened: true,
          replyId: typeof a.replyId === 'string' ? a.replyId.slice(0, 24) : '',
          stampId: stampIds.includes(a.stampId) ? a.stampId : 'whale',
          best: Boolean(a.best),
          repliedDate: validDate(a.repliedDate)
        };
      })
      .filter(Boolean)
      .slice(-30);
    const rawStamps = rawMb.stamps && typeof rawMb.stamps === 'object' ? rawMb.stamps : {};
    const stamps = {};
    for (const sid of stampIds) {
      stamps[sid] = Math.max(0, Math.min(9999, Math.round(Number(rawStamps[sid]) || 0)));
    }
    const totalReplies = Math.max(album.length, Math.min(9999, Math.round(Number(rawMb.totalReplies) || 0)));
    return {
      letters,
      album,
      stamps,
      totalReplies,
      bestReplies: Math.max(0, Math.min(totalReplies, Math.round(Number(rawMb.bestReplies) || 0))),
      totalLetters: Math.max(
        totalReplies + letters.length,
        Math.min(99999, Math.round(Number(rawMb.totalLetters) || 0))
      ),
      nextLetterAt: Math.max(0, Number(rawMb.nextLetterAt) || 0),
      welcomeSent: rawMb.welcomeSent !== undefined ? Boolean(rawMb.welcomeSent) : false,
      letterSeq: Math.max(0, Math.min(999999, Math.round(Number(rawMb.letterSeq) || 0)))
    };
  })(),
  bentoKitchen: (() => {
    // AR-11 暖灯厨房一起做饭团便当：旧存档无该字段时回落为空图鉴 + 空便当袋（摆盘进行中为运行时状态，已盖盖未处理的便当会保留）
    const rawBk = savedPet.bentoKitchen && typeof savedPet.bentoKitchen === 'object' ? savedPet.bentoKitchen : {};
    const fillingIds = ['ume', 'salmon', 'tuna'];
    const pairIds = ['tamago+octopus', 'tamago+broccoli', 'octopus+broccoli'];
    const validRecipe = (k) => {
      if (typeof k !== 'string') return false;
      const parts = k.split('__');
      return parts.length === 2 && fillingIds.includes(parts[0]) && pairIds.includes(parts[1]);
    };
    const validDate = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : formatLocalDateKey());
    const clampInt = (v, max) => Math.max(0, Math.min(max, Math.round(Number(v) || 0)));
    const discovered = {};
    if (rawBk.discovered && typeof rawBk.discovered === 'object' && !Array.isArray(rawBk.discovered)) {
      for (const [k, v] of Object.entries(rawBk.discovered)) {
        if (!validRecipe(k) || !v) continue;
        const o = typeof v === 'object' ? v : {};
        discovered[k] = {
          count: Math.max(1, Math.min(9999, Math.round(Number(o.count) || 1))),
          firstDate: validDate(o.firstDate)
        };
      }
    }
    const bag = (Array.isArray(rawBk.bag) ? rawBk.bag : [])
      .map((b) => {
        const rid = b && typeof b === 'object' ? b.recipeId : b;
        if (!validRecipe(rid)) return null;
        return { recipeId: rid, packedDate: validDate(b && typeof b === 'object' ? b.packedDate : '') };
      })
      .filter(Boolean)
      .slice(0, 3);
    const countSum = Object.values(discovered).reduce((acc, d) => acc + d.count, 0);
    return {
      discovered,
      bag,
      pending: validRecipe(rawBk.pending) ? rawBk.pending : '',
      totalBentos: Math.max(countSum, clampInt(rawBk.totalBentos, 99999)),
      totalPacked: clampInt(rawBk.totalPacked, 99999),
      totalShared: clampInt(rawBk.totalShared, 99999),
      totalLunches: clampInt(rawBk.totalLunches, 99999),
      totalRescues: clampInt(rawBk.totalRescues, 99999),
      lastRecipeId: validRecipe(rawBk.lastRecipeId) && discovered[rawBk.lastRecipeId] ? rawBk.lastRecipeId : ''
    };
  })(),
  memoryPuzzle: (() => {
    // AR-11 奶油手账回忆拼图时光：旧存档无该字段时回落为空回忆墙（拼图进行中为运行时状态）
    const rawMp = savedPet.memoryPuzzle && typeof savedPet.memoryPuzzle === 'object' ? savedPet.memoryPuzzle : {};
    const kindLabels = { photo: '拍立得合影', paint: '水彩回忆', week: '心情周报', art: '手账原画' };
    const validSourceId = (s) => typeof s === 'string' && /^(photo|paint|week|art):[A-Za-z0-9_+.-]{1,58}$/.test(s);
    const validThumb = (t) =>
      typeof t === 'string' && t.length <= 60000 && /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(t) ? t : '';
    const validDate = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : formatLocalDateKey());
    const cleanLabel = (l, sid) =>
      typeof l === 'string' && l.trim() ? l.trim().slice(0, 16) : kindLabels[String(sid).split(':')[0]] || '回忆';
    const clampInt = (v, max) => Math.max(0, Math.min(max, Math.round(Number(v) || 0)));
    const completed = {};
    if (rawMp.completed && typeof rawMp.completed === 'object' && !Array.isArray(rawMp.completed)) {
      for (const [k, v] of Object.entries(rawMp.completed)) {
        if (!validSourceId(k) || !v) continue;
        const o = typeof v === 'object' ? v : {};
        completed[k] = {
          count: Math.max(1, Math.min(9999, Math.round(Number(o.count) || 1))),
          bestMoves: clampInt(o.bestMoves, 999),
          firstDate: validDate(o.firstDate),
          label: cleanLabel(o.label, k)
        };
      }
    }
    const seenWall = new Set();
    const wall = (Array.isArray(rawMp.wall) ? rawMp.wall : [])
      .map((w) => {
        if (!w || typeof w !== 'object' || !validSourceId(w.sourceId)) return null;
        return {
          sourceId: w.sourceId,
          label: cleanLabel(w.label, w.sourceId),
          thumb: validThumb(w.thumb),
          date: validDate(w.date),
          moves: clampInt(w.moves, 999)
        };
      })
      .filter((w) => {
        if (!w || seenWall.has(w.sourceId)) return false;
        seenWall.add(w.sourceId);
        return true;
      })
      .slice(-6);
    for (const w of wall) {
      if (!completed[w.sourceId]) {
        completed[w.sourceId] = { count: 1, bestMoves: w.moves, firstDate: w.date, label: w.label };
      }
    }
    // 完成记录最多保留 80 条（按写入顺序保留最新），回忆墙上的条目始终保留
    const completedKeys = Object.keys(completed);
    if (completedKeys.length > 80) {
      for (const k of completedKeys.slice(0, completedKeys.length - 80)) {
        if (!seenWall.has(k)) delete completed[k];
      }
    }
    const countSum = Object.values(completed).reduce((acc, c) => acc + c.count, 0);
    const lastFromWall = wall.length ? wall[wall.length - 1].sourceId : '';
    return {
      completed,
      wall,
      selectedSourceId: validSourceId(rawMp.selectedSourceId) ? rawMp.selectedSourceId : '',
      totalPuzzles: Math.max(countSum, clampInt(rawMp.totalPuzzles, 99999)),
      totalSwaps: clampInt(rawMp.totalSwaps, 999999),
      perfectPuzzles: clampInt(rawMp.perfectPuzzles, 99999),
      lastSourceId: validSourceId(rawMp.lastSourceId) && completed[rawMp.lastSourceId] ? rawMp.lastSourceId : lastFromWall
    };
  })(),
  kittenCorner: (() => {
    // AR-12 窗台小猫访客喂食角：旧存档无该字段时回落为两只未相遇的小猫，首次来访按真实时钟排在 40~90 秒后
    const rawKc = savedPet.kittenCorner && typeof savedPet.kittenCorner === 'object' ? savedPet.kittenCorner : {};
    const ids = ['ginger', 'tuxedo'];
    const nowMs = Date.now();
    const validDate = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '');
    const clampInt = (v, max) => Math.max(0, Math.min(max, Math.round(Number(v) || 0)));
    const validTs = (v) => {
      const n = Number(v);
      return Number.isFinite(n) && n > 1.5e12 && n < 4.2e12 ? Math.round(n) : 0;
    };
    const rawKittens =
      rawKc.kittens && typeof rawKc.kittens === 'object' && !Array.isArray(rawKc.kittens) ? rawKc.kittens : {};
    const kittens = {};
    for (const id of ids) {
      const k = rawKittens[id] && typeof rawKittens[id] === 'object' ? rawKittens[id] : {};
      const visits = clampInt(k.visits, 99999);
      const met = k.met === true || visits > 0;
      const firstMet = met ? validDate(k.firstMet) || formatLocalDateKey() : '';
      kittens[id] = {
        met,
        affection: met ? clampInt(k.affection, 100) : 0,
        visits: met ? Math.max(1, visits) : 0,
        feeds: met ? clampInt(k.feeds, 99999) : 0,
        pets: met ? clampInt(k.pets, 99999) : 0,
        tierRewarded: met ? clampInt(k.tierRewarded, 3) : 0,
        firstMet,
        lastSeen: met ? validDate(k.lastSeen) || firstMet : ''
      };
    }
    let visit = null;
    const rv = rawKc.visit;
    if (rv && typeof rv === 'object' && ids.includes(rv.kittenId) && kittens[rv.kittenId].met) {
      const arrivedAt = validTs(rv.arrivedAt);
      const leavesAt = validTs(rv.leavesAt);
      if (arrivedAt && leavesAt > arrivedAt && leavesAt - arrivedAt <= 15 * 60000) {
        visit = { kittenId: rv.kittenId, arrivedAt, leavesAt, fed: rv.fed === true, pets: clampInt(rv.pets, 3) };
      }
    }
    let nextVisitAt = validTs(rawKc.nextVisitAt);
    if (!nextVisitAt || nextVisitAt > nowMs + 26 * 3600000) {
      nextVisitAt = nowMs + 40000 + Math.round(Math.random() * 50000);
    }
    const visitDate = validDate(rawKc.visitDate);
    const sumOf = (key) => ids.reduce((acc, id) => acc + kittens[id][key], 0);
    return {
      kittens,
      visit,
      nextVisitAt,
      visitDate,
      visitsToday: visitDate ? clampInt(rawKc.visitsToday, 99) : 0,
      lastKittenId: ids.includes(rawKc.lastKittenId) && kittens[rawKc.lastKittenId].met ? rawKc.lastKittenId : '',
      streak: clampInt(rawKc.streak, 99),
      totalVisits: Math.max(sumOf('visits'), clampInt(rawKc.totalVisits, 99999)),
      totalFeeds: Math.max(sumOf('feeds'), clampInt(rawKc.totalFeeds, 99999)),
      totalPets: Math.max(sumOf('pets'), clampInt(rawKc.totalPets, 99999)),
      totalSaves: clampInt(rawKc.totalSaves, 99999),
      missedVisits: clampInt(rawKc.missedVisits, 99999)
    };
  })(),
  greetingCards: (() => {
    // AR-12 奶油手账节日手作贺卡：旧存档无该字段时回落为空收藏册（制作中的草稿为运行时状态）
    const rawGc = savedPet.greetingCards && typeof savedPet.greetingCards === 'object' ? savedPet.greetingCards : {};
    const occIds = ['new_year', 'valentine', 'childrens_day', 'christmas', 'spring', 'summer', 'autumn', 'winter'];
    const baseIds = ['cream_grid', 'sakura_wash', 'mint_letter'];
    const stickerIds = [
      'lace', 'daisy', 'whale', 'moon', 'heart', 'sparkle', 'note', 'blush',
      'sakura', 'chime', 'maple', 'snow', 'wreath', 'kitten_ginger', 'kitten_tuxedo'
    ];
    const validDate = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '');
    const clampInt = (v, max) => Math.max(0, Math.min(max, Math.round(Number(v) || 0)));
    const album = (Array.isArray(rawGc.album) ? rawGc.album : [])
      .map((c) => {
        if (!c || typeof c !== 'object' || !occIds.includes(c.occasionId)) return null;
        const stickers = [...new Set((Array.isArray(c.stickers) ? c.stickers : []).filter((x) => stickerIds.includes(x)))].slice(0, 3);
        if (!stickers.length) return null;
        const date = validDate(c.date) || formatLocalDateKey();
        const yr = Math.round(Number(c.year));
        const lineIdx = Math.round(Number(c.lineIdx));
        return {
          id: typeof c.id === 'string' && /^c\d{1,7}$/.test(c.id) ? c.id : '',
          occasionId: c.occasionId,
          year: yr >= 2000 && yr <= 2100 ? yr : Number(date.slice(0, 4)),
          baseId: baseIds.includes(c.baseId) ? c.baseId : 'cream_grid',
          stickers,
          lineIdx: lineIdx >= 0 && lineIdx <= 2 ? lineIdx : 0,
          date
        };
      })
      .filter(Boolean)
      .slice(-24);
    let cardSeq = clampInt(rawGc.cardSeq, 9999999);
    for (const c of album) {
      const n = c.id ? Number(c.id.slice(1)) : 0;
      if (n > cardSeq) cardSeq = n;
    }
    const seenIds = new Set();
    for (const c of album) {
      if (!c.id || seenIds.has(c.id)) {
        cardSeq += 1;
        c.id = `c${cardSeq}`;
      }
      seenIds.add(c.id);
    }
    const collected = {};
    if (rawGc.collected && typeof rawGc.collected === 'object' && !Array.isArray(rawGc.collected)) {
      for (const [k, v] of Object.entries(rawGc.collected)) {
        if (occIds.includes(k) && v) collected[k] = Math.max(1, Math.min(9999, Math.round(Number(v) || 1)));
      }
    }
    const occasionYears = {};
    if (rawGc.occasionYears && typeof rawGc.occasionYears === 'object' && !Array.isArray(rawGc.occasionYears)) {
      for (const k of Object.keys(rawGc.occasionYears).slice(-40)) {
        const m = /^([a-z_]+)-(\d{4})$/.exec(k);
        if (m && occIds.includes(m[1]) && rawGc.occasionYears[k]) occasionYears[k] = true;
      }
    }
    for (const c of album) {
      if (!collected[c.occasionId]) collected[c.occasionId] = 1;
      occasionYears[`${c.occasionId}-${c.year}`] = true;
    }
    const countSum = Object.values(collected).reduce((acc, n) => acc + n, 0);
    const rewardDate = validDate(rawGc.rewardDate);
    return {
      album,
      collected,
      occasionYears,
      cardSeq,
      totalCards: Math.max(album.length, countSum, clampInt(rawGc.totalCards, 99999)),
      rewardDate,
      rewardCount: rewardDate ? clampInt(rawGc.rewardCount, 99) : 0,
      lastBaseId: baseIds.includes(rawGc.lastBaseId) ? rawGc.lastBaseId : 'cream_grid'
    };
  })(),
  picnicBasket: (() => {
    // AR-13 奶油手账周末野餐篮：旧存档无该字段时回落为空篮子、无期待章、无野餐好心情（野餐进行中为运行时状态）
    const rawPb = savedPet.picnicBasket && typeof savedPet.picnicBasket === 'object' ? savedPet.picnicBasket : {};
    const foodIds = ['sandwich', 'onigiri', 'macaron', 'souffle', 'pudding', 'oolong'];
    const spotIds = ['sakura_lawn', 'lakeside_willow', 'ginkgo_hill'];
    const validDate = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '');
    const clampInt = (v, max) => Math.max(0, Math.min(max, Math.round(Number(v) || 0)));
    const cleanFoods = (arr) => [...new Set((Array.isArray(arr) ? arr : []).filter((x) => foodIds.includes(x)))].slice(0, 3);
    let plan = null;
    if (rawPb.plan && typeof rawPb.plan === 'object' && !Array.isArray(rawPb.plan)) {
      const foods = cleanFoods(rawPb.plan.foods);
      if (foods.length >= 2 && spotIds.includes(rawPb.plan.spotId)) {
        plan = { foods, spotId: rawPb.plan.spotId, packedDate: validDate(rawPb.plan.packedDate) || formatLocalDateKey() };
      }
    }
    let prep = { weekendKey: '', days: [], used: false };
    if (rawPb.prep && typeof rawPb.prep === 'object' && validDate(rawPb.prep.weekendKey)) {
      const wk = rawPb.prep.weekendKey;
      const days = [...new Set((Array.isArray(rawPb.prep.days) ? rawPb.prep.days : []).map(validDate))]
        .filter((d) => d && d < wk)
        .sort()
        .slice(-5);
      prep = { weekendKey: wk, days, used: rawPb.prep.used === true };
    }
    const log = (Array.isArray(rawPb.log) ? rawPb.log : [])
      .map((e) => {
        if (!e || typeof e !== 'object' || !spotIds.includes(e.spotId)) return null;
        const foods = cleanFoods(e.foods);
        const date = validDate(e.date);
        if (!foods.length || !date) return null;
        return {
          id: typeof e.id === 'string' && /^p\d{1,7}$/.test(e.id) ? e.id : '',
          date,
          spotId: e.spotId,
          foods,
          antic: clampInt(e.antic, 5)
        };
      })
      .filter(Boolean)
      .slice(-12);
    let seq = clampInt(rawPb.seq, 9999999);
    for (const e of log) {
      const n = e.id ? Number(e.id.slice(1)) : 0;
      if (n > seq) seq = n;
    }
    const seenIds = new Set();
    for (const e of log) {
      if (!e.id || seenIds.has(e.id)) {
        seq += 1;
        e.id = `p${seq}`;
      }
      seenIds.add(e.id);
    }
    const doneDates = [
      ...new Set([...(Array.isArray(rawPb.doneDates) ? rawPb.doneDates : []).map(validDate).filter(Boolean), ...log.map((e) => e.date)])
    ]
      .sort()
      .slice(-8);
    const countMap = (raw, ids) => {
      const out = {};
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        for (const id of ids) {
          const n = clampInt(raw[id], 99999);
          if (n > 0) out[id] = n;
        }
      }
      return out;
    };
    const spotsVisited = countMap(rawPb.spotsVisited, spotIds);
    const foodsTried = countMap(rawPb.foodsTried, foodIds);
    for (const e of log) {
      if (!spotsVisited[e.spotId]) spotsVisited[e.spotId] = 1;
      for (const f of e.foods) if (!foodsTried[f]) foodsTried[f] = 1;
    }
    const lastLogSpot = log.length ? log[log.length - 1].spotId : '';
    const wardSpotId = spotIds.includes(rawPb.wardSpotId) ? rawPb.wardSpotId : lastLogSpot;
    return {
      plan,
      prep,
      log,
      seq,
      doneDates,
      spotsVisited,
      foodsTried,
      wardCharges: wardSpotId ? clampInt(rawPb.wardCharges, 4) : 0,
      wardSpotId,
      wardAntic: wardSpotId ? clampInt(rawPb.wardAntic, 5) : 0,
      totalPicnics: Math.max(log.length, clampInt(rawPb.totalPicnics, 99999)),
      totalPreps: clampInt(rawPb.totalPreps, 99999),
      totalWardShifts: clampInt(rawPb.totalWardShifts, 99999)
    };
  })(),
  diaryBook: (() => {
    // AR-13 手写日记本：日记正文每次按周报每日计数实时生成，存档只记贴纸装饰 / 已读进度 / 每日奖励
    const rawDb = savedPet.diaryBook && typeof savedPet.diaryBook === 'object' ? savedPet.diaryBook : {};
    const stickerIds = ['diary', 'lace', 'daisy', 'whale', 'heart', 'sandwich', 'kitten', 'card', 'embroidery'];
    const validDate = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '');
    const clampInt = (v, max) => Math.max(0, Math.min(max, Math.round(Number(v) || 0)));
    const decor = {};
    if (rawDb.decor && typeof rawDb.decor === 'object' && !Array.isArray(rawDb.decor)) {
      for (const k of Object.keys(rawDb.decor).filter((x) => validDate(x)).sort().slice(-40)) {
        const stickers = [...new Set((Array.isArray(rawDb.decor[k]) ? rawDb.decor[k] : []).filter((x) => stickerIds.includes(x)))].slice(0, 3);
        if (stickers.length) decor[k] = stickers;
      }
    }
    const rewarded = {};
    if (rawDb.rewarded && typeof rawDb.rewarded === 'object' && !Array.isArray(rawDb.rewarded)) {
      for (const k of Object.keys(rawDb.rewarded).filter((x) => validDate(x)).sort().slice(-40)) {
        if (rawDb.rewarded[k]) rewarded[k] = true;
      }
    }
    const rawSeen = rawDb.seen && typeof rawDb.seen === 'object' ? rawDb.seen : {};
    const seenDate = validDate(rawSeen.dateKey);
    const rewardDate = validDate(rawDb.rewardDate);
    const decorCount = Object.values(decor).reduce((acc, arr) => acc + arr.length, 0);
    return {
      decor,
      rewarded,
      seen: { dateKey: seenDate, total: seenDate ? clampInt(rawSeen.total, 99999) : 0 },
      rewardDate,
      rewardCount: rewardDate ? clampInt(rawDb.rewardCount, 99) : 0,
      totalStickers: Math.max(decorCount, clampInt(rawDb.totalStickers, 99999)),
      totalFlips: clampInt(rawDb.totalFlips, 999999)
    };
  })(),
  potteryWheel: (() => {
    // AR-14 窗畔手作陶艺转盘：旧存档无该字段时回落为空陶艺架、无陶艺佑护（拉坯 / 上釉 / 烧制进度是运行时状态，不入存档）
    const rawPw =
      savedPet.potteryWheel && typeof savedPet.potteryWheel === 'object' && !Array.isArray(savedPet.potteryWheel)
        ? savedPet.potteryWheel
        : {};
    const shapeIds = ['cup', 'vase'];
    const glazeIds = ['cream', 'sakura', 'celadon'];
    const validDate = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '');
    const clampInt = (v, max) => Math.max(0, Math.min(max, Math.round(Number(v) || 0)));
    const pieces = (Array.isArray(rawPw.pieces) ? rawPw.pieces : [])
      .map((e) => {
        if (!e || typeof e !== 'object' || !shapeIds.includes(e.shapeId) || !glazeIds.includes(e.glazeId)) return null;
        const date = validDate(e.date);
        if (!date) return null;
        return {
          id: typeof e.id === 'string' && /^k\d{1,7}$/.test(e.id) ? e.id : '',
          shapeId: e.shapeId,
          glazeId: e.glazeId,
          date
        };
      })
      .filter(Boolean)
      .slice(-12);
    let seq = clampInt(rawPw.seq, 9999999);
    for (const e of pieces) {
      const n = e.id ? Number(e.id.slice(1)) : 0;
      if (n > seq) seq = n;
    }
    const seenIds = new Set();
    for (const e of pieces) {
      if (!e.id || seenIds.has(e.id)) {
        seq += 1;
        e.id = `k${seq}`;
      }
      seenIds.add(e.id);
    }
    const combos = {};
    if (rawPw.combos && typeof rawPw.combos === 'object' && !Array.isArray(rawPw.combos)) {
      for (const sh of shapeIds) {
        for (const gl of glazeIds) {
          const n = clampInt(rawPw.combos[`${sh}_${gl}`], 99999);
          if (n > 0) combos[`${sh}_${gl}`] = n;
        }
      }
    }
    for (const e of pieces) {
      const k = `${e.shapeId}_${e.glazeId}`;
      if (!combos[k]) combos[k] = 1;
    }
    const last = pieces.length ? pieces[pieces.length - 1] : null;
    const wardGlazeId = glazeIds.includes(rawPw.wardGlazeId) ? rawPw.wardGlazeId : last ? last.glazeId : '';
    const wardShapeId = shapeIds.includes(rawPw.wardShapeId) ? rawPw.wardShapeId : last ? last.shapeId : '';
    const hasWard = Boolean(wardGlazeId && wardShapeId);
    const rewardDate = validDate(rawPw.rewardDate);
    return {
      pieces,
      seq,
      combos,
      wardCharges: hasWard ? clampInt(rawPw.wardCharges, 3) : 0,
      wardGlazeId: hasWard ? wardGlazeId : '',
      wardShapeId: hasWard ? wardShapeId : '',
      rewardDate,
      rewardCount: rewardDate ? clampInt(rawPw.rewardCount, 99) : 0,
      totalPieces: Math.max(pieces.length, clampInt(rawPw.totalPieces, 999999)),
      totalWardShifts: clampInt(rawPw.totalWardShifts, 999999),
      lastShapeId: shapeIds.includes(rawPw.lastShapeId) ? rawPw.lastShapeId : 'cup',
      lastGlazeId: glazeIds.includes(rawPw.lastGlazeId) ? rawPw.lastGlazeId : 'cream'
    };
  })(),
  aromaTable: (() => {
    // AR-14 小小香氛调配台：旧存档无该字段时回落为未点香、空香氛图鉴（选心情 / 滴精油是运行时状态，不入存档）
    const rawAm =
      savedPet.aromaTable && typeof savedPet.aromaTable === 'object' && !Array.isArray(savedPet.aromaTable)
        ? savedPet.aromaTable
        : {};
    const moodIds = ['bliss', 'focus', 'cozy', 'star', 'goodnight'];
    const seasonIds = ['spring', 'summer', 'autumn', 'winter'];
    const validDate = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '');
    const clampInt = (v, max) => Math.max(0, Math.min(max, Math.round(Number(v) || 0)));
    const discovered = {};
    if (rawAm.discovered && typeof rawAm.discovered === 'object' && !Array.isArray(rawAm.discovered)) {
      for (const sid of seasonIds) {
        for (const mid of moodIds) {
          const n = clampInt(rawAm.discovered[`${sid}_${mid}`], 99999);
          if (n > 0) discovered[`${sid}_${mid}`] = n;
        }
      }
    }
    // 点香中的香氛：只认合法季节 / 心情、起止时间合理（不超过 30 分钟一炉）的记录；是否已散由运行时按可注入时钟判断
    let active = null;
    const ra = rawAm.active;
    if (ra && typeof ra === 'object' && !Array.isArray(ra) && seasonIds.includes(ra.seasonId) && moodIds.includes(ra.moodId)) {
      const startMs = Number(ra.startMs);
      const endMs = Number(ra.endMs);
      if (Number.isFinite(startMs) && Number.isFinite(endMs) && startMs > 0 && endMs > startMs && endMs - startMs <= 30 * 60000) {
        active = { seasonId: ra.seasonId, moodId: ra.moodId, startMs: Math.round(startMs), endMs: Math.round(endMs) };
        if (!discovered[`${ra.seasonId}_${ra.moodId}`]) discovered[`${ra.seasonId}_${ra.moodId}`] = 1;
      }
    }
    const blendsFound = Object.values(discovered).reduce((acc, n) => acc + n, 0);
    const rewardDate = validDate(rawAm.rewardDate);
    return {
      active,
      discovered,
      rewardDate,
      rewardCount: rewardDate ? clampInt(rawAm.rewardCount, 99) : 0,
      totalBlends: Math.max(blendsFound, clampInt(rawAm.totalBlends, 999999)),
      lastMoodId: moodIds.includes(rawAm.lastMoodId) ? rawAm.lastMoodId : ''
    };
  })(),
  starProjector: (() => {
    // AR-15 卧室星空投影灯：旧存档无该字段时回落为没收集星座卡、未点亮投影（挑卡 / 转动投影罩的进度是运行时状态，不入存档）
    const rawSp =
      savedPet.starProjector && typeof savedPet.starProjector === 'object' && !Array.isArray(savedPet.starProjector)
        ? savedPet.starProjector
        : {};
    const cardIds = ['leo', 'bootes', 'scorpius', 'aquila', 'pegasus', 'andromeda', 'gemini', 'canis_major'];
    const validDate = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '');
    const clampInt = (v, max) => Math.max(0, Math.min(max, Math.round(Number(v) || 0)));
    const cards = {};
    if (rawSp.cards && typeof rawSp.cards === 'object' && !Array.isArray(rawSp.cards)) {
      for (const id of cardIds) {
        const c = rawSp.cards[id];
        if (!c || typeof c !== 'object' || Array.isArray(c)) continue;
        const lights = clampInt(c.lights, 99999);
        if (lights > 0) cards[id] = { lights, dreams: clampInt(c.dreams, 99999), first: validDate(c.first) };
      }
    }
    // 投影中的星座：只认合法星座卡、起止时间合理（一次投影不超过 20 分钟）的记录；是否已熄灭由运行时按可注入时钟判断
    let active = null;
    const ra = rawSp.active;
    if (ra && typeof ra === 'object' && !Array.isArray(ra) && cardIds.includes(ra.cardId)) {
      const startMs = Number(ra.startMs);
      const endMs = Number(ra.endMs);
      if (Number.isFinite(startMs) && Number.isFinite(endMs) && startMs > 0 && endMs > startMs && endMs - startMs <= 20 * 60000) {
        active = { cardId: ra.cardId, startMs: Math.round(startMs), endMs: Math.round(endMs) };
        if (!cards[ra.cardId]) cards[ra.cardId] = { lights: 1, dreams: 0, first: '' };
      }
    }
    const lightsFound = Object.values(cards).reduce((acc, c) => acc + c.lights, 0);
    const dreamsFound = Object.values(cards).reduce((acc, c) => acc + c.dreams, 0);
    const rewardDate = validDate(rawSp.rewardDate);
    const dreamDate = validDate(rawSp.dreamDate);
    return {
      active,
      cards,
      rewardDate,
      // 每日计数不超过当天上限（每天 2 次投影奖励 / 1 枚好梦章奖励），脏数据不会显示成 77/2
      rewardCount: rewardDate ? clampInt(rawSp.rewardCount, 2) : 0,
      dreamDate,
      dreamCount: dreamDate ? clampInt(rawSp.dreamCount, 1) : 0,
      totalLights: Math.max(lightsFound, clampInt(rawSp.totalLights, 999999)),
      totalDreams: Math.max(dreamsFound, clampInt(rawSp.totalDreams, 999999)),
      lastCardId: cardIds.includes(rawSp.lastCardId) ? rawSp.lastCardId : ''
    };
  })(),
  rainCorner: (() => {
    // AR-15 窗边听雨角：旧存档无该字段时回落为中音量、开风铃、空听雨手帐（是否正在听雨是运行时状态，不入存档，重开页面不会自己出声）
    const rawRc =
      savedPet.rainCorner && typeof savedPet.rainCorner === 'object' && !Array.isArray(savedPet.rainCorner)
        ? savedPet.rainCorner
        : {};
    const segIds = ['dawn', 'day', 'dusk', 'night'];
    const weatherIds = ['drizzle', 'eaves', 'shower', 'thunder', 'breeze'];
    const validDate = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '');
    const clampInt = (v, max) => Math.max(0, Math.min(max, Math.round(Number(v) || 0)));
    const entries = {};
    if (rawRc.entries && typeof rawRc.entries === 'object' && !Array.isArray(rawRc.entries)) {
      for (const sg of segIds) {
        for (const wt of weatherIds) {
          const n = clampInt(rawRc.entries[`${sg}_${wt}`], 99999);
          if (n > 0) entries[`${sg}_${wt}`] = n;
        }
      }
    }
    const notesFound = Object.values(entries).reduce((acc, n) => acc + n, 0);
    const rewardDate = validDate(rawRc.rewardDate);
    return {
      volumeId: ['soft', 'mid', 'deep'].includes(rawRc.volumeId) ? rawRc.volumeId : 'mid',
      chimeOn: rawRc.chimeOn !== false,
      entries,
      rewardDate,
      rewardCount: rewardDate ? clampInt(rawRc.rewardCount, 4) : 0,
      totalNotes: Math.max(notesFound, clampInt(rawRc.totalNotes, 999999)),
      totalMins: Math.max(notesFound * 5, clampInt(rawRc.totalMins, 9999999)),
      lastWeatherId: weatherIds.includes(rawRc.lastWeatherId) ? rawRc.lastWeatherId : ''
    };
  })(),
  embroideryHoop: (() => {
    // AR-16 墙面刺绣绷架：旧存档无该字段时回落为空绣样册、空墙面（挑绣样 / 绣线 / 绣到第几针是运行时状态，不入存档）
    const rawEh =
      savedPet.embroideryHoop && typeof savedPet.embroideryHoop === 'object' && !Array.isArray(savedPet.embroideryHoop)
        ? savedPet.embroideryHoop
        : {};
    const patternIds = ['sakura', 'daisy', 'whale', 'lemon', 'ginkgo', 'maple', 'snowflake', 'mitten'];
    const threadIds = ['cream', 'pink', 'sage', 'mist'];
    const validDate = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '');
    const clampInt = (v, max) => Math.max(0, Math.min(max, Math.round(Number(v) || 0)));
    const patterns = {};
    if (rawEh.patterns && typeof rawEh.patterns === 'object' && !Array.isArray(rawEh.patterns)) {
      for (const id of patternIds) {
        const p = rawEh.patterns[id];
        if (!p || typeof p !== 'object' || Array.isArray(p)) continue;
        const cnt = clampInt(p.count, 99999);
        if (cnt > 0) patterns[id] = { count: cnt, first: validDate(p.first), lastThread: threadIds.includes(p.lastThread) ? p.lastThread : 'cream' };
      }
    }
    // 墙上的绣品：只认合法绣样 / 绣线，最多 4 幅（最新的在前）；挂在墙上的绣样一定算绣过
    const wall = [];
    if (Array.isArray(rawEh.wall)) {
      for (const w of rawEh.wall) {
        if (wall.length >= 4) break;
        if (!w || typeof w !== 'object' || Array.isArray(w) || !patternIds.includes(w.patternId)) continue;
        const threadId = threadIds.includes(w.threadId) ? w.threadId : 'cream';
        wall.push({ patternId: w.patternId, threadId, date: validDate(w.date) });
        if (!patterns[w.patternId]) patterns[w.patternId] = { count: 1, first: validDate(w.date), lastThread: threadId };
      }
    }
    const piecesFound = Object.values(patterns).reduce((acc, p) => acc + p.count, 0);
    const rewardDate = validDate(rawEh.rewardDate);
    return {
      patterns,
      wall,
      rewardDate,
      // 每日计数不超过当天上限（每天 2 幅收针奖励），脏数据不会显示成 77/2
      rewardCount: rewardDate ? clampInt(rawEh.rewardCount, 2) : 0,
      totalPieces: Math.max(piecesFound, clampInt(rawEh.totalPieces, 999999)),
      lastPatternId: patternIds.includes(rawEh.lastPatternId) ? rawEh.lastPatternId : '',
      lastThreadId: threadIds.includes(rawEh.lastThreadId) ? rawEh.lastThreadId : 'cream'
    };
  })(),
  hearthCorner: (() => {
    // AR-16 地板小暖炉冬日角：旧存档回落为空点心手帐、没生小火、没在依偎
    // （暖炉火力按本地日期 + 时段实时计算、不入存档；正在烤的松饼是运行时状态，重开页面不会自己烤起来）
    const rawHc =
      savedPet.hearthCorner && typeof savedPet.hearthCorner === 'object' && !Array.isArray(savedPet.hearthCorner)
        ? savedPet.hearthCorner
        : {};
    const snackIds = ['honey', 'berry', 'cinnamon', 'maple'];
    const levelIds = ['low', 'warm', 'blaze'];
    const validDate = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '');
    const clampInt = (v, max) => Math.max(0, Math.min(max, Math.round(Number(v) || 0)));
    const entries = {};
    if (rawHc.entries && typeof rawHc.entries === 'object' && !Array.isArray(rawHc.entries)) {
      for (const sn of snackIds) {
        for (const lv of levelIds) {
          const n = clampInt(rawHc.entries[`${sn}_${lv}`], 99999);
          if (n > 0) entries[`${sn}_${lv}`] = n;
        }
      }
    }
    // 依偎 / 小火：只认起止时间合理（不超过 20 分钟）的记录；是否已结束由运行时按可注入时钟判断
    const timed = (raw, withLevel) => {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
      const startMs = Number(raw.startMs);
      const endMs = Number(raw.endMs);
      if (!(Number.isFinite(startMs) && Number.isFinite(endMs) && startMs > 0 && endMs > startMs && endMs - startMs <= 20 * 60000)) return null;
      const out = { startMs: Math.round(startMs), endMs: Math.round(endMs) };
      if (withLevel) {
        const lv = Math.round(Number(raw.level));
        if (!(lv >= 1 && lv <= 3)) return null;
        out.level = lv;
      }
      return out;
    };
    const snacksFound = Object.values(entries).reduce((acc, n) => acc + n, 0);
    const rewardDate = validDate(rawHc.rewardDate);
    return {
      entries,
      rewardDate,
      rewardCount: rewardDate ? clampInt(rawHc.rewardCount, 3) : 0,
      totalSnacks: Math.max(snacksFound, clampInt(rawHc.totalSnacks, 999999)),
      totalCuddles: Math.max(snacksFound, clampInt(rawHc.totalCuddles, 999999)),
      totalKindles: clampInt(rawHc.totalKindles, 999999),
      cuddle: timed(rawHc.cuddle, true),
      kindle: timed(rawHc.kindle, false),
      lastSnackId: snackIds.includes(rawHc.lastSnackId) ? rawHc.lastSnackId : '',
      lastLevelId: levelIds.includes(rawHc.lastLevelId) ? rawHc.lastLevelId : ''
    };
  })(),
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
    thumb: './assets/bg_healing_room.webp?v=hd19'
  },
  {
    id: 'star_aquarium',
    name: '深海星梦水族馆',
    subtitle: '星光水母与蓝鲸穹顶',
    thumb: './assets/bg_aquarium_room.webp?v=hd19'
  }
];

const WINDOW_PERIOD_SPECS = [
  {
    id: 'morning',
    short: '晨光',
    label: '早 · 晨光',
    thumb: './assets/win_morning.webp?v=hd19',
    greet: '清晨暖阳洒进书桌啦，今天也元气满满~'
  },
  {
    id: 'noon',
    short: '晴昼',
    label: '午 · 晴昼',
    thumb: './assets/win_noon.webp?v=hd19',
    greet: '晴朗正午的蓝天白云好治愈呀~'
  },
  {
    id: 'dusk',
    short: '暖霞',
    label: '黄昏 · 暖霞',
    thumb: './assets/win_dusk.webp?v=hd19',
    greet: '窗外染上蜜桃色晚霞啦，温柔收尾吧~'
  },
  {
    id: 'starry',
    short: '星夜',
    label: '星空 · 星夜',
    thumb: './assets/win_starry.webp?v=hd19',
    greet: '星夜降临，蓝鲸小夜灯已为你温柔亮起~'
  }
];

const WINDOW_SEASON_SPECS = [
  {
    id: 'spring',
    name: '春樱',
    ico: './assets/vfx_season_spring.webp?v=hd19',
    greet: '窗畔飘起粉嫩春樱花瓣啦~'
  },
  {
    id: 'summer',
    name: '夏风',
    ico: './assets/vfx_season_summer.webp?v=hd19',
    greet: '挂上夏日清凉玻璃风铃，微风叮咚好听~'
  },
  {
    id: 'autumn',
    name: '秋枫',
    ico: './assets/vfx_season_autumn.webp?v=hd19',
    greet: '暖金秋枫与银杏叶随风落上窗台~'
  },
  {
    id: 'winter',
    name: '初雪',
    ico: './assets/vfx_season_winter.webp?v=hd19',
    greet: '窗外飘起软绵绵的初雪冰晶啦~'
  }
];

const INTIMACY_MILESTONES = [
  {
    level: 3,
    itemId: 'shell_clip',
    kind: 'headwear',
    name: '星海贝壳发卡',
    img: './assets/item_shell_clip.webp?v=hd19',
    desc: '亲密 LV.3 解锁 · 互动亲密经验 +20%',
    toastDesc: '已自动佩戴限定头饰，每次互动亲密经验 +20%'
  },
  {
    level: 5,
    itemId: 'furn_musicbox',
    furnKey: 'musicbox',
    kind: 'furniture',
    name: '星梦八音盒唱片机',
    img: './assets/furn_musicbox.webp?v=hd19',
    desc: '亲密 LV.5 解锁 · 轻点切换3首治愈八音盒曲目',
    toastDesc: '已自动摆上桌面，轻点唱片机可切换治愈曲目~'
  },
  {
    level: 8,
    itemId: 'star_wreath',
    kind: 'headwear',
    name: '深海星梦花环',
    img: './assets/item_star_wreath.webp?v=hd19',
    desc: '亲密 LV.8 解锁 · 打工金币与亲密收益 +15%',
    toastDesc: '已自动佩戴典藏头饰，打工金币与亲密收益 +15%'
  }
];

vision.setRoomTheme(player.roomTheme);
vision.setWindowAmbience(player.windowAmbience);
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
  isNewKillRecord: false,
  // AR-11 本班次打开的便当午餐（来自便当袋，离开打工模式即吃完）
  lunch: null,
  // AR-12 本班次剩余的猫咪九命护身次数（按小猫好感合计在开班时发放）
  kittenSavesLeft: 0,
  kittenSavesMax: 0,
  // AR-13 本班次的野餐好心情佑护（周末野餐后进入打工时消耗 1 次，离开打工模式即结束）
  picnic: null,
  // AR-14 本班次的陶艺佑护（烧好陶器后进入打工时消耗 1 次，离开打工模式即结束）
  pottery: null
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

function getActiveTeaShiftBuff() {
  const b = player.afternoonTea?.activeBuff;
  if (b && b.remainingSec > 0) return b;
  return null;
}

const TERRARIUM_XP_THRESHOLDS = [0, 40, 55, 75, 95, 0];

const TERRARIUM_SPECS = {
  peach_succulent: {
    id: 'peach_succulent',
    name: '蜜桃粉胖多肉',
    shortName: '粉多肉',
    spriteKey: 'plantPeachSucculent',
    img: './assets/plant_peach_succulent.webp?v=hd31',
    xRatio: 0.30,
    note: '奶陶圆盆里胖乎乎的粉尖多肉，吸饱阳光能带来打工招财好运~'
  },
  star_lily: {
    id: 'star_lily',
    name: '星露白铃兰',
    shortName: '白铃兰',
    spriteKey: 'plantStarLily',
    img: './assets/plant_star_lily.webp?v=hd31',
    xRatio: 0.355,
    note: '薄荷描金茶杯里的垂铃白花，沁人心脾的清香能持续治愈体力~'
  },
  blue_hydrangea: {
    id: 'blue_hydrangea',
    name: '晴空蓝绣球',
    shortName: '蓝绣球',
    spriteKey: 'plantBlueHydrangea',
    img: './assets/plant_blue_hydrangea.webp?v=hd31',
    xRatio: 0.41,
    note: '亚麻藤编篮里团团簇簇的晴空蓝绣球，让宝石磁吸与会心一击更顺手~'
  }
};

function getTerrariumStageLabel(lv) {
  const safeLv = Math.max(1, Math.min(5, Math.round(Number(lv) || 1)));
  if (safeLv <= 1) return '萌芽';
  if (safeLv <= 3) return '舒叶';
  return '盛放';
}

function getBotanicalBlessings() {
  const plants = player.terrarium?.plants || {};
  const succLv = Math.max(1, Math.min(5, Number(plants.peach_succulent?.level) || 1));
  const lilyLv = Math.max(1, Math.min(5, Number(plants.star_lily?.level) || 1));
  const hydrLv = Math.max(1, Math.min(5, Number(plants.blue_hydrangea?.level) || 1));
  const totalLevel = succLv + lilyLv + hydrLv;
  const bloomCount = [succLv, lilyLv, hydrLv].filter((v) => v >= 4).length;
  const displayedCount = ['peach_succulent', 'star_lily', 'blue_hydrangea'].filter(
    (k) => Boolean(plants[k]?.deskDisplayed)
  ).length;

  const luckCoinPct = Number((0.03 + succLv * 0.03).toFixed(4));
  const treasureDropBonus = Number((0.02 + succLv * 0.025).toFixed(4));
  const hpRegenPerSec = Number((0.35 + lilyLv * 0.45).toFixed(2));
  const magnetPct = Number((0.05 + hydrLv * 0.04).toFixed(4));
  const critChanceBonus = Number((0.02 + hydrLv * 0.018).toFixed(4));

  return {
    totalLevel,
    bloomCount,
    displayedCount,
    levels: {
      peach_succulent: succLv,
      star_lily: lilyLv,
      blue_hydrangea: hydrLv
    },
    luckCoinPct,
    treasureDropBonus,
    hpRegenPerSec,
    magnetPct,
    critChanceBonus
  };
}

const COLLAGE_FRAME_STYLES = {
  lace_ivory: {
    id: 'lace_ivory',
    name: '蕾丝奶白',
    caption: '奶白蕾丝 · 书桌暖忆'
  },
  honey_kraft: {
    id: 'honey_kraft',
    name: '蜜杏牛皮',
    caption: '蜜杏手账 · 晴日拾光'
  },
  sakura_letter: {
    id: 'sakura_letter',
    name: '樱粉信笺',
    caption: '樱粉花笺 · 心愿珍藏'
  }
};

const COLLAGE_STICKER_SPECS = {
  lace_garland: {
    id: 'lace_garland',
    name: '奶油蕾丝花边',
    img: './assets/sticker_lace_garland.webp?v=hd31'
  },
  pressed_daisy: {
    id: 'pressed_daisy',
    name: '干花书签',
    img: './assets/sticker_pressed_daisy.webp?v=hd31'
  },
  whale_stamp: {
    id: 'whale_stamp',
    name: '蓝鲸纪念邮票',
    img: './assets/sticker_whale_stamp.webp?v=hd31'
  }
};

const COLLAGE_LAYOUT_PRESETS = [
  {
    name: '花边顶饰',
    lace_garland: { xPct: 50, yPct: 16, rotDeg: 0 },
    pressed_daisy: { xPct: 23, yPct: 75, rotDeg: -12 },
    whale_stamp: { xPct: 79, yPct: 24, rotDeg: 9 }
  },
  {
    name: '对角花笺',
    lace_garland: { xPct: 50, yPct: 71, rotDeg: 0 },
    pressed_daisy: { xPct: 22, yPct: 24, rotDeg: 10 },
    whale_stamp: { xPct: 78, yPct: 68, rotDeg: -8 }
  },
  {
    name: '邮戳右铭',
    lace_garland: { xPct: 46, yPct: 15, rotDeg: -4 },
    pressed_daisy: { xPct: 77, yPct: 74, rotDeg: 14 },
    whale_stamp: { xPct: 24, yPct: 26, rotDeg: -10 }
  },
  {
    name: '花束环拥',
    lace_garland: { xPct: 52, yPct: 18, rotDeg: 3 },
    pressed_daisy: { xPct: 26, yPct: 68, rotDeg: -6 },
    whale_stamp: { xPct: 76, yPct: 32, rotDeg: 12 }
  }
];

function getCollageLuckBlessing() {
  const ck = player.collageKeepsake || {};
  const stickers = ck.stickers || {};
  const enabledIds = ['lace_garland', 'pressed_daisy', 'whale_stamp'].filter((k) => Boolean(stickers[k]?.enabled));
  const stickerCount = enabledIds.length;
  const active = Boolean(ck.blessingActive && (ck.savedCount || 0) > 0);
  const previewLuckyDropBonus = Number((0.06 + stickerCount * 0.04).toFixed(4));
  const previewGemMagnetPct = Number((0.08 + stickerCount * 0.05).toFixed(4));
  const previewStartingCoinPouch = 12 + stickerCount * 6;
  const previewLuckCoinPct = Number((0.04 + stickerCount * 0.03).toFixed(4));
  const styleSpec = COLLAGE_FRAME_STYLES[ck.frameStyle] || COLLAGE_FRAME_STYLES.lace_ivory;
  return {
    active,
    savedCount: ck.savedCount || 0,
    deskDisplayed: Boolean(ck.deskDisplayed),
    frameStyle: styleSpec.id,
    frameStyleName: styleSpec.name,
    stickerCount,
    enabledIds,
    previewLuckyDropBonus,
    previewGemMagnetPct,
    previewStartingCoinPouch,
    previewLuckCoinPct,
    luckyDropBonus: active ? previewLuckyDropBonus : 0,
    gemMagnetBonusPct: active ? previewGemMagnetPct : 0,
    startingCoinPouch: active ? previewStartingCoinPouch : 0,
    luckCoinPct: active ? previewLuckCoinPct : 0
  };
}

// AR-8 毛线钩针温暖手作篮规格与「暖绒手作守护」幸存者班次增益
const CROCHET_YARN_COSTS = [2, 2, 3, 0]; // Lv.0->1: 2团, Lv.1->2: 2团, Lv.2->3: 3团

const CROCHET_KNIT_SPECS = {
  whale_scarf: {
    id: 'whale_scarf',
    name: '手织蓝鲸小围巾',
    shortName: '蓝鲸围巾',
    spriteKey: 'knitWhaleScarf',
    img: './assets/knit_whale_scarf.webp?v=hd31',
    note: '软糯海盐蓝毛线一针一线织成的小鲸鱼围巾，系在颈间就不怕微凉海风~',
    specialty: '班次减伤核心（每阶 +4.5% 减伤，木桌展示额外 +2% 减伤）',
    giftLines: [
      '哇！软乎乎的手织蓝鲸小围巾，围在脖子上暖到心窝里啦 ^w^!',
      '针脚又细密了一层！小鲸鱼尾巴贴着脸颊好软糯呀~',
      '满针蓝鲸小围巾达成！主人织的围巾是全世界最暖的宝贝!'
    ]
  },
  star_coaster: {
    id: 'star_coaster',
    name: '钩针星芒杯垫',
    shortName: '星芒杯垫',
    spriteKey: 'knitStarCoaster',
    img: './assets/knit_star_coaster.webp?v=hd31',
    note: '奶油白与蜂蜜黄交织的五角星芒钩针杯垫，托起热饮时连空气都甜丝丝~',
    specialty: '爱心磁吸核心（每阶 +14% 爱心磁吸与 +3% 爱心掉落，木桌展示额外 +6% 磁吸）',
    giftLines: [
      '好精致的钩针星芒杯垫！垫在马克杯底下像捧着一颗小星星~',
      '星芒花边钩得更饱满啦，放在木桌上亮晶晶的好治愈!',
      '满针星芒杯垫完成！以后每一杯暖饮都有主人的星光相伴 ^w^!'
    ]
  },
  cloud_pillow: {
    id: 'cloud_pillow',
    name: '绒云晚安抱枕',
    shortName: '绒云抱枕',
    spriteKey: 'knitCloudPillow',
    img: './assets/knit_cloud_pillow.webp?v=hd31',
    note: '蓬松奶绒毛线钩织的胖云朵抱枕，抱在怀里像陷进暖阳晒过的棉花云~',
    specialty: '暖绒护盾核心（每阶 +14 开局暖绒护盾，木桌展示额外 +8 护盾）',
    giftLines: [
      '蓬蓬软软的绒云晚安抱枕！抱在怀里蹭一蹭就不困也不累啦~',
      '里面又填满了暖绒毛线，捏起来像刚出炉的舒芙蕾云朵!',
      '满针绒云抱枕大功告成！带着这份软绵守护去打工超有安全感!'
    ]
  }
};

function getCrochetStageLabel(lv) {
  const safeLv = Math.max(0, Math.min(3, Math.round(Number(lv) || 0)));
  if (safeLv <= 0) return '待起针';
  if (safeLv === 1) return '初织';
  if (safeLv === 2) return '细密';
  return '满针';
}

function getCrochetWarmGuard() {
  const cb = player.crochetBasket || {};
  const knits = cb.knits || {};
  const scarfLv = Math.max(0, Math.min(3, Math.round(Number(knits.whale_scarf?.level) || 0)));
  const coasterLv = Math.max(0, Math.min(3, Math.round(Number(knits.star_coaster?.level) || 0)));
  const pillowLv = Math.max(0, Math.min(3, Math.round(Number(knits.cloud_pillow?.level) || 0)));
  const totalLevel = scarfLv + coasterLv + pillowLv;
  const unlockedIds = ['whale_scarf', 'star_coaster', 'cloud_pillow'].filter(
    (k) => (Number(knits[k]?.level) || 0) >= 1
  );
  const active = totalLevel >= 1;
  let chosenDeskId = CROCHET_KNIT_SPECS[cb.displayedKnitId] ? cb.displayedKnitId : 'whale_scarf';
  if ((Number(knits[chosenDeskId]?.level) || 0) <= 0 && unlockedIds.length > 0) {
    chosenDeskId = unlockedIds[0];
  }
  const chosenLv = Math.max(0, Math.min(3, Math.round(Number(knits[chosenDeskId]?.level) || 0)));
  const deskDisplayed = Boolean(cb.deskDisplayed && chosenLv >= 1);

  const damageReductionPct = active
    ? Number(
        Math.min(
          0.36,
          scarfLv * 0.045 + totalLevel * 0.015 + (deskDisplayed && chosenDeskId === 'whale_scarf' ? 0.02 : 0)
        ).toFixed(4)
      )
    : 0;
  const cozyShieldBonus = active
    ? Math.round(pillowLv * 14 + totalLevel * 6 + (deskDisplayed && chosenDeskId === 'cloud_pillow' ? 8 : 0))
    : 0;
  const heartMagnetBonusPct = active
    ? Number(
        (
          coasterLv * 0.14 +
          totalLevel * 0.04 +
          (deskDisplayed && chosenDeskId === 'star_coaster' ? 0.06 : 0)
        ).toFixed(4)
      )
    : 0;
  const heartDropChanceBonus = active ? Number((coasterLv * 0.03 + totalLevel * 0.01).toFixed(4)) : 0;
  const heartHealBonus = active ? coasterLv * 3 + Math.ceil(totalLevel * 0.8) : 0;

  return {
    active,
    totalLevel,
    unlockedCount: unlockedIds.length,
    levels: {
      whale_scarf: scarfLv,
      star_coaster: coasterLv,
      cloud_pillow: pillowLv
    },
    displayedKnitId: chosenDeskId,
    displayedKnitName: CROCHET_KNIT_SPECS[chosenDeskId]?.name || '手织蓝鲸小围巾',
    displayedKnitShortName: CROCHET_KNIT_SPECS[chosenDeskId]?.shortName || '蓝鲸围巾',
    displayedKnitLevel: chosenLv,
    deskDisplayed,
    damageReductionPct,
    cozyShieldBonus,
    heartMagnetBonusPct,
    heartDropChanceBonus,
    heartHealBonus
  };
}

// AR-8 暖冬棉花糖热可可吧台：3款可可基底 × 2款暖绒顶料 = 6款冬日特调
const HOT_COCOA_BASES = {
  mellow_dark: {
    id: 'mellow_dark',
    name: '醇香黑巧基底',
    shortName: '醇黑巧',
    img: './assets/ui_btn_cocoa_bar.webp?v=hd31'
  },
  sea_salt_caramel: {
    id: 'sea_salt_caramel',
    name: '海盐焦糖可可',
    shortName: '海盐焦糖',
    img: './assets/ui_btn_cocoa_bar.webp?v=hd31'
  },
  hazelnut_cream: {
    id: 'hazelnut_cream',
    name: '榛果奶霜可可',
    shortName: '榛果奶霜',
    img: './assets/ui_btn_cocoa_bar.webp?v=hd31'
  }
};

const HOT_COCOA_TOPPINGS = {
  star_marshmallow: {
    id: 'star_marshmallow',
    name: '烤星芒棉花糖',
    shortName: '星芒棉花糖',
    img: './assets/cocoa_marshmallow_topping.webp?v=hd31'
  },
  cinnamon_stick: {
    id: 'cinnamon_stick',
    name: '肉桂暖香棒',
    shortName: '肉桂暖香棒',
    img: './assets/ui_btn_cocoa_bar.webp?v=hd31'
  }
};

const HOT_COCOA_BLENDS = [
  {
    id: 'mellow_dark__star_marshmallow',
    baseId: 'mellow_dark',
    toppingId: 'star_marshmallow',
    name: '星芒烤棉醇黑巧',
    buffTitle: '星棉疾风暖意',
    attackHastePct: 0.28,
    coinLuckPct: 0.18,
    luckyDropBonus: 0.09,
    note: '微焦星芒棉花糖浮在浓醇黑巧上，捧杯轻抿浑身暖洋洋~',
    reaction: '呼呼~ 烤星芒棉花糖在醇香黑巧里慢慢化开，甜润又暖心 ^w^!'
  },
  {
    id: 'mellow_dark__cinnamon_stick',
    baseId: 'mellow_dark',
    toppingId: 'cinnamon_stick',
    name: '暖桂醇浓黑可可',
    buffTitle: '桂香极速暖流',
    attackHastePct: 0.32,
    coinLuckPct: 0.15,
    luckyDropBonus: 0.08,
    note: '肉桂暖香棒轻轻搅动丝滑黑巧，驱散困意让手速飞快!',
    reaction: '嗅嗅~ 肉桂暖香配醇黑巧太提神啦，干活手速都变快咯!'
  },
  {
    id: 'sea_salt_caramel__star_marshmallow',
    baseId: 'sea_salt_caramel',
    toppingId: 'star_marshmallow',
    name: '海盐焦糖星棉可可',
    buffTitle: '琥珀星棉招财',
    attackHastePct: 0.2,
    coinLuckPct: 0.26,
    luckyDropBonus: 0.12,
    note: '微咸海盐焦糖裹着蓬松星芒棉花糖，每一口都是招财小确幸~',
    reaction: '海盐焦糖咸甜交织，咬一口软糯棉花糖幸福感爆棚啦 ^w^!'
  },
  {
    id: 'sea_salt_caramel__cinnamon_stick',
    baseId: 'sea_salt_caramel',
    toppingId: 'cinnamon_stick',
    name: '琥珀海盐肉桂可可',
    buffTitle: '暖金焦糖吉星',
    attackHastePct: 0.22,
    coinLuckPct: 0.24,
    luckyDropBonus: 0.11,
    note: '焦糖琥珀色热可可浸润木质肉桂香，暖手又旺打工财运~',
    reaction: '暖乎乎的海盐焦糖配肉桂棒，喝完手心脚尖都热腾腾的~'
  },
  {
    id: 'hazelnut_cream__star_marshmallow',
    baseId: 'hazelnut_cream',
    toppingId: 'star_marshmallow',
    name: '榛果奶霜星云可可',
    buffTitle: '榛云双馨暖意',
    attackHastePct: 0.24,
    coinLuckPct: 0.22,
    luckyDropBonus: 0.1,
    note: '烘烤榛果与绵密奶霜托起星芒棉花糖，攻速与财运双丰收~',
    reaction: '绵密榛果奶霜蹭到鼻尖上啦，配星芒棉花糖好香甜呀 ^w^!'
  },
  {
    id: 'hazelnut_cream__cinnamon_stick',
    baseId: 'hazelnut_cream',
    toppingId: 'cinnamon_stick',
    name: '焙榛肉桂暖冬可可',
    buffTitle: '焙榛暖冬守护',
    attackHastePct: 0.26,
    coinLuckPct: 0.2,
    luckyDropBonus: 0.1,
    note: '焙烤坚果香与肉桂暖韵融为一体，冬日书桌最治愈的一杯~',
    reaction: '焙烤榛果加肉桂暖香，捧着马克杯陪主人超有干劲~'
  }
];

function getHotCocoaBlend(baseId, toppingId) {
  const id = `${baseId}__${toppingId}`;
  return HOT_COCOA_BLENDS.find((b) => b.id === id) || HOT_COCOA_BLENDS[0];
}

function getActiveHotCocoaBuff() {
  const b = player.hotCocoa?.activeBuff;
  if (b && b.remainingSec > 0) return b;
  return null;
}

let syncCrochetUIFn = null;
function grantInteractiveCareYarnDrop(sourceTag = 'care') {
  if (!player.crochetBasket) return 0;
  player.crochetBasket.yarnSkeins = (player.crochetBasket.yarnSkeins || 0) + 1;
  player.crochetBasket.totalYarnCollected = (player.crochetBasket.totalYarnCollected || 0) + 1;
  player.crochetBasket.careDropCount = (player.crochetBasket.careDropCount || 0) + 1;
  savePetState();
  if (typeof syncCrochetUIFn === 'function') {
    syncCrochetUIFn();
  }
  if (sourceTag !== 'silent') {
    floatingTexts.push({
      x: Math.max(70, Math.min(W - 70, player.x + (player.x > W * 0.5 ? -84 : 84))),
      y: player.y - 58,
      vx: 0,
      vy: -32,
      text: '暖绒毛线 +1',
      color: '#fb923c',
      scale: 0.96,
      life: 0.85
    });
  }
  return player.crochetBasket.yarnSkeins;
}

// AR-9 干花标本温馨压花册规格与「幸运再生佑护」幸存者班次增益
const PRESSED_PETAL_COSTS = [2, 3, 4, 0]; // Lv.0->1: 2片, Lv.1->2: 3片, Lv.2->3: 4片（消耗对应花材）
const PRESSED_BOOKMARK_IDS = ['sakura', 'ginkgo', 'babysbreath'];

const PRESSED_BOOKMARK_SPECS = {
  sakura: {
    id: 'sakura',
    name: '樱瓣干花书签',
    shortName: '樱瓣书签',
    petalName: '樱瓣',
    spriteKey: 'pressedSakuraBookmark',
    img: './assets/pressed_sakura_bookmark.webp?v=hd31',
    note: '春日窗台拾来的樱花瓣，夹进厚厚的手账本压平，再封进奶油牛皮纸书签~',
    specialty: '幸运掉宝核心（每阶 +3% 打工幸运掉宝，木桌陈列额外 +2%）',
    giftLines: [
      '哇！粉粉的樱瓣书签，夹在手账里一翻开就是春天的味道 ^w^!',
      '樱花瓣压得更平整啦，透光看还有淡淡的花脉呢~',
      '珍藏级樱瓣书签完成！主人送的春天要一直夹在最喜欢的那一页!'
    ]
  },
  ginkgo: {
    id: 'ginkgo',
    name: '银杏干花书签',
    shortName: '银杏书签',
    petalName: '银杏',
    spriteKey: 'pressedGinkgoBookmark',
    img: './assets/pressed_ginkgo_bookmark.webp?v=hd31',
    note: '秋日落在书页间的金色银杏叶，压成小扇子形状的书签，读书累了就扇扇风~',
    specialty: '体力再生核心（每阶 +0.3/秒 打工体力再生，木桌陈列额外 +0.15/秒）',
    giftLines: [
      '金灿灿的银杏小扇子书签！拿在手里暖洋洋的像秋天的阳光~',
      '银杏叶的纹路更清晰啦，夹在书里每次翻到都好安心~',
      '珍藏级银杏书签完成！有它陪着打工，累了也能慢慢恢复元气!'
    ]
  },
  babysbreath: {
    id: 'babysbreath',
    name: '满天星干花书签',
    shortName: '满天星书签',
    petalName: '满天星',
    spriteKey: 'pressedBabysbreathBookmark',
    img: './assets/pressed_babysbreath_bookmark.webp?v=hd31',
    note: '一小簇雪白满天星压成星点书签，像把晴夜窗外的星光悄悄收进了书页~',
    specialty: '金币幸运核心（每阶 +4% 打工金币幸运）',
    giftLines: [
      '小小的满天星书签像一把星星糖！好想每天都夹在手账里~',
      '星点花簇压得更饱满啦，在台灯下一闪一闪的好治愈!',
      '珍藏级满天星书签完成！主人的心意就像满天星一样数也数不清~'
    ]
  }
};

function getPressedStageLabel(lv) {
  const safeLv = Math.max(0, Math.min(3, Math.round(Number(lv) || 0)));
  if (safeLv <= 0) return '待压制';
  if (safeLv === 1) return '初压';
  if (safeLv === 2) return '平整';
  return '珍藏';
}

function getPressedFlowerBlessing() {
  const pf = player.pressedFlowers || {};
  const marks = pf.bookmarks || {};
  const lvOf = (id) => Math.max(0, Math.min(3, Math.round(Number(marks[id]?.level) || 0)));
  const sakuraLv = lvOf('sakura');
  const ginkgoLv = lvOf('ginkgo');
  const babysLv = lvOf('babysbreath');
  const totalLevel = sakuraLv + ginkgoLv + babysLv;
  const unlockedIds = PRESSED_BOOKMARK_IDS.filter((id) => lvOf(id) >= 1);
  const active = totalLevel >= 1;
  const deskDisplayed = Boolean(pf.deskDisplayed && active);
  const luckyDropBonus = active
    ? Number((sakuraLv * 0.03 + totalLevel * 0.006 + (deskDisplayed ? 0.02 : 0)).toFixed(4))
    : 0;
  const hpRegenPerSec = active
    ? Number((ginkgoLv * 0.3 + totalLevel * 0.05 + (deskDisplayed ? 0.15 : 0)).toFixed(2))
    : 0;
  const coinLuckPct = active ? Number((babysLv * 0.04 + totalLevel * 0.004).toFixed(4)) : 0;
  return {
    active,
    totalLevel,
    unlockedCount: unlockedIds.length,
    unlockedIds,
    levels: { sakura: sakuraLv, ginkgo: ginkgoLv, babysbreath: babysLv },
    deskDisplayed,
    luckyDropBonus,
    hpRegenPerSec,
    coinLuckPct
  };
}

let syncPressedFlowerUIFn = null;
function grantPressedFlowerDrop(sourceTag = 'care') {
  const pf = player.pressedFlowers;
  if (!pf) return '';
  const petalId = PRESSED_BOOKMARK_IDS[(pf.careDropCount || 0) % PRESSED_BOOKMARK_IDS.length];
  pf.petals[petalId] = (pf.petals[petalId] || 0) + 1;
  pf.totalPetalsCollected = (pf.totalPetalsCollected || 0) + 1;
  pf.careDropCount = (pf.careDropCount || 0) + 1;
  savePetState();
  if (typeof syncPressedFlowerUIFn === 'function') {
    syncPressedFlowerUIFn();
  }
  if (sourceTag !== 'silent') {
    floatingTexts.push({
      x: Math.max(70, Math.min(W - 70, player.x + (player.x > W * 0.5 ? -92 : 92))),
      y: player.y - 84,
      vx: 0,
      vy: -30,
      text: `${PRESSED_BOOKMARK_SPECS[petalId].petalName} +1`,
      color: '#e48aa6',
      scale: 0.94,
      life: 0.85
    });
  }
  return petalId;
}

// AR-9 窗畔星夜天文望远镜：6 座星座（坐标为望远镜视野百分比，按序号连星 + 辨认形状）
const CONSTELLATION_SPECS = [
  {
    id: 'summer_triangle',
    name: '夏季大三角',
    shape: '三颗亮星连成的大三角',
    stars: [
      { x: 36, y: 18, name: '织女星' },
      { x: 64, y: 28, name: '天津四' },
      { x: 44, y: 82, name: '牛郎星' }
    ],
    edges: [[0, 1], [1, 2], [2, 0]],
    reaction: '织女、牛郎和天津四手拉手，连成夏夜大三角啦~'
  },
  {
    id: 'cassiopeia',
    name: '仙后座',
    shape: '五星折线成 W 字形',
    stars: [
      { x: 18, y: 30, name: '王良四' },
      { x: 34, y: 72, name: '王良一' },
      { x: 50, y: 40, name: '策' },
      { x: 66, y: 74, name: '阁道三' },
      { x: 82, y: 26, name: '阁道二' }
    ],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4]],
    reaction: '弯弯折折的 W 形，像夜空里的温柔签名~'
  },
  {
    id: 'lyra',
    name: '天琴座',
    shape: '亮星挂着小小平行四边形',
    stars: [
      { x: 44, y: 14, name: '织女星' },
      { x: 40, y: 42, name: '织女二' },
      { x: 56, y: 46, name: '织女三' },
      { x: 58, y: 86, name: '渐台三' },
      { x: 42, y: 82, name: '渐台二' }
    ],
    edges: [[0, 1], [0, 2], [1, 2], [2, 3], [3, 4], [4, 1]],
    reaction: '织女星挂着一把小竖琴，叮咚叮咚~'
  },
  {
    id: 'cygnus',
    name: '天鹅座',
    shape: '展翅飞翔的十字形',
    stars: [
      { x: 50, y: 14, name: '天津四' },
      { x: 50, y: 44, name: '天津一' },
      { x: 50, y: 88, name: '辇道增七' },
      { x: 28, y: 36, name: '天津二' },
      { x: 72, y: 54, name: '天津九' }
    ],
    edges: [[0, 1], [1, 2], [3, 1], [1, 4]],
    reaction: '展翅的星星天鹅正沿着银河飞呢~'
  },
  {
    id: 'big_dipper',
    name: '北斗七星',
    shape: '勺柄弯弯的七星大勺子',
    stars: [
      { x: 10, y: 22, name: '摇光' },
      { x: 24, y: 30, name: '开阳' },
      { x: 36, y: 36, name: '玉衡' },
      { x: 48, y: 42, name: '天权' },
      { x: 52, y: 74, name: '天玑' },
      { x: 74, y: 80, name: '天璇' },
      { x: 78, y: 46, name: '天枢' }
    ],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]],
    reaction: '北斗大勺子！顺着勺口就能找到北极星~'
  },
  {
    id: 'orion',
    name: '猎户座',
    shape: '三星腰带的沙漏形猎人',
    stars: [
      { x: 36, y: 14, name: '参宿四' },
      { x: 64, y: 16, name: '参宿五' },
      { x: 60, y: 46, name: '参宿三' },
      { x: 50, y: 50, name: '参宿二' },
      { x: 40, y: 54, name: '参宿一' },
      { x: 38, y: 88, name: '参宿六' },
      { x: 66, y: 86, name: '参宿七' }
    ],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0], [4, 5], [2, 6]],
    reaction: '三星腰带的猎户座，冬夜最神气啦~'
  }
];

const CONSTELLATION_BY_ID = Object.fromEntries(CONSTELLATION_SPECS.map((c) => [c.id, c]));

// 左下角留给「连星 n/m」进度签，干扰星不放在那里
const STARGAZE_DECOY_CANDIDATES = [
  { x: 6, y: 12 },
  { x: 94, y: 14 },
  { x: 8, y: 52 },
  { x: 93, y: 72 },
  { x: 82, y: 12 },
  { x: 91, y: 42 },
  { x: 74, y: 86 },
  { x: 22, y: 14 },
  { x: 26, y: 58 },
  { x: 88, y: 86 },
  { x: 62, y: 86 },
  { x: 8, y: 32 }
];

function getStargazeDecoys(spec) {
  const picked = [];
  for (const cand of STARGAZE_DECOY_CANDIDATES) {
    const clear = spec.stars.every((s) => Math.hypot((cand.x - s.x) * 3.4, (cand.y - s.y) * 1.5) >= 30);
    const clearOfPicked = picked.every((s) => Math.hypot((cand.x - s.x) * 3.4, (cand.y - s.y) * 1.5) >= 30);
    if (clear && clearOfPicked) picked.push(cand);
    if (picked.length >= 6) break;
  }
  return picked;
}

function getStarGuidanceBonus() {
  const collectedIds = Object.keys(player.telescope?.constellations || {}).filter((id) => CONSTELLATION_BY_ID[id]);
  const count = collectedIds.length;
  const full = count >= CONSTELLATION_SPECS.length;
  return {
    active: count >= 1,
    count,
    total: CONSTELLATION_SPECS.length,
    collectedIds,
    critChanceBonus: Number((count * 0.015 + (full ? 0.01 : 0)).toFixed(4)),
    gemMagnetPct: Number((count * 0.03 + (full ? 0.02 : 0)).toFixed(4))
  };
}

// AR-10 窗畔雨天水彩写生画架：3 题材 × 3 调色盘 = 9 幅画廊，画意专注守护随画廊收藏数成长
const WATERCOLOR_SUBJECTS = [
  {
    id: 'rainy_window',
    name: '雨天窗畔',
    shortName: '雨窗',
    title: '听雨的窗',
    spriteKey: '',
    img: './assets/watercolor_rainy_window.webp?v=hd31',
    mixIdx: [0, 1],
    note: '雨丝顺着玻璃慢慢滑落，窗棂外是一整片湿漉漉的柔光~'
  },
  {
    id: 'potted_plant',
    name: '窗台小盆栽',
    shortName: '盆栽',
    title: '窗台小盆栽',
    spriteKey: 'plantStarLily',
    img: './assets/plant_star_lily.webp?v=hd31',
    // 叠画在雨窗水彩画的窗台右侧：size 为画幅比例，cx 为水平偏移，bottomRatio 为贴图可见底边比例
    overlay: { size: 0.4, cx: 0.15, bottomRatio: 0.88 },
    mixIdx: [1, 2],
    note: '雨天的窗台上，白铃兰低着头听雨，叶尖挂着一颗小水珠~'
  },
  {
    id: 'whale_plush',
    name: '酣睡鲸鱼抱枕',
    shortName: '鲸鱼',
    title: '酣睡的小鲸',
    spriteKey: 'toyWhale',
    img: './assets/toy_whale.webp?v=hd31',
    overlay: { size: 0.44, cx: 0.13, bottomRatio: 0.82 },
    mixIdx: [2, 0],
    note: '鲸鱼抱枕窝在雨声里打盹，圆滚滚的肚皮一起一伏~'
  }
];

const WATERCOLOR_PALETTES = [
  {
    id: 'mist_blue',
    name: '雾霾蓝调',
    shortName: '雾蓝',
    filter: 'saturate(0.68) brightness(1.06) contrast(0.95)',
    wash: 'rgba(169, 196, 222, 0.5)',
    pigments: [
      { name: '雾霾蓝', color: '#a9c4de' },
      { name: '奶白', color: '#fbf6ec' },
      { name: '灰紫', color: '#c9b9d9' }
    ],
    mixNames: ['雨雾浅蓝', '晨雾淡紫', '鲸背灰蓝']
  },
  {
    id: 'peach_cream',
    name: '蜜桃奶油',
    shortName: '蜜桃',
    filter: 'sepia(0.1) saturate(1.12) hue-rotate(-10deg) brightness(1.04)',
    wash: 'rgba(246, 184, 176, 0.48)',
    pigments: [
      { name: '蜜桃粉', color: '#f6b8b0' },
      { name: '奶油黄', color: '#f8e2b0' },
      { name: '杏仁白', color: '#fbf1e4' }
    ],
    mixNames: ['蜜桃奶霜', '杏仁奶油', '晚霞桃杏']
  },
  {
    id: 'matcha_latte',
    name: '抹茶拿铁',
    shortName: '抹茶',
    filter: 'sepia(0.22) hue-rotate(32deg) saturate(0.92) brightness(1.03)',
    wash: 'rgba(185, 211, 164, 0.5)',
    pigments: [
      { name: '抹茶绿', color: '#b9d3a4' },
      { name: '拿铁棕', color: '#d9bf9f' },
      { name: '燕麦白', color: '#f6efe1' }
    ],
    mixNames: ['抹茶奶绿', '燕麦拿铁', '抹茶奶霜']
  }
];

const WATERCOLOR_SUBJECT_BY_ID = Object.fromEntries(WATERCOLOR_SUBJECTS.map((x) => [x.id, x]));
const WATERCOLOR_PALETTE_BY_ID = Object.fromEntries(WATERCOLOR_PALETTES.map((x) => [x.id, x]));
const WATERCOLOR_TOTAL_COMBOS = WATERCOLOR_SUBJECTS.length * WATERCOLOR_PALETTES.length;

function getWatercolorComboId(subjectId, paletteId) {
  return `${subjectId}__${paletteId}`;
}

// 题材贴图落在雨窗画的窗台上（窗台顶边约在画幅 73% 高度）
const WATERCOLOR_SILL_Y = 0.73;
function getWatercolorOverlayBox(subject) {
  const ov = subject && subject.overlay;
  if (!ov) return null;
  return {
    left: 0.5 + ov.cx - ov.size * 0.5,
    top: WATERCOLOR_SILL_Y - ov.bottomRatio * ov.size,
    size: ov.size
  };
}

function getWatercolorOverlayStyle(subject) {
  const box = getWatercolorOverlayBox(subject);
  if (!box) return '';
  const pct = (v) => `${(v * 100).toFixed(1)}%`;
  return `left:${pct(box.left)};top:${pct(box.top)};width:${pct(box.size)};height:${pct(box.size)}`;
}

function getWatercolorFocusWard() {
  const paintings = player.watercolor?.paintings || {};
  const gallerySize = Object.keys(paintings).filter((k) => {
    const [sid, pid] = k.split('__');
    return WATERCOLOR_SUBJECT_BY_ID[sid] && WATERCOLOR_PALETTE_BY_ID[pid];
  }).length;
  const full = gallerySize >= WATERCOLOR_TOTAL_COMBOS;
  return {
    active: gallerySize >= 1,
    gallerySize,
    total: WATERCOLOR_TOTAL_COMBOS,
    hungCount: Math.min(6, (player.watercolor?.hung || []).length),
    critChanceBonus: Number((gallerySize * 0.012 + (full ? 0.02 : 0)).toFixed(4)),
    focusHastePct: Number((gallerySize * 0.015).toFixed(4))
  };
}

// AR-10 奶油手账小邮差信箱：3 枚邮票（寄出回信数解锁）与「信笺心意」班次经验加成
const MAILBOX_STAMP_SPECS = [
  { id: 'whale', name: '蓝鲸邮票', img: './assets/stamp_whale.webp?v=hd31', unlockReplies: 0 },
  { id: 'moon', name: '晚安月亮章', img: './assets/stamp_goodnight_moon.webp?v=hd31', unlockReplies: 2 },
  { id: 'daisy', name: '雏菊干花票', img: './assets/sticker_pressed_daisy.webp?v=hd31', unlockReplies: 4 }
];

function getMailboxHeartfeltBonus() {
  const mb = player.mailbox || {};
  const replies = Math.max(0, Number(mb.totalReplies) || 0);
  const stampKinds = MAILBOX_STAMP_SPECS.filter((st) => (Number(mb.stamps?.[st.id]) || 0) > 0).length;
  const active = replies >= 1;
  return {
    active,
    replies,
    stampKinds,
    totalStampKinds: MAILBOX_STAMP_SPECS.length,
    shiftXpBonusPct: active ? Number((Math.min(0.12, replies * 0.012) + stampKinds * 0.01).toFixed(4)) : 0
  };
}

function getMailboxShiftXpMult() {
  const bonus = getMailboxHeartfeltBonus();
  return gameMode === 'survivor' && bonus.active ? 1 + bonus.shiftXpBonusPct : 1;
}

// AR-11 暖灯厨房一起做饭团便当：3 种饭团馅料 × 3 组双配菜 = 9 款便当图鉴；打包的便当在下一个幸存者班次打开（每份守护 1 个班次）
// 规格常量与加成计算放在卡片 UI 区段之前声明，周报 / 结算在模块初始化期间调用时不会触发 TDZ
const BENTO_FILLINGS = [
  {
    id: 'ume',
    name: '酸甜梅子',
    shortName: '梅子',
    color: '#f2a9b8',
    regen: 1.2,
    rescuePct: 0.35,
    rescueCharges: 1,
    placeLine: '梅子饭团捏得圆滚滚，酸酸甜甜最开胃~'
  },
  {
    id: 'salmon',
    name: '香煎鲑鱼',
    shortName: '鲑鱼',
    color: '#f6b48c',
    regen: 0.8,
    rescuePct: 0.55,
    rescueCharges: 1,
    placeLine: '鲑鱼饭团香喷喷，打工饿了咬一大口就满血~'
  },
  {
    id: 'tuna',
    name: '金枪鱼蛋黄酱',
    shortName: '金枪鱼',
    color: '#f2dd9c',
    regen: 0.9,
    rescuePct: 0.35,
    rescueCharges: 2,
    placeLine: '金枪鱼蛋黄酱饭团做了两个，留一个给你救急~'
  }
];

const BENTO_SIDES = [
  { id: 'tamago', name: '厚蛋烧', color: '#f7d774', regenBonus: 0.2, rescueBonus: 0, placeLine: '厚蛋烧卷得软软的，切成小块摆好啦~' },
  { id: 'octopus', name: '章鱼小香肠', color: '#f29a8a', regenBonus: 0, rescueBonus: 0.05, placeLine: '章鱼小香肠八只脚都张开了，好可爱！' },
  { id: 'broccoli', name: '水煮西兰花', color: '#a9d18e', regenBonus: 0.3, rescueBonus: 0, placeLine: '西兰花焯得翠绿翠绿的，营养满分~' }
];

const BENTO_SIDE_PAIRS = [
  { id: 'tamago+octopus', ids: ['tamago', 'octopus'], name: '元气野餐' },
  { id: 'tamago+broccoli', ids: ['tamago', 'broccoli'], name: '田园清爽' },
  { id: 'octopus+broccoli', ids: ['octopus', 'broccoli'], name: '森林章鱼' }
];

const BENTO_FILLING_BY_ID = Object.fromEntries(BENTO_FILLINGS.map((x) => [x.id, x]));
const BENTO_SIDE_BY_ID = Object.fromEntries(BENTO_SIDES.map((x) => [x.id, x]));
const BENTO_BAG_MAX = 3;
const BENTO_RESCUE_THRESHOLD = 0.35;

function getBentoPairId(sideA, sideB) {
  const ia = BENTO_SIDES.findIndex((s) => s.id === sideA);
  const ib = BENTO_SIDES.findIndex((s) => s.id === sideB);
  if (ia < 0 || ib < 0 || ia === ib) return '';
  return ia < ib ? `${sideA}+${sideB}` : `${sideB}+${sideA}`;
}

const BENTO_RECIPES = BENTO_FILLINGS.flatMap((f) =>
  BENTO_SIDE_PAIRS.map((pair) => {
    const sides = pair.ids.map((sid) => BENTO_SIDE_BY_ID[sid]);
    return {
      id: `${f.id}__${pair.id}`,
      fillingId: f.id,
      pairId: pair.id,
      sideIds: pair.ids.slice(),
      name: `${f.shortName}${pair.name}便当`,
      regen: Number((f.regen + sides.reduce((acc, s) => acc + s.regenBonus, 0)).toFixed(2)),
      rescuePct: Number((f.rescuePct + sides.reduce((acc, s) => acc + s.rescueBonus, 0)).toFixed(2)),
      rescueCharges: f.rescueCharges
    };
  })
);
const BENTO_RECIPE_BY_ID = Object.fromEntries(BENTO_RECIPES.map((r) => [r.id, r]));

function getBentoKitchenStats() {
  const bk = player.bentoKitchen || {};
  const discovered = Object.keys(bk.discovered || {}).filter((id) => BENTO_RECIPE_BY_ID[id]).length;
  const bag = Array.isArray(bk.bag) ? bk.bag.filter((b) => b && BENTO_RECIPE_BY_ID[b.recipeId]) : [];
  return {
    discovered,
    totalRecipes: BENTO_RECIPES.length,
    bagCount: bag.length,
    bagMax: BENTO_BAG_MAX,
    nextLunch: bag.length ? { ...BENTO_RECIPE_BY_ID[bag[0].recipeId] } : null,
    totalBentos: Math.max(0, Number(bk.totalBentos) || 0)
  };
}

// 当前幸存者班次打开的便当午餐（续航回血 + 低血饭团救急），仅打工模式生效
function getBentoLunchWard() {
  const lunch = survivorRun.lunch;
  const active = Boolean(gameMode === 'survivor' && lunch && BENTO_RECIPE_BY_ID[lunch.recipeId]);
  return {
    active,
    recipeId: active ? lunch.recipeId : '',
    name: active ? lunch.name : '',
    regenPerSec: active ? lunch.regen : 0,
    rescuePct: active ? lunch.rescuePct : 0,
    rescueCharges: active ? lunch.rescueCharges : 0,
    rescuesLeft: active ? lunch.rescuesLeft : 0
  };
}

// AR-11 奶油手账回忆拼图时光：每拼好 1 段不同回忆（拍立得 / 水彩 / 周报 / 原画），幸存者打工金币 +2%，集满 6 段再 +3%
const MEMORY_WALL_MAX = 6;
const MEMORY_PUZZLE_GRID = 3;
const MEMORY_PUZZLE_PIECES = MEMORY_PUZZLE_GRID * MEMORY_PUZZLE_GRID;

function getMemoryPuzzleBonus() {
  const mp = player.memoryPuzzle || {};
  const distinctAll = Object.keys(mp.completed || {}).length;
  const distinct = Math.min(MEMORY_WALL_MAX, distinctAll);
  const full = distinct >= MEMORY_WALL_MAX;
  return {
    active: distinct >= 1,
    distinct,
    distinctAll,
    total: MEMORY_WALL_MAX,
    wallCount: Math.min(MEMORY_WALL_MAX, (mp.wall || []).length),
    coinLuckPct: Number((distinct * 0.02 + (full ? 0.03 : 0)).toFixed(4))
  };
}

function getMemoryPuzzleCoinMult() {
  const bonus = getMemoryPuzzleBonus();
  return gameMode === 'survivor' && bonus.active ? 1 + bonus.coinLuckPct : 1;
}

// AR-12 窗台小猫访客喂食角 & 奶油手账节日手作贺卡：规格常量、可注入时钟与加成计算放在卡片 UI 区段之前声明，
// 周报 / 结算 / 胶囊在模块初始化期间调用时不会触发 TDZ
// 可注入时钟 / 随机数：小猫来访排期与节日判定统一读这里；测试固定时间与随机种子即可完全确定
const ar12Clock = {
  fixedMs: null,
  offsetMs: 0,
  now() {
    return this.fixedMs !== null ? this.fixedMs : Date.now() + this.offsetMs;
  },
  date() {
    return new Date(this.now());
  }
};
let ar12RandomFn = Math.random;

function ar12Random() {
  const v = Number(ar12RandomFn());
  return Number.isFinite(v) ? Math.max(0, Math.min(0.999999, v)) : Math.random();
}

function makeAr12SeededRandom(seed) {
  let a = Number(seed) >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const KITTEN_SPECS = [
  {
    id: 'ginger',
    name: '橘子',
    fullName: '窗台橘猫 · 橘子',
    spriteKey: 'kittenGinger',
    img: './assets/kitten_ginger.webp?v=hd31',
    feedGain: 10,
    petGain: 3,
    trait: '贪吃又爱撒娇，听见猫粮罐沙沙响就竖起尾巴',
    arriveLine: '窗台上来了一只橘猫「橘子」，正眯着眼睛晒太阳~',
    feedLine: '橘子埋头吃得咔嚓咔嚓，尾巴尖都开心得翘起来啦~',
    petLine: '橘子把脑袋往你手心里蹭，呼噜呼噜~',
    fullLine: '橘子已经被摸得软成一团猫饼，让它歇会儿吧~'
  },
  {
    id: 'tuxedo',
    name: '小礼服',
    fullName: '窗台奶牛猫 · 小礼服',
    spriteKey: 'kittenTuxedo',
    img: './assets/kitten_tuxedo.webp?v=hd31',
    feedGain: 8,
    petGain: 4,
    trait: '穿着黑白小礼服的绅士猫，最喜欢被轻轻挠下巴',
    arriveLine: '是穿着小礼服的奶牛猫！它端端正正地坐在窗台上~',
    feedLine: '小礼服优雅地一粒一粒吃，吃完还舔了舔爪子~',
    petLine: '挠挠下巴，小礼服舒服得眯成了一条缝~',
    fullLine: '小礼服礼貌地甩了甩尾巴：今天的摸摸够啦~'
  }
];
const KITTEN_BY_ID = Object.fromEntries(KITTEN_SPECS.map((k) => [k.id, k]));
const KITTEN_AFFECTION_MAX = 100;
const KITTEN_TIERS = [
  { idx: 0, min: 0, name: '怯生生', coins: 0 },
  { idx: 1, min: 20, name: '熟悉', coins: 10 },
  { idx: 2, min: 50, name: '亲近', coins: 20 },
  { idx: 3, min: 80, name: '挚友', coins: 30 }
];
const KITTEN_VISIT_RULES = {
  firstDelayMs: [40000, 90000],
  gapMs: [180000, 540000],
  stayMs: [150000, 270000],
  closeFriendStayBonusMs: 90000,
  feedStayBonusMs: 60000,
  missedRetryMs: [20000, 60000],
  midnightJitterMs: [60000, 300000],
  dailyCap: 8,
  petsPerVisit: 3,
  maxStayMs: 15 * 60000
};

function getKittenTier(aff) {
  let tier = KITTEN_TIERS[0];
  for (const t of KITTEN_TIERS) {
    if (aff >= t.min) tier = t;
  }
  return tier;
}

function getKittenCornerStats(nowMs = ar12Clock.now()) {
  const kc = player.kittenCorner || {};
  const kittens = kc.kittens || {};
  const visit = kc.visit && KITTEN_BY_ID[kc.visit.kittenId] && nowMs < kc.visit.leavesAt ? kc.visit : null;
  return {
    met: KITTEN_SPECS.filter((k) => kittens[k.id] && kittens[k.id].met).length,
    totalKittens: KITTEN_SPECS.length,
    totalAffection: KITTEN_SPECS.reduce(
      (acc, k) => acc + Math.max(0, Math.min(KITTEN_AFFECTION_MAX, Number(kittens[k.id] && kittens[k.id].affection) || 0)),
      0
    ),
    maxAffection: KITTEN_SPECS.length * KITTEN_AFFECTION_MAX,
    visiting: Boolean(visit),
    visitorId: visit ? visit.kittenId : '',
    visitsToday: Math.max(0, Number(kc.visitsToday) || 0),
    dailyCap: KITTEN_VISIT_RULES.dailyCap,
    totalVisits: Math.max(0, Number(kc.totalVisits) || 0),
    totalFeeds: Math.max(0, Number(kc.totalFeeds) || 0),
    totalPets: Math.max(0, Number(kc.totalPets) || 0)
  };
}

// 猫咪幸运佑护：两只小猫好感合计（0~200）→ 幸运掉宝最高 +10%；合计 ≥40 每班次 1 次「九命护身」，≥140 两次
function getKittenLuckWard() {
  const stats = getKittenCornerStats();
  const total = stats.totalAffection;
  const active = total >= 10;
  return {
    active,
    totalAffection: total,
    maxAffection: stats.maxAffection,
    met: stats.met,
    totalKittens: stats.totalKittens,
    luckyDropBonus: active ? Number(Math.min(0.1, total * 0.0005).toFixed(4)) : 0,
    saveCharges: total >= 140 ? 2 : total >= 40 ? 1 : 0,
    saveHpPct: 0.3
  };
}

const CARD_BASES = [
  { id: 'cream_grid', name: '奶油格纹' },
  { id: 'sakura_wash', name: '樱粉水彩' },
  { id: 'mint_letter', name: '薄荷信笺' }
];
const CARD_BASE_BY_ID = Object.fromEntries(CARD_BASES.map((b) => [b.id, b]));

// 剪贴贴纸全部复用已提供的手账位图；遇见过的小猫会解锁它的剪贴贴纸
const CARD_STICKERS = {
  lace: { name: '蕾丝花边', img: './assets/sticker_lace_garland.webp?v=hd31', spriteKey: 'stickerLaceGarland' },
  daisy: { name: '雏菊干花', img: './assets/sticker_pressed_daisy.webp?v=hd31', spriteKey: 'stickerPressedDaisy' },
  whale: { name: '蓝鲸邮票', img: './assets/stamp_whale.webp?v=hd31', spriteKey: 'stampWhale' },
  moon: { name: '晚安月亮', img: './assets/stamp_goodnight_moon.webp?v=hd31', spriteKey: 'stampGoodnightMoon' },
  heart: { name: '小爱心', img: './assets/vfx_heart.webp?v=hd6', spriteKey: 'vfxHeart' },
  sparkle: { name: '星芒', img: './assets/vfx_sparkle.webp?v=hd6', spriteKey: 'vfxSparkle' },
  note: { name: '音符', img: './assets/vfx_note.webp?v=hd6', spriteKey: 'vfxNote' },
  blush: { name: '红晕贴', img: './assets/ui_mood_blush.webp?v=hd31', spriteKey: '' },
  sakura: { name: '樱花', img: './assets/vfx_season_spring.webp?v=hd31', spriteKey: 'vfxSeasonSpring' },
  chime: { name: '风铃', img: './assets/vfx_season_summer.webp?v=hd31', spriteKey: 'vfxSeasonSummer' },
  maple: { name: '枫叶', img: './assets/vfx_season_autumn.webp?v=hd31', spriteKey: 'vfxSeasonAutumn' },
  snow: { name: '雪花', img: './assets/vfx_season_winter.webp?v=hd31', spriteKey: 'vfxSeasonWinter' },
  wreath: { name: '星环花冠', img: './assets/item_star_wreath.webp?v=hd31', spriteKey: 'itemStarWreath' },
  kitten_ginger: { name: '橘子剪贴', img: './assets/kitten_ginger.webp?v=hd31', spriteKey: 'kittenGinger', kittenId: 'ginger' },
  kitten_tuxedo: { name: '小礼服剪贴', img: './assets/kitten_tuxedo.webp?v=hd31', spriteKey: 'kittenTuxedo', kittenId: 'tuxedo' }
};
const CARD_UNIVERSAL_STICKERS = ['lace', 'daisy', 'whale'];

// 4 个固定公历节日（本地日期窗口，跨年也能判定）优先，其余日子按本地月份落到四季贺卡
const CARD_OCCASIONS = [
  {
    id: 'new_year',
    kind: 'holiday',
    name: '元旦新年',
    short: '新年',
    month: 1,
    day: 1,
    before: 3,
    after: 2,
    icon: './assets/item_star_wreath.webp?v=hd31',
    helperBase: 'cream_grid',
    stickers: ['wreath', 'sparkle', 'note'],
    lines: ['新的一年，也请多多指教呀', '愿新年的每一页手账都闪闪发光', '跨年的那一刻，想和你一起数']
  },
  {
    id: 'valentine',
    kind: 'holiday',
    name: '情人节',
    short: '情人节',
    month: 2,
    day: 14,
    before: 2,
    after: 1,
    icon: './assets/vfx_heart.webp?v=hd6',
    helperBase: 'sakura_wash',
    stickers: ['heart', 'blush', 'sparkle'],
    lines: ['今天的巧克力，分你一大半', '有你在的书桌，每天都是晴天', '悄悄说，最喜欢陪着你啦']
  },
  {
    id: 'childrens_day',
    kind: 'holiday',
    name: '儿童节',
    short: '儿童节',
    month: 6,
    day: 1,
    before: 2,
    after: 1,
    icon: './assets/stamp_whale.webp?v=hd31',
    helperBase: 'mint_letter',
    stickers: ['whale', 'note', 'heart'],
    lines: ['儿童节快乐，今天可以多吃一块蛋糕', '愿你一直留着会冒泡泡的童心', '一起去追窗外的肥皂泡吧']
  },
  {
    id: 'christmas',
    kind: 'holiday',
    name: '圣诞节',
    short: '圣诞',
    month: 12,
    day: 25,
    before: 4,
    after: 1,
    icon: './assets/vfx_season_winter.webp?v=hd31',
    helperBase: 'cream_grid',
    stickers: ['snow', 'wreath', 'sparkle'],
    lines: ['圣诞快乐，袜子里藏了一颗小星星', '把今年最暖的一盏灯留给你', '雪落下来的时候，一起许个愿吧']
  },
  {
    id: 'spring',
    kind: 'season',
    name: '春樱季',
    short: '春樱',
    months: [3, 4, 5],
    icon: './assets/vfx_season_spring.webp?v=hd31',
    helperBase: 'sakura_wash',
    stickers: ['sakura', 'daisy', 'heart'],
    lines: ['樱花开了，第一片花瓣夹给你', '春风很轻，愿你的心情也轻轻的', '一起去窗边数花苞吧']
  },
  {
    id: 'summer',
    kind: 'season',
    name: '夏日季',
    short: '夏日',
    months: [6, 7, 8],
    icon: './assets/vfx_season_summer.webp?v=hd31',
    helperBase: 'mint_letter',
    stickers: ['chime', 'whale', 'sparkle'],
    lines: ['风铃叮当响，夏天也在想你', '收下这阵带着海盐味的晚风', '汽水和你，都是夏天的宝藏']
  },
  {
    id: 'autumn',
    kind: 'season',
    name: '秋枫季',
    short: '秋枫',
    months: [9, 10, 11],
    icon: './assets/vfx_season_autumn.webp?v=hd31',
    helperBase: 'cream_grid',
    stickers: ['maple', 'note', 'moon'],
    lines: ['枫叶落进手账，也落进想你的心里', '愿你每个傍晚都有热可可和晚霞', '谢谢你今天也来书桌旁陪我']
  },
  {
    id: 'winter',
    kind: 'season',
    name: '冬雪季',
    short: '冬雪',
    months: [12, 1, 2],
    icon: './assets/vfx_season_winter.webp?v=hd31',
    helperBase: 'mint_letter',
    stickers: ['snow', 'moon', 'heart'],
    lines: ['下雪啦，给你留了最软的那条围巾', '冬夜很长，晚安和好梦都送给你', '窗上的霜花，画的是我们俩']
  }
];
const CARD_OCCASION_BY_ID = Object.fromEntries(CARD_OCCASIONS.map((o) => [o.id, o]));
const CARD_ALBUM_MAX = 24;
const CARD_DAILY_REWARDS = 3;

function getLocalDayNumber(y, m, d) {
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}

// 按本地日期判定今天的贺卡主题：节日窗口（节前 before 天 ~ 节后 after 天）优先，否则按月份落到四季
function resolveCardOccasion(refDate = new Date()) {
  const d = refDate instanceof Date && !Number.isNaN(refDate.getTime()) ? refDate : new Date();
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const today = getLocalDayNumber(y, m, d.getDate());
  const dateKey = formatLocalDateKey(d);
  for (const occ of CARD_OCCASIONS) {
    if (occ.kind !== 'holiday') continue;
    for (const yy of [y - 1, y, y + 1]) {
      const diff = today - getLocalDayNumber(yy, occ.month, occ.day);
      if (diff >= -occ.before && diff <= occ.after) {
        return { occasion: occ, year: yy, diffDays: diff, dateKey };
      }
    }
  }
  const season = CARD_OCCASIONS.find((o) => o.kind === 'season' && o.months.includes(m)) || CARD_OCCASION_BY_ID.winter;
  return { occasion: season, year: season.id === 'winter' && m <= 2 ? y - 1 : y, diffDays: null, dateKey };
}

// 贺卡心意：每收集 1 种节日 / 季节贺卡（共 8 种），幸存者打工班次经验 +1.5%
function getGreetingCardBlessing() {
  const gc = player.greetingCards || {};
  const collected = gc.collected || {};
  const occasions = CARD_OCCASIONS.filter((o) => collected[o.id] > 0).length;
  const active = occasions >= 1;
  return {
    active,
    occasions,
    totalOccasions: CARD_OCCASIONS.length,
    albumCount: Array.isArray(gc.album) ? gc.album.length : 0,
    totalCards: Math.max(0, Number(gc.totalCards) || 0),
    shiftXpBonusPct: active ? Number((occasions * 0.015).toFixed(4)) : 0
  };
}

function getGreetingCardShiftXpMult() {
  const bless = getGreetingCardBlessing();
  return gameMode === 'survivor' && bless.active ? 1 + bless.shiftXpBonusPct : 1;
}

// AR-13 奶油手账周末野餐篮 & DeepSeek 娘手写日记本：规格常量、可注入时钟与统计 / 加成计算同样放在卡片 UI 区段之前声明，
// 周报 / 结算 / 胶囊在模块初始化期间调用时不会触发 TDZ
// 可注入时钟：周末判定（本地星期几）、野餐期待章与日记“今天”统一读这里，测试固定时间即可完全确定
const ar13Clock = {
  fixedMs: null,
  offsetMs: 0,
  now() {
    return this.fixedMs !== null ? this.fixedMs : Date.now() + this.offsetMs;
  },
  date() {
    return new Date(this.now());
  }
};

const AR13_WEEKDAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

const PICNIC_FOODS = [
  {
    id: 'sandwich',
    name: '野餐三明治',
    short: '三明治',
    img: './assets/picnic_sandwich.webp?v=hd31',
    spriteKey: 'picnicSandwich',
    fullness: 8,
    pickLine: '三明治切成小三角，最上面那块留给你~',
    eatLine: '啊呜——三明治夹着鸡蛋和生菜，在草地上吃格外香！'
  },
  {
    id: 'onigiri',
    name: '饭团三兄弟',
    short: '饭团',
    img: './assets/onigiri_trio.webp?v=hd31',
    spriteKey: 'onigiriTrio',
    fullness: 8,
    pickLine: '饭团捏得圆滚滚的，海苔要吃的时候再包~',
    eatLine: '海苔还是脆脆的！饭团三兄弟一人一个刚刚好~'
  },
  {
    id: 'macaron',
    name: '蓝鲸马卡龙',
    short: '马卡龙',
    img: './assets/pastry_whale_macaron.webp?v=hd31',
    spriteKey: 'pastryWhaleMacaron',
    fullness: 5,
    pickLine: '小蓝鲸马卡龙装进铁盒，不会被压扁~',
    eatLine: '小蓝鲸马卡龙咬一口是香草味的，甜甜的~'
  },
  {
    id: 'souffle',
    name: '草莓舒芙蕾',
    short: '舒芙蕾',
    img: './assets/pastry_souffle.webp?v=hd31',
    spriteKey: 'pastrySouffle',
    fullness: 5,
    pickLine: '舒芙蕾要轻轻放，它会害羞地塌下去~',
    eatLine: '舒芙蕾在风里轻轻晃，软乎乎的像云朵~'
  },
  {
    id: 'pudding',
    name: '焦糖布丁挞',
    short: '布丁挞',
    img: './assets/pastry_pudding_tart.webp?v=hd31',
    spriteKey: 'pastryPuddingTart',
    fullness: 6,
    pickLine: '焦糖布丁挞！脆壳要留到野餐垫上再敲开~',
    eatLine: '焦糖脆壳“咔”的一声，里面的布丁好香！'
  },
  {
    id: 'oolong',
    name: '蜜桃乌龙',
    short: '乌龙茶',
    img: './assets/tea_peach_oolong.webp?v=hd31',
    spriteKey: 'teaPeachOolong',
    fullness: 3,
    pickLine: '保温壶装满蜜桃乌龙，渴了就倒一杯~',
    eatLine: '保温壶里的蜜桃乌龙还是温温的，干杯~'
  }
];
const PICNIC_FOOD_BY_ID = Object.fromEntries(PICNIC_FOODS.map((f) => [f.id, f]));

// 三个野餐地点：各自对应一种幸存者班次佑护（野餐好心情），期待章越多佑护越强
const PICNIC_SPOTS = [
  {
    id: 'sakura_lawn',
    name: '樱花草坪',
    short: '草坪',
    icon: './assets/vfx_season_spring.webp?v=hd31',
    wardName: '花见好运',
    effect: 'coin',
    base: 0.08,
    pickLine: '樱花树下的草坪软软的，坐在这里刚刚好~',
    spreadLine: '在樱花草坪铺开野餐垫啦，花瓣落进了杯子里~'
  },
  {
    id: 'lakeside_willow',
    name: '湖畔柳荫',
    short: '湖畔',
    icon: './assets/vfx_season_summer.webp?v=hd31',
    wardName: '柳荫清风',
    effect: 'regen',
    base: 1.0,
    pickLine: '柳树荫下有湖风，吹得人想打个盹~',
    spreadLine: '湖畔柳荫铺好野餐垫啦，湖面一闪一闪的~'
  },
  {
    id: 'ginkgo_hill',
    name: '银杏小坡',
    short: '小坡',
    icon: './assets/vfx_season_autumn.webp?v=hd31',
    wardName: '暖阳活力',
    effect: 'haste',
    base: 0.06,
    pickLine: '小坡上晒得到太阳，银杏叶沙沙地响~',
    spreadLine: '银杏小坡铺好野餐垫啦，太阳暖洋洋的~'
  }
];
const PICNIC_SPOT_BY_ID = Object.fromEntries(PICNIC_SPOTS.map((s) => [s.id, s]));

const PICNIC_RULES = {
  minFoods: 2,
  maxFoods: 3,
  prepMax: 5,
  anticipationStep: 0.05,
  wardShiftsPerPicnic: 2,
  wardMaxCharges: 4,
  logMax: 12,
  baseCoins: 14,
  coinsPerAnticipation: 4,
  newSpotCoins: 10,
  baseXp: 16,
  xpPerFood: 3,
  xpPerAnticipation: 4,
  prepXp: 4
};

function isPicnicWeekend(d = ar13Clock.date()) {
  const w = d.getDay();
  return w === 0 || w === 6;
}

// 本周末的“周六”日期键：周一~周五指向即将到来的周六，周日指向昨天的周六（期待章按这个键归属到同一个周末）
function getPicnicWeekendKey(d = ar13Clock.date()) {
  const w = d.getDay();
  const off = w === 6 ? 0 : w === 0 ? -1 : 6 - w;
  return formatLocalDateKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() + off));
}

function getDaysUntilPicnicWeekend(d = ar13Clock.date()) {
  const w = d.getDay();
  return w === 0 || w === 6 ? 0 : 6 - w;
}

function getPicnicAnticipation(refDate = ar13Clock.date()) {
  const prep = (player.picnicBasket && player.picnicBasket.prep) || {};
  if (prep.used || prep.weekendKey !== getPicnicWeekendKey(refDate)) return 0;
  return Math.min(PICNIC_RULES.prepMax, Array.isArray(prep.days) ? prep.days.length : 0);
}

function getPicnicWardValues(spotId, anticipation = 0) {
  const spot = PICNIC_SPOT_BY_ID[spotId];
  if (!spot) return { coinPct: 0, regen: 0, hastePct: 0, mult: 1 };
  const mult = 1 + PICNIC_RULES.anticipationStep * Math.max(0, Math.min(PICNIC_RULES.prepMax, Math.round(Number(anticipation) || 0)));
  return {
    coinPct: spot.effect === 'coin' ? Number((spot.base * mult).toFixed(4)) : 0,
    regen: spot.effect === 'regen' ? Number((spot.base * mult).toFixed(2)) : 0,
    hastePct: spot.effect === 'haste' ? Number((spot.base * mult).toFixed(4)) : 0,
    mult: Number(mult.toFixed(2))
  };
}

function describePicnicWard(spotId, anticipation = 0) {
  const spot = PICNIC_SPOT_BY_ID[spotId];
  if (!spot) return '';
  const v = getPicnicWardValues(spotId, anticipation);
  if (spot.effect === 'coin') return `打工金币 +${(v.coinPct * 100).toFixed(1)}%`;
  if (spot.effect === 'regen') return `体力再生 +${v.regen.toFixed(2)}/秒`;
  return `攻速 +${(v.hastePct * 100).toFixed(1)}%`;
}

function describePicnicWardShort(spotId, anticipation = 0) {
  const spot = PICNIC_SPOT_BY_ID[spotId];
  if (!spot) return '';
  const v = getPicnicWardValues(spotId, anticipation);
  if (spot.effect === 'coin') return `金币+${Number((v.coinPct * 100).toFixed(1))}%`;
  if (spot.effect === 'regen') return `再生+${v.regen.toFixed(1)}/秒`;
  return `攻速+${Number((v.hastePct * 100).toFixed(1))}%`;
}

function getPicnicStats(refDate = ar13Clock.date()) {
  const pb = player.picnicBasket || {};
  const todayKey = formatLocalDateKey(refDate);
  const doneDates = Array.isArray(pb.doneDates) ? pb.doneDates : [];
  const prep = pb.prep || {};
  const weekendKey = getPicnicWeekendKey(refDate);
  const prepDays = prep.weekendKey === weekendKey && Array.isArray(prep.days) ? prep.days.length : 0;
  return {
    todayKey,
    weekday: refDate.getDay(),
    isWeekend: isPicnicWeekend(refDate),
    weekendKey,
    daysUntil: getDaysUntilPicnicWeekend(refDate),
    doneToday: doneDates.includes(todayKey),
    preppedToday: prep.weekendKey === weekendKey && Array.isArray(prep.days) && prep.days.includes(todayKey),
    prepDays,
    anticipation: getPicnicAnticipation(refDate),
    anticipationUsed: Boolean(prep.weekendKey === weekendKey && prep.used),
    hasPlan: Boolean(pb.plan),
    totalPicnics: Math.max(0, Number(pb.totalPicnics) || 0),
    totalPreps: Math.max(0, Number(pb.totalPreps) || 0),
    spotsVisited: PICNIC_SPOTS.filter((s) => pb.spotsVisited && pb.spotsVisited[s.id] > 0).length,
    totalSpots: PICNIC_SPOTS.length,
    wardCharges: Math.max(0, Number(pb.wardCharges) || 0),
    wardSpotId: PICNIC_SPOT_BY_ID[pb.wardSpotId] ? pb.wardSpotId : '',
    wardAnticipation: Math.max(0, Number(pb.wardAntic) || 0)
  };
}

// 野餐好心情：周末完成野餐后，接下来的幸存者班次（进入打工时消耗 1 次）按野餐地点获得佑护，仅打工模式生效
function getPicnicShiftWard() {
  const w = survivorRun.picnic;
  const active = Boolean(gameMode === 'survivor' && w && PICNIC_SPOT_BY_ID[w.spotId]);
  const spot = active ? PICNIC_SPOT_BY_ID[w.spotId] : null;
  return {
    active,
    spotId: active ? w.spotId : '',
    spotName: spot ? spot.name : '',
    wardName: spot ? spot.wardName : '',
    effect: spot ? spot.effect : '',
    coinPct: active ? w.coinPct : 0,
    regenPerSec: active ? w.regen : 0,
    hastePct: active ? w.hastePct : 0,
    anticipation: active ? w.antic : 0,
    chargesLeft: Math.max(0, Number(player.picnicBasket && player.picnicBasket.wardCharges) || 0)
  };
}

function getPicnicCoinMult() {
  const ward = getPicnicShiftWard();
  return ward.active ? 1 + (ward.coinPct || 0) : 1;
}

// 手写日记本：每天一页由她按当天真实互动（周报每日计数 + 野餐 / 小猫 / 贺卡等记录）自动写成
const DIARY_STICKERS = {
  diary: { name: '日记贴', img: './assets/diary_sticker.webp?v=hd31', spriteKey: 'diarySticker' },
  lace: { name: '蕾丝花边', img: './assets/sticker_lace_garland.webp?v=hd31', spriteKey: 'stickerLaceGarland' },
  daisy: { name: '雏菊干花', img: './assets/sticker_pressed_daisy.webp?v=hd31', spriteKey: 'stickerPressedDaisy' },
  whale: { name: '蓝鲸邮票', img: './assets/stamp_whale.webp?v=hd31', spriteKey: 'stampWhale' },
  heart: { name: '小爱心', img: './assets/vfx_heart.webp?v=hd6', spriteKey: 'vfxHeart' },
  sandwich: { name: '野餐三明治', img: './assets/picnic_sandwich.webp?v=hd31', spriteKey: 'picnicSandwich', counter: 'picnics' },
  kitten: { name: '窗台小猫', img: './assets/kitten_ginger.webp?v=hd31', spriteKey: 'kittenGinger', counter: 'kittens' },
  card: { name: '手作贺卡', img: './assets/handmade_card.webp?v=hd31', spriteKey: 'handmadeCard', counter: 'cards' },
  embroidery: { name: '刺绣布贴', img: './assets/embroidery_patch.webp?v=hd31', spriteKey: 'embroideryPatch', counter: 'embroideries' }
};
const DIARY_BASE_STICKERS = ['diary', 'lace', 'daisy', 'whale', 'heart'];
const DIARY_MEMORY_STICKERS = ['embroidery', 'sandwich', 'kitten', 'card'];
const DIARY_RULES = {
  stickerMax: 3,
  dailyRewards: 3,
  coinReward: 6,
  xpReward: 5,
  maxLines: 4,
  decorKeep: 40
};

// 日记行：AR-9 ~ AR-13 的新互动排在前面，其余周报计数随后；每页最多写 4 行，多出的记在页角
const DIARY_LINE_SPECS = [
  { key: 'embroideries', ico: './assets/embroidery_patch.webp?v=hd31' },
  { key: 'snacks', ico: './assets/roasted_snack.webp?v=hd31' },
  { key: 'stars', ico: './assets/constellation_card.webp?v=hd31' },
  { key: 'rains', ico: './assets/rain_chime.webp?v=hd31' },
  { key: 'potteries', ico: './assets/pottery_cup.webp?v=hd31' },
  { key: 'aromas', ico: './assets/aroma_bottle.webp?v=hd31' },
  { key: 'picnics', ico: './assets/picnic_sandwich.webp?v=hd31' },
  { key: 'picnicPreps', ico: './assets/ui_btn_picnic_basket.webp?v=hd31' },
  { key: 'cards', ico: './assets/handmade_card.webp?v=hd31' },
  { key: 'kittens', ico: './assets/kitten_ginger.webp?v=hd31' },
  { key: 'puzzles', ico: './assets/puzzle_piece_memory.webp?v=hd31' },
  { key: 'bentos', ico: './assets/bento_box_finished.webp?v=hd31' },
  { key: 'letters', ico: './assets/letter_envelope.webp?v=hd31' },
  { key: 'paints', ico: './assets/watercolor_palette.webp?v=hd31' },
  { key: 'stargazes', ico: './assets/star_chart_card.webp?v=hd31' },
  { key: 'presses', ico: './assets/pressed_sakura_bookmark.webp?v=hd31' },
  { key: 'knits', ico: './assets/ui_btn_crochet_basket.webp?v=hd31' },
  { key: 'cocoas', ico: './assets/ui_btn_cocoa_bar.webp?v=hd31' },
  { key: 'collages', ico: './assets/ui_btn_collage_frame.webp?v=hd31' },
  { key: 'radioMins', ico: './assets/ui_btn_cozy_radio.webp?v=hd31' },
  { key: 'plantCares', ico: './assets/ui_btn_terrarium.webp?v=hd31' },
  { key: 'sleepMins', ico: './assets/stamp_goodnight_moon.webp?v=hd31' },
  { key: 'teas', ico: './assets/ui_btn_teatime.webp?v=hd31' },
  { key: 'focusMins', ico: './assets/ui_btn_pomodoro.webp?v=hd31' },
  { key: 'shifts', ico: './assets/ui_badge_shift.webp?v=hd15' },
  { key: 'snaps', ico: './assets/ui_btn_camera.webp?v=hd6' },
  { key: 'chats', ico: './assets/ui_btn_chat.webp?v=hd17' },
  { key: 'feeds', ico: './assets/food_rice.webp?v=hd2' }
];
const DIARY_COUNTER_KEYS = DIARY_LINE_SPECS.map((s) => s.key);

function getJournalDayActivityTotal(day) {
  if (!day || typeof day !== 'object') return 0;
  return DIARY_COUNTER_KEYS.reduce((acc, k) => acc + Math.max(0, Number(day[k]) || 0), 0);
}

// 日记页列表：周报里有真实互动的日子（不含“未来”日期）+ 今天这一页（还空着也在，等她写）
function getDiaryPageKeys(todayKey = formatLocalDateKey(ar13Clock.date())) {
  const days = (player.weeklyJournal && player.weeklyJournal.days) || {};
  const keys = Object.keys(days).filter((k) => k <= todayKey && getJournalDayActivityTotal(days[k]) > 0);
  if (!keys.includes(todayKey)) keys.push(todayKey);
  return keys.sort();
}

function getDiaryStats(refDate = ar13Clock.date()) {
  const db = player.diaryBook || {};
  const todayKey = formatLocalDateKey(refDate);
  const days = (player.weeklyJournal && player.weeklyJournal.days) || {};
  const keys = getDiaryPageKeys(todayKey);
  const written = keys.filter((k) => getJournalDayActivityTotal(days[k]) > 0).length;
  const decor = db.decor || {};
  const decorated = Object.keys(decor).filter((k) => Array.isArray(decor[k]) && decor[k].length > 0).length;
  const todayTotal = getJournalDayActivityTotal(days[todayKey]);
  const seen = db.seen || {};
  const todayNew = todayTotal > 0 && (seen.dateKey !== todayKey || todayTotal > (Number(seen.total) || 0));
  return {
    todayKey,
    pages: keys.length,
    written,
    decorated,
    totalStickers: Math.max(0, Number(db.totalStickers) || 0),
    todayTotal,
    todayNew,
    rewardsToday: db.rewardDate === todayKey ? Math.max(0, Number(db.rewardCount) || 0) : 0,
    dailyRewards: DIARY_RULES.dailyRewards
  };
}

// AR-14 窗畔手作陶艺转盘 & 小小香氛调配台：规格常量、可注入时钟与统计 / 加成计算同样放在卡片 UI 区段之前声明，
// 周报 / 日记 / 结算 / 胶囊在模块初始化期间调用时不会触发 TDZ
// 可注入时钟：香氛季节（本地日期）、点香剩余时间、陶艺每日奖励统一读这里，测试固定时间即可完全确定
const ar14Clock = {
  fixedMs: null,
  offsetMs: 0,
  now() {
    return this.fixedMs !== null ? this.fixedMs : Date.now() + this.offsetMs;
  },
  date() {
    return new Date(this.now());
  }
};

// 两种器型：小茶杯拉坯 3 圈、佑护 2 个班次；小花瓶拉坯 4 圈、佑护 1 个班次但效果 ×1.5
const POTTERY_SHAPES = [
  {
    id: 'cup',
    name: '手捏小茶杯',
    short: '茶杯',
    img: './assets/pottery_cup.webp?v=hd31',
    spriteKey: 'potteryCup',
    taps: 3,
    charges: 2,
    mult: 1,
    pickLine: '先做一只小茶杯吧，杯口要捏得圆圆的~',
    doneLine: '小茶杯出窑啦，杯口圆圆的，装蜜桃乌龙刚刚好~'
  },
  {
    id: 'vase',
    name: '窗畔小花瓶',
    short: '花瓶',
    img: './assets/pottery_vase.webp?v=hd31',
    spriteKey: 'potteryVase',
    taps: 4,
    charges: 1,
    mult: 1.5,
    pickLine: '做个小花瓶！瓶颈要慢慢收细，手要稳稳的~',
    doneLine: '小花瓶出窑啦，插一枝窗边的小花正好~'
  }
];
const POTTERY_SHAPE_BY_ID = Object.fromEntries(POTTERY_SHAPES.map((s) => [s.id, s]));

// 三种釉色：各对应一种幸存者班次陶艺佑护（奶白减伤 / 樱粉金币 / 青瓷宝石磁吸），陶艺图鉴收集越全佑护越强
const POTTERY_GLAZES = [
  {
    id: 'cream',
    name: '奶白釉',
    short: '奶白',
    color: '#fbf3e2',
    rgb: '250, 238, 214',
    effect: 'guard',
    base: 0.06,
    wardName: '奶白安心',
    line: '奶白釉像热牛奶一样，柔柔地裹住杯身~'
  },
  {
    id: 'sakura',
    name: '樱粉釉',
    short: '樱粉',
    color: '#f8d8de',
    rgb: '248, 210, 220',
    effect: 'coin',
    base: 0.08,
    wardName: '樱粉好运',
    line: '樱粉釉！像春天的花瓣落在杯沿上~'
  },
  {
    id: 'celadon',
    name: '青瓷釉',
    short: '青瓷',
    color: '#d6ecdf',
    rgb: '206, 232, 218',
    effect: 'magnet',
    base: 0.15,
    wardName: '青瓷聚宝',
    line: '青瓷釉清清凉凉的，像雨后的窗玻璃~'
  }
];
const POTTERY_GLAZE_BY_ID = Object.fromEntries(POTTERY_GLAZES.map((g) => [g.id, g]));

const POTTERY_RULES = {
  fireSec: 1.6,
  wardMaxCharges: 3,
  shelfShow: 4,
  shelfCardShow: 6,
  logMax: 12,
  dailyRewards: 3,
  coinReward: 10,
  newComboCoins: 8,
  xpReward: 12,
  comboStep: 0.04,
  totalCombos: POTTERY_SHAPES.length * POTTERY_GLAZES.length
};

function getPotteryComboCount() {
  const combos = (player.potteryWheel && player.potteryWheel.combos) || {};
  let n = 0;
  for (const sh of POTTERY_SHAPES) {
    for (const gl of POTTERY_GLAZES) {
      if (Number(combos[`${sh.id}_${gl.id}`]) > 0) n += 1;
    }
  }
  return n;
}

function getPotteryWardValues(glazeId, shapeId, combos = getPotteryComboCount()) {
  const glaze = POTTERY_GLAZE_BY_ID[glazeId];
  const shape = POTTERY_SHAPE_BY_ID[shapeId];
  if (!glaze || !shape) return { guardPct: 0, coinPct: 0, magnetPct: 0, mult: 1, value: 0 };
  const c = Math.max(0, Math.min(POTTERY_RULES.totalCombos, Math.round(Number(combos) || 0)));
  const mult = shape.mult * (1 + POTTERY_RULES.comboStep * c);
  const value = Number((glaze.base * mult).toFixed(4));
  return {
    guardPct: glaze.effect === 'guard' ? value : 0,
    coinPct: glaze.effect === 'coin' ? value : 0,
    magnetPct: glaze.effect === 'magnet' ? value : 0,
    mult: Number(mult.toFixed(4)),
    value
  };
}

function describePotteryWard(glazeId, shapeId, combos = getPotteryComboCount()) {
  const glaze = POTTERY_GLAZE_BY_ID[glazeId];
  if (!glaze || !POTTERY_SHAPE_BY_ID[shapeId]) return '';
  const v = getPotteryWardValues(glazeId, shapeId, combos);
  if (glaze.effect === 'guard') return `打工减伤 +${(v.guardPct * 100).toFixed(1)}%`;
  if (glaze.effect === 'coin') return `打工金币 +${(v.coinPct * 100).toFixed(1)}%`;
  return `宝石磁吸 +${(v.magnetPct * 100).toFixed(1)}%`;
}

function describePotteryWardShort(glazeId, shapeId, combos = getPotteryComboCount()) {
  const glaze = POTTERY_GLAZE_BY_ID[glazeId];
  if (!glaze || !POTTERY_SHAPE_BY_ID[shapeId]) return '';
  const v = getPotteryWardValues(glazeId, shapeId, combos);
  if (glaze.effect === 'guard') return `减伤+${Number((v.guardPct * 100).toFixed(1))}%`;
  if (glaze.effect === 'coin') return `金币+${Number((v.coinPct * 100).toFixed(1))}%`;
  return `磁吸+${Number((v.magnetPct * 100).toFixed(1))}%`;
}

function getPotteryStats(refDate = ar14Clock.date()) {
  const pw = player.potteryWheel || {};
  const todayKey = formatLocalDateKey(refDate);
  const pieces = Array.isArray(pw.pieces) ? pw.pieces : [];
  const last = pieces.length ? pieces[pieces.length - 1] : null;
  return {
    todayKey,
    shelfCount: pieces.length,
    totalPieces: Math.max(pieces.length, Number(pw.totalPieces) || 0),
    combos: getPotteryComboCount(),
    totalCombos: POTTERY_RULES.totalCombos,
    madeToday: pieces.filter((e) => e.date === todayKey).length,
    rewardsToday: pw.rewardDate === todayKey ? Math.max(0, Number(pw.rewardCount) || 0) : 0,
    dailyRewards: POTTERY_RULES.dailyRewards,
    wardCharges: Math.max(0, Number(pw.wardCharges) || 0),
    wardGlazeId: POTTERY_GLAZE_BY_ID[pw.wardGlazeId] ? pw.wardGlazeId : '',
    wardShapeId: POTTERY_SHAPE_BY_ID[pw.wardShapeId] ? pw.wardShapeId : '',
    totalWardShifts: Math.max(0, Number(pw.totalWardShifts) || 0),
    latest: last ? { ...last } : null
  };
}

// 陶艺佑护：烧好陶器后，接下来的幸存者班次（进入打工时消耗 1 次）按釉色获得佑护，仅打工模式生效
function getPotteryShiftWard() {
  const w = survivorRun.pottery;
  const active = Boolean(gameMode === 'survivor' && w && POTTERY_GLAZE_BY_ID[w.glazeId] && POTTERY_SHAPE_BY_ID[w.shapeId]);
  const glaze = active ? POTTERY_GLAZE_BY_ID[w.glazeId] : null;
  const shape = active ? POTTERY_SHAPE_BY_ID[w.shapeId] : null;
  return {
    active,
    glazeId: active ? w.glazeId : '',
    shapeId: active ? w.shapeId : '',
    glazeName: glaze ? glaze.name : '',
    shapeName: shape ? shape.name : '',
    wardName: glaze ? glaze.wardName : '',
    effect: glaze ? glaze.effect : '',
    guardPct: active ? w.guardPct : 0,
    coinPct: active ? w.coinPct : 0,
    magnetPct: active ? w.magnetPct : 0,
    combos: active ? w.combos : 0,
    chargesLeft: Math.max(0, Number(player.potteryWheel && player.potteryWheel.wardCharges) || 0)
  };
}

function getPotteryCoinMult() {
  const ward = getPotteryShiftWard();
  return ward.active ? 1 + (ward.coinPct || 0) : 1;
}

function getPotteryMagnetMult() {
  const ward = getPotteryShiftWard();
  return ward.active ? 1 + (ward.magnetPct || 0) : 1;
}

function getPotteryDamageMult() {
  const ward = getPotteryShiftWard();
  return ward.active ? Math.max(0.6, 1 - (ward.guardPct || 0)) : 1;
}

// 小小香氛调配台：季节基调按本地日期（可注入时钟）决定，心情心调由主人挑选，5 种心情 × 4 季 = 20 款香氛图鉴
const AROMA_SEASONS = {
  spring: { id: 'spring', name: '春', note: '樱花白茶', icon: './assets/vfx_season_spring.webp?v=hd31', rgb: '255, 228, 236' },
  summer: { id: 'summer', name: '夏', note: '青柠海盐', icon: './assets/vfx_season_summer.webp?v=hd31', rgb: '222, 242, 246' },
  autumn: { id: 'autumn', name: '秋', note: '桂花木质', icon: './assets/vfx_season_autumn.webp?v=hd31', rgb: '252, 232, 198' },
  winter: { id: 'winter', name: '冬', note: '雪松香草', icon: './assets/vfx_season_winter.webp?v=hd31', rgb: '236, 238, 250' }
};
const AROMA_SEASON_IDS = ['spring', 'summer', 'autumn', 'winter'];

const AROMA_MOODS = [
  {
    id: 'bliss',
    name: '甜心',
    note: '蜜桃奶霜',
    img: './assets/ui_mood_blush.webp?v=hd31',
    rgb: '255, 218, 206',
    kelvin: 3200,
    tone: '暖桃',
    line: '甜甜的蜜桃奶霜，闻起来像被抱了一下~'
  },
  {
    id: 'focus',
    name: '专注',
    note: '薄荷柠檬草',
    img: './assets/ui_stamp_focus.webp?v=hd31',
    rgb: '226, 244, 234',
    kelvin: 5000,
    tone: '清新',
    line: '薄荷柠檬草清清爽爽的，主人敲代码也不会犯困~'
  },
  {
    id: 'cozy',
    name: '茶歇',
    note: '焦糖肉桂',
    img: './assets/ui_btn_teatime.webp?v=hd31',
    rgb: '255, 228, 192',
    kelvin: 2900,
    tone: '琥珀',
    line: '焦糖肉桂暖暖的，像刚出炉的小点心~'
  },
  {
    id: 'star',
    name: '星梦',
    note: '鸢尾白麝香',
    img: './assets/ui_pin_star.webp?v=hd31',
    rgb: '232, 232, 250',
    kelvin: 4400,
    tone: '月光',
    line: '鸢尾和白麝香，像窗外的星星落进房间~'
  },
  {
    id: 'goodnight',
    name: '好梦',
    note: '薰衣草',
    img: './assets/stamp_goodnight_moon.webp?v=hd31',
    rgb: '238, 228, 248',
    kelvin: 3500,
    tone: '薰衣草',
    line: '薰衣草软软的，今晚一定能睡个好觉~'
  }
];
const AROMA_MOOD_BY_ID = Object.fromEntries(AROMA_MOODS.map((m) => [m.id, m]));

const AROMA_RULES = {
  drops: 3,
  durationMin: 30,
  dailyRewards: 3,
  coinReward: 6,
  xpReward: 6,
  newRecipeCoins: 10,
  affectionBonus: 0.1,
  totalRecipes: AROMA_SEASON_IDS.length * AROMA_MOODS.length
};

function getAromaSeasonId(d = ar14Clock.date()) {
  const m = d.getMonth() + 1;
  if (m >= 3 && m <= 5) return 'spring';
  if (m >= 6 && m <= 8) return 'summer';
  if (m >= 9 && m <= 11) return 'autumn';
  return 'winter';
}

function getAromaRecipe(seasonId, moodId) {
  const season = AROMA_SEASONS[seasonId];
  const mood = AROMA_MOOD_BY_ID[moodId];
  if (!season || !mood) return null;
  return {
    id: `${season.id}_${mood.id}`,
    name: `${season.note} · ${mood.note}`,
    seasonId: season.id,
    moodId: mood.id,
    seasonName: season.name,
    moodName: mood.name,
    kelvin: mood.kelvin,
    tone: mood.tone,
    moodRgb: mood.rgb,
    seasonRgb: season.rgb
  };
}

// 点香中的香氛（按可注入时钟判断是否已散）：返回配方 + 剩余分钟
function getActiveAroma(nowMs = ar14Clock.now()) {
  const a = player.aromaTable && player.aromaTable.active;
  if (!a || !(Number(a.endMs) > nowMs)) return null;
  const recipe = getAromaRecipe(a.seasonId, a.moodId);
  if (!recipe) return null;
  const leftMs = Math.min(AROMA_RULES.durationMin * 60000, Number(a.endMs) - nowMs);
  return { ...recipe, startMs: a.startMs, endMs: a.endMs, leftMs, minsLeft: Math.max(1, Math.ceil(leftMs / 60000)) };
}

// 香氛舒心：点香期间，日常养成模式里的亲密度收获 +10%
function getAromaAffectionMult() {
  return gameMode === 'pet' && getActiveAroma() ? 1 + AROMA_RULES.affectionBonus : 1;
}

function getAromaStats(refDate = ar14Clock.date()) {
  const at = player.aromaTable || {};
  const todayKey = formatLocalDateKey(refDate);
  const seasonId = getAromaSeasonId(refDate);
  const disc = at.discovered || {};
  const found = Object.keys(disc).filter((k) => Number(disc[k]) > 0);
  return {
    todayKey,
    seasonId,
    discovered: found.length,
    totalRecipes: AROMA_RULES.totalRecipes,
    seasonFound: AROMA_MOODS.filter((m) => Number(disc[`${seasonId}_${m.id}`]) > 0).length,
    totalBlends: Math.max(0, Number(at.totalBlends) || 0),
    rewardsToday: at.rewardDate === todayKey ? Math.max(0, Number(at.rewardCount) || 0) : 0,
    dailyRewards: AROMA_RULES.dailyRewards,
    active: getActiveAroma(refDate.getTime())
  };
}

// AR-15 卧室星空投影灯 & 窗边听雨角：规格常量、可注入时钟、运行时状态与统计 / 加成计算同样放在卡片 UI 区段之前声明，
// 周报 / 日记 / 晚安结算 / 亲密度倍率 / 胶囊在模块初始化期间调用时不会触发 TDZ
// 可注入时钟：星座卡当季（本地日期）、睡前时段、投影剩余时间、听雨的本地天气时段与小记计时统一读这里，测试固定时间即可完全确定
const ar15Clock = {
  fixedMs: null,
  offsetMs: 0,
  now() {
    return this.fixedMs !== null ? this.fixedMs : Date.now() + this.offsetMs;
  },
  date() {
    return new Date(this.now());
  }
};

// 8 张星座卡：每季 2 张（按本地日期取当季可投影的两张，已收集的星座卡任何季节都能再投）；
// taps = 转动投影罩要对准的亮星数，stars = 投到天花板上的星位（星光层百分比坐标），rgb 只用浅奶油色
const STAR_CARDS = [
  {
    id: 'leo',
    name: '狮子座',
    short: '狮子',
    season: 'spring',
    taps: 5,
    rgb: '255, 236, 204',
    starNames: ['轩辕十四', '轩辕十二', '轩辕十三', '西次相', '五帝座一'],
    stars: [{ x: 16, y: 34 }, { x: 30, y: 18 }, { x: 46, y: 24 }, { x: 64, y: 50 }, { x: 86, y: 58 }],
    story: '春夜的狮子座伸了个懒腰，镰刀形的鬃毛里藏着轩辕十四~'
  },
  {
    id: 'bootes',
    name: '牧夫座',
    short: '牧夫',
    season: 'spring',
    taps: 4,
    rgb: '255, 228, 214',
    starNames: ['大角星', '招摇', '七公七', '梗河一'],
    stars: [{ x: 50, y: 86 }, { x: 34, y: 46 }, { x: 52, y: 12 }, { x: 68, y: 44 }],
    story: '牧夫座提着风筝形的灯笼，大角星暖暖的橘光照着回家的路~'
  },
  {
    id: 'scorpius',
    name: '天蝎座',
    short: '天蝎',
    season: 'summer',
    taps: 6,
    rgb: '255, 226, 220',
    starNames: ['房宿四', '心宿一', '心宿二', '心宿三', '尾宿五', '尾宿八'],
    stars: [{ x: 14, y: 18 }, { x: 28, y: 32 }, { x: 40, y: 44 }, { x: 52, y: 60 }, { x: 66, y: 80 }, { x: 84, y: 70 }],
    story: '夏夜的天蝎座弯着尾巴，心宿二像一盏小小的红灯笼~'
  },
  {
    id: 'aquila',
    name: '天鹰座',
    short: '天鹰',
    season: 'summer',
    taps: 4,
    rgb: '228, 238, 252',
    starNames: ['河鼓一', '河鼓二', '河鼓三', '吴越'],
    stars: [{ x: 22, y: 60 }, { x: 50, y: 44 }, { x: 78, y: 30 }, { x: 50, y: 84 }],
    story: '天鹰座展开翅膀，河鼓二（牛郎星）正隔着银河眨眼睛~'
  },
  {
    id: 'pegasus',
    name: '飞马座',
    short: '飞马',
    season: 'autumn',
    taps: 4,
    rgb: '236, 234, 252',
    starNames: ['室宿一', '室宿二', '壁宿一', '壁宿二'],
    stars: [{ x: 26, y: 70 }, { x: 28, y: 26 }, { x: 72, y: 72 }, { x: 70, y: 24 }],
    story: '秋夜的飞马座驮着一个大大的四边形，像星空里的一扇窗~'
  },
  {
    id: 'andromeda',
    name: '仙女座',
    short: '仙女',
    season: 'autumn',
    taps: 5,
    rgb: '250, 230, 244',
    starNames: ['壁宿二', '奎宿五', '奎宿九', '天大将军一', '仙女座大星云'],
    stars: [{ x: 12, y: 72 }, { x: 32, y: 58 }, { x: 50, y: 46 }, { x: 70, y: 34 }, { x: 88, y: 20 }],
    story: '仙女座的裙摆里藏着一团朦胧的星云，那是遥远的另一个银河哦~'
  },
  {
    id: 'gemini',
    name: '双子座',
    short: '双子',
    season: 'winter',
    taps: 5,
    rgb: '232, 240, 252',
    starNames: ['北河二', '北河三', '井宿五', '井宿三', '井宿一'],
    stars: [{ x: 30, y: 14 }, { x: 62, y: 12 }, { x: 34, y: 52 }, { x: 62, y: 50 }, { x: 46, y: 86 }],
    story: '冬夜的双子座手牵着手，北河二和北河三一起守着好梦~'
  },
  {
    id: 'canis_major',
    name: '大犬座',
    short: '大犬',
    season: 'winter',
    taps: 4,
    rgb: '240, 236, 255',
    starNames: ['天狼星', '军市一', '弧矢一', '弧矢七'],
    stars: [{ x: 46, y: 16 }, { x: 24, y: 30 }, { x: 58, y: 50 }, { x: 70, y: 82 }],
    story: '大犬座的天狼星是夜空最亮的星，像一只守夜的小狗~'
  }
];
const STAR_CARD_BY_ID = Object.fromEntries(STAR_CARDS.map((c) => [c.id, c]));
const STAR_SEASON_NAMES = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' };

const STAR_RULES = {
  durationMin: 20,
  dailyRewards: 2,
  coinReward: 8,
  xpReward: 8,
  newCardCoins: 12,
  bedtimeStartHour: 20,
  bedtimeEndHour: 2,
  bedtimeMult: 1.5,
  dreamDailyMax: 1,
  dreamCoins: 15,
  dreamXp: 10,
  goodnightBonus: 0.2,
  totalCards: STAR_CARDS.length
};

// 睡前时段：本地 20:00 ~ 次日 02:00（可注入时钟），这时点亮的投影奖励 ×1.5
function isStarBedtime(d = ar15Clock.date()) {
  const h = d.getHours();
  return h >= STAR_RULES.bedtimeStartHour || h < STAR_RULES.bedtimeEndHour;
}

function getStarSeasonCards(seasonId = getAromaSeasonId(ar15Clock.date())) {
  return STAR_CARDS.filter((c) => c.season === seasonId);
}

// 投影中的星座（按可注入时钟判断是否已熄灭）：返回星座卡 + 剩余分钟
function getActiveProjection(nowMs = ar15Clock.now()) {
  const a = player.starProjector && player.starProjector.active;
  if (!a || !(Number(a.endMs) > nowMs)) return null;
  const card = STAR_CARD_BY_ID[a.cardId];
  if (!card) return null;
  const leftMs = Math.min(STAR_RULES.durationMin * 60000, Number(a.endMs) - nowMs);
  return {
    cardId: card.id,
    name: card.name,
    short: card.short,
    rgb: card.rgb,
    story: card.story,
    startMs: a.startMs,
    endMs: a.endMs,
    leftMs,
    minsLeft: Math.max(1, Math.ceil(leftMs / 60000))
  };
}

function getStarStats(refDate = ar15Clock.date()) {
  const sp = player.starProjector || {};
  const todayKey = formatLocalDateKey(refDate);
  const cards = sp.cards || {};
  const seasonId = getAromaSeasonId(refDate);
  const collectedIds = STAR_CARDS.filter((c) => Number(cards[c.id] && cards[c.id].lights) > 0).map((c) => c.id);
  return {
    todayKey,
    seasonId,
    seasonCards: getStarSeasonCards(seasonId).map((c) => c.id),
    collected: collectedIds.length,
    collectedIds,
    totalCards: STAR_RULES.totalCards,
    totalLights: Math.max(0, Number(sp.totalLights) || 0),
    totalDreams: Math.max(0, Number(sp.totalDreams) || 0),
    rewardsToday: sp.rewardDate === todayKey ? Math.max(0, Number(sp.rewardCount) || 0) : 0,
    dailyRewards: STAR_RULES.dailyRewards,
    dreamsToday: sp.dreamDate === todayKey ? Math.max(0, Number(sp.dreamCount) || 0) : 0,
    bedtime: isStarBedtime(refDate),
    active: getActiveProjection(refDate.getTime())
  };
}

// 晚安联动：投影点亮期间完成晚安伴眠，好梦章金币 +20%
function getStarGoodnightMult() {
  return getActiveProjection() ? 1 + STAR_RULES.goodnightBonus : 1;
}

// 窗边听雨角：不联网、不读传感器 —— 按本地日期 + 时段确定性轮换“窗外天气”，白噪音跟着窗外天气走
const RAIN_SEGMENTS = [
  { id: 'dawn', name: '清晨', from: 5, to: 10, next: '10:00' },
  { id: 'day', name: '午后', from: 10, to: 16, next: '16:00' },
  { id: 'dusk', name: '傍晚', from: 16, to: 20, next: '20:00' },
  { id: 'night', name: '夜里', from: 20, to: 5, next: '05:00' }
];
const RAIN_SEGMENT_BY_ID = Object.fromEntries(RAIN_SEGMENTS.map((s) => [s.id, s]));

const RAIN_WEATHERS = [
  {
    id: 'drizzle',
    name: '绵绵细雨',
    short: '细雨',
    icon: './assets/watercolor_rainy_window.webp?v=hd31',
    rgb: '236, 242, 246',
    mix: '细雨沙沙 · 偶尔檐滴',
    line: '绵绵细雨沙沙沙的，像谁在窗外轻轻翻书~'
  },
  {
    id: 'eaves',
    name: '屋檐滴答',
    short: '檐滴',
    icon: './assets/rain_chime.webp?v=hd31',
    rgb: '242, 238, 230',
    mix: '檐下滴答 · 轻雨垫底',
    line: '屋檐的雨滴一颗一颗落下来，滴答、滴答~'
  },
  {
    id: 'shower',
    name: '窗边阵雨',
    short: '阵雨',
    icon: './assets/watercolor_rainy_window.webp?v=hd31',
    rgb: '232, 238, 246',
    mix: '阵雨哗哗 · 雨打窗',
    line: '阵雨哗啦啦地敲着窗，我们躲在窗边刚刚好~'
  },
  {
    id: 'thunder',
    name: '远雷细雨',
    short: '远雷',
    icon: './assets/rain_cushion.webp?v=hd31',
    rgb: '236, 236, 244',
    mix: '细雨 · 很远很远的闷雷',
    line: '远远的雷声咕噜咕噜的，别怕，我抱着坐垫陪你~'
  },
  {
    id: 'breeze',
    name: '雨后微风',
    short: '微风',
    icon: './assets/vfx_season_summer.webp?v=hd31',
    rgb: '238, 246, 240',
    mix: '雨后微风 · 风铃叮当',
    line: '雨停啦，风铃被微风吹得叮叮当当~'
  }
];
const RAIN_WEATHER_BY_ID = Object.fromEntries(RAIN_WEATHERS.map((w) => [w.id, w]));

const RAIN_VOLUMES = [
  { id: 'soft', name: '轻', mult: 0.6 },
  { id: 'mid', name: '中', mult: 1 },
  { id: 'deep', name: '浓', mult: 1.4 }
];
const RAIN_VOLUME_BY_ID = Object.fromEntries(RAIN_VOLUMES.map((v) => [v.id, v]));

const RAIN_RULES = {
  noteMin: 5,
  dailyNotes: 4,
  coinReward: 5,
  xpReward: 4,
  newEntryCoins: 8,
  calmBonus: 0.05,
  maxSessionMin: 60,
  totalEntries: RAIN_SEGMENTS.length * RAIN_WEATHERS.length
};

function getRainSegment(d = ar15Clock.date()) {
  const h = d.getHours();
  if (h >= 5 && h < 10) return RAIN_SEGMENTS[0];
  if (h >= 10 && h < 16) return RAIN_SEGMENTS[1];
  if (h >= 16 && h < 20) return RAIN_SEGMENTS[2];
  return RAIN_SEGMENTS[3];
}

// 确定性天气轮换：同一本地日期同一时段永远是同一种天气；四个时段互不相同，隔天整体再错开
function getRainWeather(d = ar15Clock.date()) {
  const seg = getRainSegment(d);
  const segIdx = RAIN_SEGMENTS.indexOf(seg);
  const n = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  const weather = RAIN_WEATHERS[(n * 7 + segIdx * 3) % RAIN_WEATHERS.length];
  return { ...weather, segId: seg.id, segName: seg.name, next: seg.next, entryKey: `${seg.id}_${weather.id}` };
}

// 运行时状态：是否正在听雨 / 本次听雨计时（按可注入时钟累计，满 5 分钟记一则听雨小记）
const rainRun = {
  listening: false,
  weatherId: '',
  lastTickMs: 0,
  accMs: 0,
  sessionMs: 0,
  sessionNotes: 0,
  ring: 0,
  ringSeq: 0,
  helperSeq: 0,
  tickAcc: 0,
  dayKey: '',
  lastAction: '',
  lastResult: null
};

// 运行时状态：当前挑的星座卡 / 转动投影罩对准了几颗星（pick → dial → lit）
const starRun = {
  cardId: '',
  taps: 0,
  phase: 'pick',
  spinFlash: 0,
  helperSeq: 0,
  wasActive: false,
  lastAction: '',
  lastResult: null,
  lastDream: null
};

function getRainStats(refDate = ar15Clock.date()) {
  const rc = player.rainCorner || {};
  const todayKey = formatLocalDateKey(refDate);
  const entries = rc.entries || {};
  const weather = getRainWeather(refDate);
  const found = Object.keys(entries).filter((k) => Number(entries[k]) > 0);
  return {
    todayKey,
    weather,
    segId: weather.segId,
    entries: found.length,
    totalEntries: RAIN_RULES.totalEntries,
    segFound: RAIN_WEATHERS.filter((w) => Number(entries[`${weather.segId}_${w.id}`]) > 0).length,
    totalNotes: Math.max(0, Number(rc.totalNotes) || 0),
    totalMins: Math.max(0, Number(rc.totalMins) || 0),
    rewardsToday: rc.rewardDate === todayKey ? Math.max(0, Number(rc.rewardCount) || 0) : 0,
    dailyNotes: RAIN_RULES.dailyNotes,
    listening: Boolean(rainRun.listening),
    sessionMins: Math.floor((rainRun.sessionMs || 0) / 60000),
    nextNoteMs: rainRun.listening ? Math.max(0, RAIN_RULES.noteMin * 60000 - (rainRun.accMs || 0)) : RAIN_RULES.noteMin * 60000
  };
}

// 听雨安神：日常养成模式里一边听雨，亲密度收获 +5%
function getRainCalmMult() {
  return gameMode === 'pet' && rainRun.listening ? 1 + RAIN_RULES.calmBonus : 1;
}

// AR-16 墙面刺绣绷架 & 地板小暖炉冬日角：规格常量、可注入时钟、运行时状态与统计 / 加成计算同样放在卡片 UI 区段之前声明，
// 周报 / 日记 / 亲密度倍率 / 胶囊在模块初始化期间调用时不会触发 TDZ
// 可注入时钟：当季绣样（本地日期）、暖炉火力（本地月份 + 时段）、依偎 / 小火剩余时间与每日奖励统一读这里，测试固定时间即可完全确定
const ar16Clock = {
  fixedMs: null,
  offsetMs: 0,
  now() {
    return this.fixedMs !== null ? this.fixedMs : Date.now() + this.offsetMs;
  },
  date() {
    return new Date(this.now());
  }
};

// 8 款季节绣样：每季 2 款（按本地日期取当季可绣的两款，已绣过的绣样任何季节都能再绣）；
// taps = 你要绣的针数（你绣一针、她接一针，一共 taps × 2 针），bestThread = 最搭的绣线（配色灵感 +4 金币），rgb 只用浅奶油色
const EMBROIDERY_PATTERNS = [
  {
    id: 'sakura',
    name: '樱花枝',
    short: '樱花',
    season: 'spring',
    taps: 4,
    bestThread: 'pink',
    rgb: '255, 230, 238',
    story: '一枝樱花斜斜地开在绷布上，像窗外刚刚飘进来的春天~'
  },
  {
    id: 'daisy',
    name: '小雏菊',
    short: '雏菊',
    season: 'spring',
    taps: 3,
    bestThread: 'cream',
    rgb: '255, 246, 216',
    story: '圆圆的小雏菊绣好啦，白白的花瓣围着暖黄的花心~'
  },
  {
    id: 'whale',
    name: '小蓝鲸',
    short: '蓝鲸',
    season: 'summer',
    taps: 4,
    bestThread: 'mist',
    rgb: '228, 238, 250',
    story: '一只小蓝鲸游上了绷布，尾巴还甩起一小朵浪花~'
  },
  {
    id: 'lemon',
    name: '柠檬片',
    short: '柠檬',
    season: 'summer',
    taps: 3,
    bestThread: 'sage',
    rgb: '250, 246, 214',
    story: '清清爽爽的柠檬片，看着就像喝到了一口夏天的汽水~'
  },
  {
    id: 'ginkgo',
    name: '银杏叶',
    short: '银杏',
    season: 'autumn',
    taps: 3,
    bestThread: 'cream',
    rgb: '252, 240, 204',
    story: '小扇子一样的银杏叶，把秋天的阳光都绣进去了~'
  },
  {
    id: 'maple',
    name: '小枫叶',
    short: '枫叶',
    season: 'autumn',
    taps: 4,
    bestThread: 'pink',
    rgb: '255, 230, 218',
    story: '一片暖暖的小枫叶，挂在墙上就像秋天没有走~'
  },
  {
    id: 'snowflake',
    name: '小雪花',
    short: '雪花',
    season: 'winter',
    taps: 4,
    bestThread: 'mist',
    rgb: '236, 242, 252',
    story: '六个角的小雪花，一针一针绣出来，一点都不冷~'
  },
  {
    id: 'mitten',
    name: '毛线手套',
    short: '手套',
    season: 'winter',
    taps: 3,
    bestThread: 'sage',
    rgb: '234, 244, 232',
    story: '一只软乎乎的毛线手套，另一只等明天再绣给你~'
  }
];
const EMBROIDERY_PATTERN_BY_ID = Object.fromEntries(EMBROIDERY_PATTERNS.map((p) => [p.id, p]));
const EMBROIDERY_SEASON_NAMES = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' };

// 4 种绣线：只用浅奶油色系
const EMBROIDERY_THREADS = [
  { id: 'cream', name: '奶油白', short: '奶油', rgb: '255, 248, 232' },
  { id: 'pink', name: '樱粉线', short: '樱粉', rgb: '255, 228, 236' },
  { id: 'sage', name: '鼠尾草绿', short: '草绿', rgb: '230, 242, 228' },
  { id: 'mist', name: '雾蓝线', short: '雾蓝', rgb: '228, 238, 250' }
];
const EMBROIDERY_THREAD_BY_ID = Object.fromEntries(EMBROIDERY_THREADS.map((t) => [t.id, t]));

const EMBROIDERY_RULES = {
  dailyRewards: 2,
  coinReward: 8,
  xpReward: 6,
  newPatternCoins: 10,
  bestThreadCoins: 4,
  wallMax: 4,
  totalPatterns: EMBROIDERY_PATTERNS.length
};

function getEmbroiderySeasonPatterns(seasonId = getAromaSeasonId(ar16Clock.date())) {
  return EMBROIDERY_PATTERNS.filter((p) => p.season === seasonId);
}

// 运行时状态：当前挑的绣样 / 绣线 / 你绣了几针（pick → stitch → done），不入存档
const embroideryRun = {
  patternId: '',
  threadId: '',
  taps: 0,
  phase: 'pick',
  flash: 0,
  helperSeq: 0,
  lastAction: '',
  lastResult: null
};

function getEmbroideryStats(refDate = ar16Clock.date()) {
  const eh = player.embroideryHoop || {};
  const todayKey = formatLocalDateKey(refDate);
  const patterns = eh.patterns || {};
  const seasonId = getAromaSeasonId(refDate);
  const collectedIds = EMBROIDERY_PATTERNS.filter((p) => Number(patterns[p.id] && patterns[p.id].count) > 0).map((p) => p.id);
  const pattern = EMBROIDERY_PATTERN_BY_ID[embroideryRun.patternId];
  return {
    todayKey,
    seasonId,
    seasonPatterns: getEmbroiderySeasonPatterns(seasonId).map((p) => p.id),
    collected: collectedIds.length,
    collectedIds,
    totalPatterns: EMBROIDERY_RULES.totalPatterns,
    wallCount: Array.isArray(eh.wall) ? eh.wall.length : 0,
    totalPieces: Math.max(0, Number(eh.totalPieces) || 0),
    rewardsToday: eh.rewardDate === todayKey ? Math.max(0, Number(eh.rewardCount) || 0) : 0,
    dailyRewards: EMBROIDERY_RULES.dailyRewards,
    stitching: Boolean(pattern && embroideryRun.phase === 'stitch' && embroideryRun.taps > 0),
    taps: embroideryRun.taps,
    need: pattern ? pattern.taps : 0
  };
}

// 地板小暖炉：不联网、不读任何传感器 —— 按本地月份（冬日程度）+ 时段确定性亮起，火力 0 休眠 / 1 小火 / 2 暖火 / 3 旺火
const HEARTH_SEGMENTS = [
  { id: 'dawn', name: '清晨', from: 5, to: 10, next: '10:00' },
  { id: 'day', name: '午后', from: 10, to: 16, next: '16:00' },
  { id: 'dusk', name: '傍晚', from: 16, to: 20, next: '20:00' },
  { id: 'night', name: '夜里', from: 20, to: 5, next: '05:00' }
];

// 冬日程度 × 时段（清晨 / 午后 / 傍晚 / 夜里）→ 火力；暖季（5 ~ 9 月）暖炉休息，可以一起生个 20 分钟的小火
const HEARTH_COLDNESS = [
  { id: 'warm', levels: [0, 0, 0, 0] },
  { id: 'cool', levels: [1, 0, 1, 2] },
  { id: 'chilly', levels: [2, 1, 2, 3] },
  { id: 'deep', levels: [3, 2, 3, 3] }
];
// 本地月份（1 ~ 12 月）→ 冬日程度：12 / 1 / 2 月深冬、11 月初冬、3 月早春、10 / 4 月微凉、5 ~ 9 月暖季
const HEARTH_MONTH_COLD = [3, 3, 2, 1, 0, 0, 0, 0, 0, 1, 2, 3];
const HEARTH_MONTH_TAGS = ['深冬', '深冬', '早春', '微凉', '暖季', '暖季', '暖季', '暖季', '暖季', '微凉', '初冬', '深冬'];

const HEARTH_LEVELS = [
  { id: 'rest', name: '休眠', flips: 0, bonus: 0, rgb: '250, 244, 236', texture: '' },
  { id: 'low', name: '小火', flips: 5, bonus: 0.04, rgb: '255, 242, 224', texture: '软糯' },
  { id: 'warm', name: '暖火', flips: 4, bonus: 0.06, rgb: '255, 234, 212', texture: '金黄' },
  { id: 'blaze', name: '旺火', flips: 3, bonus: 0.08, rgb: '255, 228, 204', texture: '焦香' }
];
const HEARTH_LEVEL_BY_ID = Object.fromEntries(HEARTH_LEVELS.map((l, i) => [l.id, { ...l, index: i }]));

// 4 种炉边松饼口味（同一碟烤松饼贴图，只换柔光色），4 口味 × 3 档火力 = 12 格炉边点心手帐
const HEARTH_SNACKS = [
  { id: 'honey', name: '蜂蜜松饼', short: '蜂蜜', rgb: '255, 238, 206' },
  { id: 'berry', name: '莓果松饼', short: '莓果', rgb: '255, 228, 232' },
  { id: 'cinnamon', name: '肉桂松饼', short: '肉桂', rgb: '250, 232, 214' },
  { id: 'maple', name: '枫糖松饼', short: '枫糖', rgb: '252, 236, 212' }
];
const HEARTH_SNACK_BY_ID = Object.fromEntries(HEARTH_SNACKS.map((s) => [s.id, s]));

const HEARTH_RULES = {
  dailyRewards: 3,
  coinReward: 6,
  newEntryCoins: 8,
  xpBase: 4,
  xpPerLevel: 2,
  cuddleMin: 20,
  kindleMin: 20,
  totalEntries: HEARTH_SNACKS.length * 3
};

function getHearthSegment(d = ar16Clock.date()) {
  const h = d.getHours();
  if (h >= 5 && h < 10) return HEARTH_SEGMENTS[0];
  if (h >= 10 && h < 16) return HEARTH_SEGMENTS[1];
  if (h >= 16 && h < 20) return HEARTH_SEGMENTS[2];
  return HEARTH_SEGMENTS[3];
}

function getHearthAutoLevel(d = ar16Clock.date()) {
  const cold = HEARTH_COLDNESS[HEARTH_MONTH_COLD[d.getMonth()]] || HEARTH_COLDNESS[0];
  return cold.levels[HEARTH_SEGMENTS.indexOf(getHearthSegment(d))] || 0;
}

// 一起生的小火（暖季 / 不冷的时段也能烤点心）：只认 20 分钟以内的合理记录，是否已熄由可注入时钟判断
function getHearthKindle(nowMs = ar16Clock.now()) {
  const k = player.hearthCorner && player.hearthCorner.kindle;
  if (!k || !(Number(k.endMs) > nowMs) || !(Number(k.startMs) <= nowMs)) return null;
  const leftMs = Math.min(HEARTH_RULES.kindleMin * 60000, Number(k.endMs) - nowMs);
  return { startMs: k.startMs, endMs: k.endMs, leftMs, minsLeft: Math.max(1, Math.ceil(leftMs / 60000)) };
}

// 围炉依偎：分着吃完烤松饼后 20 分钟，日常养成的亲密度收获按当时火力 +4% / +6% / +8%
function getHearthCuddle(nowMs = ar16Clock.now()) {
  const c = player.hearthCorner && player.hearthCorner.cuddle;
  if (!c || !(Number(c.endMs) > nowMs) || !(Number(c.startMs) <= nowMs)) return null;
  const lv = HEARTH_LEVELS[Math.max(1, Math.min(3, Math.round(Number(c.level) || 1)))];
  const leftMs = Math.min(HEARTH_RULES.cuddleMin * 60000, Number(c.endMs) - nowMs);
  return {
    level: HEARTH_LEVELS.indexOf(lv),
    levelId: lv.id,
    levelName: lv.name,
    bonus: lv.bonus,
    startMs: c.startMs,
    endMs: c.endMs,
    leftMs,
    minsLeft: Math.max(1, Math.ceil(leftMs / 60000))
  };
}

function getHearthState(d = ar16Clock.date()) {
  const seg = getHearthSegment(d);
  const auto = getHearthAutoLevel(d);
  const kindle = getHearthKindle(d.getTime());
  const level = Math.max(auto, kindle ? 1 : 0);
  const monthTag = HEARTH_MONTH_TAGS[d.getMonth()];
  return {
    seg,
    segId: seg.id,
    auto,
    level,
    levelId: HEARTH_LEVELS[level].id,
    levelName: HEARTH_LEVELS[level].name,
    rgb: HEARTH_LEVELS[level].rgb,
    lit: level > 0,
    kindled: Boolean(kindle) && auto < 1,
    kindle,
    monthTag,
    coldId: (HEARTH_COLDNESS[HEARTH_MONTH_COLD[d.getMonth()]] || HEARTH_COLDNESS[0]).id
  };
}

// 运行时状态：当前挑的口味 / 翻了几次面（pick → roast → shared），不入存档
const snackRun = {
  snackId: '',
  flips: 0,
  phase: 'pick',
  flip: 0,
  helperSeq: 0,
  crackleAcc: 0,
  tickAcc: 0,
  dayKey: '',
  wasLevel: -1,
  wasCuddle: false,
  wasKindle: false,
  lastAction: '',
  lastResult: null
};

function getHearthStats(refDate = ar16Clock.date()) {
  const hc = player.hearthCorner || {};
  const todayKey = formatLocalDateKey(refDate);
  const entries = hc.entries || {};
  const state = getHearthState(refDate);
  const shownLevel = HEARTH_LEVELS[Math.max(1, state.level)];
  const found = Object.keys(entries).filter((k) => Number(entries[k]) > 0);
  return {
    todayKey,
    state,
    level: state.level,
    entries: found.length,
    totalEntries: HEARTH_RULES.totalEntries,
    levelFound: HEARTH_SNACKS.filter((s) => Number(entries[`${s.id}_${shownLevel.id}`]) > 0).length,
    shownLevelId: shownLevel.id,
    totalSnacks: Math.max(0, Number(hc.totalSnacks) || 0),
    totalCuddles: Math.max(0, Number(hc.totalCuddles) || 0),
    rewardsToday: hc.rewardDate === todayKey ? Math.max(0, Number(hc.rewardCount) || 0) : 0,
    dailyRewards: HEARTH_RULES.dailyRewards,
    cuddle: getHearthCuddle(refDate.getTime()),
    roasting: Boolean(HEARTH_SNACK_BY_ID[snackRun.snackId] && snackRun.phase === 'roast' && snackRun.flips > 0)
  };
}

// 冬日亲密加成：日常养成模式里围炉依偎期间，亲密度收获按分着吃时的火力 +4% / +6% / +8%
function getHearthCuddleMult() {
  if (gameMode !== 'pet') return 1;
  const c = getHearthCuddle();
  return c ? 1 + c.bonus : 1;
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
  const teaBuff = getActiveTeaShiftBuff();
  survivorRun.teaShieldMax = teaBuff ? Math.max(0, Math.round(teaBuff.startingShield || 0)) : 0;
  survivorRun.teaShield = survivorRun.teaShieldMax;
  survivorRun.lastDisplayedShield = Math.ceil(survivorRun.teaShield);
  const crochetGuard = getCrochetWarmGuard();
  survivorRun.knitShieldMax = crochetGuard.active ? crochetGuard.cozyShieldBonus : 0;
  survivorRun.knitShield = survivorRun.knitShieldMax;
  survivorRun.lastDisplayedKnitShield = Math.ceil(survivorRun.knitShield);
  const collageBless = getCollageLuckBlessing();
  survivorRun.startingCoinPouch = collageBless.active ? collageBless.startingCoinPouch : 0;
  const kittenWard = getKittenLuckWard();
  survivorRun.kittenSavesMax = kittenWard.saveCharges;
  survivorRun.kittenSavesLeft = kittenWard.saveCharges;
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
  const teaBuff = getActiveTeaShiftBuff();
  if (teaBuff) {
    const shieldLeft = Math.ceil(survivorRun.teaShield || 0);
    badges.push({
      img: './assets/tea_platter_signature.webp?v=hd31',
      tag: shieldLeft > 0 ? `盾${shieldLeft}` : `茶+${Math.round((teaBuff.coinBonusPct || 0) * 100)}%`,
      isSuper: true,
      title: `${teaBuff.name} · ${teaBuff.buffTitle}`
    });
  }
  const botBless = getBotanicalBlessings();
  if (botBless && botBless.totalLevel >= 3) {
    badges.push({
      img: './assets/ui_btn_terrarium.webp?v=hd31',
      tag: `花Lv${botBless.totalLevel}`,
      isSuper: botBless.bloomCount > 0,
      title: `微缩花房佑护 · 金+${Math.round(botBless.luckCoinPct * 100)}% 自愈+${botBless.hpRegenPerSec.toFixed(1)}/s 磁+${Math.round(botBless.magnetPct * 100)}%`
    });
  }
  const collageBless = getCollageLuckBlessing();
  if (collageBless && collageBless.active) {
    badges.push({
      img: './assets/ui_btn_collage_frame.webp?v=hd31',
      tag: `框+${collageBless.startingCoinPouch}金`,
      isSuper: true,
      title: `手账幸运佑护（${collageBless.frameStyleName}） · 幸运掉宝+${Math.round(collageBless.luckyDropBonus * 100)}% 磁吸+${Math.round(collageBless.gemMagnetBonusPct * 100)}% 开局+${collageBless.startingCoinPouch}金`
    });
  }
  const crochetGuard = getCrochetWarmGuard();
  if (crochetGuard && crochetGuard.active) {
    const kShield = Math.ceil(survivorRun.knitShield || 0);
    badges.push({
      img: './assets/ui_btn_crochet_basket.webp?v=hd31',
      tag: kShield > 0 ? `绒盾${kShield}` : `减伤${Math.round(crochetGuard.damageReductionPct * 100)}%`,
      isSuper: true,
      title: `暖绒手作守护（Lv.${crochetGuard.totalLevel}/9） · 减伤+${Math.round(crochetGuard.damageReductionPct * 100)}% 暖绒护盾+${crochetGuard.cozyShieldBonus} 爱心磁吸+${Math.round(crochetGuard.heartMagnetBonusPct * 100)}%`
    });
  }
  const cocoaBuff = getActiveHotCocoaBuff();
  if (cocoaBuff) {
    badges.push({
      img: './assets/ui_btn_cocoa_bar.webp?v=hd31',
      tag: `暖速+${Math.round((cocoaBuff.attackHastePct || 0) * 100)}%`,
      isSuper: true,
      title: `${cocoaBuff.name} · ${cocoaBuff.buffTitle}（攻速+${Math.round((cocoaBuff.attackHastePct || 0) * 100)}% 财运+${Math.round((cocoaBuff.coinLuckPct || 0) * 100)}%）`
    });
  }
  const pressedBless = getPressedFlowerBlessing();
  if (pressedBless.active) {
    badges.push({
      img: './assets/ui_btn_pressed_flowers.webp?v=hd31',
      tag: `再生${pressedBless.hpRegenPerSec.toFixed(1)}`,
      isSuper: true,
      title: `幸运再生佑护（压花 Lv.${pressedBless.totalLevel}/9） · 幸运掉宝+${Math.round(pressedBless.luckyDropBonus * 100)}% 体力再生+${pressedBless.hpRegenPerSec.toFixed(2)}/秒 金币幸运+${Math.round(pressedBless.coinLuckPct * 100)}%`
    });
  }
  const focusWard = getWatercolorFocusWard();
  if (focusWard.active) {
    badges.push({
      img: './assets/ui_btn_watercolor_easel.webp?v=hd31',
      tag: `画${focusWard.gallerySize}/${focusWard.total}`,
      isSuper: focusWard.gallerySize >= focusWard.total,
      title: `画意专注守护（画廊 ${focusWard.gallerySize}/${focusWard.total} 幅） · 暴击+${(focusWard.critChanceBonus * 100).toFixed(1)}% 专注攻速+${(focusWard.focusHastePct * 100).toFixed(1)}%`
    });
  }
  const lunchWard = getBentoLunchWard();
  if (lunchWard.active) {
    badges.push({
      img: './assets/bento_box_finished.webp?v=hd31',
      tag: lunchWard.rescuesLeft > 0 ? `救急${lunchWard.rescuesLeft}` : `续${lunchWard.regenPerSec.toFixed(1)}`,
      isSuper: lunchWard.rescuesLeft > 0,
      title: `便当续航（${lunchWard.name}） · 体力回复+${lunchWard.regenPerSec.toFixed(1)}/秒 · 饭团救急 ${Math.round(lunchWard.rescuePct * 100)}% 剩 ${lunchWard.rescuesLeft}/${lunchWard.rescueCharges} 次`
    });
  }
  const memoryBonus = getMemoryPuzzleBonus();
  if (memoryBonus.active) {
    badges.push({
      img: './assets/puzzle_piece_memory.webp?v=hd31',
      tag: `忆+${Math.round(memoryBonus.coinLuckPct * 100)}%`,
      isSuper: memoryBonus.distinct >= memoryBonus.total,
      title: `回忆拾光（拼好 ${memoryBonus.distinct}/${memoryBonus.total} 段回忆） · 打工金币+${(memoryBonus.coinLuckPct * 100).toFixed(0)}%`
    });
  }
  const kittenWard = getKittenLuckWard();
  if (kittenWard.active) {
    const savesLeft = Math.max(0, survivorRun.kittenSavesLeft || 0);
    badges.push({
      img: './assets/ui_btn_kitten_corner.webp?v=hd31',
      tag: savesLeft > 0 ? `护身${savesLeft}` : `猫运+${Math.round(kittenWard.luckyDropBonus * 100)}%`,
      isSuper: savesLeft > 0,
      title: `猫咪幸运佑护（小猫好感 ${kittenWard.totalAffection}/${kittenWard.maxAffection}） · 幸运掉宝+${(kittenWard.luckyDropBonus * 100).toFixed(1)}% · 九命护身 剩 ${savesLeft}/${survivorRun.kittenSavesMax || 0} 次`
    });
  }
  const cardBless = getGreetingCardBlessing();
  if (cardBless.active) {
    badges.push({
      img: './assets/ui_btn_greeting_card.webp?v=hd31',
      tag: `贺${cardBless.occasions}/${cardBless.totalOccasions}`,
      isSuper: cardBless.occasions >= cardBless.totalOccasions,
      title: `贺卡心意（收集 ${cardBless.occasions}/${cardBless.totalOccasions} 种节日季节贺卡） · 班次经验+${(cardBless.shiftXpBonusPct * 100).toFixed(1)}%`
    });
  }
  const picnicWard = getPicnicShiftWard();
  if (picnicWard.active) {
    badges.push({
      img: './assets/ui_btn_picnic_basket.webp?v=hd31',
      tag:
        picnicWard.effect === 'coin'
          ? `野金+${Math.round(picnicWard.coinPct * 100)}%`
          : picnicWard.effect === 'regen'
            ? `野续${picnicWard.regenPerSec.toFixed(1)}`
            : `野速+${Math.round(picnicWard.hastePct * 100)}%`,
      isSuper: picnicWard.anticipation >= PICNIC_RULES.prepMax,
      title: `野餐好心情（${picnicWard.spotName} · ${picnicWard.wardName}） · ${describePicnicWard(picnicWard.spotId, picnicWard.anticipation)} · 期待章 ${picnicWard.anticipation}/${PICNIC_RULES.prepMax} · 之后还剩 ${picnicWard.chargesLeft} 个班次`
    });
  }
  const potteryWard = getPotteryShiftWard();
  if (potteryWard.active) {
    badges.push({
      img: './assets/ui_btn_pottery_wheel.webp?v=hd31',
      tag:
        potteryWard.effect === 'guard'
          ? `陶盾${Math.round(potteryWard.guardPct * 100)}%`
          : potteryWard.effect === 'coin'
            ? `陶金+${Math.round(potteryWard.coinPct * 100)}%`
            : `陶磁+${Math.round(potteryWard.magnetPct * 100)}%`,
      isSuper: potteryWard.combos >= POTTERY_RULES.totalCombos,
      title: `陶艺佑护（${potteryWard.shapeName} · ${potteryWard.glazeName} · ${potteryWard.wardName}） · ${describePotteryWard(potteryWard.glazeId, potteryWard.shapeId, potteryWard.combos)} · 陶艺图鉴 ${potteryWard.combos}/${POTTERY_RULES.totalCombos} · 之后还剩 ${potteryWard.chargesLeft} 个班次`
    });
  }
  const heartfelt = getMailboxHeartfeltBonus();
  if (heartfelt.active) {
    badges.push({
      img: './assets/ui_btn_mailbox.webp?v=hd31',
      tag: `信${heartfelt.replies}`,
      isSuper: heartfelt.stampKinds >= heartfelt.totalStampKinds,
      title: `信笺心意（回信 ${heartfelt.replies} 封 · 邮票 ${heartfelt.stampKinds}/${heartfelt.totalStampKinds} 种） · 班次经验+${(heartfelt.shiftXpBonusPct * 100).toFixed(1)}%`
    });
  }
  const starGuide = getStarGuidanceBonus();
  if (starGuide.active) {
    badges.push({
      img: './assets/ui_btn_telescope.webp?v=hd31',
      tag: `星${starGuide.count}/${starGuide.total}`,
      isSuper: starGuide.count >= starGuide.total,
      title: `星辉指引（星图 ${starGuide.count}/${starGuide.total} 座） · 暴击+${(starGuide.critChanceBonus * 100).toFixed(1)}% 宝石磁吸+${Math.round(starGuide.gemMagnetPct * 100)}%`
    });
  }
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
  const teaBuff = getActiveTeaShiftBuff();
  const teaCoinMult = gameMode === 'survivor' && teaBuff ? 1 + (teaBuff.coinBonusPct || 0) : 1;
  const botBless = getBotanicalBlessings();
  const botCoinMult = gameMode === 'survivor' && botBless ? 1 + (botBless.luckCoinPct || 0) : 1;
  const collageBless = getCollageLuckBlessing();
  const collageCoinMult =
    gameMode === 'survivor' && collageBless.active ? 1 + (collageBless.luckCoinPct || 0) : 1;
  const cocoaBuff = getActiveHotCocoaBuff();
  const cocoaCoinMult =
    gameMode === 'survivor' && cocoaBuff ? 1 + (cocoaBuff.coinLuckPct || 0) : 1;
  const pressedBless = getPressedFlowerBlessing();
  const pressedCoinMult =
    gameMode === 'survivor' && pressedBless.active ? 1 + (pressedBless.coinLuckPct || 0) : 1;
  const memoryCoinMult = getMemoryPuzzleCoinMult();
  const picnicCoinMult = getPicnicCoinMult();
  const potteryCoinMult = getPotteryCoinMult();
  const finalCoins = Math.max(
    1,
    Math.round(
      amount *
        crownBonus *
        wreathBonus *
        magnetBonus *
        buffBonus *
        teaCoinMult *
        botCoinMult *
        collageCoinMult *
        cocoaCoinMult *
        pressedCoinMult *
        memoryCoinMult *
        picnicCoinMult *
        potteryCoinMult
    )
  );
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
  } else if (/>\/\/\/<|>_<|别戳|讨厌/.test(text)) {
    player.emoteMood = 'tsundere';
  } else if (/zzZ|午觉|摸鱼/.test(text)) {
    player.emoteMood = 'sleep';
  } else if (/米饭|乌龙|茶|舒芙蕾|马卡龙|布丁|香|饱|甜/.test(text)) {
    player.emoteMood = 'eat';
  } else if (/\^w\^|耶|太棒|喜欢|幸福/.test(text)) {
    player.emoteMood = 'happy';
  } else {
    player.emoteMood = 'normal';
  }
}

// 亲密度收获倍率：小夜灯 / 贝壳发夹 / 星星花环，AR-14 起再乘点香期间的香氛舒心
function getAffectionXpMult() {
  const lampFurn = furnitureList.find((f) => f.key === 'lamp');
  const lampBonus = lampFurn && (vision.isDarkRoom || lampFurn.manualOn) ? 1.25 : 1;
  const shellBonus = player.equipped.shell_clip ? 1.2 : 1;
  const wreathBonus = player.equipped.star_wreath ? 1.15 : 1;
  // AR-14 香氛舒心：点香期间日常养成的亲密度收获 +10%
  const aromaBonus = getAromaAffectionMult();
  // AR-15 听雨安神：窗边听雨期间日常养成的亲密度收获再 +5%
  const rainBonus = getRainCalmMult();
  // AR-16 围炉依偎：分着吃完烤松饼后的 20 分钟，按当时暖炉火力再 +4% / +6% / +8%
  const hearthBonus = getHearthCuddleMult();
  return lampBonus * shellBonus * wreathBonus * aromaBonus * rainBonus * hearthBonus;
}

function addAffectionXp(amount, labelText) {
  const finalAmount = Math.max(1, Math.round(amount * getAffectionXpMult()));
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
  return finalAmount;
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
  grantInteractiveCareYarnDrop('headpat');

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

  // AR-13 野餐进行中：野餐垫上的点心优先接住点击（不被桌面摆设抢走）
  if (gameMode === 'pet' && handleAr13OutingTap(pt)) {
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
    if (Array.isArray(player.displayedTerrariumPlants)) {
      for (let i = player.displayedTerrariumPlants.length - 1; i >= 0; i--) {
        const slot = player.displayedTerrariumPlants[i];
        if (Math.hypot(pt.x - slot.x, pt.y - (slot.y - 26)) < 36) {
          player.terrarium.selectedPlant = slot.id;
          if (slot.hasDew) {
            harvestPlantDew(slot.id);
          } else {
            openTerrariumCard();
            playSfx('pat');
          }
          return;
        }
      }
    }
    if (player.crochetDeskVisual && player.crochetDeskVisual.displayed && player.crochetDeskVisual.level > 0) {
      const knitX = W * 0.692;
      const knitY = H * 0.68 - 22;
      if (Math.hypot(pt.x - knitX, pt.y - knitY) < 38) {
        openCrochetCard();
        playSfx('crochet_stitch');
        return;
      }
    }
    if (player.pressedDeskVisual && player.pressedDeskVisual.displayed && player.pressedDeskVisual.items.length > 0) {
      const markX = Math.min(W - 64, W * 0.855);
      const markY = H * 0.68 - 24;
      if (Math.hypot(pt.x - markX, pt.y - markY) < 44) {
        openPressedFlowerCard();
        playSfx('page_press');
        return;
      }
    }
    if (handleAr10CanvasTap(pt)) {
      return;
    }
    if (handleAr11CanvasTap(pt)) {
      return;
    }
    if (handleAr12CanvasTap(pt)) {
      return;
    }
    if (handleAr13CanvasTap(pt)) {
      return;
    }
    if (handleAr14CanvasTap(pt)) {
      return;
    }
    if (handleAr15CanvasTap(pt)) {
      return;
    }
    if (handleAr16CanvasTap(pt)) {
      return;
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
    img: './assets/furn_musicbox.webp?v=hd19',
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
    img: './assets/item_shell_clip.webp?v=hd19',
    name: '星海贝壳发卡',
    desc: 'LV.3 解锁 · 互动亲密经验+20%',
    price: 0
  },
  {
    id: 'star_wreath',
    milestoneLv: 8,
    ico: '',
    img: './assets/item_star_wreath.webp?v=hd19',
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

function openDrawer(tab) { cancelRpsGame(); cancelPalmCatchGame(); dismissPolaroid(); dismissTopicCard(); dismissWindowAmbienceCard(); foldOrHidePomodoroCard(); dismissTeatimeCard(); dismissWeeklyJournalCard(); dismissTerrariumCard(); foldOrHideGoodnightCard(); dismissCollageCard(); foldOrHideCozyRadioCard(); dismissCrochetCard(); dismissHotCocoaCard(); dismissPressedFlowerCard(); dismissTelescopeCard(); dismissAr10Cards(); dismissAr11Cards(); dismissAr12Cards(); dismissAr13Cards(); dismissAr14Cards(); dismissAr15Cards(); dismissAr16Cards(); player.wanderTargetX = null; if (player.y < H * 0.68 - 26) { player.y = H * 0.68 - 25; player.vy = 0; player.onGround = true; player.standingPlat = null; }
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
  grantInteractiveCareYarnDrop('feed');
  player.recenterDelay = 0; player.tsundereTimer = 0; player.happyTimer = 0; player.cheerTimer = 0;
  player.wanderTargetX = dropX;
  recordJournalActivity('feeds', 1);
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
    const teaBanner = document.createElement('button');
    teaBanner.type = 'button';
    teaBanner.className = 'shop-card';
    teaBanner.innerHTML = `
      <div class="shop-thumb-wrap"><img src="./assets/ui_btn_teatime.webp?v=hd31" alt="" class="shop-thumb" /></div>
      <div class="shop-info">
        <span class="shop-name">治愈下午茶甜点手作台 <em class="shop-tag-pill">特调 ${Object.keys(player.afternoonTea?.discoveredRecipes || {}).length}/9</em></span>
        <span class="shop-desc">自由组合鲜萃茶底与现烤甜点，解锁全图鉴并激活幸存者打工增益!</span>
      </div>
      <span class="shop-price">前往调配</span>
    `;
    bindCardTap(teaBanner, () => {
      openTeatimeCard();
    });
    drawerItemsEl.appendChild(teaBanner);
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
    const cocoaBanner = document.createElement('button');
    cocoaBanner.type = 'button';
    cocoaBanner.className = 'shop-card';
    cocoaBanner.dataset.ar8FoodShortcut = 'cocoa';
    cocoaBanner.innerHTML = `
      <div class="shop-thumb-wrap"><img src="./assets/ui_btn_cocoa_bar.webp?v=hd31" alt="" class="shop-thumb" /></div>
      <div class="shop-info">
        <span class="shop-name">暖冬棉花糖热可可吧台 <em class="shop-tag-pill">特调 ${Object.keys(player.hotCocoa?.discoveredBlends || {}).length}/6</em></span>
        <span class="shop-desc">自由调配可可基底与烤星芒棉花糖/肉桂棒，激活幸存者攻速与财运暖意!</span>
      </div>
      <span class="shop-price">前往冲泡</span>
    `;
    bindCardTap(cocoaBanner, () => {
      openHotCocoaCard();
    });
    drawerItemsEl.appendChild(cocoaBanner);
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

    // AR-14 船坞已满 25 键：窗畔陶艺转盘 / 香氛调配台不再加键，并入「家具与装扮」抽屉（紧跟房间主题，陶艺架与房间色温都属于房间装扮）
    const ar14CozyBanner = document.createElement('div');
    ar14CozyBanner.className = 'drawer-section-block ar14-drawer-block';
    const curPottery = getPotteryStats();
    const curAroma = getAromaStats();
    const curAromaSeason = AROMA_SEASONS[curAroma.seasonId];
    ar14CozyBanner.innerHTML = `
      <div class="drawer-section-head">
        <span class="drawer-section-title">窗畔陶艺与香氛调配台</span>
        <span class="drawer-section-hint">拉坯上釉烧成小陶器摆上陶艺架 · 按心情与季节调一瓶房间香氛</span>
      </div>
      <div class="room-theme-grid">
        <button type="button" class="room-theme-card active" data-ar14-shortcut="pottery">
          <img src="./assets/ui_btn_pottery_wheel.webp?v=hd31" alt="" class="room-theme-thumb" />
          <div class="room-theme-meta">
            <span class="room-theme-name">窗畔手作陶艺转盘</span>
            <span class="room-theme-sub">${curPottery.wardCharges > 0 && curPottery.wardGlazeId ? `陶艺佑护 ${curPottery.wardCharges} 班次 · ${describePotteryWardShort(curPottery.wardGlazeId, curPottery.wardShapeId)}` : `陶艺架 ${curPottery.shelfCount} 件 · 图鉴 ${curPottery.combos}/${curPottery.totalCombos}`}</span>
          </div>
          <span class="room-theme-state">拉坯</span>
        </button>
        <button type="button" class="room-theme-card" data-ar14-shortcut="aroma">
          <img src="./assets/ui_btn_aroma_table.webp?v=hd31" alt="" class="room-theme-thumb" />
          <div class="room-theme-meta">
            <span class="room-theme-name">她的小小香氛调配台</span>
            <span class="room-theme-sub">${curAroma.active ? `${curAroma.active.name} · 还剩 ${curAroma.active.minsLeft} 分` : `当季「${curAromaSeason.note}」 · 图鉴 ${curAroma.discovered}/${curAroma.totalRecipes}`}</span>
          </div>
          <span class="room-theme-state">调香</span>
        </button>
      </div>
    `;
    bindCardTap(ar14CozyBanner.querySelector('[data-ar14-shortcut="pottery"]'), () => {
      openPotteryWheelCard();
      petAudio.playPotteryWheel(0);
    });
    bindCardTap(ar14CozyBanner.querySelector('[data-ar14-shortcut="aroma"]'), () => {
      openAromaTableCard();
      petAudio.playAromaDrop(0);
    });
    drawerItemsEl.appendChild(ar14CozyBanner);

    // AR-15 船坞仍是 25 键、书桌已满：卧室星空投影灯 / 窗边听雨角同样并入「家具与装扮」抽屉（紧跟陶艺香氛块，物件摆在窗边飘台上）
    const ar15CozyBanner = document.createElement('div');
    ar15CozyBanner.className = 'drawer-section-block ar15-drawer-block';
    const curStar = getStarStats();
    const curRain = getRainStats();
    ar15CozyBanner.innerHTML = `
      <div class="drawer-section-head">
        <span class="drawer-section-title">卧室星空灯与窗边听雨角</span>
        <span class="drawer-section-hint">睡前一起点亮星座投影收集星座卡 · 按本地天气时段听白噪音</span>
      </div>
      <div class="room-theme-grid">
        <button type="button" class="room-theme-card active" data-ar15-shortcut="star">
          <img src="./assets/ui_btn_star_projector.webp?v=hd31" alt="" class="room-theme-thumb" />
          <div class="room-theme-meta">
            <span class="room-theme-name">卧室星空投影灯</span>
            <span class="room-theme-sub">${curStar.active ? `「${curStar.active.name}」星光 · 还剩 ${curStar.active.minsLeft} 分` : `星座卡 ${curStar.collected}/${curStar.totalCards} · 今晚${STAR_SEASON_NAMES[curStar.seasonId]}夜星空`}</span>
          </div>
          <span class="room-theme-state">点亮</span>
        </button>
        <button type="button" class="room-theme-card" data-ar15-shortcut="rain">
          <img src="./assets/ui_btn_rain_corner.webp?v=hd31" alt="" class="room-theme-thumb" />
          <div class="room-theme-meta">
            <span class="room-theme-name">窗边听雨角</span>
            <span class="room-theme-sub">${curRain.listening ? `听雨中 · ${curRain.weather.name}` : `${curRain.weather.segName} · ${curRain.weather.name} · 手帐 ${curRain.entries}/${curRain.totalEntries}`}</span>
          </div>
          <span class="room-theme-state">听雨</span>
        </button>
      </div>
    `;
    bindCardTap(ar15CozyBanner.querySelector('[data-ar15-shortcut="star"]'), () => {
      openStarProjectorCard();
      petAudio.playStarDial(0);
    });
    bindCardTap(ar15CozyBanner.querySelector('[data-ar15-shortcut="rain"]'), () => {
      openRainCornerCard();
      petAudio.playRainChime(0);
    });
    drawerItemsEl.appendChild(ar15CozyBanner);

    // AR-16 船坞仍是 25 键、书桌与窗台都已满：墙面刺绣绷架 / 地板小暖炉冬日角同样并入「家具与装扮」抽屉（紧跟星空听雨块，物件只放墙面与地板）
    const ar16CozyBanner = document.createElement('div');
    ar16CozyBanner.className = 'drawer-section-block ar16-drawer-block';
    const curEmb = getEmbroideryStats();
    const curHearth = getHearthStats();
    ar16CozyBanner.innerHTML = `
      <div class="drawer-section-head">
        <span class="drawer-section-title">墙面刺绣绷架与地板小暖炉</span>
        <span class="drawer-section-hint">和她一起绣季节小图案挂上墙 · 按本地日期与时段亮起的暖炉边烤松饼依偎</span>
      </div>
      <div class="room-theme-grid">
        <button type="button" class="room-theme-card active" data-ar16-shortcut="embroidery">
          <img src="./assets/ui_btn_embroidery.webp?v=hd31" alt="" class="room-theme-thumb" />
          <div class="room-theme-meta">
            <span class="room-theme-name">墙面刺绣绷架</span>
            <span class="room-theme-sub">${curEmb.stitching ? `绣到 ${curEmb.taps * 2}/${curEmb.need * 2} 针` : `绣样 ${curEmb.collected}/${curEmb.totalPatterns} · 墙上 ${curEmb.wallCount} 幅 · ${EMBROIDERY_SEASON_NAMES[curEmb.seasonId]}日绣样`}</span>
          </div>
          <span class="room-theme-state">刺绣</span>
        </button>
        <button type="button" class="room-theme-card" data-ar16-shortcut="hearth">
          <img src="./assets/ui_btn_hearth_corner.webp?v=hd31" alt="" class="room-theme-thumb" />
          <div class="room-theme-meta">
            <span class="room-theme-name">地板小暖炉冬日角</span>
            <span class="room-theme-sub">${curHearth.cuddle ? `围炉依偎 · 还剩 ${curHearth.cuddle.minsLeft} 分` : `${curHearth.state.monthTag} · ${curHearth.state.seg.name} · ${curHearth.state.levelName} · 手帐 ${curHearth.entries}/${curHearth.totalEntries}`}</span>
          </div>
          <span class="room-theme-state">烤点心</span>
        </button>
      </div>
    `;
    bindCardTap(ar16CozyBanner.querySelector('[data-ar16-shortcut="embroidery"]'), () => {
      openEmbroideryCard();
      petAudio.playEmbroideryStitch(0);
    });
    bindCardTap(ar16CozyBanner.querySelector('[data-ar16-shortcut="hearth"]'), () => {
      openHearthCard();
    });
    drawerItemsEl.appendChild(ar16CozyBanner);

    const ar6CozyBanner = document.createElement('div');
    ar6CozyBanner.className = 'drawer-section-block';
    const curBot = getBotanicalBlessings();
    ar6CozyBanner.innerHTML = `
      <div class="drawer-section-head">
        <span class="drawer-section-title">花房盆栽架与晚安八音盒</span>
        <span class="drawer-section-hint">绿植摆设加成幸存者打工 · 暖光钢片琴伴眠</span>
      </div>
      <div class="room-theme-grid">
        <button type="button" class="room-theme-card active" data-ar6-shortcut="terrarium">
          <img src="./assets/ui_btn_terrarium.webp?v=hd31" alt="" class="room-theme-thumb" />
          <div class="room-theme-meta">
            <span class="room-theme-name">微缩绿植花房</span>
            <span class="room-theme-sub">花架 Lv.${curBot.totalLevel}/15 · 桌面摆设 ${curBot.displayedCount} 盆</span>
          </div>
          <span class="room-theme-state">照料</span>
        </button>
        <button type="button" class="room-theme-card" data-ar6-shortcut="musicbox">
          <img src="./assets/ui_btn_musicbox.webp?v=hd31" alt="" class="room-theme-thumb" />
          <div class="room-theme-meta">
            <span class="room-theme-name">晚安星空八音盒</span>
            <span class="room-theme-sub">好梦火漆章 ${player.goodnightMusicbox?.totalStamps || 0} 枚 · 柔光摇篮曲</span>
          </div>
          <span class="room-theme-state">开启</span>
        </button>
      </div>
    `;
    bindCardTap(ar6CozyBanner.querySelector('[data-ar6-shortcut="terrarium"]'), () => {
      openTerrariumCard();
    });
    bindCardTap(ar6CozyBanner.querySelector('[data-ar6-shortcut="musicbox"]'), () => {
      openGoodnightCard();
    });
    drawerItemsEl.appendChild(ar6CozyBanner);

    const ar7CozyBanner = document.createElement('div');
    ar7CozyBanner.className = 'drawer-section-block';
    const curCollage = getCollageLuckBlessing();
    const curRadio = petAudio.getCozyRadioInfo();
    ar7CozyBanner.innerHTML = `
      <div class="drawer-section-head">
        <span class="drawer-section-title">手账贴纸拼贴画框与窗畔轻电台</span>
        <span class="drawer-section-hint">手绘贴纸装裱激活幸运佑护 · 3波段原声电台伴听</span>
      </div>
      <div class="room-theme-grid">
        <button type="button" class="room-theme-card active" data-ar7-shortcut="collage">
          <img src="./assets/ui_btn_collage_frame.webp?v=hd31" alt="" class="room-theme-thumb" />
          <div class="room-theme-meta">
            <span class="room-theme-name">手账贴纸拼贴画框</span>
            <span class="room-theme-sub">${curCollage.active ? `已装裱 ${curCollage.savedCount} 帧 · 开局+${curCollage.startingCoinPouch}金` : '拼贴蕾丝/干花/蓝鲸邮票装点书桌'}</span>
          </div>
          <span class="room-theme-state">装裱</span>
        </button>
        <button type="button" class="room-theme-card" data-ar7-shortcut="radio">
          <img src="./assets/ui_btn_cozy_radio.webp?v=hd31" alt="" class="room-theme-thumb" />
          <div class="room-theme-meta">
            <span class="room-theme-name">窗畔温暖轻电台</span>
            <span class="room-theme-sub">${curRadio.active ? `${curRadio.shortName} · 播音中` : `已收听 ${player.cozyRadio?.totalListenMinutes || 0} 分钟 · 3波段轻音`}</span>
          </div>
          <span class="room-theme-state">调频</span>
        </button>
      </div>
    `;
    bindCardTap(ar7CozyBanner.querySelector('[data-ar7-shortcut="collage"]'), () => {
      openCollageCard();
    });
    bindCardTap(ar7CozyBanner.querySelector('[data-ar7-shortcut="radio"]'), () => {
      openCozyRadioCard();
    });
    drawerItemsEl.appendChild(ar7CozyBanner);

    const ar8CozyBanner = document.createElement('div');
    ar8CozyBanner.className = 'drawer-section-block';
    const curCrochet = getCrochetWarmGuard();
    const curCocoaBuff = getActiveHotCocoaBuff();
    ar8CozyBanner.innerHTML = `
      <div class="drawer-section-head">
        <span class="drawer-section-title">毛线钩针手作篮与棉花糖热可可吧台</span>
        <span class="drawer-section-hint">手作织物木桌展示与减伤护盾 · 热可可攻速财运暖意</span>
      </div>
      <div class="room-theme-grid">
        <button type="button" class="room-theme-card active" data-ar8-shortcut="crochet">
          <img src="./assets/ui_btn_crochet_basket.webp?v=hd31" alt="" class="room-theme-thumb" />
          <div class="room-theme-meta">
            <span class="room-theme-name">毛线钩针温暖手作篮</span>
            <span class="room-theme-sub">${curCrochet.active ? `暖绒 Lv.${curCrochet.totalLevel}/9 · 减伤+${Math.round(curCrochet.damageReductionPct * 100)}%` : `毛线 ${player.crochetBasket?.yarnSkeins || 0} 团 · 编织3款暖心织物`}</span>
          </div>
          <span class="room-theme-state">编织</span>
        </button>
        <button type="button" class="room-theme-card" data-ar8-shortcut="cocoa">
          <img src="./assets/ui_btn_cocoa_bar.webp?v=hd31" alt="" class="room-theme-thumb" />
          <div class="room-theme-meta">
            <span class="room-theme-name">暖冬棉花糖热可可吧台</span>
            <span class="room-theme-sub">${curCocoaBuff ? `${curCocoaBuff.name} · 暖意生效中` : `已解锁 ${Object.keys(player.hotCocoa?.discoveredBlends || {}).length}/6 款冬日可可`}</span>
          </div>
          <span class="room-theme-state">冲泡</span>
        </button>
      </div>
    `;
    bindCardTap(ar8CozyBanner.querySelector('[data-ar8-shortcut="crochet"]'), () => {
      openCrochetCard();
    });
    bindCardTap(ar8CozyBanner.querySelector('[data-ar8-shortcut="cocoa"]'), () => {
      openHotCocoaCard();
    });
    drawerItemsEl.appendChild(ar8CozyBanner);

    const ar9CozyBanner = document.createElement('div');
    ar9CozyBanner.className = 'drawer-section-block';
    const curPressed = getPressedFlowerBlessing();
    const curStarGuide = getStarGuidanceBonus();
    ar9CozyBanner.innerHTML = `
      <div class="drawer-section-head">
        <span class="drawer-section-title">干花标本压花册与窗畔星夜望远镜</span>
        <span class="drawer-section-hint">干花书签木桌陈列与幸运再生 · 观星连座收录星图</span>
      </div>
      <div class="room-theme-grid">
        <button type="button" class="room-theme-card active" data-ar9-shortcut="pressed">
          <img src="./assets/ui_btn_pressed_flowers.webp?v=hd31" alt="" class="room-theme-thumb" />
          <div class="room-theme-meta">
            <span class="room-theme-name">干花标本温馨压花册</span>
            <span class="room-theme-sub">${curPressed.active ? `压花 Lv.${curPressed.totalLevel}/9 · 再生+${curPressed.hpRegenPerSec.toFixed(1)}/秒` : '压制樱瓣/银杏/满天星3枚干花书签'}</span>
          </div>
          <span class="room-theme-state">压花</span>
        </button>
        <button type="button" class="room-theme-card" data-ar9-shortcut="telescope">
          <img src="./assets/ui_btn_telescope.webp?v=hd31" alt="" class="room-theme-thumb" />
          <div class="room-theme-meta">
            <span class="room-theme-name">窗畔星夜天文望远镜</span>
            <span class="room-theme-sub">${curStarGuide.active ? `星图 ${curStarGuide.count}/${curStarGuide.total} 座 · 暴击+${(curStarGuide.critChanceBonus * 100).toFixed(1)}%` : '按序连星辨认6座星座'}</span>
          </div>
          <span class="room-theme-state">观星</span>
        </button>
      </div>
    `;
    bindCardTap(ar9CozyBanner.querySelector('[data-ar9-shortcut="pressed"]'), () => {
      openPressedFlowerCard();
    });
    bindCardTap(ar9CozyBanner.querySelector('[data-ar9-shortcut="telescope"]'), () => {
      openTelescopeCard();
    });
    drawerItemsEl.appendChild(ar9CozyBanner);

    const ar10CozyBanner = document.createElement('div');
    ar10CozyBanner.className = 'drawer-section-block';
    const curWard = getWatercolorFocusWard();
    const curHeartfelt = getMailboxHeartfeltBonus();
    const curInbox = (player.mailbox?.letters || []).length;
    ar10CozyBanner.innerHTML = `
      <div class="drawer-section-head">
        <span class="drawer-section-title">窗畔水彩画架与小邮差信箱</span>
        <span class="drawer-section-hint">雨天写生挂上墙面画廊 · 手写信笺回信贴邮票</span>
      </div>
      <div class="room-theme-grid">
        <button type="button" class="room-theme-card active" data-ar10-shortcut="easel">
          <img src="./assets/ui_btn_watercolor_easel.webp?v=hd31" alt="" class="room-theme-thumb" />
          <div class="room-theme-meta">
            <span class="room-theme-name">窗畔雨天水彩写生画架</span>
            <span class="room-theme-sub">${curWard.active ? `画廊 ${curWard.gallerySize}/${curWard.total} 幅 · 暴击+${(curWard.critChanceBonus * 100).toFixed(1)}%` : '3 题材 × 3 调色盘雨天写生'}</span>
          </div>
          <span class="room-theme-state">写生</span>
        </button>
        <button type="button" class="room-theme-card" data-ar10-shortcut="mailbox">
          <img src="./assets/ui_btn_mailbox.webp?v=hd31" alt="" class="room-theme-thumb" />
          <div class="room-theme-meta">
            <span class="room-theme-name">奶油手账小邮差信箱</span>
            <span class="room-theme-sub">${curInbox > 0 ? `待回信 ${curInbox} 封` : curHeartfelt.active ? `已回信 ${curHeartfelt.replies} 封 · 经验+${(curHeartfelt.shiftXpBonusPct * 100).toFixed(1)}%` : '她会定期写来手写信笺'}</span>
          </div>
          <span class="room-theme-state">读信</span>
        </button>
      </div>
    `;
    bindCardTap(ar10CozyBanner.querySelector('[data-ar10-shortcut="easel"]'), () => {
      openWatercolorCard();
    });
    bindCardTap(ar10CozyBanner.querySelector('[data-ar10-shortcut="mailbox"]'), () => {
      openMailboxCard();
    });
    drawerItemsEl.appendChild(ar10CozyBanner);

    const ar11CozyBanner = document.createElement('div');
    ar11CozyBanner.className = 'drawer-section-block';
    const curBento = getBentoKitchenStats();
    const curMemory = getMemoryPuzzleBonus();
    ar11CozyBanner.innerHTML = `
      <div class="drawer-section-head">
        <span class="drawer-section-title">暖灯厨房与回忆拼图</span>
        <span class="drawer-section-hint">一起捏饭团摆便当 · 把合影与画作拼回回忆墙</span>
      </div>
      <div class="room-theme-grid">
        <button type="button" class="room-theme-card active" data-ar11-shortcut="bento">
          <img src="./assets/ui_btn_bento_kitchen.webp?v=hd31" alt="" class="room-theme-thumb" />
          <div class="room-theme-meta">
            <span class="room-theme-name">暖灯厨房一起做饭团便当</span>
            <span class="room-theme-sub">${curBento.bagCount > 0 ? `便当袋 ${curBento.bagCount}/${curBento.bagMax} · 下个班次续航回血` : `便当图鉴 ${curBento.discovered}/${curBento.totalRecipes} 款`}</span>
          </div>
          <span class="room-theme-state">下厨</span>
        </button>
        <button type="button" class="room-theme-card" data-ar11-shortcut="puzzle">
          <img src="./assets/ui_btn_memory_puzzle.webp?v=hd31" alt="" class="room-theme-thumb" />
          <div class="room-theme-meta">
            <span class="room-theme-name">奶油手账回忆拼图时光</span>
            <span class="room-theme-sub">${curMemory.active ? `回忆墙 ${curMemory.wallCount}/${curMemory.total} · 金币+${Math.round(curMemory.coinLuckPct * 100)}%` : '拍立得 / 水彩 / 周报拼成小拼图'}</span>
          </div>
          <span class="room-theme-state">拼图</span>
        </button>
      </div>
    `;
    bindCardTap(ar11CozyBanner.querySelector('[data-ar11-shortcut="bento"]'), () => {
      openBentoKitchenCard();
    });
    bindCardTap(ar11CozyBanner.querySelector('[data-ar11-shortcut="puzzle"]'), () => {
      openMemoryPuzzleCard();
    });
    drawerItemsEl.appendChild(ar11CozyBanner);

    const ar12CozyBanner = document.createElement('div');
    ar12CozyBanner.className = 'drawer-section-block';
    const curKitten = getKittenCornerStats();
    const curCardBless = getGreetingCardBlessing();
    const curOcc = resolveCardOccasion(ar12Clock.date()).occasion;
    ar12CozyBanner.innerHTML = `
      <div class="drawer-section-head">
        <span class="drawer-section-title">窗台小猫与节日贺卡</span>
        <span class="drawer-section-hint">给来串门的小猫添猫粮 · 和她一起剪贴节日手作贺卡</span>
      </div>
      <div class="room-theme-grid">
        <button type="button" class="room-theme-card active" data-ar12-shortcut="kitten">
          <img src="./assets/ui_btn_kitten_corner.webp?v=hd31" alt="" class="room-theme-thumb" />
          <div class="room-theme-meta">
            <span class="room-theme-name">窗台小猫访客喂食角</span>
            <span class="room-theme-sub">${curKitten.visiting ? `${KITTEN_BY_ID[curKitten.visitorId].name} 正在窗台串门` : `图鉴 ${curKitten.met}/${curKitten.totalKittens} · 好感 ${curKitten.totalAffection}/${curKitten.maxAffection}`}</span>
          </div>
          <span class="room-theme-state">喂猫</span>
        </button>
        <button type="button" class="room-theme-card" data-ar12-shortcut="card">
          <img src="./assets/ui_btn_greeting_card.webp?v=hd31" alt="" class="room-theme-thumb" />
          <div class="room-theme-meta">
            <span class="room-theme-name">奶油手账节日手作贺卡</span>
            <span class="room-theme-sub">${curCardBless.albumCount > 0 ? `收藏 ${curCardBless.albumCount} 张 · 节日 ${curCardBless.occasions}/${curCardBless.totalOccasions}` : `今天是「${curOcc.name}」，一起剪贴贺卡`}</span>
          </div>
          <span class="room-theme-state">剪贴</span>
        </button>
      </div>
    `;
    bindCardTap(ar12CozyBanner.querySelector('[data-ar12-shortcut="kitten"]'), () => {
      openKittenCornerCard();
    });
    bindCardTap(ar12CozyBanner.querySelector('[data-ar12-shortcut="card"]'), () => {
      openGreetingCraftCard();
    });
    drawerItemsEl.appendChild(ar12CozyBanner);

    const ar13CozyBanner = document.createElement('div');
    ar13CozyBanner.className = 'drawer-section-block';
    const curPicnic = getPicnicStats();
    const curDiary = getDiaryStats();
    ar13CozyBanner.innerHTML = `
      <div class="drawer-section-head">
        <span class="drawer-section-title">周末野餐与手写日记</span>
        <span class="drawer-section-hint">周末一起去野餐 · 翻翻她每天写下的手账日记</span>
      </div>
      <div class="room-theme-grid">
        <button type="button" class="room-theme-card active" data-ar13-shortcut="picnic">
          <img src="./assets/ui_btn_picnic_basket.webp?v=hd31" alt="" class="room-theme-thumb" />
          <div class="room-theme-meta">
            <span class="room-theme-name">奶油手账周末野餐篮</span>
            <span class="room-theme-sub">${curPicnic.isWeekend ? (curPicnic.doneToday ? `今天已野餐 · 共 ${curPicnic.totalPicnics} 次` : '今天是周末，一起去野餐吧') : `离周末 ${curPicnic.daysUntil} 天 · 期待章 ${curPicnic.prepDays}/${PICNIC_RULES.prepMax}`}</span>
          </div>
          <span class="room-theme-state">野餐</span>
        </button>
        <button type="button" class="room-theme-card" data-ar13-shortcut="diary">
          <img src="./assets/ui_btn_diary.webp?v=hd31" alt="" class="room-theme-thumb" />
          <div class="room-theme-meta">
            <span class="room-theme-name">DeepSeek娘手写日记本</span>
            <span class="room-theme-sub">${curDiary.todayNew ? '她刚写下了新的一行' : `日记 ${curDiary.written} 页 · 装饰 ${curDiary.decorated} 页`}</span>
          </div>
          <span class="room-theme-state">翻看</span>
        </button>
      </div>
    `;
    bindCardTap(ar13CozyBanner.querySelector('[data-ar13-shortcut="picnic"]'), () => {
      openPicnicBasketCard();
    });
    bindCardTap(ar13CozyBanner.querySelector('[data-ar13-shortcut="diary"]'), () => {
      openDiaryBookCard();
    });
    drawerItemsEl.appendChild(ar13CozyBanner);

    // AR-4 四季窗景与昼夜流转 DIY 区块（与左上角窗景手账卡实时同步）
    const ambienceBlock = document.createElement('div');
    ambienceBlock.className = 'drawer-section-block';
    const curAmb = player.windowAmbience;
    ambienceBlock.innerHTML = `
      <div class="drawer-section-head">
        <span class="drawer-section-title">四季窗景与昼夜流转</span>
        <button type="button" class="ambience-auto-btn drawer-amb-auto ${curAmb.autoSync ? 'active' : ''}">
          ${curAmb.autoSync ? '随钟流转中' : '切换为随钟'}
        </button>
      </div>
      <div class="drawer-ambience-period-grid"></div>
      <div class="drawer-ambience-season-grid"></div>
    `;
    const drawerAutoBtn = ambienceBlock.querySelector('.drawer-amb-auto');
    bindCardTap(drawerAutoBtn, () => {
      setWindowAmbienceState({ autoSync: !player.windowAmbience.autoSync }, true);
    });
    const drawerPeriodGrid = ambienceBlock.querySelector('.drawer-ambience-period-grid');
    for (const pSpec of WINDOW_PERIOD_SPECS) {
      const pBtn = document.createElement('button');
      pBtn.type = 'button';
      pBtn.className = `ambience-period-btn ${curAmb.period === pSpec.id ? 'active' : ''}`.trim();
      pBtn.dataset.drawerPeriod = pSpec.id;
      pBtn.innerHTML = `
        <img src="${pSpec.thumb}" alt="${pSpec.label}" class="ambience-win-thumb" />
        <span>${pSpec.label}</span>
      `;
      bindCardTap(pBtn, () => {
        setWindowAmbienceState({ autoSync: false, period: pSpec.id }, true);
      });
      drawerPeriodGrid.appendChild(pBtn);
    }
    const drawerSeasonGrid = ambienceBlock.querySelector('.drawer-ambience-season-grid');
    for (const sSpec of WINDOW_SEASON_SPECS) {
      const sBtn = document.createElement('button');
      sBtn.type = 'button';
      sBtn.className = `ambience-season-btn ${curAmb.season === sSpec.id ? 'active' : ''}`.trim();
      sBtn.dataset.drawerSeason = sSpec.id;
      sBtn.innerHTML = `
        <img src="${sSpec.ico}" alt="${sSpec.name}" class="ambience-season-ico" />
        <span>${sSpec.name}</span>
      `;
      bindCardTap(sBtn, () => {
        setWindowAmbienceState({ autoSync: false, season: sSpec.id }, true);
      });
      drawerSeasonGrid.appendChild(sBtn);
    }
    drawerItemsEl.appendChild(ambienceBlock);

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
const ambienceRowEl = document.getElementById('hud-ambience-row');
function switchMode(newMode) {
  if (!newMode) return;
  const prevMode = gameMode;
  if (gameMode === 'survivor' && newMode !== 'survivor') {
    // AR-11 便当午餐只守护当前班次：离开打工模式即算吃完
    survivorRun.lunch = null;
    // AR-13 野餐好心情同样只守护当前班次
    survivorRun.picnic = null;
    // AR-14 陶艺佑护同样只守护当前班次
    survivorRun.pottery = null;
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
  dismissWindowAmbienceCard();
  foldOrHidePomodoroCard();
  dismissTeatimeCard();
  dismissWeeklyJournalCard();
  dismissTerrariumCard();
  foldOrHideGoodnightCard();
  dismissCollageCard();
  foldOrHideCozyRadioCard();
  dismissCrochetCard();
  dismissHotCocoaCard();
  dismissPressedFlowerCard();
  dismissTelescopeCard(); dismissAr10Cards(); dismissAr11Cards(); dismissAr12Cards(); dismissAr13Cards(); dismissAr14Cards(); dismissAr15Cards(); dismissAr16Cards();
  if (newMode !== 'pet' && pomodoroRun.status === 'running') {
    pomodoroRun.status = 'paused';
  }
  if (newMode !== 'pet' && goodnightRun.status === 'running') {
    goodnightRun.status = 'paused';
    petAudio.stopLullabyBox();
  }
  if (newMode !== 'pet' && cozyRadioRun.playing) {
    pauseCozyRadioForModeSwitch();
  }
  // AR-15 听雨只陪日常养成：离开房间就停下白噪音（已记下的听雨小记都保留）
  if (newMode !== 'pet' && rainRun.listening) {
    stopRainListening('mode');
  }
  player.isFocusStudying = false;
  player.isGoodnightSleeping = false;
  player.isRadioListening = false;
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
    careBarEl.style.display = '';
    if (wishPillEl) wishPillEl.style.display = 'inline-flex';
    if (ambienceRowEl) ambienceRowEl.style.display = 'flex';
    syncPomodoroUI();
    syncTeatimeUI();
    syncWeeklyJournalUI();
    syncTerrariumUI();
    syncGoodnightUI();
    syncCollageUI();
    syncCozyRadioUI();
    syncCrochetUI();
    syncHotCocoaUI();
    syncPressedFlowerUI();
    syncTelescopeUI();
    syncWatercolorUI();
    syncMailboxUI();
    syncBentoKitchenUI();
    syncMemoryPuzzleUI();
    syncKittenCornerUI();
    syncGreetingCardUI();
    syncPicnicBasketUI();
    syncDiaryBookUI();
    syncPotteryWheelUI();
    syncAromaTableUI();
    syncStarProjectorUI();
    syncRainCornerUI();
    syncEmbroideryHoopUI();
    syncHearthCornerUI();
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
    if (ambienceRowEl) ambienceRowEl.style.display = 'none';
    syncPomodoroUI();
    syncTeatimeUI();
    syncTerrariumUI();
    syncGoodnightUI();
    syncCollageUI();
    syncCozyRadioUI();
    syncCrochetUI();
    syncHotCocoaUI();
    syncPressedFlowerUI();
    syncTelescopeUI();
    syncWatercolorUI();
    syncMailboxUI();
    syncBentoKitchenUI();
    syncMemoryPuzzleUI();
    syncKittenCornerUI();
    syncGreetingCardUI();
    syncPicnicBasketUI();
    syncDiaryBookUI();
    syncPotteryWheelUI();
    syncAromaTableUI();
    syncStarProjectorUI();
    syncRainCornerUI();
    syncEmbroideryHoopUI();
    syncHearthCornerUI();
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
    const shiftLunch = openBentoLunchForShift(prevMode);
    const shiftPicnic = openPicnicWardForShift(prevMode);
    const shiftPottery = openPotteryWardForShift(prevMode);
    if (survivorRun.startingCoinPouch > 0) {
      const pouch = survivorRun.startingCoinPouch;
      player.coins += pouch;
      survivorSessionCoins += pouch;
      savePetState();
      floatingTexts.push({
        x: player.x,
        y: player.y - 46,
        vx: 0,
        vy: -42,
        text: `手账钱袋 +${pouch}`,
        color: '#fbbf24',
        scale: 1.15,
        life: 1.0
      });
    }
    recordJournalActivity('shifts', 1);
    careBarEl.style.display = 'none';
    if (wishPillEl) wishPillEl.style.display = 'none';
    if (ambienceRowEl) ambienceRowEl.style.display = 'none';
    syncPomodoroUI();
    syncTeatimeUI();
    syncTerrariumUI();
    syncGoodnightUI();
    syncCollageUI();
    syncCozyRadioUI();
    syncCrochetUI();
    syncHotCocoaUI();
    syncPressedFlowerUI();
    syncTelescopeUI();
    syncWatercolorUI();
    syncMailboxUI();
    syncBentoKitchenUI();
    syncMemoryPuzzleUI();
    syncKittenCornerUI();
    syncGreetingCardUI();
    syncPicnicBasketUI();
    syncDiaryBookUI();
    syncPotteryWheelUI();
    syncAromaTableUI();
    syncStarProjectorUI();
    syncRainCornerUI();
    syncEmbroideryHoopUI();
    syncHearthCornerUI();
    enemySpawnTimer = 0.15;
    spawnEnemy(false);
    spawnEnemy(false);
    syncSurvivorHud();
    syncSurvivorSkillStrip();
    syncSurvivorBossBar();
    syncParkourHud();
    const activeTea = getActiveTeaShiftBuff();
    const botBless = getBotanicalBlessings();
    setPlayerEmote(
      shiftLunch
        ? `带上『${shiftLunch.name}』出发打工！续航 +${shiftLunch.regen.toFixed(1)}/秒 · 饭团救急 ×${shiftLunch.rescuesLeft}`
        : shiftPicnic
          ? `带着野餐好心情『${PICNIC_SPOT_BY_ID[shiftPicnic.spotId].wardName}』出发打工！${describePicnicWard(shiftPicnic.spotId, shiftPicnic.antic)}`
          : shiftPottery
          ? `带着陶艺佑护『${POTTERY_GLAZE_BY_ID[shiftPottery.glazeId].wardName}』出发打工！${describePotteryWard(shiftPottery.glazeId, shiftPottery.shapeId, shiftPottery.combos)}`
          : activeTea
          ? `下午茶『${activeTea.buffTitle}』与花房 Lv.${botBless.totalLevel} 佑护出击！`
          : `开启幸存者打工！花房绿植 Lv.${botBless.totalLevel} 幸运与自愈佑护生效中~`,
      2.2
    );
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

// ================= AR-4 四季窗景昼夜流转 & 奶油手账番茄钟专注陪伴模式 =================
const windowAmbienceCardEl = document.getElementById('window-ambience-card');
const hudAmbiencePillEl = document.getElementById('hud-ambience-pill');
const hudAmbienceIcoEl = document.getElementById('hud-ambience-ico');
const hudAmbienceLabelEl = document.getElementById('hud-ambience-label');
const hudAmbienceModeEl = document.getElementById('hud-ambience-mode');
const ambienceHeadIcoEl = document.getElementById('ambience-head-ico');
const btnAmbienceAutoEl = document.getElementById('btn-ambience-auto');
let ambienceClockCheckAcc = 0;

function getPeriodSpec(periodId) {
  return WINDOW_PERIOD_SPECS.find((p) => p.id === periodId) || WINDOW_PERIOD_SPECS[0];
}

function getSeasonSpec(seasonId) {
  return WINDOW_SEASON_SPECS.find((s) => s.id === seasonId) || WINDOW_SEASON_SPECS[0];
}

function syncWindowAmbienceUI() {
  const cur = player.windowAmbience;
  const pSpec = getPeriodSpec(cur.period);
  const sSpec = getSeasonSpec(cur.season);
  if (hudAmbienceIcoEl) hudAmbienceIcoEl.src = sSpec.ico;
  if (ambienceHeadIcoEl) ambienceHeadIcoEl.src = sSpec.ico;
  if (hudAmbienceLabelEl) hudAmbienceLabelEl.textContent = `${sSpec.name} · ${pSpec.short}`;
  if (hudAmbienceModeEl) hudAmbienceModeEl.textContent = cur.autoSync ? '随钟' : '手调';
  if (btnAmbienceAutoEl) {
    btnAmbienceAutoEl.classList.toggle('active', Boolean(cur.autoSync));
    btnAmbienceAutoEl.textContent = cur.autoSync ? '随钟流转' : '开启随钟';
  }
  document.querySelectorAll('#ambience-period-grid .ambience-period-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.period === cur.period);
  });
  document.querySelectorAll('#ambience-season-grid .ambience-season-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.season === cur.season);
  });
}

function setWindowAmbienceState(patch = {}, announce = false) {
  const nextAuto =
    patch.autoSync !== undefined ? Boolean(patch.autoSync) : Boolean(player.windowAmbience.autoSync);
  const clockDerived = deriveClockWindowAmbience(patch.refDate || new Date());
  const nextPeriod = nextAuto
    ? clockDerived.period
    : ['morning', 'noon', 'dusk', 'starry'].includes(patch.period)
      ? patch.period
      : player.windowAmbience.period;
  const nextSeason = nextAuto
    ? clockDerived.season
    : ['spring', 'summer', 'autumn', 'winter'].includes(patch.season)
      ? patch.season
      : player.windowAmbience.season;

  const periodChanged = nextPeriod !== player.windowAmbience.period;
  const seasonChanged = nextSeason !== player.windowAmbience.season;
  player.windowAmbience = {
    autoSync: nextAuto,
    period: nextPeriod,
    season: nextSeason
  };
  vision.setWindowAmbience(player.windowAmbience);
  syncWindowAmbienceUI();
  savePetState();

  if (drawerEl && !drawerEl.classList.contains('hidden') && activeDrawerTab === 'dress') {
    renderDrawerItems();
  }

  if (announce) {
    playSfx('star');
    spawnInteractVfx(player.x, player.y - 26, 'sparkle', 7);
    const pSpec = getPeriodSpec(nextPeriod);
    const sSpec = getSeasonSpec(nextSeason);
    if (nextAuto) {
      setPlayerEmote(`已同步本地时钟：「${sSpec.name} · ${pSpec.short}」窗景~`, 2.1, 'happy');
    } else if (seasonChanged && !periodChanged) {
      setPlayerEmote(sSpec.greet, 2.1, 'happy');
    } else {
      setPlayerEmote(pSpec.greet, 2.2, 'happy');
    }
  }
  return { ...player.windowAmbience };
}

function dismissWindowAmbienceCard() {
  windowAmbienceCardEl?.classList.add('hidden');
}

function toggleWindowAmbienceCard() {
  if (!windowAmbienceCardEl) return;
  const willOpen = windowAmbienceCardEl.classList.contains('hidden');
  if (willOpen) {
    if (gameMode !== 'pet') switchMode('pet');
    closeDrawer();
    dismissTopicCard();
    foldOrHidePomodoroCard();
    dismissTeatimeCard();
    dismissWeeklyJournalCard();
    dismissTerrariumCard();
    foldOrHideGoodnightCard();
    dismissCollageCard();
    foldOrHideCozyRadioCard();
    dismissCrochetCard();
    dismissHotCocoaCard();
    dismissPressedFlowerCard();
    dismissTelescopeCard(); dismissAr10Cards(); dismissAr11Cards(); dismissAr12Cards(); dismissAr13Cards(); dismissAr14Cards(); dismissAr15Cards(); dismissAr16Cards();
    syncWindowAmbienceUI();
    windowAmbienceCardEl.classList.remove('hidden');
    playSfx('pat');
  } else {
    dismissWindowAmbienceCard();
  }
}

function updateWindowAmbienceClock(dt) {
  if (!player.windowAmbience.autoSync) return;
  ambienceClockCheckAcc += dt;
  if (ambienceClockCheckAcc < 15) return;
  ambienceClockCheckAcc = 0;
  const derived = deriveClockWindowAmbience();
  if (
    derived.period !== player.windowAmbience.period ||
    derived.season !== player.windowAmbience.season
  ) {
    setWindowAmbienceState({ autoSync: true }, false);
  }
}

if (windowAmbienceCardEl) {
  windowAmbienceCardEl.addEventListener('pointerdown', (e) => e.stopPropagation());
}
bindHudTap(hudAmbiencePillEl, () => {
  toggleWindowAmbienceCard();
});
bindHudTap(document.getElementById('btn-ambience-close'), () => {
  dismissWindowAmbienceCard();
});
bindHudTap(btnAmbienceAutoEl, () => {
  setWindowAmbienceState({ autoSync: !player.windowAmbience.autoSync }, true);
});
document.querySelectorAll('#ambience-period-grid .ambience-period-btn').forEach((btn) => {
  bindHudTap(btn, () => {
    setWindowAmbienceState({ autoSync: false, period: btn.dataset.period }, true);
  });
});
document.querySelectorAll('#ambience-season-grid .ambience-season-btn').forEach((btn) => {
  bindHudTap(btn, () => {
    setWindowAmbienceState({ autoSync: false, season: btn.dataset.season }, true);
  });
});

// 奶油手账番茄钟专注陪伴控制器
const pomodoroCardEl = document.getElementById('pomodoro-card');
const pomodoroMiniPillEl = document.getElementById('pomodoro-mini-pill');
const pomodoroMiniClockEl = document.getElementById('pomodoro-mini-clock');
const pomodoroMiniTagEl = document.getElementById('pomodoro-mini-tag');
const pomodoroClockEl = document.getElementById('pomodoro-clock');
const pomodoroStatePillEl = document.getElementById('pomodoro-state-pill');
const pomodoroProgressFillEl = document.getElementById('pomodoro-progress-fill');
const pomodoroNoteEl = document.getElementById('pomodoro-companion-note');
const pomodoroTaskInputEl = document.getElementById('pomodoro-task-input');
const btnPomoStartEl = document.getElementById('btn-pomo-start');
const btnPomoPauseEl = document.getElementById('btn-pomo-pause');
const btnPomoCancelEl = document.getElementById('btn-pomo-cancel');
const btnPomoFoldEl = document.getElementById('btn-pomo-fold');
const btnPomodoroDockEl = document.getElementById('btn-pomodoro');
const btnPomodoroLabelEl = document.getElementById('btn-pomodoro-label');
const pomodoroStampStripEl = document.getElementById('pomodoro-stamp-strip');
const pomoStatStampsEl = document.getElementById('pomo-stat-stamps');
const pomoStatStreakEl = document.getElementById('pomo-stat-streak');
const pomoStatMinsEl = document.getElementById('pomo-stat-mins');

const POMODORO_ENCOURAGEMENTS = [
  (tag) => `「${tag}」推进得很稳呢，我在旁边安静翻书陪你~`,
  (tag, pShort) => `窗外${pShort}柔光刚好，慢慢沉浸在「${tag}」里吧~`,
  () => '肩膀放松一下下，深呼吸一口，我们继续专注~',
  (tag) => `每一分钟的「${tag}」都会攒成闪闪发光的手账印章哟~`,
  () => '不用着急赶进度，我会一直守在桌角陪着主人~'
];

const pomodoroRun = {
  status: 'idle', // 'idle' | 'running' | 'paused' | 'completed'
  durationSec: (player.pomodoro.selectedMinutes || 25) * 60,
  remainingSec: (player.pomodoro.selectedMinutes || 25) * 60,
  encourageTimer: 18,
  encourageIdx: 0,
  halfwayNotified: false,
  lastRewardSummary: ''
};

function formatPomodoroClock(sec) {
  const safe = Math.max(0, Math.ceil(sec));
  const mm = String(Math.floor(safe / 60)).padStart(2, '0');
  const ss = String(safe % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function sanitizeTaskTag(raw) {
  const cleaned = String(raw || '').trim().slice(0, 18);
  return cleaned || '敲代码';
}

function renderPomodoroStampStrip() {
  if (!pomodoroStampStripEl) return;
  const total = player.pomodoro.totalStamps || 0;
  const cycleFilled = total === 0 ? 0 : ((total - 1) % 5) + 1;
  let html = '';
  for (let i = 0; i < 5; i++) {
    const stamped = i < cycleFilled;
    html += `<span class="pomo-stamp-slot ${stamped ? 'stamped' : ''}"><img src="./assets/ui_stamp_focus.webp?v=hd19" alt="" /></span>`;
  }
  html += `<span class="pomo-stamp-hint">今日 ${player.pomodoro.todaySessions || 0} 轮</span>`;
  pomodoroStampStripEl.innerHTML = html;
}

function syncPomodoroUI() {
  const isRunning = pomodoroRun.status === 'running';
  const isPaused = pomodoroRun.status === 'paused';
  const isDone = pomodoroRun.status === 'completed';
  const isActive = isRunning || isPaused;
  const displaySec = isDone
    ? player.pomodoro.selectedMinutes * 60
    : isActive
      ? pomodoroRun.remainingSec
      : player.pomodoro.selectedMinutes * 60;
  const clockStr = formatPomodoroClock(displaySec);

  if (pomodoroClockEl) pomodoroClockEl.textContent = clockStr;
  if (pomodoroMiniClockEl) pomodoroMiniClockEl.textContent = clockStr;
  if (pomodoroMiniTagEl) {
    pomodoroMiniTagEl.textContent = isPaused ? '已暂停' : player.pomodoro.taskTag;
  }

  if (btnPomodoroDockEl) {
    btnPomodoroDockEl.classList.toggle('is-focusing', isActive);
    btnPomodoroDockEl.classList.toggle(
      'active',
      Boolean(pomodoroCardEl && !pomodoroCardEl.classList.contains('hidden'))
    );
  }
  if (btnPomodoroLabelEl) {
    btnPomodoroLabelEl.textContent = isActive ? clockStr : '专注';
  }

  const cardHidden = !pomodoroCardEl || pomodoroCardEl.classList.contains('hidden');
  if (pomodoroMiniPillEl) {
    pomodoroMiniPillEl.classList.toggle('hidden', !(gameMode === 'pet' && isActive && cardHidden));
  }

  if (pomodoroStatePillEl) {
    pomodoroStatePillEl.classList.toggle('is-running', isRunning);
    pomodoroStatePillEl.classList.toggle('is-done', isDone);
    pomodoroStatePillEl.textContent = isRunning
      ? `伴读中 · ${player.pomodoro.taskTag}`
      : isPaused
        ? '专注暂停中'
        : isDone
          ? '本轮圆满达成'
          : '准备专注';
  }

  if (pomodoroProgressFillEl) {
    const pct = isDone
      ? 100
      : isActive && pomodoroRun.durationSec > 0
        ? Math.max(2, Math.min(100, ((pomodoroRun.durationSec - pomodoroRun.remainingSec) / pomodoroRun.durationSec) * 100))
        : 0;
    pomodoroProgressFillEl.style.width = `${pct.toFixed(1)}%`;
  }

  if (pomodoroNoteEl) {
    if (isRunning) {
      pomodoroNoteEl.textContent = `DeepSeek娘正翻阅手账安静陪你专注「${player.pomodoro.taskTag}」~`;
    } else if (isPaused) {
      pomodoroNoteEl.textContent = `已暂停倒计时，喝口温水放松一下，随时继续「${player.pomodoro.taskTag}」~`;
    } else if (isDone && pomodoroRun.lastRewardSummary) {
      pomodoroNoteEl.textContent = pomodoroRun.lastRewardSummary;
    } else {
      pomodoroNoteEl.textContent = '选好时长与小目标，DeepSeek娘会在桌畔安静翻书陪你~';
    }
  }

  document.querySelectorAll('#pomodoro-presets-row .pomo-preset-btn').forEach((btn) => {
    const mins = Number(btn.dataset.mins);
    btn.classList.toggle('active', mins === player.pomodoro.selectedMinutes);
    btn.disabled = isActive;
  });

  document.querySelectorAll('#pomodoro-tag-chips .pomo-tag-chip').forEach((chip) => {
    chip.classList.toggle('active', chip.dataset.tag === player.pomodoro.taskTag);
  });
  if (pomodoroTaskInputEl && document.activeElement !== pomodoroTaskInputEl) {
    pomodoroTaskInputEl.value = player.pomodoro.taskTag;
  }

  if (btnPomoStartEl) {
    btnPomoStartEl.classList.toggle('hidden', isActive);
    btnPomoStartEl.textContent = isDone ? '再来一轮专注' : '开启专注伴读';
  }
  if (btnPomoPauseEl) {
    btnPomoPauseEl.classList.toggle('hidden', !isActive);
    btnPomoPauseEl.textContent = isPaused ? '继续专注' : '暂停';
  }
  if (btnPomoCancelEl) {
    btnPomoCancelEl.classList.toggle('hidden', !isActive);
  }
  if (btnPomoFoldEl) {
    btnPomoFoldEl.classList.toggle('hidden', !isActive);
  }

  if (pomoStatStampsEl) pomoStatStampsEl.textContent = String(player.pomodoro.totalStamps || 0);
  if (pomoStatStreakEl) pomoStatStreakEl.textContent = String(player.pomodoro.streakDays || 0);
  if (pomoStatMinsEl) pomoStatMinsEl.textContent = String(player.pomodoro.totalFocusMinutes || 0);
  renderPomodoroStampStrip();
}

function foldOrHidePomodoroCard() {
  pomodoroCardEl?.classList.add('hidden');
  syncPomodoroUI();
}

function openPomodoroCard() {
  if (!pomodoroCardEl) return;
  if (gameMode !== 'pet') switchMode('pet');
  closeDrawer();
  dismissTopicCard();
  dismissWindowAmbienceCard();
  dismissTeatimeCard();
  dismissWeeklyJournalCard();
  dismissTerrariumCard();
  foldOrHideGoodnightCard();
  dismissCollageCard();
  foldOrHideCozyRadioCard();
  dismissCrochetCard();
  dismissHotCocoaCard();
  dismissPressedFlowerCard();
  dismissTelescopeCard(); dismissAr10Cards(); dismissAr11Cards(); dismissAr12Cards(); dismissAr13Cards(); dismissAr14Cards(); dismissAr15Cards(); dismissAr16Cards();
  dismissPolaroid();
  pomodoroCardEl.classList.remove('hidden');
  syncPomodoroUI();
}

function togglePomodoroCard() {
  if (!pomodoroCardEl) return;
  if (pomodoroCardEl.classList.contains('hidden')) {
    openPomodoroCard();
    playSfx('pat');
  } else {
    foldOrHidePomodoroCard();
  }
}

function selectPomodoroPreset(mins) {
  if (pomodoroRun.status === 'running' || pomodoroRun.status === 'paused') return;
  const validMins = [15, 25, 45].includes(Number(mins)) ? Number(mins) : 25;
  player.pomodoro.selectedMinutes = validMins;
  pomodoroRun.status = 'idle';
  pomodoroRun.durationSec = validMins * 60;
  pomodoroRun.remainingSec = validMins * 60;
  savePetState();
  syncPomodoroUI();
}

function setPomodoroTaskTag(rawTag) {
  player.pomodoro.taskTag = sanitizeTaskTag(rawTag);
  savePetState();
  syncPomodoroUI();
}

function startPomodoroSession() {
  if (gameMode !== 'pet') switchMode('pet');
  if (goodnightRun.status === 'running' || goodnightRun.status === 'paused') {
    cancelGoodnightSession(true);
  }
  if (pomodoroTaskInputEl) {
    player.pomodoro.taskTag = sanitizeTaskTag(pomodoroTaskInputEl.value);
  }
  const mins = player.pomodoro.selectedMinutes || 25;
  pomodoroRun.status = 'running';
  pomodoroRun.durationSec = mins * 60;
  pomodoroRun.remainingSec = mins * 60;
  pomodoroRun.encourageTimer = 18;
  pomodoroRun.halfwayNotified = false;
  pomodoroRun.lastRewardSummary = '';

  setNapping(false);
  cancelRpsGame();
  cancelPalmCatchGame();
  dismissTopicCard();
  dismissTeatimeCard();
  dismissWeeklyJournalCard();
  dismissTerrariumCard();
  foldOrHideGoodnightCard();
  dismissCollageCard();
  foldOrHideCozyRadioCard();
  dismissCrochetCard();
  dismissHotCocoaCard();
  dismissPressedFlowerCard();
  dismissTelescopeCard(); dismissAr10Cards(); dismissAr11Cards(); dismissAr12Cards(); dismissAr13Cards(); dismissAr14Cards(); dismissAr15Cards(); dismissAr16Cards();
  player.teaPlatterTimer = 0;
  if (player.y < H * 0.68 - 26) {
    player.y = H * 0.68 - 25;
    player.vy = 0;
    player.onGround = true;
    player.standingPlat = null;
  }
  player.vx = 0;
  player.wanderTargetX = null;
  player.isFocusStudying = true;
  player.petAction = 'focus_study';
  player.idleTime = 0;

  savePetState();
  syncPomodoroUI();
  playSfx('star');
  spawnInteractVfx(player.x, player.y - 24, 'sparkle', 6);
  setPlayerEmote(`「${player.pomodoro.taskTag}」专注开始啦，我在桌畔安静看书陪你~`, 2.6, 'happy', false);
}

function togglePausePomodoro() {
  if (pomodoroRun.status === 'running') {
    pomodoroRun.status = 'paused';
    player.isFocusStudying = false;
    player.petAction = 'idle';
    syncPomodoroUI();
    setPlayerEmote('先暂停歇口气，喝口温水随时继续哟~', 2.0, null, false);
  } else if (pomodoroRun.status === 'paused') {
    pomodoroRun.status = 'running';
    setNapping(false);
    player.vx = 0;
    player.wanderTargetX = null;
    player.isFocusStudying = true;
    player.petAction = 'focus_study';
    syncPomodoroUI();
    setPlayerEmote(`回来继续专注「${player.pomodoro.taskTag}」啦，我陪着你~`, 2.2, 'happy', false);
  }
}

function cancelPomodoroSession() {
  if (pomodoroRun.status !== 'running' && pomodoroRun.status !== 'paused') return;
  pomodoroRun.status = 'idle';
  pomodoroRun.durationSec = (player.pomodoro.selectedMinutes || 25) * 60;
  pomodoroRun.remainingSec = pomodoroRun.durationSec;
  pomodoroRun.halfwayNotified = false;
  player.isFocusStudying = false;
  player.petAction = 'idle';
  syncPomodoroUI();
  setPlayerEmote('这轮专注先收起啦，随时可以重新开始~', 1.9, null, false);
}

function completePomodoroSession(refDate = new Date()) {
  const mins = player.pomodoro.selectedMinutes || 25;
  const tag = player.pomodoro.taskTag || '敲代码';
  const stampsEarned = mins >= 45 ? 2 : 1;
  const baseXp = mins >= 45 ? 90 : mins >= 25 ? 55 : 35;
  const baseCoins = mins >= 45 ? 75 : mins >= 25 ? 45 : 28;

  const todayKey = formatLocalDateKey(refDate);
  const prevKey = getPrevDateKey(refDate);
  if (player.pomodoro.lastCompletedDate !== todayKey) {
    player.pomodoro.streakDays =
      player.pomodoro.lastCompletedDate === prevKey
        ? Math.max(1, (player.pomodoro.streakDays || 0) + 1)
        : 1;
    player.pomodoro.lastCompletedDate = todayKey;
  } else {
    player.pomodoro.streakDays = Math.max(1, player.pomodoro.streakDays || 1);
  }
  player.pomodoro.todaySessions =
    (player.pomodoro.todayDate === todayKey ? player.pomodoro.todaySessions || 0 : 0) + 1;
  player.pomodoro.todayDate = todayKey;
  player.pomodoro.totalStamps = (player.pomodoro.totalStamps || 0) + stampsEarned;
  player.pomodoro.completedSessions = (player.pomodoro.completedSessions || 0) + 1;
  player.pomodoro.totalFocusMinutes = (player.pomodoro.totalFocusMinutes || 0) + mins;

  const streakBonusCoins = player.pomodoro.streakDays >= 2 ? 10 : 0;
  const totalCoinReward = baseCoins + streakBonusCoins;

  pomodoroRun.status = 'completed';
  pomodoroRun.remainingSec = 0;
  pomodoroRun.lastRewardSummary = `完成 ${mins} 分钟「${tag}」！盖下 +${stampsEarned} 枚专注印章，奖励已入账~`;

  player.isFocusStudying = false;
  player.petAction = 'idle';
  player.cheerTimer = 2.8;

  playSfx('star');
  spawnInteractVfx(player.x, player.y - 28, 'love', 12);
  addCoins(totalCoinReward, player.x + 22, player.y - 50, '专注 ');
  addAffectionXp(baseXp, `专注达成 +${baseXp} 亲密`);
  recordJournalActivity('focusMins', mins, refDate);
  savePetState();
  if (gameMode === 'pet') {
    pomodoroCardEl?.classList.remove('hidden');
  }
  syncPomodoroUI();
  setPlayerEmote(
    `太棒啦！「${tag}」${mins}分钟达成，盖上专注印章奖励你~`,
    3.4,
    'cheer',
    true
  );
}

function advancePomodoroTime(dtSec, refDate = new Date()) {
  if (pomodoroRun.status !== 'running' || dtSec <= 0) return;
  const prevSec = Math.ceil(pomodoroRun.remainingSec);
  pomodoroRun.remainingSec = Math.max(0, pomodoroRun.remainingSec - dtSec);

  if (
    !pomodoroRun.halfwayNotified &&
    pomodoroRun.durationSec >= 60 &&
    pomodoroRun.remainingSec > 0 &&
    pomodoroRun.remainingSec <= pomodoroRun.durationSec * 0.5
  ) {
    pomodoroRun.halfwayNotified = true;
    pomodoroRun.encourageTimer = 20;
    if (player.emoteTimer <= 0.2) {
      setPlayerEmote(
        `「${player.pomodoro.taskTag}」已经稳稳过半啦，保持节奏超棒~`,
        2.6,
        null,
        false
      );
    }
  } else if (pomodoroRun.remainingSec > 4) {
    pomodoroRun.encourageTimer -= dtSec;
    if (pomodoroRun.encourageTimer <= 0) {
      pomodoroRun.encourageTimer = 22 + (pomodoroRun.encourageIdx % 3) * 4;
      const fn =
        POMODORO_ENCOURAGEMENTS[pomodoroRun.encourageIdx % POMODORO_ENCOURAGEMENTS.length];
      pomodoroRun.encourageIdx += 1;
      if (player.emoteTimer <= 0.1) {
        const pShort = getPeriodSpec(player.windowAmbience.period).short;
        setPlayerEmote(fn(player.pomodoro.taskTag, pShort), 2.5, null, false);
      }
    }
  }

  if (pomodoroRun.remainingSec <= 0) {
    completePomodoroSession(refDate);
    return;
  }

  if (Math.ceil(pomodoroRun.remainingSec) !== prevSec) {
    syncPomodoroUI();
  }
}

function updatePomodoroCompanion(dt) {
  if (pomodoroRun.status === 'running') {
    advancePomodoroTime(dt);
  }
}

if (pomodoroCardEl) {
  pomodoroCardEl.addEventListener('pointerdown', (e) => e.stopPropagation());
}
bindHudTap(btnPomodoroDockEl, () => {
  togglePomodoroCard();
});
bindHudTap(pomodoroMiniPillEl, () => {
  openPomodoroCard();
  playSfx('pat');
});
bindHudTap(document.getElementById('btn-pomo-close'), () => {
  foldOrHidePomodoroCard();
});
bindHudTap(btnPomoFoldEl, () => {
  foldOrHidePomodoroCard();
});
bindHudTap(btnPomoStartEl, () => {
  startPomodoroSession();
});
bindHudTap(btnPomoPauseEl, () => {
  togglePausePomodoro();
});
bindHudTap(btnPomoCancelEl, () => {
  cancelPomodoroSession();
});
document.querySelectorAll('#pomodoro-presets-row .pomo-preset-btn').forEach((btn) => {
  bindHudTap(btn, () => {
    selectPomodoroPreset(Number(btn.dataset.mins));
  });
});
document.querySelectorAll('#pomodoro-tag-chips .pomo-tag-chip').forEach((chip) => {
  bindHudTap(chip, () => {
    const tag = chip.dataset.tag || '敲代码';
    if (pomodoroTaskInputEl) pomodoroTaskInputEl.value = tag;
    setPomodoroTaskTag(tag);
  });
});
if (pomodoroTaskInputEl) {
  pomodoroTaskInputEl.addEventListener('pointerdown', (e) => e.stopPropagation());
  pomodoroTaskInputEl.addEventListener('keydown', (e) => e.stopPropagation());
  pomodoroTaskInputEl.addEventListener('input', () => {
    setPomodoroTaskTag(pomodoroTaskInputEl.value);
  });
}

syncWindowAmbienceUI();
syncPomodoroUI();

// 暴露 AR-4 自动化真机测试与快速快进检视钩子
window.__AR4_DEBUG__ = {
  fastForwardPomodoro(seconds = 1500, customDateIso = '') {
    const refDate = customDateIso ? new Date(customDateIso) : new Date();
    advancePomodoroTime(Math.max(0, Number(seconds) || 0), refDate);
    return this.getState();
  },
  setWindowAmbience(opts = {}, announce = false) {
    return setWindowAmbienceState(opts, announce);
  },
  deriveClockAmbience(isoStr) {
    return deriveClockWindowAmbience(isoStr ? new Date(isoStr) : new Date());
  },
  getState() {
    return {
      windowAmbience: { ...player.windowAmbience },
      visionAmbience: vision.getWindowAmbience(),
      isDarkRoom: vision.isDarkRoom,
      pomodoro: { ...player.pomodoro },
      pomodoroRun: {
        status: pomodoroRun.status,
        durationSec: pomodoroRun.durationSec,
        remainingSec: pomodoroRun.remainingSec
      },
      isFocusStudying: Boolean(player.isFocusStudying),
      petAction: player.petAction,
      emote: player.emote,
      level: player.level,
      xp: player.xp,
      coins: player.coins
    };
  }
};

// ================= AR-5 治愈下午茶甜点手作台 & 陪伴心情手账周报 =================
const TEA_BASES = {
  peach_oolong: {
    id: 'peach_oolong',
    name: '蜜桃乌龙',
    img: './assets/tea_peach_oolong.webp?v=hd31'
  },
  blueberry_foam: {
    id: 'blueberry_foam',
    name: '海盐奶盖蓝莓',
    img: './assets/tea_blueberry_foam.webp?v=hd31'
  },
  osmanthus_milk: {
    id: 'osmanthus_milk',
    name: '桂花牛乳茶',
    img: './assets/tea_osmanthus_milk.webp?v=hd31'
  }
};

const TEA_PASTRIES = {
  souffle: {
    id: 'souffle',
    name: '草莓舒芙蕾',
    img: './assets/pastry_souffle.webp?v=hd31'
  },
  whale_macaron: {
    id: 'whale_macaron',
    name: '蓝鲸马卡龙',
    img: './assets/pastry_whale_macaron.webp?v=hd31'
  },
  pudding_tart: {
    id: 'pudding_tart',
    name: '焦糖布丁挞',
    img: './assets/pastry_pudding_tart.webp?v=hd31'
  }
};

const AFTERNOON_TEA_RECIPES = [
  {
    id: 'peach_oolong__souffle',
    teaId: 'peach_oolong',
    pastryId: 'souffle',
    name: '桃云舒芙蕾特调',
    buffTitle: '元气攻速饮',
    note: '清甜白桃乌龙映衬蓬松草莓舒芙蕾，入口即化满溢春日甜香。',
    reaction: '哇！蜜桃乌龙配蓬松草莓舒芙蕾，甜滋滋充满干劲啦 ^w^!',
    mood: 'cheer',
    magnetBonusPct: 0.35,
    attackHastePct: 0.34,
    startingShield: 35,
    coinBonusPct: 0.22
  },
  {
    id: 'peach_oolong__whale_macaron',
    teaId: 'peach_oolong',
    pastryId: 'whale_macaron',
    name: '桃汐蓝鲸马卡龙席',
    buffTitle: '星汐全吸力',
    note: '琥珀蜜桃茶汤搭配胖乎乎蓝鲸马卡龙，星海甜度满分。',
    reaction: '是蓝鲸马卡龙耶！一口桃香一口香草奶油，幸福得想转圈圈~',
    mood: 'cheer',
    magnetBonusPct: 0.95,
    attackHastePct: 0.25,
    startingShield: 40,
    coinBonusPct: 0.24
  },
  {
    id: 'peach_oolong__pudding_tart',
    teaId: 'peach_oolong',
    pastryId: 'pudding_tart',
    name: '蜜桃焦糖琥珀茶席',
    buffTitle: '蜜桃招财席',
    note: '焙火乌龙回甘化解焦糖布丁甜腻，酥脆曲奇挞底回味无穷。',
    reaction: '焦糖布丁滑溜溜的，再抿一口蜜桃乌龙，烦恼全飞走咯~',
    mood: 'happy',
    magnetBonusPct: 0.40,
    attackHastePct: 0.22,
    startingShield: 35,
    coinBonusPct: 0.38
  },
  {
    id: 'blueberry_foam__souffle',
    teaId: 'blueberry_foam',
    pastryId: 'souffle',
    name: '海盐莓果云朵茶席',
    buffTitle: '奶盖甜心盾',
    note: '绵密微咸海盐奶盖覆上鲜果茶，配热乎草莓舒芙蕾层次丰富。',
    reaction: '咸甜芝士奶盖蹭到鼻尖啦，配草莓舒芙蕾软乎乎超治愈~',
    mood: 'happy',
    magnetBonusPct: 0.40,
    attackHastePct: 0.26,
    startingShield: 65,
    coinBonusPct: 0.22
  },
  {
    id: 'blueberry_foam__whale_macaron',
    teaId: 'blueberry_foam',
    pastryId: 'whale_macaron',
    name: '深海星莓蓝鲸茶宴',
    buffTitle: '深海星鲸全能',
    note: '蓝莓奶盖与天蓝鲸鱼马卡龙梦幻同色，宛如把深海甜品屋搬上书桌。',
    reaction: '海盐蓝莓遇上蓝鲸马卡龙，像把整片星海甜品屋端上桌啦 ^w^!',
    mood: 'cheer',
    magnetBonusPct: 0.85,
    attackHastePct: 0.24,
    startingShield: 60,
    coinBonusPct: 0.28
  },
  {
    id: 'blueberry_foam__pudding_tart',
    teaId: 'blueberry_foam',
    pastryId: 'pudding_tart',
    name: '芝士蓝莓布丁昼茶',
    buffTitle: '坚韧奶盖盾',
    note: '咸香芝士奶盖碰撞浓郁焦糖蛋奶布丁，午后续航护体拉满。',
    reaction: '微咸海盐奶盖中和了焦糖甜香，主人的手艺可以开甜品店啦!',
    mood: 'proud',
    magnetBonusPct: 0.45,
    attackHastePct: 0.20,
    startingShield: 75,
    coinBonusPct: 0.26
  },
  {
    id: 'osmanthus_milk__souffle',
    teaId: 'osmanthus_milk',
    pastryId: 'souffle',
    name: '金桂浮云舒芙蕾席',
    buffTitle: '桂香疾风饮',
    note: '金秋丹桂慢煮鲜牛乳，伴着云朵松饼热气腾腾暖透指尖。',
    reaction: '暖呼呼的桂花牛乳香飘满书桌啦，整个人都暖洋洋的~',
    mood: 'happy',
    magnetBonusPct: 0.55,
    attackHastePct: 0.40,
    startingShield: 40,
    coinBonusPct: 0.22
  },
  {
    id: 'osmanthus_milk__whale_macaron',
    teaId: 'osmanthus_milk',
    pastryId: 'whale_macaron',
    name: '桂月星鲸牛乳茶席',
    buffTitle: '桂月聚宝吸',
    note: '丝滑桂花鲜奶浸润杏仁小圆饼，甜润芬芳引来漫天星光宝石。',
    reaction: '桂花香裹着蓝鲸马卡龙的杏仁甜，我宣布这是今日最佳下午茶!',
    mood: 'cheer',
    magnetBonusPct: 1.05,
    attackHastePct: 0.22,
    startingShield: 45,
    coinBonusPct: 0.34
  },
  {
    id: 'osmanthus_milk__pudding_tart',
    teaId: 'osmanthus_milk',
    pastryId: 'pudding_tart',
    name: '丹桂焦糖暖心茶宴',
    buffTitle: '金桂满贯赏',
    note: '金桂牛乳配琥珀焦糖布丁挞，双倍暖金甜意让打工赏金节节高升。',
    reaction: '金灿灿的丹桂牛乳配焦糖布丁挞，打工干劲直接翻倍咯!',
    mood: 'proud',
    magnetBonusPct: 0.50,
    attackHastePct: 0.24,
    startingShield: 55,
    coinBonusPct: 0.45
  }
];

const JOURNAL_MOODS = {
  bliss: { id: 'bliss', label: '甜心', img: './assets/ui_mood_blush.webp?v=hd31' },
  focus: { id: 'focus', label: '专注', img: './assets/ui_stamp_focus.webp?v=hd31' },
  cozy: { id: 'cozy', label: '茶歇', img: './assets/ui_btn_teatime.webp?v=hd31' },
  star: { id: 'star', label: '星梦', img: './assets/ui_pin_star.webp?v=hd31' },
  goodnight: { id: 'goodnight', label: '好梦', img: './assets/stamp_goodnight_moon.webp?v=hd31' }
};

const WEEKLY_GIFT_TIERS = [
  {
    id: 'tier1',
    name: '暖心初遇礼盒',
    reqStamps: 1,
    reqScore: 3,
    reqLabel: '1章 或 热度3',
    coins: 35,
    xp: 30,
    img: './assets/ui_btn_weekly_journal.webp?v=hd31'
  },
  {
    id: 'tier2',
    name: '蜜糖茶会礼盒',
    reqStamps: 3,
    reqScore: 8,
    reqLabel: '3章 或 热度8',
    coins: 65,
    xp: 55,
    img: './assets/tea_platter_signature.webp?v=hd31'
  },
  {
    id: 'tier3',
    name: '星海满贯礼盒',
    reqStamps: 5,
    reqScore: 15,
    reqLabel: '5章 或 热度15',
    coins: 110,
    xp: 95,
    img: './assets/ui_stamp_focus.webp?v=hd31'
  }
];

const teatimeCardEl = document.getElementById('teatime-card');
const teatimeCodexPillEl = document.getElementById('teatime-codex-pill');
const teatimePrevTeaIcoEl = document.getElementById('teatime-prev-tea-ico');
const teatimePrevPastryIcoEl = document.getElementById('teatime-prev-pastry-ico');
const teatimeRecipeNameEl = document.getElementById('teatime-recipe-name');
const teatimeRecipeStatusEl = document.getElementById('teatime-recipe-status');
const teatimeRecipeNoteEl = document.getElementById('teatime-recipe-note');
const teatimeBuffTagsEl = document.getElementById('teatime-buff-tags');
const teatimeActiveBuffBarEl = document.getElementById('teatime-active-buff-bar');
const teatimeCodexGridEl = document.getElementById('teatime-codex-grid');
const btnTeatimeDockEl = document.getElementById('btn-teatime');
const btnTeatimeGoShiftEl = document.getElementById('btn-teatime-go-shift');
const teatimeBuffPillEl = document.getElementById('teatime-buff-pill');
const teatimeBuffPillLabelEl = document.getElementById('teatime-buff-pill-label');
const teatimeBuffPillClockEl = document.getElementById('teatime-buff-pill-clock');

const weeklyJournalCardEl = document.getElementById('weekly-journal-card');
const btnWeeklyJournalEl = document.getElementById('btn-weekly-journal');
const hudJournalBadgeEl = document.getElementById('hud-journal-badge');
const journalStampSummaryEl = document.getElementById('journal-stamp-summary');
const journal7DayStripEl = document.getElementById('journal-7day-strip');
const journalCompanionQuoteEl = document.getElementById('journal-companion-quote');
const btnJournalStampTodayEl = document.getElementById('btn-journal-stamp-today');
const journalMetricsGridEl = document.getElementById('journal-metrics-grid');
const journalScoreHintEl = document.getElementById('journal-score-hint');
const journalGiftRowEl = document.getElementById('journal-gift-row');

function getSafePolaroidAlbumCount() {
  try {
    return Array.isArray(polaroidAlbum) ? polaroidAlbum.length : 0;
  } catch {
    return 0;
  }
}

function getAfternoonTeaRecipe(teaId, pastryId) {
  const id = `${teaId}__${pastryId}`;
  return AFTERNOON_TEA_RECIPES.find((r) => r.id === id) || AFTERNOON_TEA_RECIPES[1];
}

function ensureJournalDayEntry(dateKey) {
  if (!player.weeklyJournal.days[dateKey]) {
    player.weeklyJournal.days[dateKey] = {
      feeds: 0,
      chats: 0,
      snaps: 0,
      focusMins: 0,
      teas: 0,
      shifts: 0,
      sleepMins: 0,
      plantCares: 0,
      radioMins: 0,
      collages: 0,
      cocoas: 0,
      knits: 0,
      presses: 0,
      stargazes: 0,
      paints: 0,
      letters: 0,
      bentos: 0,
      puzzles: 0,
      kittens: 0,
      cards: 0,
      picnics: 0,
      picnicPreps: 0,
      diaries: 0,
      potteries: 0,
      aromas: 0,
      stars: 0,
      rains: 0,
      embroideries: 0,
      snacks: 0,
      stamped: false,
      moodId: player.weeklyJournal.selectedMood || 'bliss'
    };
  }
  const allKeys = Object.keys(player.weeklyJournal.days).sort();
  while (allKeys.length > 24) {
    const oldest = allKeys.shift();
    delete player.weeklyJournal.days[oldest];
  }
  return player.weeklyJournal.days[dateKey];
}

function deriveAutoMoodForType(type) {
  if (type === 'sleepMins') return 'goodnight';
  // AR-14 调香：当天第一件事是点香时，心情章就盖成这瓶香氛的心情
  if (type === 'aromas') {
    const am = player.aromaTable && player.aromaTable.active;
    return am && JOURNAL_MOODS[am.moodId] ? am.moodId : player.weeklyJournal.selectedMood || 'bliss';
  }
  // AR-15 星空投影：睡前点亮记成「好梦」，其余时候是「星梦」；窗边听雨是「茶歇」般的放松
  if (type === 'stars') return isStarBedtime(ar15Clock.date()) ? 'goodnight' : 'star';
  // AR-16 刺绣是安安静静的「茶歇」时光；围炉分松饼是甜甜的「甜心」
  if (type === 'embroideries') return 'cozy';
  if (type === 'snacks') return 'bliss';
  if (type === 'focusMins') return 'focus';
  if (
    type === 'rains' ||
    type === 'teas' ||
    type === 'plantCares' ||
    type === 'radioMins' ||
    type === 'cocoas' ||
    type === 'knits' ||
    type === 'presses' ||
    type === 'paints' ||
    type === 'bentos' ||
    type === 'kittens' ||
    type === 'diaries' ||
    type === 'potteries'
  ) {
    return 'cozy';
  }
  if (type === 'snaps' || type === 'shifts' || type === 'collages' || type === 'stargazes' || type === 'puzzles') return 'star';
  if (type === 'letters' || type === 'cards' || type === 'picnics' || type === 'picnicPreps') return 'bliss';
  return player.weeklyJournal.selectedMood || 'bliss';
}

function recordJournalActivity(type, amount = 1, refDate = new Date()) {
  const val = Math.max(0, Number(amount) || 0);
  if (val <= 0) return;
  const dKey = formatLocalDateKey(refDate);
  const entry = ensureJournalDayEntry(dKey);
  if (type in entry) {
    entry[type] = (entry[type] || 0) + val;
  } else if (
    type === 'sleepMins' ||
    type === 'plantCares' ||
    type === 'radioMins' ||
    type === 'collages' ||
    type === 'cocoas' ||
    type === 'knits' ||
    type === 'presses' ||
    type === 'stargazes' ||
    type === 'paints' ||
    type === 'letters' ||
    type === 'bentos' ||
    type === 'puzzles' ||
    type === 'kittens' ||
    type === 'cards' ||
    type === 'picnics' ||
    type === 'picnicPreps' ||
    type === 'diaries' ||
    type === 'potteries' ||
    type === 'aromas' ||
    type === 'stars' ||
    type === 'rains' ||
    type === 'embroideries' ||
    type === 'snacks'
  ) {
    entry[type] = (entry[type] || 0) + val;
  }
  if (!entry.stamped) {
    entry.stamped = true;
    entry.moodId = deriveAutoMoodForType(type);
  } else if (type === 'sleepMins') {
    entry.moodId = 'goodnight';
  }
  const cum = player.weeklyJournal.cumulative;
  if (type === 'feeds') cum.totalFeeds = (cum.totalFeeds || 0) + val;
  else if (type === 'chats') cum.totalChats = Math.max((cum.totalChats || 0) + val, player.topicsChatted || 0);
  else if (type === 'snaps') cum.totalSnaps = Math.max((cum.totalSnaps || 0) + val, getSafePolaroidAlbumCount());
  else if (type === 'focusMins') {
    cum.totalFocusMins = Math.max((cum.totalFocusMins || 0) + val, player.pomodoro.totalFocusMinutes || 0);
  } else if (type === 'teas') {
    cum.totalTeas = Math.max((cum.totalTeas || 0) + val, player.afternoonTea.totalServed || 0);
  } else if (type === 'shifts') {
    cum.totalShifts = (cum.totalShifts || 0) + val;
  } else if (type === 'sleepMins') {
    cum.totalSleepMins = Math.max(
      (cum.totalSleepMins || 0) + val,
      player.goodnightMusicbox?.totalSleepMinutes || 0
    );
  } else if (type === 'plantCares') {
    cum.totalPlantCares = Math.max(
      (cum.totalPlantCares || 0) + val,
      player.terrarium?.totalCares || 0
    );
  } else if (type === 'radioMins') {
    cum.totalRadioMins = Math.max(
      (cum.totalRadioMins || 0) + val,
      player.cozyRadio?.totalListenMinutes || 0
    );
  } else if (type === 'collages') {
    cum.totalCollages = Math.max(
      (cum.totalCollages || 0) + val,
      player.collageKeepsake?.savedCount || 0
    );
  } else if (type === 'cocoas') {
    cum.totalCocoas = Math.max(
      (cum.totalCocoas || 0) + val,
      player.hotCocoa?.totalServed || 0
    );
  } else if (type === 'knits') {
    cum.totalKnits = Math.max(
      (cum.totalKnits || 0) + val,
      player.crochetBasket?.totalStitches || 0
    );
  } else if (type === 'presses') {
    cum.totalPresses = Math.max(
      (cum.totalPresses || 0) + val,
      player.pressedFlowers?.totalPresses || 0
    );
  } else if (type === 'stargazes') {
    cum.totalStargazes = Math.max(
      (cum.totalStargazes || 0) + val,
      player.telescope?.totalSessions || 0
    );
  } else if (type === 'paints') {
    cum.totalPaints = Math.max(
      (cum.totalPaints || 0) + val,
      player.watercolor?.totalPaintings || 0
    );
  } else if (type === 'letters') {
    cum.totalLetters = Math.max(
      (cum.totalLetters || 0) + val,
      player.mailbox?.totalReplies || 0
    );
  } else if (type === 'bentos') {
    cum.totalBentos = Math.max(
      (cum.totalBentos || 0) + val,
      player.bentoKitchen?.totalBentos || 0
    );
  } else if (type === 'puzzles') {
    cum.totalPuzzles = Math.max(
      (cum.totalPuzzles || 0) + val,
      player.memoryPuzzle?.totalPuzzles || 0
    );
  } else if (type === 'kittens') {
    cum.totalKittenCares = Math.max(
      (cum.totalKittenCares || 0) + val,
      (player.kittenCorner?.totalFeeds || 0) + (player.kittenCorner?.totalPets || 0)
    );
  } else if (type === 'cards') {
    cum.totalCards = Math.max(
      (cum.totalCards || 0) + val,
      player.greetingCards?.totalCards || 0
    );
  } else if (type === 'picnics') {
    cum.totalPicnics = Math.max((cum.totalPicnics || 0) + val, player.picnicBasket?.totalPicnics || 0);
  } else if (type === 'picnicPreps') {
    cum.totalPicnicPreps = Math.max((cum.totalPicnicPreps || 0) + val, player.picnicBasket?.totalPreps || 0);
  } else if (type === 'diaries') {
    cum.totalDiaryStickers = Math.max((cum.totalDiaryStickers || 0) + val, player.diaryBook?.totalStickers || 0);
  } else if (type === 'potteries') {
    cum.totalPotteries = Math.max((cum.totalPotteries || 0) + val, player.potteryWheel?.totalPieces || 0);
  } else if (type === 'aromas') {
    cum.totalAromas = Math.max((cum.totalAromas || 0) + val, player.aromaTable?.totalBlends || 0);
  } else if (type === 'stars') {
    cum.totalStars = Math.max((cum.totalStars || 0) + val, player.starProjector?.totalLights || 0);
  } else if (type === 'rains') {
    cum.totalRains = Math.max((cum.totalRains || 0) + val, player.rainCorner?.totalNotes || 0);
  } else if (type === 'embroideries') {
    cum.totalEmbroideries = Math.max((cum.totalEmbroideries || 0) + val, player.embroideryHoop?.totalPieces || 0);
  } else if (type === 'snacks') {
    cum.totalSnacks = Math.max((cum.totalSnacks || 0) + val, player.hearthCorner?.totalSnacks || 0);
  }
  savePetState();
  syncWeeklyJournalUI(refDate);
}

function stampJournalToday(refDate = new Date(), customMoodId = '') {
  const dKey = formatLocalDateKey(refDate);
  const entry = ensureJournalDayEntry(dKey);
  const moodId = JOURNAL_MOODS[customMoodId] ? customMoodId : player.weeklyJournal.selectedMood || 'bliss';
  player.weeklyJournal.selectedMood = moodId;
  const wasStamped = Boolean(entry.stamped);
  entry.stamped = true;
  entry.moodId = moodId;
  playSfx('star');
  spawnInteractVfx(player.x, player.y - 24, 'love', 7);
  if (!wasStamped) {
    addCoins(12, player.x + 14, player.y - 44, '心情章 ');
    addAffectionXp(15, '手账打卡 +15 亲密');
    setPlayerEmote(`咔哒！今日『${JOURNAL_MOODS[moodId].label}』陪伴心情章盖好啦~`, 2.4, 'happy', true);
  } else {
    setPlayerEmote(`已将今日手账印章换成了『${JOURNAL_MOODS[moodId].label}』款~`, 2.0, 'happy', false);
  }
  savePetState();
  syncWeeklyJournalUI(refDate);
}

function computeWeeklyJournalSummary(refDate = new Date()) {
  const dateKeys = getPast7DateKeys(refDate);
  const todayKey = dateKeys[dateKeys.length - 1];
  const weekKey = getWeekCycleKey(refDate);
  const claimedMap = player.weeklyJournal.claimedBoxesByWeek[weekKey] || {
    tier1: false,
    tier2: false,
    tier3: false
  };

  let stamps7d = 0;
  let feeds7d = 0;
  let chats7d = 0;
  let snaps7d = 0;
  let focusMins7d = 0;
  let teas7d = 0;
  let shifts7d = 0;
  let sleepMins7d = 0;
  let plantCares7d = 0;
  let radioMins7d = 0;
  let collages7d = 0;
  let cocoas7d = 0;
  let knits7d = 0;
  let presses7d = 0;
  let stargazes7d = 0;
  let paints7d = 0;
  let letters7d = 0;
  let bentos7d = 0;
  let puzzles7d = 0;
  let kittens7d = 0;
  let cards7d = 0;
  let picnics7d = 0;
  let picnicPreps7d = 0;
  let diaries7d = 0;
  let potteries7d = 0;
  let aromas7d = 0;
  let stars7d = 0;
  let rains7d = 0;
  let embroideries7d = 0;
  let snacks7d = 0;

  const daysList = dateKeys.map((k) => {
    const raw = player.weeklyJournal.days[k] || {};
    const stamped = Boolean(raw.stamped);
    const moodId = JOURNAL_MOODS[raw.moodId] ? raw.moodId : 'bliss';
    if (stamped) stamps7d += 1;
    feeds7d += Number(raw.feeds) || 0;
    chats7d += Number(raw.chats) || 0;
    snaps7d += Number(raw.snaps) || 0;
    focusMins7d += Number(raw.focusMins) || 0;
    teas7d += Number(raw.teas) || 0;
    shifts7d += Number(raw.shifts) || 0;
    sleepMins7d += Number(raw.sleepMins) || 0;
    plantCares7d += Number(raw.plantCares) || 0;
    radioMins7d += Number(raw.radioMins) || 0;
    collages7d += Number(raw.collages) || 0;
    cocoas7d += Number(raw.cocoas) || 0;
    knits7d += Number(raw.knits) || 0;
    presses7d += Number(raw.presses) || 0;
    stargazes7d += Number(raw.stargazes) || 0;
    paints7d += Number(raw.paints) || 0;
    letters7d += Number(raw.letters) || 0;
    bentos7d += Number(raw.bentos) || 0;
    puzzles7d += Number(raw.puzzles) || 0;
    kittens7d += Number(raw.kittens) || 0;
    cards7d += Number(raw.cards) || 0;
    picnics7d += Number(raw.picnics) || 0;
    picnicPreps7d += Number(raw.picnicPreps) || 0;
    diaries7d += Number(raw.diaries) || 0;
    potteries7d += Number(raw.potteries) || 0;
    aromas7d += Number(raw.aromas) || 0;
    stars7d += Number(raw.stars) || 0;
    rains7d += Number(raw.rains) || 0;
    embroideries7d += Number(raw.embroideries) || 0;
    snacks7d += Number(raw.snacks) || 0;
    return {
      dateKey: k,
      shortDate: k === todayKey ? '今日' : k.slice(5).replace('-', '/'),
      isToday: k === todayKey,
      stamped,
      moodId,
      moodSpec: JOURNAL_MOODS[moodId]
    };
  });

  const recipesDiscovered = Object.keys(player.afternoonTea.discoveredRecipes || {}).length;
  const cocoaBlendsDiscovered = Object.keys(player.hotCocoa?.discoveredBlends || {}).length;
  const botBless = getBotanicalBlessings();
  const crochetGuard = getCrochetWarmGuard();
  const pressedBless = getPressedFlowerBlessing();
  const starGuide = getStarGuidanceBonus();
  const focusWard = getWatercolorFocusWard();
  const heartfelt = getMailboxHeartfeltBonus();
  const bentoStats = getBentoKitchenStats();
  const memoryBonus = getMemoryPuzzleBonus();
  const kittenStats = getKittenCornerStats();
  const cardBless = getGreetingCardBlessing();
  const picnicStats = getPicnicStats(refDate);
  const diaryStats = getDiaryStats(refDate);
  const potteryStats = getPotteryStats(refDate);
  const aromaStats = getAromaStats(refDate);
  const starStats = getStarStats(refDate);
  const rainStats = getRainStats(refDate);
  const embroideryStats = getEmbroideryStats(refDate);
  const hearthStats = getHearthStats(refDate);
  const weeklyScore =
    feeds7d +
    chats7d * 2 +
    snaps7d * 2 +
    Math.floor(focusMins7d / 15) * 2 +
    teas7d * 2 +
    shifts7d * 2 +
    Math.floor(sleepMins7d / 15) * 2 +
    Math.floor(radioMins7d / 5) * 2 +
    collages7d * 2 +
    cocoas7d * 2 +
    knits7d * 2 +
    presses7d * 2 +
    stargazes7d * 2 +
    paints7d * 2 +
    letters7d * 2 +
    bentos7d * 2 +
    puzzles7d * 2 +
    kittens7d +
    cards7d * 2 +
    picnics7d * 3 +
    picnicPreps7d +
    diaries7d +
    potteries7d * 2 +
    aromas7d +
    stars7d * 2 +
    rains7d +
    embroideries7d * 2 +
    snacks7d +
    plantCares7d +
    recipesDiscovered +
    cocoaBlendsDiscovered +
    starGuide.count +
    focusWard.gallerySize +
    bentoStats.discovered +
    memoryBonus.distinct +
    kittenStats.met +
    cardBless.occasions;

  const cum = player.weeklyJournal.cumulative;
  const cumulative = {
    totalFeeds: Math.max(feeds7d, cum.totalFeeds || 0),
    totalChats: Math.max(chats7d, cum.totalChats || 0, player.topicsChatted || 0),
    totalSnaps: Math.max(snaps7d, cum.totalSnaps || 0, getSafePolaroidAlbumCount()),
    totalFocusMins: Math.max(focusMins7d, cum.totalFocusMins || 0, player.pomodoro.totalFocusMinutes || 0),
    recipesDiscovered,
    totalRecipes: AFTERNOON_TEA_RECIPES.length,
    totalTeas: Math.max(teas7d, cum.totalTeas || 0, player.afternoonTea.totalServed || 0),
    totalShifts: Math.max(shifts7d, cum.totalShifts || 0),
    totalSleepMins: Math.max(
      sleepMins7d,
      cum.totalSleepMins || 0,
      player.goodnightMusicbox?.totalSleepMinutes || 0
    ),
    totalGoodnightStamps: player.goodnightMusicbox?.totalStamps || 0,
    totalPlantCares: Math.max(plantCares7d, cum.totalPlantCares || 0, player.terrarium?.totalCares || 0),
    terrariumTotalLevel: botBless.totalLevel,
    totalRadioMins: Math.max(
      radioMins7d,
      cum.totalRadioMins || 0,
      player.cozyRadio?.totalListenMinutes || 0
    ),
    totalCollages: Math.max(
      collages7d,
      cum.totalCollages || 0,
      player.collageKeepsake?.savedCount || 0
    ),
    cocoaBlendsDiscovered,
    totalCocoaBlends: HOT_COCOA_BLENDS.length,
    totalCocoas: Math.max(
      cocoas7d,
      cum.totalCocoas || 0,
      player.hotCocoa?.totalServed || 0
    ),
    totalKnits: Math.max(
      knits7d,
      cum.totalKnits || 0,
      player.crochetBasket?.totalStitches || 0
    ),
    crochetTotalLevel: crochetGuard.totalLevel,
    totalPresses: Math.max(
      presses7d,
      cum.totalPresses || 0,
      player.pressedFlowers?.totalPresses || 0
    ),
    pressedTotalLevel: pressedBless.totalLevel,
    totalStargazes: Math.max(
      stargazes7d,
      cum.totalStargazes || 0,
      player.telescope?.totalSessions || 0
    ),
    constellationsCollected: starGuide.count,
    totalConstellations: starGuide.total,
    totalPaints: Math.max(
      paints7d,
      cum.totalPaints || 0,
      player.watercolor?.totalPaintings || 0
    ),
    gallerySize: focusWard.gallerySize,
    totalGallery: focusWard.total,
    totalLetters: Math.max(
      letters7d,
      cum.totalLetters || 0,
      player.mailbox?.totalReplies || 0
    ),
    stampKinds: heartfelt.stampKinds,
    totalStampKinds: heartfelt.totalStampKinds,
    totalBentos: Math.max(
      bentos7d,
      cum.totalBentos || 0,
      player.bentoKitchen?.totalBentos || 0
    ),
    bentoRecipes: bentoStats.discovered,
    totalBentoRecipes: bentoStats.totalRecipes,
    bentoBag: bentoStats.bagCount,
    totalPuzzles: Math.max(
      puzzles7d,
      cum.totalPuzzles || 0,
      player.memoryPuzzle?.totalPuzzles || 0
    ),
    memoryDistinct: memoryBonus.distinct,
    memoryWallCount: memoryBonus.wallCount,
    totalMemoryWall: memoryBonus.total,
    totalKittenCares: Math.max(
      kittens7d,
      cum.totalKittenCares || 0,
      kittenStats.totalFeeds + kittenStats.totalPets
    ),
    kittensMet: kittenStats.met,
    totalKittens: kittenStats.totalKittens,
    kittenAffection: kittenStats.totalAffection,
    maxKittenAffection: kittenStats.maxAffection,
    totalCards: Math.max(cards7d, cum.totalCards || 0, cardBless.totalCards),
    cardOccasions: cardBless.occasions,
    totalCardOccasions: cardBless.totalOccasions,
    totalPicnics: Math.max(picnics7d, cum.totalPicnics || 0, picnicStats.totalPicnics),
    totalPicnicPreps: Math.max(picnicPreps7d, cum.totalPicnicPreps || 0, picnicStats.totalPreps),
    picnicSpots: picnicStats.spotsVisited,
    totalPicnicSpots: picnicStats.totalSpots,
    diaryPages: diaryStats.written,
    diaryDecorated: diaryStats.decorated,
    totalDiaryStickers: Math.max(diaries7d, cum.totalDiaryStickers || 0, diaryStats.totalStickers),
    totalPotteries: Math.max(potteries7d, cum.totalPotteries || 0, potteryStats.totalPieces),
    potteryShelf: potteryStats.shelfCount,
    potteryCombos: potteryStats.combos,
    totalPotteryCombos: potteryStats.totalCombos,
    totalAromas: Math.max(aromas7d, cum.totalAromas || 0, aromaStats.totalBlends),
    aromaRecipes: aromaStats.discovered,
    totalAromaRecipes: aromaStats.totalRecipes,
    totalStars: Math.max(stars7d, cum.totalStars || 0, starStats.totalLights),
    starCards: starStats.collected,
    totalStarCards: starStats.totalCards,
    starDreams: starStats.totalDreams,
    totalRains: Math.max(rains7d, cum.totalRains || 0, rainStats.totalNotes),
    rainEntries: rainStats.entries,
    totalRainEntries: rainStats.totalEntries,
    totalEmbroideries: Math.max(embroideries7d, cum.totalEmbroideries || 0, embroideryStats.totalPieces),
    embroideryPatterns: embroideryStats.collected,
    totalEmbroideryPatterns: embroideryStats.totalPatterns,
    embroideryWall: embroideryStats.wallCount,
    totalSnacks: Math.max(snacks7d, cum.totalSnacks || 0, hearthStats.totalSnacks),
    snackEntries: hearthStats.entries,
    totalSnackEntries: hearthStats.totalEntries
  };

  const giftStates = WEEKLY_GIFT_TIERS.map((tier) => {
    const unlocked = stamps7d >= tier.reqStamps || weeklyScore >= tier.reqScore;
    const claimed = Boolean(claimedMap[tier.id]);
    return {
      ...tier,
      unlocked,
      claimed,
      claimable: unlocked && !claimed
    };
  });

  return {
    weekKey,
    todayKey,
    stamps7d,
    weeklyScore,
    feeds7d,
    chats7d,
    snaps7d,
    focusMins7d,
    teas7d,
    shifts7d,
    sleepMins7d,
    plantCares7d,
    radioMins7d,
    collages7d,
    cocoas7d,
    knits7d,
    presses7d,
    stargazes7d,
    paints7d,
    letters7d,
    bentos7d,
    puzzles7d,
    kittens7d,
    cards7d,
    picnics7d,
    picnicPreps7d,
    diaries7d,
    potteries7d,
    aromas7d,
    stars7d,
    rains7d,
    embroideries7d,
    snacks7d,
    daysList,
    cumulative,
    giftStates,
    claimableCount: giftStates.filter((g) => g.claimable).length
  };
}

function buildJournalCompanionQuote(summary) {
  if (summary.embroideries7d >= 1 || summary.snacks7d >= 1) {
    return `近7日和我一起绣了 ${summary.embroideries7d} 幅小刺绣挂上墙（绣样 ${summary.cumulative.embroideryPatterns}/${summary.cumulative.totalEmbroideryPatterns}），还在小暖炉边分着吃了 ${summary.snacks7d} 块烤松饼~`;
  }
  if (summary.stars7d >= 1 || summary.rains7d >= 1) {
    return `近7日睡前和我点亮了 ${summary.stars7d} 次星空投影（星座卡 ${summary.cumulative.starCards}/${summary.cumulative.totalStarCards} · 好梦章 ${summary.cumulative.starDreams}），还在窗边听雨记下 ${summary.rains7d} 则小记~`;
  }
  if (summary.potteries7d >= 1 || summary.aromas7d >= 1) {
    return `近7日陪我在窗畔转盘做了 ${summary.potteries7d} 件小陶器（陶艺图鉴 ${summary.cumulative.potteryCombos}/${summary.cumulative.totalPotteryCombos}），还按心情调了 ${summary.aromas7d} 次房间香氛~`;
  }
  if (summary.picnics7d >= 1 || summary.picnicPreps7d >= 1 || summary.diaries7d >= 1) {
    return `近7日一起准备野餐篮 ${summary.picnicPreps7d} 次、周末野餐 ${summary.picnics7d} 次，我的手写日记写满 ${summary.cumulative.diaryPages} 页，还贴了 ${summary.diaries7d} 次小贴纸~`;
  }
  if (summary.kittens7d >= 1 || summary.cards7d >= 1) {
    return `近7日窗台小猫被照顾了 ${summary.kittens7d} 次（好感 ${summary.cumulative.kittenAffection}/${summary.cumulative.maxKittenAffection}），还一起剪贴寄出 ${summary.cards7d} 张节日手作贺卡~`;
  }
  if (summary.bentos7d >= 1 || summary.puzzles7d >= 1) {
    return `近7日一起做了 ${summary.bentos7d} 份暖灯饭团便当、图鉴 ${summary.cumulative.bentoRecipes}/${summary.cumulative.totalBentoRecipes} 款，还拼好 ${summary.puzzles7d} 幅回忆拼图挂上回忆墙~`;
  }
  if (summary.paints7d >= 1 || summary.letters7d >= 1) {
    return `近7日陪我画了 ${summary.paints7d} 幅窗畔水彩、画廊收藏 ${summary.cumulative.gallerySize}/${summary.cumulative.totalGallery}，还互通了 ${summary.letters7d} 封手写信笺~`;
  }
  if (summary.stargazes7d >= 1 || summary.presses7d >= 1) {
    return `近7日窗畔观星 ${summary.stargazes7d} 次、星图收录 ${summary.cumulative.constellationsCollected}/${summary.cumulative.totalConstellations} 座，还压制了 Lv.${summary.cumulative.pressedTotalLevel}/9 干花书签~`;
  }
  if (summary.cocoas7d >= 1 || summary.knits7d >= 1) {
    return `近7日冲泡了 ${summary.cocoas7d} 杯棉花糖热可可，还编织了 Lv.${summary.cumulative.crochetTotalLevel}/9 暖绒手作织物~`;
  }
  if (summary.radioMins7d >= 5 || summary.collages7d >= 1) {
    return `近7日窗畔轻电台收听 ${summary.radioMins7d} 分钟，还装裱了 ${summary.cumulative.totalCollages} 帧手账贴纸纪念画框~`;
  }
  if (summary.sleepMins7d >= 15 || summary.plantCares7d >= 2) {
    return `近7日花房照料 ${summary.plantCares7d} 次，星空八音盒伴眠 ${summary.sleepMins7d} 分钟，每晚都有好梦火漆章相伴~`;
  }
  if (summary.teas7d >= 2 && summary.focusMins7d >= 15) {
    return `近7日陪主人专注了 ${summary.focusMins7d} 分钟，还品鉴了 ${summary.teas7d} 席手作下午茶，太幸福啦~`;
  }
  if (summary.cumulative.recipesDiscovered >= 5) {
    return `下午茶食谱已经解锁 ${summary.cumulative.recipesDiscovered}/9 款啦，主人就是神仙甜点师!`;
  }
  if (summary.stamps7d >= 3) {
    return `手账本上已经攒下 ${summary.stamps7d} 枚陪伴心情章，每天都有好好在一起呢~`;
  }
  if (summary.feeds7d + summary.chats7d + summary.snaps7d + summary.teas7d > 0) {
    return '把每一次投喂、谈心、合影与下午茶都珍藏进奶油手账周报里咯~';
  }
  return '今天也在书桌旁陪着主人，盖下今日心情章开启暖心周报吧~';
}

function claimWeeklyGiftBox(tierId, refDate = new Date()) {
  const summary = computeWeeklyJournalSummary(refDate);
  const target = summary.giftStates.find((g) => g.id === tierId);
  if (!target || !target.claimable) return false;
  if (!player.weeklyJournal.claimedBoxesByWeek[summary.weekKey]) {
    player.weeklyJournal.claimedBoxesByWeek[summary.weekKey] = {
      tier1: false,
      tier2: false,
      tier3: false
    };
  }
  player.weeklyJournal.claimedBoxesByWeek[summary.weekKey][tierId] = true;
  player.cheerTimer = 2.6;
  player.happyTimer = 2.6;
  playSfx('star');
  spawnInteractVfx(player.x, player.y - 28, 'love', 12);
  addCoins(target.coins, player.x + 20, player.y - 48, '周礼盒 ');
  addAffectionXp(target.xp, `${target.name} +${target.xp} 亲密`);
  setPlayerEmote(`拆开『${target.name}』啦！满满心意与金币收进小金库~`, 3.0, 'cheer', true);
  savePetState();
  syncWeeklyJournalUI(refDate);
  return true;
}

function syncWeeklyJournalUI(refDate = new Date()) {
  const summary = computeWeeklyJournalSummary(refDate);

  if (hudJournalBadgeEl) {
    hudJournalBadgeEl.textContent =
      summary.claimableCount > 0 ? `可领${summary.claimableCount}` : `${summary.stamps7d}/7章`;
  }
  if (btnWeeklyJournalEl) {
    btnWeeklyJournalEl.classList.toggle('has-gift', summary.claimableCount > 0);
  }
  if (journalStampSummaryEl) {
    journalStampSummaryEl.textContent = `近7日 ${summary.stamps7d}/7 章`;
  }
  if (journalScoreHintEl) {
    journalScoreHintEl.textContent = `本周互动热度 ${summary.weeklyScore}`;
  }
  if (journalCompanionQuoteEl) {
    journalCompanionQuoteEl.textContent = buildJournalCompanionQuote(summary);
  }

  document.querySelectorAll('#journal-mood-picker .journal-mood-chip').forEach((chip) => {
    chip.classList.toggle('active', chip.dataset.moodId === player.weeklyJournal.selectedMood);
  });

  const todayItem = summary.daysList[summary.daysList.length - 1];
  if (btnJournalStampTodayEl && todayItem) {
    btnJournalStampTodayEl.classList.toggle('is-stamped', todayItem.stamped);
    btnJournalStampTodayEl.textContent = todayItem.stamped ? '更新心情章' : '盖下今日章';
  }

  if (journal7DayStripEl) {
    journal7DayStripEl.innerHTML = summary.daysList
      .map(
        (d) => `
        <div class="journal-day-cell ${d.stamped ? 'stamped' : ''} ${d.isToday ? 'is-today' : ''}" data-date="${d.dateKey}">
          <span class="journal-day-date">${d.shortDate}</span>
          <img src="${d.moodSpec.img}" alt="" class="journal-day-seal" />
          <span class="journal-day-mood">${d.stamped ? d.moodSpec.label : '待盖章'}</span>
        </div>
      `
      )
      .join('');
  }

  if (journalMetricsGridEl) {
    const metrics = [
      {
        ico: './assets/ui_btn_watercolor_easel.webp?v=hd31',
        title: '水彩写生与信笺',
        val: `水彩 ${summary.paints7d} 幅`,
        sub: `画廊 ${summary.cumulative.gallerySize}/${summary.cumulative.totalGallery} · 信笺 ${summary.letters7d}封 · 投喂 ${summary.feeds7d}次`
      },
      {
        ico: './assets/ui_btn_kitten_corner.webp?v=hd31',
        title: '窗台小猫与贺卡',
        val: `小猫 ${summary.kittens7d} 次`,
        sub: `好感 ${summary.cumulative.kittenAffection}/${summary.cumulative.maxKittenAffection} · 贺卡 ${summary.cards7d}张 · 节日 ${summary.cumulative.cardOccasions}/${summary.cumulative.totalCardOccasions} · 轻电台 ${summary.radioMins7d}分 · 拼贴 ${summary.cumulative.totalCollages}帧 · 谈心 ${summary.chats7d}次`
      },
      {
        ico: './assets/ui_btn_telescope.webp?v=hd31',
        title: '星夜观星与伴眠',
        val: `观星 ${summary.stargazes7d} 次`,
        sub: `星图 ${summary.cumulative.constellationsCollected}/${summary.cumulative.totalConstellations} · 好梦章 ${summary.cumulative.totalGoodnightStamps}枚 · 星座卡 ${summary.cumulative.starCards}/${summary.cumulative.totalStarCards} · 听雨 ${summary.rains7d}则`
      },
      {
        ico: './assets/ui_btn_bento_kitchen.webp?v=hd31',
        title: '便当与回忆拼图',
        val: `便当 ${summary.bentos7d} 份`,
        sub: `图鉴 ${summary.cumulative.bentoRecipes}/${summary.cumulative.totalBentoRecipes} · 拼图 ${summary.puzzles7d}幅 · 回忆墙 ${summary.cumulative.memoryWallCount}/${summary.cumulative.totalMemoryWall} · 专注 ${summary.focusMins7d}分`
      },
      {
        ico: './assets/ui_btn_picnic_basket.webp?v=hd31',
        title: '周末野餐与日记',
        val: `野餐 ${summary.picnics7d} 次`,
        sub: `刺绣 ${summary.embroideries7d}幅 · 绣样 ${summary.cumulative.embroideryPatterns}/${summary.cumulative.totalEmbroideryPatterns} · 炉边点心 ${summary.snacks7d}份 · 装篮 ${summary.picnicPreps7d}次 · 地点 ${summary.cumulative.picnicSpots}/${summary.cumulative.totalPicnicSpots} · 日记 ${summary.cumulative.diaryPages}页 · 贴纸 ${summary.diaries7d}次 · 热可可 ${summary.cocoas7d}杯 · 可可 ${summary.cumulative.cocoaBlendsDiscovered}/6 · 茶谱 ${summary.cumulative.recipesDiscovered}/9`
      },
      {
        ico: './assets/ui_btn_pottery_wheel.webp?v=hd31',
        title: '陶艺香氛与手作篮',
        val: `陶艺 ${summary.potteries7d} 件`,
        sub: `香氛 ${summary.aromas7d}次 · 陶艺图鉴 ${summary.cumulative.potteryCombos}/${summary.cumulative.totalPotteryCombos} · 香氛图鉴 ${summary.cumulative.aromaRecipes}/${summary.cumulative.totalAromaRecipes} · 钩针 Lv.${summary.cumulative.crochetTotalLevel}/9 · 压花 Lv.${summary.cumulative.pressedTotalLevel}/9 · 花架 Lv.${summary.cumulative.terrariumTotalLevel}/15`
      }
    ];
    journalMetricsGridEl.innerHTML = metrics
      .map(
        (m) => `
        <div class="journal-metric-card">
          <img src="${m.ico}" alt="" class="journal-metric-ico" />
          <div class="journal-metric-body">
            <span class="journal-metric-title">${m.title}</span>
            <strong class="journal-metric-val">${m.val}</strong>
            <span class="journal-metric-sub">${m.sub}</span>
          </div>
        </div>
      `
      )
      .join('');
  }

  if (journalGiftRowEl) {
    journalGiftRowEl.innerHTML = '';
    for (const g of summary.giftStates) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `journal-gift-card ${g.claimable ? 'claimable' : ''} ${g.claimed ? 'claimed' : ''}`.trim();
      btn.dataset.giftTier = g.id;
      btn.disabled = !g.claimable;
      const ctaText = g.claimed
        ? '本周已拆封'
        : g.claimable
          ? `拆开 +${g.coins}金`
          : `奖励 +${g.coins}金`;
      btn.innerHTML = `
        <img src="${g.img}" alt="" class="journal-gift-ico" />
        <span class="journal-gift-name">${g.name}</span>
        <span class="journal-gift-req">${g.reqLabel}</span>
        <span class="journal-gift-cta">${ctaText}</span>
      `;
      if (g.claimable) {
        bindHudTap(btn, () => {
          claimWeeklyGiftBox(g.id);
        });
      }
      journalGiftRowEl.appendChild(btn);
    }
  }
}

function dismissWeeklyJournalCard() {
  weeklyJournalCardEl?.classList.add('hidden');
}

function openWeeklyJournalCard() {
  if (!weeklyJournalCardEl) return;
  if (gameMode !== 'pet') switchMode('pet');
  closeDrawer();
  dismissTopicCard();
  dismissWindowAmbienceCard();
  foldOrHidePomodoroCard();
  dismissTeatimeCard();
  dismissTerrariumCard();
  foldOrHideGoodnightCard();
  dismissCollageCard();
  foldOrHideCozyRadioCard();
  dismissCrochetCard();
  dismissHotCocoaCard();
  dismissPressedFlowerCard();
  dismissTelescopeCard(); dismissAr10Cards(); dismissAr11Cards(); dismissAr12Cards(); dismissAr13Cards(); dismissAr14Cards(); dismissAr15Cards(); dismissAr16Cards();
  dismissPolaroid();
  closeAlbumLightbox();
  syncWeeklyJournalUI();
  weeklyJournalCardEl.classList.remove('hidden');
}

function toggleWeeklyJournalCard() {
  if (!weeklyJournalCardEl) return;
  if (weeklyJournalCardEl.classList.contains('hidden')) {
    openWeeklyJournalCard();
    playSfx('pat');
  } else {
    dismissWeeklyJournalCard();
  }
}

function syncTeatimeUI() {
  const curTea = TEA_BASES[player.afternoonTea.selectedTea] || TEA_BASES.peach_oolong;
  const curPastry = TEA_PASTRIES[player.afternoonTea.selectedPastry] || TEA_PASTRIES.whale_macaron;
  const recipe = getAfternoonTeaRecipe(curTea.id, curPastry.id);
  const discoveredMap = player.afternoonTea.discoveredRecipes || {};
  const unlockedCount = Object.keys(discoveredMap).length;
  const isDiscovered = Boolean(discoveredMap[recipe.id]);
  const activeBuff = getActiveTeaShiftBuff();

  if (teatimeCodexPillEl) {
    teatimeCodexPillEl.textContent = `食谱 ${unlockedCount}/${AFTERNOON_TEA_RECIPES.length}`;
  }

  document.querySelectorAll('#teatime-base-grid .teatime-pick-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.teaBase === curTea.id);
  });
  document.querySelectorAll('#teatime-pastry-grid .teatime-pick-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.pastry === curPastry.id);
  });

  if (teatimePrevTeaIcoEl) teatimePrevTeaIcoEl.src = curTea.img;
  if (teatimePrevPastryIcoEl) teatimePrevPastryIcoEl.src = curPastry.img;
  if (teatimeRecipeNameEl) teatimeRecipeNameEl.textContent = recipe.name;
  if (teatimeRecipeStatusEl) {
    teatimeRecipeStatusEl.classList.toggle('is-new', !isDiscovered);
    teatimeRecipeStatusEl.textContent = isDiscovered
      ? `已收录 · 品鉴 ${discoveredMap[recipe.id].count} 次`
      : '新食谱 +首创奖';
  }
  if (teatimeRecipeNoteEl) teatimeRecipeNoteEl.textContent = recipe.note;

  if (teatimeBuffTagsEl) {
    teatimeBuffTagsEl.innerHTML = [
      `<span class="teatime-buff-chip">经验磁吸 +${Math.round(recipe.magnetBonusPct * 100)}%</span>`,
      `<span class="teatime-buff-chip">攻速疾行 +${Math.round(recipe.attackHastePct * 100)}%</span>`,
      `<span class="teatime-buff-chip">开局护盾 +${recipe.startingShield}</span>`,
      `<span class="teatime-buff-chip">打工金币 +${Math.round(recipe.coinBonusPct * 100)}%</span>`
    ].join('');
  }

  if (btnTeatimeGoShiftEl) {
    btnTeatimeGoShiftEl.classList.toggle('hidden', !activeBuff);
  }

  if (teatimeActiveBuffBarEl) {
    if (activeBuff) {
      const remClock = formatPomodoroClock(activeBuff.remainingSec);
      teatimeActiveBuffBarEl.classList.add('is-active');
      teatimeActiveBuffBarEl.textContent = `生效中：『${activeBuff.buffTitle}』(${remClock}) · 护盾+${activeBuff.startingShield} / 金币+${Math.round(activeBuff.coinBonusPct * 100)}%`;
    } else {
      teatimeActiveBuffBarEl.classList.remove('is-active');
      teatimeActiveBuffBarEl.textContent = '端上特调即可激活 7 分钟「幸存者打工」专属增益~';
    }
  }

  if (teatimeCodexGridEl) {
    teatimeCodexGridEl.innerHTML = '';
    for (const r of AFTERNOON_TEA_RECIPES) {
      const unlocked = Boolean(discoveredMap[r.id]);
      const selected = r.id === recipe.id;
      const pastrySpec = TEA_PASTRIES[r.pastryId] || TEA_PASTRIES.whale_macaron;
      const slot = document.createElement('button');
      slot.type = 'button';
      slot.className = `teatime-codex-slot ${unlocked ? 'unlocked' : ''} ${selected ? 'selected' : ''}`.trim();
      slot.dataset.recipeId = r.id;
      slot.title = unlocked ? `${r.name}（${r.buffTitle}）` : '待调配解锁的特调食谱';
      slot.innerHTML = `<img src="${pastrySpec.img}" alt="" />`;
      bindHudTap(slot, () => {
        player.afternoonTea.selectedTea = r.teaId;
        player.afternoonTea.selectedPastry = r.pastryId;
        savePetState();
        syncTeatimeUI();
      });
      teatimeCodexGridEl.appendChild(slot);
    }
  }

  if (btnTeatimeDockEl) {
    btnTeatimeDockEl.classList.toggle('has-buff', Boolean(activeBuff));
    btnTeatimeDockEl.classList.toggle(
      'active',
      Boolean(teatimeCardEl && !teatimeCardEl.classList.contains('hidden'))
    );
  }

  if (teatimeBuffPillEl) {
    const showPill = Boolean(gameMode === 'pet' && activeBuff);
    teatimeBuffPillEl.classList.toggle('hidden', !showPill);
    if (activeBuff) {
      if (teatimeBuffPillLabelEl) teatimeBuffPillLabelEl.textContent = activeBuff.buffTitle;
      if (teatimeBuffPillClockEl) {
        teatimeBuffPillClockEl.textContent = formatPomodoroClock(activeBuff.remainingSec);
      }
    }
  }
}

function selectTeaBase(teaId) {
  if (!TEA_BASES[teaId]) return;
  player.afternoonTea.selectedTea = teaId;
  playSfx('pat');
  savePetState();
  syncTeatimeUI();
}

function selectTeaPastry(pastryId) {
  if (!TEA_PASTRIES[pastryId]) return;
  player.afternoonTea.selectedPastry = pastryId;
  playSfx('pat');
  savePetState();
  syncTeatimeUI();
}

function serveAfternoonTeaSet(refDate = new Date()) {
  if (gameMode !== 'pet') switchMode('pet');
  const recipe = getAfternoonTeaRecipe(
    player.afternoonTea.selectedTea,
    player.afternoonTea.selectedPastry
  );
  const dateKey = formatLocalDateKey(refDate);
  const prevRec = player.afternoonTea.discoveredRecipes[recipe.id];
  const isFirstDiscovery = !prevRec;

  player.afternoonTea.discoveredRecipes[recipe.id] = {
    count: prevRec ? (prevRec.count || 1) + 1 : 1,
    firstDate: prevRec ? prevRec.firstDate : dateKey
  };
  player.afternoonTea.totalServed = (player.afternoonTea.totalServed || 0) + 1;

  const durationSec = 420;
  player.afternoonTea.activeBuff = {
    recipeId: recipe.id,
    name: recipe.name,
    buffTitle: recipe.buffTitle,
    magnetBonusPct: recipe.magnetBonusPct,
    attackHastePct: recipe.attackHastePct,
    startingShield: recipe.startingShield,
    coinBonusPct: recipe.coinBonusPct,
    durationSec,
    remainingSec: durationSec
  };

  const coinReward = isFirstDiscovery ? 38 : 18;
  const xpReward = isFirstDiscovery ? 42 : 22;

  setNapping(false);
  player.idleTime = 0;
  player.eatingTimer = 0.9;
  player.teaPlatterTimer = 9.0;
  player.happyTimer = 2.8;
  player.cheerTimer = recipe.mood === 'cheer' ? 2.6 : 1.6;
  player.proudTimer = recipe.mood === 'proud' ? 2.4 : 0;
  player.hunger = Math.min(player.maxHunger, player.hunger + 30);
  player.hp = Math.min(player.maxHp, player.hp + 28);

  playSfx('star');
  spawnInteractVfx(player.x, player.y - 26, 'love', 12);
  addCoins(
    coinReward,
    player.x + 110,
    player.y - 18,
    isFirstDiscovery ? '新特调 ' : '品茗 '
  );
  addAffectionXp(
    xpReward,
    `${isFirstDiscovery ? '首创食谱 ' : '下午茶 '}+${xpReward} 亲密`
  );
  recordJournalActivity('teas', 1, refDate);
  grantInteractiveCareYarnDrop('tea');
  setPlayerEmote(recipe.reaction, 3.2, recipe.mood === 'proud' ? 'cheer' : recipe.mood, true);
  completeWish('eat_tea');

  savePetState();
  syncTeatimeUI();
  syncWeeklyJournalUI(refDate);
  return {
    recipe,
    isFirstDiscovery,
    coinReward,
    xpReward,
    activeBuff: { ...player.afternoonTea.activeBuff }
  };
}

let teaBuffUiSyncAcc = 0;
let teaBuffSaveAcc = 0;
function updateAfternoonTeaBuff(dt) {
  if (player.teaPlatterTimer > 0) {
    player.teaPlatterTimer = Math.max(0, player.teaPlatterTimer - dt);
  }
  const buff = player.afternoonTea?.activeBuff;
  if (!buff || buff.remainingSec <= 0) return;
  const decayRate = gameMode === 'survivor' ? 1 : 0.25;
  buff.remainingSec = Math.max(0, buff.remainingSec - dt * decayRate);
  teaBuffUiSyncAcc += dt;
  teaBuffSaveAcc += dt;
  if (buff.remainingSec <= 0) {
    player.afternoonTea.activeBuff = null;
    teaBuffUiSyncAcc = 0;
    teaBuffSaveAcc = 0;
    savePetState();
    syncTeatimeUI();
    if (gameMode === 'survivor') syncSurvivorSkillStrip();
    return;
  }
  if (teaBuffUiSyncAcc >= 1.0) {
    teaBuffUiSyncAcc = 0;
    syncTeatimeUI();
  }
  if (teaBuffSaveAcc >= 8.0) {
    teaBuffSaveAcc = 0;
    savePetState();
  }
}

function dismissTeatimeCard() {
  teatimeCardEl?.classList.add('hidden');
  btnTeatimeDockEl?.classList.remove('active');
}

function openTeatimeCard() {
  if (!teatimeCardEl) return;
  if (gameMode !== 'pet') switchMode('pet');
  closeDrawer();
  dismissTopicCard();
  dismissWindowAmbienceCard();
  foldOrHidePomodoroCard();
  dismissWeeklyJournalCard();
  dismissTerrariumCard();
  foldOrHideGoodnightCard();
  dismissCollageCard();
  foldOrHideCozyRadioCard();
  dismissCrochetCard();
  dismissHotCocoaCard();
  dismissPressedFlowerCard();
  dismissTelescopeCard(); dismissAr10Cards(); dismissAr11Cards(); dismissAr12Cards(); dismissAr13Cards(); dismissAr14Cards(); dismissAr15Cards(); dismissAr16Cards();
  dismissPolaroid();
  closeAlbumLightbox();
  teatimeCardEl.classList.remove('hidden');
  syncTeatimeUI();
}

function toggleTeatimeCard() {
  if (!teatimeCardEl) return;
  if (teatimeCardEl.classList.contains('hidden')) {
    openTeatimeCard();
    playSfx('pat');
  } else {
    dismissTeatimeCard();
  }
}

if (teatimeCardEl) {
  teatimeCardEl.addEventListener('pointerdown', (e) => e.stopPropagation());
}
if (weeklyJournalCardEl) {
  weeklyJournalCardEl.addEventListener('pointerdown', (e) => e.stopPropagation());
}

bindHudTap(btnTeatimeDockEl, () => {
  toggleTeatimeCard();
});
bindHudTap(document.getElementById('btn-teatime-close'), () => {
  dismissTeatimeCard();
});
bindHudTap(teatimeBuffPillEl, () => {
  openTeatimeCard();
});
document.querySelectorAll('#teatime-base-grid .teatime-pick-btn').forEach((btn) => {
  bindHudTap(btn, () => {
    selectTeaBase(btn.dataset.teaBase);
  });
});
document.querySelectorAll('#teatime-pastry-grid .teatime-pick-btn').forEach((btn) => {
  bindHudTap(btn, () => {
    selectTeaPastry(btn.dataset.pastry);
  });
});
bindHudTap(document.getElementById('btn-teatime-serve'), () => {
  serveAfternoonTeaSet();
});
bindHudTap(btnTeatimeGoShiftEl, () => {
  dismissTeatimeCard();
  switchMode('survivor');
});

bindHudTap(btnWeeklyJournalEl, () => {
  toggleWeeklyJournalCard();
});
bindHudTap(document.getElementById('btn-journal-close'), () => {
  dismissWeeklyJournalCard();
});
bindHudTap(btnJournalStampTodayEl, () => {
  stampJournalToday();
});
document.querySelectorAll('#journal-mood-picker .journal-mood-chip').forEach((chip) => {
  bindHudTap(chip, () => {
    player.weeklyJournal.selectedMood = chip.dataset.moodId;
    savePetState();
    syncWeeklyJournalUI();
  });
});

// ================= AR-6 治愈桌面微缩绿植花房 & 晚安助眠星空八音盒模式 =================
const terrariumCardEl = document.getElementById('terrarium-card');
const terrariumSummaryPillEl = document.getElementById('terrarium-summary-pill');
const terrariumMainPlantImgEl = document.getElementById('terrarium-main-plant-img');
const terrariumStageBadgeEl = document.getElementById('terrarium-stage-badge');
const terrariumPlantTitleEl = document.getElementById('terrarium-plant-title');
const btnPlantDisplayToggleEl = document.getElementById('btn-plant-display-toggle');
const terrariumPlantNoteEl = document.getElementById('terrarium-plant-note');
const terrariumGrowthFillEl = document.getElementById('terrarium-growth-fill');
const terrariumGrowthTextEl = document.getElementById('terrarium-growth-text');
const terrariumWaterValEl = document.getElementById('terrarium-water-val');
const terrariumWaterFillEl = document.getElementById('terrarium-water-fill');
const terrariumSunValEl = document.getElementById('terrarium-sun-val');
const terrariumSunFillEl = document.getElementById('terrarium-sun-fill');
const terrariumBlessingDescEl = document.getElementById('terrarium-blessing-desc');
const terrariumDewHintEl = document.getElementById('terrarium-dew-hint');
const terrariumTotalBlessingEl = document.getElementById('terrarium-total-blessing');
const btnTerrariumDockEl = document.getElementById('btn-terrarium');
const btnTerrariumLabelEl = document.getElementById('btn-terrarium-label');
const terrariumBlessingPillEl = document.getElementById('terrarium-blessing-pill');
const terrariumPillTagEl = document.getElementById('terrarium-pill-tag');

const goodnightCardEl = document.getElementById('goodnight-musicbox-card');
const goodnightOverlayEl = document.getElementById('goodnight-starlight-overlay');
const btnMusicboxDockEl = document.getElementById('btn-musicbox');
const btnMusicboxLabelEl = document.getElementById('btn-musicbox-label');
const musicboxMiniPillEl = document.getElementById('musicbox-mini-pill');
const musicboxMiniClockEl = document.getElementById('musicbox-mini-clock');
const musicboxMiniTagEl = document.getElementById('musicbox-mini-tag');
const btnMusicboxChimeMuteEl = document.getElementById('btn-musicbox-chime-mute');
const btnMusicboxFoldEl = document.getElementById('btn-musicbox-fold');
const musicboxClockEl = document.getElementById('musicbox-clock');
const musicboxStatePillEl = document.getElementById('musicbox-state-pill');
const musicboxProgressFillEl = document.getElementById('musicbox-progress-fill');
const musicboxWhisperNoteEl = document.getElementById('musicbox-whisper-note');
const btnMusicboxStartEl = document.getElementById('btn-musicbox-start');
const btnMusicboxPauseEl = document.getElementById('btn-musicbox-pause');
const btnMusicboxSettleEl = document.getElementById('btn-musicbox-settle');
const btnMusicboxCancelEl = document.getElementById('btn-musicbox-cancel');
const musicboxStampStripEl = document.getElementById('musicbox-stamp-strip');
const musicboxStatStampsEl = document.getElementById('musicbox-stat-stamps');
const musicboxStatSessionsEl = document.getElementById('musicbox-stat-sessions');
const musicboxStatMinsEl = document.getElementById('musicbox-stat-mins');

const GOODNIGHT_MELODY_LABELS = {
  star_lullaby: '星摇篮曲',
  rain_chime: '雨后风铃',
  cloud_waltz: '云端圆舞'
};

const GOODNIGHT_WHISPERS = [
  (mel) => `八音盒轻轻流淌着「${mel}」，闭上眼睛深呼吸，今晚一定有软绵绵的好梦~`,
  () => '我把星光纸灯调成了最柔和的蜂蜜暖色，就在桌角守着主人入睡哟~',
  () => '白天的忙碌都收进手账本里啦，肩膀放松下来，安心休息吧~',
  (mel) => `伴着「${mel}」的钢片琴轻音，连窗外的晚风都放轻脚步咯~`
];

const goodnightRun = {
  status: 'idle', // 'idle' | 'running' | 'paused' | 'completed'
  durationSec: (player.goodnightMusicbox.selectedMinutes || 30) * 60,
  remainingSec: (player.goodnightMusicbox.selectedMinutes || 30) * 60,
  elapsedSec: 0,
  whisperTimer: 16,
  whisperIdx: 0,
  lastRewardSummary: ''
};

petAudio.lullabyMelodyId = player.goodnightMusicbox.melodyId || 'star_lullaby';
petAudio.lullabyMuted = Boolean(player.goodnightMusicbox.chimeMuted);

function formatPlantSingleBlessing(plantId, lv) {
  const b = getBotanicalBlessings();
  if (plantId === 'peach_succulent') {
    return `班次佑护 (Lv.${lv})：打工金币 +${Math.round(b.luckCoinPct * 100)}% · 招财掉宝 +${Math.round(b.treasureDropBonus * 100)}%`;
  }
  if (plantId === 'star_lily') {
    return `班次佑护 (Lv.${lv})：打工体力自愈 +${b.hpRegenPerSec.toFixed(2)}/秒`;
  }
  return `班次佑护 (Lv.${lv})：宝石金币磁吸 +${Math.round(b.magnetPct * 100)}% · 暴击幸运 +${Math.round(b.critChanceBonus * 100)}%`;
}

function refreshDisplayedTerrariumSlots() {
  const slots = [];
  const floorY = (H || 900) * 0.68 - 2;
  const order = ['peach_succulent', 'star_lily', 'blue_hydrangea'];
  const shownIds = order.filter((id) => Boolean(player.terrarium?.plants?.[id]?.deskDisplayed));
  for (let i = 0; i < shownIds.length; i++) {
    const id = shownIds[i];
    const spec = TERRARIUM_SPECS[id];
    const st = player.terrarium.plants[id];
    if (!spec || !st) continue;
    const spreadRatio = shownIds.length === 1 ? 0.33 : 0.29 + i * 0.062;
    slots.push({
      id,
      shortName: spec.shortName,
      spriteKey: spec.spriteKey,
      level: st.level,
      hasDew: (st.dewStacks || 0) > 0,
      x: Math.round((W || 1440) * spreadRatio),
      y: floorY
    });
  }
  player.displayedTerrariumPlants = slots;
  return slots;
}

function syncTerrariumUI() {
  if (!player.terrarium || !player.terrarium.plants) return;
  const curId = TERRARIUM_SPECS[player.terrarium.selectedPlant]
    ? player.terrarium.selectedPlant
    : 'peach_succulent';
  player.terrarium.selectedPlant = curId;
  const spec = TERRARIUM_SPECS[curId];
  const pState = player.terrarium.plants[curId];
  const botBless = getBotanicalBlessings();

  refreshDisplayedTerrariumSlots();

  if (terrariumSummaryPillEl) {
    terrariumSummaryPillEl.textContent = `花架 Lv.${botBless.totalLevel}/15`;
  }

  for (const id of ['peach_succulent', 'star_lily', 'blue_hydrangea']) {
    const st = player.terrarium.plants[id];
    const stageTxt = `${getTerrariumStageLabel(st.level)} Lv.${st.level}`;
    const tabStageEl = document.getElementById(`plant-tab-stage-${id}`);
    if (tabStageEl) tabStageEl.textContent = stageTxt;
  }

  document.querySelectorAll('#terrarium-plant-grid .terrarium-plant-tab').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.plantId === curId);
  });

  if (terrariumMainPlantImgEl) terrariumMainPlantImgEl.src = spec.img;
  const stageName = getTerrariumStageLabel(pState.level);
  if (terrariumStageBadgeEl) terrariumStageBadgeEl.textContent = `${stageName} · Lv.${pState.level}`;
  if (terrariumPlantTitleEl) terrariumPlantTitleEl.textContent = spec.name;
  if (terrariumPlantNoteEl) terrariumPlantNoteEl.textContent = spec.note;

  if (btnPlantDisplayToggleEl) {
    btnPlantDisplayToggleEl.classList.toggle('active', Boolean(pState.deskDisplayed));
    btnPlantDisplayToggleEl.textContent = pState.deskDisplayed ? '已摆书桌' : '摆上书桌';
  }

  const nextNeed = TERRARIUM_XP_THRESHOLDS[pState.level] || 0;
  if (terrariumGrowthFillEl) {
    const pct = pState.level >= 5 ? 100 : Math.max(4, Math.min(100, (pState.growthXp / Math.max(1, nextNeed)) * 100));
    terrariumGrowthFillEl.style.width = `${pct.toFixed(1)}%`;
  }
  if (terrariumGrowthTextEl) {
    if (pState.level >= 5) {
      terrariumGrowthTextEl.textContent = '已达盛放满阶 Lv.5';
    } else {
      const nextStage = getTerrariumStageLabel(pState.level + 1);
      terrariumGrowthTextEl.textContent = `${pState.growthXp}/${nextNeed} · 下一阶 ${nextStage} Lv.${pState.level + 1}`;
    }
  }

  if (terrariumWaterValEl) terrariumWaterValEl.textContent = `${Math.round(pState.moisture)}%`;
  if (terrariumWaterFillEl) terrariumWaterFillEl.style.width = `${Math.round(pState.moisture)}%`;
  if (terrariumSunValEl) terrariumSunValEl.textContent = `${Math.round(pState.sunlight)}%`;
  if (terrariumSunFillEl) terrariumSunFillEl.style.width = `${Math.round(pState.sunlight)}%`;

  if (terrariumBlessingDescEl) {
    terrariumBlessingDescEl.textContent = formatPlantSingleBlessing(curId, pState.level);
  }

  const harvestBtn = document.getElementById('btn-plant-harvest-dew');
  const totalDew = ['peach_succulent', 'star_lily', 'blue_hydrangea'].reduce(
    (acc, k) => acc + (player.terrarium.plants[k]?.dewStacks || 0),
    0
  );
  if (terrariumDewHintEl) {
    terrariumDewHintEl.textContent =
      pState.dewStacks > 0 ? `可采 ${pState.dewStacks} 滴` : '照料凝露';
  }
  if (harvestBtn) {
    harvestBtn.disabled = (pState.dewStacks || 0) <= 0;
  }

  const nutrientBtn = document.getElementById('btn-plant-nutrient');
  if (nutrientBtn) {
    nutrientBtn.classList.toggle('unaffordable', player.coins < 12);
  }

  if (terrariumTotalBlessingEl) {
    terrariumTotalBlessingEl.textContent = `总佑护：金币+${Math.round(botBless.luckCoinPct * 100)}% · 自愈+${botBless.hpRegenPerSec.toFixed(2)}/秒 · 磁吸+${Math.round(botBless.magnetPct * 100)}% · 暴击+${Math.round(botBless.critChanceBonus * 100)}%`;
  }

  if (btnTerrariumDockEl) {
    btnTerrariumDockEl.classList.toggle('has-dew', totalDew > 0);
    btnTerrariumDockEl.classList.toggle(
      'active',
      Boolean(terrariumCardEl && !terrariumCardEl.classList.contains('hidden'))
    );
  }
  if (btnTerrariumLabelEl) {
    btnTerrariumLabelEl.textContent = totalDew > 0 ? `花露×${totalDew}` : '花房';
  }

  if (terrariumBlessingPillEl) {
    const showPill = Boolean(
      gameMode === 'pet' && (botBless.totalLevel >= 4 || (player.terrarium.totalCares || 0) >= 1)
    );
    terrariumBlessingPillEl.classList.toggle('hidden', !showPill);
    if (terrariumPillTagEl) {
      terrariumPillTagEl.textContent = `Lv.${botBless.totalLevel}`;
    }
  }
}

function selectTerrariumPlant(plantId) {
  if (!TERRARIUM_SPECS[plantId]) return;
  player.terrarium.selectedPlant = plantId;
  playSfx('pat');
  savePetState();
  syncTerrariumUI();
}

function careTerrariumPlant(actionType = 'water', customPlantId = '', refDate = new Date()) {
  if (gameMode !== 'pet') switchMode('pet');
  const plantId = TERRARIUM_SPECS[customPlantId] ? customPlantId : player.terrarium.selectedPlant;
  const spec = TERRARIUM_SPECS[plantId];
  const st = player.terrarium.plants[plantId];
  if (!spec || !st) return { ok: false, reason: 'invalid_plant' };

  let cost = 0;
  let growthGain = 24;
  if (actionType === 'nutrient') {
    cost = 12;
    if (player.coins < cost) {
      setPlayerEmote('金币还差一点点，去打工或采集花露就能调配营养液啦~', 2.2);
      return { ok: false, reason: 'insufficient_coins' };
    }
    player.coins -= cost;
    growthGain = 55;
    st.moisture = Math.min(100, st.moisture + 22);
    st.sunlight = Math.min(100, st.sunlight + 22);
  } else if (actionType === 'water') {
    st.moisture = Math.min(100, st.moisture + 28);
    growthGain = st.sunlight >= 50 ? 26 : 22;
  } else if (actionType === 'sun') {
    st.sunlight = Math.min(100, st.sunlight + 28);
    growthGain = st.moisture >= 50 ? 26 : 22;
  }

  st.cares = (st.cares || 0) + 1;
  player.terrarium.totalCares = (player.terrarium.totalCares || 0) + 1;

  const prevLv = st.level;
  if (st.level < 5) {
    st.growthXp = (st.growthXp || 0) + growthGain;
    while (st.level < 5 && st.growthXp >= TERRARIUM_XP_THRESHOLDS[st.level]) {
      st.growthXp -= TERRARIUM_XP_THRESHOLDS[st.level];
      st.level += 1;
      st.dewStacks = Math.min(3, (st.dewStacks || 0) + 1);
    }
    if (st.level >= 5) st.growthXp = 0;
  } else {
    st.dewStacks = Math.min(3, (st.dewStacks || 0) + 1);
  }

  if (st.cares % 2 === 0) {
    st.dewStacks = Math.min(3, (st.dewStacks || 0) + 1);
  }

  const leveledUp = st.level > prevLv;
  if (leveledUp) {
    st.deskDisplayed = true;
    playSfx('star');
    player.cheerTimer = 2.2;
    player.happyTimer = 2.4;
    spawnInteractVfx(player.x, player.y - 28, 'love', 10);
    addCoins(16 + st.level * 4, player.x + 30, player.y - 44, '花开礼 ');
    addAffectionXp(22 + st.level * 4, `${spec.name}升至Lv.${st.level}`);
    setPlayerEmote(
      `哇！『${spec.name}』进阶到 ${getTerrariumStageLabel(st.level)} Lv.${st.level} 啦，已摆上书桌加持打工~`,
      2.8,
      'cheer',
      true
    );
  } else {
    playSfx(actionType === 'water' ? 'water_drop' : 'celesta_chime');
    player.happyTimer = 1.6;
    spawnInteractVfx(player.x, player.y - 24, 'sparkle', 6);
    addAffectionXp(actionType === 'nutrient' ? 14 : 8, `照料${spec.shortName}`);
    const careWord =
      actionType === 'water' ? '清泉浇灌' : actionType === 'sun' ? '暖阳沐浴' : '花房营养液';
    setPlayerEmote(`${careWord}完成！『${spec.name}』叶片亮晶晶的~`, 2.0, 'happy');
  }

  recordJournalActivity('plantCares', 1, refDate);
  grantInteractiveCareYarnDrop('terrarium');
  grantPressedFlowerDrop('terrarium');
  savePetState();
  syncTerrariumUI();
  if (gameMode === 'survivor') syncSurvivorSkillStrip();
  return {
    ok: true,
    plantId,
    level: st.level,
    stage: getTerrariumStageLabel(st.level),
    leveledUp,
    dewStacks: st.dewStacks,
    blessings: getBotanicalBlessings()
  };
}

function harvestPlantDew(customPlantId = '') {
  const plantId = TERRARIUM_SPECS[customPlantId] ? customPlantId : player.terrarium.selectedPlant;
  const spec = TERRARIUM_SPECS[plantId];
  const st = player.terrarium.plants[plantId];
  if (!spec || !st || (st.dewStacks || 0) <= 0) return { ok: false, coins: 0 };

  const stacks = st.dewStacks;
  st.dewStacks = 0;
  player.terrarium.totalDewHarvested = (player.terrarium.totalDewHarvested || 0) + stacks;
  const coinReward = stacks * (10 + st.level * 3);
  const xpReward = stacks * (10 + st.level * 2);

  playSfx('celesta_chime');
  player.happyTimer = 2.0;
  spawnInteractVfx(player.x, player.y - 24, 'sparkle', 8);
  addCoins(coinReward, player.x - 36, player.y - 40, '晨露 ');
  addAffectionXp(xpReward, `采集${spec.shortName}花露 +${xpReward} 亲密`);
  setPlayerEmote(`采集了 ${stacks} 滴『${spec.name}』晨露，换来清甜金币与亲密~`, 2.4, 'happy', true);

  savePetState();
  syncTerrariumUI();
  return { ok: true, stacks, coinReward, xpReward };
}

function togglePlantDeskDisplay(customPlantId = '') {
  const plantId = TERRARIUM_SPECS[customPlantId] ? customPlantId : player.terrarium.selectedPlant;
  const spec = TERRARIUM_SPECS[plantId];
  const st = player.terrarium.plants[plantId];
  if (!spec || !st) return false;
  st.deskDisplayed = !st.deskDisplayed;
  playSfx('pat');
  setPlayerEmote(
    st.deskDisplayed
      ? `已把『${spec.name}』摆在书桌窗畔陪我啦~`
      : `已把『${spec.name}』收回微缩花房玻璃架养护~`,
    2.0,
    'happy'
  );
  savePetState();
  syncTerrariumUI();
  return st.deskDisplayed;
}

let terrariumTickAcc = 0;
function updateTerrarium(dt) {
  terrariumTickAcc += dt;
  if (terrariumTickAcc < 4.0) return;
  const step = terrariumTickAcc;
  terrariumTickAcc = 0;
  let changed = false;
  for (const id of ['peach_succulent', 'star_lily', 'blue_hydrangea']) {
    const st = player.terrarium?.plants?.[id];
    if (!st) continue;
    st.moisture = Math.max(20, st.moisture - step * 0.12);
    st.sunlight = Math.max(20, st.sunlight - step * 0.1);
    if (st.moisture >= 45 && st.sunlight >= 45 && st.dewStacks < 3) {
      st.dewAcc = (st.dewAcc || 0) + step * (0.6 + st.level * 0.18);
      if (st.dewAcc >= 48) {
        st.dewAcc = 0;
        st.dewStacks = Math.min(3, (st.dewStacks || 0) + 1);
        changed = true;
      }
    }
  }
  if (changed) {
    savePetState();
    syncTerrariumUI();
  } else {
    refreshDisplayedTerrariumSlots();
  }
}

function dismissTerrariumCard() {
  terrariumCardEl?.classList.add('hidden');
  btnTerrariumDockEl?.classList.remove('active');
}

function openTerrariumCard() {
  if (!terrariumCardEl) return;
  if (gameMode !== 'pet') switchMode('pet');
  closeDrawer();
  dismissTopicCard();
  dismissWindowAmbienceCard();
  foldOrHidePomodoroCard();
  dismissTeatimeCard();
  dismissWeeklyJournalCard();
  foldOrHideGoodnightCard();
  dismissCollageCard();
  foldOrHideCozyRadioCard();
  dismissCrochetCard();
  dismissHotCocoaCard();
  dismissPressedFlowerCard();
  dismissTelescopeCard(); dismissAr10Cards(); dismissAr11Cards(); dismissAr12Cards(); dismissAr13Cards(); dismissAr14Cards(); dismissAr15Cards(); dismissAr16Cards();
  dismissPolaroid();
  closeAlbumLightbox();
  terrariumCardEl.classList.remove('hidden');
  syncTerrariumUI();
}

function toggleTerrariumCard() {
  if (!terrariumCardEl) return;
  if (terrariumCardEl.classList.contains('hidden')) {
    openTerrariumCard();
    playSfx('pat');
  } else {
    dismissTerrariumCard();
  }
}

function renderMusicboxStampStrip() {
  if (!musicboxStampStripEl) return;
  const total = player.goodnightMusicbox.totalStamps || 0;
  const cycleFilled = total === 0 ? 0 : ((total - 1) % 5) + 1;
  let html = '';
  for (let i = 0; i < 5; i++) {
    const stamped = i < cycleFilled;
    html += `<span class="musicbox-stamp-slot ${stamped ? 'stamped' : ''}"><img src="./assets/stamp_goodnight_moon.webp?v=hd31" alt="" /></span>`;
  }
  html += `<span class="pomo-stamp-hint">累计 ${total} 枚火漆章</span>`;
  musicboxStampStripEl.innerHTML = html;
}

function syncGoodnightUI() {
  const isRunning = goodnightRun.status === 'running';
  const isPaused = goodnightRun.status === 'paused';
  const isDone = goodnightRun.status === 'completed';
  const isActive = isRunning || isPaused;
  const selMins = player.goodnightMusicbox.selectedMinutes || 30;
  const displaySec = isDone
    ? selMins * 60
    : isActive
      ? goodnightRun.remainingSec
      : selMins * 60;
  const clockStr = formatPomodoroClock(displaySec);
  const melId = player.goodnightMusicbox.melodyId || 'star_lullaby';
  const melLabel = GOODNIGHT_MELODY_LABELS[melId] || '星摇篮曲';

  if (musicboxClockEl) musicboxClockEl.textContent = clockStr;
  if (musicboxMiniClockEl) musicboxMiniClockEl.textContent = clockStr;
  if (musicboxMiniTagEl) {
    musicboxMiniTagEl.textContent = isPaused ? '伴眠暂停' : melLabel;
  }

  if (goodnightOverlayEl) {
    goodnightOverlayEl.classList.toggle('hidden', !(gameMode === 'pet' && isActive));
  }

  if (btnMusicboxDockEl) {
    btnMusicboxDockEl.classList.toggle('is-sleeping', isActive);
    btnMusicboxDockEl.classList.toggle(
      'active',
      Boolean(goodnightCardEl && !goodnightCardEl.classList.contains('hidden'))
    );
  }
  if (btnMusicboxLabelEl) {
    btnMusicboxLabelEl.textContent = isActive ? clockStr : '晚安盒';
  }

  const cardHidden = !goodnightCardEl || goodnightCardEl.classList.contains('hidden');
  if (musicboxMiniPillEl) {
    musicboxMiniPillEl.classList.toggle('hidden', !(gameMode === 'pet' && isActive && cardHidden));
  }

  if (btnMusicboxChimeMuteEl) {
    const isChimeMuted = Boolean(player.goodnightMusicbox.chimeMuted);
    btnMusicboxChimeMuteEl.classList.toggle('is-muted', isChimeMuted);
    btnMusicboxChimeMuteEl.textContent = isChimeMuted ? '柔音静音' : '柔音开启';
  }

  if (musicboxStatePillEl) {
    musicboxStatePillEl.classList.toggle('is-running', isRunning);
    musicboxStatePillEl.classList.toggle('is-done', isDone);
    musicboxStatePillEl.textContent = isRunning
      ? `伴眠中 · ${melLabel}`
      : isPaused
        ? '伴眠暂停中'
        : isDone
          ? '好梦火漆已盖章'
          : '准备伴眠';
  }

  if (musicboxProgressFillEl) {
    const pct = isDone
      ? 100
      : isActive && goodnightRun.durationSec > 0
        ? Math.max(
            3,
            Math.min(100, ((goodnightRun.durationSec - goodnightRun.remainingSec) / goodnightRun.durationSec) * 100)
          )
        : 0;
    musicboxProgressFillEl.style.width = `${pct.toFixed(1)}%`;
  }

  if (musicboxWhisperNoteEl) {
    if (isRunning) {
      const fn = GOODNIGHT_WHISPERS[goodnightRun.whisperIdx % GOODNIGHT_WHISPERS.length];
      musicboxWhisperNoteEl.textContent = fn(melLabel);
    } else if (isPaused) {
      musicboxWhisperNoteEl.textContent = '发条暂时停驻，暖光星灯依旧在桌角为你留着柔光~';
    } else if (isDone && goodnightRun.lastRewardSummary) {
      musicboxWhisperNoteEl.textContent = goodnightRun.lastRewardSummary;
    } else {
      musicboxWhisperNoteEl.textContent =
        '旋紧暖光星空八音盒发条，DeepSeek娘会蜷在桌畔轻声哄你入眠~';
    }
  }

  document.querySelectorAll('#musicbox-melody-row .musicbox-melody-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.melody === melId);
  });

  document.querySelectorAll('#musicbox-presets-row .musicbox-preset-btn').forEach((btn) => {
    const mins = Number(btn.dataset.sleepMins);
    btn.classList.toggle('active', mins === selMins);
    btn.disabled = isActive;
  });

  if (btnMusicboxStartEl) {
    btnMusicboxStartEl.classList.toggle('hidden', isActive);
    btnMusicboxStartEl.textContent = isDone ? '再开一轮伴眠' : '开启晚安伴眠';
  }
  if (btnMusicboxPauseEl) {
    btnMusicboxPauseEl.classList.toggle('hidden', !isActive);
    btnMusicboxPauseEl.textContent = isPaused ? '继续伴眠' : '暂停';
  }
  if (btnMusicboxSettleEl) {
    btnMusicboxSettleEl.classList.toggle('hidden', !isActive);
  }
  if (btnMusicboxCancelEl) {
    btnMusicboxCancelEl.classList.toggle('hidden', !isActive);
  }
  if (btnMusicboxFoldEl) {
    btnMusicboxFoldEl.classList.toggle('hidden', !isActive);
  }

  if (musicboxStatStampsEl) {
    musicboxStatStampsEl.textContent = String(player.goodnightMusicbox.totalStamps || 0);
  }
  if (musicboxStatSessionsEl) {
    musicboxStatSessionsEl.textContent = String(player.goodnightMusicbox.completedSessions || 0);
  }
  if (musicboxStatMinsEl) {
    musicboxStatMinsEl.textContent = String(player.goodnightMusicbox.totalSleepMinutes || 0);
  }
  renderMusicboxStampStrip();
}

function selectGoodnightMinutes(mins) {
  if (goodnightRun.status === 'running' || goodnightRun.status === 'paused') return;
  const valid = [15, 30, 45].includes(Number(mins)) ? Number(mins) : 30;
  player.goodnightMusicbox.selectedMinutes = valid;
  goodnightRun.status = 'idle';
  goodnightRun.durationSec = valid * 60;
  goodnightRun.remainingSec = valid * 60;
  goodnightRun.elapsedSec = 0;
  playSfx('celesta_chime');
  savePetState();
  syncGoodnightUI();
}

function selectGoodnightMelody(melodyId) {
  if (!GOODNIGHT_MELODY_LABELS[melodyId]) return;
  player.goodnightMusicbox.melodyId = melodyId;
  petAudio.setLullabyMelody(melodyId);
  savePetState();
  syncGoodnightUI();
}

function toggleGoodnightChimeMute() {
  const info = petAudio.toggleLullabyMute();
  player.goodnightMusicbox.chimeMuted = Boolean(info.chimeMuted);
  savePetState();
  syncGoodnightUI();
  return info;
}

function startGoodnightSession() {
  if (gameMode !== 'pet') switchMode('pet');
  if (pomodoroRun.status === 'running' || pomodoroRun.status === 'paused') {
    pomodoroRun.status = 'idle';
    player.isFocusStudying = false;
    syncPomodoroUI();
  }
  const mins = player.goodnightMusicbox.selectedMinutes || 30;
  goodnightRun.status = 'running';
  goodnightRun.durationSec = mins * 60;
  goodnightRun.remainingSec = mins * 60;
  goodnightRun.elapsedSec = 0;
  goodnightRun.whisperTimer = 15;
  goodnightRun.whisperIdx = 0;
  goodnightRun.lastRewardSummary = '';

  cancelRpsGame();
  cancelPalmCatchGame();
  dismissTopicCard();
  dismissTeatimeCard();
  dismissWeeklyJournalCard();
  dismissTerrariumCard();
  dismissCollageCard();
  foldOrHideCozyRadioCard();
  dismissCrochetCard();
  dismissHotCocoaCard();
  dismissPressedFlowerCard();
  dismissTelescopeCard(); dismissAr10Cards(); dismissAr11Cards(); dismissAr12Cards(); dismissAr13Cards(); dismissAr14Cards(); dismissAr15Cards(); dismissAr16Cards();
  if (cozyRadioRun.playing) {
    pauseCozyRadioForModeSwitch();
  }
  if (player.y < H * 0.68 - 26) {
    player.y = H * 0.68 - 25;
    player.vy = 0;
    player.onGround = true;
    player.standingPlat = null;
  }
  player.vx = 0;
  player.wanderTargetX = null;
  player.isGoodnightSleeping = true;
  player.petAction = 'sleep';
  player.idleTime = 6.5;

  petAudio.lullabyMuted = Boolean(player.goodnightMusicbox.chimeMuted);
  petAudio.startLullabyBox(player.goodnightMusicbox.melodyId);
  spawnInteractVfx(player.x, player.y - 26, 'purr', 8);
  const melName = GOODNIGHT_MELODY_LABELS[player.goodnightMusicbox.melodyId] || '星摇篮曲';
  setPlayerEmote(`晚安星空八音盒已旋开「${melName}」，暖光陪主人安心入梦zzZ~`, 3.0, 'sleep', true);
  syncGoodnightUI();
}

function togglePauseGoodnight() {
  if (goodnightRun.status === 'running') {
    goodnightRun.status = 'paused';
    player.isGoodnightSleeping = false;
    petAudio.stopLullabyBox();
    setPlayerEmote('星空八音盒已轻声暂停，需要时随时继续伴眠~', 2.0, 'happy');
  } else if (goodnightRun.status === 'paused') {
    goodnightRun.status = 'running';
    player.isGoodnightSleeping = true;
    player.petAction = 'sleep';
    petAudio.startLullabyBox(player.goodnightMusicbox.melodyId);
    setPlayerEmote('暖光星空八音盒继续轻唱摇篮曲zzZ~', 2.0, 'sleep');
  }
  syncGoodnightUI();
}

function settleGoodnightSession(fromEarlyWake = false, refDate = new Date()) {
  if (goodnightRun.status !== 'running' && goodnightRun.status !== 'paused') {
    return { ok: false };
  }
  const plannedMins = player.goodnightMusicbox.selectedMinutes || 30;
  const elapsedMins = Math.max(
    fromEarlyWake ? 5 : plannedMins,
    Math.min(plannedMins, Math.round(goodnightRun.elapsedSec / 60) || (fromEarlyWake ? Math.max(5, Math.round(plannedMins * 0.5)) : plannedMins))
  );
  const effectiveMins = fromEarlyWake ? elapsedMins : plannedMins;

  goodnightRun.status = 'completed';
  goodnightRun.remainingSec = 0;
  player.isGoodnightSleeping = false;
  petAudio.stopLullabyBox();

  const dateKey = formatLocalDateKey(refDate);
  player.goodnightMusicbox.totalStamps = (player.goodnightMusicbox.totalStamps || 0) + 1;
  player.goodnightMusicbox.completedSessions = (player.goodnightMusicbox.completedSessions || 0) + 1;
  player.goodnightMusicbox.totalSleepMinutes =
    (player.goodnightMusicbox.totalSleepMinutes || 0) + effectiveMins;
  player.goodnightMusicbox.lastCompletedDate = dateKey;

  // AR-15 晚安联动：星空投影灯点亮时完成伴眠，好梦章金币 +20%，并给投影中的星座卡盖上好梦章
  const starDreamActive = getActiveProjection();
  const baseCoinReward = fromEarlyWake ? Math.max(18, Math.round(effectiveMins * 1.1)) : Math.round(plannedMins * 1.5 + 12);
  const coinReward = Math.round(baseCoinReward * getStarGoodnightMult());
  const xpReward = fromEarlyWake ? Math.max(22, Math.round(effectiveMins * 1.2)) : Math.round(plannedMins * 1.6 + 16);

  player.hp = player.maxHp;
  player.hunger = Math.min(player.maxHunger, player.hunger + 18);
  player.happyTimer = 2.8;
  player.cheerTimer = 2.4;

  playSfx('celesta_chime');
  spawnInteractVfx(player.x, player.y - 28, 'love', 12);
  addCoins(coinReward, player.x + 24, player.y - 46, '好梦章 ');
  addAffectionXp(xpReward, `晚安伴眠 +${xpReward} 亲密`);

  player.weeklyJournal.selectedMood = 'goodnight';
  recordJournalActivity('sleepMins', effectiveMins, refDate);
  const dayEntry = ensureJournalDayEntry(dateKey);
  dayEntry.stamped = true;
  dayEntry.moodId = 'goodnight';

  goodnightRun.lastRewardSummary = `已盖下第 ${player.goodnightMusicbox.totalStamps} 枚「晚安好梦火漆章」！收获 +${coinReward} 金币与 +${xpReward} 亲密~`;
  setPlayerEmote(
    `早安与好梦圆满！盖下「晚安好梦火漆章」+${coinReward}金，手账周报已同步记录~`,
    3.2,
    'cheer',
    true
  );

  const starDream = starDreamActive ? awardStarDream(starDreamActive) : null;

  savePetState();
  syncGoodnightUI();
  syncWeeklyJournalUI(refDate);
  return {
    ok: true,
    stamps: player.goodnightMusicbox.totalStamps,
    effectiveMins,
    baseCoinReward,
    coinReward,
    xpReward,
    starDream
  };
}

function cancelGoodnightSession(silent = false) {
  if (goodnightRun.status !== 'running' && goodnightRun.status !== 'paused') return;
  goodnightRun.status = 'idle';
  goodnightRun.remainingSec = (player.goodnightMusicbox.selectedMinutes || 30) * 60;
  goodnightRun.elapsedSec = 0;
  player.isGoodnightSleeping = false;
  petAudio.stopLullabyBox();
  if (!silent) {
    setPlayerEmote('已收起星空八音盒，暖光留到想休息时再点亮吧~', 1.8, 'happy');
  }
  syncGoodnightUI();
}

function advanceGoodnightTime(dtSec, refDate = new Date()) {
  if (goodnightRun.status !== 'running' || dtSec <= 0) return;
  goodnightRun.elapsedSec += dtSec;
  goodnightRun.remainingSec = Math.max(0, goodnightRun.remainingSec - dtSec);
  if (goodnightRun.remainingSec <= 0) {
    settleGoodnightSession(false, refDate);
  }
}

let goodnightUiSyncAcc = 0;
function updateGoodnightCompanion(dt) {
  if (goodnightRun.status !== 'running') {
    player.isGoodnightSleeping = false;
    return;
  }
  if (gameMode !== 'pet') return;

  advanceGoodnightTime(dt);
  if (goodnightRun.status !== 'running') return;

  goodnightUiSyncAcc += dt;
  if (goodnightUiSyncAcc >= 0.5) {
    goodnightUiSyncAcc = 0;
    syncGoodnightUI();
  }

  goodnightRun.whisperTimer -= dt;
  if (goodnightRun.whisperTimer <= 0) {
    goodnightRun.whisperTimer = 18 + Math.random() * 8;
    goodnightRun.whisperIdx = (goodnightRun.whisperIdx + 1) % GOODNIGHT_WHISPERS.length;
    const melName = GOODNIGHT_MELODY_LABELS[player.goodnightMusicbox.melodyId] || '星摇篮曲';
    const whisperText = GOODNIGHT_WHISPERS[goodnightRun.whisperIdx](melName);
    if (player.emoteTimer <= 0) {
      setPlayerEmote(whisperText, 3.0, 'sleep', false);
    }
    syncGoodnightUI();
  }
}

function foldOrHideGoodnightCard() {
  goodnightCardEl?.classList.add('hidden');
  syncGoodnightUI();
}

function openGoodnightCard() {
  if (!goodnightCardEl) return;
  if (gameMode !== 'pet') switchMode('pet');
  closeDrawer();
  dismissTopicCard();
  dismissWindowAmbienceCard();
  foldOrHidePomodoroCard();
  dismissTeatimeCard();
  dismissWeeklyJournalCard();
  dismissTerrariumCard();
  dismissCollageCard();
  foldOrHideCozyRadioCard();
  dismissCrochetCard();
  dismissHotCocoaCard();
  dismissPressedFlowerCard();
  dismissTelescopeCard(); dismissAr10Cards(); dismissAr11Cards(); dismissAr12Cards(); dismissAr13Cards(); dismissAr14Cards(); dismissAr15Cards(); dismissAr16Cards();
  dismissPolaroid();
  closeAlbumLightbox();
  goodnightCardEl.classList.remove('hidden');
  syncGoodnightUI();
}

function toggleGoodnightCard() {
  if (!goodnightCardEl) return;
  if (goodnightCardEl.classList.contains('hidden')) {
    openGoodnightCard();
    playSfx('celesta_chime');
  } else {
    foldOrHideGoodnightCard();
  }
}

if (terrariumCardEl) {
  terrariumCardEl.addEventListener('pointerdown', (e) => e.stopPropagation());
}
if (goodnightCardEl) {
  goodnightCardEl.addEventListener('pointerdown', (e) => e.stopPropagation());
}

bindHudTap(btnTerrariumDockEl, () => {
  toggleTerrariumCard();
});
bindHudTap(document.getElementById('btn-terrarium-close'), () => {
  dismissTerrariumCard();
});
bindHudTap(terrariumBlessingPillEl, () => {
  openTerrariumCard();
});
document.querySelectorAll('#terrarium-plant-grid .terrarium-plant-tab').forEach((btn) => {
  bindHudTap(btn, () => {
    selectTerrariumPlant(btn.dataset.plantId);
  });
});
bindHudTap(btnPlantDisplayToggleEl, () => {
  togglePlantDeskDisplay();
});
bindHudTap(document.getElementById('btn-plant-water'), () => {
  careTerrariumPlant('water');
});
bindHudTap(document.getElementById('btn-plant-sun'), () => {
  careTerrariumPlant('sun');
});
bindHudTap(document.getElementById('btn-plant-nutrient'), () => {
  careTerrariumPlant('nutrient');
});
bindHudTap(document.getElementById('btn-plant-harvest-dew'), () => {
  harvestPlantDew();
});
bindHudTap(document.getElementById('btn-terrarium-go-shift'), () => {
  dismissTerrariumCard();
  switchMode('survivor');
});

bindHudTap(btnMusicboxDockEl, () => {
  toggleGoodnightCard();
});
bindHudTap(document.getElementById('btn-musicbox-close'), () => {
  foldOrHideGoodnightCard();
});
bindHudTap(btnMusicboxFoldEl, () => {
  foldOrHideGoodnightCard();
});
bindHudTap(musicboxMiniPillEl, () => {
  openGoodnightCard();
});
bindHudTap(btnMusicboxChimeMuteEl, () => {
  toggleGoodnightChimeMute();
});
document.querySelectorAll('#musicbox-melody-row .musicbox-melody-btn').forEach((btn) => {
  bindHudTap(btn, () => {
    selectGoodnightMelody(btn.dataset.melody);
  });
});
document.querySelectorAll('#musicbox-presets-row .musicbox-preset-btn').forEach((btn) => {
  bindHudTap(btn, () => {
    selectGoodnightMinutes(Number(btn.dataset.sleepMins));
  });
});
bindHudTap(btnMusicboxStartEl, () => {
  startGoodnightSession();
});
bindHudTap(btnMusicboxPauseEl, () => {
  togglePauseGoodnight();
});
bindHudTap(btnMusicboxSettleEl, () => {
  settleGoodnightSession(true);
});
bindHudTap(btnMusicboxCancelEl, () => {
  cancelGoodnightSession(false);
});

syncTeatimeUI();
syncWeeklyJournalUI();
syncTerrariumUI();
syncGoodnightUI();

// 暴露 AR-5 自动化真机测试与状态检视钩子
window.__AR5_DEBUG__ = {
  getRecipes() {
    return AFTERNOON_TEA_RECIPES.map((r) => ({ ...r }));
  },
  craftAndServe(teaId, pastryId, customDateIso = '') {
    if (TEA_BASES[teaId]) player.afternoonTea.selectedTea = teaId;
    if (TEA_PASTRIES[pastryId]) player.afternoonTea.selectedPastry = pastryId;
    const refDate = customDateIso ? new Date(customDateIso) : new Date();
    return serveAfternoonTeaSet(refDate);
  },
  recordActivityOnDate(type, amount = 1, customDateIso = '') {
    const refDate = customDateIso ? new Date(customDateIso) : new Date();
    recordJournalActivity(type, amount, refDate);
    return computeWeeklyJournalSummary(refDate);
  },
  claimGiftBox(tierId, customDateIso = '') {
    const refDate = customDateIso ? new Date(customDateIso) : new Date();
    return claimWeeklyGiftBox(tierId, refDate);
  },
  fastForwardTeaBuff(seconds = 60) {
    const sec = Math.max(0, Number(seconds) || 0);
    if (player.afternoonTea?.activeBuff) {
      player.afternoonTea.activeBuff.remainingSec = Math.max(
        0,
        player.afternoonTea.activeBuff.remainingSec - sec
      );
      if (player.afternoonTea.activeBuff.remainingSec <= 0) {
        player.afternoonTea.activeBuff = null;
      }
      savePetState();
      syncTeatimeUI();
      if (gameMode === 'survivor') syncSurvivorSkillStrip();
    }
    return this.getState();
  },
  getSurvivorEffectiveMetrics() {
    const teaBuff = getActiveTeaShiftBuff();
    const cocoaBuff = getActiveHotCocoaBuff();
    const botBless = getBotanicalBlessings();
    const collageBless = getCollageLuckBlessing();
    const crochetGuard = getCrochetWarmGuard();
    const pressedBless = getPressedFlowerBlessing();
    const starGuide = getStarGuidanceBonus();
    const focusWard = getWatercolorFocusWard();
    const heartfelt = getMailboxHeartfeltBonus();
    const lunchWard = getBentoLunchWard();
    const memoryBonus = getMemoryPuzzleBonus();
    const skBlasterLv = gameMode === 'survivor' ? Math.max(1, survivorRun.skills.blaster || 1) : 1;
    const skOnigiriLv = gameMode === 'survivor' ? survivorRun.skills.onigiriHeal || 0 : 0;
    const skCritLv = gameMode === 'survivor' ? survivorRun.skills.critCharm || 0 : 0;
    const effBlasterLv = player.weapons.blaster + skBlasterLv - 1;
    const teaHastePart = gameMode === 'survivor' && teaBuff ? 1 + (teaBuff.attackHastePct || 0) : 1;
    const cocoaHastePart = gameMode === 'survivor' && cocoaBuff ? 1 + (cocoaBuff.attackHastePct || 0) : 1;
    const focusHastePart = gameMode === 'survivor' && focusWard.active ? 1 + (focusWard.focusHastePct || 0) : 1;
    const picnicWardM = getPicnicShiftWard();
    const picnicHastePart = picnicWardM.active ? 1 + (picnicWardM.hastePct || 0) : 1;
    const hasteMult = Number((teaHastePart * cocoaHastePart * focusHastePart * picnicHastePart).toFixed(4));
    const teaMagnetMult = gameMode === 'survivor' && teaBuff ? 1 + (teaBuff.magnetBonusPct || 0) : 1;
    const botMagnetMult = gameMode === 'survivor' ? 1 + (botBless.magnetPct || 0) : 1;
    const collageMagnetMult =
      gameMode === 'survivor' && collageBless.active ? 1 + (collageBless.gemMagnetBonusPct || 0) : 1;
    const starMagnetMult = gameMode === 'survivor' && starGuide.active ? 1 + (starGuide.gemMagnetPct || 0) : 1;
    const potteryWardM = getPotteryShiftWard();
    const potteryMagnetMult = getPotteryMagnetMult();
    const magnetMult = Number(
      (teaMagnetMult * botMagnetMult * collageMagnetMult * starMagnetMult * potteryMagnetMult).toFixed(4)
    );
    const teaCoinMult = gameMode === 'survivor' && teaBuff ? 1 + (teaBuff.coinBonusPct || 0) : 1;
    const botCoinMult = gameMode === 'survivor' ? 1 + (botBless.luckCoinPct || 0) : 1;
    const collageCoinMult =
      gameMode === 'survivor' && collageBless.active ? 1 + (collageBless.luckCoinPct || 0) : 1;
    const cocoaCoinMult = gameMode === 'survivor' && cocoaBuff ? 1 + (cocoaBuff.coinLuckPct || 0) : 1;
    const pressedCoinMult =
      gameMode === 'survivor' && pressedBless.active ? 1 + (pressedBless.coinLuckPct || 0) : 1;
    const memoryCoinMult = getMemoryPuzzleCoinMult();
    const picnicCoinMult = getPicnicCoinMult();
    const potteryCoinMult = getPotteryCoinMult();
    const coinMult = Number(
      (
        teaCoinMult *
        botCoinMult *
        collageCoinMult *
        cocoaCoinMult *
        pressedCoinMult *
        memoryCoinMult *
        picnicCoinMult *
        potteryCoinMult
      ).toFixed(4)
    );
    const baseFireInterval =
      Math.max(0.13, 0.42 / (1 + (effBlasterLv - 1) * 0.28)) *
      (survivorRun.evolved.superWhale ? 0.88 : 1);
    const effectiveGemMagnetRange = Math.round((175 + skOnigiriLv * 55) * magnetMult);
    const effectiveHeartMagnetRange = Math.round(
      effectiveGemMagnetRange *
        (gameMode === 'survivor' && crochetGuard.active ? 1 + (crochetGuard.heartMagnetBonusPct || 0) : 1)
    );
    return {
      gameMode,
      hasActiveTeaBuff: Boolean(teaBuff),
      hasActiveCocoaBuff: Boolean(cocoaBuff),
      cocoaBuff: cocoaBuff ? { ...cocoaBuff } : null,
      teaShield: survivorRun.teaShield || 0,
      teaShieldMax: survivorRun.teaShieldMax || 0,
      knitShield: survivorRun.knitShield || 0,
      knitShieldMax: survivorRun.knitShieldMax || 0,
      startingCoinPouch: survivorRun.startingCoinPouch || 0,
      hasteMult,
      magnetMult,
      coinMult,
      botanicalBlessings: botBless,
      collageLuckBlessing: collageBless,
      crochetWarmGuard: crochetGuard,
      pressedFlowerBlessing: pressedBless,
      starGuidance: starGuide,
      watercolorFocusWard: focusWard,
      mailboxHeartfelt: heartfelt,
      shiftXpMult: Number(getMailboxShiftXpMult().toFixed(4)),
      cardXpMult: Number(getGreetingCardShiftXpMult().toFixed(4)),
      totalShiftXpMult: Number((getMailboxShiftXpMult() * getGreetingCardShiftXpMult()).toFixed(4)),
      kittenLuckWard: getKittenLuckWard(),
      kittenSavesLeft: gameMode === 'survivor' ? survivorRun.kittenSavesLeft || 0 : 0,
      greetingCardBlessing: getGreetingCardBlessing(),
      picnicWard: picnicWardM,
      picnicCoinMult: Number(picnicCoinMult.toFixed(4)),
      bentoLunch: lunchWard,
      memoryPuzzleBonus: memoryBonus,
      memoryCoinMult: Number(memoryCoinMult.toFixed(4)),
      potteryWard: potteryWardM,
      potteryCoinMult: Number(potteryCoinMult.toFixed(4)),
      potteryMagnetMult: Number(potteryMagnetMult.toFixed(4)),
      potteryDamageMult: Number(getPotteryDamageMult().toFixed(4)),
      effectiveDamageReductionPct:
        gameMode === 'survivor'
          ? potteryWardM.active
            ? Number((1 - (1 - (crochetGuard.active ? crochetGuard.damageReductionPct : 0)) * getPotteryDamageMult()).toFixed(4))
            : crochetGuard.damageReductionPct
          : 0,
      effectiveLuckyDropBonus: Number(
        (
          (gameMode === 'survivor' ? botBless.treasureDropBonus : 0) +
          (gameMode === 'survivor' ? collageBless.luckyDropBonus : 0) +
          (gameMode === 'survivor' && cocoaBuff ? cocoaBuff.luckyDropBonus || 0 : 0) +
          (gameMode === 'survivor' && pressedBless.active ? pressedBless.luckyDropBonus || 0 : 0) +
          (gameMode === 'survivor' ? getKittenLuckWard().luckyDropBonus : 0)
        ).toFixed(4)
      ),
      effectiveCritChance: Number(
        Math.min(
          0.85,
          0.18 +
            skCritLv * 0.12 +
            (gameMode === 'survivor' ? botBless.critChanceBonus : 0) +
            (gameMode === 'survivor' && starGuide.active ? starGuide.critChanceBonus : 0) +
            (gameMode === 'survivor' && focusWard.active ? focusWard.critChanceBonus : 0)
        ).toFixed(4)
      ),
      effectiveHpRegenPerSec: Number(
        (
          (gameMode === 'survivor' ? botBless.hpRegenPerSec : 0) +
          (gameMode === 'survivor' && pressedBless.active ? pressedBless.hpRegenPerSec : 0) +
          (lunchWard.active ? lunchWard.regenPerSec : 0) +
          (picnicWardM.active ? picnicWardM.regenPerSec : 0) +
          skOnigiriLv * 2.2
        ).toFixed(2)
      ),
      effectiveFireInterval: Number((baseFireInterval / hasteMult).toFixed(4)),
      effectiveGemMagnetRange,
      effectiveHeartMagnetRange,
      effectiveCoinMagnetRange: Math.round(
        ((player.equipped.aura ? 450 : 155 + (player.weapons.magnet || 1) * 35) + skOnigiriLv * 45) *
          magnetMult
      )
    };
  },
  getState(customDateIso = '') {
    const refDate = customDateIso ? new Date(customDateIso) : new Date();
    return {
      gameMode,
      coins: player.coins,
      level: player.level,
      xp: player.xp,
      hunger: player.hunger,
      hp: player.hp,
      emote: player.emote,
      teaPlatterTimer: player.teaPlatterTimer,
      afternoonTea: JSON.parse(JSON.stringify(player.afternoonTea)),
      weeklyJournal: JSON.parse(JSON.stringify(player.weeklyJournal)),
      journalSummary: computeWeeklyJournalSummary(refDate),
      survivorMetrics: this.getSurvivorEffectiveMetrics(),
      openPanels: {
        drawer: Boolean(drawerEl && !drawerEl.classList.contains('hidden')),
        windowAmbience: Boolean(windowAmbienceCardEl && !windowAmbienceCardEl.classList.contains('hidden')),
        pomodoro: Boolean(pomodoroCardEl && !pomodoroCardEl.classList.contains('hidden')),
        teatime: Boolean(teatimeCardEl && !teatimeCardEl.classList.contains('hidden')),
        weeklyJournal: Boolean(weeklyJournalCardEl && !weeklyJournalCardEl.classList.contains('hidden')),
        terrarium: Boolean(terrariumCardEl && !terrariumCardEl.classList.contains('hidden')),
        goodnightMusicbox: Boolean(goodnightCardEl && !goodnightCardEl.classList.contains('hidden')),
        collageFrame: Boolean(collageCardEl && !collageCardEl.classList.contains('hidden')),
        cozyRadio: Boolean(cozyRadioCardEl && !cozyRadioCardEl.classList.contains('hidden')),
        crochetBasket: Boolean(crochetCardEl && !crochetCardEl.classList.contains('hidden')),
        hotCocoa: Boolean(hotCocoaCardEl && !hotCocoaCardEl.classList.contains('hidden')),
        pressedFlowers: Boolean(pressedFlowerCardEl && !pressedFlowerCardEl.classList.contains('hidden')),
        telescope: Boolean(telescopeCardEl && !telescopeCardEl.classList.contains('hidden')),
        watercolorEasel: isAr10CardOpen('watercolor'),
        mailbox: isAr10CardOpen('mailbox'),
        bentoKitchen: isAr11CardOpen('bento'),
        memoryPuzzle: isAr11CardOpen('puzzle'),
        kittenCorner: isAr12CardOpen('kitten'),
        greetingCard: isAr12CardOpen('card'),
        picnicBasket: isAr13CardOpen('picnic'),
        diaryBook: isAr13CardOpen('diary'),
        potteryWheel: isAr14CardOpen('pottery'),
        aromaTable: isAr14CardOpen('aroma'),
        starProjector: isAr15CardOpen('star'),
        rainCorner: isAr15CardOpen('rain'),
        embroideryHoop: isAr16CardOpen('embroidery'),
        hearthCorner: isAr16CardOpen('hearth'),
        topic: Boolean(topicCardEl && !topicCardEl.classList.contains('hidden')),
        polaroid: Boolean(polaroidCardEl && !polaroidCardEl.classList.contains('hidden'))
      }
    };
  }
};

window.__AR6_DEBUG__ = {
  getSpecs() {
    return JSON.parse(JSON.stringify(TERRARIUM_SPECS));
  },
  carePlant(actionType = 'water', plantId = '', customDateIso = '') {
    const refDate = customDateIso ? new Date(customDateIso) : new Date();
    return careTerrariumPlant(actionType, plantId, refDate);
  },
  harvestDew(plantId = '') {
    return harvestPlantDew(plantId);
  },
  toggleDeskDisplay(plantId = '') {
    return togglePlantDeskDisplay(plantId);
  },
  addCoinsForTest(amount = 100) {
    player.coins += Math.max(0, Number(amount) || 0);
    savePetState();
    syncTerrariumUI();
    return player.coins;
  },
  setPlayerHpForTest(hpVal = 40) {
    player.hp = Math.max(1, Math.min(player.maxHp, Number(hpVal) || 40));
    return player.hp;
  },
  startMusicbox(minutes = 30, melodyId = 'star_lullaby') {
    selectGoodnightMinutes(minutes);
    selectGoodnightMelody(melodyId);
    startGoodnightSession();
    return this.getState();
  },
  fastForwardMusicbox(seconds = 60, customDateIso = '') {
    const refDate = customDateIso ? new Date(customDateIso) : new Date();
    advanceGoodnightTime(Math.max(0, Number(seconds) || 0), refDate);
    syncGoodnightUI();
    return this.getState(customDateIso);
  },
  settleMusicboxEarly(customDateIso = '') {
    const refDate = customDateIso ? new Date(customDateIso) : new Date();
    return settleGoodnightSession(true, refDate);
  },
  getState(customDateIso = '') {
    const refDate = customDateIso ? new Date(customDateIso) : new Date();
    return {
      gameMode,
      coins: player.coins,
      hp: player.hp,
      maxHp: player.maxHp,
      level: player.level,
      xp: player.xp,
      emote: player.emote,
      petAction: player.petAction,
      isGoodnightSleeping: Boolean(player.isGoodnightSleeping),
      displayedTerrariumPlants: JSON.parse(JSON.stringify(player.displayedTerrariumPlants || [])),
      terrarium: JSON.parse(JSON.stringify(player.terrarium)),
      botanicalBlessings: getBotanicalBlessings(),
      goodnightMusicbox: JSON.parse(JSON.stringify(player.goodnightMusicbox)),
      goodnightRun: { ...goodnightRun },
      lullabyAudio: petAudio.getLullabyInfo(),
      overlayVisible: Boolean(goodnightOverlayEl && !goodnightOverlayEl.classList.contains('hidden')),
      journalSummary: computeWeeklyJournalSummary(refDate),
      survivorMetrics: window.__AR5_DEBUG__.getSurvivorEffectiveMetrics(),
      openPanels: window.__AR5_DEBUG__.getState(customDateIso).openPanels
    };
  }
};

// ================= AR-7 奶油手账贴纸拼贴纪念画框 & 窗畔温暖轻电台 =================
const collageCardEl = document.getElementById('collage-frame-card');
const btnCollageDockEl = document.getElementById('btn-collage-frame');
const collageBlessingPillEl = document.getElementById('collage-blessing-pill');
const collagePillLabelEl = document.getElementById('collage-pill-label');
const collagePillTagEl = document.getElementById('collage-pill-tag');
const collageSummaryPillEl = document.getElementById('collage-summary-pill');
const collageStageEl = document.getElementById('collage-polaroid-stage');
const collagePhotoImgEl = document.getElementById('collage-photo-img');
const collageCaptionEl = document.getElementById('collage-polaroid-caption');
const btnCollageDisplayToggleEl = document.getElementById('btn-collage-display-toggle');
const btnCollageArrangeEl = document.getElementById('btn-collage-arrange');
const collageArrangeHintEl = document.getElementById('collage-arrange-hint');
const collageBlessingDescEl = document.getElementById('collage-blessing-desc');
const btnCollageSaveEl = document.getElementById('btn-collage-save');
const btnCollageGoShiftEl = document.getElementById('btn-collage-go-shift');

const cozyRadioCardEl = document.getElementById('cozy-radio-card');
const btnCozyRadioDockEl = document.getElementById('btn-cozy-radio');
const cozyRadioPillEl = document.getElementById('cozy-radio-pill');
const cozyRadioPillLabelEl = document.getElementById('cozy-radio-pill-label');
const cozyRadioPillTagEl = document.getElementById('cozy-radio-pill-tag');
const btnRadioFoldEl = document.getElementById('btn-radio-fold');
const cozyRadioStageEl = document.getElementById('cozy-radio-stage');
const cozyRadioChanTitleEl = document.getElementById('cozy-radio-chan-title');
const cozyRadioStatePillEl = document.getElementById('cozy-radio-state-pill');
const cozyRadioNoteEl = document.getElementById('cozy-radio-note');
const cozyRadioAffectionTagEl = document.getElementById('cozy-radio-affection-tag');
const btnRadioToggleEl = document.getElementById('btn-radio-toggle');
const btnRadioLogJournalEl = document.getElementById('btn-radio-log-journal');
const radioStatNotesEl = document.getElementById('radio-stat-notes');
const radioStatMinsEl = document.getElementById('radio-stat-mins');
const radioStatDailyEl = document.getElementById('radio-stat-daily');

const COLLAGE_PHOTO_SOURCES = {
  peace_snap: {
    id: 'peace_snap',
    label: '比耶照',
    src: './assets/hero_pose_peace.webp?v=hd5',
    caption: '晴空书桌 · 比耶纪念'
  },
  cheer_snap: {
    id: 'cheer_snap',
    label: '欢呼照',
    src: './assets/hero_pose_cheer.webp?v=hd5',
    caption: '满星元气 · 欢呼留念'
  },
  study_snap: {
    id: 'study_snap',
    label: '伴读照',
    src: './assets/hero_sit_edge.webp?v=hd5',
    caption: '奶油手账 · 静心伴读'
  }
};

const COZY_RADIO_CHANNEL_META = {
  ch01_guitar: {
    id: 'ch01_guitar',
    code: 'CH-01',
    title: 'CH-01 午后木吉他轻弦',
    shortName: '木吉他轻弦',
    hummingLine: '轻轻哼着午后木吉他的和弦，暖阳晒在书桌上好舒服呀~',
    noteText: '温暖原木指弹和弦流淌在窗畔，DeepSeek娘正随着节拍轻轻晃脑哼歌~'
  },
  ch02_rain_tea: {
    id: 'ch02_rain_tea',
    code: 'CH-02',
    title: 'CH-02 屋檐细雨落茶烟',
    shortName: '细雨落茶烟',
    hummingLine: '听着屋檐细雨和暖茶风铃声，心都跟着慢下来啦~',
    noteText: '绵密柔和的屋檐细雨交织暖瓷风铃，最适合泡一壶热茶静心相伴~'
  },
  ch03_hearth_jazz: {
    id: 'ch03_hearth_jazz',
    code: 'CH-03',
    title: 'CH-03 篝火暖茶爵士夜',
    shortName: '篝火爵士夜',
    hummingLine: '篝火噼啪配着柔暖电钢琴音，今晚的窗畔氛围太治愈啦~',
    noteText: '轻柔壁炉柴火声衬托温暖爵士电钢和弦，陪你度过松弛惬意的夜晚~'
  }
};

const cozyRadioRun = {
  playing: false,
  sessionSec: 0,
  minuteAccSec: 0,
  humTimer: 0,
  uiSyncAcc: 0
};

function resolveCollagePhotoSrc(photoId) {
  if (photoId === 'album_latest') {
    try {
      const raw = JSON.parse(localStorage.getItem('ar_deepseek_polaroid_album_v1') || '[]');
      if (Array.isArray(raw) && raw.length > 0 && raw[0]?.dataUrl) {
        return {
          src: raw[0].dataUrl,
          caption: '实景拍立得 · 珍藏定格'
        };
      }
    } catch (e) {}
  }
  const spec = COLLAGE_PHOTO_SOURCES[photoId] || COLLAGE_PHOTO_SOURCES.peace_snap;
  const styleSpec = COLLAGE_FRAME_STYLES[player.collageKeepsake.frameStyle] || COLLAGE_FRAME_STYLES.lace_ivory;
  return {
    src: spec.src,
    caption: `${styleSpec.name} · ${spec.caption.split(' · ')[1] || spec.label}`
  };
}

function syncCollageUI() {
  const ck = player.collageKeepsake;
  const bless = getCollageLuckBlessing();
  const styleSpec = COLLAGE_FRAME_STYLES[ck.frameStyle] || COLLAGE_FRAME_STYLES.lace_ivory;
  const photoData = resolveCollagePhotoSrc(ck.photoId);

  if (collageSummaryPillEl) {
    collageSummaryPillEl.textContent = ck.savedCount > 0 ? `已装裱 ${ck.savedCount} 帧` : '待装裱';
  }

  document.querySelectorAll('#collage-frame-style-row .collage-style-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.frameStyle === styleSpec.id);
  });

  document.querySelectorAll('#collage-photo-row .collage-photo-chip').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.photoId === ck.photoId);
  });

  if (collageStageEl) {
    collageStageEl.classList.remove('is-lace_ivory', 'is-honey_kraft', 'is-sakura_letter');
    collageStageEl.classList.add(`is-${styleSpec.id}`);
  }
  if (collagePhotoImgEl) {
    collagePhotoImgEl.src = photoData.src;
  }
  if (collageCaptionEl) {
    collageCaptionEl.textContent = photoData.caption;
  }

  for (const key of ['lace_garland', 'pressed_daisy', 'whale_stamp']) {
    const st = ck.stickers[key] || { enabled: true, xPct: 50, yPct: 50, rotDeg: 0 };
    const stageStickerEl = document.getElementById(`stage-sticker-${key}`);
    if (stageStickerEl) {
      stageStickerEl.classList.toggle('hidden', !st.enabled);
      stageStickerEl.style.left = `${st.xPct}%`;
      stageStickerEl.style.top = `${st.yPct}%`;
      stageStickerEl.style.transform = `translate(-50%, -50%) rotate(${st.rotDeg || 0}deg)`;
    }
  }

  document.querySelectorAll('#collage-sticker-grid .collage-sticker-btn').forEach((btn) => {
    const sid = btn.dataset.stickerId;
    btn.classList.toggle('active', Boolean(ck.stickers[sid]?.enabled));
  });

  if (btnCollageDisplayToggleEl) {
    btnCollageDisplayToggleEl.classList.toggle('active', Boolean(ck.deskDisplayed));
    btnCollageDisplayToggleEl.textContent = ck.deskDisplayed ? '已摆书桌' : '未摆书桌';
  }

  if (collageArrangeHintEl) {
    const preset = COLLAGE_LAYOUT_PRESETS[ck.presetIdx % COLLAGE_LAYOUT_PRESETS.length] || COLLAGE_LAYOUT_PRESETS[0];
    collageArrangeHintEl.textContent = `${preset.name} (${(ck.presetIdx % COLLAGE_LAYOUT_PRESETS.length) + 1}/4) · 可拖拽`;
  }

  if (collageBlessingDescEl) {
    const dropPct = Math.round(bless.previewLuckyDropBonus * 100);
    const magPct = Math.round(bless.previewGemMagnetPct * 100);
    const pouch = bless.previewStartingCoinPouch;
    collageBlessingDescEl.textContent = bless.active
      ? `已激活『手账幸运佑护』：掉宝+${dropPct}% · 磁吸+${magPct}% · 开局钱袋+${pouch}金`
      : `装裱后激活『手账幸运佑护』：掉宝+${dropPct}% · 磁吸+${magPct}% · 开局钱袋+${pouch}金`;
  }

  if (btnCollageGoShiftEl) {
    btnCollageGoShiftEl.classList.toggle('hidden', !bless.active);
  }
  if (btnCollageSaveEl) {
    btnCollageSaveEl.textContent = bless.active ? '更新装裱 · 刷新佑护' : '装裱保存 · 激活佑护';
  }

  if (btnCollageDockEl) {
    btnCollageDockEl.classList.toggle('has-blessing', bless.active);
    btnCollageDockEl.classList.toggle(
      'active',
      Boolean(collageCardEl && !collageCardEl.classList.contains('hidden'))
    );
  }

  if (collageBlessingPillEl) {
    const showPill = Boolean(gameMode === 'pet' && bless.active);
    collageBlessingPillEl.classList.toggle('hidden', !showPill);
    if (showPill) {
      if (collagePillLabelEl) collagePillLabelEl.textContent = styleSpec.name;
      if (collagePillTagEl) collagePillTagEl.textContent = `+${bless.startingCoinPouch}金`;
    }
  }
}

function selectCollageFrameStyle(styleId) {
  if (!COLLAGE_FRAME_STYLES[styleId]) return;
  player.collageKeepsake.frameStyle = styleId;
  playSfx('sticker_pop');
  savePetState();
  syncCollageUI();
}

function selectCollagePhoto(photoId) {
  if (!COLLAGE_PHOTO_SOURCES[photoId] && photoId !== 'album_latest') return;
  player.collageKeepsake.photoId = photoId;
  playSfx('pat');
  savePetState();
  syncCollageUI();
}

function toggleCollageSticker(stickerId) {
  const st = player.collageKeepsake.stickers?.[stickerId];
  if (!st) return;
  st.enabled = !st.enabled;
  playSfx('sticker_pop');
  savePetState();
  syncCollageUI();
}

function moveCollageSticker(stickerId, xPct, yPct, rotDeg) {
  const st = player.collageKeepsake.stickers?.[stickerId];
  if (!st) return null;
  st.xPct = Math.max(10, Math.min(90, Math.round(Number(xPct) || 50)));
  st.yPct = Math.max(10, Math.min(88, Math.round(Number(yPct) || 50)));
  if (rotDeg !== undefined) {
    st.rotDeg = Math.max(-45, Math.min(45, Math.round(Number(rotDeg) || 0)));
  }
  savePetState();
  syncCollageUI();
  return { ...st };
}

function cycleCollageLayoutPreset() {
  const ck = player.collageKeepsake;
  ck.presetIdx = ((ck.presetIdx || 0) + 1) % COLLAGE_LAYOUT_PRESETS.length;
  const preset = COLLAGE_LAYOUT_PRESETS[ck.presetIdx];
  for (const key of ['lace_garland', 'pressed_daisy', 'whale_stamp']) {
    if (ck.stickers[key] && preset[key]) {
      ck.stickers[key].xPct = preset[key].xPct;
      ck.stickers[key].yPct = preset[key].yPct;
      ck.stickers[key].rotDeg = preset[key].rotDeg;
    }
  }
  playSfx('sticker_pop');
  savePetState();
  syncCollageUI();
  return ck.presetIdx;
}

function toggleCollageDeskDisplay() {
  player.collageKeepsake.deskDisplayed = !player.collageKeepsake.deskDisplayed;
  playSfx('pat');
  savePetState();
  syncCollageUI();
  return player.collageKeepsake.deskDisplayed;
}

function saveCollageKeepsake(refDate = new Date()) {
  if (gameMode !== 'pet') switchMode('pet');
  const ck = player.collageKeepsake;
  const enabledList = ['lace_garland', 'pressed_daisy', 'whale_stamp'].filter((k) => Boolean(ck.stickers[k]?.enabled));
  if (enabledList.length === 0) {
    ck.stickers.lace_garland.enabled = true;
    enabledList.push('lace_garland');
  }
  const comboKey = `${ck.frameStyle}__${enabledList.join('_')}__p${ck.presetIdx || 0}`;
  const isNewCombo = !ck.discoveredCombos[comboKey];
  ck.discoveredCombos[comboKey] = (ck.discoveredCombos[comboKey] || 0) + 1;
  ck.savedCount = (ck.savedCount || 0) + 1;
  ck.blessingActive = true;
  ck.deskDisplayed = true;

  const coinReward = isNewCombo ? 32 : 16;
  const xpReward = isNewCombo ? 36 : 20;
  const styleSpec = COLLAGE_FRAME_STYLES[ck.frameStyle] || COLLAGE_FRAME_STYLES.lace_ivory;
  const bless = getCollageLuckBlessing();

  setNapping(false);
  player.idleTime = 0;
  player.happyTimer = 2.6;
  player.cheerTimer = 2.4;
  playSfx('star');
  spawnInteractVfx(player.x, player.y - 28, 'love', 10);
  addCoins(coinReward, player.x + 96, player.y - 22, isNewCombo ? '新装裱 ' : '手账框 ');
  addAffectionXp(xpReward, `手账拼贴 +${xpReward} 亲密`);
  recordJournalActivity('collages', 1, refDate);
  setPlayerEmote(
    `『${styleSpec.name}』拼贴纪念画框摆上书桌啦！手账幸运佑护已激活~`,
    3.0,
    'cheer',
    true
  );

  savePetState();
  syncCollageUI();
  syncWeeklyJournalUI(refDate);
  return {
    isNewCombo,
    coinReward,
    xpReward,
    blessing: bless
  };
}

function dismissCollageCard() {
  collageCardEl?.classList.add('hidden');
  btnCollageDockEl?.classList.remove('active');
}

function openCollageCard(customPhotoId = '') {
  if (!collageCardEl) return;
  if (gameMode !== 'pet') switchMode('pet');
  closeDrawer();
  dismissTopicCard();
  dismissWindowAmbienceCard();
  foldOrHidePomodoroCard();
  dismissTeatimeCard();
  dismissWeeklyJournalCard();
  dismissTerrariumCard();
  foldOrHideGoodnightCard();
  foldOrHideCozyRadioCard();
  dismissCrochetCard();
  dismissHotCocoaCard();
  dismissPressedFlowerCard();
  dismissTelescopeCard(); dismissAr10Cards(); dismissAr11Cards(); dismissAr12Cards(); dismissAr13Cards(); dismissAr14Cards(); dismissAr15Cards(); dismissAr16Cards();
  dismissPolaroid();
  closeAlbumLightbox();
  if (customPhotoId) {
    player.collageKeepsake.photoId = customPhotoId;
  }
  collageCardEl.classList.remove('hidden');
  syncCollageUI();
}

function toggleCollageCard() {
  if (!collageCardEl) return;
  if (collageCardEl.classList.contains('hidden')) {
    openCollageCard();
    playSfx('sticker_pop');
  } else {
    dismissCollageCard();
  }
}

// 贴纸舞台实时指针拖拽微调
let activeStickerDrag = null;
if (collageStageEl) {
  collageStageEl.querySelectorAll('.collage-stage-sticker').forEach((stEl) => {
    stEl.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const sid = stEl.dataset.stageSticker;
      if (!sid || !player.collageKeepsake.stickers[sid]) return;
      activeStickerDrag = { sid, pointerId: e.pointerId };
      try {
        stEl.setPointerCapture(e.pointerId);
      } catch (err) {}
    });
    stEl.addEventListener('pointermove', (e) => {
      if (!activeStickerDrag || activeStickerDrag.pointerId !== e.pointerId) return;
      const rect = collageStageEl.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const xPct = ((e.clientX - rect.left) / rect.width) * 100;
      const yPct = ((e.clientY - rect.top) / rect.height) * 100;
      moveCollageSticker(activeStickerDrag.sid, xPct, yPct);
    });
    const endDrag = (e) => {
      if (activeStickerDrag && activeStickerDrag.pointerId === e.pointerId) {
        activeStickerDrag = null;
        playSfx('sticker_pop');
      }
    };
    stEl.addEventListener('pointerup', endDrag);
    stEl.addEventListener('pointercancel', endDrag);
  });
}

// 窗畔温暖轻电台控制逻辑
function syncCozyRadioUI(refDate = new Date()) {
  const chId = player.cozyRadio.channelId || 'ch01_guitar';
  const meta = COZY_RADIO_CHANNEL_META[chId] || COZY_RADIO_CHANNEL_META.ch01_guitar;
  const audioInfo = petAudio.getCozyRadioInfo();
  const isPlaying = Boolean(cozyRadioRun.playing && audioInfo.active);
  const todayKey = formatLocalDateKey(refDate);
  const dailyClaimed = player.cozyRadio.lastDailyAffectionDate === todayKey;

  player.cozyRadioVisual = {
    playing: isPlaying,
    code: `${meta.code} 播音`
  };

  if (cozyRadioStageEl) {
    cozyRadioStageEl.classList.toggle('is-playing', isPlaying);
  }
  if (cozyRadioChanTitleEl) {
    cozyRadioChanTitleEl.textContent = meta.title;
  }
  if (cozyRadioStatePillEl) {
    cozyRadioStatePillEl.classList.toggle('is-live', isPlaying);
    cozyRadioStatePillEl.textContent = isPlaying ? '温暖播音中' : '待调频';
  }
  if (cozyRadioNoteEl) {
    cozyRadioNoteEl.textContent = isPlaying
      ? meta.noteText
      : '旋开窗畔胡桃木轻电台，DeepSeek娘会随着暖音轻轻晃脑哼歌~';
  }
  if (cozyRadioAffectionTagEl) {
    cozyRadioAffectionTagEl.textContent = dailyClaimed
      ? '今日听友心意已领：+26亲密 · +20金 · 记入周报'
      : '今日听友心意：调频收听立领 +26亲密 · +20金';
  }

  document.querySelectorAll('#cozy-radio-channel-list .cozy-radio-chan-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.radioChannel === chId);
  });

  if (btnRadioToggleEl) {
    btnRadioToggleEl.textContent = isPlaying ? '暂停轻电台播音' : '调频收听 · 开启轻电台';
  }
  if (btnRadioFoldEl) {
    btnRadioFoldEl.classList.toggle('hidden', !isPlaying);
  }
  if (radioStatNotesEl) {
    radioStatNotesEl.textContent = String(audioInfo.noteCount || 0);
  }
  if (radioStatMinsEl) {
    radioStatMinsEl.textContent = String(player.cozyRadio.totalListenMinutes || 0);
  }
  if (radioStatDailyEl) {
    radioStatDailyEl.textContent = dailyClaimed ? '已领' : '待领';
  }

  if (btnCozyRadioDockEl) {
    btnCozyRadioDockEl.classList.toggle('is-playing', isPlaying);
    btnCozyRadioDockEl.classList.toggle(
      'active',
      Boolean(cozyRadioCardEl && !cozyRadioCardEl.classList.contains('hidden'))
    );
  }

  if (cozyRadioPillEl) {
    const cardHidden = !cozyRadioCardEl || cozyRadioCardEl.classList.contains('hidden');
    const showPill = Boolean(gameMode === 'pet' && isPlaying && cardHidden);
    cozyRadioPillEl.classList.toggle('hidden', !showPill);
    if (showPill) {
      if (cozyRadioPillLabelEl) cozyRadioPillLabelEl.textContent = meta.shortName;
      if (cozyRadioPillTagEl) cozyRadioPillTagEl.textContent = meta.code;
    }
  }
}

function grantDailyRadioListenerAffectionIfEligible(refDate = new Date()) {
  const todayKey = formatLocalDateKey(refDate);
  if (player.cozyRadio.lastDailyAffectionDate === todayKey) {
    return false;
  }
  player.cozyRadio.lastDailyAffectionDate = todayKey;
  addCoins(20, player.x - 88, player.y - 24, '听友礼 ');
  addAffectionXp(26, '今日听友心意 +26 亲密');
  spawnInteractVfx(player.x, player.y - 26, 'love', 9);
  return true;
}

function tuneCozyRadioChannel(channelId, autoPlay = true, refDate = new Date()) {
  const validId = COZY_RADIO_CHANNEL_META[channelId] ? channelId : 'ch01_guitar';
  player.cozyRadio.channelId = validId;
  const meta = COZY_RADIO_CHANNEL_META[validId];

  if (autoPlay) {
    if (gameMode !== 'pet') switchMode('pet');
    if (goodnightRun.status === 'running' || goodnightRun.status === 'paused') {
      cancelGoodnightSession(true);
    }
    setNapping(false);
    cozyRadioRun.playing = true;
    cozyRadioRun.humTimer = 14;
    player.cozyRadio.totalTuneSessions = (player.cozyRadio.totalTuneSessions || 0) + 1;
    player.isRadioListening = true;
    player.petAction = 'radio_sway';
    player.idleTime = 0;
    player.happyTimer = 2.2;
    petAudio.startCozyRadio(validId);
    grantDailyRadioListenerAffectionIfEligible(refDate);
    setPlayerEmote(meta.hummingLine, 3.0, 'happy', true);
  } else {
    petAudio.setCozyRadioChannel(validId);
  }

  savePetState();
  syncCozyRadioUI(refDate);
  syncWeeklyJournalUI(refDate);
  return petAudio.getCozyRadioInfo();
}

function toggleCozyRadioPlayback(refDate = new Date()) {
  if (cozyRadioRun.playing) {
    cozyRadioRun.playing = false;
    player.isRadioListening = false;
    petAudio.stopCozyRadio();
    setPlayerEmote('先把窗畔轻电台旋到静音档，随时再陪主人听歌~', 2.0, 'happy', false);
    savePetState();
    syncCozyRadioUI(refDate);
    return false;
  }
  tuneCozyRadioChannel(player.cozyRadio.channelId || 'ch01_guitar', true, refDate);
  return true;
}

function pauseCozyRadioForModeSwitch() {
  cozyRadioRun.playing = false;
  player.isRadioListening = false;
  petAudio.stopCozyRadio();
  syncCozyRadioUI();
}

function advanceCozyRadioTime(dtSec, refDate = new Date()) {
  if (!cozyRadioRun.playing) return 0;
  const sec = Math.max(0, Number(dtSec) || 0);
  cozyRadioRun.sessionSec += sec;
  cozyRadioRun.minuteAccSec += sec;
  let minsAdded = 0;
  while (cozyRadioRun.minuteAccSec >= 60) {
    cozyRadioRun.minuteAccSec -= 60;
    minsAdded += 1;
  }
  if (minsAdded > 0) {
    player.cozyRadio.totalListenMinutes = (player.cozyRadio.totalListenMinutes || 0) + minsAdded;
    recordJournalActivity('radioMins', minsAdded, refDate);
    savePetState();
  }
  return minsAdded;
}

function logCozyRadioSessionToJournal(refDate = new Date()) {
  if (!cozyRadioRun.playing) {
    tuneCozyRadioChannel(player.cozyRadio.channelId || 'ch01_guitar', true, refDate);
  }
  const bonusMins = Math.max(1, Math.round(cozyRadioRun.minuteAccSec / 30) || 1);
  cozyRadioRun.minuteAccSec = 0;
  player.cozyRadio.totalListenMinutes = (player.cozyRadio.totalListenMinutes || 0) + bonusMins;
  recordJournalActivity('radioMins', bonusMins, refDate);
  playSfx('star');
  spawnInteractVfx(player.x, player.y - 24, 'sparkle', 7);
  setPlayerEmote(`已将窗畔轻电台 ${bonusMins} 分钟收听时光记入手账周报啦~`, 2.5, 'happy', false);
  savePetState();
  syncCozyRadioUI(refDate);
  syncWeeklyJournalUI(refDate);
  return player.cozyRadio.totalListenMinutes;
}

function updateCozyRadioCompanion(dt) {
  if (!cozyRadioRun.playing || gameMode !== 'pet') {
    player.isRadioListening = false;
    return;
  }
  advanceCozyRadioTime(dt);
  cozyRadioRun.humTimer -= dt;
  cozyRadioRun.uiSyncAcc += dt;
  if (cozyRadioRun.humTimer <= 0) {
    cozyRadioRun.humTimer = 16;
    const meta = COZY_RADIO_CHANNEL_META[player.cozyRadio.channelId] || COZY_RADIO_CHANNEL_META.ch01_guitar;
    if (player.emoteTimer <= 0.1) {
      setPlayerEmote(meta.hummingLine, 2.6, 'happy', false);
    }
  }
  if (cozyRadioRun.uiSyncAcc >= 0.8) {
    cozyRadioRun.uiSyncAcc = 0;
    syncCozyRadioUI();
  }
}

function foldOrHideCozyRadioCard() {
  cozyRadioCardEl?.classList.add('hidden');
  syncCozyRadioUI();
}

function openCozyRadioCard() {
  if (!cozyRadioCardEl) return;
  if (gameMode !== 'pet') switchMode('pet');
  closeDrawer();
  dismissTopicCard();
  dismissWindowAmbienceCard();
  foldOrHidePomodoroCard();
  dismissTeatimeCard();
  dismissWeeklyJournalCard();
  dismissTerrariumCard();
  foldOrHideGoodnightCard();
  dismissCollageCard();
  dismissCrochetCard();
  dismissHotCocoaCard();
  dismissPressedFlowerCard();
  dismissTelescopeCard(); dismissAr10Cards(); dismissAr11Cards(); dismissAr12Cards(); dismissAr13Cards(); dismissAr14Cards(); dismissAr15Cards(); dismissAr16Cards();
  dismissPolaroid();
  closeAlbumLightbox();
  cozyRadioCardEl.classList.remove('hidden');
  syncCozyRadioUI();
}

function toggleCozyRadioCard() {
  if (!cozyRadioCardEl) return;
  if (cozyRadioCardEl.classList.contains('hidden')) {
    openCozyRadioCard();
    playSfx('radio_tune');
  } else {
    foldOrHideCozyRadioCard();
  }
}

if (collageCardEl) {
  collageCardEl.addEventListener('pointerdown', (e) => e.stopPropagation());
}
if (cozyRadioCardEl) {
  cozyRadioCardEl.addEventListener('pointerdown', (e) => e.stopPropagation());
}

bindHudTap(btnCollageDockEl, () => {
  toggleCollageCard();
});
bindHudTap(document.getElementById('btn-collage-close'), () => {
  dismissCollageCard();
});
bindHudTap(collageBlessingPillEl, () => {
  openCollageCard();
});
document.querySelectorAll('#collage-frame-style-row .collage-style-btn').forEach((btn) => {
  bindHudTap(btn, () => {
    selectCollageFrameStyle(btn.dataset.frameStyle);
  });
});
document.querySelectorAll('#collage-photo-row .collage-photo-chip').forEach((btn) => {
  bindHudTap(btn, () => {
    selectCollagePhoto(btn.dataset.photoId);
  });
});
document.querySelectorAll('#collage-sticker-grid .collage-sticker-btn').forEach((btn) => {
  bindHudTap(btn, () => {
    toggleCollageSticker(btn.dataset.stickerId);
  });
});
bindHudTap(btnCollageArrangeEl, () => {
  cycleCollageLayoutPreset();
});
bindHudTap(btnCollageDisplayToggleEl, () => {
  toggleCollageDeskDisplay();
});
bindHudTap(btnCollageSaveEl, () => {
  saveCollageKeepsake();
});
bindHudTap(btnCollageGoShiftEl, () => {
  dismissCollageCard();
  switchMode('survivor');
});

bindHudTap(btnCozyRadioDockEl, () => {
  toggleCozyRadioCard();
});
bindHudTap(document.getElementById('btn-cozy-radio-close'), () => {
  foldOrHideCozyRadioCard();
});
bindHudTap(btnRadioFoldEl, () => {
  foldOrHideCozyRadioCard();
});
bindHudTap(cozyRadioPillEl, () => {
  openCozyRadioCard();
});
document.querySelectorAll('#cozy-radio-channel-list .cozy-radio-chan-btn').forEach((btn) => {
  bindHudTap(btn, () => {
    tuneCozyRadioChannel(btn.dataset.radioChannel, true);
  });
});
bindHudTap(btnRadioToggleEl, () => {
  toggleCozyRadioPlayback();
});
bindHudTap(btnRadioLogJournalEl, () => {
  logCozyRadioSessionToJournal();
});

syncCollageUI();
syncCozyRadioUI();

window.__AR7_DEBUG__ = {
  getFrameStyles() {
    return JSON.parse(JSON.stringify(COLLAGE_FRAME_STYLES));
  },
  getStickerSpecs() {
    return JSON.parse(JSON.stringify(COLLAGE_STICKER_SPECS));
  },
  selectFrameStyle(styleId) {
    selectCollageFrameStyle(styleId);
    return this.getState();
  },
  toggleSticker(stickerId) {
    toggleCollageSticker(stickerId);
    return this.getState();
  },
  moveSticker(stickerId, xPct, yPct, rotDeg) {
    return moveCollageSticker(stickerId, xPct, yPct, rotDeg);
  },
  cycleLayout() {
    cycleCollageLayoutPreset();
    return this.getState();
  },
  saveCollage(customDateIso = '') {
    const refDate = customDateIso ? new Date(customDateIso) : new Date();
    return saveCollageKeepsake(refDate);
  },
  tuneRadio(channelId, autoPlay = true, customDateIso = '') {
    const refDate = customDateIso ? new Date(customDateIso) : new Date();
    return tuneCozyRadioChannel(channelId, autoPlay, refDate);
  },
  fastForwardRadio(seconds = 180, customDateIso = '') {
    const refDate = customDateIso ? new Date(customDateIso) : new Date();
    const mins = advanceCozyRadioTime(Math.max(0, Number(seconds) || 0), refDate);
    syncCozyRadioUI(refDate);
    syncWeeklyJournalUI(refDate);
    return { minsAdded: mins, state: this.getState(customDateIso) };
  },
  getState(customDateIso = '') {
    const refDate = customDateIso ? new Date(customDateIso) : new Date();
    return {
      gameMode,
      coins: player.coins,
      survivorSessionCoins,
      hp: player.hp,
      level: player.level,
      xp: player.xp,
      emote: player.emote,
      petAction: player.petAction,
      isRadioListening: Boolean(player.isRadioListening),
      collageKeepsake: JSON.parse(JSON.stringify(player.collageKeepsake)),
      collageLuckBlessing: getCollageLuckBlessing(),
      cozyRadio: JSON.parse(JSON.stringify(player.cozyRadio)),
      cozyRadioRun: { ...cozyRadioRun },
      radioAudio: petAudio.getCozyRadioInfo(),
      journalSummary: computeWeeklyJournalSummary(refDate),
      survivorMetrics: window.__AR5_DEBUG__.getSurvivorEffectiveMetrics(),
      openPanels: window.__AR5_DEBUG__.getState(customDateIso).openPanels
    };
  }
};

// ================= AR-8 奶油手账毛线钩针手作篮 & 暖冬棉花糖热可可吧台 =================
const crochetCardEl = document.getElementById('crochet-basket-card');
const btnCrochetDockEl = document.getElementById('btn-crochet-basket');
const crochetGuardPillEl = document.getElementById('crochet-guard-pill');
const crochetPillLabelEl = document.getElementById('crochet-pill-label');
const crochetPillTagEl = document.getElementById('crochet-pill-tag');
const crochetSummaryPillEl = document.getElementById('crochet-summary-pill');
const crochetYarnCountEl = document.getElementById('crochet-yarn-count');
const crochetYarnSubEl = document.getElementById('crochet-yarn-sub');
const btnCrochetDailyYarnEl = document.getElementById('btn-crochet-daily-yarn');
const btnCrochetYarnPackEl = document.getElementById('btn-crochet-yarn-pack');
const crochetMainKnitImgEl = document.getElementById('crochet-main-knit-img');
const crochetStageBadgeEl = document.getElementById('crochet-stage-badge');
const crochetKnitTitleEl = document.getElementById('crochet-knit-title');
const btnCrochetDisplayToggleEl = document.getElementById('btn-crochet-display-toggle');
const crochetKnitNoteEl = document.getElementById('crochet-knit-note');
const crochetCostHintEl = document.getElementById('crochet-cost-hint');
const crochetGuardDescEl = document.getElementById('crochet-guard-desc');
const btnCrochetCraftEl = document.getElementById('btn-crochet-craft');
const btnCrochetGiftEl = document.getElementById('btn-crochet-gift');
const btnCrochetGoShiftEl = document.getElementById('btn-crochet-go-shift');
const crochetTotalGuardEl = document.getElementById('crochet-total-guard');

const hotCocoaCardEl = document.getElementById('hot-cocoa-card');
const btnHotCocoaDockEl = document.getElementById('btn-hot-cocoa');
const hotCocoaPillEl = document.getElementById('hot-cocoa-pill');
const hotCocoaPillLabelEl = document.getElementById('hot-cocoa-pill-label');
const hotCocoaPillClockEl = document.getElementById('hot-cocoa-pill-clock');
const cocoaCodexPillEl = document.getElementById('cocoa-codex-pill');
const cocoaPrevToppingIcoEl = document.getElementById('cocoa-prev-topping-ico');
const cocoaBlendNameEl = document.getElementById('cocoa-blend-name');
const cocoaBlendStatusEl = document.getElementById('cocoa-blend-status');
const cocoaBlendNoteEl = document.getElementById('cocoa-blend-note');
const cocoaBuffTagsEl = document.getElementById('cocoa-buff-tags');
const btnCocoaServeEl = document.getElementById('btn-cocoa-serve');
const btnCocoaGoShiftEl = document.getElementById('btn-cocoa-go-shift');
const cocoaActiveBuffBarEl = document.getElementById('cocoa-active-buff-bar');
const cocoaCodexGridEl = document.getElementById('cocoa-codex-grid');

function syncCrochetUI(refDate = new Date()) {
  const cb = player.crochetBasket;
  if (!cb) return;
  const guard = getCrochetWarmGuard();
  const todayKey = formatLocalDateKey(refDate);
  const dailyClaimed = cb.lastDailyYarnDate === todayKey;
  const selId = CROCHET_KNIT_SPECS[cb.selectedKnit] ? cb.selectedKnit : 'whale_scarf';
  cb.selectedKnit = selId;
  const selSpec = CROCHET_KNIT_SPECS[selId];
  const selSt = cb.knits[selId] || { level: 0, crafts: 0, giftedCount: 0 };
  const selLv = Math.max(0, Math.min(3, Math.round(Number(selSt.level) || 0)));

  const deskSpec = CROCHET_KNIT_SPECS[guard.displayedKnitId] || CROCHET_KNIT_SPECS.whale_scarf;
  player.crochetDeskVisual = {
    displayed: Boolean(guard.deskDisplayed && guard.displayedKnitLevel >= 1),
    knitId: deskSpec.id,
    spriteKey: deskSpec.spriteKey,
    shortName: deskSpec.shortName,
    name: deskSpec.name,
    level: guard.displayedKnitLevel
  };

  if (crochetSummaryPillEl) {
    crochetSummaryPillEl.textContent = `暖绒 Lv.${guard.totalLevel}/9`;
  }
  if (crochetYarnCountEl) {
    crochetYarnCountEl.textContent = String(cb.yarnSkeins || 0);
  }
  if (crochetYarnSubEl) {
    crochetYarnSubEl.textContent = `互动掉线已收 ${cb.careDropCount || 0} 团 · 累计收集 ${cb.totalYarnCollected || 0} 团`;
  }
  if (btnCrochetDailyYarnEl) {
    btnCrochetDailyYarnEl.disabled = dailyClaimed;
    btnCrochetDailyYarnEl.textContent = dailyClaimed ? '今日已领' : '今日毛线 +4';
  }
  if (btnCrochetYarnPackEl) {
    btnCrochetYarnPackEl.disabled = player.coins < 10;
    btnCrochetYarnPackEl.textContent = '添线 10金+3';
  }

  document.querySelectorAll('#crochet-knit-grid .terrarium-plant-tab').forEach((btn) => {
    const kid = btn.dataset.knitId;
    btn.classList.toggle('active', kid === selId);
    const lv = Math.max(0, Math.min(3, Math.round(Number(cb.knits?.[kid]?.level) || 0)));
    const tagEl = document.getElementById(`knit-tab-lv-${kid}`);
    if (tagEl) {
      tagEl.textContent = lv <= 0 ? '待起针' : `${getCrochetStageLabel(lv)} Lv.${lv}`;
    }
  });

  if (crochetMainKnitImgEl) {
    crochetMainKnitImgEl.src = selSpec.img;
  }
  if (crochetStageBadgeEl) {
    crochetStageBadgeEl.textContent = `${getCrochetStageLabel(selLv)} · Lv.${selLv}`;
  }
  if (crochetKnitTitleEl) {
    crochetKnitTitleEl.textContent = selSpec.name;
  }
  if (crochetKnitNoteEl) {
    crochetKnitNoteEl.textContent = selSpec.note;
  }

  if (btnCrochetDisplayToggleEl) {
    if (selLv <= 0) {
      btnCrochetDisplayToggleEl.disabled = true;
      btnCrochetDisplayToggleEl.classList.remove('is-on');
      btnCrochetDisplayToggleEl.textContent = '织成后摆桌';
    } else if (guard.deskDisplayed && guard.displayedKnitId === selId) {
      btnCrochetDisplayToggleEl.disabled = false;
      btnCrochetDisplayToggleEl.classList.add('is-on');
      btnCrochetDisplayToggleEl.textContent = '木桌展示中';
    } else {
      btnCrochetDisplayToggleEl.disabled = false;
      btnCrochetDisplayToggleEl.classList.remove('is-on');
      btnCrochetDisplayToggleEl.textContent = '摆上木桌';
    }
  }

  const needYarn = CROCHET_YARN_COSTS[selLv] || 0;
  if (crochetCostHintEl) {
    if (selLv >= 3) {
      crochetCostHintEl.textContent = '已达满针 Lv.3 · 可随时切换木桌展示与暖心抚摸互动~';
    } else if (selLv === 0) {
      crochetCostHintEl.textContent = `起针消耗 ${needYarn} 团毛线 · 赠予立得 +24金 与 +30亲密`;
    } else {
      const nextLv = selLv + 1;
      crochetCostHintEl.textContent = `升阶至 Lv.${nextLv} 消耗 ${needYarn} 团毛线 · 赠予立得 +${18 + nextLv * 6}金 与 +${24 + nextLv * 6}亲密`;
    }
  }
  if (crochetGuardDescEl) {
    crochetGuardDescEl.textContent = selSpec.specialty;
  }

  if (btnCrochetCraftEl) {
    if (selLv >= 3) {
      btnCrochetCraftEl.disabled = true;
      btnCrochetCraftEl.textContent = '已满针 Lv.3';
    } else {
      const canAfford = (cb.yarnSkeins || 0) >= needYarn;
      btnCrochetCraftEl.disabled = !canAfford;
      btnCrochetCraftEl.textContent =
        selLv === 0
          ? `钩针起针 · 赠予她 (${needYarn}团)`
          : `细密升阶 Lv.${selLv + 1} (${needYarn}团)`;
    }
  }

  if (btnCrochetGiftEl) {
    btnCrochetGiftEl.disabled = selLv <= 0;
    btnCrochetGiftEl.textContent =
      selLv <= 0
        ? '待织成赠礼'
        : guard.displayedKnitId === selId && guard.deskDisplayed
          ? '暖心轻抚信物'
          : '赠予并摆上木桌';
  }

  if (btnCrochetGoShiftEl) {
    btnCrochetGoShiftEl.classList.toggle('hidden', !guard.active);
  }

  if (crochetTotalGuardEl) {
    crochetTotalGuardEl.textContent = guard.active
      ? `暖绒手作守护生效中：幸存者减伤 +${Math.round(guard.damageReductionPct * 100)}% · 开局暖绒护盾 +${guard.cozyShieldBonus} · 爱心磁吸 +${Math.round(guard.heartMagnetBonusPct * 100)}%`
      : '暖绒手作守护：钩针编织任意信物即可激活幸存者「减伤 + 暖绒护盾 + 爱心磁吸」';
  }

  if (btnCrochetDockEl) {
    btnCrochetDockEl.classList.toggle('has-guard', guard.active);
    btnCrochetDockEl.classList.toggle(
      'active',
      Boolean(crochetCardEl && !crochetCardEl.classList.contains('hidden'))
    );
  }

  if (crochetGuardPillEl) {
    const showPill = Boolean(gameMode === 'pet' && guard.active);
    crochetGuardPillEl.classList.toggle('hidden', !showPill);
    if (showPill) {
      if (crochetPillLabelEl) crochetPillLabelEl.textContent = guard.displayedKnitShortName || '暖绒守护';
      if (crochetPillTagEl) crochetPillTagEl.textContent = `Lv.${guard.totalLevel}`;
    }
  }
}
syncCrochetUIFn = syncCrochetUI;

function claimDailyCrochetYarn(refDate = new Date()) {
  const todayKey = formatLocalDateKey(refDate);
  if (player.crochetBasket.lastDailyYarnDate === todayKey) {
    setPlayerEmote('今天的 4 团免费暖绒毛线已经收进竹篮里啦~', 1.8, 'happy', false);
    return { ok: false, reason: 'already_claimed', yarnSkeins: player.crochetBasket.yarnSkeins };
  }
  player.crochetBasket.lastDailyYarnDate = todayKey;
  player.crochetBasket.yarnSkeins = (player.crochetBasket.yarnSkeins || 0) + 4;
  player.crochetBasket.totalYarnCollected = (player.crochetBasket.totalYarnCollected || 0) + 4;
  playSfx('crochet_stitch');
  player.happyTimer = 1.8;
  spawnInteractVfx(player.x, player.y - 24, 'sparkle', 6);
  setPlayerEmote('领到今日 4 团软绵绵暖绒毛线啦，挑一款钩针信物织起来吧~', 2.4, 'happy', true);
  savePetState();
  syncCrochetUI(refDate);
  return { ok: true, added: 4, yarnSkeins: player.crochetBasket.yarnSkeins };
}

function buyCrochetYarnPack() {
  const cost = 10;
  if (player.coins < cost) {
    setPlayerEmote('金币还差一点点，摸摸头或喂食也能掉落毛线团哦~', 2.0, 'happy', false);
    return { ok: false, reason: 'insufficient_coins' };
  }
  player.coins -= cost;
  player.crochetBasket.yarnSkeins = (player.crochetBasket.yarnSkeins || 0) + 3;
  player.crochetBasket.totalYarnCollected = (player.crochetBasket.totalYarnCollected || 0) + 3;
  playSfx('crochet_stitch');
  player.happyTimer = 1.4;
  spawnInteractVfx(player.x, player.y - 22, 'sparkle', 5);
  setPlayerEmote('添置了 3 团奶油配色毛线球，手作竹篮满满当当~', 2.0, 'happy', false);
  savePetState();
  syncCrochetUI();
  return { ok: true, added: 3, yarnSkeins: player.crochetBasket.yarnSkeins, coins: player.coins };
}

function selectCrochetKnit(knitId) {
  if (!CROCHET_KNIT_SPECS[knitId]) return;
  player.crochetBasket.selectedKnit = knitId;
  playSfx('pat');
  savePetState();
  syncCrochetUI();
}

function crochetOrUpgradeKnit(customKnitId = '', refDate = new Date()) {
  if (gameMode !== 'pet') switchMode('pet');
  const knitId = CROCHET_KNIT_SPECS[customKnitId]
    ? customKnitId
    : CROCHET_KNIT_SPECS[player.crochetBasket.selectedKnit]
      ? player.crochetBasket.selectedKnit
      : 'whale_scarf';
  player.crochetBasket.selectedKnit = knitId;
  const spec = CROCHET_KNIT_SPECS[knitId];
  const st = player.crochetBasket.knits[knitId];
  if (!spec || !st) return { ok: false, reason: 'invalid_knit' };

  const curLv = Math.max(0, Math.min(3, Math.round(Number(st.level) || 0)));
  if (curLv >= 3) {
    setPlayerEmote(`『${spec.name}』已经织到满针 Lv.3 啦，摆在木桌上超暖和~`, 2.2, 'happy', false);
    return { ok: false, reason: 'max_level', level: curLv };
  }

  const cost = CROCHET_YARN_COSTS[curLv] || 2;
  if ((player.crochetBasket.yarnSkeins || 0) < cost) {
    setPlayerEmote('毛线团还差一点，领今日免费毛线或摸头喂食就能攒够咯~', 2.2, 'happy', false);
    return { ok: false, reason: 'insufficient_yarn', needed: cost, have: player.crochetBasket.yarnSkeins || 0 };
  }

  player.crochetBasket.yarnSkeins -= cost;
  st.level = curLv + 1;
  st.crafts = (st.crafts || 0) + 1;
  st.giftedCount = (st.giftedCount || 0) + 1;
  player.crochetBasket.totalStitches = (player.crochetBasket.totalStitches || 0) + 1;
  player.crochetBasket.displayedKnitId = knitId;
  player.crochetBasket.deskDisplayed = true;

  const coinReward = 18 + st.level * 6;
  const xpReward = 24 + st.level * 6;

  playSfx('crochet_stitch');
  playSfx('celesta_chime');
  petAudio.haptic('headpat');
  player.idleTime = 0;
  player.happyTimer = 2.8;
  player.cheerTimer = 2.4;
  player.rubbingTimer = 1.8;
  spawnInteractVfx(player.x, player.y - 28, 'love', 10);
  addCoins(coinReward, player.x + 26, player.y - 44, '手作礼 ');
  addAffectionXp(xpReward, `赠予${spec.shortName} Lv.${st.level} +${xpReward} 亲密`);

  const giftLine = spec.giftLines[Math.min(spec.giftLines.length - 1, st.level - 1)] || spec.note;
  setPlayerEmote(giftLine, 3.2, 'cheer', true);

  recordJournalActivity('knits', 1, refDate);
  savePetState();
  syncCrochetUI(refDate);
  syncWeeklyJournalUI(refDate);
  if (gameMode === 'survivor') syncSurvivorSkillStrip();

  return {
    ok: true,
    knitId,
    level: st.level,
    stage: getCrochetStageLabel(st.level),
    coinReward,
    xpReward,
    yarnSkeins: player.crochetBasket.yarnSkeins,
    warmGuard: getCrochetWarmGuard()
  };
}

function giftOrInteractCrochetKnit(customKnitId = '') {
  if (gameMode !== 'pet') switchMode('pet');
  const knitId = CROCHET_KNIT_SPECS[customKnitId]
    ? customKnitId
    : CROCHET_KNIT_SPECS[player.crochetBasket.selectedKnit]
      ? player.crochetBasket.selectedKnit
      : 'whale_scarf';
  const spec = CROCHET_KNIT_SPECS[knitId];
  const st = player.crochetBasket.knits[knitId];
  const lv = Math.max(0, Math.min(3, Math.round(Number(st?.level) || 0)));
  if (!spec || lv <= 0) return { ok: false, reason: 'not_crafted' };

  player.crochetBasket.selectedKnit = knitId;
  player.crochetBasket.displayedKnitId = knitId;
  player.crochetBasket.deskDisplayed = true;
  st.giftedCount = (st.giftedCount || 0) + 1;

  playSfx('crochet_stitch');
  petAudio.haptic('pat');
  player.idleTime = 0;
  player.happyTimer = 2.4;
  player.rubbingTimer = 1.8;
  spawnInteractVfx(player.x, player.y - 26, 'love', 8);
  const giftLine = spec.giftLines[Math.min(spec.giftLines.length - 1, lv - 1)] || spec.note;
  setPlayerEmote(giftLine, 2.8, 'happy', true);

  savePetState();
  syncCrochetUI();
  return {
    ok: true,
    knitId,
    level: lv,
    displayedKnitId: player.crochetBasket.displayedKnitId,
    deskDisplayed: player.crochetBasket.deskDisplayed
  };
}

function toggleCrochetDeskDisplay() {
  const selId = CROCHET_KNIT_SPECS[player.crochetBasket.selectedKnit]
    ? player.crochetBasket.selectedKnit
    : 'whale_scarf';
  const spec = CROCHET_KNIT_SPECS[selId];
  const lv = Math.max(0, Math.min(3, Math.round(Number(player.crochetBasket.knits?.[selId]?.level) || 0)));
  if (!spec || lv <= 0) return false;

  if (player.crochetBasket.deskDisplayed && player.crochetBasket.displayedKnitId === selId) {
    player.crochetBasket.deskDisplayed = false;
    setPlayerEmote(`已把『${spec.name}』轻轻收回毛线手作篮珍藏~`, 2.0, 'happy', false);
  } else {
    player.crochetBasket.displayedKnitId = selId;
    player.crochetBasket.deskDisplayed = true;
    setPlayerEmote(`已将『${spec.name}』摆在胡桃木书桌上暖心相伴~`, 2.2, 'happy', true);
  }
  playSfx('crochet_stitch');
  savePetState();
  syncCrochetUI();
  return Boolean(player.crochetBasket.deskDisplayed);
}

function dismissCrochetCard() {
  crochetCardEl?.classList.add('hidden');
  btnCrochetDockEl?.classList.remove('active');
}

function openCrochetCard() {
  if (!crochetCardEl) return;
  if (gameMode !== 'pet') switchMode('pet');
  closeDrawer();
  dismissTopicCard();
  dismissWindowAmbienceCard();
  foldOrHidePomodoroCard();
  dismissTeatimeCard();
  dismissWeeklyJournalCard();
  dismissTerrariumCard();
  foldOrHideGoodnightCard();
  dismissCollageCard();
  foldOrHideCozyRadioCard();
  dismissHotCocoaCard();
  dismissPressedFlowerCard();
  dismissTelescopeCard(); dismissAr10Cards(); dismissAr11Cards(); dismissAr12Cards(); dismissAr13Cards(); dismissAr14Cards(); dismissAr15Cards(); dismissAr16Cards();
  dismissPolaroid();
  closeAlbumLightbox();
  crochetCardEl.classList.remove('hidden');
  syncCrochetUI();
}

function toggleCrochetCard() {
  if (!crochetCardEl) return;
  if (crochetCardEl.classList.contains('hidden')) {
    openCrochetCard();
    playSfx('crochet_stitch');
  } else {
    dismissCrochetCard();
  }
}

// 暖冬棉花糖热可可吧台控制逻辑
function syncHotCocoaUI() {
  const hc = player.hotCocoa;
  if (!hc) return;
  const baseId = HOT_COCOA_BASES[hc.selectedBase] ? hc.selectedBase : 'mellow_dark';
  const toppingId = HOT_COCOA_TOPPINGS[hc.selectedTopping] ? hc.selectedTopping : 'star_marshmallow';
  hc.selectedBase = baseId;
  hc.selectedTopping = toppingId;

  const blend = getHotCocoaBlend(baseId, toppingId);
  const discoveredMap =
    hc.discoveredBlends && typeof hc.discoveredBlends === 'object' ? hc.discoveredBlends : {};
  const discoveredSet = new Set(Object.keys(discoveredMap));
  const isDiscovered = discoveredSet.has(blend.id);

  if (cocoaCodexPillEl) {
    cocoaCodexPillEl.textContent = `特调 ${discoveredSet.size}/${HOT_COCOA_BLENDS.length}`;
  }

  document.querySelectorAll('#cocoa-base-grid .teatime-pick-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.cocoaBase === baseId);
  });
  document.querySelectorAll('#cocoa-topping-grid .teatime-pick-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.cocoaTopping === toppingId);
  });

  if (cocoaPrevToppingIcoEl) {
    cocoaPrevToppingIcoEl.src = HOT_COCOA_TOPPINGS[toppingId].img;
  }
  if (cocoaBlendNameEl) {
    cocoaBlendNameEl.textContent = blend.name;
  }
  if (cocoaBlendStatusEl) {
    cocoaBlendStatusEl.classList.toggle('is-new', !isDiscovered);
    cocoaBlendStatusEl.textContent = isDiscovered ? '已收录图鉴' : '新特调 +首创奖';
  }
  if (cocoaBlendNoteEl) {
    cocoaBlendNoteEl.textContent = blend.note;
  }
  if (cocoaBuffTagsEl) {
    cocoaBuffTagsEl.innerHTML = [
      `攻速 +${Math.round((blend.attackHastePct || 0) * 100)}%`,
      `财运 +${Math.round((blend.coinLuckPct || 0) * 100)}%`,
      `掉宝 +${Math.round((blend.luckyDropBonus || 0) * 100)}%`
    ]
      .map((tag) => `<span class="teatime-buff-chip">${tag}</span>`)
      .join('');
  }

  if (cocoaCodexGridEl) {
    cocoaCodexGridEl.innerHTML = '';
    for (const item of HOT_COCOA_BLENDS) {
      const unlocked = discoveredSet.has(item.id);
      const isCurrent = item.id === blend.id;
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = `cocoa-codex-dot${unlocked ? ' unlocked' : ''}${isCurrent ? ' current' : ''}`;
      dot.title = unlocked ? `${item.name}（${item.buffTitle}）` : '待调制解锁热可可特调';
      const topImg = HOT_COCOA_TOPPINGS[item.toppingId]?.img || './assets/cocoa_marshmallow_topping.webp?v=hd31';
      dot.innerHTML = `<img src="${topImg}" alt="" />`;
      bindHudTap(dot, () => {
        hc.selectedBase = item.baseId;
        hc.selectedTopping = item.toppingId;
        playSfx('cocoa_clink');
        savePetState();
        syncHotCocoaUI();
      });
      cocoaCodexGridEl.appendChild(dot);
    }
  }

  const activeBuff = getActiveHotCocoaBuff();
  if (btnCocoaGoShiftEl) {
    btnCocoaGoShiftEl.classList.toggle('hidden', !activeBuff);
  }
  if (cocoaActiveBuffBarEl) {
    if (activeBuff) {
      cocoaActiveBuffBarEl.classList.add('is-active');
      cocoaActiveBuffBarEl.textContent = `当前暖意：『${activeBuff.name}』${activeBuff.buffTitle} · 剩余 ${formatPomodoroClock(activeBuff.remainingSec)}`;
    } else {
      cocoaActiveBuffBarEl.classList.remove('is-active');
      cocoaActiveBuffBarEl.textContent = '端上热可可即可激活 8 分钟「幸存者打工」攻速与财运暖意增益~';
    }
  }

  if (btnHotCocoaDockEl) {
    btnHotCocoaDockEl.classList.toggle('has-buff', Boolean(activeBuff));
    btnHotCocoaDockEl.classList.toggle(
      'active',
      Boolean(hotCocoaCardEl && !hotCocoaCardEl.classList.contains('hidden'))
    );
  }

  if (hotCocoaPillEl) {
    const showPill = Boolean(gameMode === 'pet' && activeBuff);
    hotCocoaPillEl.classList.toggle('hidden', !showPill);
    if (showPill) {
      if (hotCocoaPillLabelEl) hotCocoaPillLabelEl.textContent = activeBuff.buffTitle || '暖可可';
      if (hotCocoaPillClockEl) hotCocoaPillClockEl.textContent = formatPomodoroClock(activeBuff.remainingSec);
    }
  }
}

function selectCocoaBase(baseId) {
  if (!HOT_COCOA_BASES[baseId]) return;
  player.hotCocoa.selectedBase = baseId;
  playSfx('cocoa_clink');
  savePetState();
  syncHotCocoaUI();
}

function selectCocoaTopping(toppingId) {
  if (!HOT_COCOA_TOPPINGS[toppingId]) return;
  player.hotCocoa.selectedTopping = toppingId;
  playSfx('cocoa_clink');
  savePetState();
  syncHotCocoaUI();
}

function serveHotCocoaBlend(refDate = new Date()) {
  if (gameMode !== 'pet') switchMode('pet');
  const baseId = HOT_COCOA_BASES[player.hotCocoa.selectedBase]
    ? player.hotCocoa.selectedBase
    : 'mellow_dark';
  const toppingId = HOT_COCOA_TOPPINGS[player.hotCocoa.selectedTopping]
    ? player.hotCocoa.selectedTopping
    : 'star_marshmallow';
  const blend = getHotCocoaBlend(baseId, toppingId);

  if (!player.hotCocoa.discoveredBlends || typeof player.hotCocoa.discoveredBlends !== 'object') {
    player.hotCocoa.discoveredBlends = {};
  }
  const prevRec = player.hotCocoa.discoveredBlends[blend.id];
  const isFirstDiscovery = !prevRec;
  player.hotCocoa.discoveredBlends[blend.id] = {
    count: (prevRec?.count || 0) + 1,
    firstDate: prevRec?.firstDate || formatLocalDateKey(refDate)
  };
  player.hotCocoa.totalServed = (player.hotCocoa.totalServed || 0) + 1;
  player.hotCocoa.activeBuff = {
    blendId: blend.id,
    name: blend.name,
    buffTitle: blend.buffTitle,
    baseId: blend.baseId,
    toppingId: blend.toppingId,
    attackHastePct: blend.attackHastePct,
    coinLuckPct: blend.coinLuckPct,
    luckyDropBonus: blend.luckyDropBonus,
    remainingSec: 480,
    totalSec: 480
  };

  player.cocoaCupTimer = 9.5;
  player.cocoaToppingId = blend.toppingId;
  player.eatingTimer = Math.max(player.eatingTimer || 0, 2.2);
  player.happyTimer = 2.8;
  player.cheerTimer = isFirstDiscovery ? 2.4 : 1.6;
  player.petAction = 'rice';
  player.idleTime = 0;
  player.hunger = Math.min(player.maxHunger, player.hunger + 24);
  player.hp = Math.min(player.maxHp, player.hp + 20);

  const chimeVariant =
    blend.baseId === 'sea_salt_caramel' ? 1 : blend.baseId === 'hazelnut_cream' ? 2 : 0;
  petAudio.playCocoaServeChime(chimeVariant);
  petAudio.haptic('headpat');
  spawnInteractVfx(player.x, player.y - 26, 'love', isFirstDiscovery ? 10 : 7);

  const coinReward = isFirstDiscovery ? 32 : 18;
  const xpReward = isFirstDiscovery ? 36 : 20;
  addCoins(coinReward, player.x + 28, player.y - 46, isFirstDiscovery ? '新可可 ' : '暖可可 ');
  addAffectionXp(
    xpReward,
    isFirstDiscovery ? `解锁特调「${blend.name}」` : `品饮「${blend.name}」`
  );

  grantInteractiveCareYarnDrop('cocoa');
  recordJournalActivity('cocoas', 1, refDate);
  setPlayerEmote(
    isFirstDiscovery ? `新暖饮解锁！『${blend.name}』：${blend.reaction}` : blend.reaction,
    3.2,
    isFirstDiscovery ? 'cheer' : 'happy',
    true
  );

  savePetState();
  syncHotCocoaUI();
  syncWeeklyJournalUI(refDate);
  if (gameMode === 'survivor') syncSurvivorSkillStrip();

  return {
    ok: true,
    blend,
    isFirstDiscovery,
    coinReward,
    xpReward,
    activeBuff: { ...player.hotCocoa.activeBuff },
    audio: petAudio.getAr8AudioInfo()
  };
}

let cocoaBuffUiSyncAcc = 0;
let cocoaBuffSaveAcc = 0;
function updateHotCocoaBuff(dt) {
  if (player.cocoaCupTimer > 0) {
    player.cocoaCupTimer = Math.max(0, player.cocoaCupTimer - dt);
  }
  const buff = player.hotCocoa?.activeBuff;
  if (!buff || buff.remainingSec <= 0) return;
  const decayRate = gameMode === 'survivor' ? 1 : 0.25;
  buff.remainingSec = Math.max(0, buff.remainingSec - dt * decayRate);
  cocoaBuffUiSyncAcc += dt;
  cocoaBuffSaveAcc += dt;
  if (buff.remainingSec <= 0) {
    player.hotCocoa.activeBuff = null;
    cocoaBuffUiSyncAcc = 0;
    cocoaBuffSaveAcc = 0;
    savePetState();
    syncHotCocoaUI();
    if (gameMode === 'survivor') syncSurvivorSkillStrip();
    return;
  }
  if (cocoaBuffUiSyncAcc >= 1.0) {
    cocoaBuffUiSyncAcc = 0;
    syncHotCocoaUI();
  }
  if (cocoaBuffSaveAcc >= 8.0) {
    cocoaBuffSaveAcc = 0;
    savePetState();
  }
}

function dismissHotCocoaCard() {
  hotCocoaCardEl?.classList.add('hidden');
  btnHotCocoaDockEl?.classList.remove('active');
}

function openHotCocoaCard() {
  if (!hotCocoaCardEl) return;
  if (gameMode !== 'pet') switchMode('pet');
  closeDrawer();
  dismissTopicCard();
  dismissWindowAmbienceCard();
  foldOrHidePomodoroCard();
  dismissTeatimeCard();
  dismissWeeklyJournalCard();
  dismissTerrariumCard();
  foldOrHideGoodnightCard();
  dismissCollageCard();
  foldOrHideCozyRadioCard();
  dismissCrochetCard();
  dismissPressedFlowerCard();
  dismissTelescopeCard(); dismissAr10Cards(); dismissAr11Cards(); dismissAr12Cards(); dismissAr13Cards(); dismissAr14Cards(); dismissAr15Cards(); dismissAr16Cards();
  dismissPolaroid();
  closeAlbumLightbox();
  hotCocoaCardEl.classList.remove('hidden');
  syncHotCocoaUI();
}

function toggleHotCocoaCard() {
  if (!hotCocoaCardEl) return;
  if (hotCocoaCardEl.classList.contains('hidden')) {
    openHotCocoaCard();
    playSfx('cocoa_clink');
  } else {
    dismissHotCocoaCard();
  }
}

if (crochetCardEl) {
  crochetCardEl.addEventListener('pointerdown', (e) => e.stopPropagation());
}
if (hotCocoaCardEl) {
  hotCocoaCardEl.addEventListener('pointerdown', (e) => e.stopPropagation());
}

bindHudTap(btnCrochetDockEl, () => {
  toggleCrochetCard();
});
bindHudTap(document.getElementById('btn-crochet-close'), () => {
  dismissCrochetCard();
});
bindHudTap(crochetGuardPillEl, () => {
  openCrochetCard();
});
bindHudTap(btnCrochetDailyYarnEl, () => {
  claimDailyCrochetYarn();
});
bindHudTap(btnCrochetYarnPackEl, () => {
  buyCrochetYarnPack();
});
document.querySelectorAll('#crochet-knit-grid .terrarium-plant-tab').forEach((btn) => {
  bindHudTap(btn, () => {
    selectCrochetKnit(btn.dataset.knitId);
  });
});
bindHudTap(btnCrochetDisplayToggleEl, () => {
  toggleCrochetDeskDisplay();
});
bindHudTap(btnCrochetCraftEl, () => {
  crochetOrUpgradeKnit();
});
bindHudTap(btnCrochetGiftEl, () => {
  giftOrInteractCrochetKnit();
});
bindHudTap(btnCrochetGoShiftEl, () => {
  dismissCrochetCard();
  switchMode('survivor');
});

bindHudTap(btnHotCocoaDockEl, () => {
  toggleHotCocoaCard();
});
bindHudTap(document.getElementById('btn-cocoa-close'), () => {
  dismissHotCocoaCard();
});
bindHudTap(hotCocoaPillEl, () => {
  openHotCocoaCard();
});
document.querySelectorAll('#cocoa-base-grid .teatime-pick-btn').forEach((btn) => {
  bindHudTap(btn, () => {
    selectCocoaBase(btn.dataset.cocoaBase);
  });
});
document.querySelectorAll('#cocoa-topping-grid .teatime-pick-btn').forEach((btn) => {
  bindHudTap(btn, () => {
    selectCocoaTopping(btn.dataset.cocoaTopping);
  });
});
bindHudTap(btnCocoaServeEl, () => {
  serveHotCocoaBlend();
});
bindHudTap(btnCocoaGoShiftEl, () => {
  dismissHotCocoaCard();
  switchMode('survivor');
});

syncCrochetUI();
syncHotCocoaUI();

window.__AR8_DEBUG__ = {
  getKnitSpecs() {
    return JSON.parse(JSON.stringify(CROCHET_KNIT_SPECS));
  },
  getCocoaBlends() {
    return HOT_COCOA_BLENDS.map((b) => ({ ...b }));
  },
  claimDailyYarn(customDateIso = '') {
    const refDate = customDateIso ? new Date(customDateIso) : new Date();
    return claimDailyCrochetYarn(refDate);
  },
  addYarnForTest(amount = 6) {
    const add = Math.max(0, Math.round(Number(amount) || 0));
    player.crochetBasket.yarnSkeins = (player.crochetBasket.yarnSkeins || 0) + add;
    player.crochetBasket.totalYarnCollected = (player.crochetBasket.totalYarnCollected || 0) + add;
    savePetState();
    syncCrochetUI();
    return player.crochetBasket.yarnSkeins;
  },
  craftKnit(knitId = '', customDateIso = '') {
    const refDate = customDateIso ? new Date(customDateIso) : new Date();
    return crochetOrUpgradeKnit(knitId, refDate);
  },
  giftKnit(knitId = '') {
    return giftOrInteractCrochetKnit(knitId);
  },
  toggleKnitDeskDisplay() {
    return toggleCrochetDeskDisplay();
  },
  brewAndServeCocoa(baseId = '', toppingId = '', customDateIso = '') {
    if (HOT_COCOA_BASES[baseId]) player.hotCocoa.selectedBase = baseId;
    if (HOT_COCOA_TOPPINGS[toppingId]) player.hotCocoa.selectedTopping = toppingId;
    const refDate = customDateIso ? new Date(customDateIso) : new Date();
    return serveHotCocoaBlend(refDate);
  },
  fastForwardCocoaBuff(seconds = 60) {
    const sec = Math.max(0, Number(seconds) || 0);
    if (player.hotCocoa?.activeBuff) {
      player.hotCocoa.activeBuff.remainingSec = Math.max(
        0,
        player.hotCocoa.activeBuff.remainingSec - sec
      );
      if (player.hotCocoa.activeBuff.remainingSec <= 0) {
        player.hotCocoa.activeBuff = null;
      }
      savePetState();
      syncHotCocoaUI();
      if (gameMode === 'survivor') syncSurvivorSkillStrip();
    }
    return this.getState();
  },
  spawnContactEnemyForTest() {
    if (gameMode !== 'survivor') switchMode('survivor');
    enemies.push({
      x: player.x,
      y: player.y,
      vx: 0,
      vy: 0,
      r: 22,
      hp: 999,
      maxHp: 999,
      speed: 0,
      isFlyer: true,
      isElite: false,
      isBoss: false,
      jumpCd: 9
    });
    return { hpBefore: player.hp, knitShieldBefore: survivorRun.knitShield };
  },
  getState(customDateIso = '') {
    const refDate = customDateIso ? new Date(customDateIso) : new Date();
    return {
      gameMode,
      coins: player.coins,
      survivorSessionCoins,
      hp: player.hp,
      maxHp: player.maxHp,
      hunger: player.hunger,
      level: player.level,
      xp: player.xp,
      emote: player.emote,
      petAction: player.petAction,
      cocoaCupTimer: player.cocoaCupTimer || 0,
      crochetDeskVisual: player.crochetDeskVisual ? { ...player.crochetDeskVisual } : null,
      crochetBasket: JSON.parse(JSON.stringify(player.crochetBasket)),
      crochetWarmGuard: getCrochetWarmGuard(),
      hotCocoa: JSON.parse(JSON.stringify(player.hotCocoa)),
      ar8Audio: petAudio.getAr8AudioInfo(),
      journalSummary: computeWeeklyJournalSummary(refDate),
      survivorMetrics: window.__AR5_DEBUG__.getSurvivorEffectiveMetrics(),
      openPanels: window.__AR5_DEBUG__.getState(customDateIso).openPanels
    };
  }
};

// ================= AR-9 奶油手账干花标本压花册 & 窗畔星夜天文望远镜 =================
const pressedFlowerCardEl = document.getElementById('pressed-flower-card');
const btnPressedDockEl = document.getElementById('btn-pressed-flowers');
const pressedFlowerPillEl = document.getElementById('pressed-flower-pill');
const pressedFlowerPillLabelEl = document.getElementById('pressed-flower-pill-label');
const pressedFlowerPillTagEl = document.getElementById('pressed-flower-pill-tag');
const pressedSummaryPillEl = document.getElementById('pressed-summary-pill');
const btnPressedDailyGatherEl = document.getElementById('btn-pressed-daily-gather');
const btnPressedFlowerPackEl = document.getElementById('btn-pressed-flower-pack');
const pressedMainBookmarkImgEl = document.getElementById('pressed-main-bookmark-img');
const pressedStageBadgeEl = document.getElementById('pressed-stage-badge');
const pressedBookmarkTitleEl = document.getElementById('pressed-bookmark-title');
const btnPressedDisplayToggleEl = document.getElementById('btn-pressed-display-toggle');
const pressedBookmarkNoteEl = document.getElementById('pressed-bookmark-note');
const pressedCostHintEl = document.getElementById('pressed-cost-hint');
const pressedBlessDescEl = document.getElementById('pressed-bless-desc');
const btnPressedPressEl = document.getElementById('btn-pressed-press');
const btnPressedGiftEl = document.getElementById('btn-pressed-gift');
const btnPressedGoShiftEl = document.getElementById('btn-pressed-go-shift');
const pressedTotalBlessEl = document.getElementById('pressed-total-bless');

const telescopeCardEl = document.getElementById('telescope-card');
const btnTelescopeDockEl = document.getElementById('btn-telescope');
const starChartPillEl = document.getElementById('star-chart-pill');
const starChartPillTagEl = document.getElementById('star-chart-pill-tag');
const telescopeCodexPillEl = document.getElementById('telescope-codex-pill');
const telescopeSkyEl = document.getElementById('telescope-sky');
const telescopeSkyLinesEl = document.getElementById('telescope-sky-lines');
const telescopeSkyStarsEl = document.getElementById('telescope-sky-stars');
const telescopeSkyIdleEl = document.getElementById('telescope-sky-idle');
const telescopeSkyProgressEl = document.getElementById('telescope-sky-progress');
const telescopeStepHintEl = document.getElementById('telescope-step-hint');
const telescopeIdentifyGridEl = document.getElementById('telescope-identify-grid');
const btnTelescopeStartEl = document.getElementById('btn-telescope-start');
const btnTelescopeGoShiftEl = document.getElementById('btn-telescope-go-shift');
const starChartSubEl = document.getElementById('star-chart-sub');
const starChartGridEl = document.getElementById('star-chart-grid');
const telescopeTotalBonusEl = document.getElementById('telescope-total-bonus');

const PRESSED_FLOWER_PACK_COST = 12;
const PRESSED_DAILY_PER_PETAL = 2;
// 望远镜视野固定宽高比（与 CSS aspect-ratio 一致），用于把百分比坐标换算成连线长度与角度
const TELESCOPE_SKY_ASPECT = 2.4;

function syncPressedFlowerUI(refDate = new Date()) {
  const pf = player.pressedFlowers;
  if (!pf) return;
  const bless = getPressedFlowerBlessing();
  const todayKey = formatLocalDateKey(refDate);
  const dailyClaimed = pf.lastDailyGatherDate === todayKey;
  const selId = PRESSED_BOOKMARK_SPECS[pf.selectedBookmark] ? pf.selectedBookmark : 'sakura';
  pf.selectedBookmark = selId;
  const selSpec = PRESSED_BOOKMARK_SPECS[selId];
  const selLv = bless.levels[selId] || 0;

  player.pressedDeskVisual = {
    displayed: bless.deskDisplayed,
    totalLevel: bless.totalLevel,
    items: bless.unlockedIds.map((id) => ({
      id,
      spriteKey: PRESSED_BOOKMARK_SPECS[id].spriteKey,
      shortName: PRESSED_BOOKMARK_SPECS[id].shortName,
      level: bless.levels[id]
    }))
  };

  if (pressedSummaryPillEl) {
    pressedSummaryPillEl.textContent = `压花 Lv.${bless.totalLevel}/9`;
  }
  for (const id of PRESSED_BOOKMARK_IDS) {
    const countEl = document.getElementById(`petal-count-${id}`);
    if (countEl) countEl.textContent = String(pf.petals[id] || 0);
  }
  document.querySelectorAll('#pressed-petal-stock .pressed-petal-chip').forEach((chip) => {
    chip.classList.toggle('is-selected', chip.dataset.petalChip === selId);
  });
  if (btnPressedDailyGatherEl) {
    btnPressedDailyGatherEl.disabled = dailyClaimed;
    btnPressedDailyGatherEl.textContent = dailyClaimed ? '今日已拾' : `今日拾花 +${PRESSED_DAILY_PER_PETAL * 3}`;
  }
  if (btnPressedFlowerPackEl) {
    btnPressedFlowerPackEl.disabled = player.coins < PRESSED_FLOWER_PACK_COST;
    btnPressedFlowerPackEl.textContent = `花束 ${PRESSED_FLOWER_PACK_COST}金+3`;
  }

  document.querySelectorAll('#pressed-bookmark-grid .terrarium-plant-tab').forEach((btn) => {
    const bid = btn.dataset.bookmarkId;
    btn.classList.toggle('active', bid === selId);
    const lv = bless.levels[bid] || 0;
    const tagEl = document.getElementById(`bookmark-tab-lv-${bid}`);
    if (tagEl) {
      tagEl.textContent = lv <= 0 ? '待压制' : `${getPressedStageLabel(lv)} Lv.${lv}`;
    }
  });

  if (pressedMainBookmarkImgEl && pressedMainBookmarkImgEl.getAttribute('src') !== selSpec.img) {
    pressedMainBookmarkImgEl.src = selSpec.img;
  }
  if (pressedStageBadgeEl) pressedStageBadgeEl.textContent = `${getPressedStageLabel(selLv)} · Lv.${selLv}`;
  if (pressedBookmarkTitleEl) pressedBookmarkTitleEl.textContent = selSpec.name;
  if (pressedBookmarkNoteEl) pressedBookmarkNoteEl.textContent = selSpec.note;
  if (pressedBlessDescEl) pressedBlessDescEl.textContent = selSpec.specialty;

  if (btnPressedDisplayToggleEl) {
    if (!bless.active) {
      btnPressedDisplayToggleEl.disabled = true;
      btnPressedDisplayToggleEl.classList.remove('is-on');
      btnPressedDisplayToggleEl.textContent = '压制后陈列';
    } else if (pf.deskDisplayed) {
      btnPressedDisplayToggleEl.disabled = false;
      btnPressedDisplayToggleEl.classList.add('is-on');
      btnPressedDisplayToggleEl.textContent = '木桌陈列中';
    } else {
      btnPressedDisplayToggleEl.disabled = false;
      btnPressedDisplayToggleEl.classList.remove('is-on');
      btnPressedDisplayToggleEl.textContent = '摆上木桌';
    }
  }

  const needPetals = PRESSED_PETAL_COSTS[selLv] || 0;
  const havePetals = pf.petals[selId] || 0;
  if (pressedCostHintEl) {
    if (selLv >= 3) {
      pressedCostHintEl.textContent = '已达珍藏 Lv.3 · 可随时轻抚书签或切换木桌陈列~';
    } else {
      const nextLv = selLv + 1;
      pressedCostHintEl.textContent = `${selLv === 0 ? '压制' : `升阶至 Lv.${nextLv} `}消耗 ${needPetals} 片${selSpec.petalName}（现有 ${havePetals}） · 赠予 +${16 + nextLv * 6}金 +${22 + nextLv * 6}亲密`;
    }
  }

  if (btnPressedPressEl) {
    if (selLv >= 3) {
      btnPressedPressEl.disabled = true;
      btnPressedPressEl.textContent = '已珍藏满级';
    } else {
      btnPressedPressEl.disabled = havePetals < needPetals;
      btnPressedPressEl.textContent =
        selLv === 0 ? `压制书签 · 赠予她 (${needPetals}片)` : `升阶 Lv.${selLv + 1} (${needPetals}片)`;
    }
  }
  if (btnPressedGiftEl) {
    btnPressedGiftEl.disabled = selLv <= 0;
    btnPressedGiftEl.textContent = selLv <= 0 ? '待压制赠礼' : '轻抚书签';
  }
  if (btnPressedGoShiftEl) {
    btnPressedGoShiftEl.classList.toggle('hidden', !bless.active);
  }
  if (pressedTotalBlessEl) {
    pressedTotalBlessEl.textContent = bless.active
      ? `幸运再生佑护生效中：幸运掉宝 +${Math.round(bless.luckyDropBonus * 100)}% · 体力再生 +${bless.hpRegenPerSec.toFixed(2)}/秒 · 金币幸运 +${Math.round(bless.coinLuckPct * 100)}%`
      : '幸运再生佑护：压制任意干花书签即可激活幸存者「幸运掉宝 + 体力再生 + 金币幸运」';
  }

  if (btnPressedDockEl) {
    btnPressedDockEl.classList.toggle('has-bless', bless.active);
    btnPressedDockEl.classList.toggle(
      'active',
      Boolean(pressedFlowerCardEl && !pressedFlowerCardEl.classList.contains('hidden'))
    );
  }
  if (pressedFlowerPillEl) {
    const showPill = Boolean(gameMode === 'pet' && bless.active);
    pressedFlowerPillEl.classList.toggle('hidden', !showPill);
    if (showPill) {
      if (pressedFlowerPillLabelEl) pressedFlowerPillLabelEl.textContent = '幸运再生';
      if (pressedFlowerPillTagEl) pressedFlowerPillTagEl.textContent = `Lv.${bless.totalLevel}`;
    }
  }
}
syncPressedFlowerUIFn = syncPressedFlowerUI;

function claimDailyPressedFlowers(refDate = new Date()) {
  const pf = player.pressedFlowers;
  const todayKey = formatLocalDateKey(refDate);
  if (pf.lastDailyGatherDate === todayKey) {
    setPlayerEmote('今天窗台边的花材已经拾进压花册啦，明天再来吧~', 1.8, 'happy', false);
    return { ok: false, reason: 'already_claimed', petals: { ...pf.petals } };
  }
  pf.lastDailyGatherDate = todayKey;
  for (const id of PRESSED_BOOKMARK_IDS) {
    pf.petals[id] = (pf.petals[id] || 0) + PRESSED_DAILY_PER_PETAL;
  }
  pf.totalPetalsCollected = (pf.totalPetalsCollected || 0) + PRESSED_DAILY_PER_PETAL * 3;
  playSfx('page_press');
  player.happyTimer = 1.8;
  spawnInteractVfx(player.x, player.y - 24, 'sparkle', 6);
  setPlayerEmote('拾到樱瓣、银杏和满天星各 2 份，夹进压花册啦~', 2.4, 'happy', true);
  savePetState();
  syncPressedFlowerUI(refDate);
  return { ok: true, added: PRESSED_DAILY_PER_PETAL * 3, petals: { ...pf.petals } };
}

function buyPressedFlowerPack() {
  const pf = player.pressedFlowers;
  if (player.coins < PRESSED_FLOWER_PACK_COST) {
    setPlayerEmote('金币还差一点点，照料花房也能拾到花材哦~', 2.0, 'happy', false);
    return { ok: false, reason: 'insufficient_coins' };
  }
  player.coins -= PRESSED_FLOWER_PACK_COST;
  for (const id of PRESSED_BOOKMARK_IDS) {
    pf.petals[id] = (pf.petals[id] || 0) + 1;
  }
  pf.totalPetalsCollected = (pf.totalPetalsCollected || 0) + 3;
  playSfx('page_press');
  player.happyTimer = 1.4;
  spawnInteractVfx(player.x, player.y - 22, 'sparkle', 5);
  setPlayerEmote('从花市捧回一小束樱瓣、银杏和满天星，香香的~', 2.0, 'happy', false);
  savePetState();
  syncPressedFlowerUI();
  return { ok: true, added: 3, petals: { ...pf.petals }, coins: player.coins };
}

function selectPressedBookmark(bookmarkId) {
  if (!PRESSED_BOOKMARK_SPECS[bookmarkId]) return;
  player.pressedFlowers.selectedBookmark = bookmarkId;
  playSfx('pat');
  savePetState();
  syncPressedFlowerUI();
}

function pressOrUpgradeBookmark(customId = '', refDate = new Date()) {
  if (gameMode !== 'pet') switchMode('pet');
  const pf = player.pressedFlowers;
  const bookmarkId = PRESSED_BOOKMARK_SPECS[customId]
    ? customId
    : PRESSED_BOOKMARK_SPECS[pf.selectedBookmark]
      ? pf.selectedBookmark
      : 'sakura';
  pf.selectedBookmark = bookmarkId;
  const spec = PRESSED_BOOKMARK_SPECS[bookmarkId];
  const st = pf.bookmarks[bookmarkId];
  if (!spec || !st) return { ok: false, reason: 'invalid_bookmark' };

  const curLv = Math.max(0, Math.min(3, Math.round(Number(st.level) || 0)));
  if (curLv >= 3) {
    setPlayerEmote(`『${spec.name}』已经是珍藏级 Lv.3 啦，夹在手账最喜欢的那一页~`, 2.2, 'happy', false);
    return { ok: false, reason: 'max_level', level: curLv };
  }
  const cost = PRESSED_PETAL_COSTS[curLv] || 2;
  const have = pf.petals[bookmarkId] || 0;
  if (have < cost) {
    setPlayerEmote(`${spec.petalName}还差 ${cost - have} 片，今日拾花或照料花房就能攒够啦~`, 2.2, 'happy', false);
    return { ok: false, reason: 'insufficient_petals', needed: cost, have };
  }

  pf.petals[bookmarkId] = have - cost;
  st.level = curLv + 1;
  st.strokes = (st.strokes || 0) + 1;
  pf.totalPresses = (pf.totalPresses || 0) + 1;
  pf.deskDisplayed = true;

  const coinReward = 16 + st.level * 6;
  const xpReward = 22 + st.level * 6;
  playSfx('page_press');
  playSfx('celesta_chime');
  petAudio.haptic('headpat');
  player.idleTime = 0;
  player.happyTimer = 2.8;
  player.cheerTimer = 2.4;
  spawnInteractVfx(player.x, player.y - 28, 'love', 10);
  addCoins(coinReward, player.x + 26, player.y - 44, '压花礼 ');
  addAffectionXp(xpReward, `赠予${spec.shortName} Lv.${st.level} +${xpReward} 亲密`);
  const giftLine = spec.giftLines[Math.min(spec.giftLines.length - 1, st.level - 1)] || spec.note;
  setPlayerEmote(giftLine, 3.2, 'cheer', true);

  recordJournalActivity('presses', 1, refDate);
  savePetState();
  syncPressedFlowerUI(refDate);
  syncWeeklyJournalUI(refDate);
  if (gameMode === 'survivor') syncSurvivorSkillStrip();

  return {
    ok: true,
    bookmarkId,
    level: st.level,
    stage: getPressedStageLabel(st.level),
    coinReward,
    xpReward,
    petals: { ...pf.petals },
    blessing: getPressedFlowerBlessing()
  };
}

function caressPressedBookmark(customId = '') {
  if (gameMode !== 'pet') switchMode('pet');
  const pf = player.pressedFlowers;
  const bookmarkId = PRESSED_BOOKMARK_SPECS[customId] ? customId : pf.selectedBookmark;
  const spec = PRESSED_BOOKMARK_SPECS[bookmarkId];
  const st = pf.bookmarks[bookmarkId];
  const lv = Math.max(0, Math.min(3, Math.round(Number(st?.level) || 0)));
  if (!spec || lv <= 0) return { ok: false, reason: 'not_pressed' };
  pf.selectedBookmark = bookmarkId;
  pf.deskDisplayed = true;
  st.strokes = (st.strokes || 0) + 1;
  playSfx('page_press');
  petAudio.haptic('pat');
  player.idleTime = 0;
  player.happyTimer = 2.4;
  spawnInteractVfx(player.x, player.y - 26, 'love', 7);
  const giftLine = spec.giftLines[Math.min(spec.giftLines.length - 1, lv - 1)] || spec.note;
  setPlayerEmote(giftLine, 2.8, 'happy', true);
  savePetState();
  syncPressedFlowerUI();
  return { ok: true, bookmarkId, level: lv, strokes: st.strokes, deskDisplayed: pf.deskDisplayed };
}

function togglePressedDeskDisplay() {
  const pf = player.pressedFlowers;
  const bless = getPressedFlowerBlessing();
  if (!bless.active) return false;
  pf.deskDisplayed = !pf.deskDisplayed;
  if (pf.deskDisplayed) {
    setPlayerEmote(`已把 ${bless.unlockedCount} 枚干花书签立在胡桃木书桌上陈列啦~`, 2.2, 'happy', true);
  } else {
    setPlayerEmote('已把干花书签轻轻夹回压花册里珍藏~', 2.0, 'happy', false);
  }
  playSfx('page_press');
  savePetState();
  syncPressedFlowerUI();
  return Boolean(pf.deskDisplayed);
}

function dismissPressedFlowerCard() {
  pressedFlowerCardEl?.classList.add('hidden');
  btnPressedDockEl?.classList.remove('active');
}

function openPressedFlowerCard() {
  if (!pressedFlowerCardEl) return;
  if (gameMode !== 'pet') switchMode('pet');
  closeDrawer();
  dismissTopicCard();
  dismissWindowAmbienceCard();
  foldOrHidePomodoroCard();
  dismissTeatimeCard();
  dismissWeeklyJournalCard();
  dismissTerrariumCard();
  foldOrHideGoodnightCard();
  dismissCollageCard();
  foldOrHideCozyRadioCard();
  dismissCrochetCard();
  dismissHotCocoaCard();
  dismissTelescopeCard(); dismissAr10Cards(); dismissAr11Cards(); dismissAr12Cards(); dismissAr13Cards(); dismissAr14Cards(); dismissAr15Cards(); dismissAr16Cards();
  dismissPolaroid();
  closeAlbumLightbox();
  pressedFlowerCardEl.classList.remove('hidden');
  syncPressedFlowerUI();
}

function togglePressedFlowerCard() {
  if (!pressedFlowerCardEl) return;
  if (pressedFlowerCardEl.classList.contains('hidden')) {
    openPressedFlowerCard();
    playSfx('page_press');
  } else {
    dismissPressedFlowerCard();
  }
}

// 窗畔星夜天文望远镜：按序连星 -> 辨认形状 -> 收录星图
const stargazeRun = {
  active: false,
  phase: 'idle',
  targetId: '',
  nextIdx: 0,
  mistakes: 0,
  options: [],
  wrongOptions: [],
  decoys: [],
  lastResult: null
};

function pickStargazeTargetId(customId = '') {
  if (CONSTELLATION_BY_ID[customId]) return customId;
  const ts = player.telescope;
  const firstNew = CONSTELLATION_SPECS.find((c) => !ts.constellations[c.id]);
  if (firstNew) return firstNew.id;
  return CONSTELLATION_SPECS[(ts.totalSessions || 0) % CONSTELLATION_SPECS.length].id;
}

function buildStargazeOptions(targetId) {
  const n = CONSTELLATION_SPECS.length;
  const idx = Math.max(0, CONSTELLATION_SPECS.findIndex((c) => c.id === targetId));
  const list = [targetId, CONSTELLATION_SPECS[(idx + 1) % n].id, CONSTELLATION_SPECS[(idx + 3) % n].id];
  const rot = ((player.telescope.totalSessions || 0) + idx) % list.length;
  return [...list.slice(rot), ...list.slice(0, rot)];
}

function renderStargazeSky() {
  if (!telescopeSkyStarsEl || !telescopeSkyLinesEl) return;
  telescopeSkyStarsEl.innerHTML = '';
  telescopeSkyLinesEl.innerHTML = '';
  if (!stargazeRun.active) return;
  const spec = CONSTELLATION_BY_ID[stargazeRun.targetId];
  if (!spec) return;

  for (const [a, b] of spec.edges) {
    const s1 = spec.stars[a];
    const s2 = spec.stars[b];
    const dx = s2.x - s1.x;
    const dyW = (s2.y - s1.y) / TELESCOPE_SKY_ASPECT;
    const line = document.createElement('span');
    line.className = 'tele-line';
    line.dataset.edgeA = String(a);
    line.dataset.edgeB = String(b);
    line.style.left = `${s1.x}%`;
    line.style.top = `${s1.y}%`;
    line.style.width = `${Math.hypot(dx, dyW).toFixed(3)}%`;
    line.style.transform = `rotate(${((Math.atan2(dyW, dx) * 180) / Math.PI).toFixed(2)}deg)`;
    telescopeSkyLinesEl.appendChild(line);
  }

  const makeStar = (pt, key, label, isDecoy) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `tele-star${isDecoy ? ' is-decoy' : ''}`;
    btn.dataset.starKey = key;
    btn.style.left = `${pt.x}%`;
    btn.style.top = `${pt.y}%`;
    btn.setAttribute('aria-label', isDecoy ? '一颗暗淡的星星' : `第 ${label} 号星星`);
    btn.innerHTML = `<img src="./assets/vfx_sparkle.webp?v=hd31" alt="" class="tele-star-img" />${
      isDecoy ? '' : `<em class="tele-star-num">${label}</em>`
    }`;
    telescopeSkyStarsEl.appendChild(btn);
  };
  stargazeRun.decoys.forEach((pt, i) => makeStar(pt, `d${i}`, '', true));
  spec.stars.forEach((pt, i) => makeStar(pt, `c${i}`, String(i + 1), false));
}

function renderStargazeOptions() {
  if (!telescopeIdentifyGridEl) return;
  telescopeIdentifyGridEl.innerHTML = '';
  if (!stargazeRun.active || stargazeRun.phase !== 'identify') return;
  for (const optId of stargazeRun.options) {
    const c = CONSTELLATION_BY_ID[optId];
    if (!c) continue;
    const isWrong = stargazeRun.wrongOptions.includes(optId);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `tele-option${isWrong ? ' is-wrong' : ''}`;
    btn.dataset.optionId = optId;
    btn.disabled = isWrong;
    btn.innerHTML = `<strong>${c.name}</strong><em>${c.shape}</em>`;
    telescopeIdentifyGridEl.appendChild(btn);
  }
}

function flashStargazeStar(starKey) {
  const el = telescopeSkyStarsEl?.querySelector(`[data-star-key="${starKey}"]`);
  if (!el) return;
  el.classList.remove('is-wrong');
  void el.offsetWidth;
  el.classList.add('is-wrong');
  setTimeout(() => el.classList.remove('is-wrong'), 460);
}

function startStargazeSession(customId = '') {
  if (gameMode !== 'pet') switchMode('pet');
  const targetId = pickStargazeTargetId(customId);
  const spec = CONSTELLATION_BY_ID[targetId];
  stargazeRun.active = true;
  stargazeRun.phase = 'connect';
  stargazeRun.targetId = targetId;
  stargazeRun.nextIdx = 0;
  stargazeRun.mistakes = 0;
  stargazeRun.options = [];
  stargazeRun.wrongOptions = [];
  stargazeRun.decoys = getStargazeDecoys(spec);
  stargazeRun.lastResult = null;
  playSfx('telescope_focus');
  player.idleTime = 0;
  player.happyTimer = 1.4;
  setPlayerEmote(`望远镜对准啦！按 1→${spec.stars.length} 把星星连起来吧~`, 2.6, 'happy', false);
  renderStargazeSky();
  renderStargazeOptions();
  syncTelescopeUI();
  return {
    ok: true,
    targetId,
    starCount: spec.stars.length,
    decoyCount: stargazeRun.decoys.length
  };
}

function tapStargazeStar(starKey) {
  if (!stargazeRun.active || stargazeRun.phase !== 'connect') {
    return { ok: false, reason: 'not_connecting' };
  }
  const spec = CONSTELLATION_BY_ID[stargazeRun.targetId];
  const key = String(starKey || '');
  const isDecoy = key.startsWith('d');
  const idx = Number(key.slice(1));
  if (!isDecoy && !Number.isFinite(idx)) return { ok: false, reason: 'invalid_star' };
  if (!isDecoy && idx < stargazeRun.nextIdx) return { ok: false, reason: 'already_linked' };

  if (!isDecoy && idx === stargazeRun.nextIdx) {
    stargazeRun.nextIdx += 1;
    player.telescope.totalStarsLinked = (player.telescope.totalStarsLinked || 0) + 1;
    petAudio.playStarLinkNote(idx);
    player.idleTime = 0;
    if (stargazeRun.nextIdx >= spec.stars.length) {
      stargazeRun.phase = 'identify';
      stargazeRun.options = buildStargazeOptions(spec.id);
      stargazeRun.wrongOptions = [];
      player.happyTimer = 2.0;
      setPlayerEmote('星星都连好啦！这个形状像哪一座星座呢？', 2.4, 'happy', false);
      renderStargazeOptions();
    }
    savePetState();
    syncTelescopeUI();
    return { ok: true, linked: stargazeRun.nextIdx, total: spec.stars.length, phase: stargazeRun.phase };
  }

  stargazeRun.mistakes += 1;
  playSfx('star_miss');
  flashStargazeStar(key);
  setPlayerEmote(`嗯…这颗不是第 ${stargazeRun.nextIdx + 1} 号星星哦，再找找看~`, 1.8, 'happy', false);
  syncTelescopeUI();
  return { ok: false, reason: 'wrong_star', mistakes: stargazeRun.mistakes };
}

function completeStargazeSession(refDate = new Date()) {
  const spec = CONSTELLATION_BY_ID[stargazeRun.targetId];
  const ts = player.telescope;
  const prev = ts.constellations[spec.id];
  const isFirstDiscovery = !prev;
  const mistakes = stargazeRun.mistakes;
  const perfect = mistakes === 0;
  ts.constellations[spec.id] = {
    count: (prev?.count || 0) + 1,
    firstDate: prev?.firstDate || formatLocalDateKey(refDate),
    bestMistakes: prev ? Math.min(prev.bestMistakes, mistakes) : mistakes
  };
  ts.totalSessions = (ts.totalSessions || 0) + 1;
  if (perfect) ts.perfectSessions = (ts.perfectSessions || 0) + 1;
  ts.lastConstellationId = spec.id;
  stargazeRun.phase = 'done';

  const coinReward = (isFirstDiscovery ? 30 : 14) + (perfect ? 6 : 0);
  const xpReward = isFirstDiscovery ? 32 : 16;
  petAudio.playStargazeChime(Math.max(0, CONSTELLATION_SPECS.indexOf(spec)));
  petAudio.haptic('headpat');
  player.idleTime = 0;
  player.happyTimer = 2.8;
  player.cheerTimer = isFirstDiscovery ? 2.6 : 1.6;
  player.stargazeCheerTimer = 6;
  spawnInteractVfx(player.x, player.y - 30, 'sparkle', isFirstDiscovery ? 12 : 8);
  addCoins(coinReward, player.x + 28, player.y - 46, isFirstDiscovery ? '新星座 ' : '观星 ');
  addAffectionXp(xpReward, isFirstDiscovery ? `收录星座「${spec.name}」` : `再会星座「${spec.name}」`);
  recordJournalActivity('stargazes', 1, refDate);
  setPlayerEmote(
    isFirstDiscovery ? `星图新收录『${spec.name}』！${spec.reaction}` : spec.reaction,
    3.2,
    isFirstDiscovery ? 'cheer' : 'happy',
    true
  );

  stargazeRun.lastResult = {
    constellationId: spec.id,
    name: spec.name,
    isFirstDiscovery,
    perfect,
    mistakes,
    coinReward,
    xpReward
  };
  renderStargazeOptions();
  savePetState();
  syncTelescopeUI();
  syncWeeklyJournalUI(refDate);
  if (gameMode === 'survivor') syncSurvivorSkillStrip();
  return { ok: true, ...stargazeRun.lastResult, starGuidance: getStarGuidanceBonus(), audio: petAudio.getAr9AudioInfo() };
}

function pickStargazeOption(optionId, refDate = new Date()) {
  if (!stargazeRun.active || stargazeRun.phase !== 'identify') {
    return { ok: false, reason: 'not_identifying' };
  }
  if (!stargazeRun.options.includes(optionId)) return { ok: false, reason: 'invalid_option' };
  if (optionId !== stargazeRun.targetId) {
    if (!stargazeRun.wrongOptions.includes(optionId)) stargazeRun.wrongOptions.push(optionId);
    stargazeRun.mistakes += 1;
    playSfx('star_miss');
    setPlayerEmote(`『${CONSTELLATION_BY_ID[optionId].name}』的形状不太一样呢，对照连线再想想~`, 2.0, 'happy', false);
    renderStargazeOptions();
    syncTelescopeUI();
    return { ok: false, reason: 'wrong_option', mistakes: stargazeRun.mistakes };
  }
  return completeStargazeSession(refDate);
}

function syncTelescopeUI() {
  const ts = player.telescope;
  if (!ts) return;
  const guide = getStarGuidanceBonus();
  const spec = stargazeRun.active ? CONSTELLATION_BY_ID[stargazeRun.targetId] : null;
  const phase = spec ? stargazeRun.phase : 'idle';
  const cardOpen = Boolean(telescopeCardEl && !telescopeCardEl.classList.contains('hidden'));
  player.isStargazing = Boolean((cardOpen && spec && phase !== 'done') || player.stargazeCheerTimer > 0);

  if (telescopeCodexPillEl) telescopeCodexPillEl.textContent = `星图 ${guide.count}/${guide.total}`;
  if (telescopeSkyEl) {
    telescopeSkyEl.dataset.phase = phase;
  }
  if (telescopeSkyIdleEl) telescopeSkyIdleEl.classList.toggle('hidden', Boolean(spec));
  if (telescopeSkyProgressEl) {
    telescopeSkyProgressEl.classList.toggle('hidden', !spec);
    if (spec) {
      telescopeSkyProgressEl.textContent =
        phase === 'connect'
          ? `连星 ${stargazeRun.nextIdx}/${spec.stars.length}`
          : phase === 'identify'
            ? '辨认星座'
            : `已收录 · ${spec.name}`;
    }
  }
  if (spec && telescopeSkyStarsEl) {
    telescopeSkyStarsEl.querySelectorAll('.tele-star').forEach((el) => {
      const key = el.dataset.starKey || '';
      const linked = key.startsWith('c') && Number(key.slice(1)) < stargazeRun.nextIdx;
      el.classList.toggle('is-linked', linked);
    });
  }
  if (spec && telescopeSkyLinesEl) {
    telescopeSkyLinesEl.querySelectorAll('.tele-line').forEach((el) => {
      const a = Number(el.dataset.edgeA);
      const b = Number(el.dataset.edgeB);
      el.classList.toggle('is-linked', a < stargazeRun.nextIdx && b < stargazeRun.nextIdx);
    });
  }
  if (telescopeStepHintEl) {
    if (!spec) {
      telescopeStepHintEl.textContent = '按 1→2→3 的顺序轻点星星连成星座，再辨认它是哪一座吧~';
    } else if (phase === 'connect') {
      telescopeStepHintEl.textContent = `轻点第 ${stargazeRun.nextIdx + 1} 号星星（共 ${spec.stars.length} 颗）· 失误 ${stargazeRun.mistakes} 次`;
    } else if (phase === 'identify') {
      telescopeStepHintEl.textContent = '连线完成！从下面选出与形状相符的星座~';
    } else {
      const res = stargazeRun.lastResult;
      telescopeStepHintEl.textContent = `已收录『${spec.name}』到星图手账${res && res.perfect ? ' · 零失误满分' : ''}，+${res ? res.coinReward : 0}金~`;
    }
  }
  if (telescopeIdentifyGridEl) {
    telescopeIdentifyGridEl.classList.toggle('hidden', phase !== 'identify');
  }
  if (btnTelescopeStartEl) {
    btnTelescopeStartEl.textContent =
      phase === 'idle' ? '对准星空 · 开始寻星' : phase === 'done' ? '再观一片星空' : '换一片星空';
  }
  if (btnTelescopeGoShiftEl) btnTelescopeGoShiftEl.classList.toggle('hidden', !guide.active);

  if (starChartSubEl) {
    starChartSubEl.textContent = `共观星 ${ts.totalSessions || 0} 次 · 连星 ${ts.totalStarsLinked || 0} 颗 · 零失误 ${ts.perfectSessions || 0} 次`;
  }
  if (starChartGridEl) {
    starChartGridEl.innerHTML = CONSTELLATION_SPECS.map((c) => {
      const rec = ts.constellations[c.id];
      const isCurrent = Boolean(spec && spec.id === c.id && phase === 'done');
      return `<button type="button" class="star-chart-slot${rec ? ' collected' : ''}${isCurrent ? ' current' : ''}" data-chart-id="${c.id}" title="${rec ? `${c.name} · ${c.shape}` : '待寻觅的星座'}">
          <img src="./assets/vfx_sparkle.webp?v=hd31" alt="" class="star-chart-slot-ico" />
          <span class="star-chart-slot-name">${c.name}</span>
          <em class="star-chart-slot-tag">${rec ? `已收录 ×${rec.count}` : '待寻觅'}</em>
        </button>`;
    }).join('');
  }
  if (telescopeTotalBonusEl) {
    telescopeTotalBonusEl.textContent = guide.active
      ? `星辉指引生效中：幸存者暴击 +${(guide.critChanceBonus * 100).toFixed(1)}% · 宝石磁吸 +${Math.round(guide.gemMagnetPct * 100)}%（星图 ${guide.count}/${guide.total}）`
      : '星辉指引：每收录 1 座星座，幸存者打工暴击 +1.5% · 宝石磁吸 +3%';
  }
  if (btnTelescopeDockEl) {
    btnTelescopeDockEl.classList.toggle('has-stars', guide.active);
    btnTelescopeDockEl.classList.toggle('active', cardOpen);
  }
  if (starChartPillEl) {
    const showPill = Boolean(gameMode === 'pet' && guide.active);
    starChartPillEl.classList.toggle('hidden', !showPill);
    if (showPill && starChartPillTagEl) starChartPillTagEl.textContent = `${guide.count}/${guide.total}`;
  }
}

function updateStargazeCompanion(dt) {
  if (player.stargazeCheerTimer > 0) {
    player.stargazeCheerTimer = Math.max(0, player.stargazeCheerTimer - dt);
  }
  const cardOpen = Boolean(telescopeCardEl && !telescopeCardEl.classList.contains('hidden'));
  player.isStargazing = Boolean(
    (cardOpen && stargazeRun.active && stargazeRun.phase !== 'done') || player.stargazeCheerTimer > 0
  );
}

function dismissTelescopeCard() {
  telescopeCardEl?.classList.add('hidden');
  btnTelescopeDockEl?.classList.remove('active');
}

function openTelescopeCard() {
  if (!telescopeCardEl) return;
  if (gameMode !== 'pet') switchMode('pet');
  closeDrawer();
  dismissTopicCard();
  dismissWindowAmbienceCard();
  foldOrHidePomodoroCard();
  dismissTeatimeCard();
  dismissWeeklyJournalCard();
  dismissTerrariumCard();
  foldOrHideGoodnightCard();
  dismissCollageCard();
  foldOrHideCozyRadioCard();
  dismissCrochetCard();
  dismissHotCocoaCard();
  dismissPressedFlowerCard();
  dismissAr10Cards(); dismissAr11Cards(); dismissAr12Cards(); dismissAr13Cards(); dismissAr14Cards(); dismissAr15Cards(); dismissAr16Cards();
  dismissPolaroid();
  closeAlbumLightbox();
  telescopeCardEl.classList.remove('hidden');
  syncTelescopeUI();
}

function toggleTelescopeCard() {
  if (!telescopeCardEl) return;
  if (telescopeCardEl.classList.contains('hidden')) {
    openTelescopeCard();
    playSfx('telescope_focus');
  } else {
    dismissTelescopeCard(); dismissAr10Cards(); dismissAr11Cards(); dismissAr12Cards(); dismissAr13Cards(); dismissAr14Cards(); dismissAr15Cards(); dismissAr16Cards();
  }
}

if (pressedFlowerCardEl) {
  pressedFlowerCardEl.addEventListener('pointerdown', (e) => e.stopPropagation());
}
if (telescopeCardEl) {
  telescopeCardEl.addEventListener('pointerdown', (e) => e.stopPropagation());
}

bindHudTap(btnPressedDockEl, () => {
  togglePressedFlowerCard();
});
bindHudTap(document.getElementById('btn-pressed-close'), () => {
  dismissPressedFlowerCard();
});
bindHudTap(pressedFlowerPillEl, () => {
  openPressedFlowerCard();
});
bindHudTap(btnPressedDailyGatherEl, () => {
  claimDailyPressedFlowers();
});
bindHudTap(btnPressedFlowerPackEl, () => {
  buyPressedFlowerPack();
});
document.querySelectorAll('#pressed-bookmark-grid .terrarium-plant-tab').forEach((btn) => {
  bindHudTap(btn, () => {
    selectPressedBookmark(btn.dataset.bookmarkId);
  });
});
bindHudTap(btnPressedDisplayToggleEl, () => {
  togglePressedDeskDisplay();
});
bindHudTap(btnPressedPressEl, () => {
  pressOrUpgradeBookmark();
});
bindHudTap(btnPressedGiftEl, () => {
  caressPressedBookmark();
});
bindHudTap(btnPressedGoShiftEl, () => {
  dismissPressedFlowerCard();
  switchMode('survivor');
});

bindHudTap(btnTelescopeDockEl, () => {
  toggleTelescopeCard();
});
bindHudTap(document.getElementById('btn-telescope-close'), () => {
  dismissTelescopeCard(); dismissAr10Cards(); dismissAr11Cards(); dismissAr12Cards(); dismissAr13Cards(); dismissAr14Cards(); dismissAr15Cards(); dismissAr16Cards();
});
bindHudTap(starChartPillEl, () => {
  openTelescopeCard();
});
bindHudTap(btnTelescopeStartEl, () => {
  startStargazeSession();
});
bindHudTap(telescopeSkyStarsEl, (e) => {
  const starEl = e.target && e.target.closest ? e.target.closest('.tele-star') : null;
  if (starEl) tapStargazeStar(starEl.dataset.starKey);
});
bindHudTap(telescopeIdentifyGridEl, (e) => {
  const optEl = e.target && e.target.closest ? e.target.closest('.tele-option') : null;
  if (optEl && !optEl.disabled) pickStargazeOption(optEl.dataset.optionId);
});
bindHudTap(starChartGridEl, (e) => {
  const slotEl = e.target && e.target.closest ? e.target.closest('.star-chart-slot') : null;
  if (slotEl) startStargazeSession(slotEl.dataset.chartId);
});
bindHudTap(btnTelescopeGoShiftEl, () => {
  dismissTelescopeCard(); dismissAr10Cards(); dismissAr11Cards(); dismissAr12Cards(); dismissAr13Cards(); dismissAr14Cards(); dismissAr15Cards(); dismissAr16Cards();
  switchMode('survivor');
});

syncPressedFlowerUI();
syncTelescopeUI();

window.__AR9_DEBUG__ = {
  getBookmarkSpecs() {
    return JSON.parse(JSON.stringify(PRESSED_BOOKMARK_SPECS));
  },
  getConstellations() {
    return JSON.parse(JSON.stringify(CONSTELLATION_SPECS));
  },
  claimDailyPetals(customDateIso = '') {
    const refDate = customDateIso ? new Date(customDateIso) : new Date();
    return claimDailyPressedFlowers(refDate);
  },
  addPetalsForTest(amount = 6) {
    const add = Math.max(0, Math.round(Number(amount) || 0));
    for (const id of PRESSED_BOOKMARK_IDS) {
      player.pressedFlowers.petals[id] = (player.pressedFlowers.petals[id] || 0) + add;
    }
    player.pressedFlowers.totalPetalsCollected = (player.pressedFlowers.totalPetalsCollected || 0) + add * 3;
    savePetState();
    syncPressedFlowerUI();
    return { ...player.pressedFlowers.petals };
  },
  pressBookmark(bookmarkId = '', customDateIso = '') {
    const refDate = customDateIso ? new Date(customDateIso) : new Date();
    return pressOrUpgradeBookmark(bookmarkId, refDate);
  },
  caressBookmark(bookmarkId = '') {
    return caressPressedBookmark(bookmarkId);
  },
  toggleDeskDisplay() {
    return togglePressedDeskDisplay();
  },
  startStargaze(constellationId = '') {
    return startStargazeSession(constellationId);
  },
  tapStar(starKey) {
    return tapStargazeStar(starKey);
  },
  pickOption(optionId, customDateIso = '') {
    const refDate = customDateIso ? new Date(customDateIso) : new Date();
    return pickStargazeOption(optionId, refDate);
  },
  getStargazeRun() {
    return JSON.parse(JSON.stringify(stargazeRun));
  },
  setHpForTest(value) {
    player.hp = Math.max(1, Math.min(player.maxHp, Number(value) || player.maxHp));
    return player.hp;
  },
  getState(customDateIso = '') {
    const refDate = customDateIso ? new Date(customDateIso) : new Date();
    return {
      gameMode,
      coins: player.coins,
      hp: player.hp,
      maxHp: player.maxHp,
      level: player.level,
      xp: player.xp,
      emote: player.emote,
      isStargazing: Boolean(player.isStargazing),
      pressedFlowers: JSON.parse(JSON.stringify(player.pressedFlowers)),
      pressedBlessing: getPressedFlowerBlessing(),
      pressedDeskVisual: JSON.parse(JSON.stringify(player.pressedDeskVisual)),
      telescope: JSON.parse(JSON.stringify(player.telescope)),
      starGuidance: getStarGuidanceBonus(),
      stargazeRun: JSON.parse(JSON.stringify(stargazeRun)),
      ar9Audio: petAudio.getAr9AudioInfo(),
      journalSummary: computeWeeklyJournalSummary(refDate),
      survivorMetrics: window.__AR5_DEBUG__.getSurvivorEffectiveMetrics(),
      openPanels: window.__AR5_DEBUG__.getState(customDateIso).openPanels
    };
  }
};

// ================= AR-10 窗畔雨天水彩写生画架 & 奶油手账小邮差信箱 =================
const watercolorCardEl = document.getElementById('watercolor-card');
const btnWatercolorDockEl = document.getElementById('btn-watercolor-easel');
const watercolorSummaryPillEl = document.getElementById('watercolor-summary-pill');
const watercolorPaperEl = document.getElementById('watercolor-paper');
const watercolorPaperBaseEl = document.getElementById('watercolor-paper-base');
const watercolorPaperSubjectEl = document.getElementById('watercolor-paper-subject');
const watercolorWashLayerEl = document.getElementById('watercolor-wash-layer');
const watercolorPaperTagEl = document.getElementById('watercolor-paper-tag');
const watercolorStepHintEl = document.getElementById('watercolor-step-hint');
const watercolorWellRowEl = document.getElementById('watercolor-well-row');
const watercolorProgressFillEl = document.getElementById('watercolor-progress-fill');
const btnWatercolorMainEl = document.getElementById('btn-watercolor-main');
const btnWatercolorGoShiftEl = document.getElementById('btn-watercolor-go-shift');
const watercolorGallerySubEl = document.getElementById('watercolor-gallery-sub');
const watercolorGalleryGridEl = document.getElementById('watercolor-gallery-grid');
const watercolorTotalWardEl = document.getElementById('watercolor-total-ward');

const mailboxCardEl = document.getElementById('mailbox-card');
const btnMailboxDockEl = document.getElementById('btn-mailbox');
const mailboxUnreadBadgeEl = document.getElementById('mailbox-unread-badge');
const mailboxSummaryPillEl = document.getElementById('mailbox-summary-pill');
const mailboxTabRowEl = document.getElementById('mailbox-tab-row');
const mailboxInboxCountEl = document.getElementById('mailbox-inbox-count');
const mailboxAlbumCountEl = document.getElementById('mailbox-album-count');
const mailboxInboxViewEl = document.getElementById('mailbox-inbox-view');
const mailboxAlbumViewEl = document.getElementById('mailbox-album-view');
const mailboxEnvelopeRowEl = document.getElementById('mailbox-envelope-row');
const mailboxNextHintEl = document.getElementById('mailbox-next-hint');
const mailboxLetterEl = document.getElementById('mailbox-letter');
const mailboxLetterTitleEl = document.getElementById('mailbox-letter-title');
const mailboxLetterMoodEl = document.getElementById('mailbox-letter-mood');
const mailboxLetterBodyEl = document.getElementById('mailbox-letter-body');
const mailboxLetterSignEl = document.getElementById('mailbox-letter-sign');
const mailboxLetterStampEl = document.getElementById('mailbox-letter-stamp');
const mailboxReplyGridEl = document.getElementById('mailbox-reply-grid');
const mailboxStampRowEl = document.getElementById('mailbox-stamp-row');
const btnMailboxSendEl = document.getElementById('btn-mailbox-send');
const btnMailboxGoShiftEl = document.getElementById('btn-mailbox-go-shift');
const mailboxStampTallyEl = document.getElementById('mailbox-stamp-tally');
const mailboxAlbumGridEl = document.getElementById('mailbox-album-grid');
const mailboxAlbumReadEl = document.getElementById('mailbox-album-read');
const mailboxTotalBonusEl = document.getElementById('mailbox-total-bonus');

const atelierPillEl = document.getElementById('atelier-post-pill');
const atelierSegEaselEl = document.getElementById('atelier-seg-easel');
const atelierSegMailEl = document.getElementById('atelier-seg-mail');
const atelierPillGalleryEl = document.getElementById('atelier-pill-gallery');
const atelierPillMailEl = document.getElementById('atelier-pill-mail');

// 画纸上 4 处晕染点（百分比坐标）
const WATERCOLOR_WASH_SPOTS = [
  { x: 24, y: 30 },
  { x: 74, y: 26 },
  { x: 28, y: 72 },
  { x: 72, y: 70 }
];
const WATERCOLOR_STROKES_NEEDED = WATERCOLOR_WASH_SPOTS.length;

const watercolorRun = {
  active: false,
  phase: 'idle',
  subjectId: '',
  paletteId: '',
  mixStep: 0,
  mistakes: 0,
  strokes: [false, false, false, false],
  lastResult: null
};

function isAr10CardOpen(which = '') {
  const wc = document.getElementById('watercolor-card');
  const mb = document.getElementById('mailbox-card');
  const wcOpen = Boolean(wc && !wc.classList.contains('hidden'));
  const mbOpen = Boolean(mb && !mb.classList.contains('hidden'));
  if (which === 'watercolor') return wcOpen;
  if (which === 'mailbox') return mbOpen;
  return wcOpen || mbOpen;
}

function dismissWatercolorCard() {
  document.getElementById('watercolor-card')?.classList.add('hidden');
  document.getElementById('btn-watercolor-easel')?.classList.remove('active');
}

function dismissMailboxCard() {
  document.getElementById('mailbox-card')?.classList.add('hidden');
  document.getElementById('btn-mailbox')?.classList.remove('active');
}

function dismissAr10Cards() {
  dismissWatercolorCard();
  dismissMailboxCard();
}

function applyShiftXpGain(val) {
  survivorRun.shiftXp += Math.max(0, Number(val) || 0) * getMailboxShiftXpMult() * getGreetingCardShiftXpMult();
  return survivorRun.shiftXp;
}

function getWatercolorActiveSpecs() {
  const wc = player.watercolor;
  const subjectId = watercolorRun.active ? watercolorRun.subjectId : wc.selectedSubject;
  const paletteId = watercolorRun.active ? watercolorRun.paletteId : wc.selectedPalette;
  return {
    subject: WATERCOLOR_SUBJECT_BY_ID[subjectId] || WATERCOLOR_SUBJECTS[0],
    palette: WATERCOLOR_PALETTE_BY_ID[paletteId] || WATERCOLOR_PALETTES[0]
  };
}

function getWatercolorMixInfo(subject, palette) {
  const sIdx = Math.max(0, WATERCOLOR_SUBJECTS.findIndex((x) => x.id === subject.id));
  const [a, b] = subject.mixIdx;
  return {
    firstIdx: a,
    secondIdx: b,
    first: palette.pigments[a],
    second: palette.pigments[b],
    mixName: palette.mixNames[sIdx] || palette.mixNames[0]
  };
}

function getWatercolorPaintingTitle(subject, palette) {
  return `${palette.shortName}·${subject.title}`;
}

function resetWatercolorRun() {
  watercolorRun.active = false;
  watercolorRun.phase = 'idle';
  watercolorRun.subjectId = '';
  watercolorRun.paletteId = '';
  watercolorRun.mixStep = 0;
  watercolorRun.mistakes = 0;
  watercolorRun.strokes = [false, false, false, false];
}

function applyWatercolorSelection(subjectId, paletteId) {
  const wc = player.watercolor;
  const nextSubject = WATERCOLOR_SUBJECT_BY_ID[subjectId] ? subjectId : wc.selectedSubject;
  const nextPalette = WATERCOLOR_PALETTE_BY_ID[paletteId] ? paletteId : wc.selectedPalette;
  const changed = nextSubject !== wc.selectedSubject || nextPalette !== wc.selectedPalette;
  wc.selectedSubject = nextSubject;
  wc.selectedPalette = nextPalette;
  if (watercolorRun.active && (changed || watercolorRun.phase === 'done')) {
    const midSession = watercolorRun.phase !== 'done';
    resetWatercolorRun();
    if (midSession) setPlayerEmote('换了题材和颜色，洗洗笔重新起稿吧~', 1.8, 'happy', false);
  }
  playSfx('pat');
  savePetState();
  syncWatercolorUI();
  return { ok: true, subjectId: wc.selectedSubject, paletteId: wc.selectedPalette };
}

function selectWatercolorSubject(subjectId) {
  if (!WATERCOLOR_SUBJECT_BY_ID[subjectId]) return { ok: false, reason: 'invalid_subject' };
  return applyWatercolorSelection(subjectId, player.watercolor.selectedPalette);
}

function selectWatercolorPalette(paletteId) {
  if (!WATERCOLOR_PALETTE_BY_ID[paletteId]) return { ok: false, reason: 'invalid_palette' };
  return applyWatercolorSelection(player.watercolor.selectedSubject, paletteId);
}

function startWatercolorSession() {
  if (gameMode !== 'pet') switchMode('pet');
  const wc = player.watercolor;
  const subject = WATERCOLOR_SUBJECT_BY_ID[wc.selectedSubject] || WATERCOLOR_SUBJECTS[0];
  const palette = WATERCOLOR_PALETTE_BY_ID[wc.selectedPalette] || WATERCOLOR_PALETTES[0];
  watercolorRun.active = true;
  watercolorRun.phase = 'mix';
  watercolorRun.subjectId = subject.id;
  watercolorRun.paletteId = palette.id;
  watercolorRun.mixStep = 0;
  watercolorRun.mistakes = 0;
  watercolorRun.strokes = [false, false, false, false];
  watercolorRun.lastResult = null;
  const mix = getWatercolorMixInfo(subject, palette);
  player.paintingWashColor = palette.wash;
  player.idleTime = 0;
  player.happyTimer = 1.4;
  playSfx('paint_mix');
  setPlayerEmote(`画架支好啦！先蘸「${mix.first.name}」再蘸「${mix.second.name}」，调出「${mix.mixName}」吧~`, 2.8, 'happy', false);
  syncWatercolorUI();
  return {
    ok: true,
    subjectId: subject.id,
    paletteId: palette.id,
    mixOrder: [mix.firstIdx, mix.secondIdx],
    mixName: mix.mixName
  };
}

function tapWatercolorWell(wellIdx) {
  if (!watercolorRun.active || watercolorRun.phase !== 'mix') return { ok: false, reason: 'not_mixing' };
  const idx = Math.round(Number(wellIdx));
  if (!(idx >= 0 && idx < 3)) return { ok: false, reason: 'invalid_well' };
  const { subject, palette } = getWatercolorActiveSpecs();
  const mix = getWatercolorMixInfo(subject, palette);
  const expected = subject.mixIdx[watercolorRun.mixStep];
  if (idx === expected) {
    watercolorRun.mixStep += 1;
    player.idleTime = 0;
    playSfx('paint_mix');
    if (watercolorRun.mixStep >= 2) {
      watercolorRun.phase = 'brush';
      player.happyTimer = 1.6;
      setPlayerEmote(`调出「${mix.mixName}」啦！在画纸上轻点 ${WATERCOLOR_STROKES_NEEDED} 处晕染开~`, 2.4, 'happy', false);
    }
    syncWatercolorUI();
    return { ok: true, mixStep: watercolorRun.mixStep, phase: watercolorRun.phase };
  }
  watercolorRun.mistakes += 1;
  watercolorRun.mixStep = 0;
  playSfx('star_miss');
  setPlayerEmote(`唔…颜色有点浊了，洗洗笔再从「${mix.first.name}」开始调吧~`, 2.0, 'happy', false);
  syncWatercolorUI();
  return { ok: false, reason: 'wrong_well', mistakes: watercolorRun.mistakes };
}

function tapWatercolorWash(spotIdx) {
  if (!watercolorRun.active || watercolorRun.phase !== 'brush') return { ok: false, reason: 'not_brushing' };
  const idx = Math.round(Number(spotIdx));
  if (!(idx >= 0 && idx < WATERCOLOR_STROKES_NEEDED)) return { ok: false, reason: 'invalid_spot' };
  if (watercolorRun.strokes[idx]) return { ok: false, reason: 'already_washed' };
  watercolorRun.strokes[idx] = true;
  player.watercolor.totalStrokes = (player.watercolor.totalStrokes || 0) + 1;
  petAudio.playBrushStroke(idx);
  player.idleTime = 0;
  const done = watercolorRun.strokes.filter(Boolean).length;
  if (done >= WATERCOLOR_STROKES_NEEDED) {
    watercolorRun.phase = 'finish';
    player.happyTimer = 1.8;
    setPlayerEmote('晕染完成！落款签上名字，就能挂上墙面画廊啦~', 2.4, 'happy', false);
  }
  savePetState();
  syncWatercolorUI();
  return { ok: true, strokes: done, phase: watercolorRun.phase };
}

function finishWatercolorPainting(refDate = new Date()) {
  if (!watercolorRun.active || watercolorRun.phase !== 'finish') return { ok: false, reason: 'not_ready' };
  const { subject, palette } = getWatercolorActiveSpecs();
  const wc = player.watercolor;
  const comboId = getWatercolorComboId(subject.id, palette.id);
  const prev = wc.paintings[comboId];
  const isFirstPainting = !prev;
  const mistakes = watercolorRun.mistakes;
  const perfect = mistakes === 0;
  wc.paintings[comboId] = {
    count: (prev?.count || 0) + 1,
    firstDate: prev?.firstDate || formatLocalDateKey(refDate),
    bestMistakes: prev ? Math.min(prev.bestMistakes, mistakes) : mistakes
  };
  wc.hung = (wc.hung || []).filter((k) => k !== comboId);
  wc.hung.push(comboId);
  if (wc.hung.length > 6) wc.hung = wc.hung.slice(-6);
  wc.totalPaintings = (wc.totalPaintings || 0) + 1;
  if (perfect) wc.perfectPaintings = (wc.perfectPaintings || 0) + 1;
  wc.lastPaintingId = comboId;
  watercolorRun.phase = 'done';

  const title = getWatercolorPaintingTitle(subject, palette);
  const coinReward = (isFirstPainting ? 28 : 12) + (perfect ? 6 : 0);
  const xpReward = isFirstPainting ? 30 : 14;
  petAudio.playPaintingFinishChime(Math.max(0, WATERCOLOR_PALETTES.indexOf(palette)));
  petAudio.haptic('headpat');
  player.idleTime = 0;
  player.happyTimer = 2.8;
  player.cheerTimer = isFirstPainting ? 2.6 : 1.6;
  player.paintingCheerTimer = 5;
  spawnInteractVfx(player.x, player.y - 30, 'sparkle', isFirstPainting ? 12 : 8);
  addCoins(coinReward, player.x + 28, player.y - 46, isFirstPainting ? '新画作 ' : '写生 ');
  addAffectionXp(xpReward, isFirstPainting ? `挂上新画「${title}」` : `再画「${title}」`);
  recordJournalActivity('paints', 1, refDate);
  const ward = getWatercolorFocusWard();
  setPlayerEmote(
    isFirstPainting
      ? `『${title}』挂上墙啦！画廊收藏 ${ward.gallerySize}/${ward.total} 幅~`
      : `又画了一幅『${title}』，${subject.note}`,
    3.2,
    isFirstPainting ? 'cheer' : 'happy',
    true
  );

  watercolorRun.lastResult = {
    comboId,
    subjectId: subject.id,
    paletteId: palette.id,
    title,
    isFirstPainting,
    perfect,
    mistakes,
    coinReward,
    xpReward
  };
  savePetState();
  syncWatercolorUI();
  syncWeeklyJournalUI(refDate);
  if (gameMode === 'survivor') syncSurvivorSkillStrip();
  return { ok: true, ...watercolorRun.lastResult, ward, audio: petAudio.getAr10AudioInfo() };
}

function handleWatercolorMainAction() {
  const phase = watercolorRun.active ? watercolorRun.phase : 'idle';
  if (phase === 'idle' || phase === 'done') return startWatercolorSession();
  if (phase === 'finish') return finishWatercolorPainting();
  return { ok: false, reason: 'in_progress' };
}

let watercolorWellKey = '';
let watercolorWashKey = '';
let watercolorGalleryKey = '';

function syncWatercolorUI() {
  const wc = player.watercolor;
  if (!wc) return;
  const ward = getWatercolorFocusWard();
  const { subject, palette } = getWatercolorActiveSpecs();
  const comboId = getWatercolorComboId(subject.id, palette.id);
  const phase = watercolorRun.active ? watercolorRun.phase : 'idle';
  const mix = getWatercolorMixInfo(subject, palette);
  const strokesDone = watercolorRun.strokes.filter(Boolean).length;
  const cardOpen = isAr10CardOpen('watercolor');
  player.isPainting = Boolean((cardOpen && watercolorRun.active && phase !== 'done') || player.paintingCheerTimer > 0);
  player.paintingWashColor = palette.wash;

  player.watercolorWallVisual = {
    gallerySize: ward.gallerySize,
    total: ward.total,
    items: (wc.hung || [])
      .map((cid) => {
        const [sid, pid] = cid.split('__');
        const sSpec = WATERCOLOR_SUBJECT_BY_ID[sid];
        const pSpec = WATERCOLOR_PALETTE_BY_ID[pid];
        if (!sSpec || !pSpec) return null;
        return {
          comboId: cid,
          paletteId: pid,
          filter: pSpec.filter,
          washColor: pSpec.wash,
          subjectSpriteKey: sSpec.spriteKey,
          subjectBox: getWatercolorOverlayBox(sSpec),
          isLatest: cid === wc.lastPaintingId
        };
      })
      .filter(Boolean)
  };

  if (watercolorSummaryPillEl) watercolorSummaryPillEl.textContent = `画廊 ${ward.gallerySize}/${ward.total}`;

  document.querySelectorAll('#watercolor-subject-grid .watercolor-subject-tab').forEach((btn) => {
    const sid = btn.dataset.subjectId;
    btn.classList.toggle('active', sid === subject.id);
    const paintedKinds = WATERCOLOR_PALETTES.filter((p) => wc.paintings[getWatercolorComboId(sid, p.id)]).length;
    btn.classList.toggle('has-painted', paintedKinds > 0);
    btn.title = `${WATERCOLOR_SUBJECT_BY_ID[sid]?.name || ''} · 已画 ${paintedKinds}/3 种调色`;
  });
  document.querySelectorAll('#watercolor-palette-grid .watercolor-palette-chip').forEach((chip) => {
    const pid = chip.dataset.paletteId;
    const pSpec = WATERCOLOR_PALETTE_BY_ID[pid];
    chip.classList.toggle('active', pid === palette.id);
    if (pSpec && !chip.querySelector('.wc-swatch-row')) {
      const row = document.createElement('span');
      row.className = 'wc-swatch-row';
      row.innerHTML = pSpec.pigments.map((pg) => `<i class="wc-swatch" style="--wc:${pg.color}"></i>`).join('');
      chip.appendChild(row);
    }
  });

  const painted = Boolean(wc.paintings[comboId]);
  let reveal = 1;
  let blurPx = 0;
  if (phase === 'idle') {
    reveal = painted ? 1 : 0.4;
    blurPx = painted ? 0 : 1.6;
  } else if (phase === 'mix') {
    reveal = 0.32;
    blurPx = 2.4;
  } else if (phase === 'brush') {
    reveal = 0.32 + (0.68 * strokesDone) / WATERCOLOR_STROKES_NEEDED;
    blurPx = (WATERCOLOR_STROKES_NEEDED - strokesDone) * 0.6;
  }
  const gray = reveal < 1 ? (1 - reveal) * 0.85 : 0;
  const paperFilter = `${palette.filter} grayscale(${gray.toFixed(2)}) blur(${blurPx.toFixed(1)}px)`;
  if (watercolorPaperEl) watercolorPaperEl.dataset.phase = phase;
  if (watercolorPaperBaseEl) {
    watercolorPaperBaseEl.style.filter = paperFilter;
    watercolorPaperBaseEl.style.opacity = Math.max(0.32, reveal).toFixed(2);
  }
  if (watercolorPaperSubjectEl) {
    const hasSubject = Boolean(subject.spriteKey);
    watercolorPaperSubjectEl.classList.toggle('hidden', !hasSubject);
    if (hasSubject && watercolorPaperSubjectEl.getAttribute('src') !== subject.img) {
      watercolorPaperSubjectEl.src = subject.img;
    }
    if (hasSubject) {
      const box = getWatercolorOverlayBox(subject);
      watercolorPaperSubjectEl.style.left = `${(box.left * 100).toFixed(1)}%`;
      watercolorPaperSubjectEl.style.top = `${(box.top * 100).toFixed(1)}%`;
      watercolorPaperSubjectEl.style.width = `${(box.size * 100).toFixed(1)}%`;
      watercolorPaperSubjectEl.style.height = `${(box.size * 100).toFixed(1)}%`;
    }
    watercolorPaperSubjectEl.style.filter = paperFilter;
    watercolorPaperSubjectEl.style.opacity = Math.max(0.32, reveal).toFixed(2);
  }
  if (watercolorPaperTagEl) {
    watercolorPaperTagEl.textContent =
      phase === 'mix'
        ? '调色中'
        : phase === 'brush'
          ? `晕染 ${strokesDone}/${WATERCOLOR_STROKES_NEEDED}`
          : phase === 'finish'
            ? '待落款'
            : phase === 'done'
              ? '已挂上墙'
              : painted
                ? `已收藏 ×${wc.paintings[comboId].count}`
                : '待起笔';
  }

  if (watercolorWashLayerEl) {
    const washKey = phase === 'brush' ? `brush|${palette.id}|${subject.id}` : '';
    if (washKey !== watercolorWashKey) {
      watercolorWashKey = washKey;
      watercolorWashLayerEl.innerHTML = washKey
        ? WATERCOLOR_WASH_SPOTS.map(
            (pt, i) =>
              `<button type="button" class="wc-wash-spot" data-wash-idx="${i}" style="left:${pt.x}%;top:${pt.y}%;--wc:${mix.first.color}" aria-label="第 ${i + 1} 处晕染"><em>${i + 1}</em></button>`
          ).join('')
        : '';
    }
    watercolorWashLayerEl.querySelectorAll('.wc-wash-spot').forEach((el) => {
      el.classList.toggle('is-done', Boolean(watercolorRun.strokes[Number(el.dataset.washIdx)]));
    });
  }

  if (watercolorWellRowEl) {
    const wellKey = palette.id;
    if (wellKey !== watercolorWellKey) {
      watercolorWellKey = wellKey;
      watercolorWellRowEl.innerHTML = palette.pigments
        .map(
          (pg, i) =>
            `<button type="button" class="wc-well" data-well-idx="${i}" style="--wc:${pg.color}"><i class="wc-well-dot"></i><span class="wc-well-name">${pg.name}</span></button>`
        )
        .join('');
    }
    watercolorWellRowEl.querySelectorAll('.wc-well').forEach((el) => {
      const i = Number(el.dataset.wellIdx);
      el.disabled = phase !== 'mix';
      el.classList.toggle('is-picked', phase === 'mix' && watercolorRun.mixStep >= 1 && i === mix.firstIdx);
      el.classList.toggle('is-mixed', (phase === 'brush' || phase === 'finish') && (i === mix.firstIdx || i === mix.secondIdx));
    });
  }

  if (watercolorProgressFillEl) {
    const pct =
      phase === 'mix'
        ? watercolorRun.mixStep * 15
        : phase === 'brush'
          ? 30 + (strokesDone / WATERCOLOR_STROKES_NEEDED) * 60
          : phase === 'finish'
            ? 92
            : phase === 'done'
              ? 100
              : 0;
    watercolorProgressFillEl.style.width = `${pct}%`;
  }

  if (watercolorStepHintEl) {
    const res = watercolorRun.lastResult;
    watercolorStepHintEl.textContent =
      phase === 'mix'
        ? watercolorRun.mixStep === 0
          ? `先蘸「${mix.first.name}」，再蘸「${mix.second.name}」~${watercolorRun.mistakes ? ` · 洗笔 ${watercolorRun.mistakes} 次` : ''}`
          : `再蘸「${mix.second.name}」，调出「${mix.mixName}」！`
        : phase === 'brush'
          ? `用「${mix.mixName}」轻点画纸 ${WATERCOLOR_STROKES_NEEDED} 处晕染（${strokesDone}/${WATERCOLOR_STROKES_NEEDED}）`
          : phase === 'finish'
            ? '晕染完成！落款签名，把它挂上墙面画廊吧~'
            : phase === 'done' && res
              ? `『${res.title}』已挂上墙${res.perfect ? ' · 一笔不差' : ''}，+${res.coinReward}金~`
              : `『${getWatercolorPaintingTitle(subject, palette)}』：「${mix.first.name}」+「${mix.second.name}」调出「${mix.mixName}」，再晕染 ${WATERCOLOR_STROKES_NEEDED} 笔~`;
  }

  if (btnWatercolorMainEl) {
    btnWatercolorMainEl.disabled = phase === 'mix' || phase === 'brush';
    btnWatercolorMainEl.textContent =
      phase === 'mix'
        ? '调色中…'
        : phase === 'brush'
          ? `晕染中 ${strokesDone}/${WATERCOLOR_STROKES_NEEDED}`
          : phase === 'finish'
            ? '落款签名 · 挂上画廊'
            : phase === 'done'
              ? '再画一幅'
              : '调色起笔';
    btnWatercolorMainEl.classList.toggle('is-finish', phase === 'finish');
  }
  if (btnWatercolorGoShiftEl) btnWatercolorGoShiftEl.classList.toggle('hidden', !ward.active);

  if (watercolorGalleryGridEl) {
    const counts = WATERCOLOR_SUBJECTS.flatMap((s) =>
      WATERCOLOR_PALETTES.map((p) => wc.paintings[getWatercolorComboId(s.id, p.id)]?.count || 0)
    );
    const galleryKey = `${counts.join(',')}|${comboId}`;
    if (galleryKey !== watercolorGalleryKey) {
      watercolorGalleryKey = galleryKey;
      const slots = [];
      for (const s of WATERCOLOR_SUBJECTS) {
        for (const p of WATERCOLOR_PALETTES) {
          const cid = getWatercolorComboId(s.id, p.id);
          const rec = wc.paintings[cid];
          const slotFilter = rec ? p.filter : `${p.filter} grayscale(0.9)`;
          slots.push(
            `<button type="button" class="wc-gallery-slot${rec ? ' collected' : ''}${cid === comboId ? ' current' : ''}" data-combo-id="${cid}" title="${rec ? `${getWatercolorPaintingTitle(s, p)} · 已画 ${rec.count} 次` : `待写生：${getWatercolorPaintingTitle(s, p)}`}">
              <span class="wc-slot-art">
                <img src="./assets/watercolor_rainy_window.webp?v=hd31" alt="" class="wc-slot-base" style="filter:${slotFilter}" />
                ${s.spriteKey ? `<img src="${s.img}" alt="" class="wc-slot-subject" style="filter:${slotFilter};${getWatercolorOverlayStyle(s)}" />` : ''}
              </span>
              <em class="wc-slot-tag">${rec ? `×${rec.count}` : p.shortName}</em>
            </button>`
          );
        }
      }
      watercolorGalleryGridEl.innerHTML = slots.join('');
    }
  }
  if (watercolorGallerySubEl) {
    watercolorGallerySubEl.textContent = `墙面画廊 · 挂出 ${Math.min(6, (wc.hung || []).length)} 幅 · 共画 ${wc.totalPaintings || 0} 幅 · 一笔不差 ${wc.perfectPaintings || 0} 次`;
  }
  if (watercolorTotalWardEl) {
    watercolorTotalWardEl.textContent = ward.active
      ? `画意专注守护生效中：幸存者暴击 +${(ward.critChanceBonus * 100).toFixed(1)}% · 专注攻速 +${(ward.focusHastePct * 100).toFixed(1)}%（画廊 ${ward.gallerySize}/${ward.total}）`
      : '画意专注守护：每收藏 1 幅不同水彩，幸存者打工暴击 +1.2% · 专注攻速 +1.5%';
  }
  if (btnWatercolorDockEl) {
    btnWatercolorDockEl.classList.toggle('has-ward', ward.active);
    btnWatercolorDockEl.classList.toggle('active', cardOpen);
  }
  syncAtelierPill();
}

// ---------------- 小邮差信箱 ----------------
const MAILBOX_MAX_INBOX = 3;
const MAILBOX_TIER_SPECS = [
  { id: 0, name: '初识', greeting: '主人你好呀', signoff: '—— 有点害羞的 DeepSeek娘', intervalHours: 8 },
  { id: 1, name: '熟络', greeting: '亲爱的主人', signoff: '—— 每天都在书桌旁等你的 DeepSeek娘', intervalHours: 6 },
  { id: 2, name: '知心', greeting: '最最喜欢的主人', signoff: '—— 永远站在你这边的 DeepSeek娘', intervalHours: 4 }
];
const MAILBOX_WELCOME_BODY = '听说写信能把心意装得满满的，所以我在你的书桌上偷偷放了一个小信箱。';
const MAILBOX_WELCOME_LINE = '这是我第一次给你写信，有点紧张……以后我会常常把心里话塞进这个小信箱哦！';
const MAILBOX_WELCOME_REPLIES = [
  { id: 'welcome_wait', text: '好期待你的每一封信！', best: true },
  { id: 'welcome_shy', text: '不笑你，我会认真回信的~', best: false },
  { id: 'welcome_ok', text: '收到，信箱我会常来看看。', best: false }
];
const MAILBOX_WELCOME_REACTION = '真的会期待吗？那我以后要写得更勤快一点~';

const LETTER_MOOD_SPECS = {
  bliss: {
    title: '粉色便笺',
    bodies: [
      '今天被你摸摸头的时候，心里像打翻了一罐草莓果酱，甜到现在还没散掉呢。',
      '偷偷在手账角落画了一颗小爱心，写着「今天也很开心」，你要假装没看见哦。'
    ],
    bestReaction: '呜哇，你也超开心！我要把这封回信压在枕头底下，今晚一定做甜甜的梦~',
    replies: [
      { id: 'hug', text: '我也超开心，明天继续摸摸头！', best: true },
      { id: 'jam', text: '草莓果酱也分我一勺吧~', best: false },
      { id: 'calm', text: '收到啦，早点休息哦。', best: false }
    ]
  },
  focus: {
    title: '番茄钟便签',
    bodies: [
      '看你专心敲代码的样子好帅气，我在旁边翻书都不敢大声，怕吵到你。',
      '刚才的专注时间我数着秒针陪你过完啦，下一轮也一起加油吧！'
    ],
    bestReaction: '有我陪着就变轻松了？那下一轮番茄钟我也要坐在最近的位置~',
    replies: [
      { id: 'thanks', text: '有你陪着，专注都变轻松了。', best: true },
      { id: 'break', text: '等会儿一起喝杯茶休息吧。', best: false },
      { id: 'tease', text: '你翻书的声音其实超小声啦。', best: false }
    ]
  },
  cozy: {
    title: '暖茶信笺',
    bodies: [
      '窗外下着小雨，我把热可可捧在手心里，想着要是你也在旁边就好啦。',
      '花房的小盆栽又冒出新叶子了，我给它取名叫「主人的小跟班」。'
    ],
    bestReaction: '那下个雨天我们就窝在一起，我负责热可可，你负责讲故事~',
    replies: [
      { id: 'together', text: '下雨天就该窝在一起喝热可可！', best: true },
      { id: 'name', text: '小跟班这个名字好可爱。', best: false },
      { id: 'umbrella', text: '记得关窗，别着凉啦。', best: false }
    ]
  },
  star: {
    title: '星光明信片',
    bodies: [
      '昨晚望远镜里的星星眨了三下眼，我猜它在替我跟你说晚安。',
      '拍立得里的我们笑得好傻，我把它夹进了星图手账最闪亮的那一页。'
    ],
    bestReaction: '星星一定收到你的谢谢啦，今晚它会眨得更亮一点~',
    replies: [
      { id: 'wish', text: '那颗星星也替我回一句：谢谢你。', best: true },
      { id: 'photo', text: '下次再多拍几张傻傻的合影！', best: false },
      { id: 'sleep', text: '看星星也要早点睡觉哦。', best: false }
    ]
  },
  goodnight: {
    title: '晚安小纸条',
    bodies: [
      '八音盒转完最后一圈了，我抱着鲸鱼抱枕，先在梦里给你占个好位置。',
      '今天的月亮圆圆的，像你送我的那块棉花糖，晚安，明天见。'
    ],
    bestReaction: '好位置已经占好啦，梦里见，不许迟到哦~',
    replies: [
      { id: 'dream', text: '梦里见，记得给我留位置！', best: true },
      { id: 'moon', text: '月亮和棉花糖都替你收好了。', best: false },
      { id: 'night', text: '晚安，好梦。', best: false }
    ]
  }
};

const mailboxRun = {
  view: 'inbox',
  openLetterId: '',
  replyId: '',
  stampId: '',
  albumReadIdx: -1,
  lastResult: null,
  checkTimer: 0
};

function getMailboxTier(level = player.level) {
  const lv = Math.max(1, Number(level) || 1);
  return lv >= 8 ? 2 : lv >= 4 ? 1 : 0;
}

function getMailboxIntervalMs(tier = getMailboxTier()) {
  return (MAILBOX_TIER_SPECS[tier] || MAILBOX_TIER_SPECS[0]).intervalHours * 3600000;
}

function isMailboxStampUnlocked(stamp) {
  return Boolean(stamp) && (player.mailbox?.totalReplies || 0) >= stamp.unlockReplies;
}

// 七日心情周报里出现最多的心情（同票时取最近一天），未盖章时回落到当前心情章选择
function deriveWeeklyLetterMood(refDate = new Date()) {
  const summary = computeWeeklyJournalSummary(refDate);
  const counts = {};
  for (const d of summary.daysList) {
    if (d.stamped) counts[d.moodId] = (counts[d.moodId] || 0) + 1;
  }
  const maxN = Math.max(0, ...Object.values(counts));
  let moodId = '';
  if (maxN > 0) {
    for (let i = summary.daysList.length - 1; i >= 0; i--) {
      const d = summary.daysList[i];
      if (d.stamped && counts[d.moodId] === maxN) {
        moodId = d.moodId;
        break;
      }
    }
  }
  if (!LETTER_MOOD_SPECS[moodId]) {
    moodId = LETTER_MOOD_SPECS[player.weeklyJournal.selectedMood] ? player.weeklyJournal.selectedMood : 'bliss';
  }
  return { moodId, summary, dominantCount: maxN };
}

function buildWeeklyLetterLine(summary, moodId) {
  const label = JOURNAL_MOODS[moodId]?.label || '甜心';
  if (!summary || summary.stamps7d <= 0) {
    return `这周的手账还空空的，下次一起盖一枚「${label}」心情章好不好？`;
  }
  const extras = [];
  if (summary.paints7d > 0) extras.push(`画了 ${summary.paints7d} 幅水彩`);
  if (summary.letters7d > 0) extras.push(`交换了 ${summary.letters7d} 封信`);
  if (summary.stargazes7d > 0) extras.push(`观星 ${summary.stargazes7d} 次`);
  return `这周手账里「${label}」的心情最多，我们一起盖了 ${summary.stamps7d} 枚心情章${extras.length ? `，还${extras.slice(0, 2).join('、')}` : ''}。`;
}

function getLetterView(letter) {
  const spec = LETTER_MOOD_SPECS[letter?.moodId] || LETTER_MOOD_SPECS.bliss;
  const tier = MAILBOX_TIER_SPECS[letter?.tier] || MAILBOX_TIER_SPECS[0];
  const core = letter?.welcome ? MAILBOX_WELCOME_BODY : spec.bodies[(letter?.variant || 0) % spec.bodies.length];
  return {
    title: letter?.welcome ? '初见来信' : spec.title,
    moodLabel: letter?.welcome ? '初见' : JOURNAL_MOODS[letter?.moodId]?.label || '甜心',
    tierName: tier.name,
    body: `${tier.greeting}：${core}${letter?.weeklyLine ? letter.weeklyLine : ''}`,
    sign: tier.signoff,
    replies: letter?.welcome ? MAILBOX_WELCOME_REPLIES : spec.replies,
    bestReaction: letter?.welcome ? MAILBOX_WELCOME_REACTION : spec.bestReaction
  };
}

function writeMailboxLetter(refDate = new Date(), opts = {}) {
  const mb = player.mailbox;
  if (!mb || mb.letters.length >= MAILBOX_MAX_INBOX) return null;
  const welcome = Boolean(opts.welcome);
  const { moodId, summary } = deriveWeeklyLetterMood(refDate);
  const tier = getMailboxTier();
  mb.letterSeq = (mb.letterSeq || 0) + 1;
  const dateKey = formatLocalDateKey(refDate);
  const letter = {
    id: `L${mb.letterSeq}-${dateKey.replace(/-/g, '')}`,
    writtenAt: refDate.getTime(),
    dateKey,
    moodId,
    tier,
    variant: mb.letterSeq % 2,
    weeklyLine: welcome ? MAILBOX_WELCOME_LINE : buildWeeklyLetterLine(summary, moodId),
    welcome,
    opened: false
  };
  mb.letters.push(letter);
  mb.totalLetters = (mb.totalLetters || 0) + 1;
  if (welcome) mb.welcomeSent = true;
  mb.nextLetterAt = refDate.getTime() + getMailboxIntervalMs(tier);
  savePetState();
  syncMailboxUI(refDate);
  return letter;
}

function checkMailboxLetters(refDate = new Date(), announce = true) {
  const mb = player.mailbox;
  if (!mb) return null;
  const nowMs = refDate.getTime();
  let written = null;
  if (!mb.welcomeSent) {
    mb.welcomeSent = true;
    written = writeMailboxLetter(refDate, { welcome: true });
  } else if (mb.nextLetterAt > 0 && nowMs >= mb.nextLetterAt && mb.letters.length < MAILBOX_MAX_INBOX) {
    written = writeMailboxLetter(refDate);
  }
  if (!(mb.nextLetterAt > 0)) {
    mb.nextLetterAt = nowMs + getMailboxIntervalMs();
    savePetState();
  }
  if (written && announce && !written.welcome && gameMode === 'pet') {
    playSfx('stamp_press');
    setPlayerEmote('我往书桌上的小信箱里塞了一封新写的信，记得去拆哦~', 2.6, 'happy', false);
  }
  return written;
}

function openMailboxLetter(letterId) {
  const mb = player.mailbox;
  const letter = mb.letters.find((l) => l.id === letterId);
  if (!letter) return { ok: false, reason: 'no_letter' };
  mailboxRun.view = 'inbox';
  if (mailboxRun.openLetterId !== letter.id) {
    mailboxRun.replyId = '';
    mailboxRun.stampId = '';
  }
  mailboxRun.openLetterId = letter.id;
  const firstRead = !letter.opened;
  if (firstRead) {
    letter.opened = true;
    petAudio.playLetterOpen();
    player.idleTime = 0;
    player.happyTimer = 1.6;
    setPlayerEmote(letter.welcome ? '是我写的第一封信……读的时候不许笑哦~' : '是我写给你的信！要认真读完再回信哦~', 2.2, 'happy', false);
    savePetState();
  }
  syncMailboxUI();
  return { ok: true, letterId: letter.id, firstRead, view: getLetterView(letter) };
}

function chooseMailboxReply(replyId) {
  const letter = player.mailbox.letters.find((l) => l.id === mailboxRun.openLetterId);
  if (!letter) return { ok: false, reason: 'no_letter' };
  const reply = getLetterView(letter).replies.find((r) => r.id === replyId);
  if (!reply) return { ok: false, reason: 'invalid_reply' };
  mailboxRun.replyId = reply.id;
  playSfx('pat');
  syncMailboxUI();
  return { ok: true, replyId: reply.id };
}

function chooseMailboxStamp(stampId) {
  const letter = player.mailbox.letters.find((l) => l.id === mailboxRun.openLetterId);
  if (!letter) return { ok: false, reason: 'no_letter' };
  const stamp = MAILBOX_STAMP_SPECS.find((s) => s.id === stampId);
  if (!stamp) return { ok: false, reason: 'invalid_stamp' };
  if (!isMailboxStampUnlocked(stamp)) return { ok: false, reason: 'stamp_locked', need: stamp.unlockReplies };
  mailboxRun.stampId = stamp.id;
  playSfx('stamp_press');
  syncMailboxUI();
  return { ok: true, stampId: stamp.id };
}

function sendMailboxReply(refDate = new Date()) {
  if (gameMode !== 'pet') switchMode('pet');
  const mb = player.mailbox;
  const letter = mb.letters.find((l) => l.id === mailboxRun.openLetterId);
  if (!letter) return { ok: false, reason: 'no_letter' };
  const view = getLetterView(letter);
  const reply = view.replies.find((r) => r.id === mailboxRun.replyId);
  if (!reply) return { ok: false, reason: 'no_reply' };
  const stamp = MAILBOX_STAMP_SPECS.find((s) => s.id === mailboxRun.stampId);
  if (!stamp || !isMailboxStampUnlocked(stamp)) return { ok: false, reason: 'no_stamp' };

  const best = Boolean(reply.best);
  const coinReward = 10 + letter.tier * 4 + (best ? 8 : 0);
  const xpReward = 16 + letter.tier * 6 + (best ? 10 : 0);
  const prevUnlocked = MAILBOX_STAMP_SPECS.filter(isMailboxStampUnlocked).map((s) => s.id);
  mb.stamps[stamp.id] = (mb.stamps[stamp.id] || 0) + 1;
  mb.totalReplies = (mb.totalReplies || 0) + 1;
  if (best) mb.bestReplies = (mb.bestReplies || 0) + 1;
  mb.album.push({
    ...letter,
    opened: true,
    replyId: reply.id,
    stampId: stamp.id,
    best,
    repliedDate: formatLocalDateKey(refDate)
  });
  if (mb.album.length > 30) mb.album = mb.album.slice(-30);
  mb.letters = mb.letters.filter((l) => l.id !== letter.id);
  const newlyUnlocked = MAILBOX_STAMP_SPECS.filter((s) => isMailboxStampUnlocked(s) && !prevUnlocked.includes(s.id));
  mailboxRun.openLetterId = '';
  mailboxRun.replyId = '';
  mailboxRun.stampId = '';

  petAudio.playLetterSentChime(Math.max(0, MAILBOX_STAMP_SPECS.indexOf(stamp)));
  petAudio.haptic('pat');
  player.idleTime = 0;
  player.happyTimer = 2.6;
  if (best) player.cheerTimer = 2.2;
  spawnInteractVfx(player.x, player.y - 26, 'love', best ? 11 : 7);
  addCoins(coinReward, player.x + 26, player.y - 44, '回信礼 ');
  addAffectionXp(xpReward, best ? `心意相通 +${xpReward} 亲密` : `回信 +${xpReward} 亲密`);
  recordJournalActivity('letters', 1, refDate);
  const unlockTxt = newlyUnlocked.length ? ` 集邮册解锁了「${newlyUnlocked.map((s) => s.name).join('、')}」！` : '';
  setPlayerEmote(
    `${best ? view.bestReaction : `回信收到啦，${stamp.name}贴得端端正正，收进集邮册咯~`}${unlockTxt}`,
    3.2,
    best ? 'cheer' : 'happy',
    true
  );

  mailboxRun.lastResult = {
    letterId: letter.id,
    moodId: letter.moodId,
    replyId: reply.id,
    stampId: stamp.id,
    best,
    coinReward,
    xpReward,
    newlyUnlocked: newlyUnlocked.map((s) => s.id)
  };
  savePetState();
  syncMailboxUI(refDate);
  syncWeeklyJournalUI(refDate);
  if (gameMode === 'survivor') syncSurvivorSkillStrip();
  return { ok: true, ...mailboxRun.lastResult, bonus: getMailboxHeartfeltBonus(), audio: petAudio.getAr10AudioInfo() };
}

function setMailboxView(view) {
  const nextView = view === 'album' ? 'album' : 'inbox';
  // 已在信箱页且正读信时再点「信箱」页签：合上信纸回到信封列表
  if (nextView === 'inbox' && mailboxRun.view === 'inbox' && mailboxRun.openLetterId) {
    mailboxRun.openLetterId = '';
    mailboxRun.replyId = '';
    mailboxRun.stampId = '';
  }
  mailboxRun.view = nextView;
  playSfx('pat');
  syncMailboxUI();
  return mailboxRun.view;
}

function readMailboxAlbumEntry(idx) {
  const i = Math.round(Number(idx));
  if (!(i >= 0 && i < player.mailbox.album.length)) return { ok: false, reason: 'invalid_album_entry' };
  mailboxRun.view = 'album';
  mailboxRun.albumReadIdx = i;
  petAudio.playLetterOpen();
  syncMailboxUI();
  return { ok: true, idx: i };
}

let mailboxEnvelopeKey = '';
let mailboxReplyKey = '';

function syncMailboxUI(refDate = new Date()) {
  const mb = player.mailbox;
  if (!mb) return;
  const bonus = getMailboxHeartfeltBonus();
  const unlockedStamps = MAILBOX_STAMP_SPECS.filter(isMailboxStampUnlocked);
  const inbox = mb.letters;
  const cardOpen = isAr10CardOpen('mailbox');
  player.mailboxVisual = { unread: inbox.length };
  if (mailboxRun.openLetterId && !inbox.some((l) => l.id === mailboxRun.openLetterId)) {
    mailboxRun.openLetterId = '';
    mailboxRun.replyId = '';
    mailboxRun.stampId = '';
  }
  const openLetter = inbox.find((l) => l.id === mailboxRun.openLetterId) || null;
  const view = openLetter ? getLetterView(openLetter) : null;

  if (mailboxSummaryPillEl) {
    mailboxSummaryPillEl.textContent = `回信 ${mb.totalReplies || 0} · 邮票 ${unlockedStamps.length}/${MAILBOX_STAMP_SPECS.length}`;
  }
  if (mailboxInboxCountEl) mailboxInboxCountEl.textContent = String(inbox.length);
  if (mailboxAlbumCountEl) mailboxAlbumCountEl.textContent = String(mb.album.length);
  mailboxTabRowEl?.querySelectorAll('.mailbox-tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.mailView === mailboxRun.view);
  });
  mailboxInboxViewEl?.classList.toggle('hidden', mailboxRun.view !== 'inbox');
  mailboxCardEl?.classList.toggle('has-open-letter', Boolean(openLetter && mailboxRun.view === 'inbox'));
  mailboxAlbumViewEl?.classList.toggle('hidden', mailboxRun.view !== 'album');

  if (mailboxEnvelopeRowEl) {
    const envKey = inbox.map((l) => `${l.id}:${l.opened ? 1 : 0}`).join('|') + `#${mailboxRun.openLetterId}`;
    if (envKey !== mailboxEnvelopeKey) {
      mailboxEnvelopeKey = envKey;
      mailboxEnvelopeRowEl.innerHTML = inbox
        .map((l) => {
          const lv = getLetterView(l);
          return `<button type="button" class="mailbox-envelope${l.opened ? '' : ' is-new'}${l.id === mailboxRun.openLetterId ? ' is-open' : ''}" data-letter-id="${l.id}" title="${lv.title} · ${l.dateKey}">
              <img src="./assets/letter_envelope.webp?v=hd31" alt="" class="mailbox-envelope-ico" />
              <span class="mailbox-envelope-date">${l.dateKey.slice(5).replace('-', '/')}</span>
              <em class="mailbox-envelope-mood">${l.opened ? lv.moodLabel : '未拆'}</em>
            </button>`;
        })
        .join('');
    }
  }

  if (mailboxNextHintEl) {
    mailboxNextHintEl.classList.toggle('hidden', Boolean(openLetter));
    const tier = MAILBOX_TIER_SPECS[getMailboxTier()];
    const rem = Math.max(0, (mb.nextLetterAt || 0) - refDate.getTime());
    const totalMins = Math.ceil(rem / 60000);
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    const eta = rem <= 0 ? '马上就到' : `约 ${hrs} 小时 ${mins} 分后`;
    mailboxNextHintEl.textContent =
      inbox.length >= MAILBOX_MAX_INBOX
        ? '信箱满啦，回完信她才会继续写下一封哦~'
        : inbox.length > 0
          ? `轻点信封拆开读读她的字迹 · 下一封${eta}投递`
          : `她正在书桌旁写下一封信，${eta}投递（${tier.name}·每 ${tier.intervalHours} 小时一封）`;
  }

  if (mailboxLetterEl) {
    mailboxLetterEl.classList.toggle('hidden', !openLetter);
    if (openLetter && view) {
      if (mailboxLetterTitleEl) mailboxLetterTitleEl.textContent = view.title;
      if (mailboxLetterMoodEl) mailboxLetterMoodEl.textContent = `${view.moodLabel} · ${view.tierName}`;
      if (mailboxLetterBodyEl) mailboxLetterBodyEl.textContent = view.body;
      if (mailboxLetterSignEl) mailboxLetterSignEl.textContent = view.sign;
      const stamp = MAILBOX_STAMP_SPECS.find((s) => s.id === mailboxRun.stampId);
      if (mailboxLetterStampEl) {
        mailboxLetterStampEl.classList.toggle('hidden', !stamp);
        if (stamp && mailboxLetterStampEl.getAttribute('src') !== stamp.img) mailboxLetterStampEl.src = stamp.img;
      }
    }
  }

  if (mailboxReplyGridEl) {
    mailboxReplyGridEl.classList.toggle('hidden', !openLetter);
    const replyKey = openLetter ? `${openLetter.id}|${mailboxRun.replyId}` : '';
    if (replyKey !== mailboxReplyKey) {
      mailboxReplyKey = replyKey;
      mailboxReplyGridEl.innerHTML = view
        ? view.replies
            .map(
              (r) =>
                `<button type="button" class="mailbox-reply-btn${r.id === mailboxRun.replyId ? ' is-picked' : ''}" data-reply-id="${r.id}">${r.text}</button>`
            )
            .join('')
        : '';
    }
  }

  if (mailboxStampRowEl) {
    mailboxStampRowEl.classList.toggle('hidden', !openLetter);
    mailboxStampRowEl.querySelectorAll('.mailbox-stamp-btn').forEach((btn) => {
      const st = MAILBOX_STAMP_SPECS.find((s) => s.id === btn.dataset.stampId);
      const unlocked = isMailboxStampUnlocked(st);
      btn.disabled = !unlocked;
      btn.classList.toggle('is-locked', !unlocked);
      btn.classList.toggle('is-picked', unlocked && st.id === mailboxRun.stampId);
      btn.title = unlocked
        ? `${st.name} · 已贴 ${mb.stamps[st.id] || 0} 次`
        : `${st.name} · 再寄出 ${Math.max(0, st.unlockReplies - (mb.totalReplies || 0))} 封回信解锁`;
    });
  }

  if (btnMailboxSendEl) {
    const ready = Boolean(openLetter && mailboxRun.replyId && mailboxRun.stampId);
    btnMailboxSendEl.disabled = !ready;
    btnMailboxSendEl.textContent = !openLetter
      ? inbox.length > 0
        ? '先拆开一封信'
        : '信箱空空，等她写信~'
      : !mailboxRun.replyId
        ? '选一句回信'
        : !mailboxRun.stampId
          ? '贴一枚邮票'
          : '寄出回信';
  }
  if (btnMailboxGoShiftEl) btnMailboxGoShiftEl.classList.toggle('hidden', !bonus.active);

  if (mailboxStampTallyEl) {
    mailboxStampTallyEl.innerHTML = MAILBOX_STAMP_SPECS.map((st) => {
      const unlocked = isMailboxStampUnlocked(st);
      return `<span class="mailbox-tally-chip${unlocked ? '' : ' is-locked'}" data-tally-stamp="${st.id}"><img src="${st.img}" alt="" class="mailbox-tally-ico" />${st.name} <b>${mb.stamps[st.id] || 0}</b></span>`;
    }).join('');
  }
  if (mailboxAlbumGridEl) {
    const entries = mb.album.map((a, idx) => ({ a, idx })).reverse().slice(0, 12);
    mailboxAlbumGridEl.innerHTML = entries.length
      ? entries
          .map(({ a, idx }) => {
            const st = MAILBOX_STAMP_SPECS.find((s) => s.id === a.stampId) || MAILBOX_STAMP_SPECS[0];
            return `<button type="button" class="mailbox-album-slot${a.best ? ' is-best' : ''}${idx === mailboxRun.albumReadIdx ? ' current' : ''}" data-album-idx="${idx}" title="${getLetterView(a).title} · ${a.repliedDate}">
                <img src="./assets/letter_envelope.webp?v=hd31" alt="" class="mailbox-album-ico" />
                <img src="${st.img}" alt="" class="mailbox-album-stamp" />
                <span class="mailbox-album-date">${a.repliedDate.slice(5).replace('-', '/')}</span>
              </button>`;
          })
          .join('')
      : '<span class="mailbox-album-empty">还没有寄出的回信，集邮册在等第一枚邮票~</span>';
  }
  if (mailboxAlbumReadEl) {
    const entry = mb.album[mailboxRun.albumReadIdx];
    if (entry) {
      const ev = getLetterView(entry);
      const reply = ev.replies.find((r) => r.id === entry.replyId);
      const st = MAILBOX_STAMP_SPECS.find((s) => s.id === entry.stampId) || MAILBOX_STAMP_SPECS[0];
      mailboxAlbumReadEl.textContent = `「${ev.title}」${ev.body}  你的回信：「${reply ? reply.text : '（心意已寄出）'}」· 贴了${st.name}`;
    } else {
      mailboxAlbumReadEl.textContent = '点一封珍藏信笺，重温她的字迹与你的回信~';
    }
  }
  if (mailboxTotalBonusEl) {
    mailboxTotalBonusEl.textContent = bonus.active
      ? `信笺心意生效中：幸存者班次经验 +${(bonus.shiftXpBonusPct * 100).toFixed(1)}%（回信 ${bonus.replies} 封 · 邮票 ${bonus.stampKinds}/${bonus.totalStampKinds} 种）`
      : '信笺心意：每寄出 1 封回信，幸存者打工班次经验 +1.2%，每集到 1 种邮票再 +1%';
  }
  if (btnMailboxDockEl) {
    btnMailboxDockEl.classList.toggle('has-letter', inbox.length > 0);
    btnMailboxDockEl.classList.toggle('active', cardOpen);
  }
  if (mailboxUnreadBadgeEl) {
    mailboxUnreadBadgeEl.classList.toggle('hidden', inbox.length === 0);
    mailboxUnreadBadgeEl.textContent = String(inbox.length);
  }
  syncAtelierPill();
}

function syncAtelierPill() {
  if (!atelierPillEl) return;
  const ward = getWatercolorFocusWard();
  const bonus = getMailboxHeartfeltBonus();
  const show = Boolean(gameMode === 'pet' && (ward.active || bonus.active));
  atelierPillEl.classList.toggle('hidden', !show);
  atelierSegEaselEl?.classList.toggle('hidden', !ward.active);
  atelierSegMailEl?.classList.toggle('hidden', !bonus.active);
  if (atelierPillGalleryEl) atelierPillGalleryEl.textContent = String(ward.gallerySize);
  if (atelierPillMailEl) atelierPillMailEl.textContent = String(bonus.replies);
  atelierPillEl.title = `画意专注守护：画廊 ${ward.gallerySize}/${ward.total} · 信笺心意：回信 ${bonus.replies} 封`;
}

function openWatercolorCard() {
  if (!watercolorCardEl) return;
  if (gameMode !== 'pet') switchMode('pet');
  closeDrawer();
  dismissTopicCard();
  dismissWindowAmbienceCard();
  foldOrHidePomodoroCard();
  dismissTeatimeCard();
  dismissWeeklyJournalCard();
  dismissTerrariumCard();
  foldOrHideGoodnightCard();
  dismissCollageCard();
  foldOrHideCozyRadioCard();
  dismissCrochetCard();
  dismissHotCocoaCard();
  dismissPressedFlowerCard();
  dismissTelescopeCard();
  dismissMailboxCard();
  dismissAr11Cards(); dismissAr12Cards(); dismissAr13Cards(); dismissAr14Cards(); dismissAr15Cards(); dismissAr16Cards();
  dismissPolaroid();
  closeAlbumLightbox();
  watercolorCardEl.classList.remove('hidden');
  syncWatercolorUI();
}

function toggleWatercolorCard() {
  if (!watercolorCardEl) return;
  if (watercolorCardEl.classList.contains('hidden')) {
    openWatercolorCard();
    playSfx('paint_mix');
  } else {
    dismissWatercolorCard();
    syncWatercolorUI();
  }
}

function openMailboxCard(opts = {}) {
  if (!mailboxCardEl) return;
  if (gameMode !== 'pet') switchMode('pet');
  closeDrawer();
  dismissTopicCard();
  dismissWindowAmbienceCard();
  foldOrHidePomodoroCard();
  dismissTeatimeCard();
  dismissWeeklyJournalCard();
  dismissTerrariumCard();
  foldOrHideGoodnightCard();
  dismissCollageCard();
  foldOrHideCozyRadioCard();
  dismissCrochetCard();
  dismissHotCocoaCard();
  dismissPressedFlowerCard();
  dismissTelescopeCard();
  dismissWatercolorCard();
  dismissAr11Cards(); dismissAr12Cards(); dismissAr13Cards(); dismissAr14Cards(); dismissAr15Cards(); dismissAr16Cards();
  dismissPolaroid();
  closeAlbumLightbox();
  mailboxCardEl.classList.remove('hidden');
  checkMailboxLetters(new Date(), false);
  if (opts.autoOpen) {
    const firstNew = player.mailbox.letters.find((l) => !l.opened) || player.mailbox.letters[0];
    if (firstNew) openMailboxLetter(firstNew.id);
  }
  syncMailboxUI();
}

function toggleMailboxCard() {
  if (!mailboxCardEl) return;
  if (mailboxCardEl.classList.contains('hidden')) {
    openMailboxCard();
    playSfx('stamp_press');
  } else {
    dismissMailboxCard();
    syncMailboxUI();
  }
}

function handleAr10CanvasTap(pt) {
  const vis = player.watercolorWallVisual;
  if (vis && Array.isArray(vis.items) && vis.items.length > 0) {
    const layout = getWatercolorGalleryLayout(W, H, vis.items.length);
    if (
      pt.x >= layout.left - 6 &&
      pt.x <= layout.right + 6 &&
      pt.y >= layout.top - layout.s * 0.5 &&
      pt.y <= layout.bottom + 16
    ) {
      openWatercolorCard();
      playSfx('paint_mix');
      return true;
    }
  }
  if (player.mailboxVisual && player.mailboxVisual.unread > 0) {
    const anchor = getMailboxDeskAnchor(W, H);
    if (Math.hypot(pt.x - anchor.x, pt.y - (anchor.y - 30)) < 40) {
      openMailboxCard({ autoOpen: true });
      playSfx('stamp_press');
      return true;
    }
  }
  return false;
}

function updateAr10Companions(dt) {
  if (player.paintingCheerTimer > 0) {
    player.paintingCheerTimer = Math.max(0, player.paintingCheerTimer - dt);
  }
  const cardOpen = isAr10CardOpen('watercolor');
  player.isPainting = Boolean(
    (cardOpen && watercolorRun.active && watercolorRun.phase !== 'done') || player.paintingCheerTimer > 0
  );
  mailboxRun.checkTimer -= dt;
  if (mailboxRun.checkTimer <= 0) {
    mailboxRun.checkTimer = 5;
    const written = checkMailboxLetters(new Date());
    if (!written && isAr10CardOpen('mailbox')) syncMailboxUI();
  }
}

if (watercolorCardEl) {
  watercolorCardEl.addEventListener('pointerdown', (e) => e.stopPropagation());
}
if (mailboxCardEl) {
  mailboxCardEl.addEventListener('pointerdown', (e) => e.stopPropagation());
}

bindHudTap(btnWatercolorDockEl, () => {
  toggleWatercolorCard();
});
bindHudTap(document.getElementById('btn-watercolor-close'), () => {
  dismissWatercolorCard();
  syncWatercolorUI();
});
document.querySelectorAll('#watercolor-subject-grid .watercolor-subject-tab').forEach((btn) => {
  bindHudTap(btn, () => {
    selectWatercolorSubject(btn.dataset.subjectId);
  });
});
document.querySelectorAll('#watercolor-palette-grid .watercolor-palette-chip').forEach((chip) => {
  bindHudTap(chip, () => {
    selectWatercolorPalette(chip.dataset.paletteId);
  });
});
bindHudTap(watercolorWellRowEl, (e) => {
  const wellEl = e.target && e.target.closest ? e.target.closest('.wc-well') : null;
  if (wellEl && !wellEl.disabled) tapWatercolorWell(Number(wellEl.dataset.wellIdx));
});
bindHudTap(watercolorWashLayerEl, (e) => {
  const spotEl = e.target && e.target.closest ? e.target.closest('.wc-wash-spot') : null;
  if (spotEl) tapWatercolorWash(Number(spotEl.dataset.washIdx));
});
bindHudTap(btnWatercolorMainEl, () => {
  if (btnWatercolorMainEl.disabled) return;
  handleWatercolorMainAction();
});
bindHudTap(btnWatercolorGoShiftEl, () => {
  dismissWatercolorCard();
  switchMode('survivor');
});
bindHudTap(watercolorGalleryGridEl, (e) => {
  const slotEl = e.target && e.target.closest ? e.target.closest('.wc-gallery-slot') : null;
  if (!slotEl) return;
  const [sid, pid] = String(slotEl.dataset.comboId || '').split('__');
  applyWatercolorSelection(sid, pid);
});

bindHudTap(btnMailboxDockEl, () => {
  toggleMailboxCard();
});
bindHudTap(document.getElementById('btn-mailbox-close'), () => {
  dismissMailboxCard();
  syncMailboxUI();
});
bindHudTap(mailboxTabRowEl, (e) => {
  const tabEl = e.target && e.target.closest ? e.target.closest('.mailbox-tab') : null;
  if (tabEl) setMailboxView(tabEl.dataset.mailView);
});
bindHudTap(mailboxEnvelopeRowEl, (e) => {
  const envEl = e.target && e.target.closest ? e.target.closest('.mailbox-envelope') : null;
  if (envEl) openMailboxLetter(envEl.dataset.letterId);
});
bindHudTap(mailboxReplyGridEl, (e) => {
  const replyEl = e.target && e.target.closest ? e.target.closest('.mailbox-reply-btn') : null;
  if (replyEl) chooseMailboxReply(replyEl.dataset.replyId);
});
document.querySelectorAll('#mailbox-stamp-row .mailbox-stamp-btn').forEach((btn) => {
  bindHudTap(btn, () => {
    if (!btn.disabled) chooseMailboxStamp(btn.dataset.stampId);
  });
});
bindHudTap(btnMailboxSendEl, () => {
  if (btnMailboxSendEl.disabled) return;
  sendMailboxReply();
});
bindHudTap(btnMailboxGoShiftEl, () => {
  dismissMailboxCard();
  switchMode('survivor');
});
bindHudTap(mailboxAlbumGridEl, (e) => {
  const slotEl = e.target && e.target.closest ? e.target.closest('.mailbox-album-slot') : null;
  if (slotEl) readMailboxAlbumEntry(Number(slotEl.dataset.albumIdx));
});
bindHudTap(atelierPillEl, (e) => {
  const segEl = e.target && e.target.closest ? e.target.closest('[data-atelier-seg]') : null;
  const seg = segEl ? segEl.dataset.atelierSeg : getWatercolorFocusWard().active ? 'easel' : 'mail';
  if (seg === 'mail') openMailboxCard();
  else openWatercolorCard();
});

// 旧存档 / 脏数据：远期投递时间回拉到正常间隔，随后检查是否该投递初见来信
{
  const mb = player.mailbox;
  const nowMs = Date.now();
  if (mb.nextLetterAt > nowMs + 48 * 3600000) mb.nextLetterAt = nowMs + getMailboxIntervalMs();
}
checkMailboxLetters(new Date(), false);
syncWatercolorUI();
syncMailboxUI();

window.__AR10_DEBUG__ = {
  getSpecs() {
    return JSON.parse(
      JSON.stringify({
        subjects: WATERCOLOR_SUBJECTS,
        palettes: WATERCOLOR_PALETTES,
        washSpots: WATERCOLOR_WASH_SPOTS,
        stamps: MAILBOX_STAMP_SPECS,
        moods: LETTER_MOOD_SPECS,
        tiers: MAILBOX_TIER_SPECS
      })
    );
  },
  selectSubject(subjectId) {
    return selectWatercolorSubject(subjectId);
  },
  selectPalette(paletteId) {
    return selectWatercolorPalette(paletteId);
  },
  startPainting() {
    return startWatercolorSession();
  },
  tapWell(idx) {
    return tapWatercolorWell(idx);
  },
  tapWash(idx) {
    return tapWatercolorWash(idx);
  },
  finishPainting(customDateIso = '') {
    const refDate = customDateIso ? new Date(customDateIso) : new Date();
    return finishWatercolorPainting(refDate);
  },
  paintCombo(subjectId, paletteId, customDateIso = '') {
    applyWatercolorSelection(subjectId, paletteId);
    const start = startWatercolorSession();
    for (const idx of start.mixOrder) tapWatercolorWell(idx);
    for (let i = 0; i < WATERCOLOR_STROKES_NEEDED; i++) tapWatercolorWash(i);
    const refDate = customDateIso ? new Date(customDateIso) : new Date();
    return finishWatercolorPainting(refDate);
  },
  getWatercolorRun() {
    return JSON.parse(JSON.stringify(watercolorRun));
  },
  writeLetterNow(customDateIso = '') {
    const refDate = customDateIso ? new Date(customDateIso) : new Date();
    return writeMailboxLetter(refDate);
  },
  checkLetters(customDateIso = '') {
    const refDate = customDateIso ? new Date(customDateIso) : new Date();
    return checkMailboxLetters(refDate, true);
  },
  openLetter(letterId) {
    return openMailboxLetter(letterId);
  },
  chooseReply(replyId) {
    return chooseMailboxReply(replyId);
  },
  chooseStamp(stampId) {
    return chooseMailboxStamp(stampId);
  },
  sendReply(customDateIso = '') {
    const refDate = customDateIso ? new Date(customDateIso) : new Date();
    return sendMailboxReply(refDate);
  },
  setMailView(view) {
    return setMailboxView(view);
  },
  readAlbum(idx) {
    return readMailboxAlbumEntry(idx);
  },
  getMailboxRun() {
    return JSON.parse(JSON.stringify(mailboxRun));
  },
  getLetterView(letterId) {
    const letter =
      player.mailbox.letters.find((l) => l.id === letterId) || player.mailbox.album.find((l) => l.id === letterId);
    return letter ? getLetterView(letter) : null;
  },
  applyShiftXpForTest(val = 10) {
    const before = survivorRun.shiftXp;
    const after = applyShiftXpGain(val);
    return { before, after, mult: getMailboxShiftXpMult() };
  },
  getGalleryLayout() {
    const count = player.watercolorWallVisual?.items?.length || 0;
    return { gallery: getWatercolorGalleryLayout(W, H, count), mailbox: getMailboxDeskAnchor(W, H), W, H };
  },
  getState(customDateIso = '') {
    const refDate = customDateIso ? new Date(customDateIso) : new Date();
    return {
      gameMode,
      coins: player.coins,
      level: player.level,
      xp: player.xp,
      emote: player.emote,
      isPainting: Boolean(player.isPainting),
      watercolor: JSON.parse(JSON.stringify(player.watercolor)),
      watercolorRun: JSON.parse(JSON.stringify(watercolorRun)),
      focusWard: getWatercolorFocusWard(),
      wallVisual: JSON.parse(JSON.stringify(player.watercolorWallVisual)),
      mailbox: JSON.parse(JSON.stringify(player.mailbox)),
      mailboxRun: JSON.parse(JSON.stringify(mailboxRun)),
      mailboxVisual: { ...player.mailboxVisual },
      heartfelt: getMailboxHeartfeltBonus(),
      letterTier: getMailboxTier(),
      weeklyLetterMood: deriveWeeklyLetterMood(refDate).moodId,
      ar10Audio: petAudio.getAr10AudioInfo(),
      journalSummary: computeWeeklyJournalSummary(refDate),
      survivorMetrics: window.__AR5_DEBUG__.getSurvivorEffectiveMetrics(),
      openPanels: window.__AR5_DEBUG__.getState(customDateIso).openPanels
    };
  }
};

// ================= AR-11 暖灯厨房一起做饭团便当 & 奶油手账回忆拼图时光 =================
const bentoCardEl = document.getElementById('bento-kitchen-card');
const btnBentoDockEl = document.getElementById('btn-bento-kitchen');
const bentoBagBadgeEl = document.getElementById('bento-bag-badge');
const bentoSummaryPillEl = document.getElementById('bento-summary-pill');
const bentoTrayEl = document.getElementById('bento-tray');
const bentoBoxEl = document.getElementById('bento-box');
const bentoBoxFinishedEl = document.getElementById('bento-box-finished');
const bentoBoxTagEl = document.getElementById('bento-box-tag');
const bentoStepHintEl = document.getElementById('bento-step-hint');
const bentoRecipeLineEl = document.getElementById('bento-recipe-line');
const bentoBagRowEl = document.getElementById('bento-bag-row');
const btnBentoMainEl = document.getElementById('btn-bento-main');
const btnBentoShareEl = document.getElementById('btn-bento-share');
const btnBentoGoShiftEl = document.getElementById('btn-bento-go-shift');
const bentoCodexSubEl = document.getElementById('bento-codex-sub');
const bentoCodexGridEl = document.getElementById('bento-codex-grid');
const bentoTotalWardEl = document.getElementById('bento-total-ward');

const puzzleCardEl = document.getElementById('memory-puzzle-card');
const btnPuzzleDockEl = document.getElementById('btn-memory-puzzle');
const puzzleSummaryPillEl = document.getElementById('puzzle-summary-pill');
const puzzleSourceRowEl = document.getElementById('puzzle-source-row');
const puzzleBoardEl = document.getElementById('puzzle-board');
const puzzleStepHintEl = document.getElementById('puzzle-step-hint');
const puzzleRefImgEl = document.getElementById('puzzle-ref-img');
const puzzleMovesEl = document.getElementById('puzzle-moves');
const puzzleProgressFillEl = document.getElementById('puzzle-progress-fill');
const btnPuzzleMainEl = document.getElementById('btn-puzzle-main');
const btnPuzzleGoShiftEl = document.getElementById('btn-puzzle-go-shift');
const puzzleWallSubEl = document.getElementById('puzzle-wall-sub');
const puzzleWallGridEl = document.getElementById('puzzle-wall-grid');
const puzzleTotalBonusEl = document.getElementById('puzzle-total-bonus');

const kmPillEl = document.getElementById('kitchen-memory-pill');
const kmSegBentoEl = document.getElementById('km-seg-bento');
const kmSegPuzzleEl = document.getElementById('km-seg-puzzle');
const kmPillBentoEl = document.getElementById('km-pill-bento');
const kmPillPuzzleEl = document.getElementById('km-pill-puzzle');

const BENTO_SLOT_IDS = ['rice', 'sideA', 'sideB'];
const BENTO_ONIGIRI_IMG = './assets/onigiri_trio.webp?v=hd31';
const BENTO_FINISHED_IMG = './assets/bento_box_finished.webp?v=hd31';
const PUZZLE_PIECE_IMG = './assets/puzzle_piece_memory.webp?v=hd31';

const bentoRun = {
  phase: 'assemble',
  hand: '',
  slots: { rice: '', sideA: '', sideB: '' },
  misplaces: 0,
  lastResult: null,
  lastAction: ''
};

function isAr11CardOpen(which = '') {
  const bk = document.getElementById('bento-kitchen-card');
  const mp = document.getElementById('memory-puzzle-card');
  const bkOpen = Boolean(bk && !bk.classList.contains('hidden'));
  const mpOpen = Boolean(mp && !mp.classList.contains('hidden'));
  if (which === 'bento') return bkOpen;
  if (which === 'puzzle') return mpOpen;
  return bkOpen || mpOpen;
}

function dismissBentoKitchenCard() {
  document.getElementById('bento-kitchen-card')?.classList.add('hidden');
  document.getElementById('btn-bento-kitchen')?.classList.remove('active');
}

function dismissMemoryPuzzleCard() {
  document.getElementById('memory-puzzle-card')?.classList.add('hidden');
  document.getElementById('btn-memory-puzzle')?.classList.remove('active');
}

function dismissAr11Cards() {
  dismissBentoKitchenCard();
  dismissMemoryPuzzleCard();
}

// ---------------- 暖灯厨房：选食材 -> 摆进便当格 -> 盖盖 -> 打包 / 一起吃 ----------------
function parseBentoTrayItem(item) {
  const [kind, id] = String(item || '').split(':');
  if (kind === 'filling' && BENTO_FILLING_BY_ID[id]) return { kind, id, spec: BENTO_FILLING_BY_ID[id] };
  if (kind === 'side' && BENTO_SIDE_BY_ID[id]) return { kind, id, spec: BENTO_SIDE_BY_ID[id] };
  return null;
}

function getBentoFilledCount() {
  return BENTO_SLOT_IDS.filter((k) => bentoRun.slots[k]).length;
}

function getBentoDraftRecipe() {
  const fillingId = bentoRun.slots.rice;
  const pairId = getBentoPairId(bentoRun.slots.sideA, bentoRun.slots.sideB);
  return fillingId && pairId ? BENTO_RECIPE_BY_ID[`${fillingId}__${pairId}`] || null : null;
}

function resetBentoAssembly() {
  bentoRun.phase = 'assemble';
  bentoRun.hand = '';
  bentoRun.slots = { rice: '', sideA: '', sideB: '' };
  bentoRun.misplaces = 0;
}

// 已盖盖但还没打包 / 吃掉的便当跨刷新保留，盒子里按配方摆回原样
function restorePendingBento() {
  const recipe = BENTO_RECIPE_BY_ID[player.bentoKitchen.pending];
  if (!recipe) {
    if (bentoRun.phase === 'done') resetBentoAssembly();
    return;
  }
  bentoRun.phase = 'done';
  bentoRun.hand = '';
  bentoRun.slots = { rice: recipe.fillingId, sideA: recipe.sideIds[0], sideB: recipe.sideIds[1] };
}

function pickBentoTray(item) {
  if (bentoRun.phase !== 'assemble') return { ok: false, reason: 'bento_done' };
  const parsed = parseBentoTrayItem(item);
  if (!parsed) return { ok: false, reason: 'invalid_item' };
  // 再点同一种食材仍保持拿在手里，方便接着按住拖进格子
  bentoRun.hand = `${parsed.kind}:${parsed.id}`;
  player.idleTime = 0;
  playSfx('pat');
  syncBentoKitchenUI();
  return { ok: true, hand: bentoRun.hand };
}

function placeBentoSlot(slotId) {
  if (bentoRun.phase !== 'assemble') return { ok: false, reason: 'bento_done' };
  if (!BENTO_SLOT_IDS.includes(slotId)) return { ok: false, reason: 'invalid_slot' };
  const parsed = parseBentoTrayItem(bentoRun.hand);
  if (!parsed) {
    // 空手点一下已摆好的格子：把食材拿回托盘重新挑
    if (bentoRun.slots[slotId]) {
      const removed = bentoRun.slots[slotId];
      bentoRun.slots[slotId] = '';
      playSfx('pat');
      syncBentoKitchenUI();
      return { ok: true, removed, slot: slotId, filled: getBentoFilledCount() };
    }
    return { ok: false, reason: 'empty_hand' };
  }
  const wantKind = slotId === 'rice' ? 'filling' : 'side';
  if (parsed.kind !== wantKind) {
    bentoRun.misplaces += 1;
    playSfx('star_miss');
    setPlayerEmote(
      wantKind === 'filling' ? '左边的大格子是饭团的位置哦，配菜放右边两格~' : '右边的小格子留给配菜，饭团放进左边大格子~',
      2.0,
      'happy',
      false
    );
    syncBentoKitchenUI();
    return { ok: false, reason: 'wrong_slot', misplaces: bentoRun.misplaces };
  }
  if (wantKind === 'side') {
    const otherSlot = slotId === 'sideA' ? 'sideB' : 'sideA';
    if (bentoRun.slots[otherSlot] === parsed.id) {
      bentoRun.misplaces += 1;
      playSfx('star_miss');
      setPlayerEmote(`另一格已经有${parsed.spec.name}啦，换一种配菜才丰盛~`, 2.0, 'happy', false);
      syncBentoKitchenUI();
      return { ok: false, reason: 'duplicate_side', misplaces: bentoRun.misplaces };
    }
  }
  bentoRun.slots[slotId] = parsed.id;
  bentoRun.hand = '';
  player.idleTime = 0;
  player.happyTimer = 1.0;
  playSfx('bento_place');
  const filled = getBentoFilledCount();
  setPlayerEmote(filled >= 3 ? '三格都摆满啦！盖上盖子，这份便当就完成了~' : parsed.spec.placeLine, 2.0, 'happy', false);
  syncBentoKitchenUI();
  return { ok: true, slot: slotId, item: parsed.id, filled };
}

function finishBento(refDate = new Date()) {
  if (bentoRun.phase !== 'assemble') return { ok: false, reason: 'not_assembling' };
  const recipe = getBentoDraftRecipe();
  if (!recipe) return { ok: false, reason: 'incomplete' };
  const bk = player.bentoKitchen;
  const prev = bk.discovered[recipe.id];
  const isNewRecipe = !prev;
  const misplaces = bentoRun.misplaces;
  const neat = misplaces === 0;
  bk.discovered[recipe.id] = {
    count: (prev?.count || 0) + 1,
    firstDate: prev?.firstDate || formatLocalDateKey(refDate)
  };
  bk.totalBentos = (bk.totalBentos || 0) + 1;
  bk.lastRecipeId = recipe.id;
  bk.pending = recipe.id;
  bentoRun.phase = 'done';
  bentoRun.hand = '';

  const coinReward = (isNewRecipe ? 26 : 10) + (neat ? 4 : 0);
  const xpReward = isNewRecipe ? 28 : 12;
  petAudio.playBentoLidChime(Math.max(0, BENTO_FILLINGS.findIndex((f) => f.id === recipe.fillingId)));
  petAudio.haptic('headpat');
  player.idleTime = 0;
  player.happyTimer = 2.6;
  player.cheerTimer = isNewRecipe ? 2.4 : 1.4;
  player.bentoCheerTimer = 4.5;
  spawnInteractVfx(player.x, player.y - 30, 'sparkle', isNewRecipe ? 12 : 8);
  addCoins(coinReward, player.x + 28, player.y - 46, isNewRecipe ? '新便当 ' : '便当 ');
  addAffectionXp(xpReward, isNewRecipe ? `解锁「${recipe.name}」` : `再做「${recipe.name}」`);
  recordJournalActivity('bentos', 1, refDate);
  const stats = getBentoKitchenStats();
  setPlayerEmote(
    isNewRecipe
      ? `盖上盖子！『${recipe.name}』收进便当图鉴 ${stats.discovered}/${stats.totalRecipes} 啦~`
      : `又做好一份『${recipe.name}』，打包带去打工还是现在一起吃？`,
    3.0,
    isNewRecipe ? 'cheer' : 'happy',
    true
  );
  bentoRun.lastResult = {
    recipeId: recipe.id,
    name: recipe.name,
    isNewRecipe,
    neat,
    misplaces,
    coinReward,
    xpReward
  };
  bentoRun.lastAction = 'finished';
  savePetState();
  syncBentoKitchenUI();
  syncWeeklyJournalUI(refDate);
  return { ok: true, ...bentoRun.lastResult, audio: petAudio.getAr11AudioInfo() };
}

function packBento() {
  const bk = player.bentoKitchen;
  const recipe = BENTO_RECIPE_BY_ID[bk.pending];
  if (bentoRun.phase !== 'done' || !recipe) return { ok: false, reason: 'nothing_to_pack' };
  if (bk.bag.length >= BENTO_BAG_MAX) {
    setPlayerEmote('便当袋已经装满三份啦，这份我们现在一起吃掉吧~', 2.2, 'happy', false);
    syncBentoKitchenUI();
    return { ok: false, reason: 'bag_full' };
  }
  bk.bag.push({ recipeId: recipe.id, packedDate: formatLocalDateKey() });
  bk.totalPacked = (bk.totalPacked || 0) + 1;
  bk.pending = '';
  resetBentoAssembly();
  bentoRun.lastAction = 'packed';
  player.idleTime = 0;
  player.happyTimer = 1.6;
  playSfx('bento_place');
  setPlayerEmote(
    `『${recipe.name}』用格子布包好放进便当袋啦（${bk.bag.length}/${BENTO_BAG_MAX}），下个打工班次带上它~`,
    2.8,
    'happy',
    true
  );
  savePetState();
  syncBentoKitchenUI();
  return { ok: true, recipeId: recipe.id, bagCount: bk.bag.length };
}

function shareBento(refDate = new Date()) {
  const bk = player.bentoKitchen;
  const recipe = BENTO_RECIPE_BY_ID[bk.pending];
  if (bentoRun.phase !== 'done' || !recipe) return { ok: false, reason: 'nothing_to_share' };
  bk.pending = '';
  bk.totalShared = (bk.totalShared || 0) + 1;
  resetBentoAssembly();
  bentoRun.lastAction = 'shared';
  player.hunger = Math.min(player.maxHunger, player.hunger + 32);
  player.hp = Math.min(player.maxHp, player.hp + 20);
  player.idleTime = 0;
  player.happyTimer = 2.2;
  playSfx('star');
  spawnInteractVfx(player.x, player.y - 26, 'love', 9);
  addAffectionXp(14, `一起吃「${recipe.name}」`);
  recordJournalActivity('feeds', 1, refDate);
  setPlayerEmote(`啊呜——『${recipe.name}』和你一起吃最香了，饱饱的~`, 2.6, 'eat', true);
  savePetState();
  syncBentoKitchenUI();
  return { ok: true, recipeId: recipe.id, hunger: player.hunger };
}

function handleBentoMainAction() {
  if (bentoRun.phase === 'done') return packBento();
  return finishBento();
}

// 进入幸存者班次时从便当袋取出最早打包的一份：本班次持续回血 + 低血饭团救急；同一班次内重开不再消耗
function openBentoLunchForShift(prevMode) {
  if (prevMode === 'survivor' && survivorRun.lunch) return survivorRun.lunch;
  survivorRun.lunch = null;
  const bk = player.bentoKitchen;
  while (bk.bag.length && !BENTO_RECIPE_BY_ID[bk.bag[0].recipeId]) bk.bag.shift();
  if (!bk.bag.length) return null;
  const item = bk.bag.shift();
  const recipe = BENTO_RECIPE_BY_ID[item.recipeId];
  survivorRun.lunch = {
    recipeId: recipe.id,
    name: recipe.name,
    regen: recipe.regen,
    rescuePct: recipe.rescuePct,
    rescueCharges: recipe.rescueCharges,
    rescuesLeft: recipe.rescueCharges,
    packedDate: item.packedDate
  };
  bk.totalLunches = (bk.totalLunches || 0) + 1;
  savePetState();
  return survivorRun.lunch;
}

function tryBentoRescueHeal() {
  const lunch = survivorRun.lunch;
  if (gameMode !== 'survivor' || !lunch || !(lunch.rescuesLeft > 0)) return false;
  if (player.hp >= player.maxHp * BENTO_RESCUE_THRESHOLD) return false;
  const heal = Math.round(player.maxHp * lunch.rescuePct);
  player.hp = Math.min(player.maxHp, player.hp + heal);
  lunch.rescuesLeft -= 1;
  player.bentoKitchen.totalRescues = (player.bentoKitchen.totalRescues || 0) + 1;
  floatingTexts.push({
    x: player.x,
    y: player.y - 54,
    vx: 0,
    vy: -44,
    text: `饭团救急 +${heal}`,
    color: '#f6a36b',
    scale: 1.15,
    life: 1.0
  });
  petAudio.playBentoRescueChime();
  spawnInteractVfx(player.x, player.y - 30, 'love', 6);
  syncSurvivorSkillStrip();
  savePetState();
  return true;
}

let bentoSlotKey = '';
let bentoCodexKey = '';
let bentoBagKey = '';

function renderBentoSlotInner(slotId, itemId) {
  if (!itemId) {
    return `<span class="bento-slot-label">${slotId === 'rice' ? '饭团格' : '配菜格'}</span>`;
  }
  if (slotId === 'rice') {
    const f = BENTO_FILLING_BY_ID[itemId];
    return `<img src="${BENTO_ONIGIRI_IMG}" alt="" class="bento-slot-ico" /><span class="bento-slot-name"><i class="bento-dot" style="--bk:${f.color}"></i>${f.shortName}</span>`;
  }
  const sd = BENTO_SIDE_BY_ID[itemId];
  return `<i class="bento-slot-portion" style="--bk:${sd.color}"></i><span class="bento-slot-name">${sd.name}</span>`;
}

function syncBentoKitchenUI() {
  const bk = player.bentoKitchen;
  if (!bk) return;
  if (bentoRun.phase === 'done' && !BENTO_RECIPE_BY_ID[bk.pending]) resetBentoAssembly();
  const stats = getBentoKitchenStats();
  const cardOpen = isAr11CardOpen('bento');
  const phase = bentoRun.phase;
  const filled = getBentoFilledCount();
  const hand = parseBentoTrayItem(bentoRun.hand);
  const draft = phase === 'done' ? BENTO_RECIPE_BY_ID[bk.pending] : getBentoDraftRecipe();
  player.isCookingBento = Boolean((cardOpen && phase === 'assemble') || player.bentoCheerTimer > 0);
  player.bentoDeskVisual = { bagCount: stats.bagCount };

  if (bentoSummaryPillEl) bentoSummaryPillEl.textContent = `图鉴 ${stats.discovered}/${stats.totalRecipes} · 袋 ${stats.bagCount}/${stats.bagMax}`;

  bentoTrayEl?.querySelectorAll('.bento-tray-chip').forEach((chip) => {
    const parsed = parseBentoTrayItem(chip.dataset.trayItem);
    const key = parsed ? `${parsed.kind}:${parsed.id}` : '';
    chip.classList.toggle('is-hand', Boolean(key && key === bentoRun.hand));
    const used =
      parsed &&
      (parsed.kind === 'filling'
        ? bentoRun.slots.rice === parsed.id
        : bentoRun.slots.sideA === parsed.id || bentoRun.slots.sideB === parsed.id);
    chip.classList.toggle('is-used', Boolean(used));
    chip.disabled = phase !== 'assemble';
  });

  if (bentoBoxEl) {
    bentoBoxEl.dataset.phase = phase;
    const slotKey = `${phase}|${bentoRun.slots.rice}|${bentoRun.slots.sideA}|${bentoRun.slots.sideB}`;
    const slotEls = bentoBoxEl.querySelectorAll('.bento-slot');
    if (slotKey !== bentoSlotKey) {
      bentoSlotKey = slotKey;
      slotEls.forEach((el) => {
        const sid = el.dataset.bentoSlot;
        el.innerHTML = renderBentoSlotInner(sid, bentoRun.slots[sid]);
      });
    }
    slotEls.forEach((el) => {
      const sid = el.dataset.bentoSlot;
      el.classList.toggle('is-filled', Boolean(bentoRun.slots[sid]));
      el.classList.toggle(
        'is-target',
        Boolean(phase === 'assemble' && hand && (sid === 'rice' ? hand.kind === 'filling' : hand.kind === 'side'))
      );
      el.disabled = phase !== 'assemble';
    });
  }
  bentoBoxFinishedEl?.classList.toggle('hidden', phase !== 'done');
  if (bentoBoxTagEl) bentoBoxTagEl.textContent = phase === 'done' ? '已盖盖' : `摆盘 ${filled}/3`;

  if (bentoStepHintEl) {
    const res = bentoRun.lastResult;
    bentoStepHintEl.textContent =
      phase === 'done'
        ? stats.bagCount >= stats.bagMax
          ? '便当袋满啦（3/3），这份就和她一起吃掉吧~'
          : `${res && res.recipeId === bk.pending && res.isNewRecipe ? '新配方解锁！' : ''}打包进便当袋带去打工，或者现在一起吃掉~`
        : hand
          ? `手里拿着「${hand.kind === 'filling' ? `${hand.spec.shortName}饭团` : hand.spec.name}」，点${hand.kind === 'filling' ? '左边饭团格' : '右边配菜格'}放进去（也可以直接拖过去）`
          : filled >= 3
            ? draft
              ? '三格都满啦，点「盖上盖子」完成便当~'
              : '两格配菜要不一样哦~'
            : bentoRun.lastAction === 'packed'
              ? '已经打包好一份啦！再做一份，还是带便当去打工？'
              : bentoRun.lastAction === 'shared'
                ? '一起吃饱饱~ 再做一份便当吧！'
                : '点一种饭团馅料或配菜拿在手里，再点便当盒的格子摆进去~';
  }

  if (bentoRecipeLineEl) {
    bentoRecipeLineEl.innerHTML = draft
      ? `<strong>『${draft.name}』</strong><span>续航 +${draft.regen.toFixed(1)}/秒 · 救急 ${Math.round(draft.rescuePct * 100)}% ×${draft.rescueCharges}</span>`
      : '<strong>饭团 + 两种不同配菜</strong><span>= 1 款便当，共 9 款图鉴</span>';
  }

  if (bentoBagRowEl) {
    const bagKey = bk.bag.map((b) => b.recipeId).join(',');
    if (bagKey !== bentoBagKey || !bentoBagRowEl.childElementCount) {
      bentoBagKey = bagKey;
      let html = '<span class="bento-bag-label">便当袋</span>';
      for (let i = 0; i < BENTO_BAG_MAX; i++) {
        const item = bk.bag[i];
        const rc = item ? BENTO_RECIPE_BY_ID[item.recipeId] : null;
        html += rc
          ? `<span class="bento-bag-slot is-packed" title="${rc.name} · 续航 +${rc.regen.toFixed(1)}/秒"><img src="${BENTO_FINISHED_IMG}" alt="" class="bento-bag-ico" /></span>`
          : '<span class="bento-bag-slot" title="空位"></span>';
      }
      bentoBagRowEl.innerHTML = html;
    }
  }

  if (btnBentoMainEl) {
    if (phase === 'done') {
      const bagFull = stats.bagCount >= stats.bagMax;
      btnBentoMainEl.disabled = bagFull;
      btnBentoMainEl.textContent = bagFull ? '便当袋已满' : '打包进便当袋';
      btnBentoMainEl.classList.add('is-pack');
      btnBentoMainEl.classList.remove('is-finish');
    } else {
      btnBentoMainEl.disabled = !draft;
      btnBentoMainEl.textContent = draft ? '盖上盖子 · 完成便当' : filled >= 3 ? '配菜要不一样' : `还差 ${3 - filled} 格`;
      btnBentoMainEl.classList.toggle('is-finish', Boolean(draft));
      btnBentoMainEl.classList.remove('is-pack');
    }
  }
  btnBentoShareEl?.classList.toggle('hidden', phase !== 'done');
  btnBentoGoShiftEl?.classList.toggle('hidden', stats.bagCount < 1);

  if (bentoCodexGridEl) {
    const counts = BENTO_RECIPES.map((r) => bk.discovered[r.id]?.count || 0);
    const codexKey = `${counts.join(',')}|${draft ? draft.id : ''}`;
    if (codexKey !== bentoCodexKey) {
      bentoCodexKey = codexKey;
      bentoCodexGridEl.innerHTML = BENTO_RECIPES.map((r) => {
        const rec = bk.discovered[r.id];
        const f = BENTO_FILLING_BY_ID[r.fillingId];
        return `<span class="bento-codex-slot${rec ? ' collected' : ''}${draft && draft.id === r.id ? ' current' : ''}" data-recipe-id="${r.id}" title="${rec ? `${r.name} · 做过 ${rec.count} 次 · 续航 +${r.regen.toFixed(1)}/秒 · 救急 ${Math.round(r.rescuePct * 100)}% ×${r.rescueCharges}` : `待解锁：${f.shortName}饭团 + ${r.sideIds.map((sid) => BENTO_SIDE_BY_ID[sid].name).join(' + ')}`}">
            <img src="${rec ? BENTO_FINISHED_IMG : BENTO_ONIGIRI_IMG}" alt="" class="bento-codex-ico" />
            <em class="bento-codex-tag"><i class="bento-dot" style="--bk:${f.color}"></i>${r.sideIds.map((sid) => `<i class="bento-dot" style="--bk:${BENTO_SIDE_BY_ID[sid].color}"></i>`).join('')}${rec ? `×${rec.count}` : ''}</em>
          </span>`;
      }).join('');
    }
  }
  if (bentoCodexSubEl) {
    bentoCodexSubEl.textContent = `便当图鉴 ${stats.discovered}/${stats.totalRecipes} · 共做 ${bk.totalBentos || 0} 份 · 打包 ${bk.totalPacked || 0} · 同享 ${bk.totalShared || 0}`;
  }
  if (bentoTotalWardEl) {
    const next = stats.nextLunch;
    bentoTotalWardEl.textContent = next
      ? `下个班次带『${next.name}』：体力回复 +${next.regen.toFixed(1)}/秒 · 低血饭团救急 ${Math.round(next.rescuePct * 100)}% ×${next.rescueCharges}（袋 ${stats.bagCount}/${stats.bagMax}）`
      : '便当续航：打包的便当在下一个幸存者班次打开，每份守护 1 个班次（持续回血 + 低血饭团救急）';
  }

  if (btnBentoDockEl) {
    btnBentoDockEl.classList.toggle('has-lunch', stats.bagCount > 0);
    btnBentoDockEl.classList.toggle('active', cardOpen);
  }
  if (bentoBagBadgeEl) {
    bentoBagBadgeEl.textContent = String(stats.bagCount);
    bentoBagBadgeEl.classList.toggle('hidden', stats.bagCount < 1);
  }
  syncKitchenMemoryPill();
}

// ---------------- 回忆拼图：从存档里的拍立得 / 水彩画 / 心情周报生成 3×3 小拼图，拼好挂上回忆墙 ----------------
const MEMORY_KIND_TAGS = { photo: '合影', paint: '水彩', week: '周报', art: '原画' };
const MEMORY_FALLBACK_ARTS = [
  {
    id: 'art:rainy_window',
    kind: 'art',
    label: '雨窗原画',
    spriteKey: 'watercolorRainyWindow',
    img: './assets/watercolor_rainy_window.webp?v=hd31',
    pad: 0
  },
  {
    id: 'art:bento',
    kind: 'art',
    label: '暖灯便当',
    spriteKey: 'bentoBoxFinished',
    img: './assets/bento_box_finished.webp?v=hd31',
    pad: 0.07
  }
];
const MEMORY_SOURCE_SIZE = 270;

const puzzleRun = {
  phase: 'idle',
  sourceId: '',
  sourceLabel: '',
  sourceKind: '',
  cacheKey: '',
  order: [],
  selectedSlot: -1,
  moves: 0,
  minSwaps: 0,
  preparing: false,
  lastResult: null
};

const memorySourceCache = new Map();
const memoryWallThumbCache = new Map();

function getSafePolaroidEntries() {
  try {
    return Array.isArray(polaroidAlbum)
      ? polaroidAlbum.filter(
          (p) => p && typeof p.dataUrl === 'string' && p.dataUrl.startsWith('data:image/') && /^[A-Za-z0-9_-]{1,52}$/.test(String(p.id || ''))
        )
      : [];
  } catch (e) {
    return [];
  }
}

// 回忆来源：最近 2 张拍立得 + 最近挂上墙的 2 幅水彩 + 本周心情周报（盖过章才有），不足 3 段时补上手账原画
function getMemoryPuzzleSources(refDate = new Date()) {
  const list = [];
  const photos = getSafePolaroidEntries()
    .slice()
    .sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0))
    .slice(0, 2);
  const photoDate = (ph) => (typeof ph.dateStr === 'string' && ph.dateStr.length >= 10 ? ph.dateStr.slice(5, 10).replace('.', '/') : '');
  const photoTime = (ph) => (typeof ph.dateStr === 'string' && /\d{2}:\d{2}$/.test(ph.dateStr) ? ph.dateStr.slice(-5) : '');
  for (const ph of photos) {
    const dateTxt = photoDate(ph);
    // 同一天拍的两张合影改用时刻区分
    const sameDay = dateTxt && photos.some((o) => o !== ph && photoDate(o) === dateTxt);
    const tag = sameDay && photoTime(ph) ? photoTime(ph) : dateTxt;
    list.push({
      id: `photo:${ph.id}`,
      kind: 'photo',
      label: tag ? `合影 ${tag}` : '拍立得合影',
      cacheKey: `photo:${ph.id}`,
      dataUrl: ph.dataUrl
    });
  }
  // 同一分钟连拍的两张合影再补一个序号，来源标签不重名
  const photoLabels = list.filter((x) => x.kind === 'photo');
  if (photoLabels.length === 2 && photoLabels[0].label === photoLabels[1].label) photoLabels[1].label += '·2';
  const wc = player.watercolor || {};
  const paintIds = [...(wc.hung || [])].reverse().filter((k) => wc.paintings && wc.paintings[k]).slice(0, 2);
  for (const cid of paintIds) {
    const [sid, pid] = cid.split('__');
    const sSpec = WATERCOLOR_SUBJECT_BY_ID[sid];
    const pSpec = WATERCOLOR_PALETTE_BY_ID[pid];
    if (!sSpec || !pSpec) continue;
    list.push({
      id: `paint:${cid}`,
      kind: 'paint',
      label: `${pSpec.shortName}·${sSpec.shortName}`,
      cacheKey: `paint:${cid}`,
      subjectId: sid,
      paletteId: pid
    });
  }
  const summary = computeWeeklyJournalSummary(refDate);
  if (summary.stamps7d >= 1) {
    const days = summary.daysList.map((d) => (d.stamped ? d.moodId : ''));
    list.push({
      id: `week:${summary.weekKey}`,
      kind: 'week',
      label: `周报 ${summary.weekKey.slice(5)}`,
      cacheKey: `week:${summary.weekKey}|${days.join(',')}`,
      days
    });
  }
  for (const art of MEMORY_FALLBACK_ARTS) {
    if (list.length >= 3) break;
    list.push({ ...art, cacheKey: art.id });
  }
  return list;
}

function getSelectedMemorySource(sources) {
  const mp = player.memoryPuzzle;
  return sources.find((s) => s.id === mp.selectedSourceId) || sources[0] || null;
}

function loadImageAsync(src) {
  return new Promise((resolve) => {
    const im = new Image();
    im.onload = () => resolve(im.naturalWidth > 0 ? im : null);
    im.onerror = () => resolve(null);
    im.src = src;
  });
}

function getReadyAssetImage(spriteKey, src) {
  const im = spriteKey ? images[spriteKey] : null;
  if (isReady(im)) return Promise.resolve(im);
  return loadImageAsync(src);
}

// 把回忆合成为 270×270 方形底图（只贴已有的位图：相片 / 水彩贴图 / 周报贴图 / 手账原画）
async function renderMemorySourceCanvas(src) {
  const size = MEMORY_SOURCE_SIZE;
  const cv = document.createElement('canvas');
  cv.width = size;
  cv.height = size;
  const c = cv.getContext('2d');
  if (!c) return null;
  const bg = c.createLinearGradient(0, 0, 0, size);
  bg.addColorStop(0, '#fffdf8');
  bg.addColorStop(1, '#fbeedd');
  c.fillStyle = bg;
  c.fillRect(0, 0, size, size);
  if (src.kind === 'photo') {
    const im = await loadImageAsync(src.dataUrl);
    if (!im) return null;
    const side = Math.min(im.naturalWidth, im.naturalHeight);
    c.drawImage(im, (im.naturalWidth - side) / 2, (im.naturalHeight - side) / 2, side, side, 0, 0, size, size);
  } else if (src.kind === 'paint') {
    const sSpec = WATERCOLOR_SUBJECT_BY_ID[src.subjectId];
    const pSpec = WATERCOLOR_PALETTE_BY_ID[src.paletteId];
    const base = await getReadyAssetImage('watercolorRainyWindow', './assets/watercolor_rainy_window.webp?v=hd31');
    if (!base || !sSpec || !pSpec) return null;
    const subj = sSpec.spriteKey ? await getReadyAssetImage(sSpec.spriteKey, sSpec.img) : null;
    if ('filter' in c) c.filter = pSpec.filter;
    c.drawImage(base, 0, 0, size, size);
    const box = getWatercolorOverlayBox(sSpec);
    if (subj && box) c.drawImage(subj, box.left * size, box.top * size, box.size * size, box.size * size);
    if ('filter' in c) c.filter = 'none';
  } else if (src.kind === 'week') {
    const journal = await getReadyAssetImage('uiBtnWeeklyJournal', './assets/ui_btn_weekly_journal.webp?v=hd31');
    if (journal) c.drawImage(journal, size * 0.17, size * 0.04, size * 0.66, size * 0.66);
    const cell = size / 7;
    for (let i = 0; i < 7; i++) {
      const moodId = src.days && src.days[i];
      const spec = moodId ? JOURNAL_MOODS[moodId] : null;
      if (!spec) continue;
      const stampImg = await loadImageAsync(spec.img);
      if (stampImg) c.drawImage(stampImg, i * cell + cell * 0.08, size * 0.76, cell * 0.84, cell * 0.84);
    }
    c.font = '900 19px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
    c.textAlign = 'center';
    c.fillStyle = '#8a5a3c';
    c.fillText(`七日心情周报 ${src.label.replace('周报 ', '')}`, size * 0.5, size * 0.73);
  } else if (src.kind === 'art') {
    const im = await getReadyAssetImage(src.spriteKey, src.img);
    if (!im) return null;
    const pad = (src.pad || 0) * size;
    c.drawImage(im, pad, pad, size - pad * 2, size - pad * 2);
  } else {
    return null;
  }
  return cv;
}

function makeMemoryThumbUrl(cv, px = 72) {
  const t = document.createElement('canvas');
  t.width = px;
  t.height = px;
  const tc = t.getContext('2d');
  if (!tc) return '';
  tc.drawImage(cv, 0, 0, px, px);
  const url = t.toDataURL('image/jpeg', 0.82);
  return typeof url === 'string' && url.startsWith('data:image/jpeg;base64,') ? url : '';
}

function prepareMemorySource(src) {
  if (!src) return Promise.resolve(null);
  const cached = memorySourceCache.get(src.cacheKey);
  if (cached) return cached.promise;
  const entry = { canvas: null, thumbUrl: '', ready: false, promise: null };
  entry.promise = renderMemorySourceCanvas(src)
    .then((cv) => {
      entry.canvas = cv;
      entry.ready = Boolean(cv);
      try {
        entry.thumbUrl = cv ? makeMemoryThumbUrl(cv, 96) : '';
      } catch (e) {
        entry.thumbUrl = '';
      }
      if (isAr11CardOpen('puzzle')) syncMemoryPuzzleUI();
      return cv;
    })
    .catch(() => null);
  memorySourceCache.set(src.cacheKey, entry);
  return entry.promise;
}

function makePuzzleShuffle() {
  const n = MEMORY_PUZZLE_PIECES;
  for (let attempt = 0; attempt < 60; attempt++) {
    const order = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    if (order.filter((p, i) => p !== i).length >= 5) return order;
  }
  return [1, 2, 0, 4, 5, 3, 7, 8, 6];
}

function countPuzzleMinSwaps(order) {
  const seen = new Array(order.length).fill(false);
  let cycles = 0;
  for (let i = 0; i < order.length; i++) {
    if (seen[i]) continue;
    cycles += 1;
    let j = i;
    while (!seen[j]) {
      seen[j] = true;
      j = order[j];
    }
  }
  return order.length - cycles;
}

function resetMemoryPuzzleRun() {
  puzzleRun.phase = 'idle';
  puzzleRun.order = [];
  puzzleRun.selectedSlot = -1;
  puzzleRun.moves = 0;
  puzzleRun.minSwaps = 0;
}

function selectMemorySource(sourceId) {
  const sources = getMemoryPuzzleSources();
  const src = sources.find((s) => s.id === sourceId);
  if (!src) return { ok: false, reason: 'invalid_source' };
  const changed = player.memoryPuzzle.selectedSourceId !== src.id;
  player.memoryPuzzle.selectedSourceId = src.id;
  if (puzzleRun.phase === 'done' || (puzzleRun.phase === 'play' && changed)) {
    if (puzzleRun.phase === 'play') setPlayerEmote('换一段回忆来拼吧，刚才那幅先收进手账~', 1.8, 'happy', false);
    resetMemoryPuzzleRun();
  }
  prepareMemorySource(src);
  playSfx('pat');
  savePetState();
  syncMemoryPuzzleUI();
  return { ok: true, sourceId: src.id };
}

async function startMemoryPuzzle(sourceId = '') {
  const sources = getMemoryPuzzleSources();
  const src = sourceId ? sources.find((s) => s.id === sourceId) : getSelectedMemorySource(sources);
  if (!src) return { ok: false, reason: 'no_source' };
  if (puzzleRun.preparing) return { ok: false, reason: 'preparing' };
  if (gameMode !== 'pet') switchMode('pet');
  player.memoryPuzzle.selectedSourceId = src.id;
  puzzleRun.preparing = true;
  syncMemoryPuzzleUI();
  const cv = await prepareMemorySource(src);
  puzzleRun.preparing = false;
  if (!cv) {
    syncMemoryPuzzleUI();
    return { ok: false, reason: 'source_failed' };
  }
  puzzleRun.phase = 'play';
  puzzleRun.sourceId = src.id;
  puzzleRun.sourceLabel = src.label;
  puzzleRun.sourceKind = src.kind;
  puzzleRun.cacheKey = src.cacheKey;
  puzzleRun.order = makePuzzleShuffle();
  puzzleRun.selectedSlot = -1;
  puzzleRun.moves = 0;
  puzzleRun.minSwaps = countPuzzleMinSwaps(puzzleRun.order);
  puzzleRun.lastResult = null;
  player.idleTime = 0;
  player.happyTimer = 1.2;
  playSfx('puzzle_pick');
  setPlayerEmote(`把『${src.label}』剪成 9 块小拼图啦，点两块（或拖过去）就能交换位置~`, 2.6, 'happy', false);
  savePetState();
  syncMemoryPuzzleUI();
  return { ok: true, sourceId: src.id, order: puzzleRun.order.slice(), minSwaps: puzzleRun.minSwaps };
}

function tapPuzzleSlot(slotIdx) {
  if (puzzleRun.phase !== 'play') return { ok: false, reason: 'not_playing' };
  const idx = Math.round(Number(slotIdx));
  if (!(idx >= 0 && idx < MEMORY_PUZZLE_PIECES)) return { ok: false, reason: 'invalid_slot' };
  if (puzzleRun.selectedSlot < 0) {
    puzzleRun.selectedSlot = idx;
    playSfx('puzzle_pick');
    syncMemoryPuzzleUI();
    return { ok: true, selected: idx };
  }
  if (puzzleRun.selectedSlot === idx) {
    puzzleRun.selectedSlot = -1;
    syncMemoryPuzzleUI();
    return { ok: true, selected: -1 };
  }
  return swapPuzzleSlots(puzzleRun.selectedSlot, idx);
}

function swapPuzzleSlots(a, b, refDate = new Date()) {
  if (puzzleRun.phase !== 'play') return { ok: false, reason: 'not_playing' };
  const ia = Math.round(Number(a));
  const ib = Math.round(Number(b));
  const n = MEMORY_PUZZLE_PIECES;
  if (!(ia >= 0 && ia < n && ib >= 0 && ib < n) || ia === ib) return { ok: false, reason: 'invalid_swap' };
  const order = puzzleRun.order;
  [order[ia], order[ib]] = [order[ib], order[ia]];
  puzzleRun.moves += 1;
  puzzleRun.selectedSlot = -1;
  player.memoryPuzzle.totalSwaps = (player.memoryPuzzle.totalSwaps || 0) + 1;
  player.idleTime = 0;
  const landed = [ia, ib].filter((i) => order[i] === i).length;
  petAudio.playPuzzleSnap(landed, puzzleRun.moves);
  if (order.every((p, i) => p === i)) return completeMemoryPuzzle(refDate);
  syncMemoryPuzzleUI();
  return {
    ok: true,
    swapped: [ia, ib],
    moves: puzzleRun.moves,
    correct: order.filter((p, i) => p === i).length
  };
}

function completeMemoryPuzzle(refDate = new Date()) {
  const mp = player.memoryPuzzle;
  const id = puzzleRun.sourceId;
  const label = puzzleRun.sourceLabel || '回忆';
  const moves = puzzleRun.moves;
  const perfect = moves <= puzzleRun.minSwaps;
  const prev = mp.completed[id];
  const isNewMemory = !prev;
  const dateKey = formatLocalDateKey(refDate);
  if (prev) delete mp.completed[id];
  mp.completed[id] = {
    count: (prev?.count || 0) + 1,
    bestMoves: prev && prev.bestMoves > 0 ? Math.min(prev.bestMoves, moves) : moves,
    firstDate: prev?.firstDate || dateKey,
    label
  };
  const completedKeys = Object.keys(mp.completed);
  const wallIds = new Set((mp.wall || []).map((w) => w.sourceId).concat(id));
  if (completedKeys.length > 80) {
    for (const k of completedKeys.slice(0, completedKeys.length - 80)) {
      if (!wallIds.has(k)) delete mp.completed[k];
    }
  }
  const cacheEntry = memorySourceCache.get(puzzleRun.cacheKey);
  let thumb = '';
  try {
    thumb = cacheEntry && cacheEntry.canvas ? makeMemoryThumbUrl(cacheEntry.canvas, 72) : '';
  } catch (e) {
    thumb = '';
  }
  mp.wall = (mp.wall || []).filter((w) => w.sourceId !== id);
  mp.wall.push({ sourceId: id, label, thumb, date: dateKey, moves });
  if (mp.wall.length > MEMORY_WALL_MAX) mp.wall = mp.wall.slice(-MEMORY_WALL_MAX);
  mp.totalPuzzles = (mp.totalPuzzles || 0) + 1;
  if (perfect) mp.perfectPuzzles = (mp.perfectPuzzles || 0) + 1;
  mp.lastSourceId = id;
  puzzleRun.phase = 'done';
  puzzleRun.selectedSlot = -1;

  const coinReward = (isNewMemory ? 22 : 9) + (perfect ? 6 : 0);
  const xpReward = isNewMemory ? 26 : 10;
  petAudio.playPuzzleCompleteChime(Math.max(0, ['photo', 'paint', 'week', 'art'].indexOf(puzzleRun.sourceKind)));
  petAudio.haptic('headpat');
  player.idleTime = 0;
  player.happyTimer = 2.6;
  player.cheerTimer = isNewMemory ? 2.4 : 1.4;
  spawnInteractVfx(player.x, player.y - 30, 'love', isNewMemory ? 12 : 8);
  addCoins(coinReward, player.x + 28, player.y - 46, isNewMemory ? '新回忆 ' : '拼图 ');
  addAffectionXp(xpReward, isNewMemory ? `拼好「${label}」` : `再拼「${label}」`);
  recordJournalActivity('puzzles', 1, refDate);
  const bonus = getMemoryPuzzleBonus();
  setPlayerEmote(
    isNewMemory
      ? `『${label}』拼好啦！挂上回忆墙，不同回忆 ${bonus.distinct}/${bonus.total} 段~`
      : `又拼了一遍『${label}』，${perfect ? '一次到位好厉害' : '每次看都好怀念'}~`,
    3.0,
    isNewMemory ? 'cheer' : 'happy',
    true
  );
  puzzleRun.lastResult = { sourceId: id, label, isNewMemory, perfect, moves, minSwaps: puzzleRun.minSwaps, coinReward, xpReward };
  savePetState();
  syncMemoryPuzzleUI();
  syncWeeklyJournalUI(refDate);
  if (gameMode === 'survivor') syncSurvivorSkillStrip();
  return { ok: true, completed: true, ...puzzleRun.lastResult, bonus, audio: petAudio.getAr11AudioInfo() };
}

function handlePuzzleMainAction() {
  if (puzzleRun.phase === 'done') {
    resetMemoryPuzzleRun();
    syncMemoryPuzzleUI();
    return { ok: true, phase: 'idle' };
  }
  return startMemoryPuzzle(puzzleRun.phase === 'play' ? puzzleRun.sourceId : '');
}

function getWallThumbImage(w) {
  if (!w) return null;
  const key = `${w.sourceId}|${w.thumb ? w.thumb.length : 0}`;
  if (memoryWallThumbCache.has(key)) return memoryWallThumbCache.get(key);
  let img = null;
  if (w.thumb) {
    img = new Image();
    img.src = w.thumb;
  } else {
    const art = MEMORY_FALLBACK_ARTS.find((a) => a.id === w.sourceId);
    img = art && images[art.spriteKey] ? images[art.spriteKey] : images.puzzlePieceMemory || null;
  }
  memoryWallThumbCache.set(key, img);
  return img;
}

function getWallThumbSrc(w) {
  if (w.thumb) return w.thumb;
  const art = MEMORY_FALLBACK_ARTS.find((a) => a.id === w.sourceId);
  return art ? art.img : PUZZLE_PIECE_IMG;
}

let puzzleSourceKey = '';
let puzzleBoardKey = '';
let puzzleOrderKey = '';
let puzzleWallKey = '';

function drawPuzzlePieceCanvas(canvasEl, srcCanvas, pieceIdx) {
  if (!canvasEl || !srcCanvas) return;
  const c = canvasEl.getContext('2d');
  if (!c) return;
  const g = MEMORY_PUZZLE_GRID;
  const cell = MEMORY_SOURCE_SIZE / g;
  const col = pieceIdx % g;
  const row = Math.floor(pieceIdx / g);
  c.clearRect(0, 0, canvasEl.width, canvasEl.height);
  c.drawImage(srcCanvas, col * cell, row * cell, cell, cell, 0, 0, canvasEl.width, canvasEl.height);
}

function syncMemoryPuzzleUI() {
  const mp = player.memoryPuzzle;
  if (!mp) return;
  const bonus = getMemoryPuzzleBonus();
  const cardOpen = isAr11CardOpen('puzzle');
  const wallItems = (mp.wall || []).slice(-3);
  player.memoryWallVisual = {
    count: bonus.wallCount,
    total: MEMORY_WALL_MAX,
    items: wallItems.map((w) => ({ sourceId: w.sourceId, img: getWallThumbImage(w), isLatest: w.sourceId === mp.lastSourceId }))
  };
  if (puzzleSummaryPillEl) puzzleSummaryPillEl.textContent = `回忆墙 ${bonus.wallCount}/${bonus.total}`;
  if (btnPuzzleDockEl) {
    btnPuzzleDockEl.classList.toggle('has-memory', bonus.active);
    btnPuzzleDockEl.classList.toggle('active', cardOpen);
  }
  syncKitchenMemoryPill();
  if (!cardOpen) return;

  const sources = getMemoryPuzzleSources();
  const selected = getSelectedMemorySource(sources);
  if (selected && mp.selectedSourceId !== selected.id) mp.selectedSourceId = selected.id;
  const activeId = puzzleRun.phase === 'idle' ? (selected ? selected.id : '') : puzzleRun.sourceId;
  const activeSrc = sources.find((s) => s.id === activeId) || null;
  const activeCacheKey = puzzleRun.phase === 'idle' ? (activeSrc ? activeSrc.cacheKey : '') : puzzleRun.cacheKey;
  const activeEntry = memorySourceCache.get(activeCacheKey);
  for (const s of sources) {
    if (!memorySourceCache.has(s.cacheKey)) prepareMemorySource(s);
  }
  puzzleCardEl?.classList.toggle('is-playing', puzzleRun.phase === 'play');

  if (puzzleSourceRowEl) {
    const sKey = sources
      .map((s) => {
        const e = memorySourceCache.get(s.cacheKey);
        return `${s.id}:${e && e.ready ? 1 : 0}:${mp.completed[s.id]?.count || 0}`;
      })
      .join(',');
    const fullKey = `${sKey}|${activeId}`;
    if (fullKey !== puzzleSourceKey) {
      puzzleSourceKey = fullKey;
      puzzleSourceRowEl.innerHTML = sources
        .map((s) => {
          const e = memorySourceCache.get(s.cacheKey);
          const rec = mp.completed[s.id];
          const thumbSrc = e && e.thumbUrl ? e.thumbUrl : s.kind === 'art' ? s.img : PUZZLE_PIECE_IMG;
          return `<button type="button" class="puzzle-source-chip${s.id === activeId ? ' active' : ''}${rec ? ' is-done' : ''}" data-source-id="${s.id}" data-source-kind="${s.kind}" title="${s.label}${rec ? ` · 已拼 ${rec.count} 次` : ''}">
              <img src="${thumbSrc}" alt="" class="puzzle-source-thumb" />
              <span class="puzzle-source-name">${s.label}</span>
              <em class="puzzle-source-tag">${rec ? `×${rec.count}` : MEMORY_KIND_TAGS[s.kind] || '回忆'}</em>
            </button>`;
        })
        .join('');
    }
  }

  if (puzzleBoardEl) {
    const ready = Boolean(activeEntry && activeEntry.ready && activeEntry.canvas);
    puzzleBoardEl.dataset.phase = puzzleRun.phase;
    const boardKey = `${activeCacheKey}|${ready ? 1 : 0}`;
    if (boardKey !== puzzleBoardKey) {
      puzzleBoardKey = boardKey;
      puzzleOrderKey = '';
      if (ready) {
        let html = '';
        for (let i = 0; i < MEMORY_PUZZLE_PIECES; i++) {
          html += `<button type="button" class="mp-piece" data-slot="${i}" aria-label="第 ${i + 1} 格拼图"><canvas class="mp-piece-canvas" width="90" height="90"></canvas></button>`;
        }
        puzzleBoardEl.innerHTML = html;
      } else {
        puzzleBoardEl.innerHTML = `<img src="${PUZZLE_PIECE_IMG}" alt="" class="puzzle-board-wait" /><span class="puzzle-board-wait-tag">剪裁回忆中…</span>`;
      }
    }
    if (ready) {
      const order = puzzleRun.phase === 'play' ? puzzleRun.order : Array.from({ length: MEMORY_PUZZLE_PIECES }, (_, i) => i);
      const orderKey = `${puzzleRun.phase}|${order.join(',')}`;
      const pieceEls = puzzleBoardEl.querySelectorAll('.mp-piece');
      if (orderKey !== puzzleOrderKey) {
        puzzleOrderKey = orderKey;
        pieceEls.forEach((el) => {
          const slot = Number(el.dataset.slot);
          el.dataset.piece = String(order[slot]);
          drawPuzzlePieceCanvas(el.querySelector('canvas'), activeEntry.canvas, order[slot]);
        });
      }
      pieceEls.forEach((el) => {
        const slot = Number(el.dataset.slot);
        el.classList.toggle('is-selected', puzzleRun.phase === 'play' && slot === puzzleRun.selectedSlot);
        el.classList.toggle('is-correct', puzzleRun.phase === 'play' && order[slot] === slot);
        el.disabled = puzzleRun.phase !== 'play';
      });
    }
  }

  const correct = puzzleRun.phase === 'play' ? puzzleRun.order.filter((p, i) => p === i).length : puzzleRun.phase === 'done' ? MEMORY_PUZZLE_PIECES : 0;
  if (puzzleRefImgEl) {
    const refSrc = activeEntry && activeEntry.thumbUrl ? activeEntry.thumbUrl : activeSrc && activeSrc.kind === 'art' ? activeSrc.img : PUZZLE_PIECE_IMG;
    if (puzzleRefImgEl.getAttribute('src') !== refSrc) puzzleRefImgEl.setAttribute('src', refSrc);
  }
  if (puzzleMovesEl) {
    puzzleMovesEl.textContent =
      puzzleRun.phase === 'play'
        ? `步数 ${puzzleRun.moves} · 归位 ${correct}/${MEMORY_PUZZLE_PIECES}`
        : puzzleRun.phase === 'done' && puzzleRun.lastResult
          ? `${puzzleRun.lastResult.moves} 步拼好${puzzleRun.lastResult.perfect ? ' · 一次到位' : ''}`
          : activeSrc && mp.completed[activeSrc.id]
            ? `已拼 ${mp.completed[activeSrc.id].count} 次 · 最佳 ${mp.completed[activeSrc.id].bestMoves} 步`
            : '3×3 · 9 块';
  }
  if (puzzleProgressFillEl) puzzleProgressFillEl.style.width = `${Math.round((correct / MEMORY_PUZZLE_PIECES) * 100)}%`;
  if (puzzleStepHintEl) {
    const res = puzzleRun.lastResult;
    puzzleStepHintEl.textContent = puzzleRun.preparing
      ? '正在把这段回忆剪成 9 块小拼图…'
      : puzzleRun.phase === 'play'
        ? puzzleRun.selectedSlot >= 0
          ? '再点另一块（或直接拖过去）交换位置~'
          : '点一块拼图，再点另一块交换；拖过去也可以~'
        : puzzleRun.phase === 'done' && res
          ? `『${res.label}』挂上回忆墙啦${res.isNewMemory ? ' · 新回忆' : ''}，+${res.coinReward}金~`
          : activeSrc
            ? `选好『${activeSrc.label}』，点「打乱开拼」把它剪成 9 块~`
            : '还没有回忆可拼，先去拍张合影吧~';
  }
  if (btnPuzzleMainEl) {
    btnPuzzleMainEl.disabled = Boolean(puzzleRun.preparing || (!activeSrc && puzzleRun.phase === 'idle'));
    btnPuzzleMainEl.textContent = puzzleRun.preparing
      ? '剪裁中…'
      : puzzleRun.phase === 'play'
        ? '重新打乱'
        : puzzleRun.phase === 'done'
          ? '再拼一幅'
          : '打乱开拼';
    btnPuzzleMainEl.classList.toggle('is-replay', puzzleRun.phase === 'play');
  }
  btnPuzzleGoShiftEl?.classList.toggle('hidden', !bonus.active);

  if (puzzleWallGridEl) {
    const wall = mp.wall || [];
    const wKey = `${wall.map((w) => `${w.sourceId}:${w.thumb ? w.thumb.length : 0}`).join(',')}|${mp.lastSourceId}`;
    if (wKey !== puzzleWallKey) {
      puzzleWallKey = wKey;
      let html = '';
      for (let i = 0; i < MEMORY_WALL_MAX; i++) {
        const w = wall[i];
        html += w
          ? `<button type="button" class="puzzle-wall-slot is-hung${w.sourceId === mp.lastSourceId ? ' is-latest' : ''}" data-wall-source="${w.sourceId}" title="${w.label} · ${w.date} · ${w.moves} 步">
              <img src="${getWallThumbSrc(w)}" alt="" class="puzzle-wall-thumb" />
              <em class="puzzle-wall-tag">${w.label}</em>
            </button>`
          : '<span class="puzzle-wall-slot" aria-hidden="true"></span>';
      }
      puzzleWallGridEl.innerHTML = html;
    }
  }
  if (puzzleWallSubEl) {
    puzzleWallSubEl.textContent = `回忆墙 · 挂出 ${bonus.wallCount}/${bonus.total} · 共拼 ${mp.totalPuzzles || 0} 幅 · 一次到位 ${mp.perfectPuzzles || 0}`;
  }
  if (puzzleTotalBonusEl) {
    puzzleTotalBonusEl.textContent = bonus.active
      ? `回忆拾光生效中：幸存者打工金币 +${Math.round(bonus.coinLuckPct * 100)}%（不同回忆 ${bonus.distinct}/${bonus.total}）`
      : '回忆拾光：每拼好 1 段不同回忆，幸存者打工金币 +2%（集满 6 段再 +3%）';
  }
}

// 窄屏胶囊行已排满时不为 AR-11 胶囊新开一行：用 offsetTop（不受旋转舞台变换影响）判断是否换行，放不下就收起
const kmCompactQuery = window.matchMedia ? window.matchMedia('(max-width: 920px), (max-height: 430px)') : null;
function fitKitchenMemoryPill() {
  const fitted = fitKitchenMemoryPillOnly();
  // AR-12 合并胶囊排在其后：AR-11 胶囊显隐变化后立刻复核 AR-12 胶囊是否还放得下
  fitSillCardPill();
  return fitted;
}

function fitKitchenMemoryPillOnly() {
  if (!kmPillEl) return false;
  kmPillEl.classList.remove('km-no-room');
  if (kmPillEl.classList.contains('hidden') || kmPillEl.offsetParent === null) return false;
  // 桌面宽屏胶囊离摇杆很远，允许自然换行；只有窄屏（844×390 / 旋转舞台）才严格不新开行
  if (!kmCompactQuery || !kmCompactQuery.matches) return true;
  const row = kmPillEl.parentElement;
  const others = row
    ? Array.from(row.children).filter(
        (b) =>
          b !== kmPillEl &&
          b.id !== 'sill-card-pill' &&
          b.id !== 'picnic-diary-pill' &&
          b.id !== 'pottery-aroma-pill' &&
          b.id !== 'star-rain-pill' &&
          b.id !== 'stitch-hearth-pill' &&
          !b.classList.contains('hidden') &&
          b.offsetParent !== null
      )
    : [];
  if (!others.length) return true;
  const mid = (b) => b.offsetTop + b.offsetHeight / 2;
  const lastRowMid = Math.max(...others.map(mid));
  if (mid(kmPillEl) > lastRowMid + 6) {
    kmPillEl.classList.add('km-no-room');
    return false;
  }
  return true;
}

function syncKitchenMemoryPill() {
  if (!kmPillEl) return;
  const stats = getBentoKitchenStats();
  const bonus = getMemoryPuzzleBonus();
  const showBento = stats.bagCount > 0;
  const showPuzzle = bonus.active;
  kmPillEl.classList.toggle('hidden', !(gameMode === 'pet' && (showBento || showPuzzle)));
  kmSegBentoEl?.classList.toggle('hidden', !showBento);
  kmSegPuzzleEl?.classList.toggle('hidden', !showPuzzle);
  if (kmPillBentoEl) kmPillBentoEl.textContent = String(stats.bagCount);
  if (kmPillPuzzleEl) kmPillPuzzleEl.textContent = String(bonus.wallCount);
  kmPillEl.title = `便当袋 ${stats.bagCount}/${stats.bagMax}（下个班次续航回血） · 回忆墙 ${bonus.wallCount}/${bonus.total}（打工金币 +${Math.round(bonus.coinLuckPct * 100)}%）`;
  fitKitchenMemoryPill();
}

function openAr11Card(cardEl) {
  if (!cardEl) return;
  if (gameMode !== 'pet') switchMode('pet');
  closeDrawer();
  dismissTopicCard();
  dismissWindowAmbienceCard();
  foldOrHidePomodoroCard();
  dismissTeatimeCard();
  dismissWeeklyJournalCard();
  dismissTerrariumCard();
  foldOrHideGoodnightCard();
  dismissCollageCard();
  foldOrHideCozyRadioCard();
  dismissCrochetCard();
  dismissHotCocoaCard();
  dismissPressedFlowerCard();
  dismissTelescopeCard();
  dismissAr10Cards();
  dismissAr11Cards(); dismissAr12Cards(); dismissAr13Cards(); dismissAr14Cards(); dismissAr15Cards(); dismissAr16Cards();
  dismissPolaroid();
  closeAlbumLightbox();
  cardEl.classList.remove('hidden');
}

function openBentoKitchenCard() {
  if (!bentoCardEl) return;
  openAr11Card(bentoCardEl);
  syncBentoKitchenUI();
}

function openMemoryPuzzleCard() {
  if (!puzzleCardEl) return;
  openAr11Card(puzzleCardEl);
  syncMemoryPuzzleUI();
}

function toggleBentoKitchenCard() {
  if (!bentoCardEl) return;
  if (bentoCardEl.classList.contains('hidden')) {
    openBentoKitchenCard();
    playSfx('bento_place');
  } else {
    dismissBentoKitchenCard();
    syncBentoKitchenUI();
  }
}

function toggleMemoryPuzzleCard() {
  if (!puzzleCardEl) return;
  if (puzzleCardEl.classList.contains('hidden')) {
    openMemoryPuzzleCard();
    playSfx('puzzle_pick');
  } else {
    dismissMemoryPuzzleCard();
    syncMemoryPuzzleUI();
  }
}

function handleAr11CanvasTap(pt) {
  const wallVis = player.memoryWallVisual;
  if (wallVis && wallVis.count > 0) {
    const L = getMemoryWallLayout(W, H);
    if (pt.x >= L.x - 6 && pt.x <= L.x + L.s + 6 && pt.y >= L.y - 6 && pt.y <= L.y + L.s + 16) {
      openMemoryPuzzleCard();
      playSfx('puzzle_pick');
      return true;
    }
  }
  if (player.bentoDeskVisual && player.bentoDeskVisual.bagCount > 0) {
    const a = getBentoDeskAnchor(W, H);
    if (Math.hypot(pt.x - a.x, pt.y - (a.y - 20)) < 36) {
      openBentoKitchenCard();
      playSfx('bento_place');
      return true;
    }
  }
  return false;
}

let kmPillFitTimer = 0;
function updateAr11Companions(dt) {
  if (player.bentoCheerTimer > 0) {
    player.bentoCheerTimer = Math.max(0, player.bentoCheerTimer - dt);
  }
  // 其它胶囊（番茄钟 / 下午茶等）随时出现或收起，定期复核 AR-11 胶囊是否还放得下
  kmPillFitTimer -= dt;
  if (kmPillFitTimer <= 0) {
    kmPillFitTimer = 0.5;
    fitKitchenMemoryPill();
  }
  player.isCookingBento = Boolean(
    (isAr11CardOpen('bento') && bentoRun.phase === 'assemble') || player.bentoCheerTimer > 0
  );
}

if (bentoCardEl) {
  bentoCardEl.addEventListener('pointerdown', (e) => e.stopPropagation());
}
if (puzzleCardEl) {
  puzzleCardEl.addEventListener('pointerdown', (e) => e.stopPropagation());
}

bindHudTap(btnBentoDockEl, () => {
  toggleBentoKitchenCard();
});
bindHudTap(document.getElementById('btn-bento-close'), () => {
  dismissBentoKitchenCard();
  syncBentoKitchenUI();
});

// 托盘食材：按下即拿在手里（点按流程），按住拖到便当格松手也能直接摆放
let bentoDragItem = '';
let bentoTrayTapAt = 0;
let bentoSlotTapAt = 0;
if (bentoTrayEl) {
  bentoTrayEl.addEventListener('pointerdown', (e) => {
    const chip = e.target && e.target.closest ? e.target.closest('.bento-tray-chip') : null;
    if (!chip || chip.disabled) return;
    e.preventDefault();
    e.stopPropagation();
    bentoTrayTapAt = performance.now();
    const res = pickBentoTray(chip.dataset.trayItem);
    bentoDragItem = res && res.ok && res.hand ? res.hand : '';
  });
  bentoTrayEl.addEventListener('click', (e) => {
    e.stopPropagation();
    if (performance.now() - bentoTrayTapAt < 400) return;
    const chip = e.target && e.target.closest ? e.target.closest('.bento-tray-chip') : null;
    if (chip && !chip.disabled) pickBentoTray(chip.dataset.trayItem);
  });
}
if (bentoCardEl) {
  bentoCardEl.addEventListener('pointerup', (e) => {
    if (!bentoDragItem) return;
    const dragged = bentoDragItem;
    bentoDragItem = '';
    const under = document.elementFromPoint(e.clientX, e.clientY);
    const slotEl = under && under.closest ? under.closest('.bento-slot') : null;
    if (slotEl && bentoRun.hand === dragged) {
      bentoSlotTapAt = performance.now();
      placeBentoSlot(slotEl.dataset.bentoSlot);
    }
  });
  bentoCardEl.addEventListener('pointercancel', () => {
    bentoDragItem = '';
  });
}
if (bentoBoxEl) {
  bentoBoxEl.addEventListener('pointerdown', (e) => {
    const slotEl = e.target && e.target.closest ? e.target.closest('.bento-slot') : null;
    if (!slotEl || slotEl.disabled) return;
    e.preventDefault();
    e.stopPropagation();
    bentoSlotTapAt = performance.now();
    placeBentoSlot(slotEl.dataset.bentoSlot);
  });
  bentoBoxEl.addEventListener('click', (e) => {
    e.stopPropagation();
    if (performance.now() - bentoSlotTapAt < 400) return;
    const slotEl = e.target && e.target.closest ? e.target.closest('.bento-slot') : null;
    if (slotEl && !slotEl.disabled) placeBentoSlot(slotEl.dataset.bentoSlot);
  });
}
bindHudTap(btnBentoMainEl, () => {
  if (btnBentoMainEl.disabled) return;
  handleBentoMainAction();
});
bindHudTap(btnBentoShareEl, () => {
  shareBento();
});
bindHudTap(btnBentoGoShiftEl, () => {
  dismissBentoKitchenCard();
  switchMode('survivor');
});

bindHudTap(btnPuzzleDockEl, () => {
  toggleMemoryPuzzleCard();
});
bindHudTap(document.getElementById('btn-puzzle-close'), () => {
  dismissMemoryPuzzleCard();
  syncMemoryPuzzleUI();
});
bindHudTap(puzzleSourceRowEl, (e) => {
  const chip = e.target && e.target.closest ? e.target.closest('.puzzle-source-chip') : null;
  if (chip) selectMemorySource(chip.dataset.sourceId);
});

// 拼图块：点两块交换；按住一块拖到另一块上松手同样交换（旋转舞台下用 elementFromPoint 取真实落点）
let puzzleDragFrom = -1;
let puzzleTapAt = 0;
if (puzzleBoardEl) {
  puzzleBoardEl.addEventListener('pointerdown', (e) => {
    const piece = e.target && e.target.closest ? e.target.closest('.mp-piece') : null;
    if (!piece || piece.disabled) return;
    e.preventDefault();
    e.stopPropagation();
    puzzleTapAt = performance.now();
    const slot = Number(piece.dataset.slot);
    const res = tapPuzzleSlot(slot);
    puzzleDragFrom = res && res.ok && res.selected === slot ? slot : -1;
  });
  puzzleBoardEl.addEventListener('pointerup', (e) => {
    if (puzzleDragFrom < 0) return;
    const from = puzzleDragFrom;
    puzzleDragFrom = -1;
    const under = document.elementFromPoint(e.clientX, e.clientY);
    const piece = under && under.closest ? under.closest('.mp-piece') : null;
    if (!piece || !puzzleBoardEl.contains(piece)) return;
    const to = Number(piece.dataset.slot);
    if (to !== from && puzzleRun.phase === 'play' && puzzleRun.selectedSlot === from) {
      puzzleTapAt = performance.now();
      swapPuzzleSlots(from, to);
    }
  });
  puzzleBoardEl.addEventListener('pointercancel', () => {
    puzzleDragFrom = -1;
  });
  puzzleBoardEl.addEventListener('click', (e) => {
    e.stopPropagation();
    if (performance.now() - puzzleTapAt < 400) return;
    const piece = e.target && e.target.closest ? e.target.closest('.mp-piece') : null;
    if (piece && !piece.disabled) tapPuzzleSlot(Number(piece.dataset.slot));
  });
}
bindHudTap(btnPuzzleMainEl, () => {
  if (btnPuzzleMainEl.disabled) return;
  handlePuzzleMainAction();
});
bindHudTap(btnPuzzleGoShiftEl, () => {
  dismissMemoryPuzzleCard();
  switchMode('survivor');
});
bindHudTap(puzzleWallGridEl, (e) => {
  const slotEl = e.target && e.target.closest ? e.target.closest('.puzzle-wall-slot.is-hung') : null;
  if (!slotEl) return;
  const sid = slotEl.dataset.wallSource;
  const available = getMemoryPuzzleSources().some((s) => s.id === sid);
  if (available) {
    selectMemorySource(sid);
  } else {
    const w = (player.memoryPuzzle.wall || []).find((x) => x.sourceId === sid);
    if (w) setPlayerEmote(`『${w.label}』是 ${w.date} 拼好的回忆，一直挂在墙上呢~`, 2.2, 'happy', false);
  }
});
bindHudTap(kmPillEl, (e) => {
  const segEl = e.target && e.target.closest ? e.target.closest('[data-km-seg]') : null;
  const seg = segEl ? segEl.dataset.kmSeg : getBentoKitchenStats().bagCount > 0 ? 'bento' : 'puzzle';
  if (seg === 'puzzle') openMemoryPuzzleCard();
  else openBentoKitchenCard();
});

window.addEventListener('resize', () => {
  requestAnimationFrame(() => fitKitchenMemoryPill());
});

restorePendingBento();
syncBentoKitchenUI();
syncMemoryPuzzleUI();

window.__AR11_DEBUG__ = {
  getSpecs() {
    return JSON.parse(
      JSON.stringify({
        fillings: BENTO_FILLINGS,
        sides: BENTO_SIDES,
        pairs: BENTO_SIDE_PAIRS,
        recipes: BENTO_RECIPES,
        bagMax: BENTO_BAG_MAX,
        rescueThreshold: BENTO_RESCUE_THRESHOLD,
        wallMax: MEMORY_WALL_MAX,
        pieces: MEMORY_PUZZLE_PIECES,
        fallbackArts: MEMORY_FALLBACK_ARTS
      })
    );
  },
  pickTray(item) {
    return pickBentoTray(item);
  },
  placeSlot(slotId) {
    return placeBentoSlot(slotId);
  },
  finishBento(customDateIso = '') {
    return finishBento(customDateIso ? new Date(customDateIso) : new Date());
  },
  packBento() {
    return packBento();
  },
  shareBento() {
    return shareBento();
  },
  cookRecipe(fillingId, sideA, sideB, customDateIso = '') {
    if (bentoRun.phase === 'done') return { ok: false, reason: 'bento_done' };
    pickBentoTray(`filling:${fillingId}`);
    placeBentoSlot('rice');
    pickBentoTray(`side:${sideA}`);
    placeBentoSlot('sideA');
    pickBentoTray(`side:${sideB}`);
    placeBentoSlot('sideB');
    return finishBento(customDateIso ? new Date(customDateIso) : new Date());
  },
  getBentoRun() {
    return JSON.parse(JSON.stringify(bentoRun));
  },
  getMemorySources() {
    return getMemoryPuzzleSources().map((s) => ({ id: s.id, kind: s.kind, label: s.label, cacheKey: s.cacheKey }));
  },
  async prepareSources() {
    const sources = getMemoryPuzzleSources();
    const res = await Promise.all(sources.map((s) => prepareMemorySource(s)));
    if (isAr11CardOpen('puzzle')) syncMemoryPuzzleUI();
    return sources.map((s, i) => ({ id: s.id, ready: Boolean(res[i]) }));
  },
  selectSource(sourceId) {
    return selectMemorySource(sourceId);
  },
  startPuzzle(sourceId = '') {
    return startMemoryPuzzle(sourceId);
  },
  tapSlot(idx) {
    return tapPuzzleSlot(idx);
  },
  swapSlots(a, b, customDateIso = '') {
    return swapPuzzleSlots(a, b, customDateIso ? new Date(customDateIso) : new Date());
  },
  solvePuzzle(customDateIso = '') {
    let last = null;
    for (let guard = 0; guard < 20 && puzzleRun.phase === 'play'; guard++) {
      const i = puzzleRun.order.findIndex((p, idx) => p !== idx);
      if (i < 0) break;
      const j = puzzleRun.order.indexOf(i);
      last = swapPuzzleSlots(i, j, customDateIso ? new Date(customDateIso) : new Date());
    }
    return last;
  },
  getPuzzleRun() {
    return JSON.parse(JSON.stringify(puzzleRun));
  },
  setHpForTest(value) {
    player.hp = Math.max(1, Math.min(player.maxHp, Number(value) || 1));
    return { hp: player.hp, maxHp: player.maxHp };
  },
  rescueForTest(hpValue = null) {
    if (hpValue !== null) player.hp = Math.max(1, Math.min(player.maxHp, Number(hpValue) || 1));
    const hpBefore = player.hp;
    const rescued = tryBentoRescueHeal();
    return { rescued, hpBefore, hp: player.hp, maxHp: player.maxHp, lunch: survivorRun.lunch ? { ...survivorRun.lunch } : null };
  },
  getLayouts() {
    return {
      memoryWall: getMemoryWallLayout(W, H),
      bentoDesk: getBentoDeskAnchor(W, H),
      player: { x: player.x, y: player.y },
      W,
      H
    };
  },
  placePlayerForTest(xRatio = 0.5) {
    player.x = Math.max(40, Math.min(W - 40, W * (Number(xRatio) || 0.5)));
    player.vx = 0;
    player.wanderTargetX = null;
    player.idleTime = 0;
    return { x: player.x, y: player.y };
  },
  getState(customDateIso = '') {
    const refDate = customDateIso ? new Date(customDateIso) : new Date();
    return {
      gameMode,
      coins: player.coins,
      level: player.level,
      xp: player.xp,
      hp: player.hp,
      maxHp: player.maxHp,
      hunger: player.hunger,
      emote: player.emote,
      isCookingBento: Boolean(player.isCookingBento),
      bentoKitchen: JSON.parse(JSON.stringify(player.bentoKitchen)),
      bentoRun: JSON.parse(JSON.stringify(bentoRun)),
      bentoStats: getBentoKitchenStats(),
      bentoDeskVisual: { ...player.bentoDeskVisual },
      lunchWard: getBentoLunchWard(),
      shiftLunch: survivorRun.lunch ? { ...survivorRun.lunch } : null,
      memoryPuzzle: JSON.parse(JSON.stringify(player.memoryPuzzle)),
      puzzleRun: JSON.parse(JSON.stringify(puzzleRun)),
      memoryBonus: getMemoryPuzzleBonus(),
      memoryWallVisual: {
        count: player.memoryWallVisual.count,
        items: player.memoryWallVisual.items.map((it) => ({
          sourceId: it.sourceId,
          isLatest: it.isLatest,
          loaded: Boolean(it.img && it.img.complete && it.img.naturalWidth > 0)
        }))
      },
      ar11Audio: petAudio.getAr11AudioInfo(),
      journalSummary: computeWeeklyJournalSummary(refDate),
      survivorMetrics: window.__AR5_DEBUG__.getSurvivorEffectiveMetrics(),
      openPanels: window.__AR5_DEBUG__.getState(customDateIso).openPanels
    };
  }
};

// ================= AR-12 窗台小猫访客喂食角 & 奶油手账节日手作贺卡 =================
const kittenCardEl = document.getElementById('kitten-corner-card');
const btnKittenDockEl = document.getElementById('btn-kitten-corner');
const kittenVisitBadgeEl = document.getElementById('kitten-visit-badge');
const kcSummaryPillEl = document.getElementById('kc-summary-pill');
const kcSillEl = document.getElementById('kc-sill');
const kcVisitorImgEl = document.getElementById('kc-visitor-img');
const kcBowlImgEl = document.getElementById('kc-bowl-img');
const kcHeartImgEl = document.getElementById('kc-heart-img');
const kcSillTagEl = document.getElementById('kc-sill-tag');
const kcStatusEl = document.getElementById('kc-status');
const kcAffNameEl = document.getElementById('kc-aff-name');
const kcAffFillEl = document.getElementById('kc-aff-fill');
const kcAffValEl = document.getElementById('kc-aff-val');
const kcVisitMetaEl = document.getElementById('kc-visit-meta');
const btnKittenFeedEl = document.getElementById('btn-kitten-feed');
const btnKittenPetEl = document.getElementById('btn-kitten-pet');
const btnKittenGoShiftEl = document.getElementById('btn-kitten-go-shift');
const kcCodexSubEl = document.getElementById('kc-codex-sub');
const kcCodexGridEl = document.getElementById('kc-codex-grid');
const kcWardLineEl = document.getElementById('kc-ward-line');

const greetingCardEl = document.getElementById('greeting-craft-card');
const btnGreetingDockEl = document.getElementById('btn-greeting-card');
const greetingBadgeEl = document.getElementById('greeting-holiday-badge');
const gcSummaryPillEl = document.getElementById('gc-summary-pill');
const gcOccasionIcoEl = document.getElementById('gc-occasion-ico');
const gcOccasionNameEl = document.getElementById('gc-occasion-name');
const gcOccasionSubEl = document.getElementById('gc-occasion-sub');
const gcPreviewEl = document.getElementById('gc-preview');
const gcPreviewTagEl = document.getElementById('gc-preview-tag');
const gcPreviewLineEl = document.getElementById('gc-preview-line');
const gcPreviewStickerEls = [0, 1, 2].map((i) => document.getElementById(`gc-ps-${i}`));
const gcBaseRowEl = document.getElementById('gc-base-row');
const gcStickerRowEl = document.getElementById('gc-sticker-row');
const gcStickerCountEl = document.getElementById('gc-sticker-count');
const gcLineRowEl = document.getElementById('gc-line-row');
const btnGreetingHelperEl = document.getElementById('btn-greeting-helper');
const btnGreetingSendEl = document.getElementById('btn-greeting-send');
const btnGreetingGoShiftEl = document.getElementById('btn-greeting-go-shift');
const gcAlbumSubEl = document.getElementById('gc-album-sub');
const gcAlbumGridEl = document.getElementById('gc-album-grid');
const gcBlessLineEl = document.getElementById('gc-bless-line');

const sillCardPillEl = document.getElementById('sill-card-pill');
const scSegKittenEl = document.getElementById('sc-seg-kitten');
const scSegCardEl = document.getElementById('sc-seg-card');
const scPillKittenEl = document.getElementById('sc-pill-kitten');
const scPillCardEl = document.getElementById('sc-pill-card');

const HANDMADE_CARD_IMG = './assets/handmade_card.webp?v=hd31';
const CARD_STICKER_MAX = 3;

const kittenRun = {
  lastAction: '',
  lastResult: null,
  petPulse: 0,
  eatTimer: 0,
  arriveAge: 1,
  visitKey: '',
  tickAcc: 0,
  dayKey: ''
};

const cardRun = {
  baseId: CARD_BASE_BY_ID[player.greetingCards.lastBaseId] ? player.greetingCards.lastBaseId : 'cream_grid',
  stickers: [],
  lineIdx: -1,
  viewingId: '',
  helperSeq: 0,
  lastStickerId: '',
  lastResult: null,
  lastAction: ''
};

function isAr12CardOpen(which = '') {
  const kc = document.getElementById('kitten-corner-card');
  const gc = document.getElementById('greeting-craft-card');
  const kcOpen = Boolean(kc && !kc.classList.contains('hidden'));
  const gcOpen = Boolean(gc && !gc.classList.contains('hidden'));
  if (which === 'kitten') return kcOpen;
  if (which === 'card') return gcOpen;
  return kcOpen || gcOpen;
}

function dismissKittenCornerCard() {
  document.getElementById('kitten-corner-card')?.classList.add('hidden');
  document.getElementById('btn-kitten-corner')?.classList.remove('active');
}

function dismissGreetingCraftCard() {
  document.getElementById('greeting-craft-card')?.classList.add('hidden');
  document.getElementById('btn-greeting-card')?.classList.remove('active');
}

function dismissAr12Cards() {
  dismissKittenCornerCard();
  dismissGreetingCraftCard();
}

// ---------------- 窗台小猫：真实时钟排期（不定期、每日封顶、离线不积压） ----------------
function ar12RandRange(range) {
  const [a, b] = range;
  return Math.round(a + (b - a) * ar12Random());
}

function getNextLocalMidnightMs(nowMs) {
  const d = new Date(nowMs);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0).getTime();
}

function scheduleNextKittenVisit(nowMs, kind = 'gap') {
  const kc = player.kittenCorner;
  if (kc.visitsToday >= KITTEN_VISIT_RULES.dailyCap) {
    kc.nextVisitAt = getNextLocalMidnightMs(nowMs) + ar12RandRange(KITTEN_VISIT_RULES.midnightJitterMs);
  } else {
    const range =
      kind === 'missed'
        ? KITTEN_VISIT_RULES.missedRetryMs
        : kind === 'first'
          ? KITTEN_VISIT_RULES.firstDelayMs
          : KITTEN_VISIT_RULES.gapMs;
    kc.nextVisitAt = nowMs + ar12RandRange(range);
  }
  return kc.nextVisitAt;
}

function pickVisitingKittenId() {
  const kc = player.kittenCorner;
  // 第一位访客总是贪吃的橘子；第三次来访前一定能遇见小礼服；同一只最多连续来两次
  if ((kc.totalVisits || 0) === 0) return 'ginger';
  const unmet = KITTEN_SPECS.filter((k) => !kc.kittens[k.id].met);
  if (unmet.length && kc.totalVisits >= 2) return unmet[0].id;
  let id = ar12Random() < 0.5 ? 'ginger' : 'tuxedo';
  if (kc.lastKittenId === id && kc.streak >= 2) id = id === 'ginger' ? 'tuxedo' : 'ginger';
  return id;
}

function startKittenVisit(arrivalMs, nowMs, forcedId = '') {
  const kc = player.kittenCorner;
  const id = KITTEN_BY_ID[forcedId] ? forcedId : pickVisitingKittenId();
  const spec = KITTEN_BY_ID[id];
  const k = kc.kittens[id];
  const dayKey = formatLocalDateKey(new Date(nowMs));
  const isNewMeet = !k.met;
  k.met = true;
  if (isNewMeet) k.firstMet = dayKey;
  k.lastSeen = dayKey;
  k.visits = (k.visits || 0) + 1;
  kc.totalVisits = (kc.totalVisits || 0) + 1;
  kc.visitsToday = (kc.visitsToday || 0) + 1;
  kc.streak = kc.lastKittenId === id ? (kc.streak || 0) + 1 : 1;
  kc.lastKittenId = id;
  const stay =
    ar12RandRange(KITTEN_VISIT_RULES.stayMs) +
    (k.affection >= KITTEN_TIERS[2].min ? KITTEN_VISIT_RULES.closeFriendStayBonusMs : 0);
  kc.visit = { kittenId: id, arrivedAt: arrivalMs, leavesAt: arrivalMs + stay, fed: false, pets: 0 };
  kittenRun.lastAction = 'arrived';
  kittenRun.lastResult = { kittenId: id, isNewMeet, arrivedAt: arrivalMs, leavesAt: kc.visit.leavesAt };
  if (gameMode === 'pet') {
    petAudio.playKittenMew(KITTEN_SPECS.indexOf(spec));
    // 不打断她正在说的话：只有空闲时才播报小访客
    if (!(player.emoteTimer > 0.2)) {
      setPlayerEmote(isNewMeet ? `${spec.arriveLine}（收进小猫图鉴啦）` : spec.arriveLine, 2.6, 'happy', false);
    }
  }
  return kc.visit;
}

function endKittenVisit(nowMs) {
  const kc = player.kittenCorner;
  const v = kc.visit;
  if (!v) return null;
  kc.visit = null;
  kittenRun.lastAction = 'left';
  kittenRun.lastResult = { kittenId: v.kittenId, fed: v.fed, pets: v.pets, left: true };
  scheduleNextKittenVisit(nowMs, 'gap');
  if (gameMode === 'pet' && isAr12CardOpen('kitten') && !(player.emoteTimer > 0.2)) {
    setPlayerEmote(`${KITTEN_BY_ID[v.kittenId].name}伸了个懒腰，跳下窗台回家啦，下次再来玩~`, 2.2, 'happy', false);
  }
  return v;
}

function tickKittenVisits(nowMs = ar12Clock.now()) {
  const kc = player.kittenCorner;
  if (!kc) return { changed: false };
  let changed = false;
  const dayKey = formatLocalDateKey(new Date(nowMs));
  if (kc.visitDate !== dayKey) {
    kc.visitDate = dayKey;
    kc.visitsToday = 0;
    changed = true;
  }
  // 时钟回拨：来访记录落在“未来”，或排期远超一天，统一按当前时间重新排期
  if (kc.visit && kc.visit.arrivedAt > nowMs + 60000) {
    kc.visit = null;
    scheduleNextKittenVisit(nowMs, 'missed');
    changed = true;
  }
  if (!kc.visit && kc.nextVisitAt > nowMs + 26 * 3600000) {
    scheduleNextKittenVisit(nowMs, 'gap');
    changed = true;
  }
  if (kc.visit) {
    if (nowMs >= kc.visit.leavesAt) {
      endKittenVisit(nowMs);
      changed = true;
    }
  } else if (nowMs >= kc.nextVisitAt) {
    if (kc.visitsToday >= KITTEN_VISIT_RULES.dailyCap) {
      scheduleNextKittenVisit(nowMs, 'gap');
    } else if (nowMs - kc.nextVisitAt > KITTEN_VISIT_RULES.stayMs[0]) {
      // 离开期间错过的来访不累积补发：回来后不久只安排一次新的来访
      kc.missedVisits = (kc.missedVisits || 0) + 1;
      scheduleNextKittenVisit(nowMs, 'missed');
    } else {
      // 它在你回来前不久刚到，现在还坐在窗台上
      startKittenVisit(kc.nextVisitAt, nowMs);
    }
    changed = true;
  }
  if (changed) {
    savePetState();
    syncKittenCornerUI();
  }
  return { changed };
}

function applyKittenTierReward(kittenId, before) {
  const k = player.kittenCorner.kittens[kittenId];
  let reached = null;
  for (const t of KITTEN_TIERS) {
    if (t.idx > 0 && before < t.min && k.affection >= t.min && k.tierRewarded < t.idx) {
      k.tierRewarded = t.idx;
      reached = t;
    }
  }
  if (reached) {
    const L = getWindowSillLayout(W, H, vision.simCamX || 0);
    addCoins(reached.coins, L.kittenX, L.sillY - L.kittenSize, `${KITTEN_BY_ID[kittenId].name}回礼 `);
  }
  return reached;
}

function getActiveKittenVisit(nowMs = ar12Clock.now()) {
  const kc = player.kittenCorner;
  return kc && kc.visit && KITTEN_BY_ID[kc.visit.kittenId] && nowMs < kc.visit.leavesAt ? kc.visit : null;
}

function feedKitten(nowMs = ar12Clock.now()) {
  tickKittenVisits(nowMs);
  const kc = player.kittenCorner;
  const v = getActiveKittenVisit(nowMs);
  if (!v) return { ok: false, reason: 'no_visitor' };
  if (v.fed) return { ok: false, reason: 'already_fed' };
  const spec = KITTEN_BY_ID[v.kittenId];
  const k = kc.kittens[v.kittenId];
  v.fed = true;
  // 吃饱了想在窗台多待一会儿（单次来访总时长封顶 15 分钟）
  v.leavesAt = Math.min(v.leavesAt + KITTEN_VISIT_RULES.feedStayBonusMs, v.arrivedAt + KITTEN_VISIT_RULES.maxStayMs);
  const before = k.affection;
  k.affection = Math.min(KITTEN_AFFECTION_MAX, k.affection + spec.feedGain);
  k.feeds = (k.feeds || 0) + 1;
  kc.totalFeeds = (kc.totalFeeds || 0) + 1;
  kittenRun.eatTimer = 6;
  const tierReward = applyKittenTierReward(v.kittenId, before);
  petAudio.playKittenCrunch();
  petAudio.haptic('headpat');
  player.idleTime = 0;
  player.happyTimer = 1.8;
  addAffectionXp(6, `给${spec.name}添猫粮`);
  recordJournalActivity('kittens', 1, new Date(nowMs));
  setPlayerEmote(tierReward ? `${spec.feedLine}好感升到「${tierReward.name}」啦！` : spec.feedLine, 2.4, 'happy', true);
  kittenRun.lastAction = 'fed';
  kittenRun.lastResult = { kittenId: v.kittenId, gain: k.affection - before, affection: k.affection, tierReward };
  savePetState();
  syncKittenCornerUI();
  if (gameMode === 'survivor') syncSurvivorSkillStrip();
  return {
    ok: true,
    kittenId: v.kittenId,
    gain: k.affection - before,
    affection: k.affection,
    tierReward: tierReward ? tierReward.name : '',
    audio: petAudio.getAr12AudioInfo()
  };
}

function petKitten(nowMs = ar12Clock.now()) {
  tickKittenVisits(nowMs);
  const kc = player.kittenCorner;
  const v = getActiveKittenVisit(nowMs);
  if (!v) return { ok: false, reason: 'no_visitor' };
  const spec = KITTEN_BY_ID[v.kittenId];
  if (v.pets >= KITTEN_VISIT_RULES.petsPerVisit) {
    setPlayerEmote(spec.fullLine, 1.8, 'happy', false);
    syncKittenCornerUI();
    return { ok: false, reason: 'pets_full' };
  }
  const k = kc.kittens[v.kittenId];
  v.pets += 1;
  const before = k.affection;
  k.affection = Math.min(KITTEN_AFFECTION_MAX, k.affection + spec.petGain);
  k.pets = (k.pets || 0) + 1;
  kc.totalPets = (kc.totalPets || 0) + 1;
  kittenRun.petPulse = 1;
  const tierReward = applyKittenTierReward(v.kittenId, before);
  petAudio.playKittenPurr();
  petAudio.haptic('tap');
  player.idleTime = 0;
  player.happyTimer = 1.2;
  addAffectionXp(2, `摸摸${spec.name}`);
  recordJournalActivity('kittens', 1, new Date(nowMs));
  setPlayerEmote(tierReward ? `${spec.petLine}好感升到「${tierReward.name}」啦！` : spec.petLine, 2.0, 'happy', false);
  kittenRun.lastAction = 'petted';
  kittenRun.lastResult = { kittenId: v.kittenId, gain: k.affection - before, affection: k.affection, tierReward };
  savePetState();
  syncKittenCornerUI();
  if (gameMode === 'survivor') syncSurvivorSkillStrip();
  return {
    ok: true,
    kittenId: v.kittenId,
    pets: v.pets,
    gain: k.affection - before,
    affection: k.affection,
    tierReward: tierReward ? tierReward.name : '',
    audio: petAudio.getAr12AudioInfo()
  };
}

// 打工中体力见底：猫咪九命护身把她拉回 30% 体力（每班次次数按好感合计发放）
function tryKittenLuckSave() {
  if (gameMode !== 'survivor' || player.hp > 0 || !(survivorRun.kittenSavesLeft > 0)) return false;
  const ward = getKittenLuckWard();
  const heal = Math.max(1, Math.round(player.maxHp * ward.saveHpPct));
  player.hp = heal;
  survivorRun.kittenSavesLeft -= 1;
  player.kittenCorner.totalSaves = (player.kittenCorner.totalSaves || 0) + 1;
  floatingTexts.push({
    x: player.x,
    y: player.y - 56,
    vx: 0,
    vy: -44,
    text: `猫咪护身 +${heal}`,
    color: '#f2a65a',
    scale: 1.15,
    life: 1.1
  });
  petAudio.playKittenLuckChime();
  spawnInteractVfx(player.x, player.y - 30, 'love', 8);
  syncSurvivorSkillStrip();
  savePetState();
  return true;
}

function syncKittenVisual(nowMs = ar12Clock.now()) {
  const kv = player.kittenVisual;
  const v = getActiveKittenVisit(nowMs);
  if (!v) {
    kv.active = false;
    kv.kittenId = '';
    kittenRun.visitKey = '';
    return kv;
  }
  const visitKey = `${v.kittenId}@${v.arrivedAt}`;
  if (visitKey !== kittenRun.visitKey) {
    kittenRun.visitKey = visitKey;
    kittenRun.arriveAge = 0;
  }
  const spec = KITTEN_BY_ID[v.kittenId];
  const k = player.kittenCorner.kittens[v.kittenId];
  kv.active = true;
  kv.kittenId = v.kittenId;
  kv.spriteKey = spec.spriteKey;
  kv.label = `${spec.name} · 好感${k.affection}`;
  kv.fed = Boolean(v.fed);
  kv.eating = kittenRun.eatTimer > 0;
  kv.petPulse = kittenRun.petPulse;
  kv.arriveAge = kittenRun.arriveAge;
  kv.facing = 1;
  return kv;
}

function describeKittenWait(ms) {
  const mins = Math.ceil(Math.max(0, ms) / 60000);
  if (mins <= 1) return '马上就要来串门啦';
  if (mins <= 5) return '再过几分钟就会来串门';
  return `大约 ${mins} 分钟后来串门`;
}

let kittenCodexKey = '';

function syncKittenCornerUI() {
  const kc = player.kittenCorner;
  if (!kc) return;
  const nowMs = ar12Clock.now();
  const stats = getKittenCornerStats(nowMs);
  const ward = getKittenLuckWard();
  const v = getActiveKittenVisit(nowMs);
  const cardOpen = isAr12CardOpen('kitten');
  syncKittenVisual(nowMs);

  if (kcSummaryPillEl) {
    kcSummaryPillEl.textContent = `好感 ${stats.totalAffection}/${stats.maxAffection} · 图鉴 ${stats.met}/${stats.totalKittens}`;
  }
  const spec = v ? KITTEN_BY_ID[v.kittenId] : null;
  const focusId = v ? v.kittenId : kc.lastKittenId || '';
  const focusSpec = KITTEN_BY_ID[focusId] || null;
  const focusK = focusSpec ? kc.kittens[focusId] : null;

  if (kcSillEl) kcSillEl.dataset.state = v ? (v.fed ? 'fed' : 'visiting') : 'empty';
  if (kcVisitorImgEl) {
    if (spec && kcVisitorImgEl.getAttribute('src') !== spec.img) kcVisitorImgEl.setAttribute('src', spec.img);
    kcVisitorImgEl.classList.toggle('hidden', !v);
  }
  kcBowlImgEl?.classList.toggle('hidden', !(v && v.fed));
  kcHeartImgEl?.classList.toggle('hidden', !(v && kittenRun.petPulse > 0.05));
  if (kcSillTagEl) {
    kcSillTagEl.textContent = v ? `${spec.name} · ${getKittenTier(kc.kittens[v.kittenId].affection).name}` : '窗台空着';
  }
  if (kcStatusEl) {
    if (v) {
      const mins = Math.max(1, Math.ceil((v.leavesAt - nowMs) / 60000));
      kcStatusEl.textContent = `${spec.fullName}${v.fed ? '吃饱了猫粮，正在窗台上舔爪子' : '正蹲在窗台上眼巴巴地望着你'}，大约还会待 ${mins} 分钟~`;
    } else if (stats.visitsToday >= stats.dailyCap) {
      kcStatusEl.textContent = `今天的小访客都来过啦（${stats.visitsToday}/${stats.dailyCap}），明天再来窗边等它们吧~`;
    } else {
      kcStatusEl.textContent = `窗台空着。下一位小访客${describeKittenWait(kc.nextVisitAt - nowMs)}（小猫可不一定准时哦）~`;
    }
  }
  if (kcAffNameEl) kcAffNameEl.textContent = focusSpec && focusK && focusK.met ? focusSpec.name : '好感';
  const focusAff = focusK && focusK.met ? focusK.affection : 0;
  if (kcAffFillEl) kcAffFillEl.style.width = `${Math.round((focusAff / KITTEN_AFFECTION_MAX) * 100)}%`;
  if (kcAffValEl) kcAffValEl.textContent = `${focusAff}/${KITTEN_AFFECTION_MAX} · ${getKittenTier(focusAff).name}`;
  if (kcVisitMetaEl) {
    kcVisitMetaEl.textContent = v
      ? `今日来访 ${stats.visitsToday}/${stats.dailyCap} · 猫粮 ${v.fed ? 1 : 0}/1 · 摸摸 ${v.pets}/${KITTEN_VISIT_RULES.petsPerVisit}`
      : `今日来访 ${stats.visitsToday}/${stats.dailyCap} · 累计 ${stats.totalVisits} 次`;
  }
  if (btnKittenFeedEl) {
    btnKittenFeedEl.disabled = !v || v.fed;
    btnKittenFeedEl.textContent = v && v.fed ? '猫粮添好啦' : '添一碗猫粮';
  }
  if (btnKittenPetEl) {
    btnKittenPetEl.disabled = !v || v.pets >= KITTEN_VISIT_RULES.petsPerVisit;
    btnKittenPetEl.textContent = `摸摸 ${v ? v.pets : 0}/${KITTEN_VISIT_RULES.petsPerVisit}`;
  }
  btnKittenGoShiftEl?.classList.toggle('hidden', !ward.active);

  if (kcCodexGridEl) {
    const key = KITTEN_SPECS.map((ks) => {
      const kk = kc.kittens[ks.id];
      return `${ks.id}:${kk.met ? 1 : 0}:${kk.affection}:${kk.visits}:${v && v.kittenId === ks.id ? 1 : 0}`;
    }).join('|');
    if (key !== kittenCodexKey) {
      kittenCodexKey = key;
      kcCodexGridEl.innerHTML = KITTEN_SPECS.map((ks) => {
        const kk = kc.kittens[ks.id];
        const tier = getKittenTier(kk.affection);
        return `<button type="button" class="kc-codex-slot${kk.met ? ' is-met' : ''}${v && v.kittenId === ks.id ? ' is-visiting' : ''}" data-kitten-id="${ks.id}" title="${kk.met ? `${ks.fullName} · ${ks.trait}` : '还没在窗台上遇见过的小访客'}">
            <img src="${ks.img}" alt="" class="kc-codex-ico${kk.met ? '' : ' is-silhouette'}" />
            <span class="kc-codex-meta">
              <strong class="kc-codex-name">${kk.met ? ks.fullName : '？？？ · 未相遇'}</strong>
              <span class="kc-codex-trait">${kk.met ? ks.trait : '也许哪天会从窗外探出小脑袋……'}</span>
              <span class="kc-codex-bar"><i class="kc-codex-fill" style="width:${kk.affection}%"></i></span>
              <em class="kc-codex-tag">${kk.met ? `${tier.name} · 好感 ${kk.affection}/${KITTEN_AFFECTION_MAX} · 来访 ${kk.visits} 次` : '未相遇'}</em>
            </span>
          </button>`;
      }).join('');
    }
  }
  if (kcCodexSubEl) {
    kcCodexSubEl.textContent = `小猫图鉴 ${stats.met}/${stats.totalKittens} · 来访 ${stats.totalVisits} 次 · 猫粮 ${stats.totalFeeds} 碗 · 摸摸 ${stats.totalPets} 次`;
  }
  if (kcWardLineEl) {
    kcWardLineEl.textContent = ward.active
      ? `猫咪幸运佑护生效中：幸运掉宝 +${(ward.luckyDropBonus * 100).toFixed(1)}% · ${ward.saveCharges > 0 ? `九命护身 ×${ward.saveCharges}` : '好感合计 40 解锁九命护身'}（好感 ${ward.totalAffection}/${ward.maxAffection}）`
      : '猫咪幸运佑护：好感合计 ≥10 生效，最高幸运掉宝 +10%；≥40 每班次九命护身 1 次，≥140 两次';
  }
  if (btnKittenDockEl) {
    btnKittenDockEl.classList.toggle('active', cardOpen);
    btnKittenDockEl.classList.toggle('has-visitor', Boolean(v));
  }
  kittenVisitBadgeEl?.classList.toggle('hidden', !v);
  syncSillCardPill();
}

// ---------------- 节日手作贺卡：选卡纸 -> 剪贴贴纸 -> 写一句 -> 寄进收藏册 ----------------
function getCardStickerPalette(occ) {
  const kittens = (player.kittenCorner && player.kittenCorner.kittens) || {};
  const ids = [...occ.stickers, ...CARD_UNIVERSAL_STICKERS];
  for (const k of KITTEN_SPECS) {
    if (kittens[k.id] && kittens[k.id].met) ids.push(`kitten_${k.id}`);
  }
  return [...new Set(ids)].filter((id) => CARD_STICKERS[id]).slice(0, 8);
}

function getCardLineText(occasionId, lineIdx) {
  const occ = CARD_OCCASION_BY_ID[occasionId];
  return occ && occ.lines[lineIdx] ? occ.lines[lineIdx] : '';
}

function isHolidayCardPending(info) {
  const gc = player.greetingCards;
  return Boolean(
    info && info.occasion.kind === 'holiday' && !(gc && gc.occasionYears && gc.occasionYears[`${info.occasion.id}-${info.year}`])
  );
}

function exitCardViewing() {
  if (!cardRun.viewingId) return false;
  cardRun.viewingId = '';
  return true;
}

function pickCardBase(baseId) {
  if (!CARD_BASE_BY_ID[baseId]) return { ok: false, reason: 'invalid_base' };
  exitCardViewing();
  cardRun.baseId = baseId;
  cardRun.lastAction = 'base';
  player.idleTime = 0;
  playSfx('pat');
  syncGreetingCardUI();
  return { ok: true, baseId };
}

function toggleCardSticker(stickerId) {
  const occ = resolveCardOccasion(ar12Clock.date()).occasion;
  const palette = getCardStickerPalette(occ);
  if (!palette.includes(stickerId)) return { ok: false, reason: 'invalid_sticker' };
  exitCardViewing();
  const idx = cardRun.stickers.indexOf(stickerId);
  if (idx >= 0) {
    cardRun.stickers.splice(idx, 1);
    playSfx('pat');
    syncGreetingCardUI();
    return { ok: true, removed: stickerId, stickers: cardRun.stickers.slice() };
  }
  if (cardRun.stickers.length >= CARD_STICKER_MAX) {
    setPlayerEmote('卡面已经贴了三枚啦，先揭下一枚再换新的吧~', 1.8, 'happy', false);
    syncGreetingCardUI();
    return { ok: false, reason: 'stickers_full' };
  }
  cardRun.stickers.push(stickerId);
  cardRun.lastStickerId = stickerId;
  cardRun.lastAction = 'sticker';
  player.idleTime = 0;
  player.happyTimer = 0.8;
  petAudio.playCardSnip(cardRun.stickers.length);
  setPlayerEmote(`咔嚓，剪下一枚「${CARD_STICKERS[stickerId].name}」贴上去~`, 1.6, 'happy', false);
  syncGreetingCardUI();
  return { ok: true, added: stickerId, stickers: cardRun.stickers.slice() };
}

function pickCardLine(lineIdx) {
  const occ = resolveCardOccasion(ar12Clock.date()).occasion;
  const idx = Math.round(Number(lineIdx));
  if (!(idx >= 0 && idx < occ.lines.length)) return { ok: false, reason: 'invalid_line' };
  exitCardViewing();
  cardRun.lineIdx = idx;
  cardRun.lastAction = 'line';
  player.idleTime = 0;
  playSfx('pat');
  setPlayerEmote('就写这一句吧，写得工工整整~', 1.6, 'happy', false);
  syncGreetingCardUI();
  return { ok: true, lineIdx: idx, text: occ.lines[idx] };
}

// 她来帮忙：按今天的节日 / 季节挑卡纸、剪贴（遇见过的小猫优先上卡）和一句祝福，每次换一种搭配
function helpCraftCard() {
  exitCardViewing();
  const occ = resolveCardOccasion(ar12Clock.date()).occasion;
  const palette = getCardStickerPalette(occ);
  cardRun.helperSeq += 1;
  const seq = cardRun.helperSeq;
  const kittenSticker = palette.filter((s) => s.startsWith('kitten_'))[(seq - 1) % 2] || '';
  const picks = [
    occ.stickers[(seq - 1) % occ.stickers.length],
    kittenSticker || occ.stickers[seq % occ.stickers.length],
    CARD_UNIVERSAL_STICKERS[(seq - 1) % CARD_UNIVERSAL_STICKERS.length]
  ];
  cardRun.baseId = occ.helperBase;
  cardRun.stickers = [...new Set(picks.filter((s) => palette.includes(s)))].slice(0, CARD_STICKER_MAX);
  cardRun.lineIdx = (seq - 1) % occ.lines.length;
  cardRun.lastStickerId = cardRun.stickers[cardRun.stickers.length - 1] || '';
  cardRun.lastAction = 'helper';
  player.idleTime = 0;
  player.happyTimer = 1.4;
  petAudio.playCardSnip(seq);
  setPlayerEmote(`我来帮忙搭配：${CARD_BASE_BY_ID[cardRun.baseId].name}卡纸 + ${cardRun.stickers.length} 枚剪贴~`, 2.4, 'happy', false);
  syncGreetingCardUI();
  return { ok: true, baseId: cardRun.baseId, stickers: cardRun.stickers.slice(), lineIdx: cardRun.lineIdx };
}

function getCardDraftMissing() {
  const missing = [];
  if (!CARD_BASE_BY_ID[cardRun.baseId]) missing.push('卡纸');
  if (!cardRun.stickers.length) missing.push('贴纸');
  if (cardRun.lineIdx < 0) missing.push('祝福');
  return missing;
}

function sendGreetingCard(nowMs = ar12Clock.now()) {
  if (cardRun.viewingId) return { ok: false, reason: 'viewing' };
  const refDate = new Date(nowMs);
  const info = resolveCardOccasion(refDate);
  const occ = info.occasion;
  const palette = getCardStickerPalette(occ);
  const stickers = cardRun.stickers.filter((s) => palette.includes(s)).slice(0, CARD_STICKER_MAX);
  if (!CARD_BASE_BY_ID[cardRun.baseId]) return { ok: false, reason: 'no_base' };
  if (!stickers.length) return { ok: false, reason: 'no_sticker' };
  if (!(cardRun.lineIdx >= 0 && cardRun.lineIdx < occ.lines.length)) return { ok: false, reason: 'no_line' };
  const gc = player.greetingCards;
  gc.cardSeq = (gc.cardSeq || 0) + 1;
  const card = {
    id: `c${gc.cardSeq}`,
    occasionId: occ.id,
    year: info.year,
    baseId: cardRun.baseId,
    stickers,
    lineIdx: cardRun.lineIdx,
    date: info.dateKey
  };
  gc.album.push(card);
  if (gc.album.length > CARD_ALBUM_MAX) gc.album = gc.album.slice(-CARD_ALBUM_MAX);
  const occKey = `${occ.id}-${info.year}`;
  const isFirstThisOccasion = !gc.occasionYears[occKey];
  const isNewOccasionKind = !gc.collected[occ.id];
  gc.occasionYears[occKey] = true;
  const yearKeys = Object.keys(gc.occasionYears);
  if (yearKeys.length > 40) {
    for (const k of yearKeys.slice(0, yearKeys.length - 40)) delete gc.occasionYears[k];
  }
  gc.collected[occ.id] = (gc.collected[occ.id] || 0) + 1;
  gc.totalCards = (gc.totalCards || 0) + 1;
  gc.lastBaseId = cardRun.baseId;
  if (gc.rewardDate !== info.dateKey) {
    gc.rewardDate = info.dateKey;
    gc.rewardCount = 0;
  }
  const rewarded = gc.rewardCount < CARD_DAILY_REWARDS;
  if (rewarded) gc.rewardCount += 1;
  const coinReward = rewarded ? (isFirstThisOccasion ? 18 : 6) : 0;
  const xpReward = isFirstThisOccasion ? 20 : rewarded ? 8 : 3;

  petAudio.playCardSendChime(CARD_OCCASIONS.indexOf(occ));
  petAudio.haptic('headpat');
  player.idleTime = 0;
  player.happyTimer = 2.4;
  player.cheerTimer = isFirstThisOccasion ? 2.2 : 1.2;
  player.cardCheerTimer = 4;
  spawnInteractVfx(player.x, player.y - 30, 'love', isFirstThisOccasion ? 11 : 7);
  if (coinReward > 0) {
    addCoins(coinReward, player.x + 26, player.y - 46, isFirstThisOccasion ? `${occ.short}贺卡 ` : '贺卡 ');
  }
  addAffectionXp(xpReward, `寄出${occ.name}贺卡`);
  recordJournalActivity('cards', 1, refDate);
  const bless = getGreetingCardBlessing();
  setPlayerEmote(
    isNewOccasionKind
      ? `『${occ.name}』贺卡寄出啦！收藏册里又多了一种节日，${bless.occasions}/${bless.totalOccasions}~`
      : `${occ.short}贺卡寄出啦，收藏册 ${bless.albumCount} 张~`,
    3.0,
    isFirstThisOccasion ? 'cheer' : 'happy',
    true
  );
  cardRun.lastResult = {
    cardId: card.id,
    occasionId: occ.id,
    isFirstThisOccasion,
    isNewOccasionKind,
    coinReward,
    xpReward,
    rewarded
  };
  cardRun.lastAction = 'sent';
  cardRun.viewingId = card.id;
  cardRun.stickers = [];
  cardRun.lineIdx = -1;
  savePetState();
  syncGreetingCardUI();
  syncWeeklyJournalUI(refDate);
  if (gameMode === 'survivor') syncSurvivorSkillStrip();
  return { ok: true, card: { ...card, stickers: card.stickers.slice() }, ...cardRun.lastResult, blessing: bless, audio: petAudio.getAr12AudioInfo() };
}

function viewAlbumCard(cardId) {
  const card = (player.greetingCards.album || []).find((c) => c.id === cardId);
  if (!card) return { ok: false, reason: 'invalid_card' };
  cardRun.viewingId = card.id;
  cardRun.lastAction = 'view';
  playSfx('pat');
  const occ = CARD_OCCASION_BY_ID[card.occasionId];
  setPlayerEmote(`这是 ${card.date.slice(5).replace('-', '/')} 一起做的『${occ.name}』贺卡~`, 2.2, 'happy', false);
  syncGreetingCardUI();
  return { ok: true, cardId: card.id };
}

function handleGreetingSendAction() {
  if (cardRun.viewingId) {
    exitCardViewing();
    playSfx('pat');
    syncGreetingCardUI();
    return { ok: true, phase: 'draft' };
  }
  return sendGreetingCard();
}

let cardStickerRowKey = '';
let cardLineRowKey = '';
let cardAlbumKey = '';

function syncGreetingCardUI() {
  const gc = player.greetingCards;
  if (!gc) return;
  const info = resolveCardOccasion(ar12Clock.date());
  const occ = info.occasion;
  const bless = getGreetingCardBlessing();
  const cardOpen = isAr12CardOpen('card');
  const palette = getCardStickerPalette(occ);
  cardRun.stickers = cardRun.stickers.filter((s) => palette.includes(s));
  if (cardRun.lineIdx >= occ.lines.length) cardRun.lineIdx = -1;
  const viewing = cardRun.viewingId ? gc.album.find((c) => c.id === cardRun.viewingId) : null;
  if (cardRun.viewingId && !viewing) cardRun.viewingId = '';
  const pending = isHolidayCardPending(info);
  const sentThisOccasion = Boolean(gc.occasionYears[`${occ.id}-${info.year}`]);

  player.sillCardVisual = { count: gc.album.length };
  player.isCraftingCard = Boolean(cardOpen || player.cardCheerTimer > 0);
  const lastSticker = cardRun.stickers[cardRun.stickers.length - 1] || (viewing ? viewing.stickers[0] : '');
  player.craftStickerKey = lastSticker && CARD_STICKERS[lastSticker] ? CARD_STICKERS[lastSticker].spriteKey : '';

  if (gcSummaryPillEl) gcSummaryPillEl.textContent = `收藏 ${bless.albumCount} · 节日 ${bless.occasions}/${bless.totalOccasions}`;
  if (gcOccasionIcoEl && gcOccasionIcoEl.getAttribute('src') !== occ.icon) gcOccasionIcoEl.setAttribute('src', occ.icon);
  if (gcOccasionNameEl) gcOccasionNameEl.textContent = occ.name;
  if (gcOccasionSubEl) {
    const dateTxt = info.dateKey.slice(5).replace('-', '/');
    if (occ.kind === 'holiday') {
      const when = info.diffDays < 0 ? `还有 ${-info.diffDays} 天` : info.diffDays === 0 ? '就是今天' : '刚刚过去';
      gcOccasionSubEl.textContent = `${dateTxt} · 节日限定 · ${when}${sentThisOccasion ? ' · 已寄出' : ''}`;
    } else {
      gcOccasionSubEl.textContent = `${dateTxt} · 季节贺卡${sentThisOccasion ? ' · 本季已寄' : ''}`;
    }
  }
  if (greetingCardEl) greetingCardEl.dataset.occasionKind = occ.kind;

  const show = viewing
    ? {
        baseId: viewing.baseId,
        stickers: viewing.stickers,
        line: getCardLineText(viewing.occasionId, viewing.lineIdx),
        tag: `${CARD_OCCASION_BY_ID[viewing.occasionId].name} · ${viewing.date.slice(5).replace('-', '/')}`
      }
    : {
        baseId: cardRun.baseId,
        stickers: cardRun.stickers,
        line: cardRun.lineIdx >= 0 ? occ.lines[cardRun.lineIdx] : '',
        tag: occ.name
      };
  if (gcPreviewEl) {
    gcPreviewEl.dataset.base = show.baseId;
    gcPreviewEl.classList.toggle('is-viewing', Boolean(viewing));
  }
  gcPreviewStickerEls.forEach((el, i) => {
    if (!el) return;
    const sid = show.stickers[i];
    if (sid && CARD_STICKERS[sid]) {
      if (el.getAttribute('src') !== CARD_STICKERS[sid].img) el.setAttribute('src', CARD_STICKERS[sid].img);
      el.classList.remove('hidden');
      el.dataset.stickerId = sid;
    } else {
      el.classList.add('hidden');
      el.dataset.stickerId = '';
    }
  });
  if (gcPreviewTagEl) gcPreviewTagEl.textContent = show.tag;
  if (gcPreviewLineEl) {
    gcPreviewLineEl.textContent = show.line || '选一句想说的话~';
    gcPreviewLineEl.classList.toggle('is-empty', !show.line);
  }

  gcBaseRowEl?.querySelectorAll('.gc-base-chip').forEach((chip) => {
    chip.classList.toggle('active', !viewing && chip.dataset.baseId === cardRun.baseId);
  });

  if (gcStickerRowEl) {
    const sKey = palette.join(',');
    if (sKey !== cardStickerRowKey) {
      cardStickerRowKey = sKey;
      gcStickerRowEl.innerHTML = palette
        .map(
          (id) => `<button type="button" class="gc-sticker-chip" data-sticker-id="${id}" title="${CARD_STICKERS[id].name}">
            <img src="${CARD_STICKERS[id].img}" alt="" class="gc-sticker-ico" />
            <span class="gc-sticker-name">${CARD_STICKERS[id].name}</span>
          </button>`
        )
        .join('');
    }
    const full = cardRun.stickers.length >= CARD_STICKER_MAX;
    gcStickerRowEl.querySelectorAll('.gc-sticker-chip').forEach((chip) => {
      const on = !viewing && cardRun.stickers.includes(chip.dataset.stickerId);
      chip.classList.toggle('active', on);
      chip.classList.toggle('is-full', !viewing && full && !on);
    });
  }
  if (gcStickerCountEl) gcStickerCountEl.textContent = `${viewing ? 0 : cardRun.stickers.length}/${CARD_STICKER_MAX}`;

  if (gcLineRowEl) {
    const lKey = `${occ.id}`;
    if (lKey !== cardLineRowKey) {
      cardLineRowKey = lKey;
      gcLineRowEl.innerHTML = occ.lines
        .map((line, i) => `<button type="button" class="gc-line-chip" data-line-idx="${i}" title="${line}">${line}</button>`)
        .join('');
    }
    gcLineRowEl.querySelectorAll('.gc-line-chip').forEach((chip) => {
      chip.classList.toggle('active', !viewing && Number(chip.dataset.lineIdx) === cardRun.lineIdx);
    });
  }

  if (btnGreetingSendEl) {
    const missing = getCardDraftMissing();
    if (viewing) {
      btnGreetingSendEl.disabled = false;
      btnGreetingSendEl.textContent = '再做一张新的';
      btnGreetingSendEl.classList.add('is-again');
      btnGreetingSendEl.classList.remove('is-ready');
    } else {
      btnGreetingSendEl.disabled = missing.length > 0;
      btnGreetingSendEl.textContent = missing.length ? `还差${missing.join('、')}` : '剪贴完成 · 寄出';
      btnGreetingSendEl.classList.toggle('is-ready', !missing.length);
      btnGreetingSendEl.classList.remove('is-again');
    }
  }
  btnGreetingGoShiftEl?.classList.toggle('hidden', !bless.active);

  if (gcAlbumGridEl) {
    const recent = gc.album.slice(-8);
    const aKey = `${recent.map((c) => `${c.id}:${c.baseId}:${c.stickers[0]}`).join(',')}|${cardRun.viewingId}`;
    if (aKey !== cardAlbumKey) {
      cardAlbumKey = aKey;
      gcAlbumGridEl.innerHTML = recent.length
        ? recent
            .map((c) => {
              const o = CARD_OCCASION_BY_ID[c.occasionId];
              const st = CARD_STICKERS[c.stickers[0]];
              return `<button type="button" class="gc-album-card${c.id === cardRun.viewingId ? ' current' : ''}" data-card-id="${c.id}" data-base="${c.baseId}" title="${o.name} · ${c.date} · ${getCardLineText(c.occasionId, c.lineIdx)}">
                <img src="${HANDMADE_CARD_IMG}" alt="" class="gc-album-art" />
                ${st ? `<img src="${st.img}" alt="" class="gc-album-sticker" />` : ''}
                <em class="gc-album-tag">${o.short}</em>
              </button>`;
            })
            .join('')
        : '<span class="gc-album-empty">还没有寄出的贺卡，和她一起做第一张吧~</span>';
    }
  }
  if (gcAlbumSubEl) {
    gcAlbumSubEl.textContent = `贺卡收藏册 · 共 ${bless.totalCards} 张 · 节日 ${bless.occasions}/${bless.totalOccasions} · 今日奖励 ${gc.rewardDate === info.dateKey ? gc.rewardCount : 0}/${CARD_DAILY_REWARDS}`;
  }
  if (gcBlessLineEl) {
    gcBlessLineEl.textContent = bless.active
      ? `贺卡心意生效中：幸存者打工班次经验 +${(bless.shiftXpBonusPct * 100).toFixed(1)}%（已收集 ${bless.occasions}/${bless.totalOccasions} 种）`
      : '贺卡心意：每收集 1 种节日 / 季节贺卡，幸存者打工班次经验 +1.5%（8 种集齐 +12%）';
  }
  if (btnGreetingDockEl) {
    btnGreetingDockEl.classList.toggle('active', cardOpen);
    btnGreetingDockEl.classList.toggle('has-holiday', pending);
  }
  greetingBadgeEl?.classList.toggle('hidden', !pending);
  syncSillCardPill();
}

// ---------------- AR-12 合并紧凑胶囊：小猫来访 / 幸运佑护 + 贺卡收藏，窄屏放不下就收起 ----------------
function syncSillCardPill() {
  if (!sillCardPillEl) return;
  const nowMs = ar12Clock.now();
  const stats = getKittenCornerStats(nowMs);
  const ward = getKittenLuckWard();
  const bless = getGreetingCardBlessing();
  const info = resolveCardOccasion(new Date(nowMs));
  const pending = isHolidayCardPending(info);
  const showKitten = stats.visiting || ward.active;
  const showCard = bless.albumCount > 0 || pending;
  sillCardPillEl.classList.toggle('hidden', !(gameMode === 'pet' && (showKitten || showCard)));
  sillCardPillEl.classList.toggle('has-visitor', stats.visiting);
  scSegKittenEl?.classList.toggle('hidden', !showKitten);
  scSegCardEl?.classList.toggle('hidden', !showCard);
  const kittenFirst = stats.visiting || (!pending && showKitten) || !showCard;
  scSegKittenEl?.classList.toggle('is-priority', kittenFirst);
  scSegCardEl?.classList.toggle('is-priority', !kittenFirst);
  if (scPillKittenEl) scPillKittenEl.textContent = stats.visiting ? '来访' : String(stats.totalAffection);
  if (scPillCardEl) scPillCardEl.textContent = pending && bless.albumCount === 0 ? '节' : String(bless.albumCount);
  sillCardPillEl.title = `${stats.visiting ? `${KITTEN_BY_ID[stats.visitorId].name}正在窗台串门` : `小猫好感 ${stats.totalAffection}/${stats.maxAffection}`}（幸运掉宝 +${(ward.luckyDropBonus * 100).toFixed(1)}%） · 贺卡收藏 ${bless.albumCount} 张（班次经验 +${(bless.shiftXpBonusPct * 100).toFixed(1)}%）`;
  fitSillCardPill();
}

// 与 AR-11 同一条规则：窄屏胶囊行已排满时不为 AR-12 胶囊新开一行（offsetTop 不受旋转舞台变换影响），放不下就收起
// 只读 DOM，AR-11 区段初始化时调用也不会触发 TDZ
function fitSillCardPill() {
  const fitted = fitSillCardPillOnly();
  // AR-13 合并胶囊排在其后：AR-12 胶囊显隐 / 收起变化后立刻复核 AR-13 胶囊是否还放得下
  fitPicnicDiaryPill();
  return fitted;
}

function fitSillCardPillOnly() {
  const pill = document.getElementById('sill-card-pill');
  if (!pill) return false;
  pill.classList.remove('sc-no-room', 'sc-solo');
  if (pill.classList.contains('hidden') || pill.offsetParent === null) return false;
  const compact = window.matchMedia ? window.matchMedia('(max-width: 920px), (max-height: 430px)') : null;
  if (!compact || !compact.matches) return true;
  const row = pill.parentElement;
  const others = row
    ? Array.from(row.children).filter(
        (b) =>
          b !== pill &&
          b.id !== 'picnic-diary-pill' &&
          b.id !== 'pottery-aroma-pill' &&
          b.id !== 'star-rain-pill' &&
          b.id !== 'stitch-hearth-pill' &&
          !b.classList.contains('hidden') &&
          b.offsetParent !== null
      )
    : [];
  if (!others.length) return true;
  const mid = (b) => b.offsetTop + b.offsetHeight / 2;
  const lastRowMid = Math.max(...others.map(mid));
  if (mid(pill) <= lastRowMid + 6) return true;
  // 两段都显示放不下时，先只留优先的一段（来访中的小猫 / 待寄的节日贺卡）再试一次，仍放不下才整颗收起
  const shownSegs = Array.from(pill.querySelectorAll('.sc-seg')).filter((s) => !s.classList.contains('hidden'));
  if (shownSegs.length > 1) {
    pill.classList.add('sc-solo');
    if (mid(pill) <= lastRowMid + 6) return true;
    pill.classList.remove('sc-solo');
  }
  pill.classList.add('sc-no-room');
  return false;
}

function openAr12Card(cardEl) {
  if (!cardEl) return;
  if (gameMode !== 'pet') switchMode('pet');
  closeDrawer();
  dismissTopicCard();
  dismissWindowAmbienceCard();
  foldOrHidePomodoroCard();
  dismissTeatimeCard();
  dismissWeeklyJournalCard();
  dismissTerrariumCard();
  foldOrHideGoodnightCard();
  dismissCollageCard();
  foldOrHideCozyRadioCard();
  dismissCrochetCard();
  dismissHotCocoaCard();
  dismissPressedFlowerCard();
  dismissTelescopeCard();
  dismissAr10Cards();
  dismissAr11Cards();
  dismissAr12Cards(); dismissAr13Cards(); dismissAr14Cards(); dismissAr15Cards(); dismissAr16Cards();
  dismissPolaroid();
  closeAlbumLightbox();
  cardEl.classList.remove('hidden');
}

function openKittenCornerCard() {
  if (!kittenCardEl) return;
  openAr12Card(kittenCardEl);
  tickKittenVisits();
  syncKittenCornerUI();
}

function openGreetingCraftCard() {
  if (!greetingCardEl) return;
  openAr12Card(greetingCardEl);
  syncGreetingCardUI();
}

function toggleKittenCornerCard() {
  if (!kittenCardEl) return;
  if (kittenCardEl.classList.contains('hidden')) {
    openKittenCornerCard();
    const v = getActiveKittenVisit();
    if (v) petAudio.playKittenMew(KITTEN_SPECS.findIndex((k) => k.id === v.kittenId));
    else playSfx('pat');
  } else {
    dismissKittenCornerCard();
    syncKittenCornerUI();
  }
}

function toggleGreetingCraftCard() {
  if (!greetingCardEl) return;
  if (greetingCardEl.classList.contains('hidden')) {
    openGreetingCraftCard();
    petAudio.playCardSnip(0);
  } else {
    dismissGreetingCraftCard();
    syncGreetingCardUI();
  }
}

function handleAr12CanvasTap(pt) {
  const L = getWindowSillLayout(W, H, vision.simCamX || 0);
  const kv = player.kittenVisual;
  if (kv && kv.active && Math.hypot(pt.x - L.kittenHit.x, pt.y - L.kittenHit.y) < L.kittenHit.r) {
    // 点窗台上的小猫：打开喂食角并顺手摸一摸
    openKittenCornerCard();
    petKitten();
    return true;
  }
  if (player.sillCardVisual && player.sillCardVisual.count > 0 && Math.hypot(pt.x - L.cardHit.x, pt.y - L.cardHit.y) < L.cardHit.r) {
    openGreetingCraftCard();
    const last = player.greetingCards.album[player.greetingCards.album.length - 1];
    if (last) viewAlbumCard(last.id);
    return true;
  }
  return false;
}

let scPillFitTimer = 0;
function updateAr12Companions(dt) {
  kittenRun.arriveAge = Math.min(5, kittenRun.arriveAge + dt);
  kittenRun.petPulse = Math.max(0, kittenRun.petPulse - dt * 1.3);
  kittenRun.eatTimer = Math.max(0, kittenRun.eatTimer - dt);
  if (player.cardCheerTimer > 0) player.cardCheerTimer = Math.max(0, player.cardCheerTimer - dt);
  kittenRun.tickAcc -= dt;
  if (kittenRun.tickAcc <= 0) {
    kittenRun.tickAcc = 1;
    const nowMs = ar12Clock.now();
    const res = tickKittenVisits(nowMs);
    const dayKey = formatLocalDateKey(new Date(nowMs));
    if (dayKey !== kittenRun.dayKey) {
      kittenRun.dayKey = dayKey;
      syncGreetingCardUI();
    }
    // 打开喂食角时每秒刷新一次“还会待几分钟”
    if (!res.changed && isAr12CardOpen('kitten')) syncKittenCornerUI();
  }
  syncKittenVisual();
  if (kcHeartImgEl && isAr12CardOpen('kitten')) {
    kcHeartImgEl.classList.toggle('hidden', !(player.kittenVisual.active && kittenRun.petPulse > 0.05));
  }
  scPillFitTimer -= dt;
  if (scPillFitTimer <= 0) {
    scPillFitTimer = 0.5;
    fitSillCardPill();
  }
  player.isCraftingCard = Boolean(isAr12CardOpen('card') || player.cardCheerTimer > 0);
}

if (kittenCardEl) {
  kittenCardEl.addEventListener('pointerdown', (e) => e.stopPropagation());
}
if (greetingCardEl) {
  greetingCardEl.addEventListener('pointerdown', (e) => e.stopPropagation());
}

bindHudTap(btnKittenDockEl, () => {
  toggleKittenCornerCard();
});
bindHudTap(document.getElementById('btn-kitten-close'), () => {
  dismissKittenCornerCard();
  syncKittenCornerUI();
});
bindHudTap(btnKittenFeedEl, () => {
  if (btnKittenFeedEl.disabled) return;
  feedKitten();
});
bindHudTap(btnKittenPetEl, () => {
  if (btnKittenPetEl.disabled) return;
  petKitten();
});
bindHudTap(kcSillEl, () => {
  if (getActiveKittenVisit()) petKitten();
});
bindHudTap(btnKittenGoShiftEl, () => {
  dismissKittenCornerCard();
  switchMode('survivor');
});
bindHudTap(kcCodexGridEl, (e) => {
  const slot = e.target && e.target.closest ? e.target.closest('.kc-codex-slot') : null;
  if (!slot) return;
  const spec = KITTEN_BY_ID[slot.dataset.kittenId];
  const k = spec ? player.kittenCorner.kittens[spec.id] : null;
  if (!spec || !k) return;
  playSfx('pat');
  setPlayerEmote(
    k.met ? `${spec.fullName}：${spec.trait}（${getKittenTier(k.affection).name}）~` : '这只小访客还没来过窗台，多来窗边看看吧~',
    2.2,
    'happy',
    false
  );
});

bindHudTap(btnGreetingDockEl, () => {
  toggleGreetingCraftCard();
});
bindHudTap(document.getElementById('btn-greeting-close'), () => {
  dismissGreetingCraftCard();
  syncGreetingCardUI();
});
bindHudTap(gcBaseRowEl, (e) => {
  const chip = e.target && e.target.closest ? e.target.closest('.gc-base-chip') : null;
  if (chip) pickCardBase(chip.dataset.baseId);
});
bindHudTap(gcStickerRowEl, (e) => {
  const chip = e.target && e.target.closest ? e.target.closest('.gc-sticker-chip') : null;
  if (chip) toggleCardSticker(chip.dataset.stickerId);
});
bindHudTap(gcLineRowEl, (e) => {
  const chip = e.target && e.target.closest ? e.target.closest('.gc-line-chip') : null;
  if (chip) pickCardLine(Number(chip.dataset.lineIdx));
});
bindHudTap(btnGreetingHelperEl, () => {
  helpCraftCard();
});
bindHudTap(btnGreetingSendEl, () => {
  if (btnGreetingSendEl.disabled) return;
  handleGreetingSendAction();
});
bindHudTap(btnGreetingGoShiftEl, () => {
  dismissGreetingCraftCard();
  switchMode('survivor');
});
bindHudTap(gcAlbumGridEl, (e) => {
  const cardBtn = e.target && e.target.closest ? e.target.closest('.gc-album-card') : null;
  if (cardBtn) viewAlbumCard(cardBtn.dataset.cardId);
});
bindHudTap(sillCardPillEl, (e) => {
  const segEl = e.target && e.target.closest ? e.target.closest('[data-sc-seg]') : null;
  const seg = segEl ? segEl.dataset.scSeg : getKittenCornerStats().visiting ? 'kitten' : 'card';
  if (seg === 'card') openGreetingCraftCard();
  else openKittenCornerCard();
});

window.addEventListener('resize', () => {
  requestAnimationFrame(() => fitSillCardPill());
});

tickKittenVisits();
syncKittenCornerUI();
syncGreetingCardUI();

window.__AR12_DEBUG__ = {
  getSpecs() {
    return JSON.parse(
      JSON.stringify({
        kittens: KITTEN_SPECS,
        tiers: KITTEN_TIERS,
        visitRules: KITTEN_VISIT_RULES,
        affectionMax: KITTEN_AFFECTION_MAX,
        bases: CARD_BASES,
        stickers: CARD_STICKERS,
        universalStickers: CARD_UNIVERSAL_STICKERS,
        occasions: CARD_OCCASIONS,
        albumMax: CARD_ALBUM_MAX,
        dailyRewards: CARD_DAILY_REWARDS,
        stickerMax: CARD_STICKER_MAX
      })
    );
  },
  // 可注入时钟：传毫秒或本地时间字符串固定“现在”；advanceClock 前进后立即按新时间排期一次
  setClock(value) {
    const ms = typeof value === 'number' ? value : new Date(value).getTime();
    if (!Number.isFinite(ms)) return { ok: false, reason: 'invalid_clock' };
    ar12Clock.fixedMs = ms;
    ar12Clock.offsetMs = 0;
    tickKittenVisits(ms);
    syncKittenCornerUI();
    syncGreetingCardUI();
    syncPicnicBasketUI();
    syncDiaryBookUI();
    return { ok: true, now: ms };
  },
  advanceClock(ms) {
    const step = Math.max(0, Number(ms) || 0);
    if (ar12Clock.fixedMs !== null) ar12Clock.fixedMs += step;
    else ar12Clock.offsetMs += step;
    const res = tickKittenVisits(ar12Clock.now());
    syncKittenCornerUI();
    syncGreetingCardUI();
    syncPicnicBasketUI();
    syncDiaryBookUI();
    return { ok: true, now: ar12Clock.now(), changed: res.changed };
  },
  useRealClock() {
    ar12Clock.fixedMs = null;
    ar12Clock.offsetMs = 0;
    tickKittenVisits();
    syncKittenCornerUI();
    syncGreetingCardUI();
    syncPicnicBasketUI();
    syncDiaryBookUI();
    return { ok: true, now: ar12Clock.now() };
  },
  setSeed(seed) {
    ar12RandomFn = makeAr12SeededRandom(seed);
    return { ok: true };
  },
  useRealRandom() {
    ar12RandomFn = Math.random;
    return { ok: true };
  },
  tick() {
    return tickKittenVisits(ar12Clock.now());
  },
  scheduleVisitIn(ms) {
    const kc = player.kittenCorner;
    if (kc.visit) endKittenVisit(ar12Clock.now());
    kc.nextVisitAt = ar12Clock.now() + Math.max(0, Number(ms) || 0);
    savePetState();
    syncKittenCornerUI();
    return { ok: true, nextVisitAt: kc.nextVisitAt };
  },
  forceVisit(kittenId = '') {
    const nowMs = ar12Clock.now();
    const kc = player.kittenCorner;
    if (kc.visit) endKittenVisit(nowMs);
    const v = startKittenVisit(nowMs, nowMs, kittenId);
    savePetState();
    syncKittenCornerUI();
    return { ok: true, visit: { ...v } };
  },
  leaveNow() {
    const v = endKittenVisit(ar12Clock.now());
    savePetState();
    syncKittenCornerUI();
    return { ok: Boolean(v) };
  },
  feed() {
    return feedKitten();
  },
  pet() {
    return petKitten();
  },
  setAffectionForTest(kittenId, value) {
    const k = player.kittenCorner.kittens[kittenId];
    if (!k) return { ok: false };
    k.met = true;
    if (!k.firstMet) k.firstMet = formatLocalDateKey(ar12Clock.date());
    if (!k.lastSeen) k.lastSeen = k.firstMet;
    k.visits = Math.max(1, k.visits || 0);
    k.affection = Math.max(0, Math.min(KITTEN_AFFECTION_MAX, Math.round(Number(value) || 0)));
    k.tierRewarded = Math.max(k.tierRewarded || 0, getKittenTier(k.affection).idx);
    savePetState();
    syncKittenCornerUI();
    return { ok: true, affection: k.affection };
  },
  luckSaveForTest() {
    player.hp = 0;
    const saved = tryKittenLuckSave();
    if (!saved) player.hp = Math.max(1, player.hp);
    return { saved, hp: player.hp, maxHp: player.maxHp, left: survivorRun.kittenSavesLeft, max: survivorRun.kittenSavesMax };
  },
  setHpForTest(value) {
    player.hp = Math.max(1, Math.min(player.maxHp, Number(value) || 1));
    return { hp: player.hp };
  },
  occasionFor(value) {
    const d = typeof value === 'number' ? new Date(value) : new Date(value);
    const info = resolveCardOccasion(d);
    return { id: info.occasion.id, kind: info.occasion.kind, name: info.occasion.name, year: info.year, diffDays: info.diffDays, dateKey: info.dateKey };
  },
  getPalette() {
    return getCardStickerPalette(resolveCardOccasion(ar12Clock.date()).occasion);
  },
  pickBase(id) {
    return pickCardBase(id);
  },
  toggleSticker(id) {
    return toggleCardSticker(id);
  },
  pickLine(idx) {
    return pickCardLine(idx);
  },
  helper() {
    return helpCraftCard();
  },
  send() {
    return sendGreetingCard();
  },
  viewCard(id) {
    return viewAlbumCard(id);
  },
  getCardRun() {
    return JSON.parse(JSON.stringify(cardRun));
  },
  getLayouts() {
    return {
      sill: getWindowSillLayout(W, H, vision.simCamX || 0),
      camX: vision.simCamX || 0,
      player: { x: player.x, y: player.y },
      W,
      H
    };
  },
  placePlayerForTest(xRatio = 0.3) {
    player.x = Math.max(40, Math.min(W - 40, W * (Number(xRatio) || 0.3)));
    player.vx = 0;
    player.wanderTargetX = null;
    player.idleTime = 0;
    return { x: player.x, y: player.y };
  },
  getState(customDateIso = '') {
    const nowMs = ar12Clock.now();
    const refDate = customDateIso ? new Date(customDateIso) : new Date(nowMs);
    const info = resolveCardOccasion(new Date(nowMs));
    return {
      gameMode,
      now: nowMs,
      clockFixed: ar12Clock.fixedMs !== null,
      coins: player.coins,
      level: player.level,
      xp: player.xp,
      hp: player.hp,
      maxHp: player.maxHp,
      emote: player.emote,
      kittenCorner: JSON.parse(JSON.stringify(player.kittenCorner)),
      kittenStats: getKittenCornerStats(nowMs),
      kittenWard: getKittenLuckWard(),
      kittenVisual: { ...player.kittenVisual },
      kittenRun: JSON.parse(JSON.stringify(kittenRun)),
      greetingCards: JSON.parse(JSON.stringify(player.greetingCards)),
      cardBlessing: getGreetingCardBlessing(),
      cardRun: JSON.parse(JSON.stringify(cardRun)),
      occasion: { id: info.occasion.id, kind: info.occasion.kind, name: info.occasion.name, year: info.year, diffDays: info.diffDays },
      holidayPending: isHolidayCardPending(info),
      sillCardVisual: { ...player.sillCardVisual },
      isCraftingCard: Boolean(player.isCraftingCard),
      shiftSaves: { left: survivorRun.kittenSavesLeft || 0, max: survivorRun.kittenSavesMax || 0 },
      ar12Audio: petAudio.getAr12AudioInfo(),
      journalSummary: computeWeeklyJournalSummary(refDate),
      survivorMetrics: window.__AR5_DEBUG__.getSurvivorEffectiveMetrics(),
      openPanels: window.__AR5_DEBUG__.getState(customDateIso).openPanels
    };
  }
};

// ================= AR-13 奶油手账周末野餐篮 & DeepSeek 娘手写日记本 =================
const picnicCardEl = document.getElementById('picnic-basket-card');
const btnPicnicDockEl = document.getElementById('btn-picnic-basket');
const picnicWeekendBadgeEl = document.getElementById('picnic-weekend-badge');
const pcSummaryPillEl = document.getElementById('pc-summary-pill');
const pcDayRowEl = document.getElementById('pc-day-row');
const pcDayNameEl = document.getElementById('pc-day-name');
const pcDaySubEl = document.getElementById('pc-day-sub');
const pcPrepStampsEl = document.getElementById('pc-prep-stamps');
const pcBlanketEl = document.getElementById('pc-blanket');
const pcBlanketTagEl = document.getElementById('pc-blanket-tag');
const pcFoodSlotEls = [0, 1, 2].map((i) => (pcBlanketEl ? pcBlanketEl.querySelector(`[data-food-slot="${i}"]`) : null));
const pcFoodCountEl = document.getElementById('pc-food-count');
const pcFoodRowEl = document.getElementById('pc-food-row');
const pcSpotRowEl = document.getElementById('pc-spot-row');
const btnPicnicHelperEl = document.getElementById('btn-picnic-helper');
const btnPicnicMainEl = document.getElementById('btn-picnic-main');
const btnPicnicGoShiftEl = document.getElementById('btn-picnic-go-shift');
const pcLogSubEl = document.getElementById('pc-log-sub');
const pcLogGridEl = document.getElementById('pc-log-grid');
const pcWardLineEl = document.getElementById('pc-ward-line');

const diaryCardEl = document.getElementById('diary-book-card');
const btnDiaryDockEl = document.getElementById('btn-diary-book');
const diaryNewBadgeEl = document.getElementById('diary-new-badge');
const dySummaryPillEl = document.getElementById('dy-summary-pill');
const dyPageEl = document.getElementById('dy-page');
const dyPageDateEl = document.getElementById('dy-page-date');
const dyPageMoodEl = document.getElementById('dy-page-mood');
const dyPageLinesEl = document.getElementById('dy-page-lines');
const dyPageSignEl = document.getElementById('dy-page-sign');
const dyPageNoEl = document.getElementById('dy-page-no');
const dyPageStickerEls = [0, 1, 2].map((i) => document.getElementById(`dy-ps-${i}`));
const btnDiaryPrevEl = document.getElementById('btn-diary-prev');
const btnDiaryNextEl = document.getElementById('btn-diary-next');
const dyStickerCountEl = document.getElementById('dy-sticker-count');
const dyRewardTagEl = document.getElementById('dy-reward-tag');
const dyStickerRowEl = document.getElementById('dy-sticker-row');
const btnDiaryTodayEl = document.getElementById('btn-diary-today');
const btnDiaryHelperEl = document.getElementById('btn-diary-helper');
const btnDiaryJournalEl = document.getElementById('btn-diary-journal');
const dyFooterLineEl = document.getElementById('dy-footer-line');

const pdPillEl = document.getElementById('picnic-diary-pill');
const pdSegPicnicEl = document.getElementById('pd-seg-picnic');
const pdSegDiaryEl = document.getElementById('pd-seg-diary');
const pdPillPicnicEl = document.getElementById('pd-pill-picnic');
const pdPillDiaryEl = document.getElementById('pd-pill-diary');

const PICNIC_HELPER_COMBOS = [
  ['sandwich', 'onigiri', 'oolong'],
  ['sandwich', 'macaron', 'souffle'],
  ['onigiri', 'pudding', 'oolong']
];

const picnicRun = {
  phase: 'plan',
  foods: player.picnicBasket.plan ? player.picnicBasket.plan.foods.slice() : [],
  spotId: player.picnicBasket.plan ? player.picnicBasket.plan.spotId : '',
  shared: [],
  outingDate: '',
  outingAntic: 0,
  helperSeq: 0,
  lastAction: '',
  lastResult: null,
  dayKey: '',
  tickAcc: 0
};

const diaryRun = {
  viewKey: '',
  helperSeq: 0,
  lastStickerId: '',
  lastAction: '',
  lastResult: null,
  writtenFlash: 0
};

function isAr13CardOpen(which = '') {
  const pc = document.getElementById('picnic-basket-card');
  const dy = document.getElementById('diary-book-card');
  const pcOpen = Boolean(pc && !pc.classList.contains('hidden'));
  const dyOpen = Boolean(dy && !dy.classList.contains('hidden'));
  if (which === 'picnic') return pcOpen;
  if (which === 'diary') return dyOpen;
  return pcOpen || dyOpen;
}

function dismissPicnicBasketCard() {
  document.getElementById('picnic-basket-card')?.classList.add('hidden');
  document.getElementById('btn-picnic-basket')?.classList.remove('active');
}

function dismissDiaryBookCard() {
  document.getElementById('diary-book-card')?.classList.add('hidden');
  document.getElementById('btn-diary-book')?.classList.remove('active');
}

// 只碰 DOM：其它卡片在模块初始化期间调用也不会触发 TDZ
function dismissAr13Cards() {
  dismissPicnicBasketCard();
  dismissDiaryBookCard();
}

function parseLocalDateKey(dateKey) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateKey || ''));
  if (!m) return ar13Clock.date();
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0);
}

// ---------------- 周末野餐篮：工作日装篮子攒期待章，周末挑点心 + 选地点出发野餐 ----------------
function getPicnicDraftMissing() {
  const missing = [];
  if (picnicRun.foods.length < PICNIC_RULES.minFoods) missing.push('点心');
  if (!PICNIC_SPOT_BY_ID[picnicRun.spotId]) missing.push('地点');
  return missing;
}

function isPicnicPlanSameAsDraft() {
  const plan = player.picnicBasket.plan;
  return Boolean(
    plan &&
      plan.spotId === picnicRun.spotId &&
      plan.foods.length === picnicRun.foods.length &&
      plan.foods.every((f) => picnicRun.foods.includes(f))
  );
}

function togglePicnicFood(foodId) {
  if (picnicRun.phase !== 'plan') return { ok: false, reason: 'outing' };
  const spec = PICNIC_FOOD_BY_ID[foodId];
  if (!spec) return { ok: false, reason: 'invalid_food' };
  const idx = picnicRun.foods.indexOf(foodId);
  if (idx >= 0) {
    picnicRun.foods.splice(idx, 1);
    picnicRun.lastAction = 'food_remove';
    playSfx('pat');
    syncPicnicBasketUI();
    return { ok: true, removed: foodId, foods: picnicRun.foods.slice() };
  }
  if (picnicRun.foods.length >= PICNIC_RULES.maxFoods) {
    setPlayerEmote('篮子里只装得下三样点心啦，先拿出来一样再换吧~', 1.8, 'happy', false);
    syncPicnicBasketUI();
    return { ok: false, reason: 'basket_full' };
  }
  picnicRun.foods.push(foodId);
  picnicRun.lastAction = 'food_add';
  player.idleTime = 0;
  player.happyTimer = 0.8;
  petAudio.playPicnicPack(picnicRun.foods.length);
  setPlayerEmote(spec.pickLine, 1.8, 'happy', false);
  syncPicnicBasketUI();
  return { ok: true, added: foodId, foods: picnicRun.foods.slice() };
}

function pickPicnicSpot(spotId) {
  if (picnicRun.phase !== 'plan') return { ok: false, reason: 'outing' };
  const spot = PICNIC_SPOT_BY_ID[spotId];
  if (!spot) return { ok: false, reason: 'invalid_spot' };
  picnicRun.spotId = spotId;
  picnicRun.lastAction = 'spot';
  player.idleTime = 0;
  playSfx('pat');
  setPlayerEmote(`${spot.pickLine}（${spot.wardName}：${describePicnicWard(spotId, getPicnicAnticipation())}）`, 2.0, 'happy', false);
  syncPicnicBasketUI();
  return { ok: true, spotId };
}

// 她来搭配：第一次按季节挑地点（春樱草坪 / 夏湖畔 / 秋冬晒太阳的小坡），之后每次换一种点心组合和地点
function helpPicnicPlan() {
  if (picnicRun.phase !== 'plan') return { ok: false, reason: 'outing' };
  const m = ar13Clock.date().getMonth() + 1;
  picnicRun.helperSeq += 1;
  const seq = picnicRun.helperSeq;
  const seasonSpot = m >= 3 && m <= 5 ? 'sakura_lawn' : m >= 6 && m <= 8 ? 'lakeside_willow' : 'ginkgo_hill';
  const spotOrder = [seasonSpot, ...PICNIC_SPOTS.map((s) => s.id).filter((id) => id !== seasonSpot)];
  picnicRun.spotId = spotOrder[(seq - 1) % spotOrder.length];
  picnicRun.foods = PICNIC_HELPER_COMBOS[(seq - 1) % PICNIC_HELPER_COMBOS.length].slice();
  picnicRun.lastAction = 'helper';
  player.idleTime = 0;
  player.happyTimer = 1.2;
  petAudio.playPicnicPack(seq);
  const spot = PICNIC_SPOT_BY_ID[picnicRun.spotId];
  setPlayerEmote(
    `我来搭配：${picnicRun.foods.map((f) => PICNIC_FOOD_BY_ID[f].short).join('、')}，去${spot.name}！`,
    2.4,
    'happy',
    false
  );
  syncPicnicBasketUI();
  return { ok: true, foods: picnicRun.foods.slice(), spotId: picnicRun.spotId };
}

function packPicnicBasket(nowMs = ar13Clock.now()) {
  if (picnicRun.phase !== 'plan') return { ok: false, reason: 'outing' };
  const missing = getPicnicDraftMissing();
  if (missing.length) return { ok: false, reason: 'incomplete', missing };
  const d = new Date(nowMs);
  const todayKey = formatLocalDateKey(d);
  const pb = player.picnicBasket;
  const weekendKey = getPicnicWeekendKey(d);
  if (pb.prep.weekendKey !== weekendKey) pb.prep = { weekendKey, days: [], used: false };
  const weekday = !isPicnicWeekend(d);
  let stamped = false;
  if (weekday && !pb.prep.used && !pb.prep.days.includes(todayKey) && pb.prep.days.length < PICNIC_RULES.prepMax) {
    pb.prep.days.push(todayKey);
    pb.prep.days.sort();
    stamped = true;
  }
  pb.plan = { foods: picnicRun.foods.slice(), spotId: picnicRun.spotId, packedDate: todayKey };
  const spot = PICNIC_SPOT_BY_ID[picnicRun.spotId];
  const daysUntil = getDaysUntilPicnicWeekend(d);
  const anticipation = getPicnicAnticipation(d);
  player.idleTime = 0;
  player.happyTimer = 1.4;
  petAudio.playPicnicPack(4);
  petAudio.haptic('tap');
  if (stamped) {
    pb.totalPreps = (pb.totalPreps || 0) + 1;
    addAffectionXp(PICNIC_RULES.prepXp, '一起装野餐篮');
    recordJournalActivity('picnicPreps', 1, d);
  }
  setPlayerEmote(
    weekday
      ? stamped
        ? `野餐篮装好啦！盖下期待章 ${anticipation}/${PICNIC_RULES.prepMax}，再过 ${daysUntil} 天就去${spot.name}~`
        : `野餐篮里的点心换好啦，还有 ${daysUntil} 天到周末，再等等~`
      : `野餐篮装好啦，今天就能出发去${spot.name}！`,
    2.4,
    'happy',
    stamped
  );
  picnicRun.lastAction = 'packed';
  picnicRun.lastResult = { stamped, anticipation, daysUntil, weekday };
  savePetState();
  syncPicnicBasketUI();
  return {
    ok: true,
    stamped,
    anticipation,
    daysUntil,
    weekday,
    plan: { foods: pb.plan.foods.slice(), spotId: pb.plan.spotId, packedDate: pb.plan.packedDate },
    audio: petAudio.getAr13AudioInfo()
  };
}

function startPicnicOuting(nowMs = ar13Clock.now()) {
  if (picnicRun.phase === 'outing') return { ok: false, reason: 'already_out' };
  const d = new Date(nowMs);
  if (!isPicnicWeekend(d)) {
    const daysUntil = getDaysUntilPicnicWeekend(d);
    setPlayerEmote(
      `今天是${AR13_WEEKDAY_NAMES[d.getDay()]}，野餐要等到周末哦~ 先把篮子装好，还有 ${daysUntil} 天！`,
      2.4,
      'happy',
      false
    );
    syncPicnicBasketUI();
    return { ok: false, reason: 'weekday', daysUntil };
  }
  const stats = getPicnicStats(d);
  if (stats.doneToday) return { ok: false, reason: 'done_today' };
  const missing = getPicnicDraftMissing();
  if (missing.length) return { ok: false, reason: 'incomplete', missing };
  const spot = PICNIC_SPOT_BY_ID[picnicRun.spotId];
  picnicRun.phase = 'outing';
  picnicRun.shared = picnicRun.foods.map(() => false);
  picnicRun.outingDate = stats.todayKey;
  picnicRun.outingAntic = stats.anticipation;
  picnicRun.lastAction = 'outing';
  player.idleTime = 0;
  player.happyTimer = 1.6;
  player.wanderTargetX = null;
  player.vx = 0;
  petAudio.playPicnicSpread();
  petAudio.haptic('headpat');
  spawnInteractVfx(player.x, player.y - 20, 'sparkle', 6);
  setPlayerEmote(`${spot.spreadLine}一起分着吃吧~`, 2.6, 'happy', true);
  syncPicnicBasketUI();
  return { ok: true, spotId: spot.id, foods: picnicRun.foods.slice(), anticipation: stats.anticipation, audio: petAudio.getAr13AudioInfo() };
}

function sharePicnicFood(slot = -1) {
  if (picnicRun.phase !== 'outing') return { ok: false, reason: 'not_outing' };
  let idx = Math.round(Number(slot));
  if (!(idx >= 0 && idx < picnicRun.foods.length)) idx = picnicRun.shared.findIndex((x) => !x);
  if (idx < 0) return { ok: false, reason: 'all_shared' };
  if (picnicRun.shared[idx]) return { ok: false, reason: 'already_shared' };
  picnicRun.shared[idx] = true;
  const spec = PICNIC_FOOD_BY_ID[picnicRun.foods[idx]];
  player.idleTime = 0;
  player.happyTimer = 1.2;
  player.eatingTimer = Math.max(player.eatingTimer || 0, 0.9);
  petAudio.playPicnicShare(idx);
  spawnInteractVfx(player.x, player.y - 26, 'love', 5);
  picnicRun.lastAction = 'shared';
  const sharedCount = picnicRun.shared.filter(Boolean).length;
  if (sharedCount >= picnicRun.foods.length) {
    const fin = finishPicnic();
    return { ok: true, foodId: spec.id, slot: idx, shared: sharedCount, finished: true, result: fin };
  }
  setPlayerEmote(spec.eatLine, 2.0, 'eat', false);
  syncPicnicBasketUI();
  return { ok: true, foodId: spec.id, slot: idx, shared: sharedCount, finished: false };
}

function finishPicnic() {
  const pb = player.picnicBasket;
  const spot = PICNIC_SPOT_BY_ID[picnicRun.spotId];
  if (!spot) return null;
  const dateKey = picnicRun.outingDate || formatLocalDateKey(ar13Clock.date());
  const outingDate = parseLocalDateKey(dateKey);
  const foods = picnicRun.foods.slice();
  const antic = Math.max(0, Math.min(PICNIC_RULES.prepMax, Math.round(picnicRun.outingAntic || 0)));
  // 期待章只在本周末的第一次野餐兑现（周日再去一次就是单纯的好心情）
  const wk = getPicnicWeekendKey(outingDate);
  if (pb.prep.weekendKey === wk) pb.prep.used = true;
  const isNewSpot = !(pb.spotsVisited[spot.id] > 0);
  pb.spotsVisited[spot.id] = (pb.spotsVisited[spot.id] || 0) + 1;
  for (const f of foods) pb.foodsTried[f] = (pb.foodsTried[f] || 0) + 1;
  pb.seq = (pb.seq || 0) + 1;
  const entry = { id: `p${pb.seq}`, date: dateKey, spotId: spot.id, foods, antic };
  pb.log.push(entry);
  if (pb.log.length > PICNIC_RULES.logMax) pb.log = pb.log.slice(-PICNIC_RULES.logMax);
  if (!pb.doneDates.includes(dateKey)) pb.doneDates.push(dateKey);
  pb.doneDates = pb.doneDates.sort().slice(-8);
  pb.totalPicnics = (pb.totalPicnics || 0) + 1;
  pb.wardSpotId = spot.id;
  pb.wardAntic = antic;
  pb.wardCharges = Math.min(PICNIC_RULES.wardMaxCharges, (pb.wardCharges || 0) + PICNIC_RULES.wardShiftsPerPicnic);
  pb.plan = null;

  const fullness = foods.reduce((acc, f) => acc + (PICNIC_FOOD_BY_ID[f] ? PICNIC_FOOD_BY_ID[f].fullness : 0), 0);
  player.hunger = Math.min(player.maxHunger, (Number(player.hunger) || 0) + fullness);
  player.happyTimer = 2.8;
  player.cheerTimer = 2.4;
  player.picnicCheerTimer = 5;
  const coinReward =
    PICNIC_RULES.baseCoins + antic * PICNIC_RULES.coinsPerAnticipation + (isNewSpot ? PICNIC_RULES.newSpotCoins : 0);
  const xpReward = PICNIC_RULES.baseXp + foods.length * PICNIC_RULES.xpPerFood + antic * PICNIC_RULES.xpPerAnticipation;
  petAudio.playPicnicFinish(PICNIC_SPOTS.indexOf(spot));
  petAudio.haptic('headpat');
  spawnInteractVfx(player.x, player.y - 30, 'love', 12);
  addCoins(coinReward, player.x + 26, player.y - 46, `${spot.short}野餐 `);
  addAffectionXp(xpReward, `周末野餐 +${xpReward} 亲密`);
  recordJournalActivity('picnics', 1, outingDate);
  setPlayerEmote(
    `野餐完成！${spot.name}的风、点心和你都好棒~ 接下来 ${pb.wardCharges} 个打工班次有『${spot.wardName}』佑护！`,
    3.0,
    'cheer',
    true
  );
  picnicRun.phase = 'plan';
  picnicRun.lastAction = 'finished';
  picnicRun.lastResult = {
    id: entry.id,
    date: dateKey,
    spotId: spot.id,
    foods,
    anticipation: antic,
    coinReward,
    xpReward,
    isNewSpot,
    fullness,
    wardCharges: pb.wardCharges,
    ward: getPicnicWardValues(spot.id, antic)
  };
  savePetState();
  syncPicnicBasketUI();
  syncDiaryBookUI();
  if (gameMode === 'survivor') syncSurvivorSkillStrip();
  return { ...picnicRun.lastResult, audio: petAudio.getAr13AudioInfo() };
}

function getPicnicMainState(d = ar13Clock.date()) {
  if (picnicRun.phase === 'outing') {
    const next = picnicRun.shared.findIndex((x) => !x);
    const spec = PICNIC_FOOD_BY_ID[picnicRun.foods[next]];
    return {
      mode: 'share',
      disabled: !spec,
      label: spec ? `分享「${spec.short}」 ${picnicRun.shared.filter(Boolean).length}/${picnicRun.foods.length}` : '分享完啦'
    };
  }
  const stats = getPicnicStats(d);
  const missing = getPicnicDraftMissing();
  if (stats.isWeekend) {
    if (stats.doneToday) return { mode: 'done', disabled: true, label: '今天的野餐完成啦' };
    if (missing.length) return { mode: 'incomplete', disabled: true, label: `还差${missing.join('、')}` };
    return { mode: 'start', disabled: false, label: '铺开野餐垫 · 出发' };
  }
  if (missing.length) return { mode: 'incomplete', disabled: true, label: `还差${missing.join('、')}` };
  if (stats.preppedToday && isPicnicPlanSameAsDraft()) {
    return { mode: 'packed', disabled: true, label: `篮子装好啦 · ${stats.daysUntil} 天后出发` };
  }
  const canStamp = !stats.preppedToday && !stats.anticipationUsed && stats.prepDays < PICNIC_RULES.prepMax;
  return { mode: 'pack', disabled: false, label: canStamp ? '装进野餐篮 · 盖期待章' : '装进野餐篮' };
}

function handlePicnicMainAction() {
  const st = getPicnicMainState();
  if (st.disabled) return { ok: false, reason: st.mode };
  if (st.mode === 'share') return sharePicnicFood();
  if (st.mode === 'start') return startPicnicOuting();
  if (st.mode === 'pack') return packPicnicBasket();
  return { ok: false, reason: st.mode };
}

// 进入幸存者班次时消耗 1 次野餐好心情：按野餐地点生效（金币 / 体力再生 / 攻速），同一班次内重开不再消耗
function openPicnicWardForShift(prevMode) {
  if (prevMode === 'survivor' && survivorRun.picnic) return survivorRun.picnic;
  survivorRun.picnic = null;
  const pb = player.picnicBasket;
  if (!pb || !(pb.wardCharges > 0) || !PICNIC_SPOT_BY_ID[pb.wardSpotId]) return null;
  const v = getPicnicWardValues(pb.wardSpotId, pb.wardAntic);
  pb.wardCharges -= 1;
  pb.totalWardShifts = (pb.totalWardShifts || 0) + 1;
  survivorRun.picnic = {
    spotId: pb.wardSpotId,
    antic: pb.wardAntic,
    coinPct: v.coinPct,
    regen: v.regen,
    hastePct: v.hastePct
  };
  savePetState();
  return survivorRun.picnic;
}

let pcFoodRowKey = null;
let pcSpotRowKey = null;
let pcLogKey = null;

function syncPicnicBasketUI() {
  const pb = player.picnicBasket;
  if (!pb) return;
  const d = ar13Clock.date();
  const stats = getPicnicStats(d);
  const cardOpen = isAr13CardOpen('picnic');
  const outing = picnicRun.phase === 'outing';
  const todayLog = stats.doneToday ? [...pb.log].reverse().find((e) => e.date === stats.todayKey) : null;
  const showDone = !outing && Boolean(todayLog);
  const shownFoods = outing ? picnicRun.foods : showDone ? todayLog.foods : picnicRun.foods;
  const shownSpotId = showDone ? todayLog.spotId : picnicRun.spotId;
  const shownSpot = PICNIC_SPOT_BY_ID[shownSpotId] || null;

  if (pcSummaryPillEl) pcSummaryPillEl.textContent = `野餐 ${stats.totalPicnics} 次 · 地点 ${stats.spotsVisited}/${stats.totalSpots}`;
  if (pcDayRowEl) pcDayRowEl.dataset.dayKind = stats.isWeekend ? 'weekend' : 'weekday';
  if (pcDayNameEl) pcDayNameEl.textContent = `${AR13_WEEKDAY_NAMES[stats.weekday]} · ${stats.isWeekend ? '周末野餐日' : '工作日'}`;
  if (pcDaySubEl) {
    pcDaySubEl.textContent = stats.isWeekend
      ? outing
        ? '野餐中 · 点心一起分着吃'
        : stats.doneToday
          ? stats.weekday === 6
            ? '今天野餐完成啦 · 明天还能再去一次'
            : '今天野餐完成啦 · 下个周末见'
          : `今天可以出发 · 期待章 ×${stats.anticipation}`
      : `离周末还有 ${stats.daysUntil} 天 · ${stats.preppedToday ? '今天的篮子装好啦' : '先装篮子攒期待章'}`;
  }
  if (pcPrepStampsEl) {
    pcPrepStampsEl.querySelectorAll('.pc-prep-dot').forEach((dot, i) => dot.classList.toggle('filled', i < stats.prepDays));
    pcPrepStampsEl.classList.toggle('is-used', stats.anticipationUsed);
    pcPrepStampsEl.title = stats.anticipationUsed
      ? `本周末的 ${stats.prepDays} 枚期待章已经在野餐时兑现啦`
      : `期待章 ${stats.prepDays}/${PICNIC_RULES.prepMax}：工作日每天装一次篮子盖 1 枚，周末野餐奖励与佑护每枚 +5%`;
  }

  if (pcBlanketEl) {
    pcBlanketEl.dataset.phase = outing ? 'outing' : showDone ? 'done' : 'plan';
    pcBlanketEl.dataset.spot = shownSpotId || '';
  }
  pcFoodSlotEls.forEach((el, i) => {
    if (!el) return;
    const fid = shownFoods[i];
    const spec = PICNIC_FOOD_BY_ID[fid];
    if (spec) {
      const img = el.querySelector('img');
      if (img && img.getAttribute('src') !== spec.img) img.setAttribute('src', spec.img);
      el.classList.remove('hidden');
      el.dataset.foodId = fid;
      const shared = outing ? Boolean(picnicRun.shared[i]) : showDone;
      el.classList.toggle('is-shared', shared);
      el.classList.toggle('is-ready', outing && !shared);
      el.disabled = !outing || shared;
      el.title = outing ? (shared ? `${spec.name} · 已分享` : `点一下和她分享「${spec.name}」`) : spec.name;
    } else {
      el.classList.add('hidden');
      el.dataset.foodId = '';
    }
  });
  if (pcBlanketTagEl) {
    pcBlanketTagEl.textContent = shownSpot
      ? `${shownSpot.name}${outing ? ' · 野餐中' : showDone ? ' · 已野餐' : ''}`
      : '还没选地点';
  }

  if (pcFoodRowEl) {
    const fKey = PICNIC_FOODS.map((f) => f.id).join(',');
    if (fKey !== pcFoodRowKey) {
      pcFoodRowKey = fKey;
      pcFoodRowEl.innerHTML = PICNIC_FOODS.map(
        (f) => `<button type="button" class="pc-food-chip" data-food-id="${f.id}" title="${f.name}">
            <img src="${f.img}" alt="" class="pc-food-ico" />
            <span class="pc-food-name">${f.short}</span>
          </button>`
      ).join('');
    }
    const full = picnicRun.foods.length >= PICNIC_RULES.maxFoods;
    pcFoodRowEl.querySelectorAll('.pc-food-chip').forEach((chip) => {
      const on = picnicRun.foods.includes(chip.dataset.foodId);
      chip.classList.toggle('active', on);
      chip.classList.toggle('is-full', full && !on);
      chip.disabled = outing;
    });
  }
  if (pcFoodCountEl) pcFoodCountEl.textContent = `${picnicRun.foods.length}/${PICNIC_RULES.maxFoods}`;

  if (pcSpotRowEl) {
    const sKey = PICNIC_SPOTS.map((s) => s.id).join(',');
    if (sKey !== pcSpotRowKey) {
      pcSpotRowKey = sKey;
      pcSpotRowEl.innerHTML = PICNIC_SPOTS.map(
        (s) => `<button type="button" class="pc-spot-chip" data-spot-id="${s.id}">
            <img src="${s.icon}" alt="" class="pc-spot-ico" />
            <span class="pc-spot-meta">
              <span class="pc-spot-name">${s.name}</span>
              <em class="pc-spot-ward"></em>
            </span>
          </button>`
      ).join('');
    }
    pcSpotRowEl.querySelectorAll('.pc-spot-chip').forEach((chip) => {
      const sid = chip.dataset.spotId;
      chip.classList.toggle('active', picnicRun.spotId === sid);
      chip.classList.toggle('is-visited', Boolean(pb.spotsVisited[sid]));
      chip.disabled = outing;
      chip.title = `${PICNIC_SPOT_BY_ID[sid].name} · ${PICNIC_SPOT_BY_ID[sid].wardName}：${describePicnicWard(sid, stats.anticipation)}`;
      const wardEl = chip.querySelector('.pc-spot-ward');
      if (wardEl) wardEl.textContent = describePicnicWardShort(sid, stats.anticipation);
    });
  }

  const mainState = getPicnicMainState(d);
  if (btnPicnicMainEl) {
    btnPicnicMainEl.disabled = mainState.disabled;
    btnPicnicMainEl.textContent = mainState.label;
    btnPicnicMainEl.dataset.mode = mainState.mode;
    btnPicnicMainEl.classList.toggle('is-ready', !mainState.disabled && (mainState.mode === 'start' || mainState.mode === 'share'));
    btnPicnicMainEl.classList.toggle('is-pack', !mainState.disabled && mainState.mode === 'pack');
  }
  if (btnPicnicHelperEl) btnPicnicHelperEl.disabled = outing;
  btnPicnicGoShiftEl?.classList.toggle('hidden', !(stats.wardCharges > 0));

  if (pcLogGridEl) {
    const recent = pb.log.slice(-6).reverse();
    const lKey = recent.map((e) => `${e.id}:${e.spotId}:${e.foods.length}`).join(',');
    if (lKey !== pcLogKey) {
      pcLogKey = lKey;
      pcLogGridEl.innerHTML = recent.length
        ? recent
            .map((e) => {
              const sp = PICNIC_SPOT_BY_ID[e.spotId];
              return `<button type="button" class="pc-log-chip" data-log-id="${e.id}" title="${e.date} · ${sp.name} · ${e.foods.map((f) => PICNIC_FOOD_BY_ID[f].short).join('、')}">
                  <img src="${sp.icon}" alt="" class="pc-log-ico" />
                  <span class="pc-log-date">${e.date.slice(5).replace('-', '/')}</span>
                  <em class="pc-log-tag">${sp.short}</em>
                </button>`;
            })
            .join('')
        : '<span class="pc-log-empty">还没去过野餐，周末一起出发吧~</span>';
    }
  }
  if (pcLogSubEl) {
    pcLogSubEl.textContent = `野餐手账 · 共 ${stats.totalPicnics} 次 · 装篮 ${stats.totalPreps} 次 · 地点 ${stats.spotsVisited}/${stats.totalSpots}`;
  }
  if (pcWardLineEl) {
    const wardSpot = PICNIC_SPOT_BY_ID[stats.wardSpotId];
    pcWardLineEl.textContent =
      stats.wardCharges > 0 && wardSpot
        ? `野餐好心情『${wardSpot.wardName}』：接下来 ${stats.wardCharges} 个打工班次 ${describePicnicWard(wardSpot.id, stats.wardAnticipation)}`
        : `野餐好心情：周末完成一次野餐，接下来 ${PICNIC_RULES.wardShiftsPerPicnic} 个幸存者打工班次获得地点佑护（期待章每枚 +5%）`;
  }

  if (btnPicnicDockEl) {
    btnPicnicDockEl.classList.toggle('active', cardOpen);
    btnPicnicDockEl.classList.toggle('has-weekend', stats.isWeekend && !stats.doneToday);
  }
  picnicWeekendBadgeEl?.classList.toggle('hidden', !(stats.isWeekend && !stats.doneToday));

  const pv = player.picnicVisual;
  pv.packed = Boolean(pb.plan) && !outing;
  pv.weekend = stats.isWeekend;
  pv.outing = outing;
  pv.spotId = shownSpotId || '';
  pv.foods = outing ? picnicRun.foods.map((f) => PICNIC_FOOD_BY_ID[f].spriteKey) : [];
  pv.shared = outing ? picnicRun.shared.slice() : [];
  pv.packing = cardOpen && !outing;
  const lastFood = picnicRun.foods[picnicRun.foods.length - 1];
  pv.packKey = lastFood && PICNIC_FOOD_BY_ID[lastFood] ? PICNIC_FOOD_BY_ID[lastFood].spriteKey : '';
  syncPicnicDiaryPill();
}

// ---------------- 手写日记本：每天一页，由她按当天真实的互动计数自动写成 ----------------
const DIARY_MOOD_CLOSINGS = {
  bliss: '今天也超级喜欢主人~',
  focus: '认真的主人闪闪发光！',
  cozy: '暖乎乎的一天，像被窝一样~',
  star: '把今天的星星都收进日记里~',
  goodnight: '晚安，明天也要见面哦~'
};

function describeDiaryLine(key, n, dateKey) {
  if (key === 'picnics') {
    const e = [...(player.picnicBasket.log || [])].reverse().find((x) => x.date === dateKey);
    const sp = e ? PICNIC_SPOT_BY_ID[e.spotId] : null;
    return sp
      ? `和主人去${sp.name}野餐啦，${e.foods.map((f) => PICNIC_FOOD_BY_ID[f].short).join('、')}都分着吃光了！`
      : `和主人去野餐了 ${n} 次，风好舒服~`;
  }
  if (key === 'picnicPreps') return '一起把周末野餐篮装好了，好期待周末~';
  if (key === 'embroideries') {
    const w = ((player.embroideryHoop && player.embroideryHoop.wall) || []).find((x) => x.date === dateKey);
    const pt = w ? EMBROIDERY_PATTERN_BY_ID[w.patternId] : null;
    const th = w ? EMBROIDERY_THREAD_BY_ID[w.threadId] : null;
    return pt && th
      ? `和主人一起绣了 ${n} 幅小刺绣，${th.name}的「${pt.name}」挂上墙啦~`
      : `和主人你一针我一针，绣了 ${n} 幅小刺绣挂在墙上~`;
  }
  if (key === 'snacks') {
    const hc = player.hearthCorner || {};
    const sn = HEARTH_SNACK_BY_ID[hc.lastSnackId];
    const lv = HEARTH_LEVEL_BY_ID[hc.lastLevelId];
    return sn && lv
      ? `在小暖炉边烤了 ${n} 块松饼分着吃，${lv.texture}的「${sn.name}」暖到心里~`
      : `在小暖炉边烤了 ${n} 块松饼分着吃，一起围炉依偎~`;
  }
  if (key === 'stars') {
    const sp = player.starProjector || {};
    const a = sp.active;
    const startKey = a && Number(a.startMs) > 0 ? formatLocalDateKey(new Date(Number(a.startMs))) : '';
    const card = a && startKey === dateKey ? STAR_CARD_BY_ID[a.cardId] : null;
    return card
      ? `和主人点亮了 ${n} 次星空投影，「${card.name}」挂在天花板上闪闪的~`
      : `和主人一起点亮了 ${n} 次卧室星空投影，收集星座卡~`;
  }
  if (key === 'rains') {
    const rc = player.rainCorner || {};
    const w = RAIN_WEATHER_BY_ID[rc.lastWeatherId];
    return w ? `在窗边听雨记下了 ${n} 则小记，「${w.name}」好安心~` : `在窗边听雨记下了 ${n} 则小记~`;
  }
  if (key === 'potteries') {
    const made = ((player.potteryWheel && player.potteryWheel.pieces) || []).filter((x) => x.date === dateKey);
    const e = made[made.length - 1];
    const sh = e ? POTTERY_SHAPE_BY_ID[e.shapeId] : null;
    const gl = e ? POTTERY_GLAZE_BY_ID[e.glazeId] : null;
    return sh && gl
      ? `和主人在窗畔转盘做了 ${n} 件陶器，${gl.name}的${sh.short}摆上了陶艺架~`
      : `和主人在窗畔转盘做了 ${n} 件小陶器~`;
  }
  if (key === 'aromas') {
    const am = player.aromaTable && player.aromaTable.active;
    const startKey = am && Number(am.startMs) > 0 ? formatLocalDateKey(new Date(Number(am.startMs))) : '';
    const recipe = am && startKey === dateKey ? getAromaRecipe(am.seasonId, am.moodId) : null;
    return recipe
      ? `调了 ${n} 次香氛，「${recipe.name}」让房间变成${recipe.tone}色调~`
      : `按心情调了 ${n} 次房间香氛，香香的~`;
  }
  if (key === 'cards') {
    const c = [...((player.greetingCards && player.greetingCards.album) || [])].reverse().find((x) => x.date === dateKey);
    const occ = c ? CARD_OCCASION_BY_ID[c.occasionId] : null;
    return occ ? `剪贴寄出了 ${n} 张手作贺卡，有一张是「${occ.name}」~` : `剪贴寄出了 ${n} 张手作贺卡~`;
  }
  if (key === 'kittens') {
    const ks = (player.kittenCorner && player.kittenCorner.kittens) || {};
    const names = KITTEN_SPECS.filter((k) => ks[k.id] && ks[k.id].lastSeen === dateKey).map((k) => k.name);
    return names.length
      ? `窗台的${names.join('和')}来串门，摸摸喂喂 ${n} 次~`
      : `窗台小猫来串门，摸摸喂喂 ${n} 次~`;
  }
  const tpl = {
    puzzles: `拼好了 ${n} 幅回忆拼图，挂上了回忆墙~`,
    bentos: `一起做了 ${n} 份饭团便当~`,
    letters: `给主人回了 ${n} 封手写信~`,
    paints: `在雨窗边画了 ${n} 幅水彩~`,
    stargazes: `用望远镜连了 ${n} 次星座~`,
    presses: `压了 ${n} 次干花书签~`,
    knits: `钩针织了 ${n} 回暖绒小物~`,
    cocoas: `冲了 ${n} 杯棉花糖热可可，暖暖的~`,
    collages: `装裱了 ${n} 帧手账拼贴~`,
    radioMins: `窗畔轻电台听了 ${n} 分钟~`,
    plantCares: `照料小花房 ${n} 次，叶子亮晶晶~`,
    sleepMins: `八音盒陪我睡了 ${n} 分钟，好梦~`,
    teas: `品了 ${n} 席手作下午茶~`,
    focusMins: `陪主人专注了 ${n} 分钟，主人好认真~`,
    shifts: `出门打工 ${n} 个班次，辛苦啦~`,
    snaps: `和主人拍了 ${n} 张拍立得~`,
    chats: `和主人聊了 ${n} 个小话题~`,
    feeds: `被主人投喂了 ${n} 次，肚子圆滚滚~`
  };
  return tpl[key] || '';
}

function buildDiaryPage(dateKey, todayKey = formatLocalDateKey(ar13Clock.date())) {
  const days = (player.weeklyJournal && player.weeklyJournal.days) || {};
  const day = days[dateKey] || null;
  const total = getJournalDayActivityTotal(day);
  const dateObj = parseLocalDateKey(dateKey);
  const isToday = dateKey === todayKey;
  const moodId = day && JOURNAL_MOODS[day.moodId] ? day.moodId : 'bliss';
  const entries = [];
  for (const spec of DIARY_LINE_SPECS) {
    const n = day ? Math.max(0, Math.round(Number(day[spec.key]) || 0)) : 0;
    if (n > 0) entries.push({ key: spec.key, n, ico: spec.ico, text: describeDiaryLine(spec.key, n, dateKey) });
  }
  const lines = entries.slice(0, DIARY_RULES.maxLines);
  const extra = Math.max(0, entries.length - lines.length);
  let closing = '';
  if (!total) {
    closing = isToday ? '今天的日记还空着……主人陪我做点什么，我就写下来~' : '';
  } else {
    closing = `${DIARY_MOOD_CLOSINGS[moodId] || DIARY_MOOD_CLOSINGS.bliss}${isToday ? '（今天还没写完，待续……）' : ''}`;
  }
  const decor = (player.diaryBook && player.diaryBook.decor && player.diaryBook.decor[dateKey]) || [];
  const memoryStickers = DIARY_MEMORY_STICKERS.filter((id) => day && Number(day[DIARY_STICKERS[id].counter]) > 0);
  return {
    dateKey,
    title: `${dateObj.getMonth() + 1}月${dateObj.getDate()}日 · ${AR13_WEEKDAY_NAMES[dateObj.getDay()]}`,
    isToday,
    total,
    hasContent: total > 0,
    moodId,
    moodLabel: JOURNAL_MOODS[moodId] ? JOURNAL_MOODS[moodId].label : '甜心',
    lines,
    extra,
    closing,
    stickers: decor.slice(),
    palette: [...memoryStickers, ...DIARY_BASE_STICKERS].slice(0, 8)
  };
}

function markDiarySeen(todayKey = formatLocalDateKey(ar13Clock.date())) {
  const db = player.diaryBook;
  const total = getJournalDayActivityTotal(player.weeklyJournal.days[todayKey]);
  if (db.seen.dateKey === todayKey && db.seen.total === total) return false;
  db.seen = { dateKey: todayKey, total };
  savePetState();
  return true;
}

function openDiaryBookCard(dateKey = '') {
  if (!diaryCardEl) return { ok: false };
  openAr13Card(diaryCardEl);
  const todayKey = formatLocalDateKey(ar13Clock.date());
  const keys = getDiaryPageKeys(todayKey);
  diaryRun.viewKey = keys.includes(dateKey) ? dateKey : todayKey;
  const stats = getDiaryStats();
  let wrote = false;
  if (diaryRun.viewKey === todayKey && stats.todayNew) {
    // 打开日记时她把今天新发生的事写进这一页（沙沙的笔触声）
    wrote = true;
    diaryRun.writtenFlash = 1.8;
    player.diaryCheerTimer = 3;
    petAudio.playDiaryScribble();
    setPlayerEmote('我把今天和主人一起做的事都写进日记啦，快看看~', 2.4, 'happy', false);
  }
  if (diaryRun.viewKey === todayKey) markDiarySeen(todayKey);
  diaryRun.lastAction = 'open';
  diaryRun.lastResult = { viewKey: diaryRun.viewKey, wrote };
  syncDiaryBookUI();
  return { ok: true, viewKey: diaryRun.viewKey, wrote };
}

function gotoDiaryPage(dateKey) {
  const todayKey = formatLocalDateKey(ar13Clock.date());
  const keys = getDiaryPageKeys(todayKey);
  if (!keys.includes(dateKey)) return { ok: false, reason: 'invalid_page' };
  if (diaryRun.viewKey === dateKey) return { ok: true, viewKey: dateKey, same: true };
  diaryRun.viewKey = dateKey;
  player.diaryBook.totalFlips = (player.diaryBook.totalFlips || 0) + 1;
  petAudio.playDiaryFlip();
  if (dateKey === todayKey) markDiarySeen(todayKey);
  diaryRun.lastAction = 'flip';
  syncDiaryBookUI();
  return { ok: true, viewKey: dateKey };
}

function flipDiaryPage(dir = 1) {
  const todayKey = formatLocalDateKey(ar13Clock.date());
  const keys = getDiaryPageKeys(todayKey);
  let idx = keys.indexOf(diaryRun.viewKey);
  if (idx < 0) idx = keys.length - 1;
  const next = Math.max(0, Math.min(keys.length - 1, idx + (dir < 0 ? -1 : 1)));
  if (next === idx) return { ok: false, reason: 'edge', viewKey: keys[idx] };
  const res = gotoDiaryPage(keys[next]);
  const page = buildDiaryPage(keys[next], todayKey);
  if (page.hasContent && !page.isToday) {
    setPlayerEmote(`翻到 ${page.title.split(' · ')[0]} 的日记啦~`, 1.8, 'happy', false);
  }
  return res;
}

function toggleDiarySticker(stickerId, nowMs = ar13Clock.now()) {
  const todayKey = formatLocalDateKey(new Date(nowMs));
  const page = buildDiaryPage(diaryRun.viewKey || todayKey, todayKey);
  if (!page.hasContent) {
    setPlayerEmote('这一页还空着，等我写下第一行再贴贴纸吧~', 1.8, 'happy', false);
    return { ok: false, reason: 'empty_page' };
  }
  if (!page.palette.includes(stickerId)) return { ok: false, reason: 'invalid_sticker' };
  const db = player.diaryBook;
  const cur = (db.decor[page.dateKey] || []).slice();
  const idx = cur.indexOf(stickerId);
  if (idx >= 0) {
    cur.splice(idx, 1);
    if (cur.length) db.decor[page.dateKey] = cur;
    else delete db.decor[page.dateKey];
    diaryRun.lastAction = 'sticker_remove';
    playSfx('pat');
    savePetState();
    syncDiaryBookUI();
    return { ok: true, removed: stickerId, stickers: cur.slice() };
  }
  if (cur.length >= DIARY_RULES.stickerMax) {
    setPlayerEmote('这一页已经贴了三枚啦，先揭下一枚再换吧~', 1.8, 'happy', false);
    return { ok: false, reason: 'stickers_full' };
  }
  cur.push(stickerId);
  db.decor[page.dateKey] = cur;
  const decorKeys = Object.keys(db.decor).sort();
  if (decorKeys.length > DIARY_RULES.decorKeep) {
    for (const k of decorKeys.slice(0, decorKeys.length - DIARY_RULES.decorKeep)) delete db.decor[k];
  }
  db.totalStickers = (db.totalStickers || 0) + 1;
  let reward = null;
  if (!db.rewarded[page.dateKey]) {
    if (db.rewardDate !== todayKey) {
      db.rewardDate = todayKey;
      db.rewardCount = 0;
    }
    if (db.rewardCount < DIARY_RULES.dailyRewards) {
      db.rewardCount += 1;
      db.rewarded[page.dateKey] = true;
      const rKeys = Object.keys(db.rewarded).sort();
      if (rKeys.length > DIARY_RULES.decorKeep) {
        for (const k of rKeys.slice(0, rKeys.length - DIARY_RULES.decorKeep)) delete db.rewarded[k];
      }
      reward = { coins: DIARY_RULES.coinReward, xp: DIARY_RULES.xpReward };
    }
  }
  diaryRun.lastStickerId = stickerId;
  diaryRun.lastAction = 'sticker_add';
  player.idleTime = 0;
  player.happyTimer = 0.9;
  player.diaryCheerTimer = 2.5;
  petAudio.playDiarySticker(cur.length);
  if (reward) {
    addCoins(reward.coins, player.x + 24, player.y - 44, '日记贴纸 ');
    addAffectionXp(reward.xp, '一起装饰日记');
  }
  recordJournalActivity('diaries', 1, new Date(nowMs));
  setPlayerEmote(
    reward
      ? `贴上「${DIARY_STICKERS[stickerId].name}」！${page.isToday ? '今天' : '那天'}的日记更可爱了~`
      : `贴上「${DIARY_STICKERS[stickerId].name}」~`,
    1.8,
    'happy',
    false
  );
  diaryRun.lastResult = { dateKey: page.dateKey, stickerId, reward };
  savePetState();
  syncDiaryBookUI();
  return { ok: true, added: stickerId, dateKey: page.dateKey, stickers: cur.slice(), reward, audio: petAudio.getAr13AudioInfo() };
}

// 她来贴：优先贴当天的回忆贴纸（野餐三明治 / 窗台小猫 / 手作贺卡），再按顺序补上日记贴纸，贴满 3 枚为止
function diaryHelperDecorate() {
  const todayKey = formatLocalDateKey(ar13Clock.date());
  const page = buildDiaryPage(diaryRun.viewKey || todayKey, todayKey);
  if (!page.hasContent) return toggleDiarySticker(page.palette[0]);
  diaryRun.helperSeq += 1;
  const base = DIARY_BASE_STICKERS.slice((diaryRun.helperSeq - 1) % DIARY_BASE_STICKERS.length).concat(
    DIARY_BASE_STICKERS.slice(0, (diaryRun.helperSeq - 1) % DIARY_BASE_STICKERS.length)
  );
  const order = [...page.palette.filter((id) => DIARY_MEMORY_STICKERS.includes(id)), ...base];
  const added = [];
  let lastRes = null;
  for (const id of order) {
    const cur = (player.diaryBook.decor[page.dateKey] || []).length;
    if (cur >= DIARY_RULES.stickerMax) break;
    if ((player.diaryBook.decor[page.dateKey] || []).includes(id)) continue;
    lastRes = toggleDiarySticker(id);
    if (lastRes && lastRes.ok) added.push(id);
  }
  if (!added.length) {
    setPlayerEmote('这一页已经贴得满满的啦~', 1.6, 'happy', false);
    return { ok: false, reason: 'stickers_full' };
  }
  setPlayerEmote(`我来贴：${added.map((id) => DIARY_STICKERS[id].name).join('、')}~`, 2.0, 'happy', false);
  return { ok: true, added, stickers: (player.diaryBook.decor[page.dateKey] || []).slice() };
}

let dyLinesKey = null;
let dyStickerRowKey = null;

function syncDiaryBookUI() {
  const db = player.diaryBook;
  if (!db) return;
  const todayKey = formatLocalDateKey(ar13Clock.date());
  const keys = getDiaryPageKeys(todayKey);
  if (!keys.includes(diaryRun.viewKey)) diaryRun.viewKey = todayKey;
  const cardOpen = isAr13CardOpen('diary');
  if (cardOpen && diaryRun.viewKey === todayKey) markDiarySeen(todayKey);
  const page = buildDiaryPage(diaryRun.viewKey, todayKey);
  const idx = keys.indexOf(page.dateKey);
  const stats = getDiaryStats();

  if (dySummaryPillEl) dySummaryPillEl.textContent = `日记 ${stats.written} 页 · 装饰 ${stats.decorated}`;
  if (dyPageEl) {
    dyPageEl.dataset.hasContent = page.hasContent ? '1' : '0';
    dyPageEl.dataset.mood = page.moodId;
    dyPageEl.dataset.dateKey = page.dateKey;
    dyPageEl.classList.toggle('is-today', page.isToday);
    dyPageEl.classList.toggle('is-fresh', page.isToday && diaryRun.writtenFlash > 0);
  }
  if (dyPageDateEl) dyPageDateEl.textContent = page.isToday ? `${page.title} · 今天` : page.title;
  if (dyPageMoodEl) dyPageMoodEl.textContent = page.hasContent ? `心情 · ${page.moodLabel}` : '待写';
  if (dyPageLinesEl) {
    const lKey = `${page.dateKey}|${page.lines.map((l) => l.text).join('|')}|${page.extra}|${page.closing}`;
    if (lKey !== dyLinesKey) {
      dyLinesKey = lKey;
      dyPageLinesEl.innerHTML =
        page.lines
          .map(
            (l) => `<li class="dy-line" data-line-key="${l.key}"><img src="${l.ico}" alt="" class="dy-line-ico" /><span class="dy-line-text">${l.text}</span></li>`
          )
          .join('') +
        (page.extra > 0 ? `<li class="dy-line dy-line-extra"><span class="dy-line-text">还有 ${page.extra} 件小事，悄悄记在页角~</span></li>` : '') +
        (page.closing ? `<li class="dy-line dy-line-closing"><span class="dy-line-text">${page.closing}</span></li>` : '');
    }
  }
  if (dyPageSignEl) dyPageSignEl.textContent = page.hasContent ? `—— DeepSeek娘${page.isToday ? ' 写于今天' : ' 记'}` : '—— 等主人来~';
  if (dyPageNoEl) dyPageNoEl.textContent = `${idx + 1}/${keys.length}`;
  dyPageStickerEls.forEach((el, i) => {
    if (!el) return;
    const sid = page.stickers[i];
    if (sid && DIARY_STICKERS[sid]) {
      if (el.getAttribute('src') !== DIARY_STICKERS[sid].img) el.setAttribute('src', DIARY_STICKERS[sid].img);
      el.classList.remove('hidden');
      el.dataset.stickerId = sid;
    } else {
      el.classList.add('hidden');
      el.dataset.stickerId = '';
    }
  });
  if (btnDiaryPrevEl) btnDiaryPrevEl.disabled = idx <= 0;
  if (btnDiaryNextEl) btnDiaryNextEl.disabled = idx >= keys.length - 1;

  if (dyStickerRowEl) {
    const sKey = page.palette.join(',');
    if (sKey !== dyStickerRowKey) {
      dyStickerRowKey = sKey;
      dyStickerRowEl.innerHTML = page.palette
        .map(
          (id) => `<button type="button" class="dy-sticker-chip${DIARY_STICKERS[id].counter ? ' is-memory' : ''}" data-sticker-id="${id}" title="${DIARY_STICKERS[id].name}">
              <img src="${DIARY_STICKERS[id].img}" alt="" class="dy-sticker-ico" />
              <span class="dy-sticker-name">${DIARY_STICKERS[id].name}</span>
            </button>`
        )
        .join('');
    }
    const full = page.stickers.length >= DIARY_RULES.stickerMax;
    dyStickerRowEl.querySelectorAll('.dy-sticker-chip').forEach((chip) => {
      const on = page.stickers.includes(chip.dataset.stickerId);
      chip.classList.toggle('active', on);
      chip.classList.toggle('is-full', full && !on);
      chip.disabled = !page.hasContent;
    });
  }
  if (dyStickerCountEl) dyStickerCountEl.textContent = `${page.stickers.length}/${DIARY_RULES.stickerMax}`;
  if (dyRewardTagEl) dyRewardTagEl.textContent = `今日装饰奖励 ${stats.rewardsToday}/${stats.dailyRewards}`;
  if (btnDiaryTodayEl) btnDiaryTodayEl.disabled = page.isToday;
  if (btnDiaryHelperEl) btnDiaryHelperEl.disabled = !page.hasContent || page.stickers.length >= DIARY_RULES.stickerMax;
  if (dyFooterLineEl) {
    dyFooterLineEl.textContent = `日记心意：每天前 ${DIARY_RULES.dailyRewards} 次给新的一页贴贴纸 +${DIARY_RULES.coinReward} 金币与亲密 · 已写 ${stats.written} 页 · 贴纸 ${stats.totalStickers} 枚，都记进七日心情周报`;
  }

  player.isWritingDiary = Boolean(cardOpen || player.diaryCheerTimer > 0);
  const lastSticker = diaryRun.lastStickerId || page.stickers[page.stickers.length - 1] || '';
  player.diaryStickerKey = lastSticker && DIARY_STICKERS[lastSticker] ? DIARY_STICKERS[lastSticker].spriteKey : '';
  syncAr13Badges();
}

// 船坞角标 + 合并胶囊：每秒轻量刷新一次（她随时会把新的互动写进今天的日记）
function syncAr13Badges() {
  const d = ar13Clock.date();
  const ps = getPicnicStats(d);
  const ds = getDiaryStats(d);
  const diaryOpen = isAr13CardOpen('diary');
  if (btnDiaryDockEl) {
    btnDiaryDockEl.classList.toggle('active', diaryOpen);
    btnDiaryDockEl.classList.toggle('has-new', ds.todayNew);
  }
  diaryNewBadgeEl?.classList.toggle('hidden', !ds.todayNew);
  if (btnPicnicDockEl) btnPicnicDockEl.classList.toggle('has-weekend', ps.isWeekend && !ps.doneToday);
  picnicWeekendBadgeEl?.classList.toggle('hidden', !(ps.isWeekend && !ps.doneToday));
  syncPicnicDiaryPill(ps, ds);
}

// ---------------- AR-13 合并紧凑胶囊：周末野餐邀约 / 野餐好心情 + 日记新页 / 装饰，窄屏放不下就收起 ----------------
function syncPicnicDiaryPill(psIn = null, dsIn = null) {
  if (!pdPillEl) return;
  const d = ar13Clock.date();
  const ps = psIn || getPicnicStats(d);
  const ds = dsIn || getDiaryStats(d);
  const outing = picnicRun.phase === 'outing';
  const invite = ps.isWeekend && !ps.doneToday;
  const showPicnic = outing || invite || ps.wardCharges > 0;
  const showDiary = ds.todayNew || ds.decorated > 0;
  pdPillEl.classList.toggle('hidden', !(gameMode === 'pet' && (showPicnic || showDiary)));
  pdPillEl.classList.toggle('has-invite', invite || outing);
  pdSegPicnicEl?.classList.toggle('hidden', !showPicnic);
  pdSegDiaryEl?.classList.toggle('hidden', !showDiary);
  const picnicFirst = outing || invite || !showDiary || (!ds.todayNew && showPicnic);
  pdSegPicnicEl?.classList.toggle('is-priority', picnicFirst);
  pdSegDiaryEl?.classList.toggle('is-priority', !picnicFirst);
  if (pdPillPicnicEl) pdPillPicnicEl.textContent = outing ? '野餐中' : invite ? '周末' : `护${ps.wardCharges}`;
  if (pdPillDiaryEl) pdPillDiaryEl.textContent = ds.todayNew ? '新' : String(ds.decorated);
  const wardSpot = PICNIC_SPOT_BY_ID[ps.wardSpotId];
  pdPillEl.title = `${invite ? '今天是周末，一起去野餐吧' : ps.wardCharges > 0 && wardSpot ? `野餐好心情『${wardSpot.wardName}』还剩 ${ps.wardCharges} 个班次` : `离周末还有 ${ps.daysUntil} 天`} · ${ds.todayNew ? '她刚在日记里写下了新的一行' : `日记 ${ds.written} 页 · 装饰 ${ds.decorated} 页`}`;
  fitPicnicDiaryPill();
}

// 与 AR-11 / AR-12 同一条规则：窄屏胶囊行已排满时不为 AR-13 胶囊新开一行（offsetTop 不受旋转舞台变换影响），
// 两段都放不下先只留优先的一段，仍放不下才整颗收起；只读 DOM，任何区段初始化时调用都不会触发 TDZ
function fitPicnicDiaryPill() {
  const fitted = fitPicnicDiaryPillOnly();
  // AR-14 合并胶囊排在其后：AR-13 胶囊显隐 / 收起变化后立刻复核 AR-14 胶囊是否还放得下
  fitPotteryAromaPill();
  return fitted;
}

function fitPicnicDiaryPillOnly() {
  const pill = document.getElementById('picnic-diary-pill');
  if (!pill) return false;
  pill.classList.remove('pd-no-room', 'pd-solo');
  if (pill.classList.contains('hidden') || pill.offsetParent === null) return false;
  const compact = window.matchMedia ? window.matchMedia('(max-width: 920px), (max-height: 430px)') : null;
  if (!compact || !compact.matches) return true;
  const row = pill.parentElement;
  const others = row
    ? Array.from(row.children).filter(
        (b) =>
          b !== pill &&
          b.id !== 'pottery-aroma-pill' &&
          b.id !== 'star-rain-pill' &&
          b.id !== 'stitch-hearth-pill' &&
          !b.classList.contains('hidden') &&
          b.offsetParent !== null
      )
    : [];
  if (!others.length) return true;
  const mid = (b) => b.offsetTop + b.offsetHeight / 2;
  const lastRowMid = Math.max(...others.map(mid));
  if (mid(pill) <= lastRowMid + 6) return true;
  const shownSegs = Array.from(pill.querySelectorAll('.pd-seg')).filter((s) => !s.classList.contains('hidden'));
  if (shownSegs.length > 1) {
    pill.classList.add('pd-solo');
    if (mid(pill) <= lastRowMid + 6) return true;
    pill.classList.remove('pd-solo');
  }
  pill.classList.add('pd-no-room');
  return false;
}

function openAr13Card(cardEl) {
  if (!cardEl) return;
  if (gameMode !== 'pet') switchMode('pet');
  closeDrawer();
  dismissTopicCard();
  dismissWindowAmbienceCard();
  foldOrHidePomodoroCard();
  dismissTeatimeCard();
  dismissWeeklyJournalCard();
  dismissTerrariumCard();
  foldOrHideGoodnightCard();
  dismissCollageCard();
  foldOrHideCozyRadioCard();
  dismissCrochetCard();
  dismissHotCocoaCard();
  dismissPressedFlowerCard();
  dismissTelescopeCard();
  dismissAr10Cards();
  dismissAr11Cards();
  dismissAr12Cards();
  dismissAr13Cards(); dismissAr14Cards(); dismissAr15Cards(); dismissAr16Cards();
  dismissPolaroid();
  closeAlbumLightbox();
  cardEl.classList.remove('hidden');
}

function openPicnicBasketCard() {
  if (!picnicCardEl) return;
  openAr13Card(picnicCardEl);
  syncPicnicBasketUI();
}

function togglePicnicBasketCard() {
  if (!picnicCardEl) return;
  if (picnicCardEl.classList.contains('hidden')) {
    openPicnicBasketCard();
    petAudio.playPicnicPack(0);
  } else {
    dismissPicnicBasketCard();
    syncPicnicBasketUI();
  }
}

function toggleDiaryBookCard() {
  if (!diaryCardEl) return;
  if (diaryCardEl.classList.contains('hidden')) {
    const res = openDiaryBookCard();
    if (!res.wrote) petAudio.playDiaryFlip();
  } else {
    dismissDiaryBookCard();
    syncDiaryBookUI();
  }
}

function handleAr13OutingTap(pt) {
  if (picnicRun.phase !== 'outing') return false;
  const L = getPicnicBlanketLayout(player, W);
  for (let i = 0; i < L.foods.length && i < picnicRun.foods.length; i++) {
    const f = L.foods[i];
    if (!picnicRun.shared[i] && Math.hypot(pt.x - f.x, pt.y - f.y) < f.r + 4) {
      sharePicnicFood(i);
      return true;
    }
  }
  return false;
}

function handleAr13CanvasTap(pt) {
  if (handleAr13OutingTap(pt)) return true;
  const pv = player.picnicVisual;
  if (pv && pv.packed) {
    const A = getPicnicBasketDeskAnchor(W, H);
    if (Math.hypot(pt.x - A.hit.x, pt.y - A.hit.y) < A.hit.r) {
      openPicnicBasketCard();
      petAudio.playPicnicPack(0);
      return true;
    }
  }
  return false;
}

let pdPillFitTimer = 0;
function updateAr13Companions(dt) {
  if (player.picnicCheerTimer > 0) player.picnicCheerTimer = Math.max(0, player.picnicCheerTimer - dt);
  if (player.diaryCheerTimer > 0) player.diaryCheerTimer = Math.max(0, player.diaryCheerTimer - dt);
  if (diaryRun.writtenFlash > 0) {
    diaryRun.writtenFlash = Math.max(0, diaryRun.writtenFlash - dt);
    if (diaryRun.writtenFlash <= 0) dyPageEl?.classList.remove('is-fresh');
  }
  picnicRun.tickAcc -= dt;
  if (picnicRun.tickAcc <= 0) {
    picnicRun.tickAcc = 1;
    const dayKey = formatLocalDateKey(ar13Clock.date());
    if (dayKey !== picnicRun.dayKey) {
      // 跨过本地午夜：周末 / 工作日、期待章与日记“今天”一起翻页
      picnicRun.dayKey = dayKey;
      syncPicnicBasketUI();
      syncDiaryBookUI();
    } else if (isAr13CardOpen('diary')) {
      syncDiaryBookUI();
    } else {
      syncAr13Badges();
    }
  }
  pdPillFitTimer -= dt;
  if (pdPillFitTimer <= 0) {
    pdPillFitTimer = 0.5;
    fitPicnicDiaryPill();
  }
  const pv = player.picnicVisual;
  pv.outing = picnicRun.phase === 'outing';
  pv.packing = isAr13CardOpen('picnic') && !pv.outing;
  player.isWritingDiary = Boolean(isAr13CardOpen('diary') || player.diaryCheerTimer > 0);
}

if (picnicCardEl) {
  picnicCardEl.addEventListener('pointerdown', (e) => e.stopPropagation());
}
if (diaryCardEl) {
  diaryCardEl.addEventListener('pointerdown', (e) => e.stopPropagation());
}

bindHudTap(btnPicnicDockEl, () => {
  togglePicnicBasketCard();
});
bindHudTap(document.getElementById('btn-picnic-close'), () => {
  dismissPicnicBasketCard();
  syncPicnicBasketUI();
});
bindHudTap(pcFoodRowEl, (e) => {
  const chip = e.target && e.target.closest ? e.target.closest('.pc-food-chip') : null;
  if (chip && !chip.disabled) togglePicnicFood(chip.dataset.foodId);
});
bindHudTap(pcSpotRowEl, (e) => {
  const chip = e.target && e.target.closest ? e.target.closest('.pc-spot-chip') : null;
  if (chip && !chip.disabled) pickPicnicSpot(chip.dataset.spotId);
});
bindHudTap(pcBlanketEl, (e) => {
  const slot = e.target && e.target.closest ? e.target.closest('.pc-food-slot') : null;
  if (slot && picnicRun.phase === 'outing') sharePicnicFood(Number(slot.dataset.foodSlot));
});
bindHudTap(btnPicnicHelperEl, () => {
  if (btnPicnicHelperEl.disabled) return;
  helpPicnicPlan();
});
bindHudTap(btnPicnicMainEl, () => {
  if (btnPicnicMainEl.disabled) return;
  handlePicnicMainAction();
});
bindHudTap(btnPicnicGoShiftEl, () => {
  dismissPicnicBasketCard();
  switchMode('survivor');
});
bindHudTap(pcLogGridEl, (e) => {
  const chip = e.target && e.target.closest ? e.target.closest('.pc-log-chip') : null;
  if (!chip) return;
  const entry = player.picnicBasket.log.find((x) => x.id === chip.dataset.logId);
  if (!entry) return;
  const sp = PICNIC_SPOT_BY_ID[entry.spotId];
  playSfx('pat');
  setPlayerEmote(
    `${entry.date.slice(5).replace('-', '/')} 在${sp.name}野餐，吃了${entry.foods.map((f) => PICNIC_FOOD_BY_ID[f].short).join('、')}，好想再去~`,
    2.4,
    'happy',
    false
  );
});

bindHudTap(btnDiaryDockEl, () => {
  toggleDiaryBookCard();
});
bindHudTap(document.getElementById('btn-diary-close'), () => {
  dismissDiaryBookCard();
  syncDiaryBookUI();
});
bindHudTap(btnDiaryPrevEl, () => {
  if (btnDiaryPrevEl.disabled) return;
  flipDiaryPage(-1);
});
bindHudTap(btnDiaryNextEl, () => {
  if (btnDiaryNextEl.disabled) return;
  flipDiaryPage(1);
});
bindHudTap(dyStickerRowEl, (e) => {
  const chip = e.target && e.target.closest ? e.target.closest('.dy-sticker-chip') : null;
  if (chip && !chip.disabled) toggleDiarySticker(chip.dataset.stickerId);
});
bindHudTap(dyPageEl, (e) => {
  const st = e.target && e.target.closest ? e.target.closest('.dy-page-sticker') : null;
  if (st && st.dataset.stickerId) toggleDiarySticker(st.dataset.stickerId);
});
bindHudTap(btnDiaryTodayEl, () => {
  if (btnDiaryTodayEl.disabled) return;
  gotoDiaryPage(formatLocalDateKey(ar13Clock.date()));
});
bindHudTap(btnDiaryHelperEl, () => {
  if (btnDiaryHelperEl.disabled) return;
  diaryHelperDecorate();
});
bindHudTap(btnDiaryJournalEl, () => {
  openWeeklyJournalCard();
  playSfx('pat');
});
// 七日心情周报联动：点周报里的某一天，直接翻到那天的日记
bindHudTap(document.getElementById('journal-7day-strip'), (e) => {
  const cell = e.target && e.target.closest ? e.target.closest('.journal-day-cell') : null;
  if (!cell || !cell.dataset.date) return;
  const todayKey = formatLocalDateKey(ar13Clock.date());
  const key = getDiaryPageKeys(todayKey).includes(cell.dataset.date) ? cell.dataset.date : todayKey;
  openDiaryBookCard(key);
  petAudio.playDiaryFlip();
});
bindHudTap(pdPillEl, (e) => {
  const segEl = e.target && e.target.closest ? e.target.closest('[data-pd-seg]') : null;
  const seg = segEl ? segEl.dataset.pdSeg : getPicnicStats().isWeekend ? 'picnic' : 'diary';
  if (seg === 'diary') openDiaryBookCard();
  else openPicnicBasketCard();
});

window.addEventListener('resize', () => {
  requestAnimationFrame(() => fitPicnicDiaryPill());
});

picnicRun.dayKey = formatLocalDateKey(ar13Clock.date());
syncPicnicBasketUI();
syncDiaryBookUI();

window.__AR13_DEBUG__ = {
  getSpecs() {
    return JSON.parse(
      JSON.stringify({
        foods: PICNIC_FOODS,
        spots: PICNIC_SPOTS,
        rules: PICNIC_RULES,
        diaryStickers: DIARY_STICKERS,
        diaryBaseStickers: DIARY_BASE_STICKERS,
        diaryMemoryStickers: DIARY_MEMORY_STICKERS,
        diaryRules: DIARY_RULES,
        diaryCounters: DIARY_COUNTER_KEYS
      })
    );
  },
  // 可注入时钟：传毫秒或本地时间字符串固定“现在”（周末判定 / 期待章 / 日记今天都跟着走）
  setClock(value) {
    const ms = typeof value === 'number' ? value : new Date(value).getTime();
    if (!Number.isFinite(ms)) return { ok: false, reason: 'invalid_clock' };
    ar13Clock.fixedMs = ms;
    ar13Clock.offsetMs = 0;
    picnicRun.dayKey = formatLocalDateKey(ar13Clock.date());
    syncPicnicBasketUI();
    syncDiaryBookUI();
    return { ok: true, now: ms, weekday: ar13Clock.date().getDay() };
  },
  advanceClock(ms) {
    const step = Math.max(0, Number(ms) || 0);
    if (ar13Clock.fixedMs !== null) ar13Clock.fixedMs += step;
    else ar13Clock.offsetMs += step;
    picnicRun.dayKey = formatLocalDateKey(ar13Clock.date());
    syncPicnicBasketUI();
    syncDiaryBookUI();
    return { ok: true, now: ar13Clock.now() };
  },
  useRealClock() {
    ar13Clock.fixedMs = null;
    ar13Clock.offsetMs = 0;
    picnicRun.dayKey = formatLocalDateKey(ar13Clock.date());
    syncPicnicBasketUI();
    syncDiaryBookUI();
    return { ok: true, now: ar13Clock.now() };
  },
  pickFood(id) {
    return togglePicnicFood(id);
  },
  pickSpot(id) {
    return pickPicnicSpot(id);
  },
  helper() {
    return helpPicnicPlan();
  },
  pack() {
    return packPicnicBasket();
  },
  start() {
    return startPicnicOuting();
  },
  share(slot = -1) {
    return sharePicnicFood(slot);
  },
  main() {
    return handlePicnicMainAction();
  },
  getMainState() {
    return getPicnicMainState();
  },
  getPicnicRun() {
    return JSON.parse(JSON.stringify(picnicRun));
  },
  resetDraftForTest() {
    picnicRun.phase = 'plan';
    picnicRun.foods = [];
    picnicRun.spotId = '';
    picnicRun.shared = [];
    syncPicnicBasketUI();
    return { ok: true };
  },
  openDiary(dateKey = '') {
    return openDiaryBookCard(dateKey);
  },
  flip(dir = 1) {
    return flipDiaryPage(dir);
  },
  gotoPage(dateKey) {
    return gotoDiaryPage(dateKey);
  },
  toggleSticker(id) {
    return toggleDiarySticker(id);
  },
  diaryHelper() {
    return diaryHelperDecorate();
  },
  getPage(dateKey = '') {
    const todayKey = formatLocalDateKey(ar13Clock.date());
    return buildDiaryPage(dateKey || diaryRun.viewKey || todayKey, todayKey);
  },
  getPageKeys() {
    return getDiaryPageKeys(formatLocalDateKey(ar13Clock.date()));
  },
  getDiaryRun() {
    return JSON.parse(JSON.stringify(diaryRun));
  },
  // 测试注入：给某一天写入周报计数（模拟那天真实发生过的互动），日记会据此自动写成一页
  setJournalDayForTest(dateKey, counters = {}) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateKey))) return { ok: false };
    const entry = ensureJournalDayEntry(dateKey);
    for (const [k, v] of Object.entries(counters || {})) {
      if (k === 'moodId' && JOURNAL_MOODS[v]) entry.moodId = v;
      else if (k in entry && k !== 'stamped' && k !== 'moodId') entry[k] = Math.max(0, Math.round(Number(v) || 0));
    }
    entry.stamped = getJournalDayActivityTotal(entry) > 0 || entry.stamped;
    savePetState();
    syncDiaryBookUI();
    syncWeeklyJournalUI();
    return { ok: true, entry: { ...entry } };
  },
  getLayouts() {
    return {
      basket: getPicnicBasketDeskAnchor(W, H),
      blanket: getPicnicBlanketLayout(player, W),
      player: { x: player.x, y: player.y },
      W,
      H
    };
  },
  placePlayerForTest(xRatio = 0.5) {
    player.x = Math.max(40, Math.min(W - 40, W * (Number(xRatio) || 0.5)));
    player.vx = 0;
    player.wanderTargetX = null;
    player.idleTime = 0;
    return { x: player.x, y: player.y };
  },
  getState(customDateIso = '') {
    const now = ar13Clock.now();
    const refDate = customDateIso ? new Date(customDateIso) : new Date(now);
    return {
      gameMode,
      now,
      clockFixed: ar13Clock.fixedMs !== null,
      coins: player.coins,
      level: player.level,
      xp: player.xp,
      hunger: player.hunger,
      emote: player.emote,
      picnicBasket: JSON.parse(JSON.stringify(player.picnicBasket)),
      picnicStats: getPicnicStats(new Date(now)),
      picnicRun: JSON.parse(JSON.stringify(picnicRun)),
      picnicVisual: JSON.parse(JSON.stringify(player.picnicVisual)),
      picnicMain: getPicnicMainState(new Date(now)),
      shiftPicnic: survivorRun.picnic ? { ...survivorRun.picnic } : null,
      picnicWard: getPicnicShiftWard(),
      diaryBook: JSON.parse(JSON.stringify(player.diaryBook)),
      diaryStats: getDiaryStats(new Date(now)),
      diaryRun: JSON.parse(JSON.stringify(diaryRun)),
      isWritingDiary: Boolean(player.isWritingDiary),
      ar13Audio: petAudio.getAr13AudioInfo(),
      journalSummary: computeWeeklyJournalSummary(refDate),
      survivorMetrics: window.__AR5_DEBUG__.getSurvivorEffectiveMetrics(),
      openPanels: window.__AR5_DEBUG__.getState(customDateIso).openPanels
    };
  }
};

// ================= AR-14 窗畔手作陶艺转盘 & 她的小小香氛调配台 =================
// 船坞已满 25 键：两张卡不加新键，入口 = 「家具与装扮」抽屉快捷卡 + 场景点击（窗畔陶艺架 / 书桌香薰机）+ 合并胶囊
const potteryCardEl = document.getElementById('pottery-wheel-card');
const pwSummaryPillEl = document.getElementById('pw-summary-pill');
const pwStepRowEl = document.getElementById('pw-step-row');
const pwStepHintEl = document.getElementById('pw-step-hint');
const pwWheelEl = document.getElementById('pw-wheel');
const pwClayEl = document.getElementById('pw-clay');
const pwWheelTagEl = document.getElementById('pw-wheel-tag');
const pwShapeRowEl = document.getElementById('pw-shape-row');
const pwGlazeRowEl = document.getElementById('pw-glaze-row');
const btnPotteryHelperEl = document.getElementById('btn-pottery-helper');
const btnPotteryMainEl = document.getElementById('btn-pottery-main');
const btnPotteryGoShiftEl = document.getElementById('btn-pottery-go-shift');
const pwShelfSubEl = document.getElementById('pw-shelf-sub');
const pwShelfGridEl = document.getElementById('pw-shelf-grid');
const pwWardLineEl = document.getElementById('pw-ward-line');

const aromaCardEl = document.getElementById('aroma-table-card');
const amSummaryPillEl = document.getElementById('am-summary-pill');
const amSeasonRowEl = document.getElementById('am-season-row');
const amSeasonIcoEl = document.getElementById('am-season-ico');
const amSeasonNameEl = document.getElementById('am-season-name');
const amSeasonSubEl = document.getElementById('am-season-sub');
const amBottleStageEl = document.getElementById('am-bottle-stage');
const amDropEls = Array.from(document.querySelectorAll('#am-drops .am-drop'));
const amStageTagEl = document.getElementById('am-stage-tag');
const amMoodRowEl = document.getElementById('am-mood-row');
const amRecipeLineEl = document.getElementById('am-recipe-line');
const btnAromaHelperEl = document.getElementById('btn-aroma-helper');
const btnAromaMainEl = document.getElementById('btn-aroma-main');
const btnAromaStopEl = document.getElementById('btn-aroma-stop');
const amCodexSubEl = document.getElementById('am-codex-sub');
const amCodexGridEl = document.getElementById('am-codex-grid');
const amFooterLineEl = document.getElementById('am-footer-line');
const aromaOverlayEl = document.getElementById('aroma-ambient-overlay');

const paPillEl = document.getElementById('pottery-aroma-pill');
const paSegPotteryEl = document.getElementById('pa-seg-pottery');
const paSegAromaEl = document.getElementById('pa-seg-aroma');
const paPillPotteryEl = document.getElementById('pa-pill-pottery');
const paPillAromaEl = document.getElementById('pa-pill-aroma');

const POTTERY_SPIN_LINES = ['陶土在转盘上转起来啦，手要沾点水~', '慢慢往上提……它长高了！', '再收一收口，快成形了~', '最后抹平一圈，好光滑~'];

const potteryRun = {
  // shape（拉坯）→ glaze（待上釉）→ kiln（已上釉待烧）→ firing（小窑烧制中）→ done（出窑）
  phase: 'shape',
  shapeId: POTTERY_SHAPE_BY_ID[player.potteryWheel.lastShapeId] ? player.potteryWheel.lastShapeId : 'cup',
  glazeId: POTTERY_GLAZE_BY_ID[player.potteryWheel.lastGlazeId] ? player.potteryWheel.lastGlazeId : 'cream',
  taps: 0,
  glazed: false,
  fireLeft: 0,
  helperSeq: 0,
  glazeHelperSeq: 0,
  spinFlash: 0,
  lastAction: '',
  lastResult: null,
  dayKey: ''
};

const aromaRun = {
  moodId: AROMA_MOOD_BY_ID[player.aromaTable.lastMoodId] ? player.aromaTable.lastMoodId : '',
  drops: 0,
  helperSeq: 0,
  wasActive: false,
  tickAcc: 0,
  dayKey: '',
  lastAction: '',
  lastResult: null
};

function isAr14CardOpen(which = '') {
  const pw = document.getElementById('pottery-wheel-card');
  const am = document.getElementById('aroma-table-card');
  const pwOpen = Boolean(pw && !pw.classList.contains('hidden'));
  const amOpen = Boolean(am && !am.classList.contains('hidden'));
  if (which === 'pottery') return pwOpen;
  if (which === 'aroma') return amOpen;
  return pwOpen || amOpen;
}

function dismissPotteryWheelCard() {
  document.getElementById('pottery-wheel-card')?.classList.add('hidden');
}

function dismissAromaTableCard() {
  document.getElementById('aroma-table-card')?.classList.add('hidden');
}

// 只碰 DOM：其它卡片在模块初始化期间调用也不会触发 TDZ
function dismissAr14Cards() {
  dismissPotteryWheelCard();
  dismissAromaTableCard();
}

// ---------------- 窗畔手作陶艺转盘：拉坯 → 上釉 → 烧成，出窑的小陶器摆上窗畔陶艺架 ----------------
function resetPotteryDraft() {
  potteryRun.phase = 'shape';
  potteryRun.taps = 0;
  potteryRun.glazed = false;
  potteryRun.fireLeft = 0;
}

function pickPotteryShape(shapeId) {
  if (potteryRun.phase === 'firing') return { ok: false, reason: 'firing' };
  const spec = POTTERY_SHAPE_BY_ID[shapeId];
  if (!spec) return { ok: false, reason: 'invalid_shape' };
  if (potteryRun.shapeId === shapeId && potteryRun.phase === 'shape') {
    syncPotteryWheelUI();
    return { ok: true, shapeId, same: true };
  }
  // 换器型 = 重新揉一团陶土，从头拉坯
  potteryRun.shapeId = shapeId;
  resetPotteryDraft();
  potteryRun.lastAction = 'shape_pick';
  player.potteryWheel.lastShapeId = shapeId;
  player.idleTime = 0;
  playSfx('pat');
  setPlayerEmote(spec.pickLine, 1.8, 'happy', false);
  syncPotteryWheelUI();
  return { ok: true, shapeId };
}

function spinPotteryWheel() {
  if (potteryRun.phase === 'done') resetPotteryDraft();
  if (potteryRun.phase !== 'shape') return { ok: false, reason: potteryRun.phase };
  const spec = POTTERY_SHAPE_BY_ID[potteryRun.shapeId] || POTTERY_SHAPES[0];
  const need = spec.taps;
  potteryRun.taps = Math.min(need, potteryRun.taps + 1);
  potteryRun.spinFlash = 0.6;
  potteryRun.lastAction = 'spin';
  player.idleTime = 0;
  player.happyTimer = 0.8;
  petAudio.playPotteryWheel(potteryRun.taps);
  petAudio.haptic('tap');
  if (potteryRun.taps >= need) {
    potteryRun.phase = 'glaze';
    setPlayerEmote(`${spec.short}的坯拉好啦！挑一种釉色给它穿上新衣服吧~`, 2.0, 'happy', false);
  } else {
    setPlayerEmote(POTTERY_SPIN_LINES[(potteryRun.taps - 1) % POTTERY_SPIN_LINES.length], 1.6, 'happy', false);
  }
  syncPotteryWheelUI();
  return { ok: true, taps: potteryRun.taps, need, phase: potteryRun.phase, audio: petAudio.getAr14AudioInfo() };
}

function glazePottery() {
  if (potteryRun.phase !== 'glaze' && potteryRun.phase !== 'kiln') return { ok: false, reason: potteryRun.phase };
  const g = POTTERY_GLAZE_BY_ID[potteryRun.glazeId] || POTTERY_GLAZES[0];
  potteryRun.glazeId = g.id;
  potteryRun.glazed = true;
  potteryRun.phase = 'kiln';
  potteryRun.lastAction = 'glazed';
  player.potteryWheel.lastGlazeId = g.id;
  player.idleTime = 0;
  player.happyTimer = 1;
  petAudio.playPotteryGlaze(POTTERY_GLAZES.indexOf(g));
  setPlayerEmote(`${g.line}（${g.wardName}：${describePotteryWard(g.id, potteryRun.shapeId)}）`, 2.2, 'happy', false);
  syncPotteryWheelUI();
  return { ok: true, glazeId: g.id, glazed: true, phase: 'kiln', audio: petAudio.getAr14AudioInfo() };
}

function pickPotteryGlaze(glazeId) {
  if (potteryRun.phase === 'firing') return { ok: false, reason: 'firing' };
  const g = POTTERY_GLAZE_BY_ID[glazeId];
  if (!g) return { ok: false, reason: 'invalid_glaze' };
  potteryRun.glazeId = glazeId;
  player.potteryWheel.lastGlazeId = glazeId;
  potteryRun.lastAction = 'glaze_pick';
  // 坯已拉好时：点釉色就直接给坯刷上这层釉（再点别的釉色可以换）
  if (potteryRun.phase === 'glaze' || potteryRun.phase === 'kiln') return glazePottery();
  playSfx('pat');
  setPlayerEmote(`先选好${g.name}，坯拉好就给它上釉~（${g.wardName}：${describePotteryWard(glazeId, potteryRun.shapeId)}）`, 2.0, 'happy', false);
  syncPotteryWheelUI();
  return { ok: true, glazeId, glazed: false };
}

function firePottery() {
  if (potteryRun.phase === 'firing') return { ok: false, reason: 'firing' };
  if (potteryRun.phase !== 'kiln' || !potteryRun.glazed) return { ok: false, reason: 'not_glazed' };
  potteryRun.phase = 'firing';
  potteryRun.fireLeft = POTTERY_RULES.fireSec;
  potteryRun.lastAction = 'firing';
  player.idleTime = 0;
  petAudio.playPotteryKiln();
  petAudio.haptic('tap');
  setPlayerEmote('送进小窑里烧一烧……要耐心等它变得结结实实~', 2.0, 'happy', false);
  syncPotteryWheelUI();
  return { ok: true, phase: 'firing', fireSec: POTTERY_RULES.fireSec, audio: petAudio.getAr14AudioInfo() };
}

function finishPottery(nowMs = ar14Clock.now()) {
  if (potteryRun.phase !== 'firing') return null;
  const pw = player.potteryWheel;
  const shape = POTTERY_SHAPE_BY_ID[potteryRun.shapeId] || POTTERY_SHAPES[0];
  const glaze = POTTERY_GLAZE_BY_ID[potteryRun.glazeId] || POTTERY_GLAZES[0];
  const d = new Date(nowMs);
  const todayKey = formatLocalDateKey(d);
  const comboKey = `${shape.id}_${glaze.id}`;
  const isNewCombo = !(pw.combos[comboKey] > 0);
  pw.combos[comboKey] = (pw.combos[comboKey] || 0) + 1;
  pw.seq = (pw.seq || 0) + 1;
  const piece = { id: `k${pw.seq}`, shapeId: shape.id, glazeId: glaze.id, date: todayKey };
  pw.pieces.push(piece);
  if (pw.pieces.length > POTTERY_RULES.logMax) pw.pieces = pw.pieces.slice(-POTTERY_RULES.logMax);
  pw.totalPieces = (pw.totalPieces || 0) + 1;
  pw.wardGlazeId = glaze.id;
  pw.wardShapeId = shape.id;
  pw.wardCharges = Math.min(POTTERY_RULES.wardMaxCharges, (pw.wardCharges || 0) + shape.charges);
  pw.lastShapeId = shape.id;
  pw.lastGlazeId = glaze.id;
  if (pw.rewardDate !== todayKey) {
    pw.rewardDate = todayKey;
    pw.rewardCount = 0;
  }
  let reward = null;
  if (pw.rewardCount < POTTERY_RULES.dailyRewards) {
    pw.rewardCount += 1;
    reward = {
      coins: POTTERY_RULES.coinReward + (isNewCombo ? POTTERY_RULES.newComboCoins : 0),
      xp: POTTERY_RULES.xpReward
    };
  }
  potteryRun.phase = 'done';
  potteryRun.fireLeft = 0;
  potteryRun.glazed = false;
  potteryRun.lastAction = 'finished';
  player.happyTimer = 2.4;
  player.cheerTimer = 2;
  player.potteryCheerTimer = 4;
  petAudio.playPotteryDone(POTTERY_SHAPES.indexOf(shape));
  petAudio.haptic('headpat');
  spawnInteractVfx(player.x, player.y - 30, 'love', 10);
  if (reward) {
    addCoins(reward.coins, player.x + 26, player.y - 46, '陶艺 ');
    addAffectionXp(reward.xp, '窗畔陶艺出窑');
  }
  recordJournalActivity('potteries', 1, d);
  const combos = getPotteryComboCount();
  setPlayerEmote(
    `${shape.doneLine}摆上陶艺架啦！接下来 ${pw.wardCharges} 个打工班次有『${glaze.wardName}』佑护~`,
    3.0,
    'cheer',
    true
  );
  potteryRun.lastResult = {
    id: piece.id,
    shapeId: shape.id,
    glazeId: glaze.id,
    date: todayKey,
    isNewCombo,
    reward,
    combos,
    wardCharges: pw.wardCharges,
    ward: getPotteryWardValues(glaze.id, shape.id, combos)
  };
  savePetState();
  syncPotteryWheelUI();
  syncDiaryBookUI();
  if (gameMode === 'survivor') syncSurvivorSkillStrip();
  return { ...potteryRun.lastResult, audio: petAudio.getAr14AudioInfo() };
}

function getPotteryMainState() {
  const sh = POTTERY_SHAPE_BY_ID[potteryRun.shapeId] || POTTERY_SHAPES[0];
  const g = POTTERY_GLAZE_BY_ID[potteryRun.glazeId] || POTTERY_GLAZES[0];
  if (potteryRun.phase === 'shape') return { mode: 'spin', disabled: false, label: `转盘拉坯 ${potteryRun.taps}/${sh.taps}` };
  if (potteryRun.phase === 'glaze') return { mode: 'glaze', disabled: false, label: `上釉 · ${g.name}` };
  if (potteryRun.phase === 'kiln') return { mode: 'fire', disabled: false, label: '入窑烧制' };
  if (potteryRun.phase === 'firing') return { mode: 'firing', disabled: true, label: '小窑烧制中…' };
  return { mode: 'again', disabled: false, label: '再做一件' };
}

function handlePotteryMainAction() {
  const st = getPotteryMainState();
  if (st.disabled) return { ok: false, reason: st.mode };
  if (st.mode === 'spin') return spinPotteryWheel();
  if (st.mode === 'glaze') return glazePottery();
  if (st.mode === 'fire') return firePottery();
  resetPotteryDraft();
  potteryRun.lastAction = 'again';
  playSfx('pat');
  setPlayerEmote('再揉一团陶土，这次做什么好呢~', 1.6, 'happy', false);
  syncPotteryWheelUI();
  return { ok: true, phase: 'shape' };
}

// 她来帮忙：替主人做完当前这一步（一口气拉好坯 / 按季节挑釉上釉 / 送进小窑）
function potteryHelper() {
  if (potteryRun.phase === 'firing') return { ok: false, reason: 'firing' };
  potteryRun.helperSeq += 1;
  if (potteryRun.phase === 'done') resetPotteryDraft();
  if (potteryRun.phase === 'shape') {
    const need = (POTTERY_SHAPE_BY_ID[potteryRun.shapeId] || POTTERY_SHAPES[0]).taps;
    let guard = 0;
    while (potteryRun.phase === 'shape' && potteryRun.taps < need && guard < 8) {
      spinPotteryWheel();
      guard += 1;
    }
    setPlayerEmote('我来！双手扶稳陶土，转盘呼呼转~ 坯拉好啦！', 2.0, 'happy', false);
    return { ok: true, step: 'shape', phase: potteryRun.phase, taps: potteryRun.taps };
  }
  if (potteryRun.phase === 'glaze') {
    // 第一次按季节挑釉（春樱粉 / 夏青瓷 / 秋冬奶白），之后每次轮换
    potteryRun.glazeHelperSeq += 1;
    const m = ar14Clock.date().getMonth() + 1;
    const seasonGlaze = m >= 3 && m <= 5 ? 'sakura' : m >= 6 && m <= 8 ? 'celadon' : 'cream';
    const order = [seasonGlaze, ...POTTERY_GLAZES.map((g) => g.id).filter((id) => id !== seasonGlaze)];
    potteryRun.glazeId = order[(potteryRun.glazeHelperSeq - 1) % order.length];
    return { ...glazePottery(), step: 'glaze' };
  }
  if (potteryRun.phase === 'kiln') return { ...firePottery(), step: 'fire' };
  return { ok: false, reason: potteryRun.phase };
}

// 进入幸存者班次时消耗 1 次陶艺佑护：按最新出窑陶器的釉色生效（减伤 / 金币 / 宝石磁吸），同一班次内重开不再消耗
function openPotteryWardForShift(prevMode) {
  if (prevMode === 'survivor' && survivorRun.pottery) return survivorRun.pottery;
  survivorRun.pottery = null;
  const pw = player.potteryWheel;
  if (!pw || !(pw.wardCharges > 0) || !POTTERY_GLAZE_BY_ID[pw.wardGlazeId] || !POTTERY_SHAPE_BY_ID[pw.wardShapeId]) return null;
  const combos = getPotteryComboCount();
  const v = getPotteryWardValues(pw.wardGlazeId, pw.wardShapeId, combos);
  pw.wardCharges -= 1;
  pw.totalWardShifts = (pw.totalWardShifts || 0) + 1;
  survivorRun.pottery = {
    glazeId: pw.wardGlazeId,
    shapeId: pw.wardShapeId,
    combos,
    guardPct: v.guardPct,
    coinPct: v.coinPct,
    magnetPct: v.magnetPct
  };
  savePetState();
  return survivorRun.pottery;
}

let pwShapeRowKey = null;
let pwGlazeRowKey = null;
let pwShelfKey = null;

function syncPotteryWheelUI() {
  const pw = player.potteryWheel;
  if (!pw) return;
  const stats = getPotteryStats();
  const cardOpen = isAr14CardOpen('pottery');
  const phase = potteryRun.phase;
  const shape = POTTERY_SHAPE_BY_ID[potteryRun.shapeId] || POTTERY_SHAPES[0];
  const glaze = POTTERY_GLAZE_BY_ID[potteryRun.glazeId] || POTTERY_GLAZES[0];
  const done = phase === 'done' && potteryRun.lastResult ? potteryRun.lastResult : null;
  const shownShape = done ? POTTERY_SHAPE_BY_ID[done.shapeId] : shape;
  const shownGlaze = done ? POTTERY_GLAZE_BY_ID[done.glazeId] : glaze;
  const glazedLook = phase === 'kiln' || phase === 'firing' || phase === 'done';
  const progress = phase === 'shape' ? potteryRun.taps / shape.taps : 1;

  if (pwSummaryPillEl) pwSummaryPillEl.textContent = `陶艺架 ${stats.shelfCount} 件 · 图鉴 ${stats.combos}/${stats.totalCombos}`;
  if (pwStepRowEl) {
    pwStepRowEl.dataset.phase = phase;
    const doneSteps = {
      shape: phase !== 'shape',
      glaze: glazedLook,
      fire: phase === 'done'
    };
    const activeStep = phase === 'shape' ? 'shape' : phase === 'glaze' ? 'glaze' : phase === 'done' ? '' : 'fire';
    pwStepRowEl.querySelectorAll('.pw-step').forEach((el) => {
      const k = el.dataset.step;
      el.classList.toggle('is-done', Boolean(doneSteps[k]));
      el.classList.toggle('is-active', k === activeStep);
    });
  }
  if (pwStepHintEl) {
    pwStepHintEl.textContent =
      phase === 'shape'
        ? `${shape.short}拉坯 ${potteryRun.taps}/${shape.taps} · 点转盘转一圈`
        : phase === 'glaze'
          ? '坯拉好啦 · 点一种釉色上釉'
          : phase === 'kiln'
            ? `已上${glaze.name} · 送进小窑烧成`
            : phase === 'firing'
              ? '小窑烧制中 · 稍等一下下'
              : `出窑啦 · ${shownGlaze.name}${shownShape.short}上架`;
  }
  if (pwWheelEl) {
    pwWheelEl.dataset.phase = phase;
    pwWheelEl.dataset.glaze = glazedLook ? shownGlaze.id : '';
    pwWheelEl.style.setProperty('--glaze', glazedLook ? shownGlaze.color : '#f3e6d2');
    pwWheelEl.style.setProperty('--clay-scale', String(Number((0.42 + 0.58 * progress).toFixed(3))));
    pwWheelEl.classList.toggle('is-spinning', potteryRun.spinFlash > 0 || phase === 'firing');
  }
  if (pwClayEl && pwClayEl.getAttribute('src') !== shownShape.img) pwClayEl.setAttribute('src', shownShape.img);
  if (pwWheelTagEl) {
    pwWheelTagEl.textContent =
      phase === 'shape'
        ? `拉坯 ${potteryRun.taps}/${shape.taps}`
        : phase === 'glaze'
          ? '待上釉'
          : phase === 'kiln'
            ? `${glaze.short}釉 · 待烧`
            : phase === 'firing'
              ? '烧制中'
              : '出窑啦';
  }

  if (pwShapeRowEl) {
    const sKey = POTTERY_SHAPES.map((s) => s.id).join(',');
    if (sKey !== pwShapeRowKey) {
      pwShapeRowKey = sKey;
      pwShapeRowEl.innerHTML = POTTERY_SHAPES.map(
        (s) => `<button type="button" class="pw-shape-chip" data-shape-id="${s.id}" title="${s.name}">
            <img src="${s.img}" alt="" class="pw-shape-ico" />
            <span class="pw-shape-meta">
              <span class="pw-shape-name">${s.short}</span>
              <em class="pw-shape-sub">拉坯${s.taps}圈 · 护${s.charges}班</em>
            </span>
          </button>`
      ).join('');
    }
    pwShapeRowEl.querySelectorAll('.pw-shape-chip').forEach((chip) => {
      chip.classList.toggle('active', chip.dataset.shapeId === shape.id);
      chip.disabled = phase === 'firing';
    });
  }
  if (pwGlazeRowEl) {
    const gKey = POTTERY_GLAZES.map((g) => g.id).join(',');
    if (gKey !== pwGlazeRowKey) {
      pwGlazeRowKey = gKey;
      pwGlazeRowEl.innerHTML = POTTERY_GLAZES.map(
        (g) => `<button type="button" class="pw-glaze-chip" data-glaze-id="${g.id}" style="--glaze:${g.color}">
            <span class="pw-glaze-swatch"><img src="${shape.img}" alt="" class="pw-glaze-ico" /></span>
            <span class="pw-glaze-meta">
              <span class="pw-glaze-name">${g.name}</span>
              <em class="pw-glaze-ward"></em>
            </span>
          </button>`
      ).join('');
    }
    pwGlazeRowEl.querySelectorAll('.pw-glaze-chip').forEach((chip) => {
      const gid = chip.dataset.glazeId;
      chip.classList.toggle('active', gid === glaze.id);
      chip.classList.toggle('is-applied', glazedLook && !done && gid === glaze.id);
      chip.disabled = phase === 'firing';
      chip.title = `${POTTERY_GLAZE_BY_ID[gid].name} · ${POTTERY_GLAZE_BY_ID[gid].wardName}：${describePotteryWard(gid, shape.id)}`;
      const ico = chip.querySelector('.pw-glaze-ico');
      if (ico && ico.getAttribute('src') !== shape.img) ico.setAttribute('src', shape.img);
      const wardEl = chip.querySelector('.pw-glaze-ward');
      if (wardEl) wardEl.textContent = describePotteryWardShort(gid, shape.id);
    });
  }

  const mainState = getPotteryMainState();
  if (btnPotteryMainEl) {
    btnPotteryMainEl.disabled = mainState.disabled;
    btnPotteryMainEl.textContent = mainState.label;
    btnPotteryMainEl.dataset.mode = mainState.mode;
    btnPotteryMainEl.classList.toggle('is-ready', !mainState.disabled && (mainState.mode === 'fire' || mainState.mode === 'glaze'));
  }
  if (btnPotteryHelperEl) {
    btnPotteryHelperEl.disabled = phase === 'firing';
    btnPotteryHelperEl.textContent =
      phase === 'shape' || phase === 'done' ? '她来拉坯' : phase === 'glaze' ? '她来上釉' : phase === 'kiln' ? '她来烧' : '她在看窑';
  }
  btnPotteryGoShiftEl?.classList.toggle('hidden', !(stats.wardCharges > 0));

  if (pwShelfGridEl) {
    const recent = pw.pieces.slice(-POTTERY_RULES.shelfCardShow).reverse();
    const lKey = recent.map((e) => `${e.id}:${e.shapeId}:${e.glazeId}`).join(',');
    if (lKey !== pwShelfKey) {
      pwShelfKey = lKey;
      pwShelfGridEl.innerHTML = recent.length
        ? recent
            .map((e) => {
              const sh = POTTERY_SHAPE_BY_ID[e.shapeId];
              const gl = POTTERY_GLAZE_BY_ID[e.glazeId];
              return `<button type="button" class="pw-shelf-chip" data-piece-id="${e.id}" style="--glaze:${gl.color}" title="${e.date} · ${gl.name}${sh.name}">
                  <img src="${sh.img}" alt="" class="pw-shelf-ico" />
                  <span class="pw-shelf-date">${e.date.slice(5).replace('-', '/')}</span>
                  <em class="pw-shelf-tag">${gl.short}</em>
                </button>`;
            })
            .join('')
        : '<span class="pw-shelf-empty">陶艺架还空着，转动转盘做第一件吧~</span>';
    }
  }
  if (pwShelfSubEl) {
    pwShelfSubEl.textContent = `窗畔陶艺架 · 共 ${stats.totalPieces} 件 · 图鉴 ${stats.combos}/${stats.totalCombos} · 今日奖励 ${stats.rewardsToday}/${stats.dailyRewards}`;
  }
  if (pwWardLineEl) {
    const wg = POTTERY_GLAZE_BY_ID[stats.wardGlazeId];
    pwWardLineEl.textContent =
      stats.wardCharges > 0 && wg
        ? `陶艺佑护『${wg.wardName}』：接下来 ${stats.wardCharges} 个打工班次 ${describePotteryWard(wg.id, stats.wardShapeId)}`
        : `陶艺佑护：茶杯护 2 个打工班次、花瓶护 1 个（效果 ×1.5）；奶白减伤 / 樱粉金币 / 青瓷磁吸，图鉴每收 1 款再 +${Math.round(POTTERY_RULES.comboStep * 100)}%`;
  }

  const pv = player.potteryVisual;
  pv.pieces = pw.pieces.slice(-POTTERY_RULES.shelfShow).map((e) => ({
    id: e.id,
    spriteKey: POTTERY_SHAPE_BY_ID[e.shapeId].spriteKey,
    rgb: POTTERY_GLAZE_BY_ID[e.glazeId].rgb
  }));
  pv.shaping = cardOpen;
  pv.progress = progress;
  pv.shapeKey = shownShape.spriteKey;
  pv.glazeRgb = glazedLook ? shownGlaze.rgb : '';
  pv.firing = phase === 'firing';
  pv.phase = phase;
  pv.cheer = player.potteryCheerTimer || 0;
  pv.wardCharges = stats.wardCharges;
  pv.totalShown = stats.totalPieces;
  syncPotteryAromaPill();
}

// ---------------- 小小香氛调配台：选心情 → 滴 3 滴精油（季节基调 / 心情心调 / 她的小心意）→ 点香，房间色温随之变化 ----------------
function pickAromaMood(moodId) {
  const m = AROMA_MOOD_BY_ID[moodId];
  if (!m) return { ok: false, reason: 'invalid_mood' };
  const changed = aromaRun.moodId !== moodId;
  aromaRun.moodId = moodId;
  if (changed) aromaRun.drops = 0;
  player.aromaTable.lastMoodId = moodId;
  aromaRun.lastAction = 'mood';
  player.idleTime = 0;
  playSfx('pat');
  const recipe = getAromaRecipe(getAromaSeasonId(), moodId);
  setPlayerEmote(`今天是「${m.name}」的心情~ 配上当季基调，就是「${recipe.name}」！`, 2.2, 'happy', false);
  syncAromaTableUI();
  return { ok: true, moodId, recipeId: recipe.id, changed };
}

function addAromaDrop() {
  const mood = AROMA_MOOD_BY_ID[aromaRun.moodId];
  if (!mood) {
    setPlayerEmote('先告诉我今天是什么心情吧~', 1.6, 'happy', false);
    return { ok: false, reason: 'no_mood' };
  }
  if (aromaRun.drops >= AROMA_RULES.drops) return { ok: false, reason: 'full' };
  aromaRun.drops += 1;
  aromaRun.lastAction = 'drop';
  player.idleTime = 0;
  player.happyTimer = 0.7;
  petAudio.playAromaDrop(aromaRun.drops);
  const season = AROMA_SEASONS[getAromaSeasonId()];
  const lines = [`第一滴：当季基调「${season.note}」~`, `第二滴：心情心调「${mood.note}」~`, '第三滴：再加一点点我的小心意，摇一摇~'];
  setPlayerEmote(lines[aromaRun.drops - 1], 1.8, 'happy', false);
  syncAromaTableUI();
  return { ok: true, drops: aromaRun.drops, need: AROMA_RULES.drops, audio: petAudio.getAr14AudioInfo() };
}

function lightAroma(nowMs = ar14Clock.now()) {
  const mood = AROMA_MOOD_BY_ID[aromaRun.moodId];
  if (!mood) return { ok: false, reason: 'no_mood' };
  if (aromaRun.drops < AROMA_RULES.drops) return { ok: false, reason: 'drops', drops: aromaRun.drops };
  const at = player.aromaTable;
  const d = new Date(nowMs);
  const todayKey = formatLocalDateKey(d);
  const recipe = getAromaRecipe(getAromaSeasonId(d), mood.id);
  const isNew = !(at.discovered[recipe.id] > 0);
  at.discovered[recipe.id] = (at.discovered[recipe.id] || 0) + 1;
  at.totalBlends = (at.totalBlends || 0) + 1;
  at.active = {
    seasonId: recipe.seasonId,
    moodId: recipe.moodId,
    startMs: Math.round(nowMs),
    endMs: Math.round(nowMs + AROMA_RULES.durationMin * 60000)
  };
  at.lastMoodId = mood.id;
  if (at.rewardDate !== todayKey) {
    at.rewardDate = todayKey;
    at.rewardCount = 0;
  }
  let reward = null;
  if (at.rewardCount < AROMA_RULES.dailyRewards) {
    at.rewardCount += 1;
    reward = { coins: AROMA_RULES.coinReward + (isNew ? AROMA_RULES.newRecipeCoins : 0), xp: AROMA_RULES.xpReward };
  }
  aromaRun.drops = 0;
  aromaRun.wasActive = true;
  aromaRun.lastAction = 'lit';
  player.idleTime = 0;
  player.happyTimer = 2;
  player.aromaCheerTimer = 3.5;
  petAudio.playAromaLight(AROMA_MOODS.indexOf(mood));
  petAudio.haptic('headpat');
  spawnInteractVfx(player.x, player.y - 26, 'sparkle', 8);
  recordJournalActivity('aromas', 1, d);
  if (reward) {
    addCoins(reward.coins, player.x + 24, player.y - 44, '香氛 ');
    addAffectionXp(reward.xp, '调好一瓶香氛');
  }
  setPlayerEmote(
    `${mood.line}「${recipe.name}」点上啦，房间换成${recipe.tone}色温（约 ${recipe.kelvin}K）~`,
    3.0,
    'cheer',
    true
  );
  aromaRun.lastResult = {
    recipeId: recipe.id,
    name: recipe.name,
    moodId: recipe.moodId,
    seasonId: recipe.seasonId,
    kelvin: recipe.kelvin,
    tone: recipe.tone,
    isNew,
    reward,
    endMs: at.active.endMs
  };
  savePetState();
  syncAromaTableUI();
  syncDiaryBookUI();
  return { ok: true, ...aromaRun.lastResult, audio: petAudio.getAr14AudioInfo() };
}

function stopAroma() {
  if (!getActiveAroma()) return { ok: false, reason: 'not_active' };
  player.aromaTable.active = null;
  aromaRun.wasActive = false;
  aromaRun.lastAction = 'stopped';
  playSfx('pat');
  setPlayerEmote('香氛先熄掉啦，房间的颜色也慢慢回来了~', 1.8, 'happy', false);
  savePetState();
  syncAromaTableUI();
  return { ok: true };
}

function getAromaMainState() {
  if (!AROMA_MOOD_BY_ID[aromaRun.moodId]) return { mode: 'pick', disabled: true, label: '先选心情' };
  if (aromaRun.drops < AROMA_RULES.drops) {
    return { mode: 'drop', disabled: false, label: `滴入精油 ${aromaRun.drops}/${AROMA_RULES.drops}` };
  }
  return { mode: 'light', disabled: false, label: getActiveAroma() ? '换上这瓶 · 点香' : '摇匀点香' };
}

function handleAromaMainAction() {
  const st = getAromaMainState();
  if (st.disabled) return { ok: false, reason: st.mode };
  if (st.mode === 'drop') return addAromaDrop();
  return lightAroma();
}

// 她来调：没选心情时按今天手账上的心情章（没盖章就按时段）挑心情，再一口气滴满 3 滴并点香
function aromaHelper() {
  aromaRun.helperSeq += 1;
  if (!AROMA_MOOD_BY_ID[aromaRun.moodId]) {
    const now = ar14Clock.date();
    const today = player.weeklyJournal.days[formatLocalDateKey(now)];
    let moodId = '';
    if (today && today.stamped && AROMA_MOOD_BY_ID[today.moodId]) {
      moodId = today.moodId;
    } else {
      const h = now.getHours();
      moodId = h >= 21 || h < 5 ? 'goodnight' : h < 11 ? 'focus' : h < 16 ? 'cozy' : h < 19 ? 'bliss' : 'star';
    }
    pickAromaMood(moodId);
  }
  let guard = 0;
  while (aromaRun.drops < AROMA_RULES.drops && guard < 5) {
    addAromaDrop();
    guard += 1;
  }
  return { ...lightAroma(), step: 'helper' };
}

// 每秒复核一次：香氛按可注入时钟到点自然散去、跨过本地午夜时季节 / 每日奖励翻页
function refreshAr14Clock() {
  const active = getActiveAroma();
  const dayKey = formatLocalDateKey(ar14Clock.date());
  if (aromaRun.wasActive && !active) {
    aromaRun.wasActive = false;
    if (player.aromaTable.active) {
      player.aromaTable.active = null;
      savePetState();
    }
    aromaRun.lastAction = 'faded';
    if (gameMode === 'pet') setPlayerEmote('香氛慢慢散去啦，房间又回到原来的颜色~', 1.8, 'happy', false);
    syncAromaTableUI();
    return;
  }
  aromaRun.wasActive = Boolean(active);
  if (!active && player.aromaTable.active && Number(player.aromaTable.active.endMs) <= ar14Clock.now()) {
    // 旧存档里早已散去的香氛：静默清掉
    player.aromaTable.active = null;
    savePetState();
  }
  if (dayKey !== aromaRun.dayKey) {
    aromaRun.dayKey = dayKey;
    potteryRun.dayKey = dayKey;
    syncPotteryWheelUI();
    syncAromaTableUI();
  } else if (active || isAr14CardOpen('aroma')) {
    syncAromaTableUI();
  } else {
    syncPotteryAromaPill();
  }
}

let amMoodRowKey = null;
let amCodexKey = null;

function syncAromaAmbientOverlay(activeIn) {
  const overlay = document.getElementById('aroma-ambient-overlay');
  if (!overlay) return;
  const active = activeIn === undefined ? getActiveAroma() : activeIn;
  const show = Boolean(active && gameMode === 'pet');
  overlay.classList.toggle('hidden', !show);
  if (active) {
    overlay.style.setProperty('--aroma-mood', active.moodRgb);
    overlay.style.setProperty('--aroma-season', active.seasonRgb);
    overlay.dataset.mood = active.moodId;
    overlay.dataset.season = active.seasonId;
    overlay.dataset.kelvin = String(active.kelvin);
  } else {
    overlay.dataset.mood = '';
  }
}

function syncAromaTableUI() {
  const at = player.aromaTable;
  if (!at) return;
  const d = ar14Clock.date();
  const stats = getAromaStats(d);
  const season = AROMA_SEASONS[stats.seasonId];
  const active = stats.active;
  const cardOpen = isAr14CardOpen('aroma');
  const mood = AROMA_MOOD_BY_ID[aromaRun.moodId] || null;
  const recipe = mood ? getAromaRecipe(stats.seasonId, mood.id) : null;
  const disc = at.discovered || {};

  if (amSummaryPillEl) amSummaryPillEl.textContent = `香氛 ${stats.totalBlends} 次 · 图鉴 ${stats.discovered}/${stats.totalRecipes}`;
  if (amSeasonRowEl) amSeasonRowEl.dataset.season = season.id;
  if (amSeasonIcoEl && amSeasonIcoEl.getAttribute('src') !== season.icon) amSeasonIcoEl.setAttribute('src', season.icon);
  if (amSeasonNameEl) amSeasonNameEl.textContent = `${season.name} · ${season.note}`;
  if (amSeasonSubEl) {
    amSeasonSubEl.textContent = active
      ? `点香中「${active.name}」 · 还剩 ${active.minsLeft} 分`
      : `${d.getMonth() + 1}月${d.getDate()}日 · 按本地日期取当季基调`;
  }
  if (amBottleStageEl) {
    amBottleStageEl.dataset.mood = mood ? mood.id : '';
    amBottleStageEl.dataset.lit = active ? '1' : '0';
    amBottleStageEl.style.setProperty('--mood-rgb', active ? active.moodRgb : mood ? mood.rgb : '252, 240, 222');
  }
  amDropEls.forEach((el, i) => el.classList.toggle('filled', i < aromaRun.drops));
  if (amStageTagEl) {
    amStageTagEl.textContent = active
      ? `${active.tone} · ${active.kelvin}K`
      : mood
        ? `${mood.name} · 滴入 ${aromaRun.drops}/${AROMA_RULES.drops}`
        : '还没选心情';
  }

  if (amMoodRowEl) {
    const mKey = AROMA_MOODS.map((m) => m.id).join(',');
    if (mKey !== amMoodRowKey) {
      amMoodRowKey = mKey;
      amMoodRowEl.innerHTML = AROMA_MOODS.map(
        (m) => `<button type="button" class="am-mood-chip" data-mood-id="${m.id}" style="--mood-rgb:${m.rgb}">
            <img src="${m.img}" alt="" class="am-mood-ico" />
            <span class="am-mood-meta">
              <span class="am-mood-name">${m.name}</span>
              <em class="am-mood-note">${m.note}</em>
            </span>
          </button>`
      ).join('');
    }
    amMoodRowEl.querySelectorAll('.am-mood-chip').forEach((chip) => {
      const mid = chip.dataset.moodId;
      chip.classList.toggle('active', mood ? mood.id === mid : false);
      chip.classList.toggle('is-found', Number(disc[`${stats.seasonId}_${mid}`]) > 0);
      chip.title = `${AROMA_MOOD_BY_ID[mid].name} · ${getAromaRecipe(stats.seasonId, mid).name} · 色温约 ${AROMA_MOOD_BY_ID[mid].kelvin}K`;
    });
  }
  if (amRecipeLineEl) {
    amRecipeLineEl.textContent = recipe
      ? `「${recipe.name}」 · ${recipe.tone}色温约 ${recipe.kelvin}K${Number(disc[recipe.id]) > 0 ? ' · 已收录' : ' · 新香氛'}`
      : '香调 = 当季基调 + 心情心调 + 她的小心意';
  }

  const mainState = getAromaMainState();
  if (btnAromaMainEl) {
    btnAromaMainEl.disabled = mainState.disabled;
    btnAromaMainEl.textContent = mainState.label;
    btnAromaMainEl.dataset.mode = mainState.mode;
    btnAromaMainEl.classList.toggle('is-ready', !mainState.disabled && mainState.mode === 'light');
  }
  btnAromaStopEl?.classList.toggle('hidden', !active);

  if (amCodexGridEl) {
    const cKey = `${stats.seasonId}|${AROMA_MOODS.map((m) => (Number(disc[`${stats.seasonId}_${m.id}`]) > 0 ? 1 : 0)).join('')}|${active ? active.id : ''}`;
    if (cKey !== amCodexKey) {
      amCodexKey = cKey;
      amCodexGridEl.innerHTML = AROMA_MOODS.map((m) => {
        const r = getAromaRecipe(stats.seasonId, m.id);
        const found = Number(disc[r.id]) > 0;
        const lit = Boolean(active && active.id === r.id);
        return `<span class="am-codex-chip${found ? ' is-found' : ''}${lit ? ' is-lit' : ''}" data-recipe-id="${r.id}" style="--mood-rgb:${m.rgb}" title="${r.name}${found ? ' · 已收录' : ' · 未收录'}">
            <img src="${m.img}" alt="" class="am-codex-ico" />
            <em class="am-codex-tag">${found ? m.note : '待收录'}</em>
          </span>`;
      }).join('');
    }
  }
  if (amCodexSubEl) {
    amCodexSubEl.textContent = `香氛图鉴 ${stats.discovered}/${stats.totalRecipes} · 当季「${season.note}」${stats.seasonFound}/${AROMA_MOODS.length} · 今日奖励 ${stats.rewardsToday}/${stats.dailyRewards}`;
  }
  if (amFooterLineEl) {
    amFooterLineEl.textContent = active
      ? `香氛舒心「${active.name}」：房间${active.tone}色温约 ${active.kelvin}K，还剩 ${active.minsLeft} 分钟，日常亲密 +${Math.round(AROMA_RULES.affectionBonus * 100)}%`
      : `香氛舒心：滴满 3 滴点香后 ${AROMA_RULES.durationMin} 分钟，房间换上心情色温、日常亲密 +${Math.round(AROMA_RULES.affectionBonus * 100)}%；每天前 ${AROMA_RULES.dailyRewards} 次调香 +${AROMA_RULES.coinReward} 金币，新香氛再 +${AROMA_RULES.newRecipeCoins}`;
  }

  syncAromaAmbientOverlay(active);
  const av = player.aromaVisual;
  av.active = Boolean(active);
  av.blending = cardOpen;
  av.moodRgb = active ? active.moodRgb : mood ? mood.rgb : '';
  av.seasonRgb = active ? active.seasonRgb : season.rgb;
  av.label = active ? `${active.tone} · ${active.minsLeft}分` : '香氛台';
  av.drops = aromaRun.drops;
  av.cheer = player.aromaCheerTimer || 0;
  syncPotteryAromaPill(null, stats);
}

// ---------------- AR-14 合并紧凑胶囊：陶艺佑护 / 烧制中 + 点香倒计时，窄屏放不下就收起 ----------------
function syncPotteryAromaPill(psIn = null, asIn = null) {
  if (!paPillEl) return;
  const ps = psIn || getPotteryStats();
  const as = asIn || getAromaStats();
  const firing = potteryRun.phase === 'firing';
  const showPottery = firing || ps.wardCharges > 0;
  const showAroma = Boolean(as.active);
  paPillEl.classList.toggle('hidden', !(gameMode === 'pet' && (showPottery || showAroma)));
  paPillEl.classList.toggle('has-aroma', showAroma);
  paSegPotteryEl?.classList.toggle('hidden', !showPottery);
  paSegAromaEl?.classList.toggle('hidden', !showAroma);
  // 点香倒计时更有时效：两段都在时优先留香氛段
  paSegAromaEl?.classList.toggle('is-priority', showAroma);
  paSegPotteryEl?.classList.toggle('is-priority', !showAroma);
  if (paPillPotteryEl) paPillPotteryEl.textContent = firing ? '烧制' : `护${ps.wardCharges}`;
  if (paPillAromaEl) paPillAromaEl.textContent = as.active ? `${as.active.minsLeft}分` : '';
  if (as.active) paPillEl.style.setProperty('--mood-rgb', as.active.moodRgb);
  const wg = POTTERY_GLAZE_BY_ID[ps.wardGlazeId];
  paPillEl.title = `${firing ? '小窑烧制中' : ps.wardCharges > 0 && wg ? `陶艺佑护『${wg.wardName}』还剩 ${ps.wardCharges} 个班次` : '窗畔陶艺转盘'} · ${as.active ? `香氛「${as.active.name}」还剩 ${as.active.minsLeft} 分钟` : '香氛调配台'}`;
  fitPotteryAromaPill();
}

// 与 AR-11 ~ AR-13 同一条规则：窄屏胶囊行已排满时不为 AR-14 胶囊新开一行（offsetTop 不受旋转舞台变换影响），
// 两段都放不下先只留优先的一段，仍放不下才整颗收起；只读 DOM，任何区段初始化时调用都不会触发 TDZ
function fitPotteryAromaPill() {
  const fitted = fitPotteryAromaPillOnly();
  // AR-15 合并胶囊排在其后：AR-14 胶囊显隐 / 收起变化后立刻复核 AR-15 胶囊是否还放得下
  fitStarRainPill();
  return fitted;
}

function fitPotteryAromaPillOnly() {
  const pill = document.getElementById('pottery-aroma-pill');
  if (!pill) return false;
  pill.classList.remove('pa-no-room', 'pa-solo');
  if (pill.classList.contains('hidden') || pill.offsetParent === null) return false;
  const compact = window.matchMedia ? window.matchMedia('(max-width: 920px), (max-height: 430px)') : null;
  if (!compact || !compact.matches) return true;
  const row = pill.parentElement;
  const others = row
    ? Array.from(row.children).filter(
        (b) => b !== pill && b.id !== 'star-rain-pill' && b.id !== 'stitch-hearth-pill' && !b.classList.contains('hidden') && b.offsetParent !== null
      )
    : [];
  if (!others.length) return true;
  const mid = (b) => b.offsetTop + b.offsetHeight / 2;
  const lastRowMid = Math.max(...others.map(mid));
  if (mid(pill) <= lastRowMid + 6) return true;
  const shownSegs = Array.from(pill.querySelectorAll('.pa-seg')).filter((s) => !s.classList.contains('hidden'));
  if (shownSegs.length > 1) {
    pill.classList.add('pa-solo');
    if (mid(pill) <= lastRowMid + 6) return true;
    pill.classList.remove('pa-solo');
  }
  pill.classList.add('pa-no-room');
  return false;
}

function openAr14Card(cardEl) {
  if (!cardEl) return;
  if (gameMode !== 'pet') switchMode('pet');
  closeDrawer();
  dismissTopicCard();
  dismissWindowAmbienceCard();
  foldOrHidePomodoroCard();
  dismissTeatimeCard();
  dismissWeeklyJournalCard();
  dismissTerrariumCard();
  foldOrHideGoodnightCard();
  dismissCollageCard();
  foldOrHideCozyRadioCard();
  dismissCrochetCard();
  dismissHotCocoaCard();
  dismissPressedFlowerCard();
  dismissTelescopeCard();
  dismissAr10Cards();
  dismissAr11Cards();
  dismissAr12Cards();
  dismissAr13Cards();
  dismissAr14Cards(); dismissAr15Cards(); dismissAr16Cards();
  dismissPolaroid();
  closeAlbumLightbox();
  cardEl.classList.remove('hidden');
}

function openPotteryWheelCard() {
  if (!potteryCardEl) return { ok: false };
  openAr14Card(potteryCardEl);
  syncPotteryWheelUI();
  syncAromaTableUI();
  return { ok: true };
}

function openAromaTableCard() {
  if (!aromaCardEl) return { ok: false };
  openAr14Card(aromaCardEl);
  syncAromaTableUI();
  syncPotteryWheelUI();
  return { ok: true };
}

function handleAr14CanvasTap(pt) {
  const pv = player.potteryVisual;
  const shelf = getPotteryShelfLayout(W, H, player.sillCamX || 0, pv && Array.isArray(pv.pieces) ? pv.pieces.length : 0);
  const sh = shelf.hit;
  if (pt.x >= sh.x && pt.x <= sh.x + sh.w && pt.y >= sh.y && pt.y <= sh.y + sh.h) {
    openPotteryWheelCard();
    petAudio.playPotteryWheel(0);
    return true;
  }
  const A = getAromaTableDeskAnchor(W, H);
  if (Math.hypot(pt.x - A.hit.x, pt.y - A.hit.y) < A.hit.r) {
    openAromaTableCard();
    petAudio.playAromaDrop(0);
    return true;
  }
  return false;
}

let paPillFitTimer = 0;
function updateAr14Companions(dt) {
  if (player.potteryCheerTimer > 0) player.potteryCheerTimer = Math.max(0, player.potteryCheerTimer - dt);
  if (player.aromaCheerTimer > 0) player.aromaCheerTimer = Math.max(0, player.aromaCheerTimer - dt);
  if (potteryRun.spinFlash > 0) {
    potteryRun.spinFlash = Math.max(0, potteryRun.spinFlash - dt);
    if (potteryRun.spinFlash <= 0 && potteryRun.phase !== 'firing') pwWheelEl?.classList.remove('is-spinning');
  }
  if (potteryRun.phase === 'firing') {
    potteryRun.fireLeft -= dt;
    if (potteryRun.fireLeft <= 0) finishPottery();
  }
  aromaRun.tickAcc -= dt;
  if (aromaRun.tickAcc <= 0) {
    aromaRun.tickAcc = 1;
    refreshAr14Clock();
  }
  paPillFitTimer -= dt;
  if (paPillFitTimer <= 0) {
    paPillFitTimer = 0.5;
    fitPotteryAromaPill();
  }
  const pv = player.potteryVisual;
  pv.shaping = isAr14CardOpen('pottery');
  pv.cheer = player.potteryCheerTimer || 0;
  const av = player.aromaVisual;
  av.blending = isAr14CardOpen('aroma');
  av.cheer = player.aromaCheerTimer || 0;
}

if (potteryCardEl) {
  potteryCardEl.addEventListener('pointerdown', (e) => e.stopPropagation());
}
if (aromaCardEl) {
  aromaCardEl.addEventListener('pointerdown', (e) => e.stopPropagation());
}

bindHudTap(document.getElementById('btn-pottery-close'), () => {
  dismissPotteryWheelCard();
  syncPotteryWheelUI();
});
bindHudTap(pwShapeRowEl, (e) => {
  const chip = e.target && e.target.closest ? e.target.closest('.pw-shape-chip') : null;
  if (chip && !chip.disabled) pickPotteryShape(chip.dataset.shapeId);
});
bindHudTap(pwGlazeRowEl, (e) => {
  const chip = e.target && e.target.closest ? e.target.closest('.pw-glaze-chip') : null;
  if (chip && !chip.disabled) pickPotteryGlaze(chip.dataset.glazeId);
});
// 点转盘本身也能拉坯（拉坯阶段）/ 上釉 / 入窑，和主按钮同一个动作
bindHudTap(pwWheelEl, () => {
  const st = getPotteryMainState();
  if (!st.disabled && st.mode !== 'again') handlePotteryMainAction();
});
bindHudTap(btnPotteryHelperEl, () => {
  if (btnPotteryHelperEl.disabled) return;
  potteryHelper();
});
bindHudTap(btnPotteryMainEl, () => {
  if (btnPotteryMainEl.disabled) return;
  handlePotteryMainAction();
});
bindHudTap(btnPotteryGoShiftEl, () => {
  dismissPotteryWheelCard();
  switchMode('survivor');
});
bindHudTap(pwShelfGridEl, (e) => {
  const chip = e.target && e.target.closest ? e.target.closest('.pw-shelf-chip') : null;
  if (!chip) return;
  const entry = player.potteryWheel.pieces.find((x) => x.id === chip.dataset.pieceId);
  if (!entry) return;
  const sh = POTTERY_SHAPE_BY_ID[entry.shapeId];
  const gl = POTTERY_GLAZE_BY_ID[entry.glazeId];
  playSfx('pat');
  setPlayerEmote(`${entry.date.slice(5).replace('-', '/')} 烧好的${gl.name}${sh.short}，摆在陶艺架上闪闪发光~`, 2.2, 'happy', false);
});

bindHudTap(document.getElementById('btn-aroma-close'), () => {
  dismissAromaTableCard();
  syncAromaTableUI();
});
bindHudTap(amMoodRowEl, (e) => {
  const chip = e.target && e.target.closest ? e.target.closest('.am-mood-chip') : null;
  if (chip && !chip.disabled) pickAromaMood(chip.dataset.moodId);
});
// 点香氛瓶也能滴精油（和主按钮同一个动作）
bindHudTap(amBottleStageEl, () => {
  const st = getAromaMainState();
  if (!st.disabled && st.mode === 'drop') addAromaDrop();
});
bindHudTap(btnAromaHelperEl, () => {
  if (btnAromaHelperEl.disabled) return;
  aromaHelper();
});
bindHudTap(btnAromaMainEl, () => {
  if (btnAromaMainEl.disabled) return;
  handleAromaMainAction();
});
bindHudTap(btnAromaStopEl, () => {
  stopAroma();
});
bindHudTap(paPillEl, (e) => {
  const segEl = e.target && e.target.closest ? e.target.closest('[data-pa-seg]') : null;
  const seg = segEl ? segEl.dataset.paSeg : getActiveAroma() ? 'aroma' : 'pottery';
  if (seg === 'aroma') openAromaTableCard();
  else openPotteryWheelCard();
});

window.addEventListener('resize', () => {
  requestAnimationFrame(() => fitPotteryAromaPill());
});

aromaRun.dayKey = formatLocalDateKey(ar14Clock.date());
potteryRun.dayKey = aromaRun.dayKey;
aromaRun.wasActive = Boolean(getActiveAroma());
syncPotteryWheelUI();
syncAromaTableUI();

window.__AR14_DEBUG__ = {
  getSpecs() {
    return JSON.parse(
      JSON.stringify({
        shapes: POTTERY_SHAPES,
        glazes: POTTERY_GLAZES,
        potteryRules: POTTERY_RULES,
        seasons: AROMA_SEASONS,
        moods: AROMA_MOODS,
        aromaRules: AROMA_RULES
      })
    );
  },
  // 可注入时钟：传毫秒或本地时间字符串固定“现在”（季节基调 / 点香剩余 / 每日奖励都跟着走）
  setClock(value) {
    const ms = typeof value === 'number' ? value : new Date(value).getTime();
    if (!Number.isFinite(ms)) return { ok: false, reason: 'invalid_clock' };
    ar14Clock.fixedMs = ms;
    ar14Clock.offsetMs = 0;
    refreshAr14Clock();
    syncPotteryWheelUI();
    syncAromaTableUI();
    return { ok: true, now: ms, seasonId: getAromaSeasonId() };
  },
  advanceClock(ms) {
    const step = Math.max(0, Number(ms) || 0);
    if (ar14Clock.fixedMs !== null) ar14Clock.fixedMs += step;
    else ar14Clock.offsetMs += step;
    refreshAr14Clock();
    syncPotteryWheelUI();
    syncAromaTableUI();
    return { ok: true, now: ar14Clock.now(), active: getActiveAroma() };
  },
  useRealClock() {
    ar14Clock.fixedMs = null;
    ar14Clock.offsetMs = 0;
    refreshAr14Clock();
    syncPotteryWheelUI();
    syncAromaTableUI();
    return { ok: true, now: ar14Clock.now() };
  },
  openPottery() {
    return openPotteryWheelCard();
  },
  openAroma() {
    return openAromaTableCard();
  },
  pickShape(id) {
    return pickPotteryShape(id);
  },
  spin() {
    return spinPotteryWheel();
  },
  pickGlaze(id) {
    return pickPotteryGlaze(id);
  },
  glaze() {
    return glazePottery();
  },
  fire() {
    return firePottery();
  },
  // 测试用：不等小窑倒计时，立刻出窑
  finishFiring() {
    if (potteryRun.phase !== 'firing') return { ok: false, reason: potteryRun.phase };
    potteryRun.fireLeft = 0;
    return { ok: true, ...finishPottery() };
  },
  potteryHelper() {
    return potteryHelper();
  },
  potteryMain() {
    return handlePotteryMainAction();
  },
  getPotteryMainState() {
    return getPotteryMainState();
  },
  getPotteryRun() {
    return JSON.parse(JSON.stringify(potteryRun));
  },
  resetPotteryForTest() {
    resetPotteryDraft();
    potteryRun.lastResult = null;
    syncPotteryWheelUI();
    return { ok: true };
  },
  pickMood(id) {
    return pickAromaMood(id);
  },
  drop() {
    return addAromaDrop();
  },
  light() {
    return lightAroma();
  },
  stopAroma() {
    return stopAroma();
  },
  aromaHelper() {
    return aromaHelper();
  },
  aromaMain() {
    return handleAromaMainAction();
  },
  getAromaMainState() {
    return getAromaMainState();
  },
  getAromaRun() {
    return JSON.parse(JSON.stringify(aromaRun));
  },
  resetAromaForTest() {
    aromaRun.moodId = '';
    aromaRun.drops = 0;
    syncAromaTableUI();
    return { ok: true };
  },
  // 测试用：读出当前亲密度收获的总倍率（不改任何状态），验证点香期间整体 ×1.1
  getAffectionMults() {
    return { aroma: getAromaAffectionMult(), total: Number(getAffectionXpMult().toFixed(4)) };
  },
  getLayouts() {
    const pv = player.potteryVisual;
    return {
      shelf: getPotteryShelfLayout(W, H, player.sillCamX || 0, pv && Array.isArray(pv.pieces) ? pv.pieces.length : 0),
      diffuser: getAromaTableDeskAnchor(W, H),
      player: { x: player.x, y: player.y },
      sillCamX: player.sillCamX || 0,
      W,
      H
    };
  },
  placePlayerForTest(xRatio = 0.5) {
    player.x = Math.max(40, Math.min(W - 40, W * (Number(xRatio) || 0.5)));
    player.vx = 0;
    player.wanderTargetX = null;
    player.idleTime = 0;
    return { x: player.x, y: player.y };
  },
  getState(customDateIso = '') {
    const now = ar14Clock.now();
    const refDate = customDateIso ? new Date(customDateIso) : new Date(now);
    const overlay = document.getElementById('aroma-ambient-overlay');
    return {
      gameMode,
      now,
      clockFixed: ar14Clock.fixedMs !== null,
      coins: player.coins,
      level: player.level,
      xp: player.xp,
      emote: player.emote,
      potteryWheel: JSON.parse(JSON.stringify(player.potteryWheel)),
      potteryStats: getPotteryStats(new Date(now)),
      potteryRun: JSON.parse(JSON.stringify(potteryRun)),
      potteryVisual: JSON.parse(JSON.stringify(player.potteryVisual)),
      potteryMain: getPotteryMainState(),
      shiftPottery: survivorRun.pottery ? { ...survivorRun.pottery } : null,
      potteryWard: getPotteryShiftWard(),
      aromaTable: JSON.parse(JSON.stringify(player.aromaTable)),
      aromaStats: getAromaStats(new Date(now)),
      aromaRun: JSON.parse(JSON.stringify(aromaRun)),
      aromaVisual: JSON.parse(JSON.stringify(player.aromaVisual)),
      aromaMain: getAromaMainState(),
      aromaAffectionMult: getAromaAffectionMult(),
      overlay: overlay
        ? {
            shown: !overlay.classList.contains('hidden'),
            mood: overlay.dataset.mood || '',
            season: overlay.dataset.season || '',
            kelvin: Number(overlay.dataset.kelvin) || 0
          }
        : null,
      ar14Audio: petAudio.getAr14AudioInfo(),
      journalSummary: computeWeeklyJournalSummary(refDate),
      survivorMetrics: window.__AR5_DEBUG__.getSurvivorEffectiveMetrics(),
      openPanels: window.__AR5_DEBUG__.getState(customDateIso).openPanels
    };
  }
};

// ================= AR-15 卧室星空投影灯 & 窗边听雨角 =================
// 船坞仍是 25 键、书桌已满：两张卡不加新键，入口 = 「家具与装扮」抽屉快捷卡 + 场景点击（窗边飘台上的星空投影灯 / 听雨坐垫与雨滴风铃）+ 合并胶囊
const starCardEl = document.getElementById('star-projector-card');
const spSummaryPillEl = document.getElementById('sp-summary-pill');
const spNightRowEl = document.getElementById('sp-night-row');
const spNightNameEl = document.getElementById('sp-night-name');
const spNightSubEl = document.getElementById('sp-night-sub');
const spDomeEl = document.getElementById('sp-dome');
const spSkyEl = document.getElementById('sp-sky');
const spDomeTagEl = document.getElementById('sp-dome-tag');
const spCardRowEl = document.getElementById('sp-card-row');
const spStoryLineEl = document.getElementById('sp-story-line');
const btnStarHelperEl = document.getElementById('btn-star-helper');
const btnStarMainEl = document.getElementById('btn-star-main');
const btnStarOffEl = document.getElementById('btn-star-off');
const spAlbumSubEl = document.getElementById('sp-album-sub');
const spAlbumGridEl = document.getElementById('sp-album-grid');
const spFooterLineEl = document.getElementById('sp-footer-line');

const rainCardEl = document.getElementById('rain-corner-card');
const rcSummaryPillEl = document.getElementById('rc-summary-pill');
const rcWeatherRowEl = document.getElementById('rc-weather-row');
const rcWeatherIcoEl = document.getElementById('rc-weather-ico');
const rcWeatherNameEl = document.getElementById('rc-weather-name');
const rcWeatherSubEl = document.getElementById('rc-weather-sub');
const rcWindowEl = document.getElementById('rc-window');
const rcStageTagEl = document.getElementById('rc-stage-tag');
const rcVolumeRowEl = document.getElementById('rc-volume-row');
const rcMixLineEl = document.getElementById('rc-mix-line');
const btnRainHelperEl = document.getElementById('btn-rain-helper');
const btnRainMainEl = document.getElementById('btn-rain-main');
const rcCodexSubEl = document.getElementById('rc-codex-sub');
const rcCodexGridEl = document.getElementById('rc-codex-grid');
const rcFooterLineEl = document.getElementById('rc-footer-line');

const srPillEl = document.getElementById('star-rain-pill');
const srSegStarEl = document.getElementById('sr-seg-star');
const srSegRainEl = document.getElementById('sr-seg-rain');
const srPillStarEl = document.getElementById('sr-pill-star');
const srPillRainEl = document.getElementById('sr-pill-rain');

const RAIN_RING_LINES = [
  '叮——风铃上挂着的雨滴也跟着晃了一下~',
  '听，雨滴顺着风铃一颗颗滑下来了~',
  '窗外的雨和风铃在合奏呢，好安静~',
  '靠在坐垫上，什么都不用想~'
];

function isAr15CardOpen(which = '') {
  const sp = document.getElementById('star-projector-card');
  const rc = document.getElementById('rain-corner-card');
  const spOpen = Boolean(sp && !sp.classList.contains('hidden'));
  const rcOpen = Boolean(rc && !rc.classList.contains('hidden'));
  if (which === 'star') return spOpen;
  if (which === 'rain') return rcOpen;
  return spOpen || rcOpen;
}

function dismissStarProjectorCard() {
  document.getElementById('star-projector-card')?.classList.add('hidden');
}

function dismissRainCornerCard() {
  document.getElementById('rain-corner-card')?.classList.add('hidden');
}

// 只碰 DOM：其它卡片在模块初始化期间调用也不会触发 TDZ
function dismissAr15Cards() {
  dismissStarProjectorCard();
  dismissRainCornerCard();
}

// ---------------- 卧室星空投影灯：挑一张当季星座卡 → 转动投影罩对准亮星 → 点亮投影 → 一起晚安盖好梦章 ----------------
function isStarCardUnlocked(cardId, d = ar15Clock.date()) {
  const card = STAR_CARD_BY_ID[cardId];
  if (!card) return false;
  const owned = Number(player.starProjector.cards[cardId] && player.starProjector.cards[cardId].lights) > 0;
  return owned || card.season === getAromaSeasonId(d);
}

function pickStarCard(cardId) {
  const card = STAR_CARD_BY_ID[cardId];
  if (!card) return { ok: false, reason: 'invalid_card' };
  const d = ar15Clock.date();
  const seasonId = getAromaSeasonId(d);
  const owned = Number(player.starProjector.cards[cardId] && player.starProjector.cards[cardId].lights) > 0;
  if (card.season !== seasonId && !owned) {
    starRun.lastAction = 'locked';
    playSfx('pat');
    setPlayerEmote(`「${card.name}」要等到${STAR_SEASON_NAMES[card.season]}天的夜空才能投影哦，先收集当季的星座卡吧~`, 2.2, 'happy', false);
    syncStarProjectorUI();
    return { ok: false, reason: 'out_of_season', season: card.season };
  }
  const same = starRun.cardId === cardId && starRun.phase === 'dial';
  starRun.cardId = cardId;
  if (!same) {
    starRun.taps = 0;
    starRun.phase = 'dial';
  }
  starRun.lastAction = 'pick';
  player.starProjector.lastCardId = cardId;
  player.idleTime = 0;
  playSfx('pat');
  setPlayerEmote(`今晚投「${card.name}」！一共 ${card.taps} 颗亮星，转动投影罩把它们一颗颗对准吧~`, 2.2, 'happy', false);
  syncStarProjectorUI();
  return { ok: true, cardId, same, owned, inSeason: card.season === seasonId };
}

function dialStarProjector() {
  const card = STAR_CARD_BY_ID[starRun.cardId];
  if (!card) {
    setPlayerEmote('先挑一张星座卡吧~', 1.6, 'happy', false);
    return { ok: false, reason: 'no_card' };
  }
  if (starRun.phase === 'lit') return { ok: false, reason: 'lit' };
  if (starRun.taps >= card.taps) return { ok: false, reason: 'full' };
  starRun.phase = 'dial';
  starRun.taps += 1;
  starRun.spinFlash = 0.5;
  starRun.lastAction = 'dial';
  player.idleTime = 0;
  player.happyTimer = 0.7;
  petAudio.playStarDial(starRun.taps);
  petAudio.haptic('tap');
  const starName = card.starNames[starRun.taps - 1] || '小星星';
  setPlayerEmote(
    starRun.taps >= card.taps
      ? `「${card.name}」的 ${card.taps} 颗亮星都对准啦，点亮投影吧~`
      : `第 ${starRun.taps} 颗：${starName}，对准啦~`,
    1.6,
    'happy',
    false
  );
  syncStarProjectorUI();
  return { ok: true, taps: starRun.taps, need: card.taps, star: starName, audio: petAudio.getAr15AudioInfo() };
}

function lightStarProjection(nowMs = ar15Clock.now()) {
  const card = STAR_CARD_BY_ID[starRun.cardId];
  if (!card) return { ok: false, reason: 'no_card' };
  if (starRun.phase === 'lit') return { ok: false, reason: 'lit' };
  if (starRun.taps < card.taps) return { ok: false, reason: 'taps', taps: starRun.taps };
  const sp = player.starProjector;
  const d = new Date(nowMs);
  const todayKey = formatLocalDateKey(d);
  const prev = sp.cards[card.id];
  const isNew = !(prev && prev.lights > 0);
  sp.cards[card.id] = {
    lights: (prev ? prev.lights : 0) + 1,
    dreams: prev ? prev.dreams || 0 : 0,
    first: prev && prev.first ? prev.first : todayKey
  };
  sp.totalLights = (sp.totalLights || 0) + 1;
  sp.active = {
    cardId: card.id,
    startMs: Math.round(nowMs),
    endMs: Math.round(nowMs + STAR_RULES.durationMin * 60000)
  };
  sp.lastCardId = card.id;
  if (sp.rewardDate !== todayKey) {
    sp.rewardDate = todayKey;
    sp.rewardCount = 0;
  }
  const bedtime = isStarBedtime(d);
  let reward = null;
  if (sp.rewardCount < STAR_RULES.dailyRewards) {
    sp.rewardCount += 1;
    const m = bedtime ? STAR_RULES.bedtimeMult : 1;
    reward = {
      coins: Math.round((STAR_RULES.coinReward + (isNew ? STAR_RULES.newCardCoins : 0)) * m),
      xp: Math.round(STAR_RULES.xpReward * m)
    };
  }
  starRun.phase = 'lit';
  starRun.taps = 0;
  starRun.wasActive = true;
  starRun.lastAction = 'lit';
  player.idleTime = 0;
  player.happyTimer = 2;
  player.starCheerTimer = 3.5;
  petAudio.playStarProject(STAR_CARDS.indexOf(card));
  petAudio.haptic('headpat');
  spawnInteractVfx(player.x, player.y - 28, 'sparkle', 9);
  recordJournalActivity('stars', 1, d);
  if (reward) {
    addCoins(reward.coins, player.x + 24, player.y - 44, '星空 ');
    addAffectionXp(reward.xp, bedtime ? '睡前一起点亮星空' : '点亮星座投影');
  }
  setPlayerEmote(`${isNew ? '新的星座卡！' : ''}「${card.name}」投到天花板上啦~ ${card.story}`, 3.2, 'cheer', true);
  starRun.lastResult = {
    cardId: card.id,
    name: card.name,
    isNew,
    bedtime,
    reward,
    endMs: sp.active.endMs,
    lights: sp.cards[card.id].lights,
    collected: getStarStats(d).collected
  };
  savePetState();
  syncStarProjectorUI();
  syncDiaryBookUI();
  return { ok: true, ...starRun.lastResult, audio: petAudio.getAr15AudioInfo() };
}

function stopStarProjection() {
  if (!getActiveProjection()) return { ok: false, reason: 'not_active' };
  player.starProjector.active = null;
  starRun.wasActive = false;
  starRun.lastAction = 'off';
  if (starRun.phase === 'lit') {
    starRun.phase = STAR_CARD_BY_ID[starRun.cardId] ? 'dial' : 'pick';
    starRun.taps = 0;
  }
  playSfx('pat');
  setPlayerEmote('星空灯先关掉啦，星星们下次睡前再见~', 1.8, 'happy', false);
  savePetState();
  syncStarProjectorUI();
  return { ok: true };
}

// 晚安联动：投影还亮着时「一起晚安」直接旋开晚安星空八音盒；伴眠结算时给这张星座卡盖好梦章
function startStarGoodnight() {
  const active = getActiveProjection();
  if (!active) return { ok: false, reason: 'not_active' };
  if (goodnightRun.status === 'running') return { ok: false, reason: 'running' };
  starRun.lastAction = 'goodnight';
  startGoodnightSession();
  setPlayerEmote(`「${active.name}」陪我们一起晚安~ 伴眠结束时这张星座卡会盖上好梦章哦zzZ`, 3.0, 'sleep', true);
  syncStarProjectorUI();
  return { ok: true, goodnight: goodnightRun.status, cardId: active.cardId };
}

function awardStarDream(active, d = ar15Clock.date()) {
  const card = active ? STAR_CARD_BY_ID[active.cardId] : null;
  if (!card) return null;
  const sp = player.starProjector;
  const todayKey = formatLocalDateKey(d);
  const rec = sp.cards[card.id] || { lights: 1, dreams: 0, first: todayKey };
  rec.dreams = (rec.dreams || 0) + 1;
  sp.cards[card.id] = rec;
  sp.totalDreams = (sp.totalDreams || 0) + 1;
  if (sp.dreamDate !== todayKey) {
    sp.dreamDate = todayKey;
    sp.dreamCount = 0;
  }
  let reward = null;
  if (sp.dreamCount < STAR_RULES.dreamDailyMax) {
    sp.dreamCount += 1;
    reward = { coins: STAR_RULES.dreamCoins, xp: STAR_RULES.dreamXp };
    addCoins(reward.coins, player.x - 24, player.y - 52, '好梦星签 ');
    addAffectionXp(reward.xp, '星空下的好梦');
  }
  player.starCheerTimer = 3;
  petAudio.playStarDream();
  setPlayerEmote(`好梦章盖在「${card.name}」星座卡上啦（第 ${rec.dreams} 枚）！今晚的星星都在守着我们~`, 3.0, 'cheer', true);
  starRun.lastDream = { cardId: card.id, dreams: rec.dreams, totalDreams: sp.totalDreams, reward };
  savePetState();
  syncStarProjectorUI();
  return { ...starRun.lastDream };
}

function getStarMainState() {
  const card = STAR_CARD_BY_ID[starRun.cardId];
  const active = getActiveProjection();
  if (starRun.phase === 'lit') {
    if (active && active.cardId === starRun.cardId) {
      if (goodnightRun.status === 'running') return { mode: 'sleeping', disabled: true, label: '伴眠中…' };
      return { mode: 'goodnight', disabled: false, label: '一起晚安' };
    }
    return { mode: 'again', disabled: !card, label: '再投一次' };
  }
  if (!card) return { mode: 'pick', disabled: true, label: '先挑星座卡' };
  if (starRun.taps < card.taps) return { mode: 'dial', disabled: false, label: `转动投影罩 ${starRun.taps}/${card.taps}` };
  return { mode: 'project', disabled: false, label: active ? '换上这张 · 点亮' : '点亮投影' };
}

function handleStarMainAction() {
  const st = getStarMainState();
  if (st.disabled) return { ok: false, reason: st.mode };
  if (st.mode === 'dial') return dialStarProjector();
  if (st.mode === 'project') return lightStarProjection();
  if (st.mode === 'goodnight') return startStarGoodnight();
  starRun.phase = 'dial';
  starRun.taps = 0;
  starRun.lastAction = 'again';
  playSfx('pat');
  setPlayerEmote('再转一次投影罩，把星星重新请回天花板~', 1.6, 'happy', false);
  syncStarProjectorUI();
  return { ok: true, phase: 'dial' };
}

// 她来点亮：没挑卡时先挑当季还没收集的那张（都收过就按日期轮换），再一口气对准全部亮星并点亮
function starHelper() {
  starRun.helperSeq += 1;
  const d = ar15Clock.date();
  if (starRun.phase === 'lit' || !STAR_CARD_BY_ID[starRun.cardId] || !isStarCardUnlocked(starRun.cardId, d)) {
    const seasonCards = getStarSeasonCards(getAromaSeasonId(d));
    const fresh = seasonCards.find((c) => !(Number(player.starProjector.cards[c.id] && player.starProjector.cards[c.id].lights) > 0));
    const pick = fresh || seasonCards[(d.getDate() + starRun.helperSeq) % seasonCards.length];
    starRun.cardId = '';
    pickStarCard(pick.id);
  }
  const card = STAR_CARD_BY_ID[starRun.cardId];
  let guard = 0;
  while (card && starRun.taps < card.taps && guard < 8) {
    dialStarProjector();
    guard += 1;
  }
  return { ...lightStarProjection(), step: 'helper' };
}

let spCardRowKey = null;
let spAlbumKey = null;
let spSkyKey = null;
let spoSkyKey = null;

function renderStarSkyDots(card, litCount) {
  if (!card) return '';
  return card.stars
    .map(
      (s, i) =>
        `<img src="./assets/vfx_sparkle.webp?v=hd31" alt="" class="sp-sky-star${i < litCount ? ' is-on' : ''}" style="left:${s.x}%;top:${s.y}%;animation-delay:${(i * 0.37).toFixed(2)}s" />`
    )
    .join('');
}

function syncAr15Overlays(starActiveIn, rainWeatherIn) {
  const so = document.getElementById('star-projector-overlay');
  const ro = document.getElementById('rain-ambient-overlay');
  const active = starActiveIn === undefined ? getActiveProjection() : starActiveIn;
  if (so) {
    const show = Boolean(active && gameMode === 'pet');
    so.classList.toggle('hidden', !show);
    so.dataset.card = active ? active.cardId : '';
    if (active) {
      so.style.setProperty('--star-rgb', active.rgb);
      const sky = document.getElementById('spo-sky');
      if (sky && spoSkyKey !== active.cardId) {
        spoSkyKey = active.cardId;
        const card = STAR_CARD_BY_ID[active.cardId];
        sky.innerHTML = card.stars
          .map(
            (s, i) =>
              `<img src="./assets/vfx_sparkle.webp?v=hd31" alt="" class="spo-star" style="left:${s.x}%;top:${s.y}%;animation-delay:${(i * 0.41).toFixed(2)}s" />`
          )
          .join('');
      }
    }
  }
  if (ro) {
    const weather = rainWeatherIn || getRainWeather();
    const show = Boolean(rainRun.listening && gameMode === 'pet');
    ro.classList.toggle('hidden', !show);
    ro.dataset.weather = show ? rainRun.weatherId || weather.id : '';
    ro.style.setProperty('--rain-rgb', (RAIN_WEATHER_BY_ID[rainRun.weatherId] || weather).rgb);
  }
}

function syncStarProjectorUI() {
  const sp = player.starProjector;
  if (!sp) return;
  const d = ar15Clock.date();
  const stats = getStarStats(d);
  const active = stats.active;
  const cardOpen = isAr15CardOpen('star');
  const card = STAR_CARD_BY_ID[starRun.cardId] || null;
  const shownCard = starRun.phase === 'lit' && active ? STAR_CARD_BY_ID[active.cardId] : card;
  const litCount = starRun.phase === 'lit' && active ? (shownCard ? shownCard.taps : 0) : starRun.taps;
  const seasonName = STAR_SEASON_NAMES[stats.seasonId];

  if (spSummaryPillEl) spSummaryPillEl.textContent = `星座卡 ${stats.collected}/${stats.totalCards} · 好梦 ${stats.totalDreams}`;
  if (spNightRowEl) {
    spNightRowEl.dataset.season = stats.seasonId;
    spNightRowEl.dataset.bedtime = stats.bedtime ? '1' : '0';
  }
  if (spNightNameEl) spNightNameEl.textContent = `今晚 · ${seasonName}夜星空`;
  if (spNightSubEl) {
    spNightSubEl.textContent = active
      ? `投影中「${active.name}」 · 还剩 ${active.minsLeft} 分`
      : stats.bedtime
        ? `睡前时段 · 点亮奖励 ×${STAR_RULES.bedtimeMult}`
        : `${d.getMonth() + 1}月${d.getDate()}日 · ${STAR_RULES.bedtimeStartHour}:00 后点亮算睡前 ×${STAR_RULES.bedtimeMult}`;
  }
  if (spDomeEl) {
    spDomeEl.dataset.phase = starRun.phase;
    spDomeEl.dataset.lit = active ? '1' : '0';
    spDomeEl.dataset.card = shownCard ? shownCard.id : '';
    spDomeEl.style.setProperty('--star-rgb', shownCard ? shownCard.rgb : '255, 240, 214');
    spDomeEl.classList.toggle('is-spinning', starRun.spinFlash > 0);
  }
  if (spSkyEl) {
    const key = `${shownCard ? shownCard.id : ''}|${litCount}`;
    if (key !== spSkyKey) {
      spSkyKey = key;
      spSkyEl.innerHTML = renderStarSkyDots(shownCard, litCount);
    }
  }
  if (spDomeTagEl) {
    spDomeTagEl.textContent =
      starRun.phase === 'lit' && active
        ? `${active.short}星光 · ${active.minsLeft}分`
        : card
          ? `对准 ${starRun.taps}/${card.taps}`
          : '先挑星座卡';
  }

  if (spCardRowEl) {
    const seasonCards = getStarSeasonCards(stats.seasonId);
    const rKey = seasonCards.map((c) => c.id).join(',');
    if (rKey !== spCardRowKey) {
      spCardRowKey = rKey;
      spCardRowEl.innerHTML = seasonCards
        .map(
          (c) => `<button type="button" class="sp-card-chip" data-card-id="${c.id}" style="--star-rgb:${c.rgb}">
            <img src="./assets/constellation_card.webp?v=hd31" alt="" class="sp-card-ico" />
            <span class="sp-card-meta">
              <span class="sp-card-name">${c.name}</span>
              <em class="sp-card-sub"></em>
            </span>
          </button>`
        )
        .join('');
    }
    spCardRowEl.querySelectorAll('.sp-card-chip').forEach((chip) => {
      const cid = chip.dataset.cardId;
      const c = STAR_CARD_BY_ID[cid];
      const rec = sp.cards[cid];
      chip.classList.toggle('active', Boolean(card && card.id === cid));
      chip.classList.toggle('is-found', Boolean(rec && rec.lights > 0));
      chip.classList.toggle('is-lit', Boolean(active && active.cardId === cid));
      const sub = chip.querySelector('.sp-card-sub');
      if (sub) sub.textContent = rec && rec.lights > 0 ? `${c.taps}星 · 已投${rec.lights}次` : `${c.taps}星 · 新卡`;
      chip.title = `${c.name} · ${c.starNames.join(' / ')}`;
    });
  }
  if (spStoryLineEl) {
    spStoryLineEl.textContent =
      starRun.phase === 'lit' && active
        ? STAR_CARD_BY_ID[active.cardId].story
        : card
          ? `「${card.name}」：${card.starNames.slice(0, Math.max(1, starRun.taps)).join(' · ')}${starRun.taps < card.taps ? ' …' : ''}`
          : `${seasonName}夜可投「${getStarSeasonCards(stats.seasonId).map((c) => c.name).join('」「')}」，已收集的卡随时能再投`;
  }

  const mainState = getStarMainState();
  if (btnStarMainEl) {
    btnStarMainEl.disabled = mainState.disabled;
    btnStarMainEl.textContent = mainState.label;
    btnStarMainEl.dataset.mode = mainState.mode;
    btnStarMainEl.classList.toggle('is-ready', !mainState.disabled && (mainState.mode === 'project' || mainState.mode === 'goodnight'));
  }
  if (btnStarHelperEl) {
    btnStarHelperEl.disabled = goodnightRun.status === 'running';
    btnStarHelperEl.textContent = active && starRun.phase === 'lit' ? '她换一张' : '她来点亮';
  }
  btnStarOffEl?.classList.toggle('hidden', !active);

  if (spAlbumGridEl) {
    const aKey = `${stats.seasonId}|${STAR_CARDS.map((c) => {
      const rec = sp.cards[c.id];
      return rec ? `${rec.lights}.${rec.dreams}` : '0';
    }).join(',')}|${active ? active.cardId : ''}`;
    if (aKey !== spAlbumKey) {
      spAlbumKey = aKey;
      spAlbumGridEl.innerHTML = STAR_CARDS.map((c) => {
        const rec = sp.cards[c.id];
        const found = Boolean(rec && rec.lights > 0);
        const inSeason = c.season === stats.seasonId;
        const lit = Boolean(active && active.cardId === c.id);
        const tag = found ? (rec.dreams > 0 ? `好梦${rec.dreams}` : c.short) : `${STAR_SEASON_NAMES[c.season]}季`;
        return `<button type="button" class="sp-album-chip${found ? ' is-found' : ''}${inSeason ? ' is-season' : ''}${lit ? ' is-lit' : ''}" data-card-id="${c.id}" style="--star-rgb:${c.rgb}" title="${c.name}${found ? ` · 投影 ${rec.lights} 次 · 好梦章 ${rec.dreams}` : inSeason ? ' · 当季可投影' : ` · ${STAR_SEASON_NAMES[c.season]}季可投影`}">
            <img src="./assets/constellation_card.webp?v=hd31" alt="" class="sp-album-ico" />
            <em class="sp-album-tag">${tag}</em>
          </button>`;
      }).join('');
    }
  }
  if (spAlbumSubEl) {
    spAlbumSubEl.textContent = `星座卡册 ${stats.collected}/${stats.totalCards} · 好梦章 ${stats.totalDreams} · 今日奖励 ${stats.rewardsToday}/${stats.dailyRewards}`;
  }
  if (spFooterLineEl) {
    spFooterLineEl.textContent = active
      ? `星光陪伴「${active.name}」还剩 ${active.minsLeft} 分：这时一起晚安，好梦章金币 +${Math.round(STAR_RULES.goodnightBonus * 100)}%，星座卡盖好梦章（每天第 1 枚 +${STAR_RULES.dreamCoins} 金币）`
      : `点亮一次投影 ${STAR_RULES.durationMin} 分钟；每天前 ${STAR_RULES.dailyRewards} 次 +${STAR_RULES.coinReward} 金币，新星座卡再 +${STAR_RULES.newCardCoins}，睡前 ×${STAR_RULES.bedtimeMult}`;
  }

  syncAr15Overlays(active);
  const sv = player.starVisual;
  sv.active = Boolean(active);
  sv.cardId = active ? active.cardId : card ? card.id : '';
  sv.rgb = active ? active.rgb : card ? card.rgb : '';
  sv.aligning = cardOpen;
  sv.taps = starRun.phase === 'lit' ? 0 : starRun.taps;
  sv.need = card ? card.taps : 0;
  sv.cheer = player.starCheerTimer || 0;
  // 场景标签保持短小：窄屏上不伸到陶艺架下面（剩余分钟在胶囊 / 卡片里看）
  sv.label = active ? `${active.short}星光` : '星空灯';
  syncStarRainPill(stats, null);
}

// ---------------- 窗边听雨角：按本地日期 + 时段轮换的窗外天气播放白噪音，每听满 5 分钟记一则听雨小记 ----------------
function getRainMainState() {
  if (rainRun.listening) {
    const left = Math.max(0, RAIN_RULES.noteMin * 60000 - rainRun.accMs);
    const mm = Math.floor(left / 60000);
    const ss = Math.floor((left % 60000) / 1000);
    return { mode: 'stop', disabled: false, label: `停一停 · 下则 ${mm}:${String(ss).padStart(2, '0')}` };
  }
  return { mode: 'start', disabled: false, label: '开始听雨' };
}

function startRainListening(opts = {}) {
  if (rainRun.listening) return { ok: false, reason: 'listening' };
  if (gameMode !== 'pet') switchMode('pet');
  const weather = getRainWeather();
  const rc = player.rainCorner;
  rainRun.listening = true;
  rainRun.weatherId = weather.id;
  rainRun.lastTickMs = ar15Clock.now();
  rainRun.accMs = 0;
  rainRun.sessionMs = 0;
  rainRun.sessionNotes = 0;
  rainRun.lastAction = 'start';
  rc.lastWeatherId = weather.id;
  player.idleTime = 0;
  player.happyTimer = 1.2;
  player.rainCheerTimer = 2.5;
  petAudio.startRainNoise(weather.id, { volume: (RAIN_VOLUME_BY_ID[rc.volumeId] || RAIN_VOLUMES[1]).mult, chimeOn: rc.chimeOn });
  petAudio.haptic('tap');
  if (!opts.silent) setPlayerEmote(`${weather.segName}窗外是「${weather.name}」~ ${weather.line}`, 2.6, 'happy', false);
  savePetState();
  syncRainCornerUI();
  return { ok: true, weatherId: weather.id, segId: weather.segId, audio: petAudio.getAr15AudioInfo() };
}

function stopRainListening(reason = 'stop') {
  if (!rainRun.listening) return { ok: false, reason: 'not_listening' };
  const notes = rainRun.sessionNotes;
  rainRun.listening = false;
  rainRun.accMs = 0;
  rainRun.lastAction = reason === 'mode' ? 'paused_by_mode' : reason === 'max' ? 'session_full' : 'stopped';
  petAudio.stopRainNoise();
  if (reason === 'stop') {
    playSfx('pat');
    setPlayerEmote(notes > 0 ? `这次一起听了 ${notes} 则雨声小记，心里软软的~` : '先停一停，雨还会在窗外等我们~', 1.8, 'happy', false);
  } else if (reason === 'max') {
    setPlayerEmote('听了一整个小时的雨啦，起来伸个懒腰吧~', 2.2, 'happy', false);
  }
  savePetState();
  syncRainCornerUI();
  return { ok: true, notes };
}

function recordRainNote(d = ar15Clock.date()) {
  const rc = player.rainCorner;
  const weather = getRainWeather(d);
  const todayKey = formatLocalDateKey(d);
  const key = weather.entryKey;
  const isNew = !(rc.entries[key] > 0);
  rc.entries[key] = (rc.entries[key] || 0) + 1;
  rc.totalNotes = (rc.totalNotes || 0) + 1;
  rc.totalMins = (rc.totalMins || 0) + RAIN_RULES.noteMin;
  rc.lastWeatherId = weather.id;
  if (rc.rewardDate !== todayKey) {
    rc.rewardDate = todayKey;
    rc.rewardCount = 0;
  }
  let reward = null;
  if (rc.rewardCount < RAIN_RULES.dailyNotes) {
    rc.rewardCount += 1;
    reward = { coins: RAIN_RULES.coinReward + (isNew ? RAIN_RULES.newEntryCoins : 0), xp: RAIN_RULES.xpReward };
  }
  rainRun.sessionNotes += 1;
  rainRun.lastAction = 'note';
  player.rainCheerTimer = 3;
  petAudio.playRainChime(rc.totalNotes);
  recordJournalActivity('rains', 1, d);
  if (reward) {
    addCoins(reward.coins, player.x + 22, player.y - 44, '听雨 ');
    addAffectionXp(reward.xp, '窗边听雨小记');
  }
  setPlayerEmote(
    `${isNew ? '听雨手帐新收录：' : '又记下一则听雨小记：'}${weather.segName}的「${weather.name}」~`,
    2.6,
    'happy',
    false
  );
  rainRun.lastResult = {
    entryKey: key,
    weatherId: weather.id,
    segId: weather.segId,
    isNew,
    reward,
    sessionNotes: rainRun.sessionNotes,
    totalNotes: rc.totalNotes
  };
  savePetState();
  syncDiaryBookUI();
  return { ...rainRun.lastResult };
}

function setRainVolume(volumeId) {
  const v = RAIN_VOLUME_BY_ID[volumeId];
  if (!v) return { ok: false, reason: 'invalid_volume' };
  player.rainCorner.volumeId = v.id;
  rainRun.lastAction = 'volume';
  if (rainRun.listening) petAudio.setRainMix({ volume: v.mult, chimeOn: player.rainCorner.chimeOn });
  playSfx('pat');
  savePetState();
  syncRainCornerUI();
  return { ok: true, volumeId: v.id, mult: v.mult, audio: petAudio.getAr15AudioInfo() };
}

function toggleRainChime() {
  const rc = player.rainCorner;
  rc.chimeOn = !rc.chimeOn;
  rainRun.lastAction = 'chime_toggle';
  if (rainRun.listening) petAudio.setRainMix({ volume: (RAIN_VOLUME_BY_ID[rc.volumeId] || RAIN_VOLUMES[1]).mult, chimeOn: rc.chimeOn });
  if (rc.chimeOn) petAudio.playRainChime(1);
  else playSfx('pat');
  savePetState();
  syncRainCornerUI();
  return { ok: true, chimeOn: rc.chimeOn };
}

// 点窗边的风铃：叮一声，场景里的雨滴风铃也跟着晃
function ringRainChime() {
  rainRun.ringSeq += 1;
  rainRun.ring = 1.4;
  rainRun.lastAction = 'ring';
  player.idleTime = 0;
  petAudio.playRainChime(rainRun.ringSeq + 2);
  setPlayerEmote(RAIN_RING_LINES[(rainRun.ringSeq - 1) % RAIN_RING_LINES.length], 1.8, 'happy', false);
  syncRainCornerUI();
  return { ok: true, ringSeq: rainRun.ringSeq, audio: petAudio.getAr15AudioInfo() };
}

function handleRainMainAction() {
  return rainRun.listening ? stopRainListening('stop') : startRainListening();
}

// 她来陪听：按时段挑音量（夜里 / 清晨轻一点），开着风铃陪主人听；已经在听时就替主人摇一下风铃
function rainHelper() {
  rainRun.helperSeq += 1;
  if (rainRun.listening) return { ...ringRainChime(), step: 'ring' };
  const seg = getRainSegment();
  const volumeId = seg.id === 'night' || seg.id === 'dawn' ? 'soft' : 'mid';
  player.rainCorner.volumeId = volumeId;
  player.rainCorner.chimeOn = true;
  const res = startRainListening({ silent: true });
  const weather = getRainWeather();
  setPlayerEmote(`我把音量调成「${RAIN_VOLUME_BY_ID[volumeId].name}」，抱着坐垫陪你听${weather.segName}的「${weather.name}」~`, 2.6, 'happy', false);
  return { ...res, volumeId, step: 'helper' };
}

let rcVolumeKey = null;
let rcCodexKey = null;

function syncRainCornerUI() {
  const rc = player.rainCorner;
  if (!rc) return;
  const d = ar15Clock.date();
  const stats = getRainStats(d);
  const weather = stats.weather;
  const listening = rainRun.listening;
  const cardOpen = isAr15CardOpen('rain');
  const playing = listening ? RAIN_WEATHER_BY_ID[rainRun.weatherId] || weather : weather;
  const vol = RAIN_VOLUME_BY_ID[rc.volumeId] || RAIN_VOLUMES[1];

  if (rcSummaryPillEl) rcSummaryPillEl.textContent = `听雨 ${stats.totalNotes} 则 · 手帐 ${stats.entries}/${stats.totalEntries}`;
  if (rcWeatherRowEl) {
    rcWeatherRowEl.dataset.weather = weather.id;
    rcWeatherRowEl.dataset.seg = weather.segId;
  }
  if (rcWeatherIcoEl && rcWeatherIcoEl.getAttribute('src') !== weather.icon) rcWeatherIcoEl.setAttribute('src', weather.icon);
  if (rcWeatherNameEl) rcWeatherNameEl.textContent = `${weather.segName} · ${weather.name}`;
  if (rcWeatherSubEl) {
    rcWeatherSubEl.textContent = listening
      ? `听雨中 ${stats.sessionMins} 分 · 本次 ${rainRun.sessionNotes} 则小记`
      : `${d.getMonth() + 1}月${d.getDate()}日 · 按本地日期与时段轮换 · ${weather.next} 换下一段`;
  }
  if (rcWindowEl) {
    rcWindowEl.dataset.listening = listening ? '1' : '0';
    rcWindowEl.dataset.weather = playing.id;
    rcWindowEl.style.setProperty('--rain-rgb', playing.rgb);
    rcWindowEl.classList.toggle('is-ringing', rainRun.ring > 0);
  }
  if (rcStageTagEl) {
    rcStageTagEl.textContent = listening ? `${playing.short} · 听雨 ${stats.sessionMins} 分` : `${weather.short} · 还没开始`;
  }
  if (rcVolumeRowEl) {
    const vKey = RAIN_VOLUMES.map((v) => v.id).join(',');
    if (vKey !== rcVolumeKey) {
      rcVolumeKey = vKey;
      rcVolumeRowEl.innerHTML = `${RAIN_VOLUMES.map(
        (v) => `<button type="button" class="rc-volume-chip" data-volume-id="${v.id}">
            <img src="./assets/rain_chime.webp?v=hd31" alt="" class="rc-volume-ico" style="--vol:${v.mult}" />
            <span class="rc-volume-name">${v.name}</span>
          </button>`
      ).join('')}<button type="button" class="rc-volume-chip rc-chime-chip" data-chime-toggle="1">
            <img src="./assets/rain_chime.webp?v=hd31" alt="" class="rc-volume-ico" />
            <span class="rc-volume-name" id="rc-chime-label">风铃</span>
          </button>`;
    }
    rcVolumeRowEl.querySelectorAll('[data-volume-id]').forEach((chip) => {
      chip.classList.toggle('active', chip.dataset.volumeId === vol.id);
      chip.title = `白噪音音量「${RAIN_VOLUME_BY_ID[chip.dataset.volumeId].name}」`;
    });
    const chimeChip = rcVolumeRowEl.querySelector('[data-chime-toggle]');
    if (chimeChip) {
      chimeChip.classList.toggle('active', Boolean(rc.chimeOn));
      chimeChip.title = rc.chimeOn ? '风铃：开（点一下关掉）' : '风铃：关（点一下打开）';
      const lbl = chimeChip.querySelector('.rc-volume-name');
      if (lbl) lbl.textContent = rc.chimeOn ? '风铃开' : '风铃关';
    }
  }
  if (rcMixLineEl) {
    rcMixLineEl.textContent = `白噪音：${playing.mix}${rc.chimeOn && !playing.mix.includes('风铃') ? ' · 风铃' : ''}${rc.chimeOn ? '' : ' · 风铃关'} · 音量${vol.name}`;
  }

  const mainState = getRainMainState();
  if (btnRainMainEl) {
    btnRainMainEl.disabled = mainState.disabled;
    btnRainMainEl.textContent = mainState.label;
    btnRainMainEl.dataset.mode = mainState.mode;
    btnRainMainEl.classList.toggle('is-ready', mainState.mode === 'start');
  }
  if (btnRainHelperEl) btnRainHelperEl.textContent = listening ? '她摇风铃' : '她来陪听';

  if (rcCodexGridEl) {
    const entries = rc.entries || {};
    const cKey = `${weather.segId}|${RAIN_WEATHERS.map((w) => (Number(entries[`${weather.segId}_${w.id}`]) > 0 ? 1 : 0)).join('')}|${weather.id}`;
    if (cKey !== rcCodexKey) {
      rcCodexKey = cKey;
      rcCodexGridEl.innerHTML = RAIN_WEATHERS.map((w) => {
        const found = Number(entries[`${weather.segId}_${w.id}`]) > 0;
        const now = w.id === weather.id;
        return `<span class="rc-codex-chip${found ? ' is-found' : ''}${now ? ' is-now' : ''}" data-entry-key="${weather.segId}_${w.id}" style="--rain-rgb:${w.rgb}" title="${weather.segName} · ${w.name}${found ? ' · 已收录' : ' · 未收录'}">
            <img src="${w.icon}" alt="" class="rc-codex-ico" />
            <em class="rc-codex-tag">${found ? w.short : '待收录'}</em>
          </span>`;
      }).join('');
    }
  }
  if (rcCodexSubEl) {
    rcCodexSubEl.textContent = `听雨手帐 ${stats.entries}/${stats.totalEntries} · ${weather.segName} ${stats.segFound}/${RAIN_WEATHERS.length} · 今日小记 ${stats.rewardsToday}/${stats.dailyNotes}`;
  }
  if (rcFooterLineEl) {
    rcFooterLineEl.textContent = listening
      ? `听雨安神：一边听雨日常亲密 +${Math.round(RAIN_RULES.calmBonus * 100)}%，每听满 ${RAIN_RULES.noteMin} 分钟记一则小记（单次最多 ${RAIN_RULES.maxSessionMin} 分钟）`
      : `每听满 ${RAIN_RULES.noteMin} 分钟记一则听雨小记：每天前 ${RAIN_RULES.dailyNotes} 则 +${RAIN_RULES.coinReward} 金币，手帐新收录再 +${RAIN_RULES.newEntryCoins}；听雨时亲密 +${Math.round(RAIN_RULES.calmBonus * 100)}%`;
  }

  syncAr15Overlays(undefined, weather);
  const rv = player.rainVisual;
  rv.listening = listening;
  rv.weatherId = playing.id;
  rv.rgb = playing.rgb;
  rv.cardOpen = cardOpen;
  rv.ring = rainRun.ring;
  rv.cheer = player.rainCheerTimer || 0;
  rv.label = listening ? `${playing.short}中` : '听雨角';
  syncStarRainPill(null, stats);
}

// 每秒复核一次：投影按可注入时钟到点熄灭；听雨按可注入时钟累计，满 5 分钟记一则小记；跨过时段时白噪音跟着窗外天气换
function refreshAr15Clock() {
  const nowMs = ar15Clock.now();
  const d = new Date(nowMs);
  const active = getActiveProjection(nowMs);
  let starChanged = false;
  if (starRun.wasActive && !active) {
    starRun.wasActive = false;
    if (player.starProjector.active) {
      player.starProjector.active = null;
      savePetState();
    }
    if (starRun.phase === 'lit') {
      starRun.phase = STAR_CARD_BY_ID[starRun.cardId] ? 'dial' : 'pick';
      starRun.taps = 0;
    }
    starRun.lastAction = 'faded';
    if (gameMode === 'pet') setPlayerEmote('星空投影慢慢暗下去啦，星星们回到窗外了~', 1.8, 'happy', false);
    starChanged = true;
  } else {
    starRun.wasActive = Boolean(active);
    if (!active && player.starProjector.active && Number(player.starProjector.active.endMs) <= nowMs) {
      // 旧存档里早已熄灭的投影：静默清掉
      player.starProjector.active = null;
      savePetState();
    }
  }

  let rainChanged = false;
  if (rainRun.listening) {
    if (gameMode !== 'pet') {
      stopRainListening('mode');
      rainChanged = true;
    } else {
      const delta = Math.max(0, Math.min(6 * 3600000, nowMs - (rainRun.lastTickMs || nowMs)));
      rainRun.lastTickMs = nowMs;
      rainRun.accMs += delta;
      rainRun.sessionMs += delta;
      const noteMs = RAIN_RULES.noteMin * 60000;
      const maxNotes = Math.floor(RAIN_RULES.maxSessionMin / RAIN_RULES.noteMin);
      let guard = 0;
      while (rainRun.accMs >= noteMs && rainRun.sessionNotes < maxNotes && guard < 24) {
        rainRun.accMs -= noteMs;
        recordRainNote(new Date(nowMs - rainRun.accMs));
        guard += 1;
        rainChanged = true;
      }
      const weather = getRainWeather(d);
      if (weather.id !== rainRun.weatherId) {
        rainRun.weatherId = weather.id;
        player.rainCorner.lastWeatherId = weather.id;
        petAudio.setRainMix({ weatherId: weather.id });
        setPlayerEmote(`窗外换成${weather.segName}的「${weather.name}」啦~`, 2.0, 'happy', false);
        rainChanged = true;
      }
      if (rainRun.sessionNotes >= maxNotes) {
        stopRainListening('max');
        rainChanged = true;
      }
    }
  }

  const dayKey = formatLocalDateKey(d);
  if (dayKey !== rainRun.dayKey) {
    rainRun.dayKey = dayKey;
    starChanged = true;
    rainChanged = true;
  }
  if (starChanged || active || isAr15CardOpen('star')) syncStarProjectorUI();
  if (rainChanged || rainRun.listening || isAr15CardOpen('rain')) syncRainCornerUI();
  if (!starChanged && !active && !rainChanged && !rainRun.listening) syncStarRainPill();
}

// ---------------- AR-15 合并紧凑胶囊：星空投影倒计时 + 听雨中，窄屏放不下就收起 ----------------
function syncStarRainPill(ssIn = null, rsIn = null) {
  if (!srPillEl) return;
  const ss = ssIn || getStarStats();
  const rs = rsIn || getRainStats();
  const showStar = Boolean(ss.active);
  const showRain = Boolean(rainRun.listening);
  srPillEl.classList.toggle('hidden', !(gameMode === 'pet' && (showStar || showRain)));
  srPillEl.classList.toggle('has-star', showStar);
  srSegStarEl?.classList.toggle('hidden', !showStar);
  srSegRainEl?.classList.toggle('hidden', !showRain);
  // 星光倒计时更有时效：两段都在时优先留星空段
  srSegStarEl?.classList.toggle('is-priority', showStar);
  srSegRainEl?.classList.toggle('is-priority', !showStar);
  if (srPillStarEl) srPillStarEl.textContent = ss.active ? `${ss.active.minsLeft}分` : '';
  const playing = RAIN_WEATHER_BY_ID[rainRun.weatherId] || rs.weather;
  if (srPillRainEl) srPillRainEl.textContent = showRain ? playing.short : '';
  if (ss.active) srPillEl.style.setProperty('--star-rgb', ss.active.rgb);
  srPillEl.title = `${ss.active ? `星空投影「${ss.active.name}」还剩 ${ss.active.minsLeft} 分钟` : '卧室星空投影灯'} · ${showRain ? `窗边听雨「${playing.name}」中` : '窗边听雨角'}`;
  fitStarRainPill();
}

// 与 AR-11 ~ AR-14 同一条规则：窄屏胶囊行已排满时不为 AR-15 胶囊新开一行（offsetTop 不受旋转舞台变换影响），
// 两段都放不下先只留优先的一段，仍放不下才整颗收起；只读 DOM，任何区段初始化时调用都不会触发 TDZ
function fitStarRainPill() {
  const fitted = fitStarRainPillOnly();
  // AR-16 合并胶囊排在其后：AR-15 胶囊显隐 / 收起变化后立刻复核 AR-16 胶囊是否还放得下
  fitStitchHearthPill();
  return fitted;
}

function fitStarRainPillOnly() {
  const pill = document.getElementById('star-rain-pill');
  if (!pill) return false;
  pill.classList.remove('sr-no-room', 'sr-solo');
  if (pill.classList.contains('hidden') || pill.offsetParent === null) return false;
  const compact = window.matchMedia ? window.matchMedia('(max-width: 920px), (max-height: 430px)') : null;
  if (!compact || !compact.matches) return true;
  const row = pill.parentElement;
  const others = row
    ? Array.from(row.children).filter(
        (b) => b !== pill && b.id !== 'stitch-hearth-pill' && !b.classList.contains('hidden') && b.offsetParent !== null
      )
    : [];
  if (!others.length) return true;
  const mid = (b) => b.offsetTop + b.offsetHeight / 2;
  const lastRowMid = Math.max(...others.map(mid));
  if (mid(pill) <= lastRowMid + 6) return true;
  const shownSegs = Array.from(pill.querySelectorAll('.sr-seg')).filter((s) => !s.classList.contains('hidden'));
  if (shownSegs.length > 1) {
    pill.classList.add('sr-solo');
    if (mid(pill) <= lastRowMid + 6) return true;
    pill.classList.remove('sr-solo');
  }
  pill.classList.add('sr-no-room');
  return false;
}

function openAr15Card(cardEl) {
  if (!cardEl) return;
  if (gameMode !== 'pet') switchMode('pet');
  closeDrawer();
  dismissTopicCard();
  dismissWindowAmbienceCard();
  foldOrHidePomodoroCard();
  dismissTeatimeCard();
  dismissWeeklyJournalCard();
  dismissTerrariumCard();
  foldOrHideGoodnightCard();
  dismissCollageCard();
  foldOrHideCozyRadioCard();
  dismissCrochetCard();
  dismissHotCocoaCard();
  dismissPressedFlowerCard();
  dismissTelescopeCard();
  dismissAr10Cards();
  dismissAr11Cards();
  dismissAr12Cards();
  dismissAr13Cards();
  dismissAr14Cards();
  dismissAr15Cards(); dismissAr16Cards();
  dismissPolaroid();
  closeAlbumLightbox();
  cardEl.classList.remove('hidden');
}

function openStarProjectorCard() {
  if (!starCardEl) return { ok: false };
  openAr15Card(starCardEl);
  syncStarProjectorUI();
  syncRainCornerUI();
  return { ok: true };
}

function openRainCornerCard() {
  if (!rainCardEl) return { ok: false };
  openAr15Card(rainCardEl);
  syncRainCornerUI();
  syncStarProjectorUI();
  return { ok: true };
}

function handleAr15CanvasTap(pt) {
  const L = getAr15CornerLayout(W, H, player.sillCamX || 0);
  const P = L.projector.hit;
  if (Math.hypot(pt.x - P.x, pt.y - P.y) < P.r) {
    openStarProjectorCard();
    petAudio.playStarDial(0);
    return true;
  }
  const R = L.rainHit;
  if (pt.x >= R.x && pt.x <= R.x + R.w && pt.y >= R.y && pt.y <= R.y + R.h) {
    openRainCornerCard();
    petAudio.playRainChime(0);
    return true;
  }
  return false;
}

let srPillFitTimer = 0;
function updateAr15Companions(dt) {
  if (player.starCheerTimer > 0) player.starCheerTimer = Math.max(0, player.starCheerTimer - dt);
  if (player.rainCheerTimer > 0) player.rainCheerTimer = Math.max(0, player.rainCheerTimer - dt);
  if (starRun.spinFlash > 0) {
    starRun.spinFlash = Math.max(0, starRun.spinFlash - dt);
    if (starRun.spinFlash <= 0) spDomeEl?.classList.remove('is-spinning');
  }
  if (rainRun.ring > 0) {
    rainRun.ring = Math.max(0, rainRun.ring - dt);
    if (rainRun.ring <= 0) rcWindowEl?.classList.remove('is-ringing');
  }
  rainRun.tickAcc -= dt;
  if (rainRun.tickAcc <= 0) {
    rainRun.tickAcc = 1;
    refreshAr15Clock();
  }
  srPillFitTimer -= dt;
  if (srPillFitTimer <= 0) {
    srPillFitTimer = 0.5;
    fitStarRainPill();
  }
  const sv = player.starVisual;
  sv.aligning = isAr15CardOpen('star');
  sv.cheer = player.starCheerTimer || 0;
  const rv = player.rainVisual;
  rv.cardOpen = isAr15CardOpen('rain');
  rv.ring = rainRun.ring;
  rv.cheer = player.rainCheerTimer || 0;
}

if (starCardEl) {
  starCardEl.addEventListener('pointerdown', (e) => e.stopPropagation());
}
if (rainCardEl) {
  rainCardEl.addEventListener('pointerdown', (e) => e.stopPropagation());
}

bindHudTap(document.getElementById('btn-star-close'), () => {
  dismissStarProjectorCard();
  syncStarProjectorUI();
});
bindHudTap(spCardRowEl, (e) => {
  const chip = e.target && e.target.closest ? e.target.closest('.sp-card-chip') : null;
  if (chip && !chip.disabled) pickStarCard(chip.dataset.cardId);
});
bindHudTap(spAlbumGridEl, (e) => {
  const chip = e.target && e.target.closest ? e.target.closest('.sp-album-chip') : null;
  if (chip) pickStarCard(chip.dataset.cardId);
});
// 点投影灯本身也能转动投影罩 / 点亮（和主按钮同一个动作；一起晚安只走主按钮）
bindHudTap(spDomeEl, () => {
  const st = getStarMainState();
  if (!st.disabled && (st.mode === 'dial' || st.mode === 'project')) handleStarMainAction();
});
bindHudTap(btnStarHelperEl, () => {
  if (btnStarHelperEl.disabled) return;
  starHelper();
});
bindHudTap(btnStarMainEl, () => {
  if (btnStarMainEl.disabled) return;
  handleStarMainAction();
});
bindHudTap(btnStarOffEl, () => {
  stopStarProjection();
});

bindHudTap(document.getElementById('btn-rain-close'), () => {
  dismissRainCornerCard();
  syncRainCornerUI();
});
bindHudTap(rcVolumeRowEl, (e) => {
  const chip = e.target && e.target.closest ? e.target.closest('.rc-volume-chip') : null;
  if (!chip) return;
  if (chip.dataset.chimeToggle) toggleRainChime();
  else setRainVolume(chip.dataset.volumeId);
});
bindHudTap(rcWindowEl, () => {
  ringRainChime();
});
bindHudTap(btnRainHelperEl, () => {
  rainHelper();
});
bindHudTap(btnRainMainEl, () => {
  if (btnRainMainEl.disabled) return;
  handleRainMainAction();
});
bindHudTap(srPillEl, (e) => {
  const segEl = e.target && e.target.closest ? e.target.closest('[data-sr-seg]') : null;
  const seg = segEl ? segEl.dataset.srSeg : getActiveProjection() ? 'star' : 'rain';
  if (seg === 'star') openStarProjectorCard();
  else openRainCornerCard();
});

window.addEventListener('resize', () => {
  requestAnimationFrame(() => fitStarRainPill());
});

rainRun.dayKey = formatLocalDateKey(ar15Clock.date());
starRun.wasActive = Boolean(getActiveProjection());
if (starRun.wasActive) {
  starRun.cardId = player.starProjector.active.cardId;
  starRun.phase = 'lit';
}
syncStarProjectorUI();
syncRainCornerUI();

window.__AR15_DEBUG__ = {
  getSpecs() {
    return JSON.parse(
      JSON.stringify({
        cards: STAR_CARDS,
        starRules: STAR_RULES,
        segments: RAIN_SEGMENTS,
        weathers: RAIN_WEATHERS,
        volumes: RAIN_VOLUMES,
        rainRules: RAIN_RULES
      })
    );
  },
  // 可注入时钟：传毫秒或本地时间字符串固定“现在”（当季星座卡 / 睡前时段 / 投影剩余 / 窗外天气 / 听雨小记计时都跟着走）
  setClock(value) {
    const ms = typeof value === 'number' ? value : new Date(value).getTime();
    if (!Number.isFinite(ms)) return { ok: false, reason: 'invalid_clock' };
    ar15Clock.fixedMs = ms;
    ar15Clock.offsetMs = 0;
    if (rainRun.listening) rainRun.lastTickMs = ms;
    refreshAr15Clock();
    syncStarProjectorUI();
    syncRainCornerUI();
    return { ok: true, now: ms, seasonId: getAromaSeasonId(new Date(ms)), weather: getRainWeather(new Date(ms)) };
  },
  advanceClock(ms) {
    const step = Math.max(0, Number(ms) || 0);
    if (ar15Clock.fixedMs !== null) ar15Clock.fixedMs += step;
    else ar15Clock.offsetMs += step;
    refreshAr15Clock();
    syncStarProjectorUI();
    syncRainCornerUI();
    return { ok: true, now: ar15Clock.now(), active: getActiveProjection(), listening: rainRun.listening };
  },
  useRealClock() {
    ar15Clock.fixedMs = null;
    ar15Clock.offsetMs = 0;
    if (rainRun.listening) rainRun.lastTickMs = ar15Clock.now();
    refreshAr15Clock();
    syncStarProjectorUI();
    syncRainCornerUI();
    return { ok: true, now: ar15Clock.now() };
  },
  openStar() {
    return openStarProjectorCard();
  },
  openRain() {
    return openRainCornerCard();
  },
  pickCard(id) {
    return pickStarCard(id);
  },
  dial() {
    return dialStarProjector();
  },
  project() {
    return lightStarProjection();
  },
  starMain() {
    return handleStarMainAction();
  },
  starHelper() {
    return starHelper();
  },
  stopProjection() {
    return stopStarProjection();
  },
  getStarMainState() {
    return getStarMainState();
  },
  getStarRun() {
    return JSON.parse(JSON.stringify(starRun));
  },
  resetStarForTest() {
    starRun.cardId = '';
    starRun.taps = 0;
    starRun.phase = 'pick';
    starRun.lastResult = null;
    syncStarProjectorUI();
    return { ok: true };
  },
  startRain() {
    return startRainListening();
  },
  stopRain() {
    return stopRainListening('stop');
  },
  rainMain() {
    return handleRainMainAction();
  },
  rainHelper() {
    return rainHelper();
  },
  setVolume(id) {
    return setRainVolume(id);
  },
  toggleChime() {
    return toggleRainChime();
  },
  ringChime() {
    return ringRainChime();
  },
  getRainRun() {
    return JSON.parse(JSON.stringify(rainRun));
  },
  // 只读：给定本地时间的“窗外天气”（不改任何状态）
  getWeatherFor(value) {
    const ms = typeof value === 'number' ? value : new Date(value).getTime();
    if (!Number.isFinite(ms)) return null;
    return getRainWeather(new Date(ms));
  },
  // 测试用：读出当前亲密度收获的总倍率（不改任何状态），验证听雨期间整体 ×1.05
  getAffectionMults() {
    return { rain: getRainCalmMult(), aroma: getAromaAffectionMult(), total: Number(getAffectionXpMult().toFixed(4)) };
  },
  getLayouts() {
    return {
      corner: getAr15CornerLayout(W, H, player.sillCamX || 0),
      shelf: getPotteryShelfLayout(W, H, player.sillCamX || 0, 4),
      player: { x: player.x, y: player.y },
      sillCamX: player.sillCamX || 0,
      W,
      H
    };
  },
  placePlayerForTest(xRatio = 0.5) {
    player.x = Math.max(40, Math.min(W - 40, W * (Number(xRatio) || 0.5)));
    player.vx = 0;
    player.wanderTargetX = null;
    player.idleTime = 0;
    return { x: player.x, y: player.y };
  },
  getState(customDateIso = '') {
    const now = ar15Clock.now();
    const refDate = customDateIso ? new Date(customDateIso) : new Date(now);
    const so = document.getElementById('star-projector-overlay');
    const ro = document.getElementById('rain-ambient-overlay');
    const ao = document.getElementById('aroma-ambient-overlay');
    return {
      gameMode,
      now,
      clockFixed: ar15Clock.fixedMs !== null,
      coins: player.coins,
      level: player.level,
      xp: player.xp,
      emote: player.emote,
      starProjector: JSON.parse(JSON.stringify(player.starProjector)),
      starStats: getStarStats(new Date(now)),
      starRun: JSON.parse(JSON.stringify(starRun)),
      starVisual: JSON.parse(JSON.stringify(player.starVisual)),
      starMain: getStarMainState(),
      rainCorner: JSON.parse(JSON.stringify(player.rainCorner)),
      rainStats: getRainStats(new Date(now)),
      rainRun: JSON.parse(JSON.stringify(rainRun)),
      rainVisual: JSON.parse(JSON.stringify(player.rainVisual)),
      rainMain: getRainMainState(),
      calmMult: getRainCalmMult(),
      goodnight: { status: goodnightRun.status, sleeping: Boolean(player.isGoodnightSleeping), stamps: player.goodnightMusicbox.totalStamps },
      overlays: {
        star: so ? { shown: !so.classList.contains('hidden'), card: so.dataset.card || '' } : null,
        rain: ro ? { shown: !ro.classList.contains('hidden'), weather: ro.dataset.weather || '' } : null,
        aroma: ao ? { shown: !ao.classList.contains('hidden'), mood: ao.dataset.mood || '' } : null
      },
      ar15Audio: petAudio.getAr15AudioInfo(),
      journalSummary: computeWeeklyJournalSummary(refDate),
      openPanels: window.__AR5_DEBUG__.getState(customDateIso).openPanels
    };
  }
};

// ================= AR-16 墙面刺绣绷架 & 地板小暖炉冬日角 =================
// 船坞仍是 25 键、书桌与窗台都已满：两张卡不加新键，入口 = 「家具与装扮」抽屉快捷卡 + 场景点击
// （陶艺架上方墙面的刺绣绷架 / 丝带上的绣品 / 书桌前地板上的小暖炉）+ 合并胶囊
const embroideryCardEl = document.getElementById('embroidery-card');
const ebSummaryPillEl = document.getElementById('eb-summary-pill');
const ebSeasonRowEl = document.getElementById('eb-season-row');
const ebSeasonNameEl = document.getElementById('eb-season-name');
const ebSeasonSubEl = document.getElementById('eb-season-sub');
const ebHoopEl = document.getElementById('eb-hoop');
const ebHoopPatchEl = document.getElementById('eb-hoop-patch');
const ebStitchesEl = document.getElementById('eb-stitches');
const ebHoopTagEl = document.getElementById('eb-hoop-tag');
const ebPatternRowEl = document.getElementById('eb-pattern-row');
const ebThreadRowEl = document.getElementById('eb-thread-row');
const ebStoryLineEl = document.getElementById('eb-story-line');
const btnEmbroideryHelperEl = document.getElementById('btn-embroidery-helper');
const btnEmbroideryMainEl = document.getElementById('btn-embroidery-main');
const ebAlbumSubEl = document.getElementById('eb-album-sub');
const ebAlbumGridEl = document.getElementById('eb-album-grid');
const ebFooterLineEl = document.getElementById('eb-footer-line');

const hearthCardEl = document.getElementById('hearth-card');
const hcSummaryPillEl = document.getElementById('hc-summary-pill');
const hcHeatRowEl = document.getElementById('hc-heat-row');
const hcHeatNameEl = document.getElementById('hc-heat-name');
const hcHeatSubEl = document.getElementById('hc-heat-sub');
const hcStoveEl = document.getElementById('hc-stove');
const hcSparksEl = document.getElementById('hc-sparks');
const hcStoveTagEl = document.getElementById('hc-stove-tag');
const hcSnackRowEl = document.getElementById('hc-snack-row');
const hcStoryLineEl = document.getElementById('hc-story-line');
const btnHearthHelperEl = document.getElementById('btn-hearth-helper');
const btnHearthMainEl = document.getElementById('btn-hearth-main');
const hcCodexSubEl = document.getElementById('hc-codex-sub');
const hcCodexGridEl = document.getElementById('hc-codex-grid');
const hcFooterLineEl = document.getElementById('hc-footer-line');

const shPillEl = document.getElementById('stitch-hearth-pill');
const shSegHearthEl = document.getElementById('sh-seg-hearth');
const shSegStitchEl = document.getElementById('sh-seg-stitch');
const shPillHearthEl = document.getElementById('sh-pill-hearth');
const shPillStitchEl = document.getElementById('sh-pill-stitch');

const HEARTH_CUDDLE_LINES = [
  '靠着小暖炉，手心和心里都暖暖的~',
  '松饼的甜味还留在嘴边，再靠一会儿嘛~',
  '炉火噼啪噼啪的，像在给我们讲冬天的故事~',
  '外面再冷也没关系，这个角落是我们的~'
];

function isAr16CardOpen(which = '') {
  const eb = document.getElementById('embroidery-card');
  const hc = document.getElementById('hearth-card');
  const ebOpen = Boolean(eb && !eb.classList.contains('hidden'));
  const hcOpen = Boolean(hc && !hc.classList.contains('hidden'));
  if (which === 'embroidery') return ebOpen;
  if (which === 'hearth') return hcOpen;
  return ebOpen || hcOpen;
}

function dismissEmbroideryCard() {
  document.getElementById('embroidery-card')?.classList.add('hidden');
}

function dismissHearthCard() {
  document.getElementById('hearth-card')?.classList.add('hidden');
}

// 只碰 DOM：其它卡片在模块初始化期间调用也不会触发 TDZ
function dismissAr16Cards() {
  dismissEmbroideryCard();
  dismissHearthCard();
}

// ---------------- 墙面刺绣绷架：挑一款当季绣样 → 选绣线 → 你绣一针她接一针绣满 → 收针挂上墙面（并写进当天的手写日记） ----------------
function isEmbroideryPatternUnlocked(patternId, d = ar16Clock.date()) {
  const pt = EMBROIDERY_PATTERN_BY_ID[patternId];
  if (!pt) return false;
  const rec = player.embroideryHoop.patterns[patternId];
  return Boolean(rec && rec.count > 0) || pt.season === getAromaSeasonId(d);
}

function pickEmbroideryPattern(patternId) {
  const pt = EMBROIDERY_PATTERN_BY_ID[patternId];
  if (!pt) return { ok: false, reason: 'invalid_pattern' };
  const d = ar16Clock.date();
  const seasonId = getAromaSeasonId(d);
  const rec = player.embroideryHoop.patterns[patternId];
  const owned = Boolean(rec && rec.count > 0);
  if (pt.season !== seasonId && !owned) {
    embroideryRun.lastAction = 'locked';
    playSfx('pat');
    setPlayerEmote(`「${pt.name}」要等到${EMBROIDERY_SEASON_NAMES[pt.season]}天才能绣哦，先绣当季的绣样吧~`, 2.2, 'happy', false);
    syncEmbroideryHoopUI();
    return { ok: false, reason: 'out_of_season', season: pt.season };
  }
  const same = embroideryRun.patternId === patternId && embroideryRun.phase === 'stitch';
  embroideryRun.patternId = patternId;
  if (!same) {
    embroideryRun.taps = 0;
    embroideryRun.phase = 'stitch';
  }
  if (!EMBROIDERY_THREAD_BY_ID[embroideryRun.threadId]) {
    embroideryRun.threadId = EMBROIDERY_THREAD_BY_ID[player.embroideryHoop.lastThreadId] ? player.embroideryHoop.lastThreadId : 'cream';
  }
  embroideryRun.lastAction = 'pick';
  player.embroideryHoop.lastPatternId = patternId;
  player.idleTime = 0;
  playSfx('pat');
  const best = EMBROIDERY_THREAD_BY_ID[pt.bestThread];
  setPlayerEmote(`绣「${pt.name}」吧！一共 ${pt.taps * 2} 针，你一针我一针~ 用「${best.name}」会特别好看哦`, 2.4, 'happy', false);
  syncEmbroideryHoopUI();
  return { ok: true, patternId, same, owned, inSeason: pt.season === seasonId };
}

function pickEmbroideryThread(threadId) {
  const th = EMBROIDERY_THREAD_BY_ID[threadId];
  if (!th) return { ok: false, reason: 'invalid_thread' };
  embroideryRun.threadId = threadId;
  embroideryRun.lastAction = 'thread';
  player.embroideryHoop.lastThreadId = threadId;
  player.idleTime = 0;
  playSfx('pat');
  const pt = EMBROIDERY_PATTERN_BY_ID[embroideryRun.patternId];
  const best = pt && pt.bestThread === threadId;
  setPlayerEmote(best ? `「${th.name}」配「${pt.name}」刚刚好，配色灵感 +${EMBROIDERY_RULES.bestThreadCoins}~` : `换上「${th.name}」~`, 1.8, 'happy', false);
  syncEmbroideryHoopUI();
  return { ok: true, threadId, best: Boolean(best) };
}

function stitchEmbroidery() {
  const pt = EMBROIDERY_PATTERN_BY_ID[embroideryRun.patternId];
  if (!pt) {
    setPlayerEmote('先挑一款绣样吧~', 1.6, 'happy', false);
    return { ok: false, reason: 'no_pattern' };
  }
  if (embroideryRun.phase === 'done') return { ok: false, reason: 'done' };
  if (embroideryRun.taps >= pt.taps) return { ok: false, reason: 'full' };
  embroideryRun.phase = 'stitch';
  embroideryRun.taps += 1;
  embroideryRun.flash = 0.5;
  embroideryRun.lastAction = 'stitch';
  player.idleTime = 0;
  player.happyTimer = 0.7;
  petAudio.playEmbroideryStitch(embroideryRun.taps * 2 - 1);
  petAudio.haptic('tap');
  const mine = embroideryRun.taps * 2 - 1;
  setPlayerEmote(
    embroideryRun.taps >= pt.taps
      ? `「${pt.name}」${pt.taps * 2} 针都绣满啦，收针挂上墙吧~`
      : `你绣第 ${mine} 针，我接第 ${mine + 1} 针~`,
    1.6,
    'happy',
    false
  );
  syncEmbroideryHoopUI();
  return { ok: true, taps: embroideryRun.taps, need: pt.taps, stitches: embroideryRun.taps * 2, audio: petAudio.getAr16AudioInfo() };
}

function finishEmbroidery(nowMs = ar16Clock.now()) {
  const pt = EMBROIDERY_PATTERN_BY_ID[embroideryRun.patternId];
  if (!pt) return { ok: false, reason: 'no_pattern' };
  if (embroideryRun.phase === 'done') return { ok: false, reason: 'done' };
  if (embroideryRun.taps < pt.taps) return { ok: false, reason: 'taps', taps: embroideryRun.taps };
  const eh = player.embroideryHoop;
  const d = new Date(nowMs);
  const todayKey = formatLocalDateKey(d);
  const threadId = EMBROIDERY_THREAD_BY_ID[embroideryRun.threadId] ? embroideryRun.threadId : 'cream';
  const thread = EMBROIDERY_THREAD_BY_ID[threadId];
  const prev = eh.patterns[pt.id];
  const isNew = !(prev && prev.count > 0);
  const best = pt.bestThread === threadId;
  eh.patterns[pt.id] = {
    count: (prev ? prev.count : 0) + 1,
    first: prev && prev.first ? prev.first : todayKey,
    lastThread: threadId
  };
  eh.wall = [{ patternId: pt.id, threadId, date: todayKey }, ...(eh.wall || [])].slice(0, EMBROIDERY_RULES.wallMax);
  eh.totalPieces = (eh.totalPieces || 0) + 1;
  eh.lastPatternId = pt.id;
  eh.lastThreadId = threadId;
  if (eh.rewardDate !== todayKey) {
    eh.rewardDate = todayKey;
    eh.rewardCount = 0;
  }
  let reward = null;
  if (eh.rewardCount < EMBROIDERY_RULES.dailyRewards) {
    eh.rewardCount += 1;
    reward = {
      coins: EMBROIDERY_RULES.coinReward + (isNew ? EMBROIDERY_RULES.newPatternCoins : 0) + (best ? EMBROIDERY_RULES.bestThreadCoins : 0),
      xp: EMBROIDERY_RULES.xpReward
    };
  }
  embroideryRun.phase = 'done';
  embroideryRun.taps = 0;
  embroideryRun.lastAction = 'hung';
  player.idleTime = 0;
  player.happyTimer = 2;
  player.embroideryCheerTimer = 3.2;
  player.embroideryVisual.hung = 1.6;
  petAudio.playEmbroideryHang(EMBROIDERY_PATTERNS.indexOf(pt));
  petAudio.haptic('headpat');
  spawnInteractVfx(player.x, player.y - 28, 'sparkle', 8);
  recordJournalActivity('embroideries', 1, d);
  if (reward) {
    addCoins(reward.coins, player.x + 24, player.y - 44, '刺绣 ');
    addAffectionXp(reward.xp, '和主人一起绣好一幅小刺绣');
  }
  setPlayerEmote(
    `${isNew ? '新绣样！' : ''}${thread.name}的「${pt.name}」挂上墙啦~ ${pt.story}${best ? '（配色灵感）' : ''} 今天的日记也贴上刺绣布贴了~`,
    3.2,
    'cheer',
    true
  );
  embroideryRun.lastResult = {
    patternId: pt.id,
    name: pt.name,
    threadId,
    isNew,
    best,
    reward,
    count: eh.patterns[pt.id].count,
    wallCount: eh.wall.length,
    collected: getEmbroideryStats(d).collected
  };
  savePetState();
  syncEmbroideryHoopUI();
  syncDiaryBookUI();
  return { ok: true, ...embroideryRun.lastResult, audio: petAudio.getAr16AudioInfo() };
}

function getEmbroideryMainState() {
  const pt = EMBROIDERY_PATTERN_BY_ID[embroideryRun.patternId];
  if (embroideryRun.phase === 'done') return { mode: 'again', disabled: !pt, label: '再绣一幅' };
  if (!pt) return { mode: 'pick', disabled: true, label: '先挑绣样' };
  if (embroideryRun.taps < pt.taps) return { mode: 'stitch', disabled: false, label: `绣一针 ${embroideryRun.taps}/${pt.taps}` };
  return { mode: 'finish', disabled: false, label: '收针挂墙' };
}

function handleEmbroideryMainAction() {
  const st = getEmbroideryMainState();
  if (st.disabled) return { ok: false, reason: st.mode };
  if (st.mode === 'stitch') return stitchEmbroidery();
  if (st.mode === 'finish') return finishEmbroidery();
  const pt = EMBROIDERY_PATTERN_BY_ID[embroideryRun.patternId];
  if (pt && !isEmbroideryPatternUnlocked(pt.id)) {
    embroideryRun.patternId = '';
    embroideryRun.phase = 'pick';
  } else {
    embroideryRun.phase = 'stitch';
  }
  embroideryRun.taps = 0;
  embroideryRun.lastAction = 'again';
  playSfx('pat');
  setPlayerEmote('再绷一块新布，再绣一幅~', 1.6, 'happy', false);
  syncEmbroideryHoopUI();
  return { ok: true, phase: embroideryRun.phase };
}

// 她来绣：没挑绣样时先挑当季还没绣过的那款（都绣过就按日期轮换），换上最搭的绣线，一口气绣满并收针挂墙
function embroideryHelper() {
  embroideryRun.helperSeq += 1;
  const d = ar16Clock.date();
  if (
    embroideryRun.phase === 'done' ||
    !EMBROIDERY_PATTERN_BY_ID[embroideryRun.patternId] ||
    !isEmbroideryPatternUnlocked(embroideryRun.patternId, d)
  ) {
    const seasonPatterns = getEmbroiderySeasonPatterns(getAromaSeasonId(d));
    const fresh = seasonPatterns.find((p) => !(player.embroideryHoop.patterns[p.id] && player.embroideryHoop.patterns[p.id].count > 0));
    const pick = fresh || seasonPatterns[(d.getDate() + embroideryRun.helperSeq) % seasonPatterns.length];
    embroideryRun.patternId = '';
    embroideryRun.phase = 'pick';
    pickEmbroideryPattern(pick.id);
  }
  const pt = EMBROIDERY_PATTERN_BY_ID[embroideryRun.patternId];
  if (pt && embroideryRun.taps === 0) pickEmbroideryThread(pt.bestThread);
  let guard = 0;
  while (pt && embroideryRun.taps < pt.taps && guard < 8) {
    stitchEmbroidery();
    guard += 1;
  }
  return { ...finishEmbroidery(), step: 'helper' };
}

// ---------------- 地板小暖炉冬日角：按本地日期 + 时段亮起，挑口味翻面烤松饼 → 分着吃 → 围炉依偎 20 分钟（冬日亲密加成） ----------------
function kindleHearth(nowMs = ar16Clock.now()) {
  const st = getHearthState(new Date(nowMs));
  if (st.level > 0) return { ok: false, reason: 'lit', level: st.level };
  if (gameMode !== 'pet') switchMode('pet');
  player.hearthCorner.kindle = { startMs: Math.round(nowMs), endMs: Math.round(nowMs + HEARTH_RULES.kindleMin * 60000) };
  player.hearthCorner.totalKindles = (player.hearthCorner.totalKindles || 0) + 1;
  // 自己生的火：火力从休眠变小火不再额外播报“换档”
  snackRun.wasLevel = 1;
  snackRun.wasKindle = true;
  snackRun.lastAction = 'kindle';
  player.idleTime = 0;
  player.hearthCheerTimer = 2.4;
  petAudio.playHearthKindle();
  petAudio.haptic('tap');
  setPlayerEmote(`现在是${st.monthTag}的${st.seg.name}，暖炉在休息，我们一起生个 ${HEARTH_RULES.kindleMin} 分钟的小火吧~`, 2.4, 'happy', false);
  savePetState();
  syncHearthCornerUI();
  return { ok: true, level: 1, endMs: player.hearthCorner.kindle.endMs, audio: petAudio.getAr16AudioInfo() };
}

function pickHearthSnack(snackId) {
  const sn = HEARTH_SNACK_BY_ID[snackId];
  if (!sn) return { ok: false, reason: 'invalid_snack' };
  const same = snackRun.snackId === snackId && snackRun.phase === 'roast';
  snackRun.snackId = snackId;
  if (!same) {
    snackRun.flips = 0;
    snackRun.phase = 'roast';
  }
  snackRun.lastAction = 'pick';
  player.hearthCorner.lastSnackId = snackId;
  player.idleTime = 0;
  playSfx('pat');
  const st = getHearthState();
  setPlayerEmote(
    st.level > 0
      ? `烤「${sn.name}」！${st.levelName}要翻 ${HEARTH_LEVELS[st.level].flips} 次面，烤出${HEARTH_LEVELS[st.level].texture}的口感~`
      : `「${sn.name}」先放一边，暖炉还在休息，先一起生个小火吧~`,
    2.2,
    'happy',
    false
  );
  syncHearthCornerUI();
  return { ok: true, snackId, same, level: st.level };
}

function flipHearthSnack() {
  const sn = HEARTH_SNACK_BY_ID[snackRun.snackId];
  if (!sn) {
    setPlayerEmote('先挑一种口味吧~', 1.6, 'happy', false);
    return { ok: false, reason: 'no_snack' };
  }
  const st = getHearthState();
  if (st.level < 1) return { ok: false, reason: 'cold' };
  if (snackRun.phase === 'shared') return { ok: false, reason: 'shared' };
  const need = HEARTH_LEVELS[st.level].flips;
  if (snackRun.flips >= need) return { ok: false, reason: 'full' };
  snackRun.phase = 'roast';
  snackRun.flips += 1;
  snackRun.flip = 0.6;
  snackRun.lastAction = 'flip';
  player.idleTime = 0;
  player.happyTimer = 0.7;
  petAudio.playSnackFlip(snackRun.flips);
  petAudio.haptic('tap');
  setPlayerEmote(
    snackRun.flips >= need ? `「${sn.name}」烤得${HEARTH_LEVELS[st.level].texture}啦，分着吃吧~` : `翻面！第 ${snackRun.flips} 次，香味飘出来了~`,
    1.6,
    'happy',
    false
  );
  syncHearthCornerUI();
  return { ok: true, flips: snackRun.flips, need, level: st.level, audio: petAudio.getAr16AudioInfo() };
}

function shareHearthSnack(nowMs = ar16Clock.now()) {
  const sn = HEARTH_SNACK_BY_ID[snackRun.snackId];
  if (!sn) return { ok: false, reason: 'no_snack' };
  const d = new Date(nowMs);
  const st = getHearthState(d);
  if (st.level < 1) return { ok: false, reason: 'cold' };
  if (snackRun.phase === 'shared') return { ok: false, reason: 'shared' };
  const lv = HEARTH_LEVELS[st.level];
  if (snackRun.flips < lv.flips) return { ok: false, reason: 'flips', flips: snackRun.flips };
  const hc = player.hearthCorner;
  const todayKey = formatLocalDateKey(d);
  const key = `${sn.id}_${lv.id}`;
  const isNew = !(hc.entries[key] > 0);
  hc.entries[key] = (hc.entries[key] || 0) + 1;
  hc.totalSnacks = (hc.totalSnacks || 0) + 1;
  hc.totalCuddles = (hc.totalCuddles || 0) + 1;
  hc.lastSnackId = sn.id;
  hc.lastLevelId = lv.id;
  if (hc.rewardDate !== todayKey) {
    hc.rewardDate = todayKey;
    hc.rewardCount = 0;
  }
  let reward = null;
  if (hc.rewardCount < HEARTH_RULES.dailyRewards) {
    hc.rewardCount += 1;
    reward = {
      coins: HEARTH_RULES.coinReward + (isNew ? HEARTH_RULES.newEntryCoins : 0),
      xp: HEARTH_RULES.xpBase + HEARTH_RULES.xpPerLevel * st.level
    };
  }
  // 围炉依偎：从现在起 20 分钟，按这次的火力给日常亲密加成（再分一块就重新计时）
  hc.cuddle = { startMs: Math.round(nowMs), endMs: Math.round(nowMs + HEARTH_RULES.cuddleMin * 60000), level: st.level };
  snackRun.phase = 'shared';
  snackRun.flips = 0;
  snackRun.wasCuddle = true;
  snackRun.lastAction = 'shared';
  player.idleTime = 0;
  player.happyTimer = 2;
  player.hearthCheerTimer = 3.4;
  petAudio.playSnackShare(HEARTH_SNACKS.indexOf(sn));
  petAudio.haptic('headpat');
  spawnInteractVfx(player.x, player.y - 26, 'love', 7);
  recordJournalActivity('snacks', 1, d);
  if (reward) {
    addCoins(reward.coins, player.x + 22, player.y - 44, '炉边 ');
    addAffectionXp(reward.xp, `围炉分着吃${lv.texture}松饼`);
  }
  setPlayerEmote(
    `${isNew ? '点心手帐新收录：' : ''}${lv.texture}的「${sn.name}」一人一半~ 一起靠着暖炉依偎 ${HEARTH_RULES.cuddleMin} 分钟，亲密 +${Math.round(lv.bonus * 100)}%`,
    3.0,
    'cheer',
    true
  );
  snackRun.lastResult = {
    snackId: sn.id,
    name: sn.name,
    levelId: lv.id,
    level: st.level,
    entryKey: key,
    isNew,
    reward,
    cuddleEndMs: hc.cuddle.endMs,
    bonus: lv.bonus,
    totalSnacks: hc.totalSnacks
  };
  savePetState();
  syncHearthCornerUI();
  syncDiaryBookUI();
  return { ok: true, ...snackRun.lastResult, audio: petAudio.getAr16AudioInfo() };
}

function getHearthMainState() {
  const st = getHearthState();
  if (st.level < 1) return { mode: 'kindle', disabled: false, label: '一起生个小火' };
  if (snackRun.phase === 'shared') return { mode: 'again', disabled: false, label: '再烤一块' };
  const sn = HEARTH_SNACK_BY_ID[snackRun.snackId];
  if (!sn) return { mode: 'pick', disabled: true, label: '先挑口味' };
  const need = HEARTH_LEVELS[st.level].flips;
  if (snackRun.flips < need) return { mode: 'flip', disabled: false, label: `翻面 ${snackRun.flips}/${need}` };
  return { mode: 'share', disabled: false, label: '分着吃' };
}

function handleHearthMainAction() {
  const st = getHearthMainState();
  if (st.disabled) return { ok: false, reason: st.mode };
  if (st.mode === 'kindle') return kindleHearth();
  if (st.mode === 'flip') return flipHearthSnack();
  if (st.mode === 'share') return shareHearthSnack();
  snackRun.phase = HEARTH_SNACK_BY_ID[snackRun.snackId] ? 'roast' : 'pick';
  snackRun.flips = 0;
  snackRun.lastAction = 'again';
  playSfx('pat');
  setPlayerEmote('再放一块松饼上去~', 1.6, 'happy', false);
  syncHearthCornerUI();
  return { ok: true, phase: snackRun.phase };
}

// 她来烤：暖炉在休息就先一起生个小火；挑这档火力下还没收录的口味（都收过就按日期轮换），翻好面直接分着吃
function hearthHelper() {
  snackRun.helperSeq += 1;
  let st = getHearthState();
  let kindled = false;
  if (st.level < 1) {
    kindled = kindleHearth().ok;
    st = getHearthState();
  }
  if (st.level < 1) return { ok: false, reason: 'cold', step: 'helper' };
  if (snackRun.phase === 'shared' || !HEARTH_SNACK_BY_ID[snackRun.snackId]) {
    const lv = HEARTH_LEVELS[st.level];
    const fresh = HEARTH_SNACKS.find((s) => !(player.hearthCorner.entries[`${s.id}_${lv.id}`] > 0));
    const pick = fresh || HEARTH_SNACKS[(ar16Clock.date().getDate() + snackRun.helperSeq) % HEARTH_SNACKS.length];
    snackRun.snackId = '';
    snackRun.phase = 'pick';
    pickHearthSnack(pick.id);
  }
  let guard = 0;
  while (snackRun.flips < HEARTH_LEVELS[st.level].flips && guard < 8) {
    flipHearthSnack();
    guard += 1;
  }
  return { ...shareHearthSnack(), kindled, step: 'helper' };
}

let ebPatternKey = null;
let ebThreadKey = null;
let ebAlbumKey = null;
let ebStitchKey = null;
let hcSnackKey = null;
let hcCodexKey = null;
let hcSparkKey = null;

function syncEmbroideryHoopUI() {
  const eh = player.embroideryHoop;
  if (!eh) return;
  const d = ar16Clock.date();
  const stats = getEmbroideryStats(d);
  const cardOpen = isAr16CardOpen('embroidery');
  const pt = EMBROIDERY_PATTERN_BY_ID[embroideryRun.patternId] || null;
  const thread = EMBROIDERY_THREAD_BY_ID[embroideryRun.threadId] || EMBROIDERY_THREAD_BY_ID[eh.lastThreadId] || EMBROIDERY_THREADS[0];
  const seasonName = EMBROIDERY_SEASON_NAMES[stats.seasonId];
  const working = Boolean(pt && embroideryRun.phase === 'stitch');

  if (ebSummaryPillEl) ebSummaryPillEl.textContent = `绣样 ${stats.collected}/${stats.totalPatterns} · 墙上 ${stats.wallCount}`;
  if (ebSeasonRowEl) ebSeasonRowEl.dataset.season = stats.seasonId;
  if (ebSeasonNameEl) ebSeasonNameEl.textContent = `本季 · ${seasonName}日绣样`;
  if (ebSeasonSubEl) {
    ebSeasonSubEl.textContent = working
      ? `${pt.name} · ${thread.name} · 已绣 ${embroideryRun.taps * 2}/${pt.taps * 2} 针`
      : `${d.getMonth() + 1}月${d.getDate()}日 · 你绣一针她接一针 · 今日奖励 ${stats.rewardsToday}/${stats.dailyRewards}`;
  }
  if (ebHoopEl) {
    ebHoopEl.dataset.phase = embroideryRun.phase;
    ebHoopEl.dataset.pattern = pt ? pt.id : '';
    ebHoopEl.style.setProperty('--eb-rgb', pt ? pt.rgb : '255, 240, 232');
    ebHoopEl.style.setProperty('--eb-thread-rgb', thread.rgb);
    ebHoopEl.style.setProperty('--eb-progress', String(working ? embroideryRun.taps / pt.taps : embroideryRun.phase === 'done' ? 1 : 0));
    ebHoopEl.classList.toggle('is-stitching', embroideryRun.flash > 0);
  }
  if (ebHoopPatchEl) ebHoopPatchEl.classList.toggle('hidden', !(working || embroideryRun.phase === 'done'));
  if (ebStitchesEl) {
    const n = working ? embroideryRun.taps * 2 : 0;
    const key = `${pt ? pt.id : ''}|${n}|${pt ? pt.taps * 2 : 0}`;
    if (key !== ebStitchKey) {
      ebStitchKey = key;
      const total = pt ? pt.taps * 2 : 0;
      ebStitchesEl.innerHTML = Array.from({ length: total }, (_, i) => {
        const a = (i / Math.max(1, total)) * Math.PI * 2 - Math.PI * 0.5;
        const x = 50 + Math.cos(a) * 30;
        const y = 46 + Math.sin(a) * 30;
        return `<img src="./assets/vfx_sparkle.webp?v=hd31" alt="" class="eb-stitch-dot${i < n ? ' is-on' : ''}${i % 2 ? ' is-hers' : ''}" style="left:${x.toFixed(1)}%;top:${y.toFixed(1)}%" />`;
      }).join('');
    }
  }
  if (ebHoopTagEl) {
    ebHoopTagEl.textContent =
      embroideryRun.phase === 'done' && embroideryRun.lastResult
        ? `${EMBROIDERY_PATTERN_BY_ID[embroideryRun.lastResult.patternId].short} · 已挂墙`
        : pt
          ? `${pt.short} · ${embroideryRun.taps * 2}/${pt.taps * 2} 针`
          : '先挑绣样';
  }

  if (ebPatternRowEl) {
    const seasonPatterns = getEmbroiderySeasonPatterns(stats.seasonId);
    const rKey = seasonPatterns.map((p) => p.id).join(',');
    if (rKey !== ebPatternKey) {
      ebPatternKey = rKey;
      ebPatternRowEl.innerHTML = seasonPatterns
        .map(
          (p) => `<button type="button" class="eb-pattern-chip" data-pattern-id="${p.id}" style="--eb-rgb:${p.rgb}">
            <img src="./assets/embroidery_patch.webp?v=hd31" alt="" class="eb-pattern-ico" />
            <span class="eb-pattern-meta">
              <span class="eb-pattern-name">${p.name}</span>
              <em class="eb-pattern-sub"></em>
            </span>
          </button>`
        )
        .join('');
    }
    ebPatternRowEl.querySelectorAll('.eb-pattern-chip').forEach((chip) => {
      const pid = chip.dataset.patternId;
      const p = EMBROIDERY_PATTERN_BY_ID[pid];
      const rec = eh.patterns[pid];
      chip.classList.toggle('active', Boolean(pt && pt.id === pid));
      chip.classList.toggle('is-found', Boolean(rec && rec.count > 0));
      const sub = chip.querySelector('.eb-pattern-sub');
      if (sub) sub.textContent = rec && rec.count > 0 ? `${p.taps * 2}针 · 绣过${rec.count}次` : `${p.taps * 2}针 · 新绣样`;
      chip.title = `${p.name} · 最搭「${EMBROIDERY_THREAD_BY_ID[p.bestThread].name}」`;
    });
  }
  if (ebThreadRowEl) {
    const tKey = EMBROIDERY_THREADS.map((t) => t.id).join(',');
    if (tKey !== ebThreadKey) {
      ebThreadKey = tKey;
      ebThreadRowEl.innerHTML = EMBROIDERY_THREADS.map(
        (t) => `<button type="button" class="eb-thread-chip" data-thread-id="${t.id}" style="--eb-thread-rgb:${t.rgb}">
            <span class="eb-thread-dot"></span>
            <span class="eb-thread-name">${t.short}</span>
          </button>`
      ).join('');
    }
    ebThreadRowEl.querySelectorAll('.eb-thread-chip').forEach((chip) => {
      chip.classList.toggle('active', chip.dataset.threadId === thread.id);
      chip.classList.toggle('is-best', Boolean(pt && pt.bestThread === chip.dataset.threadId));
      chip.title = `${EMBROIDERY_THREAD_BY_ID[chip.dataset.threadId].name}${pt && pt.bestThread === chip.dataset.threadId ? ' · 最搭（配色灵感）' : ''}`;
    });
  }
  if (ebStoryLineEl) {
    ebStoryLineEl.textContent =
      embroideryRun.phase === 'done' && embroideryRun.lastResult
        ? EMBROIDERY_PATTERN_BY_ID[embroideryRun.lastResult.patternId].story
        : pt
          ? `「${pt.name}」最搭「${EMBROIDERY_THREAD_BY_ID[pt.bestThread].name}」，用它收针再 +${EMBROIDERY_RULES.bestThreadCoins} 金币`
          : `${seasonName}天可绣「${getEmbroiderySeasonPatterns(stats.seasonId).map((p) => p.name).join('」「')}」，绣过的绣样随时能再绣`;
  }

  const mainState = getEmbroideryMainState();
  if (btnEmbroideryMainEl) {
    btnEmbroideryMainEl.disabled = mainState.disabled;
    btnEmbroideryMainEl.textContent = mainState.label;
    btnEmbroideryMainEl.dataset.mode = mainState.mode;
    btnEmbroideryMainEl.classList.toggle('is-ready', !mainState.disabled && mainState.mode === 'finish');
  }
  if (btnEmbroideryHelperEl) btnEmbroideryHelperEl.textContent = '她来绣';

  if (ebAlbumGridEl) {
    const aKey = `${stats.seasonId}|${EMBROIDERY_PATTERNS.map((p) => {
      const rec = eh.patterns[p.id];
      return rec ? `${rec.count}.${rec.lastThread}` : '0';
    }).join(',')}|${pt ? pt.id : ''}`;
    if (aKey !== ebAlbumKey) {
      ebAlbumKey = aKey;
      ebAlbumGridEl.innerHTML = EMBROIDERY_PATTERNS.map((p) => {
        const rec = eh.patterns[p.id];
        const found = Boolean(rec && rec.count > 0);
        const inSeason = p.season === stats.seasonId;
        const tRgb = found && EMBROIDERY_THREAD_BY_ID[rec.lastThread] ? EMBROIDERY_THREAD_BY_ID[rec.lastThread].rgb : p.rgb;
        const tag = found ? `${p.short}${rec.count > 1 ? `×${rec.count}` : ''}` : `${EMBROIDERY_SEASON_NAMES[p.season]}季`;
        return `<button type="button" class="eb-album-chip${found ? ' is-found' : ''}${inSeason ? ' is-season' : ''}${pt && pt.id === p.id ? ' is-current' : ''}" data-pattern-id="${p.id}" style="--eb-rgb:${p.rgb};--eb-thread-rgb:${tRgb}" title="${p.name}${found ? ` · 绣过 ${rec.count} 次` : inSeason ? ' · 当季可绣' : ` · ${EMBROIDERY_SEASON_NAMES[p.season]}季可绣`}">
            <img src="./assets/embroidery_patch.webp?v=hd31" alt="" class="eb-album-ico" />
            <em class="eb-album-tag">${tag}</em>
          </button>`;
      }).join('');
    }
  }
  if (ebAlbumSubEl) {
    ebAlbumSubEl.textContent = `绣样册 ${stats.collected}/${stats.totalPatterns} · 墙上 ${stats.wallCount}/${EMBROIDERY_RULES.wallMax} 幅 · 今日奖励 ${stats.rewardsToday}/${stats.dailyRewards}`;
  }
  if (ebFooterLineEl) {
    ebFooterLineEl.textContent = `收针挂墙：每天前 ${EMBROIDERY_RULES.dailyRewards} 幅 +${EMBROIDERY_RULES.coinReward} 金币，新绣样再 +${EMBROIDERY_RULES.newPatternCoins}，最搭绣线 +${EMBROIDERY_RULES.bestThreadCoins}；当天日记多一枚刺绣布贴`;
  }

  const ev = player.embroideryVisual;
  ev.active = working;
  ev.patternId = pt ? pt.id : '';
  ev.patternRgb = pt ? pt.rgb : '';
  ev.threadRgb = thread.rgb;
  ev.taps = working ? embroideryRun.taps : 0;
  ev.need = pt ? pt.taps : 0;
  ev.progress = working ? embroideryRun.taps / pt.taps : 0;
  ev.stitches = working ? embroideryRun.taps * 2 : 0;
  ev.cardOpen = cardOpen;
  ev.cheer = player.embroideryCheerTimer || 0;
  // 场景标签保持短小：不伸到陶艺架 / 星空灯上
  ev.label = working ? `${pt.short} ${embroideryRun.taps * 2}/${pt.taps * 2}针` : stats.wallCount > 0 ? `刺绣 · 墙上${stats.wallCount}幅` : '刺绣绷架';
  ev.wall = (eh.wall || []).map((w) => ({
    patternId: w.patternId,
    patternRgb: (EMBROIDERY_PATTERN_BY_ID[w.patternId] || EMBROIDERY_PATTERNS[0]).rgb,
    threadRgb: (EMBROIDERY_THREAD_BY_ID[w.threadId] || EMBROIDERY_THREADS[0]).rgb
  }));
  syncStitchHearthPill(stats, null);
}

function syncAr16Overlay(stateIn = null, cuddleIn) {
  const ho = document.getElementById('hearth-ambient-overlay');
  if (!ho) return;
  const st = stateIn || getHearthState();
  const cuddle = cuddleIn === undefined ? getHearthCuddle() : cuddleIn;
  const show = Boolean(st.level > 0 && gameMode === 'pet');
  ho.classList.toggle('hidden', !show);
  ho.dataset.level = show ? String(st.level) : '0';
  ho.dataset.cuddle = show && cuddle ? '1' : '0';
  ho.style.setProperty('--hearth-rgb', st.rgb);
}

function syncHearthCornerUI() {
  const hc = player.hearthCorner;
  if (!hc) return;
  const d = ar16Clock.date();
  const stats = getHearthStats(d);
  const st = stats.state;
  const cuddle = stats.cuddle;
  const cardOpen = isAr16CardOpen('hearth');
  const sn = HEARTH_SNACK_BY_ID[snackRun.snackId] || null;
  const lv = HEARTH_LEVELS[st.level];
  const shownLv = HEARTH_LEVELS[Math.max(1, st.level)];
  const roasting = Boolean(sn && snackRun.phase === 'roast' && st.level > 0);

  if (hcSummaryPillEl) hcSummaryPillEl.textContent = `点心手帐 ${stats.entries}/${stats.totalEntries} · 依偎 ${stats.totalCuddles}`;
  if (hcHeatRowEl) {
    hcHeatRowEl.dataset.level = String(st.level);
    hcHeatRowEl.dataset.seg = st.segId;
    hcHeatRowEl.dataset.cold = st.coldId;
  }
  if (hcHeatNameEl) hcHeatNameEl.textContent = `${st.monthTag} · ${st.seg.name} · ${st.kindled ? '小火（一起生的）' : lv.name}`;
  if (hcHeatSubEl) {
    hcHeatSubEl.textContent = cuddle
      ? `围炉依偎还剩 ${cuddle.minsLeft} 分 · 日常亲密 +${Math.round(cuddle.bonus * 100)}%`
      : st.kindled && st.kindle
        ? `小火还剩 ${st.kindle.minsLeft} 分 · ${st.seg.next} 换下一段`
        : st.level > 0
          ? `${d.getMonth() + 1}月${d.getDate()}日 · 按本地日期与时段亮起 · ${st.seg.next} 换下一段`
          : `${d.getMonth() + 1}月${d.getDate()}日 · 暖炉休息中 · 可以一起生个 ${HEARTH_RULES.kindleMin} 分钟小火`;
  }
  if (hcStoveEl) {
    hcStoveEl.dataset.level = String(st.level);
    hcStoveEl.dataset.phase = snackRun.phase;
    hcStoveEl.dataset.cuddle = cuddle ? '1' : '0';
    hcStoveEl.style.setProperty('--hearth-rgb', lv.rgb);
    hcStoveEl.style.setProperty('--snack-rgb', sn ? sn.rgb : '255, 238, 214');
    hcStoveEl.classList.toggle('is-flipping', snackRun.flip > 0);
  }
  if (hcSparksEl) {
    const key = `${st.level}|${roasting ? snackRun.flips : -1}`;
    if (key !== hcSparkKey) {
      hcSparkKey = key;
      const n = st.level > 0 ? st.level + 1 + (roasting ? Math.min(3, snackRun.flips) : 0) : 0;
      hcSparksEl.innerHTML = Array.from(
        { length: n },
        (_, i) => `<img src="./assets/vfx_sparkle.webp?v=hd31" alt="" class="hc-spark" style="left:${(22 + ((i * 37) % 56)).toFixed(0)}%;animation-delay:${(i * 0.43).toFixed(2)}s" />`
      ).join('');
    }
  }
  if (hcStoveTagEl) {
    hcStoveTagEl.textContent =
      st.level < 1
        ? '暖炉休息中'
        : snackRun.phase === 'shared' && snackRun.lastResult
          ? `${HEARTH_SNACK_BY_ID[snackRun.lastResult.snackId].short} · 分着吃啦`
          : sn
            ? `${sn.short} · 翻面 ${snackRun.flips}/${lv.flips}`
            : `${lv.name} · 先挑口味`;
  }

  if (hcSnackRowEl) {
    const sKey = HEARTH_SNACKS.map((s) => s.id).join(',');
    if (sKey !== hcSnackKey) {
      hcSnackKey = sKey;
      hcSnackRowEl.innerHTML = HEARTH_SNACKS.map(
        (s) => `<button type="button" class="hc-snack-chip" data-snack-id="${s.id}" style="--snack-rgb:${s.rgb}">
            <img src="./assets/roasted_snack.webp?v=hd31" alt="" class="hc-snack-ico" />
            <span class="hc-snack-name">${s.short}</span>
          </button>`
      ).join('');
    }
    hcSnackRowEl.querySelectorAll('.hc-snack-chip').forEach((chip) => {
      const sid = chip.dataset.snackId;
      const found = Number(hc.entries[`${sid}_${shownLv.id}`]) > 0;
      chip.classList.toggle('active', Boolean(sn && sn.id === sid));
      chip.classList.toggle('is-found', found);
      chip.title = `${HEARTH_SNACK_BY_ID[sid].name} · ${shownLv.name}${shownLv.texture}${found ? ' · 已收录' : ' · 未收录'}`;
    });
  }
  if (hcStoryLineEl) {
    hcStoryLineEl.textContent =
      st.level < 1
        ? `${st.monthTag}的${st.seg.name}暖炉在休息，深冬和夜里火最旺；也可以一起生个小火`
        : snackRun.phase === 'shared' && snackRun.lastResult
          ? `${HEARTH_LEVELS[snackRun.lastResult.level].texture}的「${snackRun.lastResult.name}」分着吃完啦，一起靠着暖炉~`
          : sn
            ? `「${sn.name}」用${lv.name}烤，翻 ${lv.flips} 次面就是${lv.texture}的口感`
            : `现在是${lv.name}：翻 ${lv.flips} 次面烤出${lv.texture}口感，火越旺越快`;
  }

  const mainState = getHearthMainState();
  if (btnHearthMainEl) {
    btnHearthMainEl.disabled = mainState.disabled;
    btnHearthMainEl.textContent = mainState.label;
    btnHearthMainEl.dataset.mode = mainState.mode;
    btnHearthMainEl.classList.toggle('is-ready', !mainState.disabled && (mainState.mode === 'share' || mainState.mode === 'kindle'));
  }
  if (btnHearthHelperEl) btnHearthHelperEl.textContent = st.level < 1 ? '她来生火' : '她来烤';

  if (hcCodexGridEl) {
    const cKey = `${shownLv.id}|${HEARTH_SNACKS.map((s) => (Number(hc.entries[`${s.id}_${shownLv.id}`]) > 0 ? 1 : 0)).join('')}|${sn ? sn.id : ''}`;
    if (cKey !== hcCodexKey) {
      hcCodexKey = cKey;
      hcCodexGridEl.innerHTML = HEARTH_SNACKS.map((s) => {
        const found = Number(hc.entries[`${s.id}_${shownLv.id}`]) > 0;
        return `<span class="hc-codex-chip${found ? ' is-found' : ''}${sn && sn.id === s.id ? ' is-now' : ''}" data-entry-key="${s.id}_${shownLv.id}" style="--snack-rgb:${s.rgb}" title="${shownLv.name} · ${s.name}${found ? ' · 已收录' : ' · 未收录'}">
            <img src="./assets/roasted_snack.webp?v=hd31" alt="" class="hc-codex-ico" />
            <em class="hc-codex-tag">${found ? `${shownLv.texture}${s.short}` : '待收录'}</em>
          </span>`;
      }).join('');
    }
  }
  if (hcCodexSubEl) {
    hcCodexSubEl.textContent = `炉边点心手帐 ${stats.entries}/${stats.totalEntries} · ${shownLv.name} ${stats.levelFound}/${HEARTH_SNACKS.length} · 今日 ${stats.rewardsToday}/${stats.dailyRewards}`;
  }
  if (hcFooterLineEl) {
    hcFooterLineEl.textContent = cuddle
      ? `围炉依偎中：日常亲密 +${Math.round(cuddle.bonus * 100)}%（${cuddle.levelName}），还剩 ${cuddle.minsLeft} 分；再分一块就重新计时`
      : `分着吃：每天前 ${HEARTH_RULES.dailyRewards} 块 +${HEARTH_RULES.coinReward} 金币，手帐新收录再 +${HEARTH_RULES.newEntryCoins}；之后围炉依偎 ${HEARTH_RULES.cuddleMin} 分钟，小火 / 暖火 / 旺火亲密 +4% / +6% / +8%`;
  }

  syncAr16Overlay(st, cuddle);
  const hv = player.hearthVisual;
  hv.level = gameMode === 'pet' ? st.level : 0;
  hv.rgb = lv.rgb;
  hv.cuddle = Boolean(cuddle);
  hv.cardOpen = cardOpen;
  hv.roasting = roasting;
  hv.flips = roasting ? snackRun.flips : 0;
  hv.need = lv.flips;
  hv.snackRgb = sn ? sn.rgb : '';
  hv.flip = snackRun.flip;
  hv.cheer = player.hearthCheerTimer || 0;
  hv.label = cuddle ? `暖炉 · 依偎${cuddle.minsLeft}分` : st.level > 0 ? `暖炉 · ${lv.name}` : '暖炉 · 休息';
  syncStitchHearthPill(null, stats);
}

// 每秒复核一次：暖炉火力按可注入时钟换档（跨时段 / 跨日）；一起生的小火与围炉依偎到点结束
function refreshAr16Clock() {
  const nowMs = ar16Clock.now();
  const d = new Date(nowMs);
  const st = getHearthState(d);
  const cuddle = getHearthCuddle(nowMs);
  let hearthChanged = false;
  if (snackRun.wasLevel !== st.level) {
    if (snackRun.wasLevel >= 0 && gameMode === 'pet') {
      setPlayerEmote(
        st.level > 0 ? `${st.seg.name}啦，小暖炉换成「${st.levelName}」~` : '小暖炉慢慢歇下来了，想烤点心可以一起生个小火~',
        2.0,
        'happy',
        false
      );
    }
    if (snackRun.wasLevel >= 0 && st.level > 0 && snackRun.phase === 'roast' && snackRun.flips > HEARTH_LEVELS[st.level].flips) {
      snackRun.flips = HEARTH_LEVELS[st.level].flips;
    }
    snackRun.wasLevel = st.level;
    hearthChanged = true;
  }
  if (snackRun.wasCuddle && !cuddle) {
    snackRun.wasCuddle = false;
    if (player.hearthCorner.cuddle) {
      player.hearthCorner.cuddle = null;
      savePetState();
    }
    if (gameMode === 'pet') setPlayerEmote('围炉依偎的时间到啦，下次再一起烤点心~', 1.8, 'happy', false);
    hearthChanged = true;
  } else {
    snackRun.wasCuddle = Boolean(cuddle);
    if (!cuddle && player.hearthCorner.cuddle && Number(player.hearthCorner.cuddle.endMs) <= nowMs) {
      // 旧存档里早已结束的依偎：静默清掉
      player.hearthCorner.cuddle = null;
      savePetState();
    }
  }
  const kindle = getHearthKindle(nowMs);
  if (snackRun.wasKindle && !kindle) {
    snackRun.wasKindle = false;
    hearthChanged = true;
  } else {
    snackRun.wasKindle = Boolean(kindle);
  }
  if (!kindle && player.hearthCorner.kindle && Number(player.hearthCorner.kindle.endMs) <= nowMs) {
    player.hearthCorner.kindle = null;
    savePetState();
  }
  const dayKey = formatLocalDateKey(d);
  let embroideryChanged = false;
  if (dayKey !== snackRun.dayKey) {
    snackRun.dayKey = dayKey;
    hearthChanged = true;
    embroideryChanged = true;
  }
  if (embroideryChanged || isAr16CardOpen('embroidery')) syncEmbroideryHoopUI();
  if (hearthChanged || cuddle || kindle || isAr16CardOpen('hearth')) syncHearthCornerUI();
  else syncAr16Overlay(st, cuddle);
}

// ---------------- AR-16 合并紧凑胶囊：围炉依偎倒计时 / 正在烤 + 刺绣进度，窄屏放不下就收起 ----------------
function syncStitchHearthPill(esIn = null, hsIn = null) {
  if (!shPillEl) return;
  const es = esIn || getEmbroideryStats();
  const hs = hsIn || getHearthStats();
  const showHearth = Boolean(hs.cuddle || hs.roasting);
  const showStitch = Boolean(es.stitching);
  shPillEl.classList.toggle('hidden', !(gameMode === 'pet' && (showHearth || showStitch)));
  shPillEl.classList.toggle('has-cuddle', Boolean(hs.cuddle));
  shSegHearthEl?.classList.toggle('hidden', !showHearth);
  shSegStitchEl?.classList.toggle('hidden', !showStitch);
  // 依偎倒计时更有时效：两段都在时优先留暖炉段
  shSegHearthEl?.classList.toggle('is-priority', showHearth);
  shSegStitchEl?.classList.toggle('is-priority', !showHearth);
  if (shPillHearthEl) shPillHearthEl.textContent = hs.cuddle ? `依偎${hs.cuddle.minsLeft}分` : hs.roasting ? '烤松饼' : '';
  if (shPillStitchEl) shPillStitchEl.textContent = showStitch ? `${es.taps * 2}/${es.need * 2}` : '';
  shPillEl.style.setProperty('--hearth-rgb', hs.state.rgb);
  shPillEl.title = `${hs.cuddle ? `围炉依偎还剩 ${hs.cuddle.minsLeft} 分钟（亲密 +${Math.round(hs.cuddle.bonus * 100)}%）` : hs.roasting ? '小暖炉上正烤着松饼' : '地板小暖炉'} · ${showStitch ? `刺绣绷架 ${es.taps * 2}/${es.need * 2} 针` : '墙面刺绣绷架'}`;
  fitStitchHearthPill();
}

// 与 AR-11 ~ AR-15 同一条规则：窄屏胶囊行已排满时不为 AR-16 胶囊新开一行（offsetTop 不受旋转舞台变换影响），
// 两段都放不下先只留优先的一段，仍放不下才整颗收起；只读 DOM，任何区段初始化时调用都不会触发 TDZ
function fitStitchHearthPill() {
  const pill = document.getElementById('stitch-hearth-pill');
  if (!pill) return false;
  pill.classList.remove('sh-no-room', 'sh-solo');
  if (pill.classList.contains('hidden') || pill.offsetParent === null) return false;
  const compact = window.matchMedia ? window.matchMedia('(max-width: 920px), (max-height: 430px)') : null;
  if (!compact || !compact.matches) return true;
  const row = pill.parentElement;
  const others = row
    ? Array.from(row.children).filter((b) => b !== pill && !b.classList.contains('hidden') && b.offsetParent !== null)
    : [];
  if (!others.length) return true;
  const mid = (b) => b.offsetTop + b.offsetHeight / 2;
  const lastRowMid = Math.max(...others.map(mid));
  if (mid(pill) <= lastRowMid + 6) return true;
  const shownSegs = Array.from(pill.querySelectorAll('.sh-seg')).filter((s) => !s.classList.contains('hidden'));
  if (shownSegs.length > 1) {
    pill.classList.add('sh-solo');
    if (mid(pill) <= lastRowMid + 6) return true;
    pill.classList.remove('sh-solo');
  }
  pill.classList.add('sh-no-room');
  return false;
}

function openAr16Card(cardEl) {
  if (!cardEl) return;
  if (gameMode !== 'pet') switchMode('pet');
  closeDrawer();
  dismissTopicCard();
  dismissWindowAmbienceCard();
  foldOrHidePomodoroCard();
  dismissTeatimeCard();
  dismissWeeklyJournalCard();
  dismissTerrariumCard();
  foldOrHideGoodnightCard();
  dismissCollageCard();
  foldOrHideCozyRadioCard();
  dismissCrochetCard();
  dismissHotCocoaCard();
  dismissPressedFlowerCard();
  dismissTelescopeCard();
  dismissAr10Cards();
  dismissAr11Cards();
  dismissAr12Cards();
  dismissAr13Cards();
  dismissAr14Cards();
  dismissAr15Cards();
  dismissAr16Cards();
  dismissPolaroid();
  closeAlbumLightbox();
  // AR-15 卡刚收起时她手里可能还举着星座卡 / 风铃：换成刺绣 / 松饼前先放下
  player.starCheerTimer = 0;
  player.rainCheerTimer = 0;
  cardEl.classList.remove('hidden');
}

function openEmbroideryCard() {
  if (!embroideryCardEl) return { ok: false };
  openAr16Card(embroideryCardEl);
  syncEmbroideryHoopUI();
  syncHearthCornerUI();
  return { ok: true };
}

function openHearthCard() {
  if (!hearthCardEl) return { ok: false };
  openAr16Card(hearthCardEl);
  syncHearthCornerUI();
  syncEmbroideryHoopUI();
  const st = getHearthState();
  if (st.level > 0) petAudio.playHearthCrackle(st.level);
  return { ok: true };
}

// 地板暖炉的底边：实测船坞 / 摇杆 / 动作键在舞台坐标里的上沿（只取与暖炉角横向重叠的那几个），暖炉永远落在它们上方
function measureAr16FloorBottom() {
  const x0 = W * 0.465 - 48;
  const x1 = W * 0.465 + 110;
  let fb = Infinity;
  for (const el of [document.getElementById('pet-care-bar'), document.getElementById('joystick-zone'), document.querySelector('.action-zone')]) {
    if (!el || el.offsetParent === null) continue;
    const r = el.getBoundingClientRect();
    if (!(r.width > 0 && r.height > 0)) continue;
    const a = clientToStage(r.left, r.top);
    const b = clientToStage(r.right, r.bottom);
    const sx0 = Math.min(a.x, b.x);
    const sx1 = Math.max(a.x, b.x);
    if (sx1 < x0 || sx0 > x1) continue;
    fb = Math.min(fb, Math.min(a.y, b.y));
  }
  return Number.isFinite(fb) ? fb - 2 : 0;
}

function updateAr16FloorBottom() {
  const fb = measureAr16FloorBottom();
  if (fb > 0) player.ar16FloorBottom = fb;
  return player.ar16FloorBottom || 0;
}

function handleAr16CanvasTap(pt) {
  const L = getAr16WallLayout(W, H, player.sillCamX || 0);
  const Hh = L.hoopHit;
  if (Math.hypot(pt.x - Hh.x, pt.y - Hh.y) < Hh.r) {
    openEmbroideryCard();
    petAudio.playEmbroideryStitch(0);
    return true;
  }
  const wallCount = Array.isArray(player.embroideryHoop.wall) ? player.embroideryHoop.wall.length : 0;
  const R = L.patchHit;
  if (wallCount > 0 && pt.x >= R.x && pt.x <= R.x + R.w && pt.y >= R.y && pt.y <= R.y + R.h) {
    openEmbroideryCard();
    petAudio.playEmbroideryHang(0);
    return true;
  }
  const F = getAr16FloorLayout(W, H, updateAr16FloorBottom()).hit;
  if (pt.x >= F.x && pt.x <= F.x + F.w && pt.y >= F.y && pt.y <= F.y + F.h) {
    openHearthCard();
    return true;
  }
  return false;
}

let shPillFitTimer = 0;
let ar16FloorTimer = 0;
function updateAr16Companions(dt) {
  if (player.embroideryCheerTimer > 0) player.embroideryCheerTimer = Math.max(0, player.embroideryCheerTimer - dt);
  if (player.hearthCheerTimer > 0) player.hearthCheerTimer = Math.max(0, player.hearthCheerTimer - dt);
  if (embroideryRun.flash > 0) {
    embroideryRun.flash = Math.max(0, embroideryRun.flash - dt);
    if (embroideryRun.flash <= 0) ebHoopEl?.classList.remove('is-stitching');
  }
  if (snackRun.flip > 0) {
    snackRun.flip = Math.max(0, snackRun.flip - dt);
    if (snackRun.flip <= 0) hcStoveEl?.classList.remove('is-flipping');
  }
  const ev = player.embroideryVisual;
  if (ev.hung > 0) ev.hung = Math.max(0, ev.hung - dt);
  snackRun.tickAcc -= dt;
  if (snackRun.tickAcc <= 0) {
    snackRun.tickAcc = 1;
    refreshAr16Clock();
  }
  // 炉火噼啪：小暖炉卡片开着且亮着时，每 2.6 秒轻轻噼啪一下
  snackRun.crackleAcc -= dt;
  if (snackRun.crackleAcc <= 0) {
    snackRun.crackleAcc = 2.6;
    if (gameMode === 'pet' && isAr16CardOpen('hearth')) {
      const st = getHearthState();
      if (st.level > 0) petAudio.playHearthCrackle(st.level);
    }
  }
  shPillFitTimer -= dt;
  if (shPillFitTimer <= 0) {
    shPillFitTimer = 0.5;
    fitStitchHearthPill();
  }
  ar16FloorTimer -= dt;
  if (ar16FloorTimer <= 0) {
    ar16FloorTimer = 0.25;
    updateAr16FloorBottom();
  }
  ev.cardOpen = isAr16CardOpen('embroidery');
  ev.cheer = player.embroideryCheerTimer || 0;
  const hv = player.hearthVisual;
  hv.cardOpen = isAr16CardOpen('hearth');
  hv.flip = snackRun.flip;
  hv.cheer = player.hearthCheerTimer || 0;
  if (gameMode !== 'pet') hv.level = 0;
}

if (embroideryCardEl) {
  embroideryCardEl.addEventListener('pointerdown', (e) => e.stopPropagation());
}
if (hearthCardEl) {
  hearthCardEl.addEventListener('pointerdown', (e) => e.stopPropagation());
}

bindHudTap(document.getElementById('btn-embroidery-close'), () => {
  dismissEmbroideryCard();
  syncEmbroideryHoopUI();
});
bindHudTap(ebPatternRowEl, (e) => {
  const chip = e.target && e.target.closest ? e.target.closest('.eb-pattern-chip') : null;
  if (chip) pickEmbroideryPattern(chip.dataset.patternId);
});
bindHudTap(ebThreadRowEl, (e) => {
  const chip = e.target && e.target.closest ? e.target.closest('.eb-thread-chip') : null;
  if (chip) pickEmbroideryThread(chip.dataset.threadId);
});
bindHudTap(ebAlbumGridEl, (e) => {
  const chip = e.target && e.target.closest ? e.target.closest('.eb-album-chip') : null;
  if (chip) pickEmbroideryPattern(chip.dataset.patternId);
});
// 点绷架本身也能绣一针 / 收针（和主按钮同一个动作）
bindHudTap(ebHoopEl, () => {
  const st = getEmbroideryMainState();
  if (!st.disabled && (st.mode === 'stitch' || st.mode === 'finish')) handleEmbroideryMainAction();
});
bindHudTap(btnEmbroideryHelperEl, () => {
  embroideryHelper();
});
bindHudTap(btnEmbroideryMainEl, () => {
  if (btnEmbroideryMainEl.disabled) return;
  handleEmbroideryMainAction();
});

bindHudTap(document.getElementById('btn-hearth-close'), () => {
  dismissHearthCard();
  syncHearthCornerUI();
});
bindHudTap(hcSnackRowEl, (e) => {
  const chip = e.target && e.target.closest ? e.target.closest('.hc-snack-chip') : null;
  if (chip) pickHearthSnack(chip.dataset.snackId);
});
// 点小暖炉本身也能生火 / 翻面 / 分着吃（和主按钮同一个动作）
bindHudTap(hcStoveEl, () => {
  const st = getHearthMainState();
  if (!st.disabled && st.mode !== 'again') handleHearthMainAction();
});
bindHudTap(btnHearthHelperEl, () => {
  hearthHelper();
});
bindHudTap(btnHearthMainEl, () => {
  if (btnHearthMainEl.disabled) return;
  handleHearthMainAction();
});
bindHudTap(shPillEl, (e) => {
  const segEl = e.target && e.target.closest ? e.target.closest('[data-sh-seg]') : null;
  const seg = segEl ? segEl.dataset.shSeg : getEmbroideryStats().stitching && !getHearthCuddle() ? 'stitch' : 'hearth';
  if (seg === 'stitch') openEmbroideryCard();
  else openHearthCard();
});

window.addEventListener('resize', () => {
  requestAnimationFrame(() => {
    fitStitchHearthPill();
    updateAr16FloorBottom();
  });
});

snackRun.dayKey = formatLocalDateKey(ar16Clock.date());
snackRun.wasLevel = getHearthState().level;
snackRun.wasCuddle = Boolean(getHearthCuddle());
snackRun.wasKindle = Boolean(getHearthKindle());
syncEmbroideryHoopUI();
syncHearthCornerUI();

window.__AR16_DEBUG__ = {
  getSpecs() {
    return JSON.parse(
      JSON.stringify({
        patterns: EMBROIDERY_PATTERNS,
        threads: EMBROIDERY_THREADS,
        embroideryRules: EMBROIDERY_RULES,
        segments: HEARTH_SEGMENTS,
        coldness: HEARTH_COLDNESS,
        monthCold: HEARTH_MONTH_COLD,
        levels: HEARTH_LEVELS,
        snacks: HEARTH_SNACKS,
        hearthRules: HEARTH_RULES
      })
    );
  },
  // 可注入时钟：传毫秒或本地时间字符串固定“现在”（当季绣样 / 暖炉火力 / 小火与依偎剩余时间都跟着走）
  setClock(value) {
    const ms = typeof value === 'number' ? value : new Date(value).getTime();
    if (!Number.isFinite(ms)) return { ok: false, reason: 'invalid_clock' };
    ar16Clock.fixedMs = ms;
    ar16Clock.offsetMs = 0;
    refreshAr16Clock();
    syncEmbroideryHoopUI();
    syncHearthCornerUI();
    return { ok: true, now: ms, seasonId: getAromaSeasonId(new Date(ms)), hearth: getHearthState(new Date(ms)) };
  },
  advanceClock(ms) {
    const step = Math.max(0, Number(ms) || 0);
    if (ar16Clock.fixedMs !== null) ar16Clock.fixedMs += step;
    else ar16Clock.offsetMs += step;
    refreshAr16Clock();
    syncEmbroideryHoopUI();
    syncHearthCornerUI();
    return { ok: true, now: ar16Clock.now(), hearth: getHearthState(), cuddle: getHearthCuddle() };
  },
  useRealClock() {
    ar16Clock.fixedMs = null;
    ar16Clock.offsetMs = 0;
    refreshAr16Clock();
    syncEmbroideryHoopUI();
    syncHearthCornerUI();
    return { ok: true, now: ar16Clock.now() };
  },
  openEmbroidery() {
    return openEmbroideryCard();
  },
  openHearth() {
    return openHearthCard();
  },
  pickPattern(id) {
    return pickEmbroideryPattern(id);
  },
  pickThread(id) {
    return pickEmbroideryThread(id);
  },
  stitch() {
    return stitchEmbroidery();
  },
  finish() {
    return finishEmbroidery();
  },
  embroideryMain() {
    return handleEmbroideryMainAction();
  },
  embroideryHelper() {
    return embroideryHelper();
  },
  getEmbroideryRun() {
    return JSON.parse(JSON.stringify(embroideryRun));
  },
  resetEmbroideryForTest() {
    embroideryRun.patternId = '';
    embroideryRun.taps = 0;
    embroideryRun.phase = 'pick';
    embroideryRun.lastResult = null;
    syncEmbroideryHoopUI();
    return { ok: true };
  },
  kindle() {
    return kindleHearth();
  },
  pickSnack(id) {
    return pickHearthSnack(id);
  },
  flip() {
    return flipHearthSnack();
  },
  share() {
    return shareHearthSnack();
  },
  hearthMain() {
    return handleHearthMainAction();
  },
  hearthHelper() {
    return hearthHelper();
  },
  getSnackRun() {
    return JSON.parse(JSON.stringify(snackRun));
  },
  resetHearthForTest() {
    snackRun.snackId = '';
    snackRun.flips = 0;
    snackRun.phase = 'pick';
    snackRun.lastResult = null;
    syncHearthCornerUI();
    return { ok: true };
  },
  // 只读：给定本地时间的暖炉火力（不改任何状态，不含一起生的小火）
  getHearthFor(value) {
    const ms = typeof value === 'number' ? value : new Date(value).getTime();
    if (!Number.isFinite(ms)) return null;
    const dd = new Date(ms);
    const seg = getHearthSegment(dd);
    const level = getHearthAutoLevel(dd);
    return { level, levelId: HEARTH_LEVELS[level].id, segId: seg.id, monthTag: HEARTH_MONTH_TAGS[dd.getMonth()] };
  },
  // 测试用：读出当前亲密度收获的总倍率（不改任何状态），验证围炉依偎期间整体 ×(1 + 火力加成)
  getAffectionMults() {
    return { hearth: getHearthCuddleMult(), rain: getRainCalmMult(), aroma: getAromaAffectionMult(), total: Number(getAffectionXpMult().toFixed(4)) };
  },
  getLayouts() {
    const fb = updateAr16FloorBottom();
    return {
      wall: getAr16WallLayout(W, H, player.sillCamX || 0),
      floor: getAr16FloorLayout(W, H, fb),
      corner: getAr15CornerLayout(W, H, player.sillCamX || 0),
      shelf: getPotteryShelfLayout(W, H, player.sillCamX || 0, 4),
      aroma: getAromaTableDeskAnchor(W, H),
      sill: getWindowSillLayout(W, H, player.sillCamX || 0),
      furniture: furnitureList.map((f) => ({ key: f.key, x: f.x, y: f.y })),
      plants: Array.isArray(player.displayedTerrariumPlants) ? player.displayedTerrariumPlants.map((s) => ({ x: s.x, y: s.y })) : [],
      player: { x: player.x, y: player.y },
      floorBottom: fb,
      sillCamX: player.sillCamX || 0,
      W,
      H
    };
  },
  placePlayerForTest(xRatio = 0.5) {
    player.x = Math.max(40, Math.min(W - 40, W * (Number(xRatio) || 0.5)));
    player.vx = 0;
    player.wanderTargetX = null;
    player.idleTime = 0;
    return { x: player.x, y: player.y };
  },
  getState(customDateIso = '') {
    const now = ar16Clock.now();
    const refDate = customDateIso ? new Date(customDateIso) : new Date(now);
    const ho = document.getElementById('hearth-ambient-overlay');
    const so = document.getElementById('star-projector-overlay');
    const ro = document.getElementById('rain-ambient-overlay');
    const ao = document.getElementById('aroma-ambient-overlay');
    return {
      gameMode,
      now,
      clockFixed: ar16Clock.fixedMs !== null,
      coins: player.coins,
      level: player.level,
      xp: player.xp,
      emote: player.emote,
      embroideryHoop: JSON.parse(JSON.stringify(player.embroideryHoop)),
      embroideryStats: getEmbroideryStats(new Date(now)),
      embroideryRun: JSON.parse(JSON.stringify(embroideryRun)),
      embroideryVisual: JSON.parse(JSON.stringify(player.embroideryVisual)),
      embroideryMain: getEmbroideryMainState(),
      hearthCorner: JSON.parse(JSON.stringify(player.hearthCorner)),
      hearthStats: getHearthStats(new Date(now)),
      snackRun: JSON.parse(JSON.stringify(snackRun)),
      hearthVisual: JSON.parse(JSON.stringify(player.hearthVisual)),
      hearthMain: getHearthMainState(),
      cuddleMult: getHearthCuddleMult(),
      overlays: {
        hearth: ho ? { shown: !ho.classList.contains('hidden'), level: ho.dataset.level || '0', cuddle: ho.dataset.cuddle || '0' } : null,
        star: so ? { shown: !so.classList.contains('hidden') } : null,
        rain: ro ? { shown: !ro.classList.contains('hidden') } : null,
        aroma: ao ? { shown: !ao.classList.contains('hidden') } : null
      },
      ar16Audio: petAudio.getAr16AudioInfo(),
      journalSummary: computeWeeklyJournalSummary(refDate),
      openPanels: window.__AR5_DEBUG__.getState(customDateIso).openPanels
    };
  }
};

// ================= AR 拍立得纪念合影系统（比耶手势或右上角相机键触发） =================
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
  dismissWindowAmbienceCard();
  foldOrHidePomodoroCard();
  dismissTeatimeCard();
  dismissWeeklyJournalCard();
  dismissTerrariumCard();
  foldOrHideGoodnightCard();
  dismissCollageCard();
  foldOrHideCozyRadioCard();
  dismissCrochetCard();
  dismissHotCocoaCard();
  dismissPressedFlowerCard();
  dismissTelescopeCard(); dismissAr10Cards(); dismissAr11Cards(); dismissAr12Cards(); dismissAr13Cards(); dismissAr14Cards(); dismissAr15Cards(); dismissAr16Cards();
  setNapping(false);
  cancelRpsGame();
  cancelPalmCatchGame();
  photoAutoCooldown = 4.6;
  player.photoPoseTimer = 1.75;
  player.vx = 0;
  if (!player.onGround) {
    const walkablePlats = vision.getAllWalkablePlatforms(W, H);
    const standPlat = walkablePlats.find((p) => !p.isFloor && player.x >= p.x1 - 16 && player.x <= p.x2 + 16);
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

bindHudTap(document.getElementById('btn-polaroid-collage'), () => {
  dismissPolaroid();
  openCollageCard('album_latest');
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
    recordJournalActivity('snaps', 1);
    if (!drawerEl.classList.contains('hidden') && activeDrawerTab === 'album') {
      renderDrawerItems();
    }
  } catch (e) {}
}

syncAlbumCountBadge();
syncWeeklyJournalUI();

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
  recordJournalActivity('chats', 1);
  grantInteractiveCareYarnDrop('chat');
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
    dismissWindowAmbienceCard();
    foldOrHidePomodoroCard();
    dismissTeatimeCard();
    dismissWeeklyJournalCard();
    dismissTerrariumCard();
    foldOrHideGoodnightCard();
    dismissCollageCard();
    foldOrHideCozyRadioCard();
    dismissCrochetCard();
    dismissHotCocoaCard();
    dismissPressedFlowerCard();
    dismissTelescopeCard(); dismissAr10Cards(); dismissAr11Cards(); dismissAr12Cards(); dismissAr13Cards(); dismissAr14Cards(); dismissAr15Cards(); dismissAr16Cards();
    setNapping(false);
  } else if (
    player.isNapping ||
    pomodoroRun.status === 'running' ||
    goodnightRun.status === 'running' ||
    !polaroidCardEl?.classList.contains('hidden') ||
    !windowAmbienceCardEl?.classList.contains('hidden') ||
    !pomodoroCardEl?.classList.contains('hidden') ||
    !teatimeCardEl?.classList.contains('hidden') ||
    !weeklyJournalCardEl?.classList.contains('hidden') ||
    !terrariumCardEl?.classList.contains('hidden') ||
    !goodnightCardEl?.classList.contains('hidden') ||
    !collageCardEl?.classList.contains('hidden') ||
    !cozyRadioCardEl?.classList.contains('hidden') ||
    !crochetCardEl?.classList.contains('hidden') ||
    !hotCocoaCardEl?.classList.contains('hidden') ||
    !pressedFlowerCardEl?.classList.contains('hidden') ||
    !telescopeCardEl?.classList.contains('hidden') ||
    (isAr10CardOpen() || isAr11CardOpen() || isAr12CardOpen() || isAr13CardOpen() || isAr14CardOpen() || isAr15CardOpen() || isAr16CardOpen())
  ) {
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
    !windowAmbienceCardEl?.classList.contains('hidden') ||
    !pomodoroCardEl?.classList.contains('hidden') ||
    !teatimeCardEl?.classList.contains('hidden') ||
    !weeklyJournalCardEl?.classList.contains('hidden') ||
    !terrariumCardEl?.classList.contains('hidden') ||
    !goodnightCardEl?.classList.contains('hidden') ||
    !collageCardEl?.classList.contains('hidden') ||
    !cozyRadioCardEl?.classList.contains('hidden') ||
    !crochetCardEl?.classList.contains('hidden') ||
    !hotCocoaCardEl?.classList.contains('hidden') ||
    !pressedFlowerCardEl?.classList.contains('hidden') ||
    !telescopeCardEl?.classList.contains('hidden') ||
    (isAr10CardOpen() || isAr11CardOpen() || isAr12CardOpen() || isAr13CardOpen() || isAr14CardOpen() || isAr15CardOpen() || isAr16CardOpen()) ||
    rpsGame.active ||
    palmCatchGame.active ||
    player.isNapping ||
    pomodoroRun.status === 'running' ||
    goodnightRun.status === 'running' ||
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

// ================= 实景石头剪刀布（猜拳）小游戏（握拳手势或底部猜拳键触发） =================
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

function startRpsGame(fromGesture = false) { dismissPolaroid(); dismissTopicCard(); dismissTeatimeCard(); dismissWeeklyJournalCard(); dismissTerrariumCard(); foldOrHideGoodnightCard(); dismissCollageCard(); foldOrHideCozyRadioCard(); dismissCrochetCard(); dismissHotCocoaCard(); dismissPressedFlowerCard(); dismissTelescopeCard(); dismissAr10Cards(); dismissAr11Cards(); dismissAr12Cards(); dismissAr13Cards(); dismissAr14Cards(); dismissAr15Cards(); dismissAr16Cards(); if (palmCatchGame.active) cancelPalmCatchGame(); if (rpsChoicesEl) rpsChoicesEl.style.display = 'flex';
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

function startPalmCatchGame() { dismissPolaroid(); dismissTopicCard(); dismissTeatimeCard(); dismissWeeklyJournalCard(); dismissTerrariumCard(); foldOrHideGoodnightCard(); dismissCollageCard(); foldOrHideCozyRadioCard(); dismissCrochetCard(); dismissHotCocoaCard(); dismissPressedFlowerCard(); dismissTelescopeCard(); dismissAr10Cards(); dismissAr11Cards(); dismissAr12Cards(); dismissAr13Cards(); dismissAr14Cards(); dismissAr15Cards(); dismissAr16Cards();
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
          recordJournalActivity('feeds', 1);
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

// 养成互动按钮 1：喂食（再次点击即可顺畅关闭抽屉！）
bindHudTap(document.getElementById('btn-feed'), () => {
  toggleDrawer('food');
});

// 养成互动按钮 4：商店（点击展开/收起装扮与强化小铺）
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

// 养成互动按钮 2：抛出/垫传实景玩具球
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

// 养成互动按钮 3：抱大尾巴摸鱼小憩（支持一键睡下与一键唤醒切换）
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

// 顶部实景精准重扫按钮
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

    // 进阶手势语义零延迟预响应与连击交互（比耶立即摆Pose合影 / 握拳立即备战猜拳 / 伸食指星光逗宠连击）
    const gs = vision.gestureState;
    if (
      gs &&
      gs.ttl > 0 &&
      gs.type === 'peace' &&
      photoAutoCooldown <= 0 &&
      pendingPhotoSnapTimer <= 0 &&
      !rpsGame.active
    ) {
      // 镜头一识别到比耶，角色第一帧立刻转头摆出比耶眨眼 Pose 预备，消除等待延迟感！
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
      player.isFocusStudying = false;
      anchorX = player.x;
      anchorY = player.y;
      player.idleTime = Math.max(6.0, player.idleTime);
      player.petAction = 'sleep';
    } else if (
      gameMode === 'pet' &&
      goodnightRun.status === 'running' &&
      !palmCatchGame.active &&
      !rpsGame.active &&
      petItems.length === 0 &&
      !player.onPalm
    ) {
      // AR-6 晚安助眠星空八音盒状态下：DeepSeek娘蜷在桌角暖光下安睡陪伴
      player.isFocusStudying = false;
      player.isGoodnightSleeping = true;
      anchorX = player.x;
      anchorY = centerFloorY - 25;
      player.wanderTargetX = null;
      player.idleTime = Math.max(6.2, player.idleTime);
      player.petAction = 'sleep';
    } else if (
      gameMode === 'pet' &&
      pomodoroRun.status === 'running' &&
      !palmCatchGame.active &&
      !rpsGame.active &&
      petItems.length === 0 &&
      !player.onPalm
    ) {
      // AR-4 番茄钟专注陪伴状态下：DeepSeek娘安静端坐在桌畔翻阅手账，不乱跑打扰主人
      player.isFocusStudying = true;
      player.isGoodnightSleeping = false;
      player.isRadioListening = false;
      anchorX = player.x;
      anchorY = centerFloorY - 25;
      player.wanderTargetX = null;
      player.petAction = 'focus_study';
    } else if (
      gameMode === 'pet' &&
      cozyRadioRun.playing &&
      !palmCatchGame.active &&
      !rpsGame.active &&
      petItems.length === 0 &&
      !player.onPalm
    ) {
      // AR-7 窗畔温暖轻电台播音中：DeepSeek娘在电台旁轻晃脑袋哼着歌陪伴主人
      player.isFocusStudying = false;
      player.isGoodnightSleeping = false;
      player.isRadioListening = true;
      anchorX = player.x;
      anchorY = centerFloorY - 25;
      player.wanderTargetX = null;
      player.idleTime = 0;
      player.petAction = 'radio_sway';
    } else if (
      gameMode === 'pet' &&
      player.picnicVisual &&
      player.picnicVisual.outing &&
      !palmCatchGame.active &&
      !rpsGame.active &&
      petItems.length === 0 &&
      !player.onPalm
    ) {
      // AR-13 周末野餐中：DeepSeek娘乖乖待在铺开的野餐垫上分点心，不到处乱跑
      player.isFocusStudying = false;
      player.isGoodnightSleeping = false;
      player.isRadioListening = false;
      anchorX = player.x;
      anchorY = centerFloorY - 25;
      player.wanderTargetX = null;
    } else if (palmCatchGame.active) {
      player.isFocusStudying = false;
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

    if (
      player.isCrouching ||
      player.isNapping ||
      player.photoPoseTimer > 0 ||
      pendingPhotoSnapTimer > 0 ||
      ((player.isFocusStudying || player.isGoodnightSleeping) && Math.abs(moveDir) <= 0.08)
    ) {
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

    // 6. 桌面宠物在物体上的深度交互行为（坐边缘晃腿 / 戳键盘 / 抱碗干饭 / 叉腰 / 打盹 / 专注伴读）
    if (player.onGround && Math.abs(player.vx) < 12 && !player.isCrouching) {
      player.idleTime += dt;
      const plat = player.standingPlat;
      const nearPlatEdge =
        plat && !plat.isFloor && (Math.abs(player.x - plat.x1) < 28 || Math.abs(player.x - plat.x2) < 28);

      if (player.isFocusStudying) {
        player.petAction = 'focus_study';
      } else if (player.isGoodnightSleeping) {
        player.petAction = 'sleep';
      } else if (player.isRadioListening) {
        player.petAction = 'radio_sway';
      } else if (nearPlatEdge && player.idleTime > 0.7) {
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

  if (pomodoroRun.status !== 'running' || gameMode !== 'pet' || player.onPalm || player.isPickedUp) {
    player.isFocusStudying = false;
  }
  if (goodnightRun.status !== 'running' || gameMode !== 'pet' || player.onPalm || player.isPickedUp) {
    player.isGoodnightSleeping = false;
  }
  if (!cozyRadioRun.playing || gameMode !== 'pet' || player.onPalm || player.isPickedUp) {
    player.isRadioListening = false;
  }

  if (
    (player.isNapping || player.isGoodnightSleeping || player.petAction === 'sleep') &&
    !player.isFocusStudying &&
    !player.onPalm
  ) {
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

  // 更新养成互动道具（支持亲手喂到嘴边张嘴接食 + 地面3口咀嚼演出 & 玩具球颠球连击物理）
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

  const activeTeaBuff = getActiveTeaShiftBuff();
  const activeCocoaBuff = getActiveHotCocoaBuff();
  const botBless = getBotanicalBlessings();
  const collageBless = getCollageLuckBlessing();
  const crochetGuard = getCrochetWarmGuard();
  const pressedBless = getPressedFlowerBlessing();
  const starGuide = getStarGuidanceBonus();
  const focusWard = getWatercolorFocusWard();
  const kittenWardFrame = getKittenLuckWard();
  const picnicWardFrame = getPicnicShiftWard();
  const teaHasteMult =
    (gameMode === 'survivor' && activeTeaBuff ? 1 + (activeTeaBuff.attackHastePct || 0) : 1) *
    (gameMode === 'survivor' && activeCocoaBuff ? 1 + (activeCocoaBuff.attackHastePct || 0) : 1) *
    (gameMode === 'survivor' && focusWard.active ? 1 + (focusWard.focusHastePct || 0) : 1) *
    (picnicWardFrame.active ? 1 + (picnicWardFrame.hastePct || 0) : 1);
  const teaMagnetMult =
    (gameMode === 'survivor' && activeTeaBuff ? 1 + (activeTeaBuff.magnetBonusPct || 0) : 1) *
    (gameMode === 'survivor' ? 1 + (botBless.magnetPct || 0) : 1) *
    (gameMode === 'survivor' && collageBless.active ? 1 + (collageBless.gemMagnetBonusPct || 0) : 1) *
    (gameMode === 'survivor' && starGuide.active ? 1 + (starGuide.gemMagnetPct || 0) : 1) *
    getPotteryMagnetMult();
  const pressedRegenPerSec = gameMode === 'survivor' && pressedBless.active ? pressedBless.hpRegenPerSec || 0 : 0;
  const lunchRegenPerSec = (getBentoLunchWard().regenPerSec || 0) + (picnicWardFrame.active ? picnicWardFrame.regenPerSec || 0 : 0);

  if (gameMode === 'survivor') {
    survivorRun.lightningIcd = Math.max(0, survivorRun.lightningIcd - dt);
    if (
      (skOnigiriLv > 0 || botBless.hpRegenPerSec > 0 || pressedRegenPerSec > 0 || lunchRegenPerSec > 0) &&
      player.hp < player.maxHp
    ) {
      player.hp = Math.min(
        player.maxHp,
        player.hp + (skOnigiriLv * 2.2 + botBless.hpRegenPerSec + pressedRegenPerSec + lunchRegenPerSec) * dt
      );
    }

    // 冰泡凝滞：周期发射寒霜冰泡弹
    if (skFrostLv > 0 && nearestEnemy) {
      survivorRun.frostTimer -= dt * teaHasteMult;
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
      survivorRun.phantomTimer -= dt * (Math.abs(player.vx) > 25 ? 1.5 : 0.85) * teaHasteMult;
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
    (Math.max(0.13, 0.42 / (1 + (effBlasterLv - 1) * 0.28)) *
      (onTech ? 0.65 : 1) *
      (survivorRun.evolved.superWhale ? 0.88 : 1)) /
    teaHasteMult;
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

  bladeAngle += dt * (survivorRun.evolved.superTeablade ? 7.2 : 4.8 + skTeaLv * 0.4) * teaHasteMult;
  const bladeCount =
    gameMode === 'survivor'
      ? survivorRun.evolved.superTeablade
        ? 6
        : Math.min(5, Math.max(player.weapons.teaBlade, skTeaLv) + (onDrink ? 1 : 0))
      : 0;
  const bladeRadius = 64;

  const critChance = Math.min(
    0.85,
    0.18 +
      skCritLv * 0.12 +
      (gameMode === 'survivor' ? botBless.critChanceBonus || 0 : 0) +
      (gameMode === 'survivor' && starGuide.active ? starGuide.critChanceBonus || 0 : 0) +
      (gameMode === 'survivor' && focusWard.active ? focusWard.critChanceBonus || 0 : 0)
  );
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

        const botDropChance =
          (gameMode === 'survivor' ? botBless.treasureDropBonus || 0 : 0) +
          (gameMode === 'survivor' && collageBless.active ? collageBless.luckyDropBonus || 0 : 0) +
          (gameMode === 'survivor' && activeCocoaBuff ? activeCocoaBuff.luckyDropBonus || 0 : 0) +
          (gameMode === 'survivor' && pressedBless.active ? pressedBless.luckyDropBonus || 0 : 0) +
          (gameMode === 'survivor' && kittenWardFrame.active ? kittenWardFrame.luckyDropBonus || 0 : 0);
        if (
          (e.isGoldTreasure && Math.random() < 0.5 + botDropChance) ||
          (isCrit && (skCritLv > 0 || botDropChance > 0) && Math.random() < 0.18 + botDropChance)
        ) {
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

  const crochetDmgMult =
    gameMode === 'survivor' && crochetGuard.active ? Math.max(0.55, 1 - crochetGuard.damageReductionPct) : 1;
  // AR-14 奶白釉陶艺佑护：本班次受到的伤害再减一点（与暖绒守护相乘，整体下限不变）
  const dmgTakenMult = Math.max(0.42, (1 - skPhantomLv * 0.12) * crochetDmgMult * getPotteryDamageMult());

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
      let incomingDmg = 14 * dmgTakenMult * dt;
      if (gameMode === 'survivor' && survivorRun.knitShield > 0) {
        const absorbedKnit = Math.min(survivorRun.knitShield, incomingDmg);
        survivorRun.knitShield = Math.max(0, survivorRun.knitShield - absorbedKnit);
        incomingDmg -= absorbedKnit;
        const ceilKnit = Math.ceil(survivorRun.knitShield);
        if (ceilKnit !== survivorRun.lastDisplayedKnitShield) {
          survivorRun.lastDisplayedKnitShield = ceilKnit;
          syncSurvivorSkillStrip();
        }
      }
      if (gameMode === 'survivor' && survivorRun.teaShield > 0) {
        const absorbed = Math.min(survivorRun.teaShield, incomingDmg);
        survivorRun.teaShield = Math.max(0, survivorRun.teaShield - absorbed);
        incomingDmg -= absorbed;
        const ceilShield = Math.ceil(survivorRun.teaShield);
        if (ceilShield !== survivorRun.lastDisplayedShield) {
          survivorRun.lastDisplayedShield = ceilShield;
          syncSurvivorSkillStrip();
        }
      }
      player.hp -= incomingDmg;
      if (gameMode === 'survivor' && player.hp > 0) tryBentoRescueHeal();
      if (gameMode === 'survivor' && player.hp <= 0) tryKittenLuckSave();
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
      const healDropChance =
        0.15 + (gameMode === 'survivor' && crochetGuard.active ? crochetGuard.heartDropChanceBonus || 0 : 0);
      for (let d = 0; d < dropCount; d++) {
        const isHeal = !defeatedBoss && Math.random() < healDropChance;
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
  const magnetRange = Math.round(
    ((player.equipped.aura ? 450 : 155 + (player.weapons.magnet || 1) * 35) + skOnigiriLv * 45) *
      teaMagnetMult
  );
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

  const gemMagnetRange = Math.round((175 + skOnigiriLv * 55) * teaMagnetMult);
  const heartMagnetRange = Math.round(
    gemMagnetRange *
      (gameMode === 'survivor' && crochetGuard.active ? 1 + (crochetGuard.heartMagnetBonusPct || 0) : 1)
  );
  for (let i = gems.length - 1; i >= 0; i--) {
    const g = gems[i];
    g.age += dt;
    const dx = player.x - g.x;
    const dy = player.y - g.y;
    const dist = Math.hypot(dx, dy) || 1;
    const effGemRange = g.isHeal ? heartMagnetRange : gemMagnetRange;

    if (g.age > 0.34 && (dist < effGemRange || g.age > 0.9 || g.magnet)) {
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
        const healAmt = 18 + (gameMode === 'survivor' && crochetGuard.active ? crochetGuard.heartHealBonus || 0 : 0);
        player.hp = Math.min(player.maxHp, player.hp + healAmt);
        floatingTexts.push({
          x: player.x,
          y: player.y - 34,
          vx: 0,
          vy: -55,
          text: `+${healAmt} HP`,
          color: '#00ff9d',
          scale: 1.05,
          life: 0.65
        });
      } else {
        player.xp += g.val;
        if (gameMode === 'survivor') {
          applyShiftXpGain(g.val);
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

  updateWindowAmbienceClock(dt);
  updatePomodoroCompanion(dt);
  updateAfternoonTeaBuff(dt);
  updateHotCocoaBuff(dt);
  updateStargazeCompanion(dt);
  updateAr10Companions(dt);
  updateAr11Companions(dt);
  updateAr12Companions(dt);
  updateAr13Companions(dt);
  updateAr14Companions(dt);
  updateAr15Companions(dt);
  updateAr16Companions(dt);
  updateTerrarium(dt);
  updateGoodnightCompanion(dt);
  updateCozyRadioCompanion(dt);
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
    if (g.isHeal && isReady(images.vfxHeart)) {
      ctx.drawImage(images.vfxHeart, -11, -11, 22, 22);
    } else if (isReady(images.vfxGem)) {
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

  // 渲染实景桌面 DIY 微缩家具（小夜灯 / 码农工位 / 蓝鲸猫爬架）与花房盆栽摆设
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
    player.hideTerrariumLabels = hideFurnLabel;
    player.sillCamX = vision.simCamX || 0;
    drawWindowsillVisitors(ctx, player, W, H, now);
    drawPotteryShelf(ctx, player, W, H, now);
    drawAr15WindowCorner(ctx, player, W, H, now);
    drawAr16WallHoop(ctx, player, W, H, now);
    drawWatercolorWallGallery(ctx, player, W, H, now);
    drawMemoryWallBoard(ctx, player, W, H, now);
    drawCollageKeepsakeFrame(ctx, player, W, H, now);
    drawTerrariumDeskShelf(ctx, player, W, H, now);
    drawCozyTabletopRadio(ctx, player, W, H, now);
    drawCrochetKeepsakeDesk(ctx, player, W, H, now);
    drawPressedFlowerDesk(ctx, player, W, H, now);
    drawMailboxDeskProp(ctx, player, W, H, now);
    drawBentoLunchDesk(ctx, player, W, H, now);
    drawPicnicBasketDesk(ctx, player, W, H, now);
    drawAromaTableDesk(ctx, player, W, H, now);
    // AR-16 地板小暖炉在书桌前的地板上：最后画，压在书桌前沿之上（她本人之后再画，永远在最前）
    drawAr16FloorHearth(ctx, player, W, H, now);
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

  if (gameMode === 'pet') {
    drawStudyCompanionProp(ctx, player, now);
    drawAfternoonTeaProp(ctx, player, now);
    drawGoodnightMusicboxProp(ctx, player, now);
    drawHotCocoaProp(ctx, player, now);
    drawStargazeTelescopeProp(ctx, player, now);
    drawWatercolorEaselProp(ctx, player, now);
    drawBentoKitchenProp(ctx, player, now);
    drawGreetingCardCraftProp(ctx, player, now);
    drawPicnicOutingProp(ctx, player, now, W);
    drawDiaryWritingProp(ctx, player, now);
    drawPotteryWheelProp(ctx, player, now);
    drawAromaBlendProp(ctx, player, now);
    drawStarCardProp(ctx, player, now);
    drawRainListenProp(ctx, player, now);
    drawEmbroideryProp(ctx, player, now);
    drawHearthSnackProp(ctx, player, now);
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
    } else if (player.isFocusStudying) {
      nextAvatar = './assets/hero_sit_edge.webp?v=hd5';
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
