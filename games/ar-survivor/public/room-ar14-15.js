// room-ar14-15.js — AR-14～AR-15：陶艺、香氛、星空投影、听雨
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
  addCoins,
  setPlayerEmote,
  addAffectionXp,
  dismissPolaroid,
  closeDrawer,
  switchMode,
  goodnightRun,
  amDropEls,
  potteryRun,
  aromaRun,
  closeAlbumLightbox
} from './game.js?v=hd60';
import {
  petAudio
} from './audio.js?v=hd31';
import {
  getAr15CornerLayout,
  getAromaTableDeskAnchor,
  getPotteryShelfLayout
} from './sprites.js?v=hd60';
import {
  ar14Clock,
  POTTERY_SHAPES,
  POTTERY_SHAPE_BY_ID,
  POTTERY_GLAZES,
  POTTERY_GLAZE_BY_ID,
  POTTERY_RULES,
  getPotteryComboCount,
  getPotteryWardValues,
  describePotteryWard,
  describePotteryWardShort,
  getPotteryStats,
  AROMA_SEASONS,
  AROMA_MOODS,
  AROMA_MOOD_BY_ID,
  AROMA_RULES,
  getAromaSeasonId,
  getAromaRecipe,
  getActiveAroma,
  getAromaStats,
  ar15Clock,
  STAR_CARDS,
  STAR_CARD_BY_ID,
  STAR_SEASON_NAMES,
  STAR_RULES,
  isStarBedtime,
  getStarSeasonCards,
  getActiveProjection,
  getStarStats,
  RAIN_WEATHERS,
  RAIN_WEATHER_BY_ID,
  RAIN_VOLUMES,
  RAIN_VOLUME_BY_ID,
  RAIN_RULES,
  getRainSegment,
  getRainWeather,
  rainRun,
  starRun,
  getRainStats
} from './data-room.js?v=hd60';
import {
  survivorRun,
  syncSurvivorSkillStrip
} from './mode-survivor.js?v=hd60';
import {
  dismissWindowAmbienceCard,
  foldOrHidePomodoroCard,
  recordJournalActivity,
  dismissWeeklyJournalCard,
  dismissTeatimeCard,
  dismissTerrariumCard,
  startGoodnightSession,
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
  dismissAr16Cards,
  fitStitchHearthPill,
  dismissAr17Cards
} from './room-ar16-17.js?v=hd60';
import {
  dismissTopicCard
} from './pet-chat.js?v=hd60';

// [[split 41]]

// ================= AR-14 窗畔手作陶艺转盘 & 她的小小香氛调配台 =================
// 船坞已满 25 键：两张卡不加新键，入口 = 「家具与装扮」抽屉快捷卡 + 场景点击（窗畔陶艺架 / 书桌香薰机）+ 合并胶囊
const potteryCardEl = document.getElementById('pottery-wheel-card');
const pwSummaryPillEl = document.getElementById('pw-summary-pill');
const pwStepRowEl = document.getElementById('pw-step-row');
const pwStepHintEl = document.getElementById('pw-step-hint');
const pwWheelEl = document.getElementById('pw-wheel');
const pwClayEl = document.getElementById('pw-clay');
const pwWheelTagEl = document.getElementById('pw-wheel-tag');
const pwShapeRowEl = document.getElementById('pw-shape-row');
const pwGlazeRowEl = document.getElementById('pw-glaze-row');
const btnPotteryHelperEl = document.getElementById('btn-pottery-helper');
const btnPotteryMainEl = document.getElementById('btn-pottery-main');
const btnPotteryGoShiftEl = document.getElementById('btn-pottery-go-shift');
const pwShelfSubEl = document.getElementById('pw-shelf-sub');
const pwShelfGridEl = document.getElementById('pw-shelf-grid');
const pwWardLineEl = document.getElementById('pw-ward-line');

const aromaCardEl = document.getElementById('aroma-table-card');
const amSummaryPillEl = document.getElementById('am-summary-pill');
const amSeasonRowEl = document.getElementById('am-season-row');
const amSeasonIcoEl = document.getElementById('am-season-ico');
const amSeasonNameEl = document.getElementById('am-season-name');
const amSeasonSubEl = document.getElementById('am-season-sub');
const amBottleStageEl = document.getElementById('am-bottle-stage');
// [[split 42]]
const amStageTagEl = document.getElementById('am-stage-tag');
const amMoodRowEl = document.getElementById('am-mood-row');
const amRecipeLineEl = document.getElementById('am-recipe-line');
const btnAromaHelperEl = document.getElementById('btn-aroma-helper');
const btnAromaMainEl = document.getElementById('btn-aroma-main');
const btnAromaStopEl = document.getElementById('btn-aroma-stop');
const amCodexSubEl = document.getElementById('am-codex-sub');
const amCodexGridEl = document.getElementById('am-codex-grid');
const amFooterLineEl = document.getElementById('am-footer-line');
const aromaOverlayEl = document.getElementById('aroma-ambient-overlay');

const paPillEl = document.getElementById('pottery-aroma-pill');
const paSegPotteryEl = document.getElementById('pa-seg-pottery');
const paSegAromaEl = document.getElementById('pa-seg-aroma');
const paPillPotteryEl = document.getElementById('pa-pill-pottery');
const paPillAromaEl = document.getElementById('pa-pill-aroma');

const POTTERY_SPIN_LINES = ['陶土在转盘上转起来啦，手要沾点水~', '慢慢往上提……它长高了！', '再收一收口，快成形了~', '最后抹平一圈，好光滑~'];
// [[split 43]]

function isAr14CardOpen(which = '') {
  const pw = document.getElementById('pottery-wheel-card');
  const am = document.getElementById('aroma-table-card');
  const pwOpen = Boolean(pw && !pw.classList.contains('hidden'));
  const amOpen = Boolean(am && !am.classList.contains('hidden'));
  if (which === 'pottery') return pwOpen;
  if (which === 'aroma') return amOpen;
  return pwOpen || amOpen;
}

function dismissPotteryWheelCard() {
  document.getElementById('pottery-wheel-card')?.classList.add('hidden');
}

function dismissAromaTableCard() {
  document.getElementById('aroma-table-card')?.classList.add('hidden');
}

// 只碰 DOM：其它卡片在模块初始化期间调用也不会触发 TDZ
function dismissAr14Cards() {
  dismissPotteryWheelCard();
  dismissAromaTableCard();
}

// ---------------- 窗畔手作陶艺转盘：拉坯 → 上釉 → 烧成，出窑的小陶器摆上窗畔陶艺架 ----------------
function resetPotteryDraft() {
  potteryRun.phase = 'shape';
  potteryRun.taps = 0;
  potteryRun.glazed = false;
  potteryRun.fireLeft = 0;
}

function pickPotteryShape(shapeId) {
  if (potteryRun.phase === 'firing') return { ok: false, reason: 'firing' };
  const spec = POTTERY_SHAPE_BY_ID[shapeId];
  if (!spec) return { ok: false, reason: 'invalid_shape' };
  if (potteryRun.shapeId === shapeId && potteryRun.phase === 'shape') {
    syncPotteryWheelUI();
    return { ok: true, shapeId, same: true };
  }
  // 换器型 = 重新揉一团陶土，从头拉坯
  potteryRun.shapeId = shapeId;
  resetPotteryDraft();
  potteryRun.lastAction = 'shape_pick';
  player.potteryWheel.lastShapeId = shapeId;
  player.idleTime = 0;
  playSfx('pat');
  setPlayerEmote(spec.pickLine, 1.8, 'happy', false);
  syncPotteryWheelUI();
  return { ok: true, shapeId };
}

function spinPotteryWheel() {
  if (potteryRun.phase === 'done') resetPotteryDraft();
  if (potteryRun.phase !== 'shape') return { ok: false, reason: potteryRun.phase };
  const spec = POTTERY_SHAPE_BY_ID[potteryRun.shapeId] || POTTERY_SHAPES[0];
  const need = spec.taps;
  potteryRun.taps = Math.min(need, potteryRun.taps + 1);
  potteryRun.spinFlash = 0.6;
  potteryRun.lastAction = 'spin';
  player.idleTime = 0;
  player.happyTimer = 0.8;
  petAudio.playPotteryWheel(potteryRun.taps);
  petAudio.haptic('tap');
  if (potteryRun.taps >= need) {
    potteryRun.phase = 'glaze';
    setPlayerEmote(`${spec.short}的坯拉好啦！挑一种釉色给它穿上新衣服吧~`, 2.0, 'happy', false);
  } else {
    setPlayerEmote(POTTERY_SPIN_LINES[(potteryRun.taps - 1) % POTTERY_SPIN_LINES.length], 1.6, 'happy', false);
  }
  syncPotteryWheelUI();
  return { ok: true, taps: potteryRun.taps, need, phase: potteryRun.phase, audio: petAudio.getAr14AudioInfo() };
}

function glazePottery() {
  if (potteryRun.phase !== 'glaze' && potteryRun.phase !== 'kiln') return { ok: false, reason: potteryRun.phase };
  const g = POTTERY_GLAZE_BY_ID[potteryRun.glazeId] || POTTERY_GLAZES[0];
  potteryRun.glazeId = g.id;
  potteryRun.glazed = true;
  potteryRun.phase = 'kiln';
  potteryRun.lastAction = 'glazed';
  player.potteryWheel.lastGlazeId = g.id;
  player.idleTime = 0;
  player.happyTimer = 1;
  petAudio.playPotteryGlaze(POTTERY_GLAZES.indexOf(g));
  setPlayerEmote(`${g.line}（${g.wardName}：${describePotteryWard(g.id, potteryRun.shapeId)}）`, 2.2, 'happy', false);
  syncPotteryWheelUI();
  return { ok: true, glazeId: g.id, glazed: true, phase: 'kiln', audio: petAudio.getAr14AudioInfo() };
}

function pickPotteryGlaze(glazeId) {
  if (potteryRun.phase === 'firing') return { ok: false, reason: 'firing' };
  const g = POTTERY_GLAZE_BY_ID[glazeId];
  if (!g) return { ok: false, reason: 'invalid_glaze' };
  potteryRun.glazeId = glazeId;
  player.potteryWheel.lastGlazeId = glazeId;
  potteryRun.lastAction = 'glaze_pick';
  // 坯已拉好时：点釉色就直接给坯刷上这层釉（再点别的釉色可以换）
  if (potteryRun.phase === 'glaze' || potteryRun.phase === 'kiln') return glazePottery();
  playSfx('pat');
  setPlayerEmote(`先选好${g.name}，坯拉好就给它上釉~（${g.wardName}：${describePotteryWard(glazeId, potteryRun.shapeId)}）`, 2.0, 'happy', false);
  syncPotteryWheelUI();
  return { ok: true, glazeId, glazed: false };
}

function firePottery() {
  if (potteryRun.phase === 'firing') return { ok: false, reason: 'firing' };
  if (potteryRun.phase !== 'kiln' || !potteryRun.glazed) return { ok: false, reason: 'not_glazed' };
  potteryRun.phase = 'firing';
  potteryRun.fireLeft = POTTERY_RULES.fireSec;
  potteryRun.lastAction = 'firing';
  player.idleTime = 0;
  petAudio.playPotteryKiln();
  petAudio.haptic('tap');
  setPlayerEmote('送进小窑里烧一烧……要耐心等它变得结结实实~', 2.0, 'happy', false);
  syncPotteryWheelUI();
  return { ok: true, phase: 'firing', fireSec: POTTERY_RULES.fireSec, audio: petAudio.getAr14AudioInfo() };
}

function finishPottery(nowMs = ar14Clock.now()) {
  if (potteryRun.phase !== 'firing') return null;
  const pw = player.potteryWheel;
  const shape = POTTERY_SHAPE_BY_ID[potteryRun.shapeId] || POTTERY_SHAPES[0];
  const glaze = POTTERY_GLAZE_BY_ID[potteryRun.glazeId] || POTTERY_GLAZES[0];
  const d = new Date(nowMs);
  const todayKey = formatLocalDateKey(d);
  const comboKey = `${shape.id}_${glaze.id}`;
  const isNewCombo = !(pw.combos[comboKey] > 0);
  pw.combos[comboKey] = (pw.combos[comboKey] || 0) + 1;
  pw.seq = (pw.seq || 0) + 1;
  const piece = { id: `k${pw.seq}`, shapeId: shape.id, glazeId: glaze.id, date: todayKey };
  pw.pieces.push(piece);
  if (pw.pieces.length > POTTERY_RULES.logMax) pw.pieces = pw.pieces.slice(-POTTERY_RULES.logMax);
  pw.totalPieces = (pw.totalPieces || 0) + 1;
  pw.wardGlazeId = glaze.id;
  pw.wardShapeId = shape.id;
  pw.wardCharges = Math.min(POTTERY_RULES.wardMaxCharges, (pw.wardCharges || 0) + shape.charges);
  pw.lastShapeId = shape.id;
  pw.lastGlazeId = glaze.id;
  if (pw.rewardDate !== todayKey) {
    pw.rewardDate = todayKey;
    pw.rewardCount = 0;
  }
  let reward = null;
  if (pw.rewardCount < POTTERY_RULES.dailyRewards) {
    pw.rewardCount += 1;
    reward = {
      coins: POTTERY_RULES.coinReward + (isNewCombo ? POTTERY_RULES.newComboCoins : 0),
      xp: POTTERY_RULES.xpReward
    };
  }
  potteryRun.phase = 'done';
  potteryRun.fireLeft = 0;
  potteryRun.glazed = false;
  potteryRun.lastAction = 'finished';
  player.happyTimer = 2.4;
  player.cheerTimer = 2;
  player.potteryCheerTimer = 4;
  petAudio.playPotteryDone(POTTERY_SHAPES.indexOf(shape));
  petAudio.haptic('headpat');
  spawnInteractVfx(player.x, player.y - 30, 'love', 10);
  if (reward) {
    addCoins(reward.coins, player.x + 26, player.y - 46, '陶艺 ');
    addAffectionXp(reward.xp, '窗畔陶艺出窑');
  }
  recordJournalActivity('potteries', 1, d);
  const combos = getPotteryComboCount();
  setPlayerEmote(
    `${shape.doneLine}摆上陶艺架啦！接下来 ${pw.wardCharges} 个打工班次有『${glaze.wardName}』佑护~`,
    3.0,
    'cheer',
    true
  );
  potteryRun.lastResult = {
    id: piece.id,
    shapeId: shape.id,
    glazeId: glaze.id,
    date: todayKey,
    isNewCombo,
    reward,
    combos,
    wardCharges: pw.wardCharges,
    ward: getPotteryWardValues(glaze.id, shape.id, combos)
  };
  savePetState();
  syncPotteryWheelUI();
  syncDiaryBookUI();
  if (gameMode === 'survivor') syncSurvivorSkillStrip();
  return { ...potteryRun.lastResult, audio: petAudio.getAr14AudioInfo() };
}

function getPotteryMainState() {
  const sh = POTTERY_SHAPE_BY_ID[potteryRun.shapeId] || POTTERY_SHAPES[0];
  const g = POTTERY_GLAZE_BY_ID[potteryRun.glazeId] || POTTERY_GLAZES[0];
  if (potteryRun.phase === 'shape') return { mode: 'spin', disabled: false, label: `转盘拉坯 ${potteryRun.taps}/${sh.taps}` };
  if (potteryRun.phase === 'glaze') return { mode: 'glaze', disabled: false, label: `上釉 · ${g.name}` };
  if (potteryRun.phase === 'kiln') return { mode: 'fire', disabled: false, label: '入窑烧制' };
  if (potteryRun.phase === 'firing') return { mode: 'firing', disabled: true, label: '小窑烧制中…' };
  return { mode: 'again', disabled: false, label: '再做一件' };
}

function handlePotteryMainAction() {
  const st = getPotteryMainState();
  if (st.disabled) return { ok: false, reason: st.mode };
  if (st.mode === 'spin') return spinPotteryWheel();
  if (st.mode === 'glaze') return glazePottery();
  if (st.mode === 'fire') return firePottery();
  resetPotteryDraft();
  potteryRun.lastAction = 'again';
  playSfx('pat');
  setPlayerEmote('再揉一团陶土，这次做什么好呢~', 1.6, 'happy', false);
  syncPotteryWheelUI();
  return { ok: true, phase: 'shape' };
}

// 她来帮忙：替主人做完当前这一步（一口气拉好坯 / 按季节挑釉上釉 / 送进小窑）
function potteryHelper() {
  if (potteryRun.phase === 'firing') return { ok: false, reason: 'firing' };
  potteryRun.helperSeq += 1;
  if (potteryRun.phase === 'done') resetPotteryDraft();
  if (potteryRun.phase === 'shape') {
    const need = (POTTERY_SHAPE_BY_ID[potteryRun.shapeId] || POTTERY_SHAPES[0]).taps;
    let guard = 0;
    while (potteryRun.phase === 'shape' && potteryRun.taps < need && guard < 8) {
      spinPotteryWheel();
      guard += 1;
    }
    setPlayerEmote('我来！双手扶稳陶土，转盘呼呼转~ 坯拉好啦！', 2.0, 'happy', false);
    return { ok: true, step: 'shape', phase: potteryRun.phase, taps: potteryRun.taps };
  }
  if (potteryRun.phase === 'glaze') {
    // 第一次按季节挑釉（春樱粉 / 夏青瓷 / 秋冬奶白），之后每次轮换
    potteryRun.glazeHelperSeq += 1;
    const m = ar14Clock.date().getMonth() + 1;
    const seasonGlaze = m >= 3 && m <= 5 ? 'sakura' : m >= 6 && m <= 8 ? 'celadon' : 'cream';
    const order = [seasonGlaze, ...POTTERY_GLAZES.map((g) => g.id).filter((id) => id !== seasonGlaze)];
    potteryRun.glazeId = order[(potteryRun.glazeHelperSeq - 1) % order.length];
    return { ...glazePottery(), step: 'glaze' };
  }
  if (potteryRun.phase === 'kiln') return { ...firePottery(), step: 'fire' };
  return { ok: false, reason: potteryRun.phase };
}

// 进入幸存者班次时消耗 1 次陶艺佑护：按最新出窑陶器的釉色生效（减伤 / 金币 / 宝石磁吸），同一班次内重开不再消耗
function openPotteryWardForShift(prevMode) {
  if (prevMode === 'survivor' && survivorRun.pottery) return survivorRun.pottery;
  survivorRun.pottery = null;
  const pw = player.potteryWheel;
  if (!pw || !(pw.wardCharges > 0) || !POTTERY_GLAZE_BY_ID[pw.wardGlazeId] || !POTTERY_SHAPE_BY_ID[pw.wardShapeId]) return null;
  const combos = getPotteryComboCount();
  const v = getPotteryWardValues(pw.wardGlazeId, pw.wardShapeId, combos);
  pw.wardCharges -= 1;
  pw.totalWardShifts = (pw.totalWardShifts || 0) + 1;
  survivorRun.pottery = {
    glazeId: pw.wardGlazeId,
    shapeId: pw.wardShapeId,
    combos,
    guardPct: v.guardPct,
    coinPct: v.coinPct,
    magnetPct: v.magnetPct
  };
  savePetState();
  return survivorRun.pottery;
}

let pwShapeRowKey = null;
let pwGlazeRowKey = null;
let pwShelfKey = null;

function syncPotteryWheelUI() {
  const pw = player.potteryWheel;
  if (!pw) return;
  const stats = getPotteryStats();
  const cardOpen = isAr14CardOpen('pottery');
  const phase = potteryRun.phase;
  const shape = POTTERY_SHAPE_BY_ID[potteryRun.shapeId] || POTTERY_SHAPES[0];
  const glaze = POTTERY_GLAZE_BY_ID[potteryRun.glazeId] || POTTERY_GLAZES[0];
  const done = phase === 'done' && potteryRun.lastResult ? potteryRun.lastResult : null;
  const shownShape = done ? POTTERY_SHAPE_BY_ID[done.shapeId] : shape;
  const shownGlaze = done ? POTTERY_GLAZE_BY_ID[done.glazeId] : glaze;
  const glazedLook = phase === 'kiln' || phase === 'firing' || phase === 'done';
  const progress = phase === 'shape' ? potteryRun.taps / shape.taps : 1;

  if (pwSummaryPillEl) pwSummaryPillEl.textContent = `陶艺架 ${stats.shelfCount} 件 · 图鉴 ${stats.combos}/${stats.totalCombos}`;
  if (pwStepRowEl) {
    pwStepRowEl.dataset.phase = phase;
    const doneSteps = {
      shape: phase !== 'shape',
      glaze: glazedLook,
      fire: phase === 'done'
    };
    const activeStep = phase === 'shape' ? 'shape' : phase === 'glaze' ? 'glaze' : phase === 'done' ? '' : 'fire';
    pwStepRowEl.querySelectorAll('.pw-step').forEach((el) => {
      const k = el.dataset.step;
      el.classList.toggle('is-done', Boolean(doneSteps[k]));
      el.classList.toggle('is-active', k === activeStep);
    });
  }
  if (pwStepHintEl) {
    pwStepHintEl.textContent =
      phase === 'shape'
        ? `${shape.short}拉坯 ${potteryRun.taps}/${shape.taps} · 点转盘转一圈`
        : phase === 'glaze'
          ? '坯拉好啦 · 点一种釉色上釉'
          : phase === 'kiln'
            ? `已上${glaze.name} · 送进小窑烧成`
            : phase === 'firing'
              ? '小窑烧制中 · 稍等一下下'
              : `出窑啦 · ${shownGlaze.name}${shownShape.short}上架`;
  }
  if (pwWheelEl) {
    pwWheelEl.dataset.phase = phase;
    pwWheelEl.dataset.glaze = glazedLook ? shownGlaze.id : '';
    pwWheelEl.style.setProperty('--glaze', glazedLook ? shownGlaze.color : '#f3e6d2');
    pwWheelEl.style.setProperty('--clay-scale', String(Number((0.42 + 0.58 * progress).toFixed(3))));
    pwWheelEl.classList.toggle('is-spinning', potteryRun.spinFlash > 0 || phase === 'firing');
  }
  if (pwClayEl && pwClayEl.getAttribute('src') !== shownShape.img) pwClayEl.setAttribute('src', shownShape.img);
  if (pwWheelTagEl) {
    pwWheelTagEl.textContent =
      phase === 'shape'
        ? `拉坯 ${potteryRun.taps}/${shape.taps}`
        : phase === 'glaze'
          ? '待上釉'
          : phase === 'kiln'
            ? `${glaze.short}釉 · 待烧`
            : phase === 'firing'
              ? '烧制中'
              : '出窑啦';
  }

  if (pwShapeRowEl) {
    const sKey = POTTERY_SHAPES.map((s) => s.id).join(',');
    if (sKey !== pwShapeRowKey) {
      pwShapeRowKey = sKey;
      pwShapeRowEl.innerHTML = POTTERY_SHAPES.map(
        (s) => `<button type="button" class="pw-shape-chip" data-shape-id="${s.id}" title="${s.name}">
            <img loading="lazy" src="${s.img}" alt="" class="pw-shape-ico" />
            <span class="pw-shape-meta">
              <span class="pw-shape-name">${s.short}</span>
              <em class="pw-shape-sub">拉坯${s.taps}圈 · 护${s.charges}班</em>
            </span>
          </button>`
      ).join('');
    }
    pwShapeRowEl.querySelectorAll('.pw-shape-chip').forEach((chip) => {
      chip.classList.toggle('active', chip.dataset.shapeId === shape.id);
      chip.disabled = phase === 'firing';
    });
  }
  if (pwGlazeRowEl) {
    const gKey = POTTERY_GLAZES.map((g) => g.id).join(',');
    if (gKey !== pwGlazeRowKey) {
      pwGlazeRowKey = gKey;
      pwGlazeRowEl.innerHTML = POTTERY_GLAZES.map(
        (g) => `<button type="button" class="pw-glaze-chip" data-glaze-id="${g.id}" style="--glaze:${g.color}">
            <span class="pw-glaze-swatch"><img loading="lazy" src="${shape.img}" alt="" class="pw-glaze-ico" /></span>
            <span class="pw-glaze-meta">
              <span class="pw-glaze-name">${g.name}</span>
              <em class="pw-glaze-ward"></em>
            </span>
          </button>`
      ).join('');
    }
    pwGlazeRowEl.querySelectorAll('.pw-glaze-chip').forEach((chip) => {
      const gid = chip.dataset.glazeId;
      chip.classList.toggle('active', gid === glaze.id);
      chip.classList.toggle('is-applied', glazedLook && !done && gid === glaze.id);
      chip.disabled = phase === 'firing';
      chip.title = `${POTTERY_GLAZE_BY_ID[gid].name} · ${POTTERY_GLAZE_BY_ID[gid].wardName}：${describePotteryWard(gid, shape.id)}`;
      const ico = chip.querySelector('.pw-glaze-ico');
      if (ico && ico.getAttribute('src') !== shape.img) ico.setAttribute('src', shape.img);
      const wardEl = chip.querySelector('.pw-glaze-ward');
      if (wardEl) wardEl.textContent = describePotteryWardShort(gid, shape.id);
    });
  }

  const mainState = getPotteryMainState();
  if (btnPotteryMainEl) {
    btnPotteryMainEl.disabled = mainState.disabled;
    btnPotteryMainEl.textContent = mainState.label;
    btnPotteryMainEl.dataset.mode = mainState.mode;
    btnPotteryMainEl.classList.toggle('is-ready', !mainState.disabled && (mainState.mode === 'fire' || mainState.mode === 'glaze'));
  }
  if (btnPotteryHelperEl) {
    btnPotteryHelperEl.disabled = phase === 'firing';
    btnPotteryHelperEl.textContent =
      phase === 'shape' || phase === 'done' ? '她来拉坯' : phase === 'glaze' ? '她来上釉' : phase === 'kiln' ? '她来烧' : '她在看窑';
  }
  btnPotteryGoShiftEl?.classList.toggle('hidden', !(stats.wardCharges > 0));

  if (pwShelfGridEl) {
    const recent = pw.pieces.slice(-POTTERY_RULES.shelfCardShow).reverse();
    const lKey = recent.map((e) => `${e.id}:${e.shapeId}:${e.glazeId}`).join(',');
    if (lKey !== pwShelfKey) {
      pwShelfKey = lKey;
      pwShelfGridEl.innerHTML = recent.length
        ? recent
            .map((e) => {
              const sh = POTTERY_SHAPE_BY_ID[e.shapeId];
              const gl = POTTERY_GLAZE_BY_ID[e.glazeId];
              return `<button type="button" class="pw-shelf-chip" data-piece-id="${e.id}" style="--glaze:${gl.color}" title="${e.date} · ${gl.name}${sh.name}">
                  <img loading="lazy" src="${sh.img}" alt="" class="pw-shelf-ico" />
                  <span class="pw-shelf-date">${e.date.slice(5).replace('-', '/')}</span>
                  <em class="pw-shelf-tag">${gl.short}</em>
                </button>`;
            })
            .join('')
        : '<span class="pw-shelf-empty">陶艺架还空着，转动转盘做第一件吧~</span>';
    }
  }
  if (pwShelfSubEl) {
    pwShelfSubEl.textContent = `窗畔陶艺架 · 共 ${stats.totalPieces} 件 · 图鉴 ${stats.combos}/${stats.totalCombos} · 今日奖励 ${stats.rewardsToday}/${stats.dailyRewards}`;
  }
  if (pwWardLineEl) {
    const wg = POTTERY_GLAZE_BY_ID[stats.wardGlazeId];
    if (stats.wardCharges > 0 && wg) {
      setRuleLine(pwWardLineEl, `陶艺佑护『${wg.wardName}』：接下来 ${stats.wardCharges} 个打工班次 ${describePotteryWard(wg.id, stats.wardShapeId)}`);
    } else {
      setRuleLine(
        pwWardLineEl,
        `陶艺佑护：茶杯护 2 班、花瓶护 1 班（×1.5），图鉴每款再 +${Math.round(POTTERY_RULES.comboStep * 100)}%`,
        `陶艺佑护：茶杯护 2 个打工班次、花瓶护 1 个（效果 ×1.5）；奶白减伤 / 樱粉金币 / 青瓷磁吸，图鉴每收 1 款再 +${Math.round(POTTERY_RULES.comboStep * 100)}%`
      );
    }
  }

  const pv = player.potteryVisual;
  pv.pieces = pw.pieces.slice(-POTTERY_RULES.shelfShow).map((e) => ({
    id: e.id,
    spriteKey: POTTERY_SHAPE_BY_ID[e.shapeId].spriteKey,
    rgb: POTTERY_GLAZE_BY_ID[e.glazeId].rgb
  }));
  pv.shaping = cardOpen;
  pv.progress = progress;
  pv.shapeKey = shownShape.spriteKey;
  pv.glazeRgb = glazedLook ? shownGlaze.rgb : '';
  pv.firing = phase === 'firing';
  pv.phase = phase;
  pv.cheer = player.potteryCheerTimer || 0;
  pv.wardCharges = stats.wardCharges;
  pv.totalShown = stats.totalPieces;
  syncPotteryAromaPill();
}

// ---------------- 小小香氛调配台：选心情 → 滴 3 滴精油（季节基调 / 心情心调 / 她的小心意）→ 点香，房间色温随之变化 ----------------
function pickAromaMood(moodId) {
  const m = AROMA_MOOD_BY_ID[moodId];
  if (!m) return { ok: false, reason: 'invalid_mood' };
  const changed = aromaRun.moodId !== moodId;
  aromaRun.moodId = moodId;
  if (changed) aromaRun.drops = 0;
  player.aromaTable.lastMoodId = moodId;
  aromaRun.lastAction = 'mood';
  player.idleTime = 0;
  playSfx('pat');
  const recipe = getAromaRecipe(getAromaSeasonId(), moodId);
  setPlayerEmote(`今天是「${m.name}」的心情~ 配上当季基调，就是「${recipe.name}」！`, 2.2, 'happy', false);
  syncAromaTableUI();
  return { ok: true, moodId, recipeId: recipe.id, changed };
}

function addAromaDrop() {
  const mood = AROMA_MOOD_BY_ID[aromaRun.moodId];
  if (!mood) {
    setPlayerEmote('先告诉我今天是什么心情吧~', 1.6, 'happy', false);
    return { ok: false, reason: 'no_mood' };
  }
  if (aromaRun.drops >= AROMA_RULES.drops) return { ok: false, reason: 'full' };
  aromaRun.drops += 1;
  aromaRun.lastAction = 'drop';
  player.idleTime = 0;
  player.happyTimer = 0.7;
  petAudio.playAromaDrop(aromaRun.drops);
  const season = AROMA_SEASONS[getAromaSeasonId()];
  const lines = [`第一滴：当季基调「${season.note}」~`, `第二滴：心情心调「${mood.note}」~`, '第三滴：再加一点点我的小心意，摇一摇~'];
  setPlayerEmote(lines[aromaRun.drops - 1], 1.8, 'happy', false);
  syncAromaTableUI();
  return { ok: true, drops: aromaRun.drops, need: AROMA_RULES.drops, audio: petAudio.getAr14AudioInfo() };
}

function lightAroma(nowMs = ar14Clock.now()) {
  const mood = AROMA_MOOD_BY_ID[aromaRun.moodId];
  if (!mood) return { ok: false, reason: 'no_mood' };
  if (aromaRun.drops < AROMA_RULES.drops) return { ok: false, reason: 'drops', drops: aromaRun.drops };
  const at = player.aromaTable;
  const d = new Date(nowMs);
  const todayKey = formatLocalDateKey(d);
  const recipe = getAromaRecipe(getAromaSeasonId(d), mood.id);
  const isNew = !(at.discovered[recipe.id] > 0);
  at.discovered[recipe.id] = (at.discovered[recipe.id] || 0) + 1;
  at.totalBlends = (at.totalBlends || 0) + 1;
  at.active = {
    seasonId: recipe.seasonId,
    moodId: recipe.moodId,
    startMs: Math.round(nowMs),
    endMs: Math.round(nowMs + AROMA_RULES.durationMin * 60000)
  };
  at.lastMoodId = mood.id;
  if (at.rewardDate !== todayKey) {
    at.rewardDate = todayKey;
    at.rewardCount = 0;
  }
  let reward = null;
  if (at.rewardCount < AROMA_RULES.dailyRewards) {
    at.rewardCount += 1;
    reward = { coins: AROMA_RULES.coinReward + (isNew ? AROMA_RULES.newRecipeCoins : 0), xp: AROMA_RULES.xpReward };
  }
  aromaRun.drops = 0;
  aromaRun.wasActive = true;
  aromaRun.lastAction = 'lit';
  player.idleTime = 0;
  player.happyTimer = 2;
  player.aromaCheerTimer = 3.5;
  petAudio.playAromaLight(AROMA_MOODS.indexOf(mood));
  petAudio.haptic('headpat');
  spawnInteractVfx(player.x, player.y - 26, 'sparkle', 8);
  recordJournalActivity('aromas', 1, d);
  if (reward) {
    addCoins(reward.coins, player.x + 24, player.y - 44, '香氛 ');
    addAffectionXp(reward.xp, '调好一瓶香氛');
  }
  setPlayerEmote(
    `${mood.line}「${recipe.name}」点上啦，房间换成${recipe.tone}色温（约 ${recipe.kelvin}K）~`,
    3.0,
    'cheer',
    true
  );
  aromaRun.lastResult = {
    recipeId: recipe.id,
    name: recipe.name,
    moodId: recipe.moodId,
    seasonId: recipe.seasonId,
    kelvin: recipe.kelvin,
    tone: recipe.tone,
    isNew,
    reward,
    endMs: at.active.endMs
  };
  savePetState();
  syncAromaTableUI();
  syncDiaryBookUI();
  return { ok: true, ...aromaRun.lastResult, audio: petAudio.getAr14AudioInfo() };
}

function stopAroma() {
  if (!getActiveAroma()) return { ok: false, reason: 'not_active' };
  player.aromaTable.active = null;
  aromaRun.wasActive = false;
  aromaRun.lastAction = 'stopped';
  playSfx('pat');
  setPlayerEmote('香氛先熄掉啦，房间的颜色也慢慢回来了~', 1.8, 'happy', false);
  savePetState();
  syncAromaTableUI();
  return { ok: true };
}

function getAromaMainState() {
  if (!AROMA_MOOD_BY_ID[aromaRun.moodId]) return { mode: 'pick', disabled: true, label: '先选心情' };
  if (aromaRun.drops < AROMA_RULES.drops) {
    return { mode: 'drop', disabled: false, label: `滴入精油 ${aromaRun.drops}/${AROMA_RULES.drops}` };
  }
  return { mode: 'light', disabled: false, label: getActiveAroma() ? '换上这瓶 · 点香' : '摇匀点香' };
}

function handleAromaMainAction() {
  const st = getAromaMainState();
  if (st.disabled) return { ok: false, reason: st.mode };
  if (st.mode === 'drop') return addAromaDrop();
  return lightAroma();
}

// 她来调：没选心情时按今天手账上的心情章（没盖章就按时段）挑心情，再一口气滴满 3 滴并点香
function aromaHelper() {
  aromaRun.helperSeq += 1;
  if (!AROMA_MOOD_BY_ID[aromaRun.moodId]) {
    const now = ar14Clock.date();
    const today = player.weeklyJournal.days[formatLocalDateKey(now)];
    let moodId = '';
    if (today && today.stamped && AROMA_MOOD_BY_ID[today.moodId]) {
      moodId = today.moodId;
    } else {
      const h = now.getHours();
      moodId = h >= 21 || h < 5 ? 'goodnight' : h < 11 ? 'focus' : h < 16 ? 'cozy' : h < 19 ? 'bliss' : 'star';
    }
    pickAromaMood(moodId);
  }
  let guard = 0;
  while (aromaRun.drops < AROMA_RULES.drops && guard < 5) {
    addAromaDrop();
    guard += 1;
  }
  return { ...lightAroma(), step: 'helper' };
}

// 每秒复核一次：香氛按可注入时钟到点自然散去、跨过本地午夜时季节 / 每日奖励翻页
function refreshAr14Clock() {
  const active = getActiveAroma();
  const dayKey = formatLocalDateKey(ar14Clock.date());
  if (aromaRun.wasActive && !active) {
    aromaRun.wasActive = false;
    if (player.aromaTable.active) {
      player.aromaTable.active = null;
      savePetState();
    }
    aromaRun.lastAction = 'faded';
    if (gameMode === 'pet') setPlayerEmote('香氛慢慢散去啦，房间又回到原来的颜色~', 1.8, 'happy', false);
    syncAromaTableUI();
    return;
  }
  aromaRun.wasActive = Boolean(active);
  if (!active && player.aromaTable.active && Number(player.aromaTable.active.endMs) <= ar14Clock.now()) {
    // 旧存档里早已散去的香氛：静默清掉
    player.aromaTable.active = null;
    savePetState();
  }
  if (dayKey !== aromaRun.dayKey) {
    aromaRun.dayKey = dayKey;
    potteryRun.dayKey = dayKey;
    syncPotteryWheelUI();
    syncAromaTableUI();
  } else if (active || isAr14CardOpen('aroma')) {
    syncAromaTableUI();
  } else {
    syncPotteryAromaPill();
  }
}

let amMoodRowKey = null;
let amCodexKey = null;

function syncAromaAmbientOverlay(activeIn) {
  const overlay = document.getElementById('aroma-ambient-overlay');
  if (!overlay) return;
  const active = activeIn === undefined ? getActiveAroma() : activeIn;
  const show = Boolean(active && gameMode === 'pet');
  overlay.classList.toggle('hidden', !show);
  if (active) {
    overlay.style.setProperty('--aroma-mood', active.moodRgb);
    overlay.style.setProperty('--aroma-season', active.seasonRgb);
    overlay.dataset.mood = active.moodId;
    overlay.dataset.season = active.seasonId;
    overlay.dataset.kelvin = String(active.kelvin);
  } else {
    overlay.dataset.mood = '';
  }
}

function syncAromaTableUI() {
  const at = player.aromaTable;
  if (!at) return;
  const d = ar14Clock.date();
  const stats = getAromaStats(d);
  const season = AROMA_SEASONS[stats.seasonId];
  const active = stats.active;
  const cardOpen = isAr14CardOpen('aroma');
  const mood = AROMA_MOOD_BY_ID[aromaRun.moodId] || null;
  const recipe = mood ? getAromaRecipe(stats.seasonId, mood.id) : null;
  const disc = at.discovered || {};

  if (amSummaryPillEl) amSummaryPillEl.textContent = `香氛 ${stats.totalBlends} 次 · 图鉴 ${stats.discovered}/${stats.totalRecipes}`;
  if (amSeasonRowEl) amSeasonRowEl.dataset.season = season.id;
  if (amSeasonIcoEl && amSeasonIcoEl.getAttribute('src') !== season.icon) amSeasonIcoEl.setAttribute('src', season.icon);
  if (amSeasonNameEl) amSeasonNameEl.textContent = `${season.name} · ${season.note}`;
  if (amSeasonSubEl) {
    amSeasonSubEl.textContent = active
      ? `点香中「${active.name}」 · 还剩 ${active.minsLeft} 分`
      : `${d.getMonth() + 1}月${d.getDate()}日 · 按本地日期取当季基调`;
  }
  if (amBottleStageEl) {
    amBottleStageEl.dataset.mood = mood ? mood.id : '';
    amBottleStageEl.dataset.lit = active ? '1' : '0';
    amBottleStageEl.style.setProperty('--mood-rgb', active ? active.moodRgb : mood ? mood.rgb : '252, 240, 222');
  }
  amDropEls.forEach((el, i) => el.classList.toggle('filled', i < aromaRun.drops));
  if (amStageTagEl) {
    amStageTagEl.textContent = active
      ? `${active.tone} · ${active.kelvin}K`
      : mood
        ? `${mood.name} · 滴入 ${aromaRun.drops}/${AROMA_RULES.drops}`
        : '还没选心情';
  }

  if (amMoodRowEl) {
    const mKey = AROMA_MOODS.map((m) => m.id).join(',');
    if (mKey !== amMoodRowKey) {
      amMoodRowKey = mKey;
      amMoodRowEl.innerHTML = AROMA_MOODS.map(
        (m) => `<button type="button" class="am-mood-chip" data-mood-id="${m.id}" style="--mood-rgb:${m.rgb}">
            <img loading="lazy" src="${m.img}" alt="" class="am-mood-ico" />
            <span class="am-mood-meta">
              <span class="am-mood-name">${m.name}</span>
              <em class="am-mood-note">${m.note}</em>
            </span>
          </button>`
      ).join('');
    }
    amMoodRowEl.querySelectorAll('.am-mood-chip').forEach((chip) => {
      const mid = chip.dataset.moodId;
      chip.classList.toggle('active', mood ? mood.id === mid : false);
      chip.classList.toggle('is-found', Number(disc[`${stats.seasonId}_${mid}`]) > 0);
      chip.title = `${AROMA_MOOD_BY_ID[mid].name} · ${getAromaRecipe(stats.seasonId, mid).name} · 色温约 ${AROMA_MOOD_BY_ID[mid].kelvin}K`;
    });
  }
  if (amRecipeLineEl) {
    // 收录状态放最前，单行放不下时被省略的只会是色温，完整一句放进 title
    amRecipeLineEl.textContent = recipe
      ? `${Number(disc[recipe.id]) > 0 ? '已收录' : '新香氛'}「${recipe.name}」 · 色温 ${recipe.kelvin}K`
      : '香调 = 当季基调 + 心情心调 + 她的小心意';
    amRecipeLineEl.title = recipe
      ? `「${recipe.name}」 · ${recipe.tone}色温约 ${recipe.kelvin}K${Number(disc[recipe.id]) > 0 ? ' · 已收录' : ' · 新香氛'}`
      : amRecipeLineEl.textContent;
  }

  const mainState = getAromaMainState();
  if (btnAromaMainEl) {
    btnAromaMainEl.disabled = mainState.disabled;
    btnAromaMainEl.textContent = mainState.label;
    btnAromaMainEl.dataset.mode = mainState.mode;
    btnAromaMainEl.classList.toggle('is-ready', !mainState.disabled && mainState.mode === 'light');
  }
  btnAromaStopEl?.classList.toggle('hidden', !active);

  if (amCodexGridEl) {
    const cKey = `${stats.seasonId}|${AROMA_MOODS.map((m) => (Number(disc[`${stats.seasonId}_${m.id}`]) > 0 ? 1 : 0)).join('')}|${active ? active.id : ''}`;
    if (cKey !== amCodexKey) {
      amCodexKey = cKey;
      amCodexGridEl.innerHTML = AROMA_MOODS.map((m) => {
        const r = getAromaRecipe(stats.seasonId, m.id);
        const found = Number(disc[r.id]) > 0;
        const lit = Boolean(active && active.id === r.id);
        return `<span class="am-codex-chip${found ? ' is-found' : ''}${lit ? ' is-lit' : ''}" data-recipe-id="${r.id}" style="--mood-rgb:${m.rgb}" title="${r.name}${found ? ' · 已收录' : ' · 未收录'}">
            <img loading="lazy" src="${m.img}" alt="" class="am-codex-ico" />
            <em class="am-codex-tag">${found ? m.note : '待收录'}</em>
          </span>`;
      }).join('');
    }
  }
  if (amCodexSubEl) {
    amCodexSubEl.textContent = `香氛图鉴 ${stats.discovered}/${stats.totalRecipes} · 当季「${season.note}」${stats.seasonFound}/${AROMA_MOODS.length} · 今日奖励 ${stats.rewardsToday}/${stats.dailyRewards}`;
  }
  if (amFooterLineEl) {
    // 点香中：香名 / 色温 / 剩余时间上方季节行与香薰机标签已经写了，这里只留加成
    const amAffection = Math.round(AROMA_RULES.affectionBonus * 100);
    const amFull = `香氛舒心：滴满 3 滴点香后 ${AROMA_RULES.durationMin} 分钟，房间换上心情色温、日常亲密 +${amAffection}%；每天前 ${AROMA_RULES.dailyRewards} 次调香 +${AROMA_RULES.coinReward} 金币，新香氛再 +${AROMA_RULES.newRecipeCoins}`;
    if (active) {
      setRuleLine(
        amFooterLineEl,
        `香氛舒心中：日常亲密 +${amAffection}%`,
        `香氛舒心「${active.name}」：房间${active.tone}色温约 ${active.kelvin}K，还剩 ${active.minsLeft} 分钟，日常亲密 +${amAffection}%`
      );
    } else {
      setRuleLine(
        amFooterLineEl,
        `点香 ${AROMA_RULES.durationMin} 分钟：亲密 +${amAffection}%；每天前 ${AROMA_RULES.dailyRewards} 次 +${AROMA_RULES.coinReward} 金币，新香氛 +${AROMA_RULES.newRecipeCoins}`,
        amFull
      );
    }
  }

  syncAromaAmbientOverlay(active);
  const av = player.aromaVisual;
  av.active = Boolean(active);
  av.blending = cardOpen;
  av.moodRgb = active ? active.moodRgb : mood ? mood.rgb : '';
  av.seasonRgb = active ? active.seasonRgb : season.rgb;
  av.label = active ? `${active.tone} · ${active.minsLeft}分` : '香氛台';
  av.drops = aromaRun.drops;
  av.cheer = player.aromaCheerTimer || 0;
  syncPotteryAromaPill(null, stats);
}

// ---------------- AR-14 合并紧凑胶囊：陶艺佑护 / 烧制中 + 点香倒计时，窄屏放不下就收起 ----------------
function syncPotteryAromaPill(psIn = null, asIn = null) {
  if (!paPillEl) return;
  const ps = psIn || getPotteryStats();
  const as = asIn || getAromaStats();
  const firing = potteryRun.phase === 'firing';
  const showPottery = firing || ps.wardCharges > 0;
  const showAroma = Boolean(as.active);
  paPillEl.classList.toggle('hidden', !(gameMode === 'pet' && (showPottery || showAroma)));
  paPillEl.classList.toggle('has-aroma', showAroma);
  paSegPotteryEl?.classList.toggle('hidden', !showPottery);
  paSegAromaEl?.classList.toggle('hidden', !showAroma);
  // 点香倒计时更有时效：两段都在时优先留香氛段
  paSegAromaEl?.classList.toggle('is-priority', showAroma);
  paSegPotteryEl?.classList.toggle('is-priority', !showAroma);
  if (paPillPotteryEl) paPillPotteryEl.textContent = firing ? '烧制' : `护${ps.wardCharges}`;
  if (paPillAromaEl) paPillAromaEl.textContent = as.active ? `${as.active.minsLeft}分` : '';
  if (as.active) paPillEl.style.setProperty('--mood-rgb', as.active.moodRgb);
  const wg = POTTERY_GLAZE_BY_ID[ps.wardGlazeId];
  paPillEl.title = `${firing ? '小窑烧制中' : ps.wardCharges > 0 && wg ? `陶艺佑护『${wg.wardName}』还剩 ${ps.wardCharges} 个班次` : '窗畔陶艺转盘'} · ${as.active ? `香氛「${as.active.name}」还剩 ${as.active.minsLeft} 分钟` : '香氛调配台'}`;
  fitPotteryAromaPill();
}

// 与 AR-11 ~ AR-13 同一条规则：窄屏胶囊行已排满时不为 AR-14 胶囊新开一行（offsetTop 不受旋转舞台变换影响），
// 两段都放不下先只留优先的一段，仍放不下才整颗收起；只读 DOM，任何区段初始化时调用都不会触发 TDZ
function fitPotteryAromaPill() {
  const fitted = fitPotteryAromaPillOnly();
  // AR-15 合并胶囊排在其后：AR-14 胶囊显隐 / 收起变化后立刻复核 AR-15 胶囊是否还放得下
  fitStarRainPill();
  return fitted;
}

function fitPotteryAromaPillOnly() {
  const pill = document.getElementById('pottery-aroma-pill');
  if (!pill) return false;
  pill.classList.remove('pa-no-room', 'pa-solo');
  if (pill.classList.contains('hidden') || pill.offsetParent === null) return false;
  const compact = window.matchMedia ? window.matchMedia('(max-width: 920px), (max-height: 430px)') : null;
  if (!compact || !compact.matches) return true;
  const row = pill.parentElement;
  const others = row
    ? Array.from(row.children).filter(
        (b) => b !== pill && b.id !== 'star-rain-pill' && b.id !== 'stitch-hearth-pill' && !b.classList.contains('hidden') && b.offsetParent !== null
      )
    : [];
  if (!others.length) return true;
  const mid = (b) => b.offsetTop + b.offsetHeight / 2;
  const lastRowMid = Math.max(...others.map(mid));
  if (mid(pill) <= lastRowMid + 6) return true;
  const shownSegs = Array.from(pill.querySelectorAll('.pa-seg')).filter((s) => !s.classList.contains('hidden'));
  if (shownSegs.length > 1) {
    pill.classList.add('pa-solo');
    if (mid(pill) <= lastRowMid + 6) return true;
    pill.classList.remove('pa-solo');
  }
  pill.classList.add('pa-no-room');
  return false;
}

function openAr14Card(cardEl) {
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
  dismissAr14Cards(); dismissAr15Cards(); dismissAr16Cards(); dismissAr17Cards();
  dismissPolaroid();
  closeAlbumLightbox();
  cardEl.classList.remove('hidden');
}

function openPotteryWheelCard() {
  if (!potteryCardEl) return { ok: false };
  openAr14Card(potteryCardEl);
  syncPotteryWheelUI();
  syncAromaTableUI();
  return { ok: true };
}

function openAromaTableCard() {
  if (!aromaCardEl) return { ok: false };
  openAr14Card(aromaCardEl);
  syncAromaTableUI();
  syncPotteryWheelUI();
  return { ok: true };
}

function handleAr14CanvasTap(pt) {
  const pv = player.potteryVisual;
  const shelf = getPotteryShelfLayout(W, H, player.sillCamX || 0, pv && Array.isArray(pv.pieces) ? pv.pieces.length : 0);
  const sh = shelf.hit;
  if (pt.x >= sh.x && pt.x <= sh.x + sh.w && pt.y >= sh.y && pt.y <= sh.y + sh.h) {
    openPotteryWheelCard();
    petAudio.playPotteryWheel(0);
    return true;
  }
  const A = getAromaTableDeskAnchor(W, H);
  if (Math.hypot(pt.x - A.hit.x, pt.y - A.hit.y) < A.hit.r) {
    openAromaTableCard();
    petAudio.playAromaDrop(0);
    return true;
  }
  return false;
}

let paPillFitTimer = 0;
function updateAr14Companions(dt) {
  if (player.potteryCheerTimer > 0) player.potteryCheerTimer = Math.max(0, player.potteryCheerTimer - dt);
  if (player.aromaCheerTimer > 0) player.aromaCheerTimer = Math.max(0, player.aromaCheerTimer - dt);
  if (potteryRun.spinFlash > 0) {
    potteryRun.spinFlash = Math.max(0, potteryRun.spinFlash - dt);
    if (potteryRun.spinFlash <= 0 && potteryRun.phase !== 'firing') pwWheelEl?.classList.remove('is-spinning');
  }
  if (potteryRun.phase === 'firing') {
    potteryRun.fireLeft -= dt;
    if (potteryRun.fireLeft <= 0) finishPottery();
  }
  aromaRun.tickAcc -= dt;
  if (aromaRun.tickAcc <= 0) {
    aromaRun.tickAcc = 1;
    refreshAr14Clock();
  }
  paPillFitTimer -= dt;
  if (paPillFitTimer <= 0) {
    paPillFitTimer = 0.5;
    fitPotteryAromaPill();
  }
  const pv = player.potteryVisual;
  pv.shaping = isAr14CardOpen('pottery');
  pv.cheer = player.potteryCheerTimer || 0;
  const av = player.aromaVisual;
  av.blending = isAr14CardOpen('aroma');
  av.cheer = player.aromaCheerTimer || 0;
}
// [[split 45]]

// ================= AR-15 卧室星空投影灯 & 窗边听雨角 =================
// 船坞仍是 25 键、书桌已满：两张卡不加新键，入口 = 「家具与装扮」抽屉快捷卡 + 场景点击（窗边飘台上的星空投影灯 / 听雨坐垫与雨滴风铃）+ 合并胶囊
const starCardEl = document.getElementById('star-projector-card');
const spSummaryPillEl = document.getElementById('sp-summary-pill');
const spNightRowEl = document.getElementById('sp-night-row');
const spNightNameEl = document.getElementById('sp-night-name');
const spNightSubEl = document.getElementById('sp-night-sub');
const spDomeEl = document.getElementById('sp-dome');
const spSkyEl = document.getElementById('sp-sky');
const spDomeTagEl = document.getElementById('sp-dome-tag');
const spCardRowEl = document.getElementById('sp-card-row');
const spStoryLineEl = document.getElementById('sp-story-line');
const btnStarHelperEl = document.getElementById('btn-star-helper');
const btnStarMainEl = document.getElementById('btn-star-main');
const btnStarOffEl = document.getElementById('btn-star-off');
const spAlbumSubEl = document.getElementById('sp-album-sub');
const spAlbumGridEl = document.getElementById('sp-album-grid');
const spFooterLineEl = document.getElementById('sp-footer-line');

const rainCardEl = document.getElementById('rain-corner-card');
const rcSummaryPillEl = document.getElementById('rc-summary-pill');
const rcWeatherRowEl = document.getElementById('rc-weather-row');
const rcWeatherIcoEl = document.getElementById('rc-weather-ico');
const rcWeatherNameEl = document.getElementById('rc-weather-name');
const rcWeatherSubEl = document.getElementById('rc-weather-sub');
const rcWindowEl = document.getElementById('rc-window');
const rcStageTagEl = document.getElementById('rc-stage-tag');
const rcVolumeRowEl = document.getElementById('rc-volume-row');
const rcMixLineEl = document.getElementById('rc-mix-line');
const btnRainHelperEl = document.getElementById('btn-rain-helper');
const btnRainMainEl = document.getElementById('btn-rain-main');
const rcCodexSubEl = document.getElementById('rc-codex-sub');
const rcCodexGridEl = document.getElementById('rc-codex-grid');
const rcFooterLineEl = document.getElementById('rc-footer-line');

const srPillEl = document.getElementById('star-rain-pill');
const srSegStarEl = document.getElementById('sr-seg-star');
const srSegRainEl = document.getElementById('sr-seg-rain');
const srPillStarEl = document.getElementById('sr-pill-star');
const srPillRainEl = document.getElementById('sr-pill-rain');

const RAIN_RING_LINES = [
  '叮——风铃上挂着的雨滴也跟着晃了一下~',
  '听，雨滴顺着风铃一颗颗滑下来了~',
  '窗外的雨和风铃在合奏呢，好安静~',
  '靠在坐垫上，什么都不用想~'
];

function isAr15CardOpen(which = '') {
  const sp = document.getElementById('star-projector-card');
  const rc = document.getElementById('rain-corner-card');
  const spOpen = Boolean(sp && !sp.classList.contains('hidden'));
  const rcOpen = Boolean(rc && !rc.classList.contains('hidden'));
  if (which === 'star') return spOpen;
  if (which === 'rain') return rcOpen;
  return spOpen || rcOpen;
}

function dismissStarProjectorCard() {
  document.getElementById('star-projector-card')?.classList.add('hidden');
}

function dismissRainCornerCard() {
  document.getElementById('rain-corner-card')?.classList.add('hidden');
}

// 只碰 DOM：其它卡片在模块初始化期间调用也不会触发 TDZ
function dismissAr15Cards() {
  dismissStarProjectorCard();
  dismissRainCornerCard();
}

// ---------------- 卧室星空投影灯：挑一张当季星座卡 → 转动投影罩对准亮星 → 点亮投影 → 一起晚安盖好梦章 ----------------
function isStarCardUnlocked(cardId, d = ar15Clock.date()) {
  const card = STAR_CARD_BY_ID[cardId];
  if (!card) return false;
  const owned = Number(player.starProjector.cards[cardId] && player.starProjector.cards[cardId].lights) > 0;
  return owned || card.season === getAromaSeasonId(d);
}

function pickStarCard(cardId) {
  const card = STAR_CARD_BY_ID[cardId];
  if (!card) return { ok: false, reason: 'invalid_card' };
  const d = ar15Clock.date();
  const seasonId = getAromaSeasonId(d);
  const owned = Number(player.starProjector.cards[cardId] && player.starProjector.cards[cardId].lights) > 0;
  if (card.season !== seasonId && !owned) {
    starRun.lastAction = 'locked';
    playSfx('pat');
    setPlayerEmote(`「${card.name}」要等到${STAR_SEASON_NAMES[card.season]}天的夜空才能投影哦，先收集当季的星座卡吧~`, 2.2, 'happy', false);
    syncStarProjectorUI();
    return { ok: false, reason: 'out_of_season', season: card.season };
  }
  const same = starRun.cardId === cardId && starRun.phase === 'dial';
  starRun.cardId = cardId;
  if (!same) {
    starRun.taps = 0;
    starRun.phase = 'dial';
  }
  starRun.lastAction = 'pick';
  player.starProjector.lastCardId = cardId;
  player.idleTime = 0;
  playSfx('pat');
  setPlayerEmote(`今晚投「${card.name}」！一共 ${card.taps} 颗亮星，转动投影罩把它们一颗颗对准吧~`, 2.2, 'happy', false);
  syncStarProjectorUI();
  return { ok: true, cardId, same, owned, inSeason: card.season === seasonId };
}

function dialStarProjector() {
  const card = STAR_CARD_BY_ID[starRun.cardId];
  if (!card) {
    setPlayerEmote('先挑一张星座卡吧~', 1.6, 'happy', false);
    return { ok: false, reason: 'no_card' };
  }
  if (starRun.phase === 'lit') return { ok: false, reason: 'lit' };
  if (starRun.taps >= card.taps) return { ok: false, reason: 'full' };
  starRun.phase = 'dial';
  starRun.taps += 1;
  starRun.spinFlash = 0.5;
  starRun.lastAction = 'dial';
  player.idleTime = 0;
  player.happyTimer = 0.7;
  petAudio.playStarDial(starRun.taps);
  petAudio.haptic('tap');
  const starName = card.starNames[starRun.taps - 1] || '小星星';
  setPlayerEmote(
    starRun.taps >= card.taps
      ? `「${card.name}」的 ${card.taps} 颗亮星都对准啦，点亮投影吧~`
      : `第 ${starRun.taps} 颗：${starName}，对准啦~`,
    1.6,
    'happy',
    false
  );
  syncStarProjectorUI();
  return { ok: true, taps: starRun.taps, need: card.taps, star: starName, audio: petAudio.getAr15AudioInfo() };
}

function lightStarProjection(nowMs = ar15Clock.now()) {
  const card = STAR_CARD_BY_ID[starRun.cardId];
  if (!card) return { ok: false, reason: 'no_card' };
  if (starRun.phase === 'lit') return { ok: false, reason: 'lit' };
  if (starRun.taps < card.taps) return { ok: false, reason: 'taps', taps: starRun.taps };
  const sp = player.starProjector;
  const d = new Date(nowMs);
  const todayKey = formatLocalDateKey(d);
  const prev = sp.cards[card.id];
  const isNew = !(prev && prev.lights > 0);
  sp.cards[card.id] = {
    lights: (prev ? prev.lights : 0) + 1,
    dreams: prev ? prev.dreams || 0 : 0,
    first: prev && prev.first ? prev.first : todayKey
  };
  sp.totalLights = (sp.totalLights || 0) + 1;
  sp.active = {
    cardId: card.id,
    startMs: Math.round(nowMs),
    endMs: Math.round(nowMs + STAR_RULES.durationMin * 60000)
  };
  sp.lastCardId = card.id;
  if (sp.rewardDate !== todayKey) {
    sp.rewardDate = todayKey;
    sp.rewardCount = 0;
  }
  const bedtime = isStarBedtime(d);
  let reward = null;
  if (sp.rewardCount < STAR_RULES.dailyRewards) {
    sp.rewardCount += 1;
    const m = bedtime ? STAR_RULES.bedtimeMult : 1;
    reward = {
      coins: Math.round((STAR_RULES.coinReward + (isNew ? STAR_RULES.newCardCoins : 0)) * m),
      xp: Math.round(STAR_RULES.xpReward * m)
    };
  }
  starRun.phase = 'lit';
  starRun.taps = 0;
  starRun.wasActive = true;
  starRun.lastAction = 'lit';
  player.idleTime = 0;
  player.happyTimer = 2;
  player.starCheerTimer = 3.5;
  petAudio.playStarProject(STAR_CARDS.indexOf(card));
  petAudio.haptic('headpat');
  spawnInteractVfx(player.x, player.y - 28, 'sparkle', 9);
  recordJournalActivity('stars', 1, d);
  if (reward) {
    addCoins(reward.coins, player.x + 24, player.y - 44, '星空 ');
    addAffectionXp(reward.xp, bedtime ? '睡前一起点亮星空' : '点亮星座投影');
  }
  setPlayerEmote(`${isNew ? '新的星座卡！' : ''}「${card.name}」投到天花板上啦~ ${card.story}`, 3.2, 'cheer', true);
  starRun.lastResult = {
    cardId: card.id,
    name: card.name,
    isNew,
    bedtime,
    reward,
    endMs: sp.active.endMs,
    lights: sp.cards[card.id].lights,
    collected: getStarStats(d).collected
  };
  savePetState();
  syncStarProjectorUI();
  syncDiaryBookUI();
  return { ok: true, ...starRun.lastResult, audio: petAudio.getAr15AudioInfo() };
}

function stopStarProjection() {
  if (!getActiveProjection()) return { ok: false, reason: 'not_active' };
  player.starProjector.active = null;
  starRun.wasActive = false;
  starRun.lastAction = 'off';
  if (starRun.phase === 'lit') {
    starRun.phase = STAR_CARD_BY_ID[starRun.cardId] ? 'dial' : 'pick';
    starRun.taps = 0;
  }
  playSfx('pat');
  setPlayerEmote('星空灯先关掉啦，星星们下次睡前再见~', 1.8, 'happy', false);
  savePetState();
  syncStarProjectorUI();
  return { ok: true };
}

// 晚安联动：投影还亮着时「一起晚安」直接旋开晚安星空八音盒；伴眠结算时给这张星座卡盖好梦章
function startStarGoodnight() {
  const active = getActiveProjection();
  if (!active) return { ok: false, reason: 'not_active' };
  if (goodnightRun.status === 'running') return { ok: false, reason: 'running' };
  starRun.lastAction = 'goodnight';
  startGoodnightSession();
  setPlayerEmote(`「${active.name}」陪我们一起晚安~ 伴眠结束时这张星座卡会盖上好梦章哦zzZ`, 3.0, 'sleep', true);
  syncStarProjectorUI();
  return { ok: true, goodnight: goodnightRun.status, cardId: active.cardId };
}

function awardStarDream(active, d = ar15Clock.date()) {
  const card = active ? STAR_CARD_BY_ID[active.cardId] : null;
  if (!card) return null;
  const sp = player.starProjector;
  const todayKey = formatLocalDateKey(d);
  const rec = sp.cards[card.id] || { lights: 1, dreams: 0, first: todayKey };
  rec.dreams = (rec.dreams || 0) + 1;
  sp.cards[card.id] = rec;
  sp.totalDreams = (sp.totalDreams || 0) + 1;
  if (sp.dreamDate !== todayKey) {
    sp.dreamDate = todayKey;
    sp.dreamCount = 0;
  }
  let reward = null;
  if (sp.dreamCount < STAR_RULES.dreamDailyMax) {
    sp.dreamCount += 1;
    reward = { coins: STAR_RULES.dreamCoins, xp: STAR_RULES.dreamXp };
    addCoins(reward.coins, player.x - 24, player.y - 52, '好梦星签 ');
    addAffectionXp(reward.xp, '星空下的好梦');
  }
  player.starCheerTimer = 3;
  petAudio.playStarDream();
  setPlayerEmote(`好梦章盖在「${card.name}」星座卡上啦（第 ${rec.dreams} 枚）！今晚的星星都在守着我们~`, 3.0, 'cheer', true);
  starRun.lastDream = { cardId: card.id, dreams: rec.dreams, totalDreams: sp.totalDreams, reward };
  savePetState();
  syncStarProjectorUI();
  return { ...starRun.lastDream };
}

function getStarMainState() {
  const card = STAR_CARD_BY_ID[starRun.cardId];
  const active = getActiveProjection();
  if (starRun.phase === 'lit') {
    if (active && active.cardId === starRun.cardId) {
      if (goodnightRun.status === 'running') return { mode: 'sleeping', disabled: true, label: '伴眠中…' };
      return { mode: 'goodnight', disabled: false, label: '一起晚安' };
    }
    return { mode: 'again', disabled: !card, label: '再投一次' };
  }
  if (!card) return { mode: 'pick', disabled: true, label: '先挑星座卡' };
  if (starRun.taps < card.taps) return { mode: 'dial', disabled: false, label: `转动投影罩 ${starRun.taps}/${card.taps}` };
  return { mode: 'project', disabled: false, label: active ? '换上这张 · 点亮' : '点亮投影' };
}

function handleStarMainAction() {
  const st = getStarMainState();
  if (st.disabled) return { ok: false, reason: st.mode };
  if (st.mode === 'dial') return dialStarProjector();
  if (st.mode === 'project') return lightStarProjection();
  if (st.mode === 'goodnight') return startStarGoodnight();
  starRun.phase = 'dial';
  starRun.taps = 0;
  starRun.lastAction = 'again';
  playSfx('pat');
  setPlayerEmote('再转一次投影罩，把星星重新请回天花板~', 1.6, 'happy', false);
  syncStarProjectorUI();
  return { ok: true, phase: 'dial' };
}

// 她来点亮：没挑卡时先挑当季还没收集的那张（都收过就按日期轮换），再一口气对准全部亮星并点亮
function starHelper() {
  starRun.helperSeq += 1;
  const d = ar15Clock.date();
  if (starRun.phase === 'lit' || !STAR_CARD_BY_ID[starRun.cardId] || !isStarCardUnlocked(starRun.cardId, d)) {
    const seasonCards = getStarSeasonCards(getAromaSeasonId(d));
    const fresh = seasonCards.find((c) => !(Number(player.starProjector.cards[c.id] && player.starProjector.cards[c.id].lights) > 0));
    const pick = fresh || seasonCards[(d.getDate() + starRun.helperSeq) % seasonCards.length];
    starRun.cardId = '';
    pickStarCard(pick.id);
  }
  const card = STAR_CARD_BY_ID[starRun.cardId];
  let guard = 0;
  while (card && starRun.taps < card.taps && guard < 8) {
    dialStarProjector();
    guard += 1;
  }
  return { ...lightStarProjection(), step: 'helper' };
}

let spCardRowKey = null;
let spAlbumKey = null;
let spSkyKey = null;
let spoSkyKey = null;

function renderStarSkyDots(card, litCount) {
  if (!card) return '';
  return card.stars
    .map(
      (s, i) =>
        `<img loading="lazy" src="./assets/vfx_sparkle.webp?v=hd60" alt="" class="sp-sky-star${i < litCount ? ' is-on' : ''}" style="left:${s.x}%;top:${s.y}%;animation-delay:${(i * 0.37).toFixed(2)}s" />`
    )
    .join('');
}

function syncAr15Overlays(starActiveIn, rainWeatherIn) {
  const so = document.getElementById('star-projector-overlay');
  const ro = document.getElementById('rain-ambient-overlay');
  const active = starActiveIn === undefined ? getActiveProjection() : starActiveIn;
  if (so) {
    const show = Boolean(active && gameMode === 'pet');
    so.classList.toggle('hidden', !show);
    so.dataset.card = active ? active.cardId : '';
    if (active) {
      so.style.setProperty('--star-rgb', active.rgb);
      const sky = document.getElementById('spo-sky');
      if (sky && spoSkyKey !== active.cardId) {
        spoSkyKey = active.cardId;
        const card = STAR_CARD_BY_ID[active.cardId];
        sky.innerHTML = card.stars
          .map(
            (s, i) =>
              `<img loading="lazy" src="./assets/vfx_sparkle.webp?v=hd60" alt="" class="spo-star" style="left:${s.x}%;top:${s.y}%;animation-delay:${(i * 0.41).toFixed(2)}s" />`
          )
          .join('');
      }
    }
  }
  if (ro) {
    const weather = rainWeatherIn || getRainWeather();
    const show = Boolean(rainRun.listening && gameMode === 'pet');
    ro.classList.toggle('hidden', !show);
    ro.dataset.weather = show ? rainRun.weatherId || weather.id : '';
    ro.style.setProperty('--rain-rgb', (RAIN_WEATHER_BY_ID[rainRun.weatherId] || weather).rgb);
  }
}

function syncStarProjectorUI() {
  const sp = player.starProjector;
  if (!sp) return;
  const d = ar15Clock.date();
  const stats = getStarStats(d);
  const active = stats.active;
  const cardOpen = isAr15CardOpen('star');
  const card = STAR_CARD_BY_ID[starRun.cardId] || null;
  const shownCard = starRun.phase === 'lit' && active ? STAR_CARD_BY_ID[active.cardId] : card;
  const litCount = starRun.phase === 'lit' && active ? (shownCard ? shownCard.taps : 0) : starRun.taps;
  const seasonName = STAR_SEASON_NAMES[stats.seasonId];

  if (spSummaryPillEl) spSummaryPillEl.textContent = `星座卡 ${stats.collected}/${stats.totalCards} · 好梦 ${stats.totalDreams}`;
  if (spNightRowEl) {
    spNightRowEl.dataset.season = stats.seasonId;
    spNightRowEl.dataset.bedtime = stats.bedtime ? '1' : '0';
  }
  if (spNightNameEl) spNightNameEl.textContent = `今晚 · ${seasonName}夜星空`;
  if (spNightSubEl) {
    spNightSubEl.textContent = active
      ? `投影中「${active.name}」 · 还剩 ${active.minsLeft} 分`
      : stats.bedtime
        ? `睡前时段 · 点亮奖励 ×${STAR_RULES.bedtimeMult}`
        : `${d.getMonth() + 1}月${d.getDate()}日 · ${STAR_RULES.bedtimeStartHour}:00 后点亮算睡前 ×${STAR_RULES.bedtimeMult}`;
  }
  if (spDomeEl) {
    spDomeEl.dataset.phase = starRun.phase;
    spDomeEl.dataset.lit = active ? '1' : '0';
    spDomeEl.dataset.card = shownCard ? shownCard.id : '';
    spDomeEl.style.setProperty('--star-rgb', shownCard ? shownCard.rgb : '255, 240, 214');
    spDomeEl.classList.toggle('is-spinning', starRun.spinFlash > 0);
  }
  if (spSkyEl) {
    const key = `${shownCard ? shownCard.id : ''}|${litCount}`;
    if (key !== spSkyKey) {
      spSkyKey = key;
      spSkyEl.innerHTML = renderStarSkyDots(shownCard, litCount);
    }
  }
  if (spDomeTagEl) {
    spDomeTagEl.textContent =
      starRun.phase === 'lit' && active
        ? `${active.short}星光 · ${active.minsLeft}分`
        : card
          ? `对准 ${starRun.taps}/${card.taps}`
          : '先挑星座卡';
  }

  if (spCardRowEl) {
    const seasonCards = getStarSeasonCards(stats.seasonId);
    const rKey = seasonCards.map((c) => c.id).join(',');
    if (rKey !== spCardRowKey) {
      spCardRowKey = rKey;
      spCardRowEl.innerHTML = seasonCards
        .map(
          (c) => `<button type="button" class="sp-card-chip" data-card-id="${c.id}" style="--star-rgb:${c.rgb}">
            <img loading="lazy" src="./assets/constellation_card.webp?v=hd60" alt="" class="sp-card-ico" />
            <span class="sp-card-meta">
              <span class="sp-card-name">${c.name}</span>
              <em class="sp-card-sub"></em>
            </span>
          </button>`
        )
        .join('');
    }
    spCardRowEl.querySelectorAll('.sp-card-chip').forEach((chip) => {
      const cid = chip.dataset.cardId;
      const c = STAR_CARD_BY_ID[cid];
      const rec = sp.cards[cid];
      chip.classList.toggle('active', Boolean(card && card.id === cid));
      chip.classList.toggle('is-found', Boolean(rec && rec.lights > 0));
      chip.classList.toggle('is-lit', Boolean(active && active.cardId === cid));
      const sub = chip.querySelector('.sp-card-sub');
      if (sub) sub.textContent = rec && rec.lights > 0 ? `${c.taps}星 · 已投${rec.lights}次` : `${c.taps}星 · 新卡`;
      chip.title = `${c.name} · ${c.starNames.join(' / ')}`;
    });
  }
  if (spStoryLineEl) {
    spStoryLineEl.textContent =
      starRun.phase === 'lit' && active
        ? STAR_CARD_BY_ID[active.cardId].story
        : card
          ? `「${card.name}」：${card.starNames.slice(0, Math.max(1, starRun.taps)).join(' · ')}${starRun.taps < card.taps ? ' …' : ''}`
          : `${seasonName}夜可投「${getStarSeasonCards(stats.seasonId).map((c) => c.name).join('」「')}」，已收集的卡随时能再投`;
    spStoryLineEl.title = spStoryLineEl.textContent;
  }

  const mainState = getStarMainState();
  if (btnStarMainEl) {
    btnStarMainEl.disabled = mainState.disabled;
    btnStarMainEl.textContent = mainState.label;
    btnStarMainEl.dataset.mode = mainState.mode;
    btnStarMainEl.classList.toggle('is-ready', !mainState.disabled && (mainState.mode === 'project' || mainState.mode === 'goodnight'));
  }
  if (btnStarHelperEl) {
    btnStarHelperEl.disabled = goodnightRun.status === 'running';
    btnStarHelperEl.textContent = active && starRun.phase === 'lit' ? '她换一张' : '她来点亮';
  }
  btnStarOffEl?.classList.toggle('hidden', !active);

  if (spAlbumGridEl) {
    const aKey = `${stats.seasonId}|${STAR_CARDS.map((c) => {
      const rec = sp.cards[c.id];
      return rec ? `${rec.lights}.${rec.dreams}` : '0';
    }).join(',')}|${active ? active.cardId : ''}`;
    if (aKey !== spAlbumKey) {
      spAlbumKey = aKey;
      spAlbumGridEl.innerHTML = STAR_CARDS.map((c) => {
        const rec = sp.cards[c.id];
        const found = Boolean(rec && rec.lights > 0);
        const inSeason = c.season === stats.seasonId;
        const lit = Boolean(active && active.cardId === c.id);
        const tag = found ? (rec.dreams > 0 ? `好梦${rec.dreams}` : c.short) : `${STAR_SEASON_NAMES[c.season]}季`;
        return `<button type="button" class="sp-album-chip${found ? ' is-found' : ''}${inSeason ? ' is-season' : ''}${lit ? ' is-lit' : ''}" data-card-id="${c.id}" style="--star-rgb:${c.rgb}" title="${c.name}${found ? ` · 投影 ${rec.lights} 次 · 好梦章 ${rec.dreams}` : inSeason ? ' · 当季可投影' : ` · ${STAR_SEASON_NAMES[c.season]}季可投影`}">
            <img loading="lazy" src="./assets/constellation_card.webp?v=hd60" alt="" class="sp-album-ico" />
            <em class="sp-album-tag">${tag}</em>
          </button>`;
      }).join('');
    }
  }
  if (spAlbumSubEl) {
    spAlbumSubEl.textContent = `星座卡册 ${stats.collected}/${stats.totalCards} · 好梦章 ${stats.totalDreams} · 今日奖励 ${stats.rewardsToday}/${stats.dailyRewards}`;
  }
  if (spFooterLineEl) {
    // 投影中：卡名与剩余时间上方夜空行已经写了，这里只留「一起晚安」的收益
    const spGoodnight = Math.round(STAR_RULES.goodnightBonus * 100);
    if (active) {
      setRuleLine(
        spFooterLineEl,
        `亮着时一起晚安：盖好梦章，金币 +${spGoodnight}%（每天首枚 +${STAR_RULES.dreamCoins}）`,
        `星光陪伴「${active.name}」还剩 ${active.minsLeft} 分：这时一起晚安，好梦章金币 +${spGoodnight}%，星座卡盖好梦章（每天第 1 枚 +${STAR_RULES.dreamCoins} 金币）`
      );
    } else {
      setRuleLine(
        spFooterLineEl,
        `投影 ${STAR_RULES.durationMin} 分钟；每天前 ${STAR_RULES.dailyRewards} 次 +${STAR_RULES.coinReward} 金币，新卡 +${STAR_RULES.newCardCoins}，睡前 ×${STAR_RULES.bedtimeMult}`,
        `点亮一次投影 ${STAR_RULES.durationMin} 分钟；每天前 ${STAR_RULES.dailyRewards} 次 +${STAR_RULES.coinReward} 金币，新星座卡再 +${STAR_RULES.newCardCoins}，睡前 ×${STAR_RULES.bedtimeMult}`
      );
    }
  }

  syncAr15Overlays(active);
  const sv = player.starVisual;
  sv.active = Boolean(active);
  sv.cardId = active ? active.cardId : card ? card.id : '';
  sv.rgb = active ? active.rgb : card ? card.rgb : '';
  sv.aligning = cardOpen;
  sv.taps = starRun.phase === 'lit' ? 0 : starRun.taps;
  sv.need = card ? card.taps : 0;
  sv.cheer = player.starCheerTimer || 0;
  // 场景标签保持短小：窄屏上不伸到陶艺架下面（剩余分钟在胶囊 / 卡片里看）
  sv.label = active ? `${active.short}星光` : '星空灯';
  syncStarRainPill(stats, null);
}

// ---------------- 窗边听雨角：按本地日期 + 时段轮换的窗外天气播放白噪音，每听满 5 分钟记一则听雨小记 ----------------
function getRainMainState() {
  if (rainRun.listening) {
    const left = Math.max(0, RAIN_RULES.noteMin * 60000 - rainRun.accMs);
    const mm = Math.floor(left / 60000);
    const ss = Math.floor((left % 60000) / 1000);
    return { mode: 'stop', disabled: false, label: `停一停 · 下则 ${mm}:${String(ss).padStart(2, '0')}` };
  }
  return { mode: 'start', disabled: false, label: '开始听雨' };
}

function startRainListening(opts = {}) {
  if (rainRun.listening) return { ok: false, reason: 'listening' };
  if (gameMode !== 'pet') switchMode('pet');
  const weather = getRainWeather();
  const rc = player.rainCorner;
  rainRun.listening = true;
  rainRun.weatherId = weather.id;
  rainRun.lastTickMs = ar15Clock.now();
  rainRun.accMs = 0;
  rainRun.sessionMs = 0;
  rainRun.sessionNotes = 0;
  rainRun.lastAction = 'start';
  rc.lastWeatherId = weather.id;
  player.idleTime = 0;
  player.happyTimer = 1.2;
  player.rainCheerTimer = 2.5;
  petAudio.startRainNoise(weather.id, { volume: (RAIN_VOLUME_BY_ID[rc.volumeId] || RAIN_VOLUMES[1]).mult, chimeOn: rc.chimeOn });
  petAudio.haptic('tap');
  if (!opts.silent) setPlayerEmote(`${weather.segName}窗外是「${weather.name}」~ ${weather.line}`, 2.6, 'happy', false);
  savePetState();
  syncRainCornerUI();
  return { ok: true, weatherId: weather.id, segId: weather.segId, audio: petAudio.getAr15AudioInfo() };
}

function stopRainListening(reason = 'stop') {
  if (!rainRun.listening) return { ok: false, reason: 'not_listening' };
  const notes = rainRun.sessionNotes;
  rainRun.listening = false;
  rainRun.accMs = 0;
  rainRun.lastAction = reason === 'mode' ? 'paused_by_mode' : reason === 'max' ? 'session_full' : 'stopped';
  petAudio.stopRainNoise();
  if (reason === 'stop') {
    playSfx('pat');
    setPlayerEmote(notes > 0 ? `这次一起听了 ${notes} 则雨声小记，心里软软的~` : '先停一停，雨还会在窗外等我们~', 1.8, 'happy', false);
  } else if (reason === 'max') {
    setPlayerEmote('听了一整个小时的雨啦，起来伸个懒腰吧~', 2.2, 'happy', false);
  }
  savePetState();
  syncRainCornerUI();
  return { ok: true, notes };
}

function recordRainNote(d = ar15Clock.date()) {
  const rc = player.rainCorner;
  const weather = getRainWeather(d);
  const todayKey = formatLocalDateKey(d);
  const key = weather.entryKey;
  const isNew = !(rc.entries[key] > 0);
  rc.entries[key] = (rc.entries[key] || 0) + 1;
  rc.totalNotes = (rc.totalNotes || 0) + 1;
  rc.totalMins = (rc.totalMins || 0) + RAIN_RULES.noteMin;
  rc.lastWeatherId = weather.id;
  if (rc.rewardDate !== todayKey) {
    rc.rewardDate = todayKey;
    rc.rewardCount = 0;
  }
  let reward = null;
  if (rc.rewardCount < RAIN_RULES.dailyNotes) {
    rc.rewardCount += 1;
    reward = { coins: RAIN_RULES.coinReward + (isNew ? RAIN_RULES.newEntryCoins : 0), xp: RAIN_RULES.xpReward };
  }
  rainRun.sessionNotes += 1;
  rainRun.lastAction = 'note';
  player.rainCheerTimer = 3;
  petAudio.playRainChime(rc.totalNotes);
  recordJournalActivity('rains', 1, d);
  if (reward) {
    addCoins(reward.coins, player.x + 22, player.y - 44, '听雨 ');
    addAffectionXp(reward.xp, '窗边听雨小记');
  }
  setPlayerEmote(
    `${isNew ? '听雨手帐新收录：' : '又记下一则听雨小记：'}${weather.segName}的「${weather.name}」~`,
    2.6,
    'happy',
    false
  );
  rainRun.lastResult = {
    entryKey: key,
    weatherId: weather.id,
    segId: weather.segId,
    isNew,
    reward,
    sessionNotes: rainRun.sessionNotes,
    totalNotes: rc.totalNotes
  };
  savePetState();
  syncDiaryBookUI();
  return { ...rainRun.lastResult };
}

function setRainVolume(volumeId) {
  const v = RAIN_VOLUME_BY_ID[volumeId];
  if (!v) return { ok: false, reason: 'invalid_volume' };
  player.rainCorner.volumeId = v.id;
  rainRun.lastAction = 'volume';
  if (rainRun.listening) petAudio.setRainMix({ volume: v.mult, chimeOn: player.rainCorner.chimeOn });
  playSfx('pat');
  savePetState();
  syncRainCornerUI();
  return { ok: true, volumeId: v.id, mult: v.mult, audio: petAudio.getAr15AudioInfo() };
}

function toggleRainChime() {
  const rc = player.rainCorner;
  rc.chimeOn = !rc.chimeOn;
  rainRun.lastAction = 'chime_toggle';
  if (rainRun.listening) petAudio.setRainMix({ volume: (RAIN_VOLUME_BY_ID[rc.volumeId] || RAIN_VOLUMES[1]).mult, chimeOn: rc.chimeOn });
  if (rc.chimeOn) petAudio.playRainChime(1);
  else playSfx('pat');
  savePetState();
  syncRainCornerUI();
  return { ok: true, chimeOn: rc.chimeOn };
}

// 点窗边的风铃：叮一声，场景里的雨滴风铃也跟着晃
function ringRainChime() {
  rainRun.ringSeq += 1;
  rainRun.ring = 1.4;
  rainRun.lastAction = 'ring';
  player.idleTime = 0;
  petAudio.playRainChime(rainRun.ringSeq + 2);
  setPlayerEmote(RAIN_RING_LINES[(rainRun.ringSeq - 1) % RAIN_RING_LINES.length], 1.8, 'happy', false);
  syncRainCornerUI();
  return { ok: true, ringSeq: rainRun.ringSeq, audio: petAudio.getAr15AudioInfo() };
}

function handleRainMainAction() {
  return rainRun.listening ? stopRainListening('stop') : startRainListening();
}

// 她来陪听：按时段挑音量（夜里 / 清晨轻一点），开着风铃陪主人听；已经在听时就替主人摇一下风铃
function rainHelper() {
  rainRun.helperSeq += 1;
  if (rainRun.listening) return { ...ringRainChime(), step: 'ring' };
  const seg = getRainSegment();
  const volumeId = seg.id === 'night' || seg.id === 'dawn' ? 'soft' : 'mid';
  player.rainCorner.volumeId = volumeId;
  player.rainCorner.chimeOn = true;
  const res = startRainListening({ silent: true });
  const weather = getRainWeather();
  setPlayerEmote(`我把音量调成「${RAIN_VOLUME_BY_ID[volumeId].name}」，抱着坐垫陪你听${weather.segName}的「${weather.name}」~`, 2.6, 'happy', false);
  return { ...res, volumeId, step: 'helper' };
}

let rcVolumeKey = null;
let rcCodexKey = null;

function syncRainCornerUI() {
  const rc = player.rainCorner;
  if (!rc) return;
  const d = ar15Clock.date();
  const stats = getRainStats(d);
  const weather = stats.weather;
  const listening = rainRun.listening;
  const cardOpen = isAr15CardOpen('rain');
  const playing = listening ? RAIN_WEATHER_BY_ID[rainRun.weatherId] || weather : weather;
  const vol = RAIN_VOLUME_BY_ID[rc.volumeId] || RAIN_VOLUMES[1];

  if (rcSummaryPillEl) rcSummaryPillEl.textContent = `听雨 ${stats.totalNotes} 则 · 手帐 ${stats.entries}/${stats.totalEntries}`;
  if (rcWeatherRowEl) {
    rcWeatherRowEl.dataset.weather = weather.id;
    rcWeatherRowEl.dataset.seg = weather.segId;
  }
  if (rcWeatherIcoEl && rcWeatherIcoEl.getAttribute('src') !== weather.icon) rcWeatherIcoEl.setAttribute('src', weather.icon);
  if (rcWeatherNameEl) rcWeatherNameEl.textContent = `${weather.segName} · ${weather.name}`;
  if (rcWeatherSubEl) {
    rcWeatherSubEl.textContent = listening
      ? `听雨中 ${stats.sessionMins} 分 · 本次 ${rainRun.sessionNotes} 则小记`
      : `${d.getMonth() + 1}月${d.getDate()}日 · 按本地日期与时段轮换 · ${weather.next} 换下一段`;
  }
  if (rcWindowEl) {
    rcWindowEl.dataset.listening = listening ? '1' : '0';
    rcWindowEl.dataset.weather = playing.id;
    rcWindowEl.style.setProperty('--rain-rgb', playing.rgb);
    rcWindowEl.classList.toggle('is-ringing', rainRun.ring > 0);
  }
  if (rcStageTagEl) {
    rcStageTagEl.textContent = listening ? `${playing.short} · 听雨 ${stats.sessionMins} 分` : `${weather.short} · 还没开始`;
  }
  if (rcVolumeRowEl) {
    const vKey = RAIN_VOLUMES.map((v) => v.id).join(',');
    if (vKey !== rcVolumeKey) {
      rcVolumeKey = vKey;
      rcVolumeRowEl.innerHTML = `${RAIN_VOLUMES.map(
        (v) => `<button type="button" class="rc-volume-chip" data-volume-id="${v.id}">
            <img loading="lazy" src="./assets/rain_chime.webp?v=hd60" alt="" class="rc-volume-ico" style="--vol:${v.mult}" />
            <span class="rc-volume-name">${v.name}</span>
          </button>`
      ).join('')}<button type="button" class="rc-volume-chip rc-chime-chip" data-chime-toggle="1">
            <img loading="lazy" src="./assets/rain_chime.webp?v=hd60" alt="" class="rc-volume-ico" />
            <span class="rc-volume-name" id="rc-chime-label">风铃</span>
          </button>`;
    }
    rcVolumeRowEl.querySelectorAll('[data-volume-id]').forEach((chip) => {
      chip.classList.toggle('active', chip.dataset.volumeId === vol.id);
      chip.title = `白噪音音量「${RAIN_VOLUME_BY_ID[chip.dataset.volumeId].name}」`;
    });
    const chimeChip = rcVolumeRowEl.querySelector('[data-chime-toggle]');
    if (chimeChip) {
      chimeChip.classList.toggle('active', Boolean(rc.chimeOn));
      chimeChip.title = rc.chimeOn ? '风铃：开（点一下关掉）' : '风铃：关（点一下打开）';
      const lbl = chimeChip.querySelector('.rc-volume-name');
      if (lbl) lbl.textContent = rc.chimeOn ? '风铃开' : '风铃关';
    }
  }
  if (rcMixLineEl) {
    rcMixLineEl.textContent = `白噪音：${playing.mix}${rc.chimeOn && !playing.mix.includes('风铃') ? ' · 风铃' : ''}${rc.chimeOn ? '' : ' · 风铃关'} · 音量${vol.name}`;
  }

  const mainState = getRainMainState();
  if (btnRainMainEl) {
    btnRainMainEl.disabled = mainState.disabled;
    btnRainMainEl.textContent = mainState.label;
    btnRainMainEl.dataset.mode = mainState.mode;
    btnRainMainEl.classList.toggle('is-ready', mainState.mode === 'start');
  }
  if (btnRainHelperEl) btnRainHelperEl.textContent = listening ? '她摇风铃' : '她来陪听';

  if (rcCodexGridEl) {
    const entries = rc.entries || {};
    const cKey = `${weather.segId}|${RAIN_WEATHERS.map((w) => (Number(entries[`${weather.segId}_${w.id}`]) > 0 ? 1 : 0)).join('')}|${weather.id}`;
    if (cKey !== rcCodexKey) {
      rcCodexKey = cKey;
      rcCodexGridEl.innerHTML = RAIN_WEATHERS.map((w) => {
        const found = Number(entries[`${weather.segId}_${w.id}`]) > 0;
        const now = w.id === weather.id;
        return `<span class="rc-codex-chip${found ? ' is-found' : ''}${now ? ' is-now' : ''}" data-entry-key="${weather.segId}_${w.id}" style="--rain-rgb:${w.rgb}" title="${weather.segName} · ${w.name}${found ? ' · 已收录' : ' · 未收录'}">
            <img loading="lazy" src="${w.icon}" alt="" class="rc-codex-ico" />
            <em class="rc-codex-tag">${found ? w.short : '待收录'}</em>
          </span>`;
      }).join('');
    }
  }
  if (rcCodexSubEl) {
    rcCodexSubEl.textContent = `听雨手帐 ${stats.entries}/${stats.totalEntries} · ${weather.segName} ${stats.segFound}/${RAIN_WEATHERS.length} · 今日小记 ${stats.rewardsToday}/${stats.dailyNotes}`;
  }
  if (rcFooterLineEl) {
    const rcCalm = Math.round(RAIN_RULES.calmBonus * 100);
    if (listening) {
      setRuleLine(
        rcFooterLineEl,
        `听雨安神：亲密 +${rcCalm}%，每满 ${RAIN_RULES.noteMin} 分钟记一则（单次至多 ${RAIN_RULES.maxSessionMin} 分）`,
        `听雨安神：一边听雨日常亲密 +${rcCalm}%，每听满 ${RAIN_RULES.noteMin} 分钟记一则小记（单次最多 ${RAIN_RULES.maxSessionMin} 分钟）`
      );
    } else {
      setRuleLine(
        rcFooterLineEl,
        `听雨亲密 +${rcCalm}%；每满 ${RAIN_RULES.noteMin} 分钟记一则，每天前 ${RAIN_RULES.dailyNotes} 则 +${RAIN_RULES.coinReward} 金币，新收录 +${RAIN_RULES.newEntryCoins}`,
        `每听满 ${RAIN_RULES.noteMin} 分钟记一则听雨小记：每天前 ${RAIN_RULES.dailyNotes} 则 +${RAIN_RULES.coinReward} 金币，手帐新收录再 +${RAIN_RULES.newEntryCoins}；听雨时亲密 +${rcCalm}%`
      );
    }
  }

  syncAr15Overlays(undefined, weather);
  const rv = player.rainVisual;
  rv.listening = listening;
  rv.weatherId = playing.id;
  rv.rgb = playing.rgb;
  rv.cardOpen = cardOpen;
  rv.ring = rainRun.ring;
  rv.cheer = player.rainCheerTimer || 0;
  rv.label = listening ? `${playing.short}中` : '听雨角';
  syncStarRainPill(null, stats);
}

// 每秒复核一次：投影按可注入时钟到点熄灭；听雨按可注入时钟累计，满 5 分钟记一则小记；跨过时段时白噪音跟着窗外天气换
function refreshAr15Clock() {
  const nowMs = ar15Clock.now();
  const d = new Date(nowMs);
  const active = getActiveProjection(nowMs);
  let starChanged = false;
  if (starRun.wasActive && !active) {
    starRun.wasActive = false;
    if (player.starProjector.active) {
      player.starProjector.active = null;
      savePetState();
    }
    if (starRun.phase === 'lit') {
      starRun.phase = STAR_CARD_BY_ID[starRun.cardId] ? 'dial' : 'pick';
      starRun.taps = 0;
    }
    starRun.lastAction = 'faded';
    if (gameMode === 'pet') setPlayerEmote('星空投影慢慢暗下去啦，星星们回到窗外了~', 1.8, 'happy', false);
    starChanged = true;
  } else {
    starRun.wasActive = Boolean(active);
    if (!active && player.starProjector.active && Number(player.starProjector.active.endMs) <= nowMs) {
      // 旧存档里早已熄灭的投影：静默清掉
      player.starProjector.active = null;
      savePetState();
    }
  }

  let rainChanged = false;
  if (rainRun.listening) {
    if (gameMode !== 'pet') {
      stopRainListening('mode');
      rainChanged = true;
    } else {
      const delta = Math.max(0, Math.min(6 * 3600000, nowMs - (rainRun.lastTickMs || nowMs)));
      rainRun.lastTickMs = nowMs;
      rainRun.accMs += delta;
      rainRun.sessionMs += delta;
      const noteMs = RAIN_RULES.noteMin * 60000;
      const maxNotes = Math.floor(RAIN_RULES.maxSessionMin / RAIN_RULES.noteMin);
      let guard = 0;
      while (rainRun.accMs >= noteMs && rainRun.sessionNotes < maxNotes && guard < 24) {
        rainRun.accMs -= noteMs;
        recordRainNote(new Date(nowMs - rainRun.accMs));
        guard += 1;
        rainChanged = true;
      }
      const weather = getRainWeather(d);
      if (weather.id !== rainRun.weatherId) {
        rainRun.weatherId = weather.id;
        player.rainCorner.lastWeatherId = weather.id;
        petAudio.setRainMix({ weatherId: weather.id });
        setPlayerEmote(`窗外换成${weather.segName}的「${weather.name}」啦~`, 2.0, 'happy', false);
        rainChanged = true;
      }
      if (rainRun.sessionNotes >= maxNotes) {
        stopRainListening('max');
        rainChanged = true;
      }
    }
  }

  const dayKey = formatLocalDateKey(d);
  if (dayKey !== rainRun.dayKey) {
    rainRun.dayKey = dayKey;
    starChanged = true;
    rainChanged = true;
  }
  if (starChanged || active || isAr15CardOpen('star')) syncStarProjectorUI();
  if (rainChanged || rainRun.listening || isAr15CardOpen('rain')) syncRainCornerUI();
  if (!starChanged && !active && !rainChanged && !rainRun.listening) syncStarRainPill();
}

// ---------------- AR-15 合并紧凑胶囊：星空投影倒计时 + 听雨中，窄屏放不下就收起 ----------------
function syncStarRainPill(ssIn = null, rsIn = null) {
  if (!srPillEl) return;
  const ss = ssIn || getStarStats();
  const rs = rsIn || getRainStats();
  const showStar = Boolean(ss.active);
  const showRain = Boolean(rainRun.listening);
  srPillEl.classList.toggle('hidden', !(gameMode === 'pet' && (showStar || showRain)));
  srPillEl.classList.toggle('has-star', showStar);
  srSegStarEl?.classList.toggle('hidden', !showStar);
  srSegRainEl?.classList.toggle('hidden', !showRain);
  // 星光倒计时更有时效：两段都在时优先留星空段
  srSegStarEl?.classList.toggle('is-priority', showStar);
  srSegRainEl?.classList.toggle('is-priority', !showStar);
  if (srPillStarEl) srPillStarEl.textContent = ss.active ? `${ss.active.minsLeft}分` : '';
  const playing = RAIN_WEATHER_BY_ID[rainRun.weatherId] || rs.weather;
  if (srPillRainEl) srPillRainEl.textContent = showRain ? playing.short : '';
  if (ss.active) srPillEl.style.setProperty('--star-rgb', ss.active.rgb);
  srPillEl.title = `${ss.active ? `星空投影「${ss.active.name}」还剩 ${ss.active.minsLeft} 分钟` : '卧室星空投影灯'} · ${showRain ? `窗边听雨「${playing.name}」中` : '窗边听雨角'}`;
  fitStarRainPill();
}

// 与 AR-11 ~ AR-14 同一条规则：窄屏胶囊行已排满时不为 AR-15 胶囊新开一行（offsetTop 不受旋转舞台变换影响），
// 两段都放不下先只留优先的一段，仍放不下才整颗收起；只读 DOM，任何区段初始化时调用都不会触发 TDZ
function fitStarRainPill() {
  const fitted = fitStarRainPillOnly();
  // AR-16 合并胶囊排在其后：AR-15 胶囊显隐 / 收起变化后立刻复核 AR-16 胶囊是否还放得下
  fitStitchHearthPill();
  return fitted;
}

function fitStarRainPillOnly() {
  const pill = document.getElementById('star-rain-pill');
  if (!pill) return false;
  pill.classList.remove('sr-no-room', 'sr-solo');
  if (pill.classList.contains('hidden') || pill.offsetParent === null) return false;
  const compact = window.matchMedia ? window.matchMedia('(max-width: 920px), (max-height: 430px)') : null;
  if (!compact || !compact.matches) return true;
  const row = pill.parentElement;
  const others = row
    ? Array.from(row.children).filter(
        (b) => b !== pill && b.id !== 'stitch-hearth-pill' && !b.classList.contains('hidden') && b.offsetParent !== null
      )
    : [];
  if (!others.length) return true;
  const mid = (b) => b.offsetTop + b.offsetHeight / 2;
  const lastRowMid = Math.max(...others.map(mid));
  if (mid(pill) <= lastRowMid + 6) return true;
  const shownSegs = Array.from(pill.querySelectorAll('.sr-seg')).filter((s) => !s.classList.contains('hidden'));
  if (shownSegs.length > 1) {
    pill.classList.add('sr-solo');
    if (mid(pill) <= lastRowMid + 6) return true;
    pill.classList.remove('sr-solo');
  }
  pill.classList.add('sr-no-room');
  return false;
}

function openAr15Card(cardEl) {
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
  dismissAr15Cards(); dismissAr16Cards(); dismissAr17Cards();
  dismissPolaroid();
  closeAlbumLightbox();
  cardEl.classList.remove('hidden');
}

function openStarProjectorCard() {
  if (!starCardEl) return { ok: false };
  openAr15Card(starCardEl);
  syncStarProjectorUI();
  syncRainCornerUI();
  return { ok: true };
}

function openRainCornerCard() {
  if (!rainCardEl) return { ok: false };
  openAr15Card(rainCardEl);
  syncRainCornerUI();
  syncStarProjectorUI();
  return { ok: true };
}

function handleAr15CanvasTap(pt) {
  const L = getAr15CornerLayout(W, H, player.sillCamX || 0);
  const P = L.projector.hit;
  if (Math.hypot(pt.x - P.x, pt.y - P.y) < P.r) {
    openStarProjectorCard();
    petAudio.playStarDial(0);
    return true;
  }
  const R = L.rainHit;
  if (pt.x >= R.x && pt.x <= R.x + R.w && pt.y >= R.y && pt.y <= R.y + R.h) {
    openRainCornerCard();
    petAudio.playRainChime(0);
    return true;
  }
  return false;
}

let srPillFitTimer = 0;
function updateAr15Companions(dt) {
  if (player.starCheerTimer > 0) player.starCheerTimer = Math.max(0, player.starCheerTimer - dt);
  if (player.rainCheerTimer > 0) player.rainCheerTimer = Math.max(0, player.rainCheerTimer - dt);
  if (starRun.spinFlash > 0) {
    starRun.spinFlash = Math.max(0, starRun.spinFlash - dt);
    if (starRun.spinFlash <= 0) spDomeEl?.classList.remove('is-spinning');
  }
  if (rainRun.ring > 0) {
    rainRun.ring = Math.max(0, rainRun.ring - dt);
    if (rainRun.ring <= 0) rcWindowEl?.classList.remove('is-ringing');
  }
  rainRun.tickAcc -= dt;
  if (rainRun.tickAcc <= 0) {
    rainRun.tickAcc = 1;
    refreshAr15Clock();
  }
  srPillFitTimer -= dt;
  if (srPillFitTimer <= 0) {
    srPillFitTimer = 0.5;
    fitStarRainPill();
  }
  const sv = player.starVisual;
  sv.aligning = isAr15CardOpen('star');
  sv.cheer = player.starCheerTimer || 0;
  const rv = player.rainVisual;
  rv.cardOpen = isAr15CardOpen('rain');
  rv.ring = rainRun.ring;
  rv.cheer = player.rainCheerTimer || 0;
}
// [[split end]]
export {
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
  openPotteryWardForShift,
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
  dialStarProjector,
  lightStarProjection,
  stopStarProjection,
  awardStarDream,
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
  fitStarRainPill,
  openStarProjectorCard,
  openRainCornerCard,
  handleAr15CanvasTap,
  updateAr15Companions
};
