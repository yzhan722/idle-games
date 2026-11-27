import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

/** 只按文本核对：不起 nginx。括号配对、每条指令有分号、缓存头按类别对得上。 */
const raw = readFileSync(path.join(fileURLToPath(new URL("..", import.meta.url)), "frontend", "nginx.conf"), "utf8");
const conf = raw.split(/\r?\n/).map((l) => l.replace(/^\s*#.*$/, "")).join("\n");

function locations(): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of conf.matchAll(/^\s*location\s+(.+?)\s*\{\n([^}]*)\}/gm)) out.set(m[1], m[2]);
  return out;
}
const SECURITY = ["X-Frame-Options", "X-Content-Type-Options", "X-XSS-Protection", "Referrer-Policy"];

describe("nginx.conf", () => {
  it("括号配对，每行是指令、开块或收块", () => {
    let depth = 0;
    for (const line of conf.split("\n").map((l) => l.trim()).filter(Boolean)) {
      assert.ok(/[;{}]$/.test(line), `缺分号：${line}`);
      if (line.endsWith("{")) depth += 1;
      if (line === "}") depth -= 1;
      assert.ok(depth >= 0);
    }
    assert.equal(depth, 0);
  });

  it("带散列的文件缓存一年且缺了就是 404；同名图标只缓存一天；首页每次确认；接口不缓存", () => {
    const all = locations();
    assert.ok(all.get("^~ /assets/")!.includes('Cache-Control "public, max-age=31536000, immutable";'));
    assert.ok(all.get("^~ /assets/")!.includes("try_files $uri =404;"), "旧代码块不能拿首页顶替");
    const named = [...all].find(([k]) => k.startsWith("~*"))!;
    assert.equal(/immutable|31536000|expires 1y/.test(named[1]), false);
    assert.ok(all.get("= /index.html")!.includes('Cache-Control "no-cache" always;'));
    assert.ok(all.get("^~ /api/")!.includes('Cache-Control "no-store" always;'));
    assert.ok(all.get("^~ /api/")!.includes("proxy_pass http://backend:3001/;"));
    assert.ok(all.get("/ws")!.includes('proxy_set_header Connection "upgrade";'));
    assert.ok(all.get("/")!.includes("/index.html;"));
  });

  it("自己写了 add_header 的块会丢掉外层的安全头，要各自补齐", () => {
    for (const [name, body] of locations()) {
      if (!body.includes("add_header")) continue;
      for (const header of SECURITY) assert.ok(new RegExp(`add_header ${header} "[^"]+" always;`).test(body), `${name} 缺 ${header}`);
    }
  });
});
