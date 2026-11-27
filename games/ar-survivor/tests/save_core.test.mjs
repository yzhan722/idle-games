// save_core.test.mjs — 存档读写与相册裁剪的单测（不开浏览器）：node --test games/ar-survivor/tests/save_core.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { PET_CORE_CHARS, PET_CORE_KEY, PET_SAVE_KEY, fitAlbum, isQuotaError, openPetStore } from '../public/save-core.js';

// 有容量上限的假 localStorage（按字符数算，和浏览器一样满了抛 QuotaExceededError）
class FakeStorage {
  constructor(limit = 1e9) {
    this.limit = limit;
    this.map = new Map();
  }
  getItem(k) {
    return this.map.has(k) ? this.map.get(k) : null;
  }
  setItem(k, v) {
    let total = k.length + v.length;
    for (const [kk, vv] of this.map) if (kk !== k) total += kk.length + vv.length;
    if (total > this.limit) throw Object.assign(new Error('full'), { name: 'QuotaExceededError' });
    this.map.set(k, v);
  }
}

const PET = { level: 12, xp: 30, xpNext: 1200, bond: { v: 1, claimed: { 9: '2026-11-01' } }, coins: 500, ownedDress: { bow: true }, weapons: { blaster: 3 }, diaryBook: { pages: 'a'.repeat(400) } };

test('空间够：整份写、整份读，占位那块不影响读档', () => {
  const st = new FakeStorage();
  const store = openPetStore(() => st);
  assert.deepEqual(store.read(), {});
  assert.equal(st.getItem(PET_CORE_KEY).length, PET_CORE_CHARS);
  assert.deepEqual(store.write(PET), { state: 'full', quota: false });
  const back = openPetStore(() => st).read();
  assert.deepEqual(back, { ...PET, saveSeq: 1 });
});

test('旧存档没有 saveSeq：照常读，字段不丢', () => {
  const st = new FakeStorage();
  st.setItem(PET_SAVE_KEY, JSON.stringify(PET));
  const store = openPetStore(() => st);
  assert.deepEqual(store.read(), PET);
  store.write({ ...PET, coins: 501 });
  assert.equal(openPetStore(() => st).read().coins, 501);
});

test('存不下整份：要紧的写进占位，读档时补上，其余沿用上一份；恢复后以整份为准', () => {
  const st = new FakeStorage();
  const store = openPetStore(() => st);
  store.read();
  store.write(PET);
  st.setItem('album', 'x'.repeat(20000));
  st.limit = [...st.map].reduce((a, [k, v]) => a + k.length + v.length, 0) + 10; // 只剩 10 个字符
  const grown = { ...PET, level: 13, coins: 900, diaryBook: { pages: 'a'.repeat(5000) } };
  assert.deepEqual(store.write(grown), { state: 'core', quota: true });
  assert.equal(st.getItem(PET_CORE_KEY).length, PET_CORE_CHARS); // 原地覆盖，长度不变
  // 第二次、第三次照样写得进
  assert.equal(store.write({ ...grown, coins: 950 }).state, 'core');
  let back = openPetStore(() => st).read();
  assert.deepEqual([back.level, back.coins, back.diaryBook.pages.length], [13, 950, 400]);
  // 删了照片，空间回来
  st.limit = 1e9;
  assert.equal(store.write({ ...grown, coins: 700 }).state, 'full');
  back = openPetStore(() => st).read();
  assert.deepEqual([back.coins, back.diaryBook.pages.length], [700, 5000]);
  assert.equal(JSON.parse(st.getItem(PET_CORE_KEY)).saveSeq, undefined);
});

test('重新打开之后还是满的：序号接着涨，仍然读到最新的要紧存档', () => {
  const st = new FakeStorage();
  const a = openPetStore(() => st);
  a.read();
  a.write(PET);
  st.limit = [...st.map].reduce((n, [k, v]) => n + k.length + v.length, 0);
  a.write({ ...PET, coins: 10000000 });
  const b = openPetStore(() => st);
  assert.equal(b.read().coins, 10000000);
  b.write({ ...PET, coins: 20000000 });
  assert.equal(openPetStore(() => st).read().coins, 20000000);
});

test('本地存储被禁：不抛错，返回 none 且不是「满了」', () => {
  const store = openPetStore(() => {
    throw Object.assign(new Error('denied'), { name: 'SecurityError' });
  });
  assert.deepEqual(store.read(), {});
  assert.deepEqual(store.write(PET), { state: 'none', quota: false });
});

test('存档损坏：不是对象的一律当空档，不让游戏起不来', () => {
  for (const bad of ['null', '[]', '7', '"x"', '{', '']) {
    const st = new FakeStorage();
    st.setItem(PET_SAVE_KEY, bad);
    assert.deepEqual(openPetStore(() => st).read(), {}, bad);
  }
});

test('配额报错的几种写法都认得', () => {
  for (const e of [{ name: 'QuotaExceededError' }, { name: 'NS_ERROR_DOM_QUOTA_REACHED' }, { code: 22 }, { code: 1014 }]) assert.equal(isQuotaError(e), true);
  for (const e of [null, { name: 'SecurityError' }, new TypeError('x')]) assert.equal(isQuotaError(e), false);
});

const photo = (id, pinned = false) => ({ id, pinned });

test('相册：超过上限先让最早的没钉住的；全钉住时让的是新拍的这张', () => {
  const list = [photo('new'), photo('a', true), photo('b'), photo('c', true)];
  assert.deepEqual(fitAlbum(list, 3, () => true), { list: [photo('new'), photo('a', true), photo('c', true)], saved: true });
  const pinned = [photo('new'), photo('a', true), photo('b', true)];
  const r = fitAlbum(pinned, 2, () => true);
  assert.deepEqual(r.list.map((p) => p.id), ['a', 'b']);
});

test('相册存不下：最多让 3 张没钉住的，钉住的一张不动；还是不行就不删', () => {
  const list = [photo('n'), photo('p1', true), photo('b'), photo('c'), photo('d')];
  const r = fitAlbum(list, 24, (l) => l.length <= 3);
  assert.deepEqual([r.saved, r.list.map((p) => p.id).join()], [true, 'n,p1,b']);
  let tries = 0;
  const no = fitAlbum(list, 24, () => {
    tries += 1;
    return false;
  });
  assert.deepEqual([no.saved, no.list.length, tries], [false, 5, 4]);
  const allPinned = [photo('a', true), photo('b', true)];
  assert.deepEqual(fitAlbum(allPinned, 24, () => false), { list: allPinned, saved: false });
});
