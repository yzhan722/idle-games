// room-ar16-17.js — AR-16～AR-17：刺绣、暖炉、装扮图鉴、睡前故事
// 由 game.js 原样搬出（2026-11-26，AR-COM5 拆分）：只有函数声明，和初始化时不依赖其他文件的常量 / 变量。
// 会改写共享 let 的函数、绑定事件的顶层语句都留在 game.js。[[split N]] 记号给 tests/split_check.mjs 拼回比对用，别删。
import {
  W,
  H,
  clientToStage,
  playSfx,
  formatLocalDateKey,
  savePetState,
  gameMode,
  player,
  spawnInteractVfx,
  addCoins,
  setPlayerEmote,
  addAffectionXp,
  dismissPolaroid,
  closeDrawer,
  switchMode,
  closeAlbumLightbox,
  dismissMemoryBookCard
} from './game.js?v=hd60';
import {
  petAudio
} from './audio.js?v=hd31';
import {
  getAr16FloorLayout,
  getAr16WallLayout
} from './sprites.js?v=hd60';
import {
  getAromaSeasonId,
  getActiveProjection,
  ar16Clock,
  EMBROIDERY_PATTERNS,
  EMBROIDERY_PATTERN_BY_ID,
  EMBROIDERY_SEASON_NAMES,
  EMBROIDERY_THREADS,
  EMBROIDERY_THREAD_BY_ID,
  EMBROIDERY_RULES,
  getEmbroiderySeasonPatterns,
  embroideryRun,
  getEmbroideryStats,
  HEARTH_LEVELS,
  HEARTH_SNACKS,
  HEARTH_SNACK_BY_ID,
  HEARTH_RULES,
  getHearthKindle,
  getHearthCuddle,
  getHearthState,
  snackRun,
  getHearthStats,
  ar17Clock,
  WARDROBE_OUTFITS,
  WARDROBE_OUTFIT_BY_ID,
  WARDROBE_SEASON_NAMES,
  WARDROBE_ITEM_ART,
  WARDROBE_SEASON_ART,
  WARDROBE_RULES,
  wardrobeRun,
  getWardrobeSeasonOutfits,
  getWardrobeStats,
  getWardrobeLook,
  BEDTIME_STORIES,
  BEDTIME_STORY_BY_ID,
  STORY_RULES,
  storyRun,
  isStoryBedtime,
  getTonightStory,
  getStoryGlow,
  getStorybookStats
} from './data-room.js?v=hd60';
import {
  dismissWindowAmbienceCard,
  foldOrHidePomodoroCard,
  recordJournalActivity,
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
  dismissAr12Cards,
  dismissAr13Cards,
  syncDiaryBookUI
} from './room-ar12-13.js?v=hd60';
import {
  dismissAr14Cards,
  dismissAr15Cards
} from './room-ar14-15.js?v=hd60';
import {
  dismissTopicCard
} from './pet-chat.js?v=hd60';

// [[split 47]]

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
        return `<img loading="lazy" src="./assets/vfx_sparkle.webp?v=hd60" alt="" class="eb-stitch-dot${i < n ? ' is-on' : ''}${i % 2 ? ' is-hers' : ''}" style="left:${x.toFixed(1)}%;top:${y.toFixed(1)}%" />`;
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
            <img loading="lazy" src="./assets/embroidery_patch.webp?v=hd60" alt="" class="eb-pattern-ico" />
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
    ebStoryLineEl.title = ebStoryLineEl.textContent;
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
            <img loading="lazy" src="./assets/embroidery_patch.webp?v=hd60" alt="" class="eb-album-ico" />
            <em class="eb-album-tag">${tag}</em>
          </button>`;
      }).join('');
    }
  }
  if (ebAlbumSubEl) {
    ebAlbumSubEl.textContent = `绣样册 ${stats.collected}/${stats.totalPatterns} · 墙上 ${stats.wallCount}/${EMBROIDERY_RULES.wallMax} 幅 · 今日奖励 ${stats.rewardsToday}/${stats.dailyRewards}`;
  }
  if (ebFooterLineEl) {
    setRuleLine(
      ebFooterLineEl,
      `收针挂墙：每天前 ${EMBROIDERY_RULES.dailyRewards} 幅 +${EMBROIDERY_RULES.coinReward} 金币，新绣样 +${EMBROIDERY_RULES.newPatternCoins}，最搭绣线 +${EMBROIDERY_RULES.bestThreadCoins}`,
      `收针挂墙：每天前 ${EMBROIDERY_RULES.dailyRewards} 幅 +${EMBROIDERY_RULES.coinReward} 金币，新绣样再 +${EMBROIDERY_RULES.newPatternCoins}，最搭绣线 +${EMBROIDERY_RULES.bestThreadCoins}；当天日记多一枚刺绣布贴`
    );
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
        (_, i) => `<img loading="lazy" src="./assets/vfx_sparkle.webp?v=hd60" alt="" class="hc-spark" style="left:${(22 + ((i * 37) % 56)).toFixed(0)}%;animation-delay:${(i * 0.43).toFixed(2)}s" />`
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
            <img loading="lazy" src="./assets/roasted_snack.webp?v=hd60" alt="" class="hc-snack-ico" />
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
    hcStoryLineEl.title = hcStoryLineEl.textContent;
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
            <img loading="lazy" src="./assets/roasted_snack.webp?v=hd60" alt="" class="hc-codex-ico" />
            <em class="hc-codex-tag">${found ? `${shownLv.texture}${s.short}` : '待收录'}</em>
          </span>`;
      }).join('');
    }
  }
  if (hcCodexSubEl) {
    hcCodexSubEl.textContent = `炉边点心手帐 ${stats.entries}/${stats.totalEntries} · ${shownLv.name} ${stats.levelFound}/${HEARTH_SNACKS.length} · 今日 ${stats.rewardsToday}/${stats.dailyRewards}`;
  }
  if (hcFooterLineEl) {
    // 依偎中：剩余时间与亲密加成上方火力行已经写了，这里只留「再分一块重新计时」
    const hcLvPct = HEARTH_LEVELS.filter((l) => l.bonus > 0).map((l) => Math.round(l.bonus * 100));
    if (cuddle) {
      setRuleLine(
        hcFooterLineEl,
        '围炉依偎中：再分一块就重新计时',
        `围炉依偎中：日常亲密 +${Math.round(cuddle.bonus * 100)}%（${cuddle.levelName}），还剩 ${cuddle.minsLeft} 分；再分一块就重新计时`
      );
    } else {
      setRuleLine(
        hcFooterLineEl,
        `分着吃：每天前 ${HEARTH_RULES.dailyRewards} 块 +${HEARTH_RULES.coinReward} 金币（新收录 +${HEARTH_RULES.newEntryCoins}），再依偎 ${HEARTH_RULES.cuddleMin} 分钟亲密 +${hcLvPct[0]}~${hcLvPct[hcLvPct.length - 1]}%`,
        `分着吃：每天前 ${HEARTH_RULES.dailyRewards} 块 +${HEARTH_RULES.coinReward} 金币，手帐新收录再 +${HEARTH_RULES.newEntryCoins}；之后围炉依偎 ${HEARTH_RULES.cuddleMin} 分钟，小火 / 暖火 / 旺火亲密 +${hcLvPct.join('% / +')}%`
      );
    }
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
  const fitted = fitStitchHearthPillOnly();
  // AR-17 合并胶囊排在其后：AR-16 胶囊显隐 / 收起变化后立刻复核 AR-17 胶囊是否还放得下
  fitWardrobeStoryPill();
  return fitted;
}

function fitStitchHearthPillOnly() {
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
  dismissAr16Cards(); dismissAr17Cards();
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
// [[split 49]]

// ================= AR-17 季节换装衣橱 & 睡前故事书 =================
// 场景已满、船坞仍是 25 键：两张卡不加新键、不加场景物件，入口 = 「家具与装扮」抽屉快捷卡 + 合并胶囊
// 换装只换她身上的配饰组合（已有 item_* 贴图）+ 当季小特效；结算仍只读 player.equipped，不改任何既有数值
const wardrobeCardEl = document.getElementById('wardrobe-card');
const wdSummaryPillEl = document.getElementById('wd-summary-pill');
const wdSeasonRowEl = document.getElementById('wd-season-row');
const wdSeasonNameEl = document.getElementById('wd-season-name');
const wdSeasonSubEl = document.getElementById('wd-season-sub');
const wdMirrorEl = document.getElementById('wd-mirror');
const wdMirrorItemsEl = document.getElementById('wd-mirror-items');
const wdMirrorPetalsEl = document.getElementById('wd-mirror-petals');
const wdMirrorTagEl = document.getElementById('wd-mirror-tag');
const wdOutfitRowEl = document.getElementById('wd-outfit-row');
const wdStoryLineEl = document.getElementById('wd-story-line');
const btnWardrobeHelperEl = document.getElementById('btn-wardrobe-helper');
const btnWardrobeMainEl = document.getElementById('btn-wardrobe-main');
const wdAlbumSubEl = document.getElementById('wd-album-sub');
const wdAlbumGridEl = document.getElementById('wd-album-grid');
const wdFooterLineEl = document.getElementById('wd-footer-line');

const storybookCardEl = document.getElementById('storybook-card');
const sbSummaryPillEl = document.getElementById('sb-summary-pill');
const sbNightRowEl = document.getElementById('sb-night-row');
const sbNightNameEl = document.getElementById('sb-night-name');
const sbNightSubEl = document.getElementById('sb-night-sub');
const sbBookEl = document.getElementById('sb-book');
const sbPageTextEl = document.getElementById('sb-page-text');
const sbBookTagEl = document.getElementById('sb-book-tag');
const sbStoryRowEl = document.getElementById('sb-story-row');
const sbStoryLineEl = document.getElementById('sb-story-line');
const btnStorybookHelperEl = document.getElementById('btn-storybook-helper');
const btnStorybookMainEl = document.getElementById('btn-storybook-main');
const sbShelfSubEl = document.getElementById('sb-shelf-sub');
const sbShelfGridEl = document.getElementById('sb-shelf-grid');
const sbFooterLineEl = document.getElementById('sb-footer-line');

const wsPillEl = document.getElementById('wardrobe-story-pill');
const wsSegStoryEl = document.getElementById('ws-seg-story');
const wsSegWardrobeEl = document.getElementById('ws-seg-wardrobe');
const wsPillStoryEl = document.getElementById('ws-pill-story');
const wsPillWardrobeEl = document.getElementById('ws-pill-wardrobe');

function isAr17CardOpen(which = '') {
  const wd = document.getElementById('wardrobe-card');
  const sb = document.getElementById('storybook-card');
  const wdOpen = Boolean(wd && !wd.classList.contains('hidden'));
  const sbOpen = Boolean(sb && !sb.classList.contains('hidden'));
  if (which === 'wardrobe') return wdOpen;
  if (which === 'storybook') return sbOpen;
  return wdOpen || sbOpen;
}

function dismissWardrobeCard() {
  document.getElementById('wardrobe-card')?.classList.add('hidden');
}

function dismissStorybookCard() {
  document.getElementById('storybook-card')?.classList.add('hidden');
}

// 只碰 DOM：其它卡片在模块初始化期间调用也不会触发 TDZ
function dismissAr17Cards() {
  dismissWardrobeCard();
  dismissStorybookCard();
  dismissMemoryBookCard();
}

// ---------------- 季节换装衣橱：挑一套当季套组 → 换上（她转一圈，配饰组合 + 当季小特效跟着她）→ 记进周报与当天日记 ----------------
function isOutfitUnlocked(outfitId, d = ar17Clock.date()) {
  const of = WARDROBE_OUTFIT_BY_ID[outfitId];
  if (!of) return false;
  const rec = player.seasonWardrobe.outfits[outfitId];
  return Boolean(rec && rec.count > 0) || of.season === getAromaSeasonId(d);
}

function pickWardrobeOutfit(outfitId) {
  const of = WARDROBE_OUTFIT_BY_ID[outfitId];
  if (!of) return { ok: false, reason: 'invalid_outfit' };
  const d = ar17Clock.date();
  if (!isOutfitUnlocked(outfitId, d)) {
    wardrobeRun.lastAction = 'locked';
    playSfx('pat');
    setPlayerEmote(`「${of.name}」要等到${WARDROBE_SEASON_NAMES[of.season]}天才能换哦，先试试当季的套组吧~`, 2.2, 'happy', false);
    syncWardrobeUI();
    return { ok: false, reason: 'out_of_season', season: of.season };
  }
  wardrobeRun.previewId = outfitId;
  wardrobeRun.lastAction = 'pick';
  player.idleTime = 0;
  playSfx('pat');
  const wearing = player.seasonWardrobe.wearing === outfitId;
  setPlayerEmote(
    wearing ? `现在穿的就是「${of.name}」哦~` : `「${of.name}」：${of.items.map((k) => WARDROBE_ITEM_ART[k].name).join(' + ')}，要换上看看吗~`,
    2.2,
    'happy',
    false
  );
  syncWardrobeUI();
  return { ok: true, outfitId, wearing, inSeason: of.season === getAromaSeasonId(d) };
}

function wearWardrobeOutfit(outfitId = wardrobeRun.previewId, nowMs = ar17Clock.now()) {
  const of = WARDROBE_OUTFIT_BY_ID[outfitId];
  if (!of) return { ok: false, reason: 'no_outfit' };
  const d = new Date(nowMs);
  if (!isOutfitUnlocked(outfitId, d)) return { ok: false, reason: 'out_of_season', season: of.season };
  const wd = player.seasonWardrobe;
  if (wd.wearing === outfitId) return { ok: false, reason: 'already' };
  const todayKey = formatLocalDateKey(d);
  const prev = wd.outfits[of.id];
  const isNew = !(prev && prev.count > 0);
  wd.outfits[of.id] = { count: (prev ? prev.count : 0) + 1, first: prev && prev.first ? prev.first : todayKey };
  wd.wearing = of.id;
  wd.totalChanges = (wd.totalChanges || 0) + 1;
  wd.lastOutfitId = of.id;
  if (wd.rewardDate !== todayKey) {
    wd.rewardDate = todayKey;
    wd.rewardCount = 0;
  }
  let reward = null;
  if (wd.rewardCount < WARDROBE_RULES.dailyRewards) {
    wd.rewardCount += 1;
    reward = { coins: WARDROBE_RULES.coinReward + (isNew ? WARDROBE_RULES.newOutfitCoins : 0), xp: WARDROBE_RULES.xpReward };
  }
  wardrobeRun.previewId = of.id;
  wardrobeRun.lastAction = 'wear';
  player.idleTime = 0;
  player.happyTimer = 2;
  player.wardrobeCheerTimer = 2.6;
  petAudio.playCardSnip(WARDROBE_OUTFITS.indexOf(of));
  petAudio.haptic('tap');
  spawnInteractVfx(player.x, player.y - 30, 'sparkle', 8);
  recordJournalActivity('outfits', 1, d);
  if (reward) {
    addCoins(reward.coins, player.x + 24, player.y - 44, '换装 ');
    addAffectionXp(reward.xp, '换上季节套组转一圈');
  }
  setPlayerEmote(`${isNew ? '新套组！' : ''}换上「${of.name}」啦~ ${of.line} 周报和今天的日记都记下了~`, 3.0, 'cheer', true);
  wardrobeRun.lastResult = {
    outfitId: of.id,
    name: of.name,
    isNew,
    reward,
    count: wd.outfits[of.id].count,
    collected: getWardrobeStats(d).collected
  };
  savePetState();
  syncWardrobeUI();
  syncDiaryBookUI();
  return { ok: true, ...wardrobeRun.lastResult };
}

function takeOffWardrobe() {
  const wd = player.seasonWardrobe;
  const of = WARDROBE_OUTFIT_BY_ID[wd.wearing];
  if (!of) return { ok: false, reason: 'not_wearing' };
  wd.wearing = '';
  wardrobeRun.lastAction = 'off';
  player.idleTime = 0;
  playSfx('pat');
  setPlayerEmote(`「${of.name}」收进衣橱啦，换回平时的样子~`, 1.8, 'happy', false);
  savePetState();
  syncWardrobeUI();
  return { ok: true, outfitId: of.id };
}

function getWardrobeMainState() {
  const wd = player.seasonWardrobe;
  const of = WARDROBE_OUTFIT_BY_ID[wardrobeRun.previewId];
  if (!of) {
    return WARDROBE_OUTFIT_BY_ID[wd.wearing]
      ? { mode: 'off', disabled: false, label: '换回原样' }
      : { mode: 'pick', disabled: true, label: '先挑套组' };
  }
  if (wd.wearing === of.id) return { mode: 'off', disabled: false, label: '换回原样' };
  return { mode: 'wear', disabled: false, label: `换上「${of.short}」` };
}

function handleWardrobeMainAction() {
  const st = getWardrobeMainState();
  if (st.disabled) return { ok: false, reason: st.mode };
  if (st.mode === 'wear') return wearWardrobeOutfit();
  return takeOffWardrobe();
}

// 她来挑：先挑当季还没换过的那套（都换过就按日期轮换，尽量不重复身上这套），直接换上
function wardrobeHelper() {
  wardrobeRun.helperSeq += 1;
  const d = ar17Clock.date();
  const season = getWardrobeSeasonOutfits(getAromaSeasonId(d));
  const wd = player.seasonWardrobe;
  const fresh = season.find((o) => !(wd.outfits[o.id] && wd.outfits[o.id].count > 0));
  let pick = fresh || season[(d.getDate() + wardrobeRun.helperSeq) % season.length];
  if (pick.id === wd.wearing) pick = season.find((o) => o.id !== wd.wearing) || pick;
  pickWardrobeOutfit(pick.id);
  return { ...wearWardrobeOutfit(pick.id), step: 'helper' };
}

// ---------------- 睡前故事书：挑一篇 → 你翻一页她读一页 → 夹上书签；睡前读完留下晚安余温，与晚安八音盒联动 ----------------
function pickStory(storyId) {
  const so = BEDTIME_STORY_BY_ID[storyId];
  if (!so) return { ok: false, reason: 'invalid_story' };
  const same = storyRun.storyId === storyId && storyRun.phase === 'read';
  storyRun.storyId = storyId;
  if (!same) {
    storyRun.page = 0;
    storyRun.phase = 'read';
  }
  storyRun.lastAction = 'pick';
  player.bedtimeStorybook.lastStoryId = storyId;
  player.idleTime = 0;
  playSfx('pat');
  setPlayerEmote(`读《${so.name}》吧，一共 ${so.pages.length} 页，你翻页、我来读~`, 2.2, 'happy', false);
  syncStorybookUI();
  return { ok: true, storyId, same };
}

function turnStoryPage() {
  const so = BEDTIME_STORY_BY_ID[storyRun.storyId];
  if (!so) {
    setPlayerEmote('先挑一篇故事吧~', 1.6, 'happy', false);
    return { ok: false, reason: 'no_story' };
  }
  if (storyRun.phase === 'done') return { ok: false, reason: 'done' };
  if (storyRun.page >= so.pages.length) return { ok: false, reason: 'full' };
  storyRun.phase = 'read';
  storyRun.page += 1;
  storyRun.flip = 0.6;
  storyRun.lastAction = 'turn';
  player.idleTime = 0;
  player.happyTimer = 0.6;
  petAudio.playDiaryFlip();
  petAudio.haptic('tap');
  setPlayerEmote(so.pages[storyRun.page - 1], 2.6, 'happy', false);
  syncStorybookUI();
  return { ok: true, page: storyRun.page, pages: so.pages.length, text: so.pages[storyRun.page - 1] };
}

function finishStory(nowMs = ar17Clock.now()) {
  const so = BEDTIME_STORY_BY_ID[storyRun.storyId];
  if (!so) return { ok: false, reason: 'no_story' };
  if (storyRun.phase === 'done') return { ok: false, reason: 'done' };
  if (storyRun.page < so.pages.length) return { ok: false, reason: 'pages', page: storyRun.page };
  const sb = player.bedtimeStorybook;
  const d = new Date(nowMs);
  const todayKey = formatLocalDateKey(d);
  const bedtime = isStoryBedtime(d);
  // AR-15 星空投影点亮时睡前读完：这枚书签记成「星光书签」（只是纪念，不加数值）
  const starlit = bedtime && Boolean(getActiveProjection());
  const prev = sb.bookmarks[so.id];
  const isNew = !(prev && prev.count > 0);
  sb.bookmarks[so.id] = {
    count: (prev ? prev.count : 0) + 1,
    first: prev && prev.first ? prev.first : todayKey,
    starlit: Boolean(prev && prev.starlit) || starlit
  };
  sb.totalStories = (sb.totalStories || 0) + 1;
  sb.lastStoryId = so.id;
  if (sb.rewardDate !== todayKey) {
    sb.rewardDate = todayKey;
    sb.rewardCount = 0;
  }
  let reward = null;
  if (sb.rewardCount < STORY_RULES.dailyRewards) {
    sb.rewardCount += 1;
    reward = { coins: STORY_RULES.coinReward + (isNew ? STORY_RULES.newBookmarkCoins : 0), xp: STORY_RULES.xpReward };
  }
  // 睡前读完：留下 90 分钟晚安余温（再读一篇就重新计时）
  if (bedtime) sb.glow = { startMs: Math.round(nowMs), endMs: Math.round(nowMs + STORY_RULES.glowMin * 60000), storyId: so.id };
  storyRun.phase = 'done';
  storyRun.wasGlow = Boolean(getStoryGlow(nowMs));
  storyRun.lastAction = 'finish';
  player.idleTime = 0;
  player.happyTimer = 2;
  player.storyCheerTimer = 3;
  if (bedtime) petAudio.playStarDream();
  else petAudio.playDiarySticker(BEDTIME_STORIES.indexOf(so));
  petAudio.haptic('headpat');
  spawnInteractVfx(player.x, player.y - 28, 'love', 7);
  recordJournalActivity('stories', 1, d);
  if (reward) {
    addCoins(reward.coins, player.x + 24, player.y - 44, '书签 ');
    addAffectionXp(reward.xp, '睡前一起读完一本小故事');
  }
  setPlayerEmote(
    `${isNew ? '新书签！' : ''}《${so.name}》读完啦，${starlit ? '星光下' : ''}夹上书签~ ${bedtime ? '待会儿开晚安八音盒，会更好睡哦' : '睡前再来读会更有晚安的感觉'}`,
    3.0,
    'cheer',
    true
  );
  storyRun.lastResult = {
    storyId: so.id,
    name: so.name,
    isNew,
    reward,
    bedtime,
    starlit,
    glowEndMs: bedtime ? sb.glow.endMs : 0,
    collected: getStorybookStats(d).collected
  };
  savePetState();
  syncStorybookUI();
  syncDiaryBookUI();
  return { ok: true, ...storyRun.lastResult };
}

function getStoryMainState() {
  const so = BEDTIME_STORY_BY_ID[storyRun.storyId];
  if (storyRun.phase === 'done') return { mode: 'again', disabled: false, label: '再读一本' };
  if (!so) return { mode: 'pick', disabled: true, label: '先挑故事' };
  if (storyRun.page < so.pages.length) return { mode: 'turn', disabled: false, label: `翻一页 ${storyRun.page}/${so.pages.length}` };
  return { mode: 'finish', disabled: false, label: '夹上书签' };
}

function handleStoryMainAction() {
  const st = getStoryMainState();
  if (st.disabled) return { ok: false, reason: st.mode };
  if (st.mode === 'turn') return turnStoryPage();
  if (st.mode === 'finish') return finishStory();
  storyRun.storyId = '';
  storyRun.page = 0;
  storyRun.phase = 'pick';
  storyRun.lastAction = 'again';
  playSfx('pat');
  setPlayerEmote('再挑一本吧~', 1.4, 'happy', false);
  syncStorybookUI();
  return { ok: true, phase: storyRun.phase };
}

// 她来读：没挑故事时先读今晚推荐（夹过书签就挑还没读过的，都读过按日期轮换），一口气读完并夹上书签
function storyHelper() {
  storyRun.helperSeq += 1;
  const d = ar17Clock.date();
  if (storyRun.phase === 'done' || !BEDTIME_STORY_BY_ID[storyRun.storyId]) {
    const sb = player.bedtimeStorybook;
    const tonight = getTonightStory(d);
    const unread = (s) => !(sb.bookmarks[s.id] && sb.bookmarks[s.id].count > 0);
    const pick = unread(tonight)
      ? tonight
      : BEDTIME_STORIES.find(unread) || BEDTIME_STORIES[(d.getDate() + storyRun.helperSeq) % BEDTIME_STORIES.length];
    storyRun.storyId = '';
    storyRun.phase = 'pick';
    pickStory(pick.id);
  }
  const so = BEDTIME_STORY_BY_ID[storyRun.storyId];
  let guard = 0;
  while (so && storyRun.page < so.pages.length && guard < 6) {
    turnStoryPage();
    guard += 1;
  }
  return { ...finishStory(), step: 'helper' };
}

// 晚安八音盒结算时调用：晚安余温里完成伴眠，另外 +12 金币 +8 亲密；每天最多 1 次，余温随之用掉
function awardStoryGoodnight(nowMs = ar17Clock.now()) {
  const sb = player.bedtimeStorybook;
  if (!sb) return null;
  const glow = getStoryGlow(nowMs);
  if (!glow) return null;
  const todayKey = formatLocalDateKey(new Date(nowMs));
  if (sb.goodnightDate === todayKey) return null;
  sb.goodnightDate = todayKey;
  sb.totalGoodnights = (sb.totalGoodnights || 0) + 1;
  sb.glow = null;
  storyRun.wasGlow = false;
  addCoins(STORY_RULES.goodnightCoins, player.x - 24, player.y - 52, '故事晚安 ');
  addAffectionXp(STORY_RULES.goodnightXp, `睡前故事晚安 +${STORY_RULES.goodnightXp} 亲密`);
  syncStorybookUI();
  return { coins: STORY_RULES.goodnightCoins, xp: STORY_RULES.goodnightXp, storyId: glow.storyId };
}

let wdOutfitKey = null;
let wdAlbumKey = null;
let wdItemsKey = null;
let sbStoryKey = null;
let sbShelfKey = null;

function syncWardrobeUI() {
  const wd = player.seasonWardrobe;
  if (!wd) return;
  const d = ar17Clock.date();
  const stats = getWardrobeStats(d);
  const cardOpen = isAr17CardOpen('wardrobe');
  const preview = WARDROBE_OUTFIT_BY_ID[wardrobeRun.previewId] || null;
  const wearing = WARDROBE_OUTFIT_BY_ID[wd.wearing] || null;
  const shown = preview || wearing;
  const seasonName = WARDROBE_SEASON_NAMES[stats.seasonId];

  if (wdSummaryPillEl) wdSummaryPillEl.textContent = `衣橱 ${stats.collected}/${stats.totalOutfits}`;
  if (wdSeasonRowEl) wdSeasonRowEl.dataset.season = stats.seasonId;
  const wdSeasonIco = document.getElementById('wd-season-ico');
  if (wdSeasonIco && wdSeasonIco.getAttribute('src') !== WARDROBE_SEASON_ART[stats.seasonId]) wdSeasonIco.setAttribute('src', WARDROBE_SEASON_ART[stats.seasonId]);
  if (wdSeasonNameEl) wdSeasonNameEl.textContent = `本季 · ${seasonName}季套组`;
  if (wdSeasonSubEl) {
    wdSeasonSubEl.textContent = `${d.getMonth() + 1}月${d.getDate()}日 · 按本地季节解锁 · 今日奖励 ${stats.rewardsToday}/${stats.dailyRewards}`;
  }
  if (wdMirrorEl) {
    wdMirrorEl.dataset.season = shown ? shown.season : stats.seasonId;
    wdMirrorEl.dataset.wearing = wearing && shown && wearing.id === shown.id ? '1' : '0';
    wdMirrorEl.style.setProperty('--wd-rgb', shown ? shown.rgb : '255, 244, 236');
    wdMirrorEl.classList.toggle('is-cheer', (player.wardrobeCheerTimer || 0) > 0);
  }
  if (wdMirrorItemsEl) {
    const key = `${shown ? shown.id : ''}|${stats.seasonId}`;
    if (key !== wdItemsKey) {
      wdItemsKey = key;
      wdMirrorItemsEl.innerHTML = shown
        ? shown.items.map((k) => `<img loading="lazy" src="${WARDROBE_ITEM_ART[k].img}" alt="" class="wd-item-ico" title="${WARDROBE_ITEM_ART[k].name}" />`).join('')
        : '';
      if (wdMirrorPetalsEl) {
        const art = WARDROBE_SEASON_ART[shown ? shown.season : stats.seasonId];
        wdMirrorPetalsEl.innerHTML = [0, 1, 2]
          .map((i) => `<img loading="lazy" src="${art}" alt="" class="wd-petal" style="left:${14 + i * 30}%;animation-delay:${(i * 0.7).toFixed(1)}s" />`)
          .join('');
      }
    }
  }
  if (wdMirrorTagEl) {
    wdMirrorTagEl.textContent = shown ? `${shown.short} · ${wearing && wearing.id === shown.id ? '穿着中' : '试穿看看'}` : '先挑套组';
  }

  if (wdOutfitRowEl) {
    const season = getWardrobeSeasonOutfits(stats.seasonId);
    const rKey = season.map((o) => o.id).join(',');
    if (rKey !== wdOutfitKey) {
      wdOutfitKey = rKey;
      wdOutfitRowEl.innerHTML = season
        .map(
          (o) => `<button type="button" class="wd-outfit-chip" data-outfit-id="${o.id}" style="--wd-rgb:${o.rgb}">
            <img loading="lazy" src="${WARDROBE_ITEM_ART[o.items[0]].img}" alt="" class="wd-outfit-ico" />
            <span class="wd-outfit-meta">
              <span class="wd-outfit-name">${o.name}</span>
              <em class="wd-outfit-sub"></em>
            </span>
          </button>`
        )
        .join('');
    }
    wdOutfitRowEl.querySelectorAll('.wd-outfit-chip').forEach((chip) => {
      const oid = chip.dataset.outfitId;
      const rec = wd.outfits[oid];
      chip.classList.toggle('active', Boolean(shown && shown.id === oid));
      chip.classList.toggle('is-found', Boolean(rec && rec.count > 0));
      chip.classList.toggle('is-wearing', wd.wearing === oid);
      const sub = chip.querySelector('.wd-outfit-sub');
      if (sub) sub.textContent = wd.wearing === oid ? '穿着中' : rec && rec.count > 0 ? `换过${rec.count}次` : '新套组';
      chip.title = `${WARDROBE_OUTFIT_BY_ID[oid].name} · ${WARDROBE_OUTFIT_BY_ID[oid].items.map((k) => WARDROBE_ITEM_ART[k].name).join(' + ')}`;
    });
  }
  if (wdStoryLineEl) {
    wdStoryLineEl.textContent = shown
      ? `${shown.items.map((k) => WARDROBE_ITEM_ART[k].name).join(' + ')} · ${shown.season === stats.seasonId ? '当季' : `${WARDROBE_SEASON_NAMES[shown.season]}季`}小特效`
      : `${seasonName}季可换「${getWardrobeSeasonOutfits(stats.seasonId).map((o) => o.name).join('」「')}」，换过的随时能再穿`;
    wdStoryLineEl.title = shown ? shown.line : wdStoryLineEl.textContent;
  }
  const mainState = getWardrobeMainState();
  if (btnWardrobeMainEl) {
    btnWardrobeMainEl.disabled = mainState.disabled;
    btnWardrobeMainEl.textContent = mainState.label;
    btnWardrobeMainEl.dataset.mode = mainState.mode;
    btnWardrobeMainEl.classList.toggle('is-ready', !mainState.disabled && mainState.mode === 'wear');
  }
  if (btnWardrobeHelperEl) btnWardrobeHelperEl.textContent = '她来挑';

  if (wdAlbumGridEl) {
    const aKey = `${stats.seasonId}|${WARDROBE_OUTFITS.map((o) => (wd.outfits[o.id] ? wd.outfits[o.id].count : 0)).join(',')}|${wd.wearing}|${shown ? shown.id : ''}`;
    if (aKey !== wdAlbumKey) {
      wdAlbumKey = aKey;
      wdAlbumGridEl.innerHTML = WARDROBE_OUTFITS.map((o) => {
        const rec = wd.outfits[o.id];
        const found = Boolean(rec && rec.count > 0);
        const inSeason = o.season === stats.seasonId;
        const tag = found ? o.short : `${WARDROBE_SEASON_NAMES[o.season]}季`;
        return `<button type="button" class="wd-album-chip${found ? ' is-found' : ''}${inSeason ? ' is-season' : ''}${wd.wearing === o.id ? ' is-wearing' : ''}${shown && shown.id === o.id ? ' is-current' : ''}" data-outfit-id="${o.id}" style="--wd-rgb:${o.rgb}" title="${o.name}${found ? ` · 换过 ${rec.count} 次` : inSeason ? ' · 当季可换' : ` · ${WARDROBE_SEASON_NAMES[o.season]}季可换`}">
            <img loading="lazy" src="${WARDROBE_SEASON_ART[o.season]}" alt="" class="wd-album-ico" />
            <em class="wd-album-tag">${tag}</em>
          </button>`;
      }).join('');
    }
  }
  if (wdAlbumSubEl) wdAlbumSubEl.textContent = `每季 2 套 · 共换装 ${stats.totalChanges} 次`;
  if (wdFooterLineEl) {
    setRuleLine(
      wdFooterLineEl,
      `换装：每天前 ${WARDROBE_RULES.dailyRewards} 次 +${WARDROBE_RULES.coinReward} 金币，新套组 +${WARDROBE_RULES.newOutfitCoins}`,
      `换装：每天前 ${WARDROBE_RULES.dailyRewards} 次 +${WARDROBE_RULES.coinReward} 金币 +${WARDROBE_RULES.xpReward} 亲密，第一次换上的套组再 +${WARDROBE_RULES.newOutfitCoins}；只换造型，已穿戴饰品的加成不变；记进周报和当天日记`
    );
  }

  const wv = player.wardrobeVisual;
  wv.outfitId = wearing ? wearing.id : '';
  wv.look = getWardrobeLook(wv.outfitId);
  wv.seasonKey = wearing ? wearing.season : '';
  wv.rgb = wearing ? wearing.rgb : '';
  wv.cardOpen = cardOpen;
  wv.preview = preview ? preview.id : '';
  wv.cheer = player.wardrobeCheerTimer || 0;
  syncWardrobeStoryPill(stats, null);
}

function syncStorybookUI() {
  const sb = player.bedtimeStorybook;
  if (!sb) return;
  const d = ar17Clock.date();
  const stats = getStorybookStats(d);
  const cardOpen = isAr17CardOpen('storybook');
  const so = BEDTIME_STORY_BY_ID[storyRun.storyId] || null;
  const tonight = BEDTIME_STORY_BY_ID[stats.tonightId];
  const glow = stats.glow;

  if (sbSummaryPillEl) sbSummaryPillEl.textContent = `书签 ${stats.collected}/${stats.totalStories}`;
  if (sbNightRowEl) {
    sbNightRowEl.dataset.bedtime = stats.bedtime ? '1' : '0';
    sbNightRowEl.dataset.glow = glow ? '1' : '0';
  }
  if (sbNightNameEl) sbNightNameEl.textContent = `${stats.bedtime ? '睡前' : '白天'} · 今晚《${tonight.name}》`;
  if (sbNightSubEl) {
    sbNightSubEl.textContent = glow
      ? `晚安余温还剩 ${glow.minsLeft} 分`
      : stats.bedtime
        ? `${d.getMonth() + 1}月${d.getDate()}日 · 睡前读完留下晚安余温 · 今日奖励 ${stats.rewardsToday}/${stats.dailyRewards}`
        : `${d.getMonth() + 1}月${d.getDate()}日 · 20:00 后是睡前时间 · 今日奖励 ${stats.rewardsToday}/${stats.dailyRewards}`;
  }
  if (sbBookEl) {
    sbBookEl.dataset.phase = storyRun.phase;
    sbBookEl.dataset.glow = glow ? '1' : '0';
    sbBookEl.style.setProperty('--sb-rgb', so ? so.rgb : tonight.rgb);
    sbBookEl.classList.toggle('is-flipping', storyRun.flip > 0);
  }
  if (sbPageTextEl) {
    sbPageTextEl.textContent =
      storyRun.phase === 'done' && storyRun.lastResult
        ? `《${storyRun.lastResult.name}》书签夹好啦`
        : so
          ? storyRun.page > 0
            ? so.pages[storyRun.page - 1]
            : `《${so.name}》`
          : '挑一篇故事';
  }
  if (sbBookTagEl) {
    sbBookTagEl.textContent =
      storyRun.phase === 'done' && storyRun.lastResult
        ? `${BEDTIME_STORY_BY_ID[storyRun.lastResult.storyId].short} · 已夹书签`
        : so
          ? `${so.short} · ${storyRun.page}/${so.pages.length} 页`
          : '先挑故事';
  }

  if (sbStoryRowEl) {
    const rKey = BEDTIME_STORIES.map((s) => s.id).join(',');
    if (rKey !== sbStoryKey) {
      sbStoryKey = rKey;
      sbStoryRowEl.innerHTML = BEDTIME_STORIES.map(
        (s) => `<button type="button" class="sb-story-chip" data-story-id="${s.id}" style="--sb-rgb:${s.rgb}">
            <span class="sb-story-name">${s.name}</span>
          </button>`
      ).join('');
    }
    sbStoryRowEl.querySelectorAll('.sb-story-chip').forEach((chip) => {
      const sid = chip.dataset.storyId;
      const rec = sb.bookmarks[sid];
      chip.classList.toggle('active', Boolean(so && so.id === sid));
      chip.classList.toggle('is-found', Boolean(rec && rec.count > 0));
      chip.classList.toggle('is-tonight', sid === stats.tonightId);
      chip.title = `${BEDTIME_STORY_BY_ID[sid].name}${sid === stats.tonightId ? ' · 今晚推荐' : ''}${rec && rec.count > 0 ? ` · 读过 ${rec.count} 次` : ' · 还没读过'}`;
    });
  }
  if (sbStoryLineEl) {
    sbStoryLineEl.textContent =
      storyRun.phase === 'done' && storyRun.lastResult
        ? storyRun.lastResult.bedtime
          ? '再挑一本，或者去开晚安八音盒~'
          : '睡前读完才会留下晚安余温'
        : so
          ? `《${so.name}》共 ${so.pages.length} 页：你翻页，她来读`
          : `今晚推荐《${tonight.name}》，6 篇故事随时能读`;
    sbStoryLineEl.title = sbStoryLineEl.textContent;
  }
  const mainState = getStoryMainState();
  if (btnStorybookMainEl) {
    btnStorybookMainEl.disabled = mainState.disabled;
    btnStorybookMainEl.textContent = mainState.label;
    btnStorybookMainEl.dataset.mode = mainState.mode;
    btnStorybookMainEl.classList.toggle('is-ready', !mainState.disabled && mainState.mode === 'finish');
  }
  if (btnStorybookHelperEl) btnStorybookHelperEl.textContent = '她来读';

  if (sbShelfGridEl) {
    const cKey = `${BEDTIME_STORIES.map((s) => (sb.bookmarks[s.id] ? `${sb.bookmarks[s.id].count}${sb.bookmarks[s.id].starlit ? 's' : ''}` : '0')).join(',')}|${so ? so.id : ''}`;
    if (cKey !== sbShelfKey) {
      sbShelfKey = cKey;
      sbShelfGridEl.innerHTML = BEDTIME_STORIES.map((s) => {
        const rec = sb.bookmarks[s.id];
        const found = Boolean(rec && rec.count > 0);
        return `<span class="sb-shelf-chip${found ? ' is-found' : ''}${rec && rec.starlit ? ' is-starlit' : ''}${so && so.id === s.id ? ' is-now' : ''}" data-story-id="${s.id}" style="--sb-rgb:${s.rgb}" title="${s.name}${found ? ` · 书签 ×${rec.count}${rec.starlit ? ' · 星光书签' : ''}` : ' · 还没夹书签'}">
            <img loading="lazy" src="./assets/story_bookmark.webp?v=hd60" alt="" class="sb-shelf-ico" />
            <em class="sb-shelf-tag">${found ? `${s.short}${rec.starlit ? '·星光' : ''}` : '待收集'}</em>
          </span>`;
      }).join('');
    }
  }
  if (sbShelfSubEl) {
    sbShelfSubEl.textContent = `星光书签 ${stats.starlit} · 故事晚安 ${stats.totalGoodnights} 次 · 共读 ${stats.totalRead} 本`;
  }
  if (sbFooterLineEl) {
    if (glow) {
      setRuleLine(
        sbFooterLineEl,
        `晚安余温中：完成晚安伴眠另 +${STORY_RULES.goodnightCoins} 金币`,
        `晚安余温还剩 ${glow.minsLeft} 分：这期间完成晚安八音盒伴眠，另外 +${STORY_RULES.goodnightCoins} 金币 +${STORY_RULES.goodnightXp} 亲密（每天最多 ${STORY_RULES.goodnightDaily} 次，不改好梦章原有数值）`
      );
    } else {
      setRuleLine(
        sbFooterLineEl,
        `读完：每天前 ${STORY_RULES.dailyRewards} 本 +${STORY_RULES.coinReward} 金币，新书签 +${STORY_RULES.newBookmarkCoins}`,
        `读完夹书签：每天前 ${STORY_RULES.dailyRewards} 本 +${STORY_RULES.coinReward} 金币 +${STORY_RULES.xpReward} 亲密，新书签再 +${STORY_RULES.newBookmarkCoins}；睡前（20:00 ~ 05:00）读完留下 ${STORY_RULES.glowMin} 分钟晚安余温，期间完成晚安伴眠另 +${STORY_RULES.goodnightCoins} 金币 +${STORY_RULES.goodnightXp} 亲密（每天 ${STORY_RULES.goodnightDaily} 次）`
      );
    }
  }

  const sv = player.storyVisual;
  sv.cardOpen = cardOpen;
  sv.reading = Boolean(so && storyRun.phase === 'read');
  sv.storyId = so ? so.id : '';
  sv.rgb = so ? so.rgb : tonight.rgb;
  sv.page = storyRun.page;
  sv.pages = so ? so.pages.length : 0;
  sv.cheer = player.storyCheerTimer || 0;
  sv.glow = Boolean(glow);
  syncWardrobeStoryPill(null, stats);
}

// 每秒复核一次：晚安余温到点散去；跨日刷新当季套组 / 今晚推荐
function refreshAr17Clock() {
  const nowMs = ar17Clock.now();
  const d = new Date(nowMs);
  const glow = getStoryGlow(nowMs);
  let storyChanged = false;
  if (storyRun.wasGlow && !glow) {
    storyRun.wasGlow = false;
    storyChanged = true;
  } else {
    storyRun.wasGlow = Boolean(glow);
  }
  const sb = player.bedtimeStorybook;
  if (!glow && sb.glow && Number(sb.glow.endMs) <= nowMs) {
    sb.glow = null;
    savePetState();
    storyChanged = true;
  }
  const dayKey = formatLocalDateKey(d);
  let wardrobeChanged = false;
  if (dayKey !== storyRun.dayKey) {
    storyRun.dayKey = dayKey;
    storyChanged = true;
    wardrobeChanged = true;
  }
  if (wardrobeChanged || isAr17CardOpen('wardrobe')) syncWardrobeUI();
  if (storyChanged || glow || isAr17CardOpen('storybook')) syncStorybookUI();
}

// ---------------- AR-17 合并紧凑胶囊：晚安余温 / 读到第几页 + 正在穿的季节套组，窄屏放不下就收起 ----------------
function syncWardrobeStoryPill(wsIn = null, ssIn = null) {
  if (!wsPillEl) return;
  const ws = wsIn || getWardrobeStats();
  const ss = ssIn || getStorybookStats();
  const outfit = WARDROBE_OUTFIT_BY_ID[ws.wearing];
  const showStory = Boolean(ss.glow || ss.reading);
  const showWardrobe = Boolean(outfit);
  wsPillEl.classList.toggle('hidden', !(gameMode === 'pet' && (showStory || showWardrobe)));
  wsPillEl.classList.toggle('has-glow', Boolean(ss.glow));
  wsSegStoryEl?.classList.toggle('hidden', !showStory);
  wsSegWardrobeEl?.classList.toggle('hidden', !showWardrobe);
  // 晚安余温更有时效：两段都在时优先留故事段
  wsSegStoryEl?.classList.toggle('is-priority', showStory);
  wsSegWardrobeEl?.classList.toggle('is-priority', !showStory);
  if (wsPillStoryEl) wsPillStoryEl.textContent = ss.glow ? `余温${ss.glow.minsLeft}分` : ss.reading ? `${ss.page}/${ss.pages}页` : '';
  if (wsPillWardrobeEl) wsPillWardrobeEl.textContent = outfit ? outfit.short : '';
  if (outfit) wsPillEl.style.setProperty('--wd-rgb', outfit.rgb);
  wsPillEl.title = `${ss.glow ? `睡前故事晚安余温还剩 ${ss.glow.minsLeft} 分钟` : ss.reading ? `睡前故事读到第 ${ss.page}/${ss.pages} 页` : '睡前故事书'} · ${outfit ? `穿着「${outfit.name}」套组` : '季节换装衣橱'}`;
  fitWardrobeStoryPill();
}

// 与 AR-11 ~ AR-16 同一条规则：窄屏胶囊行已排满时不为 AR-17 胶囊新开一行（offsetTop 不受旋转舞台变换影响），
// 两段都放不下先只留优先的一段，仍放不下才整颗收起；只读 DOM，任何区段初始化时调用都不会触发 TDZ
function fitWardrobeStoryPill() {
  const pill = document.getElementById('wardrobe-story-pill');
  if (!pill) return false;
  pill.classList.remove('ws-no-room', 'ws-solo');
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
  const shownSegs = Array.from(pill.querySelectorAll('.ws-seg')).filter((s) => !s.classList.contains('hidden'));
  if (shownSegs.length > 1) {
    pill.classList.add('ws-solo');
    if (mid(pill) <= lastRowMid + 6) return true;
    pill.classList.remove('ws-solo');
  }
  pill.classList.add('ws-no-room');
  return false;
}

function openAr17Card(cardEl) {
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
  dismissAr17Cards();
  dismissPolaroid();
  closeAlbumLightbox();
  // 刚收起的 AR-15 / AR-16 卡片：她手里可能还举着星座卡 / 风铃 / 绷架 / 松饼，换成衣橱 / 绘本前先放下
  player.starCheerTimer = 0;
  player.rainCheerTimer = 0;
  player.embroideryCheerTimer = 0;
  player.hearthCheerTimer = 0;
  cardEl.classList.remove('hidden');
}

function openWardrobeCard() {
  if (!wardrobeCardEl) return { ok: false };
  openAr17Card(wardrobeCardEl);
  player.storyCheerTimer = 0;
  if (!WARDROBE_OUTFIT_BY_ID[wardrobeRun.previewId]) wardrobeRun.previewId = player.seasonWardrobe.wearing || '';
  syncWardrobeUI();
  syncStorybookUI();
  playSfx('pat');
  return { ok: true };
}

function openStorybookCard() {
  if (!storybookCardEl) return { ok: false };
  openAr17Card(storybookCardEl);
  player.wardrobeCheerTimer = 0;
  syncStorybookUI();
  syncWardrobeUI();
  petAudio.playDiaryFlip();
  return { ok: true };
}

let wsPillFitTimer = 0;
function updateAr17Companions(dt) {
  if (player.wardrobeCheerTimer > 0) {
    player.wardrobeCheerTimer = Math.max(0, player.wardrobeCheerTimer - dt);
    if (player.wardrobeCheerTimer <= 0) wdMirrorEl?.classList.remove('is-cheer');
  }
  if (player.storyCheerTimer > 0) player.storyCheerTimer = Math.max(0, player.storyCheerTimer - dt);
  if (storyRun.flip > 0) {
    storyRun.flip = Math.max(0, storyRun.flip - dt);
    if (storyRun.flip <= 0) sbBookEl?.classList.remove('is-flipping');
  }
  storyRun.tickAcc -= dt;
  if (storyRun.tickAcc <= 0) {
    storyRun.tickAcc = 1;
    refreshAr17Clock();
  }
  wsPillFitTimer -= dt;
  if (wsPillFitTimer <= 0) {
    wsPillFitTimer = 0.5;
    fitWardrobeStoryPill();
  }
  const wv = player.wardrobeVisual;
  wv.cardOpen = isAr17CardOpen('wardrobe');
  wv.cheer = player.wardrobeCheerTimer || 0;
  const sv = player.storyVisual;
  sv.cardOpen = isAr17CardOpen('storybook');
  sv.cheer = player.storyCheerTimer || 0;
  sv.flip = storyRun.flip;
}
// [[split end]]
export {
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
  fitWardrobeStoryPill,
  openAr17Card,
  openWardrobeCard,
  openStorybookCard,
  updateAr17Companions
};
