// static_check.mjs — 不开浏览器的静态检查（node 纯文本）：
//   node games/ar-survivor/tests/static_check.mjs
// 1. public/*.js 语法；2. 被引用的 id 在 HTML / 模板里存在、HTML 里没有重复 id；
// 3. 引用到的本地资源与页面文件存在；4. 没有未定义的入口函数；5. 船坞两排不留空洞；
// 6. 没有表情符号 / 内联 svg；7. 页面与脚本没有漏记的外部地址（必须写进 docs/THIRD_PARTY.md）
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUB = path.join(ROOT, 'public');
const read = (p) => fs.readFileSync(p, 'utf8');
const problems = [];
const notes = [];
const fail = (tag, msg) => problems.push(`[${tag}] ${msg}`);

const publicFiles = fs.readdirSync(PUB).filter((f) => fs.statSync(path.join(PUB, f)).isFile());
const jsFiles = publicFiles.filter((f) => f.endsWith('.js'));
const htmlFiles = publicFiles.filter((f) => f.endsWith('.html'));
const cssFiles = publicFiles.filter((f) => f.endsWith('.css'));
const testFiles = fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => /^verify_.*\.mjs$/.test(f));

// ---------- 1. 语法 ----------
for (const f of jsFiles) {
  const r = spawnSync(process.execPath, ['--check', path.join(PUB, f)], { encoding: 'utf8' });
  if (r.status !== 0) fail('语法', `${f}: ${String(r.stderr).split('\n').slice(0, 4).join(' ')}`);
}
for (const f of testFiles) {
  const r = spawnSync(process.execPath, ['--check', path.join(ROOT, 'tests', f)], { encoding: 'utf8' });
  if (r.status !== 0) fail('语法', `tests/${f}: ${String(r.stderr).split('\n').slice(0, 4).join(' ')}`);
}

const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1');
const indexHtml = read(path.join(PUB, 'index.html'));
const htmlNoComments = indexHtml.replace(/<!--[\s\S]*?-->/g, '');
const js = Object.fromEntries(jsFiles.map((f) => [f, read(path.join(PUB, f))]));
const jsCode = Object.fromEntries(jsFiles.map((f) => [f, stripComments(js[f])]));
const allJs = Object.values(jsCode).join('\n');

// ---------- 2. id ----------
const htmlIds = [...htmlNoComments.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
const seen = new Set();
for (const id of htmlIds) {
  if (seen.has(id)) fail('重复id', id);
  seen.add(id);
}
const knownIds = new Set(htmlIds);
const knownPrefixes = [];
for (const m of allJs.matchAll(/\bid="([^"$]*)(\$\{)?/g)) m[2] ? m[1] && knownPrefixes.push(m[1]) : knownIds.add(m[1]);
for (const m of allJs.matchAll(/\.id\s*=\s*['"`]([^'"`$]*)(\$\{)?/g)) m[2] ? m[1] && knownPrefixes.push(m[1]) : knownIds.add(m[1]);
const idOk = (id) => knownIds.has(id) || knownPrefixes.some((p) => id.startsWith(p));
const prefixOk = (p) => [...knownIds].some((id) => id.startsWith(p)) || knownPrefixes.some((k) => k.startsWith(p) || p.startsWith(k));

let idRefs = 0;
function checkIds(code, label) {
  for (const m of code.matchAll(/getElementById\(\s*(['"`])([^'"`]+)\1\s*\)/g)) {
    idRefs += 1;
    const dyn = m[2].indexOf('${');
    if (dyn >= 0) {
      if (dyn > 0 && !prefixOk(m[2].slice(0, dyn))) fail('id', `${label}: getElementById(${m[2]}) 没有任何 id 以此开头`);
    } else if (!idOk(m[2])) fail('id', `${label}: getElementById('${m[2]}') 不存在`);
  }
  for (const m of code.matchAll(/(?:querySelector(?:All)?|page\.click|page\.tap|page\.locator|\.\$|\.\$\$|closest)\(\s*(['"`])([^'"`]*?#[^'"`]*)\1/g)) {
    for (const s of m[2].matchAll(/#([A-Za-z][\w-]*)(\$\{)?/g)) {
      idRefs += 1;
      if (s[2] ? !prefixOk(s[1]) : !idOk(s[1])) fail('id', `${label}: 选择器 ${m[2]} 里的 #${s[1]} 不存在`);
    }
  }
}
for (const f of jsFiles) checkIds(jsCode[f], f);
for (const f of testFiles) checkIds(stripComments(read(path.join(ROOT, 'tests', f))), `tests/${f}`);
// 测试里作为数组元素写的 '#btn-…' 入口
for (const f of testFiles) {
  for (const m of stripComments(read(path.join(ROOT, 'tests', f))).matchAll(/['"]#(btn-[\w-]+)['"]/g)) {
    idRefs += 1;
    if (!idOk(m[1])) fail('id', `tests/${f}: '#${m[1]}' 不存在`);
  }
}

// data-arN-shortcut：测试点的抽屉快捷入口必须还在
const shortcuts = new Set([...allJs.matchAll(/data-(ar\d+)-shortcut="([\w-]+)"/g)].map((m) => `${m[1]}:${m[2]}`));
for (const f of [...jsFiles, ...testFiles.map((t) => `../tests/${t}`)]) {
  const code = stripComments(read(path.join(PUB, f)));
  for (const m of code.matchAll(/\[data-(ar\d+)-shortcut="([\w-]+)"\]/g)) {
    if (!shortcuts.has(`${m[1]}:${m[2]}`)) fail('快捷入口', `${f}: [data-${m[1]}-shortcut="${m[2]}"] 已不存在`);
  }
}

// ---------- 3. 资源文件 ----------
const assetRefs = new Set();
for (const f of [...htmlFiles, ...cssFiles, ...jsFiles]) {
  const src = read(path.join(PUB, f));
  for (const m of src.matchAll(/(?:\.\/)?assets\/([\w.-]+\.(?:webp|png|jpe?g|gif|mp3|ogg|wav|json))/g)) assetRefs.add(m[1]);
  if (f.endsWith('.html')) {
    for (const m of src.matchAll(/(?:href|src)="(\.\/[^"#?]+|[\w-]+\.(?:html|css|js))(?:[?#][^"]*)?"/g)) {
      if (!fs.existsSync(path.join(PUB, m[1]))) fail('资源', `${f} 引用的 ${m[1]} 不存在`);
    }
  }
  if (f.endsWith('.js')) {
    for (const m of src.matchAll(/from\s+'(\.\/[^'?]+)(?:\?[^']*)?'/g)) {
      if (!fs.existsSync(path.join(PUB, m[1]))) fail('资源', `${f} import 的 ${m[1]} 不存在`);
    }
  }
}
for (const a of assetRefs) {
  const p = path.join(PUB, 'assets', a);
  if (!fs.existsSync(p) || fs.statSync(p).size === 0) fail('资源', `assets/${a} 不存在或为空`);
}
// 同一个脚本 / 样式在各处的 ?v= 必须一致，否则会被浏览器当成两份模块
const versions = {};
for (const f of [...htmlFiles, ...jsFiles]) {
  for (const m of read(path.join(PUB, f)).matchAll(/\.\/([\w-]+\.(?:js|css))(?:\?v=(\w+))?['"]/g)) {
    (versions[m[1]] ||= new Set()).add(m[2] || '无版本号');
  }
}
for (const [file, set] of Object.entries(versions)) {
  if (set.size > 1) fail('版本号', `${file} 有多个版本号：${[...set].join(' / ')}`);
  if (set.has('无版本号')) fail('版本号', `${file} 没有 ?v= 版本号`);
}

// ---------- 4. 未定义的入口函数 ----------
const CALL_RE = /(^|[^.\w$])((?:open|toggle|dismiss|close|show|hide|start|stop|sync|render|setup|handle|award|grant|settle|save|reconcile|foldOrHide|cancel|switch)[A-Z][\w$]*)\s*\(/g;
let callRefs = 0;
for (const f of jsFiles) {
  const code = jsCode[f];
  const defined = new Set();
  for (const m of code.matchAll(/\bfunction\*?\s+([\w$]+)\s*\(/g)) defined.add(m[1]);
  for (const m of code.matchAll(/\b(?:const|let|var)\s+([\w$]+)\s*=/g)) defined.add(m[1]);
  for (const m of code.matchAll(/^\s+(?:async\s+)?([\w$]+)\s*\((?:[^()]|\([^()]*\))*\)\s*\{/gm)) defined.add(m[1]); // 类 / 对象方法
  for (const m of code.matchAll(/\bimport\s*\{([^}]*)\}/g)) m[1].split(',').forEach((s) => defined.add(s.trim().split(/\s+as\s+/).pop()));
  for (const m of code.matchAll(CALL_RE)) {
    callRefs += 1;
    if (!defined.has(m[2])) fail('未定义函数', `${f}: ${m[2]}()`);
  }
}

// ---------- 5. 船坞 ----------
const dockHtml = htmlNoComments.slice(htmlNoComments.indexOf('id="pet-care-bar"'), htmlNoComments.indexOf('class="action-zone"'));
const dockKeys = [...dockHtml.matchAll(/<button id="([\w-]+)" class="care-btn[\s"]/g)].map((m) => m[1]);
const dockSet = new Set(dockKeys);
if (dockSet.size !== dockKeys.length) fail('船坞', '有重复的船坞键');
if (dockKeys[dockKeys.length - 1] !== 'btn-shop') fail('船坞', '小铺必须排在最后（两排布局里它竖跨两排占最右一列）');
if (dockKeys.length > 25) fail('船坞', `船坞键只减不增，现在 ${dockKeys.length} 个`);
const css = cssFiles.map((f) => read(path.join(PUB, f))).join('\n').replace(/\/\*[\s\S]*?\*\//g, '');
// 样式表里越靠后的规则优先：取最后两次 .pet-care-bar 的列数（中等桌面 / 窄屏旋转舞台各一次）
const dockCols = [...css.matchAll(/\.pet-care-bar\s*\{[^}]*grid-template-columns:\s*repeat\((\d+)/g)].map((m) => Number(m[1])).slice(-2);
const shopCols = [...css.matchAll(/\.care-btn-shop\s*\{[^}]*grid-column:\s*(\d+)/g)].map((m) => Number(m[1])).slice(-2);
for (const cols of dockCols) {
  if (cols * 2 !== dockKeys.length - 1) fail('船坞', `两排布局每排 ${cols} 列，除小铺外共 ${dockKeys.length - 1} 键，会留空洞或换行`);
}
for (const col of shopCols) if (col !== dockCols[0] + 1) fail('船坞', `小铺在第 ${col} 列，应为第 ${dockCols[0] + 1} 列`);

// ---------- 6. 表情符号 / 内联 svg ----------
for (const f of [...htmlFiles, ...cssFiles, ...jsFiles]) {
  const src = read(path.join(PUB, f));
  if (/<svg[\s>]/i.test(src)) fail('美术', `${f} 里有内联 svg`);
  const em = src.match(/\p{Extended_Pictographic}/u);
  if (em) fail('美术', `${f} 里有表情符号 U+${em[0].codePointAt(0).toString(16)}`);
}

// ---------- 7. 外部地址都要登记 ----------
const externals = new Set();
for (const f of [...htmlFiles, ...cssFiles, ...jsFiles]) {
  for (const m of read(path.join(PUB, f)).matchAll(/https?:\/\/[^\s'"`)<>]+/g)) externals.add(m[0]);
}
const thirdPartyDoc = path.join(ROOT, 'docs', 'THIRD_PARTY.md');
if (!fs.existsSync(thirdPartyDoc)) {
  fail('外部地址', `docs/THIRD_PARTY.md 不存在（代码里有 ${externals.size} 个外部地址）`);
} else {
  const doc = read(thirdPartyDoc);
  for (const u of externals) if (!doc.includes(u)) fail('外部地址', `没有登记：${u}`);
}

notes.push(`脚本 ${jsFiles.length} 个、页面 ${htmlFiles.length} 个、验证脚本 ${testFiles.length} 个`);
notes.push(`HTML id ${htmlIds.length} 个，id 引用 ${idRefs} 处；资源 ${assetRefs.size} 个；入口函数调用 ${callRefs} 处`);
notes.push(`船坞 ${dockKeys.length} 键，两排每排 ${dockCols.join(' / ')} 列；外部地址 ${externals.size} 个`);
for (const n of notes) console.log(n);
if (problems.length) {
  console.log(`\n静态检查未通过：${problems.length} 条`);
  for (const p of problems) console.log('  ' + p);
  process.exit(1);
}
console.log('静态检查通过');
