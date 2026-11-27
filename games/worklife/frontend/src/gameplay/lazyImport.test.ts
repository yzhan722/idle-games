import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { ADVANCEMENT_PANEL_FILES } from "./advancementSource";
import {
  ChunkLoadError,
  RELOAD_GUARD_MS,
  entryScript,
  failedModuleUrl,
  importWithRetry,
  isNewRelease,
  mayReload,
  reloadIfNewRelease,
  retryUrl,
  type ImportTools,
  type ReleaseTools,
} from "../utils/lazyImport";

const src = (p: string) => readFileSync(path.join(fileURLToPath(new URL("..", import.meta.url)), p), "utf8");
const CHROME = new TypeError("Failed to fetch dynamically imported module: https://worklife.example/assets/ReputationPanel-Ab12_-x.js");
const FIREFOX = new TypeError("error loading dynamically imported module: https://worklife.example/assets/ReputationPanel-Ab12_-x.js");
const SAFARI = new TypeError("Importing a module script failed.");

function tools(importUrl: ImportTools["importUrl"] = async () => { throw CHROME; }) {
  const waits: number[] = [];
  const urls: string[] = [];
  const css: string[] = [];
  return {
    waits,
    urls,
    css,
    tools: {
      sleep: async (ms: number) => { waits.push(ms); },
      importUrl: async (url: string) => { urls.push(url); return importUrl(url); },
      loadCss: async (url: string) => { css.push(url); },
    } as ImportTools,
  };
}

describe("按需加载：失败重试", () => {
  it("从报错里认出没取到的地址；Safari 不写地址；别的站的、不是脚本的不认", () => {
    assert.equal(failedModuleUrl(CHROME), "https://worklife.example/assets/ReputationPanel-Ab12_-x.js");
    assert.equal(failedModuleUrl(FIREFOX), "https://worklife.example/assets/ReputationPanel-Ab12_-x.js");
    assert.equal(failedModuleUrl(SAFARI), null);
    assert.equal(failedModuleUrl(new Error("Unable to preload CSS for /assets/NewGameInterface-x.css")), null);
    assert.equal(failedModuleUrl(undefined), null);
    assert.equal(retryUrl("/assets/a.js", 1), "/assets/a.js?retry=1");
    assert.equal(retryUrl("/assets/a.js?v=2", 2), "/assets/a.js?v=2&retry=2");
  });

  it("一次就成：不等、不重试", async () => {
    const t = tools();
    assert.equal(await importWithRetry(async () => 7, (m) => m as number, t.tools), 7);
    assert.deepEqual([t.waits, t.urls], [[], []]);
  });

  it("失败会被浏览器记住：换带 retry 的地址重取，用取到的模块", async () => {
    let n = 0;
    const t = tools(async () => {
      n += 1;
      if (n === 1) throw new TypeError("Failed to fetch dynamically imported module: https://worklife.example/assets/ReputationPanel-Ab12_-x.js?retry=1");
      return { Panel: "ok" };
    });
    let loads = 0;
    const got = await importWithRetry(async () => { loads += 1; throw CHROME; }, (m) => (m as { Panel: string }).Panel, t.tools);
    assert.equal(got, "ok");
    assert.equal(loads, 1, "原地址不再试");
    assert.equal(t.urls.length, 2);
    assert.equal(new Set(t.urls).size, 2, "每次的地址都不同");
    for (const url of t.urls) assert.match(url, /^https:\/\/worklife\.example\/assets\/ReputationPanel-Ab12_-x\.js\?retry=\d+$/);
    assert.deepEqual(t.waits, [600, 1800]);
  });

  it("报错里没有地址：用原来的方式再试", async () => {
    let loads = 0;
    const t = tools();
    const got = await importWithRetry(async () => { loads += 1; if (loads < 3) throw SAFARI; return "ok"; }, (m) => m as string, t.tools);
    assert.deepEqual([got, loads, t.urls], ["ok", 3, []]);
  });

  it("样式没下来：补下样式再取脚本；一直补不上就算没加载出来，玩家再点重试还会先补样式", async () => {
    const cssError = new Error("Unable to preload CSS for /assets/NewGameInterface-x1.css");
    let loads = 0;
    const t = tools();
    const got = await importWithRetry(async () => { loads += 1; if (loads === 1) throw cssError; return "ok"; }, (m) => m as string, t.tools);
    assert.deepEqual([got, loads, t.css.length, t.urls], ["ok", 2, 1, []]);
    assert.match(t.css[0], /^\/assets\/NewGameInterface-x1\.css\?retry=\d+$/);

    const bad = tools();
    bad.tools.loadCss = async (url) => { throw new Error(`Unable to preload CSS for ${url}`); };
    let tries = 0;
    await assert.rejects(() => importWithRetry(async () => { tries += 1; throw cssError; }, (m) => m, bad.tools), ChunkLoadError);
    assert.equal(tries, 1, "样式没补上就不取脚本");
    // 玩家点重试：vite 以为样式下过了，直接给脚本；这里仍要先把样式补上
    const again = tools();
    assert.equal(await importWithRetry(async () => "ok", (m) => m as string, again.tools), "ok");
    assert.equal(again.css.length, 1);
    const clean = tools();
    await importWithRetry(async () => "ok", (m) => m as string, clean.tools);
    assert.equal(clean.css.length, 0, "补上之后不再重复下");
  });

  it("三次都不行：抛 ChunkLoadError，带着原来的报错；取到的不是组件也算失败", async () => {
    const t = tools();
    await assert.rejects(() => importWithRetry(async () => { throw CHROME; }, (m) => m, t.tools), (e: unknown) => e instanceof ChunkLoadError && e.cause === CHROME);
    const wrong = tools(async () => ({}));
    await assert.rejects(
      () => importWithRetry(async () => { throw CHROME; }, (m) => { if (!(m as { Panel?: unknown }).Panel) throw new Error("没有"); return 1; }, wrong.tools),
      ChunkLoadError
    );
  });
});

describe("按需加载：新版本发布后的整页刷新", () => {
  const home = (hash: string) => `<!DOCTYPE html><html><head><script type="module" crossorigin src="/assets/index-${hash}.js"></script><link rel="modulepreload" crossorigin href="/assets/react-vendor-x.js"></head></html>`;
  function release(over: Partial<ReleaseTools> = {}) {
    const log: string[] = [];
    let mark: unknown;
    const t: ReleaseTools = {
      currentEntry: () => "/assets/index-old.js",
      fetchHome: async () => home("new"),
      lastReloadAt: () => mark,
      markReload: (now) => { mark = now; log.push("mark"); },
      reload: () => { log.push("reload"); },
      now: () => 1_000_000,
      ...over,
    };
    return { t, log };
  }

  it("认得首页的入口文件；开发模式和别的页面不认", () => {
    assert.equal(entryScript(home("Abc-_9")), "/assets/index-Abc-_9.js");
    assert.equal(entryScript('<script type="module" src="/src/main.tsx"></script>'), null);
    assert.equal(entryScript("<html>502</html>"), null);
  });

  it("入口变了：先记时间再刷新；没变、取不到、不是我们的首页：不刷新", async () => {
    const changed = release();
    assert.equal(await reloadIfNewRelease(changed.t), true);
    assert.deepEqual(changed.log, ["mark", "reload"]);
    for (const over of [
      { fetchHome: async () => home("old") },
      { fetchHome: async () => { throw new Error("offline"); } },
      { fetchHome: async () => "<html>502</html>" },
      { currentEntry: () => null },
    ]) {
      const r = release(over);
      assert.equal(await reloadIfNewRelease(r.t), false);
      assert.deepEqual(r.log, []);
    }
  });

  it("只问有没有新版本：不记时间、不刷新；问不到就当没有", async () => {
    const r = release();
    assert.equal(await isNewRelease(r.t), true);
    assert.deepEqual(r.log, []);
    assert.equal(await isNewRelease(release({ fetchHome: async () => home("old") }).t), false);
    assert.equal(await isNewRelease(release({ fetchHome: async () => { throw new Error("offline"); } }).t), false);
    assert.equal(await isNewRelease(release({ fetchHome: async () => "<html>502</html>" }).t), false);
  });

  it("缓存没更新也不会反复刷：五分钟内只自动刷一次；时钟倒退不卡死", async () => {
    const r = release();
    assert.equal(await reloadIfNewRelease(r.t), true);
    assert.equal(await reloadIfNewRelease(r.t), false);
    assert.deepEqual(r.log, ["mark", "reload"]);
    assert.equal(mayReload(undefined, 1), true);
    assert.equal(mayReload("x", 1), true);
    assert.equal(mayReload(1000, 1000 + RELOAD_GUARD_MS), false);
    assert.equal(mayReload(1000, 1001 + RELOAD_GUARD_MS), true);
    assert.equal(mayReload(5000, 1000), true);
  });
});

describe("按需加载：接线", () => {
  it("十二个面板都走 lazyPanel，主界面没有静态引用；名字与文件里的导出一致", () => {
    const wrap = src("components/AdvancementPanels.tsx");
    const panels = ADVANCEMENT_PANEL_FILES.filter((n) => n.endsWith("Panel"));
    assert.equal(panels.length, 12);
    for (const name of panels) {
      assert.ok(wrap.includes(`'${name}', () => import('./advancement/${name}'))`), name);
      assert.ok(src(`components/advancement/${name}.tsx`).includes(`export function ${name}`), name);
    }
    assert.equal(/^(import|export) (?!type)[^;]*from '\.\/advancement\//m.test(wrap), false);
    const main = src("components/NewGameInterface.tsx");
    assert.equal(/from '\.\/advancement\//.test(main), false);
  });

  it("游戏里的面板不自动整页刷新，只提示；还没进游戏的两屏才自动刷", () => {
    const lazy = src("components/lazyPanel.tsx");
    assert.ok(/if \(this\.props\.autoReload\) void reloadIfNewRelease\(\);/.test(lazy));
    const panel = lazy.slice(lazy.indexOf("export function lazyPanel"));
    assert.ok(panel.includes("autoReload: false"));
    assert.ok(panel.includes("游戏更新了"));
    assert.ok(src("App.tsx").includes("autoReload: true"));
    assert.equal(/replaceState\(null/.test(src("components/LegalPage.tsx")), false, "不能清掉记着刷新时间的 state");
  });

  it("面板与主界面共用的模块单独成块：主界面换地址重试之后，面板不会再去拿原地址的主界面", () => {
    const config = src("../vite.config.ts");
    assert.ok(config.includes("return 'game-shared'"));
    assert.ok(config.includes("manualChunks: (id, { getModuleInfo }) => manualChunk(id, getModuleInfo)"));
    for (const name of ADVANCEMENT_PANEL_FILES) {
      assert.equal(/from '[^']*NewGameInterface'/.test(src(`components/advancement/${name}.tsx`)), false, name);
    }
    // 打包结果的核对在 scripts/first-screen.mjs（要先 build）
    assert.ok(src("../../scripts/first-screen.mjs").includes("面板块引用了主界面块"));
  });

  it("登录页和主界面也有重试；图片长列表带 loading=lazy，且写在 src 前面", () => {
    const app = src("App.tsx");
    assert.ok(/lazyComponent\(\(\) => import\('\.\/components\/LoginScreen'\)/.test(app));
    assert.ok(/lazyComponent\(\(\) => import\('\.\/components\/NewGameInterface'\)/.test(app));
    const art = src("components/T1Art.tsx");
    assert.ok(art.indexOf("loading={props.loading}\n") >= 0 || art.includes("loading={props.loading}\r\n"));
    assert.ok(art.indexOf("loading={props.loading}") < art.indexOf("src={src}"));
    for (const f of ["SkillActionList", "CraftRecipeList", "MarketItemGrid", "InventoryPage"]) assert.ok(src(`components/${f}.tsx`).includes('loading="lazy"'), f);
  });
});
