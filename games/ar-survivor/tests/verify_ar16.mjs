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
const PORT = Number(process.env.AR16_PORT || 0);

// 可选：设置 AR16_SHOT_DIR 后输出 1440x900 / 1280x720 / 1024x768 / 390x844 / 844x390 自审截图
const SHOT_DIR = process.env.AR16_SHOT_DIR || '';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.json': 'application/json; charset=utf-8'
};

const REQUIRED_AR16_ASSETS = [
  'ui_btn_embroidery.webp',
  'ui_btn_hearth_corner.webp',
  'embroidery_hoop.webp',
  'embroidery_patch.webp',
  'floor_heater.webp',
  'roasted_snack.webp'
];
const ASSET_SIZES = { 'floor_heater.webp': 360 };

// AR-16 明确不再加船坞键：仍是 AR-13 起的 25 键
const CARE_BTN_COUNT = 25;
const SAVE_KEY = 'ar_deepseek_pet_v2';
const MIN_DOCK_MARGIN = 10;

// 与 game.js 同一套规格（测试里独立复算，不读游戏内部实现）
const PATTERNS = {
  sakura: { season: 'spring', taps: 4, best: 'pink', name: '樱花枝' },
  daisy: { season: 'spring', taps: 3, best: 'cream', name: '小雏菊' },
  whale: { season: 'summer', taps: 4, best: 'mist', name: '小蓝鲸' },
  lemon: { season: 'summer', taps: 3, best: 'sage', name: '柠檬片' },
  ginkgo: { season: 'autumn', taps: 3, best: 'cream', name: '银杏叶' },
  maple: { season: 'autumn', taps: 4, best: 'pink', name: '小枫叶' },
  snowflake: { season: 'winter', taps: 4, best: 'mist', name: '小雪花' },
  mitten: { season: 'winter', taps: 3, best: 'sage', name: '毛线手套' }
};
const PATTERN_ORDER = Object.keys(PATTERNS);
const THREADS = ['cream', 'pink', 'sage', 'mist'];
const LEVELS = [
  { id: 'rest', name: '休眠', flips: 0, bonus: 0 },
  { id: 'low', name: '小火', flips: 5, bonus: 0.04 },
  { id: 'warm', name: '暖火', flips: 4, bonus: 0.06 },
  { id: 'blaze', name: '旺火', flips: 3, bonus: 0.08 }
];
const SNACKS = ['honey', 'berry', 'cinnamon', 'maple'];
// 本地月份 → 冬日程度（暖季 / 微凉 / 初冬早春 / 深冬），冬日程度 × 时段（清晨 / 午后 / 傍晚 / 夜里）→ 火力
const MONTH_COLD = [3, 3, 2, 1, 0, 0, 0, 0, 0, 1, 2, 3];
const COLD_TABLE = [
  [0, 0, 0, 0],
  [1, 0, 1, 2],
  [2, 1, 2, 3],
  [3, 2, 3, 3]
];
const SEG_IDS = ['dawn', 'day', 'dusk', 'night'];

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

function levelOf(d) {
  return COLD_TABLE[MONTH_COLD[d.getMonth()]][segIdxOf(d)];
}

function seasonPatternsOf(seasonId) {
  return PATTERN_ORDER.filter((id) => PATTERNS[id].season === seasonId);
}

function dayAt(base, offsetDays, hh = 10, mm = 0) {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + offsetDays, hh, mm, 0, 0);
}

function keyOf(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function shot(page, name) {
  if (!SHOT_DIR) return;
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  // 自审截图前先收起偶发的亲密度里程碑弹窗（与 AR-16 无关，只是会挡住卡片头部）
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

  // 缓存号：style.css / 全部贴图 ?v=hd31，game.js?v=hd55，没有任何 hd23..hd30 / game.js?v=hd50..hd54 残留
  assert(/\.\/style\.css\?v=hd31\b/.test(htmlContent), 'index.html must reference ./style.css?v=hd31');
  assert(/\.\/game\.js\?v=hd55\b/.test(htmlContent), 'index.html must reference ./game.js?v=hd55');
  let htmlAr16Refs = 0;
  for (const reqAsset of REQUIRED_AR16_ASSETS) {
    if (new RegExp(`\\./assets/${reqAsset.replace('.', '\\.')}\\?v=hd31\\b`).test(htmlContent)) htmlAr16Refs += 1;
    assert(assetRefs.has(reqAsset), `Required AR-16 asset ${reqAsset} is not referenced in code`);
    assert(new RegExp(`${reqAsset.replace('.', '\\.')}\\?v=hd31\\b`).test(spritesContent), `${reqAsset} must be preloaded by sprites.js with ?v=hd31`);
  }
  assert.equal(htmlAr16Refs, REQUIRED_AR16_ASSETS.length, `index.html must reference all 6 AR-16 images with ?v=hd31, got ${htmlAr16Refs}`);
  for (const [name, content] of [
    ['index.html', htmlContent],
    ['style.css', cssContent],
    ['sprites.js', spritesContent],
    ['game.js', gameContent]
  ]) {
    assert(!/\?v=hd(?:2[3-9]|30)\b/.test(content), `Stale ?v=hd23..hd30 cache-buster left in public/${name}`);
  }
  assert(!/game\.js\?v=hd5[0-4]\b/.test(htmlContent), 'Stale game.js?v=hd50..hd54 left in index.html');
  assert(/\?v=hd31\b/.test(cssContent), 'style.css must use ?v=hd31 asset cache-busters');
  assert(/\.\/sprites\.js\?v=hd31\b/.test(gameContent), 'game.js must import ./sprites.js?v=hd31');
  assert(/\.\/audio\.js\?v=hd31\b/.test(gameContent), 'game.js must import ./audio.js?v=hd31');
  assert(/\.\/vision\.js\?v=hd31\b/.test(gameContent), 'game.js must import ./vision.js?v=hd31');
  for (const fn of ['getAr16WallLayout', 'drawAr16WallHoop', 'getAr16FloorLayout', 'drawAr16FloorHearth', 'drawEmbroideryProp', 'drawHearthSnackProp']) {
    assert(new RegExp(`export function ${fn}`).test(spritesContent), `sprites.js must export ${fn}`);
  }
  for (const fn of [
    'playEmbroideryStitch',
    'playEmbroideryHang',
    'playHearthCrackle',
    'playHearthKindle',
    'playSnackFlip',
    'playSnackShare',
    'getAr16AudioInfo'
  ]) {
    assert(new RegExp(`\\n  ${fn}\\(`).test(audioContent), `audio.js must define ${fn}()`);
  }
  for (const asset of assetRefs) {
    const full = path.join(PUBLIC_DIR, 'assets', asset);
    assert(fs.existsSync(full), `Missing asset on disk: ${full}`);
    assert(fs.statSync(full).size > 0, `Empty asset on disk: ${full}`);
  }

  // 船坞不加键：仍是 25 键，也没有任何刺绣 / 暖炉船坞键
  assert.equal((htmlContent.match(/class="care-btn[\s"]/g) || []).length, CARE_BTN_COUNT, `index.html must keep exactly ${CARE_BTN_COUNT} dock keys`);
  const dockHtml = htmlContent.slice(htmlContent.indexOf('id="pet-care-bar"'), htmlContent.indexOf('class="action-zone"'));
  assert(dockHtml.length > 100 && !/embroidery|hearth|heater|roasted_snack/.test(dockHtml), 'AR-16 must not add an embroidery / hearth key to the dock');

  // AR-16 场景 / 卡片只贴已提供的位图（柔光渐变 + 文字标签），不画任何矢量图形，也不画 canvas 图标
  const vectorRe = /beginPath|lineTo|\barc\(|arcTo|bezierCurveTo|quadraticCurveTo|strokeRect|roundRect\(|\.stroke\(\)|\.fill\(\)/;
  const ar16Sprites = sliceBetween(spritesContent, '// ================= AR-16 墙面刺绣绷架 & 地板小暖炉冬日角', '', 'sprites.js AR-16');
  assert(!vectorRe.test(ar16Sprites), 'AR-16 canvas drawing must only draw the provided webp art');
  // 书桌与窗台都已满：绷架挂在陶艺架上方的墙面（沿用陶艺架 / 星空听雨角几何，不碰书桌线），暖炉落在实测船坞上沿以上的地板
  const wallFn = sliceBetween(ar16Sprites, 'export function getAr16WallLayout', 'export function drawAr16WallHoop', 'wall layout');
  assert(
    /getPotteryShelfLayout\(W, H, camX, 4\)/.test(wallFn) && /getAr15CornerLayout\(W, H, camX\)/.test(wallFn) && !/0\.68/.test(wallFn),
    'AR-16 hoop must hang on the wall above the pottery shelf / window ledge, not on the desk'
  );
  const floorFn = sliceBetween(ar16Sprites, 'export function getAr16FloorLayout', 'export function drawAr16FloorHearth', 'floor layout');
  assert(/floorBottom/.test(floorFn) && /deskY \+ 24 \+ size/.test(floorFn), 'AR-16 heater must stand on the floor below the desk line, above the measured dock / joystick');
  const ar16Game = sliceBetween(gameContent, '// ================= AR-16 墙面刺绣绷架 & 地板小暖炉冬日角', '// ================= AR 拍立得纪念合影系统', 'game.js AR-16');
  const ar16Spec = sliceBetween(gameContent, '// AR-16 墙面刺绣绷架 & 地板小暖炉冬日角：规格常量', 'function resetSurvivorRun', 'game.js AR-16 specs');
  assert(!vectorRe.test(ar16Game), 'AR-16 game section must not draw vector shapes');
  assert(!/getContext\(/.test(ar16Game), 'AR-16 UI must not create canvas-drawn icons');
  // 暖炉按本地日期 + 时段亮起：不联网、不读任何系统传感器 / 电池 / 温度
  const offlineRe = /fetch\(|XMLHttpRequest|WebSocket|EventSource|geolocation|getBattery|Sensor\(|devicemotion|deviceorientation|temperature|https?:\/\//i;
  const ar16Audio = sliceBetween(audioContent, '// AR-16 绣一针', '  getAr11AudioInfo() {', 'audio.js AR-16');
  for (const [label, code] of [
    ['game.js AR-16 section', ar16Game],
    ['game.js AR-16 specs', ar16Spec],
    ['sprites.js AR-16', ar16Sprites],
    ['audio.js AR-16', ar16Audio]
  ]) {
    assert(!offlineRe.test(code), `${label} must stay offline (no network / sensors / temperature)`);
  }
  // 绣样 / 绣线 / 火力 / 口味的浅色调：三通道都 >= 200（奶油色，零深色）
  let rgbCount = 0;
  for (const m of ar16Spec.matchAll(/rgb: '(\d+), (\d+), (\d+)'/g)) {
    rgbCount += 1;
    assert(Math.min(Number(m[1]), Number(m[2]), Number(m[3])) >= 200, `AR-16 tint must stay cream/pastel, got ${m[0]}`);
  }
  assert(rgbCount >= 20, `Expected 8 pattern + 4 thread + 4 level + 4 snack tints, got ${rgbCount}`);

  // 零暗黑赛博 / 荧光色：AR-16 样式段不得出现深色，渐变不能用 transparent（会被算成黑色透明）
  const cssStart = cssContent.indexOf('AR-16 墙面刺绣绷架 & 地板小暖炉冬日角');
  assert(cssStart > 0, 'style.css must contain the AR-16 section');
  const ar16Css = cssContent.slice(cssStart);
  assert(
    !/neon|#0{3,6}\b|#000\b|#111|#1[0-9a-f]{5}\b|#[2-4][0-9a-f]{5}\b|rgba?\(\s*(?:[0-5]?\d)\s*,\s*(?:[0-5]?\d)\s*,\s*(?:[0-9]?\d)\s*[,)]/i.test(ar16Css),
    'AR-16 CSS must not contain near-black / neon colors'
  );
  assert(!/transparent/.test(ar16Css), 'AR-16 CSS gradients must fade to cream/white, not to black-transparent');

  console.log(
    `[STATIC PASS] ${jsFiles.length} JS modules syntax-checked, ${assetRefs.size} assets verified on disk (including all 6 AR-16 images), ?v=hd31/hd55 synced with 0 stale hd23-hd30, still ${CARE_BTN_COUNT} dock keys (no embroidery / hearth key), hoop on the wall above the pottery shelf + heater on the floor (not the desk / sill), 0 inline <svg>, 0 Emoji, 0 vector shapes / canvas icons, 0 network / sensor calls in AR-16 code, ${rgbCount} cream tints, 0 dark/neon colors in AR-16 CSS.`
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
  return page.evaluate((d) => window.__AR16_DEBUG__.getState(d), iso);
}

async function dbg(page, fn, ...args) {
  return page.evaluate(([f, a]) => window.__AR16_DEBUG__[f](...a), [fn, args]);
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
    for (const id of ['btn-embroidery-close', 'btn-hearth-close', 'btn-star-close', 'btn-rain-close', 'btn-pottery-close', 'btn-aroma-close']) {
      const el = document.getElementById(id);
      const card = el && el.closest('aside');
      if (card && !card.classList.contains('hidden')) {
        el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
      }
    }
    return ['embroidery-card', 'hearth-card', 'star-projector-card', 'rain-corner-card', 'pottery-wheel-card', 'aroma-table-card'].filter(
      (id) => !document.getElementById(id).classList.contains('hidden')
    );
  });
  assert.deepEqual(left, [], `closeAll must close every AR-14 ~ AR-16 card, still open: ${left.join(', ')}`);
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

function scenePoints(L) {
  const Wl = L.wall;
  const F = L.floor;
  return {
    hoop: { x: Wl.hoopX, y: Wl.hoopY },
    patch: { x: Wl.slots[0].x, y: Wl.ribbonY + Wl.patch * 0.55 },
    heater: { x: F.heaterX, y: F.baseY - F.size * 0.5 }
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

// 卡片 / HUD / 船坞布局审计（与 AR-13 ~ AR-15 同一套口径）
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
      imgsLoaded: imgs.every((im) => im.classList.contains('hidden') || (im.complete && im.naturalWidth > 0)),
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

// 墙面绷架 / 绣品 / 地板暖炉（含场景标签）不压 HUD、胶囊、船坞、摇杆、动作键，也不压陶艺架 / 星空听雨角 / 窗户 / 香氛台 / 桌面家具：
// 舞台坐标换算成视口坐标（旋转舞台按 CW / CCW 换算）和 HUD 元素的视口矩形比；场景物件之间直接在舞台坐标里比
async function sceneAudit(page) {
  return page.evaluate(() => {
    const L = window.__AR16_DEBUG__.getLayouts();
    const st = window.__AR16_DEBUG__.getState();
    const st15 = window.__AR15_DEBUG__.getState();
    const Wl = L.wall;
    const F = L.floor;
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
    const circ = (c) => ({ x: c.x - c.r, y: c.y - c.r, w: c.r * 2, h: c.r * 2 });
    const mctx = document.createElement('canvas').getContext('2d');
    mctx.font = '900 9.5px -apple-system, BlinkMacSystemFont, sans-serif';
    const textRect = (txt, cx, baseY) => {
      const w = mctx.measureText(txt).width + 4;
      return { x: cx - w / 2, y: baseY - 9, w, h: 12 };
    };
    const wallCount = st.embroideryHoop.wall.length;
    const objects = [
      ['hoop', { x: Wl.hoopX - Wl.hoop / 2, y: Wl.ribbonY, w: Wl.hoop, h: Wl.hoop }],
      ['hoopHit', circ(Wl.hoopHit)],
      ['wallLabel', textRect(st.embroideryVisual.label || '刺绣绷架', Wl.hoopX, Wl.labelY)],
      ['heater', { x: F.heaterX - F.size / 2, y: F.baseY - F.size, w: F.size, h: F.size }],
      ['snack', { x: F.snackX - F.snack / 2, y: F.baseY - F.snack, w: F.snack, h: F.snack }],
      ['floorHit', F.hit]
    ];
    if (wallCount > 0) {
      const left = Wl.slots[wallCount - 1].x - Wl.patch / 2 - 6;
      objects.push(['patches', { x: left, y: Wl.ribbonY - 2, w: Wl.hoopX - left, h: Wl.patch + 2 }]);
      objects.push(['patchHit', Wl.patchHit]);
    }
    if (!F.compact) objects.push(['floorLabel', textRect(st.hearthVisual.label || '小暖炉', F.labelX, F.labelY)]);
    const wallNames = ['hoop', 'hoopHit', 'wallLabel', 'patches', 'patchHit'];
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
    for (const pill of Array.from(document.querySelectorAll('#hud-ambience-row > button'))) {
      if (pill.classList.contains('hidden') || pill.offsetParent === null) continue;
      const b = pill.getBoundingClientRect();
      for (const [oname, o] of objects) if (hit(toClient(o), { x: b.left, y: b.top, w: b.width, h: b.height })) clashes.push(`${oname}~${pill.id}`);
    }
    // 场景物件：陶艺架（摆满 4 件）、星空投影灯 / 听雨角 + 标签、窗户、香氛小桌、桌面家具 / 花房盆栽
    const ar15Label = textRect(`${st15.starVisual.label || '星空灯'} · ${st15.rainVisual.label || '听雨角'}`, C.labelX, C.baseY + 12);
    const sceneBlockers = [
      ['pottery-shelf', L.shelf.hit],
      ['star-projector', circ(C.projector.hit)],
      ['rain-corner', C.rainHit],
      ['ar15-label', ar15Label],
      ['window', { x: L.sill.winLeft, y: L.sill.winTop, w: L.sill.winW, h: L.sill.winH }],
      ['aroma-table', circ(L.aroma.hit)],
      ...L.furniture.map((f) => [`furniture-${f.key}`, circ({ x: f.x, y: f.y - 34, r: 54 })]),
      ...L.plants.map((p, i) => [`plant-${i}`, circ({ x: p.x, y: p.y - 26, r: 36 })])
    ];
    for (const [oname, o] of objects) {
      for (const [bname, b] of sceneBlockers) {
        if (hit(o, b)) clashes.push(`${oname}~${bname}`);
      }
    }
    // 墙面物件与地板物件互不相交
    for (const [an, a] of objects.filter(([n]) => wallNames.includes(n))) {
      for (const [bn, b] of objects.filter(([n]) => !wallNames.includes(n))) if (hit(a, b)) clashes.push(`${an}~${bn}`);
    }
    const deskY = L.H * 0.68;
    const wallObjs = objects.filter(([n]) => wallNames.includes(n)).map(([, o]) => o);
    const floorObjs = objects.filter(([n]) => !wallNames.includes(n)).map(([, o]) => o);
    return {
      W: L.W,
      H: L.H,
      rotated,
      deskY,
      floorBottom: L.floorBottom,
      heaterTop: F.baseY - F.size,
      floorHitBottom: F.hit.y + F.hit.h,
      size: F.size,
      compact: F.compact,
      // 墙面：绷架 / 绣品整体在书桌线之上很远（挂在陶艺架上方）；地板：暖炉贴图顶在书桌线以下（最多冒出 2px），点击区底边在实测 HUD 上沿以上
      onWall: wallObjs.every((o) => o.y + o.h <= deskY - 60),
      onFloor: F.baseY - F.size >= deskY - 2 && F.hit.y + F.hit.h <= L.floorBottom,
      inStage: [...wallObjs, ...floorObjs].every((o) => o.x >= 0 && o.y >= 0 && o.x + o.w <= L.W && o.y + o.h <= L.H),
      clashes
    };
  });
}

async function overlayColorAudit(page) {
  return page.evaluate(() => {
    const parse = (bg) => Array.from(bg.matchAll(/rgba?\(([^)]+)\)/g)).map((m) => m[1].split(',').map((v) => Number(v.trim())));
    const out = {};
    for (const [key, sel] of [
      ['hearth', '#hearth-ambient-overlay'],
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
    // 全程断网：AR-16 的“本地日期 + 时段暖炉”不允许联网
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

    // 0. DOM Emoji / 奶油手账配色 / 6 张 AR-16 贴图加载审计
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
        img.src = `./assets/${file}?v=hd31`;
        await new Promise((res, rej) => {
          if (img.complete && img.naturalWidth > 0) res();
          else {
            img.onload = () => res();
            img.onerror = () => rej(new Error(`Failed to decode ${file}`));
          }
        });
        loadReport[file] = { w: img.naturalWidth, h: img.naturalHeight };
      }
      const ho = document.getElementById('hearth-ambient-overlay');
      return {
        hasEmoji: /\p{Extended_Pictographic}/u.test(document.body.innerText || ''),
        brokenImgs,
        domImgCount: domImgs.length,
        domLoaded: domImgs.every((img) => img.complete && img.naturalWidth > 0),
        loadReport,
        ebBg: getComputedStyle(document.getElementById('embroidery-card')).backgroundImage,
        hcBg: getComputedStyle(document.getElementById('hearth-card')).backgroundImage,
        hearthPointer: getComputedStyle(ho).pointerEvents,
        hearthZ: Number(getComputedStyle(ho).zIndex),
        hudZ: Number(getComputedStyle(document.querySelector('.cyber-hud-top')).zIndex),
        pillHidden: document.getElementById('stitch-hearth-pill').classList.contains('hidden'),
        careBtnCount: document.querySelectorAll('#pet-care-bar .care-btn').length,
        overflowX: document.documentElement.scrollWidth - window.innerWidth,
        overflowY: document.documentElement.scrollHeight - window.innerHeight
      };
    }, REQUIRED_AR16_ASSETS);
    assert.equal(initialAudit.hasEmoji, false, 'Visible DOM must contain zero Emoji characters');
    assert.equal(initialAudit.brokenImgs.length, 0, `Broken ./assets/ images: ${initialAudit.brokenImgs.join(', ')}`);
    assert(initialAudit.domImgCount >= 14, `Expected >= 14 AR-16 <img> in DOM, got ${initialAudit.domImgCount}`);
    assert.equal(initialAudit.domLoaded, true, 'Every AR-16 <img> in DOM must load (naturalWidth > 0)');
    for (const [file, info] of Object.entries(initialAudit.loadReport)) {
      const sz = ASSET_SIZES[file] || 256;
      assert(info.w === sz && info.h === sz, `AR-16 image ${file} must decode as ${sz}x${sz}, got ${JSON.stringify(info)}`);
    }
    assert.equal(initialAudit.careBtnCount, CARE_BTN_COUNT, `Expected ${CARE_BTN_COUNT} dock buttons, got ${initialAudit.careBtnCount}`);
    assert(initialAudit.overflowX <= 0 && initialAudit.overflowY <= 0, `Desktop 1440x900 overflow: ${JSON.stringify(initialAudit)}`);
    assert(/255,\s*253,\s*248/.test(initialAudit.ebBg), `#embroidery-card must use cream #FFFDF8, got ${initialAudit.ebBg}`);
    assert(/255,\s*253,\s*248/.test(initialAudit.hcBg), `#hearth-card must use cream #FFFDF8, got ${initialAudit.hcBg}`);
    assert.equal(initialAudit.hearthPointer, 'none', 'The hearth layer must never block taps');
    assert(initialAudit.hearthZ < initialAudit.hudZ, `Hearth layer stays under the HUD: ${JSON.stringify(initialAudit)}`);
    assert.equal(initialAudit.pillHidden, true, 'Nothing stitched / no cuddle = AR-16 pill stays hidden');

    const realNow = new Date();
    const todayKey = keyOf(realNow);
    const tonight = dayAt(realNow, 0, 21, 30);
    const season = seasonOf(tonight);
    const [patA, patB] = seasonPatternsOf(season);
    const offSeason = PATTERN_ORDER.find((id) => PATTERNS[id].season !== season);
    const nightLv = levelOf(tonight);
    const roastLv = nightLv || 1;
    await dbg(page, 'setClock', tonight.getTime());

    // 1. 新存档：空绣样册、空墙面、空点心手帐、没生小火、没在依偎；暖炉火力只由本地月份 + 时段决定
    let st = await getState(page);
    assert.deepEqual([st.embroideryHoop.patterns, st.embroideryHoop.wall, st.embroideryHoop.totalPieces, st.embroideryHoop.lastThreadId], [{}, [], 0, 'cream'], 'Fresh save: empty embroidery');
    assert.deepEqual([st.hearthCorner.entries, st.hearthCorner.cuddle, st.hearthCorner.kindle, st.hearthCorner.totalSnacks], [{}, null, null, 0], 'Fresh save: empty hearth');
    assert.equal(st.embroideryStats.seasonId, season, `Season follows the injected local date: ${st.embroideryStats.seasonId}`);
    assert.deepEqual(st.embroideryStats.seasonPatterns, [patA, patB], `This season's patterns: ${JSON.stringify(st.embroideryStats.seasonPatterns)}`);
    assert.deepEqual([st.hearthStats.state.level, st.hearthStats.state.segId], [nightLv, 'night'], `21:30 heater level: ${JSON.stringify(st.hearthStats.state)}`);
    assert.equal(st.overlays.hearth.shown, nightLv > 0, 'The hearth layer only shows while the heater is lit');
    assert.equal(st.cuddleMult, 1, 'No cuddle yet');

    // 2. 入口：不加船坞键 —— 抽屉「家具与装扮」快捷卡（紧跟星空听雨块）+ 墙面绷架 / 地板暖炉场景点击
    await page.click('#btn-shop');
    await page.waitForTimeout(220);
    const drawerAudit = await page.evaluate(() => {
      const blocks = Array.from(document.querySelectorAll('#drawer-items .drawer-section-block'));
      const idx = blocks.findIndex((b) => b.querySelector('[data-ar16-shortcut]'));
      const idx14 = blocks.findIndex((b) => b.querySelector('[data-ar14-shortcut]'));
      const idx15 = blocks.findIndex((b) => b.querySelector('[data-ar15-shortcut]'));
      const eBtn = document.querySelector('[data-ar16-shortcut="embroidery"]');
      eBtn.scrollIntoView({ block: 'nearest' });
      const items = document.getElementById('drawer-items').getBoundingClientRect();
      const pr = eBtn.getBoundingClientRect();
      return {
        idx,
        idx14,
        idx15,
        title: idx >= 0 ? blocks[idx].querySelector('.drawer-section-title').textContent : '',
        imgsLoaded: Array.from(blocks[idx] ? blocks[idx].querySelectorAll('img') : []).every((im) => im.naturalWidth > 0),
        visibleAfterScroll: Boolean(pr.top >= items.top - 1 && pr.bottom <= items.bottom + 1),
        sub: eBtn.querySelector('.room-theme-sub').textContent,
        hearthSub: document.querySelector('[data-ar16-shortcut="hearth"] .room-theme-sub').textContent
      };
    });
    assert.deepEqual([drawerAudit.idx14, drawerAudit.idx15], [1, 2], 'AR-14 / AR-15 shortcuts keep their spots');
    assert.equal(drawerAudit.idx, 3, `AR-16 shortcuts sit right after the AR-15 block, got ${drawerAudit.idx}`);
    assert.equal(drawerAudit.title, '墙面刺绣绷架与地板小暖炉');
    assert(drawerAudit.imgsLoaded, 'Drawer shortcut art loads');
    assert(drawerAudit.visibleAfterScroll, 'The embroidery shortcut scrolls into the drawer viewport');
    assert(drawerAudit.sub.includes('绣样 0/8'), `Fresh embroidery shortcut sub: ${drawerAudit.sub}`);
    assert(drawerAudit.hearthSub.includes(LEVELS[nightLv].name), `Hearth shortcut shows the heater level: ${drawerAudit.hearthSub}`);
    await page.waitForTimeout(150);
    await shot(page, 'desktop_1440x900_drawer_entry.png');
    await page.click('[data-ar16-shortcut="embroidery"]');
    await page.waitForTimeout(180);
    assert.deepEqual(await openPanelNames(page), ['embroideryHoop'], 'Drawer embroidery shortcut opens only the embroidery card');
    await page.click('#btn-shop');
    await page.waitForTimeout(200);
    await page.click('[data-ar16-shortcut="hearth"]');
    await page.waitForTimeout(180);
    assert.deepEqual(await openPanelNames(page), ['hearthCorner'], 'Drawer hearth shortcut opens only the hearth card');
    st = await getState(page);
    if (nightLv > 0) assert(st.ar16Audio.hearthCrackleCount >= 1, 'Opening a lit heater crackles');
    await closeAll(page);
    await dbg(page, 'placePlayerForTest', 0.78);
    await page.waitForTimeout(150);
    let L = await dbg(page, 'getLayouts');
    let P = scenePoints(L);
    await tapStage(page, P.hoop, 'Hoop tap');
    assert.deepEqual(await openPanelNames(page), ['embroideryHoop'], 'Tapping the wall hoop opens the embroidery card');
    await closeAll(page);
    await dbg(page, 'placePlayerForTest', 0.78);
    await tapStage(page, P.heater, 'Heater tap');
    assert.deepEqual(await openPanelNames(page), ['hearthCorner'], 'Tapping the floor heater opens the hearth card');
    await closeAll(page);
    let scene = await sceneAudit(page);
    assert(scene.inStage && scene.onWall && scene.onFloor && scene.clashes.length === 0, `1440x900 wall / floor objects: ${JSON.stringify(scene)}`);

    // 3. 浮层互斥：AR-16 两张卡与 AR-14 / AR-15 卡、船坞其它卡片 / 抽屉一次只开一个
    const exclusive = [
      ['dock', '#btn-picnic-basket', 'picnicBasket'],
      ['ar16', 'openEmbroidery', 'embroideryHoop'],
      ['ar15', 'openStar', 'starProjector'],
      ['ar16', 'openHearth', 'hearthCorner'],
      ['ar14', 'openPottery', 'potteryWheel'],
      ['ar16', 'openEmbroidery', 'embroideryHoop'],
      ['dock', '#btn-diary-book', 'diaryBook'],
      ['ar16', 'openHearth', 'hearthCorner'],
      ['ar15', 'openRain', 'rainCorner'],
      ['ar16', 'openEmbroidery', 'embroideryHoop'],
      ['ar14', 'openAroma', 'aromaTable'],
      ['ar16', 'openHearth', 'hearthCorner'],
      ['dock', '#btn-teatime', 'teatime'],
      ['ar16', 'openEmbroidery', 'embroideryHoop'],
      ['dock', '#btn-kitten-corner', 'kittenCorner'],
      ['ar16', 'openHearth', 'hearthCorner'],
      ['dock', '#btn-weekly-journal', 'weeklyJournal'],
      ['ar16', 'openEmbroidery', 'embroideryHoop'],
      ['dock', '#btn-musicbox', 'goodnightMusicbox'],
      ['ar16', 'openHearth', 'hearthCorner'],
      ['dock', '#btn-pomodoro', 'pomodoro'],
      ['ar16', 'openEmbroidery', 'embroideryHoop'],
      ['dock', '#btn-chat-topic', 'topic'],
      ['ar16', 'openHearth', 'hearthCorner'],
      ['dock', '#btn-shop', 'drawer']
    ];
    for (const [kind, target, key] of exclusive) {
      if (kind === 'dock') {
        await page.click(target);
      } else if (kind === 'ar14') {
        await page.evaluate((f) => window.__AR14_DEBUG__[f](), target);
      } else if (kind === 'ar15') {
        await page.evaluate((f) => window.__AR15_DEBUG__[f](), target);
      } else {
        await dbg(page, target);
      }
      await page.waitForTimeout(120);
      assert.deepEqual(await openPanelNames(page), [key], `Opening ${target} must keep ONLY ${key} open, got ${JSON.stringify(await openPanelNames(page))}`);
    }
    await page.click('#btn-shop');
    await page.waitForTimeout(160);
    assert.deepEqual(await openPanelNames(page), [], 'Shop key closes the drawer again');

    // 4. 墙面刺绣绷架：真实点按 挑当季绣样 → 选最搭的绣线 → 点绷架你一针她一针 → 收针挂墙（新绣样 + 配色灵感）
    await dbg(page, 'openEmbroidery');
    await page.waitForTimeout(160);
    let eDom = await page.evaluate(() => ({
      chips: Array.from(document.querySelectorAll('#eb-pattern-row .eb-pattern-chip')).map((c) => c.dataset.patternId),
      threads: Array.from(document.querySelectorAll('#eb-thread-row .eb-thread-chip')).map((c) => c.dataset.threadId),
      album: Array.from(document.querySelectorAll('#eb-album-grid .eb-album-chip')).map((c) => c.dataset.patternId),
      imgs: Array.from(document.querySelectorAll('#embroidery-card img')).every((im) => im.classList.contains('hidden') || (im.complete && im.naturalWidth > 0)),
      main: document.getElementById('btn-embroidery-main').textContent,
      mainDisabled: document.getElementById('btn-embroidery-main').disabled,
      season: document.getElementById('eb-season-row').dataset.season
    }));
    assert.deepEqual(eDom.chips, [patA, patB], `In-season pattern chips: ${JSON.stringify(eDom.chips)}`);
    assert.deepEqual(eDom.threads, THREADS, 'Four cream threads');
    assert.deepEqual(eDom.album, PATTERN_ORDER, 'The album shows all 8 patterns');
    assert.equal(eDom.imgs, true, 'Embroidery card art loads');
    assert.deepEqual([eDom.main, eDom.mainDisabled, eDom.season], ['先挑绣样', true, season], `Fresh embroidery card: ${JSON.stringify(eDom)}`);
    // 不在当季、也还没绣过的绣样点不动
    await page.click(`#eb-album-grid [data-pattern-id="${offSeason}"]`);
    await page.waitForTimeout(100);
    let run = await dbg(page, 'getEmbroideryRun');
    assert.deepEqual([run.patternId, run.lastAction], ['', 'locked'], `Out-of-season pattern stays locked: ${JSON.stringify(run)}`);
    await page.click(`#eb-pattern-row [data-pattern-id="${patA}"]`);
    await page.waitForTimeout(100);
    const needA = PATTERNS[patA].taps;
    assert.equal(await page.locator('#btn-embroidery-main').textContent(), `绣一针 0/${needA}`);
    await page.click(`#eb-thread-row [data-thread-id="${PATTERNS[patA].best}"]`);
    await page.waitForTimeout(100);
    run = await dbg(page, 'getEmbroideryRun');
    assert.equal(run.threadId, PATTERNS[patA].best, 'Thread chip picks the thread');
    assert(await page.evaluate((t) => document.querySelector(`#eb-thread-row [data-thread-id="${t}"]`).classList.contains('active') && document.querySelector(`#eb-thread-row [data-thread-id="${t}"]`).classList.contains('is-best'), PATTERNS[patA].best), 'The best thread is marked');
    for (let i = 0; i < needA - 1; i++) {
      await page.click('#eb-hoop');
      await page.waitForTimeout(90);
    }
    st = await getState(page);
    assert.deepEqual([st.embroideryVisual.active, st.embroideryVisual.stitches], [true, (needA - 1) * 2], `The wall hoop shows the work in progress: ${JSON.stringify(st.embroideryVisual)}`);
    assert(!(await page.evaluate(() => document.getElementById('stitch-hearth-pill').classList.contains('hidden'))), 'Stitching shows the merged pill');
    assert.equal(await page.locator('#sh-pill-stitch').textContent(), `${(needA - 1) * 2}/${needA * 2}`);
    await shot(page, 'desktop_1440x900_embroidery_stitch.png');
    await page.click('#btn-embroidery-main');
    await page.waitForTimeout(100);
    st = await getState(page);
    assert.deepEqual([st.embroideryRun.patternId, st.embroideryRun.taps, st.embroideryRun.phase], [patA, needA, 'stitch'], `Hoop taps + main tap fill the pattern: ${JSON.stringify(st.embroideryRun)}`);
    assert(st.ar16Audio.embroideryStitchCount >= needA, `Each stitch plucks: ${JSON.stringify(st.ar16Audio)}`);
    assert.equal(await page.evaluate(() => document.querySelectorAll('#eb-stitches .eb-stitch-dot.is-on').length), needA * 2, 'You stitch one, she stitches the next: every stitch lights up');
    assert.equal(await page.locator('#btn-embroidery-main').textContent(), '收针挂墙');
    const coinsBeforeA = st.coins;
    await page.click('#btn-embroidery-main');
    await page.waitForTimeout(260);
    st = await getState(page);
    const resA = st.embroideryRun.lastResult;
    assert.deepEqual([resA.patternId, resA.threadId, resA.isNew, resA.best], [patA, PATTERNS[patA].best, true, true], `Hung piece: ${JSON.stringify(resA)}`);
    assert.deepEqual(resA.reward, { coins: 22, xp: 6 }, `New pattern + best thread: 8 + 10 + 4 coins, 6 affection: ${JSON.stringify(resA.reward)}`);
    assert(st.coins >= coinsBeforeA + 22, 'Embroidery coins arrive');
    assert.deepEqual(st.embroideryHoop.wall, [{ patternId: patA, threadId: PATTERNS[patA].best, date: todayKey }], 'The piece hangs on the wall');
    assert.deepEqual([st.embroideryStats.collected, st.embroideryHoop.patterns[patA].count], [1, 1]);
    assert.equal(st.journalSummary.embroideries7d, 1, 'Weekly journal counts the embroidery');
    assert(st.ar16Audio.embroideryHangCount >= 1, 'Hanging chimes');
    assert(st.emote.includes('挂上墙'), `She announces the hung piece: ${st.emote}`);
    assert.deepEqual([st.embroideryVisual.active, st.embroideryVisual.wall.length], [false, 1], 'Scene: the patch moves from the hoop to the wall ribbon');
    assert.equal(await page.locator('#btn-embroidery-main').textContent(), '再绣一幅');
    await page.waitForTimeout(400);
    await shot(page, 'desktop_1440x900_embroidery_hung.png');
    // 墙上的绣品也能点开刺绣卡
    await closeAll(page);
    await dbg(page, 'placePlayerForTest', 0.78);
    L = await dbg(page, 'getLayouts');
    P = scenePoints(L);
    await tapStage(page, P.patch, 'Wall patch tap');
    assert.deepEqual(await openPanelNames(page), ['embroideryHoop'], 'Tapping a hung patch opens the embroidery card');
    // 她来绣：挑当季还没绣过的那款 + 最搭的绣线，一口气绣满挂墙（今天第 2 次奖励）
    await page.click('#btn-embroidery-helper');
    await page.waitForTimeout(220);
    st = await getState(page);
    assert.deepEqual(
      [st.embroideryRun.lastResult.patternId, st.embroideryRun.lastResult.threadId, st.embroideryRun.lastResult.isNew, st.embroideryRun.lastResult.reward],
      [patB, PATTERNS[patB].best, true, { coins: 22, xp: 6 }],
      `Helper stitches the other in-season pattern: ${JSON.stringify(st.embroideryRun.lastResult)}`
    );
    assert.deepEqual([st.embroideryStats.collected, st.embroideryHoop.wall[0].patternId, st.embroideryHoop.wall.length], [2, patB, 2]);
    // 今天第 3 幅：照样挂墙，但不再给金币
    const third = await dbg(page, 'embroideryHelper');
    assert.deepEqual([third.ok, third.reward], [true, null], 'Third piece of the day: no more coins (2 per day)');
    assert.equal((await getState(page)).embroideryStats.rewardsToday, 2);
    // 墙上最多挂最近 4 幅
    await dbg(page, 'embroideryHelper');
    await dbg(page, 'embroideryHelper');
    st = await getState(page);
    assert.deepEqual([st.embroideryHoop.wall.length, st.embroideryHoop.totalPieces], [4, 5], 'The wall keeps the 4 newest pieces');
    // 换季：三个月后当季两款换了；绣过的旧季绣样随时能再绣，没绣过的仍然锁着
    const nextSeasonDay = new Date(tonight.getFullYear(), tonight.getMonth() + 3, 15, 21, 0, 0, 0);
    const season2 = seasonOf(nextSeasonDay);
    await dbg(page, 'setClock', nextSeasonDay.getTime());
    await page.waitForTimeout(120);
    eDom = await page.evaluate(() => Array.from(document.querySelectorAll('#eb-pattern-row .eb-pattern-chip')).map((c) => c.dataset.patternId));
    assert.deepEqual(eDom, seasonPatternsOf(season2), `Next season's chips: ${JSON.stringify(eDom)}`);
    const pickOld = await dbg(page, 'pickPattern', patA);
    assert.deepEqual([pickOld.ok, pickOld.owned, pickOld.inSeason], [true, true, false], 'A pattern from another season can be stitched again');
    const lockedPat = PATTERN_ORDER.find((id) => PATTERNS[id].season !== season && PATTERNS[id].season !== season2);
    const pickLocked = await dbg(page, 'pickPattern', lockedPat);
    assert.deepEqual([pickLocked.ok, pickLocked.reason], [false, 'out_of_season']);
    await dbg(page, 'resetEmbroideryForTest');
    await dbg(page, 'setClock', tonight.getTime());
    await closeAll(page);

    // 5. 地板小暖炉：火力只由本地月份 + 时段决定（独立复算 12 个月 × 4 个时段）
    for (let mo = 0; mo < 12; mo++) {
      for (const h of [6, 12, 18, 22, 3]) {
        const d = new Date(tonight.getFullYear(), mo, 12, h, 20, 0, 0);
        const got = await dbg(page, 'getHearthFor', d.getTime());
        assert.deepEqual([got.level, got.segId], [levelOf(d), SEG_IDS[segIdxOf(d)]], `Heater level for ${d.toString()}`);
      }
    }
    // 真实点按：（暖季先一起生个小火）挑口味 → 点暖炉翻面 → 分着吃 → 围炉依偎
    await dbg(page, 'openHearth');
    await page.waitForTimeout(160);
    let hDom = await page.evaluate(() => ({
      chips: Array.from(document.querySelectorAll('#hc-snack-row .hc-snack-chip')).map((c) => c.dataset.snackId),
      codex: document.querySelectorAll('#hc-codex-grid .hc-codex-chip').length,
      level: document.getElementById('hc-heat-row').dataset.level,
      main: document.getElementById('btn-hearth-main').textContent,
      mainDisabled: document.getElementById('btn-hearth-main').disabled,
      imgs: Array.from(document.querySelectorAll('#hearth-card img')).every((im) => im.complete && im.naturalWidth > 0)
    }));
    assert.deepEqual([hDom.chips, hDom.codex, hDom.level, hDom.imgs], [SNACKS, 4, String(nightLv), true], `Fresh hearth card: ${JSON.stringify(hDom)}`);
    if (nightLv === 0) {
      assert.deepEqual([hDom.main, hDom.mainDisabled], ['一起生个小火', false], 'Warm season: the heater rests, one tap kindles a small fire');
      await page.click('#btn-hearth-main');
      await page.waitForTimeout(160);
      st = await getState(page);
      assert.deepEqual([st.hearthStats.state.level, st.hearthStats.state.kindled, st.ar16Audio.hearthKindleCount >= 1], [1, true, true], 'Kindled a small fire');
    } else {
      assert.deepEqual([hDom.main, hDom.mainDisabled], ['先挑口味', true], `Lit heater waits for a flavor: ${JSON.stringify(hDom)}`);
    }
    const need = LEVELS[roastLv].flips;
    await page.click('#hc-snack-row [data-snack-id="berry"]');
    await page.waitForTimeout(100);
    assert.equal(await page.locator('#btn-hearth-main').textContent(), `翻面 0/${need}`);
    for (let i = 0; i < need - 1; i++) {
      await page.click('#hc-stove');
      await page.waitForTimeout(90);
    }
    st = await getState(page);
    assert.deepEqual([st.snackRun.flips, st.hearthStats.roasting, st.hearthVisual.roasting], [need - 1, true, true], `Roasting on the heater: ${JSON.stringify(st.snackRun)}`);
    assert.equal(await page.locator('#sh-pill-hearth').textContent(), '烤松饼', 'The pill shows the snack on the heater');
    await shot(page, 'desktop_1440x900_hearth_roast.png');
    await page.click('#btn-hearth-main');
    await page.waitForTimeout(100);
    assert.equal(await page.locator('#btn-hearth-main').textContent(), '分着吃');
    st = await getState(page);
    assert(st.ar16Audio.snackFlipCount >= need, `Every flip sizzles: ${JSON.stringify(st.ar16Audio)}`);
    const coinsBeforeSnack = st.coins;
    const mOff = await dbg(page, 'getAffectionMults');
    await page.click('#btn-hearth-main');
    await page.waitForTimeout(260);
    st = await getState(page);
    const resS = st.snackRun.lastResult;
    assert.deepEqual([resS.entryKey, resS.isNew, resS.level], [`berry_${LEVELS[roastLv].id}`, true, roastLv], `Shared snack: ${JSON.stringify(resS)}`);
    assert.deepEqual(resS.reward, { coins: 14, xp: 4 + 2 * roastLv }, `New codex entry: 6 + 8 coins, 4 + 2 x level affection: ${JSON.stringify(resS.reward)}`);
    assert(st.coins >= coinsBeforeSnack + 14, 'Snack coins arrive');
    assert.deepEqual([st.hearthCorner.cuddle.endMs - st.hearthCorner.cuddle.startMs, st.hearthCorner.cuddle.level], [20 * 60000, roastLv], 'A 20-minute cuddle at this fire level');
    assert.equal(st.cuddleMult, Number((1 + LEVELS[roastLv].bonus).toFixed(2)), `Winter cuddle bonus: ${st.cuddleMult}`);
    assert.deepEqual([st.overlays.hearth.shown, st.overlays.hearth.cuddle], [true, '1'], `Hearth layer warms up while cuddling: ${JSON.stringify(st.overlays)}`);
    assert.equal(st.journalSummary.snacks7d, 1, 'Weekly journal counts the snack');
    assert(st.ar16Audio.snackShareCount >= 1, 'Sharing chimes');
    assert(st.emote.includes('依偎'), `She cuddles up: ${st.emote}`);
    hDom = await page.evaluate(() => ({
      main: document.getElementById('btn-hearth-main').textContent,
      pill: !document.getElementById('stitch-hearth-pill').classList.contains('hidden'),
      cuddleCls: document.getElementById('stitch-hearth-pill').classList.contains('has-cuddle'),
      pillTag: document.getElementById('sh-pill-hearth').textContent,
      found: document.querySelectorAll('#hc-codex-grid .hc-codex-chip.is-found').length
    }));
    assert.deepEqual([hDom.main, hDom.pill, hDom.cuddleCls, hDom.pillTag, hDom.found], ['再烤一块', true, true, '依偎20分', 1], `Cuddle DOM: ${JSON.stringify(hDom)}`);
    const mOn = await dbg(page, 'getAffectionMults');
    assert(Math.abs(mOn.total / mOff.total - (1 + LEVELS[roastLv].bonus)) < 1e-3, `+${LEVELS[roastLv].bonus * 100}% affection while cuddling: ${mOn.total} vs ${mOff.total}`);
    let ov = await overlayColorAudit(page);
    assert(ov.hearth.visible && ov.hearth.pointer === 'none' && ov.canvasStillTappable, `Hearth layer must be visible but click-through: ${JSON.stringify(ov.hearth)}`);
    assert(ov.hearth.z < ov.hudZ, 'Hearth layer stays under the HUD');
    assertCream(ov.hearth.cols, 'Hearth glow');
    await page.waitForTimeout(400);
    await shot(page, 'desktop_1440x900_hearth_cuddle.png');
    // 可注入时钟：依偎 20 分钟后结束，加成跟着消失
    await dbg(page, 'advanceClock', 21 * 60000);
    st = await getState(page);
    assert.deepEqual([st.hearthCorner.cuddle, st.cuddleMult, st.overlays.hearth.cuddle], [null, 1, '0'], 'The cuddle ends after 20 minutes');
    assert(st.emote.includes('依偎的时间到'), `She notices the cuddle ending: ${st.emote}`);
    // 她来烤：这档火力下还没收录的口味，翻好面直接分着吃（今天第 2、3 次奖励，第 4 块不再给金币）
    await page.click('#btn-hearth-helper');
    await page.waitForTimeout(220);
    st = await getState(page);
    assert(st.snackRun.lastResult.isNew && st.snackRun.lastResult.reward && st.snackRun.lastResult.snackId !== 'berry', `Helper roasts a fresh flavor: ${JSON.stringify(st.snackRun.lastResult)}`);
    assert(st.hearthCorner.cuddle, 'Sharing again restarts the cuddle');
    const h3 = await dbg(page, 'hearthHelper');
    assert(h3.ok && h3.reward, 'Third snack of the day still rewards');
    const h4 = await dbg(page, 'hearthHelper');
    assert.deepEqual([h4.ok, h4.reward], [true, null], 'Fourth snack of the day: no more coins (3 per day)');
    st = await getState(page);
    assert.deepEqual([st.hearthStats.rewardsToday, st.hearthStats.entries, st.hearthCorner.totalSnacks], [3, 4, 4]);
    // 跨时段：初冬午后小火 → 16:00 换成傍晚暖火（她会说一声）
    await dbg(page, 'resetHearthForTest');
    await dbg(page, 'setClock', new Date(tonight.getFullYear(), 10, 18, 15, 58).getTime());
    st = await getState(page);
    assert.deepEqual([st.hearthStats.state.level, st.hearthStats.state.monthTag], [1, '初冬'], 'Early-winter afternoon: low fire');
    await dbg(page, 'advanceClock', 3 * 60000);
    st = await getState(page);
    assert.equal(st.hearthStats.state.level, 2, 'Crossing 16:00 turns it up to a warm fire');
    assert(st.emote.includes('暖火'), `She notices the warmer fire: ${st.emote}`);
    // 暖季白天：暖炉休息（不亮、没有暖光层）；一起生个 20 分钟小火，她来烤照样能烤；小火熄了暖光层收起
    await dbg(page, 'setClock', new Date(tonight.getFullYear(), 6, 10, 14, 0).getTime());
    await dbg(page, 'openHearth');
    await page.waitForTimeout(160);
    st = await getState(page);
    assert.deepEqual([st.hearthStats.state.level, st.overlays.hearth.shown], [0, false], 'Summer afternoon: the heater rests');
    hDom = await page.evaluate(() => ({
      main: document.getElementById('btn-hearth-main').textContent,
      helper: document.getElementById('btn-hearth-helper').textContent,
      level: document.getElementById('hc-heat-row').dataset.level
    }));
    assert.deepEqual([hDom.main, hDom.helper, hDom.level], ['一起生个小火', '她来生火', '0'], `Resting heater DOM: ${JSON.stringify(hDom)}`);
    await shot(page, 'desktop_1440x900_hearth_rest.png');
    await page.click('#btn-hearth-main');
    await page.waitForTimeout(160);
    st = await getState(page);
    assert.deepEqual([st.hearthStats.state.level, st.hearthStats.state.kindled, st.overlays.hearth.shown], [1, true, true], 'Kindled: a small fire for 20 minutes');
    assert(st.hearthCorner.kindle.endMs - st.hearthCorner.kindle.startMs === 20 * 60000);
    assert(await page.evaluate(() => document.getElementById('hc-heat-name').textContent.includes('一起生的')), 'The heat row says we lit it ourselves');
    const summerSnack = await dbg(page, 'hearthHelper');
    assert.deepEqual([summerSnack.ok, summerSnack.levelId], [true, 'low'], `Summer snack on the small fire: ${JSON.stringify(summerSnack)}`);
    await dbg(page, 'advanceClock', 21 * 60000);
    st = await getState(page);
    assert.deepEqual([st.hearthStats.state.level, st.hearthCorner.kindle, st.overlays.hearth.shown], [0, null, false], 'The small fire burns out after 20 minutes');
    await closeAll(page);
    // 切到打工：暖光层收起、依偎加成只在日常养成生效；回来恢复
    await dbg(page, 'setClock', tonight.getTime());
    if (nightLv === 0) await dbg(page, 'kindle');
    await dbg(page, 'hearthHelper');
    await page.click('.mode-btn[data-mode="survivor"]');
    await page.waitForTimeout(240);
    st = await getState(page);
    assert.deepEqual([st.overlays.hearth.shown, st.cuddleMult], [false, 1], 'No hearth layer / cuddle buff in the survivor shift');
    assert(await page.evaluate(() => document.getElementById('stitch-hearth-pill').classList.contains('hidden')), 'Pill hides outside the room');
    await page.click('.mode-btn[data-mode="pet"]');
    await page.waitForTimeout(240);
    st = await getState(page);
    assert.deepEqual([st.overlays.hearth.shown, st.cuddleMult > 1], [true, true], 'Back in the room: hearth layer and cuddle come back');

    // 6. 叠加：香氛色温 + 星空星光 + 窗边雨幕 + 暖炉暖光 四层同时开，仍然全是奶油色调（零深色 / 零霓虹），都不拦截点击
    await page.evaluate((t) => window.__AR15_DEBUG__.setClock(t), tonight.getTime());
    await page.evaluate(() => {
      window.__AR14_DEBUG__.pickMood('goodnight');
      for (let i = 0; i < 3; i++) window.__AR14_DEBUG__.drop();
      return window.__AR14_DEBUG__.light();
    });
    await page.evaluate(() => window.__AR15_DEBUG__.starHelper());
    await page.evaluate(() => window.__AR15_DEBUG__.startRain());
    await dbg(page, 'pickPattern', patA);
    await dbg(page, 'stitch');
    await closeAll(page);
    await dbg(page, 'placePlayerForTest', 0.78);
    await page.waitForTimeout(600);
    ov = await overlayColorAudit(page);
    assert(ov.hearth.visible && ov.star.visible && ov.rain.visible && ov.aroma.visible, `All four room layers on: ${JSON.stringify(ov)}`);
    assert(ov.canvasStillTappable, 'Four stacked layers are still click-through');
    for (const k of ['hearth', 'star', 'rain', 'aroma']) {
      assert.equal(ov[k].pointer, 'none', `${k} layer must not block taps`);
      assert(ov[k].z < ov.hudZ, `${k} layer stays under the HUD`);
    }
    assertCream(ov.hearth.cols, 'Hearth glow over aroma / star / rain');
    assertCream(ov.starGlow.cols, 'Star glow over hearth');
    assertCream(ov.rain.cols, 'Rain layer over hearth');
    assertCream(ov.aroma.cols, 'Aroma tint under hearth');
    // 四层叠起来的最暗处仍然是奶油色：把四层渐变色按 alpha 依次叠到奶油底 #FFFDF8 上
    let mix = [255, 253, 248];
    for (const [r, g, b, a = 1] of [...ov.aroma.cols, ...ov.starGlow.cols, ...ov.rain.cols, ...ov.hearth.cols]) {
      mix = [mix[0] * (1 - a) + r * a, mix[1] * (1 - a) + g * a, mix[2] * (1 - a) + b * a];
    }
    assert(Math.min(...mix) >= 200, `Stacked layers stay cream: ${mix.map((v) => Math.round(v))}`);
    let pDom = await page.evaluate(() => ({
      pill: !document.getElementById('stitch-hearth-pill').classList.contains('hidden'),
      both: !document.getElementById('sh-seg-hearth').classList.contains('hidden') && !document.getElementById('sh-seg-stitch').classList.contains('hidden')
    }));
    assert.deepEqual([pDom.pill, pDom.both], [true, true], 'Wide screen: the merged pill shows both segments');
    await page.waitForTimeout(300);
    await shot(page, 'desktop_1440x900_layers_stack.png');
    scene = await sceneAudit(page);
    assert(scene.inStage && scene.onWall && scene.onFloor && scene.clashes.length === 0, `1440x900 scene while lit: ${JSON.stringify(scene)}`);
    await shot(page, 'desktop_1440x900_scene_wall_floor.png');
    // 合并胶囊：点暖炉段打开暖炉卡，点刺绣段打开刺绣卡
    await page.click('#sh-seg-hearth');
    await page.waitForTimeout(160);
    assert.deepEqual(await openPanelNames(page), ['hearthCorner'], 'Pill hearth segment opens the hearth card');
    await page.click('#sh-seg-stitch');
    await page.waitForTimeout(160);
    assert.deepEqual(await openPanelNames(page), ['embroideryHoop'], 'Pill stitch segment opens the embroidery card');
    await closeAll(page);
    await page.evaluate(() => {
      window.__AR15_DEBUG__.stopRain();
      window.__AR15_DEBUG__.stopProjection();
    });

    // 7. 七日心情周报 + 手写日记联动（绣品挂墙当天多一枚刺绣布贴）
    await page.click('#btn-weekly-journal');
    await page.waitForTimeout(260);
    const journal = await page.evaluate(() => ({
      summary: window.__AR16_DEBUG__.getState().journalSummary,
      cardText: document.getElementById('weekly-journal-card')?.textContent || ''
    }));
    assert(journal.summary.embroideries7d >= 5, `7-day embroideries: ${journal.summary.embroideries7d}`);
    assert(journal.summary.snacks7d >= 5, `7-day snacks: ${journal.summary.snacks7d}`);
    assert.equal(journal.summary.cumulative.embroideryPatterns, 2, 'Both in-season patterns are collected');
    assert(
      journal.cardText.includes(`刺绣 ${journal.summary.embroideries7d}幅`) &&
        journal.cardText.includes(`炉边点心 ${journal.summary.snacks7d}份`) &&
        journal.cardText.includes('周末野餐与日记') &&
        journal.cardText.includes('星夜观星与伴眠') &&
        journal.cardText.includes('陶艺香氛与手作篮'),
      `Weekly journal card must render the embroidery / hearth metrics (and keep the AR-13 ~ AR-15 metrics), got ${journal.cardText}`
    );
    assert(journal.cardText.includes('小刺绣') && journal.cardText.includes('松饼'), 'Companion quote mentions the embroidery and the hearth snacks');
    await page.waitForTimeout(200);
    await shot(page, 'desktop_1440x900_journal.png');
    await page.click('#btn-diary-book');
    await page.waitForTimeout(260);
    const diary = await page.evaluate(() => ({
      lines: Array.from(document.querySelectorAll('#dy-page-lines .dy-line')).map((li) => li.textContent.trim()),
      icons: Array.from(document.querySelectorAll('#dy-page-lines .dy-line-ico')).every((im) => im.naturalWidth > 0),
      chips: Array.from(document.querySelectorAll('#dy-sticker-row .dy-sticker-chip')).map((c) => c.dataset.stickerId),
      chipImg: (() => {
        const im = document.querySelector('#dy-sticker-row [data-sticker-id="embroidery"] img');
        return Boolean(im && im.naturalWidth > 0);
      })()
    }));
    assert(diary.lines.some((l) => l.includes('刺绣') && l.includes('挂上墙')), `Diary mentions today's embroidery on the wall: ${JSON.stringify(diary.lines)}`);
    assert(diary.lines.some((l) => l.includes('松饼')), `Diary mentions today's hearth snacks: ${JSON.stringify(diary.lines)}`);
    assert(diary.icons, 'Diary line icons (patch / snack) load');
    assert(diary.chips[0] === 'embroidery' && diary.chipImg, `The day's embroidery becomes a memory sticker: ${JSON.stringify(diary.chips)}`);
    await page.click('#dy-sticker-row [data-sticker-id="embroidery"]');
    await page.waitForTimeout(200);
    const decor = await page.evaluate(([key, k]) => {
      const raw = JSON.parse(localStorage.getItem(key) || '{}');
      return (raw.diaryBook && raw.diaryBook.decor && raw.diaryBook.decor[k]) || [];
    }, [SAVE_KEY, todayKey]);
    assert(decor.includes('embroidery'), `The embroidery sticker is pasted on today's page: ${JSON.stringify(decor)}`);
    await page.waitForTimeout(200);
    await shot(page, 'desktop_1440x900_diary.png');
    await page.click('#btn-diary-book');
    await page.waitForTimeout(160);

    // 8. 桌面 1440x900：25 键单排不变，两张卡不压船坞 / 顶部工具栏，内容不出内部滚动
    let dock = await dockAudit(page);
    assert(dock.count === CARE_BTN_COUNT && dock.rows === 1 && dock.overlap === 0 && dock.joyMargin >= MIN_DOCK_MARGIN && dock.jumpMargin >= MIN_DOCK_MARGIN, `1440x900 dock: ${JSON.stringify(dock)}`);
    for (const [cardId, fn] of [
      ['embroidery-card', 'openEmbroidery'],
      ['hearth-card', 'openHearth']
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

    // 9. 中等桌面：1280x720 单排、1024x768 两排；抽屉入口 / 墙面绷架 / 地板暖炉照样点得到，卡片不压船坞，物件不压 HUD / 场景
    for (const [w, h, rowsExpected] of [
      [1280, 720, 1],
      [1024, 768, 2]
    ]) {
      await page.setViewportSize({ width: w, height: h });
      await page.waitForTimeout(350);
      dock = await dockAudit(page);
      assert(dock.count === CARE_BTN_COUNT && dock.overlap === 0 && dock.rows === rowsExpected && dock.joyMargin >= MIN_DOCK_MARGIN && dock.jumpMargin >= MIN_DOCK_MARGIN, `${w}x${h} dock: ${JSON.stringify(dock)}`);
      scene = await sceneAudit(page);
      assert(scene.inStage && scene.onWall && scene.onFloor && scene.clashes.length === 0, `${w}x${h} wall / floor objects: ${JSON.stringify(scene)}`);
      await page.click('#btn-shop');
      await page.waitForTimeout(220);
      await page.evaluate(() => document.querySelector('[data-ar16-shortcut="hearth"]').scrollIntoView({ block: 'nearest' }));
      await page.click('[data-ar16-shortcut="hearth"]');
      await page.waitForTimeout(180);
      assert.deepEqual(await openPanelNames(page), ['hearthCorner'], `${w}x${h}: drawer hearth shortcut is reachable`);
      await closeAll(page);
      await dbg(page, 'placePlayerForTest', 0.78);
      L = await dbg(page, 'getLayouts');
      P = scenePoints(L);
      await tapStage(page, P.hoop, `${w}x${h} hoop`);
      assert.deepEqual(await openPanelNames(page), ['embroideryHoop'], `${w}x${h}: wall hoop is reachable`);
      await closeAll(page);
      await dbg(page, 'placePlayerForTest', 0.78);
      await tapStage(page, P.heater, `${w}x${h} heater`);
      assert.deepEqual(await openPanelNames(page), ['hearthCorner'], `${w}x${h}: floor heater is reachable`);
      await closeAll(page);
      await dbg(page, 'placePlayerForTest', 0.78);
      await tapStage(page, P.patch, `${w}x${h} patch`);
      assert.deepEqual(await openPanelNames(page), ['embroideryHoop'], `${w}x${h}: wall patches are reachable`);
      for (const [cardId, fn] of [
        ['embroidery-card', 'openEmbroidery'],
        ['hearth-card', 'openHearth']
      ]) {
        await dbg(page, fn);
        await page.waitForTimeout(160);
        const a = await cardAudit(page, cardId);
        const hOverlap = Math.min(a.cardRight, a.careRight) - Math.max(a.cardLeft, a.careLeft) > 0;
        assert(a.cardOpen && a.overflowX <= 0 && a.overflowY <= 0 && a.outside === 0 && !a.hasEmoji, `${w}x${h} ${cardId}: ${JSON.stringify(a)}`);
        assert(!hOverlap || a.cardBottom <= a.careTop + 1, `${cardId} overlaps the dock on ${w}x${h}: ${JSON.stringify(a)}`);
        assert(a.cardTop >= a.hudRightBottom - 1, `${cardId} overlaps the toolbar on ${w}x${h}: ${JSON.stringify(a)}`);
        await page.waitForTimeout(220);
        await shot(page, `desktop_${w}x${h}_${cardId === 'embroidery-card' ? 'embroidery' : 'hearth'}.png`);
      }
      await closeAll(page);
      await dbg(page, 'placePlayerForTest', 0.78);
      await page.waitForTimeout(400);
      await shot(page, `desktop_${w}x${h}_scene.png`);
    }

    // 10. 移动端 390x844（竖屏强制横置，真实点按）：抽屉入口 → 挑绣样绣满挂墙；地板暖炉 → 挑口味翻面分着吃
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(400);
    const portraitDock = await dockAudit(page);
    assert.equal(portraitDock.rotated, true, '390x844 uses the rotated landscape stage');
    assert(portraitDock.count === CARE_BTN_COUNT && portraitDock.rows === 2 && portraitDock.overlap === 0, `390x844 dock: ${JSON.stringify(portraitDock)}`);
    assert(portraitDock.joyMargin >= MIN_DOCK_MARGIN && portraitDock.jumpMargin >= MIN_DOCK_MARGIN && portraitDock.minKey >= 30, `390x844 dock margins: ${JSON.stringify(portraitDock)}`);
    scene = await sceneAudit(page);
    assert(scene.rotated && scene.inStage && scene.onWall && scene.onFloor && scene.clashes.length === 0, `390x844 wall / floor objects: ${JSON.stringify(scene)}`);
    await dbg(page, 'resetEmbroideryForTest');
    await dbg(page, 'resetHearthForTest');
    await page.click('#btn-shop');
    await page.waitForTimeout(260);
    await page.evaluate(() => document.querySelector('[data-ar16-shortcut="embroidery"]').scrollIntoView({ block: 'nearest' }));
    await page.click('[data-ar16-shortcut="embroidery"]');
    await page.waitForTimeout(220);
    assert.deepEqual(await openPanelNames(page), ['embroideryHoop'], 'Real tap on the rotated drawer shortcut opens the embroidery card');
    await page.click(`#eb-pattern-row [data-pattern-id="${patB}"]`);
    await page.waitForTimeout(80);
    await page.click(`#eb-thread-row [data-thread-id="cream"]`);
    await page.waitForTimeout(80);
    for (let i = 0; i < PATTERNS[patB].taps; i++) {
      await page.click('#eb-hoop');
      await page.waitForTimeout(80);
    }
    const wallBefore = (await getState(page)).embroideryHoop.totalPieces;
    await page.click('#btn-embroidery-main');
    await page.waitForTimeout(220);
    st = await getState(page);
    assert.deepEqual([st.embroideryHoop.totalPieces, st.embroideryHoop.wall[0].patternId, st.embroideryHoop.wall[0].threadId], [wallBefore + 1, patB, 'cream'], 'Real taps hang a piece on 390x844');
    let pa = await cardAudit(page, 'embroidery-card');
    assert(pa.cardOpen && pa.overflowX <= 0 && pa.overflowY <= 0 && pa.outside === 0 && !pa.hasEmoji, `390x844 embroidery card: ${JSON.stringify(pa)}`);
    await page.waitForTimeout(250);
    await shot(page, 'mobile_390x844_embroidery.png');
    await closeAll(page);
    await dbg(page, 'placePlayerForTest', 0.78);
    await page.waitForTimeout(200);
    L = await dbg(page, 'getLayouts');
    P = scenePoints(L);
    await tapStage(page, P.heater, '390x844 heater');
    assert.deepEqual(await openPanelNames(page), ['hearthCorner'], 'Real tap on the rotated floor heater opens the hearth card');
    if ((await getState(page)).hearthStats.state.level < 1) {
      await page.click('#btn-hearth-main');
      await page.waitForTimeout(120);
    }
    const lvM = (await getState(page)).hearthStats.state.level;
    await page.click('#hc-snack-row [data-snack-id="maple"]');
    await page.waitForTimeout(80);
    for (let i = 0; i < LEVELS[lvM].flips; i++) {
      await page.click('#hc-stove');
      await page.waitForTimeout(80);
    }
    await page.click('#btn-hearth-main');
    await page.waitForTimeout(220);
    st = await getState(page);
    assert.deepEqual([st.snackRun.lastResult && st.snackRun.lastResult.snackId, Boolean(st.hearthCorner.cuddle)], ['maple', true], 'Real taps share a snack on 390x844');
    pa = await cardAudit(page, 'hearth-card');
    assert(pa.cardOpen && pa.overflowX <= 0 && pa.overflowY <= 0 && pa.outside === 0 && !pa.hasEmoji, `390x844 hearth card: ${JSON.stringify(pa)}`);
    await page.waitForTimeout(250);
    await shot(page, 'mobile_390x844_hearth.png');
    await closeAll(page);
    await dbg(page, 'placePlayerForTest', 0.78);
    L = await dbg(page, 'getLayouts');
    P = scenePoints(L);
    await tapStage(page, P.hoop, '390x844 hoop');
    assert.deepEqual(await openPanelNames(page), ['embroideryHoop'], 'Real tap on the rotated wall hoop opens the embroidery card');
    await closeAll(page);
    await dbg(page, 'placePlayerForTest', 0.78);
    await page.waitForTimeout(500);
    await shot(page, 'mobile_390x844_scene.png');

    // 11. 844x390 横屏：两排船坞 / 两张卡片 / 顶部 HUD / 胶囊行 零重叠，卡片内容无内部滚动；地板暖炉不压摇杆（桌面下方 ~10px 就是摇杆）
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(400);
    const landDock = await dockAudit(page);
    assert(landDock.count === CARE_BTN_COUNT && landDock.rows === 2 && landDock.overlap === 0 && landDock.joyMargin >= MIN_DOCK_MARGIN && landDock.jumpMargin >= MIN_DOCK_MARGIN, `844x390 dock: ${JSON.stringify(landDock)}`);
    scene = await sceneAudit(page);
    assert(scene.inStage && scene.onWall && scene.onFloor && scene.clashes.length === 0, `844x390 wall / floor objects: ${JSON.stringify(scene)}`);
    assert(scene.compact && scene.size >= 30, `844x390: compact 30px+ heater without a scene label: ${JSON.stringify(scene)}`);
    // 地板暖炉与摇杆 / 船坞 / 动作键的实际视口间距
    const floorGap = await page.evaluate(() => {
      const L = window.__AR16_DEBUG__.getLayouts();
      const F = L.floor;
      const r = { left: F.hit.x, right: F.hit.x + F.hit.w, top: F.hit.y, bottom: F.hit.y + F.hit.h };
      let gap = Infinity;
      for (const el of [document.getElementById('joystick-zone'), document.getElementById('pet-care-bar'), document.querySelector('.action-zone')]) {
        const b = el.getBoundingClientRect();
        const dx = Math.max(0, b.left - r.right, r.left - b.right);
        const dy = Math.max(0, b.top - r.bottom, r.top - b.bottom);
        gap = Math.min(gap, Math.hypot(dx, dy));
      }
      return gap;
    });
    assert(floorGap >= 2, `844x390: the floor heater keeps clear of the joystick / dock / jump keys, gap ${floorGap}`);
    for (const [cardId, fn, shotName] of [
      ['embroidery-card', 'openEmbroidery', 'mobile_844x390_embroidery.png'],
      ['hearth-card', 'openHearth', 'mobile_844x390_hearth.png']
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
    await dbg(page, 'placePlayerForTest', 0.78);
    L = await dbg(page, 'getLayouts');
    P = scenePoints(L);
    await tapStage(page, P.heater, '844x390 heater');
    assert.deepEqual(await openPanelNames(page), ['hearthCorner'], '844x390: the floor heater is reachable');
    await closeAll(page);
    await dbg(page, 'placePlayerForTest', 0.78);
    await tapStage(page, P.patch, '844x390 patch');
    assert.deepEqual(await openPanelNames(page), ['embroideryHoop'], '844x390: the wall patches are reachable');
    await closeAll(page);
    // 窄屏胶囊：AR-11 ~ AR-16 六颗合并胶囊放得下才显示（与已有胶囊同一行），绝不新开一行
    await dbg(page, 'pickPattern', patA);
    await dbg(page, 'stitch');
    await page.waitForTimeout(800);
    const pillRowAudit = await page.evaluate(() => {
      const visible = (b) => !b.classList.contains('hidden') && b.offsetParent !== null;
      const ids = ['kitchen-memory-pill', 'sill-card-pill', 'picnic-diary-pill', 'pottery-aroma-pill', 'star-rain-pill', 'stitch-hearth-pill'];
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
      ['kitchen-memory-pill', 'sill-card-pill', 'picnic-diary-pill', 'pottery-aroma-pill', 'star-rain-pill', 'stitch-hearth-pill'].every((id) => pillRowAudit[id].sharesRow) &&
        pillRowAudit.withPills === pillRowAudit.withoutPills,
      `AR-11 ~ AR-16 pills must not add a HUD pill row on 844x390: ${JSON.stringify(pillRowAudit)}`
    );
    await page.waitForTimeout(400);
    await shot(page, 'mobile_844x390_scene.png');
    // 极端情况：胶囊行塞满时，AR-16 胶囊先只留优先段，仍放不下就自动收起而不是换行
    const crowded = await page.evaluate(async () => {
      const ids = ['pomodoro-mini-pill', 'teatime-buff-pill', 'terrarium-blessing-pill', 'musicbox-mini-pill', 'collage-blessing-pill'];
      const prev = ids.map((id) => document.getElementById(id)?.classList.contains('hidden'));
      ids.forEach((id) => document.getElementById(id)?.classList.remove('hidden'));
      await new Promise((r) => setTimeout(r, 900));
      const pill = document.getElementById('stitch-hearth-pill');
      const visible = (b) => !b.classList.contains('hidden') && b.offsetParent !== null;
      const others = Array.from(document.querySelectorAll('#hud-ambience-row > button')).filter((b) => b !== pill && visible(b));
      const res = {
        shown: visible(pill),
        folded: pill.classList.contains('sh-no-room') || pill.classList.contains('sh-solo'),
        sharesRow: visible(pill)
          ? others.some((b) => Math.abs(b.offsetTop + b.offsetHeight / 2 - (pill.offsetTop + pill.offsetHeight / 2)) <= 6)
          : true
      };
      ids.forEach((id, i) => {
        if (prev[i]) document.getElementById(id)?.classList.add('hidden');
      });
      return res;
    });
    assert(crowded.sharesRow, `With a crowded pill row the AR-16 pill must fold away instead of wrapping: ${JSON.stringify(crowded)}`);
    await page.waitForTimeout(700);
    await dbg(page, 'resetEmbroideryForTest');

    // 12. 旧存档 / 脏数据安全默认值
    await page.setViewportSize({ width: 1440, height: 900 });
    await dbg(page, 'useRealClock');
    await page.evaluate((key) => {
      const raw = JSON.parse(localStorage.getItem(key) || '{}');
      delete raw.embroideryHoop;
      delete raw.hearthCorner;
      if (raw.weeklyJournal && raw.weeklyJournal.cumulative) {
        delete raw.weeklyJournal.cumulative.totalEmbroideries;
        delete raw.weeklyJournal.cumulative.totalSnacks;
      }
      localStorage.setItem(key, JSON.stringify(raw));
    }, SAVE_KEY);
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(400);
    const legacy = await getState(page);
    assert.deepEqual([legacy.embroideryHoop.patterns, legacy.embroideryHoop.wall, legacy.embroideryHoop.totalPieces, legacy.embroideryHoop.lastThreadId], [{}, [], 0, 'cream'], 'Legacy save: empty embroidery');
    assert.deepEqual([legacy.hearthCorner.entries, legacy.hearthCorner.cuddle, legacy.hearthCorner.kindle, legacy.hearthCorner.totalSnacks], [{}, null, null, 0], 'Legacy save: empty hearth');
    assert.deepEqual([legacy.embroideryRun.phase, legacy.snackRun.phase, legacy.cuddleMult], ['pick', 'pick', 1], 'A reload never resumes stitching / roasting / cuddling by itself');
    assert(legacy.journalSummary.embroideries7d >= 5 && legacy.journalSummary.snacks7d >= 5, 'Journal history survives the legacy migration');
    assert.equal((await dbg(page, 'embroideryHelper')).ok, true, 'Legacy save: the hoop still works');
    assert.equal((await dbg(page, 'hearthHelper')).ok, true, 'Legacy save: the heater still works');

    await page.evaluate((key) => {
      const raw = JSON.parse(localStorage.getItem(key) || '{}');
      raw.embroideryHoop = {
        patterns: {
          sakura: { count: 3, first: '2026-03-01', lastThread: 'pink' },
          bogus: { count: 5 },
          daisy: { count: 'lots' },
          whale: { count: -2 },
          lemon: 'yes',
          ginkgo: { count: 2, first: 'never', lastThread: 'neon' }
        },
        wall: [
          { patternId: 'maple', threadId: 'sage', date: '2026-11-01' },
          { patternId: 'bogus' },
          'x',
          { patternId: 'sakura', threadId: 'gold', date: 'nope' },
          { patternId: 'whale', threadId: 'mist' },
          { patternId: 'lemon' },
          { patternId: 'mitten', threadId: 'pink' }
        ],
        rewardDate: 'x',
        rewardCount: 50,
        totalPieces: -3,
        lastPatternId: 'bogus',
        lastThreadId: 'neon'
      };
      raw.hearthCorner = {
        entries: { honey_low: 2, honey_hot: 5, berry_blaze: 'x', maple_warm: 3, cinnamon_low: -1, bogus_low: 4 },
        rewardDate: '2026-11-18',
        rewardCount: 77,
        totalSnacks: 1,
        totalCuddles: 'lots',
        totalKindles: -2,
        cuddle: { startMs: 1000, endMs: 1000 + 90 * 60000, level: 3 },
        kindle: { startMs: 5, endMs: 4 },
        lastSnackId: 'pizza',
        lastLevelId: 'nuclear'
      };
      if (raw.weeklyJournal && raw.weeklyJournal.days) {
        const first = Object.keys(raw.weeklyJournal.days)[0];
        if (first) Object.assign(raw.weeklyJournal.days[first], { embroideries: 'x', snacks: 1e9 });
      }
      localStorage.setItem(key, JSON.stringify(raw));
    }, SAVE_KEY);
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(400);
    let dirty = await getState(page);
    const de = dirty.embroideryHoop;
    assert.deepEqual(
      de.patterns,
      {
        sakura: { count: 3, first: '2026-03-01', lastThread: 'pink' },
        ginkgo: { count: 2, first: '', lastThread: 'cream' },
        maple: { count: 1, first: '2026-11-01', lastThread: 'sage' },
        whale: { count: 1, first: '', lastThread: 'mist' },
        lemon: { count: 1, first: '', lastThread: 'cream' }
      },
      `Patterns sanitized: ${JSON.stringify(de.patterns)}`
    );
    assert.deepEqual(
      de.wall,
      [
        { patternId: 'maple', threadId: 'sage', date: '2026-11-01' },
        { patternId: 'sakura', threadId: 'cream', date: '' },
        { patternId: 'whale', threadId: 'mist', date: '' },
        { patternId: 'lemon', threadId: 'cream', date: '' }
      ],
      `Wall sanitized (4 valid pieces max): ${JSON.stringify(de.wall)}`
    );
    assert.deepEqual([de.rewardDate, de.rewardCount, de.totalPieces, de.lastPatternId, de.lastThreadId], ['', 0, 8, '', 'cream']);
    const dh = dirty.hearthCorner;
    assert.deepEqual(dh.entries, { honey_low: 2, maple_warm: 3 }, `Entries sanitized: ${JSON.stringify(dh.entries)}`);
    assert.deepEqual(
      [dh.rewardDate, dh.rewardCount, dh.totalSnacks, dh.totalCuddles, dh.totalKindles, dh.cuddle, dh.kindle, dh.lastSnackId, dh.lastLevelId],
      ['2026-11-18', 3, 5, 5, 0, null, null, '', ''],
      `Hearth sanitized: ${JSON.stringify(dh)}`
    );
    assert.equal(dirty.journalSummary.daysList.length, 7, 'Journal still renders 7 days');
    // 存档里早已结束的依偎：载入后不加成、不暖光，并被静默清掉
    await page.evaluate((key) => {
      const raw = JSON.parse(localStorage.getItem(key) || '{}');
      const t = Date.now() - 2 * 3600000;
      raw.hearthCorner = { entries: {}, cuddle: { startMs: t, endMs: t + 20 * 60000, level: 2 }, kindle: { startMs: t, endMs: t + 20 * 60000 } };
      localStorage.setItem(key, JSON.stringify(raw));
    }, SAVE_KEY);
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(1500);
    dirty = await getState(page);
    assert.deepEqual([dirty.hearthCorner.cuddle, dirty.hearthCorner.kindle, dirty.cuddleMult, dirty.overlays.hearth.cuddle], [null, null, 1, '0'], 'An expired cuddle / small fire from the save stays off');
    // 脏数据下依旧可以正常打开两张卡并继续游玩
    await page.click('#btn-shop');
    await page.waitForTimeout(220);
    await page.evaluate(() => document.querySelector('[data-ar16-shortcut="embroidery"]').scrollIntoView({ block: 'nearest' }));
    await page.click('[data-ar16-shortcut="embroidery"]');
    await page.waitForTimeout(180);
    assert.deepEqual(await openPanelNames(page), ['embroideryHoop']);
    assert.equal((await dbg(page, 'embroideryHelper')).ok, true);
    await dbg(page, 'openHearth');
    await page.waitForTimeout(160);
    assert.deepEqual(await openPanelNames(page), ['hearthCorner']);
    const dirtySnack = await dbg(page, 'hearthHelper');
    assert.equal(dirtySnack.ok, true, `Roasting works after a dirty save: ${JSON.stringify(dirtySnack)}`);
    await page.waitForTimeout(300);
    await shot(page, 'desktop_1440x900_dirty_save.png');

    assert.equal(consoleErrors.length, 0, `Console errors observed: ${consoleErrors.join('; ')}`);
    assert.equal(pageErrors.length, 0, `Page errors observed: ${pageErrors.join('; ')}`);
    assert.equal(failedResponses.length, 0, `HTTP >= 400 responses observed: ${failedResponses.join('; ')}`);
    assert.equal(outbound.length, 0, `AR-16 must not reach the network: ${outbound.join('; ')}`);

    console.log(
      '[E2E PASS] AR-16 Wall Embroidery Hoop (8 seasonal patterns, 2 per local-date season, 4 cream threads, real taps: pick pattern + thread -> tap the hoop, you stitch one and she stitches the next -> hang it on the wall ribbon (4 newest pieces); 2 rewarded pieces per day, new pattern +10, best thread +4; diary memory sticker + diary line + weekly journal) + Floor Heater Winter Corner (offline heater level from local month x 4 time segments, warm season rests with a 20-minute kindle, 4 pancake flavors x 3 fire levels = 12-entry codex, flips 5/4/3, 3 rewarded snacks per day, 20-minute cuddle +4/6/8% affection in pet mode only) with entries via the 家具与装扮 drawer + wall hoop / patches + floor heater + merged pill (dock stays 25 keys, desk and sill untouched), cream hearth layer that stays cream and click-through on top of the aroma / star / rain layers, passed across 1440x900, 1280x720, 1024x768, 390x844 (rotated, real taps) and 844x390, mutually exclusive overlays, safe legacy/dirty-save defaults, 0 network requests and 0 errors!'
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
