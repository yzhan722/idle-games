// 长时真实用户 soak — 浏览器常驻自动玩家
// 行为:周期性采集→制造→打怪→逛面板→买卖,记录不变量违规/pageerror/卡死
// 用法: node scripts/soak_user.cjs [分钟]   默认 480 (8h)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const API = 'http://localhost:3001';
const WEB = 'http://localhost:3002';
const DIR = 'D:/project/.worklife-shots/soak';
fs.mkdirSync(DIR, { recursive: true });
const LOG = path.join(DIR, 'soak.log');
const DURATION_MIN = Number(process.argv[2] || 480);

const log = (m) => {
  const line = `[${new Date().toISOString().slice(11, 19)}] ${m}`;
  console.log(line);
  fs.appendFileSync(LOG, line + '\n');
};

let TOKEN = '';
const api = async (m, p, b) => {
  const r = await fetch(API + p, {
    method: m,
    headers: { authorization: 'Bearer ' + TOKEN, ...(b ? { 'content-type': 'application/json' } : {}) },
    body: b ? JSON.stringify(b) : undefined,
  });
  return { s: r.status, j: await r.json().catch(() => null) };
};
const state = async () => (await api('GET', '/player/state')).j;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// 不变量检查
const violations = [];
function checkInvariants(s, tag) {
  const bad = (cond, msg) => { if (cond) { violations.push(`${tag}: ${msg}`); log(`VIOLATION ${tag}: ${msg}`); } };
  if (!s) { violations.push(`${tag}: empty state`); return; }
  for (const [k, v] of Object.entries(s.inventory || {})) {
    bad(typeof v !== 'number' || !isFinite(v) || v < 0, `inventory.${k}=${v}`);
  }
  bad(typeof s.gold === 'number' && s.gold < 0, `gold<0`);
  if (s.combatHp !== undefined) bad(!(s.combatHp > 0), `combatHp=${s.combatHp}`);
  bad(!!s.offlineReport, 'offlineReport复活');
  bad(!!s.settlement, 'settlement字段复活');
}

(async () => {
  const g = await (await fetch(API + '/auth/guest', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).json();
  TOKEN = g.token;
  await api('POST', '/progression/settings', { playerName: '挂机测试员', avatar: '🐯', gender: 'secret', characterCreated: true, tutorialDone: true });
  log(`soak start uid=${g.userId} duration=${DURATION_MIN}min`);

  // 引导装备:6木→3板→1剑→装备,让连战能赢起来
  log('bootstrap: gearing up (chop→lumber→sword→equip)');
  await api('POST', '/actions/start', { actionId: 'act_chop_wood_t1' });
  for (let i = 0; i < 40; i++) { const s = await state(); if ((s.inventory?.wood_1 || 0) >= 6) break; await sleep(1500); }
  await api('POST', '/actions/start', { actionId: 'act_craft_lumber_t1' });
  for (let i = 0; i < 40; i++) { const s = await state(); if ((s.inventory?.lumber_1 || 0) >= 3) break; await sleep(2000); }
  await api('POST', '/actions/start', { actionId: 'act_craft_weapon_wooden_sword' });
  for (let i = 0; i < 40; i++) { const s = await state(); if ((s.inventory?.weapon_wooden_sword || 0) >= 1) break; await sleep(2500); }
  const eq = await api('POST', '/equipment/equip', { slot: 'main_hand', itemId: 'weapon_wooden_sword' });
  log(`bootstrap done equip=${eq.s}`);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', e => { violations.push('pageerror:' + e.message); log('PAGEERROR ' + e.message.slice(0, 140)); });
  page.on('console', m => { if (m.type() === 'error') log('console.err ' + m.text().slice(0, 120)); });
  await page.addInitScript((u) => localStorage.setItem('worklife_user', u), JSON.stringify({ id: g.userId, token: TOKEN }));
  await page.goto(WEB, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);

  const endAt = Date.now() + DURATION_MIN * 60_000;
  let round = 0, samples = 0;
  const monsters = ['slime', 'caterpillar', 'bee', 'monkey', 'crab', 'mushroom'];
  const actions = ['act_chop_wood_t1', 'act_craft_lumber_t1', 'act_mine_ore_t1', 'act_fish_t1'];
  const navIds = ['logging', 'adventure', 'inventory', 'trading', 'tasks', 'house', 'character', 'enhancement', 'party'];

  while (Date.now() < endAt) {
    round++;
    const t = () => Math.round((endAt - Date.now()) / 60000);
    try {
      const s = await state();
      checkInvariants(s, `r${round}`);
      samples++;

      // 行为轮转:每轮干一件人事
      const mode = round % 5;
      if (mode === 0) {
        // 采集一轮:挑个能做的动作挂着
        const aid = actions[round % actions.length];
        const r = await api('POST', '/actions/start', { actionId: aid });
        log(`r${round} gather ${aid} -> ${r.s}`);
      } else if (mode === 1) {
        // 打怪:有结算就 flee 清场,否则挑打得过的怪开战
        if (s.hpCombat?.outcome) {
          const f = await api('POST', '/combat/hp/flee', {});
          log(`r${round} dismiss outcome=${s.hpCombat.outcome} -> ${f.s} deaths=${s.stats?.totalDeaths || 0}`);
        } else if (!s.hpCombat) {
          const mid = s.combatLevel >= 2 ? monsters[round % monsters.length] : 'slime';
          const r = await api('POST', '/combat/hp/start', { monsterId: mid });
          log(`r${round} combat ${mid} -> ${r.s} pHp=${s.hpCombat?.playerHp ?? s.combatHp}`);
        }
      } else if (mode === 2) {
        // 逛 UI 面板:随机点个导航 + 生涯菜单
        const nav = navIds[round % navIds.length];
        await page.locator(`[data-nav-id="${nav}"]`).first().click().catch(() => {});
        await page.waitForTimeout(800);
        log(`r${round} nav ${nav}`);
      } else if (mode === 3) {
        // 经济:卖掉多余木材,或挂/撤一单
        const wood = s.inventory?.wood_1 || 0;
        if (wood > 20) {
          const r = await api('POST', '/systems/shop/sell', { itemId: 'wood_1', qty: 5 });
          log(`r${round} sell wood -> ${r.s} gold=${s.inventory?.gold}`);
        } else if ((s.inventory?.lumber_1 || 0) > 2) {
          const r = await api('POST', '/trading/orders', { itemId: 'lumber_1', type: 'sell', quantity: 1, price: 100 });
          log(`r${round} order lumber -> ${r.s}`);
        }
      } else {
        // 系统面板轮询
        const r1 = await api('GET', '/tasks');
        const r2 = await api('GET', '/progression/achievements');
        const r3 = await api('GET', '/systems/buffs');
        log(`r${round} panels tasks=${r1.s} ach=${r2.s} buffs=${r3.s} lvl=${s.combatLevel} gold=${s.inventory?.gold||0} wood=${s.inventory?.wood_1||0} kills=${s.stats?.totalKills||0} deaths=${s.stats?.totalDeaths||0}`);
      }

      // 每 15 轮截一张图 + 心跳
      if (round % 15 === 0) {
        await page.screenshot({ path: path.join(DIR, `soak_r${round}.png`) }).catch(() => {});
        log(`r${round} heartbeat lvl=${s.combatLevel} inv=${Object.keys(s.inventory || {}).length}items samples=${samples} viol=${violations.length} remain=${t()}min`);
      }
    } catch (e) {
      violations.push(`r${round} exception: ${e.message}`);
      log(`r${round} EXCEPTION ${e.message.slice(0, 140)}`);
    }
    await sleep(20_000); // 每 20s 一动 — 接近真人节奏
  }

  const sFinal = await state();
  checkInvariants(sFinal, 'final');
  log(`soak done rounds=${round} samples=${samples} violations=${violations.length}`);
  log(`final: lvl=${sFinal.combatLevel} gold=${sFinal.inventory?.gold} kills=${sFinal.stats?.totalKills} acts=${sFinal.stats?.totalActions}`);
  violations.slice(0, 30).forEach(v => log('V ' + v));
  await browser.close();
  process.exit(violations.length ? 1 : 0);
})();

