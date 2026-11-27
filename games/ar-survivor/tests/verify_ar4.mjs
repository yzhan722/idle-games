import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { prepareArContext } from './_ar_entry_helper.mjs';
import { GAME_MODULES } from './_split_lib.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('C:/project/idle-games/node_modules/playwright');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const GAME_ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(GAME_ROOT, 'public');
const PORT = Number(process.env.AR4_PORT || 4221);
const DESKTOP_SHOT = process.env.AR4_DESKTOP_SCREENSHOT || '';
const MOBILE_SHOT = process.env.AR4_MOBILE_SCREENSHOT || '';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.json': 'application/json; charset=utf-8'
};

const REQUIRED_AR4_ASSETS = [
  'win_morning.webp',
  'win_noon.webp',
  'win_dusk.webp',
  'win_starry.webp',
  'vfx_season_spring.webp',
  'vfx_season_summer.webp',
  'vfx_season_autumn.webp',
  'vfx_season_winter.webp',
  'ui_btn_pomodoro.webp',
  'ui_stamp_focus.webp',
  'prop_study_book.webp'
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
    const matches = content.matchAll(/\.\/assets\/([a-zA-Z0-9_.-]+\.(?:webp|png|jpg))/g);
    for (const m of matches) {
      assetRefs.add(m[1]);
    }
  }

  const htmlContent = fs.readFileSync(path.join(PUBLIC_DIR, 'index.html'), 'utf8');
  assert(/\.\/style\.css\?v=hd(19|2\d|[3-9]\d)/.test(htmlContent), 'index.html must reference ./style.css?v=hd19+');
  assert(!/\p{Extended_Pictographic}/u.test(htmlContent), 'Emoji character detected in public/index.html');

  const cssContent = fs.readFileSync(path.join(PUBLIC_DIR, 'style.css'), 'utf8');
  assert(!/\p{Extended_Pictographic}/u.test(cssContent), 'Emoji character detected in public/style.css');

  for (const reqAsset of REQUIRED_AR4_ASSETS) {
    assetRefs.add(reqAsset);
  }

  for (const asset of assetRefs) {
    const full = path.join(PUBLIC_DIR, 'assets', asset);
    assert(fs.existsSync(full), `Missing asset on disk: ${full}`);
    assert(fs.statSync(full).size > 0, `Empty asset on disk: ${full}`);
  }

  console.log(
    `[STATIC PASS] ${jsFiles.length} JS modules syntax-checked, ${assetRefs.size} asset references verified on disk (including 11 AR-4 assets), 0 inline <svg>, 0 Emoji in HTML/CSS.`
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

    // 0. Verify zero Emoji in visible DOM text & warm creamy-journal palette
    const domAudit = await page.evaluate(() => {
      const text = document.body.innerText || '';
      const hasEmoji = /\p{Extended_Pictographic}/u.test(text);
      const ambCardBg = getComputedStyle(document.getElementById('window-ambience-card')).backgroundImage;
      const pomoCardBg = getComputedStyle(document.getElementById('pomodoro-card')).backgroundImage;
      return {
        hasEmoji,
        ambCardBg,
        pomoCardBg,
        overflowX: document.documentElement.scrollWidth - window.innerWidth,
        overflowY: document.documentElement.scrollHeight - window.innerHeight
      };
    });
    assert.equal(domAudit.hasEmoji, false, 'Visible DOM must contain zero Emoji characters');
    assert(domAudit.overflowX <= 0 && domAudit.overflowY <= 0, `Desktop 1440x900 overflow: ${JSON.stringify(domAudit)}`);
    assert(/255,\s*253,\s*248/i.test(domAudit.ambCardBg), `Expected warm cream window-ambience-card, got ${domAudit.ambCardBg}`);
    assert(/255,\s*253,\s*248/i.test(domAudit.pomoCardBg), `Expected warm cream pomodoro-card, got ${domAudit.pomoCardBg}`);

    // 1. Verify Four-Season & 4-Time-of-Day Window View Ambience (HUD card + Clock Auto-Sync + Drawer sync + Persistence)
    const clockDerivations = await page.evaluate(() => ({
      morning: window.__AR4_DEBUG__.deriveClockAmbience('2026-04-12T08:15:00'),
      noon: window.__AR4_DEBUG__.deriveClockAmbience('2026-07-18T13:30:00'),
      dusk: window.__AR4_DEBUG__.deriveClockAmbience('2026-10-09T18:10:00'),
      starry: window.__AR4_DEBUG__.deriveClockAmbience('2026-12-24T22:45:00')
    }));
    assert.deepEqual(clockDerivations.morning, { period: 'morning', season: 'spring' });
    assert.deepEqual(clockDerivations.noon, { period: 'noon', season: 'summer' });
    assert.deepEqual(clockDerivations.dusk, { period: 'dusk', season: 'autumn' });
    assert.deepEqual(clockDerivations.starry, { period: 'starry', season: 'winter' });

    await page.click('#hud-ambience-pill');
    await page.waitForTimeout(200);
    const ambVisible = await page.evaluate(
      () => !document.getElementById('window-ambience-card').classList.contains('hidden')
    );
    assert(ambVisible, 'Clicking #hud-ambience-pill should open #window-ambience-card');

    for (const p of ['morning', 'noon', 'dusk', 'starry']) {
      await page.click(`#ambience-period-grid .ambience-period-btn[data-period="${p}"]`);
      await page.waitForTimeout(140);
      const st = await page.evaluate(() => window.__AR4_DEBUG__.getState());
      assert.equal(st.windowAmbience.period, p, `Period should switch to ${p}`);
      assert.equal(st.windowAmbience.autoSync, false, 'Manual period click should disable autoSync');
      assert.equal(st.visionAmbience.period, p, `Vision engine period should match ${p}`);
      assert.equal(st.isDarkRoom, p === 'starry', `isDarkRoom should be ${p === 'starry'} when period is ${p}`);
    }

    const expectedSeasonNames = {
      spring: '春樱',
      summer: '夏风',
      autumn: '秋枫',
      winter: '初雪'
    };
    for (const [sKey, sName] of Object.entries(expectedSeasonNames)) {
      await page.click(`#ambience-season-grid .ambience-season-btn[data-season="${sKey}"]`);
      await page.waitForTimeout(120);
      const label = await page.locator('#hud-ambience-label').textContent();
      assert(label.includes(sName), `Expected #hud-ambience-label to include ${sName}, got ${label}`);
    }

    // Set Dusk + Autumn and verify reload persistence + Drawer DIY sync
    await page.click('#ambience-period-grid .ambience-period-btn[data-period="dusk"]');
    await page.click('#ambience-season-grid .ambience-season-btn[data-season="autumn"]');
    await page.waitForTimeout(150);

    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(320);
    let persisted = await page.evaluate(() => window.__AR4_DEBUG__.getState());
    assert.deepEqual(persisted.windowAmbience, {
      autoSync: false,
      period: 'dusk',
      season: 'autumn'
    });

    // Check Dress Drawer synchronization
    await page.click('#btn-shop');
    await page.waitForTimeout(220);
    await page.click('[data-drawer-period="morning"]');
    await page.click('[data-drawer-season="spring"]');
    await page.waitForTimeout(150);
    persisted = await page.evaluate(() => window.__AR4_DEBUG__.getState());
    assert.equal(persisted.windowAmbience.period, 'morning');
    assert.equal(persisted.windowAmbience.season, 'spring');
    await page.click('#btn-drawer-close');
    await page.waitForTimeout(150);

    // 2. Verify Creamy Journal Pomodoro Focus Companion Mode
    await page.click('#btn-pomodoro');
    await page.waitForTimeout(220);

    // Test 15 / 25 / 45 min presets
    await page.click('.pomo-preset-btn[data-mins="45"]');
    assert.equal(await page.locator('#pomodoro-clock').textContent(), '45:00');
    await page.click('.pomo-preset-btn[data-mins="25"]');
    assert.equal(await page.locator('#pomodoro-clock').textContent(), '25:00');
    await page.click('.pomo-preset-btn[data-mins="15"]');
    assert.equal(await page.locator('#pomodoro-clock').textContent(), '15:00');

    // Set Focus Task Tag via chip + custom input
    await page.click('.pomo-tag-chip[data-tag="读书充电"]');
    assert.equal(await page.locator('#pomodoro-task-input').inputValue(), '读书充电');
    await page.fill('#pomodoro-task-input', '手账伴读测试');

    const beforeFocus = await page.evaluate(() => window.__AR4_DEBUG__.getState());

    // Start Focus Session -> verify quiet study companion posture
    await page.click('#btn-pomo-start');
    await page.waitForTimeout(250);
    let pomoState = await page.evaluate(() => window.__AR4_DEBUG__.getState());
    assert.equal(pomoState.pomodoroRun.status, 'running');
    assert.equal(pomoState.isFocusStudying, true, 'DeepSeek-chan should enter quiet study posture during Pomodoro');
    assert.equal(pomoState.petAction, 'focus_study');
    assert.equal(pomoState.pomodoro.taskTag, '手账伴读测试');

    // Fold into mini pill and re-expand
    await page.click('#btn-pomo-fold');
    await page.waitForTimeout(150);
    const miniVisible = await page.evaluate(
      () => !document.getElementById('pomodoro-mini-pill').classList.contains('hidden')
    );
    assert(miniVisible, '#pomodoro-mini-pill should appear when active Pomodoro card is folded');
    await page.click('#pomodoro-mini-pill');
    await page.waitForTimeout(150);

    // Pause & Resume
    await page.click('#btn-pomo-pause');
    await page.waitForTimeout(150);
    pomoState = await page.evaluate(() => window.__AR4_DEBUG__.getState());
    assert.equal(pomoState.pomodoroRun.status, 'paused');
    assert.equal(pomoState.isFocusStudying, false);

    await page.click('#btn-pomo-pause');
    await page.waitForTimeout(150);
    pomoState = await page.evaluate(() => window.__AR4_DEBUG__.getState());
    assert.equal(pomoState.pomodoroRun.status, 'running');
    assert.equal(pomoState.isFocusStudying, true);

    // Capture optional desktop screenshot while active focus companion + dusk/spring window view is live!
    if (DESKTOP_SHOT) {
      await page.evaluate(() => {
        window.__AR4_DEBUG__.setWindowAmbience({ autoSync: false, period: 'dusk', season: 'spring' }, false);
      });
      await page.waitForTimeout(280);
      fs.mkdirSync(path.dirname(DESKTOP_SHOT), { recursive: true });
      await page.screenshot({ path: DESKTOP_SHOT });
    }

    // 连签日期相对页面本地“今天”生成：Day 1 = 昨天，Day 2 = 今天。
    // 原先硬编码 2026-11-14/15，过了那两天后刷新时 lastCompletedDate 早于昨天，游戏按真实时钟把连签清零导致误报失败；
    // 在页面内用同一时钟/时区计算，跨午夜运行也只会让“今天”变成“昨天”，连签依旧有效。
    const streakDates = await page.evaluate(() => {
      const pad = (n) => String(n).padStart(2, '0');
      const localIso = (d, hh, mm) =>
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(hh)}:${pad(mm)}:00`;
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      return {
        day1Half: localIso(yesterday, 10, 8),
        day1Done: localIso(yesterday, 10, 15),
        day2Done: localIso(today, 11, 0)
      };
    });

    // Fast-forward halfway, then complete Day 1 session
    await page.evaluate((iso) => window.__AR4_DEBUG__.fastForwardPomodoro(460, iso), streakDates.day1Half);
    pomoState = await page.evaluate(() => window.__AR4_DEBUG__.getState());
    assert.equal(pomoState.pomodoroRun.status, 'running');
    assert(pomoState.pomodoroRun.remainingSec <= 445);

    await page.evaluate((iso) => window.__AR4_DEBUG__.fastForwardPomodoro(500, iso), streakDates.day1Done);
    await page.waitForTimeout(200);
    const afterDay1 = await page.evaluate(() => window.__AR4_DEBUG__.getState());
    assert.equal(afterDay1.pomodoroRun.status, 'completed');
    assert(afterDay1.coins > beforeFocus.coins, 'Completing Pomodoro must award coins');
    assert(
      afterDay1.level > beforeFocus.level || afterDay1.xp > beforeFocus.xp,
      'Completing Pomodoro must award intimacy EXP'
    );
    assert.equal(afterDay1.pomodoro.totalStamps, 1);
    assert.equal(afterDay1.pomodoro.completedSessions, 1);
    assert.equal(afterDay1.pomodoro.totalFocusMinutes, 15);
    assert.equal(afterDay1.pomodoro.streakDays, 1);
    assert.equal(await page.locator('.pomo-stamp-slot.stamped').count(), 1);

    // Complete Day 2 45-minute session -> verify 2 stamps + streakDays === 2 + reload persistence
    await page.click('.pomo-preset-btn[data-mins="45"]');
    await page.click('#btn-pomo-start');
    await page.waitForTimeout(150);
    await page.evaluate((iso) => window.__AR4_DEBUG__.fastForwardPomodoro(2705, iso), streakDates.day2Done);
    await page.waitForTimeout(200);
    const afterDay2 = await page.evaluate(() => window.__AR4_DEBUG__.getState());
    assert.equal(afterDay2.pomodoro.totalStamps, 3);
    assert.equal(afterDay2.pomodoro.completedSessions, 2);
    assert.equal(afterDay2.pomodoro.totalFocusMinutes, 60);
    assert.equal(afterDay2.pomodoro.streakDays, 2);
    assert.equal(await page.locator('.pomo-stamp-slot.stamped').count(), 3);

    // Test Cancel flow
    await page.click('#btn-pomo-start');
    await page.waitForTimeout(120);
    await page.click('#btn-pomo-cancel');
    await page.waitForTimeout(120);
    pomoState = await page.evaluate(() => window.__AR4_DEBUG__.getState());
    assert.equal(pomoState.pomodoroRun.status, 'idle');
    assert.equal(pomoState.isFocusStudying, false);

    // Reload and verify Pomodoro stamps & streak persist in localStorage
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(320);
    const reloadedPomo = await page.evaluate(() => window.__AR4_DEBUG__.getState().pomodoro);
    assert.equal(reloadedPomo.totalStamps, 3);
    assert.equal(reloadedPomo.streakDays, 2);
    assert.equal(reloadedPomo.lastCompletedDate, streakDates.day2Done.slice(0, 10));
    assert.equal(reloadedPomo.totalFocusMinutes, 60);

    // 3. Mobile 390x844 (portrait forced-landscape) & 844x390 clearance & zero-overflow check
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      window.__AR4_DEBUG__.setWindowAmbience({ autoSync: false, period: 'starry', season: 'winter' }, false);
    });
    // Use DOM click in rotated portrait mode (client coordinates are rotated 90deg)
    await page.evaluate(() => document.getElementById('btn-pomodoro').click());
    await page.waitForTimeout(260);

    const mobilePortraitAudit = await page.evaluate(() => ({
      overflowX: document.documentElement.scrollWidth - window.innerWidth,
      overflowY: document.documentElement.scrollHeight - window.innerHeight,
      pomoOpen: !document.getElementById('pomodoro-card').classList.contains('hidden')
    }));
    assert(mobilePortraitAudit.pomoOpen, '#pomodoro-card should open cleanly on 390x844');
    assert(
      mobilePortraitAudit.overflowX <= 0 && mobilePortraitAudit.overflowY <= 0,
      `390x844 viewport overflow detected: ${JSON.stringify(mobilePortraitAudit)}`
    );

    if (MOBILE_SHOT) {
      fs.mkdirSync(path.dirname(MOBILE_SHOT), { recursive: true });
      await page.screenshot({ path: MOBILE_SHOT });
    }

    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(260);
    const mobileLandscapeCheck = await page.evaluate(() => {
      const sw = document.getElementById('mode-switcher').getBoundingClientRect();
      const hr = document.querySelector('.hud-right').getBoundingClientRect();
      const joy = document.getElementById('joystick-zone').getBoundingClientRect();
      const care = document.getElementById('pet-care-bar').getBoundingClientRect();
      const act = document.querySelector('.action-zone').getBoundingClientRect();
      return {
        switcherRight: sw.right,
        hudRightLeft: hr.left,
        joyRight: joy.right,
        careLeft: care.left,
        careRight: care.right,
        actLeft: act.left
      };
    });
    assert(
      mobileLandscapeCheck.switcherRight <= mobileLandscapeCheck.hudRightLeft + 2,
      `Top HUD overlap on 844x390: ${JSON.stringify(mobileLandscapeCheck)}`
    );
    assert(
      mobileLandscapeCheck.joyRight <= mobileLandscapeCheck.careLeft + 2 &&
        mobileLandscapeCheck.careRight <= mobileLandscapeCheck.actLeft + 2,
      `Bottom dock overlap on 844x390: ${JSON.stringify(mobileLandscapeCheck)}`
    );

    assert.equal(consoleErrors.length, 0, `Console errors observed: ${consoleErrors.join('; ')}`);
    assert.equal(pageErrors.length, 0, `Page errors observed: ${pageErrors.join('; ')}`);
    assert.equal(failedResponses.length, 0, `HTTP >= 400 responses observed: ${failedResponses.join('; ')}`);

    console.log(
      '[E2E PASS] AR-4 Four-Season & 4-Period Window Ambience + Creamy Journal Pomodoro Focus Companion passed on 1440x900, 390x844, and 844x390 with 0 errors!'
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
