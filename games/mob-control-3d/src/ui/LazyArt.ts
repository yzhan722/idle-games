/**
 * 图标按需加载：图标都写了 loading="lazy"，面板没打开就不下载。
 * 这里补三件事：等图时的占位、下载失败重试、空闲时先取马上要看到的图。
 * 图标的宽高全在 style.css 里写死，等图、失败、重试都不会跳布局。
 */

const RETRY_DELAYS_MS = [800, 2500, 8000];
/** 超过这个时间还没到的图才显示占位，缓存里的图不会闪一下。 */
const PENDING_AFTER_MS = 220;
const WARM_PARALLEL = 3;
/** 1×1 透明图：重试全失败后换上，免得浏览器把坏图收成 0 宽。 */
const BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

const tries = new WeakMap<HTMLImageElement, { url: string; n: number }>();
const failed = new Set<HTMLImageElement>();

const isArt = (t: EventTarget | null): t is HTMLImageElement => t instanceof HTMLImageElement && t.classList.contains('art-icon-img');
const baseUrl = (src: string): string => src.replace(/[?&]r=\d+$/, '');
const isBroken = (img: HTMLImageElement): boolean => img.complete && img.naturalWidth === 0;

function onArtLoad(e: Event): void {
  if (!isArt(e.target)) return;
  const img = e.target;
  img.classList.remove('art-pending');
  if (img.getAttribute('src') === BLANK) return;
  img.classList.remove('art-failed');
  tries.delete(img);
  failed.delete(img);
}

function onArtError(e: Event): void {
  if (isArt(e.target)) retryLater(e.target);
}

function retryLater(img: HTMLImageElement): void {
  const url = baseUrl(img.getAttribute('src') || '');
  if (!url || url === BLANK) return;
  const prev = tries.get(img);
  const n = prev && prev.url === url ? prev.n : 0;
  tries.set(img, { url, n: n + 1 });
  if (n >= RETRY_DELAYS_MS.length) {
    img.classList.remove('art-pending');
    img.classList.add('art-failed');
    img.setAttribute('src', BLANK);
    failed.add(img);
    return;
  }
  window.setTimeout(() => {
    // 等的时候被重画掉、换成了别的图、或已经被重设而好了 / 正在下，就不管了
    if (!img.isConnected || !isBroken(img) || baseUrl(img.getAttribute('src') || '') !== url) return;
    img.setAttribute('src', `${url}${url.includes('?') ? '&' : '?'}r=${n + 1}`);
  }, RETRY_DELAYS_MS[n]);
}

/** 断网恢复、切回前台：失败的图再来一轮（已经换成别的图的不动）。 */
function retryFailed(): void {
  for (const img of [...failed]) {
    failed.delete(img);
    const t = tries.get(img);
    if (!t || !img.isConnected || img.getAttribute('src') !== BLANK) continue;
    tries.delete(img);
    img.setAttribute('src', t.url);
  }
}

let pendingTimer: number | undefined;
function markPendingSoon(): void {
  if (pendingTimer !== undefined) return;
  pendingTimer = window.setTimeout(() => {
    pendingTimer = undefined;
    for (const img of document.querySelectorAll<HTMLImageElement>('img.art-icon-img[loading="lazy"]')) {
      if (!img.complete && img.offsetParent !== null) img.classList.add('art-pending');
    }
  }, PENDING_AFTER_MS);
}

export function installLazyArt(): void {
  // load / error 不冒泡，用捕获阶段统一收
  document.addEventListener('load', onArtLoad, true);
  document.addEventListener('error', onArtError, true);
  // 面板、战斗、弹窗都是点出来或按出来的：操作后看一眼还有没有没到的图
  document.addEventListener('click', markPendingSoon, true);
  document.addEventListener('keydown', markPendingSoon, true);
  window.addEventListener('online', retryFailed);
  // 信号差但没断网时不会有 online，切回来也再试一次
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) retryFailed();
  });
  // 这个脚本跑起来之前就已经失败的（封面、大厅的图先于脚本下载）
  for (const img of document.querySelectorAll<HTMLImageElement>('img.art-icon-img')) if (isBroken(img)) retryLater(img);
  // 自动化测试要检查每张图都到了，直接全部下载
  if (navigator.webdriver) {
    for (const img of document.querySelectorAll<HTMLImageElement>('img[loading="lazy"]')) img.loading = 'eager';
  }
}

/** 图标 HTML 串 → 图片地址。 */
export function artUrl(html: string): string {
  return /src="([^"]+)"/.exec(html)?.[1] ?? '';
}

/** 预取过的图都留着引用：没人引用的图浏览器会回收，用到时又要问一趟服务器。 */
const warmed = new Map<string, HTMLImageElement | null>();

/** 空闲时按顺序先取一批图（省流量模式不取）；取过的不重复，失败不管，真用到时还会再试。 */
export function warmArt(urls: Iterable<string>): void {
  const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
  if (nav.connection?.saveData) return;
  const queue = [...urls].filter((u) => u && !warmed.has(u) && (warmed.set(u, null), true));
  const next = (): void => {
    const url = queue.shift();
    if (!url) return;
    const img = new Image();
    warmed.set(url, img);
    img.decoding = 'async';
    img.fetchPriority = 'low';
    img.onload = next;
    img.onerror = next;
    img.src = url;
  };
  whenIdle(() => {
    for (let i = 0; i < WARM_PARALLEL; i++) next();
  });
}

/** 元素里全部图标的地址。 */
export function artUrlsIn(selector: string): string[] {
  return [...document.querySelectorAll<HTMLImageElement>(selector)].map((img) => img.getAttribute('src') || '');
}

function whenIdle(run: () => void): void {
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(run, { timeout: 2500 });
  else window.setTimeout(run, 600);
}
