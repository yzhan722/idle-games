// 权利与规模检查：单文件行数、禁用词、外部引用、素材登记。
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const MAX_LINES = 800;
const CODE = new Set([".ts", ".mjs", ".css", ".html"]);
const SKIP = new Set(["node_modules", "dist", ".git"]);

// 旧版引擎与小说的专有词，以及原作那套境界名。新作里一个都不许出现。
const BANNED = [
  "kitten", "catnip", "nuclearunicorn", "bloodrizer", "dojo.declare",
  "凡人修仙", "韩立", "南宫婉", "墨大夫", "黄枫谷", "掌天瓶", "乱星海", "虚天殿", "七玄门", "神手谷",
  "天星城", "长春功", "青元剑诀", "大衍诀", "血色禁地", "噬金虫", "掩月宗", "太岳山", "乾蓝冰焰",
  "炼气", "筑基", "结丹", "元婴", "化神", "炼虚", "大乘期", "渡劫期", "金仙", "真仙",
  "milky way", "games/xianxia",
];

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    if (SKIP.has(name)) return [];
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const problems = [];
const files = walk(ROOT).map((p) => ({ path: p, rel: relative(ROOT, p).split(sep).join("/") }));
const registry = readFileSync(join(ROOT, "ASSETS_LICENSE.md"), "utf8");

for (const { path, rel } of files) {
  const ext = extname(rel);
  const inGame = rel.startsWith("src/") || rel.startsWith("public/") || rel === "index.html";
  if (CODE.has(ext)) {
    const text = readFileSync(path, "utf8");
    const lines = text.split("\n").length;
    if (lines > MAX_LINES) problems.push(`${rel}: ${lines} 行，超过 ${MAX_LINES}`);
    if (inGame || rel.startsWith("tests/")) {
      const low = text.toLowerCase();
      for (const word of BANNED) if (low.includes(word)) problems.push(`${rel}: 出现禁用词「${word}」`);
    }
    if (inGame && /(https?:)?\/\/[a-z0-9-]+\.[a-z]{2,}/i.test(text.replace(/^\s*\/\/.*$/gm, "")))
      problems.push(`${rel}: 引用了外部网址`);
    if (/from\s+["'](\.\.\/){2,}games|from\s+["'][^"']*xianxia/.test(text)) problems.push(`${rel}: 引用了本目录以外的代码`);
    if (inGame && /\p{Extended_Pictographic}/u.test(text)) problems.push(`${rel}: 出现 emoji`);
  } else if (inGame && !registry.includes(`\`${rel}\``)) {
    problems.push(`${rel}: 素材没有在 ASSETS_LICENSE.md 登记`);
  }
}

// 发行前不许还带着代码画的占位图形。
const placeholder = files.some((f) => f.rel === "src/ui/placeholder.ts");
if (placeholder && process.argv.includes("--release")) problems.push("src/ui/placeholder.ts: 正式美术还没到齐，不能发行");

if (problems.length) {
  console.error("guard: FAIL\n" + problems.map((p) => "  - " + p).join("\n"));
  process.exit(1);
}
console.log(`guard: OK（检查 ${files.length} 个文件${placeholder ? "；还有占位美术，不能发行" : ""}）`);
