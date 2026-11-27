// split_check.mjs — game.js 拆分（AR-COM5）的证明，不开浏览器，也不执行游戏代码：
//   node games/ar-survivor/tests/split_check.mjs [--against <搬移前的 game.js>]
// 1. 按 [[split N]] 记号把各文件拼回一份 game.js，撤掉搬移之后登记过的小修，与搬移前比对
//    （默认比 tests/split_manifest.json 里的 SHA-256；--against 再做一次逐字节比对）
// 2. node --check 全部脚本；行数上限
// 3. 顶层声明扫描：没有未声明的名字、重名、跨文件改写；导入导出对得上；?v= 处处一致
// 4. 搬出去的文件求值时没有副作用，也不读别的文件：早求值、晚求值结果一样，所以没有跨文件 TDZ
// 5. V8 只链接不求值，确认每个导入名都解析得到
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { GAME_MODULES, SPLIT_MANIFEST, joinGameSource } from './_split_lib.mjs';

const SELF = fileURLToPath(import.meta.url);
const FLAGS = ['--expose-internals', '--experimental-vm-modules', '--no-warnings'];
if (!process.execArgv.includes('--expose-internals')) {
  const r = spawnSync(process.execPath, [...FLAGS, SELF, ...process.argv.slice(2)], { stdio: 'inherit' });
  process.exit(r.status ?? 1);
}
// node 自带的 acorn（不加依赖）
const acorn = createRequire(import.meta.url)('internal/deps/acorn/acorn/dist/acorn');

const ROOT = path.resolve(path.dirname(SELF), '..');
const PUB = path.join(ROOT, 'public');
const manifest = SPLIT_MANIFEST;
const MODULES = GAME_MODULES;
const FILES = ['game.js', ...MODULES];
const problems = [];
const fail = (tag, msg) => problems.push(`[${tag}] ${msg}`);
const raw = Object.fromEntries(FILES.map((f) => [f, fs.readFileSync(path.join(PUB, f), 'utf8')]));
const text = Object.fromEntries(FILES.map((f) => [f, raw[f].replace(/\r\n/g, '\n')]));
const sha = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');

// ---------- 1. 拼回比对 ----------
const undone = { ...text };
// 图片 ?v=：先按文件还原成搬移前的号
const bump = manifest.assetVersions || { from: {}, except: {} };
let bumped = 0;
for (const [f, byOld] of Object.entries(bump.from)) {
  for (const [old, names] of Object.entries(byOld)) {
    for (const name of names) {
      const parts = undone[f].split(`assets/${name}?v=${bump.except[name] || bump.to}`);
      if (parts.length < 2) fail('图片版本号', `${f}: 登记过 ${name}，文件里没有`);
      undone[f] = parts.join(`assets/${name}?v=${old}`);
      bumped += parts.length - 1;
    }
  }
}
for (const e of [...manifest.edits].reverse()) {
  const parts = undone[e.file].split(e.after);
  const want = e.count || 1;
  if (parts.length !== want + 1) fail('登记的改动', `${e.file}: 「${e.why}」在文件里出现 ${parts.length - 1} 次，应为 ${want} 次`);
  else undone[e.file] = parts.join(e.before);
}
const { whole, blocks } = joinGameSource(undone, (m) => fail('记号', m));
const gotSha = sha(whole);
if (manifest.baseline && gotSha !== manifest.baseline.sha256LF) fail('拼回', `SHA-256 ${gotSha} ≠ 搬移前 ${manifest.baseline.sha256LF}`);
const againstAt = process.argv.indexOf('--against');
let byteNote = '未给 --against，只比 SHA-256';
if (againstAt > 0) {
  const before = fs.readFileSync(process.argv[againstAt + 1]);
  // 工作区是 CRLF（git 里存 LF）：按备份文件的换行还原后逐字节比
  const eol = before.includes('\r\n') ? '\r\n' : '\n';
  const after = Buffer.from(whole.replace(/\n/g, eol), 'utf8');
  if (Buffer.compare(before, after) !== 0) {
    let k = 0;
    while (k < before.length && before[k] === after[k]) k++;
    fail('逐字节', `第 ${k} 字节起不同（搬移前 ${before.length}，拼回 ${after.length}）`);
  }
  byteNote = `逐字节比对 ${before.length} 字节`;
}

// ---------- 2. 语法与行数 ----------
for (const f of fs.readdirSync(PUB).filter((x) => x.endsWith('.js'))) {
  const r = spawnSync(process.execPath, ['--check', path.join(PUB, f)], { encoding: 'utf8' });
  if (r.status !== 0) fail('语法', `${f}: ${String(r.stderr).split('\n').slice(0, 4).join(' ')}`);
}
const lineCount = (s) => s.split('\n').length - 1;
if (lineCount(text['game.js']) >= 15000) fail('行数', `game.js ${lineCount(text['game.js'])} 行`);
for (const f of MODULES) if (lineCount(text[f]) >= 4000) fail('行数', `${f} ${lineCount(text[f])} 行`);

// ---------- 作用域分析 ----------
const parse = (s) => acorn.parse(s, { ecmaVersion: 'latest', sourceType: 'module', locations: true });
const SKIP = new Set(['type', 'loc', 'start', 'end', 'raw', 'regex']);
function patNames(p, out = []) {
  if (!p) return out;
  if (p.type === 'Identifier') out.push(p.name);
  else if (p.type === 'ObjectPattern') for (const q of p.properties) patNames(q.type === 'RestElement' ? q.argument : q.value, out);
  else if (p.type === 'ArrayPattern') for (const e of p.elements) patNames(e, out);
  else if (p.type === 'AssignmentPattern') patNames(p.left, out);
  else if (p.type === 'RestElement') patNames(p.argument, out);
  return out;
}
function blockNames(list) {
  const s = new Set();
  for (const n of list) {
    if (n.type === 'VariableDeclaration' && n.kind !== 'var') n.declarations.forEach((d) => patNames(d.id).forEach((x) => s.add(x)));
    else if ((n.type === 'FunctionDeclaration' || n.type === 'ClassDeclaration') && n.id) s.add(n.id.name);
  }
  return s;
}
function varNames(node, out) {
  if (Array.isArray(node)) node.forEach((n) => varNames(n, out));
  else if (node && node.type && !/Function/.test(node.type) && node.type !== 'ClassBody') {
    if (node.type === 'VariableDeclaration' && node.kind === 'var') node.declarations.forEach((d) => patNames(d.id).forEach((x) => out.add(x)));
    for (const k in node) if (!SKIP.has(k) && node[k] && typeof node[k] === 'object') varNames(node[k], out);
  }
  return out;
}
// 一个节点里的自由标识符：{ name, write, deferred }；deferred = 在函数体里（求值时不执行）。
// 作为调用参数的函数按“立即执行”算（map / filter 的回调）。
function freeRefs(root) {
  const refs = [];
  const hit = (node, sc, deferred, write) => { if (!sc.some((s) => s.has(node.name))) refs.push({ name: node.name, write, deferred, line: node.loc.start.line }); };
  function pat(p, sc, d, assign) {
    if (!p) return;
    if (p.type === 'Identifier') { if (assign) hit(p, sc, d, true); }
    else if (p.type === 'MemberExpression') ex(p, sc, d);
    else if (p.type === 'ObjectPattern') for (const q of p.properties) { if (q.type === 'RestElement') pat(q.argument, sc, d, assign); else { if (q.computed) ex(q.key, sc, d); pat(q.value, sc, d, assign); } }
    else if (p.type === 'ArrayPattern') p.elements.forEach((e) => pat(e, sc, d, assign));
    else if (p.type === 'AssignmentPattern') { pat(p.left, sc, d, assign); ex(p.right, sc, d); }
    else if (p.type === 'RestElement') pat(p.argument, sc, d, assign);
    else throw new Error('没处理的绑定 ' + p.type);
  }
  function fn(n, sc, d) {
    const own = new Set(n.params.flatMap((p) => patNames(p)));
    if (n.type !== 'ArrowFunctionExpression') own.add('arguments');
    if (n.id && n.type === 'FunctionExpression') own.add(n.id.name);
    const sc2 = [own, ...sc];
    n.params.forEach((p) => pat(p, sc2, d, false));
    if (n.body.type !== 'BlockStatement') ex(n.body, sc2, d);
    else {
      const sc3 = [new Set([...varNames(n.body.body, new Set()), ...blockNames(n.body.body)]), ...sc2];
      n.body.body.forEach((x) => ex(x, sc3, d));
    }
  }
  function ex(n, sc, d) {
    if (!n) return;
    switch (n.type) {
      case 'Identifier': hit(n, sc, d, false); return;
      case 'FunctionDeclaration': case 'FunctionExpression': case 'ArrowFunctionExpression': fn(n, sc, true); return;
      case 'CallExpression': case 'NewExpression':
        ex(n.callee, sc, d);
        n.arguments.forEach((a) => (/Function/.test(a.type) ? fn(a, sc, d) : ex(a, sc, d)));
        return;
      case 'ClassDeclaration': case 'ClassExpression': {
        const sc2 = [new Set(n.id ? [n.id.name] : []), ...sc];
        ex(n.superClass, sc2, d);
        for (const m of n.body.body) {
          if (m.type === 'StaticBlock') throw new Error('没处理 static 块');
          if (m.computed) ex(m.key, sc2, d);
          if (m.value) /Function/.test(m.value.type) ? fn(m.value, sc2, true) : ex(m.value, sc2, true);
        }
        return;
      }
      case 'BlockStatement': { const sc2 = [blockNames(n.body), ...sc]; n.body.forEach((x) => ex(x, sc2, d)); return; }
      case 'VariableDeclaration': n.declarations.forEach((x) => { pat(x.id, sc, d, false); ex(x.init, sc, d); }); return;
      case 'ForStatement': {
        const sc2 = [n.init && n.init.type === 'VariableDeclaration' ? blockNames([n.init]) : new Set(), ...sc];
        ex(n.init, sc2, d); ex(n.test, sc2, d); ex(n.update, sc2, d); ex(n.body, sc2, d);
        return;
      }
      case 'ForInStatement': case 'ForOfStatement': {
        const decl = n.left.type === 'VariableDeclaration';
        const sc2 = [decl ? blockNames([n.left]) : new Set(), ...sc];
        if (decl) ex(n.left, sc2, d); else pat(n.left, sc2, d, true);
        ex(n.right, sc2, d); ex(n.body, sc2, d);
        return;
      }
      case 'SwitchStatement': {
        ex(n.discriminant, sc, d);
        const sc2 = [blockNames(n.cases.flatMap((c) => c.consequent)), ...sc];
        n.cases.forEach((c) => { ex(c.test, sc2, d); c.consequent.forEach((x) => ex(x, sc2, d)); });
        return;
      }
      case 'CatchClause': { const sc2 = [new Set(patNames(n.param)), ...sc]; pat(n.param, sc2, d, false); ex(n.body, sc2, d); return; }
      case 'AssignmentExpression':
        if (n.left.type === 'Identifier') hit(n.left, sc, d, true);
        else if (n.left.type === 'MemberExpression') ex(n.left, sc, d);
        else pat(n.left, sc, d, true);
        ex(n.right, sc, d);
        return;
      case 'UpdateExpression': n.argument.type === 'Identifier' ? hit(n.argument, sc, d, true) : ex(n.argument, sc, d); return;
      case 'MemberExpression': ex(n.object, sc, d); if (n.computed) ex(n.property, sc, d); return;
      case 'Property': if (n.computed) ex(n.key, sc, d); ex(n.value, sc, d); return;
      case 'LabeledStatement': ex(n.body, sc, d); return;
      case 'BreakStatement': case 'ContinueStatement': case 'MetaProperty':
      case 'ImportDeclaration': case 'ExportNamedDeclaration': return;
      default:
        for (const k in n) {
          if (SKIP.has(k)) continue;
          const v = n[k];
          if (Array.isArray(v)) v.forEach((x) => x && x.type && ex(x, sc, d));
          else if (v && typeof v === 'object' && v.type) ex(v, sc, d);
        }
    }
  }
  ex(root, [], false);
  return refs;
}
const declared = (n) => (n.type === 'VariableDeclaration' ? n.declarations.flatMap((d) => patNames(d.id)) : n.type === 'FunctionDeclaration' || n.type === 'ClassDeclaration' ? [n.id.name] : []);

// ---------- 3. 声明 / 导入 / 导出 ----------
const GLOBALS = new Set('document window Math JSON localStorage Date String undefined Number Boolean Object Array Set Map clearTimeout setTimeout performance Promise Image requestAnimationFrame Infinity'.split(' '));
const info = {};
const ownerFile = new Map();
for (const f of FILES) {
  const ast = parse(text[f]);
  const it = { ast, decls: new Map(), imports: new Map(), exports: new Set(), specs: new Map() };
  info[f] = it;
  ast.body.forEach((n, i) => {
    for (const x of declared(n)) {
      it.decls.set(x, { i, kind: n.type === 'FunctionDeclaration' ? 'function' : n.kind || 'class' });
      if (ownerFile.has(x)) fail('重名', `${x} 同时在 ${ownerFile.get(x)} 和 ${f}`);
      ownerFile.set(x, f);
    }
    if (n.type === 'ImportDeclaration') {
      const m = n.source.value.match(/^\.\/([\w.-]+\.js)\?v=(\w+)$/);
      if (!m) { fail('导入', `${f}: ${n.source.value} 没有 ?v=`); return; }
      it.specs.set(m[1], n.source.value);
      for (const s of n.specifiers) {
        if (s.type !== 'ImportSpecifier' || s.imported.name !== s.local.name) fail('导入', `${f}: ${s.local.name} 不是同名具名导入`);
        if (it.imports.has(s.local.name)) fail('导入', `${f}: ${s.local.name} 导入两次`);
        it.imports.set(s.local.name, m[1]);
      }
    } else if (n.type === 'ExportNamedDeclaration') {
      if (n.declaration || n.source) fail('导出', `${f}: 只许用 export { … }`);
      n.specifiers.forEach((s) => it.exports.add(s.local.name));
    } else if (n.type.startsWith('Export')) fail('导出', `${f}: ${n.type}`);
  });
}
// 旧有的四个模块只看导出名
const otherExports = {};
const exportedNames = (file) => {
  if (info[file]) return info[file].exports;
  if (!otherExports[file]) {
    const s = new Set();
    for (const n of parse(fs.readFileSync(path.join(PUB, file), 'utf8')).body) {
      if (n.type !== 'ExportNamedDeclaration') continue;
      if (n.declaration) declared(n.declaration).forEach((x) => s.add(x));
      n.specifiers.forEach((x) => s.add(x.exported.name));
    }
    otherExports[file] = s;
  }
  return otherExports[file];
};
let refCount = 0;
let crossCount = 0;
for (const f of FILES) {
  const it = info[f];
  for (const x of it.exports) if (!it.decls.has(x)) fail('导出', `${f}: 导出了没声明的 ${x}`);
  for (const [x, from] of it.imports) {
    if (!exportedNames(from).has(x)) fail('导入', `${f}: ${from} 没有导出 ${x}`);
    if (it.decls.has(x)) fail('重名', `${f}: ${x} 既导入又声明`);
    crossCount += 1;
  }
  for (const n of it.ast.body) {
    for (const r of freeRefs(n)) {
      refCount += 1;
      if (it.decls.has(r.name)) continue;
      if (it.imports.has(r.name)) { if (r.write) fail('跨文件改写', `${f}:${r.line} 改写导入的 ${r.name}（运行时会抛 TypeError）`); continue; }
      if (!GLOBALS.has(r.name)) fail('未声明', `${f}:${r.line} ${r.name}`);
    }
  }
}
const versions = new Map();
for (const f of fs.readdirSync(PUB).filter((x) => /\.(js|html)$/.test(x))) {
  for (const m of fs.readFileSync(path.join(PUB, f), 'utf8').matchAll(/\.\/([\w.-]+\.js)\?v=(\w+)/g)) {
    if (!versions.has(m[1])) versions.set(m[1], new Map());
    versions.get(m[1]).set(m[2], f);
  }
}
for (const [file, v] of versions) if (v.size > 1) fail('版本号', `${file} 有 ${[...v.keys()].join(' / ')}：会被当成两份模块各执行一次`);
for (const f of MODULES) if (!info['game.js'].specs.has(f)) fail('加载', `game.js 没有导入 ${f}`);

// ---------- 4. 搬出去的文件求值时无副作用、不读别的文件 ----------
const PURE_STATIC = new Set(['Object.fromEntries', 'Object.keys', 'Object.values', 'Object.entries', 'Object.freeze', 'Array.from']);
const PURE_METHOD = new Set(['map', 'filter', 'reduce', 'concat', 'slice', 'flatMap', 'join']);
const callee = (c) => (c.type === 'MemberExpression' && !c.computed && c.object.type === 'Identifier' ? `${c.object.name}.${c.property.name}` : '');
function pure(e) {
  if (!e) return true;
  switch (e.type) {
    case 'Literal': case 'Identifier': case 'ArrowFunctionExpression': case 'FunctionExpression': return true;
    case 'TemplateLiteral': return e.expressions.every(pure);
    case 'ArrayExpression': return e.elements.every(pure);
    case 'ObjectExpression': return e.properties.every((p) => (p.type === 'SpreadElement' ? pure(p.argument) : (!p.computed || pure(p.key)) && pure(p.value)));
    case 'SpreadElement': return pure(e.argument);
    case 'UnaryExpression': return e.operator !== 'delete' && pure(e.argument);
    case 'BinaryExpression': case 'LogicalExpression': return pure(e.left) && pure(e.right);
    case 'ConditionalExpression': return pure(e.test) && pure(e.consequent) && pure(e.alternate);
    case 'MemberExpression': return pure(e.object) && (!e.computed || pure(e.property));
    case 'NewExpression': return ['Map', 'Set'].includes(e.callee.name) && e.arguments.every(pure);
    case 'CallExpression': {
      const name = callee(e.callee);
      if (name === 'document.getElementById') return e.arguments.length === 1 && e.arguments[0].type === 'Literal';
      if (!PURE_STATIC.has(name) && !(e.callee.type === 'MemberExpression' && PURE_METHOD.has(e.callee.property.name) && pure(e.callee.object))) return false;
      return e.arguments.every((a) => (a.type === 'ArrowFunctionExpression' ? a.body.type !== 'BlockStatement' && pure(a.body) : !/Function/.test(a.type) && pure(a)));
    }
    default: return false;
  }
}
const html = fs.readFileSync(path.join(PUB, 'index.html'), 'utf8').replace(/<!--[^]*?-->/g, '');
const htmlIds = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
const isHook = (n) => n.type === 'ExpressionStatement' && n.expression.type === 'AssignmentExpression' && /^window\.__AR\d+_DEBUG__$/.test(callee(n.expression.left)) && n.expression.right.type === 'ObjectExpression' && n.expression.right.properties.every((p) => p.value && /Function/.test(p.value.type));
const domIds = new Map();
let moved = 0;
for (const f of MODULES) {
  const it = info[f];
  it.ast.body.forEach((n, i) => {
    if (n.type === 'ImportDeclaration' || n.type === 'ExportNamedDeclaration') return;
    moved += 1;
    if (n.type === 'FunctionDeclaration' || isHook(n)) return;
    if (n.type !== 'VariableDeclaration' || n.kind === 'var') { fail('副作用', `${f}:${n.loc.start.line} ${n.type}`); return; }
    for (const d of n.declarations) {
      if (!pure(d.init)) fail('副作用', `${f}:${n.loc.start.line} ${patNames(d.id)} 的初始化不是纯的`);
      if (d.init && d.init.type === 'CallExpression' && callee(d.init.callee) === 'document.getElementById') {
        const id = d.init.arguments[0].value;
        domIds.set(id, d.id.name);
        if (!htmlIds.has(id)) fail('DOM', `${f}: ${d.id.name} 要的 #${id} 不在 index.html 里，提前求值会拿到 null`);
      }
    }
    for (const r of freeRefs(n)) {
      if (r.deferred || GLOBALS.has(r.name)) continue;
      const o = it.decls.get(r.name);
      if (!o) fail('跨文件求值', `${f}:${r.line} 初始化时读了 ${it.imports.get(r.name) || '?'} 的 ${r.name}`);
      else if (o.kind === 'function' || o.i >= i) fail('TDZ', `${f}:${r.line} 初始化时读 ${r.name}`);
    }
  });
}
// 提前取的元素不能是 JS 造出来的，也不能待在会被整段重写的静态容器里
const allJs = FILES.map((f) => text[f]).join('\n');
for (const m of allJs.matchAll(/\bid="([\w-]+)"/g)) if (domIds.has(m[1])) fail('DOM', `#${m[1]} 由 JS 生成，不能提前取`);
const rewritten = new Set();
{
  // 按作用域认出「变量 = document.getElementById('x')」，再看哪些被整段改写
  const REWRITE = new Set(['innerHTML', 'outerHTML', 'textContent', 'innerText']);
  const REMOVE = new Set(['replaceChildren', 'replaceWith', 'remove']);
  const idOf = (e) => (e && e.type === 'CallExpression' && callee(e.callee) === 'document.getElementById' && e.arguments[0] && e.arguments[0].type === 'Literal' ? e.arguments[0].value : null);
  const topIds = new Map();
  for (const f of FILES) for (const n of info[f].ast.body) if (n.type === 'VariableDeclaration') n.declarations.forEach((d) => d.id.type === 'Identifier' && topIds.set(d.id.name, idOf(d.init)));
  const target = (o, sc) => {
    const e = o.type === 'ChainExpression' ? o.expression : o;
    if (idOf(e)) return idOf(e);
    if (e.type !== 'Identifier') return null;
    for (const s of sc) if (s.has(e.name)) return s.get(e.name);
    return topIds.get(e.name) || null;
  };
  const walk = (n, sc) => {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) { n.forEach((x) => walk(x, sc)); return; }
    let here = sc;
    if (/Function/.test(n.type || '')) here = [new Map(n.params.flatMap((p) => patNames(p)).map((x) => [x, null])), ...here];
    if (n.type === 'BlockStatement') {
      const m = new Map();
      for (const s of n.body) if (s.type === 'VariableDeclaration') for (const d of s.declarations) patNames(d.id).forEach((x) => m.set(x, idOf(d.init)));
      here = [m, ...here];
    }
    if ((n.type === 'ForStatement' || n.type === 'ForOfStatement' || n.type === 'ForInStatement')) {
      const d = n.type === 'ForStatement' ? n.init : n.left;
      if (d && d.type === 'VariableDeclaration') here = [new Map(d.declarations.flatMap((x) => patNames(x.id)).map((x) => [x, null])), ...here];
    }
    let hitId = null;
    if (n.type === 'AssignmentExpression' && n.left.type === 'MemberExpression' && !n.left.computed && REWRITE.has(n.left.property.name)) hitId = target(n.left.object, here);
    if (n.type === 'CallExpression' && n.callee.type === 'MemberExpression' && !n.callee.computed && REMOVE.has(n.callee.property.name)) hitId = target(n.callee.object, here);
    if (hitId) rewritten.add(hitId);
    for (const k in n) if (!SKIP.has(k) && n[k] && typeof n[k] === 'object') walk(n[k], here);
  };
  for (const f of FILES) walk(info[f].ast.body, []);
}
{
  const VOID = new Set(['img', 'input', 'br', 'meta', 'link', 'hr', 'source']);
  const stack = [];
  for (const m of html.matchAll(/<(\/?)([a-zA-Z][\w-]*)((?:\s+[^\s=>/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>/g)) {
    const tag = m[2].toLowerCase();
    if (m[1]) { for (let k = stack.length - 1; k >= 0; k--) if (stack[k].tag === tag) { stack.length = k; break; } continue; }
    const id = (m[3].match(/\sid="([^"]+)"/) || [])[1];
    if (id && domIds.has(id)) for (const s of stack) if (s.id && rewritten.has(s.id)) fail('DOM', `#${id} 在会被重写的 #${s.id} 里`);
    if (!m[4] && !VOID.has(tag)) stack.push({ tag, id });
  }
}
// try 里被吞掉的 TDZ 报错是唯一会因“更早初始化”而变样的写法：列出 try 块里碰到的搬走的绑定
{
  const movedLexical = new Set(MODULES.flatMap((f) => [...info[f].decls].filter(([, d]) => d.kind !== 'function').map(([x]) => x)));
  const found = new Set();
  const walk = (n, f) => {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) { n.forEach((x) => walk(x, f)); return; }
    if (n.type === 'TryStatement') for (const r of freeRefs(n.block)) if (movedLexical.has(r.name)) found.add(`${f}: ${r.name}`);
    for (const k in n) if (!SKIP.has(k) && n[k] && typeof n[k] === 'object') walk(n[k], f);
  };
  for (const f of FILES) walk(info[f].ast, f);
  for (const x of found) if (!manifest.tryReads.includes(x)) fail('TDZ', `try 块里读了搬走的 ${x}，要确认原来不是靠 TDZ 报错走 catch`);
}

// ---------- 5. 只链接不求值 ----------
{
  const context = vm.createContext({});
  const cache = new Map();
  const load = (spec) => {
    if (!cache.has(spec)) {
      const file = spec.replace(/^\.\//, '').replace(/\?.*$/, '');
      cache.set(spec, new vm.SourceTextModule(fs.readFileSync(path.join(PUB, file), 'utf8'), { context, identifier: spec, importModuleDynamically: () => { throw new Error('不执行'); } }));
    }
    return cache.get(spec);
  };
  const entry = (html.match(/<script type="module" src="(\.\/game\.js\?v=\w+)"/) || [])[1];
  if (!entry) fail('加载', 'index.html 里找不到 game.js');
  else {
    try {
      const mod = load(entry);
      await mod.link((spec) => load(spec));
      if (mod.status !== 'linked') fail('链接', `状态 ${mod.status}`);
      const copies = [...cache.keys()].filter((s) => s.includes('game.js'));
      if (copies.length !== 1) fail('链接', `game.js 被当成 ${copies.length} 份模块：${copies.join('、')}`);
    } catch (e) {
      fail('链接', e.message);
    }
  }
}

console.log(`拼回：${blocks} 块 / ${MODULES.length} 个新文件，SHA-256 ${!manifest.baseline ? '比对已关闭' : gotSha === manifest.baseline.sha256LF ? `一致（${manifest.baseline.lines} 行）` : '不一致'}；${byteNote}；撤掉登记的小修 ${manifest.edits.reduce((n, e) => n + (e.count || 1), 0)} 处、图片版本号 ${bumped} 处`);
console.log(FILES.map((f) => `${f} ${lineCount(text[f])} 行`).join('，'));
console.log(`搬走的顶层声明 ${moved} 条，自由引用 ${refCount} 处，跨文件导入 ${crossCount} 个，提前取的元素 ${domIds.size} 个（会被整段改写的静态容器 ${rewritten.size} 个，都不含它们）`);
if (problems.length) {
  console.log(`\n拆分检查未通过：${problems.length} 条`);
  for (const p of problems) console.log('  ' + p);
  process.exit(1);
}
console.log('拆分检查通过');
