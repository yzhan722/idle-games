// 资源引用的静态扫描（只读文件，不开浏览器）：asset_refs.mjs、first_screen.mjs、assets.test.mjs 共用。
import { createRequire } from 'node:module';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { GAME_ROOT, loadTs } from './load_ts.mjs';

const ts = createRequire(path.join(GAME_ROOT, 'package.json'))('typescript');
export const read = (rel) => readFileSync(path.join(GAME_ROOT, rel), 'utf8');

/** 目录下全部文件（相对 GAME_ROOT，斜杠分隔，大小写按磁盘原样）。 */
export function listFiles(rel, filter = () => true) {
  const dir = path.join(GAME_ROOT, rel);
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const child = `${rel}/${e.name}`;
    return e.isDirectory() ? listFiles(child, filter) : filter(child) ? [child] : [];
  });
}

/** public/ 里的文件 → 线上路径（/assets/...）。 */
export const publicUrls = () => listFiles('public').map((f) => f.slice('public'.length));
export const stripQuery = (u) => u.replace(/[?#].*$/, '');

const VOID = new Set(['img', 'br', 'hr', 'input', 'link', 'meta', 'source']);

/** 把 HTML 拆成元素表：{ tag, attrs, line, trail: [祖先...] }，够用即可，不处理脚本里的字符串。 */
export function scanHtml(html) {
  const out = [];
  const stack = [];
  const clean = html.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '));
  const re = /<(\/?)([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
  for (let m; (m = re.exec(clean)); ) {
    const tag = m[2].toLowerCase();
    if (m[1]) {
      const at = stack.map((e) => e.tag).lastIndexOf(tag);
      if (at >= 0) stack.length = at;
      continue;
    }
    const attrs = {};
    for (const a of m[3].matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g)) {
      attrs[a[1].toLowerCase()] = a[2] ?? a[3] ?? a[4] ?? '';
    }
    const el = { tag, attrs, line: clean.slice(0, m.index).split('\n').length, trail: [...stack] };
    out.push(el);
    if (!VOID.has(tag) && !m[3].trimEnd().endsWith('/')) stack.push(el);
  }
  return out;
}

const hasClass = (el, c) => (el.attrs.class || '').split(/\s+/).includes(c);
export const matches = (el, sel) => (sel[0] === '#' ? el.attrs.id === sel.slice(1) : hasClass(el, sel.slice(1)));
export const inside = (el, sel) => matches(el, sel) || el.trail.some((p) => matches(p, sel));

/** 字符串里的全部本站资源路径。 */
export function urlsIn(text) {
  return [...String(text).matchAll(/\/(?:assets\/[\w./-]+|favicon\.svg)(?:\?[\w=&.-]*)?/g)].map((m) => m[0]);
}

function harvest(value, sink, seen = new Set()) {
  if (typeof value === 'string') urlsIn(value).forEach((u) => sink.add(u));
  else if (value && typeof value === 'object' && !seen.has(value)) {
    seen.add(value);
    for (const v of value instanceof Map ? value.values() : Object.values(value)) harvest(v, sink, seen);
  }
}

/** 运行时常量里的资源：每个导出 → 路径表（SkillIcons 的图标表、State 的数值表）。 */
export async function harvestExports(entries = { icons: 'src/game/SkillIcons.ts', state: 'src/game/State.ts' }) {
  const mods = await loadTs(entries);
  const out = new Map();
  for (const mod of Object.values(mods)) {
    for (const [name, value] of Object.entries(mod)) {
      if (typeof value === 'function') continue;
      const sink = new Set();
      harvest(value, sink);
      if (!sink.size) continue;
      out.set(name, sink);
      if (name === 'UI_ART') for (const [k, v] of Object.entries(value)) out.set(`UI_ART.${k}`, new Set(urlsIn(v)));
    }
  }
  return out;
}

/** 源码 / CSS / HTML / 部署文件里的写死引用；模板串里有 ${} 的单独返回成正则。 */
export function scanLiteralRefs() {
  const refs = [];
  const patterns = [];
  const files = ['index.html', ...listFiles('src', (f) => /\.(ts|css|html)$/.test(f)), ...listFiles('deploy', (f) => /\.mjs$/.test(f))];
  for (const file of files) {
    read(file)
      .split('\n')
      .forEach((text, i) => {
        // 模板串：把 ${...} 换成通配
        for (const m of text.matchAll(/\/assets\/[^\s"'`)]*\$\{[^\s"'`)]*/g)) {
          const tpl = stripQuery(m[0]).replace(/\$\{[^}]*\}/g, '\u0000');
          patterns.push({
            file,
            line: i + 1,
            text: m[0],
            helper: file.endsWith('SkillIcons.ts'),
            re: new RegExp(`^${tpl.replace(/[^\w/\u0000]/g, '\\$&').replace(/\u0000/g, '\\w+')}$`),
          });
        }
        for (const m of text.matchAll(/\/(?:assets\/[\w./-]+\.\w+|favicon\.svg)(?![\w$])/g)) refs.push({ file, line: i + 1, url: m[0] });
      });
  }
  return { refs, patterns };
}

/** main.ts 里从给定入口函数能走到的标识符（调用图，按名字算，宁多勿少）。 */
export function reachableIdentifiers(entryNames) {
  const sf = ts.createSourceFile('main.ts', read('src/main.ts'), ts.ScriptTarget.ES2022, true);
  const fns = new Map();
  sf.forEachChild((n) => {
    if (ts.isFunctionDeclaration(n) && n.name) fns.set(n.name.text, n);
    if (ts.isVariableStatement(n)) {
      for (const d of n.declarationList.declarations) {
        if (d.initializer && (ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer))) fns.set(d.name.getText(sf), d.initializer);
      }
    }
  });
  const used = new Set();
  const visited = new Set();
  const visit = (name) => {
    const fn = fns.get(name);
    if (!fn || visited.has(name)) return;
    visited.add(name);
    const walk = (n) => {
      // 事件回调要等玩家点才跑，不算开局
      if (ts.isCallExpression(n) && /\.addEventListener$/.test(n.expression.getText(sf))) return;
      if (ts.isPropertyAccessExpression(n) && n.expression.getText(sf) === 'UI_ART') used.add(`UI_ART.${n.name.text}`);
      else if (ts.isIdentifier(n)) {
        if (n.text !== 'UI_ART') used.add(n.text);
        if (fns.has(n.text)) visit(n.text);
      }
      n.forEachChild(walk);
    };
    walk(fn);
  };
  entryNames.forEach(visit);
  return { used, visited };
}
