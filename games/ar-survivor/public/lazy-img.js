// lazy-img.js — 收起面板里的图等打开才下、图片下载失败自动重试（AR-COM5）
// 不下载靠 HTML / CSS：面板挂 data-imgs-off，style.css 的 .hidden[data-imgs-off] img 把图平移到屏幕外很远，
// 配合 loading="lazy" 浏览器就不会下；占位尺寸不变。这里只在第一次打开之后去掉标记（免得收起的淡出里图先不见），再把看得到的图一次下齐。
// 这个文件没加载到也不影响玩：打开面板照样出图，只是失败不会自动重试

export const RETRY_WAITS = [1500, 4000, 10000];

// 打开之后把这个面板里看得到的图一次下齐，往下滚不用再等；display:none 的分页留到翻到时
function wakeImgs(panel) {
  for (const img of panel.querySelectorAll('img[loading="lazy"]')) if (img.getClientRects().length) img.loading = 'eager';
}

export function watchFirstOpen(panel, Observer) {
  const opened = () => !panel.classList.contains('hidden');
  if (opened()) {
    panel.removeAttribute('data-imgs-off');
    return null;
  }
  const mo = new Observer(() => {
    if (!opened()) return;
    panel.removeAttribute('data-imgs-off');
    mo.disconnect();
    wakeImgs(panel);
  });
  mo.observe(panel, { attributes: true, attributeFilter: ['class'] });
  return mo;
}

const retries = new WeakMap(); // img -> { src, count }

function isBroken(img) {
  return img.complete && img.naturalWidth === 0;
}

// 同一张图最多自动重试 3 次；中途换了图就从头算
export function scheduleImgRetry(img, later) {
  const src = img.getAttribute('src') || '';
  if (!src.includes('assets/')) return false;
  const prev = retries.get(img);
  const count = prev && prev.src === src ? prev.count : 0;
  if (count >= RETRY_WAITS.length) return false;
  retries.set(img, { src, count: count + 1 });
  later(() => {
    if (img.getAttribute('src') === src && isBroken(img)) img.setAttribute('src', src);
  }, RETRY_WAITS[count]);
  return true;
}

export function reloadBroken(imgs) {
  let n = 0;
  for (const img of imgs) {
    const src = img.getAttribute('src') || '';
    if (!src.includes('assets/') || !isBroken(img)) continue;
    retries.delete(img);
    img.setAttribute('src', src);
    n += 1;
  }
  return n;
}

if (typeof document !== 'undefined') {
  for (const panel of document.querySelectorAll('[data-imgs-off]')) watchFirstOpen(panel, MutationObserver);
  const later = (fn, ms) => setTimeout(fn, ms);
  // error 事件不冒泡，用捕获阶段收
  document.addEventListener('error', (e) => {
    if (e.target && e.target.tagName === 'IMG') scheduleImgRetry(e.target, later);
  }, true);
  window.addEventListener('online', () => reloadBroken(document.images));
  // 信号差但没断网时不会有 online：切回前台也再试一次
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) reloadBroken(document.images);
  });
  // 这个脚本跑起来之前就已经失败的
  for (const img of document.images) if (isBroken(img)) scheduleImgRetry(img, later);
}
