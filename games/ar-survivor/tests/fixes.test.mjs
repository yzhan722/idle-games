// fixes.test.mjs — 拆分后小修、发行前审查修复的单测（不开浏览器）：node --test games/ar-survivor/tests/fixes.test.mjs
// 从源码里取出单个函数，配上最小的假元素执行；不加载 game.js 模块，不跑游戏循环
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { readGameSource } from './_split_lib.mjs';
import { fitAlbum, isQuotaError } from '../public/save-core.js';

const PUB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const SRC = readGameSource(PUB);

// 顶层语句都以列首的右括号收尾
function take(head) {
  const i = SRC.indexOf(head);
  assert.ok(i >= 0, `源码里找不到 ${head}`);
  const end = SRC.slice(i).match(/\n\}(?:\)|, true\))?;?\n/);
  return SRC.slice(i, i + end.index + end[0].length);
}

class FakeEl {
  constructor() {
    this.handlers = {};
    this.children = [];
    this.dataset = {};
    this.classList = { set: new Set(), add: (c) => this.classList.set.add(c), remove: (c) => this.classList.set.delete(c), contains: (c) => this.classList.set.has(c) };
  }
  addEventListener(type, fn) {
    (this.handlers[type] ||= []).push(fn);
  }
  appendChild(el) {
    this.children.push(el);
  }
  set innerHTML(v) {
    this.html = v;
    this.children = [];
  }
  fire(type, extra = {}) {
    const e = { type, detail: 0, clientX: 10, clientY: 10, preventDefault() {}, stopPropagation() {}, ...extra };
    for (const fn of this.handlers[type] || []) fn(e);
  }
}

// 一次真实点按：按下 → 抬起（window 捕获先收到）→ 浏览器补发 click；clickOn 是补发时手指下面的元素
function makeWorld(extra = {}) {
  const clock = { t: 10000 };
  const win = new FakeEl();
  const ctx = vm.createContext({ window: win, performance: { now: () => clock.t }, Math, ...extra });
  vm.runInContext(SRC.match(/let lastPointerUpAt = -1e9;\n/)[0] + take("window.addEventListener('pointerup', () => {\n  lastPointerUpAt") + take('function isTapEcho(e) {'), ctx);
  const press = (el, { hold = 80, clickOn = el } = {}) => {
    el.fire('pointerdown');
    clock.t += hold;
    win.fire('pointerup');
    el.fire('pointerup');
    clock.t += 5;
    if (clickOn) clickOn.fire('click', { detail: 1 });
  };
  return { clock, ctx, press };
}

test('HUD 按钮：按住 0.6 秒再松只触发一次；代码点击和键盘仍然有效', () => {
  const { ctx, clock, press } = makeWorld();
  vm.runInContext(take('function bindHudTap(el, callback) {'), ctx);
  const el = new FakeEl();
  let n = 0;
  ctx.bindHudTap(el, () => (n += 1));
  press(el);
  assert.equal(n, 1);
  clock.t += 2000;
  press(el, { hold: 600 });
  assert.equal(n, 2);
  clock.t += 2000;
  el.fire('click');
  assert.equal(n, 3);
});

test('点按后换了界面：补发的 click 落到新按钮上不触发', () => {
  const { ctx, clock, press } = makeWorld();
  vm.runInContext(take('function bindHudTap(el, callback) {') + take('function bindCardTap(card, callback) {'), ctx);
  const a = new FakeEl();
  const hud = new FakeEl();
  const card1 = new FakeEl();
  const card2 = new FakeEl();
  const log = [];
  ctx.bindHudTap(a, () => log.push('a'));
  ctx.bindHudTap(hud, () => log.push('hud'));
  ctx.bindCardTap(card1, () => log.push('card1'));
  ctx.bindCardTap(card2, () => log.push('card2'));
  press(a, { clickOn: hud });
  press(a, { clickOn: card2 });
  press(card1, { clickOn: card2 }); // 买升级后抽屉重绘，手指下已经是新卡片
  assert.deepEqual(log, ['a', 'a', 'card1']);
  clock.t += 2000;
  press(card2);
  card2.fire('click'); // 同一下点按 400ms 内的重复 click 仍按原来的规则忽略
  clock.t += 2000;
  card2.fire('click');
  assert.deepEqual(log, ['a', 'a', 'card1', 'card2', 'card2']);
});

test('打工三选一排队：选完一张，补发的 click 不会把下一张也选掉', () => {
  const grid = new FakeEl();
  const modal = new FakeEl();
  const els = { 'survivor-skill-modal': modal, 'surv-card-grid': grid };
  const picked = [];
  let round = 0;
  const run = { choosingSkill: false, queuedModals: [], currentChoices: [], shiftLv: 2 };
  const { ctx, press } = makeWorld({
    gameMode: 'survivor',
    survivorRun: run,
    document: { getElementById: (id) => els[id] || null, createElement: () => new FakeEl() },
    playSfx() {},
    rollSurvivorChoices: () => {
      round += 1;
      return [{ id: `r${round}a` }, { id: `r${round}b` }, { id: `r${round}c` }];
    },
    applySurvivorSkillChoice(id) {
      picked.push(id);
      run.choosingSkill = false;
      if (run.queuedModals.length) ctx.openSurvivorSkillModal(run.queuedModals.shift());
    }
  });
  vm.runInContext(take('function openSurvivorSkillModal('), ctx);
  ctx.openSurvivorSkillModal('一');
  ctx.openSurvivorSkillModal('二');
  assert.deepEqual(run.queuedModals, ['二']);
  const first = grid.children[0];
  first.fire('pointerdown');
  ctx.window.fire('pointerup');
  first.fire('pointerup');
  grid.children[0].fire('click', { detail: 1 }); // 手机：同一位置已经是第二张的卡
  assert.deepEqual(picked, ['r1a']);
  press(grid.children[1], { clickOn: null });
  assert.deepEqual(picked, ['r1a', 'r2b']);
});

test('猜拳：出完之后面板还没收，再点选项不再结算', () => {
  let n = 0;
  const btn = new FakeEl();
  btn.dataset.rps = 'rock';
  const rpsGame = { active: true, lockedMove: null };
  const ctx = vm.createContext({
    rpsChoiceBtns: [btn],
    rpsGame,
    bindHudTap: (el, cb) => el.addEventListener('tap', cb),
    resolveRpsRound: () => {
      n += 1;
      rpsGame.active = false;
    }
  });
  vm.runInContext(take('\nfor (const btn of rpsChoiceBtns) {'), ctx);
  btn.fire('tap');
  btn.fire('tap');
  btn.fire('tap');
  assert.equal(n, 1);
});

test('接美食开始时清掉猜拳留下的收面板计时器', () => {
  const src = take('function startPalmCatchGame() {');
  const cleared = [];
  const body = src.slice(src.indexOf('  if (rpsGame.hideTimer) {'), src.indexOf('  palmCatchGame.active = true;'));
  const rpsGame = { hideTimer: 7 };
  vm.runInNewContext(body, { rpsGame, clearTimeout: (id) => cleared.push(id) });
  assert.deepEqual(cleared, [7]);
  assert.equal(rpsGame.hideTimer, null);
});

test('读档：买过跑鞋的多一次连跳；没买、老存档没有 weapons 都是 3 次', () => {
  const expr = SRC.match(/\n  maxJumps: (.+),\n  coyoteTimer/)[1];
  const jumps = (savedPet) => vm.runInNewContext(expr, { savedPet });
  assert.equal(jumps({ weapons: { blaster: 1, teaBlade: 1, magnet: 1, boots: 2 } }), 4);
  assert.equal(jumps({ weapons: { blaster: 1, teaBlade: 1, magnet: 1, boots: 0 } }), 3);
  assert.equal(jumps({}), 3);
});

test('窗口失焦：松开所有方向键', () => {
  const win = new FakeEl();
  const input = { left: true, right: true, down: true, joyX: 0, joyY: 0 };
  vm.runInNewContext(take("window.addEventListener('blur', () => {"), { window: win, input });
  win.fire('blur');
  assert.deepEqual([input.left, input.right, input.down], [false, false, false]);
});

// ---------- 2026-11-26 发行前审查 ----------

test('打工中再点「打工」不重开一班；别的模式键照常；补发的 click 不切模式', () => {
  const { ctx, press } = makeWorld({ log: [] });
  const btns = ['pet', 'parkour', 'survivor'].map((mode) => {
    const el = new FakeEl();
    el.dataset.mode = mode;
    return el;
  });
  ctx.document = { querySelectorAll: () => btns };
  vm.runInContext("var gameMode = 'pet'; function switchMode(m) { log.push(m); gameMode = m; }", ctx);
  vm.runInContext(take("document.querySelectorAll('.mode-btn').forEach((btn) => {"), ctx);
  const [pet, parkour, survivor] = btns;
  press(survivor);
  press(survivor);
  assert.deepEqual(ctx.log, ['survivor']);
  press(new FakeEl(), { clickOn: parkour }); // 别的界面收起后，补发的 click 落在模式键上
  assert.deepEqual(ctx.log, ['survivor']);
  press(pet);
  press(pet);
  assert.deepEqual(ctx.log, ['survivor', 'pet', 'pet']);
  parkour.fire('click'); // 键盘
  assert.equal(ctx.gameMode, 'parkour');
});

function touchWorld() {
  const win = new FakeEl();
  const player = { x: 100, y: 200, isPickedUp: false, dragVx: 0, dragVy: 0 };
  const petTouch = { active: false, pointerId: null, mode: 'touch' };
  const ctx = vm.createContext({
    window: win,
    player,
    petTouch,
    draggedItem: null,
    draggedFurniture: null,
    vision: { palmTarget: null },
    canvas: {},
    W: 800,
    H: 400,
    setPlayerEmote() {},
    savePetState() {},
    playSfx() {},
    spawnInteractVfx() {},
    Math
  });
  vm.runInContext(
    `${take('function finishCanvasTouch(e) {')}window.addEventListener('pointerup', finishCanvasTouch);window.addEventListener('blur', () => finishCanvasTouch());`,
    ctx
  );
  return { win, player, petTouch, ctx };
}

test('拎着她时抬起另一根手指不放下；抬起拎着的那根、或切走窗口才放下', () => {
  const { win, player, petTouch } = touchWorld();
  const pick = () => {
    Object.assign(petTouch, { active: true, pointerId: 7, mode: 'pickup' });
    player.isPickedUp = true;
  };
  pick();
  win.fire('pointerup', { pointerId: 3 });
  assert.equal(player.isPickedUp, true);
  win.fire('pointerup', { pointerId: 7 });
  assert.deepEqual([player.isPickedUp, petTouch.active], [false, false]);
  pick();
  win.fire('blur');
  assert.equal(player.isPickedUp, false);
  // 状态错开时也不会卡在半空
  pick();
  petTouch.mode = 'touch';
  win.fire('pointerup', { pointerId: 7 });
  assert.equal(player.isPickedUp, false);
});

test('拖着的食物只认按住它的那根手指', () => {
  const { win, ctx } = touchWorld();
  ctx.draggedItem = { dragPointerId: 4 };
  win.fire('pointerup', { pointerId: 9 });
  assert.ok(ctx.draggedItem);
  win.fire('pointerup', { pointerId: 4 });
  assert.equal(ctx.draggedItem, null);
});

test('番茄钟 / 晚安按真实时间走：后台的时间补上，暂停不算，时钟回拨不倒退', () => {
  const ctx = vm.createContext({ Date, pomodoroRun: { status: 'running' }, got: [] });
  vm.runInContext(`${take('function takeRealElapsed(run, dt')}${take('function updatePomodoroCompanion(dt) {')}function advancePomodoroTime(s) { got.push(s); }`, ctx);
  const run = {};
  assert.equal(ctx.takeRealElapsed(run, 0.016, 1000), 0.016); // 第一帧
  assert.equal(ctx.takeRealElapsed(run, 0.016, 1017), 0.017);
  assert.equal(ctx.takeRealElapsed(run, 0.05, 1017 + 600000), 600); // 后台十分钟，帧只给 0.05
  assert.equal(ctx.takeRealElapsed(run, 0.02, 5000), 0.02); // 时钟往回拨
  assert.equal(ctx.takeRealElapsed(run, 0.02, 5030), 0.03);
  ctx.updatePomodoroCompanion(0.016);
  assert.ok(ctx.pomodoroRun.tickAt > 0);
  ctx.pomodoroRun.status = 'paused';
  ctx.updatePomodoroCompanion(0.016);
  assert.equal(ctx.pomodoroRun.tickAt, 0); // 暂停后再继续，从头计
  assert.deepEqual(ctx.got, [0.016]);
  assert.match(SRC, /advanceGoodnightTime\(takeRealElapsed\(goodnightRun, dt\)\);/);
});

test('晚安提前叫醒：按实际分钟，最少 5 分钟，不超过计划；正常结束按计划', () => {
  const expr = SRC.match(/\n  const elapsedMins = (.+);\n  const effectiveMins = (.+);\n/);
  const mins = (elapsedSec, plannedMins, fromEarlyWake) =>
    vm.runInNewContext(`const elapsedMins = ${expr[1]}; ${expr[2]}`, { Math, goodnightRun: { elapsedSec }, plannedMins, fromEarlyWake });
  assert.equal(mins(3, 45, true), 5); // 原来给 23
  assert.equal(mins(29, 30, true), 5);
  assert.equal(mins(12 * 60, 30, true), 12);
  assert.equal(mins(99 * 60, 30, true), 30);
  assert.equal(mins(1800, 30, false), 30);
});

test('讨伐首领的亲密走打工份额；其余陪伴互动不变', () => {
  assert.match(SRC, /addAffectionXp\(45, '讨伐班次首领 \+45 亲密', 'work'\);/);
  assert.match(SRC, /function addAffectionXp\(amount, labelText, source = 'care'\) \{/);
  assert.match(SRC, /dayKey: formatLocalDateKey\(\), source \}\);/);
  assert.equal([...SRC.matchAll(/addAffectionXp\([^;]*'work'\)/g)].length, 1);
});

test('旧档的 weapons 缺字段：补默认值，跳跃力不会是 NaN', () => {
  const body = SRC.match(/\n  weapons: (\{\n[^}]*\|\| \{\}\)\n  \}),/)[1];
  const read = (savedPet) => vm.runInNewContext(`(${body})`, { savedPet });
  assert.deepEqual({ ...read({}) }, { blaster: 1, teaBlade: 1, magnet: 1, boots: 0 });
  assert.deepEqual({ ...read({ weapons: { blaster: 4 } }) }, { blaster: 4, teaBlade: 1, magnet: 1, boots: 0 });
  assert.deepEqual({ ...read({ weapons: { blaster: 2, teaBlade: 3, magnet: 2, boots: 5 } }) }, { blaster: 2, teaBlade: 3, magnet: 2, boots: 5 });
});

function cameraWorld({ opens, saved = '' }) {
  const log = { emotes: [], saved, mode: 'sim' };
  const vision = {
    startCamera: async () => {
      if (opens) log.mode = 'camera';
      return opens;
    },
    enableSimMode: () => (log.mode = 'sim')
  };
  const ctx = vm.createContext({
    vision,
    W: 800,
    H: 400,
    skipCameraOnlyWish() {},
    syncMemoryBookUI() {},
    setPlayerEmote: (t) => log.emotes.push(t),
    saveCameraChoice: (c) => (log.saved = c)
  });
  vm.runInContext(take('async function applyCameraChoice(choice) {'), ctx);
  return { ctx, log };
}

test('摄像头选择：开成了才记「开」；没开成说一声、不记；改了主意的旧请求什么都不做', async () => {
  let w = cameraWorld({ opens: true });
  await w.ctx.applyCameraChoice('on');
  assert.deepEqual([w.log.saved, w.log.emotes.length], ['on', 0]);
  w = cameraWorld({ opens: false });
  await w.ctx.applyCameraChoice('on');
  assert.deepEqual([w.log.saved, w.log.emotes.length], ['', 1]);
  w = cameraWorld({ opens: false, saved: 'on' }); // 以前开成过、这次被占用：记住的不变
  await w.ctx.applyCameraChoice('on');
  assert.equal(w.log.saved, 'on');
  w = cameraWorld({ opens: null });
  await w.ctx.applyCameraChoice('on');
  assert.deepEqual([w.log.saved, w.log.emotes.length], ['', 0]);
  w = cameraWorld({ opens: true, saved: 'on' });
  await w.ctx.applyCameraChoice('off');
  assert.deepEqual([w.log.saved, w.log.mode], ['off', 'sim']);
});

test('打工 / 摘星时摄像头说明卡 / 比耶说明卡开着：这一帧不推进', () => {
  assert.match(SRC, /const noticeOpen = isCameraNoticeOpen\(\) \|\| isPeaceSnapNoticeOpen\(\);\n  if \(\(gameMode === 'survivor' && \(survivorRun\.choosingSkill \|\| noticeOpen\)\) \|\| \(gameMode === 'parkour' && noticeOpen\)\) \{/);
  for (const name of ['isCameraNoticeOpen', 'isPeaceSnapNoticeOpen']) {
    const el = new FakeEl();
    const ctx = vm.createContext({ document: { getElementById: () => el } });
    vm.runInContext(take(`function ${name}() {`), ctx);
    assert.equal(ctx[name](), true, name);
    el.classList.add('hidden');
    assert.equal(ctx[name](), false, name);
  }
});

function albumWorld(list, setItem) {
  const warned = [];
  const ctx = vm.createContext({
    polaroidAlbum: list,
    POLAROID_ALBUM_MAX: 24,
    POLAROID_ALBUM_KEY: 'k',
    localStorage: { setItem },
    JSON,
    fitAlbum,
    isQuotaError,
    syncAlbumCountBadge() {},
    warnSaveTrouble: (q) => warned.push(q)
  });
  vm.runInContext(take('function persistPolaroidAlbum() {') + take('function isAlbumAllPinned() {'), ctx);
  return { ctx, warned };
}

test('相册 24 张全钉住：新照片没收进去，能认出来；没钉满时照常收', () => {
  const pinned = Array.from({ length: 24 }, (_, i) => ({ id: `p${i}`, pinned: true }));
  const fresh = { id: 'new', pinned: false };
  let w = albumWorld([fresh, ...pinned], () => {});
  assert.equal(w.ctx.persistPolaroidAlbum(), true);
  assert.equal(w.ctx.polaroidAlbum.includes(fresh), false);
  assert.equal(w.ctx.isAlbumAllPinned(), true);
  w = albumWorld([fresh, { id: 'old', pinned: false }, ...pinned.slice(1)], () => {});
  w.ctx.persistPolaroidAlbum();
  assert.deepEqual([w.ctx.polaroidAlbum.includes(fresh), w.ctx.polaroidAlbum.length, w.warned.length], [true, 24, 0]);
});

test('相册存不下：提醒，钉住的一张不少', () => {
  const full = () => {
    throw Object.assign(new Error('x'), { name: 'QuotaExceededError' });
  };
  const list = [{ id: 'n' }, { id: 'a', pinned: true }, { id: 'b' }];
  const w = albumWorld(list, full);
  assert.equal(w.ctx.persistPolaroidAlbum(), false);
  assert.deepEqual([w.ctx.polaroidAlbum.length, w.warned], [3, [true]]);
});

test('存不下的提醒每次打开只出一回；说明卡开着就等它收起', () => {
  const timers = [];
  const shown = [];
  let noticeOpen = true;
  const ctx = vm.createContext({
    setTimeout: (fn) => timers.push(fn),
    isCameraNoticeOpen: () => noticeOpen,
    showMilestoneToast: (t) => shown.push(t)
  });
  vm.runInContext(`let saveTroubleWarned = false;\n${take('function warnSaveTrouble(quota) {')}${take('function showSaveTroubleToast(quota) {')}`, ctx);
  ctx.warnSaveTrouble(true);
  ctx.warnSaveTrouble(true);
  assert.equal(timers.length, 1);
  timers.shift()();
  assert.equal(shown.length, 0);
  noticeOpen = false;
  timers.shift()();
  assert.deepEqual([shown.length, shown[0].badge, shown[0].name.length <= 8], [1, '存档', true]);
});
