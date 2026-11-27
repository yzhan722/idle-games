// game.js — DeepSeek娘桌面宠物级实景交互（抓边爬台 / 蹲伏戳物体 / 坐边缘晃腿 / 摸头傲娇 / 物理轨迹回归中心）

import { ARVisionEngine } from './vision.js?v=hd62';
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
  drawWardrobeSeasonSparkles,
  drawStorybookProp,
  drawInteractionVfx,
  images,
  isReady,
  preloadModeSprites
} from './sprites.js?v=hd60';
import { petAudio } from './audio.js?v=hd31';
import {
  fitAlbum,
  isQuotaError,
  openPetStore,
  peaceSnapAction,
  readPeaceSnapChoice,
  savePeaceSnapChoice
} from './save-core.js?v=hd61';
import {
  BOND_FINAL_LEVEL,
  BOND_MILESTONES,
  applyBondXp,
  applyCallName,
  bondFloatLabel,
  countBondXp,
  describeGrant,
  grantMilestones,
  loadBond,
  sanitizeCall,
  unlockedCalls,
  unlockedLines
} from './intimacy.js?v=hd60';
// [[split imports]] 从 game.js 搬出去的部分（2026-11-26，AR-COM5）：文件之间互相引用，?v= 必须处处一致
import {
  getBotanicalBlessings,
  getCollageLuckBlessing,
  getCrochetWarmGuard,
  getActiveHotCocoaBuff,
  grantInteractiveCareYarnDrop,
  getPressedFlowerBlessing,
  getStarGuidanceBonus,
  getWatercolorFocusWard,
  BENTO_FILLINGS,
  BENTO_SIDE_PAIRS,
  BENTO_SIDE_BY_ID,
  getBentoKitchenStats,
  getBentoLunchWard,
  getMemoryPuzzleCoinMult,
  ar12Clock,
  makeAr12SeededRandom,
  KITTEN_SPECS,
  KITTEN_BY_ID,
  KITTEN_AFFECTION_MAX,
  KITTEN_TIERS,
  KITTEN_VISIT_RULES,
  getKittenTier,
  getKittenCornerStats,
  getKittenLuckWard,
  CARD_BASES,
  CARD_BASE_BY_ID,
  CARD_STICKERS,
  CARD_UNIVERSAL_STICKERS,
  CARD_OCCASIONS,
  CARD_ALBUM_MAX,
  CARD_DAILY_REWARDS,
  resolveCardOccasion,
  getGreetingCardBlessing,
  ar13Clock,
  PICNIC_FOOD_BY_ID,
  PICNIC_SPOT_BY_ID,
  describePicnicWard,
  getPicnicStats,
  getPicnicShiftWard,
  getPicnicCoinMult,
  getDiaryPageKeys,
  ar14Clock,
  POTTERY_SHAPE_BY_ID,
  POTTERY_GLAZE_BY_ID,
  describePotteryWard,
  getPotteryCoinMult,
  getPotteryMagnetMult,
  getPotteryDamageMult,
  AROMA_MOOD_BY_ID,
  getActiveAroma,
  getAromaAffectionMult,
  ar15Clock,
  getActiveProjection,
  rainRun,
  starRun,
  getRainCalmMult,
  ar16Clock,
  getEmbroideryStats,
  getHearthKindle,
  getHearthCuddle,
  getHearthState,
  snackRun,
  getHearthCuddleMult,
  ar17Clock,
  storyRun,
  getStoryGlow,
  getStorybookStats
} from './data-room.js?v=hd60';
import {
  survivorVfxBursts,
  SURVIVOR_BOSS_NAMES,
  survivorRun,
  updateBestShiftRecord,
  getActiveTeaShiftBuff,
  resetSurvivorRun,
  syncSurvivorSkillStrip,
  syncSurvivorBossBar,
  openSurvivorSkillModal,
  applySurvivorSkillChoice,
  syncParkourHud,
  syncSurvivorHud
} from './mode-survivor.js?v=hd60';
import {
  FOOD_CATALOG,
  renderDrawerItems
} from './drawer.js?v=hd60';
import {
  windowAmbienceCardEl,
  hudAmbiencePillEl,
  btnAmbienceAutoEl,
  syncWindowAmbienceUI,
  setWindowAmbienceState,
  dismissWindowAmbienceCard,
  toggleWindowAmbienceCard,
  updateWindowAmbienceClock,
  pomodoroCardEl,
  pomodoroMiniPillEl,
  pomodoroTaskInputEl,
  btnPomoStartEl,
  btnPomoPauseEl,
  btnPomoCancelEl,
  btnPomoFoldEl,
  btnPomodoroDockEl,
  syncPomodoroUI,
  foldOrHidePomodoroCard,
  openPomodoroCard,
  togglePomodoroCard,
  selectPomodoroPreset,
  setPomodoroTaskTag,
  startPomodoroSession,
  togglePausePomodoro,
  cancelPomodoroSession,
  updatePomodoroCompanion,
  teatimeCardEl,
  btnTeatimeDockEl,
  btnTeatimeGoShiftEl,
  teatimeBuffPillEl,
  weeklyJournalCardEl,
  btnWeeklyJournalEl,
  btnJournalStampTodayEl,
  recordJournalActivity,
  stampJournalToday,
  computeWeeklyJournalSummary,
  syncWeeklyJournalUI,
  dismissWeeklyJournalCard,
  openWeeklyJournalCard,
  toggleWeeklyJournalCard,
  syncTeatimeUI,
  selectTeaBase,
  selectTeaPastry,
  serveAfternoonTeaSet,
  updateAfternoonTeaBuff,
  dismissTeatimeCard,
  openTeatimeCard,
  toggleTeatimeCard,
  terrariumCardEl,
  btnPlantDisplayToggleEl,
  btnTerrariumDockEl,
  terrariumBlessingPillEl,
  goodnightCardEl,
  btnMusicboxDockEl,
  musicboxMiniPillEl,
  btnMusicboxChimeMuteEl,
  btnMusicboxFoldEl,
  btnMusicboxStartEl,
  btnMusicboxPauseEl,
  btnMusicboxSettleEl,
  btnMusicboxCancelEl,
  syncTerrariumUI,
  selectTerrariumPlant,
  careTerrariumPlant,
  harvestPlantDew,
  togglePlantDeskDisplay,
  updateTerrarium,
  dismissTerrariumCard,
  openTerrariumCard,
  toggleTerrariumCard,
  syncGoodnightUI,
  selectGoodnightMinutes,
  selectGoodnightMelody,
  toggleGoodnightChimeMute,
  startGoodnightSession,
  togglePauseGoodnight,
  settleGoodnightSession,
  cancelGoodnightSession,
  updateGoodnightCompanion,
  foldOrHideGoodnightCard,
  openGoodnightCard,
  toggleGoodnightCard
} from './room-ar04-06.js?v=hd60';
import {
  collageCardEl,
  btnCollageDockEl,
  collageBlessingPillEl,
  collageStageEl,
  btnCollageDisplayToggleEl,
  btnCollageArrangeEl,
  btnCollageSaveEl,
  btnCollageGoShiftEl,
  cozyRadioCardEl,
  btnCozyRadioDockEl,
  cozyRadioPillEl,
  btnRadioFoldEl,
  btnRadioToggleEl,
  btnRadioLogJournalEl,
  cozyRadioRun,
  syncCollageUI,
  selectCollageFrameStyle,
  selectCollagePhoto,
  toggleCollageSticker,
  moveCollageSticker,
  cycleCollageLayoutPreset,
  toggleCollageDeskDisplay,
  saveCollageKeepsake,
  dismissCollageCard,
  openCollageCard,
  toggleCollageCard,
  syncCozyRadioUI,
  tuneCozyRadioChannel,
  toggleCozyRadioPlayback,
  pauseCozyRadioForModeSwitch,
  logCozyRadioSessionToJournal,
  updateCozyRadioCompanion,
  foldOrHideCozyRadioCard,
  openCozyRadioCard,
  toggleCozyRadioCard,
  crochetCardEl,
  btnCrochetDockEl,
  crochetGuardPillEl,
  btnCrochetDailyYarnEl,
  btnCrochetYarnPackEl,
  btnCrochetDisplayToggleEl,
  btnCrochetCraftEl,
  btnCrochetGiftEl,
  btnCrochetGoShiftEl,
  hotCocoaCardEl,
  btnHotCocoaDockEl,
  hotCocoaPillEl,
  btnCocoaServeEl,
  btnCocoaGoShiftEl,
  syncCrochetUI,
  claimDailyCrochetYarn,
  buyCrochetYarnPack,
  selectCrochetKnit,
  crochetOrUpgradeKnit,
  giftOrInteractCrochetKnit,
  toggleCrochetDeskDisplay,
  dismissCrochetCard,
  openCrochetCard,
  toggleCrochetCard,
  syncHotCocoaUI,
  selectCocoaBase,
  selectCocoaTopping,
  serveHotCocoaBlend,
  updateHotCocoaBuff,
  dismissHotCocoaCard,
  openHotCocoaCard,
  toggleHotCocoaCard,
  pressedFlowerCardEl,
  btnPressedDockEl,
  pressedFlowerPillEl,
  btnPressedDailyGatherEl,
  btnPressedFlowerPackEl,
  btnPressedDisplayToggleEl,
  btnPressedPressEl,
  btnPressedGiftEl,
  btnPressedGoShiftEl,
  telescopeCardEl,
  btnTelescopeDockEl,
  starChartPillEl,
  telescopeSkyStarsEl,
  telescopeIdentifyGridEl,
  btnTelescopeStartEl,
  btnTelescopeGoShiftEl,
  starChartGridEl,
  syncPressedFlowerUI,
  claimDailyPressedFlowers,
  buyPressedFlowerPack,
  selectPressedBookmark,
  pressOrUpgradeBookmark,
  caressPressedBookmark,
  togglePressedDeskDisplay,
  dismissPressedFlowerCard,
  openPressedFlowerCard,
  togglePressedFlowerCard,
  startStargazeSession,
  tapStargazeStar,
  pickStargazeOption,
  syncTelescopeUI,
  updateStargazeCompanion,
  dismissTelescopeCard,
  openTelescopeCard,
  toggleTelescopeCard
} from './room-ar07-09.js?v=hd60';
import {
  watercolorCardEl,
  btnWatercolorDockEl,
  watercolorWashLayerEl,
  watercolorWellRowEl,
  btnWatercolorMainEl,
  btnWatercolorGoShiftEl,
  watercolorGalleryGridEl,
  mailboxCardEl,
  btnMailboxDockEl,
  mailboxTabRowEl,
  mailboxEnvelopeRowEl,
  mailboxReplyGridEl,
  btnMailboxSendEl,
  btnMailboxGoShiftEl,
  mailboxAlbumGridEl,
  atelierPillEl,
  isAr10CardOpen,
  dismissWatercolorCard,
  dismissMailboxCard,
  dismissAr10Cards,
  applyShiftXpGain,
  applyWatercolorSelection,
  selectWatercolorSubject,
  selectWatercolorPalette,
  tapWatercolorWell,
  tapWatercolorWash,
  handleWatercolorMainAction,
  syncWatercolorUI,
  getMailboxIntervalMs,
  checkMailboxLetters,
  openMailboxLetter,
  chooseMailboxReply,
  chooseMailboxStamp,
  sendMailboxReply,
  setMailboxView,
  readMailboxAlbumEntry,
  syncMailboxUI,
  openWatercolorCard,
  toggleWatercolorCard,
  openMailboxCard,
  toggleMailboxCard,
  handleAr10CanvasTap,
  updateAr10Companions,
  bentoCardEl,
  btnBentoDockEl,
  bentoTrayEl,
  bentoBoxEl,
  btnBentoMainEl,
  btnBentoShareEl,
  btnBentoGoShiftEl,
  puzzleCardEl,
  btnPuzzleDockEl,
  puzzleSourceRowEl,
  puzzleBoardEl,
  btnPuzzleMainEl,
  btnPuzzleGoShiftEl,
  puzzleWallGridEl,
  kmPillEl,
  bentoRun,
  isAr11CardOpen,
  dismissBentoKitchenCard,
  dismissMemoryPuzzleCard,
  dismissAr11Cards,
  restorePendingBento,
  pickBentoTray,
  placeBentoSlot,
  shareBento,
  handleBentoMainAction,
  openBentoLunchForShift,
  tryBentoRescueHeal,
  syncBentoKitchenUI,
  puzzleRun,
  getMemoryPuzzleSources,
  selectMemorySource,
  tapPuzzleSlot,
  swapPuzzleSlots,
  handlePuzzleMainAction,
  syncMemoryPuzzleUI,
  fitKitchenMemoryPill,
  openBentoKitchenCard,
  openMemoryPuzzleCard,
  toggleBentoKitchenCard,
  toggleMemoryPuzzleCard,
  handleAr11CanvasTap,
  updateAr11Companions
} from './room-ar10-11.js?v=hd60';
import {
  kittenCardEl,
  btnKittenDockEl,
  kcSillEl,
  btnKittenFeedEl,
  btnKittenPetEl,
  btnKittenGoShiftEl,
  kcCodexGridEl,
  greetingCardEl,
  btnGreetingDockEl,
  gcBaseRowEl,
  gcStickerRowEl,
  gcLineRowEl,
  btnGreetingHelperEl,
  btnGreetingSendEl,
  btnGreetingGoShiftEl,
  gcAlbumGridEl,
  sillCardPillEl,
  CARD_STICKER_MAX,
  kittenRun,
  isAr12CardOpen,
  dismissKittenCornerCard,
  dismissGreetingCraftCard,
  dismissAr12Cards,
  startKittenVisit,
  endKittenVisit,
  tickKittenVisits,
  getActiveKittenVisit,
  feedKitten,
  petKitten,
  tryKittenLuckSave,
  syncKittenCornerUI,
  getCardStickerPalette,
  isHolidayCardPending,
  pickCardBase,
  toggleCardSticker,
  pickCardLine,
  helpCraftCard,
  sendGreetingCard,
  viewAlbumCard,
  handleGreetingSendAction,
  syncGreetingCardUI,
  fitSillCardPill,
  openKittenCornerCard,
  openGreetingCraftCard,
  toggleKittenCornerCard,
  toggleGreetingCraftCard,
  handleAr12CanvasTap,
  updateAr12Companions,
  picnicCardEl,
  btnPicnicDockEl,
  pcBlanketEl,
  pcFoodRowEl,
  pcSpotRowEl,
  btnPicnicHelperEl,
  btnPicnicMainEl,
  btnPicnicGoShiftEl,
  pcLogGridEl,
  diaryCardEl,
  btnDiaryDockEl,
  dyPageEl,
  btnDiaryPrevEl,
  btnDiaryNextEl,
  dyStickerRowEl,
  btnDiaryTodayEl,
  btnDiaryHelperEl,
  btnDiaryJournalEl,
  pdPillEl,
  isAr13CardOpen,
  dismissPicnicBasketCard,
  dismissDiaryBookCard,
  dismissAr13Cards,
  togglePicnicFood,
  pickPicnicSpot,
  helpPicnicPlan,
  sharePicnicFood,
  handlePicnicMainAction,
  openPicnicWardForShift,
  syncPicnicBasketUI,
  openDiaryBookCard,
  gotoDiaryPage,
  flipDiaryPage,
  toggleDiarySticker,
  diaryHelperDecorate,
  syncDiaryBookUI,
  fitPicnicDiaryPill,
  openPicnicBasketCard,
  togglePicnicBasketCard,
  toggleDiaryBookCard,
  handleAr13OutingTap,
  handleAr13CanvasTap,
  updateAr13Companions
} from './room-ar12-13.js?v=hd60';
import {
  potteryCardEl,
  pwWheelEl,
  pwShapeRowEl,
  pwGlazeRowEl,
  btnPotteryHelperEl,
  btnPotteryMainEl,
  btnPotteryGoShiftEl,
  pwShelfGridEl,
  aromaCardEl,
  amBottleStageEl,
  amMoodRowEl,
  btnAromaHelperEl,
  btnAromaMainEl,
  btnAromaStopEl,
  paPillEl,
  isAr14CardOpen,
  dismissPotteryWheelCard,
  dismissAromaTableCard,
  dismissAr14Cards,
  pickPotteryShape,
  pickPotteryGlaze,
  getPotteryMainState,
  handlePotteryMainAction,
  potteryHelper,
  openPotteryWardForShift,
  syncPotteryWheelUI,
  pickAromaMood,
  addAromaDrop,
  stopAroma,
  getAromaMainState,
  handleAromaMainAction,
  aromaHelper,
  syncAromaTableUI,
  fitPotteryAromaPill,
  openPotteryWheelCard,
  openAromaTableCard,
  handleAr14CanvasTap,
  updateAr14Companions,
  starCardEl,
  spDomeEl,
  spCardRowEl,
  btnStarHelperEl,
  btnStarMainEl,
  btnStarOffEl,
  spAlbumGridEl,
  rainCardEl,
  rcWindowEl,
  rcVolumeRowEl,
  btnRainHelperEl,
  btnRainMainEl,
  srPillEl,
  isAr15CardOpen,
  dismissStarProjectorCard,
  dismissRainCornerCard,
  dismissAr15Cards,
  pickStarCard,
  stopStarProjection,
  getStarMainState,
  handleStarMainAction,
  starHelper,
  syncStarProjectorUI,
  stopRainListening,
  setRainVolume,
  toggleRainChime,
  ringRainChime,
  handleRainMainAction,
  rainHelper,
  syncRainCornerUI,
  fitStarRainPill,
  openStarProjectorCard,
  openRainCornerCard,
  handleAr15CanvasTap,
  updateAr15Companions
} from './room-ar14-15.js?v=hd60';
import {
  embroideryCardEl,
  ebHoopEl,
  ebPatternRowEl,
  ebThreadRowEl,
  btnEmbroideryHelperEl,
  btnEmbroideryMainEl,
  ebAlbumGridEl,
  hearthCardEl,
  hcStoveEl,
  hcSnackRowEl,
  btnHearthHelperEl,
  btnHearthMainEl,
  shPillEl,
  isAr16CardOpen,
  dismissEmbroideryCard,
  dismissHearthCard,
  dismissAr16Cards,
  pickEmbroideryPattern,
  pickEmbroideryThread,
  getEmbroideryMainState,
  handleEmbroideryMainAction,
  embroideryHelper,
  pickHearthSnack,
  getHearthMainState,
  handleHearthMainAction,
  hearthHelper,
  syncEmbroideryHoopUI,
  syncHearthCornerUI,
  fitStitchHearthPill,
  openEmbroideryCard,
  openHearthCard,
  updateAr16FloorBottom,
  handleAr16CanvasTap,
  updateAr16Companions,
  wardrobeCardEl,
  wdMirrorEl,
  wdOutfitRowEl,
  btnWardrobeHelperEl,
  btnWardrobeMainEl,
  wdAlbumGridEl,
  storybookCardEl,
  sbBookEl,
  sbStoryRowEl,
  btnStorybookHelperEl,
  btnStorybookMainEl,
  wsPillEl,
  isAr17CardOpen,
  dismissWardrobeCard,
  dismissStorybookCard,
  dismissAr17Cards,
  pickWardrobeOutfit,
  getWardrobeMainState,
  handleWardrobeMainAction,
  wardrobeHelper,
  pickStory,
  getStoryMainState,
  handleStoryMainAction,
  storyHelper,
  syncWardrobeUI,
  syncStorybookUI,
  fitWardrobeStoryPill,
  openAr17Card,
  openWardrobeCard,
  openStorybookCard,
  updateAr17Companions
} from './room-ar16-17.js?v=hd60';
import {
  topicCardEl,
  dismissTopicCard,
  openPetTopicPrompt,
  rpsHudEl,
  rpsGame,
  cancelRpsGame,
  startRpsGame,
  resolveRpsRound,
  updateRpsGame,
  palmCatchGame,
  cancelPalmCatchGame,
  startPalmCatchGame,
  updatePalmCatchGame
} from './pet-chat.js?v=hd60';
import './debug-hooks.js?v=hd60';
// [[split imports end]]

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

const petStore = openPetStore(() => localStorage);
const savedPet = petStore.read();

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

// 浏览器存不下 / 不让存：每次打开只提醒一回。晚一拍再弹，存档可能发生在界面还没初始化完的时候
let saveTroubleWarned = false;
function warnSaveTrouble(quota) {
  if (saveTroubleWarned) return;
  saveTroubleWarned = true;
  setTimeout(() => showSaveTroubleToast(quota), 600);
}

function showSaveTroubleToast(quota) {
  if (isCameraNoticeOpen()) {
    setTimeout(() => showSaveTroubleToast(quota), 1000);
    return;
  }
  showMilestoneToast({
    img: './assets/ui_btn_album.webp?v=hd60',
    badge: '存档',
    name: quota ? '快存不下了' : '进度存不住',
    toastDesc: quota ? '去手账相册删几张照片吧' : '这个浏览器不让存档'
  });
}

function savePetState() {
  try {
    const saved = petStore.write(
      {
        level: player.level,
        xp: player.xp,
        xpNext: player.xpNext,
        bond: player.bond,
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
        seasonWardrobe: player.seasonWardrobe,
        bedtimeStorybook: player.bedtimeStorybook,
        musicTrack: petAudio.getTrackInfo().index,
        weapons: player.weapons,
        bestShiftRecord: player.bestShiftRecord,
        topicsChatted: player.topicsChatted
      }
    );
    if (saved.state !== 'full') warnSaveTrouble(saved.quota);
  } catch (e) {}
}

// AR-G2 亲密长期线读档：老存档没有 bond 字段，LV.8 以上的经验按原来的百分比换算，等级不掉
const savedBond = loadBond(savedPet, formatLocalDateKey());

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
  maxJumps: 3 + (savedPet.weapons && savedPet.weapons.boots > 0 ? 1 : 0),
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
  level: savedBond.level,
  xp: savedBond.xp,
  xpNext: savedBond.xpNext,
  bond: savedBond.bond,
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
  // AR-17 换装外观：look = 换装时她头上画的配饰组合（只影响画面，结算仍只读 player.equipped）；读故事时身旁捧着绘本
  wardrobeVisual: { outfitId: '', look: null, seasonKey: '', rgb: '', cardOpen: false, cheer: 0, preview: '' },
  storyVisual: { cardOpen: false, reading: false, storyId: '', rgb: '', page: 0, pages: 0, cheer: 0, glow: false },
  wardrobeCheerTimer: 0,
  storyCheerTimer: 0,
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
          outfits: Math.max(0, Math.min(99, Math.round(Number(d.outfits) || 0))),
          stories: Math.max(0, Math.min(99, Math.round(Number(d.stories) || 0))),
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
        ),
        totalOutfitChanges: Math.max(
          0,
          Math.min(999999, Math.round(Number(rawCum.totalOutfitChanges) || Number(savedPet.seasonWardrobe?.totalChanges) || 0))
        ),
        totalStories: Math.max(
          0,
          Math.min(999999, Math.round(Number(rawCum.totalStories) || Number(savedPet.bedtimeStorybook?.totalStories) || 0))
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
  seasonWardrobe: (() => {
    // AR-17 季节换装衣橱：旧存档回落为空衣橱、没在换装（换装只换她身上的配饰组合 + 季节小特效，不改已穿戴饰品与它们的加成）
    const rawWd =
      savedPet.seasonWardrobe && typeof savedPet.seasonWardrobe === 'object' && !Array.isArray(savedPet.seasonWardrobe)
        ? savedPet.seasonWardrobe
        : {};
    const outfitIds = ['sakura_bow', 'spring_wreath', 'seaside_shell', 'summer_starlight', 'maple_crown', 'autumn_reader', 'snow_crown', 'first_snow'];
    const validDate = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '');
    const clampInt = (v, max) => Math.max(0, Math.min(max, Math.round(Number(v) || 0)));
    const outfits = {};
    if (rawWd.outfits && typeof rawWd.outfits === 'object' && !Array.isArray(rawWd.outfits)) {
      for (const id of outfitIds) {
        const o = rawWd.outfits[id];
        if (!o || typeof o !== 'object' || Array.isArray(o)) continue;
        const cnt = clampInt(o.count, 99999);
        if (cnt > 0) outfits[id] = { count: cnt, first: validDate(o.first) };
      }
    }
    // 正在穿的套组一定算换过（脏数据里穿着却没记录时补一条）
    const wearing = outfitIds.includes(rawWd.wearing) ? rawWd.wearing : '';
    if (wearing && !outfits[wearing]) outfits[wearing] = { count: 1, first: '' };
    const changesFound = Object.values(outfits).reduce((acc, o) => acc + o.count, 0);
    const rewardDate = validDate(rawWd.rewardDate);
    return {
      outfits,
      wearing,
      rewardDate,
      // 每日计数不超过当天上限（每天 2 次换装奖励）
      rewardCount: rewardDate ? clampInt(rawWd.rewardCount, 2) : 0,
      totalChanges: Math.max(changesFound, clampInt(rawWd.totalChanges, 999999)),
      lastOutfitId: outfitIds.includes(rawWd.lastOutfitId) ? rawWd.lastOutfitId : ''
    };
  })(),
  bedtimeStorybook: (() => {
    // AR-17 睡前故事书：旧存档回落为空书签夹、没有晚安余温（翻到第几页是运行时状态，不入存档）
    const rawSb =
      savedPet.bedtimeStorybook && typeof savedPet.bedtimeStorybook === 'object' && !Array.isArray(savedPet.bedtimeStorybook)
        ? savedPet.bedtimeStorybook
        : {};
    const storyIds = ['whale_lullaby', 'moon_bakery', 'star_postman', 'cloud_pillow', 'snow_lantern', 'teacup_kitten'];
    const validDate = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '');
    const clampInt = (v, max) => Math.max(0, Math.min(max, Math.round(Number(v) || 0)));
    const bookmarks = {};
    if (rawSb.bookmarks && typeof rawSb.bookmarks === 'object' && !Array.isArray(rawSb.bookmarks)) {
      for (const id of storyIds) {
        const b = rawSb.bookmarks[id];
        if (!b || typeof b !== 'object' || Array.isArray(b)) continue;
        const cnt = clampInt(b.count, 99999);
        if (cnt > 0) bookmarks[id] = { count: cnt, first: validDate(b.first), starlit: Boolean(b.starlit) };
      }
    }
    // 晚安余温：只认起止时间合理（不超过 90 分钟）、故事合法的记录；是否已散由运行时按可注入时钟判断
    let glow = null;
    const g = rawSb.glow;
    if (g && typeof g === 'object' && !Array.isArray(g) && storyIds.includes(g.storyId)) {
      const startMs = Number(g.startMs);
      const endMs = Number(g.endMs);
      if (Number.isFinite(startMs) && Number.isFinite(endMs) && startMs > 0 && endMs > startMs && endMs - startMs <= 90 * 60000) {
        glow = { startMs: Math.round(startMs), endMs: Math.round(endMs), storyId: g.storyId };
      }
    }
    const storiesFound = Object.values(bookmarks).reduce((acc, b) => acc + b.count, 0);
    const rewardDate = validDate(rawSb.rewardDate);
    return {
      bookmarks,
      rewardDate,
      rewardCount: rewardDate ? clampInt(rawSb.rewardCount, 2) : 0,
      totalStories: Math.max(storiesFound, clampInt(rawSb.totalStories, 999999)),
      glow,
      goodnightDate: validDate(rawSb.goodnightDate),
      totalGoodnights: clampInt(rawSb.totalGoodnights, 999999),
      lastStoryId: storyIds.includes(rawSb.lastStoryId) ? rawSb.lastStoryId : ''
    };
  })(),
  weapons: {
    blaster: 1,
    teaBlade: 1,
    magnet: 1,
    boots: 0,
    ...(savedPet.weapons || {})
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
    ico: './assets/vfx_season_spring.webp?v=hd60',
    greet: '窗畔飘起粉嫩春樱花瓣啦~'
  },
  {
    id: 'summer',
    name: '夏风',
    ico: './assets/vfx_season_summer.webp?v=hd60',
    greet: '挂上夏日清凉玻璃风铃，微风叮咚好听~'
  },
  {
    id: 'autumn',
    name: '秋枫',
    ico: './assets/vfx_season_autumn.webp?v=hd60',
    greet: '暖金秋枫与银杏叶随风落上窗台~'
  },
  {
    id: 'winter',
    name: '初雪',
    ico: './assets/vfx_season_winter.webp?v=hd60',
    greet: '窗外飘起软绵绵的初雪冰晶啦~'
  }
];

const INTIMACY_MILESTONES = [
  {
    level: 3,
    itemId: 'shell_clip',
    kind: 'headwear',
    name: '星海贝壳发卡',
    img: './assets/item_shell_clip.webp?v=hd60',
    desc: '亲密 LV.3 解锁 · 互动亲密经验 +20%',
    toastDesc: '已自动佩戴限定头饰，每次互动亲密经验 +20%'
  },
  {
    level: 5,
    itemId: 'furn_musicbox',
    furnKey: 'musicbox',
    kind: 'furniture',
    name: '星梦八音盒唱片机',
    img: './assets/furn_musicbox.webp?v=hd31',
    desc: '亲密 LV.5 解锁 · 轻点切换3首治愈八音盒曲目',
    toastDesc: '已自动摆上桌面，轻点唱片机可切换治愈曲目~'
  },
  {
    level: 8,
    itemId: 'star_wreath',
    kind: 'headwear',
    name: '深海星梦花环',
    img: './assets/item_star_wreath.webp?v=hd60',
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
  if (badgeEl) badgeEl.textContent = milestone.badge || `亲密 LV.${milestone.level} 里程碑解锁`;
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

// AR-G2 LV.9~LV.20 长期线发奖：一次升多级或老存档补发时，只合并成一条提示
function reconcileBondMilestones({ announce = true } = {}) {
  const g = grantMilestones(player.level, player.bond, player.ownedDress, formatLocalDateKey());
  if (g.list.length === 0) return false;
  player.bond.claimed = g.claimed;
  for (const id of g.items) player.ownedDress[id] = true;
  if (g.coins > 0) player.coins += g.coins;
  savePetState();
  syncMemoryBookUI();
  if (!drawerEl.classList.contains('hidden')) renderDrawerItems();
  if (announce) {
    const tip = describeGrant(g.list, g);
    showMilestoneToast({ level: tip.level, img: tip.img, badge: tip.badge, name: tip.title, toastDesc: tip.desc });
    playSfx('star');
    spawnInteractVfx(player.x, player.y - 30, 'love', 10);
    const last = g.list[g.list.length - 1];
    setPlayerEmote(last.line || `「${last.title}」记进手账啦~`, 2.6, 'happy', true);
  }
  return true;
}

function onPlayerLevelUp() {
  reconcileIntimacyMilestones({ showToast: true });
  reconcileBondMilestones({ announce: true });
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
// [[split 1 -> mode-survivor.js]]
// [[split 2 -> data-room.js]]

let syncCrochetUIFn = null;
// [[split 3 -> data-room.js]]

let syncPressedFlowerUIFn = null;
// [[split 4 -> data-room.js]]

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
// [[split 5 -> data-room.js]]
let ar12RandomFn = Math.random;
// [[split 6 -> data-room.js]]
// [[split 7 -> mode-survivor.js]]

document.getElementById('survivor-skill-modal')?.addEventListener('pointerdown', (e) => {
  e.stopPropagation();
});

window.addEventListener('keydown', (e) => {
  if (!survivorRun.choosingSkill || gameMode !== 'survivor') return;
  if (e.key === '1' && survivorRun.currentChoices[0]) applySurvivorSkillChoice(survivorRun.currentChoices[0].id);
  if (e.key === '2' && survivorRun.currentChoices[1]) applySurvivorSkillChoice(survivorRun.currentChoices[1].id);
  if (e.key === '3' && survivorRun.currentChoices[2]) applySurvivorSkillChoice(survivorRun.currentChoices[2].id);
});
// [[split 8 -> mode-survivor.js]]

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

function setPlayerEmote(rawText, duration = 1.8, voiceMood = null, speakTts = false) {
  // AR-G2 亲密称呼：她说的话里按手账选的称呼来叫
  const text = applyCallName(rawText, player.bond.call);
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

function addAffectionXp(amount, labelText, source = 'care') {
  const gain = Math.max(1, Math.round(amount * getAffectionXpMult()));
  // AR-G2：LV.8 起按「相处的日子」计入（规则与天数见 intimacy.js 开头）
  const bondRes = countBondXp({ level: player.level, amount: gain, pace: player.bond.pace, dayKey: formatLocalDateKey(), source });
  player.bond.pace = bondRes.pace;
  const finalAmount = bondRes.counted;
  player.hp = Math.min(player.maxHp, player.hp + 15);
  pulseHudElement('hud-avatar-btn');
  const textStr = bondFloatLabel(labelText, gain, finalAmount);
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
  const fromLevel = player.level;
  const bondStep = applyBondXp(player, finalAmount);
  player.xp = bondStep.xp;
  player.xpNext = bondStep.xpNext;
  for (let lvUp = 1; lvUp <= bondStep.gained; lvUp++) {
    player.level = fromLevel + lvUp;
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
  if (bondStep.gained > 0) {
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

// 「伸出手掌」要看摄像头：没开摄像头时跳过这一条，免得心愿卡在做不到的事上
function skipCameraOnlyWish() {
  if (vision.mode !== 'camera' && currentWish && currentWish.id === 'palm_hold') {
    currentWishIndex = (currentWishIndex + 1) % WISH_POOL.length;
    currentWish = WISH_POOL[currentWishIndex];
  }
  const wishTextEl = document.getElementById('hud-wish-text');
  if (wishTextEl && currentWish) wishTextEl.textContent = currentWish.text;
}

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
  skipCameraOnlyWish();
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
    // AR-G2 亲密里程碑解锁的台词混在摸头台词里
    const headLines = [...TSUNDERE_LINES, ...unlockedLines(player.level)];
    const line = headLines[Math.floor(Math.random() * headLines.length)];
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
// 切走窗口时收不到 keyup：松开所有方向键，免得她回来后一直跑
window.addEventListener('blur', () => {
  input.left = false;
  input.right = false;
  input.down = false;
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
        it.dragPointerId = e.pointerId;
        it.vx = 0;
        it.vy = 0;
        setNapping(false);
        setPlayerEmote('主人拿起了好吃的！快喂到我嘴边~ 啊——', 2.0, 'eat');
        return;
      }
    }
  }

    if (Math.hypot(pt.x - player.x, pt.y - (player.y - 22)) < 64) {
    // 正被另一根手指拎着：这一下不算
    if (petTouch.active && player.isPickedUp) return;
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
    if (draggedItem.dragPointerId != null && e.pointerId !== draggedItem.dragPointerId) return;
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
  // 只认按住它的那根手指；不带事件调用（切走窗口）时全部放下
  const pid = e && e.pointerId != null ? e.pointerId : null;
  const isOwner = (id) => pid === null || id == null || id === pid;
  if (draggedFurniture && isOwner(draggedFurniture.dragPointerId)) {
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
  if (draggedItem && isOwner(draggedItem.dragPointerId)) {
    draggedItem.dragPointerId = null;
    draggedItem.squashTimer = 0.2;
    draggedItem = null;
  }
  if (petTouch.active && isOwner(petTouch.pointerId)) {
    if (player.isPickedUp) {
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
window.addEventListener('blur', () => finishCanvasTouch());
// [[split 9 -> drawer.js]]

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

function openDrawer(tab) { cancelRpsGame(); cancelPalmCatchGame(); dismissPolaroid(); dismissTopicCard(); dismissWindowAmbienceCard(); foldOrHidePomodoroCard(); dismissTeatimeCard(); dismissWeeklyJournalCard(); dismissTerrariumCard(); foldOrHideGoodnightCard(); dismissCollageCard(); foldOrHideCozyRadioCard(); dismissCrochetCard(); dismissHotCocoaCard(); dismissPressedFlowerCard(); dismissTelescopeCard(); dismissAr10Cards(); dismissAr11Cards(); dismissAr12Cards(); dismissAr13Cards(); dismissAr14Cards(); dismissAr15Cards(); dismissAr16Cards(); dismissAr17Cards(); player.wanderTargetX = null; if (player.y < H * 0.68 - 26) { player.y = H * 0.68 - 25; player.vy = 0; player.onGround = true; player.standingPlat = null; }
  activeDrawerTab = tab;
  drawerEl.classList.remove('hidden'); document.getElementById('hud-wish-pill')?.classList.add('hidden');
  document.querySelectorAll('.drawer-tab').forEach((t) => {
    t.classList.toggle('active', t.dataset.tab === tab);
  });
  document.getElementById('btn-feed').classList.toggle('active', tab === 'food');
  document.getElementById('btn-shop').classList.toggle('active', tab === 'dress' || tab === 'upgrade');
  drawerEl.classList.toggle('is-album', tab === 'album');
  renderDrawerItems();
}

function closeDrawer() {
  drawerEl.classList.add('hidden'); if (gameMode === 'pet' && currentWish) document.getElementById('hud-wish-pill')?.classList.remove('hidden');
  player.drawerOpen = false;
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

// 手机点按之后会在同一位置补发一次 click：界面可能已经换了，别让它点到刚出现的按钮；按住再松也只算一次
// 代码里的 el.click()、键盘回车 detail 为 0，不受影响
let lastPointerUpAt = -1e9;
window.addEventListener('pointerup', () => {
  lastPointerUpAt = performance.now();
}, true);
function isTapEcho(e) {
  return e.detail > 0 && performance.now() - lastPointerUpAt < 400;
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
    if (performance.now() - lastTriggerAt < 400 || isTapEcho(e)) return;
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
    if (performance.now() - lastFireAt < 400 || isTapEcho(e)) return;
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
// [[split 10 -> drawer.js]]

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
  preloadModeSprites(newMode);
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
  dismissTelescopeCard(); dismissAr10Cards(); dismissAr11Cards(); dismissAr12Cards(); dismissAr13Cards(); dismissAr14Cards(); dismissAr15Cards(); dismissAr16Cards(); dismissAr17Cards();
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
    syncWardrobeUI();
    syncStorybookUI();
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
    syncWardrobeUI();
    syncStorybookUI();
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
    syncWardrobeUI();
    syncStorybookUI();
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
    if (gameMode === 'survivor' && btn.dataset.mode === 'survivor') return;
    switchMode(btn.dataset.mode);
  });
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isTapEcho(e)) return;
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
// [[split 11 -> room-ar04-06.js]]

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
// [[split 12 -> room-ar04-06.js]]

const pomodoroRun = {
  status: 'idle', // 'idle' | 'running' | 'paused' | 'completed'
  durationSec: (player.pomodoro.selectedMinutes || 25) * 60,
  remainingSec: (player.pomodoro.selectedMinutes || 25) * 60,
  encourageTimer: 18,
  encourageIdx: 0,
  halfwayNotified: false,
  lastRewardSummary: ''
};
// [[split 13 -> room-ar04-06.js]]

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
// [[split 14 -> debug-hooks.js]]
// [[split 15 -> room-ar04-06.js]]

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
// [[split 16 -> room-ar04-06.js]]

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
// [[split 17 -> room-ar04-06.js]]

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
// [[split 18 -> debug-hooks.js]]
// [[split 19 -> room-ar07-09.js]]

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
// [[split 20 -> room-ar07-09.js]]

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
// [[split 21 -> debug-hooks.js]]
// [[split 22 -> room-ar07-09.js]]
syncCrochetUIFn = syncCrochetUI;
// [[split 23 -> room-ar07-09.js]]

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
// [[split 24 -> debug-hooks.js]]
// [[split 25 -> room-ar07-09.js]]
syncPressedFlowerUIFn = syncPressedFlowerUI;
// [[split 26 -> room-ar07-09.js]]

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
  dismissTelescopeCard(); dismissAr10Cards(); dismissAr11Cards(); dismissAr12Cards(); dismissAr13Cards(); dismissAr14Cards(); dismissAr15Cards(); dismissAr16Cards(); dismissAr17Cards();
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
  dismissTelescopeCard(); dismissAr10Cards(); dismissAr11Cards(); dismissAr12Cards(); dismissAr13Cards(); dismissAr14Cards(); dismissAr15Cards(); dismissAr16Cards(); dismissAr17Cards();
  switchMode('survivor');
});

syncPressedFlowerUI();
syncTelescopeUI();
// [[split 27 -> debug-hooks.js]]
// [[split 28 -> room-ar10-11.js]]

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
// [[split 29 -> debug-hooks.js]]
// [[split 30 -> room-ar10-11.js]]

// 窄屏胶囊行已排满时不为 AR-11 胶囊新开一行：用 offsetTop（不受旋转舞台变换影响）判断是否换行，放不下就收起
const kmCompactQuery = window.matchMedia ? window.matchMedia('(max-width: 920px), (max-height: 430px)') : null;
// [[split 31 -> room-ar10-11.js]]

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
// [[split 32 -> debug-hooks.js]]
// [[split 33 -> room-ar12-13.js]]
const gcPreviewStickerEls = [0, 1, 2].map((i) => document.getElementById(`gc-ps-${i}`));
// [[split 34 -> room-ar12-13.js]]

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
// [[split 35 -> room-ar12-13.js]]

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
// [[split 36 -> room-ar12-13.js]]
const pcFoodSlotEls = [0, 1, 2].map((i) => (pcBlanketEl ? pcBlanketEl.querySelector(`[data-food-slot="${i}"]`) : null));
// [[split 37 -> room-ar12-13.js]]
const dyPageStickerEls = [0, 1, 2].map((i) => document.getElementById(`dy-ps-${i}`));
// [[split 38 -> room-ar12-13.js]]

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
// [[split 39 -> room-ar12-13.js]]

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
// [[split 40 -> debug-hooks.js]]
// [[split 41 -> room-ar14-15.js]]
const amDropEls = Array.from(document.querySelectorAll('#am-drops .am-drop'));
// [[split 42 -> room-ar14-15.js]]

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
// [[split 43 -> room-ar14-15.js]]

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
// [[split 44 -> debug-hooks.js]]
// [[split 45 -> room-ar14-15.js]]

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
// [[split 46 -> debug-hooks.js]]
// [[split 47 -> room-ar16-17.js]]

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
// [[split 48 -> debug-hooks.js]]
// [[split 49 -> room-ar16-17.js]]

if (wardrobeCardEl) {
  wardrobeCardEl.addEventListener('pointerdown', (e) => e.stopPropagation());
}
if (storybookCardEl) {
  storybookCardEl.addEventListener('pointerdown', (e) => e.stopPropagation());
}

bindHudTap(document.getElementById('btn-wardrobe-close'), () => {
  dismissWardrobeCard();
  syncWardrobeUI();
});
bindHudTap(wdOutfitRowEl, (e) => {
  const chip = e.target && e.target.closest ? e.target.closest('.wd-outfit-chip') : null;
  if (chip) pickWardrobeOutfit(chip.dataset.outfitId);
});
bindHudTap(wdAlbumGridEl, (e) => {
  const chip = e.target && e.target.closest ? e.target.closest('.wd-album-chip') : null;
  if (chip) pickWardrobeOutfit(chip.dataset.outfitId);
});
// 点试衣镜本身也能换上 / 换回（和主按钮同一个动作）
bindHudTap(wdMirrorEl, () => {
  const st = getWardrobeMainState();
  if (!st.disabled) handleWardrobeMainAction();
});
bindHudTap(btnWardrobeHelperEl, () => {
  wardrobeHelper();
});
bindHudTap(btnWardrobeMainEl, () => {
  if (btnWardrobeMainEl.disabled) return;
  handleWardrobeMainAction();
});

bindHudTap(document.getElementById('btn-storybook-close'), () => {
  dismissStorybookCard();
  syncStorybookUI();
});
bindHudTap(sbStoryRowEl, (e) => {
  const chip = e.target && e.target.closest ? e.target.closest('.sb-story-chip') : null;
  if (chip) pickStory(chip.dataset.storyId);
});
// 点绘本本身也能翻页 / 夹书签（和主按钮同一个动作）
bindHudTap(sbBookEl, () => {
  const st = getStoryMainState();
  if (!st.disabled && (st.mode === 'turn' || st.mode === 'finish')) handleStoryMainAction();
});
bindHudTap(btnStorybookHelperEl, () => {
  storyHelper();
});
bindHudTap(btnStorybookMainEl, () => {
  if (btnStorybookMainEl.disabled) return;
  handleStoryMainAction();
});
bindHudTap(wsPillEl, (e) => {
  const segEl = e.target && e.target.closest ? e.target.closest('[data-ws-seg]') : null;
  const ss = getStorybookStats();
  const seg = segEl ? segEl.dataset.wsSeg : ss.glow || ss.reading ? 'story' : 'wardrobe';
  if (seg === 'wardrobe') openWardrobeCard();
  else openStorybookCard();
});

window.addEventListener('resize', () => {
  requestAnimationFrame(() => fitWardrobeStoryPill());
});

storyRun.dayKey = formatLocalDateKey(ar17Clock.date());
storyRun.wasGlow = Boolean(getStoryGlow());
syncWardrobeUI();
syncStorybookUI();
// [[split 50 -> debug-hooks.js]]

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
  dismissTelescopeCard(); dismissAr10Cards(); dismissAr11Cards(); dismissAr12Cards(); dismissAr13Cards(); dismissAr14Cards(); dismissAr15Cards(); dismissAr16Cards(); dismissAr17Cards();
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
  const keptInAlbum = saveSnapshotToPolaroidAlbum(pCanvas, dateStr);
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
  if (keptInAlbum) setPlayerEmote('咔嚓！拍得超可爱 ^w^ ', 2.4, 'cheer', true);
  else setPlayerEmote(isAlbumAllPinned() ? '相册都钉满啦，这张没收进去~' : '这张没能存进相册~', 3.4, 'happy');
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
  let failed = false;
  let quota = false;
  const fit = fitAlbum(polaroidAlbum, POLAROID_ALBUM_MAX, (list) => {
    try {
      localStorage.setItem(POLAROID_ALBUM_KEY, JSON.stringify(list));
      return true;
    } catch (e) {
      failed = true;
      quota = isQuotaError(e);
      return false;
    }
  });
  polaroidAlbum.splice(0, polaroidAlbum.length, ...fit.list);
  syncAlbumCountBadge();
  if (failed) warnSaveTrouble(quota);
  return fit.saved;
}

function isAlbumAllPinned() {
  return polaroidAlbum.length >= POLAROID_ALBUM_MAX && polaroidAlbum.every((p) => p.pinned);
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
    const saved = persistPolaroidAlbum();
    recordJournalActivity('snaps', 1);
    if (!drawerEl.classList.contains('hidden') && activeDrawerTab === 'album') {
      renderDrawerItems();
    }
    return saved && polaroidAlbum.includes(entry);
  } catch (e) {
    return false;
  }
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
      <img src="./assets/ui_btn_album.webp?v=hd60" alt="" class="album-summary-ico" />
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
        <img src="./assets/ui_pin_star.webp?v=hd60" alt="" />
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
// [[split 51 -> pet-chat.js]]
let topicAutoTimer = 18.0;

topicCardEl?.addEventListener('pointerdown', (e) => {
  e.stopPropagation();
});
// [[split 52 -> pet-chat.js]]

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
// [[split 53 -> pet-chat.js]]

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
    (isAr10CardOpen() || isAr11CardOpen() || isAr12CardOpen() || isAr13CardOpen() || isAr14CardOpen() || isAr15CardOpen() || isAr16CardOpen() || isAr17CardOpen() || isMemoryBookOpen()) ||
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
// [[split 54 -> pet-chat.js]]
const rpsChoiceBtns = Array.from(document.querySelectorAll('.rps-choice-btn'));
// [[split 55 -> pet-chat.js]]

rpsHudEl?.addEventListener('pointerdown', (e) => {
  e.stopPropagation();
});
// [[split 56 -> pet-chat.js]]

bindHudTap(document.getElementById('btn-rps'), () => {
  if (palmCatchGame.active) cancelPalmCatchGame();
  startRpsGame(false);
});

// ================= 实景手掌“托举接白米饭”小游戏（移动真实手掌或摇杆带她接天降美食金币） =================
const rpsChoicesEl = document.querySelector('#rps-hud .rps-choices');
// [[split 57 -> pet-chat.js]]

bindHudTap(document.getElementById('btn-palm-catch'), () => {
  startPalmCatchGame();
});

for (const btn of rpsChoiceBtns) {
  bindHudTap(btn, () => {
    const chosen = btn.dataset.rps;
    if (!chosen || !rpsGame.active) return;
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
    whale: './assets/toy_whale.webp?v=hd60',
    yarn: './assets/toy_yarn.webp?v=hd60',
    duck: './assets/toy_duck.webp?v=hd60'
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
  if (vision.mode !== 'camera') {
    showCameraNotice();
    return;
  }
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

// ================= AR-G3 手账：相伴册 + 相册 / 日记 / 周报 / 拼贴 / 压花 / 故事书的统一入口 =================
// 六本各自的面板、数据、按钮 id 都没变，只是把船坞键 / 顶部胶囊 / 右上角键 / 抽屉快捷收到这一处；只碰 DOM，初始化期间调用也安全
function isMemoryBookOpen() {
  const el = document.getElementById('memory-book-card');
  return Boolean(el && !el.classList.contains('hidden'));
}

function dismissMemoryBookCard() {
  document.getElementById('memory-book-card')?.classList.add('hidden');
  document.getElementById('btn-memory-book')?.classList.remove('active');
}

function setMemoryBookView(view) {
  const cardEl = document.getElementById('memory-book-card');
  if (!cardEl) return;
  cardEl.dataset.view = view;
  const titleEl = document.getElementById('mb-title');
  if (titleEl) titleEl.textContent = view === 'bond' ? '相伴册' : '手账';
  cardEl.scrollTop = 0;
}

function openMemoryBookCard(view = 'shelf') {
  const cardEl = document.getElementById('memory-book-card');
  if (!cardEl) return { ok: false };
  openAr17Card(cardEl);
  setMemoryBookView(view);
  if (view === 'bond') markBondPagesSeen();
  syncMemoryBookUI();
  document.getElementById('btn-memory-book')?.classList.add('active');
  return { ok: true, view };
}

function toggleMemoryBookCard() {
  if (isMemoryBookOpen()) {
    dismissMemoryBookCard();
    return;
  }
  openMemoryBookCard('shelf');
  petAudio.playDiaryFlip();
}

// 相伴册里还没翻看过的新页
function hasNewBondPage() {
  const top = Object.keys(player.bond.claimed).reduce((a, k) => Math.max(a, Number(k) || 0), 0);
  return top > player.bond.seen;
}

function markBondPagesSeen() {
  if (!hasNewBondPage()) return;
  player.bond.seen = Object.keys(player.bond.claimed).reduce((a, k) => Math.max(a, Number(k) || 0), 0);
  savePetState();
}

function syncMemoryBookBadge() {
  const bondNew = hasNewBondPage();
  const diaryNew = !document.getElementById('diary-new-badge')?.classList.contains('hidden');
  const giftReady = Boolean(document.getElementById('btn-weekly-journal')?.classList.contains('has-gift'));
  document.getElementById('memory-book-badge')?.classList.toggle('hidden', !(bondNew || diaryNew || giftReady));
  document.getElementById('mb-bond-badge')?.classList.toggle('hidden', !bondNew);
}

function setBondCall(call) {
  const next = sanitizeCall(call, player.level);
  if (next === player.bond.call) return;
  player.bond.call = next;
  savePetState();
  playSfx('pat');
  setPlayerEmote('好呀，主人~', 1.8, 'happy', true);
  syncMemoryBookUI();
}

function formatBondDate(dateKey) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateKey || ''));
  return m ? `${m[1]}.${Number(m[2])}.${Number(m[3])}` : '';
}

function syncMemoryBookUI() {
  const done = player.level >= BOND_FINAL_LEVEL;
  const lvEl = document.getElementById('mb-bond-lv');
  if (lvEl) lvEl.textContent = done ? `相伴 LV.${player.level} · 纪念日` : `相伴 LV.${player.level}`;
  const fillEl = document.getElementById('mb-bond-fill');
  if (fillEl) fillEl.style.width = `${done ? 100 : Math.max(0, Math.min(100, (player.xp / player.xpNext) * 100))}%`;
  const camBtn = document.getElementById('btn-camera-toggle');
  if (camBtn) camBtn.textContent = vision.isCameraLive() ? '摄像头 开' : '摄像头 关';
  syncMemoryBookBadge();

  const callRow = document.getElementById('mb-call-row');
  if (callRow) {
    const calls = unlockedCalls(player.level);
    callRow.innerHTML = '';
    callRow.classList.toggle('hidden', calls.length < 2);
    for (const call of calls) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = `mb-call-chip ${player.bond.call === call ? 'active' : ''}`.trim();
      chip.textContent = call;
      bindCardTap(chip, () => setBondCall(call));
      callRow.appendChild(chip);
    }
  }

  // 一级一页：到了的写一句话，没到的只留等级（不催、不列条件）
  const listEl = document.getElementById('mb-page-list');
  if (!listEl) return;
  listEl.innerHTML = '';
  const early = INTIMACY_MILESTONES.map((m) => ({ level: m.level, title: m.name, img: m.img, page: '' }));
  for (const m of [...early, ...BOND_MILESTONES].sort((a, b) => b.level - a.level)) {
    const open = player.level >= m.level;
    const date = open ? formatBondDate(player.bond.claimed[m.level]) : '';
    const row = document.createElement('div');
    row.className = `mb-page ${open ? 'is-open' : ''}`.trim();
    row.dataset.level = String(m.level);
    row.innerHTML = `
      <img loading="lazy" src="${m.img}" alt="" class="mb-page-ico" />
      <div class="mb-page-main">
        <strong class="mb-page-title">${open ? m.title : `LV.${m.level}`}</strong>
        ${open && m.page ? `<span class="mb-page-text">${m.page}</span>` : ''}
      </div>
      ${open ? `<em class="mb-page-date">${m.level === BOND_FINAL_LEVEL && date ? date : `LV.${m.level}`}</em>` : ''}
    `;
    listEl.appendChild(row);
  }
}

// 翻到某一本时，新面板正好盖在手指底下：短暂不接点击，免得同一次点按又点中新面板里的按钮
let bookTurnTimer = 0;
function guardBookTurn() {
  stageEl.classList.add('is-book-turning');
  clearTimeout(bookTurnTimer);
  bookTurnTimer = setTimeout(() => stageEl.classList.remove('is-book-turning'), 340);
}

const memoryBookCardEl = document.getElementById('memory-book-card');
memoryBookCardEl?.addEventListener('pointerdown', (e) => e.stopPropagation());
memoryBookCardEl?.addEventListener(
  'pointerdown',
  (e) => {
    if (e.target.closest && e.target.closest('.mb-tile, .mb-bond-row')) guardBookTurn();
  },
  true
);
bindHudTap(document.getElementById('btn-memory-book'), () => {
  toggleMemoryBookCard();
});
bindHudTap(document.getElementById('btn-memory-book-close'), () => {
  dismissMemoryBookCard();
});
bindHudTap(document.getElementById('btn-memory-book-back'), () => {
  openMemoryBookCard('shelf');
  guardBookTurn();
});
bindHudTap(document.getElementById('btn-bond-book'), () => {
  openMemoryBookCard('bond');
  petAudio.playDiaryFlip();
});
bindHudTap(document.getElementById('btn-storybook-book'), () => {
  openStorybookCard();
});
document.querySelectorAll('[data-book-back]').forEach((el) => {
  bindHudTap(el, () => {
    openMemoryBookCard('shelf');
    petAudio.playDiaryFlip();
    guardBookTurn();
  });
});

// ================= AR-COM3 摄像头说明：先说清用途再调用，选过就记住 =================
const CAMERA_CHOICE_KEY = 'ar_deepseek_camera_choice_v1';

function readCameraChoice() {
  try {
    const v = localStorage.getItem(CAMERA_CHOICE_KEY);
    return v === 'on' || v === 'off' ? v : '';
  } catch (e) {
    return '';
  }
}

function saveCameraChoice(choice) {
  try {
    localStorage.setItem(CAMERA_CHOICE_KEY, choice);
  } catch (e) {}
}

const cameraNoticeWaiters = [];

function isCameraNoticeOpen() {
  const el = document.getElementById('camera-notice');
  return Boolean(el && !el.classList.contains('hidden'));
}

function showCameraNotice() {
  document.getElementById('camera-notice')?.classList.remove('hidden');
  return new Promise((resolve) => {
    cameraNoticeWaiters.push(resolve);
  });
}

// 「先不用」= 现成的小屋背景（vision 的 sim 模式）：摸头、投喂、聊天、猜拳点按、接美食摇杆等都照常能玩
async function applyCameraChoice(choice) {
  // opened：true 开成了 / false 没开成 / null 还没等到结果就改了主意
  let opened = false;
  if (choice === 'on') opened = await vision.startCamera('environment', W, H);
  else vision.enableSimMode(W, H);
  if (choice === 'off' || opened) saveCameraChoice(choice);
  skipCameraOnlyWish();
  syncMemoryBookUI();
  if (choice === 'on' && opened === false) setPlayerEmote('摄像头没开成，先在小屋里玩吧~', 2.4, 'happy');
  return opened;
}

// 用到一半断了（权限被收回、设备拔掉、被别的程序占走）：回到小屋，不改记住的选择
// why === 'off'：在后台时别的标签页里选了「先不用」，回来照办，不用提示
vision.onCameraLost = (why) => {
  skipCameraOnlyWish();
  syncMemoryBookUI();
  if (why !== 'off') setPlayerEmote('摄像头断开了，先在小屋里玩吧~', 2.6, 'happy');
};
// 切后台 / 锁屏 / 切走标签页：停掉摄像头（track.stop()）；回来时原来开着的再开，开不成留在小屋
vision.allowCameraResume = () => readCameraChoice() !== 'off';
vision.bindPageLifecycle(document, window, () => [W, H]);

async function answerCameraNotice(choice) {
  petAudio.ensureContext();
  document.getElementById('camera-notice')?.classList.add('hidden');
  await applyCameraChoice(choice);
  for (const done of cameraNoticeWaiters.splice(0)) done(choice);
}

document.getElementById('camera-notice')?.addEventListener('pointerdown', (e) => e.stopPropagation());
bindHudTap(document.getElementById('btn-camera-on'), () => {
  answerCameraNotice('on');
});
bindHudTap(document.getElementById('btn-camera-off'), () => {
  answerCameraNotice('off');
});
// 手账里的摄像头开关跟着「开」角标走：在出画面就关；没在出画面（含切回前台还在重开的那次）先停下再问，
// 免得说明卡还开着时摄像头自己亮了
function toggleCameraFromBook() {
  if (vision.isCameraLive()) {
    applyCameraChoice('off');
    return;
  }
  vision.enableSimMode(W, H);
  dismissMemoryBookCard();
  showCameraNotice();
}
bindHudTap(document.getElementById('btn-camera-toggle'), toggleCameraFromBook);

// ================= AR-COM3 比耶自动拍：第一次比耶先问，选过就记住；手账「比耶拍」可以改 =================
let peaceSnapChoice = readPeaceSnapChoice(() => localStorage);

function isPeaceSnapNoticeOpen() {
  const el = document.getElementById('peace-snap-notice');
  return Boolean(el && !el.classList.contains('hidden'));
}

function syncPeaceSnapButton() {
  const btn = document.getElementById('btn-peace-snap-toggle');
  if (btn) btn.textContent = peaceSnapChoice === 'auto' ? '比耶拍 开' : '比耶拍 关';
}

function showPeaceSnapNotice() {
  player.photoPoseTimer = 0;
  document.getElementById('peace-snap-notice')?.classList.remove('hidden');
}

function setPeaceSnapChoice(choice) {
  if (choice !== 'auto' && choice !== 'tap') return;
  peaceSnapChoice = choice;
  savePeaceSnapChoice(() => localStorage, choice);
  document.getElementById('peace-snap-notice')?.classList.add('hidden');
  syncPeaceSnapButton();
  setPlayerEmote(choice === 'auto' ? '好，比耶就拍一张~' : '好，点相机键再拍~', 2.0, 'happy');
}

document.getElementById('peace-snap-notice')?.addEventListener('pointerdown', (e) => e.stopPropagation());
bindHudTap(document.getElementById('btn-peace-snap-auto'), () => {
  setPeaceSnapChoice('auto');
});
bindHudTap(document.getElementById('btn-peace-snap-tap'), () => {
  setPeaceSnapChoice('tap');
});
bindHudTap(document.getElementById('btn-peace-snap-toggle'), () => {
  // 关掉不用解释，直接关；要开先看说明
  if (peaceSnapChoice === 'auto') {
    setPeaceSnapChoice('tap');
    return;
  }
  dismissMemoryBookCard();
  showPeaceSnapNotice();
});
syncPeaceSnapButton();

// 摄像头在用时，右上角相机键挂「开」角标；每帧看一次，变了才改
let cameraLiveShown = null;
function syncCameraLiveBadge() {
  const live = vision.isCameraLive();
  if (live === cameraLiveShown) return;
  cameraLiveShown = live;
  document.getElementById('cam-live-badge')?.classList.toggle('hidden', !live);
  const camBtn = document.getElementById('btn-camera-toggle');
  if (camBtn) camBtn.textContent = live ? '摄像头 开' : '摄像头 关';
}

(async function autoBoot() {
  updateOrientationLayout();
  player.x = W * 0.5;
  player.y = H * 0.62;
  player.emote = applyCallName(player.emote, player.bond.call);
  vision.enableSimMode(W, H);
  if (gameMode !== 'pet') placeStarOnBestTarget();
  syncMemoryBookUI();
  // 第一次先出说明卡，等选好再决定要不要调用摄像头；以后按记住的选择来
  const choice = readCameraChoice();
  if (choice) await applyCameraChoice(choice);
  else await showCameraNotice();
  player.x = W * 0.5;
  player.y = H * 0.62;
  if (gameMode !== 'pet') placeStarOnBestTarget();
  // 老存档亲密度早就过了 LV.8：一次补齐，只出一条提示
  reconcileBondMilestones({ announce: true });
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
  syncCameraLiveBadge();
}

function updateGameplay(dt, flow) {
  // 打工 / 摘星时说明卡开着：这一帧不推进（摘星的连击 9.5 秒会在看说明时断掉）
  const noticeOpen = isCameraNoticeOpen() || isPeaceSnapNoticeOpen();
  if ((gameMode === 'survivor' && (survivorRun.choosingSkill || noticeOpen)) || (gameMode === 'parkour' && noticeOpen)) {
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
      peaceSnapAction(peaceSnapChoice) !== 'off' &&
      !isPeaceSnapNoticeOpen() &&
      photoAutoCooldown <= 0 &&
      pendingPhotoSnapTimer <= 0 &&
      !rpsGame.active
    ) {
      // 镜头一识别到比耶，角色第一帧立刻转头摆出比耶眨眼 Pose 预备，消除等待延迟感！
      player.photoPoseTimer = Math.max(player.photoPoseTimer, 0.28);
      if (gs.holdDuration >= 0.42) {
        // 第一次先问（以后自动拍 / 只在我点时拍）；每次拍都闪一下、有快门声（captureArPolaroid）
        if (peaceSnapAction(peaceSnapChoice) === 'snap') triggerPolaroidSequence(true);
        else showPeaceSnapNotice();
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
        addAffectionXp(45, '讨伐班次首领 +45 亲密', 'work');
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
        // AR-G2：打工掉落的班次经验不变；亲密从 LV.8 起只走每天的慢速份额（打工为辅）
        const gemBond = countBondXp({
          level: player.level,
          amount: g.val,
          pace: player.bond.pace,
          dayKey: formatLocalDateKey(),
          source: 'work'
        });
        player.bond.pace = gemBond.pace;
        player.xp += gemBond.counted;
        if (gameMode === 'survivor') {
          applyShiftXpGain(g.val);
        }
      }
      gems.splice(i, 1);

      const gemStep = applyBondXp(player, 0);
      player.level = gemStep.level;
      player.xp = gemStep.xp;
      player.xpNext = gemStep.xpNext;
      if (gemStep.gained > 0) {
        player.hp = Math.min(player.maxHp, player.hp + 20 * gemStep.gained);
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
  updateAr17Companions(dt);
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
    // AR-17 不加场景物件：只在她身边画当季套组的小特效、读故事时捧着的绘本
    drawWardrobeSeasonSparkles(ctx, player, now);
    drawStorybookProp(ctx, player, now);
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
// [[split exports]]
export {
  vision,
  W,
  H,
  clientToStage,
  playSfx,
  formatLocalDateKey,
  getPrevDateKey,
  getPast7DateKeys,
  getWeekCycleKey,
  deriveClockWindowAmbience,
  savePetState,
  gameMode,
  player,
  ROOM_THEMES,
  WINDOW_PERIOD_SPECS,
  WINDOW_SEASON_SPECS,
  INTIMACY_MILESTONES,
  setRoomTheme,
  spawnInteractVfx,
  survivorSessionCoins,
  survivorSessionKills,
  syncCrochetUIFn,
  syncPressedFlowerUIFn,
  BENTO_RECIPES,
  BENTO_RECIPE_BY_ID,
  ar12RandomFn,
  addCoins,
  setPlayerEmote,
  getAffectionXpMult,
  addAffectionXp,
  starTarget,
  enemies,
  floatingTexts,
  furnitureList,
  catchItems,
  syncPlacedFurniture,
  completeWish,
  drawerEl,
  drawerItemsEl,
  activeDrawerTab,
  dismissPolaroid,
  closeDrawer,
  setNapping,
  isTapEcho,
  bindHudTap,
  bindCardTap,
  spawnFoodDrop,
  switchMode,
  pomodoroRun,
  goodnightRun,
  kmCompactQuery,
  gcPreviewStickerEls,
  cardRun,
  pcFoodSlotEls,
  dyPageStickerEls,
  picnicRun,
  amDropEls,
  potteryRun,
  aromaRun,
  polaroidCardEl,
  pendingPhotoSnapTimer,
  polaroidAlbum,
  closeAlbumLightbox,
  renderAlbumWallInDrawer,
  applyTopicOptionReaction,
  rpsChoiceBtns,
  rpsChoicesEl,
  updateToyBtnLabel,
  isMemoryBookOpen,
  dismissMemoryBookCard,
  syncMemoryBookBadge
};
// [[split exports end]]
