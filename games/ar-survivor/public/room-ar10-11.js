// room-ar10-11.js — AR-10～AR-11：水彩、信箱、便当、回忆拼图
// 由 game.js 原样搬出（2026-11-26，AR-COM5 拆分）：只有函数声明，和初始化时不依赖其他文件的常量 / 变量。
// 会改写共享 let 的函数、绑定事件的顶层语句都留在 game.js。[[split N]] 记号给 tests/split_check.mjs 拼回比对用，别删。
import {
  W,
  H,
  playSfx,
  formatLocalDateKey,
  savePetState,
  gameMode,
  player,
  spawnInteractVfx,
  BENTO_RECIPES,
  BENTO_RECIPE_BY_ID,
  addCoins,
  setPlayerEmote,
  addAffectionXp,
  floatingTexts,
  dismissPolaroid,
  closeDrawer,
  switchMode,
  kmCompactQuery,
  polaroidAlbum,
  closeAlbumLightbox
} from './game.js?v=hd60';
import {
  petAudio
} from './audio.js?v=hd31';
import {
  getBentoDeskAnchor,
  getMailboxDeskAnchor,
  getMemoryWallLayout,
  getWatercolorGalleryLayout,
  images,
  isReady
} from './sprites.js?v=hd60';
import {
  WATERCOLOR_SUBJECTS,
  WATERCOLOR_PALETTES,
  WATERCOLOR_SUBJECT_BY_ID,
  WATERCOLOR_PALETTE_BY_ID,
  getWatercolorComboId,
  getWatercolorOverlayBox,
  getWatercolorOverlayStyle,
  getWatercolorFocusWard,
  MAILBOX_STAMP_SPECS,
  getMailboxHeartfeltBonus,
  getMailboxShiftXpMult,
  BENTO_FILLINGS,
  BENTO_FILLING_BY_ID,
  BENTO_SIDE_BY_ID,
  BENTO_BAG_MAX,
  BENTO_RESCUE_THRESHOLD,
  getBentoPairId,
  getBentoKitchenStats,
  MEMORY_WALL_MAX,
  MEMORY_PUZZLE_GRID,
  MEMORY_PUZZLE_PIECES,
  getMemoryPuzzleBonus,
  getGreetingCardShiftXpMult
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
  computeWeeklyJournalSummary,
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
  dismissAr12Cards,
  fitSillCardPill,
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

// [[split 28]]

// ================= AR-10 窗畔雨天水彩写生画架 & 奶油手账小邮差信箱 =================
const watercolorCardEl = document.getElementById('watercolor-card');
const btnWatercolorDockEl = document.getElementById('btn-watercolor-easel');
const watercolorSummaryPillEl = document.getElementById('watercolor-summary-pill');
const watercolorPaperEl = document.getElementById('watercolor-paper');
const watercolorPaperBaseEl = document.getElementById('watercolor-paper-base');
const watercolorPaperSubjectEl = document.getElementById('watercolor-paper-subject');
const watercolorWashLayerEl = document.getElementById('watercolor-wash-layer');
const watercolorPaperTagEl = document.getElementById('watercolor-paper-tag');
const watercolorStepHintEl = document.getElementById('watercolor-step-hint');
const watercolorWellRowEl = document.getElementById('watercolor-well-row');
const watercolorProgressFillEl = document.getElementById('watercolor-progress-fill');
const btnWatercolorMainEl = document.getElementById('btn-watercolor-main');
const btnWatercolorGoShiftEl = document.getElementById('btn-watercolor-go-shift');
const watercolorGallerySubEl = document.getElementById('watercolor-gallery-sub');
const watercolorGalleryGridEl = document.getElementById('watercolor-gallery-grid');
const watercolorTotalWardEl = document.getElementById('watercolor-total-ward');

const mailboxCardEl = document.getElementById('mailbox-card');
const btnMailboxDockEl = document.getElementById('btn-mailbox');
const mailboxUnreadBadgeEl = document.getElementById('mailbox-unread-badge');
const mailboxSummaryPillEl = document.getElementById('mailbox-summary-pill');
const mailboxTabRowEl = document.getElementById('mailbox-tab-row');
const mailboxInboxCountEl = document.getElementById('mailbox-inbox-count');
const mailboxAlbumCountEl = document.getElementById('mailbox-album-count');
const mailboxInboxViewEl = document.getElementById('mailbox-inbox-view');
const mailboxAlbumViewEl = document.getElementById('mailbox-album-view');
const mailboxEnvelopeRowEl = document.getElementById('mailbox-envelope-row');
const mailboxNextHintEl = document.getElementById('mailbox-next-hint');
const mailboxLetterEl = document.getElementById('mailbox-letter');
const mailboxLetterTitleEl = document.getElementById('mailbox-letter-title');
const mailboxLetterMoodEl = document.getElementById('mailbox-letter-mood');
const mailboxLetterBodyEl = document.getElementById('mailbox-letter-body');
const mailboxLetterSignEl = document.getElementById('mailbox-letter-sign');
const mailboxLetterStampEl = document.getElementById('mailbox-letter-stamp');
const mailboxReplyGridEl = document.getElementById('mailbox-reply-grid');
const mailboxStampRowEl = document.getElementById('mailbox-stamp-row');
const btnMailboxSendEl = document.getElementById('btn-mailbox-send');
const btnMailboxGoShiftEl = document.getElementById('btn-mailbox-go-shift');
const mailboxStampTallyEl = document.getElementById('mailbox-stamp-tally');
const mailboxAlbumGridEl = document.getElementById('mailbox-album-grid');
const mailboxAlbumReadEl = document.getElementById('mailbox-album-read');
const mailboxTotalBonusEl = document.getElementById('mailbox-total-bonus');

const atelierPillEl = document.getElementById('atelier-post-pill');
const atelierSegEaselEl = document.getElementById('atelier-seg-easel');
const atelierSegMailEl = document.getElementById('atelier-seg-mail');
const atelierPillGalleryEl = document.getElementById('atelier-pill-gallery');
const atelierPillMailEl = document.getElementById('atelier-pill-mail');

// 画纸上 4 处晕染点（百分比坐标）
const WATERCOLOR_WASH_SPOTS = [
  { x: 24, y: 30 },
  { x: 74, y: 26 },
  { x: 28, y: 72 },
  { x: 72, y: 70 }
];
const WATERCOLOR_STROKES_NEEDED = WATERCOLOR_WASH_SPOTS.length;

const watercolorRun = {
  active: false,
  phase: 'idle',
  subjectId: '',
  paletteId: '',
  mixStep: 0,
  mistakes: 0,
  strokes: [false, false, false, false],
  lastResult: null
};

function isAr10CardOpen(which = '') {
  const wc = document.getElementById('watercolor-card');
  const mb = document.getElementById('mailbox-card');
  const wcOpen = Boolean(wc && !wc.classList.contains('hidden'));
  const mbOpen = Boolean(mb && !mb.classList.contains('hidden'));
  if (which === 'watercolor') return wcOpen;
  if (which === 'mailbox') return mbOpen;
  return wcOpen || mbOpen;
}

function dismissWatercolorCard() {
  document.getElementById('watercolor-card')?.classList.add('hidden');
  document.getElementById('btn-watercolor-easel')?.classList.remove('active');
}

function dismissMailboxCard() {
  document.getElementById('mailbox-card')?.classList.add('hidden');
  document.getElementById('btn-mailbox')?.classList.remove('active');
}

function dismissAr10Cards() {
  dismissWatercolorCard();
  dismissMailboxCard();
}

function applyShiftXpGain(val) {
  survivorRun.shiftXp += Math.max(0, Number(val) || 0) * getMailboxShiftXpMult() * getGreetingCardShiftXpMult();
  return survivorRun.shiftXp;
}

function getWatercolorActiveSpecs() {
  const wc = player.watercolor;
  const subjectId = watercolorRun.active ? watercolorRun.subjectId : wc.selectedSubject;
  const paletteId = watercolorRun.active ? watercolorRun.paletteId : wc.selectedPalette;
  return {
    subject: WATERCOLOR_SUBJECT_BY_ID[subjectId] || WATERCOLOR_SUBJECTS[0],
    palette: WATERCOLOR_PALETTE_BY_ID[paletteId] || WATERCOLOR_PALETTES[0]
  };
}

function getWatercolorMixInfo(subject, palette) {
  const sIdx = Math.max(0, WATERCOLOR_SUBJECTS.findIndex((x) => x.id === subject.id));
  const [a, b] = subject.mixIdx;
  return {
    firstIdx: a,
    secondIdx: b,
    first: palette.pigments[a],
    second: palette.pigments[b],
    mixName: palette.mixNames[sIdx] || palette.mixNames[0]
  };
}

function getWatercolorPaintingTitle(subject, palette) {
  return `${palette.shortName}·${subject.title}`;
}

function resetWatercolorRun() {
  watercolorRun.active = false;
  watercolorRun.phase = 'idle';
  watercolorRun.subjectId = '';
  watercolorRun.paletteId = '';
  watercolorRun.mixStep = 0;
  watercolorRun.mistakes = 0;
  watercolorRun.strokes = [false, false, false, false];
}

function applyWatercolorSelection(subjectId, paletteId) {
  const wc = player.watercolor;
  const nextSubject = WATERCOLOR_SUBJECT_BY_ID[subjectId] ? subjectId : wc.selectedSubject;
  const nextPalette = WATERCOLOR_PALETTE_BY_ID[paletteId] ? paletteId : wc.selectedPalette;
  const changed = nextSubject !== wc.selectedSubject || nextPalette !== wc.selectedPalette;
  wc.selectedSubject = nextSubject;
  wc.selectedPalette = nextPalette;
  if (watercolorRun.active && (changed || watercolorRun.phase === 'done')) {
    const midSession = watercolorRun.phase !== 'done';
    resetWatercolorRun();
    if (midSession) setPlayerEmote('换了题材和颜色，洗洗笔重新起稿吧~', 1.8, 'happy', false);
  }
  playSfx('pat');
  savePetState();
  syncWatercolorUI();
  return { ok: true, subjectId: wc.selectedSubject, paletteId: wc.selectedPalette };
}

function selectWatercolorSubject(subjectId) {
  if (!WATERCOLOR_SUBJECT_BY_ID[subjectId]) return { ok: false, reason: 'invalid_subject' };
  return applyWatercolorSelection(subjectId, player.watercolor.selectedPalette);
}

function selectWatercolorPalette(paletteId) {
  if (!WATERCOLOR_PALETTE_BY_ID[paletteId]) return { ok: false, reason: 'invalid_palette' };
  return applyWatercolorSelection(player.watercolor.selectedSubject, paletteId);
}

function startWatercolorSession() {
  if (gameMode !== 'pet') switchMode('pet');
  const wc = player.watercolor;
  const subject = WATERCOLOR_SUBJECT_BY_ID[wc.selectedSubject] || WATERCOLOR_SUBJECTS[0];
  const palette = WATERCOLOR_PALETTE_BY_ID[wc.selectedPalette] || WATERCOLOR_PALETTES[0];
  watercolorRun.active = true;
  watercolorRun.phase = 'mix';
  watercolorRun.subjectId = subject.id;
  watercolorRun.paletteId = palette.id;
  watercolorRun.mixStep = 0;
  watercolorRun.mistakes = 0;
  watercolorRun.strokes = [false, false, false, false];
  watercolorRun.lastResult = null;
  const mix = getWatercolorMixInfo(subject, palette);
  player.paintingWashColor = palette.wash;
  player.idleTime = 0;
  player.happyTimer = 1.4;
  playSfx('paint_mix');
  setPlayerEmote(`画架支好啦！先蘸「${mix.first.name}」再蘸「${mix.second.name}」，调出「${mix.mixName}」吧~`, 2.8, 'happy', false);
  syncWatercolorUI();
  return {
    ok: true,
    subjectId: subject.id,
    paletteId: palette.id,
    mixOrder: [mix.firstIdx, mix.secondIdx],
    mixName: mix.mixName
  };
}

function tapWatercolorWell(wellIdx) {
  if (!watercolorRun.active || watercolorRun.phase !== 'mix') return { ok: false, reason: 'not_mixing' };
  const idx = Math.round(Number(wellIdx));
  if (!(idx >= 0 && idx < 3)) return { ok: false, reason: 'invalid_well' };
  const { subject, palette } = getWatercolorActiveSpecs();
  const mix = getWatercolorMixInfo(subject, palette);
  const expected = subject.mixIdx[watercolorRun.mixStep];
  if (idx === expected) {
    watercolorRun.mixStep += 1;
    player.idleTime = 0;
    playSfx('paint_mix');
    if (watercolorRun.mixStep >= 2) {
      watercolorRun.phase = 'brush';
      player.happyTimer = 1.6;
      setPlayerEmote(`调出「${mix.mixName}」啦！在画纸上轻点 ${WATERCOLOR_STROKES_NEEDED} 处晕染开~`, 2.4, 'happy', false);
    }
    syncWatercolorUI();
    return { ok: true, mixStep: watercolorRun.mixStep, phase: watercolorRun.phase };
  }
  watercolorRun.mistakes += 1;
  watercolorRun.mixStep = 0;
  playSfx('star_miss');
  setPlayerEmote(`唔…颜色有点浊了，洗洗笔再从「${mix.first.name}」开始调吧~`, 2.0, 'happy', false);
  syncWatercolorUI();
  return { ok: false, reason: 'wrong_well', mistakes: watercolorRun.mistakes };
}

function tapWatercolorWash(spotIdx) {
  if (!watercolorRun.active || watercolorRun.phase !== 'brush') return { ok: false, reason: 'not_brushing' };
  const idx = Math.round(Number(spotIdx));
  if (!(idx >= 0 && idx < WATERCOLOR_STROKES_NEEDED)) return { ok: false, reason: 'invalid_spot' };
  if (watercolorRun.strokes[idx]) return { ok: false, reason: 'already_washed' };
  watercolorRun.strokes[idx] = true;
  player.watercolor.totalStrokes = (player.watercolor.totalStrokes || 0) + 1;
  petAudio.playBrushStroke(idx);
  player.idleTime = 0;
  const done = watercolorRun.strokes.filter(Boolean).length;
  if (done >= WATERCOLOR_STROKES_NEEDED) {
    watercolorRun.phase = 'finish';
    player.happyTimer = 1.8;
    setPlayerEmote('晕染完成！落款签上名字，就能挂上墙面画廊啦~', 2.4, 'happy', false);
  }
  savePetState();
  syncWatercolorUI();
  return { ok: true, strokes: done, phase: watercolorRun.phase };
}

function finishWatercolorPainting(refDate = new Date()) {
  if (!watercolorRun.active || watercolorRun.phase !== 'finish') return { ok: false, reason: 'not_ready' };
  const { subject, palette } = getWatercolorActiveSpecs();
  const wc = player.watercolor;
  const comboId = getWatercolorComboId(subject.id, palette.id);
  const prev = wc.paintings[comboId];
  const isFirstPainting = !prev;
  const mistakes = watercolorRun.mistakes;
  const perfect = mistakes === 0;
  wc.paintings[comboId] = {
    count: (prev?.count || 0) + 1,
    firstDate: prev?.firstDate || formatLocalDateKey(refDate),
    bestMistakes: prev ? Math.min(prev.bestMistakes, mistakes) : mistakes
  };
  wc.hung = (wc.hung || []).filter((k) => k !== comboId);
  wc.hung.push(comboId);
  if (wc.hung.length > 6) wc.hung = wc.hung.slice(-6);
  wc.totalPaintings = (wc.totalPaintings || 0) + 1;
  if (perfect) wc.perfectPaintings = (wc.perfectPaintings || 0) + 1;
  wc.lastPaintingId = comboId;
  watercolorRun.phase = 'done';

  const title = getWatercolorPaintingTitle(subject, palette);
  const coinReward = (isFirstPainting ? 28 : 12) + (perfect ? 6 : 0);
  const xpReward = isFirstPainting ? 30 : 14;
  petAudio.playPaintingFinishChime(Math.max(0, WATERCOLOR_PALETTES.indexOf(palette)));
  petAudio.haptic('headpat');
  player.idleTime = 0;
  player.happyTimer = 2.8;
  player.cheerTimer = isFirstPainting ? 2.6 : 1.6;
  player.paintingCheerTimer = 5;
  spawnInteractVfx(player.x, player.y - 30, 'sparkle', isFirstPainting ? 12 : 8);
  addCoins(coinReward, player.x + 28, player.y - 46, isFirstPainting ? '新画作 ' : '写生 ');
  addAffectionXp(xpReward, isFirstPainting ? `挂上新画「${title}」` : `再画「${title}」`);
  recordJournalActivity('paints', 1, refDate);
  const ward = getWatercolorFocusWard();
  setPlayerEmote(
    isFirstPainting
      ? `『${title}』挂上墙啦！画廊收藏 ${ward.gallerySize}/${ward.total} 幅~`
      : `又画了一幅『${title}』，${subject.note}`,
    3.2,
    isFirstPainting ? 'cheer' : 'happy',
    true
  );

  watercolorRun.lastResult = {
    comboId,
    subjectId: subject.id,
    paletteId: palette.id,
    title,
    isFirstPainting,
    perfect,
    mistakes,
    coinReward,
    xpReward
  };
  savePetState();
  syncWatercolorUI();
  syncWeeklyJournalUI(refDate);
  if (gameMode === 'survivor') syncSurvivorSkillStrip();
  return { ok: true, ...watercolorRun.lastResult, ward, audio: petAudio.getAr10AudioInfo() };
}

function handleWatercolorMainAction() {
  const phase = watercolorRun.active ? watercolorRun.phase : 'idle';
  if (phase === 'idle' || phase === 'done') return startWatercolorSession();
  if (phase === 'finish') return finishWatercolorPainting();
  return { ok: false, reason: 'in_progress' };
}

let watercolorWellKey = '';
let watercolorWashKey = '';
let watercolorGalleryKey = '';

function syncWatercolorUI() {
  const wc = player.watercolor;
  if (!wc) return;
  const ward = getWatercolorFocusWard();
  const { subject, palette } = getWatercolorActiveSpecs();
  const comboId = getWatercolorComboId(subject.id, palette.id);
  const phase = watercolorRun.active ? watercolorRun.phase : 'idle';
  const mix = getWatercolorMixInfo(subject, palette);
  const strokesDone = watercolorRun.strokes.filter(Boolean).length;
  const cardOpen = isAr10CardOpen('watercolor');
  player.isPainting = Boolean((cardOpen && watercolorRun.active && phase !== 'done') || player.paintingCheerTimer > 0);
  player.paintingWashColor = palette.wash;

  player.watercolorWallVisual = {
    gallerySize: ward.gallerySize,
    total: ward.total,
    items: (wc.hung || [])
      .map((cid) => {
        const [sid, pid] = cid.split('__');
        const sSpec = WATERCOLOR_SUBJECT_BY_ID[sid];
        const pSpec = WATERCOLOR_PALETTE_BY_ID[pid];
        if (!sSpec || !pSpec) return null;
        return {
          comboId: cid,
          paletteId: pid,
          filter: pSpec.filter,
          washColor: pSpec.wash,
          subjectSpriteKey: sSpec.spriteKey,
          subjectBox: getWatercolorOverlayBox(sSpec),
          isLatest: cid === wc.lastPaintingId
        };
      })
      .filter(Boolean)
  };

  if (watercolorSummaryPillEl) watercolorSummaryPillEl.textContent = `画廊 ${ward.gallerySize}/${ward.total}`;

  document.querySelectorAll('#watercolor-subject-grid .watercolor-subject-tab').forEach((btn) => {
    const sid = btn.dataset.subjectId;
    btn.classList.toggle('active', sid === subject.id);
    const paintedKinds = WATERCOLOR_PALETTES.filter((p) => wc.paintings[getWatercolorComboId(sid, p.id)]).length;
    btn.classList.toggle('has-painted', paintedKinds > 0);
    btn.title = `${WATERCOLOR_SUBJECT_BY_ID[sid]?.name || ''} · 已画 ${paintedKinds}/3 种调色`;
  });
  document.querySelectorAll('#watercolor-palette-grid .watercolor-palette-chip').forEach((chip) => {
    const pid = chip.dataset.paletteId;
    const pSpec = WATERCOLOR_PALETTE_BY_ID[pid];
    chip.classList.toggle('active', pid === palette.id);
    if (pSpec && !chip.querySelector('.wc-swatch-row')) {
      const row = document.createElement('span');
      row.className = 'wc-swatch-row';
      row.innerHTML = pSpec.pigments.map((pg) => `<i class="wc-swatch" style="--wc:${pg.color}"></i>`).join('');
      chip.appendChild(row);
    }
  });

  const painted = Boolean(wc.paintings[comboId]);
  let reveal = 1;
  let blurPx = 0;
  if (phase === 'idle') {
    reveal = painted ? 1 : 0.4;
    blurPx = painted ? 0 : 1.6;
  } else if (phase === 'mix') {
    reveal = 0.32;
    blurPx = 2.4;
  } else if (phase === 'brush') {
    reveal = 0.32 + (0.68 * strokesDone) / WATERCOLOR_STROKES_NEEDED;
    blurPx = (WATERCOLOR_STROKES_NEEDED - strokesDone) * 0.6;
  }
  const gray = reveal < 1 ? (1 - reveal) * 0.85 : 0;
  const paperFilter = `${palette.filter} grayscale(${gray.toFixed(2)}) blur(${blurPx.toFixed(1)}px)`;
  if (watercolorPaperEl) watercolorPaperEl.dataset.phase = phase;
  if (watercolorPaperBaseEl) {
    watercolorPaperBaseEl.style.filter = paperFilter;
    watercolorPaperBaseEl.style.opacity = Math.max(0.32, reveal).toFixed(2);
  }
  if (watercolorPaperSubjectEl) {
    const hasSubject = Boolean(subject.spriteKey);
    watercolorPaperSubjectEl.classList.toggle('hidden', !hasSubject);
    if (hasSubject && watercolorPaperSubjectEl.getAttribute('src') !== subject.img) {
      watercolorPaperSubjectEl.src = subject.img;
    }
    if (hasSubject) {
      const box = getWatercolorOverlayBox(subject);
      watercolorPaperSubjectEl.style.left = `${(box.left * 100).toFixed(1)}%`;
      watercolorPaperSubjectEl.style.top = `${(box.top * 100).toFixed(1)}%`;
      watercolorPaperSubjectEl.style.width = `${(box.size * 100).toFixed(1)}%`;
      watercolorPaperSubjectEl.style.height = `${(box.size * 100).toFixed(1)}%`;
    }
    watercolorPaperSubjectEl.style.filter = paperFilter;
    watercolorPaperSubjectEl.style.opacity = Math.max(0.32, reveal).toFixed(2);
  }
  if (watercolorPaperTagEl) {
    watercolorPaperTagEl.textContent =
      phase === 'mix'
        ? '调色中'
        : phase === 'brush'
          ? `晕染 ${strokesDone}/${WATERCOLOR_STROKES_NEEDED}`
          : phase === 'finish'
            ? '待落款'
            : phase === 'done'
              ? '已挂上墙'
              : painted
                ? `已收藏 ×${wc.paintings[comboId].count}`
                : '待起笔';
  }

  if (watercolorWashLayerEl) {
    const washKey = phase === 'brush' ? `brush|${palette.id}|${subject.id}` : '';
    if (washKey !== watercolorWashKey) {
      watercolorWashKey = washKey;
      watercolorWashLayerEl.innerHTML = washKey
        ? WATERCOLOR_WASH_SPOTS.map(
            (pt, i) =>
              `<button type="button" class="wc-wash-spot" data-wash-idx="${i}" style="left:${pt.x}%;top:${pt.y}%;--wc:${mix.first.color}" aria-label="第 ${i + 1} 处晕染"><em>${i + 1}</em></button>`
          ).join('')
        : '';
    }
    watercolorWashLayerEl.querySelectorAll('.wc-wash-spot').forEach((el) => {
      el.classList.toggle('is-done', Boolean(watercolorRun.strokes[Number(el.dataset.washIdx)]));
    });
  }

  if (watercolorWellRowEl) {
    const wellKey = palette.id;
    if (wellKey !== watercolorWellKey) {
      watercolorWellKey = wellKey;
      watercolorWellRowEl.innerHTML = palette.pigments
        .map(
          (pg, i) =>
            `<button type="button" class="wc-well" data-well-idx="${i}" style="--wc:${pg.color}"><i class="wc-well-dot"></i><span class="wc-well-name">${pg.name}</span></button>`
        )
        .join('');
    }
    watercolorWellRowEl.querySelectorAll('.wc-well').forEach((el) => {
      const i = Number(el.dataset.wellIdx);
      el.disabled = phase !== 'mix';
      el.classList.toggle('is-picked', phase === 'mix' && watercolorRun.mixStep >= 1 && i === mix.firstIdx);
      el.classList.toggle('is-mixed', (phase === 'brush' || phase === 'finish') && (i === mix.firstIdx || i === mix.secondIdx));
    });
  }

  if (watercolorProgressFillEl) {
    const pct =
      phase === 'mix'
        ? watercolorRun.mixStep * 15
        : phase === 'brush'
          ? 30 + (strokesDone / WATERCOLOR_STROKES_NEEDED) * 60
          : phase === 'finish'
            ? 92
            : phase === 'done'
              ? 100
              : 0;
    watercolorProgressFillEl.style.width = `${pct}%`;
  }

  if (watercolorStepHintEl) {
    const res = watercolorRun.lastResult;
    watercolorStepHintEl.textContent =
      phase === 'mix'
        ? watercolorRun.mixStep === 0
          ? `先蘸「${mix.first.name}」，再蘸「${mix.second.name}」~${watercolorRun.mistakes ? ` · 洗笔 ${watercolorRun.mistakes} 次` : ''}`
          : `再蘸「${mix.second.name}」，调出「${mix.mixName}」！`
        : phase === 'brush'
          ? `用「${mix.mixName}」轻点画纸 ${WATERCOLOR_STROKES_NEEDED} 处晕染（${strokesDone}/${WATERCOLOR_STROKES_NEEDED}）`
          : phase === 'finish'
            ? '晕染完成！落款签名，把它挂上墙面画廊吧~'
            : phase === 'done' && res
              ? `『${res.title}』已挂上墙${res.perfect ? ' · 一笔不差' : ''}，+${res.coinReward}金~`
              : `『${getWatercolorPaintingTitle(subject, palette)}』：「${mix.first.name}」+「${mix.second.name}」调出「${mix.mixName}」，再晕染 ${WATERCOLOR_STROKES_NEEDED} 笔~`;
  }

  if (btnWatercolorMainEl) {
    btnWatercolorMainEl.disabled = phase === 'mix' || phase === 'brush';
    btnWatercolorMainEl.textContent =
      phase === 'mix'
        ? '调色中…'
        : phase === 'brush'
          ? `晕染中 ${strokesDone}/${WATERCOLOR_STROKES_NEEDED}`
          : phase === 'finish'
            ? '落款签名 · 挂上画廊'
            : phase === 'done'
              ? '再画一幅'
              : '调色起笔';
    btnWatercolorMainEl.classList.toggle('is-finish', phase === 'finish');
  }
  if (btnWatercolorGoShiftEl) btnWatercolorGoShiftEl.classList.toggle('hidden', !ward.active);

  if (watercolorGalleryGridEl) {
    const counts = WATERCOLOR_SUBJECTS.flatMap((s) =>
      WATERCOLOR_PALETTES.map((p) => wc.paintings[getWatercolorComboId(s.id, p.id)]?.count || 0)
    );
    const galleryKey = `${counts.join(',')}|${comboId}`;
    if (galleryKey !== watercolorGalleryKey) {
      watercolorGalleryKey = galleryKey;
      const slots = [];
      for (const s of WATERCOLOR_SUBJECTS) {
        for (const p of WATERCOLOR_PALETTES) {
          const cid = getWatercolorComboId(s.id, p.id);
          const rec = wc.paintings[cid];
          const slotFilter = rec ? p.filter : `${p.filter} grayscale(0.9)`;
          slots.push(
            `<button type="button" class="wc-gallery-slot${rec ? ' collected' : ''}${cid === comboId ? ' current' : ''}" data-combo-id="${cid}" title="${rec ? `${getWatercolorPaintingTitle(s, p)} · 已画 ${rec.count} 次` : `待写生：${getWatercolorPaintingTitle(s, p)}`}">
              <span class="wc-slot-art">
                <img loading="lazy" src="./assets/watercolor_rainy_window.webp?v=hd31" alt="" class="wc-slot-base" style="filter:${slotFilter}" />
                ${s.spriteKey ? `<img loading="lazy" src="${s.img}" alt="" class="wc-slot-subject" style="filter:${slotFilter};${getWatercolorOverlayStyle(s)}" />` : ''}
              </span>
              <em class="wc-slot-tag">${rec ? `×${rec.count}` : p.shortName}</em>
            </button>`
          );
        }
      }
      watercolorGalleryGridEl.innerHTML = slots.join('');
    }
  }
  if (watercolorGallerySubEl) {
    watercolorGallerySubEl.textContent = `墙面画廊 · 挂出 ${Math.min(6, (wc.hung || []).length)} 幅 · 共画 ${wc.totalPaintings || 0} 幅 · 一笔不差 ${wc.perfectPaintings || 0} 次`;
  }
  if (watercolorTotalWardEl) {
    watercolorTotalWardEl.textContent = ward.active
      ? `画意专注守护生效中：幸存者暴击 +${(ward.critChanceBonus * 100).toFixed(1)}% · 专注攻速 +${(ward.focusHastePct * 100).toFixed(1)}%（画廊 ${ward.gallerySize}/${ward.total}）`
      : '画意专注守护：每收藏 1 幅不同水彩，幸存者打工暴击 +1.2% · 专注攻速 +1.5%';
  }
  if (btnWatercolorDockEl) {
    btnWatercolorDockEl.classList.toggle('has-ward', ward.active);
    btnWatercolorDockEl.classList.toggle('active', cardOpen);
  }
  syncAtelierPill();
}

// ---------------- 小邮差信箱 ----------------
const MAILBOX_MAX_INBOX = 3;
const MAILBOX_TIER_SPECS = [
  { id: 0, name: '初识', greeting: '主人你好呀', signoff: '—— 有点害羞的 DeepSeek娘', intervalHours: 8 },
  { id: 1, name: '熟络', greeting: '亲爱的主人', signoff: '—— 每天都在书桌旁等你的 DeepSeek娘', intervalHours: 6 },
  { id: 2, name: '知心', greeting: '最最喜欢的主人', signoff: '—— 永远站在你这边的 DeepSeek娘', intervalHours: 4 }
];
const MAILBOX_WELCOME_BODY = '听说写信能把心意装得满满的，所以我在你的书桌上偷偷放了一个小信箱。';
const MAILBOX_WELCOME_LINE = '这是我第一次给你写信，有点紧张……以后我会常常把心里话塞进这个小信箱哦！';
const MAILBOX_WELCOME_REPLIES = [
  { id: 'welcome_wait', text: '好期待你的每一封信！', best: true },
  { id: 'welcome_shy', text: '不笑你，我会认真回信的~', best: false },
  { id: 'welcome_ok', text: '收到，信箱我会常来看看。', best: false }
];
const MAILBOX_WELCOME_REACTION = '真的会期待吗？那我以后要写得更勤快一点~';

const LETTER_MOOD_SPECS = {
  bliss: {
    title: '粉色便笺',
    bodies: [
      '今天被你摸摸头的时候，心里像打翻了一罐草莓果酱，甜到现在还没散掉呢。',
      '偷偷在手账角落画了一颗小爱心，写着「今天也很开心」，你要假装没看见哦。'
    ],
    bestReaction: '呜哇，你也超开心！我要把这封回信压在枕头底下，今晚一定做甜甜的梦~',
    replies: [
      { id: 'hug', text: '我也超开心，明天继续摸摸头！', best: true },
      { id: 'jam', text: '草莓果酱也分我一勺吧~', best: false },
      { id: 'calm', text: '收到啦，早点休息哦。', best: false }
    ]
  },
  focus: {
    title: '番茄钟便签',
    bodies: [
      '看你专心敲代码的样子好帅气，我在旁边翻书都不敢大声，怕吵到你。',
      '刚才的专注时间我数着秒针陪你过完啦，下一轮也一起加油吧！'
    ],
    bestReaction: '有我陪着就变轻松了？那下一轮番茄钟我也要坐在最近的位置~',
    replies: [
      { id: 'thanks', text: '有你陪着，专注都变轻松了。', best: true },
      { id: 'break', text: '等会儿一起喝杯茶休息吧。', best: false },
      { id: 'tease', text: '你翻书的声音其实超小声啦。', best: false }
    ]
  },
  cozy: {
    title: '暖茶信笺',
    bodies: [
      '窗外下着小雨，我把热可可捧在手心里，想着要是你也在旁边就好啦。',
      '花房的小盆栽又冒出新叶子了，我给它取名叫「主人的小跟班」。'
    ],
    bestReaction: '那下个雨天我们就窝在一起，我负责热可可，你负责讲故事~',
    replies: [
      { id: 'together', text: '下雨天就该窝在一起喝热可可！', best: true },
      { id: 'name', text: '小跟班这个名字好可爱。', best: false },
      { id: 'umbrella', text: '记得关窗，别着凉啦。', best: false }
    ]
  },
  star: {
    title: '星光明信片',
    bodies: [
      '昨晚望远镜里的星星眨了三下眼，我猜它在替我跟你说晚安。',
      '拍立得里的我们笑得好傻，我把它夹进了星图手账最闪亮的那一页。'
    ],
    bestReaction: '星星一定收到你的谢谢啦，今晚它会眨得更亮一点~',
    replies: [
      { id: 'wish', text: '那颗星星也替我回一句：谢谢你。', best: true },
      { id: 'photo', text: '下次再多拍几张傻傻的合影！', best: false },
      { id: 'sleep', text: '看星星也要早点睡觉哦。', best: false }
    ]
  },
  goodnight: {
    title: '晚安小纸条',
    bodies: [
      '八音盒转完最后一圈了，我抱着鲸鱼抱枕，先在梦里给你占个好位置。',
      '今天的月亮圆圆的，像你送我的那块棉花糖，晚安，明天见。'
    ],
    bestReaction: '好位置已经占好啦，梦里见，不许迟到哦~',
    replies: [
      { id: 'dream', text: '梦里见，记得给我留位置！', best: true },
      { id: 'moon', text: '月亮和棉花糖都替你收好了。', best: false },
      { id: 'night', text: '晚安，好梦。', best: false }
    ]
  }
};

const mailboxRun = {
  view: 'inbox',
  openLetterId: '',
  replyId: '',
  stampId: '',
  albumReadIdx: -1,
  lastResult: null,
  checkTimer: 0
};

function getMailboxTier(level = player.level) {
  const lv = Math.max(1, Number(level) || 1);
  return lv >= 8 ? 2 : lv >= 4 ? 1 : 0;
}

function getMailboxIntervalMs(tier = getMailboxTier()) {
  return (MAILBOX_TIER_SPECS[tier] || MAILBOX_TIER_SPECS[0]).intervalHours * 3600000;
}

function isMailboxStampUnlocked(stamp) {
  return Boolean(stamp) && (player.mailbox?.totalReplies || 0) >= stamp.unlockReplies;
}

// 七日心情周报里出现最多的心情（同票时取最近一天），未盖章时回落到当前心情章选择
function deriveWeeklyLetterMood(refDate = new Date()) {
  const summary = computeWeeklyJournalSummary(refDate);
  const counts = {};
  for (const d of summary.daysList) {
    if (d.stamped) counts[d.moodId] = (counts[d.moodId] || 0) + 1;
  }
  const maxN = Math.max(0, ...Object.values(counts));
  let moodId = '';
  if (maxN > 0) {
    for (let i = summary.daysList.length - 1; i >= 0; i--) {
      const d = summary.daysList[i];
      if (d.stamped && counts[d.moodId] === maxN) {
        moodId = d.moodId;
        break;
      }
    }
  }
  if (!LETTER_MOOD_SPECS[moodId]) {
    moodId = LETTER_MOOD_SPECS[player.weeklyJournal.selectedMood] ? player.weeklyJournal.selectedMood : 'bliss';
  }
  return { moodId, summary, dominantCount: maxN };
}

function buildWeeklyLetterLine(summary, moodId) {
  const label = JOURNAL_MOODS[moodId]?.label || '甜心';
  if (!summary || summary.stamps7d <= 0) {
    return `这周的手账还空空的，下次一起盖一枚「${label}」心情章好不好？`;
  }
  const extras = [];
  if (summary.paints7d > 0) extras.push(`画了 ${summary.paints7d} 幅水彩`);
  if (summary.letters7d > 0) extras.push(`交换了 ${summary.letters7d} 封信`);
  if (summary.stargazes7d > 0) extras.push(`观星 ${summary.stargazes7d} 次`);
  return `这周手账里「${label}」的心情最多，我们一起盖了 ${summary.stamps7d} 枚心情章${extras.length ? `，还${extras.slice(0, 2).join('、')}` : ''}。`;
}

function getLetterView(letter) {
  const spec = LETTER_MOOD_SPECS[letter?.moodId] || LETTER_MOOD_SPECS.bliss;
  const tier = MAILBOX_TIER_SPECS[letter?.tier] || MAILBOX_TIER_SPECS[0];
  const core = letter?.welcome ? MAILBOX_WELCOME_BODY : spec.bodies[(letter?.variant || 0) % spec.bodies.length];
  return {
    title: letter?.welcome ? '初见来信' : spec.title,
    moodLabel: letter?.welcome ? '初见' : JOURNAL_MOODS[letter?.moodId]?.label || '甜心',
    tierName: tier.name,
    body: `${tier.greeting}：${core}${letter?.weeklyLine ? letter.weeklyLine : ''}`,
    sign: tier.signoff,
    replies: letter?.welcome ? MAILBOX_WELCOME_REPLIES : spec.replies,
    bestReaction: letter?.welcome ? MAILBOX_WELCOME_REACTION : spec.bestReaction
  };
}

function writeMailboxLetter(refDate = new Date(), opts = {}) {
  const mb = player.mailbox;
  if (!mb || mb.letters.length >= MAILBOX_MAX_INBOX) return null;
  const welcome = Boolean(opts.welcome);
  const { moodId, summary } = deriveWeeklyLetterMood(refDate);
  const tier = getMailboxTier();
  mb.letterSeq = (mb.letterSeq || 0) + 1;
  const dateKey = formatLocalDateKey(refDate);
  const letter = {
    id: `L${mb.letterSeq}-${dateKey.replace(/-/g, '')}`,
    writtenAt: refDate.getTime(),
    dateKey,
    moodId,
    tier,
    variant: mb.letterSeq % 2,
    weeklyLine: welcome ? MAILBOX_WELCOME_LINE : buildWeeklyLetterLine(summary, moodId),
    welcome,
    opened: false
  };
  mb.letters.push(letter);
  mb.totalLetters = (mb.totalLetters || 0) + 1;
  if (welcome) mb.welcomeSent = true;
  mb.nextLetterAt = refDate.getTime() + getMailboxIntervalMs(tier);
  savePetState();
  syncMailboxUI(refDate);
  return letter;
}

function checkMailboxLetters(refDate = new Date(), announce = true) {
  const mb = player.mailbox;
  if (!mb) return null;
  const nowMs = refDate.getTime();
  let written = null;
  if (!mb.welcomeSent) {
    mb.welcomeSent = true;
    written = writeMailboxLetter(refDate, { welcome: true });
  } else if (mb.nextLetterAt > 0 && nowMs >= mb.nextLetterAt && mb.letters.length < MAILBOX_MAX_INBOX) {
    written = writeMailboxLetter(refDate);
  }
  if (!(mb.nextLetterAt > 0)) {
    mb.nextLetterAt = nowMs + getMailboxIntervalMs();
    savePetState();
  }
  if (written && announce && !written.welcome && gameMode === 'pet') {
    playSfx('stamp_press');
    setPlayerEmote('我往书桌上的小信箱里塞了一封新写的信，记得去拆哦~', 2.6, 'happy', false);
  }
  return written;
}

function openMailboxLetter(letterId) {
  const mb = player.mailbox;
  const letter = mb.letters.find((l) => l.id === letterId);
  if (!letter) return { ok: false, reason: 'no_letter' };
  mailboxRun.view = 'inbox';
  if (mailboxRun.openLetterId !== letter.id) {
    mailboxRun.replyId = '';
    mailboxRun.stampId = '';
  }
  mailboxRun.openLetterId = letter.id;
  const firstRead = !letter.opened;
  if (firstRead) {
    letter.opened = true;
    petAudio.playLetterOpen();
    player.idleTime = 0;
    player.happyTimer = 1.6;
    setPlayerEmote(letter.welcome ? '是我写的第一封信……读的时候不许笑哦~' : '是我写给你的信！要认真读完再回信哦~', 2.2, 'happy', false);
    savePetState();
  }
  syncMailboxUI();
  return { ok: true, letterId: letter.id, firstRead, view: getLetterView(letter) };
}

function chooseMailboxReply(replyId) {
  const letter = player.mailbox.letters.find((l) => l.id === mailboxRun.openLetterId);
  if (!letter) return { ok: false, reason: 'no_letter' };
  const reply = getLetterView(letter).replies.find((r) => r.id === replyId);
  if (!reply) return { ok: false, reason: 'invalid_reply' };
  mailboxRun.replyId = reply.id;
  playSfx('pat');
  syncMailboxUI();
  return { ok: true, replyId: reply.id };
}

function chooseMailboxStamp(stampId) {
  const letter = player.mailbox.letters.find((l) => l.id === mailboxRun.openLetterId);
  if (!letter) return { ok: false, reason: 'no_letter' };
  const stamp = MAILBOX_STAMP_SPECS.find((s) => s.id === stampId);
  if (!stamp) return { ok: false, reason: 'invalid_stamp' };
  if (!isMailboxStampUnlocked(stamp)) return { ok: false, reason: 'stamp_locked', need: stamp.unlockReplies };
  mailboxRun.stampId = stamp.id;
  playSfx('stamp_press');
  syncMailboxUI();
  return { ok: true, stampId: stamp.id };
}

function sendMailboxReply(refDate = new Date()) {
  if (gameMode !== 'pet') switchMode('pet');
  const mb = player.mailbox;
  const letter = mb.letters.find((l) => l.id === mailboxRun.openLetterId);
  if (!letter) return { ok: false, reason: 'no_letter' };
  const view = getLetterView(letter);
  const reply = view.replies.find((r) => r.id === mailboxRun.replyId);
  if (!reply) return { ok: false, reason: 'no_reply' };
  const stamp = MAILBOX_STAMP_SPECS.find((s) => s.id === mailboxRun.stampId);
  if (!stamp || !isMailboxStampUnlocked(stamp)) return { ok: false, reason: 'no_stamp' };

  const best = Boolean(reply.best);
  const coinReward = 10 + letter.tier * 4 + (best ? 8 : 0);
  const xpReward = 16 + letter.tier * 6 + (best ? 10 : 0);
  const prevUnlocked = MAILBOX_STAMP_SPECS.filter(isMailboxStampUnlocked).map((s) => s.id);
  mb.stamps[stamp.id] = (mb.stamps[stamp.id] || 0) + 1;
  mb.totalReplies = (mb.totalReplies || 0) + 1;
  if (best) mb.bestReplies = (mb.bestReplies || 0) + 1;
  mb.album.push({
    ...letter,
    opened: true,
    replyId: reply.id,
    stampId: stamp.id,
    best,
    repliedDate: formatLocalDateKey(refDate)
  });
  if (mb.album.length > 30) mb.album = mb.album.slice(-30);
  mb.letters = mb.letters.filter((l) => l.id !== letter.id);
  const newlyUnlocked = MAILBOX_STAMP_SPECS.filter((s) => isMailboxStampUnlocked(s) && !prevUnlocked.includes(s.id));
  mailboxRun.openLetterId = '';
  mailboxRun.replyId = '';
  mailboxRun.stampId = '';

  petAudio.playLetterSentChime(Math.max(0, MAILBOX_STAMP_SPECS.indexOf(stamp)));
  petAudio.haptic('pat');
  player.idleTime = 0;
  player.happyTimer = 2.6;
  if (best) player.cheerTimer = 2.2;
  spawnInteractVfx(player.x, player.y - 26, 'love', best ? 11 : 7);
  addCoins(coinReward, player.x + 26, player.y - 44, '回信礼 ');
  addAffectionXp(xpReward, best ? `心意相通 +${xpReward} 亲密` : `回信 +${xpReward} 亲密`);
  recordJournalActivity('letters', 1, refDate);
  const unlockTxt = newlyUnlocked.length ? ` 集邮册解锁了「${newlyUnlocked.map((s) => s.name).join('、')}」！` : '';
  setPlayerEmote(
    `${best ? view.bestReaction : `回信收到啦，${stamp.name}贴得端端正正，收进集邮册咯~`}${unlockTxt}`,
    3.2,
    best ? 'cheer' : 'happy',
    true
  );

  mailboxRun.lastResult = {
    letterId: letter.id,
    moodId: letter.moodId,
    replyId: reply.id,
    stampId: stamp.id,
    best,
    coinReward,
    xpReward,
    newlyUnlocked: newlyUnlocked.map((s) => s.id)
  };
  savePetState();
  syncMailboxUI(refDate);
  syncWeeklyJournalUI(refDate);
  if (gameMode === 'survivor') syncSurvivorSkillStrip();
  return { ok: true, ...mailboxRun.lastResult, bonus: getMailboxHeartfeltBonus(), audio: petAudio.getAr10AudioInfo() };
}

function setMailboxView(view) {
  const nextView = view === 'album' ? 'album' : 'inbox';
  // 已在信箱页且正读信时再点「信箱」页签：合上信纸回到信封列表
  if (nextView === 'inbox' && mailboxRun.view === 'inbox' && mailboxRun.openLetterId) {
    mailboxRun.openLetterId = '';
    mailboxRun.replyId = '';
    mailboxRun.stampId = '';
  }
  mailboxRun.view = nextView;
  playSfx('pat');
  syncMailboxUI();
  return mailboxRun.view;
}

function readMailboxAlbumEntry(idx) {
  const i = Math.round(Number(idx));
  if (!(i >= 0 && i < player.mailbox.album.length)) return { ok: false, reason: 'invalid_album_entry' };
  mailboxRun.view = 'album';
  mailboxRun.albumReadIdx = i;
  petAudio.playLetterOpen();
  syncMailboxUI();
  return { ok: true, idx: i };
}

let mailboxEnvelopeKey = '';
let mailboxReplyKey = '';

function syncMailboxUI(refDate = new Date()) {
  const mb = player.mailbox;
  if (!mb) return;
  const bonus = getMailboxHeartfeltBonus();
  const unlockedStamps = MAILBOX_STAMP_SPECS.filter(isMailboxStampUnlocked);
  const inbox = mb.letters;
  const cardOpen = isAr10CardOpen('mailbox');
  player.mailboxVisual = { unread: inbox.length };
  if (mailboxRun.openLetterId && !inbox.some((l) => l.id === mailboxRun.openLetterId)) {
    mailboxRun.openLetterId = '';
    mailboxRun.replyId = '';
    mailboxRun.stampId = '';
  }
  const openLetter = inbox.find((l) => l.id === mailboxRun.openLetterId) || null;
  const view = openLetter ? getLetterView(openLetter) : null;

  if (mailboxSummaryPillEl) {
    mailboxSummaryPillEl.textContent = `回信 ${mb.totalReplies || 0} · 邮票 ${unlockedStamps.length}/${MAILBOX_STAMP_SPECS.length}`;
  }
  if (mailboxInboxCountEl) mailboxInboxCountEl.textContent = String(inbox.length);
  if (mailboxAlbumCountEl) mailboxAlbumCountEl.textContent = String(mb.album.length);
  mailboxTabRowEl?.querySelectorAll('.mailbox-tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.mailView === mailboxRun.view);
  });
  mailboxInboxViewEl?.classList.toggle('hidden', mailboxRun.view !== 'inbox');
  mailboxCardEl?.classList.toggle('has-open-letter', Boolean(openLetter && mailboxRun.view === 'inbox'));
  mailboxAlbumViewEl?.classList.toggle('hidden', mailboxRun.view !== 'album');

  if (mailboxEnvelopeRowEl) {
    const envKey = inbox.map((l) => `${l.id}:${l.opened ? 1 : 0}`).join('|') + `#${mailboxRun.openLetterId}`;
    if (envKey !== mailboxEnvelopeKey) {
      mailboxEnvelopeKey = envKey;
      mailboxEnvelopeRowEl.innerHTML = inbox
        .map((l) => {
          const lv = getLetterView(l);
          return `<button type="button" class="mailbox-envelope${l.opened ? '' : ' is-new'}${l.id === mailboxRun.openLetterId ? ' is-open' : ''}" data-letter-id="${l.id}" title="${lv.title} · ${l.dateKey}">
              <img loading="lazy" src="./assets/letter_envelope.webp?v=hd60" alt="" class="mailbox-envelope-ico" />
              <span class="mailbox-envelope-date">${l.dateKey.slice(5).replace('-', '/')}</span>
              <em class="mailbox-envelope-mood">${l.opened ? lv.moodLabel : '未拆'}</em>
            </button>`;
        })
        .join('');
    }
  }

  if (mailboxNextHintEl) {
    mailboxNextHintEl.classList.toggle('hidden', Boolean(openLetter));
    const tier = MAILBOX_TIER_SPECS[getMailboxTier()];
    const rem = Math.max(0, (mb.nextLetterAt || 0) - refDate.getTime());
    const totalMins = Math.ceil(rem / 60000);
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    const eta = rem <= 0 ? '马上就到' : `约 ${hrs} 小时 ${mins} 分后`;
    mailboxNextHintEl.textContent =
      inbox.length >= MAILBOX_MAX_INBOX
        ? '信箱满啦，回完信她才会继续写下一封哦~'
        : inbox.length > 0
          ? `轻点信封拆开读读她的字迹 · 下一封${eta}投递`
          : `她正在书桌旁写下一封信，${eta}投递（${tier.name}·每 ${tier.intervalHours} 小时一封）`;
  }

  if (mailboxLetterEl) {
    mailboxLetterEl.classList.toggle('hidden', !openLetter);
    if (openLetter && view) {
      if (mailboxLetterTitleEl) mailboxLetterTitleEl.textContent = view.title;
      if (mailboxLetterMoodEl) mailboxLetterMoodEl.textContent = `${view.moodLabel} · ${view.tierName}`;
      if (mailboxLetterBodyEl) mailboxLetterBodyEl.textContent = view.body;
      if (mailboxLetterSignEl) mailboxLetterSignEl.textContent = view.sign;
      const stamp = MAILBOX_STAMP_SPECS.find((s) => s.id === mailboxRun.stampId);
      if (mailboxLetterStampEl) {
        mailboxLetterStampEl.classList.toggle('hidden', !stamp);
        if (stamp && mailboxLetterStampEl.getAttribute('src') !== stamp.img) mailboxLetterStampEl.src = stamp.img;
      }
    }
  }

  if (mailboxReplyGridEl) {
    mailboxReplyGridEl.classList.toggle('hidden', !openLetter);
    const replyKey = openLetter ? `${openLetter.id}|${mailboxRun.replyId}` : '';
    if (replyKey !== mailboxReplyKey) {
      mailboxReplyKey = replyKey;
      mailboxReplyGridEl.innerHTML = view
        ? view.replies
            .map(
              (r) =>
                `<button type="button" class="mailbox-reply-btn${r.id === mailboxRun.replyId ? ' is-picked' : ''}" data-reply-id="${r.id}">${r.text}</button>`
            )
            .join('')
        : '';
    }
  }

  if (mailboxStampRowEl) {
    mailboxStampRowEl.classList.toggle('hidden', !openLetter);
    mailboxStampRowEl.querySelectorAll('.mailbox-stamp-btn').forEach((btn) => {
      const st = MAILBOX_STAMP_SPECS.find((s) => s.id === btn.dataset.stampId);
      const unlocked = isMailboxStampUnlocked(st);
      btn.disabled = !unlocked;
      btn.classList.toggle('is-locked', !unlocked);
      btn.classList.toggle('is-picked', unlocked && st.id === mailboxRun.stampId);
      btn.title = unlocked
        ? `${st.name} · 已贴 ${mb.stamps[st.id] || 0} 次`
        : `${st.name} · 再寄出 ${Math.max(0, st.unlockReplies - (mb.totalReplies || 0))} 封回信解锁`;
    });
  }

  if (btnMailboxSendEl) {
    const ready = Boolean(openLetter && mailboxRun.replyId && mailboxRun.stampId);
    btnMailboxSendEl.disabled = !ready;
    btnMailboxSendEl.textContent = !openLetter
      ? inbox.length > 0
        ? '先拆开一封信'
        : '信箱空空，等她写信~'
      : !mailboxRun.replyId
        ? '选一句回信'
        : !mailboxRun.stampId
          ? '贴一枚邮票'
          : '寄出回信';
  }
  if (btnMailboxGoShiftEl) btnMailboxGoShiftEl.classList.toggle('hidden', !bonus.active);

  if (mailboxStampTallyEl) {
    mailboxStampTallyEl.innerHTML = MAILBOX_STAMP_SPECS.map((st) => {
      const unlocked = isMailboxStampUnlocked(st);
      return `<span class="mailbox-tally-chip${unlocked ? '' : ' is-locked'}" data-tally-stamp="${st.id}"><img loading="lazy" src="${st.img}" alt="" class="mailbox-tally-ico" />${st.name} <b>${mb.stamps[st.id] || 0}</b></span>`;
    }).join('');
  }
  if (mailboxAlbumGridEl) {
    const entries = mb.album.map((a, idx) => ({ a, idx })).reverse().slice(0, 12);
    mailboxAlbumGridEl.innerHTML = entries.length
      ? entries
          .map(({ a, idx }) => {
            const st = MAILBOX_STAMP_SPECS.find((s) => s.id === a.stampId) || MAILBOX_STAMP_SPECS[0];
            return `<button type="button" class="mailbox-album-slot${a.best ? ' is-best' : ''}${idx === mailboxRun.albumReadIdx ? ' current' : ''}" data-album-idx="${idx}" title="${getLetterView(a).title} · ${a.repliedDate}">
                <img loading="lazy" src="./assets/letter_envelope.webp?v=hd60" alt="" class="mailbox-album-ico" />
                <img loading="lazy" src="${st.img}" alt="" class="mailbox-album-stamp" />
                <span class="mailbox-album-date">${a.repliedDate.slice(5).replace('-', '/')}</span>
              </button>`;
          })
          .join('')
      : '<span class="mailbox-album-empty">还没有寄出的回信，集邮册在等第一枚邮票~</span>';
  }
  if (mailboxAlbumReadEl) {
    const entry = mb.album[mailboxRun.albumReadIdx];
    if (entry) {
      const ev = getLetterView(entry);
      const reply = ev.replies.find((r) => r.id === entry.replyId);
      const st = MAILBOX_STAMP_SPECS.find((s) => s.id === entry.stampId) || MAILBOX_STAMP_SPECS[0];
      mailboxAlbumReadEl.textContent = `「${ev.title}」${ev.body}  你的回信：「${reply ? reply.text : '（心意已寄出）'}」· 贴了${st.name}`;
    } else {
      mailboxAlbumReadEl.textContent = '点一封珍藏信笺，重温她的字迹与你的回信~';
    }
  }
  if (mailboxTotalBonusEl) {
    mailboxTotalBonusEl.textContent = bonus.active
      ? `信笺心意生效中：幸存者班次经验 +${(bonus.shiftXpBonusPct * 100).toFixed(1)}%（回信 ${bonus.replies} 封 · 邮票 ${bonus.stampKinds}/${bonus.totalStampKinds} 种）`
      : '信笺心意：每寄出 1 封回信，幸存者打工班次经验 +1.2%，每集到 1 种邮票再 +1%';
  }
  if (btnMailboxDockEl) {
    btnMailboxDockEl.classList.toggle('has-letter', inbox.length > 0);
    btnMailboxDockEl.classList.toggle('active', cardOpen);
  }
  if (mailboxUnreadBadgeEl) {
    mailboxUnreadBadgeEl.classList.toggle('hidden', inbox.length === 0);
    mailboxUnreadBadgeEl.textContent = String(inbox.length);
  }
  syncAtelierPill();
}

function syncAtelierPill() {
  if (!atelierPillEl) return;
  const ward = getWatercolorFocusWard();
  const bonus = getMailboxHeartfeltBonus();
  const show = Boolean(gameMode === 'pet' && (ward.active || bonus.active));
  atelierPillEl.classList.toggle('hidden', !show);
  atelierSegEaselEl?.classList.toggle('hidden', !ward.active);
  atelierSegMailEl?.classList.toggle('hidden', !bonus.active);
  if (atelierPillGalleryEl) atelierPillGalleryEl.textContent = String(ward.gallerySize);
  if (atelierPillMailEl) atelierPillMailEl.textContent = String(bonus.replies);
  atelierPillEl.title = `画意专注守护：画廊 ${ward.gallerySize}/${ward.total} · 信笺心意：回信 ${bonus.replies} 封`;
}

function openWatercolorCard() {
  if (!watercolorCardEl) return;
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
  dismissMailboxCard();
  dismissAr11Cards(); dismissAr12Cards(); dismissAr13Cards(); dismissAr14Cards(); dismissAr15Cards(); dismissAr16Cards(); dismissAr17Cards();
  dismissPolaroid();
  closeAlbumLightbox();
  watercolorCardEl.classList.remove('hidden');
  syncWatercolorUI();
}

function toggleWatercolorCard() {
  if (!watercolorCardEl) return;
  if (watercolorCardEl.classList.contains('hidden')) {
    openWatercolorCard();
    playSfx('paint_mix');
  } else {
    dismissWatercolorCard();
    syncWatercolorUI();
  }
}

function openMailboxCard(opts = {}) {
  if (!mailboxCardEl) return;
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
  dismissWatercolorCard();
  dismissAr11Cards(); dismissAr12Cards(); dismissAr13Cards(); dismissAr14Cards(); dismissAr15Cards(); dismissAr16Cards(); dismissAr17Cards();
  dismissPolaroid();
  closeAlbumLightbox();
  mailboxCardEl.classList.remove('hidden');
  checkMailboxLetters(new Date(), false);
  if (opts.autoOpen) {
    const firstNew = player.mailbox.letters.find((l) => !l.opened) || player.mailbox.letters[0];
    if (firstNew) openMailboxLetter(firstNew.id);
  }
  syncMailboxUI();
}

function toggleMailboxCard() {
  if (!mailboxCardEl) return;
  if (mailboxCardEl.classList.contains('hidden')) {
    openMailboxCard();
    playSfx('stamp_press');
  } else {
    dismissMailboxCard();
    syncMailboxUI();
  }
}

function handleAr10CanvasTap(pt) {
  const vis = player.watercolorWallVisual;
  if (vis && Array.isArray(vis.items) && vis.items.length > 0) {
    const layout = getWatercolorGalleryLayout(W, H, vis.items.length);
    if (
      pt.x >= layout.left - 6 &&
      pt.x <= layout.right + 6 &&
      pt.y >= layout.top - layout.s * 0.5 &&
      pt.y <= layout.bottom + 16
    ) {
      openWatercolorCard();
      playSfx('paint_mix');
      return true;
    }
  }
  if (player.mailboxVisual && player.mailboxVisual.unread > 0) {
    const anchor = getMailboxDeskAnchor(W, H);
    if (Math.hypot(pt.x - anchor.x, pt.y - (anchor.y - 30)) < 40) {
      openMailboxCard({ autoOpen: true });
      playSfx('stamp_press');
      return true;
    }
  }
  return false;
}

function updateAr10Companions(dt) {
  if (player.paintingCheerTimer > 0) {
    player.paintingCheerTimer = Math.max(0, player.paintingCheerTimer - dt);
  }
  const cardOpen = isAr10CardOpen('watercolor');
  player.isPainting = Boolean(
    (cardOpen && watercolorRun.active && watercolorRun.phase !== 'done') || player.paintingCheerTimer > 0
  );
  mailboxRun.checkTimer -= dt;
  if (mailboxRun.checkTimer <= 0) {
    mailboxRun.checkTimer = 5;
    const written = checkMailboxLetters(new Date());
    if (!written && isAr10CardOpen('mailbox')) syncMailboxUI();
  }
}
// [[split 30]]

// ================= AR-11 暖灯厨房一起做饭团便当 & 奶油手账回忆拼图时光 =================
const bentoCardEl = document.getElementById('bento-kitchen-card');
const btnBentoDockEl = document.getElementById('btn-bento-kitchen');
const bentoBagBadgeEl = document.getElementById('bento-bag-badge');
const bentoSummaryPillEl = document.getElementById('bento-summary-pill');
const bentoTrayEl = document.getElementById('bento-tray');
const bentoBoxEl = document.getElementById('bento-box');
const bentoBoxFinishedEl = document.getElementById('bento-box-finished');
const bentoBoxTagEl = document.getElementById('bento-box-tag');
const bentoStepHintEl = document.getElementById('bento-step-hint');
const bentoRecipeLineEl = document.getElementById('bento-recipe-line');
const bentoBagRowEl = document.getElementById('bento-bag-row');
const btnBentoMainEl = document.getElementById('btn-bento-main');
const btnBentoShareEl = document.getElementById('btn-bento-share');
const btnBentoGoShiftEl = document.getElementById('btn-bento-go-shift');
const bentoCodexSubEl = document.getElementById('bento-codex-sub');
const bentoCodexGridEl = document.getElementById('bento-codex-grid');
const bentoTotalWardEl = document.getElementById('bento-total-ward');

// 卡片底部规则条：面板里只留一行要点（窄屏不再被省略号截断），完整规则放进 title 悬停提示
function setRuleLine(el, short, full = '') {
  if (!el) return;
  el.textContent = short;
  el.title = full || short;
}

const puzzleCardEl = document.getElementById('memory-puzzle-card');
const btnPuzzleDockEl = document.getElementById('btn-memory-puzzle');
const puzzleSummaryPillEl = document.getElementById('puzzle-summary-pill');
const puzzleSourceRowEl = document.getElementById('puzzle-source-row');
const puzzleBoardEl = document.getElementById('puzzle-board');
const puzzleStepHintEl = document.getElementById('puzzle-step-hint');
const puzzleRefImgEl = document.getElementById('puzzle-ref-img');
const puzzleMovesEl = document.getElementById('puzzle-moves');
const puzzleProgressFillEl = document.getElementById('puzzle-progress-fill');
const btnPuzzleMainEl = document.getElementById('btn-puzzle-main');
const btnPuzzleGoShiftEl = document.getElementById('btn-puzzle-go-shift');
const puzzleWallSubEl = document.getElementById('puzzle-wall-sub');
const puzzleWallGridEl = document.getElementById('puzzle-wall-grid');
const puzzleTotalBonusEl = document.getElementById('puzzle-total-bonus');

const kmPillEl = document.getElementById('kitchen-memory-pill');
const kmSegBentoEl = document.getElementById('km-seg-bento');
const kmSegPuzzleEl = document.getElementById('km-seg-puzzle');
const kmPillBentoEl = document.getElementById('km-pill-bento');
const kmPillPuzzleEl = document.getElementById('km-pill-puzzle');

const BENTO_SLOT_IDS = ['rice', 'sideA', 'sideB'];
const BENTO_ONIGIRI_IMG = './assets/onigiri_trio.webp?v=hd60';
const BENTO_FINISHED_IMG = './assets/bento_box_finished.webp?v=hd31';
const PUZZLE_PIECE_IMG = './assets/puzzle_piece_memory.webp?v=hd60';

const bentoRun = {
  phase: 'assemble',
  hand: '',
  slots: { rice: '', sideA: '', sideB: '' },
  misplaces: 0,
  lastResult: null,
  lastAction: ''
};

function isAr11CardOpen(which = '') {
  const bk = document.getElementById('bento-kitchen-card');
  const mp = document.getElementById('memory-puzzle-card');
  const bkOpen = Boolean(bk && !bk.classList.contains('hidden'));
  const mpOpen = Boolean(mp && !mp.classList.contains('hidden'));
  if (which === 'bento') return bkOpen;
  if (which === 'puzzle') return mpOpen;
  return bkOpen || mpOpen;
}

function dismissBentoKitchenCard() {
  document.getElementById('bento-kitchen-card')?.classList.add('hidden');
  document.getElementById('btn-bento-kitchen')?.classList.remove('active');
}

function dismissMemoryPuzzleCard() {
  document.getElementById('memory-puzzle-card')?.classList.add('hidden');
  document.getElementById('btn-memory-puzzle')?.classList.remove('active');
}

function dismissAr11Cards() {
  dismissBentoKitchenCard();
  dismissMemoryPuzzleCard();
}

// ---------------- 暖灯厨房：选食材 -> 摆进便当格 -> 盖盖 -> 打包 / 一起吃 ----------------
function parseBentoTrayItem(item) {
  const [kind, id] = String(item || '').split(':');
  if (kind === 'filling' && BENTO_FILLING_BY_ID[id]) return { kind, id, spec: BENTO_FILLING_BY_ID[id] };
  if (kind === 'side' && BENTO_SIDE_BY_ID[id]) return { kind, id, spec: BENTO_SIDE_BY_ID[id] };
  return null;
}

function getBentoFilledCount() {
  return BENTO_SLOT_IDS.filter((k) => bentoRun.slots[k]).length;
}

function getBentoDraftRecipe() {
  const fillingId = bentoRun.slots.rice;
  const pairId = getBentoPairId(bentoRun.slots.sideA, bentoRun.slots.sideB);
  return fillingId && pairId ? BENTO_RECIPE_BY_ID[`${fillingId}__${pairId}`] || null : null;
}

function resetBentoAssembly() {
  bentoRun.phase = 'assemble';
  bentoRun.hand = '';
  bentoRun.slots = { rice: '', sideA: '', sideB: '' };
  bentoRun.misplaces = 0;
}

// 已盖盖但还没打包 / 吃掉的便当跨刷新保留，盒子里按配方摆回原样
function restorePendingBento() {
  const recipe = BENTO_RECIPE_BY_ID[player.bentoKitchen.pending];
  if (!recipe) {
    if (bentoRun.phase === 'done') resetBentoAssembly();
    return;
  }
  bentoRun.phase = 'done';
  bentoRun.hand = '';
  bentoRun.slots = { rice: recipe.fillingId, sideA: recipe.sideIds[0], sideB: recipe.sideIds[1] };
}

function pickBentoTray(item) {
  if (bentoRun.phase !== 'assemble') return { ok: false, reason: 'bento_done' };
  const parsed = parseBentoTrayItem(item);
  if (!parsed) return { ok: false, reason: 'invalid_item' };
  // 再点同一种食材仍保持拿在手里，方便接着按住拖进格子
  bentoRun.hand = `${parsed.kind}:${parsed.id}`;
  player.idleTime = 0;
  playSfx('pat');
  syncBentoKitchenUI();
  return { ok: true, hand: bentoRun.hand };
}

function placeBentoSlot(slotId) {
  if (bentoRun.phase !== 'assemble') return { ok: false, reason: 'bento_done' };
  if (!BENTO_SLOT_IDS.includes(slotId)) return { ok: false, reason: 'invalid_slot' };
  const parsed = parseBentoTrayItem(bentoRun.hand);
  if (!parsed) {
    // 空手点一下已摆好的格子：把食材拿回托盘重新挑
    if (bentoRun.slots[slotId]) {
      const removed = bentoRun.slots[slotId];
      bentoRun.slots[slotId] = '';
      playSfx('pat');
      syncBentoKitchenUI();
      return { ok: true, removed, slot: slotId, filled: getBentoFilledCount() };
    }
    return { ok: false, reason: 'empty_hand' };
  }
  const wantKind = slotId === 'rice' ? 'filling' : 'side';
  if (parsed.kind !== wantKind) {
    bentoRun.misplaces += 1;
    playSfx('star_miss');
    setPlayerEmote(
      wantKind === 'filling' ? '左边的大格子是饭团的位置哦，配菜放右边两格~' : '右边的小格子留给配菜，饭团放进左边大格子~',
      2.0,
      'happy',
      false
    );
    syncBentoKitchenUI();
    return { ok: false, reason: 'wrong_slot', misplaces: bentoRun.misplaces };
  }
  if (wantKind === 'side') {
    const otherSlot = slotId === 'sideA' ? 'sideB' : 'sideA';
    if (bentoRun.slots[otherSlot] === parsed.id) {
      bentoRun.misplaces += 1;
      playSfx('star_miss');
      setPlayerEmote(`另一格已经有${parsed.spec.name}啦，换一种配菜才丰盛~`, 2.0, 'happy', false);
      syncBentoKitchenUI();
      return { ok: false, reason: 'duplicate_side', misplaces: bentoRun.misplaces };
    }
  }
  bentoRun.slots[slotId] = parsed.id;
  bentoRun.hand = '';
  player.idleTime = 0;
  player.happyTimer = 1.0;
  playSfx('bento_place');
  const filled = getBentoFilledCount();
  setPlayerEmote(filled >= 3 ? '三格都摆满啦！盖上盖子，这份便当就完成了~' : parsed.spec.placeLine, 2.0, 'happy', false);
  syncBentoKitchenUI();
  return { ok: true, slot: slotId, item: parsed.id, filled };
}

function finishBento(refDate = new Date()) {
  if (bentoRun.phase !== 'assemble') return { ok: false, reason: 'not_assembling' };
  const recipe = getBentoDraftRecipe();
  if (!recipe) return { ok: false, reason: 'incomplete' };
  const bk = player.bentoKitchen;
  const prev = bk.discovered[recipe.id];
  const isNewRecipe = !prev;
  const misplaces = bentoRun.misplaces;
  const neat = misplaces === 0;
  bk.discovered[recipe.id] = {
    count: (prev?.count || 0) + 1,
    firstDate: prev?.firstDate || formatLocalDateKey(refDate)
  };
  bk.totalBentos = (bk.totalBentos || 0) + 1;
  bk.lastRecipeId = recipe.id;
  bk.pending = recipe.id;
  bentoRun.phase = 'done';
  bentoRun.hand = '';

  const coinReward = (isNewRecipe ? 26 : 10) + (neat ? 4 : 0);
  const xpReward = isNewRecipe ? 28 : 12;
  petAudio.playBentoLidChime(Math.max(0, BENTO_FILLINGS.findIndex((f) => f.id === recipe.fillingId)));
  petAudio.haptic('headpat');
  player.idleTime = 0;
  player.happyTimer = 2.6;
  player.cheerTimer = isNewRecipe ? 2.4 : 1.4;
  player.bentoCheerTimer = 4.5;
  spawnInteractVfx(player.x, player.y - 30, 'sparkle', isNewRecipe ? 12 : 8);
  addCoins(coinReward, player.x + 28, player.y - 46, isNewRecipe ? '新便当 ' : '便当 ');
  addAffectionXp(xpReward, isNewRecipe ? `解锁「${recipe.name}」` : `再做「${recipe.name}」`);
  recordJournalActivity('bentos', 1, refDate);
  const stats = getBentoKitchenStats();
  setPlayerEmote(
    isNewRecipe
      ? `盖上盖子！『${recipe.name}』收进便当图鉴 ${stats.discovered}/${stats.totalRecipes} 啦~`
      : `又做好一份『${recipe.name}』，打包带去打工还是现在一起吃？`,
    3.0,
    isNewRecipe ? 'cheer' : 'happy',
    true
  );
  bentoRun.lastResult = {
    recipeId: recipe.id,
    name: recipe.name,
    isNewRecipe,
    neat,
    misplaces,
    coinReward,
    xpReward
  };
  bentoRun.lastAction = 'finished';
  savePetState();
  syncBentoKitchenUI();
  syncWeeklyJournalUI(refDate);
  return { ok: true, ...bentoRun.lastResult, audio: petAudio.getAr11AudioInfo() };
}

function packBento() {
  const bk = player.bentoKitchen;
  const recipe = BENTO_RECIPE_BY_ID[bk.pending];
  if (bentoRun.phase !== 'done' || !recipe) return { ok: false, reason: 'nothing_to_pack' };
  if (bk.bag.length >= BENTO_BAG_MAX) {
    setPlayerEmote('便当袋已经装满三份啦，这份我们现在一起吃掉吧~', 2.2, 'happy', false);
    syncBentoKitchenUI();
    return { ok: false, reason: 'bag_full' };
  }
  bk.bag.push({ recipeId: recipe.id, packedDate: formatLocalDateKey() });
  bk.totalPacked = (bk.totalPacked || 0) + 1;
  bk.pending = '';
  resetBentoAssembly();
  bentoRun.lastAction = 'packed';
  player.idleTime = 0;
  player.happyTimer = 1.6;
  playSfx('bento_place');
  setPlayerEmote(
    `『${recipe.name}』用格子布包好放进便当袋啦（${bk.bag.length}/${BENTO_BAG_MAX}），下个打工班次带上它~`,
    2.8,
    'happy',
    true
  );
  savePetState();
  syncBentoKitchenUI();
  return { ok: true, recipeId: recipe.id, bagCount: bk.bag.length };
}

function shareBento(refDate = new Date()) {
  const bk = player.bentoKitchen;
  const recipe = BENTO_RECIPE_BY_ID[bk.pending];
  if (bentoRun.phase !== 'done' || !recipe) return { ok: false, reason: 'nothing_to_share' };
  bk.pending = '';
  bk.totalShared = (bk.totalShared || 0) + 1;
  resetBentoAssembly();
  bentoRun.lastAction = 'shared';
  player.hunger = Math.min(player.maxHunger, player.hunger + 32);
  player.hp = Math.min(player.maxHp, player.hp + 20);
  player.idleTime = 0;
  player.happyTimer = 2.2;
  playSfx('star');
  spawnInteractVfx(player.x, player.y - 26, 'love', 9);
  addAffectionXp(14, `一起吃「${recipe.name}」`);
  recordJournalActivity('feeds', 1, refDate);
  setPlayerEmote(`啊呜——『${recipe.name}』和你一起吃最香了，饱饱的~`, 2.6, 'eat', true);
  savePetState();
  syncBentoKitchenUI();
  return { ok: true, recipeId: recipe.id, hunger: player.hunger };
}

function handleBentoMainAction() {
  if (bentoRun.phase === 'done') return packBento();
  return finishBento();
}

// 进入幸存者班次时从便当袋取出最早打包的一份：本班次持续回血 + 低血饭团救急；同一班次内重开不再消耗
function openBentoLunchForShift(prevMode) {
  if (prevMode === 'survivor' && survivorRun.lunch) return survivorRun.lunch;
  survivorRun.lunch = null;
  const bk = player.bentoKitchen;
  while (bk.bag.length && !BENTO_RECIPE_BY_ID[bk.bag[0].recipeId]) bk.bag.shift();
  if (!bk.bag.length) return null;
  const item = bk.bag.shift();
  const recipe = BENTO_RECIPE_BY_ID[item.recipeId];
  survivorRun.lunch = {
    recipeId: recipe.id,
    name: recipe.name,
    regen: recipe.regen,
    rescuePct: recipe.rescuePct,
    rescueCharges: recipe.rescueCharges,
    rescuesLeft: recipe.rescueCharges,
    packedDate: item.packedDate
  };
  bk.totalLunches = (bk.totalLunches || 0) + 1;
  savePetState();
  return survivorRun.lunch;
}

function tryBentoRescueHeal() {
  const lunch = survivorRun.lunch;
  if (gameMode !== 'survivor' || !lunch || !(lunch.rescuesLeft > 0)) return false;
  if (player.hp >= player.maxHp * BENTO_RESCUE_THRESHOLD) return false;
  const heal = Math.round(player.maxHp * lunch.rescuePct);
  player.hp = Math.min(player.maxHp, player.hp + heal);
  lunch.rescuesLeft -= 1;
  player.bentoKitchen.totalRescues = (player.bentoKitchen.totalRescues || 0) + 1;
  floatingTexts.push({
    x: player.x,
    y: player.y - 54,
    vx: 0,
    vy: -44,
    text: `饭团救急 +${heal}`,
    color: '#f6a36b',
    scale: 1.15,
    life: 1.0
  });
  petAudio.playBentoRescueChime();
  spawnInteractVfx(player.x, player.y - 30, 'love', 6);
  syncSurvivorSkillStrip();
  savePetState();
  return true;
}

let bentoSlotKey = '';
let bentoCodexKey = '';
let bentoBagKey = '';

function renderBentoSlotInner(slotId, itemId) {
  if (!itemId) {
    return `<span class="bento-slot-label">${slotId === 'rice' ? '饭团格' : '配菜格'}</span>`;
  }
  if (slotId === 'rice') {
    const f = BENTO_FILLING_BY_ID[itemId];
    return `<img loading="lazy" src="${BENTO_ONIGIRI_IMG}" alt="" class="bento-slot-ico" /><span class="bento-slot-name"><i class="bento-dot" style="--bk:${f.color}"></i>${f.shortName}</span>`;
  }
  const sd = BENTO_SIDE_BY_ID[itemId];
  return `<i class="bento-slot-portion" style="--bk:${sd.color}"></i><span class="bento-slot-name">${sd.name}</span>`;
}

function syncBentoKitchenUI() {
  const bk = player.bentoKitchen;
  if (!bk) return;
  if (bentoRun.phase === 'done' && !BENTO_RECIPE_BY_ID[bk.pending]) resetBentoAssembly();
  const stats = getBentoKitchenStats();
  const cardOpen = isAr11CardOpen('bento');
  const phase = bentoRun.phase;
  const filled = getBentoFilledCount();
  const hand = parseBentoTrayItem(bentoRun.hand);
  const draft = phase === 'done' ? BENTO_RECIPE_BY_ID[bk.pending] : getBentoDraftRecipe();
  player.isCookingBento = Boolean((cardOpen && phase === 'assemble') || player.bentoCheerTimer > 0);
  player.bentoDeskVisual = { bagCount: stats.bagCount };

  if (bentoSummaryPillEl) bentoSummaryPillEl.textContent = `图鉴 ${stats.discovered}/${stats.totalRecipes} · 袋 ${stats.bagCount}/${stats.bagMax}`;

  bentoTrayEl?.querySelectorAll('.bento-tray-chip').forEach((chip) => {
    const parsed = parseBentoTrayItem(chip.dataset.trayItem);
    const key = parsed ? `${parsed.kind}:${parsed.id}` : '';
    chip.classList.toggle('is-hand', Boolean(key && key === bentoRun.hand));
    const used =
      parsed &&
      (parsed.kind === 'filling'
        ? bentoRun.slots.rice === parsed.id
        : bentoRun.slots.sideA === parsed.id || bentoRun.slots.sideB === parsed.id);
    chip.classList.toggle('is-used', Boolean(used));
    chip.disabled = phase !== 'assemble';
  });

  if (bentoBoxEl) {
    bentoBoxEl.dataset.phase = phase;
    const slotKey = `${phase}|${bentoRun.slots.rice}|${bentoRun.slots.sideA}|${bentoRun.slots.sideB}`;
    const slotEls = bentoBoxEl.querySelectorAll('.bento-slot');
    if (slotKey !== bentoSlotKey) {
      bentoSlotKey = slotKey;
      slotEls.forEach((el) => {
        const sid = el.dataset.bentoSlot;
        el.innerHTML = renderBentoSlotInner(sid, bentoRun.slots[sid]);
      });
    }
    slotEls.forEach((el) => {
      const sid = el.dataset.bentoSlot;
      el.classList.toggle('is-filled', Boolean(bentoRun.slots[sid]));
      el.classList.toggle(
        'is-target',
        Boolean(phase === 'assemble' && hand && (sid === 'rice' ? hand.kind === 'filling' : hand.kind === 'side'))
      );
      el.disabled = phase !== 'assemble';
    });
  }
  bentoBoxFinishedEl?.classList.toggle('hidden', phase !== 'done');
  if (bentoBoxTagEl) bentoBoxTagEl.textContent = phase === 'done' ? '已盖盖' : `摆盘 ${filled}/3`;

  if (bentoStepHintEl) {
    const res = bentoRun.lastResult;
    bentoStepHintEl.textContent =
      phase === 'done'
        ? stats.bagCount >= stats.bagMax
          ? '便当袋满啦（3/3），这份就和她一起吃掉吧~'
          : `${res && res.recipeId === bk.pending && res.isNewRecipe ? '新配方解锁！' : ''}打包进便当袋带去打工，或者现在一起吃掉~`
        : hand
          ? `手里拿着「${hand.kind === 'filling' ? `${hand.spec.shortName}饭团` : hand.spec.name}」，点${hand.kind === 'filling' ? '左边饭团格' : '右边配菜格'}放进去（也可以直接拖过去）`
          : filled >= 3
            ? draft
              ? '三格都满啦，点「盖上盖子」完成便当~'
              : '两格配菜要不一样哦~'
            : bentoRun.lastAction === 'packed'
              ? '已经打包好一份啦！再做一份，还是带便当去打工？'
              : bentoRun.lastAction === 'shared'
                ? '一起吃饱饱~ 再做一份便当吧！'
                : '点一种饭团馅料或配菜拿在手里，再点便当盒的格子摆进去~';
  }

  if (bentoRecipeLineEl) {
    bentoRecipeLineEl.innerHTML = draft
      ? `<strong>『${draft.name}』</strong><span>续航 +${draft.regen.toFixed(1)}/秒 · 救急 ${Math.round(draft.rescuePct * 100)}% ×${draft.rescueCharges}</span>`
      : '<strong>饭团 + 两种不同配菜</strong><span>= 1 款便当，共 9 款图鉴</span>';
  }

  if (bentoBagRowEl) {
    const bagKey = bk.bag.map((b) => b.recipeId).join(',');
    if (bagKey !== bentoBagKey || !bentoBagRowEl.childElementCount) {
      bentoBagKey = bagKey;
      let html = '<span class="bento-bag-label">便当袋</span>';
      for (let i = 0; i < BENTO_BAG_MAX; i++) {
        const item = bk.bag[i];
        const rc = item ? BENTO_RECIPE_BY_ID[item.recipeId] : null;
        html += rc
          ? `<span class="bento-bag-slot is-packed" title="${rc.name} · 续航 +${rc.regen.toFixed(1)}/秒"><img loading="lazy" src="${BENTO_FINISHED_IMG}" alt="" class="bento-bag-ico" /></span>`
          : '<span class="bento-bag-slot" title="空位"></span>';
      }
      bentoBagRowEl.innerHTML = html;
    }
  }

  if (btnBentoMainEl) {
    if (phase === 'done') {
      const bagFull = stats.bagCount >= stats.bagMax;
      btnBentoMainEl.disabled = bagFull;
      btnBentoMainEl.textContent = bagFull ? '便当袋已满' : '打包进便当袋';
      btnBentoMainEl.classList.add('is-pack');
      btnBentoMainEl.classList.remove('is-finish');
    } else {
      btnBentoMainEl.disabled = !draft;
      btnBentoMainEl.textContent = draft ? '盖上盖子 · 完成便当' : filled >= 3 ? '配菜要不一样' : `还差 ${3 - filled} 格`;
      btnBentoMainEl.classList.toggle('is-finish', Boolean(draft));
      btnBentoMainEl.classList.remove('is-pack');
    }
  }
  btnBentoShareEl?.classList.toggle('hidden', phase !== 'done');
  btnBentoGoShiftEl?.classList.toggle('hidden', stats.bagCount < 1);

  if (bentoCodexGridEl) {
    const counts = BENTO_RECIPES.map((r) => bk.discovered[r.id]?.count || 0);
    const codexKey = `${counts.join(',')}|${draft ? draft.id : ''}`;
    if (codexKey !== bentoCodexKey) {
      bentoCodexKey = codexKey;
      bentoCodexGridEl.innerHTML = BENTO_RECIPES.map((r) => {
        const rec = bk.discovered[r.id];
        const f = BENTO_FILLING_BY_ID[r.fillingId];
        return `<span class="bento-codex-slot${rec ? ' collected' : ''}${draft && draft.id === r.id ? ' current' : ''}" data-recipe-id="${r.id}" title="${rec ? `${r.name} · 做过 ${rec.count} 次 · 续航 +${r.regen.toFixed(1)}/秒 · 救急 ${Math.round(r.rescuePct * 100)}% ×${r.rescueCharges}` : `待解锁：${f.shortName}饭团 + ${r.sideIds.map((sid) => BENTO_SIDE_BY_ID[sid].name).join(' + ')}`}">
            <img loading="lazy" src="${rec ? BENTO_FINISHED_IMG : BENTO_ONIGIRI_IMG}" alt="" class="bento-codex-ico" />
            <em class="bento-codex-tag"><i class="bento-dot" style="--bk:${f.color}"></i>${r.sideIds.map((sid) => `<i class="bento-dot" style="--bk:${BENTO_SIDE_BY_ID[sid].color}"></i>`).join('')}${rec ? `×${rec.count}` : ''}</em>
          </span>`;
      }).join('');
    }
  }
  if (bentoCodexSubEl) {
    bentoCodexSubEl.textContent = `便当图鉴 ${stats.discovered}/${stats.totalRecipes} · 共做 ${bk.totalBentos || 0} 份 · 打包 ${bk.totalPacked || 0} · 同享 ${bk.totalShared || 0}`;
  }
  if (bentoTotalWardEl) {
    const next = stats.nextLunch;
    if (next) {
      setRuleLine(
        bentoTotalWardEl,
        `下个班次带『${next.name}』：回血 +${next.regen.toFixed(1)}/秒 · 低血救急 ${Math.round(next.rescuePct * 100)}% ×${next.rescueCharges}（袋 ${stats.bagCount}/${stats.bagMax}）`,
        `下个班次带『${next.name}』：体力回复 +${next.regen.toFixed(1)}/秒 · 低血饭团救急 ${Math.round(next.rescuePct * 100)}% ×${next.rescueCharges}（袋 ${stats.bagCount}/${stats.bagMax}）`
      );
    } else {
      setRuleLine(
        bentoTotalWardEl,
        '便当续航：打包后下个打工班次打开，每份护 1 班（回血 + 低血救急）',
        '便当续航：打包的便当在下一个幸存者班次打开，每份守护 1 个班次（持续回血 + 低血饭团救急）'
      );
    }
  }

  if (btnBentoDockEl) {
    btnBentoDockEl.classList.toggle('has-lunch', stats.bagCount > 0);
    btnBentoDockEl.classList.toggle('active', cardOpen);
  }
  if (bentoBagBadgeEl) {
    bentoBagBadgeEl.textContent = String(stats.bagCount);
    bentoBagBadgeEl.classList.toggle('hidden', stats.bagCount < 1);
  }
  syncKitchenMemoryPill();
}

// ---------------- 回忆拼图：从存档里的拍立得 / 水彩画 / 心情周报生成 3×3 小拼图，拼好挂上回忆墙 ----------------
const MEMORY_KIND_TAGS = { photo: '合影', paint: '水彩', week: '周报', art: '原画' };
const MEMORY_FALLBACK_ARTS = [
  {
    id: 'art:rainy_window',
    kind: 'art',
    label: '雨窗原画',
    spriteKey: 'watercolorRainyWindow',
    img: './assets/watercolor_rainy_window.webp?v=hd31',
    pad: 0
  },
  {
    id: 'art:bento',
    kind: 'art',
    label: '暖灯便当',
    spriteKey: 'bentoBoxFinished',
    img: './assets/bento_box_finished.webp?v=hd31',
    pad: 0.07
  }
];
const MEMORY_SOURCE_SIZE = 270;

const puzzleRun = {
  phase: 'idle',
  sourceId: '',
  sourceLabel: '',
  sourceKind: '',
  cacheKey: '',
  order: [],
  selectedSlot: -1,
  moves: 0,
  minSwaps: 0,
  preparing: false,
  lastResult: null
};

const memorySourceCache = new Map();
const memoryWallThumbCache = new Map();

function getSafePolaroidEntries() {
  try {
    return Array.isArray(polaroidAlbum)
      ? polaroidAlbum.filter(
          (p) => p && typeof p.dataUrl === 'string' && p.dataUrl.startsWith('data:image/') && /^[A-Za-z0-9_-]{1,52}$/.test(String(p.id || ''))
        )
      : [];
  } catch (e) {
    return [];
  }
}

// 回忆来源：最近 2 张拍立得 + 最近挂上墙的 2 幅水彩 + 本周心情周报（盖过章才有），不足 3 段时补上手账原画
function getMemoryPuzzleSources(refDate = new Date()) {
  const list = [];
  const photos = getSafePolaroidEntries()
    .slice()
    .sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0))
    .slice(0, 2);
  const photoDate = (ph) => (typeof ph.dateStr === 'string' && ph.dateStr.length >= 10 ? ph.dateStr.slice(5, 10).replace('.', '/') : '');
  const photoTime = (ph) => (typeof ph.dateStr === 'string' && /\d{2}:\d{2}$/.test(ph.dateStr) ? ph.dateStr.slice(-5) : '');
  for (const ph of photos) {
    const dateTxt = photoDate(ph);
    // 同一天拍的两张合影改用时刻区分
    const sameDay = dateTxt && photos.some((o) => o !== ph && photoDate(o) === dateTxt);
    const tag = sameDay && photoTime(ph) ? photoTime(ph) : dateTxt;
    list.push({
      id: `photo:${ph.id}`,
      kind: 'photo',
      label: tag ? `合影 ${tag}` : '拍立得合影',
      cacheKey: `photo:${ph.id}`,
      dataUrl: ph.dataUrl
    });
  }
  // 同一分钟连拍的两张合影再补一个序号，来源标签不重名
  const photoLabels = list.filter((x) => x.kind === 'photo');
  if (photoLabels.length === 2 && photoLabels[0].label === photoLabels[1].label) photoLabels[1].label += '·2';
  const wc = player.watercolor || {};
  const paintIds = [...(wc.hung || [])].reverse().filter((k) => wc.paintings && wc.paintings[k]).slice(0, 2);
  for (const cid of paintIds) {
    const [sid, pid] = cid.split('__');
    const sSpec = WATERCOLOR_SUBJECT_BY_ID[sid];
    const pSpec = WATERCOLOR_PALETTE_BY_ID[pid];
    if (!sSpec || !pSpec) continue;
    list.push({
      id: `paint:${cid}`,
      kind: 'paint',
      label: `${pSpec.shortName}·${sSpec.shortName}`,
      cacheKey: `paint:${cid}`,
      subjectId: sid,
      paletteId: pid
    });
  }
  const summary = computeWeeklyJournalSummary(refDate);
  if (summary.stamps7d >= 1) {
    const days = summary.daysList.map((d) => (d.stamped ? d.moodId : ''));
    list.push({
      id: `week:${summary.weekKey}`,
      kind: 'week',
      label: `周报 ${summary.weekKey.slice(5)}`,
      cacheKey: `week:${summary.weekKey}|${days.join(',')}`,
      days
    });
  }
  for (const art of MEMORY_FALLBACK_ARTS) {
    if (list.length >= 3) break;
    list.push({ ...art, cacheKey: art.id });
  }
  return list;
}

function getSelectedMemorySource(sources) {
  const mp = player.memoryPuzzle;
  return sources.find((s) => s.id === mp.selectedSourceId) || sources[0] || null;
}

function loadImageAsync(src) {
  return new Promise((resolve) => {
    const im = new Image();
    im.onload = () => resolve(im.naturalWidth > 0 ? im : null);
    im.onerror = () => resolve(null);
    im.src = src;
  });
}

function getReadyAssetImage(spriteKey, src) {
  const im = spriteKey ? images[spriteKey] : null;
  if (isReady(im)) return Promise.resolve(im);
  return loadImageAsync(src);
}

// 把回忆合成为 270×270 方形底图（只贴已有的位图：相片 / 水彩贴图 / 周报贴图 / 手账原画）
async function renderMemorySourceCanvas(src) {
  const size = MEMORY_SOURCE_SIZE;
  const cv = document.createElement('canvas');
  cv.width = size;
  cv.height = size;
  const c = cv.getContext('2d');
  if (!c) return null;
  const bg = c.createLinearGradient(0, 0, 0, size);
  bg.addColorStop(0, '#fffdf8');
  bg.addColorStop(1, '#fbeedd');
  c.fillStyle = bg;
  c.fillRect(0, 0, size, size);
  if (src.kind === 'photo') {
    const im = await loadImageAsync(src.dataUrl);
    if (!im) return null;
    const side = Math.min(im.naturalWidth, im.naturalHeight);
    c.drawImage(im, (im.naturalWidth - side) / 2, (im.naturalHeight - side) / 2, side, side, 0, 0, size, size);
  } else if (src.kind === 'paint') {
    const sSpec = WATERCOLOR_SUBJECT_BY_ID[src.subjectId];
    const pSpec = WATERCOLOR_PALETTE_BY_ID[src.paletteId];
    const base = await getReadyAssetImage('watercolorRainyWindow', './assets/watercolor_rainy_window.webp?v=hd31');
    if (!base || !sSpec || !pSpec) return null;
    const subj = sSpec.spriteKey ? await getReadyAssetImage(sSpec.spriteKey, sSpec.img) : null;
    if ('filter' in c) c.filter = pSpec.filter;
    c.drawImage(base, 0, 0, size, size);
    const box = getWatercolorOverlayBox(sSpec);
    if (subj && box) c.drawImage(subj, box.left * size, box.top * size, box.size * size, box.size * size);
    if ('filter' in c) c.filter = 'none';
  } else if (src.kind === 'week') {
    const journal = await getReadyAssetImage('uiBtnWeeklyJournal', './assets/ui_btn_weekly_journal.webp?v=hd31');
    if (journal) c.drawImage(journal, size * 0.17, size * 0.04, size * 0.66, size * 0.66);
    const cell = size / 7;
    for (let i = 0; i < 7; i++) {
      const moodId = src.days && src.days[i];
      const spec = moodId ? JOURNAL_MOODS[moodId] : null;
      if (!spec) continue;
      const stampImg = await loadImageAsync(spec.img);
      if (stampImg) c.drawImage(stampImg, i * cell + cell * 0.08, size * 0.76, cell * 0.84, cell * 0.84);
    }
    c.font = '900 19px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
    c.textAlign = 'center';
    c.fillStyle = '#8a5a3c';
    c.fillText(`七日心情周报 ${src.label.replace('周报 ', '')}`, size * 0.5, size * 0.73);
  } else if (src.kind === 'art') {
    const im = await getReadyAssetImage(src.spriteKey, src.img);
    if (!im) return null;
    const pad = (src.pad || 0) * size;
    c.drawImage(im, pad, pad, size - pad * 2, size - pad * 2);
  } else {
    return null;
  }
  return cv;
}

function makeMemoryThumbUrl(cv, px = 72) {
  const t = document.createElement('canvas');
  t.width = px;
  t.height = px;
  const tc = t.getContext('2d');
  if (!tc) return '';
  tc.drawImage(cv, 0, 0, px, px);
  const url = t.toDataURL('image/jpeg', 0.82);
  return typeof url === 'string' && url.startsWith('data:image/jpeg;base64,') ? url : '';
}

function prepareMemorySource(src) {
  if (!src) return Promise.resolve(null);
  const cached = memorySourceCache.get(src.cacheKey);
  if (cached) return cached.promise;
  const entry = { canvas: null, thumbUrl: '', ready: false, promise: null };
  entry.promise = renderMemorySourceCanvas(src)
    .catch(() => null)
    .then((cv) => {
      entry.canvas = cv;
      entry.ready = Boolean(cv);
      try {
        entry.thumbUrl = cv ? makeMemoryThumbUrl(cv, 96) : '';
      } catch (e) {
        entry.thumbUrl = '';
      }
      // 图没下到：过 4 秒丢掉这次的失败结果重来（原来一次失败就一直停在「剪裁回忆中」）
      if (!cv) setTimeout(() => {
        memorySourceCache.delete(src.cacheKey);
        if (isAr11CardOpen('puzzle')) syncMemoryPuzzleUI();
      }, 4000);
      if (isAr11CardOpen('puzzle')) syncMemoryPuzzleUI();
      return cv;
    })
    .catch(() => null);
  memorySourceCache.set(src.cacheKey, entry);
  return entry.promise;
}

function makePuzzleShuffle() {
  const n = MEMORY_PUZZLE_PIECES;
  for (let attempt = 0; attempt < 60; attempt++) {
    const order = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    if (order.filter((p, i) => p !== i).length >= 5) return order;
  }
  return [1, 2, 0, 4, 5, 3, 7, 8, 6];
}

function countPuzzleMinSwaps(order) {
  const seen = new Array(order.length).fill(false);
  let cycles = 0;
  for (let i = 0; i < order.length; i++) {
    if (seen[i]) continue;
    cycles += 1;
    let j = i;
    while (!seen[j]) {
      seen[j] = true;
      j = order[j];
    }
  }
  return order.length - cycles;
}

function resetMemoryPuzzleRun() {
  puzzleRun.phase = 'idle';
  puzzleRun.order = [];
  puzzleRun.selectedSlot = -1;
  puzzleRun.moves = 0;
  puzzleRun.minSwaps = 0;
}

function selectMemorySource(sourceId) {
  const sources = getMemoryPuzzleSources();
  const src = sources.find((s) => s.id === sourceId);
  if (!src) return { ok: false, reason: 'invalid_source' };
  const changed = player.memoryPuzzle.selectedSourceId !== src.id;
  player.memoryPuzzle.selectedSourceId = src.id;
  if (puzzleRun.phase === 'done' || (puzzleRun.phase === 'play' && changed)) {
    if (puzzleRun.phase === 'play') setPlayerEmote('换一段回忆来拼吧，刚才那幅先收进手账~', 1.8, 'happy', false);
    resetMemoryPuzzleRun();
  }
  prepareMemorySource(src);
  playSfx('pat');
  savePetState();
  syncMemoryPuzzleUI();
  return { ok: true, sourceId: src.id };
}

async function startMemoryPuzzle(sourceId = '') {
  const sources = getMemoryPuzzleSources();
  const src = sourceId ? sources.find((s) => s.id === sourceId) : getSelectedMemorySource(sources);
  if (!src) return { ok: false, reason: 'no_source' };
  if (puzzleRun.preparing) return { ok: false, reason: 'preparing' };
  if (gameMode !== 'pet') switchMode('pet');
  player.memoryPuzzle.selectedSourceId = src.id;
  puzzleRun.preparing = true;
  syncMemoryPuzzleUI();
  const cv = await prepareMemorySource(src);
  puzzleRun.preparing = false;
  if (!cv) {
    syncMemoryPuzzleUI();
    return { ok: false, reason: 'source_failed' };
  }
  puzzleRun.phase = 'play';
  puzzleRun.sourceId = src.id;
  puzzleRun.sourceLabel = src.label;
  puzzleRun.sourceKind = src.kind;
  puzzleRun.cacheKey = src.cacheKey;
  puzzleRun.order = makePuzzleShuffle();
  puzzleRun.selectedSlot = -1;
  puzzleRun.moves = 0;
  puzzleRun.minSwaps = countPuzzleMinSwaps(puzzleRun.order);
  puzzleRun.lastResult = null;
  player.idleTime = 0;
  player.happyTimer = 1.2;
  playSfx('puzzle_pick');
  setPlayerEmote(`把『${src.label}』剪成 9 块小拼图啦，点两块（或拖过去）就能交换位置~`, 2.6, 'happy', false);
  savePetState();
  syncMemoryPuzzleUI();
  return { ok: true, sourceId: src.id, order: puzzleRun.order.slice(), minSwaps: puzzleRun.minSwaps };
}

function tapPuzzleSlot(slotIdx) {
  if (puzzleRun.phase !== 'play') return { ok: false, reason: 'not_playing' };
  const idx = Math.round(Number(slotIdx));
  if (!(idx >= 0 && idx < MEMORY_PUZZLE_PIECES)) return { ok: false, reason: 'invalid_slot' };
  if (puzzleRun.selectedSlot < 0) {
    puzzleRun.selectedSlot = idx;
    playSfx('puzzle_pick');
    syncMemoryPuzzleUI();
    return { ok: true, selected: idx };
  }
  if (puzzleRun.selectedSlot === idx) {
    puzzleRun.selectedSlot = -1;
    syncMemoryPuzzleUI();
    return { ok: true, selected: -1 };
  }
  return swapPuzzleSlots(puzzleRun.selectedSlot, idx);
}

function swapPuzzleSlots(a, b, refDate = new Date()) {
  if (puzzleRun.phase !== 'play') return { ok: false, reason: 'not_playing' };
  const ia = Math.round(Number(a));
  const ib = Math.round(Number(b));
  const n = MEMORY_PUZZLE_PIECES;
  if (!(ia >= 0 && ia < n && ib >= 0 && ib < n) || ia === ib) return { ok: false, reason: 'invalid_swap' };
  const order = puzzleRun.order;
  [order[ia], order[ib]] = [order[ib], order[ia]];
  puzzleRun.moves += 1;
  puzzleRun.selectedSlot = -1;
  player.memoryPuzzle.totalSwaps = (player.memoryPuzzle.totalSwaps || 0) + 1;
  player.idleTime = 0;
  const landed = [ia, ib].filter((i) => order[i] === i).length;
  petAudio.playPuzzleSnap(landed, puzzleRun.moves);
  if (order.every((p, i) => p === i)) return completeMemoryPuzzle(refDate);
  syncMemoryPuzzleUI();
  return {
    ok: true,
    swapped: [ia, ib],
    moves: puzzleRun.moves,
    correct: order.filter((p, i) => p === i).length
  };
}

function completeMemoryPuzzle(refDate = new Date()) {
  const mp = player.memoryPuzzle;
  const id = puzzleRun.sourceId;
  const label = puzzleRun.sourceLabel || '回忆';
  const moves = puzzleRun.moves;
  const perfect = moves <= puzzleRun.minSwaps;
  const prev = mp.completed[id];
  const isNewMemory = !prev;
  const dateKey = formatLocalDateKey(refDate);
  if (prev) delete mp.completed[id];
  mp.completed[id] = {
    count: (prev?.count || 0) + 1,
    bestMoves: prev && prev.bestMoves > 0 ? Math.min(prev.bestMoves, moves) : moves,
    firstDate: prev?.firstDate || dateKey,
    label
  };
  const completedKeys = Object.keys(mp.completed);
  const wallIds = new Set((mp.wall || []).map((w) => w.sourceId).concat(id));
  if (completedKeys.length > 80) {
    for (const k of completedKeys.slice(0, completedKeys.length - 80)) {
      if (!wallIds.has(k)) delete mp.completed[k];
    }
  }
  const cacheEntry = memorySourceCache.get(puzzleRun.cacheKey);
  let thumb = '';
  try {
    thumb = cacheEntry && cacheEntry.canvas ? makeMemoryThumbUrl(cacheEntry.canvas, 72) : '';
  } catch (e) {
    thumb = '';
  }
  mp.wall = (mp.wall || []).filter((w) => w.sourceId !== id);
  mp.wall.push({ sourceId: id, label, thumb, date: dateKey, moves });
  if (mp.wall.length > MEMORY_WALL_MAX) mp.wall = mp.wall.slice(-MEMORY_WALL_MAX);
  mp.totalPuzzles = (mp.totalPuzzles || 0) + 1;
  if (perfect) mp.perfectPuzzles = (mp.perfectPuzzles || 0) + 1;
  mp.lastSourceId = id;
  puzzleRun.phase = 'done';
  puzzleRun.selectedSlot = -1;

  const coinReward = (isNewMemory ? 22 : 9) + (perfect ? 6 : 0);
  const xpReward = isNewMemory ? 26 : 10;
  petAudio.playPuzzleCompleteChime(Math.max(0, ['photo', 'paint', 'week', 'art'].indexOf(puzzleRun.sourceKind)));
  petAudio.haptic('headpat');
  player.idleTime = 0;
  player.happyTimer = 2.6;
  player.cheerTimer = isNewMemory ? 2.4 : 1.4;
  spawnInteractVfx(player.x, player.y - 30, 'love', isNewMemory ? 12 : 8);
  addCoins(coinReward, player.x + 28, player.y - 46, isNewMemory ? '新回忆 ' : '拼图 ');
  addAffectionXp(xpReward, isNewMemory ? `拼好「${label}」` : `再拼「${label}」`);
  recordJournalActivity('puzzles', 1, refDate);
  const bonus = getMemoryPuzzleBonus();
  setPlayerEmote(
    isNewMemory
      ? `『${label}』拼好啦！挂上回忆墙，不同回忆 ${bonus.distinct}/${bonus.total} 段~`
      : `又拼了一遍『${label}』，${perfect ? '一次到位好厉害' : '每次看都好怀念'}~`,
    3.0,
    isNewMemory ? 'cheer' : 'happy',
    true
  );
  puzzleRun.lastResult = { sourceId: id, label, isNewMemory, perfect, moves, minSwaps: puzzleRun.minSwaps, coinReward, xpReward };
  savePetState();
  syncMemoryPuzzleUI();
  syncWeeklyJournalUI(refDate);
  if (gameMode === 'survivor') syncSurvivorSkillStrip();
  return { ok: true, completed: true, ...puzzleRun.lastResult, bonus, audio: petAudio.getAr11AudioInfo() };
}

function handlePuzzleMainAction() {
  if (puzzleRun.phase === 'done') {
    resetMemoryPuzzleRun();
    syncMemoryPuzzleUI();
    return { ok: true, phase: 'idle' };
  }
  return startMemoryPuzzle(puzzleRun.phase === 'play' ? puzzleRun.sourceId : '');
}

function getWallThumbImage(w) {
  if (!w) return null;
  const key = `${w.sourceId}|${w.thumb ? w.thumb.length : 0}`;
  if (memoryWallThumbCache.has(key)) return memoryWallThumbCache.get(key);
  let img = null;
  if (w.thumb) {
    img = new Image();
    img.src = w.thumb;
  } else {
    const art = MEMORY_FALLBACK_ARTS.find((a) => a.id === w.sourceId);
    img = art && images[art.spriteKey] ? images[art.spriteKey] : images.puzzlePieceMemory || null;
  }
  memoryWallThumbCache.set(key, img);
  return img;
}

function getWallThumbSrc(w) {
  if (w.thumb) return w.thumb;
  const art = MEMORY_FALLBACK_ARTS.find((a) => a.id === w.sourceId);
  return art ? art.img : PUZZLE_PIECE_IMG;
}

let puzzleSourceKey = '';
let puzzleBoardKey = '';
let puzzleOrderKey = '';
let puzzleWallKey = '';

function drawPuzzlePieceCanvas(canvasEl, srcCanvas, pieceIdx) {
  if (!canvasEl || !srcCanvas) return;
  const c = canvasEl.getContext('2d');
  if (!c) return;
  const g = MEMORY_PUZZLE_GRID;
  const cell = MEMORY_SOURCE_SIZE / g;
  const col = pieceIdx % g;
  const row = Math.floor(pieceIdx / g);
  c.clearRect(0, 0, canvasEl.width, canvasEl.height);
  c.drawImage(srcCanvas, col * cell, row * cell, cell, cell, 0, 0, canvasEl.width, canvasEl.height);
}

function syncMemoryPuzzleUI() {
  const mp = player.memoryPuzzle;
  if (!mp) return;
  const bonus = getMemoryPuzzleBonus();
  const cardOpen = isAr11CardOpen('puzzle');
  const wallItems = (mp.wall || []).slice(-3);
  player.memoryWallVisual = {
    count: bonus.wallCount,
    total: MEMORY_WALL_MAX,
    items: wallItems.map((w) => ({ sourceId: w.sourceId, img: getWallThumbImage(w), isLatest: w.sourceId === mp.lastSourceId }))
  };
  if (puzzleSummaryPillEl) puzzleSummaryPillEl.textContent = `回忆墙 ${bonus.wallCount}/${bonus.total}`;
  if (btnPuzzleDockEl) {
    btnPuzzleDockEl.classList.toggle('has-memory', bonus.active);
    btnPuzzleDockEl.classList.toggle('active', cardOpen);
  }
  syncKitchenMemoryPill();
  if (!cardOpen) return;

  const sources = getMemoryPuzzleSources();
  const selected = getSelectedMemorySource(sources);
  if (selected && mp.selectedSourceId !== selected.id) mp.selectedSourceId = selected.id;
  const activeId = puzzleRun.phase === 'idle' ? (selected ? selected.id : '') : puzzleRun.sourceId;
  const activeSrc = sources.find((s) => s.id === activeId) || null;
  const activeCacheKey = puzzleRun.phase === 'idle' ? (activeSrc ? activeSrc.cacheKey : '') : puzzleRun.cacheKey;
  const activeEntry = memorySourceCache.get(activeCacheKey);
  for (const s of sources) {
    if (!memorySourceCache.has(s.cacheKey)) prepareMemorySource(s);
  }
  puzzleCardEl?.classList.toggle('is-playing', puzzleRun.phase === 'play');

  if (puzzleSourceRowEl) {
    const sKey = sources
      .map((s) => {
        const e = memorySourceCache.get(s.cacheKey);
        return `${s.id}:${e && e.ready ? 1 : 0}:${mp.completed[s.id]?.count || 0}`;
      })
      .join(',');
    const fullKey = `${sKey}|${activeId}`;
    if (fullKey !== puzzleSourceKey) {
      puzzleSourceKey = fullKey;
      puzzleSourceRowEl.innerHTML = sources
        .map((s) => {
          const e = memorySourceCache.get(s.cacheKey);
          const rec = mp.completed[s.id];
          const thumbSrc = e && e.thumbUrl ? e.thumbUrl : s.kind === 'art' ? s.img : PUZZLE_PIECE_IMG;
          return `<button type="button" class="puzzle-source-chip${s.id === activeId ? ' active' : ''}${rec ? ' is-done' : ''}" data-source-id="${s.id}" data-source-kind="${s.kind}" title="${s.label}${rec ? ` · 已拼 ${rec.count} 次` : ''}">
              <img loading="lazy" src="${thumbSrc}" alt="" class="puzzle-source-thumb" />
              <span class="puzzle-source-name">${s.label}</span>
              <em class="puzzle-source-tag">${rec ? `×${rec.count}` : MEMORY_KIND_TAGS[s.kind] || '回忆'}</em>
            </button>`;
        })
        .join('');
    }
  }

  if (puzzleBoardEl) {
    const ready = Boolean(activeEntry && activeEntry.ready && activeEntry.canvas);
    puzzleBoardEl.dataset.phase = puzzleRun.phase;
    const boardKey = `${activeCacheKey}|${ready ? 1 : 0}`;
    if (boardKey !== puzzleBoardKey) {
      puzzleBoardKey = boardKey;
      puzzleOrderKey = '';
      if (ready) {
        let html = '';
        for (let i = 0; i < MEMORY_PUZZLE_PIECES; i++) {
          html += `<button type="button" class="mp-piece" data-slot="${i}" aria-label="第 ${i + 1} 格拼图"><canvas class="mp-piece-canvas" width="90" height="90"></canvas></button>`;
        }
        puzzleBoardEl.innerHTML = html;
      } else {
        puzzleBoardEl.innerHTML = `<img loading="lazy" src="${PUZZLE_PIECE_IMG}" alt="" class="puzzle-board-wait" /><span class="puzzle-board-wait-tag">剪裁回忆中…</span>`;
      }
    }
    if (ready) {
      const order = puzzleRun.phase === 'play' ? puzzleRun.order : Array.from({ length: MEMORY_PUZZLE_PIECES }, (_, i) => i);
      const orderKey = `${puzzleRun.phase}|${order.join(',')}`;
      const pieceEls = puzzleBoardEl.querySelectorAll('.mp-piece');
      if (orderKey !== puzzleOrderKey) {
        puzzleOrderKey = orderKey;
        pieceEls.forEach((el) => {
          const slot = Number(el.dataset.slot);
          el.dataset.piece = String(order[slot]);
          drawPuzzlePieceCanvas(el.querySelector('canvas'), activeEntry.canvas, order[slot]);
        });
      }
      pieceEls.forEach((el) => {
        const slot = Number(el.dataset.slot);
        el.classList.toggle('is-selected', puzzleRun.phase === 'play' && slot === puzzleRun.selectedSlot);
        el.classList.toggle('is-correct', puzzleRun.phase === 'play' && order[slot] === slot);
        el.disabled = puzzleRun.phase !== 'play';
      });
    }
  }

  const correct = puzzleRun.phase === 'play' ? puzzleRun.order.filter((p, i) => p === i).length : puzzleRun.phase === 'done' ? MEMORY_PUZZLE_PIECES : 0;
  if (puzzleRefImgEl) {
    const refSrc = activeEntry && activeEntry.thumbUrl ? activeEntry.thumbUrl : activeSrc && activeSrc.kind === 'art' ? activeSrc.img : PUZZLE_PIECE_IMG;
    if (puzzleRefImgEl.getAttribute('src') !== refSrc) puzzleRefImgEl.setAttribute('src', refSrc);
  }
  if (puzzleMovesEl) {
    puzzleMovesEl.textContent =
      puzzleRun.phase === 'play'
        ? `步数 ${puzzleRun.moves} · 归位 ${correct}/${MEMORY_PUZZLE_PIECES}`
        : puzzleRun.phase === 'done' && puzzleRun.lastResult
          ? `${puzzleRun.lastResult.moves} 步拼好${puzzleRun.lastResult.perfect ? ' · 一次到位' : ''}`
          : activeSrc && mp.completed[activeSrc.id]
            ? `已拼 ${mp.completed[activeSrc.id].count} 次 · 最佳 ${mp.completed[activeSrc.id].bestMoves} 步`
            : '3×3 · 9 块';
  }
  if (puzzleProgressFillEl) puzzleProgressFillEl.style.width = `${Math.round((correct / MEMORY_PUZZLE_PIECES) * 100)}%`;
  if (puzzleStepHintEl) {
    const res = puzzleRun.lastResult;
    puzzleStepHintEl.textContent = puzzleRun.preparing
      ? '正在把这段回忆剪成 9 块小拼图…'
      : puzzleRun.phase === 'play'
        ? puzzleRun.selectedSlot >= 0
          ? '再点另一块（或直接拖过去）交换位置~'
          : '点一块拼图，再点另一块交换；拖过去也可以~'
        : puzzleRun.phase === 'done' && res
          ? `『${res.label}』挂上回忆墙啦${res.isNewMemory ? ' · 新回忆' : ''}，+${res.coinReward}金~`
          : activeSrc
            ? `选好『${activeSrc.label}』，点「打乱开拼」把它剪成 9 块~`
            : '还没有回忆可拼，先去拍张合影吧~';
  }
  if (btnPuzzleMainEl) {
    btnPuzzleMainEl.disabled = Boolean(puzzleRun.preparing || (!activeSrc && puzzleRun.phase === 'idle'));
    btnPuzzleMainEl.textContent = puzzleRun.preparing
      ? '剪裁中…'
      : puzzleRun.phase === 'play'
        ? '重新打乱'
        : puzzleRun.phase === 'done'
          ? '再拼一幅'
          : '打乱开拼';
    btnPuzzleMainEl.classList.toggle('is-replay', puzzleRun.phase === 'play');
  }
  btnPuzzleGoShiftEl?.classList.toggle('hidden', !bonus.active);

  if (puzzleWallGridEl) {
    const wall = mp.wall || [];
    const wKey = `${wall.map((w) => `${w.sourceId}:${w.thumb ? w.thumb.length : 0}`).join(',')}|${mp.lastSourceId}`;
    if (wKey !== puzzleWallKey) {
      puzzleWallKey = wKey;
      let html = '';
      for (let i = 0; i < MEMORY_WALL_MAX; i++) {
        const w = wall[i];
        html += w
          ? `<button type="button" class="puzzle-wall-slot is-hung${w.sourceId === mp.lastSourceId ? ' is-latest' : ''}" data-wall-source="${w.sourceId}" title="${w.label} · ${w.date} · ${w.moves} 步">
              <img loading="lazy" src="${getWallThumbSrc(w)}" alt="" class="puzzle-wall-thumb" />
              <em class="puzzle-wall-tag">${w.label}</em>
            </button>`
          : '<span class="puzzle-wall-slot" aria-hidden="true"></span>';
      }
      puzzleWallGridEl.innerHTML = html;
    }
  }
  if (puzzleWallSubEl) {
    puzzleWallSubEl.textContent = `回忆墙 · 挂出 ${bonus.wallCount}/${bonus.total} · 共拼 ${mp.totalPuzzles || 0} 幅 · 一次到位 ${mp.perfectPuzzles || 0}`;
  }
  if (puzzleTotalBonusEl) {
    puzzleTotalBonusEl.textContent = bonus.active
      ? `回忆拾光生效中：幸存者打工金币 +${Math.round(bonus.coinLuckPct * 100)}%（不同回忆 ${bonus.distinct}/${bonus.total}）`
      : '回忆拾光：每拼好 1 段不同回忆，幸存者打工金币 +2%（集满 6 段再 +3%）';
  }
}
// [[split 31]]
function fitKitchenMemoryPill() {
  const fitted = fitKitchenMemoryPillOnly();
  // AR-12 合并胶囊排在其后：AR-11 胶囊显隐变化后立刻复核 AR-12 胶囊是否还放得下
  fitSillCardPill();
  return fitted;
}

function fitKitchenMemoryPillOnly() {
  if (!kmPillEl) return false;
  kmPillEl.classList.remove('km-no-room');
  if (kmPillEl.classList.contains('hidden') || kmPillEl.offsetParent === null) return false;
  // 桌面宽屏胶囊离摇杆很远，允许自然换行；只有窄屏（844×390 / 旋转舞台）才严格不新开行
  if (!kmCompactQuery || !kmCompactQuery.matches) return true;
  const row = kmPillEl.parentElement;
  const others = row
    ? Array.from(row.children).filter(
        (b) =>
          b !== kmPillEl &&
          b.id !== 'sill-card-pill' &&
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
  if (mid(kmPillEl) > lastRowMid + 6) {
    kmPillEl.classList.add('km-no-room');
    return false;
  }
  return true;
}

function syncKitchenMemoryPill() {
  if (!kmPillEl) return;
  const stats = getBentoKitchenStats();
  const bonus = getMemoryPuzzleBonus();
  const showBento = stats.bagCount > 0;
  const showPuzzle = bonus.active;
  kmPillEl.classList.toggle('hidden', !(gameMode === 'pet' && (showBento || showPuzzle)));
  kmSegBentoEl?.classList.toggle('hidden', !showBento);
  kmSegPuzzleEl?.classList.toggle('hidden', !showPuzzle);
  if (kmPillBentoEl) kmPillBentoEl.textContent = String(stats.bagCount);
  if (kmPillPuzzleEl) kmPillPuzzleEl.textContent = String(bonus.wallCount);
  kmPillEl.title = `便当袋 ${stats.bagCount}/${stats.bagMax}（下个班次续航回血） · 回忆墙 ${bonus.wallCount}/${bonus.total}（打工金币 +${Math.round(bonus.coinLuckPct * 100)}%）`;
  fitKitchenMemoryPill();
}

function openAr11Card(cardEl) {
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
  dismissAr11Cards(); dismissAr12Cards(); dismissAr13Cards(); dismissAr14Cards(); dismissAr15Cards(); dismissAr16Cards(); dismissAr17Cards();
  dismissPolaroid();
  closeAlbumLightbox();
  cardEl.classList.remove('hidden');
}

function openBentoKitchenCard() {
  if (!bentoCardEl) return;
  openAr11Card(bentoCardEl);
  syncBentoKitchenUI();
}

function openMemoryPuzzleCard() {
  if (!puzzleCardEl) return;
  openAr11Card(puzzleCardEl);
  syncMemoryPuzzleUI();
}

function toggleBentoKitchenCard() {
  if (!bentoCardEl) return;
  if (bentoCardEl.classList.contains('hidden')) {
    openBentoKitchenCard();
    playSfx('bento_place');
  } else {
    dismissBentoKitchenCard();
    syncBentoKitchenUI();
  }
}

function toggleMemoryPuzzleCard() {
  if (!puzzleCardEl) return;
  if (puzzleCardEl.classList.contains('hidden')) {
    openMemoryPuzzleCard();
    playSfx('puzzle_pick');
  } else {
    dismissMemoryPuzzleCard();
    syncMemoryPuzzleUI();
  }
}

function handleAr11CanvasTap(pt) {
  const wallVis = player.memoryWallVisual;
  if (wallVis && wallVis.count > 0) {
    const L = getMemoryWallLayout(W, H);
    if (pt.x >= L.x - 6 && pt.x <= L.x + L.s + 6 && pt.y >= L.y - 6 && pt.y <= L.y + L.s + 16) {
      openMemoryPuzzleCard();
      playSfx('puzzle_pick');
      return true;
    }
  }
  if (player.bentoDeskVisual && player.bentoDeskVisual.bagCount > 0) {
    const a = getBentoDeskAnchor(W, H);
    if (Math.hypot(pt.x - a.x, pt.y - (a.y - 20)) < 36) {
      openBentoKitchenCard();
      playSfx('bento_place');
      return true;
    }
  }
  return false;
}

let kmPillFitTimer = 0;
function updateAr11Companions(dt) {
  if (player.bentoCheerTimer > 0) {
    player.bentoCheerTimer = Math.max(0, player.bentoCheerTimer - dt);
  }
  // 其它胶囊（番茄钟 / 下午茶等）随时出现或收起，定期复核 AR-11 胶囊是否还放得下
  kmPillFitTimer -= dt;
  if (kmPillFitTimer <= 0) {
    kmPillFitTimer = 0.5;
    fitKitchenMemoryPill();
  }
  player.isCookingBento = Boolean(
    (isAr11CardOpen('bento') && bentoRun.phase === 'assemble') || player.bentoCheerTimer > 0
  );
}
// [[split end]]
export {
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
  WATERCOLOR_WASH_SPOTS,
  WATERCOLOR_STROKES_NEEDED,
  watercolorRun,
  isAr10CardOpen,
  dismissWatercolorCard,
  dismissMailboxCard,
  dismissAr10Cards,
  applyShiftXpGain,
  applyWatercolorSelection,
  selectWatercolorSubject,
  selectWatercolorPalette,
  startWatercolorSession,
  tapWatercolorWell,
  tapWatercolorWash,
  finishWatercolorPainting,
  handleWatercolorMainAction,
  syncWatercolorUI,
  MAILBOX_TIER_SPECS,
  LETTER_MOOD_SPECS,
  mailboxRun,
  getMailboxTier,
  getMailboxIntervalMs,
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
  setRuleLine,
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
  finishBento,
  packBento,
  shareBento,
  handleBentoMainAction,
  openBentoLunchForShift,
  tryBentoRescueHeal,
  syncBentoKitchenUI,
  MEMORY_FALLBACK_ARTS,
  puzzleRun,
  getMemoryPuzzleSources,
  prepareMemorySource,
  selectMemorySource,
  startMemoryPuzzle,
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
};
