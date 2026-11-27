// stage-release.mjs — 把要发布的文件按白名单拷到一个空目录，deploy.ps1 从那里上传。
// 不靠忽略清单：`wrangler pages deploy` 认不认 .assetsignore / .wranglerignore 没有核实过，
// 直接传整个目录会把 .env.local、scripts/_srcdata、docs、memory 一起公开（2026-11-26 查到线上就是这样，见 docs/ops/LEAK_2026-11-26.md）。
// 拷之前查白名单、拷完再查结果，出现不该公开的东西就失败并清空目录，deploy.ps1 随之中止。
// 用法：node scripts/stage-release.mjs <空目录>

import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve, sep } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

export const RELEASE_FILES = ["index.html", "main.js", "app.js", "sw.js", "styles.css", "favicon.ico", "site.webmanifest", "data/beasts.js"];
export const RELEASE_DIRS = ["assets", "modules", "legal", "functions"];
/** 目录里也不该有的东西：拷的时候跳过（点开头的一律不带：.env*、.dev.vars、.git、.gitkeep、.DS_Store） */
const REFUSE = /(^|[\\/])(\.[^\\/]*|node_modules|_srcdata)([\\/]|$)|\.(md|sql|map|log|toml)$/i;
/** 发布包里只许有这些扩展名；没扩展名的也不许 */
const ALLOWED_EXT = /\.(html|js|css|png|jpe?g|webp|svg|gif|ico|webmanifest|woff2|mp3|ogg|m4a)$/i;

/** 发布包里一个都不许有；出现即失败 */
const FORBIDDEN = [
  [/(^|\/)\.env|\.env(\.|$)/i, ".env*"],
  [/(^|\/)\./, "dot file / dot directory"],
  [/\.ps1$|\.sh$|\.bat$|\.cmd$/i, "*.ps1 / shell script"],
  [/\.sql$/i, "*.sql"],
  [/\.(md|map|log|toml|ya?ml|pem|key|p12|pfx|zip|7z|tgz|gz|bak|psd|mjs|ts|py)$/i, "source / log / key / archive"],
  [/\.(bak|old|orig|rej|tmp|swp)([._-]|$)|~$| \(\d+\)\.| - (副本|copy)/i, "backup copy"],
  [/(^|\/)(scripts|docs|memory|migrations|_srcdata|node_modules|_archive|tools)(\/|$)/i, "scripts/ docs/ memory/ migrations/ _srcdata …"],
  [/(^|\/)(package(-lock)?\.json|wrangler\.[a-z]+|beast_traits\.json|beasts_zh\.js)$/i, "build-time file"],
  [/(^|\/)[^/]*(secret|credential|token)[^/]*\.(json|txt)$/i, "secret-looking file"],
];
/** 文本里不许有的：部署凭证的变量赋值（含 JSON 写法）、私钥 */
const FORBIDDEN_TEXT = /\b(CLOUDFLARE_API_TOKEN|CF_API_TOKEN|OPS_ADMIN_KEY|IAP_WEBHOOK_SECRET)["'`]?\s*[=:]\s*["'`]?[A-Za-z0-9_-]{16,}|-----BEGIN [A-Z ]*PRIVATE KEY-----/;

/** 不该公开的路径（空数组 = 干净）。白名单目录名与拷好的文件都用它查 */
export function forbiddenPaths(paths) {
  const out = [];
  for (const p of paths) {
    const norm = String(p).split("\\").join("/").replace(/^\.\//, "");
    if (!norm || norm === "." || norm.startsWith("..") || norm.startsWith("/") || /^[a-z]:/i.test(norm)) {
      out.push(`${p}（整个目录或项目外的路径）`);
      continue;
    }
    const hit = FORBIDDEN.find(([re]) => re.test(norm));
    if (hit) out.push(`${p}（${hit[1]}）`);
  }
  return out;
}

export function hasForbiddenText(text) {
  return FORBIDDEN_TEXT.test(text);
}

function listFiles(dir) {
  const files = [];
  const walk = (rel) => {
    for (const e of readdirSync(join(dir, rel))) {
      const p = rel ? `${rel}/${e}` : e;
      const st = lstatSync(join(dir, p));
      if (st.isSymbolicLink()) throw new Error(`symbolic link in the package: ${p}`);
      if (st.isDirectory()) walk(p);
      else files.push(p);
    }
  };
  walk("");
  return files;
}

/** 拷好的目录再查一遍 */
export function checkStaged(dir) {
  const files = listFiles(dir);
  const bad = forbiddenPaths(files);
  for (const f of files) {
    if (!ALLOWED_EXT.test(f)) bad.push(`${f}（不在允许的扩展名里）`);
    if (/\.(js|css|html|webmanifest|svg)$/i.test(f) && hasForbiddenText(readFileSync(join(dir, f), "utf8"))) bad.push(`${f}（内容里有凭证赋值）`);
  }
  if (bad.length) throw new Error(`release package must not contain: ${bad.slice(0, 10).join(", ")}`);
  return files;
}

export function stageRelease(target, { files = RELEASE_FILES, dirs = RELEASE_DIRS } = {}) {
  const bad = forbiddenPaths([...files, ...dirs]);
  if (bad.length) throw new Error(`release allow-list must not contain: ${bad.join(", ")}`);
  const dir = resolve(target);
  const fold = (p) => (process.platform === "win32" ? p.toLowerCase() : p); // Windows 路径不分大小写
  if (fold(dir) === fold(root) || fold(dir).startsWith(fold(root + sep))) throw new Error("target must be outside the project");
  if (existsSync(dir) && readdirSync(dir).length) throw new Error(`target is not empty: ${dir}`);
  mkdirSync(dir, { recursive: true });
  try {
    for (const f of files) {
      mkdirSync(dirname(join(dir, f)), { recursive: true });
      cpSync(join(root, f), join(dir, f));
    }
    for (const d of dirs) {
      cpSync(join(root, d), join(dir, d), { recursive: true, filter: (src) => !REFUSE.test(src.slice(root.length)) });
    }
    return checkStaged(dir);
  } catch (e) {
    rmSync(dir, { recursive: true, force: true });
    throw e;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const target = process.argv[2];
  if (!target) {
    console.error("usage: node scripts/stage-release.mjs <empty dir>");
    process.exit(1);
  }
  try {
    const files = stageRelease(target);
    console.log(`staged ${files.length} files to ${resolve(target)}`);
  } catch (e) {
    console.error(`stage-release: ${e.message}`);
    process.exit(1);
  }
}
