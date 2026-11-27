// _split_lib.mjs — game.js 拆成多个文件之后（AR-COM5），把它们按 [[split N]] 记号拼回一份文本给静态检查用。
// 只读文本，不执行游戏代码。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SPLIT_MANIFEST = JSON.parse(
  fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'split_manifest.json'), 'utf8')
);
export const GAME_MODULES = SPLIT_MANIFEST.modules;

// src：{ 文件名: LF 文本 }；返回拼回的 game.js（去掉搬移记号和新加的导入导出）
export function joinGameSource(src, onProblem = () => {}) {
  const blocks = new Map();
  for (const f of GAME_MODULES) {
    const marks = [...src[f].matchAll(/^\/\/ \[\[split (\d+|end)\]\]\n/gm)];
    if (!marks.length || marks[marks.length - 1][1] !== 'end') {
      onProblem(`${f} 没有以 [[split end]] 收尾`);
      continue;
    }
    for (let k = 0; k < marks.length - 1; k++) {
      const no = Number(marks[k][1]);
      if (blocks.has(no)) onProblem(`块 ${no} 重复`);
      blocks.set(no, { f, t: src[f].slice(marks[k].index + marks[k][0].length, marks[k + 1].index) });
    }
  }
  let g = src['game.js'];
  g = g.replace(/^\/\/ \[\[split imports\]\][^]*?^\/\/ \[\[split imports end\]\]\n/m, '');
  g = g.replace(/^\/\/ \[\[split exports\]\][^]*?^\/\/ \[\[split exports end\]\]\n/m, '');
  const used = new Set();
  g = g.replace(/^\/\/ \[\[split (\d+) -> ([\w.-]+)\]\]\n/gm, (m, no, file) => {
    const b = blocks.get(Number(no));
    if (!b || b.f !== file) {
      onProblem(`game.js 的块 ${no} 在 ${file} 里找不到`);
      return m;
    }
    used.add(Number(no));
    return b.t;
  });
  for (const no of blocks.keys()) if (!used.has(no)) onProblem(`块 ${no} 在 game.js 里没有占位`);
  return { whole: g, blocks: blocks.size };
}

export function readGameSource(publicDir) {
  const src = {};
  for (const f of ['game.js', ...GAME_MODULES]) src[f] = fs.readFileSync(path.join(publicDir, f), 'utf8').replace(/\r\n/g, '\n');
  return joinGameSource(src).whole;
}
