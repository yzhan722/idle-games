// 资源与首屏的静态校验：node --test scripts/assets.test.mjs（只读文件 + 假 DOM，不开浏览器）
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { GAME_ROOT, loadTs } from './lib/load_ts.mjs';
import { inside, listFiles, read, scanHtml } from './lib/asset_scan.mjs';
import { checkAssets } from './asset_refs.mjs';
import { firstScreen } from './first_screen.mjs';

test('没有 404 引用、没有大小写不一致', async () => {
  const r = await checkAssets();
  assert.deepEqual(r.missing, []);
  assert.deepEqual(r.wrongCase, []);
  assert.deepEqual(r.deadPatterns, []);
});

test('index.html：只有封面和大厅「出战」页常驻的图立刻下载，其余都写 loading="lazy"', () => {
  for (const el of scanHtml(read('index.html')).filter((e) => e.tag === 'img')) {
    const title = inside(el, '#title-screen') && !inside(el, '.title-crest-trio');
    const panel = el.trail.map((p) => p.attrs.id || '').filter((id) => id.startsWith('menu-panel-'));
    const lobby = inside(el, '#main-menu') && (!panel.length || panel[0] === 'menu-panel-launch');
    if (!title && !lobby) assert.equal(el.attrs.loading, 'lazy', `${el.attrs.src} 第 ${el.line} 行`);
    if (title) assert.notEqual(el.attrs.loading, 'lazy', `封面的图不该推迟：${el.attrs.src}`);
  }
});

test('脚本里拼的图标都走 ART_LOADING，没有写死 eager 的', () => {
  for (const file of listFiles('src', (f) => f.endsWith('.ts'))) {
    const text = read(file);
    assert.ok(!text.includes('loading="eager"'), file);
    for (const m of text.matchAll(/<img class="art-icon-img[^>]*>/g)) {
      if (m[0].includes('${')) assert.ok(m[0].includes('loading="${ART_LOADING}"'), `${file}: ${m[0].slice(0, 90)}`);
    }
  }
});

test('推迟下载的图标在 style.css 里都写死了宽高（等图不跳布局）', () => {
  const css = read('src/style.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const sized = (cls) =>
    [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].some(([, sel, body]) => new RegExp(`\\.${cls}(?![\\w-])`).test(sel) && /(?:^|[;\s])width:/.test(body) && /(?:^|[;\s])height:/.test(body));
  const combos = new Set();
  const collect = (text) => {
    for (const m of text.matchAll(/class="art-icon-img ([\w -]+)/g)) combos.add(m[1].trim());
    for (const m of text.matchAll(/(?:hudImg|hudImgV19|rootAssetImgV20|finishImgV21)\('\w+', '([\w-]+)'\)/g)) combos.add(m[1]);
    // main.ts 里带第二个类的小工具函数：尺寸写在第二个类上
    for (const m of text.matchAll(/(?:decorThemeArtImg|decorPropArtImg|tacticCardImg|gachaSkinArtImg|TROPHY_CUP_IMG)\([^()']+, '([\w-]+)'\)/g)) combos.add(m[1]);
  };
  collect(read('index.html'));
  listFiles('src', (f) => f.endsWith('.ts')).forEach((f) => collect(read(f)));
  // 模板里自己没尺寸、由外层选择器给的
  const byParent = {
    'decor-theme-art': /\.decor-theme-swatch \.decor-card-art\s*[{,]/,
    'decor-prop-art': /\.decor-prop-swatch \.decor-card-art\s*[{,]/,
    'decor-pill-art': /\.decor-hall \.squad-livery-active-pill \.decor-theme-art\s*[{,]/,
    'gacha-chip-art': /\.gacha-skin-art\s*[{,]/,
    'gacha-card-art': /\.gacha-skin-art\s*[{,]/,
    'gacha-pill-art': /\.gacha-machine \.squad-livery-active-pill \.gacha-skin-art\s*[{,]/,
    'tactic-card-art': /\.tactic-card-icon\s*[{,]/,
  };
  assert.ok(combos.size > 30);
  for (const combo of combos) {
    const ok = combo.split(/\s+/).some((c) => (byParent[c] ? byParent[c].test(css) : sized(c)));
    assert.ok(ok, `.${combo} 没有写死宽高`);
  }
});

test('首屏体积：图片不超过 1.7 MB，整屏不超过 3.7 MB（要先 npm run build）', async (t) => {
  if (!existsSync(path.join(GAME_ROOT, 'dist/index.html'))) return t.skip('没有 dist/');
  const r = await firstScreen();
  for (const x of r.rows) assert.ok(x.bytes > 0, `首屏缺文件 ${x.file}`);
  assert.ok(r.totals['图片'].bytes <= 1_700_000, `图片 ${r.totals['图片'].bytes}`);
  assert.ok(r.total.bytes <= 3_700_000, `合计 ${r.total.bytes}`);
  assert.equal(r.helpersLazy, true);
  // dist 里的图和 public/ 是同一份（忘了重新打包会在这里发现）
  for (const f of listFiles('public')) assert.ok(readFileSync(path.join(GAME_ROOT, f)).equals(readFileSync(path.join(GAME_ROOT, f.replace('public', 'dist')))), `${f} 与 dist 不一致，重新打包`);
});

// ---- LazyArt：假 DOM
class FakeImg {
  constructor(src) {
    Object.assign(this, { attrs: { src }, complete: false, naturalWidth: 0, isConnected: true, offsetParent: {}, loading: 'lazy' });
    const set = new Set(['art-icon-img']);
    this.classList = { add: (c) => set.add(c), remove: (c) => set.delete(c), contains: (c) => set.has(c) };
  }
  getAttribute(k) {
    return this.attrs[k] ?? null;
  }
  setAttribute(k, v) {
    this.attrs[k] = v;
    if (k === 'src') this.complete = false;
  }
}
/** 浏览器报错时：complete 为真、没有宽度。 */
const fails = (on, img) => {
  img.complete = true;
  on.doc.error({ target: img });
};

async function setup({ webdriver = false, saveData = false, imgs = [] } = {}) {
  const on = { doc: {}, win: {} };
  const timers = [];
  const made = [];
  globalThis.HTMLImageElement = FakeImg;
  globalThis.Image = class extends FakeImg {
    constructor() {
      super('');
      made.push(this);
    }
  };
  globalThis.document = {
    addEventListener: (k, fn) => void (on.doc[k] = fn),
    querySelectorAll: () => imgs,
  };
  globalThis.window = {
    addEventListener: (k, fn) => void (on.win[k] = fn),
    setTimeout: (fn, ms) => timers.push({ fn, ms }),
    requestIdleCallback: (fn) => fn(),
  };
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { webdriver, connection: { saveData } } });
  const { L } = await loadTs({ L: 'src/ui/LazyArt.ts' });
  L.installLazyArt();
  return { L, on, timers, made };
}

test('LazyArt：失败按 0.8 / 2.5 / 8 秒重试三次，成功就清状态，全失败换占位并在断网恢复后再来', async () => {
  const img = new FakeImg('/assets/icons/a.png?v=36');
  const { on, timers } = await setup({ imgs: [img] });
  const fail = () => fails(on, img);
  for (const [i, ms] of [800, 2500, 8000].entries()) {
    fail();
    const t = timers.pop();
    assert.equal(t.ms, ms);
    t.fn();
    assert.equal(img.attrs.src, `/assets/icons/a.png?v=36&r=${i + 1}`);
  }
  fail();
  assert.equal(timers.length, 0);
  assert.ok(img.classList.contains('art-failed'));
  assert.match(img.attrs.src, /^data:/);
  on.doc.load({ target: img }); // 占位图自己的 load 不算恢复
  assert.ok(img.classList.contains('art-failed'));
  on.win.online();
  assert.equal(img.attrs.src, '/assets/icons/a.png?v=36');
  on.doc.load({ target: img });
  assert.ok(!img.classList.contains('art-failed'));
});

test('LazyArt：等重试时换了图或被重画掉，就不再动它', async () => {
  const img = new FakeImg('/assets/icons/a.png?v=36');
  const { on, timers } = await setup();
  fails(on, img);
  img.attrs.src = '/assets/icons/b.png?v=36';
  timers.pop().fn();
  assert.equal(img.attrs.src, '/assets/icons/b.png?v=36');
  fails(on, img);
  img.isConnected = false;
  timers.pop().fn();
  assert.equal(img.attrs.src, '/assets/icons/b.png?v=36');
});

test('LazyArt：等重试时游戏又设了一遍同一张图而且好了，不再重下', async () => {
  const img = new FakeImg('/assets/icons/a.png?v=36');
  const { on, timers } = await setup();
  fails(on, img);
  Object.assign(img, { complete: true, naturalWidth: 72 });
  timers.pop().fn();
  assert.equal(img.attrs.src, '/assets/icons/a.png?v=36');
});

test('LazyArt：没有 ? 的地址也只重试三次；切回前台再来；已经换成别的图的不拉回旧图', async () => {
  const [a, b] = [new FakeImg('/assets/icons/a.png'), new FakeImg('/assets/icons/b.png?v=36')];
  const { on, timers } = await setup();
  for (const img of [a, b]) {
    for (let i = 0; i < 3; i++) {
      fails(on, img);
      timers.pop().fn();
    }
    fails(on, img);
    assert.match(img.attrs.src, /^data:/);
  }
  assert.equal(timers.length, 0);
  b.setAttribute('src', '/assets/icons/c.png?v=36');
  globalThis.document.hidden = true;
  on.doc.visibilitychange();
  assert.match(a.attrs.src, /^data:/);
  globalThis.document.hidden = false;
  on.doc.visibilitychange();
  assert.equal(a.attrs.src, '/assets/icons/a.png');
  assert.equal(b.attrs.src, '/assets/icons/c.png?v=36');
});

test('LazyArt：脚本跑起来之前就失败的图也会重试，没下完的不动', async () => {
  const [bad, loading] = [new FakeImg('/assets/icons/a.png?v=36'), new FakeImg('/assets/icons/b.png?v=36')];
  bad.complete = true;
  const { timers } = await setup({ imgs: [bad, loading] });
  assert.equal(timers.length, 1);
  timers.pop().fn();
  assert.equal(bad.attrs.src, '/assets/icons/a.png?v=36&r=1');
  assert.equal(loading.attrs.src, '/assets/icons/b.png?v=36');
});

test('LazyArt：占位只给看得见又没到的图，缓存里的、藏着的不动', async () => {
  const [late, done, off] = [new FakeImg('a'), new FakeImg('b'), new FakeImg('c')];
  Object.assign(done, { complete: true, naturalWidth: 72 });
  off.offsetParent = null;
  const { on, timers } = await setup({ imgs: [late, done, off] });
  on.doc.click({});
  on.doc.click({});
  assert.equal(timers.length, 1, '连点只看一次');
  timers.pop().fn();
  assert.deepEqual([late, done, off].map((x) => x.classList.contains('art-pending')), [true, false, false]);
  on.doc.load({ target: late });
  assert.ok(!late.classList.contains('art-pending'));
});

test('LazyArt：预取同时 3 张、不重复；省流量模式不取；自动化测试改成全部下载', async () => {
  const { L, made } = await setup();
  L.warmArt(['a', 'b', 'c', 'd', 'a', '']);
  assert.deepEqual(made.map((x) => x.src), ['a', 'b', 'c']);
  made[0].onload();
  assert.deepEqual(made.map((x) => x.src), ['a', 'b', 'c', 'd']);
  L.warmArt(['a', 'd']);
  assert.equal(made.length, 4);
  const save = await setup({ saveData: true });
  save.L.warmArt(['a']);
  assert.equal(save.made.length, 0);
  const img = new FakeImg('a');
  await setup({ webdriver: true, imgs: [img] });
  assert.equal(img.loading, 'eager');
  assert.equal(L.artUrl('<img class="x" src="/assets/icons/a.png?v=36" alt="" />'), '/assets/icons/a.png?v=36');
});
