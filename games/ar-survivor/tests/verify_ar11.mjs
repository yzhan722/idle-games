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
const PORT = Number(process.env.AR11_PORT || 0);

// 可选：设置 AR11_SHOT_DIR 后输出 1440x900 / 390x844 / 844x390 自审截图
const SHOT_DIR = process.env.AR11_SHOT_DIR || '';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.json': 'application/json; charset=utf-8'
};

const REQUIRED_AR11_ASSETS = [
  'ui_btn_bento_kitchen.webp',
  'ui_btn_memory_puzzle.webp',
  'bento_box_finished.webp',
  'onigiri_trio.webp',
  'puzzle_piece_memory.webp',
  'memory_wall_frame.webp'
];

const CARE_BTN_COUNT = 21;
const ALBUM_KEY = 'ar_deepseek_polaroid_album_v1';
const SAVE_KEY = 'ar_deepseek_pet_v2';

async function shot(page, name) {
  if (!SHOT_DIR) return;
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(SHOT_DIR, name) });
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
  assert(/\.\/style\.css\?v=hd(?:2[6-9]|[3-9]\d)\b/.test(htmlContent), 'index.html must reference ./style.css?v=hd26+');
  assert(/\.\/game\.js\?v=hd(?:5\d|[6-9]\d)\b/.test(htmlContent), 'index.html must reference ./game.js?v=hd50+');
  for (const reqAsset of REQUIRED_AR11_ASSETS) {
    assert(
      new RegExp(`\\./assets/${reqAsset.replace('.', '\\.')}\\?v=hd(?:2[6-9]|[3-9]\\d)`).test(htmlContent),
      `index.html must reference ./assets/${reqAsset}?v=hd26+`
    );
    assert(assetRefs.has(reqAsset), `Required AR-11 asset ${reqAsset} is not referenced in code`);
  }
  for (const [name, content] of [
    ['index.html', htmlContent],
    ['style.css', cssContent],
    ['sprites.js', spritesContent],
    ['game.js', gameContent]
  ]) {
    assert(!/\?v=hd2[345]\b/.test(content), `Stale ?v=hd23/hd24/hd25 cache-buster left in public/${name}`);
  }
  assert(/\?v=hd(?:2[6-9]|[3-9]\d)\b/.test(cssContent), 'style.css must use ?v=hd26+ asset cache-busters');
  assert(/\?v=hd(?:2[6-9]|[3-9]\d)\b/.test(spritesContent), 'sprites.js must use ?v=hd26+ asset cache-busters');
  assert(/\.\/sprites\.js\?v=hd(?:2[6-9]|[3-9]\d)\b/.test(gameContent), 'game.js must import ./sprites.js?v=hd26+');
  assert(/\.\/audio\.js\?v=hd(?:2[6-9]|[3-9]\d)\b/.test(gameContent), 'game.js must import ./audio.js?v=hd26+');
  assert(/\.\/vision\.js\?v=hd(?:2[6-9]|[3-9]\d)\b/.test(gameContent), 'game.js must import ./vision.js?v=hd26+');
  for (const fn of ['drawMemoryWallBoard', 'drawBentoLunchDesk', 'drawBentoKitchenProp', 'getMemoryWallLayout', 'getBentoDeskAnchor']) {
    assert(new RegExp(`export function ${fn}`).test(spritesContent), `sprites.js must export ${fn}`);
  }
  for (const asset of assetRefs) {
    const full = path.join(PUBLIC_DIR, 'assets', asset);
    assert(fs.existsSync(full), `Missing asset on disk: ${full}`);
    assert(fs.statSync(full).size > 0, `Empty asset on disk: ${full}`);
  }

  // AR-11 场景回忆墙 / 便当袋 / 小厨房只贴已提供的位图（柔光渐变 + 文字标签），不画任何矢量图形
  const vectorRe = /beginPath|lineTo|\barc\(|arcTo|bezierCurveTo|quadraticCurveTo|strokeRect|roundRect\(|\.stroke\(\)|\.fill\(\)/;
  const spriteStart = spritesContent.indexOf('// AR-11 回忆墙');
  const spriteEnd = spritesContent.indexOf('export function roundRect');
  assert(spriteStart > 0 && spriteEnd > spriteStart, 'sprites.js must contain the AR-11 drawing section');
  assert(!vectorRe.test(spritesContent.slice(spriteStart, spriteEnd)), 'AR-11 canvas drawing must only draw the provided webp art');
  // 拼图块只从已有位图（拍立得 / 水彩 / 周报贴图 / 原画）裁切，同样不画矢量图形
  const gameStart = gameContent.indexOf('// ================= AR-11 暖灯厨房一起做饭团便当 & 奶油手账回忆拼图时光');
  const gameEnd = gameContent.indexOf('// ================= AR 拍立得纪念合影系统');
  assert(gameStart > 0 && gameEnd > gameStart, 'game.js must contain the AR-11 section');
  assert(!vectorRe.test(gameContent.slice(gameStart, gameEnd)), 'AR-11 puzzle pieces must be cut from raster memories only');

  // 零暗黑赛博 / 霓虹：AR-11 样式段不得出现深色或霓虹色
  const cssStart = cssContent.indexOf('AR-11 暖灯厨房一起做饭团便当');
  assert(cssStart > 0, 'style.css must contain the AR-11 section');
  assert(
    !/neon|#0{3,6}\b|#000\b|#111|#1[0-9a-f]{5}\b|#[2-4][0-9a-f]{5}\b|rgba?\(\s*(?:[0-5]?\d)\s*,\s*(?:[0-5]?\d)\s*,\s*(?:[0-9]?\d)\s*[,)]/i.test(
      cssContent.slice(cssStart)
    ),
    'AR-11 CSS must not contain near-black / neon colors'
  );

  console.log(
    `[STATIC PASS] ${jsFiles.length} JS modules syntax-checked, ${assetRefs.size} assets verified on disk (including all 6 AR-11 images), ?v=hd26+/hd50+ synced with 0 stale hd23-hd25, 0 inline <svg>, 0 Emoji, 0 vector shapes in AR-11 canvas art / puzzle cutting, 0 dark/neon colors in AR-11 CSS.`
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

async function getState(page) {
  return page.evaluate(() => window.__AR11_DEBUG__.getState());
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
    await page.waitForTimeout(140);
  }
}

async function centerOf(page, selector) {
  const box = await page.locator(selector).boundingBox();
  assert(box, `No bounding box for ${selector}`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

// 真实指针拖放：按下 -> 分段移动 -> 松开（旋转舞台下 boundingBox 中心仍是真实落点）
async function dragBetween(page, fromSel, toSel) {
  const a = await centerOf(page, fromSel);
  const b = await centerOf(page, toSel);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 4 });
  await page.mouse.move(b.x, b.y, { steps: 4 });
  await page.mouse.up();
  await page.waitForTimeout(90);
}

// 按 UI 摆一份便当：点食材 -> 点格子（三格）-> 盖盖
async function cookViaUi(page, fillingId, sideA, sideB) {
  await ensureCardOpen(page, 'bento-kitchen-card', '#btn-bento-kitchen');
  for (const [item, slot] of [
    [`filling:${fillingId}`, 'rice'],
    [`side:${sideA}`, 'sideA'],
    [`side:${sideB}`, 'sideB']
  ]) {
    await page.click(`#bento-tray [data-tray-item="${item}"]`);
    await page.waitForTimeout(40);
    await page.click(`#bento-box [data-bento-slot="${slot}"]`);
    await page.waitForTimeout(40);
  }
  assert.equal(await page.evaluate(() => document.getElementById('btn-bento-main').disabled), false, 'Main button enables once all three slots are filled');
  await page.click('#btn-bento-main');
  await page.waitForTimeout(120);
  const run = await page.evaluate(() => window.__AR11_DEBUG__.getBentoRun());
  assert.equal(run.phase, 'done', `Closing the lid must finish the bento ${fillingId}/${sideA}/${sideB}`);
  return run.lastResult;
}

// 按 UI 解完拼图：每一步点两块交换（每次至少一块归位）
async function solveViaUiTaps(page) {
  for (let guard = 0; guard < 12; guard++) {
    const run = await page.evaluate(() => window.__AR11_DEBUG__.getPuzzleRun());
    if (run.phase !== 'play') return run;
    const i = run.order.findIndex((p, idx) => p !== idx);
    const j = run.order.indexOf(i);
    await page.click(`#puzzle-board .mp-piece[data-slot="${i}"]`);
    await page.waitForTimeout(40);
    await page.click(`#puzzle-board .mp-piece[data-slot="${j}"]`);
    await page.waitForTimeout(60);
  }
  return page.evaluate(() => window.__AR11_DEBUG__.getPuzzleRun());
}

async function pieceCanvasAudit(page) {
  return page.evaluate(() => {
    const canvases = Array.from(document.querySelectorAll('#puzzle-board .mp-piece canvas'));
    return canvases.map((cv) => {
      const c = cv.getContext('2d');
      const data = c.getImageData(0, 0, cv.width, cv.height).data;
      let opaque = 0;
      const colors = new Set();
      for (let i = 0; i < data.length; i += 16) {
        if (data[i + 3] > 200) opaque += 1;
        colors.add(`${data[i] >> 4},${data[i + 1] >> 4},${data[i + 2] >> 4}`);
      }
      return { opaque, colors: colors.size, w: cv.width };
    });
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

    // 0. DOM Emoji / 奶油手账配色 / 6 张 AR-11 贴图加载审计
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
        img.src = `./assets/${file}?v=hd26`;
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
        bentoBg: getComputedStyle(document.getElementById('bento-kitchen-card')).backgroundImage,
        puzzleBg: getComputedStyle(document.getElementById('memory-puzzle-card')).backgroundImage,
        boxBg: getComputedStyle(document.getElementById('bento-box')).backgroundImage,
        boardBg: getComputedStyle(document.getElementById('puzzle-board')).backgroundImage,
        careBtnCount: document.querySelectorAll('#pet-care-bar .care-btn').length,
        overflowX: document.documentElement.scrollWidth - window.innerWidth,
        overflowY: document.documentElement.scrollHeight - window.innerHeight
      };
    }, REQUIRED_AR11_ASSETS);
    assert.equal(initialAudit.hasEmoji, false, 'Visible DOM must contain zero Emoji characters');
    assert.equal(initialAudit.brokenImgs.length, 0, `Broken ./assets/ images: ${initialAudit.brokenImgs.join(', ')}`);
    assert(initialAudit.domImgCount >= 12, `Expected >= 12 AR-11 <img> in DOM, got ${initialAudit.domImgCount}`);
    assert.equal(initialAudit.domLoaded, true, 'Every AR-11 <img> in DOM must load (naturalWidth > 0)');
    for (const [file, info] of Object.entries(initialAudit.loadReport)) {
      assert(info.w > 0 && info.h > 0, `AR-11 image ${file} must decode, got ${JSON.stringify(info)}`);
    }
    assert(initialAudit.careBtnCount >= CARE_BTN_COUNT, `Expected >= ${CARE_BTN_COUNT} dock buttons, got ${initialAudit.careBtnCount}`);
    assert(initialAudit.overflowX <= 0 && initialAudit.overflowY <= 0, `Desktop 1440x900 overflow: ${JSON.stringify(initialAudit)}`);
    assert(/255,\s*253,\s*248/.test(initialAudit.bentoBg), `#bento-kitchen-card must use cream #FFFDF8, got ${initialAudit.bentoBg}`);
    assert(/255,\s*253,\s*248/.test(initialAudit.puzzleBg), `#memory-puzzle-card must use cream #FFFDF8, got ${initialAudit.puzzleBg}`);
    for (const [label, bg] of [
      ['#bento-box', initialAudit.boxBg],
      ['#puzzle-board', initialAudit.boardBg]
    ]) {
      const colors = Array.from(bg.matchAll(/rgba?\(([^)]+)\)/g)).map((m) => m[1].split(',').map((v) => Number(v.trim())));
      assert(colors.length >= 2, `Expected layered gradient on ${label}, got ${bg}`);
      for (const [r, g, b, a = 1] of colors) {
        if (a < 0.2) continue;
        assert(Math.min(r, g, b) >= 150, `${label} must stay cream/pastel, got rgb(${r},${g},${b})`);
      }
    }

    // 1. 新存档：空图鉴 + 空便当袋 + 空回忆墙，胶囊隐藏，回忆来源回落到手账原画
    const fresh = await getState(page);
    assert.deepEqual(fresh.bentoKitchen.discovered, {}, 'Fresh save starts with an empty bento codex');
    assert.deepEqual(fresh.bentoKitchen.bag, [], 'Fresh save starts with an empty lunch bag');
    assert.equal(fresh.bentoRun.phase, 'assemble');
    assert.deepEqual(fresh.memoryPuzzle.wall, [], 'Fresh save starts with an empty memory wall');
    assert.equal(fresh.memoryBonus.active, false);
    assert.equal(fresh.memoryWallVisual.count, 0);
    assert.equal(await page.evaluate(() => document.getElementById('kitchen-memory-pill').classList.contains('hidden')), true, 'AR-11 pill hidden on a fresh save');
    const freshSources = await page.evaluate(() => window.__AR11_DEBUG__.getMemorySources());
    if (fresh.journalSummary.stamps7d === 0) {
      assert.deepEqual(freshSources.map((s) => s.id), ['art:rainy_window', 'art:bento'], `Fresh save falls back to the provided art, got ${JSON.stringify(freshSources)}`);
    } else {
      assert(freshSources.every((s) => s.kind === 'art' || s.kind === 'week'), `Fresh sources must be fallback art / weekly only: ${JSON.stringify(freshSources)}`);
    }

    // 2. 浮层互斥：打开任意一个只保留它自己（含 AR-10 / AR-11 四张卡）
    const panelTriggers = [
      { btn: '#btn-bento-kitchen', key: 'bentoKitchen' },
      { btn: '#btn-memory-puzzle', key: 'memoryPuzzle' },
      { btn: '#btn-watercolor-easel', key: 'watercolorEasel' },
      { btn: '#btn-bento-kitchen', key: 'bentoKitchen' },
      { btn: '#btn-mailbox', key: 'mailbox' },
      { btn: '#btn-memory-puzzle', key: 'memoryPuzzle' },
      { btn: '#hud-ambience-pill', key: 'windowAmbience' },
      { btn: '#btn-bento-kitchen', key: 'bentoKitchen' },
      { btn: '#btn-pomodoro', key: 'pomodoro' },
      { btn: '#btn-memory-puzzle', key: 'memoryPuzzle' },
      { btn: '#btn-teatime', key: 'teatime' },
      { btn: '#btn-bento-kitchen', key: 'bentoKitchen' },
      { btn: '#btn-weekly-journal', key: 'weeklyJournal' },
      { btn: '#btn-memory-puzzle', key: 'memoryPuzzle' },
      { btn: '#btn-terrarium', key: 'terrarium' },
      { btn: '#btn-musicbox', key: 'goodnightMusicbox' },
      { btn: '#btn-bento-kitchen', key: 'bentoKitchen' },
      { btn: '#btn-collage-frame', key: 'collageFrame' },
      { btn: '#btn-cozy-radio', key: 'cozyRadio' },
      { btn: '#btn-memory-puzzle', key: 'memoryPuzzle' },
      { btn: '#btn-crochet-basket', key: 'crochetBasket' },
      { btn: '#btn-hot-cocoa', key: 'hotCocoa' },
      { btn: '#btn-bento-kitchen', key: 'bentoKitchen' },
      { btn: '#btn-pressed-flowers', key: 'pressedFlowers' },
      { btn: '#btn-telescope', key: 'telescope' },
      { btn: '#btn-memory-puzzle', key: 'memoryPuzzle' },
      { btn: '#btn-chat-topic', key: 'topic' },
      { btn: '#btn-bento-kitchen', key: 'bentoKitchen' },
      { btn: '#btn-shop', key: 'drawer' }
    ];
    for (const step of panelTriggers) {
      await page.click(step.btn);
      await page.waitForTimeout(110);
      const openNames = await openPanelNames(page);
      assert.deepEqual(openNames, [step.key], `Opening ${step.btn} must keep ONLY ${step.key} open, got: ${JSON.stringify(openNames)}`);
    }
    await page.click('[data-ar11-shortcut="bento"]');
    await page.waitForTimeout(150);
    assert.deepEqual(await openPanelNames(page), ['bentoKitchen'], 'Drawer bento shortcut must open only #bento-kitchen-card');
    await page.click('#btn-shop');
    await page.waitForTimeout(140);
    await page.click('[data-ar11-shortcut="puzzle"]');
    await page.waitForTimeout(150);
    assert.deepEqual(await openPanelNames(page), ['memoryPuzzle'], 'Drawer puzzle shortcut must open only #memory-puzzle-card');
    await page.click('#btn-memory-puzzle');
    await page.waitForTimeout(130);
    assert.deepEqual(await openPanelNames(page), [], 'Tapping the puzzle dock button again must close the card');

    // 3. 暖灯厨房：选食材 + 摆格子 + 盖盖 + 打包 / 一起吃
    await page.click('#btn-bento-kitchen');
    await page.waitForTimeout(140);
    assert.equal(await page.locator('#bento-summary-pill').textContent(), '图鉴 0/9 · 袋 0/3');
    assert.equal(await page.locator('#btn-bento-main').textContent(), '还差 3 格');
    assert.equal((await getState(page)).isCookingBento, true, 'She stands at the little kitchen while the card is open');
    // 配菜放进饭团格 = 摆错
    await page.click('#bento-tray [data-tray-item="side:tamago"]');
    await page.click('#bento-box [data-bento-slot="rice"]');
    await page.waitForTimeout(50);
    let bRun = await page.evaluate(() => window.__AR11_DEBUG__.getBentoRun());
    assert.equal(bRun.misplaces, 1, 'A side dish dropped into the rice slot counts as a misplace');
    assert.equal(bRun.slots.rice, '', 'Wrong item does not fill the rice slot');
    assert.equal(bRun.hand, 'side:tamago', 'Item stays in hand after a misplace');
    await page.click('#bento-tray [data-tray-item="filling:ume"]');
    assert.equal(await page.evaluate(() => document.querySelector('#bento-box [data-bento-slot="rice"]').classList.contains('is-target')), true, 'Rice slot highlights as the drop target');
    await page.click('#bento-box [data-bento-slot="rice"]');
    await page.click('#bento-tray [data-tray-item="side:tamago"]');
    await page.click('#bento-box [data-bento-slot="sideA"]');
    // 两格配菜不能一样
    await page.click('#bento-tray [data-tray-item="side:tamago"]');
    await page.click('#bento-box [data-bento-slot="sideB"]');
    await page.waitForTimeout(50);
    bRun = await page.evaluate(() => window.__AR11_DEBUG__.getBentoRun());
    assert.equal(bRun.slots.sideB, '', 'Duplicate side dish is rejected');
    assert.equal(bRun.misplaces, 2);
    await page.click('#bento-tray [data-tray-item="side:octopus"]');
    // 拖放：把西兰花直接拖进右下配菜格（替换掉手里的章鱼）
    await dragBetween(page, '#bento-tray [data-tray-item="side:broccoli"]', '#bento-box [data-bento-slot="sideB"]');
    bRun = await page.evaluate(() => window.__AR11_DEBUG__.getBentoRun());
    assert.equal(bRun.slots.sideB, 'broccoli', `Dragging a tray item onto a slot must place it, got ${JSON.stringify(bRun)}`);
    assert.equal(bRun.hand, '', 'Hand empties after placing');
    await shot(page, 'desktop_1440x900_bento_assemble.png');
    assert.equal(await page.locator('#btn-bento-main').textContent(), '盖上盖子 · 完成便当');
    const coinsBeforeBento = (await getState(page)).coins;
    await page.click('#btn-bento-main');
    await page.waitForTimeout(160);
    const afterFirstBento = await getState(page);
    assert.equal(afterFirstBento.bentoRun.phase, 'done');
    assert.equal(afterFirstBento.bentoKitchen.pending, 'ume__tamago+broccoli', 'Finished bento waits to be packed or shared');
    assert.equal(afterFirstBento.bentoKitchen.discovered['ume__tamago+broccoli'].count, 1, 'Recipe enters the codex');
    assert.equal(afterFirstBento.bentoStats.discovered, 1);
    assert(afterFirstBento.coins >= coinsBeforeBento + 26, 'First recipe awards >= 26 coins');
    assert(afterFirstBento.emote.includes('梅子田园清爽便当'), `Expected bento reaction, got ${afterFirstBento.emote}`);
    assert.equal(afterFirstBento.journalSummary.bentos7d, 1, 'Weekly journal records the bento');
    assert(afterFirstBento.ar11Audio.bentoLidChimeCount >= 1, `Lid chime must play, got ${JSON.stringify(afterFirstBento.ar11Audio)}`);
    const doneDom = await page.evaluate(() => ({
      finished: !document.getElementById('bento-box-finished').classList.contains('hidden'),
      finishedLoaded: document.getElementById('bento-box-finished').naturalWidth > 0,
      main: document.getElementById('btn-bento-main').textContent,
      share: !document.getElementById('btn-bento-share').classList.contains('hidden'),
      chipsDisabled: Array.from(document.querySelectorAll('#bento-tray .bento-tray-chip')).every((c) => c.disabled)
    }));
    assert.deepEqual(doneDom, { finished: true, finishedLoaded: true, main: '打包进便当袋', share: true, chipsDisabled: true }, `Done state DOM: ${JSON.stringify(doneDom)}`);
    await page.waitForTimeout(250);
    await shot(page, 'desktop_1440x900_bento_done.png');
    // 已盖盖的便当跨刷新保留
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(340);
    const reloadedPending = await getState(page);
    assert.equal(reloadedPending.bentoRun.phase, 'done', 'A lidded bento survives reload');
    assert.deepEqual(reloadedPending.bentoRun.slots, { rice: 'ume', sideA: 'tamago', sideB: 'broccoli' });
    await page.click('#btn-bento-kitchen');
    await page.waitForTimeout(140);
    await page.click('#btn-bento-main');
    await page.waitForTimeout(140);
    const afterPack = await getState(page);
    assert.deepEqual(afterPack.bentoKitchen.bag.map((b) => b.recipeId), ['ume__tamago+broccoli'], 'Packing moves the bento into the lunch bag');
    assert.equal(afterPack.bentoKitchen.pending, '');
    assert.equal(afterPack.bentoRun.phase, 'assemble', 'Kitchen resets for the next bento');
    assert.equal(afterPack.bentoDeskVisual.bagCount, 1, 'Desk shows the packed lunch');
    const packDom = await page.evaluate(() => ({
      badge: document.getElementById('bento-bag-badge').textContent,
      badgeShown: !document.getElementById('bento-bag-badge').classList.contains('hidden'),
      bagSlots: document.querySelectorAll('#bento-bag-row .bento-bag-slot.is-packed').length,
      pill: !document.getElementById('kitchen-memory-pill').classList.contains('hidden'),
      seg: !document.getElementById('km-seg-bento').classList.contains('hidden'),
      tag: document.getElementById('km-pill-bento').textContent,
      goShift: !document.getElementById('btn-bento-go-shift').classList.contains('hidden')
    }));
    assert.deepEqual(packDom, { badge: '1', badgeShown: true, bagSlots: 1, pill: true, seg: true, tag: '1', goShift: true }, `After packing: ${JSON.stringify(packDom)}`);

    // 一起吃掉：饱腹 + 亲密，不进便当袋
    const beforeShare = await getState(page);
    await cookViaUi(page, 'salmon', 'tamago', 'octopus');
    await page.click('#btn-bento-share');
    await page.waitForTimeout(140);
    const afterShare = await getState(page);
    assert.equal(afterShare.bentoKitchen.totalShared, 1, 'Sharing counts');
    assert.equal(afterShare.bentoKitchen.bag.length, 1, 'Shared bento does not enter the bag');
    assert(afterShare.hunger >= Math.min(100, beforeShare.hunger), 'Eating together does not lower hunger');
    assert(afterShare.emote.includes('一起吃'), `Expected share reaction, got ${afterShare.emote}`);

    // 第三份打包；其余 6 款走调试接口一次性解锁（全部一起吃掉），图鉴 9/9
    await cookViaUi(page, 'tuna', 'octopus', 'broccoli');
    await page.click('#btn-bento-main');
    await page.waitForTimeout(120);
    const specs = await page.evaluate(() => window.__AR11_DEBUG__.getSpecs());
    assert.equal(specs.recipes.length, 9, '3 fillings x 3 side pairs = 9 recipes');
    for (const r of specs.recipes) {
      const st = await getState(page);
      if (st.bentoKitchen.discovered[r.id]) continue;
      const res = await page.evaluate(([f, a, b]) => window.__AR11_DEBUG__.cookRecipe(f, a, b), [r.fillingId, r.sideIds[0], r.sideIds[1]]);
      assert.equal(res.ok, true, `cookRecipe ${r.id} failed: ${JSON.stringify(res)}`);
      await page.evaluate(() => window.__AR11_DEBUG__.shareBento());
    }
    await cookViaUi(page, 'ume', 'tamago', 'octopus');
    await page.click('#btn-bento-main');
    await page.waitForTimeout(120);
    const fullCodex = await getState(page);
    assert.equal(fullCodex.bentoStats.discovered, 9, 'All 9 bento recipes discovered');
    assert.deepEqual(fullCodex.bentoKitchen.bag.map((b) => b.recipeId), ['ume__tamago+broccoli', 'tuna__octopus+broccoli', 'ume__tamago+octopus']);
    assert.equal(await page.locator('#bento-summary-pill').textContent(), '图鉴 9/9 · 袋 3/3');
    assert.equal(await page.evaluate(() => document.querySelectorAll('#bento-codex-grid .bento-codex-slot.collected').length), 9);
    // 便当袋满：盖好的第 4 份只能一起吃
    await cookViaUi(page, 'salmon', 'tamago', 'broccoli');
    assert.equal(await page.evaluate(() => document.getElementById('btn-bento-main').disabled), true, 'Pack button disables when the bag is full');
    assert.equal(await page.locator('#btn-bento-main').textContent(), '便当袋已满');
    const packFull = await page.evaluate(() => window.__AR11_DEBUG__.packBento());
    assert.equal(packFull.reason, 'bag_full');
    await page.click('#btn-bento-share');
    await page.waitForTimeout(120);
    await page.waitForTimeout(250);
    await shot(page, 'desktop_1440x900_bento_codex.png');

    // 刷新后持久化
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(340);
    const reloadedBento = await getState(page);
    assert.equal(reloadedBento.bentoStats.discovered, 9, 'Codex persists across reload');
    assert.equal(reloadedBento.bentoKitchen.bag.length, 3, 'Lunch bag persists across reload');
    assert.equal(reloadedBento.bentoRun.phase, 'assemble', 'Assembly in progress is runtime only');
    assert(reloadedBento.bentoKitchen.totalBentos >= 11, `Bento total persists, got ${reloadedBento.bentoKitchen.totalBentos}`);

    // 4. 幸存者班次：带最早打包的便当出发（每份守护 1 个班次）
    await page.click('#btn-bento-kitchen');
    await page.waitForTimeout(140);
    await page.click('#btn-bento-go-shift');
    await page.waitForTimeout(240);
    const surv1 = await getState(page);
    assert.equal(surv1.gameMode, 'survivor');
    assert.equal(surv1.shiftLunch.recipeId, 'ume__tamago+broccoli', 'Shift opens the oldest packed bento');
    assert.equal(surv1.bentoKitchen.bag.length, 2, 'Opening the lunch consumes it from the bag');
    assert.equal(surv1.lunchWard.active, true);
    assert(Math.abs(surv1.lunchWard.regenPerSec - 1.7) < 1e-6, `Ume + tamago + broccoli = 1.7 hp/s, got ${surv1.lunchWard.regenPerSec}`);
    const sm1 = surv1.survivorMetrics;
    assert(
      Math.abs(sm1.effectiveHpRegenPerSec - (sm1.botanicalBlessings.hpRegenPerSec + (sm1.pressedFlowerBlessing.active ? sm1.pressedFlowerBlessing.hpRegenPerSec : 0) + 1.7)) < 0.02,
      `Regen must include the lunch, got ${JSON.stringify(sm1.effectiveHpRegenPerSec)}`
    );
    assert(surv1.emote.includes('梅子田园清爽便当'), `She announces the lunch, got ${surv1.emote}`);
    const stripHasBento = await page.evaluate(() => {
      const strip = document.getElementById('surv-skill-strip');
      return Boolean(strip && !strip.classList.contains('hidden') && strip.innerHTML.includes('bento_box_finished.webp'));
    });
    assert(stripHasBento, 'Survivor skill strip must show the bento_box_finished.webp badge');
    // 低血饭团救急：35% 以下回 35% 最大体力，仅 1 次
    const highHp = await page.evaluate(() => window.__AR11_DEBUG__.rescueForTest(9999));
    assert.equal(highHp.rescued, false, 'No rescue while HP is healthy');
    const rescue = await page.evaluate(() => window.__AR11_DEBUG__.rescueForTest(Math.floor(window.__AR11_DEBUG__.getState().maxHp * 0.2)));
    assert.equal(rescue.rescued, true, 'Low HP triggers the onigiri rescue');
    assert(
      Math.abs(rescue.hp - Math.min(rescue.maxHp, rescue.hpBefore + Math.round(rescue.maxHp * 0.35))) < 1e-6,
      `Rescue heals 35% max HP, got ${JSON.stringify(rescue)}`
    );
    assert.equal(rescue.lunch.rescuesLeft, 0);
    assert.equal((await page.evaluate(() => window.__AR11_DEBUG__.rescueForTest(5))).rescued, false, 'Rescue charges run out');
    await page.evaluate(() => window.__AR11_DEBUG__.setHpForTest(9999));
    assert((await getState(page)).ar11Audio.bentoRescueChimeCount >= 1, 'Rescue plays its chime');
    // 同一班次内再点一次打工不再消耗便当
    await page.click('.mode-btn[data-mode="survivor"]');
    await page.waitForTimeout(200);
    const survAgain = await getState(page);
    assert.equal(survAgain.bentoKitchen.bag.length, 2, 'Restarting the same shift does not eat another bento');
    assert.equal(survAgain.shiftLunch.recipeId, 'ume__tamago+broccoli');
    await page.click('.mode-btn[data-mode="pet"]');
    await page.waitForTimeout(220);
    const backPet = await getState(page);
    assert.equal(backPet.shiftLunch, null, 'Lunch is finished when the shift ends');
    assert.equal(backPet.lunchWard.active, false);
    await page.click('.mode-btn[data-mode="survivor"]');
    await page.waitForTimeout(220);
    const surv2 = await getState(page);
    assert.equal(surv2.shiftLunch.recipeId, 'tuna__octopus+broccoli', 'Next shift opens the next bento');
    assert.equal(surv2.shiftLunch.rescuesLeft, 2, 'Tuna mayo bento carries 2 rescues');
    assert.equal(surv2.bentoKitchen.bag.length, 1);
    await page.click('.mode-btn[data-mode="pet"]');
    await page.waitForTimeout(220);

    // 5. 回忆拼图：真实拍立得 + AR-10 水彩 + 七日心情周报
    await page.evaluate(() => window.__AR11_DEBUG__.placePlayerForTest(0.5));
    await page.click('#btn-photo-snap');
    await page.waitForFunction((k) => (JSON.parse(localStorage.getItem(k) || '[]') || []).length >= 1, ALBUM_KEY, { timeout: 6000 });
    await page.waitForTimeout(200);
    await page.evaluate(() => document.getElementById('btn-polaroid-close')?.click());
    await page.evaluate(() => window.__AR10_DEBUG__.paintCombo('whale_plush', 'peach_cream'));
    await page.waitForTimeout(120);
    await page.click('#btn-memory-puzzle');
    await page.waitForTimeout(160);
    const prepared = await page.evaluate(() => window.__AR11_DEBUG__.prepareSources());
    assert(prepared.every((p) => p.ready), `All memory sources must render, got ${JSON.stringify(prepared)}`);
    const sources = await page.evaluate(() => window.__AR11_DEBUG__.getMemorySources());
    const kinds = sources.map((s) => s.kind);
    assert(kinds.includes('photo') && kinds.includes('paint') && kinds.includes('week'), `Sources must come from the save (photo/paint/week), got ${JSON.stringify(sources)}`);
    assert(!kinds.includes('art'), 'With >= 3 real memories the fallback art is not needed');
    await page.waitForTimeout(150);
    const chipAudit = await page.evaluate(() =>
      Array.from(document.querySelectorAll('#puzzle-source-row .puzzle-source-chip')).map((c) => {
        const img = c.querySelector('img');
        return { id: c.dataset.sourceId, loaded: img.complete && img.naturalWidth > 0, src: (img.getAttribute('src') || '').slice(0, 16) };
      })
    );
    assert.equal(chipAudit.length, sources.length, 'Each source renders a chip');
    assert(chipAudit.every((c) => c.loaded && c.src.startsWith('data:image/')), `Chip thumbnails must be generated from the memories, got ${JSON.stringify(chipAudit)}`);
    const photoSrc = sources.find((s) => s.kind === 'photo');
    await page.click(`#puzzle-source-row [data-source-id="${photoSrc.id}"]`);
    await page.waitForTimeout(80);
    assert.equal(await page.evaluate((id) => document.querySelector(`#puzzle-source-row [data-source-id="${id}"]`).classList.contains('active'), photoSrc.id), true);
    await page.click('#btn-puzzle-main');
    await page.waitForTimeout(200);
    let pRun = await page.evaluate(() => window.__AR11_DEBUG__.getPuzzleRun());
    assert.equal(pRun.phase, 'play', 'Shuffle starts the puzzle');
    assert.equal(pRun.sourceId, photoSrc.id);
    assert.equal(pRun.order.length, 9);
    assert(pRun.order.filter((p, i) => p !== i).length >= 5, 'At least 5 pieces start out of place');
    const pieces = await pieceCanvasAudit(page);
    assert.equal(pieces.length, 9, '9 piece canvases');
    assert(pieces.every((p) => p.opaque > 50), `Every piece must be drawn, got ${JSON.stringify(pieces)}`);
    assert(pieces.filter((p) => p.colors > 4).length >= 6, `Pieces must be cut from the real photo, got ${JSON.stringify(pieces)}`);
    // 拖放交换一块
    const firstWrong = pRun.order.findIndex((p, i) => p !== i);
    const target = pRun.order.indexOf(firstWrong);
    await dragBetween(page, `#puzzle-board .mp-piece[data-slot="${target}"]`, `#puzzle-board .mp-piece[data-slot="${firstWrong}"]`);
    pRun = await page.evaluate(() => window.__AR11_DEBUG__.getPuzzleRun());
    assert.equal(pRun.order[firstWrong], firstWrong, `Drag-swap must put the piece in place, got ${JSON.stringify(pRun.order)}`);
    assert.equal(pRun.moves, 1);
    // 点选交换：选中一块
    const nextWrong = pRun.order.findIndex((p, i) => p !== i);
    if (nextWrong >= 0) {
      await page.click(`#puzzle-board .mp-piece[data-slot="${nextWrong}"]`);
      await page.waitForTimeout(50);
      assert.equal(await page.evaluate((i) => document.querySelector(`#puzzle-board .mp-piece[data-slot="${i}"]`).classList.contains('is-selected'), nextWrong), true, 'Tapped piece shows as selected');
      await page.waitForTimeout(150);
      await shot(page, 'desktop_1440x900_puzzle_play.png');
      await page.click(`#puzzle-board .mp-piece[data-slot="${nextWrong}"]`);
      await page.waitForTimeout(50);
    }
    const coinsBeforePuzzle = (await getState(page)).coins;
    pRun = await solveViaUiTaps(page);
    assert.equal(pRun.phase, 'done', 'Tap-swapping solves the puzzle');
    const afterPuzzle = await getState(page);
    assert.equal(afterPuzzle.memoryPuzzle.wall.length, 1, 'Completed puzzle goes onto the memory wall');
    assert.equal(afterPuzzle.memoryPuzzle.wall[0].sourceId, photoSrc.id);
    assert(/^data:image\/jpeg;base64,/.test(afterPuzzle.memoryPuzzle.wall[0].thumb), 'Wall keeps a small thumbnail of the memory');
    assert.equal(afterPuzzle.memoryBonus.distinct, 1);
    assert.equal(afterPuzzle.memoryBonus.coinLuckPct, 0.02);
    assert(afterPuzzle.coins >= coinsBeforePuzzle + 22, 'New memory awards >= 22 coins');
    assert.equal(afterPuzzle.journalSummary.puzzles7d, 1, 'Weekly journal records the puzzle');
    assert(afterPuzzle.ar11Audio.puzzleSnapCount >= 2 && afterPuzzle.ar11Audio.puzzleCompleteChimeCount >= 1, `Puzzle audio: ${JSON.stringify(afterPuzzle.ar11Audio)}`);
    await page.waitForTimeout(150);
    const wallDom = await page.evaluate(() => ({
      hung: document.querySelectorAll('#puzzle-wall-grid .puzzle-wall-slot.is-hung').length,
      thumbLoaded: Array.from(document.querySelectorAll('#puzzle-wall-grid .puzzle-wall-thumb')).every((im) => im.complete && im.naturalWidth > 0),
      summary: document.getElementById('puzzle-summary-pill').textContent,
      seg: !document.getElementById('km-seg-puzzle').classList.contains('hidden'),
      goShift: !document.getElementById('btn-puzzle-go-shift').classList.contains('hidden')
    }));
    assert.deepEqual(wallDom, { hung: 1, thumbLoaded: true, summary: '回忆墙 1/6', seg: true, goShift: true }, `Memory wall DOM: ${JSON.stringify(wallDom)}`);
    await page.waitForTimeout(250);
    await shot(page, 'desktop_1440x900_puzzle_done.png');

    // 水彩与周报两段回忆（UI 选来源 + 调试接口快速解开）
    for (const kind of ['paint', 'week']) {
      const src = sources.find((s) => s.kind === kind);
      await page.click('#btn-puzzle-main');
      await page.waitForTimeout(60);
      await page.click(`#puzzle-source-row [data-source-id="${src.id}"]`);
      await page.waitForTimeout(60);
      await page.click('#btn-puzzle-main');
      await page.waitForTimeout(160);
      assert.equal((await page.evaluate(() => window.__AR11_DEBUG__.getPuzzleRun())).sourceId, src.id);
      const solved = await page.evaluate(() => window.__AR11_DEBUG__.solvePuzzle());
      assert.equal(solved.completed, true, `${kind} puzzle completes`);
    }
    // 继续画水彩、再拍一张合影，凑满 6 段不同回忆 + 第 7 段（回忆墙只挂最近 6 段）
    await page.evaluate(() => window.__AR10_DEBUG__.paintCombo('rainy_window', 'matcha_latte'));
    await page.evaluate(() => window.__AR10_DEBUG__.paintCombo('potted_plant', 'mist_blue'));
    await page.click('#btn-memory-puzzle');
    await page.waitForTimeout(100);
    for (const id of ['paint:rainy_window__matcha_latte', 'paint:potted_plant__mist_blue']) {
      if (await page.evaluate(() => document.getElementById('memory-puzzle-card').classList.contains('hidden'))) {
        await page.click('#btn-memory-puzzle');
        await page.waitForTimeout(100);
      }
      const st = await page.evaluate((sid) => window.__AR11_DEBUG__.startPuzzle(sid), id);
      assert.equal(st.ok, true, `start ${id}: ${JSON.stringify(st)}`);
      await page.evaluate(() => window.__AR11_DEBUG__.solvePuzzle());
    }
    await page.evaluate(() => window.__AR11_DEBUG__.placePlayerForTest(0.5));
    await page.click('#btn-photo-snap');
    await page.waitForFunction((k) => (JSON.parse(localStorage.getItem(k) || '[]') || []).length >= 2, ALBUM_KEY, { timeout: 6000 });
    await page.waitForTimeout(200);
    await page.evaluate(() => document.getElementById('btn-polaroid-close')?.click());
    await page.click('#btn-memory-puzzle');
    await page.waitForTimeout(140);
    const newPhoto = (await page.evaluate(() => window.__AR11_DEBUG__.getMemorySources())).find((s) => s.kind === 'photo' && s.id !== photoSrc.id);
    assert(newPhoto, 'Second polaroid becomes a new memory source');
    assert.equal((await page.evaluate((sid) => window.__AR11_DEBUG__.startPuzzle(sid), newPhoto.id)).ok, true);
    await page.evaluate(() => window.__AR11_DEBUG__.solvePuzzle());
    const sixDistinct = await getState(page);
    assert.equal(sixDistinct.memoryBonus.distinct, 6, `Expected 6 distinct memories, got ${JSON.stringify(sixDistinct.memoryBonus)}`);
    assert.equal(sixDistinct.memoryBonus.coinLuckPct, 0.15, `6/6 memories = +15% coins, got ${sixDistinct.memoryBonus.coinLuckPct}`);
    assert.equal(sixDistinct.memoryPuzzle.wall.length, 6);
    await page.evaluate(() => window.__AR10_DEBUG__.paintCombo('rainy_window', 'peach_cream'));
    if (await page.evaluate(() => document.getElementById('memory-puzzle-card').classList.contains('hidden'))) {
      await page.click('#btn-memory-puzzle');
      await page.waitForTimeout(100);
    }
    assert.equal((await page.evaluate(() => window.__AR11_DEBUG__.startPuzzle('paint:rainy_window__peach_cream'))).ok, true);
    await page.evaluate(() => window.__AR11_DEBUG__.solvePuzzle());
    const seven = await getState(page);
    assert.equal(seven.memoryPuzzle.wall.length, 6, 'Memory wall keeps the 6 most recent puzzles');
    assert.equal(seven.memoryPuzzle.wall[5].sourceId, 'paint:rainy_window__peach_cream', 'Newest puzzle hangs last');
    assert.equal(seven.memoryPuzzle.wall.some((w) => w.sourceId === photoSrc.id), false, 'Oldest puzzle rotates off the wall');
    assert.equal(seven.memoryBonus.distinctAll, 7);
    assert.equal(seven.memoryBonus.coinLuckPct, 0.15, 'Coin bonus caps at 6 memories');
    // 重拼同一段回忆不算新回忆
    assert.equal((await page.evaluate(() => window.__AR11_DEBUG__.startPuzzle('paint:rainy_window__peach_cream'))).ok, true);
    const replay = await page.evaluate(() => window.__AR11_DEBUG__.solvePuzzle());
    assert.equal(replay.isNewMemory, false, 'Replaying a memory is not a new memory');
    assert.equal((await getState(page)).memoryPuzzle.completed['paint:rainy_window__peach_cream'].count, 2);
    await page.waitForTimeout(250);
    await shot(page, 'desktop_1440x900_puzzle_wall.png');

    // 场景回忆墙 + 桌面便当袋：关卡后点击即打开对应卡片
    await page.click('#btn-puzzle-close');
    await page.waitForTimeout(500);
    const sceneState = await getState(page);
    assert.equal(sceneState.memoryWallVisual.count, 6);
    assert.equal(sceneState.memoryWallVisual.items.length, 3, 'Scene board pins the 3 most recent memories');
    assert(sceneState.memoryWallVisual.items.every((it) => it.loaded), 'Scene memory thumbnails load');
    await page.evaluate(() => window.__AR11_DEBUG__.placePlayerForTest(0.36));
    await page.waitForTimeout(300);
    await shot(page, 'desktop_1440x900_scene_wall.png');
    const layouts = await page.evaluate(() => window.__AR11_DEBUG__.getLayouts());
    assert(layouts.memoryWall.x < layouts.W * 0.15 && layouts.memoryWall.y + layouts.memoryWall.s < layouts.H * 0.68, `Memory wall hangs on the left wall above the desk: ${JSON.stringify(layouts)}`);
    await page.mouse.click(layouts.memoryWall.x + layouts.memoryWall.s / 2, layouts.memoryWall.y + layouts.memoryWall.s / 2);
    await page.waitForTimeout(150);
    assert.deepEqual(await openPanelNames(page), ['memoryPuzzle'], 'Tapping the scene memory wall opens the puzzle card');
    await page.click('#btn-puzzle-close');
    await page.waitForTimeout(120);
    await page.evaluate(() => window.__AR11_DEBUG__.placePlayerForTest(0.3));
    await page.mouse.click(layouts.bentoDesk.x, layouts.bentoDesk.y - 20);
    await page.waitForTimeout(150);
    assert.deepEqual(await openPanelNames(page), ['bentoKitchen'], 'Tapping the desk lunch bag opens the kitchen card');
    await page.click('#btn-bento-close');
    await page.waitForTimeout(120);

    // 幸存者「回忆拾光」金币加成（仅打工生效）
    await page.click('#btn-memory-puzzle');
    await page.waitForTimeout(140);
    await page.click('#btn-puzzle-go-shift');
    await page.waitForTimeout(240);
    const survMem = await getState(page);
    assert.equal(survMem.gameMode, 'survivor');
    assert(Math.abs(survMem.survivorMetrics.memoryCoinMult - 1.15) < 1e-6, `Memory coin mult must be 1.15, got ${survMem.survivorMetrics.memoryCoinMult}`);
    const stripHasPuzzle = await page.evaluate(() => {
      const strip = document.getElementById('surv-skill-strip');
      return Boolean(strip && strip.innerHTML.includes('puzzle_piece_memory.webp'));
    });
    assert(stripHasPuzzle, 'Survivor skill strip must show the puzzle_piece_memory.webp badge');
    assert.equal(survMem.shiftLunch.recipeId, 'ume__tamago+octopus', 'Third packed bento rides along');
    await page.click('.mode-btn[data-mode="pet"]');
    await page.waitForTimeout(220);
    assert.equal((await getState(page)).survivorMetrics.memoryCoinMult, 1, 'Coin bonus only applies during survivor shifts');

    // 刷新后持久化
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(400);
    const reloadedMem = await getState(page);
    assert.equal(reloadedMem.memoryPuzzle.wall.length, 6, 'Memory wall persists across reload');
    assert(reloadedMem.memoryPuzzle.wall.every((w) => /^data:image\/jpeg;base64,/.test(w.thumb)), 'Wall thumbnails persist');
    assert.equal(reloadedMem.memoryBonus.distinctAll, 7);
    assert(reloadedMem.memoryPuzzle.totalPuzzles >= 8);
    assert.equal(reloadedMem.puzzleRun.phase, 'idle', 'Puzzle in progress is runtime only');
    assert.equal(reloadedMem.bentoKitchen.bag.length, 0, 'All three packed bentos were eaten on shifts');
    await page.waitForTimeout(200);
    assert((await getState(page)).memoryWallVisual.items.every((it) => it.loaded), 'Scene wall redraws after reload');

    // 6. 七日心情周报联动
    await page.click('#btn-weekly-journal');
    await page.waitForTimeout(180);
    const journal = await page.evaluate(() => ({
      summary: window.__AR11_DEBUG__.getState().journalSummary,
      cardText: document.getElementById('weekly-journal-card')?.textContent || ''
    }));
    assert(journal.summary.bentos7d >= 11, `Expected bentos7d >= 11, got ${journal.summary.bentos7d}`);
    assert(journal.summary.puzzles7d >= 8, `Expected puzzles7d >= 8, got ${journal.summary.puzzles7d}`);
    assert.equal(journal.summary.cumulative.bentoRecipes, 9);
    assert.equal(journal.summary.cumulative.memoryWallCount, 6);
    assert(journal.summary.cumulative.totalBentos >= 11 && journal.summary.cumulative.totalPuzzles >= 8);
    assert(
      journal.cardText.includes('便当') && journal.cardText.includes('拼图') && journal.cardText.includes('图鉴 9/9') && journal.cardText.includes('回忆墙 6/6'),
      `Weekly journal card must render 便当 / 拼图 metrics, got ${journal.cardText}`
    );
    await page.click('#btn-weekly-journal');
    await page.waitForTimeout(120);

    // 桌面 1440x900：21 键船坞零挤压，AR-11 胶囊不新开一行
    const desktopDock = await page.evaluate(() => {
      const joy = document.getElementById('joystick-zone').getBoundingClientRect();
      const care = document.getElementById('pet-care-bar').getBoundingClientRect();
      const act = document.querySelector('.action-zone').getBoundingClientRect();
      return { joyRight: joy.right, careLeft: care.left, careRight: care.right, actLeft: act.left };
    });
    assert(desktopDock.joyRight <= desktopDock.careLeft + 2 && desktopDock.careRight <= desktopDock.actLeft + 2, `1440x900 dock overlap: ${JSON.stringify(desktopDock)}`);

    const pillRowAudit = () =>
      page.evaluate(() => {
        const pill = document.getElementById('kitchen-memory-pill');
        const visible = (b) => !b.classList.contains('hidden') && b.offsetParent !== null;
        // 同一行内胶囊高度不同、垂直居中会让 offsetTop 相差 1~3px：按 6px 容差聚类计行数
        const rows = () => {
          const tops = Array.from(document.querySelectorAll('#hud-ambience-row > button'))
            .filter(visible)
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
        const others = Array.from(document.querySelectorAll('#hud-ambience-row > button')).filter((b) => b !== pill && visible(b));
        const shown = visible(pill);
        const mid = (b) => b.offsetTop + b.offsetHeight / 2;
        const sharesRow = shown ? others.some((b) => Math.abs(mid(b) - mid(pill)) <= 6) : true;
        const layout = Array.from(document.querySelectorAll('#hud-ambience-row > button')).filter(visible).map((b) => `${b.id}@${b.offsetTop}+${b.offsetHeight}`);
        const withPill = rows();
        const prevDisplay = pill.style.display;
        pill.style.display = 'none';
        const withoutPill = rows();
        pill.style.display = prevDisplay;
        return { shown, sharesRow, withPill, withoutPill, layout };
      });
    const deskPill = await pillRowAudit();
    assert.equal(deskPill.shown, true, '1440x900 shows the AR-11 pill');
    const deskPillClearance = await page.evaluate(() => {
      const pill = document.getElementById('kitchen-memory-pill').getBoundingClientRect();
      const row = document.getElementById('hud-ambience-row').getBoundingClientRect();
      const joy = document.getElementById('joystick-zone').getBoundingClientRect();
      return { pillRight: pill.right, rowRight: row.right, pillBottom: pill.bottom, joyTop: joy.top };
    });
    assert(
      deskPillClearance.pillRight <= deskPillClearance.rowRight + 1 && deskPillClearance.pillBottom < deskPillClearance.joyTop - 200,
      `AR-11 pill must stay inside the pill column far above the joystick on 1440x900: ${JSON.stringify({ deskPill, deskPillClearance })}`
    );

    // 7. 移动端 390x844（竖屏强制横置，真实点按 + 拖放）
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);
    await page.evaluate(() => document.getElementById('btn-bento-kitchen').click());
    await page.waitForTimeout(220);
    await page.click('#bento-tray [data-tray-item="filling:salmon"]');
    await page.waitForTimeout(60);
    await page.click('#bento-box [data-bento-slot="rice"]');
    await page.waitForTimeout(60);
    let mRun = await page.evaluate(() => window.__AR11_DEBUG__.getBentoRun());
    assert.equal(mRun.slots.rice, 'salmon', `Tap-place must work on 390x844 (rotated stage), got ${JSON.stringify(mRun)}`);
    await dragBetween(page, '#bento-tray [data-tray-item="side:octopus"]', '#bento-box [data-bento-slot="sideA"]');
    mRun = await page.evaluate(() => window.__AR11_DEBUG__.getBentoRun());
    assert.equal(mRun.slots.sideA, 'octopus', `Drag-place must work on the rotated stage, got ${JSON.stringify(mRun)}`);
    const portraitBento = await page.evaluate(() => ({
      overflowX: document.documentElement.scrollWidth - window.innerWidth,
      overflowY: document.documentElement.scrollHeight - window.innerHeight,
      open: !document.getElementById('bento-kitchen-card').classList.contains('hidden'),
      hasEmoji: /\p{Extended_Pictographic}/u.test(document.body.innerText || '')
    }));
    assert(portraitBento.open && !portraitBento.hasEmoji, `390x844 bento card: ${JSON.stringify(portraitBento)}`);
    assert(portraitBento.overflowX <= 0 && portraitBento.overflowY <= 0, `390x844 bento overflow: ${JSON.stringify(portraitBento)}`);
    await page.waitForTimeout(200);
    await shot(page, 'mobile_390x844_bento.png');

    await page.evaluate(() => document.getElementById('btn-memory-puzzle').click());
    await page.waitForTimeout(220);
    await page.click('#btn-puzzle-main');
    await page.waitForTimeout(220);
    let mp = await page.evaluate(() => window.__AR11_DEBUG__.getPuzzleRun());
    assert.equal(mp.phase, 'play', 'Puzzle starts on 390x844');
    const w1 = mp.order.findIndex((p, i) => p !== i);
    const t1 = mp.order.indexOf(w1);
    await page.click(`#puzzle-board .mp-piece[data-slot="${w1}"]`);
    await page.waitForTimeout(60);
    await page.click(`#puzzle-board .mp-piece[data-slot="${t1}"]`);
    await page.waitForTimeout(80);
    mp = await page.evaluate(() => window.__AR11_DEBUG__.getPuzzleRun());
    assert.equal(mp.order[w1], w1, `Tap-swap must work on 390x844, got ${JSON.stringify(mp.order)}`);
    const w2 = mp.order.findIndex((p, i) => p !== i);
    if (w2 >= 0) {
      const t2 = mp.order.indexOf(w2);
      await dragBetween(page, `#puzzle-board .mp-piece[data-slot="${t2}"]`, `#puzzle-board .mp-piece[data-slot="${w2}"]`);
      mp = await page.evaluate(() => window.__AR11_DEBUG__.getPuzzleRun());
      assert.equal(mp.order[w2], w2, `Drag-swap must work on the rotated stage, got ${JSON.stringify(mp.order)}`);
    }
    const portraitPuzzle = await page.evaluate(() => ({
      overflowX: document.documentElement.scrollWidth - window.innerWidth,
      overflowY: document.documentElement.scrollHeight - window.innerHeight,
      mpOpen: !document.getElementById('memory-puzzle-card').classList.contains('hidden'),
      bkOpen: !document.getElementById('bento-kitchen-card').classList.contains('hidden')
    }));
    assert(portraitPuzzle.mpOpen && !portraitPuzzle.bkOpen, '#memory-puzzle-card must open on 390x844 and close #bento-kitchen-card');
    assert(portraitPuzzle.overflowX <= 0 && portraitPuzzle.overflowY <= 0, `390x844 puzzle overflow: ${JSON.stringify(portraitPuzzle)}`);
    await page.waitForTimeout(200);
    await shot(page, 'mobile_390x844_puzzle.png');

    // 8. 844x390 横屏：卡片 / 顶部 HUD / 21 键船坞 / 胶囊行 零重叠
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(280);
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
        const btnRects = Array.from(document.querySelectorAll('#pet-care-bar .care-btn')).map((b) => b.getBoundingClientRect());
        // AR-12 起窄屏船坞改为两排分组：逐对检查二维矩形是否相交
        let dockOverlap = 0;
        for (let i = 0; i < btnRects.length; i++) {
          for (let j = i + 1; j < btnRects.length; j++) {
            const ix = Math.min(btnRects[i].right, btnRects[j].right) - Math.max(btnRects[i].left, btnRects[j].left);
            const iy = Math.min(btnRects[i].bottom, btnRects[j].bottom) - Math.max(btnRects[i].top, btnRects[j].top);
            if (ix > 0 && iy > 0) dockOverlap = Math.max(dockOverlap, Math.min(ix, iy));
          }
        }
        return {
          overflowX: document.documentElement.scrollWidth - window.innerWidth,
          overflowY: document.documentElement.scrollHeight - window.innerHeight,
          cardOpen: !document.getElementById(id).classList.contains('hidden'),
          careBtnCount: btnRects.length,
          dockOverlap,
          profileRight: prof.right,
          cardLeft: card.left,
          cardBottom: card.bottom,
          actTop: act.top,
          switcherRight: sw.right,
          hudRightLeft: hr.left,
          joyTop: joy.top,
          joyRight: joy.right,
          careLeft: care.left,
          careRight: care.right,
          actLeft: act.left,
          pillBottom: pills.reduce((m, b) => Math.max(m, b.getBoundingClientRect().bottom), 0)
        };
      }, cardId);
    for (const [cardId, btn, shotName] of [
      ['memory-puzzle-card', '#btn-memory-puzzle', 'mobile_844x390_puzzle.png'],
      ['bento-kitchen-card', '#btn-bento-kitchen', 'mobile_844x390_bento.png']
    ]) {
      if (await page.evaluate((id) => document.getElementById(id).classList.contains('hidden'), cardId)) {
        await page.click(btn);
        await page.waitForTimeout(180);
      }
      const la = await landscapeAudit(cardId);
      assert(la.cardOpen, `${cardId} must be open on 844x390`);
      assert(la.careBtnCount >= CARE_BTN_COUNT, `Expected >= ${CARE_BTN_COUNT} dock buttons on 844x390`);
      assert(la.dockOverlap <= 0.5, `Dock buttons must not overlap each other: ${JSON.stringify(la)}`);
      assert(la.overflowX <= 0 && la.overflowY <= 0, `844x390 overflow: ${JSON.stringify(la)}`);
      assert(la.profileRight <= la.cardLeft, `${cardId} overlaps profile on 844x390: ${JSON.stringify(la)}`);
      assert(la.cardBottom <= la.actTop + 2, `${cardId} overlaps action zone on 844x390: ${JSON.stringify(la)}`);
      assert(la.switcherRight <= la.hudRightLeft + 2, `Top HUD overlap on 844x390: ${JSON.stringify(la)}`);
      assert(la.joyRight <= la.careLeft + 2 && la.careRight <= la.actLeft + 2, `Bottom ${CARE_BTN_COUNT}-button dock overlap on 844x390: ${JSON.stringify(la)}`);
      assert(la.pillBottom <= la.joyTop + 2, `HUD pills overlap joystick on 844x390: ${JSON.stringify(la)}`);
      await page.waitForTimeout(200);
      await shot(page, shotName);
    }
    // 窄屏拼图：进行中收起回忆墙给拼板让位，点按仍可交换
    await page.click('#btn-memory-puzzle');
    await page.waitForTimeout(160);
    const narrowPlay = await page.evaluate(() => {
      const card = document.getElementById('memory-puzzle-card');
      return {
        playing: card.classList.contains('is-playing'),
        wallHidden: document.getElementById('puzzle-wall-box').offsetParent === null,
        boardW: document.getElementById('puzzle-board').offsetWidth
      };
    });
    assert(narrowPlay.playing && narrowPlay.wallHidden && narrowPlay.boardW >= 118, `Narrow puzzle play layout: ${JSON.stringify(narrowPlay)}`);
    const before844 = await page.evaluate(() => window.__AR11_DEBUG__.getPuzzleRun());
    const w3 = before844.order.findIndex((p, i) => p !== i);
    if (w3 >= 0) {
      const t3 = before844.order.indexOf(w3);
      await page.click(`#puzzle-board .mp-piece[data-slot="${w3}"]`);
      await page.waitForTimeout(50);
      await page.click(`#puzzle-board .mp-piece[data-slot="${t3}"]`);
      await page.waitForTimeout(80);
      assert.equal((await page.evaluate(() => window.__AR11_DEBUG__.getPuzzleRun())).order[w3], w3, 'Tap-swap works on 844x390');
    }
    await page.waitForTimeout(150);
    await shot(page, 'mobile_844x390_puzzle_play.png');
    await page.click('#btn-puzzle-close');
    await page.waitForTimeout(450);
    // 窄屏 AR-11 胶囊：放得下才显示（与已有胶囊同一行），绝不新开一行
    const narrowPill = await pillRowAudit();
    assert(narrowPill.sharesRow && narrowPill.withPill === narrowPill.withoutPill, `AR-11 pill must not add a HUD pill row on 844x390: ${JSON.stringify(narrowPill)}`);
    await shot(page, 'mobile_844x390_scene.png');
    // 极端情况：把胶囊行塞满，AR-11 胶囊应自动收起而不是换行
    const crowded = await page.evaluate(async () => {
      const ids = ['pomodoro-mini-pill', 'teatime-buff-pill', 'terrarium-blessing-pill'];
      ids.forEach((id) => document.getElementById(id)?.classList.remove('hidden'));
      await new Promise((r) => setTimeout(r, 700));
      const pill = document.getElementById('kitchen-memory-pill');
      const visible = (b) => !b.classList.contains('hidden') && b.offsetParent !== null;
      const others = Array.from(document.querySelectorAll('#hud-ambience-row > button')).filter((b) => b !== pill && visible(b));
      const res = {
        shown: visible(pill),
        sharesRow: visible(pill)
          ? others.some((b) => Math.abs(b.offsetTop + b.offsetHeight / 2 - (pill.offsetTop + pill.offsetHeight / 2)) <= 6)
          : true
      };
      ids.forEach((id) => document.getElementById(id)?.classList.add('hidden'));
      return res;
    });
    assert(crowded.sharesRow, `With a crowded pill row the AR-11 pill must fold away instead of wrapping: ${JSON.stringify(crowded)}`);
    await page.waitForTimeout(700);

    // 9. 旧存档 / 脏数据安全默认值
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate((key) => {
      const raw = JSON.parse(localStorage.getItem(key) || '{}');
      delete raw.bentoKitchen;
      delete raw.memoryPuzzle;
      localStorage.setItem(key, JSON.stringify(raw));
    }, SAVE_KEY);
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(320);
    const legacy = await getState(page);
    assert.deepEqual(legacy.bentoKitchen.discovered, {}, 'Legacy save defaults to an empty codex');
    assert.deepEqual(legacy.bentoKitchen.bag, []);
    assert.equal(legacy.bentoKitchen.pending, '');
    assert.equal(legacy.bentoRun.phase, 'assemble');
    assert.deepEqual(legacy.memoryPuzzle.wall, []);
    assert.deepEqual(legacy.memoryPuzzle.completed, {});
    assert.equal(legacy.memoryBonus.active, false);
    assert(legacy.journalSummary.bentos7d >= 11 && legacy.journalSummary.puzzles7d >= 8, 'Journal history survives legacy migration');
    assert(legacy.journalSummary.cumulative.totalBentos >= 11, 'Cumulative bento total survives via the journal');

    await page.evaluate((key) => {
      const raw = JSON.parse(localStorage.getItem(key) || '{}');
      raw.bentoKitchen = {
        discovered: { 'ume__tamago+octopus': { count: -4, firstDate: 'today' }, 'fake__x+y': { count: 3 }, 'tuna__tamago+tamago': true, 'salmon__octopus+broccoli': 7 },
        bag: ['ume__tamago+broccoli', { recipeId: 'nope' }, null, { recipeId: 'tuna__tamago+octopus', packedDate: 42 }, 'salmon__tamago+octopus', 'ume__octopus+broccoli'],
        pending: 'ghost__a+b',
        totalBentos: 'many',
        totalPacked: -3,
        lastRecipeId: 'tuna__tamago+broccoli'
      };
      const tiny = document.createElement('canvas');
      tiny.width = 4;
      tiny.height = 4;
      const tc = tiny.getContext('2d');
      tc.fillStyle = '#f6dcb8';
      tc.fillRect(0, 0, 4, 4);
      window.__AR11_TINY_THUMB__ = tiny.toDataURL('image/jpeg', 0.8);
      raw.memoryPuzzle = {
        completed: { 'photo:pol_1': { count: 'x', bestMoves: -9, label: 42 }, 'evil:1': { count: 3 }, 'art:bento': 1 },
        wall: [
          { sourceId: 'photo:pol_1', thumb: 'javascript:alert(1)', label: '', date: 'x', moves: 'z' },
          { sourceId: 'photo:pol_1', thumb: 'data:image/jpeg;base64,AAAA' },
          null,
          { sourceId: 'week:2026-W47', thumb: window.__AR11_TINY_THUMB__, label: '周报', moves: 5 },
          { sourceId: '<img src=x>' }
        ],
        selectedSourceId: 'evil:2',
        totalPuzzles: 'lots',
        lastSourceId: 'photo:missing'
      };
      localStorage.setItem(key, JSON.stringify(raw));
    }, SAVE_KEY);
    const tinyThumb = await page.evaluate(() => window.__AR11_TINY_THUMB__);
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(320);
    const dirty = await getState(page);
    assert.deepEqual(Object.keys(dirty.bentoKitchen.discovered).sort(), ['salmon__octopus+broccoli', 'ume__tamago+octopus'], 'Unknown recipes are dropped');
    assert.equal(dirty.bentoKitchen.discovered['ume__tamago+octopus'].count, 1, 'Invalid count clamps to 1');
    assert(/^\d{4}-\d{2}-\d{2}$/.test(dirty.bentoKitchen.discovered['ume__tamago+octopus'].firstDate));
    assert.deepEqual(dirty.bentoKitchen.bag.map((b) => b.recipeId), ['ume__tamago+broccoli', 'tuna__tamago+octopus', 'salmon__tamago+octopus'], 'Bag keeps only valid recipes, max 3');
    assert(/^\d{4}-\d{2}-\d{2}$/.test(dirty.bentoKitchen.bag[1].packedDate), 'Invalid packed date falls back');
    assert.equal(dirty.bentoKitchen.pending, '', 'Unknown pending bento is dropped');
    assert.equal(dirty.bentoKitchen.totalBentos, 2, 'Invalid bento total falls back to the codex sum');
    assert.equal(dirty.bentoKitchen.totalPacked, 0);
    assert.equal(dirty.bentoKitchen.lastRecipeId, '', 'Last recipe must exist in the codex');
    assert.equal(dirty.bentoRun.phase, 'assemble');
    assert.deepEqual(Object.keys(dirty.memoryPuzzle.completed).sort(), ['art:bento', 'photo:pol_1', 'week:2026-W47'], 'Unknown memory kinds are dropped, wall entries are kept');
    assert.equal(dirty.memoryPuzzle.completed['photo:pol_1'].count, 1);
    assert.equal(dirty.memoryPuzzle.completed['photo:pol_1'].bestMoves, 0);
    assert.equal(dirty.memoryPuzzle.completed['photo:pol_1'].label, '拍立得合影', 'Invalid label falls back per kind');
    assert.deepEqual(dirty.memoryPuzzle.wall.map((w) => w.sourceId), ['photo:pol_1', 'week:2026-W47'], 'Wall keeps unique, valid entries');
    assert.equal(dirty.memoryPuzzle.wall[0].thumb, '', 'Non-image thumbnails are stripped');
    assert.equal(dirty.memoryPuzzle.wall[1].thumb, tinyThumb, 'Valid image thumbnails are kept');
    assert.equal(dirty.memoryPuzzle.selectedSourceId, '');
    assert.equal(dirty.memoryPuzzle.totalPuzzles, 3, 'Invalid puzzle total falls back to the completed sum');
    assert.equal(dirty.memoryPuzzle.lastSourceId, 'week:2026-W47', 'Missing last source falls back to the newest wall entry');
    assert.equal(dirty.memoryBonus.distinct, 3);
    // 脏数据下依旧可正常打开两张卡并继续游玩
    await page.click('#btn-bento-kitchen');
    await page.waitForTimeout(140);
    assert.equal(await page.locator('#bento-summary-pill').textContent(), '图鉴 2/9 · 袋 3/3');
    await page.click('#btn-memory-puzzle');
    await page.waitForTimeout(200);
    const dirtyWall = await page.evaluate(() =>
      Array.from(document.querySelectorAll('#puzzle-wall-grid .puzzle-wall-thumb')).map((im) => ({ src: (im.getAttribute('src') || '').slice(0, 48) }))
    );
    assert.equal(dirtyWall.length, 2);
    assert(dirtyWall[0].src.startsWith('./assets/puzzle_piece_memory.webp'), `Missing thumbnail falls back to the provided art, got ${JSON.stringify(dirtyWall)}`);

    assert.equal(consoleErrors.length, 0, `Console errors observed: ${consoleErrors.join('; ')}`);
    assert.equal(pageErrors.length, 0, `Page errors observed: ${pageErrors.join('; ')}`);
    assert.equal(failedResponses.length, 0, `HTTP >= 400 responses observed: ${failedResponses.join('; ')}`);

    console.log(
      '[E2E PASS] AR-11 Warm-Lamp Kitchen Onigiri Bento (3 fillings x 3 side pairs = 9-recipe codex, tap/drag placement into slots, lid + pack into a 3-slot lunch bag, one bento per Survivor shift with regen + low-HP onigiri rescue) + Cream-Journal Memory Puzzle (3x3 jigsaw cut from real polaroids / AR-10 watercolors / weekly report with art fallback, tap- and drag-swap, 6-slot memory wall in card and scene, Survivor coin bonus, Weekly Journal sync) passed across 1440x900, 390x844 and 844x390 with 0px overflow, mutually exclusive overlays, safe legacy/dirty-save defaults and 0 errors!'
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
