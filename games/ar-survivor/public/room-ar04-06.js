// room-ar04-06.js — AR-4～AR-6：窗景、番茄钟、下午茶、周报、花架、晚安
// 由 game.js 原样搬出（2026-11-26，AR-COM5 拆分）：只有函数声明，和初始化时不依赖其他文件的常量 / 变量。
// 会改写共享 let 的函数、绑定事件的顶层语句都留在 game.js。[[split N]] 记号给 tests/split_check.mjs 拼回比对用，别删。
import {
  vision,
  W,
  H,
  playSfx,
  formatLocalDateKey,
  getPrevDateKey,
  getPast7DateKeys,
  getWeekCycleKey,
  deriveClockWindowAmbience,
  savePetState,
  gameMode,
  player,
  WINDOW_PERIOD_SPECS,
  WINDOW_SEASON_SPECS,
  spawnInteractVfx,
  addCoins,
  setPlayerEmote,
  addAffectionXp,
  completeWish,
  drawerEl,
  activeDrawerTab,
  dismissPolaroid,
  closeDrawer,
  setNapping,
  bindHudTap,
  switchMode,
  pomodoroRun,
  goodnightRun,
  polaroidAlbum,
  closeAlbumLightbox
} from './game.js?v=hd60';
import {
  petAudio
} from './audio.js?v=hd31';
import {
  TERRARIUM_XP_THRESHOLDS,
  TERRARIUM_SPECS,
  getTerrariumStageLabel,
  getBotanicalBlessings,
  getCrochetWarmGuard,
  HOT_COCOA_BLENDS,
  grantInteractiveCareYarnDrop,
  getPressedFlowerBlessing,
  grantPressedFlowerDrop,
  getStarGuidanceBonus,
  getWatercolorFocusWard,
  getMailboxHeartfeltBonus,
  getBentoKitchenStats,
  getMemoryPuzzleBonus,
  getKittenCornerStats,
  getGreetingCardBlessing,
  getPicnicStats,
  getDiaryStats,
  getPotteryStats,
  getAromaStats,
  ar15Clock,
  isStarBedtime,
  getActiveProjection,
  getStarStats,
  getStarGoodnightMult,
  getRainStats,
  getEmbroideryStats,
  getHearthStats,
  ar17Clock,
  getWardrobeStats,
  isStoryBedtime,
  getStorybookStats
} from './data-room.js?v=hd60';
import {
  getActiveTeaShiftBuff,
  syncSurvivorSkillStrip
} from './mode-survivor.js?v=hd60';
import {
  renderDrawerItems
} from './drawer.js?v=hd60';
import {
  cozyRadioRun,
  dismissCollageCard,
  pauseCozyRadioForModeSwitch,
  foldOrHideCozyRadioCard,
  dismissCrochetCard,
  dismissHotCocoaCard,
  dismissPressedFlowerCard,
  dismissTelescopeCard
} from './room-ar07-09.js?v=hd60';
import {
  dismissAr10Cards,
  dismissAr11Cards
} from './room-ar10-11.js?v=hd60';
import {
  dismissAr12Cards,
  dismissAr13Cards
} from './room-ar12-13.js?v=hd60';
import {
  dismissAr14Cards,
  dismissAr15Cards,
  awardStarDream
} from './room-ar14-15.js?v=hd60';
import {
  dismissAr16Cards,
  dismissAr17Cards,
  awardStoryGoodnight
} from './room-ar16-17.js?v=hd60';
import {
  dismissTopicCard,
  cancelRpsGame,
  cancelPalmCatchGame
} from './pet-chat.js?v=hd60';

// [[split 11]]

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
    dismissTelescopeCard(); dismissAr10Cards(); dismissAr11Cards(); dismissAr12Cards(); dismissAr13Cards(); dismissAr14Cards(); dismissAr15Cards(); dismissAr16Cards(); dismissAr17Cards();
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
// [[split 12]]

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
// [[split 13]]

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
    html += `<span class="pomo-stamp-slot ${stamped ? 'stamped' : ''}"><img loading="lazy" src="./assets/ui_stamp_focus.webp?v=hd60" alt="" /></span>`;
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
  dismissTelescopeCard(); dismissAr10Cards(); dismissAr11Cards(); dismissAr12Cards(); dismissAr13Cards(); dismissAr14Cards(); dismissAr15Cards(); dismissAr16Cards(); dismissAr17Cards();
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
  dismissTelescopeCard(); dismissAr10Cards(); dismissAr11Cards(); dismissAr12Cards(); dismissAr13Cards(); dismissAr14Cards(); dismissAr15Cards(); dismissAr16Cards(); dismissAr17Cards();
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

// 切到后台时不再有帧：专注 / 伴眠按真实时间走，回来的第一帧把漏掉的补上；时钟被往回拨就退回按帧算
function takeRealElapsed(run, dt, nowMs = Date.now()) {
  const last = run.tickAt || 0;
  run.tickAt = nowMs;
  return last > 0 && nowMs >= last ? (nowMs - last) / 1000 : dt;
}

function updatePomodoroCompanion(dt) {
  if (pomodoroRun.status === 'running') {
    advancePomodoroTime(takeRealElapsed(pomodoroRun, dt));
  } else {
    pomodoroRun.tickAt = 0;
  }
}
// [[split 15]]

// ================= AR-5 治愈下午茶甜点手作台 & 陪伴心情手账周报 =================
const TEA_BASES = {
  peach_oolong: {
    id: 'peach_oolong',
    name: '蜜桃乌龙',
    img: './assets/tea_peach_oolong.webp?v=hd60'
  },
  blueberry_foam: {
    id: 'blueberry_foam',
    name: '海盐奶盖蓝莓',
    img: './assets/tea_blueberry_foam.webp?v=hd60'
  },
  osmanthus_milk: {
    id: 'osmanthus_milk',
    name: '桂花牛乳茶',
    img: './assets/tea_osmanthus_milk.webp?v=hd60'
  }
};

const TEA_PASTRIES = {
  souffle: {
    id: 'souffle',
    name: '草莓舒芙蕾',
    img: './assets/pastry_souffle.webp?v=hd60'
  },
  whale_macaron: {
    id: 'whale_macaron',
    name: '蓝鲸马卡龙',
    img: './assets/pastry_whale_macaron.webp?v=hd60'
  },
  pudding_tart: {
    id: 'pudding_tart',
    name: '焦糖布丁挞',
    img: './assets/pastry_pudding_tart.webp?v=hd60'
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
  bliss: { id: 'bliss', label: '甜心', img: './assets/ui_mood_blush.webp?v=hd60' },
  focus: { id: 'focus', label: '专注', img: './assets/ui_stamp_focus.webp?v=hd60' },
  cozy: { id: 'cozy', label: '茶歇', img: './assets/ui_btn_teatime.webp?v=hd60' },
  star: { id: 'star', label: '星梦', img: './assets/ui_pin_star.webp?v=hd60' },
  goodnight: { id: 'goodnight', label: '好梦', img: './assets/stamp_goodnight_moon.webp?v=hd60' }
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
    img: './assets/tea_platter_signature.webp?v=hd60'
  },
  {
    id: 'tier3',
    name: '星海满贯礼盒',
    reqStamps: 5,
    reqScore: 15,
    reqLabel: '5章 或 热度15',
    coins: 110,
    xp: 95,
    img: './assets/ui_stamp_focus.webp?v=hd60'
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
      outfits: 0,
      stories: 0,
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
  // AR-17 换上季节套组是甜甜的「甜心」；睡前一起读故事记成「好梦」，其余时候是「茶歇」
  if (type === 'outfits') return 'bliss';
  if (type === 'stories') return isStoryBedtime(ar17Clock.date()) ? 'goodnight' : 'cozy';
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
    type === 'snacks' ||
    type === 'outfits' ||
    type === 'stories'
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
  } else if (type === 'outfits') {
    cum.totalOutfitChanges = Math.max((cum.totalOutfitChanges || 0) + val, player.seasonWardrobe?.totalChanges || 0);
  } else if (type === 'stories') {
    cum.totalStories = Math.max((cum.totalStories || 0) + val, player.bedtimeStorybook?.totalStories || 0);
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
  let outfits7d = 0;
  let stories7d = 0;

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
    outfits7d += Number(raw.outfits) || 0;
    stories7d += Number(raw.stories) || 0;
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
  const wardrobeStats = getWardrobeStats(refDate);
  const storyStats = getStorybookStats(refDate);
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
    outfits7d +
    stories7d * 2 +
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
    totalSnackEntries: hearthStats.totalEntries,
    totalOutfitChanges: Math.max(outfits7d, cum.totalOutfitChanges || 0, wardrobeStats.totalChanges),
    wardrobeOutfits: wardrobeStats.collected,
    totalWardrobeOutfits: wardrobeStats.totalOutfits,
    totalStories: Math.max(stories7d, cum.totalStories || 0, storyStats.totalRead),
    storyBookmarks: storyStats.collected,
    totalStoryBookmarks: storyStats.totalStories,
    storyGoodnights: storyStats.totalGoodnights
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
    outfits7d,
    stories7d,
    daysList,
    cumulative,
    giftStates,
    claimableCount: giftStates.filter((g) => g.claimable).length
  };
}

function buildJournalCompanionQuote(summary) {
  if (summary.outfits7d >= 1 || summary.stories7d >= 1) {
    return `近7日换上了 ${summary.outfits7d} 次季节套组（衣橱 ${summary.cumulative.wardrobeOutfits}/${summary.cumulative.totalWardrobeOutfits}），睡前还一起读完 ${summary.stories7d} 本小故事（书签 ${summary.cumulative.storyBookmarks}/${summary.cumulative.totalStoryBookmarks}）~`;
  }
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
          <img loading="lazy" src="${d.moodSpec.img}" alt="" class="journal-day-seal" />
          <span class="journal-day-mood">${d.stamped ? d.moodSpec.label : '待盖章'}</span>
        </div>
      `
      )
      .join('');
  }

  if (journalMetricsGridEl) {
    const metrics = [
      {
        ico: './assets/ui_btn_watercolor_easel.webp?v=hd60',
        title: '水彩写生与信笺',
        val: `水彩 ${summary.paints7d} 幅`,
        sub: `画廊 ${summary.cumulative.gallerySize}/${summary.cumulative.totalGallery} · 信笺 ${summary.letters7d}封 · 投喂 ${summary.feeds7d}次`
      },
      {
        ico: './assets/ui_btn_kitten_corner.webp?v=hd60',
        title: '窗台小猫与贺卡',
        val: `小猫 ${summary.kittens7d} 次`,
        sub: `好感 ${summary.cumulative.kittenAffection}/${summary.cumulative.maxKittenAffection} · 贺卡 ${summary.cards7d}张 · 节日 ${summary.cumulative.cardOccasions}/${summary.cumulative.totalCardOccasions} · 轻电台 ${summary.radioMins7d}分 · 拼贴 ${summary.cumulative.totalCollages}帧 · 谈心 ${summary.chats7d}次`
      },
      {
        ico: './assets/ui_btn_telescope.webp?v=hd60',
        title: '星夜观星与伴眠',
        val: `观星 ${summary.stargazes7d} 次`,
        sub: `睡前故事 ${summary.stories7d}本 · 书签 ${summary.cumulative.storyBookmarks}/${summary.cumulative.totalStoryBookmarks} · 星图 ${summary.cumulative.constellationsCollected}/${summary.cumulative.totalConstellations} · 好梦章 ${summary.cumulative.totalGoodnightStamps}枚 · 星座卡 ${summary.cumulative.starCards}/${summary.cumulative.totalStarCards} · 听雨 ${summary.rains7d}则`
      },
      {
        ico: './assets/ui_btn_bento_kitchen.webp?v=hd60',
        title: '便当与回忆拼图',
        val: `便当 ${summary.bentos7d} 份`,
        sub: `图鉴 ${summary.cumulative.bentoRecipes}/${summary.cumulative.totalBentoRecipes} · 拼图 ${summary.puzzles7d}幅 · 回忆墙 ${summary.cumulative.memoryWallCount}/${summary.cumulative.totalMemoryWall} · 专注 ${summary.focusMins7d}分`
      },
      {
        ico: './assets/ui_btn_picnic_basket.webp?v=hd60',
        title: '周末野餐与日记',
        val: `野餐 ${summary.picnics7d} 次`,
        sub: `换装 ${summary.outfits7d}次 · 衣橱 ${summary.cumulative.wardrobeOutfits}/${summary.cumulative.totalWardrobeOutfits} · 刺绣 ${summary.embroideries7d}幅 · 绣样 ${summary.cumulative.embroideryPatterns}/${summary.cumulative.totalEmbroideryPatterns} · 炉边点心 ${summary.snacks7d}份 · 装篮 ${summary.picnicPreps7d}次 · 地点 ${summary.cumulative.picnicSpots}/${summary.cumulative.totalPicnicSpots} · 日记 ${summary.cumulative.diaryPages}页 · 贴纸 ${summary.diaries7d}次 · 热可可 ${summary.cocoas7d}杯 · 可可 ${summary.cumulative.cocoaBlendsDiscovered}/6 · 茶谱 ${summary.cumulative.recipesDiscovered}/9`
      },
      {
        ico: './assets/ui_btn_pottery_wheel.webp?v=hd60',
        title: '陶艺香氛与手作篮',
        val: `陶艺 ${summary.potteries7d} 件`,
        sub: `香氛 ${summary.aromas7d}次 · 陶艺图鉴 ${summary.cumulative.potteryCombos}/${summary.cumulative.totalPotteryCombos} · 香氛图鉴 ${summary.cumulative.aromaRecipes}/${summary.cumulative.totalAromaRecipes} · 钩针 Lv.${summary.cumulative.crochetTotalLevel}/9 · 压花 Lv.${summary.cumulative.pressedTotalLevel}/9 · 花架 Lv.${summary.cumulative.terrariumTotalLevel}/15`
      }
    ];
    journalMetricsGridEl.innerHTML = metrics
      .map(
        (m) => `
        <div class="journal-metric-card">
          <img loading="lazy" src="${m.ico}" alt="" class="journal-metric-ico" />
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
        <img loading="lazy" src="${g.img}" alt="" class="journal-gift-ico" />
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
  dismissTelescopeCard(); dismissAr10Cards(); dismissAr11Cards(); dismissAr12Cards(); dismissAr13Cards(); dismissAr14Cards(); dismissAr15Cards(); dismissAr16Cards(); dismissAr17Cards();
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
      slot.innerHTML = `<img loading="lazy" src="${pastrySpec.img}" alt="" />`;
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
  dismissTelescopeCard(); dismissAr10Cards(); dismissAr11Cards(); dismissAr12Cards(); dismissAr13Cards(); dismissAr14Cards(); dismissAr15Cards(); dismissAr16Cards(); dismissAr17Cards();
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
// [[split 16]]

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
// [[split 17]]

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
  dismissTelescopeCard(); dismissAr10Cards(); dismissAr11Cards(); dismissAr12Cards(); dismissAr13Cards(); dismissAr14Cards(); dismissAr15Cards(); dismissAr16Cards(); dismissAr17Cards();
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
    html += `<span class="musicbox-stamp-slot ${stamped ? 'stamped' : ''}"><img loading="lazy" src="./assets/stamp_goodnight_moon.webp?v=hd60" alt="" /></span>`;
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
    btnMusicboxLabelEl.textContent = isActive ? clockStr : '晚安';
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
  dismissTelescopeCard(); dismissAr10Cards(); dismissAr11Cards(); dismissAr12Cards(); dismissAr13Cards(); dismissAr14Cards(); dismissAr15Cards(); dismissAr16Cards(); dismissAr17Cards();
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
  const elapsedMins = Math.max(5, Math.min(plannedMins, Math.round(goodnightRun.elapsedSec / 60)));
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
  // AR-17 晚安联动：睡前故事的晚安余温里完成伴眠，另外 +12 金币 +8 亲密（独立加成、每天最多 1 次，不改上面好梦章的数值）
  const storyNight = awardStoryGoodnight();
  if (storyNight) goodnightRun.lastRewardSummary += ` 睡前故事书签 +${storyNight.coins} 金币~`;

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
    starDream,
    storyNight
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
    goodnightRun.tickAt = 0;
    player.isGoodnightSleeping = false;
    return;
  }
  if (gameMode !== 'pet') return;

  advanceGoodnightTime(takeRealElapsed(goodnightRun, dt));
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
  dismissTelescopeCard(); dismissAr10Cards(); dismissAr11Cards(); dismissAr12Cards(); dismissAr13Cards(); dismissAr14Cards(); dismissAr15Cards(); dismissAr16Cards(); dismissAr17Cards();
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
// [[split end]]
export {
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
  formatPomodoroClock,
  syncPomodoroUI,
  foldOrHidePomodoroCard,
  openPomodoroCard,
  togglePomodoroCard,
  selectPomodoroPreset,
  setPomodoroTaskTag,
  startPomodoroSession,
  togglePausePomodoro,
  cancelPomodoroSession,
  advancePomodoroTime,
  updatePomodoroCompanion,
  TEA_BASES,
  TEA_PASTRIES,
  AFTERNOON_TEA_RECIPES,
  JOURNAL_MOODS,
  teatimeCardEl,
  btnTeatimeDockEl,
  btnTeatimeGoShiftEl,
  teatimeBuffPillEl,
  weeklyJournalCardEl,
  btnWeeklyJournalEl,
  btnJournalStampTodayEl,
  ensureJournalDayEntry,
  recordJournalActivity,
  stampJournalToday,
  computeWeeklyJournalSummary,
  claimWeeklyGiftBox,
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
  goodnightOverlayEl,
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
  advanceGoodnightTime,
  updateGoodnightCompanion,
  foldOrHideGoodnightCard,
  openGoodnightCard,
  toggleGoodnightCard
};
