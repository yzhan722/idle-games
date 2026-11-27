#!/usr/bin/env node
// 存档前向兼容：不认识的字段原样保留写回、不进入游戏状态；老伙伴标记经旧版客户端走一趟不丢；拉云存档时保护标记。
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

vm.runInThisContext(readFileSync(new URL("../data/beasts.js", import.meta.url), "utf8"));
const { defaultState, loadFromRaw, serializeState } = await import("../modules/state.js");
const { encodeVeterans, protectVeterans, NUM_RULES_VERSION } = await import("../modules/own_numbers_compat.js");
const { createMonInstance, evolveMon } = await import("../modules/mons.js");
const { createCloudSave } = await import("../modules/cloud_save.js");
const { emptyEraState } = await import("../modules/systems/era.js");

const clone = (o) => JSON.parse(JSON.stringify(o));
const roundTrip = (raw) => clone(serializeState(loadFromRaw(clone(raw))));
const species = (dex) => ({ id: `p${String(dex).padStart(3, "0")}`, dex, name: "测试", tier: globalThis.BEAST_TIER[`p${String(dex).padStart(3, "0")}`] });
const mon = (id, dex, extra = {}) => ({ ...createMonInstance(species(dex), { idOverride: id }), id, created: 1_700_000_000_000 + id, ...extra });
const roster = globalThis.BEAST_ROSTER.map(Number);
const common = roster.filter((d) => species(d).tier === "common");
const [dexA, dexB, dexC] = common;
const evolvable = common.find((d) => Array.isArray(globalThis.BEAST_EVO?.[species(d).id]) && globalThis.BEAST_EVO[species(d).id].length);
assert.ok(dexC && evolvable, "sample species found");

function makeSave(mons) {
  const s = defaultState();
  s.mons.list = mons;
  s.mons.nextId = Math.max(0, ...mons.map((m) => m.id)) + 1;
  return clone(serializeState(s));
}

// ---- 1. 未知字段 ----
{
  const raw = makeSave([mon(1, dexA), mon(2, dexB)]);
  raw.futureTop = { a: [1, 2] };
  raw.res.moonDew = { value: 7, cap: 9 };
  raw.buildings.skyDock = { owned: 3 };
  raw.tech.moonTech = true;
  raw.unlocks.moonShop = true;
  raw.auto.autoMoon = { on: true };
  raw.auto.autoCraft.moonGem = true;
  raw.permanentBoosts.moon = 2;
  raw.breeding.moonEgg = 5;
  raw.expedition.moonRoute = "x";
  raw.dex.moon = { p001: 1 };
  raw.pve.moonGate = { floor: 3 };
  raw.crafting = { moonGem: { remainingSec: 5, totalSec: 9 } };
  raw.meta.futureMeta = { k: 1 };
  raw.era = { ...emptyEraState(0, 0), futureEra: 1 };
  raw.mons.list[0].moonBlessing = { lv: 2 };
  raw.mons.futurePool = [1];
  raw.mons.list.push({ id: 9, pid: "q001", dex: 9001, future: true });
  raw.mons.nextId = 3;

  const s = loadFromRaw(clone(raw));
  assert.ok(!("futureTop" in s) && !("moonDew" in s.res) && !("skyDock" in s.buildings) && !("moonTech" in s.tech) && !("moonBlessing" in s.mons.list[0]), "unknown fields never reach the live state");
  assert.equal(s.mons.list.length, 2, "unknown species is not shown");
  assert.equal(s.mons.nextId, 10, "but its id is never reused");

  const before = JSON.stringify(s);
  const out = clone(serializeState(s));
  assert.equal(JSON.stringify(s), before, "saving does not change the live state");
  for (const [path, want] of [
    ["futureTop", { a: [1, 2] }], ["res.moonDew", { value: 7, cap: 9 }], ["buildings.skyDock", { owned: 3 }], ["tech.moonTech", true], ["unlocks.moonShop", true],
    ["auto.autoMoon", { on: true }], ["auto.autoCraft.moonGem", true], ["permanentBoosts.moon", 2], ["breeding.moonEgg", 5], ["expedition.moonRoute", "x"], ["dex.moon", { p001: 1 }],
    ["pve.moonGate", { floor: 3 }], ["crafting.moonGem", { remainingSec: 5, totalSec: 9 }], ["meta.futureMeta", { k: 1 }], ["era.futureEra", 1], ["mons.futurePool", [1]],
  ]) {
    assert.deepEqual(path.split(".").reduce((o, k) => o?.[k], out), want, `${path} is written back`);
  }
  assert.deepEqual(out.mons.list[0].moonBlessing, { lv: 2 }, "per-beast field written back");
  assert.deepEqual(out.mons.list[2], { id: 9, pid: "q001", dex: 9001, future: true }, "unknown species written back");
  // 存十次还是一样
  let again = out;
  for (let i = 0; i < 10; i += 1) again = roundTrip(again);
  assert.equal(again.mons.list.length, 3, "no duplicates after many saves");
  assert.deepEqual({ ...again.res }, { ...out.res });
  // 现在的值优先
  s.res.catnip.value = 5;
  s.futureTop = "mine";
  const won = serializeState(s);
  assert.ok(won.res.catnip.value === 5 && won.futureTop === "mine", "live values win");
  // 放生了就不写回它的字段
  s.mons.list.splice(0, 1);
  assert.ok(!serializeState(s).mons.list.some((m) => m.moonBlessing), "released beast's extras go with it");
}
// 超大编号：不能把下一个编号抬到加 1 也不变（之后抓的全是同一个编号）；那只本身照样写回
{
  const raw = makeSave([mon(1, dexA)]);
  raw.mons.list.push({ id: 1e300, pid: "q001", dex: 9001 });
  const s = loadFromRaw(clone(raw));
  assert.ok(s.mons.nextId < 10 && s.mons.nextId + 1 > s.mons.nextId, "next id stays usable");
  assert.equal(clone(serializeState(s)).mons.list[1].id, 1e300, "and the entry is kept");
}
// 嵌套里的 __proto__ 只是数据；很大的未知字段、很多趟存读都不涨
{
  const raw = JSON.parse(JSON.stringify({ ...makeSave([mon(1, dexA)]), futureTop: { deep: { v: 1 } }, futureBig: "x".repeat(200_000) }).replace('{"v":1}', '{"__proto__":{"polluted":1},"v":1}'));
  let out = JSON.parse(JSON.stringify(serializeState(loadFromRaw(raw))));
  assert.ok({}.polluted === undefined && Object.hasOwn(out.futureTop.deep, "__proto__"), "nested key is carried as plain data");
  const size = JSON.stringify(out).length;
  for (let i = 0; i < 20; i += 1) out = JSON.parse(JSON.stringify(serializeState(loadFromRaw(out))));
  assert.ok(Math.abs(JSON.stringify(out).length - size) < 100, "size does not grow with every save");
}
// 转生：会清空的那几类不再写回，其余保留
{
  const raw = makeSave([mon(1, dexA, { moonBlessing: 1 })]);
  raw.res.moonDew = { value: 7, cap: 9 };
  raw.tech.moonTech = true;
  raw.unlocks.moonShop = true;
  raw.futureTop = 1;
  const s = loadFromRaw(raw);
  s.era.prestigeCount = (s.era.prestigeCount || 0) + 1;
  s.mons.list = [mon(1, dexB, { created: 5 })];
  const out = clone(serializeState(s));
  assert.ok(!out.res.moonDew && !out.tech.moonTech && !out.mons.list[0].moonBlessing, "reset fields do not survive a rebirth");
  assert.ok(out.unlocks.moonShop === true && out.futureTop === 1, "kept fields do");
}
// 没有未知字段：写出去的内容与原来一致；恶意键不进
{
  const plain = makeSave([mon(1, dexA)]);
  const once = roundTrip(plain);
  const strip = (o) => { const c = clone(o); delete c.t; delete c.meta.lastSavedAt; return c; };
  assert.deepEqual(strip(roundTrip(once)), strip(once), "stable without unknown fields");
  const evil = JSON.parse(JSON.stringify(plain).replace('"res":{', '"__proto__":{"polluted":1},"constructor":{"x":1},"res":{"__proto__":{"p":1},'));
  const out = serializeState(loadFromRaw(evil));
  assert.ok({}.polluted === undefined && !Object.hasOwn(out, "__proto__") && !Object.hasOwn(out, "constructor") && Object.getPrototypeOf(out.res) === Object.prototype, "no prototype tricks");
  assert.equal(loadFromRaw(JSON.stringify({ ...plain, version: 99, meta: { ...plain.meta, saveVersion: 99 } })), null, "a save from a later format is still refused, not half-read");
}

// ---- 2. 老伙伴标记 ----
/** 0.7.60 之前的客户端：伙伴按白名单读，丢 veteran / statKeep；meta 里不认识的原样写回 */
const oldClient = (raw, edit = () => {}) => {
  const o = clone(raw);
  for (const m of o.mons.list) {
    delete m.veteran;
    delete m.statKeep;
  }
  edit(o);
  o.t += 1000;
  return o;
};
const fresh = [mon(1, dexA, { veteran: true, statKeep: 1.2, tier: "rare" }), mon(2, dexB, { statKeep: 1.1 }), mon(3, dexC), mon(4, evolvable, { veteran: true, statKeep: 1.3, tier: "uncommon" })];
{
  const saved = makeSave(clone(fresh));
  assert.equal(saved.meta.numRules, NUM_RULES_VERSION);
  assert.equal(saved.meta.veterans.split(",").length, 3, "three marks mirrored in meta");
  const back = loadFromRaw(oldClient(saved));
  const pick = (s) => s.mons.list.map((m) => [m.id, m.veteran === true, m.statKeep ?? 0, m.tier]);
  assert.deepEqual(pick(back), [[1, true, 1.2, "rare"], [2, false, 1.1, "common"], [3, false, 0, "common"], [4, true, 1.3, "uncommon"]], "marks survive a trip through an old client");
  // 来回两趟
  assert.deepEqual(pick(loadFromRaw(oldClient(clone(serializeState(back))))), pick(back), "and a second trip");

  // 在旧版里放生了一只、新抓了一只（编号不复用）、又把 4 号进化了
  const to = globalThis.BEAST_EVO[species(evolvable).id][0];
  const toDex = Number(to.slice(1));
  const changed = loadFromRaw(oldClient(saved, (o) => {
    o.mons.list = o.mons.list.filter((m) => m.id !== 1);
    o.mons.list.push(clone(mon(5, dexA)));
    const e = o.mons.list.find((m) => m.id === 4);
    Object.assign(e, { pid: to, dex: toDex, tier: globalThis.BEAST_TIER[to] });
  }));
  const byId = (s, id) => s.mons.list.find((m) => m.id === id);
  assert.ok(!byId(changed, 5).veteran && !byId(changed, 5).statKeep, "new catch is not a veteran");
  // 与在新版里进化的结果一致
  const direct = clone(fresh[3]);
  evolveMon(direct, to, () => species(toDex));
  assert.deepEqual([byId(changed, 4).veteran, byId(changed, 4).statKeep, byId(changed, 4).tier], [direct.veteran, direct.statKeep, direct.tier], "evolving in an old client ends up like evolving here");

  // 旧版里转生过：编号从 1 重来，但捕获时间对不上，不会认错
  const reborn = loadFromRaw(oldClient(saved, (o) => { o.mons.list = [clone(mon(1, dexB, { created: 1_800_000_000_000 }))]; }));
  assert.ok(!reborn.mons.list[0].veteran && !reborn.mons.list[0].statKeep, "a new beast that reuses an id is not mistaken for a veteran");
  assert.ok(!("veterans" in serializeState(reborn).meta), "stale marks are dropped on the next save");
  // 旧版里转生时带过去的那只：编号变成 1，捕获时间和物种没变，标记还在
  const natal = loadFromRaw(oldClient(saved, (o) => { o.mons.list = [{ ...o.mons.list.find((m) => m.id === 4), id: 1 }, clone(mon(2, dexB, { created: 1_800_000_000_000 }))]; }));
  assert.ok(natal.mons.list[0].veteran && natal.mons.list[0].statKeep === 1.3 && !natal.mons.list[1].statKeep, "the carried-over beast keeps its mark under a new id");
  // 数据文件没加载成功：这次补不了，但备份不能被清掉
  {
    const stats = globalThis.BEAST_STATS;
    globalThis.BEAST_STATS = undefined;
    const blind = clone(serializeState(loadFromRaw(oldClient(saved))));
    globalThis.BEAST_STATS = stats;
    assert.equal(blind.meta.veterans, saved.meta.veterans, "mirror survives a session without the data file");
    assert.ok(loadFromRaw(blind).mons.list[0].veteran, "and is used next time");
  }
  // 乱写的备份不会出事
  for (const bad of ["x", "1.2.3", "1.abc.5.9.1000.1", 7, null, "1.zz.1.0.99999.1"]) {
    const o = oldClient(saved);
    o.meta.veterans = bad;
    const s = loadFromRaw(o);
    assert.ok(s.mons.list.every((m) => !m.veteran && !m.statKeep), `bad mirror ignored: ${bad}`);
  }
  assert.equal(encodeVeterans(null), "");
}

// ---- 3. 云存档合并 ----
{
  const local = makeSave(clone(fresh));
  // 远端：旧版客户端存的，而且连 meta 里的备份也没有
  const remote = oldClient(local, (o) => { delete o.meta.veterans; o.res.catnip.value = 99; });
  const r1 = clone(remote);
  assert.equal(protectVeterans(r1, local), true, "marks carried into the remote copy");
  const s = loadFromRaw(r1);
  assert.ok(s.mons.list[0].veteran && s.mons.list[0].statKeep === 1.2 && s.res.catnip.value === 99, "remote wins everywhere else");
  // 远端自己有标记：不动
  assert.equal(protectVeterans(clone(local), local), false, "nothing to do when the remote has marks");
  // 别的存档线、坏数据：不动
  const other = clone(remote);
  other.meta.createdAt += 1;
  assert.equal(protectVeterans(other, local), false, "another save line is never mixed");
  for (const bad of [null, {}, { meta: {} }, { meta: { createdAt: 1 }, mons: {} }]) assert.equal(protectVeterans(bad, local), false);
  assert.equal(protectVeterans(clone(remote), null), false);
  // 远端已放生的不补
  const released = clone(remote);
  released.mons.list = released.mons.list.filter((m) => m.id !== 1);
  protectVeterans(released, local);
  assert.ok(!released.meta.veterans.split(",").some((p) => p.startsWith("1.")), "released beasts are not brought back");

  // 走一遍真正的拉取
  const store = new Map([["auto", JSON.stringify({ ...local, t: 1 })], ["mengling_idle_cloud_token_v1", "t"]]);
  globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
  globalThis.document = { getElementById: () => null };
  globalThis.window = { setInterval: () => 0, clearInterval() {} };
  let applied = null;
  globalThis.fetch = async (url) => new Response(JSON.stringify(url.includes("meta") ? { slots: [{ slot: 0, updatedAt: remote.t }] } : { saveJson: JSON.stringify({ ...remote, totalPlayMs: 1e9 }), updatedAt: remote.t }));
  const cs = createCloudSave({ encodeSaveText: (x) => x, decodeSaveText: (x) => x, autosaveKey: "auto", slotKeys: [], applyAutosaveRaw: (raw) => { applied = loadFromRaw(raw); } });
  await cs.syncAll();
  assert.equal(cs.getSyncStatus().status, "success");
  assert.ok(applied?.mons.list[0].veteran && applied.mons.list[3].statKeep === 1.3, "pulling an old client's cloud save keeps the marks");
  assert.ok(loadFromRaw(store.get("auto")).mons.list[0].veteran, "and the local copy has them too");
}
// 云端是更新格式的存档（这一版读不了）：本机存档不动，之后也不自动上传把它盖掉
{
  const local = { ...makeSave([mon(1, dexA)]), t: 1000, totalPlayMs: 5 };
  const remote = { ...clone(local), version: 99, meta: { ...local.meta, saveVersion: 99 }, t: 2000, totalPlayMs: 9 };
  const store = new Map([["auto", JSON.stringify(local)], ["mengling_idle_cloud_token_v1", "t"]]);
  globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
  let tick = null;
  globalThis.window = { setInterval: (f) => { tick = f; return 1; }, clearInterval() {} };
  const puts = [];
  globalThis.fetch = async (url, opt) => {
    if (opt?.method === "PUT") { puts.push(url); return new Response(JSON.stringify({ applied: true })); }
    return new Response(JSON.stringify(url.includes("meta") ? { slots: [{ slot: 0, updatedAt: remote.t }] } : { saveJson: JSON.stringify(remote), updatedAt: remote.t }));
  };
  const cs = createCloudSave({ encodeSaveText: (x) => x, decodeSaveText: (x) => x, autosaveKey: "auto", slotKeys: [], applyAutosaveRaw: (raw) => Boolean(loadFromRaw(raw)) });
  await cs.syncAll();
  assert.ok(cs.getSyncStatus().status === "partial" && cs.getSyncStatus().error.includes("刷新"), "player is told to refresh");
  assert.equal(JSON.parse(store.get("auto")).version, local.version, "local save untouched");
  store.set("auto", JSON.stringify({ ...local, t: 3000 })); // 本机接着玩，自动存了一次
  cs.startAutoSync();
  await tick();
  await cs.pushAutosaveFlush();
  await cs.syncAll();
  assert.deepEqual(puts, [], "nothing is pushed over the newer cloud save");
  assert.ok(cs.getSyncStatus().error.includes("刷新"));
}

console.log("save-forward-selfcheck: OK");
