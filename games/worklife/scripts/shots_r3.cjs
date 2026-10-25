// round-3: deep dynamic states — combat fx, offline report, enhancement run, party activity, trading order
const { chromium } = require('playwright');
const { createHmac } = require('crypto');
const { readFileSync, mkdirSync } = require('fs');
const { join } = require('path');

const SECRET = readFileSync(join(__dirname, '..', 'backend', '.env'), 'utf8').match(/^JWT_SECRET=(.+)$/m)[1].trim();
const UID = 'cbce7949-efc5-47de-b42b-d5a0776d2d7d';
const b64u = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const hs = b64u({ alg: 'HS256', typ: 'JWT' }) + '.' + b64u({ sub: UID, typ: 'session', exp: Math.floor(Date.now() / 1000) + 7200 });
const TOKEN = hs + '.' + createHmac('sha256', SECRET).update(hs).digest('base64url');
const USER = { id: UID, token: TOKEN, isGuest: true };

const OUT = join(__dirname, '..', '.shots-r3');
mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:3002';
const errors = [];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  await page.addInitScript((u) => localStorage.setItem('worklife_user', JSON.stringify(u)), USER);
  const shot = (n, full = false) => page.screenshot({ path: join(OUT, n + '.png'), fullPage: full });
  const api = (p, m = 'GET', b) => page.evaluate(async ([p, m, b, t]) => {
    const r = await fetch('/api' + p, { method: m, headers: { 'content-type': 'application/json', authorization: 'Bearer ' + t }, body: b ? JSON.stringify(b) : undefined });
    return { s: r.status, j: await r.json().catch(() => ({})) };
  }, [p, m, b, TOKEN]);
  const nav = async (id) => { await page.locator(`[data-nav-id="${id}"]`).first().click(); await page.waitForTimeout(1200); };
  const dismissModal = async () => {
    for (let i = 0; i < 3; i++) {
      const ov = page.locator('.modal-overlay');
      if (!(await ov.isVisible().catch(() => false))) return;
      const x = ov.locator('.modal-close-btn, button:has-text("×")').first();
      if (await x.isVisible().catch(() => false)) await x.click().catch(() => {});
      else await ov.click({ position: { x: 5, y: 5 } }).catch(() => {});
      await page.waitForTimeout(300);
    }
  };

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  // ---- 1. battle with skill FX — start slime fight, screenshot right after ability fires
  await api('/equipment/equip', 'POST', { slot: 'main_hand', itemId: 'weapon_wooden_sword' }).catch(() => {});
  await page.waitForTimeout(600);
  // disable autoRepeat so victory screen persists
  await api('/combat/hp/loadout', 'POST', { autoRepeat: false }).catch(() => {});
  await nav('adventure');
  const exitB = page.locator('button:has-text("返回")').first();
  if (await exitB.isVisible().catch(() => false)) { await exitB.click(); await page.waitForTimeout(600); }
  const mapBtn = page.locator('.map-btn').first();
  if (await mapBtn.isVisible().catch(() => false)) { await mapBtn.click(); await page.waitForTimeout(700); }
  await page.locator('.monster-card').first().click(); await page.waitForTimeout(600);
  const sb = page.locator('button:has-text("开始战斗")').first();
  if (await sb.isVisible().catch(() => false)) {
    await sb.click();
    await page.waitForTimeout(3200); // ability ~ every 5s, first cast lands ~3s
    await shot('01-battle-skillfx');
    await page.waitForTimeout(1500);
    await shot('01b-battle-mid');
    // wait for victory screen
    for (let i = 0; i < 40; i++) {
      if (await page.locator('text=战斗胜利').isVisible().catch(() => false)) break;
      await page.waitForTimeout(1000);
    }
    await shot('01c-battle-victory');
    const back = page.locator('button:has-text("返回")').first();
    if (await back.isVisible().catch(() => false)) { await back.click(); await page.waitForTimeout(600); }
  }

  // ---- 2. enhancement running state — start an enhance run on the wooden sword
  await nav('enhance');
  await shot('02-enhance-page');
  // try starting via API (needs target + materials). Find first enhance action-ish endpoint:
  const info = await api('/enhancement/info/weapon_wooden_sword').catch(() => null);
  console.log('enhance info:', JSON.stringify(info?.j).slice(0, 200));
  const r = await api('/enhancement/run/start', 'POST', { itemId: 'weapon_wooden_sword', targetLevel: 1 }).catch(() => null);
  console.log('enhance run start:', r && r.s, JSON.stringify(r?.j).slice(0, 160));
  if (r && r.s === 200) {
    await page.waitForTimeout(800); await nav('enhance');
    await shot('03-enhance-running');
    await api('/enhancement/run/stop', 'POST', {}).catch(() => {});
  }

  // ---- 3. party activity — open activity selects, screenshot states
  await nav('party');
  await shot('04-party');
  const actSel = page.locator('select').first();
  if (await actSel.isVisible().catch(() => false)) {
    await actSel.click(); await page.waitForTimeout(400);
    await shot('04b-party-activity-options');
    await page.keyboard.press('Escape');
  }

  // ---- 4. trading order flow — market cell -> sell order modal
  await nav('trading');
  await page.waitForTimeout(600);
  const cell = page.locator('.market-grid-page .inv-tile[data-item-id]').first();
  if (await cell.isVisible().catch(() => false)) {
    await cell.click(); await page.waitForTimeout(800);
    await shot('05a-trade-detail');
    const sellBtn = page.locator('.btn-create-order.sell, button:has-text("挂出售单")').first();
    if (await sellBtn.isVisible().catch(() => false)) {
      await sellBtn.click(); await page.waitForTimeout(700);
      await shot('05b-trade-sell-modal');
      await dismissModal();
    }
    const buyBtn = page.locator('.btn-create-order.buy, button:has-text("挂收购单")').first();
    if (await buyBtn.isVisible().catch(() => false)) {
      await buyBtn.click(); await page.waitForTimeout(700);
      await shot('05c-trade-buy-modal');
      await dismissModal();
    }
  }

  // ---- 5. tasks page detail + houses upgrade attempt (insufficient gold state)
  await nav('tasks'); await shot('06-tasks');

  // ---- 6. mobile party page — bottom bar: open 更多 sheet then tap 组队
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(800);
  const moreBtn = page.locator('.mobile-nav-bar button, [class*="mobile"] button').filter({ hasText: '更多' }).first();
  if (await moreBtn.isVisible().catch(() => false)) { await moreBtn.click(); await page.waitForTimeout(600); }
  const partyItem = page.locator('.mobile-nav-sheet [data-nav-id="party"], .mobile-nav-sheet button:has-text("组队")').first();
  if (await partyItem.isVisible().catch(() => false)) { await partyItem.click(); await page.waitForTimeout(1200); }
  await shot('07-party-mobile');

  await browser.close();
  console.log('done. errors:', JSON.stringify(errors.slice(0, 10)), 'total=' + errors.length);
})();
