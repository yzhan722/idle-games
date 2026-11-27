/**
 * 按需加载代码块的重试与「新版本发布」兜底（纯逻辑，界面在 components/lazyPanel.tsx）。
 *
 * - 有的浏览器会记住一次失败的动态 import，原地址再 import 立刻失败：重试时换成带 ?retry= 的地址。
 *   块里引用的公共模块仍是原地址，不会重复实例化。
 *   前提是别的块不引用这个被重试的块（否则会出现两份）：共用模块由 vite.config.ts 单独拆成 game-shared。
 * - 发了新版本，旧块在服务器上已经没有（404）：重试也没用。去取一次首页，入口文件名变了就整页刷新；
 *   已经在游戏里时不自动刷（可能正在打字、正在发请求），只提示，由玩家点。
 */

/** 代码块反复没取到。界面据此显示「重试 / 刷新」，别的错误照常往外抛。 */
export class ChunkLoadError extends Error {
  constructor(public readonly cause: unknown) {
    super('代码块没有加载出来');
    this.name = 'ChunkLoadError';
  }
}

/** 从报错文字里找出没取到的模块地址（Chrome、Firefox 会写，Safari 不写）。只认本站 assets 下的脚本。 */
export function failedModuleUrl(error: unknown): string | null {
  const text = error instanceof Error ? error.message : String(error ?? '');
  const url = /(?:https?:\/\/[^\s"']+|\/)assets\/[\w.-]+\.js/.exec(text)?.[0];
  return url ?? null;
}

/** vite 先下样式再下脚本；样式失败后它不会再下第二次，要自己补。 */
export function failedCssUrl(error: unknown): string | null {
  const text = error instanceof Error ? error.message : '';
  return /Unable to preload CSS for (\S*\/?assets\/[\w.-]+\.css)/.exec(text)?.[1] ?? null;
}

export function retryUrl(url: string, attempt: number): string {
  return `${url}${url.includes('?') ? '&' : '?'}retry=${attempt}`;
}

export type ImportTools = {
  sleep: (ms: number) => Promise<void>;
  importUrl: (url: string) => Promise<unknown>;
  loadCss: (url: string) => Promise<void>;
};

const browserTools: ImportTools = {
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  importUrl: (url) => import(/* @vite-ignore */ url),
  loadCss: (url) =>
    new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      link.onload = () => resolve();
      link.onerror = () => {
        link.remove();
        reject(new Error(`Unable to preload CSS for ${url}`));
      };
      document.head.appendChild(link);
    }),
};

/** 没下来的样式：vite 不会再下，之后每次取代码块前先补上，免得出现没样式的界面。 */
const missingCss = new Set<string>();
let retrySeq = 0;

/** 失败后隔 0.6、1.8 秒各再试一次；都不行就抛 ChunkLoadError。 */
export async function importWithRetry<T>(load: () => Promise<T>, pick: (mod: unknown) => T, tools: ImportTools = browserTools): Promise<T> {
  let failure: unknown;
  let url: string | null = null;
  for (const wait of [0, 600, 1800]) {
    if (wait > 0) await tools.sleep(wait);
    try {
      for (const css of [...missingCss]) {
        await tools.loadCss(retryUrl(css, ++retrySeq));
        missingCss.delete(css);
      }
      return url ? pick(await tools.importUrl(retryUrl(url, ++retrySeq))) : await load();
    } catch (error) {
      failure = error;
      const css = failedCssUrl(error);
      if (css) missingCss.add(css);
      else url = url ?? failedModuleUrl(error);
    }
  }
  throw new ChunkLoadError(failure);
}

/** 首页里的入口脚本文件名；不是我们的首页就返回 null。 */
export function entryScript(html: string): string | null {
  return /<script[^>]+type="module"[^>]+src="([^"]+\/assets\/[^"]+\.js|\/?assets\/[^"]+\.js)"/.exec(html)?.[1].replace(/^.*(?=\/assets\/)/, '') ?? null;
}

/** 同一个标签页五分钟内只自动刷新一次，防止缓存没更新时反复刷新。 */
export const RELOAD_GUARD_MS = 5 * 60_000;

export function mayReload(lastReloadAt: unknown, now: number): boolean {
  return typeof lastReloadAt !== 'number' || !Number.isFinite(lastReloadAt) || now - lastReloadAt > RELOAD_GUARD_MS || now < lastReloadAt;
}

export type ReleaseTools = {
  currentEntry: () => string | null;
  fetchHome: () => Promise<string>;
  lastReloadAt: () => unknown;
  markReload: (now: number) => void;
  reload: () => void;
  now: () => number;
};

const browserRelease: ReleaseTools = {
  currentEntry: () => {
    const src = document.querySelector<HTMLScriptElement>('script[type="module"][src*="/assets/"]')?.src;
    return src ? new URL(src).pathname.replace(/^.*(?=\/assets\/)/, '') : null;
  },
  fetchHome: async () => {
    const res = await fetch(`${import.meta.env.BASE_URL}index.html`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`home ${res.status}`);
    return res.text();
  },
  // 记在这一页的 history.state 里：刷新后还在，关掉标签页就没了，不占本地存储
  lastReloadAt: () => (window.history.state as { worklifeReloadAt?: unknown } | null)?.worklifeReloadAt,
  markReload: (now) => window.history.replaceState({ ...(window.history.state ?? {}), worklifeReloadAt: now }, ''),
  reload: () => window.location.reload(),
  now: () => Date.now(),
};

/** 服务器上的入口文件已经换了。取不到首页、认不出首页都算没换。 */
export async function isNewRelease(tools: ReleaseTools = browserRelease): Promise<boolean> {
  try {
    const mine = tools.currentEntry();
    if (!mine) return false;
    const theirs = entryScript(await tools.fetchHome());
    return Boolean(theirs) && theirs !== mine;
  } catch {
    return false;
  }
}

/** 代码块取不到时调用：服务器上已经是新版本就整页刷新并返回 true，否则返回 false（留给玩家点重试）。 */
export async function reloadIfNewRelease(tools: ReleaseTools = browserRelease): Promise<boolean> {
  try {
    if (!(await isNewRelease(tools))) return false;
    const now = tools.now();
    if (!mayReload(tools.lastReloadAt(), now)) return false;
    tools.markReload(now);
    tools.reload();
    return true;
  } catch {
    return false;
  }
}
