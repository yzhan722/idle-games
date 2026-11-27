// _ar_entry_helper.mjs — verify_ar*.mjs 共用：进场与「手账」入口（2026-11-26 AR-COM3 / AR-G3）
// 1. 摄像头说明卡：验证脚本没有摄像头，预先记成「先不用」，不然说明卡会挡住所有点按
// 2. 收起面板里的图默认打开才下，这里让它们一进页面就全下（2026-11-26 AR-COM5 首屏）
// 3. 相册 / 日记 / 周报 / 拼贴 / 压花 / 故事书的按钮 id 没变，但都搬进了「手账」面板：
//    点它们之前先翻开手账；对应面板已经开着时，再点一次等于收起（沿用原来船坞键的开合语义）
const BOOK_ENTRIES = {
  '#btn-album-open': { card: 'pet-drawer', close: '#btn-drawer-close' },
  '#btn-diary-book': { card: 'diary-book-card', close: '#btn-diary-close' },
  '#btn-weekly-journal': { card: 'weekly-journal-card', close: '#btn-journal-close' },
  '#btn-collage-frame': { card: 'collage-frame-card', close: '#btn-collage-close' },
  '#btn-pressed-flowers': { card: 'pressed-flower-card', close: '#btn-pressed-close' },
  '#btn-storybook-book': { card: 'storybook-card', close: '#btn-storybook-close' }
};

function wrapPage(page) {
  const rawClick = page.click.bind(page);
  const isOpen = (id) => page.evaluate((x) => !document.getElementById(x).classList.contains('hidden'), id);
  page.click = async (selector, options) => {
    const entry = BOOK_ENTRIES[selector];
    if (!entry) return rawClick(selector, options);
    const drawerOther = entry.card === 'pet-drawer' && !(await page.evaluate(() => document.getElementById('pet-drawer').classList.contains('is-album')));
    if (!drawerOther && (await isOpen(entry.card))) return rawClick(entry.close, options);
    if (!(await isOpen('memory-book-card'))) {
      await rawClick('#btn-memory-book', options);
      await page.waitForTimeout(280);
    }
    await rawClick(selector, options);
    // 等翻页时的短暂不接点击过去（game.js guardBookTurn）
    await page.waitForTimeout(360);
    return undefined;
  };
  return page;
}

export async function prepareArContext(context) {
  await context.addInitScript(() => {
    try {
      if (!localStorage.getItem('ar_deepseek_camera_choice_v1')) localStorage.setItem('ar_deepseek_camera_choice_v1', 'off');
    } catch (e) {}
  });
  // AR-COM5 面板里的图改成打开才下；这些脚本要逐张核对收起面板里的图，进页面就让它们全下（等于改之前的行为）
  await context.addInitScript(() => {
    const wake = () => {
      for (const el of document.querySelectorAll('[data-imgs-off]')) el.removeAttribute('data-imgs-off');
      for (const img of document.querySelectorAll('img[loading="lazy"]')) img.loading = 'eager';
    };
    document.addEventListener('DOMContentLoaded', () => {
      wake();
      new MutationObserver(wake).observe(document.body, { childList: true, subtree: true });
    });
  });
  const rawNewPage = context.newPage.bind(context);
  context.newPage = async (...args) => wrapPage(await rawNewPage(...args));
}
