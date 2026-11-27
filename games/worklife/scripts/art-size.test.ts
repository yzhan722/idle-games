import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { SHIPPED_PX, T1_ASSET_CONTRACT, shippedMinPx } from "../frontend/src/assets/t1/contract";
import { profileForKey } from "../frontend/src/assets/t1/runtime";
import { rasterDamage, rasterSize } from "./art-image-meta";

const root = fileURLToPath(new URL("..", import.meta.url));
const assets = path.join(root, "frontend", "src", "assets");
const read = (p: string) => readFileSync(path.join(root, p), "utf8");
function images(dir: string): Array<{ key: string; bytes: number; file: string }> {
  const out: Array<{ key: string; bytes: number; file: string }> = [];
  for (const folder of readdirSync(dir)) {
    const sub = path.join(dir, folder);
    if (!statSync(sub).isDirectory()) continue;
    for (const name of readdirSync(sub)) {
      if (name.endsWith(".webp")) out.push({ key: `${folder}/${name.slice(0, -5)}`, bytes: statSync(path.join(sub, name)).size, file: path.join(sub, name) });
    }
  }
  return out;
}
const full = images(path.join(assets, "t1"));
const small = images(path.join(assets, "t1_small"));
const HOW = "新图先用 scripts/art-resize.py 从原图缩（见 docs/PERF.md）";

describe("图片体积（WL-COM5）", () => {
  it("发布尺寸：合同里的数与 art-resize.py 一致，合同要求的下限都满足", () => {
    const py = read("scripts/art-resize.py");
    for (const [folder, px] of Object.entries(SHIPPED_PX)) assert.ok(py.includes(`"${folder}": (${px}, `), `${folder} ${px}`);
    for (const spec of T1_ASSET_CONTRACT) {
      const file = path.join(assets, "t1", `${spec.key}.webp`);
      if (!existsSync(file)) continue;
      const size = rasterSize(readFileSync(file), "webp")!;
      assert.ok(Math.max(size.width, size.height) >= shippedMinPx(spec), `${spec.key} ${size.width}x${size.height} < ${shippedMinPx(spec)}`);
    }
  });

  it("界面图标每张不超过 60 KB，列表小图不超过 40 KB，整套不超过 40 MB", () => {
    for (const i of full) if (i.key.startsWith("ui/")) assert.ok(i.bytes <= 60 * 1024, `${i.key} ${i.bytes}：${HOW}`);
    for (const i of small) assert.ok(i.bytes <= 40 * 1024, `${i.key} ${i.bytes}`);
    const total = full.reduce((n, i) => n + i.bytes, 0);
    assert.ok(total <= 40 * 1024 * 1024, `整套 ${(total / 1024 / 1024).toFixed(1)} MB：${HOW}`);
  });

  it("列表小图：树、物品、职业形象 216，头像 160，导航图标 96，每张都有、没有多余的；小图不内联进首屏脚本", () => {
    const want = full.map((i) => i.key).filter((k) => /^(trees|equipment|consumables|materials|character|ui)\//.test(k)).sort();
    assert.deepEqual(small.map((i) => i.key).sort(), want, `缺了就跑：python scripts/art-resize.py <原图目录> frontend/src/assets/t1_small --small`);
    for (const i of small) {
      const size = rasterSize(readFileSync(i.file), "webp")!;
      assert.equal(Math.max(size.width, size.height), i.key.startsWith("ui/avatar_") ? 160 : i.key.startsWith("ui/") ? 96 : 216, i.key);
    }
    assert.ok(/SMALL_PX = 216[\s\S]*SMALL_UI = \(96, 32\)[\s\S]*SMALL_AVATAR = \(160, 60\)/.test(read("scripts/art-resize.py")));
    assert.ok(/assetsInlineLimit: \(file\) => \(\/.*t1_small.*\/\.test\(file\) \? false : undefined\)/.test(read("frontend/vite.config.ts")));
  });

  it("每张图都完整、是正方形；小图与大图长宽比一致", () => {
    const sizes = new Map<string, number>();
    for (const i of [...full, ...small]) {
      const buf = readFileSync(i.file);
      assert.equal(rasterDamage(buf, "webp"), undefined, i.file);
      const { width, height } = rasterSize(buf, "webp")!;
      assert.equal(width, height, i.file);
      if (full.includes(i)) sizes.set(i.key, width);
      else assert.ok(width <= sizes.get(i.key)!, `${i.key} 小图比大图还大`);
    }
    const verify = read("scripts/verify-art.ts");
    assert.ok(verify.includes("rasterDamage(buf, f.ext)"));
    assert.ok(verify.includes("Math.min(size.width, size.height) < shippedMinPx(spec)"), "按短边查，细长条不能混过去");
  });

  it("小图只用在小格子里：物品图标一律小图，详情大图与怪物、角色仍用原来的", () => {
    const art = read("frontend/src/components/T1Art.tsx");
    assert.ok(/<T1Art kind="item"[^>]*\ssmall\s/.test(art));
    assert.ok(/<T1Art kind="tree"[^>]*\ssmall\s/.test(read("frontend/src/components/SkillActionList.tsx")));
    const modals = read("frontend/src/components/GameModals.tsx");
    for (const line of modals.split("\n").filter((l) => /<T1Art kind="(tree|craft|monster|character)"/.test(l))) assert.equal(/\ssmall\s/.test(line), false, line.trim());
  });

  it("网页脚本里不带美术合同：显示方式按目录算，与合同逐条一致", () => {
    for (const spec of T1_ASSET_CONTRACT) assert.equal(profileForKey(spec.key), spec.profile, spec.key);
    for (const f of ["manifest", "resolve", "runtime"]) assert.equal(/from "\.\/(contract|keys)"/.test(read(`frontend/src/assets/t1/${f}.ts`)), false, f);
  });

  it("登录页不带整份美术清单：登录页和提示条不引用 T1Art", () => {
    for (const f of ["App", "components/LoginScreen", "components/Toast", "components/UiArt", "components/LegalPage", "components/lazyPanel", "components/advancement/PanelModal"]) {
      const src = read(`frontend/src/${f}.tsx`);
      assert.equal(/from ['"][./\w]*\/(T1Art|assets\/t1\/(manifest|contract|keys))['"]/.test(src), false, f);
    }
  });
});
