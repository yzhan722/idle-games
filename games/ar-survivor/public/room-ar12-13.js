// room-ar12-13.js — AR-12～AR-13：小猫访客、贺卡、野餐、日记
// 由 game.js 原样搬出（2026-11-26，AR-COM5 拆分）：只有函数声明，和初始化时不依赖其他文件的常量 / 变量。
// 会改写共享 let 的函数、绑定事件的顶层语句都留在 game.js。[[split N]] 记号给 tests/split_check.mjs 拼回比对用，别删。
import {
  vision,
  W,
  H,
  playSfx,
  formatLocalDateKey,
  savePetState,
  gameMode,
  player,
  spawnInteractVfx,
  addCoins,
  setPlayerEmote,
  addAffectionXp,
  floatingTexts,
  dismissPolaroid,
  closeDrawer,
  switchMode,
  gcPreviewStickerEls,
  cardRun,
  pcFoodSlotEls,
  dyPageStickerEls,
  picnicRun,
  closeAlbumLightbox,
  syncMemoryBookBadge
} from './game.js?v=hd60';
import {
  petAudio
} from './audio.js?v=hd31';
import {
  getPicnicBasketDeskAnchor,
  getPicnicBlanketLayout,
  getWindowSillLayout
} from './sprites.js?v=hd60';
import {
  ar12Clock,
  ar12Random,
  KITTEN_SPECS,
  KITTEN_BY_ID,
  KITTEN_AFFECTION_MAX,
  KITTEN_TIERS,
  KITTEN_VISIT_RULES,
  getKittenTier,
  getKittenCornerStats,
  getKittenLuckWard,
  CARD_BASE_BY_ID,
  CARD_STICKERS,
  CARD_UNIVERSAL_STICKERS,
  CARD_OCCASIONS,
  CARD_OCCASION_BY_ID,
  CARD_ALBUM_MAX,
  CARD_DAILY_REWARDS,
  resolveCardOccasion,
  getGreetingCardBlessing,
  ar13Clock,
  AR13_WEEKDAY_NAMES,
  PICNIC_FOODS,
  PICNIC_FOOD_BY_ID,
  PICNIC_SPOTS,
  PICNIC_SPOT_BY_ID,
  PICNIC_RULES,
  isPicnicWeekend,
  getPicnicWeekendKey,
  getDaysUntilPicnicWeekend,
  getPicnicAnticipation,
  getPicnicWardValues,
  describePicnicWard,
  describePicnicWardShort,
  getPicnicStats,
  DIARY_STICKERS,
  DIARY_BASE_STICKERS,
  DIARY_MEMORY_STICKERS,
  DIARY_RULES,
  DIARY_LINE_SPECS,
  getJournalDayActivityTotal,
  getDiaryPageKeys,
  getDiaryStats,
  POTTERY_SHAPE_BY_ID,
  POTTERY_GLAZE_BY_ID,
  getAromaRecipe,
  STAR_CARD_BY_ID,
  RAIN_WEATHER_BY_ID,
  EMBROIDERY_PATTERN_BY_ID,
  EMBROIDERY_THREAD_BY_ID,
  HEARTH_LEVEL_BY_ID,
  HEARTH_SNACK_BY_ID,
  WARDROBE_OUTFIT_BY_ID,
  BEDTIME_STORY_BY_ID
} from './data-room.js?v=hd60';
import {
  survivorRun,
  syncSurvivorSkillStrip
} from './mode-survivor.js?v=hd60';
import {
  dismissWindowAmbienceCard,
  foldOrHidePomodoroCard,
  JOURNAL_MOODS,
  recordJournalActivity,
  syncWeeklyJournalUI,
  dismissWeeklyJournalCard,
  dismissTeatimeCard,
  dismissTerrariumCard,
  foldOrHideGoodnightCard
} from './room-ar04-06.js?v=hd60';
import {
  dismissCollageCard,
  foldOrHideCozyRadioCard,
  dismissCrochetCard,
  dismissHotCocoaCard,
  dismissPressedFlowerCard,
  dismissTelescopeCard
} from './room-ar07-09.js?v=hd60';
import {
  dismissAr10Cards,
  setRuleLine,
  dismissAr11Cards
} from './room-ar10-11.js?v=hd60';
import {
  dismissAr14Cards,
  fitPotteryAromaPill,
  dismissAr15Cards
} from './room-ar14-15.js?v=hd60';
import {
  dismissAr16Cards,
  dismissAr17Cards
} from './room-ar16-17.js?v=hd60';
import {
  dismissTopicCard
} from './pet-chat.js?v=hd60';

// [[split 33]]

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
// [[split 34]]
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

const HANDMADE_CARD_IMG = './assets/handmade_card.webp?v=hd60';
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
// [[split 35]]

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
            <img loading="lazy" src="${ks.img}" alt="" class="kc-codex-ico${kk.met ? '' : ' is-silhouette'}" />
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
    const kcWardFull = '猫咪幸运佑护：好感合计 ≥10 生效，最高幸运掉宝 +10%；≥40 每班次九命护身 1 次，≥140 两次';
    if (ward.active) {
      setRuleLine(
        kcWardLineEl,
        `猫咪佑护中：掉宝 +${(ward.luckyDropBonus * 100).toFixed(1)}% · ${ward.saveCharges > 0 ? `九命 ×${ward.saveCharges}` : '好感 40 解锁九命'}（好感 ${ward.totalAffection}/${ward.maxAffection}）`,
        `猫咪幸运佑护生效中：幸运掉宝 +${(ward.luckyDropBonus * 100).toFixed(1)}% · ${ward.saveCharges > 0 ? `九命护身 ×${ward.saveCharges}` : '好感合计 40 解锁九命护身'}（好感 ${ward.totalAffection}/${ward.maxAffection}）\n${kcWardFull}`
      );
    } else {
      setRuleLine(kcWardLineEl, '猫咪佑护：好感 ≥10 掉宝最高 +10%；≥40 / ≥140 每班九命 1 / 2 次', kcWardFull);
    }
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
            <img loading="lazy" src="${CARD_STICKERS[id].img}" alt="" class="gc-sticker-ico" />
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
                <img loading="lazy" src="${HANDMADE_CARD_IMG}" alt="" class="gc-album-art" />
                ${st ? `<img loading="lazy" src="${st.img}" alt="" class="gc-album-sticker" />` : ''}
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
  dismissAr12Cards(); dismissAr13Cards(); dismissAr14Cards(); dismissAr15Cards(); dismissAr16Cards(); dismissAr17Cards();
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
// [[split 36]]

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
// [[split 37]]
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
// [[split 38]]
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
// [[split 39]]

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
            <img loading="lazy" src="${f.img}" alt="" class="pc-food-ico" />
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
            <img loading="lazy" src="${s.icon}" alt="" class="pc-spot-ico" />
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
                  <img loading="lazy" src="${sp.icon}" alt="" class="pc-log-ico" />
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
    if (stats.wardCharges > 0 && wardSpot) {
      setRuleLine(pcWardLineEl, `野餐好心情『${wardSpot.wardName}』：接下来 ${stats.wardCharges} 个打工班次 ${describePicnicWard(wardSpot.id, stats.wardAnticipation)}`);
    } else {
      setRuleLine(
        pcWardLineEl,
        `野餐好心情：周末野餐后护 ${PICNIC_RULES.wardShiftsPerPicnic} 个打工班次，期待章每枚 +5%`,
        `野餐好心情：周末完成一次野餐，接下来 ${PICNIC_RULES.wardShiftsPerPicnic} 个幸存者打工班次获得地点佑护（期待章每枚 +5%）`
      );
    }
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
  // AR-17 季节换装 / 睡前故事：写进当天日记
  if (key === 'outfits') {
    const wd = player.seasonWardrobe || {};
    const of = WARDROBE_OUTFIT_BY_ID[wd.lastOutfitId];
    return of ? `换上了「${of.name}」套组转了一圈，主人说好看~` : `和主人一起换了 ${n} 次季节套组~`;
  }
  if (key === 'stories') {
    const sb = player.bedtimeStorybook || {};
    const so = BEDTIME_STORY_BY_ID[sb.lastStoryId];
    return so ? `睡前和主人读完《${so.name}》，夹上了一枚小书签~` : `和主人一起读了 ${n} 本睡前小故事~`;
  }
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
            (l) => `<li class="dy-line" data-line-key="${l.key}"><img loading="lazy" src="${l.ico}" alt="" class="dy-line-ico" /><span class="dy-line-text">${l.text}</span></li>`
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
              <img loading="lazy" src="${DIARY_STICKERS[id].img}" alt="" class="dy-sticker-ico" />
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
    setRuleLine(
      dyFooterLineEl,
      `日记心意：每天前 ${DIARY_RULES.dailyRewards} 次给新页贴贴纸 +${DIARY_RULES.coinReward} 金币与亲密`,
      `日记心意：每天前 ${DIARY_RULES.dailyRewards} 次给新的一页贴贴纸 +${DIARY_RULES.coinReward} 金币与亲密 · 已写 ${stats.written} 页 · 贴纸 ${stats.totalStickers} 枚，都记进七日心情周报`
    );
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
  syncMemoryBookBadge();
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
  dismissAr13Cards(); dismissAr14Cards(); dismissAr15Cards(); dismissAr16Cards(); dismissAr17Cards();
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
// [[split end]]
export {
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
  diaryRun,
  isAr13CardOpen,
  dismissPicnicBasketCard,
  dismissDiaryBookCard,
  dismissAr13Cards,
  togglePicnicFood,
  pickPicnicSpot,
  helpPicnicPlan,
  packPicnicBasket,
  startPicnicOuting,
  sharePicnicFood,
  getPicnicMainState,
  handlePicnicMainAction,
  openPicnicWardForShift,
  syncPicnicBasketUI,
  buildDiaryPage,
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
};
