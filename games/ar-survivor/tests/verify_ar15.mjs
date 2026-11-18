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
const PORT = Number(process.env.AR15_PORT || 0);

// 可选：设置 AR15_SHOT_DIR 后输出 1440x900 / 1280x720 / 1024x768 / 390x844 / 844x390 自审截图
const SHOT_DIR = process.env.AR15_SHOT_DIR || '';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.json': 'application/json; charset=utf-8'
};

const REQUIRED_AR15_ASSETS = [
  'ui_btn_star_projector.webp',
  'ui_btn_rain_corner.webp',
  'star_projector.webp',
  'constellation_card.webp',
  'rain_cushion.webp',
  'rain_chime.webp'
];

// AR-15 明确不再加船坞键：仍是 AR-13 起的 25 键
const CARE_BTN_COUNT = 25;
const SAVE_KEY = 'ar_deepseek_pet_v2';
const MIN_DOCK_MARGIN = 10;

// 与 game.js 同一套规格（测试里独立复算，不读游戏内部实现）
const STAR_CARDS = {
  leo: { season: 'spring', taps: 5, name: '狮子座' },
  bootes: { season: 'spring', taps: 4, name: '牧夫座' },
  scorpius: { season: 'summer', taps: 6, name: '天蝎座' },
  aquila: { season: 'summer', taps: 4, name: '天鹰座' },
  pegasus: { season: 'autumn', taps: 4, name: '飞马座' },
  andromeda: { season: 'autumn', taps: 5, name: '仙女座' },
  gemini: { season: 'winter', taps: 5, name: '双子座' },
  canis_major: { season: 'winter', taps: 4, name: '大犬座' }
};
const CARD_ORDER = Object.keys(STAR_CARDS);
const SEGMENTS = [
  { id: 'dawn', name: '清晨' },
  { id: 'day', name: '午后' },
  { id: 'dusk', name: '傍晚' },
  { id: 'night', name: '夜里' }
];
const WEATHERS = [
  { id: 'drizzle', name: '绵绵细雨', short: '细雨' },
  { id: 'eaves', name: '屋檐滴答', short: '檐滴' },
  { id: 'shower', name: '窗边阵雨', short: '阵雨' },
  { id: 'thunder', name: '远雷细雨', short: '远雷' },
  { id: 'breeze', name: '雨后微风', short: '微风' }
];

function seasonOf(d) {
  const m = d.getMonth() + 1;
  if (m >= 3 && m <= 5) return 'spring';
  if (m >= 6 && m <= 8) return 'summer';
  if (m >= 9 && m <= 11) return 'autumn';
  return 'winter';
}

function segIdxOf(d) {
  const h = d.getHours();
  if (h >= 5 && h < 10) return 0;
  if (h >= 10 && h < 16) return 1;
  if (h >= 16 && h < 20) return 2;
  return 3;
}

// 本地日期 + 时段的确定性“窗外天气”（与 game.js 的 getRainWeather 同一公式，独立复算）
function weatherOf(d) {
  const n = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  return WEATHERS[(n * 7 + segIdxOf(d) * 3) % WEATHERS.length];
}

function seasonCardsOf(seasonId) {
  return CARD_ORDER.filter((id) => STAR_CARDS[id].season === seasonId);
}

function dayAt(base, offsetDays, hh = 10, mm = 0) {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + offsetDays, hh, mm, 0, 0);
}

async function shot(page, name) {
  if (!SHOT_DIR) return;
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  // 自审截图前先收起偶发的亲密度里程碑弹窗（与 AR-15 无关，只是会挡住卡片头部）
  await page.evaluate(() => {
    const toast = document.getElementById('milestone-toast');
    if (toast && !toast.classList.contains('hidden')) document.getElementById('btn-milestone-toast-close')?.click();
  });
  await page.waitForTimeout(120);
  await page.screenshot({ path: path.join(SHOT_DIR, name) });
}

function sliceBetween(content, startMarker, endMarker, label) {
  const a = content.indexOf(startMarker);
  const b = content.indexOf(endMarker, a + 1);
  assert(a > 0 && b > a, `${label}: section markers not found`);
  return content.slice(a, b);
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

  // 缓存号：AR-16 起继续递增（hd31 / hd55），这里只要求不低于 AR-15 的 hd30 / hd54，且没有任何 hd23..hd29 / game.js?v=hd50..hd53 残留
  assert(/\.\/style\.css\?v=hd(?:3\d|[4-9]\d)\b/.test(htmlContent), 'index.html must reference ./style.css?v=hd30+');
  assert(/\.\/game\.js\?v=hd(?:5[4-9]|[6-9]\d)\b/.test(htmlContent), 'index.html must reference ./game.js?v=hd54+');
  let htmlAr15Refs = 0;
  for (const reqAsset of REQUIRED_AR15_ASSETS) {
    if (new RegExp(`\\./assets/${reqAsset.replace('.', '\\.')}\\?v=hd(?:3\\d|[4-9]\\d)\\b`).test(htmlContent)) htmlAr15Refs += 1;
    assert(assetRefs.has(reqAsset), `Required AR-15 asset ${reqAsset} is not referenced in code`);
    assert(new RegExp(`${reqAsset.replace('.', '\\.')}\\?v=hd(?:3\\d|[4-9]\\d)\\b`).test(spritesContent), `${reqAsset} must be preloaded by sprites.js with ?v=hd30+`);
  }
  assert.equal(htmlAr15Refs, REQUIRED_AR15_ASSETS.length, `index.html must reference all 6 AR-15 images with ?v=hd30+, got ${htmlAr15Refs}`);
  for (const [name, content] of [
    ['index.html', htmlContent],
    ['style.css', cssContent],
    ['sprites.js', spritesContent],
    ['game.js', gameContent]
  ]) {
    assert(!/\?v=hd2[3-9]\b/.test(content), `Stale ?v=hd23..hd29 cache-buster left in public/${name}`);
  }
  assert(!/game\.js\?v=hd5[0-3]\b/.test(htmlContent), 'Stale game.js?v=hd50..hd53 left in index.html');
  assert(/\?v=hd(?:3\d|[4-9]\d)\b/.test(cssContent), 'style.css must use ?v=hd30+ asset cache-busters');
  assert(/\.\/sprites\.js\?v=hd(?:3\d|[4-9]\d)\b/.test(gameContent), 'game.js must import ./sprites.js?v=hd30+');
  assert(/\.\/audio\.js\?v=hd(?:3\d|[4-9]\d)\b/.test(gameContent), 'game.js must import ./audio.js?v=hd30+');
  assert(/\.\/vision\.js\?v=hd(?:3\d|[4-9]\d)\b/.test(gameContent), 'game.js must import ./vision.js?v=hd30+');
  for (const fn of ['getAr15CornerLayout', 'drawAr15WindowCorner', 'drawStarCardProp', 'drawRainListenProp']) {
    assert(new RegExp(`export function ${fn}`).test(spritesContent), `sprites.js must export ${fn}`);
  }
  for (const fn of [
    'playStarDial',
    'playStarProject',
    'playStarDream',
    'startRainNoise',
    'setRainMix',
    'stopRainNoise',
    'playRainDrip',
    'playRainChime',
    'playRainRumble',
    'getAr15AudioInfo'
  ]) {
    assert(new RegExp(`\\n  ${fn}\\(`).test(audioContent), `audio.js must define ${fn}()`);
  }
  for (const asset of assetRefs) {
    const full = path.join(PUBLIC_DIR, 'assets', asset);
    assert(fs.existsSync(full), `Missing asset on disk: ${full}`);
    assert(fs.statSync(full).size > 0, `Empty asset on disk: ${full}`);
  }

  // 船坞不加键：仍是 25 键，也没有任何星空 / 听雨船坞键
  assert.equal((htmlContent.match(/class="care-btn[\s"]/g) || []).length, CARE_BTN_COUNT, `index.html must keep exactly ${CARE_BTN_COUNT} dock keys`);
  const dockHtml = htmlContent.slice(htmlContent.indexOf('id="pet-care-bar"'), htmlContent.indexOf('class="action-zone"'));
  assert(dockHtml.length > 100 && !/star-projector|star_projector|rain-corner|rain_corner|rain_chime/.test(dockHtml), 'AR-15 must not add a star / rain key to the dock');

  // AR-15 场景 / 卡片只贴已提供的位图（柔光渐变 + 文字标签），不画任何矢量图形，也不画 canvas 图标
  const vectorRe = /beginPath|lineTo|\barc\(|arcTo|bezierCurveTo|quadraticCurveTo|strokeRect|roundRect\(|\.stroke\(\)|\.fill\(\)/;
  const ar15Sprites = sliceBetween(spritesContent, '// AR-15 窗边飘台', 'export function roundRect', 'sprites.js AR-15');
  assert(!vectorRe.test(ar15Sprites), 'AR-15 canvas drawing must only draw the provided webp art');
  // 书桌已满：AR-15 物件不再落在书桌线（H * 0.68）上，而是沿用陶艺架那条窗台线
  assert(!/0\.68/.test(ar15Sprites) && /getPotteryShelfLayout\(W, H, camX, 4\)/.test(ar15Sprites), 'AR-15 scene objects must sit on the windowsill line, not on the desk');
  const ar15Game = sliceBetween(gameContent, '// ================= AR-15 卧室星空投影灯 & 窗边听雨角', '// ================= AR 拍立得纪念合影系统', 'game.js AR-15');
  const ar15Spec = sliceBetween(gameContent, '// AR-15 卧室星空投影灯 & 窗边听雨角：规格常量', 'function resetSurvivorRun', 'game.js AR-15 specs');
  assert(!vectorRe.test(ar15Game), 'AR-15 game section must not draw vector shapes');
  assert(!/getContext\(/.test(ar15Game), 'AR-15 UI must not create canvas-drawn icons');
  // 本地天气时段：不联网、不调外部天气 API、不读任何系统传感器
  const offlineRe = /fetch\(|XMLHttpRequest|WebSocket|EventSource|geolocation|getBattery|Sensor\(|devicemotion|deviceorientation|https?:\/\//i;
  const ar15Audio = sliceBetween(audioContent, '// AR-15 转动星空投影罩', '  getAr11AudioInfo() {', 'audio.js AR-15');
  for (const [label, code] of [
    ['game.js AR-15 section', ar15Game],
    ['game.js AR-15 specs', ar15Spec],
    ['sprites.js AR-15', ar15Sprites],
    ['audio.js AR-15', ar15Audio]
  ]) {
    assert(!offlineRe.test(code), `${label} must stay offline (no network / weather API / sensors)`);
  }
  // 星座卡 / 天气的浅色调：三通道都 >= 200（奶油色，零深色）
  let rgbCount = 0;
  for (const m of ar15Spec.matchAll(/rgb: '(\d+), (\d+), (\d+)'/g)) {
    rgbCount += 1;
    assert(Math.min(Number(m[1]), Number(m[2]), Number(m[3])) >= 200, `AR-15 tint must stay cream/pastel, got ${m[0]}`);
  }
  assert(rgbCount >= 13, `Expected 8 card + 5 weather tints, got ${rgbCount}`);

  // 零暗黑赛博 / 荧光色：AR-15 样式段不得出现深色
  const cssStart = cssContent.indexOf('AR-15 卧室星空投影灯 & 窗边听雨角');
  assert(cssStart > 0, 'style.css must contain the AR-15 section');
  assert(
    !/neon|#0{3,6}\b|#000\b|#111|#1[0-9a-f]{5}\b|#[2-4][0-9a-f]{5}\b|rgba?\(\s*(?:[0-5]?\d)\s*,\s*(?:[0-5]?\d)\s*,\s*(?:[0-9]?\d)\s*[,)]/i.test(
      cssContent.slice(cssStart)
    ),
    'AR-15 CSS must not contain near-black / neon colors'
  );
  // 雨丝渐变不能用 transparent（会被算成 rgba(0, 0, 0, 0) 的黑色透明）
  assert(!/transparent/.test(cssContent.slice(cssStart)), 'AR-15 CSS gradients must fade to cream/white, not to black-transparent');

  console.log(
    `[STATIC PASS] ${jsFiles.length} JS modules syntax-checked, ${assetRefs.size} assets verified on disk (including all 6 AR-15 images), ?v=hd30+/hd54+ synced with 0 stale hd23-hd29, still ${CARE_BTN_COUNT} dock keys (no star / rain key), scene objects on the windowsill line (not the desk), 0 inline <svg>, 0 Emoji, 0 vector shapes / canvas icons, 0 network / sensor calls in AR-15 code, ${rgbCount} cream tints, 0 dark/neon colors in AR-15 CSS.`
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
  return page.evaluate((d) => window.__AR15_DEBUG__.getState(d), iso);
}

async function dbg(page, fn, ...args) {
  return page.evaluate(([f, a]) => window.__AR15_DEBUG__[f](...a), [fn, args]);
}

async function openPanelNames(page) {
  const panels = (await getState(page)).openPanels;
  return Object.entries(panels)
    .filter(([, isOpen]) => isOpen)
    .map(([k]) => k);
}

// 关卡片：派发 pointerdown（bindHudTap 的 click 分支有 400ms 防连点，连续两次关同一张卡时 click 会被吞掉）
async function closeAll(page) {
  const left = await page.evaluate(() => {
    for (const id of ['btn-star-close', 'btn-rain-close', 'btn-pottery-close', 'btn-aroma-close']) {
      const el = document.getElementById(id);
      const card = el && el.closest('aside');
      if (card && !card.classList.contains('hidden')) {
        el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
      }
    }
    return ['star-projector-card', 'rain-corner-card', 'pottery-wheel-card', 'aroma-table-card'].filter(
      (id) => !document.getElementById(id).classList.contains('hidden')
    );
  });
  assert.deepEqual(left, [], `closeAll must close every AR-14 / AR-15 card, still open: ${left.join(', ')}`);
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

function cornerPoints(L) {
  const C = L.corner;
  return {
    projector: { x: C.projector.hit.x, y: C.projector.hit.y },
    cushion: { x: C.cushion.x, y: C.baseY - C.cushion.size * 0.35 },
    chime: { x: C.chime.x, y: C.chime.top + C.chime.size * 0.35 }
  };
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

// 卡片 / HUD / 船坞布局审计（与 AR-13 / AR-14 同一套口径）
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

// 窗边飘台（投影灯 / 坐垫 / 风铃）不压 HUD、胶囊、船坞、摇杆、陶艺架（摆满 4 件）与书桌：
// 舞台坐标换算成视口坐标（旋转舞台按 CW / CCW 换算），逐个和 HUD 元素的视口矩形比
async function cornerAudit(page) {
  return page.evaluate(() => {
    const L = window.__AR15_DEBUG__.getLayouts();
    const A14 = window.__AR14_DEBUG__.getLayouts();
    const C = L.corner;
    const stage = document.getElementById('game-stage');
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rotated = vw < vh;
    const ccw = stage.className.includes('forced-landscape-ccw');
    const toClient = (r) => {
      if (!rotated) return r;
      if (ccw) return { x: r.y, y: vh - (r.x + r.w), w: r.h, h: r.w };
      return { x: vw - (r.y + r.h), y: r.x, w: r.h, h: r.w };
    };
    const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    const proj = { x: C.projector.hit.x - C.projector.hit.r, y: C.projector.hit.y - C.projector.hit.r, w: C.projector.hit.r * 2, h: C.projector.hit.r * 2 };
    const rain = C.rainHit;
    // 场景标签：按游戏同一字体实测宽度（两侧各留 2px 描边）
    const st15 = window.__AR15_DEBUG__.getState();
    const labelText = `${st15.starVisual.label || '星空灯'} · ${st15.rainVisual.label || '听雨角'}`;
    const mctx = document.createElement('canvas').getContext('2d');
    mctx.font = '900 9.5px -apple-system, BlinkMacSystemFont, sans-serif';
    const labelW = mctx.measureText(labelText).width + 4;
    const label = { x: C.labelX - labelW / 2, y: C.baseY + 3, w: labelW, h: 12 };
    const objects = [
      ['projector', proj],
      ['rain', rain]
    ];
    const blockers = [
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
      const b = el.getBoundingClientRect();
      const br = { x: b.left, y: b.top, w: b.width, h: b.height };
      for (const [oname, o] of objects) if (hit(toClient(o), br)) clashes.push(`${oname}~${name}`);
    }
    // 窄屏胶囊行：每颗可见胶囊也不能压到飘台
    for (const pill of Array.from(document.querySelectorAll('#hud-ambience-row > button'))) {
      if (pill.classList.contains('hidden') || pill.offsetParent === null) continue;
      const b = pill.getBoundingClientRect();
      for (const [oname, o] of objects) if (hit(toClient(o), { x: b.left, y: b.top, w: b.width, h: b.height })) clashes.push(`${oname}~${pill.id}`);
    }
    const shelf = L.shelf.hit;
    const table = { x: A14.diffuser.hit.x - A14.diffuser.hit.r, y: A14.diffuser.hit.y - A14.diffuser.hit.r, w: A14.diffuser.hit.r * 2, h: A14.diffuser.hit.r * 2 };
    for (const [oname, o] of [...objects, ['label', label]]) {
      if (hit(o, shelf)) clashes.push(`${oname}~pottery-shelf`);
      if (hit(o, table)) clashes.push(`${oname}~aroma-table`);
    }
    const deskY = L.H * 0.68;
    const all = [proj, rain];
    return {
      W: L.W,
      H: L.H,
      rotated,
      proj,
      rain,
      baseY: C.baseY,
      deskY,
      aboveDesk: all.every((o) => o.y + o.h <= deskY - 20),
      inStage: all.every((o) => o.x >= 0 && o.y >= 0 && o.x + o.w <= L.W && o.y + o.h <= L.H),
      clashes
    };
  });
}

async function overlayColorAudit(page) {
  return page.evaluate(() => {
    const parse = (bg) => Array.from(bg.matchAll(/rgba?\(([^)]+)\)/g)).map((m) => m[1].split(',').map((v) => Number(v.trim())));
    const out = {};
    for (const [key, sel] of [
      ['star', '#star-projector-overlay'],
      ['starGlow', '#spo-glow'],
      ['rain', '#rain-ambient-overlay'],
      ['aroma', '#aroma-ambient-overlay']
    ]) {
      const el = document.querySelector(sel);
      const cs = getComputedStyle(el);
      const ov = el.closest('[aria-hidden]') || el;
      const ovCs = getComputedStyle(ov);
      out[key] = {
        visible: ovCs.visibility === 'visible' && Number(ovCs.opacity) > 0.5,
        pointer: ovCs.pointerEvents,
        z: Number(ovCs.zIndex),
        cols: parse(cs.backgroundImage)
      };
    }
    const c = document.getElementById('game-canvas').getBoundingClientRect();
    const probe = document.elementFromPoint(c.left + c.width * 0.42, c.top + c.height * 0.4);
    out.canvasStillTappable = Boolean(probe && probe.id === 'game-canvas');
    out.hudZ = Number(getComputedStyle(document.querySelector('.cyber-hud-top')).zIndex);
    out.starImgs = Array.from(document.querySelectorAll('#spo-sky .spo-star')).map((im) => ({ ok: im.complete && im.naturalWidth > 0, src: im.getAttribute('src') }));
    return out;
  });
}

function assertCream(cols, label) {
  assert(cols.length >= 1, `${label}: expected gradient colors, got none`);
  for (const [r, g, b, a = 1] of cols) {
    assert(Math.min(r, g, b) >= 180, `${label} must stay cream/pastel, got rgba(${r},${g},${b},${a})`);
    assert(!(a > 0.3), `${label} must stay subtle (alpha <= 0.3), got ${a}`);
  }
}

async function runPlaywrightSuite() {
  const { server, url } = await startStaticServer(PORT);
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    // 全程断网：AR-15 的“本地天气时段”不允许联网
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

    // 0. DOM Emoji / 奶油手账配色 / 6 张 AR-15 贴图加载审计
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
        img.src = `./assets/${file}?v=hd30`;
        await new Promise((res, rej) => {
          if (img.complete && img.naturalWidth > 0) res();
          else {
            img.onload = () => res();
            img.onerror = () => rej(new Error(`Failed to decode ${file}`));
          }
        });
        loadReport[file] = { w: img.naturalWidth, h: img.naturalHeight };
      }
      const so = document.getElementById('star-projector-overlay');
      const ro = document.getElementById('rain-ambient-overlay');
      return {
        hasEmoji: /\p{Extended_Pictographic}/u.test(document.body.innerText || ''),
        brokenImgs,
        domImgCount: domImgs.length,
        domLoaded: domImgs.every((img) => img.complete && img.naturalWidth > 0),
        loadReport,
        starBg: getComputedStyle(document.getElementById('star-projector-card')).backgroundImage,
        rainBg: getComputedStyle(document.getElementById('rain-corner-card')).backgroundImage,
        starHidden: so.classList.contains('hidden'),
        rainHidden: ro.classList.contains('hidden'),
        starPointer: getComputedStyle(so).pointerEvents,
        rainPointer: getComputedStyle(ro).pointerEvents,
        starZ: Number(getComputedStyle(so).zIndex),
        rainZ: Number(getComputedStyle(ro).zIndex),
        hudZ: Number(getComputedStyle(document.querySelector('.cyber-hud-top')).zIndex),
        pillHidden: document.getElementById('star-rain-pill').classList.contains('hidden'),
        careBtnCount: document.querySelectorAll('#pet-care-bar .care-btn').length,
        overflowX: document.documentElement.scrollWidth - window.innerWidth,
        overflowY: document.documentElement.scrollHeight - window.innerHeight
      };
    }, REQUIRED_AR15_ASSETS);
    assert.equal(initialAudit.hasEmoji, false, 'Visible DOM must contain zero Emoji characters');
    assert.equal(initialAudit.brokenImgs.length, 0, `Broken ./assets/ images: ${initialAudit.brokenImgs.join(', ')}`);
    assert(initialAudit.domImgCount >= 9, `Expected >= 9 AR-15 <img> in DOM, got ${initialAudit.domImgCount}`);
    assert.equal(initialAudit.domLoaded, true, 'Every AR-15 <img> in DOM must load (naturalWidth > 0)');
    for (const [file, info] of Object.entries(initialAudit.loadReport)) {
      assert(info.w === 256 && info.h === 256, `AR-15 image ${file} must decode as 256x256, got ${JSON.stringify(info)}`);
    }
    assert.equal(initialAudit.careBtnCount, CARE_BTN_COUNT, `Expected ${CARE_BTN_COUNT} dock buttons, got ${initialAudit.careBtnCount}`);
    assert(initialAudit.overflowX <= 0 && initialAudit.overflowY <= 0, `Desktop 1440x900 overflow: ${JSON.stringify(initialAudit)}`);
    assert(/255,\s*253,\s*248/.test(initialAudit.starBg), `#star-projector-card must use cream #FFFDF8, got ${initialAudit.starBg}`);
    assert(/255,\s*253,\s*248/.test(initialAudit.rainBg), `#rain-corner-card must use cream #FFFDF8, got ${initialAudit.rainBg}`);
    assert.deepEqual([initialAudit.starHidden, initialAudit.rainHidden], [true, true], 'No projection / no rain on a fresh save = no room layers');
    assert.deepEqual([initialAudit.starPointer, initialAudit.rainPointer], ['none', 'none'], 'Star / rain layers must never block taps');
    assert(initialAudit.starZ < initialAudit.hudZ && initialAudit.rainZ < initialAudit.hudZ, `Room layers stay under the HUD: ${JSON.stringify(initialAudit)}`);
    assert.equal(initialAudit.pillHidden, true, 'Nothing lit / heard = AR-15 pill stays hidden');

    const realNow = new Date();
    const tonight = dayAt(realNow, 0, 21, 30);
    const season = seasonOf(tonight);
    const [cardA, cardB] = seasonCardsOf(season);
    const offSeasonCard = CARD_ORDER.find((id) => STAR_CARDS[id].season !== season);
    await dbg(page, 'setClock', tonight.getTime());

    // 1. 新存档：没有星座卡、没点亮，听雨默认中音量 + 开风铃、空手帐
    let st = await getState(page);
    assert.deepEqual(st.starProjector.cards, {}, 'Fresh save: no constellation cards');
    assert.equal(st.starProjector.active, null, 'Fresh save: projector off');
    assert.deepEqual([st.rainCorner.volumeId, st.rainCorner.chimeOn, st.rainCorner.entries], ['mid', true, {}], 'Fresh save: rain corner defaults');
    assert.equal(st.starStats.seasonId, season, `Season follows the injected local date: ${st.starStats.seasonId}`);
    assert.deepEqual(st.starStats.seasonCards, [cardA, cardB], `Tonight's in-season cards: ${JSON.stringify(st.starStats.seasonCards)}`);
    assert.equal(st.starStats.bedtime, true, '21:30 is bedtime');
    assert.equal(st.rainStats.weather.id, weatherOf(tonight).id, `Deterministic window weather at 21:30: ${st.rainStats.weather.id}`);
    assert.equal(st.overlays.star.shown, false);
    assert.equal(st.overlays.rain.shown, false);

    // 2. 入口：不加船坞键 —— 抽屉「家具与装扮」快捷卡（紧跟陶艺香氛块）+ 窗边飘台场景点击
    await page.click('#btn-shop');
    await page.waitForTimeout(220);
    const drawerAudit = await page.evaluate(() => {
      const blocks = Array.from(document.querySelectorAll('#drawer-items .drawer-section-block'));
      const idx = blocks.findIndex((b) => b.querySelector('[data-ar15-shortcut]'));
      const idx14 = blocks.findIndex((b) => b.querySelector('[data-ar14-shortcut]'));
      const sBtn = document.querySelector('[data-ar15-shortcut="star"]');
      sBtn.scrollIntoView({ block: 'nearest' });
      const items = document.getElementById('drawer-items').getBoundingClientRect();
      const pr = sBtn.getBoundingClientRect();
      return {
        idx,
        idx14,
        title: idx >= 0 ? blocks[idx].querySelector('.drawer-section-title').textContent : '',
        imgsLoaded: Array.from(blocks[idx] ? blocks[idx].querySelectorAll('img') : []).every((im) => im.naturalWidth > 0),
        visibleAfterScroll: Boolean(pr.top >= items.top - 1 && pr.bottom <= items.bottom + 1),
        sub: sBtn.querySelector('.room-theme-sub').textContent,
        rainSub: document.querySelector('[data-ar15-shortcut="rain"] .room-theme-sub').textContent
      };
    });
    assert.equal(drawerAudit.idx14, 1, 'AR-14 shortcuts keep their spot right after the room theme');
    assert.equal(drawerAudit.idx, 2, `AR-15 shortcuts sit right after the AR-14 block, got ${drawerAudit.idx}`);
    assert.equal(drawerAudit.title, '卧室星空灯与窗边听雨角');
    assert(drawerAudit.imgsLoaded, 'Drawer shortcut art loads');
    assert(drawerAudit.visibleAfterScroll, 'The star shortcut scrolls into the drawer viewport');
    assert(drawerAudit.sub.includes('星座卡 0/8'), `Fresh star shortcut sub: ${drawerAudit.sub}`);
    assert(drawerAudit.rainSub.includes(weatherOf(tonight).name), `Rain shortcut shows the window weather: ${drawerAudit.rainSub}`);
    await page.waitForTimeout(150);
    await shot(page, 'desktop_1440x900_drawer_entry.png');
    await page.click('[data-ar15-shortcut="star"]');
    await page.waitForTimeout(180);
    assert.deepEqual(await openPanelNames(page), ['starProjector'], 'Drawer star shortcut opens only the star projector card');
    await page.click('#btn-shop');
    await page.waitForTimeout(200);
    await page.click('[data-ar15-shortcut="rain"]');
    await page.waitForTimeout(180);
    assert.deepEqual(await openPanelNames(page), ['rainCorner'], 'Drawer rain shortcut opens only the rain corner card');
    await closeAll(page);
    await dbg(page, 'placePlayerForTest', 0.5);
    await page.waitForTimeout(150);
    let L = await dbg(page, 'getLayouts');
    let P = cornerPoints(L);
    await tapStage(page, P.projector, 'Projector tap');
    assert.deepEqual(await openPanelNames(page), ['starProjector'], 'Tapping the star projector on the window ledge opens the star card');
    await closeAll(page);
    await dbg(page, 'placePlayerForTest', 0.5);
    await tapStage(page, P.cushion, 'Cushion tap');
    assert.deepEqual(await openPanelNames(page), ['rainCorner'], 'Tapping the rain cushion opens the rain corner card');
    await closeAll(page);
    await dbg(page, 'placePlayerForTest', 0.5);
    await tapStage(page, P.chime, 'Chime tap');
    assert.deepEqual(await openPanelNames(page), ['rainCorner'], 'Tapping the hanging rain chime opens the rain corner card');
    let corner = await cornerAudit(page);
    assert(corner.inStage && corner.aboveDesk && corner.clashes.length === 0, `1440x900 window-ledge corner: ${JSON.stringify(corner)}`);

    // 3. 浮层互斥：AR-15 两张卡与 AR-14 两张卡、船坞其它卡片 / 抽屉一次只开一个
    const exclusive = [
      ['dock', '#btn-picnic-basket', 'picnicBasket'],
      ['ar15', 'openStar', 'starProjector'],
      ['ar14', 'openPottery', 'potteryWheel'],
      ['ar15', 'openRain', 'rainCorner'],
      ['dock', '#btn-diary-book', 'diaryBook'],
      ['ar15', 'openStar', 'starProjector'],
      ['ar14', 'openAroma', 'aromaTable'],
      ['ar15', 'openRain', 'rainCorner'],
      ['dock', '#btn-teatime', 'teatime'],
      ['ar15', 'openStar', 'starProjector'],
      ['dock', '#btn-kitten-corner', 'kittenCorner'],
      ['ar15', 'openRain', 'rainCorner'],
      ['dock', '#btn-weekly-journal', 'weeklyJournal'],
      ['ar15', 'openStar', 'starProjector'],
      ['dock', '#btn-musicbox', 'goodnightMusicbox'],
      ['ar15', 'openRain', 'rainCorner'],
      ['dock', '#btn-pomodoro', 'pomodoro'],
      ['ar15', 'openStar', 'starProjector'],
      ['dock', '#btn-chat-topic', 'topic'],
      ['ar15', 'openRain', 'rainCorner'],
      ['dock', '#btn-shop', 'drawer']
    ];
    for (const [kind, target, key] of exclusive) {
      if (kind === 'dock') {
        await page.click(target);
      } else if (kind === 'ar14') {
        await page.evaluate((f) => window.__AR14_DEBUG__[f](), target);
      } else {
        await dbg(page, target);
      }
      await page.waitForTimeout(120);
      assert.deepEqual(await openPanelNames(page), [key], `Opening ${target} must keep ONLY ${key} open, got ${JSON.stringify(await openPanelNames(page))}`);
    }
    await page.click('#btn-shop');
    await page.waitForTimeout(160);
    assert.deepEqual(await openPanelNames(page), [], 'Shop key closes the drawer again');

    // 4. 星空投影灯：真实点按 挑当季星座卡 → 点投影灯转动投影罩对准亮星 → 主按钮点亮（21:30 睡前 ×1.5）
    await dbg(page, 'openStar');
    await page.waitForTimeout(160);
    let sDom = await page.evaluate(() => ({
      chips: Array.from(document.querySelectorAll('#sp-card-row .sp-card-chip')).map((c) => c.dataset.cardId),
      album: Array.from(document.querySelectorAll('#sp-album-grid .sp-album-chip')).map((c) => c.dataset.cardId),
      imgs: Array.from(document.querySelectorAll('#star-projector-card img')).every((im) => im.complete && im.naturalWidth > 0),
      main: document.getElementById('btn-star-main').textContent,
      mainDisabled: document.getElementById('btn-star-main').disabled,
      offHidden: document.getElementById('btn-star-off').classList.contains('hidden'),
      bedtime: document.getElementById('sp-night-row').dataset.bedtime,
      nightSub: document.getElementById('sp-night-sub').textContent
    }));
    assert.deepEqual(sDom.chips, [cardA, cardB], `In-season chips: ${JSON.stringify(sDom.chips)}`);
    assert.deepEqual(sDom.album, CARD_ORDER, 'The album shows all 8 constellation cards');
    assert.equal(sDom.imgs, true, 'Star card art loads');
    assert.deepEqual([sDom.main, sDom.mainDisabled, sDom.offHidden], ['先挑星座卡', true, true], `Fresh star card: ${JSON.stringify(sDom)}`);
    assert.equal(sDom.bedtime, '1', 'The night row knows it is bedtime');
    assert(sDom.nightSub.includes('睡前'), `Bedtime hint: ${sDom.nightSub}`);
    // 不在当季、也还没收集的星座卡点不动
    await page.click(`#sp-album-grid [data-card-id="${offSeasonCard}"]`);
    await page.waitForTimeout(100);
    let run = await dbg(page, 'getStarRun');
    assert.deepEqual([run.cardId, run.lastAction], ['', 'locked'], `Out-of-season card stays locked: ${JSON.stringify(run)}`);
    await page.click(`#sp-card-row [data-card-id="${cardA}"]`);
    await page.waitForTimeout(100);
    const needA = STAR_CARDS[cardA].taps;
    assert.equal(await page.locator('#btn-star-main').textContent(), `转动投影罩 0/${needA}`);
    for (let i = 0; i < needA - 1; i++) {
      await page.click('#sp-dome');
      await page.waitForTimeout(90);
    }
    await shot(page, 'desktop_1440x900_star_dial.png');
    await page.click('#btn-star-main');
    await page.waitForTimeout(100);
    st = await getState(page);
    assert.deepEqual([st.starRun.cardId, st.starRun.taps, st.starRun.phase], [cardA, needA, 'dial'], `Dome taps + main tap align all stars: ${JSON.stringify(st.starRun)}`);
    assert(st.ar15Audio.starDialCount >= needA, `Each turn clicks: ${JSON.stringify(st.ar15Audio)}`);
    assert.equal(await page.evaluate(() => document.querySelectorAll('#sp-sky .sp-sky-star.is-on').length), needA, 'Every aligned star lights up in the dome');
    assert.equal(st.starVisual.aligning, true, 'She holds up the constellation card beside her');
    assert.equal(await page.locator('#btn-star-main').textContent(), '点亮投影');
    const coinsBeforeA = st.coins;
    await page.click('#btn-star-main');
    await page.waitForTimeout(260);
    st = await getState(page);
    const resA = st.starRun.lastResult;
    assert.deepEqual([resA.cardId, resA.isNew, resA.bedtime], [cardA, true, true], `Lit projection: ${JSON.stringify(resA)}`);
    assert.deepEqual(resA.reward, { coins: 30, xp: 12 }, `New card at bedtime: (8 + 12) x 1.5 coins, 8 x 1.5 affection: ${JSON.stringify(resA.reward)}`);
    assert(st.coins >= coinsBeforeA + 30, 'Projection coins arrive');
    assert.equal(st.starProjector.active.endMs - st.starProjector.active.startMs, 20 * 60000, 'One projection lasts 20 minutes');
    assert.deepEqual(st.starProjector.cards[cardA].lights, 1);
    assert.equal(st.starStats.collected, 1);
    assert.equal(st.journalSummary.stars7d, 1, 'Weekly journal counts the projection');
    assert(st.ar15Audio.starProjectCount >= 1, 'Lighting chimes');
    assert.deepEqual([st.overlays.star.shown, st.overlays.star.card], [true, cardA], `Star layer: ${JSON.stringify(st.overlays)}`);
    sDom = await page.evaluate(() => ({
      main: document.getElementById('btn-star-main').textContent,
      offShown: !document.getElementById('btn-star-off').classList.contains('hidden'),
      helper: document.getElementById('btn-star-helper').textContent,
      tag: document.getElementById('sp-dome-tag').textContent,
      pill: !document.getElementById('star-rain-pill').classList.contains('hidden'),
      pillStar: document.getElementById('sr-pill-star').textContent,
      rainSegHidden: document.getElementById('sr-seg-rain').classList.contains('hidden'),
      albumFound: document.querySelectorAll('#sp-album-grid .sp-album-chip.is-found').length
    }));
    assert.deepEqual(
      [sDom.main, sDom.offShown, sDom.helper, sDom.pill, sDom.pillStar, sDom.rainSegHidden, sDom.albumFound],
      ['一起晚安', true, '她换一张', true, '20分', true, 1],
      `Lit DOM: ${JSON.stringify(sDom)}`
    );
    assert(sDom.tag.includes('星光'), `Dome tag: ${sDom.tag}`);
    let ov = await overlayColorAudit(page);
    assert(ov.star.visible && ov.star.pointer === 'none' && ov.canvasStillTappable, `Star layer must be visible but click-through: ${JSON.stringify(ov)}`);
    assert(ov.star.z < ov.hudZ, 'Star layer stays under the HUD');
    assertCream(ov.starGlow.cols, 'Star glow');
    assert.equal(ov.starImgs.length, needA, `The projection shows ${needA} stars on the ceiling`);
    assert(ov.starImgs.every((s) => s.ok && s.src.includes('vfx_sparkle.webp')), 'Projected stars are raster sparkles');
    await page.waitForTimeout(400);
    await shot(page, 'desktop_1440x900_star_lit.png');

    // 5. 晚安 / 好梦联动：投影亮着时「一起晚安」直接旋开晚安八音盒；伴眠结算时好梦章金币 +20%，星座卡盖好梦章
    await page.click('#btn-star-main');
    await page.waitForTimeout(240);
    st = await getState(page);
    assert.deepEqual([st.goodnight.status, st.goodnight.sleeping], ['running', true], `One tap starts the goodnight musicbox: ${JSON.stringify(st.goodnight)}`);
    assert.deepEqual(await openPanelNames(page), [], 'The star card steps aside while she falls asleep');
    assert.equal(st.overlays.star.shown, true, 'The stars stay on the ceiling during the lullaby');
    await page.waitForTimeout(300);
    await shot(page, 'desktop_1440x900_goodnight_link.png');
    const coinsBeforeDream = st.coins;
    const dream1 = await page.evaluate(() => window.__AR6_DEBUG__.settleMusicboxEarly());
    assert.equal(dream1.ok, true);
    assert.equal(dream1.coinReward, Math.round(dream1.baseCoinReward * 1.2), `Goodnight stamp coins +20% under the stars: ${JSON.stringify(dream1)}`);
    assert.deepEqual(
      [dream1.starDream.cardId, dream1.starDream.dreams, dream1.starDream.reward],
      [cardA, 1, { coins: 15, xp: 10 }],
      `First dream stamp of the day: ${JSON.stringify(dream1.starDream)}`
    );
    st = await getState(page);
    assert(st.coins >= coinsBeforeDream + dream1.coinReward + 15, 'Dream coins arrive');
    assert.deepEqual([st.starProjector.cards[cardA].dreams, st.starProjector.totalDreams], [1, 1]);
    assert(st.ar15Audio.starDreamCount >= 1, 'Dream chime');
    assert(st.emote.includes('好梦章'), `She announces the dream stamp: ${st.emote}`);
    // 同一晚再伴眠一次：好梦章照盖，但每天只有第 1 枚给额外奖励
    await dbg(page, 'openStar');
    await page.waitForTimeout(140);
    assert.equal(await page.locator('#btn-star-main').textContent(), '一起晚安', 'After waking up she offers another goodnight');
    await page.click('#btn-star-main');
    await page.waitForTimeout(200);
    const dream2 = await page.evaluate(() => window.__AR6_DEBUG__.settleMusicboxEarly());
    assert.deepEqual([dream2.starDream.dreams, dream2.starDream.reward], [2, null], `Second dream of the night: ${JSON.stringify(dream2.starDream)}`);
    // 投影没亮时伴眠：没有好梦章加成
    st = await getState(page);
    assert.equal(st.starStats.totalDreams, 2);

    // 投影按可注入时钟 20 分钟后熄灭；熄灭后再伴眠就没有星光加成
    await dbg(page, 'advanceClock', 21 * 60000);
    st = await getState(page);
    assert.deepEqual([st.starProjector.active, st.overlays.star.shown], [null, false], 'The projection fades after 20 minutes');
    assert(st.emote.includes('暗下去'), `She notices the stars fading: ${st.emote}`);
    await page.evaluate(() => window.__AR6_DEBUG__.startMusicbox(15));
    const plain = await page.evaluate(() => window.__AR6_DEBUG__.settleMusicboxEarly());
    assert.deepEqual([plain.coinReward, plain.starDream], [plain.baseCoinReward, null], `No projection = plain goodnight: ${JSON.stringify(plain)}`);

    // 第二张当季星座卡：点卡片 + 「她来点亮」一口气对准全部亮星并点亮（今天第 2 次奖励）
    await dbg(page, 'openStar');
    await page.waitForTimeout(140);
    await page.click(`#sp-card-row [data-card-id="${cardB}"]`);
    await page.waitForTimeout(80);
    await page.click('#btn-star-helper');
    await page.waitForTimeout(200);
    st = await getState(page);
    assert.deepEqual(
      [st.starRun.lastResult.cardId, st.starRun.lastResult.isNew, st.starRun.lastResult.reward],
      [cardB, true, { coins: 30, xp: 12 }],
      `Helper lights the second in-season card: ${JSON.stringify(st.starRun.lastResult)}`
    );
    assert.equal(st.starStats.collected, 2);
    // 今天第 3 次投影：照样点亮（她换一张），但不再给金币
    const third = await dbg(page, 'starHelper');
    assert.equal(third.ok, true);
    assert.equal(third.reward, null, 'Third projection of the day: no more coins (2 per day)');
    assert.equal((await getState(page)).starStats.rewardsToday, 2);
    // 第二天白天：已收集的卡重投，没有睡前加成
    await dbg(page, 'setClock', dayAt(realNow, 1, 10, 0).getTime());
    st = await getState(page);
    assert.equal(st.starProjector.active, null, 'Overnight the projection is long gone');
    assert.equal(st.starStats.bedtime, false);
    const lightsA = st.starProjector.cards[cardA].lights;
    await page.click(`#sp-album-grid [data-card-id="${cardA}"]`);
    await page.waitForTimeout(80);
    for (let i = 0; i < needA; i++) {
      await page.click('#btn-star-main');
      await page.waitForTimeout(60);
    }
    await page.click('#btn-star-main');
    await page.waitForTimeout(160);
    st = await getState(page);
    assert.deepEqual(
      [st.starRun.lastResult.cardId, st.starRun.lastResult.isNew, st.starRun.lastResult.bedtime, st.starRun.lastResult.reward],
      [cardA, false, false, { coins: 8, xp: 8 }],
      `Daytime replay of a collected card: ${JSON.stringify(st.starRun.lastResult)}`
    );
    assert.equal(st.starProjector.cards[cardA].lights, lightsA + 1, 'The replay adds one more light to the card');
    // 换季：三个月后是另一个季节，当季两张换了；已收集的旧季星座卡任何时候都能再投
    const nextSeasonDay = new Date(tonight.getFullYear(), tonight.getMonth() + 3, 15, 21, 0, 0, 0);
    const season2 = seasonOf(nextSeasonDay);
    await dbg(page, 'setClock', nextSeasonDay.getTime());
    await page.waitForTimeout(120);
    sDom = await page.evaluate(() => Array.from(document.querySelectorAll('#sp-card-row .sp-card-chip')).map((c) => c.dataset.cardId));
    assert.deepEqual(sDom, seasonCardsOf(season2), `Next season's chips: ${JSON.stringify(sDom)}`);
    const pickOld = await dbg(page, 'pickCard', cardB);
    assert.deepEqual([pickOld.ok, pickOld.owned, pickOld.inSeason], [true, true, false], 'A collected card from another season can be replayed');
    const lockedCard = CARD_ORDER.find((id) => STAR_CARDS[id].season !== season && STAR_CARDS[id].season !== season2);
    const pickLocked = await dbg(page, 'pickCard', lockedCard);
    assert.deepEqual([pickLocked.ok, pickLocked.reason], [false, 'out_of_season']);
    await dbg(page, 'stopProjection');
    await closeAll(page);

    // 6. 窗边听雨角：本地日期 + 时段确定性轮换的窗外天气（独立复算），真实点按 音量 / 风铃 / 开始听雨 / 摇风铃
    const rainStart = dayAt(realNow, 0, 15, 40);
    const dayWeather = weatherOf(rainStart);
    const duskWeather = weatherOf(dayAt(realNow, 0, 16, 1));
    assert.notEqual(dayWeather.id, duskWeather.id, 'Adjacent time segments never share the same weather');
    // 时段与天气轮换：同一天四个时段各不相同；任意时刻都只由本地日期 + 时段决定
    const sameDay = [7, 12, 18, 23].map((h) => weatherOf(dayAt(realNow, 0, h, 0)).id);
    assert.equal(new Set(sameDay).size, 4, `Four segments, four different weathers: ${sameDay}`);
    for (const offset of [0, 1, 2, 5, 40]) {
      for (const h of [6, 11, 17, 22, 2]) {
        const d = dayAt(realNow, offset, h, 20);
        const got = await dbg(page, 'getWeatherFor', d.getTime());
        assert.deepEqual([got.id, got.segId], [weatherOf(d).id, SEGMENTS[segIdxOf(d)].id], `Weather for ${d.toString()}`);
      }
    }
    await dbg(page, 'setClock', rainStart.getTime());
    await page.click('#btn-shop');
    await page.waitForTimeout(220);
    await page.click('[data-ar15-shortcut="rain"]');
    await page.waitForTimeout(200);
    let rDom = await page.evaluate(() => ({
      weather: document.getElementById('rc-weather-row').dataset.weather,
      seg: document.getElementById('rc-weather-row').dataset.seg,
      name: document.getElementById('rc-weather-name').textContent,
      vols: Array.from(document.querySelectorAll('#rc-volume-row [data-volume-id]')).map((c) => c.dataset.volumeId),
      activeVol: document.querySelector('#rc-volume-row .rc-volume-chip.active[data-volume-id]')?.dataset.volumeId,
      chimeOn: document.querySelector('#rc-volume-row [data-chime-toggle]').classList.contains('active'),
      codex: document.querySelectorAll('#rc-codex-grid .rc-codex-chip').length,
      now: document.querySelector('#rc-codex-grid .rc-codex-chip.is-now')?.dataset.entryKey,
      main: document.getElementById('btn-rain-main').textContent,
      imgs: Array.from(document.querySelectorAll('#rain-corner-card img')).every((im) => im.complete && im.naturalWidth > 0)
    }));
    assert.deepEqual(
      rDom,
      {
        weather: dayWeather.id,
        seg: 'day',
        name: `午后 · ${dayWeather.name}`,
        vols: ['soft', 'mid', 'deep'],
        activeVol: 'mid',
        chimeOn: true,
        codex: 5,
        now: `day_${dayWeather.id}`,
        main: '开始听雨',
        imgs: true
      },
      `Fresh rain card: ${JSON.stringify(rDom)}`
    );
    await page.click('#rc-volume-row [data-volume-id="deep"]');
    await page.waitForTimeout(80);
    await page.click('#rc-volume-row [data-chime-toggle]');
    await page.waitForTimeout(80);
    st = await getState(page);
    assert.deepEqual([st.rainCorner.volumeId, st.rainCorner.chimeOn], ['deep', false], 'Volume / chime chips');
    await page.click('#rc-volume-row [data-chime-toggle]');
    await page.waitForTimeout(80);
    assert.equal((await getState(page)).rainCorner.chimeOn, true, 'Chime back on');
    const coinsBeforeRain = (await getState(page)).coins;
    await page.click('#btn-rain-main');
    await page.waitForTimeout(200);
    st = await getState(page);
    assert.deepEqual([st.rainRun.listening, st.rainRun.weatherId], [true, dayWeather.id], `Listening to the window weather: ${JSON.stringify(st.rainRun)}`);
    assert.deepEqual(
      [st.ar15Audio.rainActive, st.ar15Audio.rainLoopLive, st.ar15Audio.rainWeatherId, st.ar15Audio.rainVolume, st.ar15Audio.rainStartCount],
      [true, true, dayWeather.id, 1.4, 1],
      `White noise loop: ${JSON.stringify(st.ar15Audio)}`
    );
    assert.deepEqual([st.overlays.rain.shown, st.overlays.rain.weather], [true, dayWeather.id], 'Rain layer on');
    assert.equal(st.calmMult, 1.05, 'Listening calm: +5% affection');
    assert.equal(await page.locator('#btn-rain-main').textContent(), '停一停 · 下则 5:00');
    rDom = await page.evaluate(() => ({
      pill: !document.getElementById('star-rain-pill').classList.contains('hidden'),
      rainTag: document.getElementById('sr-pill-rain').textContent,
      starSegHidden: document.getElementById('sr-seg-star').classList.contains('hidden'),
      listening: document.getElementById('rc-window').dataset.listening
    }));
    assert.deepEqual([rDom.pill, rDom.rainTag, rDom.starSegHidden, rDom.listening], [true, dayWeather.short, true, '1'], `Listening HUD: ${JSON.stringify(rDom)}`);
    const chimesBefore = st.ar15Audio.rainChimeCount;
    await page.click('#rc-window');
    await page.waitForTimeout(120);
    st = await getState(page);
    assert(st.ar15Audio.rainChimeCount > chimesBefore && st.rainRun.ring > 0, `Tapping the window rings the chime: ${JSON.stringify(st.ar15Audio)}`);
    await page.waitForTimeout(1600);
    st = await getState(page);
    assert(st.ar15Audio.rainTickCount >= 1, `White noise keeps ticking (drips / chimes): ${JSON.stringify(st.ar15Audio)}`);
    await shot(page, 'desktop_1440x900_rain_listening.png');
    // 听雨安神：听雨时亲密度收获 ×1.05（与停下后对比）
    const calmOn = await dbg(page, 'getAffectionMults');
    // 可注入时钟：每听满 5 分钟记一则小记（新收录 +8）
    await dbg(page, 'advanceClock', 5 * 60000);
    st = await getState(page);
    assert.deepEqual(
      [st.rainRun.sessionNotes, st.rainRun.lastResult.entryKey, st.rainRun.lastResult.isNew, st.rainRun.lastResult.reward],
      [1, `day_${dayWeather.id}`, true, { coins: 13, xp: 4 }],
      `First note: ${JSON.stringify(st.rainRun.lastResult)}`
    );
    assert(st.coins >= coinsBeforeRain + 13, 'Rain note coins arrive');
    assert.deepEqual(st.rainCorner.entries, { [`day_${dayWeather.id}`]: 1 });
    assert.equal(st.journalSummary.rains7d, 1, 'Weekly journal counts the note');
    await dbg(page, 'advanceClock', 10 * 60000);
    st = await getState(page);
    assert.equal(st.rainRun.sessionNotes, 3, 'Ten more minutes = two more notes');
    assert.deepEqual(st.rainRun.lastResult.reward, { coins: 5, xp: 4 }, 'Known entry: 5 coins');
    // 跨过 16:00：窗外天气换成傍晚那一种，白噪音跟着换
    await dbg(page, 'setClock', dayAt(realNow, 0, 15, 58).getTime());
    await dbg(page, 'advanceClock', 3 * 60000);
    st = await getState(page);
    assert.deepEqual([st.rainRun.weatherId, st.ar15Audio.rainWeatherId], [duskWeather.id, duskWeather.id], `Crossing 16:00 switches the white noise: ${JSON.stringify(st.ar15Audio)}`);
    assert(st.emote.includes(duskWeather.name), `She notices the new weather: ${st.emote}`);
    assert(st.ar15Audio.rainLoopCount >= 2, 'A new noise loop for the new weather');
    await dbg(page, 'advanceClock', 4 * 60000);
    st = await getState(page);
    assert.deepEqual([st.rainRun.lastResult.entryKey, st.rainRun.lastResult.reward], [`dusk_${duskWeather.id}`, { coins: 13, xp: 4 }], `Dusk entry: ${JSON.stringify(st.rainRun.lastResult)}`);
    await dbg(page, 'advanceClock', 5 * 60000);
    st = await getState(page);
    assert.equal(st.rainRun.lastResult.reward, null, 'Fifth note of the day: no more coins (4 per day)');
    assert.deepEqual([st.rainStats.rewardsToday, st.rainStats.entries, st.rainCorner.totalNotes], [4, 2, 5]);
    // 切到打工：白噪音停、雨幕收起（已记下的小记都保留）
    await page.click('.mode-btn[data-mode="survivor"]');
    await page.waitForTimeout(240);
    st = await getState(page);
    assert.deepEqual([st.rainRun.listening, st.ar15Audio.rainActive, st.ar15Audio.rainLoopLive, st.overlays.rain.shown], [false, false, false, false], 'Leaving the room stops the rain');
    assert(st.ar15Audio.rainStopCount >= 1);
    assert.equal(st.rainCorner.totalNotes, 5, 'Notes survive the mode switch');
    await page.click('.mode-btn[data-mode="pet"]');
    await page.waitForTimeout(240);
    const calmOff = await dbg(page, 'getAffectionMults');
    assert.equal(calmOff.rain, 1);
    assert(Math.abs(calmOn.total / calmOff.total - 1.05) < 1e-3, `+5% affection while listening: ${calmOn.total} vs ${calmOff.total}`);
    // 她来陪听：夜里自动调成轻音量、开风铃；已在听时再点就替主人摇风铃
    await dbg(page, 'setClock', dayAt(realNow, 0, 22, 10).getTime());
    await dbg(page, 'openRain');
    await page.waitForTimeout(140);
    await page.click('#btn-rain-helper');
    await page.waitForTimeout(160);
    st = await getState(page);
    assert.deepEqual([st.rainRun.listening, st.rainCorner.volumeId, st.rainCorner.chimeOn, st.ar15Audio.rainVolume], [true, 'soft', true, 0.6], 'Helper: soft volume at night');
    assert.equal(st.rainRun.weatherId, weatherOf(dayAt(realNow, 0, 22, 10)).id);
    assert.equal(await page.locator('#btn-rain-helper').textContent(), '她摇风铃');
    const ringBefore = st.rainRun.ringSeq;
    await page.click('#btn-rain-helper');
    await page.waitForTimeout(120);
    assert.equal((await getState(page)).rainRun.ringSeq, ringBefore + 1, 'Helper rings the chime while listening');
    // 单次最多 60 分钟（12 则）后自动停
    await dbg(page, 'advanceClock', 65 * 60000);
    st = await getState(page);
    assert.deepEqual([st.rainRun.listening, st.rainRun.sessionNotes, st.rainRun.lastAction], [false, 12, 'session_full'], `An hour of rain ends the session: ${JSON.stringify(st.rainRun)}`);
    assert.equal(st.ar15Audio.rainActive, false);
    await closeAll(page);

    // 7. 叠加：香氛色温 + 星空星光 + 窗边雨幕 三层同时开，仍然全是奶油色调（零深色 / 零霓虹），都不拦截点击
    await dbg(page, 'setClock', dayAt(realNow, 0, 21, 0).getTime());
    await page.evaluate(() => {
      window.__AR14_DEBUG__.pickMood('goodnight');
      for (let i = 0; i < 3; i++) window.__AR14_DEBUG__.drop();
      return window.__AR14_DEBUG__.light();
    });
    await dbg(page, 'starHelper');
    await dbg(page, 'startRain');
    await closeAll(page);
    await dbg(page, 'placePlayerForTest', 0.62);
    await page.waitForTimeout(600);
    ov = await overlayColorAudit(page);
    assert(ov.star.visible && ov.rain.visible && ov.aroma.visible, `All three room layers on: ${JSON.stringify(ov)}`);
    assert(ov.canvasStillTappable, 'Three stacked layers are still click-through');
    for (const k of ['star', 'rain', 'aroma']) {
      assert.equal(ov[k].pointer, 'none', `${k} layer must not block taps`);
      assert(ov[k].z < ov.hudZ, `${k} layer stays under the HUD`);
    }
    assertCream(ov.starGlow.cols, 'Star glow over aroma');
    assertCream(ov.rain.cols, 'Rain layer over aroma');
    assertCream(ov.aroma.cols, 'Aroma tint under star / rain');
    // 三层叠起来的最暗处仍然是奶油色：把三层渐变色按 alpha 依次叠到奶油底 #FFFDF8 上
    let mix = [255, 253, 248];
    for (const [r, g, b, a = 1] of [...ov.aroma.cols, ...ov.starGlow.cols, ...ov.rain.cols]) {
      mix = [mix[0] * (1 - a) + r * a, mix[1] * (1 - a) + g * a, mix[2] * (1 - a) + b * a];
    }
    assert(Math.min(...mix) >= 200, `Stacked layers stay cream: ${mix.map((v) => Math.round(v))}`);
    rDom = await page.evaluate(() => ({
      pill: !document.getElementById('star-rain-pill').classList.contains('hidden'),
      both: !document.getElementById('sr-seg-star').classList.contains('hidden') && !document.getElementById('sr-seg-rain').classList.contains('hidden')
    }));
    assert.deepEqual([rDom.pill, rDom.both], [true, true], 'Wide screen: the merged pill shows both segments');
    await page.waitForTimeout(300);
    await shot(page, 'desktop_1440x900_layers_stack.png');
    L = await dbg(page, 'getLayouts');
    corner = await cornerAudit(page);
    assert(corner.inStage && corner.aboveDesk && corner.clashes.length === 0, `1440x900 corner while lit: ${JSON.stringify(corner)}`);
    await shot(page, 'desktop_1440x900_scene_corner.png');
    // 合并胶囊：点星空段打开星空卡，点听雨段打开听雨卡
    await page.click('#sr-seg-star');
    await page.waitForTimeout(160);
    assert.deepEqual(await openPanelNames(page), ['starProjector'], 'Pill star segment opens the star card');
    await page.click('#sr-seg-rain');
    await page.waitForTimeout(160);
    assert.deepEqual(await openPanelNames(page), ['rainCorner'], 'Pill rain segment opens the rain card');
    await closeAll(page);
    // 星光层 / 雨幕层只在日常养成：切到打工都收起
    await page.click('.mode-btn[data-mode="survivor"]');
    await page.waitForTimeout(220);
    st = await getState(page);
    assert.deepEqual([st.overlays.star.shown, st.overlays.rain.shown, st.overlays.aroma.shown], [false, false, false], 'No room layers in the survivor shift');
    await page.click('.mode-btn[data-mode="pet"]');
    await page.waitForTimeout(220);
    st = await getState(page);
    assert.deepEqual([st.overlays.star.shown, st.overlays.rain.shown], [true, false], 'Stars come back in the room; the rain waits for the next session');

    // 8. 七日心情周报 + 手写日记联动
    await page.click('#btn-weekly-journal');
    await page.waitForTimeout(260);
    const journal = await page.evaluate(() => ({
      summary: window.__AR15_DEBUG__.getState().journalSummary,
      cardText: document.getElementById('weekly-journal-card')?.textContent || ''
    }));
    assert(journal.summary.stars7d >= 4, `7-day projections: ${journal.summary.stars7d}`);
    assert(journal.summary.rains7d >= 5, `7-day rain notes: ${journal.summary.rains7d}`);
    assert.equal(journal.summary.cumulative.starCards, 2, 'Both in-season cards are collected (the next-season one comes later on mobile)');
    assert(
      journal.cardText.includes(`星座卡 ${journal.summary.cumulative.starCards}/8`) &&
        journal.cardText.includes(`听雨 ${journal.summary.rains7d}则`) &&
        journal.cardText.includes('星夜观星与伴眠') &&
        journal.cardText.includes('陶艺香氛与手作篮'),
      `Weekly journal card must render the star / rain metrics (and keep the AR-14 metrics), got ${journal.cardText}`
    );
    assert(journal.cardText.includes('星空投影') && journal.cardText.includes('听雨'), 'Companion quote mentions the star projector and the rain corner');
    await page.waitForTimeout(200);
    await shot(page, 'desktop_1440x900_journal.png');
    await page.click('#btn-diary-book');
    await page.waitForTimeout(260);
    const diaryLines = await page.evaluate(() => Array.from(document.querySelectorAll('#dy-page-lines .dy-line')).map((li) => li.textContent.trim()));
    assert(diaryLines.some((l) => l.includes('星空投影')), `Diary mentions today's projections: ${JSON.stringify(diaryLines)}`);
    assert(diaryLines.some((l) => l.includes('听雨')), `Diary mentions today's rain notes: ${JSON.stringify(diaryLines)}`);
    assert(await page.evaluate(() => Array.from(document.querySelectorAll('#dy-page-lines .dy-line-ico')).every((im) => im.naturalWidth > 0)), 'Diary line icons (star / rain) load');
    await page.click('#btn-diary-book');
    await page.waitForTimeout(160);

    // 9. 桌面 1440x900：25 键单排不变，两张卡不压船坞 / 顶部工具栏，内容不出内部滚动
    let dock = await dockAudit(page);
    assert(dock.count === CARE_BTN_COUNT && dock.rows === 1 && dock.overlap === 0 && dock.joyMargin >= MIN_DOCK_MARGIN && dock.jumpMargin >= MIN_DOCK_MARGIN, `1440x900 dock: ${JSON.stringify(dock)}`);
    for (const [cardId, fn] of [
      ['star-projector-card', 'openStar'],
      ['rain-corner-card', 'openRain']
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

    // 10. 中等桌面：1280x720 单排、1024x768 两排；抽屉入口 / 场景投影灯 / 坐垫照样点得到，卡片不压船坞，飘台不压 HUD / 陶艺架
    await dbg(page, 'startRain');
    for (const [w, h, rowsExpected] of [
      [1280, 720, 1],
      [1024, 768, 2]
    ]) {
      await page.setViewportSize({ width: w, height: h });
      await page.waitForTimeout(300);
      dock = await dockAudit(page);
      assert(dock.count === CARE_BTN_COUNT && dock.overlap === 0 && dock.rows === rowsExpected && dock.joyMargin >= MIN_DOCK_MARGIN && dock.jumpMargin >= MIN_DOCK_MARGIN, `${w}x${h} dock: ${JSON.stringify(dock)}`);
      corner = await cornerAudit(page);
      assert(corner.inStage && corner.aboveDesk && corner.clashes.length === 0, `${w}x${h} window-ledge corner: ${JSON.stringify(corner)}`);
      await page.click('#btn-shop');
      await page.waitForTimeout(220);
      await page.click('[data-ar15-shortcut="star"]');
      await page.waitForTimeout(180);
      assert.deepEqual(await openPanelNames(page), ['starProjector'], `${w}x${h}: drawer star shortcut is reachable`);
      await closeAll(page);
      await dbg(page, 'placePlayerForTest', 0.5);
      L = await dbg(page, 'getLayouts');
      P = cornerPoints(L);
      await tapStage(page, P.projector, `${w}x${h} projector`);
      assert.deepEqual(await openPanelNames(page), ['starProjector'], `${w}x${h}: scene projector is reachable`);
      await closeAll(page);
      await dbg(page, 'placePlayerForTest', 0.5);
      await tapStage(page, P.cushion, `${w}x${h} cushion`);
      assert.deepEqual(await openPanelNames(page), ['rainCorner'], `${w}x${h}: scene rain cushion is reachable`);
      for (const [cardId, fn] of [
        ['star-projector-card', 'openStar'],
        ['rain-corner-card', 'openRain']
      ]) {
        await dbg(page, fn);
        await page.waitForTimeout(160);
        const a = await cardAudit(page, cardId);
        const hOverlap = Math.min(a.cardRight, a.careRight) - Math.max(a.cardLeft, a.careLeft) > 0;
        assert(a.cardOpen && a.overflowX <= 0 && a.overflowY <= 0 && a.outside === 0 && !a.hasEmoji, `${w}x${h} ${cardId}: ${JSON.stringify(a)}`);
        assert(!hOverlap || a.cardBottom <= a.careTop + 1, `${cardId} overlaps the dock on ${w}x${h}: ${JSON.stringify(a)}`);
        assert(a.cardTop >= a.hudRightBottom - 1, `${cardId} overlaps the toolbar on ${w}x${h}: ${JSON.stringify(a)}`);
        await page.waitForTimeout(220);
        await shot(page, `desktop_${w}x${h}_${cardId === 'star-projector-card' ? 'star' : 'rain'}.png`);
      }
      await closeAll(page);
      await dbg(page, 'placePlayerForTest', 0.62);
      await page.waitForTimeout(400);
      await shot(page, `desktop_${w}x${h}_scene.png`);
    }

    // 11. 移动端 390x844（竖屏强制横置，真实点按）：抽屉入口 → 挑卡转罩点亮；场景坐垫 → 开始听雨
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(350);
    const portraitDock = await dockAudit(page);
    assert.equal(portraitDock.rotated, true, '390x844 uses the rotated landscape stage');
    assert(portraitDock.count === CARE_BTN_COUNT && portraitDock.rows === 2 && portraitDock.overlap === 0, `390x844 dock: ${JSON.stringify(portraitDock)}`);
    assert(portraitDock.joyMargin >= MIN_DOCK_MARGIN && portraitDock.jumpMargin >= MIN_DOCK_MARGIN && portraitDock.minKey >= 30, `390x844 dock margins: ${JSON.stringify(portraitDock)}`);
    corner = await cornerAudit(page);
    assert(corner.rotated && corner.inStage && corner.aboveDesk && corner.clashes.length === 0, `390x844 window-ledge corner: ${JSON.stringify(corner)}`);
    await dbg(page, 'stopRain');
    await dbg(page, 'stopProjection');
    await dbg(page, 'resetStarForTest');
    const mobileNight = new Date(nextSeasonDay.getTime() + 24 * 3600000);
    await dbg(page, 'setClock', mobileNight.getTime());
    const [mCard] = seasonCardsOf(seasonOf(mobileNight));
    await page.click('#btn-shop');
    await page.waitForTimeout(260);
    await page.click('[data-ar15-shortcut="star"]');
    await page.waitForTimeout(220);
    assert.deepEqual(await openPanelNames(page), ['starProjector'], 'Real tap on the rotated drawer shortcut opens the star card');
    await page.click(`#sp-card-row [data-card-id="${mCard}"]`);
    await page.waitForTimeout(80);
    for (let i = 0; i < STAR_CARDS[mCard].taps; i++) {
      await page.click('#sp-dome');
      await page.waitForTimeout(80);
    }
    await page.click('#btn-star-main');
    await page.waitForTimeout(220);
    st = await getState(page);
    assert.deepEqual([st.starProjector.active && st.starProjector.active.cardId, st.overlays.star.shown], [mCard, true], 'Real taps light a projection on 390x844');
    let pa = await cardAudit(page, 'star-projector-card');
    assert(pa.cardOpen && pa.overflowX <= 0 && pa.overflowY <= 0 && pa.outside === 0 && !pa.hasEmoji, `390x844 star card: ${JSON.stringify(pa)}`);
    await page.waitForTimeout(250);
    await shot(page, 'mobile_390x844_star.png');
    await closeAll(page);
    await dbg(page, 'placePlayerForTest', 0.5);
    await page.waitForTimeout(200);
    L = await dbg(page, 'getLayouts');
    P = cornerPoints(L);
    await tapStage(page, P.cushion, '390x844 cushion');
    assert.deepEqual(await openPanelNames(page), ['rainCorner'], 'Real tap on the rotated scene cushion opens the rain card');
    await page.click('#rc-volume-row [data-volume-id="soft"]');
    await page.waitForTimeout(80);
    await page.click('#btn-rain-main');
    await page.waitForTimeout(220);
    st = await getState(page);
    assert.deepEqual([st.rainRun.listening, st.rainCorner.volumeId, st.overlays.rain.shown], [true, 'soft', true], 'Real taps start listening on 390x844');
    pa = await cardAudit(page, 'rain-corner-card');
    assert(pa.cardOpen && pa.overflowX <= 0 && pa.overflowY <= 0 && pa.outside === 0 && !pa.hasEmoji, `390x844 rain card: ${JSON.stringify(pa)}`);
    await page.waitForTimeout(250);
    await shot(page, 'mobile_390x844_rain.png');
    await closeAll(page);
    await dbg(page, 'placePlayerForTest', 0.5);
    L = await dbg(page, 'getLayouts');
    P = cornerPoints(L);
    await tapStage(page, P.projector, '390x844 projector');
    assert.deepEqual(await openPanelNames(page), ['starProjector'], 'Real tap on the rotated scene projector opens the star card');
    await closeAll(page);
    await dbg(page, 'placePlayerForTest', 0.62);
    await page.waitForTimeout(500);
    await shot(page, 'mobile_390x844_scene.png');

    // 12. 844x390 横屏：两排船坞 / 两张卡片 / 顶部 HUD / 胶囊行 零重叠，卡片内容无内部滚动，飘台不压 HUD
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(350);
    const landDock = await dockAudit(page);
    assert(landDock.count === CARE_BTN_COUNT && landDock.rows === 2 && landDock.overlap === 0 && landDock.joyMargin >= MIN_DOCK_MARGIN && landDock.jumpMargin >= MIN_DOCK_MARGIN, `844x390 dock: ${JSON.stringify(landDock)}`);
    corner = await cornerAudit(page);
    assert(corner.inStage && corner.aboveDesk && corner.clashes.length === 0, `844x390 window-ledge corner: ${JSON.stringify(corner)}`);
    for (const [cardId, fn, shotName] of [
      ['star-projector-card', 'openStar', 'mobile_844x390_star.png'],
      ['rain-corner-card', 'openRain', 'mobile_844x390_rain.png']
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
    await dbg(page, 'placePlayerForTest', 0.5);
    L = await dbg(page, 'getLayouts');
    P = cornerPoints(L);
    await tapStage(page, P.chime, '844x390 chime');
    assert.deepEqual(await openPanelNames(page), ['rainCorner'], '844x390: the hanging rain chime is reachable');
    await closeAll(page);
    // 窄屏胶囊：AR-11 ~ AR-15 五颗合并胶囊放得下才显示（与已有胶囊同一行），绝不新开一行
    await page.waitForTimeout(800);
    const pillRowAudit = await page.evaluate(() => {
      const visible = (b) => !b.classList.contains('hidden') && b.offsetParent !== null;
      const ids = ['kitchen-memory-pill', 'sill-card-pill', 'picnic-diary-pill', 'pottery-aroma-pill', 'star-rain-pill'];
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
      ['kitchen-memory-pill', 'sill-card-pill', 'picnic-diary-pill', 'pottery-aroma-pill', 'star-rain-pill'].every((id) => pillRowAudit[id].sharesRow) &&
        pillRowAudit.withPills === pillRowAudit.withoutPills,
      `AR-11 ~ AR-15 pills must not add a HUD pill row on 844x390: ${JSON.stringify(pillRowAudit)}`
    );
    await page.waitForTimeout(400);
    await shot(page, 'mobile_844x390_scene.png');
    // 极端情况：胶囊行塞满时，AR-15 胶囊先只留优先段，仍放不下就自动收起而不是换行
    const crowded = await page.evaluate(async () => {
      const ids = ['pomodoro-mini-pill', 'teatime-buff-pill', 'terrarium-blessing-pill', 'musicbox-mini-pill', 'collage-blessing-pill'];
      const prev = ids.map((id) => document.getElementById(id)?.classList.contains('hidden'));
      ids.forEach((id) => document.getElementById(id)?.classList.remove('hidden'));
      await new Promise((r) => setTimeout(r, 900));
      const pill = document.getElementById('star-rain-pill');
      const visible = (b) => !b.classList.contains('hidden') && b.offsetParent !== null;
      const others = Array.from(document.querySelectorAll('#hud-ambience-row > button')).filter((b) => b !== pill && visible(b));
      const res = {
        shown: visible(pill),
        folded: pill.classList.contains('sr-no-room') || pill.classList.contains('sr-solo'),
        sharesRow: visible(pill)
          ? others.some((b) => Math.abs(b.offsetTop + b.offsetHeight / 2 - (pill.offsetTop + pill.offsetHeight / 2)) <= 6)
          : true
      };
      ids.forEach((id, i) => {
        if (prev[i]) document.getElementById(id)?.classList.add('hidden');
      });
      return res;
    });
    assert(crowded.sharesRow, `With a crowded pill row the AR-15 pill must fold away instead of wrapping: ${JSON.stringify(crowded)}`);
    await page.waitForTimeout(700);
    await dbg(page, 'stopRain');
    await dbg(page, 'stopProjection');

    // 13. 旧存档 / 脏数据安全默认值
    await page.setViewportSize({ width: 1440, height: 900 });
    await dbg(page, 'useRealClock');
    await page.evaluate((key) => {
      const raw = JSON.parse(localStorage.getItem(key) || '{}');
      delete raw.starProjector;
      delete raw.rainCorner;
      if (raw.weeklyJournal && raw.weeklyJournal.cumulative) {
        delete raw.weeklyJournal.cumulative.totalStars;
        delete raw.weeklyJournal.cumulative.totalRains;
      }
      localStorage.setItem(key, JSON.stringify(raw));
    }, SAVE_KEY);
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(400);
    const legacy = await getState(page);
    assert.deepEqual(legacy.starProjector.cards, {}, 'Legacy save: no cards');
    assert.deepEqual([legacy.starProjector.active, legacy.starProjector.totalLights, legacy.starProjector.lastCardId], [null, 0, '']);
    assert.deepEqual([legacy.rainCorner.volumeId, legacy.rainCorner.chimeOn, legacy.rainCorner.totalNotes], ['mid', true, 0]);
    assert.deepEqual(legacy.rainCorner.entries, {});
    assert.deepEqual([legacy.rainRun.listening, legacy.ar15Audio.rainActive], [false, false], 'A reload never starts the white noise by itself');
    assert.deepEqual([legacy.overlays.star.shown, legacy.overlays.rain.shown], [false, false]);
    assert(legacy.journalSummary.stars7d >= 4 && legacy.journalSummary.rains7d >= 5, 'Journal history survives the legacy migration');
    assert.equal((await dbg(page, 'starHelper')).ok, true, 'Legacy save: the projector still works');
    await dbg(page, 'stopProjection');

    await page.evaluate((key) => {
      const raw = JSON.parse(localStorage.getItem(key) || '{}');
      raw.starProjector = {
        active: { cardId: 'leo', startMs: 1000, endMs: 1000 + 90 * 60000 },
        cards: {
          leo: { lights: 3, dreams: 'x', first: '2026-03-01' },
          orion: { lights: 5, dreams: 1 },
          gemini: { lights: 'lots', dreams: 2 },
          pegasus: { lights: -4 },
          aquila: 'yes',
          scorpius: { lights: 2, dreams: 1, first: 'never' }
        },
        rewardDate: 'x',
        rewardCount: 50,
        dreamDate: '2026-11-01',
        dreamCount: 99,
        totalLights: -3,
        totalDreams: 'many',
        lastCardId: 'orion'
      };
      raw.rainCorner = {
        volumeId: 'max',
        chimeOn: 'nope',
        entries: { day_drizzle: 2, noon_drizzle: 5, night_storm: 3, dusk_breeze: 'x', dawn_eaves: -1, night_thunder: 1 },
        rewardDate: '2026-11-18',
        rewardCount: 77,
        totalNotes: 1,
        totalMins: 'lots',
        lastWeatherId: 'hail'
      };
      if (raw.weeklyJournal && raw.weeklyJournal.days) {
        const first = Object.keys(raw.weeklyJournal.days)[0];
        if (first) Object.assign(raw.weeklyJournal.days[first], { stars: 'x', rains: 1e9 });
      }
      localStorage.setItem(key, JSON.stringify(raw));
    }, SAVE_KEY);
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(400);
    let dirty = await getState(page);
    const ds = dirty.starProjector;
    assert.deepEqual(ds.cards, { leo: { lights: 3, dreams: 0, first: '2026-03-01' }, scorpius: { lights: 2, dreams: 1, first: '' } }, `Cards sanitized: ${JSON.stringify(ds.cards)}`);
    assert.equal(ds.active, null, 'A 90-minute projection record is rejected');
    assert.deepEqual([ds.rewardDate, ds.rewardCount, ds.dreamDate, ds.dreamCount, ds.totalLights, ds.totalDreams, ds.lastCardId], ['', 0, '2026-11-01', 1, 5, 1, '']);
    const dr = dirty.rainCorner;
    assert.deepEqual(dr.entries, { day_drizzle: 2, night_thunder: 1 }, `Entries sanitized: ${JSON.stringify(dr.entries)}`);
    assert.deepEqual([dr.volumeId, dr.chimeOn, dr.rewardCount, dr.totalNotes, dr.totalMins, dr.lastWeatherId], ['mid', true, 4, 3, 15, '']);
    assert.equal(dirty.journalSummary.daysList.length, 7, 'Journal still renders 7 days');
    // 存档里早已熄灭的投影：载入后不出现星光层，并被静默清掉；这张卡仍算收集过
    await page.evaluate((key) => {
      const raw = JSON.parse(localStorage.getItem(key) || '{}');
      const t = Date.now() - 2 * 3600000;
      raw.starProjector = { active: { cardId: 'gemini', startMs: t, endMs: t + 20 * 60000 }, cards: {} };
      localStorage.setItem(key, JSON.stringify(raw));
    }, SAVE_KEY);
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(1500);
    dirty = await getState(page);
    assert.deepEqual([dirty.starProjector.active, dirty.overlays.star.shown], [null, false], 'An expired projection from the save stays off');
    assert.deepEqual(dirty.starProjector.cards, { gemini: { lights: 1, dreams: 0, first: '' } }, 'The expired projection still counts as a collected card');
    // 脏数据下依旧可以正常打开两张卡并继续游玩
    await page.click('#btn-shop');
    await page.waitForTimeout(220);
    await page.click('[data-ar15-shortcut="star"]');
    await page.waitForTimeout(180);
    assert.deepEqual(await openPanelNames(page), ['starProjector']);
    assert.equal((await dbg(page, 'starHelper')).ok, true);
    await dbg(page, 'openRain');
    await page.waitForTimeout(160);
    assert.deepEqual(await openPanelNames(page), ['rainCorner']);
    const dirtyRain = await dbg(page, 'rainHelper');
    assert.equal(dirtyRain.ok, true, `Listening works after a dirty save: ${JSON.stringify(dirtyRain)}`);
    await page.waitForTimeout(300);
    await shot(page, 'desktop_1440x900_dirty_save.png');
    await dbg(page, 'stopRain');
    await dbg(page, 'stopProjection');

    assert.equal(consoleErrors.length, 0, `Console errors observed: ${consoleErrors.join('; ')}`);
    assert.equal(pageErrors.length, 0, `Page errors observed: ${pageErrors.join('; ')}`);
    assert.equal(failedResponses.length, 0, `HTTP >= 400 responses observed: ${failedResponses.join('; ')}`);
    assert.equal(outbound.length, 0, `AR-15 must not reach the network: ${outbound.join('; ')}`);

    console.log(
      '[E2E PASS] AR-15 Bedroom Star Projector (8 constellation cards, 2 per local-date season, real taps: pick card -> turn the dome to align 4-6 stars -> light a 20-minute ceiling projection drawn with raster sparkles; 2 rewarded projections per day, new card +12, bedtime 20:00-02:00 x1.5; one-tap goodnight musicbox, goodnight stamp coins +20% and a dream stamp on the card, first per day +15) + Windowside Rain Corner (offline deterministic window weather from local date + 4 time segments x 5 weathers, Web Audio white-noise loop with drips / chime / distant rumble, volume + chime chips, a rain note every 5 injectable minutes, 4 rewarded notes per day, 20-entry codex, +5% affection while listening, stops outside the room, 60-minute cap) with weekly-journal + diary links, entries via the 家具与装扮 drawer + window-ledge projector / cushion / chime + merged pill (dock stays 25 keys, desk untouched), cream star / rain layers that stay cream and click-through on top of the aroma tint, passed across 1440x900, 1280x720, 1024x768, 390x844 (rotated, real taps) and 844x390, mutually exclusive overlays, safe legacy/dirty-save defaults, 0 network requests and 0 errors!'
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
