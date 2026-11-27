// 首屏体积（纯静态，不开浏览器）：node scripts/first_screen.mjs [--json] [--list]
// 首屏 = 打开网址 → 封面 → 备战大厅「出战」页完整显示为止必须下载的字节。读 dist/、index.html 与 src/。
// 假设：全新存档；图标 loading="lazy" 且所在面板没显示时不下载（浏览器规范行为）；大厅「出战」页整页都算，不扣折叠线以下的。
import { gzipSync } from 'node:zlib';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GAME_ROOT } from './lib/load_ts.mjs';
import { harvestExports, inside, reachableIdentifiers, read, scanHtml, stripQuery } from './lib/asset_scan.mjs';

const DIST = path.join(GAME_ROOT, 'dist');
const size = (file) => (existsSync(file) ? readFileSync(file).length : 0);
const gz = (file) => (existsSync(file) ? gzipSync(readFileSync(file), { level: 9 }).length : 0);

/** style.css 里永远 display:none 的容器（同一组选择器；那条规则没了就说明前提变了，直接报错）。 */
const CSS_HIDDEN = ['.title-crest-trio', '#btn-mecha-mode'];
const CSS_HIDDEN_RULE = /\.title-crest-trio,\s*#btn-mecha-mode,\s*\.ui-upgrade-burst-container \{\s*display: none !important;/;

/** main.ts 打开大厅时往看得见的位置塞的图（全新存档）。改了这几处渲染要同步改这里。 */
const LOBBY_INJECTED = [
  ['renderMainMenu：角色皮肤条 / 战绩 / 种族点数', ['ui_sparkle', 'ui_trophy', 'ui_star']],
  ['renderMainMenu：吉祥物、大招、主炮', ['race_swarm', 'hud_hammer', 'ui_rocket']],
  ['renderMainMenu：分享按钮（今天没领过）', ['ui_gift']],
  ['renderMainMenu：排行榜前三与每行图标', ['ui_medal1', 'ui_medal2', 'ui_medal3', 'ui_trophy']],
];
/** 排行榜头像：按名次轮流用 7 个种族。 */
const LB_RACES = ['swarm', 'titan', 'gate', 'plasma', 'orbital', 'bastion', 'tycoon'];

export async function firstScreen() {
  const css = read('src/style.css');
  if (!CSS_HIDDEN_RULE.test(css)) throw new Error('style.css 里隐藏封面徽章的规则变了，first_screen.mjs 的前提不成立');

  const rows = [];
  const add = (kind, file, why) => {
    const rel = path.relative(DIST, file).replace(/\\/g, '/');
    if (!rows.some((r) => r.file === rel)) rows.push({ kind, file: rel, bytes: size(file), gzip: /\.(js|css|html|svg)$/.test(rel) ? gz(file) : null, why });
  };
  const addUrl = (url, why) => add('图片', path.join(DIST, stripQuery(url)), why);

  // 1. 页面、脚本（入口 + 静态 import 闭包）、样式、网站图标
  const distHtml = readFileSync(path.join(DIST, 'index.html'), 'utf8');
  add('HTML', path.join(DIST, 'index.html'), '页面');
  const js = [];
  for (const el of scanHtml(distHtml)) {
    if (el.tag === 'script' && el.attrs.src) js.push(el.attrs.src);
    if (el.tag === 'link' && el.attrs.rel === 'modulepreload') js.push(el.attrs.href);
    if (el.tag === 'link' && el.attrs.rel === 'stylesheet') add('CSS', path.join(DIST, el.attrs.href), '页面');
    if (el.tag === 'link' && /icon/.test(el.attrs.rel || '')) addUrl(el.attrs.href, '网站图标');
  }
  for (const f of js) {
    const file = path.join(DIST, f);
    if (rows.some((r) => path.join(DIST, r.file) === file)) continue;
    add('JS', file, '入口与静态 import');
    const code = readFileSync(file, 'utf8');
    for (const m of code.matchAll(/(?:^|[;}])\s*(?:import|export)\s*(?:[\w$*{},\s]+?from\s*)?["'](\.\/[^"']+\.js)["']/g)) js.push(`/${path.relative(DIST, path.resolve(path.dirname(file), m[1])).replace(/\\/g, '/')}`);
  }

  // 2. CSS 背景图（style.css 里的都在封面 / 大厅）
  for (const m of css.matchAll(/url\(\s*['"]?([^'")]+)/g)) if (m[1].startsWith('/')) addUrl(m[1], 'CSS 背景');

  // 3. index.html 里的 <img>
  const html = read('index.html');
  let eager = 0;
  let deferred = 0;
  for (const el of scanHtml(html).filter((e) => e.tag === 'img')) {
    const lazy = el.attrs.loading === 'lazy';
    const hidden =
      el.trail.some((p) => {
        const cls = (p.attrs.class || '').split(/\s+/);
        if (p.attrs.id === 'main-menu') return false; // 大厅会打开
        return cls.includes('hidden') || /display:\s*none/.test(p.attrs.style || '') || (cls.includes('menu-panel') && !cls.includes('active'));
      }) || CSS_HIDDEN.some((s) => inside(el, s));
    if (lazy && hidden) deferred += 1;
    else {
      eager += 1;
      addUrl(el.attrs.src, hidden ? '藏着但没有 lazy' : 'index.html 看得见');
    }
  }

  // 4. 脚本塞进来的图
  const icons = read('src/game/SkillIcons.ts');
  const helpersLazy = !/loading="eager"/.test(icons);
  if (!helpersLazy) {
    // 图标默认 eager：开局就渲染的全部面板（天赋、工坊、皮肤…）不管藏没藏都会下载
    const exportsMap = await harvestExports();
    const { used } = reachableIdentifiers(['startLevel', 'openTitleScreen', 'openMainMenu']);
    for (const [name, urls] of exportsMap) if (used.has(name)) for (const u of urls) addUrl(u, `开局渲染 ${name}`);
  }
  for (const [why, names] of LOBBY_INJECTED) for (const n of names) addUrl(`/assets/icons/${n}.png`, why);
  const suffix = /raceThumbUrl\(avatarRace\)/.test(read('src/main.ts')) ? '_sm' : '';
  for (const r of LB_RACES) addUrl(`/assets/icons/race_${r}${suffix}.png`, 'renderMainMenu：排行榜头像');

  const sum = (kind, key = 'bytes') => rows.filter((r) => !kind || r.kind === kind).reduce((a, r) => a + (r[key] ?? r.bytes), 0);
  const totals = Object.fromEntries(['HTML', 'JS', 'CSS', '图片'].map((k) => [k, { files: rows.filter((r) => r.kind === k).length, bytes: sum(k), wire: sum(k, 'gzip') }]));
  return {
    rows,
    totals,
    total: { files: rows.length, bytes: sum(), wire: sum(null, 'gzip') },
    audio: 0, // 全部由 Web Audio 实时合成，没有音频文件
    font: 0, // 全部用系统字体，没有 @font-face
    htmlImg: { eager, deferred },
    helpersLazy,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const r = await firstScreen();
  if (process.argv.includes('--json')) console.log(JSON.stringify(r, null, 1));
  else {
    const n = (v) => v.toLocaleString('en-US').padStart(12);
    console.log('类别        文件        磁盘字节    传输字节（文本按 gzip -9）');
    for (const [k, v] of Object.entries(r.totals)) console.log(`${k.padEnd(6)}${String(v.files).padStart(8)}${n(v.bytes)}${n(v.wire)}`);
    console.log(`音频           0           0           0\n字体           0           0           0`);
    console.log(`合计  ${String(r.total.files).padStart(8)}${n(r.total.bytes)}${n(r.total.wire)}`);
    console.log(`index.html 的 <img>：首屏要下载 ${r.htmlImg.eager} 个标签，推迟 ${r.htmlImg.deferred} 个；图标工具函数 ${r.helpersLazy ? 'lazy' : 'eager'}`);
    if (process.argv.includes('--list')) for (const x of [...r.rows].sort((a, b) => b.bytes - a.bytes)) console.log(`${n(x.bytes)}  ${x.kind}  ${x.file}  （${x.why}）`);
  }
}
