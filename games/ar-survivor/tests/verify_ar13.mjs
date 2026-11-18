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
const PORT = Number(process.env.AR13_PORT || 0);

// 可选：设置 AR13_SHOT_DIR 后输出 1440x900 / 1280x720 / 390x844 / 844x390 自审截图
const SHOT_DIR = process.env.AR13_SHOT_DIR || '';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.json': 'application/json; charset=utf-8'
};

const REQUIRED_AR13_ASSETS = [
  'ui_btn_picnic_basket.webp',
  'ui_btn_diary.webp',
  'picnic_blanket.webp',
  'picnic_sandwich.webp',
  'diary_page.webp',
  'diary_sticker.webp'
];

const CARE_BTN_COUNT = 25;
const SAVE_KEY = 'ar_deepseek_pet_v2';
const MIN_DOCK_MARGIN = 10;

async function shot(page, name) {
  if (!SHOT_DIR) return;
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(SHOT_DIR, name) });
}

function dayAt(base, offsetDays, hh = 10, mm = 0) {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + offsetDays, hh, mm, 0, 0);
}

function keyOf(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isoLocal(d) {
  return `${keyOf(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:00`;
}

function runStaticChecks() {
  const jsFiles = ['audio.js', 'vision.js', 'sprites.js', 'game.js'];
  for (const file of jsFiles) {
    execFileSync(process.execPath, ['--check', path.join(PUBLIC_DIR, file)], { stdio: 'pipe' });
  }
  execFileSync(process.execPath, ['--check', __filename], { stdio: 'pipe' });

  const checkFiles = ['index.html', 'style.css', ...jsFiles];
  const assetRefs = new Set();
  for (const file of checkFiles) {
    const content = fs.readFileSync(path.join(PUBLIC_DIR, file), 'utf8');
    assert(!/<svg[\s>]/i.test(content), `Inline <svg> detected in public/${file}`);
    assert(!/\p{Extended_Pictographic}/u.test(content), `Emoji character detected in public/${file}`);
    for (const m of content.matchAll(/\.\/assets\/([a-zA-Z0-9_.-]+\.(?:webp|png|jpg))/g)) {
      assetRefs.add(m[1]);
    }
  }

  const htmlContent = fs.readFileSync(path.join(PUBLIC_DIR, 'index.html'), 'utf8');
  const cssContent = fs.readFileSync(path.join(PUBLIC_DIR, 'style.css'), 'utf8');
  const spritesContent = fs.readFileSync(path.join(PUBLIC_DIR, 'sprites.js'), 'utf8');
  const gameContent = fs.readFileSync(path.join(PUBLIC_DIR, 'game.js'), 'utf8');
  const audioContent = fs.readFileSync(path.join(PUBLIC_DIR, 'audio.js'), 'utf8');
  // AR-14 起缓存号继续递增（hd29 / hd53），这里只要求不低于 AR-13 的 hd28 / hd52
  assert(/\.\/style\.css\?v=hd(?:2[89]|[3-9]\d)\b/.test(htmlContent), 'index.html must reference ./style.css?v=hd28+');
  assert(/\.\/game\.js\?v=hd(?:5[2-9]|[6-9]\d)\b/.test(htmlContent), 'index.html must reference ./game.js?v=hd52+');
  let htmlAr13Refs = 0;
  for (const reqAsset of REQUIRED_AR13_ASSETS) {
    if (new RegExp(`\\./assets/${reqAsset.replace('.', '\\.')}\\?v=hd(?:2[89]|[3-9]\\d)`).test(htmlContent)) htmlAr13Refs += 1;
    assert(assetRefs.has(reqAsset), `Required AR-13 asset ${reqAsset} is not referenced in code`);
    assert(new RegExp(`${reqAsset.replace('.', '\\.')}\\?v=hd(?:2[89]|[3-9]\\d)`).test(spritesContent + gameContent), `${reqAsset} must be loaded with ?v=hd28+ in JS`);
  }
  assert.equal(htmlAr13Refs, REQUIRED_AR13_ASSETS.length, `index.html must reference all 6 AR-13 images with ?v=hd28+, got ${htmlAr13Refs}`);
  for (const [name, content] of [
    ['index.html', htmlContent],
    ['style.css', cssContent],
    ['sprites.js', spritesContent],
    ['game.js', gameContent]
  ]) {
    assert(!/\?v=hd2[3-7]\b/.test(content), `Stale ?v=hd23..hd27 cache-buster left in public/${name}`);
  }
  assert(!/game\.js\?v=hd5[01]\b/.test(htmlContent), 'Stale game.js?v=hd50/hd51 left in index.html');
  assert(/\?v=hd(?:2[89]|[3-9]\d)\b/.test(cssContent), 'style.css must use ?v=hd28+ asset cache-busters');
  assert(/\?v=hd(?:2[89]|[3-9]\d)\b/.test(spritesContent), 'sprites.js must use ?v=hd28+ asset cache-busters');
  assert(/\.\/sprites\.js\?v=hd(?:2[89]|[3-9]\d)\b/.test(gameContent), 'game.js must import ./sprites.js?v=hd28+');
  assert(/\.\/audio\.js\?v=hd(?:2[89]|[3-9]\d)\b/.test(gameContent), 'game.js must import ./audio.js?v=hd28+');
  assert(/\.\/vision\.js\?v=hd(?:2[89]|[3-9]\d)\b/.test(gameContent), 'game.js must import ./vision.js?v=hd28+');
  for (const fn of ['getPicnicBasketDeskAnchor', 'getPicnicBlanketLayout', 'drawPicnicBasketDesk', 'drawPicnicOutingProp', 'drawDiaryWritingProp']) {
    assert(new RegExp(`export function ${fn}`).test(spritesContent), `sprites.js must export ${fn}`);
  }
  for (const fn of ['playPicnicPack', 'playPicnicSpread', 'playPicnicShare', 'playPicnicFinish', 'playDiaryFlip', 'playDiarySticker', 'playDiaryScribble', 'getAr13AudioInfo']) {
    assert(new RegExp(`\\n  ${fn}\\(`).test(audioContent), `audio.js must define ${fn}()`);
  }
  for (const asset of assetRefs) {
    const full = path.join(PUBLIC_DIR, 'assets', asset);
    assert(fs.existsSync(full), `Missing asset on disk: ${full}`);
    assert(fs.statSync(full).size > 0, `Empty asset on disk: ${full}`);
  }
  assert.equal((htmlContent.match(/class="care-btn[\s"]/g) || []).length, CARE_BTN_COUNT, `index.html must define ${CARE_BTN_COUNT} dock keys`);

  // AR-13 场景 / 卡片只贴已提供的位图（柔光渐变 + 文字标签），不画任何矢量图形，也不画 canvas 图标
  const vectorRe = /beginPath|lineTo|\barc\(|arcTo|bezierCurveTo|quadraticCurveTo|strokeRect|roundRect\(|\.stroke\(\)|\.fill\(\)/;
  const spriteStart = spritesContent.indexOf('// AR-13 周末野餐篮');
  const spriteEnd = spritesContent.indexOf('export function roundRect');
  assert(spriteStart > 0 && spriteEnd > spriteStart, 'sprites.js must contain the AR-13 drawing section');
  assert(!vectorRe.test(spritesContent.slice(spriteStart, spriteEnd)), 'AR-13 canvas drawing must only draw the provided webp art');
  const gameStart = gameContent.indexOf('// ================= AR-13 奶油手账周末野餐篮 & DeepSeek 娘手写日记本');
  const gameEnd = gameContent.indexOf('// ================= AR 拍立得纪念合影系统');
  assert(gameStart > 0 && gameEnd > gameStart, 'game.js must contain the AR-13 section');
  const ar13Game = gameContent.slice(gameStart, gameEnd);
  assert(!vectorRe.test(ar13Game), 'AR-13 game section must not draw vector shapes');
  assert(!/getContext\(/.test(ar13Game), 'AR-13 UI must not create canvas-drawn icons');

  // 零暗黑赛博 / 荧光色：AR-13 样式段不得出现深色
  const cssStart = cssContent.indexOf('AR-13 奶油手账周末野餐篮 & DeepSeek娘手写日记本');
  assert(cssStart > 0, 'style.css must contain the AR-13 section');
  assert(
    !/neon|#0{3,6}\b|#000\b|#111|#1[0-9a-f]{5}\b|#[2-4][0-9a-f]{5}\b|rgba?\(\s*(?:[0-5]?\d)\s*,\s*(?:[0-5]?\d)\s*,\s*(?:[0-9]?\d)\s*[,)]/i.test(
      cssContent.slice(cssStart)
    ),
    'AR-13 CSS must not contain near-black / neon colors'
  );

  console.log(
    `[STATIC PASS] ${jsFiles.length} JS modules syntax-checked, ${assetRefs.size} assets verified on disk (including all 6 AR-13 images), ?v=hd28+/hd52+ synced with 0 stale hd23-hd27, ${CARE_BTN_COUNT} dock keys, 0 inline <svg>, 0 Emoji, 0 vector shapes / canvas icons in AR-13 art, 0 dark/neon colors in AR-13 CSS.`
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
        server.listen(0, '127.0.0.1', () => {
          const addr = server.address();
          resolve({ server, url: `http://127.0.0.1:${addr.port}/` });
        });
      } else {
        reject(err);
      }
    });
    server.listen(preferredPort, '127.0.0.1', () => {
      const addr = server.address();
      resolve({ server, url: `http://127.0.0.1:${addr.port}/` });
    });
  });
}

async function getState(page, iso = '') {
  return page.evaluate((d) => window.__AR13_DEBUG__.getState(d), iso);
}

async function dbg(page, fn, ...args) {
  return page.evaluate(([f, a]) => window.__AR13_DEBUG__[f](...a), [fn, args]);
}

async function openPanelNames(page) {
  const panels = (await getState(page)).openPanels;
  return Object.entries(panels)
    .filter(([, isOpen]) => isOpen)
    .map(([k]) => k);
}

async function ensureCardOpen(page, cardId, btnSel) {
  if (await page.evaluate((id) => document.getElementById(id).classList.contains('hidden'), cardId)) {
    await page.click(btnSel);
    await page.waitForTimeout(160);
  }
}

async function ensureCardClosed(page, cardId, closeSel) {
  if (!(await page.evaluate((id) => document.getElementById(id).classList.contains('hidden'), cardId))) {
    await page.click(closeSel);
    await page.waitForTimeout(140);
  }
}

// 船坞几何：按舞台坐标轴（旋转舞台下取纵轴）计算摇杆 / 动作键留白，逐对检查按键二维相交
async function dockAudit(page) {
  return page.evaluate(() => {
    const r = (el) => el.getBoundingClientRect();
    const rotated = document.getElementById('game-stage').className.includes('forced-landscape');
    const joy = r(document.getElementById('joystick-zone'));
    const care = r(document.getElementById('pet-care-bar'));
    const act = r(document.querySelector('.action-zone'));
    const jump = r(document.getElementById('btn-jump'));
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
    const cross = (b) => (rotated ? (b.left + b.right) / 2 : (b.top + b.bottom) / 2);
    const crossSize = (b) => (rotated ? b.width : b.height);
    const single = btns.filter((b) => crossSize(b) < Math.max(...btns.map(crossSize)) * 0.8 || btns.every((x) => Math.abs(crossSize(x) - crossSize(b)) < 4));
    const centers = single.map(cross).sort((a, b) => a - b);
    let rows = 0;
    let lastC = -Infinity;
    for (const c of centers) {
      if (c - lastC > 8) rows += 1;
      lastC = c;
    }
    const picnic = r(document.getElementById('btn-picnic-basket'));
    const diary = r(document.getElementById('btn-diary-book'));
    return {
      rotated,
      count: btns.length,
      overlap,
      rows,
      joyMargin: along(care).start - along(joy).end,
      jumpMargin: along(act).start - along(care).end,
      jumpKeyMargin: along(jump).start - along(care).end,
      minKey: Math.min(...btns.map((b) => Math.min(b.width, b.height))),
      newKeysVisible: picnic.width > 20 && diary.width > 20,
      care: { left: care.left, top: care.top, right: care.right, bottom: care.bottom }
    };
  });
}

async function runPlaywrightSuite() {
  const { server, url } = await startStaticServer(PORT);
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.route('https://**', (route) => route.abort());
    const page = await context.newPage();

    const consoleErrors = [];
    const pageErrors = [];
    const failedResponses = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err.message || String(err));
    });
    page.on('response', (res) => {
      if (res.url().startsWith(url) && res.status() >= 400) {
        failedResponses.push(`${res.status()} ${res.url()}`);
      }
    });

    await page.goto(url, { waitUntil: 'load' });
    await page.waitForTimeout(450);
    assert.equal(pageErrors.length, 0, `Page errors on load: ${pageErrors.join('; ')}`);
    assert.equal(consoleErrors.length, 0, `Console errors on load: ${consoleErrors.join('; ')}`);

    // 0. DOM Emoji / 奶油手账配色 / 6 张 AR-13 贴图加载审计
    const initialAudit = await page.evaluate(async (assets) => {
      const brokenImgs = Array.from(document.querySelectorAll('img'))
        .filter((img) => {
          const src = img.getAttribute('src') || '';
          return src.startsWith('./assets/') && (!img.complete || img.naturalWidth === 0);
        })
        .map((img) => img.getAttribute('src'));
      const domImgs = Array.from(document.querySelectorAll('img')).filter((img) => assets.some((a) => (img.getAttribute('src') || '').includes(a)));
      const loadReport = {};
      for (const file of assets) {
        const img = new Image();
        img.src = `./assets/${file}?v=hd28`;
        await new Promise((res, rej) => {
          if (img.complete && img.naturalWidth > 0) res();
          else {
            img.onload = () => res();
            img.onerror = () => rej(new Error(`Failed to decode ${file}`));
          }
        });
        loadReport[file] = { w: img.naturalWidth, h: img.naturalHeight };
      }
      return {
        hasEmoji: /\p{Extended_Pictographic}/u.test(document.body.innerText || ''),
        brokenImgs,
        domImgCount: domImgs.length,
        domLoaded: domImgs.every((img) => img.complete && img.naturalWidth > 0),
        loadReport,
        picnicBg: getComputedStyle(document.getElementById('picnic-basket-card')).backgroundImage,
        diaryBg: getComputedStyle(document.getElementById('diary-book-card')).backgroundImage,
        pageBg: getComputedStyle(document.getElementById('dy-page')).backgroundColor,
        blanketBg: getComputedStyle(document.getElementById('pc-blanket')).backgroundImage,
        careBtnCount: document.querySelectorAll('#pet-care-bar .care-btn').length,
        overflowX: document.documentElement.scrollWidth - window.innerWidth,
        overflowY: document.documentElement.scrollHeight - window.innerHeight
      };
    }, REQUIRED_AR13_ASSETS);
    assert.equal(initialAudit.hasEmoji, false, 'Visible DOM must contain zero Emoji characters');
    assert.equal(initialAudit.brokenImgs.length, 0, `Broken ./assets/ images: ${initialAudit.brokenImgs.join(', ')}`);
    assert(initialAudit.domImgCount >= 12, `Expected >= 12 AR-13 <img> in DOM, got ${initialAudit.domImgCount}`);
    assert.equal(initialAudit.domLoaded, true, 'Every AR-13 <img> in DOM must load (naturalWidth > 0)');
    for (const [file, info] of Object.entries(initialAudit.loadReport)) {
      assert(info.w > 0 && info.h > 0, `AR-13 image ${file} must decode, got ${JSON.stringify(info)}`);
    }
    assert.equal(initialAudit.careBtnCount, CARE_BTN_COUNT, `Expected ${CARE_BTN_COUNT} dock buttons, got ${initialAudit.careBtnCount}`);
    assert(initialAudit.overflowX <= 0 && initialAudit.overflowY <= 0, `Desktop 1440x900 overflow: ${JSON.stringify(initialAudit)}`);
    assert(/255,\s*253,\s*248/.test(initialAudit.picnicBg), `#picnic-basket-card must use cream #FFFDF8, got ${initialAudit.picnicBg}`);
    assert(/255,\s*253,\s*248/.test(initialAudit.diaryBg), `#diary-book-card must use cream #FFFDF8, got ${initialAudit.diaryBg}`);
    const pageRgb = (initialAudit.pageBg.match(/\d+/g) || []).slice(0, 3).map(Number);
    assert(Math.min(...pageRgb) >= 240, `Diary paper must stay cream, got ${initialAudit.pageBg}`);
    const blanketColors = Array.from(initialAudit.blanketBg.matchAll(/rgba?\(([^)]+)\)/g)).map((m) => m[1].split(',').map((v) => Number(v.trim())));
    assert(blanketColors.length >= 4, `Picnic stage must use a layered pastel gradient, got ${initialAudit.blanketBg}`);
    for (const [r, g, b] of blanketColors) assert(Math.min(r, g, b) >= 150, `Picnic stage must stay pastel, got rgb(${r},${g},${b})`);

    // 日期：未来一整周（周一~周日）专门测工作日装篮 / 周末野餐；最近一个已过去的周末测七日周报联动
    const realNow = new Date();
    const today = dayAt(realNow, 0, 10, 0);
    let monOffset = 8;
    while (dayAt(realNow, monOffset).getDay() !== 1) monOffset += 1;
    const MON = dayAt(realNow, monOffset, 10, 0);
    const TUE = dayAt(MON, 1, 10, 0);
    const WED = dayAt(MON, 2, 10, 0);
    const THU = dayAt(MON, 3, 10, 0);
    const FRI = dayAt(MON, 4, 10, 0);
    const SAT = dayAt(MON, 5, 11, 0);
    const SUN = dayAt(MON, 6, 11, 0);
    const NEXT_MON = dayAt(MON, 7, 10, 0);
    const SAT2 = dayAt(MON, 12, 11, 0);
    const todayDow = realNow.getDay();
    const LAST_WEEKEND = todayDow === 6 || todayDow === 0 ? dayAt(realNow, 0, 9, 0) : dayAt(realNow, -todayDow, 15, 0);

    // 1. 新存档：空篮子、无期待章、无野餐好心情；日记只有一页空白的“今天”
    await dbg(page, 'setClock', MON.getTime());
    let st = await getState(page);
    assert.equal(st.picnicBasket.plan, null, 'Fresh save has an empty basket');
    assert.deepEqual(st.picnicBasket.log, []);
    assert.equal(st.picnicBasket.wardCharges, 0);
    assert.equal(st.picnicStats.isWeekend, false, 'Injected Monday is a weekday');
    assert.equal(st.picnicStats.daysUntil, 5, 'Monday is 5 days before Saturday');
    assert.deepEqual(st.diaryBook.decor, {});
    assert.equal(st.diaryStats.pages, 1, 'Fresh diary has just today\'s blank page');
    assert.equal(st.picnicWard.active, false);
    const freshDom = await page.evaluate(() => ({
      badge: document.getElementById('picnic-weekend-badge').classList.contains('hidden'),
      diaryBadge: document.getElementById('diary-new-badge').classList.contains('hidden'),
      pill: document.getElementById('picnic-diary-pill').classList.contains('hidden')
    }));
    assert.deepEqual(freshDom, { badge: true, diaryBadge: true, pill: true }, `Weekday fresh HUD stays quiet: ${JSON.stringify(freshDom)}`);

    // 2. 浮层互斥：打开任意一个只保留它自己（含 AR-10 ~ AR-13 八张卡）
    const panelTriggers = [
      { btn: '#btn-picnic-basket', key: 'picnicBasket' },
      { btn: '#btn-diary-book', key: 'diaryBook' },
      { btn: '#btn-kitten-corner', key: 'kittenCorner' },
      { btn: '#btn-picnic-basket', key: 'picnicBasket' },
      { btn: '#btn-greeting-card', key: 'greetingCard' },
      { btn: '#btn-diary-book', key: 'diaryBook' },
      { btn: '#btn-bento-kitchen', key: 'bentoKitchen' },
      { btn: '#btn-picnic-basket', key: 'picnicBasket' },
      { btn: '#btn-memory-puzzle', key: 'memoryPuzzle' },
      { btn: '#btn-diary-book', key: 'diaryBook' },
      { btn: '#btn-watercolor-easel', key: 'watercolorEasel' },
      { btn: '#btn-picnic-basket', key: 'picnicBasket' },
      { btn: '#btn-mailbox', key: 'mailbox' },
      { btn: '#btn-diary-book', key: 'diaryBook' },
      { btn: '#hud-ambience-pill', key: 'windowAmbience' },
      { btn: '#btn-picnic-basket', key: 'picnicBasket' },
      { btn: '#btn-pomodoro', key: 'pomodoro' },
      { btn: '#btn-diary-book', key: 'diaryBook' },
      { btn: '#btn-teatime', key: 'teatime' },
      { btn: '#btn-picnic-basket', key: 'picnicBasket' },
      { btn: '#btn-weekly-journal', key: 'weeklyJournal' },
      { btn: '#btn-diary-book', key: 'diaryBook' },
      { btn: '#btn-terrarium', key: 'terrarium' },
      { btn: '#btn-musicbox', key: 'goodnightMusicbox' },
      { btn: '#btn-picnic-basket', key: 'picnicBasket' },
      { btn: '#btn-collage-frame', key: 'collageFrame' },
      { btn: '#btn-cozy-radio', key: 'cozyRadio' },
      { btn: '#btn-diary-book', key: 'diaryBook' },
      { btn: '#btn-crochet-basket', key: 'crochetBasket' },
      { btn: '#btn-hot-cocoa', key: 'hotCocoa' },
      { btn: '#btn-picnic-basket', key: 'picnicBasket' },
      { btn: '#btn-pressed-flowers', key: 'pressedFlowers' },
      { btn: '#btn-telescope', key: 'telescope' },
      { btn: '#btn-diary-book', key: 'diaryBook' },
      { btn: '#btn-chat-topic', key: 'topic' },
      { btn: '#btn-picnic-basket', key: 'picnicBasket' },
      { btn: '#btn-shop', key: 'drawer' }
    ];
    for (const step of panelTriggers) {
      await page.click(step.btn);
      await page.waitForTimeout(110);
      const openNames = await openPanelNames(page);
      assert.deepEqual(openNames, [step.key], `Opening ${step.btn} must keep ONLY ${step.key} open, got: ${JSON.stringify(openNames)}`);
    }
    await page.click('[data-ar13-shortcut="picnic"]');
    await page.waitForTimeout(150);
    assert.deepEqual(await openPanelNames(page), ['picnicBasket'], 'Drawer picnic shortcut must open only #picnic-basket-card');
    await page.click('#btn-shop');
    await page.waitForTimeout(140);
    await page.click('[data-ar13-shortcut="diary"]');
    await page.waitForTimeout(150);
    assert.deepEqual(await openPanelNames(page), ['diaryBook'], 'Drawer diary shortcut must open only #diary-book-card');
    await page.click('#btn-diary-book');
    await page.waitForTimeout(130);
    assert.deepEqual(await openPanelNames(page), [], 'Tapping the diary dock button again must close the diary');

    // 3. 工作日：可以挑点心 / 选地点、装篮子攒期待章，但不能出发（友好提示，不是什么都做不了的硬锁）
    await page.click('#btn-picnic-basket');
    await page.waitForTimeout(160);
    let pDom = await page.evaluate(() => ({
      kind: document.getElementById('pc-day-row').dataset.dayKind,
      sub: document.getElementById('pc-day-sub').textContent,
      main: document.getElementById('btn-picnic-main').textContent,
      mainDisabled: document.getElementById('btn-picnic-main').disabled,
      foodChips: Array.from(document.querySelectorAll('#pc-food-row .pc-food-chip')).map((c) => c.dataset.foodId),
      spotChips: Array.from(document.querySelectorAll('#pc-spot-row .pc-spot-chip')).map((c) => c.dataset.spotId),
      chipImgsLoaded: Array.from(document.querySelectorAll('#pc-food-row img, #pc-spot-row img')).every((im) => im.complete && im.naturalWidth > 0)
    }));
    assert.equal(pDom.kind, 'weekday');
    assert(pDom.sub.includes('离周末还有 5 天'), `Weekday sub line: ${pDom.sub}`);
    assert.deepEqual([pDom.main, pDom.mainDisabled], ['还差点心、地点', true], `Empty draft: ${JSON.stringify(pDom)}`);
    assert.deepEqual(pDom.foodChips, ['sandwich', 'onigiri', 'macaron', 'souffle', 'pudding', 'oolong']);
    assert.deepEqual(pDom.spotChips, ['sakura_lawn', 'lakeside_willow', 'ginkgo_hill']);
    assert.equal(pDom.chipImgsLoaded, true, 'Food / spot chip art loads');
    for (const f of ['sandwich', 'macaron', 'oolong']) {
      await page.click(`#pc-food-row [data-food-id="${f}"]`);
      await page.waitForTimeout(60);
    }
    await page.click('#pc-food-row [data-food-id="souffle"]');
    await page.waitForTimeout(60);
    let run = await dbg(page, 'getPicnicRun');
    assert.deepEqual(run.foods, ['sandwich', 'macaron', 'oolong'], 'At most 3 foods fit in the basket');
    await page.click('#pc-spot-row [data-spot-id="sakura_lawn"]');
    await page.waitForTimeout(80);
    run = await dbg(page, 'getPicnicRun');
    assert.equal(run.spotId, 'sakura_lawn');
    const weekdayStart = await dbg(page, 'start');
    assert.deepEqual([weekdayStart.ok, weekdayStart.reason, weekdayStart.daysUntil], [false, 'weekday', 5], `Weekday start is a friendly no: ${JSON.stringify(weekdayStart)}`);
    assert((await getState(page)).emote.includes('周末'), 'She explains the picnic waits for the weekend');
    assert.equal(await page.locator('#btn-picnic-main').textContent(), '装进野餐篮 · 盖期待章');
    const xpBeforePack = (await getState(page)).xp;
    await page.click('#btn-picnic-main');
    await page.waitForTimeout(160);
    st = await getState(page, isoLocal(MON));
    assert.deepEqual(st.picnicBasket.prep.days, [keyOf(MON)], 'Monday packing stamps one anticipation day');
    assert.equal(st.picnicStats.anticipation, 1);
    assert.deepEqual(st.picnicBasket.plan.foods, ['sandwich', 'macaron', 'oolong']);
    assert.equal(st.picnicBasket.plan.spotId, 'sakura_lawn');
    assert.equal(st.journalSummary.picnicPreps7d, 1, 'Weekly journal records the basket prep');
    assert(st.xp > xpBeforePack || st.level > 1, 'Packing together grants a little affection');
    assert.equal(st.picnicVisual.packed, true, 'The packed basket waits on the desk');
    assert(st.ar13Audio.picnicPackCount >= 4, `Packing plays the wicker latch: ${JSON.stringify(st.ar13Audio)}`);
    assert(st.picnicMain.label.startsWith('篮子装好啦'), `Packed today: ${st.picnicMain.label}`);
    assert.equal(st.picnicMain.disabled, true);
    // 同一天换点心再装一次：更新篮子，但不重复盖章
    await page.click('#pc-food-row [data-food-id="macaron"]');
    await page.waitForTimeout(60);
    await page.click('#pc-food-row [data-food-id="souffle"]');
    await page.waitForTimeout(60);
    assert.equal(await page.locator('#btn-picnic-main').textContent(), '装进野餐篮');
    await page.click('#btn-picnic-main');
    await page.waitForTimeout(140);
    st = await getState(page);
    assert.deepEqual(st.picnicBasket.plan.foods, ['sandwich', 'oolong', 'souffle']);
    assert.equal(st.picnicBasket.prep.days.length, 1, 'Re-packing the same day does not add a second stamp');
    assert.equal(await page.evaluate(() => document.querySelectorAll('#pc-prep-stamps .pc-prep-dot.filled').length), 1);
    await page.waitForTimeout(250);
    await shot(page, 'desktop_1440x900_picnic_weekday.png');
    // 场景：装好的野餐篮立在书桌左侧，点它打开野餐卡
    await page.click('#btn-picnic-close');
    await page.waitForTimeout(500);
    await shot(page, 'desktop_1440x900_scene_basket.png');
    const basketL = await dbg(page, 'getLayouts');
    await page.mouse.click(basketL.basket.hit.x, basketL.basket.hit.y);
    await page.waitForTimeout(160);
    assert.deepEqual(await openPanelNames(page), ['picnicBasket'], 'Tapping the desk basket opens the picnic card');
    // 周二 ~ 周五每天装一次：期待章攒满 5 枚，再装也不会超出
    for (const d of [TUE, WED, THU, FRI]) {
      await dbg(page, 'setClock', d.getTime());
      const r = await dbg(page, 'pack');
      assert.equal(r.stamped, true, `${keyOf(d)} packing stamps a day`);
    }
    const extraPack = await dbg(page, 'pack');
    assert.equal(extraPack.stamped, false);
    st = await getState(page);
    assert.equal(st.picnicStats.prepDays, 5, 'Five weekdays = five anticipation stamps');
    assert.equal(st.picnicStats.anticipation, 5);
    assert.equal(st.picnicStats.daysUntil, 1, 'Friday is one day before the weekend');
    assert.equal(await page.evaluate(() => document.querySelectorAll('#pc-prep-stamps .pc-prep-dot.filled').length), 5);

    // 4. 周六：真实点按出发 → 野餐垫上分享三样点心 → 野餐完成（心情 + 幸存者班次佑护）
    await dbg(page, 'setClock', SAT.getTime());
    await ensureCardOpen(page, 'picnic-basket-card', '#btn-picnic-basket');
    pDom = await page.evaluate(() => ({
      kind: document.getElementById('pc-day-row').dataset.dayKind,
      badge: !document.getElementById('picnic-weekend-badge').classList.contains('hidden'),
      dock: document.getElementById('btn-picnic-basket').classList.contains('has-weekend'),
      pill: !document.getElementById('picnic-diary-pill').classList.contains('hidden'),
      pillTag: document.getElementById('pd-pill-picnic').textContent,
      main: document.getElementById('btn-picnic-main').textContent,
      sakuraWard: document.querySelector('#pc-spot-row [data-spot-id="sakura_lawn"] .pc-spot-ward').textContent
    }));
    assert.deepEqual(
      pDom,
      { kind: 'weekend', badge: true, dock: true, pill: true, pillTag: '周末', main: '铺开野餐垫 · 出发', sakuraWard: '金币+10%' },
      `Weekend invite HUD: ${JSON.stringify(pDom)}`
    );
    await page.click('#btn-picnic-main');
    await page.waitForTimeout(200);
    st = await getState(page);
    assert.equal(st.picnicRun.phase, 'outing');
    assert.equal(st.picnicRun.outingAntic, 5, 'The five weekday stamps carry into the outing');
    assert.equal(st.picnicVisual.outing, true, 'The blanket is spread at her feet');
    assert(st.ar13Audio.picnicSpreadCount >= 1, 'Spreading the blanket rustles');
    const slotsDom = await page.evaluate(() =>
      Array.from(document.querySelectorAll('#pc-blanket .pc-food-slot')).map((s) => ({
        shown: !s.classList.contains('hidden'),
        ready: s.classList.contains('is-ready'),
        loaded: s.querySelector('img').naturalWidth > 0
      }))
    );
    assert.deepEqual(slotsDom, [0, 1, 2].map(() => ({ shown: true, ready: true, loaded: true })), `Blanket slots: ${JSON.stringify(slotsDom)}`);
    const coinsBeforePicnic = st.coins;
    const xpBeforePicnic = st.xp;
    const levelBeforePicnic = st.level;
    const hungerBeforePicnic = st.hunger;
    await page.click('#pc-blanket [data-food-slot="0"]');
    await page.waitForTimeout(140);
    await dbg(page, 'placePlayerForTest', 0.5);
    await page.waitForTimeout(700);
    await shot(page, 'desktop_1440x900_picnic_outing.png');
    // 点场景野餐垫上的点心也能分享（卡片在右侧，不遮挡她脚边的野餐垫）
    const blanketL = await dbg(page, 'getLayouts');
    await page.mouse.click(blanketL.blanket.foods[1].x, blanketL.blanket.foods[1].y);
    await page.waitForTimeout(160);
    st = await getState(page);
    assert.deepEqual(st.picnicRun.shared, [true, true, false], `Card slot + scene tap share two foods, got ${JSON.stringify(st.picnicRun.shared)}`);
    assert((await page.locator('#btn-picnic-main').textContent()).startsWith('分享「'), 'Main button shares the last food');
    await page.click('#btn-picnic-main');
    await page.waitForTimeout(220);
    st = await getState(page, isoLocal(SAT));
    const res = st.picnicRun.lastResult;
    assert.equal(st.picnicRun.phase, 'plan', 'All three shared = picnic finished');
    assert.deepEqual([res.spotId, res.anticipation, res.isNewSpot], ['sakura_lawn', 5, true]);
    assert.equal(res.coinReward, 14 + 5 * 4 + 10, 'Coins: base 14 + 4 per stamp + 10 for a new spot');
    assert.equal(res.xpReward, 16 + 3 * 3 + 5 * 4, 'XP: base 16 + 3 per food + 4 per stamp');
    assert(st.coins >= coinsBeforePicnic + res.coinReward, 'Picnic coins arrive');
    assert(st.xp > xpBeforePicnic || st.level > levelBeforePicnic, 'Picnic affection XP arrives');
    assert(st.hunger >= Math.min(100, hungerBeforePicnic + 8 + 3 + 5) - 2, `Mood / fullness: ${hungerBeforePicnic} -> ${st.hunger}`);
    assert.equal(st.picnicBasket.wardCharges, 2, 'Two shifts of picnic good mood');
    assert.equal(st.picnicBasket.wardSpotId, 'sakura_lawn');
    assert.equal(st.picnicBasket.wardAntic, 5);
    assert.equal(st.picnicBasket.prep.used, true, 'Stamps are cashed in on the first weekend picnic');
    assert.equal(st.picnicBasket.plan, null, 'The basket is emptied');
    assert.deepEqual(st.picnicBasket.doneDates, [keyOf(SAT)]);
    assert.equal(st.picnicBasket.log.length, 1);
    assert.equal(st.journalSummary.picnics7d, 1, 'Weekly journal records the picnic');
    assert(st.ar13Audio.picnicShareCount >= 3 && st.ar13Audio.picnicFinishCount >= 1, `Picnic audio: ${JSON.stringify(st.ar13Audio)}`);
    assert.deepEqual([st.picnicMain.label, st.picnicMain.disabled], ['今天的野餐完成啦', true]);
    assert.equal((await dbg(page, 'start')).reason, 'done_today', 'One picnic per weekend day');
    const doneDom = await page.evaluate(() => ({
      phase: document.getElementById('pc-blanket').dataset.phase,
      badge: document.getElementById('picnic-weekend-badge').classList.contains('hidden'),
      goShift: !document.getElementById('btn-picnic-go-shift').classList.contains('hidden'),
      log: document.querySelectorAll('#pc-log-grid .pc-log-chip').length,
      logLoaded: Array.from(document.querySelectorAll('#pc-log-grid img')).every((im) => im.naturalWidth > 0),
      ward: document.getElementById('pc-ward-line').textContent
    }));
    assert.deepEqual(
      [doneDom.phase, doneDom.badge, doneDom.goShift, doneDom.log, doneDom.logLoaded],
      ['done', true, true, 1, true],
      `Done DOM: ${JSON.stringify(doneDom)}`
    );
    assert(doneDom.ward.includes('花见好运') && doneDom.ward.includes('2 个打工班次'), `Ward line: ${doneDom.ward}`);
    await page.waitForTimeout(250);
    await shot(page, 'desktop_1440x900_picnic_done.png');

    // 5. 幸存者：野餐好心情按班次生效（进入打工消耗 1 次，离开即结束）
    await page.click('#btn-picnic-go-shift');
    await page.waitForTimeout(280);
    st = await getState(page);
    assert.equal(st.gameMode, 'survivor');
    assert.deepEqual(st.shiftPicnic, { spotId: 'sakura_lawn', antic: 5, coinPct: 0.1, regen: 0, hastePct: 0 }, `Shift ward: ${JSON.stringify(st.shiftPicnic)}`);
    assert.equal(st.picnicBasket.wardCharges, 1, 'Entering a shift uses one charge');
    assert.equal(st.survivorMetrics.picnicCoinMult, 1.1, 'Sakura lawn: +10% shift coins with 5 stamps');
    assert.equal(st.survivorMetrics.picnicWard.active, true);
    assert(st.emote.includes('花见好运'), `She announces the picnic ward: ${st.emote}`);
    const stripHasPicnic = await page.evaluate(() => {
      const strip = document.getElementById('surv-skill-strip');
      return Boolean(strip && !strip.classList.contains('hidden') && strip.innerHTML.includes('ui_btn_picnic_basket.webp'));
    });
    assert(stripHasPicnic, 'Survivor skill strip must show the ui_btn_picnic_basket.webp badge');
    await page.waitForTimeout(250);
    await shot(page, 'desktop_1440x900_survivor_strip.png');
    await page.click('.mode-btn[data-mode="pet"]');
    await page.waitForTimeout(240);
    st = await getState(page);
    assert.equal(st.shiftPicnic, null, 'The ward ends when the shift ends');
    assert.equal(st.survivorMetrics.picnicCoinMult, 1);

    // 6. 周日再去一次：期待章已兑现（不再加成），她来搭配按季节挑地点
    await dbg(page, 'setClock', SUN.getTime());
    await ensureCardOpen(page, 'picnic-basket-card', '#btn-picnic-basket');
    await page.click('#btn-picnic-helper');
    await page.waitForTimeout(120);
    run = await dbg(page, 'getPicnicRun');
    const sunMonth = SUN.getMonth() + 1;
    const seasonSpot = sunMonth >= 3 && sunMonth <= 5 ? 'sakura_lawn' : sunMonth >= 6 && sunMonth <= 8 ? 'lakeside_willow' : 'ginkgo_hill';
    assert.deepEqual([run.foods, run.spotId], [['sandwich', 'onigiri', 'oolong'], seasonSpot], `Helper plan: ${JSON.stringify(run)}`);
    await page.click('#btn-picnic-main');
    await page.waitForTimeout(140);
    for (let i = 0; i < 3; i++) await dbg(page, 'share');
    st = await getState(page);
    const sunRes = st.picnicRun.lastResult;
    assert.equal(sunRes.anticipation, 0, 'Sunday picnic after Saturday: stamps already cashed in');
    assert.equal(sunRes.coinReward, 14 + (seasonSpot === 'sakura_lawn' ? 0 : 10));
    assert.equal(st.picnicBasket.wardCharges, 3, 'Charges stack (1 left + 2), capped at 4');
    assert.equal(st.picnicBasket.wardSpotId, seasonSpot);
    await page.click('.mode-btn[data-mode="survivor"]');
    await page.waitForTimeout(260);
    st = await getState(page);
    const expectWard = {
      sakura_lawn: { coinPct: 0.08, regen: 0, hastePct: 0 },
      lakeside_willow: { coinPct: 0, regen: 1, hastePct: 0 },
      ginkgo_hill: { coinPct: 0, regen: 0, hastePct: 0.06 }
    }[seasonSpot];
    assert.deepEqual(
      { coinPct: st.shiftPicnic.coinPct, regen: st.shiftPicnic.regen, hastePct: st.shiftPicnic.hastePct },
      expectWard,
      `Season spot ward: ${JSON.stringify(st.shiftPicnic)}`
    );
    if (seasonSpot === 'ginkgo_hill') assert(st.survivorMetrics.hasteMult >= 1.06 - 1e-6, `Haste includes the picnic: ${st.survivorMetrics.hasteMult}`);
    if (seasonSpot === 'lakeside_willow') assert(st.survivorMetrics.effectiveHpRegenPerSec >= 1, 'Regen includes the picnic');
    assert.equal(st.picnicBasket.wardCharges, 2);
    await page.click('.mode-btn[data-mode="pet"]');
    await page.waitForTimeout(220);
    // 下一个周一：新的一周，期待章从零开始
    await dbg(page, 'setClock', NEXT_MON.getTime());
    st = await getState(page);
    assert.deepEqual([st.picnicStats.isWeekend, st.picnicStats.prepDays, st.picnicStats.anticipation], [false, 0, 0], 'A new week starts with no stamps');

    // 7. 最近一个已过去的周末（七日周报窗口内）也去野餐一次
    await dbg(page, 'setClock', LAST_WEEKEND.getTime());
    if (!(await getState(page)).picnicStats.doneToday) {
      await dbg(page, 'helper');
      const sr = await dbg(page, 'start');
      assert.equal(sr.ok, true, `Last weekend picnic: ${JSON.stringify(sr)}`);
      for (let i = 0; i < 3; i++) await dbg(page, 'share');
    }

    // 8. 手写日记：她按每天真实的互动计数自动写一页，可翻页、贴贴纸
    await dbg(page, 'setClock', today.getTime());
    const k = (o) => keyOf(dayAt(today, o));
    // 注入的 4 天避开“最近周末野餐”那天，保证这几页只写注入的互动
    const lwOff = Math.round((dayAt(LAST_WEEKEND, 0, 12).getTime() - dayAt(today, 0, 12).getTime()) / 86400000);
    const [dA, dB, dC, dD] = [-2, -3, -4, -5, -6, -7, -8].filter((o) => o !== lwOff).slice(0, 4).map(k);
    await dbg(page, 'setJournalDayForTest', dA, { feeds: 3, chats: 2, kittens: 4, cards: 1, paints: 1, letters: 1, moodId: 'cozy' });
    await dbg(page, 'setJournalDayForTest', dB, { bentos: 1, puzzles: 1 });
    await dbg(page, 'setJournalDayForTest', dC, { snaps: 2 });
    await dbg(page, 'setJournalDayForTest', dD, { teas: 1 });
    // 今天真实发生的互动：窗台小猫来串门并被喂了一碗猫粮（AR-12 记入今日周报计数）
    await page.evaluate(() => {
      window.__AR12_DEBUG__.forceVisit('ginger');
      window.__AR12_DEBUG__.feed();
    });
    await page.waitForTimeout(1200);
    st = await getState(page);
    assert.equal(st.diaryStats.todayNew, true, 'She has something new to write today');
    let dyDom = await page.evaluate(() => ({
      badge: !document.getElementById('diary-new-badge').classList.contains('hidden'),
      dockNew: document.getElementById('btn-diary-book').classList.contains('has-new'),
      pill: !document.getElementById('picnic-diary-pill').classList.contains('hidden'),
      seg: !document.getElementById('pd-seg-diary').classList.contains('hidden'),
      tag: document.getElementById('pd-pill-diary').textContent
    }));
    assert.deepEqual(dyDom, { badge: true, dockNew: true, pill: true, seg: true, tag: '新' }, `Diary new HUD: ${JSON.stringify(dyDom)}`);
    await page.click('#btn-diary-book');
    await page.waitForTimeout(260);
    st = await getState(page);
    assert.deepEqual(await openPanelNames(page), ['diaryBook']);
    assert.equal(st.diaryRun.lastResult.wrote, true, 'Opening on new activity: she writes it down');
    assert(st.ar13Audio.diaryScribbleCount >= 1, 'Pencil scribble plays');
    assert.equal(st.isWritingDiary, true, 'She writes beside the desk');
    assert.equal(st.diaryStats.todayNew, false, 'Reading today\'s page clears the new mark');
    assert.equal(await page.evaluate(() => document.getElementById('diary-new-badge').classList.contains('hidden')), true);
    dyDom = await page.evaluate(() => ({
      date: document.getElementById('dy-page-date').textContent,
      lines: Array.from(document.querySelectorAll('#dy-page-lines .dy-line')).map((li) => li.textContent.trim()),
      art: document.getElementById('dy-page-art').naturalWidth > 0,
      lineIcos: Array.from(document.querySelectorAll('#dy-page-lines .dy-line-ico')).every((im) => im.naturalWidth > 0),
      no: document.getElementById('dy-page-no').textContent,
      nextDisabled: document.getElementById('btn-diary-next').disabled
    }));
    assert(dyDom.date.includes('今天'), `Today's page title: ${dyDom.date}`);
    assert(dyDom.lines.some((l) => l.includes('窗台的橘子来串门')), `Today's page mentions the visiting kitten: ${JSON.stringify(dyDom.lines)}`);
    assert(dyDom.art && dyDom.lineIcos, 'Diary art + line icons load');
    assert.equal(dyDom.nextDisabled, true, 'Today is the last page');
    await page.waitForTimeout(300);
    await shot(page, 'desktop_1440x900_diary_today.png');
    const pageKeys = await dbg(page, 'getPageKeys');
    assert(pageKeys.every((key) => key <= keyOf(today)), `Future days are never pages: ${JSON.stringify(pageKeys)}`);
    for (const dk of [dA, dB, dC, dD]) assert(pageKeys.includes(dk), `Day ${dk} with activity becomes a page`);
    assert(pageKeys.includes(keyOf(LAST_WEEKEND)), 'The last weekend picnic day is a page');
    // 翻页（真实点按）
    await page.click('#btn-diary-prev');
    await page.waitForTimeout(140);
    assert.equal((await dbg(page, 'getDiaryRun')).viewKey, pageKeys[pageKeys.length - 2], 'Prev flips one page back');
    assert((await getState(page)).ar13Audio.diaryFlipCount >= 1, 'Page flip rustles');
    await dbg(page, 'gotoPage', dA);
    await page.waitForTimeout(140);
    dyDom = await page.evaluate(() => ({
      lines: Array.from(document.querySelectorAll('#dy-page-lines .dy-line:not(.dy-line-extra):not(.dy-line-closing)')).map((li) => li.textContent.trim()),
      extra: document.querySelector('#dy-page-lines .dy-line-extra')?.textContent || '',
      closing: document.querySelector('#dy-page-lines .dy-line-closing')?.textContent || '',
      mood: document.getElementById('dy-page-mood').textContent,
      chips: Array.from(document.querySelectorAll('#dy-sticker-row .dy-sticker-chip')).map((c) => c.dataset.stickerId)
    }));
    assert.equal(dyDom.lines.length, 4, `A page holds 4 lines: ${JSON.stringify(dyDom.lines)}`);
    assert(dyDom.lines[0].includes('手作贺卡') && dyDom.lines[1].includes('窗台'), `AR-12 activities lead the page: ${JSON.stringify(dyDom.lines)}`);
    assert(dyDom.extra.includes('还有 2 件小事'), `Extra activities fold into the margin: ${dyDom.extra}`);
    assert(dyDom.closing.includes('暖乎乎') && !dyDom.closing.includes('待续'), `Cozy closing on a finished page: ${dyDom.closing}`);
    assert.equal(dyDom.mood, '心情 · 茶歇');
    assert(dyDom.chips.includes('kitten') && dyDom.chips.includes('card') && !dyDom.chips.includes('sandwich'), `Memory stickers follow that day's activities: ${JSON.stringify(dyDom.chips)}`);
    // 贴贴纸（真实点按）：第一次装饰这一页有小奖励
    const coinsBeforeSticker = (await getState(page)).coins;
    await page.click('#dy-sticker-row [data-sticker-id="kitten"]');
    await page.waitForTimeout(120);
    st = await getState(page);
    assert.deepEqual(st.diaryBook.decor[dA], ['kitten']);
    assert.deepEqual(st.diaryRun.lastResult.reward, { coins: 6, xp: 5 }, 'First decoration of a page: +6 coins & affection');
    assert(st.coins >= coinsBeforeSticker + 6);
    assert.equal(st.diaryStats.rewardsToday, 1);
    await page.click('#dy-sticker-row [data-sticker-id="lace"]');
    await page.waitForTimeout(80);
    await page.click('#dy-sticker-row [data-sticker-id="heart"]');
    await page.waitForTimeout(80);
    assert.equal((await dbg(page, 'toggleSticker', 'daisy')).reason, 'stickers_full', 'At most 3 stickers per page');
    const stickerDom = await page.evaluate(() =>
      [0, 1, 2].map((i) => {
        const el = document.getElementById(`dy-ps-${i}`);
        return { shown: !el.classList.contains('hidden'), id: el.dataset.stickerId, loaded: el.naturalWidth > 0 };
      })
    );
    assert.deepEqual(stickerDom.map((s) => [s.shown, s.id, s.loaded]), [[true, 'kitten', true], [true, 'lace', true], [true, 'heart', true]], `Stickers on the page: ${JSON.stringify(stickerDom)}`);
    await page.click('#dy-ps-1');
    await page.waitForTimeout(120);
    st = await getState(page);
    assert.deepEqual(st.diaryBook.decor[dA], ['kitten', 'heart'], 'Tapping a placed sticker peels it off');
    assert.equal(st.diaryStats.rewardsToday, 1, 'Re-decorating the same page gives no second reward');
    assert(st.ar13Audio.diaryStickerCount >= 3);
    await page.waitForTimeout(250);
    await shot(page, 'desktop_1440x900_diary_past.png');
    // 每天最多奖励 3 页
    await dbg(page, 'gotoPage', keyOf(today));
    assert.ok((await dbg(page, 'toggleSticker', 'diary')).reward, 'Today\'s page: reward #2');
    await dbg(page, 'gotoPage', dB);
    assert.ok((await dbg(page, 'toggleSticker', 'whale')).reward, 'Third page: reward #3');
    await dbg(page, 'gotoPage', dC);
    const capped = await dbg(page, 'toggleSticker', 'lace');
    assert.equal(capped.ok, true);
    assert.equal(capped.reward, null, 'The 4th decorated page today is just for fun');
    assert.equal((await getState(page)).diaryStats.rewardsToday, 3);
    // 她来贴
    await dbg(page, 'gotoPage', dD);
    await page.click('#btn-diary-helper');
    await page.waitForTimeout(160);
    st = await getState(page);
    assert.equal(st.diaryBook.decor[dD].length, 3, `Helper fills the page: ${JSON.stringify(st.diaryBook.decor[dD])}`);
    // 翻到今天
    await page.click('#btn-diary-today');
    await page.waitForTimeout(140);
    assert.equal((await dbg(page, 'getDiaryRun')).viewKey, keyOf(today), '"翻到今天" jumps back to today');
    // 空白的一页：还不能贴贴纸
    const FAR = dayAt(NEXT_MON, 30);
    await dbg(page, 'setClock', FAR.getTime());
    assert.equal((await dbg(page, 'gotoPage', keyOf(FAR))).ok, true);
    const emptyPage = await dbg(page, 'getPage');
    assert.equal(emptyPage.hasContent, false);
    assert.equal((await dbg(page, 'toggleSticker', 'lace')).reason, 'empty_page', 'A blank page waits for her first line');
    assert(emptyPage.closing.includes('还空着'), `Blank page invite: ${emptyPage.closing}`);
    await dbg(page, 'setClock', today.getTime());

    // 9. 七日心情周报联动：周报指标 + 点周报里的某一天直接翻到那天的日记
    await page.click('#btn-diary-journal');
    await page.waitForTimeout(220);
    assert.deepEqual(await openPanelNames(page), ['weeklyJournal'], '"看七日周报" opens the weekly journal');
    const journal = await page.evaluate(() => ({
      summary: window.__AR13_DEBUG__.getState().journalSummary,
      cardText: document.getElementById('weekly-journal-card')?.textContent || ''
    }));
    assert(journal.summary.picnics7d >= 1, `Last weekend picnic counts in the 7-day report: ${journal.summary.picnics7d}`);
    assert(journal.summary.diaries7d >= 6, `Diary decorations count: ${journal.summary.diaries7d}`);
    assert(journal.summary.cumulative.diaryPages >= 5, `Diary pages: ${journal.summary.cumulative.diaryPages}`);
    assert(journal.summary.cumulative.totalPicnics >= 3);
    assert(
      journal.cardText.includes('周末野餐与日记') &&
        journal.cardText.includes(`野餐 ${journal.summary.picnics7d} 次`) &&
        journal.cardText.includes(`日记 ${journal.summary.cumulative.diaryPages}页`) &&
        journal.cardText.includes('热可可') &&
        journal.cardText.includes('窗台小猫与贺卡'),
      `Weekly journal card must render the picnic / diary metrics (and keep cocoa / kitten), got ${journal.cardText}`
    );
    await page.waitForTimeout(200);
    await shot(page, 'desktop_1440x900_journal.png');
    await page.click(`#journal-7day-strip [data-date="${dA}"]`);
    await page.waitForTimeout(220);
    assert.deepEqual(await openPanelNames(page), ['diaryBook'], 'Tapping a weekly day opens the diary');
    assert.equal((await dbg(page, 'getDiaryRun')).viewKey, dA, 'The diary opens on that day');

    // 10. 刷新后持久化（运行时时钟回到真实时间）
    const beforeReload = await getState(page);
    assert.equal(beforeReload.picnicBasket.wardCharges, 4, 'Sunday ward (2 left) + last-weekend picnic (+2) = 4');
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(450);
    const reloaded = await getState(page);
    assert(reloaded.picnicBasket.totalPicnics >= 3 && reloaded.picnicBasket.log.length >= 3, `Picnic log persists: ${JSON.stringify(reloaded.picnicBasket.log)}`);
    assert.equal(reloaded.picnicBasket.wardCharges, beforeReload.picnicBasket.wardCharges, 'Ward charges persist');
    assert.equal(reloaded.picnicBasket.wardSpotId, beforeReload.picnicBasket.wardSpotId);
    assert(reloaded.picnicBasket.totalPreps >= 5);
    assert.deepEqual(reloaded.diaryBook.decor[dA], ['kitten', 'heart'], 'Diary stickers persist');
    assert.equal(Object.keys(reloaded.diaryBook.rewarded).length, 3);
    assert(reloaded.diaryBook.totalStickers >= 8);
    assert.equal(reloaded.picnicRun.phase, 'plan', 'Outing state is runtime only');

    // 11. 桌面 1440x900：25 键单排，摇杆 / 跳跃键两侧留白 >= 10px
    const deskDock = await dockAudit(page);
    assert.equal(deskDock.count, CARE_BTN_COUNT);
    assert.equal(deskDock.rows, 1, '1440x900 keeps one dock row');
    assert.equal(deskDock.overlap, 0, `Dock keys overlap: ${JSON.stringify(deskDock)}`);
    assert(deskDock.joyMargin >= MIN_DOCK_MARGIN && deskDock.jumpMargin >= MIN_DOCK_MARGIN, `1440x900 dock margins: ${JSON.stringify(deskDock)}`);
    assert(deskDock.minKey >= 36 && deskDock.newKeysVisible, `1440x900 keys stay roomy: ${JSON.stringify(deskDock)}`);
    assert.equal(await page.evaluate(() => !document.getElementById('picnic-diary-pill').classList.contains('hidden')), true, 'Desktop shows the AR-13 pill (ward / decorated pages)');

    const landscapeAudit = (cardId) =>
      page.evaluate((id) => {
        const prof = document.querySelector('.hud-profile-card').getBoundingClientRect();
        const sw = document.getElementById('mode-switcher').getBoundingClientRect();
        const hr = document.querySelector('.hud-right').getBoundingClientRect();
        const joy = document.getElementById('joystick-zone').getBoundingClientRect();
        const care = document.getElementById('pet-care-bar').getBoundingClientRect();
        const act = document.querySelector('.action-zone').getBoundingClientRect();
        const card = document.getElementById(id).getBoundingClientRect();
        const pills = Array.from(document.querySelectorAll('#hud-ambience-row > button')).filter((b) => !b.classList.contains('hidden') && b.offsetParent !== null);
        return {
          overflowX: document.documentElement.scrollWidth - window.innerWidth,
          overflowY: document.documentElement.scrollHeight - window.innerHeight,
          cardOpen: !document.getElementById(id).classList.contains('hidden'),
          scrollable: document.getElementById(id).scrollHeight - document.getElementById(id).clientHeight,
          profileRight: prof.right,
          cardLeft: card.left,
          cardRight: card.right,
          cardTop: card.top,
          cardBottom: card.bottom,
          careTop: care.top,
          careLeft: care.left,
          careRight: care.right,
          actTop: act.top,
          switcherRight: sw.right,
          hudRightLeft: hr.left,
          hudRightBottom: hr.bottom,
          joyTop: joy.top,
          pillBottom: pills.reduce((m, b) => Math.max(m, b.getBoundingClientRect().bottom), 0),
          hasEmoji: /\p{Extended_Pictographic}/u.test(document.body.innerText || '')
        };
      }, cardId);

    // 12. 中等桌面：1280x720 单排、1024x768 / 921x600 两排，都不挤压摇杆 / 跳跃键；卡片不压船坞
    await dbg(page, 'setClock', SAT2.getTime());
    for (const [w, h, rowsExpected] of [
      [1280, 720, 1],
      [1240, 700, 1],
      [1024, 768, 2],
      [921, 600, 2]
    ]) {
      await page.setViewportSize({ width: w, height: h });
      await page.waitForTimeout(260);
      const md = await dockAudit(page);
      assert(
        md.overlap === 0 && md.rows === rowsExpected && md.joyMargin >= MIN_DOCK_MARGIN && md.jumpMargin >= MIN_DOCK_MARGIN && md.newKeysVisible,
        `${w}x${h} dock: ${JSON.stringify(md)}`
      );
      for (const [cardId, btn] of [
        ['picnic-basket-card', '#btn-picnic-basket'],
        ['diary-book-card', '#btn-diary-book']
      ]) {
        await ensureCardOpen(page, cardId, btn);
        const la = await landscapeAudit(cardId);
        const hOverlap = Math.min(la.cardRight, la.careRight) - Math.max(la.cardLeft, la.careLeft) > 0;
        assert(la.cardOpen && la.overflowX <= 0 && la.overflowY <= 0, `${w}x${h} ${cardId}: ${JSON.stringify(la)}`);
        assert(!hOverlap || la.cardBottom <= la.careTop + 1, `${cardId} overlaps the dock on ${w}x${h}: ${JSON.stringify(la)}`);
        assert(la.cardTop >= la.hudRightBottom - 1, `${cardId} overlaps the toolbar on ${w}x${h}: ${JSON.stringify(la)}`);
        if (w === 1280 && cardId === 'picnic-basket-card') {
          await page.waitForTimeout(250);
          await shot(page, 'desktop_1280x720_picnic.png');
        }
      }
      await ensureCardClosed(page, 'diary-book-card', '#btn-diary-close');
    }

    // 13. 移动端 390x844（竖屏强制横置，真实点按）：周末野餐 + 日记全流程
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(320);
    const portraitDock = await dockAudit(page);
    assert.equal(portraitDock.rotated, true, '390x844 uses the rotated landscape stage');
    assert.equal(portraitDock.count, CARE_BTN_COUNT);
    assert.equal(portraitDock.rows, 2, '390x844 groups the dock into two rows');
    assert.equal(portraitDock.overlap, 0, `390x844 dock keys overlap: ${JSON.stringify(portraitDock)}`);
    assert(portraitDock.joyMargin >= MIN_DOCK_MARGIN && portraitDock.jumpMargin >= MIN_DOCK_MARGIN, `390x844 dock margins: ${JSON.stringify(portraitDock)}`);
    assert(portraitDock.minKey >= 30, `Two-row keys stay tappable (>= 30px), got ${portraitDock.minKey}`);
    await page.click('#btn-picnic-basket');
    await page.waitForTimeout(220);
    assert.deepEqual(await openPanelNames(page), ['picnicBasket'], 'Real tap on the rotated dock opens the picnic card');
    await dbg(page, 'resetDraftForTest');
    await page.click('#pc-food-row [data-food-id="onigiri"]');
    await page.waitForTimeout(80);
    await page.click('#pc-food-row [data-food-id="pudding"]');
    await page.waitForTimeout(80);
    await page.click('#pc-spot-row [data-spot-id="lakeside_willow"]');
    await page.waitForTimeout(80);
    run = await dbg(page, 'getPicnicRun');
    assert.deepEqual([run.foods, run.spotId], [['onigiri', 'pudding'], 'lakeside_willow'], `Real taps build the plan on 390x844: ${JSON.stringify(run)}`);
    await page.click('#btn-picnic-main');
    await page.waitForTimeout(200);
    assert.equal((await dbg(page, 'getPicnicRun')).phase, 'outing', 'Real tap starts the picnic on 390x844');
    await page.waitForTimeout(250);
    await shot(page, 'mobile_390x844_picnic.png');
    await page.click('#pc-blanket [data-food-slot="0"]');
    await page.waitForTimeout(120);
    await page.click('#pc-blanket [data-food-slot="1"]');
    await page.waitForTimeout(220);
    st = await getState(page);
    assert.equal(st.picnicRun.lastAction, 'finished', 'Two shared foods finish a two-food picnic');
    assert.equal(st.picnicBasket.wardSpotId, 'lakeside_willow');
    const portraitPicnic = await landscapeAudit('picnic-basket-card');
    assert(!portraitPicnic.hasEmoji && portraitPicnic.overflowX <= 0 && portraitPicnic.overflowY <= 0, `390x844 picnic card: ${JSON.stringify(portraitPicnic)}`);
    await page.click('#btn-diary-book');
    await page.waitForTimeout(240);
    assert.deepEqual(await openPanelNames(page), ['diaryBook'], 'Real tap opens the diary and closes the picnic card');
    assert((await page.locator('#dy-page-lines').textContent()).includes('野餐'), 'The picnic day page tells about the picnic');
    await page.click('#dy-sticker-row [data-sticker-id="sandwich"]');
    await page.waitForTimeout(120);
    assert.deepEqual((await getState(page)).diaryBook.decor[keyOf(SAT2)], ['sandwich'], 'Real tap places the picnic memory sticker on 390x844');
    await page.click('#btn-diary-prev');
    await page.waitForTimeout(140);
    assert.notEqual((await dbg(page, 'getDiaryRun')).viewKey, keyOf(SAT2), 'Real tap flips the page on 390x844');
    await page.click('#btn-diary-today');
    await page.waitForTimeout(160);
    await shot(page, 'mobile_390x844_diary.png');

    // 14. 844x390 横屏：两排船坞 / 两张卡片 / 顶部 HUD / 胶囊行 零重叠
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(320);
    const landDock = await dockAudit(page);
    assert.equal(landDock.rows, 2, '844x390 groups the dock into two rows');
    assert.equal(landDock.overlap, 0, `844x390 dock keys overlap: ${JSON.stringify(landDock)}`);
    assert(landDock.joyMargin >= MIN_DOCK_MARGIN && landDock.jumpMargin >= MIN_DOCK_MARGIN, `844x390 dock margins: ${JSON.stringify(landDock)}`);
    for (const [cardId, btn, shotName] of [
      ['diary-book-card', '#btn-diary-book', 'mobile_844x390_diary.png'],
      ['picnic-basket-card', '#btn-picnic-basket', 'mobile_844x390_picnic.png']
    ]) {
      await ensureCardOpen(page, cardId, btn);
      const la = await landscapeAudit(cardId);
      assert(la.cardOpen, `${cardId} must be open on 844x390`);
      assert(la.overflowX <= 0 && la.overflowY <= 0 && !la.hasEmoji, `844x390 overflow: ${JSON.stringify(la)}`);
      assert(la.profileRight <= la.cardLeft, `${cardId} overlaps profile on 844x390: ${JSON.stringify(la)}`);
      assert(la.cardBottom <= la.actTop + 2, `${cardId} overlaps action zone on 844x390: ${JSON.stringify(la)}`);
      assert(la.cardBottom <= la.careTop + 1, `${cardId} overlaps the two-row dock on 844x390: ${JSON.stringify(la)}`);
      assert(la.cardTop >= la.hudRightBottom - 1, `${cardId} overlaps the top-right toolbar: ${JSON.stringify(la)}`);
      assert(la.switcherRight <= la.hudRightLeft + 2, `Top HUD overlap on 844x390: ${JSON.stringify(la)}`);
      assert(la.pillBottom <= la.joyTop + 2, `HUD pills overlap joystick on 844x390: ${JSON.stringify(la)}`);
      assert(la.scrollable <= 1, `${cardId} content must fit without inner scrolling on 844x390: ${JSON.stringify(la)}`);
      await page.waitForTimeout(200);
      await shot(page, shotName);
    }
    // 其它所有浮层卡片在两排船坞下也不压住船坞
    const allCards = [
      ['#btn-pomodoro', 'pomodoro-card'],
      ['#btn-teatime', 'teatime-card'],
      ['#btn-weekly-journal', 'weekly-journal-card'],
      ['#btn-terrarium', 'terrarium-card'],
      ['#btn-musicbox', 'goodnight-musicbox-card'],
      ['#btn-collage-frame', 'collage-frame-card'],
      ['#btn-cozy-radio', 'cozy-radio-card'],
      ['#btn-crochet-basket', 'crochet-basket-card'],
      ['#btn-hot-cocoa', 'hot-cocoa-card'],
      ['#btn-pressed-flowers', 'pressed-flower-card'],
      ['#btn-telescope', 'telescope-card'],
      ['#btn-watercolor-easel', 'watercolor-card'],
      ['#btn-mailbox', 'mailbox-card'],
      ['#btn-bento-kitchen', 'bento-kitchen-card'],
      ['#btn-memory-puzzle', 'memory-puzzle-card'],
      ['#btn-kitten-corner', 'kitten-corner-card'],
      ['#btn-greeting-card', 'greeting-craft-card']
    ];
    const cardClash = [];
    for (const [btn, id] of allCards) {
      await page.click(btn);
      await page.waitForTimeout(160);
      const a = await landscapeAudit(id);
      const hOverlap = Math.min(a.cardRight, a.careRight) - Math.max(a.cardLeft, a.careLeft) > 0;
      if (a.cardOpen && hOverlap && a.cardBottom > a.careTop + 1) cardClash.push(`${id}:${Math.round(a.cardBottom)}>${Math.round(a.careTop)}`);
      await page.click(btn);
      await page.waitForTimeout(120);
    }
    assert.deepEqual(cardClash, [], `Overlay cards must stay above the two-row dock on 844x390: ${cardClash.join(', ')}`);
    await page.click('#btn-shop');
    await page.waitForTimeout(260);
    const drawerAudit = await page.evaluate(() => {
      const d = document.getElementById('pet-drawer').getBoundingClientRect();
      const care = document.getElementById('pet-care-bar').getBoundingClientRect();
      return { drawerBottom: d.bottom, careTop: care.top };
    });
    assert(drawerAudit.drawerBottom <= drawerAudit.careTop + 1, `Drawer overlaps the two-row dock: ${JSON.stringify(drawerAudit)}`);
    await page.click('#btn-shop');
    await page.waitForTimeout(200);

    // 窄屏胶囊：AR-11 / AR-12 / AR-13 三颗合并胶囊放得下才显示（与已有胶囊同一行），绝不新开一行
    await page.waitForTimeout(700);
    const pillRowAudit = () =>
      page.evaluate(() => {
        const visible = (b) => !b.classList.contains('hidden') && b.offsetParent !== null;
        const ids = ['kitchen-memory-pill', 'sill-card-pill', 'picnic-diary-pill'];
        const merged = ids.map((id) => document.getElementById(id));
        const rows = (exclude) => {
          const tops = Array.from(document.querySelectorAll('#hud-ambience-row > button'))
            .filter((b) => visible(b) && !exclude.includes(b))
            .map((b) => b.offsetTop + b.offsetHeight / 2)
            .sort((a, b) => a - b);
          let count = 0;
          let last = -Infinity;
          for (const t of tops) {
            if (t - last > 6) count += 1;
            last = t;
          }
          return count;
        };
        const mid = (b) => b.offsetTop + b.offsetHeight / 2;
        const res = {};
        for (const pill of merged) {
          const others = Array.from(document.querySelectorAll('#hud-ambience-row > button')).filter((b) => !merged.includes(b) && visible(b));
          res[pill.id] = { shown: visible(pill), sharesRow: visible(pill) ? others.some((b) => Math.abs(mid(b) - mid(pill)) <= 6) : true };
        }
        res.withPills = rows([]);
        res.withoutPills = rows(merged);
        res.solo = document.getElementById('picnic-diary-pill').classList.contains('pd-solo');
        res.layout = Array.from(document.querySelectorAll('#hud-ambience-row > button')).filter(visible).map((b) => `${b.id}@${b.offsetTop}`);
        return res;
      });
    const narrowPill = await pillRowAudit();
    assert(
      narrowPill['picnic-diary-pill'].sharesRow &&
        narrowPill['sill-card-pill'].sharesRow &&
        narrowPill['kitchen-memory-pill'].sharesRow &&
        narrowPill.withPills === narrowPill.withoutPills,
      `AR-11 / AR-12 / AR-13 pills must not add a HUD pill row on 844x390: ${JSON.stringify(narrowPill)}`
    );
    await page.waitForTimeout(500);
    await shot(page, 'mobile_844x390_scene.png');
    // 极端情况：胶囊行塞满时，AR-13 胶囊先只留优先段，仍放不下就自动收起而不是换行
    const crowded = await page.evaluate(async () => {
      const ids = ['pomodoro-mini-pill', 'teatime-buff-pill', 'terrarium-blessing-pill', 'musicbox-mini-pill'];
      const prev = ids.map((id) => document.getElementById(id)?.classList.contains('hidden'));
      ids.forEach((id) => document.getElementById(id)?.classList.remove('hidden'));
      await new Promise((r) => setTimeout(r, 800));
      const pill = document.getElementById('picnic-diary-pill');
      const visible = (b) => !b.classList.contains('hidden') && b.offsetParent !== null;
      const others = Array.from(document.querySelectorAll('#hud-ambience-row > button')).filter((b) => b !== pill && visible(b));
      const res = {
        shown: visible(pill),
        sharesRow: visible(pill)
          ? others.some((b) => Math.abs(b.offsetTop + b.offsetHeight / 2 - (pill.offsetTop + pill.offsetHeight / 2)) <= 6)
          : true
      };
      ids.forEach((id, i) => {
        if (prev[i]) document.getElementById(id)?.classList.add('hidden');
      });
      return res;
    });
    assert(crowded.sharesRow, `With a crowded pill row the AR-13 pill must fold away instead of wrapping: ${JSON.stringify(crowded)}`);
    await page.waitForTimeout(700);

    // 15. 旧存档 / 脏数据安全默认值
    await page.setViewportSize({ width: 1440, height: 900 });
    await dbg(page, 'useRealClock');
    await page.evaluate((key) => {
      const raw = JSON.parse(localStorage.getItem(key) || '{}');
      delete raw.picnicBasket;
      delete raw.diaryBook;
      if (raw.weeklyJournal && raw.weeklyJournal.cumulative) {
        delete raw.weeklyJournal.cumulative.totalPicnics;
        delete raw.weeklyJournal.cumulative.totalPicnicPreps;
        delete raw.weeklyJournal.cumulative.totalDiaryStickers;
      }
      localStorage.setItem(key, JSON.stringify(raw));
    }, SAVE_KEY);
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(350);
    const legacy = await getState(page);
    assert.equal(legacy.picnicBasket.plan, null, 'Legacy save: empty basket');
    assert.deepEqual(legacy.picnicBasket.log, []);
    assert.equal(legacy.picnicBasket.wardCharges, 0);
    assert.deepEqual(legacy.picnicBasket.prep, { weekendKey: '', days: [], used: false });
    assert.deepEqual(legacy.diaryBook.decor, {});
    assert.equal(legacy.diaryBook.totalStickers, 0);
    assert(legacy.journalSummary.picnics7d >= 1 && legacy.journalSummary.diaries7d >= 6, 'Journal history survives legacy migration');
    assert(legacy.diaryStats.written >= 5, 'Diary pages are rebuilt from the weekly journal history');

    await page.evaluate((key) => {
      const raw = JSON.parse(localStorage.getItem(key) || '{}');
      raw.picnicBasket = {
        plan: { foods: ['sandwich', 'sandwich', 'caviar'], spotId: 'moon' },
        prep: { weekendKey: 'soon', days: ['x', 5], used: 'yes' },
        log: [
          { id: 'p3', date: '2025-06-14', spotId: 'sakura_lawn', foods: ['sandwich', 'bogus', 'oolong', 'souffle', 'pudding'], antic: 99 },
          { id: 'p3', date: '2025-06-15', spotId: 'ginkgo_hill', foods: ['onigiri'], antic: -2 },
          { id: 'evil', date: 'never', spotId: 'sakura_lawn', foods: ['sandwich'] },
          { spotId: 'volcano', foods: ['sandwich'], date: '2025-06-15' },
          null,
          'p9'
        ],
        seq: -4,
        doneDates: ['2025-06-14', 'x', 7],
        spotsVisited: { sakura_lawn: 'lots', moon: 3 },
        foodsTried: { caviar: 9 },
        wardCharges: 99,
        wardSpotId: 'moon',
        wardAntic: 50,
        totalPicnics: 'many',
        totalPreps: -3
      };
      raw.diaryBook = {
        decor: { '2026-11-15': ['lace', 'lace', 'bogus', 'heart', 'kitten', 'card'], nope: ['lace'], '2026-11-14': [] },
        rewarded: { '2026-11-15': true, '<b>': true },
        seen: { dateKey: 'x', total: 99 },
        rewardDate: 'never',
        rewardCount: 50,
        totalStickers: 'many'
      };
      if (raw.weeklyJournal && raw.weeklyJournal.days) {
        const first = Object.keys(raw.weeklyJournal.days)[0];
        if (first) Object.assign(raw.weeklyJournal.days[first], { picnics: 'x', picnicPreps: -5, diaries: 1e9 });
      }
      localStorage.setItem(key, JSON.stringify(raw));
    }, SAVE_KEY);
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(350);
    const dirty = await getState(page);
    const dp = dirty.picnicBasket;
    assert.equal(dp.plan, null, 'A plan with < 2 valid foods / unknown spot is dropped');
    assert.deepEqual(dp.prep, { weekendKey: '', days: [], used: false }, 'Junk anticipation stamps are dropped');
    assert.deepEqual(dp.log.map((e) => [e.date, e.spotId, e.foods, e.antic]), [
      ['2025-06-14', 'sakura_lawn', ['sandwich', 'oolong', 'souffle'], 5],
      ['2025-06-15', 'ginkgo_hill', ['onigiri'], 0]
    ], `Log keeps valid entries only: ${JSON.stringify(dp.log)}`);
    assert.notEqual(dp.log[0].id, dp.log[1].id, 'Duplicate picnic ids are re-numbered');
    assert(dp.seq >= 4, 'Picnic id sequence never collides');
    assert.deepEqual(dp.doneDates, ['2025-06-14', '2025-06-15']);
    assert.deepEqual(dp.spotsVisited, { sakura_lawn: 1, ginkgo_hill: 1 }, `Visited spots: ${JSON.stringify(dp.spotsVisited)}`);
    assert.deepEqual(Object.keys(dp.foodsTried).sort(), ['onigiri', 'oolong', 'sandwich', 'souffle']);
    assert.equal(dp.wardSpotId, 'ginkgo_hill', 'Unknown ward spot falls back to the latest picnic');
    assert.equal(dp.wardCharges, 4, 'Ward charges are capped at 4');
    assert.equal(dp.wardAntic, 5);
    assert.equal(dp.totalPicnics, 2);
    assert.equal(dp.totalPreps, 0);
    const dd = dirty.diaryBook;
    assert.deepEqual(dd.decor, { '2026-11-15': ['lace', 'heart', 'kitten'] }, `Diary decor sanitized: ${JSON.stringify(dd.decor)}`);
    assert.deepEqual(dd.rewarded, { '2026-11-15': true });
    assert.deepEqual(dd.seen, { dateKey: '', total: 0 });
    assert.equal(dd.rewardCount, 0);
    assert.equal(dd.totalStickers, 3);
    const dirtyDay = Object.values(dirty.journalSummary.daysList).length;
    assert(dirtyDay === 7, 'Journal still renders 7 days');
    // 脏数据下依旧可正常打开两张卡并继续游玩
    await page.click('#btn-picnic-basket');
    await page.waitForTimeout(160);
    assert.equal(await page.locator('#pc-summary-pill').textContent(), '野餐 2 次 · 地点 2/3');
    assert.equal((await dbg(page, 'helper')).ok, true);
    const dirtyMain = await dbg(page, 'main');
    assert.equal(dirtyMain.ok, true, `Packing / starting works after a dirty save: ${JSON.stringify(dirtyMain)}`);
    await page.click('#btn-diary-book');
    await page.waitForTimeout(180);
    assert.deepEqual(await openPanelNames(page), ['diaryBook']);
    await page.waitForTimeout(200);
    await shot(page, 'desktop_1440x900_diary_dirty_save.png');

    assert.equal(consoleErrors.length, 0, `Console errors observed: ${consoleErrors.join('; ')}`);
    assert.equal(pageErrors.length, 0, `Page errors observed: ${pageErrors.join('; ')}`);
    assert.equal(failedResponses.length, 0, `HTTP >= 400 responses observed: ${failedResponses.join('; ')}`);

    console.log(
      '[E2E PASS] AR-13 Cream-Journal Weekend Picnic Basket (local weekday/weekend with injectable clock, weekday basket packing with up to 5 anticipation stamps instead of a hard lock, weekend outing: 6 foods x 3 spots, share foods on the card blanket / scene blanket / main button, mood + coins + affection, Survivor picnic ward per spot: coins / regen / haste for the next 2 shifts, stacking to 4) + DeepSeek-chan Handwritten Diary (auto-written daily pages from the weekly-journal counters incl. AR-9..AR-13 activities, 4 lines + margin note + mood closing, page flips, 3 stickers per page with day-specific memory stickers, 3 rewarded pages per day, weekly report metrics + day-cell jump) passed across 1440x900, 1280x720, 1240x700, 1024x768, 921x600, 390x844 (rotated, real taps) and 844x390 with a 25-key dock (1 row >= 1240px, 2x12 + shop below; >= 10px from joystick / jump), merged pill without new rows, mutually exclusive overlays, safe legacy/dirty-save defaults and 0 errors!'
    );
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
    if (server) {
      await new Promise((res) => server.close(() => res()));
    }
  }
}

runStaticChecks();
await runPlaywrightSuite();
