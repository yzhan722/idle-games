#!/usr/bin/env node
// 首屏预算（COM5）与按需面板：体积 / 请求数不许涨回去；面板只下载一次、有加载提示、失败能重试、版本对不上提示刷新。
// 不开浏览器：预算用 first-screen.mjs 静态算，面板逻辑用假 DOM 跑。
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { firstScreen, summarize, moduleGraph } from "./first-screen.mjs";

// ---- 预算 ----
const res = await firstScreen();
const sum = summarize(res);
assert.deepEqual(res.missing, [], "every first-screen file exists");
const KB = 1024;
assert.ok(sum.js.raw <= 1760 * KB && sum.js.n <= 105, `first-screen JS ${(sum.js.raw / KB).toFixed(0)} KB / ${sum.js.n} files within budget`);
assert.ok(sum.img.raw <= 520 * KB && sum.img.n <= 28, `first-screen images ${(sum.img.raw / KB).toFixed(0)} KB / ${sum.img.n} within budget`);
assert.ok(sum.total.wire <= 1000 * KB && sum.total.n <= 135, `first screen ${(sum.total.wire / KB).toFixed(0)} KB over the wire / ${sum.total.n} requests within budget`);
assert.ok(!res.groups.img.some((f) => /assets\/ui\/stage_/.test(f)), "panel stage art is not downloaded on the first screen");
assert.ok(!res.groups.img.some((f) => /assets\/beasts/.test(f)), "no portraits on a new save's first screen");
assert.ok(res.external.every((e) => !e.blocking), "external stylesheet does not block rendering");
const g = moduleGraph();
for (const f of ["functions_tab", "pve_tab", "help_tab", "mons_tab", "dex_tab", "future_tab", "items_tab", "leaderboard_tab", "social_tab"]) {
  assert.ok(g.lazyEntries.includes(`modules/tabs/${f}.js`) && !g.boot.includes(`modules/tabs/${f}.js`), `${f} is on demand`);
}

// 按需面板解构的名字，目标模块里都有导出（静态检查工具看不到动态 import）
let checked = 0;
for (const f of ["modules/app/wiring.js", "modules/app/boot.js"]) {
  const src = readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
  for (const m of src.matchAll(/load: \(q\) =>\s*Promise\.all\(\[([\s\S]*?)\]\),\s*setup: \(\[([\s\S]*?)\]\) =>/g)) {
    const files = [...m[1].matchAll(/import\(`\.\.\/([^`$]+)\$\{q\}`\)/g)].map((x) => x[1]);
    const groups = [...m[2].matchAll(/\{([^}]*)\}/g)].map((x) => x[1].split(",").map((n) => n.trim()).filter(Boolean));
    assert.equal(files.length, groups.length, `${f}: one destructuring per module (${files.join(", ")})`);
    files.forEach((file, i) => {
      const target = readFileSync(new URL(`../modules/${file}`, import.meta.url), "utf8");
      for (const n of groups[i]) assert.ok(new RegExp(`^export (?:async )?(?:function|const) ${n}\\b`, "m").test(target), `${file} exports ${n}`);
      checked += groups[i].length;
    });
  }
}
assert.ok(checked >= 18, `lazy exports checked (${checked})`);

// ---- 假 DOM ----
function el(tag) {
  const node = {
    tag, children: [], parentElement: null, className: "", attrs: {}, listeners: {}, _text: "",
    setAttribute(k, v) { this.attrs[k] = v; },
    get textContent() { return this._text + this.children.map((c) => c.textContent).join(""); },
    set textContent(v) { this._text = v; this.children = []; },
    appendChild(c) { c.parentElement = this; this.children.push(c); return c; },
    insertBefore(c, ref) { c.parentElement = this; this.children.splice(this.children.indexOf(ref), 0, c); return c; },
    remove() { const p = this.parentElement; if (p) p.children.splice(p.children.indexOf(this), 1); this.parentElement = null; },
    addEventListener(t, f) { (this.listeners[t] ??= []).push(f); },
    click() { for (const f of this.listeners.click ?? []) f(); },
    find(cls) { return this.className.split(" ").includes(cls) ? this : this.children.map((c) => c.find(cls)).find(Boolean); },
  };
  return node;
}
globalThis.document = { createElement: el };
const errors = [];
console.error = (...a) => errors.push(a.join(" "));
const { createLazyPanel, needsReload, preloadWhenIdle } = await import("../modules/app/lazy_panel.js");
const settle = () => new Promise((r) => setTimeout(r, 0));

function makePanel({ load, setup = (m) => m.render, active = () => true }) {
  const panel = el("div");
  const host = panel.appendChild(el("div"));
  const reloads = [];
  const lazy = createLazyPanel({ load, setup, getHost: () => host, isActive: active, reload: () => reloads.push(1) });
  return { panel, host, lazy, reloads, notice: () => panel.find("lazyPanelNotice"), button: () => panel.find("lazyPanelNotice")?.find("btn") };
}

// 打开 → 提示 → 到手就渲染，提示消失；每帧调用不重复下载
{
  let loads = 0;
  let setups = 0;
  let renders = 0;
  let release;
  const gate = new Promise((r) => { release = r; });
  const p = makePanel({ load: async (q) => { loads += 1; assert.equal(q, ""); await gate; return { render: () => { renders += 1; return "ok"; } }; }, setup: (m) => { setups += 1; return m.render; } });
  p.lazy.render();
  assert.ok(p.notice()?.textContent.includes("正在打开") && p.panel.children.indexOf(p.notice()) === 0, "loading notice sits above the panel content");
  p.lazy.render();
  p.lazy.render();
  release();
  await settle();
  assert.deepEqual([loads, setups, renders], [1, 1, 1], "one download, one setup, one render");
  assert.equal(p.notice(), undefined, "notice removed");
  assert.equal(p.lazy.render(), "ok", "afterwards render is a direct call");
  assert.equal(renders, 2);
}
// 加载时切走了：不渲染别人的面板
{
  let renders = 0;
  let active = true;
  const p = makePanel({ load: async () => ({ render: () => { renders += 1; } }), active: () => active });
  p.lazy.render();
  active = false;
  await settle();
  assert.equal(renders, 0, "no render after leaving the tab");
  assert.equal(p.notice(), undefined, "notice removed even when hidden");
}
// 失败 → 重试按钮 → 换地址 → 成功；失败后不自己反复下载
{
  const asked = [];
  const p = makePanel({ load: async (q) => { asked.push(q); if (asked.length === 1) throw new TypeError("Failed to fetch"); return { render: () => {} }; } });
  p.lazy.render();
  await settle();
  assert.ok(p.button()?.textContent.includes("重试"), "retry button shown");
  const sameButton = p.button();
  for (let i = 0; i < 5; i += 1) p.lazy.render();
  await settle();
  assert.equal(asked.length, 1, "render ticks do not hammer the network after a failure");
  assert.equal(p.button(), sameButton, "render ticks keep the same button, so a click is not lost");
  p.button().click();
  await settle();
  assert.deepEqual(asked, ["", "?retry=1"], "retry uses a new address");
  assert.equal(p.notice(), undefined);
  assert.ok(p.lazy.isReady());
}
// 换了地址还是失败 → 刷新（面板自己 import 的文件换不了地址，浏览器会一直给失败结果）；断网时不劝刷新
{
  const p = makePanel({ load: async () => { throw new TypeError("Failed to fetch"); } });
  p.lazy.render();
  await settle();
  assert.ok(p.button().textContent.includes("重试"), "first failure offers a retry");
  p.button().click();
  await settle();
  assert.ok(p.button().textContent.includes("刷新"), "second failure offers a reload");
  p.button().click();
  assert.equal(p.reloads.length, 1);
  assert.ok(needsReload(new TypeError("x"), 5, true) && !needsReload(new TypeError("x"), 5, false), "offline keeps retry");
  assert.ok(needsReload(new SyntaxError("x"), 1, false), "a version mismatch can only be reloaded");
}
// 「刷新」之前先存档：每个面板都传了存档后再刷新的 reload
{
  const wiring = readFileSync(new URL("../modules/app/wiring.js", import.meta.url), "utf8").replace(/\r\n/g, "\n");
  const boot = readFileSync(new URL("../modules/app/boot.js", import.meta.url), "utf8").replace(/\r\n/g, "\n");
  assert.equal(wiring.match(/createLazyPanel\(\{\n/g).length, wiring.match(/createLazyPanel\(\{\n\s+reload,\n/g).length, "every panel reloads through the saving one");
  for (const src of [wiring, boot]) assert.match(src, /reload(: | = )\(\) => \{\n\s+save\(\);\n\s+window\.location\.reload\(\);/, "reload saves first");
}
// 新版模块配旧页面（缺导出）与 setup 出错：直接给刷新，不重试（否则事件会挂两遍）
{
  assert.ok(needsReload(new SyntaxError("does not provide an export"), 1) && !needsReload(new TypeError("x"), 1));
  const p = makePanel({ load: async () => ({}), setup: () => { throw new Error("boom"); } });
  p.lazy.render();
  await settle();
  assert.ok(p.button().textContent.includes("刷新"), "setup failure offers a reload");
}
// 静默预取：不弹提示；失败不算数，打开时再下；预取没完就打开只下一次
{
  let n = 0;
  const p = makePanel({ load: async () => { n += 1; if (n === 1) throw new TypeError("Failed to fetch"); return { render: () => {} }; } });
  assert.equal(await p.lazy.preload(), false);
  assert.equal(p.notice(), undefined, "silent preload shows nothing");
  p.lazy.render();
  await settle();
  assert.ok(n === 2 && p.lazy.isReady(), "opening after a failed preload downloads again");

  let loads = 0;
  let renders = 0;
  let release;
  const gate = new Promise((r) => { release = r; });
  const q = makePanel({ load: async () => { loads += 1; await gate; return { render: () => { renders += 1; } }; } });
  const pre = q.lazy.preload();
  q.lazy.render();
  assert.ok(q.notice()?.textContent.includes("正在打开"), "opening during preload shows the notice");
  release();
  await pre;
  await settle();
  assert.deepEqual([loads, renders], [1, 1], "preload and open share one download");
  assert.equal(q.notice(), undefined);
}
// 预取逐个来；省流量不预取
{
  const order = [];
  const mk = (k) => ({ preload: async () => { order.push(`start ${k}`); await settle(); order.push(`end ${k}`); } });
  preloadWhenIdle([mk("a"), mk("b")], { delayMs: 0 });
  await new Promise((r) => setTimeout(r, 900));
  assert.deepEqual(order, ["start a", "end a", "start b", "end b"], "one at a time");
  Object.defineProperty(globalThis, "navigator", { value: { connection: { saveData: true } }, configurable: true });
  preloadWhenIdle([mk("c")], { delayMs: 0 });
  await new Promise((r) => setTimeout(r, 300));
  assert.equal(order.length, 4, "Save-Data turns preloading off");
}
// setup 出错那次记过一条错误，其余也只走 console.error，不抛到外面
assert.ok(errors.length >= 4 && errors.every((e) => e.startsWith("[lazy panel]")), "failures are logged");

console.log(`first-screen-selfcheck: OK（首屏 ${sum.total.n} 请求，传输约 ${(sum.total.wire / KB).toFixed(0)} KB；按需模块 ${g.lazy.length} 个）`);
