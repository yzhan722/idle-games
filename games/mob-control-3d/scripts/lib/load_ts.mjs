// 把 src 下的纯逻辑 TS 模块打包到系统临时目录再 import（只用本地已装的 esbuild，不开端口、不开浏览器）。
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const GAME_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const require = createRequire(path.join(GAME_ROOT, 'package.json'));

/** entries: { 名字: 'src/...' }，返回 { 名字: 模块 }。 */
export async function loadTs(entries) {
  const esbuild = require('esbuild');
  const dir = mkdtempSync(path.join(tmpdir(), 'mc3d-'));
  const out = {};
  try {
    for (const [name, rel] of Object.entries(entries)) {
      const r = await esbuild.build({
        entryPoints: [path.join(GAME_ROOT, rel)],
        bundle: true,
        write: false,
        format: 'esm',
        platform: 'node',
        logLevel: 'error',
      });
      const file = path.join(dir, `${name}.mjs`);
      writeFileSync(file, r.outputFiles[0].text);
      out[name] = await import(pathToFileURL(file).href);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  return out;
}

/** 无界面的 GameState：localStorage 换成内存，fetch 不发请求。 */
export function newHeadlessState(stateModule) {
  const mem = new Map();
  globalThis.localStorage = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => void mem.set(k, String(v)),
    removeItem: (k) => void mem.delete(k),
  };
  globalThis.fetch = async () => ({ ok: false });
  const s = new stateModule.GameState();
  s.activeSceneThemeId = 'none';
  return s;
}
