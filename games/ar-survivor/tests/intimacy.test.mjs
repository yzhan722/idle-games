// intimacy.test.mjs — AR-G2 亲密长期线单测（不开浏览器）：node --test games/ar-survivor/tests/intimacy.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BOND_BANK_DAYS,
  BOND_DAY_XP,
  BOND_DUP_GIFT_COINS,
  BOND_FINAL_LEVEL,
  BOND_MILESTONES,
  BOND_PACE_LEVEL,
  BOND_TAIL_DAY_XP,
  applyBondXp,
  applyCallName,
  bondFloatLabel,
  bondXpNeed,
  countBondXp,
  describeGrant,
  grantMilestones,
  loadBond,
  nextXpNeed,
  pendingMilestones,
  refillPace,
  sanitizeCall,
  unlockedCalls,
  unlockedLines
} from '../public/intimacy.js';
import { readGameSource } from './_split_lib.mjs';

const PUB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const dayKey = (n) => {
  const d = new Date(Date.UTC(2026, 10, 26) + n * 86400000);
  return d.toISOString().slice(0, 10);
};

test('LV.8 以前的需求与原来一致（×1.3 连乘取整），LV.1→LV.8 共约 700', () => {
  let need = 40;
  const seq = [need];
  for (let lv = 2; lv <= 7; lv++) {
    need = nextXpNeed(lv, need);
    seq.push(need);
  }
  assert.deepEqual(seq, [40, 52, 68, 88, 114, 148, 192]);
  assert.equal(seq.reduce((a, b) => a + b, 0), 702);
  // 原来存档里的 xpNext 可能走过打工的 ×1.35，LV.8 以前一律按存档里的来
  const r = applyBondXp({ level: 7, xp: 145, xpNext: 150 }, 10);
  assert.equal(r.level, 8);
  assert.equal(r.xp, 5);
  assert.equal(r.xpNext, bondXpNeed(8));
});

test('LV.8→LV.20 一共 90 个满额陪伴日，本级天数 2、3 … 13', () => {
  const days = [];
  for (let lv = BOND_PACE_LEVEL; lv < BOND_FINAL_LEVEL; lv++) days.push(bondXpNeed(lv) / BOND_DAY_XP);
  assert.deepEqual(days, [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  assert.equal(days.reduce((a, b) => a + b, 0), 90);
});

test('里程碑 LV.9~20 每级一条，都有手账一页；只用已有图片和已有装扮', () => {
  assert.deepEqual(BOND_MILESTONES.map((m) => m.level), [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
  const game = readGameSource(PUB);
  const catalog = game.slice(game.indexOf('const DRESS_CATALOG = ['), game.indexOf('const UPGRADE_CATALOG = ['));
  for (const m of BOND_MILESTONES) {
    assert.ok(m.title && m.page, `LV.${m.level} 要有标题和一页手账`);
    assert.ok(m.page.length <= 18, `LV.${m.level} 的手账一句话要短：${m.page}`);
    const file = m.img.replace(/^\.\//, '').replace(/\?.*$/, '');
    assert.ok(fs.existsSync(path.join(PUB, file)), `${m.img} 存在`);
    if (m.itemId) assert.ok(catalog.includes(`id: '${m.itemId}'`), `${m.itemId} 是已有装扮`);
    if (m.line) assert.ok(m.line.length <= 18, '新台词不超过朗读上限 18 字');
  }
  assert.equal(BOND_MILESTONES.at(-1).kind, 'anniversary');
  const bad = /快来|别忘|不来|记得来|想你|孤单|等你很久|充值|购买|限时/;
  for (const m of BOND_MILESTONES) assert.ok(!bad.test(`${m.page}${m.line || ''}${m.title}`), `LV.${m.level} 不催促、不用情感话术`);
});

test('每日份额：满额 200 全额计入，之后 10% 最多再 40', () => {
  let pace = refillPace(null, dayKey(0));
  let total = 0;
  for (let i = 0; i < 400; i++) {
    const r = countBondXp({ level: 9, amount: 20, pace, dayKey: dayKey(0) });
    pace = r.pace;
    total += r.counted;
  }
  assert.equal(total, BOND_DAY_XP + BOND_TAIL_DAY_XP);
  assert.equal(pace.left, 0);
  assert.equal(pace.tail, 0);
});

test('打工掉落只走慢速份额，不占陪伴的 200；刷一整天也只有 40', () => {
  let pace = refillPace(null, dayKey(0));
  let work = 0;
  for (let i = 0; i < 1000; i++) {
    const r = countBondXp({ level: 12, amount: 14, pace, dayKey: dayKey(0), source: 'work' });
    pace = r.pace;
    work += r.counted;
  }
  assert.equal(work, BOND_TAIL_DAY_XP);
  assert.equal(pace.left, BOND_DAY_XP);
  assert.equal(countBondXp({ level: 12, amount: 35, pace, dayKey: dayKey(0) }).counted, 35);
});

test('LV.8 以前不限；LV.20 之后不再计入，等级和经验条都不动', () => {
  assert.equal(countBondXp({ level: 7, amount: 500, pace: null, dayKey: dayKey(0) }).counted, 500);
  assert.equal(countBondXp({ level: 20, amount: 500, pace: refillPace(null, dayKey(0)), dayKey: dayKey(0) }).counted, 0);
  const done = applyBondXp({ level: 20, xp: 10, xpNext: 1 }, 99999);
  assert.deepEqual([done.level, done.gained, done.xp === done.xpNext], [20, 0, true]);
  // 老存档可能已经超过 20：不降级
  const old = applyBondXp({ level: 27, xp: 10, xpNext: 1 }, 5);
  assert.deepEqual([old.level, old.gained], [27, 0]);
});

test('隔几天没来份额会攒着（最多 7 天），往回拨时钟不补也不扣', () => {
  const p0 = { day: dayKey(0), left: 0, tail: 0, carry: 0.4 };
  assert.equal(refillPace(p0, dayKey(1)).left, BOND_DAY_XP);
  assert.equal(refillPace(p0, dayKey(3)).left, BOND_DAY_XP * 3);
  assert.equal(refillPace(p0, dayKey(60)).left, BOND_DAY_XP * BOND_BANK_DAYS);
  assert.deepEqual(refillPace(p0, dayKey(-1)), p0); // 换时区：日期退一天，原样
  assert.deepEqual(refillPace(p0, dayKey(-5)), { ...p0, day: dayKey(-5) }); // 退得多：不补不扣，从现在的日子重新数
  assert.equal(refillPace(p0, dayKey(1)).tail, BOND_TAIL_DAY_XP);
  assert.equal(refillPace({ day: 'x', left: 1 }, dayKey(0)).left, BOND_DAY_XP);
});

test('时钟曾经错到几十年后：调回来第二天就照常补，不用等到那一年', () => {
  let pace = { day: '2099-01-01', left: 0, tail: 0, carry: 0 };
  pace = refillPace(pace, dayKey(0));
  assert.deepEqual([pace.left, pace.tail, pace.day], [0, 0, dayKey(0)]);
  pace = refillPace(pace, dayKey(1));
  assert.deepEqual([pace.left, pace.tail], [BOND_DAY_XP, BOND_TAIL_DAY_XP]);
  assert.equal(loadBond({ level: 9, bond: { v: 1, pace: { day: '2099-01-01', left: 30, tail: 5 } } }, dayKey(0)).bond.pace.day, dayKey(0));
});

test('脏数据：负数、NaN、字符串、数组、超高等级都读得出来，不会变成 NaN', () => {
  for (const level of [-3, 0, 'x', null, 1e9, 8.7, '12']) {
    for (const bond of [undefined, null, [], 'x', 7, { v: 1 }, { v: 1, pace: { day: 5, left: -9, tail: 'a', carry: NaN }, claimed: [], seen: -4 }]) {
      const r = loadBond({ level, xp: -50, xpNext: 'abc', bond }, dayKey(0));
      for (const n of [r.level, r.xp, r.xpNext, r.bond.pace.left, r.bond.pace.tail, r.bond.pace.carry, r.bond.seen]) assert.ok(Number.isFinite(n) && n >= 0, JSON.stringify({ level, bond, n }));
      assert.ok(r.level >= 1 && r.xpNext > 0 && r.xp <= r.xpNext);
      const c = countBondXp({ level: r.level, amount: NaN, pace: r.bond.pace, dayKey: dayKey(0) });
      assert.equal(c.counted, 0);
      assert.equal(countBondXp({ level: r.level, amount: -20, pace: r.bond.pace, dayKey: dayKey(0) }).counted, 0);
    }
  }
  assert.equal(loadBond({ level: 1e9 }, dayKey(0)).level, 1e9);
});

test('补发只一次：发过之后存读多少轮都不再发；改短时钟也不会重发', () => {
  let save = { level: 14, xp: 5, xpNext: 300, ownedDress: {} };
  let total = 0;
  for (let round = 0; round < 4; round++) {
    const r = loadBond(save, dayKey(round % 2 ? -400 : 0));
    const g = grantMilestones(r.level, r.bond, save.ownedDress, dayKey(0));
    total += g.list.length;
    const owned = { ...save.ownedDress };
    for (const id of g.items) owned[id] = true;
    save = JSON.parse(JSON.stringify({ level: r.level, xp: r.xp, xpNext: r.xpNext, ownedDress: owned, bond: { ...r.bond, claimed: g.claimed } }));
  }
  assert.equal(total, 6); // LV.9~14
});

function simulate(dailyRaw, { everyNDays = 1, workKills = 0 } = {}) {
  let state = { level: 8, xp: 0, xpNext: bondXpNeed(8) };
  let pace = refillPace(null, dayKey(0));
  for (let d = 0; d < 2000; d++) {
    if (d % everyNDays) continue;
    const gains = [];
    for (let left = dailyRaw; left > 0; left -= 12) gains.push(['care', Math.min(12, left)]);
    for (let k = 0; k < workKills; k++) gains.push(['work', 14]);
    for (const [source, amount] of gains) {
      const r = countBondXp({ level: state.level, amount, pace, dayKey: dayKey(d), source });
      pace = r.pace;
      state = applyBondXp(state, r.counted);
      if (state.level >= BOND_FINAL_LEVEL) return d + 1;
    }
  }
  return Infinity;
}

test('到 LV.20 的天数：轻陪伴约 4 个月，普通约 3 个月，怎么刷都不低于 75 天', () => {
  const light = simulate(140);
  const normal = simulate(200);
  const heavy = simulate(6000, { workKills: 800 });
  const weekend = simulate(1800, { everyNDays: 7 });
  assert.ok(light >= 120 && light <= 135, `轻陪伴 ${light} 天`);
  assert.ok(normal >= 88 && normal <= 92, `普通 ${normal} 天`);
  assert.ok(heavy >= 75 && heavy <= 78, `重度 ${heavy} 天`);
  assert.ok(weekend <= 100, `一周只来一天（那天待久一点）也不落后太多：${weekend} 天`);
});

test('老存档：LV.8 以上按百分比换算，等级不掉、经验不倒扣；LV.8 以下原样', () => {
  const low = loadBond({ level: 5, xp: 60, xpNext: 121 }, dayKey(0));
  assert.deepEqual([low.level, low.xp, low.xpNext], [5, 60, 121]);
  const mid = loadBond({ level: 12, xp: 500, xpNext: 1000 }, dayKey(0));
  assert.deepEqual([mid.level, mid.xp, mid.xpNext, mid.legacy], [12, bondXpNeed(12) / 2, bondXpNeed(12), true]);
  const full = loadBond({ level: 10, xp: 9999, xpNext: 424 }, dayKey(0));
  assert.ok(full.xp < full.xpNext);
  const high = loadBond({ level: 27, xp: 3, xpNext: 99999 }, dayKey(0));
  assert.deepEqual([high.level, high.xp === high.xpNext], [27, true]);
  const fresh = loadBond({}, dayKey(0));
  assert.deepEqual([fresh.level, fresh.xp, fresh.xpNext], [1, 0, 40]);
  assert.equal(fresh.bond.pace.left, BOND_DAY_XP);
});

test('存取一轮：claimed / pace / call / seen 都在，脏数据有兜底', () => {
  const first = loadBond({ level: 13, xp: 10, xpNext: 100 }, dayKey(0));
  const g = grantMilestones(first.level, first.bond, {}, dayKey(0));
  const saved = JSON.parse(
    JSON.stringify({ level: first.level, xp: first.xp, xpNext: first.xpNext, bond: { ...first.bond, claimed: g.claimed, call: '老朋友', seen: 13 } })
  );
  const again = loadBond(saved, dayKey(0));
  assert.equal(again.legacy, false);
  assert.equal(again.xp, first.xp);
  assert.deepEqual(again.bond.claimed, g.claimed);
  assert.equal(again.bond.call, '老朋友');
  assert.equal(again.bond.seen, 13);
  assert.equal(pendingMilestones(again.level, again.bond.claimed).length, 0);
  const dirty = loadBond({ level: 10, xp: 'x', xpNext: -3, bond: { v: 1, claimed: { 9: 'bad', 20: dayKey(0) }, call: '家人', pace: 5, seen: 'q' } }, dayKey(0));
  assert.deepEqual([dirty.xp, dirty.xpNext, dirty.bond.call, dirty.bond.seen], [0, bondXpNeed(10), '主人', 0]);
  assert.deepEqual(Object.keys(dirty.bond.claimed), ['9'], '没到的级不算领过；日期坏了也不重发');
  assert.equal(Object.keys(loadBond(JSON.parse(JSON.stringify({ level: 10, bond: dirty.bond })), dayKey(0)).bond.claimed).length, 1);
});

test('老玩家一次性补发：合并成一条提示，礼物不重复（已有的换金币）', () => {
  const st = loadBond({ level: 27, xp: 0, xpNext: 9 }, dayKey(0));
  const owned = { furn_lamp: true, bow: true, crown: true };
  const g = grantMilestones(st.level, st.bond, owned, dayKey(0));
  assert.equal(g.list.length, 12);
  assert.deepEqual(g.items, ['cushion', 'toy_yarn', 'aura']);
  assert.equal(g.coins, BOND_DUP_GIFT_COINS * 2);
  const tip = describeGrant(g.list, g);
  assert.equal(tip.title, '手账补上 12 页');
  assert.equal(tip.badge, '亲密 LV.9~20');
  assert.ok(tip.desc.length <= 24);
  const second = grantMilestones(st.level, { ...st.bond, claimed: g.claimed }, owned, dayKey(1));
  assert.deepEqual([second.list.length, second.items.length, second.coins], [0, 0, 0]);
  assert.equal(describeGrant([], {}), null);
});

test('逐级升上来：每级一条提示，不会漏也不会重', () => {
  let claimed = {};
  const owned = {};
  const seen = [];
  for (let lv = 8; lv <= 20; lv++) {
    const g = grantMilestones(lv, { claimed }, owned, dayKey(lv));
    claimed = g.claimed;
    for (const id of g.items) owned[id] = true;
    if (g.list.length) {
      assert.equal(g.list.length, 1);
      const tip = describeGrant(g.list, g);
      assert.equal(tip.badge, `亲密 LV.${lv}`);
      assert.ok(tip.title.length <= 10 && tip.desc.length <= 28, `${tip.title} / ${tip.desc}`);
      seen.push(lv);
    }
  }
  assert.deepEqual(seen, [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
  assert.equal(claimed[20], dayKey(20));
});

test('称呼与台词按等级解锁，没解锁的称呼退回默认', () => {
  assert.deepEqual(unlockedCalls(8), ['主人']);
  assert.deepEqual(unlockedCalls(20), ['主人', '搭档', '老朋友', '家人']);
  assert.equal(sanitizeCall('家人', 16), '主人');
  assert.equal(sanitizeCall('家人', 17), '家人');
  assert.equal(unlockedLines(9).length, 0);
  assert.equal(unlockedLines(20).length, 5);
  assert.equal(applyCallName('坐在主人手心里，主人真好', '搭档'), '坐在搭档手心里，搭档真好');
  assert.equal(applyCallName('坐在主人手心里', '主人'), '坐在主人手心里');
});

test('飘字：数字跟着真正计入的走，没计入时不显示 +0', () => {
  assert.equal(bondFloatLabel('委托 +35 亲密', 48, 48), '委托 +35 亲密');
  assert.equal(bondFloatLabel('委托 +35 亲密', 48, 4), '委托 +4 亲密');
  assert.equal(bondFloatLabel('+8 亲密 摸头', 8, 0), '摸头');
  assert.equal(bondFloatLabel('顺毛 x3 +6', 6, 0), '顺毛 x3');
  assert.equal(bondFloatLabel('一起装饰日记', 6, 0), '一起装饰日记');
  assert.equal(bondFloatLabel('', 8, 3), '+3 亲密');
  assert.equal(bondFloatLabel('+10 亲密', 10, 0), '开心');
});
