// camera_privacy.test.mjs — AR-COM3 摄像头角标、比耶自动拍选择的单测（不开浏览器）：node --test games/ar-survivor/tests/camera_privacy.test.mjs
// 切后台停 / 回来开的流程在 camera.test.mjs；这里从 game.js 源码里取出单个函数，配假元素、假存储执行
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { readGameSource } from './_split_lib.mjs';
import { PEACE_SNAP_KEY, peaceSnapAction, readPeaceSnapChoice, savePeaceSnapChoice } from '../public/save-core.js';

const PUB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const SRC = readGameSource(PUB);

// 顶层语句都以列首的右括号收尾
function take(head) {
  const i = SRC.indexOf(head);
  assert.ok(i >= 0, `源码里找不到 ${head}`);
  const end = SRC.slice(i).match(/\n\}(?:\)|, true\))?;?\n/);
  return SRC.slice(i, i + end.index + end[0].length);
}

class El {
  constructor(classes = []) {
    this.textContent = '';
    this.set = new Set(classes);
    this.classList = {
      add: (c) => this.set.add(c),
      remove: (c) => this.set.delete(c),
      contains: (c) => this.set.has(c),
      toggle: (c, on) => (on ? this.set.add(c) : this.set.delete(c))
    };
  }
  addEventListener() {}
}

function memStorage(init = {}) {
  const m = new Map(Object.entries(init));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), map: m };
}

test('存储：只认 auto / tap，别的当没问过；存不进去不报错', () => {
  assert.equal(readPeaceSnapChoice(() => memStorage()), '');
  assert.equal(readPeaceSnapChoice(() => memStorage({ [PEACE_SNAP_KEY]: 'yes' })), '');
  assert.equal(readPeaceSnapChoice(() => { throw new Error('SecurityError'); }), '');
  const s = memStorage();
  assert.equal(savePeaceSnapChoice(() => s, 'auto'), true);
  assert.equal(readPeaceSnapChoice(() => s), 'auto');
  assert.equal(savePeaceSnapChoice(() => s, 'maybe'), false);
  assert.equal(readPeaceSnapChoice(() => s), 'auto');
  const full = { getItem: () => null, setItem: () => { throw Object.assign(new Error('q'), { name: 'QuotaExceededError' }); } };
  assert.equal(savePeaceSnapChoice(() => full, 'tap'), false);
  assert.equal(peaceSnapAction(''), 'ask');
  assert.equal(peaceSnapAction('auto'), 'snap');
  assert.equal(peaceSnapAction('tap'), 'off');
});

function peaceWorld(storage) {
  const els = {
    'peace-snap-notice': new El(['hidden']),
    'btn-peace-snap-toggle': new El(),
    'btn-peace-snap-auto': new El(),
    'btn-peace-snap-tap': new El()
  };
  const taps = {};
  const emotes = [];
  let bookClosed = 0;
  const ctx = vm.createContext({
    localStorage: storage,
    readPeaceSnapChoice,
    savePeaceSnapChoice,
    peaceSnapAction,
    player: { photoPoseTimer: 0.3 },
    document: { getElementById: (id) => els[id] || null },
    bindHudTap: (el, fn) => {
      for (const [id, e] of Object.entries(els)) if (e === el) taps[id] = fn;
    },
    dismissMemoryBookCard: () => (bookClosed += 1),
    setPlayerEmote: (t) => emotes.push(t)
  });
  // 整段：从标题到「摄像头在用时」之前（变量、四个函数、三个按钮、开局同步一次按钮字）
  const from = SRC.indexOf('// ================= AR-COM3 比耶自动拍');
  const block = SRC.slice(from, SRC.indexOf('\n// 摄像头在用时', from));
  vm.runInContext(block, ctx);
  return { els, taps, emotes, ctx, choice: () => vm.runInContext('peaceSnapChoice', ctx), bookClosed: () => bookClosed };
}

test('比耶自动拍：没问过先问；选了记住，下次打开照选的来；手账「比耶拍」能改', () => {
  const storage = memStorage();
  const w = peaceWorld(storage);
  assert.equal(w.choice(), '');
  assert.equal(peaceSnapAction(w.choice()), 'ask');
  assert.equal(w.els['btn-peace-snap-toggle'].textContent, '比耶拍 关');

  // 手账里点「比耶拍 关」：先出说明卡，不直接开
  w.taps['btn-peace-snap-toggle']();
  assert.equal(w.els['peace-snap-notice'].classList.contains('hidden'), false);
  assert.equal(w.bookClosed(), 1);
  assert.equal(storage.getItem(PEACE_SNAP_KEY), null);

  w.taps['btn-peace-snap-auto']();
  assert.equal(w.choice(), 'auto');
  assert.equal(storage.getItem(PEACE_SNAP_KEY), 'auto');
  assert.equal(w.els['peace-snap-notice'].classList.contains('hidden'), true);
  assert.equal(w.els['btn-peace-snap-toggle'].textContent, '比耶拍 开');

  // 重新打开：记住了
  const again = peaceWorld(storage);
  assert.equal(again.choice(), 'auto');
  assert.equal(peaceSnapAction(again.choice()), 'snap');
  // 开着时点一下直接关，不弹卡
  again.taps['btn-peace-snap-toggle']();
  assert.equal(again.choice(), 'tap');
  assert.equal(storage.getItem(PEACE_SNAP_KEY), 'tap');
  assert.equal(again.els['peace-snap-notice'].classList.contains('hidden'), true);
  assert.equal(peaceSnapAction(again.choice()), 'off');
  assert.equal(peaceWorld(storage).choice(), 'tap');

  // 说明卡里选「只在我点时拍」
  const s2 = memStorage();
  const w2 = peaceWorld(s2);
  w2.taps['btn-peace-snap-tap']();
  assert.equal(s2.getItem(PEACE_SNAP_KEY), 'tap');
  assert.equal(w2.els['btn-peace-snap-toggle'].textContent, '比耶拍 关');
});

test('存不进去（无痕、存储满）：这次照选的来，不报错', () => {
  const bad = { getItem: () => { throw new Error('SecurityError'); }, setItem: () => { throw new Error('SecurityError'); } };
  const w = peaceWorld(bad);
  assert.equal(w.choice(), '');
  w.taps['btn-peace-snap-auto']();
  assert.equal(w.choice(), 'auto');
});

test('比耶分支：没问过先出卡、选了不拍就不进分支、卡开着不重复弹', () => {
  const g = SRC;
  const i = g.indexOf("gs.type === 'peace' &&");
  const branch = g.slice(i, g.indexOf('} else if (', i));
  assert.match(branch, /peaceSnapAction\(peaceSnapChoice\) !== 'off' &&\s*!isPeaceSnapNoticeOpen\(\) &&/);
  assert.match(branch, /if \(peaceSnapAction\(peaceSnapChoice\) === 'snap'\) triggerPolaroidSequence\(true\);\s*else showPeaceSnapNotice\(\);/);
});

test('摄像头角标：在用就亮、不在用就灭；手账里的开关字跟着变；没变不重写', () => {
  const badge = new El(['hidden']);
  const camBtn = new El();
  let live = false;
  let writes = 0;
  const ctx = vm.createContext({
    vision: { isCameraLive: () => live },
    document: { getElementById: (id) => (id === 'cam-live-badge' ? badge : id === 'btn-camera-toggle' ? camBtn : null) }
  });
  vm.runInContext(take('let cameraLiveShown = null;'), ctx);
  const orig = badge.classList.toggle;
  badge.classList.toggle = (...a) => ((writes += 1), orig(...a));
  ctx.syncCameraLiveBadge();
  assert.equal(badge.classList.contains('hidden'), true);
  assert.equal(camBtn.textContent, '摄像头 关');
  live = true;
  ctx.syncCameraLiveBadge();
  assert.equal(badge.classList.contains('hidden'), false);
  assert.equal(camBtn.textContent, '摄像头 开');
  ctx.syncCameraLiveBadge();
  ctx.syncCameraLiveBadge();
  assert.equal(writes, 2);
  live = false;
  ctx.syncCameraLiveBadge();
  assert.equal(badge.classList.contains('hidden'), true);
  // 每帧都看一次
  assert.match(SRC, /  updateHUD\(\);\n  syncCameraLiveBadge\(\);\n\}/);
});

test('手账摄像头开关跟着角标走：在出画面就关；没在出画面（含回前台正在重开）先停下再问', () => {
  const log = [];
  let live = true;
  const ctx = vm.createContext({
    W: 800,
    H: 450,
    vision: { isCameraLive: () => live, enableSimMode: () => log.push('sim') },
    applyCameraChoice: (c) => log.push(`choice:${c}`),
    dismissMemoryBookCard: () => log.push('book'),
    showCameraNotice: () => log.push('notice')
  });
  vm.runInContext(take('function toggleCameraFromBook() {'), ctx);
  ctx.toggleCameraFromBook();
  assert.deepEqual(log.splice(0), ['choice:off']);
  live = false;
  ctx.toggleCameraFromBook();
  assert.deepEqual(log.splice(0), ['sim', 'book', 'notice']);
  assert.match(SRC, /bindHudTap\(document\.getElementById\('btn-camera-toggle'\), toggleCameraFromBook\);/);
  // 手账里的字和角标同一个来源
  assert.match(SRC, /camBtn\.textContent = vision\.isCameraLive\(\) \? '摄像头 开' : '摄像头 关';/);
  assert.equal(/camBtn\.textContent = vision\.mode === 'camera'/.test(SRC), false);
});

test('回前台重开前看记住的选择；别处改成「先不用」时不提示断开', () => {
  assert.match(SRC, /vision\.allowCameraResume = \(\) => readCameraChoice\(\) !== 'off';\nvision\.bindPageLifecycle\(/);
  const emotes = [];
  const ctx = vm.createContext({
    vision: {},
    skipCameraOnlyWish() {},
    syncMemoryBookUI() {},
    setPlayerEmote: (t) => emotes.push(t)
  });
  const from = SRC.indexOf('vision.onCameraLost = (why) => {');
  vm.runInContext(SRC.slice(from, SRC.indexOf('\n};\n', from) + 4), ctx);
  ctx.vision.onCameraLost('off');
  assert.equal(emotes.length, 0);
  ctx.vision.onCameraLost();
  assert.equal(emotes.length, 1);
});
