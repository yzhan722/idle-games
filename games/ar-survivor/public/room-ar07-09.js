// room-ar07-09.js — AR-7～AR-9：拼贴、电台、钩织、热可可、压花、望远镜
// 由 game.js 原样搬出（2026-11-26，AR-COM5 拆分）：只有函数声明，和初始化时不依赖其他文件的常量 / 变量。
// 会改写共享 let 的函数、绑定事件的顶层语句都留在 game.js。[[split N]] 记号给 tests/split_check.mjs 拼回比对用，别删。
import {
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
  setNapping,
  bindHudTap,
  switchMode,
  goodnightRun,
  closeAlbumLightbox
} from './game.js?v=hd60';
import {
  petAudio
} from './audio.js?v=hd31';
import {
  COLLAGE_FRAME_STYLES,
  COLLAGE_LAYOUT_PRESETS,
  getCollageLuckBlessing,
  CROCHET_YARN_COSTS,
  CROCHET_KNIT_SPECS,
  getCrochetStageLabel,
  getCrochetWarmGuard,
  HOT_COCOA_BASES,
  HOT_COCOA_TOPPINGS,
  HOT_COCOA_BLENDS,
  getHotCocoaBlend,
  getActiveHotCocoaBuff,
  grantInteractiveCareYarnDrop,
  PRESSED_PETAL_COSTS,
  PRESSED_BOOKMARK_IDS,
  PRESSED_BOOKMARK_SPECS,
  getPressedStageLabel,
  getPressedFlowerBlessing,
  CONSTELLATION_SPECS,
  CONSTELLATION_BY_ID,
  getStargazeDecoys,
  getStarGuidanceBonus
} from './data-room.js?v=hd60';
import {
  syncSurvivorSkillStrip
} from './mode-survivor.js?v=hd60';
import {
  dismissWindowAmbienceCard,
  formatPomodoroClock,
  foldOrHidePomodoroCard,
  recordJournalActivity,
  syncWeeklyJournalUI,
  dismissWeeklyJournalCard,
  dismissTeatimeCard,
  dismissTerrariumCard,
  cancelGoodnightSession,
  foldOrHideGoodnightCard
} from './room-ar04-06.js?v=hd60';
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
  dismissAr15Cards
} from './room-ar14-15.js?v=hd60';
import {
  dismissAr16Cards,
  dismissAr17Cards
} from './room-ar16-17.js?v=hd60';
import {
  dismissTopicCard
} from './pet-chat.js?v=hd60';

// [[split 19]]

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
  dismissTelescopeCard(); dismissAr10Cards(); dismissAr11Cards(); dismissAr12Cards(); dismissAr13Cards(); dismissAr14Cards(); dismissAr15Cards(); dismissAr16Cards(); dismissAr17Cards();
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
// [[split 20]]

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
  dismissTelescopeCard(); dismissAr10Cards(); dismissAr11Cards(); dismissAr12Cards(); dismissAr13Cards(); dismissAr14Cards(); dismissAr15Cards(); dismissAr16Cards(); dismissAr17Cards();
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
// [[split 22]]

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
// [[split 23]]

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
  dismissTelescopeCard(); dismissAr10Cards(); dismissAr11Cards(); dismissAr12Cards(); dismissAr13Cards(); dismissAr14Cards(); dismissAr15Cards(); dismissAr16Cards(); dismissAr17Cards();
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
      const topImg = HOT_COCOA_TOPPINGS[item.toppingId]?.img || './assets/cocoa_marshmallow_topping.webp?v=hd60';
      dot.innerHTML = `<img loading="lazy" src="${topImg}" alt="" />`;
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
  dismissTelescopeCard(); dismissAr10Cards(); dismissAr11Cards(); dismissAr12Cards(); dismissAr13Cards(); dismissAr14Cards(); dismissAr15Cards(); dismissAr16Cards(); dismissAr17Cards();
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
// [[split 25]]

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
// [[split 26]]

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
  dismissTelescopeCard(); dismissAr10Cards(); dismissAr11Cards(); dismissAr12Cards(); dismissAr13Cards(); dismissAr14Cards(); dismissAr15Cards(); dismissAr16Cards(); dismissAr17Cards();
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
    btn.innerHTML = `<img loading="lazy" src="./assets/vfx_sparkle.webp?v=hd60" alt="" class="tele-star-img" />${
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
          <img loading="lazy" src="./assets/vfx_sparkle.webp?v=hd60" alt="" class="star-chart-slot-ico" />
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
  dismissAr10Cards(); dismissAr11Cards(); dismissAr12Cards(); dismissAr13Cards(); dismissAr14Cards(); dismissAr15Cards(); dismissAr16Cards(); dismissAr17Cards();
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
    dismissTelescopeCard(); dismissAr10Cards(); dismissAr11Cards(); dismissAr12Cards(); dismissAr13Cards(); dismissAr14Cards(); dismissAr15Cards(); dismissAr16Cards(); dismissAr17Cards();
  }
}
// [[split end]]
export {
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
  advanceCozyRadioTime,
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
  stargazeRun,
  startStargazeSession,
  tapStargazeStar,
  pickStargazeOption,
  syncTelescopeUI,
  updateStargazeCompanion,
  dismissTelescopeCard,
  openTelescopeCard,
  toggleTelescopeCard
};
