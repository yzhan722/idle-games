// game.js — DeepSeek娘桌面宠物级实景交互（抓边爬台 / 蹲伏戳物体 / 坐边缘晃腿 / 摸头傲娇 / 物理轨迹回归中心）

import { ARVisionEngine } from './vision.js?v=hd23';
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
  drawInteractionVfx,
  images,
  isReady
} from './sprites.js?v=hd23';
import { petAudio } from './audio.js?v=hd23';

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
    img: './assets/plant_peach_succulent.webp?v=hd23',
    xRatio: 0.30,
    note: '奶陶圆盆里胖乎乎的粉尖多肉，吸饱阳光能带来打工招财好运~'
  },
  star_lily: {
    id: 'star_lily',
    name: '星露白铃兰',
    shortName: '白铃兰',
    spriteKey: 'plantStarLily',
    img: './assets/plant_star_lily.webp?v=hd23',
    xRatio: 0.355,
    note: '薄荷描金茶杯里的垂铃白花，沁人心脾的清香能持续治愈体力~'
  },
  blue_hydrangea: {
    id: 'blue_hydrangea',
    name: '晴空蓝绣球',
    shortName: '蓝绣球',
    spriteKey: 'plantBlueHydrangea',
    img: './assets/plant_blue_hydrangea.webp?v=hd23',
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
    img: './assets/sticker_lace_garland.webp?v=hd23'
  },
  pressed_daisy: {
    id: 'pressed_daisy',
    name: '干花书签',
    img: './assets/sticker_pressed_daisy.webp?v=hd23'
  },
  whale_stamp: {
    id: 'whale_stamp',
    name: '蓝鲸纪念邮票',
    img: './assets/sticker_whale_stamp.webp?v=hd23'
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
    img: './assets/knit_whale_scarf.webp?v=hd23',
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
    img: './assets/knit_star_coaster.webp?v=hd23',
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
    img: './assets/knit_cloud_pillow.webp?v=hd23',
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
    img: './assets/ui_btn_cocoa_bar.webp?v=hd23'
  },
  sea_salt_caramel: {
    id: 'sea_salt_caramel',
    name: '海盐焦糖可可',
    shortName: '海盐焦糖',
    img: './assets/ui_btn_cocoa_bar.webp?v=hd23'
  },
  hazelnut_cream: {
    id: 'hazelnut_cream',
    name: '榛果奶霜可可',
    shortName: '榛果奶霜',
    img: './assets/ui_btn_cocoa_bar.webp?v=hd23'
  }
};

const HOT_COCOA_TOPPINGS = {
  star_marshmallow: {
    id: 'star_marshmallow',
    name: '烤星芒棉花糖',
    shortName: '星芒棉花糖',
    img: './assets/cocoa_marshmallow_topping.webp?v=hd23'
  },
  cinnamon_stick: {
    id: 'cinnamon_stick',
    name: '肉桂暖香棒',
    shortName: '肉桂暖香棒',
    img: './assets/ui_btn_cocoa_bar.webp?v=hd23'
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
      img: './assets/tea_platter_signature.webp?v=hd23',
      tag: shieldLeft > 0 ? `盾${shieldLeft}` : `茶+${Math.round((teaBuff.coinBonusPct || 0) * 100)}%`,
      isSuper: true,
      title: `${teaBuff.name} · ${teaBuff.buffTitle}`
    });
  }
  const botBless = getBotanicalBlessings();
  if (botBless && botBless.totalLevel >= 3) {
    badges.push({
      img: './assets/ui_btn_terrarium.webp?v=hd23',
      tag: `花Lv${botBless.totalLevel}`,
      isSuper: botBless.bloomCount > 0,
      title: `微缩花房佑护 · 金+${Math.round(botBless.luckCoinPct * 100)}% 自愈+${botBless.hpRegenPerSec.toFixed(1)}/s 磁+${Math.round(botBless.magnetPct * 100)}%`
    });
  }
  const collageBless = getCollageLuckBlessing();
  if (collageBless && collageBless.active) {
    badges.push({
      img: './assets/ui_btn_collage_frame.webp?v=hd23',
      tag: `框+${collageBless.startingCoinPouch}金`,
      isSuper: true,
      title: `手账幸运佑护（${collageBless.frameStyleName}） · 幸运掉宝+${Math.round(collageBless.luckyDropBonus * 100)}% 磁吸+${Math.round(collageBless.gemMagnetBonusPct * 100)}% 开局+${collageBless.startingCoinPouch}金`
    });
  }
  const crochetGuard = getCrochetWarmGuard();
  if (crochetGuard && crochetGuard.active) {
    const kShield = Math.ceil(survivorRun.knitShield || 0);
    badges.push({
      img: './assets/ui_btn_crochet_basket.webp?v=hd23',
      tag: kShield > 0 ? `绒盾${kShield}` : `减伤${Math.round(crochetGuard.damageReductionPct * 100)}%`,
      isSuper: true,
      title: `暖绒手作守护（Lv.${crochetGuard.totalLevel}/9） · 减伤+${Math.round(crochetGuard.damageReductionPct * 100)}% 暖绒护盾+${crochetGuard.cozyShieldBonus} 爱心磁吸+${Math.round(crochetGuard.heartMagnetBonusPct * 100)}%`
    });
  }
  const cocoaBuff = getActiveHotCocoaBuff();
  if (cocoaBuff) {
    badges.push({
      img: './assets/ui_btn_cocoa_bar.webp?v=hd23',
      tag: `暖速+${Math.round((cocoaBuff.attackHastePct || 0) * 100)}%`,
      isSuper: true,
      title: `${cocoaBuff.name} · ${cocoaBuff.buffTitle}（攻速+${Math.round((cocoaBuff.attackHastePct || 0) * 100)}% 财运+${Math.round((cocoaBuff.coinLuckPct || 0) * 100)}%）`
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
        cocoaCoinMult
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

function openDrawer(tab) { cancelRpsGame(); cancelPalmCatchGame(); dismissPolaroid(); dismissTopicCard(); dismissWindowAmbienceCard(); foldOrHidePomodoroCard(); dismissTeatimeCard(); dismissWeeklyJournalCard(); dismissTerrariumCard(); foldOrHideGoodnightCard(); dismissCollageCard(); foldOrHideCozyRadioCard(); dismissCrochetCard(); dismissHotCocoaCard(); player.wanderTargetX = null; if (player.y < H * 0.68 - 26) { player.y = H * 0.68 - 25; player.vy = 0; player.onGround = true; player.standingPlat = null; }
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
      <div class="shop-thumb-wrap"><img src="./assets/ui_btn_teatime.webp?v=hd23" alt="" class="shop-thumb" /></div>
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
      <div class="shop-thumb-wrap"><img src="./assets/ui_btn_cocoa_bar.webp?v=hd23" alt="" class="shop-thumb" /></div>
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
          <img src="./assets/ui_btn_terrarium.webp?v=hd23" alt="" class="room-theme-thumb" />
          <div class="room-theme-meta">
            <span class="room-theme-name">微缩绿植花房</span>
            <span class="room-theme-sub">花架 Lv.${curBot.totalLevel}/15 · 桌面摆设 ${curBot.displayedCount} 盆</span>
          </div>
          <span class="room-theme-state">照料</span>
        </button>
        <button type="button" class="room-theme-card" data-ar6-shortcut="musicbox">
          <img src="./assets/ui_btn_musicbox.webp?v=hd23" alt="" class="room-theme-thumb" />
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
          <img src="./assets/ui_btn_collage_frame.webp?v=hd23" alt="" class="room-theme-thumb" />
          <div class="room-theme-meta">
            <span class="room-theme-name">手账贴纸拼贴画框</span>
            <span class="room-theme-sub">${curCollage.active ? `已装裱 ${curCollage.savedCount} 帧 · 开局+${curCollage.startingCoinPouch}金` : '拼贴蕾丝/干花/蓝鲸邮票装点书桌'}</span>
          </div>
          <span class="room-theme-state">装裱</span>
        </button>
        <button type="button" class="room-theme-card" data-ar7-shortcut="radio">
          <img src="./assets/ui_btn_cozy_radio.webp?v=hd23" alt="" class="room-theme-thumb" />
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
          <img src="./assets/ui_btn_crochet_basket.webp?v=hd23" alt="" class="room-theme-thumb" />
          <div class="room-theme-meta">
            <span class="room-theme-name">毛线钩针温暖手作篮</span>
            <span class="room-theme-sub">${curCrochet.active ? `暖绒 Lv.${curCrochet.totalLevel}/9 · 减伤+${Math.round(curCrochet.damageReductionPct * 100)}%` : `毛线 ${player.crochetBasket?.yarnSkeins || 0} 团 · 编织3款暖心织物`}</span>
          </div>
          <span class="room-theme-state">编织</span>
        </button>
        <button type="button" class="room-theme-card" data-ar8-shortcut="cocoa">
          <img src="./assets/ui_btn_cocoa_bar.webp?v=hd23" alt="" class="room-theme-thumb" />
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
    careBarEl.style.display = 'flex';
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
      activeTea
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
    img: './assets/tea_peach_oolong.webp?v=hd23'
  },
  blueberry_foam: {
    id: 'blueberry_foam',
    name: '海盐奶盖蓝莓',
    img: './assets/tea_blueberry_foam.webp?v=hd23'
  },
  osmanthus_milk: {
    id: 'osmanthus_milk',
    name: '桂花牛乳茶',
    img: './assets/tea_osmanthus_milk.webp?v=hd23'
  }
};

const TEA_PASTRIES = {
  souffle: {
    id: 'souffle',
    name: '草莓舒芙蕾',
    img: './assets/pastry_souffle.webp?v=hd23'
  },
  whale_macaron: {
    id: 'whale_macaron',
    name: '蓝鲸马卡龙',
    img: './assets/pastry_whale_macaron.webp?v=hd23'
  },
  pudding_tart: {
    id: 'pudding_tart',
    name: '焦糖布丁挞',
    img: './assets/pastry_pudding_tart.webp?v=hd23'
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
  bliss: { id: 'bliss', label: '甜心', img: './assets/ui_mood_blush.webp?v=hd23' },
  focus: { id: 'focus', label: '专注', img: './assets/ui_stamp_focus.webp?v=hd23' },
  cozy: { id: 'cozy', label: '茶歇', img: './assets/ui_btn_teatime.webp?v=hd23' },
  star: { id: 'star', label: '星梦', img: './assets/ui_pin_star.webp?v=hd23' },
  goodnight: { id: 'goodnight', label: '好梦', img: './assets/stamp_goodnight_moon.webp?v=hd23' }
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
    img: './assets/ui_btn_weekly_journal.webp?v=hd23'
  },
  {
    id: 'tier2',
    name: '蜜糖茶会礼盒',
    reqStamps: 3,
    reqScore: 8,
    reqLabel: '3章 或 热度8',
    coins: 65,
    xp: 55,
    img: './assets/tea_platter_signature.webp?v=hd23'
  },
  {
    id: 'tier3',
    name: '星海满贯礼盒',
    reqStamps: 5,
    reqScore: 15,
    reqLabel: '5章 或 热度15',
    coins: 110,
    xp: 95,
    img: './assets/ui_stamp_focus.webp?v=hd23'
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
  if (type === 'focusMins') return 'focus';
  if (type === 'teas' || type === 'plantCares' || type === 'radioMins' || type === 'cocoas' || type === 'knits') {
    return 'cozy';
  }
  if (type === 'snaps' || type === 'shifts' || type === 'collages') return 'star';
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
    type === 'knits'
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
    plantCares7d +
    recipesDiscovered +
    cocoaBlendsDiscovered;

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
    crochetTotalLevel: crochetGuard.totalLevel
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
    daysList,
    cumulative,
    giftStates,
    claimableCount: giftStates.filter((g) => g.claimable).length
  };
}

function buildJournalCompanionQuote(summary) {
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
        ico: './assets/food_rice.webp?v=hd2',
        title: '食堂投喂',
        val: `近7日 ${summary.feeds7d} 次`,
        sub: `花房照料 ${summary.cumulative.totalPlantCares} 次`
      },
      {
        ico: './assets/ui_btn_cozy_radio.webp?v=hd23',
        title: '谈心与轻电台',
        val: `轻电台 ${summary.radioMins7d} 分`,
        sub: `谈心 ${summary.chats7d}次 / 拼贴 ${summary.cumulative.totalCollages}帧`
      },
      {
        ico: './assets/stamp_goodnight_moon.webp?v=hd23',
        title: '晚安伴眠',
        val: `好梦章 ${summary.cumulative.totalGoodnightStamps} 枚`,
        sub: `伴眠 ${summary.sleepMins7d}分 / 合影 ${summary.cumulative.totalSnaps}张`
      },
      {
        ico: './assets/ui_btn_pomodoro.webp?v=hd23',
        title: '番茄钟专注',
        val: `近7日 ${summary.focusMins7d} 分`,
        sub: `累计 ${summary.cumulative.totalFocusMins} 分`
      },
      {
        ico: './assets/ui_btn_cocoa_bar.webp?v=hd23',
        title: '热可可与下午茶',
        val: `热可可 ${summary.cocoas7d} 杯`,
        sub: `可可 ${summary.cumulative.cocoaBlendsDiscovered}/6 · 茶谱 ${summary.cumulative.recipesDiscovered}/9`
      },
      {
        ico: './assets/ui_btn_crochet_basket.webp?v=hd23',
        title: '手作篮与花房',
        val: `钩针 Lv.${summary.cumulative.crochetTotalLevel}/9`,
        sub: `花架 Lv.${summary.cumulative.terrariumTotalLevel}/15 · 班次 ${summary.shifts7d}`
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
    html += `<span class="musicbox-stamp-slot ${stamped ? 'stamped' : ''}"><img src="./assets/stamp_goodnight_moon.webp?v=hd23" alt="" /></span>`;
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

  const coinReward = fromEarlyWake ? Math.max(18, Math.round(effectiveMins * 1.1)) : Math.round(plannedMins * 1.5 + 12);
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

  savePetState();
  syncGoodnightUI();
  syncWeeklyJournalUI(refDate);
  return {
    ok: true,
    stamps: player.goodnightMusicbox.totalStamps,
    effectiveMins,
    coinReward,
    xpReward
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
    const skBlasterLv = gameMode === 'survivor' ? Math.max(1, survivorRun.skills.blaster || 1) : 1;
    const skOnigiriLv = gameMode === 'survivor' ? survivorRun.skills.onigiriHeal || 0 : 0;
    const skCritLv = gameMode === 'survivor' ? survivorRun.skills.critCharm || 0 : 0;
    const effBlasterLv = player.weapons.blaster + skBlasterLv - 1;
    const teaHastePart = gameMode === 'survivor' && teaBuff ? 1 + (teaBuff.attackHastePct || 0) : 1;
    const cocoaHastePart = gameMode === 'survivor' && cocoaBuff ? 1 + (cocoaBuff.attackHastePct || 0) : 1;
    const hasteMult = Number((teaHastePart * cocoaHastePart).toFixed(4));
    const teaMagnetMult = gameMode === 'survivor' && teaBuff ? 1 + (teaBuff.magnetBonusPct || 0) : 1;
    const botMagnetMult = gameMode === 'survivor' ? 1 + (botBless.magnetPct || 0) : 1;
    const collageMagnetMult =
      gameMode === 'survivor' && collageBless.active ? 1 + (collageBless.gemMagnetBonusPct || 0) : 1;
    const magnetMult = Number((teaMagnetMult * botMagnetMult * collageMagnetMult).toFixed(4));
    const teaCoinMult = gameMode === 'survivor' && teaBuff ? 1 + (teaBuff.coinBonusPct || 0) : 1;
    const botCoinMult = gameMode === 'survivor' ? 1 + (botBless.luckCoinPct || 0) : 1;
    const collageCoinMult =
      gameMode === 'survivor' && collageBless.active ? 1 + (collageBless.luckCoinPct || 0) : 1;
    const cocoaCoinMult = gameMode === 'survivor' && cocoaBuff ? 1 + (cocoaBuff.coinLuckPct || 0) : 1;
    const coinMult = Number((teaCoinMult * botCoinMult * collageCoinMult * cocoaCoinMult).toFixed(4));
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
      effectiveDamageReductionPct: gameMode === 'survivor' ? crochetGuard.damageReductionPct : 0,
      effectiveLuckyDropBonus: Number(
        (
          (gameMode === 'survivor' ? botBless.treasureDropBonus : 0) +
          (gameMode === 'survivor' ? collageBless.luckyDropBonus : 0) +
          (gameMode === 'survivor' && cocoaBuff ? cocoaBuff.luckyDropBonus || 0 : 0)
        ).toFixed(4)
      ),
      effectiveCritChance: Number(
        Math.min(0.85, 0.18 + skCritLv * 0.12 + (gameMode === 'survivor' ? botBless.critChanceBonus : 0)).toFixed(4)
      ),
      effectiveHpRegenPerSec: Number(
        ((gameMode === 'survivor' ? botBless.hpRegenPerSec : 0) + skOnigiriLv * 2.2).toFixed(2)
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
      const topImg = HOT_COCOA_TOPPINGS[item.toppingId]?.img || './assets/cocoa_marshmallow_topping.webp?v=hd23';
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
    !hotCocoaCardEl?.classList.contains('hidden')
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

function startRpsGame(fromGesture = false) { dismissPolaroid(); dismissTopicCard(); dismissTeatimeCard(); dismissWeeklyJournalCard(); dismissTerrariumCard(); foldOrHideGoodnightCard(); dismissCollageCard(); foldOrHideCozyRadioCard(); dismissCrochetCard(); dismissHotCocoaCard(); if (palmCatchGame.active) cancelPalmCatchGame(); if (rpsChoicesEl) rpsChoicesEl.style.display = 'flex';
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

function startPalmCatchGame() { dismissPolaroid(); dismissTopicCard(); dismissTeatimeCard(); dismissWeeklyJournalCard(); dismissTerrariumCard(); foldOrHideGoodnightCard(); dismissCollageCard(); foldOrHideCozyRadioCard(); dismissCrochetCard(); dismissHotCocoaCard();
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
  const teaHasteMult =
    (gameMode === 'survivor' && activeTeaBuff ? 1 + (activeTeaBuff.attackHastePct || 0) : 1) *
    (gameMode === 'survivor' && activeCocoaBuff ? 1 + (activeCocoaBuff.attackHastePct || 0) : 1);
  const teaMagnetMult =
    (gameMode === 'survivor' && activeTeaBuff ? 1 + (activeTeaBuff.magnetBonusPct || 0) : 1) *
    (gameMode === 'survivor' ? 1 + (botBless.magnetPct || 0) : 1) *
    (gameMode === 'survivor' && collageBless.active ? 1 + (collageBless.gemMagnetBonusPct || 0) : 1);

  if (gameMode === 'survivor') {
    survivorRun.lightningIcd = Math.max(0, survivorRun.lightningIcd - dt);
    if ((skOnigiriLv > 0 || botBless.hpRegenPerSec > 0) && player.hp < player.maxHp) {
      player.hp = Math.min(
        player.maxHp,
        player.hp + (skOnigiriLv * 2.2 + botBless.hpRegenPerSec) * dt
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
    0.18 + skCritLv * 0.12 + (gameMode === 'survivor' ? botBless.critChanceBonus || 0 : 0)
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
          (gameMode === 'survivor' && activeCocoaBuff ? activeCocoaBuff.luckyDropBonus || 0 : 0);
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
  const dmgTakenMult = Math.max(0.42, (1 - skPhantomLv * 0.12) * crochetDmgMult);

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

  updateWindowAmbienceClock(dt);
  updatePomodoroCompanion(dt);
  updateAfternoonTeaBuff(dt);
  updateHotCocoaBuff(dt);
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
    drawCollageKeepsakeFrame(ctx, player, W, H, now);
    drawTerrariumDeskShelf(ctx, player, W, H, now);
    drawCozyTabletopRadio(ctx, player, W, H, now);
    drawCrochetKeepsakeDesk(ctx, player, W, H, now);
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
