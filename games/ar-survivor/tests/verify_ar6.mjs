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
const PORT = Number(process.env.AR6_PORT || 0);

const SHOT_TERRARIUM = process.env.AR6_DESKTOP_TERRARIUM_SHOT || '';
const SHOT_MUSICBOX = process.env.AR6_DESKTOP_MUSICBOX_SHOT || '';
const SHOT_PORTRAIT = process.env.AR6_MOBILE_PORTRAIT_SHOT || '';
const SHOT_LANDSCAPE = process.env.AR6_MOBILE_LANDSCAPE_SHOT || '';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.json': 'application/json; charset=utf-8'
};

const REQUIRED_AR6_ASSETS = [
  'ui_btn_terrarium.webp',
  'plant_peach_succulent.webp',
  'plant_star_lily.webp',
  'plant_blue_hydrangea.webp',
  'ui_btn_musicbox.webp',
  'stamp_goodnight_moon.webp'
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
  assert(/\.\/style\.css\?v=hd2\d/.test(htmlContent), 'index.html must reference ./style.css?v=hd21+');
  assert(/\.\/game\.js\?v=hd4\d/.test(htmlContent), 'index.html must reference ./game.js?v=hd45+');
  for (const reqAsset of REQUIRED_AR6_ASSETS) {
    assert(
      new RegExp(`\\./assets/${reqAsset.replace('.', '\\.')}\\?v=hd2\\d`).test(htmlContent),
      `index.html must reference ./assets/${reqAsset}?v=hd21+`
    );
  }

  const cssContent = fs.readFileSync(path.join(PUBLIC_DIR, 'style.css'), 'utf8');
  assert(/\?v=hd2\d/.test(cssContent), 'style.css must bump asset cache-buster to ?v=hd21+');

  const spritesContent = fs.readFileSync(path.join(PUBLIC_DIR, 'sprites.js'), 'utf8');
  assert(/\?v=hd2\d/.test(spritesContent), 'sprites.js must reference ?v=hd21+');

  const gameContent = fs.readFileSync(path.join(PUBLIC_DIR, 'game.js'), 'utf8');
  assert(/\.\/sprites\.js\?v=hd2\d/.test(gameContent), 'game.js must import ./sprites.js?v=hd21+');
  assert(/\.\/audio\.js\?v=hd2\d/.test(gameContent), 'game.js must import ./audio.js?v=hd21+');

  for (const reqAsset of REQUIRED_AR6_ASSETS) {
    assert(assetRefs.has(reqAsset), `Required AR-6 asset ${reqAsset} is not referenced in code`);
  }

  for (const asset of assetRefs) {
    const full = path.join(PUBLIC_DIR, 'assets', asset);
    assert(fs.existsSync(full), `Missing asset on disk: ${full}`);
    assert(fs.statSync(full).size > 0, `Empty asset on disk: ${full}`);
  }

  console.log(
    `[STATIC PASS] ${jsFiles.length} JS modules syntax-checked, ${assetRefs.size} assets verified on disk (including all 6 AR-6 icons), ?v=hd21/hd45 synced, 0 inline <svg>, 0 Emoji across HTML/CSS/JS.`
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

    // 0. DOM Emoji, warm cream-journal palette, broken-image & RGBA corner-alpha audit on all 6 AR-6 .webp icons
    const initialAudit = await page.evaluate(async (ar6Assets) => {
      const text = document.body.innerText || '';
      const hasEmoji = /\p{Extended_Pictographic}/u.test(text);
      const terrariumBg = getComputedStyle(document.getElementById('terrarium-card')).backgroundImage;
      const musicboxBg = getComputedStyle(document.getElementById('goodnight-musicbox-card')).backgroundImage;
      const overlayBg = getComputedStyle(document.getElementById('goodnight-starlight-overlay')).backgroundImage;
      const brokenImgs = Array.from(document.querySelectorAll('img'))
        .filter((img) => {
          const src = img.getAttribute('src') || '';
          return src.startsWith('./assets/') && (!img.complete || img.naturalWidth === 0);
        })
        .map((img) => img.getAttribute('src'));

      const alphaReport = {};
      for (const file of ar6Assets) {
        const img = new Image();
        img.src = `./assets/${file}?v=hd21`;
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
        terrariumBg,
        musicboxBg,
        overlayBg,
        brokenImgs,
        alphaReport,
        overflowX: document.documentElement.scrollWidth - window.innerWidth,
        overflowY: document.documentElement.scrollHeight - window.innerHeight
      };
    }, REQUIRED_AR6_ASSETS);

    assert.equal(initialAudit.hasEmoji, false, 'Visible DOM must contain zero Emoji characters');
    assert.equal(initialAudit.brokenImgs.length, 0, `Broken ./assets/ images: ${initialAudit.brokenImgs.join(', ')}`);
    assert(
      initialAudit.overflowX <= 0 && initialAudit.overflowY <= 0,
      `Desktop 1440x900 overflow: ${JSON.stringify(initialAudit)}`
    );
    assert(
      /255,\s*253,\s*248/i.test(initialAudit.terrariumBg),
      `Expected warm cream #terrarium-card (#FFFDF8), got ${initialAudit.terrariumBg}`
    );
    assert(
      /255,\s*253,\s*248/i.test(initialAudit.musicboxBg),
      `Expected warm cream #goodnight-musicbox-card (#FFFDF8), got ${initialAudit.musicboxBg}`
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

    // 1. Verify Mutual Panel Non-Overlap across all floating panels including Terrarium & Goodnight Music Box
    const panelTriggers = [
      { btn: '#hud-ambience-pill', key: 'windowAmbience' },
      { btn: '#btn-pomodoro', key: 'pomodoro' },
      { btn: '#btn-teatime', key: 'teatime' },
      { btn: '#btn-weekly-journal', key: 'weeklyJournal' },
      { btn: '#btn-terrarium', key: 'terrarium' },
      { btn: '#btn-musicbox', key: 'goodnightMusicbox' },
      { btn: '#btn-chat-topic', key: 'topic' },
      { btn: '#btn-shop', key: 'drawer' }
    ];
    for (const step of panelTriggers) {
      await page.click(step.btn);
      await page.waitForTimeout(150);
      const panels = await page.evaluate(() => window.__AR6_DEBUG__.getState().openPanels);
      const openNames = Object.entries(panels)
        .filter(([, isOpen]) => isOpen)
        .map(([k]) => k);
      assert.deepEqual(
        openNames,
        [step.key],
        `Opening ${step.btn} must keep ONLY ${step.key} open, got: ${JSON.stringify(openNames)}`
      );
    }

    // Verify Dress Drawer AR-6 shortcut banner (already opened on dress tab by #btn-shop) opens #terrarium-card cleanly
    await page.click('[data-ar6-shortcut="terrarium"]');
    await page.waitForTimeout(160);
    const afterDressShortcut = await page.evaluate(() => window.__AR6_DEBUG__.getState().openPanels);
    assert.equal(afterDressShortcut.terrarium, true, 'Dress drawer shortcut must open #terrarium-card');
    assert.equal(afterDressShortcut.drawer, false, 'Dress drawer must close when #terrarium-card opens');

    // 2. Verify Desktop Miniature Terrarium Shelf (3 Potted Plants + Care Actions + Stages Lv.1~5 + Dew Harvest + Desk Display)
    await page.evaluate(() => window.__AR6_DEBUG__.addCoinsForTest(400));
    await page.waitForTimeout(100);

    // Check initial Lv.1 stage ('萌芽') on peach_succulent
    const initialBadge = await page.locator('#terrarium-stage-badge').textContent();
    assert(initialBadge.includes('萌芽') && initialBadge.includes('Lv.1'), `Expected 萌芽 Lv.1, got ${initialBadge}`);

    // Harvest initial dew drop on peach_succulent
    const beforeDew = await page.evaluate(() => window.__AR6_DEBUG__.getState());
    await page.click('#btn-plant-harvest-dew');
    await page.waitForTimeout(140);
    const afterDew = await page.evaluate(() => window.__AR6_DEBUG__.getState());
    assert(afterDew.coins > beforeDew.coins, 'Harvesting plant dew must grant coins');

    // Cultivate peach_succulent through 舒叶 (Lv.2~3) to 盛放 (Lv.5) via Water, Sunlight & Nutrient clicks
    await page.click('#btn-plant-water');
    await page.click('#btn-plant-sun');
    await page.waitForTimeout(120);
    const midBadge = await page.locator('#terrarium-stage-badge').textContent();
    assert(midBadge.includes('舒叶'), `Expected stage to reach 舒叶, got ${midBadge}`);

    for (let i = 0; i < 5; i++) {
      await page.click('#btn-plant-nutrient');
    }
    await page.waitForTimeout(140);
    const maxBadge = await page.locator('#terrarium-stage-badge').textContent();
    assert(maxBadge.includes('盛放') && maxBadge.includes('Lv.5'), `Expected 盛放 Lv.5, got ${maxBadge}`);

    // Cultivate star_lily and blue_hydrangea to Lv.5 and ensure all 3 are displayed on the companion room desk
    for (const plantId of ['star_lily', 'blue_hydrangea']) {
      await page.click(`#terrarium-plant-grid [data-plant-id="${plantId}"]`);
      await page.waitForTimeout(100);
      await page.click('#btn-plant-water');
      await page.click('#btn-plant-sun');
      for (let i = 0; i < 5; i++) {
        await page.click('#btn-plant-nutrient');
      }
      await page.waitForTimeout(100);
    }

    // Test desk display toggle off and back on for blue_hydrangea
    await page.click('#btn-plant-display-toggle');
    await page.waitForTimeout(100);
    let dispAfterOff = await page.evaluate(() => window.__AR6_DEBUG__.getState().displayedTerrariumPlants.length);
    assert.equal(dispAfterOff, 2, 'Toggling desk display off should leave 2 displayed plants');
    await page.click('#btn-plant-display-toggle');
    await page.waitForTimeout(100);
    let dispAfterOn = await page.evaluate(() => window.__AR6_DEBUG__.getState().displayedTerrariumPlants.length);
    assert.equal(dispAfterOn, 3, 'Toggling desk display back on should show all 3 blooming plants on desk');

    const hudTerrariumPillShown = await page.evaluate(
      () => !document.getElementById('terrarium-blessing-pill').classList.contains('hidden')
    );
    assert(hudTerrariumPillShown, '#terrarium-blessing-pill must appear in HUD when plants are cultivated');
    assert.equal(await page.locator('#terrarium-summary-pill').textContent(), '花架 Lv.15/15');

    if (SHOT_TERRARIUM) {
      fs.mkdirSync(path.dirname(SHOT_TERRARIUM), { recursive: true });
      await page.screenshot({ path: SHOT_TERRARIUM });
    }

    // Reload and verify Terrarium Lv.15 + 3 displayed desk plants persist in localStorage
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(340);
    const reloadedTerrarium = await page.evaluate(() => window.__AR6_DEBUG__.getState());
    assert.equal(reloadedTerrarium.botanicalBlessings.totalLevel, 15, 'Lv.15 Terrarium must persist across reload');
    assert.equal(reloadedTerrarium.displayedTerrariumPlants.length, 3, '3 displayed desk plants must persist across reload');

    // 3. Verify Survivor Shift Botanical Blessings in active `survivor` gameplay
    await page.click('#btn-terrarium');
    await page.waitForTimeout(140);
    await page.click('#btn-terrarium-go-shift');
    await page.waitForTimeout(240);

    const survMetrics = await page.evaluate(() => {
      window.__AR6_DEBUG__.setPlayerHpForTest(40);
      return window.__AR6_DEBUG__.getState().survivorMetrics;
    });
    assert.equal(survMetrics.gameMode, 'survivor');
    assert(survMetrics.botanicalBlessings.luckCoinPct >= 0.18, `Expected luckCoinPct >= 0.18, got ${survMetrics.botanicalBlessings.luckCoinPct}`);
    assert(survMetrics.botanicalBlessings.hpRegenPerSec >= 2.5, `Expected hpRegenPerSec >= 2.5, got ${survMetrics.botanicalBlessings.hpRegenPerSec}`);
    assert(survMetrics.botanicalBlessings.magnetPct >= 0.24, `Expected magnetPct >= 0.24, got ${survMetrics.botanicalBlessings.magnetPct}`);
    assert(survMetrics.effectiveGemMagnetRange >= 215, `Expected boosted gemMagnetRange >= 215, got ${survMetrics.effectiveGemMagnetRange}`);
    assert(survMetrics.effectiveCritChance >= 0.28, `Expected boosted critChance >= 0.28, got ${survMetrics.effectiveCritChance}`);

    const stripHasTerrariumBadge = await page.evaluate(() => {
      const strip = document.getElementById('surv-skill-strip');
      return Boolean(strip && !strip.classList.contains('hidden') && strip.innerHTML.includes('ui_btn_terrarium.webp'));
    });
    assert(stripHasTerrariumBadge, 'Survivor skill strip must display ui_btn_terrarium.webp botanical badge');

    // Wait 650ms and verify Star Lily continuous HP regeneration works in live survivor gameplay
    await page.waitForTimeout(650);
    const hpAfterRegen = await page.evaluate(() => window.__AR6_DEBUG__.getState().hp);
    assert(hpAfterRegen > 40.8, `Expected Star Lily HP regen to heal past 40.8 HP, got ${hpAfterRegen}`);

    // Return to pet mode
    await page.click('.mode-btn[data-mode="pet"]');
    await page.waitForTimeout(220);

    // 4. Verify Goodnight Starlight Music Box Mode (Warm Starlight Overlay + WebAudio Celesta Chimes + 15/30/45m + Goodnight Seal + Journal)
    await page.click('#btn-musicbox');
    await page.waitForTimeout(160);

    // Cycle melodies (星摇篮曲 / 雨后风铃 / 云端圆舞) and verify WebAudio celesta chime synthesis counter
    for (const mel of ['rain_chime', 'cloud_waltz', 'star_lullaby']) {
      await page.click(`#musicbox-melody-row [data-melody="${mel}"]`);
      await page.waitForTimeout(80);
    }
    // Test 15 / 30 / 45 min presets
    await page.click('#musicbox-presets-row [data-sleep-mins="45"]');
    assert.equal(await page.locator('#musicbox-clock').textContent(), '45:00');
    await page.click('#musicbox-presets-row [data-sleep-mins="15"]');
    assert.equal(await page.locator('#musicbox-clock').textContent(), '15:00');
    await page.click('#musicbox-presets-row [data-sleep-mins="30"]');
    assert.equal(await page.locator('#musicbox-clock').textContent(), '30:00');

    // Test chime mute toggle off & back on
    await page.click('#btn-musicbox-chime-mute');
    assert.equal(await page.locator('#btn-musicbox-chime-mute').textContent(), '柔音静音');
    await page.click('#btn-musicbox-chime-mute');
    assert.equal(await page.locator('#btn-musicbox-chime-mute').textContent(), '柔音开启');

    // Start Goodnight accompaniment session
    await page.click('#btn-musicbox-start');
    await page.waitForTimeout(450);

    const runningState = await page.evaluate(() => window.__AR6_DEBUG__.getState());
    assert.equal(runningState.goodnightRun.status, 'running');
    assert.equal(runningState.overlayVisible, true, 'Warm #goodnight-starlight-overlay must appear during session');
    assert.equal(runningState.isGoodnightSleeping, true, 'DeepSeek-chan must curl up in sleepy companion posture');
    assert.equal(runningState.lullabyAudio.active, true, 'WebAudio lullaby box must be active');
    assert(runningState.lullabyAudio.chimeCount >= 3, `Expected celesta chimes >= 3, got ${runningState.lullabyAudio.chimeCount}`);

    if (SHOT_MUSICBOX) {
      fs.mkdirSync(path.dirname(SHOT_MUSICBOX), { recursive: true });
      await page.screenshot({ path: SHOT_MUSICBOX });
    }

    // Fold to HUD mini-pill and reopen
    await page.click('#btn-musicbox-fold');
    await page.waitForTimeout(140);
    const pillVisibleWhenFolded = await page.evaluate(
      () => !document.getElementById('musicbox-mini-pill').classList.contains('hidden')
    );
    assert(pillVisibleWhenFolded, '#musicbox-mini-pill must appear in HUD when Goodnight card is folded');
    await page.click('#musicbox-mini-pill');
    await page.waitForTimeout(140);

    // Test early wake settle (#btn-musicbox-settle) -> awards Goodnight Moon Wax Seal #1 + coins + intimacy
    const coinsBeforeSettle = (await page.evaluate(() => window.__AR6_DEBUG__.getState())).coins;
    await page.click('#btn-musicbox-settle');
    await page.waitForTimeout(180);
    const afterEarlySettle = await page.evaluate(() => window.__AR6_DEBUG__.getState());
    assert.equal(afterEarlySettle.goodnightMusicbox.totalStamps, 1, 'Early wake settle must award Goodnight wax seal #1');
    assert(afterEarlySettle.coins > coinsBeforeSettle, 'Settling Goodnight session must grant coins');
    assert.equal(afterEarlySettle.overlayVisible, false, 'Starlight overlay must hide once session completes');

    // Start a second 30-min session and fast-forward full countdown completion
    await page.click('#btn-musicbox-start');
    await page.evaluate(() => window.__AR6_DEBUG__.fastForwardMusicbox(1805));
    await page.waitForTimeout(180);
    const afterFullComplete = await page.evaluate(() => window.__AR6_DEBUG__.getState());
    assert.equal(afterFullComplete.goodnightMusicbox.totalStamps, 2, 'Full countdown completion must award Goodnight wax seal #2');
    assert(afterFullComplete.goodnightMusicbox.totalSleepMinutes >= 35, `Expected totalSleepMinutes >= 35, got ${afterFullComplete.goodnightMusicbox.totalSleepMinutes}`);
    assert.equal(await page.locator('.musicbox-stamp-slot.stamped').count(), 2);

    // Open Weekly Mood Journal and verify Goodnight Moon seal + sleepMins7d + plantCares7d integration
    await page.click('#btn-weekly-journal');
    await page.waitForTimeout(180);
    const journalAudit = await page.evaluate(() => {
      const st = window.__AR6_DEBUG__.getState();
      const todayCellImg = document.querySelector('.journal-day-cell.is-today .journal-day-seal')?.getAttribute('src') || '';
      const todayMoodTxt = document.querySelector('.journal-day-cell.is-today .journal-day-mood')?.textContent || '';
      return {
        summary: st.journalSummary,
        todayCellImg,
        todayMoodTxt
      };
    });
    assert(journalAudit.todayCellImg.includes('stamp_goodnight_moon.webp'), `Expected today journal cell to show stamp_goodnight_moon.webp, got ${journalAudit.todayCellImg}`);
    assert.equal(journalAudit.todayMoodTxt, '好梦');
    assert(journalAudit.summary.sleepMins7d >= 35, `Expected sleepMins7d >= 35, got ${journalAudit.summary.sleepMins7d}`);
    assert(journalAudit.summary.plantCares7d >= 3, `Expected plantCares7d >= 3, got ${journalAudit.summary.plantCares7d}`);

    // Reload and verify Goodnight wax seals persist in localStorage
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(300);
    const reloadedMb = await page.evaluate(() => window.__AR6_DEBUG__.getState().goodnightMusicbox);
    assert.equal(reloadedMb.totalStamps, 2, 'Goodnight wax seals must persist across reload');

    // 5. Mobile 390x844 (portrait forced-landscape) & 844x390 clearance & zero-overflow check
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(280);
    await page.evaluate(() => document.getElementById('btn-terrarium').click());
    await page.waitForTimeout(220);

    const portraitAudit = await page.evaluate(() => ({
      overflowX: document.documentElement.scrollWidth - window.innerWidth,
      overflowY: document.documentElement.scrollHeight - window.innerHeight,
      terrariumOpen: !document.getElementById('terrarium-card').classList.contains('hidden'),
      hasEmoji: /\p{Extended_Pictographic}/u.test(document.body.innerText || '')
    }));
    assert(portraitAudit.terrariumOpen, '#terrarium-card must open cleanly on 390x844');
    assert.equal(portraitAudit.hasEmoji, false, 'Zero Emoji on 390x844');
    assert(
      portraitAudit.overflowX <= 0 && portraitAudit.overflowY <= 0,
      `390x844 overflow detected: ${JSON.stringify(portraitAudit)}`
    );

    if (SHOT_PORTRAIT) {
      fs.mkdirSync(path.dirname(SHOT_PORTRAIT), { recursive: true });
      await page.screenshot({ path: SHOT_PORTRAIT });
    }

    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(260);
    await page.click('#btn-musicbox');
    await page.waitForTimeout(200);

    const landscapeAudit = await page.evaluate(() => {
      const prof = document.querySelector('.hud-profile-card').getBoundingClientRect();
      const sw = document.getElementById('mode-switcher').getBoundingClientRect();
      const hr = document.querySelector('.hud-right').getBoundingClientRect();
      const joy = document.getElementById('joystick-zone').getBoundingClientRect();
      const care = document.getElementById('pet-care-bar').getBoundingClientRect();
      const act = document.querySelector('.action-zone').getBoundingClientRect();
      const mb = document.getElementById('goodnight-musicbox-card').getBoundingClientRect();
      const careBtnCount = document.querySelectorAll('#pet-care-bar .care-btn').length;
      return {
        overflowX: document.documentElement.scrollWidth - window.innerWidth,
        overflowY: document.documentElement.scrollHeight - window.innerHeight,
        musicboxOpen: !document.getElementById('goodnight-musicbox-card').classList.contains('hidden'),
        terrariumOpen: !document.getElementById('terrarium-card').classList.contains('hidden'),
        careBtnCount,
        profileRight: prof.right,
        musicboxLeft: mb.left,
        musicboxBottom: mb.bottom,
        actTop: act.top,
        switcherRight: sw.right,
        hudRightLeft: hr.left,
        joyRight: joy.right,
        careLeft: care.left,
        careRight: care.right,
        actLeft: act.left
      };
    });
    assert(landscapeAudit.musicboxOpen && !landscapeAudit.terrariumOpen, 'Opening musicbox on 844x390 must close terrarium card');
    assert(landscapeAudit.careBtnCount >= 11, `Expected >= 11 cozy dock buttons in #pet-care-bar, got ${landscapeAudit.careBtnCount}`);
    assert(
      landscapeAudit.overflowX <= 0 && landscapeAudit.overflowY <= 0,
      `844x390 viewport overflow: ${JSON.stringify(landscapeAudit)}`
    );
    assert(
      landscapeAudit.profileRight <= landscapeAudit.musicboxLeft,
      `Goodnight musicbox card overlaps .hud-profile-card on 844x390: ${JSON.stringify(landscapeAudit)}`
    );
    assert(
      landscapeAudit.musicboxBottom <= landscapeAudit.actTop + 2,
      `Goodnight musicbox card overlaps .action-zone on 844x390: ${JSON.stringify(landscapeAudit)}`
    );
    assert(
      landscapeAudit.switcherRight <= landscapeAudit.hudRightLeft + 2,
      `Top HUD overlap on 844x390: ${JSON.stringify(landscapeAudit)}`
    );
    assert(
      landscapeAudit.joyRight <= landscapeAudit.careLeft + 2 &&
        landscapeAudit.careRight <= landscapeAudit.actLeft + 2,
      `Bottom 11-button dock overlap on 844x390: ${JSON.stringify(landscapeAudit)}`
    );

    if (SHOT_LANDSCAPE) {
      fs.mkdirSync(path.dirname(SHOT_LANDSCAPE), { recursive: true });
      await page.screenshot({ path: SHOT_LANDSCAPE });
    }

    assert.equal(consoleErrors.length, 0, `Console errors observed: ${consoleErrors.join('; ')}`);
    assert.equal(pageErrors.length, 0, `Page errors observed: ${pageErrors.join('; ')}`);
    assert.equal(failedResponses.length, 0, `HTTP >= 400 responses observed: ${failedResponses.join('; ')}`);

    console.log(
      '[E2E PASS] AR-6 Desktop Miniature Terrarium Shelf (3 Lv.1~5 blooming plants + desk display + Survivor Botanical Blessings) + Goodnight Starlight Music Box (warm starlight projection + 3 WebAudio celesta lullabies + Goodnight Moon wax seals + Weekly Journal sync) passed across 1440x900, 390x844, and 844x390 with 0px overflow and 0 errors!'
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
