#!/usr/bin/env node
/**
 * ML-14 视觉自审 + UI 交互验证（梦境绘本馆 / 溪畔钓鱼会 / 统一忙碌排除）。
 * 用法：node scripts/ml14-screens.mjs
 *   ML14_SHOT_DIR=<目录>  截图与 report.json 输出目录（默认 <系统临时目录>/mengling-ml14）
 * 每个视口（1440×900、390×844）加载同一份构造存档，截图功能页两大新板块、两个选人弹窗、训练 / 远征选人弹窗、
 * 三系锦标殿战队与伙伴页，并检查：横向溢出、板块内子元素越界、按钮遮挡、滚动漂移、控制台报错、
 * 以及外出伙伴（入梦 / 垂钓 / 泡汤）不会出现在训练、远征、入梦、垂钓候选里，锦标赛里显示「本场不参赛」。
 * 浏览器与静态服务器在 finally 中关闭；任何检查失败时退出码为 1。
 */
import { createRequire } from "node:module";
import http from "node:http";
import os from "node:os";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.resolve(process.env.ML14_SHOT_DIR || path.join(os.tmpdir(), "mengling-ml14"));
const require = createRequire(import.meta.url);

let playwright;
try {
  playwright = require("playwright");
} catch {
  console.log("ml14-screens: SKIP (playwright not installed)");
  process.exit(0);
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

function startServer() {
  const server = http.createServer((req, res) => {
    let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    if (urlPath === "/") urlPath = "/index.html";
    const file = path.normalize(path.join(root, urlPath.replace(/^\//, "")));
    if (!file.startsWith(path.normalize(root)) || !existsSync(file)) {
      res.writeHead(404);
      res.end("not found");
      return;
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream" });
    res.end(readFileSync(file));
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve({ server, base: `http://127.0.0.1:${server.address().port}` }));
  });
}

const mon = (id, dex, name, types, lvl, extra = {}) => ({
  id,
  dex,
  pid: `p${String(dex).padStart(3, "0")}`,
  name,
  lvl,
  stars: 2,
  types,
  affection: 40,
  baseStats: { hp: 80, atk: 80, def: 80, spa: 90, spd: 80, spe: 85 },
  iv: { hp: 12, atk: 12, def: 12, spa: 14, spd: 12, spe: 13 },
  ...extra,
});

// Away partners: 1~2 dreaming, 4~5 fishing, 3 + 6 soaking in the ML-13 hot spring. 7~10 stay home.
const AWAY_IDS = [1, 2, 3, 4, 5, 6];
const SAVE = {
  version: 3,
  unlocks: { pokeball: true },
  dex: { caught: { p001: 1, p003: 1, p004: 1, p006: 1, p007: 1, p009: 1, p017: 1, p025: 1, p036: 1, p076: 1, p094: 1 } },
  tech: { pokeballBasic: true, trainingBasic: true, expeditionBasic: true },
  buildings: { trainingGround: { owned: 2 }, breedingHouse: { owned: 1 }, expeditionPost: { owned: 1 } },
  res: {
    pokeball: { value: 5, cap: 50 },
    catnip: { value: 180, cap: 200 },
    wood: { value: 110, cap: 120 },
    minerals: { value: 80, cap: 90 },
    futurecoin: { value: 260, cap: 99999 },
  },
  mons: {
    nextId: 11,
    list: [
      mon(1, 6, "炽翼炎龙", ["fire", "wind"], 82, { affection: 88 }),
      mon(2, 9, "沧澜重龟", ["water"], 80, { affection: 64 }),
      mon(3, 3, "花蓬蓬", ["grass", "wind"], 80, { affection: 52 }),
      mon(4, 25, "雷光鼠", ["electric", "light"], 80),
      mon(5, 76, "镇岳巨岩尊", ["stone"], 66),
      mon(6, 94, "噬影夜魔王", ["dark"], 62),
      mon(7, 36, "月华星后", ["light"], 58),
      mon(8, 17, "疾风灵隼", ["wind"], 55),
      mon(9, 4, "炽尾幼麟", ["fire"], 50),
      mon(10, 7, "沧澜幼龟", ["water"], 45),
    ],
  },
  expedition: { selectedIds: [2, 7, 8] },
  pve: { ecoTriHall: { squadIds: [1, 4, 7] } },
  meta: {
    dreamLibrary: {
      dreamerIds: [1, 2],
      bookId: "honeyForest",
      books: { volcano: { written: 0, ink: 0, editions: 1 }, honeyForest: { written: 2, ink: 250, editions: 0 } },
      pages: {
        "volcano:0": "炽翼炎龙、镇岳巨岩尊",
        "volcano:1": "炽翼炎龙、镇岳巨岩尊",
        "volcano:2": "炽翼炎龙、噬影夜魔王",
        "volcano:3": "炽翼炎龙、镇岳巨岩尊、花蓬蓬",
        "honeyForest:0": "沧澜重龟、花蓬蓬、炽翼炎龙",
        "honeyForest:1": "沧澜重龟、花蓬蓬、炽翼炎龙",
      },
      totalChapters: 6,
      lastChapter: { bookId: "honeyForest", chapterIdx: 1, authors: "沧澜重龟、花蓬蓬、炽翼炎龙", newPage: true, at: 0 },
      recentLogs: ["【写成新章】《蜜露森林茶话会》第 2 章「借一点溪水」 · 收进一张绘本插页（执笔：沧澜重龟、花蓬蓬、炽翼炎龙）", "【新绘本上架】集齐 6 张插页，《风铃与雷云的约定》可以开始写了"],
    },
    fishingClub: {
      anglerIds: [4, 5],
      castCarrySec: 420,
      creel: [
        { fishId: "pebbleGoby", size: 9.4, monId: 5 },
        { fishId: "sparkLoach", size: 15.2, monId: 4 },
        { fishId: "armorSturgeon", size: 61.5, monId: 5 },
        { fishId: "glowLantern", size: 11.0, monId: 4 },
        { fishId: "willowMinnow", size: 8.1, monId: 4 },
      ],
      dex: {
        willowMinnow: { count: 6, best: 13.2 },
        mossDace: { count: 3, best: 19.4 },
        pebbleGoby: { count: 5, best: 11.7 },
        sparkLoach: { count: 4, best: 17.1 },
        armorSturgeon: { count: 1, best: 61.5 },
        thunderScale: { count: 1, best: 88.3 },
        glowLantern: { count: 2, best: 13.9 },
      },
      totalCaught: 37,
      totalLegend: 1,
      lastHaul: { count: 12, rewards: { catnip: 360, futurecoin: 19, minerals: 60, shinyStarSand: 1 }, bestFishId: "thunderScale", bestSize: 88.3, at: 0 },
      recentLogs: ["【收鱼篓】12 条鱼换来 灵果 +360、未来币 +19、灵晶碎片 +60、闪光祈愿星砂 +1 · 今篓最佳「雷鸣金鳞王」88.3 cm", "【钓鱼会奖杯】图鉴登记 4 种，奖杯升为「铜鱼杯」"],
    },
    hotSpring: { pools: { emberRock: { seatIds: [6] }, herbBamboo: { seatIds: [3] } }, totalRounds: 2 },
  },
};

const VIEWPORTS = [
  { tag: "1440x900", width: 1440, height: 900 },
  { tag: "390x844", width: 390, height: 844 },
];

const report = { outDir, viewports: {}, failures: [] };
const fail = (vp, msg) => {
  report.failures.push(`[${vp}] ${msg}`);
  console.error(`ml14-screens: FAIL [${vp}] ${msg}`);
};

mkdirSync(outDir, { recursive: true });
const { server, base } = await startServer();
const { chromium } = playwright;
let browser = null;
try {
  browser = await chromium.launch({ headless: true });
  for (const vp of VIEWPORTS) {
    const vr = { shots: [], consoleErrors: [], overflow: {}, occluded: [], scrollDrift: null };
    report.viewports[vp.tag] = vr;
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1 });
    // External fonts are irrelevant for the self-review and may be offline: keep the test local.
    await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.abort());
    const page = await context.newPage();
    page.on("pageerror", (err) => vr.consoleErrors.push(`pageerror: ${err.message}`));
    page.on("console", (msg) => {
      if (msg.type() !== "error") return;
      const url = msg.location()?.url || "";
      if (/Failed to load resource/.test(msg.text()) && !url.startsWith(base)) return;
      vr.consoleErrors.push(msg.text());
    });
    const shot = async (name, target = null) => {
      const file = path.join(outDir, `${vp.tag}-${name}.png`);
      if (target) await target.screenshot({ path: file });
      else await page.screenshot({ path: file });
      vr.shots.push(file);
    };
    const settle = () => page.waitForTimeout(250);
    const gotoTab = async (tab) => {
      const direct = page.locator(`#tab-${tab}`);
      if (await direct.isVisible().catch(() => false)) await direct.click({ timeout: 10000 });
      else {
        await page.locator('[data-tab-more="1"]').click({ timeout: 10000 });
        await page.locator(`[data-more-tab="${tab}"]`).click({ timeout: 10000 });
      }
      await page.waitForFunction((t) => document.getElementById(`panel-${t}`)?.classList.contains("is-active"), tab, { timeout: 15000 });
      await settle();
    };
    // The page scrolls the window on desktop but an inner container on phones: always scroll the nearest scrollable ancestor,
    // and park the target just below the sticky top bar / tab strip.
    const SCROLLER_JS = `(el) => {
      let p = el.parentElement;
      while (p && p !== document.body && p !== document.documentElement) {
        const cs = getComputedStyle(p);
        if (/(auto|scroll)/.test(cs.overflowY) && p.scrollHeight > p.clientHeight + 1) return p;
        p = p.parentElement;
      }
      return document.scrollingElement || document.documentElement;
    }`;
    const stickyBottom = () =>
      page.evaluate(() => {
        let bottom = 0;
        for (const el of document.querySelectorAll("body *")) {
          const cs = getComputedStyle(el);
          if (cs.position !== "fixed" && cs.position !== "sticky") continue;
          const r = el.getBoundingClientRect();
          if (r.top < window.innerHeight * 0.3 && r.height > 0 && r.bottom < window.innerHeight * 0.4 && r.width > window.innerWidth * 0.6) bottom = Math.max(bottom, r.bottom);
        }
        return Math.round(bottom);
      });
    const scrollToSel = async (sel) => {
      const top = (await stickyBottom()) + 12;
      await page.evaluate(
        ([s, t, js]) => {
          const el = document.querySelector(s);
          if (!el) return;
          const sc = eval(js)(el);
          sc.scrollTop += el.getBoundingClientRect().top - t;
          // Nudge until the section's top edge is really visible (not under a sticky bar).
          for (let i = 0; i < 30; i += 1) {
            const r = el.getBoundingClientRect();
            const hit = document.elementFromPoint(r.left + Math.min(40, r.width / 2), r.top + 4);
            if (hit && (hit === el || el.contains(hit))) break;
            const before = sc.scrollTop;
            sc.scrollTop -= 12;
            if (sc.scrollTop === before) break;
          }
        },
        [sel, top, SCROLLER_JS],
      );
      await settle();
    };
    const scrollPos = (sel) =>
      page.evaluate(([s, js]) => {
        const el = document.querySelector(s);
        return el ? eval(js)(el).scrollTop : 0;
      }, [sel, SCROLLER_JS]);
    /** Tall sections: consecutive viewport shots from the section top until its bottom is on screen (works with inner scrollers). */
    const shotSection = async (name, sel) => {
      await scrollToSel(sel);
      const top = await stickyBottom();
      for (let part = 1; part <= 8; part += 1) {
        await shot(`${name}-${part}`);
        const done = await page.evaluate(([s, js, t]) => {
          const el = document.querySelector(s);
          const r = el.getBoundingClientRect();
          if (r.bottom <= window.innerHeight + 1) return true;
          const sc = eval(js)(el);
          const before = sc.scrollTop;
          sc.scrollTop += window.innerHeight - t - 48;
          return sc.scrollTop === before;
        }, [sel, SCROLLER_JS, top]);
        await settle();
        if (done) break;
      }
    };
    const checkContained = async (label, sels) => {
      const res = await page.evaluate((list) => {
        const out = [];
        for (const sel of list) {
          for (const rootEl of document.querySelectorAll(sel)) {
            const r = rootEl.getBoundingClientRect();
            if (!r.width) continue;
            for (const el of rootEl.querySelectorAll("*")) {
              const e = el.getBoundingClientRect();
              if (!e.width || !e.height) continue;
              const cs = getComputedStyle(el);
              if (cs.position === "fixed" || cs.visibility === "hidden") continue;
              if (e.right > r.right + 1 || e.left < r.left - 1) {
                out.push(`${sel} > ${el.tagName.toLowerCase()}.${String(el.className || "").split(" ")[0]} (${Math.round(e.left)}→${Math.round(e.right)} vs ${Math.round(r.left)}→${Math.round(r.right)})`);
              }
            }
          }
        }
        return out.slice(0, 12);
      }, sels);
      vr.overflow[label] = res;
      if (res.length) fail(vp.tag, `${label}: ${res.length} element(s) overflow their section: ${res.join(" | ")}`);
    };
    const checkPageOverflow = async (label) => {
      const px = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      vr.overflow[`${label}:page`] = px;
      if (px > 0) fail(vp.tag, `${label}: horizontal page overflow ${px}px`);
    };
    const checkNotOccluded = async (sel) => {
      const btns = await page.locator(sel).all();
      for (const b of btns) {
        if (!(await b.isVisible().catch(() => false))) continue;
        await b.scrollIntoViewIfNeeded().catch(() => {});
        const ok = await b.evaluate((el) => {
          const r = el.getBoundingClientRect();
          const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          return Boolean(hit && (hit === el || el.contains(hit)));
        });
        if (!ok) {
          const txt = (await b.innerText().catch(() => "")).trim();
          vr.occluded.push(`${sel} "${txt}"`);
          fail(vp.tag, `button is covered: ${sel} "${txt}"`);
        }
      }
    };
    const modalIds = (attr) =>
      page.evaluate((a) => [...document.querySelectorAll(`[${a}]`)].map((el) => Number(el.getAttribute(a))), attr);

    // ---- load the crafted save ----
    await page.goto(`${base}/index.html`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.evaluate((save) => localStorage.setItem("mengling_idle_save_v1", JSON.stringify(save)), SAVE);
    await page.reload({ waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForSelector('#tab-functions[data-unlocked="1"]', { timeout: 20000 });
    await gotoTab("functions");
    await page.waitForSelector(".dream-header", { timeout: 15000 });
    await page.waitForSelector(".fish-header", { timeout: 15000 });
    await page.waitForFunction(() => [...document.querySelectorAll(".dream-header img, .fish-header img")].every((img) => img.complete && img.naturalWidth > 0), null, { timeout: 15000 });

    // ---- Dream Library ----
    await scrollToSel(".dream-header");
    await shot("01-dream-library");
    await shotSection("02-dream-body", ".dream-body");
    const dreamTxt = await page.locator(".dream-body").innerText();
    for (const want of ["《蜜露森林茶话会》", "正在写第 3 章", "绘本书架", "借一点溪水", "执笔："]) {
      if (!dreamTxt.includes(want)) fail(vp.tag, `dream body misses "${want}"`);
    }
    const writers = await modalIds("data-dream-writer");
    if (writers.join() !== "1,2") fail(vp.tag, `dream pillows show ${writers.join()} (want 1,2)`);

    // ---- Fishing Club ----
    await scrollToSel(".fish-header");
    await shot("03-fishing-club");
    await shotSection("04-fish-body", ".fish-body");
    const fishTxt = await page.locator(".fish-body").innerText();
    for (const want of ["当前开放溪段", "钓获图鉴与钓鱼会奖杯", "铜鱼杯", "雷鸣金鳞王", "上次收鱼篓"]) {
      if (!fishTxt.includes(want)) fail(vp.tag, `fishing body misses "${want}"`);
    }
    const anglersShown = await modalIds("data-fish-angler");
    if (anglersShown.join() !== "4,5") fail(vp.tag, `fishing spots show ${anglersShown.join()} (want 4,5)`);

    await checkPageOverflow("functions");
    await checkContained("functions", [".dream-header", ".dream-body", ".fish-header", ".fish-body"]);
    await checkNotOccluded(".dream-header__btns .btn, .fish-header__btns .btn, .dream-pillow .btn, .fish-spot .btn, .dream-book__foot .btn");

    // Scroll drift across live ticks (ink bar / cast bar patching)
    await scrollToSel(".dream-body");
    const y0 = await scrollPos(".dream-body");
    await page.waitForTimeout(1500);
    const y1 = await scrollPos(".dream-body");
    vr.scrollDrift = y1 - y0;
    if (Math.abs(y1 - y0) > 1) fail(vp.tag, `scroll drift ${y0} -> ${y1}`);

    // ---- pickers: dream / fish modals list only partners at home ----
    await scrollToSel(".dream-body");
    await page.locator("button[data-dream-open]").first().click({ timeout: 10000 });
    await page.waitForSelector('[data-dream-modal-overlay="1"]', { timeout: 10000 });
    await settle();
    await shot("05-dream-modal");
    const dreamPick = await modalIds("data-dream-modal-pick");
    if (!dreamPick.length || dreamPick.some((id) => AWAY_IDS.includes(id))) fail(vp.tag, `dream picker lists ${dreamPick.join()} (away partners must be hidden)`);
    await checkContained("dream-modal", ['[data-dream-modal-overlay="1"] .modal']);
    await page.locator("button[data-dream-modal-close]").first().click({ timeout: 10000 });

    await scrollToSel(".fish-body");
    await page.locator("button[data-fish-open]").first().click({ timeout: 10000 });
    await page.waitForSelector('[data-fish-modal-overlay="1"]', { timeout: 10000 });
    await settle();
    await shot("06-fish-modal");
    const fishPick = await modalIds("data-fish-modal-pick");
    if (!fishPick.length || fishPick.some((id) => AWAY_IDS.includes(id))) fail(vp.tag, `angler picker lists ${fishPick.join()} (away partners must be hidden)`);
    await checkContained("fish-modal", ['[data-fish-modal-overlay="1"] .modal']);
    await page.locator("button[data-fish-modal-close]").first().click({ timeout: 10000 });

    // ---- unified exclusion: training picker ----
    await scrollToSel("button[data-train-open]");
    await page.locator("button[data-train-open]").first().click({ timeout: 10000 });
    await page.waitForSelector('[data-train-modal-overlay="1"]', { timeout: 10000 });
    await settle();
    await shot("07-training-modal");
    const trainIds = await modalIds("data-train-modal-check");
    const trainDesc = await page.locator('[data-train-modal-overlay="1"] .modal__desc').innerText();
    if (!trainIds.length || trainIds.some((id) => AWAY_IDS.includes(id))) fail(vp.tag, `training picker lists away partners (${trainIds.join()})`);
    if (!trainDesc.includes("已过滤 6 只外出中的伙伴")) fail(vp.tag, `training picker hint missing the away count: ${trainDesc}`);
    await page.locator("button[data-train-modal-close]").first().click({ timeout: 10000 });

    // ---- unified exclusion: expedition picker (+ persisted team sanitized, 一键选择) ----
    await scrollToSel("button[data-exp-team-open]");
    await page.locator("button[data-exp-team-open]").first().click({ timeout: 10000 });
    await page.waitForSelector('[data-exp-team-overlay="1"]', { timeout: 10000 });
    await settle();
    const expIds = await modalIds("data-exp-team-check");
    const expChecked = await page.evaluate(() => [...document.querySelectorAll("[data-exp-team-check]:checked")].map((el) => Number(el.getAttribute("data-exp-team-check"))));
    if (!expIds.length || expIds.some((id) => AWAY_IDS.includes(id))) fail(vp.tag, `expedition picker lists away partners (${expIds.join()})`);
    if (expChecked.slice().sort().join() !== "7,8") fail(vp.tag, `persisted expedition team should drop the dreaming #2 (checked ${expChecked.join()})`);
    await page.locator("button[data-exp-team-auto]").first().click({ timeout: 10000 });
    await settle();
    const expAuto = await page.evaluate(() => [...document.querySelectorAll("[data-exp-team-check]:checked")].map((el) => Number(el.getAttribute("data-exp-team-check"))));
    if (!expAuto.length || expAuto.some((id) => AWAY_IDS.includes(id))) fail(vp.tag, `expedition 一键选择 picked away partners (${expAuto.join()})`);
    await shot("08-expedition-modal");
    await page.locator("button[data-exp-team-close]").first().click({ timeout: 10000 });

    // ---- unified exclusion: tri-element championship squad ----
    await gotoTab("pve");
    const triBench = page.locator(".tri-squad-bench").first();
    await triBench.waitFor({ timeout: 10000 });
    await scrollToSel(".tri-squad-bench");
    await shot("09-pve-tri-bench");
    const benchTxt = await triBench.innerText();
    if (!benchTxt.includes("入梦中 · 本场不参赛") || !benchTxt.includes("垂钓中 · 本场不参赛")) fail(vp.tag, `tri bench does not bench the dreamer / angler: ${benchTxt.replace(/\s+/g, " ").slice(0, 160)}`);
    await checkPageOverflow("pve");

    // ---- Mons tab: release locks read the unified registry ----
    await gotoTab("mons");
    const locks = await page.evaluate((ids) => ids.map((id) => {
      const b = document.querySelector(`button[data-mon-release="${id}"]`);
      return b ? { id, disabled: b.disabled, title: b.getAttribute("title") || "" } : { id, missing: true };
    }), AWAY_IDS);
    const wantWord = { 1: "绘本馆", 2: "绘本馆", 3: "温泉", 4: "钓鱼会", 5: "钓鱼会", 6: "温泉" };
    for (const l of locks) {
      if (l.missing) continue;
      if (!l.disabled || !l.title.includes(wantWord[l.id])) fail(vp.tag, `release button of #${l.id} not locked (${l.title})`);
    }
    vr.releaseLocks = locks;
    if (await page.locator('button[data-mon-release="1"]').count()) {
      await page.evaluate(() => {
        const b = document.querySelector('button[data-mon-release="1"]');
        b?.closest(".row, .mon-card, [data-mon-open]")?.setAttribute("data-ml14-shot", "1");
      });
      if (await page.locator('[data-ml14-shot="1"]').count()) await scrollToSel('[data-ml14-shot="1"]');
    }
    await shot("10-mons-locks");
    await checkPageOverflow("mons");

    if (vr.consoleErrors.length) fail(vp.tag, `console errors: ${vr.consoleErrors.join(" | ")}`);
    await context.close();
  }
} catch (err) {
  report.failures.push(`exception: ${err?.stack || err}`);
  console.error("ml14-screens: FAIL exception", err);
} finally {
  if (browser) await browser.close().catch(() => {});
  await new Promise((resolve) => server.close(() => resolve()));
  writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));
}

const shots = Object.values(report.viewports).reduce((n, v) => n + v.shots.length, 0);
if (report.failures.length) {
  console.error(`ml14-screens: ${report.failures.length} failure(s); ${shots} screenshot(s) in ${outDir}`);
  process.exitCode = 1;
} else {
  console.log(`ml14-screens: OK — ${shots} screenshots, 0 overflow / occlusion / console errors → ${outDir}`);
}
