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
const PORT = Number(process.env.AR14_PORT || 0);

// 可选：设置 AR14_SHOT_DIR 后输出 1440x900 / 1280x720 / 1024x768 / 390x844 / 844x390 自审截图
const SHOT_DIR = process.env.AR14_SHOT_DIR || '';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.json': 'application/json; charset=utf-8'
};

const REQUIRED_AR14_ASSETS = [
  'ui_btn_pottery_wheel.webp',
  'ui_btn_aroma_table.webp',
  'pottery_cup.webp',
  'pottery_vase.webp',
  'aroma_bottle.webp',
  'aroma_diffuser.webp'
];

// AR-14 明确不再加船坞键：仍是 AR-13 的 25 键
const CARE_BTN_COUNT = 25;
const SAVE_KEY = 'ar_deepseek_pet_v2';
const MIN_DOCK_MARGIN = 10;

async function shot(page, name) {
  if (!SHOT_DIR) return;
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  // 自审截图前先收起偶发的亲密度里程碑弹窗（与 AR-14 无关，只是会挡住卡片头部）
  await page.evaluate(() => {
    const toast = document.getElementById('milestone-toast');
    if (toast && !toast.classList.contains('hidden')) document.getElementById('btn-milestone-toast-close')?.click();
  });
  await page.waitForTimeout(120);
  await page.screenshot({ path: path.join(SHOT_DIR, name) });
}

function dayAt(base, offsetDays, hh = 10, mm = 0) {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + offsetDays, hh, mm, 0, 0);
}

function keyOf(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function seasonOf(d) {
  const m = d.getMonth() + 1;
  if (m >= 3 && m <= 5) return 'spring';
  if (m >= 6 && m <= 8) return 'summer';
  if (m >= 9 && m <= 11) return 'autumn';
  return 'winter';
}

const SEASON_NOTES = { spring: '樱花白茶', summer: '青柠海盐', autumn: '桂花木质', winter: '雪松香草' };
const SEASON_NAMES = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' };

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
  // AR-15 起缓存号继续递增（hd30 / hd54），这里只要求不低于 AR-14 的 hd29 / hd53
  assert(/\.\/style\.css\?v=hd(?:29|[3-9]\d)\b/.test(htmlContent), 'index.html must reference ./style.css?v=hd29+');
  assert(/\.\/game\.js\?v=hd(?:5[3-9]|[6-9]\d)\b/.test(htmlContent), 'index.html must reference ./game.js?v=hd53+');
  let htmlAr14Refs = 0;
  for (const reqAsset of REQUIRED_AR14_ASSETS) {
    if (new RegExp(`\\./assets/${reqAsset.replace('.', '\\.')}\\?v=hd(?:29|[3-9]\\d)`).test(htmlContent)) htmlAr14Refs += 1;
    assert(assetRefs.has(reqAsset), `Required AR-14 asset ${reqAsset} is not referenced in code`);
    assert(new RegExp(`${reqAsset.replace('.', '\\.')}\\?v=hd(?:29|[3-9]\\d)`).test(spritesContent), `${reqAsset} must be preloaded by sprites.js with ?v=hd29+`);
  }
  assert.equal(htmlAr14Refs, REQUIRED_AR14_ASSETS.length, `index.html must reference all 6 AR-14 images with ?v=hd29+, got ${htmlAr14Refs}`);
  for (const [name, content] of [
    ['index.html', htmlContent],
    ['style.css', cssContent],
    ['sprites.js', spritesContent],
    ['game.js', gameContent]
  ]) {
    assert(!/\?v=hd2[3-8]\b/.test(content), `Stale ?v=hd23..hd28 cache-buster left in public/${name}`);
  }
  assert(!/game\.js\?v=hd5[0-2]\b/.test(htmlContent), 'Stale game.js?v=hd50..hd52 left in index.html');
  assert(/\?v=hd(?:29|[3-9]\d)\b/.test(cssContent), 'style.css must use ?v=hd29+ asset cache-busters');
  assert(/\.\/sprites\.js\?v=hd(?:29|[3-9]\d)\b/.test(gameContent), 'game.js must import ./sprites.js?v=hd29+');
  assert(/\.\/audio\.js\?v=hd(?:29|[3-9]\d)\b/.test(gameContent), 'game.js must import ./audio.js?v=hd29+');
  assert(/\.\/vision\.js\?v=hd(?:29|[3-9]\d)\b/.test(gameContent), 'game.js must import ./vision.js?v=hd29+');
  for (const fn of ['getPotteryShelfLayout', 'drawPotteryShelf', 'drawPotteryWheelProp', 'getAromaTableDeskAnchor', 'drawAromaTableDesk', 'drawAromaBlendProp']) {
    assert(new RegExp(`export function ${fn}`).test(spritesContent), `sprites.js must export ${fn}`);
  }
  for (const fn of ['playPotteryWheel', 'playPotteryGlaze', 'playPotteryKiln', 'playPotteryDone', 'playAromaDrop', 'playAromaLight', 'getAr14AudioInfo']) {
    assert(new RegExp(`\\n  ${fn}\\(`).test(audioContent), `audio.js must define ${fn}()`);
  }
  for (const asset of assetRefs) {
    const full = path.join(PUBLIC_DIR, 'assets', asset);
    assert(fs.existsSync(full), `Missing asset on disk: ${full}`);
    assert(fs.statSync(full).size > 0, `Empty asset on disk: ${full}`);
  }
  // 船坞不加键：仍是 25 键，也没有任何陶艺 / 香氛船坞键
  assert.equal((htmlContent.match(/class="care-btn[\s"]/g) || []).length, CARE_BTN_COUNT, `index.html must keep exactly ${CARE_BTN_COUNT} dock keys`);
  const dockHtml = htmlContent.slice(htmlContent.indexOf('id="pet-care-bar"'), htmlContent.indexOf('class="action-zone"'));
  assert(dockHtml.length > 100 && !/pottery|aroma/.test(dockHtml), 'AR-14 must not add a pottery / aroma key to the dock');

  // AR-14 场景 / 卡片只贴已提供的位图（柔光渐变 + 文字标签），不画任何矢量图形，也不画 canvas 图标
  const vectorRe = /beginPath|lineTo|\barc\(|arcTo|bezierCurveTo|quadraticCurveTo|strokeRect|roundRect\(|\.stroke\(\)|\.fill\(\)/;
  const spriteStart = spritesContent.indexOf('// AR-14 窗畔陶艺架');
  const spriteEnd = spritesContent.indexOf('export function roundRect');
  assert(spriteStart > 0 && spriteEnd > spriteStart, 'sprites.js must contain the AR-14 drawing section');
  assert(!vectorRe.test(spritesContent.slice(spriteStart, spriteEnd)), 'AR-14 canvas drawing must only draw the provided webp art');
  const gameStart = gameContent.indexOf('// ================= AR-14 窗畔手作陶艺转盘 & 她的小小香氛调配台');
  const gameEnd = gameContent.indexOf('// ================= AR 拍立得纪念合影系统');
  assert(gameStart > 0 && gameEnd > gameStart, 'game.js must contain the AR-14 section');
  const ar14Game = gameContent.slice(gameStart, gameEnd);
  assert(!vectorRe.test(ar14Game), 'AR-14 game section must not draw vector shapes');
  assert(!/getContext\(/.test(ar14Game), 'AR-14 UI must not create canvas-drawn icons');

  // 零暗黑赛博 / 荧光色：AR-14 样式段不得出现深色
  const cssStart = cssContent.indexOf('AR-14 窗畔手作陶艺转盘 & 她的小小香氛调配台');
  assert(cssStart > 0, 'style.css must contain the AR-14 section');
  assert(
    !/neon|#0{3,6}\b|#000\b|#111|#1[0-9a-f]{5}\b|#[2-4][0-9a-f]{5}\b|rgba?\(\s*(?:[0-5]?\d)\s*,\s*(?:[0-5]?\d)\s*,\s*(?:[0-9]?\d)\s*[,)]/i.test(
      cssContent.slice(cssStart)
    ),
    'AR-14 CSS must not contain near-black / neon colors'
  );
  // 房间色温层：每个心情 / 季节色都是浅奶油色（三通道 >= 200）
  for (const m of ar14Game.matchAll(/rgb: '(\d+), (\d+), (\d+)'/g)) {
    assert(Math.min(Number(m[1]), Number(m[2]), Number(m[3])) >= 200, `AR-14 tint must stay cream/pastel, got ${m[0]}`);
  }

  console.log(
    `[STATIC PASS] ${jsFiles.length} JS modules syntax-checked, ${assetRefs.size} assets verified on disk (including all 6 AR-14 images), ?v=hd29+/hd53+ synced with 0 stale hd23-hd28, still ${CARE_BTN_COUNT} dock keys (no pottery / aroma key), 0 inline <svg>, 0 Emoji, 0 vector shapes / canvas icons in AR-14 art, 0 dark/neon colors in AR-14 CSS.`
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
  return page.evaluate((d) => window.__AR14_DEBUG__.getState(d), iso);
}

async function dbg(page, fn, ...args) {
  return page.evaluate(([f, a]) => window.__AR14_DEBUG__[f](...a), [fn, args]);
}

async function openPanelNames(page) {
  const panels = (await getState(page)).openPanels;
  return Object.entries(panels)
    .filter(([, isOpen]) => isOpen)
    .map(([k]) => k);
}

async function closeAll(page) {
  await page.evaluate(() => {
    for (const id of ['btn-pottery-close', 'btn-aroma-close']) {
      const el = document.getElementById(id);
      const card = el && el.closest('aside');
      if (card && !card.classList.contains('hidden')) el.click();
    }
  });
  await page.waitForTimeout(120);
}

// 舞台坐标 → 视口坐标（旋转舞台下按 CW / CCW 反推），并确认这个点真的落在画布上（没被 HUD / 船坞遮住）
async function stagePointToClient(page, pt) {
  return page.evaluate((p) => {
    const stage = document.getElementById('game-stage');
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let cx = p.x;
    let cy = p.y;
    if (vw < vh) {
      if (stage.className.includes('forced-landscape-ccw')) {
        cx = p.y;
        cy = vh - p.x;
      } else {
        cx = vw - p.y;
        cy = p.x;
      }
    }
    const hit = document.elementFromPoint(cx, cy);
    return { x: cx, y: cy, onCanvas: Boolean(hit && hit.id === 'game-canvas'), hitId: hit ? hit.id || hit.className : '' };
  }, pt);
}

async function tapStage(page, pt, label) {
  const c = await stagePointToClient(page, pt);
  assert(c.onCanvas, `${label}: stage point (${Math.round(pt.x)}, ${Math.round(pt.y)}) must be a free canvas spot, got ${c.hitId}`);
  await page.mouse.click(c.x, c.y);
  await page.waitForTimeout(180);
}

function shelfCenter(L) {
  return { x: L.shelf.hit.x + L.shelf.hit.w * 0.5, y: L.shelf.hit.y + L.shelf.hit.h * 0.55 };
}

// 船坞几何：按舞台坐标轴（旋转舞台下取纵轴）计算摇杆 / 动作键留白，逐对检查按键二维相交
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
      minKey: Math.min(...btns.map((b) => Math.min(b.width, b.height)))
    };
  });
}

// 卡片 / HUD / 船坞布局审计（与 AR-13 同一套口径）
async function cardAudit(page, cardId) {
  return page.evaluate((id) => {
    const prof = document.querySelector('.hud-profile-card').getBoundingClientRect();
    const sw = document.getElementById('mode-switcher').getBoundingClientRect();
    const hr = document.querySelector('.hud-right').getBoundingClientRect();
    const joy = document.getElementById('joystick-zone').getBoundingClientRect();
    const care = document.getElementById('pet-care-bar').getBoundingClientRect();
    const act = document.querySelector('.action-zone').getBoundingClientRect();
    const cardEl = document.getElementById(id);
    const card = cardEl.getBoundingClientRect();
    const pills = Array.from(document.querySelectorAll('#hud-ambience-row > button')).filter((b) => !b.classList.contains('hidden') && b.offsetParent !== null);
    const imgs = Array.from(cardEl.querySelectorAll('img'));
    // 卡片内所有可见控件都在卡片框内（不溢出），且两两不重叠的按钮行
    const inner = Array.from(cardEl.querySelectorAll('button')).filter((b) => b.offsetParent !== null && !b.classList.contains('hidden'));
    const outside = inner
      .map((b) => b.getBoundingClientRect())
      .filter((b) => b.width > 0 && (b.left < card.left - 1 || b.right > card.right + 1 || b.top < card.top - 1 || b.bottom > card.bottom + 1)).length;
    return {
      overflowX: document.documentElement.scrollWidth - window.innerWidth,
      overflowY: document.documentElement.scrollHeight - window.innerHeight,
      cardOpen: !cardEl.classList.contains('hidden'),
      scrollable: cardEl.scrollHeight - cardEl.clientHeight,
      outside,
      imgsLoaded: imgs.every((im) => im.complete && im.naturalWidth > 0),
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
}

// 场景物件（陶艺架 / 小香氛台）不压 HUD、胶囊、船坞与摇杆（舞台坐标；旋转舞台跳过，改用 elementFromPoint 校验）
async function sceneAudit(page) {
  return page.evaluate(() => {
    const L = window.__AR14_DEBUG__.getLayouts();
    const rotated = window.innerWidth < window.innerHeight;
    const rect = (el) => {
      const b = el.getBoundingClientRect();
      return { x: b.left, y: b.top, w: b.width, h: b.height };
    };
    const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    const shelf = L.shelf.hit;
    const table = { x: L.diffuser.hit.x - L.diffuser.hit.r, y: L.diffuser.hit.y - L.diffuser.hit.r, w: L.diffuser.hit.r * 2, h: L.diffuser.hit.r * 2 };
    const blockers = rotated
      ? []
      : [
          ['hud-left', document.querySelector('.hud-left-stack')],
          ['mode-switcher', document.getElementById('mode-switcher')],
          ['hud-right', document.querySelector('.hud-right')],
          ['joystick', document.getElementById('joystick-zone')],
          ['dock', document.getElementById('pet-care-bar')],
          ['action', document.querySelector('.action-zone')]
        ];
    const clashes = [];
    for (const [name, el] of blockers) {
      if (!el || el.offsetParent === null) continue;
      const r = rect(el);
      if (hit(shelf, r)) clashes.push(`shelf~${name}`);
      if (hit(table, r)) clashes.push(`table~${name}`);
    }
    return {
      W: L.W,
      H: L.H,
      shelf,
      table,
      inStage:
        shelf.x >= 0 && shelf.y >= 0 && shelf.x + shelf.w <= L.W && shelf.y + shelf.h <= L.H &&
        table.x >= 0 && table.y >= 0 && table.x + table.w <= L.W && table.y + table.h <= L.H,
      clashes
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
    await page.waitForTimeout(500);
    assert.equal(pageErrors.length, 0, `Page errors on load: ${pageErrors.join('; ')}`);
    assert.equal(consoleErrors.length, 0, `Console errors on load: ${consoleErrors.join('; ')}`);

    // 0. DOM Emoji / 奶油手账配色 / 6 张 AR-14 贴图加载审计
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
        img.src = `./assets/${file}?v=hd29`;
        await new Promise((res, rej) => {
          if (img.complete && img.naturalWidth > 0) res();
          else {
            img.onload = () => res();
            img.onerror = () => rej(new Error(`Failed to decode ${file}`));
          }
        });
        loadReport[file] = { w: img.naturalWidth, h: img.naturalHeight };
      }
      const overlay = document.getElementById('aroma-ambient-overlay');
      return {
        hasEmoji: /\p{Extended_Pictographic}/u.test(document.body.innerText || ''),
        brokenImgs,
        domImgCount: domImgs.length,
        domLoaded: domImgs.every((img) => img.complete && img.naturalWidth > 0),
        loadReport,
        potteryBg: getComputedStyle(document.getElementById('pottery-wheel-card')).backgroundImage,
        aromaBg: getComputedStyle(document.getElementById('aroma-table-card')).backgroundImage,
        overlayHidden: overlay.classList.contains('hidden'),
        overlayPointer: getComputedStyle(overlay).pointerEvents,
        overlayZ: Number(getComputedStyle(overlay).zIndex),
        hudZ: Number(getComputedStyle(document.querySelector('.cyber-hud-top')).zIndex),
        pillHidden: document.getElementById('pottery-aroma-pill').classList.contains('hidden'),
        careBtnCount: document.querySelectorAll('#pet-care-bar .care-btn').length,
        overflowX: document.documentElement.scrollWidth - window.innerWidth,
        overflowY: document.documentElement.scrollHeight - window.innerHeight
      };
    }, REQUIRED_AR14_ASSETS);
    assert.equal(initialAudit.hasEmoji, false, 'Visible DOM must contain zero Emoji characters');
    assert.equal(initialAudit.brokenImgs.length, 0, `Broken ./assets/ images: ${initialAudit.brokenImgs.join(', ')}`);
    assert(initialAudit.domImgCount >= 10, `Expected >= 10 AR-14 <img> in DOM, got ${initialAudit.domImgCount}`);
    assert.equal(initialAudit.domLoaded, true, 'Every AR-14 <img> in DOM must load (naturalWidth > 0)');
    for (const [file, info] of Object.entries(initialAudit.loadReport)) {
      assert(info.w === 256 && info.h === 256, `AR-14 image ${file} must decode as 256x256, got ${JSON.stringify(info)}`);
    }
    assert.equal(initialAudit.careBtnCount, CARE_BTN_COUNT, `Expected ${CARE_BTN_COUNT} dock buttons, got ${initialAudit.careBtnCount}`);
    assert(initialAudit.overflowX <= 0 && initialAudit.overflowY <= 0, `Desktop 1440x900 overflow: ${JSON.stringify(initialAudit)}`);
    assert(/255,\s*253,\s*248/.test(initialAudit.potteryBg), `#pottery-wheel-card must use cream #FFFDF8, got ${initialAudit.potteryBg}`);
    assert(/255,\s*253,\s*248/.test(initialAudit.aromaBg), `#aroma-table-card must use cream #FFFDF8, got ${initialAudit.aromaBg}`);
    assert.equal(initialAudit.overlayHidden, true, 'No fragrance on a fresh save = no room tint');
    assert.equal(initialAudit.overlayPointer, 'none', 'The room tint must never block taps');
    assert(initialAudit.overlayZ < initialAudit.hudZ, `Room tint stays under the HUD: ${initialAudit.overlayZ} vs ${initialAudit.hudZ}`);
    assert.equal(initialAudit.pillHidden, true, 'No ward / fragrance = AR-14 pill stays hidden');

    const realNow = new Date();
    const today = dayAt(realNow, 0, 10, 0);
    const todaySeason = seasonOf(today);
    await dbg(page, 'setClock', today.getTime());

    // 1. 新存档：空陶艺架、无佑护、未点香
    let st = await getState(page);
    assert.deepEqual(st.potteryWheel.pieces, [], 'Fresh save: empty shelf');
    assert.equal(st.potteryWheel.wardCharges, 0);
    assert.deepEqual(st.potteryWheel.combos, {});
    assert.equal(st.aromaTable.active, null, 'Fresh save: no fragrance lit');
    assert.deepEqual(st.aromaTable.discovered, {});
    assert.equal(st.aromaStats.seasonId, todaySeason, `Season follows the injected local date: ${st.aromaStats.seasonId}`);
    assert.equal(st.potteryWard.active, false);
    assert.equal(st.overlay.shown, false);

    // 2. 入口：不加船坞键 —— 抽屉「家具与装扮」快捷卡（紧跟房间主题）+ 场景陶艺架 / 小香氛台
    await page.click('#btn-shop');
    await page.waitForTimeout(220);
    const drawerAudit = await page.evaluate(() => {
      const blocks = Array.from(document.querySelectorAll('#drawer-items .drawer-section-block'));
      const idx = blocks.findIndex((b) => b.querySelector('[data-ar14-shortcut]'));
      const pBtn = document.querySelector('[data-ar14-shortcut="pottery"]');
      const items = document.getElementById('drawer-items').getBoundingClientRect();
      const pr = pBtn ? pBtn.getBoundingClientRect() : null;
      return {
        idx,
        title: idx >= 0 ? blocks[idx].querySelector('.drawer-section-title').textContent : '',
        imgsLoaded: Array.from(blocks[idx] ? blocks[idx].querySelectorAll('img') : []).every((im) => im.naturalWidth > 0),
        visibleWithoutScroll: Boolean(pr && pr.top >= items.top && pr.bottom <= items.bottom + 1),
        sub: pBtn ? pBtn.querySelector('.room-theme-sub').textContent : ''
      };
    });
    assert.equal(drawerAudit.idx, 1, `AR-14 shortcuts sit right after the room theme block, got ${drawerAudit.idx}`);
    assert.equal(drawerAudit.title, '窗畔陶艺与香氛调配台');
    assert(drawerAudit.imgsLoaded, 'Drawer shortcut art loads');
    assert(drawerAudit.visibleWithoutScroll, 'The pottery shortcut is visible without scrolling the drawer at 1440x900');
    assert(drawerAudit.sub.includes('陶艺架 0 件'), `Fresh shortcut sub: ${drawerAudit.sub}`);
    await page.waitForTimeout(150);
    await shot(page, 'desktop_1440x900_drawer_entry.png');
    await page.click('[data-ar14-shortcut="pottery"]');
    await page.waitForTimeout(180);
    assert.deepEqual(await openPanelNames(page), ['potteryWheel'], 'Drawer pottery shortcut opens only the pottery card');
    await page.click('#btn-shop');
    await page.waitForTimeout(200);
    await page.click('[data-ar14-shortcut="aroma"]');
    await page.waitForTimeout(180);
    assert.deepEqual(await openPanelNames(page), ['aromaTable'], 'Drawer aroma shortcut opens only the aroma card');
    await closeAll(page);
    await dbg(page, 'placePlayerForTest', 0.5);
    await page.waitForTimeout(150);
    let L = await dbg(page, 'getLayouts');
    await tapStage(page, shelfCenter(L), 'Shelf tap');
    assert.deepEqual(await openPanelNames(page), ['potteryWheel'], 'Tapping the windowside shelf opens the pottery card');
    await closeAll(page);
    await dbg(page, 'placePlayerForTest', 0.5);
    await tapStage(page, L.diffuser.hit, 'Aroma table tap');
    assert.deepEqual(await openPanelNames(page), ['aromaTable'], 'Tapping the little aroma table opens the aroma card');

    // 3. 浮层互斥：AR-14 两张卡与船坞其它卡片 / 抽屉一次只开一个
    const exclusive = [
      ['dock', '#btn-picnic-basket', 'picnicBasket'],
      ['ar14', 'pottery', 'potteryWheel'],
      ['dock', '#btn-diary-book', 'diaryBook'],
      ['ar14', 'aroma', 'aromaTable'],
      ['dock', '#btn-teatime', 'teatime'],
      ['ar14', 'pottery', 'potteryWheel'],
      ['dock', '#btn-kitten-corner', 'kittenCorner'],
      ['ar14', 'aroma', 'aromaTable'],
      ['dock', '#btn-weekly-journal', 'weeklyJournal'],
      ['ar14', 'pottery', 'potteryWheel'],
      ['dock', '#btn-pomodoro', 'pomodoro'],
      ['ar14', 'aroma', 'aromaTable'],
      ['dock', '#btn-chat-topic', 'topic'],
      ['ar14', 'pottery', 'potteryWheel'],
      ['dock', '#btn-shop', 'drawer']
    ];
    for (const [kind, target, key] of exclusive) {
      if (kind === 'dock') {
        await page.click(target);
      } else {
        await dbg(page, target === 'pottery' ? 'openPottery' : 'openAroma');
      }
      await page.waitForTimeout(120);
      assert.deepEqual(await openPanelNames(page), [key], `Opening ${target} must keep ONLY ${key} open, got ${JSON.stringify(await openPanelNames(page))}`);
    }
    await page.click('#btn-shop');
    await page.waitForTimeout(160);
    assert.deepEqual(await openPanelNames(page), [], 'Shop key closes the drawer again');

    // 4. 陶艺：真实点按 拉坯（点转盘 3 圈）→ 上釉 → 入窑烧制 → 出窑上架
    await dbg(page, 'openPottery');
    await page.waitForTimeout(160);
    let pDom = await page.evaluate(() => ({
      shapes: Array.from(document.querySelectorAll('#pw-shape-row .pw-shape-chip')).map((c) => c.dataset.shapeId),
      glazes: Array.from(document.querySelectorAll('#pw-glaze-row .pw-glaze-chip')).map((c) => c.dataset.glazeId),
      chipImgs: Array.from(document.querySelectorAll('#pottery-wheel-card img')).every((im) => im.complete && im.naturalWidth > 0),
      main: document.getElementById('btn-pottery-main').textContent,
      phase: document.getElementById('pw-step-row').dataset.phase,
      ward: document.querySelector('#pw-glaze-row [data-glaze-id="celadon"] .pw-glaze-ward').textContent
    }));
    assert.deepEqual(pDom.shapes, ['cup', 'vase']);
    assert.deepEqual(pDom.glazes, ['cream', 'sakura', 'celadon']);
    assert.equal(pDom.chipImgs, true, 'Pottery card art loads');
    assert.deepEqual([pDom.main, pDom.phase], ['转盘拉坯 0/3', 'shape'], `Fresh pottery card: ${JSON.stringify(pDom)}`);
    assert.equal(pDom.ward, '磁吸+15%', `Celadon cup ward preview: ${pDom.ward}`);
    // 先挑樱粉釉（坯还没拉好时只是预选，不会直接上釉）
    await page.click('#pw-glaze-row [data-glaze-id="sakura"]');
    await page.waitForTimeout(80);
    let run = await dbg(page, 'getPotteryRun');
    assert.deepEqual([run.phase, run.glazeId, run.glazed], ['shape', 'sakura', false], `Pre-pick glaze: ${JSON.stringify(run)}`);
    for (let i = 0; i < 3; i++) {
      await page.click('#pw-wheel');
      await page.waitForTimeout(90);
    }
    st = await getState(page);
    assert.deepEqual([st.potteryRun.phase, st.potteryRun.taps], ['glaze', 3], `Three wheel turns shape the cup: ${JSON.stringify(st.potteryRun)}`);
    assert(st.ar14Audio.potteryWheelCount >= 3, `Wheel audio: ${JSON.stringify(st.ar14Audio)}`);
    assert.equal(st.potteryVisual.shaping, true, 'She works at the wheel beside the desk');
    assert.equal(await page.locator('#btn-pottery-main').textContent(), '上釉 · 樱粉釉');
    await page.click('#btn-pottery-main');
    await page.waitForTimeout(120);
    st = await getState(page);
    assert.deepEqual([st.potteryRun.phase, st.potteryRun.glazed, st.potteryRun.glazeId], ['kiln', true, 'sakura']);
    assert(st.ar14Audio.potteryGlazeCount >= 1, 'Glazing brushes');
    assert.equal(await page.locator('#btn-pottery-main').textContent(), '入窑烧制');
    const coinsBeforeCup = st.coins;
    await page.click('#btn-pottery-main');
    await page.waitForTimeout(260);
    st = await getState(page);
    assert.equal(st.potteryRun.phase, 'firing', 'Into the little kiln');
    assert.deepEqual([st.potteryMain.disabled, st.potteryMain.label], [true, '小窑烧制中…']);
    assert(st.ar14Audio.potteryKilnCount >= 1, 'Kiln hums');
    assert.equal(await page.evaluate(() => document.getElementById('pw-wheel').dataset.phase), 'firing');
    await shot(page, 'desktop_1440x900_pottery_firing.png');
    await page.waitForTimeout(1900);
    st = await getState(page);
    const cupRes = st.potteryRun.lastResult;
    assert.equal(st.potteryRun.phase, 'done', `Firing finishes by itself after ~1.6s: ${JSON.stringify(st.potteryRun)}`);
    assert.deepEqual([cupRes.shapeId, cupRes.glazeId, cupRes.isNewCombo], ['cup', 'sakura', true]);
    assert.deepEqual(cupRes.reward, { coins: 18, xp: 12 }, `First piece of the day: 10 + 8 new-combo coins, 12 affection: ${JSON.stringify(cupRes.reward)}`);
    assert(st.coins >= coinsBeforeCup + 18, 'Pottery coins arrive');
    assert.equal(st.potteryWheel.pieces.length, 1);
    assert.deepEqual(st.potteryWheel.combos, { cup_sakura: 1 });
    assert.deepEqual([st.potteryWheel.wardCharges, st.potteryWheel.wardGlazeId, st.potteryWheel.wardShapeId], [2, 'sakura', 'cup'], 'A cup grants two shifts of sakura ward');
    assert.equal(st.journalSummary.potteries7d, 1, 'Weekly journal counts the pottery');
    assert(st.ar14Audio.potteryDoneCount >= 1, 'Out-of-kiln chime');
    assert.equal(st.potteryVisual.pieces.length, 1, 'The cup goes on the windowside shelf');
    pDom = await page.evaluate(() => ({
      shelf: document.querySelectorAll('#pw-shelf-grid .pw-shelf-chip').length,
      shelfImgs: Array.from(document.querySelectorAll('#pw-shelf-grid img')).every((im) => im.naturalWidth > 0),
      goShift: !document.getElementById('btn-pottery-go-shift').classList.contains('hidden'),
      ward: document.getElementById('pw-ward-line').textContent,
      main: document.getElementById('btn-pottery-main').textContent,
      pill: !document.getElementById('pottery-aroma-pill').classList.contains('hidden'),
      pillTag: document.getElementById('pa-pill-pottery').textContent,
      summary: document.getElementById('pw-summary-pill').textContent
    }));
    assert.deepEqual(
      [pDom.shelf, pDom.shelfImgs, pDom.goShift, pDom.main, pDom.pill, pDom.pillTag, pDom.summary],
      [1, true, true, '再做一件', true, '护2', '陶艺架 1 件 · 图鉴 1/6'],
      `Done DOM: ${JSON.stringify(pDom)}`
    );
    assert(pDom.ward.includes('樱粉好运') && pDom.ward.includes('2 个打工班次'), `Ward line: ${pDom.ward}`);
    await page.waitForTimeout(300);
    await shot(page, 'desktop_1440x900_pottery_done.png');

    // 第二件：花瓶（4 圈）+ 青瓷釉；“她来拉坯”一口气拉好，点釉色直接上釉，送进小窑
    await page.click('#btn-pottery-main');
    await page.waitForTimeout(80);
    await page.click('#pw-shape-row [data-shape-id="vase"]');
    await page.waitForTimeout(80);
    assert.equal(await page.locator('#btn-pottery-main').textContent(), '转盘拉坯 0/4');
    await page.click('#btn-pottery-helper');
    await page.waitForTimeout(120);
    run = await dbg(page, 'getPotteryRun');
    assert.deepEqual([run.phase, run.taps, run.shapeId], ['glaze', 4, 'vase'], `Helper shapes the vase: ${JSON.stringify(run)}`);
    await page.click('#pw-glaze-row [data-glaze-id="celadon"]');
    await page.waitForTimeout(100);
    run = await dbg(page, 'getPotteryRun');
    assert.deepEqual([run.phase, run.glazeId, run.glazed], ['kiln', 'celadon', true], 'Tapping a glaze on a shaped piece glazes it');
    await page.click('#btn-pottery-main');
    await page.waitForTimeout(80);
    let fin = await dbg(page, 'finishFiring');
    assert.deepEqual([fin.shapeId, fin.glazeId, fin.isNewCombo, fin.reward.coins], ['vase', 'celadon', true, 18]);
    st = await getState(page);
    assert.equal(st.potteryWheel.wardCharges, 3, 'Ward charges stack (2 + 1) and cap at 3');
    assert.equal(st.potteryWheel.wardGlazeId, 'celadon', 'The newest piece decides the ward');
    // 第三、四件：今日奖励 3 件封顶，第 4 件仍然上架 / 记周报，但不再给金币亲密
    await dbg(page, 'potteryMain');
    await dbg(page, 'pickShape', 'cup');
    await dbg(page, 'potteryHelper');
    await dbg(page, 'pickGlaze', 'cream');
    await dbg(page, 'fire');
    fin = await dbg(page, 'finishFiring');
    assert.deepEqual(fin.reward, { coins: 18, xp: 12 }, 'Third piece still rewarded');
    await dbg(page, 'potteryMain');
    await dbg(page, 'pickShape', 'vase');
    await dbg(page, 'potteryHelper');
    await dbg(page, 'pickGlaze', 'sakura');
    await dbg(page, 'fire');
    const coinsBefore4 = (await getState(page)).coins;
    fin = await dbg(page, 'finishFiring');
    assert.equal(fin.reward, null, 'Fourth piece of the day: no more coins (3 per day)');
    st = await getState(page);
    assert.equal(st.coins, coinsBefore4, 'No coins after the daily cap');
    assert.equal(st.potteryStats.rewardsToday, 3);
    assert.equal(st.potteryStats.combos, 4, 'cup_sakura / vase_celadon / cup_cream / vase_sakura');
    assert.equal(st.potteryWheel.pieces.length, 4);
    assert.equal(st.journalSummary.potteries7d, 4, 'All four pieces count in the 7-day report');
    assert.equal(st.potteryVisual.pieces.length, 4, 'Four pieces line the windowside shelf');
    assert.deepEqual([st.potteryWheel.wardGlazeId, st.potteryWheel.wardShapeId, st.potteryWheel.wardCharges], ['sakura', 'vase', 3]);
    // 场景：陶艺架上 4 件陶器 + 转盘，点架子打开陶艺卡
    await closeAll(page);
    await dbg(page, 'placePlayerForTest', 0.5);
    await page.waitForTimeout(600);
    await shot(page, 'desktop_1440x900_scene_shelf.png');
    L = await dbg(page, 'getLayouts');
    assert.equal(L.shelf.slots.length, 4, 'Shelf layout has four pottery slots');
    let scene = await sceneAudit(page);
    assert(scene.inStage && scene.clashes.length === 0, `1440x900 scene objects: ${JSON.stringify(scene)}`);
    await tapStage(page, { x: L.shelf.slots[3].x, y: L.shelf.baseY - L.shelf.piece * 0.4 }, 'Shelf (leftmost pot) tap');
    assert.deepEqual(await openPanelNames(page), ['potteryWheel'], 'Tapping any pot on the shelf opens the pottery card');

    // 5. 幸存者：陶艺佑护按班次生效（进入打工消耗 1 次，离开即结束）
    // 最新一件是 樱粉釉花瓶：金币 0.08 × 花瓶 1.5 × 图鉴 (1 + 0.04 × 4) = +13.92%
    await page.click('#btn-pottery-go-shift');
    await page.waitForTimeout(300);
    st = await getState(page);
    assert.equal(st.gameMode, 'survivor');
    assert.deepEqual(
      st.shiftPottery,
      { glazeId: 'sakura', shapeId: 'vase', combos: 4, guardPct: 0, coinPct: 0.1392, magnetPct: 0 },
      `Shift pottery ward: ${JSON.stringify(st.shiftPottery)}`
    );
    assert.equal(st.potteryWheel.wardCharges, 2, 'Entering a shift uses one charge');
    assert.equal(st.survivorMetrics.potteryCoinMult, 1.1392);
    assert(st.survivorMetrics.coinMult >= 1.1392 - 1e-6, `Coin multiplier includes the pottery ward: ${st.survivorMetrics.coinMult}`);
    assert(st.emote.includes('樱粉好运'), `She announces the pottery ward: ${st.emote}`);
    assert.equal(st.overlay.shown, false, 'No room tint in the survivor shift');
    const stripHasPottery = await page.evaluate(() => {
      const strip = document.getElementById('surv-skill-strip');
      return Boolean(strip && !strip.classList.contains('hidden') && strip.innerHTML.includes('ui_btn_pottery_wheel.webp'));
    });
    assert(stripHasPottery, 'Survivor skill strip must show the ui_btn_pottery_wheel.webp badge');
    await page.waitForTimeout(250);
    await shot(page, 'desktop_1440x900_survivor_strip.png');
    await page.click('.mode-btn[data-mode="pet"]');
    await page.waitForTimeout(240);
    st = await getState(page);
    assert.equal(st.shiftPottery, null, 'The ward ends when the shift ends');
    assert.equal(st.survivorMetrics.potteryCoinMult, 1);
    // 奶白釉茶杯：减伤 0.06 × (1 + 0.04 × 4) = 6.96%；青瓷釉花瓶：磁吸 0.15 × 1.5 × 1.16 = 26.1%
    await dbg(page, 'potteryMain');
    await dbg(page, 'pickShape', 'cup');
    await dbg(page, 'potteryHelper');
    await dbg(page, 'pickGlaze', 'cream');
    await dbg(page, 'fire');
    await dbg(page, 'finishFiring');
    await page.click('.mode-btn[data-mode="survivor"]');
    await page.waitForTimeout(260);
    st = await getState(page);
    assert.deepEqual([st.shiftPottery.glazeId, st.shiftPottery.guardPct], ['cream', 0.0696], `Cream guard: ${JSON.stringify(st.shiftPottery)}`);
    assert.equal(st.survivorMetrics.potteryDamageMult, 0.9304);
    assert(st.survivorMetrics.effectiveDamageReductionPct >= 0.0696 - 1e-6, `Damage reduction includes the cream ward: ${st.survivorMetrics.effectiveDamageReductionPct}`);
    await page.click('.mode-btn[data-mode="pet"]');
    await page.waitForTimeout(220);
    await dbg(page, 'potteryMain');
    await dbg(page, 'pickShape', 'vase');
    await dbg(page, 'potteryHelper');
    await dbg(page, 'pickGlaze', 'celadon');
    await dbg(page, 'fire');
    await dbg(page, 'finishFiring');
    await page.click('.mode-btn[data-mode="survivor"]');
    await page.waitForTimeout(260);
    st = await getState(page);
    assert.deepEqual([st.shiftPottery.glazeId, st.shiftPottery.magnetPct], ['celadon', 0.261], `Celadon magnet: ${JSON.stringify(st.shiftPottery)}`);
    assert.equal(st.survivorMetrics.potteryMagnetMult, 1.261);
    assert(st.survivorMetrics.magnetMult >= 1.261 - 1e-6, `Magnet multiplier includes the celadon ward: ${st.survivorMetrics.magnetMult}`);
    await page.click('.mode-btn[data-mode="pet"]');
    await page.waitForTimeout(240);

    // 6. 香氛：真实点按 选心情 → 点香氛瓶 / 主按钮滴 3 滴 → 点香（季节按本地日期）
    await page.click('#btn-shop');
    await page.waitForTimeout(200);
    await page.click('[data-ar14-shortcut="aroma"]');
    await page.waitForTimeout(180);
    let aDom = await page.evaluate(() => ({
      season: document.getElementById('am-season-row').dataset.season,
      seasonName: document.getElementById('am-season-name').textContent,
      moods: Array.from(document.querySelectorAll('#am-mood-row .am-mood-chip')).map((c) => c.dataset.moodId),
      imgs: Array.from(document.querySelectorAll('#aroma-table-card img')).every((im) => im.complete && im.naturalWidth > 0),
      main: document.getElementById('btn-aroma-main').textContent,
      mainDisabled: document.getElementById('btn-aroma-main').disabled,
      stopHidden: document.getElementById('btn-aroma-stop').classList.contains('hidden'),
      codex: document.querySelectorAll('#am-codex-grid .am-codex-chip').length
    }));
    assert.deepEqual(
      aDom,
      {
        season: todaySeason,
        seasonName: `${SEASON_NAMES[todaySeason]} · ${SEASON_NOTES[todaySeason]}`,
        moods: ['bliss', 'focus', 'cozy', 'star', 'goodnight'],
        imgs: true,
        main: '先选心情',
        mainDisabled: true,
        stopHidden: true,
        codex: 5
      },
      `Fresh aroma card: ${JSON.stringify(aDom)}`
    );
    await page.click('#am-mood-row [data-mood-id="cozy"]');
    await page.waitForTimeout(100);
    assert.equal(await page.locator('#btn-aroma-main').textContent(), '滴入精油 0/3');
    assert((await page.locator('#am-recipe-line').textContent()).includes(`${SEASON_NOTES[todaySeason]} · 焦糖肉桂`), 'Recipe = season base + mood heart note');
    await page.click('#am-bottle-stage');
    await page.waitForTimeout(90);
    await page.click('#btn-aroma-main');
    await page.waitForTimeout(90);
    await page.click('#btn-aroma-main');
    await page.waitForTimeout(90);
    st = await getState(page);
    assert.equal(st.aromaRun.drops, 3, 'Three drops: bottle tap + two main taps');
    assert.equal(await page.evaluate(() => document.querySelectorAll('#am-drops .am-drop.filled').length), 3);
    assert.equal(await page.locator('#btn-aroma-main').textContent(), '摇匀点香');
    assert(st.ar14Audio.aromaDropCount >= 3, 'Each drop plinks');
    await shot(page, 'desktop_1440x900_aroma_drops.png');
    const coinsBeforeAroma = st.coins;
    await page.click('#btn-aroma-main');
    await page.waitForTimeout(260);
    st = await getState(page);
    const aRes = st.aromaRun.lastResult;
    assert.deepEqual(
      [aRes.recipeId, aRes.isNew, aRes.kelvin, aRes.tone],
      [`${todaySeason}_cozy`, true, 2900, '琥珀'],
      `Lit fragrance: ${JSON.stringify(aRes)}`
    );
    assert.deepEqual(aRes.reward, { coins: 16, xp: 6 }, 'First blend: 6 coins + 10 for a new recipe');
    assert(st.coins >= coinsBeforeAroma + 16, 'Aroma coins arrive');
    assert.equal(st.aromaTable.active.endMs - st.aromaTable.active.startMs, 30 * 60000, 'One blend lasts 30 minutes');
    assert.deepEqual(st.aromaTable.discovered, { [`${todaySeason}_cozy`]: 1 });
    assert.equal(st.aromaStats.active.minsLeft, 30);
    assert.deepEqual([st.overlay.shown, st.overlay.mood, st.overlay.season, st.overlay.kelvin], [true, 'cozy', todaySeason, 2900], `Room tint: ${JSON.stringify(st.overlay)}`);
    assert.equal(st.journalSummary.aromas7d, 1, 'Weekly journal counts the blend');
    assert(st.ar14Audio.aromaLightCount >= 1, 'Lighting chimes');
    assert.equal(st.aromaAffectionMult, 1.1, 'Fragrance comfort: +10% affection in pet mode');
    const tintAudit = await page.evaluate(() => {
      const ov = document.getElementById('aroma-ambient-overlay');
      const cs = getComputedStyle(ov);
      const cols = Array.from(cs.backgroundImage.matchAll(/rgba?\(([^)]+)\)/g)).map((m) => m[1].split(',').map((v) => Number(v.trim())));
      const c = document.getElementById('game-canvas').getBoundingClientRect();
      const hit = document.elementFromPoint(c.left + c.width * 0.3, c.top + c.height * 0.5);
      return {
        visible: cs.visibility === 'visible' && Number(cs.opacity) > 0.5,
        pointer: cs.pointerEvents,
        cols,
        canvasStillTappable: Boolean(hit && hit.id === 'game-canvas'),
        stageTag: document.getElementById('am-stage-tag').textContent,
        stopShown: !document.getElementById('btn-aroma-stop').classList.contains('hidden'),
        pill: !document.getElementById('pottery-aroma-pill').classList.contains('hidden'),
        aromaSeg: !document.getElementById('pa-seg-aroma').classList.contains('hidden'),
        aromaTag: document.getElementById('pa-pill-aroma').textContent
      };
    });
    assert(tintAudit.visible && tintAudit.pointer === 'none' && tintAudit.canvasStillTappable, `Room tint must be visible but click-through: ${JSON.stringify(tintAudit)}`);
    assert(tintAudit.cols.length >= 3, `Room tint must be a layered gradient: ${JSON.stringify(tintAudit.cols)}`);
    for (const [r, g, b, a] of tintAudit.cols) {
      assert(Math.min(r, g, b) >= 180, `Room tint must stay cream/pastel, got rgba(${r},${g},${b},${a})`);
      assert(!(a > 0.3), `Room tint must stay subtle (alpha <= 0.3), got ${a}`);
    }
    assert.deepEqual(
      [tintAudit.stageTag, tintAudit.stopShown, tintAudit.pill, tintAudit.aromaSeg, tintAudit.aromaTag],
      ['琥珀 · 2900K', true, true, true, '30分'],
      `Lit HUD: ${JSON.stringify(tintAudit)}`
    );
    await page.waitForTimeout(400);
    await shot(page, 'desktop_1440x900_aroma_lit.png');
    // 香氛舒心：点香期间亲密度 +10%（与熄香后对比）
    const probeOn = await dbg(page, 'getAffectionMults');
    assert.equal(probeOn.aroma, 1.1);
    // 合并胶囊：点香氛段打开香氛卡，点陶艺段打开陶艺卡
    await closeAll(page);
    await page.click('#pa-seg-pottery');
    await page.waitForTimeout(160);
    assert.deepEqual(await openPanelNames(page), ['potteryWheel'], 'Pill pottery segment opens the pottery card');
    await page.click('#pa-seg-aroma');
    await page.waitForTimeout(160);
    assert.deepEqual(await openPanelNames(page), ['aromaTable'], 'Pill aroma segment opens the aroma card');
    // 场景：小香氛台上多了香薰机 + 心情色柔光；房间色温层在整个场景上
    await closeAll(page);
    await dbg(page, 'placePlayerForTest', 0.5);
    await page.waitForTimeout(700);
    await shot(page, 'desktop_1440x900_scene_aroma.png');
    // 可注入时钟：10 分钟后还剩 20 分；切到打工模式色温层隐藏，回来恢复
    await dbg(page, 'advanceClock', 10 * 60000);
    st = await getState(page);
    assert.equal(st.aromaStats.active.minsLeft, 20, 'Injected clock: 20 minutes left');
    assert.equal(await page.locator('#pa-pill-aroma').textContent(), '20分');
    await page.click('.mode-btn[data-mode="survivor"]');
    await page.waitForTimeout(220);
    assert.equal((await getState(page)).overlay.shown, false, 'Room tint hides during the survivor shift');
    assert.equal((await getState(page)).aromaAffectionMult, 1, 'Fragrance comfort is a pet-mode buff');
    await page.click('.mode-btn[data-mode="pet"]');
    await page.waitForTimeout(220);
    assert.equal((await getState(page)).overlay.shown, true, 'Room tint comes back in the room');
    // 21 分钟后自然散去
    await dbg(page, 'advanceClock', 21 * 60000);
    st = await getState(page);
    assert.equal(st.aromaTable.active, null, 'Fragrance fades after 30 minutes');
    assert.equal(st.overlay.shown, false);
    assert(st.emote.includes('散去'), `She notices the fragrance fading: ${st.emote}`);
    const probeOff = await dbg(page, 'getAffectionMults');
    assert.equal(probeOff.aroma, 1);
    assert(Math.abs(probeOn.total / probeOff.total - 1.1) < 1e-3, `+10% affection while lit: ${probeOn.total} vs ${probeOff.total}`);
    // 她来调：沿用已选心情一口气滴满点香；熄香立刻恢复房间颜色
    await dbg(page, 'openAroma');
    await page.waitForTimeout(120);
    await page.click('#btn-aroma-helper');
    await page.waitForTimeout(200);
    st = await getState(page);
    assert.equal(st.aromaRun.lastResult.recipeId, `${todaySeason}_cozy`);
    assert.equal(st.aromaRun.lastResult.isNew, false);
    assert.deepEqual(st.aromaRun.lastResult.reward, { coins: 6, xp: 6 }, 'Second blend of the day: 6 coins');
    assert.equal(st.overlay.shown, true);
    await page.click('#btn-aroma-stop');
    await page.waitForTimeout(160);
    st = await getState(page);
    assert.deepEqual([st.aromaTable.active, st.overlay.shown], [null, false], 'Stopping the fragrance clears the tint');
    // 每天前 3 次调香有奖励
    await dbg(page, 'aromaHelper');
    const fourth = await dbg(page, 'aromaHelper');
    assert.equal(fourth.reward, null, 'Fourth blend of the day: no more coins');
    assert.equal((await getState(page)).aromaStats.rewardsToday, 3);
    // 四季：按本地日期切换季节基调，新季节新心情 = 新香氛
    for (const [month, sid] of [
      [3, 'spring'],
      [6, 'summer'],
      [9, 'autumn'],
      [0, 'winter']
    ]) {
      const d = new Date(today.getFullYear() + 1, month, 15, 20, 30, 0, 0);
      await dbg(page, 'setClock', d.getTime());
      st = await getState(page);
      assert.equal(st.aromaStats.seasonId, sid, `${d.toDateString()} is ${sid}`);
      assert.equal(await page.evaluate(() => document.getElementById('am-season-row').dataset.season), sid);
    }
    await dbg(page, 'setClock', new Date(today.getFullYear() + 1, 3, 15, 22, 0, 0, 0).getTime());
    await dbg(page, 'pickMood', 'goodnight');
    for (let i = 0; i < 3; i++) await dbg(page, 'drop');
    const springRes = await dbg(page, 'light');
    assert.deepEqual([springRes.recipeId, springRes.name, springRes.isNew], ['spring_goodnight', '樱花白茶 · 薰衣草', true]);
    st = await getState(page);
    assert.deepEqual([st.overlay.mood, st.overlay.season], ['goodnight', 'spring']);
    assert.equal(st.aromaStats.discovered, 2);
    await page.waitForTimeout(300);
    await shot(page, 'desktop_1440x900_aroma_spring.png');
    await dbg(page, 'stopAroma');

    // 7. 七日心情周报 + 手写日记联动
    await dbg(page, 'setClock', today.getTime());
    await page.click('#btn-weekly-journal');
    await page.waitForTimeout(260);
    const journal = await page.evaluate(() => ({
      summary: window.__AR14_DEBUG__.getState().journalSummary,
      cardText: document.getElementById('weekly-journal-card')?.textContent || ''
    }));
    assert(journal.summary.potteries7d >= 6, `7-day pottery count: ${journal.summary.potteries7d}`);
    assert(journal.summary.aromas7d >= 4, `7-day aroma count: ${journal.summary.aromas7d}`);
    assert.equal(journal.summary.cumulative.potteryCombos, 4);
    assert.equal(journal.summary.cumulative.aromaRecipes, 2);
    assert(
      journal.cardText.includes('陶艺香氛与手作篮') &&
        journal.cardText.includes(`陶艺 ${journal.summary.potteries7d} 件`) &&
        journal.cardText.includes(`香氛 ${journal.summary.aromas7d}次`) &&
        journal.cardText.includes('陶艺图鉴 4/6') &&
        journal.cardText.includes('钩针') &&
        journal.cardText.includes('压花') &&
        journal.cardText.includes('周末野餐与日记'),
      `Weekly journal card must render the pottery / aroma metrics (and keep crochet / pressed / picnic), got ${journal.cardText}`
    );
    assert(journal.cardText.includes('小陶器'), 'Companion quote mentions the pottery');
    await page.waitForTimeout(200);
    await shot(page, 'desktop_1440x900_journal.png');
    await page.click('#btn-diary-book');
    await page.waitForTimeout(260);
    const diaryLines = await page.evaluate(() => Array.from(document.querySelectorAll('#dy-page-lines .dy-line')).map((li) => li.textContent.trim()));
    assert(diaryLines.some((l) => l.includes('窗畔转盘') && l.includes('陶艺架')), `Diary mentions today's pottery: ${JSON.stringify(diaryLines)}`);
    assert(diaryLines.some((l) => l.includes('香氛')), `Diary mentions today's fragrance: ${JSON.stringify(diaryLines)}`);
    assert(await page.evaluate(() => Array.from(document.querySelectorAll('#dy-page-lines .dy-line-ico')).every((im) => im.naturalWidth > 0)), 'Diary line icons (pottery / aroma) load');
    await page.click('#btn-diary-book');
    await page.waitForTimeout(160);

    // 8. 桌面 1440x900：25 键单排不变，两张卡不压船坞 / 顶部工具栏
    let dock = await dockAudit(page);
    assert(dock.count === CARE_BTN_COUNT && dock.rows === 1 && dock.overlap === 0 && dock.joyMargin >= MIN_DOCK_MARGIN && dock.jumpMargin >= MIN_DOCK_MARGIN, `1440x900 dock: ${JSON.stringify(dock)}`);
    for (const [cardId, fn] of [
      ['pottery-wheel-card', 'openPottery'],
      ['aroma-table-card', 'openAroma']
    ]) {
      await dbg(page, fn);
      await page.waitForTimeout(160);
      const a = await cardAudit(page, cardId);
      const hOverlap = Math.min(a.cardRight, a.careRight) - Math.max(a.cardLeft, a.careLeft) > 0;
      assert(a.cardOpen && a.overflowX <= 0 && a.overflowY <= 0 && a.outside === 0 && a.imgsLoaded && !a.hasEmoji, `1440x900 ${cardId}: ${JSON.stringify(a)}`);
      assert(!hOverlap || a.cardBottom <= a.careTop + 1, `${cardId} overlaps the dock on 1440x900: ${JSON.stringify(a)}`);
      assert(a.cardTop >= a.hudRightBottom - 1, `${cardId} overlaps the toolbar on 1440x900: ${JSON.stringify(a)}`);
      assert(a.scrollable <= 1, `${cardId} fits without inner scrolling on 1440x900: ${JSON.stringify(a)}`);
    }
    await closeAll(page);

    // 9. 中等桌面：1280x720 单排、1024x768 两排；入口照样能点到，卡片不压船坞，场景物件不压 HUD
    await dbg(page, 'pickMood', 'bliss');
    for (let i = 0; i < 3; i++) await dbg(page, 'drop');
    await dbg(page, 'light');
    for (const [w, h, rowsExpected] of [
      [1280, 720, 1],
      [1024, 768, 2]
    ]) {
      await page.setViewportSize({ width: w, height: h });
      await page.waitForTimeout(300);
      dock = await dockAudit(page);
      assert(dock.count === CARE_BTN_COUNT && dock.overlap === 0 && dock.rows === rowsExpected && dock.joyMargin >= MIN_DOCK_MARGIN && dock.jumpMargin >= MIN_DOCK_MARGIN, `${w}x${h} dock: ${JSON.stringify(dock)}`);
      scene = await sceneAudit(page);
      assert(scene.inStage && scene.clashes.length === 0, `${w}x${h} scene objects: ${JSON.stringify(scene)}`);
      await page.click('#btn-shop');
      await page.waitForTimeout(220);
      await page.click('[data-ar14-shortcut="pottery"]');
      await page.waitForTimeout(180);
      assert.deepEqual(await openPanelNames(page), ['potteryWheel'], `${w}x${h}: drawer pottery shortcut is reachable`);
      await closeAll(page);
      await dbg(page, 'placePlayerForTest', 0.5);
      L = await dbg(page, 'getLayouts');
      await tapStage(page, L.diffuser.hit, `${w}x${h} aroma table`);
      assert.deepEqual(await openPanelNames(page), ['aromaTable'], `${w}x${h}: scene aroma table is reachable`);
      for (const [cardId, fn] of [
        ['pottery-wheel-card', 'openPottery'],
        ['aroma-table-card', 'openAroma']
      ]) {
        await dbg(page, fn);
        await page.waitForTimeout(160);
        const a = await cardAudit(page, cardId);
        const hOverlap = Math.min(a.cardRight, a.careRight) - Math.max(a.cardLeft, a.careLeft) > 0;
        assert(a.cardOpen && a.overflowX <= 0 && a.overflowY <= 0 && a.outside === 0 && !a.hasEmoji, `${w}x${h} ${cardId}: ${JSON.stringify(a)}`);
        assert(!hOverlap || a.cardBottom <= a.careTop + 1, `${cardId} overlaps the dock on ${w}x${h}: ${JSON.stringify(a)}`);
        assert(a.cardTop >= a.hudRightBottom - 1, `${cardId} overlaps the toolbar on ${w}x${h}: ${JSON.stringify(a)}`);
        await page.waitForTimeout(220);
        await shot(page, `desktop_${w}x${h}_${cardId === 'pottery-wheel-card' ? 'pottery' : 'aroma'}.png`);
      }
      await closeAll(page);
      await page.waitForTimeout(400);
      await shot(page, `desktop_${w}x${h}_scene.png`);
    }

    // 10. 移动端 390x844（竖屏强制横置，真实点按）：抽屉入口 → 拉坯上釉烧成；场景小香氛台 → 调香点香
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(350);
    const portraitDock = await dockAudit(page);
    assert.equal(portraitDock.rotated, true, '390x844 uses the rotated landscape stage');
    assert(portraitDock.count === CARE_BTN_COUNT && portraitDock.rows === 2 && portraitDock.overlap === 0, `390x844 dock: ${JSON.stringify(portraitDock)}`);
    assert(portraitDock.joyMargin >= MIN_DOCK_MARGIN && portraitDock.jumpMargin >= MIN_DOCK_MARGIN && portraitDock.minKey >= 30, `390x844 dock margins: ${JSON.stringify(portraitDock)}`);
    await dbg(page, 'stopAroma');
    await dbg(page, 'resetPotteryForTest');
    await dbg(page, 'resetAromaForTest');
    await page.click('#btn-shop');
    await page.waitForTimeout(260);
    await page.click('[data-ar14-shortcut="pottery"]');
    await page.waitForTimeout(220);
    assert.deepEqual(await openPanelNames(page), ['potteryWheel'], 'Real tap on the rotated drawer shortcut opens the pottery card');
    await page.click('#pw-shape-row [data-shape-id="cup"]');
    await page.waitForTimeout(80);
    for (let i = 0; i < 3; i++) {
      await page.click('#pw-wheel');
      await page.waitForTimeout(90);
    }
    await page.click('#pw-glaze-row [data-glaze-id="celadon"]');
    await page.waitForTimeout(100);
    run = await dbg(page, 'getPotteryRun');
    assert.deepEqual([run.phase, run.shapeId, run.glazeId, run.glazed], ['kiln', 'cup', 'celadon', true], `Real taps shape + glaze on 390x844: ${JSON.stringify(run)}`);
    await page.click('#btn-pottery-main');
    await page.waitForTimeout(200);
    await shot(page, 'mobile_390x844_pottery.png');
    await page.waitForTimeout(1800);
    assert.equal((await dbg(page, 'getPotteryRun')).phase, 'done', 'Real tap fires the kiln on 390x844');
    let pa = await cardAudit(page, 'pottery-wheel-card');
    assert(pa.cardOpen && pa.overflowX <= 0 && pa.overflowY <= 0 && pa.outside === 0 && !pa.hasEmoji, `390x844 pottery card: ${JSON.stringify(pa)}`);
    await closeAll(page);
    await dbg(page, 'placePlayerForTest', 0.5);
    await page.waitForTimeout(200);
    L = await dbg(page, 'getLayouts');
    await tapStage(page, L.diffuser.hit, '390x844 aroma table');
    assert.deepEqual(await openPanelNames(page), ['aromaTable'], 'Real tap on the rotated scene aroma table opens the aroma card');
    await page.click('#am-mood-row [data-mood-id="focus"]');
    await page.waitForTimeout(80);
    for (let i = 0; i < 3; i++) {
      await page.click('#am-bottle-stage');
      await page.waitForTimeout(80);
    }
    await page.click('#btn-aroma-main');
    await page.waitForTimeout(220);
    st = await getState(page);
    assert.deepEqual([st.aromaTable.active && st.aromaTable.active.moodId, st.overlay.shown], ['focus', true], 'Real taps light a focus fragrance on 390x844');
    pa = await cardAudit(page, 'aroma-table-card');
    assert(pa.cardOpen && pa.overflowX <= 0 && pa.overflowY <= 0 && pa.outside === 0 && !pa.hasEmoji, `390x844 aroma card: ${JSON.stringify(pa)}`);
    await page.waitForTimeout(250);
    await shot(page, 'mobile_390x844_aroma.png');
    await closeAll(page);
    await dbg(page, 'placePlayerForTest', 0.5);
    L = await dbg(page, 'getLayouts');
    await tapStage(page, shelfCenter(L), '390x844 shelf');
    assert.deepEqual(await openPanelNames(page), ['potteryWheel'], 'Real tap on the rotated scene shelf opens the pottery card');
    await closeAll(page);
    await page.waitForTimeout(500);
    await shot(page, 'mobile_390x844_scene.png');

    // 11. 844x390 横屏：两排船坞 / 两张卡片 / 顶部 HUD / 胶囊行 零重叠，卡片内容无内部滚动
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(350);
    const landDock = await dockAudit(page);
    assert(landDock.count === CARE_BTN_COUNT && landDock.rows === 2 && landDock.overlap === 0 && landDock.joyMargin >= MIN_DOCK_MARGIN && landDock.jumpMargin >= MIN_DOCK_MARGIN, `844x390 dock: ${JSON.stringify(landDock)}`);
    scene = await sceneAudit(page);
    assert(scene.inStage && scene.clashes.length === 0, `844x390 scene objects: ${JSON.stringify(scene)}`);
    for (const [cardId, fn, shotName] of [
      ['pottery-wheel-card', 'openPottery', 'mobile_844x390_pottery.png'],
      ['aroma-table-card', 'openAroma', 'mobile_844x390_aroma.png']
    ]) {
      await dbg(page, fn);
      await page.waitForTimeout(200);
      const la = await cardAudit(page, cardId);
      assert(la.cardOpen, `${cardId} must be open on 844x390`);
      assert(la.overflowX <= 0 && la.overflowY <= 0 && !la.hasEmoji && la.outside === 0, `844x390 overflow: ${JSON.stringify(la)}`);
      assert(la.profileRight <= la.cardLeft, `${cardId} overlaps profile on 844x390: ${JSON.stringify(la)}`);
      assert(la.cardBottom <= la.actTop + 2, `${cardId} overlaps action zone on 844x390: ${JSON.stringify(la)}`);
      assert(la.cardBottom <= la.careTop + 1, `${cardId} overlaps the two-row dock on 844x390: ${JSON.stringify(la)}`);
      assert(la.cardTop >= la.hudRightBottom - 1, `${cardId} overlaps the top-right toolbar: ${JSON.stringify(la)}`);
      assert(la.switcherRight <= la.hudRightLeft + 2, `Top HUD overlap on 844x390: ${JSON.stringify(la)}`);
      assert(la.pillBottom <= la.joyTop + 2, `HUD pills overlap joystick on 844x390: ${JSON.stringify(la)}`);
      assert(la.scrollable <= 1, `${cardId} content must fit without inner scrolling on 844x390: ${JSON.stringify(la)}`);
      await page.waitForTimeout(220);
      await shot(page, shotName);
    }
    await closeAll(page);
    // 窄屏胶囊：AR-11 ~ AR-14 四颗合并胶囊放得下才显示（与已有胶囊同一行），绝不新开一行
    await page.waitForTimeout(800);
    const pillRowAudit = await page.evaluate(() => {
      const visible = (b) => !b.classList.contains('hidden') && b.offsetParent !== null;
      const ids = ['kitchen-memory-pill', 'sill-card-pill', 'picnic-diary-pill', 'pottery-aroma-pill'];
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
      res.layout = Array.from(document.querySelectorAll('#hud-ambience-row > button')).filter(visible).map((b) => `${b.id}@${b.offsetTop}`);
      return res;
    });
    assert(
      ['kitchen-memory-pill', 'sill-card-pill', 'picnic-diary-pill', 'pottery-aroma-pill'].every((id) => pillRowAudit[id].sharesRow) &&
        pillRowAudit.withPills === pillRowAudit.withoutPills,
      `AR-11 ~ AR-14 pills must not add a HUD pill row on 844x390: ${JSON.stringify(pillRowAudit)}`
    );
    await page.waitForTimeout(400);
    await shot(page, 'mobile_844x390_scene.png');
    // 极端情况：胶囊行塞满时，AR-14 胶囊先只留优先段，仍放不下就自动收起而不是换行
    const crowded = await page.evaluate(async () => {
      const ids = ['pomodoro-mini-pill', 'teatime-buff-pill', 'terrarium-blessing-pill', 'musicbox-mini-pill', 'collage-blessing-pill'];
      const prev = ids.map((id) => document.getElementById(id)?.classList.contains('hidden'));
      ids.forEach((id) => document.getElementById(id)?.classList.remove('hidden'));
      await new Promise((r) => setTimeout(r, 900));
      const pill = document.getElementById('pottery-aroma-pill');
      const visible = (b) => !b.classList.contains('hidden') && b.offsetParent !== null;
      const others = Array.from(document.querySelectorAll('#hud-ambience-row > button')).filter((b) => b !== pill && visible(b));
      const res = {
        shown: visible(pill),
        folded: pill.classList.contains('pa-no-room') || pill.classList.contains('pa-solo'),
        sharesRow: visible(pill)
          ? others.some((b) => Math.abs(b.offsetTop + b.offsetHeight / 2 - (pill.offsetTop + pill.offsetHeight / 2)) <= 6)
          : true
      };
      ids.forEach((id, i) => {
        if (prev[i]) document.getElementById(id)?.classList.add('hidden');
      });
      return res;
    });
    assert(crowded.sharesRow, `With a crowded pill row the AR-14 pill must fold away instead of wrapping: ${JSON.stringify(crowded)}`);
    await page.waitForTimeout(700);
    await dbg(page, 'stopAroma');

    // 12. 旧存档 / 脏数据安全默认值
    await page.setViewportSize({ width: 1440, height: 900 });
    await dbg(page, 'useRealClock');
    await page.evaluate((key) => {
      const raw = JSON.parse(localStorage.getItem(key) || '{}');
      delete raw.potteryWheel;
      delete raw.aromaTable;
      if (raw.weeklyJournal && raw.weeklyJournal.cumulative) {
        delete raw.weeklyJournal.cumulative.totalPotteries;
        delete raw.weeklyJournal.cumulative.totalAromas;
      }
      localStorage.setItem(key, JSON.stringify(raw));
    }, SAVE_KEY);
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(400);
    const legacy = await getState(page);
    assert.deepEqual(legacy.potteryWheel.pieces, [], 'Legacy save: empty shelf');
    assert.deepEqual(legacy.potteryWheel.combos, {});
    assert.deepEqual([legacy.potteryWheel.wardCharges, legacy.potteryWheel.wardGlazeId, legacy.potteryWheel.lastShapeId, legacy.potteryWheel.lastGlazeId], [0, '', 'cup', 'cream']);
    assert.deepEqual([legacy.aromaTable.active, legacy.aromaTable.totalBlends, legacy.aromaTable.lastMoodId], [null, 0, '']);
    assert.deepEqual(legacy.aromaTable.discovered, {});
    assert.equal(legacy.overlay.shown, false);
    assert(legacy.journalSummary.potteries7d >= 6 && legacy.journalSummary.aromas7d >= 4, 'Journal history survives the legacy migration');
    assert.equal((await dbg(page, 'potteryHelper')).ok, true, 'Legacy save: pottery still playable');

    await page.evaluate((key) => {
      const raw = JSON.parse(localStorage.getItem(key) || '{}');
      raw.potteryWheel = {
        pieces: [
          { id: 'k2', shapeId: 'cup', glazeId: 'sakura', date: '2026-11-10' },
          { id: 'k2', shapeId: 'vase', glazeId: 'celadon', date: '2026-11-11' },
          { shapeId: 'bowl', glazeId: 'cream', date: '2026-11-11' },
          { id: 'x', shapeId: 'cup', glazeId: 'neon', date: '2026-11-12' },
          { id: 'k9', shapeId: 'cup', glazeId: 'cream', date: 'never' },
          null,
          'k5'
        ],
        seq: -3,
        combos: { cup_sakura: 'lots', moon_cream: 4, vase_celadon: 2 },
        wardCharges: 99,
        wardGlazeId: 'lava',
        wardShapeId: 'cup',
        rewardDate: 'x',
        rewardCount: 50,
        totalPieces: -1,
        lastShapeId: 'bowl',
        lastGlazeId: 'neon'
      };
      raw.aromaTable = {
        active: { seasonId: 'autumn', moodId: 'cozy', startMs: 1000, endMs: 1000 + 99 * 60000 },
        discovered: { autumn_cozy: 3, lava_bliss: 2, spring_bliss: 'x', winter_star: -1 },
        rewardDate: 'never',
        rewardCount: 9,
        totalBlends: 'many',
        lastMoodId: 'angry'
      };
      if (raw.weeklyJournal && raw.weeklyJournal.days) {
        const first = Object.keys(raw.weeklyJournal.days)[0];
        if (first) Object.assign(raw.weeklyJournal.days[first], { potteries: 'x', aromas: 1e9 });
      }
      localStorage.setItem(key, JSON.stringify(raw));
    }, SAVE_KEY);
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(400);
    let dirty = await getState(page);
    const dp = dirty.potteryWheel;
    assert.deepEqual(dp.pieces.map((e) => [e.shapeId, e.glazeId, e.date]), [
      ['cup', 'sakura', '2026-11-10'],
      ['vase', 'celadon', '2026-11-11']
    ], `Shelf keeps valid pieces only: ${JSON.stringify(dp.pieces)}`);
    assert.notEqual(dp.pieces[0].id, dp.pieces[1].id, 'Duplicate piece ids are re-numbered');
    assert(dp.seq >= 3, 'Piece id sequence never collides');
    assert.deepEqual(dp.combos, { vase_celadon: 2, cup_sakura: 1 }, `Combos sanitized: ${JSON.stringify(dp.combos)}`);
    assert.deepEqual([dp.wardCharges, dp.wardGlazeId, dp.wardShapeId], [3, 'celadon', 'cup'], 'Ward capped at 3, unknown glaze falls back to the latest piece');
    assert.deepEqual([dp.rewardDate, dp.rewardCount, dp.totalPieces, dp.lastShapeId, dp.lastGlazeId], ['', 0, 2, 'cup', 'cream']);
    const da = dirty.aromaTable;
    assert.equal(da.active, null, 'A 99-minute fragrance record is rejected');
    assert.deepEqual(da.discovered, { autumn_cozy: 3 });
    assert.deepEqual([da.rewardDate, da.rewardCount, da.totalBlends, da.lastMoodId], ['', 0, 3, '']);
    assert.equal(dirty.overlay.shown, false);
    assert.equal(dirty.journalSummary.daysList.length, 7, 'Journal still renders 7 days');
    // 存档里早已散去的香氛：载入后不出现色温层，并被静默清掉
    await page.evaluate((key) => {
      const raw = JSON.parse(localStorage.getItem(key) || '{}');
      const t = Date.now() - 2 * 3600000;
      raw.aromaTable = { active: { seasonId: 'winter', moodId: 'star', startMs: t, endMs: t + 30 * 60000 }, discovered: {} };
      localStorage.setItem(key, JSON.stringify(raw));
    }, SAVE_KEY);
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(1500);
    dirty = await getState(page);
    assert.deepEqual([dirty.aromaTable.active, dirty.overlay.shown], [null, false], 'An expired fragrance from the save stays off');
    assert.deepEqual(dirty.aromaTable.discovered, { winter_star: 1 }, 'The expired fragrance still counts in the codex');
    // 脏数据下依旧可以正常打开两张卡并继续游玩
    await page.click('#btn-shop');
    await page.waitForTimeout(220);
    await page.click('[data-ar14-shortcut="pottery"]');
    await page.waitForTimeout(180);
    assert.deepEqual(await openPanelNames(page), ['potteryWheel']);
    assert.equal((await dbg(page, 'potteryHelper')).ok, true);
    await dbg(page, 'openAroma');
    await page.waitForTimeout(160);
    assert.deepEqual(await openPanelNames(page), ['aromaTable']);
    const dirtyLit = await dbg(page, 'aromaHelper');
    assert.equal(dirtyLit.ok, true, `Blending works after a dirty save: ${JSON.stringify(dirtyLit)}`);
    await page.waitForTimeout(300);
    await shot(page, 'desktop_1440x900_aroma_dirty_save.png');
    await dbg(page, 'stopAroma');

    assert.equal(consoleErrors.length, 0, `Console errors observed: ${consoleErrors.join('; ')}`);
    assert.equal(pageErrors.length, 0, `Page errors observed: ${pageErrors.join('; ')}`);
    assert.equal(failedResponses.length, 0, `HTTP >= 400 responses observed: ${failedResponses.join('; ')}`);

    console.log(
      '[E2E PASS] AR-14 Windowside Pottery Wheel (shape -> glaze -> fire with real taps on the wheel / chips / main button, cup 3 turns x 2 shift charges vs vase 4 turns x 1.5 strength, 3 glazes = guard / coins / gem magnet scaled by a 6-combo codex, 3 rewarded pieces per day, pieces shown on a windowside shelf drawn from raster art) + Her Little Aroma Table (5 moods x 4 local-date seasons = 20 recipes, 3 drops then light for 30 min with an injectable clock, subtle cream room tint that is click-through and hidden outside pet mode, +10% affection while lit, fade / stop) with weekly-journal + diary links, entries via the 家具与装扮 drawer + scene shelf / aroma table + merged pill (dock stays 25 keys), passed across 1440x900, 1280x720, 1024x768, 390x844 (rotated, real taps) and 844x390, mutually exclusive overlays, safe legacy/dirty-save defaults and 0 errors!'
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
