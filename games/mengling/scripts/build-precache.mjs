#!/usr/bin/env node
// 生成两份清单（改了模块 / 首屏图之后跑一次）：
//   1. sw.js 的 CORE_URLS（首屏必需，缺一个就不装）与 EXTRA_URLS（按需面板模块，缺了不影响安装）
//   2. index.html 里的 modulepreload（把 import 瀑布摊平，请求数不变）
// 用法：node scripts/build-precache.mjs          写入
//       node scripts/build-precache.mjs --check  只比对，不一致退出码 1（sw-selfcheck 会调用 render()）
// 策略：
// - 首屏 HTML / JS / CSS / 数据 / 图 + 全部按需模块进预缓存 → 首访后断网能打开、能进每个面板。
// - 立绘（约 12 MB）、其余图标与舞台图不进预缓存，看到才下载并留在本机；断网时没看过的立绘退回爪印徽记。

import { readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { firstScreen } from "./first-screen.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pathOf = (u) => u.split("?")[0];
const lf = (s) => s.replace(/\r\n/g, "\n");
/** 断网时也该看得到：另一个尺寸的站点图标 */
const EXTRA_IMAGES = ["assets/ui/favicon-64.png"];

export async function buildLists() {
  const { groups, graph } = await firstScreen();
  const core = ["./", ...new Set([...groups.js, ...groups.css, ...groups.data, ...groups.img].map(pathOf))];
  const extra = [...new Set([...graph.lazy, ...EXTRA_IMAGES])].filter((f) => !core.includes(f));
  const order = (xs) => xs.sort((a, b) => ((a === "./" ? "" : a) < (b === "./" ? "" : b) ? -1 : 1)).map((f) => (f === "./" ? f : `./${f}`));
  const version = /const CURRENT_VERSION = "([\d.]+)"/.exec(readFileSync(join(root, "main.js"), "utf8"))[1];
  // main.js 用 ?v= 动态加载这两个入口，其余模块地址不带查询；地址必须逐字一致，否则预加载白下
  const withQuery = new Set(["main.js", "app.js", "modules/type_zh.js"]);
  const preload = graph.boot.map((f) => `./${f}${withQuery.has(f) ? `?v=${version}` : ""}`);
  return { core: order(core), extra: order(extra), preload, version };
}

const block = (name, urls) => `const ${name} = [\n${urls.map((u) => `  '${u}',`).join("\n")}\n];`;

/** 按现状算出 sw.js 与 index.html 应有的内容（LF） */
export async function render() {
  const { core, extra, preload } = await buildLists();
  const put = (src, re, text, what) => {
    if (!re.test(src)) throw new Error(`marker missing: ${what}`);
    return src.replace(re, () => text);
  };
  const read = (f) => lf(readFileSync(join(root, f), "utf8"));
  let sw = read("sw.js");
  sw = put(sw, /const CORE_URLS = \[[\s\S]*?\n\];/, block("CORE_URLS", core), "CORE_URLS");
  sw = put(sw, /const EXTRA_URLS = \[[\s\S]*?\n\];/, block("EXTRA_URLS", extra), "EXTRA_URLS");
  const links = `<!-- modulepreload:start 由 scripts/build-precache.mjs 生成 -->\n${preload.map((u) => `    <link rel="modulepreload" href="${u}" />`).join("\n")}\n    <!-- modulepreload:end -->`;
  const html = put(read("index.html"), /<!-- modulepreload:start[\s\S]*?<!-- modulepreload:end -->/, links, "modulepreload");
  return { "sw.js": sw, "index.html": html };
}

export function staleFiles(out) {
  return Object.entries(out).filter(([f, text]) => lf(readFileSync(join(root, f), "utf8")) !== text).map(([f]) => f);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes("--check");
  const out = await render();
  const stale = staleFiles(out);
  for (const f of stale) {
    if (check) console.error(`${f} 的清单过期，跑 node scripts/build-precache.mjs`);
    else writeFileSync(join(root, f), readFileSync(join(root, f), "utf8").includes("\r\n") ? out[f].replace(/\n/g, "\r\n") : out[f]);
  }
  const { core, extra } = await buildLists();
  const bytes = (xs) => xs.reduce((s, u) => s + statSync(join(root, u === "./" ? "index.html" : u)).size, 0);
  console.log(`precache: core ${core.length} 项 ${(bytes(core) / 1024).toFixed(0)} KB，extra ${extra.length} 项 ${(bytes(extra) / 1024).toFixed(0)} KB（原始字节）`);
  if (check && stale.length) process.exit(1);
}
