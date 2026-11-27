#!/usr/bin/env node
// 首屏体积（纯静态，不开浏览器）：第一次打开到能玩，必须下载的 JS / CSS / 图 / 数据各多少字节、多少个请求。
// 用法：node scripts/first-screen.mjs            打印汇总
//       node scripts/first-screen.mjs --list     再列出每个文件
//       node scripts/first-screen.mjs --md 标题   打印一段 Markdown（贴进 docs/PERF.md）
//       加 --root <目录> 量另一份拷贝（例如改之前的备份）
//
// 口径：
// - JS：main.js，加上它启动时动态 import 的 type_zh.js / app.js 及其全部静态 import；面板内的 import("…") 算按需，不计入首屏。
// - 请求按完整地址算：同一张图带 ?v= 和不带是两个请求。
// - 图：index.html 里没写 loading="lazy" 的 <img> 与 preload；CSS 里首屏元素会用到的 url()；新档篝火页实际渲染出来的图标。
// - 压缩后字节用 brotli 11 估（Pages 会压缩文本），图片按原样。
// - /api 请求、Google Fonts 的字体文件大小未知，只列个数 / 不计入。

import { brotliCompressSync, constants } from "node:zlib";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import vm from "node:vm";

const rootArg = process.argv.indexOf("--root");
const root = rootArg > 0 && process.argv[1]?.endsWith("first-screen.mjs") ? resolve(process.argv[rootArg + 1]) : join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => readFileSync(join(root, f), "utf8");
const posix = (p) => p.split("\\").join("/");

const STATIC_IMPORT = /(?:^|[\n;}])[ \t]*(?:import|export)\s+(?:[\w*{}\s,$]+?\s+from\s+)?["']([^"']+)["']/g;
const DYNAMIC_IMPORT = /\bimport\(\s*(["'`])([^"'`]+)\1/g;

function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");
}

/** 模块的静态 / 动态依赖（相对项目根的路径） */
export function moduleDeps(file) {
  const src = stripComments(read(file));
  const to = (spec) => posix(relative(root, resolve(join(root, dirname(file)), spec.split(/[?$]/)[0])));
  const isLocal = (spec) => spec.startsWith(".");
  return {
    statics: [...src.matchAll(STATIC_IMPORT)].map((m) => m[1]).filter(isLocal).map(to),
    dynamics: [...src.matchAll(DYNAMIC_IMPORT)].map((m) => m[2]).filter(isLocal).map(to),
  };
}

function closure(entries, seen = new Set()) {
  const queue = [...entries];
  while (queue.length) {
    const f = queue.shift();
    if (seen.has(f)) continue;
    seen.add(f);
    queue.push(...moduleDeps(f).statics);
  }
  return seen;
}

/** { boot: 首屏模块, lazyEntries: 按需入口, lazy: 只有按需才会下载的模块 } */
export function moduleGraph() {
  const bootEntries = ["main.js", ...moduleDeps("main.js").dynamics];
  const boot = closure(bootEntries);
  const lazyEntries = new Set();
  const all = new Set(boot);
  const queue = [...boot].filter((f) => f !== "main.js");
  const visited = new Set();
  while (queue.length) {
    const f = queue.shift();
    if (visited.has(f)) continue;
    visited.add(f);
    for (const d of moduleDeps(f).dynamics) {
      lazyEntries.add(d);
      for (const x of closure([d])) {
        if (!all.has(x)) all.add(x);
        queue.push(x);
      }
    }
  }
  return { boot: [...boot], lazyEntries: [...lazyEntries], lazy: [...all].filter((f) => !boot.has(f)) };
}

/** 去掉开头的 ./ ，保留 ?v=（请求按完整地址去重） */
const localUrl = (u) => u.replace(/^\.\//, "").split("#")[0];
const pathOf = (u) => u.split("?")[0];

/** 新档篝火页实际会显示的图：用新档跑一遍渲染函数，只取 HTML 字符串里的 src */
async function firstViewImages(boot) {
  if (!globalThis.BEAST_ROSTER) vm.runInThisContext(read("data/beasts.js"), { filename: "data/beasts.js" });
  const load = (f) => import(pathToFileURL(join(root, f)).href);
  const [{ defaultState }, { buildDefs }, { createRenderBonfireActions }, { createRenderBuildings }, icons] = await Promise.all([
    load("modules/state.js"), load("modules/defs_core.js"), load("modules/tabs/bonfire_tab.js"), load("modules/render/buildings.js"),
    load("modules/render/rpg_svg_icons.js"),
  ]);
  const state = defaultState();
  const defs = buildDefs();
  const el = () => ({ innerHTML: "", childElementCount: 0, querySelector: () => null });
  const bonfire = el();
  const buildings = el();
  createRenderBonfireActions({ elBonfireActions: bonfire, elBtnGather: null, ui: { bonfireDirty: true }, getState: () => state })();
  createRenderBuildings({ elBuildings: buildings, defs, canAfford: () => false, getBuildingCost: (bid) => defs.buildings[bid].baseCost ?? {}, getState: () => state })();
  const html = [bonfire.innerHTML, buildings.innerHTML, icons.renderResSvg("catnip", 22), icons.renderResSvg("wood", 22), icons.renderResSvg("minerals", 22),
    read("modules/audio/sound_engine.js").match(/btn\.innerHTML = `<img[^`]*`/)?.[0] ?? ""].join("\n");
  const out = [...html.matchAll(/src="(\.\/assets\/[^"$]+)"/g)].map((m) => localUrl(m[1]));
  // 社交页签如果在首屏模块里，启动时就会往（隐藏的）面板里画 3 位 NPC 和几枚图标
  if (boot.includes("modules/tabs/social_tab.js")) {
    out.push("assets/beasts/016.png", "assets/beasts/043.png", "assets/beasts/006.png");
    for (const k of ["tab_pve", "tab_help", "tab_dex"]) out.push(localUrl(/src="([^"]+)"/.exec(icons.renderUiIcon(k, 16))[1]));
    for (const k of ["friendshipBracelet", "shinyCharm"]) out.push(localUrl(/src="([^"]+)"/.exec(icons.renderResSvg(k, 16))[1]));
  }
  return out;
}

function cssImages(html) {
  const css = read("styles.css").replace(/\/\*[\s\S]*?\*\//g, "");
  const out = [];
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*url\([^{}]*)\}/g)) {
    const selector = m[1].trim().split("\n").pop().trim();
    const first = /^(html|body|:root|\.shell|\.topbar)\b/.test(selector) || (/^\.tab\[data-tab="([\w]+)"\]::before/.test(selector) && html.includes(`class="tab${""}`) && new RegExp(`data-tab="${/data-tab="(\w+)"/.exec(selector)[1]}"`).test(html)) || /^\.tab--more::before/.test(selector);
    if (!first) continue;
    for (const u of m[2].matchAll(/url\(["']?([^"')]+)["']?\)/g)) if (!u[1].startsWith("data:")) out.push(localUrl(u[1]));
  }
  return out;
}

function htmlAssets(html) {
  const imgs = [];
  for (const m of html.matchAll(/<link\b[^>]*>/g)) {
    const tag = m[0];
    const href = /href="([^"]+)"/.exec(tag)?.[1] ?? "";
    if (/rel="preload"/.test(tag) && /as="image"/.test(tag)) imgs.push(localUrl(href));
    if (/rel="icon"/.test(tag) && /sizes="32x32"/.test(tag)) imgs.push(localUrl(href));
  }
  const body = html.slice(html.indexOf("<body"));
  for (const m of body.replace(/<script[\s\S]*?<\/script>/g, "").matchAll(/<img\b[^>]*>/g)) {
    if (/loading="lazy"/.test(m[0])) continue;
    const src = /src="([^"]+)"/.exec(m[0])?.[1];
    if (src) imgs.push(localUrl(src));
  }
  const css = [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g)].map((m) => ({ href: /href="([^"]+)"/.exec(m[0])[1], blocking: !/media="print"/.test(m[0]) }));
  const data = [...html.matchAll(/<script\b[^>]*src="(\.\/data\/[^"]+)"/g)].map((m) => localUrl(m[1]));
  return { imgs, css, data, manifest: localUrl(/rel="manifest" href="([^"]+)"/.exec(html)?.[1] ?? "") };
}

const size = (u) => (existsSync(join(root, pathOf(u))) ? statSync(join(root, pathOf(u))).size : 0);
const br = (u) => (size(u) ? brotliCompressSync(readFileSync(join(root, pathOf(u))), { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length : 0);

export async function firstScreen() {
  const html = read("index.html");
  const a = htmlAssets(html);
  const graph = moduleGraph();
  const uniq = (xs) => [...new Set(xs)].filter(Boolean);
  const groups = {
    html: ["index.html"],
    js: uniq(graph.boot),
    css: uniq(a.css.filter((c) => c.href.startsWith("./")).map((c) => localUrl(c.href))),
    data: uniq([...a.data, a.manifest]),
    img: uniq([...a.imgs, ...cssImages(html), ...(await firstViewImages(graph.boot))]),
  };
  const missing = Object.values(groups).flat().filter((u) => !existsSync(join(root, pathOf(u))));
  return { groups, graph, missing, external: a.css.filter((c) => /^https?:/.test(c.href)) };
}

export function summarize({ groups }) {
  const rows = {};
  for (const [k, files] of Object.entries(groups)) {
    const raw = files.reduce((s, f) => s + size(f), 0);
    rows[k] = { n: files.length, raw, wire: k === "img" ? raw : files.reduce((s, f) => s + br(f), 0) };
  }
  rows.total = { n: 0, raw: 0, wire: 0 };
  for (const [k, r] of Object.entries(rows)) if (k !== "total") for (const f of ["n", "raw", "wire"]) rows.total[f] += r[f];
  return rows;
}

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const res = await firstScreen();
  const rows = summarize(res);
  const lazyRaw = res.graph.lazy.reduce((s, f) => s + size(f), 0);
  const LABEL = { html: "HTML", js: "JS", css: "CSS", data: "数据", img: "图", total: "合计" };
  const mdAt = process.argv.indexOf("--md");
  if (mdAt >= 0) {
    console.log(`### ${process.argv[mdAt + 1] ?? "首屏"}\n\n| 类 | 请求数 | 原始 | 传输（brotli 估） |\n|---|---:|---:|---:|`);
    for (const [k, r] of Object.entries(rows)) console.log(`| ${LABEL[k]} | ${r.n} | ${kb(r.raw)} | ${kb(r.wire)} |`);
    console.log(`\n按需模块：${res.graph.lazy.length} 个，原始 ${kb(lazyRaw)}。外部样式：${res.external.map((e) => `${new URL(e.href).host}（${e.blocking ? "阻塞渲染" : "不阻塞"}）`).join("、") || "无"}。`);
  } else {
    for (const [k, r] of Object.entries(rows)) console.log(`${LABEL[k].padEnd(4)} 请求 ${String(r.n).padStart(4)}  原始 ${kb(r.raw).padStart(11)}  传输 ${kb(r.wire).padStart(11)}`);
    console.log(`按需模块 ${res.graph.lazy.length} 个（入口 ${res.graph.lazyEntries.length}），原始 ${kb(lazyRaw)}`);
    for (const e of res.external) console.log(`外部样式 ${e.href.slice(0, 60)} ${e.blocking ? "阻塞渲染" : "不阻塞"}`);
  }
  if (process.argv.includes("--list")) {
    for (const [k, files] of Object.entries(res.groups)) for (const f of [...files].sort((x, y) => size(y) - size(x))) console.log(k, size(f), f);
    for (const f of res.graph.lazy) console.log("lazy", size(f), f);
  }
  if (res.missing.length) {
    console.error(`缺文件：${res.missing.join(", ")}`);
    process.exit(1);
  }
}
