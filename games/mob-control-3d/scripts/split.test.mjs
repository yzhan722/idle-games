// World3D 拆分的静态校验：node --test scripts/split.test.mjs（只读源码、在 Node 里加载类定义，不建世界、不打开游戏）
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { GAME_ROOT, loadTs } from './lib/load_ts.mjs';

const ts = createRequire(path.join(GAME_ROOT, 'package.json'))('typescript');
const SRC = path.join(GAME_ROOT, 'src');
const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : e.name.endsWith('.ts') ? [path.join(dir, e.name)] : []
  );
const parse = (file) => ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.ES2022, true);

/** 类名 → { base, members } */
const classes = new Map();
for (const file of walk(path.join(SRC, 'game')).filter((f) => /World3D\w*\.ts$|[\\/]modes[\\/]/.test(f))) {
  const sf = parse(file);
  sf.forEachChild((n) => {
    if (!ts.isClassDeclaration(n)) return;
    const ext = n.heritageClauses?.find((h) => h.token === ts.SyntaxKind.ExtendsKeyword);
    classes.set(n.name.text, {
      base: ext ? ext.types[0].expression.getText(sf) : null,
      members: n.members.map((m) => ({
        name: m.name?.getText(sf) ?? ts.SyntaxKind[m.kind],
        kind: ts.SyntaxKind[m.kind],
        abstract: Boolean(m.modifiers?.some((x) => x.kind === ts.SyntaxKind.AbstractKeyword)),
      })),
    });
  });
}
const chain = [];
for (let c = 'World3DSelfChecks'; c; c = classes.get(c).base) chain.unshift(c);

test('继承链：World3D 在最底，十个模式一级一级接到 World3DFull，自检在最外层，没有漏接的模式类', () => {
  assert.equal(chain[0], 'World3D');
  assert.deepEqual(chain.slice(-2), ['World3DFull', 'World3DSelfChecks']);
  assert.deepEqual([...classes.keys()].sort(), [...chain].sort());
});

test('子类只有方法：没有字段、构造函数、静态块（useDefineForClassFields 下子类重声明字段会清空父类已赋的值）', () => {
  for (const name of chain.slice(1)) {
    for (const m of classes.get(name).members) assert.equal(m.kind, 'MethodDeclaration', `${name}.${m.name} ${m.kind}`);
  }
});

test('整条链上没有同名覆盖；World3D 的每个抽象方法都有且只有一个实现', () => {
  const impl = new Map();
  for (const name of chain) {
    for (const m of classes.get(name).members) {
      if (m.abstract) continue;
      impl.set(m.name, [...(impl.get(m.name) || []), name]);
    }
  }
  for (const [m, owners] of impl) assert.equal(owners.length, 1, `${m}: ${owners}`);
  const abstracts = classes.get('World3D').members.filter((m) => m.abstract);
  assert.ok(abstracts.length > 0);
  for (const m of abstracts) assert.ok(impl.has(m.name), m.name);
});

test('src 里没有循环 import（类继承遇到循环会在启动时报 TDZ）', () => {
  const graph = new Map();
  for (const file of walk(SRC)) {
    const deps = [];
    parse(file).forEachChild((n) => {
      if (!ts.isImportDeclaration(n) && !(ts.isExportDeclaration(n) && n.moduleSpecifier)) return;
      const spec = n.moduleSpecifier.text;
      if (!spec.startsWith('.') || n.importClause?.isTypeOnly || n.isTypeOnly) return;
      const target = path.resolve(path.dirname(file), `${spec}.ts`);
      if (existsSync(target)) deps.push(target);
    });
    graph.set(file, deps);
  }
  const done = new Set();
  const visit = (file, trail) => {
    assert.ok(!trail.includes(file), [...trail, file].map((f) => path.relative(SRC, f)).join(' -> '));
    if (done.has(file)) return;
    for (const d of graph.get(file) || []) visit(d, [...trail, file]);
    done.add(file);
  };
  for (const f of graph.keys()) visit(f, []);
});

test('整条链能加载（没有 TDZ）；挂自检只换原型：仍是 World3DFull，已有字段不动', async () => {
  const { X } = await loadTs({ X: 'src/game/World3DSelfChecks.ts' });
  const Full = Object.getPrototypeOf(X.World3DSelfChecks);
  const world = Object.create(Full.prototype, { keep: { value: 7 } });
  assert.equal(typeof world.runMc1SelfCheck, 'undefined');
  X.attachSelfChecks(world);
  for (let i = 1; i <= 18; i++) assert.equal(typeof world[`runMc${i}SelfCheck`], 'function', `runMc${i}SelfCheck`);
  assert.ok(world instanceof Full);
  assert.equal(world.keep, 7);
});
