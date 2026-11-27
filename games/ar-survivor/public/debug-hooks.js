// debug-hooks.js — 验证脚本用的 window.__ARn_DEBUG__ 钩子（AR-12 那份要改写 ar12RandomFn，留在 game.js）
// 由 game.js 原样搬出（2026-11-26，AR-COM5 拆分）：只有函数声明，和初始化时不依赖其他文件的常量 / 变量。
// 会改写共享 let 的函数、绑定事件的顶层语句都留在 game.js。[[split N]] 记号给 tests/split_check.mjs 拼回比对用，别删。
import {
  vision,
  W,
  H,
  formatLocalDateKey,
  deriveClockWindowAmbience,
  savePetState,
  gameMode,
  player,
  survivorSessionCoins,
  BENTO_RECIPES,
  getAffectionXpMult,
  enemies,
  furnitureList,
  drawerEl,
  switchMode,
  pomodoroRun,
  goodnightRun,
  picnicRun,
  potteryRun,
  aromaRun,
  polaroidCardEl,
  isMemoryBookOpen
} from './game.js?v=hd60';
import {
  petAudio
} from './audio.js?v=hd31';
import {
  getAr15CornerLayout,
  getAr16FloorLayout,
  getAr16WallLayout,
  getAromaTableDeskAnchor,
  getBentoDeskAnchor,
  getMailboxDeskAnchor,
  getMemoryWallLayout,
  getPicnicBasketDeskAnchor,
  getPicnicBlanketLayout,
  getPotteryShelfLayout,
  getWatercolorGalleryLayout,
  getWindowSillLayout
} from './sprites.js?v=hd60';
import {
  TERRARIUM_SPECS,
  getBotanicalBlessings,
  COLLAGE_FRAME_STYLES,
  COLLAGE_STICKER_SPECS,
  getCollageLuckBlessing,
  CROCHET_KNIT_SPECS,
  getCrochetWarmGuard,
  HOT_COCOA_BASES,
  HOT_COCOA_TOPPINGS,
  HOT_COCOA_BLENDS,
  getActiveHotCocoaBuff,
  PRESSED_BOOKMARK_IDS,
  PRESSED_BOOKMARK_SPECS,
  getPressedFlowerBlessing,
  CONSTELLATION_SPECS,
  getStarGuidanceBonus,
  WATERCOLOR_SUBJECTS,
  WATERCOLOR_PALETTES,
  getWatercolorFocusWard,
  MAILBOX_STAMP_SPECS,
  getMailboxHeartfeltBonus,
  getMailboxShiftXpMult,
  BENTO_FILLINGS,
  BENTO_SIDES,
  BENTO_SIDE_PAIRS,
  BENTO_BAG_MAX,
  BENTO_RESCUE_THRESHOLD,
  getBentoKitchenStats,
  getBentoLunchWard,
  MEMORY_WALL_MAX,
  MEMORY_PUZZLE_PIECES,
  getMemoryPuzzleBonus,
  getMemoryPuzzleCoinMult,
  getKittenLuckWard,
  getGreetingCardBlessing,
  getGreetingCardShiftXpMult,
  ar13Clock,
  PICNIC_FOODS,
  PICNIC_SPOTS,
  PICNIC_RULES,
  getPicnicStats,
  getPicnicShiftWard,
  getPicnicCoinMult,
  DIARY_STICKERS,
  DIARY_BASE_STICKERS,
  DIARY_MEMORY_STICKERS,
  DIARY_RULES,
  DIARY_COUNTER_KEYS,
  getJournalDayActivityTotal,
  getDiaryPageKeys,
  getDiaryStats,
  ar14Clock,
  POTTERY_SHAPES,
  POTTERY_GLAZES,
  POTTERY_RULES,
  getPotteryStats,
  getPotteryShiftWard,
  getPotteryCoinMult,
  getPotteryMagnetMult,
  getPotteryDamageMult,
  AROMA_SEASONS,
  AROMA_MOODS,
  AROMA_RULES,
  getAromaSeasonId,
  getActiveAroma,
  getAromaAffectionMult,
  getAromaStats,
  ar15Clock,
  STAR_CARDS,
  STAR_RULES,
  getActiveProjection,
  getStarStats,
  RAIN_SEGMENTS,
  RAIN_WEATHERS,
  RAIN_VOLUMES,
  RAIN_RULES,
  getRainWeather,
  rainRun,
  starRun,
  getRainStats,
  getRainCalmMult,
  ar16Clock,
  EMBROIDERY_PATTERNS,
  EMBROIDERY_THREADS,
  EMBROIDERY_RULES,
  embroideryRun,
  getEmbroideryStats,
  HEARTH_SEGMENTS,
  HEARTH_COLDNESS,
  HEARTH_MONTH_COLD,
  HEARTH_MONTH_TAGS,
  HEARTH_LEVELS,
  HEARTH_SNACKS,
  HEARTH_RULES,
  getHearthSegment,
  getHearthAutoLevel,
  getHearthCuddle,
  getHearthState,
  snackRun,
  getHearthStats,
  getHearthCuddleMult,
  ar17Clock,
  WARDROBE_OUTFITS,
  WARDROBE_RULES,
  wardrobeRun,
  getWardrobeStats,
  BEDTIME_STORIES,
  STORY_RULES,
  storyRun,
  isStoryBedtime,
  getStoryGlow,
  getStorybookStats
} from './data-room.js?v=hd60';
import {
  survivorRun,
  getActiveTeaShiftBuff,
  syncSurvivorSkillStrip
} from './mode-survivor.js?v=hd60';
import {
  windowAmbienceCardEl,
  setWindowAmbienceState,
  pomodoroCardEl,
  advancePomodoroTime,
  TEA_BASES,
  TEA_PASTRIES,
  AFTERNOON_TEA_RECIPES,
  JOURNAL_MOODS,
  teatimeCardEl,
  weeklyJournalCardEl,
  ensureJournalDayEntry,
  recordJournalActivity,
  computeWeeklyJournalSummary,
  claimWeeklyGiftBox,
  syncWeeklyJournalUI,
  syncTeatimeUI,
  serveAfternoonTeaSet,
  terrariumCardEl,
  goodnightCardEl,
  goodnightOverlayEl,
  syncTerrariumUI,
  careTerrariumPlant,
  harvestPlantDew,
  togglePlantDeskDisplay,
  syncGoodnightUI,
  selectGoodnightMinutes,
  selectGoodnightMelody,
  startGoodnightSession,
  settleGoodnightSession,
  advanceGoodnightTime
} from './room-ar04-06.js?v=hd60';
import {
  collageCardEl,
  cozyRadioCardEl,
  cozyRadioRun,
  selectCollageFrameStyle,
  toggleCollageSticker,
  moveCollageSticker,
  cycleCollageLayoutPreset,
  saveCollageKeepsake,
  syncCozyRadioUI,
  tuneCozyRadioChannel,
  advanceCozyRadioTime,
  crochetCardEl,
  hotCocoaCardEl,
  syncCrochetUI,
  claimDailyCrochetYarn,
  crochetOrUpgradeKnit,
  giftOrInteractCrochetKnit,
  toggleCrochetDeskDisplay,
  syncHotCocoaUI,
  serveHotCocoaBlend,
  pressedFlowerCardEl,
  telescopeCardEl,
  syncPressedFlowerUI,
  claimDailyPressedFlowers,
  pressOrUpgradeBookmark,
  caressPressedBookmark,
  togglePressedDeskDisplay,
  stargazeRun,
  startStargazeSession,
  tapStargazeStar,
  pickStargazeOption
} from './room-ar07-09.js?v=hd60';
import {
  WATERCOLOR_WASH_SPOTS,
  WATERCOLOR_STROKES_NEEDED,
  watercolorRun,
  isAr10CardOpen,
  applyShiftXpGain,
  applyWatercolorSelection,
  selectWatercolorSubject,
  selectWatercolorPalette,
  startWatercolorSession,
  tapWatercolorWell,
  tapWatercolorWash,
  finishWatercolorPainting,
  MAILBOX_TIER_SPECS,
  LETTER_MOOD_SPECS,
  mailboxRun,
  getMailboxTier,
  deriveWeeklyLetterMood,
  getLetterView,
  writeMailboxLetter,
  checkMailboxLetters,
  openMailboxLetter,
  chooseMailboxReply,
  chooseMailboxStamp,
  sendMailboxReply,
  setMailboxView,
  readMailboxAlbumEntry,
  bentoRun,
  isAr11CardOpen,
  pickBentoTray,
  placeBentoSlot,
  finishBento,
  packBento,
  shareBento,
  tryBentoRescueHeal,
  MEMORY_FALLBACK_ARTS,
  puzzleRun,
  getMemoryPuzzleSources,
  prepareMemorySource,
  selectMemorySource,
  startMemoryPuzzle,
  tapPuzzleSlot,
  swapPuzzleSlots,
  syncMemoryPuzzleUI
} from './room-ar10-11.js?v=hd60';
import {
  isAr12CardOpen,
  diaryRun,
  isAr13CardOpen,
  togglePicnicFood,
  pickPicnicSpot,
  helpPicnicPlan,
  packPicnicBasket,
  startPicnicOuting,
  sharePicnicFood,
  getPicnicMainState,
  handlePicnicMainAction,
  syncPicnicBasketUI,
  buildDiaryPage,
  openDiaryBookCard,
  gotoDiaryPage,
  flipDiaryPage,
  toggleDiarySticker,
  diaryHelperDecorate,
  syncDiaryBookUI
} from './room-ar12-13.js?v=hd60';
import {
  isAr14CardOpen,
  resetPotteryDraft,
  pickPotteryShape,
  spinPotteryWheel,
  glazePottery,
  pickPotteryGlaze,
  firePottery,
  finishPottery,
  getPotteryMainState,
  handlePotteryMainAction,
  potteryHelper,
  syncPotteryWheelUI,
  pickAromaMood,
  addAromaDrop,
  lightAroma,
  stopAroma,
  getAromaMainState,
  handleAromaMainAction,
  aromaHelper,
  refreshAr14Clock,
  syncAromaTableUI,
  openPotteryWheelCard,
  openAromaTableCard,
  isAr15CardOpen,
  pickStarCard,
  dialStarProjector,
  lightStarProjection,
  stopStarProjection,
  getStarMainState,
  handleStarMainAction,
  starHelper,
  syncStarProjectorUI,
  getRainMainState,
  startRainListening,
  stopRainListening,
  setRainVolume,
  toggleRainChime,
  ringRainChime,
  handleRainMainAction,
  rainHelper,
  syncRainCornerUI,
  refreshAr15Clock,
  openStarProjectorCard,
  openRainCornerCard
} from './room-ar14-15.js?v=hd60';
import {
  isAr16CardOpen,
  pickEmbroideryPattern,
  pickEmbroideryThread,
  stitchEmbroidery,
  finishEmbroidery,
  getEmbroideryMainState,
  handleEmbroideryMainAction,
  embroideryHelper,
  kindleHearth,
  pickHearthSnack,
  flipHearthSnack,
  shareHearthSnack,
  getHearthMainState,
  handleHearthMainAction,
  hearthHelper,
  syncEmbroideryHoopUI,
  syncHearthCornerUI,
  refreshAr16Clock,
  openEmbroideryCard,
  openHearthCard,
  updateAr16FloorBottom,
  isAr17CardOpen,
  pickWardrobeOutfit,
  wearWardrobeOutfit,
  takeOffWardrobe,
  getWardrobeMainState,
  handleWardrobeMainAction,
  wardrobeHelper,
  pickStory,
  turnStoryPage,
  finishStory,
  getStoryMainState,
  handleStoryMainAction,
  storyHelper,
  awardStoryGoodnight,
  syncWardrobeUI,
  syncStorybookUI,
  refreshAr17Clock,
  openWardrobeCard,
  openStorybookCard
} from './room-ar16-17.js?v=hd60';
import {
  topicCardEl
} from './pet-chat.js?v=hd60';

// [[split 14]]

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
// [[split 18]]

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
        seasonWardrobe: isAr17CardOpen('wardrobe'),
        bedtimeStorybook: isAr17CardOpen('storybook'),
        memoryBook: isMemoryBookOpen(),
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
// [[split 21]]

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
// [[split 24]]

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
// [[split 27]]

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
// [[split 29]]

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
// [[split 32]]

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
// [[split 40]]

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
// [[split 44]]

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
// [[split 46]]

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
// [[split 48]]

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
// [[split 50]]

window.__AR17_DEBUG__ = {
  getSpecs() {
    return JSON.parse(
      JSON.stringify({
        outfits: WARDROBE_OUTFITS,
        wardrobeRules: WARDROBE_RULES,
        stories: BEDTIME_STORIES,
        storyRules: STORY_RULES
      })
    );
  },
  // 可注入时钟：传毫秒或本地时间字符串固定“现在”（当季套组 / 睡前时间 / 晚安余温 / 每日奖励都跟着走）
  setClock(value) {
    const ms = typeof value === 'number' ? value : new Date(value).getTime();
    if (!Number.isFinite(ms)) return { ok: false, reason: 'invalid_clock' };
    ar17Clock.fixedMs = ms;
    ar17Clock.offsetMs = 0;
    refreshAr17Clock();
    syncWardrobeUI();
    syncStorybookUI();
    return { ok: true, now: ms, seasonId: getAromaSeasonId(new Date(ms)), bedtime: isStoryBedtime(new Date(ms)) };
  },
  advanceClock(ms) {
    const step = Math.max(0, Number(ms) || 0);
    if (ar17Clock.fixedMs !== null) ar17Clock.fixedMs += step;
    else ar17Clock.offsetMs += step;
    refreshAr17Clock();
    syncWardrobeUI();
    syncStorybookUI();
    return { ok: true, now: ar17Clock.now(), glow: getStoryGlow() };
  },
  useRealClock() {
    ar17Clock.fixedMs = null;
    ar17Clock.offsetMs = 0;
    refreshAr17Clock();
    syncWardrobeUI();
    syncStorybookUI();
    return { ok: true, now: ar17Clock.now() };
  },
  openWardrobe() {
    return openWardrobeCard();
  },
  openStorybook() {
    return openStorybookCard();
  },
  pickOutfit(id) {
    return pickWardrobeOutfit(id);
  },
  wear(id) {
    return wearWardrobeOutfit(id);
  },
  takeOff() {
    return takeOffWardrobe();
  },
  wardrobeMain() {
    return handleWardrobeMainAction();
  },
  wardrobeHelper() {
    return wardrobeHelper();
  },
  pickStory(id) {
    return pickStory(id);
  },
  turnPage() {
    return turnStoryPage();
  },
  finishStory() {
    return finishStory();
  },
  storyMain() {
    return handleStoryMainAction();
  },
  storyHelper() {
    return storyHelper();
  },
  // 测试用：按可注入时钟直接走一遍“晚安伴眠结算时的故事联动”（不经过八音盒，不改好梦章数值）
  awardGoodnight() {
    return awardStoryGoodnight();
  },
  resetRunsForTest() {
    wardrobeRun.previewId = '';
    wardrobeRun.lastResult = null;
    storyRun.storyId = '';
    storyRun.page = 0;
    storyRun.phase = 'pick';
    storyRun.lastResult = null;
    syncWardrobeUI();
    syncStorybookUI();
    return { ok: true };
  },
  getState(customDateIso = '') {
    const now = ar17Clock.now();
    const refDate = customDateIso ? new Date(customDateIso) : new Date(now);
    return {
      gameMode,
      now,
      clockFixed: ar17Clock.fixedMs !== null,
      coins: player.coins,
      level: player.level,
      xp: player.xp,
      emote: player.emote,
      equipped: JSON.parse(JSON.stringify(player.equipped || {})),
      seasonWardrobe: JSON.parse(JSON.stringify(player.seasonWardrobe)),
      wardrobeStats: getWardrobeStats(new Date(now)),
      wardrobeRun: JSON.parse(JSON.stringify(wardrobeRun)),
      wardrobeVisual: JSON.parse(JSON.stringify(player.wardrobeVisual)),
      wardrobeMain: getWardrobeMainState(),
      bedtimeStorybook: JSON.parse(JSON.stringify(player.bedtimeStorybook)),
      storyStats: getStorybookStats(new Date(now)),
      storyRun: JSON.parse(JSON.stringify(storyRun)),
      storyVisual: JSON.parse(JSON.stringify(player.storyVisual)),
      storyMain: getStoryMainState(),
      journalSummary: computeWeeklyJournalSummary(refDate),
      openPanels: window.__AR5_DEBUG__.getState(customDateIso).openPanels
    };
  }
};
// [[split end]]
