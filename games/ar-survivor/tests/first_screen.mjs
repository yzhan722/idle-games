// first_screen.mjs — 进入养成主界面之前必须下载什么、多少字节（AR-COM5），不开浏览器：
//   node games/ar-survivor/tests/first_screen.mjs [--root <游戏目录>] [--list]
// 从 index.html / style.css / 各 js 的加载写法推出来：
// 1. HTML、样式、脚本（import 闭包）按 gzip 6 级算；图片按原样算，同一张图不同 ?v= 算两份（浏览器会下两遍）
// 2. <img>：没写 loading="lazy" 的一律算；写了的，只有看得见、或者收起时仍占着屏幕位置又没挂 data-imgs-off 的才算
// 3. sprites.js：一启动就全下的写法算全部；按需的写法用假画布跑一遍新存档的绘制，问到哪张算哪张
// 4. vision.js：默认背景 + 四个时段 / 四季里最大的一张
// 默认按新存档算；--root 可以对着旧版本跑。改后的版本另外检查上限、漏网的预载、同图多版本号
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const LIMIT = 1_500_000;
const argv = process.argv.slice(2);
const rootAt = argv.indexOf('--root');
const ROOT = rootAt >= 0 ? path.resolve(argv[rootAt + 1]) : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUB = path.join(ROOT, 'public');
const read = (f) => fs.readFileSync(path.join(PUB, f), 'utf8').replace(/\r\n/g, '\n');
const problems = [];
const gz = (f) => zlib.gzipSync(fs.readFileSync(path.join(PUB, f)), { level: 6 }).length;
const size = (f) => fs.statSync(path.join(PUB, f)).size;
const fileOf = (url) => url.replace(/^\.\//, '').replace(/\?.*$/, '');
const isAsset = (url) => /^\.\/assets\//.test(url || '');

const html = read('index.html').replace(/<!--[^]*?-->/g, '');
const css = read('style.css').replace(/\/\*[^]*?\*\//g, '');
const jsFiles = fs.readdirSync(PUB).filter((f) => f.endsWith('.js'));

// ---------- 脚本 ----------
const scripts = new Set();
const walkJs = (f) => {
  if (scripts.has(f)) return;
  scripts.add(f);
  for (const m of read(f).matchAll(/(?:from|import)\s+'\.\/([\w.-]+\.js)(?:\?[^']*)?'/g)) walkJs(m[1]);
};
for (const m of html.matchAll(/<script\b[^>]*\bsrc="\.\/([\w.-]+\.js)/g)) walkJs(m[1]);
for (const m of html.matchAll(/<link\b[^>]*rel="modulepreload"[^>]*href="\.\/([\w.-]+\.js)/g)) walkJs(m[1]);
const styles = [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="\.\/([\w.-]+\.css)/g)].map((m) => m[1]);

// ---------- 图片 ----------
const need = new Map(); // url -> 来由
const want = (url, why) => {
  if (!isAsset(url)) return;
  if (!need.has(url)) need.set(url, new Set());
  need.get(url).add(why);
};

// 收起时不是 display:none 的面板：里面的图片有盒子、就在屏幕边上，loading="lazy" 拦不住
const softHidden = new Set();
for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
  for (const sel of m[1].split(',')) {
    const c = sel.trim().match(/^\.([\w-]+)\.hidden$/);
    if (c && !/display:\s*none/.test(m[2])) softHidden.add(c[1]);
    if (c && /display:\s*none/.test(m[2])) softHidden.delete(c[1]);
  }
}
const gateRule = /\.hidden\[data-imgs-off\]\s+img\s*\{[^}]*translate:\s*0 -99999px\s*!important/.test(css);
const VOID = new Set(['img', 'input', 'br', 'meta', 'link', 'hr', 'source']);
const stack = [];
const domImgs = [];
for (const m of html.matchAll(/<(\/?)([a-zA-Z][\w-]*)((?:\s+[^\s=>/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>/g)) {
  const tag = m[2].toLowerCase();
  if (m[1]) {
    for (let k = stack.length - 1; k >= 0; k--) if (stack[k].tag === tag) { stack.length = k; break; }
    continue;
  }
  const attr = (n) => (m[3].match(new RegExp(`\\s${n}="([^"]*)"`)) || [])[1];
  const el = { tag, id: attr('id') || '', cls: (attr('class') || '').split(/\s+/), off: /\sdata-imgs-off(?:[\s=]|$)/.test(m[3]) };
  if (tag === 'img') domImgs.push({ src: attr('src') || '', lazy: attr('loading') === 'lazy', el, parents: [...stack], at: html.slice(0, m.index).split('\n').length });
  if (!m[4] && !VOID.has(tag)) stack.push(el);
}
let gated = 0;
for (const im of domImgs) {
  if (!isAsset(im.src)) continue;
  const chain = [im.el, ...im.parents];
  const hidden = chain.filter((e) => e.cls.includes('hidden'));
  // display:none（胶囊、分段、小红点这类）或者挂了 data-imgs-off 的收起面板
  const blocked = hidden.some((e) => (e.off && gateRule) || !e.cls.some((c) => softHidden.has(c)));
  if (!im.lazy) want(im.src, hidden.length ? 'HTML 收起的面板里直接下' : 'HTML 看得见');
  else if (!blocked) want(im.src, hidden.length ? 'HTML 收起但没拦住' : 'HTML 看得见（懒加载）');
  else gated += 1;
}
for (const m of html.matchAll(/<link\b[^>]*href="(\.\/assets\/[^"]+)"/g)) want(m[1], 'HTML link');
for (const m of css.matchAll(/url\('?(\.\/assets\/[^')]+)'?\)/g)) want(m[1], 'CSS 背景');

// 画布贴图
const spritesSrc = read('sprites.js');
const spriteUrl = Object.fromEntries([...spritesSrc.slice(0, spritesSrc.indexOf('\n};')).matchAll(/^\s+(\w+): '(\.\/assets\/[^']+)'/gm)].map((m) => [m[1], m[2]]));
const eagerSprites = /const img = new Image\(\);\s*img\.src = src;\s*images\[key\] = img;/.test(spritesSrc);
const gameSrc = read('game.js');
let backfill = [];
const roomMax = new Set();
if (eagerSprites) for (const u of Object.values(spriteUrl)) want(u, '画布预载');
else {
  const asked = new Set();
  class FakeImage {
    set src(v) { this._src = v; asked.add(v); }
    get src() { return this._src || ''; }
    get complete() { return false; }
    get naturalWidth() { return 0; }
    addEventListener() {}
  }
  const ctx2d = new Proxy({}, {
    get: (t, k) => (k in t ? t[k] : k === 'createRadialGradient' || k === 'createLinearGradient' ? () => ({ addColorStop() {} }) : k === 'measureText' ? (s) => ({ width: String(s).length * 12 }) : () => {}),
    set: (t, k, v) => { t[k] = v; return true; }
  });
  const context = vm.createContext({ Image: FakeImage, performance: { now: () => 1000 }, Math, setTimeout: () => 0, navigator: {}, console });
  const code = spritesSrc.replace(/^export\s+\{[^}]*\};?\s*$/gm, '').replace(/^export\s+(?=function|const|let|class)/gm, '');
  const names = [...new Set([...spritesSrc.matchAll(/^(?:export )?function (draw\w+)\(/gm)].map((m) => m[1]))];
  vm.runInContext(`${code}\nglobalThis.__m = { ${names.join(', ')}, isReady, images, HERO_BACKFILL };`, context);
  const mod = context.__m;
  for (const u of asked) want(u, '画布：第一批');
  backfill = mod.HERO_BACKFILL.map((k) => spriteUrl[k]);
  // 新存档：player 字面量里的各种 xxxVisual 初值，加上默认摆着的小夜灯、一盆多肉；信箱有信、窗台有猫按“可能有”算进去
  const player = { x: 600, y: 480, vx: 0, vy: 0, facing: 1, onGround: true, climbState: 'none', emote: '', emoteTimer: 0, idleTime: 0, petAction: 'idle', equipped: {}, spinTimer: 0 };
  const lit = gameSrc.slice(gameSrc.indexOf('\nconst player = {'));
  for (const m of lit.slice(0, lit.indexOf('\n};')).matchAll(/^ {2}(\w+Visual): (\{.*\}),$/gm)) player[m[1]] = vm.runInNewContext(`(${m[2]})`);
  player.displayedTerrariumPlants = [{ spriteKey: 'plantPeachSucculent', level: 1, hasDew: true, x: 300, y: 500, shortName: '' }];
  player.mailboxVisual = { unread: 1 };
  player.kittenVisual = { ...player.kittenVisual, active: true, kittenId: 'ginger', spriteKey: 'kittenGinger' };
  const body = gameSrc.slice(gameSrc.indexOf('\nfunction renderEntities('));
  const render = body.slice(0, body.indexOf('\n}\n'));
  const calls = [...render.matchAll(/^ {4}(draw\w+)\(ctx, player, (W, H, now|now, W|now)\);$/gm)];
  if (calls.length < 30) problems.push(`renderEntities 里只认出 ${calls.length} 个房间绘制，解析要跟着改`);
  asked.clear();
  // 挡在后面的图要等前面的到了才会问：假装问到的都到了，再画一轮，直到不再有新的
  for (let round = 0; round < 6; round++) {
    const before = asked.size;
    for (const c of calls) c[2] === 'W, H, now' ? mod[c[1]](ctx2d, player, 1280, 720, 1000) : mod[c[1]](ctx2d, player, 1000, 1280);
    mod.drawFurnitureItem(ctx2d, { key: 'lamp', x: 200, y: 480, manualOn: true }, 1000);
    mod.drawHeroSprite(ctx2d, { ...player }, 1000 + round * 16);
    mod.drawInteractionVfx(ctx2d, [{ shape: 'heart', life: 1, x: 0, y: 0 }, { shape: 'dot', life: 1, x: 0, y: 0 }], [], null, 1000);
    for (const img of Object.values(mod.images)) if (asked.has(img.src)) Object.defineProperties(img, { complete: { value: true, configurable: true }, naturalWidth: { value: 128, configurable: true }, naturalHeight: { value: 128, configurable: true } });
    if (asked.size === before) break;
  }
  for (const u of asked) want(u, '画布：新存档的房间');
  // 房间摆满的上限：这些绘制函数里出现过的所有贴图
  for (const c of calls) {
    const fn = spritesSrc.slice(spritesSrc.indexOf(`function ${c[1]}(`));
    for (const m of fn.slice(0, fn.indexOf('\n}\n')).matchAll(/images\.(\w+)/g)) if (spriteUrl[m[1]]) roomMax.add(spriteUrl[m[1]]);
  }
}

// vision.js：默认背景、时段窗景与季节点缀各取最大的一张、窗内星芒
const visionSrc = read('vision.js');
const pick = (names, why) => {
  const urls = names.map((n) => (visionSrc.match(new RegExp(`\\b${n}: '(\\./assets/[^']+)'`)) || [])[1]).filter(Boolean);
  urls.sort((a, b) => size(fileOf(b)) - size(fileOf(a)));
  if (urls[0]) want(urls[0], why);
  else problems.push(`vision.js 里认不出${why}`);
};
pick(['cream_study'], '默认房间背景');
pick(['morning', 'noon', 'dusk', 'starry'], '窗景（四个时段最大的一张）');
pick(['spring', 'summer', 'autumn', 'winter'], '季节点缀（四季最大的一张）');
want((visionSrc.match(/sp\.src = '(\.\/assets\/[^']+)'/) || [])[1], '窗内星芒');
// 左上角窗景胶囊的图标换成当季
for (const m of gameSrc.matchAll(/ico: '(\.\/assets\/vfx_season_\w+\.webp[^']*)'/g)) if (size(fileOf(m[1])) === Math.max(...[...gameSrc.matchAll(/ico: '(\.\/assets\/vfx_season_\w+\.webp)/g)].map((x) => size(fileOf(x[1]))))) want(m[1], '窗景胶囊图标');

// ---------- 汇总 ----------
const sum = (list, f) => list.reduce((a, x) => a + f(x), 0);
const imgs = [...need.keys()];
for (const u of imgs) if (!fs.existsSync(path.join(PUB, fileOf(u)))) problems.push(`${u} 不存在`);
const rows = [
  ['HTML', 1, size('index.html'), gz('index.html')],
  ['CSS', styles.length, sum(styles, size), sum(styles, gz)],
  ['脚本', scripts.size, sum([...scripts], size), sum([...scripts], gz)],
  ['图片', imgs.length, sum(imgs, (u) => size(fileOf(u))), sum(imgs, (u) => size(fileOf(u)))]
];
const total = rows.reduce((a, r) => [a[0] + r[1], a[1] + r[2], a[2] + r[3]], [0, 0, 0]);
const n = (x) => x.toLocaleString('en-US');
console.log(`首屏必须下载（新存档，${eagerSprites ? '画布贴图一启动全下' : '画布贴图按需'}）`);
for (const r of [...rows, ['合计', ...total]]) console.log(`  ${r[0]}  ${r[1]} 个  原始 ${n(r[2])}  传输 ${n(r[3])}`);
const byWhy = new Map();
for (const [u, why] of need) {
  const k = [...why][0];
  byWhy.set(k, [(byWhy.get(k)?.[0] || 0) + 1, (byWhy.get(k)?.[1] || 0) + size(fileOf(u))]);
}
for (const [k, v] of byWhy) console.log(`    ${k}：${v[0]} 张 ${n(v[1])}`);
if (backfill.length) {
  const late = backfill.filter((u) => !need.has(u));
  console.log(`  之后在后台补：角色其余动作 ${late.length} 张 ${n(sum(late, (u) => size(fileOf(u))))}（低优先级，省流量模式不补）`);
  const extra = [...roomMax].filter((u) => !need.has(u));
  console.log(`  房间摆满时最多再多 ${extra.length} 张 ${n(sum(extra, (u) => size(fileOf(u))))}；收起的面板里拦下 ${gated} 处 <img>`);
}
if (argv.includes('--list')) for (const u of imgs.sort()) console.log(`    ${String(size(fileOf(u))).padStart(7)}  ${u}  ${[...need.get(u)].join('、')}`);

// ---------- 只对改后的版本检查 ----------
if (!eagerSprites) {
  if (total[2] > LIMIT) problems.push(`首屏 ${n(total[2])} 超过上限 ${n(LIMIT)}`);
  if (!gateRule) problems.push('style.css 里没有 .hidden[data-imgs-off] img 的规则');
  for (const im of domImgs) {
    if (!isAsset(im.src) || im.lazy) continue;
    if ([im.el, ...im.parents].some((e) => e.cls.includes('hidden') && e.id !== 'camera-notice')) problems.push(`index.html:${im.at} 收起的面板里的 ${im.src} 没写 loading="lazy"`);
  }
  for (const why of byWhy.keys()) if (/没拦住/.test(why)) problems.push('有收起的面板没挂 data-imgs-off');
  for (const f of jsFiles.filter((x) => /^room-/.test(x))) {
    const t = read(f);
    for (const m of t.matchAll(/<img (?!loading="lazy" )/g)) problems.push(`${f}:${t.slice(0, m.index).split('\n').length} 房间面板模板里的 <img> 没写 loading="lazy"`);
  }
  const seen = new Map();
  for (const f of ['index.html', 'style.css', ...jsFiles]) {
    for (const m of read(f).matchAll(/\.\/assets\/([\w.-]+)(?:\?v=(\w+))?/g)) {
      if (!seen.has(m[1])) seen.set(m[1], new Map());
      seen.get(m[1]).set(m[2] || '无', f);
    }
  }
  for (const [a, v] of seen) if (v.size > 1) problems.push(`assets/${a} 有 ${[...v].map(([k, f]) => `${k}（${f}）`).join('、')}，会下两遍`);
}
if (problems.length) {
  console.log(`\n首屏检查未通过：${problems.length} 条`);
  for (const p of problems) console.log('  ' + p);
  process.exit(1);
}
console.log('首屏检查通过');
