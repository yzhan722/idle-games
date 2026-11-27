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
  generateAsteroidDashLevel,
  generatePumpkinNightLevel,
  generatePyramidRunLevel,
  generateJungleSwingLevel,
  generatePirateBoardingLevel,
  generatePayloadEscortLevel,
  generateSubmarineRescueLevel,
} from './levels/LevelData';
import {
  ALL_SKILL_NODES,
  BOBO_TECH_BRANCHES,
  BOBO_TECH_BRANCH_ORDER,
  BOBO_TECH_MAX_LEVEL,
  BoboTechBranchId,
  CANNON_CORE_MODS,
  CANNON_CORE_MOD_MAX_LEVEL,
  CANNON_CORE_MOD_ORDER,
  CannonCoreModId,
  GACHA_COLLECTION_GOLD_CAP,
  GACHA_COLLECTION_GOLD_PER_SKIN,
  GACHA_PITY_SR,
  GACHA_PITY_SSR,
  GACHA_RARITIES,
  GACHA_RARITY_ORDER,
  GACHA_SKINS,
  GACHA_SKIN_ORDER,
  DECOR_COMFORT_GOLD_CAP,
  DECOR_COMFORT_GOLD_PER_POINT,
  DECOR_CURRENCY_LABEL,
  DECOR_PROPS,
  DECOR_PROP_ORDER,
  DECOR_SLOT_COUNT,
  DECOR_SLOT_NAMES,
  DECOR_THEMES,
  DECOR_THEME_ORDER,
  DecorCurrency,
  DecorPropId,
  DecorThemeId,
  GachaRollResult,
  GachaSkinId,
  GameState,
  HALL_TROPHIES,
  HALL_TROPHY_ORDER,
  HALL_TROPHY_TIER_NAMES,
  HallTrophyId,
  META_UPGRADES,
  MetaUpgradeId,
  PET_COMPANIONS,
  PET_COMPANION_MAX_LEVEL,
  PET_COMPANION_ORDER,
  PetCompanionId,
  RELIC_BANNERS,
  RELIC_BANNER_MAX_LEVEL,
  RELIC_BANNER_ORDER,
  RENAME_GOLD_COST,
  RelicBannerId,
  RewardOption,
  SKILL_TREE_BRANCHES,
  SKINS_CATALOG,
  SQUAD_FINISH_CATALOG,
  SkillNodeId,
  SkinId,
  SquadFinishId,
  TROPHY_HALL_SLOT_COUNT,
  TACTIC_CARDS,
  TACTIC_CAMPAIGN_EFFECT_MULT,
  TACTIC_CARD_ORDER,
  TACTIC_CATEGORY_LABEL,
  TACTIC_CROWD_CAP,
  TACTIC_CURRENCY_LABEL,
  TACTIC_DECK_SIZE,
  TACTIC_RUSH_CAP,
  TACTIC_RUSH_MAX_SEC,
  TACTIC_SHIELD_CAP,
  TACTIC_TRIGGER_LABEL,
  TacticCardId,
  TacticCurrency,
  TacticTrigger,
  scaleTacticValue,
  TACTICAL_SUBWEAPON_MAX_LEVEL,
  TACTICAL_SUBWEAPON_ORDER,
  TACTICAL_SUBWEAPONS,
  TacticalSubWeaponId,
} from './game/State';
import {
  ART_LOADING,
  BOBO_TECH_ART,
  CANNON_MOD_ART,
  CANNON_MOD_INLINE_ART,
  PET_COMPANION_ART,
  PET_COMPANION_INLINE_ART,
  RACE_MASCOT_THUMB,
  RELIC_BANNER_ART,
  RELIC_BANNER_INLINE_ART,
  SKIN_CARD_ART,
  SKILL_NODE_SVGS,
  SQUAD_FINISH_ART,
  TACTICAL_SUBWEAPON_ART,
  TACTICAL_SUBWEAPON_HUD_ART,
  TACTICAL_SUBWEAPON_INLINE_ART,
  UI_ART,
  raceThumbUrl,
  replaceEmojiWithArt,
} from './game/SkillIcons';
import { World3DFull } from './game/World3DFull';
import { PROMPT_UNAVAILABLE_TEXT, REPORT_REASONS, askText, escapeHtml, parseReportChoice, reportResultText } from './game/Leaderboard';
import { bindLegalLinks } from './legal/LegalModal';
import { sound } from './audio/SoundManager';
import { artUrl, artUrlsIn, installLazyArt, warmArt } from './ui/LazyArt';

installLazyArt();

const state = new GameState();

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const labelsContainer = document.getElementById('world-labels') as HTMLElement;
const hudTop = document.querySelector('.hud-top') as HTMLElement;
const hudBottom = document.querySelector('.hud-bottom') as HTMLElement;

const stageBadge = document.getElementById('stage-badge') as HTMLElement;
const blueCountEl = document.getElementById('blue-count') as HTMLElement;
const redCountEl = document.getElementById('red-count') as HTMLElement;
const goldAmountEl = document.getElementById('gold-amount') as HTMLElement;
const bossNameEl = document.getElementById('boss-name') as HTMLElement;
const bossHpTextEl = document.getElementById('boss-hp-text') as HTMLElement;
const bossBarFillEl = document.getElementById('boss-bar-fill') as HTMLElement;
const playerHpTextEl = document.getElementById('player-hp-text') as HTMLElement;
const playerBarFillEl = document.getElementById('player-bar-fill') as HTMLElement;
const activeBuffsBar = document.getElementById('active-buffs-bar') as HTMLElement;
const colossusRaidHudEl = document.getElementById('colossus-raid-hud') as HTMLElement | null;
const colossusHudLeftEl = document.getElementById('colossus-hud-left') as HTMLElement | null;
const colossusHudLeftTextEl = document.getElementById('colossus-hud-left-text') as HTMLElement | null;
const colossusHudCoreEl = document.getElementById('colossus-hud-core') as HTMLElement | null;
const colossusHudCoreTextEl = document.getElementById('colossus-hud-core-text') as HTMLElement | null;
const colossusHudRightEl = document.getElementById('colossus-hud-right') as HTMLElement | null;
const colossusHudRightTextEl = document.getElementById('colossus-hud-right-text') as HTMLElement | null;
const airshipEscortHudEl = document.getElementById('airship-escort-hud') as HTMLElement | null;
const airshipHudHullEl = document.getElementById('airship-hud-hull') as HTMLElement | null;
const airshipHudHullTextEl = document.getElementById('airship-hud-hull-text') as HTMLElement | null;
const airshipHudDropEl = document.getElementById('airship-hud-drop') as HTMLElement | null;
const airshipHudDropTextEl = document.getElementById('airship-hud-drop-text') as HTMLElement | null;
const airshipHudAaEl = document.getElementById('airship-hud-aa') as HTMLElement | null;
const airshipHudAaTextEl = document.getElementById('airship-hud-aa-text') as HTMLElement | null;
const candyTrainHudEl = document.getElementById('candy-train-hud') as HTMLElement | null;
const trainHudCarsEl = document.getElementById('train-hud-cars') as HTMLElement | null;
const trainHudCarsTextEl = document.getElementById('train-hud-cars-text') as HTMLElement | null;
const trainHudLootEl = document.getElementById('train-hud-loot') as HTMLElement | null;
const trainHudLootTextEl = document.getElementById('train-hud-loot-text') as HTMLElement | null;
const trainHudEscapeEl = document.getElementById('train-hud-escape') as HTMLElement | null;
const trainHudEscapeTextEl = document.getElementById('train-hud-escape-text') as HTMLElement | null;
const underwaterOverlayEl = document.getElementById('underwater-overlay') as HTMLElement | null;
const submarineRescueHudEl = document.getElementById('submarine-rescue-hud') as HTMLElement | null;
const subHudHullEl = document.getElementById('sub-hud-hull') as HTMLElement | null;
const subHudHullTextEl = document.getElementById('sub-hud-hull-text') as HTMLElement | null;
const subHudRescueEl = document.getElementById('sub-hud-rescue') as HTMLElement | null;
const subHudRescueTextEl = document.getElementById('sub-hud-rescue-text') as HTMLElement | null;
const subHudThreatEl = document.getElementById('sub-hud-threat') as HTMLElement | null;
const subHudThreatTextEl = document.getElementById('sub-hud-threat-text') as HTMLElement | null;
const glacierSledHudEl = document.getElementById('glacier-sled-hud') as HTMLElement | null;
const sledHudTimeEl = document.getElementById('sled-hud-time') as HTMLElement | null;
const sledHudTimeTextEl = document.getElementById('sled-hud-time-text') as HTMLElement | null;
const sledHudRidersEl = document.getElementById('sled-hud-riders') as HTMLElement | null;
const sledHudRidersTextEl = document.getElementById('sled-hud-riders-text') as HTMLElement | null;
const sledHudCourseEl = document.getElementById('sled-hud-course') as HTMLElement | null;
const sledHudCourseTextEl = document.getElementById('sled-hud-course-text') as HTMLElement | null;
const cannonModHudBadgeEl = document.getElementById('cannon-mod-hud-badge') as HTMLElement | null;
const cannonModHudIconEl = document.getElementById('cannon-mod-hud-icon') as HTMLImageElement | null;
const cannonModHudTextEl = document.getElementById('cannon-mod-hud-text') as HTMLElement | null;
let lastCannonModHudKey = '';

function syncCannonModHudBadge(): void {
  const activeModSpec = state.getCannonModSpec(state.activeCannonMod);
  const activeModLvl = Math.max(1, state.getCannonModLevel(state.activeCannonMod));
  const key = `${activeModSpec.id}_${activeModLvl}`;
  if (key === lastCannonModHudKey) return;
  lastCannonModHudKey = key;
  const iconMap: Record<CannonCoreModId, string> = {
    overdrive_breech: '/assets/icons/mod_overdrive_breech.png?v=36',
    prism_splitter: '/assets/icons/mod_prism_splitter.png?v=36',
    heavy_mortar: '/assets/icons/mod_heavy_mortar.png?v=36',
  };
  if (cannonModHudIconEl) {
    cannonModHudIconEl.src = iconMap[activeModSpec.id];
  }
  if (cannonModHudTextEl) {
    cannonModHudTextEl.textContent = `母炮模组：${activeModSpec.name} Lv.${activeModLvl}`;
  }
  if (cannonModHudBadgeEl) {
    cannonModHudBadgeEl.title = `蒸汽母炮核心模组：${activeModSpec.statText(activeModLvl)}`;
  }
}

const centerBanner = document.getElementById('center-banner') as HTMLElement;
const bannerTitle = document.getElementById('banner-title') as HTMLElement;
const bannerSub = document.getElementById('banner-sub') as HTMLElement;

const btnTopMenu = document.getElementById('btn-top-menu') as HTMLButtonElement | null;
const topToolsDrawer = document.getElementById('top-tools-drawer') as HTMLElement | null;
const btnResumeDrawer = document.getElementById('btn-resume-drawer') as HTMLButtonElement | null;
const btnHome = document.getElementById('btn-home') as HTMLButtonElement;
const btnRerollMap = document.getElementById('btn-reroll-map') as HTMLButtonElement;
const btnCamera = document.getElementById('btn-camera') as HTMLButtonElement;
const btnSound = document.getElementById('btn-sound') as HTMLButtonElement;
const btnRestart = document.getElementById('btn-restart') as HTMLButtonElement;

// Title Splash Screen & Main Menu elements
const titleScreenEl = document.getElementById('title-screen') as HTMLElement | null;
const btnTitleSound = document.getElementById('btn-title-sound') as HTMLButtonElement | null;
const titleWelcomeTextEl = document.getElementById('title-welcome-text') as HTMLElement | null;
const titleLoaderBoxEl = document.getElementById('title-loader-box') as HTMLElement | null;
const titleLoaderFillEl = document.getElementById('title-loader-fill') as HTMLElement | null;
const titleLoaderLabelEl = document.getElementById('title-loader-label') as HTMLElement | null;
const btnEnterWorkshop = document.getElementById('btn-enter-workshop') as HTMLButtonElement | null;
const btnBackToTitle = document.getElementById('btn-back-to-title') as HTMLElement | null;
let isTitleScreenOpen = true;
let isTitleTransitioning = false;

const mainMenu = document.getElementById('main-menu') as HTMLElement;
const menuGoldAmount = document.getElementById('menu-gold-amount') as HTMLElement;
const menuStarAmount = document.getElementById('menu-star-amount') as HTMLElement | null;
const btnHeaderStars = document.getElementById('btn-header-stars') as HTMLButtonElement | null;
const btnHeaderGold = document.getElementById('btn-header-gold') as HTMLButtonElement | null;
const btnCommanderProfile = document.getElementById('btn-commander-profile') as HTMLButtonElement | null;
const commanderRankTagEl = document.getElementById('commander-rank-tag') as HTMLElement | null;
const commanderNameTextEl = document.getElementById('commander-name-text') as HTMLElement | null;
const commanderBestStageEl = document.getElementById('commander-best-stage') as HTMLElement | null;
const brandCrestImgEl = document.getElementById('brand-crest-img') as HTMLImageElement | null;
const badgeTabSkillsEl = document.getElementById('badge-tab-skills') as HTMLElement | null;
const badgeTabMetaEl = document.getElementById('badge-tab-meta') as HTMLElement | null;
const badgeTabSkinsEl = document.getElementById('badge-tab-skins') as HTMLElement | null;
const homeHeroStageEl = document.getElementById('home-hero-stage') as HTMLElement | null;
const btnHomeMecha = document.getElementById('btn-home-mecha') as HTMLButtonElement | null;
const homeMechaIconEl = document.getElementById('home-mecha-icon') as HTMLElement | null;
const homeMechaLabelEl = document.getElementById('home-mecha-label') as HTMLElement | null;
const btnHomeWeapon = document.getElementById('btn-home-weapon') as HTMLButtonElement | null;
const homeWeaponIconEl = document.getElementById('home-weapon-icon') as HTMLElement | null;
const homeWeaponLabelEl = document.getElementById('home-weapon-label') as HTMLElement | null;
const btnHomePrevRace = document.getElementById('btn-home-prev-race') as HTMLButtonElement | null;
const btnHomeNextRace = document.getElementById('btn-home-next-race') as HTMLButtonElement | null;
const homeMascotArtEl = document.getElementById('home-mascot-art') as HTMLElement | null;
const homeRaceTitleEl = document.getElementById('home-race-title') as HTMLElement | null;
const homeRacePtsTagEl = document.getElementById('home-race-pts-tag') as HTMLElement | null;
const homeRacePerkEl = document.getElementById('home-race-perk') as HTMLElement | null;
const launchBtnSubEl = document.getElementById('launch-btn-sub') as HTMLElement | null;
const menuEquippedSkin = document.getElementById('menu-equipped-skin') as HTMLElement;
const menuStatPower = document.getElementById('menu-stat-power') as HTMLElement;
const menuStatFireRate = document.getElementById('menu-stat-firerate') as HTMLElement;
const menuStatBastion = document.getElementById('menu-stat-bastion') as HTMLElement;
const menuStatBounty = document.getElementById('menu-stat-bounty') as HTMLElement;
const metaUpgradesGrid = document.getElementById('meta-upgrades-grid') as HTMLElement;
const mechaHangarGrid = document.getElementById('mecha-hangar-grid') as HTMLElement | null;
const mechaHangarMkPill = document.getElementById('mecha-hangar-mk-pill') as HTMLElement | null;
const mechaHangarStats = document.getElementById('mecha-hangar-stats') as HTMLElement | null;
const tacticalSubweaponGrid = document.getElementById('tactical-subweapon-grid') as HTMLElement | null;
const subweaponEquippedPill = document.getElementById('subweapon-equipped-pill') as HTMLElement | null;
const subweaponWorkbenchStats = document.getElementById('subweapon-workbench-stats') as HTMLElement | null;
const boboTechTreeGrid = document.getElementById('bobo-tech-tree-grid') as HTMLElement | null;
const boboTechActivePill = document.getElementById('bobo-tech-active-pill') as HTMLElement | null;
const boboTechResources = document.getElementById('bobo-tech-resources') as HTMLElement | null;
const cannonModGrid = document.getElementById('cannon-mod-grid') as HTMLElement | null;
const cannonModActivePill = document.getElementById('cannon-mod-active-pill') as HTMLElement | null;
const cannonModResources = document.getElementById('cannon-mod-resources') as HTMLElement | null;
const cannonModMilestoneBanner = document.getElementById('cannon-mod-milestone-banner') as HTMLElement | null;
const petCompanionGrid = document.getElementById('pet-companion-grid') as HTMLElement | null;
const petCompanionActivePill = document.getElementById('pet-companion-active-pill') as HTMLElement | null;
const petCompanionResources = document.getElementById('pet-companion-resources') as HTMLElement | null;
const petCompanionMilestoneBanner = document.getElementById('pet-companion-milestone-banner') as HTMLElement | null;
const relicBannerGrid = document.getElementById('relic-banner-grid') as HTMLElement | null;
const relicBannerActivePill = document.getElementById('relic-banner-active-pill') as HTMLElement | null;
const relicBannerResources = document.getElementById('relic-banner-resources') as HTMLElement | null;
const relicBannerMilestoneBanner = document.getElementById('relic-banner-milestone-banner') as HTMLElement | null;
const skinsShopGrid = document.getElementById('skins-shop-grid') as HTMLElement;
const squadFinishGrid = document.getElementById('squad-finish-grid') as HTMLElement | null;
const squadLiveryActivePill = document.getElementById('squad-livery-active-pill') as HTMLElement | null;
const squadFinishResources = document.getElementById('squad-finish-resources') as HTMLElement | null;
const btnStartBattle = document.getElementById('btn-start-battle') as HTMLButtonElement;
const btnStartAirshipEscort = document.getElementById('btn-start-airship-escort') as HTMLButtonElement | null;
const airshipEscortMedalTextEl = document.getElementById('airship-escort-medal-text') as HTMLElement | null;
const airshipEscortSubEl = document.getElementById('airship-escort-sub') as HTMLElement | null;
const airshipEscortBadgeEl = document.getElementById('airship-escort-badge') as HTMLElement | null;
const btnStartSubmarineRescue = document.getElementById('btn-start-submarine-rescue') as HTMLButtonElement | null;
const submarinePearlTextEl = document.getElementById('submarine-pearl-text') as HTMLElement | null;
const submarineRescueSubEl = document.getElementById('submarine-rescue-sub') as HTMLElement | null;
const submarinePearlBadgeEl = document.getElementById('submarine-pearl-badge') as HTMLElement | null;
const btnStartGlacierSled = document.getElementById('btn-start-glacier-sled') as HTMLButtonElement | null;
const glacierIceMedalTextEl = document.getElementById('glacier-ice-medal-text') as HTMLElement | null;
const glacierSledSubEl = document.getElementById('glacier-sled-sub') as HTMLElement | null;
const glacierSledBadgeEl = document.getElementById('glacier-sled-badge') as HTMLElement | null;
const trophyHallSlotsEl = document.getElementById('trophy-hall-slots') as HTMLElement | null;
const trophyHallGrid = document.getElementById('trophy-hall-grid') as HTMLElement | null;
const trophyHallActivePill = document.getElementById('trophy-hall-active-pill') as HTMLElement | null;
const trophyHallResources = document.getElementById('trophy-hall-resources') as HTMLElement | null;
const trophyHallMilestoneBanner = document.getElementById('trophy-hall-milestone-banner') as HTMLElement | null;
const btnTrophyAutoArrange = document.getElementById('btn-trophy-auto-arrange') as HTMLButtonElement | null;
const lobbyTrophyPedestalBtn = document.getElementById('lobby-trophy-pedestal') as HTMLButtonElement | null;
const lobbyTrophyCanvas = document.getElementById('trophy-pedestal-canvas') as HTMLCanvasElement | null;
const lobbyTrophyCaptionTextEl = document.getElementById('lobby-trophy-caption-text') as HTMLElement | null;
// MC-13: Volcano Lava Jump Breakout (lobby card + HUD) & Bobo Squad Skin Gacha Machine (workshop)
const btnStartLavaJump = document.getElementById('btn-start-lava-jump') as HTMLButtonElement | null;
const lavaCoreTextEl = document.getElementById('lava-core-text') as HTMLElement | null;
const lavaJumpSubEl = document.getElementById('lava-jump-sub') as HTMLElement | null;
const lavaJumpBadgeEl = document.getElementById('lava-jump-badge') as HTMLElement | null;
const lavaJumpHudEl = document.getElementById('lava-jump-hud') as HTMLElement | null;
const lavaHudTimeEl = document.getElementById('lava-hud-time') as HTMLElement | null;
const lavaHudTimeTextEl = document.getElementById('lava-hud-time-text') as HTMLElement | null;
const lavaHudBobosEl = document.getElementById('lava-hud-bobos') as HTMLElement | null;
const lavaHudBobosTextEl = document.getElementById('lava-hud-bobos-text') as HTMLElement | null;
const lavaHudCourseEl = document.getElementById('lava-hud-course') as HTMLElement | null;
const lavaHudCourseTextEl = document.getElementById('lava-hud-course-text') as HTMLElement | null;
const gachaActivePill = document.getElementById('gacha-active-pill') as HTMLElement | null;
const gachaResourcesEl = document.getElementById('gacha-resources') as HTMLElement | null;
const gachaOddsBanner = document.getElementById('gacha-odds-banner') as HTMLElement | null;
const gachaPityFillEl = document.getElementById('gacha-pity-fill') as HTMLElement | null;
const gachaPityTextEl = document.getElementById('gacha-pity-text') as HTMLElement | null;
const gachaResultTray = document.getElementById('gacha-result-tray') as HTMLElement | null;
const gachaCollectionGrid = document.getElementById('gacha-collection-grid') as HTMLElement | null;
const gachaMachineArtEl = document.getElementById('gacha-machine-art') as HTMLElement | null;
const btnGachaUnequip = document.getElementById('btn-gacha-unequip') as HTMLButtonElement | null;
const gachaRollButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-gacha-count]'));
let lastGachaResults: GachaRollResult[] = [];
let gachaRevealSerial = 0;
// MC-14: Asteroid Belt Shield Breakout (lobby card + HUD) & Themed Lobby Decoration Hall (workshop)
const btnStartAsteroidDash = document.getElementById('btn-start-asteroid-dash') as HTMLButtonElement | null;
const stardustBadgeTextEl = document.getElementById('stardust-badge-text') as HTMLElement | null;
const asteroidDashSubEl = document.getElementById('asteroid-dash-sub') as HTMLElement | null;
const asteroidDashBadgeEl = document.getElementById('asteroid-dash-badge') as HTMLElement | null;
const asteroidDashHudEl = document.getElementById('asteroid-dash-hud') as HTMLElement | null;
const astHudTimeEl = document.getElementById('ast-hud-time') as HTMLElement | null;
const astHudTimeTextEl = document.getElementById('ast-hud-time-text') as HTMLElement | null;
const astHudBobosEl = document.getElementById('ast-hud-bobos') as HTMLElement | null;
const astHudBobosTextEl = document.getElementById('ast-hud-bobos-text') as HTMLElement | null;
const astHudCourseEl = document.getElementById('ast-hud-course') as HTMLElement | null;
const astHudCourseTextEl = document.getElementById('ast-hud-course-text') as HTMLElement | null;
const decorActivePill = document.getElementById('decor-active-pill') as HTMLElement | null;
const decorResourcesEl = document.getElementById('decor-resources') as HTMLElement | null;
const decorBonusBanner = document.getElementById('decor-bonus-banner') as HTMLElement | null;
const decorThemeGrid = document.getElementById('decor-theme-grid') as HTMLElement | null;
const decorSlotRow = document.getElementById('decor-slot-row') as HTMLElement | null;
const decorPropGrid = document.getElementById('decor-prop-grid') as HTMLElement | null;
const btnDecorViewLobby = document.getElementById('btn-decor-view-lobby') as HTMLButtonElement | null;
// MC-15: Haunted Castle Pumpkin Night (lobby card + HUD) & Bobo Squad Tactic Deck (workshop + lobby strip + battle HUD)
// MC-16: Desert Pyramid Trap Run (lobby card + HUD) & tactic deck balance row (campaign coefficient / switch)
// MC-17: Jungle Temple Vine Swing (lobby card + HUD)
const btnStartJungleSwing = document.getElementById('btn-start-jungle-swing') as HTMLButtonElement | null;
const emeraldIdolTextEl = document.getElementById('emerald-idol-text') as HTMLElement | null;
const jungleSwingSubEl = document.getElementById('jungle-swing-sub') as HTMLElement | null;
const jungleSwingBadgeEl = document.getElementById('jungle-swing-badge') as HTMLElement | null;
const jungleSwingHudEl = document.getElementById('jungle-swing-hud') as HTMLElement | null;
const jgHudTimeEl = document.getElementById('jg-hud-time') as HTMLElement | null;
const jgHudTimeTextEl = document.getElementById('jg-hud-time-text') as HTMLElement | null;
const jgHudSquadEl = document.getElementById('jg-hud-squad') as HTMLElement | null;
const jgHudSquadTextEl = document.getElementById('jg-hud-squad-text') as HTMLElement | null;
const jgHudCourseEl = document.getElementById('jg-hud-course') as HTMLElement | null;
const jgHudCourseTextEl = document.getElementById('jg-hud-course-text') as HTMLElement | null;
// MC-18: Pirate Plank Breakout (lobby card + HUD; the run itself shares the jungle squad-run engine)
const btnStartPirateBoarding = document.getElementById('btn-start-pirate-boarding') as HTMLButtonElement | null;
const goldSkullTextEl = document.getElementById('gold-skull-text') as HTMLElement | null;
const pirateBoardingSubEl = document.getElementById('pirate-boarding-sub') as HTMLElement | null;
const pirateBoardingBadgeEl = document.getElementById('pirate-boarding-badge') as HTMLElement | null;
const pirateBoardingHudEl = document.getElementById('pirate-boarding-hud') as HTMLElement | null;
const prHudTimeEl = document.getElementById('pr-hud-time') as HTMLElement | null;
const prHudTimeTextEl = document.getElementById('pr-hud-time-text') as HTMLElement | null;
const prHudSquadEl = document.getElementById('pr-hud-squad') as HTMLElement | null;
const prHudSquadTextEl = document.getElementById('pr-hud-squad-text') as HTMLElement | null;
const prHudCourseEl = document.getElementById('pr-hud-course') as HTMLElement | null;
const prHudCourseTextEl = document.getElementById('pr-hud-course-text') as HTMLElement | null;
const btnStartPyramidRun = document.getElementById('btn-start-pyramid-run') as HTMLButtonElement | null;
const scarabBadgeTextEl = document.getElementById('scarab-badge-text') as HTMLElement | null;
const pyramidRunSubEl = document.getElementById('pyramid-run-sub') as HTMLElement | null;
const pyramidRunBadgeEl = document.getElementById('pyramid-run-badge') as HTMLElement | null;
const pyramidRunHudEl = document.getElementById('pyramid-run-hud') as HTMLElement | null;
const pyHudTimeEl = document.getElementById('py-hud-time') as HTMLElement | null;
const pyHudTimeTextEl = document.getElementById('py-hud-time-text') as HTMLElement | null;
const pyHudSandEl = document.getElementById('py-hud-sand') as HTMLElement | null;
const pyHudSandTextEl = document.getElementById('py-hud-sand-text') as HTMLElement | null;
const pyHudCourseEl = document.getElementById('py-hud-course') as HTMLElement | null;
const pyHudCourseTextEl = document.getElementById('py-hud-course-text') as HTMLElement | null;
const tacticBalanceTitleEl = document.getElementById('tactic-balance-title') as HTMLElement | null;
const tacticBalanceTextEl = document.getElementById('tactic-balance-text') as HTMLElement | null;
const btnTacticCampaignToggle = document.getElementById('btn-tactic-campaign-toggle') as HTMLButtonElement | null;
const btnStartPumpkinNight = document.getElementById('btn-start-pumpkin-night') as HTMLButtonElement | null;
const pumpkinBadgeTextEl = document.getElementById('pumpkin-badge-text') as HTMLElement | null;
const pumpkinNightSubEl = document.getElementById('pumpkin-night-sub') as HTMLElement | null;
const pumpkinNightBadgeEl = document.getElementById('pumpkin-night-badge') as HTMLElement | null;
const pumpkinNightHudEl = document.getElementById('pumpkin-night-hud') as HTMLElement | null;
const pkHudTimeEl = document.getElementById('pk-hud-time') as HTMLElement | null;
const pkHudTimeTextEl = document.getElementById('pk-hud-time-text') as HTMLElement | null;
const pkHudLightEl = document.getElementById('pk-hud-light') as HTMLElement | null;
const pkHudLightTextEl = document.getElementById('pk-hud-light-text') as HTMLElement | null;
const pkHudCourseEl = document.getElementById('pk-hud-course') as HTMLElement | null;
const pkHudCourseTextEl = document.getElementById('pk-hud-course-text') as HTMLElement | null;
const tacticDeckHudEl = document.getElementById('tactic-deck-hud') as HTMLElement | null;
const lobbyTacticSlotsEl = document.getElementById('lobby-tactic-slots') as HTMLElement | null;
const lobbyTacticSubEl = document.getElementById('lobby-tactic-sub') as HTMLElement | null;
const btnLobbyTacticEdit = document.getElementById('btn-lobby-tactic-edit') as HTMLButtonElement | null;
const tacticActivePill = document.getElementById('tactic-active-pill') as HTMLElement | null;
const tacticResourcesEl = document.getElementById('tactic-resources') as HTMLElement | null;
const tacticRuleBanner = document.getElementById('tactic-rule-banner') as HTMLElement | null;
const tacticDeckSlotsEl = document.getElementById('tactic-deck-slots') as HTMLElement | null;
const tacticCardGrid = document.getElementById('tactic-card-grid') as HTMLElement | null;
const btnStartCandyTrainRaid = document.getElementById('btn-start-candy-train-raid') as HTMLButtonElement | null;
const candyTrainMedalTextEl = document.getElementById('candy-train-medal-text') as HTMLElement | null;
const candyTrainSubEl = document.getElementById('candy-train-sub') as HTMLElement | null;
const candyTrainBadgeEl = document.getElementById('candy-train-badge') as HTMLElement | null;
const btnStartColossusRaid = document.getElementById('btn-start-colossus-raid') as HTMLButtonElement | null;
const colossusRaidTextEl = document.getElementById('colossus-raid-text') as HTMLElement | null;
const colossusRaidSubEl = document.getElementById('colossus-raid-sub') as HTMLElement | null;
const btnStartTournament = document.getElementById('btn-start-tournament') as HTMLButtonElement | null;
const tournamentProgressTextEl = document.getElementById('tournament-progress-text') as HTMLElement | null;
const tournamentStageSubEl = document.getElementById('tournament-stage-sub') as HTMLElement | null;
const lobbyChestTitleEl = document.getElementById('lobby-chest-title') as HTMLElement | null;
const lobbyChestDescEl = document.getElementById('lobby-chest-desc') as HTMLElement | null;
const btnLobbyClaimChest = document.getElementById('btn-lobby-claim-chest') as HTMLButtonElement | null;
const btnStartEscort = document.getElementById('btn-start-escort') as HTMLButtonElement | null;
const escortBestTextEl = document.getElementById('escort-best-text') as HTMLElement | null;
const escortBestBadgeEl = document.getElementById('escort-best-badge') as HTMLElement | null;
const btnStartEndless = document.getElementById('btn-start-endless') as HTMLButtonElement | null;
const endlessBestTextEl = document.getElementById('endless-best-text') as HTMLElement | null;
const endlessBestBadgeEl = document.getElementById('endless-best-badge') as HTMLElement | null;
const btnModalHome = document.getElementById('btn-modal-home') as HTMLButtonElement;
let pendingBonusHeistStage = 0;
let pendingNextCampaignIdx = 0;
const leaderboardListEl = document.getElementById('leaderboard-list') as HTMLElement | null;
const leaderboardSelfStatusEl = document.getElementById('leaderboard-self-status') as HTMLElement | null;
const btnLbPeak = document.getElementById('btn-lb-peak') as HTMLButtonElement | null;
const btnLbActive = document.getElementById('btn-lb-active') as HTMLButtonElement | null;
const btnEditName = document.getElementById('btn-edit-name') as HTMLButtonElement | null;
const btnShareGame = document.getElementById('btn-share-game') as HTMLButtonElement | null;
let leaderboardMode: 'peak' | 'active' = 'peak';
const menuActiveKeystonePill = document.getElementById('menu-active-keystone-pill') as HTMLButtonElement | null;
const skillAvailablePointsEl = document.getElementById('skill-available-points') as HTMLElement | null;
const skillActiveKeystoneEl = document.getElementById('skill-active-keystone') as HTMLElement | null;
const btnBuyTalent = document.getElementById('btn-buy-talent') as HTMLButtonElement | null;
const btnResetSkills = document.getElementById('btn-reset-skills') as HTMLButtonElement | null;
const btnToggleTreeZoom = document.getElementById('btn-toggle-tree-zoom') as HTMLButtonElement | null;
const mainMenuCardEl = document.querySelector('.main-menu-card') as HTMLElement | null;
const skillTreeViewportEl = document.getElementById('skill-tree-viewport') as HTMLElement | null;
const skillTreeCanvasEl = document.getElementById('skill-tree-canvas') as HTMLElement | null;
const skillInspectorBarEl = document.getElementById('skill-inspector-bar') as HTMLElement | null;

const animatedNumberState = new WeakMap<HTMLElement, { current: number; rafId: number }>();

function animateNumberTo(el: HTMLElement | null, target: number): void {
  if (!el) return;
  const cleanTarget = Math.floor(target);
  const existing = animatedNumberState.get(el);
  const startVal = existing ? existing.current : cleanTarget;
  if (existing && existing.rafId) {
    cancelAnimationFrame(existing.rafId);
  }
  if (startVal === cleanTarget) {
    el.textContent = cleanTarget.toLocaleString();
    animatedNumberState.set(el, { current: cleanTarget, rafId: 0 });
    return;
  }
  const startTime = performance.now();
  const duration = 320;
  el.classList.remove('num-roll-pulse');
  void el.offsetWidth;
  el.classList.add('num-roll-pulse');

  const step = (now: number) => {
    const t = Math.min(1, (now - startTime) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    const val = Math.round(startVal + (cleanTarget - startVal) * eased);
    el.textContent = val.toLocaleString();
    if (t < 1) {
      const rafId = requestAnimationFrame(step);
      animatedNumberState.set(el, { current: val, rafId });
    } else {
      el.textContent = cleanTarget.toLocaleString();
      animatedNumberState.set(el, { current: cleanTarget, rafId: 0 });
    }
  };
  const rafId = requestAnimationFrame(step);
  animatedNumberState.set(el, { current: startVal, rafId });
}

function spawnMenuUpgradeBurst(anchorEl: HTMLElement | null, labelText: string, accentColor = '#f59e0b'): void {
  if (!anchorEl) return;
  const rect = anchorEl.getBoundingClientRect();
  const cx = rect.left + rect.width * 0.5;
  const cy = rect.top + rect.height * 0.42;

  const container = document.createElement('div');
  container.className = 'ui-upgrade-burst-container';
  container.style.left = `${cx}px`;
  container.style.top = `${cy}px`;
  container.style.setProperty('--burst-color', accentColor);

  const ring = document.createElement('span');
  ring.className = 'ui-burst-ring';
  container.appendChild(ring);

  for (let i = 0; i < 6; i++) {
    const spark = document.createElement('span');
    spark.className = 'ui-burst-spark';
    const angle = (i / 6) * Math.PI * 2 - Math.PI * 0.5;
    const dist = 34 + (i % 2) * 14;
    spark.style.setProperty('--tx', `${Math.round(Math.cos(angle) * dist)}px`);
    spark.style.setProperty('--ty', `${Math.round(Math.sin(angle) * dist)}px`);
    container.appendChild(spark);
  }

  const badge = document.createElement('div');
  badge.className = 'ui-burst-badge';
  badge.innerHTML = `${UI_ART.sparkle} <span>${labelText}</span>`;
  container.appendChild(badge);

  document.body.appendChild(container);
  window.setTimeout(() => {
    container.remove();
  }, 850);
}

let selectedSkillNodeId: SkillNodeId = 'swarm_t1';
let isMobileTreeZoomed = false;
let selectedMetaIndex = 0;
let selectedSkinIndex = 0;
let isKbdNavActive = false;

const btnChampion = document.getElementById('btn-champion') as HTMLButtonElement;
const championFill = document.getElementById('champion-fill') as HTMLElement;
const championPct = document.getElementById('champion-pct') as HTMLElement;
const championIcon = document.getElementById('champion-icon') as HTMLElement | null;
const championName = document.getElementById('champion-name') as HTMLElement | null;
const championDesc = document.getElementById('champion-desc') as HTMLElement | null;
const btnMechaMode = document.getElementById('btn-mecha-mode') as HTMLButtonElement;
const mechaModeIcon = document.getElementById('mecha-mode-icon') as HTMLElement | null;
const mechaModeLabel = document.getElementById('mecha-mode-label') as HTMLElement | null;
const btnWeaponMode = document.getElementById('btn-weapon-mode') as HTMLButtonElement | null;
const weaponModeIcon = document.getElementById('weapon-mode-icon') as HTMLElement | null;
const weaponModeLabel = document.getElementById('weapon-mode-label') as HTMLElement | null;

const btnOrbital = document.getElementById('btn-orbital') as HTMLButtonElement;
const orbitalFill = document.getElementById('orbital-fill') as HTMLElement;
const orbitalName = document.getElementById('orbital-name') as HTMLElement | null;
const orbitalPct = document.getElementById('orbital-pct') as HTMLElement;

const btnMechaOverlord = document.getElementById('btn-mecha-overlord') as HTMLButtonElement | null;
const overlordFill = document.getElementById('overlord-fill') as HTMLElement | null;
const overlordPct = document.getElementById('overlord-pct') as HTMLElement | null;

const btnTacticalSubweapon = document.getElementById('btn-tactical-subweapon') as HTMLButtonElement | null;
const subweaponFill = document.getElementById('subweapon-fill') as HTMLElement | null;
const subweaponIcon = document.getElementById('subweapon-icon') as HTMLElement | null;
const subweaponName = document.getElementById('subweapon-name') as HTMLElement | null;
const subweaponPct = document.getElementById('subweapon-pct') as HTMLElement | null;

// Upgrade buttons
const upgFireRate = document.getElementById('upg-firerate') as HTMLButtonElement;
const lvlFireRate = document.getElementById('lvl-firerate') as HTMLElement;
const statFireRate = document.getElementById('stat-firerate') as HTMLElement | null;
const costFireRate = document.getElementById('cost-firerate') as HTMLElement;

const upgPower = document.getElementById('upg-power') as HTMLButtonElement;
const lvlPower = document.getElementById('lvl-power') as HTMLElement;
const statPower = document.getElementById('stat-power') as HTMLElement | null;
const costPower = document.getElementById('cost-power') as HTMLElement;

const upgChampion = document.getElementById('upg-champion') as HTMLButtonElement;
const lvlChampion = document.getElementById('lvl-champion') as HTMLElement;
const statChampion = document.getElementById('stat-champion') as HTMLElement | null;
const costChampion = document.getElementById('cost-champion') as HTMLElement;

const upgLoot = document.getElementById('upg-loot') as HTMLButtonElement;
const lvlLoot = document.getElementById('lvl-loot') as HTMLElement;
const statLoot = document.getElementById('stat-loot') as HTMLElement | null;
const costLoot = document.getElementById('cost-loot') as HTMLElement;

// Modal & Post-Stage 3-Choice Buffs
const resultModal = document.getElementById('result-modal') as HTMLElement;
const modalBadge = document.getElementById('modal-badge') as HTMLElement;
const modalTitle = document.getElementById('modal-title') as HTMLElement;
const modalDesc = document.getElementById('modal-desc') as HTMLElement;
const statTotalSpawned = document.getElementById('stat-total-spawned') as HTMLElement;
const statTotalKills = document.getElementById('stat-total-kills') as HTMLElement;
const statStageGold = document.getElementById('stat-stage-gold') as HTMLElement;
const statLabelSpawned = document.getElementById('stat-label-spawned') as HTMLElement | null;
const statLabelKills = document.getElementById('stat-label-kills') as HTMLElement | null;
const statLabelGold = document.getElementById('stat-label-gold') as HTMLElement | null;
const statBoxGold = document.getElementById('stat-box-gold') as HTMLElement | null;

/**
 * MC-18: the three result stat boxes. Battles keep 波波兵力 / 击退抓捕队 / 本局赏金; squad-run modes (sled, lava, asteroid,
 * pumpkin night, pyramid, jungle, pirate) have no kills or bounty, so they show time (or progress on a loss) /
 * survivors / the mode's own obstacle count instead of a box that always reads 0.
 */
function setResultStatBoxes(run: { victory: boolean; finishSec: number; progressPct: number; survivors: number; metricLabel: string; metricValue: string } | null): void {
  if (!run) {
    if (statLabelSpawned) statLabelSpawned.textContent = '波波兵力';
    if (statLabelKills) statLabelKills.textContent = '击退抓捕队';
    if (statLabelGold) statLabelGold.textContent = '本局赏金';
    statBoxGold?.classList.add('gold-box');
    statTotalSpawned.textContent = `${state.stageClonesSpawned}`;
    statTotalKills.textContent = `${state.stageMutantsKilled}`;
    statStageGold.innerHTML = `+${state.stageGoldEarned} ${UI_ART.coin}`;
    return;
  }
  if (statLabelSpawned) statLabelSpawned.textContent = run.victory ? '用时' : '前进';
  statTotalSpawned.textContent = run.victory ? `${run.finishSec.toFixed(1)}s` : `${Math.round(run.progressPct)}%`;
  if (statLabelKills) statLabelKills.textContent = '幸存波波';
  statTotalKills.textContent = `${Math.max(0, Math.floor(run.survivors))}`;
  if (statLabelGold) statLabelGold.textContent = run.metricLabel;
  statBoxGold?.classList.remove('gold-box');
  statStageGold.textContent = run.metricValue;
}
const rewardSection = document.getElementById('reward-section') as HTMLElement;
const speedSkipBanner = document.getElementById('speed-skip-banner') as HTMLElement | null;
const speedSkipText = document.getElementById('speed-skip-text') as HTMLElement | null;
const btnToggleSpeedSkip = document.getElementById('btn-toggle-speed-skip') as HTMLButtonElement | null;
const rewardPromptText = document.getElementById('reward-prompt-text') as HTMLElement;
const rewardGoldBalanceEl = document.getElementById('reward-gold-balance') as HTMLElement | null;
const btnRerollRewards = document.getElementById('btn-reroll-rewards') as HTMLButtonElement | null;
const rewardCardsContainer = document.getElementById('reward-cards') as HTMLElement;
const tournamentChestSection = document.getElementById('tournament-chest-section') as HTMLElement | null;
const modalChestTitleEl = document.getElementById('modal-chest-title') as HTMLElement | null;
const modalChestRewardsEl = document.getElementById('modal-chest-rewards') as HTMLElement | null;
const btnClaimTournamentChest = document.getElementById('btn-claim-tournament-chest') as HTMLButtonElement | null;
const penaltySection = document.getElementById('penalty-section') as HTMLElement;
const penaltyListEl = document.getElementById('penalty-list') as HTMLElement;
const btnCleanseDebuff = document.getElementById('btn-cleanse-debuff') as HTMLButtonElement;
const btnModalReplay = document.getElementById('btn-modal-replay') as HTMLButtonElement;
const btnModalShare = document.getElementById('btn-modal-share') as HTMLButtonElement | null;
const btnModalNext = document.getElementById('btn-modal-next') as HTMLButtonElement;
const globalToastEl = document.getElementById('global-toast') as HTMLElement | null;

const world = new World3DFull(canvas, labelsContainer, state);
(window as unknown as Record<string, unknown>).__mc3dWorld = world;

// MC-1～MC-18 引擎内自检单独一个 chunk，只有自动化测试（webdriver）才下载；玩家流程不会调用
async function loadSelfChecks(): Promise<void> {
  const { attachSelfChecks } = await import('./game/World3DSelfChecks');
  attachSelfChecks(world);
}
(window as unknown as Record<string, unknown>).__mc3dLoadSelfChecks = loadSelfChecks;
if (navigator.webdriver) void loadSelfChecks();

if (lobbyTrophyCanvas) {
  world.mountTrophyPedestal(lobbyTrophyCanvas);
}

let toastTimeout: number | undefined;
function showGlobalToast(text: string): void {
  if (!globalToastEl) return;
  globalToastEl.innerHTML = replaceEmojiWithArt(text);
  globalToastEl.classList.remove('hidden');
  if (toastTimeout) window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => {
    globalToastEl.classList.add('hidden');
  }, 2600);
}

async function copyTextQuietly(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback below
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return true;
  } catch {
    return false;
  }
}

async function handleShareGame(contextStage?: number, clearTimeSec?: number): Promise<void> {
  const payload = state.buildShareChallengeText(contextStage, clearTimeSec);
  await copyTextQuietly(payload.text);
  const reward = state.claimDailyShareBonus();
  sound.playUpgrade();
  refreshUpgradeUI();
  updateRewardModalHeaderUI();
  renderMainMenu();
  if (reward.claimed) {
    showGlobalToast(
      `🎁 已复制挑战链接！今日首享 +${reward.goldAwarded.toLocaleString()}🪙 & +${reward.shardsAwarded}【${reward.skinName}】碎片`
    );
  } else {
    showGlobalToast('✅ 成绩与邀请链接已复制，快发给好友比拼吧！');
  }
}

function setToolsDrawerOpen(open: boolean): void {
  if (!topToolsDrawer) return;
  topToolsDrawer.classList.toggle('hidden', !open);
  const inActiveMatch =
    mainMenu.classList.contains('hidden') && resultModal.classList.contains('hidden');
  if (inActiveMatch) {
    world.isPaused = open;
  }
}

if (btnTopMenu) {
  btnTopMenu.addEventListener('click', (e) => {
    e.stopPropagation();
    const willOpen = Boolean(topToolsDrawer?.classList.contains('hidden'));
    sound.playUpgrade();
    setToolsDrawerOpen(willOpen);
  });
}

if (btnResumeDrawer) {
  btnResumeDrawer.addEventListener('click', () => {
    sound.playUpgrade();
    setToolsDrawerOpen(false);
  });
}

canvas.addEventListener('pointerdown', () => {
  if (topToolsDrawer && !topToolsDrawer.classList.contains('hidden')) {
    setToolsDrawerOpen(false);
  }
});

let bannerTimeout: number | undefined;
function showBanner(title: string, sub = ''): void {
  if (!mainMenu.classList.contains('hidden')) return;
  bannerTitle.innerHTML = replaceEmojiWithArt(title);
  bannerSub.innerHTML = sub ? replaceEmojiWithArt(sub) : '';
  bannerSub.style.display = sub ? 'block' : 'none';
  centerBanner.classList.remove('hidden');
  if (bannerTimeout) window.clearTimeout(bannerTimeout);
  bannerTimeout = window.setTimeout(() => {
    centerBanner.classList.add('hidden');
  }, 1600);
}

world.onBanner = showBanner;

let currentRewardOptions: RewardOption[] = [];
let hasClaimedStageReward = false;
let selectedRewardIndex = -1;
let stageRewardRerollCount = 0;
let isSpeedSkipEligible = false;
let isSpeedSkipActive = false;

function getRewardRerollCost(): number {
  return 100 * Math.pow(2, stageRewardRerollCount);
}

function getActiveRewardMultiplier(): number {
  return isSpeedSkipEligible && isSpeedSkipActive ? 3 : 1;
}

function refreshWeaponUI(): void {
  const wSpec = state.getWeaponSpec();
  if (weaponModeIcon) weaponModeIcon.innerHTML = wSpec.icon;
  if (weaponModeLabel) weaponModeLabel.textContent = wSpec.shortName;
  if (btnWeaponMode) {
    btnWeaponMode.title = `当前主炮：${wSpec.name}（点击或按[F]切换）· ${wSpec.desc}`;
    btnWeaponMode.classList.toggle('is-scatter', wSpec.id === 'scatter');
    btnWeaponMode.classList.toggle('is-rainbow', wSpec.id === 'rainbow');
  }
  if (homeWeaponIconEl) homeWeaponIconEl.innerHTML = wSpec.icon;
  if (homeWeaponLabelEl) homeWeaponLabelEl.textContent = wSpec.shortName;
  if (btnHomeWeapon) {
    btnHomeWeapon.title = `当前主炮：${wSpec.name}（点击切换）· ${wSpec.desc}`;
  }
}

function refreshMechaUI(): void {
  refreshWeaponUI();
  const spec = state.getMechaSpec();
  const committed = state.getCommittedSkillBranch();
  const ultEvo = state.getUltimateEvolutionSpec();

  if (mechaModeIcon) mechaModeIcon.innerHTML = spec.icon;
  if (mechaModeLabel) mechaModeLabel.textContent = spec.shortName;
  if (championIcon) championIcon.innerHTML = spec.icon;
  const baseChampName = committed ? committed.hammerMorphName : spec.name;
  if (championName) {
    championName.innerHTML = ultEvo.isCompleteForm
      ? `${UI_ART.crown}<span>${baseChampName}</span>`
      : baseChampName;
  }
  if (championDesc) {
    championDesc.textContent = `[${ultEvo.badge}] ${committed ? committed.hammerMorphDesc : spec.desc}`;
  }
  if (btnChampion) {
    btnChampion.classList.toggle('ult-complete-form', ultEvo.isCompleteForm);
    btnChampion.title = committed
      ? `【${committed.hammerMorphName} · ${ultEvo.badge}】(${committed.name}联动·当前姿态：${spec.name}·空格键)：${committed.hammerMorphDesc}`
      : `召唤${spec.name}【${ultEvo.badge}】（空格键）：${spec.desc}`;
  }
  const baseOrbitalName = committed ? committed.orbitalMorphName : '全屏礼花';
  if (orbitalName) {
    orbitalName.innerHTML = ultEvo.isCompleteForm
      ? `${UI_ART.crown}<span>${baseOrbitalName}</span>`
      : baseOrbitalName;
  }
  if (btnOrbital) {
    btnOrbital.classList.toggle('ult-complete-form', ultEvo.isCompleteForm);
    btnOrbital.title = committed
      ? `【${committed.orbitalMorphName} · ${ultEvo.badge}】(${committed.name}联动·Q键)：${committed.orbitalMorphDesc}`
      : `全屏礼花【${ultEvo.badge}】（Q键）：礼花轰炸范围与波次随技能树与大招等级进化`;
  }
}

function getCommanderRankTitle(bestStage: number): string {
  if (bestStage >= 35) return '传奇波波制作人';
  if (bestStage >= 20) return '皇家蒸汽总督';
  if (bestStage >= 10) return '王牌应援督军';
  if (bestStage >= 5) return '资深舞台领队';
  if (bestStage >= 1) return '正式应援团长';
  return '新星应援制作人';
}

function updateMenuTabBadges(): void {
  const skillUpgradableCount = ALL_SKILL_NODES.filter((n) => state.canUpgradeSkillNode(n.id).ok).length;
  const boboTechUpgradableCount = BOBO_TECH_BRANCH_ORDER.filter((bId) => {
    const c = state.getBoboTechUpgradeCost(bId);
    return !c.isMaxed && (c.canAffordCore || c.canAffordGold);
  }).length;
  const metaUpgradableCount =
    boboTechUpgradableCount +
    META_UPGRADES.filter((u) => {
      const lvl = state.getMetaLevel(u.id);
      return lvl < u.maxLevel && state.gold >= state.getMetaUpgradeCost(u.id);
    }).length;
  const skinActionCount = SKINS_CATALOG.filter((s) => {
    const isOwned = state.ownedSkins.includes(s.id);
    if (!isOwned) return state.gold >= s.cost;
    return state.canAscendSkin(s.id).ok;
  }).length;

  const syncBadge = (el: HTMLElement | null, count: number) => {
    if (!el) return;
    if (count > 0) {
      el.textContent = `${count}`;
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  };
  syncBadge(badgeTabSkillsEl, skillUpgradableCount);
  syncBadge(badgeTabMetaEl, metaUpgradableCount);
  syncBadge(badgeTabSkinsEl, skinActionCount);
}

function renderMainMenu(): void {
  const gold = Math.floor(state.gold);
  animateNumberTo(menuGoldAmount, gold);
  animateNumberTo(menuStarAmount, state.getAvailableTalentPoints());
  updateMenuTabBadges();

  const skin = state.getEquippedSkin();
  const finish = state.getEquippedFinish();
  const eqRank = state.getSkinRankSpec(skin.id);
  if (menuEquippedSkin) {
    menuEquippedSkin.innerHTML = `${UI_ART.sparkle} <span>${skin.name} · ${finish.name} (${eqRank.tier})</span>`;
    menuEquippedSkin.style.background = skin.previewGradient;
  }

  const activeKeystone = state.getActiveKeystoneSpec();
  const committedBranch = state.getCommittedSkillBranch();
  const activeRace = state.getActiveRaceBranch();
  const mechaSpec = state.getMechaSpec();
  const activeRacePts = state.getBranchSpentPoints(activeRace.id);

  if (brandCrestImgEl) {
    brandCrestImgEl.src = `/assets/icons/race_${activeRace.id}.png?v=36`;
  }
  if (commanderRankTagEl) {
    commanderRankTagEl.textContent = getCommanderRankTitle(state.bestStageCleared);
  }
  if (commanderNameTextEl) {
    commanderNameTextEl.textContent = state.playerName;
  }
  if (commanderBestStageEl) {
    commanderBestStageEl.innerHTML = `${UI_ART.trophy} <span>${state.bestStageCleared} 关</span>`;
  }

  // Update Home Hero Stage Showcase (Theme-Reactive 3D Studio Turntable Showcase!)
  if (homeHeroStageEl) {
    homeHeroStageEl.style.setProperty('--hero-race-color', activeRace.accentColor);
    homeHeroStageEl.dataset.theme = world.currentTheme?.id || 'wasteland';
    homeHeroStageEl.dataset.race = activeRace.id;
  }
  if (homeMechaIconEl) {
    homeMechaIconEl.innerHTML = mechaSpec.icon;
  }
  if (homeMechaLabelEl) {
    homeMechaLabelEl.textContent = committedBranch ? committedBranch.hammerMorphName : mechaSpec.shortName;
  }
  refreshWeaponUI();
  if (homeMascotArtEl) {
    homeMascotArtEl.innerHTML = activeRace.icon;
  }
  if (homeRaceTitleEl) {
    homeRaceTitleEl.innerHTML = `${activeKeystone ? `${UI_ART.crown} ` : ''}${activeRace.raceName}`;
  }
  if (homeRacePtsTagEl) {
    homeRacePtsTagEl.innerHTML = `${UI_ART.star} ${activeRacePts}/16`;
  }
  if (homeRacePerkEl) {
    homeRacePerkEl.textContent = activeKeystone
      ? `终极觉醒：${activeKeystone.node.name} — ${activeKeystone.node.desc}`
      : `${activeRace.subtitle} · 大招【${activeRace.hammerMorphName}】`;
  }
  if (launchBtnSubEl && world.currentTheme) {
    launchBtnSubEl.textContent = `第 1 关起航 · ${world.currentTheme.badge}【${world.currentTheme.perkTitle}】· ${activeRace.raceName}出阵`;
  }
  const endlessMedal = state.getEndlessMedalInfo();
  if (endlessBestTextEl) {
    endlessBestTextEl.textContent = `最佳 ${state.bestEndlessWave} 波 · ${endlessMedal.label}`;
  }
  if (endlessBestBadgeEl) {
    endlessBestBadgeEl.style.borderColor = endlessMedal.color;
    endlessBestBadgeEl.style.color = endlessMedal.color;
  }
  const escortRank = state.getEscortRankInfo();
  if (escortBestTextEl) {
    escortBestTextEl.textContent =
      state.escortClears > 0
        ? `通关 ${state.escortClears} 次 · 最快 ${state.bestEscortClearSec.toFixed(1)}s`
        : `最佳 ${state.bestEscortProgressPct}% · ${escortRank.label}`;
  }
  if (escortBestBadgeEl) {
    escortBestBadgeEl.style.borderColor = escortRank.color;
    escortBestBadgeEl.style.color = escortRank.color;
  }

  // MC-7: Update Gear Summit Tournament Lobby Badge & Streak Multiplier Chest Bar
  const trnSpec = state.getTournamentStageSpec();
  const trophyBonus = state.getTournamentTrophyBonus();
  const pendingStageVal = state.pendingTournamentChestStage;
  const pendingChest = state.getPendingTournamentChestPreview(
    pendingStageVal !== 0 ? pendingStageVal : state.tournamentStage
  );
  if (tournamentProgressTextEl) {
    tournamentProgressTextEl.textContent = `${trnSpec.badgeText} · ${trnSpec.streakLabel} · ${state.tournamentTrophies} 奖杯`;
  }
  if (tournamentStageSubEl) {
    tournamentStageSubEl.textContent =
      trophyBonus.trophies > 0
        ? `当前【${trophyBonus.badgeLabel}】全局射速+${trophyBonus.fireRatePct}% · 全军战力+${trophyBonus.powerPct}% · 砖块 ${state.tournamentBricks}`
        : '三连战夺杯（1.5x / 2.2x / 3.5x）· 奖杯永久加射速与兵力';
  }
  if (lobbyChestTitleEl) {
    lobbyChestTitleEl.textContent =
      state.pendingTournamentChestStage > 0
        ? `可领取：${pendingChest.streakLabel} 连胜宝箱（第 ${pendingChest.stage}/3 战）`
        : `下一档：${trnSpec.streakLabel} 连胜宝箱`;
  }
  if (lobbyChestDescEl) {
    lobbyChestDescEl.textContent = `内含 +${pendingChest.coins} 金币 · +${pendingChest.cards} 碎片卡 · +${pendingChest.bricks} 砖块 · +${pendingChest.trophies} 荣誉奖杯`;
  }
  if (btnLobbyClaimChest) {
    const canClaimLobby = state.pendingTournamentChestStage > 0;
    btnLobbyClaimChest.disabled = !canClaimLobby;
    btnLobbyClaimChest.classList.toggle('is-ready', canClaimLobby);
    btnLobbyClaimChest.innerHTML = canClaimLobby
      ? `${UI_ART.tournamentChest} 立即开启`
      : '夺胜后开启';
  }

  // MC-8: Update Giant Clockwork Colossus Raid Lobby Card
  const raidSpec = state.getColossusRaidSpec();
  if (colossusRaidTextEl) {
    colossusRaidTextEl.textContent =
      state.colossusRaidClears > 0
        ? `第 ${raidSpec.raidTier} 阶 · 已讨伐 ${state.colossusRaidClears} 次 · ${state.clockworkCores} 核心`
        : `第 1 阶 · 库存 ${state.clockworkCores} 核心`;
  }
  if (colossusRaidSubEl) {
    colossusRaidSubEl.textContent =
      state.bestColossusClearSec > 0
        ? `最快讨伐 ${state.bestColossusClearSec.toFixed(1)}s · 拆解重盾与糖炮触发 6s 瘫痪 2.5x 暴击`
        : '拆重盾与糖炮 · 触发 6s 瘫痪 2.5x 暴击';
  }

  // MC-9: Update Cloud Airship Mothership Escort Lobby Card & Wing Medal Counter
  const airshipSpec = state.getAirshipEscortSpec();
  const airshipMilestone = state.getAirshipMilestoneBonus();
  if (airshipEscortMedalTextEl) {
    airshipEscortMedalTextEl.textContent =
      state.airshipEscortClears > 0
        ? `飞艇护航徽章 ${state.airshipWingMedals} · 第 ${airshipSpec.escortTier} 阶`
        : `飞艇护航徽章 ${state.airshipWingMedals} · 第 1 阶`;
  }
  if (airshipEscortSubEl) {
    airshipEscortSubEl.textContent =
      state.airshipEscortClears > 0
        ? `${airshipMilestone.summaryText} · 已护航 ${state.airshipEscortClears} 次`
        : '拔除拦截副塔 · 空投超级波波冲破总厂';
  }
  if (airshipEscortBadgeEl) {
    airshipEscortBadgeEl.style.borderColor = airshipMilestone.accentColor;
  }

  // MC-12: Update Glacier Sled Race Lobby Card, 冰晶奖章 Counter & the lobby 3D trophy pedestal
  const sledLobbySpec = state.getGlacierSledSpec();
  const iceMilestone = state.getIceMedalMilestoneBonus();
  if (glacierIceMedalTextEl) {
    glacierIceMedalTextEl.textContent = `冰晶奖章 ${state.iceMedals} · 第 ${sledLobbySpec.sledTier} 阶`;
  }
  if (glacierSledSubEl) {
    glacierSledSubEl.textContent =
      state.glacierSledClears > 0
        ? `${iceMilestone.summaryText} · 最快 ${state.bestSledFinishSec.toFixed(1)}s`
        : '躲雪崩与冰锥 · 穿加人门 · 限时冲线';
  }
  if (glacierSledBadgeEl) {
    glacierSledBadgeEl.style.borderColor = iceMilestone.accentColor;
  }
  // MC-13: Update Volcano Lava Jump Lobby Card & 熔岩晶核 Counter
  const lavaLobbySpec = state.getLavaJumpSpec();
  const lavaMs = state.getLavaCoreMilestoneBonus();
  if (lavaCoreTextEl) {
    lavaCoreTextEl.textContent = `熔岩晶核 ${state.lavaCores} · 第 ${lavaLobbySpec.lavaTier} 阶`;
  }
  if (lavaJumpSubEl) {
    lavaJumpSubEl.textContent =
      state.lavaJumpClears > 0
        ? `${lavaMs.summaryText} · 最快 ${state.bestLavaFinishSec.toFixed(1)}s`
        : '连跳熔岩浮石 · 躲喷发落石 · 冲出火山口';
  }
  if (lavaJumpBadgeEl) {
    lavaJumpBadgeEl.style.borderColor = lavaMs.accentColor;
  }
  const lobbyHall = state.getTrophyHallBonus();
  if (lobbyTrophyCaptionTextEl) {
    lobbyTrophyCaptionTextEl.textContent =
      lobbyHall.displayedCount > 0
        ? `荣誉陈列 ${lobbyHall.displayedCount}/${TROPHY_HALL_SLOT_COUNT}`
        : '奖杯馆';
  }
  if (lobbyTrophyPedestalBtn) {
    lobbyTrophyPedestalBtn.style.setProperty('--hall-accent', lobbyHall.accentColor);
    lobbyTrophyPedestalBtn.dataset.displayed = `${lobbyHall.displayedCount}`;
    // MC-14: the active decor theme tints the pedestal frame (and the 3D room inside it)
    const lobbyTheme = state.getActiveDecorThemeSpec();
    lobbyTrophyPedestalBtn.dataset.decorTheme = lobbyTheme.id;
    lobbyTrophyPedestalBtn.style.setProperty('--decor-wall', lobbyTheme.cssWall);
    lobbyTrophyPedestalBtn.style.setProperty('--decor-floor', lobbyTheme.cssFloor);
    lobbyTrophyPedestalBtn.style.setProperty('--decor-accent', lobbyTheme.cssAccent);
    lobbyTrophyPedestalBtn.title = `${lobbyTheme.name} · 奖杯馆：前往工坊布置陈列与装修`;
  }
  world.syncTrophyPedestal3D();
  world.syncLobbyDecor3D();

  // MC-14: Update Asteroid Belt Shield Breakout Lobby Card & 星尘徽章 Counter
  const astLobbySpec = state.getAsteroidDashSpec();
  const starMs = state.getStardustMilestoneBonus();
  if (stardustBadgeTextEl) {
    stardustBadgeTextEl.textContent = `星尘徽章 ${state.stardustBadges} · 第 ${astLobbySpec.asteroidTier} 阶`;
  }
  if (asteroidDashSubEl) {
    asteroidDashSubEl.textContent =
      state.asteroidDashClears > 0
        ? `${starMs.summaryText} · 最快 ${state.bestAsteroidFinishSec.toFixed(1)}s`
        : '躲陨石落点 · 穿护盾门 · 冲进星光门';
  }
  if (asteroidDashBadgeEl) {
    asteroidDashBadgeEl.style.borderColor = starMs.accentColor;
  }

  // MC-18: Update Pirate Plank Breakout Lobby Card & 金骷髅徽章 Counter
  const prLobbySpec = state.getPirateBoardingSpec();
  const prMs = state.getGoldSkullMilestoneBonus();
  if (goldSkullTextEl) {
    goldSkullTextEl.textContent = `金骷髅徽章 ${state.goldSkullBadges} · 第 ${prLobbySpec.pirateTier} 阶`;
  }
  if (pirateBoardingSubEl) {
    pirateBoardingSubEl.textContent =
      state.pirateBoardingClears > 0
        ? `${prMs.rankTitle} · 最快 ${state.bestPirateFinishSec.toFixed(1)}s`
        : '踩跳板过海 · 躲炮弹 · 冲上旗舰';
  }
  if (pirateBoardingBadgeEl) {
    pirateBoardingBadgeEl.style.borderColor = prMs.accentColor;
    pirateBoardingBadgeEl.title = prMs.summaryText;
  }

  // MC-17: Update Jungle Temple Vine Swing Lobby Card & 翡翠神像徽章 Counter
  const jgLobbySpec = state.getJungleSwingSpec();
  const jgMs = state.getEmeraldIdolMilestoneBonus();
  if (emeraldIdolTextEl) {
    emeraldIdolTextEl.textContent = `翡翠神像徽章 ${state.emeraldIdolBadges} · 第 ${jgLobbySpec.jungleTier} 阶`;
  }
  if (jungleSwingSubEl) {
    jungleSwingSubEl.textContent =
      state.jungleSwingClears > 0
        ? `${jgMs.summaryText} · 最快 ${state.bestJungleFinishSec.toFixed(1)}s`
        : '荡藤蔓过断崖 · 闪滚石 · 限时冲出神庙';
  }
  if (jungleSwingBadgeEl) {
    jungleSwingBadgeEl.style.borderColor = jgMs.accentColor;
  }

  // MC-16: Update Desert Pyramid Trap Run Lobby Card & 圣甲虫徽章 Counter
  const pyLobbySpec = state.getPyramidRunSpec();
  const pyMs = state.getScarabMilestoneBonus();
  if (scarabBadgeTextEl) {
    scarabBadgeTextEl.textContent = `圣甲虫徽章 ${state.scarabBadges} · 第 ${pyLobbySpec.pyramidTier} 阶`;
  }
  if (pyramidRunSubEl) {
    pyramidRunSubEl.textContent =
      state.pyramidRunClears > 0
        ? `${pyMs.summaryText} · 最快 ${state.bestPyramidFinishSec.toFixed(1)}s`
        : '踩石板过流沙 · 躲翻转石板 · 限时冲出墓道';
  }
  if (pyramidRunBadgeEl) {
    pyramidRunBadgeEl.style.borderColor = pyMs.accentColor;
  }

  // MC-15: Update Haunted Castle Pumpkin Night Lobby Card & 南瓜灯徽章 Counter, plus the lobby tactic-deck strip
  const pkLobbySpec = state.getPumpkinNightSpec();
  const pkMs = state.getPumpkinMilestoneBonus();
  if (pumpkinBadgeTextEl) {
    pumpkinBadgeTextEl.textContent = `南瓜灯徽章 ${state.pumpkinBadges} · 第 ${pkLobbySpec.pumpkinTier} 阶`;
  }
  if (pumpkinNightSubEl) {
    pumpkinNightSubEl.textContent =
      state.pumpkinNightClears > 0
        ? `${pkMs.summaryText} · 最快 ${state.bestPumpkinFinishSec.toFixed(1)}s`
        : '踩灯区补光 · 驱散穿墙幽灵 · 限时冲出城门';
  }
  if (pumpkinNightBadgeEl) {
    pumpkinNightBadgeEl.style.borderColor = pkMs.accentColor;
  }
  renderLobbyTacticStrip();

  // MC-11: Update Deep-Sea Submarine Bubble Rescue Lobby Card & 深海珍珠 Counter
  const subRescueSpec = state.getSubmarineRescueSpec();
  const pearlMilestone = state.getDeepPearlMilestoneBonus();
  if (submarinePearlTextEl) {
    submarinePearlTextEl.textContent = `深海珍珠 ${state.deepPearls} · 第 ${subRescueSpec.rescueTier} 阶`;
  }
  if (submarineRescueSubEl) {
    submarineRescueSubEl.textContent =
      state.submarineRescueClears > 0
        ? `${pearlMilestone.summaryText} · 已营救 ${state.submarineRescueClears} 次`
        : '破开珊瑚封锁 · 戳泡泡营救被困波波';
  }
  if (submarinePearlBadgeEl) {
    submarinePearlBadgeEl.style.borderColor = pearlMilestone.accentColor;
  }

  // MC-10: Update Rainbow Candy Train Raid Lobby Card & 列车金章 Counter
  const trainRaidSpec = state.getCandyTrainRaidSpec();
  const trainMilestone = state.getTrainMedalMilestoneBonus();
  if (candyTrainMedalTextEl) {
    candyTrainMedalTextEl.textContent = `列车金章 ${state.trainGoldMedals} · 第 ${trainRaidSpec.raidTier} 阶`;
  }
  if (candyTrainSubEl) {
    candyTrainSubEl.textContent =
      state.candyTrainRaidClears > 0
        ? `${trainMilestone.summaryText} · 已劫车 ${state.candyTrainRaidClears} 次`
        : '击破铁皮车厢 · 夺取列车金章';
  }
  if (candyTrainBadgeEl) {
    candyTrainBadgeEl.style.borderColor = trainMilestone.accentColor;
  }
  refreshSubWeaponHUD();

  if (menuActiveKeystonePill) {
    const desktopLabel = activeKeystone
      ? `${activeKeystone.branch.icon} ${UI_ART.crown} ${activeKeystone.branch.raceName}·${activeKeystone.node.name}`
      : `${activeRace.icon} ${activeRace.raceName}·${activeRace.unitName} (${activeRacePts}/16 生效中)`;
    const mobileLabel = activeKeystone
      ? `${activeKeystone.branch.icon}${UI_ART.crown} ${activeKeystone.branch.raceName}`
      : `${activeRace.icon} ${activeRace.raceName} (${activeRacePts}/16)`;
    menuActiveKeystonePill.innerHTML = `<span class="desktop-only-text">${desktopLabel}</span><span class="mobile-only-text">${mobileLabel}</span><kbd class="kbd-hint">G</kbd>`;
  }

  renderSkillTreePanel();

  if (menuStatPower) menuStatPower.textContent = `×${state.getPowerMultiplier().toFixed(2)}`;
  if (menuStatFireRate) menuStatFireRate.textContent = `${state.getFireRatePerSec().toFixed(1)}/s`;
  if (menuStatBastion) {
    const bPct = Math.round((state.getBaseHpMultiplier() - 1) * 100);
    menuStatBastion.textContent = `${bPct >= 0 ? '+' : ''}${bPct}%`;
  }
  if (menuStatBounty) {
    const lPct = Math.round((state.getLootMultiplier() - 1) * 100);
    menuStatBounty.textContent = `+${lPct}%`;
  }

  // Render MC-10 Bobo Squad Relic Banner Stand (#relic-banner-stand)
  const activeRelicSpec = state.getRelicBannerSpec(state.activeRelicBanner);
  const activeRelicLvl = Math.max(1, state.getRelicBannerLevel(state.activeRelicBanner));
  const trainBonusInfo = state.getTrainMedalMilestoneBonus();
  if (relicBannerActivePill) {
    relicBannerActivePill.innerHTML = `${activeRelicSpec.inlineIcon} 出战战旗：${activeRelicSpec.name} Lv.${activeRelicLvl}`;
  }
  if (relicBannerResources) {
    relicBannerResources.innerHTML = `${UI_ART.trainGoldMedal} 列车金章 ${state.trainGoldMedals} · 劫车成功 ${state.candyTrainRaidClears} 次 · 累计击破 ${state.totalTrainCarsBroken} 节车厢`;
  }
  if (relicBannerMilestoneBanner) {
    const nextTxt =
      trainBonusInfo.nextThreshold > 0
        ? `距下一金章里程碑还差 ${Math.max(0, trainBonusInfo.nextThreshold - trainBonusInfo.effectiveMedals)} 枚`
        : '已达最高金章里程碑';
    relicBannerMilestoneBanner.innerHTML = `<span>${UI_ART.trainGoldMedal} 金章里程碑：${trainBonusInfo.summaryText}</span><span>${nextTxt}</span>`;
    relicBannerMilestoneBanner.style.borderColor = trainBonusInfo.accentColor;
  }
  if (relicBannerGrid) {
    relicBannerGrid.innerHTML = '';
    const bannerBgMap: Record<RelicBannerId, string> = {
      gale_charge: 'radial-gradient(circle, #99f6e4 0%, #0f766e 100%)',
      holy_shield: 'radial-gradient(circle, #bfdbfe 0%, #1d4ed8 100%)',
      star_carnival: 'radial-gradient(circle, #f5d0fe 0%, #a21caf 100%)',
    };
    RELIC_BANNER_ORDER.forEach((bannerId) => {
      const spec = RELIC_BANNERS[bannerId];
      const lvl = state.getRelicBannerLevel(bannerId);
      const isUnlocked = lvl >= 1;
      const isEquipped = state.activeRelicBanner === bannerId && isUnlocked;
      const costInfo = state.getRelicBannerUpgradeCost(bannerId);
      const pipsHtml = Array.from({ length: RELIC_BANNER_MAX_LEVEL })
        .map((_, idx) => `<span class="bobo-tech-pip ${idx < lvl ? 'is-filled' : ''}"></span>`)
        .join('');

      const card = document.createElement('div');
      card.className = `finish-card mecha-mod-card bobo-tech-card cannon-mod-card relic-banner-card ${isUnlocked ? 'owned' : 'is-locked-mod'} ${isEquipped ? 'equipped is-equipped-mod is-equipped-banner' : ''}`;
      card.dataset.relicBanner = bannerId;
      card.style.setProperty('--banner-accent', spec.accentColor);
      card.innerHTML = `
        <div class="finish-card-top">
          <div class="finish-swatch relic-banner-swatch" style="background: ${bannerBgMap[bannerId]}">${RELIC_BANNER_ART[bannerId]}</div>
          <div class="finish-meta">
            <span class="finish-name">${spec.name} ${isUnlocked ? `Lv.${lvl}/${RELIC_BANNER_MAX_LEVEL}` : '未解锁 (Lv.0)'}</span>
            <span class="finish-tag" style="color: ${spec.accentColor}">${spec.subtitle}</span>
            <div class="bobo-tech-pips" aria-hidden="true">${pipsHtml}</div>
          </div>
        </div>
        <div class="finish-bonus">${spec.statText(lvl)}</div>
        <div class="finish-hint" title="${spec.desc}">${spec.desc}</div>
        <div class="bobo-tech-actions cannon-mod-actions relic-banner-actions">
          <button type="button" class="finish-action-btn bobo-tech-doctrine-btn relic-banner-equip-btn ${isEquipped ? 'btn-equipped' : 'btn-equip'}" data-relic-banner-equip="${bannerId}" ${!isUnlocked ? 'disabled' : ''}>
            ${isEquipped ? `${UI_ART.check} 战旗已出战` : isUnlocked ? '插上出战战旗' : `${UI_ART.lock} 解锁后可出战`}
          </button>
          <button type="button" class="finish-action-btn relic-banner-medal-btn ${costInfo.isMaxed ? 'btn-equipped' : 'btn-buy'}" data-relic-banner-medal="${bannerId}" ${!costInfo.canAffordMedal ? 'disabled' : ''}>
            ${costInfo.isMaxed ? `${UI_ART.check} MAX` : `${UI_ART.trainGoldMedal} ${costInfo.medalCost}金章 ${isUnlocked ? '升阶' : '解锁'}`}
          </button>
          <button type="button" class="finish-action-btn relic-banner-gold-btn ${costInfo.isMaxed ? 'btn-equipped' : 'btn-buy'}" data-relic-banner-gold="${bannerId}" ${!costInfo.canAffordGold ? 'disabled' : ''}>
            ${costInfo.isMaxed ? `${UI_ART.check} MAX` : `${UI_ART.coin} ${costInfo.goldCost} ${isUnlocked ? '升阶' : '解锁'}`}
          </button>
        </div>
      `;

      const afterBannerChange = (anchor: HTMLElement, label: string): void => {
        world.syncRelicBanner3D(true);
        sound.playTechUpgradeChime();
        spawnMenuUpgradeBurst(anchor, label, spec.accentColor);
        refreshUpgradeUI();
        renderMainMenu();
        renderActiveBuffsBar();
      };

      const equipBtn = card.querySelector('.relic-banner-equip-btn') as HTMLButtonElement;
      equipBtn.addEventListener('click', () => {
        if (state.equipRelicBanner(bannerId)) {
          afterBannerChange(equipBtn, `出战【${spec.name}】!`);
        }
      });

      const medalBtn = card.querySelector('.relic-banner-medal-btn') as HTMLButtonElement;
      medalBtn.addEventListener('click', () => {
        const res = state.upgradeRelicBanner(bannerId, 'medal');
        if (res.upgraded) {
          afterBannerChange(medalBtn, `${spec.name} ${res.wasUnlock ? '已解锁' : `Lv.${res.newLevel}`}!`);
        }
      });

      const goldBtn = card.querySelector('.relic-banner-gold-btn') as HTMLButtonElement;
      goldBtn.addEventListener('click', () => {
        const res = state.upgradeRelicBanner(bannerId, 'gold');
        if (res.upgraded) {
          afterBannerChange(goldBtn, `${spec.name} ${res.wasUnlock ? '已解锁' : `Lv.${res.newLevel}`}!`);
        }
      });

      relicBannerGrid.appendChild(card);
    });
  }

  // Render MC-11 Bobo Squad Pet Companion Dock (#pet-companion-dock)
  const activePetSpec = state.getPetCompanionSpec(state.activePet);
  const activePetLvl = state.getPetCompanionLevel(state.activePet);
  const pearlBonusInfo = state.getDeepPearlMilestoneBonus();
  if (petCompanionActivePill) {
    petCompanionActivePill.innerHTML = `${activePetSpec.inlineIcon} 随军萌宠：${activePetSpec.name} Lv.${Math.max(1, activePetLvl)}`;
  }
  if (petCompanionResources) {
    petCompanionResources.innerHTML = `${UI_ART.deepPearl} 深海珍珠 ${state.deepPearls} · 营救成功 ${state.submarineRescueClears} 次 · 累计戳破 ${state.totalBubblesPopped} 个营救泡泡`;
  }
  if (petCompanionMilestoneBanner) {
    const nextPearlTxt =
      pearlBonusInfo.nextThreshold > 0
        ? `距下一珍珠里程碑还差 ${Math.max(0, pearlBonusInfo.nextThreshold - pearlBonusInfo.effectivePearls)} 枚`
        : '已达最高珍珠里程碑';
    petCompanionMilestoneBanner.innerHTML = `<span>${UI_ART.deepPearl} 珍珠里程碑：${pearlBonusInfo.summaryText}</span><span>单宠出战位 · 同时仅 1 只萌宠随军 · ${nextPearlTxt}</span>`;
    petCompanionMilestoneBanner.style.borderColor = pearlBonusInfo.accentColor;
  }
  if (petCompanionGrid) {
    petCompanionGrid.innerHTML = '';
    const petBgMap: Record<PetCompanionId, string> = {
      jelly_puff: 'radial-gradient(circle, #fce7f3 0%, #db2777 100%)',
      shell_turtle: 'radial-gradient(circle, #ccfbf1 0%, #0f766e 100%)',
      spark_seahorse: 'radial-gradient(circle, #ffedd5 0%, #c2410c 100%)',
    };
    PET_COMPANION_ORDER.forEach((petId) => {
      const spec = PET_COMPANIONS[petId];
      const lvl = state.getPetCompanionLevel(petId);
      const isAdopted = lvl >= 1;
      const isEquipped = state.activePet === petId && isAdopted;
      const costInfo = state.getPetUpgradeCost(petId);
      const pipsHtml = Array.from({ length: PET_COMPANION_MAX_LEVEL })
        .map((_, idx) => `<span class="bobo-tech-pip ${idx < lvl ? 'is-filled' : ''}"></span>`)
        .join('');

      const card = document.createElement('div');
      card.className = `finish-card mecha-mod-card bobo-tech-card cannon-mod-card pet-companion-card ${isAdopted ? 'owned' : 'is-locked-mod'} ${isEquipped ? 'equipped is-equipped-mod is-equipped-pet' : ''}`;
      card.dataset.petCompanion = petId;
      card.style.setProperty('--pet-accent', spec.accentColor);
      card.innerHTML = `
        <div class="finish-card-top">
          <div class="finish-swatch pet-companion-swatch" style="background: ${petBgMap[petId]}">${PET_COMPANION_ART[petId]}</div>
          <div class="finish-meta">
            <span class="finish-name">${spec.name} ${isAdopted ? `Lv.${lvl}/${PET_COMPANION_MAX_LEVEL}` : '待领养 (Lv.0)'}</span>
            <span class="finish-tag" style="color: ${spec.accentColor}">${spec.role} · ${spec.subtitle}</span>
            <div class="bobo-tech-pips" aria-hidden="true">${pipsHtml}</div>
          </div>
        </div>
        <div class="finish-bonus">${spec.statText(lvl)}</div>
        <div class="finish-hint" title="${spec.desc}">${spec.desc}</div>
        <div class="bobo-tech-actions cannon-mod-actions pet-companion-actions">
          <button type="button" class="finish-action-btn bobo-tech-doctrine-btn pet-companion-equip-btn ${isEquipped ? 'btn-equipped' : 'btn-equip'}" data-pet-equip="${petId}" ${!isAdopted ? 'disabled' : ''}>
            ${isEquipped ? `${UI_ART.check} 随军出战中` : isAdopted ? '带它随军出战' : `${UI_ART.lock} 领养后可出战`}
          </button>
          <button type="button" class="finish-action-btn pet-companion-pearl-btn ${costInfo.isMaxed ? 'btn-equipped' : 'btn-buy'}" data-pet-pearl="${petId}" ${!costInfo.canAffordPearl ? 'disabled' : ''}>
            ${costInfo.isMaxed ? `${UI_ART.check} MAX` : `${UI_ART.deepPearl} ${costInfo.pearlCost}珍珠 ${isAdopted ? '升阶' : '领养'}`}
          </button>
          <button type="button" class="finish-action-btn pet-companion-gold-btn ${costInfo.isMaxed ? 'btn-equipped' : 'btn-buy'}" data-pet-gold="${petId}" ${!costInfo.canAffordGold ? 'disabled' : ''}>
            ${costInfo.isMaxed ? `${UI_ART.check} MAX` : `${UI_ART.coin} ${costInfo.goldCost} ${isAdopted ? '升阶' : '领养'}`}
          </button>
        </div>
      `;

      const afterPetChange = (anchor: HTMLElement, label: string): void => {
        world.syncPetCompanion3D(true);
        sound.playTechUpgradeChime();
        spawnMenuUpgradeBurst(anchor, label, spec.accentColor);
        refreshUpgradeUI();
        renderMainMenu();
        renderActiveBuffsBar();
      };

      const equipBtn = card.querySelector('.pet-companion-equip-btn') as HTMLButtonElement;
      equipBtn.addEventListener('click', () => {
        if (state.equipPetCompanion(petId)) {
          afterPetChange(equipBtn, `${spec.name}随军出战!`);
        }
      });

      const pearlBtn = card.querySelector('.pet-companion-pearl-btn') as HTMLButtonElement;
      pearlBtn.addEventListener('click', () => {
        const res = state.upgradePetCompanion(petId, 'pearl');
        if (res.upgraded) {
          afterPetChange(pearlBtn, `${spec.name} ${res.wasAdopt ? '领养成功' : `Lv.${res.newLevel}`}!`);
        }
      });

      const goldBtn = card.querySelector('.pet-companion-gold-btn') as HTMLButtonElement;
      goldBtn.addEventListener('click', () => {
        const res = state.upgradePetCompanion(petId, 'gold');
        if (res.upgraded) {
          afterPetChange(goldBtn, `${spec.name} ${res.wasAdopt ? '领养成功' : `Lv.${res.newLevel}`}!`);
        }
      });

      petCompanionGrid.appendChild(card);
    });
  }

  // Render MC-12 Bobo Squad Honor Trophy Hall (#trophy-hall)
  renderTrophyHall();

  // Render MC-13 Bobo Squad Skin Gacha Machine (#gacha-machine)
  renderGachaMachine();

  // Render MC-14 Themed Lobby Decoration Hall (#decor-hall)
  renderDecorHall();

  // Render MC-15 Bobo Squad Tactic Deck (#tactic-deck)
  renderTacticDeck();

  // Render MC-9 Steam Cannon Core Module Workbench (#cannon-mod-workbench)
  const activeCannonModSpec = state.getCannonModSpec(state.activeCannonMod);
  const activeCannonModLvl = Math.max(1, state.getCannonModLevel(state.activeCannonMod));
  const airshipBonusInfo = state.getAirshipMilestoneBonus();
  if (cannonModActivePill) {
    cannonModActivePill.innerHTML = `${activeCannonModSpec.inlineIcon} 当前挂载：${activeCannonModSpec.name} Lv.${activeCannonModLvl}`;
  }
  if (cannonModResources) {
    cannonModResources.innerHTML = `${UI_ART.airshipWingMedal} 飞艇护航徽章 ${state.airshipWingMedals} · 护航突破 ${state.airshipEscortClears} 次 · 累计空投 ${state.totalAirshipDropPods} 舱`;
  }
  if (cannonModMilestoneBanner) {
    cannonModMilestoneBanner.innerHTML = `<span>${UI_ART.airshipWingMedal} 护航勋阶全局加成：${airshipBonusInfo.summaryText}</span><span>累计拔除拦截塔 ${state.totalAntiAirTurretsCleared} 座</span>`;
  }
  if (cannonModGrid) {
    cannonModGrid.innerHTML = '';
    const modBgMap: Record<CannonCoreModId, string> = {
      overdrive_breech: 'radial-gradient(circle, #fde047 0%, #b45309 100%)',
      prism_splitter: 'radial-gradient(circle, #7dd3fc 0%, #0369a1 100%)',
      heavy_mortar: 'radial-gradient(circle, #fda4af 0%, #9f1239 100%)',
    };
    CANNON_CORE_MOD_ORDER.forEach((modId) => {
      const spec = CANNON_CORE_MODS[modId];
      const lvl = state.getCannonModLevel(modId);
      const isUnlocked = lvl >= 1;
      const isEquipped = state.activeCannonMod === modId && isUnlocked;
      const costInfo = state.getCannonModUpgradeCost(modId);

      const pipsHtml = Array.from({ length: CANNON_CORE_MOD_MAX_LEVEL })
        .map((_, idx) => `<span class="bobo-tech-pip ${idx < lvl ? 'is-filled' : ''}"></span>`)
        .join('');

      const card = document.createElement('div');
      card.className = `finish-card mecha-mod-card bobo-tech-card cannon-mod-card ${isUnlocked ? 'owned' : 'is-locked-mod'} ${isEquipped ? 'equipped is-equipped-mod' : ''}`;
      card.dataset.cannonMod = modId;
      card.innerHTML = `
        <div class="finish-card-top">
          <div class="finish-swatch" style="background: ${modBgMap[modId]}">${CANNON_MOD_ART[modId]}</div>
          <div class="finish-meta">
            <span class="finish-name">${spec.name} ${isUnlocked ? `Lv.${lvl}/${CANNON_CORE_MOD_MAX_LEVEL}` : '未解锁 (Lv.0)'}</span>
            <span class="finish-tag" style="color: ${spec.accentColor}">${spec.subtitle}</span>
            <div class="bobo-tech-pips" aria-hidden="true">${pipsHtml}</div>
          </div>
        </div>
        <div class="finish-bonus">${spec.statText(lvl)}</div>
        <div class="finish-hint" title="${spec.desc}">${spec.desc}</div>
        <div class="bobo-tech-actions cannon-mod-actions">
          <button type="button" class="finish-action-btn bobo-tech-doctrine-btn cannon-mod-equip-btn ${isEquipped ? 'btn-equipped' : 'btn-equip'}" data-cannon-mod-equip="${modId}" ${!isUnlocked ? 'disabled' : ''}>
            ${isEquipped ? `${UI_ART.check} 母炮已挂载生效` : isUnlocked ? '挂载至蒸汽母炮' : `${UI_ART.lock} 解锁后可挂载`}
          </button>
          <button type="button" class="finish-action-btn cannon-mod-medal-btn ${costInfo.isMaxed ? 'btn-equipped' : 'btn-buy'}" data-cannon-mod-medal="${modId}" ${!costInfo.canAffordMedal ? 'disabled' : ''}>
            ${costInfo.isMaxed ? `${UI_ART.check} MAX` : `${UI_ART.airshipWingMedal} ${costInfo.medalCost}徽章 ${isUnlocked ? '升阶' : '解锁'}`}
          </button>
          <button type="button" class="finish-action-btn cannon-mod-gold-btn ${costInfo.isMaxed ? 'btn-equipped' : 'btn-buy'}" data-cannon-mod-gold="${modId}" ${!costInfo.canAffordGold ? 'disabled' : ''}>
            ${costInfo.isMaxed ? `${UI_ART.check} MAX` : `${UI_ART.coin} ${costInfo.goldCost} ${isUnlocked ? '改装' : '解锁'}`}
          </button>
        </div>
      `;

      const equipBtn = card.querySelector('.cannon-mod-equip-btn') as HTMLButtonElement;
      equipBtn.addEventListener('click', () => {
        if (state.equipCannonMod(modId)) {
          world.syncCannonCoreModule3D();
          sound.playTechUpgradeChime();
          spawnMenuUpgradeBurst(equipBtn, `挂载【${spec.name}】!`, spec.accentColor);
          refreshUpgradeUI();
          renderMainMenu();
          renderActiveBuffsBar();
        }
      });

      const medalBtn = card.querySelector('.cannon-mod-medal-btn') as HTMLButtonElement;
      medalBtn.addEventListener('click', () => {
        const res = state.upgradeCannonMod(modId, 'medal');
        if (res.upgraded) {
          world.syncCannonCoreModule3D();
          sound.playTechUpgradeChime();
          spawnMenuUpgradeBurst(
            medalBtn,
            `${spec.name} ${res.wasUnlock ? '已解锁' : `Lv.${res.newLevel}`}!`,
            spec.accentColor
          );
          refreshUpgradeUI();
          renderMainMenu();
          renderActiveBuffsBar();
        }
      });

      const goldBtn = card.querySelector('.cannon-mod-gold-btn') as HTMLButtonElement;
      goldBtn.addEventListener('click', () => {
        const res = state.upgradeCannonMod(modId, 'gold');
        if (res.upgraded) {
          world.syncCannonCoreModule3D();
          sound.playTechUpgradeChime();
          spawnMenuUpgradeBurst(
            goldBtn,
            `${spec.name} ${res.wasUnlock ? '已解锁' : `Lv.${res.newLevel}`}!`,
            spec.accentColor
          );
          refreshUpgradeUI();
          renderMainMenu();
          renderActiveBuffsBar();
        }
      });

      cannonModGrid.appendChild(card);
    });
  }

  // Render MC-8 Bobo 3-Branch Specialization Tech Tree Workbench
  const activeDoctrineSpec = state.getBoboTechSpec(state.activeBoboTechDoctrine);
  const activeDoctrineLvl = state.getBoboTechLevel(state.activeBoboTechDoctrine);
  if (boboTechActivePill) {
    boboTechActivePill.innerHTML = `${activeDoctrineSpec.inlineIcon} 当前专精战策：${activeDoctrineSpec.name} Lv.${activeDoctrineLvl}`;
  }
  if (boboTechResources) {
    boboTechResources.innerHTML = `${UI_ART.clockworkCore} 发条核心 ${state.clockworkCores} · 攻坚讨伐 ${state.colossusRaidClears} 次 · 累计破拆弱点 ${state.totalColossusWeakpointsBroken}`;
  }
  if (boboTechTreeGrid) {
    boboTechTreeGrid.innerHTML = '';
    const techBgMap: Record<BoboTechBranchId, string> = {
      vanguard_charge: 'radial-gradient(circle, #7dd3fc 0%, #0369a1 100%)',
      heavy_siege: 'radial-gradient(circle, #fde047 0%, #b45309 100%)',
      candy_bombard: 'radial-gradient(circle, #f9a8d4 0%, #be185d 100%)',
    };
    BOBO_TECH_BRANCH_ORDER.forEach((branchId) => {
      const spec = BOBO_TECH_BRANCHES[branchId];
      const lvl = state.getBoboTechLevel(branchId);
      const isDoctrine = state.activeBoboTechDoctrine === branchId;
      const costInfo = state.getBoboTechUpgradeCost(branchId);

      const pipsHtml = Array.from({ length: BOBO_TECH_MAX_LEVEL })
        .map((_, idx) => `<span class="bobo-tech-pip ${idx < lvl ? 'is-filled' : ''}"></span>`)
        .join('');

      const card = document.createElement('div');
      card.className = `finish-card mecha-mod-card bobo-tech-card owned ${isDoctrine ? 'equipped is-active-doctrine' : ''}`;
      card.dataset.techBranch = branchId;
      card.innerHTML = `
        <div class="finish-card-top">
          <div class="finish-swatch" style="background: ${techBgMap[branchId]}">${BOBO_TECH_ART[branchId]}</div>
          <div class="finish-meta">
            <span class="finish-name">${spec.name} Lv.${lvl}/${BOBO_TECH_MAX_LEVEL}</span>
            <span class="finish-tag" style="color: ${spec.accentColor}">${spec.subtitle}</span>
            <div class="bobo-tech-pips" aria-hidden="true">${pipsHtml}</div>
          </div>
        </div>
        <div class="finish-bonus">${spec.statText(lvl, isDoctrine)}</div>
        <div class="finish-hint" title="${spec.desc}">${spec.desc}</div>
        <div class="bobo-tech-doctrine-note">${spec.doctrineBonusText}</div>
        <div class="bobo-tech-actions">
          <button type="button" class="finish-action-btn bobo-tech-doctrine-btn ${isDoctrine ? 'btn-equipped' : 'btn-equip'}" data-tech-doctrine="${branchId}">
            ${isDoctrine ? `${UI_ART.check} 主战策生效中` : '设为专精战策'}
          </button>
          <button type="button" class="finish-action-btn bobo-tech-core-btn ${costInfo.isMaxed ? 'btn-equipped' : 'btn-buy'}" data-tech-upgrade-core="${branchId}" ${!costInfo.canAffordCore ? 'disabled' : ''}>
            ${costInfo.isMaxed ? `${UI_ART.check} MAX` : `${UI_ART.clockworkCore} ${costInfo.coreCost}核 升阶`}
          </button>
          <button type="button" class="finish-action-btn bobo-tech-gold-btn ${costInfo.isMaxed ? 'btn-equipped' : 'btn-buy'}" data-tech-upgrade-gold="${branchId}" ${!costInfo.canAffordGold ? 'disabled' : ''}>
            ${costInfo.isMaxed ? `${UI_ART.check} MAX` : `${UI_ART.coin} ${costInfo.goldCost} 研发`}
          </button>
        </div>
      `;

      const doctrineBtn = card.querySelector('.bobo-tech-doctrine-btn') as HTMLButtonElement;
      doctrineBtn.addEventListener('click', () => {
        state.setActiveBoboTechDoctrine(branchId);
        sound.playTechUpgradeChime();
        spawnMenuUpgradeBurst(doctrineBtn, `切换战策【${spec.name}】!`, spec.accentColor);
        refreshUpgradeUI();
        renderMainMenu();
      });

      const coreBtn = card.querySelector('.bobo-tech-core-btn') as HTMLButtonElement;
      coreBtn.addEventListener('click', () => {
        const res = state.upgradeBoboTechBranch(branchId, 'core');
        if (res.upgraded) {
          sound.playTechUpgradeChime();
          spawnMenuUpgradeBurst(coreBtn, `${spec.name} Lv.${res.newLevel}!`, spec.accentColor);
          refreshUpgradeUI();
          renderMainMenu();
        }
      });

      const goldBtn = card.querySelector('.bobo-tech-gold-btn') as HTMLButtonElement;
      goldBtn.addEventListener('click', () => {
        const res = state.upgradeBoboTechBranch(branchId, 'gold');
        if (res.upgraded) {
          sound.playTechUpgradeChime();
          spawnMenuUpgradeBurst(goldBtn, `${spec.name} Lv.${res.newLevel}!`, spec.accentColor);
          refreshUpgradeUI();
          renderMainMenu();
        }
      });

      boboTechTreeGrid.appendChild(card);
    });
  }

  // Render MC-7 Leader Tactical Sub-Weapon Workbench (3 Mods, Lv.1-5, Equip + Upgrade)
  const equippedSwSpec = state.getSubWeaponSpec();
  const equippedSwLvl = state.getSubWeaponLevel();
  if (subweaponEquippedPill) {
    subweaponEquippedPill.innerHTML = `${equippedSwSpec.inlineIcon} 当前挂载：${equippedSwSpec.name} Lv.${equippedSwLvl} [V]`;
  }
  if (subweaponWorkbenchStats) {
    subweaponWorkbenchStats.innerHTML = `${UI_ART.gearTournament} 奖杯 ${state.tournamentTrophies} · 副武器累计施放 ${state.totalSubWeaponCasts} 次`;
  }
  if (tacticalSubweaponGrid) {
    tacticalSubweaponGrid.innerHTML = '';
    const swBgMap: Record<TacticalSubWeaponId, string> = {
      electro_net: 'radial-gradient(circle, #67e8f9 0%, #0369a1 100%)',
      syrup_bubble: 'radial-gradient(circle, #f9a8d4 0%, #be185d 100%)',
      rally_horn: 'radial-gradient(circle, #fde047 0%, #b45309 100%)',
    };
    TACTICAL_SUBWEAPON_ORDER.forEach((swId) => {
      const spec = TACTICAL_SUBWEAPONS[swId];
      const lvl = state.getSubWeaponLevel(swId);
      const isMax = lvl >= TACTICAL_SUBWEAPON_MAX_LEVEL;
      const isEquipped = state.equippedSubWeapon === swId;
      const upgCost = state.getSubWeaponUpgradeCost(swId);
      const canUpg = !isMax && state.gold >= upgCost;

      const card = document.createElement('div');
      card.className = `finish-card mecha-mod-card subweapon-mod-card subweapon-card owned ${isEquipped ? 'equipped' : ''}`;
      card.dataset.subweaponId = swId;
      card.innerHTML = `
        <div class="finish-card-top">
          <div class="finish-swatch" style="background: ${swBgMap[swId]}">${TACTICAL_SUBWEAPON_ART[swId]}</div>
          <div class="finish-meta">
            <span class="finish-name">${spec.name} Lv.${lvl}/${TACTICAL_SUBWEAPON_MAX_LEVEL}</span>
            <span class="finish-tag" style="color: ${spec.accentColor}">${spec.subtitle}</span>
          </div>
        </div>
        <div class="finish-bonus">${spec.statText(lvl)}</div>
        <div class="finish-hint" title="${spec.desc}">${spec.desc}</div>
        <div class="subweapon-card-actions">
          <button type="button" class="finish-action-btn subwpn-equip-btn ${isEquipped ? 'btn-equipped' : 'btn-equip'}" data-subwpn-equip="${swId}">
            ${isEquipped ? `${UI_ART.check} 已挂载 [V]` : '挂载出战'}
          </button>
          <button type="button" class="finish-action-btn subwpn-upg-btn ${isMax ? 'btn-equipped' : 'btn-buy'}" data-subwpn-upgrade="${swId}" ${!canUpg ? 'disabled' : ''}>
            ${isMax ? `${UI_ART.check} MAX` : `${UI_ART.coin} ${upgCost.toLocaleString()} 升Lv.${lvl + 1}`}
          </button>
        </div>
      `;

      const equipBtn = card.querySelector('.subwpn-equip-btn') as HTMLButtonElement;
      equipBtn.addEventListener('click', () => {
        if (state.equipSubWeapon(swId)) {
          sound.playUpgrade();
          spawnMenuUpgradeBurst(equipBtn, `挂载【${spec.name}】!`, spec.accentColor);
          refreshSubWeaponHUD();
          renderMainMenu();
        }
      });

      const upgBtn = card.querySelector('.subwpn-upg-btn') as HTMLButtonElement;
      upgBtn.addEventListener('click', () => {
        if (state.upgradeSubWeapon(swId)) {
          sound.playUpgrade();
          spawnMenuUpgradeBurst(
            upgBtn,
            `${spec.name} Lv.${state.getSubWeaponLevel(swId)}!`,
            spec.accentColor
          );
          refreshUpgradeUI();
          refreshSubWeaponHUD();
          renderMainMenu();
        }
      });

      tacticalSubweaponGrid.appendChild(card);
    });
  }

  // Render MC-6 Twin-Cannon Steam Mecha Overlord Hangar Workbench
  const overlordSpec = state.getMechaOverlordSpec();
  const mechaMs = state.getMechaMilestoneStatus();
  if (mechaHangarMkPill) {
    mechaHangarMkPill.innerHTML = `${UI_ART.mechaCore} 双管大机偶 · ${overlordSpec.mkLabel}`;
  }
  if (mechaHangarStats) {
    mechaHangarStats.innerHTML = `${UI_ART.mechaOverlord} 降临 ${state.totalMechaSummons} 次 · 重炮轰碎 ${state.totalMechaSmashes}`;
  }
  if (mechaHangarGrid) {
    const coreLvl = state.mechaCoreLevel;
    const coreMax = GameState.MECHA_HANGAR_MAX_LEVEL;
    const coreCost = state.getMechaCoreUpgradeCost();
    const canCore = coreLvl < coreMax && state.gold >= coreCost;

    const canLvl = state.mechaCannonLevel;
    const canMax = GameState.MECHA_HANGAR_MAX_LEVEL;
    const canCost = state.getMechaCannonUpgradeCost();
    const canCannon = canLvl < canMax && state.gold >= canCost;

    const msBtnLabel = mechaMs.allClaimed
      ? `${UI_ART.check} 里程碑全满 (${mechaMs.maxTier}/${mechaMs.maxTier})`
      : mechaMs.canClaim
        ? `${UI_ART.trophy} 领取 +${mechaMs.rewardGold}金 +${mechaMs.rewardShards}碎片`
        : `召唤 ${state.totalMechaSummons}/${mechaMs.nextTargetSummons} 次领奖`;

    mechaHangarGrid.innerHTML = `
      <div class="finish-card mecha-mod-card ${coreLvl >= coreMax ? 'owned equipped' : ''}" data-mecha-mod="core">
        <div class="finish-card-top">
          <div class="finish-swatch" style="background: radial-gradient(circle, #67e8f9 0%, #0369a1 100%)">${UI_ART.mechaCoreArt}</div>
          <div class="finish-meta">
            <span class="finish-name">合体超压炉芯 Lv.${coreLvl}/${coreMax}</span>
            <span class="finish-tag" style="color: #67e8f9">机身生命 +${Math.round((overlordSpec.hpMult - 1) * 100)}% · 开局充能 ${overlordSpec.startingCharge}%</span>
          </div>
        </div>
        <div class="finish-bonus">每级提升大机偶机身 +12% · 初始充能 +4%</div>
        <button type="button" id="btn-upg-mecha-core" class="finish-action-btn ${coreLvl >= coreMax ? 'btn-equipped' : 'btn-buy'}" ${!canCore ? 'disabled' : ''}>
          ${coreLvl >= coreMax ? `${UI_ART.check} MAX 满级` : `${UI_ART.coin} ${coreCost.toLocaleString()} 升级炉芯`}
        </button>
      </div>
      <div class="finish-card mecha-mod-card ${canLvl >= canMax ? 'owned equipped' : ''}" data-mecha-mod="cannon">
        <div class="finish-card-top">
          <div class="finish-swatch" style="background: radial-gradient(circle, #fde047 0%, #b45309 100%)">${UI_ART.mechaOverlordArt}</div>
          <div class="finish-meta">
            <span class="finish-name">双联重炮膛线 Lv.${canLvl}/${canMax}</span>
            <span class="finish-tag" style="color: #fde047">重炮伤害 +${Math.round((overlordSpec.shellDmgMult - 1) * 100)}% · 齐射 ${overlordSpec.volleyInterval}s</span>
          </div>
        </div>
        <div class="finish-bonus">每级提升双联重炮威力 +12% · 缩短装填间隔</div>
        <button type="button" id="btn-upg-mecha-cannon" class="finish-action-btn ${canLvl >= canMax ? 'btn-equipped' : 'btn-buy'}" ${!canCannon ? 'disabled' : ''}>
          ${canLvl >= canMax ? `${UI_ART.check} MAX 满级` : `${UI_ART.coin} ${canCost.toLocaleString()} 强化重炮`}
        </button>
      </div>
      <div class="finish-card mecha-mod-card ${mechaMs.canClaim ? 'owned' : ''} ${mechaMs.allClaimed ? 'equipped' : ''}" data-mecha-mod="milestone">
        <div class="finish-card-top">
          <div class="finish-swatch" style="background: radial-gradient(circle, #f5d0fe 0%, #7e22ce 100%)">${UI_ART.mechaOverlordArt}</div>
          <div class="finish-meta">
            <span class="finish-name">大机偶登场勋章 (${mechaMs.tier}/${mechaMs.maxTier})</span>
            <span class="finish-tag" style="color: #f0abfc">合体增幅 +${Math.round(overlordSpec.fusionPerUnitBonus * 100)}%/兵 · 永久全阶+10%</span>
          </div>
        </div>
        <div class="finish-bonus">累计召唤达 1 / 3 / 6 / 10 次解锁超频赏金与碎片</div>
        <button type="button" id="btn-claim-mecha-milestone" class="finish-action-btn ${mechaMs.allClaimed ? 'btn-equipped' : mechaMs.canClaim ? 'btn-equip' : 'btn-buy'}" ${!mechaMs.canClaim ? 'disabled' : ''}>
          ${msBtnLabel}
        </button>
      </div>
    `;

    const btnCore = document.getElementById('btn-upg-mecha-core') as HTMLButtonElement | null;
    btnCore?.addEventListener('click', () => {
      if (state.upgradeMechaCore()) {
        sound.playUpgrade();
        spawnMenuUpgradeBurst(btnCore, `合体炉芯 Lv.${state.mechaCoreLevel}!`, '#38bdf8');
        refreshUpgradeUI();
        renderMainMenu();
      }
    });

    const btnCannon = document.getElementById('btn-upg-mecha-cannon') as HTMLButtonElement | null;
    btnCannon?.addEventListener('click', () => {
      if (state.upgradeMechaCannon()) {
        sound.playUpgrade();
        spawnMenuUpgradeBurst(btnCannon, `双联重炮 Lv.${state.mechaCannonLevel}!`, '#fbbf24');
        refreshUpgradeUI();
        renderMainMenu();
      }
    });

    const btnMs = document.getElementById('btn-claim-mecha-milestone') as HTMLButtonElement | null;
    btnMs?.addEventListener('click', () => {
      const claim = state.claimMechaMilestone();
      if (claim.claimed) {
        sound.playUpgrade();
        spawnMenuUpgradeBurst(
          btnMs,
          `大机偶勋章 +${claim.goldAwarded}金 +${claim.shardsAwarded}碎片!`,
          '#e879f9'
        );
        refreshUpgradeUI();
        renderMainMenu();
      }
    });
  }

  // Render Out-of-Match Base Attribute Upgrades
  if (metaUpgradesGrid) {
    metaUpgradesGrid.innerHTML = '';
    META_UPGRADES.forEach((u, idx) => {
      const lvl = state.getMetaLevel(u.id);
      const isMax = lvl >= u.maxLevel;
      const cost = state.getMetaUpgradeCost(u.id);
      const canAfford = !isMax && state.gold >= cost;

      const fullStatText = u.statPerLevelText(lvl);
      const shortStatText = fullStatText.replace('当前 ', '').replace('每级', '').replace(')', '/级)');
      const progressPct = Math.min(100, Math.round((lvl / Math.max(1, u.maxLevel)) * 100));
      const card = document.createElement('div');
      card.className = `meta-card ${isMax ? 'is-max' : ''} ${isKbdNavActive && idx === selectedMetaIndex ? 'kbd-focused' : ''}`;
      card.style.setProperty('--stagger-i', `${idx}`);
      card.innerHTML = `
        <div class="meta-card-top">
          <div class="meta-portrait-well">
            <span class="meta-lvl">Lv.${lvl}</span>
            <span class="meta-icon">${u.icon}</span>
          </div>
          <div class="meta-info">
            <div class="meta-title-row">
              <strong>${u.name}</strong>
            </div>
            <div class="meta-desc">${u.desc}</div>
            <div class="meta-progress-track" title="等级进度 ${lvl} / ${u.maxLevel}">
              <div class="meta-progress-fill" style="width: ${progressPct}%"></div>
              <span class="meta-progress-text">${lvl} / ${u.maxLevel}</span>
            </div>
            <div class="meta-cur">
              <span class="desktop-only-text">${fullStatText}</span>
              <span class="mobile-only-text">${shortStatText}</span>
            </div>
          </div>
        </div>
        <button type="button" class="meta-buy-btn" ${!canAfford ? 'disabled' : ''}>
          ${isMax ? `${UI_ART.check} MAX 满级` : `${UI_ART.coin} ${cost.toLocaleString()}<span class="desktop-only-text"> 升级</span><kbd class="kbd-hint">${idx + 1}</kbd>`}
        </button>
      `;

      const buyBtn = card.querySelector('.meta-buy-btn') as HTMLButtonElement;
      buyBtn.addEventListener('click', () => {
        selectedMetaIndex = idx;
        if (state.buyMetaUpgrade(u.id as MetaUpgradeId)) {
          sound.playUpgrade();
          spawnMenuUpgradeBurst(buyBtn, `${u.name} Lv.${state.getMetaLevel(u.id)}!`, '#48ad29');
          refreshUpgradeUI();
          renderMainMenu();
        }
      });

      metaUpgradesGrid.appendChild(card);
    });
  }

  // Render MC-5 Bobo Squad Surface Material Finish Workbench
  if (squadLiveryActivePill) {
    squadLiveryActivePill.innerHTML = `${UI_ART.sparkle} ${skin.name} × ${finish.name}`;
  }
  if (squadFinishResources) {
    squadFinishResources.innerHTML = `${UI_ART.shard} 碎片 ${state.getTotalSkinShards()} · ${UI_ART.escortCart} 破障 ${state.totalBarricadesBroken} · 通关 ${state.escortClears}`;
  }
  if (squadFinishGrid) {
    squadFinishGrid.innerHTML = '';
    SQUAD_FINISH_CATALOG.forEach((f) => {
      const check = state.canUnlockFinish(f.id);
      const isEquipped = state.equippedFinish === f.id;
      const artHtml = SQUAD_FINISH_ART[f.id] || UI_ART.palette;
      let btnLabel = '';
      if (isEquipped) {
        btnLabel = `${UI_ART.check} 使用中`;
      } else if (check.isOwned) {
        btnLabel = `应用材质`;
      } else if (check.milestoneFree) {
        btnLabel = `${UI_ART.trophy} 里程碑免费领`;
      } else if (f.costShards > 0) {
        const compactG = f.costGold >= 1000 ? `${(f.costGold / 1000).toFixed(1).replace(/\.0$/, '')}k` : `${f.costGold}`;
        btnLabel = `${UI_ART.coin}${compactG} + ${UI_ART.shard}${f.costShards}`;
      } else {
        const compactG = f.costGold >= 1000 ? `${(f.costGold / 1000).toFixed(1).replace(/\.0$/, '')}k` : `${f.costGold}`;
        btnLabel = `${UI_ART.coin} ${compactG} 解锁`;
      }

      const fCard = document.createElement('div');
      fCard.className = `finish-card ${check.isOwned ? 'owned' : ''} ${isEquipped ? 'equipped' : ''}`;
      fCard.dataset.finishId = f.id;
      fCard.title = `${f.desc}（${f.milestoneHint}）`;
      fCard.innerHTML = `
        <div class="finish-card-top">
          <div class="finish-swatch" style="background: ${f.previewGradient}">${artHtml}</div>
          <div class="finish-meta">
            <span class="finish-name">${f.name}</span>
            <span class="finish-tag" style="color: ${f.badgeColor}">${f.tag}</span>
          </div>
        </div>
        <div class="finish-bonus">${f.bonusText}</div>
        <div class="finish-hint">${f.milestoneHint}</div>
        <button type="button" class="finish-action-btn ${isEquipped ? 'btn-equipped' : check.isOwned ? 'btn-equip' : 'btn-buy'}" ${!check.isOwned && !check.canUnlock ? 'disabled' : ''}>
          ${btnLabel}
        </button>
      `;

      const fBtn = fCard.querySelector('.finish-action-btn') as HTMLButtonElement;
      fBtn.addEventListener('click', () => {
        const res = state.unlockOrEquipFinish(f.id as SquadFinishId);
        if (res === 'unlocked' || res === 'equipped') {
          sound.playUpgrade();
          spawnMenuUpgradeBurst(
            fBtn,
            res === 'unlocked' ? `解锁材质【${f.name}】!` : `已换装【${f.name}】`,
            f.badgeColor
          );
          world.applySkin(state.getEquippedSkin());
          refreshUpgradeUI();
          renderMainMenu();
        }
      });
      squadFinishGrid.appendChild(fCard);
    });
  }

  // Render Candy Armory Skins (with C -> B -> A -> S -> SS -> SSS Shard Ascension)
  if (skinsShopGrid) {
    skinsShopGrid.innerHTML = '';
    SKINS_CATALOG.forEach((s, idx) => {
      const isOwned = state.ownedSkins.includes(s.id);
      const isEquipped = state.equippedSkin === s.id;
      const canBuy = isOwned || state.gold >= s.cost;
      const asc = state.canAscendSkin(s.id);
      const curRank = asc.currentRank;
      const nextRank = asc.nextRank;
      const pct = asc.isMaxRank
        ? 100
        : Math.min(100, Math.round((asc.currentShards / Math.max(1, asc.requiredShards)) * 100));

      const bonusLine = isOwned
        ? nextRank
          ? `${s.statLabel} ${s.statValueAtRank(curRank.index)}→${s.statValueAtRank(nextRank.index)}`
          : `${UI_ART.crown} ${s.statLabel} ${s.statValueAtRank(curRank.index)} (满阶)`
        : `${s.statLabel} ${s.statValueAtRank(0)}~${s.statValueAtRank(5)}`;

      const shardSectionHtml = isOwned
        ? `
          <div class="skin-shard-box">
            <div class="skin-shard-row">
              <span class="skin-shard-count ${asc.isMaxRank || asc.hasEnoughShards ? 'is-ready' : ''}">
                ${UI_ART.shard} ${asc.isMaxRank ? `余 ${asc.currentShards}` : `${asc.currentShards}/${asc.requiredShards}`}
              </span>
              <strong class="skin-shard-cost ${asc.isMaxRank ? 'is-max' : asc.hasEnoughGold ? 'is-ok' : 'is-short'}">
                ${asc.isMaxRank ? `${UI_ART.crown} SSS满阶` : `${UI_ART.coin} ${asc.requiredGold.toLocaleString()}`}
              </strong>
            </div>
            <div class="skin-shard-track">
              <div class="skin-shard-fill" style="width: ${pct}%; background: ${s.previewGradient}"></div>
            </div>
          </div>
        `
        : '';

      const compactCost =
        s.cost >= 1000 ? `${(s.cost / 1000).toFixed(1).replace(/\.0$/, '')}k` : `${s.cost}`;
      const ascendBtnHtml =
        isOwned && !asc.isMaxRank
          ? `<button type="button" class="skin-ascend-btn ${asc.ok ? 'ready' : ''}" ${!asc.ok ? 'disabled' : ''}>
              ${UI_ART.arrowUp} <span class="desktop-only-text">升 </span>${nextRank?.tier}阶<kbd class="kbd-hint">U</kbd>
            </button>`
          : '';

      const card = document.createElement('div');
      card.className = `skin-card ${isEquipped ? 'equipped' : ''} ${isOwned ? 'owned' : ''} ${isKbdNavActive && idx === selectedSkinIndex ? 'kbd-focused' : ''}`;
      card.style.setProperty('--stagger-i', `${idx}`);
      card.title = s.desc;
      const skinArtHtml = SKIN_CARD_ART[s.id as SkinId] || '';
      card.innerHTML = `
        <div class="skin-swatch" style="background: ${s.previewGradient}">
          <span class="skin-tag" style="color: ${s.badgeColor}">${s.tag}</span>
          <div class="skin-art-portrait">${skinArtHtml}</div>
          <span class="skin-rank-badge" style="color: ${curRank.color}; background: ${curRank.bg}">
            ${isOwned ? `${curRank.tier} 阶` : '未解锁'}
          </span>
        </div>
        <div class="skin-body">
          <div class="skin-title">${s.name}</div>
          <div class="skin-bonus">${bonusLine}</div>
          ${shardSectionHtml}
        </div>
        <div class="skin-actions-row">
          <button type="button" class="skin-action-btn ${isEquipped ? 'btn-equipped' : isOwned ? 'btn-equip' : 'btn-buy'}" ${!canBuy && !isOwned ? 'disabled' : ''}>
            ${
              isEquipped
                ? `${UI_ART.check} <span class="desktop-only-text">已</span>穿戴<kbd class="kbd-hint">${idx + 1}</kbd>`
                : isOwned
                  ? `穿戴<kbd class="kbd-hint">${idx + 1}</kbd>`
                  : `<span class="desktop-only-text">${UI_ART.coin} ${s.cost.toLocaleString()} 解锁</span><span class="mobile-only-text">${UI_ART.coin} ${compactCost}</span><kbd class="kbd-hint">${idx + 1}</kbd>`
            }
          </button>
          ${ascendBtnHtml}
        </div>
      `;

      const actionBtn = card.querySelector('.skin-action-btn') as HTMLButtonElement;
      actionBtn.addEventListener('click', () => {
        selectedSkinIndex = idx;
        const res = state.buyOrEquipSkin(s.id as SkinId);
        if (res === 'bought' || res === 'equipped') {
          sound.playUpgrade();
          spawnMenuUpgradeBurst(
            actionBtn,
            res === 'bought' ? `解锁【${s.name}】!` : `已穿戴【${s.name}】`,
            s.badgeColor
          );
          world.applySkin(state.getEquippedSkin());
          refreshUpgradeUI();
          renderMainMenu();
        }
      });

      const ascendBtn = card.querySelector('.skin-ascend-btn') as HTMLButtonElement | null;
      if (ascendBtn) {
        ascendBtn.addEventListener('click', () => {
          selectedSkinIndex = idx;
          if (state.ascendSkin(s.id as SkinId)) {
            sound.playVictoryFanfare();
            const newRank = state.getSkinRankSpec(s.id as SkinId);
            spawnMenuUpgradeBurst(ascendBtn, `${s.name} 升至 ${newRank.tier} 阶!`, '#f59e0b');
            refreshUpgradeUI();
            renderMainMenu();
            showBanner(`✨ 【${s.name}】升至 ${newRank.tier} 阶！`, s.bonusTextAtRank(newRank.index));
          }
        });
      }

      skinsShopGrid.appendChild(card);
    });
  }

  // Render Top 10 Commander Leaderboard (Peak Stage vs Active Playtime) on Main Menu
  if (btnLbPeak) btnLbPeak.classList.toggle('active', leaderboardMode === 'peak');
  if (btnLbActive) btnLbActive.classList.toggle('active', leaderboardMode === 'active');
  if (btnShareGame) {
    const canBonus = state.canClaimDailyShareBonus();
    btnShareGame.innerHTML = `${canBonus ? `${UI_ART.gift} 分享` : `${UI_ART.share} 分享`}`;
    btnShareGame.classList.toggle('has-bonus', canBonus);
  }

  if (leaderboardListEl) {
    const isActiveMode = leaderboardMode === 'active';
    const { top10, selfRank, hasReal } = isActiveMode
      ? state.getTop10ActiveLeaderboard()
      : state.getTop10Leaderboard();
    if (leaderboardSelfStatusEl) {
      const isRanked = Boolean(selfRank && selfRank <= 10);
      const rankStr = isRanked ? `#${selfRank}` : '未上榜';
      const metricStr = isActiveMode
        ? state.formatPlayTime(state.weeklyPlayTimeSeconds)
        : `${state.weeklyBestStage} 关`;
      const resetHint = state.getWeeklyResetCountdownText();
      leaderboardSelfStatusEl.innerHTML =
        `<span class="lb-self-name">${escapeHtml(state.playerName)}</span>` +
        `<span class="lb-self-rank-pill ${isRanked ? 'is-ranked' : ''}">${rankStr}</span>` +
        `<span class="lb-self-metric-pill">${metricStr}</span>` +
        `<span class="lb-self-reset">${resetHint}</span>`;
    }
    if (btnEditName) {
      const canAffordRename = state.gold >= RENAME_GOLD_COST;
      btnEditName.classList.toggle('is-unaffordable', !canAffordRename);
      btnEditName.title = canAffordRename
        ? '花费 100,000 金币修改昵称 [N]'
        : `改名需 100,000 金币（还差 ${Math.max(0, RENAME_GOLD_COST - Math.floor(state.gold)).toLocaleString()} 金币）`;
    }

    leaderboardListEl.innerHTML = '';
    if (!hasReal) {
      const hint = document.createElement('div');
      hint.className = 'lb-empty-hint';
      hint.textContent = '本周还没有真人上榜，打一关就是第一名';
      leaderboardListEl.appendChild(hint);
    }
    top10.forEach((entry, idx) => {
      // 陪练（机器人）不占名次：名次列留空，行内挂「陪练」小标
      const rank = entry.rank ?? 0;
      const rankBadge =
        rank === 1
          ? UI_ART.medal1
          : rank === 2
            ? UI_ART.medal2
            : rank === 3
              ? UI_ART.medal3
              : rank > 0
                ? `${rank}`
                : '–';
      const roleTag = entry.isBot
        ? '<span class="lb-role-tag lb-role-bot">陪练</span>'
        : entry.isSelf
          ? '<span class="lb-role-tag lb-role-self">我</span>'
          : entry.publicId
            ? `<button type="button" class="lb-report-btn" data-report-id="${escapeHtml(entry.publicId)}" data-report-name="${escapeHtml(entry.name)}" title="举报昵称" aria-label="举报昵称">⚑</button>`
            : '';
      const row = document.createElement('div');
      row.className = `lb-row ${isActiveMode ? 'lb-active-mode' : ''} ${rank >= 1 && rank <= 3 ? `lb-top-${rank}` : ''} ${entry.isSelf ? 'lb-self-row' : ''} ${entry.isBot ? 'lb-bot-row' : ''}`;
      row.style.setProperty('--stagger-i', `${idx}`);
      const lbRaceOrder = ['swarm', 'titan', 'gate', 'plasma', 'orbital', 'bastion', 'tycoon'];
      const avatarRace = lbRaceOrder[idx % lbRaceOrder.length];
      const avatarHtml = `<div class="lb-avatar-box"><img class="art-icon-img lb-avatar-img" src="${raceThumbUrl(avatarRace)}" alt="" loading="${ART_LOADING}" draggable="false" /></div>`;
      if (isActiveMode) {
        const timeStr = state.formatPlayTime(entry.playTimeSeconds);
        row.innerHTML = `
          <span class="lb-rank">${rankBadge}</span>
          ${avatarHtml}
          <div class="lb-player">
            <span class="lb-name">${escapeHtml(entry.name)}</span>${roleTag}
          </div>
          <strong class="lb-time">${UI_ART.clock} ${timeStr}</strong>
        `;
      } else {
        row.innerHTML = `
          <span class="lb-rank">${rankBadge}</span>
          ${avatarHtml}
          <div class="lb-player">
            <span class="lb-name">${escapeHtml(entry.name)}</span>${roleTag}
          </div>
          <strong class="lb-stage">${UI_ART.trophy} ${entry.bestStage} 关</strong>
        `;
      }
      leaderboardListEl.appendChild(row);
    });
  }
}

// Percentage coordinates (x%, y%) for each of the 7 branches' 4 tiers (T1 -> T2 -> T3 -> T4 Crown),
// forming an organic arched tree canopy growing from the central Root Core at (50%, 88.2%).
const TREE_BRANCH_LAYOUT: Record<string, Array<{ x: number; y: number }>> = {
  swarm: [
    { x: 10.5, y: 74.0 },
    { x: 8.6, y: 56.5 },
    { x: 7.8, y: 38.8 },
    { x: 7.6, y: 20.8 },
  ],
  titan: [
    { x: 24.2, y: 72.5 },
    { x: 22.0, y: 54.8 },
    { x: 21.4, y: 37.0 },
    { x: 21.4, y: 19.0 },
  ],
  orbital: [
    { x: 37.2, y: 71.2 },
    { x: 36.0, y: 53.2 },
    { x: 35.7, y: 35.4 },
    { x: 35.7, y: 17.4 },
  ],
  gate: [
    { x: 50.0, y: 70.2 },
    { x: 50.0, y: 52.2 },
    { x: 50.0, y: 34.2 },
    { x: 50.0, y: 16.2 },
  ],
  plasma: [
    { x: 62.8, y: 71.2 },
    { x: 64.0, y: 53.2 },
    { x: 64.3, y: 35.4 },
    { x: 64.3, y: 17.4 },
  ],
  bastion: [
    { x: 75.8, y: 72.5 },
    { x: 78.0, y: 54.8 },
    { x: 78.6, y: 37.0 },
    { x: 78.6, y: 19.0 },
  ],
  tycoon: [
    { x: 89.5, y: 74.0 },
    { x: 91.4, y: 56.5 },
    { x: 92.2, y: 38.8 },
    { x: 92.4, y: 20.8 },
  ],
};

function renderSkillInspectorBar(): void {
  if (!skillInspectorBarEl) return;
  const node = ALL_SKILL_NODES.find((n) => n.id === selectedSkillNodeId) || ALL_SKILL_NODES[0];
  const branch = SKILL_TREE_BRANCHES.find((b) => b.id === node.branchId) || SKILL_TREE_BRANCHES[0];
  const activeRace = state.getActiveRaceBranch();
  const isBranchActive = activeRace.id === branch.id;
  const rank = state.getSavedSkillNodeRank(node.id);
  const isMax = rank >= node.maxRank;
  const check = state.canUpgradeSkillNode(node.id);
  const svgIcon = SKILL_NODE_SVGS[node.id] || '';

  const statLine =
    rank === 0
      ? node.statText(1)
      : isMax
        ? node.statText(rank)
        : `${node.statText(rank)} → Lv.${rank + 1}: ${node.statText(rank + 1)}`;

  const shortCost =
    check.goldCost >= 1000
      ? `${(check.goldCost / 1000).toFixed(1).replace(/\.0$/, '')}k`
      : `${check.goldCost}`;

  let btnLabel = `${UI_ART.check} 已满级`;
  if (!isMax) {
    if (check.ok) {
      btnLabel = `${UI_ART.arrowUp} 升级 (${node.pointCost}${UI_ART.star} + ${shortCost}${UI_ART.coin})`;
    } else if (check.reason.includes('天赋点不足')) {
      btnLabel = `${UI_ART.lock} 需 ${node.pointCost} ${UI_ART.star} 天赋星`;
    } else if (check.reason.includes('点数不足')) {
      btnLabel = `${UI_ART.lock} 需 ${shortCost} ${UI_ART.coin} 金币`;
    } else {
      btnLabel = `${UI_ART.lock} ${check.reason}`;
    }
  }

  skillInspectorBarEl.style.setProperty('--inspector-color', branch.accentColor);
  skillInspectorBarEl.style.setProperty('--branch-color', branch.accentColor);
  skillInspectorBarEl.innerHTML = `
    <div class="kr-parchment-sheet">
      <div class="kr-parchment-top">
        <div class="sib-icon-box ${rank > 0 ? 'is-unlocked' : ''}" style="--branch-color: ${branch.accentColor}">
          ${svgIcon}
          ${isMax ? `<span class="kr-check-badge">${UI_ART.check}</span>` : ''}
        </div>
        <div class="kr-parchment-head-meta">
          <div class="kr-cost-star-tag" title="每级消耗天赋星数">
            ${UI_ART.star}
            <strong>${node.pointCost}</strong>
          </div>
          <span class="sib-tier-tag ${node.isKeystone ? 'is-keystone' : ''}">
            ${node.isKeystone ? `${UI_ART.crown} 终极` : `T${node.tier}`} · Lv.${rank}/${node.maxRank}
          </span>
        </div>
      </div>

      <div class="kr-parchment-body">
        <div class="kr-title-line">
          <strong class="sib-name">${node.name}</strong>
          <span class="sib-branch-tag" style="color: ${branch.accentColor}; border-color: ${branch.accentColor}55">
            ${branch.icon} ${branch.raceName}${isBranchActive ? ' · 生效中' : ' · 选中该族生效'}
          </span>
        </div>
        <p class="sib-desc">${node.desc}</p>
        <div class="sib-stat">${statLine}</div>
      </div>

      <button
        type="button"
        id="btn-inspector-upgrade"
        class="sib-upgrade-btn ${isMax ? 'maxed' : ''} ${node.isKeystone ? 'keystone-btn' : ''}"
        style="--branch-color: ${branch.accentColor}"
        ${!check.ok && !isMax ? 'disabled' : ''}
      >
        ${btnLabel}
      </button>
    </div>
  `;

  const upgBtn = document.getElementById('btn-inspector-upgrade') as HTMLButtonElement | null;
  if (upgBtn && !isMax) {
    upgBtn.addEventListener('click', () => {
      if (state.upgradeSkillNode(node.id)) {
        sound.playUpgrade();
        spawnMenuUpgradeBurst(
          upgBtn,
          `${node.name} Lv.${state.getSavedSkillNodeRank(node.id)}!`,
          branch.accentColor
        );
        world.applySkin(state.getEquippedSkin());
        refreshMechaUI();
        refreshUpgradeUI();
        renderMainMenu();
        renderActiveBuffsBar();
      }
    });
  }
}

function renderSkillTreePanel(): void {
  const avail = state.getAvailableTalentPoints();
  const spent = state.getSpentTalentPoints();
  const activeRace = state.getActiveRaceBranch();
  const activeRacePts = state.getBranchSpentPoints(activeRace.id);

  const fmtCompactGold = (val: number): string => {
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    if (val >= 1_000) return `${Math.round(val / 1_000)}k`;
    return `${val}`;
  };
  if (skillAvailablePointsEl) {
    skillAvailablePointsEl.textContent = `${avail}`;
  }
  if (skillActiveKeystoneEl) {
    skillActiveKeystoneEl.innerHTML = `${activeRace.icon} ${activeRace.raceName} · <span class="desktop-only-text">已生效 </span>${activeRacePts}/16`;
  }
  if (btnBuyTalent) {
    const buyCheck = state.canBuyBonusTalentPoint();
    const buyCost = state.getBonusTalentPointCost();
    const shortBuyCost = fmtCompactGold(buyCost);
    btnBuyTalent.innerHTML = `+${UI_ART.star} <small>${shortBuyCost}${UI_ART.coin}</small>`;
    btnBuyTalent.disabled = !buyCheck.ok;
    btnBuyTalent.title = `${buyCheck.reason} [B]`;
  }
  if (btnResetSkills) {
    const resetCost = state.getResetSkillTreeCost();
    const baseCost = state.getBaseResetSkillTreeCost();
    const discount = state.getResetSkillTreeDiscount();
    const shortReset =
      resetCost === 0
        ? `${UI_ART.refresh} 免费`
        : `${UI_ART.refresh} ${fmtCompactGold(resetCost)}`;
    btnResetSkills.innerHTML = shortReset;
    btnResetSkills.title =
      spent <= 0
        ? `尚未投入天赋点（当前洗点价格 ${resetCost.toLocaleString()} 金币，每玩1关减免 1,000 金币）`
        : `支付 ${resetCost.toLocaleString()} 金币重置全部已点技能并返还 ${spent} 点天赋（原价 ${baseCost.toLocaleString()} 金币，已减免 ${discount.toLocaleString()} 金币）[R]`;
    btnResetSkills.disabled = spent <= 0 || state.gold < resetCost;
  }

  if (!skillTreeCanvasEl) return;
  skillTreeCanvasEl.innerHTML = '';

  const boardGrid = document.createElement('div');
  boardGrid.className = 'kr-matrix-grid';

  for (let bIdx = 0; bIdx < SKILL_TREE_BRANCHES.length; bIdx++) {
    const branch = SKILL_TREE_BRANCHES[bIdx];
    const isActiveRace = activeRace.id === branch.id;
    const branchPts = state.getBranchSpentPoints(branch.id);

    const colEl = document.createElement('div');
    colEl.className = `kr-branch-col ${isActiveRace ? 'is-active-branch' : ''}`;
    colEl.style.setProperty('--branch-color', branch.accentColor);
    colEl.style.setProperty('--stagger-i', `${bIdx}`);

    // Render 4 tiers from Top (T4 Crown, index 3) down to Bottom (T1 Base, index 0)
    const nodesTopToBottom = [...branch.nodes].reverse();
    nodesTopToBottom.forEach((node) => {
      const rank = state.getSavedSkillNodeRank(node.id);
      const isMax = rank >= node.maxRank;
      const check = state.canUpgradeSkillNode(node.id);
      const isSelected = selectedSkillNodeId === node.id;

      const stateClass =
        rank > 0
          ? isMax
            ? 'unlocked maxed'
            : 'unlocked'
          : check.ok
            ? 'available'
            : 'locked';

      const nodeBtn = document.createElement('button');
      nodeBtn.type = 'button';
      nodeBtn.className = `tree-node tier-${node.tier} ${node.isKeystone ? 'keystone' : ''} ${stateClass} ${isSelected ? 'selected' : ''}`;
      nodeBtn.style.setProperty('--branch-color', branch.accentColor);
      nodeBtn.title = `${branch.raceName} · ${node.name} (Lv.${rank}/${node.maxRank}${isActiveRace ? ' · 当前角色生效中' : ' · 切换至此角色后生效'})`;

      const svgArt = SKILL_NODE_SVGS[node.id] || '';
      const badgeLabel = isMax
        ? `${UI_ART.star}${rank}`
        : rank > 0
          ? `${UI_ART.star}${rank}/${node.maxRank}`
          : `${UI_ART.star}${node.maxRank}`;

      nodeBtn.innerHTML = `
        <div class="tree-node-medallion">
          ${svgArt}
          <span class="tree-node-rank">${badgeLabel}</span>
        </div>
      `;

      nodeBtn.addEventListener('pointerenter', (ev) => {
        if (ev.pointerType === 'mouse' && selectedSkillNodeId !== node.id) {
          selectedSkillNodeId = node.id;
          skillTreeCanvasEl
            .querySelectorAll('.tree-node')
            .forEach((el) => el.classList.remove('selected'));
          nodeBtn.classList.add('selected');
          renderSkillInspectorBar();
        }
      });

      nodeBtn.addEventListener('click', () => {
        const wasSelected = selectedSkillNodeId === node.id;
        selectedSkillNodeId = node.id;
        if (wasSelected && !isMax && state.canUpgradeSkillNode(node.id).ok) {
          if (state.upgradeSkillNode(node.id)) {
            sound.playUpgrade();
            spawnMenuUpgradeBurst(
              nodeBtn,
              `${node.name} Lv.${state.getSavedSkillNodeRank(node.id)}!`,
              branch.accentColor
            );
            world.applySkin(state.getEquippedSkin());
            refreshMechaUI();
            refreshUpgradeUI();
            renderMainMenu();
            renderActiveBuffsBar();
            return;
          }
        }
        renderMainMenu();
      });

      colEl.appendChild(nodeBtn);
    });

    // Bottom Race Pedestal Shield Emblem (click to freely switch active character!)
    const pedestalBtn = document.createElement('button');
    pedestalBtn.type = 'button';
    pedestalBtn.className = `kr-branch-pedestal ${isActiveRace ? 'active' : ''} ${branchPts > 0 ? 'has-points' : ''}`;
    pedestalBtn.style.setProperty('--branch-color', branch.accentColor);
    pedestalBtn.title = `切换上阵角色：${branch.raceName} (${branchPts}/16 点技能${isActiveRace ? '生效中' : '待命'})`;
    pedestalBtn.innerHTML = `
      <span class="kr-pedestal-icon">${RACE_MASCOT_THUMB[branch.id]}</span>
      <span class="kr-pedestal-name">${branch.raceName.slice(0, 2)}</span>
    `;
    pedestalBtn.addEventListener('click', () => {
      selectedSkillNodeId = branch.nodes[0].id;
      if (state.selectRaceBranch(branch.id)) {
        sound.playUpgrade();
        world.applySkin(state.getEquippedSkin());
        refreshMechaUI();
      }
      renderMainMenu();
    });
    colEl.appendChild(pedestalBtn);

    boardGrid.appendChild(colEl);
  }

  skillTreeCanvasEl.appendChild(boardGrid);
  renderSkillInspectorBar();
}

function openTitleScreen(): void {
  if (!titleScreenEl) {
    openMainMenu();
    return;
  }
  isTitleScreenOpen = true;
  isTitleTransitioning = false;
  topToolsDrawer?.classList.add('hidden');
  world.isPaused = true;
  sound.setBgmDanger(0);
  resultModal.classList.add('hidden');
  centerBanner.classList.add('hidden');
  mainMenu.classList.add('hidden');
  if (hudTop) hudTop.style.display = 'none';
  if (hudBottom) hudBottom.style.display = 'none';
  labelsContainer.style.display = 'none';

  const activeRace = state.getActiveRaceBranch();
  if (titleWelcomeTextEl) {
    const best = state.bestStageCleared;
    titleWelcomeTextEl.textContent =
      best > 0
        ? `欢迎归来，${state.playerName} · 最高纪录 第 ${best} 关 · ${activeRace.raceName}待命`
        : `欢迎来到蒸汽工坊，${state.playerName} · 率领 ${activeRace.raceName} 开启首战`;
  }

  titleScreenEl.classList.remove('hidden', 'title-screen-exiting');
  if (titleLoaderBoxEl && titleLoaderFillEl && btnEnterWorkshop) {
    titleLoaderBoxEl.classList.remove('is-done');
    btnEnterWorkshop.classList.remove('is-ready');
    titleLoaderFillEl.style.width = '18%';
    if (titleLoaderLabelEl) {
      titleLoaderLabelEl.textContent = '正在加压蒸汽糖果锅炉...';
    }
    window.setTimeout(() => {
      if (titleLoaderFillEl) titleLoaderFillEl.style.width = '100%';
      if (titleLoaderLabelEl) titleLoaderLabelEl.textContent = '工坊准备就绪 · 100%';
    }, 60);
    window.setTimeout(() => {
      titleLoaderBoxEl.classList.add('is-done');
      btnEnterWorkshop.classList.add('is-ready');
    }, 520);
  }
  void state.syncRemoteLeaderboard(true);
}

function enterWorkshopFromTitle(): void {
  if (!isTitleScreenOpen || isTitleTransitioning) return;
  isTitleTransitioning = true;
  isTitleScreenOpen = false;
  sound.playVictoryFanfare();
  sound.playUpgrade();
  if (btnEnterWorkshop) {
    spawnMenuUpgradeBurst(btnEnterWorkshop, '欢迎进入蒸汽工坊!', '#f59e0b');
  }
  openMainMenu();
  if (titleScreenEl) {
    titleScreenEl.classList.add('title-screen-exiting');
    window.setTimeout(() => {
      titleScreenEl.classList.add('hidden');
      titleScreenEl.classList.remove('title-screen-exiting');
      isTitleTransitioning = false;
    }, 480);
  } else {
    isTitleTransitioning = false;
  }
}

/** 封面出来、页面加载完以后，空闲时先取大厅要看到的图。 */
function warmLobbyArt(): void {
  warmArt([
    artUrl(state.getActiveRaceBranch().icon),
    ...artUrlsIn('#menu-panel-launch img:not([src*="/race_"])'),
    ...[UI_ART.medal1, UI_ART.medal2, UI_ART.medal3, UI_ART.sparkle].map(artUrl),
    ...Object.values(RACE_MASCOT_THUMB).map(artUrl),
  ]);
}

/** 进了大厅再取主战役 HUD 与常见机关标签的图；各模式、工坊、天赋、皮肤页的图等玩家点开才下载。 */
function warmBattleArt(): void {
  warmArt([
    ...artUrlsIn('.hud-top-row img, #top-tools-drawer img, #cannon-mod-hud-badge img, #active-buffs-bar img, .hud-bottom img'),
    ...[UI_ART.barrel, UI_ART.shield, UI_ART.belt, UI_ART.spring, UI_ART.heart, UI_ART.warning, UI_ART.boom].map(artUrl),
  ]);
}

function openMainMenu(): void {
  isTitleScreenOpen = false;
  topToolsDrawer?.classList.add('hidden');
  world.isPaused = true;
  sound.setBgmDanger(0);
  // Reset all in-run temporary upgrades, 3-choice stage buffs, and defeat debuffs upon returning to Main Menu
  state.resetRunProgression();
  world.syncTurretEvolution(false);
  refreshUpgradeUI();
  renderActiveBuffsBar();
  resultModal.classList.add('hidden');
  centerBanner.classList.add('hidden');
  if (hudTop) hudTop.style.display = 'none';
  if (hudBottom) hudBottom.style.display = 'none';
  labelsContainer.style.display = 'none';
  mainMenu.classList.remove('hidden');
  renderMainMenu();
  warmBattleArt();
  void state.syncRemoteLeaderboard(true).then(() => renderMainMenu());
}

function launchBattle(): void {
  topToolsDrawer?.classList.add('hidden');
  pendingBonusHeistStage = 0;
  state.resetRunProgression();
  mainMenu.classList.add('hidden');
  if (hudTop) hudTop.style.display = 'flex';
  if (hudBottom) hudBottom.style.display = 'flex';
  labelsContainer.style.display = 'block';
  world.isPaused = false;
  // Always start a new run from Stage 1 (index 0)
  startLevel(0);
}

function launchEndlessDefense(): void {
  topToolsDrawer?.classList.add('hidden');
  pendingBonusHeistStage = 0;
  state.resetRunProgression();
  mainMenu.classList.add('hidden');
  resultModal.classList.add('hidden');
  if (hudTop) hudTop.style.display = 'flex';
  if (hudBottom) hudBottom.style.display = 'flex';
  labelsContainer.style.display = 'block';
  world.isPaused = false;

  const lvl = generateEndlessDefenseLevel();
  world.loadLevel(lvl);
  if (stageBadge) {
    stageBadge.textContent = `无尽保卫 · 第 1 波`;
  }
  const stagePlaqueSubEl = document.getElementById('stage-plaque-sub');
  if (stagePlaqueSubEl) {
    stagePlaqueSubEl.textContent = lvl.subtitle;
  }
  bossNameEl.innerHTML = `${UI_ART.endlessShield} 失控总锅炉`;
  showBanner(
    `${UI_ART.endlessShield} 无尽工坊保卫战开启！`,
    `${UI_ART.endlessMedal} 挡住抓捕队和大块头 · 冲击个人最佳勋章`
  );
  refreshMechaUI();
  refreshUpgradeUI();
  renderActiveBuffsBar();
}

function startBonusHeist(milestoneStage: number, nextCampaignIdx: number): void {
  topToolsDrawer?.classList.add('hidden');
  pendingBonusHeistStage = 0;
  pendingNextCampaignIdx = Math.max(0, nextCampaignIdx);
  mainMenu.classList.add('hidden');
  resultModal.classList.add('hidden');
  if (hudTop) hudTop.style.display = 'flex';
  if (hudBottom) hudBottom.style.display = 'flex';
  labelsContainer.style.display = 'block';
  world.isPaused = false;

  const lvl = generateCandyVaultBonusLevel(milestoneStage);
  world.loadLevel(lvl);
  if (stageBadge) {
    stageBadge.textContent = `糖果金库 · 25s`;
  }
  const stagePlaqueSubEl = document.getElementById('stage-plaque-sub');
  if (stagePlaqueSubEl) {
    stagePlaqueSubEl.textContent = lvl.subtitle;
  }
  bossNameEl.innerHTML = `${UI_ART.candyVault} 至尊糖果总金库`;
  showBanner(
    `${UI_ART.candyVault} 糖果金库大劫案（25s 暴爽奖励关）`,
    `没有抓捕队干扰！穿过高倍门轰碎 5 座糖果金库塔，爆出金币与时装碎片！`
  );
  refreshMechaUI();
  refreshUpgradeUI();
  renderActiveBuffsBar();
}

function launchPayloadEscort(): void {
  topToolsDrawer?.classList.add('hidden');
  pendingBonusHeistStage = 0;
  state.resetRunProgression();
  mainMenu.classList.add('hidden');
  resultModal.classList.add('hidden');
  if (hudTop) hudTop.style.display = 'flex';
  if (hudBottom) hudBottom.style.display = 'flex';
  labelsContainer.style.display = 'block';
  world.isPaused = false;

  const tier = 1 + Math.min(4, state.escortClears);
  const lvl = generatePayloadEscortLevel(tier);
  world.loadLevel(lvl);
  if (stageBadge) {
    stageBadge.textContent = `花车护送 · 推进 0%`;
  }
  const stagePlaqueSubEl = document.getElementById('stage-plaque-sub');
  if (stagePlaqueSubEl) {
    stagePlaqueSubEl.textContent = lvl.subtitle;
  }
  bossNameEl.innerHTML = `${UI_ART.escortCart} 花车护送进度`;
  showBanner(
    `${UI_ART.escortCart} 蒸汽花车护送发车！`,
    `${UI_ART.barricade} 派遣波波团环绕花车充能超载 · 撞开路障直达黑铁终点站`
  );
  refreshMechaUI();
  refreshUpgradeUI();
  renderActiveBuffsBar();
}

function refreshSubWeaponHUD(): void {
  const spec = state.getSubWeaponSpec();
  const lvl = state.getSubWeaponLevel();
  if (subweaponIcon) {
    subweaponIcon.innerHTML = TACTICAL_SUBWEAPON_HUD_ART[spec.id];
  }
  if (subweaponName) {
    subweaponName.textContent = spec.shortName;
  }
  if (btnTacticalSubweapon) {
    btnTacticalSubweapon.dataset.subweapon = spec.id;
    btnTacticalSubweapon.title = `${spec.name} Lv.${lvl}（${spec.subtitle}）[V键]`;
  }
}

function launchGearTournament(): void {
  topToolsDrawer?.classList.add('hidden');
  pendingBonusHeistStage = 0;
  if (state.pendingTournamentChestStage > 0) {
    state.claimTournamentStreakChest();
  }
  state.resetRunProgression();
  mainMenu.classList.add('hidden');
  resultModal.classList.add('hidden');
  if (hudTop) hudTop.style.display = 'flex';
  if (hudBottom) hudBottom.style.display = 'flex';
  labelsContainer.style.display = 'block';
  world.isPaused = false;

  const stageSpec = state.getTournamentStageSpec();
  const lvl = generateGearTournamentLevel(stageSpec.stage, state.tournamentCupTier);
  world.loadLevel(lvl);
  if (stageBadge) {
    stageBadge.textContent = `${stageSpec.badgeText} (${stageSpec.streakLabel})`;
  }
  const stagePlaqueSubEl = document.getElementById('stage-plaque-sub');
  if (stagePlaqueSubEl) {
    stagePlaqueSubEl.textContent = lvl.subtitle;
  }
  bossNameEl.innerHTML = `${UI_ART.gearTournament} ${lvl.bossName}`;
  showBanner(
    `${UI_ART.gearTournament} ${stageSpec.badgeText} · 连胜倍率 ${stageSpec.streakLabel}`,
    `${lvl.subtitle}`
  );
  refreshMechaUI();
  refreshSubWeaponHUD();
  refreshUpgradeUI();
  renderActiveBuffsBar();
}

function launchColossusRaid(): void {
  topToolsDrawer?.classList.add('hidden');
  pendingBonusHeistStage = 0;
  state.resetRunProgression();
  mainMenu.classList.add('hidden');
  resultModal.classList.add('hidden');
  if (hudTop) hudTop.style.display = 'flex';
  if (hudBottom) hudBottom.style.display = 'flex';
  labelsContainer.style.display = 'block';
  world.isPaused = false;

  const raidSpec = state.getColossusRaidSpec();
  const lvl = generateClockworkColossusRaidLevel(raidSpec.raidTier);
  world.loadLevel(lvl);
  if (stageBadge) {
    stageBadge.textContent = `发条攻坚 · 第 ${raidSpec.raidTier} 阶`;
  }
  const stagePlaqueSubEl = document.getElementById('stage-plaque-sub');
  if (stagePlaqueSubEl) {
    stagePlaqueSubEl.textContent = lvl.subtitle;
  }
  bossNameEl.innerHTML = `${UI_ART.clockworkColossus} ${lvl.bossName}`;
  colossusRaidHudEl?.classList.remove('hidden');
  showBanner(
    `${UI_ART.clockworkColossus} 巨型发条玩具首领攻坚战 · 第 ${raidSpec.raidTier} 阶`,
    `${UI_ART.clockworkCore} 拆解左翼重盾或右翼糖炮，触发 6.0s 瘫痪 2.5x 高倍暴击窗口！`
  );
  refreshMechaUI();
  refreshSubWeaponHUD();
  refreshUpgradeUI();
  renderActiveBuffsBar();
}

function launchAirshipEscort(): void {
  topToolsDrawer?.classList.add('hidden');
  pendingBonusHeistStage = 0;
  state.resetRunProgression();
  mainMenu.classList.add('hidden');
  resultModal.classList.add('hidden');
  if (hudTop) hudTop.style.display = 'flex';
  if (hudBottom) hudBottom.style.display = 'flex';
  labelsContainer.style.display = 'block';
  world.isPaused = false;

  const airSpec = state.getAirshipEscortSpec();
  const lvl = generateAirshipEscortLevel(airSpec.escortTier);
  world.loadLevel(lvl);
  if (stageBadge) {
    stageBadge.textContent = `飞艇护航 · 推进 0%`;
  }
  const stagePlaqueSubEl = document.getElementById('stage-plaque-sub');
  if (stagePlaqueSubEl) {
    stagePlaqueSubEl.textContent = lvl.subtitle;
  }
  bossNameEl.innerHTML = `${UI_ART.airshipEscort} 飞艇护航进度`;
  airshipEscortHudEl?.classList.remove('hidden');
  showBanner(
    `${UI_ART.airshipEscort} 云端飞艇护航战 · 第 ${airSpec.escortTier} 阶`,
    `${UI_ART.airshipWingMedal} 拔除拦截副塔并护卫飞艇充能，投送超级波波空投舱冲破总厂！`
  );
  refreshMechaUI();
  refreshSubWeaponHUD();
  refreshUpgradeUI();
  renderActiveBuffsBar();
}

(window as unknown as Record<string, unknown>).__mc3dLaunchEndless = () => launchEndlessDefense();
(window as unknown as Record<string, unknown>).__mc3dLaunchEscort = () => launchPayloadEscort();
(window as unknown as Record<string, unknown>).__mc3dLaunchTournament = () => launchGearTournament();
(window as unknown as Record<string, unknown>).__mc3dLaunchColossusRaid = () => launchColossusRaid();
function launchCandyTrainRaid(): void {
  topToolsDrawer?.classList.add('hidden');
  pendingBonusHeistStage = 0;
  state.resetRunProgression();
  mainMenu.classList.add('hidden');
  resultModal.classList.add('hidden');
  if (hudTop) hudTop.style.display = 'flex';
  if (hudBottom) hudBottom.style.display = 'flex';
  labelsContainer.style.display = 'block';
  world.isPaused = false;

  const trainSpec = state.getCandyTrainRaidSpec();
  const lvl = generateCandyTrainRaidLevel(trainSpec.raidTier);
  world.loadLevel(lvl);
  lastTrainHudKey = '';
  if (stageBadge) {
    stageBadge.textContent = `糖果列车 · 车厢 ${lvl.candyTrainCars?.length || 6}/${lvl.candyTrainCars?.length || 6}`;
  }
  const stagePlaqueSubEl = document.getElementById('stage-plaque-sub');
  if (stagePlaqueSubEl) {
    stagePlaqueSubEl.textContent = lvl.subtitle;
  }
  bossNameEl.innerHTML = `${UI_ART.candyTrainRaid} 糖果列车耐久`;
  candyTrainHudEl?.classList.remove('hidden');
  const relicSpec = state.getRelicBannerSpec();
  showBanner(
    `${UI_ART.candyTrainRaid} 彩虹糖果列车突袭战 · 第 ${trainSpec.raidTier} 阶`,
    `${RELIC_BANNER_INLINE_ART[relicSpec.id]} ${relicSpec.name}已插上 · 先打火车头令全车停摆，击破宝箱货厢夺取列车金章！`
  );
  refreshMechaUI();
  refreshSubWeaponHUD();
  refreshUpgradeUI();
  renderActiveBuffsBar();
}

(window as unknown as Record<string, unknown>).__mc3dLaunchAirshipEscort = () => launchAirshipEscort();
(window as unknown as Record<string, unknown>).__mc3dLaunchCandyTrainRaid = () => launchCandyTrainRaid();

// ============================================================================
// MC-12: Bobo Squad Honor Trophy Hall (workshop) & Glacier Sled Race (lobby mode)
// ============================================================================

function TROPHY_CUP_IMG(tier: number, extraCls = ''): string {
  return `<img class="art-icon-img trophy-cup-img tier-${tier} ${extraCls}" src="/assets/icons/trophy_gold_cup.png?v=36" alt="" loading="${ART_LOADING}" draggable="false" />`;
}

function displayPedestalImg(): string {
  return `<img class="art-icon-img trophy-pedestal-img" src="/assets/icons/display_pedestal.png?v=36" alt="" loading="${ART_LOADING}" draggable="false" />`;
}

function afterTrophyHallChange(anchor: HTMLElement | null, label: string, accent: string): void {
  world.syncTrophyPedestal3D(true);
  sound.playTechUpgradeChime();
  spawnMenuUpgradeBurst(anchor, label, accent);
  refreshUpgradeUI();
  renderMainMenu();
  renderActiveBuffsBar();
}

function renderTrophyHall(): void {
  const hall = state.getTrophyHallBonus();
  const slots = state.getUnlockedTrophySlots();
  const unlockCost = state.getTrophySlotUnlockCost();
  if (trophyHallActivePill) {
    trophyHallActivePill.innerHTML = `${UI_ART.trophyGoldCup} 陈列 ${hall.displayedCount}/${slots} 展位`;
  }
  if (trophyHallResources) {
    trophyHallResources.innerHTML = `${UI_ART.iceMedal} 冰晶奖章 ${state.iceMedals} · 已获奖杯 ${hall.earnedCount}/${HALL_TROPHY_ORDER.length}`;
  }
  if (btnTrophyAutoArrange) {
    btnTrophyAutoArrange.disabled = hall.earnedCount === 0;
  }
  if (trophyHallMilestoneBanner) {
    const buffParts = HALL_TROPHY_ORDER.filter((id) => state.getHallTrophyInfo(id).displaySlot >= 0).map((id) => {
      const info = state.getHallTrophyInfo(id);
      return `${info.spec.buffLabel}+${Math.round(info.buffValue * 100)}%`;
    });
    const toNext = Math.max(0, hall.nextThreshold - hall.displayedCount);
    // tier 0's summary already says "陈列 2 座奖杯解锁…", so only the remaining count is added there
    const nextTxt =
      hall.nextThreshold > 0
        ? hall.tier === 0
          ? `还差 ${toNext} 座`
          : `再陈列 ${toNext} 座晋升下一档`
        : '已达最高陈列里程碑';
    trophyHallMilestoneBanner.innerHTML = `<span>${UI_ART.trophyHall} 里程碑：${hall.summaryText}</span><span>${buffParts.length > 0 ? `陈列加成：${buffParts.join(' · ')} · ` : ''}${nextTxt}</span>`;
    trophyHallMilestoneBanner.style.borderColor = hall.accentColor;
  }

  if (trophyHallSlotsEl) {
    trophyHallSlotsEl.innerHTML = '';
    for (let i = 0; i < TROPHY_HALL_SLOT_COUNT; i++) {
      const unlocked = i < slots;
      const tid = unlocked ? state.trophyDisplay[i] : null;
      const slotEl = document.createElement('div');
      slotEl.dataset.trophySlot = `${i}`;
      if (tid) {
        const info = state.getHallTrophyInfo(tid);
        slotEl.className = `trophy-slot is-filled tier-${info.tier}`;
        slotEl.style.setProperty('--trophy-accent', info.spec.accentColor);
        slotEl.innerHTML = `
          <div class="trophy-slot-stage">${displayPedestalImg()}${TROPHY_CUP_IMG(info.tier)}<span class="trophy-slot-emblem">${info.spec.inlineIcon}</span></div>
          <span class="trophy-slot-name">${info.spec.name}</span>
          <span class="trophy-slot-tier">${info.tierName} · ${info.spec.buffLabel}+${Math.round(info.buffValue * 100)}%</span>
          <button type="button" class="finish-action-btn btn-equip trophy-slot-remove-btn" data-trophy-remove="${i}">撤下</button>
        `;
        const rmBtn = slotEl.querySelector('.trophy-slot-remove-btn') as HTMLButtonElement;
        rmBtn.addEventListener('click', () => {
          if (state.placeTrophy(i, null)) afterTrophyHallChange(rmBtn, `${info.spec.name}已撤下`, '#94a3b8');
        });
      } else if (unlocked) {
        slotEl.className = 'trophy-slot is-empty';
        slotEl.innerHTML = `
          <div class="trophy-slot-stage">${displayPedestalImg()}</div>
          <span class="trophy-slot-name">展位 #${i + 1} · 空</span>
          <span class="trophy-slot-tier">从下方奖杯柜陈列</span>
        `;
      } else {
        const isNext = i === slots && !unlockCost.isMaxed;
        slotEl.className = `trophy-slot is-locked ${isNext ? 'is-next' : ''}`;
        slotEl.innerHTML = `
          <div class="trophy-slot-stage">${displayPedestalImg()}<span class="trophy-slot-lock">${UI_ART.lock}</span></div>
          <span class="trophy-slot-name">展位 #${i + 1} · 未解锁</span>
          ${
            isNext
              ? `<div class="trophy-slot-unlock">
                  <button type="button" class="finish-action-btn btn-buy trophy-unlock-medal-btn" data-trophy-unlock="medal" ${unlockCost.canAffordMedal ? '' : 'disabled'}>${UI_ART.iceMedal} ${unlockCost.medalCost} 解锁</button>
                  <button type="button" class="finish-action-btn btn-buy trophy-unlock-gold-btn" data-trophy-unlock="gold" ${unlockCost.canAffordGold ? '' : 'disabled'}>${UI_ART.coin} ${unlockCost.goldCost} 解锁</button>
                </div>`
              : '<span class="trophy-slot-tier">先解锁前一展位</span>'
          }
        `;
        if (isNext) {
          slotEl.querySelectorAll<HTMLButtonElement>('[data-trophy-unlock]').forEach((btn) => {
            btn.addEventListener('click', () => {
              const res = state.unlockTrophySlot(btn.dataset.trophyUnlock === 'medal' ? 'medal' : 'gold');
              if (res.unlocked) afterTrophyHallChange(btn, `展位 #${res.slotIndex + 1} 已解锁!`, '#7dd3fc');
            });
          });
        }
      }
      trophyHallSlotsEl.appendChild(slotEl);
    }
  }

  if (trophyHallGrid) {
    trophyHallGrid.innerHTML = '';
    const firstEmpty = state.trophyDisplay.findIndex((t, idx) => idx < slots && !t);
    HALL_TROPHY_ORDER.forEach((tid: HallTrophyId) => {
      const info = state.getHallTrophyInfo(tid);
      const spec = HALL_TROPHIES[tid];
      const earned = info.tier >= 1;
      const displayed = info.displaySlot >= 0;
      const pipsHtml = [1, 2, 3]
        .map((p) => `<span class="bobo-tech-pip ${p <= info.tier ? 'is-filled' : ''}"></span>`)
        .join('');
      const card = document.createElement('div');
      card.className = `finish-card mecha-mod-card bobo-tech-card cannon-mod-card trophy-cabinet-card tier-${info.tier} ${earned ? 'owned' : 'is-locked-mod'} ${displayed ? 'equipped is-displayed-trophy' : ''}`;
      card.dataset.hallTrophy = tid;
      card.style.setProperty('--trophy-accent', spec.accentColor);
      card.innerHTML = `
        <div class="finish-card-top">
          <div class="finish-swatch trophy-cabinet-swatch">
            ${TROPHY_CUP_IMG(info.tier, 'trophy-cabinet-cup')}
            <img class="art-icon-img trophy-cabinet-source" src="${spec.iconUrl}" alt="" loading="${ART_LOADING}" draggable="false" />
          </div>
          <div class="finish-meta">
            <span class="finish-name">${spec.name} · ${HALL_TROPHY_TIER_NAMES[info.tier]}</span>
            <span class="finish-tag" style="color: ${spec.accentColor}">${spec.sourceLabel}</span>
            <div class="bobo-tech-pips" aria-hidden="true">${pipsHtml}</div>
          </div>
        </div>
        <div class="finish-bonus">${
          earned
            ? `陈列加成：${spec.buffLabel} +${Math.round(info.buffValue * 100)}%${displayed ? `（展位 #${info.displaySlot + 1}）` : ''}`
            : `未获得 · ${spec.metricLabel}达到 ${spec.thresholds[0]}${spec.unit} 解锁青铜奖杯`
        }</div>
        <div class="finish-hint">${info.progressText}</div>
        <div class="bobo-tech-actions cannon-mod-actions trophy-cabinet-actions">
          ${
            displayed
              ? `<button type="button" class="finish-action-btn btn-equipped trophy-unplace-btn" data-trophy-unplace="${tid}">${UI_ART.check} 陈列中 · 撤下</button>`
              : `<button type="button" class="finish-action-btn btn-equip trophy-place-btn" data-trophy-place="${tid}" ${earned && firstEmpty >= 0 ? '' : 'disabled'}>${
                  !earned ? `${UI_ART.lock} 尚未获得` : firstEmpty >= 0 ? `${UI_ART.trophyGoldCup} 陈列到展位 #${firstEmpty + 1}` : '展位已满'
                }</button>`
          }
        </div>
      `;
      const placeBtn = card.querySelector('.trophy-place-btn') as HTMLButtonElement | null;
      placeBtn?.addEventListener('click', () => {
        if (firstEmpty >= 0 && state.placeTrophy(firstEmpty, tid)) {
          afterTrophyHallChange(placeBtn, `${spec.name}上架!`, spec.accentColor);
        }
      });
      const unplaceBtn = card.querySelector('.trophy-unplace-btn') as HTMLButtonElement | null;
      unplaceBtn?.addEventListener('click', () => {
        if (state.placeTrophy(info.displaySlot, null)) {
          afterTrophyHallChange(unplaceBtn, `${spec.name}已撤下`, '#94a3b8');
        }
      });
      trophyHallGrid.appendChild(card);
    });
  }
}

if (btnTrophyAutoArrange) {
  btnTrophyAutoArrange.addEventListener('click', () => {
    const n = state.autoArrangeTrophies();
    afterTrophyHallChange(btnTrophyAutoArrange, `一键陈列 ${n} 座奖杯!`, '#facc15');
  });
}

if (lobbyTrophyPedestalBtn) {
  lobbyTrophyPedestalBtn.addEventListener('click', () => {
    sound.playUpgrade();
    document.querySelector<HTMLButtonElement>('.menu-tab[data-tab="meta"]')?.click();
    document.getElementById('trophy-hall')?.scrollIntoView({ block: 'start' });
  });
}

let lastSledHudKey = '';
let lastSledPillKey = '';
let lastSledModeOn = false;

function launchGlacierSled(): void {
  topToolsDrawer?.classList.add('hidden');
  pendingBonusHeistStage = 0;
  state.resetRunProgression();
  mainMenu.classList.add('hidden');
  resultModal.classList.add('hidden');
  if (hudTop) hudTop.style.display = 'flex';
  if (hudBottom) hudBottom.style.display = 'flex';
  labelsContainer.style.display = 'block';
  world.isPaused = false;

  const sledSpec = state.getGlacierSledSpec();
  const lvl = generateGlacierSledLevel(sledSpec.sledTier);
  world.loadLevel(lvl);
  lastSledHudKey = '';
  lastSledPillKey = '';
  if (stageBadge) {
    stageBadge.textContent = '冰川雪橇 · 滑行 0%';
  }
  const stagePlaqueSubEl = document.getElementById('stage-plaque-sub');
  if (stagePlaqueSubEl) {
    stagePlaqueSubEl.textContent = lvl.subtitle;
  }
  bossNameEl.innerHTML = `${UI_ART.glacierSled} 冲线进度`;
  glacierSledHudEl?.classList.remove('hidden');
  const iceMs = state.getIceMedalMilestoneBonus();
  showBanner(
    `${UI_ART.glacierSled} 冰川雪橇竞速冲关 · 第 ${sledSpec.sledTier} 阶`,
    `左右拖动操控雪橇 · 躲开雪崩浪与坠落冰锥、穿过加人门 · 限时 ${lvl.sledCourse?.timeLimitSec ?? 40}s 冲线！${
      iceMs.sledBonusRiders > 0 ? ` 冰晶加成：起步波波 +${iceMs.sledBonusRiders}` : ''
    }`
  );
  refreshMechaUI();
  refreshSubWeaponHUD();
  refreshUpgradeUI();
  renderActiveBuffsBar();
}

(window as unknown as Record<string, unknown>).__mc3dLaunchGlacierSled = () => launchGlacierSled();

// ============================================================================
// MC-13: Volcano Lava Jump Breakout (lobby mode) & Bobo Squad Skin Gacha Machine (workshop)
// ============================================================================

let lastLavaHudKey = '';
let lastLavaPillKey = '';
let lastLavaModeOn = false;

// ============================================================================
// MC-14: Asteroid Belt Shield Breakout (lobby mode) & Themed Lobby Decoration Hall (workshop)
// ============================================================================

let lastAstHudKey = '';
let lastAstPillKey = '';
let lastAstModeOn = false;

function launchAsteroidDash(): void {
  topToolsDrawer?.classList.add('hidden');
  pendingBonusHeistStage = 0;
  state.resetRunProgression();
  mainMenu.classList.add('hidden');
  resultModal.classList.add('hidden');
  if (hudTop) hudTop.style.display = 'flex';
  if (hudBottom) hudBottom.style.display = 'flex';
  labelsContainer.style.display = 'block';
  world.isPaused = false;

  const astSpec = state.getAsteroidDashSpec();
  const lvl = generateAsteroidDashLevel(astSpec.asteroidTier);
  world.loadLevel(lvl);
  lastAstHudKey = '';
  lastAstPillKey = '';
  if (stageBadge) {
    stageBadge.textContent = '陨石带突围 · 前进 0%';
  }
  const stagePlaqueSubEl = document.getElementById('stage-plaque-sub');
  if (stagePlaqueSubEl) {
    stagePlaqueSubEl.textContent = lvl.subtitle;
  }
  bossNameEl.innerHTML = `${UI_ART.asteroidDash} 突围进度`;
  asteroidDashHudEl?.classList.remove('hidden');
  const starMs = state.getStardustMilestoneBonus();
  showBanner(
    `${UI_ART.asteroidDash} 星空陨石带护盾突围 · 第 ${astSpec.asteroidTier} 阶`,
    `左右拖动操控漂浮的波波团 · 躲开红色陨石落点圈、从陨石带的绿色缺口穿过 · 青色护盾门可挡下撞击 · 限时 ${lvl.asteroidCourse?.timeLimitSec ?? 40}s 冲进星光门！${
      starMs.asteroidBonusBobos > 0 ? ` 徽章加成：起步波波 +${starMs.asteroidBonusBobos}` : ''
    }`
  );
  refreshMechaUI();
  refreshSubWeaponHUD();
  refreshUpgradeUI();
  renderActiveBuffsBar();
}

(window as unknown as Record<string, unknown>).__mc3dLaunchAsteroidDash = () => launchAsteroidDash();

function decorCurrencyArt(cur: DecorCurrency): string {
  return cur === 'stardust' ? UI_ART.stardustBadge : cur === 'lava' ? UI_ART.lavaCore : cur === 'ice' ? UI_ART.iceMedal : UI_ART.coin;
}

function decorThemeArtImg(id: DecorThemeId, extraCls = ''): string {
  const spec = DECOR_THEMES[id];
  const filter = spec.iconHue
    ? ` style="filter: hue-rotate(${spec.iconHue}deg) saturate(1.1) drop-shadow(0 3px 5px rgba(0,0,0,0.45))"`
    : '';
  return `<img class="art-icon-img decor-theme-art ${extraCls}" src="${spec.iconUrl}" alt="" loading="${ART_LOADING}" draggable="false"${filter} />`;
}

function decorPropArtImg(id: DecorPropId, extraCls = ''): string {
  return `<img class="art-icon-img decor-prop-art ${extraCls}" src="${DECOR_PROPS[id].iconUrl}" alt="" loading="${ART_LOADING}" draggable="false" />`;
}

function afterDecorChange(anchor: HTMLElement | null, label: string, accent: string): void {
  world.syncLobbyDecor3D(true);
  sound.playTechUpgradeChime();
  if (anchor) spawnMenuUpgradeBurst(anchor, label, accent);
  refreshUpgradeUI();
  renderMainMenu();
  renderActiveBuffsBar();
}

function renderDecorHall(): void {
  const sum = state.getDecorHallSummary();
  if (decorActivePill) {
    decorActivePill.innerHTML = `${decorThemeArtImg(sum.theme.id, 'decor-pill-art')} 当前主题：${sum.theme.name} · 舒适度 ${sum.comfort}`;
  }
  if (decorResourcesEl) {
    decorResourcesEl.innerHTML = [
      `${UI_ART.coin} ${state.gold.toLocaleString()}`,
      `${UI_ART.stardustBadge} 星尘徽章 ${state.stardustBadges}`,
      `${UI_ART.lavaCore} 熔岩晶核 ${state.lavaCores}`,
      `${UI_ART.iceMedal} 冰晶奖章 ${state.iceMedals}`,
    ]
      .map((chip) => `<span class="decor-res-chip">${chip}</span>`)
      .join('');
  }
  if (decorBonusBanner) {
    decorBonusBanner.innerHTML = `<span>${UI_ART.lobbyTheme} 装修以外观为主：主题给大厅墙纸 / 地板与奖杯展台换色，摆件摆进大厅四角的 3D 场景</span><span>舒适度每点金币收益 +${(DECOR_COMFORT_GOLD_PER_POINT * 100).toFixed(1)}%（上限 +${Math.round(DECOR_COMFORT_GOLD_CAP * 100)}%）· 当前舒适度 ${sum.comfort} → 金币 +${sum.bonusPct}%</span>`;
  }
  if (decorThemeGrid) {
    decorThemeGrid.innerHTML = '';
    DECOR_THEME_ORDER.forEach((tid) => {
      const spec = DECOR_THEMES[tid];
      const owned = state.ownedDecorThemes.includes(tid);
      const active = sum.theme.id === tid;
      const canAfford = state.getDecorCurrencyAmount(spec.currency) >= spec.cost;
      const card = document.createElement('div');
      card.className = `decor-theme-card ${owned ? 'is-owned' : 'is-locked'} ${active ? 'is-active' : ''}`;
      card.dataset.decorTheme = tid;
      card.style.setProperty('--decor-wall', spec.cssWall);
      card.style.setProperty('--decor-floor', spec.cssFloor);
      card.style.setProperty('--decor-accent', spec.cssAccent);
      const action = active
        ? `<button type="button" class="finish-action-btn btn-equipped decor-theme-btn" disabled>${UI_ART.check} 使用中</button>`
        : owned
          ? `<button type="button" class="finish-action-btn btn-equip decor-theme-btn" data-decor-theme-apply="${tid}">换上</button>`
          : `<button type="button" class="finish-action-btn btn-buy decor-theme-btn" data-decor-theme-buy="${tid}" ${canAfford ? '' : 'disabled'}>${decorCurrencyArt(spec.currency)} ${spec.cost.toLocaleString()}</button>`;
      card.innerHTML = `
        <div class="decor-theme-swatch"><span class="decor-swatch-floor"></span>${decorThemeArtImg(tid, 'decor-card-art')}</div>
        <div class="decor-card-meta">
          <span class="decor-card-name">${spec.name}</span>
          <span class="decor-card-desc">${spec.desc}</span>
          <span class="decor-card-comfort">舒适度 +${spec.comfort}</span>
        </div>
        ${action}
      `;
      card.querySelector<HTMLButtonElement>('[data-decor-theme-apply]')?.addEventListener('click', (ev) => {
        if (state.applyDecorTheme(tid)) afterDecorChange(ev.currentTarget as HTMLElement, `换上${spec.name}!`, spec.cssAccent);
      });
      card.querySelector<HTMLButtonElement>('[data-decor-theme-buy]')?.addEventListener('click', (ev) => {
        const res = state.buyDecorTheme(tid);
        if (!res.ok) {
          showGlobalToast(`${res.reason}，无法购买${spec.name}`);
          return;
        }
        afterDecorChange(ev.currentTarget as HTMLElement, `${spec.name}装修完成!`, spec.cssAccent);
      });
      decorThemeGrid.appendChild(card);
    });
  }
  if (decorSlotRow) {
    decorSlotRow.innerHTML = '';
    for (let i = 0; i < DECOR_SLOT_COUNT; i++) {
      const pid = state.decorSlots[i];
      const slot = document.createElement('div');
      slot.className = `decor-slot ${pid ? 'is-filled' : 'is-empty'}`;
      slot.dataset.decorSlot = `${i}`;
      slot.innerHTML = pid
        ? `<span class="decor-slot-name">${DECOR_SLOT_NAMES[i]}</span>${decorPropArtImg(pid, 'decor-slot-art')}<span class="decor-slot-prop">${DECOR_PROPS[pid].name}</span><button type="button" class="finish-action-btn btn-equip decor-slot-btn" data-decor-slot-clear="${i}">收起</button>`
        : `<span class="decor-slot-name">${DECOR_SLOT_NAMES[i]}</span><span class="decor-slot-empty">空位</span><span class="decor-slot-prop">从下方摆件摆放</span>`;
      slot.querySelector<HTMLButtonElement>('[data-decor-slot-clear]')?.addEventListener('click', (ev) => {
        if (state.placeDecorProp(i, null)) afterDecorChange(ev.currentTarget as HTMLElement, '摆件已收起', '#94a3b8');
      });
      decorSlotRow.appendChild(slot);
    }
  }
  if (decorPropGrid) {
    decorPropGrid.innerHTML = '';
    const freeSlot = state.decorSlots.findIndex((p) => p === null);
    DECOR_PROP_ORDER.forEach((pid) => {
      const spec = DECOR_PROPS[pid];
      const owned = state.ownedDecorProps.includes(pid);
      const slotIdx = state.getDecorPropSlot(pid);
      const canAfford = state.getDecorCurrencyAmount(spec.currency) >= spec.cost;
      const card = document.createElement('div');
      card.className = `decor-prop-card ${owned ? 'is-owned' : 'is-locked'} ${slotIdx >= 0 ? 'is-placed' : ''}`;
      card.dataset.decorProp = pid;
      const action = !owned
        ? `<button type="button" class="finish-action-btn btn-buy decor-prop-btn" data-decor-prop-buy="${pid}" ${canAfford ? '' : 'disabled'}>${decorCurrencyArt(spec.currency)} ${spec.cost.toLocaleString()}</button>`
        : slotIdx >= 0
          ? `<button type="button" class="finish-action-btn btn-equipped decor-prop-btn" data-decor-prop-remove="${pid}">${UI_ART.check} ${DECOR_SLOT_NAMES[slotIdx]} · 收起</button>`
          : `<button type="button" class="finish-action-btn btn-equip decor-prop-btn" data-decor-prop-place="${pid}" ${freeSlot >= 0 ? '' : 'disabled'}>${freeSlot >= 0 ? '摆放' : '四角已满'}</button>`;
      card.innerHTML = `
        <div class="decor-prop-swatch">${decorPropArtImg(pid, 'decor-card-art')}</div>
        <div class="decor-card-meta">
          <span class="decor-card-name">${spec.name}</span>
          <span class="decor-card-desc">${spec.desc}</span>
          <span class="decor-card-comfort">舒适度 +${spec.comfort} · ${DECOR_CURRENCY_LABEL[spec.currency]}</span>
        </div>
        ${action}
      `;
      card.querySelector<HTMLButtonElement>('[data-decor-prop-buy]')?.addEventListener('click', (ev) => {
        const res = state.buyDecorProp(pid);
        if (!res.ok) {
          showGlobalToast(`${res.reason}，无法购买${spec.name}`);
          return;
        }
        afterDecorChange(
          ev.currentTarget as HTMLElement,
          res.placedSlot >= 0 ? `${spec.name}摆进${DECOR_SLOT_NAMES[res.placedSlot]}!` : `${spec.name}已入库`,
          '#fde68a'
        );
      });
      card.querySelector<HTMLButtonElement>('[data-decor-prop-place]')?.addEventListener('click', (ev) => {
        const free = state.decorSlots.findIndex((p) => p === null);
        if (free >= 0 && state.placeDecorProp(free, pid)) {
          afterDecorChange(ev.currentTarget as HTMLElement, `${spec.name}摆进${DECOR_SLOT_NAMES[free]}!`, '#fde68a');
        }
      });
      card.querySelector<HTMLButtonElement>('[data-decor-prop-remove]')?.addEventListener('click', (ev) => {
        const idx = state.getDecorPropSlot(pid);
        if (idx >= 0 && state.placeDecorProp(idx, null)) afterDecorChange(ev.currentTarget as HTMLElement, `${spec.name}已收起`, '#94a3b8');
      });
      decorPropGrid.appendChild(card);
    });
  }
}

if (btnDecorViewLobby) {
  btnDecorViewLobby.addEventListener('click', () => {
    sound.playUpgrade();
    document.querySelector<HTMLButtonElement>('.menu-tab[data-tab="launch"]')?.click();
    lobbyTrophyPedestalBtn?.scrollIntoView({ block: 'center' });
  });
}

// ============================================================================
// MC-15: Haunted Castle Pumpkin Night (lobby mode) & Bobo Squad Tactic Deck (workshop + lobby strip + battle HUD)
// ============================================================================

let lastPkHudKey = '';
let lastPkPillKey = '';
let lastPkModeOn = false;
let lastTacticHudKey = '';
const tacticFlashUntil: Partial<Record<TacticCardId, number>> = {};

const TACTIC_TRIGGER_SHORT: Record<TacticTrigger, string> = {
  start: '开局',
  half: '过半',
  final: '终局',
  crisis: '危急',
};

function tacticCurrencyArt(cur: TacticCurrency): string {
  switch (cur) {
    case 'train':
      return UI_ART.trainGoldMedal;
    case 'pearl':
      return UI_ART.deepPearl;
    case 'ice':
      return UI_ART.iceMedal;
    case 'lava':
      return UI_ART.lavaCore;
    case 'stardust':
      return UI_ART.stardustBadge;
    case 'pumpkin':
      return UI_ART.pumpkinBadge;
    default:
      return UI_ART.coin;
  }
}

function tacticCardImg(id: TacticCardId, extraCls = ''): string {
  return `<img class="art-icon-img tactic-card-art ${extraCls}" src="${TACTIC_CARDS[id].iconUrl}" alt="" loading="${ART_LOADING}" draggable="false" />`;
}

function launchPumpkinNight(): void {
  topToolsDrawer?.classList.add('hidden');
  pendingBonusHeistStage = 0;
  state.resetRunProgression();
  mainMenu.classList.add('hidden');
  resultModal.classList.add('hidden');
  if (hudTop) hudTop.style.display = 'flex';
  if (hudBottom) hudBottom.style.display = 'flex';
  labelsContainer.style.display = 'block';
  world.isPaused = false;

  const pkSpec = state.getPumpkinNightSpec();
  const lvl = generatePumpkinNightLevel(pkSpec.pumpkinTier);
  world.loadLevel(lvl);
  lastPkHudKey = '';
  lastPkPillKey = '';
  lastTacticHudKey = '';
  if (stageBadge) {
    stageBadge.textContent = '古堡南瓜夜 · 前进 0%';
  }
  const stagePlaqueSubEl = document.getElementById('stage-plaque-sub');
  if (stagePlaqueSubEl) {
    stagePlaqueSubEl.textContent = lvl.subtitle;
  }
  bossNameEl.innerHTML = `${UI_ART.pumpkinNight} 冲出古堡`;
  pumpkinNightHudEl?.classList.remove('hidden');
  const pkMs = state.getPumpkinMilestoneBonus();
  const deck = state.getTacticDeckSummary();
  showBanner(
    `${UI_ART.pumpkinNight} 幽灵古堡南瓜夜 · 第 ${pkSpec.pumpkinTier} 阶`,
    `左右拖动带波波团夜闯古堡 · 南瓜灯照明区补满灯光、幽灵在光里会被驱散 · 灯光够亮时碰到幽灵也能驱散 · 钻城墙拱门 · 限时 ${lvl.pumpkinCourse?.timeLimitSec ?? 41}s 冲出城门！${
      pkMs.startBonusBobos > 0 ? ` 徽章加成：起步波波 +${pkMs.startBonusBobos} · 灯光上限 +${pkMs.lightBonus}` : ''
    }${deck.equipped > 0 ? ` · 战术卡 ${deck.equipped} 张待命` : ''}`
  );
  refreshMechaUI();
  refreshSubWeaponHUD();
  refreshUpgradeUI();
  renderActiveBuffsBar();
  renderTacticHud(true);
}

(window as unknown as Record<string, unknown>).__mc3dLaunchPumpkinNight = () => launchPumpkinNight();

// ============================================================================
// MC-17: Jungle Temple Vine Swing (lobby mode)
// ============================================================================

let lastJgHudKey = '';
let lastJgPillKey = '';
let lastJgModeOn = false;

function launchJungleSwing(): void {
  topToolsDrawer?.classList.add('hidden');
  pendingBonusHeistStage = 0;
  state.resetRunProgression();
  mainMenu.classList.add('hidden');
  resultModal.classList.add('hidden');
  if (hudTop) hudTop.style.display = 'flex';
  if (hudBottom) hudBottom.style.display = 'flex';
  labelsContainer.style.display = 'block';
  world.isPaused = false;

  const jgSpec = state.getJungleSwingSpec();
  const lvl = generateJungleSwingLevel(jgSpec.jungleTier);
  world.loadLevel(lvl);
  lastJgHudKey = '';
  lastJgPillKey = '';
  lastTacticHudKey = '';
  if (stageBadge) {
    stageBadge.textContent = '丛林神庙 · 前进 0%';
  }
  const stagePlaqueSubEl = document.getElementById('stage-plaque-sub');
  if (stagePlaqueSubEl) {
    stagePlaqueSubEl.textContent = lvl.subtitle;
  }
  bossNameEl.innerHTML = `${UI_ART.jungleSwing} 冲出神庙`;
  jungleSwingHudEl?.classList.remove('hidden');
  const jgMs = state.getEmeraldIdolMilestoneBonus();
  const deck = state.getTacticDeckSummary();
  showBanner(
    `${UI_ART.jungleSwing} 丛林神庙藤蔓秋千 · 第 ${jgSpec.jungleTier} 阶`,
    `左右拖动带波波团闯神庙 · 断崖前对准左右摆动的藤蔓，队伍抓住藤蔓才能荡过去，没对准的波波会坠崖 · 地上亮起橙色滚道就是滚石要来了，快闪到旁边 · 限时 ${
      world.jungleRun?.timeLimit ?? lvl.jungleCourse?.timeLimitSec ?? 41
    }s 冲出神庙！${jgMs.startBonusBobos > 0 ? ` 徽章加成：起步波波 +${jgMs.startBonusBobos} · 限时 +${jgMs.timeBonusSec}s` : ''}${
      deck.equipped > 0 ? ` · 战术卡 ${deck.equipped} 张待命（大厅模式 ×1.0）` : ''
    }`
  );
  refreshMechaUI();
  refreshSubWeaponHUD();
  refreshUpgradeUI();
  renderActiveBuffsBar();
  renderTacticHud(true);
}

(window as unknown as Record<string, unknown>).__mc3dLaunchJungleSwing = () => launchJungleSwing();

// ============================================================================
// MC-18: Pirate Plank Breakout (lobby mode on the jungle squad-run engine)
// ============================================================================

let lastPrHudKey = '';
let lastPrModeOn = false;

function launchPirateBoarding(): void {
  topToolsDrawer?.classList.add('hidden');
  pendingBonusHeistStage = 0;
  state.resetRunProgression();
  mainMenu.classList.add('hidden');
  resultModal.classList.add('hidden');
  if (hudTop) hudTop.style.display = 'flex';
  if (hudBottom) hudBottom.style.display = 'flex';
  labelsContainer.style.display = 'block';
  world.isPaused = false;

  const prSpec = state.getPirateBoardingSpec();
  const lvl = generatePirateBoardingLevel(prSpec.pirateTier);
  world.loadLevel(lvl);
  lastPrHudKey = '';
  lastJgPillKey = '';
  lastTacticHudKey = '';
  if (stageBadge) {
    stageBadge.textContent = '海盗船 · 前进 0%';
  }
  const stagePlaqueSubEl = document.getElementById('stage-plaque-sub');
  if (stagePlaqueSubEl) {
    stagePlaqueSubEl.textContent = lvl.subtitle;
  }
  bossNameEl.innerHTML = `${UI_ART.pirateBoarding} 冲上旗舰`;
  pirateBoardingHudEl?.classList.remove('hidden');
  const prMs = state.getGoldSkullMilestoneBonus();
  const deck = state.getTacticDeckSummary();
  showBanner(
    `${UI_ART.pirateBoarding} 海盗船跳板突围 · 第 ${prSpec.pirateTier} 阶`,
    `左右拖动带波波团跑过甲板 · 海面前对准摇晃的跳板，踩上跳板才能荡过去，没对准的波波会落水 · 甲板亮起红色炮道就是炮弹要来了，快闪开 · 限时 ${
      world.jungleRun?.timeLimit ?? lvl.jungleCourse?.timeLimitSec ?? 40
    }s 冲上旗舰！${prMs.startBonusBobos > 0 ? ` 徽章加成：起步波波 +${prMs.startBonusBobos} · 限时 +${prMs.timeBonusSec}s` : ''}${
      deck.equipped > 0 ? ` · 战术卡 ${deck.equipped} 张待命（大厅模式 ×1.0）` : ''
    }`
  );
  refreshMechaUI();
  refreshSubWeaponHUD();
  refreshUpgradeUI();
  renderActiveBuffsBar();
  renderTacticHud(true);
}

(window as unknown as Record<string, unknown>).__mc3dLaunchPirateBoarding = () => launchPirateBoarding();

// ============================================================================
// MC-16: Desert Pyramid Trap Run (lobby mode) & tactic deck balance (main-campaign coefficient / switch)
// ============================================================================

let lastPyHudKey = '';
let lastPyPillKey = '';
let lastPyModeOn = false;

function launchPyramidRun(): void {
  topToolsDrawer?.classList.add('hidden');
  pendingBonusHeistStage = 0;
  state.resetRunProgression();
  mainMenu.classList.add('hidden');
  resultModal.classList.add('hidden');
  if (hudTop) hudTop.style.display = 'flex';
  if (hudBottom) hudBottom.style.display = 'flex';
  labelsContainer.style.display = 'block';
  world.isPaused = false;

  const pySpec = state.getPyramidRunSpec();
  const lvl = generatePyramidRunLevel(pySpec.pyramidTier);
  world.loadLevel(lvl);
  lastPyHudKey = '';
  lastPyPillKey = '';
  lastTacticHudKey = '';
  if (stageBadge) {
    stageBadge.textContent = '金字塔墓道 · 前进 0%';
  }
  const stagePlaqueSubEl = document.getElementById('stage-plaque-sub');
  if (stagePlaqueSubEl) {
    stagePlaqueSubEl.textContent = lvl.subtitle;
  }
  bossNameEl.innerHTML = `${UI_ART.pyramidRun} 冲出墓道`;
  pyramidRunHudEl?.classList.remove('hidden');
  const pyMs = state.getScarabMilestoneBonus();
  const deck = state.getTacticDeckSummary();
  showBanner(
    `${UI_ART.pyramidRun} 沙漠金字塔机关跑酷 · 第 ${pySpec.pyramidTier} 阶`,
    `左右拖动带波波团闯墓道 · 流沙会拖慢脚步、站久了会被吞没，踩金边石板路才稳 · 翻转石板发红抖动后会翻起掀飞波波 · 限时 ${
      world.pyramidRun?.timeLimit ?? lvl.pyramidCourse?.timeLimitSec ?? 41
    }s 冲出墓道！${pyMs.startBonusBobos > 0 ? ` 徽章加成：起步波波 +${pyMs.startBonusBobos} · 限时 +${pyMs.timeBonusSec}s` : ''}${
      deck.equipped > 0 ? ` · 战术卡 ${deck.equipped} 张待命（大厅模式 ×1.0）` : ''
    }`
  );
  refreshMechaUI();
  refreshSubWeaponHUD();
  refreshUpgradeUI();
  renderActiveBuffsBar();
  renderTacticHud(true);
}

(window as unknown as Record<string, unknown>).__mc3dLaunchPyramidRun = () => launchPyramidRun();

/** Short campaign value of a card at the main-campaign coefficient (shown on its workshop card). */
function tacticCampaignValueText(id: TacticCardId): string {
  const spec = TACTIC_CARDS[id];
  if (!state.tacticCampaignEnabled) return '主线关闭';
  if (spec.category === 'rush') return `主线 +${Math.round(scaleTacticValue(spec.value, TACTIC_CAMPAIGN_EFFECT_MULT, false) * 100)}%`;
  const v = scaleTacticValue(spec.value, TACTIC_CAMPAIGN_EFFECT_MULT, true);
  return spec.category === 'shield' ? `主线 ${v} 盾` : `主线 +${v}`;
}

/** Workshop balance row: the main-campaign coefficient, its scaled caps and the on / off switch. */
function renderTacticBalanceRow(): void {
  const camp = state.getTacticEffectProfile(true);
  const on = state.tacticCampaignEnabled;
  if (tacticBalanceTitleEl) {
    tacticBalanceTitleEl.textContent = on ? `主线战役平衡系数 ×${camp.mult.toFixed(1)}` : '主线战役：战术卡已关闭';
  }
  if (tacticBalanceTextEl) {
    tacticBalanceTextEl.textContent = on
      ? `主线每局封顶：护盾 ≤${camp.shieldCap} · 援军 ≤${camp.crowdCap} · 冲锋 ≤+${Math.round(camp.rushCap * 100)}%`
      : '主线不发动战术卡，大厅模式不受影响';
  }
  if (btnTacticCampaignToggle) {
    btnTacticCampaignToggle.textContent = on ? '关闭主线卡' : '开启主线卡';
    btnTacticCampaignToggle.title = on ? '主线战役战术卡生效中，点击关闭' : '主线战役战术卡已关闭，点击开启';
    btnTacticCampaignToggle.classList.toggle('is-off', !on);
    btnTacticCampaignToggle.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
}

if (btnTacticCampaignToggle) {
  btnTacticCampaignToggle.addEventListener('click', (ev) => {
    const next = !state.tacticCampaignEnabled;
    if (!state.setTacticCampaignEnabled(next)) return;
    afterTacticChange(ev.currentTarget as HTMLElement, next ? '主线战术卡 ×0.6 生效' : '主线战术卡已关闭', next ? '#fde68a' : '#94a3b8');
    showGlobalToast(next ? `主线战役战术卡已开启（效果 ×${TACTIC_CAMPAIGN_EFFECT_MULT.toFixed(1)}）` : '主线战役战术卡已关闭（大厅模式不受影响）');
  });
}

function afterTacticChange(anchor: HTMLElement | null, label: string, accent: string): void {
  sound.playTechUpgradeChime();
  if (anchor) spawnMenuUpgradeBurst(anchor, label, accent);
  refreshUpgradeUI();
  renderMainMenu();
  renderActiveBuffsBar();
}

function openTacticDeckPanel(): void {
  document.querySelector<HTMLButtonElement>('.menu-tab[data-tab="meta"]')?.click();
  document.getElementById('tactic-deck')?.scrollIntoView({ block: 'start' });
}

/** Lobby (launch tab): the 3 cards taken into the next match + a jump into the workshop deck editor. */
function renderLobbyTacticStrip(): void {
  const cards = state.getEquippedTacticCards();
  if (lobbyTacticSlotsEl) {
    const chips: string[] = [];
    for (let i = 0; i < TACTIC_DECK_SIZE; i++) {
      const c = cards[i];
      chips.push(
        c
          ? `<span class="lobby-tactic-slot is-filled is-${c.category}" data-lobby-tactic="${c.id}" title="${c.name}：${c.desc}">${tacticCardImg(c.id, 'lobby-tactic-art')}<span class="lobby-tactic-trigger">${TACTIC_TRIGGER_SHORT[c.trigger]}</span></span>`
          : `<span class="lobby-tactic-slot is-empty" title="空卡槽：前往工坊编入战术卡">+</span>`
      );
    }
    lobbyTacticSlotsEl.innerHTML = chips.join('');
  }
  if (lobbyTacticSubEl) {
    const campTag = state.tacticCampaignEnabled ? `主线×${TACTIC_CAMPAIGN_EFFECT_MULT.toFixed(1)}` : '主线关闭';
    lobbyTacticSubEl.textContent =
      cards.length > 0
        ? `${cards.length}/${TACTIC_DECK_SIZE} · ${campTag} · ${cards.map((c) => c.name).join(' · ')}`
        : `0/${TACTIC_DECK_SIZE} · ${campTag} · 局内自动触发`;
  }
}

function renderTacticDeck(): void {
  const cards = state.getEquippedTacticCards();
  const full = cards.length >= TACTIC_DECK_SIZE;
  if (tacticActivePill) {
    tacticActivePill.innerHTML = `${UI_ART.tacticDeck} 出战卡组 ${cards.length}/${TACTIC_DECK_SIZE} · 已解锁 ${state.ownedTacticCards.length}/${TACTIC_CARD_ORDER.length}`;
  }
  if (tacticResourcesEl) {
    const cur: TacticCurrency[] = ['gold', 'train', 'pearl', 'ice', 'lava', 'stardust', 'pumpkin'];
    tacticResourcesEl.innerHTML = cur
      .map((c) => {
        const amt = state.getTacticCurrencyAmount(c);
        return `<span class="decor-res-chip tactic-res-chip" data-tactic-cur="${c}" title="${TACTIC_CURRENCY_LABEL[c]}">${tacticCurrencyArt(c)} ${c === 'gold' ? amt.toLocaleString() : amt}</span>`;
      })
      .join('');
  }
  if (tacticRuleBanner) {
    // One-line gist in the panel; the full scope + per-match caps sit in the collapsible rule block below it
    const keepOpen = tacticRuleBanner.querySelector('details')?.open ? ' open' : '';
    tacticRuleBanner.innerHTML = `<span class="tactic-rule-main">${UI_ART.tacticDeck} 编入 ${TACTIC_DECK_SIZE} 张卡，局内条件满足自动触发，每张每局 1 次</span><details class="tactic-rule-more"${keepOpen}><summary>详细规则</summary><span>生效范围：大厅模式全效（深海营救不触发）；主线战役按下方系数，单卡数值 ×${TACTIC_CAMPAIGN_EFFECT_MULT.toFixed(1)}，可在下方关闭</span><span>大厅模式每局封顶：护盾 ≤${TACTIC_SHIELD_CAP} 只 · 援军 ≤${TACTIC_CROWD_CAP} 只 · 冲锋不叠加，≤+${Math.round(TACTIC_RUSH_CAP * 100)}% 且 ≤${TACTIC_RUSH_MAX_SEC}s</span></details>`;
  }
  renderTacticBalanceRow();
  if (tacticDeckSlotsEl) {
    tacticDeckSlotsEl.innerHTML = '';
    for (let i = 0; i < TACTIC_DECK_SIZE; i++) {
      const id = state.tacticDeck[i];
      const spec = id && state.ownedTacticCards.includes(id) ? TACTIC_CARDS[id] : null;
      const slot = document.createElement('div');
      slot.className = `tactic-slot ${spec ? `is-filled is-${spec.category}` : 'is-empty'}`;
      slot.dataset.tacticSlot = `${i}`;
      slot.innerHTML = spec
        ? `<span class="tactic-slot-no">卡槽 ${i + 1}</span>${tacticCardImg(spec.id, 'tactic-slot-art')}<span class="tactic-slot-name">${spec.name}</span><span class="tactic-slot-trigger">${TACTIC_TRIGGER_SHORT[spec.trigger]}触发</span><button type="button" class="finish-action-btn btn-equip tactic-slot-btn" data-tactic-slot-clear="${i}">卸下</button>`
        : `<span class="tactic-slot-no">卡槽 ${i + 1}</span><span class="tactic-slot-empty">空槽</span><span class="tactic-slot-trigger">从下方编入</span>`;
      slot.querySelector<HTMLButtonElement>('[data-tactic-slot-clear]')?.addEventListener('click', (ev) => {
        if (state.equipTacticCard(i, null)) afterTacticChange(ev.currentTarget as HTMLElement, '卡牌已卸下', '#94a3b8');
      });
      tacticDeckSlotsEl.appendChild(slot);
    }
  }
  if (tacticCardGrid) {
    tacticCardGrid.innerHTML = '';
    TACTIC_CARD_ORDER.forEach((cid) => {
      const spec = TACTIC_CARDS[cid];
      const owned = state.ownedTacticCards.includes(cid);
      const slotIdx = state.tacticDeck.indexOf(cid);
      const canAfford = state.getTacticCurrencyAmount(spec.currency) >= spec.cost;
      const card = document.createElement('div');
      card.className = `tactic-card is-${spec.category} ${owned ? 'is-owned' : 'is-locked'} ${slotIdx >= 0 ? 'is-equipped' : ''}`;
      card.dataset.tacticCard = cid;
      const action = !owned
        ? `<button type="button" class="finish-action-btn btn-buy tactic-card-btn" data-tactic-buy="${cid}" ${canAfford ? '' : 'disabled'}>${tacticCurrencyArt(spec.currency)} ${spec.cost.toLocaleString()}</button>`
        : slotIdx >= 0
          ? `<button type="button" class="finish-action-btn btn-equipped tactic-card-btn" data-tactic-unequip="${cid}">${UI_ART.check} 卡槽 ${slotIdx + 1} · 卸下</button>`
          : `<button type="button" class="finish-action-btn btn-equip tactic-card-btn" data-tactic-equip="${cid}" ${full ? 'disabled' : ''}>${full ? '卡组已满' : '编入卡组'}</button>`;
      card.innerHTML = `
        <div class="tactic-card-head">
          ${tacticCardImg(cid, 'tactic-card-icon')}
          <div class="tactic-card-titles">
            <span class="tactic-card-name">${spec.name}</span>
            <span class="tactic-card-tag">${TACTIC_CATEGORY_LABEL[spec.category]} · ${TACTIC_TRIGGER_SHORT[spec.trigger]}</span>
            <span class="tactic-card-camp" title="主线战役平衡系数下的效果">${UI_ART.tacticBalance}${tacticCampaignValueText(cid)}</span>
          </div>
        </div>
        <span class="tactic-card-desc">${spec.desc}</span>
        <span class="tactic-card-cond" title="${TACTIC_TRIGGER_LABEL[spec.trigger]}">触发：${TACTIC_TRIGGER_LABEL[spec.trigger]}</span>
        ${action}
      `;
      card.querySelector<HTMLButtonElement>('[data-tactic-buy]')?.addEventListener('click', (ev) => {
        const res = state.buyTacticCard(cid);
        if (!res.ok) {
          showGlobalToast(`${res.reason}，无法解锁${spec.name}`);
          return;
        }
        afterTacticChange(
          ev.currentTarget as HTMLElement,
          res.equippedSlot >= 0 ? `${spec.name}编入卡槽 ${res.equippedSlot + 1}!` : `${spec.name}已解锁`,
          '#fde68a'
        );
      });
      card.querySelector<HTMLButtonElement>('[data-tactic-equip]')?.addEventListener('click', (ev) => {
        const res = state.toggleTacticCard(cid);
        if (!res.ok) {
          showGlobalToast(`${res.reason}，先卸下一张卡`);
          return;
        }
        afterTacticChange(ev.currentTarget as HTMLElement, `${spec.name}编入卡槽 ${res.slot + 1}!`, '#fde68a');
      });
      card.querySelector<HTMLButtonElement>('[data-tactic-unequip]')?.addEventListener('click', (ev) => {
        const idx = state.tacticDeck.indexOf(cid);
        if (idx >= 0 && state.equipTacticCard(idx, null)) afterTacticChange(ev.currentTarget as HTMLElement, `${spec.name}已卸下`, '#94a3b8');
      });
      tacticCardGrid.appendChild(card);
    });
  }
}

/** Battle HUD: one chip per equipped card (ready -> its trigger; fired -> what it delivered). */
function renderTacticHud(force = false): void {
  if (!tacticDeckHudEl) return;
  const hud = world.getTacticHudState();
  const now = performance.now();
  if (!hud || hud.cards.length === 0) {
    if (lastTacticHudKey !== 'none' || force) {
      lastTacticHudKey = 'none';
      tacticDeckHudEl.classList.add('hidden');
      tacticDeckHudEl.innerHTML = '';
    }
    return;
  }
  const flashKey = hud.cards.map((c) => ((tacticFlashUntil[c.id] || 0) > now ? 1 : 0)).join('');
  const key = `${hud.cards.map((c) => `${c.id}:${c.fired ? 1 : 0}:${c.resultText}`).join('|')}_${hud.rushLeft > 0 ? Math.ceil(hud.rushLeft) : 0}_${flashKey}`;
  if (!force && key === lastTacticHudKey) return;
  lastTacticHudKey = key;
  tacticDeckHudEl.classList.remove('hidden');
  const scaleTag = hud.isCampaign
    ? `<span class="tactic-hud-scale" title="主线战役平衡系数：单卡效果与每局封顶 ×${hud.effectMult.toFixed(1)}">${UI_ART.tacticBalance}<span>×${hud.effectMult.toFixed(1)}</span></span>`
    : '';
  tacticDeckHudEl.innerHTML = scaleTag + hud.cards
    .map((c) => {
      const spec = TACTIC_CARDS[c.id];
      const flash = (tacticFlashUntil[c.id] || 0) > now ? ' is-flash' : '';
      const rushTag = c.fired && spec.category === 'rush' && hud.rushLeft > 0 ? ` · ${Math.ceil(hud.rushLeft)}s` : '';
      const stateTxt = c.fired ? `${c.resultText || '已触发'}${rushTag}` : `${TACTIC_TRIGGER_SHORT[spec.trigger]}触发`;
      return `<span class="tactic-hud-chip is-${spec.category} ${c.fired ? 'is-fired' : 'is-ready'}${flash}" data-tactic-hud="${c.id}" title="${spec.name}：${spec.desc}">${tacticCardImg(c.id, 'tactic-hud-art')}<span class="tactic-hud-copy"><span class="tactic-hud-name">${spec.name}</span><span class="tactic-hud-state">${stateTxt}</span></span></span>`;
    })
    .join('');
}

world.onTacticTrigger = (cardId: TacticCardId) => {
  tacticFlashUntil[cardId] = performance.now() + 1400;
  renderTacticHud(true);
  // MC-16: keep the "战术卡 n/3 已触发" buff pill in step with the chips
  renderActiveBuffsBar();
};

if (btnLobbyTacticEdit) {
  btnLobbyTacticEdit.addEventListener('click', () => {
    sound.playUpgrade();
    openTacticDeckPanel();
  });
}

function launchLavaJump(): void {
  topToolsDrawer?.classList.add('hidden');
  pendingBonusHeistStage = 0;
  state.resetRunProgression();
  mainMenu.classList.add('hidden');
  resultModal.classList.add('hidden');
  if (hudTop) hudTop.style.display = 'flex';
  if (hudBottom) hudBottom.style.display = 'flex';
  labelsContainer.style.display = 'block';
  world.isPaused = false;

  const lavaSpec = state.getLavaJumpSpec();
  const lvl = generateLavaJumpLevel(lavaSpec.lavaTier);
  world.loadLevel(lvl);
  lastLavaHudKey = '';
  lastLavaPillKey = '';
  if (stageBadge) {
    stageBadge.textContent = '熔岩跳台 · 前进 0%';
  }
  const stagePlaqueSubEl = document.getElementById('stage-plaque-sub');
  if (stagePlaqueSubEl) {
    stagePlaqueSubEl.textContent = lvl.subtitle;
  }
  bossNameEl.innerHTML = `${UI_ART.lavaJump} 突围进度`;
  lavaJumpHudEl?.classList.remove('hidden');
  const lavaMs = state.getLavaCoreMilestoneBonus();
  showBanner(
    `${UI_ART.lavaJump} 火山熔岩跳台突围战 · 第 ${lavaSpec.lavaTier} 阶`,
    `左右拖动操控波波团在浮石间连跳 · 落点圈变绿再起跳，躲开喷发预警圈与落石阴影 · 限时 ${lvl.lavaCourse?.timeLimitSec ?? 40}s 冲出火山口！${
      lavaMs.lavaBonusBobos > 0 ? ` 晶核加成：起步波波 +${lavaMs.lavaBonusBobos}` : ''
    }`
  );
  refreshMechaUI();
  refreshSubWeaponHUD();
  refreshUpgradeUI();
  renderActiveBuffsBar();
}

(window as unknown as Record<string, unknown>).__mc3dLaunchLavaJump = () => launchLavaJump();

function gachaSkinArtImg(id: GachaSkinId, extraCls = ''): string {
  const spec = GACHA_SKINS[id];
  const hue = spec.id === 'royal_crown' ? '' : ` style="filter: hue-rotate(${spec.capsuleHue}deg) saturate(1.15) drop-shadow(0 3px 5px rgba(0,0,0,0.45))"`;
  return `<img class="art-icon-img gacha-skin-art ${extraCls}" src="${spec.iconUrl}" alt="" loading="${ART_LOADING}" draggable="false"${hue} />`;
}

function renderGachaResultTray(): void {
  if (!gachaResultTray) return;
  if (lastGachaResults.length === 0) {
    gachaResultTray.className = 'gacha-result-tray is-empty';
    gachaResultTray.innerHTML = `<span class="gacha-result-empty">${UI_ART.skinCapsule} 投入熔岩晶核或金币，扭出波波装扮！</span>`;
    return;
  }
  const single = lastGachaResults.length === 1;
  gachaResultTray.className = `gacha-result-tray ${single ? 'is-single' : 'is-multi'}`;
  gachaResultTray.dataset.serial = `${gachaRevealSerial}`;
  gachaResultTray.innerHTML = lastGachaResults
    .map((r, idx) => {
      const spec = GACHA_SKINS[r.id];
      const rar = GACHA_RARITIES[r.rarity];
      const note = r.isNew
        ? '<span class="gacha-chip-new">NEW</span>'
        : `<span class="gacha-chip-dup">${UI_ART.coin}+${r.dupCoins}</span>`;
      return `<div class="gacha-result-chip rarity-${r.rarity}" style="--rarity-color: ${rar.color}; --reveal-i: ${idx}" data-gacha-result="${r.id}">
          <div class="gacha-chip-swatch" style="background: ${spec.swatch}">${gachaSkinArtImg(r.id, 'gacha-chip-art')}</div>
          <span class="gacha-chip-rarity">${rar.name}${r.pity ? ' · 保底' : ''}</span>
          <span class="gacha-chip-name">${spec.name}</span>
          ${note}
        </div>`;
    })
    .join('');
}

function renderGachaMachine(): void {
  const equipped = state.getEquippedGachaSkinSpec();
  const owned = state.ownedGachaSkins.length;
  const pity = state.getGachaPityInfo();
  const collectPct = Math.round((state.getGachaCollectionGoldMult() - 1) * 1000) / 10;
  if (gachaActivePill) {
    gachaActivePill.innerHTML = equipped
      ? `${gachaSkinArtImg(equipped.id, 'gacha-pill-art')} 当前装扮：${equipped.name}`
      : `${UI_ART.skinCapsule} 当前装扮：原味波波`;
  }
  if (gachaResourcesEl) {
    gachaResourcesEl.innerHTML = `${UI_ART.lavaCore} 熔岩晶核 ${state.lavaCores} · ${UI_ART.coin} ${state.gold.toLocaleString()} · 图鉴 ${owned}/${GACHA_SKIN_ORDER.length}`;
  }
  if (gachaOddsBanner) {
    const odds = [...GACHA_RARITY_ORDER]
      .reverse()
      .map((rid) => `<b style="color: ${GACHA_RARITIES[rid].color}">${GACHA_RARITIES[rid].name} ${GACHA_RARITIES[rid].weight}%</b>`)
      .join(' · ');
    gachaOddsBanner.innerHTML = `<span>${UI_ART.gachaMachine} 概率：${odds}</span><span>每 ${GACHA_PITY_SR} 抽必出史诗+ · ${GACHA_PITY_SSR} 抽必出传说 · 重复装扮自动折算金币 · 装扮纯外观，图鉴收藏金币 +${(GACHA_COLLECTION_GOLD_PER_SKIN * 100).toFixed(1)}%/款（上限 ${Math.round(GACHA_COLLECTION_GOLD_CAP * 100)}%，当前 +${collectPct}%）</span>`;
  }
  if (gachaPityFillEl) {
    gachaPityFillEl.style.width = `${Math.round(pity.srProgress * 100)}%`;
  }
  if (gachaPityTextEl) {
    gachaPityTextEl.textContent =
      pity.srLeft <= 1 ? '下一抽必出史诗+！' : `史诗保底还差 ${pity.srLeft} 抽 · 传说保底 ${pity.ssrLeft} 抽`;
  }
  for (const btn of gachaRollButtons) {
    const count = btn.dataset.gachaCount === '10' ? 10 : 1;
    const pay = btn.dataset.gachaPay === 'gold' ? 'gold' : 'core';
    const cost = state.getGachaRollCost(count);
    const can = pay === 'core' ? cost.canAffordCores : cost.canAffordGold;
    btn.disabled = !can;
    btn.innerHTML = `<span class="gacha-roll-label">${count === 10 ? '十连扭' : '单抽'}</span><span class="gacha-roll-cost">${
      pay === 'core' ? `${UI_ART.lavaCore} ${cost.cores}` : `${UI_ART.coin} ${cost.gold.toLocaleString()}`
    }</span>`;
  }
  if (btnGachaUnequip) {
    btnGachaUnequip.disabled = !equipped;
  }
  renderGachaResultTray();
  if (gachaCollectionGrid) {
    gachaCollectionGrid.innerHTML = '';
    GACHA_SKIN_ORDER.forEach((sid) => {
      const spec = GACHA_SKINS[sid];
      const rar = GACHA_RARITIES[spec.rarity];
      const isOwned = state.ownedGachaSkins.includes(sid);
      const isEquipped = equipped?.id === sid;
      const card = document.createElement('div');
      card.className = `gacha-skin-card rarity-${spec.rarity} ${isOwned ? 'is-owned' : 'is-locked'} ${isEquipped ? 'is-equipped' : ''}`;
      card.dataset.gachaSkin = sid;
      card.style.setProperty('--rarity-color', rar.color);
      card.innerHTML = `
        <div class="gacha-skin-swatch" style="background: ${spec.swatch}">${gachaSkinArtImg(sid, 'gacha-card-art')}</div>
        <div class="gacha-skin-meta">
          <span class="gacha-skin-rarity">${rar.name}</span>
          <span class="gacha-skin-name">${spec.name}</span>
          <span class="gacha-skin-desc">${isOwned ? spec.desc : `未获得 · ${spec.accessoryLabel}`}</span>
        </div>
        <button type="button" class="finish-action-btn ${isEquipped ? 'btn-equipped' : 'btn-equip'} gacha-equip-btn" data-gacha-equip="${sid}" ${isOwned && !isEquipped ? '' : 'disabled'}>${
          isEquipped ? `${UI_ART.check} 装扮中` : isOwned ? '装扮' : `${UI_ART.lock} 扭蛋获得`
        }</button>
      `;
      const eqBtn = card.querySelector('.gacha-equip-btn') as HTMLButtonElement;
      eqBtn.addEventListener('click', () => {
        if (state.equipGachaSkin(sid)) {
          world.syncGachaSkin3D();
          sound.playTechUpgradeChime();
          spawnMenuUpgradeBurst(eqBtn, `${spec.name}已装扮!`, rar.color);
          renderGachaMachine();
          renderActiveBuffsBar();
        }
      });
      gachaCollectionGrid.appendChild(card);
    });
  }
}

function rollGachaFromUI(btn: HTMLButtonElement): void {
  const count = btn.dataset.gachaCount === '10' ? 10 : 1;
  const pay = btn.dataset.gachaPay === 'gold' ? 'gold' : 'core';
  const res = state.rollGacha(count, pay);
  if (!res.ok) {
    showGlobalToast(`${res.reason}，无法扭蛋`);
    return;
  }
  lastGachaResults = res.results;
  gachaRevealSerial++;
  const best = res.results.reduce(
    (acc, r) => (GACHA_RARITY_ORDER.indexOf(r.rarity) > GACHA_RARITY_ORDER.indexOf(acc.rarity) ? r : acc),
    res.results[0]
  );
  const bestRar = GACHA_RARITIES[best.rarity];
  sound.playTechUpgradeChime();
  if (gachaMachineArtEl) {
    gachaMachineArtEl.classList.remove('is-shaking');
    void gachaMachineArtEl.offsetWidth;
    gachaMachineArtEl.classList.add('is-shaking');
  }
  spawnMenuUpgradeBurst(
    btn,
    `${bestRar.name}·${GACHA_SKINS[best.id].name}${res.newCount > 0 ? ` (+${res.newCount} 新装扮)` : ''}`,
    bestRar.color
  );
  refreshUpgradeUI();
  renderMainMenu();
}

for (const btn of gachaRollButtons) {
  btn.addEventListener('click', () => rollGachaFromUI(btn));
}

if (btnGachaUnequip) {
  btnGachaUnequip.addEventListener('click', () => {
    if (state.equipGachaSkin(null)) {
      world.syncGachaSkin3D();
      sound.playUpgrade();
      spawnMenuUpgradeBurst(btnGachaUnequip, '换回原味波波', '#94a3b8');
      renderGachaMachine();
      renderActiveBuffsBar();
    }
  });
}

function launchSubmarineRescue(): void {
  topToolsDrawer?.classList.add('hidden');
  pendingBonusHeistStage = 0;
  state.resetRunProgression();
  mainMenu.classList.add('hidden');
  resultModal.classList.add('hidden');
  if (hudTop) hudTop.style.display = 'flex';
  if (hudBottom) hudBottom.style.display = 'flex';
  labelsContainer.style.display = 'block';
  world.isPaused = false;

  const subSpec = state.getSubmarineRescueSpec();
  const lvl = generateSubmarineRescueLevel(subSpec.rescueTier);
  world.loadLevel(lvl);
  lastSubHudKey = '';
  if (stageBadge) {
    stageBadge.textContent = `深海营救 · 潜航 0%`;
  }
  const stagePlaqueSubEl = document.getElementById('stage-plaque-sub');
  if (stagePlaqueSubEl) {
    stagePlaqueSubEl.textContent = lvl.subtitle;
  }
  bossNameEl.innerHTML = `${UI_ART.submarineRescue} 潜航进度`;
  submarineRescueHudEl?.classList.remove('hidden');
  const petSpec = state.getPetCompanionSpec();
  showBanner(
    `${UI_ART.submarineRescue} 深海潜艇泡泡营救战 · 第 ${subSpec.rescueTier} 阶`,
    `${PET_COMPANION_INLINE_ART[petSpec.id]} ${petSpec.name}随艇出征 · 左右拖动操控潜艇，戳破营救泡泡、破开珊瑚封锁、提防水母阵！`
  );
  refreshMechaUI();
  refreshSubWeaponHUD();
  refreshUpgradeUI();
  renderActiveBuffsBar();
}

(window as unknown as Record<string, unknown>).__mc3dLaunchSubmarineRescue = () => launchSubmarineRescue();
(window as unknown as Record<string, unknown>).__mc3dStartBonusHeist = (stage = 5) =>
  startBonusHeist(stage, stage);

function renderActiveBuffsBar(): void {
  syncCannonModHudBadge();
  if (!activeBuffsBar || !world.currentLevel) return;
  const pills: string[] = [];

  const activeModSpec = state.getCannonModSpec(state.activeCannonMod);
  const activeModLvl = Math.max(1, state.getCannonModLevel(state.activeCannonMod));
  pills.push(
    `<span class="buff-pill rarity-legendary" title="蒸汽母炮核心模组：${activeModSpec.statText(activeModLvl)}">${CANNON_MOD_INLINE_ART[activeModSpec.id]} ${activeModSpec.name} Lv.${activeModLvl}</span>`
  );
  const activeBannerSpec = state.getRelicBannerSpec(state.activeRelicBanner);
  const activeBannerLvl = Math.max(1, state.getRelicBannerLevel(state.activeRelicBanner));
  const surgeTag = world.relicSurgeTimer > 0 ? ' · 冲锋中' : '';
  pills.push(
    `<span class="buff-pill rarity-epic relic-banner-pill" data-relic-banner="${activeBannerSpec.id}" title="波波战队圣物战旗：${activeBannerSpec.statText(activeBannerLvl)}">${RELIC_BANNER_INLINE_ART[activeBannerSpec.id]} ${activeBannerSpec.name} Lv.${activeBannerLvl}${surgeTag}</span>`
  );
  const activePetSpecBar = state.getPetCompanionSpec(state.activePet);
  const activePetLvlBar = state.getPetCompanionLevel(state.activePet);
  if (activePetLvlBar >= 1) {
    pills.push(
      `<span class="buff-pill rarity-epic pet-companion-pill" data-pet-companion="${activePetSpecBar.id}" title="波波战队随军萌宠（${activePetSpecBar.role}）：${activePetSpecBar.statText(activePetLvlBar)}">${PET_COMPANION_INLINE_ART[activePetSpecBar.id]} ${activePetSpecBar.shortName} Lv.${activePetLvlBar}</span>`
    );
  }

  const hallBar = state.getTrophyHallBonus();
  if (hallBar.displayedCount > 0) {
    pills.push(
      `<span class="buff-pill rarity-epic trophy-hall-pill" title="奖杯馆：${hallBar.summaryText}">${UI_ART.trophyGoldCup} 荣誉陈列 ${hallBar.displayedCount} 座 · ${hallBar.rankTitle}</span>`
    );
  }

  const gachaSkinPill = state.getEquippedGachaSkinSpec();
  if (gachaSkinPill) {
    pills.push(
      `<span class="buff-pill rarity-epic gacha-skin-pill" title="波波战队皮肤扭蛋机：${gachaSkinPill.desc}（纯外观）">${UI_ART.skinCapsule} 装扮 ${gachaSkinPill.name}</span>`
    );
  }

  const decorSum = state.getDecorHallSummary();
  if (decorSum.comfort > 0) {
    pills.push(
      `<span class="buff-pill rarity-rare decor-hall-pill" title="波波战队主题装修大厅：${decorSum.theme.name}（装修以外观为主，舒适度每点金币 +${(DECOR_COMFORT_GOLD_PER_POINT * 100).toFixed(1)}%，上限 +${Math.round(DECOR_COMFORT_GOLD_CAP * 100)}%）">${UI_ART.lobbyTheme} 装修舒适 ${decorSum.comfort} · 金币+${decorSum.bonusPct}%</span>`
    );
  }

  const tacticHud = world.getTacticHudState();
  if (tacticHud) {
    const firedN = tacticHud.cards.filter((c) => c.fired).length;
    pills.push(
      `<span class="buff-pill rarity-epic tactic-deck-pill" title="波波战队战术卡组（每张每局触发 1 次，效果封顶${
        tacticHud.isCampaign ? `；主线战役系数 ×${tacticHud.effectMult.toFixed(1)}` : ''
      }）">${UI_ART.tacticDeck} 战术卡 ${firedN}/${tacticHud.cards.length} 已触发${
        tacticHud.isCampaign ? ` · 主线×${tacticHud.effectMult.toFixed(1)}` : ''
      }</span>`
    );
  }

  if (world.currentLevel.isPirateBoarding && world.jungleRun) {
    pills.push(
      `<span class="buff-pill rarity-legendary jungle-swing-pill pirate-boarding-pill">${UI_ART.pirateBoarding} 海盗船 ${world.getJungleProgressPct()}% · ${world.getJungleStateLabel()} · 波波 ${world.jungleBoboCount}</span>`
    );
  } else if (world.currentLevel.isJungleSwing && world.jungleRun) {
    pills.push(
      `<span class="buff-pill rarity-legendary jungle-swing-pill">${UI_ART.jungleSwing} 神庙 ${world.getJungleProgressPct()}% · ${world.getJungleStateLabel()} · 波波 ${world.jungleBoboCount}</span>`
    );
  }

  if (world.currentLevel.isPyramidRun && world.pyramidRun) {
    pills.push(
      `<span class="buff-pill rarity-legendary pyramid-run-pill">${UI_ART.pyramidRun} 墓道 ${world.getPyramidProgressPct()}% · ${world.getPyramidStateLabel()} · 波波 ${world.pyramidBoboCount}</span>`
    );
  }

  if (world.currentLevel.isPumpkinNight && world.pumpkinRun) {
    pills.push(
      `<span class="buff-pill rarity-legendary pumpkin-night-pill">${UI_ART.pumpkinNight} 古堡 ${world.getPumpkinProgressPct()}% · ${world.getPumpkinStateLabel()} · 灯光 ${world.getPumpkinLightPct()}% · 波波 ${world.pumpkinBoboCount}</span>`
    );
  }

  if (world.currentLevel.isAsteroidDash && world.asteroidRun) {
    pills.push(
      `<span class="buff-pill rarity-legendary asteroid-dash-pill">${UI_ART.asteroidDash} 星轨 ${world.getAsteroidProgressPct()}% · ${world.getAsteroidStateLabel()} · 波波 ${world.asteroidBoboCount}</span>`
    );
  }

  if (world.currentLevel.isLavaJump && world.lavaRun) {
    pills.push(
      `<span class="buff-pill rarity-legendary lava-jump-pill">${UI_ART.lavaJump} 熔岩 ${world.getLavaProgressPct()}% · ${world.getLavaStateLabel()} · 波波 ${world.lavaBoboCount}</span>`
    );
  }

  if (world.currentLevel.isGlacierSled && world.glacierSled) {
    pills.push(
      `<span class="buff-pill rarity-legendary glacier-sled-pill">${UI_ART.glacierSled} 雪橇 ${world.getSledProgressPct()}% · ${world.getSledStateLabel()} · 波波 ${world.sledRiderCount}</span>`
    );
  }

  if (world.currentLevel.isSubmarineRescue && world.submarine) {
    pills.push(
      `<span class="buff-pill rarity-legendary submarine-rescue-pill">${UI_ART.submarineRescue} 潜航 ${world.getSubmarineProgressPct()}% · ${world.getSubmarineStateLabel()} · 营救 ${world.subBobosRescued} 波波</span>`
    );
  }

  if (world.currentLevel.isCandyTrainRaid && world.candyTrain) {
    const train = world.candyTrain;
    const alive = world.getAliveCandyTrainCarCount();
    pills.push(
      `<span class="buff-pill rarity-legendary">${UI_ART.candyTrainRaid} 糖果列车 ${alive}/${train.cars.length} 节 · ${world.getCandyTrainStateLabel()} · ${UI_ART.trainGoldMedal} 已夺 ${world.candyTrainMedalsLooted}</span>`
    );
  } else if (world.currentLevel.isAirshipEscort && world.airshipMothership) {
    const ship = world.airshipMothership;
    const pct = world.getAirshipProgressPct();
    const dropPct = Math.round(ship.dropCharge);
    const aaLeft = world.getAliveAntiAirTurretCount();
    pills.push(
      `<span class="buff-pill rarity-legendary">${UI_ART.airshipEscort} 飞艇护航 ${pct}% · ${world.getAirshipStateLabel()} · 空投充能 ${dropPct}% · 拦截塔 ${aaLeft}/${world.antiAirTurrets.length}</span>`
    );
  } else if (world.currentLevel.isBonusHeist) {
    pills.push(
      `<span class="buff-pill rarity-legendary">${UI_ART.candyVault} 糖果大劫案 ${Math.ceil(world.bonusHeistTimeLeft)}s · 金库 ${world.bonusVaultsBroken}/${world.candyVaults.length}</span>`
    );
  } else if (world.currentLevel.isGearTournament) {
    const stTitle = world.currentLevel.tournamentStageTitle || '齿轮巅峰锦标赛';
    const stMult = (world.currentLevel.tournamentStreakMult || 1.5).toFixed(1);
    pills.push(
      `<span class="buff-pill rarity-legendary">${UI_ART.gearTournament} ${stTitle} · 倍率 ${stMult}x · 奖杯 ${state.tournamentTrophies}</span>`
    );
  } else if (world.currentLevel.isColossusRaid && world.colossusBoss) {
    const cb = world.colossusBoss;
    if (cb.paralysisTimer > 0) {
      pills.push(
        `<span class="buff-pill rarity-legendary">${UI_ART.clockworkCore} 瘫痪高倍暴击窗口 2.5x · 剩余 ${cb.paralysisTimer.toFixed(1)}s</span>`
      );
    } else {
      const intact = (cb.leftShieldAlive ? 1 : 0) + (cb.rightCannonAlive ? 1 : 0);
      pills.push(
        `<span class="buff-pill rarity-epic">${UI_ART.clockworkColossus} 发条攻坚第 ${cb.raidTier} 阶 · 剩余弱点臂 ${intact}/2</span>`
      );
    }
  } else if (world.currentLevel.isEndlessDefense) {
    const medal = state.getEndlessMedalInfo();
    pills.push(
      `<span class="buff-pill rarity-epic">${UI_ART.endlessShield} 无尽第 ${world.endlessWave} 波 · ${UI_ART.endlessMedal} 最佳 ${state.bestEndlessWave} 波(${medal.label})</span>`
    );
  } else if (world.currentLevel.isPayloadEscort && world.payloadCart) {
    const pct = world.getEscortProgressPct();
    const spd = world.payloadCart.speed.toFixed(1);
    const charge = Math.round(world.payloadCart.steamCharge);
    pills.push(
      `<span class="buff-pill rarity-legendary">${UI_ART.escortCart} 护送 ${pct}% · ${world.getEscortStateLabel()} (${spd}m/s · 气压${charge}%) · ${UI_ART.barricade} 破障 ${world.escortBarricadesBroken}/${world.escortBarricades.length}</span>`
    );
  }

  if (world.currentTheme) {
    pills.push(
      `<span class="buff-pill rarity-rare" title="${world.currentTheme.name}场景特效：${world.currentTheme.perkDesc}">${UI_ART.sparkle} ${world.currentTheme.badge}·${world.currentTheme.perkTitle}</span>`
    );
  }

  if (world.currentLevel.weatherAffix) {
    const wf = world.currentLevel.weatherAffix;
    const wfIcon = UI_ART[wf.iconKey] || UI_ART.envTailwind;
    pills.push(
      `<span class="buff-pill rarity-epic" title="动态天气机关桥词缀【${wf.name}】：${wf.desc}">${wfIcon} ${wf.shortBadge}</span>`
    );
  }

  if (world.mechaOverlord?.active) {
    const mo = world.mechaOverlord;
    const spec = state.getMechaOverlordSpec();
    const hpPct = Math.max(1, Math.round((mo.hp / Math.max(1, mo.maxHp)) * 100));
    pills.push(
      `<span class="buff-pill rarity-legendary" title="双管合体大机偶在场推进中">${UI_ART.mechaOverlord} 机偶${spec.mkLabel} ${hpPct}% · ${Math.ceil(mo.lifeTimer)}s</span>`
    );
  }

  if (world.syrupZone?.active) {
    pills.push(
      `<span class="buff-pill rarity-epic" title="糖浆减速泡持续迟滞并放大抓捕队所受伤害">${TACTICAL_SUBWEAPON_INLINE_ART.syrup_bubble} 糖浆泡 ${Math.ceil(world.syrupZone.timer)}s</span>`
    );
  }

  if (world.rallyAuraFx?.active) {
    pills.push(
      `<span class="buff-pill rarity-legendary" title="鼓舞号角光环持续提升全军移速与攻速">${TACTICAL_SUBWEAPON_INLINE_ART.rally_horn} 号角光环 ${Math.ceil(world.rallyAuraFx.timer)}s</span>`
    );
  }

  if (world.bossShieldActive) {
    pills.push(
      `<span class="buff-pill rarity-epic" title="大Boss超压护盾：减伤88%，需集火${world.bossShieldHitsRemaining}次或用轰炸/炸药桶瞬间击碎">${UI_ART.shield} 超压护盾(${world.bossShieldHitsRemaining})</span>`
    );
  }

  const aliveSubTowers = world.getAliveSubTowerCount();
  if (aliveSubTowers > 0) {
    const drPct = aliveSubTowers >= 2 ? 76 : 42;
    pills.push(
      `<span class="buff-pill rarity-epic" title="双侧蒸汽护盾副塔正为厂房供能减伤 ${drPct}%！往左右两侧出兵，先拔掉副塔就能破盾重创厂房">${UI_ART.shield} 蒸汽副塔(${aliveSubTowers}/2 · 减伤${drPct}%)</span>`
    );
  }

  if (world.bossSteamSweep && world.bossSteamSweep.phase !== 'idle') {
    const laneName = world.bossSteamSweep.lane === 'left' ? '左半桥' : '右半桥';
    const statusLabel =
      world.bossSteamSweep.phase === 'telegraph'
        ? `${laneName}蒸汽预警(${Math.max(0.1, world.bossSteamSweep.timer).toFixed(1)}s)`
        : `${laneName}高压横扫中`;
    pills.push(
      `<span class="buff-pill debuff-pill" title="厂房正在向${laneName}喷射高压蒸汽波，立即拖动炮车切换至另一侧半桥规避！">${UI_ART.warning} ${statusLabel}</span>`
    );
  }

  if (world.bossBerserkTriggered) {
    pills.push(`<span class="buff-pill debuff-pill" title="厂房暴走阶段">${UI_ART.warning} 暴走</span>`);
  }

  if (world.adrenalineTimer > 0) {
    pills.push(
      `<span class="buff-pill rarity-legendary" title="连击热潮：全军射速移速+22%">${UI_ART.flame} ${world.adrenalineTimer.toFixed(0)}s</span>`
    );
  }

  if (world.dualVolleyTimer > 0) {
    pills.push(
      `<span class="buff-pill rarity-legendary" title="空投增益：双倍连射齐发">${UI_ART.tacticalAirdrop} 双倍连射 ${Math.ceil(world.dualVolleyTimer)}s</span>`
    );
  }
  if (world.freezeRedsTimer > 0) {
    pills.push(
      `<span class="buff-pill rarity-epic" title="空投增益：冰霜缓敌72%">${UI_ART.tacticalAirdrop} 冰霜缓敌 ${Math.ceil(world.freezeRedsTimer)}s</span>`
    );
  }
  if (world.frontlineGiantsTimer > 0) {
    pills.push(
      `<span class="buff-pill rarity-legendary" title="空投增益：前线全军小巨人阵">${UI_ART.tacticalAirdrop} 前线巨人阵 ${Math.ceil(world.frontlineGiantsTimer)}s</span>`
    );
  }

  const badges = state.getActiveBuffBadges();
  for (const b of badges) {
    pills.push(`<span class="buff-pill rarity-${b.rarity}">${b.icon} ${b.text}</span>`);
  }

  for (const d of state.activeDebuffs) {
    pills.push(
      `<span class="buff-pill debuff-pill" title="${d.title}：${d.desc}">${d.icon} ${d.shortText}(${d.remainingStages})</span>`
    );
  }

  activeBuffsBar.innerHTML = pills.join('');
  activeBuffsBar.style.display = pills.length > 0 ? 'flex' : 'none';
}

function updateRewardModalHeaderUI(): void {
  const stageNum = state.currentLevelIndex + 1;
  const mult = getActiveRewardMultiplier();
  const cost = getRewardRerollCost();

  if (rewardGoldBalanceEl) {
    rewardGoldBalanceEl.innerHTML = `${UI_ART.coin} ${Math.floor(state.gold).toLocaleString()}`;
  }
  if (btnRerollRewards) {
    btnRerollRewards.innerHTML = `${UI_ART.dice} 刷新 (${UI_ART.coin}${cost.toLocaleString()})<kbd class="kbd-hint">R</kbd>`;
    btnRerollRewards.disabled = hasClaimedStageReward || state.gold < cost;
  }

  if (speedSkipBanner) {
    speedSkipBanner.classList.toggle('hidden', !isSpeedSkipEligible);
  }
  if (speedSkipText) {
    speedSkipText.textContent = isSpeedSkipActive
      ? `直达第 ${stageNum + 3} 关 · 当前奖励卡效果 ×3（等同连选3关）`
      : `已切换普通推进（下一关：第 ${stageNum + 1} 关 · 奖励卡 ×1）`;
  }
  if (btnToggleSpeedSkip) {
    btnToggleSpeedSkip.classList.toggle('active', isSpeedSkipActive);
    btnToggleSpeedSkip.innerHTML = `${isSpeedSkipActive ? `${UI_ART.check} 跳2关 (×3倍)` : '普通过关 (×1)'}<kbd class="kbd-hint">X</kbd>`;
  }

  const opt = selectedRewardIndex >= 0 ? currentRewardOptions[selectedRewardIndex] : null;
  if (opt) {
    rewardPromptText.innerHTML = `${UI_ART.check} 已选「${opt.title}」${mult > 1 ? ' (×3倍生效)' : ''}`;
    btnModalNext.disabled = false;
    if (pendingBonusHeistStage > 0) {
      btnModalNext.classList.add('btn-bonus-heist-cta');
      btnModalNext.innerHTML = `${UI_ART.candyVault} 开启糖果金库大劫案 (25s)<kbd class="kbd-hint">Space</kbd>`;
    } else {
      btnModalNext.classList.remove('btn-bonus-heist-cta');
      btnModalNext.innerHTML = `${mult > 1 ? `${UI_ART.bolt} 跳2关 → 第 ${stageNum + 3} 关` : `${UI_ART.rocket} 下一关`}<kbd class="kbd-hint">Space</kbd>`;
    }
  } else {
    const tierLabel = currentRewardOptions[0]?.rarityLabel || '普通强化';
    rewardPromptText.innerHTML = `${UI_ART.gift} 战利品三选一 · 【${tierLabel}】`;
    btnModalNext.disabled = true;
    btnModalNext.classList.remove('btn-bonus-heist-cta');
    btnModalNext.innerHTML = `请选择上方强化<kbd class="kbd-hint">1-3</kbd>`;
  }
}

function renderRewardCardsDOM(): void {
  const mult = getActiveRewardMultiplier();
  rewardCardsContainer.innerHTML = '';
  currentRewardOptions.forEach((opt, idx) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `reward-card rarity-${opt.rarity} ${mult > 1 ? 'speed-x3' : ''} ${idx === selectedRewardIndex ? 'selected' : ''}`;
    card.innerHTML = `
      <span class="reward-rarity">${opt.rarityLabel}</span>
      <div class="reward-icon">${opt.icon}</div>
      <div class="reward-text-wrap">
        <div class="reward-title">${opt.title}<kbd class="kbd-hint">${idx + 1}</kbd></div>
        <div class="reward-effect-box">
          <div class="reward-desc">${opt.desc}</div>
          <div class="reward-cur">${opt.currentText}</div>
        </div>
      </div>
    `;
    card.addEventListener('click', () => {
      selectStageRewardCard(idx);
    });
    rewardCardsContainer.appendChild(card);
  });
}

function selectStageRewardCard(cardIndex: number): void {
  if (hasClaimedStageReward) return;
  const opt = currentRewardOptions[cardIndex];
  if (!opt) return;

  selectedRewardIndex = cardIndex;
  sound.playUpgrade();

  const cards = rewardCardsContainer.querySelectorAll<HTMLElement>('.reward-card');
  cards.forEach((c, idx) => {
    c.classList.toggle('selected', idx === cardIndex);
  });

  updateRewardModalHeaderUI();
}

function commitStageReward(): boolean {
  if (hasClaimedStageReward) return true;
  if (selectedRewardIndex < 0 || !currentRewardOptions[selectedRewardIndex]) {
    rewardPromptText.innerHTML = `${UI_ART.warning} 请先点选一张战利品强化卡片`;
    return false;
  }
  const opt = currentRewardOptions[selectedRewardIndex];
  hasClaimedStageReward = true;
  const stageNum = state.currentLevelIndex + 1;
  state.applyRewardBuff(opt.id, stageNum, opt.rarity, opt.stacksGranted);
  sound.playUpgrade();
  refreshUpgradeUI();
  renderActiveBuffsBar();
  updateRewardModalHeaderUI();
  return true;
}

function presentRewardChoices(stageNum: number): void {
  hasClaimedStageReward = false;
  selectedRewardIndex = -1;
  currentRewardOptions = state.rollStageRewards(stageNum, 3, getActiveRewardMultiplier());
  rewardSection.classList.remove('hidden');
  renderRewardCardsDOM();
  updateRewardModalHeaderUI();
}

if (btnRerollRewards) {
  btnRerollRewards.addEventListener('click', () => {
    if (hasClaimedStageReward) return;
    const cost = getRewardRerollCost();
    if (state.gold < cost) return;
    state.gold -= cost;
    state.save();
    stageRewardRerollCount += 1;
    sound.playUpgrade();
    const stageNum = state.currentLevelIndex + 1;
    selectedRewardIndex = -1;
    currentRewardOptions = state.rollStageRewards(stageNum, 3, getActiveRewardMultiplier());
    renderRewardCardsDOM();
    updateRewardModalHeaderUI();
    refreshUpgradeUI();
  });
}

if (btnToggleSpeedSkip) {
  btnToggleSpeedSkip.addEventListener('click', () => {
    if (!isSpeedSkipEligible || hasClaimedStageReward) return;
    isSpeedSkipActive = !isSpeedSkipActive;
    sound.playUpgrade();
    const stageNum = state.currentLevelIndex + 1;
    currentRewardOptions = state.rebuildRewardOptions(
      stageNum,
      currentRewardOptions,
      getActiveRewardMultiplier()
    );
    renderRewardCardsDOM();
    updateRewardModalHeaderUI();
  });
}

let currentCleanseCost = 50;

(window as unknown as Record<string, unknown>).__triggerVictoryModal = () => {
  world.stageCombatTime = 7.8;
  world.isStageEnded = true;
  world.onStageEnd?.(true);
};
(window as unknown as Record<string, unknown>).__triggerDefeatModal = () => {
  world.isStageEnded = true;
  world.onStageEnd?.(false);
};

world.onStageEnd = (victory: boolean) => {
  topToolsDrawer?.classList.add('hidden');
  centerBanner.classList.add('hidden');
  resultModal.classList.remove('hidden');
  setResultStatBoxes(null);
  const stageNum = state.currentLevelIndex + 1;

  // Reset modal button defaults before branching by mode
  tournamentChestSection?.classList.add('hidden');
  btnModalReplay.style.display = 'inline-block';
  btnModalReplay.innerHTML = `<img class="art-icon-img inline-art-img" src="/assets/icons/ui_dice.png?v=36" alt="" loading="${ART_LOADING}" draggable="false" /><span>重玩</span><kbd class="kbd-hint">P</kbd>`;
  btnModalNext.classList.remove('btn-bonus-heist-cta');
  // Medal-run modes keep the modal line short and park the per-hazard / medal breakdown in this tooltip
  modalDesc.title = '';

  if (world.currentLevel?.isPirateBoarding) {
    const prRun = world.jungleRun;
    const limit = prRun?.timeLimit || world.currentLevel.jungleCourse?.timeLimitSec || 40;
    const finishSec = victory ? Math.max(1, world.jungleFinishSec || world.stageCombatTime) : limit;
    const survivors = world.getLavaBoboCount();
    const progressPct = world.getJungleProgressPct();
    const trapProg = world.getJungleTrapProgress();
    const rec = state.recordPirateBoardingResult(
      victory,
      finishSec,
      limit,
      survivors,
      world.jungleBobosLost,
      world.jungleTrapsDodged,
      progressPct
    );
    setResultStatBoxes({ victory, finishSec, progressPct, survivors, metricLabel: '过机关', metricValue: `${trapProg.passed}/${trapProg.total}` });
    const nextPrSpec = state.getPirateBoardingSpec();
    const prMs = state.getGoldSkullMilestoneBonus();
    const tacticHud = world.getTacticHudState();
    const tacticTxt = tacticHud ? ` · 战术卡触发 ${tacticHud.cards.filter((c) => c.fired).length}/${tacticHud.cards.length}` : '';
    const milestoneTxt = rec.milestoneReached
      ? ` · 晋升【${rec.milestoneRankTitle}】+${rec.milestoneBonusCoins} ${UI_ART.coin}`
      : '';
    resultModal.classList.toggle('victory-mode', victory);
    rewardSection.classList.add('hidden');
    penaltySection.classList.add('hidden');
    if (victory) {
      world.triggerScreenFlash('#facc15', 0.7);
      const baseBadges = rec.badgesAwarded - rec.timeBonusBadges - rec.survivorBonusBadges - rec.trapBonusBadges;
      modalBadge.innerHTML = `${UI_ART.pirateBoarding} PIRATE PLANK · 第 ${rec.pirateTierCleared} 阶冲上旗舰`;
      modalTitle.innerHTML = `${UI_ART.goldSkull} 波波团冲上海盗旗舰！`;
      modalDesc.innerHTML = `${rec.isNewSpeedRecord ? '新纪录 · ' : ''}损失 ${world.jungleBobosLost} · 金骷髅徽章 +${rec.badgesAwarded} ${UI_ART.goldSkull} · 金币 +${rec.coinsAwarded} ${UI_ART.coin}${milestoneTxt}`;
      modalDesc.title = `损失：落水 ${world.jungleChasmFell} · 炮弹 ${world.jungleBoulderFlattened} · 踩跳板 ${world.jungleVineSwings} 次 · 机关全身而过 ${world.jungleTrapsDodged} 处 · 加人门 ${world.jungleGatesPassed}${tacticTxt}\n徽章：基础 ${baseBadges} + 时速 ${rec.timeBonusBadges} + 幸存 ${rec.survivorBonusBadges} + 机关 ${rec.trapBonusBadges} · 段位 ${prMs.rankTitle}`;
      btnModalReplay.style.display = 'inline-block';
      btnModalReplay.innerHTML = `${UI_ART.pirateBoarding} <span>再闯一次</span><kbd class="kbd-hint">P</kbd>`;
      btnModalNext.disabled = false;
      btnModalNext.style.display = 'inline-block';
      btnModalNext.innerHTML = `${UI_ART.pirateBoarding} 挑战第 ${nextPrSpec.pirateTier} 阶<kbd class="kbd-hint">Space</kbd>`;
    } else {
      const reason = prRun?.state === 'wiped' ? '波波全部落水' : '超时没冲上旗舰';
      modalBadge.innerHTML = `${UI_ART.pirateBoarding} PIRATE PLANK · 突围失败`;
      modalTitle.innerHTML = `${UI_ART.warning} ${reason} · 零战败扣罚`;
      modalDesc.innerHTML =
        rec.badgesAwarded > 0 || rec.coinsAwarded > 0
          ? `保留战利品：金骷髅徽章 +${rec.badgesAwarded} ${UI_ART.goldSkull} · 金币 +${rec.coinsAwarded} ${UI_ART.coin}${milestoneTxt}！海面前提前对准摇晃的跳板，看到红色炮道就往旁边闪！`
          : `零金币扣罚！海面前提前对准摇晃的跳板，看到红色炮道就往旁边闪！`;
      btnModalNext.style.display = 'none';
      btnModalReplay.innerHTML = `${UI_ART.pirateBoarding} <span>再闯一次</span><kbd class="kbd-hint">P</kbd>`;
    }
    if (btnModalShare) btnModalShare.style.display = 'inline-block';
    refreshUpgradeUI();
    renderMainMenu();
    renderActiveBuffsBar();
    return;
  }

  if (world.currentLevel?.isJungleSwing) {
    const jgRun = world.jungleRun;
    const limit = jgRun?.timeLimit || world.currentLevel.jungleCourse?.timeLimitSec || 41;
    const finishSec = victory ? Math.max(1, world.jungleFinishSec || world.stageCombatTime) : limit;
    const survivors = world.getLavaBoboCount();
    const progressPct = world.getJungleProgressPct();
    const rec = state.recordJungleSwingResult(
      victory,
      finishSec,
      limit,
      survivors,
      world.jungleBobosLost,
      world.jungleTrapsDodged,
      progressPct
    );
    const jgTraps = world.getJungleTrapProgress();
    setResultStatBoxes({ victory, finishSec, progressPct, survivors, metricLabel: '过机关', metricValue: `${jgTraps.passed}/${jgTraps.total}` });
    const nextJgSpec = state.getJungleSwingSpec();
    const jgMs = state.getEmeraldIdolMilestoneBonus();
    const tacticHud = world.getTacticHudState();
    const tacticTxt = tacticHud ? ` · 战术卡触发 ${tacticHud.cards.filter((c) => c.fired).length}/${tacticHud.cards.length}` : '';
    const milestoneTxt = rec.milestoneReached
      ? ` · 晋升【${rec.milestoneRankTitle}】+${rec.milestoneBonusCoins} ${UI_ART.coin}`
      : '';
    resultModal.classList.toggle('victory-mode', victory);
    rewardSection.classList.add('hidden');
    penaltySection.classList.add('hidden');
    if (victory) {
      world.triggerScreenFlash('#10b981', 0.7);
      const baseBadges = rec.badgesAwarded - rec.timeBonusBadges - rec.survivorBonusBadges - rec.trapBonusBadges;
      modalBadge.innerHTML = `${UI_ART.jungleSwing} JUNGLE SWING · 第 ${rec.jungleTierCleared} 阶冲出神庙`;
      modalTitle.innerHTML = `${UI_ART.emeraldIdol} 波波团冲出丛林神庙！`;
      modalDesc.innerHTML = `${rec.isNewSpeedRecord ? '新纪录 · ' : ''}损失 ${world.jungleBobosLost} · 翡翠神像徽章 +${rec.badgesAwarded} ${UI_ART.emeraldIdol} · 金币 +${rec.coinsAwarded} ${UI_ART.coin}${milestoneTxt}`;
      modalDesc.title = `损失：坠崖 ${world.jungleChasmFell} · 滚石 ${world.jungleBoulderFlattened} · 荡藤蔓 ${world.jungleVineSwings} 次 · 机关全身而过 ${world.jungleTrapsDodged} 处 · 加人门 ${world.jungleGatesPassed}${tacticTxt}\n徽章：基础 ${baseBadges} + 时速 ${rec.timeBonusBadges} + 幸存 ${rec.survivorBonusBadges} + 机关 ${rec.trapBonusBadges} · 段位 ${jgMs.rankTitle}`;
      btnModalReplay.style.display = 'inline-block';
      btnModalReplay.innerHTML = `${UI_ART.trophyHall} <span>奖杯馆</span><kbd class="kbd-hint">P</kbd>`;
      btnModalNext.disabled = false;
      btnModalNext.style.display = 'inline-block';
      btnModalNext.innerHTML = `${UI_ART.jungleSwing} 挑战第 ${nextJgSpec.jungleTier} 阶<kbd class="kbd-hint">Space</kbd>`;
    } else {
      const reason = jgRun?.state === 'wiped' ? '波波全被机关困住' : '超时困在神庙里';
      modalBadge.innerHTML = `${UI_ART.jungleSwing} JUNGLE SWING · 闯神庙失败`;
      modalTitle.innerHTML = `${UI_ART.warning} ${reason} · 零战败扣罚`;
      modalDesc.innerHTML =
        rec.badgesAwarded > 0 || rec.coinsAwarded > 0
          ? `保留战利品：翡翠神像徽章 +${rec.badgesAwarded} ${UI_ART.emeraldIdol} · 金币 +${rec.coinsAwarded} ${UI_ART.coin}${milestoneTxt}！断崖前提前对准藤蔓，看到橙色滚道就往旁边闪！`
          : `零金币扣罚！断崖前提前对准藤蔓，看到橙色滚道就往旁边闪！`;
      btnModalNext.style.display = 'none';
      btnModalReplay.innerHTML = `${UI_ART.jungleSwing} <span>再闯神庙</span><kbd class="kbd-hint">P</kbd>`;
    }
    if (btnModalShare) btnModalShare.style.display = 'inline-block';
    refreshUpgradeUI();
    renderMainMenu();
    renderActiveBuffsBar();
    return;
  }

  if (world.currentLevel?.isPyramidRun) {
    const pyRun = world.pyramidRun;
    const limit = pyRun?.timeLimit || world.currentLevel.pyramidCourse?.timeLimitSec || 41;
    const finishSec = victory ? Math.max(1, world.pyramidFinishSec || world.stageCombatTime) : limit;
    const survivors = world.getLavaBoboCount();
    const progressPct = world.getPyramidProgressPct();
    const rec = state.recordPyramidRunResult(
      victory,
      finishSec,
      limit,
      survivors,
      world.pyramidBobosLost,
      world.pyramidTrapsDodged,
      progressPct
    );
    const pyTraps = world.getPyramidTrapProgress();
    setResultStatBoxes({ victory, finishSec, progressPct, survivors, metricLabel: '过机关', metricValue: `${pyTraps.passed}/${pyTraps.total}` });
    const nextPySpec = state.getPyramidRunSpec();
    const pyMs = state.getScarabMilestoneBonus();
    const tacticHud = world.getTacticHudState();
    const tacticTxt = tacticHud ? ` · 战术卡触发 ${tacticHud.cards.filter((c) => c.fired).length}/${tacticHud.cards.length}` : '';
    const milestoneTxt = rec.milestoneReached
      ? ` · 晋升【${rec.milestoneRankTitle}】+${rec.milestoneBonusCoins} ${UI_ART.coin}`
      : '';
    resultModal.classList.toggle('victory-mode', victory);
    rewardSection.classList.add('hidden');
    penaltySection.classList.add('hidden');
    if (victory) {
      world.triggerScreenFlash('#eab308', 0.7);
      const baseBadges = rec.badgesAwarded - rec.timeBonusBadges - rec.survivorBonusBadges - rec.trapBonusBadges;
      modalBadge.innerHTML = `${UI_ART.pyramidRun} PYRAMID RUN · 第 ${rec.pyramidTierCleared} 阶冲出墓道`;
      modalTitle.innerHTML = `${UI_ART.scarabBadge} 波波团冲出金字塔墓道！`;
      modalDesc.innerHTML = `${rec.isNewSpeedRecord ? '新纪录 · ' : ''}损失 ${world.pyramidBobosLost} · 圣甲虫徽章 +${rec.badgesAwarded} ${UI_ART.scarabBadge} · 金币 +${rec.coinsAwarded} ${UI_ART.coin}${milestoneTxt}`;
      modalDesc.title = `损失：流沙 ${world.pyramidSandSwallowed} · 翻板 ${world.pyramidSlabFlung} · 机关全身而过 ${world.pyramidTrapsDodged} 处 · 加人门 ${world.pyramidGatesPassed}${tacticTxt}\n徽章：基础 ${baseBadges} + 时速 ${rec.timeBonusBadges} + 幸存 ${rec.survivorBonusBadges} + 机关 ${rec.trapBonusBadges} · 段位 ${pyMs.rankTitle}`;
      btnModalReplay.style.display = 'inline-block';
      btnModalReplay.innerHTML = `${UI_ART.trophyHall} <span>奖杯馆</span><kbd class="kbd-hint">P</kbd>`;
      btnModalNext.disabled = false;
      btnModalNext.style.display = 'inline-block';
      btnModalNext.innerHTML = `${UI_ART.pyramidRun} 挑战第 ${nextPySpec.pyramidTier} 阶<kbd class="kbd-hint">Space</kbd>`;
    } else {
      const reason = pyRun?.state === 'wiped' ? '波波全被机关吞没' : '超时困在墓道里';
      modalBadge.innerHTML = `${UI_ART.pyramidRun} PYRAMID RUN · 闯墓道失败`;
      modalTitle.innerHTML = `${UI_ART.warning} ${reason} · 零战败扣罚`;
      modalDesc.innerHTML =
        rec.badgesAwarded > 0 || rec.coinsAwarded > 0
          ? `保留战利品：圣甲虫徽章 +${rec.badgesAwarded} ${UI_ART.scarabBadge} · 金币 +${rec.coinsAwarded} ${UI_ART.coin}${milestoneTxt}！流沙里别停留、踩金边石板路，石板发红抖动时换一块走！`
          : `零金币扣罚！流沙里别停留、踩金边石板路，石板发红抖动时换一块走！`;
      btnModalNext.style.display = 'none';
      btnModalReplay.innerHTML = `${UI_ART.pyramidRun} <span>再闯墓道</span><kbd class="kbd-hint">P</kbd>`;
    }
    if (btnModalShare) btnModalShare.style.display = 'inline-block';
    refreshUpgradeUI();
    renderMainMenu();
    renderActiveBuffsBar();
    return;
  }

  if (world.currentLevel?.isPumpkinNight) {
    const pkRun = world.pumpkinRun;
    const limit = pkRun?.timeLimit || world.currentLevel.pumpkinCourse?.timeLimitSec || 41;
    const finishSec = victory ? Math.max(1, world.pumpkinFinishSec || world.stageCombatTime) : limit;
    const survivors = world.getLavaBoboCount();
    const progressPct = world.getPumpkinProgressPct();
    const rec = state.recordPumpkinNightResult(
      victory,
      finishSec,
      limit,
      survivors,
      world.pumpkinBobosLost,
      world.pumpkinGhostsDispelled,
      progressPct
    );
    const pkGhosts = world.getPumpkinGhostProgress();
    setResultStatBoxes({ victory, finishSec, progressPct, survivors, metricLabel: '驱散幽灵', metricValue: `${world.pumpkinGhostsDispelled}/${pkGhosts.total}` });
    const nextPkSpec = state.getPumpkinNightSpec();
    const pkMs = state.getPumpkinMilestoneBonus();
    const tacticHud = world.getTacticHudState();
    const tacticTxt = tacticHud ? ` · 战术卡触发 ${tacticHud.cards.filter((c) => c.fired).length}/${tacticHud.cards.length}` : '';
    const milestoneTxt = rec.milestoneReached
      ? ` · 晋升【${rec.milestoneRankTitle}】+${rec.milestoneBonusCoins} ${UI_ART.coin}`
      : '';
    resultModal.classList.toggle('victory-mode', victory);
    rewardSection.classList.add('hidden');
    penaltySection.classList.add('hidden');
    if (victory) {
      world.triggerScreenFlash('#fb923c', 0.7);
      const baseBadges = rec.badgesAwarded - rec.timeBonusBadges - rec.survivorBonusBadges - rec.dispelBonusBadges;
      modalBadge.innerHTML = `${UI_ART.pumpkinNight} PUMPKIN NIGHT · 第 ${rec.pumpkinTierCleared} 阶冲出古堡`;
      modalTitle.innerHTML = `${UI_ART.pumpkinBadge} 波波团冲出古堡城门！`;
      modalDesc.innerHTML = `${rec.isNewSpeedRecord ? '新纪录 · ' : ''}南瓜灯徽章 +${rec.badgesAwarded} ${UI_ART.pumpkinBadge} · 金币 +${rec.coinsAwarded} ${UI_ART.coin}${milestoneTxt}`;
      modalDesc.title = `损失 ${world.pumpkinBobosLost} · 照明区驱鬼 ${world.pumpkinLampDispels} · 南瓜灯补光 ${world.pumpkinLampsLit} 处 · 加人门 ${world.pumpkinGatesPassed}${tacticTxt}\n徽章：基础 ${baseBadges} + 时速 ${rec.timeBonusBadges} + 幸存 ${rec.survivorBonusBadges} + 驱鬼 ${rec.dispelBonusBadges} · 段位 ${pkMs.rankTitle}`;
      btnModalReplay.style.display = 'inline-block';
      btnModalReplay.innerHTML = `${UI_ART.tacticDeck} <span>战术卡组</span><kbd class="kbd-hint">P</kbd>`;
      btnModalNext.disabled = false;
      btnModalNext.style.display = 'inline-block';
      btnModalNext.innerHTML = `${UI_ART.pumpkinNight} 挑战第 ${nextPkSpec.pumpkinTier} 阶<kbd class="kbd-hint">Space</kbd>`;
    } else {
      const reason = pkRun?.state === 'wiped' ? '波波全被幽灵吓跑' : '超时被困在古堡里';
      modalBadge.innerHTML = `${UI_ART.pumpkinNight} PUMPKIN NIGHT · 闯堡失败`;
      modalTitle.innerHTML = `${UI_ART.warning} ${reason} · 零战败扣罚`;
      modalDesc.innerHTML =
        rec.badgesAwarded > 0 || rec.coinsAwarded > 0
          ? `保留战利品：南瓜灯徽章 +${rec.badgesAwarded} ${UI_ART.pumpkinBadge} · 金币 +${rec.coinsAwarded} ${UI_ART.coin}${milestoneTxt}！多踩南瓜灯照明区补光，灯光够亮才能驱散幽灵，钻城墙拱门！`
          : `零金币扣罚！多踩南瓜灯照明区补光，灯光够亮才能驱散幽灵，钻城墙拱门！`;
      btnModalNext.style.display = 'none';
      btnModalReplay.innerHTML = `${UI_ART.pumpkinNight} <span>再闯古堡</span><kbd class="kbd-hint">P</kbd>`;
    }
    if (btnModalShare) btnModalShare.style.display = 'inline-block';
    refreshUpgradeUI();
    renderMainMenu();
    renderActiveBuffsBar();
    return;
  }

  if (world.currentLevel?.isAsteroidDash) {
    const astRun = world.asteroidRun;
    const limit = astRun?.timeLimit || world.currentLevel.asteroidCourse?.timeLimitSec || 40;
    const finishSec = victory ? Math.max(1, world.asteroidFinishSec || world.stageCombatTime) : limit;
    const survivors = world.getLavaBoboCount();
    const progressPct = world.getAsteroidProgressPct();
    const rec = state.recordAsteroidDashResult(
      victory,
      finishSec,
      limit,
      survivors,
      world.asteroidBobosLost,
      world.asteroidShieldBlocks,
      progressPct
    );
    setResultStatBoxes({ victory, finishSec, progressPct, survivors, metricLabel: '躲过陨石', metricValue: `${world.asteroidHazardsDodged}` });
    const nextAstSpec = state.getAsteroidDashSpec();
    const starMs = state.getStardustMilestoneBonus();
    const milestoneTxt = rec.milestoneReached
      ? ` · 晋升【${rec.milestoneRankTitle}】+${rec.milestoneBonusCoins} ${UI_ART.coin}`
      : '';
    resultModal.classList.toggle('victory-mode', victory);
    rewardSection.classList.add('hidden');
    penaltySection.classList.add('hidden');
    if (victory) {
      world.triggerScreenFlash('#a78bfa', 0.7);
      const baseBadges = rec.badgesAwarded - rec.timeBonusBadges - rec.survivorBonusBadges;
      modalBadge.innerHTML = `${UI_ART.asteroidDash} ASTEROID DASH · 第 ${rec.asteroidTierCleared} 阶突围成功`;
      modalTitle.innerHTML = `${UI_ART.stardustBadge} 波波团冲进星光门！`;
      modalDesc.innerHTML = `${rec.isNewSpeedRecord ? '新纪录 · ' : ''}损失 ${world.asteroidBobosLost} · 星尘徽章 +${rec.badgesAwarded} ${UI_ART.stardustBadge} · 金币 +${rec.coinsAwarded} ${UI_ART.coin}${milestoneTxt}`;
      modalDesc.title = `护盾挡下 ${world.asteroidShieldBlocks} 次 · 加人门 ${world.asteroidGatesPassed}\n徽章：基础 ${baseBadges} + 时速 ${rec.timeBonusBadges} + 幸存 ${rec.survivorBonusBadges} · 段位 ${starMs.rankTitle}`;
      btnModalReplay.style.display = 'inline-block';
      btnModalReplay.innerHTML = `${UI_ART.lobbyTheme} <span>主题装修大厅</span><kbd class="kbd-hint">P</kbd>`;
      btnModalNext.disabled = false;
      btnModalNext.style.display = 'inline-block';
      btnModalNext.innerHTML = `${UI_ART.asteroidDash} 挑战第 ${nextAstSpec.asteroidTier} 阶<kbd class="kbd-hint">Space</kbd>`;
    } else {
      const reason = astRun?.state === 'wiped' ? '波波全部被陨石冲散' : '超时迷失在陨石带';
      modalBadge.innerHTML = `${UI_ART.asteroidDash} ASTEROID DASH · 突围失败`;
      modalTitle.innerHTML = `${UI_ART.warning} ${reason} · 零战败扣罚`;
      modalDesc.innerHTML =
        rec.badgesAwarded > 0 || rec.coinsAwarded > 0
          ? `保留战利品：星尘徽章 +${rec.badgesAwarded} ${UI_ART.stardustBadge} · 金币 +${rec.coinsAwarded} ${UI_ART.coin}${milestoneTxt}！躲开红色落点圈，从陨石带绿色缺口穿过，先拿青色护盾门！`
          : `零金币扣罚！躲开红色落点圈，从陨石带绿色缺口穿过，先拿青色护盾门！`;
      btnModalNext.style.display = 'none';
      btnModalReplay.innerHTML = `${UI_ART.asteroidDash} <span>重新突围</span><kbd class="kbd-hint">P</kbd>`;
    }
    if (btnModalShare) btnModalShare.style.display = 'inline-block';
    refreshUpgradeUI();
    renderMainMenu();
    renderActiveBuffsBar();
    return;
  }

  if (world.currentLevel?.isLavaJump) {
    const lavaRun = world.lavaRun;
    const limit = lavaRun?.timeLimit || world.currentLevel.lavaCourse?.timeLimitSec || 40;
    const finishSec = victory ? Math.max(1, world.lavaFinishSec || world.stageCombatTime) : limit;
    const survivors = world.getLavaBoboCount();
    const progressPct = world.getLavaProgressPct();
    const rec = state.recordLavaJumpResult(
      victory,
      finishSec,
      limit,
      survivors,
      world.lavaBobosLost,
      world.lavaHops,
      progressPct
    );
    const lavaRows = world.getLavaRowProgress();
    setResultStatBoxes({ victory, finishSec, progressPct, survivors, metricLabel: '过跳台', metricValue: `${lavaRows.reached}/${lavaRows.total}` });
    const nextLavaSpec = state.getLavaJumpSpec();
    const lavaMs = state.getLavaCoreMilestoneBonus();
    const milestoneTxt = rec.milestoneReached
      ? ` · 晋升【${rec.milestoneRankTitle}】+${rec.milestoneBonusCoins} ${UI_ART.coin}`
      : '';
    resultModal.classList.toggle('victory-mode', victory);
    rewardSection.classList.add('hidden');
    penaltySection.classList.add('hidden');
    if (victory) {
      world.triggerScreenFlash('#fb923c', 0.7);
      const baseCores = rec.coresAwarded - rec.timeBonusCores - rec.survivorBonusCores;
      modalBadge.innerHTML = `${UI_ART.lavaJump} LAVA JUMP · 第 ${rec.lavaTierCleared} 阶突围成功`;
      modalTitle.innerHTML = `${UI_ART.lavaCore} 波波团冲出火山口！`;
      modalDesc.innerHTML = `${rec.isNewSpeedRecord ? '新纪录 · ' : ''}损失 ${world.lavaBobosLost} · 熔岩晶核 +${rec.coresAwarded} ${UI_ART.lavaCore} · 金币 +${rec.coinsAwarded} ${UI_ART.coin}${milestoneTxt}`;
      modalDesc.title = `跳台 ${world.lavaHops} · 加人门 ${world.lavaGatesPassed}\n晶核：基础 ${baseCores} + 时速 ${rec.timeBonusCores} + 幸存 ${rec.survivorBonusCores} · 段位 ${lavaMs.rankTitle}`;
      btnModalReplay.style.display = 'inline-block';
      btnModalReplay.innerHTML = `${UI_ART.gachaMachine} <span>皮肤扭蛋机</span><kbd class="kbd-hint">P</kbd>`;
      btnModalNext.disabled = false;
      btnModalNext.style.display = 'inline-block';
      btnModalNext.innerHTML = `${UI_ART.lavaJump} 挑战第 ${nextLavaSpec.lavaTier} 阶<kbd class="kbd-hint">Space</kbd>`;
    } else {
      const reason = lavaRun?.state === 'wiped' ? '波波全部坠入熔岩' : '超时被困火山口';
      modalBadge.innerHTML = `${UI_ART.lavaJump} LAVA JUMP · 突围失败`;
      modalTitle.innerHTML = `${UI_ART.warning} ${reason} · 零战败扣罚`;
      modalDesc.innerHTML =
        rec.coresAwarded > 0 || rec.coinsAwarded > 0
          ? `保留战利品：熔岩晶核 +${rec.coresAwarded} ${UI_ART.lavaCore} · 金币 +${rec.coinsAwarded} ${UI_ART.coin}${milestoneTxt}！落点圈变绿再起跳，避开红色喷发预警圈！`
          : `零金币扣罚！落点圈变绿再起跳，避开红色喷发预警圈与落石阴影！`;
      btnModalNext.style.display = 'none';
      btnModalReplay.innerHTML = `${UI_ART.lavaJump} <span>重新突围</span><kbd class="kbd-hint">P</kbd>`;
    }
    if (btnModalShare) btnModalShare.style.display = 'inline-block';
    refreshUpgradeUI();
    renderMainMenu();
    renderActiveBuffsBar();
    return;
  }

  if (world.currentLevel?.isGlacierSled) {
    const sledRun = world.glacierSled;
    const limit = sledRun?.timeLimit || world.currentLevel.sledCourse?.timeLimitSec || 41;
    const finishSec = victory ? Math.max(1, world.sledFinishSec || world.stageCombatTime) : limit;
    const survivors = world.getSledRiderCount();
    const progressPct = world.getSledProgressPct();
    const rec = state.recordGlacierSledResult(
      victory,
      finishSec,
      limit,
      survivors,
      world.sledRidersLost,
      world.sledGatesPassed,
      progressPct
    );
    setResultStatBoxes({ victory, finishSec, progressPct, survivors, metricLabel: '躲过险情', metricValue: `${world.sledHazardsDodged}` });
    const nextSledSpec = state.getGlacierSledSpec();
    const iceMs = state.getIceMedalMilestoneBonus();
    const milestoneTxt = rec.milestoneReached
      ? ` · 晋升【${rec.milestoneRankTitle}】+${rec.milestoneBonusCoins} ${UI_ART.coin}`
      : '';
    resultModal.classList.toggle('victory-mode', victory);
    rewardSection.classList.add('hidden');
    penaltySection.classList.add('hidden');
    if (victory) {
      world.triggerScreenFlash('#7dd3fc', 0.7);
      const baseMedals = rec.medalsAwarded - rec.timeBonusMedals - rec.survivorBonusMedals;
      modalBadge.innerHTML = `${UI_ART.glacierSled} GLACIER SLED · 第 ${rec.sledTierCleared} 阶冲线成功`;
      modalTitle.innerHTML = `${UI_ART.iceMedal} 雪橇冲过冰川终点线！`;
      modalDesc.innerHTML = `${rec.isNewSpeedRecord ? '新纪录 · ' : ''}甩落 ${world.sledRidersLost} · 冰晶奖章 +${rec.medalsAwarded} ${UI_ART.iceMedal} · 金币 +${rec.coinsAwarded} ${UI_ART.coin}${milestoneTxt}`;
      modalDesc.title = `穿门 ${world.sledGatesPassed}\n奖章：基础 ${baseMedals} + 时速 ${rec.timeBonusMedals} + 幸存 ${rec.survivorBonusMedals} · 段位 ${iceMs.rankTitle}`;
      btnModalReplay.style.display = 'inline-block';
      btnModalReplay.innerHTML = `${UI_ART.trophyHall} <span>奖杯馆</span><kbd class="kbd-hint">P</kbd>`;
      btnModalNext.disabled = false;
      btnModalNext.style.display = 'inline-block';
      btnModalNext.innerHTML = `${UI_ART.glacierSled} 挑战第 ${nextSledSpec.sledTier} 阶<kbd class="kbd-hint">Space</kbd>`;
    } else {
      const reason = sledRun?.state === 'wiped' ? '波波全部被甩下雪橇' : '超时未冲过终点线';
      modalBadge.innerHTML = `${UI_ART.glacierSled} GLACIER SLED · 冲关失败`;
      modalTitle.innerHTML = `${UI_ART.warning} ${reason} · 零战败扣罚`;
      modalDesc.innerHTML =
        rec.medalsAwarded > 0 || rec.coinsAwarded > 0
          ? `保留战利品：冰晶奖章 +${rec.medalsAwarded} ${UI_ART.iceMedal} · 金币 +${rec.coinsAwarded} ${UI_ART.coin}${milestoneTxt}！多穿加人门、提前对准雪崩浪的蓝旗缺口再出发！`
          : `零金币扣罚！冰锥阴影出现时立刻变道，提前对准雪崩浪的蓝旗缺口！`;
      btnModalNext.style.display = 'none';
      btnModalReplay.innerHTML = `${UI_ART.glacierSled} <span>重新出发</span><kbd class="kbd-hint">P</kbd>`;
    }
    if (btnModalShare) btnModalShare.style.display = 'inline-block';
    refreshUpgradeUI();
    renderMainMenu();
    renderActiveBuffsBar();
    return;
  }

  if (world.currentLevel?.isSubmarineRescue) {
    const clearSec = Math.max(1.0, world.stageCombatTime);
    const totalBubbles = world.rescueBubbles.length || world.currentLevel.rescueBubbles?.length || 7;
    const totalCorals = world.coralBarriers.length || world.currentLevel.coralBarriers?.length || 3;
    const rec = state.recordSubmarineRescueResult(
      victory,
      world.subBubblesPopped,
      totalBubbles,
      world.subBobosRescued,
      world.subCoralsBroken,
      world.subJellyKills,
      clearSec
    );
    const nextSubSpec = state.getSubmarineRescueSpec();
    const pearlMs = state.getDeepPearlMilestoneBonus();
    const milestoneTxt = rec.milestoneReached
      ? ` · 晋升【${rec.milestoneRankTitle}】+${rec.milestoneBonusCoins} ${UI_ART.coin}`
      : '';
    const subState = world.submarine?.state || 'cruising';
    resultModal.classList.toggle('victory-mode', victory);
    rewardSection.classList.add('hidden');
    penaltySection.classList.add('hidden');
    if (victory) {
      world.triggerScreenFlash('#38bdf8', 0.7);
      modalBadge.innerHTML = `${UI_ART.submarineRescue} SUBMARINE RESCUE · 第 ${rec.rescueTierCleared} 阶营救成功`;
      modalTitle.innerHTML = `${UI_ART.deepPearl} 潜艇抵达深海营救站！`;
      modalDesc.innerHTML = `营救波波 ${world.subBobosRescued} 只 · 用时 ${clearSec.toFixed(1)}s${rec.isNewSpeedRecord ? '（新纪录）' : ''} · 深海珍珠 +${rec.pearlsAwarded} ${UI_ART.deepPearl} · 金币 +${rec.coinsAwarded} ${UI_ART.coin}${milestoneTxt}`;
      modalDesc.title = `戳破泡泡 ${world.subBubblesPopped}/${totalBubbles} · 破开珊瑚 ${world.subCoralsBroken}/${totalCorals} · 击散水母 ${world.subJellyKills} · 段位 ${pearlMs.rankTitle}`;
      btnModalReplay.style.display = 'inline-block';
      btnModalReplay.innerHTML = `${PET_COMPANION_INLINE_ART[state.activePet]} <span>前往萌宠伙伴坞</span><kbd class="kbd-hint">P</kbd>`;
      btnModalNext.disabled = false;
      btnModalNext.style.display = 'inline-block';
      btnModalNext.innerHTML = `${UI_ART.submarineRescue} 营救第 ${nextSubSpec.rescueTier} 阶<kbd class="kbd-hint">Space</kbd>`;
    } else {
      const reason = subState === 'suffocated' ? '潜艇氧气耗尽' : '潜艇被水母阵蜇穿船壳';
      modalBadge.innerHTML = `${UI_ART.submarineRescue} SUBMARINE RESCUE · 营救中断`;
      modalTitle.innerHTML = `${UI_ART.warning} ${reason} · 零战败扣罚`;
      modalDesc.innerHTML =
        rec.pearlsAwarded > 0 || rec.coinsAwarded > 0
          ? `本局营救波波 ${world.subBobosRescued} 只、破开珊瑚 ${world.subCoralsBroken}/${totalCorals}，保留战利品：深海珍珠 +${rec.pearlsAwarded} ${UI_ART.deepPearl} · 金币 +${rec.coinsAwarded} ${UI_ART.coin}${milestoneTxt}！左右操控潜艇躲开水母、让波波护航再出发！`
          : `营救波波 0 只 · 零金币扣罚！先戳破近处营救泡泡壮大波波，再集火珊瑚封锁，记得把潜艇拖离水母阵！`;
      btnModalNext.style.display = 'none';
      btnModalReplay.innerHTML = `${UI_ART.submarineRescue} <span>重新下潜</span><kbd class="kbd-hint">P</kbd>`;
    }
    if (btnModalShare) btnModalShare.style.display = 'inline-block';
    refreshUpgradeUI();
    renderMainMenu();
    renderActiveBuffsBar();
    return;
  }

  if (world.currentLevel?.isCandyTrainRaid) {
    const clearSec = Math.max(1.0, world.stageCombatTime);
    const totalCars = world.candyTrain?.cars.length || world.currentLevel.candyTrainCars?.length || 6;
    const rec = state.recordCandyTrainRaidResult(
      victory,
      world.candyTrainCarsBroken,
      totalCars,
      world.candyTrainTreasureLooted,
      world.candyTrainMedalsLooted,
      clearSec
    );
    const nextTrainSpec = state.getCandyTrainRaidSpec();
    const milestone = state.getTrainMedalMilestoneBonus();
    const milestoneTxt = rec.milestoneReached
      ? ` · 晋升【${rec.milestoneRankTitle}】+${rec.milestoneBonusCoins} ${UI_ART.coin}`
      : '';
    resultModal.classList.toggle('victory-mode', victory);
    rewardSection.classList.add('hidden');
    penaltySection.classList.add('hidden');
    if (victory) {
      world.triggerScreenFlash('#f472b6', 0.7);
      modalBadge.innerHTML = `${UI_ART.candyTrainRaid} CANDY TRAIN RAID · 第 ${rec.raidTierCleared} 阶劫车大捷`;
      modalTitle.innerHTML = `${UI_ART.trainGoldMedal} 彩虹糖果列车全数击破！`;
      modalDesc.innerHTML = `击破车厢 ${world.candyTrainCarsBroken}/${totalCars} · 用时 ${clearSec.toFixed(1)}s${rec.isNewSpeedRecord ? '（新纪录）' : ''} · 列车金章 +${rec.medalsAwarded} ${UI_ART.trainGoldMedal} · 金币 +${rec.coinsAwarded} ${UI_ART.coin}${milestoneTxt}`;
      modalDesc.title = `宝箱货厢 ${world.candyTrainTreasureLooted} 节 · 段位 ${milestone.rankTitle}`;
      btnModalReplay.style.display = 'inline-block';
      btnModalReplay.innerHTML = `${RELIC_BANNER_INLINE_ART[state.activeRelicBanner]} <span>前往圣物战旗台</span><kbd class="kbd-hint">P</kbd>`;
      btnModalNext.disabled = false;
      btnModalNext.style.display = 'inline-block';
      btnModalNext.innerHTML = `${UI_ART.candyTrainRaid} 劫车第 ${nextTrainSpec.raidTier} 阶<kbd class="kbd-hint">Space</kbd>`;
    } else {
      modalBadge.innerHTML = `${UI_ART.candyTrainRaid} CANDY TRAIN RAID · 列车驶离`;
      modalTitle.innerHTML = `${UI_ART.warning} 糖果列车冲出环线 · 零战败扣罚`;
      modalDesc.innerHTML =
        rec.medalsAwarded > 0 || rec.coinsAwarded > 0
          ? `本局击破车厢 ${world.candyTrainCarsBroken}/${totalCars}，保留战利品：列车金章 +${rec.medalsAwarded} ${UI_ART.trainGoldMedal} · 金币 +${rec.coinsAwarded} ${UI_ART.coin}${milestoneTxt}！先集火火车头可令全车停摆！`
          : `击破车厢 0/${totalCars} · 零金币扣罚！先集火火车头可冻结逃离倒计时，再逐节拆解宝箱货厢！`;
      btnModalNext.style.display = 'none';
      btnModalReplay.innerHTML = `${UI_ART.candyTrainRaid} <span>重新劫车</span><kbd class="kbd-hint">P</kbd>`;
    }
    if (btnModalShare) btnModalShare.style.display = 'inline-block';
    refreshUpgradeUI();
    renderMainMenu();
    renderActiveBuffsBar();
    return;
  }

  if (world.currentLevel?.isAirshipEscort) {
    const clearSec = Math.max(1.0, world.stageCombatTime);
    const pct = victory ? 100 : world.getAirshipProgressPct();
    const rec = state.recordAirshipEscortResult(
      victory,
      pct,
      world.antiAirTurretsCleared,
      world.airshipDropPodsDeployed,
      clearSec
    );
    const nextAirSpec = state.getAirshipEscortSpec();
    const milestone = state.getAirshipMilestoneBonus();
    resultModal.classList.toggle('victory-mode', victory);
    rewardSection.classList.add('hidden');
    penaltySection.classList.add('hidden');
    if (victory) {
      world.triggerScreenFlash('#38bdf8', 0.72);
      modalBadge.innerHTML = `${UI_ART.airshipEscort} AIRSHIP ESCORT · 第 ${rec.escortTierCleared} 阶护航大捷`;
      modalTitle.innerHTML = `${UI_ART.airshipWingMedal} 蒸汽飞艇冲破云顶总厂！`;
      modalDesc.innerHTML = `拔除拦截塔 ${world.antiAirTurretsCleared}/${world.antiAirTurrets.length} · 空投舱 ${world.airshipDropPodsDeployed} 舱 · 飞艇护航徽章 +${rec.medalsAwarded} ${UI_ART.airshipWingMedal} · 金币 +${rec.coinsAwarded} ${UI_ART.coin} · 碎片卡 +${rec.cardsAwarded} ${UI_ART.shard}`;
      modalDesc.title = `段位 ${milestone.rankTitle}`;
      btnModalReplay.style.display = 'inline-block';
      btnModalReplay.innerHTML = `${UI_ART.modOverdrive} <span>前往母炮改装台</span><kbd class="kbd-hint">P</kbd>`;
      btnModalNext.disabled = false;
      btnModalNext.style.display = 'inline-block';
      btnModalNext.innerHTML = `${UI_ART.airshipEscort} 护航第 ${nextAirSpec.escortTier} 阶航线<kbd class="kbd-hint">Space</kbd>`;
    } else {
      modalBadge.innerHTML = `${UI_ART.airshipEscort} AIRSHIP ESCORT · 护航重整`;
      modalTitle.innerHTML = `${UI_ART.warning} 飞艇编队受阻返航 · 零战败扣罚`;
      modalDesc.innerHTML =
        rec.medalsAwarded > 0
          ? `本局拔除拦截塔 ${world.antiAirTurretsCleared} 座，发放护航津贴：飞艇护航徽章 +${rec.medalsAwarded} ${UI_ART.airshipWingMedal} · 金币 +${rec.coinsAwarded} ${UI_ART.coin}！前往工坊改装母炮核心模组再战！`
          : `推进进度 ${pct}% · 零金币扣罚！优先派遣波波拔除两翼拦截副塔即可触发超级波波空投舱！`;
      btnModalNext.style.display = 'none';
      btnModalReplay.innerHTML = `${UI_ART.airshipEscort} <span>重战飞艇护航</span><kbd class="kbd-hint">P</kbd>`;
    }
    if (btnModalShare) btnModalShare.style.display = 'inline-block';
    refreshUpgradeUI();
    renderMainMenu();
    renderActiveBuffsBar();
    return;
  }

  if (world.currentLevel?.isColossusRaid) {
    const clearSec = Math.max(1.0, world.stageCombatTime);
    const brokenCount = world.colossusBoss?.weakpointsBroken || 0;
    const rec = state.recordColossusRaidResult(victory, brokenCount, clearSec);
    const nextRaidSpec = state.getColossusRaidSpec();
    resultModal.classList.toggle('victory-mode', victory);
    rewardSection.classList.add('hidden');
    penaltySection.classList.add('hidden');
    if (victory) {
      world.triggerScreenFlash('#fde047', 0.75);
      modalBadge.innerHTML = `${UI_ART.clockworkColossus} COLOSSUS RAID · 第 ${rec.raidTierCleared} 阶讨伐成功`;
      modalTitle.innerHTML = `${UI_ART.clockworkCore} 巨型发条玩具首领轰然倒塌！`;
      modalDesc.innerHTML = `击破弱点臂 ${brokenCount}/2 · 用时 ${clearSec.toFixed(1)}s · 发条核心 +${rec.coresAwarded} ${UI_ART.clockworkCore} · 金币 +${rec.coinsAwarded} ${UI_ART.coin} · 碎片卡 +${rec.cardsAwarded} ${UI_ART.shard} · 齿轮砖块 +${rec.bricksAwarded}`;
      btnModalReplay.style.display = 'inline-block';
      btnModalReplay.innerHTML = `${UI_ART.clockworkCore} <span>前往工坊升科技</span><kbd class="kbd-hint">P</kbd>`;
      btnModalNext.disabled = false;
      btnModalNext.style.display = 'inline-block';
      btnModalNext.innerHTML = `${UI_ART.clockworkColossus} 挑战第 ${nextRaidSpec.raidTier} 阶首领<kbd class="kbd-hint">Space</kbd>`;
    } else {
      modalBadge.innerHTML = `${UI_ART.clockworkColossus} COLOSSUS RAID · 攻坚重整`;
      modalTitle.innerHTML = `${UI_ART.warning} 发条巨兵防线受阻 · 零战败扣罚`;
      modalDesc.innerHTML =
        rec.coresAwarded > 0
          ? `本局拆解弱点臂 ${brokenCount}/2，发放破拆津贴：发条核心 +${rec.coresAwarded} ${UI_ART.clockworkCore} · 金币 +${rec.coinsAwarded} ${UI_ART.coin}！前往工坊升级波波三系专精科技再战！`
          : `零金币扣罚！建议在工坊研发【重甲破城营】放大弱点破拆伤害，击破左翼重盾或右翼糖炮触发 6s 瘫痪 2.5x 暴击！`;
      btnModalNext.style.display = 'none';
      btnModalReplay.innerHTML = `${UI_ART.clockworkColossus} <span>重战发条首领</span><kbd class="kbd-hint">P</kbd>`;
    }
    if (btnModalShare) btnModalShare.style.display = 'inline-block';
    refreshUpgradeUI();
    renderMainMenu();
    renderActiveBuffsBar();
    return;
  }

  if (world.currentLevel?.isGearTournament) {
    const playedStage = (world.currentLevel.tournamentStage || state.tournamentStage) as 1 | 2 | 3;
    const rec = state.recordTournamentMatchResult(victory, playedStage);
    const nextSpec = state.getTournamentStageSpec(rec.nextStage);
    resultModal.classList.toggle('victory-mode', victory);
    rewardSection.classList.add('hidden');
    penaltySection.classList.add('hidden');
    if (victory) {
      world.triggerScreenFlash('#fde047', 0.72);
      const chestPreview = state.getPendingTournamentChestPreview(playedStage);
      modalBadge.innerHTML = `${UI_ART.gearTournament} GEAR SUMMIT · ${rec.streakMultiplier.toFixed(1)}x`;
      modalTitle.innerHTML = rec.cupCompleted
        ? `${UI_ART.gearTournament} 金齿巅峰决战夺冠 · 三连胜满贯！`
        : `${UI_ART.gearTournament} 第 ${playedStage}/3 战突破 · 晋级${nextSpec.shortTitle}！`;
      modalDesc.innerHTML = `荣誉奖杯 +${rec.matchTrophiesAwarded} · 已解锁 ${chestPreview.streakLabel} 连胜宝箱！`;
      if (tournamentChestSection && modalChestTitleEl && modalChestRewardsEl && btnClaimTournamentChest) {
        tournamentChestSection.classList.remove('hidden');
        modalChestTitleEl.textContent = `连胜宝箱 · ${chestPreview.streakLabel}（第 ${playedStage}/3 战）`;
        modalChestRewardsEl.textContent = `金币 +${chestPreview.coins} · 碎片卡 +${chestPreview.cards} · 砖块 +${chestPreview.bricks} · 荣誉奖杯 +${chestPreview.trophies}`;
        btnClaimTournamentChest.disabled = false;
        btnClaimTournamentChest.innerHTML = `${UI_ART.tournamentChest} 开启 ${chestPreview.streakLabel} 宝箱`;
      }
      btnModalReplay.style.display = 'none';
      btnModalNext.disabled = false;
      btnModalNext.style.display = 'inline-block';
      btnModalNext.innerHTML = `${UI_ART.gearTournament} 迎战${nextSpec.badgeText}<kbd class="kbd-hint">Space</kbd>`;
    } else {
      modalBadge.innerHTML = `${UI_ART.gearTournament} TOURNAMENT RESET`;
      modalTitle.innerHTML = `${UI_ART.warning} 锦标赛连胜中断 · 重返铜齿预赛`;
      modalDesc.innerHTML = `零金币扣罚！已积累的 ${state.tournamentTrophies} 座锦标赛荣誉奖杯永久保留，重整副武器再冲击三连冠！`;
      btnModalNext.style.display = 'none';
      btnModalReplay.innerHTML = `${UI_ART.gearTournament} <span>重战铜齿预赛</span><kbd class="kbd-hint">P</kbd>`;
    }
    if (btnModalShare) btnModalShare.style.display = 'inline-block';
    refreshUpgradeUI();
    renderMainMenu();
    renderActiveBuffsBar();
    return;
  }

  if (world.currentLevel?.isBonusHeist) {
    resultModal.classList.add('victory-mode');
    world.triggerScreenFlash('#fde047', 0.72);
    modalBadge.innerHTML = `${UI_ART.candyVault} CANDY VAULT JACKPOT`;
    modalTitle.innerHTML = `${UI_ART.candyVault} 糖果金库大劫案满载而归！`;
    modalDesc.innerHTML = `共轰碎金库塔 ${world.bonusVaultsBroken}/${world.candyVaults.length} 座 · 狂揽 +${state.stageGoldEarned} ${UI_ART.coin} · 时装碎片 +${world.bonusHeistShardsEarned} ${UI_ART.shard}`;
    rewardSection.classList.add('hidden');
    penaltySection.classList.add('hidden');
    btnModalReplay.style.display = 'none';
    btnModalNext.disabled = false;
    btnModalNext.style.display = 'inline-block';
    btnModalNext.innerHTML = `${UI_ART.rocket} 继续第 ${pendingNextCampaignIdx + 1} 关<kbd class="kbd-hint">Space</kbd>`;
    if (btnModalShare) btnModalShare.style.display = 'inline-block';
    refreshUpgradeUI();
    renderActiveBuffsBar();
    return;
  }

  if (world.currentLevel?.isPayloadEscort) {
    const clearSec = Math.max(1.0, world.stageCombatTime);
    const pct = victory ? 100 : world.getEscortProgressPct();
    const rec = state.recordEscortRun(pct, clearSec, world.escortBarricadesBroken, victory);
    const rank = state.getEscortRankInfo();
    resultModal.classList.toggle('victory-mode', victory);
    if (victory) {
      world.triggerScreenFlash('#fde047', 0.72);
    }
    modalBadge.innerHTML = `${UI_ART.escortCart} PAYLOAD ESCORT · ${rank.label}`;
    modalTitle.innerHTML = victory
      ? `${UI_ART.escortCart} 蒸汽花车冲进终点站！`
      : `${UI_ART.escortCart} 花车护送结算 · 推进 ${pct}%`;
    modalDesc.innerHTML = `${victory ? `${UI_ART.clock} 通关用时 ${clearSec.toFixed(1)}s${rec.isNewSpeedRecord ? `（${UI_ART.sparkle}新纪录）` : ''}` : `个人最佳推进：${rec.bestProgressPct}%`} · ${UI_ART.barricade} 撞碎路障 ${world.escortBarricadesBroken}/${world.escortBarricades.length} · 狂揽 +${state.stageGoldEarned} ${UI_ART.coin}${world.escortShardsEarned > 0 ? ` · 碎片 +${world.escortShardsEarned} ${UI_ART.shard}` : ''} · 零战败损耗`;
    rewardSection.classList.add('hidden');
    penaltySection.classList.add('hidden');
    btnModalNext.style.display = 'none';
    btnModalReplay.innerHTML = `${UI_ART.escortCart} <span>再战护送</span><kbd class="kbd-hint">P</kbd>`;
    if (btnModalShare) btnModalShare.style.display = 'inline-block';
    refreshUpgradeUI();
    renderMainMenu();
    renderActiveBuffsBar();
    return;
  }

  if (world.currentLevel?.isEndlessDefense) {
    resultModal.classList.add('victory-mode');
    const rec = state.recordEndlessWave(world.endlessWave);
    const medal = state.getEndlessMedalInfo(state.bestEndlessWave);
    modalBadge.innerHTML = `${UI_ART.endlessMedal} ENDLESS DEFENSE · ${medal.label}`;
    modalTitle.innerHTML = `${UI_ART.endlessShield} 无尽工坊保卫战 · 坚守 ${world.endlessWave} 波！`;
    modalDesc.innerHTML = `${rec.isNewRecord ? `${UI_ART.sparkle} 刷新个人最高波次纪录！` : `个人最佳纪录：第 ${state.bestEndlessWave} 波`} · 荣获【${medal.label}】· 零战败损耗`;
    rewardSection.classList.add('hidden');
    penaltySection.classList.add('hidden');
    btnModalNext.style.display = 'none';
    btnModalReplay.innerHTML = `${UI_ART.endlessShield} <span>再战无尽</span><kbd class="kbd-hint">P</kbd>`;
    if (btnModalShare) btnModalShare.style.display = 'inline-block';
    refreshUpgradeUI();
    renderMainMenu();
    renderActiveBuffsBar();
    return;
  }

  resultModal.classList.toggle('victory-mode', victory);

  if (victory) {
    world.triggerScreenFlash('#facc15', 0.68);
    state.recordBattleStats(stageNum, state.stageMutantsKilled);
    const expiredDebuffs = state.tickStageVictoryDebuffs();
    const shardDrop = state.rollStageSkinShardDrop(stageNum);

    const clearSec = Math.max(0.1, world.stageCombatTime);
    stageRewardRerollCount = 0;
    isSpeedSkipEligible = clearSec < 10.0;
    isSpeedSkipActive = isSpeedSkipEligible;
    pendingBonusHeistStage = stageNum % 5 === 0 ? stageNum : 0;

    modalBadge.innerHTML = isSpeedSkipEligible
      ? `${UI_ART.bolt} SPEED CLEAR ${clearSec.toFixed(1)}s (<10s)`
      : `${UI_ART.trophy} STAGE ${stageNum} VICTORY`;
    modalTitle.innerHTML = isSpeedSkipEligible
      ? `${UI_ART.bolt} 第 ${stageNum} 关极速突破！`
      : `${UI_ART.sparkle} 第 ${stageNum} 关完美谢幕！`;
    const parts: string[] = [
      `${UI_ART.clock} 用时 ${clearSec.toFixed(1)}s${isSpeedSkipEligible ? ` (${UI_ART.bolt}跳2关+奖励×3)` : ''}`,
    ];
    if (pendingBonusHeistStage > 0) {
      parts.push(`${UI_ART.candyVault} 已解锁 25s 糖果金库大劫案`);
    }
    if (shardDrop) {
      parts.push(`${UI_ART.shard} ${shardDrop.skinName} +${shardDrop.amount}`);
    }
    if (expiredDebuffs.length > 0) {
      parts.push(`${UI_ART.sparkle} 清理 ${expiredDebuffs.join('/')}`);
    }
    modalDesc.innerHTML = `${parts.join(' · ')}<span class="desktop-only-text"> · ${UI_ART.note} 已演出 ${state.getEffectiveMatchesPlayed()} 场</span>`;
    penaltySection.classList.add('hidden');
    btnModalNext.style.display = 'inline-block';
    if (btnModalShare) btnModalShare.style.display = 'inline-block';
    presentRewardChoices(stageNum);
    renderActiveBuffsBar();
  } else {
    pendingBonusHeistStage = 0;
    if (btnModalShare) btnModalShare.style.display = 'none';
    const report = state.applyDefeatPenalty(stageNum);
    state.recordBattleStats(0, state.stageMutantsKilled);
    currentCleanseCost = report.cleanseCost;

    modalBadge.textContent = 'STAGE INTERRUPTED';
    modalTitle.innerHTML = `${UI_ART.warning} 泡泡站失守！`;
    modalDesc.textContent = '抓捕队突破防线，已结算本场损耗：';
    rewardSection.classList.add('hidden');
    penaltySection.classList.remove('hidden');
    btnModalNext.style.display = 'none';

    const buffLossHtml = report.lostBuffTitle
      ? `<div class="penalty-item">${UI_ART.brokenHeart} <strong>应援受损</strong>：${report.lostBuffIcon} ${report.lostBuffTitle} -1层</div>`
      : `<div class="penalty-item">${UI_ART.shield} <strong>应援完好</strong>：无词条损失</div>`;

    const goldLossHtml = `<div class="penalty-item">${UI_ART.coin} <strong>演出损耗</strong>：-${report.lostGold.toLocaleString()} 金币 (15%) · 大招蓄力清零</div>`;

    const d = report.inflictedDebuff;
    const debuffHtml = `
      <div class="penalty-debuff-box">
        <div class="penalty-debuff-title">
          <span>${d.icon} ${d.title} (${d.shortText})</span>
          <span class="penalty-debuff-badge">${UI_ART.clock} ${d.remainingStages} 关</span>
        </div>
      </div>
    `;

    penaltyListEl.innerHTML = buffLossHtml + goldLossHtml + debuffHtml;
    btnCleanseDebuff.innerHTML = `${UI_ART.sparkle} 紧急清理 (${report.cleanseCost} ${UI_ART.coin})<kbd class="kbd-hint">C</kbd>`;
    btnCleanseDebuff.disabled = state.gold < report.cleanseCost;

    refreshUpgradeUI();
    renderActiveBuffsBar();
  }
};

btnCleanseDebuff.addEventListener('click', () => {
  if (state.cleanseAllDebuffs(currentCleanseCost)) {
    sound.playUpgrade();
    btnCleanseDebuff.disabled = true;
    btnCleanseDebuff.innerHTML = `${UI_ART.check} 已清理全部阻碍`;
    refreshUpgradeUI();
    renderActiveBuffsBar();
  }
});

function startLevel(idx: number): void {
  topToolsDrawer?.classList.add('hidden');
  if (mainMenu.classList.contains('hidden')) {
    world.isPaused = false;
  }
  const safeIdx = Math.max(0, idx);
  state.currentLevelIndex = safeIdx;
  if (safeIdx + 1 > state.unlockedLevel) {
    state.unlockedLevel = safeIdx + 1;
  }
  state.save();

  const stageNum = safeIdx + 1;
  const lvl = generateDynamicLevel(stageNum);

  resultModal.classList.add('hidden');
  world.loadLevel(lvl);
  if (stageBadge) {
    stageBadge.textContent = `${world.currentTheme.badge} · 第 ${stageNum} 关`;
  }
  const stagePlaqueSubEl = document.getElementById('stage-plaque-sub');
  if (stagePlaqueSubEl && world.currentTheme) {
    const wfSuffix = world.currentLevel?.weatherAffix
      ? ` · 天气【${world.currentLevel.weatherAffix.name}】`
      : '';
    stagePlaqueSubEl.textContent = `【${world.currentTheme.perkTitle}】${world.currentTheme.perkDesc}${wfSuffix}`;
  }
  const stagePickerEl = document.getElementById('btn-stage-theme');
  if (stagePickerEl && world.currentTheme) {
    stagePickerEl.title = `${world.currentTheme.name}特殊效果：【${world.currentTheme.perkTitle}】${world.currentTheme.perkDesc}`;
  }
  bossNameEl.innerHTML = lvl.isMegaBoss
    ? `${UI_ART.crown} 总厂督军`
    : lvl.isMiniBoss
      ? `${UI_ART.gear} 车间主管`
      : '集团厂房';
  if (lvl.isMegaBoss) {
    showBanner(
      `${UI_ART.warning} 第 ${stageNum} 关 · ${lvl.bossName}`,
      `${UI_ART.shield} 拔除双侧护盾副塔 · ${UI_ART.warning} 换道规避高压蒸汽`
    );
  } else if (lvl.isMiniBoss) {
    showBanner(
      `${UI_ART.sword} 第 ${stageNum} 关 · ${lvl.bossName}`,
      `${UI_ART.shield} 侧翼破除蒸汽副塔 · ${UI_ART.warning} 闪避半桥蒸汽横扫`
    );
  } else {
    centerBanner.classList.add('hidden');
  }
  refreshMechaUI();
  refreshSubWeaponHUD();
  refreshUpgradeUI();
  renderActiveBuffsBar();
}

function refreshUpgradeUI(): void {
  goldAmountEl.textContent = Math.floor(state.gold).toLocaleString();

  // Fire Rate (controlled by in-run Combat Time seconds — never costs meta gold!)
  const costFR = state.getFireRateCost();
  const curTime = Math.floor(state.runCombatTimePool);
  const frPct = Math.max(0, Math.min(100, Math.round((curTime / Math.max(1, costFR)) * 100)));
  lvlFireRate.textContent = `Lv.${state.fireRateLevel}`;
  if (statFireRate) statFireRate.textContent = `${state.getFireRatePerSec().toFixed(1)}/s`;
  costFireRate.textContent = `${Math.min(curTime, costFR)}/${costFR}秒`;
  upgFireRate.disabled = curTime < costFR;
  upgFireRate.style.setProperty('--upg-pct', `${frPct}%`);
  upgFireRate.classList.toggle('is-near-ready', curTime < costFR && frPct >= 75);
  upgFireRate.classList.toggle('is-ready', curTime >= costFR);

  // Power (controlled by in-run Kills — never costs meta gold!)
  const costPwr = state.getPowerCost();
  const curKills = Math.floor(state.runKillsPool);
  const pwrPct = Math.max(0, Math.min(100, Math.round((curKills / Math.max(1, costPwr)) * 100)));
  lvlPower.textContent = `Lv.${state.powerLevel}`;
  if (statPower) statPower.textContent = `×${state.getPowerMultiplier().toFixed(2)}`;
  costPower.textContent = `${Math.min(curKills, costPwr)}/${costPwr}击退`;
  upgPower.disabled = curKills < costPwr;
  upgPower.style.setProperty('--upg-pct', `${pwrPct}%`);
  upgPower.classList.toggle('is-near-ready', curKills < costPwr && pwrPct >= 75);
  upgPower.classList.toggle('is-ready', curKills >= costPwr);

  // Champion (controlled by in-run Spawns — never costs meta gold!)
  const costChamp = state.getChampionCost();
  const curSpawns = Math.floor(state.runSpawnsPool);
  const champPct = Math.max(0, Math.min(100, Math.round((curSpawns / Math.max(1, costChamp)) * 100)));
  lvlChampion.textContent = `Lv.${state.championLevel}`;
  if (statChampion) statChampion.textContent = `×${state.getChampionMultiplier().toFixed(2)}`;
  costChampion.textContent = `${Math.min(curSpawns, costChamp)}/${costChamp}出兵`;
  upgChampion.disabled = curSpawns < costChamp;
  upgChampion.style.setProperty('--upg-pct', `${champPct}%`);
  upgChampion.classList.toggle('is-near-ready', curSpawns < costChamp && champPct >= 75);
  upgChampion.classList.toggle('is-ready', curSpawns >= costChamp);

  // Loot (controlled by in-run Siege Damage — never costs meta gold!)
  const costLt = state.getLootCost();
  const curSiege = Math.floor(state.runSiegePool);
  const ltPct = Math.max(0, Math.min(100, Math.round((curSiege / Math.max(1, costLt)) * 100)));
  lvlLoot.textContent = `Lv.${state.lootLevel}`;
  if (statLoot) statLoot.textContent = `+${Math.round((state.getLootMultiplier() - 1) * 100)}%`;
  costLoot.textContent = `${Math.min(curSiege, costLt)}/${costLt}攻城`;
  upgLoot.disabled = curSiege < costLt;
  upgLoot.style.setProperty('--upg-pct', `${ltPct}%`);
  upgLoot.classList.toggle('is-near-ready', curSiege < costLt && ltPct >= 75);
  upgLoot.classList.toggle('is-ready', curSiege >= costLt);
}

let lastBerserkState = false;
let lastAdrenalineActive = false;
let lastAirdropBuffActive = false;
let lastHudBlue = -1;
let lastHudRed = -1;
let lastHudGold = -1;
let lastHudBossHp = -1;
let lastHudPlayerHp = -1;
let lastHudChampPct = -1;
let lastHudChampHolding = false;
let lastHudOrbitalPct = -1;
let lastHudOverlordKey = '';
let lastHudSubweaponKey = '';
let lastMechaActiveHud = false;
let lastSubweaponZoneHud = false;
let lastUpgLevelsKey = '';
let lastBonusSecHud = -1;
let lastEndlessWaveHud = -1;
let lastEscortHudKey = '';
let lastColossusHudKey = '';
let lastAirshipHudKey = '';
let lastTrainHudKey = '';
let lastSubHudKey = '';

function updateLiveHUD(): void {
  if (world.activeBlueCount !== lastHudBlue) {
    lastHudBlue = world.activeBlueCount;
    blueCountEl.textContent = `${lastHudBlue}`;
  }
  if (world.activeRedCount !== lastHudRed) {
    lastHudRed = world.activeRedCount;
    redCountEl.textContent = `${lastHudRed}`;
  }

  const curGold = Math.floor(state.gold);
  const upgKey = `${state.fireRateLevel}_${state.powerLevel}_${state.championLevel}_${state.lootLevel}_${Math.floor(state.runCombatTimePool)}_${Math.floor(state.runKillsPool)}_${Math.floor(state.runSpawnsPool)}_${Math.floor(state.runSiegePool)}`;
  if (curGold !== lastHudGold || upgKey !== lastUpgLevelsKey) {
    lastHudGold = curGold;
    lastUpgLevelsKey = upgKey;
    refreshUpgradeUI();
  }

  const isColossusRaidActive = Boolean(world.currentLevel?.isColossusRaid && world.colossusBoss?.active);
  if (colossusRaidHudEl) {
    colossusRaidHudEl.classList.toggle('hidden', !isColossusRaidActive);
  }
  const isAirshipEscortActive = Boolean(world.currentLevel?.isAirshipEscort && world.airshipMothership?.active);
  if (airshipEscortHudEl) {
    airshipEscortHudEl.classList.toggle('hidden', !isAirshipEscortActive);
  }
  const isCandyTrainActive = Boolean(world.currentLevel?.isCandyTrainRaid && world.candyTrain?.active);
  if (candyTrainHudEl) {
    candyTrainHudEl.classList.toggle('hidden', !isCandyTrainActive);
  }
  const isSubRescueActive = Boolean(world.currentLevel?.isSubmarineRescue && world.submarine?.active);
  if (submarineRescueHudEl) {
    submarineRescueHudEl.classList.toggle('hidden', !isSubRescueActive);
  }
  if (underwaterOverlayEl) {
    underwaterOverlayEl.classList.toggle('hidden', !world.currentLevel?.isSubmarineRescue);
  }
  const prModeOn = Boolean(world.currentLevel?.isPirateBoarding);
  const isJgActive = Boolean(world.currentLevel?.isJungleSwing && !prModeOn && world.jungleRun?.active);
  if (jungleSwingHudEl) {
    jungleSwingHudEl.classList.toggle('hidden', !isJgActive);
  }
  if (pirateBoardingHudEl) {
    pirateBoardingHudEl.classList.toggle('hidden', !(prModeOn && world.jungleRun?.active));
  }
  if (prModeOn !== lastPrModeOn) {
    lastPrModeOn = prModeOn;
    document.body.classList.toggle('pirate-mode-active', prModeOn);
  }
  const jgModeOn = Boolean(world.currentLevel?.isJungleSwing);
  if (jgModeOn !== lastJgModeOn) {
    lastJgModeOn = jgModeOn;
    document.body.classList.toggle('jungle-mode-active', jgModeOn);
  }
  const isPyActive = Boolean(world.currentLevel?.isPyramidRun && world.pyramidRun?.active);
  if (pyramidRunHudEl) {
    pyramidRunHudEl.classList.toggle('hidden', !isPyActive);
  }
  const pyModeOn = Boolean(world.currentLevel?.isPyramidRun);
  if (pyModeOn !== lastPyModeOn) {
    lastPyModeOn = pyModeOn;
    document.body.classList.toggle('pyramid-mode-active', pyModeOn);
  }
  const isPkActive = Boolean(world.currentLevel?.isPumpkinNight && world.pumpkinRun?.active);
  if (pumpkinNightHudEl) {
    pumpkinNightHudEl.classList.toggle('hidden', !isPkActive);
  }
  const pkModeOn = Boolean(world.currentLevel?.isPumpkinNight);
  if (pkModeOn !== lastPkModeOn) {
    lastPkModeOn = pkModeOn;
    document.body.classList.toggle('pumpkin-mode-active', pkModeOn);
  }
  renderTacticHud();
  const isAstActive = Boolean(world.currentLevel?.isAsteroidDash && world.asteroidRun?.active);
  if (asteroidDashHudEl) {
    asteroidDashHudEl.classList.toggle('hidden', !isAstActive);
  }
  const astModeOn = Boolean(world.currentLevel?.isAsteroidDash);
  if (astModeOn !== lastAstModeOn) {
    lastAstModeOn = astModeOn;
    document.body.classList.toggle('asteroid-mode-active', astModeOn);
  }
  const isLavaActive = Boolean(world.currentLevel?.isLavaJump && world.lavaRun?.active);
  if (lavaJumpHudEl) {
    lavaJumpHudEl.classList.toggle('hidden', !isLavaActive);
  }
  const lavaModeOn = Boolean(world.currentLevel?.isLavaJump);
  if (lavaModeOn !== lastLavaModeOn) {
    lastLavaModeOn = lavaModeOn;
    document.body.classList.toggle('lava-mode-active', lavaModeOn);
  }
  const isSledActive = Boolean(world.currentLevel?.isGlacierSled && world.glacierSled?.active);
  if (glacierSledHudEl) {
    glacierSledHudEl.classList.toggle('hidden', !isSledActive);
  }
  const sledModeOn = Boolean(world.currentLevel?.isGlacierSled);
  if (sledModeOn !== lastSledModeOn) {
    lastSledModeOn = sledModeOn;
    document.body.classList.toggle('sled-mode-active', sledModeOn);
  }
  syncCannonModHudBadge();

  if (world.currentLevel?.isBonusHeist) {
    const secLeft = Math.ceil(world.bonusHeistTimeLeft);
    const hp = Math.ceil(world.bossHp);
    if (secLeft !== lastBonusSecHud || hp !== lastHudBossHp) {
      lastBonusSecHud = secLeft;
      lastHudBossHp = hp;
      if (stageBadge) {
        stageBadge.textContent = `糖果金库 · 剩余 ${secLeft}s`;
      }
      bossHpTextEl.textContent = `${secLeft}s · 金库 ${world.bonusVaultsBroken}/${world.candyVaults.length}`;
      const pct = Math.max(0, Math.min(100, (world.bonusHeistTimeLeft / 25) * 100));
      bossBarFillEl.style.width = `${pct}%`;
      renderActiveBuffsBar();
    }
  } else if (world.currentLevel?.isEndlessDefense) {
    const nextSec = Math.max(1, Math.ceil(11.0 - world.endlessWaveTimer));
    const waveKey = world.endlessWave * 100 + nextSec;
    if (waveKey !== lastEndlessWaveHud) {
      lastEndlessWaveHud = waveKey;
      if (stageBadge) {
        stageBadge.textContent = `无尽保卫 · 第 ${world.endlessWave} 波`;
      }
      bossHpTextEl.textContent = `第 ${world.endlessWave} 波 (${nextSec}s后增援)`;
      const pct = Math.max(0, Math.min(100, ((11.0 - world.endlessWaveTimer) / 11.0) * 100));
      bossBarFillEl.style.width = `${pct}%`;
      renderActiveBuffsBar();
    }
  } else if (world.currentLevel?.isPayloadEscort && world.payloadCart) {
    const pct = world.getEscortProgressPct();
    const stLbl = world.getEscortStateLabel();
    const spd = world.payloadCart.speed.toFixed(1);
    const hudKey = `${pct}_${stLbl}_${spd}_${world.escortBarricadesBroken}_${Math.round(world.payloadCart.steamCharge / 5)}`;
    if (hudKey !== lastEscortHudKey) {
      lastEscortHudKey = hudKey;
      if (stageBadge) {
        stageBadge.textContent = `花车护送 · 推进 ${pct}%`;
      }
      bossHpTextEl.textContent = `${pct}% · ${stLbl} (${spd}m/s)`;
      bossBarFillEl.style.width = `${pct}%`;
      renderActiveBuffsBar();
    }
  } else if (world.currentLevel?.isColossusRaid && world.colossusBoss?.active) {
    const cb = world.colossusBoss;
    const hp = Math.ceil(world.bossHp);
    const lHp = Math.ceil(cb.leftShieldHp);
    const rHp = Math.ceil(cb.rightCannonHp);
    const pTenths = Math.ceil(cb.paralysisTimer * 10);
    const colKey = `${hp}_${lHp}_${rHp}_${cb.leftShieldAlive ? 1 : 0}_${cb.rightCannonAlive ? 1 : 0}_${pTenths}`;
    if (colKey !== lastColossusHudKey) {
      lastColossusHudKey = colKey;
      const isPara = cb.paralysisTimer > 0;
      bossHpTextEl.textContent = isPara ? `${hp} (瘫痪2.5x!)` : `${hp}`;
      const pct = Math.max(0, Math.min(100, (world.bossHp / world.bossMaxHp) * 100));
      bossBarFillEl.style.width = `${pct}%`;

      if (colossusHudLeftEl && colossusHudLeftTextEl) {
        colossusHudLeftEl.classList.toggle('is-broken', !cb.leftShieldAlive);
        colossusHudLeftTextEl.textContent = cb.leftShieldAlive ? `左翼发条重盾 ${lHp}` : '左翼发条重盾 已击破';
      }
      if (colossusHudRightEl && colossusHudRightTextEl) {
        colossusHudRightEl.classList.toggle('is-broken', !cb.rightCannonAlive);
        colossusHudRightTextEl.textContent = cb.rightCannonAlive ? `右翼糖衣重炮 ${rHp}` : '右翼糖衣重炮 已击破';
      }
      if (colossusHudCoreEl && colossusHudCoreTextEl) {
        colossusHudCoreEl.classList.toggle('is-paralyzed', isPara);
        colossusHudCoreTextEl.textContent = isPara
          ? `瘫痪高倍暴击窗口 2.5x · ${cb.paralysisTimer.toFixed(1)}s`
          : cb.leftShieldAlive || cb.rightCannonAlive
            ? '拆解左右弱点臂触发 6.0s 瘫痪 2.5x 暴击'
            : '双翼护臂全破 · 核心暴露 1.15x';
      }
      renderActiveBuffsBar();
    }
  } else if (world.currentLevel?.isPirateBoarding && world.jungleRun) {
    const pr = world.jungleRun;
    const pct = world.getJungleProgressPct();
    const tLeft = Math.max(0, pr.timeLeft);
    const bobos = world.jungleBoboCount;
    const stLbl = world.getJungleStateLabel();
    const gp = world.getJungleGateProgress();
    const tp = world.getJungleTrapProgress();
    const prKey = `${pct}_${Math.ceil(tLeft * 10)}_${bobos}_${world.jungleBobosLost}_${world.jungleTrapsDodged}_${stLbl}_${gp.reached}_${tp.passed}`;
    if (prKey !== lastPrHudKey) {
      lastPrHudKey = prKey;
      if (stageBadge) {
        stageBadge.textContent = `海盗船 · 前进 ${pct}%`;
      }
      bossHpTextEl.textContent = `${pct}% · ${stLbl}`;
      bossBarFillEl.style.width = `${pct}%`;
      if (prHudTimeEl && prHudTimeTextEl) {
        prHudTimeEl.classList.toggle('is-urgent', tLeft <= 8);
        prHudTimeTextEl.textContent = `剩余 ${tLeft.toFixed(1)}s · 门 ${gp.reached}/${gp.total}`;
      }
      if (prHudSquadEl && prHudSquadTextEl) {
        prHudSquadEl.classList.toggle('is-swinging', pr.state === 'swinging');
        prHudSquadTextEl.textContent = `波波 ${bobos} · ${pr.state === 'swinging' ? '踩跳板中' : `损失 ${world.jungleBobosLost}`}`;
      }
      if (prHudCourseEl && prHudCourseTextEl) {
        prHudCourseEl.classList.toggle('is-stumbled', pr.state === 'stumbled');
        prHudCourseTextEl.textContent = `旗舰 ${Math.round(pr.distance)}/${pr.courseLength}m · 机关 ${tp.passed}/${tp.total}`;
      }
      const pillKey = `pr_${pct}_${bobos}_${stLbl}`;
      if (pillKey !== lastJgPillKey) {
        lastJgPillKey = pillKey;
        renderActiveBuffsBar();
      }
    }
  } else if (world.currentLevel?.isJungleSwing && world.jungleRun) {
    const jg = world.jungleRun;
    const pct = world.getJungleProgressPct();
    const tLeft = Math.max(0, jg.timeLeft);
    const bobos = world.jungleBoboCount;
    const stLbl = world.getJungleStateLabel();
    const gp = world.getJungleGateProgress();
    const tp = world.getJungleTrapProgress();
    const jgKey = `${pct}_${Math.ceil(tLeft * 10)}_${bobos}_${world.jungleBobosLost}_${world.jungleTrapsDodged}_${stLbl}_${gp.reached}_${tp.passed}`;
    if (jgKey !== lastJgHudKey) {
      lastJgHudKey = jgKey;
      if (stageBadge) {
        stageBadge.textContent = `丛林神庙 · 前进 ${pct}%`;
      }
      bossHpTextEl.textContent = `${pct}% · ${stLbl}`;
      bossBarFillEl.style.width = `${pct}%`;
      if (jgHudTimeEl && jgHudTimeTextEl) {
        jgHudTimeEl.classList.toggle('is-urgent', tLeft <= 8);
        jgHudTimeTextEl.textContent = `剩余 ${tLeft.toFixed(1)}s · 门 ${gp.reached}/${gp.total}`;
      }
      if (jgHudSquadEl && jgHudSquadTextEl) {
        jgHudSquadEl.classList.toggle('is-swinging', jg.state === 'swinging');
        jgHudSquadTextEl.textContent = `波波 ${bobos} · ${jg.state === 'swinging' ? '荡藤蔓中' : `损失 ${world.jungleBobosLost}`}`;
      }
      if (jgHudCourseEl && jgHudCourseTextEl) {
        jgHudCourseEl.classList.toggle('is-stumbled', jg.state === 'stumbled');
        jgHudCourseTextEl.textContent = `出口 ${Math.round(jg.distance)}/${jg.courseLength}m · 机关 ${tp.passed}/${tp.total}`;
      }
      const pillKey = `${pct}_${bobos}_${stLbl}`;
      if (pillKey !== lastJgPillKey) {
        lastJgPillKey = pillKey;
        renderActiveBuffsBar();
      }
    }
  } else if (world.currentLevel?.isPyramidRun && world.pyramidRun) {
    const py = world.pyramidRun;
    const pct = world.getPyramidProgressPct();
    const tLeft = Math.max(0, py.timeLeft);
    const bobos = world.pyramidBoboCount;
    const stLbl = world.getPyramidStateLabel();
    const gp = world.getPyramidGateProgress();
    const tp = world.getPyramidTrapProgress();
    const sandPct = world.getPyramidSandPct();
    const pyKey = `${pct}_${Math.ceil(tLeft * 10)}_${bobos}_${world.pyramidBobosLost}_${world.pyramidTrapsDodged}_${stLbl}_${gp.reached}_${tp.passed}_${sandPct}`;
    if (pyKey !== lastPyHudKey) {
      lastPyHudKey = pyKey;
      if (stageBadge) {
        stageBadge.textContent = `金字塔墓道 · 前进 ${pct}%`;
      }
      bossHpTextEl.textContent = `${pct}% · ${stLbl}`;
      bossBarFillEl.style.width = `${pct}%`;
      if (pyHudTimeEl && pyHudTimeTextEl) {
        pyHudTimeEl.classList.toggle('is-urgent', tLeft <= 8);
        pyHudTimeTextEl.textContent = `剩余 ${tLeft.toFixed(1)}s · 门 ${gp.reached}/${gp.total}`;
      }
      if (pyHudSandEl && pyHudSandTextEl) {
        pyHudSandEl.classList.toggle('is-sand', py.state === 'quicksand');
        pyHudSandTextEl.textContent = `波波 ${bobos} · ${py.state === 'quicksand' ? `陷沙 ${sandPct}%` : `损失 ${world.pyramidBobosLost}`}`;
      }
      if (pyHudCourseEl && pyHudCourseTextEl) {
        pyHudCourseEl.classList.toggle('is-stumbled', py.state === 'stumbled');
        pyHudCourseTextEl.textContent = `出口 ${Math.round(py.distance)}/${py.courseLength}m · 机关 ${tp.passed}/${tp.total}`;
      }
      const pillKey = `${pct}_${bobos}_${stLbl}`;
      if (pillKey !== lastPyPillKey) {
        lastPyPillKey = pillKey;
        renderActiveBuffsBar();
      }
    }
  } else if (world.currentLevel?.isPumpkinNight && world.pumpkinRun) {
    const pk = world.pumpkinRun;
    const pct = world.getPumpkinProgressPct();
    const tLeft = Math.max(0, pk.timeLeft);
    const bobos = world.pumpkinBoboCount;
    const stLbl = world.getPumpkinStateLabel();
    const gp = world.getPumpkinGateProgress();
    const ghp = world.getPumpkinGhostProgress();
    const lightPct = world.getPumpkinLightPct();
    const pkKey = `${pct}_${Math.ceil(tLeft * 10)}_${bobos}_${world.pumpkinBobosLost}_${world.pumpkinGhostsDispelled}_${stLbl}_${gp.reached}_${ghp.resolved}_${lightPct}`;
    if (pkKey !== lastPkHudKey) {
      lastPkHudKey = pkKey;
      if (stageBadge) {
        stageBadge.textContent = `古堡南瓜夜 · 前进 ${pct}%`;
      }
      bossHpTextEl.textContent = `${pct}% · ${stLbl}`;
      bossBarFillEl.style.width = `${pct}%`;
      if (pkHudTimeEl && pkHudTimeTextEl) {
        pkHudTimeEl.classList.toggle('is-urgent', tLeft <= 8);
        pkHudTimeTextEl.textContent = `剩余 ${tLeft.toFixed(1)}s · 门 ${gp.reached}/${gp.total}`;
      }
      if (pkHudLightEl && pkHudLightTextEl) {
        pkHudLightEl.classList.toggle('is-lit', pk.state === 'lit');
        pkHudLightEl.classList.toggle('is-dark', pk.light <= 0);
        pkHudLightEl.style.setProperty('--pk-light', `${lightPct}%`);
        pkHudLightTextEl.textContent = `波波 ${bobos} · 灯光 ${lightPct}%${pk.state === 'lit' ? ' 补光中' : pk.light <= 0 ? ' 摸黑' : ''}`;
      }
      if (pkHudCourseEl && pkHudCourseTextEl) {
        pkHudCourseEl.classList.toggle('is-stumbled', pk.state === 'stumbled');
        pkHudCourseTextEl.textContent = `城门 ${Math.round(pk.distance)}/${pk.courseLength}m · 驱鬼 ${world.pumpkinGhostsDispelled}/${ghp.total}`;
      }
      const pillKey = `${pct}_${bobos}_${stLbl}`;
      if (pillKey !== lastPkPillKey) {
        lastPkPillKey = pillKey;
        renderActiveBuffsBar();
      }
    }
  } else if (world.currentLevel?.isAsteroidDash && world.asteroidRun) {
    const ast = world.asteroidRun;
    const pct = world.getAsteroidProgressPct();
    const tLeft = Math.max(0, ast.timeLeft);
    const bobos = world.asteroidBoboCount;
    const stLbl = world.getAsteroidStateLabel();
    const gp = world.getAsteroidGateProgress();
    const shieldOn = ast.shieldTimer > 0 && ast.shieldCharges > 0;
    const astKey = `${pct}_${Math.ceil(tLeft * 10)}_${bobos}_${world.asteroidBobosLost}_${world.asteroidHazardsDodged}_${stLbl}_${gp.reached}_${shieldOn ? Math.ceil(ast.shieldTimer) : 0}`;
    if (astKey !== lastAstHudKey) {
      lastAstHudKey = astKey;
      if (stageBadge) {
        stageBadge.textContent = `陨石带突围 · 前进 ${pct}%`;
      }
      bossHpTextEl.textContent = `${pct}% · ${stLbl}`;
      bossBarFillEl.style.width = `${pct}%`;
      if (astHudTimeEl && astHudTimeTextEl) {
        astHudTimeEl.classList.toggle('is-urgent', tLeft <= 8);
        astHudTimeTextEl.textContent = `剩余 ${tLeft.toFixed(1)}s · 门 ${gp.reached}/${gp.total}`;
      }
      if (astHudBobosEl && astHudBobosTextEl) {
        astHudBobosEl.classList.toggle('is-shielded', shieldOn);
        astHudBobosTextEl.textContent = shieldOn
          ? `波波 ${bobos} · 护盾×${ast.shieldCharges} ${ast.shieldTimer.toFixed(1)}s`
          : `波波 ${bobos} · 损失 ${world.asteroidBobosLost}`;
      }
      if (astHudCourseEl && astHudCourseTextEl) {
        astHudCourseEl.classList.toggle('is-stumbled', ast.state === 'stumbled');
        astHudCourseTextEl.textContent = `星光门 ${Math.round(ast.distance)}/${ast.courseLength}m · 闪避 ${world.asteroidHazardsDodged}`;
      }
      const pillKey = `${pct}_${bobos}_${stLbl}`;
      if (pillKey !== lastAstPillKey) {
        lastAstPillKey = pillKey;
        renderActiveBuffsBar();
      }
    }
  } else if (world.currentLevel?.isLavaJump && world.lavaRun) {
    const lava = world.lavaRun;
    const pct = world.getLavaProgressPct();
    const tLeft = Math.max(0, lava.timeLeft);
    const bobos = world.lavaBoboCount;
    const stLbl = world.getLavaStateLabel();
    const rp = world.getLavaRowProgress();
    const lavaKey = `${pct}_${Math.ceil(tLeft * 10)}_${bobos}_${world.lavaBobosLost}_${world.lavaGatesPassed}_${stLbl}_${rp.reached}`;
    if (lavaKey !== lastLavaHudKey) {
      lastLavaHudKey = lavaKey;
      if (stageBadge) {
        stageBadge.textContent = `熔岩跳台 · 前进 ${pct}%`;
      }
      bossHpTextEl.textContent = `${pct}% · ${stLbl}`;
      bossBarFillEl.style.width = `${pct}%`;
      if (lavaHudTimeEl && lavaHudTimeTextEl) {
        lavaHudTimeEl.classList.toggle('is-urgent', tLeft <= 8);
        lavaHudTimeTextEl.textContent = `剩余 ${tLeft.toFixed(1)}s · 跳台 ${rp.reached}/${rp.total}`;
      }
      if (lavaHudBobosEl && lavaHudBobosTextEl) {
        lavaHudBobosEl.classList.toggle('is-shielded', lava.state === 'shielded');
        lavaHudBobosTextEl.textContent = `波波 ${bobos} · 落岩 ${world.lavaBobosLost}`;
      }
      if (lavaHudCourseEl && lavaHudCourseTextEl) {
        lavaHudCourseEl.classList.toggle('is-stumbled', lava.state === 'stumbled');
        lavaHudCourseTextEl.textContent = `火山口 ${Math.round(lava.distance)}/${lava.courseLength}m · 门 ${world.lavaGatesPassed}`;
      }
      const pillKey = `${pct}_${bobos}_${stLbl}`;
      if (pillKey !== lastLavaPillKey) {
        lastLavaPillKey = pillKey;
        renderActiveBuffsBar();
      }
    }
  } else if (world.currentLevel?.isGlacierSled && world.glacierSled) {
    const sled = world.glacierSled;
    const pct = world.getSledProgressPct();
    const tLeft = Math.max(0, sled.timeLeft);
    const riders = world.sledRiderCount;
    const stLbl = world.getSledStateLabel();
    const sledKey = `${pct}_${Math.ceil(tLeft * 10)}_${riders}_${world.sledRidersLost}_${world.sledGatesPassed}_${stLbl}_${Math.round(sled.speed * 10)}`;
    if (sledKey !== lastSledHudKey) {
      lastSledHudKey = sledKey;
      if (stageBadge) {
        stageBadge.textContent = `冰川雪橇 · 滑行 ${pct}%`;
      }
      bossHpTextEl.textContent = `${pct}% · ${stLbl}`;
      bossBarFillEl.style.width = `${pct}%`;
      if (sledHudTimeEl && sledHudTimeTextEl) {
        sledHudTimeEl.classList.toggle('is-urgent', tLeft <= 8);
        sledHudTimeTextEl.textContent = `剩余 ${tLeft.toFixed(1)}s · ${sled.speed.toFixed(1)}m/s`;
      }
      if (sledHudRidersEl && sledHudRidersTextEl) {
        sledHudRidersEl.classList.toggle('is-dropping', sled.state === 'boosting');
        sledHudRidersTextEl.textContent = `波波 ${riders} · 甩落 ${world.sledRidersLost}`;
      }
      if (sledHudCourseEl && sledHudCourseTextEl) {
        sledHudCourseEl.classList.toggle('is-frozen', sled.state === 'stumbled');
        sledHudCourseTextEl.textContent = `赛道 ${Math.round(sled.distance)}/${sled.courseLength}m · 门 ${world.sledGatesPassed}`;
      }
      const pillKey = `${pct}_${riders}_${stLbl}`;
      if (pillKey !== lastSledPillKey) {
        lastSledPillKey = pillKey;
        renderActiveBuffsBar();
      }
    }
  } else if (world.currentLevel?.isSubmarineRescue && world.submarine) {
    const sub = world.submarine;
    const pct = world.getSubmarineProgressPct();
    const hullPct = Math.max(0, Math.ceil((sub.hp / Math.max(1, sub.maxHp)) * 100));
    const o2 = Math.ceil(sub.oxygen);
    const coralsLeft = world.getAliveCoralCount();
    const jellies = world.getAliveJellyfishCount();
    const stLbl = world.getSubmarineStateLabel();
    const subKey = `${pct}_${hullPct}_${o2}_${coralsLeft}_${jellies}_${world.subBobosRescued}_${world.subBubblesPopped}_${stLbl}_${state.activePet}`;
    if (subKey !== lastSubHudKey) {
      lastSubHudKey = subKey;
      if (stageBadge) {
        stageBadge.textContent = `深海营救 · 潜航 ${pct}%`;
      }
      bossHpTextEl.textContent = `${pct}% · ${stLbl}`;
      bossBarFillEl.style.width = `${pct}%`;
      if (subHudHullEl && subHudHullTextEl) {
        subHudHullEl.classList.toggle('is-urgent', hullPct <= 35 || o2 <= 20);
        subHudHullTextEl.textContent = `潜艇 ${hullPct}% · 氧气 ${o2}s`;
      }
      if (subHudRescueEl && subHudRescueTextEl) {
        subHudRescueEl.classList.toggle('is-dropping', world.subBobosRescued > 0);
        subHudRescueTextEl.textContent = `营救 +${world.subBobosRescued} · 泡泡 ${world.subBubblesPopped}/${world.rescueBubbles.length}`;
      }
      if (subHudThreatEl && subHudThreatTextEl) {
        subHudThreatEl.classList.toggle('is-frozen', sub.state === 'blocked');
        subHudThreatTextEl.textContent = `珊瑚 ${coralsLeft}/${world.coralBarriers.length} · 水母 ${jellies}`;
      }
      renderActiveBuffsBar();
    }
  } else if (world.currentLevel?.isCandyTrainRaid && world.candyTrain) {
    const train = world.candyTrain;
    const integrity = world.getCandyTrainIntegrityPct();
    const alive = world.getAliveCandyTrainCarCount();
    const total = train.cars.length;
    const escapeSec = Math.ceil(train.escapeTimeLeft);
    const stLbl = world.getCandyTrainStateLabel();
    const trainKey = `${integrity}_${alive}_${escapeSec}_${train.stalled ? 1 : 0}_${world.candyTrainMedalsLooted}_${stLbl}_${state.activeRelicBanner}_${world.relicSurgeTimer > 0 ? 1 : 0}`;
    if (trainKey !== lastTrainHudKey) {
      lastTrainHudKey = trainKey;
      if (stageBadge) {
        stageBadge.textContent = `糖果列车 · 车厢 ${alive}/${total}`;
      }
      bossHpTextEl.textContent = `${integrity}% · ${stLbl}`;
      bossBarFillEl.style.width = `${integrity}%`;
      if (trainHudCarsEl && trainHudCarsTextEl) {
        trainHudCarsEl.classList.toggle('is-broken', train.stalled);
        trainHudCarsTextEl.textContent = train.stalled
          ? `车头瘫痪 · 车厢 ${alive}/${total}`
          : `车厢 ${alive}/${total} · 耐久 ${integrity}%`;
      }
      if (trainHudLootEl && trainHudLootTextEl) {
        trainHudLootEl.classList.toggle('is-dropping', world.candyTrainMedalsLooted > 0);
        trainHudLootTextEl.textContent = `金章 +${world.candyTrainMedalsLooted} · 宝箱 ${world.candyTrainTreasureLooted}/2`;
      }
      if (trainHudEscapeEl && trainHudEscapeTextEl) {
        trainHudEscapeEl.classList.toggle('is-frozen', train.stalled);
        trainHudEscapeEl.classList.toggle('is-urgent', !train.stalled && escapeSec <= 15);
        trainHudEscapeTextEl.textContent = train.stalled ? `倒计时冻结 ${escapeSec}s` : `驶离 ${escapeSec}s`;
      }
      renderActiveBuffsBar();
    }
  } else if (world.currentLevel?.isAirshipEscort && world.airshipMothership) {
    const ship = world.airshipMothership;
    const pct = world.getAirshipProgressPct();
    const stLbl = world.getAirshipStateLabel();
    const hp = Math.ceil(ship.hp);
    const sh = Math.ceil(ship.shield);
    const dropPct = Math.round(ship.dropCharge);
    const aaAlive = world.getAliveAntiAirTurretCount();
    const airKey = `${pct}_${stLbl}_${hp}_${sh}_${Math.floor(dropPct / 3)}_${world.airshipDropPodsDeployed}_${aaAlive}_${state.activeCannonMod}_${state.getCannonModLevel(state.activeCannonMod)}`;
    if (airKey !== lastAirshipHudKey) {
      lastAirshipHudKey = airKey;
      if (stageBadge) {
        stageBadge.textContent = `飞艇护航 · 推进 ${pct}%`;
      }
      bossHpTextEl.textContent = `${pct}% · ${stLbl}`;
      bossBarFillEl.style.width = `${pct}%`;

      if (airshipHudHullEl && airshipHudHullTextEl) {
        airshipHudHullTextEl.textContent = `飞艇耐久 ${hp} · 护盾 ${sh}`;
      }
      if (airshipHudDropEl && airshipHudDropTextEl) {
        airshipHudDropEl.classList.toggle('is-dropping', ship.state === 'dropping_pod');
        airshipHudDropTextEl.textContent = `空投充能 ${dropPct}% · 已投 ${world.airshipDropPodsDeployed} 舱`;
      }
      if (airshipHudAaEl && airshipHudAaTextEl) {
        airshipHudAaEl.classList.toggle('is-broken', aaAlive === 0);
        airshipHudAaTextEl.textContent =
          aaAlive > 0 ? `拦截副塔 ${aaAlive}/${world.antiAirTurrets.length}` : '拦截副塔 已全拔除';
      }
      renderActiveBuffsBar();
    }
  } else {
    const hp = Math.ceil(world.bossHp);
    if (hp !== lastHudBossHp) {
      lastHudBossHp = hp;
      bossHpTextEl.textContent = `${hp}`;
      const pct = Math.max(0, Math.min(100, (world.bossHp / world.bossMaxHp) * 100));
      bossBarFillEl.style.width = `${pct}%`;
    }
  }

  const pHp = Math.ceil(world.playerBaseHp);
  if (pHp !== lastHudPlayerHp) {
    lastHudPlayerHp = pHp;
    playerHpTextEl.textContent = `${pHp}`;
    const pPct = Math.max(0, Math.min(100, (world.playerBaseHp / world.playerBaseMaxHp) * 100));
    playerBarFillEl.style.width = `${pPct}%`;
  }

  // Champion & Orbital skill bars
  const cPct = Math.floor(state.championCharge);
  const isHolding = world.isHoldingFireInput();
  if (cPct !== lastHudChampPct || isHolding !== lastHudChampHolding) {
    lastHudChampPct = cPct;
    lastHudChampHolding = isHolding;
    championFill.style.width = `${cPct}%`;
    championPct.textContent = cPct >= 100 && isHolding ? '松手召唤!' : `${cPct}%`;
    btnChampion.disabled = cPct < 100;
    btnChampion.classList.toggle('ready', cPct >= 100);
    btnChampion.classList.toggle('holding-charge', isHolding && cPct < 100);
  }

  const oPct = Math.floor(state.orbitalCharge);
  if (oPct !== lastHudOrbitalPct) {
    lastHudOrbitalPct = oPct;
    orbitalFill.style.width = `${oPct}%`;
    orbitalPct.textContent = `${oPct}%`;
    btnOrbital.disabled = oPct < 100;
    btnOrbital.classList.toggle('ready', oPct >= 100);
  }

  if (btnMechaOverlord && overlordFill && overlordPct) {
    const mActive = Boolean(world.mechaOverlord?.active);
    const mPct = mActive
      ? Math.max(1, Math.round((world.mechaOverlord.lifeTimer / Math.max(1, world.mechaOverlord.maxLifeTimer)) * 100))
      : Math.floor(state.mechaOverlordCharge);
    const oKey = `${mActive ? 'A' : 'C'}_${mPct}`;
    if (oKey !== lastHudOverlordKey) {
      lastHudOverlordKey = oKey;
      overlordFill.style.width = `${mPct}%`;
      overlordPct.textContent = mActive
        ? `${Math.ceil(world.mechaOverlord.lifeTimer)}s`
        : mPct >= 100
          ? '合体!'
          : `${mPct}%`;
      btnMechaOverlord.disabled = mActive || state.mechaOverlordCharge < 100;
      btnMechaOverlord.classList.toggle('ready', !mActive && state.mechaOverlordCharge >= 100);
      btnMechaOverlord.classList.toggle('is-deployed', mActive);
    }
  }

  if (btnTacticalSubweapon && subweaponFill && subweaponPct) {
    const swPct = Math.floor(state.subWeaponCharge);
    const swCombat = state.getSubWeaponCombatSpec();
    const remSec =
      swPct >= 100
        ? 0
        : Math.max(1, Math.ceil(((100 - state.subWeaponCharge) / 100) * swCombat.cooldownSec));
    const swKey = `${state.equippedSubWeapon}_${swPct}_${remSec}`;
    if (swKey !== lastHudSubweaponKey) {
      lastHudSubweaponKey = swKey;
      subweaponFill.style.width = `${swPct}%`;
      subweaponPct.textContent = swPct >= 100 ? '满' : `${remSec}s`;
      btnTacticalSubweapon.disabled = swPct < 100;
      btnTacticalSubweapon.classList.toggle('ready', swPct >= 100);
    }
  }

  const curMechaActive = Boolean(world.mechaOverlord?.active);
  const curSubweaponZone = Boolean(world.syrupZone?.active || world.rallyAuraFx?.active);
  const curAdrenaline = world.adrenalineTimer > 0;
  const curAirdropBuff =
    world.dualVolleyTimer > 0 || world.freezeRedsTimer > 0 || world.frontlineGiantsTimer > 0;
  if (
    world.bossBerserkTriggered !== lastBerserkState ||
    curAdrenaline !== lastAdrenalineActive ||
    curAdrenaline ||
    curAirdropBuff !== lastAirdropBuffActive ||
    curAirdropBuff ||
    curMechaActive !== lastMechaActiveHud ||
    curMechaActive ||
    curSubweaponZone !== lastSubweaponZoneHud ||
    curSubweaponZone
  ) {
    lastBerserkState = world.bossBerserkTriggered;
    lastAdrenalineActive = curAdrenaline;
    lastAirdropBuffActive = curAirdropBuff;
    lastMechaActiveHud = curMechaActive;
    lastSubweaponZoneHud = curSubweaponZone;
    renderActiveBuffsBar();
  }
}

// Event Listeners
if (btnHome) {
  btnHome.addEventListener('click', () => {
    openMainMenu();
  });
}

if (btnStartBattle) {
  btnStartBattle.addEventListener('click', () => {
    sound.playUpgrade();
    launchBattle();
  });
}

if (btnStartTournament) {
  btnStartTournament.addEventListener('click', () => {
    sound.playUpgrade();
    launchGearTournament();
  });
}

if (btnStartPirateBoarding) {
  btnStartPirateBoarding.addEventListener('click', () => {
    sound.playUpgrade();
    launchPirateBoarding();
  });
}

if (btnStartJungleSwing) {
  btnStartJungleSwing.addEventListener('click', () => {
    sound.playUpgrade();
    launchJungleSwing();
  });
}

if (btnStartPyramidRun) {
  btnStartPyramidRun.addEventListener('click', () => {
    sound.playUpgrade();
    launchPyramidRun();
  });
}

if (btnStartPumpkinNight) {
  btnStartPumpkinNight.addEventListener('click', () => {
    sound.playUpgrade();
    launchPumpkinNight();
  });
}

if (btnStartAsteroidDash) {
  btnStartAsteroidDash.addEventListener('click', () => {
    sound.playUpgrade();
    launchAsteroidDash();
  });
}

if (btnStartLavaJump) {
  btnStartLavaJump.addEventListener('click', () => {
    sound.playUpgrade();
    launchLavaJump();
  });
}

if (btnStartGlacierSled) {
  btnStartGlacierSled.addEventListener('click', () => {
    sound.playUpgrade();
    launchGlacierSled();
  });
}

if (btnStartSubmarineRescue) {
  btnStartSubmarineRescue.addEventListener('click', () => {
    sound.playUpgrade();
    launchSubmarineRescue();
  });
}

if (btnStartCandyTrainRaid) {
  btnStartCandyTrainRaid.addEventListener('click', () => {
    sound.playUpgrade();
    launchCandyTrainRaid();
  });
}

if (btnStartAirshipEscort) {
  btnStartAirshipEscort.addEventListener('click', () => {
    sound.playUpgrade();
    launchAirshipEscort();
  });
}

if (btnStartColossusRaid) {
  btnStartColossusRaid.addEventListener('click', () => {
    sound.playUpgrade();
    launchColossusRaid();
  });
}

function handleClaimTournamentChestUI(triggerEl: HTMLElement | null): void {
  const res = state.claimTournamentStreakChest();
  if (!res.claimed) return;
  sound.playVictoryFanfare();
  if (triggerEl) {
    spawnMenuUpgradeBurst(
      triggerEl,
      `+${res.coinsAwarded}金 +${res.trophiesAwarded}奖杯!`,
      '#fbbf24'
    );
  }
  if (btnClaimTournamentChest) {
    btnClaimTournamentChest.disabled = true;
    btnClaimTournamentChest.innerHTML = `${UI_ART.check} 已领 (+${res.trophiesAwarded} 奖杯)`;
  }
  showGlobalToast(
    `开启 ${res.streakLabel} 连胜宝箱：+${res.coinsAwarded} 金币 · +${res.cardsAwarded} 碎片卡 · +${res.bricksAwarded} 砖块 · +${res.trophiesAwarded} 锦标赛荣誉奖杯！`
  );
  refreshUpgradeUI();
  renderMainMenu();
}

if (btnLobbyClaimChest) {
  btnLobbyClaimChest.addEventListener('click', () => {
    handleClaimTournamentChestUI(btnLobbyClaimChest);
  });
}

if (btnClaimTournamentChest) {
  btnClaimTournamentChest.addEventListener('click', () => {
    handleClaimTournamentChestUI(btnClaimTournamentChest);
  });
}

if (btnStartEscort) {
  btnStartEscort.addEventListener('click', () => {
    sound.playUpgrade();
    launchPayloadEscort();
  });
}

if (btnStartEndless) {
  btnStartEndless.addEventListener('click', () => {
    sound.playUpgrade();
    launchEndlessDefense();
  });
}

if (btnEditName) {
  btnEditName.addEventListener('click', () => {
    if (state.gold < RENAME_GOLD_COST) {
      showGlobalToast(
        `💰 改名需花费 ${RENAME_GOLD_COST.toLocaleString()} 金币（当前：${Math.floor(state.gold).toLocaleString()} 金币）`
      );
      return;
    }
    const { value: input, unavailable } = askText(
      `请输入新的昵称（最多14个字符，改名需花费 ${RENAME_GOLD_COST.toLocaleString()} 金币）：`,
      state.playerName
    );
    if (unavailable) showGlobalToast(PROMPT_UNAVAILABLE_TEXT);
    if (input && input.trim()) {
      const res = state.setPlayerName(input);
      if (res.ok) {
        sound.playUpgrade();
        spawnMenuUpgradeBurst(btnEditName, `-${RENAME_GOLD_COST.toLocaleString()} 金币`, '#f59e0b');
        showGlobalToast(`✅ 改名成功：「${escapeHtml(state.playerName)}」（已消耗 ${RENAME_GOLD_COST.toLocaleString()} 金币）`);
        refreshUpgradeUI();
        renderMainMenu();
      } else if (res.reason === 'blocked') {
        showGlobalToast('🚫 这个昵称不能用，换一个吧（没扣金币）');
      } else if (res.reason === 'insufficient_gold') {
        showGlobalToast(
          `💰 改名需花费 ${RENAME_GOLD_COST.toLocaleString()} 金币（当前：${Math.floor(state.gold).toLocaleString()} 金币）`
        );
      }
    }
  });
}

// 榜单行上的小旗：举报昵称（行每次重绘，所以挂在列表上）
if (leaderboardListEl) {
  leaderboardListEl.addEventListener('click', (ev) => {
    const btn = (ev.target as HTMLElement | null)?.closest<HTMLButtonElement>('.lb-report-btn');
    if (!btn || btn.disabled) return;
    ev.stopPropagation();
    const publicId = btn.dataset.reportId || '';
    const choices = REPORT_REASONS.map((r, i) => `${i + 1} ${r.label}`).join('  ');
    const asked = askText(`举报「${btn.dataset.reportName || ''}」的昵称，填编号：\n${choices}`, '1');
    if (asked.unavailable) showGlobalToast(PROMPT_UNAVAILABLE_TEXT);
    const reason = parseReportChoice(asked.value);
    if (!publicId || !reason) return;
    btn.disabled = true;
    void state.reportLeaderboardName(publicId, reason).then((res) => {
      showGlobalToast(reportResultText(res.ok, res.reason));
      if (!res.ok && res.reason !== 'duplicate') btn.disabled = false;
    });
  });
}

if (btnCommanderProfile) {
  btnCommanderProfile.addEventListener('click', () => {
    btnEditName?.click();
  });
}

if (btnHeaderStars) {
  btnHeaderStars.addEventListener('click', () => {
    sound.playUpgrade();
    switchMainMenuTab('skills');
  });
}

if (btnHeaderGold) {
  btnHeaderGold.addEventListener('click', () => {
    sound.playUpgrade();
    switchMainMenuTab('meta');
  });
}

if (menuEquippedSkin) {
  menuEquippedSkin.addEventListener('click', () => {
    sound.playUpgrade();
    switchMainMenuTab('skins');
  });
}

function cycleHomeRace(delta: number): void {
  const curRace = state.getActiveRaceBranch();
  const idx = SKILL_TREE_BRANCHES.findIndex((b) => b.id === curRace.id);
  const nextBranch =
    SKILL_TREE_BRANCHES[(idx + delta + SKILL_TREE_BRANCHES.length) % SKILL_TREE_BRANCHES.length];
  selectedSkillNodeId = nextBranch.nodes[0].id;
  if (state.selectRaceBranch(nextBranch.id)) {
    sound.playUpgrade();
    world.applySkin(state.getEquippedSkin());
    spawnMenuUpgradeBurst(homeMascotArtEl, `${nextBranch.raceName}出阵!`, nextBranch.accentColor);
    refreshMechaUI();
    renderMainMenu();
    renderActiveBuffsBar();
  }
}

if (btnHomePrevRace) {
  btnHomePrevRace.addEventListener('click', (e) => {
    e.stopPropagation();
    cycleHomeRace(-1);
  });
}

if (btnHomeNextRace) {
  btnHomeNextRace.addEventListener('click', (e) => {
    e.stopPropagation();
    cycleHomeRace(1);
  });
}

if (btnHomeMecha) {
  btnHomeMecha.addEventListener('click', () => {
    const nextSpec = state.cycleMechaMode();
    sound.playUpgrade();
    refreshMechaUI();
    spawnMenuUpgradeBurst(btnHomeMecha, `主打歌：${nextSpec.name}`, '#ec4899');
    renderMainMenu();
  });
}

if (btnHomeWeapon) {
  btnHomeWeapon.addEventListener('click', () => {
    const nextW = state.cycleWeaponMode();
    sound.playUpgrade();
    world.syncTurretEvolution(false);
    refreshWeaponUI();
    spawnMenuUpgradeBurst(btnHomeWeapon, `主炮：${nextW.name}`, '#38bdf8');
    renderMainMenu();
  });
}

if (menuActiveKeystonePill) {
  menuActiveKeystonePill.addEventListener('click', () => {
    sound.playUpgrade();
    switchMainMenuTab('skills');
  });
}

if (btnBuyTalent) {
  btnBuyTalent.addEventListener('click', () => {
    if (state.buyBonusTalentPoint()) {
      sound.playUpgrade();
      spawnMenuUpgradeBurst(btnBuyTalent, '天赋星 +1!', '#f59e0b');
      refreshUpgradeUI();
      renderMainMenu();
    }
  });
}

if (btnResetSkills) {
  btnResetSkills.addEventListener('click', () => {
    const spent = state.getSpentTalentPoints();
    if (spent <= 0) return;
    const cost = state.getResetSkillTreeCost();
    const discount = state.getResetSkillTreeDiscount();
    if (state.gold < cost) return;
    const ok = window.confirm(
      `确定${cost === 0 ? '免费 (0 金币)' : `支付 ${cost.toLocaleString()} 金币`}进行洗点并重置所选流派吗？\n（将全额返还已投入的 ${spent} 点天赋；本次已享受 ${state.stagesPlayedSinceRespec} 关累计减免 -${discount.toLocaleString()} 金币，洗点后之前积累的减免将清空，且下次基础洗点费上涨 10,000 金币）`
    );
    if (!ok) return;
    if (state.resetSkillTree()) {
      sound.playUpgrade();
      world.applySkin(state.getEquippedSkin());
      refreshMechaUI();
      refreshUpgradeUI();
      renderMainMenu();
      renderActiveBuffsBar();
    }
  });
}

if (btnToggleTreeZoom) {
  btnToggleTreeZoom.addEventListener('click', () => {
    isMobileTreeZoomed = !isMobileTreeZoomed;
    renderSkillTreePanel();
    if (isMobileTreeZoomed && skillTreeViewportEl && skillTreeCanvasEl) {
      const node = ALL_SKILL_NODES.find((n) => n.id === selectedSkillNodeId);
      const branchCoords = node ? TREE_BRANCH_LAYOUT[node.branchId] : undefined;
      const targetXRatio = branchCoords ? branchCoords[0].x / 100 : 0.5;
      const targetScroll =
        skillTreeCanvasEl.scrollWidth * targetXRatio - skillTreeViewportEl.clientWidth * 0.5;
      skillTreeViewportEl.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' });
    }
  });
}

type MenuTabId = 'launch' | 'skills' | 'meta' | 'skins';
const MENU_TAB_ORDER: MenuTabId[] = ['launch', 'skills', 'meta', 'skins'];

function getActiveMainMenuTab(): MenuTabId {
  const activeBtn = document.querySelector<HTMLButtonElement>('.menu-tab.active');
  const tab = activeBtn?.dataset.tab as MenuTabId | undefined;
  return tab && MENU_TAB_ORDER.includes(tab) ? tab : 'launch';
}

function switchMainMenuTab(tab: MenuTabId): void {
  document.querySelectorAll('.menu-tab').forEach((b) => b.classList.remove('active'));
  document.querySelectorAll('.menu-panel').forEach((p) => p.classList.remove('active'));
  const targetBtn = document.querySelector<HTMLButtonElement>(`.menu-tab[data-tab="${tab}"]`);
  const targetPanel = document.getElementById(`menu-panel-${tab}`);
  if (targetBtn) targetBtn.classList.add('active');
  if (targetPanel) targetPanel.classList.add('active');
  mainMenuCardEl?.classList.toggle('wide-tree-mode', tab === 'skills');
  renderMainMenu();
}

document.querySelectorAll<HTMLButtonElement>('.menu-tab').forEach((tabBtn) => {
  tabBtn.addEventListener('click', () => {
    const tab = tabBtn.dataset.tab as MenuTabId | undefined;
    if (tab && MENU_TAB_ORDER.includes(tab)) {
      switchMainMenuTab(tab);
    }
  });
});

btnRerollMap.addEventListener('click', () => {
  startLevel(state.currentLevelIndex);
  showBanner(`🎲 重随地图 · ${world.currentTheme.name}`);
});

btnCamera.addEventListener('click', () => {
  const modeName = world.toggleCameraMode();
  btnCamera.innerHTML = `${UI_ART.camera} <span>切视角</span>`;
  showBanner(`${UI_ART.camera} ${modeName}`);
});

const syncSoundBtnLabels = (on: boolean) => {
  const html = on ? `${UI_ART.soundOn} <span>音效</span>` : `${UI_ART.soundOff} <span>静音</span>`;
  btnSound.innerHTML = html;
  if (btnTitleSound) btnTitleSound.innerHTML = html;
};

btnSound.addEventListener('click', () => {
  const on = sound.toggle();
  syncSoundBtnLabels(on);
});

if (btnTitleSound) {
  btnTitleSound.addEventListener('click', (e) => {
    e.stopPropagation();
    const on = sound.toggle();
    syncSoundBtnLabels(on);
  });
}

bindLegalLinks();

if (btnEnterWorkshop) {
  btnEnterWorkshop.addEventListener('click', (e) => {
    e.stopPropagation();
    enterWorkshopFromTitle();
  });
}

if (titleScreenEl) {
  titleScreenEl.addEventListener('click', (e) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest('#btn-title-sound')) return;
    enterWorkshopFromTitle();
  });
}

if (btnBackToTitle) {
  btnBackToTitle.addEventListener('click', () => {
    sound.playUpgrade();
    openTitleScreen();
  });
}

btnRestart.addEventListener('click', () => {
  startLevel(state.currentLevelIndex);
});

btnMechaMode.addEventListener('click', () => {
  const nextSpec = state.cycleMechaMode();
  sound.playUpgrade();
  refreshMechaUI();
  renderActiveBuffsBar();
  showBanner(`${nextSpec.icon} ${nextSpec.name}`);
});

if (btnWeaponMode) {
  btnWeaponMode.addEventListener('click', () => {
    const nextW = state.cycleWeaponMode();
    sound.playUpgrade();
    world.syncTurretEvolution(false);
    refreshWeaponUI();
    renderActiveBuffsBar();
    showBanner(`${nextW.icon} ${nextW.name}`, nextW.bannerDesc);
  });
}

btnChampion.addEventListener('click', () => {
  world.deployChampion();
});

btnOrbital.addEventListener('click', () => {
  world.triggerOrbitalStrike();
});

if (btnMechaOverlord) {
  btnMechaOverlord.addEventListener('click', () => {
    world.summonMechaOverlord();
  });
}

if (btnTacticalSubweapon) {
  btnTacticalSubweapon.addEventListener('click', () => {
    world.triggerTacticalSubWeapon();
  });
}

function rollTycoonFreeDoubleUpgrade(btnEl: HTMLElement): boolean {
  if (state.getSkillNodeRank('tycoon_t4') > 0 && Math.random() < 0.2) {
    spawnMenuUpgradeBurst(btnEl, '👑 免单连升 +2!', '#facc15');
    return true;
  }
  return false;
}

upgFireRate.addEventListener('click', () => {
  const cost = state.getFireRateCost();
  if (Math.floor(state.runCombatTimePool) >= cost) {
    const isFreeDouble = rollTycoonFreeDoubleUpgrade(upgFireRate);
    if (!isFreeDouble) {
      state.runCombatTimePool = Math.max(0, state.runCombatTimePool - cost);
    }
    state.fireRateLevel += isFreeDouble ? 2 : 1;
    state.save();
    sound.playUpgrade();
    world.syncTurretEvolution(true);
    refreshUpgradeUI();
  }
});

upgPower.addEventListener('click', () => {
  const cost = state.getPowerCost();
  if (Math.floor(state.runKillsPool) >= cost) {
    const isFreeDouble = rollTycoonFreeDoubleUpgrade(upgPower);
    if (!isFreeDouble) {
      state.runKillsPool = Math.max(0, state.runKillsPool - cost);
    }
    state.powerLevel += isFreeDouble ? 2 : 1;
    state.save();
    sound.playUpgrade();
    world.syncTurretEvolution(true);
    refreshUpgradeUI();
  }
});

upgChampion.addEventListener('click', () => {
  const cost = state.getChampionCost();
  if (Math.floor(state.runSpawnsPool) >= cost) {
    const prevTier = state.getUltimateEvolutionSpec().tier;
    const isFreeDouble = rollTycoonFreeDoubleUpgrade(upgChampion);
    if (!isFreeDouble) {
      state.runSpawnsPool = Math.max(0, state.runSpawnsPool - cost);
    }
    state.championLevel += isFreeDouble ? 2 : 1;
    state.save();
    sound.playUpgrade();
    refreshMechaUI();
    refreshUpgradeUI();
    const nextEvo = state.getUltimateEvolutionSpec();
    if (nextEvo.tier > prevTier) {
      showBanner(
        `✨ 大招进化 · 【${nextEvo.badge}】`,
        nextEvo.isCompleteForm
          ? '👑 完全体大招已解锁：全屏连环礼花与震波特效全面绽放！'
          : '大招伤害、范围与特效波次已提升！'
      );
    }
  }
});

upgLoot.addEventListener('click', () => {
  const cost = state.getLootCost();
  if (Math.floor(state.runSiegePool) >= cost) {
    const isFreeDouble = rollTycoonFreeDoubleUpgrade(upgLoot);
    if (!isFreeDouble) {
      state.runSiegePool = Math.max(0, state.runSiegePool - cost);
    }
    state.lootLevel += isFreeDouble ? 2 : 1;
    state.save();
    sound.playUpgrade();
    refreshUpgradeUI();
  }
});

if (btnModalHome) {
  btnModalHome.addEventListener('click', () => {
    openMainMenu();
  });
}

btnModalReplay.addEventListener('click', () => {
  if (world.currentLevel?.isPirateBoarding) {
    launchPirateBoarding();
    return;
  }

  if (world.currentLevel?.isJungleSwing) {
    if (resultModal.classList.contains('victory-mode')) {
      openMainMenu();
      document.querySelector<HTMLButtonElement>('.menu-tab[data-tab="meta"]')?.click();
      document.getElementById('trophy-hall')?.scrollIntoView({ block: 'start' });
    } else {
      launchJungleSwing();
    }
    return;
  }

  if (world.currentLevel?.isPyramidRun) {
    if (resultModal.classList.contains('victory-mode')) {
      openMainMenu();
      document.querySelector<HTMLButtonElement>('.menu-tab[data-tab="meta"]')?.click();
      document.getElementById('trophy-hall')?.scrollIntoView({ block: 'start' });
    } else {
      launchPyramidRun();
    }
    return;
  }

  if (world.currentLevel?.isPumpkinNight) {
    if (resultModal.classList.contains('victory-mode')) {
      openMainMenu();
      openTacticDeckPanel();
    } else {
      launchPumpkinNight();
    }
    return;
  }

  if (world.currentLevel?.isAsteroidDash) {
    if (resultModal.classList.contains('victory-mode')) {
      openMainMenu();
      document.querySelector<HTMLButtonElement>('.menu-tab[data-tab="meta"]')?.click();
      document.getElementById('decor-hall')?.scrollIntoView({ block: 'start' });
    } else {
      launchAsteroidDash();
    }
    return;
  }

  if (world.currentLevel?.isLavaJump) {
    if (resultModal.classList.contains('victory-mode')) {
      openMainMenu();
      document.querySelector<HTMLButtonElement>('.menu-tab[data-tab="meta"]')?.click();
      document.getElementById('gacha-machine')?.scrollIntoView({ block: 'start' });
    } else {
      launchLavaJump();
    }
    return;
  }

  if (world.currentLevel?.isGlacierSled) {
    if (resultModal.classList.contains('victory-mode')) {
      openMainMenu();
      document.querySelector<HTMLButtonElement>('.menu-tab[data-tab="meta"]')?.click();
      document.getElementById('trophy-hall')?.scrollIntoView({ block: 'start' });
    } else {
      launchGlacierSled();
    }
    return;
  }

  if (world.currentLevel?.isSubmarineRescue) {
    if (resultModal.classList.contains('victory-mode')) {
      openMainMenu();
      document.querySelector<HTMLButtonElement>('.menu-tab[data-tab="meta"]')?.click();
      document.getElementById('pet-companion-dock')?.scrollIntoView({ block: 'start' });
    } else {
      launchSubmarineRescue();
    }
    return;
  }

  if (world.currentLevel?.isCandyTrainRaid) {
    if (resultModal.classList.contains('victory-mode')) {
      openMainMenu();
      document.querySelector<HTMLButtonElement>('.menu-tab[data-tab="meta"]')?.click();
      document.getElementById('relic-banner-stand')?.scrollIntoView({ block: 'start' });
    } else {
      launchCandyTrainRaid();
    }
    return;
  }

  if (world.currentLevel?.isAirshipEscort) {
    if (resultModal.classList.contains('victory-mode')) {
      openMainMenu();
      document.querySelector<HTMLButtonElement>('.menu-tab[data-tab="meta"]')?.click();
    } else {
      launchAirshipEscort();
    }
    return;
  }

  if (world.currentLevel?.isColossusRaid) {
    if (resultModal.classList.contains('victory-mode')) {
      openMainMenu();
      document.querySelector<HTMLButtonElement>('.menu-tab[data-tab="meta"]')?.click();
    } else {
      launchColossusRaid();
    }
    return;
  }

  if (world.currentLevel?.isGearTournament) {
    launchGearTournament();
    return;
  }
  if (world.currentLevel?.isPayloadEscort) {
    launchPayloadEscort();
    return;
  }
  if (world.currentLevel?.isEndlessDefense) {
    launchEndlessDefense();
    return;
  }
  if (!rewardSection.classList.contains('hidden') && !hasClaimedStageReward) {
    if (isSpeedSkipEligible && isSpeedSkipActive) {
      isSpeedSkipActive = false;
      const stageNum = state.currentLevelIndex + 1;
      currentRewardOptions = state.rebuildRewardOptions(stageNum, currentRewardOptions, 1);
    }
    if (!commitStageReward()) return;
  }
  pendingBonusHeistStage = 0;
  startLevel(state.currentLevelIndex);
});

btnModalNext.addEventListener('click', () => {
  if (world.currentLevel?.isPirateBoarding) {
    launchPirateBoarding();
    return;
  }

  if (world.currentLevel?.isJungleSwing) {
    launchJungleSwing();
    return;
  }

  if (world.currentLevel?.isPyramidRun) {
    launchPyramidRun();
    return;
  }

  if (world.currentLevel?.isPumpkinNight) {
    launchPumpkinNight();
    return;
  }

  if (world.currentLevel?.isAsteroidDash) {
    launchAsteroidDash();
    return;
  }

  if (world.currentLevel?.isLavaJump) {
    launchLavaJump();
    return;
  }

  if (world.currentLevel?.isGlacierSled) {
    launchGlacierSled();
    return;
  }

  if (world.currentLevel?.isSubmarineRescue) {
    launchSubmarineRescue();
    return;
  }

  if (world.currentLevel?.isCandyTrainRaid) {
    launchCandyTrainRaid();
    return;
  }

  if (world.currentLevel?.isAirshipEscort) {
    launchAirshipEscort();
    return;
  }

  if (world.currentLevel?.isColossusRaid) {
    launchColossusRaid();
    return;
  }

  if (world.currentLevel?.isGearTournament) {
    if (state.pendingTournamentChestStage > 0) {
      handleClaimTournamentChestUI(btnClaimTournamentChest);
    }
    launchGearTournament();
    return;
  }

  if (world.currentLevel?.isBonusHeist) {
    startLevel(pendingNextCampaignIdx);
    return;
  }
  if (!rewardSection.classList.contains('hidden') && !hasClaimedStageReward) {
    if (!commitStageReward()) return;
  }
  let nextIdx = state.currentLevelIndex + 1;
  if (isSpeedSkipEligible && isSpeedSkipActive) {
    const stageNum = state.currentLevelIndex + 1;
    state.creditSkippedStages(stageNum + 2, 2);
    nextIdx = state.currentLevelIndex + 3;
  }
  if (pendingBonusHeistStage > 0) {
    startBonusHeist(pendingBonusHeistStage, nextIdx);
    return;
  }
  startLevel(nextIdx);
});

// Preload 3D stage background & open Title Cover Screen on startup
startLevel(state.currentLevelIndex);
openTitleScreen();
if (document.readyState === 'complete') warmLobbyArt();
else window.addEventListener('load', warmLobbyArt, { once: true });

if (btnLbPeak) {
  btnLbPeak.addEventListener('click', () => {
    if (leaderboardMode === 'peak') return;
    leaderboardMode = 'peak';
    sound.playUpgrade();
    renderMainMenu();
  });
}

if (btnLbActive) {
  btnLbActive.addEventListener('click', () => {
    if (leaderboardMode === 'active') return;
    leaderboardMode = 'active';
    sound.playUpgrade();
    renderMainMenu();
  });
}

if (btnShareGame) {
  btnShareGame.addEventListener('click', () => {
    void handleShareGame();
  });
}

if (btnModalShare) {
  btnModalShare.addEventListener('click', () => {
    const stageNum = state.currentLevelIndex + 1;
    const clearSec = Math.max(0.1, world.stageCombatTime);
    void handleShareGame(stageNum, clearSec);
  });
}

function parseDigitKey(code: string): number {
  if (code.startsWith('Digit')) {
    const n = Number(code.slice(5));
    return n >= 1 && n <= 9 ? n : 0;
  }
  if (code.startsWith('Numpad')) {
    const n = Number(code.slice(6));
    return n >= 1 && n <= 9 ? n : 0;
  }
  return 0;
}

// Unified PC Full Keyboard Controller (Main Menu, Settlement Modal & Battle HUD)
window.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.altKey || e.metaKey) return;
  const activeTag = (document.activeElement as HTMLElement | null)?.tagName;
  if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') return;

  const isMenuOpen = !mainMenu.classList.contains('hidden');
  const isModalOpen = !resultModal.classList.contains('hidden');
  const digit = parseDigitKey(e.code);

  // 0. Fullscreen Title / Splash Cover Screen Keyboard Controls
  if (isTitleScreenOpen && titleScreenEl && !titleScreenEl.classList.contains('hidden')) {
    if (e.code === 'KeyM') {
      e.preventDefault();
      btnTitleSound?.click();
      return;
    }
    if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyF' || digit === 1) {
      e.preventDefault();
      enterWorkshopFromTitle();
      return;
    }
    return;
  }

  // 1. Command Center Main Menu Keyboard Controls
  if (isMenuOpen) {
    const curTab = getActiveMainMenuTab();
    const curTabIdx = MENU_TAB_ORDER.indexOf(curTab);

    // Direct function keys F1 - F4 to switch tabs
    if (e.code === 'F1' || e.code === 'F2' || e.code === 'F3' || e.code === 'F4') {
      e.preventDefault();
      const targetIdx = Number(e.code.slice(1)) - 1;
      sound.playUpgrade();
      switchMainMenuTab(MENU_TAB_ORDER[targetIdx]);
      return;
    }

    // Cycle tabs via Tab / Shift+Tab, Q / E, or [ / ]
    if (
      e.code === 'Tab' ||
      e.code === 'KeyQ' ||
      e.code === 'KeyE' ||
      e.code === 'BracketLeft' ||
      e.code === 'BracketRight'
    ) {
      e.preventDefault();
      const delta =
        (e.code === 'Tab' && e.shiftKey) || e.code === 'KeyQ' || e.code === 'BracketLeft' ? -1 : 1;
      const nextIdx = (curTabIdx + delta + MENU_TAB_ORDER.length) % MENU_TAB_ORDER.length;
      sound.playUpgrade();
      switchMainMenuTab(MENU_TAB_ORDER[nextIdx]);
      return;
    }

    // Tab 1: Battle Launch & Dual Leaderboards
    if (curTab === 'launch') {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        btnStartBattle.click();
      } else if (e.code === 'KeyG') {
        e.preventDefault();
        sound.playUpgrade();
        switchMainMenuTab('skills');
      } else if (digit === 1) {
        e.preventDefault();
        btnLbPeak?.click();
      } else if (digit === 2) {
        e.preventDefault();
        btnLbActive?.click();
      } else if (e.code === 'KeyL') {
        e.preventDefault();
        if (leaderboardMode === 'peak') btnLbActive?.click();
        else btnLbPeak?.click();
      } else if (e.code === 'KeyN') {
        e.preventDefault();
        btnEditName?.click();
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        btnShareGame?.click();
      } else if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        e.preventDefault();
        cycleHomeRace(-1);
      } else if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        e.preventDefault();
        cycleHomeRace(1);
      } else if (e.code === 'KeyW' || e.code === 'ArrowUp') {
        e.preventDefault();
        leaderboardListEl?.scrollBy({ top: -72, behavior: 'smooth' });
      } else if (e.code === 'KeyS' || e.code === 'ArrowDown') {
        e.preventDefault();
        leaderboardListEl?.scrollBy({ top: 72, behavior: 'smooth' });
      }
      return;
    }

    // Tab 2: 7-Branch Tactical Skill Tree
    if (curTab === 'skills') {
      const curNode = ALL_SKILL_NODES.find((n) => n.id === selectedSkillNodeId) || ALL_SKILL_NODES[0];
      const bIdx = Math.max(
        0,
        SKILL_TREE_BRANCHES.findIndex((b) => b.id === curNode.branchId)
      );
      const tIdx = Math.max(0, Math.min(3, curNode.tier - 1));

      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        e.preventDefault();
        const prevBranch = SKILL_TREE_BRANCHES[(bIdx + SKILL_TREE_BRANCHES.length - 1) % SKILL_TREE_BRANCHES.length];
        selectedSkillNodeId = prevBranch.nodes[tIdx].id;
        if (state.selectRaceBranch(prevBranch.id)) {
          world.applySkin(state.getEquippedSkin());
        }
        renderMainMenu();
      } else if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        e.preventDefault();
        const nextBranch = SKILL_TREE_BRANCHES[(bIdx + 1) % SKILL_TREE_BRANCHES.length];
        selectedSkillNodeId = nextBranch.nodes[tIdx].id;
        if (state.selectRaceBranch(nextBranch.id)) {
          world.applySkin(state.getEquippedSkin());
        }
        renderMainMenu();
      } else if (e.code === 'KeyW' || e.code === 'ArrowUp') {
        e.preventDefault();
        const nextTierIdx = Math.min(3, tIdx + 1);
        selectedSkillNodeId = SKILL_TREE_BRANCHES[bIdx].nodes[nextTierIdx].id;
        renderSkillTreePanel();
      } else if (e.code === 'KeyS' || e.code === 'ArrowDown') {
        e.preventDefault();
        const prevTierIdx = Math.max(0, tIdx - 1);
        selectedSkillNodeId = SKILL_TREE_BRANCHES[bIdx].nodes[prevTierIdx].id;
        renderSkillTreePanel();
      } else if (digit >= 1 && digit <= 7) {
        e.preventDefault();
        const targetBranch = SKILL_TREE_BRANCHES[digit - 1];
        if (targetBranch) {
          selectedSkillNodeId = targetBranch.nodes[tIdx].id;
          if (state.selectRaceBranch(targetBranch.id)) {
            world.applySkin(state.getEquippedSkin());
          }
          renderMainMenu();
        }
      } else if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        const upgBtn = document.getElementById('btn-inspector-upgrade') as HTMLButtonElement | null;
        if (upgBtn && !upgBtn.disabled) {
          upgBtn.click();
        }
      } else if (e.code === 'KeyB') {
        e.preventDefault();
        if (btnBuyTalent && !btnBuyTalent.disabled) {
          btnBuyTalent.click();
        }
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        if (btnResetSkills && !btnResetSkills.disabled) {
          btnResetSkills.click();
        }
      } else if (e.code === 'KeyZ') {
        e.preventDefault();
        btnToggleTreeZoom?.click();
      }
      return;
    }

    // Tab 3: Out-of-Match Base Attribute Tech Upgrades (3x2 Grid)
    if (curTab === 'meta') {
      const count = META_UPGRADES.length;
      if (digit >= 1 && digit <= count) {
        e.preventDefault();
        isKbdNavActive = true;
        selectedMetaIndex = digit - 1;
        const btns = metaUpgradesGrid.querySelectorAll<HTMLButtonElement>('.meta-buy-btn');
        const btn = btns[selectedMetaIndex];
        if (btn && !btn.disabled) {
          btn.click();
        } else {
          renderMainMenu();
        }
      } else if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        e.preventDefault();
        isKbdNavActive = true;
        selectedMetaIndex = (selectedMetaIndex + count - 1) % count;
        renderMainMenu();
      } else if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        e.preventDefault();
        isKbdNavActive = true;
        selectedMetaIndex = (selectedMetaIndex + 1) % count;
        renderMainMenu();
      } else if (e.code === 'KeyW' || e.code === 'ArrowUp' || e.code === 'KeyS' || e.code === 'ArrowDown') {
        e.preventDefault();
        isKbdNavActive = true;
        selectedMetaIndex = (selectedMetaIndex + 3) % count;
        renderMainMenu();
      } else if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        isKbdNavActive = true;
        const btns = metaUpgradesGrid.querySelectorAll<HTMLButtonElement>('.meta-buy-btn');
        const btn = btns[selectedMetaIndex];
        if (btn && !btn.disabled) {
          btn.click();
        }
      }
      return;
    }

    // Tab 4: Armory Skins (3x2 Grid — Buy/Equip + Shard Ascension)
    if (curTab === 'skins') {
      const count = SKINS_CATALOG.length;
      if (digit >= 1 && digit <= count) {
        e.preventDefault();
        isKbdNavActive = true;
        selectedSkinIndex = digit - 1;
        const cards = skinsShopGrid.querySelectorAll<HTMLElement>('.skin-card');
        const btn = cards[selectedSkinIndex]?.querySelector<HTMLButtonElement>('.skin-action-btn');
        if (btn && !btn.disabled) {
          btn.click();
        } else {
          renderMainMenu();
        }
      } else if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        e.preventDefault();
        isKbdNavActive = true;
        selectedSkinIndex = (selectedSkinIndex + count - 1) % count;
        renderMainMenu();
      } else if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        e.preventDefault();
        isKbdNavActive = true;
        selectedSkinIndex = (selectedSkinIndex + 1) % count;
        renderMainMenu();
      } else if (e.code === 'KeyW' || e.code === 'ArrowUp' || e.code === 'KeyS' || e.code === 'ArrowDown') {
        e.preventDefault();
        isKbdNavActive = true;
        selectedSkinIndex = (selectedSkinIndex + 3) % count;
        renderMainMenu();
      } else if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        isKbdNavActive = true;
        const cards = skinsShopGrid.querySelectorAll<HTMLElement>('.skin-card');
        const btn = cards[selectedSkinIndex]?.querySelector<HTMLButtonElement>('.skin-action-btn');
        if (btn && !btn.disabled) {
          btn.click();
        }
      } else if (e.code === 'KeyU') {
        e.preventDefault();
        isKbdNavActive = true;
        const cards = skinsShopGrid.querySelectorAll<HTMLElement>('.skin-card');
        let ascBtn = cards[selectedSkinIndex]?.querySelector<HTMLButtonElement>('.skin-ascend-btn:not(:disabled)');
        if (!ascBtn) {
          ascBtn = skinsShopGrid.querySelector<HTMLButtonElement>('.skin-ascend-btn:not(:disabled)');
        }
        if (ascBtn) {
          ascBtn.click();
        }
      }
      return;
    }
  }

  // 2. Victory / Defeat Settlement Modal Keyboard Controls
  if (isModalOpen) {
    const isRewardVisible = !rewardSection.classList.contains('hidden');
    const isPenaltyVisible = !penaltySection.classList.contains('hidden');

    if (isRewardVisible && !hasClaimedStageReward) {
      if (digit >= 1 && digit <= 3 && digit <= currentRewardOptions.length) {
        e.preventDefault();
        selectStageRewardCard(digit - 1);
        return;
      }
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        e.preventDefault();
        const len = currentRewardOptions.length;
        if (len > 0) {
          const nextIdx = selectedRewardIndex <= 0 ? len - 1 : selectedRewardIndex - 1;
          selectStageRewardCard(nextIdx);
        }
        return;
      }
      if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        e.preventDefault();
        const len = currentRewardOptions.length;
        if (len > 0) {
          const nextIdx = selectedRewardIndex < 0 ? 0 : (selectedRewardIndex + 1) % len;
          selectStageRewardCard(nextIdx);
        }
        return;
      }
      if (e.code === 'KeyR') {
        e.preventDefault();
        if (btnRerollRewards && !btnRerollRewards.disabled) {
          btnRerollRewards.click();
        }
        return;
      }
      if ((e.code === 'KeyX' || e.code === 'Tab') && isSpeedSkipEligible) {
        e.preventDefault();
        btnToggleSpeedSkip?.click();
        return;
      }
    }

    if (isPenaltyVisible && e.code === 'KeyC') {
      e.preventDefault();
      if (!btnCleanseDebuff.disabled) {
        btnCleanseDebuff.click();
      }
      return;
    }

    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      if (btnModalNext.style.display !== 'none') {
        if (isRewardVisible && !hasClaimedStageReward && selectedRewardIndex < 0) {
          selectStageRewardCard(0);
        } else if (!btnModalNext.disabled) {
          btnModalNext.click();
        }
      } else {
        btnModalReplay.click();
      }
      return;
    }

    if (e.code === 'KeyP' || e.code === 'Backspace') {
      e.preventDefault();
      btnModalReplay.click();
      return;
    }

    if (e.code === 'KeyS') {
      e.preventDefault();
      if (btnModalShare && btnModalShare.style.display !== 'none') {
        btnModalShare.click();
      }
      return;
    }

    if (e.code === 'Escape' || e.code === 'KeyH') {
      e.preventDefault();
      btnModalHome.click();
      return;
    }
    return;
  }

  // 3. In-Battle HUD & Tactical Keyboard Controls
  if (digit === 1) {
    e.preventDefault();
    if (!upgFireRate.disabled) upgFireRate.click();
  } else if (digit === 2) {
    e.preventDefault();
    if (!upgPower.disabled) upgPower.click();
  } else if (digit === 3) {
    e.preventDefault();
    if (!upgChampion.disabled) upgChampion.click();
  } else if (digit === 4) {
    e.preventDefault();
    if (!upgLoot.disabled) upgLoot.click();
  } else if (e.code === 'KeyE' || e.code === 'Tab') {
    e.preventDefault();
    btnMechaMode.click();
  } else if (e.code === 'KeyF') {
    e.preventDefault();
    btnWeaponMode?.click();
  } else if (e.code === 'Escape' || e.code === 'KeyH') {
    e.preventDefault();
    btnHome.click();
  } else if (e.code === 'KeyG') {
    e.preventDefault();
    btnRerollMap.click();
  } else if (e.code === 'KeyB') {
    e.preventDefault();
    btnCamera.click();
  } else if (e.code === 'KeyM') {
    e.preventDefault();
    btnSound.click();
  } else if (e.code === 'KeyR') {
    e.preventDefault();
    btnRestart.click();
  }
});

const referralWelcome = state.checkAndClaimReferralWelcome();
if (referralWelcome) {
  renderMainMenu();
  refreshUpgradeUI();
  window.setTimeout(() => {
    showGlobalToast(
      `🎁 收到【${escapeHtml(referralWelcome.fromName)}】的偶像应援补给：+${referralWelcome.goldAwarded.toLocaleString()}🪙 星光金币！`
    );
  }, 400);
}

// Main Animation Loop (with Mobile 60Hz Thermal Cap & Menu 15Hz Eco Throttle!)
let lastTime = performance.now();
let lastRenderTime = performance.now();
let hudTickCounter = 0;

function animate(now: number): void {
  requestAnimationFrame(animate);

  if (document.visibilityState !== 'visible') {
    lastTime = now;
    lastRenderTime = now;
    return;
  }

  // Thermal Governor:
  // 1. When Main Menu is open (world.isPaused), throttle background 3D rendering to 15 FPS (~66ms) so the device stays cool!
  // 2. On 120Hz ProMotion mobile screens during battle, cap frame rate at 60 FPS (~15.5ms) to prevent battery/GPU overheating!
  const minFrameInterval = world.isPaused ? 66 : world.isMobileDevice ? 15.5 : 0;
  const elapsedMs = now - lastRenderTime;
  if (minFrameInterval > 0 && elapsedMs < minFrameInterval) {
    return;
  }
  lastRenderTime = now;

  const dt = (now - lastTime) / 1000;
  lastTime = now;

  state.tickPlayTime(Math.min(dt, 0.1));
  world.update(dt);

  // On mobile, update DOM HUD text every 2nd frame (30Hz) to minimize DOM layout work
  hudTickCounter++;
  if (!world.isMobileDevice || (hudTickCounter & 1) === 0) {
    updateLiveHUD();
  }
}
requestAnimationFrame(animate);
