#!/usr/bin/env node
// Service Worker：预缓存清单与实际文件一一对应且不过期、首访后断网能打开、换版本只删旧缓存、版本号全仓一致、改过名的素材旧地址不 404。
// 在 vm 里跑 sw.js（假 caches / 假网络），不开浏览器。
import { readFileSync, existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";
import { buildLists, render, staleFiles } from "./build-precache.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => readFileSync(join(root, f), "utf8");
let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error("FAIL:", msg);
  }
}

const sw = read("sw.js");
const listOf = (name) => {
  const m = new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`).exec(sw);
  return m ? [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]) : [];
};
const core = listOf("CORE_URLS");
const extra = listOf("EXTRA_URLS");
const precache = [...core, ...extra];
const fileOf = (url) => (url === "./" ? "index.html" : url.replace(/^\.\//, "").split("?")[0]);

// 清单 ↔ 文件
assert(core.length >= 100 && extra.length >= 15, `precache lists parsed (${core.length} / ${extra.length})`);
assert(new Set(precache).size === precache.length, "no duplicate in the precache lists");
for (const url of precache) assert(existsSync(join(root, fileOf(url))) && statSync(join(root, fileOf(url))).size > 0, `precached ${url} exists (core is all-or-nothing)`);
assert(!precache.includes("./index.html"), "index.html is precached as ./ (Pages redirects /index.html)");
const out = await render();
assert(staleFiles(out).length === 0, `${staleFiles(out).join(", ")} up to date (node scripts/build-precache.mjs)`);
const lists = await buildLists();
for (const f of ["./modules/tabs/functions_tab.js", "./modules/tabs/pve_tab.js"]) assert(lists.extra.includes(f) && !lists.core.includes(f), `${f} is loaded on demand`);
const bytes = (xs) => xs.reduce((s, u) => s + statSync(join(root, fileOf(u))).size, 0);
assert(bytes(precache) < 4.2 * 1024 * 1024, `precache stays small (${(bytes(precache) / 1048576).toFixed(2)} MB)`);
assert(!precache.some((u) => /assets\/beasts/.test(u)), "portraits are not precached");
assert(precache.includes("./assets/ui_icons/tab_mons.webp"), "portrait fallback art is precached");

// 版本号：sw / index / main / config / app / health 同一个
const version = /const CACHE_VERSION = 'mengling-v([\d.]+)'/.exec(sw)?.[1];
assert(Boolean(version), "sw has a cache version");
const html = read("index.html");
for (const f of ["index.html", "styles.css"]) {
  const found = [...read(f).matchAll(/\?v=([\d.]+)/g)].map((m) => m[1]);
  assert(found.length >= 8 && found.every((v) => v === version), `every ?v= in ${f} is ${version} (${[...new Set(found)].join(", ")})`);
}
// 图标地址写法统一：HTML / CSS 里不带版本号的会和 JS 画的同一枚各下一份
assert(!/ui_icons\/\w+\.webp["')]/.test(html) && !/ui_icons\/\w+\.webp["')]/.test(read("styles.css")), "ui_icons always carry ?v= in index.html / styles.css");
for (const [f, re] of [
  ["main.js", /CURRENT_VERSION = "([\d.]+)"/], ["modules/config.js", /VERSION: "([\d.]+)"/], ["app.js", /gameVersion: "([\d.]+)"/],
  ["functions/api/health.js", /version: "([\d.]+)"/], ["modules/render/rpg_svg_icons.js", /\.webp\?v=([\d.]+)/], ["modules/app/game_state.js", /GAME_STATE_SYNC_VERSION = "([\d.]+)"/],
]) {
  assert(re.exec(read(f))?.[1] === version, `${f} is on ${version}`);
}
// index.html 直接引用的本地文件都在
for (const m of html.matchAll(/(?:src|href)="\.\/([^"#?]+)(?:\?[^"]*)?"/g)) assert(existsSync(join(root, m[1])), `index.html references ${m[1]}`);
// 换版本：页面不删缓存、不自动刷新（新版没装好又断网时，旧版要还能打开；也不会多标签页轮流刷新）
assert(!/caches\.|location\.reload/.test(read("main.js")), "main.js never deletes caches or reloads on a version change");
// 启动失败的自动刷新：最多两次，存储被禁用时按地址里的次数算，不会一直刷；新旧文件混在一起（缺导出）也会刷
{
  const src = read("main.js").replace(/\r\n/g, "\n").replace(/\nboot\(false\);/, "");
  const run = (search, storage) => {
    const gone = [];
    const win = { addEventListener() {}, setTimeout: (f) => f(), sessionStorage: storage, location: { href: `${"https://game.test"}/${search}`, search, replace: (u) => gone.push(u) } };
    const ctx = vm.createContext({ window: win, document: { getElementById: () => null, createElement: () => ({ style: {}, appendChild() {}, remove() {}, addEventListener() {} }), body: { appendChild() {} } }, URL, Date, console });
    // 动态 import 换成一个必定失败的函数
    vm.runInContext(src.replace(/await import\(/g, "await fakeImport(").replace(/^/, "const fakeImport = async () => { throw new SyntaxError('does not provide an export'); };\n"), ctx);
    return vm.runInContext("boot(false)", ctx).then(() => gone);
  };
  const map = new Map();
  const ok = { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, v), removeItem: (k) => map.delete(k) };
  const blocked = { getItem() { throw new Error("denied"); }, setItem() { throw new Error("denied"); } };
  assert((await run("", ok)).length === 1 && (await run("", ok)).length === 1 && (await run("", ok)).length === 0, "two automatic reloads at most");
  const first = await run("", blocked);
  assert(first.length === 1 && /r=\d+_1$/.test(first[0]), "storage blocked: first reload");
  assert((await run("?r=123_1", blocked)).length === 1 && (await run("?r=123_2", blocked)).length === 0, "storage blocked: still stops after two");
}
assert(/serviceWorker\.register\([^\n]+\)\.catch\(/.test(html), "a refused registration (private window) does not surface as an error toast");
assert(!/b=\$\{Date\.now\(\)\}/.test(read("main.js")), "first boot uses a stable ?v= so modulepreload and cache hit");

// ---- 假浏览器 ----
const ORIGIN = "https://game.test";
function makeWorld({ source = sw, store = new Map(), net, putFails = false }) {
  const handlers = {};
  const log = [];
  const cacheOf = (name) => {
    if (!store.has(name)) store.set(name, new Map());
    const m = store.get(name);
    return {
      put: async (k, res) => { if (putFails) throw new Error("QuotaExceededError"); m.set(String(k), await res.text()); },
      match: async (k) => (m.has(String(k)) ? new Response(m.get(String(k))) : undefined),
    };
  };
  const ctx = vm.createContext({
    self: { addEventListener: (t, f) => { handlers[t] = f; }, location: { origin: ORIGIN, href: `${ORIGIN}/sw.js?v=${version}` }, skipWaiting() { log.push("skipWaiting"); }, clients: { claim() { log.push("claim"); } } },
    caches: { open: async (n) => cacheOf(n), keys: async () => [...store.keys()], delete: async (n) => store.delete(n) },
    fetch: async (r, init) => { const u = typeof r === "string" ? r : r.url; log.push(`${init?.cache ?? r.cache ?? "default"} ${u}`); return net(u); },
    Request, Response, URL, Promise, Error,
  });
  vm.runInContext(source, ctx);
  const run = async (type, extraEvent = {}) => {
    const waits = [];
    let res;
    handlers[type]({ waitUntil: (p) => waits.push(p), respondWith: (p) => { res = p; }, ...extraEvent });
    const r = res ? await res : undefined;
    await Promise.all(waits);
    return r;
  };
  const visit = (path, { method = "GET", mode } = {}) => {
    const request = new Request(`${ORIGIN}${path}`, { method });
    return run("fetch", { request: mode ? new Proxy(request, { get: (t, k) => (k === "mode" ? mode : typeof t[k] === "function" ? t[k].bind(t) : t[k]) }) : request });
  };
  return { run, visit, store, log };
}
const online = async (u) => {
  const f = fileOf(`.${new URL(u).pathname}`);
  if (u.includes("/api/")) return new Response("{}");
  if (existsSync(join(root, f || "index.html"))) return new Response(`file:${f === "" ? "index.html" : f}`);
  return new Response("nope", { status: 404 });
};
const offline = async () => { throw new TypeError("Failed to fetch"); };

// 首访：联网装好 → 断网
{
  const store = new Map();
  const w = makeWorld({ store, net: online });
  await w.run("install");
  assert(w.log.includes("skipWaiting"), "install finishes");
  assert(w.log.filter((l) => l.includes(ORIGIN)).every((l) => l.startsWith("no-cache ")), "precache revalidates instead of re-downloading (no-cache)");
  assert(store.get(`mengling-v${version}-core`)?.size === precache.length, `all ${precache.length} files in the core cache`);
  const off = makeWorld({ store, net: offline });
  const text = async (p, o) => (await off.visit(p, o)).text();
  for (const [p, f] of [["/", "index.html"], [`/?r=123_1`, "index.html"], ["/index.html", "index.html"], [`/main.js?v=${version}`, "main.js"], [`/app.js?v=${version}&r=1_1`, "app.js"], [`/data/beasts.js?v=${version}`, "data/beasts.js"],
    [`/styles.css?v=${version}`, "styles.css"], ["/modules/tabs/functions_tab.js?retry=1", "modules/tabs/functions_tab.js"], [`/assets/ui_icons/catnip.webp?v=${version}`, "assets/ui_icons/catnip.webp"]]) {
    assert((await text(p, { mode: p === "/" || p.startsWith("/?") ? "navigate" : undefined })) === `file:${f}` || (f === "index.html" && (await text(p, { mode: "navigate" })).includes("file:")), `offline ${p} comes from cache`);
  }
  assert((await off.visit("/somewhere", { mode: "navigate" })).status === 200, "offline navigation falls back to the game page");
  assert((await off.visit("/legal/privacy.html", { mode: "navigate" })).status === 503, "but not under a sub-path, where the page's relative addresses would all break");
  assert((await off.visit("/modules/nope.js")).status === 503, "offline unknown module is a clean 503");
  const api = await off.visit("/api/save", { method: "POST" });
  assert(api.status === 503 && (await api.json()).error === "offline", "offline API answers offline, never from cache");
  // 图：看过一次就留在本机
  const on2 = makeWorld({ store, net: online });
  await on2.visit("/assets/beasts/001.png");
  assert((await text("/assets/beasts/001.png")) === "file:assets/beasts/001.png", "a portrait seen once works offline");
  const on3 = makeWorld({ store, net: online });
  await on3.visit("/assets/beasts/001.png");
  assert(on3.log.length === 0, "seen portrait is not downloaded again");
  // 代码联网优先
  await on3.visit(`/app.js?v=${version}`);
  assert(on3.log.some((l) => l.startsWith("no-cache ") && l.includes("/app.js")), "code goes to network first with a conditional request");
  // 看过的法律页断网能看：线上会从 .html 跳到不带扩展名的地址，两个地址算同一页
  await on3.visit("/legal/privacy", { mode: "navigate" });
  store.get(`mengling-v${version}-runtime`).set(`${ORIGIN}/legal/privacy`, "file:legal/privacy.html");
  assert((await text("/legal/privacy.html", { mode: "navigate" })) === "file:legal/privacy.html", "a legal page seen online opens offline");
  assert(![...store.values()].some((m) => [...m.keys()].some((k) => k.includes("/api/") || k.includes("?"))), "no API response and no query-string duplicate is cached");
}

// 核心文件缺一个：不装，旧缓存不动
{
  const store = new Map([["mengling-v0.7.60-static", new Map([["x", "old"]])]]);
  const w = makeWorld({ store, net: async (u) => (u.endsWith("/modules/state.js") ? new Response("", { status: 500 }) : online(u)) });
  let threw = false;
  await w.run("install").catch(() => { threw = true; });
  assert(threw && !w.log.includes("skipWaiting") && store.has("mengling-v0.7.60-static"), "install fails closed and keeps the old cache");
}
// Pages 没有 404.html：缺的文件回「200 + 首页」。装的时候、看的时候都不能当成真文件
const spa = async (u) => {
  const path = new URL(u).pathname;
  return path !== "/" && !existsSync(join(root, path)) ? new Response("<!doctype html>", { headers: { "content-type": "text/html; charset=utf-8" } }) : online(u);
};
const missing = (path) => async (u) => (new URL(u).pathname === path ? new Response("<!doctype html>", { headers: { "content-type": "text/html; charset=utf-8" } }) : online(u));
{
  const w = makeWorld({ net: missing("/modules/state.js") });
  let threw = false;
  await w.run("install").catch(() => { threw = true; });
  assert(threw && !w.log.includes("skipWaiting"), "the home page sent in place of a module fails the install");

  const store = new Map();
  const ok = makeWorld({ store, net: online });
  await ok.run("install");
  const bad = makeWorld({ store, net: missing("/modules/tabs/pve_tab.js") });
  assert((await (await bad.visit("/modules/tabs/pve_tab.js")).text()) === "file:modules/tabs/pve_tab.js", "a cached module wins over the home page sent in its place");
  const s = makeWorld({ store, net: spa });
  await s.visit("/assets/beasts/nope.png");
  await s.visit("/modules/nope.js");
  assert(![...store.values()].some((m) => [...m.keys()].some((k) => k.includes("nope"))), "the home page is never stored under a file's address");
  await s.visit("/some-page", { mode: "navigate" });
  assert(store.get(`mengling-v${version}-runtime`)?.has(`${ORIGIN}/some-page`), "real pages still are");
}
// 服务器出错（5xx）：有存货用存货；没有就原样交给页面，不存
{
  const store = new Map();
  await makeWorld({ store, net: online }).run("install");
  const down = makeWorld({ store, net: async () => new Response("err", { status: 522 }) });
  assert((await (await down.visit("/", { mode: "navigate" })).text()).startsWith("file:"), "522 on the home page opens the cached game");
  assert((await (await down.visit("/modules/state.js")).text()) === "file:modules/state.js", "522 on a module uses the cached one");
  assert((await down.visit("/legal/terms", { mode: "navigate" })).status === 522, "an uncached page shows the server's own error");
  assert((await down.visit("/api/save", { method: "POST" })).status === 522, "API errors pass through untouched");
}
// 预缓存是一整套快照：新版下到一半断网，离线打开的仍是完整的旧版，不会新旧混在一起
{
  const store = new Map();
  await makeWorld({ store, net: online }).run("install");
  const next = makeWorld({ store, net: async () => new Response("new version") });
  assert((await (await next.visit("/app.js")).text()) === "new version", "online serves the new file");
  const off = makeWorld({ store, net: offline });
  assert((await (await off.visit("/app.js")).text()) === "file:app.js", "offline still has the complete old set");
}
// 新版页面刚打开、旧 sw 还在：带着别的版本号来要图先联网，断网再用存货；Range 与非 GET 不拦
{
  const store = new Map();
  await makeWorld({ store, net: online }).run("install");
  const next = makeWorld({ store, net: async () => new Response("new art") });
  assert((await (await next.visit("/assets/ui_icons/catnip.webp?v=99.0.0")).text()) === "new art", "another version's icon is fetched");
  assert((await (await next.visit(`/assets/ui_icons/catnip.webp?v=${version}`)).text()) === "file:assets/ui_icons/catnip.webp", "this version's icon still comes from the cache");
  const off = makeWorld({ store, net: offline });
  assert((await (await off.visit("/assets/ui_icons/catnip.webp?v=99.0.0")).text()) === "file:assets/ui_icons/catnip.webp", "offline it falls back to the cached one");
  let rejected = false;
  await off.visit("/assets/beasts/002.png?v=99.0.0").catch(() => { rejected = true; });
  assert(rejected, "an image that was never seen fails as a normal network error");
  const ranged = new Request(`${ORIGIN}/assets/beasts/001.png`, { headers: { range: "bytes=0-1" } });
  assert((await off.run("fetch", { request: ranged })) === undefined && (await off.visit("/other", { method: "POST" })) === undefined, "range and non-GET requests are left to the browser");
}
// 缓存配额满：照常把网上的给页面
{
  const q = makeWorld({ net: online, putFails: true });
  assert((await (await q.visit("/app.js")).text()) === "file:app.js" && (await (await q.visit("/assets/beasts/001.png")).text()).startsWith("file:"), "a full quota never blocks the page");
}
// 按需文件缺一个：照样装
{
  const w = makeWorld({ net: async (u) => (u.endsWith("/modules/tabs/pve_tab.js") ? new Response("", { status: 500 }) : online(u)) });
  await w.run("install");
  assert(w.log.includes("skipWaiting"), "a missing optional module does not block install");
}
// 换版本：激活时只留本版两个缓存
{
  const store = new Map([["mengling-v0.7.60-static", new Map()], ["mengling-v0.7.60-data", new Map()], [`mengling-v${version}-core`, new Map([["k", "v"]])], [`mengling-v${version}-runtime`, new Map()]]);
  const w = makeWorld({ store, net: online });
  await w.run("activate");
  assert([...store.keys()].sort().join() === `mengling-v${version}-core,mengling-v${version}-runtime` && store.get(`mengling-v${version}-core`).size === 1, "activate drops old caches only");
  assert(w.log.includes("claim"), "activate claims open pages");
}

// 改过名的素材：旧页面还按旧地址要，给新文件
{
  const renamed = [...sw.matchAll(/'(\/assets\/[^']+)': '(\/assets\/[^']+)'/g)].map((m) => [m[1], m[2]]);
  assert(renamed.length >= 1, "renamed assets listed");
  for (const [from, to] of renamed) {
    assert(!existsSync(join(root, from)) && existsSync(join(root, to)), `${from} is gone and ${to} exists`);
    const w = makeWorld({ net: online });
    assert((await (await w.visit(`${from}?v=0.7.58`)).text()) === `file:${to.slice(1)}`, `${from} is served from ${to}`);
  }
}

if (failed) {
  console.error(`sw-selfcheck: ${failed} failed`);
  process.exit(1);
}
console.log(`sw-selfcheck: OK（v${version}，预缓存 ${core.length} + ${extra.length} 项，${(bytes(precache) / 1048576).toFixed(2)} MB）`);
