import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { prepareArContext } from './_ar_entry_helper.mjs';
import { GAME_MODULES, readGameSource } from './_split_lib.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('C:/project/idle-games/node_modules/playwright');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const GAME_ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(GAME_ROOT, 'public');
const PORT = Number(process.env.AR12_PORT || 0);

// 可选：设置 AR12_SHOT_DIR 后输出 1440x900 / 390x844 / 844x390 自审截图
const SHOT_DIR = process.env.AR12_SHOT_DIR || '';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.json': 'application/json; charset=utf-8'
};

const REQUIRED_AR12_ASSETS = [
  'ui_btn_kitten_corner.webp',
  'ui_btn_greeting_card.webp',
  'kitten_ginger.webp',
  'kitten_tuxedo.webp',
  'cat_food_bowl.webp',
  'handmade_card.webp'
];

const CARE_BTN_COUNT = 23;
const SAVE_KEY = 'ar_deepseek_pet_v2';
const MIN_DOCK_MARGIN = 10;

async function shot(page, name) {
  if (!SHOT_DIR) return;
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(SHOT_DIR, name) });
}

function localMs(y, m, d, hh = 10, mm = 0) {
  return new Date(y, m - 1, d, hh, mm, 0, 0).getTime();
}

function runStaticChecks() {
  const jsFiles = ['audio.js', 'vision.js', 'sprites.js', 'game.js', ...GAME_MODULES];
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
  const gameContent = readGameSource(PUBLIC_DIR);
  const audioContent = fs.readFileSync(path.join(PUBLIC_DIR, 'audio.js'), 'utf8');
  // AR-13 起缓存号继续递增（hd28 / hd52），这里只要求不低于 AR-12 的 hd27 / hd51
  assert(/\.\/style\.css\?v=hd(?:2[7-9]|[3-9]\d)\b/.test(htmlContent), 'index.html must reference ./style.css?v=hd27+');
  assert(/\.\/game\.js\?v=hd(?:5[1-9]|[6-9]\d)\b/.test(htmlContent), 'index.html must reference ./game.js?v=hd51+');
  let htmlAr12Refs = 0;
  for (const reqAsset of REQUIRED_AR12_ASSETS) {
    if (new RegExp(`\\./assets/${reqAsset.replace('.', '\\.')}\\?v=hd(?:2[7-9]|[3-9]\\d)`).test(htmlContent)) htmlAr12Refs += 1;
    // 小礼服只在图鉴 / 来访时由 game.js 渲染，其余 5 张都直接写在 index.html 里
    assert(assetRefs.has(reqAsset), `Required AR-12 asset ${reqAsset} is not referenced in code`);
    assert(new RegExp(`${reqAsset.replace('.', '\\.')}\\?v=hd(?:2[7-9]|[3-9]\\d)`).test(spritesContent + gameContent), `${reqAsset} must be loaded with ?v=hd27+ in JS`);
  }
  assert(htmlAr12Refs >= 5, `index.html must reference >= 5 AR-12 images with ?v=hd27+, got ${htmlAr12Refs}`);
  for (const [name, content] of [
    ['index.html', htmlContent],
    ['style.css', cssContent],
    ['sprites.js', spritesContent],
    ['game.js', gameContent]
  ]) {
    assert(!/\?v=hd2[3-6]\b/.test(content), `Stale ?v=hd23..hd26 cache-buster left in public/${name}`);
  }
  assert(/\?v=hd(?:2[7-9]|[3-9]\d)\b/.test(cssContent), 'style.css must use ?v=hd27+ asset cache-busters');
  assert(/\?v=hd(?:2[7-9]|[3-9]\d)\b/.test(spritesContent), 'sprites.js must use ?v=hd27+ asset cache-busters');
  assert(/\.\/sprites\.js\?v=hd(?:2[7-9]|[3-9]\d)\b/.test(gameContent), 'game.js must import ./sprites.js?v=hd27+');
  assert(/\.\/audio\.js\?v=hd(?:2[7-9]|[3-9]\d)\b/.test(gameContent), 'game.js must import ./audio.js?v=hd27+');
  assert(/\.\/vision\.js\?v=hd(?:2[7-9]|[3-9]\d)\b/.test(gameContent), 'game.js must import ./vision.js?v=hd27+');
  for (const fn of ['getWindowSillLayout', 'drawWindowsillVisitors', 'drawGreetingCardCraftProp']) {
    assert(new RegExp(`export function ${fn}`).test(spritesContent), `sprites.js must export ${fn}`);
  }
  for (const fn of ['playKittenMew', 'playKittenPurr', 'playKittenCrunch', 'playCardSnip', 'playCardSendChime', 'playKittenLuckChime', 'getAr12AudioInfo']) {
    assert(new RegExp(`\\n  ${fn}\\(`).test(audioContent), `audio.js must define ${fn}()`);
  }
  for (const asset of assetRefs) {
    const full = path.join(PUBLIC_DIR, 'assets', asset);
    assert(fs.existsSync(full), `Missing asset on disk: ${full}`);
    assert(fs.statSync(full).size > 0, `Empty asset on disk: ${full}`);
  }
  assert((htmlContent.match(/class="care-btn[\s"]/g) || []).length >= CARE_BTN_COUNT, `index.html must define >= ${CARE_BTN_COUNT} dock keys`);

  // AR-12 窗台小猫 / 贺卡场景只贴已提供的位图（柔光渐变 + 文字标签），不画任何矢量图形
  const vectorRe = /beginPath|lineTo|\barc\(|arcTo|bezierCurveTo|quadraticCurveTo|strokeRect|roundRect\(|\.stroke\(\)|\.fill\(\)/;
  const spriteStart = spritesContent.indexOf('// AR-12 窗台小猫');
  const spriteEnd = spritesContent.indexOf('export function roundRect');
  assert(spriteStart > 0 && spriteEnd > spriteStart, 'sprites.js must contain the AR-12 drawing section');
  assert(!vectorRe.test(spritesContent.slice(spriteStart, spriteEnd)), 'AR-12 canvas drawing must only draw the provided webp art');
  const gameStart = gameContent.indexOf('// ================= AR-12 窗台小猫访客喂食角 & 奶油手账节日手作贺卡');
  const gameEnd = gameContent.indexOf('// ================= AR 拍立得纪念合影系统');
  assert(gameStart > 0 && gameEnd > gameStart, 'game.js must contain the AR-12 section');
  const ar12Game = gameContent.slice(gameStart, gameEnd);
  assert(!vectorRe.test(ar12Game), 'AR-12 game section must not draw vector shapes');
  assert(!/getContext\(/.test(ar12Game), 'AR-12 UI must not create canvas-drawn icons');

  // 零暗黑赛博 / 霓虹：AR-12 样式段不得出现深色或霓虹色
  const cssStart = cssContent.indexOf('AR-12 窗台小猫访客喂食角 & 奶油手账节日手作贺卡');
  assert(cssStart > 0, 'style.css must contain the AR-12 section');
  assert(
    !/neon|#0{3,6}\b|#000\b|#111|#1[0-9a-f]{5}\b|#[2-4][0-9a-f]{5}\b|rgba?\(\s*(?:[0-5]?\d)\s*,\s*(?:[0-5]?\d)\s*,\s*(?:[0-9]?\d)\s*[,)]/i.test(
      cssContent.slice(cssStart)
    ),
    'AR-12 CSS must not contain near-black / neon colors'
  );

  console.log(
    `[STATIC PASS] ${jsFiles.length} JS modules syntax-checked, ${assetRefs.size} assets verified on disk (including all 6 AR-12 images), ?v=hd27+/hd51+ synced with 0 stale hd23-hd26, >= ${CARE_BTN_COUNT} dock keys, 0 inline <svg>, 0 Emoji, 0 vector shapes / canvas icons in AR-12 art, 0 dark/neon colors in AR-12 CSS.`
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
  return page.evaluate((d) => window.__AR12_DEBUG__.getState(d), iso);
}

async function dbg(page, fn, ...args) {
  return page.evaluate(([f, a]) => window.__AR12_DEBUG__[f](...a), [fn, args]);
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
    // 按键中心沿“船坞纵向”聚类（容差 8px，忽略按下 / 来访晃动的 2px 位移；竖跨两排的小铺不单独成排）
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
    return {
      rotated,
      count: btns.length,
      overlap,
      rows,
      joyMargin: along(care).start - along(joy).end,
      jumpMargin: along(act).start - along(care).end,
      jumpKeyMargin: along(jump).start - along(care).end,
      minKey: Math.min(...btns.map((b) => Math.min(b.width, b.height))),
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
    await prepareArContext(context);
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

    const loadStartedAt = Date.now();
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForTimeout(450);
    assert.equal(pageErrors.length, 0, `Page errors on load: ${pageErrors.join('; ')}`);
    assert.equal(consoleErrors.length, 0, `Console errors on load: ${consoleErrors.join('; ')}`);

    // 0. DOM Emoji / 奶油手账配色 / 6 张 AR-12 贴图加载审计
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
        img.src = `./assets/${file}?v=hd27`;
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
        kittenBg: getComputedStyle(document.getElementById('kitten-corner-card')).backgroundImage,
        cardBg: getComputedStyle(document.getElementById('greeting-craft-card')).backgroundImage,
        sillBg: getComputedStyle(document.getElementById('kc-sill')).backgroundImage,
        previewBg: getComputedStyle(document.getElementById('gc-preview')).backgroundColor,
        careBtnCount: document.querySelectorAll('#pet-care-bar .care-btn').length,
        spritesReady: ['kittenGinger', 'kittenTuxedo', 'catFoodBowl', 'handmadeCard'].length,
        overflowX: document.documentElement.scrollWidth - window.innerWidth,
        overflowY: document.documentElement.scrollHeight - window.innerHeight
      };
    }, REQUIRED_AR12_ASSETS);
    assert.equal(initialAudit.hasEmoji, false, 'Visible DOM must contain zero Emoji characters');
    assert.equal(initialAudit.brokenImgs.length, 0, `Broken ./assets/ images: ${initialAudit.brokenImgs.join(', ')}`);
    assert(initialAudit.domImgCount >= 10, `Expected >= 10 AR-12 <img> in DOM, got ${initialAudit.domImgCount}`);
    assert.equal(initialAudit.domLoaded, true, 'Every AR-12 <img> in DOM must load (naturalWidth > 0)');
    for (const [file, info] of Object.entries(initialAudit.loadReport)) {
      assert(info.w > 0 && info.h > 0, `AR-12 image ${file} must decode, got ${JSON.stringify(info)}`);
    }
    assert(initialAudit.careBtnCount >= CARE_BTN_COUNT, `Expected >= ${CARE_BTN_COUNT} dock buttons, got ${initialAudit.careBtnCount}`);
    assert(initialAudit.overflowX <= 0 && initialAudit.overflowY <= 0, `Desktop 1440x900 overflow: ${JSON.stringify(initialAudit)}`);
    assert(/255,\s*253,\s*248/.test(initialAudit.kittenBg), `#kitten-corner-card must use cream #FFFDF8, got ${initialAudit.kittenBg}`);
    assert(/255,\s*253,\s*248/.test(initialAudit.cardBg), `#greeting-craft-card must use cream #FFFDF8, got ${initialAudit.cardBg}`);
    const sillColors = Array.from(initialAudit.sillBg.matchAll(/rgba?\(([^)]+)\)/g)).map((m) => m[1].split(',').map((v) => Number(v.trim())));
    assert(sillColors.length >= 4, `Windowsill stage must use a layered cream gradient, got ${initialAudit.sillBg}`);
    for (const [r, g, b] of sillColors) assert(Math.min(r, g, b) >= 150, `Windowsill must stay cream/pastel, got rgb(${r},${g},${b})`);

    // 1. 新存档：两只小猫未相遇，首次来访按真实时钟排在 40~90 秒后；空收藏册；胶囊隐藏
    const fresh = await getState(page);
    assert.equal(fresh.kittenStats.met, 0, 'Fresh save has not met any kitten yet');
    assert.equal(fresh.kittenCorner.visit, null);
    const firstDelay = fresh.kittenCorner.nextVisitAt - loadStartedAt;
    assert(firstDelay >= 38000 && firstDelay <= 95000, `First visit must be scheduled 40~90s after a fresh load, got ${firstDelay}ms`);
    assert.deepEqual(fresh.greetingCards.album, [], 'Fresh save starts with an empty card album');
    assert.equal(fresh.cardBlessing.active, false);
    assert.equal(fresh.kittenWard.active, false);
    assert.equal(fresh.kittenVisual.active, false);
    const freshDom = await page.evaluate(() => ({
      pill: document.getElementById('sill-card-pill').classList.contains('hidden'),
      badge: document.getElementById('kitten-visit-badge').classList.contains('hidden')
    }));
    assert.equal(freshDom.badge, true, 'No visitor badge on a fresh save');

    // 2. 浮层互斥：打开任意一个只保留它自己（含 AR-10 / AR-11 / AR-12 六张卡）
    const panelTriggers = [
      { btn: '#btn-kitten-corner', key: 'kittenCorner' },
      { btn: '#btn-greeting-card', key: 'greetingCard' },
      { btn: '#btn-bento-kitchen', key: 'bentoKitchen' },
      { btn: '#btn-kitten-corner', key: 'kittenCorner' },
      { btn: '#btn-memory-puzzle', key: 'memoryPuzzle' },
      { btn: '#btn-greeting-card', key: 'greetingCard' },
      { btn: '#btn-watercolor-easel', key: 'watercolorEasel' },
      { btn: '#btn-kitten-corner', key: 'kittenCorner' },
      { btn: '#btn-mailbox', key: 'mailbox' },
      { btn: '#btn-greeting-card', key: 'greetingCard' },
      { btn: '#hud-ambience-pill', key: 'windowAmbience' },
      { btn: '#btn-kitten-corner', key: 'kittenCorner' },
      { btn: '#btn-pomodoro', key: 'pomodoro' },
      { btn: '#btn-greeting-card', key: 'greetingCard' },
      { btn: '#btn-teatime', key: 'teatime' },
      { btn: '#btn-kitten-corner', key: 'kittenCorner' },
      { btn: '#btn-weekly-journal', key: 'weeklyJournal' },
      { btn: '#btn-greeting-card', key: 'greetingCard' },
      { btn: '#btn-terrarium', key: 'terrarium' },
      { btn: '#btn-musicbox', key: 'goodnightMusicbox' },
      { btn: '#btn-kitten-corner', key: 'kittenCorner' },
      { btn: '#btn-collage-frame', key: 'collageFrame' },
      { btn: '#btn-cozy-radio', key: 'cozyRadio' },
      { btn: '#btn-greeting-card', key: 'greetingCard' },
      { btn: '#btn-crochet-basket', key: 'crochetBasket' },
      { btn: '#btn-hot-cocoa', key: 'hotCocoa' },
      { btn: '#btn-kitten-corner', key: 'kittenCorner' },
      { btn: '#btn-pressed-flowers', key: 'pressedFlowers' },
      { btn: '#btn-telescope', key: 'telescope' },
      { btn: '#btn-greeting-card', key: 'greetingCard' },
      { btn: '#btn-chat-topic', key: 'topic' },
      { btn: '#btn-kitten-corner', key: 'kittenCorner' },
      { btn: '#btn-shop', key: 'drawer' }
    ];
    for (const step of panelTriggers) {
      await page.click(step.btn);
      await page.waitForTimeout(110);
      const openNames = await openPanelNames(page);
      assert.deepEqual(openNames, [step.key], `Opening ${step.btn} must keep ONLY ${step.key} open, got: ${JSON.stringify(openNames)}`);
    }
    await page.click('[data-ar12-shortcut="kitten"]');
    await page.waitForTimeout(150);
    assert.deepEqual(await openPanelNames(page), ['kittenCorner'], 'Drawer kitten shortcut must open only #kitten-corner-card');
    await page.click('#btn-shop');
    await page.waitForTimeout(140);
    await page.click('[data-ar12-shortcut="card"]');
    await page.waitForTimeout(150);
    assert.deepEqual(await openPanelNames(page), ['greetingCard'], 'Drawer card shortcut must open only #greeting-craft-card');
    await page.click('#btn-greeting-card');
    await page.waitForTimeout(130);
    assert.deepEqual(await openPanelNames(page), [], 'Tapping the card dock button again must close the card');

    // 3. 窗台小猫：可注入时钟 + 随机种子 → 来访完全确定
    const today = new Date();
    const T0 = localMs(today.getFullYear(), today.getMonth() + 1, today.getDate(), 10, 0);
    const todayIso = new Date(T0).toISOString();
    await dbg(page, 'setSeed', 4242);
    await dbg(page, 'setClock', T0);
    await dbg(page, 'scheduleVisitIn', 30000);
    await dbg(page, 'advanceClock', 29000);
    let st = await getState(page, todayIso);
    assert.equal(st.kittenCorner.visit, null, 'No visitor before the scheduled time');
    await dbg(page, 'advanceClock', 2000);
    st = await getState(page, todayIso);
    assert(st.kittenCorner.visit, 'A kitten arrives once the injected clock reaches the schedule');
    assert.equal(st.kittenCorner.visit.kittenId, 'ginger', 'The very first visitor is always the ginger kitten');
    assert.equal(st.kittenCorner.visit.arrivedAt, T0 + 30000, 'Arrival time follows the injected clock');
    const firstStay = st.kittenCorner.visit.leavesAt - st.kittenCorner.visit.arrivedAt;
    assert(firstStay >= 150000 && firstStay <= 270000, `Stay must be 2.5~4.5 minutes, got ${firstStay}`);
    assert.equal(st.kittenStats.met, 1, 'Meeting the ginger kitten fills the codex 1/2');
    assert.equal(st.kittenCorner.visitsToday, 1);
    assert.equal(st.kittenVisual.active, true, 'The kitten sits on the scene windowsill');
    assert.equal(st.kittenVisual.spriteKey, 'kittenGinger');
    assert(st.ar12Audio.kittenMewCount >= 1, 'Arrival plays a soft mew');
    // 同一种子 → 同样的停留时长（确定性）
    await dbg(page, 'setSeed', 99);
    const forcedA = await dbg(page, 'forceVisit', 'ginger');
    await dbg(page, 'setSeed', 99);
    const forcedB = await dbg(page, 'forceVisit', 'ginger');
    assert.equal(
      forcedA.visit.leavesAt - forcedA.visit.arrivedAt,
      forcedB.visit.leavesAt - forcedB.visit.arrivedAt,
      'Same seed + same clock gives the same stay length'
    );
    const visitDom = await page.evaluate(() => ({
      badge: !document.getElementById('kitten-visit-badge').classList.contains('hidden'),
      dockVisitor: document.getElementById('btn-kitten-corner').classList.contains('has-visitor'),
      pill: !document.getElementById('sill-card-pill').classList.contains('hidden'),
      seg: !document.getElementById('sc-seg-kitten').classList.contains('hidden'),
      tag: document.getElementById('sc-pill-kitten').textContent
    }));
    assert.deepEqual(visitDom, { badge: true, dockVisitor: true, pill: true, seg: true, tag: '来访' }, `Visitor HUD: ${JSON.stringify(visitDom)}`);
    await page.waitForTimeout(900);
    await shot(page, 'desktop_1440x900_scene_kitten.png');

    // 喂食 / 摸摸：UI 真实点击
    await page.click('#btn-kitten-corner');
    await page.waitForTimeout(180);
    const beforeFeed = await getState(page, todayIso);
    const leavesBeforeFeed = beforeFeed.kittenCorner.visit.leavesAt;
    assert.equal(await page.evaluate(() => document.getElementById('btn-kitten-feed').disabled), false, 'Feed enabled while a kitten visits');
    assert.equal(await page.evaluate(() => !document.getElementById('kc-visitor-img').classList.contains('hidden')), true, 'Card sill shows the visitor');
    await page.click('#btn-kitten-feed');
    await page.waitForTimeout(160);
    const afterFeed = await getState(page, todayIso);
    assert.equal(afterFeed.kittenCorner.kittens.ginger.affection, 10, 'Feeding the ginger kitten adds +10 affection');
    assert.equal(afterFeed.kittenCorner.visit.fed, true);
    assert.equal(afterFeed.kittenCorner.visit.leavesAt, leavesBeforeFeed + 60000, 'A fed kitten stays one minute longer');
    assert(afterFeed.ar12Audio.kittenCrunchCount >= 1, 'Feeding plays the crunch');
    assert(afterFeed.journalSummary.kittens7d >= 1, 'Weekly journal records kitten care');
    assert(afterFeed.xp > beforeFeed.xp || afterFeed.level > beforeFeed.level, 'Feeding grants affection XP to her');
    const fedDom = await page.evaluate(() => ({
      bowl: !document.getElementById('kc-bowl-img').classList.contains('hidden'),
      bowlLoaded: document.getElementById('kc-bowl-img').naturalWidth > 0,
      feedDisabled: document.getElementById('btn-kitten-feed').disabled,
      feedText: document.getElementById('btn-kitten-feed').textContent
    }));
    assert.deepEqual(fedDom, { bowl: true, bowlLoaded: true, feedDisabled: true, feedText: '猫粮添好啦' }, `Fed state: ${JSON.stringify(fedDom)}`);
    assert.equal((await dbg(page, 'feed')).reason, 'already_fed', 'One bowl per visit');
    await page.click('#btn-kitten-pet');
    await page.waitForTimeout(80);
    await page.click('#btn-kitten-pet');
    await page.waitForTimeout(80);
    // 点场景窗台上的小猫 = 摸一摸（卡片在右侧，不遮挡窗台）
    const layouts = await dbg(page, 'getLayouts');
    await page.mouse.click(layouts.sill.kittenHit.x, layouts.sill.kittenHit.y);
    await page.waitForTimeout(160);
    const afterPets = await getState(page, todayIso);
    assert.equal(afterPets.kittenCorner.visit.pets, 3, `Two button pets + one scene tap = 3 pets, got ${afterPets.kittenCorner.visit.pets}`);
    assert.equal(afterPets.kittenCorner.kittens.ginger.affection, 19, 'Each pet adds +3 for the ginger kitten');
    assert(afterPets.ar12Audio.kittenPurrCount >= 3, 'Petting purrs');
    assert.deepEqual(await openPanelNames(page), ['kittenCorner'], 'Scene tap keeps the kitten card open');
    assert.equal(await page.evaluate(() => document.getElementById('btn-kitten-pet').disabled), true, 'Pet button disables after 3 pets');
    assert.equal((await dbg(page, 'pet')).reason, 'pets_full');
    await page.waitForTimeout(250);
    await shot(page, 'desktop_1440x900_kitten_card.png');

    // 离开 → 不定期的下一次来访（3~9 分钟）
    await dbg(page, 'advanceClock', afterPets.kittenCorner.visit.leavesAt - afterPets.now + 1000);
    st = await getState(page, todayIso);
    assert.equal(st.kittenCorner.visit, null, 'Kitten leaves after its stay');
    const gap = st.kittenCorner.nextVisitAt - st.now;
    assert(gap >= 175000 && gap <= 545000, `Next visit 3~9 minutes later, got ${gap}`);
    // 下一位（第二次）来访 + 第三次一定能遇见小礼服
    let tuxedoMet = false;
    for (let i = 0; i < 2; i++) {
      st = await getState(page, todayIso);
      await dbg(page, 'advanceClock', st.kittenCorner.nextVisitAt - st.now + 500);
      st = await getState(page, todayIso);
      assert(st.kittenCorner.visit, `Visit #${i + 2} arrives`);
      const vid = st.kittenCorner.visit.kittenId;
      if (vid === 'tuxedo') tuxedoMet = true;
      const before = st.kittenCorner.kittens[vid].affection;
      const coinsBefore = st.coins;
      const fed = await dbg(page, 'feed');
      assert.equal(fed.ok, true);
      if (vid === 'ginger' && before < 20 && before + 10 >= 20) {
        assert.equal(fed.tierReward, '熟悉', 'Crossing 20 affection unlocks the 熟悉 tier');
        assert((await getState(page, todayIso)).coins >= coinsBefore + 10, 'Tier-up gift coins');
      }
      st = await getState(page, todayIso);
      await dbg(page, 'advanceClock', st.kittenCorner.visit.leavesAt - st.now + 500);
    }
    assert.equal(tuxedoMet, true, 'The tuxedo kitten is guaranteed by the third visit');
    st = await getState(page, todayIso);
    assert.equal(st.kittenStats.met, 2, 'Codex 2/2 after meeting both kittens');
    assert(st.kittenCorner.kittens.tuxedo.affection >= 8, 'Tuxedo affection grows when fed');
    const codexDom = await page.evaluate(() =>
      Array.from(document.querySelectorAll('#kc-codex-grid .kc-codex-slot')).map((s) => ({
        id: s.dataset.kittenId,
        met: s.classList.contains('is-met'),
        silhouette: s.querySelector('img').classList.contains('is-silhouette'),
        loaded: s.querySelector('img').naturalWidth > 0
      }))
    );
    assert.deepEqual(
      codexDom.map((c) => [c.id, c.met, c.silhouette, c.loaded]),
      [
        ['ginger', true, false, true],
        ['tuxedo', true, false, true]
      ],
      `Codex DOM: ${JSON.stringify(codexDom)}`
    );

    // 离开期间错过的来访不积压：只安排一次 20~60 秒后的新来访
    await dbg(page, 'scheduleVisitIn', 10000);
    await dbg(page, 'advanceClock', 10 * 60000);
    st = await getState(page, todayIso);
    assert.equal(st.kittenCorner.visit, null, 'A long-missed visit is not replayed');
    assert(st.kittenCorner.missedVisits >= 1, 'Missed visit counted');
    const retry = st.kittenCorner.nextVisitAt - st.now;
    assert(retry >= 20000 && retry <= 60000, `Missed visit reschedules 20~60s later, got ${retry}`);
    // 每日封顶 8 次：达到上限后排到下一个本地午夜之后
    for (let guard = 0; guard < 12; guard++) {
      st = await getState(page, todayIso);
      if (st.kittenCorner.visitsToday >= st.kittenStats.dailyCap) break;
      await dbg(page, 'forceVisit');
      await dbg(page, 'leaveNow');
    }
    st = await getState(page, todayIso);
    assert.equal(st.kittenCorner.visitsToday, 8, 'Daily cap reached');
    await dbg(page, 'scheduleVisitIn', 1000);
    await dbg(page, 'advanceClock', 2000);
    st = await getState(page, todayIso);
    const nextMidnight = localMs(today.getFullYear(), today.getMonth() + 1, today.getDate() + 1, 0, 0);
    assert.equal(st.kittenCorner.visit, null, 'No visits beyond the daily cap');
    assert(st.kittenCorner.nextVisitAt >= nextMidnight + 60000 && st.kittenCorner.nextVisitAt <= nextMidnight + 300000, `Capped schedule waits for local midnight, got ${new Date(st.kittenCorner.nextVisitAt).toString()}`);
    assert(/今天的小访客都来过啦/.test(await page.locator('#kc-status').textContent()), 'Status explains the daily cap');
    // 跨过本地午夜：计数归零，按排期来访
    await dbg(page, 'advanceClock', st.kittenCorner.nextVisitAt - st.now + 500);
    st = await getState(page);
    assert.equal(st.kittenCorner.visitsToday, 1, 'Daily count resets after local midnight');
    assert(st.kittenCorner.visit, 'Visits resume the next day');
    // 时钟回拨：来访记录落到“未来”时安全清除并重新排期
    await dbg(page, 'setClock', T0 - 3600000);
    st = await getState(page, todayIso);
    assert.equal(st.kittenCorner.visit, null, 'Clock rollback clears a visit from the future');
    assert(st.kittenCorner.nextVisitAt > st.now && st.kittenCorner.nextVisitAt - st.now <= 60000, 'Rollback reschedules soon');
    await dbg(page, 'setClock', T0 + 3600000);

    // 幸运佑护：好感合计换算（≥10 生效，≥40 九命护身 1 次，≥140 两次）
    await dbg(page, 'setAffectionForTest', 'ginger', 30);
    await dbg(page, 'setAffectionForTest', 'tuxedo', 20);
    st = await getState(page, todayIso);
    assert.equal(st.kittenWard.totalAffection, 50);
    assert.equal(st.kittenWard.active, true);
    assert.equal(st.kittenWard.luckyDropBonus, 0.025, `50 affection = +2.5% lucky drops, got ${st.kittenWard.luckyDropBonus}`);
    assert.equal(st.kittenWard.saveCharges, 1);
    await dbg(page, 'setAffectionForTest', 'ginger', 90);
    await dbg(page, 'setAffectionForTest', 'tuxedo', 60);
    st = await getState(page, todayIso);
    assert.equal(st.kittenWard.totalAffection, 150);
    assert.equal(st.kittenWard.luckyDropBonus, 0.075);
    assert.equal(st.kittenWard.saveCharges, 2, '>= 140 affection grants 2 nine-lives saves per shift');
    await dbg(page, 'forceVisit', 'tuxedo');
    await page.click('#btn-kitten-corner');
    await page.waitForTimeout(160);
    await ensureCardOpen(page, 'kitten-corner-card', '#btn-kitten-corner');
    assert.equal(await page.evaluate(() => !document.getElementById('btn-kitten-go-shift').classList.contains('hidden')), true, 'Go-shift button appears once the ward is active');
    await page.waitForTimeout(250);
    await shot(page, 'desktop_1440x900_kitten_codex.png');
    await page.click('#btn-kitten-go-shift');
    await page.waitForTimeout(260);
    const surv = await getState(page, todayIso);
    assert.equal(surv.gameMode, 'survivor');
    assert.equal(surv.shiftSaves.max, 2);
    assert.equal(surv.survivorMetrics.kittenLuckWard.active, true);
    const sm = surv.survivorMetrics;
    const expectedDrop =
      sm.botanicalBlessings.treasureDropBonus +
      sm.collageLuckBlessing.luckyDropBonus +
      (sm.pressedFlowerBlessing.active ? sm.pressedFlowerBlessing.luckyDropBonus : 0) +
      0.075;
    assert(Math.abs(sm.effectiveLuckyDropBonus - expectedDrop) < 0.002, `Lucky drops include the kitten ward, got ${sm.effectiveLuckyDropBonus} vs ${expectedDrop}`);
    const stripHasKitten = await page.evaluate(() => {
      const strip = document.getElementById('surv-skill-strip');
      return Boolean(strip && !strip.classList.contains('hidden') && strip.innerHTML.includes('ui_btn_kitten_corner.webp'));
    });
    assert(stripHasKitten, 'Survivor skill strip must show the ui_btn_kitten_corner.webp badge');
    const save1 = await dbg(page, 'luckSaveForTest');
    assert.equal(save1.saved, true, 'Nine-lives save catches her at 0 HP');
    assert.equal(save1.hp, Math.round(save1.maxHp * 0.3), 'Save restores 30% HP');
    assert.equal(save1.left, 1);
    assert.equal((await dbg(page, 'luckSaveForTest')).saved, true);
    const save3 = await dbg(page, 'luckSaveForTest');
    assert.equal(save3.saved, false, 'Saves run out after the per-shift charges');
    await dbg(page, 'setHpForTest', 9999);
    assert((await getState(page, todayIso)).ar12Audio.kittenLuckChimeCount >= 2, 'Each save chimes');
    await page.waitForTimeout(200);
    await shot(page, 'desktop_1440x900_survivor_strip.png');
    await page.click('.mode-btn[data-mode="pet"]');
    await page.waitForTimeout(220);
    assert.equal((await getState(page, todayIso)).survivorMetrics.effectiveLuckyDropBonus >= 0, true);

    // 4. 节日手作贺卡：本地日期 / 季节 / 固定节日（可注入时钟，跨年窗口）
    const occCases = [
      ['2026-12-25T10:00:00', 'christmas', 2026, 0],
      ['2026-12-21T10:00:00', 'christmas', 2026, -4],
      ['2026-12-20T10:00:00', 'winter', 2026, null],
      ['2026-12-30T10:00:00', 'new_year', 2027, -2],
      ['2027-01-03T10:00:00', 'new_year', 2027, 2],
      ['2027-01-04T10:00:00', 'winter', 2026, null],
      ['2027-02-13T10:00:00', 'valentine', 2027, -1],
      ['2027-02-16T10:00:00', 'winter', 2026, null],
      ['2026-05-30T10:00:00', 'childrens_day', 2026, -2],
      ['2026-05-29T10:00:00', 'spring', 2026, null],
      ['2026-07-15T10:00:00', 'summer', 2026, null],
      ['2026-11-18T10:00:00', 'autumn', 2026, null],
      ['2026-03-01T10:00:00', 'spring', 2026, null]
    ];
    for (const [iso, id, year, diff] of occCases) {
      const occ = await dbg(page, 'occasionFor', iso);
      assert.deepEqual([occ.id, occ.year, occ.diffDays], [id, year, diff], `Occasion for ${iso}: ${JSON.stringify(occ)}`);
    }

    // UI：今天的贺卡（时钟 = 今天 10:00，周报计入）
    await dbg(page, 'setClock', T0 + 2 * 3600000);
    const todayOcc = await dbg(page, 'occasionFor', T0 + 2 * 3600000);
    await page.click('#btn-greeting-card');
    await page.waitForTimeout(180);
    let sendState = await page.evaluate(() => ({
      disabled: document.getElementById('btn-greeting-send').disabled,
      text: document.getElementById('btn-greeting-send').textContent,
      occName: document.getElementById('gc-occasion-name').textContent,
      stickerChips: Array.from(document.querySelectorAll('#gc-sticker-row .gc-sticker-chip')).map((c) => c.dataset.stickerId),
      lineChips: document.querySelectorAll('#gc-line-row .gc-line-chip').length
    }));
    assert.equal(sendState.disabled, true, 'Send stays disabled until stickers + a line are chosen');
    assert.equal(sendState.text, '还差贴纸、祝福');
    assert.equal(sendState.occName, todayOcc.name, 'Card follows the injected local date');
    assert(sendState.stickerChips.includes('kitten_ginger') && sendState.stickerChips.includes('kitten_tuxedo'), `Met kittens unlock their cut-out stickers: ${JSON.stringify(sendState.stickerChips)}`);
    assert(sendState.stickerChips.length <= 8 && sendState.lineChips === 3);
    await page.click('#gc-base-row [data-base-id="sakura_wash"]');
    await page.waitForTimeout(60);
    await page.click(`#gc-sticker-row [data-sticker-id="${sendState.stickerChips[0]}"]`);
    await page.waitForTimeout(60);
    await page.click('#gc-sticker-row [data-sticker-id="kitten_ginger"]');
    await page.waitForTimeout(60);
    await page.click('#gc-line-row [data-line-idx="1"]');
    await page.waitForTimeout(80);
    let cr = await dbg(page, 'getCardRun');
    assert.deepEqual([cr.baseId, cr.stickers, cr.lineIdx], ['sakura_wash', [sendState.stickerChips[0], 'kitten_ginger'], 1], `Draft: ${JSON.stringify(cr)}`);
    const draftDom = await page.evaluate(() => ({
      base: document.getElementById('gc-preview').dataset.base,
      stickers: [0, 1, 2].map((i) => !document.getElementById(`gc-ps-${i}`).classList.contains('hidden')),
      stickersLoaded: [0, 1].every((i) => document.getElementById(`gc-ps-${i}`).naturalWidth > 0),
      artLoaded: document.getElementById('gc-preview-art').naturalWidth > 0,
      line: document.getElementById('gc-preview-line').textContent,
      send: document.getElementById('btn-greeting-send').textContent,
      count: document.getElementById('gc-sticker-count').textContent
    }));
    assert.deepEqual(
      [draftDom.base, draftDom.stickers, draftDom.stickersLoaded, draftDom.artLoaded, draftDom.send, draftDom.count],
      ['sakura_wash', [true, true, false], true, true, '剪贴完成 · 寄出', '2/3'],
      `Draft preview: ${JSON.stringify(draftDom)}`
    );
    assert(draftDom.line.length >= 6, 'Preview shows the chosen message line');
    assert((await getState(page)).isCraftingCard, 'She crafts beside the desk while the card is open');
    await page.waitForTimeout(250);
    await shot(page, 'desktop_1440x900_card_draft.png');
    // 第 4 枚贴纸被拒绝
    await dbg(page, 'toggleSticker', sendState.stickerChips[1]);
    assert.equal((await dbg(page, 'toggleSticker', sendState.stickerChips[2])).reason, 'stickers_full', 'At most 3 stickers');
    await dbg(page, 'toggleSticker', sendState.stickerChips[1]);
    const coinsBeforeCard = (await getState(page)).coins;
    await page.click('#btn-greeting-send');
    await page.waitForTimeout(180);
    let gcState = await getState(page, todayIso);
    assert.equal(gcState.greetingCards.album.length, 1, 'Sent card enters the album');
    assert.equal(gcState.greetingCards.album[0].occasionId, todayOcc.id);
    assert.deepEqual(gcState.greetingCards.album[0].stickers, [sendState.stickerChips[0], 'kitten_ginger']);
    assert.equal(gcState.cardBlessing.occasions, 1);
    assert(gcState.coins >= coinsBeforeCard + 18, 'First card of an occasion awards >= 18 coins');
    assert.equal(gcState.cardRun.lastResult.isFirstThisOccasion, true);
    assert(gcState.ar12Audio.cardSendChimeCount >= 1 && gcState.ar12Audio.cardSnipCount >= 2, `Card audio: ${JSON.stringify(gcState.ar12Audio)}`);
    assert.equal(gcState.journalSummary.cards7d, 1, 'Weekly journal records the card');
    assert.equal(gcState.sillCardVisual.count, 1, 'The sent card stands on the windowsill');
    const sentDom = await page.evaluate(() => ({
      viewing: document.getElementById('gc-preview').classList.contains('is-viewing'),
      send: document.getElementById('btn-greeting-send').textContent,
      album: document.querySelectorAll('#gc-album-grid .gc-album-card').length,
      albumLoaded: Array.from(document.querySelectorAll('#gc-album-grid img')).every((im) => im.complete && im.naturalWidth > 0),
      goShift: !document.getElementById('btn-greeting-go-shift').classList.contains('hidden')
    }));
    assert.deepEqual(sentDom, { viewing: true, send: '再做一张新的', album: 1, albumLoaded: true, goShift: true }, `Sent DOM: ${JSON.stringify(sentDom)}`);
    await page.waitForTimeout(250);
    await shot(page, 'desktop_1440x900_card_sent.png');
    // 她来帮忙 + 寄第二、三、四张（每日只奖励 3 张）
    await page.click('#btn-greeting-send');
    await page.waitForTimeout(80);
    await page.click('#btn-greeting-helper');
    await page.waitForTimeout(100);
    cr = await dbg(page, 'getCardRun');
    assert(cr.stickers.length >= 2 && cr.lineIdx >= 0 && cr.viewingId === '', `Helper fills the draft: ${JSON.stringify(cr)}`);
    assert(cr.stickers.some((s) => s.startsWith('kitten_')), 'She likes to put a met kitten on the card');
    const rewards = [];
    for (let i = 0; i < 3; i++) {
      if (i > 0) await dbg(page, 'helper');
      const res = await dbg(page, 'send');
      assert.equal(res.ok, true, `send #${i + 2}: ${JSON.stringify(res)}`);
      rewards.push(res.coinReward);
    }
    assert.deepEqual(rewards, [6, 6, 0], `Daily rewards cap at 3 cards, got ${JSON.stringify(rewards)}`);

    // 固定节日：圣诞（节日徽章 / 胶囊提醒 → 寄出后消失）
    await dbg(page, 'setClock', localMs(2026, 12, 25, 10));
    let xmas = await getState(page, '2026-12-25T10:00:00');
    assert.equal(xmas.occasion.id, 'christmas');
    assert.equal(xmas.holidayPending, true);
    const xmasDom = await page.evaluate(() => ({
      badge: !document.getElementById('greeting-holiday-badge').classList.contains('hidden'),
      dock: document.getElementById('btn-greeting-card').classList.contains('has-holiday'),
      occ: document.getElementById('gc-occasion-name').textContent,
      sub: document.getElementById('gc-occasion-sub').textContent,
      kind: document.getElementById('greeting-craft-card').dataset.occasionKind
    }));
    assert.deepEqual(
      [xmasDom.badge, xmasDom.dock, xmasDom.occ, xmasDom.kind],
      [true, true, '圣诞节', 'holiday'],
      `Christmas DOM: ${JSON.stringify(xmasDom)}`
    );
    assert(xmasDom.sub.includes('就是今天'), `Holiday countdown: ${xmasDom.sub}`);
    const xPalette = await dbg(page, 'getPalette');
    assert(xPalette.includes('snow') && xPalette.includes('wreath'), `Christmas cut-outs: ${JSON.stringify(xPalette)}`);
    await page.click('#btn-greeting-helper');
    await page.waitForTimeout(120);
    await page.waitForTimeout(200);
    await shot(page, 'desktop_1440x900_card_christmas.png');
    const xSend = await dbg(page, 'send');
    assert.equal(xSend.isFirstThisOccasion, true);
    assert.equal(xSend.coinReward, 18, 'New day, first Christmas card: 18 coins');
    xmas = await getState(page, '2026-12-25T10:00:00');
    assert.equal(xmas.holidayPending, false, 'Holiday reminder clears after sending');
    assert.equal(await page.evaluate(() => document.getElementById('greeting-holiday-badge').classList.contains('hidden')), true);
    // 跨年：12/31 的贺卡算作 2027 年元旦
    await dbg(page, 'setClock', localMs(2026, 12, 31, 10));
    await dbg(page, 'helper');
    const ny = await dbg(page, 'send');
    assert.equal(ny.card.occasionId, 'new_year');
    assert.equal(ny.card.year, 2027);
    gcState = await getState(page);
    assert(gcState.greetingCards.occasionYears['new_year-2027'], 'Occasion-year key is recorded');
    const expectedOcc = new Set([todayOcc.id, 'christmas', 'new_year']).size;
    assert.equal(gcState.cardBlessing.occasions, expectedOcc);
    assert.equal(gcState.cardBlessing.shiftXpBonusPct, Number((expectedOcc * 0.015).toFixed(4)));
    // 收藏册最多 24 张（总数继续累计）
    for (let i = 0; i < 22; i++) {
      await dbg(page, 'helper');
      await dbg(page, 'send');
    }
    gcState = await getState(page);
    assert.equal(gcState.greetingCards.album.length, 24, 'Album keeps the latest 24 cards');
    assert.equal(gcState.greetingCards.totalCards, 28, 'Total cards keeps counting beyond the album');
    assert.equal(gcState.sillCardVisual.count, 24);
    // 回看收藏册里的一张
    await dbg(page, 'useRealClock');
    await dbg(page, 'setClock', T0 + 3 * 3600000);
    await ensureCardOpen(page, 'greeting-craft-card', '#btn-greeting-card');
    const albumIds = await page.evaluate(() => Array.from(document.querySelectorAll('#gc-album-grid .gc-album-card')).map((c) => c.dataset.cardId));
    assert.equal(albumIds.length, 8, 'Album strip shows the latest 8 cards');
    await page.click(`#gc-album-grid [data-card-id="${albumIds[0]}"]`);
    await page.waitForTimeout(120);
    assert.equal((await dbg(page, 'getCardRun')).viewingId, albumIds[0], 'Tapping an album card shows it');
    // 幸存者：贺卡心意班次经验加成
    await page.click('#btn-greeting-go-shift');
    await page.waitForTimeout(260);
    const survCard = await getState(page, todayIso);
    assert.equal(survCard.gameMode, 'survivor');
    assert(Math.abs(survCard.survivorMetrics.cardXpMult - (1 + expectedOcc * 0.015)) < 1e-6, `Card XP mult, got ${survCard.survivorMetrics.cardXpMult}`);
    assert(
      Math.abs(survCard.survivorMetrics.totalShiftXpMult - survCard.survivorMetrics.shiftXpMult * survCard.survivorMetrics.cardXpMult) < 1e-3,
      'Total shift XP mult = mailbox x card'
    );
    const stripHasCard = await page.evaluate(() => (document.getElementById('surv-skill-strip')?.innerHTML || '').includes('ui_btn_greeting_card.webp'));
    assert(stripHasCard, 'Survivor skill strip must show the ui_btn_greeting_card.webp badge');
    await page.click('.mode-btn[data-mode="pet"]');
    await page.waitForTimeout(240);
    assert.equal((await getState(page)).survivorMetrics.cardXpMult, 1, 'Card XP bonus only applies on shifts');

    // 场景：窗台贺卡可点开收藏册
    await dbg(page, 'leaveNow');
    await dbg(page, 'placePlayerForTest', 0.3);
    await page.waitForTimeout(300);
    const sillL = await dbg(page, 'getLayouts');
    await page.mouse.click(sillL.sill.cardHit.x, sillL.sill.cardHit.y);
    await page.waitForTimeout(160);
    assert.deepEqual(await openPanelNames(page), ['greetingCard'], 'Tapping the windowsill card opens the card album');
    assert((await dbg(page, 'getCardRun')).viewingId !== '', 'Opens on the latest sent card');
    await page.click('#btn-greeting-close');
    await page.waitForTimeout(120);
    await dbg(page, 'forceVisit', 'ginger');
    await page.waitForTimeout(900);
    await shot(page, 'desktop_1440x900_scene_sill.png');

    // 5. 七日心情周报联动
    await dbg(page, 'useRealClock');
    await page.click('#btn-weekly-journal');
    await page.waitForTimeout(200);
    const journal = await page.evaluate(() => ({
      summary: window.__AR12_DEBUG__.getState().journalSummary,
      cardText: document.getElementById('weekly-journal-card')?.textContent || ''
    }));
    assert(journal.summary.kittens7d >= 6, `Expected kittens7d >= 6 (1 feed + 3 pets + 2 feeds today), got ${journal.summary.kittens7d}`);
    assert(journal.summary.cards7d >= 4, `Expected cards7d >= 4 (today's cards), got ${journal.summary.cards7d}`);
    assert.equal(journal.summary.cumulative.kittensMet, 2);
    assert(journal.summary.cumulative.totalCards >= 28);
    assert(
      journal.cardText.includes('窗台小猫与贺卡') && journal.cardText.includes('好感 150/200') && journal.cardText.includes('轻电台') && journal.cardText.includes('拼贴'),
      `Weekly journal card must render the kitten / card metrics (and keep radio / collage), got ${journal.cardText}`
    );
    await page.click('#btn-weekly-journal');
    await page.waitForTimeout(120);

    // 刷新后持久化（运行时时钟回到真实时间）
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(450);
    const reloaded = await getState(page);
    assert.equal(reloaded.kittenStats.met, 2, 'Codex persists across reload');
    assert.equal(reloaded.kittenCorner.kittens.ginger.affection, 90);
    assert.equal(reloaded.kittenCorner.kittens.tuxedo.affection, 60);
    assert(reloaded.kittenCorner.totalVisits >= 11 && reloaded.kittenCorner.totalFeeds >= 3 && reloaded.kittenCorner.totalPets >= 3, `Kitten totals persist: ${JSON.stringify(reloaded.kittenCorner)}`);
    assert.equal(reloaded.greetingCards.album.length, 24, 'Album persists');
    assert.equal(reloaded.greetingCards.totalCards, 28);
    assert.equal(reloaded.cardBlessing.occasions, expectedOcc);
    assert.equal(reloaded.cardRun.stickers.length, 0, 'Draft is runtime only');

    // 6. 桌面 1440x900：23 键单排，摇杆 / 跳跃键两侧留白 >= 10px
    const deskDock = await dockAudit(page);
    assert(deskDock.count >= CARE_BTN_COUNT, `Expected >= ${CARE_BTN_COUNT} dock keys on 1440x900, got ${deskDock.count}`);
    assert.equal(deskDock.rows, 1, '1440x900 keeps one dock row');
    assert(deskDock.overlap === 0, `Dock keys overlap: ${JSON.stringify(deskDock)}`);
    assert(deskDock.joyMargin >= MIN_DOCK_MARGIN && deskDock.jumpMargin >= MIN_DOCK_MARGIN, `1440x900 dock margins: ${JSON.stringify(deskDock)}`);
    const deskPillShown = await page.evaluate(() => !document.getElementById('sill-card-pill').classList.contains('hidden'));
    assert.equal(deskPillShown, true, '1440x900 shows the AR-12 pill (ward active / album)');

    const pillRowAudit = () =>
      page.evaluate(() => {
        const visible = (b) => !b.classList.contains('hidden') && b.offsetParent !== null;
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
        const pills = ['kitchen-memory-pill', 'sill-card-pill'].map((id) => document.getElementById(id));
        const mid = (b) => b.offsetTop + b.offsetHeight / 2;
        const res = {};
        for (const pill of pills) {
          const others = Array.from(document.querySelectorAll('#hud-ambience-row > button')).filter((b) => !pills.includes(b) && visible(b));
          res[pill.id] = { shown: visible(pill), sharesRow: visible(pill) ? others.some((b) => Math.abs(mid(b) - mid(pill)) <= 6) : true };
        }
        res.withPills = rows([]);
        res.withoutPills = rows(pills);
        res.layout = Array.from(document.querySelectorAll('#hud-ambience-row > button')).filter(visible).map((b) => `${b.id}@${b.offsetTop}`);
        return res;
      });

    // 7. 移动端 390x844（竖屏强制横置，真实点按）
    await dbg(page, 'setClock', T0 + 4 * 3600000);
    await dbg(page, 'forceVisit', 'tuxedo');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(320);
    const portraitDock = await dockAudit(page);
    assert.equal(portraitDock.rotated, true, '390x844 uses the rotated landscape stage');
    assert(portraitDock.count >= CARE_BTN_COUNT, `Expected >= ${CARE_BTN_COUNT} dock keys on 390x844, got ${portraitDock.count}`);
    assert.equal(portraitDock.rows, 2, '390x844 groups the dock into two rows');
    assert(portraitDock.overlap === 0, `390x844 dock keys overlap: ${JSON.stringify(portraitDock)}`);
    assert(portraitDock.joyMargin >= MIN_DOCK_MARGIN && portraitDock.jumpMargin >= MIN_DOCK_MARGIN, `390x844 dock margins: ${JSON.stringify(portraitDock)}`);
    assert(portraitDock.minKey >= 30, `Two-row keys stay tappable (>= 30px), got ${portraitDock.minKey}`);
    await page.click('#btn-kitten-corner');
    await page.waitForTimeout(220);
    assert.deepEqual(await openPanelNames(page), ['kittenCorner'], 'Real tap on the rotated dock opens the kitten card');
    await page.click('#btn-kitten-pet');
    await page.waitForTimeout(100);
    await page.click('#btn-kitten-feed');
    await page.waitForTimeout(140);
    let pv = await getState(page);
    assert.equal(pv.kittenCorner.visit.pets, 1, 'Real tap pets on 390x844');
    assert.equal(pv.kittenCorner.visit.fed, true, 'Real tap feeds on 390x844');
    const portraitKitten = await page.evaluate(() => ({
      overflowX: document.documentElement.scrollWidth - window.innerWidth,
      overflowY: document.documentElement.scrollHeight - window.innerHeight,
      hasEmoji: /\p{Extended_Pictographic}/u.test(document.body.innerText || '')
    }));
    assert(!portraitKitten.hasEmoji && portraitKitten.overflowX <= 0 && portraitKitten.overflowY <= 0, `390x844 kitten card: ${JSON.stringify(portraitKitten)}`);
    await page.waitForTimeout(250);
    await shot(page, 'mobile_390x844_kitten.png');
    await page.click('#btn-greeting-card');
    await page.waitForTimeout(220);
    assert.deepEqual(await openPanelNames(page), ['greetingCard'], 'Real tap opens the card table and closes the kitten card');
    const pPalette = await dbg(page, 'getPalette');
    await page.click(`#gc-sticker-row [data-sticker-id="${pPalette[0]}"]`);
    await page.waitForTimeout(80);
    await page.click('#gc-sticker-row [data-sticker-id="kitten_tuxedo"]');
    await page.waitForTimeout(80);
    await page.click('#gc-line-row [data-line-idx="2"]');
    await page.waitForTimeout(80);
    await page.click('#gc-base-row [data-base-id="mint_letter"]');
    await page.waitForTimeout(80);
    cr = await dbg(page, 'getCardRun');
    assert.deepEqual([cr.baseId, cr.stickers, cr.lineIdx], ['mint_letter', [pPalette[0], 'kitten_tuxedo'], 2], `Real taps build the draft on 390x844: ${JSON.stringify(cr)}`);
    await page.waitForTimeout(250);
    await shot(page, 'mobile_390x844_card.png');
    await page.click('#btn-greeting-send');
    await page.waitForTimeout(180);
    assert.equal((await dbg(page, 'getCardRun')).lastAction, 'sent', 'Real tap sends the card on 390x844');

    // 8. 844x390 横屏：卡片 / 顶部 HUD / 两排船坞 / 胶囊行 零重叠
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(300);
    const landDock = await dockAudit(page);
    assert.equal(landDock.rows, 2, '844x390 groups the dock into two rows');
    assert(landDock.overlap === 0, `844x390 dock keys overlap: ${JSON.stringify(landDock)}`);
    assert(landDock.joyMargin >= MIN_DOCK_MARGIN && landDock.jumpMargin >= MIN_DOCK_MARGIN, `844x390 dock margins: ${JSON.stringify(landDock)}`);
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
          pillBottom: pills.reduce((m, b) => Math.max(m, b.getBoundingClientRect().bottom), 0)
        };
      }, cardId);
    for (const [cardId, btn, shotName] of [
      ['greeting-craft-card', '#btn-greeting-card', 'mobile_844x390_card.png'],
      ['kitten-corner-card', '#btn-kitten-corner', 'mobile_844x390_kitten.png']
    ]) {
      if (await page.evaluate((id) => document.getElementById(id).classList.contains('hidden'), cardId)) {
        await page.click(btn);
        await page.waitForTimeout(200);
      }
      const la = await landscapeAudit(cardId);
      assert(la.cardOpen, `${cardId} must be open on 844x390`);
      assert(la.overflowX <= 0 && la.overflowY <= 0, `844x390 overflow: ${JSON.stringify(la)}`);
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
      ['#btn-memory-puzzle', 'memory-puzzle-card']
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
    // 抽屉在两排船坞上方
    await page.click('#btn-shop');
    await page.waitForTimeout(260);
    const drawerAudit = await page.evaluate(() => {
      const d = document.getElementById('pet-drawer').getBoundingClientRect();
      const care = document.getElementById('pet-care-bar').getBoundingClientRect();
      const sw = document.getElementById('mode-switcher').getBoundingClientRect();
      return { drawerBottom: d.bottom, drawerTop: d.top, careTop: care.top, switcherBottom: sw.bottom };
    });
    assert(drawerAudit.drawerBottom <= drawerAudit.careTop + 1, `Drawer overlaps the two-row dock: ${JSON.stringify(drawerAudit)}`);
    await page.click('#btn-shop');
    await page.waitForTimeout(200);

    // 窄屏 AR-12 胶囊：放得下才显示（与已有胶囊同一行），绝不新开一行
    await page.waitForTimeout(600);
    const narrowPill = await pillRowAudit();
    assert(
      narrowPill['sill-card-pill'].sharesRow && narrowPill['kitchen-memory-pill'].sharesRow && narrowPill.withPills === narrowPill.withoutPills,
      `AR-11 / AR-12 pills must not add a HUD pill row on 844x390: ${JSON.stringify(narrowPill)}`
    );
    // 来访中的小猫优先：两段放不下时只留小猫一段挤进心情周报那一行
    if (!narrowPill['kitchen-memory-pill'].shown) {
      assert.equal(narrowPill['sill-card-pill'].shown, true, `With room next to the journal pill the AR-12 pill shows (solo if needed): ${JSON.stringify(narrowPill)}`);
      const soloState = await page.evaluate(() => ({
        solo: document.getElementById('sill-card-pill').classList.contains('sc-solo'),
        kittenSeg: getComputedStyle(document.getElementById('sc-seg-kitten')).display !== 'none'
      }));
      assert.equal(soloState.kittenSeg, true, `The visiting kitten segment is the one kept: ${JSON.stringify(soloState)}`);
    }
    await shot(page, 'mobile_844x390_scene.png');
    // 极端情况：胶囊行塞满时，AR-12 胶囊自动收起而不是换行
    const crowded = await page.evaluate(async () => {
      const ids = ['pomodoro-mini-pill', 'teatime-buff-pill', 'terrarium-blessing-pill', 'kitchen-memory-pill'];
      const prev = ids.map((id) => document.getElementById(id)?.classList.contains('hidden'));
      ids.slice(0, 3).forEach((id) => document.getElementById(id)?.classList.remove('hidden'));
      await new Promise((r) => setTimeout(r, 700));
      const pill = document.getElementById('sill-card-pill');
      const visible = (b) => !b.classList.contains('hidden') && b.offsetParent !== null;
      const others = Array.from(document.querySelectorAll('#hud-ambience-row > button')).filter((b) => b !== pill && visible(b));
      const res = {
        shown: visible(pill),
        sharesRow: visible(pill)
          ? others.some((b) => Math.abs(b.offsetTop + b.offsetHeight / 2 - (pill.offsetTop + pill.offsetHeight / 2)) <= 6)
          : true
      };
      ids.slice(0, 3).forEach((id, i) => {
        if (prev[i]) document.getElementById(id)?.classList.add('hidden');
      });
      return res;
    });
    assert(crowded.sharesRow, `With a crowded pill row the AR-12 pill must fold away instead of wrapping: ${JSON.stringify(crowded)}`);
    await page.waitForTimeout(700);
    // 中等桌面宽度也不挤压摇杆 / 跳跃键
    for (const [w, h] of [
      [1280, 720],
      [1024, 768]
    ]) {
      await page.setViewportSize({ width: w, height: h });
      await page.waitForTimeout(260);
      const md = await dockAudit(page);
      assert(md.overlap === 0 && md.joyMargin >= MIN_DOCK_MARGIN && md.jumpMargin >= MIN_DOCK_MARGIN, `${w}x${h} dock: ${JSON.stringify(md)}`);
    }

    // 9. 旧存档 / 脏数据安全默认值
    await page.setViewportSize({ width: 1440, height: 900 });
    await dbg(page, 'useRealClock');
    await page.evaluate((key) => {
      const raw = JSON.parse(localStorage.getItem(key) || '{}');
      delete raw.kittenCorner;
      delete raw.greetingCards;
      localStorage.setItem(key, JSON.stringify(raw));
    }, SAVE_KEY);
    const legacyLoadAt = Date.now();
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(350);
    const legacy = await getState(page);
    assert.equal(legacy.kittenStats.met, 0, 'Legacy save defaults to unmet kittens');
    assert.equal(legacy.kittenCorner.visit, null);
    assert(legacy.kittenCorner.nextVisitAt - legacyLoadAt >= 38000 && legacy.kittenCorner.nextVisitAt - legacyLoadAt <= 95000, 'Legacy save schedules the first visit 40~90s out');
    assert.deepEqual(legacy.greetingCards.album, []);
    assert.equal(legacy.cardBlessing.active, false);
    assert.equal(legacy.kittenWard.active, false);
    assert(legacy.journalSummary.cards7d >= 4 && legacy.journalSummary.kittens7d >= 6, 'Journal history survives legacy migration');
    assert(legacy.journalSummary.cumulative.totalCards >= 28, 'Cumulative card total survives via the journal');

    await page.evaluate((key) => {
      const raw = JSON.parse(localStorage.getItem(key) || '{}');
      raw.kittenCorner = {
        kittens: {
          ginger: { met: 'yes', affection: 250, visits: -3, feeds: 'x', tierRewarded: 9, firstMet: 'today' },
          tuxedo: { affection: 40 },
          calico: { met: true, affection: 50 }
        },
        visit: { kittenId: 'tuxedo', arrivedAt: Date.now(), leavesAt: Date.now() + 99 * 60000, fed: 1, pets: 7 },
        nextVisitAt: Date.now() + 40 * 86400000,
        visitDate: 'nope',
        visitsToday: 50,
        lastKittenId: '<b>',
        totalVisits: 'many',
        totalFeeds: -1
      };
      raw.greetingCards = {
        album: [
          { id: 'c5', occasionId: 'christmas', year: 1999, baseId: 'neon', stickers: ['snow', 'snow', 'bogus', 'wreath', 'heart', 'lace'], lineIdx: 9, date: '2026-12-25' },
          { id: 'c5', occasionId: 'autumn', year: 2026, baseId: 'mint_letter', stickers: ['maple'], lineIdx: 1, date: 'x' },
          { id: 'evil', occasionId: 'halloween', stickers: ['heart'] },
          { occasionId: 'spring', stickers: [] },
          null,
          'c7'
        ],
        collected: { christmas: 'lots', moon_festival: 3, autumn: 0 },
        occasionYears: { 'christmas-2026': true, '<img>-2026': true, 'spring-20x6': true },
        cardSeq: -5,
        totalCards: 'many',
        rewardDate: 'x',
        rewardCount: 9,
        lastBaseId: 'bogus'
      };
      localStorage.setItem(key, JSON.stringify(raw));
    }, SAVE_KEY);
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(350);
    const dirty = await getState(page);
    const dk = dirty.kittenCorner;
    assert.deepEqual(Object.keys(dk.kittens).sort(), ['ginger', 'tuxedo'], 'Unknown kittens are dropped');
    assert.equal(dk.kittens.ginger.met, false, 'Non-boolean met flag does not count as met');
    assert.equal(dk.kittens.ginger.affection, 0, 'Unmet kittens carry no affection');
    assert.equal(dk.kittens.tuxedo.met, false);
    assert.equal(dk.visit, null, 'A visit by an unmet kitten / with a >15 min stay is dropped');
    assert(dk.nextVisitAt - Date.now() <= 95000, 'Far-future schedule is replaced');
    assert.equal(dk.visitsToday, 0, 'Visit count without a valid date resets');
    assert.equal(dk.lastKittenId, '');
    assert.equal(dk.totalVisits, 0);
    assert.equal(dk.totalFeeds, 0);
    const dg = dirty.greetingCards;
    assert.deepEqual(dg.album.map((c) => c.occasionId), ['christmas', 'autumn'], 'Album keeps only known occasions with stickers');
    assert.deepEqual(dg.album[0].stickers, ['snow', 'wreath', 'heart'], 'Stickers are deduped, validated and capped at 3');
    assert.equal(dg.album[0].baseId, 'cream_grid', 'Unknown paper falls back to cream grid');
    assert.equal(dg.album[0].lineIdx, 0);
    assert.equal(dg.album[0].year, 2026, 'Out-of-range year falls back to the card date');
    assert.notEqual(dg.album[0].id, dg.album[1].id, 'Duplicate card ids are re-numbered');
    assert(/^\d{4}-\d{2}-\d{2}$/.test(dg.album[1].date));
    assert.deepEqual(Object.keys(dg.collected).sort(), ['autumn', 'christmas'], 'Collected keeps known occasions (album entries restore missing ones)');
    assert.equal(dg.collected.christmas, 1);
    assert.deepEqual(Object.keys(dg.occasionYears).sort(), ['autumn-2026', 'christmas-2026']);
    assert(dg.cardSeq >= 6, 'Card sequence never collides with existing ids');
    assert.equal(dg.totalCards, 2);
    assert.equal(dg.rewardCount, 0);
    assert.equal(dg.lastBaseId, 'cream_grid');
    // 脏数据下依旧可正常打开两张卡并继续游玩
    await page.click('#btn-greeting-card');
    await page.waitForTimeout(160);
    assert.equal(await page.locator('#gc-summary-pill').textContent(), '收藏 2 · 节日 2/8');
    assert.equal((await dbg(page, 'helper')).ok, true);
    const dirtySend = await dbg(page, 'send');
    assert.equal(dirtySend.ok, true, `Sending works after a dirty save: ${JSON.stringify(dirtySend)}`);
    assert(!['c5', 'c6'].includes(dirtySend.card.id) || dirtySend.card.id !== dg.album[0].id, 'New card id is unique');
    await page.click('#btn-kitten-corner');
    await page.waitForTimeout(160);
    assert.equal(await page.locator('#kc-summary-pill').textContent(), '好感 0/200 · 图鉴 0/2');
    const unmetCodex = await page.evaluate(() =>
      Array.from(document.querySelectorAll('#kc-codex-grid .kc-codex-ico')).map((im) => ({ s: im.classList.contains('is-silhouette'), loaded: im.naturalWidth > 0 }))
    );
    assert.deepEqual(unmetCodex, [{ s: true, loaded: true }, { s: true, loaded: true }], 'Unmet kittens show as cream silhouettes');
    await page.waitForTimeout(200);
    await shot(page, 'desktop_1440x900_kitten_unmet.png');

    assert.equal(consoleErrors.length, 0, `Console errors observed: ${consoleErrors.join('; ')}`);
    assert.equal(pageErrors.length, 0, `Page errors observed: ${pageErrors.join('; ')}`);
    assert.equal(failedResponses.length, 0, `HTTP >= 400 responses observed: ${failedResponses.join('; ')}`);

    console.log(
      '[E2E PASS] AR-12 Windowsill Kitten Visitor Corner (real-clock irregular visits with injectable clock + seeded random, 8/day cap, no offline backlog, rollback-safe, feed/pet affection with tier gifts, ginger + tuxedo codex with cream silhouettes, scene windowsill kitten + bowl, Survivor luck ward: lucky drops up to +10% and nine-lives saves) + Cream-Journal Holiday Handmade Cards (local season + 4 fixed holidays incl. cross-year New Year, paper / cut-outs / message line with her helper, 24-card album, 3 rewarded cards per day, Survivor shift XP blessing, windowsill card display, Weekly Journal sync) passed across 1440x900, 390x844 (rotated, real taps) and 844x390 with a two-row 23-key dock (>= 10px from joystick / jump), mutually exclusive overlays, safe legacy/dirty-save defaults and 0 errors!'
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
