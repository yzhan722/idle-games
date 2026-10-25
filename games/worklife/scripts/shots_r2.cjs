// round-2 screenshot audit — deep states not covered in round 1 (dev-only script)
const { chromium } = require('playwright');
const { createHmac } = require('crypto');
const { readFileSync, mkdirSync } = require('fs');
const { join } = require('path');

const SECRET = (() => {
  const env = readFileSync(join(__dirname, '..', 'backend', '.env'), 'utf8');
  return env.match(/^JWT_SECRET=(.+)$/m)[1].trim();
})();
const UID = 'cbce7949-efc5-47de-b42b-d5a0776d2d7d';
const b64u = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const hs = b64u({ alg: 'HS256', typ: 'JWT' }) + '.' + b64u({ sub: UID, typ: 'session', exp: Math.floor(Date.now() / 1000) + 7200 });
const token = hs + '.' + createHmac('sha256', SECRET).update(hs).digest('base64url');
const user = { id: UID, token, isGuest: true };

const OUT = join(__dirname, '..', '.shots-r2');
mkdirSync(OUT, { recursive: true });

const BASE = 'http://localhost:3000';
const errors = [];

async function boot(width = 1440, height = 900) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width, height } });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  await page.addInitScript((u) => localStorage.setItem('worklife_user', JSON.stringify(u)), user);
  await page.goto(BASE, { waitUntil: 'networkidle' });
  return { browser, page };
}
const shot = (page, name, full = false) => page.screenshot({ path: join(OUT, name + '.png'), fullPage: full });

(async () => {
  const { browser, page } = await boot();
  await page.waitForTimeout(2500);

  const dismissModal = async () => {
    for (let i = 0; i < 3; i++) {
      const ov = page.locator('.modal-overlay');
      if (!(await ov.isVisible().catch(() => false))) return;
      await page.keyboard.press('Escape');
      await page.waitForTimeout(250);
      if (await ov.isVisible().catch(() => false)) {
        const x = ov.locator('.modal-close, button:has-text("✕"), button:has-text("×")').first();
        if (await x.isVisible().catch(() => false)) await x.click().catch(() => {});
        await page.waitForTimeout(250);
      }
      if (await ov.isVisible().catch(() => false)) await ov.click({ position: { x: 5, y: 5 } }).catch(() => {});
      await page.waitForTimeout(250);
    }
  };
  const nav = async (label) => {
    await dismissModal();
    await page.locator(`[data-nav-id="${label}"]`).first().click();
    await page.waitForTimeout(1200);
  };

  // 1. skill tree — 伐木 page
  await nav("logging");
  const treeBtn = page.locator('button:has-text("技能树"), summary:has-text("技能树")').first();
  if (await treeBtn.isVisible().catch(() => false)) { await treeBtn.click(); await page.waitForTimeout(900); }
  await shot(page, '01-skilltree', true);

  // 2. craft modal — 木工 page
  await nav("woodworking");
  const recipe = page.locator('.skill-action-row, .craft-recipe-row').first();
  if (await recipe.isVisible().catch(() => false)) { await recipe.click(); await page.waitForTimeout(900); }
  await shot(page, '02-craft-modal');
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);

  // 3. gathering modal — 伐木 page
  await nav("logging");
  const card = page.locator('.skill-action-row:not(.locked)').first();
  if (await card.isVisible().catch(() => false)) { await card.click(); await page.waitForTimeout(900); }
  await shot(page, '03-gather-modal');
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);

  // 4. enhancement
  await nav("enhance");
  await shot(page, '04-enhancement', true);

  // 5. battle mid-fight (cast bars running) — ensure sword equipped first (adventure gate)
  await page.evaluate(async (t) => {
    const r = await fetch('/api/equipment/equip', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${t}` },
      body: JSON.stringify({ slot: 'main_hand', itemId: 'weapon_wooden_sword' }),
    });
    return r.status;
  }, token).catch(() => 0);
  await page.waitForTimeout(800);
  await nav("adventure");
  // a lingering resolved battle reopens the combat view — exit it first
  const exitBattle = page.locator('button:has-text("返回")').first();
  if (await exitBattle.isVisible().catch(() => false)) { await exitBattle.click(); await page.waitForTimeout(700); }
  const mapBtn = page.locator('.map-btn').first();
  if (await mapBtn.isVisible().catch(() => false)) { await mapBtn.click(); await page.waitForTimeout(800); }
  await shot(page, '05a-adventure');
  const monster = page.locator('.monster-card').first();
  await monster.click(); await page.waitForTimeout(700);
  const startBtn = page.locator('button:has-text("开始战斗"), button:has-text("进入战斗")').first();
  if (await startBtn.isVisible().catch(() => false)) {
    await startBtn.click();
    await page.waitForTimeout(2500);
    await shot(page, '05-battle-mid');
    for (let i = 0; i < 60; i++) {
      const v = await page.locator('text=胜利').isVisible().catch(() => false);
      const d = await page.locator('text=战败').isVisible().catch(() => false);
      if (v || d) break;
      await page.waitForTimeout(1000);
    }
    await shot(page, '06-battle-end');
    const back = page.locator('button:has-text("返回"), button:has-text("离开")').first();
    if (await back.isVisible().catch(() => false)) await back.click();
    await page.waitForTimeout(500);
  }

  // 6. defeat attempt — pick last unlocked monster (likely too strong)
  const lastMonster = page.locator('.monster-card:not(.locked)').last();
  if (await lastMonster.isVisible().catch(() => false)) {
    await lastMonster.click(); await page.waitForTimeout(700);
    const sb = page.locator('button:has-text("开始战斗")').first();
    if (await sb.isVisible().catch(() => false)) {
      await sb.click();
      for (let i = 0; i < 90; i++) {
        const d = await page.locator('text=战败').isVisible().catch(() => false);
        const v = await page.locator('text=胜利').isVisible().catch(() => false);
        if (d || v) break;
        await page.waitForTimeout(1000);
      }
      await shot(page, '07-battle-defeat-or-win');
      const back = page.locator('button:has-text("返回"), button:has-text("离开")').first();
      if (await back.isVisible().catch(() => false)) await back.click();
      await page.waitForTimeout(400);
    }
  }

  // 7. character + equip modal
  await nav("character");
  await shot(page, '08-character', true);
  const slot = page.locator('[class*="equip"], [class*="slot"]').nth(2);
  if (await slot.isVisible().catch(() => false)) { await slot.click().catch(() => {}); await page.waitForTimeout(800); await shot(page, '08b-equip-modal'); await page.keyboard.press('Escape'); }

  // 8. trading
  await nav("trading");
  await shot(page, '09-trading', true);

  // 9. party
  await nav("party");
  await shot(page, '10-party');
  const createBtn = page.locator('button:has-text("创建"), button:has-text("加入")').first();
  if (await createBtn.isVisible().catch(() => false)) { await createBtn.click(); await page.waitForTimeout(700); await shot(page, '10b-party-modal'); await page.keyboard.press('Escape'); }

  // 10. chat overlay
  const chatFab = page.locator('.chat-fab').first();
  if (await chatFab.isVisible().catch(() => false)) { await chatFab.click(); await page.waitForTimeout(900); await shot(page, '11-chat'); }

  // 11. inventory item
  await nav("inventory");
  const item = page.locator('[class*="item"], .inventory-item').nth(1);
  if (await item.isVisible().catch(() => false)) { await item.click(); await page.waitForTimeout(700); await shot(page, '12-inventory-item'); }

  // 12. tasks
  await nav("tasks");
  await shot(page, '13-tasks', true);

  // 13. narrow desktop 1100px sanity on busiest page (冒险)
  await nav("adventure");
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.waitForTimeout(600);
  await shot(page, '14-adventure-1100');
  await page.setViewportSize({ width: 1440, height: 900 });

  await browser.close();
  console.log('done. errors:', JSON.stringify(errors.slice(0, 12), null, 1), `total=${errors.length}`);
})();
