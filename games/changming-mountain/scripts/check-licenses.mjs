// 从本包的依赖出发逐级查找（含提升到仓库根目录的包），检查许可是否在可商用白名单内。
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const ALLOW = new Set(["MIT", "ISC", "BSD-2-Clause", "BSD-3-Clause", "Apache-2.0", "0BSD", "CC0-1.0", "BlueOak-1.0.0"]);

function locate(name, from) {
  for (let dir = from; ; dir = dirname(dir)) {
    const f = join(dir, "node_modules", name, "package.json");
    if (existsSync(f)) return f;
    if (dirname(dir) === dir) return null;
  }
}

const seen = new Map();
const missing = [];
function visit(dir) {
  const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  const deps = { ...pkg.dependencies, ...pkg.optionalDependencies, ...(dir === ROOT ? pkg.devDependencies : {}) };
  for (const name of Object.keys(deps)) {
    const f = locate(name, dir);
    if (!f) {
      if (!pkg.optionalDependencies?.[name]) missing.push(name);
      continue;
    }
    if (seen.has(f)) continue;
    seen.set(f, JSON.parse(readFileSync(f, "utf8")).license ?? "未写明");
    visit(dirname(f));
  }
}
visit(ROOT);

const own = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const bad = [...seen].filter(([, lic]) => !ALLOW.has(lic)).map(([f, lic]) => `${f}: ${lic}`);
if (own.dependencies && Object.keys(own.dependencies).length) bad.push("package.json: 约定运行时零依赖，但 dependencies 不为空");
if (missing.length) bad.push(`没有安装：${missing.join("、")}（先跑 npm install）`);
if (bad.length) {
  console.error("licenses: FAIL\n" + bad.map((b) => "  - " + b).join("\n"));
  process.exit(1);
}
console.log(`licenses: OK（${seen.size} 个开发依赖，运行时零依赖）`);
