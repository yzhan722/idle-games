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
const PORT = Number(process.env.AR8_PORT || 0);

const SHOT_CROCHET = process.env.AR8_DESKTOP_CROCHET_SHOT || '';
const SHOT_COCOA = process.env.AR8_DESKTOP_COCOA_SHOT || '';
const SHOT_PORTRAIT = process.env.AR8_MOBILE_PORTRAIT_SHOT || '';
const SHOT_LANDSCAPE = process.env.AR8_MOBILE_LANDSCAPE_SHOT || '';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.json': 'application/json; charset=utf-8'
};

const REQUIRED_AR8_ASSETS = [
  'ui_btn_crochet_basket.webp',
  'knit_whale_scarf.webp',
  'knit_star_coaster.webp',
  'knit_cloud_pillow.webp',
  'ui_btn_cocoa_bar.webp',
  'cocoa_marshmallow_topping.webp'
];

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
    const matches = content.matchAll(/\.\/assets\/([a-zA-Z0-9_.-]+\.(?:webp|png|jpg))/g);
    for (const m of matches) {
      assetRefs.add(m[1]);
    }
  }

  const htmlContent = fs.readFileSync(path.join(PUBLIC_DIR, 'index.html'), 'utf8');
  assert(/\.\/style\.css\?v=hd(?:2[3-9]|[3-9]\d)/.test(htmlContent), 'index.html must reference ./style.css?v=hd23+');
  assert(/\.\/game\.js\?v=hd(?:4[7-9]|[5-9]\d)\b/.test(htmlContent), 'index.html must reference ./game.js?v=hd47+');
  for (const reqAsset of REQUIRED_AR8_ASSETS) {
    assert(
      new RegExp(`\\./assets/${reqAsset.replace('.', '\\.')}\\?v=hd(?:2[3-9]|[3-9]\\d)`).test(htmlContent),
      `index.html must reference ./assets/${reqAsset}?v=hd23+`
    );
  }

  const cssContent = fs.readFileSync(path.join(PUBLIC_DIR, 'style.css'), 'utf8');
  assert(/\?v=hd(?:2[3-9]|[3-9]\d)/.test(cssContent), 'style.css must bump asset cache-buster to ?v=hd23+');

  const spritesContent = fs.readFileSync(path.join(PUBLIC_DIR, 'sprites.js'), 'utf8');
  assert(/\?v=hd(?:2[3-9]|[3-9]\d)/.test(spritesContent), 'sprites.js must reference ?v=hd23+');

  const gameContent = fs.readFileSync(path.join(PUBLIC_DIR, 'game.js'), 'utf8');
  assert(/\.\/sprites\.js\?v=hd(?:2[3-9]|[3-9]\d)/.test(gameContent), 'game.js must import ./sprites.js?v=hd23+');
  assert(/\.\/audio\.js\?v=hd(?:2[3-9]|[3-9]\d)/.test(gameContent), 'game.js must import ./audio.js?v=hd23+');
  assert(/\.\/vision\.js\?v=hd(?:2[3-9]|[3-9]\d)/.test(gameContent), 'game.js must import ./vision.js?v=hd23+');

  for (const reqAsset of REQUIRED_AR8_ASSETS) {
    assert(assetRefs.has(reqAsset), `Required AR-8 asset ${reqAsset} is not referenced in code`);
  }

  for (const asset of assetRefs) {
    const full = path.join(PUBLIC_DIR, 'assets', asset);
    assert(fs.existsSync(full), `Missing asset on disk: ${full}`);
    assert(fs.statSync(full).size > 0, `Empty asset on disk: ${full}`);
  }

  console.log(
    `[STATIC PASS] ${jsFiles.length} JS modules syntax-checked, ${assetRefs.size} assets verified on disk (including all 6 AR-8 icons), ?v=hd23/hd47 synced, 0 inline <svg>, 0 Emoji across HTML/CSS/JS.`
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
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
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

    // 0. DOM Emoji, warm cream-journal palette (#FFFDF8), broken-image & RGBA corner-alpha audit on all 6 AR-8 .webp icons
    const initialAudit = await page.evaluate(async (ar8Assets) => {
      const text = document.body.innerText || '';
      const hasEmoji = /\p{Extended_Pictographic}/u.test(text);
      const crochetBg = getComputedStyle(document.getElementById('crochet-basket-card')).backgroundImage;
      const cocoaBg = getComputedStyle(document.getElementById('hot-cocoa-card')).backgroundImage;
      const brokenImgs = Array.from(document.querySelectorAll('img'))
        .filter((img) => {
          const src = img.getAttribute('src') || '';
          return src.startsWith('./assets/') && (!img.complete || img.naturalWidth === 0);
        })
        .map((img) => img.getAttribute('src'));

      const alphaReport = {};
      for (const file of ar8Assets) {
        const img = new Image();
        img.src = `./assets/${file}?v=hd23`;
        await new Promise((res, rej) => {
          if (img.complete && img.naturalWidth > 0) res();
          else {
            img.onload = () => res();
            img.onerror = () => rej(new Error(`Failed to decode ${file}`));
          }
        });
        const cv = document.createElement('canvas');
        cv.width = img.naturalWidth;
        cv.height = img.naturalHeight;
        const c = cv.getContext('2d');
        c.drawImage(img, 0, 0);
        const corners = [
          c.getImageData(2, 2, 1, 1).data[3],
          c.getImageData(cv.width - 3, 2, 1, 1).data[3],
          c.getImageData(2, cv.height - 3, 1, 1).data[3],
          c.getImageData(cv.width - 3, cv.height - 3, 1, 1).data[3]
        ];
        alphaReport[file] = { w: cv.width, h: cv.height, corners };
      }

      return {
        hasEmoji,
        crochetBg,
        cocoaBg,
        brokenImgs,
        alphaReport,
        careBtnCount: document.querySelectorAll('#pet-care-bar .care-btn').length,
        overflowX: document.documentElement.scrollWidth - window.innerWidth,
        overflowY: document.documentElement.scrollHeight - window.innerHeight
      };
    }, REQUIRED_AR8_ASSETS);

    assert.equal(initialAudit.hasEmoji, false, 'Visible DOM must contain zero Emoji characters');
    assert.equal(initialAudit.brokenImgs.length, 0, `Broken ./assets/ images: ${initialAudit.brokenImgs.join(', ')}`);
    assert(initialAudit.careBtnCount >= 15, `Expected >= 15 cozy dock buttons in #pet-care-bar, got ${initialAudit.careBtnCount}`);
    assert(
      initialAudit.overflowX <= 0 && initialAudit.overflowY <= 0,
      `Desktop 1440x900 overflow: ${JSON.stringify(initialAudit)}`
    );
    assert(
      /255,\s*253,\s*248/i.test(initialAudit.crochetBg),
      `Expected warm cream #crochet-basket-card (#FFFDF8), got ${initialAudit.crochetBg}`
    );
    assert(
      /255,\s*253,\s*248/i.test(initialAudit.cocoaBg),
      `Expected warm cream #hot-cocoa-card (#FFFDF8), got ${initialAudit.cocoaBg}`
    );
    for (const [file, info] of Object.entries(initialAudit.alphaReport)) {
      assert.equal(info.w, 256, `Expected ${file} width 256, got ${info.w}`);
      assert.equal(info.h, 256, `Expected ${file} height 256, got ${info.h}`);
      assert.deepEqual(
        info.corners,
        [0, 0, 0, 0],
        `Expected ${file} 4 corners to be RGBA transparent [0,0,0,0], got ${JSON.stringify(info.corners)}`
      );
    }

    // 1. Verify Mutual Panel Non-Overlap across all 12 floating panels including Crochet Basket & Hot Cocoa Bar
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
      { btn: '#btn-chat-topic', key: 'topic' },
      { btn: '#btn-shop', key: 'drawer' }
    ];
    for (const step of panelTriggers) {
      await page.click(step.btn);
      await page.waitForTimeout(140);
      const panels = await page.evaluate(() => window.__AR8_DEBUG__.getState().openPanels);
      const openNames = Object.entries(panels)
        .filter(([, isOpen]) => isOpen)
        .map(([k]) => k);
      assert.deepEqual(
        openNames,
        [step.key],
        `Opening ${step.btn} must keep ONLY ${step.key} open, got: ${JSON.stringify(openNames)}`
      );
    }

    // Verify Dress Drawer & Food Drawer AR-8 shortcuts open #crochet-basket-card and #hot-cocoa-card cleanly
    await page.click('[data-ar8-shortcut="crochet"]');
    await page.waitForTimeout(150);
    let afterShortcut = await page.evaluate(() => window.__AR8_DEBUG__.getState().openPanels);
    assert.equal(afterShortcut.crochetBasket, true, 'Dress drawer crochet shortcut must open #crochet-basket-card');
    assert.equal(afterShortcut.drawer, false, 'Dress drawer must close when #crochet-basket-card opens');

    await page.click('#btn-shop');
    await page.waitForTimeout(140);
    await page.click('[data-ar8-shortcut="cocoa"]');
    await page.waitForTimeout(150);
    afterShortcut = await page.evaluate(() => window.__AR8_DEBUG__.getState().openPanels);
    assert.equal(afterShortcut.hotCocoa, true, 'Dress drawer cocoa shortcut must open #hot-cocoa-card');
    assert.equal(afterShortcut.drawer, false, 'Dress drawer must close when #hot-cocoa-card opens');

    await page.click('#btn-feed');
    await page.waitForTimeout(140);
    await page.click('[data-ar8-food-shortcut="cocoa"]');
    await page.waitForTimeout(150);
    afterShortcut = await page.evaluate(() => window.__AR8_DEBUG__.getState().openPanels);
    assert.equal(afterShortcut.hotCocoa, true, 'Food drawer cocoa shortcut must open #hot-cocoa-card');
    assert.equal(afterShortcut.drawer, false, 'Food drawer must close when #hot-cocoa-card opens');

    // 2. Verify Crochet Basket (#crochet-basket-card): Daily Free Yarn + Interactive Care Drop + 3 Keepsakes Lv.1~3 + Desk Display + Survivor Warm Guard
    await page.click('#btn-crochet-basket');
    await page.waitForTimeout(150);

    const beforeCrochet = await page.evaluate(() => window.__AR8_DEBUG__.getState());
    assert.equal(beforeCrochet.crochetBasket.yarnSkeins, 3, 'Initial cozy yarn skeins must be 3');
    assert.equal(beforeCrochet.crochetWarmGuard.active, false, 'Crochet Warm Guard starts inactive before first stitch');

    // Claim daily free yarn (+4)
    await page.click('#btn-crochet-daily-yarn');
    await page.waitForTimeout(140);
    const afterDailyYarn = await page.evaluate(() => window.__AR8_DEBUG__.getState());
    assert.equal(afterDailyYarn.crochetBasket.yarnSkeins, 7, 'Daily free yarn must grant +4 skeins (3 -> 7)');
    assert.equal(
      await page.evaluate(() => document.getElementById('btn-crochet-daily-yarn').disabled),
      true,
      '#btn-crochet-daily-yarn must disable after claiming today'
    );

    // Interactive care drop: headpat via #hud-avatar-btn drops +1 cozy yarn skein
    await page.click('#hud-avatar-btn');
    await page.waitForTimeout(160);
    const afterCareDrop = await page.evaluate(() => window.__AR8_DEBUG__.getState());
    assert(
      afterCareDrop.crochetBasket.yarnSkeins >= 8 && afterCareDrop.crochetBasket.careDropCount >= 1,
      `Interactive headpat care must drop cozy yarn skein: ${JSON.stringify(afterCareDrop.crochetBasket)}`
    );

    // Crochet whale_scarf Lv.1 via UI button
    await page.click('#btn-crochet-craft');
    await page.waitForTimeout(180);
    const afterFirstKnit = await page.evaluate(() => window.__AR8_DEBUG__.getState());
    assert.equal(afterFirstKnit.crochetBasket.knits.whale_scarf.level, 1, 'whale_scarf must reach Lv.1');
    assert.equal(afterFirstKnit.crochetWarmGuard.active, true, 'Crocheting whale_scarf must activate Warm Guard');
    assert.equal(afterFirstKnit.crochetDeskVisual?.displayed, true, 'Crocheted keepsake must appear on wooden desk');
    assert.equal(afterFirstKnit.crochetDeskVisual?.knitId, 'whale_scarf', 'Displayed desk keepsake must be whale_scarf');
    assert(afterFirstKnit.coins >= afterCareDrop.coins + 24, 'Gifting crocheted keepsake must award coins');
    assert(
      afterFirstKnit.level > afterCareDrop.level || afterFirstKnit.xp > afterCareDrop.xp,
      'Gifting crocheted keepsake must award affection EXP'
    );
    assert(afterFirstKnit.emote.includes('蓝鲸小围巾'), `Expected warm scarf reaction emote, got: ${afterFirstKnit.emote}`);
    assert.equal(
      await page.evaluate(() => !document.getElementById('crochet-guard-pill').classList.contains('hidden')),
      true,
      '#crochet-guard-pill must appear in HUD when Warm Guard is active'
    );

    // Top up yarn skeins (via yarn pack button + helper) and upgrade all 3 handmade keepsakes (whale_scarf, star_coaster, cloud_pillow) to Lv.3
    await page.click('#btn-crochet-yarn-pack');
    await page.waitForTimeout(120);
    await page.evaluate(() => window.__AR8_DEBUG__.addYarnForTest(16));

    // Upgrade whale_scarf Lv.2 -> Lv.3
    await page.click('#btn-crochet-craft');
    await page.waitForTimeout(100);
    await page.click('#btn-crochet-craft');
    await page.waitForTimeout(100);

    // Select & crochet star_coaster Lv.1 -> Lv.2 -> Lv.3
    await page.click('#crochet-knit-grid [data-knit-id="star_coaster"]');
    await page.waitForTimeout(90);
    for (let i = 0; i < 3; i++) {
      await page.click('#btn-crochet-craft');
      await page.waitForTimeout(100);
    }

    // Select & crochet cloud_pillow Lv.1 -> Lv.2 -> Lv.3
    await page.click('#crochet-knit-grid [data-knit-id="cloud_pillow"]');
    await page.waitForTimeout(90);
    for (let i = 0; i < 3; i++) {
      await page.click('#btn-crochet-craft');
      await page.waitForTimeout(100);
    }

    // Test wooden desk toggle off & back on, then switch displayed keepsake back to whale_scarf for iconic visual
    await page.click('#btn-crochet-display-toggle');
    await page.waitForTimeout(90);
    assert.equal(
      await page.evaluate(() => window.__AR8_DEBUG__.getState().crochetDeskVisual?.displayed),
      false,
      'Desk display toggle should hide crochet keepsake from wooden desk'
    );
    await page.click('#btn-crochet-display-toggle');
    await page.waitForTimeout(90);
    assert.equal(
      await page.evaluate(() => window.__AR8_DEBUG__.getState().crochetDeskVisual?.displayed),
      true,
      'Desk display toggle should restore crochet keepsake on wooden desk'
    );

    await page.click('#crochet-knit-grid [data-knit-id="whale_scarf"]');
    await page.waitForTimeout(90);
    await page.click('#btn-crochet-gift');
    await page.waitForTimeout(140);

    const fullCrochetState = await page.evaluate(() => window.__AR8_DEBUG__.getState());
    assert.equal(fullCrochetState.crochetWarmGuard.totalLevel, 9, 'All 3 keepsakes at Lv.3 must reach totalLevel 9/9');
    assert.equal(fullCrochetState.crochetDeskVisual?.knitId, 'whale_scarf', 'Chosen desk keepsake must switch to whale_scarf');
    assert.equal(fullCrochetState.crochetDeskVisual?.level, 3, 'Chosen desk keepsake must be Lv.3');
    assert.equal(await page.locator('#crochet-summary-pill').textContent(), '暖绒 Lv.9/9');

    if (SHOT_CROCHET) {
      fs.mkdirSync(path.dirname(SHOT_CROCHET), { recursive: true });
      await page.screenshot({ path: SHOT_CROCHET });
    }

    // Reload and verify Crochet Basket state persists in localStorage
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(340);
    const reloadedCrochet = await page.evaluate(() => window.__AR8_DEBUG__.getState());
    assert.equal(reloadedCrochet.crochetWarmGuard.totalLevel, 9, 'Crochet totalLevel 9/9 must persist across reload');
    assert.equal(reloadedCrochet.crochetDeskVisual?.displayed, true, 'Wooden desk keepsake display must persist across reload');

    // Enter Survivor Shift from Crochet Basket and verify 「暖绒手作守护」 (damage reduction %, cozy shield barrier, heart-drop magnet, skill strip badge)
    await page.click('#btn-crochet-basket');
    await page.waitForTimeout(140);
    await page.click('#btn-crochet-go-shift');
    await page.waitForTimeout(240);

    const survCrochet = await page.evaluate(() => window.__AR8_DEBUG__.getState());
    const smCrochet = survCrochet.survivorMetrics;
    assert.equal(survCrochet.gameMode, 'survivor');
    assert(
      smCrochet.effectiveDamageReductionPct >= 0.28,
      `Expected effectiveDamageReductionPct >= 0.28 at Lv.9/9, got ${smCrochet.effectiveDamageReductionPct}`
    );
    assert(
      smCrochet.knitShieldMax >= 96 && smCrochet.knitShield >= 96,
      `Expected cozy knit shield >= 96 at Lv.9/9, got ${smCrochet.knitShield}/${smCrochet.knitShieldMax}`
    );
    assert(
      smCrochet.effectiveHeartMagnetRange > smCrochet.effectiveGemMagnetRange &&
        smCrochet.effectiveHeartMagnetRange >= 290,
      `Expected boosted heart-drop magnet range > ${smCrochet.effectiveGemMagnetRange}, got ${smCrochet.effectiveHeartMagnetRange}`
    );

    const stripHasCrochetBadge = await page.evaluate(() => {
      const strip = document.getElementById('surv-skill-strip');
      return Boolean(strip && !strip.classList.contains('hidden') && strip.innerHTML.includes('ui_btn_crochet_basket.webp'));
    });
    assert(stripHasCrochetBadge, 'Survivor skill strip must display ui_btn_crochet_basket.webp Warm Guard badge');

    // Verify real contact damage absorption by cozy knit shield
    const hitBefore = await page.evaluate(() => window.__AR8_DEBUG__.spawnContactEnemyForTest());
    await page.waitForTimeout(260);
    const hitAfter = await page.evaluate(() => window.__AR8_DEBUG__.getState());
    assert(
      hitAfter.survivorMetrics.knitShield < hitBefore.knitShieldBefore,
      `Cozy knit shield must absorb real contact damage (${hitBefore.knitShieldBefore} -> ${hitAfter.survivorMetrics.knitShield})`
    );
    assert.equal(
      hitAfter.hp,
      hitBefore.hpBefore,
      'Player HP must remain untouched while cozy knit shield absorbs contact damage'
    );

    // Return to pet mode
    await page.click('.mode-btn[data-mode="pet"]');
    await page.waitForTimeout(220);

    // 3. Verify Hot Cocoa Bar (#hot-cocoa-card): 3 Bases × 2 Toppings = 6 Blends + Sipping Speech Bubbles + WebAudio Mug-Clink/Warmth Chime + Weekly Journal Sync + Survivor Warmth Buff
    await page.click('#btn-hot-cocoa');
    await page.waitForTimeout(160);

    const cocoaBases = ['sea_salt_caramel', 'hazelnut_cream', 'mellow_dark'];
    const cocoaToppings = ['cinnamon_stick', 'star_marshmallow'];
    for (const baseId of cocoaBases) {
      await page.click(`#cocoa-base-grid [data-cocoa-base="${baseId}"]`);
      await page.waitForTimeout(70);
      for (const toppingId of cocoaToppings) {
        await page.click(`#cocoa-topping-grid [data-cocoa-topping="${toppingId}"]`);
        await page.waitForTimeout(70);
        await page.click('#btn-cocoa-serve');
        await page.waitForTimeout(120);
      }
    }

    const afterCocoa = await page.evaluate(() => window.__AR8_DEBUG__.getState());
    assert.equal(
      Object.keys(afterCocoa.hotCocoa.discoveredBlends).length,
      6,
      'All 6 hot cocoa blends (3x2) must be discovered'
    );
    assert.equal(await page.locator('#cocoa-codex-pill').textContent(), '特调 6/6');
    assert(afterCocoa.cocoaCupTimer > 0, `Expected steaming cocoa cup prop timer > 0, got ${afterCocoa.cocoaCupTimer}`);
    assert(
      afterCocoa.emote.includes('棉花糖') || afterCocoa.emote.includes('黑巧'),
      `Expected happy sipping speech bubble emote, got: ${afterCocoa.emote}`
    );
    assert(
      afterCocoa.ar8Audio.cocoaChimeCount >= 6 && afterCocoa.ar8Audio.cocoaWebAudioNodes >= 36,
      `Expected WebAudio mug-clink + warmth chime synthesis across serves, got ${JSON.stringify(afterCocoa.ar8Audio)}`
    );
    assert.equal(
      await page.evaluate(() => !document.getElementById('hot-cocoa-pill').classList.contains('hidden')),
      true,
      '#hot-cocoa-pill must appear in HUD when Hot Cocoa warmth buff is active'
    );

    if (SHOT_COCOA) {
      await page.waitForTimeout(750);
      fs.mkdirSync(path.dirname(SHOT_COCOA), { recursive: true });
      await page.screenshot({ path: SHOT_COCOA });
    }

    // Verify 7-day Weekly Mood Journal syncs Hot Cocoa & Crochet Keepsakes
    await page.click('#btn-weekly-journal');
    await page.waitForTimeout(180);
    const journalAudit = await page.evaluate(() => ({
      summary: window.__AR8_DEBUG__.getState().journalSummary,
      cardText: document.getElementById('weekly-journal-card')?.textContent || ''
    }));
    assert(journalAudit.summary.cocoas7d >= 6, `Expected Weekly Journal cocoas7d >= 6, got ${journalAudit.summary.cocoas7d}`);
    assert(journalAudit.summary.knits7d >= 9, `Expected Weekly Journal knits7d >= 9, got ${journalAudit.summary.knits7d}`);
    assert(
      journalAudit.cardText.includes('热可可') && journalAudit.cardText.includes('钩针'),
      `Expected #weekly-journal-card to render 热可可 & 钩针 metrics, got ${journalAudit.cardText}`
    );

    // Reload and verify Hot Cocoa codex & active warmth buff persist in localStorage
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(320);
    const reloadedCocoa = await page.evaluate(() => window.__AR8_DEBUG__.getState().hotCocoa);
    assert.equal(
      Object.keys(reloadedCocoa.discoveredBlends).length,
      6,
      'Discovered 6/6 hot cocoa blends must persist across reload'
    );
    assert(Boolean(reloadedCocoa.activeBuff && reloadedCocoa.activeBuff.remainingSec > 0), 'Hot cocoa warmth buff must persist across reload');

    // Enter Survivor Shift from Hot Cocoa Bar and verify attack-speed & coin-luck warmth buff
    await page.click('#btn-hot-cocoa');
    await page.waitForTimeout(140);
    await page.click('#btn-cocoa-go-shift');
    await page.waitForTimeout(240);

    const survCocoa = await page.evaluate(() => window.__AR8_DEBUG__.getState());
    const smCocoa = survCocoa.survivorMetrics;
    assert.equal(survCocoa.gameMode, 'survivor');
    assert.equal(smCocoa.hasActiveCocoaBuff, true, 'Survivor shift must detect active Hot Cocoa warmth buff');
    assert(smCocoa.hasteMult >= 1.28, `Expected hasteMult >= 1.28 from mellow_dark + star_marshmallow, got ${smCocoa.hasteMult}`);
    assert(smCocoa.effectiveFireInterval <= 0.34, `Expected faster effectiveFireInterval <= 0.34, got ${smCocoa.effectiveFireInterval}`);
    assert(smCocoa.coinMult >= 1.18, `Expected boosted coinMult >= 1.18, got ${smCocoa.coinMult}`);
    assert(smCocoa.effectiveLuckyDropBonus >= 0.09, `Expected boosted effectiveLuckyDropBonus >= 0.09, got ${smCocoa.effectiveLuckyDropBonus}`);

    const stripHasCocoaBadge = await page.evaluate(() => {
      const strip = document.getElementById('surv-skill-strip');
      return Boolean(strip && !strip.classList.contains('hidden') && strip.innerHTML.includes('ui_btn_cocoa_bar.webp'));
    });
    assert(stripHasCocoaBadge, 'Survivor skill strip must display ui_btn_cocoa_bar.webp warmth buff badge');

    // Return to pet mode for responsive viewport overflow & clearance checks
    await page.click('.mode-btn[data-mode="pet"]');
    await page.waitForTimeout(220);

    // 4. Mobile 390x844 (portrait forced-landscape) & 844x390 clearance & zero-overflow check (15-button dock!)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(280);
    await page.evaluate(() => document.getElementById('btn-crochet-basket').click());
    await page.waitForTimeout(220);

    const portraitCrochetAudit = await page.evaluate(() => ({
      overflowX: document.documentElement.scrollWidth - window.innerWidth,
      overflowY: document.documentElement.scrollHeight - window.innerHeight,
      crochetOpen: !document.getElementById('crochet-basket-card').classList.contains('hidden'),
      hasEmoji: /\p{Extended_Pictographic}/u.test(document.body.innerText || '')
    }));
    assert(portraitCrochetAudit.crochetOpen, '#crochet-basket-card must open cleanly on 390x844');
    assert.equal(portraitCrochetAudit.hasEmoji, false, 'Zero Emoji on 390x844');
    assert(
      portraitCrochetAudit.overflowX <= 0 && portraitCrochetAudit.overflowY <= 0,
      `390x844 crochet overflow detected: ${JSON.stringify(portraitCrochetAudit)}`
    );

    if (SHOT_PORTRAIT) {
      fs.mkdirSync(path.dirname(SHOT_PORTRAIT), { recursive: true });
      await page.screenshot({ path: SHOT_PORTRAIT });
    }

    await page.evaluate(() => document.getElementById('btn-hot-cocoa').click());
    await page.waitForTimeout(200);
    const portraitCocoaAudit = await page.evaluate(() => ({
      overflowX: document.documentElement.scrollWidth - window.innerWidth,
      overflowY: document.documentElement.scrollHeight - window.innerHeight,
      cocoaOpen: !document.getElementById('hot-cocoa-card').classList.contains('hidden'),
      crochetOpen: !document.getElementById('crochet-basket-card').classList.contains('hidden')
    }));
    assert(
      portraitCocoaAudit.cocoaOpen && !portraitCocoaAudit.crochetOpen,
      '#hot-cocoa-card must open cleanly on 390x844 and close #crochet-basket-card'
    );
    assert(
      portraitCocoaAudit.overflowX <= 0 && portraitCocoaAudit.overflowY <= 0,
      `390x844 cocoa overflow detected: ${JSON.stringify(portraitCocoaAudit)}`
    );

    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(260);
    await page.click('#btn-hot-cocoa');
    if (await page.evaluate(() => document.getElementById('hot-cocoa-card').classList.contains('hidden'))) {
      await page.click('#btn-hot-cocoa');
    }
    await page.waitForTimeout(200);

    const landscapeAudit = await page.evaluate(() => {
      const prof = document.querySelector('.hud-profile-card').getBoundingClientRect();
      const sw = document.getElementById('mode-switcher').getBoundingClientRect();
      const hr = document.querySelector('.hud-right').getBoundingClientRect();
      const joy = document.getElementById('joystick-zone').getBoundingClientRect();
      const care = document.getElementById('pet-care-bar').getBoundingClientRect();
      const act = document.querySelector('.action-zone').getBoundingClientRect();
      const cc = document.getElementById('hot-cocoa-card').getBoundingClientRect();
      const careBtnCount = document.querySelectorAll('#pet-care-bar .care-btn').length;
      return {
        overflowX: document.documentElement.scrollWidth - window.innerWidth,
        overflowY: document.documentElement.scrollHeight - window.innerHeight,
        cocoaOpen: !document.getElementById('hot-cocoa-card').classList.contains('hidden'),
        crochetOpen: !document.getElementById('crochet-basket-card').classList.contains('hidden'),
        careBtnCount,
        careScrollOverflow: care.scrollWidth ? 0 : document.getElementById('pet-care-bar').scrollWidth - care.width,
        profileRight: prof.right,
        cocoaLeft: cc.left,
        cocoaBottom: cc.bottom,
        actTop: act.top,
        switcherRight: sw.right,
        hudRightLeft: hr.left,
        joyRight: joy.right,
        careLeft: care.left,
        careRight: care.right,
        actLeft: act.left
      };
    });
    assert(landscapeAudit.cocoaOpen && !landscapeAudit.crochetOpen, 'Hot cocoa card must be open on 844x390');
    assert(landscapeAudit.careBtnCount >= 15, `Expected >= 15 cozy dock buttons in #pet-care-bar, got ${landscapeAudit.careBtnCount}`);
    assert(
      landscapeAudit.overflowX <= 0 && landscapeAudit.overflowY <= 0,
      `844x390 viewport overflow: ${JSON.stringify(landscapeAudit)}`
    );
    assert(
      landscapeAudit.profileRight <= landscapeAudit.cocoaLeft,
      `Hot cocoa card overlaps .hud-profile-card on 844x390: ${JSON.stringify(landscapeAudit)}`
    );
    assert(
      landscapeAudit.cocoaBottom <= landscapeAudit.actTop + 2,
      `Hot cocoa card overlaps .action-zone on 844x390: ${JSON.stringify(landscapeAudit)}`
    );
    assert(
      landscapeAudit.switcherRight <= landscapeAudit.hudRightLeft + 2,
      `Top HUD overlap on 844x390: ${JSON.stringify(landscapeAudit)}`
    );
    assert(
      landscapeAudit.joyRight <= landscapeAudit.careLeft + 2 &&
        landscapeAudit.careRight <= landscapeAudit.actLeft + 2,
      `Bottom 15-button dock overlap on 844x390: ${JSON.stringify(landscapeAudit)}`
    );

    if (SHOT_LANDSCAPE) {
      fs.mkdirSync(path.dirname(SHOT_LANDSCAPE), { recursive: true });
      await page.screenshot({ path: SHOT_LANDSCAPE });
    }

    assert.equal(consoleErrors.length, 0, `Console errors observed: ${consoleErrors.join('; ')}`);
    assert.equal(pageErrors.length, 0, `Page errors observed: ${pageErrors.join('; ')}`);
    assert.equal(failedResponses.length, 0, `HTTP >= 400 responses observed: ${failedResponses.join('; ')}`);

    console.log(
      '[E2E PASS] AR-8 Cream-Journal Crochet Basket (daily free yarn + interactive care yarn drops + 3 handmade keepsakes Lv.1~3 + wooden desk display + Survivor Warm Guard) + Winter Marshmallow Hot Cocoa Bar (3x2 blends + WebAudio mug-clink/warmth chime + Weekly Journal sync + Survivor haste & coin-luck warmth buff) passed across 1440x900, 390x844, and 844x390 with 0px overflow and 0 errors!'
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
