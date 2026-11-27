// lazy_assets.test.mjs — 图片按需加载的单测（AR-COM5，不开浏览器）：node --test games/ar-survivor/tests/lazy_assets.test.mjs
// sprites.js / lazy-img.js 配上假的 Image、画布和元素执行；不加载 game.js，不跑游戏循环
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RETRY_WAITS, reloadBroken, scheduleImgRetry, watchFirstOpen } from '../public/lazy-img.js';

const PUB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const read = (f) => fs.readFileSync(path.join(PUB, f), 'utf8').replace(/\r\n/g, '\n');

// ---------- 假的 Image ----------
let asked = [];
class FakeImage {
  constructor() {
    this.complete = true; // 没设 src 时浏览器也是 complete=true、naturalWidth=0
    this.naturalWidth = 0;
    this.naturalHeight = 0;
    this.listeners = {};
  }
  set src(v) {
    this._src = v;
    this.complete = false;
    asked.push(this);
  }
  get src() {
    return this._src || '';
  }
  addEventListener(type, fn) {
    (this.listeners[type] ||= []).push(fn);
  }
  finish(ok = true) {
    this.complete = true;
    this.naturalWidth = this.naturalHeight = ok ? 512 : 0;
    if (ok) this.onload?.();
    else this.onerror?.();
    for (const fn of (this.listeners[ok ? 'load' : 'error'] || []).splice(0)) fn();
  }
}
const nameOf = (img) => img.src.replace(/^\.\/assets\//, '').replace(/\?.*$/, '');
let serial = 0;
async function freshSprites(t, { win = false, readyState = 'loading', saveData = false, on = {} } = {}) {
  asked = [];
  const clock = { now: 5000, timers: [], load: null };
  t.mock.method(performance, 'now', () => clock.now);
  globalThis.Image = FakeImage;
  delete globalThis.window;
  globalThis.document = {
    readyState,
    createElement: () => ({ width: 0, height: 0, getContext: () => makeCtx().ctx })
  };
  if (win) {
    globalThis.window = { addEventListener: (type, fn) => { on[type] = fn; if (type === 'load') clock.load = fn; } };
    t.mock.method(globalThis, 'setTimeout', (fn) => { clock.timers.push(fn); return 0; });
    Object.defineProperty(globalThis, 'navigator', { value: { connection: { saveData } }, configurable: true });
  }
  serial += 1;
  const mod = await import(`../public/sprites.js?case=${serial}`);
  t.after(() => {
    delete globalThis.window;
    delete globalThis.document;
  });
  return { mod, clock };
}

function makeCtx() {
  const drawn = [];
  const arcs = [];
  const ctx = new Proxy({}, {
    get(t, k) {
      if (k in t) return t[k];
      if (k === 'createRadialGradient' || k === 'createLinearGradient') return () => ({ addColorStop() {} });
      if (k === 'measureText') return (s) => ({ width: String(s).length * 12 });
      if (k === 'drawImage') return (img, ...a) => drawn.push([img, ...a]);
      if (k === 'arc') return (...a) => arcs.push(a);
      return () => {};
    },
    set(t, k, v) {
      t[k] = v;
      return true;
    }
  });
  return { ctx, drawn, arcs };
}

const HERO = { x: 600, y: 480, vx: 0, vy: 0, facing: 1, onGround: true, climbState: 'none', emote: '', emoteTimer: 0, idleTime: 0, petAction: 'idle', equipped: {}, spinTimer: 0 };

// ---------- sprites.js ----------
test('一启动只下站立 4 帧和房间固定的 11 样，其余 140 张一张不下', async (t) => {
  const { mod } = await freshSprites(t);
  assert.deepEqual(asked.slice(0, 4).map(nameOf), ['hero_idle.webp', 'hero_idle2.webp', 'hero_idle_blink.webp', 'hero_idle_talk.webp']);
  assert.equal(asked.length, 15);
  // 房间那 11 样：任何存档进养成都会画到（绘制不看存档内容）
  const { ctx } = makeCtx();
  const bare = { ...HERO, cozyRadioVisual: {}, aromaVisual: {}, potteryVisual: {}, starVisual: {}, rainVisual: {}, embroideryVisual: {}, hearthVisual: {} };
  const first = new Set(asked);
  for (const k of ['drawCozyTabletopRadio', 'drawAromaTableDesk', 'drawPotteryShelf', 'drawAr15WindowCorner', 'drawAr16WallHoop', 'drawAr16FloorHearth']) mod[k](ctx, bare, 1280, 720, 1000);
  assert.deepEqual(asked.filter((img) => !first.has(img)).map(nameOf), [], '房间固定的东西不该再补要');
  assert.equal(Object.keys(mod.images).length, 155);
});

test('问到哪张才下哪张；下载中不重复要；下完就是准备好了', async (t) => {
  const { mod } = await freshSprites(t);
  asked = [];
  assert.equal(mod.isReady(mod.images.slime), false);
  assert.equal(mod.isReady(mod.images.slime), false);
  assert.deepEqual(asked.map(nameOf), ['mon_slime.webp']);
  mod.images.slime.finish();
  assert.equal(mod.isReady(mod.images.slime), true);
  assert.equal(asked.length, 1);
  assert.equal(mod.isReady(null), false);
  assert.equal(mod.isReady(undefined), false);
});

test('下载失败：隔 1.5 / 3 / 6 秒再要，最久 30 秒；中间不狂刷', async (t) => {
  const { mod, clock } = await freshSprites(t);
  asked = [];
  const img = mod.images.bat;
  mod.isReady(img);
  for (const wait of [1500, 3000, 6000, 12000, 24000, 30000, 30000]) {
    const n = asked.length;
    img.finish(false);
    clock.now += wait - 1;
    mod.isReady(img);
    assert.equal(asked.length, n, `${wait} 毫秒之内不该重下`);
    clock.now += 1;
    mod.isReady(img);
    assert.equal(asked.length, n + 1);
  }
  img.finish();
  assert.equal(mod.isReady(img), true);
});

test('切到打工 / 摘星才下那个模式的贴图，养成不下', async (t) => {
  const { mod } = await freshSprites(t);
  asked = [];
  mod.preloadModeSprites('pet');
  assert.equal(asked.length, 0);
  mod.preloadModeSprites('parkour');
  assert.deepEqual(asked.map(nameOf), ['star_goal.webp']);
  asked = [];
  mod.preloadModeSprites('survivor');
  for (const f of ['mon_slime', 'mon_bat', 'mon_elite', 'mon_boss', 'upg_blaster', 'upg_blade', 'sk_frost_bubble', 'vfx_gem', 'ui_coin']) assert.ok(asked.map(nameOf).includes(`${f}.webp`), f);
  const n = asked.length;
  mod.preloadModeSprites('survivor');
  assert.equal(asked.length, n, '再切一次不重复要');
});

test('后台补角色动作：等第一屏下完，一次两张、低优先级，失败的跳过，补齐其余 24 帧', async (t) => {
  const { mod, clock } = await freshSprites(t, { win: true });
  asked.forEach((img) => img.finish());
  asked = [];
  assert.equal(typeof clock.load, 'function');
  clock.load();
  clock.timers.splice(0).forEach((fn) => fn());
  assert.deepEqual(asked.map(nameOf), ['hero_run1.webp', 'hero_run_pass1.webp']);
  assert.ok(asked.every((img) => img.fetchPriority === 'low'));
  asked[0].finish(false);
  assert.equal(asked.length, 3);
  for (let k = 1; k < asked.length; k++) asked[k].finish();
  const heroes = Object.keys(mod.images).filter((k) => k.startsWith('hero'));
  assert.equal(heroes.length, 28);
  assert.equal(asked.length, 24);
  assert.ok(asked.every((img) => nameOf(img).startsWith('hero_')));
});

test('页面早就加载完也会补；开了省流量就不补', async (t) => {
  const a = await freshSprites(t, { win: true, readyState: 'complete' });
  asked = [];
  assert.equal(a.clock.timers.length, 1);
  a.clock.timers[0]();
  assert.equal(asked.length, 2);
});

test('省流量', async (t) => {
  const { clock } = await freshSprites(t, { win: true, readyState: 'complete', saveData: true });
  asked = [];
  clock.timers[0]();
  assert.equal(asked.length, 0);
});

test('动作帧没下完：用站立帧做动作，不画蓝点', async (t) => {
  const { mod } = await freshSprites(t);
  const { images } = mod;
  images.heroIdle.finish();
  const poses = [
    { vx: 200 },
    { onGround: false, vy: -300 },
    { onGround: false, vy: 300 },
    { isCrouching: true, crouchTime: 1 },
    { isPickedUp: true },
    { climbState: 'hang' },
    { climbState: 'pullup', climbTimer: 0.1 },
    { tsundereTimer: 1 },
    { landAnimTimer: 0.1 },
    { isBraking: true, vx: 60 },
    { rubbingTimer: 1 },
    { eatingTimer: 1 }
  ];
  let now = 1000;
  for (const p of poses) {
    for (let k = 0; k < 4; k++) {
      const { ctx, drawn, arcs } = makeCtx();
      now += 60;
      mod.drawHeroSprite(ctx, { ...HERO, ...p }, now);
      assert.ok(drawn.length >= 12, `${JSON.stringify(p)} 没画出她`);
      assert.ok(drawn.every(([img]) => img === images.heroIdle));
      assert.ok(!arcs.some((a) => a[2] === 24), `${JSON.stringify(p)} 画了蓝点`);
    }
  }
  // 下完之后立刻用上真正的动作帧
  images.heroJump.finish();
  let last = [];
  for (let k = 0; k < 8; k++) {
    const { ctx, drawn } = makeCtx();
    now += 60;
    mod.drawHeroSprite(ctx, { ...HERO, onGround: false, vy: -300 }, now);
    last = drawn;
  }
  assert.ok(last.every(([img]) => img === images.heroJump));
});

test('换了动作、新动作没下完：不拿趴着 / 闭眼的图去跑；跑步缺帧接着用手上这张；发饰跟站立的头顶', async (t) => {
  const { mod } = await freshSprites(t);
  const { images } = mod;
  for (const k of ['heroIdle', 'heroIdleBlink', 'heroSleepLoaf', 'heroRun1', 'itemCrown']) {
    mod.isReady(images[k]);
    images[k].finish();
  }
  let now = 1000;
  const draw = (p, frames = 12) => {
    let last = null;
    for (let k = 0; k < frames; k++) {
      last = makeCtx();
      const ys = [];
      last.ctx.translate = (x, y) => ys.push(y);
      last.ys = ys;
      now += 40;
      mod.drawHeroSprite(last.ctx, { ...HERO, equipped: { crown: true }, ...p }, now);
    }
    const heroes = [...new Set(last.drawn.map(([img]) => img).filter((img) => img !== images.itemCrown))];
    return { heroes, crownY: last.ys.at(-1) };
  };
  const stand = draw({ rubbingTimer: 1 });
  assert.deepEqual(stand.heroes, [images.heroIdleBlink]);
  assert.deepEqual(draw({ onGround: false, vy: 300 }).heroes, [images.heroIdle], '不闭着眼下落');
  const sleep = draw({ idleTime: 9 });
  assert.deepEqual(sleep.heroes, [images.heroSleepLoaf]);
  assert.deepEqual(draw({ isPickedUp: true }).heroes, [images.heroIdle], '不趴着被拎起来');
  for (let k = 0; k < 20; k++) {
    const { heroes } = draw({ vx: 200 }, 3);
    assert.ok(heroes.every((img) => img === images.heroRun1 || img === images.heroIdle), '跑步缺帧');
    if (k > 12) assert.deepEqual(heroes, [images.heroRun1], '有一帧就一直用这一帧，不和站立帧来回跳');
  }
  // 蹲的图没下完：画的是站立帧，皇冠不能掉到脸上
  const crouch = draw({ isCrouching: true, crouchTime: 0.1 });
  assert.deepEqual(crouch.heroes, [images.heroIdle]);
  assert.ok(crouch.crownY < sleep.crownY - 10, `站立 ${crouch.crownY}，趴着 ${sleep.crownY}`);
});

test('恢复联网：不等退避，下一次画到就重下', async (t) => {
  const on = {};
  const { mod, clock } = await freshSprites(t, { win: true, on });
  const img = mod.images.bat;
  mod.isReady(img);
  for (let k = 0; k < 6; k++) {
    img.finish(false);
    clock.now += 30000;
    mod.isReady(img);
  }
  img.finish(false);
  asked = [];
  mod.isReady(img);
  assert.equal(asked.length, 0);
  on.online();
  mod.isReady(img);
  assert.deepEqual(asked.map(nameOf), ['mon_bat.webp']);
});

// 房间全摆满、所有陪伴都在进行的一份假状态（只用于绘制）
function busyPlayer(images) {
  const rgb = '255, 238, 216';
  return {
    ...HERO,
    equipped: { aura: true, cushion: true, star_wreath: true, crown: true, bow: true, shell_clip: true },
    emote: '你好呀', emoteTimer: 2, emoteMood: 'tsundere', tsundereTimer: 0,
    displayedTerrariumPlants: ['plantPeachSucculent', 'plantStarLily', 'plantBlueHydrangea'].map((spriteKey, i) => ({ spriteKey, level: 5, hasDew: true, x: 100 * i, y: 400, shortName: 'x' })),
    isFocusStudying: false, teaPlatterTimer: 5, isGoodnightSleeping: false, cocoaCupTimer: 5, cocoaToppingId: 'star_marshmallow',
    collageKeepsake: { deskDisplayed: true, savedCount: 1, frameStyle: 'lace_ivory', photoId: 'peace_snap', stickers: { lace_garland: { enabled: true }, pressed_daisy: { enabled: true }, whale_stamp: { enabled: true } } },
    cozyRadioVisual: { playing: true, code: 'CH' },
    crochetDeskVisual: { displayed: true, spriteKey: 'knitWhaleScarf', level: 3, totalLevel: 6, shortName: 'x' },
    pressedDeskVisual: { displayed: true, items: ['pressedSakuraBookmark', 'pressedGinkgoBookmark', 'pressedBabysbreathBookmark'].map((spriteKey) => ({ spriteKey, level: 3 })), totalLevel: 9 },
    watercolorWallVisual: { items: [{ subjectSpriteKey: 'plantStarLily', paletteId: 'a', filter: 'none', box: { left: 0.4, top: 0.4, size: 0.4 }, isLatest: true }], gallerySize: 1, total: 9 },
    mailboxVisual: { unread: 2 },
    memoryWallVisual: { count: 2, total: 6, items: [{ img: images.puzzlePieceMemory, isLatest: true }, { img: new FakeImage(), isLatest: false }] },
    bentoDeskVisual: { bagCount: 2 },
    kittenVisual: { active: true, spriteKey: 'kittenGinger', label: 'x', fed: true, eating: true, petPulse: 1, arriveAge: 9, facing: 1 },
    sillCardVisual: { count: 1 },
    picnicVisual: { packed: true, weekend: true, outing: false, foods: ['picnicSandwich'], shared: [], packing: false, packKey: '' },
    potteryVisual: { pieces: [{ spriteKey: 'potteryCup', glazeRgb: rgb }, { spriteKey: 'potteryVase', glazeRgb: rgb }], shaping: true, progress: 0.5, shapeKey: 'potteryCup', glazeRgb: rgb, firing: true, phase: 'shape', cheer: 1 },
    aromaVisual: { active: true, blending: true, moodRgb: rgb, seasonRgb: rgb, label: 'x', drops: 2, cheer: 1 },
    starVisual: { active: true, cardId: 'x', rgb, aligning: true, taps: 2, need: 5, cheer: 1, label: 'x' },
    rainVisual: { listening: true, weatherId: 'x', rgb, cardOpen: false, ring: 1, cheer: 1, label: 'x' },
    embroideryVisual: { active: true, patternRgb: rgb, threadRgb: rgb, progress: 0.5, stitches: 2, taps: 2, need: 4, cardOpen: true, cheer: 1, hung: 2, label: 'x', wall: [{ rgb, threadRgb: rgb, patternRgb: rgb }, { rgb, threadRgb: rgb, patternRgb: rgb }] },
    hearthVisual: { level: 3, rgb, cuddle: true, cardOpen: true, roasting: true, flips: 1, need: 3, snackRgb: rgb, flip: 0.5, cheer: 1, label: 'x' },
    wardrobeVisual: { outfitId: 'x', look: null, seasonKey: 'spring', rgb, cardOpen: true, cheer: 1, preview: '' },
    storyVisual: { cardOpen: true, reading: true, storyId: 'x', rgb, page: 1, pages: 3, cheer: 1, glow: true },
    isStargazing: true, isPainting: true, isCookingBento: true, isCraftingCard: true, craftStickerKey: 'vfxHeart', isWritingDiary: true, diaryStickerKey: 'diarySticker',
    paintingWashColor: 'rgba(214, 228, 244, 0.5)'
  };
}

function drawEverything(mod, ctx, p) {
  const n = 1000;
  const room = Object.keys(mod).filter((k) => k.startsWith('draw'));
  const two = new Set(['drawStudyCompanionProp', 'drawAfternoonTeaProp', 'drawGoodnightMusicboxProp', 'drawHotCocoaProp', 'drawStargazeTelescopeProp', 'drawWatercolorEaselProp', 'drawBentoKitchenProp', 'drawGreetingCardCraftProp', 'drawDiaryWritingProp', 'drawPotteryWheelProp', 'drawAromaBlendProp', 'drawStarCardProp', 'drawRainListenProp', 'drawEmbroideryProp', 'drawHearthSnackProp', 'drawWardrobeSeasonSparkles', 'drawStorybookProp']);
  // 逐个陪伴单独来一遍，否则互相挡住
  const variants = [p, { ...p, isPainting: false, isCookingBento: false, isCraftingCard: false, isWritingDiary: false, isStargazing: false, teaPlatterTimer: 0, cocoaCupTimer: 0 }, { ...p, isFocusStudying: true }, { ...p, isGoodnightSleeping: true }, { ...p, picnicVisual: { ...p.picnicVisual, outing: true, foods: ['picnicSandwich', 'onigiriTrio'], shared: ['picnicSandwich'] } }, { ...p, picnicVisual: { ...p.picnicVisual, packed: false, packing: true, packKey: 'picnicSandwich' } }];
  let calls = 0;
  for (const v of variants) {
    for (const k of room) {
      if (two.has(k)) mod[k](ctx, v, n);
      else if (k === 'drawPicnicOutingProp') mod[k](ctx, v, n, 1280);
      else if (k === 'drawHeroSprite') mod[k](ctx, v, n + calls);
      else if (k === 'drawFoodItem') for (const foodId of ['rice', 'tea', 'bento', 'cake', 'teaPlatter']) mod[k](ctx, { x: 1, y: 1, foodId, squashTimer: 0, eatingProgress: 0 }, n);
      else if (k === 'drawToyItem') for (const toyId of ['whale', 'yarn', 'duck']) mod[k](ctx, { x: 1, y: 1, toyId, vx: 1 }, n);
      else if (k === 'drawFurnitureItem') for (const key of ['pc', 'tree', 'lamp', 'musicbox']) mod[k](ctx, { x: 1, y: 1, key }, n);
      else if (k === 'drawEnemySprite') for (const e of [{}, { isBoss: true, hp: 1, maxHp: 2 }, { isFlyer: true }, { isElite: true }, { isGoldTreasure: true }]) mod[k](ctx, { x: 1, y: 1, r: 10, ...e }, n, 0);
      else if (k === 'drawStarGoal') mod[k](ctx, { active: true, x: 1, y: 1, combo: 3 }, v, n);
      else if (k === 'drawInteractionVfx') mod[k](ctx, ['heart', 'star', 'note', 'zzz', 'dot'].map((shape) => ({ shape, life: 1, x: 1, y: 1 })), [{ life: 0.2, maxLife: 0.4, startR: 1, endR: 9, x: 1, y: 1 }], { active: true, x: 1, y: 1 }, n);
      else mod[k](ctx, v, 1280, 720, n);
      calls += 1;
    }
  }
  return calls;
}

test('所有绘制：一张图都没到时不调 drawImage；到一半 / 全到时只画到了的', async (t) => {
  const { mod } = await freshSprites(t);
  const p = busyPlayer(mod.images);
  const none = makeCtx();
  assert.ok(drawEverything(mod, none.ctx, p) > 200);
  assert.equal(none.drawn.length, 0);
  assert.ok(asked.length > 60, '该要的都要了');
  const keys = Object.keys(mod.images);
  const ok = (img) => img && (img.complete && img.naturalWidth > 0 || typeof img.getContext === 'function');
  for (let step = 0; step < 5; step++) {
    keys.forEach((k, i) => { if (i % 5 === step && mod.images[k].naturalWidth === 0) mod.images[k].finish(); });
    const c = makeCtx();
    drawEverything(mod, c.ctx, p);
    assert.ok(c.drawn.length > 0);
    for (const [img] of c.drawn) assert.ok(ok(img), '画了一张还没下完的图');
  }
  const all = makeCtx();
  drawEverything(mod, all.ctx, p);
  const used = new Set(all.drawn.map(([img]) => img));
  assert.ok(used.size > 70, `全到时用到 ${used.size} 张`);
});

// ---------- lazy-img.js ----------
class FakeEl {
  constructor(hidden) {
    this.set = new Set(hidden ? ['hidden'] : []);
    this.classList = { contains: (c) => this.set.has(c) };
    this.attrs = { 'data-imgs-off': '' };
    this.imgs = [1, 0].map((boxes) => ({ loading: 'lazy', getClientRects: () => Array(boxes) }));
  }
  querySelectorAll() {
    return this.imgs;
  }
  removeAttribute(k) {
    delete this.attrs[k];
  }
}
test('面板第一次打开才去掉标记，之后不再盯着', () => {
  let cb = null;
  let off = 0;
  class MO {
    constructor(fn) { cb = fn; }
    observe(el, opt) { assert.deepEqual(opt.attributeFilter, ['class']); }
    disconnect() { off += 1; }
  }
  const el = new FakeEl(true);
  watchFirstOpen(el, MO);
  cb();
  assert.ok('data-imgs-off' in el.attrs, '还收着，不去标记');
  el.set.delete('hidden');
  cb();
  assert.ok(!('data-imgs-off' in el.attrs));
  assert.equal(off, 1);
  assert.deepEqual(el.imgs.map((i) => i.loading), ['eager', 'lazy'], '看得到的一次下齐，翻不到的分页留着');
  const open = new FakeEl(false);
  assert.equal(watchFirstOpen(open, MO), null);
  assert.ok(!('data-imgs-off' in open.attrs));
});

class FakeImgEl {
  constructor(src) {
    this.src = src;
    this.sets = 0;
    this.complete = true;
    this.naturalWidth = 0;
  }
  getAttribute() { return this.src; }
  setAttribute(k, v) { this.src = v; this.sets += 1; }
}
test('图片失败自动重试 3 次；换了图从头算；已经好了 / 不是本地图就不动', () => {
  const jobs = [];
  const later = (fn, ms) => jobs.push([fn, ms]);
  const img = new FakeImgEl('./assets/a.webp?v=1');
  for (let k = 0; k < 3; k++) assert.equal(scheduleImgRetry(img, later), true);
  assert.equal(scheduleImgRetry(img, later), false);
  assert.deepEqual(jobs.map((j) => j[1]), RETRY_WAITS);
  jobs[0][0]();
  assert.equal(img.sets, 1);
  img.src = './assets/b.webp?v=1';
  jobs[1][0]();
  assert.equal(img.sets, 1, '已经换成别的图，不把旧图设回去');
  assert.equal(scheduleImgRetry(img, later), true);
  img.naturalWidth = 9;
  jobs[3][0]();
  assert.equal(img.sets, 1, '已经好了');
  assert.equal(scheduleImgRetry(new FakeImgEl('data:image/gif;base64,xx'), later), false);
  const ok = Object.assign(new FakeImgEl('./assets/c.webp'), { naturalWidth: 5 });
  const bad = new FakeImgEl('./assets/d.webp');
  assert.equal(reloadBroken([ok, bad]), 1);
  assert.equal(bad.sets, 1);
});

test('lazy-img.js：恢复联网、切回前台都会把坏图再来一遍', () => {
  const t = read('lazy-img.js');
  assert.match(t, /addEventListener\('online', \(\) => reloadBroken\(document\.images\)\)/);
  assert.match(t, /addEventListener\('visibilitychange', \(\) => \{\s*if \(!document\.hidden\) reloadBroken\(document\.images\);/);
});

test('拼图底图一次没下到，过一会儿丢掉失败结果重来；下到了就一直用', async () => {
  const code = read('room-ar10-11.js').match(/function prepareMemorySource\(src\) \{[^]*?\n\}\n/)[0];
  const jobs = [];
  const cache = new Map();
  const results = [null, Promise.reject(new Error('x')), { cv: 1 }];
  let syncs = 0;
  const run = new Function('memorySourceCache', 'renderMemorySourceCanvas', 'makeMemoryThumbUrl', 'isAr11CardOpen', 'syncMemoryPuzzleUI', 'setTimeout', `${code}return prepareMemorySource;`)(
    cache, async () => results.shift(), () => 'thumb', () => true, () => { syncs += 1; }, (fn, ms) => jobs.push([fn, ms])
  );
  const src = { cacheKey: 'a' };
  for (const left of [2, 1]) {
    assert.equal(await run(src), null);
    assert.equal(await run(src), null, '4 秒内不重复下');
    assert.equal(results.length, left);
    const [fn, ms] = jobs.shift();
    assert.equal(ms, 4000);
    fn();
    assert.equal(cache.has('a'), false);
  }
  assert.ok(syncs >= 4, '丢掉之后重画一次，界面会再要');
  assert.deepEqual(await run(src), { cv: 1 });
  assert.equal(jobs.length, 0);
  assert.equal(cache.get('a').ready, true);
});

// ---------- 占位 ----------
test('每个 <img> 的样式都写死了宽高（或宽 + 比例），图没到也不跳动', () => {
  const css = read('style.css').replace(/\/\*[^]*?\*\//g, '');
  const rules = [...css.matchAll(/([^{}@;]+)\{([^{}]*)\}/g)].flatMap((m) => m[1].split(',').map((s) => [s.trim(), m[2]]));
  const sized = (hit) => {
    const body = rules.filter(([s]) => hit(s)).map(([, b]) => b).join(';');
    return /(?:^|[;\s])width:/.test(body) && /(?:^|[;\s])(?:height|aspect-ratio):/.test(body);
  };
  const lastOf = (s) => s.split(/[\s>+~]+/).pop();
  let n = 0;
  for (const f of ['index.html', ...fs.readdirSync(PUB).filter((x) => x.endsWith('.js'))]) {
    const t = read(f);
    for (const m of t.matchAll(/<img\b((?:[^>"]|"[^"]*")*)>/g)) {
      const cls = (m[1].match(/\sclass="([\w-]+)/) || [])[1];
      n += 1;
      if (cls) {
        assert.ok(sized((s) => new RegExp(`\\.${cls}(?![\\w-])`).test(lastOf(s))), `${f}: .${cls} 没写宽高`);
      } else {
        const before = t.slice(Math.max(0, m.index - 300), m.index);
        const parents = [...before.matchAll(/class="([\w-]+)|className = '([\w-]+)|closest\('\.([\w-]+)/g)].map((x) => x[1] || x[2] || x[3]);
        const any = parents.slice(-3).some((c) => sized((s) => new RegExp(`\\.${c}(?![\\w-])[^ ]* img$`).test(s)));
        assert.ok(any || /cocoa|teatime|dot\.innerHTML|slot\.innerHTML/.test(before), `${f}: 没有类名的 <img>（${before.slice(-60).trim()}）找不到宽高`);
      }
    }
  }
  assert.ok(n > 250);
});
