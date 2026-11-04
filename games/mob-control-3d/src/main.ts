import { generateDynamicLevel } from './levels/LevelData';
import {
  ALL_SKILL_NODES,
  GameState,
  META_UPGRADES,
  MetaUpgradeId,
  RENAME_GOLD_COST,
  RewardOption,
  SKILL_TREE_BRANCHES,
  SKINS_CATALOG,
  SkillNodeId,
  SkinId,
} from './game/State';
import { SKIN_CARD_ART, SKILL_NODE_SVGS, UI_ART, replaceEmojiWithArt } from './game/SkillIcons';
import { World3D } from './game/World3D';
import { sound } from './audio/SoundManager';

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

const centerBanner = document.getElementById('center-banner') as HTMLElement;
const bannerTitle = document.getElementById('banner-title') as HTMLElement;
const bannerSub = document.getElementById('banner-sub') as HTMLElement;

const btnTopMenu = document.getElementById('btn-top-menu') as HTMLButtonElement | null;
const topToolsDrawer = document.getElementById('top-tools-drawer') as HTMLElement | null;
const btnResumeDrawer = document.getElementById('btn-resume-drawer') as HTMLButtonElement | null;
const btnHome = document.getElementById('btn-home') as HTMLButtonElement;
const btnRerollMap = document.getElementById('btn-reroll-map') as HTMLButtonElement;
const btnTheme = document.getElementById('btn-theme') as HTMLButtonElement;
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
const btnHomeTheme = document.getElementById('btn-home-theme') as HTMLButtonElement | null;
const homeThemeLabelEl = document.getElementById('home-theme-label') as HTMLElement | null;
const btnHomeMecha = document.getElementById('btn-home-mecha') as HTMLButtonElement | null;
const homeMechaIconEl = document.getElementById('home-mecha-icon') as HTMLElement | null;
const homeMechaLabelEl = document.getElementById('home-mecha-label') as HTMLElement | null;
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
const skinsShopGrid = document.getElementById('skins-shop-grid') as HTMLElement;
const btnStartBattle = document.getElementById('btn-start-battle') as HTMLButtonElement;
const btnModalHome = document.getElementById('btn-modal-home') as HTMLButtonElement;
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
const updateNoticeCardEl = document.getElementById('update-notice-card') as HTMLElement | null;
const btnToggleNotice = document.getElementById('btn-toggle-notice') as HTMLButtonElement | null;

let noticeUserToggled = false;
if (updateNoticeCardEl) {
  updateNoticeCardEl.classList.add('is-collapsed');
}
if (btnToggleNotice && updateNoticeCardEl) {
  btnToggleNotice.addEventListener('click', () => {
    noticeUserToggled = true;
    updateNoticeCardEl.classList.toggle('is-collapsed');
    sound.playUpgrade();
  });
}
window.addEventListener('resize', () => {
  if (!updateNoticeCardEl || noticeUserToggled) return;
  updateNoticeCardEl.classList.add('is-collapsed');
});

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

const btnOrbital = document.getElementById('btn-orbital') as HTMLButtonElement;
const orbitalFill = document.getElementById('orbital-fill') as HTMLElement;
const orbitalName = document.getElementById('orbital-name') as HTMLElement | null;
const orbitalPct = document.getElementById('orbital-pct') as HTMLElement;

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
const rewardSection = document.getElementById('reward-section') as HTMLElement;
const speedSkipBanner = document.getElementById('speed-skip-banner') as HTMLElement | null;
const speedSkipText = document.getElementById('speed-skip-text') as HTMLElement | null;
const btnToggleSpeedSkip = document.getElementById('btn-toggle-speed-skip') as HTMLButtonElement | null;
const rewardPromptText = document.getElementById('reward-prompt-text') as HTMLElement;
const rewardGoldBalanceEl = document.getElementById('reward-gold-balance') as HTMLElement | null;
const btnRerollRewards = document.getElementById('btn-reroll-rewards') as HTMLButtonElement | null;
const rewardCardsContainer = document.getElementById('reward-cards') as HTMLElement;
const penaltySection = document.getElementById('penalty-section') as HTMLElement;
const penaltyListEl = document.getElementById('penalty-list') as HTMLElement;
const btnCleanseDebuff = document.getElementById('btn-cleanse-debuff') as HTMLButtonElement;
const btnModalReplay = document.getElementById('btn-modal-replay') as HTMLButtonElement;
const btnModalShare = document.getElementById('btn-modal-share') as HTMLButtonElement | null;
const btnModalNext = document.getElementById('btn-modal-next') as HTMLButtonElement;
const globalToastEl = document.getElementById('global-toast') as HTMLElement | null;

const world = new World3D(canvas, labelsContainer, state);

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
    showGlobalToast('✅ 战报与邀请链接已复制，快发给好友比拼吧！');
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

function refreshMechaUI(): void {
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
  const metaUpgradableCount = META_UPGRADES.filter((u) => {
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
  const eqRank = state.getSkinRankSpec(skin.id);
  if (menuEquippedSkin) {
    menuEquippedSkin.innerHTML = `${UI_ART.sparkle} <span>${skin.name} · ${eqRank.tier}阶</span>`;
    menuEquippedSkin.style.background = skin.previewGradient;
  }

  const activeKeystone = state.getActiveKeystoneSpec();
  const committedBranch = state.getCommittedSkillBranch();
  const activeRace = state.getActiveRaceBranch();
  const mechaSpec = state.getMechaSpec();
  const spentPts = state.getSpentTalentPoints();

  if (brandCrestImgEl) {
    brandCrestImgEl.src = `/assets/icons/race_${activeRace.id}.png?v=18`;
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
  if (homeThemeLabelEl && world.currentTheme) {
    homeThemeLabelEl.textContent = world.currentTheme.badge;
  }
  if (homeMechaIconEl) {
    homeMechaIconEl.innerHTML = mechaSpec.icon;
  }
  if (homeMechaLabelEl) {
    homeMechaLabelEl.textContent = committedBranch ? committedBranch.hammerMorphName : mechaSpec.shortName;
  }
  if (homeMascotArtEl) {
    homeMascotArtEl.innerHTML = activeRace.icon;
  }
  if (homeRaceTitleEl) {
    homeRaceTitleEl.innerHTML = `${activeKeystone ? `${UI_ART.crown} ` : ''}${activeRace.raceName}`;
  }
  if (homeRacePtsTagEl) {
    homeRacePtsTagEl.innerHTML = `${UI_ART.star} ${spentPts}/16`;
  }
  if (homeRacePerkEl) {
    homeRacePerkEl.textContent = activeKeystone
      ? `终极觉醒：${activeKeystone.node.name} — ${activeKeystone.node.desc}`
      : `${activeRace.subtitle} · 大招【${activeRace.hammerMorphName}】`;
  }
  if (launchBtnSubEl && world.currentTheme) {
    launchBtnSubEl.textContent = `第 1 关起航 · ${world.currentTheme.name} · ${activeRace.raceName}出阵`;
  }

  if (menuActiveKeystonePill) {
    const desktopLabel = activeKeystone
      ? `${activeKeystone.branch.icon} ${UI_ART.crown} ${activeKeystone.branch.raceName}·${activeKeystone.node.name}`
      : committedBranch
        ? `${committedBranch.icon} ${committedBranch.raceName}·${committedBranch.unitName} (${spentPts}/16)`
        : `${activeRace.icon} ${activeRace.raceName}·${activeRace.unitName} (可切族)`;
    const mobileLabel = activeKeystone
      ? `${activeKeystone.branch.icon}${UI_ART.crown} ${activeKeystone.branch.raceName}`
      : `${activeRace.icon} ${activeRace.raceName} (${spentPts}/16)`;
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
          ? `${s.statLabel} ${s.statValueAtRank(curRank.index)} → ${s.statValueAtRank(nextRank.index)}`
          : `${UI_ART.crown} ${s.statLabel} ${s.statValueAtRank(curRank.index)} (满阶)`
        : `${s.statLabel} ${s.statValueAtRank(0)} ~ ${s.statValueAtRank(5)}`;

      const shardSectionHtml = isOwned
        ? `
          <div class="skin-shard-box">
            <div class="skin-shard-row">
              <span style="color: ${asc.isMaxRank || asc.hasEnoughShards ? '#2e8b22' : '#78583a'}">
                ${UI_ART.shard} ${asc.isMaxRank ? `余 ${asc.currentShards}` : `${asc.currentShards}/${asc.requiredShards}`}
              </span>
              <strong style="color: ${asc.isMaxRank ? '#9a3412' : asc.hasEnoughGold ? '#b4690e' : '#c8372d'}">
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
    const { top10, selfRank } = isActiveMode
      ? state.getTop10ActiveLeaderboard()
      : state.getTop10Leaderboard();
    if (leaderboardSelfStatusEl) {
      const rankStr = selfRank && selfRank <= 10 ? `#${selfRank}` : '未上榜';
      leaderboardSelfStatusEl.innerHTML = isActiveMode
        ? `${state.playerName} · ${rankStr} (${state.formatPlayTime(state.playTimeSeconds)})`
        : `${state.playerName} · ${rankStr} (${state.bestStageCleared} 关)`;
    }

    leaderboardListEl.innerHTML = '';
    top10.forEach((entry, idx) => {
      const rank = idx + 1;
      const rankBadge =
        rank === 1
          ? UI_ART.medal1
          : rank === 2
            ? UI_ART.medal2
            : rank === 3
              ? UI_ART.medal3
              : `${rank}`;
      const row = document.createElement('div');
      row.className = `lb-row ${isActiveMode ? 'lb-active-mode' : ''} ${rank <= 3 ? `lb-top-${rank}` : ''} ${entry.isSelf ? 'lb-self-row' : ''}`;
      row.style.setProperty('--stagger-i', `${idx}`);
      const lbRaceOrder = ['swarm', 'titan', 'gate', 'plasma', 'orbital', 'bastion', 'tycoon'];
      const avatarRace = lbRaceOrder[idx % lbRaceOrder.length];
      const avatarHtml = `<div class="lb-avatar-box"><img class="art-icon-img lb-avatar-img" src="/assets/icons/race_${avatarRace}.png?v=18" alt="" draggable="false" /></div>`;
      if (isActiveMode) {
        const timeStr = state.formatPlayTime(entry.playTimeSeconds);
        row.innerHTML = `
          <span class="lb-rank">${rankBadge}</span>
          ${avatarHtml}
          <div class="lb-player">
            <span class="lb-name">${entry.name}</span>
          </div>
          <strong class="lb-time">${UI_ART.clock} ${timeStr}</strong>
        `;
      } else {
        row.innerHTML = `
          <span class="lb-rank">${rankBadge}</span>
          ${avatarHtml}
          <div class="lb-player">
            <span class="lb-name">${entry.name}</span>
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
  const rank = state.getSkillNodeRank(node.id);
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
    } else if (check.reqMatches) {
      btnLabel = `${UI_ART.lock} 需累计 ${check.reqMatches} 局`;
    } else if (check.reason.includes('先点满')) {
      btnLabel = `${UI_ART.lock} 需先点满下层天赋`;
    } else if (check.reason.includes('已锁')) {
      btnLabel = `${UI_ART.lock} 已专精其他种族 (可洗点)`;
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
            ${branch.icon} ${branch.raceName}
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
          `${node.name} Lv.${state.getSkillNodeRank(node.id)}!`,
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
  const maxByMatches = state.getMaxSkillPointsByMatches();
  const curMatches = state.getEffectiveMatchesPlayed();
  const committedBranch = state.getCommittedSkillBranch();
  const activeRace = state.getActiveRaceBranch();
  const activeKeystone = state.getActiveKeystoneSpec();

  if (skillAvailablePointsEl) {
    skillAvailablePointsEl.textContent = `${avail}`;
  }
  if (skillActiveKeystoneEl) {
    const activeBranch = activeKeystone?.branch || committedBranch || activeRace;
    skillActiveKeystoneEl.innerHTML = `${activeBranch.icon} ${activeBranch.raceName} · ${activeBranch.unitName}`;
  }
  if (btnBuyTalent) {
    const buyCheck = state.canBuyBonusTalentPoint();
    const buyCost = state.getBonusTalentPointCost();
    const shortBuyCost = buyCost >= 1000 ? `${Math.round(buyCost / 1000)}k` : `${buyCost}`;
    btnBuyTalent.innerHTML = buyCheck.ok
      ? `+${UI_ART.star} <small>${shortBuyCost}${UI_ART.coin}</small>`
      : `${UI_ART.lock}${curMatches}局`;
    btnBuyTalent.disabled = !buyCheck.ok;
    btnBuyTalent.title = buyCheck.ok
      ? `${buyCheck.reason} [B]`
      : `当前对局数(${curMatches}局)最多解锁 ${maxByMatches} 点技能上限`;
  }
  if (btnResetSkills) {
    const resetCost = state.getResetSkillTreeCost();
    const baseCost = state.getBaseResetSkillTreeCost();
    const discount = state.getResetSkillTreeDiscount();
    const shortReset =
      resetCost === 0
        ? `${UI_ART.refresh} 免费`
        : `${UI_ART.refresh} ${resetCost >= 1000 ? `${Math.round(resetCost / 1000)}k` : resetCost}`;
    btnResetSkills.innerHTML = shortReset;
    btnResetSkills.title =
      spent <= 0
        ? `尚未投入天赋点（当前洗点价格 ${resetCost.toLocaleString()} 金币，每玩1关减免 1,000 金币）`
        : `支付 ${resetCost.toLocaleString()} 金币重置流派并返还 ${spent} 点天赋（原价 ${baseCost.toLocaleString()} 金币，已减免 ${discount.toLocaleString()} 金币）[R]`;
    btnResetSkills.disabled = spent <= 0 || state.gold < resetCost;
  }

  if (!skillTreeCanvasEl) return;
  skillTreeCanvasEl.innerHTML = '';

  const boardGrid = document.createElement('div');
  boardGrid.className = 'kr-matrix-grid';

  for (let bIdx = 0; bIdx < SKILL_TREE_BRANCHES.length; bIdx++) {
    const branch = SKILL_TREE_BRANCHES[bIdx];
    const isBranchLockedOut = Boolean(committedBranch && committedBranch.id !== branch.id);
    const isActiveRace = activeRace.id === branch.id;
    let branchPts = 0;
    for (const n of branch.nodes) {
      branchPts += state.getSkillNodeRank(n.id) * n.pointCost;
    }

    const colEl = document.createElement('div');
    colEl.className = `kr-branch-col ${isActiveRace ? 'is-active-branch' : ''} ${isBranchLockedOut ? 'branch-locked-out' : ''}`;
    colEl.style.setProperty('--branch-color', branch.accentColor);
    colEl.style.setProperty('--stagger-i', `${bIdx}`);

    // Render 4 tiers from Top (T4 Crown, index 3) down to Bottom (T1 Base, index 0)
    const nodesTopToBottom = [...branch.nodes].reverse();
    nodesTopToBottom.forEach((node) => {
      const rank = state.getSkillNodeRank(node.id);
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
      nodeBtn.className = `tree-node tier-${node.tier} ${node.isKeystone ? 'keystone' : ''} ${stateClass} ${isBranchLockedOut ? 'branch-locked-out' : ''} ${isSelected ? 'selected' : ''}`;
      nodeBtn.style.setProperty('--branch-color', branch.accentColor);
      nodeBtn.title = `${branch.raceName} · ${node.name} (Lv.${rank}/${node.maxRank})`;

      const svgArt = SKILL_NODE_SVGS[node.id] || '';
      const reqFirstRankMatches = state.getRequiredMatchesForNodeRank(node.tier, 1);
      const isMatchLocked = rank === 0 && curMatches < reqFirstRankMatches;
      const badgeLabel = isMatchLocked
        ? `${UI_ART.lock}${reqFirstRankMatches}`
        : isMax
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
        if (state.selectRaceBranch(branch.id)) {
          world.applySkin(state.getEquippedSkin());
        }
        if (wasSelected && !isMax && state.canUpgradeSkillNode(node.id).ok) {
          if (state.upgradeSkillNode(node.id)) {
            sound.playUpgrade();
            spawnMenuUpgradeBurst(
              nodeBtn,
              `${node.name} Lv.${state.getSkillNodeRank(node.id)}!`,
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

    // Bottom Race Pedestal Shield Emblem (like the 6 class shields at the bottom of Kingdom Rush!)
    const pedestalBtn = document.createElement('button');
    pedestalBtn.type = 'button';
    pedestalBtn.className = `kr-branch-pedestal ${isActiveRace ? 'active' : ''} ${branchPts > 0 ? 'has-points' : ''}`;
    pedestalBtn.style.setProperty('--branch-color', branch.accentColor);
    pedestalBtn.title = `切换出战种族：${branch.raceName} (${branch.unitName})`;
    pedestalBtn.innerHTML = `
      <span class="kr-pedestal-icon">${branch.icon}</span>
      <span class="kr-pedestal-name">${branch.raceName.slice(0, 2)}</span>
    `;
    pedestalBtn.addEventListener('click', () => {
      selectedSkillNodeId = branch.nodes[0].id;
      if (state.selectRaceBranch(branch.id)) {
        sound.playUpgrade();
        world.applySkin(state.getEquippedSkin());
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
  void state.syncRemoteLeaderboard(true).then(() => renderMainMenu());
}

function launchBattle(): void {
  topToolsDrawer?.classList.add('hidden');
  state.resetRunProgression();
  mainMenu.classList.add('hidden');
  if (hudTop) hudTop.style.display = 'flex';
  if (hudBottom) hudBottom.style.display = 'flex';
  labelsContainer.style.display = 'block';
  world.isPaused = false;
  // Always start a new run from Stage 1 (index 0)
  startLevel(0);
}

function renderActiveBuffsBar(): void {
  if (!activeBuffsBar || !world.currentLevel) return;
  const pills: string[] = [];

  if (world.bossShieldActive) {
    pills.push(
      `<span class="buff-pill rarity-epic" title="大Boss虚空力场护盾：减伤88%，需集火${world.bossShieldHitsRemaining}次或用轰炸/炸药桶瞬间击碎">${UI_ART.shield} 虚空护盾(${world.bossShieldHitsRemaining})</span>`
    );
  }

  if (world.bossBerserkTriggered) {
    pills.push(`<span class="buff-pill debuff-pill" title="母巢狂暴阶段">${UI_ART.warning} 狂暴</span>`);
  }

  if (world.adrenalineTimer > 0) {
    pills.push(
      `<span class="buff-pill rarity-legendary" title="连杀狂暴：全军射速移速+22%">${UI_ART.flame} ${world.adrenalineTimer.toFixed(0)}s</span>`
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
    btnModalNext.innerHTML = `${mult > 1 ? `${UI_ART.bolt} 跳2关 → 第 ${stageNum + 3} 关` : `${UI_ART.rocket} 下一关`}<kbd class="kbd-hint">Space</kbd>`;
  } else {
    const tierLabel = currentRewardOptions[0]?.rarityLabel || '普通强化';
    rewardPromptText.innerHTML = `${UI_ART.gift} 战利品三选一 · 【${tierLabel}】`;
    btnModalNext.disabled = true;
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
  world.onStageEnd?.(true);
};

world.onStageEnd = (victory: boolean) => {
  topToolsDrawer?.classList.add('hidden');
  resultModal.classList.remove('hidden');
  resultModal.classList.toggle('victory-mode', victory);
  statTotalSpawned.textContent = `${state.stageClonesSpawned}`;
  statTotalKills.textContent = `${state.stageMutantsKilled}`;
  statStageGold.innerHTML = `+${state.stageGoldEarned} ${UI_ART.coin}`;
  const stageNum = state.currentLevelIndex + 1;

  if (victory) {
    world.triggerScreenFlash('#facc15', 0.68);
    state.recordBattleStats(stageNum, state.stageMutantsKilled);
    const expiredDebuffs = state.tickStageVictoryDebuffs();
    const shardDrop = state.rollStageSkinShardDrop(stageNum);

    const clearSec = Math.max(0.1, world.stageCombatTime);
    stageRewardRerollCount = 0;
    isSpeedSkipEligible = clearSec < 10.0;
    isSpeedSkipActive = isSpeedSkipEligible;

    modalBadge.innerHTML = isSpeedSkipEligible
      ? `${UI_ART.bolt} SPEED CLEAR ${clearSec.toFixed(1)}s (<10s)`
      : `${UI_ART.trophy} STAGE ${stageNum} VICTORY`;
    modalTitle.innerHTML = isSpeedSkipEligible
      ? `${UI_ART.bolt} 第 ${stageNum} 关极速闪击突破！`
      : `${UI_ART.sparkle} 第 ${stageNum} 关完美谢幕！`;
    const parts: string[] = [
      `${UI_ART.clock} 用时 ${clearSec.toFixed(1)}s${isSpeedSkipEligible ? ` (${UI_ART.bolt}跳2关+奖励×3)` : ''}`,
    ];
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

    const goldLossHtml = `<div class="penalty-item">${UI_ART.coin} <strong>演出损耗</strong>：-${report.lostGold} 金币 (15%) · 大招蓄力清零</div>`;

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
  bossNameEl.innerHTML = lvl.isMegaBoss
    ? `${UI_ART.crown} 总厂督军`
    : lvl.isMiniBoss
      ? `${UI_ART.gear} 车间主管`
      : '集团厂房';
  if (lvl.isMegaBoss) {
    showBanner(
      `${UI_ART.warning} 第 ${stageNum} 关 · ${lvl.bossName}`,
      `${UI_ART.flame} 闪避陨石 · ${UI_ART.boom} 炸桶破除虚空护盾`
    );
  } else if (lvl.isMiniBoss) {
    showBanner(
      `${UI_ART.sword} 第 ${stageNum} 关 · ${lvl.bossName}`,
      `${UI_ART.warning} 闪避红圈 · ${UI_ART.shield} 50%血量破盾`
    );
  } else {
    centerBanner.classList.add('hidden');
  }
  refreshMechaUI();
  refreshUpgradeUI();
  renderActiveBuffsBar();
}

function refreshUpgradeUI(): void {
  goldAmountEl.textContent = `${Math.floor(state.gold)}`;

  // Fire Rate
  const costFR = state.getFireRateCost();
  lvlFireRate.textContent = `Lv.${state.fireRateLevel}`;
  if (statFireRate) statFireRate.textContent = `${state.getFireRatePerSec().toFixed(1)}/s`;
  costFireRate.textContent = `${costFR}`;
  upgFireRate.disabled = state.gold < costFR;

  // Power
  const costPwr = state.getPowerCost();
  lvlPower.textContent = `Lv.${state.powerLevel}`;
  if (statPower) statPower.textContent = `×${state.getPowerMultiplier().toFixed(2)}`;
  costPower.textContent = `${costPwr}`;
  upgPower.disabled = state.gold < costPwr;

  // Champion
  const costChamp = state.getChampionCost();
  lvlChampion.textContent = `Lv.${state.championLevel}`;
  if (statChampion) statChampion.textContent = `×${state.getChampionMultiplier().toFixed(2)}`;
  costChampion.textContent = `${costChamp}`;
  upgChampion.disabled = state.gold < costChamp;

  // Loot
  const costLt = state.getLootCost();
  lvlLoot.textContent = `Lv.${state.lootLevel}`;
  if (statLoot) statLoot.textContent = `+${Math.round((state.getLootMultiplier() - 1) * 100)}%`;
  costLoot.textContent = `${costLt}`;
  upgLoot.disabled = state.gold < costLt;
}

let lastBerserkState = false;
let lastAdrenalineActive = false;
let lastHudBlue = -1;
let lastHudRed = -1;
let lastHudGold = -1;
let lastHudBossHp = -1;
let lastHudPlayerHp = -1;
let lastHudChampPct = -1;
let lastHudChampHolding = false;
let lastHudOrbitalPct = -1;
let lastUpgLevelsKey = '';

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
  const upgKey = `${state.fireRateLevel}_${state.powerLevel}_${state.championLevel}_${state.lootLevel}`;
  if (curGold !== lastHudGold || upgKey !== lastUpgLevelsKey) {
    lastHudGold = curGold;
    lastUpgLevelsKey = upgKey;
    refreshUpgradeUI();
  }

  const hp = Math.ceil(world.bossHp);
  if (hp !== lastHudBossHp) {
    lastHudBossHp = hp;
    bossHpTextEl.textContent = `${hp}`;
    const pct = Math.max(0, Math.min(100, (world.bossHp / world.bossMaxHp) * 100));
    bossBarFillEl.style.width = `${pct}%`;
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

  const curAdrenaline = world.adrenalineTimer > 0;
  if (world.bossBerserkTriggered !== lastBerserkState || curAdrenaline !== lastAdrenalineActive || curAdrenaline) {
    lastBerserkState = world.bossBerserkTriggered;
    lastAdrenalineActive = curAdrenaline;
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

if (btnEditName) {
  btnEditName.addEventListener('click', () => {
    if (state.gold < RENAME_GOLD_COST) {
      showGlobalToast(
        `💰 改名需花费 ${RENAME_GOLD_COST.toLocaleString()} 金币（当前：${Math.floor(state.gold).toLocaleString()} 金币）`
      );
      return;
    }
    const input = window.prompt(
      `请输入新的指挥官昵称（最多14个字符，改名需花费 ${RENAME_GOLD_COST.toLocaleString()} 金币）：`,
      state.playerName
    );
    if (input && input.trim()) {
      const res = state.setPlayerName(input);
      if (res.ok) {
        sound.playUpgrade();
        spawnMenuUpgradeBurst(btnEditName, `-${RENAME_GOLD_COST.toLocaleString()} 金币`, '#f59e0b');
        showGlobalToast(`✅ 改名成功：「${state.playerName}」（已消耗 ${RENAME_GOLD_COST.toLocaleString()} 金币）`);
        refreshUpgradeUI();
        renderMainMenu();
      } else if (res.reason === 'insufficient_gold') {
        showGlobalToast(
          `💰 改名需花费 ${RENAME_GOLD_COST.toLocaleString()} 金币（当前：${Math.floor(state.gold).toLocaleString()} 金币）`
        );
      }
    }
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
  } else {
    showGlobalToast('当前已投入天赋锁定专精种族，洗点后可自由切换其他萌族！');
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

if (btnHomeTheme) {
  btnHomeTheme.addEventListener('click', () => {
    sound.playUpgrade();
    const nextTheme = world.cycleTheme();
    if (stageBadge) {
      stageBadge.textContent = `${nextTheme.badge} · 第 ${state.currentLevelIndex + 1} 关`;
    }
    spawnMenuUpgradeBurst(btnHomeTheme, `切换世界：${nextTheme.name}`, '#38bdf8');
    renderMainMenu();
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
  const nextTheme = world.cycleTheme();
  startLevel(state.currentLevelIndex);
  showBanner(`🎲 切换地图 · ${nextTheme.name}`);
});

const handleCycleSceneTheme = () => {
  sound.playUpgrade();
  const nextTheme = world.cycleTheme();
  if (stageBadge) {
    stageBadge.textContent = `${nextTheme.badge} · 第 ${state.currentLevelIndex + 1} 关`;
  }
  renderActiveBuffsBar();
  showBanner(`🎨 ${nextTheme.name}`);
};

btnTheme.addEventListener('click', handleCycleSceneTheme);
const btnStageTheme = document.getElementById('btn-stage-theme');
if (btnStageTheme) {
  btnStageTheme.addEventListener('click', handleCycleSceneTheme);
}

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

btnChampion.addEventListener('click', () => {
  world.deployChampion();
});

btnOrbital.addEventListener('click', () => {
  world.triggerOrbitalStrike();
});

upgFireRate.addEventListener('click', () => {
  const cost = state.getFireRateCost();
  if (state.gold >= cost) {
    state.gold -= cost;
    state.fireRateLevel++;
    state.save();
    sound.playUpgrade();
    world.syncTurretEvolution(true);
    refreshUpgradeUI();
  }
});

upgPower.addEventListener('click', () => {
  const cost = state.getPowerCost();
  if (state.gold >= cost) {
    state.gold -= cost;
    state.powerLevel++;
    state.save();
    sound.playUpgrade();
    world.syncTurretEvolution(true);
    refreshUpgradeUI();
  }
});

upgChampion.addEventListener('click', () => {
  const cost = state.getChampionCost();
  if (state.gold >= cost) {
    const prevTier = state.getUltimateEvolutionSpec().tier;
    state.gold -= cost;
    state.championLevel++;
    state.save();
    sound.playUpgrade();
    refreshMechaUI();
    refreshUpgradeUI();
    const nextEvo = state.getUltimateEvolutionSpec();
    if (nextEvo.tier > prevTier) {
      showBanner(
        `✨ 大招进化 · 【${nextEvo.badge}】`,
        nextEvo.isCompleteForm
          ? '👑 完全体大招已解锁：全屏连环洗地与震波特效全面绽放！'
          : '大招伤害、打击范围与特效波次已提升！'
      );
    }
  }
});

upgLoot.addEventListener('click', () => {
  const cost = state.getLootCost();
  if (state.gold >= cost) {
    state.gold -= cost;
    state.lootLevel++;
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
  if (!rewardSection.classList.contains('hidden') && !hasClaimedStageReward) {
    if (isSpeedSkipEligible && isSpeedSkipActive) {
      isSpeedSkipActive = false;
      const stageNum = state.currentLevelIndex + 1;
      currentRewardOptions = state.rebuildRewardOptions(stageNum, currentRewardOptions, 1);
    }
    if (!commitStageReward()) return;
  }
  startLevel(state.currentLevelIndex);
});

btnModalNext.addEventListener('click', () => {
  if (!rewardSection.classList.contains('hidden') && !hasClaimedStageReward) {
    if (!commitStageReward()) return;
  }
  if (isSpeedSkipEligible && isSpeedSkipActive) {
    const stageNum = state.currentLevelIndex + 1;
    state.creditSkippedStages(stageNum + 2, 2);
    startLevel(state.currentLevelIndex + 3);
  } else {
    startLevel(state.currentLevelIndex + 1);
  }
});

// Preload 3D stage background & open Title Cover Screen on startup
startLevel(state.currentLevelIndex);
openTitleScreen();

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
      } else if (e.code === 'KeyT') {
        e.preventDefault();
        btnHomeTheme?.click();
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
  } else if (e.code === 'Escape' || e.code === 'KeyH') {
    e.preventDefault();
    btnHome.click();
  } else if (e.code === 'KeyG') {
    e.preventDefault();
    btnRerollMap.click();
  } else if (e.code === 'KeyT') {
    e.preventDefault();
    btnTheme.click();
  } else if (e.code === 'KeyV') {
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
      `🎁 收到【${referralWelcome.fromName}】的偶像应援补给：+${referralWelcome.goldAwarded.toLocaleString()}🪙 星光金币！`
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
