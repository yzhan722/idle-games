#!/usr/bin/env node
// 发布包自检：白名单与拷出来的结果里没有 .env*、*.ps1、*.sql、scripts/、docs/、memory/、_srcdata；预缓存清单里的文件都在包里。
// 只拷到系统临时目录再删掉，不部署、不联网。
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { RELEASE_DIRS, RELEASE_FILES, checkStaged, forbiddenPaths, hasForbiddenText, stageRelease } from "./stage-release.mjs";
import { buildLists } from "./build-precache.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// 规则本身：该拦的都拦，正常文件不误伤
for (const p of [
  ".env", ".env.local", "assets/.env.production", "deploy.ps1", "d1_schema.sql", "migrations/009_token_version.sql", "scripts/selfcheck.mjs", "scripts", "docs", "docs/PERF.md", "memory", "memory/2026-04-16.md",
  "scripts/_srcdata/tier.js", "modules/_srcdata/x.js", "node_modules/a.js", ".wrangler/state", ".github/workflows/selfcheck.yml", ".git/config", "package.json", "package-lock.json", "wrangler.toml",
  "data/beast_traits.json", "data/beasts_zh.js", "README.md", "app.js.map", "x.log", ".", "..", "../x", "/etc", "C:\\Project", "assets/api_token.json", "backup.zip",
  ".ENV.Local", "Assets/.Env.Production", "assets/a/b/.dev.vars", "functions/.dev.vars", "prod.env", "modules/x.env.local", "modules/deep/.DS_Store", "assets/.gitkeep", "modules/app/boot.js.bak", "modules/app/boot.js.bak-1126",
  "index.html.old", "app.js.orig", "modules/a.js~", "app (1).js", "Modules/Scripts/x.js", "assets/DOCS/x.png", "styles.css.MAP", "Deploy.PS1",
]) assert.equal(forbiddenPaths([p]).length, 1, `refused: ${p}`);
for (const p of ["index.html", "data/beasts.js", "assets/beasts/001.png", "modules/systems/pve_tower.js", "functions/api/auth/delete.js", "functions/api/leaderboard/[board].js", "legal/privacy.html", "site.webmanifest", "functions/api/_auth.js"]) {
  assert.deepEqual(forbiddenPaths([p]), [], `allowed: ${p}`);
}
assert.ok(hasForbiddenText('CLOUDFLARE_API_TOKEN="aaaaaaaaaaaaaaaaaaaaaaaa"') && hasForbiddenText("OPS_ADMIN_KEY=bbbbbbbbbbbbbbbbbbbb"));
assert.ok(hasForbiddenText('{"CLOUDFLARE_API_TOKEN": "aaaaaaaaaaaaaaaaaaaaaaaa"}') && hasForbiddenText("-----BEGIN RSA PRIVATE KEY-----"), "JSON form and private keys");
assert.ok(!hasForbiddenText("const key = env.OPS_ADMIN_KEY;") && !hasForbiddenText("需要 OPS_ADMIN_KEY"));

// 现在的白名单干净
assert.deepEqual(forbiddenPaths([...RELEASE_FILES, ...RELEASE_DIRS]), [], "allow-list holds nothing private");

const tmp = mkdtempSync(join(tmpdir(), "mengling-release-check-"));
try {
  // 白名单被改坏：一个文件都不拷
  for (const [k, extra] of [["files", ".env.local"], ["files", "deploy.ps1"], ["files", "d1_schema.sql"], ["dirs", "scripts"], ["dirs", "docs"], ["dirs", "memory"], ["dirs", "."]]) {
    const opt = { files: RELEASE_FILES, dirs: RELEASE_DIRS };
    opt[k] = [...opt[k], extra];
    const dir = join(tmp, `bad-${extra.replace(/\W/g, "_")}`);
    assert.throws(() => stageRelease(dir, opt), /allow-list must not contain/, `refuses ${extra}`);
    assert.ok(!existsSync(dir), "nothing was copied");
  }
  // 拷完发现：清空并失败
  const poisoned = join(tmp, "poisoned");
  mkdirSync(join(poisoned, "assets"), { recursive: true });
  for (const [name, text] of [["assets/.env.local", "x"], ["assets/run.ps1", "x"], ["assets/leak.js", 'CLOUDFLARE_API_TOKEN="cccccccccccccccccccccccc"']]) {
    writeFileSync(join(poisoned, name), text);
    assert.throws(() => checkStaged(poisoned), /must not contain/, `staged ${name} is caught`);
    rmSync(join(poisoned, name));
  }
  // 没列进禁止名单的也不放行：只认允许的扩展名
  mkdirSync(join(poisoned, "assets", "deep", "er"), { recursive: true });
  for (const name of ["assets/deep/er/users.csv", "assets/deep/dump.sqlite", "assets/notes.txt", "assets/id_rsa", "assets/data.json"]) {
    writeFileSync(join(poisoned, name), "x");
    assert.throws(() => checkStaged(poisoned), /must not contain/, `staged ${name} is caught`);
    rmSync(join(poisoned, name));
  }
  // 链接一律不放行（目录联接不需要管理员权限，拿它验）
  try {
    symlinkSync(join(root, "docs"), join(poisoned, "assets", "link"), "junction");
    assert.throws(() => checkStaged(poisoned), /symbolic link/, "links are refused, not followed");
    rmSync(join(poisoned, "assets", "link"));
  } catch (e) {
    if (e.code !== "EPERM") throw e; // 这台机器不许建链接
  }
  // 真的拷一次
  const out = join(tmp, "out");
  const files = stageRelease(out);
  assert.deepEqual(forbiddenPaths(files), [], "staged package holds nothing private");
  const has = new Set(files);
  const { core, extra } = await buildLists();
  for (const u of [...core, ...extra]) assert.ok(has.has(u === "./" ? "index.html" : u.slice(2)), `precached ${u} is in the package`);
  assert.ok(has.has("sw.js") && has.has("functions/api/auth/logout-all.js"), "service worker and the new endpoint are in the package");
  assert.throws(() => stageRelease(out), /not empty/, "never mixes with an earlier package");
  assert.throws(() => stageRelease(join(root, "out")), /outside the project/);
  if (process.platform === "win32") assert.throws(() => stageRelease(join(root.toUpperCase(), "out")), /outside the project/, "Windows paths compare without case");
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

// deploy.ps1 只从拷好的目录上传，拷失败就中止
{
  const ps = readFileSync(join(root, "deploy.ps1"), "utf8");
  const at = (s) => ps.indexOf(s);
  assert.ok(at("stage-release.mjs") > 0 && at("stage-release.mjs") < at("Push-Location $stage") && at("Push-Location $stage") < at("pages deploy"), "deploy.ps1 stages, enters the staged folder, then uploads");
  assert.ok(/stage-release\.mjs"? \$stage\r?\nif \(\$LASTEXITCODE -ne 0\)[^\n]*exit 1/.test(ps), "deploy.ps1 stops when staging fails");
}

console.log("release-selfcheck: OK");
