import { EXP_LEVELS, getExpLevelDef } from "../expedition_defs.js";
import {
  applyQuickExpeditionDuration,
  applyQuickExpeditionReward,
  ensureExpeditionDungeonTiers,
  expeditionTypeMul,
  getExpeditionSeasonBlurb,
  getMonTypesForExpedition,
  pickExpeditionDungeons,
  resolveExpeditionSeasonLabel,
  resolveSeasonId,
} from "../systems/expedition.js";
import { expeditionNatureTimeMul, natureTrainExpMul, expeditionDailyProgress, markExpeditionDailyClaimed, localDateStr } from "../systems/gameplay_fun.js";
import {
  legacyBreedTimeMul,
  legacyHatchAffectionAdd,
  legacyExpeditionRewardMul,
  legacyExpeditionTimeMul,
} from "../systems/rebirth.js";
import {
  AMBER_IMPRINT_MAX_LEVEL,
  AMBER_IV_REFINE_COST,
  AMBER_REVIVAL_DAILY_GRANT,
  assignBakeryWorker,
  autoStaffBakery,
  BAKERY_BUFF_DEFS,
  BAKERY_CASE_CAP,
  BAKERY_MAX_WORKERS,
  BAKERY_RECIPE_DEFS,
  BAKERY_RES_ZH,
  BAKERY_RUSH_COIN_COST,
  BAKERY_STATIONS,
  boxBakeryDesserts,
  computeBakeryAura,
  dismissAllBakers,
  enjoyBakeryDessert,
  ensureBakeryState,
  evaluateBakeryWorker,
  getBakeryBatchEtaSec,
  getBakeryBatchQuality,
  getBakeryBuffDef,
  getBakeryRecipeDef,
  getBakeryRecipeWork,
  getBakeryRushFreeLeft,
  getBakeryStationDef,
  getBakeryStationSpeeds,
  getIdleBakeryCandidates,
  getIdleBalloonCandidates,
  isBakeryRecipeUnlocked,
  performBakeryRush,
  selectBakeryRecipe,
  assignParkOperator,
  autoStaffCloudPark,
  AWAY_ACTIVITY_DEFS,
  computeCloudParkAura,
  dismissParkOperators,
  ensureCloudParkState,
  evaluateParkOperator,
  exchangeParkTickets,
  getIdleParkCandidates,
  getIdleStargazeCandidates,
  getParkEventDef,
  getParkRideDef,
  getParkRideSpeeds,
  getParkRoundVisitors,
  getParkSatisfactionTier,
  getParkShowFreeLeft,
  isParkRideUnlocked,
  launchParkEvent,
  performParkExtraShow,
  PARK_BUFF_MAX_SEC,
  PARK_EVENT_DEFS,
  PARK_EVENT_SAT_GAIN,
  PARK_GIFT_COST,
  PARK_GIFT_REWARDS,
  PARK_RIDES,
  PARK_SAT_DECAY_PER_HOUR,
  PARK_SAT_MAX,
  PARK_SAT_PROD_PER_POINT,
  PARK_SHOW_COIN_COST,
  PARK_TICKET_CAP,
  autoFillDreamers,
  computeDreamLibraryAura,
  DREAM_BOOK_DEFS,
  DREAM_CHAPTERS_PER_BOOK,
  DREAM_PILLOW_COUNT,
  DREAM_STORY_COIN_COST,
  DREAM_STORY_INK,
  dropAwayMonIds,
  ensureDreamLibraryState,
  evaluateDreamWriter,
  excludeAwayMons,
  getAwayActivityMap,
  getAwayActivityOfMon,
  getAwayMonIds,
  getDreamBookDef,
  getDreamChapterNeed,
  getDreamInkRatePerMin,
  getDreamPageAuthors,
  getDreamStoryFreeLeft,
  getIdleDreamCandidates,
  getIdleFishingCandidates,
  isDreamBookComplete,
  isDreamBookUnlocked,
  performDreamStory,
  selectDreamBook,
  toggleDreamer,
  wakeAllDreamers,
  autoFillHotSpring,
  computeHotSpringAura,
  ensureHotSpringState,
  evaluateHotSpringSoaker,
  getHotSpringPoolDef,
  getHotSpringSoakingMonIds,
  getHotSpringStateDef,
  getHotSpringTowelFreeLeft,
  getIdleHotSpringCandidates,
  getPostMessengerMonIds,
  HOT_SPRING_POOL_DEFS,
  HOT_SPRING_ROUND_SEC,
  HOT_SPRING_SEATS_PER_POOL,
  HOT_SPRING_STATE_DEFS,
  HOT_SPRING_STATE_MAX_SEC,
  HOT_SPRING_TOWEL_COIN_COST,
  isHotSpringPoolUnlocked,
  performHotSpringTowel,
  recallHotSpring,
  toggleHotSpringSoak,
  assembleTreasureMap,
  autoExploreTreasureIsland,
  autoPickTreasureVoyageCrew,
  computeTreasureTileReward,
  computeTreasureVoyageAura,
  ensureTreasureVoyageState,
  evaluateTreasureVoyageCrew,
  exploreTreasureTile,
  getIdleTreasureVoyageCandidates,
  getTreasureFrontier,
  getTreasureGullFreeLeft,
  getTreasureIslandDef,
  getTreasureKeepsakeDef,
  getTreasureVoyageCrewMonIds,
  isTreasureIslandUnlocked,
  performTreasureGullAssist,
  returnFromTreasureVoyage,
  startTreasureVoyage,
  toggleTreasureVoyageCrewMon,
  TREASURE_FRAGMENT_SOURCES,
  TREASURE_GULL_COIN_COST,
  TREASURE_ISLAND_DEFS,
  TREASURE_KEEPSAKE_DEFS,
  TREASURE_MAP_FRAGMENTS_PER_MAP,
  TREASURE_MAP_MAX_MAPS,
  TREASURE_NAVIGATOR_TYPES,
  TREASURE_PATHFINDER_TYPES,
  TREASURE_RES_ZH,
  TREASURE_SEEKER_TYPES,
  TREASURE_TILE_DEFS,
  TREASURE_VOYAGE_MAX_CREW,
  autoFillSkyIslandCrew,
  canStartSkyIslandBuild,
  cancelSkyIslandBuild,
  computeSkyIslandAura,
  describeSkyIslandFacilityEffect,
  ensureSkyIslandState,
  evaluateSkyIslandCrew,
  getIdleSkyIslandCandidates,
  getSkyIslandBuildSec,
  getSkyIslandCrewMonIds,
  getSkyIslandFacilityDef,
  getSkyIslandRallyFreeLeft,
  performSkyIslandRally,
  recallSkyIslandCrew,
  SKY_ISLAND_BUILD_AFFINE_TYPES,
  SKY_ISLAND_FACILITY_DEFS,
  SKY_ISLAND_MAX_CREW,
  SKY_ISLAND_MAX_LEVEL,
  SKY_ISLAND_RALLY_COIN_COST,
  SKY_ISLAND_RES_ZH,
  SKY_ISLAND_RESONANCE_TIERS,
  startSkyIslandBuild,
  toggleSkyIslandCrewMon,
  autoFillNightObservatory,
  awakenNocturnalForm,
  canAwakenNocturnalForm,
  computeNightObservatoryAura,
  ensureNightObservatoryState,
  evaluateNightObservers,
  getIdleNightObservatoryCandidates,
  getMonNocturnalFormBonus,
  getNightObservatoryPhase,
  getNightObservatoryStationedMonIds,
  getNightPatrolFreeLeft,
  getNocturnalCreatureDef,
  getNocturnalFormDefForMon,
  NIGHT_OBS_AFFINE_TYPES,
  NIGHT_OBS_CYCLE_SEC,
  NIGHT_OBS_FORM_COST,
  NIGHT_OBS_FORM_TALLY_REQ,
  NIGHT_OBS_MAX_STATION,
  NIGHT_OBS_PATROL_COIN_COST,
  NOCTURNAL_CREATURE_DEFS,
  performLanternPatrol,
  recallNightObservatory,
  toggleNightObservatoryMon,
  autoDispatchAllEcoSandbox,
  autoDispatchAllWishDock,
  autoFillStarCampSquad,
  autoPickWishDockCrew,
  breezeCompleteWishDockRoute,
  canClaimDailyDriftBottles,
  canForgeOceanBadge,
  claimAllWishDockRoutes,
  claimDailyDriftBottles,
  claimWishDockRoute,
  computeWishDockAura,
  dispatchWishDockRoute,
  ensureWishDockState,
  evaluateWishDockCrew,
  forgeOceanBadge,
  getIdleWishDockCandidates,
  getOceanBadgeNextCost,
  getOceanTreasureDef,
  getWishDockAwayMonIds,
  getWishDockBreezeLeft,
  getWishDockRouteDef,
  getWishReplyLetter,
  OCEAN_BADGE_DEFS,
  OCEAN_TREASURE_DEFS,
  openDriftBottles,
  recallWishDockRoute,
  toggleWishDockStagedMon,
  WISH_DOCK_BADGE_MAX_LEVEL,
  WISH_DOCK_BOTTLE_COIN,
  WISH_DOCK_BREEZE_COIN_COST,
  WISH_DOCK_DAILY_FREE_BOTTLES,
  WISH_DOCK_OPEN_BATCH,
  WISH_DOCK_ROUTES,
  autoPickEcoSandboxSquad,
  awakenOrUpgradePrimalImprint,
  BOUTIQUE_ACCESSORY_DEFS,
  BOUTIQUE_SHEEN_STYLES,
  CAMP_RECIPE_DEFS,
  canAffordCampRecipe,
  canAwakenOrUpgradeImprint,
  canClaimDailyAncientAmber,
  canClaimDailyStarSand,
  cancelEcoSandboxZone,
  canCraftOrUpgradeAccessory,
  canRefinePartnerIvWithAmber,
  canSynthesizeAncientAmber,
  canSynthesizeStarSand,
  claimAllEcoSandboxZones,
  claimDailyAncientAmber,
  claimDailyStarSand,
  claimEcoSandboxZone,
  clearStarCampSquad,
  computeAmberRevivalAura,
  computeEcoRelicAura,
  computeStarBoutiqueAura,
  computeStarCampAura,
  cookCampRecipe,
  craftOrUpgradeBoutiqueAccessory,
  dispatchEcoSandboxZone,
  ECO_SANDBOX_ZONES,
  ensureAmberRevivalState,
  ensureEcoSandboxState,
  ensureStarBoutiqueState,
  ensureStarCampState,
  equipBoutiqueAccessory,
  equipPrimalImprint,
  evaluateEcoSquadAffinity,
  getAccessoryNextCost,
  getAvailableStarCampCandidates,
  getCampUnavailableMonIds,
  getEcoSandboxFreeSurveysLeft,
  getEcoZoneDef,
  getIdleEcoSandboxCandidates,
  getMonBoutiqueBonus,
  getMonPrimalImprintBonus,
  getNonSandboxBusyIds,
  getPrimalImprintNextCost,
  getRecipeMasteryInfo,
  getStarCampEnsembleLeft,
  instantCompleteEcoSandboxZone,
  performStarCampEnsemble,
  PRIMAL_IMPRINT_DEFS,
  refinePartnerIvWithAmber,
  seasonRelicLines,
  STAR_BOUTIQUE_DAILY_SAND_GRANT,
  STAR_BOUTIQUE_MAX_LEVEL,
  STAR_CAMP_DAILY_ENSEMBLE_LIMIT,
  STAR_CAMP_FORAGE_CYCLE_SEC,
  STAR_CAMP_MAX_LEVEL,
  STAR_CAMP_MAX_SLOTS,
  synthesizeAncientAmber,
  synthesizeStarSand,
  toggleEcoSandboxStagedMon,
  toggleStarCampCompanion,
  unequipBoutiqueAccessory,
  unequipBoutiqueStyle,
  unequipMonPrimalImprints,
  unequipPrimalImprint,
  unlockOrApplyBoutiqueSheen,
} from "../systems/collection_fun.js";
import {
  autoDispatchBalloons,
  BALLOON_BADGE_TIERS,
  BALLOON_COUNT,
  BALLOON_ISLES,
  BALLOON_MATCH_EXTRA_CHANCE,
  BALLOON_RARITY,
  BALLOON_RES_ZH,
  BALLOON_SEATS,
  BALLOON_TICKET_COIN_COST,
  claimAllBalloons,
  claimBalloon,
  computeBalloonTravelBonus,
  dispatchBalloon,
  ensureBalloonTravelState,
  evaluateBalloonPassenger,
  getBalloonIsleDef,
  getBalloonIsleRotation,
  getBalloonIsleSouvenirs,
  getBalloonSouvenirDef,
  getBalloonSouvenirOdds,
  getBalloonTicketFreeLeft,
  recallBalloon,
  useBalloonTicket,
  autoDispatchStargazeCamps,
  claimAllStargazeSites,
  claimStargazeSite,
  collectAllReturnedPartners,
  computeStargazeCampBonus,
  dispatchStargazeCamp,
  ensureStargazeCampState,
  evaluateStargazeCamper,
  getReturnedPartnersSummary,
  getStargazeEntryDef,
  getStargazeFireFreeLeft,
  getStargazeShowerDef,
  getStargazeSiteDef,
  getStargazeSkyRotation,
  getStargazeStarOdds,
  recallStargazeCamp,
  STARGAZE_BADGE_TIERS,
  STARGAZE_CONSTELLATIONS,
  STARGAZE_FIRE_COIN_COST,
  STARGAZE_MATCH_EXTRA_CHANCE,
  STARGAZE_RES_ZH,
  STARGAZE_SEATS,
  STARGAZE_SHOWERS,
  STARGAZE_SITE_COUNT,
  STARGAZE_SITES,
  useStargazeCampfire,
  autoPickFishingAnglers,
  claimFishingCreel,
  computeFishingClubBonus,
  ensureFishingClubState,
  evaluateFishingAngler,
  FISHING_ANGLER_MAX,
  FISHING_CAST_SEC,
  FISHING_CHUM_COIN_COST,
  FISHING_CREEL_CAP,
  FISHING_FISH_DEFS,
  FISHING_RARITY,
  FISHING_RES_ZH,
  FISHING_SECTIONS,
  FISHING_TROPHY_TIERS,
  getFishingCatchOdds,
  getFishingChumFreeLeft,
  getFishingFishDef,
  getFishingSection,
  getFishingSectionFish,
  performFishingChum,
  recallFishingAnglers,
  toggleFishingAngler,
  autoDispatchPostMessengers,
  claimAllPostTrips,
  claimPostTrip,
  computePostOfficeBonus,
  dispatchPostMessenger,
  ensurePostOfficeState,
  evaluatePostMessenger,
  getIdlePostMessengerCandidates,
  getPostExpressFreeLeft,
  getPostmarkTier,
  getPostmarkTierName,
  getPostRouteDef,
  getPostRoutePath,
  isPostRouteUnlocked,
  isPostTripArrived,
  performPostExpress,
  POST_EXPRESS_COIN_COST,
  POST_LETTER_CAP,
  POST_LETTER_REFILL_SEC,
  POST_MAX_MESSENGERS,
  POST_RES_ZH,
  POST_ROUTES,
  POSTMARK_TIERS,
  recallPostMessenger,
  autofillBandLineup,
  autofillBandPattern,
  BAND_BEAT_ZH,
  BAND_DAILY_MAX_CONCERTS,
  BAND_PARTS,
  BAND_PATTERN_LEN,
  BAND_TIERS,
  BAND_TOUR_STOPS,
  BAND_TROPHY_MAX_TIER,
  computeBandTourBonus,
  ensureBandConcertState,
  evaluateBandEnsemble,
  getBandConcertCost,
  getBandPartDef,
  getBandStopDef,
  getBandTierName,
  getBandUnavailableMonIds,
  isBandStopUnlocked,
  performBandConcert,
  selectBandStop,
  setBandBeat,
  setBandPartMember,
  autoHostMigrants,
  computeSeasonMigrationBonus,
  ensureSeasonMigrationState,
  evaluateMigrationSpeed,
  getMigrantBefriendChance,
  getMigrantDef,
  getMigrantsForSeason,
  getMigrationFeedFreeLeft,
  getMigrationMedalTierName,
  getMigrationSeason,
  getMigrationSeasonDef,
  MIGRANT_DEFS,
  MIGRATION_FEED_COIN_COST,
  MIGRATION_MEDAL_MAX_TIER,
  MIGRATION_MEDAL_TIERS,
  MIGRATION_RECORD_SEC,
  MIGRATION_SEASONS,
  performMigrationFeed,
  syncMigrationSeason,
  toggleMigrantHost,
  ACROBAT_BEAT_ZH,
  ACROBAT_DAILY_MAX_SHOWS,
  ACROBAT_EXTRA_SHOW_COIN,
  ACROBAT_LANTERN_LIGHT_COST,
  ACROBAT_ROUTINE_SIZE,
  ACROBAT_STYLE_ZH,
  ACROBAT_THEMES,
  ACROBAT_TIERS,
  ACROBAT_TROPHY_MAX_TIER,
  autofillAcrobatRoutine,
  computeAcrobatTrophyBonus,
  ensureAcrobatShowState,
  evaluateAcrobatRoutine,
  getAcrobatMovesForMon,
  getAcrobatShowCost,
  getAcrobatTheme,
  getAcrobatTierName,
  getAcrobatUnavailableMonIds,
  performAcrobatShow,
  setAcrobatRoutineMove,
  shiftAcrobatSlot,
  toggleAcrobatPerformer,
  autofillChampionLeagueSquad,
  CHAMPION_LEAGUE_MAX_TIER,
  CHAMPION_LEAGUE_SQUAD_SIZE,
  CHAMPION_LEAGUE_STAGES,
  computeChampionLeagueBonus,
  computeEcoTriCrestBonus,
  computeStarCorridorBonus,
  ECO_TRI_CREST_MAX_TIER,
  ensureChampionLeagueState,
  estimateLeagueStagePower,
  evaluateLeagueSquadSynergy,
  resetChampionLeagueProgress,
  simulateLeagueGauntlet,
  STAR_CORRIDOR_MAX_TIER,
  toggleChampionLeagueSquadMon,
} from "../systems/pve_tower.js";
import {
  applyMintTuningToMon,
  describeMintTuning,
  formatMonNatureWithTuning,
  getMonCurrentStats as getMonCurrentStatsFallback,
  getNatureInfo,
  MINT_TUNING_PRESETS,
  monPower as monPowerFallback,
  normalizeMintTuning,
  recommendMintTuningForMon,
  STAT_ZH,
  TUNABLE_STATS,
} from "../mons.js";
import {
  computeBreedingPreview,
  ensureBreedingState,
  ivGradeTag,
  normalizeAbilityLock,
  resolveParentAbilityId,
  sumMonIv,
} from "../systems/breeding.js";
import { getAbilityInfo, monPassive } from "../abilities.js";
import { beastZone, ZONE_IDS, ZONE_LABELS } from "../beast_defs.js";
import { renderFunctionsStageHtml, setHtmlPreservingStage } from "../render/tab_stages.js";
import { renderBuildingSvg, renderResSvg, renderUiIcon } from "../render/rpg_svg_icons.js";

export function createRenderFunctions({
  elFunctionsTraining,
  ui,
  TYPE_ZH,
  getBeastDataByDex,
  getSpeciesByPid,
  getMonCurrentStats,
  computeTechEffects,
  clamp,
  escapeHtml,
  fmtDuration,
  expNeedForLevel0,
  monPower,
  renderBeastIcon,
  markFunctionsDirty,
  markMonListDirty,
  addLog,
  render,
  getState,
}) {
  const RES_LABEL_ZH = {
    tuningMint: "心性调律薄荷",
    evolutionStone: "灵晶石",
    megaStone: "觉醒石",
    rareCandy: "跃级糖丸",
    expCandy: "历练糖丸",
    catnip: "灵果",
    wood: "灵木",
    minerals: "灵晶碎片",
    futurecoin: "未来币",
    picnicHerb: "野餐香草",
    starBerry: "星露灵果",
    campToken: "星营徽章",
    shinyStarSand: "闪光祈愿星砂",
    ancientGeneAmber: "远古基因琥珀",
    corridorStarMedals: "星轨回廊勋章",
    driftBottle: "星海漂流瓶",
    fireflyLantern: "萤火灯笼",
    mapFragment: "藏宝图残片",
  };

  function ml14InkView(dl) {
    const b = dl?.books?.[dl?.bookId];
    const need = getDreamChapterNeed(dl?.bookId, b?.written || 0);
    const ink = Math.max(0, Number(b?.ink) || 0);
    const pct = Math.max(0, Math.min(100, Math.floor((ink / Math.max(1, need)) * 100)));
    return { pct, need, ink, text: `灵感 ${Math.floor(ink)}/${need}（${pct}%）` };
  }

  function ml14RateText(state, dl) {
    const perMin = getDreamInkRatePerMin(state, { getBeastDataByDex });
    if (!(perMin > 0)) return "梦枕空着 · 请伙伴入梦才会产出灵感";
    const v = ml14InkView(dl);
    const remSec = Math.max(1, Math.ceil(((v.need - v.ink) / perMin) * 60));
    return `每分钟约 ${perMin.toFixed(1)} 灵感 · 约 ${fmtDuration(remSec)} 后写完这一章`;
  }

  /** ML-14: live patch of the dream-library ink bar between full re-renders (0px scroll drift). */
  function patchDreamLibraryLiveDom(state) {
    const dl = state?.meta?.dreamLibrary;
    if (!elFunctionsTraining || !dl || !dl.books) return;
    const v = ml14InkView(dl);
    const fill = elFunctionsTraining.querySelector("[data-dream-ink-fill]");
    if (fill instanceof HTMLElement) fill.style.width = `${v.pct}%`;
    const txt = elFunctionsTraining.querySelector("[data-dream-ink-txt]");
    if (txt && txt.textContent !== v.text) txt.textContent = v.text;
    const rate = elFunctionsTraining.querySelector("[data-dream-rate-txt]");
    const rateTxt = ml14RateText(state, dl);
    if (rate && rate.textContent !== rateTxt) rate.textContent = rateTxt;
  }

  function ml14CastView(fc) {
    const anglers = Array.isArray(fc?.anglerIds) ? fc.anglerIds.length : 0;
    if (!anglers) return { pct: 0, text: "钓位空着 · 请钓手下竿才会开始垂钓" };
    if ((fc.creel?.length || 0) >= FISHING_CREEL_CAP) return { pct: 100, text: `鱼篓满了（${FISHING_CREEL_CAP} 条）· 收鱼篓后钓手才会继续抛竿` };
    const carry = Math.max(0, Number(fc.castCarrySec) || 0);
    const pct = Math.max(2, Math.min(99, Math.floor((carry / FISHING_CAST_SEC) * 100)));
    return { pct, text: `下一竿 ${pct}% · 约 ${fmtDuration(Math.max(1, Math.ceil(FISHING_CAST_SEC - carry)))} 后 ${anglers} 位钓手同时抛竿` };
  }

  function ml14RotateText(section) {
    const min = Math.max(0, Math.floor((section?.msUntilNext || 0) / 60000));
    return `约 ${Math.floor(min / 60)} 小时 ${min % 60} 分后轮换为「${section?.next?.name || ""}」`;
  }

  /** ML-14: live patch of the fishing cast bar and the section-rotation countdown (0px scroll drift). */
  function patchFishingClubLiveDom(state) {
    const fc = state?.meta?.fishingClub;
    if (!elFunctionsTraining || !fc || !Array.isArray(fc.anglerIds)) return;
    const v = ml14CastView(fc);
    const fill = elFunctionsTraining.querySelector("[data-fish-cast-fill]");
    if (fill instanceof HTMLElement) fill.style.width = `${v.pct}%`;
    const txt = elFunctionsTraining.querySelector("[data-fish-cast-txt]");
    if (txt && txt.textContent !== v.text) txt.textContent = v.text;
    const rot = elFunctionsTraining.querySelector("[data-fish-rotate-txt]");
    const section = getFishingSection();
    const rotTxt = ml14RotateText(section);
    if (rot && rot.textContent !== rotTxt) rot.textContent = rotTxt;
    const shown = elFunctionsTraining.querySelector("[data-fish-section-now]");
    if (shown && shown.getAttribute("data-fish-section-now") !== section.id) {
      ui.functionsDirty = true;
    }
  }

  function ml16RideView(pk, ride) {
    const need = Math.max(1, ride.roundMin * 60);
    const work = Math.max(0, Math.min(need, Number(pk?.rides?.[ride.id]?.work) || 0));
    return { pct: Math.max(0, Math.min(100, Math.floor((work / need) * 100))), work, need };
  }

  function ml16RideText(state, pk, ride) {
    const v = ml16RideView(pk, ride);
    const speed = getParkRideSpeeds(state, { getBeastDataByDex })[ride.id] || 0;
    const rounds = Math.max(0, Math.floor(Number(pk?.rides?.[ride.id]?.rounds) || 0));
    if (!(speed > 0)) return `第 ${rounds + 1} 轮 · ${v.pct}% · 没有操作员`;
    return `第 ${rounds + 1} 轮 · ${v.pct}% · 约 ${fmtDuration(Math.max(1, Math.ceil((v.need - v.work) / speed)))} 后转完`;
  }

  function ml16SatEffectText(sat) {
    const tier = getParkSatisfactionTier(sat);
    const prod = Math.round(Math.floor(Math.max(0, Number(sat) || 0)) * PARK_SAT_PROD_PER_POINT * 1000) / 10;
    return `全产 +${prod}% · 每轮游客 +${tier.bonusVisitors} · 活动时长 ×${tier.eventMul}`;
  }

  /** ML-16: live patch of the park satisfaction meter, ticket booth, ride progress bars and event countdowns (0px scroll drift). */
  function patchCloudParkLiveDom(state) {
    const pk = state?.meta?.cloudPark;
    if (!elFunctionsTraining || !pk || !pk.rides || !pk.buffs) return;
    const sat = Math.max(0, Math.min(PARK_SAT_MAX, Number(pk.satisfaction) || 0));
    const satNum = elFunctionsTraining.querySelector("[data-park-sat-num]");
    if (satNum && satNum.textContent !== String(Math.floor(sat))) {
      // tier boundaries change visitor counts / event lengths → full re-render; plain decay → text patch
      const shown = Number(satNum.textContent) || 0;
      if (getParkSatisfactionTier(shown).name !== getParkSatisfactionTier(sat).name) {
        ui.functionsDirty = true;
        return;
      }
      satNum.textContent = String(Math.floor(sat));
    }
    const satTag = elFunctionsTraining.querySelector("[data-park-sat-tag]");
    const satTagTxt = `满意度 ${Math.floor(sat)}`;
    if (satTag && satTag.textContent !== satTagTxt) satTag.textContent = satTagTxt;
    const satFill = elFunctionsTraining.querySelector("[data-park-sat-fill]");
    if (satFill instanceof HTMLElement) satFill.style.width = `${Math.floor(sat)}%`;
    const satEff = elFunctionsTraining.querySelector("[data-park-sat-effect]");
    const satEffTxt = ml16SatEffectText(sat);
    if (satEff && satEff.textContent !== satEffTxt) satEff.textContent = satEffTxt;
    for (const r of PARK_RIDES) {
      const fill = elFunctionsTraining.querySelector(`[data-park-fill="${r.id}"]`);
      if (fill instanceof HTMLElement) fill.style.width = `${ml16RideView(pk, r).pct}%`;
      const txt = elFunctionsTraining.querySelector(`[data-park-txt="${r.id}"]`);
      const t = ml16RideText(state, pk, r);
      if (txt && txt.textContent !== t) txt.textContent = t;
    }
    for (const e of PARK_EVENT_DEFS) {
      const el = elFunctionsTraining.querySelector(`[data-park-buff-rem="${e.id}"]`);
      if (!el) continue;
      const rem = Math.max(0, Number(pk.buffs[e.id]) || 0);
      const t = rem > 0 ? `剩 ${fmtDuration(Math.ceil(rem))}` : "未生效";
      if (el.textContent !== t) el.textContent = t;
    }
  }

  function ml16CampView(trip) {
    const dur = Math.max(1, Number(trip?.durationSec) || 1);
    const el = Math.max(0, Math.min(dur, Number(trip?.elapsedSec) || 0));
    const pct = Math.max(2, Math.min(99, Math.floor((el / dur) * 100)));
    return { pct, text: `夜营 ${pct}% · 约 ${fmtDuration(Math.max(1, Math.ceil(dur - el)))} 后天亮归营` };
  }

  function ml16SkyText(sky) {
    const min = Math.max(0, Math.floor((sky?.msUntilNext || 0) / 60000));
    return `约 ${Math.floor(min / 60)} 小时 ${min % 60} 分后「${sky?.leaving?.name || ""}」落下、「${sky?.incoming?.name || ""}」升起`;
  }

  /** ML-16: live patch of the camp progress bars and the sky-rotation countdown (0px scroll drift). */
  function patchStargazeLiveDom(state) {
    const sg = state?.meta?.stargazeCamp;
    if (!elFunctionsTraining || !sg || !Array.isArray(sg.sites)) return;
    const sky = getStargazeSkyRotation();
    const skyEl = elFunctionsTraining.querySelector("[data-stargaze-rotation]");
    if (skyEl && (Number(skyEl.getAttribute("data-stargaze-rotation")) !== sky.index || skyEl.getAttribute("data-stargaze-shower") !== sky.shower.id)) {
      ui.functionsDirty = true;
      return;
    }
    const rotEl = elFunctionsTraining.querySelector("[data-stargaze-rotate-txt]");
    const rotTxt = ml16SkyText(sky);
    if (rotEl && rotEl.textContent !== rotTxt) rotEl.textContent = rotTxt;
    sg.sites.forEach((x, i) => {
      const card = elFunctionsTraining.querySelector(`[data-stargaze-site="${i}"]`);
      const phase = x?.trip ? x.trip.phase : "idle";
      if (card && card.getAttribute("data-stargaze-phase") !== phase) {
        ui.functionsDirty = true;
        return;
      }
      if (phase !== "camping") return;
      const v = ml16CampView(x.trip);
      const fill = elFunctionsTraining.querySelector(`[data-stargaze-fill="${i}"]`);
      if (fill instanceof HTMLElement) fill.style.width = `${v.pct}%`;
      const txt = elFunctionsTraining.querySelector(`[data-stargaze-txt="${i}"]`);
      if (txt && txt.textContent !== v.text) txt.textContent = v.text;
    });
  }

  function ml15StageView(state, bk) {
    const recipe = getBakeryRecipeDef(bk?.recipeId) || BAKERY_RECIPE_DEFS[0];
    const stageIdx = Math.max(0, Math.min(BAKERY_STATIONS.length - 1, Math.floor(Number(bk?.batch?.stageIdx) || 0)));
    const station = BAKERY_STATIONS[stageIdx];
    const need = recipe.work[station.id];
    const work = Math.max(0, Number(bk?.batch?.work) || 0);
    const pct = Math.max(0, Math.min(100, Math.floor((work / Math.max(1, need)) * 100)));
    return { stageIdx, pct, text: `第 ${stageIdx + 1}/${BAKERY_STATIONS.length} 道 · ${station.verb} ${Math.floor(work)}/${need} 工时（${pct}%）` };
  }

  function ml15RateText(state, bk) {
    if (!bk || !bk.workers) return "";
    if ((bk.showcase?.length || 0) >= BAKERY_CASE_CAP) return `甜点柜满了（${BAKERY_CASE_CAP} 份）· 享用或装盒后伙伴们才会继续烤`;
    const speeds = getBakeryStationSpeeds(state, { getBeastDataByDex });
    const stageIdx = Math.max(0, Math.min(BAKERY_STATIONS.length - 1, Math.floor(Number(bk.batch?.stageIdx) || 0)));
    const station = BAKERY_STATIONS[stageIdx];
    const perMin = speeds[station.id] || 0;
    if (!(perMin > 0)) return "工位都空着 · 请伙伴上岗才会开工";
    const eta = getBakeryBatchEtaSec(state, { getBeastDataByDex });
    const etaTxt = Number.isFinite(eta) ? `约 ${fmtDuration(Math.max(1, Math.ceil(eta)))} 后出炉` : "";
    return `${station.name}每分钟 ${perMin.toFixed(2)} 工时${bk.workers[station.id] ? "" : "（临时帮忙）"} · ${etaTxt}`;
  }

  /** ML-15: live patch of the bakery stage bar, rate text and buff countdowns between full re-renders (0px scroll drift). */
  function patchBakeryLiveDom(state) {
    const bk = state?.meta?.cloudBakery;
    if (!elFunctionsTraining || !bk || !bk.batch || !bk.buffs) return;
    const oven = elFunctionsTraining.querySelector("[data-bakery-stage-now]");
    const v = ml15StageView(state, bk);
    if (oven && Number(oven.getAttribute("data-bakery-stage-now")) !== v.stageIdx) {
      ui.functionsDirty = true;
      return;
    }
    const fill = elFunctionsTraining.querySelector("[data-bakery-stage-fill]");
    if (fill instanceof HTMLElement) fill.style.width = `${v.pct}%`;
    const txt = elFunctionsTraining.querySelector("[data-bakery-stage-txt]");
    if (txt && txt.textContent !== v.text) txt.textContent = v.text;
    const rate = elFunctionsTraining.querySelector("[data-bakery-rate-txt]");
    const rateTxt = ml15RateText(state, bk);
    if (rate && rate.textContent !== rateTxt) rate.textContent = rateTxt;
    for (const b of BAKERY_BUFF_DEFS) {
      const el = elFunctionsTraining.querySelector(`[data-bakery-buff-rem="${b.id}"]`);
      if (!el) continue;
      const rem = Math.max(0, Number(bk.buffs[b.id]) || 0);
      const t = rem > 0 ? `剩 ${fmtDuration(Math.ceil(rem))}` : "未生效";
      if (el.textContent !== t) el.textContent = t;
    }
  }

  function ml15FlightView(trip) {
    const dur = Math.max(1, Number(trip?.durationSec) || 1);
    const el = Math.max(0, Math.min(dur, Number(trip?.elapsedSec) || 0));
    const pct = Math.max(2, Math.min(99, Math.floor((el / dur) * 100)));
    return { pct, text: `航程 ${pct}% · 约 ${fmtDuration(Math.max(1, Math.ceil(dur - el)))} 后降落` };
  }

  function ml15RotateText(rot) {
    const min = Math.max(0, Math.floor((rot?.msUntilNext || 0) / 60000));
    return `约 ${Math.floor(min / 60)} 小时 ${min % 60} 分后「${rot?.leaving?.name || ""}」飘走、「${rot?.incoming?.name || ""}」飘来`;
  }

  /** ML-15: live patch of the balloon flight bars and the isle-rotation countdown (0px scroll drift). */
  function patchBalloonTravelLiveDom(state) {
    const bt = state?.meta?.balloonTravel;
    if (!elFunctionsTraining || !bt || !Array.isArray(bt.balloons)) return;
    const rot = getBalloonIsleRotation();
    const sky = elFunctionsTraining.querySelector("[data-balloon-rotation]");
    if (sky && Number(sky.getAttribute("data-balloon-rotation")) !== rot.index) {
      ui.functionsDirty = true;
      return;
    }
    const rotEl = elFunctionsTraining.querySelector("[data-balloon-rotate-txt]");
    const rotTxt = ml15RotateText(rot);
    if (rotEl && rotEl.textContent !== rotTxt) rotEl.textContent = rotTxt;
    bt.balloons.forEach((b, i) => {
      const card = elFunctionsTraining.querySelector(`[data-balloon-card="${i}"]`);
      const phase = b?.trip ? b.trip.phase : "idle";
      if (card && card.getAttribute("data-balloon-phase") !== phase) {
        ui.functionsDirty = true;
        return;
      }
      if (phase !== "flying") return;
      const v = ml15FlightView(b.trip);
      const fill = elFunctionsTraining.querySelector(`[data-balloon-fill="${i}"]`);
      if (fill instanceof HTMLElement) fill.style.width = `${v.pct}%`;
      const txt = elFunctionsTraining.querySelector(`[data-balloon-txt="${i}"]`);
      if (txt && txt.textContent !== v.text) txt.textContent = v.text;
    });
  }

  function ml13StateView(remSec) {
    const rem = Math.max(0, Number(remSec) || 0);
    const pct = rem > 0 ? Math.max(2, Math.min(100, Math.round((rem / HOT_SPRING_STATE_MAX_SEC) * 100))) : 0;
    return { pct, text: rem > 0 ? `剩余 ${fmtDuration(Math.ceil(rem))}` : "未生效 · 泡汤续时" };
  }

  function ml13PoolRound(hs, poolId, seatCount) {
    if (!seatCount) return { pct: 0, text: "空池 · 请伙伴来泡汤才会开始疗愈" };
    const carry = Math.max(0, Number(hs?.pools?.[poolId]?.carrySec) || 0);
    const pct = Math.max(2, Math.min(99, Math.floor((carry / HOT_SPRING_ROUND_SEC) * 100)));
    return { pct, text: `本轮疗愈 ${pct}% · 约 ${fmtDuration(Math.max(1, Math.ceil(HOT_SPRING_ROUND_SEC - carry)))} 后完成` };
  }

  /** ML-13: live patch of the hot-spring state timers and pool round bars between full re-renders (0px scroll drift). */
  function patchHotSpringLiveDom(state) {
    const hs = state?.meta?.hotSpring;
    if (!elFunctionsTraining || !hs || !hs.states || !hs.pools) return;
    for (const sd of HOT_SPRING_STATE_DEFS) {
      const view = ml13StateView(hs.states[sd.id]);
      const fill = elFunctionsTraining.querySelector(`[data-spring-state-fill="${sd.id}"]`);
      if (fill instanceof HTMLElement) fill.style.width = `${view.pct}%`;
      const rem = elFunctionsTraining.querySelector(`[data-spring-state-rem="${sd.id}"]`);
      if (rem && rem.textContent !== view.text) rem.textContent = view.text;
    }
    for (const def of HOT_SPRING_POOL_DEFS) {
      const fill = elFunctionsTraining.querySelector(`[data-spring-fill="${def.id}"]`);
      const txt = elFunctionsTraining.querySelector(`[data-spring-txt="${def.id}"]`);
      if (!fill && !txt) continue;
      const seats = Array.isArray(hs.pools[def.id]?.seatIds) ? hs.pools[def.id].seatIds.length : 0;
      const view = ml13PoolRound(hs, def.id, seats);
      if (fill instanceof HTMLElement) fill.style.width = `${view.pct}%`;
      if (txt && txt.textContent !== view.text) txt.textContent = view.text;
    }
  }

  function ml13LetterView(po) {
    const letters = Math.max(0, Math.floor(Number(po?.letters) || 0));
    if (letters >= POST_LETTER_CAP) return { pct: 100, text: `邮筒信件 ${letters}/${POST_LETTER_CAP} · 邮筒满了，快派信使出发吧` };
    const carry = Math.max(0, Number(po?.letterCarrySec) || 0);
    const pct = Math.max(2, Math.min(99, Math.floor((carry / POST_LETTER_REFILL_SEC) * 100)));
    return { pct, text: `邮筒信件 ${letters}/${POST_LETTER_CAP} · 约 ${fmtDuration(Math.max(1, Math.ceil(POST_LETTER_REFILL_SEC - carry)))} 后收到下一封` };
  }

  function ml13TripView(trip) {
    const need = Math.max(1, Number(trip?.tripSec) || 1);
    const el = Math.max(0, Number(trip?.elapsedSec) || 0);
    const pct = Math.max(2, Math.min(100, Math.floor((el / need) * 100)));
    const half = el < need / 2;
    return {
      pct,
      text: el >= need ? "已返回邮局 · 待拆回信" : `${half ? "送信途中" : "带着回信返程"} ${pct}% · 约 ${fmtDuration(Math.max(1, Math.ceil(need - el)))} 后回到邮局`,
    };
  }

  /** ML-13: live patch of the mailbox refill bar and every messenger's trip bar between full re-renders (0px scroll drift). */
  function patchPostOfficeLiveDom(state) {
    const po = state?.meta?.postOffice;
    if (!elFunctionsTraining || !po || !Array.isArray(po.trips)) return;
    const lv = ml13LetterView(po);
    const lFill = elFunctionsTraining.querySelector("[data-post-letter-fill]");
    if (lFill instanceof HTMLElement) lFill.style.width = `${lv.pct}%`;
    const lTxt = elFunctionsTraining.querySelector("[data-post-letter-txt]");
    if (lTxt && lTxt.textContent !== lv.text) lTxt.textContent = lv.text;
    for (const t of po.trips) {
      if (isPostTripArrived(t)) continue;
      const view = ml13TripView(t);
      const fill = elFunctionsTraining.querySelector(`[data-post-fill="${t.routeId}"]`);
      if (fill instanceof HTMLElement) fill.style.width = `${view.pct}%`;
      const txt = elFunctionsTraining.querySelector(`[data-post-txt="${t.routeId}"]`);
      if (txt && txt.textContent !== view.text) txt.textContent = view.text;
    }
  }

  function ml12SailProgress(voyage) {
    if (!voyage || voyage.phase !== "sailing") return { pct: 100, text: "" };
    const need = Math.max(1, Number(voyage.sailNeedSec) || 1);
    const prog = Math.max(0, Number(voyage.sailSec) || 0);
    const pct = Math.max(2, Math.min(99, Math.floor((prog / need) * 100)));
    const island = getTreasureIslandDef(voyage.islandId);
    return { pct, text: `航程 ${pct}% · 约 ${fmtDuration(Math.max(1, Math.ceil(need - prog)))} 后抵达「${island?.name || "宝岛"}」` };
  }

  /** ML-12: live patch of the treasure-voyage sailing bar between full re-renders (0px scroll drift). */
  function patchTreasureVoyageLiveDom(state) {
    const v = state?.meta?.treasureVoyage?.voyage;
    if (!elFunctionsTraining || !v || v.phase !== "sailing") return;
    const fill = elFunctionsTraining.querySelector("[data-treasure-sail-fill]");
    const txt = elFunctionsTraining.querySelector("[data-treasure-sail-txt]");
    if (!fill && !txt) return;
    const prog = ml12SailProgress(v);
    if (fill instanceof HTMLElement) fill.style.width = `${prog.pct}%`;
    if (txt && txt.textContent !== prog.text) txt.textContent = prog.text;
  }

  function ml11FmtDays(ms) {
    const totalMin = Math.max(0, Math.ceil((Number(ms) || 0) / 60000));
    const days = Math.floor(totalMin / 1440);
    const hours = Math.floor((totalMin % 1440) / 60);
    if (days > 0) return `${days} 天 ${hours} 小时`;
    return `${hours} 小时 ${totalMin % 60} 分`;
  }

  function ml11IslandProgress(isl, crewEval) {
    const b = isl?.build;
    if (!b) return { pct: 0, text: "" };
    const need = Math.max(1, Number(b.needSec) || 1);
    const prog = Math.max(0, Number(b.progressSec) || 0);
    const pct = Math.max(1, Math.min(99, Math.floor((prog / need) * 100)));
    if (!crewEval?.crewCount) return { pct, text: `工期 ${pct}% · 工地停工中：派 1~3 只伙伴上岛出工才会推进` };
    const remSec = Math.max(1, Math.ceil((need - prog) / Math.max(0.01, crewEval.speedMul)));
    return { pct, text: `工期 ${pct}% · 约 ${fmtDuration(remSec)} 后竣工（出工速度 ×${crewEval.speedMul.toFixed(2)}）` };
  }

  function ml11MigrantProgress(mg, migrantId, speedMul) {
    const carry = Math.max(0, Number(mg?.stay?.[migrantId]) || 0);
    const pct = Math.max(2, Math.min(99, Math.floor((carry / MIGRATION_RECORD_SEC) * 100)));
    const remSec = Math.max(1, Math.ceil((MIGRATION_RECORD_SEC - carry) / Math.max(0.01, speedMul || 1)));
    return { pct, text: `驻留观察 ${pct}% · 约 ${fmtDuration(remSec)} 后写下记录` };
  }

  function ml11MedalProgress(mg) {
    const recs = Math.max(0, Math.floor(Number(mg?.seasonRecords) || 0));
    const next = MIGRATION_MEDAL_TIERS.find((t) => recs < t.minRecords) || null;
    if (!next) return { pct: 100, text: `本季记录 ${recs} 条 · 已获金羽迁徙纪念章` };
    const prevMin = MIGRATION_MEDAL_TIERS.filter((t) => t.minRecords <= recs).reduce((m, t) => Math.max(m, t.minRecords), 0);
    const pct = Math.max(2, Math.min(99, Math.floor(((recs - prevMin) / Math.max(1, next.minRecords - prevMin)) * 100)));
    return { pct, text: `本季记录 ${recs}/${next.minRecords} 条 → ${next.name}迁徙纪念章` };
  }

  /** ML-11: live patch of the sky-island site progress between full re-renders (0px scroll drift). */
  function patchSkyIslandLiveDom(state) {
    if (!elFunctionsTraining || !state?.meta?.skyIsland?.build) return;
    const fill = elFunctionsTraining.querySelector("[data-island-fill]");
    const txt = elFunctionsTraining.querySelector("[data-island-txt]");
    if (!fill && !txt) return;
    const list = Array.isArray(state.mons?.list) ? state.mons.list : [];
    const crew = Array.from(getSkyIslandCrewMonIds(state))
      .map((id) => list.find((m) => m && m.id === id) || null)
      .filter(Boolean);
    const prog = ml11IslandProgress(state.meta.skyIsland, evaluateSkyIslandCrew(crew, state, { getBeastDataByDex }));
    if (fill instanceof HTMLElement) fill.style.width = `${prog.pct}%`;
    if (txt && txt.textContent !== prog.text) txt.textContent = prog.text;
  }

  /** ML-11: live patch of the season countdown and each hosted migrant's stay-over bar (0px scroll drift). */
  function patchSeasonMigrationLiveDom(state) {
    if (!elFunctionsTraining || !state?.meta?.seasonMigration) return;
    const season = getMigrationSeason();
    const cdTxt = `距候鸟启程 ${ml11FmtDays(season.msUntilEnd)}`;
    for (const el of elFunctionsTraining.querySelectorAll("[data-migration-countdown]")) {
      if (el.textContent !== cdTxt) el.textContent = cdTxt;
    }
    const fills = elFunctionsTraining.querySelectorAll("[data-migration-fill]");
    if (!fills.length) return;
    const speed = evaluateMigrationSpeed(state).speedMul;
    for (const fill of fills) {
      const id = fill.getAttribute("data-migration-fill") || "";
      const prog = ml11MigrantProgress(state.meta.seasonMigration, id, speed);
      if (fill instanceof HTMLElement) fill.style.width = `${prog.pct}%`;
      const txt = elFunctionsTraining.querySelector(`[data-migration-txt="${id}"]`);
      if (txt && txt.textContent !== prog.text) txt.textContent = prog.text;
    }
  }

  function ml10FmtHm(ms) {
    const min = Math.max(0, Math.ceil((Number(ms) || 0) / 60000));
    const h = Math.floor(min / 60);
    return h > 0 ? `${h} 小时 ${min % 60} 分` : `${min} 分钟`;
  }

  function ml10NightProgress(obs, observerEval, phase) {
    if (!observerEval?.observerCount) return { pct: 0, text: "派驻 1~3 只伙伴后开始记录夜行萌灵出没" };
    const carry = Math.max(0, Number(obs?.observeCarrySec) || 0);
    const pct = Math.max(2, Math.min(99, Math.round((carry / NIGHT_OBS_CYCLE_SEC) * 100)));
    const rate = phase.sightingMul * observerEval.speedMul;
    const remSec = rate > 0 ? Math.ceil((NIGHT_OBS_CYCLE_SEC - carry) / rate) : 0;
    return {
      pct,
      text: `下一次记录 ${pct}% · 约 ${fmtDuration(remSec)} 后（观测效率 ×${rate.toFixed(2)} · ${phase.isNight ? "夜观" : "暮光"}）`,
    };
  }

  /** ML-10: live patch of the observatory countdown / progress / lantern stock between full re-renders (0px scroll drift). */
  function patchNightObservatoryLiveDom(state) {
    if (!elFunctionsTraining || !state?.meta?.nightObservatory) return;
    const lanterns = Math.max(0, Math.floor(Number(state.res?.fireflyLantern?.value) || 0));
    const stockEl = elFunctionsTraining.querySelector("[data-night-lantern-stock]");
    if (stockEl) stockEl.textContent = `萤火灯笼 ×${lanterns}`;
    const phase = getNightObservatoryPhase();
    const cdTxt = `${phase.countdownLabel} ${ml10FmtHm(phase.msUntilChange)}`;
    for (const el of elFunctionsTraining.querySelectorAll("[data-night-countdown]")) {
      if (el.textContent !== cdTxt) el.textContent = cdTxt;
    }
    const fill = elFunctionsTraining.querySelector("[data-night-fill]");
    const txt = elFunctionsTraining.querySelector("[data-night-txt]");
    if (!fill && !txt) return;
    const list = Array.isArray(state.mons?.list) ? state.mons.list : [];
    const observers = Array.from(getNightObservatoryStationedMonIds(state))
      .map((id) => list.find((m) => m && m.id === id) || null)
      .filter(Boolean);
    const prog = ml10NightProgress(state.meta.nightObservatory, evaluateNightObservers(observers, state, { getBeastDataByDex }), phase);
    if (fill instanceof HTMLElement) fill.style.width = `${prog.pct}%`;
    if (txt && txt.textContent !== prog.text) txt.textContent = prog.text;
  }

  function patchWishDockLiveDom(state) {
    if (!elFunctionsTraining || !state?.meta?.wishDock) return;
    const bottles = Math.max(0, Math.floor(Number(state.res?.driftBottle?.value) || 0));
    const stockEl = elFunctionsTraining.querySelector("[data-dock-bottle-stock]");
    if (stockEl) stockEl.textContent = `漂流瓶 ×${bottles}`;
    const countEl = elFunctionsTraining.querySelector("[data-dock-bottle-count]");
    if (countEl) countEl.textContent = `漂流瓶 ×${bottles}`;
    const routes = state.meta.wishDock.routes || {};
    for (const rDef of WISH_DOCK_ROUTES) {
      const r = routes[rDef.id];
      if (!r?.active || r.completed) continue;
      const dur = Math.max(1, Number(r.durationSec) || rDef.baseDurationSec);
      const elapsed = Math.max(0, Number(r.elapsedSec) || 0);
      const pct = Math.max(3, Math.min(99, Math.round((elapsed / dur) * 100)));
      const remSec = Math.max(0, Math.ceil(dur - elapsed));
      const fill = elFunctionsTraining.querySelector(`[data-dock-fill="${rDef.id}"]`);
      if (fill instanceof HTMLElement) fill.style.width = `${pct}%`;
      const txt = elFunctionsTraining.querySelector(`[data-dock-txt="${rDef.id}"]`);
      if (txt) txt.textContent = `拾贝进度 ${pct}% · 剩余 ${fmtDuration(remSec)}`;
    }
  }

  function patchAmberRevivalLiveDom(state) {
    if (!elFunctionsTraining || !state) return;
    const amberVal = Math.max(0, Math.floor(Number(state.res?.ancientGeneAmber?.value) || 0));
    const amberEl = elFunctionsTraining.querySelector("[data-amber-stock]");
    if (amberEl) amberEl.textContent = `远古基因琥珀 ×${amberVal}`;
    const ecoBtn = elFunctionsTraining.querySelector('button[data-amber-synth="eco"]');
    if (ecoBtn instanceof HTMLButtonElement) ecoBtn.disabled = !canSynthesizeAncientAmber(state, "eco");
    const leagueBtn = elFunctionsTraining.querySelector('button[data-amber-synth="league"]');
    if (leagueBtn instanceof HTMLButtonElement) leagueBtn.disabled = !canSynthesizeAncientAmber(state, "league");
    const refineBtn = elFunctionsTraining.querySelector("button[data-amber-refine-iv]");
    if (refineBtn instanceof HTMLButtonElement) refineBtn.disabled = !canRefinePartnerIvWithAmber(state);
    const selIvEl = elFunctionsTraining.querySelector("[data-amber-sel-iv]");
    if (selIvEl) {
      const selId = state.meta?.amberRevival?.selectedMonId;
      const mon = (state.mons?.list || []).find((m) => m && m.id === selId) || state.mons?.list?.[0] || null;
      if (mon) selIvEl.textContent = `个体总值 ${sumMonIv(mon)}/186`;
    }
  }

  function patchBoutiqueLiveDom(state) {
    if (!elFunctionsTraining || !state) return;
    const sandVal = Math.max(0, Math.floor(Number(state.res?.shinyStarSand?.value) || 0));
    const sandEl = elFunctionsTraining.querySelector("[data-bq-sand-stock]");
    if (sandEl) sandEl.textContent = `闪光祈愿星砂 ×${sandVal}`;
    const goldBtn = elFunctionsTraining.querySelector('button[data-bq-synth="gold"]');
    if (goldBtn instanceof HTMLButtonElement) goldBtn.disabled = !canSynthesizeStarSand(state, "gold");
    const herbBtn = elFunctionsTraining.querySelector('button[data-bq-synth="herb"]');
    if (herbBtn instanceof HTMLButtonElement) herbBtn.disabled = !canSynthesizeStarSand(state, "herb");
  }

  function patchStarCampLiveDom(state) {
    if (!state?.meta?.starCamp || !elFunctionsTraining) return;
    const camp = ensureStarCampState(state);
    const campAura = computeStarCampAura(state, { getBeastDataByDex });
    const foragePct =
      campAura.stationedCount > 0
        ? Math.max(2, Math.min(99, Math.round(((camp.forageCarrySec || 0) / STAR_CAMP_FORAGE_CYCLE_SEC) * 100)))
        : 0;
    const forageRemSec =
      campAura.stationedCount > 0
        ? Math.max(1, Math.ceil((STAR_CAMP_FORAGE_CYCLE_SEC - (camp.forageCarrySec || 0)) / Math.max(1, campAura.campSpeedMul || 1)))
        : STAR_CAMP_FORAGE_CYCLE_SEC;

    const barEl = elFunctionsTraining.querySelector("[data-camp-forage-fill]");
    if (barEl instanceof HTMLElement) barEl.style.width = `${foragePct}%`;
    const txtEl = elFunctionsTraining.querySelector("[data-camp-forage-txt]");
    if (txtEl) {
      txtEl.textContent =
        campAura.stationedCount > 0
          ? `营火伴游采集 ${foragePct}% · 约 ${fmtDuration(forageRemSec)} 后收获野餐香草与星露灵果（加速 x${(campAura.campSpeedMul || 1).toFixed(2)}）`
          : "邀请 1~4 只萌灵入驻营地，即可持续累积亲密度并自动寻获野餐香草与星露灵果";
    }
    for (const f of campAura.activeFeasts) {
      const remEl = elFunctionsTraining.querySelector(`[data-camp-feast-rem="${f.recipeId}"]`);
      if (remEl) remEl.textContent = fmtDuration(Math.max(0, Math.ceil(f.remainingSec || 0)));
      const fillEl = elFunctionsTraining.querySelector(`[data-camp-feast-fill="${f.recipeId}"]`);
      if (fillEl instanceof HTMLElement) {
        const pct = Math.max(2, Math.min(100, Math.round(((f.remainingSec || 0) / Math.max(1, f.totalSec || 1800)) * 100)));
        fillEl.style.width = `${pct}%`;
      }
    }
  }

  return function renderFunctions() {
    if (!elFunctionsTraining) return;
    if (ui.activeTab !== "functions") return;
    if (!ui.functionsDirty) {
      const stLive = typeof getState === "function" ? getState() : null;
      if (stLive && !ui.functionsFocus) {
        patchStarCampLiveDom(stLive);
        patchBoutiqueLiveDom(stLive);
        patchAmberRevivalLiveDom(stLive);
        patchWishDockLiveDom(stLive);
        patchNightObservatoryLiveDom(stLive);
        patchSkyIslandLiveDom(stLive);
        patchSeasonMigrationLiveDom(stLive);
        patchTreasureVoyageLiveDom(stLive);
        patchHotSpringLiveDom(stLive);
        patchPostOfficeLiveDom(stLive);
        patchDreamLibraryLiveDom(stLive);
        patchFishingClubLiveDom(stLive);
        patchBakeryLiveDom(stLive);
        patchBalloonTravelLiveDom(stLive);
        patchCloudParkLiveDom(stLive);
        patchStargazeLiveDom(stLive);
      }
      return;
    }
    if (ui.functionsFocus) return;

    const state = typeof getState === "function" ? getState() : null;
    if (!state || typeof state !== "object") return;

    let prevPageScrollY = 0;
    let prevTrainModalBodyScrollTop = 0;
    let prevBreedModalBodyScrollTop = 0;
    let prevExpTeamModalBodyScrollTop = 0;
    let prevFocusKind = "";
    let prevFocusStart = null;
    let prevFocusEnd = null;
    try {
      prevPageScrollY = typeof window !== "undefined" ? (window.scrollY || 0) : 0;
      const prevBody = elFunctionsTraining.querySelector('.modalOverlay[data-train-modal-overlay="1"] .modal__body');
      if (prevBody) prevTrainModalBodyScrollTop = prevBody.scrollTop;
      const prevBreedBody = elFunctionsTraining.querySelector('.modalOverlay[data-breed-modal-overlay="1"] .modal__body');
      if (prevBreedBody) prevBreedModalBodyScrollTop = prevBreedBody.scrollTop;
      const prevExpTeamBody = elFunctionsTraining.querySelector('.modalOverlay[data-exp-team-overlay="1"] .modal__body');
      if (prevExpTeamBody) prevExpTeamModalBodyScrollTop = prevExpTeamBody.scrollTop;
      const prevEcoSquadBody = elFunctionsTraining.querySelector('.modalOverlay[data-eco-modal-overlay="1"] .modal__body');
      if (prevEcoSquadBody) ui.__ecoModalScrollTop = prevEcoSquadBody.scrollTop;
      const prevCampSquadBody = elFunctionsTraining.querySelector('.modalOverlay[data-camp-modal-overlay="1"] .modal__body');
      if (prevCampSquadBody) ui.__campModalScrollTop = prevCampSquadBody.scrollTop;
      const prevLeagueSquadBody = elFunctionsTraining.querySelector('.modalOverlay[data-func-league-modal-overlay="1"] .modal__body');
      if (prevLeagueSquadBody) ui.__leagueModalScrollTop = prevLeagueSquadBody.scrollTop;
      const prevDockCrewBody = elFunctionsTraining.querySelector('.modalOverlay[data-dock-modal-overlay="1"] .modal__body');
      if (prevDockCrewBody) ui.__dockModalScrollTop = prevDockCrewBody.scrollTop;
      const prevNightBody = elFunctionsTraining.querySelector('.modalOverlay[data-night-modal-overlay="1"] .modal__body');
      if (prevNightBody) ui.__nightModalScrollTop = prevNightBody.scrollTop;
      const prevShowBody = elFunctionsTraining.querySelector('.modalOverlay[data-show-modal-overlay="1"] .modal__body');
      if (prevShowBody) ui.__showModalScrollTop = prevShowBody.scrollTop;
      const prevIslandBody = elFunctionsTraining.querySelector('.modalOverlay[data-island-modal-overlay="1"] .modal__body');
      if (prevIslandBody) ui.__islandModalScrollTop = prevIslandBody.scrollTop;
      const prevTreasureBody = elFunctionsTraining.querySelector('.modalOverlay[data-treasure-modal-overlay="1"] .modal__body');
      if (prevTreasureBody) ui.__treasureModalScrollTop = prevTreasureBody.scrollTop;
      const prevBandBody = elFunctionsTraining.querySelector('.modalOverlay[data-band-modal-overlay="1"] .modal__body');
      if (prevBandBody) ui.__bandModalScrollTop = prevBandBody.scrollTop;
      const prevSpringBody = elFunctionsTraining.querySelector('.modalOverlay[data-spring-modal-overlay="1"] .modal__body');
      if (prevSpringBody) ui.__springModalScrollTop = prevSpringBody.scrollTop;
      const prevPostBody = elFunctionsTraining.querySelector('.modalOverlay[data-post-modal-overlay="1"] .modal__body');
      if (prevPostBody) ui.__postModalScrollTop = prevPostBody.scrollTop;
      const prevDreamBody = elFunctionsTraining.querySelector('.modalOverlay[data-dream-modal-overlay="1"] .modal__body');
      if (prevDreamBody) ui.__dreamModalScrollTop = prevDreamBody.scrollTop;
      const prevFishBody = elFunctionsTraining.querySelector('.modalOverlay[data-fish-modal-overlay="1"] .modal__body');
      if (prevFishBody) ui.__fishModalScrollTop = prevFishBody.scrollTop;
      const prevBakeryBody = elFunctionsTraining.querySelector('.modalOverlay[data-bakery-modal-overlay="1"] .modal__body');
      if (prevBakeryBody) ui.__bakeryModalScrollTop = prevBakeryBody.scrollTop;
      const prevBalloonBody = elFunctionsTraining.querySelector('.modalOverlay[data-balloon-modal-overlay="1"] .modal__body');
      if (prevBalloonBody) ui.__balloonModalScrollTop = prevBalloonBody.scrollTop;
      const prevParkBody = elFunctionsTraining.querySelector('.modalOverlay[data-park-modal-overlay="1"] .modal__body');
      if (prevParkBody) ui.__parkModalScrollTop = prevParkBody.scrollTop;
      const prevStargazeBody = elFunctionsTraining.querySelector('.modalOverlay[data-stargaze-modal-overlay="1"] .modal__body');
      if (prevStargazeBody) ui.__stargazeModalScrollTop = prevStargazeBody.scrollTop;

      const ae = typeof document !== "undefined" ? document.activeElement : null;
      if (ae && ae instanceof HTMLElement && elFunctionsTraining.contains(ae)) {
        if (ae.matches('input[data-train-modal-q]')) prevFocusKind = "train";
        else if (ae.matches('input[data-breed-modal-q]')) prevFocusKind = "breed";
        if (prevFocusKind) {
          const inp = ae;
          prevFocusStart = typeof inp.selectionStart === "number" ? inp.selectionStart : null;
          prevFocusEnd = typeof inp.selectionEnd === "number" ? inp.selectionEnd : null;
        }
      }
    } catch {
    }

    const list = state.mons?.list ?? [];
    if (!state.training || typeof state.training !== "object") state.training = { activeIds: [], slotSize: 0 };
    if (!Array.isArray(state.training.activeIds)) state.training.activeIds = [];
    const slotSize =
      typeof state.training.slotSize === "number" && Number.isFinite(state.training.slotSize)
        ? Math.max(0, Math.floor(state.training.slotSize))
        : 0;

    const active = state.training.activeIds
      .map((id) => list.find((m) => m && m.id === id) ?? null)
      .filter((x) => x);

    const rows = [];

    const hideTraining = Boolean(ui.functionsHideTraining);
    const statusExpOn = Boolean(state.expedition?.on);
    const statusExpRem =
      statusExpOn && typeof state.expedition?.remainingSec === "number" && Number.isFinite(state.expedition.remainingSec)
        ? Math.max(0, state.expedition.remainingSec)
        : 0;
    const trainN = active.length;
    const trainExpTotal = Math.max(0, Math.floor(state.meta?.trainingExpGained || 0));
    const ecoSb = ensureEcoSandboxState(state);
    const ecoRelicAura = computeEcoRelicAura(state);
    const starCamp = ensureStarCampState(state);
    const starCampAura = computeStarCampAura(state, { getBeastDataByDex });
    const starBoutique = ensureStarBoutiqueState(state);
    const boutiqueAura = computeStarBoutiqueAura(state);
    const amberRevival = ensureAmberRevivalState(state);
    const amberAura = computeAmberRevivalAura(state);
    const champLeague = ensureChampionLeagueState(state);
    const leagueBonus = computeChampionLeagueBonus(state);
    const corridorBonus = computeStarCorridorBonus(state);
    const activeEcoZonesCount = ECO_SANDBOX_ZONES.filter((z) => ecoSb?.zones?.[z.id]?.active).length;
    const readyEcoZonesCount = ECO_SANDBOX_ZONES.filter((z) => ecoSb?.zones?.[z.id]?.completed).length;
    const mintOwnedCount = Math.max(0, Math.floor(state.res?.tuningMint?.value ?? 0));
    const sandOwnedCount = Math.max(0, Math.floor(state.res?.shinyStarSand?.value ?? 0));
    const amberOwnedCount = Math.max(0, Math.floor(state.res?.ancientGeneAmber?.value ?? 0));

    const statusBits = [];
    const returnedStatus = getReturnedPartnersSummary(state);
    if (returnedStatus.count > 0) statusBits.push(`外出归来待收取 ${returnedStatus.count} 处（${returnedStatus.byActivity.map((g) => g.title).join("、")}）`);
    const parkStatusAura = computeCloudParkAura(state);
    if (state.meta?.cloudPark && (parkStatusAura.operators > 0 || parkStatusAura.totalVisitors > 0 || parkStatusAura.activeBuffs.length > 0)) {
      statusBits.push(
        `云端游乐园 值班 ${parkStatusAura.operators}/${PARK_RIDES.length} · 满意度 ${Math.floor(parkStatusAura.satisfaction)} · 门票 ${parkStatusAura.tickets}/${PARK_TICKET_CAP}${parkStatusAura.activeBuffs.length ? ` · 活动 ${parkStatusAura.activeBuffs.map((b) => b.name).join("/")}` : ""}`,
      );
    }
    const sgStatusBonus = computeStargazeCampBonus(state);
    if (state.meta?.stargazeCamp && (sgStatusBonus.campers > 0 || sgStatusBonus.returned > 0 || sgStatusBonus.totalNights > 0)) {
      statusBits.push(`星空露营 夜营 ${sgStatusBonus.camping}/${STARGAZE_SITE_COUNT}${sgStatusBonus.returned ? ` · 待收取 ${sgStatusBonus.returned}` : ""} · 图鉴 ${sgStatusBonus.entries}/${sgStatusBonus.totalEntries} · ${sgStatusBonus.badgeName}`);
    }
    const bakeryStatusAura = computeBakeryAura(state);
    if (state.meta?.cloudBakery && (bakeryStatusAura.workers > 0 || bakeryStatusAura.totalBatches > 0 || bakeryStatusAura.activeBuffs.length > 0)) {
      statusBits.push(
        `云朵烘焙坊 上岗 ${bakeryStatusAura.workers}/${BAKERY_MAX_WORKERS} · 甜点柜 ${bakeryStatusAura.showcase}/${BAKERY_CASE_CAP} · 食谱 ${bakeryStatusAura.recipesCollected}/${bakeryStatusAura.totalRecipes}${bakeryStatusAura.activeBuffs.length ? ` · 增益 ${bakeryStatusAura.activeBuffs.map((b) => b.name).join("/")}` : ""}`,
      );
    }
    const balloonStatusBonus = computeBalloonTravelBonus(state);
    if (state.meta?.balloonTravel && (balloonStatusBonus.travelers > 0 || balloonStatusBonus.landed > 0 || balloonStatusBonus.totalTrips > 0)) {
      statusBits.push(
        `彩虹气球 在途 ${balloonStatusBonus.flying}/${BALLOON_COUNT}${balloonStatusBonus.landed ? ` · 待收取 ${balloonStatusBonus.landed}` : ""} · 纪念品 ${balloonStatusBonus.species}/${balloonStatusBonus.totalSpecies} · ${balloonStatusBonus.badgeName}`,
      );
    }
    const dreamStatusAura = computeDreamLibraryAura(state);
    if (state.meta?.dreamLibrary && (dreamStatusAura.dreamingCount > 0 || dreamStatusAura.pageCount > 0)) {
      statusBits.push(`梦境绘本馆 入梦 ${dreamStatusAura.dreamingCount}/${DREAM_PILLOW_COUNT} · 插页 ${dreamStatusAura.pageCount}/${dreamStatusAura.totalPages} · 绘本 ${dreamStatusAura.completeBooks}/${dreamStatusAura.totalBooks}`);
    }
    const fishStatusBonus = computeFishingClubBonus(state);
    if (state.meta?.fishingClub && (fishStatusBonus.anglers > 0 || fishStatusBonus.totalCaught > 0)) {
      statusBits.push(`溪畔钓鱼会 钓手 ${fishStatusBonus.anglers}/${FISHING_ANGLER_MAX} · 鱼篓 ${fishStatusBonus.creel}/${FISHING_CREEL_CAP} · 图鉴 ${fishStatusBonus.species}/${fishStatusBonus.totalSpecies} · ${fishStatusBonus.trophyName}`);
    }
    const springStatusAura = computeHotSpringAura(state);
    if (state.meta?.hotSpring && (springStatusAura.soakingCount > 0 || springStatusAura.activeCount > 0)) {
      statusBits.push(
        `温泉疗愈 泡汤 ${springStatusAura.soakingCount}/${springStatusAura.seats} · 舒缓状态 ${springStatusAura.activeStates.map((x) => x.name).join("/") || "未生效"}`,
      );
    }
    const postStatusBonus = computePostOfficeBonus(state);
    if (state.meta?.postOffice && (postStatusBonus.messengersOut > 0 || postStatusBonus.totalDeliveries > 0)) {
      statusBits.push(`萌灵邮局 信使 ${postStatusBonus.messengersOut}/${POST_MAX_MESSENGERS} · 信件 ${postStatusBonus.letters}/${POST_LETTER_CAP} · 邮戳 ${postStatusBonus.collected}/${postStatusBonus.totalRegions}`);
    }
    const treasureStatusRaw = state.meta?.treasureVoyage;
    const treasureStatusAura = computeTreasureVoyageAura(state);
    const treasureStatusFrag = Math.max(0, Math.floor(state.res?.mapFragment?.value ?? 0));
    if (treasureStatusRaw && (treasureStatusAura.voyaging || treasureStatusAura.maps > 0 || treasureStatusFrag > 0 || treasureStatusAura.keepsakeCount > 0)) {
      const tsV = treasureStatusRaw.voyage;
      const tsIsland = tsV ? getTreasureIslandDef(tsV.islandId)?.name || "" : "";
      statusBits.push(
        `寻宝远航 ${tsV ? (tsV.phase === "sailing" ? `航行中→「${tsIsland}」` : `登岛探索「${tsIsland}」体力 ${tsV.stamina}`) : "港口待命"} · 藏宝图 ×${treasureStatusAura.maps} · 残片 ×${treasureStatusFrag} · 纪念品 ${treasureStatusAura.keepsakeCount}/${treasureStatusAura.totalKeepsakes}`,
      );
    }
    const bandStatusBonus = computeBandTourBonus(state);
    if (state.meta?.bandConcert && (bandStatusBonus.trophyStars > 0 || (state.meta.bandConcert.totalConcerts || 0) > 0)) {
      statusBits.push(`乐队巡演 ${bandStatusBonus.stopsCleared}/${BAND_TOUR_STOPS.length} 站 · ${bandStatusBonus.trophyName} ★${bandStatusBonus.trophyStars}/${bandStatusBonus.maxStars}`);
    }
    const islandStatusAura = computeSkyIslandAura(state);
    if (state.meta?.skyIsland && (islandStatusAura.totalLevel > 0 || islandStatusAura.building || islandStatusAura.crewCount > 0)) {
      const sb = state.meta.skyIsland.build;
      const sbPct = sb ? Math.floor((Math.max(0, Number(sb.progressSec) || 0) / Math.max(1, Number(sb.needSec) || 1)) * 100) : 0;
      statusBits.push(
        `云顶浮岛 ${islandStatusAura.islandTitle} Lv.${islandStatusAura.totalLevel}/${islandStatusAura.maxTotal}${sb ? ` · 施工「${getSkyIslandFacilityDef(sb.facilityId)?.name || ""}」${sbPct}%` : ""} · 建造伙伴 ${islandStatusAura.crewCount}/${SKY_ISLAND_MAX_CREW}`,
      );
    }
    const migStatusRaw = state.meta?.seasonMigration;
    const migStatusBonus = computeSeasonMigrationBonus(state);
    if (migStatusRaw && ((migStatusRaw.hostedIds || []).length > 0 || (migStatusRaw.seasonRecords || 0) > 0 || migStatusBonus.medalPoints > 0)) {
      const sNow = getMigrationSeason();
      statusBits.push(`季节迁徙 ${sNow.name}季「${sNow.label}」 · 驻留 ${(migStatusRaw.hostedIds || []).length} 位 · 纪念章 ${migStatusBonus.medalPoints}/${migStatusBonus.maxPoints}`);
    }
    const nightStatusIds = getNightObservatoryStationedMonIds(state);
    if (state.meta?.nightObservatory && (nightStatusIds.size > 0 || computeNightObservatoryAura(state).discovered > 0)) {
      const nAura = computeNightObservatoryAura(state);
      statusBits.push(`月光观察站 ${nAura.isNight ? "夜观" : "暮光"} · 派驻 ${nightStatusIds.size}/${NIGHT_OBS_MAX_STATION} · 日记 ${nAura.discovered}/${nAura.totalCreatures}`);
    }
    const showTrophyStatus = computeAcrobatTrophyBonus(state);
    if (showTrophyStatus.trophyStars > 0) {
      statusBits.push(`舞台星光奖杯 ★${showTrophyStatus.trophyStars}/${showTrophyStatus.maxStars}`);
    }
    const rawDockRoutes = state.meta?.wishDock?.routes || {};
    const dockStatusAway = WISH_DOCK_ROUTES.filter((r) => rawDockRoutes[r.id]?.active).length;
    const dockStatusBottles = Math.max(0, Math.floor(state.res?.driftBottle?.value ?? 0));
    if (state.meta?.wishDock && (dockStatusAway > 0 || dockStatusBottles > 0 || computeWishDockAura(state).badgeCount > 0)) {
      statusBits.push(`心愿码头 出海 ${dockStatusAway}/${WISH_DOCK_ROUTES.length} · 漂流瓶 ×${dockStatusBottles} · 纪念章 ${computeWishDockAura(state).badgeCount}/${OCEAN_BADGE_DEFS.length}`);
    }
    const triCrestStatus = computeEcoTriCrestBonus(state);
    if (triCrestStatus.crestTier > 0 || triCrestStatus.totalChampionships > 0) {
      statusBits.push(`三系冠军徽章 Tier ${triCrestStatus.crestTier}/${ECO_TRI_CREST_MAX_TIER}（夺冠 ${triCrestStatus.totalChampionships} 次）`);
    }
    if (amberAura.awakenedCount > 0 || amberOwnedCount > 0) {
      statusBits.push(`琥珀复苏 ${amberAura.equippedCount}/4 刻印 · 远古琥珀 ×${amberOwnedCount}`);
    }
    if (corridorBonus.corridorTier > 0 || corridorBonus.highestFloorCleared > 0) {
      statusBits.push(`星轨回廊第 ${corridorBonus.highestFloorCleared} 重 · Tier ${corridorBonus.corridorTier}/${STAR_CORRIDOR_MAX_TIER}`);
    }
    if (boutiqueAura.craftedCount > 0 || sandOwnedCount > 0) {
      statusBits.push(`星辉造型 ${boutiqueAura.equippedCount}/3 穿戴 · 星砂 ×${sandOwnedCount}`);
    }
    if (leagueBonus.hallOfFameTier > 0) {
      statusBits.push(`冠军殿堂 Tier ${leagueBonus.hallOfFameTier}/${CHAMPION_LEAGUE_MAX_TIER}`);
    }
    if (starCampAura.stationedCount > 0) {
      statusBits.push(`星界露营 ${starCampAura.stationedCount}/4 只（Lv.${starCamp.level}）`);
    }
    if (starCampAura.activeFeasts.length > 0) {
      statusBits.push(`营地盛宴 ×${starCampAura.activeFeasts.length} 生效中`);
    }
    if (trainN > 0) statusBits.push(`训练中 ${trainN} 只`);
    if (activeEcoZonesCount > 0) statusBits.push(`生态沙盘探索 ${activeEcoZonesCount}/4 区${readyEcoZonesCount > 0 ? `（可领 ${readyEcoZonesCount}）` : ""}`);
    if (mintOwnedCount > 0) statusBits.push(`心性调律薄荷 ×${mintOwnedCount}`);
    if (statusExpOn) statusBits.push(`远征剩余 ${fmtDuration(statusExpRem)}`);
    else if (Math.max(0, Math.floor(state.meta?.expeditionsCompleted || 0)) > 0) {
      statusBits.push(`远征已完成 ${Math.floor(state.meta.expeditionsCompleted)} 次`);
    }
    if (trainExpTotal > 0) statusBits.push(`累计训练经验 ${trainExpTotal}`);
    const expDaily = expeditionDailyProgress(state, localDateStr());
    const expDailyDesc = expDaily.claimed
      ? "今日远征任务已领"
      : expDaily.done
        ? "今日远征完成 → 可领 +10 未来币"
        : "今日远征任务：完成 1 次远征 → +10 未来币";

    rows.push(
      renderFunctionsStageHtml({
        state,
        activeTrain: active,
        slotSize,
        renderBeastIcon,
        fmtDuration,
        escapeHtml,
      }),
    );

    rows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title row__titleLine">${renderUiIcon("tab_functions", 18)}<span>功能摘要</span><span class="tag">${expDaily.claimed ? "今日已领" : "每日 +10 币"}</span></div>
          <div class="row__desc">${statusBits.length ? escapeHtml(statusBits.join(" · ")) : "派遣训练或远征后，回来这里看进度与收获。"}</div>
          <div class="row__desc">${escapeHtml(expDailyDesc)}</div>
        </div>
        <div class="row__right">
          <button type="button" class="btn btn--primary btn--small" data-func-exp-daily-claim ${expDaily.canClaim ? "" : "disabled"}>${expDaily.claimed ? "已领" : "领取 +10"}</button>
        </div>
      </div>
    `);

    // ========== ML-16 Section: 外出归来「一键收取已归来伙伴」(Collect Every Returned Partner) ==========
    // 读统一外出登记表：所有「已归来 / 已降落 / 已完成但还没收取」的外出单位都列在这里，一键交给各玩法自己的收取函数
    const ml16Returned = getReturnedPartnersSummary(state);
    const ml16AwayMap = getAwayActivityMap(state);
    const ml16AwayCounts = AWAY_ACTIVITY_DEFS.map((a) => ({ a, n: [...ml16AwayMap.values()].filter((x) => x.id === a.id).length })).filter((x) => x.n > 0);
    const ml16ReturnIcon = { stargazeCamp: "starCamp", balloonTravel: "rainbowBalloon", postOffice: "messengerBag", treasureVoyage: "treasureMap", wishDock: "driftBottle" };
    const ml16MonChip = (id) => {
      const m = list.find((x) => x && x.id === id);
      return m ? `<span class="away-return__mon">${renderBeastIcon(m.dex, m.name, Boolean(m.isShiny))}<span>${escapeHtml(m.name)}</span></span>` : "";
    };
    const ml16UnitsHtml = ml16Returned.units
      .map(
        (u) => `
          <div class="away-return__item" data-away-return-unit="${escapeHtml(u.key)}">
            ${renderUiIcon(ml16ReturnIcon[u.activityId] || "friendshipBracelet", 28)}
            <div class="away-return__body">
              <div class="away-return__title"><b>${escapeHtml(u.title)}</b><span>${escapeHtml(u.text)}</span></div>
              <div class="away-return__mons">${u.monIds.map(ml16MonChip).join("") || `<span class="away-return__none">伙伴已先回家，只剩收获待领取</span>`}</div>
            </div>
          </div>`,
      )
      .join("");
    rows.push(`
      <div class="row away-return ${ml16Returned.count ? "is-ready" : "is-empty"}" data-away-return="${ml16Returned.count}">
        <div class="row__left">
          <div class="row__title row__titleLine">
            ${renderUiIcon("friendshipBracelet", 20)}
            <span>外出归来 · 一键收取</span>
            <span class="tag tag--away-return-count">${ml16Returned.count ? `${ml16Returned.count} 处已归来待收取 · ${ml16Returned.partnerCount} 位伙伴` : "暂无待收取"}</span>
          </div>
          <div class="row__desc">${
            ml16Returned.count
              ? "这些伙伴已经降落 / 归营 / 带着回信回来了，但收取之前仍算外出、被防放生锁住。一键收取会逐个调用各玩法自己的收取，奖励、图鉴与经验照常发放，伙伴立刻回家。"
              : "已降落的气球、夜营归来的营地、带着回信回来的信使、满载归港的码头船员、体力耗尽的寻宝船队会在这里提示，一键就能全部收取、让伙伴回家。"
          }</div>
          ${ml16UnitsHtml ? `<div class="away-return__list">${ml16UnitsHtml}</div>` : ""}
          <div class="away-return__overview">${
            ml16AwayCounts.length
              ? `外出中 ${ml16AwayMap.size} 位：${ml16AwayCounts.map((x) => `${escapeHtml(x.a.title)} ${x.n}`).join(" · ")}`
              : "当前没有伙伴外出，所有伙伴都在家。"
          }</div>
        </div>
        <div class="row__right away-return__btns">
          <button type="button" class="btn btn--small${ml16Returned.count ? " btn--primary" : ""}" data-away-collect-all="1" ${ml16Returned.count ? "" : "disabled"}>一键收取已归来伙伴${ml16Returned.count ? `（${ml16Returned.count}）` : ""}</button>
        </div>
      </div>
    `);

    // ========== ML-16 Section: 萌灵「云端游乐园」(Cloud Amusement Park) ==========
    const hidePark = Boolean(ui.functionsHideCloudPark);
    const park = ensureCloudParkState(state);
    const parkAura = computeCloudParkAura(state);
    const ml16Coins = Math.max(0, Math.floor(state.res?.futurecoin?.value ?? 0));
    const ml16Pct = (n) => `${Math.round((Number(n) || 0) * 1000) / 10}%`;
    // 与 tick 结算用同一套属性解析（mon.types → 图鉴属性），保证界面显示的契合 / 速度与实际结算一致
    const ml16Opts = { getBeastDataByDex };
    const ml16TypeBadges = (types) =>
      (types || []).map((t) => `<span class="badge type type-${escapeHtml(t)}">${escapeHtml(TYPE_ZH?.[t] ?? t)}</span>`).join("");
    const ml16Aff = (m) => Math.max(0, Math.min(100, Math.floor(typeof m?.affection === "number" && Number.isFinite(m.affection) ? m.affection : 0)));
    const parkIdle = getIdleParkCandidates(state);
    const parkOps = PARK_RIDES.map((r) => ({
      r,
      unlocked: isParkRideUnlocked(state, r.id),
      m: park.operators[r.id] ? list.find((x) => x && x.id === park.operators[r.id]) || null : null,
    }));
    const parkStaffed = parkOps.filter((o) => o.m).length;
    const parkOpenRides = parkOps.filter((o) => o.unlocked).length;
    const parkShowFree = getParkShowFreeLeft(state);
    const canParkStaff = parkOps.some((o) => o.unlocked && !o.m) && parkIdle.length > 0;
    const canParkShow = parkOps.some((o) => o.unlocked && o.m) && (parkShowFree > 0 || ml16Coins >= PARK_SHOW_COIN_COST);
    const canParkGift = park.tickets >= PARK_GIFT_COST;
    const parkStarsTxt = `${"★".repeat(parkAura.stars)}${"☆".repeat(Math.max(0, parkAura.maxStars - parkAura.stars))}`;
    let parkModalHtml = "";

    rows.push(`
      <div class="row park-header ${parkStaffed ? "is-open" : ""}" data-cloud-park="1">
        <div class="row__left">
          <div class="row__title row__titleLine">
            ${renderUiIcon("cloudPark", 20)}
            <span>云端游乐园</span>
            <span class="tag tag--park-title">${escapeHtml(parkAura.title)} ${parkStarsTxt}</span>
            <span class="tag tag--park-count">${renderUiIcon("carouselRide", 14)}<span>值班 ${parkStaffed}/${parkOpenRides}</span></span>
            <span class="tag tag--park-count">${renderUiIcon("parkTicket", 14)}<span data-park-tickets="1">门票 ${park.tickets}/${PARK_TICKET_CAP}</span></span>
            <span class="tag tag--park-count"><span data-park-sat-tag="1">满意度 ${Math.floor(park.satisfaction)}</span></span>
          </div>
          <div class="row__desc">请空闲伙伴按属性到游乐设施值班：星光旋转木马（草 / 水 / 幻）、云朵摩天轮（风 / 光 / 暗）、彩虹过山车（火 / 电 / 岩）。属性契合的操作员转得快 1.5 倍、每轮让游客满意度多涨一些；满意度越高每轮游客越多、全产越高，办「游园活动」点亮的限时增益也更持久。值班中的伙伴自动享防放生保护，换班即可解除。</div>
        </div>
        <div class="row__right park-header__btns">
          <button type="button" class="btn btn--small${canParkStaff ? " btn--primary" : ""}" data-park-autostaff="1" ${canParkStaff ? "" : "disabled"}>一键排班</button>
          <button type="button" class="btn btn--small" data-park-show="1" ${canParkShow ? "" : "disabled"}>${parkShowFree > 0 ? "加场演出（今日免费）" : `加场演出（${PARK_SHOW_COIN_COST} 币）`}</button>
          <button type="button" class="btn btn--small btn--ticket" data-park-gift="1" ${canParkGift ? "" : "disabled"}>${renderUiIcon("parkTicket", 16)}<span>兑换礼包（${PARK_GIFT_COST} 张）</span></button>
          <button type="button" class="btn btn--small" data-park-dismiss="1" ${parkStaffed ? "" : "disabled"}>全部换班</button>
          <button type="button" class="btn btn--small btn--ghost" data-func-toggle="cloudPark">${hidePark ? "展开" : "收起"}</button>
        </div>
      </div>
    `);

    if (!hidePark) {
      const satTier = getParkSatisfactionTier(park.satisfaction);
      const parkRideLogHtml = PARK_RIDES.map((r) => {
        const rs = park.rides[r.id] || {};
        const open = isParkRideUnlocked(state, r.id);
        return `<div class="park-gate__logRow${open ? "" : " is-locked"}"><b>${escapeHtml(r.short)}</b><span>${open ? `已转 ${Math.floor(rs.rounds || 0)} 轮${rs.lastVisitors > 0 ? ` · 上一轮 ${Math.floor(rs.lastVisitors)} 位游客` : ""}${park.operators[r.id] ? "" : " · 操作台空着"}` : `累计游客 ${r.unlockVisitors} 位后建成`}</span></div>`;
      }).join("");
      const nextStarTxt = parkAura.nextStarAt != null ? `再接待 ${Math.max(0, parkAura.nextStarAt - parkAura.totalVisitors)} 位游客升 ★${parkAura.stars + 1}` : "游乐园已满星";
      const ridesHtml = parkOps
        .map(({ r, unlocked, m }) => {
          const headHtml = `
            <div class="park-ride__head">
              ${renderUiIcon("carouselRide", 26)}
              <div class="park-ride__titleBox">
                <div class="park-ride__name">${escapeHtml(r.name)}</div>
                <div class="park-ride__meta">${ml16TypeBadges(r.elements)}<span>每轮 ${r.roundMin} 分钟 · ${getParkRoundVisitors(r.id, park.satisfaction)} 位游客</span></div>
              </div>
            </div>`;
          if (!unlocked) {
            return `
              <div class="park-ride is-locked" data-park-ride="${escapeHtml(r.id)}">
                ${headHtml}
                <div class="park-ride__lock">累计接待游客 ${r.unlockVisitors} 位后建成开放（还差 ${Math.max(0, r.unlockVisitors - parkAura.totalVisitors)} 位）</div>
              </div>`;
          }
          const rv = ml16RideView(park, r);
          if (!m) {
            return `
              <div class="park-ride is-empty" data-park-ride="${escapeHtml(r.id)}">
                ${headHtml}
                <div class="park-ride__row">
                  <span class="park-ride__empty">操作台空着 · 设施停在第 ${rv.pct}%</span>
                  <button type="button" class="btn btn--small" data-park-open="${escapeHtml(r.id)}" ${parkIdle.length > 0 ? "" : "disabled"}>请伙伴值班</button>
                </div>
              </div>`;
          }
          const ev = evaluateParkOperator(m, r.id, ml16Opts);
          return `
            <div class="park-ride is-running${ev.match ? " is-match" : ""}" data-park-ride="${escapeHtml(r.id)}" data-park-operator="${m.id}">
              ${headHtml}
              <div class="park-ride__row">
                ${renderBeastIcon(m.dex, m.name, Boolean(m.isShiny))}
                <div class="park-ride__body">
                  <div class="park-ride__mon">${escapeHtml(m.name)} <span class="tag">Lv.${m.lvl || 1}</span>${ev.match ? `<span class="tag tag--park-match">属性契合</span>` : ""}</div>
                  <div class="park-ride__stat">速度 ×${ev.speed.toFixed(2)} · 每轮约 ${fmtDuration(ev.roundSec)} · 满意度 +${ev.satGain}/轮 · 亲密 ${ml16Aff(m)}/100</div>
                </div>
                <button type="button" class="btn btn--small btn--ghost" data-park-off="${m.id}">换班</button>
              </div>
              <div class="dock-progress park-ride-progress">
                <div class="dock-progress__bar"><i data-park-fill="${escapeHtml(r.id)}" style="width:${rv.pct}%"></i></div>
                <span class="dock-progress__txt" data-park-txt="${escapeHtml(r.id)}">${escapeHtml(ml16RideText(state, park, r))}</span>
              </div>
            </div>`;
        })
        .join("");

      const eventsHtml = PARK_EVENT_DEFS.map((e) => {
        const rem = Math.max(0, Number(park.buffs[e.id]) || 0);
        const addMin = Math.round((e.baseMin * satTier.eventMul * 60) / 60);
        const full = rem >= PARK_BUFF_MAX_SEC - 1;
        const can = park.tickets >= e.cost && !full;
        return `
          <div class="park-event${rem > 0 ? " is-on" : ""}" data-park-event-card="${escapeHtml(e.id)}" title="${escapeHtml(e.desc)}">
            <div class="park-event__name">${escapeHtml(e.name)}</div>
            <div class="park-event__effect">${escapeHtml(e.effectText)} · ${addMin} 分钟${satTier.eventMul > 1 ? `（×${satTier.eventMul}）` : ""}</div>
            <div class="park-event__rem" data-park-buff-rem="${escapeHtml(e.id)}">${rem > 0 ? `剩 ${fmtDuration(Math.ceil(rem))}` : "未生效"}</div>
            <button type="button" class="btn btn--small${can ? " btn--primary" : ""}" data-park-event="${escapeHtml(e.id)}" ${can ? "" : "disabled"}>${full ? "已达 4 小时上限" : `办活动（${e.cost} 张）`}</button>
          </div>`;
      }).join("");

      const le = park.lastEvent;
      const lastEventHtml = le
        ? `<div class="park-last">${renderUiIcon("parkTicket", 18)}<span>上次活动「${escapeHtml(getParkEventDef(le.eventId)?.name || "")}」续上 ${Math.round(le.addSec / 60)} 分钟${le.eventMul > 1 ? `（满意度加成 ×${le.eventMul}）` : ""}</span></div>`
        : "";
      const parkLogsHtml = (park.recentLogs || [])
        .slice(0, 2)
        .map((ln) => `<div class="camp-log-line">${escapeHtml(ln)}</div>`)
        .join("");

      rows.push(`
        <div class="row park-body">
          <div class="row__left" style="width:100%">
            <div class="park-top">
              <div class="park-gate" data-park-gate="1">
                <div class="park-gate__head">
                  ${renderUiIcon("cloudPark", 44)}
                  <div class="park-gate__titleBox">
                    <div class="park-gate__label">游客满意度 · ${escapeHtml(satTier.name)}</div>
                    <div class="park-gate__value"><span data-park-sat-num="1">${Math.floor(park.satisfaction)}</span><small>/ ${PARK_SAT_MAX}</small></div>
                    <div class="park-gate__sub"><span class="tag" data-park-sat-effect="1">${escapeHtml(ml16SatEffectText(park.satisfaction))}</span></div>
                  </div>
                </div>
                <div class="dock-progress park-sat-progress">
                  <div class="dock-progress__bar"><i data-park-sat-fill="1" style="width:${Math.max(0, Math.min(100, Math.floor(park.satisfaction)))}%"></i></div>
                  <span class="dock-progress__txt">每转完一轮 +1（属性契合 +3）· 每小时回落 ${PARK_SAT_DECAY_PER_HOUR} 点 · 办活动 +${PARK_EVENT_SAT_GAIN}</span>
                </div>
                <div class="park-gate__stars">
                  <span class="park-gate__starRow">${parkStarsTxt}</span>
                  <span>累计游客 ${parkAura.totalVisitors} 位 · ${escapeHtml(nextStarTxt)}</span>
                </div>
                <div class="park-gate__booth">
                  ${renderUiIcon("parkTicket", 30)}
                  <div class="park-gate__boothBody">
                    <div class="park-gate__boothName">售票亭 <b data-park-tickets-big="1">${park.tickets}</b> / ${PARK_TICKET_CAP} 张</div>
                    <div class="park-gate__boothMeta">每位游客 1 张门票 · 满了以后新门票会流失${park.ticketsLost ? `（累计流失 ${park.ticketsLost} 张）` : ""} · ${PARK_GIFT_COST} 张可换灵果 ${PARK_GIFT_REWARDS.catnip} + 灵木 ${PARK_GIFT_REWARDS.wood} + 未来币 ${PARK_GIFT_REWARDS.futurecoin}</div>
                  </div>
                </div>
                <div class="park-gate__log">
                  <div class="park-gate__logTitle">设施运转记录 · 累计 ${parkAura.totalRounds} 轮 · 办过 ${park.totalEvents || 0} 场活动</div>
                  ${parkRideLogHtml}
                </div>
              </div>
              <div class="park-rides">
                <div class="voyage-panel-title park-panel-title">${renderUiIcon("carouselRide", 18)}<span>游乐设施</span><span class="tag">按属性值班 · 契合 ×1.5</span></div>
                ${ridesHtml}
              </div>
            </div>
            <div class="park-events">
              <div class="voyage-panel-title park-panel-title">${renderUiIcon("parkTicket", 18)}<span>游园活动 · 限时增益</span><span class="tag">花门票办活动 · 基础 30 分钟 × 满意度倍率 · 可叠加，单项最多 4 小时</span></div>
              <div class="park-events__grid">${eventsHtml}</div>
            </div>
            <div class="park-bottom-row">
              <div class="eco-aura-strip">
                <span class="shiny-aura-pill ${parkAura.prodAdd > 0 ? "is-on" : ""}">全产 +${ml16Pct(parkAura.prodAdd)}</span>
                <span class="shiny-aura-pill ${parkAura.catchAdd > 0 ? "is-on" : ""}">捕获 +${ml16Pct(parkAura.catchAdd)}</span>
                <span class="shiny-aura-pill ${parkAura.shinyAdd > 0 ? "is-on" : ""}">闪光 +${ml16Pct(parkAura.shinyAdd)}</span>
                <span class="shiny-aura-pill ${parkAura.pveOutAdd > 0 ? "is-on" : ""}">PvE 增伤 +${ml16Pct(parkAura.pveOutAdd)}</span>
                <span class="shiny-aura-pill">累计 ${parkAura.totalRounds} 轮</span>
              </div>
              ${lastEventHtml}
              ${parkLogsHtml ? `<div class="star-camp-logs" style="margin-top:6px">${parkLogsHtml}</div>` : !lastEventHtml ? `<div class="voyage-last is-empty">游乐园还没开张：点「一键排班」请伙伴们到游乐设施值班吧。</div>` : ""}
            </div>
          </div>
        </div>
      `);

      const modalRide = typeof ui.parkModalRide === "string" ? getParkRideDef(ui.parkModalRide) : null;
      if (modalRide) {
        const rideFree = !park.operators[modalRide.id] && isParkRideUnlocked(state, modalRide.id);
        const modalMons = parkIdle
          .map((m) => ({ m, ev: evaluateParkOperator(m, modalRide.id, ml16Opts) }))
          .sort((a, b) => b.ev.speed - a.ev.speed || Math.floor(Number(b.m.lvl) || 1) - Math.floor(Number(a.m.lvl) || 1) || (a.m.id || 0) - (b.m.id || 0));
        const skipped = list.filter(Boolean).length - modalMons.length;
        const modalRowsHtml = modalMons.length
          ? modalMons
              .map(
                ({ m, ev }) => `
                  <div class="row func-mon-row ${ev.match ? "is-active" : ""}">
                    <div class="row__left">
                      <div class="row__title row__titleLine">${renderBeastIcon(m.dex, m.name, Boolean(m.isShiny))}<span>${escapeHtml(m.name)}</span><span class="tag">Lv.${m.lvl || 1}</span>${ev.match ? `<span class="tag tag--park-match">属性契合</span>` : ""}</div>
                      <div class="row__desc">${ml16TypeBadges(ev.types) || "-"} · 亲密 ${ml16Aff(m)}/100 · 速度 ×${ev.speed.toFixed(2)} · 每轮约 ${fmtDuration(ev.roundSec)} · 满意度 +${ev.satGain}/轮</div>
                    </div>
                    <div class="row__right">
                      <button type="button" class="btn btn--small btn--primary" data-park-modal-pick="${m.id}" ${rideFree ? "" : "disabled"}>值班</button>
                    </div>
                  </div>`,
              )
              .join("")
          : `<div class="muted" style="padding:12px">当前暂无空闲伙伴可以值班（训练、远征、出战、孵育、露营、沙盘以及码头、观察站、浮岛、寻宝远航、泡汤、送信、入梦、垂钓、烘焙、气球旅行、夜营观星与本命灵契中的伙伴已被安全过滤）。</div>`;
        parkModalHtml = `
          <div class="modalOverlay" data-park-modal-overlay="1">
            <div class="modal">
              <div class="modal__header">
                <div class="modal__title">${renderUiIcon("carouselRide", 20)}<span>请伙伴到「${escapeHtml(modalRide.name)}」值班</span><span class="tag">${rideFree ? "操作台空着" : "已有人值班"}</span></div>
                <div class="modal__right">
                  <button type="button" class="btn btn--small" data-park-modal-close="1">关闭</button>
                </div>
              </div>
              <div class="modal__desc">仅展示空闲伙伴（已过滤 ${Math.max(0, skipped)} 只忙碌中的伙伴）。${escapeHtml(modalRide.elements.map((t) => TYPE_ZH?.[t] ?? t).join(" / "))}系伙伴与「${escapeHtml(modalRide.name)}」契合：转得快 1.5 倍，每轮满意度 +3；亲密度每 10 点再快 5%。</div>
              <div class="modal__body">${modalRowsHtml}</div>
              <div class="actions">
                <button type="button" class="btn btn--primary" data-park-modal-close="1">完成</button>
              </div>
            </div>
          </div>`;
      }
    }

    // ========== ML-16 Section: 萌灵「星空露营观测」(Starry Night Camp & Sky Watch) ==========
    const hideStargaze = Boolean(ui.functionsHideStargaze);
    const sgCamp = ensureStargazeCampState(state);
    const sgBonus = computeStargazeCampBonus(state);
    const sgSky = getStargazeSkyRotation();
    const sgIdle = getIdleStargazeCandidates(state);
    const sgFireFree = getStargazeFireFreeLeft(state);
    const sgFreeSites = sgCamp.sites.filter((x) => !x.trip).length;
    const canSgDispatch = sgFreeSites > 0 && sgIdle.length > 0;
    const canSgFire = sgBonus.camping > 0 && (sgFireFree > 0 || ml16Coins >= STARGAZE_FIRE_COIN_COST);
    const sgResTxt = (res) =>
      Object.entries(res || {})
        .filter(([, n]) => n > 0)
        .map(([rid, n]) => `${STARGAZE_RES_ZH[rid] || rid} +${n}`)
        .join(" · ");
    const sgEntryName = (id) => getStargazeEntryDef(id)?.def?.name || id;
    let stargazeModalHtml = "";

    rows.push(`
      <div class="row stargaze-header ${sgBonus.camping ? "is-camping" : ""}" data-stargaze-camp="1">
        <div class="row__left">
          <div class="row__title row__titleLine">
            ${renderUiIcon("starCamp", 20)}
            <span>星空露营观测</span>
            <span class="tag tag--stargaze-title">${escapeHtml(sgBonus.title)}</span>
            <span class="tag tag--stargaze-count">${renderUiIcon("starCamp", 14)}<span>夜营 ${sgBonus.camping}/${STARGAZE_SITE_COUNT}${sgBonus.returned ? ` · 待收取 ${sgBonus.returned}` : ""}</span></span>
            <span class="tag tag--stargaze-count">${renderUiIcon("meteorSighting", 14)}<span>图鉴 ${sgBonus.entries}/${sgBonus.totalEntries}</span></span>
            <span class="tag tag--stargaze-count">${renderUiIcon("campfireBadge", 14)}<span>${escapeHtml(sgBonus.badgeName)}</span></span>
          </div>
          <div class="row__desc">派伙伴背上帐篷去营地夜营观星：星空按本地时间每 6 小时轮换（同时可见 3 个星座），流星雨每天换一种，19:00~05:00 出发是夜观时段、流星更容易出现。天亮归营后每位伙伴带回观测记录，登记进观测图鉴，集齐 4 / 8 / 12 / 18 条升为铜 / 银 / 金 / 星辉营火徽章。夜营中（含归营待收取）的伙伴自动享防放生保护。</div>
        </div>
        <div class="row__right stargaze-header__btns">
          <button type="button" class="btn btn--small${canSgDispatch ? " btn--primary" : ""}" data-stargaze-autodispatch="1" ${canSgDispatch ? "" : "disabled"}>一键夜营</button>
          <button type="button" class="btn btn--small${sgBonus.returned ? " btn--primary" : ""}" data-stargaze-claim-all="1" ${sgBonus.returned ? "" : "disabled"}>收取观测记录${sgBonus.returned ? `（${sgBonus.returned}）` : ""}</button>
          <button type="button" class="btn btn--small btn--ticket" data-stargaze-fire="1" ${canSgFire ? "" : "disabled"}>${renderUiIcon("campfireBadge", 16)}<span>${sgFireFree > 0 ? "添柴守夜（今日免费）" : `添柴守夜（${STARGAZE_FIRE_COIN_COST} 币）`}</span></button>
          <button type="button" class="btn btn--small btn--ghost" data-func-toggle="stargazeCamp">${hideStargaze ? "展开" : "收起"}</button>
        </div>
      </div>
    `);

    if (!hideStargaze) {
      const skyChips = sgSky.visible
        .map((c) => {
          const got = (sgCamp.atlas[c.id]?.count || 0) > 0;
          return `<span class="stargaze-chip kind-star${got ? " is-got" : ""}" title="${escapeHtml(c.desc)}"><i class="stargaze-dot"></i><span>${escapeHtml(c.name)}</span>${ml16TypeBadges([c.element])}</span>`;
        })
        .join("");
      const showerGot = (sgCamp.atlas[sgSky.shower.id]?.count || 0) > 0;
      const sgNowMs = Date.now();
      const sgUpcomingHtml = [0, 1, 2]
        .map((k) => {
          const at = sgNowMs + sgSky.msUntilNext + k * 6 * 3600 * 1000;
          const rot = getStargazeSkyRotation(at + 1000);
          const c = rot.visible[rot.visible.length - 1];
          const d = new Date(at);
          return `<div class="stargaze-sky__nextRow"><b>${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}</b><span>「${escapeHtml(c.name)}」升起</span>${ml16TypeBadges([c.element])}</div>`;
        })
        .join("");
      const sitesHtml = sgCamp.sites
        .map((x, i) => {
          const site = STARGAZE_SITES[i];
          const trip = x.trip;
          const headHtml = `
            <div class="stargaze-site__head">
              ${renderUiIcon("starCamp", 30)}
              <div class="stargaze-site__titleBox">
                <div class="stargaze-site__name">${escapeHtml(site.name)}${trip ? (trip.phase === "returned" ? " · 天亮归营" : " · 夜营中") : ""}</div>
                <div class="stargaze-site__meta">${ml16TypeBadges(site.elements)}<span>夜营 ${site.campMin} 分钟 · 流星 ${Math.round(site.meteorChance * 100)}% 起</span></div>
              </div>
            </div>`;
          if (!trip) {
            return `
              <div class="stargaze-site is-idle" data-stargaze-site="${i}" data-stargaze-phase="idle">
                ${headHtml}
                <div class="stargaze-site__desc">${escapeHtml(site.desc)}</div>
                <div class="stargaze-site__actions"><button type="button" class="btn btn--small" data-stargaze-open="${i}" ${sgIdle.length > 0 ? "" : "disabled"}>挑选伙伴出发</button></div>
              </div>`;
          }
          const campers = trip.camperIds.map((id) => list.find((m) => m && m.id === id) || null).filter(Boolean);
          const camperHtml = campers.length
            ? campers
                .map((m) => {
                  const ev = evaluateStargazeCamper(m, site.id, { ...ml16Opts, night: trip.night });
                  return `<span class="stargaze-camper${ev?.match ? " is-match" : ""}">${renderBeastIcon(m.dex, m.name, Boolean(m.isShiny))}<span>${escapeHtml(m.name)}</span>${ev?.match ? `<span class="tag tag--stargaze-match">契合</span>` : ""}</span>`;
                })
                .join("")
            : `<span class="stargaze-site__meta">伙伴已经先回家了</span>`;
          const lockedSky = `${trip.skyIds.map((id) => `「${escapeHtml(sgEntryName(id))}」`).join("")} · ${escapeHtml(getStargazeShowerDef(trip.showerId)?.name || "")}${trip.night ? " · 夜观" : ""}`;
          if (trip.phase === "returned") {
            const haulHtml = trip.haul.length
              ? trip.haul
                  .map((h) => {
                    const isNew = !((sgCamp.atlas[h.id]?.count || 0) > 0);
                    return `<span class="stargaze-chip kind-${h.kind === "meteor" ? "meteor" : "star"} is-got">${h.kind === "meteor" ? renderUiIcon("meteorSighting", 18) : `<i class="stargaze-dot"></i>`}<span>${escapeHtml(sgEntryName(h.id))}</span>${isNew ? `<span class="tag tag--stargaze-new">新</span>` : ""}</span>`;
                  })
                  .join("")
              : `<span class="stargaze-site__meta">这一夜云有点厚，只带回了好心情</span>`;
            return `
              <div class="stargaze-site is-returned" data-stargaze-site="${i}" data-stargaze-phase="returned">
                ${headHtml}
                <div class="stargaze-site__campers">${camperHtml}</div>
                <div class="stargaze-site__sky">出发时的星空：${lockedSky}</div>
                <div class="stargaze-site__haul">${haulHtml}</div>
                <div class="stargaze-site__actions"><button type="button" class="btn btn--small btn--primary" data-stargaze-claim="${i}">收取观测记录</button></div>
              </div>`;
          }
          const cv = ml16CampView(trip);
          return `
            <div class="stargaze-site is-camping" data-stargaze-site="${i}" data-stargaze-phase="camping">
              ${headHtml}
              <div class="stargaze-site__campers">${camperHtml}</div>
              <div class="stargaze-site__sky">锁定星空：${lockedSky}</div>
              <div class="dock-progress stargaze-camp-progress">
                <div class="dock-progress__bar"><i data-stargaze-fill="${i}" style="width:${cv.pct}%"></i></div>
                <span class="dock-progress__txt" data-stargaze-txt="${i}">${escapeHtml(cv.text)}</span>
              </div>
              <div class="stargaze-site__actions"><button type="button" class="btn btn--small btn--ghost" data-stargaze-recall="${i}">撤营</button></div>
            </div>`;
        })
        .join("");

      const badgesHtml = STARGAZE_BADGE_TIERS.map(
        (t) => `<span class="stargaze-badge tier-${t.tier}${sgBonus.badgeTier >= t.tier ? " is-on" : ""}">${renderUiIcon("campfireBadge", 26)}<span>${escapeHtml(t.name)}</span><small>${t.minEntries} 条</small></span>`,
      ).join("");
      const starCellsHtml = STARGAZE_CONSTELLATIONS.map((c) => {
        const cnt = sgCamp.atlas[c.id]?.count || 0;
        const visible = sgSky.visibleIds.includes(c.id);
        return `
          <div class="stargaze-atlas__cell kind-star${cnt > 0 ? " is-got" : " is-unknown"}${visible ? " is-visible" : ""}" data-stargaze-entry="${escapeHtml(c.id)}" title="${escapeHtml(c.desc)}">
            <i class="stargaze-dot"></i>
            <div class="stargaze-atlas__info">
              <div class="stargaze-atlas__name">${escapeHtml(c.name)}</div>
              <div class="stargaze-atlas__meta">${ml16TypeBadges([c.element])}<span>${cnt > 0 ? `×${cnt}` : visible ? "今夜可见" : "未登记"}</span></div>
            </div>
          </div>`;
      }).join("");
      const showerCellsHtml = STARGAZE_SHOWERS.map((sh) => {
        const cnt = sgCamp.atlas[sh.id]?.count || 0;
        const today = sh.id === sgSky.shower.id;
        return `
          <div class="stargaze-atlas__cell kind-meteor${cnt > 0 ? " is-got" : " is-unknown"}${today ? " is-visible" : ""}" data-stargaze-entry="${escapeHtml(sh.id)}" title="${escapeHtml(sh.desc)}">
            ${renderUiIcon("meteorSighting", 30)}
            <div class="stargaze-atlas__info">
              <div class="stargaze-atlas__name">${escapeHtml(sh.name)}</div>
              <div class="stargaze-atlas__meta"><span>${cnt > 0 ? `×${cnt}` : today ? "今天出现" : "未登记"}</span></div>
            </div>
          </div>`;
      }).join("");

      const lc = sgCamp.lastClaim;
      const claimHtml = lc
        ? `<div class="stargaze-last">${renderUiIcon("meteorSighting", 18)}<span>上次收取「${escapeHtml(getStargazeSiteDef(lc.siteId)?.name || "星空营地")}」${lc.count} 条观测记录${lc.newEntries?.length ? `（新登记 ${lc.newEntries.length} 条）` : ""}：${escapeHtml(sgResTxt(lc.rewards) || "一整夜的好梦")}</span></div>`
        : "";
      const sgLogsHtml = (sgCamp.recentLogs || [])
        .filter((ln) => !(lc && ln.startsWith("【收取观测记录】")))
        .slice(0, 2)
        .map((ln) => `<div class="camp-log-line">${escapeHtml(ln)}</div>`)
        .join("");

      rows.push(`
        <div class="row stargaze-body">
          <div class="row__left" style="width:100%">
            <div class="stargaze-top">
              <div class="stargaze-sky" data-stargaze-rotation="${sgSky.index}" data-stargaze-shower="${escapeHtml(sgSky.shower.id)}">
                <div class="stargaze-sky__head">
                  ${renderUiIcon("meteorSighting", 44)}
                  <div class="stargaze-sky__titleBox">
                    <div class="stargaze-sky__label">此刻的星空${sgSky.isNight ? " · 夜观时段（流星 ×1.5）" : " · 白昼 / 黄昏（19:00 起夜观）"}</div>
                    <div class="stargaze-sky__name">${sgSky.visible.map((c) => `「${escapeHtml(c.name)}」`).join(" ")}</div>
                    <div class="stargaze-sky__sub"><span class="tag" data-stargaze-rotate-txt="1">${escapeHtml(ml16SkyText(sgSky))}</span></div>
                  </div>
                </div>
                <div class="stargaze-sky__chips">${skyChips}</div>
                <div class="stargaze-shower${showerGot ? " is-got" : ""}">
                  ${renderUiIcon("meteorSighting", 30)}
                  <div class="stargaze-shower__body">
                    <div class="stargaze-shower__name">今天的流星雨：${escapeHtml(sgSky.shower.name)}${showerGot ? `<span class="tag tag--stargaze-match">已登记</span>` : ""}</div>
                    <div class="stargaze-shower__desc">${escapeHtml(sgSky.shower.desc)} 明天轮到「${escapeHtml(sgSky.nextShower.name)}」。</div>
                  </div>
                </div>
                <div class="stargaze-sky__next">
                  <div class="stargaze-sky__nextTitle">接下来的星空（每 6 小时升起一个新星座）</div>
                  ${sgUpcomingHtml}
                  <div class="stargaze-sky__nextRow is-night"><b>19:00~05:00</b><span>夜观时段：这段时间出发，流星概率 ×1.5</span></div>
                </div>
              </div>
              <div class="stargaze-sites">
                <div class="voyage-panel-title stargaze-panel-title">${renderUiIcon("starCamp", 18)}<span>营地</span><span class="tag">每处最多 ${STARGAZE_SEATS} 位 · 营地契合多记星座、流星 +10%</span></div>
                ${sitesHtml}
              </div>
            </div>
            <div class="stargaze-atlas">
              <div class="voyage-panel-title stargaze-panel-title">${renderUiIcon("campfireBadge", 18)}<span>观测图鉴与营火徽章</span><span class="tag">${sgBonus.entries}/${sgBonus.totalEntries} 条 · 星座 ${sgBonus.stars}/${sgBonus.totalStars} · 流星雨 ${sgBonus.showers}/${sgBonus.totalShowers}${sgBonus.nextTier ? ` · 再登记 ${sgBonus.nextTier.minEntries - sgBonus.entries} 条升${escapeHtml(sgBonus.nextTier.name)}` : " · 营火徽章已满级"}</span></div>
              <div class="stargaze-badges">${badgesHtml}</div>
              <div class="stargaze-atlas__group">星座（每个 全产 +0.15%）</div>
              <div class="stargaze-atlas__grid">${starCellsHtml}</div>
              <div class="stargaze-atlas__group">流星雨（每种 闪光 +1.5%）</div>
              <div class="stargaze-atlas__grid is-meteor">${showerCellsHtml}</div>
            </div>
            <div class="stargaze-bottom-row">
              <div class="eco-aura-strip">
                <span class="shiny-aura-pill ${sgBonus.prodAdd > 0 ? "is-on" : ""}">全产 +${ml16Pct(sgBonus.prodAdd)}</span>
                <span class="shiny-aura-pill ${sgBonus.catchAdd > 0 ? "is-on" : ""}">捕获 +${ml16Pct(sgBonus.catchAdd)}</span>
                <span class="shiny-aura-pill ${sgBonus.shinyAdd > 0 ? "is-on" : ""}">闪光 +${ml16Pct(sgBonus.shinyAdd)}</span>
                <span class="shiny-aura-pill ${sgBonus.pveOutAdd > 0 ? "is-on" : ""}">PvE 增伤 +${ml16Pct(sgBonus.pveOutAdd)}</span>
                <span class="shiny-aura-pill">累计夜营 ${sgBonus.totalNights} 晚</span>
              </div>
              ${claimHtml}
              ${sgLogsHtml ? `<div class="star-camp-logs" style="margin-top:6px">${sgLogsHtml}</div>` : !claimHtml ? `<div class="voyage-last is-empty">还没有夜营记录：点「一键夜营」请伙伴们背上帐篷去看星星吧。</div>` : ""}
            </div>
          </div>
        </div>
      `);

      const draft = ui.stargazeModal && typeof ui.stargazeModal === "object" ? ui.stargazeModal : null;
      const draftIdx = draft ? Math.floor(Number(draft.idx)) : -1;
      if (draft && draftIdx >= 0 && draftIdx < STARGAZE_SITE_COUNT && !sgCamp.sites[draftIdx].trip) {
        const site = STARGAZE_SITES[draftIdx];
        const idleIdSet = new Set(sgIdle.map((m) => m.id));
        draft.ids = (Array.isArray(draft.ids) ? draft.ids : []).filter((id) => idleIdSet.has(id)).slice(0, STARGAZE_SEATS);
        const modalMons = sgIdle
          .map((m) => ({ m, ev: evaluateStargazeCamper(m, site.id, { ...ml16Opts, night: sgSky.isNight }) }))
          .filter((x) => x.ev)
          .sort((a, b) => Number(b.ev.match) - Number(a.ev.match) || Math.floor(Number(b.m.lvl) || 1) - Math.floor(Number(a.m.lvl) || 1) || (a.m.id || 0) - (b.m.id || 0));
        const skipped = list.filter(Boolean).length - modalMons.length;
        const seatsFull = draft.ids.length >= STARGAZE_SEATS;
        const modalRowsHtml = modalMons.length
          ? modalMons
              .map(({ m, ev }) => {
                const picked = draft.ids.includes(m.id);
                const fav = getStargazeStarOdds(m, sgSky.visibleIds, ml16Opts)
                  .filter((o) => o.weight > 1)
                  .map((o) => sgEntryName(o.id));
                return `
                  <div class="row func-mon-row ${picked ? "is-active" : ""}">
                    <div class="row__left">
                      <div class="row__title row__titleLine">${renderBeastIcon(m.dex, m.name, Boolean(m.isShiny))}<span>${escapeHtml(m.name)}</span><span class="tag">Lv.${m.lvl || 1}</span>${ev.match ? `<span class="tag tag--stargaze-match">营地契合</span>` : ""}</div>
                      <div class="row__desc">${ml16TypeBadges(ev.types) || "-"} · 流星概率 ${Math.round(ev.meteorChance * 100)}%${ev.match ? ` · 多记一个星座 ${Math.round(ev.extraChance * 100)}%` : ""}${fav.length ? ` · 更容易认出「${escapeHtml(fav.join("」「"))}」` : ""}</div>
                    </div>
                    <div class="row__right">
                      <button type="button" class="btn btn--small${picked ? " btn--primary" : ""}" data-stargaze-modal-pick="${m.id}" ${picked || !seatsFull ? "" : "disabled"}>${picked ? "已入营" : "入营"}</button>
                    </div>
                  </div>`;
              })
              .join("")
          : `<div class="muted" style="padding:12px">当前暂无空闲伙伴可以夜营（训练、远征、出战、孵育、露营、沙盘以及码头、观察站、浮岛、寻宝远航、泡汤、送信、入梦、垂钓、烘焙、气球旅行、游乐园值班与本命灵契中的伙伴已被安全过滤）。</div>`;
        stargazeModalHtml = `
          <div class="modalOverlay" data-stargaze-modal-overlay="1">
            <div class="modal">
              <div class="modal__header">
                <div class="modal__title">${renderUiIcon("starCamp", 20)}<span>去「${escapeHtml(site.name)}」夜营</span><span class="tag">已入营 ${draft.ids.length}/${STARGAZE_SEATS}</span></div>
                <div class="modal__right">
                  <button type="button" class="btn btn--small" data-stargaze-modal-close="1">关闭</button>
                </div>
              </div>
              <div class="modal__desc">仅展示空闲伙伴（已过滤 ${Math.max(0, skipped)} 只忙碌中的伙伴）。${escapeHtml(site.elements.map((t) => TYPE_ZH?.[t] ?? t).join(" / "))}系伙伴与「${escapeHtml(site.name)}」契合：${Math.round(STARGAZE_MATCH_EXTRA_CHANCE * 100)}% 概率多记一个星座，流星概率 +10%。出发时锁定此刻的星空${sgSky.isNight ? "（夜观时段，流星 ×1.5）" : ""}，约 ${site.campMin} 分钟后天亮归营。</div>
              <div class="modal__body">${modalRowsHtml}</div>
              <div class="actions">
                <button type="button" class="btn btn--small" data-stargaze-modal-close="1">取消</button>
                <button type="button" class="btn btn--primary" data-stargaze-modal-go="1" ${draft.ids.length ? "" : "disabled"}>出发夜营（${draft.ids.length}/${STARGAZE_SEATS}）</button>
              </div>
            </div>
          </div>`;
      }
    }

    // ========== ML-15 Section: 萌灵「云朵甜点烘焙坊」(Cloud Dessert Bakery) ==========
    const hideBakery = Boolean(ui.functionsHideBakery);
    const bakery = ensureBakeryState(state);
    const bakeryAura = computeBakeryAura(state);
    const ml15Coins = Math.max(0, Math.floor(state.res?.futurecoin?.value ?? 0));
    const ml15Pct = (n) => `${Math.round((Number(n) || 0) * 1000) / 10}%`;
    // 与 tick 结算用同一套属性解析（mon.types → 图鉴属性），保证界面显示的契合 / 速度与实际结算一致
    const ml15Opts = { getBeastDataByDex };
    const ml15TypeBadges = (types) =>
      (types || []).map((t) => `<span class="badge type type-${escapeHtml(t)}">${escapeHtml(TYPE_ZH?.[t] ?? t)}</span>`).join("");
    const ml15Aff = (m) => Math.max(0, Math.min(100, Math.floor(typeof m?.affection === "number" && Number.isFinite(m.affection) ? m.affection : 0)));
    const ml15Stars = (q) => "★".repeat(Math.max(1, Math.min(3, Math.floor(Number(q) || 1))));
    const bakeryIdle = getIdleBakeryCandidates(state);
    const bakeryWorkers = BAKERY_STATIONS.map((s) => ({
      s,
      m: bakery.workers[s.id] ? list.find((x) => x && x.id === bakery.workers[s.id]) || null : null,
    }));
    const bakeryStaffed = bakeryWorkers.filter((w) => w.m).length;
    const bakeryRushFree = getBakeryRushFreeLeft(state);
    const bakeryCaseN = bakery.showcase.length;
    const canBakeryRush = bakeryStaffed > 0 && bakeryCaseN < BAKERY_CASE_CAP && (bakeryRushFree > 0 || ml15Coins >= BAKERY_RUSH_COIN_COST);
    const canBakeryStaff = bakeryStaffed < BAKERY_MAX_WORKERS && bakeryIdle.length > 0;
    const bakeryRecipe = getBakeryRecipeDef(bakery.recipeId) || BAKERY_RECIPE_DEFS[0];
    let bakeryModalHtml = "";

    rows.push(`
      <div class="row bakery-header ${bakeryStaffed ? "is-baking" : ""}" data-cloud-bakery="1">
        <div class="row__left">
          <div class="row__title row__titleLine">
            ${renderUiIcon("bakeryOven", 20)}
            <span>云朵甜点烘焙坊</span>
            <span class="tag tag--bakery-title">${escapeHtml(bakeryAura.title)}</span>
            <span class="tag tag--bakery-count">${renderUiIcon("bakeryOven", 14)}<span>上岗 ${bakeryStaffed}/${BAKERY_MAX_WORKERS}</span></span>
            <span class="tag tag--bakery-count">${renderUiIcon("cloudCake", 14)}<span>甜点柜 ${bakeryCaseN}/${BAKERY_CASE_CAP}</span></span>
            <span class="tag tag--bakery-count">${renderUiIcon("recipeCard", 14)}<span>食谱 ${bakeryAura.recipesCollected}/${bakeryAura.totalRecipes}</span></span>
          </div>
          <div class="row__desc">请空闲伙伴按属性分工上岗：揉面台（水 / 草 / 岩）→ 云朵烤炉（火 / 电 / 光）→ 装饰台（风 / 暗 / 幻），一炉甜点依次走完三道工序就出炉进甜点柜。工位属性契合的伙伴做得快 1.5 倍，契合的工位越多品质越高（★3 完美）。「享用」甜点点亮限时增益，第一次出炉的甜点收进食谱图鉴并永久提升全产。上岗中的伙伴自动享防放生保护，下班即可解除。</div>
        </div>
        <div class="row__right bakery-header__btns">
          <button type="button" class="btn btn--small${canBakeryStaff ? " btn--primary" : ""}" data-bakery-autostaff="1" ${canBakeryStaff ? "" : "disabled"}>一键排班</button>
          <button type="button" class="btn btn--small" data-bakery-rush="1" ${canBakeryRush ? "" : "disabled"}>${bakeryRushFree > 0 ? "加急出炉（今日免费）" : `加急出炉（${BAKERY_RUSH_COIN_COST} 币）`}</button>
          <button type="button" class="btn btn--small${bakeryCaseN ? " btn--primary" : ""}" data-bakery-box="1" ${bakeryCaseN ? "" : "disabled"}>装盒送出${bakeryCaseN ? `（${bakeryCaseN}）` : ""}</button>
          <button type="button" class="btn btn--small" data-bakery-dismiss="1" ${bakeryStaffed ? "" : "disabled"}>全部下班</button>
          <button type="button" class="btn btn--small btn--ghost" data-func-toggle="cloudBakery">${hideBakery ? "展开" : "收起"}</button>
        </div>
      </div>
    `);

    if (!hideBakery) {
      const stageView = ml15StageView(state, bakery);
      const quality = getBakeryBatchQuality(state, ml15Opts);
      const curBuff = getBakeryBuffDef(bakeryRecipe.buffId);
      const stepsHtml = BAKERY_STATIONS.map((s, idx) => {
        const cls = idx < stageView.stageIdx ? "is-done" : idx === stageView.stageIdx ? "is-current" : "is-todo";
        return `<div class="bakery-step ${cls}" data-bakery-step="${escapeHtml(s.id)}"><span class="bakery-step__no">${idx + 1}</span><span class="bakery-step__name">${escapeHtml(s.verb)}</span><span class="bakery-step__work">${bakeryRecipe.work[s.id]} 工时</span></div>`;
      }).join("");

      const stationsHtml = bakeryWorkers
        .map(({ s, m }) => {
          const headHtml = `<div class="bakery-station__head"><span class="bakery-station__name">${escapeHtml(s.name)}</span>${ml15TypeBadges(s.elements)}</div>`;
          if (!m) {
            return `
              <div class="bakery-station is-empty" data-bakery-station="${escapeHtml(s.id)}">
                ${headHtml}
                <div class="bakery-station__row">
                  ${renderUiIcon("bakeryOven", 26)}
                  <span class="bakery-station__empty">${bakeryStaffed ? "空工位 · 其他伙伴临时帮忙（慢）" : "空工位"}</span>
                  <button type="button" class="btn btn--small" data-bakery-open="${escapeHtml(s.id)}" ${bakeryIdle.length > 0 ? "" : "disabled"}>请伙伴上岗</button>
                </div>
              </div>`;
          }
          const ev = evaluateBakeryWorker(m, s.id, ml15Opts);
          return `
            <div class="bakery-station is-filled${ev.match ? " is-match" : ""}" data-bakery-station="${escapeHtml(s.id)}" data-bakery-worker="${m.id}">
              ${headHtml}
              <div class="bakery-station__row">
                ${renderBeastIcon(m.dex, m.name, Boolean(m.isShiny))}
                <div class="bakery-station__body">
                  <div class="bakery-station__mon">${escapeHtml(m.name)} <span class="tag">Lv.${m.lvl || 1}</span>${ev.match ? `<span class="tag tag--bakery-match">属性契合</span>` : ""}</div>
                  <div class="bakery-station__meta">速度 ${ev.perMin.toFixed(2)} 工时/分 · 亲密 ${ml15Aff(m)}/100</div>
                </div>
                <button type="button" class="btn btn--small btn--ghost" data-bakery-off="${m.id}">下班</button>
              </div>
            </div>`;
        })
        .join("");

      const caseGroups = new Map();
      for (const d of bakery.showcase) {
        const g = caseGroups.get(d.recipeId) || { n: 0, best: 0 };
        g.n += 1;
        g.best = Math.max(g.best, d.q);
        caseGroups.set(d.recipeId, g);
      }
      const caseHtml = caseGroups.size
        ? [...caseGroups.entries()]
            .map(([rid, g]) => {
              const r = getBakeryRecipeDef(rid);
              const b = getBakeryBuffDef(r?.buffId);
              return `<div class="bakery-dessert" data-bakery-dessert="${escapeHtml(rid)}">${renderUiIcon("cloudCake", 28)}<div class="bakery-dessert__body"><div class="bakery-dessert__name">${escapeHtml(r?.name || rid)} ×${g.n}</div><div class="bakery-dessert__meta">最佳 ${ml15Stars(g.best)} · ${escapeHtml(b?.name || "")} ${escapeHtml(b?.effectText || "")}</div></div><button type="button" class="btn btn--small" data-bakery-eat="${escapeHtml(rid)}">享用</button></div>`;
            })
            .join("")
        : `<span class="bakery-case__empty">甜点柜空空的，等第一炉甜点出炉吧。</span>`;
      const buffsHtml = BAKERY_BUFF_DEFS.map((b) => {
        const rem = Math.max(0, Number(bakery.buffs[b.id]) || 0);
        return `<span class="bakery-buff${rem > 0 ? " is-on" : ""}" data-bakery-buff="${escapeHtml(b.id)}"><b>${escapeHtml(b.name)}</b><span>${escapeHtml(b.effectText)}</span><span class="bakery-buff__rem" data-bakery-buff-rem="${escapeHtml(b.id)}">${rem > 0 ? `剩 ${fmtDuration(Math.ceil(rem))}` : "未生效"}</span></span>`;
      }).join("");

      const bookHtml = BAKERY_RECIPE_DEFS.map((r) => {
        const e = bakery.recipes[r.id];
        const got = Boolean(e && e.baked > 0);
        const unlocked = isBakeryRecipeUnlocked(state, r.id);
        const isCur = r.id === bakeryRecipe.id;
        const b = getBakeryBuffDef(r.buffId);
        let footHtml = "";
        if (!unlocked) footHtml = `<div class="bakery-recipe__lock">再收录 ${Math.max(0, r.unlockRecipes - bakeryAura.recipesCollected)} 份食谱解锁</div>`;
        else if (isCur) footHtml = `<span class="tag tag--bakery-current">正在烤</span>`;
        else footHtml = `<button type="button" class="btn btn--small" data-bakery-recipe="${escapeHtml(r.id)}">换这份烤</button>`;
        return `
          <div class="bakery-recipe recipe-tier-${r.tier}${got ? " is-got" : ""}${unlocked ? "" : " is-locked"}${isCur ? " is-current" : ""}" data-bakery-recipe-card="${escapeHtml(r.id)}" title="${escapeHtml(r.desc)}">
            <div class="bakery-recipe__head">
              ${renderUiIcon("recipeCard", 30)}
              <div class="bakery-recipe__titleBox">
                <div class="bakery-recipe__name">${escapeHtml(r.name)}</div>
                <div class="bakery-recipe__meta">${escapeHtml(b?.name || "")} ${escapeHtml(b?.effectText || "")} · ${r.buffMin} 分钟</div>
              </div>
            </div>
            <div class="bakery-recipe__work">${BAKERY_STATIONS.map((s) => `${escapeHtml(s.verb)} ${r.work[s.id]}`).join(" · ")}</div>
            <div class="bakery-recipe__stat">${got ? `已出炉 ×${e.baked} · 最佳 ${ml15Stars(e.bestQ)}` : unlocked ? "尚未收录 · 烤出第一份即收录" : "尚未解锁"}</div>
            <div class="bakery-recipe__foot">${footHtml}</div>
          </div>`;
      }).join("");

      const lx = bakery.lastBox;
      const boxHtml = lx
        ? `<div class="bakery-last">${renderUiIcon("cloudCake", 18)}<span>上次装盒 ${lx.count} 份：${escapeHtml(
            Object.entries(lx.rewards || {})
              .map(([rid, n]) => `${BAKERY_RES_ZH[rid] || rid} +${n}`)
              .join(" · ") || "满满的心意",
          )}</span></div>`
        : "";
      const bakeryLogsHtml = (bakery.recentLogs || [])
        .filter((ln) => !(lx && ln.startsWith("【装盒送出】")))
        .slice(0, 2)
        .map((ln) => `<div class="camp-log-line">${escapeHtml(ln)}</div>`)
        .join("");

      rows.push(`
        <div class="row bakery-body">
          <div class="row__left" style="width:100%">
            <div class="bakery-top">
              <div class="bakery-oven" data-bakery-recipe-now="${escapeHtml(bakeryRecipe.id)}" data-bakery-stage-now="${stageView.stageIdx}">
                <div class="bakery-oven__head">
                  ${renderUiIcon("cloudCake", 44)}
                  <div class="bakery-oven__titleBox">
                    <div class="bakery-oven__label">正在烤的这一炉 · 预计品质 ${ml15Stars(quality.stars)}（契合工位 ${quality.matched}/${BAKERY_MAX_WORKERS}）</div>
                    <div class="bakery-oven__name">「${escapeHtml(bakeryRecipe.name)}」</div>
                    <div class="bakery-oven__sub"><span class="tag tag--bakery-buff">享用：${escapeHtml(curBuff?.name || "")} ${escapeHtml(curBuff?.effectText || "")} · ${bakeryRecipe.buffMin} 分钟起</span><span class="tag">共 ${getBakeryRecipeWork(bakeryRecipe.id)} 工时</span></div>
                  </div>
                </div>
                <div class="bakery-steps">${stepsHtml}</div>
                <div class="dock-progress bakery-stage-progress">
                  <div class="dock-progress__bar"><i data-bakery-stage-fill="1" style="width:${stageView.pct}%"></i></div>
                  <span class="dock-progress__txt" data-bakery-stage-txt="1">${escapeHtml(stageView.text)}</span>
                </div>
                <div class="bakery-oven__rate" data-bakery-rate-txt="1">${escapeHtml(ml15RateText(state, bakery))}</div>
              </div>
              <div class="bakery-stations">
                <div class="voyage-panel-title bakery-panel-title">${renderUiIcon("bakeryOven", 18)}<span>工位</span><span class="tag">按属性分工 · 契合 ×1.5</span></div>
                ${stationsHtml}
              </div>
            </div>
            <div class="bakery-case">
              <div class="voyage-panel-title bakery-panel-title">${renderUiIcon("cloudCake", 18)}<span>甜点柜</span><span class="tag">${bakeryCaseN}/${BAKERY_CASE_CAP} 份 · 享用点亮限时增益（单项最多 6 小时）· 装盒换灵果与未来币</span></div>
              <div class="bakery-case__items">${caseHtml}</div>
              <div class="bakery-buffs">${buffsHtml}</div>
            </div>
            <div class="bakery-book">
              <div class="voyage-panel-title bakery-panel-title">${renderUiIcon("recipeCard", 18)}<span>甜点食谱图鉴</span><span class="tag">${bakeryAura.recipesCollected}/${bakeryAura.totalRecipes} 份 · ★3 完美 ${bakeryAura.perfectRecipes} 份 · 每收录一份全产 +0.25% · 每份完美 PvE +0.5%</span></div>
              <div class="bakery-book__grid">${bookHtml}</div>
            </div>
            <div class="bakery-bottom-row">
              <div class="eco-aura-strip">
                <span class="shiny-aura-pill ${bakeryAura.prodAdd > 0 ? "is-on" : ""}">全产 +${ml15Pct(bakeryAura.prodAdd)}</span>
                <span class="shiny-aura-pill ${bakeryAura.catchAdd > 0 ? "is-on" : ""}">捕获 +${ml15Pct(bakeryAura.catchAdd)}</span>
                <span class="shiny-aura-pill ${bakeryAura.shinyAdd > 0 ? "is-on" : ""}">闪光 +${ml15Pct(bakeryAura.shinyAdd)}</span>
                <span class="shiny-aura-pill ${bakeryAura.pveOutAdd > 0 ? "is-on" : ""}">PvE 增伤 +${ml15Pct(bakeryAura.pveOutAdd)}</span>
                <span class="shiny-aura-pill">累计出炉 ${bakeryAura.totalBatches} 炉</span>
              </div>
              ${boxHtml}
              ${bakeryLogsHtml ? `<div class="star-camp-logs" style="margin-top:6px">${bakeryLogsHtml}</div>` : !boxHtml ? `<div class="voyage-last is-empty">还没有出炉记录：点「一键排班」请伙伴们系上围裙开工吧。</div>` : ""}
            </div>
          </div>
        </div>
      `);

      const modalStation = typeof ui.bakeryModalStation === "string" ? getBakeryStationDef(ui.bakeryModalStation) : null;
      if (modalStation) {
        const stationFree = !bakery.workers[modalStation.id];
        const modalMons = bakeryIdle
          .map((m) => ({ m, ev: evaluateBakeryWorker(m, modalStation.id, ml15Opts) }))
          .sort((a, b) => b.ev.perMin - a.ev.perMin || Math.floor(Number(b.m.lvl) || 1) - Math.floor(Number(a.m.lvl) || 1) || (a.m.id || 0) - (b.m.id || 0));
        const skipped = list.filter(Boolean).length - modalMons.length;
        const modalRowsHtml = modalMons.length
          ? modalMons
              .map(
                ({ m, ev }) => `
                  <div class="row func-mon-row ${ev.match ? "is-active" : ""}">
                    <div class="row__left">
                      <div class="row__title row__titleLine">${renderBeastIcon(m.dex, m.name, Boolean(m.isShiny))}<span>${escapeHtml(m.name)}</span><span class="tag">Lv.${m.lvl || 1}</span>${ev.match ? `<span class="tag tag--bakery-match">属性契合</span>` : ""}</div>
                      <div class="row__desc">${ml15TypeBadges(ev.types) || "-"} · 亲密 ${ml15Aff(m)}/100 · 速度 ${ev.perMin.toFixed(2)} 工时/分</div>
                    </div>
                    <div class="row__right">
                      <button type="button" class="btn btn--small btn--primary" data-bakery-modal-pick="${m.id}" ${stationFree ? "" : "disabled"}>上岗</button>
                    </div>
                  </div>`,
              )
              .join("")
          : `<div class="muted" style="padding:12px">当前暂无空闲伙伴可以上岗（训练、远征、出战、孵育、露营、沙盘以及码头、观察站、浮岛、寻宝远航、泡汤、送信、入梦、垂钓、气球旅行、游乐园值班、夜营观星与本命灵契中的伙伴已被安全过滤）。</div>`;
        bakeryModalHtml = `
          <div class="modalOverlay" data-bakery-modal-overlay="1">
            <div class="modal">
              <div class="modal__header">
                <div class="modal__title">${renderUiIcon("bakeryOven", 20)}<span>请伙伴到「${escapeHtml(modalStation.name)}」上岗</span><span class="tag">${stationFree ? "工位空着" : "工位已有人"}</span></div>
                <div class="modal__right">
                  <button type="button" class="btn btn--small" data-bakery-modal-close="1">关闭</button>
                </div>
              </div>
              <div class="modal__desc">仅展示空闲伙伴（已过滤 ${Math.max(0, skipped)} 只忙碌中的伙伴）。${escapeHtml(modalStation.elements.map((t) => TYPE_ZH?.[t] ?? t).join(" / "))}系伙伴与${escapeHtml(modalStation.name)}契合：速度 ×1.5；亲密度每 10 点再快 5%。三个工位都契合时这一炉是 ★3 完美品质。</div>
              <div class="modal__body">${modalRowsHtml}</div>
              <div class="actions">
                <button type="button" class="btn btn--primary" data-bakery-modal-close="1">完成</button>
              </div>
            </div>
          </div>`;
      }
    }

    // ========== ML-15 Section: 萌灵「彩虹气球旅行」(Rainbow Balloon Travel) ==========
    const hideBalloon = Boolean(ui.functionsHideBalloonTravel);
    const balloonTr = ensureBalloonTravelState(state);
    const balloonBonus = computeBalloonTravelBonus(state);
    const balloonRot = getBalloonIsleRotation();
    const balloonIdle = getIdleBalloonCandidates(state);
    const balloonTicketFree = getBalloonTicketFreeLeft(state);
    const balloonIdleCount = balloonTr.balloons.filter((b) => !b.trip).length;
    const canBalloonDispatch = balloonIdleCount > 0 && balloonIdle.length > 0;
    const canBalloonTicket = balloonBonus.flying > 0 && (balloonTicketFree > 0 || ml15Coins >= BALLOON_TICKET_COIN_COST);
    const balloonResTxt = (res) =>
      Object.entries(res || {})
        .filter(([, n]) => n > 0)
        .map(([rid, n]) => `${BALLOON_RES_ZH[rid] || rid} +${n}`)
        .join(" · ");
    let balloonModalHtml = "";

    rows.push(`
      <div class="row balloon-header ${balloonBonus.flying ? "is-flying" : ""}" data-balloon-travel="1">
        <div class="row__left">
          <div class="row__title row__titleLine">
            ${renderUiIcon("rainbowBalloon", 20)}
            <span>彩虹气球旅行</span>
            <span class="tag tag--balloon-title">${escapeHtml(balloonBonus.title)}</span>
            <span class="tag tag--balloon-count">${renderUiIcon("rainbowBalloon", 14)}<span>在途 ${balloonBonus.flying}/${BALLOON_COUNT}${balloonBonus.landed ? ` · 待收取 ${balloonBonus.landed}` : ""}</span></span>
            <span class="tag tag--balloon-count">${renderUiIcon("travelSouvenir", 14)}<span>纪念品 ${balloonBonus.species}/${balloonBonus.totalSpecies}</span></span>
            <span class="tag tag--balloon-count">${renderUiIcon("balloonIsles", 14)}<span>${escapeHtml(balloonBonus.badgeName)}</span></span>
          </div>
          <div class="row__desc">派伙伴乘彩虹气球前往轮换开放的空中群岛（每 8 小时轮换，同时开放 2 座），每位乘客带回 1 件纪念品；与群岛属性契合的乘客更容易多带一件、带回稀有或珍藏。纪念品登记进旅行纪念品图鉴，集齐 5 / 10 / 15 / 20 种升为铜 / 银 / 金 / 彩虹旅行章，永久提升全产、捕获、闪光与 PvE 伤害。旅行中（含降落待收取）的伙伴自动享防放生保护。</div>
        </div>
        <div class="row__right balloon-header__btns">
          <button type="button" class="btn btn--small${canBalloonDispatch ? " btn--primary" : ""}" data-balloon-autodispatch="1" ${canBalloonDispatch ? "" : "disabled"}>一键派遣</button>
          <button type="button" class="btn btn--small${balloonBonus.landed ? " btn--primary" : ""}" data-balloon-claim-all="1" ${balloonBonus.landed ? "" : "disabled"}>收取纪念品${balloonBonus.landed ? `（${balloonBonus.landed}）` : ""}</button>
          <button type="button" class="btn btn--small btn--ticket" data-balloon-ticket="1" ${canBalloonTicket ? "" : "disabled"}>${renderUiIcon("balloonTicket", 16)}<span>${balloonTicketFree > 0 ? "顺风旅行票（今日免费）" : `顺风旅行票（${BALLOON_TICKET_COIN_COST} 币）`}</span></button>
          <button type="button" class="btn btn--small btn--ghost" data-func-toggle="balloonTravel">${hideBalloon ? "展开" : "收起"}</button>
        </div>
      </div>
    `);

    if (!hideBalloon) {
      const rarityTag = (sv) => `<span class="tag tag--balloon-rarity rarity-${escapeHtml(sv.rarity)}">${escapeHtml(BALLOON_RARITY[sv.rarity]?.name || "")}</span>`;
      const islesHtml = balloonRot.open
        .map((isle) => {
          const chips = getBalloonIsleSouvenirs(isle.id)
            .map((sv) => {
              const got = (balloonTr.album[sv.id]?.count || 0) > 0;
              return `<span class="balloon-chip rarity-${escapeHtml(sv.rarity)}${got ? " is-got" : ""}">${renderUiIcon("travelSouvenir", 18)}<span>${escapeHtml(sv.name)}</span></span>`;
            })
            .join("");
          return `
            <div class="balloon-isle isle-${escapeHtml(isle.id)}" data-balloon-isle="${escapeHtml(isle.id)}">
              <div class="balloon-isle__head"><span class="balloon-isle__name">${escapeHtml(isle.name)}</span>${ml15TypeBadges(isle.elements)}<span class="tag">航程 ${isle.tripMin} 分钟</span></div>
              <div class="balloon-isle__desc">${escapeHtml(isle.desc)}</div>
              <div class="balloon-isle__chips">${chips}</div>
            </div>`;
        })
        .join("");

      const fleetHtml = balloonTr.balloons
        .map((b, i) => {
          const trip = b.trip;
          if (!trip) {
            return `
              <div class="balloon-card is-idle" data-balloon-card="${i}" data-balloon-phase="idle">
                <div class="balloon-card__head">
                  ${renderUiIcon("rainbowBalloon", 30)}
                  <div class="balloon-card__titleBox"><div class="balloon-card__name">${i + 1} 号气球</div><div class="balloon-card__meta">停在草坪上，等乘客登机</div></div>
                </div>
                <div class="balloon-card__actions"><button type="button" class="btn btn--small" data-balloon-open="${i}" ${balloonIdle.length > 0 ? "" : "disabled"}>挑选乘客起飞</button></div>
              </div>`;
          }
          const isle = getBalloonIsleDef(trip.isleId);
          const passengers = trip.passengerIds.map((id) => list.find((m) => m && m.id === id) || null).filter(Boolean);
          const paxHtml = passengers.length
            ? passengers
                .map((m) => {
                  const ev = evaluateBalloonPassenger(m, trip.isleId, ml15Opts);
                  return `<span class="balloon-pax${ev?.match ? " is-match" : ""}">${renderBeastIcon(m.dex, m.name, Boolean(m.isShiny))}<span>${escapeHtml(m.name)}</span>${ev?.match ? `<span class="tag tag--balloon-match">契合</span>` : ""}</span>`;
                })
                .join("")
            : `<span class="balloon-card__meta">乘客已经先回家了</span>`;
          if (trip.phase === "landed") {
            const haulHtml = trip.haul.length
              ? trip.haul
                  .map((h) => {
                    const sv = getBalloonSouvenirDef(h.souvenirId);
                    const isNew = !((balloonTr.album[h.souvenirId]?.count || 0) > 0);
                    return `<span class="balloon-chip rarity-${escapeHtml(sv?.rarity || "common")} is-got">${renderUiIcon("travelSouvenir", 18)}<span>${escapeHtml(sv?.name || h.souvenirId)}</span>${isNew ? `<span class="tag tag--balloon-new">新</span>` : ""}</span>`;
                  })
                  .join("")
              : `<span class="balloon-card__meta">这一趟只带回了好心情</span>`;
            return `
              <div class="balloon-card is-landed" data-balloon-card="${i}" data-balloon-phase="landed">
                <div class="balloon-card__head">
                  ${renderUiIcon("rainbowBalloon", 30)}
                  <div class="balloon-card__titleBox"><div class="balloon-card__name">${i + 1} 号气球 · 从「${escapeHtml(isle?.name || "")}」回来了</div><div class="balloon-card__meta">带回 ${trip.haul.length} 件纪念品，等你来收取</div></div>
                </div>
                <div class="balloon-card__pax">${paxHtml}</div>
                <div class="balloon-card__haul">${haulHtml}</div>
                <div class="balloon-card__actions"><button type="button" class="btn btn--small btn--primary" data-balloon-claim="${i}">收取纪念品</button></div>
              </div>`;
          }
          const fv = ml15FlightView(trip);
          return `
            <div class="balloon-card is-flying" data-balloon-card="${i}" data-balloon-phase="flying">
              <div class="balloon-card__head">
                ${renderUiIcon("rainbowBalloon", 30)}
                <div class="balloon-card__titleBox"><div class="balloon-card__name">${i + 1} 号气球 · 飞往「${escapeHtml(isle?.name || "")}」</div><div class="balloon-card__meta">航程 ${isle?.tripMin || 0} 分钟 · ${ml15TypeBadges(isle?.elements || [])}</div></div>
              </div>
              <div class="balloon-card__pax">${paxHtml}</div>
              <div class="dock-progress balloon-flight-progress">
                <div class="dock-progress__bar"><i data-balloon-fill="${i}" style="width:${fv.pct}%"></i></div>
                <span class="dock-progress__txt" data-balloon-txt="${i}">${escapeHtml(fv.text)}</span>
              </div>
              <div class="balloon-card__actions"><button type="button" class="btn btn--small btn--ghost" data-balloon-recall="${i}">召回</button></div>
            </div>`;
        })
        .join("");

      const badgesHtml = BALLOON_BADGE_TIERS.map(
        (t) => `<span class="balloon-badge tier-${t.tier}${balloonBonus.badgeTier >= t.tier ? " is-on" : ""}">${renderUiIcon("balloonIsles", 26)}<span>${escapeHtml(t.name)}</span><small>${t.minSpecies} 种</small></span>`,
      ).join("");
      const albumHtml = BALLOON_ISLES.map((isle) => {
        const isOpen = balloonRot.openIds.includes(isle.id);
        const cells = getBalloonIsleSouvenirs(isle.id)
          .map((sv) => {
            const cnt = balloonTr.album[sv.id]?.count || 0;
            return `
              <div class="balloon-album__cell rarity-${escapeHtml(sv.rarity)}${cnt > 0 ? " is-got" : " is-unknown"}" data-balloon-souvenir="${escapeHtml(sv.id)}">
                ${renderUiIcon("travelSouvenir", 30)}
                <div class="balloon-album__info">
                  <div class="balloon-album__name">${escapeHtml(sv.name)}</div>
                  <div class="balloon-album__meta">${rarityTag(sv)}<span>${cnt > 0 ? `×${cnt}` : "未登记"}</span></div>
                </div>
              </div>`;
          })
          .join("");
        return `
          <div class="balloon-album__isle${isOpen ? " is-open" : ""}">
            <div class="balloon-album__isleHead"><span>${escapeHtml(isle.name)}</span>${ml15TypeBadges(isle.elements)}${isOpen ? `<span class="tag tag--balloon-match">开放中</span>` : ""}</div>
            <div class="balloon-album__cells">${cells}</div>
          </div>`;
      }).join("");

      const lc = balloonTr.lastClaim;
      const claimHtml = lc
        ? `<div class="balloon-last">${renderUiIcon("travelSouvenir", 18)}<span>上次收取「${escapeHtml(getBalloonIsleDef(lc.isleId)?.name || "空中群岛")}」${lc.count} 件纪念品：${escapeHtml(balloonResTxt(lc.rewards) || "满满的回忆")}</span></div>`
        : "";
      const balloonLogsHtml = (balloonTr.recentLogs || [])
        .filter((ln) => !(lc && ln.startsWith("【收取纪念品】")))
        .slice(0, 2)
        .map((ln) => `<div class="camp-log-line">${escapeHtml(ln)}</div>`)
        .join("");

      rows.push(`
        <div class="row balloon-body">
          <div class="row__left" style="width:100%">
            <div class="balloon-top">
              <div class="balloon-sky" data-balloon-rotation="${balloonRot.index}">
                <div class="balloon-sky__head">
                  ${renderUiIcon("balloonIsles", 44)}
                  <div class="balloon-sky__titleBox">
                    <div class="balloon-sky__label">当前开放的空中群岛</div>
                    <div class="balloon-sky__name">${balloonRot.open.map((i) => `「${escapeHtml(i.name)}」`).join(" ")}</div>
                    <div class="balloon-sky__sub"><span class="tag" data-balloon-rotate-txt="1">${escapeHtml(ml15RotateText(balloonRot))}</span></div>
                  </div>
                </div>
                <div class="balloon-isles">${islesHtml}</div>
              </div>
              <div class="balloon-fleet">
                <div class="voyage-panel-title balloon-panel-title">${renderUiIcon("rainbowBalloon", 18)}<span>气球草坪</span><span class="tag">每只最多 ${BALLOON_SEATS} 位乘客 · 契合多带纪念品</span></div>
                ${fleetHtml}
              </div>
            </div>
            <div class="balloon-album">
              <div class="voyage-panel-title balloon-panel-title">${renderUiIcon("travelSouvenir", 18)}<span>旅行纪念品图鉴与旅行章</span><span class="tag">${balloonBonus.species}/${balloonBonus.totalSpecies} 种 · 珍藏 ${balloonBonus.treasures}/${balloonBonus.totalTreasures}${balloonBonus.nextTier ? ` · 再登记 ${balloonBonus.nextTier.minSpecies - balloonBonus.species} 种升${escapeHtml(balloonBonus.nextTier.name)}` : " · 旅行章已满级"}</span></div>
              <div class="balloon-badges">${badgesHtml}</div>
              <div class="balloon-album__grid">${albumHtml}</div>
            </div>
            <div class="balloon-bottom-row">
              <div class="eco-aura-strip">
                <span class="shiny-aura-pill ${balloonBonus.prodAdd > 0 ? "is-on" : ""}">全产 +${ml15Pct(balloonBonus.prodAdd)}</span>
                <span class="shiny-aura-pill ${balloonBonus.catchAdd > 0 ? "is-on" : ""}">捕获 +${ml15Pct(balloonBonus.catchAdd)}</span>
                <span class="shiny-aura-pill ${balloonBonus.shinyAdd > 0 ? "is-on" : ""}">闪光 +${ml15Pct(balloonBonus.shinyAdd)}</span>
                <span class="shiny-aura-pill ${balloonBonus.pveOutAdd > 0 ? "is-on" : ""}">PvE 增伤 +${ml15Pct(balloonBonus.pveOutAdd)}</span>
                <span class="shiny-aura-pill">累计旅行 ${balloonBonus.totalTrips} 趟</span>
              </div>
              ${claimHtml}
              ${balloonLogsHtml ? `<div class="star-camp-logs" style="margin-top:6px">${balloonLogsHtml}</div>` : !claimHtml ? `<div class="voyage-last is-empty">还没有旅行记录：点「一键派遣」请伙伴们坐上彩虹气球出发吧。</div>` : ""}
            </div>
          </div>
        </div>
      `);

      const draft = ui.balloonModal && typeof ui.balloonModal === "object" ? ui.balloonModal : null;
      const draftIdx = draft ? Math.floor(Number(draft.idx)) : -1;
      if (draft && draftIdx >= 0 && draftIdx < BALLOON_COUNT && !balloonTr.balloons[draftIdx].trip) {
        if (!balloonRot.openIds.includes(draft.isleId)) draft.isleId = balloonRot.openIds[0];
        const idleIdSet = new Set(balloonIdle.map((m) => m.id));
        draft.ids = (Array.isArray(draft.ids) ? draft.ids : []).filter((id) => idleIdSet.has(id)).slice(0, BALLOON_SEATS);
        const draftIsle = getBalloonIsleDef(draft.isleId);
        const isleBtns = balloonRot.open
          .map(
            (isle) =>
              `<button type="button" class="btn btn--small${isle.id === draftIsle.id ? " btn--primary" : ""}" data-balloon-modal-isle="${escapeHtml(isle.id)}">${escapeHtml(isle.name)}（${escapeHtml(isle.elements.map((t) => TYPE_ZH?.[t] ?? t).join(" / "))}）</button>`,
          )
          .join("");
        const modalMons = balloonIdle
          .map((m) => ({ m, ev: evaluateBalloonPassenger(m, draftIsle.id, ml15Opts) }))
          .filter((x) => x.ev)
          .sort((a, b) => Number(b.ev.match) - Number(a.ev.match) || Math.floor(Number(b.m.lvl) || 1) - Math.floor(Number(a.m.lvl) || 1) || (a.m.id || 0) - (b.m.id || 0));
        const skipped = list.filter(Boolean).length - modalMons.length;
        const seatsFull = draft.ids.length >= BALLOON_SEATS;
        const modalRowsHtml = modalMons.length
          ? modalMons
              .map(({ m, ev }) => {
                const picked = draft.ids.includes(m.id);
                const odds = getBalloonSouvenirOdds(m, draftIsle.id, ml15Opts);
                const rareOdd = odds.filter((o) => getBalloonSouvenirDef(o.souvenirId)?.rarity !== "common").reduce((s, o) => s + o.chance, 0);
                return `
                  <div class="row func-mon-row ${picked ? "is-active" : ""}">
                    <div class="row__left">
                      <div class="row__title row__titleLine">${renderBeastIcon(m.dex, m.name, Boolean(m.isShiny))}<span>${escapeHtml(m.name)}</span><span class="tag">Lv.${m.lvl || 1}</span>${ev.match ? `<span class="tag tag--balloon-match">群岛契合</span>` : ""}</div>
                      <div class="row__desc">${ml15TypeBadges(ev.types) || "-"} · 稀有 / 珍藏概率 ${Math.round(rareOdd * 1000) / 10}%${ev.match ? ` · 多带一件 ${Math.round(ev.extraChance * 100)}%` : ""}</div>
                    </div>
                    <div class="row__right">
                      <button type="button" class="btn btn--small${picked ? " btn--primary" : ""}" data-balloon-modal-pick="${m.id}" ${picked || !seatsFull ? "" : "disabled"}>${picked ? "已登机" : "登机"}</button>
                    </div>
                  </div>`;
              })
              .join("")
          : `<div class="muted" style="padding:12px">当前暂无空闲伙伴可以乘气球（训练、远征、出战、孵育、露营、沙盘以及码头、观察站、浮岛、寻宝远航、泡汤、送信、入梦、垂钓、烘焙、游乐园值班、夜营观星与本命灵契中的伙伴已被安全过滤）。</div>`;
        balloonModalHtml = `
          <div class="modalOverlay" data-balloon-modal-overlay="1">
            <div class="modal">
              <div class="modal__header">
                <div class="modal__title">${renderUiIcon("rainbowBalloon", 20)}<span>为 ${draftIdx + 1} 号气球挑选乘客</span><span class="tag">已登机 ${draft.ids.length}/${BALLOON_SEATS}</span></div>
                <div class="modal__right">
                  <button type="button" class="btn btn--small" data-balloon-modal-close="1">关闭</button>
                </div>
              </div>
              <div class="balloon-modal__isles">${isleBtns}</div>
              <div class="modal__desc">仅展示空闲伙伴（已过滤 ${Math.max(0, skipped)} 只忙碌中的伙伴）。${escapeHtml(draftIsle.elements.map((t) => TYPE_ZH?.[t] ?? t).join(" / "))}系伙伴与「${escapeHtml(draftIsle.name)}」契合：${Math.round(BALLOON_MATCH_EXTRA_CHANCE * 100)}% 概率多带一件纪念品，稀有 / 珍藏权重 ×2。航程约 ${draftIsle.tripMin} 分钟。</div>
              <div class="modal__body">${modalRowsHtml}</div>
              <div class="actions">
                <button type="button" class="btn btn--small" data-balloon-modal-close="1">取消</button>
                <button type="button" class="btn btn--primary" data-balloon-modal-go="1" ${draft.ids.length ? "" : "disabled"}>起飞（${draft.ids.length}/${BALLOON_SEATS}）</button>
              </div>
            </div>
          </div>`;
      }
    }

    // ========== ML-14 Section: 萌灵「梦境绘本馆」(Dream Picture-Book Library) ==========
    const hideDreamLibrary = Boolean(ui.functionsHideDreamLibrary);
    const dreamLib = ensureDreamLibraryState(state);
    const dreamAura = computeDreamLibraryAura(state);
    const ml14Coins = Math.max(0, Math.floor(state.res?.futurecoin?.value ?? 0));
    const ml14Pct = (n) => `${Math.round((Number(n) || 0) * 1000) / 10}%`;
    const ml14Types = (m) => getMonTypesForExpedition(m, getBeastDataByDex);
    const ml14Opts = { getBeastDataByDex, getMonTypes: ml14Types };
    const ml14TypeBadges = (types) =>
      (types || []).map((t) => `<span class="badge type type-${escapeHtml(t)}">${escapeHtml(TYPE_ZH?.[t] ?? t)}</span>`).join("");
    const ml14Aff = (m) => Math.max(0, Math.min(100, Math.floor(typeof m?.affection === "number" && Number.isFinite(m.affection) ? m.affection : 0)));
    const dreamIdle = getIdleDreamCandidates(state);
    const dreamers = dreamLib.dreamerIds.map((id) => list.find((m) => m && m.id === id) || null).filter(Boolean);
    const dreamStoryFree = getDreamStoryFreeLeft(state);
    const canDreamStory = dreamers.length > 0 && (dreamStoryFree > 0 || ml14Coins >= DREAM_STORY_COIN_COST);
    const dreamBook = getDreamBookDef(dreamLib.bookId) || DREAM_BOOK_DEFS[0];
    const dreamBookState = dreamLib.books[dreamBook.id];
    const dreamReread = isDreamBookComplete(state, dreamBook.id);
    let dreamModalHtml = "";

    rows.push(`
      <div class="row dream-header ${dreamers.length ? "is-dreaming" : ""}" data-dream-library="1">
        <div class="row__left">
          <div class="row__title row__titleLine">
            ${renderUiIcon("dreamLibrary", 20)}
            <span>梦境绘本馆</span>
            <span class="tag tag--dream-title">${escapeHtml(dreamAura.title)}</span>
            <span class="tag tag--dream-count">${renderUiIcon("pictureBook", 14)}<span>入梦 ${dreamers.length}/${DREAM_PILLOW_COUNT}</span></span>
            <span class="tag tag--dream-count">${renderUiIcon("dreamPage", 14)}<span>插页 ${dreamAura.pageCount}/${dreamAura.totalPages}</span></span>
            <span class="tag">绘本 ${dreamAura.completeBooks}/${dreamAura.totalBooks}</span>
          </div>
          <div class="row__desc">请空闲伙伴枕着梦枕入梦，一起编写童话绘本：入梦伙伴持续产出灵感（题材契合 ×1.5，亲密越高写得越快），攒满一章就写成一章童话、收进一张绘本插页。每张插页永久全产 +0.2%，集齐一本的 4 张插页点亮这本绘本的专属光环。入梦中的伙伴自动享防放生保护，唤醒即可解除。</div>
        </div>
        <div class="row__right dream-header__btns">
          <button type="button" class="btn btn--small${dreamers.length < DREAM_PILLOW_COUNT && dreamIdle.length > 0 ? " btn--primary" : ""}" data-dream-autofill="1" ${dreamers.length < DREAM_PILLOW_COUNT && dreamIdle.length > 0 ? "" : "disabled"}>一键入梦</button>
          <button type="button" class="btn btn--small" data-dream-story="1" ${canDreamStory ? "" : "disabled"}>${dreamStoryFree > 0 ? "晚安朗读（今日免费）" : `晚安朗读（${DREAM_STORY_COIN_COST} 币）`}</button>
          <button type="button" class="btn btn--small" data-dream-wake-all="1" ${dreamers.length ? "" : "disabled"}>全部醒来</button>
          <button type="button" class="btn btn--small btn--ghost" data-func-toggle="dreamLibrary">${hideDreamLibrary ? "展开" : "收起"}</button>
        </div>
      </div>
    `);

    if (!hideDreamLibrary) {
      const inkView = ml14InkView(dreamLib);
      const curChapterIdx = Math.max(0, Math.min(DREAM_CHAPTERS_PER_BOOK - 1, dreamBookState?.written || 0));
      const curChapter = dreamBook.chapters[curChapterIdx];
      const deskPagesHtml = dreamBook.chapters
        .map((ch, idx) => {
          const got = getDreamPageAuthors(state, dreamBook.id, idx) !== null;
          const isCur = idx === curChapterIdx;
          return `<span class="dream-desk__page${got ? " is-got" : ""}${isCur ? " is-current" : ""}" title="${escapeHtml(`第 ${idx + 1} 章「${ch.title}」${got ? " · 已收进插页" : ""}`)}">${renderUiIcon("dreamPage", 22)}<span>${idx + 1}</span></span>`;
        })
        .join("");
      const pillowsHtml = Array.from({ length: DREAM_PILLOW_COUNT }, (_, idx) => {
        const m = dreamers[idx] || null;
        if (!m) {
          return `
            <div class="dream-pillow is-empty">
              ${renderUiIcon("dreamPage", 26)}
              <span class="dream-pillow__empty">空梦枕 ${idx + 1}</span>
              <button type="button" class="btn btn--small" data-dream-open="1" ${dreamIdle.length > 0 ? "" : "disabled"}>请伙伴入梦</button>
            </div>`;
        }
        const ev = evaluateDreamWriter(m, dreamBook.id, ml14Opts);
        return `
          <div class="dream-pillow is-filled${ev.match ? " is-match" : ""}" data-dream-writer="${m.id}">
            ${renderBeastIcon(m.dex, m.name, Boolean(m.isShiny))}
            <div class="dream-pillow__body">
              <div class="dream-pillow__name">${escapeHtml(m.name)} <span class="tag">Lv.${m.lvl || 1}</span>${ev.match ? `<span class="tag tag--dream-match">题材契合</span>` : ""}</div>
              <div class="dream-pillow__meta">灵感 ${ev.inkPerMin.toFixed(2)}/分 · 亲密 ${ml14Aff(m)}/100</div>
            </div>
            <button type="button" class="btn btn--small btn--ghost" data-dream-wake="${m.id}">唤醒</button>
          </div>`;
      }).join("");

      const shelfHtml = DREAM_BOOK_DEFS.map((def) => {
        const unlocked = isDreamBookUnlocked(state, def.id);
        const complete = isDreamBookComplete(state, def.id);
        const isCur = def.id === dreamBook.id;
        const pagesHtml = def.chapters
          .map((ch, idx) => {
            const authors = getDreamPageAuthors(state, def.id, idx);
            const got = authors !== null;
            return `<span class="dream-page${got ? " is-got" : ""}" title="${escapeHtml(got ? `第 ${idx + 1} 章「${ch.title}」 · 执笔：${authors || "伙伴们"}` : `第 ${idx + 1} 章 · 尚未写成`)}">${renderUiIcon("dreamPage", 24)}<span class="dream-page__name">${escapeHtml(got ? ch.title : `第 ${idx + 1} 章`)}</span></span>`;
          })
          .join("");
        let actionHtml = "";
        if (!unlocked) actionHtml = `<div class="dream-book__lock">集齐 ${def.unlockPages} 张插页后上架（当前 ${dreamAura.pageCount}）</div>`;
        else if (isCur) actionHtml = `<span class="tag tag--dream-current">${complete ? "重温中" : "正在编写"}</span>`;
        else actionHtml = `<button type="button" class="btn btn--small" data-dream-book="${escapeHtml(def.id)}">${complete ? "重温这本" : "换这本写"}</button>`;
        return `
          <div class="dream-book book-${escapeHtml(def.id)}${unlocked ? "" : " is-locked"}${complete ? " is-complete" : ""}${isCur ? " is-current" : ""}" data-dream-shelf-book="${escapeHtml(def.id)}">
            <div class="dream-book__head">
              ${renderUiIcon("pictureBook", 34)}
              <div class="dream-book__titleBox">
                <div class="dream-book__name">《${escapeHtml(def.name)}》</div>
                <div class="dream-book__sub">${ml14TypeBadges(def.elements)}<span class="tag${complete ? " tag--dream-aura-on" : ""}">${escapeHtml(def.auraText)}</span></div>
              </div>
            </div>
            <div class="dream-book__pages">${pagesHtml}</div>
            <div class="dream-book__foot">${actionHtml}</div>
          </div>`;
      }).join("");

      const lc = dreamLib.lastChapter;
      const lcBook = lc ? getDreamBookDef(lc.bookId) : null;
      const lcChapter = lcBook ? lcBook.chapters[lc.chapterIdx] : null;
      const storyHtml = lcChapter
        ? `<div class="dream-story">
            <div class="dream-story__head">${renderUiIcon("pictureBook", 18)}<strong>《${escapeHtml(lcBook.name)}》第 ${lc.chapterIdx + 1} 章「${escapeHtml(lcChapter.title)}」</strong>${lc.newPage ? `<span class="tag tag--dream-aura-on">新插页</span>` : `<span class="tag">重温版</span>`}</div>
            <div class="dream-story__text">「${escapeHtml(lcChapter.text)}」</div>
            <div class="dream-story__meta">执笔：${escapeHtml(lc.authors || "伙伴们")}</div>
          </div>`
        : `<div class="voyage-last is-empty">还没有写成的章节：点「一键入梦」请伙伴们枕着梦枕开始构思吧。</div>`;
      const dreamLogsHtml = (dreamLib.recentLogs || []).slice(0, 2).map((ln) => `<div class="camp-log-line">${escapeHtml(ln)}</div>`).join("");

      rows.push(`
        <div class="row dream-body">
          <div class="row__left" style="width:100%">
            <div class="dream-top">
              <div class="dream-desk${dreamReread ? " is-reread" : ""}" data-dream-desk="${escapeHtml(dreamBook.id)}">
                <div class="dream-desk__head">
                  ${renderUiIcon("pictureBook", 44)}
                  <div class="dream-desk__titleBox">
                    <div class="dream-desk__label">梦枕边摊开的绘本${dreamReread ? " · 重温版（只给奖励）" : ""}</div>
                    <div class="dream-desk__name">《${escapeHtml(dreamBook.name)}》</div>
                    <div class="dream-desk__sub">${ml14TypeBadges(dreamBook.elements)}<span class="tag">集齐光环 ${escapeHtml(dreamBook.auraText)}</span></div>
                  </div>
                </div>
                <div class="dream-desk__chapter">正在写第 ${curChapterIdx + 1} 章「${escapeHtml(curChapter.title)}」</div>
                <div class="dock-progress dream-ink-progress">
                  <div class="dock-progress__bar"><i data-dream-ink-fill="1" style="width:${inkView.pct}%"></i></div>
                  <span class="dock-progress__txt" data-dream-ink-txt="1">${escapeHtml(inkView.text)}</span>
                </div>
                <div class="dream-desk__rate" data-dream-rate-txt="1">${escapeHtml(ml14RateText(state, dreamLib))}</div>
                <div class="dream-desk__pages">${deskPagesHtml}</div>
              </div>
              <div class="dream-pillows">
                <div class="voyage-panel-title dream-panel-title">${renderUiIcon("dreamLibrary", 18)}<span>梦枕</span><span class="tag">晚安朗读 +${DREAM_STORY_INK} 灵感</span></div>
                ${pillowsHtml}
              </div>
            </div>
            <div class="voyage-panel-title dream-panel-title" style="margin-top:10px">${renderUiIcon("pictureBook", 18)}<span>绘本书架</span><span class="tag">5 本童话 × 4 章 = 20 张插页</span></div>
            <div class="dream-shelf">${shelfHtml}</div>
            <div class="dream-bottom-row">
              <div class="dream-aura-box">
                <div class="eco-aura-strip">
                  <span class="shiny-aura-pill ${dreamAura.prodAdd > 0 ? "is-on" : ""}">全产 +${ml14Pct(dreamAura.prodAdd)}</span>
                  <span class="shiny-aura-pill ${dreamAura.catchAdd > 0 ? "is-on" : ""}">捕获 +${ml14Pct(dreamAura.catchAdd)}</span>
                  <span class="shiny-aura-pill ${dreamAura.shinyAdd > 0 ? "is-on" : ""}">闪光 +${ml14Pct(dreamAura.shinyAdd)}</span>
                  <span class="shiny-aura-pill ${dreamAura.pveOutAdd > 0 ? "is-on" : ""}">PvE 增伤 +${ml14Pct(dreamAura.pveOutAdd)}</span>
                  <span class="shiny-aura-pill">累计写成 ${Math.max(0, Math.floor(Number(dreamLib.totalChapters) || 0))} 章</span>
                </div>
                ${dreamLogsHtml ? `<div class="star-camp-logs" style="margin-top:6px">${dreamLogsHtml}</div>` : ""}
              </div>
              ${storyHtml}
            </div>
          </div>
        </div>
      `);

      if (ui.dreamModalOpen) {
        const pillowsLeft = DREAM_PILLOW_COUNT - dreamers.length;
        const modalMons = dreamIdle
          .map((m) => ({ m, ev: evaluateDreamWriter(m, dreamBook.id, ml14Opts) }))
          .sort((a, b) => b.ev.inkPerMin - a.ev.inkPerMin || (a.m.id || 0) - (b.m.id || 0));
        const skipped = list.filter(Boolean).length - modalMons.length;
        const modalRowsHtml = modalMons.length
          ? modalMons
              .map(
                ({ m, ev }) => `
                  <div class="row func-mon-row ${ev.match ? "is-active" : ""}">
                    <div class="row__left">
                      <div class="row__title row__titleLine">${renderBeastIcon(m.dex, m.name, Boolean(m.isShiny))}<span>${escapeHtml(m.name)}</span><span class="tag">Lv.${m.lvl || 1}</span>${ev.match ? `<span class="tag tag--dream-match">题材契合</span>` : ""}</div>
                      <div class="row__desc">${ml14TypeBadges(ml14Types(m)) || "-"} · 亲密 ${ml14Aff(m)}/100 · 灵感 ${ev.inkPerMin.toFixed(2)}/分</div>
                    </div>
                    <div class="row__right">
                      <button type="button" class="btn btn--small btn--primary" data-dream-modal-pick="${m.id}" ${pillowsLeft > 0 ? "" : "disabled"}>入梦</button>
                    </div>
                  </div>`,
              )
              .join("")
          : `<div class="muted" style="padding:12px">当前暂无空闲伙伴可以入梦（训练、远征、出战、孵育、露营、沙盘以及码头、观察站、浮岛、寻宝远航、泡汤、送信、垂钓、烘焙、气球旅行、游乐园值班、夜营观星与本命灵契中的伙伴已被安全过滤）。</div>`;
        dreamModalHtml = `
          <div class="modalOverlay" data-dream-modal-overlay="1">
            <div class="modal">
              <div class="modal__header">
                <div class="modal__title">${renderUiIcon("dreamLibrary", 20)}<span>请伙伴入梦写《${escapeHtml(dreamBook.name)}》</span><span class="tag">空梦枕 ${Math.max(0, pillowsLeft)}/${DREAM_PILLOW_COUNT}</span></div>
                <div class="modal__right">
                  <button type="button" class="btn btn--small" data-dream-modal-close="1">关闭</button>
                </div>
              </div>
              <div class="modal__desc">仅展示空闲伙伴（已过滤 ${Math.max(0, skipped)} 只忙碌中的伙伴）。${escapeHtml(dreamBook.elements.map((t) => TYPE_ZH?.[t] ?? t).join(" / "))}系伙伴与这本绘本题材契合：灵感 ×1.5；亲密度每 10 点再快 5%。</div>
              <div class="modal__body">${modalRowsHtml}</div>
              <div class="actions">
                <button type="button" class="btn btn--primary" data-dream-modal-close="1">完成</button>
              </div>
            </div>
          </div>`;
      }
    }

    // ========== ML-14 Section: 萌灵「溪畔钓鱼会」(Creekside Fishing Club) ==========
    const hideFishingClub = Boolean(ui.functionsHideFishingClub);
    const fishClub = ensureFishingClubState(state);
    const fishBonus = computeFishingClubBonus(state);
    const fishSection = getFishingSection();
    const fishIdle = getIdleFishingCandidates(state);
    const anglers = fishClub.anglerIds.map((id) => list.find((m) => m && m.id === id) || null).filter(Boolean);
    const fishChumFree = getFishingChumFreeLeft(state);
    const creelN = fishClub.creel.length;
    const canChum = anglers.length > 0 && creelN < FISHING_CREEL_CAP && (fishChumFree > 0 || ml14Coins >= FISHING_CHUM_COIN_COST);
    const fishResTxt = (res) =>
      Object.entries(res || {})
        .filter(([, n]) => n > 0)
        .map(([rid, n]) => `${FISHING_RES_ZH[rid] || rid} +${n}`)
        .join(" · ");
    let fishModalHtml = "";

    rows.push(`
      <div class="row fish-header ${anglers.length ? "is-fishing" : ""}" data-fishing-club="1">
        <div class="row__left">
          <div class="row__title row__titleLine">
            ${renderUiIcon("fishingDock", 20)}
            <span>溪畔钓鱼会</span>
            <span class="tag tag--fish-title">${escapeHtml(fishBonus.title)}</span>
            <span class="tag tag--fish-count">${renderUiIcon("fishingRod", 14)}<span>钓手 ${anglers.length}/${FISHING_ANGLER_MAX}</span></span>
            <span class="tag tag--fish-count">${renderUiIcon("creekFish", 14)}<span>鱼篓 ${creelN}/${FISHING_CREEL_CAP}</span></span>
            <span class="tag tag--fish-count">${renderUiIcon("fishingTrophy", 14)}<span>${escapeHtml(fishBonus.trophyName)} · 图鉴 ${fishBonus.species}/${fishBonus.totalSpecies}</span></span>
          </div>
          <div class="row__desc">溪流分 4 段，每 6 小时轮换一次开放溪段，每段 4 种鱼。按属性挑选钓手：与溪段属性契合的钓手咬钩率 +20%、更容易钓到溪王，与鱼同属性的钓手更容易钓到那种鱼。钓手每 15 分钟抛一竿，钓获先放进鱼篓（最多 ${FISHING_CREEL_CAP} 条）并登记钓获图鉴；图鉴登记 4 / 8 / 12 / 16 种升为铜 / 银 / 金 / 彩虹鱼杯，永久提升全产、捕获、闪光与 PvE 伤害。垂钓中的伙伴自动享防放生保护。</div>
        </div>
        <div class="row__right fish-header__btns">
          <button type="button" class="btn btn--small${anglers.length < FISHING_ANGLER_MAX && fishIdle.length > 0 ? " btn--primary" : ""}" data-fish-autopick="1" ${anglers.length < FISHING_ANGLER_MAX && fishIdle.length > 0 ? "" : "disabled"}>一键选钓手</button>
          <button type="button" class="btn btn--small${creelN ? " btn--primary" : ""}" data-fish-claim="1" ${creelN ? "" : "disabled"}>收鱼篓${creelN ? `（${creelN}）` : ""}</button>
          <button type="button" class="btn btn--small" data-fish-chum="1" ${canChum ? "" : "disabled"}>${fishChumFree > 0 ? "撒窝打饵（今日免费）" : `撒窝打饵（${FISHING_CHUM_COIN_COST} 币）`}</button>
          <button type="button" class="btn btn--small" data-fish-recall="1" ${anglers.length ? "" : "disabled"}>全部收竿</button>
          <button type="button" class="btn btn--small btn--ghost" data-func-toggle="fishingClub">${hideFishingClub ? "展开" : "收起"}</button>
        </div>
      </div>
    `);

    if (!hideFishingClub) {
      const castView = ml14CastView(fishClub);
      const rarityTag = (f) => `<span class="tag tag--fish-rarity rarity-${escapeHtml(f.rarity)}">${escapeHtml(FISHING_RARITY[f.rarity]?.name || "")}</span>`;
      const sectionFishHtml = getFishingSectionFish(fishSection.id)
        .map((f) => {
          const caught = (fishClub.dex[f.id]?.count || 0) > 0;
          return `<span class="fish-chip rarity-${escapeHtml(f.rarity)}${caught ? " is-caught" : ""}">${renderUiIcon("creekFish", 18)}<span>${escapeHtml(f.name)}</span>${ml14TypeBadges([f.element])}</span>`;
        })
        .join("");
      const spotsHtml = Array.from({ length: FISHING_ANGLER_MAX }, (_, idx) => {
        const m = anglers[idx] || null;
        if (!m) {
          return `
            <div class="fish-spot is-empty">
              ${renderUiIcon("fishingRod", 26)}
              <span class="fish-spot__empty">空钓位 ${idx + 1}</span>
              <button type="button" class="btn btn--small" data-fish-open="1" ${fishIdle.length > 0 ? "" : "disabled"}>请钓手下竿</button>
            </div>`;
        }
        const ev = evaluateFishingAngler(m, fishSection.id, ml14Opts);
        const favNames = (ev?.favFishIds || []).map((id) => getFishingFishDef(id)?.name || "").filter(Boolean);
        return `
          <div class="fish-spot is-filled${ev?.sectionMatch ? " is-match" : ""}" data-fish-angler="${m.id}">
            ${renderBeastIcon(m.dex, m.name, Boolean(m.isShiny))}
            <div class="fish-spot__body">
              <div class="fish-spot__name">${escapeHtml(m.name)} <span class="tag">Lv.${m.lvl || 1}</span>${ev?.sectionMatch ? `<span class="tag tag--fish-match">溪段契合</span>` : ""}</div>
              <div class="fish-spot__meta">咬钩 ${Math.round((ev?.biteChance || 0) * 100)}%${favNames.length ? ` · 擅钓 ${escapeHtml(favNames.join("、"))}` : ""}</div>
            </div>
            <button type="button" class="btn btn--small btn--ghost" data-fish-out="${m.id}">收竿</button>
          </div>`;
      }).join("");

      const creelGroups = new Map();
      for (const c of fishClub.creel) {
        const g = creelGroups.get(c.fishId) || { n: 0, best: 0 };
        g.n += 1;
        g.best = Math.max(g.best, c.size);
        creelGroups.set(c.fishId, g);
      }
      const creelHtml = creelGroups.size
        ? [...creelGroups.entries()]
            .map(([fishId, g]) => {
              const f = getFishingFishDef(fishId);
              return `<span class="fish-chip rarity-${escapeHtml(f?.rarity || "common")} is-caught">${renderUiIcon("creekFish", 18)}<span>${escapeHtml(f?.name || fishId)} ×${g.n}</span><span class="fish-chip__size">${g.best} cm</span></span>`;
            })
            .join("")
        : `<span class="fish-creel__empty">鱼篓空空的，钓手们正盯着浮漂。</span>`;

      const dexHtml = FISHING_SECTIONS.map((sec) => {
        const isNow = sec.id === fishSection.id;
        const cells = getFishingSectionFish(sec.id)
          .map((f) => {
            const e = fishClub.dex[f.id];
            const caught = (e?.count || 0) > 0;
            return `
              <div class="fish-dex__cell rarity-${escapeHtml(f.rarity)}${caught ? " is-caught" : " is-unknown"}" data-fish-dex="${escapeHtml(f.id)}" title="${escapeHtml(`${f.name} · ${FISHING_RARITY[f.rarity]?.name || ""} · ${TYPE_ZH?.[f.element] ?? f.element}系 · ${f.size[0]}~${f.size[1]} cm`)}">
                ${renderUiIcon("creekFish", 30)}
                <div class="fish-dex__info">
                  <div class="fish-dex__name">${escapeHtml(f.name)}</div>
                  <div class="fish-dex__meta">${rarityTag(f)}${caught ? `<span>×${e.count} · 最大 ${e.best} cm</span>` : `<span>未登记</span>`}</div>
                </div>
              </div>`;
          })
          .join("");
        return `
          <div class="fish-dex__section${isNow ? " is-now" : ""}">
            <div class="fish-dex__sectionHead"><span>${escapeHtml(sec.name)}</span>${ml14TypeBadges(sec.elements)}${isNow ? `<span class="tag tag--fish-match">开放中</span>` : ""}</div>
            <div class="fish-dex__cells">${cells}</div>
          </div>`;
      }).join("");

      const trophyHtml = FISHING_TROPHY_TIERS.map(
        (t) => `<span class="fish-trophy__tier tier-${t.tier}${fishBonus.trophyTier >= t.tier ? " is-on" : ""}">${renderUiIcon("fishingTrophy", 26)}<span>${escapeHtml(t.name)}</span><small>${t.minSpecies} 种</small></span>`,
      ).join("");

      const lh = fishClub.lastHaul;
      const lhFish = lh?.bestFishId ? getFishingFishDef(lh.bestFishId) : null;
      const haulHtml = lh
        ? `<div class="fish-haul">${renderUiIcon("creekFish", 18)}<span>上次收鱼篓 ${lh.count} 条：${escapeHtml(fishResTxt(lh.rewards) || "一篓好心情")}${lhFish ? ` · 最佳「${escapeHtml(lhFish.name)}」${lh.bestSize} cm` : ""}</span></div>`
        : "";
      const fishLogsHtml = (fishClub.recentLogs || [])
        .filter((ln) => !(lh && ln.startsWith("【收鱼篓】")))
        .slice(0, 2)
        .map((ln) => `<div class="camp-log-line">${escapeHtml(ln)}</div>`)
        .join("");

      rows.push(`
        <div class="row fish-body">
          <div class="row__left" style="width:100%">
            <div class="fish-top">
              <div class="fish-now section-${escapeHtml(fishSection.id)}" data-fish-section-now="${escapeHtml(fishSection.id)}">
                <div class="fish-now__head">
                  ${renderUiIcon("fishingDock", 44)}
                  <div class="fish-now__titleBox">
                    <div class="fish-now__label">当前开放溪段</div>
                    <div class="fish-now__name">「${escapeHtml(fishSection.name)}」</div>
                    <div class="fish-now__sub">${ml14TypeBadges(fishSection.elements)}<span class="tag" data-fish-rotate-txt="1">${escapeHtml(ml14RotateText(fishSection))}</span></div>
                  </div>
                </div>
                <div class="fish-now__desc">${escapeHtml(fishSection.desc)}</div>
                <div class="fish-now__fish">${sectionFishHtml}</div>
                <div class="dock-progress fish-cast-progress">
                  <div class="dock-progress__bar"><i data-fish-cast-fill="1" style="width:${castView.pct}%"></i></div>
                  <span class="dock-progress__txt" data-fish-cast-txt="1">${escapeHtml(castView.text)}</span>
                </div>
              </div>
              <div class="fish-spots">
                <div class="voyage-panel-title fish-panel-title">${renderUiIcon("fishingRod", 18)}<span>钓位</span><span class="tag">按属性挑选钓手</span></div>
                ${spotsHtml}
              </div>
            </div>
            <div class="fish-creel">
              <div class="voyage-panel-title fish-panel-title">${renderUiIcon("creekFish", 18)}<span>鱼篓</span><span class="tag">${creelN}/${FISHING_CREEL_CAP} 条 · 常见换灵果 · 稀有换未来币与灵晶 · 溪王换未来币与星砂</span></div>
              <div class="fish-creel__chips">${creelHtml}</div>
            </div>
            <div class="fish-dex">
              <div class="voyage-panel-title fish-panel-title">${renderUiIcon("fishingTrophy", 18)}<span>钓获图鉴与钓鱼会奖杯</span><span class="tag">${fishBonus.species}/${fishBonus.totalSpecies} 种 · 溪王 ${fishBonus.legends}/${fishBonus.totalLegends}${fishBonus.nextTier ? ` · 再登记 ${fishBonus.nextTier.minSpecies - fishBonus.species} 种升${escapeHtml(fishBonus.nextTier.name)}` : " · 奖杯已满级"}</span></div>
              <div class="fish-trophy">${trophyHtml}</div>
              <div class="fish-dex__grid">${dexHtml}</div>
            </div>
            <div class="fish-bottom-row">
              <div class="eco-aura-strip">
                <span class="shiny-aura-pill ${fishBonus.prodAdd > 0 ? "is-on" : ""}">全产 +${ml14Pct(fishBonus.prodAdd)}</span>
                <span class="shiny-aura-pill ${fishBonus.catchAdd > 0 ? "is-on" : ""}">捕获 +${ml14Pct(fishBonus.catchAdd)}</span>
                <span class="shiny-aura-pill ${fishBonus.shinyAdd > 0 ? "is-on" : ""}">闪光 +${ml14Pct(fishBonus.shinyAdd)}</span>
                <span class="shiny-aura-pill ${fishBonus.pveOutAdd > 0 ? "is-on" : ""}">PvE 增伤 +${ml14Pct(fishBonus.pveOutAdd)}</span>
                <span class="shiny-aura-pill">累计钓获 ${fishBonus.totalCaught} 条</span>
              </div>
              ${haulHtml}
              ${fishLogsHtml ? `<div class="star-camp-logs" style="margin-top:6px">${fishLogsHtml}</div>` : !haulHtml ? `<div class="voyage-last is-empty">还没有钓获记录：点「一键选钓手」请伙伴们到溪边下竿吧。</div>` : ""}
            </div>
          </div>
        </div>
      `);

      if (ui.fishModalOpen) {
        const spotsLeft = FISHING_ANGLER_MAX - anglers.length;
        const modalMons = fishIdle
          .map((m) => ({ m, ev: evaluateFishingAngler(m, fishSection.id, ml14Opts) }))
          .filter((x) => x.ev)
          .sort(
            (a, b) =>
              Number(b.ev.sectionMatch) - Number(a.ev.sectionMatch) ||
              b.ev.favFishIds.length - a.ev.favFishIds.length ||
              b.ev.biteChance - a.ev.biteChance ||
              (a.m.id || 0) - (b.m.id || 0),
          );
        const skipped = list.filter(Boolean).length - modalMons.length;
        const modalRowsHtml = modalMons.length
          ? modalMons
              .map(({ m, ev }) => {
                const odds = getFishingCatchOdds(m, fishSection.id, ml14Opts);
                const legendOdd = odds.find((o) => getFishingFishDef(o.fishId)?.rarity === "legend");
                const favNames = ev.favFishIds.map((id) => getFishingFishDef(id)?.name || "").filter(Boolean);
                return `
                  <div class="row func-mon-row ${ev.sectionMatch ? "is-active" : ""}">
                    <div class="row__left">
                      <div class="row__title row__titleLine">${renderBeastIcon(m.dex, m.name, Boolean(m.isShiny))}<span>${escapeHtml(m.name)}</span><span class="tag">Lv.${m.lvl || 1}</span>${ev.sectionMatch ? `<span class="tag tag--fish-match">溪段契合</span>` : ""}</div>
                      <div class="row__desc">${ml14TypeBadges(ev.types) || "-"} · 咬钩 ${Math.round(ev.biteChance * 100)}% · 溪王概率 ${Math.round((legendOdd?.chance || 0) * 1000) / 10}%${favNames.length ? ` · 擅钓 ${escapeHtml(favNames.join("、"))}` : ""}</div>
                    </div>
                    <div class="row__right">
                      <button type="button" class="btn btn--small btn--primary" data-fish-modal-pick="${m.id}" ${spotsLeft > 0 ? "" : "disabled"}>下竿</button>
                    </div>
                  </div>`;
              })
              .join("")
          : `<div class="muted" style="padding:12px">当前暂无空闲伙伴可以垂钓（训练、远征、出战、孵育、露营、沙盘以及码头、观察站、浮岛、寻宝远航、泡汤、送信、入梦、烘焙、气球旅行、游乐园值班、夜营观星与本命灵契中的伙伴已被安全过滤）。</div>`;
        fishModalHtml = `
          <div class="modalOverlay" data-fish-modal-overlay="1">
            <div class="modal">
              <div class="modal__header">
                <div class="modal__title">${renderUiIcon("fishingRod", 20)}<span>为「${escapeHtml(fishSection.name)}」挑选钓手</span><span class="tag">空钓位 ${Math.max(0, spotsLeft)}/${FISHING_ANGLER_MAX}</span></div>
                <div class="modal__right">
                  <button type="button" class="btn btn--small" data-fish-modal-close="1">关闭</button>
                </div>
              </div>
              <div class="modal__desc">仅展示空闲伙伴（已过滤 ${Math.max(0, skipped)} 只忙碌中的伙伴）。${escapeHtml(fishSection.elements.map((t) => TYPE_ZH?.[t] ?? t).join(" / "))}系伙伴与这段溪流契合：咬钩率 +20%、溪王权重 ×1.6；与鱼同属性的钓手钓到那种鱼的权重 ×2.5。</div>
              <div class="modal__body">${modalRowsHtml}</div>
              <div class="actions">
                <button type="button" class="btn btn--primary" data-fish-modal-close="1">完成</button>
              </div>
            </div>
          </div>`;
      }
    }

    // ========== ML-13 Section: 萌灵「温泉疗愈乡」(Hot Spring Healing Village) ==========
    const hideHotSpring = Boolean(ui.functionsHideHotSpring);
    const hotSpring = ensureHotSpringState(state);
    const springAura = computeHotSpringAura(state);
    const ml13Coins = Math.max(0, Math.floor(state.res?.futurecoin?.value ?? 0));
    const ml13Pct = (n) => `${Math.round((Number(n) || 0) * 1000) / 10}%`;
    const ml13Types = (m) => getMonTypesForExpedition(m, getBeastDataByDex);
    const ml13Opts = { getBeastDataByDex, getMonTypes: ml13Types };
    const springIdle = getIdleHotSpringCandidates(state);
    const towelFree = getHotSpringTowelFreeLeft(state);
    const canTowel = springAura.soakingCount > 0 && (towelFree > 0 || ml13Coins >= HOT_SPRING_TOWEL_COIN_COST);
    const springFreeSeats = HOT_SPRING_POOL_DEFS.filter((d) => isHotSpringPoolUnlocked(state, d.id)).reduce(
      (s, d) => s + Math.max(0, HOT_SPRING_SEATS_PER_POOL - (hotSpring.pools[d.id]?.seatIds?.length || 0)),
      0,
    );
    const ml13TypeBadges = (m) =>
      ml13Types(m)
        .map((t) => `<span class="badge type type-${escapeHtml(t)}">${escapeHtml(TYPE_ZH?.[t] ?? t)}</span>`)
        .join("");
    const ml13Aff = (m) => Math.max(0, Math.min(100, Math.floor(typeof m?.affection === "number" && Number.isFinite(m.affection) ? m.affection : 0)));
    let springModalHtml = "";

    rows.push(`
      <div class="row spring-header ${springAura.soakingCount > 0 ? "is-soaking" : ""}" data-hot-spring="1">
        <div class="row__left">
          <div class="row__title row__titleLine">
            ${renderUiIcon("hotSpring", 20)}
            <span>温泉疗愈乡</span>
            <span class="tag tag--spring-title">${escapeHtml(springAura.title)}</span>
            <span class="tag tag--spring-count">${renderUiIcon("bathBucket", 14)}<span>泡汤 ${springAura.soakingCount}/${springAura.seats}</span></span>
            <span class="tag tag--spring-count">${renderUiIcon("relaxTowel", 14)}<span>舒缓状态 ${springAura.activeCount}/${HOT_SPRING_STATE_DEFS.length}</span></span>
            <span class="tag">累计疗愈 ${springAura.totalRounds} 轮</span>
          </div>
          <div class="row__desc">请空闲伙伴到属性汤池里泡汤放松：每满 30 分钟完成一轮疗愈，每位泡汤伙伴为这座汤池的舒缓状态续上 20 分钟（属性契合 30 分钟、最多存 6 小时），亲密度 +3（契合 +5）。舒缓状态生效期间提供全局加成；泡汤中的伙伴自动享防放生保护，出浴即可解除。</div>
        </div>
        <div class="row__right spring-header__btns">
          <button type="button" class="btn btn--small${springFreeSeats > 0 && springIdle.length > 0 ? " btn--primary" : ""}" data-spring-autofill="1" ${springFreeSeats > 0 && springIdle.length > 0 ? "" : "disabled"}>一键入池</button>
          <button type="button" class="btn btn--small" data-spring-towel="1" ${canTowel ? "" : "disabled"}>${towelFree > 0 ? "热毛巾招待（今日免费）" : `热毛巾招待（${HOT_SPRING_TOWEL_COIN_COST} 币）`}</button>
          <button type="button" class="btn btn--small" data-spring-recall="1" ${springAura.soakingCount > 0 ? "" : "disabled"}>全部出浴</button>
          <button type="button" class="btn btn--small btn--ghost" data-func-toggle="hotSpring">${hideHotSpring ? "展开" : "收起"}</button>
        </div>
      </div>
    `);

    if (!hideHotSpring) {
      const stateHtml = HOT_SPRING_STATE_DEFS.map((sd) => {
        const rem = Math.max(0, Number(hotSpring.states?.[sd.id]) || 0);
        const view = ml13StateView(rem);
        const pool = HOT_SPRING_POOL_DEFS.find((p) => p.stateId === sd.id);
        return `
          <div class="spring-state state-${escapeHtml(sd.id)} ${rem > 0 ? "is-on" : "is-off"}" title="${escapeHtml(sd.desc)}">
            ${renderUiIcon("relaxTowel", 24)}
            <div class="spring-state__body">
              <div class="spring-state__name"><span>${escapeHtml(sd.name)}</span><span class="tag">${escapeHtml(sd.effectText)}</span></div>
              <div class="dock-progress__bar"><i data-spring-state-fill="${escapeHtml(sd.id)}" style="width:${view.pct}%"></i></div>
              <div class="spring-state__rem"><span data-spring-state-rem="${escapeHtml(sd.id)}">${escapeHtml(view.text)}</span><span class="spring-state__src">${escapeHtml(pool?.name || "")}</span></div>
            </div>
          </div>`;
      }).join("");

      const poolHtml = HOT_SPRING_POOL_DEFS.map((def) => {
        const unlocked = isHotSpringPoolUnlocked(state, def.id);
        const sd = getHotSpringStateDef(def.stateId);
        const seatIds = hotSpring.pools[def.id]?.seatIds || [];
        const seatMons = seatIds.map((id) => list.find((m) => m && m.id === id) || null).filter(Boolean);
        const elemBadges = def.elements.map((t) => `<span class="badge type type-${escapeHtml(t)}">${escapeHtml(TYPE_ZH?.[t] ?? t)}</span>`).join("");
        if (!unlocked) {
          const need = Math.max(0, def.unlockRounds - springAura.totalRounds);
          return `
            <div class="spring-pool pool-${escapeHtml(def.id)} is-locked" data-spring-pool="${escapeHtml(def.id)}">
              <div class="spring-pool__head">
                ${renderUiIcon("hotSpring", 32)}
                <div class="spring-pool__titleBox">
                  <div class="spring-pool__name">${escapeHtml(def.name)}</div>
                  <div class="spring-pool__sub">${elemBadges}<span class="tag">舒缓状态「${escapeHtml(sd?.name || "")}」</span></div>
                </div>
              </div>
              <div class="spring-pool__desc">${escapeHtml(def.desc)}</div>
              <div class="spring-pool__lock">累计疗愈 ${def.unlockRounds} 轮后开放（还差 ${need} 轮）</div>
            </div>`;
        }
        const round = ml13PoolRound(hotSpring, def.id, seatMons.length);
        const perRound = seatMons.reduce(
          (acc, m) => {
            const ev = evaluateHotSpringSoaker(m, def.id, ml13Opts);
            acc.sec += ev.stateSec;
            acc.aff += ev.affection;
            return acc;
          },
          { sec: 0, aff: 0 },
        );
        const seatsHtml = Array.from({ length: HOT_SPRING_SEATS_PER_POOL }, (_, idx) => {
          const m = seatMons[idx] || null;
          if (!m) {
            return `
              <div class="spring-seat is-empty">
                ${renderUiIcon("bathBucket", 24)}
                <span class="spring-seat__empty">空泡汤位 ${idx + 1}</span>
                <button type="button" class="btn btn--small" data-spring-open="${escapeHtml(def.id)}" ${springIdle.length > 0 ? "" : "disabled"}>请伙伴入池</button>
              </div>`;
          }
          const ev = evaluateHotSpringSoaker(m, def.id, ml13Opts);
          const aff = ml13Aff(m);
          return `
            <div class="spring-seat is-filled${ev.match ? " is-match" : ""}" data-spring-soaker="${m.id}">
              ${renderBeastIcon(m.dex, m.name, Boolean(m.isShiny))}
              <div class="spring-seat__body">
                <div class="spring-seat__name">${escapeHtml(m.name)} <span class="tag">Lv.${m.lvl || 1}</span>${ev.match ? `<span class="tag tag--spring-match">汤池契合</span>` : ""}</div>
                <div class="spring-seat__aff"><span>亲密 ${aff}/100</span><span class="spring-seat__affBar"><i style="width:${aff}%"></i></span></div>
              </div>
              <button type="button" class="btn btn--small btn--ghost" data-spring-out="${m.id}">出浴</button>
            </div>`;
        }).join("");
        return `
          <div class="spring-pool pool-${escapeHtml(def.id)}${seatMons.length ? " is-active" : ""}" data-spring-pool="${escapeHtml(def.id)}">
            <div class="spring-pool__head">
              ${renderUiIcon("hotSpring", 32)}
              <div class="spring-pool__titleBox">
                <div class="spring-pool__name">${escapeHtml(def.name)} <span class="tag">${seatMons.length}/${HOT_SPRING_SEATS_PER_POOL}</span></div>
                <div class="spring-pool__sub">${elemBadges}<span class="tag">舒缓状态「${escapeHtml(sd?.name || "")}」${escapeHtml(sd?.effectText || "")}</span></div>
              </div>
            </div>
            <div class="spring-pool__desc">${escapeHtml(def.desc)}</div>
            <div class="dock-progress spring-round">
              <div class="dock-progress__bar"><i data-spring-fill="${escapeHtml(def.id)}" style="width:${round.pct}%"></i></div>
              <span class="dock-progress__txt" data-spring-txt="${escapeHtml(def.id)}">${escapeHtml(round.text)}</span>
            </div>
            <div class="spring-pool__yield">${seatMons.length ? `每轮：「${escapeHtml(sd?.name || "")}」+${Math.round(perRound.sec / 60)} 分钟 · 亲密合计 +${perRound.aff}` : "每轮：每位伙伴「" + escapeHtml(sd?.name || "") + "」+20 分钟（契合 +30）· 亲密 +3（契合 +5）"}</div>
            <div class="spring-seat-row">${seatsHtml}</div>
          </div>`;
      }).join("");

      const springLogsHtml = (hotSpring.recentLogs || []).slice(0, 2).map((ln) => `<div class="camp-log-line">${escapeHtml(ln)}</div>`).join("");
      rows.push(`
        <div class="row spring-body">
          <div class="row__left" style="width:100%">
            <div class="voyage-panel-title spring-panel-title">${renderUiIcon("relaxTowel", 18)}<span>舒缓状态</span><span class="tag">每种最多存 6 小时 · 离线最多补算 12 小时</span></div>
            <div class="spring-state-strip">${stateHtml}</div>
            <div class="spring-pool-grid">${poolHtml}</div>
            <div class="spring-bottom-row">
              <div class="eco-aura-strip">
                <span class="shiny-aura-pill ${springAura.prodAdd > 0 ? "is-on" : ""}">全产 +${ml13Pct(springAura.prodAdd)}</span>
                <span class="shiny-aura-pill ${springAura.catchAdd > 0 ? "is-on" : ""}">捕获 +${ml13Pct(springAura.catchAdd)}</span>
                <span class="shiny-aura-pill ${springAura.shinyAdd > 0 ? "is-on" : ""}">闪光 +${ml13Pct(springAura.shinyAdd)}</span>
                <span class="shiny-aura-pill ${springAura.pveOutAdd > 0 ? "is-on" : ""}">PvE 增伤 +${ml13Pct(springAura.pveOutAdd)}</span>
                <span class="shiny-aura-pill">疗愈亲密累计 +${Math.max(0, Math.floor(Number(hotSpring.totalAffection) || 0))}</span>
              </div>
              ${springLogsHtml ? `<div class="star-camp-logs" style="margin-top:6px">${springLogsHtml}</div>` : `<div class="voyage-last is-empty">还没有泡汤记录：点「一键入池」请伙伴们来泡个热汤吧。</div>`}
            </div>
          </div>
        </div>
      `);

      const modalPool = ui.springModalPool ? getHotSpringPoolDef(ui.springModalPool) : null;
      if (modalPool && isHotSpringPoolUnlocked(state, modalPool.id)) {
        const seatsLeft = HOT_SPRING_SEATS_PER_POOL - (hotSpring.pools[modalPool.id]?.seatIds?.length || 0);
        const modalMons = springIdle
          .map((m) => ({ m, ev: evaluateHotSpringSoaker(m, modalPool.id, ml13Opts) }))
          .sort((a, b) => Number(b.ev.match) - Number(a.ev.match) || ml13Aff(a.m) - ml13Aff(b.m) || (a.m.id || 0) - (b.m.id || 0));
        const skipped = list.filter(Boolean).length - modalMons.length;
        const modalRowsHtml = modalMons.length
          ? modalMons
              .map(
                ({ m, ev }) => `
                  <div class="row func-mon-row ${ev.match ? "is-active" : ""}">
                    <div class="row__left">
                      <div class="row__title row__titleLine">${renderBeastIcon(m.dex, m.name, Boolean(m.isShiny))}<span>${escapeHtml(m.name)}</span><span class="tag">Lv.${m.lvl || 1}</span>${ev.match ? `<span class="tag tag--spring-match">汤池契合</span>` : ""}</div>
                      <div class="row__desc">${ml13TypeBadges(m) || "-"} · 亲密 ${ml13Aff(m)}/100 · 每轮状态 +${Math.round(ev.stateSec / 60)} 分钟 · 亲密 +${ev.affection}</div>
                    </div>
                    <div class="row__right">
                      <button type="button" class="btn btn--small btn--primary" data-spring-modal-pick="${m.id}" ${seatsLeft > 0 ? "" : "disabled"}>入池</button>
                    </div>
                  </div>`,
              )
              .join("")
          : `<div class="muted" style="padding:12px">当前暂无空闲伙伴可以泡汤（训练、远征、出战、孵育、露营、沙盘、码头、观察站、浮岛、寻宝远航、送信、入梦、垂钓、烘焙、气球旅行、游乐园值班、夜营观星与本命灵契中的伙伴已被安全过滤）。</div>`;
        springModalHtml = `
          <div class="modalOverlay" data-spring-modal-overlay="1">
            <div class="modal">
              <div class="modal__header">
                <div class="modal__title">${renderUiIcon("hotSpring", 20)}<span>请伙伴泡「${escapeHtml(modalPool.name)}」</span><span class="tag">空位 ${Math.max(0, seatsLeft)}/${HOT_SPRING_SEATS_PER_POOL}</span></div>
                <div class="modal__right">
                  <button type="button" class="btn btn--small" data-spring-modal-close="1">关闭</button>
                </div>
              </div>
              <div class="modal__desc">仅展示空闲伙伴（已过滤 ${Math.max(0, skipped)} 只忙碌中的伙伴）。${escapeHtml(modalPool.elements.map((t) => TYPE_ZH?.[t] ?? t).join(" / "))}系伙伴与这座汤池契合：舒缓状态多续 10 分钟、亲密多 +2。</div>
              <div class="modal__body">${modalRowsHtml}</div>
              <div class="actions">
                <button type="button" class="btn btn--primary" data-spring-modal-close="1">完成</button>
              </div>
            </div>
          </div>`;
      }
    }

    // ========== ML-13 Section: 萌灵「邮局信使网络」(Post Office Messenger Network) ==========
    const hidePostOffice = Boolean(ui.functionsHidePostOffice);
    const postOffice = ensurePostOfficeState(state);
    const postBonus = computePostOfficeBonus(state);
    const postIdle = getIdlePostMessengerCandidates(state);
    const postExpressFree = getPostExpressFreeLeft(state);
    const postEnRoute = postOffice.trips.filter((t) => !isPostTripArrived(t));
    const postArrived = postOffice.trips.filter((t) => isPostTripArrived(t));
    const canPostExpress = postEnRoute.length > 0 && (postExpressFree > 0 || ml13Coins >= POST_EXPRESS_COIN_COST);
    const postUnlockedRoutes = POST_ROUTES.filter((r) => isPostRouteUnlocked(state, r.id));
    const postFreeRoute = postUnlockedRoutes.some((r) => !postOffice.trips.some((t) => t.routeId === r.id));
    const canPostDispatch = postOffice.letters > 0 && postOffice.trips.length < POST_MAX_MESSENGERS && postIdle.length > 0 && postFreeRoute;
    const postCaught = Object.values(state.dex?.caught || {}).filter((v) => typeof v === "number" && v > 0).length;
    const postResTxt = (res) =>
      Object.entries(res || {})
        .filter(([, n]) => n > 0)
        .map(([rid, n]) => `${POST_RES_ZH[rid] || rid} +${n}`)
        .join(" · ");
    let postModalHtml = "";

    rows.push(`
      <div class="row post-header ${postOffice.trips.length ? "is-busy" : ""}" data-post-office="1">
        <div class="row__left">
          <div class="row__title row__titleLine">
            ${renderUiIcon("postOffice", 20)}
            <span>萌灵邮局信使网络</span>
            <span class="tag tag--post-title">${escapeHtml(postBonus.title)}</span>
            <span class="tag tag--post-count">${renderUiIcon("messengerBag", 14)}<span>信使 ${postOffice.trips.length}/${POST_MAX_MESSENGERS}</span></span>
            <span class="tag tag--post-count">信件 ${postOffice.letters}/${POST_LETTER_CAP}</span>
            <span class="tag tag--post-count">${renderUiIcon("postmarkStamp", 14)}<span>邮戳 ${postBonus.collected}/${postBonus.totalRegions}</span></span>
          </div>
          <div class="row__desc">萌灵邮局设在芽芽草甸路口，9 条邮路沿各捕捉生态区一站站延伸（生态区解锁后邮路随之开通）。邮筒每 20 分钟收到 1 封信，派空闲伙伴带信出发、往返后拆开回信：未来币、当地特产与概率附赠的小礼物；送往伙伴故乡生态区的「同乡信使」奖励 ×1.5，风 / 电系「疾行信使」更快。每次送达都会在该生态区的邮戳上再盖一次（1 / 5 / 15 次升为铜 / 银 / 金戳），邮戳永久提升全产与捕获。送信中的伙伴自动享防放生保护。</div>
        </div>
        <div class="row__right post-header__btns">
          <button type="button" class="btn btn--small${canPostDispatch ? " btn--primary" : ""}" data-post-autodispatch="1" ${canPostDispatch ? "" : "disabled"}>一键派信</button>
          <button type="button" class="btn btn--small${postArrived.length ? " btn--primary" : ""}" data-post-claim-all="1" ${postArrived.length ? "" : "disabled"}>一键拆信${postArrived.length ? `（${postArrived.length}）` : ""}</button>
          <button type="button" class="btn btn--small" data-post-express="1" ${canPostExpress ? "" : "disabled"}>${postExpressFree > 0 ? "信使加急（今日免费）" : `信使加急（${POST_EXPRESS_COIN_COST} 币）`}</button>
          <button type="button" class="btn btn--small btn--ghost" data-func-toggle="postOffice">${hidePostOffice ? "展开" : "收起"}</button>
        </div>
      </div>
    `);

    if (!hidePostOffice) {
      const lv = ml13LetterView(postOffice);
      const tripByRoute = new Map(postOffice.trips.map((t) => [t.routeId, t]));
      const routeHtml = POST_ROUTES.map((r) => {
        const unlocked = isPostRouteUnlocked(state, r.id);
        const count = Math.max(0, Math.floor(Number(postOffice.postmarks?.[r.id]) || 0));
        const tier = getPostmarkTier(count);
        const nextTier = POSTMARK_TIERS.find((t) => t.tier === tier + 1) || null;
        const path = getPostRoutePath(r.id);
        const pathTxt = path.length > 3 ? `萌灵邮局 → ${path[0]} → … → ${path[path.length - 1]}` : `萌灵邮局 → ${path.join(" → ")}`;
        const trip = tripByRoute.get(r.id) || null;
        const tripMon = trip ? list.find((m) => m && m.id === trip.monId) || null : null;
        let actionHtml = "";
        if (!unlocked) {
          actionHtml = `<div class="post-route__lock">收录 ${r.unlockReq} 种图鉴后开通（当前 ${postCaught}）</div>`;
        } else if (trip && isPostTripArrived(trip)) {
          actionHtml = `
            <div class="post-route__trip is-back">
              <span class="voyage-crew-chip" data-post-messenger="${trip.monId}">${tripMon ? renderBeastIcon(tripMon.dex, tripMon.name, Boolean(tripMon.isShiny)) : ""}<span>${escapeHtml(tripMon?.name || "信使")}</span></span>
              <span class="tag tag--post-back">已返回 · 待拆回信</span>
              ${trip.homeTown ? `<span class="tag tag--post-home">同乡信使</span>` : ""}
            </div>
            <button type="button" class="btn btn--small btn--primary" data-post-claim="${escapeHtml(r.id)}">拆开回信</button>`;
        } else if (trip) {
          const tv = ml13TripView(trip);
          actionHtml = `
            <div class="post-route__trip">
              <span class="voyage-crew-chip" data-post-messenger="${trip.monId}">${tripMon ? renderBeastIcon(tripMon.dex, tripMon.name, Boolean(tripMon.isShiny)) : ""}<span>${escapeHtml(tripMon?.name || "信使")}</span></span>
              ${trip.homeTown ? `<span class="tag tag--post-home">同乡信使</span>` : ""}${trip.swift ? `<span class="tag tag--post-swift">疾行</span>` : ""}
            </div>
            <div class="dock-progress post-trip-progress">
              <div class="dock-progress__bar"><i data-post-fill="${escapeHtml(r.id)}" style="width:${tv.pct}%"></i></div>
              <span class="dock-progress__txt" data-post-txt="${escapeHtml(r.id)}">${escapeHtml(tv.text)}</span>
            </div>
            <button type="button" class="btn btn--small btn--ghost" data-post-recall="${escapeHtml(r.id)}">召回信使（信件退回邮筒）</button>`;
        } else {
          const canOpen = postOffice.letters > 0 && postOffice.trips.length < POST_MAX_MESSENGERS && postIdle.length > 0;
          const why = postOffice.letters < 1 ? "邮筒暂时没有信" : postOffice.trips.length >= POST_MAX_MESSENGERS ? "信使都在外面" : postIdle.length < 1 ? "暂无空闲伙伴" : "派遣信使（1 封信）";
          actionHtml = `<button type="button" class="btn btn--small${canOpen ? " btn--primary" : ""}" data-post-open="${escapeHtml(r.id)}" ${canOpen ? "" : "disabled"}>${escapeHtml(why)}</button>`;
        }
        return `
          <div class="post-route ${unlocked ? "" : "is-locked"} ${trip ? "is-busy" : ""} tier-${tier}" data-post-route="${escapeHtml(r.id)}">
            <div class="post-route__head">
              <span class="post-stamp tier-${tier}">${renderUiIcon("postmarkStamp", 30)}</span>
              <div class="post-route__titleBox">
                <div class="post-route__name">${escapeHtml(r.name)}<span class="tag">第 ${r.idx + 1} 站</span></div>
                <div class="post-route__path">${escapeHtml(pathTxt)}</div>
              </div>
            </div>
            <div class="post-route__tags">
              <span class="tag">往返约 ${Math.round(r.tripSec / 60)} 分钟</span>
              <span class="tag">未来币 +${r.coin}</span>
              <span class="tag">${escapeHtml(POST_RES_ZH[r.specialty.rid] || r.specialty.rid)} +${r.specialty.n}</span>
              <span class="tag">${Math.round(r.giftChance * 100)}% 附赠${escapeHtml(POST_RES_ZH[r.gift.rid] || r.gift.rid)} ×${r.gift.n}</span>
            </div>
            <div class="post-route__mark"><span class="tag tag--postmark tier-${tier}">${escapeHtml(r.postmarkName)} · ${escapeHtml(getPostmarkTierName(tier))}</span><span class="post-route__count">已送达 ${count} 次${nextTier ? ` · 再 ${nextTier.minDeliveries - count} 次升${nextTier.name}` : " · 已满级"}</span></div>
            ${actionHtml}
          </div>`;
      }).join("");

      const albumHtml = POST_ROUTES.map((r) => {
        const count = Math.max(0, Math.floor(Number(postOffice.postmarks?.[r.id]) || 0));
        const tier = getPostmarkTier(count);
        const out = tripByRoute.has(r.id);
        return `
          <div class="post-album__stamp tier-${tier}${out ? " has-messenger" : ""}" title="${escapeHtml(`${r.name} · ${r.postmarkName} · ${getPostmarkTierName(tier)}（送达 ${count} 次）`)}">
            ${renderUiIcon("postmarkStamp", 26)}
            <span class="post-album__name">${escapeHtml(r.stamp)}</span>
            <span class="post-album__tier">${escapeHtml(tier ? getPostmarkTierName(tier) : "未盖戳")}</span>
          </div>`;
      }).join("");

      const lr = postOffice.lastReply;
      const replyHtml = lr
        ? `<div class="post-letter">
            <div class="post-letter__head">${renderUiIcon("messengerBag", 18)}<strong>来自「${escapeHtml(lr.regionName)}」的回信</strong>${lr.homeTown ? `<span class="tag tag--post-home">同乡信使</span>` : ""}${lr.newTier ? `<span class="tag tag--postmark tier-${lr.newTier}">邮戳升为${escapeHtml(getPostmarkTierName(lr.newTier))}</span>` : ""}</div>
            <div class="post-letter__text">「${escapeHtml(lr.text)}」</div>
            <div class="post-letter__meta">信使 ${escapeHtml(lr.monName)} · ${escapeHtml(postResTxt(lr.rewards) || "一封温暖的回信")}</div>
          </div>`
        : `<div class="voyage-last is-empty">还没有拆过回信：点「一键派信」请伙伴们背上信使包出发吧。</div>`;
      const postLogsHtml = (postOffice.recentLogs || []).slice(0, 2).map((ln) => `<div class="camp-log-line">${escapeHtml(ln)}</div>`).join("");

      rows.push(`
        <div class="row post-body">
          <div class="row__left" style="width:100%">
            <div class="dock-progress post-letter-progress">
              <div class="dock-progress__bar"><i data-post-letter-fill="1" style="width:${lv.pct}%"></i></div>
              <span class="dock-progress__txt" data-post-letter-txt="1">${escapeHtml(lv.text)}</span>
            </div>
            <div class="post-route-grid">${routeHtml}</div>
            <div class="post-bottom-row">
              <div class="post-album">
                <div class="voyage-panel-title">${renderUiIcon("postmarkStamp", 18)}<span>邮戳册</span><span class="tag">${postBonus.collected}/${postBonus.totalRegions} 区 · 等级 ${postBonus.tierPoints}/${postBonus.maxPoints}${postBonus.fullNetwork ? " · 信使网络全通" : ""}</span></div>
                <div class="post-album__grid">${albumHtml}</div>
                <div class="eco-aura-strip" style="margin-top:6px">
                  <span class="shiny-aura-pill ${postBonus.prodAdd > 0 ? "is-on" : ""}">全产 +${ml13Pct(postBonus.prodAdd)}</span>
                  <span class="shiny-aura-pill ${postBonus.catchAdd > 0 ? "is-on" : ""}">捕获 +${ml13Pct(postBonus.catchAdd)}</span>
                  <span class="shiny-aura-pill">送达 ${postBonus.totalDeliveries} 次 · 同乡 ${Math.max(0, Math.floor(Number(postOffice.totalHomeTown) || 0))} 次</span>
                </div>
              </div>
              <div class="post-log-box">
                ${replyHtml}
                ${postLogsHtml ? `<div class="star-camp-logs" style="margin-top:6px">${postLogsHtml}</div>` : ""}
              </div>
            </div>
          </div>
        </div>
      `);

      const modalRoute = ui.postModalRoute ? getPostRouteDef(ui.postModalRoute) : null;
      if (modalRoute && isPostRouteUnlocked(state, modalRoute.id) && !tripByRoute.has(modalRoute.id)) {
        const modalMons = postIdle
          .map((m) => ({ m, ev: evaluatePostMessenger(m, modalRoute.id, ml13Opts) }))
          .filter((x) => x.ev)
          .sort(
            (a, b) =>
              Number(b.ev.homeTown) - Number(a.ev.homeTown) ||
              a.ev.tripSec - b.ev.tripSec ||
              (a.m.id || 0) - (b.m.id || 0),
          );
        const skipped = list.filter(Boolean).length - modalMons.length;
        const canSend = postOffice.letters > 0 && postOffice.trips.length < POST_MAX_MESSENGERS;
        const modalRowsHtml = modalMons.length
          ? modalMons
              .map(
                ({ m, ev }) => `
                  <div class="row func-mon-row ${ev.homeTown ? "is-active" : ""}">
                    <div class="row__left">
                      <div class="row__title row__titleLine">${renderBeastIcon(m.dex, m.name, Boolean(m.isShiny))}<span>${escapeHtml(m.name)}</span><span class="tag">Lv.${m.lvl || 1}</span>${ev.homeTown ? `<span class="tag tag--post-home">同乡信使</span>` : ""}${ev.swift ? `<span class="tag tag--post-swift">疾行</span>` : ""}</div>
                      <div class="row__desc">${ml13TypeBadges(m) || "-"} · 往返约 ${Math.max(1, Math.round(ev.tripSec / 60))} 分钟 · 奖励 ×${ev.rewardMul.toFixed(1)} · 小礼物 ${Math.round(ev.giftChance * 100)}%</div>
                    </div>
                    <div class="row__right">
                      <button type="button" class="btn btn--small btn--primary" data-post-modal-pick="${m.id}" ${canSend ? "" : "disabled"}>派遣</button>
                    </div>
                  </div>`,
              )
              .join("")
          : `<div class="muted" style="padding:12px">当前暂无空闲伙伴可以送信（训练、远征、出战、孵育、露营、沙盘、码头、观察站、浮岛、寻宝远航、泡汤、入梦、垂钓、烘焙、气球旅行、游乐园值班、夜营观星与本命灵契中的伙伴已被安全过滤）。</div>`;
        postModalHtml = `
          <div class="modalOverlay" data-post-modal-overlay="1">
            <div class="modal">
              <div class="modal__header">
                <div class="modal__title">${renderUiIcon("messengerBag", 20)}<span>派信使去「${escapeHtml(modalRoute.name)}」</span><span class="tag">信件 ${postOffice.letters}/${POST_LETTER_CAP}</span></div>
                <div class="modal__right">
                  <button type="button" class="btn btn--small" data-post-modal-close="1">关闭</button>
                </div>
              </div>
              <div class="modal__desc">仅展示空闲伙伴（已过滤 ${Math.max(0, skipped)} 只忙碌中的伙伴）。故乡在「${escapeHtml(modalRoute.name)}」的伙伴是同乡信使（奖励 ×1.5、小礼物概率 +15%），风 / 电系是疾行信使（往返 −20%），等级越高跑得越快。</div>
              <div class="modal__body">${modalRowsHtml}</div>
              <div class="actions">
                <button type="button" class="btn btn--primary" data-post-modal-close="1">关闭</button>
              </div>
            </div>
          </div>`;
      }
    }

    // ========== ML-12 Section: 萌灵「寻宝地图远航」(Treasure Map Voyage) ==========
    const hideTreasure = Boolean(ui.functionsHideTreasure);
    const treasure = ensureTreasureVoyageState(state);
    const treasureAura = computeTreasureVoyageAura(state);
    const ml12Coins = Math.max(0, Math.floor(state.res?.futurecoin?.value ?? 0));
    const ml12Pct = (n) => `${Math.round((Number(n) || 0) * 1000) / 10}%`;
    const ml12Types = (m) => getMonTypesForExpedition(m, getBeastDataByDex);
    const voyage = treasure.voyage;
    const voyIsland = voyage ? getTreasureIslandDef(voyage.islandId) : null;
    const fragHave = Math.max(0, Math.floor(state.res?.mapFragment?.value ?? 0));
    const canAssemble = fragHave >= TREASURE_MAP_FRAGMENTS_PER_MAP && treasure.maps < TREASURE_MAP_MAX_MAPS;
    const gullFree = getTreasureGullFreeLeft(state);
    const canGull = Boolean(voyage) && (gullFree > 0 || ml12Coins >= TREASURE_GULL_COIN_COST);
    const voyCrewMons = voyage ? voyage.crewIds.map((id) => list.find((m) => m && m.id === id) || null).filter(Boolean) : [];
    const stagedMons = treasure.stagedIds.map((id) => list.find((m) => m && m.id === id) || null).filter(Boolean);
    const voyIdleMons = getIdleTreasureVoyageCandidates(state);
    const stagedEval = evaluateTreasureVoyageCrew(stagedMons, state, { getBeastDataByDex });
    const voyStatusTxt = voyage
      ? voyage.phase === "sailing"
        ? `航行中 → 「${voyIsland?.name || ""}」`
        : `登岛探索「${voyIsland?.name || ""}」· 体力 ${voyage.stamina}/${voyage.maxStamina}`
      : treasure.maps > 0
        ? "港口待命 · 可以扬帆"
        : "港口待命 · 先集残片拼藏宝图";
    const ml12RoleTags = (m) => {
      const t = ml12Types(m);
      const out = [];
      if (t.some((x) => TREASURE_NAVIGATOR_TYPES.includes(x))) out.push(`<span class="tag tag--voyage-role role-nav">领航</span>`);
      if (t.some((x) => TREASURE_PATHFINDER_TYPES.includes(x))) out.push(`<span class="tag tag--voyage-role role-path">探路</span>`);
      if (t.some((x) => TREASURE_SEEKER_TYPES.includes(x))) out.push(`<span class="tag tag--voyage-role role-seek">寻宝直觉</span>`);
      return out.join("");
    };
    let treasureModalHtml = "";
    const voyCrewChips = voyCrewMons
      .map((m) => `<span class="voyage-crew-chip" data-voyage-crew="${m.id}">${renderBeastIcon(m.dex, m.name, Boolean(m.isShiny))}<span>${escapeHtml(m.name)}</span></span>`)
      .join("");

    rows.push(`
      <div class="row treasure-header ${voyage ? `is-${voyage.phase}` : ""}" data-treasure-voyage="1">
        <div class="row__left">
          <div class="row__title row__titleLine">
            ${renderUiIcon("treasureMap", 20)}
            <span>寻宝地图远航</span>
            <span class="tag tag--treasure-title">${escapeHtml(treasureAura.title)}</span>
            <span class="tag tag--treasure-count">${renderUiIcon("treasureMap", 14)}<span>藏宝图 ×${treasure.maps}/${TREASURE_MAP_MAX_MAPS}</span></span>
            <span class="tag tag--treasure-count">${renderResSvg("mapFragment", 14)}<span>残片 ${fragHave}/${TREASURE_MAP_FRAGMENTS_PER_MAP}</span></span>
            <span class="tag">纪念品 ${treasureAura.keepsakeCount}/${treasureAura.totalKeepsakes}</span>
            <span class="tag tag--treasure-status ${voyage ? "is-busy" : ""}">${escapeHtml(voyStatusTxt)}</span>
          </div>
          <div class="row__desc">从心愿码头归港、月光观察站记录出没和远征完成中收集藏宝图残片，6 片拼合一张藏宝图；挑 1~3 只空闲伙伴组成寻宝船队扬帆，登岛后在 5×5 宝岛网格上一格一格探索（每步耗 1 体力，流沙多耗 1，清泉回 3），挖出金沙、灵果、灵木、晶石、沉船宝箱、遗迹纪念品与红圈里的宝藏 X。远航中的船员自动享防放生保护。</div>
        </div>
        <div class="row__right treasure-header__btns">
          <button type="button" class="btn btn--small${canAssemble ? " btn--primary" : ""}" data-treasure-assemble="1" ${canAssemble ? "" : "disabled"}>拼合藏宝图（${TREASURE_MAP_FRAGMENTS_PER_MAP} 片）</button>
          <button type="button" class="btn btn--small" data-treasure-gull="1" ${canGull ? "" : "disabled"}>${gullFree > 0 ? "海鸥领航（今日免费）" : `海鸥领航（${TREASURE_GULL_COIN_COST} 币）`}</button>
          <button type="button" class="btn btn--small btn--ghost" data-func-toggle="treasure">${hideTreasure ? "展开" : "收起"}</button>
        </div>
      </div>
    `);

    if (!hideTreasure) {
      const fragPct = Math.max(2, Math.min(100, Math.floor((Math.min(fragHave, TREASURE_MAP_FRAGMENTS_PER_MAP) / TREASURE_MAP_FRAGMENTS_PER_MAP) * 100)));
      const fragTxt =
        treasure.maps >= TREASURE_MAP_MAX_MAPS
          ? `藏宝图已满 ${TREASURE_MAP_MAX_MAPS} 张，先出海用掉一张吧（残片 ${fragHave} 片）`
          : fragHave >= TREASURE_MAP_FRAGMENTS_PER_MAP
            ? `藏宝图残片 ${fragHave} 片 · 已够拼合一张藏宝图`
            : `藏宝图残片 ${fragHave}/${TREASURE_MAP_FRAGMENTS_PER_MAP} · 再集 ${TREASURE_MAP_FRAGMENTS_PER_MAP - fragHave} 片可拼合下一张`;
      const sourceHtml = TREASURE_FRAGMENT_SOURCES.map(
        (src) => `
          <div class="treasure-source source-${escapeHtml(src.id)}">
            <div class="treasure-source__name">${renderResSvg("mapFragment", 16)}<span>${escapeHtml(src.name)}</span><span class="tag">已得 ${Math.max(0, Math.floor(Number(treasure.fragmentSources?.[src.id]) || 0))} 片</span></div>
            <div class="treasure-source__rule">${escapeHtml(src.rule)}</div>
          </div>`,
      ).join("");

      let voyageHtml = "";
      if (!voyage) {
        const crewSlotsHtml = Array.from({ length: TREASURE_VOYAGE_MAX_CREW }, (_, idx) => {
          const m = stagedMons[idx] || null;
          if (!m) {
            return `
              <div class="voyage-crew-slot is-empty">
                <div class="voyage-crew-slot__empty">船员席位 ${idx + 1} · 空置</div>
                <button type="button" class="btn btn--small" data-treasure-open-modal="1" ${voyIdleMons.length > 0 ? "" : "disabled"}>挑选船员</button>
              </div>`;
          }
          const typeBadges = ml12Types(m).map((t) => `<span class="badge type type-${escapeHtml(t)}">${escapeHtml(TYPE_ZH?.[t] ?? t)}</span>`).join("");
          return `
            <div class="voyage-crew-slot is-filled">
              <div class="voyage-crew-slot__head">
                ${renderBeastIcon(m.dex, m.name, Boolean(m.isShiny))}
                <div class="voyage-crew-slot__titleBox">
                  <div class="voyage-crew-slot__name">${escapeHtml(m.name)} <span class="tag">Lv.${m.lvl || 1}</span></div>
                  <div class="voyage-crew-slot__meta">${typeBadges}${ml12RoleTags(m)}</div>
                </div>
              </div>
              <div class="voyage-crew-slot__foot"><button type="button" class="btn btn--small btn--ghost" data-treasure-unstage="${m.id}">移出船队</button></div>
            </div>`;
        }).join("");
        const islandCards = TREASURE_ISLAND_DEFS.map((def) => {
          const unlocked = isTreasureIslandUnlocked(state, def.id);
          const sailMin = Math.max(1, Math.round((def.sailSec * (stagedMons.length ? stagedEval.sailMul : 1)) / 60));
          const ksHtml = [def.relicKeepsake, def.crownKeepsake]
            .map((kid) => {
              const k = getTreasureKeepsakeDef(kid);
              const owned = Math.floor(Number(treasure.keepsakes?.[kid]) || 0) > 0;
              return `<span class="tag tag--keepsake ${owned ? "is-owned" : ""}">${escapeHtml(owned ? k?.name || "" : "未得纪念品")}</span>`;
            })
            .join("");
          const canSail = unlocked && treasure.maps > 0 && stagedMons.length > 0;
          const btnTxt = !unlocked
            ? `完成 ${def.unlockVoyages} 次远航后解锁`
            : treasure.maps < 1
              ? "需要 1 张藏宝图"
              : !stagedMons.length
                ? "先挑选船员"
                : "扬帆出发（消耗 1 张藏宝图）";
          return `
            <div class="treasure-island-card ${unlocked ? "" : "is-locked"}" data-treasure-island="${escapeHtml(def.id)}">
              <div class="treasure-island-card__head">
                ${renderUiIcon("treasureIsland", 34)}
                <div class="treasure-island-card__titleBox">
                  <div class="treasure-island-card__name">${escapeHtml(def.name)}</div>
                  <div class="treasure-island-card__sub">${escapeHtml(def.subtitle)}</div>
                </div>
              </div>
              <div class="treasure-island-card__desc">${escapeHtml(def.desc)}</div>
              <div class="treasure-island-card__tags"><span class="tag">航程约 ${sailMin} 分钟</span><span class="tag">宝物 ×${def.lootMul.toFixed(2)}</span>${ksHtml}</div>
              <button type="button" class="btn btn--small${canSail ? " btn--primary" : ""}" data-treasure-sail="${escapeHtml(def.id)}" ${canSail ? "" : "disabled"}>${escapeHtml(btnTxt)}</button>
            </div>`;
        }).join("");
        voyageHtml = `
          <div class="voyage-dock-panel">
            <div class="voyage-panel-title">${renderUiIcon("treasureMap", 18)}<span>组建寻宝船队</span><span class="tag">船员 ${stagedMons.length}/${TREASURE_VOYAGE_MAX_CREW}</span>
              <button type="button" class="btn btn--small" data-treasure-autocrew="1" ${voyIdleMons.length > 0 && stagedMons.length < TREASURE_VOYAGE_MAX_CREW ? "" : "disabled"}>一键组船队</button>
            </div>
            <div class="voyage-crew-grid">${crewSlotsHtml}</div>
            <div class="eco-aura-strip voyage-aura-strip">
              <span class="shiny-aura-pill ${stagedEval.stamina > 0 ? "is-on" : ""}">登岛体力 ${stagedEval.stamina}（探路 ${stagedEval.pathfinders} · 等级 +${stagedEval.lvlStamina}）</span>
              <span class="shiny-aura-pill ${stagedEval.navigators > 0 ? "is-on" : ""}">航程 ×${stagedEval.sailMul.toFixed(2)}（领航 ${stagedEval.navigators}）</span>
              <span class="shiny-aura-pill ${stagedEval.seekers > 0 ? "is-on" : ""}">宝物 ×${stagedEval.lootMul.toFixed(2)}（寻宝直觉 ${stagedEval.seekers}）</span>
            </div>
            <div class="treasure-island-grid">${islandCards}</div>
          </div>`;
      } else if (voyage.phase === "sailing") {
        const sail = ml12SailProgress(voyage);
        voyageHtml = `
          <div class="voyage-sail-banner">
            <div class="voyage-sail-banner__top">
              ${renderUiIcon("treasureIsland", 34)}
              <div class="voyage-sail-banner__text">
                <strong>寻宝船队正驶向「${escapeHtml(voyIsland?.name || "")}」</strong>
                <span>船员们正在甲板上研究藏宝图，登岛后体力 ${voyage.stamina}（远航期间防放生保护生效）。</span>
              </div>
              <button type="button" class="btn btn--small btn--ghost" data-treasure-return="1">调头回港（退回藏宝图）</button>
            </div>
            <div class="dock-progress voyage-sail-progress">
              <div class="dock-progress__bar"><i data-treasure-sail-fill="1" style="width:${sail.pct}%"></i></div>
              <span class="dock-progress__txt" data-treasure-sail-txt="1">${escapeHtml(sail.text)}</span>
            </div>
            <div class="voyage-side__crew" style="margin-top:8px">${voyCrewChips}</div>
          </div>`;
      } else {
        const frontier = new Set(getTreasureFrontier(voyage));
        const hintSet = new Set(voyage.hintIdx);
        const tilesHtml = voyage.grid
          .map((code, i) => {
            const hint = hintSet.has(i) ? " is-hint" : "";
            const rc = `第 ${Math.floor(i / 5) + 1} 行第 ${(i % 5) + 1} 格`;
            if (voyage.revealed[i]) {
              const def = TREASURE_TILE_DEFS[code] || TREASURE_TILE_DEFS.sand;
              const rw = code === "beach" ? null : computeTreasureTileReward(voyage, i);
              const firstRes = rw ? Object.entries(rw.res)[0] : null;
              const icon =
                code === "beach"
                  ? renderUiIcon("treasureIsland", 22)
                  : code === "xmark" || code === "relic"
                    ? renderUiIcon("treasureMap", 22)
                    : firstRes
                      ? renderResSvg(firstRes[0], 20)
                      : "";
              const lootTxt = rw?.keepsake
                ? getTreasureKeepsakeDef(rw.keepsake)?.name || ""
                : firstRes
                  ? `+${firstRes[1]}`
                  : code === "trap"
                    ? "体力 −1"
                    : code === "spring"
                      ? "体力 +3"
                      : "";
              return `<div class="treasure-tile is-revealed tile-${escapeHtml(code)}${hint}" data-treasure-cell="${i}" title="${escapeHtml(`${def.name}：${def.desc}`)}">${icon}<span class="treasure-tile__name">${escapeHtml(def.short)}</span>${lootTxt ? `<span class="treasure-tile__loot">${escapeHtml(lootTxt)}</span>` : ""}</div>`;
            }
            if (frontier.has(i)) {
              return `<button type="button" class="treasure-tile is-frontier${hint}" data-treasure-tile="${i}" ${voyage.stamina >= 1 ? "" : "disabled"} aria-label="探索${rc}"><span class="treasure-tile__fog">探索</span></button>`;
            }
            return `<div class="treasure-tile is-fog${hint}" data-treasure-cell="${i}" aria-label="迷雾${rc}"></div>`;
          })
          .join("");
        const staminaPct = Math.max(0, Math.min(100, Math.round((voyage.stamina / Math.max(1, voyage.maxStamina)) * 100)));
        const haulTxt = Object.entries(voyage.haul || {})
          .map(([rid, n]) => `${TREASURE_RES_ZH[rid] || rid} +${n}`)
          .join(" · ");
        voyageHtml = `
          <div class="voyage-explore-panel">
            <div class="treasure-island-map island-${escapeHtml(voyage.islandId)}">
              <div class="treasure-island-map__title">${renderUiIcon("treasureIsland", 18)}<span>${escapeHtml(voyIsland?.name || "")}</span><span class="tag">已探索 ${voyage.steps + 1}/25</span></div>
              <div class="treasure-grid" role="grid" aria-label="宝岛探索网格">${tilesHtml}</div>
              <div class="treasure-legend"><span class="treasure-legend__hint">红圈</span>藏宝图标出的宝藏范围 · <span class="treasure-legend__frontier">探索</span>与已探索格相邻、可以踏入</div>
            </div>
            <div class="voyage-side">
              <div class="voyage-stamina">
                <div class="voyage-stamina__label">船队体力 <strong data-treasure-stamina="1">${voyage.stamina}</strong> / ${voyage.maxStamina}</div>
                <div class="dock-progress__bar"><i style="width:${staminaPct}%"></i></div>
              </div>
              <div class="voyage-side__crew">${voyCrewChips}</div>
              <div class="voyage-side__haul">${voyage.foundX ? `<span class="tag tag--treasure-x">已挖到宝藏 X</span>` : `<span class="tag">宝藏 X 还埋在红圈里</span>`}<span class="voyage-side__haulTxt">${escapeHtml(haulTxt || "还没有收获，从滩头旁边开始探索吧")}</span></div>
              <div class="voyage-side__btns">
                <button type="button" class="btn btn--primary" data-treasure-auto="1" ${voyage.stamina >= 1 && frontier.size > 0 ? "" : "disabled"}>自动探索（用完体力）</button>
                <button type="button" class="btn" data-treasure-return="1">满载返航</button>
              </div>
              <div class="voyage-side__note">返航时每探索 1 格：船员经验 +30、未来币 +2；体力耗尽会自动返航。</div>
            </div>
          </div>`;
      }

      const keepsakeHtml = TREASURE_KEEPSAKE_DEFS.map((k) => {
        const n = Math.max(0, Math.floor(Number(treasure.keepsakes?.[k.id]) || 0));
        const island = getTreasureIslandDef(k.island);
        return `
          <div class="treasure-keepsake ${n > 0 ? "is-owned" : "is-unknown"}" title="${escapeHtml(n > 0 ? k.desc : `${island?.name || ""}的${k.source === "xmark" ? "宝藏 X" : "遗迹神龛"}`)}">
            ${renderUiIcon(k.source === "xmark" ? "treasureMap" : "treasureIsland", 26)}
            <div class="treasure-keepsake__body">
              <div class="treasure-keepsake__name">${escapeHtml(n > 0 ? k.name : "？？？")}${n > 1 ? `<span class="tag">×${n}</span>` : ""}</div>
              <div class="treasure-keepsake__meta">${escapeHtml(island?.name || "")} · ${k.source === "xmark" ? "宝藏 X" : "神龛"}</div>
            </div>
          </div>`;
      }).join("");
      const lastV = treasure.lastVoyage;
      const lastHtml = lastV
        ? `<div class="voyage-last"><strong>上次远航「${escapeHtml(lastV.islandName)}」</strong><span>探索 ${lastV.steps} 格${lastV.foundX ? " · 挖到宝藏 X" : ""}${lastV.keepsakes.length ? ` · 纪念品 ${escapeHtml(lastV.keepsakes.map((id) => getTreasureKeepsakeDef(id)?.name || "").join("、"))}` : ""}</span><span>${escapeHtml(
            Object.entries(lastV.haul || {})
              .map(([rid, n]) => `${TREASURE_RES_ZH[rid] || rid} +${n}`)
              .join(" · ") || "空手而归",
          )}</span></div>`
        : "";
      const treasureLogsHtml = (treasure.recentLogs || []).slice(0, 2).map((ln) => `<div class="camp-log-line">${escapeHtml(ln)}</div>`).join("");

      rows.push(`
        <div class="row treasure-body">
          <div class="row__left" style="width:100%">
            <div class="treasure-source-strip">${sourceHtml}</div>
            <div class="dock-progress treasure-frag-progress">
              <div class="dock-progress__bar"><i style="width:${fragPct}%"></i></div>
              <span class="dock-progress__txt">${escapeHtml(fragTxt)}</span>
            </div>
            ${voyageHtml}
            <div class="treasure-bottom-row">
              <div class="treasure-keepsake-cabinet">
                <div class="voyage-panel-title">${renderUiIcon("treasureIsland", 18)}<span>寻宝纪念品陈列架</span><span class="tag">${treasureAura.keepsakeCount}/${treasureAura.totalKeepsakes}${treasureAura.fullSet ? " · 寻宝传说" : ""}</span></div>
                <div class="treasure-keepsake-grid">${keepsakeHtml}</div>
                <div class="eco-aura-strip" style="margin-top:6px">
                  <span class="shiny-aura-pill ${treasureAura.prodAdd > 0 ? "is-on" : ""}">全产 +${ml12Pct(treasureAura.prodAdd)}</span>
                  <span class="shiny-aura-pill ${treasureAura.shinyAdd > 0 ? "is-on" : ""}">闪光 +${ml12Pct(treasureAura.shinyAdd)}</span>
                  <span class="shiny-aura-pill ${treasureAura.catchAdd > 0 ? "is-on" : ""}">捕获 +${ml12Pct(treasureAura.catchAdd)}</span>
                  <span class="shiny-aura-pill">远航 ${treasureAura.totalVoyages} 次 · 宝藏 X ${Math.max(0, Math.floor(Number(treasure.totalGrandFound) || 0))} 次</span>
                </div>
              </div>
              <div class="treasure-log-box">
                ${lastHtml || `<div class="voyage-last is-empty">还没有远航记录：先集齐 ${TREASURE_MAP_FRAGMENTS_PER_MAP} 片残片拼一张藏宝图。</div>`}
                ${treasureLogsHtml ? `<div class="star-camp-logs" style="margin-top:6px">${treasureLogsHtml}</div>` : ""}
              </div>
            </div>
          </div>
        </div>
      `);

      if (ui.treasureModalOpen && !voyage) {
        const stagedSet = new Set(treasure.stagedIds);
        const modalMons = [...stagedMons, ...voyIdleMons.filter((m) => !stagedSet.has(m.id))];
        const skipped = list.filter((m) => m && !modalMons.some((x) => x.id === m.id)).length;
        const modalRowsHtml = modalMons.length
          ? modalMons
              .map((m) => {
                const checked = stagedSet.has(m.id);
                const disableNew = !checked && stagedSet.size >= TREASURE_VOYAGE_MAX_CREW;
                return `
                  <div class="row func-mon-row ${checked ? "is-active" : ""}">
                    <div class="row__left">
                      <div class="row__title row__titleLine">${renderBeastIcon(m.dex, m.name, Boolean(m.isShiny))}<span>${escapeHtml(m.name)}</span><span class="tag">Lv.${m.lvl || 1}</span>${ml12RoleTags(m)}</div>
                      <div class="row__desc">${escapeHtml(ml12Types(m).map((t) => TYPE_ZH?.[t] ?? t).join("/") || "-")} · 战力 ${monPower(m)}</div>
                    </div>
                    <div class="row__right">
                      <input class="chk" type="checkbox" data-treasure-modal-check="${m.id}" ${checked ? "checked" : ""} ${disableNew ? "disabled" : ""} />
                    </div>
                  </div>`;
              })
              .join("")
          : `<div class="muted" style="padding:12px">当前暂无空闲伙伴可以出海寻宝（训练、远征、出战、孵育、露营、沙盘、码头、观察站、浮岛建造与本命灵契中的伙伴已被安全过滤）。</div>`;
        treasureModalHtml = `
          <div class="modalOverlay" data-treasure-modal-overlay="1">
            <div class="modal">
              <div class="modal__header">
                <div class="modal__title">${renderUiIcon("treasureMap", 20)}<span>挑选寻宝船员</span><span class="tag">已选 ${stagedSet.size}/${TREASURE_VOYAGE_MAX_CREW}</span></div>
                <div class="modal__right">
                  <button type="button" class="btn btn--small" data-treasure-autocrew="1" ${voyIdleMons.length > 0 && stagedSet.size < TREASURE_VOYAGE_MAX_CREW ? "" : "disabled"}>一键组船队</button>
                  <button type="button" class="btn btn--small" data-treasure-modal-close="1">关闭</button>
                </div>
              </div>
              <div class="modal__desc">仅展示空闲伙伴（已过滤 ${skipped} 只忙碌中的伙伴）。水 / 风系「领航」缩短航程，岩 / 草系「探路」多 1 点体力，光 / 幻 / 暗系「寻宝直觉」宝物 +10%。</div>
              <div class="modal__body">${modalRowsHtml}</div>
              <div class="actions">
                <button type="button" class="btn btn--primary" data-treasure-modal-close="1">组好船队</button>
              </div>
            </div>
          </div>`;
      }
    }

    // ========== ML-12 Section: 萌灵「乐队合奏音乐会」(Band Ensemble Concert Tour) ==========
    const hideBand = Boolean(ui.functionsHideBand);
    const band = ensureBandConcertState(state);
    const bandStop = getBandStopDef(band.stopId) || BAND_TOUR_STOPS[0];
    const bandTrophy = computeBandTourBonus(state);
    const bandAway = getBandUnavailableMonIds(state);
    const bandOpts = { getMonTypes: ml12Types, getBeastDataByDex };
    const bandReady = {};
    for (const p of BAND_PARTS) {
      const id = band.lineup[p.id];
      if (id > 0 && !bandAway.has(id)) bandReady[p.id] = id;
    }
    const bandEval = evaluateBandEnsemble(state, bandReady, band.pattern, bandStop, bandOpts);
    const bandCost = getBandConcertCost(state);
    const bandAvail = list.filter((m) => m && !bandAway.has(m.id));
    const canBandPerform =
      bandCost.canPerform && Object.keys(bandReady).length > 0 && (bandCost.kind !== "coin" || ml12Coins >= bandCost.coin);
    const bandCostTxt =
      bandCost.kind === "limit" ? "今日场次已满" : bandCost.kind === "free" ? `今日免费 ${bandCost.left} 场` : `${bandCost.coin} 币 · 余 ${bandCost.left} 场`;
    // ML-14 统一忙碌排除：外出状态文案统一读登记表
    const bandAwayTxt = (id) => getAwayActivityOfMon(state, id)?.label || "外出中";
    let bandModalHtml = "";

    rows.push(`
      <div class="row band-header" data-band-stop-current="${escapeHtml(bandStop.id)}">
        <div class="row__left">
          <div class="row__title row__titleLine">
            ${renderUiIcon("bandStage", 20)}
            <span>萌灵乐队合奏音乐会</span>
            <span class="tag tag--band-stop">巡演站「${escapeHtml(bandStop.name)}」</span>
            <span class="tag">场次 ${band.performedToday}/${BAND_DAILY_MAX_CONCERTS}</span>
            <span class="tag tag--band-trophy">${renderUiIcon("tourTrophy", 14)}<span>${escapeHtml(bandTrophy.trophyName)} ★${bandTrophy.trophyStars}/${bandTrophy.maxStars}</span></span>
          </div>
          <div class="row__desc">给灵鼓 / 竖琴 / 风笛 / 星铃 4 个声部各编入 1 只伙伴，谱写 8 拍节奏型，沿 5 站巡演路线登台合奏：伙伴属性契合声部、贴合站点偏爱，相邻声部的属性还能结成和弦；节奏型踩中这一站的曲风、伙伴越亲密，得分越高。每站最佳评级点亮「巡演奖杯」，永久提升全产、捕获、闪光与 PvE 伤害。出海 / 观测 / 建造 / 寻宝远航 / 泡汤 / 送信中的伙伴不登台。</div>
        </div>
        <div class="row__right band-header__btns">
          <button type="button" class="btn btn--small" data-band-autofill="1" ${bandAvail.length > 0 ? "" : "disabled"}>一键组队</button>
          <button type="button" class="btn btn--small" data-band-compose="1">一键作曲</button>
          <button type="button" class="btn btn--small btn--ghost" data-func-toggle="band">${hideBand ? "展开" : "收起"}</button>
        </div>
      </div>
    `);

    if (!hideBand) {
      const routeHtml = BAND_TOUR_STOPS.map((s, i) => {
        const unlocked = isBandStopUnlocked(state, s.id);
        const tier = Math.max(0, Math.floor(Number(band.bestTierByStop?.[s.id]) || 0));
        const stars = Array.from({ length: BAND_TROPHY_MAX_TIER }, (_, k) => `<i class="${k < tier ? "is-on" : ""}"></i>`).join("");
        return `<button type="button" class="band-stop ${s.id === bandStop.id ? "is-current" : ""} ${unlocked ? "" : "is-locked"}" data-band-stop="${escapeHtml(s.id)}" ${unlocked ? "" : "disabled"} aria-pressed="${s.id === bandStop.id ? "true" : "false"}">
          <span class="band-stop__no">第 ${i + 1} 站</span>
          <span class="band-stop__name">${escapeHtml(s.name)}</span>
          <span class="band-stop__city">${escapeHtml(unlocked ? `${s.city} · ${s.feelName}` : "上一站铜音解锁")}</span>
          <span class="band-stop__stars" aria-label="最佳评级 ${tier}/${BAND_TROPHY_MAX_TIER}">${stars}</span>
        </button>`;
      }).join("");
      const stopElBadges = bandStop.favElements.map((t) => `<span class="badge type type-${escapeHtml(t)}">${escapeHtml(TYPE_ZH?.[t] ?? t)}</span>`).join("");
      const partCards = BAND_PARTS.map((part) => {
        const id = band.lineup[part.id];
        const mon = id > 0 ? list.find((m) => m && m.id === id) || null : null;
        const partEls = part.elements.map((t) => `<span class="badge type type-${escapeHtml(t)}">${escapeHtml(TYPE_ZH?.[t] ?? t)}</span>`).join("");
        const head = `<div class="band-part__head">${renderUiIcon("instrumentSet", 26)}<div class="band-part__titleBox"><div class="band-part__name">${escapeHtml(part.name)}<span class="band-part__role">${escapeHtml(part.role)}</span></div><div class="band-part__els">${partEls}</div></div></div>`;
        if (!mon) {
          return `
            <div class="band-part is-empty" data-band-part="${escapeHtml(part.id)}">
              ${head}
              <div class="band-part__empty">空位 · 等待乐手</div>
              <button type="button" class="btn btn--small" data-band-open-part="${escapeHtml(part.id)}" ${bandAvail.length > 0 ? "" : "disabled"}>编入乐手</button>
            </div>`;
        }
        const away = bandAway.has(mon.id);
        const slot = bandEval.perPart.find((x) => x.partId === part.id) || null;
        return `
          <div class="band-part is-filled ${away ? "is-away" : ""}" data-band-part="${escapeHtml(part.id)}">
            ${head}
            <div class="band-part__mon">
              ${renderBeastIcon(mon.dex, mon.name, Boolean(mon.isShiny))}
              <span class="band-part__monName">${escapeHtml(mon.name)}</span>
              <span class="tag">Lv.${mon.lvl || 1}</span>
              <span class="tag">亲密 ${Math.floor(Number(mon.affection) || 0)}</span>
            </div>
            <div class="band-part__tags">${
              away
                ? `<span class="tag tag--dock-bottle">${escapeHtml(bandAwayTxt(mon.id))} · 本场不演出</span>`
                : `${slot?.fit ? `<span class="tag tag--band-fit">声部契合</span>` : `<span class="tag">声部不契合</span>`}${slot?.fav ? `<span class="tag tag--band-fav">站点偏爱</span>` : ""}`
            }</div>
            <div class="band-part__foot">
              <button type="button" class="btn btn--small" data-band-open-part="${escapeHtml(part.id)}">换人</button>
              <button type="button" class="btn btn--small btn--danger" data-band-clear="${escapeHtml(part.id)}">撤下</button>
            </div>
          </div>`;
      }).join("");
      const chordHtml = bandEval.chords.length
        ? bandEval.chords
            .map(
              (c) =>
                `<span class="tag ${c.kind === "chord" ? "tag--band-chord" : ""}">${escapeHtml(getBandPartDef(c.from)?.name || "")}→${escapeHtml(getBandPartDef(c.to)?.name || "")} · ${escapeHtml(c.name)}</span>`,
            )
            .join("")
        : `<span class="tag">相邻声部（灵鼓→竖琴→风笛→星铃→灵鼓）的属性结成和弦可加分，如 火+风、水+草、电+岩</span>`;
      const pe = bandEval.patternEval;
      const beatsHtml = band.pattern
        .map(
          (b, i) =>
            `<button type="button" class="band-beat beat-${b}" data-band-beat="${i}" aria-label="第 ${i + 1} 拍：${escapeHtml(BAND_BEAT_ZH[b])}（点按切换）"><em>${i + 1}</em><span>${escapeHtml(BAND_BEAT_ZH[b])}</span></button>`,
        )
        .join("");
      const rulesHtml = pe.rules
        .map((r) => `<span class="band-rule ${r.ok ? "is-ok" : r.pts < 0 ? "is-bad" : ""} ${r.feel ? "is-feel" : ""}">${escapeHtml(r.name)} ${r.pts > 0 ? `+${r.pts}` : r.pts < 0 ? r.pts : "+0"}</span>`)
        .join("");
      const bb = bandEval.breakdown;
      const tierLineHtml = BAND_TIERS.map((t) => `<span class="show-tier-mark ${bandEval.baseScore >= t.minScore ? "is-reached" : ""}">${escapeHtml(t.name)} ${t.minScore}</span>`).join("");
      const lastC = band.lastConcert;
      const lastHtml = lastC
        ? `
          <div class="band-result-card tier-${Math.max(0, Math.min(4, Number(lastC.tier) || 0))}">
            <div class="band-result-card__top">
              ${renderUiIcon("tourTrophy", 30)}
              <div>
                <div class="band-result-card__score">${Math.floor(Number(lastC.score) || 0)} 分 · ${escapeHtml(lastC.tierName || "未入围")}</div>
                <div class="row__desc">「${escapeHtml(lastC.stopName || "")}」${escapeHtml((lastC.members || []).join("、"))}</div>
              </div>
            </div>
            <div class="band-result-card__crowd">${escapeHtml(lastC.crowdLine || "")}</div>
            <div class="row__desc">编排得分 ${Math.floor(Number(lastC.baseScore) || 0)} · 现场发挥 ${Number(lastC.live) >= 0 ? "+" : ""}${Number(lastC.live) || 0}${lastC.chordNames?.length ? ` · 和弦「${escapeHtml(lastC.chordNames.join("」「"))}」` : ""}${lastC.unlockedNext ? ` · 解锁「${escapeHtml(lastC.unlockedNext)}」` : ""}</div>
            <div class="row__desc">奖励：未来币 +${lastC.rewards?.futurecoin || 0} · 经验 +${lastC.rewards?.exp || 0}（乐手）${lastC.rewards?.shinyStarSand ? ` · 闪光祈愿星砂 +${lastC.rewards.shinyStarSand}` : ""}${lastC.newTierBonus ? " · 站点评级刷新奖励" : ""}</div>
          </div>`
        : `
          <div class="band-result-card is-empty">
            <div class="band-result-card__top">${renderUiIcon("tourTrophy", 30)}<div><div class="band-result-card__score">还没有巡演记录</div><div class="row__desc">点「一键组队」和「一键作曲」，先在第一站试试音吧。</div></div></div>
          </div>`;
      const cabinetHtml = BAND_TOUR_STOPS.map((s) => {
        const tier = Math.max(0, Math.floor(Number(band.bestTierByStop?.[s.id]) || 0));
        const bestScore = Math.max(0, Math.floor(Number(band.bestScoreByStop?.[s.id]) || 0));
        const stars = Array.from({ length: BAND_TROPHY_MAX_TIER }, (_, i) => `<i class="${i < tier ? "is-on" : ""}"></i>`).join("");
        return `
          <div class="band-trophy-card tier-${tier} ${s.id === bandStop.id ? "is-current" : ""}">
            ${renderUiIcon("tourTrophy", 24)}
            <div class="band-trophy-card__body">
              <div class="band-trophy-card__name">${escapeHtml(s.name)}</div>
              <div class="band-trophy-card__stars" aria-label="评级 ${tier}/${BAND_TROPHY_MAX_TIER}">${stars}</div>
              <div class="row__desc">${tier > 0 ? `${escapeHtml(getBandTierName(tier))} · 最佳 ${bestScore} 分` : "尚未获奖"}</div>
            </div>
          </div>`;
      }).join("");

      rows.push(`
        <div class="row band-body">
          <div class="row__left" style="width:100%">
            <div class="band-tour-route">${routeHtml}</div>
            <div class="band-stop-strip">
              <div class="band-stop-strip__row">
                <span class="tri-rule-strip__label">${escapeHtml(bandStop.city)}</span><strong>${escapeHtml(bandStop.name)}</strong>
                <span class="tri-rule-strip__label">偏爱属性</span>${stopElBadges}
                <span class="tri-rule-strip__label">曲风「${escapeHtml(bandStop.feelName)}」</span><span class="band-stop-strip__hint">${escapeHtml(bandStop.feelHint)}</span>
              </div>
              <div class="show-theme-strip__motto">“${escapeHtml(bandStop.motto)}”</div>
            </div>
            <div class="band-part-grid">${partCards}</div>
            <div class="band-chord-row">${chordHtml}</div>
            <div class="band-composer">
              <div class="band-composer__title">${renderUiIcon("instrumentSet", 18)}<span>8 拍节奏型</span><span class="tag">点按切换 休止 → 轻拍 → 重拍</span><span class="tag">节奏型 ${pe.points} 分</span></div>
              <div class="band-beat-row">${beatsHtml}</div>
              <div class="band-rule-row">${rulesHtml}</div>
            </div>
            <div class="show-score-panel band-score-panel">
              <div class="show-score-panel__main">
                <div class="show-score-panel__num">预估 ${bandEval.baseScore} 分</div>
                <div class="show-score-panel__tier">${escapeHtml(getBandTierName(bandEval.projectedTier))}</div>
                <div class="show-tier-line">${tierLineHtml}</div>
              </div>
              <div class="eco-aura-strip show-breakdown">
                <span class="shiny-aura-pill is-on">演奏功底 ${bb.musicianship}</span>
                <span class="shiny-aura-pill ${bb.harmony > 0 ? "is-on" : ""}">和声 ${bb.harmony}</span>
                <span class="shiny-aura-pill ${bb.rhythm > 0 ? "is-on" : ""}">节奏 ${bb.rhythm}（鼓手稳定 +${bandEval.drummerSteady}）</span>
                <span class="shiny-aura-pill ${bb.bond > 0 ? "is-on" : ""}">羁绊默契 ${bb.bond}${bandEval.quartetBond ? " · 默契四重奏" : ""}</span>
                <span class="shiny-aura-pill">乐团熟练度 ×${Number(bandEval.craftMul || 0).toFixed(2)}</span>
              </div>
              <div class="show-score-panel__btns">
                <button type="button" class="btn btn--primary" data-band-perform="1" ${canBandPerform ? "" : "disabled"}>登台合奏（${escapeHtml(bandCostTxt)}）</button>
              </div>
            </div>
            <div class="band-bottom-row">
              ${lastHtml}
              <div class="band-trophy-cabinet">
                <div class="voyage-panel-title">${renderUiIcon("tourTrophy", 18)}<span>巡演奖杯陈列柜</span><span class="tag">★${bandTrophy.trophyStars}/${bandTrophy.maxStars}${bandTrophy.fullTour ? " · 巡演圆满" : ""}</span></div>
                <div class="band-trophy-grid">${cabinetHtml}</div>
                <div class="eco-aura-strip" style="margin-top:6px">
                  <span class="shiny-aura-pill ${bandTrophy.prodAdd > 0 ? "is-on" : ""}">全产 +${ml12Pct(bandTrophy.prodAdd)}</span>
                  <span class="shiny-aura-pill ${bandTrophy.catchAdd > 0 ? "is-on" : ""}">捕获 +${ml12Pct(bandTrophy.catchAdd)}</span>
                  <span class="shiny-aura-pill ${bandTrophy.shinyAdd > 0 ? "is-on" : ""}">闪光 +${ml12Pct(bandTrophy.shinyAdd)}</span>
                  <span class="shiny-aura-pill ${bandTrophy.pveOutAdd > 0 ? "is-on" : ""}">PvE 增伤 +${ml12Pct(bandTrophy.pveOutAdd)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      `);

      const modalPart = typeof ui.bandModalPart === "string" ? getBandPartDef(ui.bandModalPart) : null;
      if (modalPart) {
        const curId = band.lineup[modalPart.id];
        const favSet = new Set(bandStop.favElements);
        const sortedMons = bandAvail
          .slice()
          .sort((a, c) => (c.id === curId ? 1 : 0) - (a.id === curId ? 1 : 0) || monPower(c) - monPower(a));
        const skipped = list.filter((m) => m && bandAway.has(m.id)).length;
        const modalRowsHtml = sortedMons.length
          ? sortedMons
              .map((m) => {
                const t = ml12Types(m);
                const fit = t.some((x) => modalPart.elements.includes(x));
                const fav = t.some((x) => favSet.has(x));
                const inPart = BAND_PARTS.find((p) => band.lineup[p.id] === m.id) || null;
                const isCur = m.id === curId;
                return `
                  <div class="row func-mon-row ${isCur ? "is-active" : ""}">
                    <div class="row__left">
                      <div class="row__title row__titleLine">${renderBeastIcon(m.dex, m.name, Boolean(m.isShiny))}<span>${escapeHtml(m.name)}</span><span class="tag">Lv.${m.lvl || 1}</span>${fit ? `<span class="tag tag--band-fit">声部契合</span>` : ""}${fav ? `<span class="tag tag--band-fav">站点偏爱</span>` : ""}${inPart && !isCur ? `<span class="tag">现任${escapeHtml(inPart.name)}</span>` : ""}</div>
                      <div class="row__desc">${escapeHtml(t.map((x) => TYPE_ZH?.[x] ?? x).join("/") || "-")} · 亲密 ${Math.floor(Number(m.affection) || 0)} · 战力 ${monPower(m)}</div>
                    </div>
                    <div class="row__right">
                      <button type="button" class="btn btn--small${isCur ? "" : " btn--primary"}" data-band-modal-pick="${m.id}" ${isCur ? "disabled" : ""}>${isCur ? "当前乐手" : `编入${escapeHtml(modalPart.name)}`}</button>
                    </div>
                  </div>`;
              })
              .join("")
          : `<div class="muted" style="padding:12px">暂无可以登台的伙伴（出海、观测、建造、寻宝远航、泡汤与送信中的伙伴不登台）。</div>`;
        bandModalHtml = `
          <div class="modalOverlay" data-band-modal-overlay="1">
            <div class="modal">
              <div class="modal__header">
                <div class="modal__title">${renderUiIcon("instrumentSet", 20)}<span>为「${escapeHtml(modalPart.name)}」挑选乐手</span><span class="tag">${escapeHtml(modalPart.role)}</span></div>
                <div class="modal__right"><button type="button" class="btn btn--small" data-band-modal-close="1">关闭</button></div>
              </div>
              <div class="modal__desc">声部偏爱 ${escapeHtml(modalPart.elements.map((x) => TYPE_ZH?.[x] ?? x).join(" / "))} 属性；本站「${escapeHtml(bandStop.name)}」偏爱 ${escapeHtml(bandStop.favElements.map((x) => TYPE_ZH?.[x] ?? x).join(" / "))}。已过滤 ${skipped} 只外出中的伙伴。</div>
              <div class="modal__body">${modalRowsHtml}</div>
              <div class="actions"><button type="button" class="btn btn--primary" data-band-modal-close="1">完成</button></div>
            </div>
          </div>`;
      }
    }

    // ========== ML-11 Section: 萌灵「云顶浮空岛建造」(Cloudtop Sky Island Construction) ==========
    const hideSkyIsland = Boolean(ui.functionsHideSkyIsland);
    const skyIsland = ensureSkyIslandState(state);
    const skyAura = computeSkyIslandAura(state);
    const skyCrewMons = skyIsland.crewIds.map((id) => list.find((m) => m && m.id === id) || null).filter(Boolean);
    const skyCrewEval = evaluateSkyIslandCrew(skyCrewMons, state, { getBeastDataByDex });
    const skyIdleMons = getIdleSkyIslandCandidates(state);
    const skyRallyFree = getSkyIslandRallyFreeLeft(state);
    const skyCoins = Math.max(0, Math.floor(state.res?.futurecoin?.value ?? 0));
    const skyBuild = skyIsland.build || null;
    const skyBuildDef = skyBuild ? getSkyIslandFacilityDef(skyBuild.facilityId) : null;
    const canSkyRally = Boolean(skyBuild) && skyCrewMons.length > 0 && (skyRallyFree > 0 || skyCoins >= SKY_ISLAND_RALLY_COIN_COST);
    const canSkyAutofill = skyCrewMons.length < SKY_ISLAND_MAX_CREW && skyIdleMons.length > 0;
    const skyProgress = ml11IslandProgress(skyIsland, skyCrewEval);
    const skyAffineSet = new Set(SKY_ISLAND_BUILD_AFFINE_TYPES);
    const ml11Pct = (n) => `${Math.round((Number(n) || 0) * 1000) / 10}%`;
    let skyIslandModalHtml = "";

    rows.push(`
      <div class="row sky-island-header ${skyBuild ? "is-building" : ""}" data-sky-island="1">
        <div class="row__left">
          <div class="row__title row__titleLine">
            ${renderUiIcon("skyIsland", 20)}
            <span>云顶浮空岛建造</span>
            <span class="tag tag--sky-title">${escapeHtml(skyAura.islandTitle)} · 设施 Lv.${skyAura.totalLevel}/${skyAura.maxTotal}</span>
            <span class="tag">建造伙伴 ${skyCrewMons.length}/${SKY_ISLAND_MAX_CREW}</span>
            <span class="tag tag--sky-site ${skyBuild ? "is-busy" : ""}">${skyBuild ? `施工中「${escapeHtml(skyBuildDef?.name || "")}」→ Lv.${skyBuild.targetLevel}` : "工地空闲"}</span>
          </div>
          <div class="row__desc">用灵果、灵木、灵晶碎片与未来币在云端浮岛开工建造 5 座设施（Lv.0~5），再派 1~3 只空闲伙伴上岛出工推进工期（岩 / 火 / 电 / 风系「建造契合」更快，没人出工时工地停工）。设施光环直接作用于全产、捕获、灵蛋孵化速度、育灵闪光与候鸟栖枝；派工中的伙伴自动享防放生保护。</div>
        </div>
        <div class="row__right sky-island-header__btns">
          <button type="button" class="btn btn--small${canSkyRally && skyRallyFree > 0 ? " btn--primary" : ""}" data-island-rally="1" ${canSkyRally ? "" : "disabled"}>${skyRallyFree > 0 ? "齐心夯土（今日免费）" : `齐心夯土（${SKY_ISLAND_RALLY_COIN_COST} 币）`}</button>
          <button type="button" class="btn btn--small" data-island-autofill="1" ${canSkyAutofill ? "" : "disabled"}>一键派工</button>
          <button type="button" class="btn btn--small btn--ghost" data-func-toggle="skyIsland">${hideSkyIsland ? "展开" : "收起"}</button>
        </div>
      </div>
    `);

    if (!hideSkyIsland) {
      const curLv = skyBuild ? Math.max(0, skyBuild.targetLevel - 1) : 0;
      const siteHtml = skyBuild
        ? `
          <div class="sky-site-banner is-building">
            <div class="sky-site-banner__top">
              ${renderUiIcon(skyBuildDef?.icon || "buildHammer", 30)}
              <div class="sky-site-banner__text">
                <strong>「${escapeHtml(skyBuildDef?.name || "")}」Lv.${curLv} → Lv.${skyBuild.targetLevel} 施工中</strong>
                <span>竣工后：${escapeHtml(describeSkyIslandFacilityEffect(skyBuild.facilityId, skyBuild.targetLevel))}</span>
              </div>
              <button type="button" class="btn btn--small btn--ghost" data-island-cancel="1">取消工程（退回材料）</button>
            </div>
            <div class="dock-progress sky-progress">
              <div class="dock-progress__bar"><i data-island-fill="1" style="width:${skyProgress.pct}%"></i></div>
              <span class="dock-progress__txt" data-island-txt="1">${escapeHtml(skyProgress.text)}</span>
            </div>
          </div>`
        : `
          <div class="sky-site-banner is-idle">
            <div class="sky-site-banner__top">
              ${renderUiIcon("buildHammer", 30)}
              <div class="sky-site-banner__text">
                <strong>工地空闲</strong>
                <span>从下方挑一座设施开工（同一时间只开一处工地），派好建造伙伴后工期会自动推进，离线最多补算 12 小时。</span>
              </div>
            </div>
          </div>`;

      const crewSlotsHtml = Array.from({ length: SKY_ISLAND_MAX_CREW }, (_, idx) => {
        const m = skyCrewMons[idx] || null;
        if (!m) {
          return `
            <div class="sky-crew-slot is-empty">
              <div class="sky-crew-slot__empty">出工席位 ${idx + 1} · 空置</div>
              <button type="button" class="btn btn--small" data-island-open-modal="1" ${skyIdleMons.length > 0 ? "" : "disabled"}>派工</button>
            </div>`;
        }
        const mTypes = getMonTypesForExpedition(m, getBeastDataByDex);
        const typeBadges = mTypes.map((t) => `<span class="badge type type-${escapeHtml(t)}">${escapeHtml(TYPE_ZH?.[t] ?? t)}</span>`).join("");
        const isAffine = mTypes.some((t) => skyAffineSet.has(t));
        const workSec = Math.max(0, Math.floor(Number(skyIsland.crewWork?.[String(m.id)]) || 0));
        return `
          <div class="sky-crew-slot is-filled">
            <div class="sky-crew-slot__head">
              ${renderBeastIcon(m.dex, m.name, Boolean(m.isShiny))}
              <div class="sky-crew-slot__titleBox">
                <div class="sky-crew-slot__name">${escapeHtml(m.name)} <span class="tag">Lv.${m.lvl || 1}</span></div>
                <div class="sky-crew-slot__meta">${typeBadges}${isAffine ? `<span class="tag tag--sky-affine">建造契合</span>` : ""}</div>
              </div>
            </div>
            <div class="row__desc">累计出工 ${workSec > 0 ? escapeHtml(fmtDuration(workSec)) : "0 秒"}</div>
            <div class="sky-crew-slot__foot">
              <button type="button" class="btn btn--small btn--danger" data-island-recall="${m.id}">撤回</button>
            </div>
          </div>`;
      }).join("");

      const facilityHtml = SKY_ISLAND_FACILITY_DEFS.map((def) => {
        const lv = skyAura.levels[def.id] || 0;
        const chk = canStartSkyIslandBuild(state, def.id);
        const isThis = skyBuild?.facilityId === def.id;
        const pips = Array.from({ length: SKY_ISLAND_MAX_LEVEL }, (_, i) => `<i class="${i < lv ? "is-on" : isThis && i === lv ? "is-building" : ""}"></i>`).join("");
        let btnLabel = `开工 Lv.${lv + 1}`;
        if (lv >= SKY_ISLAND_MAX_LEVEL) btnLabel = "已满级";
        else if (isThis) btnLabel = "施工中…";
        else if (chk.reason === "locked") btnLabel = `需「${getSkyIslandFacilityDef(chk.requires?.facilityId)?.name || ""}」Lv.${chk.requires?.level || 1}`;
        else if (chk.reason === "site_busy") btnLabel = "工地施工中";
        else if (chk.reason === "insufficient_resources") btnLabel = `材料不足 · 开工 Lv.${lv + 1}`;
        const costHtml =
          lv < SKY_ISLAND_MAX_LEVEL && !isThis
            ? `<div class="sky-cost-row">${Object.entries(chk.cost || {})
                .map(([rid, need]) => {
                  const have = Math.max(0, Math.floor(Number(state.res?.[rid]?.value) || 0));
                  return `<span class="sky-cost-chip ${have >= need ? "is-ok" : "is-short"}">${renderResSvg(rid, 14)}<span>${escapeHtml(SKY_ISLAND_RES_ZH[rid] || rid)} ${need}</span></span>`;
                })
                .join("")}<span class="sky-cost-chip is-time">工期 ${escapeHtml(fmtDuration(chk.needSec || getSkyIslandBuildSec(def.id, lv + 1)))}</span></div>`
            : "";
        return `
          <div class="sky-facility ${isThis ? "is-building" : ""} ${lv >= SKY_ISLAND_MAX_LEVEL ? "is-max" : ""} ${chk.reason === "locked" ? "is-locked" : ""}" data-sky-facility="${escapeHtml(def.id)}">
            <div class="sky-facility__head">
              ${renderUiIcon(def.icon, 30)}
              <div class="sky-facility__titleBox">
                <div class="sky-facility__name">${escapeHtml(def.name)}</div>
                <div class="sky-facility__pips" aria-label="等级 ${lv}/${SKY_ISLAND_MAX_LEVEL}">${pips}</div>
              </div>
              <span class="tag">Lv.${lv}/${SKY_ISLAND_MAX_LEVEL}</span>
            </div>
            <div class="sky-facility__desc">${escapeHtml(def.desc)}</div>
            <div class="sky-facility__effect">
              <span class="sky-facility__now">当前：${lv > 0 ? escapeHtml(describeSkyIslandFacilityEffect(def.id, lv)) : "尚未建造"}</span>
              ${lv < SKY_ISLAND_MAX_LEVEL ? `<span class="sky-facility__next">Lv.${lv + 1}：${escapeHtml(describeSkyIslandFacilityEffect(def.id, lv + 1))}</span>` : ""}
            </div>
            ${costHtml}
            <button type="button" class="btn btn--small${chk.ok ? " btn--primary" : ""}" data-island-build="${escapeHtml(def.id)}" ${chk.ok ? "" : "disabled"}>${escapeHtml(btnLabel)}</button>
          </div>`;
      }).join("");

      const nextResonance = SKY_ISLAND_RESONANCE_TIERS.find((r) => skyAura.totalLevel < r.minTotal) || null;
      const skyLogsHtml = (skyIsland.recentLogs || []).slice(0, 2).map((ln) => `<div class="camp-log-line">${escapeHtml(ln)}</div>`).join("");

      rows.push(`
        <div class="row sky-island-body">
          <div class="row__left" style="width:100%">
            ${siteHtml}
            <div class="sky-crew-grid">${crewSlotsHtml}</div>
            <div class="eco-aura-strip sky-aura-strip">
              <span class="shiny-aura-pill ${skyCrewEval.speedMul > 0 ? "is-on" : ""}">出工速度 ×${(skyCrewEval.speedMul || 0).toFixed(2)}（契合 ${skyCrewEval.affineCount} 只 · 工坊 +${Math.round(skyCrewEval.workshopAdd * 100)}%）</span>
              <span class="shiny-aura-pill ${skyAura.prodAdd > 0 ? "is-on" : ""}">全产 +${ml11Pct(skyAura.prodAdd)}</span>
              <span class="shiny-aura-pill ${skyAura.catchAdd > 0 ? "is-on" : ""}">捕获 +${ml11Pct(skyAura.catchAdd)}</span>
              <span class="shiny-aura-pill ${skyAura.hatchSpeedAdd > 0 ? "is-on" : ""}">${renderUiIcon("hatchAura", 14)}<span>灵蛋孵化 ×${skyAura.hatchSpeedMul.toFixed(2)}</span></span>
              <span class="shiny-aura-pill ${skyAura.breedShinyAdd > 0 ? "is-on" : ""}">育灵闪光 ×${skyAura.breedShinyMul.toFixed(2)} · 破壳亲密 +${skyAura.hatchAffectionAdd}</span>
              <span class="shiny-aura-pill ${skyAura.migrantHostCap > 1 ? "is-on" : ""}">候鸟驻留席 ${skyAura.migrantHostCap} · 观察 +${ml11Pct(skyAura.migrationSpeedAdd)}</span>
              <span class="shiny-aura-pill ${skyAura.resonanceTier > 0 ? "is-on" : ""}">${skyAura.resonanceTier > 0 ? escapeHtml(skyAura.resonanceName) : "浮岛共鸣未触发"}${nextResonance ? `（总等级 ${skyAura.totalLevel}/${nextResonance.minTotal} → ${escapeHtml(nextResonance.name)}）` : ""}</span>
            </div>
            <div class="sky-facility-grid">${facilityHtml}</div>
            ${skyLogsHtml ? `<div class="star-camp-logs" style="margin-top:8px">${skyLogsHtml}</div>` : ""}
          </div>
        </div>
      `);

      if (ui.skyIslandModalOpen) {
        const crewSet = new Set(skyIsland.crewIds);
        const modalMons = [...skyCrewMons, ...skyIdleMons.filter((m) => !crewSet.has(m.id))];
        const skipped = list.filter((m) => m && !modalMons.some((x) => x.id === m.id)).length;
        const modalRowsHtml = modalMons.length
          ? modalMons
              .map((m) => {
                const checked = crewSet.has(m.id);
                const disableNew = !checked && crewSet.size >= SKY_ISLAND_MAX_CREW;
                const mTypes = getMonTypesForExpedition(m, getBeastDataByDex);
                const isAffine = mTypes.some((t) => skyAffineSet.has(t));
                return `
                  <div class="row func-mon-row ${checked ? "is-active" : ""}">
                    <div class="row__left">
                      <div class="row__title row__titleLine">${renderBeastIcon(m.dex, m.name, Boolean(m.isShiny))}<span>${escapeHtml(m.name)}</span><span class="tag">Lv.${m.lvl || 1}</span>${isAffine ? `<span class="tag tag--sky-affine">建造契合</span>` : ""}</div>
                      <div class="row__desc">${escapeHtml(mTypes.map((t) => TYPE_ZH?.[t] ?? t).join("/") || "-")} · 战力 ${monPower(m)}</div>
                    </div>
                    <div class="row__right">
                      <input class="chk" type="checkbox" data-island-modal-check="${m.id}" ${checked ? "checked" : ""} ${disableNew ? "disabled" : ""} />
                    </div>
                  </div>`;
              })
              .join("")
          : `<div class="muted" style="padding:12px">当前暂无空闲伙伴可上岛出工（训练、远征、出战、孵育、露营、沙盘勘探、出海、观察站派驻与本命灵契中的伙伴已被安全过滤）。</div>`;
        skyIslandModalHtml = `
          <div class="modalOverlay" data-island-modal-overlay="1">
            <div class="modal">
              <div class="modal__header">
                <div class="modal__title">${renderUiIcon("buildHammer", 20)}<span>派工上岛建造</span><span class="tag">已派工 ${crewSet.size}/${SKY_ISLAND_MAX_CREW}</span></div>
                <div class="modal__right">
                  <button type="button" class="btn btn--small" data-island-autofill="1" ${canSkyAutofill ? "" : "disabled"}>一键派工</button>
                  <button type="button" class="btn btn--small" data-island-modal-close="1">关闭</button>
                </div>
              </div>
              <div class="modal__desc">仅展示空闲伙伴（已过滤 ${skipped} 只忙碌中的伙伴）。岩 / 火 / 电 / 风系伙伴「建造契合」，每只出工速度 +0.12；伙伴等级越高出工越快。</div>
              <div class="modal__body">${modalRowsHtml}</div>
              <div class="actions">
                <button type="button" class="btn btn--primary" data-island-modal-close="1">完成派工</button>
              </div>
            </div>
          </div>`;
      }
    }

    // ========== ML-11 Section: 萌灵「季节迁徙候鸟萌灵」(Seasonal Migratory Spirits) ==========
    const hideMigration = Boolean(ui.functionsHideMigration);
    const migration = ensureSeasonMigrationState(state);
    syncMigrationSeason(state);
    const migSeason = getMigrationSeason();
    const migBonus = computeSeasonMigrationBonus(state);
    const migSpeed = evaluateMigrationSpeed(state);
    const migHosted = migration.hostedIds.filter((id) => getMigrantDef(id)?.season === migSeason.id);
    const migFeedFree = getMigrationFeedFreeLeft(state);
    const canMigFeed = migHosted.length > 0 && (migFeedFree > 0 || skyCoins >= MIGRATION_FEED_COIN_COST);
    const canMigAutoHost = migHosted.length < migSpeed.hostCap;
    const migCountdown = `距候鸟启程 ${ml11FmtDays(migSeason.msUntilEnd)}`;
    const migMedal = ml11MedalProgress(migration);
    const migSeasonTierName = migration.seasonTier > 0 ? getMigrationMedalTierName(migration.seasonTier) : "未获章";

    rows.push(`
      <div class="row migration-header season-${escapeHtml(migSeason.id)}" data-migration-season="${escapeHtml(migSeason.id)}">
        <div class="row__left">
          <div class="row__title row__titleLine">
            ${renderUiIcon("migratingBird", 20)}
            <span>季节迁徙候鸟萌灵</span>
            <span class="tag tag--season season-${escapeHtml(migSeason.id)}">${renderUiIcon("seasonCompass", 14)}<span>${escapeHtml(migSeason.name)}季「${escapeHtml(migSeason.label)}」 · <span data-migration-countdown="1">${escapeHtml(migCountdown)}</span></span></span>
            <span class="tag">驻留 ${migHosted.length}/${migSpeed.hostCap}</span>
            <span class="tag">本季记录 ${migration.seasonRecords} · ${escapeHtml(migSeasonTierName)}</span>
            <span class="tag tag--migration-medal">${renderUiIcon("migrationMedal", 14)}<span>纪念章 ${migBonus.medalPoints}/${migBonus.maxPoints}</span></span>
          </div>
          <div class="row__desc">按本机月份轮换四季（3~5 春 / 6~8 夏 / 9~11 秋 / 12~次年 2 月冬），每季 3 种候鸟萌灵限时到访，季末启程。把它们迎上「候鸟云巢栖枝」驻留观察：每驻留满 30 分钟写下一条观察记录，本季记录满 8 / 20 / 40 条分别获得铜羽 / 银羽 / 金羽迁徙纪念章（每季保留最佳成色，永久小幅加成，转生保留）；每条记录还有小概率让候鸟决定结伴留下、加入伙伴队伍。候鸟不占用伙伴。</div>
        </div>
        <div class="row__right migration-header__btns">
          <button type="button" class="btn btn--small${canMigFeed && migFeedFree > 0 ? " btn--primary" : ""}" data-migration-feed="1" ${canMigFeed ? "" : "disabled"}>${migFeedFree > 0 ? "撒谷迎候（今日免费）" : `撒谷迎候（${MIGRATION_FEED_COIN_COST} 币）`}</button>
          <button type="button" class="btn btn--small" data-migration-autohost="1" ${canMigAutoHost ? "" : "disabled"}>一键迎候</button>
          <button type="button" class="btn btn--small btn--ghost" data-func-toggle="migration">${hideMigration ? "展开" : "收起"}</button>
        </div>
      </div>
    `);

    if (!hideMigration) {
      const rarityZh = { common: "常见", uncommon: "少见", rare: "稀有" };
      const befriendedNow = new Set(migration.befriendedThisSeason || []);
      const migrantCardsHtml = migSeason.migrants
        .map((def) => {
          const hosted = migHosted.includes(def.id);
          const recs = Math.max(0, Math.floor(Number(migration.records?.[def.id]) || 0));
          const chance = getMigrantBefriendChance(state, def.id);
          const friend = befriendedNow.has(def.id);
          const prog = ml11MigrantProgress(migration, def.id, migSpeed.speedMul);
          const canHost = hosted || migHosted.length < migSpeed.hostCap;
          return `
            <div class="migrant-card rarity-${escapeHtml(def.rarity)} ${hosted ? "is-hosted" : ""} ${friend ? "is-friend" : ""}" data-migrant="${escapeHtml(def.id)}">
              <div class="migrant-card__head">
                <span class="migrant-card__art">${renderBeastIcon(def.dex, def.name, false)}</span>
                <div class="migrant-card__titleBox">
                  <div class="migrant-card__name">${escapeHtml(def.name)} <span class="tag tag--migrant-rarity rarity-${escapeHtml(def.rarity)}">${escapeHtml(rarityZh[def.rarity] || "")}</span></div>
                  <div class="migrant-card__meta">本季记录 ${recs} · 结伴率 ${ml11Pct(chance)}${friend ? " · 已结伴" : ""}</div>
                </div>
              </div>
              <div class="migrant-card__note">${escapeHtml(def.note)}</div>
              ${
                hosted
                  ? `<div class="dock-progress migrant-progress"><div class="dock-progress__bar"><i data-migration-fill="${escapeHtml(def.id)}" style="width:${prog.pct}%"></i></div><span class="dock-progress__txt" data-migration-txt="${escapeHtml(def.id)}">${escapeHtml(prog.text)}</span></div>`
                  : `<div class="migrant-card__idle">${canHost ? "正在栖枝外盘旋，等你迎它落脚驻留" : "栖枝已满：升级「候鸟云巢栖枝」可多迎一位"}</div>`
              }
              ${friend ? `<div class="migrant-card__friend">${renderUiIcon("migratingBird", 14)}<span>本季已有一只结伴入队</span></div>` : ""}
              <div class="migrant-card__foot">
                <button type="button" class="btn btn--small${hosted ? " btn--ghost" : " btn--primary"}" data-migration-host="${escapeHtml(def.id)}" ${canHost ? "" : "disabled"}>${hosted ? "送别（停止驻留）" : "迎上栖枝"}</button>
              </div>
            </div>`;
        })
        .join("");

      const medalCardsHtml = MIGRATION_SEASONS.map((s) => {
        const tier = migBonus.medals[s.id] || 0;
        const isNow = s.id === migSeason.id;
        const stars = Array.from({ length: MIGRATION_MEDAL_MAX_TIER }, (_, i) => `<i class="${i < tier ? "is-on" : ""}"></i>`).join("");
        return `
          <div class="migration-medal tier-${tier} season-${escapeHtml(s.id)} ${isNow ? "is-current" : ""}">
            ${renderUiIcon("migrationMedal", 28)}
            <div class="migration-medal__body">
              <div class="migration-medal__name">${escapeHtml(s.medalName)}${isNow ? `<span class="tag tag--season season-${escapeHtml(s.id)}">本季</span>` : ""}</div>
              <div class="migration-medal__stars" aria-label="成色 ${tier}/${MIGRATION_MEDAL_MAX_TIER}">${stars}</div>
              <div class="row__desc">${tier > 0 ? `最佳 ${escapeHtml(getMigrationMedalTierName(tier))}` : "尚未获章"} · ${escapeHtml(s.monthsText)}</div>
            </div>
          </div>`;
      }).join("");

      const atlasHtml = MIGRANT_DEFS.map((def) => {
        const n = Math.max(0, Math.floor(Number(migration.atlas?.[def.id]) || 0));
        const known = n > 0;
        const sDef = getMigrationSeasonDef(def.season);
        const inSeason = def.season === migSeason.id;
        return `
          <div class="migrant-atlas-entry rarity-${escapeHtml(def.rarity)} ${known ? "is-known" : "is-unknown"} ${inSeason ? "is-in-season" : ""}" title="${escapeHtml(known ? def.note : `${sDef?.name || ""}季（${sDef?.monthsText || ""}）到访`)}">
            <span class="migrant-atlas-entry__art ${known ? "" : "dex-silhouette"}">${renderBeastIcon(def.dex, known ? def.name : "未知候鸟萌灵", false)}</span>
            <span class="migrant-atlas-entry__name">${known ? escapeHtml(def.name) : "？？？"}</span>
            <span class="migrant-atlas-entry__meta">${escapeHtml(sDef?.name || "")}季${known ? ` · ×${n}` : ""}</span>
          </div>`;
      }).join("");

      const journalHtml = (migration.journal || [])
        .slice(0, 3)
        .map((e) => {
          const def = getMigrantDef(e.migrantId);
          const at = e.at ? new Date(e.at) : null;
          const md = at ? `${at.getMonth() + 1}/${at.getDate()} ${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}` : "--";
          const txt =
            e.kind === "befriend"
              ? `「${def?.name || "候鸟"}」决定结伴留下`
              : e.kind === "medal"
                ? `获得${getMigrationMedalTierName(e.tier)}迁徙纪念章`
                : `「${def?.name || "候鸟"}」驻留观察记录 +1`;
          return `<div class="migration-journal-line kind-${escapeHtml(e.kind)}"><span class="migration-journal-line__time">${escapeHtml(md)}</span><span>${escapeHtml(txt)}</span></div>`;
        })
        .join("");
      const migLogsHtml = (migration.recentLogs || []).slice(0, 2).map((ln) => `<div class="camp-log-line">${escapeHtml(ln)}</div>`).join("");
      const nextSeasonNames = getMigrantsForSeason(migSeason.next.id).map((m) => m.name).join("、");

      rows.push(`
        <div class="row migration-body season-${escapeHtml(migSeason.id)}">
          <div class="row__left" style="width:100%">
            <div class="season-banner season-${escapeHtml(migSeason.id)}">
              <div class="season-banner__top">
                ${renderUiIcon("seasonCompass", 30)}
                <div class="season-banner__text">
                  <strong>${escapeHtml(migSeason.name)}季 · ${escapeHtml(migSeason.label)}（${escapeHtml(migSeason.monthsText)}）</strong>
                  <span>${escapeHtml(migSeason.blurb)}</span>
                </div>
                <span class="tag tag--season season-${escapeHtml(migSeason.id)}" data-migration-countdown="2">${escapeHtml(migCountdown)}</span>
              </div>
              <div class="dock-progress season-medal-progress">
                <div class="dock-progress__bar"><i data-migration-medal-fill="1" style="width:${migMedal.pct}%"></i></div>
                <span class="dock-progress__txt" data-migration-medal-txt="1">${escapeHtml(migMedal.text)}</span>
              </div>
              <div class="season-banner__next">下一季「${escapeHtml(migSeason.next.label)}」将迎来：${escapeHtml(nextSeasonNames)}</div>
            </div>

            <div class="migrant-grid">${migrantCardsHtml}</div>

            <div class="eco-aura-strip migration-aura-strip">
              <span class="shiny-aura-pill ${migSpeed.speedMul > 1 ? "is-on" : ""}">驻留观察 ×${migSpeed.speedMul.toFixed(2)}（候鸟云巢栖枝）</span>
              <span class="shiny-aura-pill ${migBonus.prodAdd > 0 ? "is-on" : ""}">纪念章 全产 +${ml11Pct(migBonus.prodAdd)}${migBonus.allSeasons ? " · 四季圆满" : ""}</span>
              <span class="shiny-aura-pill ${migBonus.shinyAdd > 0 ? "is-on" : ""}">闪光 +${ml11Pct(migBonus.shinyAdd)}</span>
              <span class="shiny-aura-pill ${migBonus.catchAdd > 0 ? "is-on" : ""}">捕获 +${ml11Pct(migBonus.catchAdd)}</span>
              <span class="shiny-aura-pill ${migBonus.pveOutAdd > 0 ? "is-on" : ""}">PvE 增伤 +${ml11Pct(migBonus.pveOutAdd)}</span>
            </div>

            <div class="migration-bottom-row">
              <div class="migration-medal-cabinet">
                <div class="migration-panel-title">${renderUiIcon("migrationMedal", 18)}<span>迁徙纪念章</span><span class="tag">${migBonus.medalPoints}/${migBonus.maxPoints} 成色 · ${migBonus.seasonsWithMedal}/4 季</span></div>
                <div class="migration-medal-grid">${medalCardsHtml}</div>
              </div>
              <div class="migration-atlas">
                <div class="migration-panel-title">${renderUiIcon("migratingBird", 18)}<span>迁徙图鉴</span><span class="tag">${migBonus.atlasSeen}/${migBonus.totalMigrants} · 结伴 ${migration.totalBefriended || 0} 次</span></div>
                <div class="migrant-atlas-grid">${atlasHtml}</div>
                ${journalHtml ? `<div class="migration-journal">${journalHtml}</div>` : `<div class="migration-journal-line is-empty">还没有观察记录：先把本季的候鸟迎上栖枝，或用今天的免费「撒谷迎候」。</div>`}
                ${migLogsHtml ? `<div class="star-camp-logs" style="margin-top:6px">${migLogsHtml}</div>` : ""}
              </div>
            </div>
          </div>
        </div>
      `);
    }

    // ========== ML-10 Section: 萌灵「月光夜行生态观察站」(Moonlit Nocturnal Eco Observatory) ==========
    const hideNightObs = Boolean(ui.functionsHideNightObs);
    const nightObs = ensureNightObservatoryState(state);
    const nightPhase = getNightObservatoryPhase();
    const nightAura = computeNightObservatoryAura(state);
    const nightStationedMons = nightObs.stationedIds.map((id) => list.find((m) => m && m.id === id) || null).filter(Boolean);
    const nightObserverEval = evaluateNightObservers(nightStationedMons, state, { getBeastDataByDex });
    const nightIdleMons = getIdleNightObservatoryCandidates(state);
    const nightLanterns = Math.max(0, Math.floor(state.res?.fireflyLantern?.value ?? 0));
    const nightPatrolFree = getNightPatrolFreeLeft(state);
    const nightCoins = Math.max(0, Math.floor(state.res?.futurecoin?.value ?? 0));
    const canNightPatrol = nightStationedMons.length > 0 && (nightPatrolFree > 0 || nightCoins >= NIGHT_OBS_PATROL_COIN_COST);
    const canNightAutofill = nightStationedMons.length < NIGHT_OBS_MAX_STATION && nightIdleMons.length > 0;
    const nightCountdownTxt = `${nightPhase.countdownLabel} ${ml10FmtHm(nightPhase.msUntilChange)}`;
    const nightProgress = ml10NightProgress(nightObs, nightObserverEval, nightPhase);
    const affineSet = new Set(NIGHT_OBS_AFFINE_TYPES);
    let nightObsModalHtml = "";

    rows.push(`
      <div class="row night-obs-header ${nightPhase.isNight ? "is-night" : "is-dusk"}" data-night-phase="${nightPhase.phase}">
        <div class="row__left">
          <div class="row__title row__titleLine">
            ${renderUiIcon("nightObservatory", 20)}
            <span>月光夜行生态观察站</span>
            <span class="tag tag--night-phase ${nightPhase.isNight ? "is-night" : "is-dusk"}">${escapeHtml(nightPhase.label)} · <span data-night-countdown="1">${escapeHtml(nightCountdownTxt)}</span></span>
            <span class="tag">派驻 ${nightStationedMons.length}/${NIGHT_OBS_MAX_STATION}</span>
            <span class="tag">观察日记 ${nightAura.discovered}/${nightAura.totalCreatures}</span>
            <span class="tag tag--lantern">${renderResSvg("fireflyLantern", 14)}<span data-night-lantern-stock="1">萤火灯笼 ×${nightLanterns}</span></span>
          </div>
          <div class="row__desc">派驻空闲伙伴值守观察站，记录夜行萌灵的出没写进观察日记、拾得萤火灯笼，并唤醒伙伴的夜行限定形态。每天 ${escapeHtml(nightPhase.windowText)} 为夜观时段（全效观测 · 夜间产出光环全开）；其余时段是暮光微光模式（观测效率 40%，最稀有的 5 种夜行萌灵不会现身）。派驻中的伙伴自动享防放生保护。</div>
        </div>
        <div class="row__right night-obs-header__btns">
          <button type="button" class="btn btn--small${canNightPatrol && nightPatrolFree > 0 ? " btn--primary" : ""}" data-night-patrol="1" ${canNightPatrol ? "" : "disabled"}>${nightPatrolFree > 0 ? "提灯夜巡（今日免费）" : `提灯夜巡（${NIGHT_OBS_PATROL_COIN_COST} 币）`}</button>
          <button type="button" class="btn btn--small" data-night-autofill="1" ${canNightAutofill ? "" : "disabled"}>一键派驻</button>
          <button type="button" class="btn btn--small btn--ghost" data-func-toggle="nightObs">${hideNightObs ? "展开" : "收起"}</button>
        </div>
      </div>
    `);

    if (!hideNightObs) {
      const slotsHtml = Array.from({ length: NIGHT_OBS_MAX_STATION }, (_, idx) => {
        const m = nightStationedMons[idx] || null;
        if (!m) {
          return `
            <div class="night-station-slot is-empty">
              <div class="night-station-slot__empty">观测席位 ${idx + 1} · 空置</div>
              <button type="button" class="btn btn--small" data-night-open-modal="1" ${nightIdleMons.length > 0 ? "" : "disabled"}>派驻伙伴</button>
            </div>`;
        }
        const mTypes = getMonTypesForExpedition(m, getBeastDataByDex);
        const typeBadges = mTypes.map((t) => `<span class="badge type type-${escapeHtml(t)}">${escapeHtml(TYPE_ZH?.[t] ?? t)}</span>`).join("");
        const isAffine = mTypes.some((t) => affineSet.has(t));
        const tally = Math.max(0, Math.floor(Number(nightObs.tally?.[String(m.id)]) || 0));
        const form = getMonNocturnalFormBonus(state, m.id);
        const formPreview = getNocturnalFormDefForMon(m, { getBeastDataByDex });
        const canAwaken = canAwakenNocturnalForm(state, m.id);
        let formHtml;
        if (form.hasForm) {
          formHtml = `<div class="night-form-chip is-awakened">${renderUiIcon("nocturnalCrest", 16)}<span>夜行形态「${escapeHtml(form.formName)}」${form.nightActive ? " · 夜间 +5%" : " · 白昼 +2%"}</span></div>`;
        } else {
          const need = tally < NIGHT_OBS_FORM_TALLY_REQ ? `需观测 ${NIGHT_OBS_FORM_TALLY_REQ} 次（${tally}/${NIGHT_OBS_FORM_TALLY_REQ}）` : `萤火灯笼 ×${NIGHT_OBS_FORM_COST.fireflyLantern} · ${NIGHT_OBS_FORM_COST.futurecoin} 币`;
          formHtml = `
            <div class="night-form-chip">${renderUiIcon("nocturnalCrest", 16)}<span>可觉醒「${escapeHtml(formPreview.name)}」</span></div>
            <button type="button" class="btn btn--small ${canAwaken ? "btn--primary" : ""}" data-night-awaken="${m.id}" ${canAwaken ? "" : "disabled"}>唤醒夜行形态（${escapeHtml(need)}）</button>`;
        }
        return `
          <div class="night-station-slot is-filled ${form.hasForm ? "has-form" : ""}">
            <div class="night-station-slot__head">
              ${renderBeastIcon(m.dex, m.name, Boolean(m.isShiny))}
              <div class="night-station-slot__titleBox">
                <div class="night-station-slot__name">${escapeHtml(m.name)} <span class="tag">Lv.${m.lvl || 1}</span></div>
                <div class="night-station-slot__meta">${typeBadges}${isAffine ? `<span class="tag tag--night-affine">夜视契合 +12%</span>` : ""}</div>
              </div>
            </div>
            <div class="row__desc">已参与观测 ${tally} 次</div>
            ${formHtml}
            <div class="night-station-slot__foot">
              <button type="button" class="btn btn--small btn--danger" data-night-recall="${m.id}">撤回</button>
            </div>
          </div>`;
      }).join("");

      const latestEntries = nightObs.journal.slice(0, 4);
      const journalLinesHtml = latestEntries.length
        ? latestEntries
            .map((e) => {
              const c = getNocturnalCreatureDef(e.creatureId);
              const at = e.at ? new Date(e.at) : null;
              const hm = at ? `${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}` : "--:--";
              return `<div class="night-journal-line"><span class="night-journal-line__time">${hm}</span><span>「${escapeHtml(c?.name || "夜行萌灵")}」由 ${escapeHtml(e.observer)} 记录 · ${e.phase === "night" ? "夜观" : "暮光"}</span>${e.isNew ? `<span class="tag tag--night-new">新页</span>` : ""}</div>`;
            })
            .join("")
        : `<div class="night-journal-line is-empty">观察日记还是空白的：先派驻 1~3 只伙伴，或用今天的免费「提灯夜巡」立即记录 3 次出没。</div>`;
      const latestNoteCreature = latestEntries.length ? getNocturnalCreatureDef(latestEntries[0].creatureId) : null;
      const noteHtml = latestNoteCreature
        ? `<div class="night-journal-note">${renderUiIcon("moonlitJournal", 16)}<span>日记摘录 ·「${escapeHtml(latestNoteCreature.name)}」：${escapeHtml(latestNoteCreature.note)}</span></div>`
        : "";
      const rarityZh = { common: "常见", uncommon: "少见", rare: "稀有", legend: "传说" };
      const creatureGridHtml = NOCTURNAL_CREATURE_DEFS.map((c) => {
        const n = Math.max(0, Math.floor(Number(nightObs.sightings?.[c.id]) || 0));
        const known = n > 0;
        const hiddenNow = c.nightOnly && !nightPhase.isNight;
        return `
          <div class="night-creature rarity-${escapeHtml(c.rarity)} ${known ? "is-known" : "is-unknown"} ${hiddenNow ? "is-hidden-now" : ""}" title="${escapeHtml(known ? c.note : c.nightOnly ? "夜观时段限定：19:00 后才会现身" : "暮光与夜晚都可能现身")}">
            <span class="night-creature__art ${known ? "" : "dex-silhouette"}">${renderBeastIcon(c.dex, known ? c.name : "未知夜行萌灵", false)}</span>
            <span class="night-creature__name">${known ? escapeHtml(c.name) : "？？？"}</span>
            <span class="night-creature__meta">${escapeHtml(rarityZh[c.rarity] || "")}${c.nightOnly ? " · 夜观限定" : ""}${known ? ` · ×${n}` : ""}</span>
          </div>`;
      }).join("");

      const nightLogsHtml = (nightObs.recentLogs || []).slice(0, 2).map((ln) => `<div class="camp-log-line">${escapeHtml(ln)}</div>`).join("");

      rows.push(`
        <div class="row night-obs-body ${nightPhase.isNight ? "is-night" : "is-dusk"}">
          <div class="row__left" style="width:100%">
            <div class="night-phase-banner ${nightPhase.isNight ? "is-night" : "is-dusk"}">
              <div class="night-phase-banner__top">
                ${renderUiIcon(nightPhase.isNight ? "nightObservatory" : "fireflyLantern", 28)}
                <div class="night-phase-banner__text">
                  <strong>${nightPhase.isNight ? "夜观时段开放中" : "暮光微光模式"}</strong>
                  <span>${nightPhase.isNight ? "12 种夜行萌灵都可能现身 · 夜间产出光环 100% 生效" : "观测效率 40% · 仅 7 种常见/少见夜行萌灵现身 · 光环按 40% 生效"}</span>
                </div>
                <span class="tag tag--night-phase ${nightPhase.isNight ? "is-night" : "is-dusk"}" data-night-countdown="2">${escapeHtml(nightCountdownTxt)}</span>
              </div>
              <div class="dock-progress night-progress">
                <div class="dock-progress__bar"><i data-night-fill="1" style="width:${nightProgress.pct}%"></i></div>
                <span class="dock-progress__txt" data-night-txt="1">${escapeHtml(nightProgress.text)}</span>
              </div>
            </div>

            <div class="night-station-grid">${slotsHtml}</div>

            <div class="eco-aura-strip night-aura-strip">
              <span class="shiny-aura-pill ${nightAura.nightProdAdd > 0 ? "is-on" : ""}">夜间产出光环 +${Math.round(nightAura.nightProdAdd * 1000) / 10}%（基础 +${Math.round(nightAura.nightAuraBaseAdd * 1000) / 10}% × ${Math.round(nightAura.auraMul * 100)}%）</span>
              <span class="shiny-aura-pill ${nightAura.journalProdAdd > 0 ? "is-on" : ""}">观察日记永久：全产 +${Math.round(nightAura.journalProdAdd * 1000) / 10}% · 闪光 +${Math.round(nightAura.shinyAdd * 1000) / 10}%</span>
              <span class="shiny-aura-pill ${nightObserverEval.speedMul > 1 ? "is-on" : ""}">观测效率 ×${(nightObserverEval.speedMul || 0).toFixed(2)}（夜视契合 ${nightObserverEval.affineCount} 只）</span>
              <span class="shiny-aura-pill ${nightAura.formsAwakened > 0 ? "is-on" : ""}">夜行形态 ${nightAura.formsAwakened} 只</span>
            </div>

            <div class="night-journal-row">
              <div class="night-journal">
                <div class="night-journal__title">${renderUiIcon("moonlitJournal", 18)}<span>观察日记</span><span class="tag">累计记录 ${nightObs.totalSightings || 0} 次 · 夜观 ${nightObs.nightSightings || 0} 次</span></div>
                ${journalLinesHtml}
                ${noteHtml}
                ${nightLogsHtml ? `<div class="star-camp-logs" style="margin-top:6px">${nightLogsHtml}</div>` : ""}
              </div>
              <div class="night-creature-grid">${creatureGridHtml}</div>
            </div>
          </div>
        </div>
      `);

      if (ui.nightObsModalOpen) {
        const stationedSet = new Set(nightObs.stationedIds);
        const modalMons = [...nightStationedMons, ...nightIdleMons.filter((m) => !stationedSet.has(m.id))];
        const skipped = list.filter((m) => m && !modalMons.some((x) => x.id === m.id)).length;
        const modalRowsHtml = modalMons.length
          ? modalMons
              .map((m) => {
                const checked = stationedSet.has(m.id);
                const disableNew = !checked && stationedSet.size >= NIGHT_OBS_MAX_STATION;
                const mTypes = getMonTypesForExpedition(m, getBeastDataByDex);
                const isAffine = mTypes.some((t) => affineSet.has(t));
                return `
                  <div class="row func-mon-row ${checked ? "is-active" : ""}">
                    <div class="row__left">
                      <div class="row__title row__titleLine">${renderBeastIcon(m.dex, m.name, Boolean(m.isShiny))}<span>${escapeHtml(m.name)}</span><span class="tag">Lv.${m.lvl || 1}</span>${isAffine ? `<span class="tag tag--night-affine">夜视契合</span>` : ""}</div>
                      <div class="row__desc">${escapeHtml(mTypes.map((t) => TYPE_ZH?.[t] ?? t).join("/") || "-")} · 战力 ${monPower(m)}</div>
                    </div>
                    <div class="row__right">
                      <input class="chk" type="checkbox" data-night-modal-check="${m.id}" ${checked ? "checked" : ""} ${disableNew ? "disabled" : ""} />
                    </div>
                  </div>`;
              })
              .join("")
          : `<div class="muted" style="padding:12px">当前暂无空闲伙伴可派驻（训练、远征、出战、孵育、露营、沙盘勘探、出海与本命灵契中的伙伴已被安全过滤）。</div>`;
        nightObsModalHtml = `
          <div class="modalOverlay" data-night-modal-overlay="1">
            <div class="modal">
              <div class="modal__header">
                <div class="modal__title">${renderUiIcon("nightObservatory", 20)}<span>派驻观察站伙伴</span><span class="tag">已派驻 ${stationedSet.size}/${NIGHT_OBS_MAX_STATION}</span></div>
                <div class="modal__right">
                  <button type="button" class="btn btn--small" data-night-autofill="1" ${canNightAutofill ? "" : "disabled"}>一键派驻</button>
                  <button type="button" class="btn btn--small" data-night-modal-close="1">关闭</button>
                </div>
              </div>
              <div class="modal__desc">仅展示空闲伙伴（已过滤 ${skipped} 只忙碌中的伙伴）。暗 / 光 / 幻 / 风系伙伴夜视契合，观测效率更高；与对应夜行萌灵属性相同的伙伴更容易引来它们。</div>
              <div class="modal__body">${modalRowsHtml}</div>
              <div class="actions">
                <button type="button" class="btn btn--primary" data-night-modal-close="1">完成派驻</button>
              </div>
            </div>
          </div>`;
      }
    }

    // ========== ML-10 Section: 萌灵「杂技舞台表演赛」(Acrobat Stage Show Contest) ==========
    const hideAcrobatShow = Boolean(ui.functionsHideAcrobatShow);
    const acrobatShow = ensureAcrobatShowState(state);
    const showTheme = getAcrobatTheme();
    const showTrophy = computeAcrobatTrophyBonus(state);
    const showAway = getAcrobatUnavailableMonIds(state);
    // ML-14 统一忙碌排除：外出状态文案统一读登记表
    const showAwayMap = getAwayActivityMap(state);
    const showAwayLabel = (id) => showAwayMap.get(id)?.label || "外出中";
    const showTypesFn = (m) => getMonTypesForExpedition(m, getBeastDataByDex);
    const showOpts = { getMonTypes: showTypesFn, getBeastDataByDex };
    const showReady = acrobatShow.routine.filter((r) => !showAway.has(r.monId));
    const showEval = evaluateAcrobatRoutine(state, showReady, showTheme, showOpts);
    const showCost = getAcrobatShowCost(state);
    const showAvailMons = list.filter((m) => m && !showAway.has(m.id));
    const canShowPerform = showCost.canPerform && showReady.length > 0 && (showCost.kind !== "coin" || nightCoins >= showCost.coin);
    const canShowLantern = canShowPerform && nightLanterns >= ACROBAT_LANTERN_LIGHT_COST;
    const showFavEl = new Set(showTheme.elements);
    const showFavStyles = new Set(showTheme.styles);
    let acrobatShowModalHtml = "";
    const showCostTxt =
      showCost.kind === "limit"
        ? "今日场次已满"
        : showCost.kind === "free"
          ? `今日免费 ${showCost.left} 场`
          : `${showCost.coin} 币 · 余 ${showCost.left} 场`;

    rows.push(`
      <div class="row acrobat-show-header">
        <div class="row__left">
          <div class="row__title row__titleLine">
            ${renderUiIcon("acrobatStage", 20)}
            <span>萌灵杂技舞台表演赛</span>
            <span class="tag tag--show-theme">今日主题「${escapeHtml(showTheme.name)}」</span>
            <span class="tag">场次 ${acrobatShow.performedToday}/${ACROBAT_DAILY_MAX_SHOWS}</span>
            <span class="tag tag--show-trophy">${renderUiIcon("showStarTrophy", 14)}<span>${escapeHtml(showTrophy.trophyName)} ★${showTrophy.trophyStars}/${showTrophy.maxStars}</span></span>
          </div>
          <div class="row__desc">编排 3 只伙伴、每只 1 个杂技招式的连段节目登台表演：招式风格越多样、属性越贴合主题、相邻招式能结成连携、拍子踩准评审节拍、伙伴越亲密，得分越高。每个主题的最佳评级会点亮「舞台星光奖杯」，永久提升全产、捕获、闪光与 PvE 伤害。出海中或派驻观察站的伙伴不会登台。</div>
        </div>
        <div class="row__right acrobat-show-header__btns">
          <button type="button" class="btn btn--small" data-show-autofill="1" ${showAvailMons.length > 0 ? "" : "disabled"}>一键编排节目</button>
          <button type="button" class="btn btn--small" data-show-open-modal="1" ${list.length > 0 ? "" : "disabled"}>编排登台伙伴 (${acrobatShow.routine.length}/${ACROBAT_ROUTINE_SIZE})</button>
          <button type="button" class="btn btn--small btn--ghost" data-func-toggle="acrobatShow">${hideAcrobatShow ? "展开" : "收起"}</button>
        </div>
      </div>
    `);

    if (!hideAcrobatShow) {
      const showRotateTxt = `${ml10FmtHm(showTheme.msUntilNext)} 后轮换为「${showTheme.next.name}」`;
      const themeElBadges = showTheme.elements
        .map((t) => `<span class="badge type type-${escapeHtml(t)}">${escapeHtml(TYPE_ZH?.[t] ?? t)}</span>`)
        .join("");
      const themeStyleTags = showTheme.styles.map((s) => `<span class="tag tag--show-style">${escapeHtml(ACROBAT_STYLE_ZH[s] || s)}</span>`).join("");
      const tempoHtml = showTheme.tempo
        .map((b, i) => `<span class="show-beat beat-${b}"><em>第 ${i + 1} 拍</em>${escapeHtml(ACROBAT_BEAT_ZH[b] || "")}</span>`)
        .join("");

      const routineHtml = Array.from({ length: ACROBAT_ROUTINE_SIZE }, (_, idx) => {
        const slot = acrobatShow.routine[idx] || null;
        const want = showTheme.tempo[idx] || 2;
        const head = `<div class="show-slot__head"><span class="show-slot__no">第 ${idx + 1} 拍</span><span class="show-beat beat-${want}">${escapeHtml(ACROBAT_BEAT_ZH[want] || "")}</span></div>`;
        const mon = slot ? list.find((m) => m && m.id === slot.monId) || null : null;
        if (!slot || !mon) {
          return `
            <div class="show-slot is-empty">
              ${head}
              <div class="show-slot__empty">空位 · 等待登台伙伴</div>
              <button type="button" class="btn btn--small" data-show-open-modal="1" ${list.length > 0 ? "" : "disabled"}>编排登台伙伴</button>
            </div>`;
        }
        const away = showAway.has(mon.id);
        const awayTxt = away ? `${showAwayLabel(mon.id)} · 本场不登台` : "";
        const evSlot = showEval.perSlot.find((p) => p.monId === mon.id) || null;
        const moves = getAcrobatMovesForMon(mon, showOpts);
        const movesHtml = moves
          .map((mv) => {
            const sel = mv.id === slot.moveId;
            const fav = (mv.element && showFavEl.has(mv.element)) || showFavStyles.has(mv.style);
            const beatOk = mv.beat === want;
            return `<button type="button" class="show-move-chip ${sel ? "is-selected" : ""} ${fav ? "is-fav" : ""} ${beatOk ? "is-beat" : ""}" data-show-move="${idx}" data-show-move-id="${escapeHtml(mv.id)}" aria-pressed="${sel ? "true" : "false"}">
              <span class="show-move-chip__name">${escapeHtml(mv.name)}</span>
              <span class="show-move-chip__meta">${mv.element ? escapeHtml(TYPE_ZH?.[mv.element] ?? mv.element) : "通用"} · ${escapeHtml(ACROBAT_STYLE_ZH[mv.style] || mv.style)} · ${escapeHtml(ACROBAT_BEAT_ZH[mv.beat] || "")}</span>
            </button>`;
          })
          .join("");
        const beatTag = evSlot
          ? evSlot.beatHit === "perfect"
            ? `<span class="tag tag--show-perfect">节拍完美</span>`
            : evSlot.beatHit === "near"
              ? `<span class="tag">节拍接近</span>`
              : `<span class="tag tag--show-miss">节拍错位</span>`
          : "";
        const form = getMonNocturnalFormBonus(state, mon.id);
        return `
          <div class="show-slot is-filled ${away ? "is-away" : ""}">
            ${head}
            <div class="show-slot__mon">
              ${renderBeastIcon(mon.dex, mon.name, Boolean(mon.isShiny))}
              <span class="show-slot__name">${escapeHtml(mon.name)}</span>
              <span class="tag">Lv.${mon.lvl || 1}</span>
              <span class="tag">亲密 ${Math.floor(Number(mon.affection) || 0)}</span>
              ${form.hasForm ? `<span class="tag tag--nocturnal-form">${renderUiIcon("nocturnalCrest", 12)}<span>${escapeHtml(form.formName)}</span></span>` : ""}
              ${away ? `<span class="tag tag--dock-bottle">${escapeHtml(awayTxt)}</span>` : beatTag}
            </div>
            <div class="show-move-list">${movesHtml}</div>
            <div class="show-slot__foot">
              <button type="button" class="btn btn--small" data-show-shift="${idx}" data-show-dir="-1" ${idx > 0 ? "" : "disabled"}>提前出场</button>
              <button type="button" class="btn btn--small" data-show-shift="${idx}" data-show-dir="1" ${idx < acrobatShow.routine.length - 1 ? "" : "disabled"}>延后出场</button>
              <button type="button" class="btn btn--small btn--danger" data-show-remove="${mon.id}">下台</button>
            </div>
          </div>`;
      }).join("");

      const comboHtml = showEval.comboLinks.length
        ? showEval.comboLinks
            .map((c) => `<span class="tag tag--show-combo">第 ${c.fromIdx + 1}→${c.fromIdx + 2} 拍 · ${escapeHtml(c.name)}</span>`)
            .join("")
        : `<span class="tag">相邻两拍的招式属性结成连携（如 水+暗、火+风）可加分</span>`;
      const b = showEval.breakdown;
      const projTierName = getAcrobatTierName(showEval.projectedTier);
      const tierLineHtml = ACROBAT_TIERS.map(
        (t) => `<span class="show-tier-mark ${showEval.baseScore >= t.minScore ? "is-reached" : ""}">${escapeHtml(t.name)} ${t.minScore}</span>`,
      ).join("");

      const last = acrobatShow.lastShow;
      const lastHtml = last
        ? `
          <div class="show-result-card tier-${Math.max(0, Math.min(4, Number(last.tier) || 0))}">
            <div class="show-result-card__top">
              ${renderUiIcon("showStarTrophy", 30)}
              <div>
                <div class="show-result-card__score">${Math.floor(Number(last.score) || 0)} 分 · ${escapeHtml(last.tierName || "未入围")}</div>
                <div class="row__desc">「${escapeHtml(last.themeName || "")}」${escapeHtml((last.performers || []).join("、"))}：${escapeHtml((last.moves || []).join(" → "))}</div>
              </div>
            </div>
            <div class="show-result-card__judge">${escapeHtml(last.judgeLine || "")}</div>
            <div class="row__desc">编排得分 ${Math.floor(Number(last.baseScore) || 0)} · 现场发挥 ${Number(last.live) >= 0 ? "+" : ""}${Number(last.live) || 0}${last.lanternLit ? " · 萤火舞台灯 ×1.1" : ""}${last.comboNames?.length ? ` · 连携「${escapeHtml(last.comboNames.join("」「"))}」` : ""}</div>
            <div class="row__desc">奖励：未来币 +${last.rewards?.futurecoin || 0} · 经验 +${last.rewards?.exp || 0}（登台伙伴）${last.rewards?.fireflyLantern ? ` · 萤火灯笼 +${last.rewards.fireflyLantern}` : ""}${last.rewards?.shinyStarSand ? ` · 闪光祈愿星砂 +${last.rewards.shinyStarSand}` : ""}${last.newTierBonus ? " · 主题评级刷新奖励" : ""}</div>
          </div>`
        : `
          <div class="show-result-card is-empty">
            <div class="show-result-card__top">${renderUiIcon("showStarTrophy", 30)}<div><div class="show-result-card__score">还没有登台记录</div><div class="row__desc">点「一键编排节目」让评审先看看你的伙伴们吧。</div></div></div>
          </div>`;

      const cabinetHtml = ACROBAT_THEMES.map((t) => {
        const tier = Math.max(0, Math.floor(Number(acrobatShow.bestTierByTheme?.[t.id]) || 0));
        const bestScore = Math.max(0, Math.floor(Number(acrobatShow.bestScoreByTheme?.[t.id]) || 0));
        const stars = Array.from({ length: ACROBAT_TROPHY_MAX_TIER }, (_, i) => `<i class="${i < tier ? "is-on" : ""}"></i>`).join("");
        return `
          <div class="show-trophy-card tier-${tier} ${t.id === showTheme.id ? "is-today" : ""}">
            ${renderUiIcon("showStarTrophy", 26)}
            <div class="show-trophy-card__body">
              <div class="show-trophy-card__name">${escapeHtml(t.name)}${t.id === showTheme.id ? `<span class="tag tag--show-theme">今日</span>` : ""}</div>
              <div class="show-trophy-card__stars" aria-label="评级 ${tier}/${ACROBAT_TROPHY_MAX_TIER}">${stars}</div>
              <div class="row__desc">${tier > 0 ? `${escapeHtml(getAcrobatTierName(tier))} · 最佳 ${bestScore} 分` : "尚未获奖"}</div>
            </div>
          </div>`;
      }).join("");

      rows.push(`
        <div class="row acrobat-show-body">
          <div class="row__left" style="width:100%">
            <div class="show-theme-strip">
              <div class="show-theme-strip__row">
                <span class="tri-rule-strip__label">评审</span><strong>${escapeHtml(showTheme.judge)}</strong>
                <span class="tri-rule-strip__label">偏爱属性</span>${themeElBadges}
                <span class="tri-rule-strip__label">偏爱风格</span>${themeStyleTags}
              </div>
              <div class="show-theme-strip__row">
                <span class="tri-rule-strip__label">节拍「${escapeHtml(showTheme.tempoName)}」</span>${tempoHtml}
                <span class="tri-rule-strip__muted">${escapeHtml(showRotateTxt)}</span>
              </div>
              <div class="show-theme-strip__motto">“${escapeHtml(showTheme.motto)}”</div>
            </div>

            <div class="show-routine-track">${routineHtml}</div>
            <div class="show-combo-row">${comboHtml}</div>

            <div class="show-score-panel">
              <div class="show-score-panel__main">
                <div class="show-score-panel__num">预估 ${showEval.baseScore} 分</div>
                <div class="show-score-panel__tier">${escapeHtml(projTierName)}</div>
                <div class="show-tier-line">${tierLineHtml}</div>
              </div>
              <div class="eco-aura-strip show-breakdown">
                <span class="shiny-aura-pill is-on">表演功底 ${b.execution}</span>
                <span class="shiny-aura-pill ${b.variety > 0 ? "is-on" : ""}">招式多样 ${b.variety}（${showEval.styleCount} 种风格）</span>
                <span class="shiny-aura-pill ${b.synergy > 0 ? "is-on" : ""}">属性协奏 ${b.synergy}</span>
                <span class="shiny-aura-pill ${b.style > 0 ? "is-on" : ""}">评审风格 ${b.style}</span>
                <span class="shiny-aura-pill ${b.bond > 0 ? "is-on" : ""}">羁绊默契 ${b.bond}${showEval.trioBond ? " · 默契三重奏" : ""}</span>
                <span class="shiny-aura-pill ${b.timing > 0 ? "is-on" : ""}">节拍时机 ${b.timing}</span>
                <span class="shiny-aura-pill">台风熟练度 ×${Number(showEval.craftMul || 0).toFixed(2)}</span>
              </div>
              <div class="show-score-panel__btns">
                <button type="button" class="btn btn--primary" data-show-perform="plain" ${canShowPerform ? "" : "disabled"}>登台表演（${escapeHtml(showCostTxt)}）</button>
                <button type="button" class="btn" data-show-perform="lantern" ${canShowLantern ? "" : "disabled"}>${renderResSvg("fireflyLantern", 14)}<span>点灯登台（萤火灯笼 ×${ACROBAT_LANTERN_LIGHT_COST} · 得分 +10%）</span></button>
              </div>
            </div>

            <div class="show-bottom-row">
              ${lastHtml}
              <div class="show-trophy-cabinet">
                <div class="show-trophy-cabinet__title">${renderUiIcon("showStarTrophy", 18)}<span>舞台星光奖杯陈列柜</span><span class="tag">★${showTrophy.trophyStars}/${showTrophy.maxStars}${showTrophy.allRadiant ? " · 全场璀璨" : ""}</span></div>
                <div class="show-trophy-grid">${cabinetHtml}</div>
                <div class="eco-aura-strip" style="margin-top:6px">
                  <span class="shiny-aura-pill ${showTrophy.prodAdd > 0 ? "is-on" : ""}">全产 +${Math.round(showTrophy.prodAdd * 1000) / 10}%</span>
                  <span class="shiny-aura-pill ${showTrophy.catchAdd > 0 ? "is-on" : ""}">捕获 +${Math.round(showTrophy.catchAdd * 1000) / 10}%</span>
                  <span class="shiny-aura-pill ${showTrophy.shinyAdd > 0 ? "is-on" : ""}">闪光 +${Math.round(showTrophy.shinyAdd * 1000) / 10}%</span>
                  <span class="shiny-aura-pill ${showTrophy.pveOutAdd > 0 ? "is-on" : ""}">PvE 增伤 +${Math.round(showTrophy.pveOutAdd * 100)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      `);

      if (ui.acrobatShowModalOpen) {
        const inRoutine = new Set(acrobatShow.routine.map((r) => r.monId));
        const sortedMons = list
          .filter(Boolean)
          .slice()
          .sort((a, c) => (inRoutine.has(c.id) ? 1 : 0) - (inRoutine.has(a.id) ? 1 : 0) || monPower(c) - monPower(a));
        const modalRowsHtml = sortedMons
          .map((m) => {
            const checked = inRoutine.has(m.id);
            const away = showAway.has(m.id);
            const disabled = !checked && (away || inRoutine.size >= ACROBAT_ROUTINE_SIZE);
            const mTypes = showTypesFn(m);
            const favTypes = mTypes.filter((t) => showFavEl.has(t));
            return `
              <div class="row func-mon-row ${checked ? "is-active" : ""}">
                <div class="row__left">
                  <div class="row__title row__titleLine">
                    ${renderBeastIcon(m.dex, m.name, Boolean(m.isShiny))}
                    <span>${escapeHtml(m.name)}</span>
                    <span class="tag">Lv.${m.lvl || 1}</span>
                    ${favTypes.length ? `<span class="tag tag--show-theme">主题偏爱 ${escapeHtml(favTypes.map((t) => TYPE_ZH?.[t] ?? t).join("/"))}</span>` : ""}
                    ${away ? `<span class="tag tag--dock-bottle">${escapeHtml(showAwayLabel(m.id))}</span>` : ""}
                  </div>
                  <div class="row__desc">${escapeHtml(mTypes.map((t) => TYPE_ZH?.[t] ?? t).join("/") || "-")} · 亲密 ${Math.floor(Number(m.affection) || 0)} · 战力 ${monPower(m)}</div>
                </div>
                <div class="row__right">
                  <input class="chk" type="checkbox" data-show-modal-check="${m.id}" ${checked ? "checked" : ""} ${disabled ? "disabled" : ""} />
                </div>
              </div>`;
          })
          .join("");
        acrobatShowModalHtml = `
          <div class="modalOverlay" data-show-modal-overlay="1">
            <div class="modal">
              <div class="modal__header">
                <div class="modal__title">${renderUiIcon("acrobatStage", 20)}<span>编排登台伙伴</span><span class="tag">已选 ${inRoutine.size}/${ACROBAT_ROUTINE_SIZE}</span></div>
                <div class="modal__right">
                  <button type="button" class="btn btn--small" data-show-autofill="1" ${showAvailMons.length > 0 ? "" : "disabled"}>一键编排</button>
                  <button type="button" class="btn btn--small" data-show-modal-close="1">关闭</button>
                </div>
              </div>
              <div class="modal__desc">今日「${escapeHtml(showTheme.name)}」偏爱 ${escapeHtml(showTheme.elements.map((t) => TYPE_ZH?.[t] ?? t).join(" / "))} 属性与 ${escapeHtml(showTheme.styles.map((s) => ACROBAT_STYLE_ZH[s] || s).join(" / "))} 风格。勾选的顺序即出场顺序，可在舞台上再调整。出海中、派驻观察站的伙伴无法登台。</div>
              <div class="modal__body">${modalRowsHtml || '<div class="badge badge--muted">暂无可选伙伴</div>'}</div>
              <div class="actions">
                <button type="button" class="btn btn--primary" data-show-modal-close="1">完成编排</button>
              </div>
            </div>
          </div>`;
      }
    }

    // ========== ML-9 Section: 萌灵「星海漂流瓶心愿码头」(Starsea Drift-Bottle Wish Dock) ==========
    const hideWishDock = Boolean(ui.functionsHideWishDock);
    const wishDock = ensureWishDockState(state);
    const dockAura = computeWishDockAura(state);
    const dockBottles = Math.max(0, Math.floor(state.res?.driftBottle?.value ?? 0));
    const canDailyBottles = canClaimDailyDriftBottles(state);
    const dockActiveCount = WISH_DOCK_ROUTES.filter((r) => wishDock.routes[r.id].active).length;
    const dockReadyCount = WISH_DOCK_ROUTES.filter((r) => wishDock.routes[r.id].completed).length;
    const dockIdleByRoute = Object.fromEntries(
      WISH_DOCK_ROUTES.map((r) => [r.id, getIdleWishDockCandidates(state, r.id)]),
    );
    const canDockAutoAll = WISH_DOCK_ROUTES.some(
      (r) =>
        !wishDock.routes[r.id].active &&
        (wishDock.routes[r.id].stagedIds.length > 0 || dockIdleByRoute[r.id].length > 0),
    );
    const dockBreezeLeft = getWishDockBreezeLeft(state);
    const dockOpenBatch = Math.min(WISH_DOCK_OPEN_BATCH, dockBottles);
    let wishDockModalHtml = "";

    rows.push(`
      <div class="row wish-dock-header">
        <div class="row__left">
          <div class="row__title row__titleLine">
            ${renderUiIcon("wishBottleDock", 20)}
            <span>星海漂流瓶心愿码头</span>
            <span class="tag">出海 ${dockActiveCount}/${WISH_DOCK_ROUTES.length} 航线${dockReadyCount > 0 ? ` · 可收 ${dockReadyCount}` : ""}</span>
            <span class="tag tag--dock-bottle">${renderResSvg("driftBottle", 14)}<span data-dock-bottle-stock="1">漂流瓶 ×${dockBottles}</span></span>
            <span class="tag">纪念章 ${dockAura.badgeCount}/${OCEAN_BADGE_DEFS.length}</span>
            <span class="tag">心愿信笺 ${dockAura.lettersCollected}/${dockAura.lettersTotal}</span>
          </div>
          <div class="row__desc">派遣空闲伙伴结伴去海边拾贝，带回漂流瓶；拆开漂流瓶能读到远方寄来的心愿回信，并拾得海洋奇珍。集齐奇珍可铸造「海洋奇珍纪念章」，永久提升全资源产出与闪光奇遇率。出海中的伙伴自动享防放生保护。</div>
        </div>
        <div class="row__right wish-dock-header__btns">
          <button type="button" class="btn btn--small${canDailyBottles ? " btn--primary" : ""}" data-dock-claim-daily="1" ${canDailyBottles ? "" : "disabled"}>${canDailyBottles ? `潮汐馈赠 +${WISH_DOCK_DAILY_FREE_BOTTLES} 漂流瓶` : "今日馈赠已领"}</button>
          <button type="button" class="btn btn--small" data-dock-auto-all="1" ${canDockAutoAll ? "" : "disabled"}>一键优选出海</button>
          <button type="button" class="btn btn--small${dockReadyCount > 0 ? " btn--primary" : ""}" data-dock-claim-all="1" ${dockReadyCount > 0 ? "" : "disabled"}>一键收瓶并续航${dockReadyCount > 0 ? `（${dockReadyCount}）` : ""}</button>
          <button type="button" class="btn btn--small btn--ghost" data-func-toggle="wishDock">${hideWishDock ? "展开" : "收起"}</button>
        </div>
      </div>
    `);

    if (!hideWishDock) {
      const routeCardsHtml = WISH_DOCK_ROUTES.map((rDef) => {
        const r = wishDock.routes[rDef.id];
        const crewIds = r.active ? r.crewIds : r.stagedIds;
        const crewMons = crewIds.map((id) => list.find((m) => m && m.id === id) || null).filter(Boolean);
        const ev = evaluateWishDockCrew(rDef.id, crewMons, state, { getBeastDataByDex });
        const bottlesPreview = r.active ? r.bottles : ev.bottles;
        const durSec = r.active ? r.durationSec : ev.durationSec;
        const remSec = r.active ? Math.max(0, Math.ceil(durSec - r.elapsedSec)) : durSec;
        const pct = r.active
          ? r.completed
            ? 100
            : Math.max(3, Math.min(99, Math.round((r.elapsedSec / Math.max(1, durSec)) * 100)))
          : 0;
        const rareChance = r.active ? r.rareChance : ev.rareChance;
        const favored = getOceanTreasureDef(rDef.favoredTreasure);
        const typeBadges = rDef.preferredTypes
          .map((t) => `<span class="badge type type-${escapeHtml(t)}">${escapeHtml(TYPE_ZH?.[t] ?? t)}</span>`)
          .join("");
        const slotsHtml = Array.from({ length: rDef.maxCrew }, (_, idx) => {
          const mon = crewMons[idx];
          if (!mon) return `<div class="dock-crew-slot is-empty">空位 ${idx + 1}</div>`;
          return `
            <div class="dock-crew-slot is-filled">
              ${renderBeastIcon(mon.dex, mon.name, Boolean(mon.isShiny))}
              <span class="dock-crew-slot__name">${escapeHtml(mon.name)}</span>
              <span class="dock-crew-slot__lvl">Lv.${mon.lvl || 1}</span>
            </div>`;
        }).join("");

        let footHtml = "";
        if (!r.active) {
          footHtml = `
            <div class="dock-route-card__foot">
              <button type="button" class="btn btn--small" data-dock-open-crew="${rDef.id}">编排船员 (${crewMons.length}/${rDef.maxCrew})</button>
              <button type="button" class="btn btn--small" data-dock-autopick="${rDef.id}" ${dockIdleByRoute[rDef.id].length > 0 ? "" : "disabled"}>优选船员</button>
              <button type="button" class="btn btn--small btn--primary" data-dock-dispatch="${rDef.id}" ${crewMons.length > 0 ? "" : "disabled"}>出海拾贝（${escapeHtml(fmtDuration(durSec))}）</button>
            </div>`;
        } else if (r.completed) {
          footHtml = `
            <div class="dock-progress is-done">
              <div class="dock-progress__bar"><i style="width:100%"></i></div>
              <span class="dock-progress__txt">满载归港 · 漂流瓶 ×${bottlesPreview} 待收取</span>
            </div>
            <div class="dock-route-card__foot">
              <button type="button" class="btn btn--small" data-dock-claim="${rDef.id}">收取漂流瓶</button>
              <button type="button" class="btn btn--small btn--primary" data-dock-claim-redispatch="${rDef.id}">收取并原队续航</button>
            </div>`;
        } else {
          const canBreeze = dockBreezeLeft > 0 || (state.res?.futurecoin?.value ?? 0) >= WISH_DOCK_BREEZE_COIN_COST;
          footHtml = `
            <div class="dock-progress">
              <div class="dock-progress__bar"><i data-dock-fill="${rDef.id}" style="width:${pct}%"></i></div>
              <span class="dock-progress__txt" data-dock-txt="${rDef.id}">拾贝进度 ${pct}% · 剩余 ${escapeHtml(fmtDuration(remSec))}</span>
            </div>
            <div class="dock-route-card__foot">
              <button type="button" class="btn btn--small" data-dock-breeze="${rDef.id}" ${canBreeze ? "" : "disabled"}>${dockBreezeLeft > 0 ? "顺风速航（今日免费）" : `顺风速航（${WISH_DOCK_BREEZE_COIN_COST} 币）`}</button>
              <button type="button" class="btn btn--small btn--danger" data-dock-recall="${rDef.id}">召回船员</button>
            </div>`;
        }

        return `
          <div class="dock-route-card ${r.completed ? "is-ready" : r.active ? "is-active" : ""}">
            <div class="dock-route-card__head">
              ${renderUiIcon("driftBottle", 30)}
              <div class="dock-route-card__titleBox">
                <div class="dock-route-card__titleRow">
                  <span class="dock-route-card__name">${escapeHtml(rDef.name)}</span>
                  <span class="tag">预计漂流瓶 ×${bottlesPreview}</span>
                </div>
                <div class="dock-route-card__sub">${escapeHtml(rDef.subtitle)}</div>
              </div>
            </div>
            <div class="dock-route-card__meta">偏好 ${typeBadges}<span class="tag">稀有「${escapeHtml(favored?.name || "奇珍")}」${Math.round(rareChance * 100)}%</span></div>
            <div class="dock-crew-row">${slotsHtml}</div>
            ${footHtml}
          </div>`;
      }).join("");

      const latestLetterRef = wishDock.recentLetters[0] || null;
      const latestLetter = latestLetterRef ? getWishReplyLetter(latestLetterRef.id) : null;
      const olderLetterTitles = wishDock.recentLetters
        .slice(1, 3)
        .map((ref) => getWishReplyLetter(ref.id)?.title)
        .filter(Boolean);
      const letterHtml = latestLetter
        ? `
          <div class="dock-letter-card">
            <div class="dock-letter-card__title">${renderUiIcon("driftBottle", 18)}<span>${escapeHtml(latestLetter.title)}</span></div>
            <div class="dock-letter-card__body">${escapeHtml(latestLetter.body)}</div>
            <div class="dock-letter-card__sign">—— 由 ${escapeHtml(latestLetterRef.from)} 从「${escapeHtml(latestLetterRef.routeName)}」拾回</div>
            ${olderLetterTitles.length ? `<div class="dock-letter-card__older">更早的回信：${olderLetterTitles.map((t) => escapeHtml(t)).join(" · ")}</div>` : ""}
          </div>`
        : `
          <div class="dock-letter-card is-empty">
            <div class="dock-letter-card__title">${renderUiIcon("driftBottle", 18)}<span>还没有拆开过漂流瓶</span></div>
            <div class="dock-letter-card__body">领取「潮汐馈赠」或派伙伴出海拾贝，带回的漂流瓶里藏着陌生人写给你的心愿回信。</div>
          </div>`;

      const treasureShelfHtml = OCEAN_TREASURE_DEFS.map((t) => {
        const have = Math.max(0, Math.floor(wishDock.treasures[t.id] || 0));
        return `
          <div class="dock-treasure-chip rarity-${escapeHtml(t.rarity)} ${have > 0 ? "is-owned" : ""}" title="${escapeHtml(t.desc)}">
            ${renderUiIcon("starShellTreasure", 22)}
            <span class="dock-treasure-chip__name">${escapeHtml(t.name)}</span>
            <span class="dock-treasure-chip__num">×${have}</span>
          </div>`;
      }).join("");

      const badgeCardsHtml = OCEAN_BADGE_DEFS.map((bDef) => {
        const lvl = Math.max(0, Math.floor(wishDock.badges[bDef.id] || 0));
        const previewLvl = lvl > 0 ? lvl : 1;
        const b = bDef.bonusesByLevel[previewLvl] || {};
        const cost = getOceanBadgeNextCost(state, bDef.id);
        const canForge = canForgeOceanBadge(state, bDef.id);
        const tDef = getOceanTreasureDef(bDef.treasureId);
        let costHtml = `<span class="tag">已臻满阶 Lv.${WISH_DOCK_BADGE_MAX_LEVEL}</span>`;
        if (cost) {
          const haveT = Math.floor(wishDock.treasures[bDef.treasureId] || 0);
          const pills = [
            `<span class="camp-cost-pill ${haveT >= cost.treasure ? "is-ok" : "is-lack"}">${renderUiIcon("starShellTreasure", 12)}<span>${escapeHtml(tDef?.name || bDef.treasureId)} ${haveT}/${cost.treasure}</span></span>`,
          ];
          for (const [rid, amt] of Object.entries(cost.res || {})) {
            const have = Math.floor(Number(state.res?.[rid]?.value) || 0);
            pills.push(
              `<span class="camp-cost-pill ${have >= amt ? "is-ok" : "is-lack"}">${renderResSvg(rid, 12)}<span>${escapeHtml(RES_LABEL_ZH[rid] || rid)} ${have}/${amt}</span></span>`,
            );
          }
          costHtml = pills.join("");
        }
        const bonusTxt = `全产 +${Math.round((b.prodAdd || 0) * 100)}% · 闪光 +${Math.round((b.shinyAdd || 0) * 100)}%${b.tripSpeedAdd ? ` · 出海耗时 -${Math.round(b.tripSpeedAdd * 100)}%` : ""}`;
        return `
          <div class="dock-badge-card ${lvl > 0 ? "is-forged" : ""} ${lvl >= WISH_DOCK_BADGE_MAX_LEVEL ? "is-max" : ""}">
            <div>
              <div class="row__title row__titleLine">
                ${renderUiIcon("oceanPearlBadge", 26)}
                <span>${escapeHtml(bDef.name)}</span>
                <span class="tag">${lvl > 0 ? `Lv.${lvl}/${WISH_DOCK_BADGE_MAX_LEVEL}` : "未铸造"}</span>
              </div>
              <div class="row__desc" style="margin-top:4px">${escapeHtml(bDef.desc)}</div>
              <div class="row__desc dock-badge-card__bonus">${lvl > 0 ? `当前 Lv.${lvl}` : "Lv.1 预览"}：${bonusTxt}</div>
              <div class="camp-recipe-card__costs" style="margin-top:6px">${costHtml}</div>
            </div>
            <div class="dock-badge-card__foot">
              ${
                lvl < WISH_DOCK_BADGE_MAX_LEVEL
                  ? `<button type="button" class="btn btn--small ${canForge ? "btn--primary" : ""}" data-dock-forge="${escapeHtml(bDef.id)}" ${canForge ? "" : "disabled"}>${lvl === 0 ? "铸造纪念章 Lv.1" : `升阶 Lv.${lvl + 1}`}</button>`
                  : `<button type="button" class="btn btn--small" disabled>满阶纪念章 Lv.${WISH_DOCK_BADGE_MAX_LEVEL}</button>`
              }
            </div>
          </div>`;
      }).join("");

      const dockLogsHtml =
        wishDock.recentLogs.length > 0
          ? wishDock.recentLogs.slice(0, 2).map((ln) => `<div class="camp-log-line">${escapeHtml(ln)}</div>`).join("")
          : `<div class="camp-log-line">码头的海风正好：先领取「潮汐馈赠」，再派 1~3 只空闲伙伴去海边拾贝吧！</div>`;

      rows.push(`
        <div class="row wish-dock-body">
          <div class="row__left" style="width:100%">
            <div class="dock-aura-panel">
              <div class="dock-aura-panel__top">
                ${renderUiIcon("oceanPearlBadge", 18)}
                <strong>海洋奇珍光环</strong>
                <span class="tag">${dockAura.fullTide ? "满潮共鸣生效中" : dockAura.setResonance ? "四海奇珍共鸣生效中" : `铸齐 4 枚纪念章激活四海奇珍共鸣（${dockAura.badgeCount}/4）`}</span>
                <span class="tag">出海中受保护伙伴 ${getWishDockAwayMonIds(state).size} 只</span>
              </div>
              <div class="eco-aura-strip">
                <span class="shiny-aura-pill ${dockAura.prodAdd > 0 ? "is-on" : ""}">全资源产出 +${Math.round(dockAura.prodAdd * 1000) / 10}%</span>
                <span class="shiny-aura-pill ${dockAura.shinyAdd > 0 ? "is-on" : ""}">闪光奇遇率 +${Math.round(dockAura.shinyAdd * 1000) / 10}%</span>
                <span class="shiny-aura-pill ${dockAura.tripSpeedAdd > 0 ? "is-on" : ""}">出海耗时 -${Math.round(dockAura.tripSpeedAdd * 1000) / 10}%</span>
                <span class="shiny-aura-pill ${dockAura.lettersCollected > 0 ? "is-on" : ""}">心愿信笺 ${dockAura.lettersCollected}/${dockAura.lettersTotal}（每封 +0.4% 全产）</span>
              </div>
            </div>

            <div class="dock-route-grid">${routeCardsHtml}</div>

            <div class="dock-bottle-bar">
              <div class="dock-bottle-bar__left">
                ${renderUiIcon("driftBottle", 32)}
                <div>
                  <div class="dock-bottle-bar__count" data-dock-bottle-count="1">漂流瓶 ×${dockBottles}</div>
                  <div class="row__desc">每只开出 1 封心愿回信 + 1 件海洋奇珍 + 未来币 ×${WISH_DOCK_BOTTLE_COIN}</div>
                </div>
              </div>
              <div class="dock-bottle-bar__right">
                <button type="button" class="btn btn--small ${dockBottles > 0 ? "btn--primary" : ""}" data-dock-open="1" ${dockBottles > 0 ? "" : "disabled"}>拆开 1 只漂流瓶</button>
                <button type="button" class="btn btn--small" data-dock-open="batch" ${dockBottles > 1 ? "" : "disabled"}>一键拆开 ×${Math.max(1, dockOpenBatch)}</button>
              </div>
            </div>

            <div class="dock-letter-row">
              ${letterHtml}
              <div class="dock-treasure-shelf">
                <div class="dock-treasure-shelf__title">${renderUiIcon("starShellTreasure", 16)}<span>海洋奇珍陈列架</span></div>
                <div class="dock-treasure-shelf__grid">${treasureShelfHtml}</div>
              </div>
            </div>

            <div class="dock-badge-grid">${badgeCardsHtml}</div>
            <div class="star-camp-logs" style="margin-top:8px">${dockLogsHtml}</div>
          </div>
        </div>
      `);

      if (typeof ui.wishDockModalRoute === "string" && getWishDockRouteDef(ui.wishDockModalRoute)) {
        const mDef = getWishDockRouteDef(ui.wishDockModalRoute);
        const mRoute = wishDock.routes[mDef.id];
        const stagedSet = new Set(mRoute.stagedIds);
        const candidates = dockIdleByRoute[mDef.id] || [];
        const skipped = list.filter((m) => m && !candidates.some((c) => c.id === m.id)).length;
        const modalRowsHtml = candidates.length
          ? candidates
              .slice()
              .sort((a, b) => monPower(b) - monPower(a))
              .map((m) => {
                const checked = stagedSet.has(m.id);
                const disableNew = !checked && stagedSet.size >= mDef.maxCrew;
                const mTypes = getMonTypesForExpedition(m, getBeastDataByDex);
                const typeMatch = mTypes.some((t) => mDef.preferredTypes.includes(t));
                return `
                  <div class="row func-mon-row ${checked ? "is-active" : ""}">
                    <div class="row__left">
                      <div class="row__title row__titleLine">${renderBeastIcon(m.dex, m.name, Boolean(m.isShiny))}<span>${escapeHtml(m.name)}</span><span class="tag">Lv.${m.lvl || 1}</span>${typeMatch ? `<span class="tag tag--bond-on">海风契合</span>` : ""}${m.isShiny ? `<span class="tag">闪光加成</span>` : ""}</div>
                      <div class="row__desc">${escapeHtml(mTypes.map((t) => TYPE_ZH?.[t] ?? t).join("/") || "-")} · 战力 ${monPower(m)}</div>
                    </div>
                    <div class="row__right">
                      <input class="chk" type="checkbox" data-dock-modal-check="${m.id}" data-dock-modal-route="${mDef.id}" ${checked ? "checked" : ""} ${disableNew ? "disabled" : ""} />
                    </div>
                  </div>`;
              })
              .join("")
          : `<div class="muted" style="padding:12px">当前暂无空闲伙伴可出海（训练、远征、出战、孵育、露营、沙盘勘探与本命灵契中的伙伴已被安全过滤）。</div>`;
        wishDockModalHtml = `
          <div class="modalOverlay" data-dock-modal-overlay="1">
            <div class="modal">
              <div class="modal__header">
                <div class="modal__title">${renderUiIcon("wishBottleDock", 20)}<span>${escapeHtml(mDef.name)} · 拾贝船员</span><span class="tag">已选 ${mRoute.stagedIds.length}/${mDef.maxCrew}</span></div>
                <div class="modal__right">
                  <button type="button" class="btn btn--small" data-dock-autopick="${mDef.id}">一键优选</button>
                  <button type="button" class="btn btn--small" data-dock-modal-clear="${mDef.id}">清空</button>
                  <button type="button" class="btn btn--small" data-dock-modal-close="1">关闭</button>
                </div>
              </div>
              <div class="modal__desc">仅展示空闲伙伴（已过滤 ${skipped} 只忙碌中的伙伴）。偏好属性：${escapeHtml(mDef.preferredTypes.map((t) => TYPE_ZH?.[t] ?? t).join(" / "))}，闪光伙伴更容易捞到稀有奇珍。</div>
              <div class="modal__body">${modalRowsHtml}</div>
              <div class="actions">
                <button type="button" class="btn btn--ghost" data-dock-modal-close="1">完成编排</button>
                <button type="button" class="btn btn--primary" data-dock-dispatch="${mDef.id}" ${mRoute.stagedIds.length > 0 ? "" : "disabled"}>立即出海拾贝</button>
              </div>
            </div>
          </div>`;
      }
    }

    // ========== ML-8 Section: 萌灵「远古琥珀基因复苏所」(Ancient Amber Gene Revival Lab) ==========
    const hideAmberRevival = Boolean(ui.functionsHideAmberRevival);
    const canClaimDailyAmber = canClaimDailyAncientAmber(state);
    const canSynthAmberEco = canSynthesizeAncientAmber(state, "eco");
    const canSynthAmberLeague = canSynthesizeAncientAmber(state, "league");

    rows.push(`
      <div class="row amber-revival-header">
        <div class="row__left">
          <div class="row__title row__titleLine">
            ${renderUiIcon("amberRevivalPod", 20)}
            <span>远古琥珀基因复苏所</span>
            <span class="tag">印记苏醒 ${amberAura.awakenedCount}/${PRIMAL_IMPRINT_DEFS.length}（阶位 ${amberAura.totalLevels}/${amberAura.maxTotalLevels}）</span>
            <span class="tag">共鸣刻印 ${amberAura.equippedCount}/${PRIMAL_IMPRINT_DEFS.length}</span>
            <span class="tag tag--amber-stock">${renderResSvg("ancientGeneAmber", 14)}<span data-amber-stock="1">远古基因琥珀 ×${amberOwnedCount}</span></span>
          </div>
          <div class="row__desc">勘探地脉或凝炼秘境生态沙盘、冠军联盟殿堂特产获取「远古基因琥珀」，鉴定并升阶四大太古血脉印记（Lv.1~3）刻印至心仪伙伴；承载太古印记的伙伴自动享防放生保护，集齐四印更可唤醒「四太古血脉苏醒共鸣」，全面增幅全资源产出、个体潜能训练、捕获率、闪光奇遇率与回廊战力！</div>
        </div>
        <div class="row__right amber-revival-header__btns">
          <button type="button" class="btn btn--small${canClaimDailyAmber ? " btn--primary" : ""}" data-amber-claim-daily="1" ${canClaimDailyAmber ? "" : "disabled"}>${canClaimDailyAmber ? `每日地脉掘珀 +${AMBER_REVIVAL_DAILY_GRANT}` : "今日琥珀已掘"}</button>
          <button type="button" class="btn btn--small" data-amber-synth="eco" ${canSynthAmberEco ? "" : "disabled"} title="消耗调律薄荷×1 + 灵晶碎片×30 凝结 +4 远古基因琥珀">生态沙盘凝珀 (+4)</button>
          <button type="button" class="btn btn--small" data-amber-synth="league" ${canSynthAmberLeague ? "" : "disabled"} title="消耗闪光祈愿星砂×3 + 未来币×40 萃炼 +5 远古基因琥珀">殿堂星辉凝珀 (+5)</button>
          <button type="button" class="btn btn--small btn--ghost" data-func-toggle="amberRevival">${hideAmberRevival ? "展开" : "收起"}</button>
        </div>
      </div>
    `);

    if (!hideAmberRevival) {
      const selectedAmberMon =
        (amberRevival.selectedMonId ? list.find((m) => m && m.id === amberRevival.selectedMonId) : null) ||
        list[0] ||
        null;
      if (selectedAmberMon && amberRevival.selectedMonId !== selectedAmberMon.id) {
        amberRevival.selectedMonId = selectedAmberMon.id;
      }
      const selAmberImprint = selectedAmberMon ? getMonPrimalImprintBonus(state, selectedAmberMon.id) : null;
      const canRefineSelIv = selectedAmberMon ? canRefinePartnerIvWithAmber(state, selectedAmberMon.id) : false;

      const amberPartnerOptsHtml = list.length
        ? list
            .map((m) => {
              const mb = getMonPrimalImprintBonus(state, m.id);
              const ivSum = sumMonIv(m);
              return `<option value="${m.id}" ${selectedAmberMon?.id === m.id ? "selected" : ""}>Lv.${m.lvl || 1} ${escapeHtml(m.name)}（个体 ${ivSum}/186${mb.imprintName ? ` · ${escapeHtml(mb.imprintName)}Lv.${mb.imprintLevel}` : ""}）</option>`;
            })
            .join("")
        : `<option value="">暂无伙伴（先去捕获萌灵吧）</option>`;

      const formatAmberCostPills = (costObj) => {
        if (!costObj) return `<span class="tag">已臻满阶 Lv.${AMBER_IMPRINT_MAX_LEVEL}</span>`;
        const pills = [];
        for (const [rid, amt] of Object.entries(costObj.res || {})) {
          const have = Math.floor(Number(state.res?.[rid]?.value) || 0);
          const ok = have >= amt;
          pills.push(
            `<span class="camp-cost-pill ${ok ? "is-ok" : "is-lack"}">${renderResSvg(rid, 12)}<span>${escapeHtml(RES_LABEL_ZH[rid] || rid)} ${have}/${amt}</span></span>`,
          );
        }
        return pills.join("");
      };

      const imprintCardsHtml = PRIMAL_IMPRINT_DEFS.map((def) => {
        const entry = amberRevival.imprints[def.id] || { level: 0, equippedMonId: null };
        const curLvl = entry.level || 0;
        const wornMon = entry.equippedMonId ? list.find((m) => m && m.id === entry.equippedMonId) || null : null;
        const previewLvl = curLvl > 0 ? curLvl : 1;
        const b = def.bonusesByLevel[previewLvl] || {};
        const nextCost = getPrimalImprintNextCost(state, def.id);
        const canAwaken = canAwakenOrUpgradeImprint(state, def.id);
        const isWornBySelected = Boolean(wornMon && selectedAmberMon && wornMon.id === selectedAmberMon.id);

        return `
          <div class="amber-imprint-card ${curLvl > 0 ? "is-awakened" : ""} ${wornMon ? "is-equipped" : ""}">
            <div>
              <div class="row__title row__titleLine">
                ${renderUiIcon(def.icon, 24)}
                <span>${escapeHtml(def.name)}</span>
                <span class="tag">${curLvl > 0 ? `Lv.${curLvl}/${AMBER_IMPRINT_MAX_LEVEL}` : "待鉴定"}</span>
                <span class="tag">${escapeHtml(def.slotLabel)}</span>
              </div>
              <div class="row__desc" style="margin-top:4px">${escapeHtml(def.desc)}</div>
              <div class="row__desc" style="margin-top:5px;color:#fde68a">
                ${curLvl > 0 ? `当前 Lv.${curLvl} 血脉增益` : "Lv.1 苏醒预览"}：全产 +${Math.round((b.prodAdd || 0) * 100)}% · 潜能训练 +${Math.round((b.ivTrainAdd || 0) * 100)}% · 捕获 +${Math.round((b.catchAdd || 0) * 1000) / 10}% · 闪光 +${Math.round((b.shinyAdd || 0) * 100)}% · 战力 +${Math.round((b.combatAdd || 0) * 100)}%
              </div>
              <div class="row__desc" style="margin-top:4px">
                ${
                  wornMon
                    ? `刻印伙伴：<strong>${escapeHtml(wornMon.name)}</strong>（Lv.${wornMon.lvl || 1} · 太古印记共鸣保护生效）`
                    : curLvl > 0
                      ? "状态：陈列于琥珀复苏舱（复苏舱被动生效 45%，刻印至伙伴激活 100% 血脉威能）"
                      : "状态：沉睡琥珀原石，集齐远古基因琥珀即可唤醒太古血脉"
                }
              </div>
              <div class="camp-recipe-card__costs" style="margin-top:6px">${formatAmberCostPills(nextCost)}</div>
            </div>
            <div class="boutique-acc-card__foot">
              ${
                curLvl < AMBER_IMPRINT_MAX_LEVEL
                  ? `<button type="button" class="btn btn--small ${canAwaken ? "btn--primary" : ""}" data-amber-awaken="${escapeHtml(def.id)}" ${canAwaken ? "" : "disabled"}>${curLvl === 0 ? "鉴定苏醒 Lv.1" : `基因升阶 Lv.${curLvl + 1}`}</button>`
                  : `<button type="button" class="btn btn--small" disabled>满阶太古印记 Lv.3</button>`
              }
              ${
                curLvl > 0 && selectedAmberMon
                  ? `<button type="button" class="btn btn--small ${isWornBySelected ? "" : "btn--primary"}" data-amber-equip="${escapeHtml(def.id)}" ${isWornBySelected ? "disabled" : ""}>${isWornBySelected ? "当前刻印中" : `为 ${escapeHtml(selectedAmberMon.name)} 刻印`}</button>`
                  : ""
              }
              ${
                wornMon
                  ? `<button type="button" class="btn btn--small btn--ghost" data-amber-unequip="${escapeHtml(def.id)}">卸下归舱</button>`
                  : ""
              }
            </div>
          </div>
        `;
      }).join("");

      const amberLogsHtml =
        amberRevival.recentLogs.length > 0
          ? amberRevival.recentLogs.slice(0, 2).map((ln) => `<div class="camp-log-line">${escapeHtml(ln)}</div>`).join("")
          : `<div class="camp-log-line">今日可免费点击右上「每日地脉掘珀 +${AMBER_REVIVAL_DAILY_GRANT}」获取远古基因琥珀，苏醒四大太古血脉印记！</div>`;

      rows.push(`
        <div class="row amber-revival-body">
          <div class="row__left" style="width:100%">
            <div class="amber-aura-panel">
              <div class="amber-aura-panel__top">
                ${renderUiIcon("amberFossilGem", 18)}
                <strong>四太古血脉苏醒共鸣与基因潜能光环</strong>
                <span class="tag">${amberAura.quadResonanceActive ? "四太古血脉苏醒共鸣生效中" : `苏醒满 4 枚印记激活四太古血脉苏醒共鸣（${amberAura.awakenedCount}/4）`}</span>
                <span class="tag">受保护太古印记伙伴 ${amberAura.imprintedMonCount} 只</span>
              </div>
              <div class="eco-aura-strip">
                <span class="shiny-aura-pill ${amberAura.prodAdd > 0 ? "is-on" : ""}">全资源产出 +${Math.round(amberAura.prodAdd * 1000) / 10}%</span>
                <span class="shiny-aura-pill ${amberAura.ivTrainAdd > 0 ? "is-on" : ""}">个体潜能训练 +${Math.round(amberAura.ivTrainAdd * 1000) / 10}%</span>
                <span class="shiny-aura-pill ${amberAura.catchAdd > 0 ? "is-on" : ""}">全局捕获率 +${Math.round(amberAura.catchAdd * 1000) / 10}%</span>
                <span class="shiny-aura-pill ${amberAura.shinyAdd > 0 ? "is-on" : ""}">闪光奇遇率 +${Math.round(amberAura.shinyAdd * 1000) / 10}%</span>
                <span class="shiny-aura-pill ${amberAura.combatAdd > 0 ? "is-on" : ""}">PvE 回廊战力 +${Math.round(amberAura.combatAdd * 1000) / 10}%</span>
              </div>
            </div>

            <div class="amber-pod-bar">
              <div class="amber-pod-bar__left">
                ${selectedAmberMon ? renderBeastIcon(selectedAmberMon.dex, selectedAmberMon.name, Boolean(selectedAmberMon.isShiny)) : renderUiIcon("amberRevivalPod", 22)}
                <span class="tag">复苏舱目标伙伴</span>
                <select class="input" data-amber-target-mon="1" ${list.length ? "" : "disabled"}>${amberPartnerOptsHtml}</select>
                ${selectedAmberMon ? `<span class="tag" data-amber-sel-iv="1">个体总值 ${sumMonIv(selectedAmberMon)}/186</span>` : ""}
                ${
                  selAmberImprint?.imprinted
                    ? `<span class="badge badge--ok">已刻印「${escapeHtml(selAmberImprint.imprintName)} Lv.${selAmberImprint.imprintLevel}」· 太古印记共鸣保护生效</span>`
                    : `<span class="tag">尚未刻印太古血脉印记</span>`
                }
              </div>
              <div class="amber-pod-bar__right">
                <button type="button" class="btn btn--small ${canRefineSelIv ? "btn--primary" : ""}" data-amber-refine-iv="1" ${canRefineSelIv ? "" : "disabled"} title="消耗 ${AMBER_IV_REFINE_COST} 枚远古基因琥珀，立即提升目标伙伴最低单项个体值">琥珀潜能淬炼 (-${AMBER_IV_REFINE_COST}琥珀)</button>
                ${
                  selectedAmberMon && selAmberImprint?.imprinted
                    ? `<button type="button" class="btn btn--small btn--ghost" data-amber-clear-mon="${selectedAmberMon.id}">卸下伙伴印记</button>`
                    : ""
                }
              </div>
            </div>

            <div class="amber-imprint-grid">${imprintCardsHtml}</div>
            <div class="star-camp-logs" style="margin-top:8px">${amberLogsHtml}</div>
          </div>
        </div>
      `);
    }

    // ========== ML-7 Section A: 萌灵「星辉配饰流彩造型屋」(Starlight Accessory & Aurora Styling Boutique) ==========
    const hideStarBoutique = Boolean(ui.functionsHideStarBoutique);
    const canClaimDailySand = canClaimDailyStarSand(state);
    const canSynthGold = canSynthesizeStarSand(state, "gold");
    const canSynthHerb = canSynthesizeStarSand(state, "herb");

    rows.push(`
      <div class="row star-boutique-header">
        <div class="row__left">
          <div class="row__title row__titleLine">
            ${renderUiIcon("boutiqueMirrorStar", 20)}
            <span>星辉配饰流彩造型屋</span>
            <span class="tag">信物裁制 ${boutiqueAura.craftedCount}/${BOUTIQUE_ACCESSORY_DEFS.length}（阶位 ${boutiqueAura.totalLevels}/${boutiqueAura.maxTotalLevels}）</span>
            <span class="tag">穿戴中 ${boutiqueAura.equippedCount}/3</span>
            <span class="tag">极光流彩 ${boutiqueAura.unlockedSheenCount}/${BOUTIQUE_SHEEN_STYLES.length}</span>
            <span class="tag tag--sand-stock">${renderResSvg("shinyStarSand", 14)}<span data-bq-sand-stock="1">闪光祈愿星砂 ×${sandOwnedCount}</span></span>
          </div>
          <div class="row__desc">使用「闪光祈愿星砂」、野餐香草、星露灵果或未来币，为心爱伙伴裁制升阶三大星辉信物配饰（Lv.1~3）并调染极光流彩光晕；穿戴或染色中的伙伴自动纳入防放生保护，持续赋予亲密升温、全资源产出、训练经验、闪光祈愿与殿堂战力加成！</div>
        </div>
        <div class="row__right star-boutique-header__btns">
          <button type="button" class="btn btn--small${canClaimDailySand ? " btn--primary" : ""}" data-bq-claim-daily="1" ${canClaimDailySand ? "" : "disabled"}>${canClaimDailySand ? `每日星辉凝砂 +${STAR_BOUTIQUE_DAILY_SAND_GRANT}` : "今日星砂已领"}</button>
          <button type="button" class="btn btn--small" data-bq-synth="gold" ${canSynthGold ? "" : "disabled"} title="消耗 50 未来币凝炼 +4 闪光祈愿星砂">未来币凝砂 (+4)</button>
          <button type="button" class="btn btn--small" data-bq-synth="herb" ${canSynthHerb ? "" : "disabled"} title="消耗野餐香草×2 + 星露灵果×2 萃取 +5 闪光祈愿星砂">香草星露凝砂 (+5)</button>
          <button type="button" class="btn btn--small btn--ghost" data-func-toggle="starBoutique">${hideStarBoutique ? "展开" : "收起"}</button>
        </div>
      </div>
    `);

    if (!hideStarBoutique) {
      const selectedBoutiqueMon =
        (starBoutique.selectedMonId ? list.find((m) => m && m.id === starBoutique.selectedMonId) : null) ||
        list[0] ||
        null;
      if (selectedBoutiqueMon && starBoutique.selectedMonId !== selectedBoutiqueMon.id) {
        starBoutique.selectedMonId = selectedBoutiqueMon.id;
      }
      const selMonBonus = selectedBoutiqueMon ? getMonBoutiqueBonus(state, selectedBoutiqueMon.id) : null;

      const partnerOptsHtml = list.length
        ? list
            .map((m) => {
              const mb = getMonBoutiqueBonus(state, m.id);
              const badgeTxt = [
                mb.accessoryName ? `${mb.accessoryName}Lv.${mb.accessoryLevel}` : "",
                mb.sheenName || "",
              ]
                .filter(Boolean)
                .join(" · ");
              return `<option value="${m.id}" ${selectedBoutiqueMon?.id === m.id ? "selected" : ""}>Lv.${m.lvl || 1} ${escapeHtml(m.name)}${badgeTxt ? `（${escapeHtml(badgeTxt)}）` : ""}</option>`;
            })
            .join("")
        : `<option value="">暂无伙伴（先去捕获萌灵吧）</option>`;

      const formatBoutiqueCostPills = (costObj) => {
        if (!costObj) return `<span class="tag">已臻满阶 Lv.${STAR_BOUTIQUE_MAX_LEVEL}</span>`;
        const pills = [];
        for (const [rid, amt] of Object.entries(costObj.res || {})) {
          const have = Math.floor(Number(state.res?.[rid]?.value) || 0);
          const ok = have >= amt;
          pills.push(
            `<span class="camp-cost-pill ${ok ? "is-ok" : "is-lack"}">${renderResSvg(rid, 12)}<span>${escapeHtml(RES_LABEL_ZH[rid] || rid)} ${have}/${amt}</span></span>`,
          );
        }
        for (const [pid, amt] of Object.entries(costObj.pantry || {})) {
          const have = Math.floor(Number(starCamp.pantry?.[pid]) || 0);
          const ok = have >= amt;
          pills.push(
            `<span class="camp-cost-pill ${ok ? "is-ok" : "is-lack"}">${renderResSvg(pid, 12)}<span>${escapeHtml(RES_LABEL_ZH[pid] || pid)} ${have}/${amt}</span></span>`,
          );
        }
        return pills.join("");
      };

      const accessoryCardsHtml = BOUTIQUE_ACCESSORY_DEFS.map((def) => {
        const entry = starBoutique.accessories[def.id] || { level: 0, equippedMonId: null };
        const curLvl = entry.level || 0;
        const wornMon = entry.equippedMonId ? list.find((m) => m && m.id === entry.equippedMonId) || null : null;
        const previewLvl = curLvl > 0 ? curLvl : 1;
        const b = def.bonusesByLevel[previewLvl] || {};
        const nextCost = getAccessoryNextCost(state, def.id);
        const canCraft = canCraftOrUpgradeAccessory(state, def.id);
        const isWornBySelected = Boolean(wornMon && selectedBoutiqueMon && wornMon.id === selectedBoutiqueMon.id);

        return `
          <div class="boutique-acc-card ${curLvl > 0 ? "is-crafted" : ""} ${wornMon ? "is-equipped" : ""}">
            <div>
              <div class="row__title row__titleLine">
                ${renderUiIcon(def.icon, 24)}
                <span>${escapeHtml(def.name)}</span>
                <span class="tag">${curLvl > 0 ? `Lv.${curLvl}/${STAR_BOUTIQUE_MAX_LEVEL}` : "待裁制"}</span>
                <span class="tag">${escapeHtml(def.slotLabel)}</span>
              </div>
              <div class="row__desc" style="margin-top:4px">${escapeHtml(def.desc)}</div>
              <div class="row__desc" style="margin-top:5px;color:#fde68a">
                ${curLvl > 0 ? `当前 Lv.${curLvl} 增益` : "Lv.1 裁制预览"}：全产 +${Math.round((b.prodAdd || 0) * 100)}% · 亲密 +${Math.round((b.affGainAdd || 0) * 100)}% · 训练 +${Math.round((b.trainExpAdd || 0) * 100)}% · 闪光 +${Math.round((b.shinyAdd || 0) * 100)}% · 战力 +${Math.round((b.combatAdd || 0) * 100)}%
              </div>
              <div class="row__desc" style="margin-top:4px">
                ${
                  wornMon
                    ? `穿戴伙伴：<strong>${escapeHtml(wornMon.name)}</strong>（Lv.${wornMon.lvl || 1} · 造型配饰穿戴中保护生效）`
                    : curLvl > 0
                      ? "状态：陈列于星辉展柜（展柜被动生效 40%，穿戴后激活 100% 辉光）"
                      : "状态：尚未裁制，集齐星砂即可打造信物"
                }
              </div>
              <div class="camp-recipe-card__costs" style="margin-top:6px">${formatBoutiqueCostPills(nextCost)}</div>
            </div>
            <div class="boutique-acc-card__foot">
              ${
                curLvl < STAR_BOUTIQUE_MAX_LEVEL
                  ? `<button type="button" class="btn btn--small ${canCraft ? "btn--primary" : ""}" data-bq-craft="${escapeHtml(def.id)}" ${canCraft ? "" : "disabled"}>${curLvl === 0 ? "星砂裁制 Lv.1" : `升阶至 Lv.${curLvl + 1}`}</button>`
                  : `<button type="button" class="btn btn--small" disabled>满阶信物 Lv.3</button>`
              }
              ${
                curLvl > 0 && selectedBoutiqueMon
                  ? `<button type="button" class="btn btn--small ${isWornBySelected ? "" : "btn--primary"}" data-bq-equip="${escapeHtml(def.id)}" ${isWornBySelected ? "disabled" : ""}>${isWornBySelected ? "当前穿戴中" : `为 ${escapeHtml(selectedBoutiqueMon.name)} 穿戴`}</button>`
                  : ""
              }
              ${
                wornMon
                  ? `<button type="button" class="btn btn--small btn--ghost" data-bq-unequip="${escapeHtml(def.id)}">卸下收纳</button>`
                  : ""
              }
            </div>
          </div>
        `;
      }).join("");

      const sheenCardsHtml = BOUTIQUE_SHEEN_STYLES.map((sDef) => {
        const unlocked = starBoutique.unlockedSheens.includes(sDef.id);
        const activeOnSel = Boolean(
          selectedBoutiqueMon && starBoutique.sheenByMon[String(selectedBoutiqueMon.id)] === sDef.id,
        );
        const canAffordUnlock = unlocked || sandOwnedCount >= sDef.unlockCostSand;
        return `
          <div class="boutique-sheen-card ${unlocked ? "is-unlocked" : ""} ${activeOnSel ? "is-active" : ""}">
            <div>
              <div class="row__title row__titleLine">
                ${renderUiIcon("boutiqueMirrorStar", 18)}
                <span>${escapeHtml(sDef.name)}</span>
                <span class="tag">${activeOnSel ? "穿戴生效" : unlocked ? "已解锁" : `${sDef.unlockCostSand} 星砂`}</span>
              </div>
              <div class="row__desc" style="margin-top:4px">${escapeHtml(sDef.desc)}</div>
            </div>
            <div class="boutique-acc-card__foot">
              <button
                type="button"
                class="btn btn--small ${!activeOnSel && canAffordUnlock ? "btn--primary" : ""}"
                data-bq-sheen="${escapeHtml(sDef.id)}"
                ${activeOnSel || !canAffordUnlock || (!selectedBoutiqueMon && unlocked) ? "disabled" : ""}
              >${
                activeOnSel
                  ? "当前流彩生效"
                  : unlocked
                    ? selectedBoutiqueMon
                      ? `为 ${escapeHtml(selectedBoutiqueMon.name)} 调染`
                      : "需先拥有伙伴"
                    : canAffordUnlock
                      ? `解锁调染 (-${sDef.unlockCostSand}星砂)`
                      : `需 ${sDef.unlockCostSand} 星砂`
              }</button>
            </div>
          </div>
        `;
      }).join("");

      const bqLogsHtml =
        starBoutique.recentLogs.length > 0
          ? starBoutique.recentLogs.slice(0, 2).map((ln) => `<div class="camp-log-line">${escapeHtml(ln)}</div>`).join("")
          : `<div class="camp-log-line is-muted">点击右上「每日星辉凝砂 +${STAR_BOUTIQUE_DAILY_SAND_GRANT}」免费领取星砂，即可立即为心仪伙伴裁制第一件星辉配饰！</div>`;

      rows.push(`
        <div class="row star-boutique-body">
          <div class="row__left" style="width:100%">
            <div class="boutique-aura-panel">
              <div class="boutique-aura-panel__top">
                ${renderUiIcon("boutiqueMirrorStar", 18)}
                <strong>星辉梳妆台全局辉光</strong>
                <span class="tag">${boutiqueAura.trioSetActive ? "三星辉套装共鸣生效中" : `穿戴满 3 件激活三星辉套装共鸣（${boutiqueAura.equippedCount}/3）`}</span>
                <span class="tag">受保护造型伙伴 ${boutiqueAura.styledMonCount} 只</span>
              </div>
              <div class="eco-aura-strip">
                <span class="shiny-aura-pill ${boutiqueAura.prodAdd > 0 ? "is-on" : ""}">全资源产出 +${Math.round(boutiqueAura.prodAdd * 1000) / 10}%</span>
                <span class="shiny-aura-pill ${boutiqueAura.affGainAdd > 0 ? "is-on" : ""}">亲密升温 +${Math.round(boutiqueAura.affGainAdd * 1000) / 10}%</span>
                <span class="shiny-aura-pill ${boutiqueAura.trainExpAdd > 0 ? "is-on" : ""}">训练经验 +${Math.round(boutiqueAura.trainExpAdd * 1000) / 10}%</span>
                <span class="shiny-aura-pill ${boutiqueAura.shinyAdd > 0 ? "is-on" : ""}">闪光祈愿气运 +${Math.round(boutiqueAura.shinyAdd * 1000) / 10}%</span>
                <span class="shiny-aura-pill ${boutiqueAura.combatAdd > 0 ? "is-on" : ""}">殿堂战力辉光 +${Math.round(boutiqueAura.combatAdd * 1000) / 10}%</span>
                ${boutiqueAura.catchAdd > 0 ? `<span class="shiny-aura-pill is-on">全局捕获率 +${Math.round(boutiqueAura.catchAdd * 1000) / 10}%</span>` : ""}
              </div>
            </div>

            <div class="boutique-dresser-bar">
              <div class="boutique-dresser-bar__left">
                ${selectedBoutiqueMon ? renderBeastIcon(selectedBoutiqueMon.dex, selectedBoutiqueMon.name, Boolean(selectedBoutiqueMon.isShiny)) : renderUiIcon("boutiqueMirrorStar", 22)}
                <label style="font-size:12px;font-weight:600">梳妆模特伙伴：</label>
                <select class="input" data-boutique-target-mon="1" ${list.length ? "" : "disabled"}>${partnerOptsHtml}</select>
                ${
                  selMonBonus?.styled
                    ? `<span class="tag tag--hof-ribbon">造型配饰穿戴中保护 · 战力+${Math.round(selMonBonus.combatAdd * 100)}% / 亲密+${Math.round(selMonBonus.affGainAdd * 100)}%</span>`
                    : `<span class="tag">未穿戴专属配饰</span>`
                }
              </div>
              <div class="boutique-dresser-bar__right">
                ${
                  selectedBoutiqueMon && selMonBonus?.styled
                    ? `<button type="button" class="btn btn--small btn--ghost" data-bq-clear-mon="${selectedBoutiqueMon.id}">卸下该伙伴全部装扮</button>`
                    : ""
                }
              </div>
            </div>

            <div class="boutique-acc-grid">${accessoryCardsHtml}</div>

            <div class="boutique-sheen-section">
              <div class="row__title row__titleLine">
                ${renderUiIcon("boutiqueMirrorStar", 18)}
                <span>极光流彩染色光晕坊</span>
                <span class="tag">最多同时为 3 只伙伴调染流彩光晕</span>
              </div>
              <div class="boutique-sheen-grid">${sheenCardsHtml}</div>
            </div>

            <div class="star-camp-logs" style="margin-top:8px">${bqLogsHtml}</div>
          </div>
        </div>
      `);
    }

    // ========== ML-7 Section B: 萌灵「冠军联盟四天王殿堂赛」(Champion League Elite Four & Grand Champion Gauntlet) ==========
    const hideChampionLeague = Boolean(ui.functionsHideChampionLeague);
    const resolveLeagueTypes = (m) =>
      Array.isArray(m?.types) && m.types.length ? m.types : getBeastDataByDex?.(m?.dex)?.types || ["wind"];
    if (champLeague.squadIds.length === 0 && list.length > 0) {
      autofillChampionLeagueSquad(state, resolveLeagueTypes, monPower);
    }
    const leagueSquadMons = champLeague.squadIds
      .map((id) => list.find((m) => m && m.id === id) || null)
      .filter(Boolean);
    // ML-15 统一忙碌排除：已在冠军小队里的外出 / 驻场伙伴本场不出战（读外出登记表），手动编入也会被拒绝
    const funcLeagueAway = getAwayActivityMap(state);
    const leagueReadyMons = leagueSquadMons.filter((m) => !funcLeagueAway.has(m.id));
    const leagueSynergy = evaluateLeagueSquadSynergy(state, leagueReadyMons, {
      getMonTypes: resolveLeagueTypes,
      getBeastDataByDex,
    });
    let funcLeagueModalHtml = "";

    rows.push(`
      <div class="row champion-league-header">
        <div class="row__left">
          <div class="row__title row__titleLine">
            ${renderUiIcon("leagueEliteCrest", 20)}
            <span>冠军联盟四天王殿堂赛</span>
            <span class="tag tag--hof-ribbon">${renderUiIcon("leagueChampionRibbon", 14)}<span>殿堂阶位 Tier ${leagueBonus.hallOfFameTier}/${CHAMPION_LEAGUE_MAX_TIER}</span></span>
            <span class="tag">累计登顶 ${leagueBonus.championClears} 次</span>
            <span class="tag">当前驻殿 ${champLeague.activeStageIdx + 1}/${CHAMPION_LEAGUE_STAGES.length}</span>
          </div>
          <div class="row__desc">选派 3 只精锐伙伴组成冠军小队，连续迎战「炎狱天王 → 沧溟天王 → 翠岚天王 → 星穹天王 → 圣殿总冠军」五重巅峰试炼！全面汇聚【元素双灵羁绊 + 薄荷性格调律 + 星营料理盛宴 + 星辉造型配饰】四维共鸣，赢取「闪光祈愿星砂」、参战伙伴永久「冠军殿堂绶带」与全局殿堂阶位加成！</div>
        </div>
        <div class="row__right league-header__btns">
          <button type="button" class="btn btn--small" data-func-league-auto="1" ${list.length > 0 ? "" : "disabled"}>一键优选三灵</button>
          <button type="button" class="btn btn--small" data-func-league-open-modal="1" ${list.length > 0 ? "" : "disabled"}>编排阵容 (${leagueSquadMons.length}/${CHAMPION_LEAGUE_SQUAD_SIZE})</button>
          <button type="button" class="btn btn--small" data-func-league-fight="single" ${leagueReadyMons.length > 0 ? "" : "disabled"}>逐殿挑战（第 ${champLeague.activeStageIdx + 1} 殿）</button>
          <button type="button" class="btn btn--small btn--primary" data-func-league-fight="full" ${leagueReadyMons.length > 0 ? "" : "disabled"}>五连战冲击总冠军</button>
          <button type="button" class="btn btn--small btn--ghost" data-func-toggle="championLeague">${hideChampionLeague ? "展开" : "收起"}</button>
        </div>
      </div>
    `);

    if (!hideChampionLeague) {
      const roleLabels = ["先锋主将", "中坚奇兵", "压阵王牌"];
      const benchHtml = [0, 1, 2]
        .map((slotIdx) => {
          const m = leagueSquadMons[slotIdx] || null;
          if (!m) {
            return `
              <div class="league-squad-slot is-empty">
                <div class="row__title row__titleLine"><span class="tag">${roleLabels[slotIdx]}</span><span>待选派伙伴</span></div>
                <div class="row__desc" style="margin-top:4px">点击「编排阵容」或「一键优选三灵」上阵伙伴</div>
              </div>
            `;
          }
          const mTypes = resolveLeagueTypes(m)
            .map((t) => `<span class="badge type type-${escapeHtml(t)}">${escapeHtml(TYPE_ZH?.[t] || t)}</span>`)
            .join("");
          const bq = getMonBoutiqueBonus(state, m.id);
          const ribbons = Math.max(0, Math.floor(Number(m.hallOfFameRibbons) || 0));
          const lgAwayAct = funcLeagueAway.get(m.id) || null;
          return `
            <div class="league-squad-slot ${lgAwayAct ? "is-at-sea" : ""}" data-func-league-slot="${m.id}">
              <div class="row__title row__titleLine">
                <span class="tag">${roleLabels[slotIdx]}</span>
                ${lgAwayAct ? `<span class="tag tag--dock-bottle">${escapeHtml(lgAwayAct.label)} · 本场不出战</span>` : ""}
                ${renderBeastIcon(m.dex, m.name, Boolean(m.isShiny))}
                <span>${escapeHtml(m.name)}</span>
                <span class="tag">Lv.${m.lvl || 1}</span>
                ${ribbons > 0 ? `<span class="tag tag--hof-ribbon">${renderUiIcon("leagueChampionRibbon", 13)}<span>绶带×${ribbons}</span></span>` : ""}
              </div>
              <div class="row__desc" style="margin-top:4px">
                ${mTypes} 战力 ${Math.floor(monPower(m))}${bq.styled ? ` · 穿戴加成 +${Math.round(bq.combatAdd * 100)}%` : ""}${normalizeMintTuning(m.mintTuning) ? " · 已调律" : ""}
              </div>
            </div>
          `;
        })
        .join("");

      const stageTrackHtml = CHAMPION_LEAGUE_STAGES.map((stg, idx) => {
        const cInfo = champLeague.clearedStages[stg.id] || null;
        const isActive = champLeague.activeStageIdx === idx;
        const enemyIcons = stg.enemies.map((e) => renderBeastIcon(e.dex, e.name, false)).join("");
        const elemText = stg.elements.map((el) => TYPE_ZH?.[el] || el).join("/");
        const estPower = estimateLeagueStagePower(stg);
        const rwSand = cInfo ? stg.repeatRewards.shinyStarSand : stg.firstRewards.shinyStarSand;
        return `
          <div class="league-stage-node ${isActive ? "is-active" : ""} ${cInfo ? "is-cleared" : ""} ${stg.isChampion ? "is-champion" : ""}">
            <div>
              <div class="row__title row__titleLine">
                ${renderUiIcon(stg.isChampion ? "leagueChampionRibbon" : "leagueEliteCrest", 16)}
                <span>${stg.order}. ${escapeHtml(stg.shortTitle)}</span>
              </div>
              <div class="row__desc" style="margin-top:2px">${escapeHtml(stg.masterTitle)}（${escapeHtml(elemText)}）</div>
              <div class="league-stage-node__icons" style="margin-top:5px">${enemyIcons}</div>
            </div>
            <div>
              <div class="row__desc">推荐战力 ${estPower} · ${cInfo ? `重复星砂+${rwSand}` : `首通星砂+${rwSand}`}</div>
              <div style="margin-top:4px">
                ${
                  cInfo
                    ? `<span class="badge badge--ok">已攻克 · ${cInfo.stars}星（累计 ${cInfo.clears} 次）</span>`
                    : isActive
                      ? `<span class="tag">当前驻殿目标</span>`
                      : `<span class="tag">连战待突破</span>`
                }
              </div>
            </div>
          </div>
        `;
      }).join("");

      const lastRun = champLeague.lastRunSummary;
      const lastRunText = lastRun
        ? lastRun.championCleared
          ? `最近战报：成功连破五殿荣登总冠军（共 ${lastRun.totalRounds} 回合 · 获闪光祈愿星砂 +${lastRun.rewardsEarned?.shinyStarSand || 0} · 殿堂阶位 Tier ${lastRun.hallOfFameTier}）`
          : lastRun.stoppedTitle
            ? `最近战报：连闯 ${lastRun.stagesCleared} 殿后止步于【${lastRun.stoppedTitle}】（获闪光祈愿星砂 +${lastRun.rewardsEarned?.shinyStarSand || 0}）`
            : `最近战报：已攻克 ${lastRun.stagesCleared} 殿（获闪光祈愿星砂 +${lastRun.rewardsEarned?.shinyStarSand || 0}）`
        : "尚未发起殿堂挑战：集结元素羁绊、薄荷调律、露营盛宴与星辉配饰，向四天王与圣殿总冠军发起冲击吧！";

      const latestHof = champLeague.hallOfFameRecords[0] || null;
      const hofLine = latestHof
        ? `最新殿堂留名（Tier ${latestHof.tier}）：${latestHof.squad.map((s) => `${s.name} Lv.${s.lvl}（绶带×${s.ribbons}）`).join(" · ")}`
        : "冠军殿堂荣誉墙：首次击败第 5 殿「圣殿总冠军 · 曜宸」即可为参战三灵刻印专属【冠军殿堂绶带】！";

      rows.push(`
        <div class="row champion-league-body">
          <div class="row__left" style="width:100%">
            <div class="league-aura-panel">
              <div class="league-aura-panel__top">
                ${renderUiIcon("leagueChampionRibbon", 18)}
                <strong>四维巅峰共鸣与冠军殿堂全局辉光</strong>
                <span class="tag">小队总增伤 +${Math.round(leagueSynergy.totalOutAdd * 100)}% · 减伤 ${Math.round((1 - leagueSynergy.incomingDamageMul) * 100)}% · 殿间休整回复 ${Math.round(leagueSynergy.interStageHealPct * 100)}%</span>
                ${champLeague.activeStageIdx > 0 ? `<button type="button" class="btn btn--small btn--ghost" data-func-league-reset="1">重置至第 1 殿</button>` : ""}
              </div>
              <div class="eco-aura-strip">
                <span class="shiny-aura-pill ${leagueSynergy.bondOutAdd > 0 ? "is-on" : ""}">元素羁绊共鸣 +${Math.round(leagueSynergy.bondOutAdd * 100)}%</span>
                <span class="shiny-aura-pill ${leagueSynergy.tuningOutAdd > 0 ? "is-on" : ""}">薄荷调律加成 +${Math.round(leagueSynergy.tuningOutAdd * 100)}%（已调律 ${leagueSynergy.tunedCount}/3）</span>
                <span class="shiny-aura-pill ${leagueSynergy.campOutAdd > 0 ? "is-on" : ""}">星营料理盛宴 +${Math.round(leagueSynergy.campOutAdd * 100)}%</span>
                <span class="shiny-aura-pill ${leagueSynergy.boutiqueOutAdd > 0 ? "is-on" : ""}">星辉造型配饰 +${Math.round(leagueSynergy.boutiqueOutAdd * 100)}%（穿戴 ${leagueSynergy.squadStyledCount}/3）</span>
                <span class="shiny-aura-pill ${leagueBonus.hallOfFameTier > 0 ? "is-on" : ""}">殿堂 Tier ${leagueBonus.hallOfFameTier} 全局：全产 +${Math.round(leagueBonus.prodAdd * 100)}% · 捕获 +${Math.round(leagueBonus.catchAdd * 1000) / 10}% · 增伤 +${Math.round(leagueBonus.pveOutAdd * 100)}%</span>
              </div>
            </div>

            <div class="league-squad-bench">${benchHtml}</div>
            <div class="league-stages-track">${stageTrackHtml}</div>

            <div class="league-hof-wall">
              <div>${escapeHtml(hofLine)}</div>
              <div style="margin-top:3px;opacity:0.88">${escapeHtml(lastRunText)}</div>
            </div>
          </div>
        </div>
      `);

      if (ui.funcLeagueModalOpen) {
        const modalCandidates = list
          .slice()
          .sort((a, b) => {
            const aIn = champLeague.squadIds.includes(a.id) ? 1 : 0;
            const bIn = champLeague.squadIds.includes(b.id) ? 1 : 0;
            if (aIn !== bIn) return bIn - aIn;
            return monPower(b) - monPower(a);
          });
        const modalRows = modalCandidates
          .map((m) => {
            const checked = champLeague.squadIds.includes(m.id);
            const lgAway = funcLeagueAway.get(m.id) || null;
            const disableAdd = !checked && (champLeague.squadIds.length >= CHAMPION_LEAGUE_SQUAD_SIZE || Boolean(lgAway));
            const mTypes = resolveLeagueTypes(m)
              .map((t) => `<span class="badge type type-${escapeHtml(t)}">${escapeHtml(TYPE_ZH?.[t] || t)}</span>`)
              .join("");
            const bq = getMonBoutiqueBonus(state, m.id);
            const ribbons = Math.max(0, Math.floor(Number(m.hallOfFameRibbons) || 0));
            return `
              <label class="modalPick ${checked ? "is-checked" : ""}">
                <input type="checkbox" data-func-league-check="${m.id}" ${checked ? "checked" : ""} ${disableAdd ? "disabled" : ""} />
                ${renderBeastIcon(m.dex, m.name, Boolean(m.isShiny))}
                <div class="modalPick__main">
                  <div class="modalPick__title">${escapeHtml(m.name)} <span class="tag">Lv.${m.lvl || 1}</span> ${mTypes} ${ribbons > 0 ? `<span class="tag tag--hof-ribbon">殿堂绶带×${ribbons}</span>` : ""}${lgAway ? ` <span class="tag tag--dock-bottle">${escapeHtml(lgAway.label)}${checked ? " · 本场不出战" : ""}</span>` : ""}</div>
                  <div class="modalPick__sub">战力 ${Math.floor(monPower(m))}${bq.styled ? ` · 星辉配饰增幅 +${Math.round(bq.combatAdd * 100)}%` : ""}${normalizeMintTuning(m.mintTuning) ? " · 已薄荷调律" : ""}</div>
                </div>
              </label>
            `;
          })
          .join("");

        funcLeagueModalHtml = `
          <div class="modalOverlay" data-func-league-modal-overlay="1">
            <div class="modal" role="dialog" aria-modal="true" aria-label="冠军联盟三灵小队编排">
              <div class="modal__head">
                <div class="modal__title">${renderUiIcon("leagueEliteCrest", 20)} <span>冠军联盟三灵编队（${champLeague.squadIds.length}/${CHAMPION_LEAGUE_SQUAD_SIZE}）</span></div>
                <div class="modal__headActions">
                  <button type="button" class="btn btn--small" data-func-league-auto="1">一键优选三灵</button>
                  <button type="button" class="btn btn--small" data-func-league-modal-close="1">关闭</button>
                </div>
              </div>
              <div class="modal__desc">选派最多 3 只伙伴出征四天王殿堂赛（出征席位自动受防放生保护；搭配元素双灵共鸣、薄荷调律与星辉配饰可获巨额连战增幅）。外出中的伙伴（烘焙、气球旅行、垂钓、入梦、泡汤、送信等）不能编入，已在队中的外出伙伴本场不出战。</div>
              <div class="modal__body">${modalRows || '<div class="muted" style="padding:12px">暂无可编入伙伴。</div>'}</div>
              <div class="actions">
                <button type="button" class="btn btn--primary" data-func-league-modal-close="1">完成冠军编队</button>
              </div>
            </div>
          </div>
        `;
      }
    }

    // ========== ML-6: 萌灵「星界羁绊露营野餐屋」与料理食谱风味增益工坊 ==========
    const hideStarCamp = Boolean(ui.functionsHideStarCamp);
    const ensembleLeft = getStarCampEnsembleLeft(state);
    const campCandidates = getAvailableStarCampCandidates(state);
    const canAutoFillCamp = campCandidates.length > 0;
    const canEnsemble = starCampAura.stationedCount > 0 && ensembleLeft > 0;
    let starCampModalHtml = "";

    rows.push(`
      <div class="row star-camp-header">
        <div class="row__left">
          <div class="row__title row__titleLine">
            ${renderUiIcon("campTentStar", 20)}
            <span>星界羁绊露营野餐屋</span>
            <span class="tag tag--camp-lvl">营地 Lv.${starCamp.level}/${STAR_CAMP_MAX_LEVEL}（${starCamp.exp}/${starCampAura.expNeed}）</span>
            <span class="tag">驻营 ${starCampAura.stationedCount}/${STAR_CAMP_MAX_SLOTS}</span>
            <span class="tag">食谱图鉴 ${starCampAura.codexCount}/${starCampAura.totalRecipes}</span>
            <span class="tag tag--camp-pantry">${renderResSvg("picnicHerb", 13)}<span>野餐香草 ×${starCamp.pantry.picnicHerb}</span></span>
            <span class="tag tag--camp-pantry">${renderResSvg("starBerry", 13)}<span>星露灵果 ×${starCamp.pantry.starBerry}</span></span>
            <span class="tag tag--camp-pantry">${renderResSvg("campToken", 13)}<span>星营徽章 ×${starCamp.pantry.campToken}</span></span>
          </div>
          <div class="row__desc">邀请 1~4 只伙伴围坐星光篝火（自动纳入防放生保护且支持随时换班），持续累积亲密度、营地经验与野餐食材；每日开启「营火合奏互动」并在铜锅工坊烹制六大风味料理，为全营赋予强力盛宴增益！</div>
        </div>
        <div class="row__right star-camp-header__btns">
          <button type="button" class="btn btn--small btn--primary" data-camp-autofill="1" ${canAutoFillCamp ? "" : "disabled"}>一键温馨入驻</button>
          <button type="button" class="btn btn--small" data-camp-open-squad="1">更换驻营 (${starCampAura.stationedCount}/${STAR_CAMP_MAX_SLOTS})</button>
          <button type="button" class="btn btn--small${canEnsemble ? " btn--primary" : ""}" data-camp-ensemble="1" ${canEnsemble ? "" : "disabled"}>营火合奏（${ensembleLeft}/${STAR_CAMP_DAILY_ENSEMBLE_LIMIT}）</button>
          <button type="button" class="btn btn--small btn--ghost" data-func-toggle="starCamp">${hideStarCamp ? "展开" : "收起"}</button>
        </div>
      </div>
    `);

    if (!hideStarCamp) {
      const stationedMons = starCamp.stationedIds
        .map((id) => list.find((m) => m && m.id === id) ?? null)
        .filter(Boolean);

      const campForagePct =
        stationedMons.length > 0
          ? Math.max(2, Math.min(99, Math.round(((starCamp.forageCarrySec || 0) / STAR_CAMP_FORAGE_CYCLE_SEC) * 100)))
          : 0;
      const campForageRemSec =
        stationedMons.length > 0
          ? Math.max(1, Math.ceil((STAR_CAMP_FORAGE_CYCLE_SEC - (starCamp.forageCarrySec || 0)) / Math.max(1, starCampAura.campSpeedMul || 1)))
          : STAR_CAMP_FORAGE_CYCLE_SEC;

      const campSlotsHtml = Array.from({ length: STAR_CAMP_MAX_SLOTS }, (_, idx) => {
        const mon = stationedMons[idx];
        if (!mon) {
          return `
            <div class="camp-companion-slot is-empty">
              <div class="camp-companion-slot__emptyHead">
                ${renderUiIcon("campTentStar", 20)}
                <span>星火营席 ${idx + 1}</span>
              </div>
              <div class="camp-companion-slot__emptyHint">虚席以待 · 入驻享防放生保护</div>
              <button type="button" class="btn btn--small" data-camp-open-squad="1" ${canAutoFillCamp ? "" : "disabled"}>邀请入驻</button>
            </div>
          `;
        }
        const mTypes = (Array.isArray(mon.types) && mon.types.length ? mon.types : getBeastDataByDex?.(mon.dex)?.types || []).slice(0, 2);
        const typePills = mTypes
          .map((t) => `<span class="badge type type-${escapeHtml(t)}">${escapeHtml(TYPE_ZH?.[t] ?? t)}</span>`)
          .join("");
        const natZh = getNatureInfo(mon.nature)?.name || "纯真";
        const affVal = Math.min(100, Math.max(0, Math.floor(Number(mon.affection) || 0)));
        return `
          <div class="camp-companion-slot is-filled">
            <div class="camp-companion-slot__top">
              ${renderBeastIcon(mon.dex, mon.name, Boolean(mon.isShiny))}
              <div class="camp-companion-slot__info">
                <div class="camp-companion-slot__nameRow">
                  <span class="camp-companion-slot__name">${escapeHtml(mon.name)}</span>
                  <span class="tag">Lv.${mon.lvl}</span>
                </div>
                <div class="camp-companion-slot__types">${typePills}<span class="camp-companion-slot__nat">${escapeHtml(natZh)}</span></div>
              </div>
            </div>
            <div class="camp-companion-slot__bondBar">
              <div class="camp-companion-slot__bondTrack"><i style="width:${affVal}%"></i></div>
              <div class="camp-companion-slot__bondMeta">
                <span>亲密 ${affVal}/100</span>
                <span class="camp-protect-badge">防放生保护</span>
                <button type="button" class="btn btn--small btn--ghost camp-slot-remove-btn" data-camp-toggle-mon="${mon.id}" title="结束驻营休息">移出</button>
              </div>
            </div>
          </div>
        `;
      }).join("");

      const activeFeastsHtml =
        starCampAura.activeFeasts.length > 0
          ? starCampAura.activeFeasts
              .map((f) => {
                const pct = Math.max(2, Math.min(100, Math.round(((f.remainingSec || 0) / Math.max(1, f.totalSec || 1800)) * 100)));
                return `
                  <div class="camp-feast-chip">
                    <div class="camp-feast-chip__head">
                      ${renderUiIcon(f.icon, 22)}
                      <span class="camp-feast-chip__name">${escapeHtml(f.name)}</span>
                      <span class="tag">${f.stars}星风味</span>
                      <span class="camp-feast-chip__timer" data-camp-feast-rem="${escapeHtml(f.recipeId)}">${escapeHtml(fmtDuration(Math.ceil(f.remainingSec || 0)))}</span>
                    </div>
                    <div class="camp-feast-chip__bar"><i data-camp-feast-fill="${escapeHtml(f.recipeId)}" style="width:${pct}%"></i></div>
                  </div>
                `;
              })
              .join("")
          : `<div class="camp-feast-empty">${renderUiIcon("campPicnicBasket", 18)}<span>当前野餐桌暂无生效料理 — 在下方铜锅工坊选择食谱开火烹制，即可为全营呈上风味盛宴增益！</span></div>`;

      const formatRecipeBuffs = (def, scale = 1) => {
        const b = def.buffs || {};
        const out = [];
        if (b.prodAdd) out.push(`全资源产出 +${Math.round(b.prodAdd * scale * 1000) / 10}%`);
        if (b.trainExpAdd) out.push(`训练经验 +${Math.round(b.trainExpAdd * scale * 1000) / 10}%`);
        if (b.catchAdd) out.push(`全局捕获率 +${Math.round(b.catchAdd * scale * 1000) / 10}%`);
        if (b.ecoAffinityAdd) out.push(`沙盘契合 +${Math.round(b.ecoAffinityAdd * scale * 100) / 100}`);
        if (b.ecoYieldAdd) out.push(`沙盘收获 +${Math.round(b.ecoYieldAdd * scale * 1000) / 10}%`);
        if (b.pveComboAdd) out.push(`试炼与双打连携 +${Math.round(b.pveComboAdd * scale * 1000) / 10}%`);
        return out;
      };

      const recipeCardsHtml = CAMP_RECIPE_DEFS.map((rDef) => {
        const cooks = starCamp.recipes[rDef.id]?.cooks || 0;
        const mInfo = getRecipeMasteryInfo(cooks);
        const effScale = mInfo.discovered ? mInfo.potencyMul : 1;
        const effDurSec = Math.round(rDef.durationSec * (mInfo.discovered ? mInfo.durationMul : 1));
        const affordable = canAffordCampRecipe(state, rDef.id);
        const isActiveFeast = starCampAura.activeFeasts.some((f) => f.recipeId === rDef.id);

        const costBits = [];
        for (const [rid, need] of Object.entries(rDef.costRes || {})) {
          const have = Math.max(0, Math.floor(Number(state.res?.[rid]?.value) || 0));
          const ok = have >= need;
          costBits.push(
            `<span class="camp-cost-pill ${ok ? "is-ok" : "is-lack"}">${renderResSvg(rid, 13)}<span>${escapeHtml(RES_LABEL_ZH[rid] || rid)} ${have}/${need}</span></span>`,
          );
        }
        for (const [pid, need] of Object.entries(rDef.costPantry || {})) {
          const have = Math.max(0, Math.floor(Number(starCamp.pantry?.[pid]) || 0));
          const ok = have >= need;
          costBits.push(
            `<span class="camp-cost-pill ${ok ? "is-ok" : "is-lack"}">${renderResSvg(pid, 13)}<span>${escapeHtml(RES_LABEL_ZH[pid] || pid)} ${have}/${need}</span></span>`,
          );
        }

        const buffLines = formatRecipeBuffs(rDef, effScale)
          .map((txt) => `<span class="camp-buff-pill">${escapeHtml(txt)}</span>`)
          .join("");

        const nextHint = mInfo.nextNeed
          ? `累计 ${cooks}/${mInfo.nextNeed} 次升星`
          : `已达 3星满阶（烹制 ${cooks} 次）`;

        return `
          <div class="camp-recipe-card tier-${rDef.tier} ${mInfo.discovered ? "is-discovered" : ""} ${isActiveFeast ? "is-serving" : ""}">
            <div class="camp-recipe-card__head">
              <div class="camp-recipe-card__iconWrap">${renderUiIcon(rDef.icon, 38)}</div>
              <div class="camp-recipe-card__titleBox">
                <div class="camp-recipe-card__titleRow">
                  <span class="camp-recipe-card__name">${escapeHtml(rDef.name)}</span>
                  <span class="tag">${escapeHtml(rDef.tierLabel)}</span>
                </div>
                <div class="camp-recipe-card__masteryRow">
                  <span class="camp-mastery-badge stars-${mInfo.stars}">${escapeHtml(mInfo.label)}</span>
                  <span class="camp-recipe-card__next">${escapeHtml(nextHint)}</span>
                </div>
              </div>
            </div>
            <div class="camp-recipe-card__desc">${escapeHtml(rDef.desc)}</div>
            <div class="camp-recipe-card__buffs">${buffLines}</div>
            <div class="camp-recipe-card__meta">持续 ${escapeHtml(fmtDuration(effDurSec))} · 驻营伙伴亲密 +${Math.round(rDef.bondGain * effScale)} · 营地经验 +${rDef.campExp}</div>
            <div class="camp-recipe-card__costs">${costBits.join("")}</div>
            <div class="camp-recipe-card__foot">
              <button type="button" class="btn btn--small ${affordable ? "btn--primary" : ""}" data-camp-cook="${rDef.id}" ${affordable ? "" : "disabled"}>
                ${affordable ? (isActiveFeast ? "续烹顺延盛宴" : mInfo.discovered ? "开火烹制呈盘" : "首次试作解锁") : "食材不足"}
              </button>
            </div>
          </div>
        `;
      }).join("");

      const campLogsHtml =
        starCamp.recentLogs.length > 0
          ? starCamp.recentLogs.slice(0, 3).map((ln) => `<div class="camp-log-line">${escapeHtml(ln)}</div>`).join("")
          : `<div class="camp-log-line is-muted">星火微漾，邀请萌灵入驻并开启「营火合奏」或烹制佳肴，这里将记录伙伴们的温馨野餐趣闻。</div>`;

      rows.push(`
        <div class="row star-camp-body">
          <div class="row__left" style="width:100%">
            <div class="star-camp-aura-panel">
              <div class="star-camp-aura-panel__top">
                ${renderUiIcon("campTentStar", 18)}
                <span class="star-camp-aura-panel__name">星营伙伴共鸣 · ${escapeHtml(starCampAura.harmony.name)}</span>
                <span class="tag">${starCampAura.harmony.active ? "共鸣生效中" : "待激活"}</span>
                <span class="star-camp-aura-panel__desc">${escapeHtml(starCampAura.harmony.desc)}</span>
              </div>
              <div class="eco-aura-strip">
                <span class="shiny-aura-pill ${starCampAura.prodAdd > 0 ? "is-on" : ""}">营地与盛宴全产 +${Math.round(starCampAura.prodAdd * 1000) / 10}%</span>
                <span class="shiny-aura-pill ${starCampAura.trainExpAdd > 0 ? "is-on" : ""}">训练经验 +${Math.round(starCampAura.trainExpAdd * 1000) / 10}%</span>
                <span class="shiny-aura-pill ${starCampAura.catchAdd > 0 ? "is-on" : ""}">全局捕获率 +${Math.round(starCampAura.catchAdd * 1000) / 10}%</span>
                <span class="shiny-aura-pill ${starCampAura.ecoAffinityAdd > 0 || starCampAura.ecoYieldAdd > 0 ? "is-on" : ""}">沙盘契合 +${starCampAura.ecoAffinityAdd.toFixed(2)} · 收获 +${Math.round(starCampAura.ecoYieldAdd * 1000) / 10}%</span>
                <span class="shiny-aura-pill ${starCampAura.pveComboAdd > 0 ? "is-on" : ""}">试炼与双打连携伤害 +${Math.round(starCampAura.pveComboAdd * 1000) / 10}%</span>
              </div>
              <div class="star-camp-feast-strip">${activeFeastsHtml}</div>
            </div>

            <div class="star-camp-slots-grid">${campSlotsHtml}</div>

            <div class="star-camp-forage-box">
              <div class="eco-zone-progress">
                <div class="eco-zone-progress__bar"><i data-camp-forage-fill="1" style="width:${campForagePct}%"></i></div>
                <span class="eco-zone-progress__txt" data-camp-forage-txt="1">${
                  stationedMons.length > 0
                    ? `营火伴游采集 ${campForagePct}% · 约 ${escapeHtml(fmtDuration(campForageRemSec))} 后收获野餐香草与星露灵果（加速 x${(starCampAura.campSpeedMul || 1).toFixed(2)}）`
                    : "邀请 1~4 只萌灵入驻营地，即可持续累积亲密度并自动寻获野餐香草与星露灵果"
                }</span>
              </div>
              <div class="star-camp-logs">${campLogsHtml}</div>
            </div>

            <div class="star-camp-kitchen">
              <div class="star-camp-kitchen__head">
                <div class="star-camp-kitchen__title">
                  ${renderUiIcon("campCookingPot", 22)}
                  <span>料理食谱风味增益工坊</span>
                  <span class="tag">食谱图鉴 ${starCampAura.codexCount}/${starCampAura.totalRecipes}</span>
                  <span class="tag">3星极意 ${starCampAura.masteredCount}/${starCampAura.totalRecipes}</span>
                </div>
                <div class="star-camp-kitchen__hint">首烹点亮图鉴（每道永久全产+1% · 捕获+0.2%）；烹满 3/6 次晋升 2星/3星（盛宴强度与时长 +15%/+30%，3星额外永久连携伤害+1.5%）</div>
              </div>
              <div class="star-camp-recipe-grid">${recipeCardsHtml}</div>
            </div>
          </div>
        </div>
      `);

      if (ui.starCampModalOpen) {
        const awaySet = getCampUnavailableMonIds(state);
        const modalSorted = campCandidates
          .slice()
          .sort((a, b) => {
            const aIn = starCamp.stationedIds.includes(a.id) ? 1 : 0;
            const bIn = starCamp.stationedIds.includes(b.id) ? 1 : 0;
            if (aIn !== bIn) return bIn - aIn;
            const aAff = Number(a.affection) || 0;
            const bAff = Number(b.affection) || 0;
            if (aAff !== bAff) return aAff - bAff;
            return monPower(b) - monPower(a);
          });

        const modalRowsHtml = modalSorted.length
          ? modalSorted
              .map((m) => {
                const checked = starCamp.stationedIds.includes(m.id);
                const disableAdd = !checked && starCamp.stationedIds.length >= STAR_CAMP_MAX_SLOTS;
                const mTypes = (Array.isArray(m.types) && m.types.length ? m.types : getBeastDataByDex?.(m.dex)?.types || []).slice(0, 2);
                const tBadges = mTypes
                  .map((t) => `<span class="badge type type-${escapeHtml(t)}">${escapeHtml(TYPE_ZH?.[t] ?? t)}</span>`)
                  .join("");
                const aff = Math.min(100, Math.max(0, Math.floor(Number(m.affection) || 0)));
                return `
                  <label class="modalPick ${checked ? "is-checked" : ""}">
                    <input type="checkbox" data-camp-modal-check="${m.id}" ${checked ? "checked" : ""} ${disableAdd ? "disabled" : ""} />
                    ${renderBeastIcon(m.dex, m.name, Boolean(m.isShiny))}
                    <div class="modalPick__main">
                      <div class="modalPick__title">${escapeHtml(m.name)} <span class="tag">Lv.${m.lvl}</span> ${tBadges}</div>
                      <div class="modalPick__sub">亲密度 ${aff}/100 · 性格：${escapeHtml(getNatureInfo(m.nature)?.name || "纯真")} · 战力 ${monPower(m)}</div>
                    </div>
                  </label>
                `;
              })
              .join("")
          : `<div class="muted" style="padding:12px">暂无可入驻伙伴（正在远征/生态沙盘勘探/孵育中的伙伴需归队后方可入驻）。</div>`;

        starCampModalHtml = `
          <div class="modalOverlay" data-camp-modal-overlay="1">
            <div class="modal" role="dialog" aria-modal="true" aria-label="星界露营伙伴编排">
              <div class="modal__head">
                <div class="modal__title">${renderUiIcon("campTentStar", 20)} <span>星界露营驻营伙伴（${starCamp.stationedIds.length}/${STAR_CAMP_MAX_SLOTS}）</span></div>
                <div class="modal__headActions">
                  <button type="button" class="btn btn--small" data-camp-autofill="1">一键温馨优选</button>
                  <button type="button" class="btn btn--small" data-camp-clear="1">清空驻营</button>
                  <button type="button" class="btn btn--small" data-camp-modal-close="1">关闭</button>
                </div>
              </div>
              <div class="modal__desc">驻营伙伴自动获得放生保护（已跳过 ${awaySet.size} 只正在外出远征/沙盘勘探/孵育的伙伴），凑齐多系或同系伙伴可激活【星营伙伴共鸣】。</div>
              <div class="modal__body">${modalRowsHtml}</div>
              <div class="actions">
                <button type="button" class="btn btn--primary" data-camp-modal-close="1">完成驻营编排</button>
              </div>
            </div>
          </div>
        `;
      }
    }

    // ========== ML-5 Section 1: 秘境生态探索沙盘 (Secret Realm Eco-Exploration Sandbox) ==========
    const hideEcoSandbox = Boolean(ui.functionsHideEcoSandbox);
    const freeSurveysLeft = getEcoSandboxFreeSurveysLeft(state);
    const idleAnyCount = getIdleEcoSandboxCandidates(state, null).length;
    const canAutoDispatchAll = ECO_SANDBOX_ZONES.some((z) => !ecoSb.zones[z.id].active) && idleAnyCount > 0;
    const canClaimAllEco = readyEcoZonesCount > 0;
    let ecoSquadModalHtml = "";

    rows.push(`
      <div class="row eco-sandbox-header">
        <div class="row__left">
          <div class="row__title row__titleLine">
            ${renderUiIcon("ecoRelic", 20)}
            <span>秘境生态探索沙盘</span>
            <span class="tag">探索中 ${activeEcoZonesCount}/4 区</span>
            <span class="tag">古遗物 ${ecoRelicAura.unlockedCount}/${ecoRelicAura.totalRelics}</span>
            <span class="tag tag--mint-stock">${renderResSvg("tuningMint", 13)}<span>心性调律薄荷 ×${mintOwnedCount}</span></span>
            <span class="tag">今日免费速勘 ${freeSurveysLeft}/2</span>
          </div>
          <div class="row__desc">派遣空闲萌灵编队深入四大元素生态秘境（自动避开出战、受训、远征、孵育与本命锁），按属性与特性亲和带回心性调律薄荷、灵晶石、觉醒石与秘境古遗物。</div>
        </div>
        <div class="row__right eco-sandbox-header__btns">
          <button type="button" class="btn btn--small btn--primary" data-eco-auto-dispatch-all="1" ${canAutoDispatchAll ? "" : "disabled"}>全生态一键优选派遣</button>
          <button type="button" class="btn btn--small${canClaimAllEco ? " btn--primary" : ""}" data-eco-claim-all-redispatch="1" ${canClaimAllEco ? "" : "disabled"}>一键全收并续派${canClaimAllEco ? `（${readyEcoZonesCount}）` : ""}</button>
          <button type="button" class="btn btn--small btn--ghost" data-func-toggle="ecoSandbox">${hideEcoSandbox ? "展开" : "收起"}</button>
        </div>
      </div>
    `);

    if (!hideEcoSandbox) {
      const auraPillsHtml = `
        <div class="eco-aura-strip">
          <span class="shiny-aura-pill ${ecoRelicAura.prodAdd > 0 ? "is-on" : ""}">全资源产出 +${Math.round(ecoRelicAura.prodAdd * 1000) / 10}%</span>
          <span class="shiny-aura-pill ${ecoRelicAura.atkAdd > 0 || ecoRelicAura.defAdd > 0 || ecoRelicAura.speAdd > 0 ? "is-on" : ""}">遗物战力 攻+${Math.round(ecoRelicAura.atkAdd * 1000) / 10}% · 防+${Math.round(ecoRelicAura.defAdd * 1000) / 10}% · 速+${Math.round(ecoRelicAura.speAdd * 1000) / 10}%</span>
          <span class="shiny-aura-pill ${ecoRelicAura.trainExpAdd > 0 ? "is-on" : ""}">训练经验 +${Math.round(ecoRelicAura.trainExpAdd * 1000) / 10}%</span>
          <span class="shiny-aura-pill ${ecoRelicAura.catchAdd > 0 ? "is-on" : ""}">全局捕获率 +${Math.round(ecoRelicAura.catchAdd * 1000) / 10}%</span>
          <span class="shiny-aura-pill ${ecoRelicAura.sandboxSpeedAdd > 0 ? "is-on" : ""}">沙盘耗时 -${Math.round(ecoRelicAura.sandboxSpeedAdd * 1000) / 10}%</span>
        </div>
      `;

      const relicCardsHtml = ecoRelicAura.entries
        .map((r) => {
          const zDef = getEcoZoneDef(r.zoneId);
          return `
            <div class="eco-relic-chip ${r.unlocked ? "is-unlocked" : ""}">
              <div class="eco-relic-chip__top">
                ${renderUiIcon("ecoRelic", 18)}
                <span class="eco-relic-chip__name">${escapeHtml(r.name)}</span>
                <span class="tag">${r.unlocked ? `阶 ${r.rank}/${r.maxRank}` : "未发掘"}</span>
              </div>
              <div class="eco-relic-chip__desc">${escapeHtml(r.desc)} · 产自${escapeHtml(zDef?.name || r.zoneId)}</div>
            </div>
          `;
        })
        .join("");

      const zoneCardsHtml = ECO_SANDBOX_ZONES.map((zDef) => {
        const zState = ecoSb.zones[zDef.id];
        const activeIds = zState.active ? zState.squadIds : zState.stagedIds;
        const squadMons = activeIds
          .map((id) => list.find((m) => m && m.id === id) ?? null)
          .filter(Boolean);
        const evalSnap = evaluateEcoSquadAffinity(zDef.id, squadMons, state, { getBeastDataByDex });
        const effMul = zState.active ? Math.max(zState.affinityMul || 1, evalSnap.affinityMul) : evalSnap.affinityMul;
        const durSec = zState.active ? zState.durationSec : evalSnap.durationSec;
        const remSec = zState.active ? Math.max(0, Math.ceil(durSec - zState.elapsedSec)) : durSec;
        const pct = zState.active
          ? zState.completed
            ? 100
            : Math.max(3, Math.min(99, Math.round((zState.elapsedSec / Math.max(1, durSec)) * 100)))
          : 0;

        const prefTypeBadges = zDef.preferredTypes
          .map((t) => `<span class="badge type type-${escapeHtml(t)}">${escapeHtml(TYPE_ZH?.[t] ?? t)}</span>`)
          .join("");
        const prefTraitNames = zDef.preferredAbilities
          .slice(0, 3)
          .map((aid) => escapeHtml(getAbilityInfo(aid)?.name || aid))
          .join(" / ");

        const slotHtml = Array.from({ length: zDef.maxSquad }, (_, idx) => {
          const mon = squadMons[idx];
          if (!mon) {
            return `<div class="eco-squad-slot is-empty">空位 ${idx + 1}</div>`;
          }
          return `
            <div class="eco-squad-slot is-filled">
              ${renderBeastIcon(mon.dex, mon.name, Boolean(mon.isShiny))}
              <div class="eco-squad-slot__meta">
                <span class="eco-squad-slot__name">${escapeHtml(mon.name)}</span>
                <span class="eco-squad-slot__lvl">Lv.${mon.lvl}</span>
              </div>
            </div>
          `;
        }).join("");

        const rewardPreviewBits = Object.entries(evalSnap.previewRewards)
          .map(([rid, amt]) => `<span class="eco-reward-pill">${renderResSvg(rid, 13)}<span>${escapeHtml(RES_LABEL_ZH[rid] || rid)} +${amt}</span></span>`)
          .join("");

        const idleZoneCandidates = getIdleEcoSandboxCandidates(state, zDef.id);
        const clears = ecoSb.zoneClears?.[zDef.id] || 0;
        const canInstant =
          zState.active &&
          !zState.completed &&
          (freeSurveysLeft > 0 || (state.res?.searchFlare?.value ?? 0) >= 1 || (state.res?.futurecoin?.value ?? 0) >= 15);
        const instantLabel =
          freeSurveysLeft > 0
            ? "免费速勘"
            : (state.res?.searchFlare?.value ?? 0) >= 1
              ? "信号弹速勘"
              : "速勘(15币)";

        let footerHtml = "";
        if (!zState.active) {
          footerHtml = `
            <div class="eco-zone-card__foot">
              <div class="eco-zone-card__btns">
                <button type="button" class="btn btn--small" data-eco-open-squad="${zDef.id}">编队 (${squadMons.length}/${zDef.maxSquad})</button>
                <button type="button" class="btn btn--small" data-eco-autopick="${zDef.id}" ${idleZoneCandidates.length > 0 ? "" : "disabled"}>优选亲和</button>
              </div>
              <button type="button" class="btn btn--small btn--primary" data-eco-dispatch="${zDef.id}" ${squadMons.length > 0 ? "" : "disabled"}>派遣勘探（${escapeHtml(fmtDuration(durSec))}）</button>
            </div>
          `;
        } else if (zState.completed) {
          footerHtml = `
            <div class="eco-zone-progress is-done">
              <div class="eco-zone-progress__bar"><i style="width:100%"></i></div>
              <span class="eco-zone-progress__txt">勘探圆满 · 待领取秘境收获</span>
            </div>
            <div class="eco-zone-card__foot">
              <button type="button" class="btn btn--small" data-eco-claim="${zDef.id}">领取收获</button>
              <button type="button" class="btn btn--small btn--primary" data-eco-claim-redispatch="${zDef.id}">收获并原队续派</button>
            </div>
          `;
        } else {
          footerHtml = `
            <div class="eco-zone-progress">
              <div class="eco-zone-progress__bar"><i style="width:${pct}%"></i></div>
              <span class="eco-zone-progress__txt">勘探进度 ${pct}% · 剩余 ${escapeHtml(fmtDuration(remSec))}</span>
            </div>
            <div class="eco-zone-card__foot">
              <button type="button" class="btn btn--small" data-eco-instant="${zDef.id}" ${canInstant ? "" : "disabled"}>${escapeHtml(instantLabel)}</button>
              <button type="button" class="btn btn--small btn--danger" data-eco-cancel="${zDef.id}">撤回编队</button>
            </div>
          `;
        }

        return `
          <div class="eco-zone-card ${zState.completed ? "is-ready" : zState.active ? "is-active" : ""}">
            <div class="eco-zone-card__head">
              <div class="eco-zone-card__iconWrap">${renderUiIcon(zDef.icon, 36)}</div>
              <div class="eco-zone-card__titleBox">
                <div class="eco-zone-card__titleRow">
                  <span class="eco-zone-card__name">${escapeHtml(zDef.name)}</span>
                  <span class="tag">契合 x${effMul.toFixed(2)}</span>
                  <span class="tag">${clears > 0 ? `已探 ${clears} 次` : "首探必出遗物"}</span>
                </div>
                <div class="eco-zone-card__sub">${escapeHtml(zDef.subtitle)}</div>
              </div>
            </div>
            <div class="eco-zone-card__affinities">
              <span class="eco-zone-card__label">亲和元素：</span>${prefTypeBadges}
              <span class="eco-zone-card__traits">共鸣特性：${prefTraitNames}</span>
            </div>
            <div class="eco-squad-row">${slotHtml}</div>
            <div class="eco-reward-strip">
              ${rewardPreviewBits}
              <span class="eco-reward-pill">队内经验 +${evalSnap.monExp}</span>
            </div>
            ${footerHtml}
          </div>
        `;
      }).join("");

      rows.push(`
        <div class="row eco-sandbox-body">
          <div class="row__left" style="width:100%">
            <div class="eco-relic-panel">
              <div class="eco-relic-panel__title">
                ${renderUiIcon("ecoRelic", 16)}
                <span>秘境古遗物图鉴与全局共鸣光环</span>
                <span class="tag">累计阶数 ${ecoRelicAura.totalRank}/${ecoRelicAura.maxTotalRank}</span>
              </div>
              ${auraPillsHtml}
              <div class="eco-relic-grid">${relicCardsHtml}</div>
            </div>
            <div class="eco-zone-grid">${zoneCardsHtml}</div>
          </div>
        </div>
      `);

      if (typeof ui.ecoModalZoneId === "string" && getEcoZoneDef(ui.ecoModalZoneId)) {
        const modalZone = getEcoZoneDef(ui.ecoModalZoneId);
        const modalZState = ecoSb.zones[modalZone.id];
        const stagedSet = new Set(modalZState.stagedIds);
        const extBusySet = getNonSandboxBusyIds(state);
        const idleCandidates = getIdleEcoSandboxCandidates(state, modalZone.id);
        const busyCountSkipped = list.filter((m) => m && extBusySet.has(m.id)).length;

        const modalRowsHtml = idleCandidates.length
          ? idleCandidates
              .slice()
              .sort((a, b) => monPower(b) - monPower(a))
              .map((m) => {
                const checked = stagedSet.has(m.id);
                const disableNew = !checked && stagedSet.size >= modalZone.maxSquad;
                const mTypes = getMonTypesForExpedition(m, getBeastDataByDex);
                const typeMatch = mTypes.some((t) => modalZone.preferredTypes.includes(t));
                const traitMatch = modalZone.preferredAbilities.includes(m.ability);
                const abName = getAbilityInfo(m.ability)?.name || "—";
                const synTags = [
                  typeMatch ? "元素契合" : "",
                  traitMatch ? "特性共鸣" : "",
                ].filter(Boolean).join(" · ");
                return `
                  <div class="row func-mon-row">
                    <div class="row__left">
                      <div class="row__title row__titleLine">${renderBeastIcon(m.dex, m.name, Boolean(m.isShiny))}<span>${escapeHtml(m.name)}</span><span class="tag">Lv.${m.lvl}</span>${synTags ? `<span class="tag tag--bond-on">${escapeHtml(synTags)}</span>` : ""}</div>
                      <div class="row__desc">战力 ${monPower(m)} · 特性 ${escapeHtml(abName)} · 性格 ${escapeHtml(formatMonNatureWithTuning(m, { compact: true }))}</div>
                    </div>
                    <div class="row__right">
                      <input class="chk" type="checkbox" data-eco-modal-check="${m.id}" data-eco-modal-zone="${modalZone.id}" ${checked ? "checked" : ""} ${disableNew ? "disabled" : ""} />
                    </div>
                  </div>
                `;
              })
              .join("")
          : `<div class="muted" style="padding:12px">当前暂无可派遣的空闲萌灵（出战、训练、远征、孵育及本命灵契保护中的萌灵已被安全过滤）。</div>`;

        ecoSquadModalHtml = `
          <div class="modalOverlay" data-eco-modal-overlay="1">
            <div class="modal">
              <div class="modal__header">
                <div class="modal__title">${renderUiIcon(modalZone.icon, 20)}<span>${escapeHtml(modalZone.name)} · 勘探编队</span><span class="tag">已选 ${modalZState.stagedIds.length}/${modalZone.maxSquad}</span></div>
                <div class="modal__right">
                  <button type="button" class="btn btn--small" data-eco-autopick="${modalZone.id}">一键优选</button>
                  <button type="button" class="btn btn--small" data-eco-modal-clear="${modalZone.id}">清空</button>
                  <button type="button" class="btn btn--small" data-eco-modal-close="1">关闭</button>
                </div>
              </div>
              <div class="modal__desc">仅展示空闲萌灵（已自动保护 ${busyCountSkipped} 只处于主力阵容/训练/远征/孵育/本命契约中的伙伴）。</div>
              <div class="modal__body">${modalRowsHtml}</div>
              <div class="actions">
                <button type="button" class="btn btn--ghost" data-eco-modal-close="1">完成编队</button>
                <button type="button" class="btn btn--primary" data-eco-dispatch="${modalZone.id}" ${modalZState.stagedIds.length > 0 ? "" : "disabled"}>立即派遣勘探</button>
              </div>
            </div>
          </div>
        `;
      }
    }

    // ========== ML-5 Section 2: 性格薄荷定向调律工坊 (Temperament Mint Directed Tuning Workshop) ==========
    const hideMintWorkshop = Boolean(ui.functionsHideMintWorkshop);
    const totalTuningsApplied = Math.max(0, Math.floor(state.meta?.mintTuningsApplied || 0));

    rows.push(`
      <div class="row mint-workshop-header">
        <div class="row__left">
          <div class="row__title row__titleLine">
            ${renderResSvg("tuningMint", 20)}
            <span>性格薄荷定向调律工坊</span>
            <span class="tag tag--mint-stock">${renderResSvg("tuningMint", 13)}<span>库存 ×${mintOwnedCount}</span></span>
            <span class="tag">累计调律 ${totalTuningsApplied} 次</span>
          </div>
          <div class="row__desc">消耗「心性调律薄荷」定向重塑任意萌灵的六维成长倍率（+10% / -10% 或归元均衡），永久保留初始纪念性格标签，实时同步战力、星穹试炼与双圣殿对决。</div>
        </div>
        <div class="row__right">
          <button type="button" class="btn btn--small btn--ghost" data-func-toggle="mintWorkshop">${hideMintWorkshop ? "展开" : "收起"}</button>
        </div>
      </div>
    `);

    if (!hideMintWorkshop) {
      const validMons = list.filter(Boolean);
      const selectedMintMonId =
        typeof ui.mintWorkshopMonId === "number" && validMons.some((m) => m.id === ui.mintWorkshopMonId)
          ? ui.mintWorkshopMonId
          : validMons[0]?.id ?? null;
      const targetMon = selectedMintMonId != null ? validMons.find((m) => m.id === selectedMintMonId) ?? null : null;

      if (!targetMon) {
        rows.push(`
          <div class="row mint-workshop-body">
            <div class="row__left">
              <div class="row__desc muted">尚未拥有可调律的萌灵。前往「九域猎场」捕捉第一只伙伴后，即可在此使用心性调律薄荷定制六维偏向。</div>
            </div>
          </div>
        `);
      } else {
        const recSpec = recommendMintTuningForMon(targetMon, getBeastDataByDex);
        const curNorm = normalizeMintTuning(targetMon.mintTuning);

        let draftUp = ui.mintWorkshopUp;
        let draftDown = ui.mintWorkshopDown;
        const draftNeutral = Boolean(ui.mintWorkshopNeutral);
        if (!draftNeutral) {
          if (!TUNABLE_STATS.includes(draftUp)) draftUp = curNorm?.up || recSpec.up || "atk";
          if (!TUNABLE_STATS.includes(draftDown) || draftDown === draftUp) {
            draftDown = curNorm?.down && curNorm.down !== draftUp ? curNorm.down : draftUp === "spa" ? "atk" : "spa";
          }
        }
        const draftSpec = draftNeutral ? { up: null, down: null } : { up: draftUp, down: draftDown };
        const isSameAsCurrent = Boolean(curNorm && curNorm.up === draftSpec.up && curNorm.down === draftSpec.down);

        const calcStatsFn =
          typeof getMonCurrentStats === "function"
            ? (m) => getMonCurrentStats(m)
            : (m) => getMonCurrentStatsFallback(m, getBeastDataByDex);
        const calcPowerFn =
          typeof monPower === "function"
            ? (m) => monPower(m)
            : (m) => monPowerFallback(m, getBeastDataByDex);

        const statsBefore = calcStatsFn(targetMon);
        const powerBefore = calcPowerFn(targetMon);
        const previewClone = { ...targetMon, mintTuning: draftSpec };
        const statsAfter = calcStatsFn(previewClone);
        const powerAfter = calcPowerFn(previewClone);
        const powerDelta = powerAfter - powerBefore;

        const origNatureName = getNatureInfo(targetMon.nature)?.name || "勤奋";
        const curTuningText = curNorm ? describeMintTuning(curNorm) : "未调律（全维 1.00x）";
        const draftTuningText = describeMintTuning(draftSpec);

        const monOptionsHtml = validMons
          .slice()
          .sort((a, b) => calcPowerFn(b) - calcPowerFn(a))
          .map((m) => {
            const label = `${m.name}（Lv.${m.lvl} · 战力${calcPowerFn(m)} · ${formatMonNatureWithTuning(m, { compact: true })}）`;
            return `<option value="${m.id}" ${m.id === targetMon.id ? "selected" : ""}>${escapeHtml(label)}</option>`;
          })
          .join("");

        const presetsHtml = MINT_TUNING_PRESETS.map((p) => {
          const activePreset =
            (p.up === null && draftNeutral) || (!draftNeutral && p.up === draftUp && p.down === draftDown);
          return `<button type="button" class="btn btn--small${activePreset ? " btn--primary" : ""}" data-mint-preset="${escapeHtml(p.id)}" title="${escapeHtml(p.desc)}">${escapeHtml(p.name)}</button>`;
        }).join("");

        const upChipsHtml = TUNABLE_STATS.map((sk) => {
          const on = !draftNeutral && draftUp === sk;
          return `<button type="button" class="btn btn--small${on ? " btn--primary" : ""}" data-mint-up="${sk}">${escapeHtml(STAT_ZH[sk])} +10%</button>`;
        }).join("") + `<button type="button" class="btn btn--small${draftNeutral ? " btn--primary" : ""}" data-mint-up="neutral">归元均衡 (±0%)</button>`;

        const downChipsHtml = TUNABLE_STATS.map((sk) => {
          const on = !draftNeutral && draftDown === sk;
          const disabled = draftNeutral || draftUp === sk;
          return `<button type="button" class="btn btn--small${on ? " btn--danger" : ""}" data-mint-down="${sk}" ${disabled ? "disabled" : ""}>${escapeHtml(STAT_ZH[sk])} -10%</button>`;
        }).join("");

        const statDiffCellsHtml = ["hp", "atk", "def", "spa", "spd", "spe"]
          .map((sk) => {
            const bVal = statsBefore[sk] ?? 1;
            const aVal = statsAfter[sk] ?? 1;
            const diff = aVal - bVal;
            const cls = diff > 0 ? "is-up" : diff < 0 ? "is-down" : "";
            const diffTxt = diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : "±0";
            return `
              <div class="mint-stat-cell ${cls}">
                <span class="mint-stat-cell__lbl">${escapeHtml(STAT_ZH[sk])}</span>
                <span class="mint-stat-cell__vals">${bVal} → <strong>${aVal}</strong></span>
                <span class="mint-stat-cell__delta">${diffTxt}</span>
              </div>
            `;
          })
          .join("") + `
            <div class="mint-stat-cell mint-stat-cell--cp ${powerDelta > 0 ? "is-up" : powerDelta < 0 ? "is-down" : ""}">
              <span class="mint-stat-cell__lbl">总战力</span>
              <span class="mint-stat-cell__vals">${powerBefore} → <strong>${powerAfter}</strong></span>
              <span class="mint-stat-cell__delta">${powerDelta > 0 ? `+${powerDelta}` : powerDelta < 0 ? `${powerDelta}` : "±0"}</span>
            </div>
          `;

        const canApplyMint = mintOwnedCount >= 1 && !isSameAsCurrent;
        const applyBtnLabel = isSameAsCurrent
          ? "已处于该调律偏向"
          : mintOwnedCount < 1
            ? "心性调律薄荷不足（可通过上方秘境沙盘获取）"
            : `消耗 1 株心性调律薄荷 · 应用「${draftTuningText}」`;

        rows.push(`
          <div class="row mint-workshop-body">
            <div class="row__left" style="width:100%">
              <div class="mint-workshop-ControlsRow">
                <div class="mint-mon-picker">
                  <label class="mint-picker-label">选择调律伙伴：</label>
                  <select class="input mint-mon-select" data-mint-mon="1">${monOptionsHtml}</select>
                  <button type="button" class="btn btn--small" data-mint-recommend="1">智能推荐偏向</button>
                </div>
              </div>
              <div class="mint-commemorative-banner">
                <div class="mint-commemorative-mon">
                  ${renderBeastIcon(targetMon.dex, targetMon.name, Boolean(targetMon.isShiny))}
                  <div>
                    <div class="mint-commemorative-title">
                      <strong>${escapeHtml(targetMon.name)}</strong>
                      <span class="tag">Lv.${targetMon.lvl}</span>
                      <span class="badge badge--nature">原性格：${escapeHtml(origNatureName)}（永久纪念）</span>
                      <span class="mint-arrow">→</span>
                      <span class="badge badge--mint-active">当前偏向：${escapeHtml(curTuningText)}</span>
                    </div>
                    <div class="mint-commemorative-sub">拟定调律预览：<strong>${escapeHtml(origNatureName)} → ${escapeHtml(draftTuningText)}</strong></div>
                  </div>
                </div>
              </div>
              <div class="mint-presets-bar">
                <span class="mint-section-label">流派预设：</span>
                <div class="mint-chip-group">${presetsHtml}</div>
              </div>
              <div class="mint-custom-matrix">
                <div class="mint-matrix-row">
                  <span class="mint-section-label">增益维度 (+10%)：</span>
                  <div class="mint-chip-group">${upChipsHtml}</div>
                </div>
                <div class="mint-matrix-row">
                  <span class="mint-section-label">折损维度 (-10%)：</span>
                  <div class="mint-chip-group">${downChipsHtml}</div>
                </div>
              </div>
              <div class="mint-stat-diff-grid">${statDiffCellsHtml}</div>
              <div class="mint-workshop-foot">
                <span class="muted">提示：原性格风味与纪念标签永不丢失；调律结果即时作用于主线试炼、无尽塔、双圣殿与演武场。</span>
                <button type="button" class="btn btn--primary" data-mint-apply="1" ${canApplyMint ? "" : "disabled"}>${escapeHtml(applyBtnLabel)}</button>
              </div>
            </div>
          </div>
        `);
      }
    }

    rows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title row__titleLine">${renderBuildingSvg("trainingGround", 18)}<span>训练场</span><span class="tag">槽位 ${active.length}/${slotSize}</span></div>
          <div class="row__desc">训练中的萌灵：持续获取 10 倍实战经验，加速突破等级瓶颈。</div>
        </div>
        <div class="row__right">
          <button class="btn btn--small btn--ghost" data-func-toggle="training">${hideTraining ? "▸" : "▾"}</button>
        </div>
      </div>
    `);

    if (!hideTraining) {
      if (slotSize < 1) {
        rows.push(`
          <div class="row is-locked">
            <div class="row__left">
              <div class="row__title">未解锁</div>
              <div class="row__desc">建造“训练场”（功能建筑）后可用。</div>
            </div>
          </div>
        `);
      } else if (list.length === 0) {
        rows.push(`
          <div class="row is-locked">
            <div class="row__left">
              <div class="row__title">暂无萌灵</div>
              <div class="row__desc">先去捕捉一只吧。</div>
            </div>
          </div>
        `);
      } else {
        const trainingSet = new Set(active.map((m) => m.id));
        const used = active.length;
        const canTrainStart = used < slotSize;

        rows.push(`
          <div class="row">
            <div class="row__left">
              <div class="row__title row__titleLine">${renderResSvg("expCandy", 18)}<span>选择训练萌灵</span><span class="tag">已用 ${used}/${slotSize}</span></div>
              <div class="row__desc">派遣闲置萌灵进入训练槽位，自动积累实战经验。</div>
            </div>
            <div class="row__right">
              <button class="btn btn--primary" data-train-open ${canTrainStart ? "" : "disabled"}>选择训练萌灵</button>
            </div>
          </div>
        `);

        if (active.length > 0) {
          for (const m of active) {
            const exp = Math.max(0, Math.floor(typeof m.exp === "number" && Number.isFinite(m.exp) ? m.exp : 0));
            const needExp = m.lvl >= 100 ? 0 : Math.max(0, Math.floor(expNeedForLevel0(m.lvl)));
            const expText = needExp > 0 ? `${exp}/${needExp}` : `${exp}/MAX`;
            const nMul = natureTrainExpMul(m, active.length);
            const pass = monPassive(m);
            const abName = getAbilityInfo(m.ability)?.name || pass?.desc || "";
            const nHint =
              nMul > 1
                ? ` · 特性「${escapeHtml(abName)}」经验×${nMul.toFixed(2)}`
                : pass
                  ? ` · 特性「${escapeHtml(getAbilityInfo(m.ability)?.name || "")}」`
                  : "";
            rows.push(`
              <div class="row func-mon-row">
                <div class="row__left">
                  <div class="row__title row__titleLine">${renderBeastIcon(m.dex, m.name, Boolean(m.isShiny))}<span>训练中：${escapeHtml(m.name)}</span> <span class="tag">Lv.${m.lvl}</span></div>
                  <div class="row__desc">经验进度：${expText}${nHint}</div>
                </div>
                <div class="row__right">
                  <button class="btn btn--danger btn--small" data-train-cancel="${m.id}">取消训练</button>
                </div>
              </div>
            `);
          }
        }
      }
    }

    rows.push(`<div class="sidebar__divider"></div>`);

    const hideBreeding = Boolean(ui.functionsHideBreeding);

    rows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title row__titleLine">${renderBuildingSvg("breedingHouse", 18)}<span>育灵屋</span><span class="tag">经验 ×50</span></div>
          <div class="row__desc">饲养中的萌灵：双亲配对温养灵蛋（经验获取 ×50，消耗灵果 10/秒）。</div>
        </div>
        <div class="row__right">
          <button class="btn btn--small btn--ghost" data-func-toggle="breeding">${hideBreeding ? "▸" : "▾"}</button>
        </div>
      </div>
    `);

    const breedingUnlocked = (state.buildings?.breedingHouse?.owned ?? 0) > 0;
    ensureBreedingState(state);
    const breedingOn = Boolean(state.breeding.on);
    const techEffForBreed = typeof computeTechEffects === "function" ? computeTechEffects(state) : null;
    const shinyChanceMulForBreed =
      typeof techEffForBreed?.shinyChanceMul === "number" && Number.isFinite(techEffForBreed.shinyChanceMul)
        ? techEffForBreed.shinyChanceMul
        : 1;

    const renderAbilityLockControls = (abInfoA, abInfoB, curLock) => {
      const lock = normalizeAbilityLock(curLock);
      const labelA = abInfoA ? `锁定 A·${escapeHtml(abInfoA.name)}` : "锁定伙伴 A";
      const labelB = abInfoB ? `锁定 B·${escapeHtml(abInfoB.name)}` : "锁定伙伴 B";
      return `
        <div class="breed-lock-group" role="group" aria-label="被动特性遗传锁定">
          <button type="button" class="btn btn--small ${lock === "auto" ? "btn--primary" : "btn--ghost"}" data-breed-ability-lock="auto">双亲优选 (70%)</button>
          <button type="button" class="btn btn--small ${lock === "a" ? "btn--primary" : "btn--ghost"}" data-breed-ability-lock="a">${labelA}</button>
          <button type="button" class="btn btn--small ${lock === "b" ? "btn--primary" : "btn--ghost"}" data-breed-ability-lock="b">${labelB}</button>
        </div>
      `;
    };

    const renderEugenicsPreviewCard = (pA, pB, contextLabel = "优生孵蛋 2.0 · 遗传预览与虹光提率") => {
      const prev = computeBreedingPreview(state, pA, pB, {
        getSpeciesByPid,
        shinyChanceMul: shinyChanceMulForBreed,
      });
      const si = prev.shinyInfo;
      const charmBadge = si.charmActive ? "虹彩护符 +3判" : "虹彩护符 未启用";
      const parentBadge = si.shinyParentsCount > 0 ? `异色亲代 ×${si.shinyParentsCount} (+${si.parentRolls}判)` : "常色亲代 (+0判)";
      const pityBadge = `孵化保底 ${si.pity}/${si.pityCap} (+${si.pityRolls}判${si.softPityActive ? "·高热提升" : ""})`;

      let geneticsLine = "配对同进化链双亲（或与幻彩星泥配对）后，自动开启高个体潜力与星级成长底子优生继承。";
      if (prev.hasPair) {
        if (!prev.eligible) {
          geneticsLine = "当前两只萌灵不属于同一进化链且不含幻彩星泥，仅享受经验×50温养，不会产蛋。";
        } else {
          const spName = prev.offspringSpecies?.name ? escapeHtml(prev.offspringSpecies.name) : escapeHtml(prev.basePid || "子代萌灵");
          const starPart =
            prev.starBounds.maxStarsOut > 0
              ? `星级底子 ${prev.starBounds.guaranteedStars === prev.starBounds.maxStarsOut ? `必承 ${prev.starBounds.guaranteedStars}星` : `保底 ${prev.starBounds.guaranteedStars}星 / 最高 ${prev.starBounds.maxStarsOut}星`}`
              : "星级底子 0星（提升亲代星级可直承至3星）";
          geneticsLine = `子代：${spName} · 优选遗传 ${prev.inheritedIvCount}/6 项高个体（预计潜力 ${prev.expectedMinIvSum}~${prev.expectedMaxIvSum}/186） · ${starPart}`;
        }
      }

      return `
        <div class="row breed-eugenics-card">
          <div class="row__left">
            <div class="row__title row__titleLine">
              ${renderResSvg("eugenicsCharm", 18)}
              <span>${escapeHtml(contextLabel)}</span>
              <span class="tag breed-shiny-odds-tag">${renderResSvg("shinyCharm", 13)} 实际闪光率 1/${si.oddsDenom}（${si.pctText}%）</span>
            </div>
            <div class="row__desc">${geneticsLine}</div>
            <div class="breed-pills-row">
              <span class="breed-meta-pill">图鉴虹印：${escapeHtml(si.dexTier.label)}</span>
              <span class="breed-meta-pill ${si.charmActive ? "is-active" : ""}">${charmBadge}</span>
              <span class="breed-meta-pill ${si.shinyParentsCount > 0 ? "is-active" : ""}">${parentBadge}</span>
              <span class="breed-meta-pill ${si.pity > 0 ? "is-active" : ""}">${pityBadge}</span>
            </div>
            <div class="row__desc breed-ability-line">特性血脉规则：${escapeHtml(prev.abilityPreviewText)}</div>
          </div>
          <div class="row__right">
            ${renderAbilityLockControls(prev.abInfoA, prev.abInfoB, prev.abilityLock)}
          </div>
        </div>
      `;
    };

    if (!hideBreeding) {
      if (!breedingUnlocked) {
        rows.push(`
          <div class="row is-locked">
            <div class="row__left">
              <div class="row__title">未解锁</div>
              <div class="row__desc">建造“育灵屋”（功能建筑）后可用。</div>
            </div>
          </div>
        `);
      } else if (list.length < 2) {
        rows.push(`
          <div class="row is-locked">
            <div class="row__left">
              <div class="row__title">萌灵不足</div>
              <div class="row__desc">至少需要 2 只萌灵才能开始饲养。</div>
            </div>
          </div>
        `);
      } else {
        if (!breedingOn) {
          rows.push(`
            <div class="row">
              <div class="row__left">
                <div class="row__title row__titleLine">${renderResSvg("luckyEgg", 18)}<span>选择饲养萌灵</span><span class="tag">双亲优生配对</span></div>
                <div class="row__desc">选择两只萌灵开始饲养（同进化链或幻彩星泥会自动温养产蛋，高概率承袭双亲高潜力与指定特性）。</div>
              </div>
              <div class="row__right">
                <button class="btn btn--primary" data-breed-open>选择饲养萌灵</button>
              </div>
            </div>
          `);
        }

        const aId = typeof state.breeding.aId === "number" && Number.isFinite(state.breeding.aId) ? state.breeding.aId : null;
        const bId = typeof state.breeding.bId === "number" && Number.isFinite(state.breeding.bId) ? state.breeding.bId : null;
        const aMon = typeof aId === "number" ? list.find((m) => m && m.id === aId) ?? null : null;
        const bMon = typeof bId === "number" ? list.find((m) => m && m.id === bId) ?? null : null;

        rows.push(renderEugenicsPreviewCard(breedingOn ? aMon : null, breedingOn ? bMon : null));

        if (breedingOn) {
          const rem =
            typeof state.breeding.eggRemainingSec === "number" && Number.isFinite(state.breeding.eggRemainingSec)
              ? Math.max(0, state.breeding.eggRemainingSec)
              : 0;
          const lvl = clamp(state.buildings?.breedingHouse?.owned ?? 0, 0, 10);
          const breedTimeMul = legacyBreedTimeMul(state);
          const hatchAffAdd = legacyHatchAffectionAdd(state);
          const swiftNote =
            breedTimeMul < 0.999
              ? ` · 极速孵育 -${Math.round((1 - breedTimeMul) * 100)}%（破壳亲密 +${hatchAffAdd}）`
              : "";
          const islandHatchMul = state.meta?.skyIsland ? computeSkyIslandAura(state).hatchSpeedMul : 1;
          const islandHatchNote = islandHatchMul > 1.0001 ? ` · 云顶孵化光环 ×${islandHatchMul.toFixed(2)}` : "";
          const eggText =
            rem > 0
              ? `正在温养灵蛋：剩余 ${fmtDuration(Math.ceil(rem / islandHatchMul))}（育灵屋 Lv.${lvl}${swiftNote}${islandHatchNote}）`
              : `双亲温养中 · 尚未产蛋${swiftNote}${islandHatchNote}`;

          rows.push(`
        <div class="row">
          <div class="row__left">
            <div class="row__title row__titleLine">${renderResSvg("luckyEgg", 18)}<span>饲养中</span><span class="tag">育灵屋 Lv.${lvl}</span></div>
            <div class="row__desc">${eggText}</div>
          </div>
          <div class="row__right">
            <button class="btn btn--danger btn--small" data-breed-cancel="1">取消饲养</button>
          </div>
        </div>
      `);

          if (aMon) {
            const expA = Math.max(0, Math.floor(typeof aMon.exp === "number" && Number.isFinite(aMon.exp) ? aMon.exp : 0));
            const needExpA = aMon.lvl >= 100 ? 0 : Math.max(0, Math.floor(expNeedForLevel0(aMon.lvl)));
            const expTextA = needExpA > 0 ? `${expA}/${needExpA}` : `${expA}/MAX`;
            const ivA = sumMonIv(aMon);
            const abA = getAbilityInfo(resolveParentAbilityId(aMon));
            const starTagA = (aMon.stars ?? 0) > 0 ? `<span class="tag">${aMon.stars}星</span>` : "";
            rows.push(`
          <div class="row func-mon-row">
            <div class="row__left">
              <div class="row__title row__titleLine">${renderBeastIcon(aMon.dex, aMon.name, Boolean(aMon.isShiny))}<span>饲养伙伴 A：${escapeHtml(aMon.name)}</span> <span class="tag">Lv.${aMon.lvl}</span>${starTagA}<span class="tag">潜力 ${ivA}/186 (${ivGradeTag(ivA)})</span></div>
              <div class="row__desc">经验进度：${expTextA}${abA ? ` · 特性「${escapeHtml(abA.name)}」（${escapeHtml(abA.desc)}）` : ""}</div>
            </div>
            <div class="row__right">
              <button class="btn btn--danger btn--small" data-breed-cancel="1">取消饲养</button>
            </div>
          </div>
        `);
          }
          if (bMon) {
            const expB = Math.max(0, Math.floor(typeof bMon.exp === "number" && Number.isFinite(bMon.exp) ? bMon.exp : 0));
            const needExpB = bMon.lvl >= 100 ? 0 : Math.max(0, Math.floor(expNeedForLevel0(bMon.lvl)));
            const expTextB = needExpB > 0 ? `${expB}/${needExpB}` : `${expB}/MAX`;
            const ivB = sumMonIv(bMon);
            const abB = getAbilityInfo(resolveParentAbilityId(bMon));
            const starTagB = (bMon.stars ?? 0) > 0 ? `<span class="tag">${bMon.stars}星</span>` : "";
            rows.push(`
          <div class="row func-mon-row">
            <div class="row__left">
              <div class="row__title row__titleLine">${renderBeastIcon(bMon.dex, bMon.name, Boolean(bMon.isShiny))}<span>饲养伙伴 B：${escapeHtml(bMon.name)}</span> <span class="tag">Lv.${bMon.lvl}</span>${starTagB}<span class="tag">潜力 ${ivB}/186 (${ivGradeTag(ivB)})</span></div>
              <div class="row__desc">经验进度：${expTextB}${abB ? ` · 特性「${escapeHtml(abB.name)}」（${escapeHtml(abB.desc)}）` : ""}</div>
            </div>
            <div class="row__right">
              <button class="btn btn--danger btn--small" data-breed-cancel="1">取消饲养</button>
            </div>
          </div>
        `);
          }
        }
      }
    }

    const TYPE_ZH_MAP = TYPE_ZH && typeof TYPE_ZH === "object" ? TYPE_ZH : {};
    const TYPE_KEYS_UI = Object.keys(TYPE_ZH_MAP);
    const monRegionByDex = (dex) => {
      const z = beastZone(dex);
      return typeof z === "number" ? (ZONE_IDS[z] ?? "other") : "other";
    };
    const regionLabel = (k) => ZONE_LABELS[k] ?? "其他";
    const getMonTypesSimple = (m) => {
      const localTypes = globalThis.BEAST_TYPES;
      if (localTypes && typeof localTypes === "object") {
        const lt = localTypes[m.dex];
        if (Array.isArray(lt) && lt.length > 0) return lt;
      }
      const api = getBeastDataByDex(m.dex);
      const types = Array.isArray(api?.types) ? api.types.slice(0, 2) : [];
      return types.filter((x) => typeof x === "string");
    };
    const sortMons = (arr, sortKey, dir0) => {
      const k = sortKey === "lvl" || sortKey === "dex" || sortKey === "iv" || sortKey === "power" ? sortKey : "power";
      const dir = dir0 === "asc" || dir0 === "desc" ? dir0 : "desc";
      const dirMul = dir === "asc" ? 1 : -1;
      const withPower = arr.map((m) => ({ m, p: monPower(m), iv: sumMonIv(m) }));
      const cmpAsc = (a, b) => {
        if (k === "iv") return (a.iv ?? 0) - (b.iv ?? 0) || (a.p ?? 0) - (b.p ?? 0) || (a.m.lvl ?? 0) - (b.m.lvl ?? 0);
        if (k === "dex") return (a.m.dex ?? 0) - (b.m.dex ?? 0) || (a.p ?? 0) - (b.p ?? 0) || (a.m.lvl ?? 0) - (b.m.lvl ?? 0);
        if (k === "lvl") return (a.m.lvl ?? 0) - (b.m.lvl ?? 0) || (a.p ?? 0) - (b.p ?? 0) || (a.m.dex ?? 0) - (b.m.dex ?? 0);
        return (a.p ?? 0) - (b.p ?? 0) || (a.m.lvl ?? 0) - (b.m.lvl ?? 0) || (a.m.dex ?? 0) - (b.m.dex ?? 0);
      };
      withPower.sort((a, b) => dirMul * cmpAsc(a, b));
      return withPower.map((x) => x.m);
    };

    let trainingModalHtml = "";
    if (ui.trainingModalOpen) {
      const trainingSet = new Set(active.map((m) => m.id));
      const used = active.length;
      const capLeft = Math.max(0, slotSize - used);
      // ML-14 统一忙碌排除：外出 / 驻场中的伙伴（码头 / 观察站 / 浮岛 / 远航 / 温泉 / 邮局 / 绘本馆 / 钓鱼会）不出现在训练候选里
      const trainNotTraining = list.filter((m) => m && !trainingSet.has(m.id));
      const allCandidates = excludeAwayMons(state, trainNotTraining);
      const trainAwaySkipped = trainNotTraining.length - allCandidates.length;

      const q0 = typeof ui.trainingModalQuery === "string" ? ui.trainingModalQuery : "";
      const q = String(q0 || "").trim();
      ui.trainingModalQuery = q;
      const qIsDigits = /^\d+$/.test(q);
      const qDex = qIsDigits ? Math.max(1, Math.floor(Number(q))) : null;
      const qLower = q.toLowerCase();

      const region0 = typeof ui.trainingModalRegion === "string" ? ui.trainingModalRegion : "all";
      const region = ["all", "meadow", "woods", "brook", "plateau", "dunes", "garden", "ridge", "hollow"].includes(region0) ? region0 : "all";
      const type0 = typeof ui.trainingModalType === "string" ? ui.trainingModalType : "all";
      const type = type0 === "all" || TYPE_KEYS_UI.includes(type0) ? type0 : "all";
      const sort0 = typeof ui.trainingModalSort === "string" ? ui.trainingModalSort : "power";
      const sort = ["power", "lvl", "dex"].includes(sort0) ? sort0 : "power";

      const dir0 = typeof ui.trainingModalSortDir === "string" ? ui.trainingModalSortDir : "";
      const dir = dir0 === "asc" || dir0 === "desc" ? dir0 : sort === "dex" ? "asc" : "desc";
      if (dir !== ui.trainingModalSortDir) ui.trainingModalSortDir = dir;

      const filtered = allCandidates
        .filter((m) => (region === "all" ? true : monRegionByDex(m.dex) === region))
        .filter((m) => (type === "all" ? true : getMonTypesSimple(m).includes(type)))
        .filter((m) => {
          if (!q) return true;
          if (qDex && Number.isFinite(qDex)) return Math.floor(m.dex ?? 0) === qDex;
          const nm = typeof m.name === "string" ? m.name : "";
          return nm.toLowerCase().includes(qLower);
        });

      const sorted = sortMons(filtered, sort, dir);

      const aliveSet = new Set(allCandidates.map((m) => m.id));
      const sel0 = Array.isArray(ui.trainingModalSelectedIds) ? ui.trainingModalSelectedIds : [];
      const sel = sel0.filter((id) => aliveSet.has(id)).slice(0, capLeft);
      ui.trainingModalSelectedIds = sel;

      const regionOptions = [
        { k: "all", n: "全部区域" },
        { k: "meadow", n: "芽芽草甸" },
        { k: "woods", n: "蜜露林径" },
        { k: "brook", n: "溪光浅滩" },
        { k: "plateau", n: "风铃高原" },
        { k: "dunes", n: "星砂荒漠" },
        { k: "garden", n: "月见花园" },
        { k: "ridge", n: "霜晶山脊" },
        { k: "hollow", n: "龙眠幽谷" },
      ]
        .map((x) => `<option value="${x.k}" ${region === x.k ? "selected" : ""}>${x.n}</option>`)
        .join("");

      const typeOptions = [
        `<option value="all" ${type === "all" ? "selected" : ""}>全部属性</option>`,
        ...TYPE_KEYS_UI.map((k) => `<option value="${escapeHtml(k)}" ${type === k ? "selected" : ""}>${escapeHtml(TYPE_ZH_MAP[k] ?? k)}</option>`),
      ].join("");

      const sortOptions = [
        `<option value="power" ${sort === "power" ? "selected" : ""}>战力</option>`,
        `<option value="lvl" ${sort === "lvl" ? "selected" : ""}>等级</option>`,
        `<option value="dex" ${sort === "dex" ? "selected" : ""}>图鉴</option>`,
      ].join("");

      const dirOptions = [
        `<option value="desc" ${dir === "desc" ? "selected" : ""}>倒序</option>`,
        `<option value="asc" ${dir === "asc" ? "selected" : ""}>正序</option>`,
      ].join("");

      const candidateRows = sorted
        .map((m) => {
          const checked = sel.includes(m.id);
          const pow = monPower(m);
          const types = getMonTypesSimple(m);
          const typeText = types.map((t) => TYPE_ZH_MAP[t] ?? t).join("/");
          const reg = regionLabel(monRegionByDex(m.dex));
          return `
            <div class="row func-mon-row">
              <div class="row__left">
                <div class="row__title row__titleLine">${renderBeastIcon(m.dex, m.name, Boolean(m.isShiny))}<span>${escapeHtml(m.name)}</span><span class="tag">Lv.${m.lvl}</span></div>
                <div class="row__desc">${escapeHtml(reg)} · ${escapeHtml(typeText || "-")} · 战力 ${Math.floor(pow)}</div>
              </div>
              <div class="row__right">
                <input class="chk" type="checkbox" data-train-modal-check="${m.id}" ${checked ? "checked" : ""} ${capLeft <= 0 && !checked ? "disabled" : ""} />
              </div>
            </div>
          `;
        })
        .join("");

      const title = `训练：选择萌灵（剩余槽位 ${capLeft}）`;
      const sub = `支持筛选/排序与多选，点击“开始训练”后会直接加入训练。${trainAwaySkipped > 0 ? `已过滤 ${trainAwaySkipped} 只外出中的伙伴（码头、观察站、浮岛、远航、泡汤、送信、入梦、垂钓、烘焙、气球旅行、游乐园值班、夜营观星）。` : ""}`;
      const empty = sorted.length === 0 ? `<div class="row"><div class="row__left"><div class="row__desc muted">暂无可选萌灵</div></div></div>` : "";
      const statusHint = capLeft <= 0 ? " · 训练槽位已满" : "";
      const canConfirm = capLeft > 0 && sel.length > 0;

      trainingModalHtml = `
        <div class="modalOverlay" data-train-modal-overlay="1">
          <div class="modal">
            <div class="modal__header">
              <div class="modal__title">${renderBuildingSvg("trainingGround", 20)}<span>训练：选择萌灵</span><span class="tag">剩余槽位 ${capLeft}</span></div>
              <div class="modal__right">
                <button class="btn btn--small" data-train-modal-clear="1">清空</button>
                <button class="btn btn--small" data-train-modal-close="1">关闭</button>
              </div>
            </div>
            <div class="modal__desc">${escapeHtml(sub)}</div>
            <div class="modal__body">
              <div class="row modal-filter-row">
                <div class="row__left">
                  <div class="row__title row__titleLine">${renderResSvg("searchFlare", 18)}<span>筛选 / 排序</span><span class="tag">已选 ${sel.length}/${capLeft}</span></div>
                  <div class="row__desc">按栖息地、属性或战力筛选候补萌灵${statusHint}</div>
                </div>
                <div class="row__right">
                  <select class="input" data-train-modal-region>${regionOptions}</select>
                  <select class="input" data-train-modal-type>${typeOptions}</select>
                  <select class="input" data-train-modal-sort>${sortOptions}</select>
                  <select class="input" data-train-modal-dir>${dirOptions}</select>
                  <input class="input" type="text" inputmode="search" placeholder="搜索：图鉴编号或名称" value="${escapeHtml(q)}" data-train-modal-q />
                </div>
              </div>
              ${empty}
              ${candidateRows}
            </div>
            <div class="actions">
              <button class="btn btn--ghost" data-train-modal-close="1">取消</button>
              <button class="btn btn--primary" data-train-modal-confirm="1" ${canConfirm ? "" : "disabled"}>开始训练</button>
            </div>
          </div>
        </div>
      `;
    }

    let breedingModalHtml = "";
    if (ui.breedingModalOpen) {
      // 远征与饲养互斥：远征中的萌灵不可进饲养位
      const expBusyIds = new Set(
        Boolean(state.expedition?.on) && Array.isArray(state.expedition.activeIds) ? state.expedition.activeIds : [],
      );
      const allCandidates = list.filter((m) => m && !expBusyIds.has(m.id));

      const q0 = typeof ui.breedingModalQuery === "string" ? ui.breedingModalQuery : "";
      const q = String(q0 || "").trim();
      ui.breedingModalQuery = q;
      const qIsDigits = /^\d+$/.test(q);
      const qDex = qIsDigits ? Math.max(1, Math.floor(Number(q))) : null;
      const qLower = q.toLowerCase();

      const region0 = typeof ui.breedingModalRegion === "string" ? ui.breedingModalRegion : "all";
      const region = ["all", "meadow", "woods", "brook", "plateau", "dunes", "garden", "ridge", "hollow"].includes(region0) ? region0 : "all";
      const type0 = typeof ui.breedingModalType === "string" ? ui.breedingModalType : "all";
      const type = type0 === "all" || TYPE_KEYS_UI.includes(type0) ? type0 : "all";
      const sort0 = typeof ui.breedingModalSort === "string" ? ui.breedingModalSort : "power";
      const sort = ["power", "lvl", "dex", "iv"].includes(sort0) ? sort0 : "power";

      const dir0 = typeof ui.breedingModalSortDir === "string" ? ui.breedingModalSortDir : "";
      const dir = dir0 === "asc" || dir0 === "desc" ? dir0 : sort === "dex" ? "asc" : "desc";
      if (dir !== ui.breedingModalSortDir) ui.breedingModalSortDir = dir;

      const filtered = allCandidates
        .filter((m) => (region === "all" ? true : monRegionByDex(m.dex) === region))
        .filter((m) => (type === "all" ? true : getMonTypesSimple(m).includes(type)))
        .filter((m) => {
          if (!q) return true;
          if (qDex && Number.isFinite(qDex)) return Math.floor(m.dex ?? 0) === qDex;
          const nm = typeof m.name === "string" ? m.name : "";
          return nm.toLowerCase().includes(qLower);
        });

      const sorted = sortMons(filtered, sort, dir);

      const aliveSet = new Set(allCandidates.map((m) => m.id));
      const sel0 = Array.isArray(ui.breedingModalSelectedIds) ? ui.breedingModalSelectedIds : [];
      const sel = sel0.filter((id) => aliveSet.has(id)).slice(0, 2);
      ui.breedingModalSelectedIds = sel;
      const selMonA = typeof sel[0] === "number" ? allCandidates.find((m) => m.id === sel[0]) ?? null : null;
      const selMonB = typeof sel[1] === "number" ? allCandidates.find((m) => m.id === sel[1]) ?? null : null;

      const regionOptions = [
        { k: "all", n: "全部区域" },
        { k: "meadow", n: "芽芽草甸" },
        { k: "woods", n: "蜜露林径" },
        { k: "brook", n: "溪光浅滩" },
        { k: "plateau", n: "风铃高原" },
        { k: "dunes", n: "星砂荒漠" },
        { k: "garden", n: "月见花园" },
        { k: "ridge", n: "霜晶山脊" },
        { k: "hollow", n: "龙眠幽谷" },
      ]
        .map((x) => `<option value="${x.k}" ${region === x.k ? "selected" : ""}>${x.n}</option>`)
        .join("");

      const typeOptions = [
        `<option value="all" ${type === "all" ? "selected" : ""}>全部属性</option>`,
        ...TYPE_KEYS_UI.map((k) => `<option value="${escapeHtml(k)}" ${type === k ? "selected" : ""}>${escapeHtml(TYPE_ZH_MAP[k] ?? k)}</option>`),
      ].join("");

      const sortOptions = [
        `<option value="power" ${sort === "power" ? "selected" : ""}>战力</option>`,
        `<option value="iv" ${sort === "iv" ? "selected" : ""}>潜力</option>`,
        `<option value="lvl" ${sort === "lvl" ? "selected" : ""}>等级</option>`,
        `<option value="dex" ${sort === "dex" ? "selected" : ""}>图鉴</option>`,
      ].join("");

      const dirOptions = [
        `<option value="desc" ${dir === "desc" ? "selected" : ""}>倒序</option>`,
        `<option value="asc" ${dir === "asc" ? "selected" : ""}>正序</option>`,
      ].join("");

      const candidateRows = sorted
        .map((m) => {
          const checked = sel.includes(m.id);
          const pow = monPower(m);
          const ivSum = sumMonIv(m);
          const abInfo = getAbilityInfo(resolveParentAbilityId(m));
          const types = getMonTypesSimple(m);
          const typeText = types.map((t) => TYPE_ZH_MAP[t] ?? t).join("/");
          const reg = regionLabel(monRegionByDex(m.dex));
          const starBadge = (m.stars ?? 0) > 0 ? `<span class="tag">${m.stars}星</span>` : "";
          return `
            <div class="row func-mon-row">
              <div class="row__left">
                <div class="row__title row__titleLine">${renderBeastIcon(m.dex, m.name, Boolean(m.isShiny))}<span>${escapeHtml(m.name)}</span><span class="tag">Lv.${m.lvl}</span>${starBadge}<span class="tag">潜力 ${ivSum}/186</span></div>
                <div class="row__desc">${escapeHtml(reg)} · ${escapeHtml(typeText || "-")} · 战力 ${Math.floor(pow)}${abInfo ? ` · 特性「${escapeHtml(abInfo.name)}」` : ""}</div>
              </div>
              <div class="row__right">
                <input class="chk" type="checkbox" data-breed-modal-check="${m.id}" ${checked ? "checked" : ""} ${sel.length >= 2 && !checked ? "disabled" : ""} />
              </div>
            </div>
          `;
        })
        .join("");

      const title = `饲养：选择萌灵（需要 2 只）`;
      const sub = `支持按潜力/战力筛选排序（最多选 2 只），勾选双亲可实时预览优生子代潜力、闪光概率并锁定遗传特性。`;
      const empty = sorted.length === 0 ? `<div class="row"><div class="row__left"><div class="row__desc muted">暂无可选萌灵</div></div></div>` : "";
      const canConfirm = sel.length === 2;

      breedingModalHtml = `
        <div class="modalOverlay" data-breed-modal-overlay="1">
          <div class="modal">
            <div class="modal__header">
              <div class="modal__title">${renderBuildingSvg("breedingHouse", 20)}<span>饲养：选择萌灵</span><span class="tag">需要 2 只</span></div>
              <div class="modal__right">
                <button class="btn btn--small" data-breed-modal-clear="1">清空</button>
                <button class="btn btn--small" data-breed-modal-close="1">关闭</button>
              </div>
            </div>
            <div class="modal__desc">${escapeHtml(sub)}</div>
            <div class="modal__body">
              <div class="row modal-filter-row">
                <div class="row__left">
                  <div class="row__title row__titleLine">${renderResSvg("searchFlare", 18)}<span>筛选 / 排序</span><span class="tag">已选 ${sel.length}/2</span></div>
                  <div class="row__desc">同进化链双亲或幻彩星泥配对可温养产蛋</div>
                </div>
                <div class="row__right">
                  <select class="input" data-breed-modal-region>${regionOptions}</select>
                  <select class="input" data-breed-modal-type>${typeOptions}</select>
                  <select class="input" data-breed-modal-sort>${sortOptions}</select>
                  <select class="input" data-breed-modal-dir>${dirOptions}</select>
                  <input class="input" type="text" inputmode="search" placeholder="搜索：图鉴编号或名称" value="${escapeHtml(q)}" data-breed-modal-q />
                </div>
              </div>
              ${renderEugenicsPreviewCard(selMonA, selMonB, "配对优生预览 · 闪光提率与特性遗传")}
              ${empty}
              ${candidateRows}
            </div>
            <div class="actions">
              <button class="btn btn--ghost" data-breed-modal-close="1">取消</button>
              <button class="btn btn--primary" data-breed-modal-confirm="1" ${canConfirm ? "" : "disabled"}>开始饲养</button>
            </div>
          </div>
        </div>
      `;
    }

    rows.push(`<div class="sidebar__divider"></div>`);

    const hideExpedition = Boolean(ui.functionsHideExpedition);
    const expeditionSeasonLabel = resolveExpeditionSeasonLabel(ui.remoteConfig);
    const expeditionSeasonBlurb = getExpeditionSeasonBlurb(resolveSeasonId(ui.remoteConfig));
    const relicLines = seasonRelicLines(state);
    const relicDesc =
      relicLines.length > 0
        ? `本季印记：${relicLines.map((r) => `${r.name}×${r.count}`).join(" · ")}`
        : "本季印记：尚未获得（远征完成有概率掉落独特印记道具）";

    rows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title row__titleLine">${renderBuildingSvg("expeditionPost", 18)}<span>远征所</span><span class="tag">${escapeHtml(expeditionSeasonLabel)}</span></div>
          <div class="row__desc">${escapeHtml(expeditionSeasonBlurb)}。派遣萌灵下副本：完成后获得经验与未来币，并概率掉落药剂。属性克制可提高远征收益。</div>
          <div class="row__desc">${escapeHtml(relicDesc)}</div>
        </div>
        <div class="row__right">
          <button class="btn btn--small btn--ghost" data-func-toggle="expedition">${hideExpedition ? "▸" : "▾"}</button>
        </div>
      </div>
    `);

    const postLvl = clamp(state.buildings?.expeditionPost?.owned ?? 0, 0, 10);
    const expeditionUnlocked = postLvl > 0;
    if (!state.expedition || typeof state.expedition !== "object") {
      state.expedition = {
        on: false,
        selectedLevel: "basic",
        selectedDungeonKey: null,
        selectedIds: [],
        activeIds: [],
        remainingSec: 0,
        totalSec: 0,
        rewardExp: 0,
        rewardCoin: 0,
        rewardPotionTotal: 0,
        dungeonType: null,
        dungeons: null,
      };
    }
    if (!Array.isArray(state.expedition.selectedIds)) state.expedition.selectedIds = [];
    if (!Array.isArray(state.expedition.activeIds)) state.expedition.activeIds = [];

    const expOn = Boolean(state.expedition.on) && (state.expedition.remainingSec ?? 0) > 0;

    const typeMap = TYPE_ZH && typeof TYPE_ZH === "object" ? TYPE_ZH : {};
    const TYPE_KEYS = Object.keys(typeMap);
    const getMonTypes = (m) => getMonTypesForExpedition(m, getBeastDataByDex);
    const typeMul = (m, dungeonType) => expeditionTypeMul(m, dungeonType, getBeastDataByDex);
    const expeditionRewardMul = (mons, dungeonType) => {
      if (!Array.isArray(mons) || mons.length === 0) return 1;
      const avg = mons.reduce((acc, m) => acc + typeMul(m, dungeonType), 0) / mons.length;
      return clamp(avg, 0.75, 1.5);
    };

    const regenAllDungeons = () => {
      if (!Array.isArray(TYPE_KEYS) || TYPE_KEYS.length === 0) return;
      const dungeons = {};
      for (const lvl of EXP_LEVELS) dungeons[lvl.key] = pickExpeditionDungeons(TYPE_KEYS);
      state.expedition.dungeons = dungeons;
    };

    if (!state.expedition.dungeons || typeof state.expedition.dungeons !== "object") {
      regenAllDungeons();
    } else {
      ensureExpeditionDungeonTiers(state.expedition.dungeons, TYPE_KEYS);
    }

    const selLvl = typeof state.expedition.selectedLevel === "string" ? state.expedition.selectedLevel : "basic";
    const lvlDef = getExpLevelDef(selLvl);

    const levelOptions = EXP_LEVELS.map((x) => {
      const unlocked = postLvl >= x.unlockLvl;
      const sel = selLvl === x.key;
      return `<option value="${x.key}" ${sel ? "selected" : ""} ${unlocked ? "" : "disabled"}>${x.name}${unlocked ? "" : "（未解锁）"}</option>`;
    }).join("");

    if (!hideExpedition) {
      if (!expeditionUnlocked) {
        const trainOk = (state.buildings.trainingGround?.owned ?? 0) > 0;
        const breedOk = (state.buildings.breedingHouse?.owned ?? 0) > 0;
        const chainHint = trainOk && breedOk
          ? "训练场与育灵屋已就绪，在「建筑」页建造远征所即可解锁。"
          : "需先建造训练场与育灵屋，再建造远征所。";
        rows.push(`
          <div class="row is-locked">
            <div class="row__left">
              <div class="row__title">未解锁</div>
              <div class="row__desc">${escapeHtml(chainHint)}</div>
            </div>
          </div>
        `);
      } else {
        rows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title row__titleLine">${renderResSvg("searchFlare", 18)}<span>远征等级</span><span class="tag">远征所 Lv.${postLvl}</span></div>
          <div class="row__desc">提升远征所建筑等级可解锁更高阶远征秘境</div>
        </div>
        <div class="row__right">
          <select class="input" data-exp-lvl ${expOn ? "disabled" : ""}>${levelOptions}</select>
        </div>
      </div>
    `);

        const dungeons = state.expedition.dungeons?.[selLvl];
        const dlist = Array.isArray(dungeons) ? dungeons : [];
        if (!state.expedition.selectedDungeonKey || !dlist.some((x) => x.key === state.expedition.selectedDungeonKey)) {
          state.expedition.selectedDungeonKey = dlist[0]?.key ?? null;
        }
        const dungeonObj = dlist.find((x) => x && x.key === state.expedition.selectedDungeonKey) ?? dlist[0] ?? null;
        const dungeonType = dungeonObj?.type ?? null;

        const dungeonBtnsHtml = dlist
          .map((d) => {
            const zh = typeMap[d.type] ?? d.type;
            const selected = d.key === state.expedition.selectedDungeonKey;
            return `<button class="btn btn--small ${selected ? "btn--primary" : "btn--ghost"}" data-exp-dungeon="${escapeHtml(d.key)}" ${expOn ? "disabled" : ""}>${escapeHtml(zh)}副本${selected ? " ✓" : ""}</button>`;
          })
          .join("");
        const selDungeonZh = dungeonType ? (typeMap[dungeonType] ?? dungeonType) : "默认";
        rows.push(`
        <div class="row modal-filter-row">
          <div class="row__left">
            <div class="row__title row__titleLine">${renderResSvg("megaStone", 18)}<span>远征秘境属性</span><span class="tag">当前：${escapeHtml(selDungeonZh)}副本</span><span class="tag">需求战力 ${lvlDef.req}</span></div>
            <div class="row__desc">选择克制目标属性的队伍出征，可获得最高 1.5× 收益加成。</div>
          </div>
          <div class="row__right">
            ${dungeonBtnsHtml}
          </div>
        </div>
      `);

        // 远征与饲养互斥：饲养中的萌灵不可远征
        const breedBusyIds = new Set(
          state.breeding?.on
            ? [state.breeding.aId, state.breeding.bId].filter((x) => typeof x === "number")
            : [],
        );
        // ML-14 统一忙碌排除：外出 / 驻场中的伙伴不能留在远征编队里
        const selectedIds0 = expOn ? state.expedition.selectedIds.slice(0, 20) : dropAwayMonIds(state, state.expedition.selectedIds.slice(0, 20));
        const selectedIds1 = selectedIds0.filter((id) => {
          if (breedBusyIds.has(id)) return false;
          const m = list.find((x) => x && x.id === id) ?? null;
          if (!m) return false;
          const cd0 =
            typeof m.skillCdRemainingSec === "number" && Number.isFinite(m.skillCdRemainingSec)
              ? Math.max(0, m.skillCdRemainingSec)
              : 0;
          return cd0 <= 0;
        });
        state.expedition.selectedIds = selectedIds1;
        const selectedIds = selectedIds1;
        const selectedMons = selectedIds.map((id) => list.find((m) => m && m.id === id) ?? null).filter((x) => x);

        const selectedSet = new Set(selectedIds);

        let expTeamModalHtml = "";

        const effPower = selectedMons.reduce((acc, m) => acc + monPower(m) * typeMul(m, dungeonType), 0);
        const canStartExp = !expOn && selectedMons.length > 0 && effPower >= lvlDef.req;
        const baseSec = 7200;
        const excessPct = canStartExp ? Math.max(0, (effPower - lvlDef.req) / lvlDef.req) : 0;
        const natureTimeMul = expeditionNatureTimeMul(selectedMons);
        const expPerkTimeMul = legacyExpeditionTimeMul(state);
        const expPerkRewardMul = legacyExpeditionRewardMul(state);
        const totalSec = canStartExp
          ? Math.max(60, Math.ceil((baseSec / Math.pow(1.01, excessPct * 100)) * natureTimeMul * expPerkTimeMul))
          : Math.max(60, Math.ceil(baseSec * expPerkTimeMul));
        const rewardMul = expeditionRewardMul(selectedMons, dungeonType);
        const natureHint =
          natureTimeMul < 0.999
            ? ` · 性格加速 ×${(1 / natureTimeMul).toFixed(2)}`
            : "";
        const perkHint =
          expPerkTimeMul < 0.999
            ? ` · 远征达人 -${Math.round((1 - expPerkTimeMul) * 100)}%耗时/+${Math.round((expPerkRewardMul - 1) * 100)}%收益`
            : "";
        const rewardExp = Math.floor(lvlDef.exp * rewardMul * expPerkRewardMul);
        const rewardCoin = Math.floor(lvlDef.coin * rewardMul * expPerkRewardMul);

        rows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title row__titleLine">${renderUiIcon("tab_mons", 18)}<span>远征队伍</span><span class="tag">已选 ${selectedMons.length}/20</span><span class="tag">战力 ${Math.floor(effPower)}/${lvlDef.req}</span></div>
          <div class="row__desc">预计用时：${fmtDuration(totalSec)}${natureHint}${perkHint} · 属性相性 x${rewardMul.toFixed(2)}</div>
        </div>
        <div class="row__right">
          <button class="btn btn--small" data-exp-team-open ${expOn ? "disabled" : ""}>选择队员</button>
          <button class="btn btn--small" data-exp-clear ${expOn ? "disabled" : ""}>清空</button>
        </div>
      </div>
    `);

        if (ui.expeditionTeamModalOpen) {
          const filter0 = typeof ui.expeditionTeamTypeFilter === "string" ? ui.expeditionTeamTypeFilter : "all";
          const filter = filter0 && (filter0 === "all" || TYPE_KEYS.includes(filter0)) ? filter0 : "all";
          if (filter !== ui.expeditionTeamTypeFilter) ui.expeditionTeamTypeFilter = filter;

          const typeOptions = [
            `<option value="all" ${filter === "all" ? "selected" : ""}>全部属性</option>`,
            ...TYPE_KEYS.map((k) => `<option value="${k}" ${filter === k ? "selected" : ""}>${escapeHtml(typeMap[k] ?? k)}</option>`),
          ].join("");

          // ML-14 统一忙碌排除：外出 / 驻场中的伙伴不出现在远征候选与「一键选择」里
          const expAwayCount = list.filter(Boolean).length - excludeAwayMons(state, list).length;
          const candidates = excludeAwayMons(state, list).filter((m) => {
            if (breedBusyIds.has(m.id)) return false;
            const cd0 =
              typeof m.skillCdRemainingSec === "number" && Number.isFinite(m.skillCdRemainingSec)
                ? Math.max(0, m.skillCdRemainingSec)
                : 0;
            return cd0 <= 0;
          });

          const candidates1 = filter === "all" ? candidates : candidates.filter((m) => getMonTypes(m).includes(filter));

          const candidateWithPower = candidates1
            .map((m) => ({ m, effPower: monPower(m) * typeMul(m, dungeonType) }))
            .sort((a, b) => (b.effPower ?? 0) - (a.effPower ?? 0));

          if (ui.expeditionTeamAutoPick) {
            ui.expeditionTeamAutoPick = false;
            state.expedition.selectedIds = candidateWithPower.slice(0, 20).map((x) => x.m.id);
          }

          const selNow = Array.isArray(state.expedition.selectedIds) ? state.expedition.selectedIds.slice(0, 20) : [];
          const selSetNow = new Set(selNow);

          const candidateRows = candidateWithPower
            .map(({ m, effPower }) => {
              const checked = selSetNow.has(m.id);
              const power = Math.floor(effPower);
              const mul = typeMul(m, dungeonType);
              const disabled = expOn || (!checked && selNow.length >= 20);
              const rightText = expOn ? "远征中" : "";
              return `
            <div class="row func-mon-row">
              <div class="row__left">
                <div class="row__title row__titleLine">${renderBeastIcon(m.dex, m.name, Boolean(m.isShiny))}<span>${escapeHtml(m.name)}</span><span class="tag">Lv.${m.lvl}</span></div>
                <div class="row__desc">战力 ${power} · 属性相性 x${mul.toFixed(2)}${rightText ? ` · ${escapeHtml(rightText)}` : ""}</div>
              </div>
              <div class="row__right">
                <input class="chk" type="checkbox" data-exp-team-check="${m.id}" ${checked ? "checked" : ""} ${disabled ? "disabled" : ""} />
              </div>
            </div>
          `;
            })
            .join("");

          expTeamModalHtml = `
        <div class="modalOverlay" data-exp-team-overlay="1">
          <div class="modal">
            <div class="modal__header">
              <div class="modal__title">${renderBuildingSvg("expeditionPost", 20)}<span>选择远征队员</span><span class="tag">已选 ${selNow.length}/20</span></div>
              <div class="modal__right">
                <select class="input" data-exp-team-type>${typeOptions}</select>
                <button class="btn btn--small" data-exp-team-auto ${expOn ? "disabled" : ""}>一键选择</button>
                <button class="btn btn--small" data-exp-clear ${expOn ? "disabled" : ""}>清空</button>
                <button class="btn btn--small" data-exp-team-close="1">关闭</button>
              </div>
            </div>
            <div class="modal__desc">多选请直接勾选（最多 20 只，技能冷却、饲养中以及外出中的萌灵不会出现在列表中${expAwayCount > 0 ? `，已过滤外出伙伴 ${expAwayCount} 只` : ""}）。</div>
            <div class="modal__body">${candidateRows}</div>
            <div class="actions">
              <button class="btn btn--primary" data-exp-team-close="1">完成编队</button>
            </div>
          </div>
        </div>
      `;
        }

        if (!expOn) {
          const quickOn = Boolean(ui.expeditionQuick);
          rows.push(`
        <div class="row">
          <div class="row__left">
            <div class="row__title row__titleLine">${renderResSvg("futurecoin", 18)}<span>开始远征</span><span class="tag">+${rewardCoin} 未来币</span></div>
            <div class="row__desc">奖励：经验 +${rewardExp}（每只参与萌灵）· 未来币 +${rewardCoin} · 药剂掉落总数 ${lvlDef.pot} · 属性相性 x${rewardMul.toFixed(2)}</div>
            <div class="row__desc muted">急行：时长约 ×0.3，奖励约 ×0.7</div>
          </div>
          <div class="row__right">
            <label class="check" style="margin-right:8px">
              <input type="checkbox" data-exp-quick ${quickOn ? "checked" : ""} />
              <span>急行</span>
            </label>
            <button class="btn btn--primary" data-exp-start ${canStartExp ? "" : "disabled"}>${quickOn ? "急行出征" : "出征"}</button>
          </div>
        </div>
      `);
        } else {
          const rem =
            typeof state.expedition.remainingSec === "number" && Number.isFinite(state.expedition.remainingSec)
              ? Math.max(0, state.expedition.remainingSec)
              : 0;
          rows.push(`
        <div class="row">
          <div class="row__left">
            <div class="row__title row__titleLine">${renderBuildingSvg("expeditionPost", 18)}<span>远征中</span><span class="tag">剩余 ${fmtDuration(rem)}</span></div>
            <div class="row__desc">秘境探索进行中，归来后自动结算经验与未来币收益。</div>
          </div>
          <div class="row__right">
            <button class="btn btn--danger btn--small" data-exp-cancel>取消远征</button>
          </div>
        </div>
      `);
        }

        if (expTeamModalHtml) rows.push(expTeamModalHtml);
      }
    }

    if (trainingModalHtml) rows.push(trainingModalHtml);
    if (breedingModalHtml) rows.push(breedingModalHtml);
    if (ecoSquadModalHtml) rows.push(ecoSquadModalHtml);
    if (starCampModalHtml) rows.push(starCampModalHtml);
    if (funcLeagueModalHtml) rows.push(funcLeagueModalHtml);
    if (wishDockModalHtml) rows.push(wishDockModalHtml);
    if (dreamModalHtml) rows.push(dreamModalHtml);
    if (fishModalHtml) rows.push(fishModalHtml);
    if (bakeryModalHtml) rows.push(bakeryModalHtml);
    if (balloonModalHtml) rows.push(balloonModalHtml);
    if (parkModalHtml) rows.push(parkModalHtml);
    if (stargazeModalHtml) rows.push(stargazeModalHtml);
    if (springModalHtml) rows.push(springModalHtml);
    if (postModalHtml) rows.push(postModalHtml);
    if (treasureModalHtml) rows.push(treasureModalHtml);
    if (bandModalHtml) rows.push(bandModalHtml);
    if (skyIslandModalHtml) rows.push(skyIslandModalHtml);
    if (nightObsModalHtml) rows.push(nightObsModalHtml);
    if (acrobatShowModalHtml) rows.push(acrobatShowModalHtml);
    setHtmlPreservingStage(elFunctionsTraining, rows.join(""));

    try {
      const body = elFunctionsTraining.querySelector('.modalOverlay[data-train-modal-overlay="1"] .modal__body');
      if (body) body.scrollTop = prevTrainModalBodyScrollTop;
      const breedBody = elFunctionsTraining.querySelector('.modalOverlay[data-breed-modal-overlay="1"] .modal__body');
      if (breedBody) breedBody.scrollTop = prevBreedModalBodyScrollTop;
      const expTeamBody = elFunctionsTraining.querySelector('.modalOverlay[data-exp-team-overlay="1"] .modal__body');
      if (expTeamBody) prevExpTeamModalBodyScrollTop = expTeamBody.scrollTop;
      const ecoModalBody = elFunctionsTraining.querySelector('.modalOverlay[data-eco-modal-overlay="1"] .modal__body');
      if (ecoModalBody && typeof ui.__ecoModalScrollTop === "number") ecoModalBody.scrollTop = ui.__ecoModalScrollTop;
      const campModalBody = elFunctionsTraining.querySelector('.modalOverlay[data-camp-modal-overlay="1"] .modal__body');
      if (campModalBody && typeof ui.__campModalScrollTop === "number") campModalBody.scrollTop = ui.__campModalScrollTop;
      const leagueModalBody = elFunctionsTraining.querySelector('.modalOverlay[data-func-league-modal-overlay="1"] .modal__body');
      if (leagueModalBody && typeof ui.__leagueModalScrollTop === "number") leagueModalBody.scrollTop = ui.__leagueModalScrollTop;
      const dockModalBody = elFunctionsTraining.querySelector('.modalOverlay[data-dock-modal-overlay="1"] .modal__body');
      if (dockModalBody && typeof ui.__dockModalScrollTop === "number") dockModalBody.scrollTop = ui.__dockModalScrollTop;
      const nightModalBody = elFunctionsTraining.querySelector('.modalOverlay[data-night-modal-overlay="1"] .modal__body');
      if (nightModalBody && typeof ui.__nightModalScrollTop === "number") nightModalBody.scrollTop = ui.__nightModalScrollTop;
      const showModalBody = elFunctionsTraining.querySelector('.modalOverlay[data-show-modal-overlay="1"] .modal__body');
      if (showModalBody && typeof ui.__showModalScrollTop === "number") showModalBody.scrollTop = ui.__showModalScrollTop;
      const islandModalBody = elFunctionsTraining.querySelector('.modalOverlay[data-island-modal-overlay="1"] .modal__body');
      if (islandModalBody && typeof ui.__islandModalScrollTop === "number") islandModalBody.scrollTop = ui.__islandModalScrollTop;
      const treasureModalBody = elFunctionsTraining.querySelector('.modalOverlay[data-treasure-modal-overlay="1"] .modal__body');
      if (treasureModalBody && typeof ui.__treasureModalScrollTop === "number") treasureModalBody.scrollTop = ui.__treasureModalScrollTop;
      const bandModalBody = elFunctionsTraining.querySelector('.modalOverlay[data-band-modal-overlay="1"] .modal__body');
      if (bandModalBody && typeof ui.__bandModalScrollTop === "number") bandModalBody.scrollTop = ui.__bandModalScrollTop;
      const springModalBody = elFunctionsTraining.querySelector('.modalOverlay[data-spring-modal-overlay="1"] .modal__body');
      if (springModalBody && typeof ui.__springModalScrollTop === "number") springModalBody.scrollTop = ui.__springModalScrollTop;
      const postModalBody = elFunctionsTraining.querySelector('.modalOverlay[data-post-modal-overlay="1"] .modal__body');
      if (postModalBody && typeof ui.__postModalScrollTop === "number") postModalBody.scrollTop = ui.__postModalScrollTop;
      const dreamModalBody = elFunctionsTraining.querySelector('.modalOverlay[data-dream-modal-overlay="1"] .modal__body');
      if (dreamModalBody && typeof ui.__dreamModalScrollTop === "number") dreamModalBody.scrollTop = ui.__dreamModalScrollTop;
      const fishModalBody = elFunctionsTraining.querySelector('.modalOverlay[data-fish-modal-overlay="1"] .modal__body');
      if (fishModalBody && typeof ui.__fishModalScrollTop === "number") fishModalBody.scrollTop = ui.__fishModalScrollTop;
      const bakeryModalBody = elFunctionsTraining.querySelector('.modalOverlay[data-bakery-modal-overlay="1"] .modal__body');
      if (bakeryModalBody && typeof ui.__bakeryModalScrollTop === "number") bakeryModalBody.scrollTop = ui.__bakeryModalScrollTop;
      const balloonModalBody = elFunctionsTraining.querySelector('.modalOverlay[data-balloon-modal-overlay="1"] .modal__body');
      if (balloonModalBody && typeof ui.__balloonModalScrollTop === "number") balloonModalBody.scrollTop = ui.__balloonModalScrollTop;
      const parkModalBody = elFunctionsTraining.querySelector('.modalOverlay[data-park-modal-overlay="1"] .modal__body');
      if (parkModalBody && typeof ui.__parkModalScrollTop === "number") parkModalBody.scrollTop = ui.__parkModalScrollTop;
      const stargazeModalBody = elFunctionsTraining.querySelector('.modalOverlay[data-stargaze-modal-overlay="1"] .modal__body');
      if (stargazeModalBody && typeof ui.__stargazeModalScrollTop === "number") stargazeModalBody.scrollTop = ui.__stargazeModalScrollTop;

      if (prevFocusKind === "train") {
        const inp = elFunctionsTraining.querySelector('input[data-train-modal-q]');
        if (inp && typeof inp.focus === "function") {
          inp.focus();
          if (typeof inp.setSelectionRange === "function" && typeof prevFocusStart === "number" && typeof prevFocusEnd === "number") {
            inp.setSelectionRange(prevFocusStart, prevFocusEnd);
          }
        }
      } else if (prevFocusKind === "breed") {
        const inp = elFunctionsTraining.querySelector('input[data-breed-modal-q]');
        if (inp && typeof inp.focus === "function") {
          inp.focus();
          if (typeof inp.setSelectionRange === "function" && typeof prevFocusStart === "number" && typeof prevFocusEnd === "number") {
            inp.setSelectionRange(prevFocusStart, prevFocusEnd);
          }
        }
      }
      if (prevPageScrollY > 0 && typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
        window.requestAnimationFrame(() => {
          try {
            const nowY = window.scrollY || 0;
            if (Math.abs(nowY - prevPageScrollY) > 2) window.scrollTo(window.scrollX || 0, prevPageScrollY);
          } catch {
          }
        });
      }
    } catch {
    }
    ui.functionsDirty = false;
  };
}

export function initFunctionsTab({
  elFunctionsTraining,
  ui,
  clamp,
  fmtDuration,
  monPower,
  getBeastDataByDex,
  markFunctionsDirty,
  markMonListDirty,
  markMonsDirty,
  addExpToMon,
  addLog,
  addRes,
  render,
  getState,
  getSpeciesByPid,
  createMonInstance,
}) {
  if (!elFunctionsTraining) return;

  const stateRef = () => (typeof getState === "function" ? getState() : null);

  const SELECT_FOCUS_SELECTOR =
    "select[data-exp-lvl],select[data-exp-team-type],select[data-train-modal-region],select[data-train-modal-type],select[data-train-modal-sort],select[data-breed-modal-region],select[data-breed-modal-type],select[data-breed-modal-sort],select[data-mint-mon],select[data-boutique-target-mon],select[data-amber-target-mon]";

  const focusOn = () => { ui.functionsFocus = true; };
  const focusOff = () => {
    ui.functionsFocus = false;
    markFunctionsDirty();
    render();
  };

  for (const [evt, handler] of [
    ["pointerdown", focusOn],
    ["mousedown", focusOn],
    ["touchstart", focusOn],
    ["focusin", focusOn],
    ["focusout", focusOff],
  ]) {
    elFunctionsTraining.addEventListener(evt, (ev) => {
      const sel = ev.target?.closest?.(SELECT_FOCUS_SELECTOR);
      if (!sel || !elFunctionsTraining.contains(sel)) return;
      handler();
    }, true);
  }

  elFunctionsTraining.addEventListener("input", (ev) => {
    const tQ = ev.target?.closest?.("input[data-train-modal-q]");
    if (tQ && elFunctionsTraining.contains(tQ)) {
      ui.trainingModalQuery = String(tQ.value || "");
      markFunctionsDirty();
      render();
      return;
    }

    const bQ = ev.target?.closest?.("input[data-breed-modal-q]");
    if (bQ && elFunctionsTraining.contains(bQ)) {
      ui.breedingModalQuery = String(bQ.value || "");
      markFunctionsDirty();
      render();
    }
  });

  elFunctionsTraining.addEventListener("change", (ev) => {
    const sel = ev.target?.closest?.("select[data-exp-team-type]");
    if (!sel || !elFunctionsTraining.contains(sel)) return;
    ui.expeditionTeamTypeFilter = String(sel.value || "all");
    ui.functionsFocus = false;
    markFunctionsDirty();
    render();
  });

  elFunctionsTraining.addEventListener("change", (ev) => {
    const lvlSel = ev.target?.closest?.("select[data-exp-lvl]");
    if (lvlSel && elFunctionsTraining.contains(lvlSel)) {
      const state = stateRef();
      if (!state || !state.expedition || typeof state.expedition !== "object") return;
      state.expedition.selectedLevel = String(lvlSel.value || "basic");
      state.expedition.selectedDungeonKey = null;
      markFunctionsDirty();
      render();
      return;
    }
  });

  elFunctionsTraining.addEventListener("change", (ev) => {
    const tRegion = ev.target?.closest?.("select[data-train-modal-region]");
    if (tRegion && elFunctionsTraining.contains(tRegion)) {
      ui.trainingModalRegion = String(tRegion.value || "all");
      markFunctionsDirty();
      render();
      return;
    }
    const tType = ev.target?.closest?.("select[data-train-modal-type]");
    if (tType && elFunctionsTraining.contains(tType)) {
      ui.trainingModalType = String(tType.value || "all");
      markFunctionsDirty();
      render();
      return;
    }
    const tSort = ev.target?.closest?.("select[data-train-modal-sort]");
    if (tSort && elFunctionsTraining.contains(tSort)) {
      ui.trainingModalSort = String(tSort.value || "power");
      markFunctionsDirty();
      render();
      return;
    }
    const tDir = ev.target?.closest?.("select[data-train-modal-dir]");
    if (tDir && elFunctionsTraining.contains(tDir)) {
      ui.trainingModalSortDir = String(tDir.value || "");
      markFunctionsDirty();
      render();
      return;
    }
    const bRegion = ev.target?.closest?.("select[data-breed-modal-region]");
    if (bRegion && elFunctionsTraining.contains(bRegion)) {
      ui.breedingModalRegion = String(bRegion.value || "all");
      markFunctionsDirty();
      render();
      return;
    }
    const bType = ev.target?.closest?.("select[data-breed-modal-type]");
    if (bType && elFunctionsTraining.contains(bType)) {
      ui.breedingModalType = String(bType.value || "all");
      markFunctionsDirty();
      render();
      return;
    }
    const bSort = ev.target?.closest?.("select[data-breed-modal-sort]");
    if (bSort && elFunctionsTraining.contains(bSort)) {
      ui.breedingModalSort = String(bSort.value || "power");
      markFunctionsDirty();
      render();
      return;
    }
    const bDir = ev.target?.closest?.("select[data-breed-modal-dir]");
    if (bDir && elFunctionsTraining.contains(bDir)) {
      ui.breedingModalSortDir = String(bDir.value || "");
      markFunctionsDirty();
      render();
      return;
    }
  });

  elFunctionsTraining.addEventListener("change", (ev) => {
    const state = stateRef();
    if (!state || typeof state !== "object") return;

    const chk = ev.target?.closest?.("input[data-train-modal-check]");
    if (chk && elFunctionsTraining.contains(chk)) {
      const id = Number(chk.getAttribute("data-train-modal-check"));
      if (!Number.isFinite(id)) return;
      if (!state.training || typeof state.training !== "object") state.training = { activeIds: [], slotSize: 0 };
      if (!Array.isArray(state.training.activeIds)) state.training.activeIds = [];
      const slotSize =
        typeof state.training.slotSize === "number" && Number.isFinite(state.training.slotSize)
          ? Math.max(0, Math.floor(state.training.slotSize))
          : 0;
      const used = state.training.activeIds.length;
      const capLeft = Math.max(0, slotSize - used);

      const trainingSet = new Set(state.training.activeIds);
      if (trainingSet.has(id)) {
        chk.checked = false;
        return;
      }
      // ML-14 统一忙碌排除：外出 / 驻场中的伙伴不能被勾选训练
      if (chk.checked && getAwayMonIds(state).has(id)) {
        chk.checked = false;
        return;
      }

      const sel0 = Array.isArray(ui.trainingModalSelectedIds) ? ui.trainingModalSelectedIds : [];
      const aliveSet = new Set(
        (state.mons?.list ?? [])
          .map((m) => (m && typeof m.id === "number" ? m.id : null))
          .filter((x) => typeof x === "number")
      );
      let sel = sel0.filter((x) => aliveSet.has(x) && !trainingSet.has(x));

      if (chk.checked) {
        if (!sel.includes(id)) {
          if (sel.length >= capLeft) {
            chk.checked = false;
            return;
          }
          sel = sel.concat([id]);
        }
      } else {
        sel = sel.filter((x) => x !== id);
      }

      ui.trainingModalSelectedIds = sel;
      markFunctionsDirty();
      render();
      return;
    }

    const bchk = ev.target?.closest?.("input[data-breed-modal-check]");
    if (bchk && elFunctionsTraining.contains(bchk)) {
      const id = Number(bchk.getAttribute("data-breed-modal-check"));
      if (!Number.isFinite(id)) return;
      const sel0 = Array.isArray(ui.breedingModalSelectedIds) ? ui.breedingModalSelectedIds : [];
      const aliveSet = new Set(
        (state.mons?.list ?? [])
          .map((m) => (m && typeof m.id === "number" ? m.id : null))
          .filter((x) => typeof x === "number")
      );
      let sel = sel0.filter((x) => aliveSet.has(x)).slice(0, 2);

      if (bchk.checked) {
        if (!sel.includes(id)) {
          if (sel.length >= 2) {
            bchk.checked = false;
            return;
          }
          sel = sel.concat([id]);
        }
      } else {
        sel = sel.filter((x) => x !== id);
      }

      ui.breedingModalSelectedIds = sel;
      markFunctionsDirty();
      render();
      return;
    }
  });

  elFunctionsTraining.addEventListener("click", (ev) => {
    const state = stateRef();
    if (!state || typeof state !== "object") return;

    const expDailyClaim = ev.target?.closest?.("button[data-func-exp-daily-claim]");
    if (expDailyClaim && elFunctionsTraining.contains(expDailyClaim)) {
      if (expDailyClaim.disabled) return;
      if (!markExpeditionDailyClaimed(state, localDateStr())) {
        addLog("今日远征任务未完成或已领取");
        return;
      }
      addRes("futurecoin", 10);
      addLog("今日远征任务：未来币 +10", true);
      markFunctionsDirty();
      render();
      return;
    }

    const toggleBtn = ev.target?.closest?.("button[data-func-toggle]");
    if (toggleBtn && elFunctionsTraining.contains(toggleBtn)) {
      const key = toggleBtn.getAttribute("data-func-toggle");
      if (key === "training") ui.functionsHideTraining = !Boolean(ui.functionsHideTraining);
      if (key === "breeding") ui.functionsHideBreeding = !Boolean(ui.functionsHideBreeding);
      if (key === "expedition") ui.functionsHideExpedition = !Boolean(ui.functionsHideExpedition);
      if (key === "ecoSandbox") ui.functionsHideEcoSandbox = !Boolean(ui.functionsHideEcoSandbox);
      if (key === "mintWorkshop") ui.functionsHideMintWorkshop = !Boolean(ui.functionsHideMintWorkshop);
      if (key === "starCamp") ui.functionsHideStarCamp = !Boolean(ui.functionsHideStarCamp);
      if (key === "amberRevival") ui.functionsHideAmberRevival = !Boolean(ui.functionsHideAmberRevival);
      if (key === "wishDock") ui.functionsHideWishDock = !Boolean(ui.functionsHideWishDock);
      if (key === "dreamLibrary") ui.functionsHideDreamLibrary = !Boolean(ui.functionsHideDreamLibrary);
      if (key === "fishingClub") ui.functionsHideFishingClub = !Boolean(ui.functionsHideFishingClub);
      if (key === "cloudBakery") ui.functionsHideBakery = !Boolean(ui.functionsHideBakery);
      if (key === "balloonTravel") ui.functionsHideBalloonTravel = !Boolean(ui.functionsHideBalloonTravel);
      if (key === "cloudPark") ui.functionsHideCloudPark = !Boolean(ui.functionsHideCloudPark);
      if (key === "stargazeCamp") ui.functionsHideStargaze = !Boolean(ui.functionsHideStargaze);
      if (key === "hotSpring") ui.functionsHideHotSpring = !Boolean(ui.functionsHideHotSpring);
      if (key === "postOffice") ui.functionsHidePostOffice = !Boolean(ui.functionsHidePostOffice);
      if (key === "treasure") ui.functionsHideTreasure = !Boolean(ui.functionsHideTreasure);
      if (key === "band") ui.functionsHideBand = !Boolean(ui.functionsHideBand);
      if (key === "skyIsland") ui.functionsHideSkyIsland = !Boolean(ui.functionsHideSkyIsland);
      if (key === "migration") ui.functionsHideMigration = !Boolean(ui.functionsHideMigration);
      if (key === "nightObs") ui.functionsHideNightObs = !Boolean(ui.functionsHideNightObs);
      if (key === "acrobatShow") ui.functionsHideAcrobatShow = !Boolean(ui.functionsHideAcrobatShow);
      if (key === "starBoutique") ui.functionsHideStarBoutique = !Boolean(ui.functionsHideStarBoutique);
      if (key === "championLeague") ui.functionsHideChampionLeague = !Boolean(ui.functionsHideChampionLeague);
      markFunctionsDirty();
      render();
      return;
    }

    // --- ML-16 One-click Collect, Cloud Amusement Park & Starry Night Camp Actions ---
    const ml16KeepY = () => (typeof window !== "undefined" ? window.scrollY : 0);
    const ml16Rerender = (keepY, monsChanged = false) => {
      if (monsChanged) {
        markMonListDirty?.(false);
        markMonsDirty?.();
      }
      markFunctionsDirty();
      render();
      if (typeof window !== "undefined" && Math.abs(window.scrollY - keepY) > 0) window.scrollTo(window.scrollX || 0, keepY);
    };
    // 与 tick 结算用同一套属性解析（不传 getMonTypes），保证值班 / 入营时的契合判断与实际结算一致
    const ml16Opts = { addRes, addExpToMon, getBeastDataByDex };

    const awayCollectBtn = ev.target?.closest?.("button[data-away-collect-all]");
    if (awayCollectBtn && elFunctionsTraining.contains(awayCollectBtn)) {
      if (awayCollectBtn.disabled) return;
      const keepY = ml16KeepY();
      const res = collectAllReturnedPartners(state, ml16Opts);
      if (res.ok) {
        for (const c of res.collected) if (c.logLine) addLog(`${c.title}：${c.logLine}`, true);
        addLog(`一键收取：${res.collected.length} 处外出归来已收取，${res.freedMonIds.length} 位伙伴回家了（奖励照常发放）`, true);
        ui.itemsDirty = true;
      } else {
        addLog("暂时没有已归来待收取的伙伴");
      }
      ui.awayReturnedCount = getReturnedPartnersSummary(state).count;
      ml16Rerender(keepY, res.ok);
      return;
    }

    const parkAutoBtn = ev.target?.closest?.("button[data-park-autostaff]");
    if (parkAutoBtn && elFunctionsTraining.contains(parkAutoBtn)) {
      if (parkAutoBtn.disabled) return;
      const keepY = ml16KeepY();
      const res = autoStaffCloudPark(state, ml16Opts);
      addLog(
        res.ok
          ? `云端游乐园：${res.added.length} 位伙伴到游乐设施值班（属性契合 ${res.added.filter((a) => a.match).length} 座，值班期间防放生保护生效）`
          : "暂无可值班的空闲伙伴，或开放的设施都有人了",
      );
      ml16Rerender(keepY, res.ok);
      return;
    }

    const parkShowBtn = ev.target?.closest?.("button[data-park-show]");
    if (parkShowBtn && elFunctionsTraining.contains(parkShowBtn)) {
      if (parkShowBtn.disabled) return;
      const keepY = ml16KeepY();
      const res = performParkExtraShow(state, ml16Opts);
      if (res.ok) addLog(`云端游乐园：${res.logLine}`, true);
      else addLog(res.reason === "no_operators" ? "加场演出需要先有伙伴值班" : `今日免费加场已用完，再加场需未来币 ×${PARK_SHOW_COIN_COST}`);
      ml16Rerender(keepY, res.ok);
      return;
    }

    const parkGiftBtn = ev.target?.closest?.("button[data-park-gift]");
    if (parkGiftBtn && elFunctionsTraining.contains(parkGiftBtn)) {
      if (parkGiftBtn.disabled) return;
      const keepY = ml16KeepY();
      const res = exchangeParkTickets(state, ml16Opts);
      if (res.ok) {
        addLog(`云端游乐园：${res.logLine}`, true);
        ui.itemsDirty = true;
      } else addLog(`门票不够，兑换礼包需要 ${PARK_GIFT_COST} 张`);
      ml16Rerender(keepY);
      return;
    }

    const parkDismissBtn = ev.target?.closest?.("button[data-park-dismiss]");
    if (parkDismissBtn && elFunctionsTraining.contains(parkDismissBtn)) {
      if (parkDismissBtn.disabled) return;
      const keepY = ml16KeepY();
      const res = dismissParkOperators(state);
      if (res.ok) addLog(`云端游乐园：${res.dismissed} 位伙伴交接了操作台回家休息`);
      ml16Rerender(keepY, res.ok);
      return;
    }

    const parkOffBtn = ev.target?.closest?.("button[data-park-off]");
    if (parkOffBtn && elFunctionsTraining.contains(parkOffBtn)) {
      const keepY = ml16KeepY();
      const res = assignParkOperator(state, "", Number(parkOffBtn.getAttribute("data-park-off")), ml16Opts);
      if (res.ok && !res.operating) addLog(`云端游乐园：伙伴离开了「${getParkRideDef(res.rideId)?.name || "游乐设施"}」的操作台`);
      ml16Rerender(keepY, res.ok);
      return;
    }

    const parkEventBtn = ev.target?.closest?.("button[data-park-event]");
    if (parkEventBtn && elFunctionsTraining.contains(parkEventBtn)) {
      if (parkEventBtn.disabled) return;
      const keepY = ml16KeepY();
      const res = launchParkEvent(state, parkEventBtn.getAttribute("data-park-event") || "", ml16Opts);
      if (res.ok) addLog(`云端游乐园：${res.logLine}${res.capped ? "（已达 4 小时上限）" : ""}`, true);
      else addLog(res.reason === "buff_full" ? "这项活动的增益已经攒满 4 小时了" : "门票不够，先让设施多转几轮吧");
      ml16Rerender(keepY);
      return;
    }

    const parkOpenBtn = ev.target?.closest?.("button[data-park-open]");
    if (parkOpenBtn && elFunctionsTraining.contains(parkOpenBtn)) {
      if (parkOpenBtn.disabled) return;
      ui.parkModalRide = parkOpenBtn.getAttribute("data-park-open") || "";
      ui.__parkModalScrollTop = 0;
      markFunctionsDirty();
      render();
      return;
    }

    const parkPickBtn = ev.target?.closest?.("button[data-park-modal-pick]");
    if (parkPickBtn && elFunctionsTraining.contains(parkPickBtn)) {
      if (parkPickBtn.disabled) return;
      const res = assignParkOperator(state, ui.parkModalRide || "", Number(parkPickBtn.getAttribute("data-park-modal-pick")), ml16Opts);
      if (res.ok) {
        ui.parkModalRide = "";
        addLog(`云端游乐园：伙伴握住了「${getParkRideDef(res.rideId)?.name || "游乐设施"}」的操作杆${res.match ? "（属性契合）" : ""}`);
      } else {
        addLog(res.reason === "ride_full" ? "这座设施已经有人值班了" : res.reason === "mon_busy" ? "这只伙伴正在忙，暂时不能值班" : res.reason === "ride_locked" ? "这座设施还没建好" : "暂时无法值班");
      }
      markMonListDirty?.(false);
      markMonsDirty?.();
      markFunctionsDirty();
      render();
      return;
    }

    const parkCloseBtn = ev.target?.closest?.("button[data-park-modal-close]");
    if (parkCloseBtn && elFunctionsTraining.contains(parkCloseBtn)) {
      ui.parkModalRide = "";
      markFunctionsDirty();
      render();
      return;
    }

    const parkOverlay = ev.target?.closest?.("div[data-park-modal-overlay]");
    if (parkOverlay && elFunctionsTraining.contains(parkOverlay) && ev.target === parkOverlay) {
      ui.parkModalRide = "";
      markFunctionsDirty();
      render();
      return;
    }

    const sgAutoBtn = ev.target?.closest?.("button[data-stargaze-autodispatch]");
    if (sgAutoBtn && elFunctionsTraining.contains(sgAutoBtn)) {
      if (sgAutoBtn.disabled) return;
      const keepY = ml16KeepY();
      const res = autoDispatchStargazeCamps(state, ml16Opts);
      addLog(
        res.ok
          ? `星空露营观测：${res.dispatched.map((d) => `「${getStargazeSiteDef(d.siteId)?.name || ""}」${d.camperIds.length} 位`).join("、")}背着帐篷出发夜营（夜营期间防放生保护生效）`
          : "暂无可夜营的空闲伙伴，或营地都有人了",
      );
      ml16Rerender(keepY, res.ok);
      return;
    }

    const sgClaimAllBtn = ev.target?.closest?.("button[data-stargaze-claim-all]");
    if (sgClaimAllBtn && elFunctionsTraining.contains(sgClaimAllBtn)) {
      if (sgClaimAllBtn.disabled) return;
      const keepY = ml16KeepY();
      const res = claimAllStargazeSites(state, ml16Opts);
      if (res.ok) {
        for (const r of res.results) addLog(`星空露营观测：${r.logLine}`, true);
        if (res.newTier > 0) addLog("星空露营观测：营火徽章升级了！", true);
        ui.itemsDirty = true;
      }
      ml16Rerender(keepY, res.ok);
      return;
    }

    const sgClaimBtn = ev.target?.closest?.("button[data-stargaze-claim]");
    if (sgClaimBtn && elFunctionsTraining.contains(sgClaimBtn)) {
      const keepY = ml16KeepY();
      const res = claimStargazeSite(state, Number(sgClaimBtn.getAttribute("data-stargaze-claim")), ml16Opts);
      if (res.ok) {
        addLog(`星空露营观测：${res.logLine}`, true);
        if (res.newTier > 0) addLog("星空露营观测：营火徽章升级了！", true);
        ui.itemsDirty = true;
      }
      ml16Rerender(keepY, res.ok);
      return;
    }

    const sgFireBtn = ev.target?.closest?.("button[data-stargaze-fire]");
    if (sgFireBtn && elFunctionsTraining.contains(sgFireBtn)) {
      if (sgFireBtn.disabled) return;
      const keepY = ml16KeepY();
      const res = useStargazeCampfire(state, ml16Opts);
      if (res.ok) addLog(`星空露营观测：${res.logLine}`, true);
      else addLog(res.reason === "no_camping" ? "添柴守夜需要先有营地在夜营" : `今日免费添柴已用完，再添柴需未来币 ×${STARGAZE_FIRE_COIN_COST}`);
      ml16Rerender(keepY);
      return;
    }

    const sgRecallBtn = ev.target?.closest?.("button[data-stargaze-recall]");
    if (sgRecallBtn && elFunctionsTraining.contains(sgRecallBtn)) {
      const keepY = ml16KeepY();
      const res = recallStargazeCamp(state, Number(sgRecallBtn.getAttribute("data-stargaze-recall")));
      if (res.ok) addLog(`星空露营观测：「${STARGAZE_SITES[res.idx]?.name || ""}」提前撤营（这一夜没留下观测记录）`);
      ml16Rerender(keepY, res.ok);
      return;
    }

    const sgOpenBtn = ev.target?.closest?.("button[data-stargaze-open]");
    if (sgOpenBtn && elFunctionsTraining.contains(sgOpenBtn)) {
      if (sgOpenBtn.disabled) return;
      ui.stargazeModal = { idx: Number(sgOpenBtn.getAttribute("data-stargaze-open")), ids: [] };
      ui.__stargazeModalScrollTop = 0;
      markFunctionsDirty();
      render();
      return;
    }

    const sgPickBtn = ev.target?.closest?.("button[data-stargaze-modal-pick]");
    if (sgPickBtn && elFunctionsTraining.contains(sgPickBtn)) {
      if (sgPickBtn.disabled) return;
      const draft = ui.stargazeModal && typeof ui.stargazeModal === "object" ? ui.stargazeModal : null;
      if (draft) {
        const id = Number(sgPickBtn.getAttribute("data-stargaze-modal-pick"));
        const ids = Array.isArray(draft.ids) ? draft.ids.slice() : [];
        draft.ids = ids.includes(id) ? ids.filter((x) => x !== id) : ids.length < STARGAZE_SEATS ? [...ids, id] : ids;
      }
      markFunctionsDirty();
      render();
      return;
    }

    const sgGoBtn = ev.target?.closest?.("button[data-stargaze-modal-go]");
    if (sgGoBtn && elFunctionsTraining.contains(sgGoBtn)) {
      if (sgGoBtn.disabled) return;
      const draft = ui.stargazeModal && typeof ui.stargazeModal === "object" ? ui.stargazeModal : null;
      const keepY = ml16KeepY();
      if (draft) {
        const res = dispatchStargazeCamp(state, draft.idx, draft.ids, ml16Opts);
        if (res.ok) {
          ui.stargazeModal = null;
          addLog(`星空露营观测：伙伴们背着帐篷去了「${getStargazeSiteDef(res.siteId)?.name || ""}」（约 ${Math.round(res.durationSec / 60)} 分钟${res.night ? " · 夜观时段" : ""}，夜营期间防放生保护生效）`);
        } else {
          addLog(res.reason === "mon_busy" ? "有伙伴正在忙，暂时不能夜营" : res.reason === "site_busy" ? "这处营地已经有人了" : "暂时无法出发");
        }
        ml16Rerender(keepY, res.ok);
        return;
      }
      ml16Rerender(keepY);
      return;
    }

    const sgCloseBtn = ev.target?.closest?.("button[data-stargaze-modal-close]");
    if (sgCloseBtn && elFunctionsTraining.contains(sgCloseBtn)) {
      ui.stargazeModal = null;
      markFunctionsDirty();
      render();
      return;
    }

    const sgOverlay = ev.target?.closest?.("div[data-stargaze-modal-overlay]");
    if (sgOverlay && elFunctionsTraining.contains(sgOverlay) && ev.target === sgOverlay) {
      ui.stargazeModal = null;
      markFunctionsDirty();
      render();
      return;
    }

    // --- ML-15 Cloud Dessert Bakery & Rainbow Balloon Travel Actions ---
    const ml15KeepY = () => (typeof window !== "undefined" ? window.scrollY : 0);
    const ml15Rerender = (keepY, monsChanged = false) => {
      if (monsChanged) {
        markMonListDirty?.(false);
        markMonsDirty?.();
      }
      markFunctionsDirty();
      render();
      if (typeof window !== "undefined" && Math.abs(window.scrollY - keepY) > 0) window.scrollTo(window.scrollX || 0, keepY);
    };
    // 与 tick 结算用同一套属性解析（不传 getMonTypes），保证上岗 / 登机时的契合判断与实际结算一致
    const ml15Opts = { addRes, addExpToMon, getBeastDataByDex };

    const bakeryAutoBtn = ev.target?.closest?.("button[data-bakery-autostaff]");
    if (bakeryAutoBtn && elFunctionsTraining.contains(bakeryAutoBtn)) {
      if (bakeryAutoBtn.disabled) return;
      const keepY = ml15KeepY();
      const res = autoStaffBakery(state, ml15Opts);
      addLog(
        res.ok
          ? `云朵甜点烘焙坊：${res.added.length} 位伙伴系上围裙上岗（契合工位 ${res.added.filter((a) => a.match).length} 个，上岗期间防放生保护生效）`
          : "暂无可上岗的空闲伙伴，或工位已满",
      );
      ml15Rerender(keepY, res.ok);
      return;
    }

    const bakeryRushBtn = ev.target?.closest?.("button[data-bakery-rush]");
    if (bakeryRushBtn && elFunctionsTraining.contains(bakeryRushBtn)) {
      if (bakeryRushBtn.disabled) return;
      const keepY = ml15KeepY();
      const res = performBakeryRush(state, ml15Opts);
      if (res.ok) addLog(`云朵甜点烘焙坊：${res.logLine}`, true);
      else
        addLog(
          res.reason === "no_workers"
            ? "加急出炉需要先有伙伴上岗"
            : res.reason === "case_full"
              ? "甜点柜满了，先享用或装盒吧"
              : `今日免费加急已用完，再加急需未来币 ×${BAKERY_RUSH_COIN_COST}`,
        );
      ml15Rerender(keepY, res.ok);
      return;
    }

    const bakeryBoxBtn = ev.target?.closest?.("button[data-bakery-box]");
    if (bakeryBoxBtn && elFunctionsTraining.contains(bakeryBoxBtn)) {
      if (bakeryBoxBtn.disabled) return;
      const keepY = ml15KeepY();
      const res = boxBakeryDesserts(state, ml15Opts);
      if (res.ok) {
        addLog(`云朵甜点烘焙坊：${res.logLine}`, true);
        ui.itemsDirty = true;
      }
      ml15Rerender(keepY);
      return;
    }

    const bakeryDismissBtn = ev.target?.closest?.("button[data-bakery-dismiss]");
    if (bakeryDismissBtn && elFunctionsTraining.contains(bakeryDismissBtn)) {
      if (bakeryDismissBtn.disabled) return;
      const keepY = ml15KeepY();
      const res = dismissAllBakers(state);
      if (res.ok) addLog(`云朵甜点烘焙坊：${res.dismissed} 位伙伴下班回家了（没做完的这一炉留在案板上）`);
      ml15Rerender(keepY, res.ok);
      return;
    }

    const bakeryOffBtn = ev.target?.closest?.("button[data-bakery-off]");
    if (bakeryOffBtn && elFunctionsTraining.contains(bakeryOffBtn)) {
      const keepY = ml15KeepY();
      const res = assignBakeryWorker(state, "", Number(bakeryOffBtn.getAttribute("data-bakery-off")), ml15Opts);
      if (res.ok && !res.working) addLog(`云朵甜点烘焙坊：伙伴摘下围裙离开了${getBakeryStationDef(res.stationId)?.name || "工位"}`);
      ml15Rerender(keepY, res.ok);
      return;
    }

    const bakeryEatBtn = ev.target?.closest?.("button[data-bakery-eat]");
    if (bakeryEatBtn && elFunctionsTraining.contains(bakeryEatBtn)) {
      const keepY = ml15KeepY();
      const res = enjoyBakeryDessert(state, bakeryEatBtn.getAttribute("data-bakery-eat") || "");
      if (res.ok) addLog(`云朵甜点烘焙坊：${res.logLine}${res.capped ? "（已达 6 小时上限）" : ""}`, true);
      ml15Rerender(keepY);
      return;
    }

    const bakeryRecipeBtn = ev.target?.closest?.("button[data-bakery-recipe]");
    if (bakeryRecipeBtn && elFunctionsTraining.contains(bakeryRecipeBtn)) {
      const keepY = ml15KeepY();
      const res = selectBakeryRecipe(state, bakeryRecipeBtn.getAttribute("data-bakery-recipe") || "");
      if (res.ok) addLog(`云朵甜点烘焙坊：案板上换成了「${getBakeryRecipeDef(res.recipeId)?.name || ""}」的食谱卡`);
      ml15Rerender(keepY);
      return;
    }

    const bakeryOpenBtn = ev.target?.closest?.("button[data-bakery-open]");
    if (bakeryOpenBtn && elFunctionsTraining.contains(bakeryOpenBtn)) {
      if (bakeryOpenBtn.disabled) return;
      ui.bakeryModalStation = bakeryOpenBtn.getAttribute("data-bakery-open") || "";
      ui.__bakeryModalScrollTop = 0;
      markFunctionsDirty();
      render();
      return;
    }

    const bakeryPickBtn = ev.target?.closest?.("button[data-bakery-modal-pick]");
    if (bakeryPickBtn && elFunctionsTraining.contains(bakeryPickBtn)) {
      if (bakeryPickBtn.disabled) return;
      const res = assignBakeryWorker(state, ui.bakeryModalStation || "", Number(bakeryPickBtn.getAttribute("data-bakery-modal-pick")), ml15Opts);
      if (res.ok) {
        ui.bakeryModalStation = "";
        addLog(`云朵甜点烘焙坊：伙伴系上围裙站到了${getBakeryStationDef(res.stationId)?.name || "工位"}${res.match ? "（属性契合）" : ""}`);
      } else {
        addLog(res.reason === "station_full" ? "这个工位已经有人了" : res.reason === "mon_busy" ? "这只伙伴正在忙，暂时不能上岗" : "暂时无法上岗");
      }
      markMonListDirty?.(false);
      markMonsDirty?.();
      markFunctionsDirty();
      render();
      return;
    }

    const bakeryCloseBtn = ev.target?.closest?.("button[data-bakery-modal-close]");
    if (bakeryCloseBtn && elFunctionsTraining.contains(bakeryCloseBtn)) {
      ui.bakeryModalStation = "";
      markFunctionsDirty();
      render();
      return;
    }

    const bakeryOverlay = ev.target?.closest?.("div[data-bakery-modal-overlay]");
    if (bakeryOverlay && elFunctionsTraining.contains(bakeryOverlay) && ev.target === bakeryOverlay) {
      ui.bakeryModalStation = "";
      markFunctionsDirty();
      render();
      return;
    }

    const balloonAutoBtn = ev.target?.closest?.("button[data-balloon-autodispatch]");
    if (balloonAutoBtn && elFunctionsTraining.contains(balloonAutoBtn)) {
      if (balloonAutoBtn.disabled) return;
      const keepY = ml15KeepY();
      const res = autoDispatchBalloons(state, ml15Opts);
      addLog(
        res.ok
          ? `彩虹气球旅行：${res.dispatched.map((d) => `${d.idx + 1} 号气球飞向「${getBalloonIsleDef(d.isleId)?.name || ""}」`).join("、")}（旅行期间防放生保护生效）`
          : "暂无可登机的空闲伙伴，或气球都在旅行中",
      );
      ml15Rerender(keepY, res.ok);
      return;
    }

    const balloonClaimAllBtn = ev.target?.closest?.("button[data-balloon-claim-all]");
    if (balloonClaimAllBtn && elFunctionsTraining.contains(balloonClaimAllBtn)) {
      if (balloonClaimAllBtn.disabled) return;
      const keepY = ml15KeepY();
      const res = claimAllBalloons(state, ml15Opts);
      if (res.ok) {
        for (const r of res.results) addLog(`彩虹气球旅行：${r.logLine}`, true);
        if (res.newTier > 0) addLog("彩虹气球旅行：旅行章升级了！", true);
        ui.itemsDirty = true;
      }
      ml15Rerender(keepY, res.ok);
      return;
    }

    const balloonClaimBtn = ev.target?.closest?.("button[data-balloon-claim]");
    if (balloonClaimBtn && elFunctionsTraining.contains(balloonClaimBtn)) {
      const keepY = ml15KeepY();
      const res = claimBalloon(state, Number(balloonClaimBtn.getAttribute("data-balloon-claim")), ml15Opts);
      if (res.ok) {
        addLog(`彩虹气球旅行：${res.logLine}`, true);
        if (res.newTier > 0) addLog("彩虹气球旅行：旅行章升级了！", true);
        ui.itemsDirty = true;
      }
      ml15Rerender(keepY, res.ok);
      return;
    }

    const balloonTicketBtn = ev.target?.closest?.("button[data-balloon-ticket]");
    if (balloonTicketBtn && elFunctionsTraining.contains(balloonTicketBtn)) {
      if (balloonTicketBtn.disabled) return;
      const keepY = ml15KeepY();
      const res = useBalloonTicket(state, ml15Opts);
      if (res.ok) addLog(`彩虹气球旅行：${res.logLine}`, true);
      else addLog(res.reason === "no_flying" ? "顺风旅行票需要先有气球在飞" : `今日免费旅行票已用完，再用需未来币 ×${BALLOON_TICKET_COIN_COST}`);
      ml15Rerender(keepY);
      return;
    }

    const balloonRecallBtn = ev.target?.closest?.("button[data-balloon-recall]");
    if (balloonRecallBtn && elFunctionsTraining.contains(balloonRecallBtn)) {
      const keepY = ml15KeepY();
      const res = recallBalloon(state, Number(balloonRecallBtn.getAttribute("data-balloon-recall")));
      if (res.ok) addLog(`彩虹气球旅行：${res.idx + 1} 号气球掉头飞回草坪（这一趟没带回纪念品）`);
      ml15Rerender(keepY, res.ok);
      return;
    }

    const balloonOpenBtn = ev.target?.closest?.("button[data-balloon-open]");
    if (balloonOpenBtn && elFunctionsTraining.contains(balloonOpenBtn)) {
      if (balloonOpenBtn.disabled) return;
      const idx = Number(balloonOpenBtn.getAttribute("data-balloon-open"));
      const rot = getBalloonIsleRotation();
      // 默认选当前空闲伙伴契合人数更多的开放群岛
      const idleNow = getIdleBalloonCandidates(state);
      const bestIsle = rot.open
        .map((isle, order) => ({ isle, n: idleNow.filter((m) => evaluateBalloonPassenger(m, isle.id, ml15Opts)?.match).length, order }))
        .sort((a, b) => b.n - a.n || a.order - b.order)[0]?.isle;
      ui.balloonModal = { idx, isleId: bestIsle?.id || rot.openIds[0], ids: [] };
      ui.__balloonModalScrollTop = 0;
      markFunctionsDirty();
      render();
      return;
    }

    const balloonIsleBtn = ev.target?.closest?.("button[data-balloon-modal-isle]");
    if (balloonIsleBtn && elFunctionsTraining.contains(balloonIsleBtn)) {
      if (ui.balloonModal && typeof ui.balloonModal === "object") ui.balloonModal.isleId = balloonIsleBtn.getAttribute("data-balloon-modal-isle") || "";
      markFunctionsDirty();
      render();
      return;
    }

    const balloonPickBtn = ev.target?.closest?.("button[data-balloon-modal-pick]");
    if (balloonPickBtn && elFunctionsTraining.contains(balloonPickBtn)) {
      if (balloonPickBtn.disabled) return;
      const draft = ui.balloonModal && typeof ui.balloonModal === "object" ? ui.balloonModal : null;
      if (draft) {
        const id = Number(balloonPickBtn.getAttribute("data-balloon-modal-pick"));
        const ids = Array.isArray(draft.ids) ? draft.ids.slice() : [];
        draft.ids = ids.includes(id) ? ids.filter((x) => x !== id) : ids.length < BALLOON_SEATS ? [...ids, id] : ids;
      }
      markFunctionsDirty();
      render();
      return;
    }

    const balloonGoBtn = ev.target?.closest?.("button[data-balloon-modal-go]");
    if (balloonGoBtn && elFunctionsTraining.contains(balloonGoBtn)) {
      if (balloonGoBtn.disabled) return;
      const draft = ui.balloonModal && typeof ui.balloonModal === "object" ? ui.balloonModal : null;
      const keepY = ml15KeepY();
      if (draft) {
        const res = dispatchBalloon(state, draft.idx, draft.isleId, draft.ids, ml15Opts);
        if (res.ok) {
          ui.balloonModal = null;
          addLog(`彩虹气球旅行：${res.idx + 1} 号气球飞向「${getBalloonIsleDef(res.isleId)?.name || ""}」（约 ${Math.round(res.durationSec / 60)} 分钟，旅行期间防放生保护生效）`);
        } else {
          addLog(
            res.reason === "isle_closed"
              ? "这座群岛刚刚轮换飘走了，换一座开放中的群岛吧"
              : res.reason === "mon_busy"
                ? "有乘客正在忙，暂时不能登机"
                : res.reason === "balloon_busy"
                  ? "这只气球已经在旅行中了"
                  : "暂时无法起飞",
          );
        }
        ml15Rerender(keepY, res.ok);
        return;
      }
      ml15Rerender(keepY);
      return;
    }

    const balloonCloseBtn = ev.target?.closest?.("button[data-balloon-modal-close]");
    if (balloonCloseBtn && elFunctionsTraining.contains(balloonCloseBtn)) {
      ui.balloonModal = null;
      markFunctionsDirty();
      render();
      return;
    }

    const balloonOverlay = ev.target?.closest?.("div[data-balloon-modal-overlay]");
    if (balloonOverlay && elFunctionsTraining.contains(balloonOverlay) && ev.target === balloonOverlay) {
      ui.balloonModal = null;
      markFunctionsDirty();
      render();
      return;
    }

    // --- ML-14 Dream Picture-Book Library & Creekside Fishing Club Actions ---
    const ml14KeepY = () => (typeof window !== "undefined" ? window.scrollY : 0);
    const ml14Rerender = (keepY, monsChanged = false) => {
      if (monsChanged) {
        markMonListDirty?.(false);
        markMonsDirty?.();
      }
      markFunctionsDirty();
      render();
      if (typeof window !== "undefined" && Math.abs(window.scrollY - keepY) > 0) window.scrollTo(window.scrollX || 0, keepY);
    };
    const ml14Opts = { addRes, addExpToMon, getBeastDataByDex, getMonTypes: (m) => getMonTypesForExpedition(m, getBeastDataByDex) };

    const dreamAutoBtn = ev.target?.closest?.("button[data-dream-autofill]");
    if (dreamAutoBtn && elFunctionsTraining.contains(dreamAutoBtn)) {
      if (dreamAutoBtn.disabled) return;
      const keepY = ml14KeepY();
      const res = autoFillDreamers(state, ml14Opts);
      addLog(res.ok ? `梦境绘本馆：${res.added.length} 只伙伴枕着梦枕入梦了（入梦期间防放生保护生效）` : "暂无可入梦的空闲伙伴，或梦枕已满");
      ml14Rerender(keepY, res.ok);
      return;
    }

    const dreamStoryBtn = ev.target?.closest?.("button[data-dream-story]");
    if (dreamStoryBtn && elFunctionsTraining.contains(dreamStoryBtn)) {
      if (dreamStoryBtn.disabled) return;
      const keepY = ml14KeepY();
      const res = performDreamStory(state, ml14Opts);
      if (res.ok) addLog(`梦境绘本馆：${res.logLine}`, true);
      else addLog(res.reason === "no_dreamers" ? "晚安朗读需要先有伙伴入梦" : `今日免费朗读已用完，再朗读需未来币 ×${DREAM_STORY_COIN_COST}`);
      ml14Rerender(keepY, res.ok);
      return;
    }

    const dreamWakeAllBtn = ev.target?.closest?.("button[data-dream-wake-all]");
    if (dreamWakeAllBtn && elFunctionsTraining.contains(dreamWakeAllBtn)) {
      if (dreamWakeAllBtn.disabled) return;
      const keepY = ml14KeepY();
      const res = wakeAllDreamers(state);
      if (res.ok) addLog(`梦境绘本馆：${res.woken} 只伙伴醒了过来（灵感留在书页上）`);
      ml14Rerender(keepY, res.ok);
      return;
    }

    const dreamWakeBtn = ev.target?.closest?.("button[data-dream-wake]");
    if (dreamWakeBtn && elFunctionsTraining.contains(dreamWakeBtn)) {
      const keepY = ml14KeepY();
      const res = toggleDreamer(state, Number(dreamWakeBtn.getAttribute("data-dream-wake")), ml14Opts);
      if (res.ok && !res.dreaming) addLog("梦境绘本馆：伙伴揉揉眼睛醒了过来");
      ml14Rerender(keepY, res.ok);
      return;
    }

    const dreamBookBtn = ev.target?.closest?.("button[data-dream-book]");
    if (dreamBookBtn && elFunctionsTraining.contains(dreamBookBtn)) {
      const keepY = ml14KeepY();
      const res = selectDreamBook(state, dreamBookBtn.getAttribute("data-dream-book") || "");
      if (res.ok) addLog(`梦境绘本馆：梦枕边换成了《${getDreamBookDef(res.bookId)?.name || ""}》${res.reread ? "（重温版）" : ""}`);
      ml14Rerender(keepY);
      return;
    }

    const dreamOpenBtn = ev.target?.closest?.("button[data-dream-open]");
    if (dreamOpenBtn && elFunctionsTraining.contains(dreamOpenBtn)) {
      if (dreamOpenBtn.disabled) return;
      ui.dreamModalOpen = true;
      markFunctionsDirty();
      render();
      return;
    }

    const dreamPickBtn = ev.target?.closest?.("button[data-dream-modal-pick]");
    if (dreamPickBtn && elFunctionsTraining.contains(dreamPickBtn)) {
      if (dreamPickBtn.disabled) return;
      const res = toggleDreamer(state, Number(dreamPickBtn.getAttribute("data-dream-modal-pick")), ml14Opts);
      if (res.ok) {
        if ((state.meta?.dreamLibrary?.dreamerIds?.length || 0) >= DREAM_PILLOW_COUNT) ui.dreamModalOpen = false;
      } else {
        addLog(res.reason === "pillows_full" ? "梦枕已经睡满了" : res.reason === "mon_busy" ? "这只伙伴正在忙，暂时不能入梦" : "暂时无法入梦");
      }
      markMonListDirty?.(false);
      markMonsDirty?.();
      markFunctionsDirty();
      render();
      return;
    }

    const dreamCloseBtn = ev.target?.closest?.("button[data-dream-modal-close]");
    if (dreamCloseBtn && elFunctionsTraining.contains(dreamCloseBtn)) {
      ui.dreamModalOpen = false;
      markFunctionsDirty();
      render();
      return;
    }

    const dreamOverlay = ev.target?.closest?.("div[data-dream-modal-overlay]");
    if (dreamOverlay && elFunctionsTraining.contains(dreamOverlay) && ev.target === dreamOverlay) {
      ui.dreamModalOpen = false;
      markFunctionsDirty();
      render();
      return;
    }

    const fishAutoBtn = ev.target?.closest?.("button[data-fish-autopick]");
    if (fishAutoBtn && elFunctionsTraining.contains(fishAutoBtn)) {
      if (fishAutoBtn.disabled) return;
      const keepY = ml14KeepY();
      const res = autoPickFishingAnglers(state, ml14Opts);
      addLog(res.ok ? `溪畔钓鱼会：${res.added.length} 位钓手在「${getFishingSection().name}」下竿（垂钓期间防放生保护生效）` : "暂无可下竿的空闲伙伴，或钓位已满");
      ml14Rerender(keepY, res.ok);
      return;
    }

    const fishClaimBtn = ev.target?.closest?.("button[data-fish-claim]");
    if (fishClaimBtn && elFunctionsTraining.contains(fishClaimBtn)) {
      if (fishClaimBtn.disabled) return;
      const keepY = ml14KeepY();
      const res = claimFishingCreel(state, ml14Opts);
      if (res.ok) {
        addLog(`溪畔钓鱼会：${res.logLine}`, true);
        ui.itemsDirty = true;
      }
      ml14Rerender(keepY, res.ok);
      return;
    }

    const fishChumBtn = ev.target?.closest?.("button[data-fish-chum]");
    if (fishChumBtn && elFunctionsTraining.contains(fishChumBtn)) {
      if (fishChumBtn.disabled) return;
      const keepY = ml14KeepY();
      const res = performFishingChum(state, ml14Opts);
      if (res.ok) addLog(`溪畔钓鱼会：${res.logLine}`, true);
      else
        addLog(
          res.reason === "no_anglers"
            ? "撒窝打饵需要先有钓手下竿"
            : res.reason === "creel_full"
              ? "鱼篓满了，先收鱼篓吧"
              : `今日免费撒窝已用完，再撒需未来币 ×${FISHING_CHUM_COIN_COST}`,
        );
      ml14Rerender(keepY);
      return;
    }

    const fishRecallBtn = ev.target?.closest?.("button[data-fish-recall]");
    if (fishRecallBtn && elFunctionsTraining.contains(fishRecallBtn)) {
      if (fishRecallBtn.disabled) return;
      const keepY = ml14KeepY();
      const res = recallFishingAnglers(state);
      if (res.ok) addLog(`溪畔钓鱼会：${res.recalled} 位钓手收竿（鱼篓保留在码头）`);
      ml14Rerender(keepY, res.ok);
      return;
    }

    const fishOutBtn = ev.target?.closest?.("button[data-fish-out]");
    if (fishOutBtn && elFunctionsTraining.contains(fishOutBtn)) {
      const keepY = ml14KeepY();
      const res = toggleFishingAngler(state, Number(fishOutBtn.getAttribute("data-fish-out")), ml14Opts);
      if (res.ok && !res.fishing) addLog("溪畔钓鱼会：钓手收起钓竿回家了");
      ml14Rerender(keepY, res.ok);
      return;
    }

    const fishOpenBtn = ev.target?.closest?.("button[data-fish-open]");
    if (fishOpenBtn && elFunctionsTraining.contains(fishOpenBtn)) {
      if (fishOpenBtn.disabled) return;
      ui.fishModalOpen = true;
      markFunctionsDirty();
      render();
      return;
    }

    const fishPickBtn = ev.target?.closest?.("button[data-fish-modal-pick]");
    if (fishPickBtn && elFunctionsTraining.contains(fishPickBtn)) {
      if (fishPickBtn.disabled) return;
      const res = toggleFishingAngler(state, Number(fishPickBtn.getAttribute("data-fish-modal-pick")), ml14Opts);
      if (res.ok) {
        if ((state.meta?.fishingClub?.anglerIds?.length || 0) >= FISHING_ANGLER_MAX) ui.fishModalOpen = false;
      } else {
        addLog(res.reason === "spots_full" ? "钓位已经满了" : res.reason === "mon_busy" ? "这只伙伴正在忙，暂时不能垂钓" : "暂时无法下竿");
      }
      markMonListDirty?.(false);
      markMonsDirty?.();
      markFunctionsDirty();
      render();
      return;
    }

    const fishCloseBtn = ev.target?.closest?.("button[data-fish-modal-close]");
    if (fishCloseBtn && elFunctionsTraining.contains(fishCloseBtn)) {
      ui.fishModalOpen = false;
      markFunctionsDirty();
      render();
      return;
    }

    const fishOverlay = ev.target?.closest?.("div[data-fish-modal-overlay]");
    if (fishOverlay && elFunctionsTraining.contains(fishOverlay) && ev.target === fishOverlay) {
      ui.fishModalOpen = false;
      markFunctionsDirty();
      render();
      return;
    }

    // --- ML-13 Hot Spring Healing Village & Post Office Messenger Network Actions ---
    const ml13KeepY = () => (typeof window !== "undefined" ? window.scrollY : 0);
    const ml13Rerender = (keepY, monsChanged = false) => {
      if (monsChanged) {
        markMonListDirty?.(false);
        markMonsDirty?.();
      }
      markFunctionsDirty();
      render();
      if (typeof window !== "undefined" && Math.abs(window.scrollY - keepY) > 0) window.scrollTo(window.scrollX || 0, keepY);
    };
    const ml13Opts = { addRes, addExpToMon, getBeastDataByDex, getMonTypes: (m) => getMonTypesForExpedition(m, getBeastDataByDex) };

    const springAutoBtn = ev.target?.closest?.("button[data-spring-autofill]");
    if (springAutoBtn && elFunctionsTraining.contains(springAutoBtn)) {
      if (springAutoBtn.disabled) return;
      const keepY = ml13KeepY();
      const res = autoFillHotSpring(state, ml13Opts);
      addLog(res.ok ? `温泉疗愈乡：${res.added.length} 只伙伴泡进了温泉（泡汤期间防放生保护生效）` : "暂无可泡汤的空闲伙伴，或汤池已满");
      ml13Rerender(keepY, res.ok);
      return;
    }

    const springTowelBtn = ev.target?.closest?.("button[data-spring-towel]");
    if (springTowelBtn && elFunctionsTraining.contains(springTowelBtn)) {
      if (springTowelBtn.disabled) return;
      const keepY = ml13KeepY();
      const res = performHotSpringTowel(state, ml13Opts);
      if (res.ok) addLog(res.logLine, true);
      else addLog(res.reason === "no_soakers" ? "热毛巾招待需要先有伙伴在泡汤" : `今日免费热毛巾已用完，再招待需未来币 ×${HOT_SPRING_TOWEL_COIN_COST}`);
      ml13Rerender(keepY, res.ok);
      return;
    }

    const springRecallBtn = ev.target?.closest?.("button[data-spring-recall]");
    if (springRecallBtn && elFunctionsTraining.contains(springRecallBtn)) {
      if (springRecallBtn.disabled) return;
      const keepY = ml13KeepY();
      const res = recallHotSpring(state);
      if (res.ok) addLog(`温泉疗愈乡：${res.recalled} 只伙伴出浴（舒缓状态继续生效）`);
      ml13Rerender(keepY, res.ok);
      return;
    }

    const springOutBtn = ev.target?.closest?.("button[data-spring-out]");
    if (springOutBtn && elFunctionsTraining.contains(springOutBtn)) {
      const keepY = ml13KeepY();
      const res = toggleHotSpringSoak(state, "", Number(springOutBtn.getAttribute("data-spring-out")), ml13Opts);
      if (res.ok && !res.soaking) addLog(`温泉疗愈乡：伙伴裹着毛巾离开了「${getHotSpringPoolDef(res.poolId)?.name || "汤池"}」`);
      ml13Rerender(keepY, res.ok);
      return;
    }

    const springOpenBtn = ev.target?.closest?.("button[data-spring-open]");
    if (springOpenBtn && elFunctionsTraining.contains(springOpenBtn)) {
      if (springOpenBtn.disabled) return;
      ui.springModalPool = springOpenBtn.getAttribute("data-spring-open") || "";
      markFunctionsDirty();
      render();
      return;
    }

    const springPickBtn = ev.target?.closest?.("button[data-spring-modal-pick]");
    if (springPickBtn && elFunctionsTraining.contains(springPickBtn)) {
      if (springPickBtn.disabled) return;
      const res = toggleHotSpringSoak(state, ui.springModalPool || "", Number(springPickBtn.getAttribute("data-spring-modal-pick")), ml13Opts);
      if (res.ok) {
        const left = HOT_SPRING_SEATS_PER_POOL - (state.meta?.hotSpring?.pools?.[ui.springModalPool]?.seatIds?.length || 0);
        if (left <= 0) ui.springModalPool = "";
      } else {
        addLog(res.reason === "pool_full" ? "这座汤池已经坐满了" : res.reason === "mon_busy" ? "这只伙伴正在忙，暂时不能泡汤" : "暂时无法入池");
      }
      markMonListDirty?.(false);
      markMonsDirty?.();
      markFunctionsDirty();
      render();
      return;
    }

    const springModalCloseBtn = ev.target?.closest?.("button[data-spring-modal-close]");
    if (springModalCloseBtn && elFunctionsTraining.contains(springModalCloseBtn)) {
      ui.springModalPool = "";
      markFunctionsDirty();
      render();
      return;
    }

    const springOverlay = ev.target?.closest?.("div[data-spring-modal-overlay]");
    if (springOverlay && elFunctionsTraining.contains(springOverlay) && ev.target === springOverlay) {
      ui.springModalPool = "";
      markFunctionsDirty();
      render();
      return;
    }

    const postAutoBtn = ev.target?.closest?.("button[data-post-autodispatch]");
    if (postAutoBtn && elFunctionsTraining.contains(postAutoBtn)) {
      if (postAutoBtn.disabled) return;
      const keepY = ml13KeepY();
      const res = autoDispatchPostMessengers(state, ml13Opts);
      if (res.ok) {
        addLog(`萌灵邮局：${res.dispatched.length} 位信使背上信使包出发（${res.dispatched.map((d) => getPostRouteDef(d.routeId)?.name || "").join("、")}）`, true);
      } else {
        addLog(res.reason === "no_letters" ? "邮筒里暂时没有待寄的信" : res.reason === "bags_full" ? `最多 ${POST_MAX_MESSENGERS} 位信使同时在外` : "暂无可派遣的空闲伙伴");
      }
      ml13Rerender(keepY, res.ok);
      return;
    }

    const postClaimAllBtn = ev.target?.closest?.("button[data-post-claim-all]");
    if (postClaimAllBtn && elFunctionsTraining.contains(postClaimAllBtn)) {
      if (postClaimAllBtn.disabled) return;
      const keepY = ml13KeepY();
      const res = claimAllPostTrips(state, ml13Opts);
      if (res.ok) {
        const tot = Object.entries(res.totals)
          .map(([rid, n]) => `${POST_RES_ZH[rid] || rid} +${n}`)
          .join("、");
        addLog(`萌灵邮局：拆开 ${res.claimed.length} 封回信（${tot}）`, true);
        ui.itemsDirty = true;
      }
      ml13Rerender(keepY, res.ok);
      return;
    }

    const postClaimBtn = ev.target?.closest?.("button[data-post-claim]");
    if (postClaimBtn && elFunctionsTraining.contains(postClaimBtn)) {
      if (postClaimBtn.disabled) return;
      const keepY = ml13KeepY();
      const res = claimPostTrip(state, postClaimBtn.getAttribute("data-post-claim") || "", ml13Opts);
      if (res.ok) {
        addLog(res.logLine, true);
        ui.itemsDirty = true;
      }
      ml13Rerender(keepY, res.ok);
      return;
    }

    const postExpressBtn = ev.target?.closest?.("button[data-post-express]");
    if (postExpressBtn && elFunctionsTraining.contains(postExpressBtn)) {
      if (postExpressBtn.disabled) return;
      const keepY = ml13KeepY();
      const res = performPostExpress(state);
      if (res.ok) addLog(res.logLine, true);
      else addLog(res.reason === "no_en_route" ? "信使加急需要先有信使在路上" : `今日免费加急已用完，再加急需未来币 ×${POST_EXPRESS_COIN_COST}`);
      ml13Rerender(keepY);
      return;
    }

    const postRecallBtn = ev.target?.closest?.("button[data-post-recall]");
    if (postRecallBtn && elFunctionsTraining.contains(postRecallBtn)) {
      const keepY = ml13KeepY();
      const res = recallPostMessenger(state, postRecallBtn.getAttribute("data-post-recall") || "");
      if (res.ok) addLog(res.logLine);
      ml13Rerender(keepY, res.ok);
      return;
    }

    const postOpenBtn = ev.target?.closest?.("button[data-post-open]");
    if (postOpenBtn && elFunctionsTraining.contains(postOpenBtn)) {
      if (postOpenBtn.disabled) return;
      ui.postModalRoute = postOpenBtn.getAttribute("data-post-open") || "";
      markFunctionsDirty();
      render();
      return;
    }

    const postPickBtn = ev.target?.closest?.("button[data-post-modal-pick]");
    if (postPickBtn && elFunctionsTraining.contains(postPickBtn)) {
      if (postPickBtn.disabled) return;
      const res = dispatchPostMessenger(state, ui.postModalRoute || "", Number(postPickBtn.getAttribute("data-post-modal-pick")), ml13Opts);
      if (res.ok) {
        addLog(res.logLine, true);
        ui.postModalRoute = "";
      } else {
        const why = {
          no_letters: "邮筒里暂时没有待寄的信",
          bags_full: `最多 ${POST_MAX_MESSENGERS} 位信使同时在外`,
          route_busy: "这条邮路已经有信使在送信了",
          mon_busy: "这只伙伴正在忙，暂时不能送信",
          locked: "这条邮路还没有开通",
        };
        addLog(`萌灵邮局：${why[res.reason] || "暂时无法派遣"}`);
      }
      markMonListDirty?.(false);
      markMonsDirty?.();
      markFunctionsDirty();
      render();
      return;
    }

    const postModalCloseBtn = ev.target?.closest?.("button[data-post-modal-close]");
    if (postModalCloseBtn && elFunctionsTraining.contains(postModalCloseBtn)) {
      ui.postModalRoute = "";
      markFunctionsDirty();
      render();
      return;
    }

    const postOverlay = ev.target?.closest?.("div[data-post-modal-overlay]");
    if (postOverlay && elFunctionsTraining.contains(postOverlay) && ev.target === postOverlay) {
      ui.postModalRoute = "";
      markFunctionsDirty();
      render();
      return;
    }

    // --- ML-12 Treasure Map Voyage & Band Ensemble Concert Actions ---
    const ml12KeepY = () => (typeof window !== "undefined" ? window.scrollY : 0);
    const ml12Rerender = (keepY, monsChanged = false) => {
      if (monsChanged) {
        markMonListDirty?.(false);
        markMonsDirty?.();
      }
      markFunctionsDirty();
      render();
      if (typeof window !== "undefined" && Math.abs(window.scrollY - keepY) > 0) window.scrollTo(window.scrollX || 0, keepY);
    };
    const treasureOpts = { addRes, addExpToMon, getBeastDataByDex };
    const logVoyageFinish = (fin) => {
      if (fin?.ok && fin.logLine) addLog(fin.logLine, true);
    };

    const treasureAssembleBtn = ev.target?.closest?.("button[data-treasure-assemble]");
    if (treasureAssembleBtn && elFunctionsTraining.contains(treasureAssembleBtn)) {
      if (treasureAssembleBtn.disabled) return;
      const keepY = ml12KeepY();
      const res = assembleTreasureMap(state);
      if (res.ok) {
        addLog(res.logLine, true);
        ui.itemsDirty = true;
      } else {
        addLog(res.reason === "maps_full" ? `藏宝图最多存 ${TREASURE_MAP_MAX_MAPS} 张，先出海用掉一张吧` : `藏宝图残片不足：${res.have || 0}/${TREASURE_MAP_FRAGMENTS_PER_MAP}`);
      }
      ml12Rerender(keepY);
      return;
    }

    const treasureGullBtn = ev.target?.closest?.("button[data-treasure-gull]");
    if (treasureGullBtn && elFunctionsTraining.contains(treasureGullBtn)) {
      if (treasureGullBtn.disabled) return;
      const keepY = ml12KeepY();
      const res = performTreasureGullAssist(state);
      if (res.ok) addLog(res.logLine, true);
      else addLog(res.reason === "no_voyage" ? "海鸥领航需要先有一支出海的寻宝船队" : `今日免费海鸥领航已用完，再请海鸥帮忙需未来币 ×${TREASURE_GULL_COIN_COST}`);
      ml12Rerender(keepY);
      return;
    }

    const treasureAutoCrewBtn = ev.target?.closest?.("button[data-treasure-autocrew]");
    if (treasureAutoCrewBtn && elFunctionsTraining.contains(treasureAutoCrewBtn)) {
      if (treasureAutoCrewBtn.disabled) return;
      const keepY = ml12KeepY();
      const res = autoPickTreasureVoyageCrew(state, { getBeastDataByDex });
      if (res.ok) addLog(`寻宝地图远航：${res.added.length} 只伙伴登上了寻宝船（扬帆后防放生保护生效）`, true);
      else addLog("暂无可登船的空闲伙伴，或船员席位已满");
      ml12Rerender(keepY);
      return;
    }

    const treasureOpenModalBtn = ev.target?.closest?.("button[data-treasure-open-modal]");
    if (treasureOpenModalBtn && elFunctionsTraining.contains(treasureOpenModalBtn)) {
      if (treasureOpenModalBtn.disabled) return;
      ui.treasureModalOpen = true;
      markFunctionsDirty();
      render();
      return;
    }

    const treasureModalCloseBtn = ev.target?.closest?.("button[data-treasure-modal-close]");
    if (treasureModalCloseBtn && elFunctionsTraining.contains(treasureModalCloseBtn)) {
      ui.treasureModalOpen = false;
      markFunctionsDirty();
      render();
      return;
    }

    const treasureOverlay = ev.target?.closest?.("div[data-treasure-modal-overlay]");
    if (treasureOverlay && elFunctionsTraining.contains(treasureOverlay) && ev.target === treasureOverlay) {
      ui.treasureModalOpen = false;
      markFunctionsDirty();
      render();
      return;
    }

    const treasureUnstageBtn = ev.target?.closest?.("button[data-treasure-unstage]");
    if (treasureUnstageBtn && elFunctionsTraining.contains(treasureUnstageBtn)) {
      const keepY = ml12KeepY();
      toggleTreasureVoyageCrewMon(state, Number(treasureUnstageBtn.getAttribute("data-treasure-unstage")));
      ml12Rerender(keepY);
      return;
    }

    const treasureSailBtn = ev.target?.closest?.("button[data-treasure-sail]");
    if (treasureSailBtn && elFunctionsTraining.contains(treasureSailBtn)) {
      if (treasureSailBtn.disabled) return;
      const keepY = ml12KeepY();
      const res = startTreasureVoyage(state, treasureSailBtn.getAttribute("data-treasure-sail") || "", { getBeastDataByDex });
      if (res.ok) addLog(res.logLine, true);
      else {
        const why = {
          locked: `完成 ${res.needVoyages || 0} 次远航后才能找到这座宝岛`,
          no_map: "需要先拼合一张藏宝图",
          no_crew: "先挑选 1~3 只空闲伙伴登船",
          voyage_active: "已经有一支寻宝船队在海上了",
        };
        addLog(`寻宝地图远航：${why[res.reason] || "暂时无法出航"}`);
      }
      ml12Rerender(keepY, res.ok);
      return;
    }

    const treasureTileBtn = ev.target?.closest?.("button[data-treasure-tile]");
    if (treasureTileBtn && elFunctionsTraining.contains(treasureTileBtn)) {
      if (treasureTileBtn.disabled) return;
      const keepY = ml12KeepY();
      const res = exploreTreasureTile(state, Number(treasureTileBtn.getAttribute("data-treasure-tile")), treasureOpts);
      if (res.ok) {
        addLog(res.logLine, res.foundX || Boolean(res.keepsake));
        logVoyageFinish(res.finished);
        ui.itemsDirty = true;
      } else {
        addLog(res.reason === "no_stamina" ? "船队体力不足，先返航或请海鸥送补给" : "只能探索与已探索格相邻的迷雾格");
      }
      ml12Rerender(keepY, Boolean(res.finished));
      return;
    }

    const treasureAutoBtn = ev.target?.closest?.("button[data-treasure-auto]");
    if (treasureAutoBtn && elFunctionsTraining.contains(treasureAutoBtn)) {
      if (treasureAutoBtn.disabled) return;
      const keepY = ml12KeepY();
      const res = autoExploreTreasureIsland(state, treasureOpts);
      if (res.ok) {
        const ks = res.steps.filter((s) => s.keepsake).map((s) => getTreasureKeepsakeDef(s.keepsake)?.name || "");
        addLog(
          `寻宝地图远航：自动探索 ${res.steps.length} 格${res.steps.some((s) => s.foundX) ? "，挖到了宝藏 X" : ""}${ks.length ? `，找到纪念品「${ks.join("」「")}」` : ""}`,
          true,
        );
        logVoyageFinish(res.finished);
        ui.itemsDirty = true;
      }
      ml12Rerender(keepY, Boolean(res.finished));
      return;
    }

    const treasureReturnBtn = ev.target?.closest?.("button[data-treasure-return]");
    if (treasureReturnBtn && elFunctionsTraining.contains(treasureReturnBtn)) {
      const keepY = ml12KeepY();
      const res = returnFromTreasureVoyage(state, treasureOpts);
      if (res.ok) addLog(res.logLine, true);
      ml12Rerender(keepY, res.ok);
      return;
    }

    const bandAutoBtn = ev.target?.closest?.("button[data-band-autofill]");
    if (bandAutoBtn && elFunctionsTraining.contains(bandAutoBtn)) {
      if (bandAutoBtn.disabled) return;
      const keepY = ml12KeepY();
      const res = autofillBandLineup(state, { getBeastDataByDex, getMonTypes: (m) => getMonTypesForExpedition(m, getBeastDataByDex) });
      addLog(res.ok ? `萌灵乐队：已按「${getBandStopDef(state.meta?.bandConcert?.stopId)?.name || ""}」编好 4 个声部（预估 ${res.projectedScore} 分）` : "暂无可以登台的伙伴");
      ml12Rerender(keepY, true);
      return;
    }

    const bandComposeBtn = ev.target?.closest?.("button[data-band-compose]");
    if (bandComposeBtn && elFunctionsTraining.contains(bandComposeBtn)) {
      const keepY = ml12KeepY();
      const res = autofillBandPattern(state);
      if (res.ok) addLog(`萌灵乐队：谱好了一段 8 拍节奏型（节奏型 ${res.points} 分）`);
      ml12Rerender(keepY);
      return;
    }

    const bandStopBtn = ev.target?.closest?.("button[data-band-stop]");
    if (bandStopBtn && elFunctionsTraining.contains(bandStopBtn)) {
      if (bandStopBtn.disabled) return;
      const keepY = ml12KeepY();
      selectBandStop(state, bandStopBtn.getAttribute("data-band-stop") || "");
      ml12Rerender(keepY);
      return;
    }

    const bandBeatBtn = ev.target?.closest?.("button[data-band-beat]");
    if (bandBeatBtn && elFunctionsTraining.contains(bandBeatBtn)) {
      const keepY = ml12KeepY();
      setBandBeat(state, Number(bandBeatBtn.getAttribute("data-band-beat")));
      ml12Rerender(keepY);
      return;
    }

    const bandOpenPartBtn = ev.target?.closest?.("button[data-band-open-part]");
    if (bandOpenPartBtn && elFunctionsTraining.contains(bandOpenPartBtn)) {
      if (bandOpenPartBtn.disabled) return;
      ui.bandModalPart = bandOpenPartBtn.getAttribute("data-band-open-part") || "";
      markFunctionsDirty();
      render();
      return;
    }

    const bandClearBtn = ev.target?.closest?.("button[data-band-clear]");
    if (bandClearBtn && elFunctionsTraining.contains(bandClearBtn)) {
      const keepY = ml12KeepY();
      setBandPartMember(state, bandClearBtn.getAttribute("data-band-clear") || "", 0);
      ml12Rerender(keepY, true);
      return;
    }

    const bandPickBtn = ev.target?.closest?.("button[data-band-modal-pick]");
    if (bandPickBtn && elFunctionsTraining.contains(bandPickBtn)) {
      if (bandPickBtn.disabled) return;
      const res = setBandPartMember(state, ui.bandModalPart || "", Number(bandPickBtn.getAttribute("data-band-modal-pick")));
      if (res.ok) ui.bandModalPart = "";
      else addLog(res.reason === "mon_away" ? "这只伙伴正在外出，本场不能登台" : "暂时无法编入这个声部");
      markMonListDirty?.(false);
      markMonsDirty?.();
      markFunctionsDirty();
      render();
      return;
    }

    const bandModalCloseBtn = ev.target?.closest?.("button[data-band-modal-close]");
    if (bandModalCloseBtn && elFunctionsTraining.contains(bandModalCloseBtn)) {
      ui.bandModalPart = "";
      markFunctionsDirty();
      render();
      return;
    }

    const bandOverlay = ev.target?.closest?.("div[data-band-modal-overlay]");
    if (bandOverlay && elFunctionsTraining.contains(bandOverlay) && ev.target === bandOverlay) {
      ui.bandModalPart = "";
      markFunctionsDirty();
      render();
      return;
    }

    const bandPerformBtn = ev.target?.closest?.("button[data-band-perform]");
    if (bandPerformBtn && elFunctionsTraining.contains(bandPerformBtn)) {
      if (bandPerformBtn.disabled) return;
      const keepY = ml12KeepY();
      const res = performBandConcert(state, {
        addRes,
        addExpToMon,
        getBeastDataByDex,
        getMonTypes: (m) => getMonTypesForExpedition(m, getBeastDataByDex),
      });
      if (res.ok) {
        addLog(res.logLine, true);
        ui.itemsDirty = true;
      } else {
        const why = {
          daily_limit: `今日巡演场次已满（${BAND_DAILY_MAX_CONCERTS} 场）`,
          insufficient_coin: "加场需要未来币 ×20",
          lineup_away: "乐手们都在外出，本场无法开演",
          empty_lineup: "先给声部编入乐手",
        };
        addLog(`萌灵乐队：${why[res.reason] || "暂时无法开演"}`);
      }
      ml12Rerender(keepY, res.ok);
      return;
    }

    // --- ML-11 Cloudtop Sky Island & Seasonal Migration Actions ---
    const ml11KeepY = () => (typeof window !== "undefined" ? window.scrollY : 0);
    const ml11Rerender = (keepY, monsChanged = false) => {
      if (monsChanged) {
        markMonListDirty?.(false);
        markMonsDirty?.();
      }
      markFunctionsDirty();
      render();
      if (typeof window !== "undefined" && Math.abs(window.scrollY - keepY) > 0) window.scrollTo(window.scrollX || 0, keepY);
    };
    const migrationOpts = { addRes, createMonInstance, getSpeciesByPid };

    const islandRallyBtn = ev.target?.closest?.("button[data-island-rally]");
    if (islandRallyBtn && elFunctionsTraining.contains(islandRallyBtn)) {
      if (islandRallyBtn.disabled) return;
      const keepY = ml11KeepY();
      const res = performSkyIslandRally(state, { getBeastDataByDex });
      if (res.ok) {
        addLog(res.logLine, true);
        if (res.completed) addLog(`云顶浮空岛：${res.completed.logLine.replace(/^【云顶浮岛】/, "")}`, true);
      } else {
        addLog(
          res.reason === "no_crew"
            ? "齐心夯土需要先派至少 1 只伙伴上岛出工"
            : res.reason === "no_build"
              ? "工地空闲，先选一座浮岛设施开工吧"
              : `今日免费夯土已用完，再赶工需未来币 ×${SKY_ISLAND_RALLY_COIN_COST}`,
        );
      }
      ml11Rerender(keepY);
      return;
    }

    const islandAutoBtn = ev.target?.closest?.("button[data-island-autofill]");
    if (islandAutoBtn && elFunctionsTraining.contains(islandAutoBtn)) {
      if (islandAutoBtn.disabled) return;
      const keepY = ml11KeepY();
      const res = autoFillSkyIslandCrew(state, { getBeastDataByDex });
      if (res.ok) addLog(`云顶浮空岛：已派 ${res.added.length} 只伙伴上岛出工（派工期间防放生保护生效）`, true);
      else addLog("浮岛暂无可派工的空闲伙伴，或出工席位已满");
      ml11Rerender(keepY, res.ok);
      return;
    }

    const islandOpenModalBtn = ev.target?.closest?.("button[data-island-open-modal]");
    if (islandOpenModalBtn && elFunctionsTraining.contains(islandOpenModalBtn)) {
      if (islandOpenModalBtn.disabled) return;
      ui.skyIslandModalOpen = true;
      markFunctionsDirty();
      render();
      return;
    }

    const islandModalCloseBtn = ev.target?.closest?.("button[data-island-modal-close]");
    if (islandModalCloseBtn && elFunctionsTraining.contains(islandModalCloseBtn)) {
      ui.skyIslandModalOpen = false;
      markFunctionsDirty();
      render();
      return;
    }

    const islandOverlay = ev.target?.closest?.("div[data-island-modal-overlay]");
    if (islandOverlay && elFunctionsTraining.contains(islandOverlay) && ev.target === islandOverlay) {
      ui.skyIslandModalOpen = false;
      markFunctionsDirty();
      render();
      return;
    }

    const islandRecallBtn = ev.target?.closest?.("button[data-island-recall]");
    if (islandRecallBtn && elFunctionsTraining.contains(islandRecallBtn)) {
      const keepY = ml11KeepY();
      const res = recallSkyIslandCrew(state, Number(islandRecallBtn.getAttribute("data-island-recall")));
      if (res.ok) addLog("云顶浮空岛：伙伴已撤回（工程进度保留，无人出工时工地停工）");
      ml11Rerender(keepY, res.ok);
      return;
    }

    const islandBuildBtn = ev.target?.closest?.("button[data-island-build]");
    if (islandBuildBtn && elFunctionsTraining.contains(islandBuildBtn)) {
      if (islandBuildBtn.disabled) return;
      const keepY = ml11KeepY();
      const fid = islandBuildBtn.getAttribute("data-island-build") || "";
      const res = startSkyIslandBuild(state, fid);
      if (res.ok) {
        addLog(res.logLine, true);
        ui.itemsDirty = true;
      } else {
        const why = {
          locked: `需要先把「${getSkyIslandFacilityDef(res.requires?.facilityId)?.name || ""}」升到 Lv.${res.requires?.level || 1}`,
          site_busy: "同一时间只能开一处工地，等当前工程竣工或取消后再开工",
          insufficient_resources: `材料不足：还差 ${Object.entries(res.missing || {})
            .map(([rid, n]) => `${SKY_ISLAND_RES_ZH[rid] || rid} ×${n}`)
            .join("、")}`,
          max_level: "这座设施已经满级",
        };
        addLog(`云顶浮空岛：${why[res.reason] || "暂时无法开工"}`);
      }
      ml11Rerender(keepY);
      return;
    }

    const islandCancelBtn = ev.target?.closest?.("button[data-island-cancel]");
    if (islandCancelBtn && elFunctionsTraining.contains(islandCancelBtn)) {
      const keepY = ml11KeepY();
      const res = cancelSkyIslandBuild(state, { addRes });
      if (res.ok) {
        addLog(res.logLine);
        ui.itemsDirty = true;
      }
      ml11Rerender(keepY);
      return;
    }

    const migFeedBtn = ev.target?.closest?.("button[data-migration-feed]");
    if (migFeedBtn && elFunctionsTraining.contains(migFeedBtn)) {
      if (migFeedBtn.disabled) return;
      const keepY = ml11KeepY();
      const res = performMigrationFeed(state, migrationOpts);
      if (res.ok) {
        addLog(res.logLine, true);
        if (res.befriended.length) ui.dexDirty = true;
      } else {
        addLog(res.reason === "no_hosted" ? "撒谷迎候需要先把至少 1 位候鸟萌灵迎上栖枝" : `今日免费迎候已用完，再撒谷需未来币 ×${MIGRATION_FEED_COIN_COST}`);
      }
      ml11Rerender(keepY, Boolean(res.ok && res.befriended.length));
      return;
    }

    const migAutoBtn = ev.target?.closest?.("button[data-migration-autohost]");
    if (migAutoBtn && elFunctionsTraining.contains(migAutoBtn)) {
      if (migAutoBtn.disabled) return;
      const keepY = ml11KeepY();
      const res = autoHostMigrants(state);
      if (res.ok) addLog(`季节迁徙：${res.added.map((id) => `「${getMigrantDef(id)?.name || "候鸟"}」`).join("、")} 落上了候鸟云巢栖枝`, true);
      else addLog("栖枝已满，或本季的候鸟萌灵都已经在驻留了");
      ml11Rerender(keepY);
      return;
    }

    const migHostBtn = ev.target?.closest?.("button[data-migration-host]");
    if (migHostBtn && elFunctionsTraining.contains(migHostBtn)) {
      if (migHostBtn.disabled) return;
      const keepY = ml11KeepY();
      const mid = migHostBtn.getAttribute("data-migration-host") || "";
      const res = toggleMigrantHost(state, mid);
      if (!res.ok) addLog(res.reason === "host_full" ? "栖枝已满：升级「候鸟云巢栖枝」可以多迎一位候鸟" : "这位候鸟萌灵本季不在浮岛");
      ml11Rerender(keepY);
      return;
    }

    // --- ML-10 Moonlit Nocturnal Observatory & Acrobat Stage Show Actions ---
    const ml10KeepY = () => (typeof window !== "undefined" ? window.scrollY : 0);
    const ml10Rerender = (keepY, monsChanged = false) => {
      if (monsChanged) {
        markMonListDirty?.(false);
        markMonsDirty?.();
      }
      markFunctionsDirty();
      render();
      if (typeof window !== "undefined" && Math.abs(window.scrollY - keepY) > 0) window.scrollTo(window.scrollX || 0, keepY);
    };
    const showOpts = {
      getMonTypes: (m) => getMonTypesForExpedition(m, getBeastDataByDex),
      getBeastDataByDex,
    };

    const nightPatrolBtn = ev.target?.closest?.("button[data-night-patrol]");
    if (nightPatrolBtn && elFunctionsTraining.contains(nightPatrolBtn)) {
      if (nightPatrolBtn.disabled) return;
      const keepY = ml10KeepY();
      const res = performLanternPatrol(state, { getBeastDataByDex });
      if (res.ok) {
        addLog(res.logLine, true);
        ui.itemsDirty = true;
      } else {
        addLog(res.reason === "no_observers" ? "提灯夜巡需要先派驻至少 1 只伙伴" : `今日免费夜巡已用完，再巡需未来币 ×${NIGHT_OBS_PATROL_COIN_COST}`);
      }
      ml10Rerender(keepY);
      return;
    }

    const nightAutoBtn = ev.target?.closest?.("button[data-night-autofill]");
    if (nightAutoBtn && elFunctionsTraining.contains(nightAutoBtn)) {
      if (nightAutoBtn.disabled) return;
      const keepY = ml10KeepY();
      const res = autoFillNightObservatory(state, { getBeastDataByDex });
      if (res.ok) addLog(`月光夜行生态观察站：已派驻 ${res.added.length} 只伙伴值守观测（派驻期间防放生保护生效）`, true);
      else addLog("观察站暂无可派驻的空闲伙伴，或席位已满");
      ml10Rerender(keepY, res.ok);
      return;
    }

    const nightOpenModalBtn = ev.target?.closest?.("button[data-night-open-modal]");
    if (nightOpenModalBtn && elFunctionsTraining.contains(nightOpenModalBtn)) {
      if (nightOpenModalBtn.disabled) return;
      ui.nightObsModalOpen = true;
      markFunctionsDirty();
      render();
      return;
    }

    const nightModalCloseBtn = ev.target?.closest?.("button[data-night-modal-close]");
    if (nightModalCloseBtn && elFunctionsTraining.contains(nightModalCloseBtn)) {
      ui.nightObsModalOpen = false;
      markFunctionsDirty();
      render();
      return;
    }

    const nightOverlay = ev.target?.closest?.("div[data-night-modal-overlay]");
    if (nightOverlay && elFunctionsTraining.contains(nightOverlay) && ev.target === nightOverlay) {
      ui.nightObsModalOpen = false;
      markFunctionsDirty();
      render();
      return;
    }

    const nightRecallBtn = ev.target?.closest?.("button[data-night-recall]");
    if (nightRecallBtn && elFunctionsTraining.contains(nightRecallBtn)) {
      const keepY = ml10KeepY();
      const monId = Number(nightRecallBtn.getAttribute("data-night-recall"));
      const res = recallNightObservatory(state, monId);
      if (res.ok) addLog("月光夜行生态观察站：伙伴已撤回（观测计数与夜行形态保留）");
      ml10Rerender(keepY, res.ok);
      return;
    }

    const nightAwakenBtn = ev.target?.closest?.("button[data-night-awaken]");
    if (nightAwakenBtn && elFunctionsTraining.contains(nightAwakenBtn)) {
      if (nightAwakenBtn.disabled) return;
      const keepY = ml10KeepY();
      const monId = Number(nightAwakenBtn.getAttribute("data-night-awaken"));
      const res = awakenNocturnalForm(state, monId, { getBeastDataByDex });
      if (res.ok) {
        addLog(res.logLine, true);
        ui.itemsDirty = true;
      } else {
        addLog(
          res.reason === "need_observation"
            ? `唤醒夜行形态需要该伙伴在观察站参与 ${NIGHT_OBS_FORM_TALLY_REQ} 次观测记录`
            : `唤醒夜行形态需要萤火灯笼 ×${NIGHT_OBS_FORM_COST.fireflyLantern} 与未来币 ×${NIGHT_OBS_FORM_COST.futurecoin}`,
        );
      }
      ml10Rerender(keepY, res.ok);
      return;
    }

    const showAutoBtn = ev.target?.closest?.("button[data-show-autofill]");
    if (showAutoBtn && elFunctionsTraining.contains(showAutoBtn)) {
      if (showAutoBtn.disabled) return;
      const keepY = ml10KeepY();
      const res = autofillAcrobatRoutine(state, showOpts);
      if (res.ok) addLog(`萌灵杂技舞台：已编排 ${res.routine.length} 人连段节目（预估 ${res.projectedScore} 分）`, true);
      else addLog("暂无可登台的伙伴（出海中、派驻观察站的伙伴不会登台）");
      ml10Rerender(keepY, true);
      return;
    }

    const showOpenModalBtn = ev.target?.closest?.("button[data-show-open-modal]");
    if (showOpenModalBtn && elFunctionsTraining.contains(showOpenModalBtn)) {
      if (showOpenModalBtn.disabled) return;
      ui.acrobatShowModalOpen = true;
      markFunctionsDirty();
      render();
      return;
    }

    const showModalCloseBtn = ev.target?.closest?.("button[data-show-modal-close]");
    if (showModalCloseBtn && elFunctionsTraining.contains(showModalCloseBtn)) {
      ui.acrobatShowModalOpen = false;
      markFunctionsDirty();
      render();
      return;
    }

    const showOverlay = ev.target?.closest?.("div[data-show-modal-overlay]");
    if (showOverlay && elFunctionsTraining.contains(showOverlay) && ev.target === showOverlay) {
      ui.acrobatShowModalOpen = false;
      markFunctionsDirty();
      render();
      return;
    }

    const showMoveBtn = ev.target?.closest?.("button[data-show-move]");
    if (showMoveBtn && elFunctionsTraining.contains(showMoveBtn)) {
      const keepY = ml10KeepY();
      const slotIdx = Number(showMoveBtn.getAttribute("data-show-move"));
      const moveId = showMoveBtn.getAttribute("data-show-move-id") || "";
      setAcrobatRoutineMove(state, slotIdx, moveId, showOpts);
      ml10Rerender(keepY);
      return;
    }

    const showShiftBtn = ev.target?.closest?.("button[data-show-shift]");
    if (showShiftBtn && elFunctionsTraining.contains(showShiftBtn)) {
      if (showShiftBtn.disabled) return;
      const keepY = ml10KeepY();
      const slotIdx = Number(showShiftBtn.getAttribute("data-show-shift"));
      const dir = Number(showShiftBtn.getAttribute("data-show-dir")) < 0 ? -1 : 1;
      shiftAcrobatSlot(state, slotIdx, dir);
      ml10Rerender(keepY);
      return;
    }

    const showRemoveBtn = ev.target?.closest?.("button[data-show-remove]");
    if (showRemoveBtn && elFunctionsTraining.contains(showRemoveBtn)) {
      const keepY = ml10KeepY();
      const monId = Number(showRemoveBtn.getAttribute("data-show-remove"));
      toggleAcrobatPerformer(state, monId, showOpts);
      ml10Rerender(keepY, true);
      return;
    }

    const showPerformBtn = ev.target?.closest?.("button[data-show-perform]");
    if (showPerformBtn && elFunctionsTraining.contains(showPerformBtn)) {
      if (showPerformBtn.disabled) return;
      const keepY = ml10KeepY();
      const useLanterns = showPerformBtn.getAttribute("data-show-perform") === "lantern";
      const res = performAcrobatShow(state, { ...showOpts, useLanterns, addRes, addExpToMon, autofill: false });
      if (res.ok) {
        addLog(res.logLine, true);
        ui.itemsDirty = true;
      } else {
        const why = {
          daily_limit: `今日已演满 ${ACROBAT_DAILY_MAX_SHOWS} 场，明天评审换主题再来`,
          routine_away: "节目单里的伙伴正在出海或派驻观察站，无法登台",
          empty_routine: "请先编排登台伙伴",
          insufficient_coin: `加演需要未来币 ×${ACROBAT_EXTRA_SHOW_COIN}`,
          insufficient_lanterns: `点灯登台需要萤火灯笼 ×${ACROBAT_LANTERN_LIGHT_COST}`,
        };
        addLog(`杂技舞台：${why[res.reason] || "暂时无法登台"}`);
      }
      ml10Rerender(keepY, res.ok);
      return;
    }

    // --- ML-9 Starsea Drift-Bottle Wish Dock Actions ---
    const dockKeepY = () => (typeof window !== "undefined" ? window.scrollY : 0);
    const dockRestoreY = (keepY) => {
      if (typeof window !== "undefined" && Math.abs(window.scrollY - keepY) > 0) window.scrollTo(window.scrollX || 0, keepY);
    };
    const dockRerender = (keepY, monsChanged = false) => {
      if (monsChanged) {
        markMonListDirty?.(false);
        markMonsDirty?.();
      }
      markFunctionsDirty();
      render();
      dockRestoreY(keepY);
    };

    const dockDailyBtn = ev.target?.closest?.("button[data-dock-claim-daily]");
    if (dockDailyBtn && elFunctionsTraining.contains(dockDailyBtn)) {
      if (dockDailyBtn.disabled) return;
      const keepY = dockKeepY();
      const res = claimDailyDriftBottles(state);
      addLog(res.ok ? res.logLine : "今日潮汐馈赠已领取，明天的浪花还会带来新的漂流瓶", res.ok);
      ui.itemsDirty = true;
      dockRerender(keepY);
      return;
    }

    const dockAutoAllBtn = ev.target?.closest?.("button[data-dock-auto-all]");
    if (dockAutoAllBtn && elFunctionsTraining.contains(dockAutoAllBtn)) {
      if (dockAutoAllBtn.disabled) return;
      const keepY = dockKeepY();
      const res = autoDispatchAllWishDock(state, { getBeastDataByDex });
      if (res.ok) {
        const names = res.dispatched.map((id) => getWishDockRouteDef(id)?.name || id).join("、");
        addLog(`星海漂流瓶心愿码头：已派遣伙伴前往「${names}」拾贝（出海期间防放生保护生效）`, true);
      } else {
        addLog("码头暂无可出海的空闲伙伴");
      }
      dockRerender(keepY, res.ok);
      return;
    }

    const dockClaimAllBtn = ev.target?.closest?.("button[data-dock-claim-all]");
    if (dockClaimAllBtn && elFunctionsTraining.contains(dockClaimAllBtn)) {
      if (dockClaimAllBtn.disabled) return;
      const keepY = dockKeepY();
      const res = claimAllWishDockRoutes(state, { redispatch: true, addExpToMon, getBeastDataByDex });
      if (res.ok) {
        const bonus = res.bonusTreasures.length ? `，稀有奇珍「${res.bonusTreasures.map((t) => t.name).join("、")}」` : "";
        addLog(`码头满载归港：共收取漂流瓶 ×${res.totalBottles}${bonus}（已原队续航）`, true);
        ui.itemsDirty = true;
      }
      dockRerender(keepY, true);
      return;
    }

    const dockOpenCrewBtn = ev.target?.closest?.("button[data-dock-open-crew]");
    if (dockOpenCrewBtn && elFunctionsTraining.contains(dockOpenCrewBtn)) {
      const routeId = dockOpenCrewBtn.getAttribute("data-dock-open-crew");
      if (routeId && getWishDockRouteDef(routeId)) {
        ui.wishDockModalRoute = routeId;
        markFunctionsDirty();
        render();
      }
      return;
    }

    const dockModalCloseBtn = ev.target?.closest?.("button[data-dock-modal-close]");
    if (dockModalCloseBtn && elFunctionsTraining.contains(dockModalCloseBtn)) {
      ui.wishDockModalRoute = null;
      markFunctionsDirty();
      render();
      return;
    }

    const dockOverlay = ev.target?.closest?.("div[data-dock-modal-overlay]");
    if (dockOverlay && elFunctionsTraining.contains(dockOverlay) && ev.target === dockOverlay) {
      ui.wishDockModalRoute = null;
      markFunctionsDirty();
      render();
      return;
    }

    const dockModalClearBtn = ev.target?.closest?.("button[data-dock-modal-clear]");
    if (dockModalClearBtn && elFunctionsTraining.contains(dockModalClearBtn)) {
      const routeId = dockModalClearBtn.getAttribute("data-dock-modal-clear");
      const dock = ensureWishDockState(state);
      if (routeId && dock?.routes?.[routeId] && !dock.routes[routeId].active) {
        dock.routes[routeId].stagedIds = [];
        markFunctionsDirty();
        render();
      }
      return;
    }

    const dockAutoPickBtn = ev.target?.closest?.("button[data-dock-autopick]");
    if (dockAutoPickBtn && elFunctionsTraining.contains(dockAutoPickBtn)) {
      if (dockAutoPickBtn.disabled) return;
      const keepY = dockKeepY();
      const routeId = dockAutoPickBtn.getAttribute("data-dock-autopick");
      const res = autoPickWishDockCrew(state, routeId, { getBeastDataByDex });
      if (!res.ok) addLog("该航线暂无空闲伙伴可优选");
      dockRerender(keepY);
      return;
    }

    const dockDispatchBtn = ev.target?.closest?.("button[data-dock-dispatch]");
    if (dockDispatchBtn && elFunctionsTraining.contains(dockDispatchBtn)) {
      if (dockDispatchBtn.disabled) return;
      const keepY = dockKeepY();
      const routeId = dockDispatchBtn.getAttribute("data-dock-dispatch");
      const res = dispatchWishDockRoute(state, routeId, null, { getBeastDataByDex });
      if (res.ok) {
        ui.wishDockModalRoute = null;
        addLog(res.logLine, true);
      } else {
        addLog("出海失败：请先编排空闲船员");
      }
      dockRerender(keepY, res.ok);
      return;
    }

    const dockBreezeBtn = ev.target?.closest?.("button[data-dock-breeze]");
    if (dockBreezeBtn && elFunctionsTraining.contains(dockBreezeBtn)) {
      if (dockBreezeBtn.disabled) return;
      const keepY = dockKeepY();
      const routeId = dockBreezeBtn.getAttribute("data-dock-breeze");
      const res = breezeCompleteWishDockRoute(state, routeId);
      if (res.ok) {
        const costZh = res.costKind === "free_daily" ? "使用今日免费顺风" : `消耗未来币 ×${WISH_DOCK_BREEZE_COIN_COST}`;
        addLog(`顺风速航：「${getWishDockRouteDef(routeId)?.name || routeId}」船员提前满载归港（${costZh}）`, true);
      } else {
        addLog(`顺风速航需要今日免费次数或未来币 ×${WISH_DOCK_BREEZE_COIN_COST}`);
      }
      dockRerender(keepY);
      return;
    }

    const dockRecallBtn = ev.target?.closest?.("button[data-dock-recall]");
    if (dockRecallBtn && elFunctionsTraining.contains(dockRecallBtn)) {
      const keepY = dockKeepY();
      const routeId = dockRecallBtn.getAttribute("data-dock-recall");
      const res = recallWishDockRoute(state, routeId);
      if (res.ok) addLog(`码头召回：「${getWishDockRouteDef(routeId)?.name || routeId}」船员已返航（本趟无漂流瓶收获）`);
      dockRerender(keepY, res.ok);
      return;
    }

    const dockClaimBtn = ev.target?.closest?.("button[data-dock-claim],button[data-dock-claim-redispatch]");
    if (dockClaimBtn && elFunctionsTraining.contains(dockClaimBtn)) {
      const keepY = dockKeepY();
      const redispatch = dockClaimBtn.hasAttribute("data-dock-claim-redispatch");
      const routeId = dockClaimBtn.getAttribute(redispatch ? "data-dock-claim-redispatch" : "data-dock-claim");
      const res = claimWishDockRoute(state, routeId, { redispatch, addExpToMon, getBeastDataByDex });
      if (res.ok) {
        addLog(`${res.logLine}${res.redispatched ? "（已原队续航）" : ""}`, true);
        ui.itemsDirty = true;
      }
      dockRerender(keepY, true);
      return;
    }

    const dockOpenBtn = ev.target?.closest?.("button[data-dock-open]");
    if (dockOpenBtn && elFunctionsTraining.contains(dockOpenBtn)) {
      if (dockOpenBtn.disabled) return;
      const keepY = dockKeepY();
      const batch = dockOpenBtn.getAttribute("data-dock-open") === "batch";
      const res = openDriftBottles(state, batch ? WISH_DOCK_OPEN_BATCH : 1, { addRes });
      if (res.ok) {
        addLog(res.logLine, true);
        ui.itemsDirty = true;
      } else {
        addLog("码头上暂时没有漂流瓶，派伙伴出海拾贝或领取潮汐馈赠吧");
      }
      dockRerender(keepY);
      return;
    }

    const dockForgeBtn = ev.target?.closest?.("button[data-dock-forge]");
    if (dockForgeBtn && elFunctionsTraining.contains(dockForgeBtn)) {
      if (dockForgeBtn.disabled) return;
      const keepY = dockKeepY();
      const badgeId = dockForgeBtn.getAttribute("data-dock-forge") || "";
      const res = forgeOceanBadge(state, badgeId);
      addLog(res.ok ? res.logLine : "铸造海洋奇珍纪念章所需奇珍或材料不足", res.ok);
      ui.itemsDirty = true;
      dockRerender(keepY);
      return;
    }

    // --- ML-8 Ancient Amber Gene Revival Lab Actions ---
    const amberClaimDailyBtn = ev.target?.closest?.("button[data-amber-claim-daily]");
    if (amberClaimDailyBtn && elFunctionsTraining.contains(amberClaimDailyBtn)) {
      if (amberClaimDailyBtn.disabled) return;
      const keepY = typeof window !== "undefined" ? window.scrollY : 0;
      const res = claimDailyAncientAmber(state);
      if (res.ok) {
        addLog(res.logLine, true);
      } else {
        addLog("今日免费地脉掘珀已领取，明日再来勘探吧");
      }
      markFunctionsDirty();
      render();
      if (typeof window !== "undefined" && Math.abs(window.scrollY - keepY) > 0) window.scrollTo(window.scrollX || 0, keepY);
      return;
    }

    const amberSynthBtn = ev.target?.closest?.("button[data-amber-synth]");
    if (amberSynthBtn && elFunctionsTraining.contains(amberSynthBtn)) {
      if (amberSynthBtn.disabled) return;
      const keepY = typeof window !== "undefined" ? window.scrollY : 0;
      const method = amberSynthBtn.getAttribute("data-amber-synth") || "eco";
      const res = synthesizeAncientAmber(state, method);
      if (res.ok) {
        addLog(res.logLine, true);
      } else {
        addLog("凝炼远古基因琥珀所需材料不足");
      }
      markFunctionsDirty();
      render();
      if (typeof window !== "undefined" && Math.abs(window.scrollY - keepY) > 0) window.scrollTo(window.scrollX || 0, keepY);
      return;
    }

    const amberAwakenBtn = ev.target?.closest?.("button[data-amber-awaken]");
    if (amberAwakenBtn && elFunctionsTraining.contains(amberAwakenBtn)) {
      if (amberAwakenBtn.disabled) return;
      const keepY = typeof window !== "undefined" ? window.scrollY : 0;
      const impId = amberAwakenBtn.getAttribute("data-amber-awaken") || "";
      const res = awakenOrUpgradePrimalImprint(state, impId);
      if (res.ok) {
        addLog(res.logLine, true);
        markMonListDirty?.(false);
        markMonsDirty?.();
      } else {
        addLog("鉴定或升阶太古血脉印记所需琥珀或材料不足");
      }
      markFunctionsDirty();
      render();
      if (typeof window !== "undefined" && Math.abs(window.scrollY - keepY) > 0) window.scrollTo(window.scrollX || 0, keepY);
      return;
    }

    const amberEquipBtn = ev.target?.closest?.("button[data-amber-equip]");
    if (amberEquipBtn && elFunctionsTraining.contains(amberEquipBtn)) {
      if (amberEquipBtn.disabled) return;
      const keepY = typeof window !== "undefined" ? window.scrollY : 0;
      const impId = amberEquipBtn.getAttribute("data-amber-equip") || "";
      const lab = ensureAmberRevivalState(state);
      const targetMonId = lab?.selectedMonId ?? state.mons?.list?.[0]?.id ?? null;
      const res = equipPrimalImprint(state, impId, targetMonId);
      if (res.ok && res.logLine) {
        addLog(res.logLine, true);
        markMonListDirty?.(false);
        markMonsDirty?.();
      }
      markFunctionsDirty();
      render();
      if (typeof window !== "undefined" && Math.abs(window.scrollY - keepY) > 0) window.scrollTo(window.scrollX || 0, keepY);
      return;
    }

    const amberUnequipBtn = ev.target?.closest?.("button[data-amber-unequip]");
    if (amberUnequipBtn && elFunctionsTraining.contains(amberUnequipBtn)) {
      const keepY = typeof window !== "undefined" ? window.scrollY : 0;
      const impId = amberUnequipBtn.getAttribute("data-amber-unequip") || "";
      const res = unequipPrimalImprint(state, impId);
      if (res.ok) {
        addLog("琥珀基因复苏所：已将太古血脉印记卸下并归入复苏舱", true);
        markMonListDirty?.(false);
        markMonsDirty?.();
      }
      markFunctionsDirty();
      render();
      if (typeof window !== "undefined" && Math.abs(window.scrollY - keepY) > 0) window.scrollTo(window.scrollX || 0, keepY);
      return;
    }

    const amberRefineIvBtn = ev.target?.closest?.("button[data-amber-refine-iv]");
    if (amberRefineIvBtn && elFunctionsTraining.contains(amberRefineIvBtn)) {
      if (amberRefineIvBtn.disabled) return;
      const keepY = typeof window !== "undefined" ? window.scrollY : 0;
      const lab = ensureAmberRevivalState(state);
      const targetMonId = lab?.selectedMonId ?? state.mons?.list?.[0]?.id ?? null;
      const res = refinePartnerIvWithAmber(state, targetMonId);
      if (res.ok) {
        addLog(res.logLine, true);
        markMonListDirty?.(false);
        markMonsDirty?.();
      } else {
        addLog("琥珀潜能淬炼条件不足（需至少 2 枚远古基因琥珀且伙伴个体值未满 6V）");
      }
      markFunctionsDirty();
      render();
      if (typeof window !== "undefined" && Math.abs(window.scrollY - keepY) > 0) window.scrollTo(window.scrollX || 0, keepY);
      return;
    }

    const amberClearMonBtn = ev.target?.closest?.("button[data-amber-clear-mon]");
    if (amberClearMonBtn && elFunctionsTraining.contains(amberClearMonBtn)) {
      const keepY = typeof window !== "undefined" ? window.scrollY : 0;
      const monId = Number(amberClearMonBtn.getAttribute("data-amber-clear-mon"));
      if (Number.isFinite(monId) && monId > 0) {
        unequipMonPrimalImprints(state, monId);
        addLog("琥珀基因复苏所：已卸下该伙伴承载的太古血脉印记", true);
        markMonListDirty?.(false);
        markMonsDirty?.();
      }
      markFunctionsDirty();
      render();
      if (typeof window !== "undefined" && Math.abs(window.scrollY - keepY) > 0) window.scrollTo(window.scrollX || 0, keepY);
      return;
    }

    // --- ML-7 Starlight Accessory & Aurora Styling Boutique Actions ---
    const bqClaimDailyBtn = ev.target?.closest?.("button[data-bq-claim-daily]");
    if (bqClaimDailyBtn && elFunctionsTraining.contains(bqClaimDailyBtn)) {
      if (bqClaimDailyBtn.disabled) return;
      const res = claimDailyStarSand(state);
      if (res.ok) {
        addLog(res.logLine, true);
      } else {
        addLog("今日免费星辉凝砂已领取，明日再来祈愿吧");
      }
      markFunctionsDirty();
      render();
      return;
    }

    const bqSynthBtn = ev.target?.closest?.("button[data-bq-synth]");
    if (bqSynthBtn && elFunctionsTraining.contains(bqSynthBtn)) {
      if (bqSynthBtn.disabled) return;
      const method = bqSynthBtn.getAttribute("data-bq-synth") || "gold";
      const res = synthesizeStarSand(state, method);
      if (res.ok) {
        addLog(res.logLine, true);
      } else {
        addLog("星砂凝炼所需材料不足");
      }
      markFunctionsDirty();
      render();
      return;
    }

    const bqCraftBtn = ev.target?.closest?.("button[data-bq-craft]");
    if (bqCraftBtn && elFunctionsTraining.contains(bqCraftBtn)) {
      if (bqCraftBtn.disabled) return;
      const accId = bqCraftBtn.getAttribute("data-bq-craft") || "";
      const res = craftOrUpgradeBoutiqueAccessory(state, accId);
      if (res.ok) {
        addLog(res.logLine, true);
        markMonListDirty?.(false);
        markMonsDirty?.();
      } else {
        addLog("裁制或升阶星辉配饰所需材料不足");
      }
      markFunctionsDirty();
      render();
      return;
    }

    const bqEquipBtn = ev.target?.closest?.("button[data-bq-equip]");
    if (bqEquipBtn && elFunctionsTraining.contains(bqEquipBtn)) {
      if (bqEquipBtn.disabled) return;
      const accId = bqEquipBtn.getAttribute("data-bq-equip") || "";
      const bq = ensureStarBoutiqueState(state);
      const targetMonId = bq?.selectedMonId ?? state.mons?.list?.[0]?.id ?? null;
      const res = equipBoutiqueAccessory(state, accId, targetMonId);
      if (res.ok && res.logLine) {
        addLog(res.logLine, true);
        markMonListDirty?.(false);
        markMonsDirty?.();
      }
      markFunctionsDirty();
      render();
      return;
    }

    const bqUnequipBtn = ev.target?.closest?.("button[data-bq-unequip]");
    if (bqUnequipBtn && elFunctionsTraining.contains(bqUnequipBtn)) {
      const accId = bqUnequipBtn.getAttribute("data-bq-unequip") || "";
      const res = unequipBoutiqueAccessory(state, accId);
      if (res.ok) {
        addLog("星辉造型屋：已将配饰卸下并收纳至展柜", true);
        markMonListDirty?.(false);
        markMonsDirty?.();
      }
      markFunctionsDirty();
      render();
      return;
    }

    const bqSheenBtn = ev.target?.closest?.("button[data-bq-sheen]");
    if (bqSheenBtn && elFunctionsTraining.contains(bqSheenBtn)) {
      if (bqSheenBtn.disabled) return;
      const sheenId = bqSheenBtn.getAttribute("data-bq-sheen") || "";
      const bq = ensureStarBoutiqueState(state);
      const targetMonId = bq?.selectedMonId ?? state.mons?.list?.[0]?.id ?? null;
      const res = unlockOrApplyBoutiqueSheen(state, sheenId, targetMonId);
      if (res.ok) {
        addLog(
          res.newlyUnlocked
            ? "星辉造型屋：成功解锁极光流彩光晕并为伙伴调染生效！"
            : "星辉造型屋：已为伙伴切换极光流彩光晕！",
          true,
        );
        markMonListDirty?.(false);
        markMonsDirty?.();
      } else {
        addLog("闪光祈愿星砂不足，无法解锁该极光流彩光晕");
      }
      markFunctionsDirty();
      render();
      return;
    }

    const bqClearMonBtn = ev.target?.closest?.("button[data-bq-clear-mon]");
    if (bqClearMonBtn && elFunctionsTraining.contains(bqClearMonBtn)) {
      const monId = Number(bqClearMonBtn.getAttribute("data-bq-clear-mon"));
      if (Number.isFinite(monId) && monId > 0) {
        unequipBoutiqueStyle(state, monId);
        addLog("星辉造型屋：已卸下该伙伴的配饰与流彩光晕", true);
        markMonListDirty?.(false);
        markMonsDirty?.();
      }
      markFunctionsDirty();
      render();
      return;
    }

    // --- ML-7 Champion League Elite Four & Grand Champion Gauntlet Actions ---
    const funcLeagueAutoBtn = ev.target?.closest?.("button[data-func-league-auto]");
    if (funcLeagueAutoBtn && elFunctionsTraining.contains(funcLeagueAutoBtn)) {
      if (funcLeagueAutoBtn.disabled) return;
      const resolveTypes = (m) =>
        Array.isArray(m?.types) && m.types.length ? m.types : getBeastDataByDex?.(m?.dex)?.types || ["wind"];
      const res = autofillChampionLeagueSquad(state, resolveTypes, monPower);
      if (res.ok) {
        addLog(`冠军联盟：已优选 ${res.squadIds.length} 只精锐伙伴组建殿堂挑战小队`, true);
        markMonListDirty?.(false);
      }
      markFunctionsDirty();
      render();
      return;
    }

    const funcLeagueOpenModalBtn = ev.target?.closest?.("button[data-func-league-open-modal]");
    if (funcLeagueOpenModalBtn && elFunctionsTraining.contains(funcLeagueOpenModalBtn)) {
      ui.funcLeagueModalOpen = true;
      ui.__leagueModalScrollTop = 0;
      markFunctionsDirty();
      render();
      return;
    }

    const funcLeagueCloseModalBtn = ev.target?.closest?.("button[data-func-league-modal-close]");
    if (funcLeagueCloseModalBtn && elFunctionsTraining.contains(funcLeagueCloseModalBtn)) {
      ui.funcLeagueModalOpen = false;
      markFunctionsDirty();
      render();
      return;
    }

    const funcLeagueOverlay = ev.target?.closest?.("div[data-func-league-modal-overlay]");
    if (funcLeagueOverlay && elFunctionsTraining.contains(funcLeagueOverlay) && ev.target === funcLeagueOverlay) {
      ui.funcLeagueModalOpen = false;
      markFunctionsDirty();
      render();
      return;
    }

    const funcLeagueResetBtn = ev.target?.closest?.("button[data-func-league-reset]");
    if (funcLeagueResetBtn && elFunctionsTraining.contains(funcLeagueResetBtn)) {
      resetChampionLeagueProgress(state);
      addLog("冠军联盟：已将逐殿挑战进度重置回第 1 殿「炎狱天王」");
      markFunctionsDirty();
      render();
      return;
    }

    const funcLeagueFightBtn = ev.target?.closest?.("button[data-func-league-fight]");
    if (funcLeagueFightBtn && elFunctionsTraining.contains(funcLeagueFightBtn)) {
      if (funcLeagueFightBtn.disabled) return;
      const mode = funcLeagueFightBtn.getAttribute("data-func-league-fight") === "single" ? "single" : "full";
      const res = simulateLeagueGauntlet(state, {
        mode,
        getBeastDataByDex,
        monPower,
        addRes,
        addExpToMon,
      });
      // ML-15：整队外出（squad_away）时给出明确原因；部分外出时提示谁本场不出战
      if (!res.ok) addLog(res.log?.[0] || "冠军联盟暂不可挑战");
      else if (res.benchedAway?.length) addLog(`冠军联盟：${res.benchedAway.map((b) => `${b.name}（${b.awayLabel}）`).join("、")}本场不出战`);
      if (res.ok) {
        const sandGot = res.rewardsEarned?.shinyStarSand || 0;
        if (res.championCleared) {
          addLog(
            `冠军联盟登顶捷报：连破四天王与圣殿总冠军！获闪光祈愿星砂 +${sandGot}，参战伙伴刻印【冠军殿堂绶带】（殿堂 Tier ${res.hallOfFameTier}）！`,
            true,
          );
        } else if (res.win) {
          addLog(`冠军联盟捷报：成功攻克当前天王殿，获得闪光祈愿星砂 +${sandGot}！`, true);
        } else {
          addLog(
            `冠军联盟战报：攻克 ${res.stagesCleared} 殿后止步于【${res.stoppedTitle || "四天王"}】${sandGot > 0 ? `（已获星砂 +${sandGot}）` : ""}，提升配饰或烹制盛宴后再战吧！`,
          );
        }
        markMonListDirty?.(false);
        markMonsDirty?.();
      }
      markFunctionsDirty();
      render();
      return;
    }

    // --- ML-6 Starlight Camp & Cuisine Workshop Actions ---
    const campAutoFillBtn = ev.target?.closest?.("button[data-camp-autofill]");
    if (campAutoFillBtn && elFunctionsTraining.contains(campAutoFillBtn)) {
      if (campAutoFillBtn.disabled) return;
      const res = autoFillStarCampSquad(state, { getBeastDataByDex });
      if (res.ok) {
        addLog(`星界露营野餐屋：已邀请 ${res.stationedIds.length} 只伙伴温馨入驻（激活【${res.harmony?.name || "星营共鸣"}】）`, true);
        markMonListDirty?.(false);
      } else {
        addLog("星界露营野餐屋：暂无空闲可入驻伙伴");
      }
      markFunctionsDirty();
      render();
      return;
    }

    const campOpenSquadBtn = ev.target?.closest?.("button[data-camp-open-squad]");
    if (campOpenSquadBtn && elFunctionsTraining.contains(campOpenSquadBtn)) {
      ui.starCampModalOpen = true;
      ui.__campModalScrollTop = 0;
      markFunctionsDirty();
      render();
      return;
    }

    const campCloseModalBtn = ev.target?.closest?.("button[data-camp-modal-close]");
    if (campCloseModalBtn && elFunctionsTraining.contains(campCloseModalBtn)) {
      ui.starCampModalOpen = false;
      markFunctionsDirty();
      render();
      return;
    }

    const campOverlay = ev.target?.closest?.("div[data-camp-modal-overlay]");
    if (campOverlay && elFunctionsTraining.contains(campOverlay) && ev.target === campOverlay) {
      ui.starCampModalOpen = false;
      markFunctionsDirty();
      render();
      return;
    }

    const campClearBtn = ev.target?.closest?.("button[data-camp-clear]");
    if (campClearBtn && elFunctionsTraining.contains(campClearBtn)) {
      clearStarCampSquad(state);
      markMonListDirty?.(false);
      markFunctionsDirty();
      render();
      return;
    }

    const campToggleMonBtn = ev.target?.closest?.("button[data-camp-toggle-mon]");
    if (campToggleMonBtn && elFunctionsTraining.contains(campToggleMonBtn)) {
      const monId = Number(campToggleMonBtn.getAttribute("data-camp-toggle-mon"));
      if (Number.isFinite(monId) && monId > 0) {
        toggleStarCampCompanion(state, monId);
        markMonListDirty?.(false);
        markFunctionsDirty();
        render();
      }
      return;
    }

    const campEnsembleBtn = ev.target?.closest?.("button[data-camp-ensemble]");
    if (campEnsembleBtn && elFunctionsTraining.contains(campEnsembleBtn)) {
      if (campEnsembleBtn.disabled) return;
      const res = performStarCampEnsemble(state);
      if (res.ok) {
        addLog(res.flavorLine, true);
        markMonsDirty?.();
      } else if (res.reason === "daily_limit_reached") {
        addLog("星界露营：今日营火合奏次数已用完，明日再来围炉欢聚吧！");
      } else {
        addLog("星界露营：请先邀请至少 1 只萌灵入驻营地再开启营火合奏");
      }
      markFunctionsDirty();
      render();
      return;
    }

    const campCookBtn = ev.target?.closest?.("button[data-camp-cook]");
    if (campCookBtn && elFunctionsTraining.contains(campCookBtn)) {
      if (campCookBtn.disabled) return;
      const recipeId = campCookBtn.getAttribute("data-camp-cook");
      const res = cookCampRecipe(state, recipeId);
      if (res.ok) {
        addLog(`料理工坊：${res.logLine}`, true);
        markMonsDirty?.();
      } else {
        addLog("料理工坊：所需食材或野餐香草不足，可通过驻营伴游、营火合奏或生态沙盘收集");
      }
      markFunctionsDirty();
      render();
      return;
    }

    // --- ML-5 Eco-Sandbox Actions ---
    const ecoAutoDispatchAllBtn = ev.target?.closest?.("button[data-eco-auto-dispatch-all]");
    if (ecoAutoDispatchAllBtn && elFunctionsTraining.contains(ecoAutoDispatchAllBtn)) {
      if (ecoAutoDispatchAllBtn.disabled) return;
      const res = autoDispatchAllEcoSandbox(state, { getBeastDataByDex });
      if (res.ok) {
        addLog(`秘境生态沙盘：已优选空闲伙伴派遣至 ${res.dispatched.length} 处生态区`, true);
        markMonListDirty?.(false);
      } else {
        addLog("秘境生态沙盘：当前无可派遣的空闲萌灵或全部生态区已在勘探中");
      }
      markFunctionsDirty();
      render();
      return;
    }

    const ecoClaimAllBtn = ev.target?.closest?.("button[data-eco-claim-all-redispatch]");
    if (ecoClaimAllBtn && elFunctionsTraining.contains(ecoClaimAllBtn)) {
      if (ecoClaimAllBtn.disabled) return;
      const res = claimAllEcoSandboxZones(state, {
        redispatch: true,
        addRes,
        addExpToMon,
        getBeastDataByDex,
      });
      if (res.ok) {
        const mintGot = res.totalRewards.tuningMint || 0;
        const relicTxt = res.relicsFound.length
          ? ` · 发掘古遗物：${res.relicsFound.map((r) => `${r.name}(阶${r.rank})`).join("、")}`
          : "";
        addLog(`秘境沙盘全收续派：共结算 ${res.claimed.length} 区，心性调律薄荷 +${mintGot}${relicTxt}`, true);
        ui.futureDirty = true;
        ui.itemsDirty = true;
        ui.pveDirty = true;
        markMonsDirty?.();
        markMonListDirty?.(false);
      }
      markFunctionsDirty();
      render();
      return;
    }

    const ecoOpenSquadBtn = ev.target?.closest?.("button[data-eco-open-squad]");
    if (ecoOpenSquadBtn && elFunctionsTraining.contains(ecoOpenSquadBtn)) {
      const zoneId = ecoOpenSquadBtn.getAttribute("data-eco-open-squad");
      if (zoneId && getEcoZoneDef(zoneId)) {
        ui.ecoModalZoneId = zoneId;
        markFunctionsDirty();
        render();
      }
      return;
    }

    const ecoModalCloseBtn = ev.target?.closest?.("button[data-eco-modal-close]");
    if (ecoModalCloseBtn && elFunctionsTraining.contains(ecoModalCloseBtn)) {
      ui.ecoModalZoneId = null;
      markFunctionsDirty();
      render();
      return;
    }

    const ecoOverlay = ev.target?.closest?.("div[data-eco-modal-overlay]");
    if (ecoOverlay && elFunctionsTraining.contains(ecoOverlay) && ev.target === ecoOverlay) {
      ui.ecoModalZoneId = null;
      markFunctionsDirty();
      render();
      return;
    }

    const ecoModalClearBtn = ev.target?.closest?.("button[data-eco-modal-clear]");
    if (ecoModalClearBtn && elFunctionsTraining.contains(ecoModalClearBtn)) {
      const zoneId = ecoModalClearBtn.getAttribute("data-eco-modal-clear");
      const sb = ensureEcoSandboxState(state);
      if (zoneId && sb?.zones?.[zoneId] && !sb.zones[zoneId].active) {
        sb.zones[zoneId].stagedIds = [];
        markMonListDirty?.(false);
        markFunctionsDirty();
        render();
      }
      return;
    }

    const ecoAutoPickBtn = ev.target?.closest?.("button[data-eco-autopick]");
    if (ecoAutoPickBtn && elFunctionsTraining.contains(ecoAutoPickBtn)) {
      if (ecoAutoPickBtn.disabled) return;
      const zoneId = ecoAutoPickBtn.getAttribute("data-eco-autopick");
      const res = autoPickEcoSandboxSquad(state, zoneId, { getBeastDataByDex });
      if (res.ok) {
        markMonListDirty?.(false);
      } else {
        addLog("该生态区暂无空闲伙伴可供优选编队");
      }
      markFunctionsDirty();
      render();
      return;
    }

    const ecoDispatchBtn = ev.target?.closest?.("button[data-eco-dispatch]");
    if (ecoDispatchBtn && elFunctionsTraining.contains(ecoDispatchBtn)) {
      if (ecoDispatchBtn.disabled) return;
      const zoneId = ecoDispatchBtn.getAttribute("data-eco-dispatch");
      const res = dispatchEcoSandboxZone(state, zoneId, null, { getBeastDataByDex });
      if (res.ok) {
        const zDef = getEcoZoneDef(zoneId);
        ui.ecoModalZoneId = null;
        addLog(`秘境沙盘派遣：${zDef?.name || zoneId}（编队 ${res.squadIds.length} 只 · 契合度 x${res.affinityMul.toFixed(2)}）`, true);
        markMonListDirty?.(false);
      }
      markFunctionsDirty();
      render();
      return;
    }

    const ecoCancelBtn = ev.target?.closest?.("button[data-eco-cancel]");
    if (ecoCancelBtn && elFunctionsTraining.contains(ecoCancelBtn)) {
      const zoneId = ecoCancelBtn.getAttribute("data-eco-cancel");
      const res = cancelEcoSandboxZone(state, zoneId);
      if (res.ok) {
        const zDef = getEcoZoneDef(zoneId);
        addLog(`秘境沙盘撤回：${zDef?.name || zoneId} 勘探队已返回营地`);
        markMonListDirty?.(false);
      }
      markFunctionsDirty();
      render();
      return;
    }

    const ecoInstantBtn = ev.target?.closest?.("button[data-eco-instant]");
    if (ecoInstantBtn && elFunctionsTraining.contains(ecoInstantBtn)) {
      if (ecoInstantBtn.disabled) return;
      const zoneId = ecoInstantBtn.getAttribute("data-eco-instant");
      const res = instantCompleteEcoSandboxZone(state, zoneId);
      if (res.ok) {
        const zDef = getEcoZoneDef(zoneId);
        const costZh =
          res.costKind === "free_daily"
            ? "消耗今日免费速勘次数"
            : res.costKind === "searchFlare"
              ? "消耗搜索信号弹 ×1"
              : "消耗未来币 ×15";
        addLog(`灵能速勘完成：${zDef?.name || zoneId}（${costZh}），可立即领取收获！`, true);
      }
      markFunctionsDirty();
      render();
      return;
    }

    const ecoClaimBtn = ev.target?.closest?.("button[data-eco-claim],button[data-eco-claim-redispatch]");
    if (ecoClaimBtn && elFunctionsTraining.contains(ecoClaimBtn)) {
      const redispatch = ecoClaimBtn.hasAttribute("data-eco-claim-redispatch");
      const zoneId = ecoClaimBtn.getAttribute(redispatch ? "data-eco-claim-redispatch" : "data-eco-claim");
      const res = claimEcoSandboxZone(state, zoneId, {
        redispatch,
        addRes,
        addExpToMon,
        getBeastDataByDex,
      });
      if (res.ok) {
        const mintGot = res.rewards.tuningMint || 0;
        const relicNote = res.relicFound ? ` · 发掘遗物「${res.relicFound.name}」阶${res.relicFound.rank}` : "";
        addLog(
          `秘境收获（${res.zoneName}）：心性调律薄荷 +${mintGot}${relicNote}${res.redispatched ? "（已自动原队续派）" : ""}`,
          true,
        );
        ui.futureDirty = true;
        ui.itemsDirty = true;
        ui.pveDirty = true;
        markMonsDirty?.();
        markMonListDirty?.(false);
      }
      markFunctionsDirty();
      render();
      return;
    }

    // --- ML-5 Temperament Mint Workshop Actions ---
    const mintPresetBtn = ev.target?.closest?.("button[data-mint-preset]");
    if (mintPresetBtn && elFunctionsTraining.contains(mintPresetBtn)) {
      const pid = mintPresetBtn.getAttribute("data-mint-preset");
      const preset = MINT_TUNING_PRESETS.find((p) => p.id === pid);
      if (preset) {
        if (preset.up === null && preset.down === null) {
          ui.mintWorkshopNeutral = true;
        } else {
          ui.mintWorkshopNeutral = false;
          ui.mintWorkshopUp = preset.up;
          ui.mintWorkshopDown = preset.down;
        }
        markFunctionsDirty();
        render();
      }
      return;
    }

    const mintUpBtn = ev.target?.closest?.("button[data-mint-up]");
    if (mintUpBtn && elFunctionsTraining.contains(mintUpBtn)) {
      const val = mintUpBtn.getAttribute("data-mint-up");
      if (val === "neutral") {
        ui.mintWorkshopNeutral = true;
      } else if (TUNABLE_STATS.includes(val)) {
        ui.mintWorkshopNeutral = false;
        ui.mintWorkshopUp = val;
        if (!TUNABLE_STATS.includes(ui.mintWorkshopDown) || ui.mintWorkshopDown === val) {
          ui.mintWorkshopDown = val === "spa" ? "atk" : "spa";
        }
      }
      markFunctionsDirty();
      render();
      return;
    }

    const mintDownBtn = ev.target?.closest?.("button[data-mint-down]");
    if (mintDownBtn && elFunctionsTraining.contains(mintDownBtn)) {
      if (mintDownBtn.disabled) return;
      const val = mintDownBtn.getAttribute("data-mint-down");
      if (TUNABLE_STATS.includes(val) && val !== ui.mintWorkshopUp) {
        ui.mintWorkshopNeutral = false;
        ui.mintWorkshopDown = val;
        markFunctionsDirty();
        render();
      }
      return;
    }

    const mintRecBtn = ev.target?.closest?.("button[data-mint-recommend]");
    if (mintRecBtn && elFunctionsTraining.contains(mintRecBtn)) {
      const listNow = (state.mons?.list ?? []).filter(Boolean);
      const monId =
        typeof ui.mintWorkshopMonId === "number" && listNow.some((m) => m.id === ui.mintWorkshopMonId)
          ? ui.mintWorkshopMonId
          : listNow[0]?.id ?? null;
      const targetMon = monId != null ? listNow.find((m) => m.id === monId) : null;
      if (targetMon) {
        const rec = recommendMintTuningForMon(targetMon, getBeastDataByDex);
        ui.mintWorkshopNeutral = false;
        ui.mintWorkshopUp = rec.up;
        ui.mintWorkshopDown = rec.down;
        markFunctionsDirty();
        render();
      }
      return;
    }

    const mintApplyBtn = ev.target?.closest?.("button[data-mint-apply]");
    if (mintApplyBtn && elFunctionsTraining.contains(mintApplyBtn)) {
      if (mintApplyBtn.disabled) return;
      const listNow = (state.mons?.list ?? []).filter(Boolean);
      const monId =
        typeof ui.mintWorkshopMonId === "number" && listNow.some((m) => m.id === ui.mintWorkshopMonId)
          ? ui.mintWorkshopMonId
          : listNow[0]?.id ?? null;
      const targetMon = monId != null ? listNow.find((m) => m.id === monId) : null;
      if (!targetMon) return;
      const recSpec = recommendMintTuningForMon(targetMon, getBeastDataByDex);
      const curNorm = normalizeMintTuning(targetMon.mintTuning);
      let up = ui.mintWorkshopUp;
      let down = ui.mintWorkshopDown;
      const isNeutral = Boolean(ui.mintWorkshopNeutral);
      if (!isNeutral) {
        if (!TUNABLE_STATS.includes(up)) up = curNorm?.up || recSpec.up || "atk";
        if (!TUNABLE_STATS.includes(down) || down === up) {
          down = curNorm?.down && curNorm.down !== up ? curNorm.down : up === "spa" ? "atk" : "spa";
        }
      }
      const spec = isNeutral ? { up: null, down: null } : { up, down };
      const res = applyMintTuningToMon(state, targetMon.id, spec);
      if (res.ok) {
        addLog(`心性调律完成：${targetMon.name} 偏向更新为「${res.label}」`, true);
        ui.pveDirty = true;
        ui.futureDirty = true;
        ui.itemsDirty = true;
        markMonsDirty?.();
        markMonListDirty?.(false);
      } else {
        addLog("心性调律未生效：请确认拥有心性调律薄荷且目标偏向与当前不同");
      }
      markFunctionsDirty();
      render();
      return;
    }

    const trainOpenBtn = ev.target?.closest?.("button[data-train-open]");
    if (trainOpenBtn && elFunctionsTraining.contains(trainOpenBtn)) {
      const slotSize =
        typeof state.training?.slotSize === "number" && Number.isFinite(state.training.slotSize)
          ? Math.max(0, Math.floor(state.training.slotSize))
          : 0;
      if (slotSize < 1) return;
      const activeIds = Array.isArray(state.training?.activeIds) ? state.training.activeIds : [];
      if (activeIds.length >= slotSize) return;
      ui.trainingModalOpen = true;
      ui.trainingModalSelectedIds = [];
      markFunctionsDirty();
      render();
      return;
    }

    const trainCloseBtn = ev.target?.closest?.("button[data-train-modal-close]");
    if (trainCloseBtn && elFunctionsTraining.contains(trainCloseBtn)) {
      ui.trainingModalOpen = false;
      markFunctionsDirty();
      render();
      return;
    }
    const trainOverlay = ev.target?.closest?.("div[data-train-modal-overlay]");
    if (trainOverlay && elFunctionsTraining.contains(trainOverlay)) {
      if (ev.target === trainOverlay) {
        ui.trainingModalOpen = false;
        markFunctionsDirty();
        render();
        return;
      }
    }
    const trainClearBtn = ev.target?.closest?.("button[data-train-modal-clear]");
    if (trainClearBtn && elFunctionsTraining.contains(trainClearBtn)) {
      ui.trainingModalSelectedIds = [];
      markFunctionsDirty();
      render();
      return;
    }
    const trainConfirmBtn = ev.target?.closest?.("button[data-train-modal-confirm]");
    if (trainConfirmBtn && elFunctionsTraining.contains(trainConfirmBtn)) {
      if (!state.training || typeof state.training !== "object") state.training = { activeIds: [], slotSize: 0 };
      if (!Array.isArray(state.training.activeIds)) state.training.activeIds = [];
      const slotSize =
        typeof state.training.slotSize === "number" && Number.isFinite(state.training.slotSize)
          ? Math.max(0, Math.floor(state.training.slotSize))
          : 0;
      const used = state.training.activeIds.length;
      const capLeft = Math.max(0, slotSize - used);
      if (capLeft <= 0) return;
      const sel0 = Array.isArray(ui.trainingModalSelectedIds) ? ui.trainingModalSelectedIds : [];
      const alive = state.mons?.list ?? [];
      // ML-14 统一忙碌排除：确认时再过滤一次外出 / 驻场中的伙伴
      const pickMons = excludeAwayMons(
        state,
        sel0.map((id) => alive.find((m) => m && m.id === id) ?? null).filter((x) => x),
      ).slice(0, capLeft);
      if (pickMons.length <= 0) return;
      for (const mon of pickMons) {
        if (!state.training.activeIds.includes(mon.id) && state.training.activeIds.length < slotSize) {
          state.training.activeIds.push(mon.id);
          addLog(`训练开始：${mon.name}`);
        }
      }
      ui.trainingModalOpen = false;
      ui.trainingModalSelectedIds = [];
      markFunctionsDirty();
      render();
      return;
    }

    const feedBtn = ev.target?.closest?.("button[data-train-feed]");
    if (feedBtn && elFunctionsTraining.contains(feedBtn)) {
      if (feedBtn.disabled) return;
      const id = Number(feedBtn.getAttribute("data-train-feed"));
      if (!Number.isFinite(id)) return;
      const m = (state.mons?.list ?? []).find((x) => x.id === id);
      if (!m) return;

      const sat0 = clamp(typeof m.satiety === "number" && Number.isFinite(m.satiety) ? m.satiety : 100, 0, 100);
      if (sat0 >= 100) return;

      const needSat = Math.max(0, 100 - sat0);
      const stepsNeed = Math.max(0, Math.ceil(needSat / 5));
      const needCatnip = stepsNeed * 100;
      const haveCatnip = Math.max(0, Math.floor(state.res.catnip.value ?? 0));

      if (haveCatnip < 100) {
        addLog(`喂食失败：灵果不足（需要 ${needCatnip}，当前 ${haveCatnip}）`, true);
        return;
      }

      if (haveCatnip >= needCatnip) {
        state.res.catnip.value = Math.max(0, state.res.catnip.value - needCatnip);
        m.satiety = 100;
        addLog(`喂食：${m.name} 饱腹度补满（消耗灵果 ${needCatnip}）`, true);
      } else {
        const steps = Math.max(0, Math.floor(haveCatnip / 100));
        const cost = steps * 100;
        const addSat = steps * 5;
        const sat1 = clamp(sat0 + addSat, 0, 100);
        state.res.catnip.value = Math.max(0, state.res.catnip.value - cost);
        m.satiety = sat1;
        const miss = Math.max(0, needCatnip - cost);
        addLog(`喂食：${m.name} 饱腹度 +${Math.floor(sat1 - sat0)}（灵果不足，距离喂满还差 ${miss}）`, true);
      }

      markMonListDirty(false);
      render();
      return;
    }

    const cancelBtn = ev.target?.closest?.("button[data-train-cancel]");
    if (cancelBtn && elFunctionsTraining.contains(cancelBtn)) {
      const cid = Number(cancelBtn.getAttribute("data-train-cancel"));
      if (state.training && typeof state.training === "object") {
        if (!Array.isArray(state.training.activeIds)) state.training.activeIds = [];
        state.training.activeIds = state.training.activeIds.filter((x) => x !== cid);
      }
      addLog("训练已取消");
      markFunctionsDirty();
      render();
    }

    const breedLockBtn = ev.target?.closest?.("button[data-breed-ability-lock]");
    if (breedLockBtn && elFunctionsTraining.contains(breedLockBtn)) {
      const bState = ensureBreedingState(state);
      const nextLock = normalizeAbilityLock(breedLockBtn.getAttribute("data-breed-ability-lock"));
      if (bState.abilityLock !== nextLock) {
        bState.abilityLock = nextLock;
        const lockLabel = nextLock === "a" ? "锁定伙伴 A 特性" : nextLock === "b" ? "锁定伙伴 B 特性" : "双亲优选遗传";
        addLog(`优生特性规则：${lockLabel}`, true);
        markFunctionsDirty();
        render();
      }
      return;
    }

    const breedOpenBtn = ev.target?.closest?.("button[data-breed-open]");
    if (breedOpenBtn && elFunctionsTraining.contains(breedOpenBtn)) {
      ensureBreedingState(state);
      if (Boolean(state.breeding.on)) return;
      ui.breedingModalOpen = true;
      ui.breedingModalSelectedIds = [];
      markFunctionsDirty();
      render();
      return;
    }

    const breedCloseBtn = ev.target?.closest?.("button[data-breed-modal-close]");
    if (breedCloseBtn && elFunctionsTraining.contains(breedCloseBtn)) {
      ui.breedingModalOpen = false;
      markFunctionsDirty();
      render();
      return;
    }
    const breedOverlay = ev.target?.closest?.("div[data-breed-modal-overlay]");
    if (breedOverlay && elFunctionsTraining.contains(breedOverlay)) {
      if (ev.target === breedOverlay) {
        ui.breedingModalOpen = false;
        markFunctionsDirty();
        render();
        return;
      }
    }
    const breedClearBtn = ev.target?.closest?.("button[data-breed-modal-clear]");
    if (breedClearBtn && elFunctionsTraining.contains(breedClearBtn)) {
      ui.breedingModalSelectedIds = [];
      markFunctionsDirty();
      render();
      return;
    }
    const breedConfirmBtn = ev.target?.closest?.("button[data-breed-modal-confirm]");
    if (breedConfirmBtn && elFunctionsTraining.contains(breedConfirmBtn)) {
      ensureBreedingState(state);
      if (Boolean(state.breeding.on)) return;
      const sel0 = Array.isArray(ui.breedingModalSelectedIds) ? ui.breedingModalSelectedIds : [];
      const alive = state.mons?.list ?? [];
      const expBusyIds = new Set(
        Boolean(state.expedition?.on) && Array.isArray(state.expedition.activeIds) ? state.expedition.activeIds : [],
      );
      const sel = sel0
        .map((id) => alive.find((m) => m && m.id === id) ?? null)
        .filter((x) => x && !expBusyIds.has(x.id))
        .slice(0, 2);
      if (sel.length !== 2) return;
      if (sel[0].id === sel[1].id) return;
      state.breeding.aId = sel[0].id;
      state.breeding.bId = sel[1].id;
      state.breeding.on = true;
      state.breeding.eggRemainingSec = 0;
      state.breeding.eggTotalSec = 0;
      ui.breedingModalOpen = false;
      ui.breedingModalSelectedIds = [];
      addLog("开始饲养", true);
      markFunctionsDirty();
      render();
      return;
    }

    const breedCancelBtn = ev.target?.closest?.("button[data-breed-cancel]");
    if (breedCancelBtn && elFunctionsTraining.contains(breedCancelBtn)) {
      if (state.breeding && typeof state.breeding === "object") {
        state.breeding.on = false;
        state.breeding.eggRemainingSec = 0;
        state.breeding.eggTotalSec = 0;
      }
      addLog("饲养已取消", true);
      markFunctionsDirty();
      render();
    }

    const expTeamOpenBtn = ev.target?.closest?.("button[data-exp-team-open]");
    if (expTeamOpenBtn && elFunctionsTraining.contains(expTeamOpenBtn)) {
      if (!state.expedition || typeof state.expedition !== "object") return;
      const expOn = Boolean(state.expedition.on) && (state.expedition.remainingSec ?? 0) > 0;
      if (expOn) return;
      ui.expeditionTeamModalOpen = true;
      markFunctionsDirty();
      render();
      return;
    }

    const expTeamCloseBtn = ev.target?.closest?.("button[data-exp-team-close]");
    if (expTeamCloseBtn && elFunctionsTraining.contains(expTeamCloseBtn)) {
      ui.expeditionTeamModalOpen = false;
      markFunctionsDirty();
      render();
      return;
    }

    const expTeamOverlay = ev.target?.closest?.("div[data-exp-team-overlay]");
    if (expTeamOverlay && elFunctionsTraining.contains(expTeamOverlay)) {
      if (ev.target === expTeamOverlay) {
        ui.expeditionTeamModalOpen = false;
        markFunctionsDirty();
        render();
        return;
      }
    }

    const expDungeonBtn = ev.target?.closest?.("button[data-exp-dungeon]");
    if (expDungeonBtn && elFunctionsTraining.contains(expDungeonBtn)) {
      if (!state.expedition || typeof state.expedition !== "object") return;
      const key = expDungeonBtn.getAttribute("data-exp-dungeon");
      if (!key) return;
      state.expedition.selectedDungeonKey = String(key);
      markFunctionsDirty();
      render();
      return;
    }

    const expClearBtn = ev.target?.closest?.("button[data-exp-clear]");
    if (expClearBtn && elFunctionsTraining.contains(expClearBtn)) {
      if (!state.expedition || typeof state.expedition !== "object") return;
      state.expedition.selectedIds = [];
      markFunctionsDirty();
      render();
      return;
    }

    const expAutoBtn = ev.target?.closest?.("button[data-exp-team-auto]");
    if (expAutoBtn && elFunctionsTraining.contains(expAutoBtn)) {
      if (!state.expedition || typeof state.expedition !== "object") return;
      const expOn = Boolean(state.expedition.on) && (state.expedition.remainingSec ?? 0) > 0;
      if (expOn) return;
      ui.expeditionTeamAutoPick = true;
      markFunctionsDirty();
      render();
      return;
    }

    const expRemoveBtn = ev.target?.closest?.("button[data-exp-remove]");
    if (expRemoveBtn && elFunctionsTraining.contains(expRemoveBtn)) {
      if (!state.expedition || typeof state.expedition !== "object") return;
      const id = Number(expRemoveBtn.getAttribute("data-exp-remove"));
      if (!Number.isFinite(id)) return;
      if (!Array.isArray(state.expedition.selectedIds)) state.expedition.selectedIds = [];
      state.expedition.selectedIds = state.expedition.selectedIds.filter((x) => x !== id);
      markFunctionsDirty();
      render();
      return;
    }

    const expStartBtn = ev.target?.closest?.("button[data-exp-start]");
    if (expStartBtn && elFunctionsTraining.contains(expStartBtn)) {
      if (!state.expedition || typeof state.expedition !== "object") return;
      ui.expeditionTeamModalOpen = false;
      const postLvl = clamp(state.buildings?.expeditionPost?.owned ?? 0, 0, 10);
      if (postLvl < 1) return;
      const selLvl = typeof state.expedition.selectedLevel === "string" ? state.expedition.selectedLevel : "basic";
      const lvlDef = getExpLevelDef(selLvl);
      if (postLvl < lvlDef.unlockLvl) return;

      const dungeons = state.expedition.dungeons?.[selLvl];
      const dlist = Array.isArray(dungeons) ? dungeons : [];
      const d = dlist.find((x) => x && x.key === state.expedition.selectedDungeonKey) ?? dlist[0] ?? null;
      if (!d) return;

      const typeMul = (m, dungeonType) => expeditionTypeMul(m, dungeonType, getBeastDataByDex);

      // ML-14 统一忙碌排除：出征时再过滤一次外出 / 驻场中的伙伴
      const selIds = dropAwayMonIds(state, Array.isArray(state.expedition.selectedIds) ? state.expedition.selectedIds.slice(0, 20) : []);
      const mons = state.mons?.list ?? [];
      const selMons = selIds.map((id) => mons.find((x) => x && x.id === id) ?? null).filter((x) => x);
      if (selMons.length <= 0) return;
      if (state.breeding?.on && selMons.some((m) => m.id === state.breeding.aId || m.id === state.breeding.bId)) return;
      for (const m of selMons) {
        const cd0 =
          typeof m.skillCdRemainingSec === "number" && Number.isFinite(m.skillCdRemainingSec)
            ? Math.max(0, m.skillCdRemainingSec)
            : 0;
        if (cd0 > 0) return;
      }

      const selMonsSorted = selMons
        .map((m) => ({ m, effPower: monPower(m) * typeMul(m, d.type) }))
        .sort((a, b) => (b.effPower ?? 0) - (a.effPower ?? 0))
        .map((x) => x.m);

      const effPower = selMonsSorted.reduce((acc, m) => acc + monPower(m) * typeMul(m, d.type), 0);
      if (effPower < lvlDef.req) return;
      const baseSec = 7200;
      const excessPct = Math.max(0, (effPower - lvlDef.req) / lvlDef.req);
      const natureTimeMul = expeditionNatureTimeMul(selMonsSorted);
      const expPerkTimeMul = legacyExpeditionTimeMul(state);
      const expPerkRewardMul = legacyExpeditionRewardMul(state);
      const totalSec0 = Math.max(60, Math.ceil((baseSec / Math.pow(1.01, excessPct * 100)) * natureTimeMul * expPerkTimeMul));
      const quick = Boolean(ui.expeditionQuick);
      const totalSec = applyQuickExpeditionDuration(totalSec0, quick);
      const rewardMul0 = selMonsSorted.reduce((acc, m) => acc + typeMul(m, d.type), 0) / selMonsSorted.length;
      const rewardMul = Math.max(0.75, Math.min(1.5, rewardMul0));

      state.expedition.on = true;
      state.expedition.activeIds = selMonsSorted.map((m) => m.id);
      state.expedition.remainingSec = totalSec;
      state.expedition.totalSec = totalSec;
      state.expedition.quick = quick;
      state.expedition.milestonesFired = {};
      state.expedition.rewardExp = applyQuickExpeditionReward(Math.floor(lvlDef.exp * rewardMul * expPerkRewardMul), quick);
      state.expedition.rewardCoin = applyQuickExpeditionReward(Math.floor(lvlDef.coin * rewardMul * expPerkRewardMul), quick);
      state.expedition.rewardPotionTotal = applyQuickExpeditionReward(lvlDef.pot, quick);
      state.expedition.dungeonType = d.type;
      const impishN = selMonsSorted.filter((m) => monPassive(m)?.key === "expeditionTimeBonus").length;
      const quickLabel = quick ? "（急行）" : "";
      addLog(impishN > 0 ? `开始远征${quickLabel}（淘气性格加速 ×${impishN}）` : `开始远征${quickLabel}`, true);
      markFunctionsDirty();
      render();
      return;
    }

    const expCancelBtn = ev.target?.closest?.("button[data-exp-cancel]");
    if (expCancelBtn && elFunctionsTraining.contains(expCancelBtn)) {
      if (!state.expedition || typeof state.expedition !== "object") return;
      ui.expeditionTeamModalOpen = false;
      state.expedition.on = false;
      state.expedition.activeIds = [];
      state.expedition.remainingSec = 0;
      state.expedition.totalSec = 0;
      state.expedition.rewardExp = 0;
      state.expedition.rewardCoin = 0;
      state.expedition.rewardPotionTotal = 0;
      state.expedition.dungeonType = null;
      state.expedition.quick = false;
      state.expedition.milestonesFired = {};
      addLog("远征已取消", true);
      markFunctionsDirty();
      render();
    }
  });

  elFunctionsTraining.addEventListener("change", (ev) => {
    const mintMonSel = ev.target?.closest?.("select[data-mint-mon]");
    if (mintMonSel && elFunctionsTraining.contains(mintMonSel)) {
      const monId = Number(mintMonSel.value);
      if (Number.isFinite(monId) && monId > 0) {
        ui.mintWorkshopMonId = monId;
        const st = stateRef();
        const mon = (st?.mons?.list ?? []).find((m) => m && m.id === monId);
        if (mon) {
          const cur = normalizeMintTuning(mon.mintTuning);
          if (cur) {
            ui.mintWorkshopNeutral = cur.up === null && cur.down === null;
            if (!ui.mintWorkshopNeutral) {
              ui.mintWorkshopUp = cur.up;
              ui.mintWorkshopDown = cur.down;
            }
          } else {
            const rec = recommendMintTuningForMon(mon, getBeastDataByDex);
            ui.mintWorkshopNeutral = false;
            ui.mintWorkshopUp = rec.up;
            ui.mintWorkshopDown = rec.down;
          }
        }
      }
      ui.functionsFocus = false;
      markFunctionsDirty();
      render();
      return;
    }

    const amberTargetSel = ev.target?.closest?.("select[data-amber-target-mon]");
    if (amberTargetSel && elFunctionsTraining.contains(amberTargetSel)) {
      const monId = Number(amberTargetSel.value);
      const st = stateRef();
      if (st && Number.isFinite(monId) && monId > 0) {
        const lab = ensureAmberRevivalState(st);
        if (lab) lab.selectedMonId = Math.floor(monId);
      }
      ui.functionsFocus = false;
      markFunctionsDirty();
      render();
      return;
    }

    const bqTargetSel = ev.target?.closest?.("select[data-boutique-target-mon]");
    if (bqTargetSel && elFunctionsTraining.contains(bqTargetSel)) {
      const monId = Number(bqTargetSel.value);
      const st = stateRef();
      if (st && Number.isFinite(monId) && monId > 0) {
        const bq = ensureStarBoutiqueState(st);
        if (bq) bq.selectedMonId = Math.floor(monId);
      }
      ui.functionsFocus = false;
      markFunctionsDirty();
      render();
      return;
    }

    const funcLeagueChk = ev.target?.closest?.("input[data-func-league-check]");
    if (funcLeagueChk && elFunctionsTraining.contains(funcLeagueChk)) {
      const st = stateRef();
      const monId = Number(funcLeagueChk.getAttribute("data-func-league-check"));
      if (st && Number.isFinite(monId) && monId > 0) {
        const res = toggleChampionLeagueSquadMon(st, monId);
        if (!res.ok) funcLeagueChk.checked = false;
        if (!res.ok && res.reason === "mon_away") addLog(`这只伙伴正在${res.awayLabel || "外出"}，不能编入冠军联盟小队`);
        markMonListDirty?.(false);
        markFunctionsDirty();
        render();
      }
      return;
    }

    const campChk = ev.target?.closest?.("input[data-camp-modal-check]");
    if (campChk && elFunctionsTraining.contains(campChk)) {
      const st = stateRef();
      const monId = Number(campChk.getAttribute("data-camp-modal-check"));
      if (st && Number.isFinite(monId) && monId > 0) {
        const res = toggleStarCampCompanion(st, monId);
        if (!res.ok) campChk.checked = false;
        markMonListDirty?.(false);
        markFunctionsDirty();
        render();
      }
      return;
    }

    const treasureChk = ev.target?.closest?.("input[data-treasure-modal-check]");
    if (treasureChk && elFunctionsTraining.contains(treasureChk)) {
      const st = stateRef();
      const monId = Number(treasureChk.getAttribute("data-treasure-modal-check"));
      if (st && Number.isFinite(monId)) {
        const res = toggleTreasureVoyageCrewMon(st, monId);
        if (!res.ok) treasureChk.checked = false;
        markFunctionsDirty();
        render();
      }
      return;
    }

    const islandChk = ev.target?.closest?.("input[data-island-modal-check]");
    if (islandChk && elFunctionsTraining.contains(islandChk)) {
      const st = stateRef();
      const monId = Number(islandChk.getAttribute("data-island-modal-check"));
      if (st && Number.isFinite(monId)) {
        const res = toggleSkyIslandCrewMon(st, monId);
        if (!res.ok) islandChk.checked = false;
        markMonListDirty?.(false);
        markMonsDirty?.();
        markFunctionsDirty();
        render();
      }
      return;
    }

    const nightChk = ev.target?.closest?.("input[data-night-modal-check]");
    if (nightChk && elFunctionsTraining.contains(nightChk)) {
      const st = stateRef();
      const monId = Number(nightChk.getAttribute("data-night-modal-check"));
      if (st && Number.isFinite(monId)) {
        const res = toggleNightObservatoryMon(st, monId);
        if (!res.ok) nightChk.checked = false;
        markMonListDirty?.(false);
        markFunctionsDirty();
        render();
      }
      return;
    }

    const showChk = ev.target?.closest?.("input[data-show-modal-check]");
    if (showChk && elFunctionsTraining.contains(showChk)) {
      const st = stateRef();
      const monId = Number(showChk.getAttribute("data-show-modal-check"));
      if (st && Number.isFinite(monId)) {
        const res = toggleAcrobatPerformer(st, monId, {
          getMonTypes: (m) => getMonTypesForExpedition(m, getBeastDataByDex),
          getBeastDataByDex,
        });
        if (!res.ok) showChk.checked = false;
        markMonListDirty?.(false);
        markFunctionsDirty();
        render();
      }
      return;
    }

    const dockChk = ev.target?.closest?.("input[data-dock-modal-check]");
    if (dockChk && elFunctionsTraining.contains(dockChk)) {
      const st = stateRef();
      const routeId = dockChk.getAttribute("data-dock-modal-route");
      const monId = Number(dockChk.getAttribute("data-dock-modal-check"));
      if (st && routeId && Number.isFinite(monId)) {
        const res = toggleWishDockStagedMon(st, routeId, monId);
        if (!res.ok) dockChk.checked = false;
        markFunctionsDirty();
        render();
      }
      return;
    }

    const ecoChk = ev.target?.closest?.("input[data-eco-modal-check]");
    if (ecoChk && elFunctionsTraining.contains(ecoChk)) {
      const st = stateRef();
      const zoneId = ecoChk.getAttribute("data-eco-modal-zone");
      const monId = Number(ecoChk.getAttribute("data-eco-modal-check"));
      if (st && zoneId && Number.isFinite(monId)) {
        const res = toggleEcoSandboxStagedMon(st, zoneId, monId);
        if (!res.ok) ecoChk.checked = false;
        markMonListDirty?.(false);
        markFunctionsDirty();
        render();
      }
      return;
    }

    const quickChk = ev.target?.closest?.("input[data-exp-quick]");
    if (quickChk && elFunctionsTraining.contains(quickChk)) {
      ui.expeditionQuick = Boolean(quickChk.checked);
      markFunctionsDirty();
      render();
      return;
    }
    const state = stateRef();
    if (!state || typeof state !== "object") return;

    const chk = ev.target?.closest?.("input[data-exp-team-check]");
    if (!chk || !elFunctionsTraining.contains(chk)) return;
    if (!state.expedition || typeof state.expedition !== "object") return;

    const id = Number(chk.getAttribute("data-exp-team-check"));
    if (!Number.isFinite(id)) return;

    const expOn = Boolean(state.expedition.on) && (state.expedition.remainingSec ?? 0) > 0;
    if (expOn) {
      const sel0 = Array.isArray(state.expedition.selectedIds) ? state.expedition.selectedIds : [];
      chk.checked = sel0.includes(id);
      return;
    }

    const list = state.mons?.list ?? [];
    const m = list.find((x) => x && x.id === id);
    if (!m) return;

    const cd0 =
      typeof m.skillCdRemainingSec === "number" && Number.isFinite(m.skillCdRemainingSec)
        ? Math.max(0, m.skillCdRemainingSec)
        : 0;
    if (cd0 > 0) {
      chk.checked = false;
      return;
    }
    // ML-14 统一忙碌排除：外出 / 驻场中的伙伴不能被勾选出征
    if (chk.checked && getAwayMonIds(state).has(id)) {
      chk.checked = false;
      return;
    }

    const aliveSet = new Set(list.map((x) => (x && typeof x.id === "number" ? x.id : null)).filter((x) => typeof x === "number"));
    const sel0 = Array.isArray(state.expedition.selectedIds) ? state.expedition.selectedIds : [];
    let sel = sel0.filter((x) => aliveSet.has(x)).slice(0, 20);

    const checked = Boolean(chk.checked);
    if (checked) {
      if (!sel.includes(id)) {
        if (sel.length >= 20) {
          chk.checked = false;
          return;
        }
        sel = sel.concat([id]);
      }
    } else {
      sel = sel.filter((x) => x !== id);
    }

    state.expedition.selectedIds = sel;
    markFunctionsDirty();
    render();
  });
}
