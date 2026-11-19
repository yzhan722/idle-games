import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('C:/project/idle-games/node_modules/playwright');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const GAME_ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(GAME_ROOT, 'public');
const PORT = Number(process.env.AR17_PORT || 0);

// 可选：设置 AR17_SHOT_DIR 后输出 1440x900 / 1280x720 / 1024x768 / 390x844 / 844x390 自审截图
const SHOT_DIR = process.env.AR17_SHOT_DIR || '';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.json': 'application/json; charset=utf-8'
};

// 本轮不出图：4 张新贴图都复制自本游戏已有正式图（新语义文件名，便于以后同名覆盖），256×256 去底 webp
const REUSED_ART = {
  'ui_btn_wardrobe.webp': 'knit_whale_scarf.webp',
  'ui_btn_storybook.webp': 'prop_study_book.webp',
  'storybook_page.webp': 'diary_page.webp',
  'story_bookmark.webp': 'pressed_babysbreath_bookmark.webp'
};
const REQUIRED_AR17_ASSETS = Object.keys(REUSED_ART);
const SPRITE_KEYS = {
  'ui_btn_wardrobe.webp': 'uiBtnWardrobe',
  'ui_btn_storybook.webp': 'uiBtnStorybook',
  'storybook_page.webp': 'storybookPage',
  'story_bookmark.webp': 'storyBookmark'
};

// AR-17 明确不再加船坞键：仍是 AR-13 起的 25 键
const CARE_BTN_COUNT = 25;
const SAVE_KEY = 'ar_deepseek_pet_v2';
const MIN_DOCK_MARGIN = 10;

// 与 game.js 同一套规格（测试里独立复算，不读游戏内部实现）
const OUTFITS = {
  sakura_bow: { season: 'spring', items: ['bow'] },
  spring_wreath: { season: 'spring', items: ['star_wreath', 'shell_clip'] },
  seaside_shell: { season: 'summer', items: ['shell_clip'] },
  summer_starlight: { season: 'summer', items: ['shell_clip', 'aura'] },
  maple_crown: { season: 'autumn', items: ['crown'] },
  autumn_reader: { season: 'autumn', items: ['bow', 'star_wreath'] },
  snow_crown: { season: 'winter', items: ['crown', 'aura'] },
  first_snow: { season: 'winter', items: ['star_wreath', 'bow'] }
};
const OUTFIT_ORDER = Object.keys(OUTFITS);
const STORIES = ['whale_lullaby', 'moon_bakery', 'star_postman', 'cloud_pillow', 'snow_lantern', 'teacup_kitten'];
const LOOK_KEYS = ['bow', 'crown', 'aura', 'shell_clip', 'star_wreath'];
const WD = { daily: 2, coin: 6, xp: 5, fresh: 10 };
const SB = { daily: 2, coin: 6, xp: 6, fresh: 10, glowMin: 90, gnCoins: 12, gnXp: 8 };

function seasonOf(d) {
  const m = d.getMonth() + 1;
  if (m >= 3 && m <= 5) return 'spring';
  if (m >= 6 && m <= 8) return 'summer';
  if (m >= 9 && m <= 11) return 'autumn';
  return 'winter';
}

function nextSeason(s) {
  return { spring: 'summer', summer: 'autumn', autumn: 'winter', winter: 'spring' }[s];
}

function tonightStoryOf(d) {
  const dayIdx = Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86400000);
  return STORIES[((dayIdx % STORIES.length) + STORIES.length) % STORIES.length];
}

function dayAt(base, offsetDays, hh = 10, mm = 0) {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + offsetDays, hh, mm, 0, 0);
}

function keyOf(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function webpSize(file) {
  const b = fs.readFileSync(file);
  assert.equal(b.toString('ascii', 0, 4), 'RIFF', `${file} is not RIFF`);
  assert.equal(b.toString('ascii', 8, 12), 'WEBP', `${file} is not WEBP`);
  const chunk = b.toString('ascii', 12, 16);
  if (chunk === 'VP8X') return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3), alpha: Boolean(b[20] & 0x10) };
  if (chunk === 'VP8L') {
    const bits = b.readUInt32LE(21);
    return { w: 1 + (bits & 0x3fff), h: 1 + ((bits >> 14) & 0x3fff), alpha: Boolean((bits >> 28) & 1) };
  }
  return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff, alpha: false };
}

async function shot(page, name) {
  if (!SHOT_DIR) return;
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  await page.evaluate(() => {
    const toast = document.getElementById('milestone-toast');
    if (toast && !toast.classList.contains('hidden')) document.getElementById('btn-milestone-toast-close')?.click();
  });
  await page.waitForTimeout(120);
  await page.screenshot({ path: path.join(SHOT_DIR, name) });
}

function sliceBetween(content, startMarker, endMarker, label) {
  const a = content.indexOf(startMarker);
  const b = endMarker ? content.indexOf(endMarker, a + 1) : content.length;
  assert(a > 0 && b > a, `${label}: section markers not found`);
  return content.slice(a, b);
}

function runStaticChecks() {
  const jsFiles = ['audio.js', 'vision.js', 'sprites.js', 'game.js'];
  for (const file of jsFiles) {
    execFileSync(process.execPath, ['--check', path.join(PUBLIC_DIR, file)], { stdio: 'pipe' });
  }
  execFileSync(process.execPath, ['--check', __filename], { stdio: 'pipe' });

  const assetRefs = new Set();
  for (const file of ['index.html', 'style.css', ...jsFiles]) {
    const content = fs.readFileSync(path.join(PUBLIC_DIR, file), 'utf8');
    assert(!/<svg[\s>]/i.test(content), `Inline <svg> detected in public/${file}`);
    assert(!/\p{Extended_Pictographic}/u.test(content), `Emoji character detected in public/${file}`);
    for (const m of content.matchAll(/\.\/assets\/([a-zA-Z0-9_.-]+\.(?:webp|png|jpg))/g)) assetRefs.add(m[1]);
  }
  for (const asset of assetRefs) {
    const full = path.join(PUBLIC_DIR, 'assets', asset);
    assert(fs.existsSync(full) && fs.statSync(full).size > 0, `Missing / empty asset on disk: ${full}`);
  }

  const htmlContent = fs.readFileSync(path.join(PUBLIC_DIR, 'index.html'), 'utf8');
  const cssContent = fs.readFileSync(path.join(PUBLIC_DIR, 'style.css'), 'utf8');
  const spritesContent = fs.readFileSync(path.join(PUBLIC_DIR, 'sprites.js'), 'utf8');
  const gameContent = fs.readFileSync(path.join(PUBLIC_DIR, 'game.js'), 'utf8');

  // 缓存号：style.css 不低于 hd33、game.js 不低于 hd57、sprites.js 不低于 hd33；AR-17 新贴图全部 ?v=hd33
  assert(/\.\/style\.css\?v=hd(?:3[3-9]|[4-9]\d)\b/.test(htmlContent), 'index.html must reference ./style.css?v=hd33+');
  assert(/\.\/game\.js\?v=hd(?:5[7-9]|[6-9]\d)\b/.test(htmlContent), 'index.html must reference ./game.js?v=hd57+');
  assert(/\.\/sprites\.js\?v=hd(?:3[3-9]|[4-9]\d)\b/.test(gameContent), 'game.js must import ./sprites.js?v=hd33+');
  assert(!/style\.css\?v=hd(?:2\d|3[0-2])\b/.test(htmlContent) && !/game\.js\?v=hd(?:[1-4]\d|5[0-6])\b/.test(htmlContent), 'No stale style.css / game.js cache-buster in index.html');
  for (const asset of REQUIRED_AR17_ASSETS) {
    assert(assetRefs.has(asset), `AR-17 asset ${asset} must be referenced`);
    assert(new RegExp(`\\./assets/${asset.replace('.', '\\.')}\\?v=hd33\\b`).test(htmlContent + gameContent), `${asset} must be referenced with ?v=hd33`);
    assert(new RegExp(`${SPRITE_KEYS[asset]}: '\\./assets/${asset.replace('.', '\\.')}\\?v=hd33'`).test(spritesContent), `${asset} must be preloaded by sprites.js with ?v=hd33`);
    assert(!new RegExp(`${asset.replace('.', '\\.')}\\?v=hd(?!33\\b)`).test(htmlContent + gameContent + spritesContent), `${asset} must only use ?v=hd33`);
    // 复用规则：从同一款游戏的正式图复制（字节相同或规整后同尺寸），256×256 去底
    const src = path.join(PUBLIC_DIR, 'assets', REUSED_ART[asset]);
    const dst = path.join(PUBLIC_DIR, 'assets', asset);
    assert(fs.existsSync(src), `Reuse source ${REUSED_ART[asset]} exists`);
    const sz = webpSize(dst);
    assert(sz.w === 256 && sz.h === 256 && sz.alpha, `${asset} must be a 256x256 webp with alpha, got ${JSON.stringify(sz)}`);
    assert(fs.readFileSync(src).equals(fs.readFileSync(dst)), `${asset} must be a byte copy of ${REUSED_ART[asset]}`);
  }

  // 船坞不加键：仍是 25 键，也没有任何衣橱 / 故事书船坞键
  assert.equal((htmlContent.match(/class="care-btn[\s"]/g) || []).length, CARE_BTN_COUNT, `index.html must keep exactly ${CARE_BTN_COUNT} dock keys`);
  const dockHtml = htmlContent.slice(htmlContent.indexOf('id="pet-care-bar"'), htmlContent.indexOf('class="action-zone"'));
  assert(dockHtml.length > 100 && !/wardrobe|storybook|story_bookmark/.test(dockHtml), 'AR-17 must not add a wardrobe / storybook key to the dock');

  // 场景已满：AR-17 不加任何场景物件 —— sprites 里只有她身边的套组小特效与绘本道具（无布局函数），只贴位图不画矢量
  const vectorRe = /beginPath|lineTo|\barc\(|arcTo|bezierCurveTo|quadraticCurveTo|strokeRect|roundRect\(|\.stroke\(\)|\.fill\(\)/;
  const ar17Sprites = sliceBetween(spritesContent, '// ================= AR-17 季节换装衣橱 & 睡前故事书', '', 'sprites.js AR-17');
  assert(!vectorRe.test(ar17Sprites), 'AR-17 canvas drawing must only draw the provided webp art');
  const exported = Array.from(ar17Sprites.matchAll(/export function (\w+)/g)).map((m) => m[1]);
  assert.deepEqual(exported, ['drawWardrobeSeasonSparkles', 'drawStorybookProp'], `AR-17 sprites may only add companion props, got ${exported.join(', ')}`);
  assert(!/Layout|deskY|0\.68|furniture/.test(ar17Sprites), 'AR-17 must not place new scene objects (no layout / desk anchor)');
  const renderBlock = sliceBetween(gameContent, 'drawHearthSnackProp(ctx, player, now);', 'drawHeroSprite(ctx, player, now);', 'render AR-17 props');
  assert(/drawWardrobeSeasonSparkles\(ctx, player, now\)/.test(renderBlock) && /drawStorybookProp\(ctx, player, now\)/.test(renderBlock), 'AR-17 props are drawn beside her (hero prop block), not in the scene');
  assert(/const look = p\.wardrobeVisual && p\.wardrobeVisual\.look;/.test(spritesContent), 'drawHeroSprite reads the wardrobe look only for drawing');

  // 不改既有结算数值：好梦章公式原样保留，AR-17 加成是独立的一次性加金币（每天 1 次），换装不碰 player.equipped
  const settle = sliceBetween(gameContent, 'function settleGoodnightSession', 'function cancelGoodnightSession', 'goodnight settle');
  assert(/const coinReward = Math\.round\(baseCoinReward \* getStarGoodnightMult\(\)\);/.test(settle), 'Goodnight stamp coin formula unchanged');
  assert(/const storyNight = awardStoryGoodnight\(\);/.test(settle) && settle.indexOf('awardStoryGoodnight') > settle.indexOf('addCoins(coinReward'), 'Story goodnight bonus is a separate payout after the stamp reward');
  const ar17Game = sliceBetween(gameContent, '// ================= AR-17 季节换装衣橱 & 睡前故事书', '// ================= AR 拍立得纪念合影系统', 'game.js AR-17');
  const ar17Spec = sliceBetween(gameContent, '// AR-17 季节换装衣橱 & 睡前故事书：规格常量', 'function resetSurvivorRun', 'game.js AR-17 specs');
  assert(!/player\.equipped\s*\[[^\]]+\]\s*=|player\.equipped\s*=/.test(ar17Game + ar17Spec), 'AR-17 must never write player.equipped');
  assert(!vectorRe.test(ar17Game) && !/getContext\(/.test(ar17Game), 'AR-17 UI must not draw vector shapes / canvas icons');
  const offlineRe = /fetch\(|XMLHttpRequest|WebSocket|EventSource|geolocation|getBattery|Sensor\(|devicemotion|deviceorientation|temperature|https?:\/\//i;
  for (const [label, code] of [
    ['game.js AR-17 section', ar17Game],
    ['game.js AR-17 specs', ar17Spec],
    ['sprites.js AR-17', ar17Sprites]
  ]) {
    assert(!offlineRe.test(code), `${label} must stay offline (no network / sensors)`);
  }
  let rgbCount = 0;
  for (const m of ar17Spec.matchAll(/rgb: '(\d+), (\d+), (\d+)'/g)) {
    rgbCount += 1;
    assert(Math.min(Number(m[1]), Number(m[2]), Number(m[3])) >= 200, `AR-17 tint must stay cream/pastel, got ${m[0]}`);
  }
  assert(rgbCount >= 14, `Expected 8 outfit + 6 story tints, got ${rgbCount}`);

  // 复用图不能和原图出现在同一个面板：两张卡 / AR-17 区段 / 抽屉「家具与装扮」页 / 日记行图标都不引用原图
  const cardHtml = sliceBetween(htmlContent, '<aside id="wardrobe-card"', '<!-- AR-2 日常话题轻对话', 'AR-17 cards html');
  const dressTab = sliceBetween(gameContent, "} else if (activeDrawerTab === 'dress') {", "} else if (activeDrawerTab === 'upgrade') {", 'dress tab');
  const diarySpecs = sliceBetween(gameContent, 'const DIARY_LINE_SPECS = [', 'const DIARY_COUNTER_KEYS', 'diary line specs');
  const pillHtml = sliceBetween(htmlContent, '<button type="button" id="wardrobe-story-pill"', '</button>', 'AR-17 pill');
  for (const original of Object.values(REUSED_ART)) {
    for (const [label, code] of [
      ['AR-17 cards', cardHtml],
      ['AR-17 game section', ar17Game],
      ['AR-17 pill', pillHtml],
      ['drawer dress tab', dressTab],
      ['diary line icons', diarySpecs]
    ]) {
      assert(!code.includes(original), `${label} must not show the original ${original} next to its reused copy`);
    }
  }

  // 卡片底部只一行要点（完整句进 title）：两张卡都走 setRuleLine
  assert((ar17Game.match(/setRuleLine\(\s*(?:wd|sb)FooterLineEl/g) || []).length >= 3, 'AR-17 footers use setRuleLine');

  // 零暗黑赛博 / 荧光色
  const cssStart = cssContent.indexOf('AR-17 季节换装衣橱 & 睡前故事书');
  assert(cssStart > 0, 'style.css must contain the AR-17 section');
  const ar17Css = cssContent.slice(cssStart);
  assert(
    !/neon|#0{3,6}\b|#000\b|#111|#1[0-9a-f]{5}\b|#[2-4][0-9a-f]{5}\b|rgba?\(\s*(?:[0-5]?\d)\s*,\s*(?:[0-5]?\d)\s*,\s*(?:[0-9]?\d)\s*[,)]/i.test(ar17Css),
    'AR-17 CSS must not contain near-black / neon colors'
  );
  assert(!/transparent/.test(ar17Css), 'AR-17 CSS gradients must fade to cream/white');

  console.log(
    `[STATIC PASS] ${jsFiles.length} JS modules syntax-checked, ${assetRefs.size} assets on disk (4 AR-17 images = 256x256 byte copies of existing art, ?v=hd33), style hd33+/game hd57+/sprites hd33+, still ${CARE_BTN_COUNT} dock keys, no new scene objects, goodnight stamp formula unchanged, equipped never written, ${rgbCount} cream tints, reused art never next to its original, 0 dark/neon colors.`
  );
}

function startStaticServer(preferredPort) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const cleanUrl = (req.url || '/').split('?')[0];
      const relPath = cleanUrl === '/' ? 'index.html' : cleanUrl.replace(/^\/+/, '');
      const fullPath = path.resolve(PUBLIC_DIR, relPath);
      if (!fullPath.startsWith(PUBLIC_DIR) || !fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const ext = path.extname(fullPath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      fs.createReadStream(fullPath).pipe(res);
    });
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE' && preferredPort !== 0) {
        server.listen(0, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${server.address().port}/` }));
      } else {
        reject(err);
      }
    });
    server.listen(preferredPort, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${server.address().port}/` }));
  });
}

async function getState(page, iso = '') {
  return page.evaluate((d) => window.__AR17_DEBUG__.getState(d), iso);
}

async function dbg(page, fn, ...args) {
  return page.evaluate(([f, a]) => window.__AR17_DEBUG__[f](...a), [fn, args]);
}

async function openPanelNames(page) {
  const panels = (await getState(page)).openPanels;
  return Object.entries(panels)
    .filter(([, isOpen]) => isOpen)
    .map(([k]) => k);
}

async function closeAll(page) {
  const left = await page.evaluate(() => {
    for (const id of ['btn-wardrobe-close', 'btn-storybook-close', 'btn-embroidery-close', 'btn-hearth-close', 'btn-star-close', 'btn-rain-close']) {
      const el = document.getElementById(id);
      const card = el && el.closest('aside');
      if (card && !card.classList.contains('hidden')) el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
    }
    return ['wardrobe-card', 'storybook-card', 'embroidery-card', 'hearth-card', 'star-projector-card', 'rain-corner-card'].filter(
      (id) => !document.getElementById(id).classList.contains('hidden')
    );
  });
  assert.deepEqual(left, [], `closeAll must close every AR-15 ~ AR-17 card, still open: ${left.join(', ')}`);
  await page.waitForTimeout(120);
}

async function dockAudit(page) {
  return page.evaluate(() => {
    const r = (el) => el.getBoundingClientRect();
    const rotated = document.getElementById('game-stage').className.includes('forced-landscape');
    const joy = r(document.getElementById('joystick-zone'));
    const care = r(document.getElementById('pet-care-bar'));
    const act = r(document.querySelector('.action-zone'));
    const btns = Array.from(document.querySelectorAll('#pet-care-bar .care-btn')).map(r);
    let overlap = 0;
    for (let i = 0; i < btns.length; i++) {
      for (let j = i + 1; j < btns.length; j++) {
        const ix = Math.min(btns[i].right, btns[j].right) - Math.max(btns[i].left, btns[j].left);
        const iy = Math.min(btns[i].bottom, btns[j].bottom) - Math.max(btns[i].top, btns[j].top);
        if (ix > 0.5 && iy > 0.5) overlap += 1;
      }
    }
    const along = (rect) => (rotated ? { start: rect.top, end: rect.bottom } : { start: rect.left, end: rect.right });
    return {
      rotated,
      count: btns.length,
      overlap,
      joyMargin: along(care).start - along(joy).end,
      jumpMargin: along(act).start - along(care).end
    };
  });
}

async function cardAudit(page, cardId) {
  return page.evaluate((id) => {
    const prof = document.querySelector('.hud-profile-card').getBoundingClientRect();
    const hr = document.querySelector('.hud-right').getBoundingClientRect();
    const care = document.getElementById('pet-care-bar').getBoundingClientRect();
    const act = document.querySelector('.action-zone').getBoundingClientRect();
    const cardEl = document.getElementById(id);
    const card = cardEl.getBoundingClientRect();
    const imgs = Array.from(cardEl.querySelectorAll('img'));
    const inner = Array.from(cardEl.querySelectorAll('button')).filter((b) => b.offsetParent !== null && !b.classList.contains('hidden'));
    const outside = inner
      .map((b) => b.getBoundingClientRect())
      .filter((b) => b.width > 0 && (b.left < card.left - 1 || b.right > card.right + 1 || b.top < card.top - 1 || b.bottom > card.bottom + 1)).length;
    const footer = cardEl.querySelector('[id$="-footer-line"]');
    const srcs = imgs.map((im) => (im.getAttribute('src') || '').replace(/^\.\/assets\//, '').replace(/\?.*$/, ''));
    return {
      overflowX: document.documentElement.scrollWidth - window.innerWidth,
      overflowY: document.documentElement.scrollHeight - window.innerHeight,
      cardOpen: !cardEl.classList.contains('hidden'),
      scrollable: cardEl.scrollHeight - cardEl.clientHeight,
      outside,
      imgsLoaded: imgs.every((im) => im.complete && im.naturalWidth > 0),
      srcs,
      footerLines: footer ? Math.round(footer.getBoundingClientRect().height / parseFloat(getComputedStyle(footer).lineHeight || '11')) : 0,
      footerTitle: footer ? footer.title || '' : '',
      profileRight: prof.right,
      cardLeft: card.left,
      cardRight: card.right,
      cardTop: card.top,
      cardBottom: card.bottom,
      careTop: care.top,
      careLeft: care.left,
      careRight: care.right,
      actTop: act.top,
      hudRightBottom: hr.bottom,
      hasEmoji: /\p{Extended_Pictographic}/u.test(document.body.innerText || '')
    };
  }, cardId);
}

function assertNoCopyWithOriginal(srcs, label) {
  for (const [copy, original] of Object.entries(REUSED_ART)) {
    assert(!(srcs.includes(copy) && srcs.includes(original)), `${label}: reused ${copy} must not appear next to its original ${original}`);
  }
}

async function runPlaywrightSuite() {
  const { server, url } = await startStaticServer(PORT);
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const outbound = [];
    await context.route('https://**', (route) => {
      outbound.push(route.request().url());
      route.abort();
    });
    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    const failedResponses = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => pageErrors.push(err.message || String(err)));
    page.on('response', (res) => {
      if (res.url().startsWith(url) && res.status() >= 400) failedResponses.push(`${res.status()} ${res.url()}`);
    });

    await page.goto(url, { waitUntil: 'load' });
    await page.waitForTimeout(500);
    assert.equal(pageErrors.length, 0, `Page errors on load: ${pageErrors.join('; ')}`);
    assert.equal(consoleErrors.length, 0, `Console errors on load: ${consoleErrors.join('; ')}`);

    // 0. 4 张 AR-17 贴图都加载（卡片 / 胶囊里的 <img> 与 sprites 预载）
    const imgAudit = await page.evaluate(async (assets) => {
      const res = {};
      for (const a of assets) {
        const im = new Image();
        im.src = `./assets/${a}?v=hd33`;
        await im.decode().catch(() => {});
        res[a] = im.naturalWidth;
      }
      res.broken = Array.from(document.querySelectorAll('img'))
        .filter((img) => (img.getAttribute('src') || '').startsWith('./assets/') && img.complete && img.naturalWidth === 0)
        .map((img) => img.getAttribute('src'));
      return res;
    }, REQUIRED_AR17_ASSETS);
    for (const a of REQUIRED_AR17_ASSETS) assert(imgAudit[a] > 0, `${a} must load`);
    assert.deepEqual(imgAudit.broken, [], `Broken images: ${imgAudit.broken.join(', ')}`);

    // 固定一个确定的“今晚”：今天本地 21:30（睡前时间）
    const now = new Date();
    const tonight = dayAt(now, 0, 21, 30);
    const season = seasonOf(tonight);
    const inSeason = OUTFIT_ORDER.filter((id) => OUTFITS[id].season === season);
    const offSeason = OUTFIT_ORDER.find((id) => OUTFITS[id].season === nextSeason(season));
    const tonightStory = tonightStoryOf(tonight);
    await dbg(page, 'setClock', tonight.getTime());
    await page.evaluate((ms) => {
      window.__AR16_DEBUG__.setClock(ms);
      window.__AR15_DEBUG__?.setClock?.(ms);
    }, tonight.getTime());

    // 1. 新存档：空衣橱、没在换装、空书签夹、没有晚安余温；胶囊收起
    let st = await getState(page);
    assert.deepEqual([st.seasonWardrobe.outfits, st.seasonWardrobe.wearing, st.seasonWardrobe.totalChanges], [{}, '', 0], 'Fresh save: empty wardrobe');
    assert.deepEqual([st.bedtimeStorybook.bookmarks, st.bedtimeStorybook.glow, st.bedtimeStorybook.totalStories], [{}, null, 0], 'Fresh save: empty storybook');
    assert.equal(st.wardrobeStats.seasonId, season, 'Season follows the injected local date');
    assert.deepEqual(st.wardrobeStats.seasonOutfits, inSeason, `This season's outfits: ${JSON.stringify(st.wardrobeStats.seasonOutfits)}`);
    assert.equal(st.storyStats.tonightId, tonightStory, 'Tonight story rotates by local date');
    assert.equal(st.storyStats.bedtime, true, '21:30 is bedtime');
    assert.equal(await page.evaluate(() => document.getElementById('wardrobe-story-pill').classList.contains('hidden')), true, 'Pill hidden on a fresh save');

    // 2. 入口：不加船坞键 —— 抽屉「家具与装扮」快捷卡（紧跟刺绣暖炉块）
    await page.click('#btn-shop');
    await page.waitForTimeout(220);
    const drawerAudit = await page.evaluate(() => {
      const blocks = Array.from(document.querySelectorAll('#drawer-items .drawer-section-block'));
      const idx = blocks.findIndex((b) => b.querySelector('[data-ar17-shortcut]'));
      const idx16 = blocks.findIndex((b) => b.querySelector('[data-ar16-shortcut]'));
      const btn = document.querySelector('[data-ar17-shortcut="wardrobe"]');
      btn.scrollIntoView({ block: 'nearest' });
      const items = document.getElementById('drawer-items').getBoundingClientRect();
      const pr = btn.getBoundingClientRect();
      const srcs = Array.from(document.querySelectorAll('#drawer-items img')).map((im) => (im.getAttribute('src') || '').replace(/^\.\/assets\//, '').replace(/\?.*$/, ''));
      return {
        idx,
        idx16,
        title: idx >= 0 ? blocks[idx].querySelector('.drawer-section-title').textContent : '',
        hint: idx >= 0 ? blocks[idx].querySelector('.drawer-section-hint').textContent : '',
        imgsLoaded: Array.from(blocks[idx] ? blocks[idx].querySelectorAll('img') : []).every((im) => im.naturalWidth > 0),
        visibleAfterScroll: Boolean(pr.top >= items.top - 1 && pr.bottom <= items.bottom + 1),
        sub: btn.querySelector('.room-theme-sub').textContent,
        storySub: document.querySelector('[data-ar17-shortcut="storybook"] .room-theme-sub').textContent,
        srcs
      };
    });
    assert.equal(drawerAudit.idx16, 3, 'AR-16 shortcuts keep their spot');
    assert.equal(drawerAudit.idx, 4, `AR-17 shortcuts sit right after the AR-16 block, got ${drawerAudit.idx}`);
    assert.equal(drawerAudit.title, '季节衣橱与睡前故事书');
    assert(drawerAudit.hint.length <= 40, `Drawer hint stays one short line: ${drawerAudit.hint}`);
    assert(drawerAudit.imgsLoaded && drawerAudit.visibleAfterScroll, `Drawer shortcut art loads and scrolls into view: ${JSON.stringify(drawerAudit)}`);
    assert(drawerAudit.sub.includes('衣橱 0/8'), `Fresh wardrobe shortcut sub: ${drawerAudit.sub}`);
    assert(drawerAudit.storySub.includes('书签 0/6'), `Fresh storybook shortcut sub: ${drawerAudit.storySub}`);
    assertNoCopyWithOriginal(drawerAudit.srcs, 'Drawer dress tab');
    await page.waitForTimeout(150);
    await shot(page, 'desktop_1440x900_drawer_entry.png');
    await page.click('[data-ar17-shortcut="wardrobe"]');
    await page.waitForTimeout(180);
    assert.deepEqual(await openPanelNames(page), ['seasonWardrobe'], 'Drawer wardrobe shortcut opens only the wardrobe card');
    await page.click('#btn-shop');
    await page.waitForTimeout(200);
    await page.evaluate(() => document.querySelector('[data-ar17-shortcut="storybook"]').scrollIntoView({ block: 'nearest' }));
    await page.click('[data-ar17-shortcut="storybook"]');
    await page.waitForTimeout(180);
    assert.deepEqual(await openPanelNames(page), ['bedtimeStorybook'], 'Drawer storybook shortcut opens only the storybook card');
    await closeAll(page);

    // 3. 浮层互斥：AR-17 两张卡与 AR-15 / AR-16 卡、船坞卡片、抽屉一次只开一个
    const exclusive = [
      ['ar17', 'openWardrobe', 'seasonWardrobe'],
      ['ar16', 'openEmbroidery', 'embroideryHoop'],
      ['ar17', 'openStorybook', 'bedtimeStorybook'],
      ['dock', '#btn-diary-book', 'diaryBook'],
      ['ar17', 'openWardrobe', 'seasonWardrobe'],
      ['ar15', 'openStar', 'starProjector'],
      ['ar17', 'openStorybook', 'bedtimeStorybook'],
      ['ar16', 'openHearth', 'hearthCorner'],
      ['ar17', 'openStorybook', 'bedtimeStorybook'],
      ['dock', '#btn-weekly-journal', 'weeklyJournal'],
      ['ar17', 'openWardrobe', 'seasonWardrobe'],
      ['dock', '#btn-shop', 'drawer'],
      ['ar17', 'openStorybook', 'bedtimeStorybook']
    ];
    for (const [kind, target, expect] of exclusive) {
      if (kind === 'dock') await page.click(target);
      else if (kind === 'ar17') await dbg(page, target);
      else if (kind === 'ar16') await page.evaluate((f) => window.__AR16_DEBUG__[f](), target);
      else await page.evaluate((f) => window.__AR15_DEBUG__[f](), target);
      await page.waitForTimeout(160);
      assert.deepEqual(await openPanelNames(page), [expect], `Only ${expect} is open after ${target}`);
    }
    await closeAll(page);

    // 4. 季节换装衣橱：不在季节的套组挑不了；当季套组真实点按换上 → 新套组奖励、周报 / 日记计数；只换画面，加成不变
    const metricsBefore = await page.evaluate(() => ({
      survivor: window.__AR5_DEBUG__.getSurvivorEffectiveMetrics(),
      mults: window.__AR16_DEBUG__.getAffectionMults()
    }));
    await page.click('#btn-shop');
    await page.waitForTimeout(200);
    await page.evaluate(() => document.querySelector('[data-ar17-shortcut="wardrobe"]').scrollIntoView({ block: 'nearest' }));
    await page.click('[data-ar17-shortcut="wardrobe"]');
    await page.waitForTimeout(180);
    let r = await dbg(page, 'pickOutfit', offSeason);
    assert.deepEqual([r.ok, r.reason], [false, 'out_of_season'], `Out-of-season outfit is locked: ${JSON.stringify(r)}`);
    st = await getState(page);
    assert.equal(st.wardrobeMain.disabled, true, 'Main button waits for an outfit');
    const coins0 = st.coins;
    await page.click(`#wd-outfit-row [data-outfit-id="${inSeason[0]}"]`);
    await page.waitForTimeout(100);
    st = await getState(page);
    assert.deepEqual([st.wardrobeRun.previewId, st.wardrobeMain.mode], [inSeason[0], 'wear'], 'Picking previews the outfit');
    await page.click('#btn-wardrobe-main');
    await page.waitForTimeout(200);
    st = await getState(page);
    assert.equal(st.seasonWardrobe.wearing, inSeason[0], 'Real tap wears the in-season outfit');
    assert.equal(st.coins - coins0, WD.coin + WD.fresh, `New outfit reward: ${st.coins - coins0}`);
    assert.deepEqual(st.seasonWardrobe.outfits[inSeason[0]].count, 1);
    const expectLook = Object.fromEntries(LOOK_KEYS.map((k) => [k, OUTFITS[inSeason[0]].items.includes(k)]));
    assert.deepEqual(st.wardrobeVisual.look, expectLook, `Look = outfit accessories only: ${JSON.stringify(st.wardrobeVisual.look)}`);
    assert.equal(st.wardrobeVisual.seasonKey, season, 'Season sparkles follow the outfit season');
    assert.deepEqual(st.equipped, {}, 'Wearing an outfit never equips shop items');
    const metricsAfter = await page.evaluate(() => ({
      survivor: window.__AR5_DEBUG__.getSurvivorEffectiveMetrics(),
      mults: window.__AR16_DEBUG__.getAffectionMults()
    }));
    assert.deepEqual(metricsAfter, metricsBefore, 'Outfit does not change any settlement multiplier');
    assert.equal(st.journalSummary.outfits7d, 1, 'Weekly journal counts the outfit change');
    let wdAudit = await cardAudit(page, 'wardrobe-card');
    assert(wdAudit.imgsLoaded, 'Wardrobe card images load');
    assertNoCopyWithOriginal(wdAudit.srcs, 'Wardrobe card');
    assert(wdAudit.footerLines <= 1 && wdAudit.footerTitle.includes('加成不变'), `Footer: one key line, full sentence in title: ${JSON.stringify([wdAudit.footerLines, wdAudit.footerTitle])}`);
    await page.waitForTimeout(250);
    await shot(page, 'desktop_1440x900_wardrobe.png');
    // 第二套（她来挑）：同一天第二次奖励；第三次没有奖励（每天前 2 次）
    const coins1 = st.coins;
    r = await dbg(page, 'wardrobeHelper');
    assert.deepEqual([r.ok, r.outfitId, r.isNew, r.reward && r.reward.coins], [true, inSeason[1], true, WD.coin + WD.fresh], `Helper wears the other in-season outfit: ${JSON.stringify(r)}`);
    r = await dbg(page, 'pickOutfit', inSeason[0]);
    r = await dbg(page, 'wardrobeMain');
    assert.deepEqual([r.ok, r.reward], [true, null], `Third change today gives no reward: ${JSON.stringify(r)}`);
    st = await getState(page);
    assert.equal(st.coins - coins1, WD.coin + WD.fresh, 'Daily cap: only the first 2 changes pay');
    assert.equal(st.wardrobeStats.rewardsToday, WD.daily);
    // 换回原样
    r = await dbg(page, 'wardrobeMain');
    st = await getState(page);
    assert.deepEqual([r.ok, st.seasonWardrobe.wearing, st.wardrobeVisual.look], [true, '', null], 'Main button takes the outfit off');
    // 换过的套组任何季节都能再穿；没换过的别季套组仍锁着
    await dbg(page, 'setClock', dayAt(tonight, 92, 21, 30).getTime());
    r = await dbg(page, 'pickOutfit', inSeason[0]);
    assert.equal(r.ok, true, 'A worn outfit stays wearable in another season');
    await dbg(page, 'setClock', tonight.getTime());
    r = await dbg(page, 'wear', inSeason[0]);
    assert.equal(r.ok, true, 'Wear again for the rest of the run');
    await closeAll(page);

    // 5. 睡前故事书：真实点按挑故事 → 翻 3 页（她读）→ 夹上书签；睡前读完留下 90 分钟晚安余温，胶囊显示余温
    await page.click('#btn-shop');
    await page.waitForTimeout(200);
    await page.evaluate(() => document.querySelector('[data-ar17-shortcut="storybook"]').scrollIntoView({ block: 'nearest' }));
    await page.click('[data-ar17-shortcut="storybook"]');
    await page.waitForTimeout(180);
    st = await getState(page);
    const coins2 = st.coins;
    await page.click(`#sb-story-row [data-story-id="${tonightStory}"]`);
    await page.waitForTimeout(100);
    for (let i = 0; i < 3; i++) {
      await page.click('#btn-storybook-main');
      await page.waitForTimeout(90);
      const pg = await page.evaluate(() => document.getElementById('sb-page-text').textContent);
      assert(pg.length >= 8, `Page ${i + 1} text is shown on the book: ${pg}`);
    }
    st = await getState(page);
    assert.deepEqual([st.storyRun.page, st.storyMain.mode, st.storyStats.reading], [3, 'finish', true], 'Three pages read');
    assert.equal(await page.evaluate(() => document.getElementById('ws-pill-story').textContent), '3/3页', 'Pill shows the reading progress');
    await page.click('#sb-book');
    await page.waitForTimeout(200);
    st = await getState(page);
    assert.equal(st.bedtimeStorybook.bookmarks[tonightStory].count, 1, 'Bookmark collected');
    assert.equal(st.coins - coins2, SB.coin + SB.fresh, `New bookmark reward: ${st.coins - coins2}`);
    assert(st.storyStats.glow && st.storyStats.glow.minsLeft === SB.glowMin, `Bedtime read leaves a ${SB.glowMin}-min goodnight glow: ${JSON.stringify(st.storyStats.glow)}`);
    assert.equal(st.journalSummary.stories7d, 1, 'Weekly journal counts the story');
    const pill = await page.evaluate(() => {
      const p = document.getElementById('wardrobe-story-pill');
      return { shown: !p.classList.contains('hidden'), story: document.getElementById('ws-pill-story').textContent, wd: document.getElementById('ws-pill-wardrobe').textContent };
    });
    assert(pill.shown && pill.story === `余温${SB.glowMin}分` && pill.wd.length > 0, `Merged pill: ${JSON.stringify(pill)}`);
    let sbAudit = await cardAudit(page, 'storybook-card');
    assert(sbAudit.imgsLoaded, 'Storybook card images load');
    assertNoCopyWithOriginal(sbAudit.srcs, 'Storybook card');
    await page.waitForTimeout(250);
    await shot(page, 'desktop_1440x900_storybook.png');
    await closeAll(page);
    await page.waitForTimeout(250);
    await shot(page, 'desktop_1440x900_scene_outfit.png');
    // 胶囊点故事段打开故事书，点换装段打开衣橱
    await page.click('#ws-seg-story');
    await page.waitForTimeout(160);
    assert.deepEqual(await openPanelNames(page), ['bedtimeStorybook'], 'Pill story segment opens the storybook');
    await page.click('#ws-seg-wardrobe');
    await page.waitForTimeout(160);
    assert.deepEqual(await openPanelNames(page), ['seasonWardrobe'], 'Pill wardrobe segment opens the wardrobe');
    await closeAll(page);

    // 6. 晚安联动：余温里完成晚安八音盒伴眠 → 好梦章数值原样 + 独立 +12 金币；同一天第二次没有
    const gn = await page.evaluate(() => {
      window.__AR6_DEBUG__.startMusicbox(30);
      window.__AR6_DEBUG__.fastForwardMusicbox(600);
      return window.__AR6_DEBUG__.settleMusicboxEarly();
    });
    assert(gn.ok, 'Goodnight session settles');
    assert.equal(gn.coinReward, gn.baseCoinReward, `Stamp coins unchanged by AR-17 (no star projection): ${JSON.stringify(gn)}`);
    assert.deepEqual([gn.storyNight && gn.storyNight.coins, gn.storyNight && gn.storyNight.xp], [SB.gnCoins, SB.gnXp], `Story goodnight bonus: ${JSON.stringify(gn.storyNight)}`);
    st = await getState(page);
    assert.deepEqual([st.bedtimeStorybook.glow, st.bedtimeStorybook.totalGoodnights, st.bedtimeStorybook.goodnightDate], [null, 1, keyOf(tonight)], 'Glow is used up, once per day');
    r = await dbg(page, 'storyHelper');
    assert.equal(r.ok && r.bedtime, true, 'Second bedtime story');
    r = await dbg(page, 'awardGoodnight');
    assert.equal(r, null, 'Daily cap: no second story goodnight bonus today');
    // 余温到点散去：胶囊故事段收起
    await dbg(page, 'advanceClock', (SB.glowMin + 1) * 60000);
    st = await getState(page);
    assert.equal(st.storyStats.glow, null, 'Glow fades after 90 minutes');
    assert.equal(await page.evaluate(() => document.getElementById('ws-seg-story').classList.contains('hidden')), true, 'Story pill segment hides after the glow');
    // 白天读完：收书签但不留余温；每天前 2 本有奖励
    await dbg(page, 'setClock', dayAt(tonight, 1, 14, 0).getTime());
    r = await dbg(page, 'storyHelper');
    assert.deepEqual([r.ok, r.bedtime, r.glowEndMs], [true, false, 0], `Daytime read: bookmark only: ${JSON.stringify(r)}`);
    r = await dbg(page, 'storyHelper');
    const r3 = await dbg(page, 'storyHelper');
    assert.deepEqual([Boolean(r.reward), r3.reward], [true, null], 'Daily cap: only the first 2 stories pay');

    // 7. 七日心情周报 + 手写日记联动
    // 周报卡片按真实今天出 7 日窗口：时钟拨回今晚（明天白天读的两本不在这个窗口里）
    await dbg(page, 'setClock', tonight.getTime());
    await page.click('#btn-weekly-journal');
    await page.waitForTimeout(260);
    const journal = await page.evaluate(() => ({
      summary: window.__AR17_DEBUG__.getState().journalSummary,
      cardText: document.getElementById('weekly-journal-card')?.textContent || ''
    }));
    assert(journal.summary.outfits7d >= 3 && journal.summary.stories7d >= 2, `7-day counts: ${journal.summary.outfits7d} / ${journal.summary.stories7d}`);
    assert(
      journal.cardText.includes(`换装 ${journal.summary.outfits7d}次`) &&
        journal.cardText.includes(`睡前故事 ${journal.summary.stories7d}本`) &&
        journal.cardText.includes(`衣橱 ${journal.summary.cumulative.wardrobeOutfits}/8`) &&
        journal.cardText.includes('周末野餐与日记') &&
        journal.cardText.includes('星夜观星与伴眠'),
      `Weekly journal card renders the wardrobe / story metrics: ${journal.cardText}`
    );
    assert(journal.cardText.includes('季节套组') && journal.cardText.includes('小故事'), 'Companion quote mentions outfits and stories');
    await page.waitForTimeout(200);
    await shot(page, 'desktop_1440x900_journal.png');
    await page.click('#btn-diary-book');
    await page.waitForTimeout(260);
    const diary = await page.evaluate(() => ({
      lines: Array.from(document.querySelectorAll('#dy-page-lines .dy-line')).map((li) => li.textContent.trim()),
      icons: Array.from(document.querySelectorAll('#dy-page-lines .dy-line-ico')).every((im) => im.naturalWidth > 0),
      srcs: Array.from(document.querySelectorAll('#diary-book-card img, [id^="dy-"] img')).map((im) => (im.getAttribute('src') || '').replace(/^\.\/assets\//, '').replace(/\?.*$/, ''))
    }));
    assert(diary.lines.some((l) => l.includes('书签')), `Diary mentions tonight's story: ${JSON.stringify(diary.lines)}`);
    assert(diary.lines.some((l) => l.includes('套组')), `Diary mentions today's outfit: ${JSON.stringify(diary.lines)}`);
    assert(diary.icons, 'Diary line icons load');
    assertNoCopyWithOriginal(diary.srcs, 'Diary card');
    await page.waitForTimeout(200);
    await shot(page, 'desktop_1440x900_diary.png');
    await page.click('#btn-diary-book');
    await page.waitForTimeout(160);

    // 8. 桌面 1440x900：两张卡不压船坞 / 顶部工具栏，内容不出内部滚动
    let dock = await dockAudit(page);
    assert(dock.count === CARE_BTN_COUNT && dock.overlap === 0 && dock.joyMargin >= MIN_DOCK_MARGIN && dock.jumpMargin >= MIN_DOCK_MARGIN, `1440x900 dock: ${JSON.stringify(dock)}`);
    for (const [cardId, fn] of [
      ['wardrobe-card', 'openWardrobe'],
      ['storybook-card', 'openStorybook']
    ]) {
      await dbg(page, fn);
      await page.waitForTimeout(450);
      const a = await cardAudit(page, cardId);
      const hOverlap = Math.min(a.cardRight, a.careRight) - Math.max(a.cardLeft, a.careLeft) > 0;
      assert(a.cardOpen && a.overflowX <= 0 && a.overflowY <= 0 && a.outside === 0 && a.imgsLoaded && !a.hasEmoji, `1440x900 ${cardId}: ${JSON.stringify(a)}`);
      assert(!hOverlap || a.cardBottom <= a.careTop + 1, `${cardId} overlaps the dock on 1440x900`);
      assert(a.cardTop >= a.hudRightBottom - 1, `${cardId} overlaps the toolbar on 1440x900`);
      assert(a.scrollable <= 1, `${cardId} fits without inner scrolling on 1440x900: ${a.scrollable}`);
    }
    await closeAll(page);

    // 9. 中等桌面 1280x720 / 1024x768：抽屉入口照样点得到，卡片不压船坞
    for (const [w, h] of [
      [1280, 720],
      [1024, 768]
    ]) {
      await page.setViewportSize({ width: w, height: h });
      await page.waitForTimeout(350);
      dock = await dockAudit(page);
      assert(dock.count === CARE_BTN_COUNT && dock.overlap === 0 && dock.joyMargin >= MIN_DOCK_MARGIN && dock.jumpMargin >= MIN_DOCK_MARGIN, `${w}x${h} dock: ${JSON.stringify(dock)}`);
      await page.click('#btn-shop');
      await page.waitForTimeout(220);
      await page.evaluate(() => document.querySelector('[data-ar17-shortcut="storybook"]').scrollIntoView({ block: 'nearest' }));
      await page.click('[data-ar17-shortcut="storybook"]');
      await page.waitForTimeout(180);
      assert.deepEqual(await openPanelNames(page), ['bedtimeStorybook'], `${w}x${h}: drawer storybook shortcut is reachable`);
      for (const [cardId, fn] of [
        ['wardrobe-card', 'openWardrobe'],
        ['storybook-card', 'openStorybook']
      ]) {
        await dbg(page, fn);
        await page.waitForTimeout(450);
        const a = await cardAudit(page, cardId);
        const hOverlap = Math.min(a.cardRight, a.careRight) - Math.max(a.cardLeft, a.careLeft) > 0;
        assert(a.cardOpen && a.overflowX <= 0 && a.overflowY <= 0 && a.outside === 0 && !a.hasEmoji, `${w}x${h} ${cardId}: ${JSON.stringify(a)}`);
        assert(!hOverlap || a.cardBottom <= a.careTop + 1, `${cardId} overlaps the dock on ${w}x${h}`);
        assert(a.cardTop >= a.hudRightBottom - 1, `${cardId} overlaps the toolbar on ${w}x${h}`);
        await page.waitForTimeout(200);
        await shot(page, `desktop_${w}x${h}_${cardId === 'wardrobe-card' ? 'wardrobe' : 'storybook'}.png`);
      }
      await closeAll(page);
    }

    // 10. 移动端 390x844（竖屏强制横置，真实点按）：抽屉入口 → 换装；故事书翻页夹书签
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(400);
    const portraitDock = await dockAudit(page);
    assert.equal(portraitDock.rotated, true, '390x844 uses the rotated landscape stage');
    assert(portraitDock.count === CARE_BTN_COUNT && portraitDock.overlap === 0 && portraitDock.joyMargin >= MIN_DOCK_MARGIN && portraitDock.jumpMargin >= MIN_DOCK_MARGIN, `390x844 dock: ${JSON.stringify(portraitDock)}`);
    await dbg(page, 'resetRunsForTest');
    await page.click('#btn-shop');
    await page.waitForTimeout(260);
    await page.evaluate(() => document.querySelector('[data-ar17-shortcut="wardrobe"]').scrollIntoView({ block: 'nearest' }));
    await page.click('[data-ar17-shortcut="wardrobe"]');
    await page.waitForTimeout(220);
    assert.deepEqual(await openPanelNames(page), ['seasonWardrobe'], 'Real tap on the rotated drawer shortcut opens the wardrobe');
    await page.click(`#wd-album-grid [data-outfit-id="${inSeason[1]}"]`);
    await page.waitForTimeout(80);
    await page.click('#wd-mirror');
    await page.waitForTimeout(200);
    st = await getState(page);
    assert.equal(st.seasonWardrobe.wearing, inSeason[1], 'Real taps change outfit on 390x844');
    let pa = await cardAudit(page, 'wardrobe-card');
    assert(pa.cardOpen && pa.overflowX <= 0 && pa.overflowY <= 0 && pa.outside === 0 && !pa.hasEmoji, `390x844 wardrobe card: ${JSON.stringify(pa)}`);
    await page.waitForTimeout(250);
    await shot(page, 'mobile_390x844_wardrobe.png');
    await closeAll(page);
    await dbg(page, 'openStorybook');
    await page.waitForTimeout(160);
    await page.click(`#sb-story-row [data-story-id="${STORIES[0]}"]`);
    await page.waitForTimeout(80);
    for (let i = 0; i < 3; i++) {
      await page.click('#sb-book');
      await page.waitForTimeout(80);
    }
    await page.click('#btn-storybook-main');
    await page.waitForTimeout(200);
    st = await getState(page);
    assert.deepEqual([st.storyRun.phase, st.bedtimeStorybook.bookmarks[STORIES[0]] && st.bedtimeStorybook.bookmarks[STORIES[0]].count > 0], ['done', true], 'Real taps read a story on 390x844');
    pa = await cardAudit(page, 'storybook-card');
    assert(pa.cardOpen && pa.overflowX <= 0 && pa.overflowY <= 0 && pa.outside === 0 && !pa.hasEmoji, `390x844 storybook card: ${JSON.stringify(pa)}`);
    await page.waitForTimeout(250);
    await shot(page, 'mobile_390x844_storybook.png');
    await closeAll(page);
    await page.waitForTimeout(300);
    await shot(page, 'mobile_390x844_scene.png');

    // 11. 844x390 横屏：两张卡不压船坞 / 动作键 / 顶部工具栏，无内部滚动；AR-17 胶囊不为自己新开一行
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(400);
    const landDock = await dockAudit(page);
    assert(landDock.count === CARE_BTN_COUNT && landDock.overlap === 0 && landDock.joyMargin >= MIN_DOCK_MARGIN && landDock.jumpMargin >= MIN_DOCK_MARGIN, `844x390 dock: ${JSON.stringify(landDock)}`);
    for (const [cardId, fn] of [
      ['wardrobe-card', 'openWardrobe'],
      ['storybook-card', 'openStorybook']
    ]) {
      await dbg(page, fn);
      // 等弹出动画（0.22s 缩放 / 位移）走完再量
      await page.waitForTimeout(450);
      const la = await cardAudit(page, cardId);
      assert(la.cardOpen && la.overflowX <= 0 && la.overflowY <= 0 && !la.hasEmoji && la.outside === 0, `844x390 ${cardId}: ${JSON.stringify(la)}`);
      assert(la.profileRight <= la.cardLeft, `${cardId} overlaps profile on 844x390`);
      assert(la.cardBottom <= la.actTop + 2 && la.cardBottom <= la.careTop + 1, `${cardId} overlaps the dock / action keys on 844x390: ${JSON.stringify(la)}`);
      assert(la.cardTop >= la.hudRightBottom - 1, `${cardId} overlaps the top-right toolbar on 844x390: ${JSON.stringify(la)}`);
      assert(la.scrollable <= 1, `${cardId} fits without inner scrolling on 844x390: ${la.scrollable}`);
      await page.waitForTimeout(200);
      await shot(page, `mobile_844x390_${cardId === 'wardrobe-card' ? 'wardrobe' : 'storybook'}.png`);
    }
    await closeAll(page);
    await dbg(page, 'storyHelper');
    await page.waitForTimeout(800);
    const pillRow = await page.evaluate(() => {
      const visible = (b) => !b.classList.contains('hidden') && b.offsetParent !== null;
      const pill = document.getElementById('wardrobe-story-pill');
      const others = Array.from(document.querySelectorAll('#hud-ambience-row > button')).filter((b) => b !== pill && visible(b));
      const mid = (b) => b.offsetTop + b.offsetHeight / 2;
      return {
        shown: visible(pill),
        sharesRow: visible(pill) ? others.some((b) => Math.abs(mid(b) - mid(pill)) <= 6) : true,
        layout: Array.from(document.querySelectorAll('#hud-ambience-row > button')).filter(visible).map((b) => `${b.id}@${b.offsetTop}`)
      };
    });
    assert(pillRow.sharesRow, `AR-17 pill must not add a HUD pill row on 844x390: ${JSON.stringify(pillRow)}`);
    const crowded = await page.evaluate(async () => {
      const ids = ['pomodoro-mini-pill', 'teatime-buff-pill', 'terrarium-blessing-pill', 'musicbox-mini-pill', 'collage-blessing-pill'];
      const prev = ids.map((id) => document.getElementById(id)?.classList.contains('hidden'));
      ids.forEach((id) => document.getElementById(id)?.classList.remove('hidden'));
      await new Promise((res) => setTimeout(res, 900));
      const pill = document.getElementById('wardrobe-story-pill');
      const visible = (b) => !b.classList.contains('hidden') && b.offsetParent !== null;
      const others = Array.from(document.querySelectorAll('#hud-ambience-row > button')).filter((b) => b !== pill && visible(b));
      const out = {
        shown: visible(pill),
        sharesRow: visible(pill) ? others.some((b) => Math.abs(b.offsetTop + b.offsetHeight / 2 - (pill.offsetTop + pill.offsetHeight / 2)) <= 6) : true
      };
      ids.forEach((id, i) => {
        if (prev[i]) document.getElementById(id)?.classList.add('hidden');
      });
      return out;
    });
    assert(crowded.sharesRow, `With a crowded pill row the AR-17 pill folds away instead of wrapping: ${JSON.stringify(crowded)}`);
    await page.waitForTimeout(400);
    await shot(page, 'mobile_844x390_scene.png');

    // 12. 旧存档 / 脏数据：非法套组 / 故事被丢掉，奖励计数封顶，超长余温作废，穿着的套组补记录；合法数据重开页面后保留
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate((key) => {
      const raw = JSON.parse(localStorage.getItem(key) || '{}');
      raw.seasonWardrobe = {
        outfits: { maple_crown: { count: 3, first: '2026-10-01' }, bogus: { count: 9 }, snow_crown: { count: -4 } },
        wearing: 'first_snow',
        rewardDate: '2026-11-20',
        rewardCount: 77,
        totalChanges: 'lots',
        lastOutfitId: 'nope'
      };
      raw.bedtimeStorybook = {
        bookmarks: { moon_bakery: { count: 2, first: 'x', starlit: 1 }, evil: { count: 5 }, cloud_pillow: [] },
        rewardDate: 'bad',
        rewardCount: 9,
        totalStories: 1,
        glow: { startMs: 1000, endMs: 1000 + 5 * 3600000, storyId: 'moon_bakery' },
        goodnightDate: '2026-11-19',
        totalGoodnights: -3,
        lastStoryId: 'whale_lullaby'
      };
      localStorage.setItem(key, JSON.stringify(raw));
    }, SAVE_KEY);
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(500);
    st = await getState(page);
    assert.deepEqual(st.seasonWardrobe.outfits, { maple_crown: { count: 3, first: '2026-10-01' }, first_snow: { count: 1, first: '' } }, `Dirty wardrobe sanitized: ${JSON.stringify(st.seasonWardrobe.outfits)}`);
    assert.deepEqual([st.seasonWardrobe.wearing, st.seasonWardrobe.rewardCount, st.seasonWardrobe.totalChanges, st.seasonWardrobe.lastOutfitId], ['first_snow', 2, 4, ''], 'Wardrobe counters clamped');
    assert.deepEqual(st.bedtimeStorybook.bookmarks, { moon_bakery: { count: 2, first: '', starlit: true } }, `Dirty bookmarks sanitized: ${JSON.stringify(st.bedtimeStorybook.bookmarks)}`);
    assert.deepEqual(
      [st.bedtimeStorybook.rewardDate, st.bedtimeStorybook.rewardCount, st.bedtimeStorybook.totalStories, st.bedtimeStorybook.glow, st.bedtimeStorybook.totalGoodnights, st.bedtimeStorybook.lastStoryId],
      ['', 0, 2, null, 0, 'whale_lullaby'],
      'Storybook counters clamped, over-long glow dropped'
    );
    assert.equal(st.wardrobeVisual.outfitId, 'first_snow', 'The saved outfit is worn again after reload');
    assert.equal(pageErrors.length, 0, `Page errors: ${pageErrors.join('; ')}`);
    // 没有这两个字段的旧存档：空衣橱 / 空书签夹
    await page.evaluate((key) => {
      const raw = JSON.parse(localStorage.getItem(key) || '{}');
      delete raw.seasonWardrobe;
      delete raw.bedtimeStorybook;
      localStorage.setItem(key, JSON.stringify(raw));
    }, SAVE_KEY);
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(400);
    st = await getState(page);
    assert.deepEqual([st.seasonWardrobe.outfits, st.seasonWardrobe.wearing, st.bedtimeStorybook.bookmarks, st.bedtimeStorybook.glow], [{}, '', {}, null], 'Old saves fall back to an empty wardrobe / storybook');

    assert.equal(pageErrors.length, 0, `Page errors: ${pageErrors.join('; ')}`);
    assert.equal(consoleErrors.length, 0, `Console errors: ${consoleErrors.join('; ')}`);
    assert.deepEqual(failedResponses, [], `Failed responses: ${failedResponses.join(', ')}`);
    assert.deepEqual(outbound, [], `No outbound network: ${outbound.join(', ')}`);
    console.log(
      `[RUNTIME PASS] drawer entry after the AR-16 block, single-card exclusivity with AR-15 / AR-16 / dock cards, in-season outfits (look only, multipliers unchanged, 2/day reward cap), bedtime stories with a ${SB.glowMin}-min glow and a separate once-a-day +${SB.gnCoins} goodnight bonus, weekly journal + diary lines, 1440/1280/1024/390x844/844x390 layouts, merged pill never adds a row, dirty saves sanitized.`
    );
    await context.close();
  } finally {
    if (browser) await browser.close();
    server.close();
  }
}

runStaticChecks();
await runPlaywrightSuite();
console.log('verify_ar17: ALL PASS');
