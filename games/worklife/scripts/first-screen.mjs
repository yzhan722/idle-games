// 首屏字节数（WL-COM5）：只读 frontend/dist 的构建产物和源码里的图片引用，不开浏览器、不起服务。
// 用法：先 npm run build（frontend），再 node scripts/first-screen.mjs [--json]
//
// 三个画面，逐个累加：
//   登录页   = index.html 直接引用的 JS / CSS + LoginScreen 块 + 登录页图
//   建角     = 再加 NewGameInterface 块 + 建角弹窗的图（新玩家第一眼）
//   进游戏   = 再加主界面外壳 + 伐木页的图（老玩家第一眼不含建角图）
// 图按源码里的 T1Art 引用静态列出，是上限：屏幕外懒加载的图也算在内，另用「其中懒加载」标出来。
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "frontend", "dist");
const src = path.join(root, "frontend", "src");
const t1 = path.join(src, "assets", "t1");
/** vite 默认：小于这个字节数的图会内联进 JS，不再单独请求。 */
const INLINE_LIMIT = 4096;

if (!existsSync(path.join(dist, "index.html"))) {
  console.error("frontend/dist 不存在，先在 frontend 里 npm run build");
  process.exit(1);
}
const readDist = (p) => readFileSync(path.join(dist, p));
const readSrc = (p) => readFileSync(path.join(src, p), "utf8");
const size = (p) => {
  const buf = readDist(p);
  return { raw: buf.length, gzip: gzipSync(buf, { level: 9 }).length };
};

// ---- 代码块关系 ----
const html = readDist("index.html").toString("utf8");
const entryFiles = [...html.matchAll(/(?:src|href)="\/(assets\/[^"]+\.(?:js|css))"/g)].map((m) => m[1]);
const chunkCache = new Map();
function chunk(file) {
  if (chunkCache.has(file)) return chunkCache.get(file);
  const code = readDist(file).toString("utf8");
  const statics = [...code.matchAll(/(?:from|import)\s*"\.\/([^"]+\.js)"/g)].map((m) => `assets/${m[1]}`);
  const depList = /m\.f=\[([^\]]*)\]/.exec(code)?.[1].match(/"([^"]+)"/g)?.map((s) => s.slice(1, -1)) ?? [];
  const dynamics = [...code.matchAll(/import\("\.\/([^"]+\.js)"\)(?:\.then\([^)]*\)+)?,__vite__mapDeps\(\[([\d,]*)\]\)|import\("\.\/([^"]+\.js)"\)/g)].map((m) => ({
    file: `assets/${m[1] ?? m[3]}`,
    deps: (m[2] ?? "").split(",").filter(Boolean).map((i) => depList[Number(i)]).filter(Boolean),
  }));
  const info = { statics, dynamics };
  chunkCache.set(file, info);
  return info;
}
function closure(files) {
  const seen = new Set();
  const visit = (f) => {
    if (seen.has(f)) return;
    seen.add(f);
    if (f.endsWith(".js")) for (const s of chunk(f).statics) visit(s);
  };
  for (const f of files) visit(f);
  return seen;
}
const allJs = readdirSync(path.join(dist, "assets")).filter((f) => f.endsWith(".js")).map((f) => `assets/${f}`);
function dynamicNamed(name) {
  for (const js of allJs) {
    for (const d of chunk(js).dynamics) if (path.basename(d.file).startsWith(`${name}-`)) return [d.file, ...d.deps];
  }
  throw new Error(`没找到动态块 ${name}`);
}

// ---- 图片引用 ----
function itemFolder(id) {
  if (/^(weapon|armor|tool|shield|offhand|accessory|ring|amulet|pendant|crown|charm)_/.test(id)) return "equipment";
  if (/^(food|potion|drink|elixir|dish)_/.test(id)) return "consumables";
  return "materials";
}
const FOLDER = { ui: "ui", tree: "trees", monster: "monsters", character: "character", skills: "skills", equipment: "equipment", materials: "materials" };
const keyFor = (kind, id) => (kind === "item" ? (id === "gold" ? "ui/gold" : `${itemFolder(id)}/${id}`) : `${FOLDER[kind] ?? kind}/${id}`);
/** 列表里的树、所有物品图标用 t1_small 里的小图（没有就用原图），与 T1Art 的 small 一致。 */
const smallTrees = /<T1Art kind="tree"[^>]*\ssmall\s/.test(readSrc("components/SkillActionList.tsx"));
const smallItems = /<T1Art kind="item"[^>]*\ssmall\s/.test(readSrc("components/T1Art.tsx"));
function imageFile(ref) {
  const key = ref.replace("@small", "");
  const folder = key.split("/")[0];
  const small = path.join(src, "assets", "t1_small", `${key}.webp`);
  const useSmall = folder === "ui" || folder === "character" ? ref.endsWith("@small") : folder === "trees" ? smallTrees : smallItems;
  if (useSmall && existsSync(small)) return { key: `${key}（小图）`, bytes: statSync(small).size };
  for (const ext of ["webp", "png", "svg"]) {
    const f = path.join(t1, `${key}.${ext}`);
    if (existsSync(f)) return { key, bytes: statSync(f).size };
  }
  return undefined;
}
/** 某个源码文件里写死的 T1Art / T1ItemIcon。 */
function literals(file, kinds) {
  const text = readSrc(file);
  const keys = [...text.matchAll(/<T1Art\s+kind="(\w+)"\s+id="([\w-]+)"([^>]*)>/g)]
    .filter((m) => !kinds || kinds.includes(m[1]))
    .map((m) => keyFor(m[1], m[2]) + (/\ssmall\s|gold-inline|header-gold-art|inline-t1-icon/.test(m[3]) ? "@small" : ""));
  return [...keys, ...[...text.matchAll(/<T1ItemIcon\s+itemId="([\w-]+)"/g)].map((m) => keyFor("item", m[1]))];
}
/** 直接引用文件的图标（UiArt）。 */
const uiArt = (file) => [...readSrc(file).matchAll(/assetKey="([\w/-]+)"/g)].map((m) => m[1]);
/** 导航图标：侧栏和底栏写了 small 就用小图。 */
const smallNav = ["SkillSidebar", "MobileNavBar"].every((f) => /id=\{item\.icon\}[^>]*\ssmall\s/.test(readSrc(`components/${f}.tsx`)));
const navIcons = [...readSrc("gameplay/skillNav.ts").matchAll(/icon: "([\w-]+)"/g)].map((m) => `ui/${m[1]}${smallNav ? "@small" : ""}`);
/** 头像框、右侧面板和建角里的职业形象写了 small 就用小图。 */
const smallAvatar = /player-avatar-art[\s\S]{0,120}?alt=\{props\.alt \?\? label\}\s+small\s/.test(readSrc("components/T1Art.tsx"));
const smallClass = ["PlayerRightPanel", "CharacterCreate"].every((f) => /<T1Art kind="character"[^>]*\ssmall\s/.test(readSrc(`components/${f}.tsx`)));
const avatars = [...readSrc("components/T1Art.tsx").matchAll(/\{ id: "(avatar_\w+)"/g)].map((m) => `ui/${m[1]}${smallAvatar ? "@small" : ""}`);
const classIds = [...readSrc("gameplay/gameConstants.ts").matchAll(/^ {4}skill: 'skill_(\w+)'/gm)].map((m) => `character/${m[1]}${smallClass ? "@small" : ""}`);
const treesBlock = /export const trees = \[([\s\S]*?)\n\]/.exec(readSrc("gameplay/gameConstants.ts"))?.[1] ?? "";
const trees = [...treesBlock.matchAll(/\{ id: '(\w+)'/g)].map((m) => `trees/${m[1]}`);
/** 伐木页列表里的树：写了 loading="lazy" 的只有滚到附近才下载，首屏按先看得到的几行算。 */
const listIsLazy = /<T1Art kind="tree"[^>]*loading="lazy"/.test(readSrc("components/SkillActionList.tsx"));
const VISIBLE_ROWS = 8;

const screens = [
  { name: "登录页", files: [...entryFiles, ...dynamicNamed("LoginScreen")], images: [...literals("components/LoginScreen.tsx"), ...uiArt("components/LoginScreen.tsx")], lazy: [] },
  {
    name: "进游戏（伐木页）",
    files: [...entryFiles, ...dynamicNamed("NewGameInterface")],
    images: [
      ...navIcons,
      ...literals("components/GameHeader.tsx", ["ui"]),
      ...literals("components/GameChatPanel.tsx"),
      ...literals("components/PlayerRightPanel.tsx"),
      `character/woodcutter${smallClass ? "@small" : ""}`,
      avatars[0],
      ...(listIsLazy ? trees.slice(0, VISIBLE_ROWS) : trees),
    ],
    lazy: listIsLazy ? trees.slice(VISIBLE_ROWS) : [],
  },
  { name: "建角弹窗（新玩家另加）", files: [], images: [...avatars, ...classIds], lazy: [] },
];

const fonts = [...readdirSync(path.join(dist, "assets"))].filter((f) => /\.(woff2?|ttf|otf)$/.test(f)).reduce((n, f) => n + statSync(path.join(dist, "assets", f)).size, 0);
const report = screens.map((s) => {
  const files = [...closure(s.files)];
  const sum = (ext) => files.filter((f) => f.endsWith(ext)).map(size).reduce((a, b) => ({ raw: a.raw + b.raw, gzip: a.gzip + b.gzip }), { raw: 0, gzip: 0 });
  const images = [...new Set(s.images)].map(imageFile).filter((i) => i && i.bytes >= INLINE_LIMIT);
  const lazy = [...new Set(s.lazy)].map(imageFile).filter((i) => i && i.bytes >= INLINE_LIMIT);
  const bytes = (list) => list.reduce((n, i) => n + i.bytes, 0);
  return {
    name: s.name,
    js: sum(".js"),
    css: sum(".css"),
    images: { count: images.length, bytes: bytes(images), top: [...images].sort((a, b) => b.bytes - a.bytes).slice(0, 8) },
    lazyImages: { count: lazy.length, bytes: bytes(lazy) },
    fonts,
    transfer: sum(".js").gzip + sum(".css").gzip + bytes(images) + fonts,
    files,
  };
});
const inFirst = new Set(report.flatMap((r) => r.files));
const onDemand = allJs.filter((f) => !inFirst.has(f)).map((f) => ({ file: path.basename(f), ...size(f) })).sort((a, b) => b.gzip - a.gzip);
let assetTotal = 0;
for (const f of readdirSync(path.join(dist, "assets"))) assetTotal += statSync(path.join(dist, "assets", f)).size;

// 面板块不许引用主界面块：主界面换地址重试之后会变成两份（见 frontend/vite.config.ts 的 game-shared）
const mainChunk = dynamicNamed("NewGameInterface")[0];
const tangled = allJs.filter((f) => f !== mainChunk && chunk(f).statics.includes(mainChunk)).map((f) => path.basename(f));
if (tangled.length) {
  console.error(`面板块引用了主界面块：${tangled.join("、")}`);
  process.exitCode = 1;
}

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ screens: report, onDemand, assetTotal }, null, 2));
} else {
  const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
  for (const r of report) {
    console.log(`\n【${r.name}】合计传输 ${kb(r.transfer)}`);
    console.log(`  JS  ${kb(r.js.gzip)} gzip（${kb(r.js.raw)}）  CSS ${kb(r.css.gzip)} gzip（${kb(r.css.raw)}）  字体 ${kb(r.fonts)}`);
    console.log(`  图  ${r.images.count} 张 ${kb(r.images.bytes)}${r.lazyImages.count ? `；另有 ${r.lazyImages.count} 张 ${kb(r.lazyImages.bytes)} 滚到才下载` : ""}`);
    for (const i of r.images.top) console.log(`      ${kb(i.bytes).padStart(9)}  ${i.key}`);
  }
  console.log(`\n【打开时才下载的代码块】${onDemand.length} 个，gzip 共 ${kb(onDemand.reduce((n, c) => n + c.gzip, 0))}`);
  for (const c of onDemand) console.log(`  ${kb(c.gzip).padStart(9)}  ${c.file}`);
  console.log(`\n【dist/assets 总量】${(assetTotal / 1024 / 1024).toFixed(1)} MB`);
}
