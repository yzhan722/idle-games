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
const PORT = Number(process.env.AR5_PORT || 0);

const SHOT_TEATIME = process.env.AR5_DESKTOP_TEATIME_SHOT || '';
const SHOT_JOURNAL = process.env.AR5_DESKTOP_JOURNAL_SHOT || '';
const SHOT_PORTRAIT = process.env.AR5_MOBILE_PORTRAIT_SHOT || '';
const SHOT_LANDSCAPE = process.env.AR5_MOBILE_LANDSCAPE_SHOT || '';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.json': 'application/json; charset=utf-8'
};

const REQUIRED_AR5_ASSETS = [
  'ui_btn_teatime.webp',
  'tea_peach_oolong.webp',
  'tea_blueberry_foam.webp',
  'tea_osmanthus_milk.webp',
  'pastry_souffle.webp',
  'pastry_whale_macaron.webp',
  'pastry_pudding_tart.webp',
  'tea_platter_signature.webp',
  'ui_btn_weekly_journal.webp'
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
    assert(!/<svg[\s>]/i.test(content), `Inline <svg> detected in ${file}`);
    assert(!/\p{Extended_Pictographic}/u.test(content), `Emoji character detected in public/${file}`);
    const matches = content.matchAll(/\.\/assets\/([a-zA-Z0-9_.-]+\.(?:webp|png|jpg))/g);
    for (const m of matches) {
      assetRefs.add(m[1]);
    }
  }

  const htmlContent = fs.readFileSync(path.join(PUBLIC_DIR, 'index.html'), 'utf8');
  assert(/\.\/style\.css\?v=hd(?:2\d|[3-9]\d)/.test(htmlContent), 'index.html must reference ./style.css?v=hd20+');
  assert(/\.\/game\.js\?v=hd(?:4\d|[5-9]\d)\b/.test(htmlContent), 'index.html must reference ./game.js?v=hd44+');

  const cssContent = fs.readFileSync(path.join(PUBLIC_DIR, 'style.css'), 'utf8');
  assert(/\?v=hd(?:2\d|[3-9]\d)/.test(cssContent), 'style.css must bump asset cache-buster to ?v=hd20+');

  const spritesContent = fs.readFileSync(path.join(PUBLIC_DIR, 'sprites.js'), 'utf8');
  assert(/\?v=hd(?:2\d|[3-9]\d)/.test(spritesContent), 'sprites.js must reference ?v=hd20+');

  const gameContent = readGameSource(PUBLIC_DIR);
  assert(/\.\/sprites\.js\?v=hd(?:2\d|[3-9]\d)/.test(gameContent), 'game.js must import ./sprites.js?v=hd20+');

  for (const reqAsset of REQUIRED_AR5_ASSETS) {
    assert(assetRefs.has(reqAsset), `Required AR-5 asset ${reqAsset} is not referenced in code`);
  }

  for (const asset of assetRefs) {
    const full = path.join(PUBLIC_DIR, 'assets', asset);
    assert(fs.existsSync(full), `Missing asset on disk: ${full}`);
    assert(fs.statSync(full).size > 0, `Empty asset on disk: ${full}`);
  }

  console.log(
    `[STATIC PASS] ${jsFiles.length} JS modules syntax-checked, ${assetRefs.size} assets verified on disk (including all 9 AR-5 icons), ?v=hd20/hd44 synced, 0 inline <svg>, 0 Emoji across HTML/CSS/JS.`
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

    // 0. DOM Emoji, warm creamy-journal palette & image decode audit
    const initialAudit = await page.evaluate(() => {
      const text = document.body.innerText || '';
      const hasEmoji = /\p{Extended_Pictographic}/u.test(text);
      const teaBg = getComputedStyle(document.getElementById('teatime-card')).backgroundImage;
      const journalBg = getComputedStyle(document.getElementById('weekly-journal-card')).backgroundImage;
      const brokenImgs = Array.from(document.querySelectorAll('img'))
        .filter((img) => {
          const src = img.getAttribute('src') || '';
          return src.startsWith('./assets/') && (!img.complete || img.naturalWidth === 0);
        })
        .map((img) => img.getAttribute('src'));
      return {
        hasEmoji,
        teaBg,
        journalBg,
        brokenImgs,
        overflowX: document.documentElement.scrollWidth - window.innerWidth,
        overflowY: document.documentElement.scrollHeight - window.innerHeight
      };
    });
    assert.equal(initialAudit.hasEmoji, false, 'Visible DOM must contain zero Emoji characters');
    assert.equal(initialAudit.brokenImgs.length, 0, `Broken ./assets/ images: ${initialAudit.brokenImgs.join(', ')}`);
    assert(
      initialAudit.overflowX <= 0 && initialAudit.overflowY <= 0,
      `Desktop 1440x900 overflow: ${JSON.stringify(initialAudit)}`
    );
    assert(/255,\s*253,\s*248/i.test(initialAudit.teaBg), `Expected warm cream #teatime-card, got ${initialAudit.teaBg}`);
    assert(
      /255,\s*253,\s*248/i.test(initialAudit.journalBg),
      `Expected warm cream #weekly-journal-card, got ${initialAudit.journalBg}`
    );

    // 1. Verify Mutual Card Non-Overlap across all floating panels
    const panelTriggers = [
      { btn: '#hud-ambience-pill', key: 'windowAmbience' },
      { btn: '#btn-pomodoro', key: 'pomodoro' },
      { btn: '#btn-teatime', key: 'teatime' },
      { btn: '#btn-weekly-journal', key: 'weeklyJournal' },
      { btn: '#btn-chat-topic', key: 'topic' },
      { btn: '#btn-feed', key: 'drawer' },
      { btn: '#btn-teatime', key: 'teatime' }
    ];
    for (const step of panelTriggers) {
      await page.click(step.btn);
      await page.waitForTimeout(160);
      const panels = await page.evaluate(() => window.__AR5_DEBUG__.getState().openPanels);
      const openNames = Object.entries(panels)
        .filter(([, isOpen]) => isOpen)
        .map(([k]) => k);
      assert.deepEqual(
        openNames,
        [step.key],
        `Opening ${step.btn} must keep ONLY ${step.key} open (mutual non-overlap), got: ${JSON.stringify(openNames)}`
      );
    }

    // Also test Food Drawer shortcut banner -> opens #teatime-card and closes drawer
    await page.click('#btn-feed');
    await page.waitForTimeout(150);
    await page.click('#drawer-items .shop-card:first-child');
    await page.waitForTimeout(160);
    let panelsAfterShortcut = await page.evaluate(() => window.__AR5_DEBUG__.getState().openPanels);
    assert.equal(panelsAfterShortcut.teatime, true, 'Food drawer banner should open #teatime-card');
    assert.equal(panelsAfterShortcut.drawer, false, 'Food drawer should close when #teatime-card opens');

    // 2. Verify Cozy Afternoon Tea & Dessert Crafting Counter (3x3 = 9 Signature Sets + Rewards + Persistence)
    await page.click('#teatime-base-grid [data-tea-base="blueberry_foam"]');
    await page.click('#teatime-pastry-grid [data-pastry="souffle"]');
    await page.waitForTimeout(120);
    assert.equal(await page.locator('#teatime-recipe-name').textContent(), '海盐莓果云朵茶席');

    const beforeServe = await page.evaluate(() => window.__AR5_DEBUG__.getState());
    await page.click('#btn-teatime-serve');
    await page.waitForTimeout(220);
    const afterServe = await page.evaluate(() => window.__AR5_DEBUG__.getState());

    assert(afterServe.coins > beforeServe.coins, 'Serving Afternoon Tea must reward coins');
    assert(
      afterServe.level > beforeServe.level || afterServe.xp > beforeServe.xp,
      'Serving Afternoon Tea must reward intimacy EXP'
    );
    assert(afterServe.teaPlatterTimer > 0, 'Serving Afternoon Tea must display platter prop beside DeepSeek-chan');
    assert(afterServe.emote.includes('奶盖') || afterServe.emote.includes('舒芙蕾'), `Unexpected reaction emote: ${afterServe.emote}`);
    assert.equal(afterServe.afternoonTea.activeBuff?.recipeId, 'blueberry_foam__souffle');
    assert.equal(afterServe.afternoonTea.activeBuff?.startingShield, 65);

    const buffPillVisible = await page.evaluate(
      () => !document.getElementById('teatime-buff-pill').classList.contains('hidden')
    );
    assert(buffPillVisible, '#teatime-buff-pill must appear in HUD when Afternoon Tea Shift Buff is active');

    if (SHOT_TEATIME) {
      fs.mkdirSync(path.dirname(SHOT_TEATIME), { recursive: true });
      await page.screenshot({ path: SHOT_TEATIME });
    }

    // Craft all remaining combinations to unlock all 9/9 recipes
    const bases = ['peach_oolong', 'blueberry_foam', 'osmanthus_milk'];
    const pastries = ['souffle', 'whale_macaron', 'pudding_tart'];
    for (const b of bases) {
      for (const p of pastries) {
        if (b === 'blueberry_foam' && p === 'souffle') continue;
        await page.click(`#teatime-base-grid [data-tea-base="${b}"]`);
        await page.click(`#teatime-pastry-grid [data-pastry="${p}"]`);
        await page.click('#btn-teatime-serve');
      }
    }
    await page.waitForTimeout(200);
    assert.equal(await page.locator('#teatime-codex-pill').textContent(), '食谱 9/9');
    assert.equal(await page.locator('.teatime-codex-slot.unlocked').count(), 9);

    // Select blueberry_foam + pudding_tart (startingShield: 75, magnet +45%, haste +20%, coin +26%) for Survivor Shift Buff verification
    await page.click('#teatime-base-grid [data-tea-base="blueberry_foam"]');
    await page.click('#teatime-pastry-grid [data-pastry="pudding_tart"]');
    await page.click('#btn-teatime-serve');
    await page.waitForTimeout(160);

    // Reload and verify localStorage persistence of 9/9 recipes + activeBuff
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(320);
    const reloadedTea = await page.evaluate(() => window.__AR5_DEBUG__.getState().afternoonTea);
    assert.equal(Object.keys(reloadedTea.discoveredRecipes).length, 9, 'All 9 discovered tea recipes must persist across reload');
    assert.equal(reloadedTea.activeBuff?.recipeId, 'blueberry_foam__pudding_tart', 'Active tea buff must persist across reload');

    // 3. Verify Survivor Shift Buffs in `survivor` mode (Starting Shield, EXP Magnet, Attack Haste, Coin Bonus)
    await page.click('.mode-btn[data-mode="survivor"]');
    await page.waitForTimeout(260);
    const buffedSurv = await page.evaluate(() => window.__AR5_DEBUG__.getSurvivorEffectiveMetrics());
    assert.equal(buffedSurv.gameMode, 'survivor');
    assert.equal(buffedSurv.hasActiveTeaBuff, true);
    assert.equal(buffedSurv.teaShieldMax, 75, 'Survivor shift must grant +75 starting shield from Afternoon Tea');
    assert(buffedSurv.teaShield > 0, 'Active tea shield should be positive upon entering survivor shift');
    assert(buffedSurv.hasteMult > 1.15, `Expected attack haste > 1.15, got ${buffedSurv.hasteMult}`);
    assert(buffedSurv.magnetMult > 1.4, `Expected magnet mult > 1.4, got ${buffedSurv.magnetMult}`);
    assert(buffedSurv.coinMult > 1.2, `Expected coin mult > 1.2, got ${buffedSurv.coinMult}`);

    const stripHasTeaBadge = await page.evaluate(() => {
      const strip = document.getElementById('surv-skill-strip');
      return Boolean(strip && !strip.classList.contains('hidden') && strip.innerHTML.includes('tea_platter_signature.webp'));
    });
    assert(stripHasTeaBadge, 'Survivor skill strip must display the active Afternoon Tea Shift Buff badge');

    // Expire tea buff via debug fast-forward and compare unbuffed survivor metrics
    await page.evaluate(() => window.__AR5_DEBUG__.fastForwardTeaBuff(500));
    const unbuffedSurv = await page.evaluate(() => window.__AR5_DEBUG__.getSurvivorEffectiveMetrics());
    assert.equal(unbuffedSurv.hasActiveTeaBuff, false);
    assert(
      buffedSurv.effectiveFireInterval < unbuffedSurv.effectiveFireInterval,
      `Buffed fireInterval (${buffedSurv.effectiveFireInterval}) must be faster than unbuffed (${unbuffedSurv.effectiveFireInterval})`
    );
    assert(
      buffedSurv.effectiveGemMagnetRange > unbuffedSurv.effectiveGemMagnetRange,
      `Buffed gemMagnetRange (${buffedSurv.effectiveGemMagnetRange}) must exceed unbuffed (${unbuffedSurv.effectiveGemMagnetRange})`
    );

    // Return to pet mode
    await page.click('.mode-btn[data-mode="pet"]');
    await page.waitForTimeout(220);

    // 4. Verify Weekly Companion Mood Journal & Stamp Card (7-day tracking + mood seals + 3 weekly gift boxes)
    // Trigger feeding, chatting, Polaroid snap, and 15-min Pomodoro completion so all 6 categories have real live activity
    await page.click('#btn-feed');
    await page.waitForTimeout(150);
    // Second card in food drawer is free rice (first is teatime shortcut banner)
    await page.click('#drawer-items .shop-card:nth-child(2)');
    await page.waitForTimeout(180);

    await page.click('#btn-chat-topic');
    await page.waitForTimeout(180);
    await page.click('#topic-options-list .topic-opt-btn:first-child');
    await page.waitForTimeout(180);

    await page.click('#btn-photo-snap');
    await page.waitForTimeout(1150);
    await page.evaluate(() => document.getElementById('btn-polaroid-close')?.click());
    await page.waitForTimeout(140);

    await page.click('#btn-pomodoro');
    await page.waitForTimeout(150);
    await page.click('.pomo-preset-btn[data-mins="15"]');
    await page.click('#btn-pomo-start');
    await page.evaluate(() => window.__AR4_DEBUG__.fastForwardPomodoro(905));
    await page.waitForTimeout(180);

    // Seed 4 earlier days in the past 7-day rolling window so stamps7d >= 5 -> unlocks all 3 Weekly Milestone Gift Boxes!
    await page.evaluate(() => {
      const now = new Date();
      for (let back = 1; back <= 4; back++) {
        const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate() - back, 12, 0, 0);
        window.__AR5_DEBUG__.recordActivityOnDate('feeds', 1, dt.toISOString());
      }
    });

    await page.click('#btn-weekly-journal');
    await page.waitForTimeout(220);

    const journalStateBeforeClaim = await page.evaluate(() => window.__AR5_DEBUG__.getState());
    const jsSum = journalStateBeforeClaim.journalSummary;
    assert(jsSum.stamps7d >= 5, `Expected >= 5 daily mood stamps in 7-day window, got ${jsSum.stamps7d}`);
    assert(jsSum.feeds7d >= 5, `Expected feeds7d >= 5, got ${jsSum.feeds7d}`);
    assert(jsSum.chats7d >= 1, `Expected chats7d >= 1, got ${jsSum.chats7d}`);
    assert(jsSum.snaps7d >= 1, `Expected snaps7d >= 1, got ${jsSum.snaps7d}`);
    assert(jsSum.focusMins7d >= 15, `Expected focusMins7d >= 15, got ${jsSum.focusMins7d}`);
    assert.equal(jsSum.cumulative.recipesDiscovered, 9, 'Journal must reflect 9/9 Afternoon Tea recipes discovered');
    assert(jsSum.shifts7d >= 1, `Expected shifts7d >= 1, got ${jsSum.shifts7d}`);
    assert.equal(jsSum.claimableCount, 3, 'All 3 Weekly Milestone Gift Boxes should be claimable');

    // Change today's mood seal to 'star' and click #btn-journal-stamp-today
    await page.click('#journal-mood-picker [data-mood-id="star"]');
    await page.click('#btn-journal-stamp-today');
    await page.waitForTimeout(150);

    if (SHOT_JOURNAL) {
      // Re-serve a tea platter so desktop screenshot shows active buff pill + warm journal card!
      fs.mkdirSync(path.dirname(SHOT_JOURNAL), { recursive: true });
      await page.screenshot({ path: SHOT_JOURNAL });
    }

    // Claim all 3 Weekly Milestone Gift Boxes via UI clicks
    const coinsBeforeGifts = (await page.evaluate(() => window.__AR5_DEBUG__.getState())).coins;
    for (const tier of ['tier1', 'tier2', 'tier3']) {
      await page.click(`#journal-gift-row [data-gift-tier="${tier}"]`);
      await page.waitForTimeout(140);
    }
    const afterGifts = await page.evaluate(() => window.__AR5_DEBUG__.getState());
    assert(afterGifts.coins >= coinsBeforeGifts + 210, `Claiming 3 weekly gift boxes should add >= 210 coins (${coinsBeforeGifts} -> ${afterGifts.coins})`);
    assert.equal(afterGifts.journalSummary.claimableCount, 0, 'All 3 weekly gift boxes should now be claimed');
    assert.equal(await page.locator('.journal-gift-card.claimed').count(), 3);

    // Reload and verify Weekly Journal stamps + claimed gift boxes persist in localStorage
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(300);
    const reloadedJournal = await page.evaluate(() => window.__AR5_DEBUG__.getState().journalSummary);
    assert(reloadedJournal.stamps7d >= 5, '7-day mood stamps must persist across reload');
    assert.equal(reloadedJournal.claimableCount, 0, 'Claimed weekly gift boxes must remain claimed across reload');

    // 5. Mobile 390x844 (portrait forced-landscape) & 844x390 clearance & zero-overflow check
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(280);
    await page.evaluate(() => document.getElementById('btn-teatime').click());
    await page.waitForTimeout(220);

    const portraitTeatimeAudit = await page.evaluate(() => ({
      overflowX: document.documentElement.scrollWidth - window.innerWidth,
      overflowY: document.documentElement.scrollHeight - window.innerHeight,
      teatimeOpen: !document.getElementById('teatime-card').classList.contains('hidden'),
      hasEmoji: /\p{Extended_Pictographic}/u.test(document.body.innerText || '')
    }));
    assert(portraitTeatimeAudit.teatimeOpen, '#teatime-card must open cleanly on 390x844');
    assert.equal(portraitTeatimeAudit.hasEmoji, false, 'Zero Emoji on 390x844');
    assert(
      portraitTeatimeAudit.overflowX <= 0 && portraitTeatimeAudit.overflowY <= 0,
      `390x844 overflow detected: ${JSON.stringify(portraitTeatimeAudit)}`
    );

    if (SHOT_PORTRAIT) {
      fs.mkdirSync(path.dirname(SHOT_PORTRAIT), { recursive: true });
      await page.screenshot({ path: SHOT_PORTRAIT });
    }

    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(260);
    await page.click('#btn-weekly-journal');
    await page.waitForTimeout(200);

    const landscapeAudit = await page.evaluate(() => {
      const prof = document.querySelector('.hud-profile-card').getBoundingClientRect();
      const sw = document.getElementById('mode-switcher').getBoundingClientRect();
      const hr = document.querySelector('.hud-right').getBoundingClientRect();
      const joy = document.getElementById('joystick-zone').getBoundingClientRect();
      const care = document.getElementById('pet-care-bar').getBoundingClientRect();
      const act = document.querySelector('.action-zone').getBoundingClientRect();
      const jc = document.getElementById('weekly-journal-card').getBoundingClientRect();
      return {
        overflowX: document.documentElement.scrollWidth - window.innerWidth,
        overflowY: document.documentElement.scrollHeight - window.innerHeight,
        journalOpen: !document.getElementById('weekly-journal-card').classList.contains('hidden'),
        teatimeOpen: !document.getElementById('teatime-card').classList.contains('hidden'),
        profileRight: prof.right,
        journalLeft: jc.left,
        journalBottom: jc.bottom,
        actTop: act.top,
        switcherRight: sw.right,
        hudRightLeft: hr.left,
        joyRight: joy.right,
        careLeft: care.left,
        careRight: care.right,
        actLeft: act.left
      };
    });
    assert(landscapeAudit.journalOpen && !landscapeAudit.teatimeOpen, 'Opening journal on 844x390 must close teatime card');
    assert(
      landscapeAudit.overflowX <= 0 && landscapeAudit.overflowY <= 0,
      `844x390 viewport overflow: ${JSON.stringify(landscapeAudit)}`
    );
    assert(
      landscapeAudit.profileRight <= landscapeAudit.journalLeft,
      `Weekly journal card overlaps .hud-profile-card on 844x390: ${JSON.stringify(landscapeAudit)}`
    );
    assert(
      landscapeAudit.journalBottom <= landscapeAudit.actTop + 2,
      `Weekly journal card overlaps .action-zone on 844x390: ${JSON.stringify(landscapeAudit)}`
    );
    assert(
      landscapeAudit.switcherRight <= landscapeAudit.hudRightLeft + 2,
      `Top HUD overlap on 844x390: ${JSON.stringify(landscapeAudit)}`
    );
    assert(
      landscapeAudit.joyRight <= landscapeAudit.careLeft + 2 &&
        landscapeAudit.careRight <= landscapeAudit.actLeft + 2,
      `Bottom 9-button dock overlap on 844x390: ${JSON.stringify(landscapeAudit)}`
    );

    if (SHOT_LANDSCAPE) {
      fs.mkdirSync(path.dirname(SHOT_LANDSCAPE), { recursive: true });
      await page.screenshot({ path: SHOT_LANDSCAPE });
    }

    assert.equal(consoleErrors.length, 0, `Console errors observed: ${consoleErrors.join('; ')}`);
    assert.equal(pageErrors.length, 0, `Page errors observed: ${pageErrors.join('; ')}`);
    assert.equal(failedResponses.length, 0, `HTTP >= 400 responses observed: ${failedResponses.join('; ')}`);

    console.log(
      '[E2E PASS] AR-5 Cozy Afternoon Tea & Dessert Crafting Counter (9/9 recipes + 4 Survivor Shift Buffs) + Weekly Companion Mood Journal & Stamp Card passed across 1440x900, 390x844, and 844x390 with 0px overflow and 0 errors!'
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
