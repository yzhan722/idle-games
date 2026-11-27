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
const PORT = Number(process.env.AR7_PORT || 0);

const SHOT_COLLAGE = process.env.AR7_DESKTOP_COLLAGE_SHOT || '';
const SHOT_RADIO = process.env.AR7_DESKTOP_RADIO_SHOT || '';
const SHOT_PORTRAIT = process.env.AR7_MOBILE_PORTRAIT_SHOT || '';
const SHOT_LANDSCAPE = process.env.AR7_MOBILE_LANDSCAPE_SHOT || '';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.json': 'application/json; charset=utf-8'
};

const REQUIRED_AR7_ASSETS = [
  'ui_btn_collage_frame.webp',
  'sticker_lace_garland.webp',
  'sticker_pressed_daisy.webp',
  'sticker_whale_stamp.webp',
  'ui_btn_cozy_radio.webp',
  'radio_vinyl_note.webp'
];

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
  assert(/\.\/style\.css\?v=hd(?:2[2-9]|[3-9]\d)/.test(htmlContent), 'index.html must reference ./style.css?v=hd22+');
  assert(/\.\/game\.js\?v=hd(?:4[6-9]|[5-9]\d)\b/.test(htmlContent), 'index.html must reference ./game.js?v=hd46+');
  for (const reqAsset of REQUIRED_AR7_ASSETS) {
    assert(
      new RegExp(`\\./assets/${reqAsset.replace('.', '\\.')}\\?v=hd(?:2[2-9]|[3-9]\\d)`).test(htmlContent),
      `index.html must reference ./assets/${reqAsset}?v=hd22+`
    );
  }

  const cssContent = fs.readFileSync(path.join(PUBLIC_DIR, 'style.css'), 'utf8');
  assert(/\?v=hd(?:2[2-9]|[3-9]\d)/.test(cssContent), 'style.css must bump asset cache-buster to ?v=hd22+');

  const spritesContent = fs.readFileSync(path.join(PUBLIC_DIR, 'sprites.js'), 'utf8');
  assert(/\?v=hd(?:2[2-9]|[3-9]\d)/.test(spritesContent), 'sprites.js must reference ?v=hd22+');

  const gameContent = readGameSource(PUBLIC_DIR);
  assert(/\.\/sprites\.js\?v=hd(?:2[2-9]|[3-9]\d)/.test(gameContent), 'game.js must import ./sprites.js?v=hd22+');
  assert(/\.\/audio\.js\?v=hd(?:2[2-9]|[3-9]\d)/.test(gameContent), 'game.js must import ./audio.js?v=hd22+');
  assert(/\.\/vision\.js\?v=hd(?:2[2-9]|[3-9]\d)/.test(gameContent), 'game.js must import ./vision.js?v=hd22+');

  for (const reqAsset of REQUIRED_AR7_ASSETS) {
    assert(assetRefs.has(reqAsset), `Required AR-7 asset ${reqAsset} is not referenced in code`);
  }

  for (const asset of assetRefs) {
    const full = path.join(PUBLIC_DIR, 'assets', asset);
    assert(fs.existsSync(full), `Missing asset on disk: ${full}`);
    assert(fs.statSync(full).size > 0, `Empty asset on disk: ${full}`);
  }

  console.log(
    `[STATIC PASS] ${jsFiles.length} JS modules syntax-checked, ${assetRefs.size} assets verified on disk (including all 6 AR-7 icons), ?v=hd22/hd46 synced, 0 inline <svg>, 0 Emoji across HTML/CSS/JS.`
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
    await prepareArContext(context);
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

    // 0. DOM Emoji, warm cream-journal palette (#FFFDF8), broken-image & RGBA corner-alpha audit on all 6 AR-7 .webp icons
    const initialAudit = await page.evaluate(async (ar7Assets) => {
      const text = document.body.innerText || '';
      const hasEmoji = /\p{Extended_Pictographic}/u.test(text);
      const collageBg = getComputedStyle(document.getElementById('collage-frame-card')).backgroundImage;
      const radioBg = getComputedStyle(document.getElementById('cozy-radio-card')).backgroundImage;
      const brokenImgs = Array.from(document.querySelectorAll('img'))
        .filter((img) => {
          const src = img.getAttribute('src') || '';
          return src.startsWith('./assets/') && (!img.complete || img.naturalWidth === 0);
        })
        .map((img) => img.getAttribute('src'));

      const alphaReport = {};
      for (const file of ar7Assets) {
        const img = new Image();
        img.src = `./assets/${file}?v=hd22`;
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
        collageBg,
        radioBg,
        brokenImgs,
        alphaReport,
        overflowX: document.documentElement.scrollWidth - window.innerWidth,
        overflowY: document.documentElement.scrollHeight - window.innerHeight
      };
    }, REQUIRED_AR7_ASSETS);

    assert.equal(initialAudit.hasEmoji, false, 'Visible DOM must contain zero Emoji characters');
    assert.equal(initialAudit.brokenImgs.length, 0, `Broken ./assets/ images: ${initialAudit.brokenImgs.join(', ')}`);
    assert(
      initialAudit.overflowX <= 0 && initialAudit.overflowY <= 0,
      `Desktop 1440x900 overflow: ${JSON.stringify(initialAudit)}`
    );
    assert(
      /255,\s*253,\s*248/i.test(initialAudit.collageBg),
      `Expected warm cream #collage-frame-card (#FFFDF8), got ${initialAudit.collageBg}`
    );
    assert(
      /255,\s*253,\s*248/i.test(initialAudit.radioBg),
      `Expected warm cream #cozy-radio-card (#FFFDF8), got ${initialAudit.radioBg}`
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

    // 1. Verify Mutual Panel Non-Overlap across all floating panels including Collage Frame & Cozy Radio
    const panelTriggers = [
      { btn: '#hud-ambience-pill', key: 'windowAmbience' },
      { btn: '#btn-pomodoro', key: 'pomodoro' },
      { btn: '#btn-teatime', key: 'teatime' },
      { btn: '#btn-weekly-journal', key: 'weeklyJournal' },
      { btn: '#btn-terrarium', key: 'terrarium' },
      { btn: '#btn-musicbox', key: 'goodnightMusicbox' },
      { btn: '#btn-collage-frame', key: 'collageFrame' },
      { btn: '#btn-cozy-radio', key: 'cozyRadio' },
      { btn: '#btn-chat-topic', key: 'topic' },
      { btn: '#btn-shop', key: 'drawer' }
    ];
    for (const step of panelTriggers) {
      await page.click(step.btn);
      await page.waitForTimeout(140);
      const panels = await page.evaluate(() => window.__AR7_DEBUG__.getState().openPanels);
      const openNames = Object.entries(panels)
        .filter(([, isOpen]) => isOpen)
        .map(([k]) => k);
      assert.deepEqual(
        openNames,
        [step.key],
        `Opening ${step.btn} must keep ONLY ${step.key} open, got: ${JSON.stringify(openNames)}`
      );
    }

    // Verify Dress Drawer AR-7 shortcuts open #cozy-radio-card and #collage-frame-card cleanly
    await page.click('[data-ar7-shortcut="radio"]');
    await page.waitForTimeout(150);
    let afterShortcut = await page.evaluate(() => window.__AR7_DEBUG__.getState().openPanels);
    assert.equal(afterShortcut.cozyRadio, true, 'Dress drawer radio shortcut must open #cozy-radio-card');
    assert.equal(afterShortcut.drawer, false, 'Dress drawer must close when #cozy-radio-card opens');

    await page.click('#btn-shop');
    await page.waitForTimeout(140);
    await page.click('#btn-collage-frame');
    await page.waitForTimeout(150);
    afterShortcut = await page.evaluate(() => window.__AR7_DEBUG__.getState().openPanels);
    assert.equal(afterShortcut.collageFrame, true, 'The collage tile in the memory book must open #collage-frame-card');
    assert.equal(afterShortcut.drawer, false, 'Dress drawer must close when #collage-frame-card opens');

    // 2. Verify Cream-Journal Sticker Collage Keepsake Frame (3 Frame Styles + Photo Picks + 3 Stickers + Arrangement/Drag + Desk Display + Save Blessing)
    for (const styleId of ['honey_kraft', 'sakura_letter', 'lace_ivory']) {
      await page.click(`#collage-frame-style-row [data-frame-style="${styleId}"]`);
      await page.waitForTimeout(90);
      const hasClass = await page.evaluate(
        (id) => document.getElementById('collage-polaroid-stage').classList.contains(`is-${id}`),
        styleId
      );
      assert(hasClass, `Expected #collage-polaroid-stage to have class is-${styleId}`);
    }
    // Settle on sakura_letter frame style for aesthetic variety
    await page.click('#collage-frame-style-row [data-frame-style="sakura_letter"]');
    await page.waitForTimeout(80);

    // Cycle companion portrait snapshot sources
    for (const photoId of ['cheer_snap', 'study_snap', 'peace_snap']) {
      await page.click(`#collage-photo-row [data-photo-id="${photoId}"]`);
      await page.waitForTimeout(80);
    }
    await page.click('#collage-photo-row [data-photo-id="cheer_snap"]');
    await page.waitForTimeout(80);

    // Toggle stickers off & back on (ensuring >= 1 sticker stays on when needed, and all 3 active for final collage)
    await page.click('#collage-sticker-grid [data-sticker-id="whale_stamp"]');
    await page.waitForTimeout(80);
    const whaleHidden = await page.evaluate(
      () => document.getElementById('stage-sticker-whale_stamp').classList.contains('hidden')
    );
    assert.equal(whaleHidden, true, 'Toggling whale_stamp off must hide #stage-sticker-whale_stamp');
    await page.click('#collage-sticker-grid [data-sticker-id="whale_stamp"]');
    await page.waitForTimeout(80);
    const whaleShown = await page.evaluate(
      () => !document.getElementById('stage-sticker-whale_stamp').classList.contains('hidden')
    );
    assert.equal(whaleShown, true, 'Toggling whale_stamp back on must show #stage-sticker-whale_stamp');

    // Cycle sticker layout presets and test custom sticker arrangement via pointer drag / moveSticker
    await page.click('#btn-collage-arrange');
    await page.waitForTimeout(90);
    const arrangeHint = await page.locator('#collage-arrange-hint').textContent();
    assert(arrangeHint.includes('(2/4)'), `Expected (2/4) after arrange click, got ${arrangeHint}`);

    const movedPos = await page.evaluate(() => window.__AR7_DEBUG__.moveSticker('whale_stamp', 82, 76, 10));
    assert(movedPos.xPct === 82 && movedPos.yPct === 76, `Custom sticker move must update coordinates, got ${JSON.stringify(movedPos)}`);

    // Toggle desk display off and back on
    await page.click('#btn-collage-display-toggle');
    await page.waitForTimeout(80);
    assert.equal(
      (await page.evaluate(() => window.__AR7_DEBUG__.getState().collageKeepsake.deskDisplayed)),
      false,
      'Desk display toggle should turn off'
    );
    await page.click('#btn-collage-display-toggle');
    await page.waitForTimeout(80);
    assert.equal(
      (await page.evaluate(() => window.__AR7_DEBUG__.getState().collageKeepsake.deskDisplayed)),
      true,
      'Desk display toggle should turn back on'
    );

    // Save decorated collage -> grants coins + intimacy + activates Collage Luck Blessing
    const beforeSave = await page.evaluate(() => window.__AR7_DEBUG__.getState());
    assert.equal(beforeSave.collageLuckBlessing.active, false, 'Collage Luck Blessing starts inactive before first save');

    await page.click('#btn-collage-save');
    await page.waitForTimeout(180);
    const afterSave = await page.evaluate(() => window.__AR7_DEBUG__.getState());

    assert(afterSave.coins >= beforeSave.coins + 24, `Saving collage must award coins (${beforeSave.coins} -> ${afterSave.coins})`);
    assert(
      afterSave.level > beforeSave.level || afterSave.xp > beforeSave.xp,
      'Saving collage must award intimacy EXP'
    );
    assert.equal(afterSave.collageLuckBlessing.active, true, 'Saving collage must activate Collage Luck Blessing');
    assert.equal(afterSave.collageKeepsake.savedCount, 1, 'savedCount must increment to 1');
    assert.equal(
      await page.evaluate(() => !document.getElementById('collage-blessing-pill').classList.contains('hidden')),
      true,
      '#collage-blessing-pill must appear in HUD when Collage Luck Blessing is active'
    );
    assert.equal(
      await page.evaluate(() => !document.getElementById('btn-collage-go-shift').classList.contains('hidden')),
      true,
      '#btn-collage-go-shift must appear after activating Collage Luck Blessing'
    );

    if (SHOT_COLLAGE) {
      fs.mkdirSync(path.dirname(SHOT_COLLAGE), { recursive: true });
      await page.screenshot({ path: SHOT_COLLAGE });
    }

    // Reload and verify Collage Keepsake + Luck Blessing persist in localStorage
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(340);
    const reloadedCollage = await page.evaluate(() => window.__AR7_DEBUG__.getState());
    assert.equal(reloadedCollage.collageKeepsake.savedCount, 1, 'Saved collage count must persist across reload');
    assert.equal(reloadedCollage.collageKeepsake.frameStyle, 'sakura_letter', 'Frame style must persist across reload');
    assert.equal(reloadedCollage.collageLuckBlessing.active, true, 'Collage Luck Blessing must persist across reload');

    // 3. Verify Survivor Shift Collage Luck Blessing (Starting Coin Pouch + Gem Magnet + Lucky Drop Rate + Skill Strip Badge)
    const coinsBeforeShift = reloadedCollage.coins;
    await page.click('#btn-collage-frame');
    await page.waitForTimeout(140);
    await page.click('#btn-collage-go-shift');
    await page.waitForTimeout(240);

    const survState = await page.evaluate(() => window.__AR7_DEBUG__.getState());
    const sm = survState.survivorMetrics;
    assert.equal(survState.gameMode, 'survivor');
    assert(sm.startingCoinPouch >= 30, `Expected startingCoinPouch >= 30, got ${sm.startingCoinPouch}`);
    assert(
      survState.coins >= coinsBeforeShift + 30 && survState.survivorSessionCoins >= 30,
      `Expected starting coin pouch (+30) granted on shift start: before=${coinsBeforeShift}, after=${survState.coins}, session=${survState.survivorSessionCoins}`
    );
    assert(sm.collageLuckBlessing.luckyDropBonus >= 0.18, `Expected luckyDropBonus >= 0.18, got ${sm.collageLuckBlessing.luckyDropBonus}`);
    assert(sm.effectiveLuckyDropBonus >= 0.18, `Expected effectiveLuckyDropBonus >= 0.18, got ${sm.effectiveLuckyDropBonus}`);
    assert(sm.magnetMult >= 1.23, `Expected boosted magnetMult >= 1.23, got ${sm.magnetMult}`);
    assert(sm.effectiveGemMagnetRange >= 215, `Expected boosted gemMagnetRange >= 215, got ${sm.effectiveGemMagnetRange}`);

    const stripHasCollageBadge = await page.evaluate(() => {
      const strip = document.getElementById('surv-skill-strip');
      return Boolean(strip && !strip.classList.contains('hidden') && strip.innerHTML.includes('ui_btn_collage_frame.webp'));
    });
    assert(stripHasCollageBadge, 'Survivor skill strip must display ui_btn_collage_frame.webp luck blessing badge');

    // Return to pet mode
    await page.click('.mode-btn[data-mode="pet"]');
    await page.waitForTimeout(220);

    // 4. Verify Windowside Cozy Lo-Fi Acoustic Radio (3 WebAudio Procedural Channels + Companion Humming Sway + Daily Listener Affection + Weekly Journal Sync)
    const beforeRadio = await page.evaluate(() => window.__AR7_DEBUG__.getState());
    await page.click('#btn-cozy-radio');
    await page.waitForTimeout(160);

    // Start tuning on CH-01, then tune CH-02 and CH-03 to exercise all 3 procedural WebAudio channels
    await page.click('#btn-radio-toggle');
    await page.waitForTimeout(480);

    await page.click('#cozy-radio-channel-list [data-radio-channel="ch02_rain_tea"]');
    await page.waitForTimeout(520);

    await page.click('#cozy-radio-channel-list [data-radio-channel="ch03_hearth_jazz"]');
    await page.waitForTimeout(520);

    // Tune back to CH-01 for a warm desktop snapshot
    await page.click('#cozy-radio-channel-list [data-radio-channel="ch01_guitar"]');
    await page.waitForTimeout(420);

    const radioPlayingState = await page.evaluate(() => window.__AR7_DEBUG__.getState());
    assert.equal(radioPlayingState.cozyRadioRun.playing, true, 'Cozy radio must be actively playing');
    assert.equal(radioPlayingState.radioAudio.active, true, 'WebAudio procedural synthesizer must be active');
    assert(radioPlayingState.radioAudio.noteCount >= 4, `Expected >= 4 synthesized radio steps, got ${radioPlayingState.radioAudio.noteCount}`);
    assert(radioPlayingState.radioAudio.webAudioNodes >= 4, `Expected >= 4 WebAudio nodes, got ${radioPlayingState.radioAudio.webAudioNodes}`);
    assert(radioPlayingState.radioAudio.channelCounts.ch01_guitar >= 1, 'CH-01 acoustic guitar must synthesize steps');
    assert(radioPlayingState.radioAudio.channelCounts.ch02_rain_tea >= 1, 'CH-02 filtered rain + warm bell must synthesize steps');
    assert(radioPlayingState.radioAudio.channelCounts.ch03_hearth_jazz >= 1, 'CH-03 hearth crackle + Rhodes chords must synthesize steps');

    assert.equal(radioPlayingState.isRadioListening, true, 'DeepSeek-chan must enter cozy radio listening state');
    assert.equal(radioPlayingState.petAction, 'radio_sway', 'DeepSeek-chan must sway gently to the music');
    assert(
      radioPlayingState.coins >= beforeRadio.coins + 20,
      `Tuning in must award daily listener affection coins (${beforeRadio.coins} -> ${radioPlayingState.coins})`
    );
    assert.equal(await page.locator('#radio-stat-daily').textContent(), '已领', 'Daily cozy listener affection pill must read 已领');
    assert.equal(
      await page.evaluate(() => document.getElementById('cozy-radio-stage').classList.contains('is-playing')),
      true,
      '#cozy-radio-stage must carry .is-playing class for warm vinyl glow sway'
    );

    if (SHOT_RADIO) {
      fs.mkdirSync(path.dirname(SHOT_RADIO), { recursive: true });
      await page.screenshot({ path: SHOT_RADIO });
    }

    // Fold radio to HUD mini-pill while keeping background music playing, then reopen
    await page.click('#btn-radio-fold');
    await page.waitForTimeout(140);
    const radioPillVisible = await page.evaluate(
      () => !document.getElementById('cozy-radio-pill').classList.contains('hidden')
    );
    assert(radioPillVisible, '#cozy-radio-pill must appear in HUD when Cozy Radio is folded while playing');
    await page.click('#cozy-radio-pill');
    await page.waitForTimeout(140);

    // Advance radio listening minutes & log into AR-5 Weekly Mood Journal
    await page.evaluate(() => window.__AR7_DEBUG__.fastForwardRadio(240));
    await page.click('#btn-radio-log-journal');
    await page.waitForTimeout(160);

    await page.click('#btn-weekly-journal');
    await page.waitForTimeout(180);
    const journalAudit = await page.evaluate(() => {
      const st = window.__AR7_DEBUG__.getState();
      const cardText = document.getElementById('weekly-journal-card')?.textContent || '';
      return {
        summary: st.journalSummary,
        totalListenMinutes: st.cozyRadio.totalListenMinutes,
        cardText
      };
    });
    assert(journalAudit.totalListenMinutes >= 4, `Expected totalListenMinutes >= 4, got ${journalAudit.totalListenMinutes}`);
    assert(journalAudit.summary.radioMins7d >= 4, `Expected Weekly Journal radioMins7d >= 4, got ${journalAudit.summary.radioMins7d}`);
    assert(journalAudit.summary.collages7d >= 1, `Expected Weekly Journal collages7d >= 1, got ${journalAudit.summary.collages7d}`);
    assert(
      journalAudit.cardText.includes('轻电台') && journalAudit.cardText.includes('拼贴'),
      `Expected #weekly-journal-card to render 轻电台 minutes & 拼贴 frames, got ${journalAudit.cardText}`
    );

    // Reload and verify Cozy Radio listening minutes & daily affection date persist in localStorage
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(300);
    const reloadedRadio = await page.evaluate(() => window.__AR7_DEBUG__.getState().cozyRadio);
    assert(reloadedRadio.totalListenMinutes >= 4, 'Cozy Radio listening minutes must persist across reload');
    assert(Boolean(reloadedRadio.lastDailyAffectionDate), 'Daily listener affection date must persist across reload');

    // 5. Mobile 390x844 (portrait forced-landscape) & 844x390 clearance & zero-overflow check
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(280);
    await page.evaluate(() => document.getElementById('btn-collage-frame').click());
    await page.waitForTimeout(220);

    const portraitCollageAudit = await page.evaluate(() => ({
      overflowX: document.documentElement.scrollWidth - window.innerWidth,
      overflowY: document.documentElement.scrollHeight - window.innerHeight,
      collageOpen: !document.getElementById('collage-frame-card').classList.contains('hidden'),
      hasEmoji: /\p{Extended_Pictographic}/u.test(document.body.innerText || '')
    }));
    assert(portraitCollageAudit.collageOpen, '#collage-frame-card must open cleanly on 390x844');
    assert.equal(portraitCollageAudit.hasEmoji, false, 'Zero Emoji on 390x844');
    assert(
      portraitCollageAudit.overflowX <= 0 && portraitCollageAudit.overflowY <= 0,
      `390x844 collage overflow detected: ${JSON.stringify(portraitCollageAudit)}`
    );

    if (SHOT_PORTRAIT) {
      fs.mkdirSync(path.dirname(SHOT_PORTRAIT), { recursive: true });
      await page.screenshot({ path: SHOT_PORTRAIT });
    }

    await page.evaluate(() => document.getElementById('btn-cozy-radio').click());
    await page.waitForTimeout(200);
    const portraitRadioAudit = await page.evaluate(() => ({
      overflowX: document.documentElement.scrollWidth - window.innerWidth,
      overflowY: document.documentElement.scrollHeight - window.innerHeight,
      radioOpen: !document.getElementById('cozy-radio-card').classList.contains('hidden'),
      collageOpen: !document.getElementById('collage-frame-card').classList.contains('hidden')
    }));
    assert(portraitRadioAudit.radioOpen && !portraitRadioAudit.collageOpen, '#cozy-radio-card must open cleanly on 390x844 and close collage');
    assert(
      portraitRadioAudit.overflowX <= 0 && portraitRadioAudit.overflowY <= 0,
      `390x844 radio overflow detected: ${JSON.stringify(portraitRadioAudit)}`
    );

    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(260);
    await page.click('#btn-cozy-radio');
    if (await page.evaluate(() => document.getElementById('cozy-radio-card').classList.contains('hidden'))) {
      await page.click('#btn-cozy-radio');
    }
    await page.click('#btn-radio-toggle');
    await page.waitForTimeout(220);

    const landscapeAudit = await page.evaluate(() => {
      const prof = document.querySelector('.hud-profile-card').getBoundingClientRect();
      const sw = document.getElementById('mode-switcher').getBoundingClientRect();
      const hr = document.querySelector('.hud-right').getBoundingClientRect();
      const joy = document.getElementById('joystick-zone').getBoundingClientRect();
      const care = document.getElementById('pet-care-bar').getBoundingClientRect();
      const act = document.querySelector('.action-zone').getBoundingClientRect();
      const rc = document.getElementById('cozy-radio-card').getBoundingClientRect();
      const careBtnCount = document.querySelectorAll('#pet-care-bar .care-btn').length;
      return {
        overflowX: document.documentElement.scrollWidth - window.innerWidth,
        overflowY: document.documentElement.scrollHeight - window.innerHeight,
        radioOpen: !document.getElementById('cozy-radio-card').classList.contains('hidden'),
        collageOpen: !document.getElementById('collage-frame-card').classList.contains('hidden'),
        careBtnCount,
        profileRight: prof.right,
        radioLeft: rc.left,
        radioBottom: rc.bottom,
        actTop: act.top,
        switcherRight: sw.right,
        hudRightLeft: hr.left,
        joyRight: joy.right,
        careLeft: care.left,
        careRight: care.right,
        actLeft: act.left
      };
    });
    assert(landscapeAudit.radioOpen && !landscapeAudit.collageOpen, 'Cozy radio card must be open on 844x390');
    assert(landscapeAudit.careBtnCount >= 13, `Expected >= 13 cozy dock buttons in #pet-care-bar, got ${landscapeAudit.careBtnCount}`);
    assert(
      landscapeAudit.overflowX <= 0 && landscapeAudit.overflowY <= 0,
      `844x390 viewport overflow: ${JSON.stringify(landscapeAudit)}`
    );
    assert(
      landscapeAudit.profileRight <= landscapeAudit.radioLeft,
      `Cozy radio card overlaps .hud-profile-card on 844x390: ${JSON.stringify(landscapeAudit)}`
    );
    assert(
      landscapeAudit.radioBottom <= landscapeAudit.actTop + 2,
      `Cozy radio card overlaps .action-zone on 844x390: ${JSON.stringify(landscapeAudit)}`
    );
    assert(
      landscapeAudit.switcherRight <= landscapeAudit.hudRightLeft + 2,
      `Top HUD overlap on 844x390: ${JSON.stringify(landscapeAudit)}`
    );
    assert(
      landscapeAudit.joyRight <= landscapeAudit.careLeft + 2 &&
        landscapeAudit.careRight <= landscapeAudit.actLeft + 2,
      `Bottom 13-button dock overlap on 844x390: ${JSON.stringify(landscapeAudit)}`
    );

    if (SHOT_LANDSCAPE) {
      fs.mkdirSync(path.dirname(SHOT_LANDSCAPE), { recursive: true });
      await page.screenshot({ path: SHOT_LANDSCAPE });
    }

    assert.equal(consoleErrors.length, 0, `Console errors observed: ${consoleErrors.join('; ')}`);
    assert.equal(pageErrors.length, 0, `Page errors observed: ${pageErrors.join('; ')}`);
    assert.equal(failedResponses.length, 0, `HTTP >= 400 responses observed: ${failedResponses.join('; ')}`);

    console.log(
      '[E2E PASS] AR-7 Cream-Journal Sticker Collage Keepsake Frame (3 paper frames + 3 stickers + arrangement + desk display + Survivor Collage Luck Blessing) + Windowside Cozy Radio (3 WebAudio channels + humming sway + daily listener affection + Weekly Journal sync) passed across 1440x900, 390x844, and 844x390 with 0px overflow and 0 errors!'
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
