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
const PORT = Number(process.env.AR10_PORT || 0);

// 可选：设置 AR10_SHOT_DIR 后输出 1440x900 / 390x844 / 844x390 自审截图
const SHOT_DIR = process.env.AR10_SHOT_DIR || '';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.json': 'application/json; charset=utf-8'
};

const REQUIRED_AR10_ASSETS = [
  'ui_btn_watercolor_easel.webp',
  'ui_btn_mailbox.webp',
  'watercolor_rainy_window.webp',
  'watercolor_palette.webp',
  'letter_envelope.webp',
  'stamp_whale.webp'
];

const CARE_BTN_COUNT = 19;
const SUBJECTS = ['rainy_window', 'potted_plant', 'whale_plush'];
const PALETTES = ['mist_blue', 'peach_cream', 'matcha_latte'];

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
  assert(/\.\/style\.css\?v=hd(?:2[5-9]|[3-9]\d)\b/.test(htmlContent), 'index.html must reference ./style.css?v=hd25+');
  assert(/\.\/game\.js\?v=hd(?:49|[5-9]\d)\b/.test(htmlContent), 'index.html must reference ./game.js?v=hd49+');
  for (const reqAsset of REQUIRED_AR10_ASSETS) {
    assert(
      new RegExp(`\\./assets/${reqAsset.replace('.', '\\.')}\\?v=hd(?:2[5-9]|[3-9]\\d)`).test(htmlContent),
      `index.html must reference ./assets/${reqAsset}?v=hd25+`
    );
  }

  const cssContent = fs.readFileSync(path.join(PUBLIC_DIR, 'style.css'), 'utf8');
  const spritesContent = fs.readFileSync(path.join(PUBLIC_DIR, 'sprites.js'), 'utf8');
  const gameContent = fs.readFileSync(path.join(PUBLIC_DIR, 'game.js'), 'utf8');
  for (const [name, content] of [
    ['index.html', htmlContent],
    ['style.css', cssContent],
    ['sprites.js', spritesContent],
    ['game.js', gameContent]
  ]) {
    assert(!/\?v=hd2[34]\b/.test(content), `Stale ?v=hd23/hd24 cache-buster left in public/${name}`);
  }
  assert(/\?v=hd(?:2[5-9]|[3-9]\d)\b/.test(cssContent), 'style.css must use ?v=hd25+ asset cache-busters');
  assert(/\?v=hd(?:2[5-9]|[3-9]\d)\b/.test(spritesContent), 'sprites.js must use ?v=hd25+ asset cache-busters');
  for (const fn of ['drawWatercolorWallGallery', 'drawWatercolorEaselProp', 'drawMailboxDeskProp', 'getWatercolorGalleryLayout']) {
    assert(new RegExp(`export function ${fn}`).test(spritesContent), `sprites.js must export ${fn}`);
  }
  assert(/\.\/sprites\.js\?v=hd(?:2[5-9]|[3-9]\d)\b/.test(gameContent), 'game.js must import ./sprites.js?v=hd25+');
  assert(/\.\/audio\.js\?v=hd(?:2[5-9]|[3-9]\d)\b/.test(gameContent), 'game.js must import ./audio.js?v=hd25+');
  assert(/\.\/vision\.js\?v=hd(?:2[5-9]|[3-9]\d)\b/.test(gameContent), 'game.js must import ./vision.js?v=hd25+');

  for (const reqAsset of REQUIRED_AR10_ASSETS) {
    assert(assetRefs.has(reqAsset), `Required AR-10 asset ${reqAsset} is not referenced in code`);
  }
  for (const asset of assetRefs) {
    const full = path.join(PUBLIC_DIR, 'assets', asset);
    assert(fs.existsSync(full), `Missing asset on disk: ${full}`);
    assert(fs.statSync(full).size > 0, `Empty asset on disk: ${full}`);
  }

  // AR-10 墙面画廊 / 画架 / 信箱只贴图（离屏调色滤镜 + 柔光渐变），不画任何矢量图形
  const ar10SpriteStart = spritesContent.indexOf('// AR-10 墙面水彩画廊');
  const ar10SpriteEnd = spritesContent.indexOf('export function roundRect');
  assert(ar10SpriteStart > 0 && ar10SpriteEnd > ar10SpriteStart, 'sprites.js must contain the AR-10 drawing section');
  const ar10Sprites = spritesContent.slice(ar10SpriteStart, ar10SpriteEnd);
  assert(
    !/beginPath|lineTo|\barc\(|arcTo|bezierCurveTo|quadraticCurveTo|strokeRect|roundRect\(|\.stroke\(\)|\.fill\(\)/.test(ar10Sprites),
    'AR-10 canvas drawing must only draw the provided webp art (no vector shapes)'
  );

  // 零暗黑赛博 / 霓虹：AR-10 样式段不得出现深色或霓虹色
  const ar10CssStart = cssContent.indexOf('AR-10 窗畔雨天水彩写生画架');
  assert(ar10CssStart > 0, 'style.css must contain the AR-10 section');
  const ar10Css = cssContent.slice(ar10CssStart);
  assert(
    !/neon|#0{3,6}\b|#000\b|#111|#1[0-9a-f]{5}\b|rgba?\(\s*(?:[0-5]?\d)\s*,\s*(?:[0-5]?\d)\s*,\s*(?:[0-9]?\d)\s*[,)]/i.test(ar10Css),
    'AR-10 CSS must not contain near-black / neon colors'
  );

  console.log(
    `[STATIC PASS] ${jsFiles.length} JS modules syntax-checked, ${assetRefs.size} assets verified on disk (including all 6 AR-10 images), ?v=hd25+/hd49+ synced with 0 stale hd23/hd24, 0 inline <svg>, 0 Emoji, 0 vector shapes in AR-10 canvas art, 0 dark/neon colors in AR-10 CSS.`
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

async function getAr10State(page) {
  return page.evaluate(() => window.__AR10_DEBUG__.getState());
}

async function openPanelNames(page) {
  const panels = (await getAr10State(page)).openPanels;
  return Object.entries(panels)
    .filter(([, isOpen]) => isOpen)
    .map(([k]) => k);
}

async function ensureWatercolorOpen(page) {
  if (!(await page.evaluate(() => !document.getElementById('watercolor-card').classList.contains('hidden')))) {
    await page.click('#btn-watercolor-easel');
    await page.waitForTimeout(140);
  }
}

// 按 UI 完整画一幅：选题材 -> 选调色盘 -> 调色起笔 -> 按序蘸两色 -> 晕染 4 笔 -> 落款挂画
async function paintViaUi(page, subjectId, paletteId) {
  await ensureWatercolorOpen(page);
  await page.click(`#watercolor-subject-grid [data-subject-id="${subjectId}"]`);
  await page.click(`#watercolor-palette-grid [data-palette-id="${paletteId}"]`);
  await page.waitForTimeout(40);
  await page.click('#btn-watercolor-main');
  await page.waitForTimeout(60);
  const specs = await page.evaluate(() => window.__AR10_DEBUG__.getSpecs());
  const subject = specs.subjects.find((s) => s.id === subjectId);
  for (const idx of subject.mixIdx) {
    await page.click(`#watercolor-well-row [data-well-idx="${idx}"]`);
    await page.waitForTimeout(40);
  }
  let run = await page.evaluate(() => window.__AR10_DEBUG__.getWatercolorRun());
  assert.equal(run.phase, 'brush', `Correct mixing must enter brush phase for ${subjectId}/${paletteId}`);
  for (let i = 0; i < 4; i++) {
    await page.click(`#watercolor-wash-layer [data-wash-idx="${i}"]`);
    await page.waitForTimeout(40);
  }
  run = await page.evaluate(() => window.__AR10_DEBUG__.getWatercolorRun());
  assert.equal(run.phase, 'finish', `Four washes must enter finish phase for ${subjectId}/${paletteId}`);
  await page.click('#btn-watercolor-main');
  await page.waitForTimeout(90);
  run = await page.evaluate(() => window.__AR10_DEBUG__.getWatercolorRun());
  assert.equal(run.phase, 'done', `Signing must finish the painting for ${subjectId}/${paletteId}`);
  return run.lastResult;
}

// 独立计算七日心情周报里出现最多的心情（同票取最近一天）
function dominantMood(daysList, fallback) {
  const counts = {};
  for (const d of daysList) if (d.stamped) counts[d.moodId] = (counts[d.moodId] || 0) + 1;
  const maxN = Math.max(0, ...Object.values(counts));
  if (maxN > 0) {
    for (let i = daysList.length - 1; i >= 0; i--) {
      if (daysList[i].stamped && counts[daysList[i].moodId] === maxN) return daysList[i].moodId;
    }
  }
  return fallback;
}

function expectedTier(level) {
  return level >= 8 ? 2 : level >= 4 ? 1 : 0;
}

async function replyViaUi(page, letterId, replyId, stampId) {
  await page.click(`#mailbox-envelope-row [data-letter-id="${letterId}"]`);
  await page.waitForTimeout(80);
  assert.equal(await page.evaluate(() => document.getElementById('btn-mailbox-send').disabled), true, 'Send must stay disabled before choosing a reply');
  await page.click(`#mailbox-reply-grid [data-reply-id="${replyId}"]`);
  await page.waitForTimeout(50);
  assert.equal(await page.evaluate(() => document.getElementById('btn-mailbox-send').disabled), true, 'Send must stay disabled before sticking a stamp');
  await page.click(`#mailbox-stamp-row [data-stamp-id="${stampId}"]`);
  await page.waitForTimeout(60);
  const stuck = await page.evaluate(() => {
    const img = document.getElementById('mailbox-letter-stamp');
    return { visible: !img.classList.contains('hidden'), src: img.getAttribute('src'), sendDisabled: document.getElementById('btn-mailbox-send').disabled };
  });
  assert(stuck.visible, 'Sticking a stamp must show it on the letter paper');
  assert.equal(stuck.sendDisabled, false, 'Send must enable once reply + stamp are chosen');
  await page.click('#btn-mailbox-send');
  await page.waitForTimeout(140);
  return page.evaluate(() => window.__AR10_DEBUG__.getMailboxRun().lastResult);
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
    await page.waitForTimeout(420);
    assert.equal(pageErrors.length, 0, `Page errors on load: ${pageErrors.join('; ')}`);
    assert.equal(consoleErrors.length, 0, `Console errors on load: ${consoleErrors.join('; ')}`);

    // 0. DOM Emoji / 奶油手账配色 / 6 张 AR-10 贴图加载审计
    const initialAudit = await page.evaluate(async (ar10Assets) => {
      const text = document.body.innerText || '';
      const brokenImgs = Array.from(document.querySelectorAll('img'))
        .filter((img) => {
          const src = img.getAttribute('src') || '';
          return src.startsWith('./assets/') && (!img.complete || img.naturalWidth === 0);
        })
        .map((img) => img.getAttribute('src'));
      const domAr10Imgs = Array.from(document.querySelectorAll('img')).filter((img) =>
        ar10Assets.some((a) => (img.getAttribute('src') || '').includes(a))
      );
      const loadReport = {};
      for (const file of ar10Assets) {
        const img = new Image();
        img.src = `./assets/${file}?v=hd25`;
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
        hasEmoji: /\p{Extended_Pictographic}/u.test(text),
        brokenImgs,
        domAr10ImgCount: domAr10Imgs.length,
        domAr10Loaded: domAr10Imgs.every((img) => img.complete && img.naturalWidth > 0),
        loadReport,
        watercolorBg: getComputedStyle(document.getElementById('watercolor-card')).backgroundImage,
        mailboxBg: getComputedStyle(document.getElementById('mailbox-card')).backgroundImage,
        letterBg: getComputedStyle(document.getElementById('mailbox-letter')).backgroundImage,
        paperBg: getComputedStyle(document.getElementById('watercolor-paper')).backgroundImage,
        careBtnCount: document.querySelectorAll('#pet-care-bar .care-btn').length,
        overflowX: document.documentElement.scrollWidth - window.innerWidth,
        overflowY: document.documentElement.scrollHeight - window.innerHeight
      };
    }, REQUIRED_AR10_ASSETS);

    assert.equal(initialAudit.hasEmoji, false, 'Visible DOM must contain zero Emoji characters');
    assert.equal(initialAudit.brokenImgs.length, 0, `Broken ./assets/ images: ${initialAudit.brokenImgs.join(', ')}`);
    assert(initialAudit.domAr10ImgCount >= 16, `Expected >= 16 AR-10 <img> in DOM, got ${initialAudit.domAr10ImgCount}`);
    assert.equal(initialAudit.domAr10Loaded, true, 'Every AR-10 <img> in DOM must load (naturalWidth > 0)');
    for (const [file, info] of Object.entries(initialAudit.loadReport)) {
      assert(info.w > 0 && info.h > 0, `AR-10 image ${file} must decode with naturalWidth > 0, got ${JSON.stringify(info)}`);
    }
    assert(initialAudit.careBtnCount >= CARE_BTN_COUNT, `Expected >= ${CARE_BTN_COUNT} dock buttons, got ${initialAudit.careBtnCount}`);
    assert(initialAudit.overflowX <= 0 && initialAudit.overflowY <= 0, `Desktop 1440x900 overflow: ${JSON.stringify(initialAudit)}`);
    assert(/255,\s*253,\s*248/.test(initialAudit.watercolorBg), `#watercolor-card must use cream #FFFDF8, got ${initialAudit.watercolorBg}`);
    assert(/255,\s*253,\s*248/.test(initialAudit.mailboxBg), `#mailbox-card must use cream #FFFDF8, got ${initialAudit.mailboxBg}`);
    // 信纸与画纸只用浅色（任一不透明颜色的最暗通道 >= 150）
    for (const [label, bg] of [
      ['#mailbox-letter', initialAudit.letterBg],
      ['#watercolor-paper', initialAudit.paperBg]
    ]) {
      const colors = Array.from(bg.matchAll(/rgba?\(([^)]+)\)/g)).map((m) => m[1].split(',').map((v) => Number(v.trim())));
      assert(colors.length >= 2, `Expected layered gradients on ${label}, got ${bg}`);
      for (const [r, g, b, a = 1] of colors) {
        if (a < 0.2) continue;
        assert(Math.min(r, g, b) >= 150, `${label} must stay cream/pastel, got rgb(${r},${g},${b})`);
      }
    }

    // 1. 新存档：空画廊 + 她投递的初见来信
    const fresh = await getAr10State(page);
    assert.deepEqual(fresh.watercolor.paintings, {}, 'Fresh save starts with an empty gallery');
    assert.equal(fresh.focusWard.active, false, 'Focus ward starts inactive');
    assert.equal(fresh.mailbox.letters.length, 1, 'Fresh save receives exactly one welcome letter');
    assert.equal(fresh.mailbox.letters[0].welcome, true, 'First letter is the welcome letter');
    assert.equal(fresh.mailbox.letters[0].opened, false, 'Welcome letter starts unopened');
    assert.equal(fresh.mailbox.welcomeSent, true, 'welcomeSent flag set after the welcome letter');
    assert.equal(fresh.mailboxVisual.unread, 1, 'Desk mailbox shows 1 waiting letter');
    assert(fresh.mailbox.nextLetterAt > Date.now(), 'Next letter is scheduled in the future');
    const freshDom = await page.evaluate(() => ({
      badge: document.getElementById('mailbox-unread-badge').textContent,
      badgeShown: !document.getElementById('mailbox-unread-badge').classList.contains('hidden'),
      pillShown: !document.getElementById('atelier-post-pill').classList.contains('hidden')
    }));
    assert.equal(freshDom.badgeShown && freshDom.badge === '1', true, `Dock mailbox badge must show 1, got ${JSON.stringify(freshDom)}`);
    assert.equal(freshDom.pillShown, false, 'AR-10 HUD pill stays hidden until a ward/bonus is active');

    // 2. 浮层互斥：打开任意一个只保留它自己（含 AR-10 两张卡）
    const panelTriggers = [
      { btn: '#btn-watercolor-easel', key: 'watercolorEasel' },
      { btn: '#btn-mailbox', key: 'mailbox' },
      { btn: '#hud-ambience-pill', key: 'windowAmbience' },
      { btn: '#btn-watercolor-easel', key: 'watercolorEasel' },
      { btn: '#btn-pomodoro', key: 'pomodoro' },
      { btn: '#btn-mailbox', key: 'mailbox' },
      { btn: '#btn-teatime', key: 'teatime' },
      { btn: '#btn-watercolor-easel', key: 'watercolorEasel' },
      { btn: '#btn-weekly-journal', key: 'weeklyJournal' },
      { btn: '#btn-mailbox', key: 'mailbox' },
      { btn: '#btn-terrarium', key: 'terrarium' },
      { btn: '#btn-musicbox', key: 'goodnightMusicbox' },
      { btn: '#btn-watercolor-easel', key: 'watercolorEasel' },
      { btn: '#btn-collage-frame', key: 'collageFrame' },
      { btn: '#btn-cozy-radio', key: 'cozyRadio' },
      { btn: '#btn-mailbox', key: 'mailbox' },
      { btn: '#btn-crochet-basket', key: 'crochetBasket' },
      { btn: '#btn-hot-cocoa', key: 'hotCocoa' },
      { btn: '#btn-watercolor-easel', key: 'watercolorEasel' },
      { btn: '#btn-pressed-flowers', key: 'pressedFlowers' },
      { btn: '#btn-mailbox', key: 'mailbox' },
      { btn: '#btn-telescope', key: 'telescope' },
      { btn: '#btn-watercolor-easel', key: 'watercolorEasel' },
      { btn: '#btn-chat-topic', key: 'topic' },
      { btn: '#btn-mailbox', key: 'mailbox' },
      { btn: '#btn-shop', key: 'drawer' }
    ];
    for (const step of panelTriggers) {
      await page.click(step.btn);
      await page.waitForTimeout(120);
      const openNames = await openPanelNames(page);
      assert.deepEqual(openNames, [step.key], `Opening ${step.btn} must keep ONLY ${step.key} open, got: ${JSON.stringify(openNames)}`);
    }
    // 装扮抽屉 AR-10 快捷入口
    await page.click('[data-ar10-shortcut="easel"]');
    await page.waitForTimeout(150);
    assert.deepEqual(await openPanelNames(page), ['watercolorEasel'], 'Drawer easel shortcut must open only #watercolor-card');
    await page.click('#btn-shop');
    await page.waitForTimeout(140);
    await page.click('[data-ar10-shortcut="mailbox"]');
    await page.waitForTimeout(150);
    assert.deepEqual(await openPanelNames(page), ['mailbox'], 'Drawer mailbox shortcut must open only #mailbox-card');
    // 再点一次船坞按钮应收起
    await page.click('#btn-mailbox');
    await page.waitForTimeout(140);
    assert.deepEqual(await openPanelNames(page), [], 'Tapping the mailbox dock button again must close the card');

    // 3. 窗畔雨天水彩写生画架
    await page.click('#btn-watercolor-easel');
    await page.waitForTimeout(140);
    assert.equal(await page.locator('#watercolor-summary-pill').textContent(), '画廊 0/9');
    await page.click('#watercolor-subject-grid [data-subject-id="potted_plant"]');
    await page.click('#watercolor-palette-grid [data-palette-id="peach_cream"]');
    await page.waitForTimeout(60);
    const coinsBeforePaint = (await getAr10State(page)).coins;
    await page.click('#btn-watercolor-main');
    await page.waitForTimeout(80);
    let wcRun = await page.evaluate(() => window.__AR10_DEBUG__.getWatercolorRun());
    assert.equal(wcRun.phase, 'mix', 'Starting a sketch enters the mixing phase');
    assert.equal(wcRun.subjectId, 'potted_plant');
    assert.equal(wcRun.paletteId, 'peach_cream');
    assert.equal(await page.evaluate(() => document.getElementById('btn-watercolor-main').disabled), true, 'Main button disabled while mixing');
    assert.equal((await getAr10State(page)).isPainting, true, 'She stands at the easel while painting');
    // potted_plant 调色顺序为 [1, 2]：先点 0 号颜料井算调浊
    await page.click('#watercolor-well-row [data-well-idx="0"]');
    await page.waitForTimeout(50);
    wcRun = await page.evaluate(() => window.__AR10_DEBUG__.getWatercolorRun());
    assert.equal(wcRun.mistakes, 1, 'Wrong pigment counts as a mistake');
    assert.equal(wcRun.mixStep, 0, 'Wrong pigment resets the mix');
    await page.click('#watercolor-well-row [data-well-idx="1"]');
    await page.waitForTimeout(40);
    assert.equal(await page.evaluate(() => document.querySelector('#watercolor-well-row [data-well-idx="1"]').classList.contains('is-picked')), true, 'First pigment shows as picked');
    await page.click('#watercolor-well-row [data-well-idx="2"]');
    await page.waitForTimeout(60);
    wcRun = await page.evaluate(() => window.__AR10_DEBUG__.getWatercolorRun());
    assert.equal(wcRun.phase, 'brush', 'Correct two-pigment mix enters the brush phase');
    assert.equal(await page.evaluate(() => document.querySelectorAll('#watercolor-wash-layer .wc-wash-spot').length), 4, '4 wash spots appear on the paper');
    const opacityBefore = await page.evaluate(() => Number(document.getElementById('watercolor-paper-base').style.opacity));
    for (let i = 0; i < 4; i++) {
      await page.click(`#watercolor-wash-layer [data-wash-idx="${i}"]`);
      await page.waitForTimeout(50);
      if (i === 1) {
        const mid = await page.evaluate(() => Number(document.getElementById('watercolor-paper-base').style.opacity));
        assert(mid > opacityBefore, `Each wash must reveal the painting (${opacityBefore} -> ${mid})`);
        await shot(page, 'desktop_1440x900_watercolor_brush.png');
      }
    }
    wcRun = await page.evaluate(() => window.__AR10_DEBUG__.getWatercolorRun());
    assert.equal(wcRun.phase, 'finish', '4 washes complete the brush phase');
    assert.equal(await page.locator('#btn-watercolor-main').textContent(), '落款签名 · 挂上画廊');
    await page.click('#btn-watercolor-main');
    await page.waitForTimeout(140);
    const afterFirstPaint = await getAr10State(page);
    assert.equal(afterFirstPaint.watercolorRun.phase, 'done');
    assert.equal(afterFirstPaint.watercolor.paintings.potted_plant__peach_cream.count, 1, 'Painting recorded in gallery');
    assert.equal(afterFirstPaint.watercolor.paintings.potted_plant__peach_cream.bestMistakes, 1, 'Mixing mistakes recorded');
    assert.deepEqual(afterFirstPaint.watercolor.hung, ['potted_plant__peach_cream'], 'Finished painting hangs on the wall');
    assert.equal(afterFirstPaint.wallVisual.items.length, 1, 'Wall gallery draws 1 painting');
    assert.equal(afterFirstPaint.wallVisual.items[0].subjectSpriteKey, 'plantStarLily', 'Wall painting carries the subject art');
    assert(afterFirstPaint.coins >= coinsBeforePaint + 28, 'First painting awards >= 28 coins');
    assert(afterFirstPaint.emote.includes('蜜桃·窗台小盆栽'), `Expected painting reaction, got: ${afterFirstPaint.emote}`);
    assert.equal(afterFirstPaint.focusWard.gallerySize, 1);
    assert.equal(afterFirstPaint.focusWard.critChanceBonus, 0.012);
    assert.equal(afterFirstPaint.focusWard.focusHastePct, 0.015);
    assert.equal(afterFirstPaint.journalSummary.paints7d, 1, 'Weekly journal records the painting');
    assert(
      afterFirstPaint.ar10Audio.brushStrokeCount >= 4 && afterFirstPaint.ar10Audio.paintFinishChimeCount >= 1,
      `Expected WebAudio brush strokes + finish chime, got ${JSON.stringify(afterFirstPaint.ar10Audio)}`
    );
    const pillAfterPaint = await page.evaluate(() => ({
      pill: !document.getElementById('atelier-post-pill').classList.contains('hidden'),
      easel: !document.getElementById('atelier-seg-easel').classList.contains('hidden'),
      mail: !document.getElementById('atelier-seg-mail').classList.contains('hidden'),
      tag: document.getElementById('atelier-pill-gallery').textContent
    }));
    assert.deepEqual(pillAfterPaint, { pill: true, easel: true, mail: false, tag: '1' }, `AR-10 pill must show the gallery segment, got ${JSON.stringify(pillAfterPaint)}`);

    // 画完剩余 8 种组合（全部通过 UI）
    for (const s of SUBJECTS) {
      for (const p of PALETTES) {
        if (s === 'potted_plant' && p === 'peach_cream') continue;
        await paintViaUi(page, s, p);
      }
    }
    const fullGallery = await getAr10State(page);
    assert.equal(fullGallery.focusWard.gallerySize, 9, 'All 9 combos collected');
    assert.equal(fullGallery.focusWard.critChanceBonus, 0.128, `Expected 9/9 crit 0.128, got ${fullGallery.focusWard.critChanceBonus}`);
    assert.equal(fullGallery.focusWard.focusHastePct, 0.135, `Expected 9/9 haste 0.135, got ${fullGallery.focusWard.focusHastePct}`);
    assert.equal(fullGallery.watercolor.hung.length, 6, 'Wall shows the 6 most recent paintings');
    assert.equal(fullGallery.wallVisual.items.length, 6);
    assert.equal(fullGallery.watercolor.hung[5], 'whale_plush__matcha_latte', 'Latest painting hangs last');
    assert.equal(await page.locator('#watercolor-summary-pill').textContent(), '画廊 9/9');
    assert.equal(await page.evaluate(() => document.querySelectorAll('#watercolor-gallery-grid .wc-gallery-slot.collected').length), 9);

    // 画廊格点选后重画同一幅
    await page.click('#watercolor-gallery-grid [data-combo-id="rainy_window__mist_blue"]');
    await page.waitForTimeout(60);
    const sel = await getAr10State(page);
    assert.equal(sel.watercolor.selectedSubject, 'rainy_window');
    assert.equal(sel.watercolor.selectedPalette, 'mist_blue');
    const repaint = await paintViaUi(page, 'rainy_window', 'mist_blue');
    assert.equal(repaint.isFirstPainting, false, 'Repainting is not a new discovery');
    const afterRepaint = await getAr10State(page);
    assert.equal(afterRepaint.watercolor.paintings.rainy_window__mist_blue.count, 2, 'Repaint increases count');
    assert.equal(afterRepaint.watercolor.totalPaintings, 10);
    assert.equal(afterRepaint.watercolor.hung[5], 'rainy_window__mist_blue', 'Repainted piece moves to the newest slot');
    await page.waitForTimeout(300);
    await shot(page, 'desktop_1440x900_watercolor.png');

    // 墙面画廊：关闭卡片后点墙上的画即可重新打开画架
    await page.click('#btn-watercolor-close');
    await page.waitForTimeout(120);
    const layout = await page.evaluate(() => window.__AR10_DEBUG__.getGalleryLayout());
    assert.equal(layout.gallery.slots.length, 6, 'Gallery layout has 6 hung slots');
    assert(layout.gallery.left > layout.W * 0.62 && layout.gallery.bottom < layout.H * 0.56, `Gallery must sit on the right wall above the desk: ${JSON.stringify(layout.gallery)}`);
    await page.waitForTimeout(500);
    await shot(page, 'desktop_1440x900_gallery_wall.png');
    const slot0 = layout.gallery.slots[0];
    await page.mouse.click(slot0.x + slot0.w / 2, slot0.y + slot0.h / 2);
    await page.waitForTimeout(150);
    assert.deepEqual(await openPanelNames(page), ['watercolorEasel'], 'Tapping a wall painting opens the easel card');

    // 刷新后持久化（进行中的写生为运行时状态）
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(340);
    const reloadedWc = await getAr10State(page);
    assert.equal(reloadedWc.focusWard.gallerySize, 9, 'Gallery 9/9 persists across reload');
    assert.deepEqual(reloadedWc.watercolor.hung, afterRepaint.watercolor.hung, 'Hung paintings persist across reload');
    assert.equal(reloadedWc.watercolor.totalPaintings, 10, 'Painting count persists');
    assert.equal(reloadedWc.watercolorRun.phase, 'idle', 'In-progress sketch is runtime only');
    assert.equal(reloadedWc.wallVisual.items.length, 6, 'Wall gallery redraws after reload');

    // 幸存者班次「画意专注守护」
    await page.click('#btn-watercolor-easel');
    await page.waitForTimeout(140);
    await page.click('#btn-watercolor-go-shift');
    await page.waitForTimeout(240);
    const survWc = await getAr10State(page);
    const smW = survWc.survivorMetrics;
    assert.equal(survWc.gameMode, 'survivor');
    assert(
      smW.effectiveCritChance >=
        Math.min(0.85, 0.18 + smW.botanicalBlessings.critChanceBonus + smW.starGuidance.critChanceBonus + 0.128) - 1e-6,
      `Crit chance must include the focus ward, got ${smW.effectiveCritChance}`
    );
    assert(Math.abs(smW.hasteMult - 1.135) < 1e-4, `Haste must include +13.5% focus, got ${smW.hasteMult}`);
    const stripHasEasel = await page.evaluate(() => {
      const strip = document.getElementById('surv-skill-strip');
      return Boolean(strip && !strip.classList.contains('hidden') && strip.innerHTML.includes('ui_btn_watercolor_easel.webp'));
    });
    assert(stripHasEasel, 'Survivor skill strip must show the ui_btn_watercolor_easel.webp badge');
    await page.click('.mode-btn[data-mode="pet"]');
    await page.waitForTimeout(220);

    // 4. 奶油手账小邮差信箱
    await page.click('#btn-mailbox');
    await page.waitForTimeout(140);
    let mbState = await getAr10State(page);
    const welcome = mbState.mailbox.letters[0];
    assert.equal(welcome.welcome, true);
    assert.equal(await page.evaluate(() => document.querySelectorAll('#mailbox-envelope-row .mailbox-envelope.is-new').length), 1, 'Unopened letter shows as new');
    assert.equal(await page.locator('#btn-mailbox-send').textContent(), '先拆开一封信');
    // 锁定邮票不可贴
    await page.click(`#mailbox-envelope-row [data-letter-id="${welcome.id}"]`);
    await page.waitForTimeout(80);
    const opened = await page.evaluate(() => ({
      letterShown: !document.getElementById('mailbox-letter').classList.contains('hidden'),
      body: document.getElementById('mailbox-letter-body').textContent,
      sign: document.getElementById('mailbox-letter-sign').textContent,
      moonDisabled: document.querySelector('#mailbox-stamp-row [data-stamp-id="moon"]').disabled,
      daisyDisabled: document.querySelector('#mailbox-stamp-row [data-stamp-id="daisy"]').disabled,
      replies: document.querySelectorAll('#mailbox-reply-grid .mailbox-reply-btn').length
    }));
    assert(opened.letterShown && opened.body.includes('小信箱') && opened.sign.includes('DeepSeek娘'), `Welcome letter must render, got ${JSON.stringify(opened)}`);
    assert.equal(opened.replies, 3, 'Letter offers 3 replies');
    assert(opened.moonDisabled && opened.daisyDisabled, 'Moon/daisy stamps start locked');
    mbState = await getAr10State(page);
    assert.equal(mbState.mailbox.letters[0].opened, true, 'Opening marks the letter read');
    assert(mbState.ar10Audio.letterOpenCount >= 1, 'Opening a letter plays the paper rustle');
    const coinsBeforeReply = mbState.coins;
    const firstReply = await replyViaUi(page, welcome.id, 'welcome_wait', 'whale');
    assert.equal(firstReply.best, true, 'Heartfelt reply counts as best');
    const afterFirstReply = await getAr10State(page);
    assert.equal(afterFirstReply.mailbox.totalReplies, 1);
    assert.equal(afterFirstReply.mailbox.stamps.whale, 1);
    assert.equal(afterFirstReply.mailbox.letters.length, 0, 'Replied letter leaves the inbox');
    assert.equal(afterFirstReply.mailbox.album.length, 1, 'Replied letter goes into the album');
    assert.equal(afterFirstReply.mailbox.album[0].stampId, 'whale');
    assert(afterFirstReply.coins >= coinsBeforeReply + 18, 'Best reply awards >= 18 coins');
    assert.equal(afterFirstReply.journalSummary.letters7d, 1, 'Weekly journal records the letter');
    assert.equal(afterFirstReply.heartfelt.active, true);
    assert.equal(afterFirstReply.heartfelt.shiftXpBonusPct, 0.022, `Expected 1 reply + 1 stamp kind = 0.022, got ${afterFirstReply.heartfelt.shiftXpBonusPct}`);
    assert(afterFirstReply.ar10Audio.letterSentChimeCount >= 1, 'Sending plays the post chime');
    const domAfterReply = await page.evaluate(() => ({
      badgeHidden: document.getElementById('mailbox-unread-badge').classList.contains('hidden'),
      mailSeg: !document.getElementById('atelier-seg-mail').classList.contains('hidden'),
      mailTag: document.getElementById('atelier-pill-mail').textContent
    }));
    assert.deepEqual(domAfterReply, { badgeHidden: true, mailSeg: true, mailTag: '1' }, `HUD/dock after reply: ${JSON.stringify(domAfterReply)}`);

    // 定期来信：按亲密度档位间隔 + 七日心情周报主心情
    const twoDaysAgo = await page.evaluate(() => {
      const pad = (n) => String(n).padStart(2, '0');
      const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T22:30:00`;
      const now = new Date();
      return [iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)), iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2))];
    });
    for (const iso of twoDaysAgo) {
      await page.evaluate((d) => window.__AR5_DEBUG__.recordActivityOnDate('sleepMins', 30, d), iso);
    }
    const beforeLetter = await getAr10State(page);
    const nextAt = beforeLetter.mailbox.nextLetterAt;
    const notYet = await page.evaluate((iso) => window.__AR10_DEBUG__.checkLetters(iso), new Date(nextAt - 60000).toISOString());
    assert.equal(notYet, null, 'No letter before the scheduled time');
    const dueIso = new Date(nextAt + 1000).toISOString();
    const newLetter = await page.evaluate((iso) => window.__AR10_DEBUG__.checkLetters(iso), dueIso);
    assert(newLetter && newLetter.id, 'A new letter arrives once the interval passes');
    const tier = expectedTier(beforeLetter.level);
    const expectMood = dominantMood(beforeLetter.journalSummary.daysList, beforeLetter.weeklyJournal?.selectedMood || 'bliss');
    assert.equal(newLetter.tier, tier, `Letter tier must follow intimacy level ${beforeLetter.level}`);
    assert.equal(expectMood, 'goodnight', 'Two goodnight days make goodnight the dominant weekly mood');
    assert.equal(newLetter.moodId, expectMood, `Letter mood must follow the weekly report, got ${newLetter.moodId}`);
    assert(newLetter.weeklyLine.includes('好梦'), `Letter must mention the weekly mood, got ${newLetter.weeklyLine}`);
    const specs = await page.evaluate(() => window.__AR10_DEBUG__.getSpecs());
    const afterLetter = await getAr10State(page);
    assert.equal(
      afterLetter.mailbox.nextLetterAt - new Date(dueIso).getTime(),
      specs.tiers[tier].intervalHours * 3600000,
      'Next letter interval follows the intimacy tier'
    );
    assert(afterLetter.emote.includes('小信箱'), `She announces the new letter, got ${afterLetter.emote}`);
    const goodnightView = await page.evaluate((id) => window.__AR10_DEBUG__.getLetterView(id), newLetter.id);
    assert.equal(goodnightView.title, '晚安小纸条');

    // 信箱上限 3 封
    await page.evaluate(() => window.__AR10_DEBUG__.writeLetterNow());
    await page.evaluate(() => window.__AR10_DEBUG__.writeLetterNow());
    const overflowLetter = await page.evaluate(() => window.__AR10_DEBUG__.writeLetterNow());
    assert.equal(overflowLetter, null, 'Inbox holds at most 3 letters');
    assert.equal(await page.locator('#mailbox-next-hint').textContent(), '信箱满啦，回完信她才会继续写下一封哦~');
    assert.equal(await page.evaluate(() => document.getElementById('mailbox-unread-badge').textContent), '3');

    // 第 2 封：普通回信 + 蓝鲸邮票 -> 解锁晚安月亮章；第 3 封：贴月亮章
    const reply2 = await replyViaUi(page, newLetter.id, 'moon', 'whale');
    assert.equal(reply2.best, false);
    assert.deepEqual(reply2.newlyUnlocked, ['moon'], 'Second reply unlocks the moon stamp');
    assert((await getAr10State(page)).emote.includes('晚安月亮章'), 'Unlock is announced');
    const third = (await getAr10State(page)).mailbox.letters[0];
    await replyViaUi(page, third.id, specs.moods[third.moodId].replies[0].id, 'moon');
    const afterThree = await getAr10State(page);
    assert.equal(afterThree.mailbox.totalReplies, 3);
    assert.deepEqual(afterThree.mailbox.stamps, { whale: 2, moon: 1, daisy: 0 });
    assert.equal(afterThree.heartfelt.stampKinds, 2);
    assert.equal(afterThree.heartfelt.shiftXpBonusPct, 0.056, `Expected 3 replies + 2 kinds = 0.056, got ${afterThree.heartfelt.shiftXpBonusPct}`);
    assert.equal(afterThree.mailbox.letters.length, 1, 'One letter still waits in the inbox');

    // 读一封未回的信并贴好邮票，用于截图
    await page.click(`#mailbox-envelope-row [data-letter-id="${afterThree.mailbox.letters[0].id}"]`);
    await page.waitForTimeout(60);
    await page.click('#mailbox-reply-grid .mailbox-reply-btn >> nth=0');
    await page.click('#mailbox-stamp-row [data-stamp-id="moon"]');
    await page.waitForTimeout(400);
    await shot(page, 'desktop_1440x900_mailbox_letter.png');

    // 集邮册
    await page.click('#mailbox-tab-row [data-mail-view="album"]');
    await page.waitForTimeout(80);
    const albumDom = await page.evaluate(() => ({
      albumShown: !document.getElementById('mailbox-album-view').classList.contains('hidden'),
      inboxShown: !document.getElementById('mailbox-inbox-view').classList.contains('hidden'),
      slots: document.querySelectorAll('#mailbox-album-grid .mailbox-album-slot').length,
      tally: document.getElementById('mailbox-stamp-tally').textContent
    }));
    assert(albumDom.albumShown && !albumDom.inboxShown, 'Album tab switches the view');
    assert.equal(albumDom.slots, 3, 'Album shows 3 replied letters');
    assert(albumDom.tally.includes('蓝鲸邮票 2') && albumDom.tally.includes('晚安月亮章 1'), `Stamp tally: ${albumDom.tally}`);
    await page.click('#mailbox-album-grid .mailbox-album-slot >> nth=0');
    await page.waitForTimeout(80);
    const readText = await page.locator('#mailbox-album-read').textContent();
    assert(readText.includes('你的回信') && readText.includes('贴了'), `Album entry re-reads the letter + reply, got ${readText}`);
    await page.waitForTimeout(300);
    await shot(page, 'desktop_1440x900_mailbox_album.png');

    // 刷新后持久化
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(340);
    const reloadedMb = await getAr10State(page);
    assert.equal(reloadedMb.mailbox.totalReplies, 3, 'Replies persist across reload');
    assert.equal(reloadedMb.mailbox.album.length, 3, 'Album persists across reload');
    assert.deepEqual(reloadedMb.mailbox.stamps, { whale: 2, moon: 1, daisy: 0 }, 'Stamps persist across reload');
    assert.equal(reloadedMb.mailbox.letters.length, 1, 'Waiting letter persists across reload');
    assert.equal(reloadedMb.mailbox.letters[0].opened, true, 'Opened flag persists across reload');
    assert.equal(reloadedMb.mailboxRun.openLetterId, '', 'Open letter view is runtime only');
    assert.equal(reloadedMb.mailbox.welcomeSent, true, 'Welcome letter is not re-sent after reload');

    // 幸存者班次「信笺心意」：班次经验真实加成
    await page.click('#btn-mailbox');
    await page.waitForTimeout(140);
    await page.click('#btn-mailbox-go-shift');
    await page.waitForTimeout(240);
    const survMb = await getAr10State(page);
    assert.equal(survMb.gameMode, 'survivor');
    assert(Math.abs(survMb.survivorMetrics.shiftXpMult - 1.056) < 1e-6, `Shift XP mult must be 1.056, got ${survMb.survivorMetrics.shiftXpMult}`);
    const xpGain = await page.evaluate(() => window.__AR10_DEBUG__.applyShiftXpForTest(10));
    assert(Math.abs(xpGain.after - xpGain.before - 10.56) < 1e-6, `10 gem XP must become 10.56 shift XP, got ${JSON.stringify(xpGain)}`);
    const stripHasMail = await page.evaluate(() => {
      const strip = document.getElementById('surv-skill-strip');
      return Boolean(strip && !strip.classList.contains('hidden') && strip.innerHTML.includes('ui_btn_mailbox.webp'));
    });
    assert(stripHasMail, 'Survivor skill strip must show the ui_btn_mailbox.webp badge');
    await page.click('.mode-btn[data-mode="pet"]');
    await page.waitForTimeout(220);
    const backInPet = await page.evaluate(() => window.__AR10_DEBUG__.applyShiftXpForTest(10));
    assert.equal(backInPet.mult, 1, 'Shift XP bonus only applies during survivor shifts');

    // 5. 七日心情周报联动
    await page.click('#btn-weekly-journal');
    await page.waitForTimeout(180);
    const journalAudit = await page.evaluate(() => ({
      summary: window.__AR10_DEBUG__.getState().journalSummary,
      cardText: document.getElementById('weekly-journal-card')?.textContent || ''
    }));
    assert(journalAudit.summary.paints7d >= 10, `Expected paints7d >= 10, got ${journalAudit.summary.paints7d}`);
    assert.equal(journalAudit.summary.letters7d, 3);
    assert.equal(journalAudit.summary.cumulative.gallerySize, 9);
    assert(journalAudit.summary.cumulative.totalLetters >= 3);
    assert.equal(journalAudit.summary.cumulative.stampKinds, 2);
    assert(
      journalAudit.cardText.includes('水彩') && journalAudit.cardText.includes('信笺') && journalAudit.cardText.includes('画廊 9/9'),
      `Weekly journal card must render 水彩 / 信笺 / 画廊 metrics, got ${journalAudit.cardText}`
    );

    // 桌面 1440x900 船坞零挤压 + 桌面信箱点击
    await page.click('#btn-weekly-journal');
    await page.waitForTimeout(120);
    const desktopDock = await page.evaluate(() => {
      const joy = document.getElementById('joystick-zone').getBoundingClientRect();
      const care = document.getElementById('pet-care-bar').getBoundingClientRect();
      const act = document.querySelector('.action-zone').getBoundingClientRect();
      return { joyRight: joy.right, careLeft: care.left, careRight: care.right, actLeft: act.left };
    });
    assert(
      desktopDock.joyRight <= desktopDock.careLeft + 2 && desktopDock.careRight <= desktopDock.actLeft + 2,
      `1440x900 dock overlap: ${JSON.stringify(desktopDock)}`
    );
    const deskLayout = await page.evaluate(() => window.__AR10_DEBUG__.getGalleryLayout());
    await page.mouse.click(deskLayout.mailbox.x, deskLayout.mailbox.y - 30);
    await page.waitForTimeout(150);
    const afterDeskTap = await getAr10State(page);
    assert.deepEqual(afterDeskTap.openPanels.mailbox, true, 'Tapping the desk mailbox opens the mailbox card');
    assert.equal(afterDeskTap.mailboxRun.openLetterId, afterDeskTap.mailbox.letters[0].id, 'Desk mailbox tap opens the waiting letter');

    // 6. 移动端 390x844（竖屏强制横置）
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);
    await page.evaluate(() => document.getElementById('btn-watercolor-easel').click());
    await page.waitForTimeout(240);
    // 旋转舞台下真实点按：起笔 + 蘸第一种颜料
    await page.click('#watercolor-subject-grid [data-subject-id="whale_plush"]');
    await page.click('#watercolor-palette-grid [data-palette-id="mist_blue"]');
    await page.click('#btn-watercolor-main');
    await page.waitForTimeout(80);
    await page.click('#watercolor-well-row [data-well-idx="2"]');
    await page.waitForTimeout(80);
    const portraitRun = await page.evaluate(() => window.__AR10_DEBUG__.getWatercolorRun());
    assert.equal(portraitRun.mixStep, 1, `Tapping a pigment must work on 390x844 (rotated stage), got ${JSON.stringify(portraitRun)}`);
    await page.click('#watercolor-well-row [data-well-idx="0"]');
    await page.waitForTimeout(80);
    await page.click('#watercolor-wash-layer [data-wash-idx="0"]');
    await page.waitForTimeout(80);
    assert.equal((await page.evaluate(() => window.__AR10_DEBUG__.getWatercolorRun())).strokes[0], true, 'Wash spot tap works on 390x844');
    const portraitWc = await page.evaluate(() => ({
      overflowX: document.documentElement.scrollWidth - window.innerWidth,
      overflowY: document.documentElement.scrollHeight - window.innerHeight,
      open: !document.getElementById('watercolor-card').classList.contains('hidden'),
      hasEmoji: /\p{Extended_Pictographic}/u.test(document.body.innerText || '')
    }));
    assert(portraitWc.open, '#watercolor-card must open on 390x844');
    assert.equal(portraitWc.hasEmoji, false, 'Zero Emoji on 390x844');
    assert(portraitWc.overflowX <= 0 && portraitWc.overflowY <= 0, `390x844 watercolor overflow: ${JSON.stringify(portraitWc)}`);
    await page.waitForTimeout(200);
    await shot(page, 'mobile_390x844_watercolor.png');

    await page.evaluate(() => document.getElementById('btn-mailbox').click());
    await page.waitForTimeout(220);
    const mbNow = await getAr10State(page);
    const waiting = mbNow.mailbox.letters[0];
    // 窄屏读信时信封列表会收起；若信纸尚未展开才去点信封
    if (mbNow.mailboxRun.openLetterId !== waiting.id) {
      await page.click(`#mailbox-envelope-row [data-letter-id="${waiting.id}"]`);
      await page.waitForTimeout(80);
    }
    assert.equal(
      await page.evaluate(() => document.querySelector('#mailbox-envelope-row').offsetParent === null),
      true,
      'Envelope list folds away on 390x844 while a letter is open'
    );
    const portraitMb = await page.evaluate(() => ({
      overflowX: document.documentElement.scrollWidth - window.innerWidth,
      overflowY: document.documentElement.scrollHeight - window.innerHeight,
      mbOpen: !document.getElementById('mailbox-card').classList.contains('hidden'),
      wcOpen: !document.getElementById('watercolor-card').classList.contains('hidden'),
      letterShown: !document.getElementById('mailbox-letter').classList.contains('hidden')
    }));
    assert(portraitMb.mbOpen && !portraitMb.wcOpen, '#mailbox-card must open on 390x844 and close #watercolor-card');
    assert(portraitMb.letterShown, 'Letter paper shows on 390x844');
    assert(portraitMb.overflowX <= 0 && portraitMb.overflowY <= 0, `390x844 mailbox overflow: ${JSON.stringify(portraitMb)}`);
    await shot(page, 'mobile_390x844_mailbox.png');

    // 7. 844x390 横屏：卡片 / 顶部 HUD / 19 键船坞 / 胶囊行 零重叠
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(260);
    if (await page.evaluate(() => document.getElementById('mailbox-card').classList.contains('hidden'))) {
      await page.click('#btn-mailbox');
      await page.waitForTimeout(160);
    }
    const landscapeAudit = async (cardId) =>
      page.evaluate((id) => {
        const prof = document.querySelector('.hud-profile-card').getBoundingClientRect();
        const sw = document.getElementById('mode-switcher').getBoundingClientRect();
        const hr = document.querySelector('.hud-right').getBoundingClientRect();
        const joy = document.getElementById('joystick-zone').getBoundingClientRect();
        const care = document.getElementById('pet-care-bar').getBoundingClientRect();
        const act = document.querySelector('.action-zone').getBoundingClientRect();
        const card = document.getElementById(id).getBoundingClientRect();
        const pills = Array.from(document.querySelectorAll('#hud-ambience-row > button')).filter((b) => !b.classList.contains('hidden'));
        const pillRects = pills.map((b) => b.getBoundingClientRect());
        const amb = document.getElementById('hud-ambience-pill').getBoundingClientRect();
        const atelier = document.getElementById('atelier-post-pill').getBoundingClientRect();
        return {
          overflowX: document.documentElement.scrollWidth - window.innerWidth,
          overflowY: document.documentElement.scrollHeight - window.innerHeight,
          cardOpen: !document.getElementById(id).classList.contains('hidden'),
          careBtnCount: document.querySelectorAll('#pet-care-bar .care-btn').length,
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
          pillBottom: pillRects.reduce((m, r) => Math.max(m, r.bottom), 0),
          ambTop: amb.top,
          atelierTop: atelier.top,
          atelierRight: atelier.right,
          rowRight: document.getElementById('hud-ambience-row').getBoundingClientRect().right
        };
      }, cardId);
    for (const [cardId, btn, shotName] of [
      ['mailbox-card', '#btn-mailbox', 'mobile_844x390_mailbox.png'],
      ['watercolor-card', '#btn-watercolor-easel', 'mobile_844x390_watercolor.png']
    ]) {
      if (await page.evaluate((id) => document.getElementById(id).classList.contains('hidden'), cardId)) {
        await page.click(btn);
        await page.waitForTimeout(180);
      }
      const la = await landscapeAudit(cardId);
      assert(la.cardOpen, `${cardId} must be open on 844x390`);
      assert(la.careBtnCount >= CARE_BTN_COUNT, `Expected >= ${CARE_BTN_COUNT} dock buttons on 844x390`);
      assert(la.overflowX <= 0 && la.overflowY <= 0, `844x390 overflow: ${JSON.stringify(la)}`);
      assert(la.profileRight <= la.cardLeft, `${cardId} overlaps profile on 844x390: ${JSON.stringify(la)}`);
      assert(la.cardBottom <= la.actTop + 2, `${cardId} overlaps action zone on 844x390: ${JSON.stringify(la)}`);
      assert(la.switcherRight <= la.hudRightLeft + 2, `Top HUD overlap on 844x390: ${JSON.stringify(la)}`);
      assert(
        la.joyRight <= la.careLeft + 2 && la.careRight <= la.actLeft + 2,
        `Bottom ${CARE_BTN_COUNT}-button dock overlap on 844x390: ${JSON.stringify(la)}`
      );
      assert(la.pillBottom <= la.joyTop + 2, `HUD pills overlap joystick on 844x390: ${JSON.stringify(la)}`);
      // AR-10 紧凑胶囊必须挤在窗景胶囊同一行，不额外新增换行
      assert(Math.abs(la.atelierTop - la.ambTop) <= 3, `AR-10 pill must share the first pill row on 844x390: ${JSON.stringify(la)}`);
      assert(la.atelierRight <= la.rowRight + 1, `AR-10 pill must stay inside the pill row: ${JSON.stringify(la)}`);
      await page.waitForTimeout(200);
      await shot(page, shotName);
    }
    // 窄屏关卡片后的墙面画廊与桌面信箱
    await page.click('#btn-watercolor-close');
    await page.waitForTimeout(500);
    await shot(page, 'mobile_844x390_gallery_wall.png');
    // 窄屏带上 AR-9 胶囊时的最坏行数：AR-10 胶囊仍不得新增一行
    const rowsWithAr10 = await page.evaluate(() => {
      const tops = new Set(
        Array.from(document.querySelectorAll('#hud-ambience-row > button'))
          .filter((b) => !b.classList.contains('hidden'))
          .map((b) => Math.round(b.getBoundingClientRect().top / 4))
      );
      const pill = document.getElementById('atelier-post-pill');
      pill.classList.add('hidden');
      const topsWithout = new Set(
        Array.from(document.querySelectorAll('#hud-ambience-row > button'))
          .filter((b) => !b.classList.contains('hidden'))
          .map((b) => Math.round(b.getBoundingClientRect().top / 4))
      );
      pill.classList.remove('hidden');
      return { withAr10: tops.size, withoutAr10: topsWithout.size };
    });
    assert.equal(rowsWithAr10.withAr10, rowsWithAr10.withoutAr10, `AR-10 pill must not add a HUD pill row: ${JSON.stringify(rowsWithAr10)}`);

    // 8. 旧存档 / 脏数据安全默认值
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate(() => {
      const raw = JSON.parse(localStorage.getItem('ar_deepseek_pet_v2') || '{}');
      delete raw.watercolor;
      delete raw.mailbox;
      localStorage.setItem('ar_deepseek_pet_v2', JSON.stringify(raw));
    });
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(300);
    const legacy = await getAr10State(page);
    assert.deepEqual(legacy.watercolor.paintings, {}, 'Legacy save defaults to an empty gallery');
    assert.deepEqual(legacy.watercolor.hung, []);
    assert.equal(legacy.watercolor.selectedSubject, 'rainy_window');
    assert.equal(legacy.watercolor.selectedPalette, 'mist_blue');
    assert.equal(legacy.focusWard.active, false);
    assert.equal(legacy.mailbox.letters.length, 1, 'Legacy save receives one welcome letter');
    assert.equal(legacy.mailbox.letters[0].welcome, true);
    assert.equal(legacy.mailbox.totalReplies, 0);
    assert.deepEqual(legacy.mailbox.stamps, { whale: 0, moon: 0, daisy: 0 });
    assert.equal(legacy.heartfelt.active, false);
    assert(legacy.journalSummary.paints7d >= 10 && legacy.journalSummary.letters7d === 3, 'Journal history survives legacy migration');
    assert(legacy.journalSummary.cumulative.totalPaints >= 10, 'Cumulative paint total survives via the journal');

    await page.evaluate(() => {
      const raw = JSON.parse(localStorage.getItem('ar_deepseek_pet_v2') || '{}');
      raw.watercolor = {
        paintings: {
          fake__x: { count: 3 },
          rainy_window__mist_blue: true,
          whale_plush__matcha_latte: { count: -5, bestMistakes: 'x', firstDate: 'yesterday' }
        },
        hung: ['nope', 'rainy_window__mist_blue', 'rainy_window__mist_blue', 42],
        selectedSubject: 'sun',
        selectedPalette: 7,
        totalPaintings: 'x',
        lastPaintingId: 'ghost'
      };
      raw.mailbox = {
        letters: [null, 'str', { id: 'X1' }, { id: 'X1' }, { id: 'X2', moodId: 'evil', tier: 9, variant: 5, writtenAt: 'soon' }],
        album: [{ id: 'A1', stampId: 'dragon', replyId: 5 }, { nope: true }],
        stamps: { whale: 'abc', moon: -3, daisy: 2.6 },
        totalReplies: 'lots',
        nextLetterAt: 9e15,
        welcomeSent: 'yes'
      };
      localStorage.setItem('ar_deepseek_pet_v2', JSON.stringify(raw));
    });
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(300);
    const dirty = await getAr10State(page);
    assert.deepEqual(Object.keys(dirty.watercolor.paintings).sort(), ['rainy_window__mist_blue', 'whale_plush__matcha_latte'], 'Unknown paintings must be dropped');
    assert.equal(dirty.watercolor.paintings.whale_plush__matcha_latte.count, 1, 'Invalid painting count clamps to 1');
    assert.equal(dirty.watercolor.paintings.whale_plush__matcha_latte.bestMistakes, 0);
    assert(/^\d{4}-\d{2}-\d{2}$/.test(dirty.watercolor.paintings.whale_plush__matcha_latte.firstDate), 'Invalid date falls back to a date key');
    assert.deepEqual(dirty.watercolor.hung, ['rainy_window__mist_blue'], 'Hung list keeps only unique, known paintings');
    assert.equal(dirty.watercolor.selectedSubject, 'rainy_window');
    assert.equal(dirty.watercolor.selectedPalette, 'mist_blue');
    assert.equal(dirty.watercolor.totalPaintings, 2, 'Invalid painting total falls back to the gallery count');
    assert.equal(dirty.watercolor.lastPaintingId, 'rainy_window__mist_blue');
    assert.equal(dirty.focusWard.gallerySize, 2);
    assert.deepEqual(dirty.mailbox.letters.map((l) => l.id), ['X1', 'X2'], 'Broken / duplicate letters are dropped');
    assert.equal(dirty.mailbox.letters[1].moodId, 'bliss', 'Unknown mood falls back to bliss');
    assert.equal(dirty.mailbox.letters[1].tier, 2, 'Tier clamps to 0..2');
    assert.equal(dirty.mailbox.letters[1].variant, 1, 'Variant clamps to 0..1');
    assert.equal(dirty.mailbox.album.length, 1, 'Broken album entries are dropped');
    assert.equal(dirty.mailbox.album[0].stampId, 'whale', 'Unknown stamp falls back to whale');
    assert.equal(dirty.mailbox.album[0].replyId, '');
    assert.deepEqual(dirty.mailbox.stamps, { whale: 0, moon: 0, daisy: 3 }, 'Dirty stamp counts sanitize');
    assert.equal(dirty.mailbox.totalReplies, 1, 'Invalid reply total falls back to the album size');
    assert.equal(dirty.mailbox.welcomeSent, true, 'Truthy welcome flag means no duplicate welcome letter');
    assert(dirty.mailbox.nextLetterAt <= Date.now() + 8 * 3600000 + 5000, `Far-future schedule is pulled back, got ${dirty.mailbox.nextLetterAt}`);
    // 脏数据下依旧可正常读信
    await page.click('#btn-mailbox');
    await page.waitForTimeout(140);
    await page.click('#mailbox-envelope-row [data-letter-id="X2"]');
    await page.waitForTimeout(80);
    assert((await page.locator('#mailbox-letter-body').textContent()).includes('最最喜欢的主人'), 'Sanitized letter renders with its tier greeting');

    assert.equal(consoleErrors.length, 0, `Console errors observed: ${consoleErrors.join('; ')}`);
    assert.equal(pageErrors.length, 0, `Page errors observed: ${pageErrors.join('; ')}`);
    assert.equal(failedResponses.length, 0, `HTTP >= 400 responses observed: ${failedResponses.join('; ')}`);

    console.log(
      '[E2E PASS] AR-10 Windowside Rainy-Day Watercolor Easel (3 subjects x 3 palettes, two-pigment mixing + 4-stroke wash, 9-piece wall gallery, Survivor focus/crit ward) + Cream-Journal Postie Mailbox (welcome + tier/mood-driven periodic letters, reply + stamp, 3-stamp album, Survivor shift-XP bonus, Weekly Journal sync) passed across 1440x900, 390x844 and 844x390 with 0px overflow, mutually exclusive overlays, safe legacy/dirty-save defaults and 0 errors!'
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
