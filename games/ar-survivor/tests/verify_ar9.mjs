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
const PORT = Number(process.env.AR9_PORT || 0);

// 可选：设置 AR9_SHOT_DIR 后输出 1440x900 / 390x844 / 844x390 自审截图
const SHOT_DIR = process.env.AR9_SHOT_DIR || '';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.json': 'application/json; charset=utf-8'
};

const REQUIRED_AR9_ASSETS = [
  'ui_btn_pressed_flowers.webp',
  'ui_btn_telescope.webp',
  'pressed_sakura_bookmark.webp',
  'pressed_ginkgo_bookmark.webp',
  'pressed_babysbreath_bookmark.webp',
  'star_chart_card.webp'
];

const CARE_BTN_COUNT = 17;

async function shot(page, name) {
  if (!SHOT_DIR) return;
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(SHOT_DIR, name) });
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
    const matches = content.matchAll(/\.\/assets\/([a-zA-Z0-9_.-]+\.(?:webp|png|jpg))/g);
    for (const m of matches) {
      assetRefs.add(m[1]);
    }
  }

  const htmlContent = fs.readFileSync(path.join(PUBLIC_DIR, 'index.html'), 'utf8');
  assert(/\.\/style\.css\?v=hd(?:2[4-9]|[3-9]\d)/.test(htmlContent), 'index.html must reference ./style.css?v=hd24+');
  assert(/\.\/game\.js\?v=hd(?:4[8-9]|[5-9]\d)\b/.test(htmlContent), 'index.html must reference ./game.js?v=hd48+');
  for (const reqAsset of REQUIRED_AR9_ASSETS) {
    assert(
      new RegExp(`\\./assets/${reqAsset.replace('.', '\\.')}\\?v=hd(?:2[4-9]|[3-9]\\d)`).test(htmlContent),
      `index.html must reference ./assets/${reqAsset}?v=hd24+`
    );
  }

  const cssContent = fs.readFileSync(path.join(PUBLIC_DIR, 'style.css'), 'utf8');
  assert(/\?v=hd(?:2[4-9]|[3-9]\d)/.test(cssContent), 'style.css must bump asset cache-buster to ?v=hd24+');
  assert(!/\?v=hd23\b/.test(cssContent + htmlContent), 'Stale ?v=hd23 references must be bumped to hd24');

  const spritesContent = fs.readFileSync(path.join(PUBLIC_DIR, 'sprites.js'), 'utf8');
  assert(/\?v=hd(?:2[4-9]|[3-9]\d)/.test(spritesContent), 'sprites.js must reference ?v=hd24+');
  assert(/export function drawPressedFlowerDesk/.test(spritesContent), 'sprites.js must export drawPressedFlowerDesk');
  assert(/export function drawStargazeTelescopeProp/.test(spritesContent), 'sprites.js must export drawStargazeTelescopeProp');

  const gameContent = readGameSource(PUBLIC_DIR);
  assert(/\.\/sprites\.js\?v=hd(?:2[4-9]|[3-9]\d)/.test(gameContent), 'game.js must import ./sprites.js?v=hd24+');
  assert(/\.\/audio\.js\?v=hd(?:2[4-9]|[3-9]\d)/.test(gameContent), 'game.js must import ./audio.js?v=hd24+');
  assert(/\.\/vision\.js\?v=hd(?:2[4-9]|[3-9]\d)/.test(gameContent), 'game.js must import ./vision.js?v=hd24+');

  for (const reqAsset of REQUIRED_AR9_ASSETS) {
    assert(assetRefs.has(reqAsset), `Required AR-9 asset ${reqAsset} is not referenced in code`);
  }
  for (const asset of assetRefs) {
    const full = path.join(PUBLIC_DIR, 'assets', asset);
    assert(fs.existsSync(full), `Missing asset on disk: ${full}`);
    assert(fs.statSync(full).size > 0, `Empty asset on disk: ${full}`);
  }

  // 零暗黑赛博 / 霓虹：AR-9 样式段内不得出现深色背景或霓虹色关键字
  const ar9CssStart = cssContent.indexOf('AR-9 奶油手账干花标本压花册');
  assert(ar9CssStart > 0, 'style.css must contain the AR-9 section');
  const ar9Css = cssContent.slice(ar9CssStart);
  assert(!/neon|#0{3,6}\b|#000\b|#111|#1[0-9a-f]{5}\b|rgba?\(\s*(?:[0-5]?\d)\s*,\s*(?:[0-5]?\d)\s*,\s*(?:[0-9]?\d)\s*[,)]/i.test(ar9Css),
    'AR-9 CSS must not contain near-black / neon colors');

  console.log(
    `[STATIC PASS] ${jsFiles.length} JS modules syntax-checked, ${assetRefs.size} assets verified on disk (including all 6 AR-9 images), ?v=hd24/hd48 synced, 0 inline <svg>, 0 Emoji, 0 dark/neon colors in AR-9 CSS.`
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

async function getAr9State(page) {
  return page.evaluate(() => window.__AR9_DEBUG__.getState());
}

// 按 UI 完整走一局观星：对准星空 -> 按序点星 -> 选择正确星座
async function playStargazeViaUi(page, { chartId = '' } = {}) {
  if (chartId) {
    await page.click(`#star-chart-grid [data-chart-id="${chartId}"]`);
  } else {
    await page.click('#btn-telescope-start');
  }
  await page.waitForTimeout(90);
  const run = await page.evaluate(() => window.__AR9_DEBUG__.getStargazeRun());
  assert.equal(run.phase, 'connect', `Stargaze session must start in connect phase, got ${run.phase}`);
  const consts = await page.evaluate(() => window.__AR9_DEBUG__.getConstellations());
  const spec = consts.find((c) => c.id === run.targetId);
  assert(spec, `Unknown stargaze target ${run.targetId}`);
  for (let i = 0; i < spec.stars.length; i++) {
    await page.click(`#telescope-sky-stars [data-star-key="c${i}"]`);
    await page.waitForTimeout(40);
  }
  const afterLink = await page.evaluate(() => window.__AR9_DEBUG__.getStargazeRun());
  assert.equal(afterLink.phase, 'identify', `All stars linked must enter identify phase for ${spec.id}`);
  assert.equal(afterLink.options.length, 3, 'Identify step must offer 3 constellation options');
  assert(afterLink.options.includes(spec.id), 'Identify options must include the correct constellation');
  await page.click(`#telescope-identify-grid [data-option-id="${spec.id}"]`);
  await page.waitForTimeout(90);
  const done = await page.evaluate(() => window.__AR9_DEBUG__.getStargazeRun());
  assert.equal(done.phase, 'done', `Picking the correct option must complete the session for ${spec.id}`);
  return { spec, done };
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

    await page.goto(url, { waitUntil: 'load' });
    await page.waitForTimeout(420);
    assert.equal(pageErrors.length, 0, `Page errors on load: ${pageErrors.join('; ')}`);
    assert.equal(consoleErrors.length, 0, `Console errors on load: ${consoleErrors.join('; ')}`);

    // 0. DOM Emoji / 奶油手账配色 (#FFFDF8) / 6 张 AR-9 贴图加载审计
    const initialAudit = await page.evaluate(async (ar9Assets) => {
      const text = document.body.innerText || '';
      const brokenImgs = Array.from(document.querySelectorAll('img'))
        .filter((img) => {
          const src = img.getAttribute('src') || '';
          return src.startsWith('./assets/') && (!img.complete || img.naturalWidth === 0);
        })
        .map((img) => img.getAttribute('src'));
      const domAr9Imgs = Array.from(document.querySelectorAll('img')).filter((img) =>
        ar9Assets.some((a) => (img.getAttribute('src') || '').includes(a))
      );
      const loadReport = {};
      for (const file of ar9Assets) {
        const img = new Image();
        img.src = `./assets/${file}?v=hd24`;
        await new Promise((res, rej) => {
          if (img.complete && img.naturalWidth > 0) res();
          else {
            img.onload = () => res();
            img.onerror = () => rej(new Error(`Failed to decode ${file}`));
          }
        });
        loadReport[file] = { w: img.naturalWidth, h: img.naturalHeight };
      }
      const skyBg = getComputedStyle(document.getElementById('telescope-sky')).backgroundImage;
      return {
        hasEmoji: /\p{Extended_Pictographic}/u.test(text),
        brokenImgs,
        domAr9ImgCount: domAr9Imgs.length,
        domAr9Loaded: domAr9Imgs.every((img) => img.complete && img.naturalWidth > 0),
        loadReport,
        pressedBg: getComputedStyle(document.getElementById('pressed-flower-card')).backgroundImage,
        telescopeBg: getComputedStyle(document.getElementById('telescope-card')).backgroundImage,
        skyBg,
        careBtnCount: document.querySelectorAll('#pet-care-bar .care-btn').length,
        overflowX: document.documentElement.scrollWidth - window.innerWidth,
        overflowY: document.documentElement.scrollHeight - window.innerHeight
      };
    }, REQUIRED_AR9_ASSETS);

    assert.equal(initialAudit.hasEmoji, false, 'Visible DOM must contain zero Emoji characters');
    assert.equal(initialAudit.brokenImgs.length, 0, `Broken ./assets/ images: ${initialAudit.brokenImgs.join(', ')}`);
    assert(initialAudit.domAr9ImgCount >= 12, `Expected >= 12 AR-9 <img> in DOM, got ${initialAudit.domAr9ImgCount}`);
    assert.equal(initialAudit.domAr9Loaded, true, 'Every AR-9 <img> in DOM must load (naturalWidth > 0)');
    for (const [file, info] of Object.entries(initialAudit.loadReport)) {
      assert(info.w > 0 && info.h > 0, `AR-9 image ${file} must decode with naturalWidth > 0, got ${JSON.stringify(info)}`);
    }
    assert(initialAudit.careBtnCount >= CARE_BTN_COUNT, `Expected >= ${CARE_BTN_COUNT} dock buttons, got ${initialAudit.careBtnCount}`);
    assert(initialAudit.overflowX <= 0 && initialAudit.overflowY <= 0, `Desktop 1440x900 overflow: ${JSON.stringify(initialAudit)}`);
    assert(/255,\s*253,\s*248/.test(initialAudit.pressedBg), `#pressed-flower-card must use cream #FFFDF8, got ${initialAudit.pressedBg}`);
    assert(/255,\s*253,\s*248/.test(initialAudit.telescopeBg), `#telescope-card must use cream #FFFDF8, got ${initialAudit.telescopeBg}`);
    // 星空视野全部为浅色（零暗黑夜空）：解析所有 rgb 颜色，任一不透明色的最暗通道均需 >= 150
    const skyColors = Array.from(initialAudit.skyBg.matchAll(/rgba?\(([^)]+)\)/g)).map((m) =>
      m[1].split(',').map((v) => Number(v.trim()))
    );
    assert(skyColors.length >= 4, `Expected layered gradients on #telescope-sky, got ${initialAudit.skyBg}`);
    for (const [r, g, b, a = 1] of skyColors) {
      if (a < 0.2) continue;
      assert(Math.min(r, g, b) >= 150, `#telescope-sky must stay cream/pastel (no dark night), got rgb(${r},${g},${b})`);
    }

    // 1. 17 个浮层互斥：打开任意一个只保留它自己
    const panelTriggers = [
      { btn: '#hud-ambience-pill', key: 'windowAmbience' },
      { btn: '#btn-pomodoro', key: 'pomodoro' },
      { btn: '#btn-teatime', key: 'teatime' },
      { btn: '#btn-weekly-journal', key: 'weeklyJournal' },
      { btn: '#btn-terrarium', key: 'terrarium' },
      { btn: '#btn-musicbox', key: 'goodnightMusicbox' },
      { btn: '#btn-collage-frame', key: 'collageFrame' },
      { btn: '#btn-cozy-radio', key: 'cozyRadio' },
      { btn: '#btn-crochet-basket', key: 'crochetBasket' },
      { btn: '#btn-hot-cocoa', key: 'hotCocoa' },
      { btn: '#btn-pressed-flowers', key: 'pressedFlowers' },
      { btn: '#btn-telescope', key: 'telescope' },
      { btn: '#btn-pressed-flowers', key: 'pressedFlowers' },
      { btn: '#btn-crochet-basket', key: 'crochetBasket' },
      { btn: '#btn-telescope', key: 'telescope' },
      { btn: '#btn-chat-topic', key: 'topic' },
      { btn: '#btn-shop', key: 'drawer' }
    ];
    for (const step of panelTriggers) {
      await page.click(step.btn);
      await page.waitForTimeout(130);
      const panels = (await getAr9State(page)).openPanels;
      const openNames = Object.entries(panels)
        .filter(([, isOpen]) => isOpen)
        .map(([k]) => k);
      assert.deepEqual(openNames, [step.key], `Opening ${step.btn} must keep ONLY ${step.key} open, got: ${JSON.stringify(openNames)}`);
    }

    // 装扮抽屉 AR-9 快捷入口
    await page.click('#btn-pressed-flowers');
    await page.waitForTimeout(150);
    let afterShortcut = (await getAr9State(page)).openPanels;
    assert.equal(afterShortcut.pressedFlowers, true, 'The pressed-flower tile in the memory book must open #pressed-flower-card');
    assert.equal(afterShortcut.drawer, false, 'Drawer must close when #pressed-flower-card opens');
    await page.click('#btn-shop');
    await page.waitForTimeout(140);
    await page.click('[data-ar9-shortcut="telescope"]');
    await page.waitForTimeout(150);
    afterShortcut = (await getAr9State(page)).openPanels;
    assert.equal(afterShortcut.telescope, true, 'Dress drawer telescope shortcut must open #telescope-card');
    assert.equal(afterShortcut.drawer, false, 'Drawer must close when #telescope-card opens');

    // 2. 干花标本压花册
    await page.click('#btn-pressed-flowers');
    await page.waitForTimeout(150);
    const beforePressed = await getAr9State(page);
    assert.deepEqual(beforePressed.pressedFlowers.petals, { sakura: 2, ginkgo: 2, babysbreath: 2 }, 'Fresh save starts with 2/2/2 petals');
    assert.equal(beforePressed.pressedBlessing.active, false, 'Lucky Regen blessing starts inactive');
    assert.equal(beforePressed.pressedDeskVisual.displayed, false, 'No bookmarks on desk before first press');
    assert.equal(await page.locator('#pressed-summary-pill').textContent(), '压花 Lv.0/9');

    // 今日拾花 +2/+2/+2
    await page.click('#btn-pressed-daily-gather');
    await page.waitForTimeout(130);
    const afterDaily = await getAr9State(page);
    assert.deepEqual(afterDaily.pressedFlowers.petals, { sakura: 4, ginkgo: 4, babysbreath: 4 }, 'Daily gather must add 2 of each petal');
    assert.equal(await page.evaluate(() => document.getElementById('btn-pressed-daily-gather').disabled), true, 'Daily gather must disable after claim');
    const dailyAgain = await page.evaluate(() => window.__AR9_DEBUG__.claimDailyPetals());
    assert.equal(dailyAgain.ok, false, 'Daily gather must not be claimable twice on the same day');

    // 花房照料掉落花材（樱瓣 -> 银杏 -> 满天星轮换）
    await page.click('#btn-terrarium');
    await page.waitForTimeout(140);
    await page.click('#btn-plant-water');
    await page.waitForTimeout(140);
    const afterCareDrop = await getAr9State(page);
    assert.equal(afterCareDrop.pressedFlowers.careDropCount, 1, 'Terrarium care must drop one petal');
    assert.equal(afterCareDrop.pressedFlowers.petals.sakura, 5, 'First terrarium petal drop must be a sakura petal');

    // 压制樱瓣书签 Lv.1（UI 按钮）
    await page.click('#btn-pressed-flowers');
    await page.waitForTimeout(140);
    await page.click('#btn-pressed-press');
    await page.waitForTimeout(170);
    const afterFirstPress = await getAr9State(page);
    assert.equal(afterFirstPress.pressedFlowers.bookmarks.sakura.level, 1, 'Sakura bookmark must reach Lv.1');
    assert.equal(afterFirstPress.pressedFlowers.petals.sakura, 3, 'Pressing Lv.1 consumes 2 sakura petals');
    assert.equal(afterFirstPress.pressedBlessing.active, true, 'Pressing a bookmark activates Lucky Regen blessing');
    assert.equal(afterFirstPress.pressedDeskVisual.displayed, true, 'Pressed bookmark must appear on the wooden desk');
    assert.deepEqual(afterFirstPress.pressedDeskVisual.items.map((i) => i.id), ['sakura'], 'Desk shows the sakura bookmark');
    assert(afterFirstPress.coins >= afterCareDrop.coins + 22, 'Gifting a pressed bookmark must award coins');
    assert(afterFirstPress.level > afterCareDrop.level || afterFirstPress.xp > afterCareDrop.xp, 'Gifting must award affection EXP');
    assert(afterFirstPress.emote.includes('樱瓣书签'), `Expected sakura bookmark reaction, got: ${afterFirstPress.emote}`);
    assert.equal(afterFirstPress.journalSummary.presses7d, 1, 'Weekly journal must record the press');
    assert.equal(
      await page.evaluate(() => !document.getElementById('pressed-flower-pill').classList.contains('hidden')),
      true,
      '#pressed-flower-pill must appear in HUD while the blessing is active'
    );

    // 花束 12 金 +1/+1/+1
    const coinsBeforePack = afterFirstPress.coins;
    await page.click('#btn-pressed-flower-pack');
    await page.waitForTimeout(120);
    const afterPack = await getAr9State(page);
    assert.equal(afterPack.coins, coinsBeforePack - 12, 'Flower pack must cost 12 coins');
    assert.deepEqual(afterPack.pressedFlowers.petals, { sakura: 4, ginkgo: 5, babysbreath: 5 }, 'Flower pack must add 1 of each petal');

    // 补齐花材并把三枚书签都升到 Lv.3
    await page.evaluate(() => window.__AR9_DEBUG__.addPetalsForTest(12));
    for (let i = 0; i < 2; i++) {
      await page.click('#btn-pressed-press');
      await page.waitForTimeout(90);
    }
    for (const bid of ['ginkgo', 'babysbreath']) {
      await page.click(`#pressed-bookmark-grid [data-bookmark-id="${bid}"]`);
      await page.waitForTimeout(80);
      for (let i = 0; i < 3; i++) {
        await page.click('#btn-pressed-press');
        await page.waitForTimeout(90);
      }
    }
    const maxPress = await page.evaluate(() => window.__AR9_DEBUG__.pressBookmark('ginkgo'));
    assert.equal(maxPress.reason, 'max_level', 'Lv.3 bookmark cannot be pressed further');

    // 木桌陈列开关
    await page.click('#btn-pressed-display-toggle');
    await page.waitForTimeout(90);
    const deskOff = await getAr9State(page);
    assert.equal(deskOff.pressedDeskVisual.displayed, false, 'Desk toggle must hide bookmarks');
    const regenWithoutDesk = deskOff.pressedBlessing.hpRegenPerSec;
    await page.click('#btn-pressed-display-toggle');
    await page.waitForTimeout(90);
    // 轻抚书签
    await page.click('#pressed-bookmark-grid [data-bookmark-id="sakura"]');
    await page.waitForTimeout(80);
    await page.click('#btn-pressed-gift');
    await page.waitForTimeout(120);

    const fullPressed = await getAr9State(page);
    const pb = fullPressed.pressedBlessing;
    assert.equal(pb.totalLevel, 9, 'All 3 bookmarks at Lv.3 must reach 9/9');
    assert.equal(fullPressed.pressedDeskVisual.displayed, true, 'Desk toggle must restore bookmarks');
    assert.equal(fullPressed.pressedDeskVisual.items.length, 3, 'Desk shows all 3 bookmarks');
    assert(pb.hpRegenPerSec > regenWithoutDesk, 'Desk display must add extra regen');
    assert.equal(pb.luckyDropBonus, 0.164, `Expected 9/9 lucky drop 0.164, got ${pb.luckyDropBonus}`);
    assert.equal(pb.hpRegenPerSec, 1.5, `Expected 9/9 regen 1.5/s, got ${pb.hpRegenPerSec}`);
    assert.equal(pb.coinLuckPct, 0.156, `Expected 9/9 coin luck 0.156, got ${pb.coinLuckPct}`);
    assert(fullPressed.pressedFlowers.bookmarks.sakura.strokes >= 4, 'Caressing a bookmark must count strokes');
    assert.equal(await page.locator('#pressed-summary-pill').textContent(), '压花 Lv.9/9');
    assert(fullPressed.journalSummary.presses7d >= 9, `Expected presses7d >= 9, got ${fullPressed.journalSummary.presses7d}`);

    await page.waitForTimeout(400);
    await shot(page, 'desktop_1440x900_pressed_flowers.png');

    // 刷新后持久化
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(340);
    const reloadedPressed = await getAr9State(page);
    assert.equal(reloadedPressed.pressedBlessing.totalLevel, 9, 'Pressed 9/9 must persist across reload');
    assert.equal(reloadedPressed.pressedDeskVisual.displayed, true, 'Desk display must persist across reload');
    assert.deepEqual(reloadedPressed.pressedFlowers.petals, fullPressed.pressedFlowers.petals, 'Petal stock must persist across reload');

    // 幸存者班次「幸运再生佑护」
    await page.click('#btn-pressed-flowers');
    await page.waitForTimeout(140);
    await page.click('#btn-pressed-go-shift');
    await page.waitForTimeout(240);
    const survPressed = await getAr9State(page);
    const smP = survPressed.survivorMetrics;
    assert.equal(survPressed.gameMode, 'survivor');
    assert(
      smP.effectiveLuckyDropBonus >= smP.botanicalBlessings.treasureDropBonus + 0.164 - 1e-6,
      `Lucky drop must include pressed-flower bonus, got ${smP.effectiveLuckyDropBonus}`
    );
    assert(
      smP.effectiveHpRegenPerSec >= smP.botanicalBlessings.hpRegenPerSec + 1.5 - 0.01,
      `HP regen must include pressed-flower regen, got ${smP.effectiveHpRegenPerSec}`
    );
    assert(smP.coinMult >= (1 + smP.botanicalBlessings.luckCoinPct) * 1.156 - 0.001, `Coin mult must include coin luck, got ${smP.coinMult}`);
    const stripHasPressed = await page.evaluate(() => {
      const strip = document.getElementById('surv-skill-strip');
      return Boolean(strip && !strip.classList.contains('hidden') && strip.innerHTML.includes('ui_btn_pressed_flowers.webp'));
    });
    assert(stripHasPressed, 'Survivor skill strip must show the ui_btn_pressed_flowers.webp badge');
    // 真实再生：体力降到一半后应持续回升
    const hpLow = await page.evaluate(() => window.__AR9_DEBUG__.setHpForTest(window.__AR9_DEBUG__.getState().maxHp * 0.5));
    await page.waitForTimeout(700);
    const hpAfterRegen = (await getAr9State(page)).hp;
    assert(hpAfterRegen > hpLow + 0.5, `Lucky Regen must actually restore HP in survivor (${hpLow} -> ${hpAfterRegen})`);

    await page.click('.mode-btn[data-mode="pet"]');
    await page.waitForTimeout(220);

    // 3. 窗畔星夜天文望远镜
    await page.click('#btn-telescope');
    await page.waitForTimeout(150);
    const beforeTele = await getAr9State(page);
    assert.equal(Object.keys(beforeTele.telescope.constellations).length, 0, 'Star chart starts empty');
    assert.equal(beforeTele.starGuidance.active, false, 'Star guidance starts inactive');
    assert.equal(await page.locator('#telescope-codex-pill').textContent(), '星图 0/6');

    await page.click('#btn-telescope-start');
    await page.waitForTimeout(120);
    let run = await page.evaluate(() => window.__AR9_DEBUG__.getStargazeRun());
    assert.equal(run.targetId, 'summer_triangle', 'First session targets the first uncollected constellation');
    const skyCounts = await page.evaluate(() => ({
      stars: document.querySelectorAll('#telescope-sky-stars .tele-star:not(.is-decoy)').length,
      decoys: document.querySelectorAll('#telescope-sky-stars .tele-star.is-decoy').length,
      lines: document.querySelectorAll('#telescope-sky-lines .tele-line').length
    }));
    assert.equal(skyCounts.stars, 3, 'Summer Triangle shows 3 numbered stars');
    assert(skyCounts.decoys >= 4, `Expected >= 4 decoy stars, got ${skyCounts.decoys}`);
    assert.equal(skyCounts.lines, 3, 'Summer Triangle has 3 edges');
    assert.equal(await getAr9State(page).then((s) => s.isStargazing), true, 'Pet must hold the telescope prop while stargazing');

    // 点错：先点干扰星，再跳号点第 2 颗
    await page.click('#telescope-sky-stars [data-star-key="d0"]');
    await page.waitForTimeout(60);
    await page.click('#telescope-sky-stars [data-star-key="c1"]');
    await page.waitForTimeout(60);
    run = await page.evaluate(() => window.__AR9_DEBUG__.getStargazeRun());
    assert.equal(run.nextIdx, 0, 'Wrong taps must not advance the link order');
    assert.equal(run.mistakes, 2, 'Wrong taps must be counted as mistakes');
    for (let i = 0; i < 3; i++) {
      await page.click(`#telescope-sky-stars [data-star-key="c${i}"]`);
      await page.waitForTimeout(50);
    }
    run = await page.evaluate(() => window.__AR9_DEBUG__.getStargazeRun());
    assert.equal(run.phase, 'identify', 'Linking all stars in order enters identify phase');
    const linkedLines = await page.evaluate(() => document.querySelectorAll('#telescope-sky-lines .tele-line.is-linked').length);
    assert.equal(linkedLines, 3, 'All 3 edges must be drawn after linking');
    const wrongOpt = run.options.find((o) => o !== run.targetId);
    await page.click(`#telescope-identify-grid [data-option-id="${wrongOpt}"]`);
    await page.waitForTimeout(80);
    assert.equal(
      await page.evaluate((id) => document.querySelector(`#telescope-identify-grid [data-option-id="${id}"]`).disabled, wrongOpt),
      true,
      'Wrong constellation option must be disabled after picking'
    );
    const coinsBeforeFirstStar = (await getAr9State(page)).coins;
    await page.click(`#telescope-identify-grid [data-option-id="${run.targetId}"]`);
    await page.waitForTimeout(140);
    const afterFirstStar = await getAr9State(page);
    assert.equal(afterFirstStar.stargazeRun.phase, 'done');
    assert.equal(afterFirstStar.telescope.constellations.summer_triangle.count, 1, 'Summer Triangle must be recorded');
    assert.equal(afterFirstStar.telescope.constellations.summer_triangle.bestMistakes, 3, 'Mistakes are recorded on the chart');
    assert(afterFirstStar.coins >= coinsBeforeFirstStar + 30, 'First discovery awards >= 30 coins');
    assert(afterFirstStar.emote.includes('夏季大三角'), `Expected Summer Triangle reaction, got: ${afterFirstStar.emote}`);
    assert.equal(afterFirstStar.journalSummary.stargazes7d, 1, 'Weekly journal records the stargaze');
    assert(
      afterFirstStar.ar9Audio.stargazeNoteCount >= 3 && afterFirstStar.ar9Audio.stargazeChimeCount >= 1,
      `Expected WebAudio star-link notes + chime, got ${JSON.stringify(afterFirstStar.ar9Audio)}`
    );
    assert.equal(
      await page.evaluate(() => !document.getElementById('star-chart-pill').classList.contains('hidden')),
      true,
      '#star-chart-pill must appear once a constellation is collected'
    );
    assert.equal(
      await page.evaluate(() => document.querySelectorAll('#star-chart-grid .star-chart-slot.collected').length),
      1,
      'Star chart card must mark 1 collected constellation'
    );

    // 剩余 5 座全部通过 UI 收录
    for (let k = 0; k < 5; k++) {
      await playStargazeViaUi(page);
    }
    const allStars = await getAr9State(page);
    assert.equal(allStars.starGuidance.count, 6, 'All 6 constellations must be collected');
    assert.equal(allStars.starGuidance.critChanceBonus, 0.1, `Expected 6/6 crit bonus 0.10, got ${allStars.starGuidance.critChanceBonus}`);
    assert.equal(allStars.starGuidance.gemMagnetPct, 0.2, `Expected 6/6 magnet bonus 0.20, got ${allStars.starGuidance.gemMagnetPct}`);
    assert.equal(await page.locator('#telescope-codex-pill').textContent(), '星图 6/6');
    assert(allStars.ar9Audio.stargazeWebAudioNodes >= 6 * 6, `Expected >= 36 WebAudio nodes, got ${JSON.stringify(allStars.ar9Audio)}`);

    // 星图卡片点选重温猎户座（零失误）
    const { done: orionDone } = await playStargazeViaUi(page, { chartId: 'orion' });
    assert.equal(orionDone.targetId, 'orion', 'Tapping a star-chart slot must re-observe that constellation');
    const afterOrion = await getAr9State(page);
    assert.equal(afterOrion.telescope.constellations.orion.count, 2, 'Re-observing must increase the count');
    assert(afterOrion.telescope.perfectSessions >= 6, `Expected >= 6 perfect sessions, got ${afterOrion.telescope.perfectSessions}`);

    // 连线几何：每条连线长度与两端星星中心距离一致（固定宽高比换算正确）
    const lineGeom = await page.evaluate(() => {
      const res = [];
      document.querySelectorAll('#telescope-sky-lines .tele-line').forEach((ln) => {
        const a = document.querySelector(`#telescope-sky-stars [data-star-key="c${ln.dataset.edgeA}"]`).getBoundingClientRect();
        const b = document.querySelector(`#telescope-sky-stars [data-star-key="c${ln.dataset.edgeB}"]`).getBoundingClientRect();
        const dist = Math.hypot(a.left + a.width / 2 - (b.left + b.width / 2), a.top + a.height / 2 - (b.top + b.height / 2));
        res.push({ len: ln.offsetWidth, dist, linked: ln.classList.contains('is-linked') });
      });
      return res;
    });
    assert.equal(lineGeom.length, 7, 'Orion has 7 edges');
    for (const g of lineGeom) {
      assert(g.linked, 'All Orion edges are linked after completion');
      assert(Math.abs(g.len - g.dist) <= 3, `Line length ${g.len} must match star distance ${g.dist}`);
    }

    await page.waitForTimeout(300);
    await shot(page, 'desktop_1440x900_telescope.png');

    // 七日心情周报联动
    await page.click('#btn-weekly-journal');
    await page.waitForTimeout(180);
    const journalAudit = await page.evaluate(() => ({
      summary: window.__AR9_DEBUG__.getState().journalSummary,
      cardText: document.getElementById('weekly-journal-card')?.textContent || ''
    }));
    assert(journalAudit.summary.stargazes7d >= 7, `Expected stargazes7d >= 7, got ${journalAudit.summary.stargazes7d}`);
    assert(journalAudit.summary.presses7d >= 9, `Expected presses7d >= 9, got ${journalAudit.summary.presses7d}`);
    assert.equal(journalAudit.summary.cumulative.constellationsCollected, 6);
    assert.equal(journalAudit.summary.cumulative.pressedTotalLevel, 9);
    assert(
      journalAudit.cardText.includes('观星') && journalAudit.cardText.includes('压花') && journalAudit.cardText.includes('星图 6/6'),
      `Weekly journal card must render 观星 / 压花 / 星图 metrics, got ${journalAudit.cardText}`
    );

    // 刷新后星图持久化
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(320);
    const reloadedTele = await getAr9State(page);
    assert.equal(Object.keys(reloadedTele.telescope.constellations).length, 6, 'Star chart 6/6 must persist across reload');
    assert.equal(reloadedTele.telescope.totalSessions, 7, 'Stargaze session count must persist across reload');
    assert.equal(reloadedTele.stargazeRun.phase, 'idle', 'In-progress stargaze state is runtime only');

    // 幸存者班次「星辉指引」
    await page.click('#btn-telescope');
    await page.waitForTimeout(140);
    await page.click('#btn-telescope-go-shift');
    await page.waitForTimeout(240);
    const survTele = await getAr9State(page);
    const smT = survTele.survivorMetrics;
    assert.equal(survTele.gameMode, 'survivor');
    assert(
      smT.effectiveCritChance >= Math.min(0.85, 0.18 + smT.botanicalBlessings.critChanceBonus + 0.1) - 1e-6,
      `Crit chance must include star guidance, got ${smT.effectiveCritChance}`
    );
    assert(
      smT.magnetMult >= (1 + smT.botanicalBlessings.magnetPct) * 1.2 - 0.001,
      `Gem magnet must include star guidance, got ${smT.magnetMult}`
    );
    const stripHasTele = await page.evaluate(() => {
      const strip = document.getElementById('surv-skill-strip');
      return Boolean(strip && !strip.classList.contains('hidden') && strip.innerHTML.includes('ui_btn_telescope.webp'));
    });
    assert(stripHasTele, 'Survivor skill strip must show the ui_btn_telescope.webp badge');
    await page.click('.mode-btn[data-mode="pet"]');
    await page.waitForTimeout(220);

    // 桌面 1440x900 船坞零挤压
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

    // 4. 移动端 390x844（竖屏强制横置）与 844x390
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);
    await page.evaluate(() => document.getElementById('btn-pressed-flowers').click());
    await page.waitForTimeout(240);
    const portraitPressed = await page.evaluate(() => ({
      overflowX: document.documentElement.scrollWidth - window.innerWidth,
      overflowY: document.documentElement.scrollHeight - window.innerHeight,
      open: !document.getElementById('pressed-flower-card').classList.contains('hidden'),
      hasEmoji: /\p{Extended_Pictographic}/u.test(document.body.innerText || '')
    }));
    assert(portraitPressed.open, '#pressed-flower-card must open on 390x844');
    assert.equal(portraitPressed.hasEmoji, false, 'Zero Emoji on 390x844');
    assert(portraitPressed.overflowX <= 0 && portraitPressed.overflowY <= 0, `390x844 pressed overflow: ${JSON.stringify(portraitPressed)}`);
    await shot(page, 'mobile_390x844_pressed_flowers.png');

    await page.evaluate(() => document.getElementById('btn-telescope').click());
    await page.waitForTimeout(220);
    // 旋转舞台下也能真实点星
    await page.click('#btn-telescope-start');
    await page.waitForTimeout(120);
    await page.click('#telescope-sky-stars [data-star-key="c0"]');
    await page.waitForTimeout(80);
    const portraitRun = await page.evaluate(() => window.__AR9_DEBUG__.getStargazeRun());
    assert.equal(portraitRun.nextIdx, 1, `Tapping star 1 must link it on 390x844 (rotated stage), got ${JSON.stringify(portraitRun)}`);
    const portraitTele = await page.evaluate(() => ({
      overflowX: document.documentElement.scrollWidth - window.innerWidth,
      overflowY: document.documentElement.scrollHeight - window.innerHeight,
      teleOpen: !document.getElementById('telescope-card').classList.contains('hidden'),
      pressedOpen: !document.getElementById('pressed-flower-card').classList.contains('hidden')
    }));
    assert(portraitTele.teleOpen && !portraitTele.pressedOpen, '#telescope-card must open on 390x844 and close #pressed-flower-card');
    assert(portraitTele.overflowX <= 0 && portraitTele.overflowY <= 0, `390x844 telescope overflow: ${JSON.stringify(portraitTele)}`);
    await shot(page, 'mobile_390x844_telescope.png');

    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(260);
    await page.click('#btn-telescope');
    if (await page.evaluate(() => document.getElementById('telescope-card').classList.contains('hidden'))) {
      await page.click('#btn-telescope');
    }
    await page.waitForTimeout(200);
    const landscapeAudit = await page.evaluate(() => {
      const prof = document.querySelector('.hud-profile-card').getBoundingClientRect();
      const sw = document.getElementById('mode-switcher').getBoundingClientRect();
      const hr = document.querySelector('.hud-right').getBoundingClientRect();
      const joy = document.getElementById('joystick-zone').getBoundingClientRect();
      const care = document.getElementById('pet-care-bar').getBoundingClientRect();
      const act = document.querySelector('.action-zone').getBoundingClientRect();
      const tc = document.getElementById('telescope-card').getBoundingClientRect();
      const pills = Array.from(document.querySelectorAll('#hud-ambience-row > button'))
        .filter((b) => !b.classList.contains('hidden'))
        .map((b) => b.getBoundingClientRect());
      const pillBottom = pills.reduce((m, r) => Math.max(m, r.bottom), 0);
      return {
        overflowX: document.documentElement.scrollWidth - window.innerWidth,
        overflowY: document.documentElement.scrollHeight - window.innerHeight,
        teleOpen: !document.getElementById('telescope-card').classList.contains('hidden'),
        careBtnCount: document.querySelectorAll('#pet-care-bar .care-btn').length,
        profileRight: prof.right,
        teleLeft: tc.left,
        teleBottom: tc.bottom,
        actTop: act.top,
        switcherRight: sw.right,
        hudRightLeft: hr.left,
        joyTop: joy.top,
        joyRight: joy.right,
        careLeft: care.left,
        careRight: care.right,
        actLeft: act.left,
        pillBottom
      };
    });
    assert(landscapeAudit.teleOpen, 'Telescope card must be open on 844x390');
    assert(landscapeAudit.careBtnCount >= CARE_BTN_COUNT, `Expected >= ${CARE_BTN_COUNT} dock buttons on 844x390`);
    assert(landscapeAudit.overflowX <= 0 && landscapeAudit.overflowY <= 0, `844x390 overflow: ${JSON.stringify(landscapeAudit)}`);
    assert(landscapeAudit.profileRight <= landscapeAudit.teleLeft, `Telescope card overlaps profile on 844x390: ${JSON.stringify(landscapeAudit)}`);
    assert(landscapeAudit.teleBottom <= landscapeAudit.actTop + 2, `Telescope card overlaps action zone on 844x390: ${JSON.stringify(landscapeAudit)}`);
    assert(landscapeAudit.switcherRight <= landscapeAudit.hudRightLeft + 2, `Top HUD overlap on 844x390: ${JSON.stringify(landscapeAudit)}`);
    assert(
      landscapeAudit.joyRight <= landscapeAudit.careLeft + 2 && landscapeAudit.careRight <= landscapeAudit.actLeft + 2,
      `Bottom ${CARE_BTN_COUNT}-button dock overlap on 844x390: ${JSON.stringify(landscapeAudit)}`
    );
    assert(landscapeAudit.pillBottom <= landscapeAudit.joyTop + 2, `HUD pills overlap joystick on 844x390: ${JSON.stringify(landscapeAudit)}`);
    await shot(page, 'mobile_844x390_telescope.png');

    // 5. 旧存档 / 脏数据安全默认值
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate(() => {
      const raw = JSON.parse(localStorage.getItem('ar_deepseek_pet_v2') || '{}');
      delete raw.pressedFlowers;
      delete raw.telescope;
      localStorage.setItem('ar_deepseek_pet_v2', JSON.stringify(raw));
    });
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(300);
    const legacy = await getAr9State(page);
    assert.deepEqual(legacy.pressedFlowers.petals, { sakura: 2, ginkgo: 2, babysbreath: 2 }, 'Legacy save defaults to 2/2/2 petals');
    assert.equal(legacy.pressedBlessing.totalLevel, 0, 'Legacy save defaults to Lv.0 bookmarks');
    assert.deepEqual(legacy.telescope.constellations, {}, 'Legacy save defaults to empty star chart');
    assert.equal(legacy.journalSummary.stargazes7d >= 7, true, 'Journal history survives legacy migration');

    await page.evaluate(() => {
      const raw = JSON.parse(localStorage.getItem('ar_deepseek_pet_v2') || '{}');
      raw.pressedFlowers = {
        petals: { sakura: 'abc', ginkgo: -5 },
        bookmarks: { sakura: { level: 99 }, ginkgo: null },
        selectedBookmark: 'rose',
        deskDisplayed: 'yes'
      };
      raw.telescope = { constellations: { fake_star: { count: 3 }, orion: true, cygnus: { count: -2 } }, totalSessions: 'x' };
      localStorage.setItem('ar_deepseek_pet_v2', JSON.stringify(raw));
    });
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(300);
    const dirty = await getAr9State(page);
    assert.deepEqual(dirty.pressedFlowers.petals, { sakura: 0, ginkgo: 0, babysbreath: 2 }, 'Dirty petals must sanitize');
    assert.equal(dirty.pressedFlowers.bookmarks.sakura.level, 3, 'Dirty bookmark level must clamp to 3');
    assert.equal(dirty.pressedFlowers.bookmarks.ginkgo.level, 0, 'Null bookmark must default to Lv.0');
    assert.equal(dirty.pressedFlowers.selectedBookmark, 'sakura', 'Invalid selected bookmark falls back to sakura');
    assert.deepEqual(Object.keys(dirty.telescope.constellations).sort(), ['cygnus', 'orion'], 'Unknown constellations must be dropped');
    assert.equal(dirty.telescope.constellations.cygnus.count, 1, 'Invalid constellation count clamps to 1');
    assert.equal(dirty.telescope.totalSessions, 2, 'Invalid session total falls back to collected count');

    assert.equal(consoleErrors.length, 0, `Console errors observed: ${consoleErrors.join('; ')}`);
    assert.equal(pageErrors.length, 0, `Page errors observed: ${pageErrors.join('; ')}`);
    assert.equal(failedResponses.length, 0, `HTTP >= 400 responses observed: ${failedResponses.join('; ')}`);

    console.log(
      '[E2E PASS] AR-9 Cream-Journal Pressed Flower Album (daily gather + terrarium petal drops + flower pack + 3 bookmarks Lv.1~3 + wooden desk display + Survivor Lucky Regen) + Windowside Starry Telescope (ordered star linking + shape identification + 6-constellation star chart + WebAudio celesta + Weekly Journal sync + Survivor Star Guidance) passed across 1440x900, 390x844 and 844x390 with 0px overflow, safe legacy-save defaults and 0 errors!'
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
