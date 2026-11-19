#!/usr/bin/env node
/**
 * ML-17 视觉自审 + UI 交互验证（冰晶溜冰场 / 花田蜜蜂工坊 / 接入「一键收取已归来伙伴」）。
 * 用法：node scripts/ml17-screens.mjs
 *   ML17_SHOT_DIR=<目录>  截图与 report.json 输出目录（默认 <系统临时目录>/mengling-ml17）
 * 每个视口（1440×900、390×844）加载同一份构造存档，截图功能页顶部的「外出归来 · 一键收取」面板（演出结束 + 蜂蜜酿好）、
 * 溜冰场与蜜蜂工坊两大新板块、蜂箱选人弹窗、一键收取前后、动作「换人」选人弹窗与按编排开演后的排练状态、伙伴页放生锁与伙伴详情标签、帮助页 ML-17 帮助块，并检查：
 * 横向溢出、板块内子元素越界、按钮遮挡、滚动漂移、控制台报错、复用图标与原图在同一板块 / 弹窗内同时出现，
 * 以及外出伙伴不会出现在任何候选里、一键收取后演出评分与蜂蜜都已领取、仍在外的伙伴继续锁定。
 * 另起一个 1440 视口验证离线 2 小时补算（排练结束待领取、蜂蜜酿好、限时增益到期、外出归来提示）。
 * 浏览器与静态服务器在 finally 中关闭；任何检查失败时退出码为 1。
 */
import { createRequire } from "node:module";
import http from "node:http";
import os from "node:os";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getBeeBloomRotation, BEE_HIVES } from "../modules/systems/pve_tower.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.resolve(process.env.ML17_SHOT_DIR || path.join(os.tmpdir(), "mengling-ml17"));
const require = createRequire(import.meta.url);

let playwright;
try {
  playwright = require("playwright");
} catch {
  console.log("ml17-screens: SKIP (playwright not installed)");
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

/** Reused art (copy → original): a copy must never share a section / modal with its original. */
const REUSED_FROM = {
  iceRink: "workshop",
  skateScore: "showStarTrophy",
  rinkBuff: "shinyCharm",
  beeWorkshop: "field",
  beeHive: "granary",
  honeyJar: "bigBerry",
  hiveBadge: "sanctumBadge",
};

// Away: skaters 2 + 11 + 8 (雪花圆舞曲 finished at 94 = S, score waiting); keeper 5 (向阳蜂箱 tending); keeper 10 (溪畔蜂箱 done). Home: 1, 3, 4, 6, 7, 9, 12.
const bloom = getBeeBloomRotation(Date.now());
const SKATERS = [2, 11, 8];
const TENDING = [5];
const DONE = [10];
const AWAY_IDS = [...SKATERS, ...TENDING, ...DONE];
const SAVE = {
  version: 3,
  unlocks: { pokeball: true },
  dex: { caught: { p001: 1, p003: 1, p004: 1, p006: 1, p007: 1, p009: 1, p017: 1, p025: 1, p036: 1, p076: 1, p094: 1, p150: 1 } },
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
    nextId: 13,
    list: [
      mon(1, 6, "炽翼炎龙", ["fire", "wind"], 82, { affection: 88 }),
      mon(2, 9, "沧澜重龟", ["water"], 80, { affection: 64 }),
      mon(3, 94, "噬影夜魔王", ["dark"], 62),
      mon(4, 25, "雷光鼠", ["electric", "light"], 80),
      mon(5, 17, "疾风灵隼", ["wind"], 55),
      mon(6, 150, "幻梦灵", ["mystic"], 70, { affection: 80 }),
      mon(7, 36, "月华星后", ["light"], 58),
      mon(8, 76, "镇岳巨岩尊", ["stone"], 66),
      mon(9, 4, "炽尾幼麟", ["fire"], 50),
      mon(10, 7, "沧澜幼龟", ["water"], 45),
      mon(11, 3, "花蓬蓬", ["grass", "wind"], 61),
      mon(12, 1, "青萝幼龙", ["grass"], 40),
    ],
  },
  expedition: { selectedIds: [1, 2] },
  meta: {
    iceRink: {
      show: { programId: "snowWaltz", skaterIds: SKATERS, phase: "finished", score: 94, slotScores: [96, 92, 93], startedAt: Date.now() - 2_000_000 },
      buffs: { catch: { add: 0.0125, leftSec: 1500 } },
      best: { snowWaltz: 80, auroraDuet: 71 },
      gradeCounts: { A: 2, B: 2 },
      totalShows: 4,
      lastClaim: { programId: "auroraDuet", score: 71, rewards: { minerals: 30, futurecoin: 5 }, newBest: false, at: 0 },
      recentLogs: ["【演出结束】「雪花圆舞曲」谢幕，评委打出 94 分（S 级），快去领取评分与限时增益"],
    },
    beeWorkshop: {
      hives: [
        { trip: { hiveId: "sunnyHive", keeperIds: TENDING, phase: "tending", elapsedSec: Math.round(BEE_HIVES[0].tendMin * 60 * 0.35), flowerId: bloom.bloomIds[0], departedAt: Date.now() - 600_000 } },
        {
          trip: {
            hiveId: "brookHive",
            keeperIds: DONE,
            phase: "done",
            flowerId: bloom.bloomIds[1],
            haul: [
              { flowerId: bloom.bloomIds[1], monId: 10 },
              { flowerId: bloom.bloomIds[1], monId: 10 },
            ],
            departedAt: Date.now() - 4_000_000,
          },
        },
        { trip: null },
      ],
      codex: { sunflower: { count: 2 }, lotus: { count: 1 }, edelweiss: { count: 1 } },
      totalTrips: 3,
      totalJars: 6,
      lastClaim: { jars: 2, hiveId: "groveHive", flowerId: "edelweiss", rewards: { catnip: 80, wood: 40, futurecoin: 6 }, newHoney: true, at: 0 },
      recentLogs: ["【照料完成】「溪畔蜂箱」的伙伴们酿好了 2 罐蜂蜜，快去收取蜂蜜"],
    },
  },
};

const VIEWPORTS = [
  { tag: "1440x900", width: 1440, height: 900 },
  { tag: "390x844", width: 390, height: 844 },
];

const report = { outDir, bloom: bloom.bloomIds, viewports: {}, failures: [] };
const fail = (vp, msg) => {
  report.failures.push(`[${vp}] ${msg}`);
  console.error(`ml17-screens: FAIL [${vp}] ${msg}`);
};

mkdirSync(outDir, { recursive: true });
const { server, base } = await startServer();
const { chromium } = playwright;
let browser = null;
try {
  browser = await chromium.launch({ headless: true });
  for (const vp of VIEWPORTS) {
    const vr = { shots: [], consoleErrors: [], overflow: {}, occluded: [], iconClash: [], scrollDrift: null };
    report.viewports[vp.tag] = vr;
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1 });
    await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.abort());
    const page = await context.newPage();
    page.on("pageerror", (err) => vr.consoleErrors.push(`pageerror: ${err.message}`));
    page.on("console", (msg) => {
      if (msg.type() !== "error") return;
      const url = msg.location()?.url || "";
      if (/Failed to load resource/.test(msg.text()) && !url.startsWith(base)) return;
      vr.consoleErrors.push(msg.text());
    });
    const shot = async (name) => {
      const file = path.join(outDir, `${vp.tag}-${name}.png`);
      await page.screenshot({ path: file });
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
    const shotSection = async (name, sel) => {
      await scrollToSel(sel);
      const top = await stickyBottom();
      for (let part = 1; part <= 10; part += 1) {
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
    /** Reused icons: inside one section / modal the copy and its original must not both appear. */
    const checkIconReuse = async (label, groups) => {
      const res = await page.evaluate(
        ([gs, pairs]) => {
          const out = [];
          for (const g of gs) {
            const names = new Set();
            for (const sel of g) {
              for (const el of document.querySelectorAll(sel)) {
                for (const img of el.querySelectorAll("img")) {
                  const m = /ui_icons\/([A-Za-z0-9_]+)\.webp/.exec(img.getAttribute("src") || "");
                  if (m) names.add(m[1]);
                }
              }
            }
            for (const [copy, orig] of Object.entries(pairs)) if (names.has(copy) && names.has(orig)) out.push(`${g.join("+")}: ${copy} with ${orig}`);
          }
          return out;
        },
        [groups, REUSED_FROM],
      );
      vr.iconClash.push(...res.map((r) => `${label}: ${r}`));
      if (res.length) fail(vp.tag, `${label}: reused icon shown next to its original — ${res.join(" | ")}`);
    };
    const attrIds = (attr, scope = "") =>
      page.evaluate(([a, sc]) => [...document.querySelectorAll(`${sc} [${a}]`.trim())].map((el) => Number(el.getAttribute(a))), [attr, scope]);
    const textOf = (sel) => page.evaluate((s) => document.querySelector(s)?.innerText || "", sel);
    const beePhases = () => page.evaluate(() => [...document.querySelectorAll("[data-bee-phase]")].map((el) => el.getAttribute("data-bee-phase")).join());
    const rinkPhase = () => page.evaluate(() => document.querySelector("[data-rink-phase]")?.getAttribute("data-rink-phase") || "");

    // ---- load the crafted save ----
    await page.goto(`${base}/index.html`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.evaluate((save) => localStorage.setItem("mengling_idle_save_v1", JSON.stringify(save)), SAVE);
    await page.reload({ waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForSelector('#tab-functions[data-unlocked="1"]', { timeout: 20000 });
    await gotoTab("functions");
    await page.waitForSelector(".away-return", { timeout: 15000 });
    await page.waitForSelector(".rink-header", { timeout: 15000 });
    await page.waitForSelector(".bee-header", { timeout: 15000 });
    await page.waitForFunction(
      () => [...document.querySelectorAll(".away-return img, .rink-header img, .rink-body img, .bee-header img, .bee-body img")].every((img) => img.complete && img.naturalWidth > 0),
      null,
      { timeout: 15000 },
    );

    // ---- one-click collect panel lists the finished show and the done hive ----
    await scrollToSel(".away-return");
    await shot("01-collect-panel");
    await page.addStyleTag({ content: ".toast-container{display:none !important}" });
    const panel = await page.evaluate(() => ({
      n: Number(document.querySelector("[data-away-return]")?.getAttribute("data-away-return") || -1),
      keys: [...document.querySelectorAll("[data-away-return-unit]")].map((el) => el.getAttribute("data-away-return-unit")),
      txt: document.querySelector(".away-return")?.innerText || "",
    }));
    vr.collectPanel = panel;
    if (panel.n !== 2 || panel.keys.join() !== "iceRink:show,beeWorkshop:1") fail(vp.tag, `collect panel units ${panel.n} ${panel.keys.join()}`);
    for (const want of ["冰晶溜冰场", "花田蜜蜂工坊", "评分与限时增益待领取", "罐蜂蜜待收取", "一键收取已归来伙伴（2）"]) {
      if (!panel.txt.includes(want)) fail(vp.tag, `collect panel misses "${want}"`);
    }
    const order = await page.evaluate(() => {
      const rows = [...document.querySelectorAll("#panel-functions .row")];
      const idx = (cls) => rows.findIndex((r) => r.classList.contains(cls));
      return { collect: idx("away-return"), rink: idx("rink-header"), bee: idx("bee-header"), park: idx("park-header") };
    });
    vr.order = order;
    if (!(order.collect >= 0 && order.rink > order.collect && order.bee > order.rink && order.park > order.bee)) fail(vp.tag, `section order ${JSON.stringify(order)}`);

    // ---- Crystal Ice Rink ----
    await scrollToSel(".rink-header");
    await shot("02-rink");
    await shotSection("03-rink-body", ".rink-body");
    const rinkTxt = await textOf(".rink-body");
    for (const want of ["「雪花圆舞曲」演出结束", "94", "全产 +8% · 60 分钟", "领取后", "节目单", "极光双人滑", "冰晶探戈", "限时增益", "上次领取"]) {
      if (!rinkTxt.includes(want)) fail(vp.tag, `rink body misses "${want}"`);
    }
    if ((await rinkPhase()) !== "finished") fail(vp.tag, "rink stage should be finished");

    // ---- Flower-Field Bee Workshop ----
    await scrollToSel(".bee-header");
    await shot("04-bee");
    await shotSection("05-bee-body", ".bee-body");
    const beeTxt = await textOf(".bee-body");
    for (const want of ["今天开的花", "明天", "向阳蜂箱", "溪畔蜂箱 · 蜂蜜酿好了", "林间蜂箱", "蜂蜜图鉴与蜂巢徽章", "铜蜂巢徽章", "上次收取"]) {
      if (!beeTxt.includes(want)) fail(vp.tag, `bee body misses "${want}"`);
    }
    if ((await beePhases()) !== "tending,done,idle") fail(vp.tag, `hives are ${await beePhases()} (want tending,done,idle)`);

    await checkPageOverflow("functions");
    await checkContained("functions", [".away-return", ".rink-header", ".rink-body", ".bee-header", ".bee-body"]);
    await checkNotOccluded(".away-return__btns .btn, .rink-header__btns .btn, .bee-header__btns .btn, .rink-program .btn, .rink-stage .btn, .bee-hive__actions .btn");
    await checkIconReuse("functions", [[".away-return"], [".rink-header", ".rink-body"], [".bee-header", ".bee-body"]]);

    // Scroll drift across live ticks (rehearsal / hive bars, buff countdown patching)
    await scrollToSel(".bee-body");
    const y0 = await scrollPos(".bee-body");
    await page.waitForTimeout(1500);
    const y1 = await scrollPos(".bee-body");
    vr.scrollDrift = y1 - y0;
    if (Math.abs(y1 - y0) > 1) fail(vp.tag, `scroll drift ${y0} -> ${y1}`);

    // ---- bee picker: only partners at home; pick 2 for the idle 林间蜂箱 ----
    await scrollToSel('button[data-bee-open="2"]');
    await page.locator('button[data-bee-open="2"]').click({ timeout: 10000 });
    await page.waitForSelector('[data-bee-modal-overlay="1"]', { timeout: 10000 });
    await settle();
    await shot("06-bee-modal");
    const beePick = await attrIds("data-bee-modal-pick");
    if (!beePick.length || beePick.some((id) => AWAY_IDS.includes(id))) fail(vp.tag, `bee picker lists ${beePick.join()} (away partners must be hidden)`);
    const modalDesc = await textOf('[data-bee-modal-overlay="1"] .modal__desc');
    if (!modalDesc.includes("位忙碌中的伙伴")) fail(vp.tag, `bee picker uses 位 for partners: ${modalDesc}`);
    await checkContained("bee-modal", ['[data-bee-modal-overlay="1"] .modal']);
    await checkIconReuse("bee-modal", [['[data-bee-modal-overlay="1"]']]);
    const keepers = beePick.slice(0, 2);
    for (const id of keepers) {
      await page.locator(`button[data-bee-modal-pick="${id}"]`).click({ timeout: 10000 });
      await settle();
    }
    await page.locator('button[data-bee-modal-go="1"]').click({ timeout: 10000 });
    await settle();
    if ((await beePhases()) !== "tending,done,tending") fail(vp.tag, `after departing the grove hive should be tending (${await beePhases()})`);

    // ---- unified exclusion: training picker ----
    await scrollToSel("button[data-train-open]");
    await page.locator("button[data-train-open]").first().click({ timeout: 10000 });
    await page.waitForSelector('[data-train-modal-overlay="1"]', { timeout: 10000 });
    await settle();
    const trainIds = await attrIds("data-train-modal-check");
    if (!trainIds.length || trainIds.some((id) => [...AWAY_IDS, ...keepers].includes(id))) fail(vp.tag, `training picker lists away partners (${trainIds.join()})`);
    await page.locator("button[data-train-modal-close]").first().click({ timeout: 10000 });
    await settle();

    // ---- one-click collect: show score + honey come home, the tending keepers stay locked ----
    await scrollToSel(".away-return");
    await page.locator('button[data-away-collect-all="1"]').click({ timeout: 10000 });
    await settle();
    await scrollToSel(".away-return");
    await shot("07-collect-after");
    const after = await page.evaluate(() => ({
      n: Number(document.querySelector("[data-away-return]")?.getAttribute("data-away-return") || -1),
      btnDisabled: Boolean(document.querySelector('button[data-away-collect-all="1"]')?.disabled),
      rink: document.querySelector("[data-rink-phase]")?.getAttribute("data-rink-phase") || "",
      bee: [...document.querySelectorAll("[data-bee-phase]")].map((el) => el.getAttribute("data-bee-phase")).join(),
      prodOn: Boolean(document.querySelector('[data-rink-buff="prod"].is-on')),
      catchOn: Boolean(document.querySelector('[data-rink-buff="catch"].is-on')),
      codexGot: document.querySelectorAll(".bee-codex__cell.is-got").length,
    }));
    vr.afterCollect = after;
    if (after.n !== 0 || !after.btnDisabled) fail(vp.tag, `collect panel should be empty after collecting (${JSON.stringify(after)})`);
    if (after.rink !== "idle" || !after.prodOn || !after.catchOn) fail(vp.tag, `the S-grade waltz should light 全产 next to the running 捕获 buff (${JSON.stringify(after)})`);
    if (after.bee !== "tending,idle,tending") fail(vp.tag, `the done hive should be collected (${after.bee})`);
    if (!(after.codexGot >= 3)) fail(vp.tag, `honey codex shows ${after.codexGot} entries`);

    // ---- 手动编排: 换人 opens a per-move picker (home partners only); 重新推荐 drops the draft ----
    await scrollToSel('button[data-rink-slot="crystalTango:0"]');
    await page.locator('button[data-rink-slot="crystalTango:0"]').click({ timeout: 10000 });
    await page.waitForSelector('[data-rink-modal-overlay="1"]', { timeout: 10000 });
    await settle();
    const slotPick = await attrIds("data-rink-slot-pick", '[data-rink-modal-overlay="1"] .modal__body');
    if (!slotPick.length || slotPick.some((id) => [...AWAY_IDS.filter((id) => !SKATERS.includes(id) && !DONE.includes(id)), ...keepers].includes(id))) fail(vp.tag, `move picker lists ${slotPick.join()} (away partners must be hidden)`);
    await checkContained("rink-modal", ['[data-rink-modal-overlay="1"] .modal']);
    await checkIconReuse("rink-modal", [['[data-rink-modal-overlay="1"]']]);
    await page.locator(`[data-rink-modal-overlay="1"] .modal__body button[data-rink-slot-pick="${slotPick[slotPick.length - 1]}"]`).click({ timeout: 10000 });
    await settle();
    if (!(await page.locator('button[data-rink-start="crystalTango"]').count())) fail(vp.tag, "a hand-made draft should offer 按此编排开演");
    await page.locator("button[data-rink-reset]").click({ timeout: 10000 });
    await settle();
    if (await page.locator('button[data-rink-start="crystalTango"]').count()) fail(vp.tag, "重新推荐 should drop the draft");

    // ---- 换人 on 极光双人滑's 2nd move, then 按此编排开演 ----
    await scrollToSel('button[data-rink-slot="auroraDuet:1"]');
    await page.locator('button[data-rink-slot="auroraDuet:1"]').click({ timeout: 10000 });
    await page.waitForSelector('[data-rink-modal-overlay="1"]', { timeout: 10000 });
    await settle();
    await shot("08a-rink-move-picker");
    const pick2 = await attrIds("data-rink-slot-pick", '[data-rink-modal-overlay="1"] .modal__body');
    await page.locator(`[data-rink-modal-overlay="1"] .modal__body button[data-rink-slot-pick="${pick2[0]}"]`).click({ timeout: 10000 });
    await settle();
    const draftSlot = await attrIds("data-ml17-mon", '[data-rink-program="auroraDuet"] .rink-move:nth-child(2)');
    if (draftSlot[0] !== pick2[0]) fail(vp.tag, `the picked partner should take move 2 (${draftSlot.join()} vs ${pick2[0]})`);
    await page.locator('button[data-rink-start="auroraDuet"]').click({ timeout: 10000 });
    await settle();
    if ((await rinkPhase()) !== "rehearsing") fail(vp.tag, "按此编排开演 did not start a rehearsal");
    const skatersNow = await attrIds("data-ml17-mon", "[data-rink-stage]");
    const keepersNow = await attrIds("data-ml17-mon", '[data-bee-phase="tending"]');
    vr.skatersNow = skatersNow;
    vr.keepersNow = keepersNow;
    if (!skatersNow.length || skatersNow.some((id) => keepersNow.includes(id))) fail(vp.tag, `arranged skaters ${skatersNow.join()} overlap keepers ${keepersNow.join()}`);
    await scrollToSel(".rink-body");
    await shot("08-rink-rehearsing");
    await checkContained("rink-rehearsing", [".rink-body"]);
    await checkIconReuse("rink-rehearsing", [[".rink-header", ".rink-body"]]);

    // ---- Mons tab: release locks — skaters / keepers locked, collected partners free ----
    await gotoTab("mons");
    const locks = await page.evaluate((ids) => ids.map((id) => {
      const b = document.querySelector(`button[data-mon-release="${id}"]`);
      return b ? { id, disabled: b.disabled, title: b.getAttribute("title") || "" } : { id, missing: true };
    }), [...skatersNow, ...keepersNow]);
    vr.releaseLocks = locks;
    for (const l of locks) {
      if (l.missing) continue;
      const want = skatersNow.includes(l.id) ? "冰晶溜冰场" : "花田蜜蜂工坊";
      if (!l.disabled || !l.title.includes(want)) fail(vp.tag, `release button of #${l.id} not locked (${l.title})`);
    }
    const sk = skatersNow[0];
    if (sk && (await page.locator(`button[data-mon-open="${sk}"]`).count())) {
      await page.locator(`button[data-mon-open="${sk}"]`).first().click({ timeout: 10000 });
      await settle();
      const tags = await page.evaluate(() => document.getElementById("monDetail")?.innerText || document.querySelector("#panel-mons")?.innerText || "");
      if (!tags.includes("溜冰排练中 · 极光双人滑")) fail(vp.tag, `mon detail of #${sk} lacks the skater tag`);
      await page.evaluate(() => {
        const el = [...document.querySelectorAll(".tag--rink-skater")][0];
        el?.closest(".row")?.setAttribute("data-ml17-shot", "1");
      });
      if (await page.locator('[data-ml17-shot="1"]').count()) await scrollToSel('[data-ml17-shot="1"]');
      await checkIconReuse("mon-detail", [['[data-ml17-shot="1"]']]);
    }
    await shot("09-mons-detail");
    await checkPageOverflow("mons");

    // ---- Help tab: ML-17 block ----
    await gotoTab("options").catch(() => {});
    const helpOk = await page.evaluate(() => {
      const d = [...document.querySelectorAll("details.helpBlock")].find((x) => (x.querySelector("summary")?.innerText || "").includes("冰晶溜冰场与花田蜜蜂工坊"));
      if (!d) return false;
      d.open = true;
      d.setAttribute("data-ml17-help", "1");
      return true;
    });
    if (!helpOk) fail(vp.tag, "help tab lacks the ML-17 block");
    else {
      await scrollToSel('[data-ml17-help="1"]');
      await shot("10-help-block");
      await checkContained("help", ['[data-ml17-help="1"]']);
      await checkIconReuse("help-block", [['[data-ml17-help="1"]']]);
    }
    await checkPageOverflow("help");

    if (vr.consoleErrors.length) fail(vp.tag, `console errors: ${vr.consoleErrors.join(" | ")}`);
    await context.close();
  }

  // ---- Offline catch-up in the real app: the save was last ticked 2 hours ago (boot runs tick(dt, { offline: true })) ----
  {
    const tag = "offline-1440";
    const vr = { shots: [], consoleErrors: [] };
    report.viewports[tag] = vr;
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.abort());
    const page = await context.newPage();
    page.on("pageerror", (err) => vr.consoleErrors.push(`pageerror: ${err.message}`));
    page.on("console", (msg) => {
      if (msg.type() !== "error") return;
      const url = msg.location()?.url || "";
      if (/Failed to load resource/.test(msg.text()) && !url.startsWith(base)) return;
      vr.consoleErrors.push(msg.text());
    });
    const offSave = JSON.parse(JSON.stringify(SAVE));
    offSave.t = Date.now() - 2 * 3600 * 1000;
    offSave.meta.iceRink = {
      show: { programId: "snowWaltz", skaterIds: SKATERS, phase: "rehearsing", elapsedSec: 0, startedAt: offSave.t },
      buffs: { pveOut: { add: 0.03, leftSec: 1800 } },
    };
    offSave.meta.beeWorkshop = {
      hives: [{ trip: { hiveId: "sunnyHive", keeperIds: [5], phase: "tending", elapsedSec: 0, flowerId: bloom.bloomIds[0], departedAt: offSave.t } }, { trip: null }, { trip: null }],
    };
    await page.goto(`${base}/index.html`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.evaluate((save) => localStorage.setItem("mengling_idle_save_v1", JSON.stringify(save)), offSave);
    await page.reload({ waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForSelector('#tab-functions[data-unlocked="1"]', { timeout: 20000 });
    await page.locator("#tab-functions").click({ timeout: 10000 });
    await page.waitForSelector(".rink-header", { timeout: 15000 });
    await page.waitForTimeout(400);
    const logToggle = page.locator("#logToggle");
    if ((await logToggle.count()) && (await logToggle.innerText()).includes("展开")) await logToggle.click({ timeout: 10000 });
    await page.waitForTimeout(600);
    const logTxt = await page.evaluate(() => document.getElementById("log")?.textContent || "");
    const off = await page.evaluate(() => ({
      rink: document.querySelector("[data-rink-phase]")?.getAttribute("data-rink-phase") || "",
      bee: [...document.querySelectorAll("[data-bee-phase]")].map((el) => el.getAttribute("data-bee-phase")).join(),
      pveOn: Boolean(document.querySelector('[data-rink-buff="pveOut"].is-on')),
      panel: Number(document.querySelector("[data-away-return]")?.getAttribute("data-away-return") || -1),
    }));
    vr.offline = { ...off, logHasRink: logTxt.includes("冰晶溜冰场："), logHasBee: logTxt.includes("花田蜜蜂工坊："), logHasBuffEnd: logTxt.includes("限时增益结束了"), logHasHint: logTxt.includes("外出归来：") };
    if (off.rink !== "finished") fail(tag, `2h offline should finish the 30-minute rehearsal (${off.rink})`);
    if (off.bee !== "done,idle,idle") fail(tag, `2h offline should finish the 40-minute hive (${off.bee})`);
    if (off.pveOn) fail(tag, "a 30-minute buff should have expired after 2h offline");
    if (off.panel !== 2) fail(tag, `the collect panel should show the show + the hive after the offline catch-up (${off.panel})`);
    if (!vr.offline.logHasRink || !vr.offline.logHasBee || !vr.offline.logHasBuffEnd || !vr.offline.logHasHint) fail(tag, `offline log lines missing ${JSON.stringify(vr.offline)}`);
    await page.evaluate(() => document.querySelector(".away-return")?.scrollIntoView({ block: "start" }));
    await page.waitForTimeout(250);
    const file = path.join(outDir, `1440x900-11-offline-catchup.png`);
    await page.screenshot({ path: file });
    vr.shots.push(file);
    if (vr.consoleErrors.length) fail(tag, `console errors: ${vr.consoleErrors.join(" | ")}`);
    await context.close();
  }
} catch (err) {
  report.failures.push(`exception: ${err?.stack || err}`);
  console.error("ml17-screens: FAIL exception", err);
} finally {
  if (browser) await browser.close().catch(() => {});
  await new Promise((resolve) => server.close(() => resolve()));
  writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));
}

const shots = Object.values(report.viewports).reduce((n, v) => n + v.shots.length, 0);
if (report.failures.length) {
  console.error(`ml17-screens: ${report.failures.length} failure(s); ${shots} screenshot(s) in ${outDir}`);
  process.exitCode = 1;
} else {
  console.log(`ml17-screens: OK — ${shots} screenshots, 0 overflow / occlusion / icon-clash / console errors → ${outDir}`);
}
