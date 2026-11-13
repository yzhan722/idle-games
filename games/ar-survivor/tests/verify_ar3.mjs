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
const SCREENSHOT_OUT = process.env.AR3_SCREENSHOT_PATH || '';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.json': 'application/json; charset=utf-8'
};

function runStaticChecks() {
  const jsFiles = ['audio.js', 'vision.js', 'sprites.js', 'game.js'];
  for (const file of jsFiles) {
    execFileSync(process.execPath, ['--check', path.join(PUBLIC_DIR, file)], { stdio: 'pipe' });
  }

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

  for (const asset of assetRefs) {
    const full = path.join(PUBLIC_DIR, 'assets', asset);
    assert(fs.existsSync(full), `Missing asset on disk: ${full}`);
    assert(fs.statSync(full).size > 0, `Empty asset on disk: ${full}`);
  }

  console.log(`[STATIC PASS] ${jsFiles.length} JS modules syntax-checked, ${assetRefs.size} asset references verified on disk, 0 inline <svg>.`);
}

function startStaticServer() {
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
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({ server, url: `http://127.0.0.1:${addr.port}/` });
    });
  });
}

async function runPlaywrightSuite() {
  const { server, url } = await startStaticServer();
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
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

    // 1. Initial load + Cream Handbook UI + Theme switch & persistence
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(450);

    const creamThemeCheck = await page.evaluate(() => {
      const card = document.querySelector('.hud-profile-card');
      const bg = getComputedStyle(card).backgroundImage || getComputedStyle(card).backgroundColor;
      return {
        hasThemeBtn: Boolean(document.getElementById('btn-room-theme')),
        bg
      };
    });
    assert(creamThemeCheck.hasThemeBtn, '#btn-room-theme missing');
    assert(/255,\s*253,\s*248|238,\s*249,\s*255/i.test(creamThemeCheck.bg), `Expected cream/pastel HUD style, got: ${creamThemeCheck.bg}`);

    await page.click('#btn-room-theme');
    await page.waitForTimeout(200);
    let saved = await page.evaluate(() => JSON.parse(localStorage.getItem('ar_deepseek_pet_v2') || '{}'));
    assert.equal(saved.roomTheme, 'star_aquarium', 'Clicking #btn-room-theme should switch to star_aquarium');

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(350);
    saved = await page.evaluate(() => JSON.parse(localStorage.getItem('ar_deepseek_pet_v2') || '{}'));
    assert.equal(saved.roomTheme, 'star_aquarium', 'roomTheme star_aquarium should persist across reload');

    // Open dress/furniture drawer and toggle back to cream_study via drawer card, then back to star_aquarium
    await page.click('#btn-shop');
    await page.waitForTimeout(250);
    await page.click('.room-theme-card[data-theme-id="cream_study"]');
    await page.waitForTimeout(200);
    saved = await page.evaluate(() => JSON.parse(localStorage.getItem('ar_deepseek_pet_v2') || '{}'));
    assert.equal(saved.roomTheme, 'cream_study', 'Drawer theme card should switch back to cream_study');
    await page.click('#btn-drawer-close');
    await page.waitForTimeout(200);

    // 2. Furniture horizontal drag, clamping & persistence (lamp starts at xRatio 0.20 => 256px, y = 720 * 0.68 - 2 = 487.6)
    const startX = Math.round(1280 * 0.20);
    const startY = Math.round(720 * 0.68 - 30);
    const targetX = Math.round(1280 * 0.42);

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 40, startY, { steps: 5 });
    await page.mouse.move(targetX, startY, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(250);

    saved = await page.evaluate(() => JSON.parse(localStorage.getItem('ar_deepseek_pet_v2') || '{}'));
    const draggedRatio = saved.placedFurniture?.lamp?.xRatio;
    assert(typeof draggedRatio === 'number' && Math.abs(draggedRatio - 0.42) < 0.04, `Expected lamp xRatio ~0.42 after drag, got ${draggedRatio}`);

    // Clamp test: drag lamp past far-left edge (x = 2) and ensure it clamps >= 56/1280 (~0.04375)
    await page.mouse.move(targetX, startY);
    await page.mouse.down();
    await page.mouse.move(2, startY, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(250);

    saved = await page.evaluate(() => JSON.parse(localStorage.getItem('ar_deepseek_pet_v2') || '{}'));
    const clampedRatio = saved.placedFurniture?.lamp?.xRatio;
    assert(clampedRatio >= 54 / 1280 && clampedRatio <= 0.08, `Expected clamped left xRatio >= 54/1280, got ${clampedRatio}`);

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(350);
    saved = await page.evaluate(() => JSON.parse(localStorage.getItem('ar_deepseek_pet_v2') || '{}'));
    assert(Math.abs(saved.placedFurniture?.lamp?.xRatio - clampedRatio) < 0.005, 'Dragged furniture position must persist after reload');

    // 3. Intimacy Milestones LV.3 / LV.5 / LV.8 + Music-box track cycling
    const milestoneScenarios = [
      { seedLv: 2, seedXp: 55, seedNext: 60, expectLv: 3, itemId: 'shell_clip', title: '星海贝壳发卡', isFurn: false },
      { seedLv: 4, seedXp: 95, seedNext: 100, expectLv: 5, itemId: 'furn_musicbox', title: '星梦八音盒唱片机', isFurn: true },
      { seedLv: 7, seedXp: 145, seedNext: 150, expectLv: 8, itemId: 'star_wreath', title: '深海星梦花环', isFurn: false }
    ];

    for (const sc of milestoneScenarios) {
      await page.evaluate((s) => {
        const cur = JSON.parse(localStorage.getItem('ar_deepseek_pet_v2') || '{}');
        cur.level = s.seedLv;
        cur.xp = s.seedXp;
        cur.xpNext = s.seedNext;
        localStorage.setItem('ar_deepseek_pet_v2', JSON.stringify(cur));
      }, sc);
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(300);

      await page.click('#hud-avatar-btn');
      await page.waitForTimeout(300);

      const toastState = await page.evaluate(() => {
        const el = document.getElementById('milestone-toast');
        return {
          visible: el && !el.classList.contains('hidden'),
          badge: document.getElementById('milestone-toast-badge')?.textContent || '',
          title: document.getElementById('milestone-toast-title')?.textContent || ''
        };
      });
      assert(toastState.visible, `Milestone toast should be visible at LV.${sc.expectLv}`);
      assert(toastState.badge.includes(`LV.${sc.expectLv}`), `Toast badge should mention LV.${sc.expectLv}, got ${toastState.badge}`);
      assert.equal(toastState.title, sc.title, `Toast title mismatch at LV.${sc.expectLv}`);

      saved = await page.evaluate(() => JSON.parse(localStorage.getItem('ar_deepseek_pet_v2') || '{}'));
      assert(saved.level >= sc.expectLv, `Expected player level >= ${sc.expectLv}, got ${saved.level}`);
      assert.equal(saved.ownedDress?.[sc.itemId], true, `Expected ${sc.itemId} to be unlocked`);
      if (sc.isFurn) {
        assert(saved.placedFurniture?.musicbox, 'Expected musicbox to be placed on desktop at LV.5');
      } else {
        assert.equal(saved.equipped?.[sc.itemId], true, `Expected ${sc.itemId} to be auto-equipped`);
      }

      // If LV.5 musicbox is unlocked, test clicking it cycles tracks 0 -> 1 -> 2 -> 0
      if (sc.expectLv === 5) {
        const mbX = Math.round(1280 * saved.placedFurniture.musicbox.xRatio);
        const mbY = Math.round(720 * 0.68 - 30);
        const trackBefore = saved.musicTrack ?? 0;

        await page.mouse.click(mbX, mbY);
        await page.waitForTimeout(200);
        const after1 = await page.evaluate(() => JSON.parse(localStorage.getItem('ar_deepseek_pet_v2') || '{}'));
        assert.equal(after1.musicTrack, (trackBefore + 1) % 3, 'First click on musicbox should advance track');

        await page.mouse.click(mbX, mbY);
        await page.waitForTimeout(200);
        const after2 = await page.evaluate(() => JSON.parse(localStorage.getItem('ar_deepseek_pet_v2') || '{}'));
        assert.equal(after2.musicTrack, (trackBefore + 2) % 3, 'Second click on musicbox should advance track');
      }
    }

    // 4. Switch to Starlight Aquarium theme, open dress/furniture drawer, verify badges & capture screenshot
    await page.click('#btn-milestone-toast-close');
    await page.click('#btn-room-theme');
    await page.waitForTimeout(250);
    await page.click('#btn-shop');
    await page.waitForTimeout(300);

    const unlockedPills = await page.locator('.milestone-pill.unlocked').count();
    assert.equal(unlockedPills, 3, `Expected all 3 milestone pills unlocked at LV.8, got ${unlockedPills}`);

    if (SCREENSHOT_OUT) {
      fs.mkdirSync(path.dirname(SCREENSHOT_OUT), { recursive: true });
      await page.screenshot({ path: SCREENSHOT_OUT });
    }
    await page.click('#btn-drawer-close');
    await page.waitForTimeout(150);

    // 5. Mode switch sanity (parkour -> survivor -> pet) & mobile landscape non-overlap check
    await page.click('.mode-btn[data-mode="parkour"]');
    await page.waitForTimeout(200);
    await page.click('.mode-btn[data-mode="survivor"]');
    await page.waitForTimeout(200);
    await page.click('.mode-btn[data-mode="pet"]');
    await page.waitForTimeout(200);

    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(250);
    const mobileHudCheck = await page.evaluate(() => {
      const sw = document.getElementById('mode-switcher').getBoundingClientRect();
      const hr = document.querySelector('.hud-right').getBoundingClientRect();
      return { switcherRight: sw.right, hudRightLeft: hr.left };
    });
    assert(
      mobileHudCheck.switcherRight <= mobileHudCheck.hudRightLeft + 2,
      `Mode switcher (${mobileHudCheck.switcherRight}) overlaps .hud-right (${mobileHudCheck.hudRightLeft}) on 844x390`
    );

    assert.equal(consoleErrors.length, 0, `Console errors observed: ${consoleErrors.join('; ')}`);
    assert.equal(pageErrors.length, 0, `Page errors observed: ${pageErrors.join('; ')}`);
    assert.equal(failedResponses.length, 0, `HTTP >= 400 responses observed: ${failedResponses.join('; ')}`);

    console.log('[E2E PASS] AR-3 theme switch, furniture drag & clamp persistence, LV.3/5/8 milestones, musicbox cycling, and mobile HUD clearance all passed with 0 errors.');
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
