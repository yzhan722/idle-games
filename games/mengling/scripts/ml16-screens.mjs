#!/usr/bin/env node
/**
 * ML-16 视觉自审 + UI 交互验证（外出归来「一键收取已归来伙伴」/ 云端游乐园 / 星空露营观测）。
 * 用法：node scripts/ml16-screens.mjs
 *   ML16_SHOT_DIR=<目录>  截图与 report.json 输出目录（默认 <系统临时目录>/mengling-ml16）
 * 每个视口（1440×900、390×844）加载同一份构造存档，截图功能页顶部的「外出归来 · 一键收取」面板、游乐园与星空露营两大新板块、
 * 值班 / 入营两个选人弹窗、一键收取前后、训练选人弹窗、伙伴页放生锁与伙伴详情标签、帮助页 ML-16 帮助块，并检查：
 * 横向溢出、板块内子元素越界、按钮遮挡、滚动漂移、控制台报错、复用图标与原图在同一板块 / 弹窗内同时出现，
 * 以及外出伙伴不会出现在任何候选里、一键收取后已归来伙伴回家、仍在外的伙伴继续锁定。
 * 另起一个 1440 视口验证离线 2 小时补算（游乐园转轮、夜营归营、外出归来提示）。
 * 浏览器与静态服务器在 finally 中关闭；任何检查失败时退出码为 1。
 */
import { createRequire } from "node:module";
import http from "node:http";
import os from "node:os";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getStargazeSkyRotation, STARGAZE_SITES } from "../modules/systems/pve_tower.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.resolve(process.env.ML16_SHOT_DIR || path.join(os.tmpdir(), "mengling-ml16"));
const require = createRequire(import.meta.url);

let playwright;
try {
  playwright = require("playwright");
} catch {
  console.log("ml16-screens: SKIP (playwright not installed)");
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
  cloudPark: "skyIsland",
  carouselRide: "bandStage",
  parkTicket: "mapFragment",
  starCamp: "campTentStar",
  campfireBadge: "nocturnalCrest",
  meteorSighting: "nightObservatory",
};

// Away: park operators 6 (旋转木马) + 7 (摩天轮); campers 11 + 5 (萤火草坡, camping); 10 back at dawn (镜湖星湾, returned);
// 4 on a landed balloon; 12 back at the post office. Home: 1, 2, 3, 8, 9.
const sky = getStargazeSkyRotation(Date.now());
const meadowDur = STARGAZE_SITES[0].campMin * 60;
const OPERATORS = [6, 7];
const CAMPING = [11, 5];
const RETURNED = [10, 4, 12];
const AWAY_IDS = [...OPERATORS, ...CAMPING, ...RETURNED];
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
  pve: {
    championLeague: { squadIds: [1, 8, 9] },
    starCorridor: { squadIds: [6, 8, 9, 2] },
  },
  meta: {
    cloudPark: {
      operators: { carousel: 6, ferrisWheel: 7, coaster: 0 },
      rides: { carousel: { work: 150, rounds: 23 }, ferrisWheel: { work: 210, rounds: 9 }, coaster: { work: 0, rounds: 0 } },
      satisfaction: 72,
      tickets: 340,
      totalVisitors: 262,
      totalRounds: 32,
      totalEvents: 1,
      buffs: { fireworks: 1500 },
      lastEvent: { eventId: "fireworks", addSec: 2250, eventMul: 1.25, at: 0 },
      recentLogs: ["【新设施开放】「彩虹过山车」建好了，快请伙伴来值班", "【游乐园升星】累计接待游客 150 位，云端游乐园升为 ★「热闹游乐园」"],
    },
    stargazeCamp: {
      sites: [
        { trip: { siteId: "fireflyMeadow", camperIds: CAMPING, phase: "camping", elapsedSec: Math.round(meadowDur * 0.35), skyIds: sky.visibleIds, showerId: sky.shower.id, night: sky.isNight, departedAt: Date.now() - 600_000 } },
        {
          trip: {
            siteId: "mirrorLake",
            camperIds: [10],
            phase: "returned",
            skyIds: sky.visibleIds,
            showerId: sky.shower.id,
            night: true,
            haul: [
              { id: sky.visibleIds[0], monId: 10 },
              { id: sky.visibleIds[2], monId: 10 },
              { id: sky.shower.id, monId: 10 },
            ],
            departedAt: Date.now() - 4_000_000,
          },
        },
        { trip: null },
      ],
      atlas: { antlerDeer: { count: 2 }, moonRabbit: { count: 1 }, tideWhale: { count: 1 }, silverFeather: { count: 1 } },
      totalNights: 3,
      totalSightings: 7,
      lastClaim: { count: 2, siteId: "summitDeck", rewards: { catnip: 50, wood: 30, futurecoin: 18, minerals: 40 }, entryIds: ["antlerDeer", "silverFeather"], newEntries: ["silverFeather"], at: 0 },
      recentLogs: ["【天亮归营】「镜湖星湾」的伙伴们收起帐篷回来了，记下 2 个星座、1 次流星，快去收取观测记录"],
    },
    balloonTravel: {
      balloons: [{ trip: { isleId: "thunderMill", passengerIds: [4], phase: "landed", haul: [{ souvenirId: "boltGlobe", monId: 4 }] } }, { trip: null }],
      album: { cottonCandy: { count: 1 } },
      totalTrips: 1,
    },
    postOffice: { letters: 3, trips: [{ routeId: "meadow", monId: 12, tripSec: 600, elapsedSec: 600 }] },
  },
};

const VIEWPORTS = [
  { tag: "1440x900", width: 1440, height: 900 },
  { tag: "390x844", width: 390, height: 844 },
];

const report = { outDir, sky: { visible: sky.visibleIds, shower: sky.shower.id, night: sky.isNight }, viewports: {}, iconPagePairs: {}, failures: [] };
const fail = (vp, msg) => {
  report.failures.push(`[${vp}] ${msg}`);
  console.error(`ml16-screens: FAIL [${vp}] ${msg}`);
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
    /** Page-level co-occurrence (different sections are allowed, but listed in the report). */
    const notePagePairs = async (label) => {
      const pairs = await page.evaluate((map) => {
        const names = new Set([...document.querySelectorAll(".panel.is-active img, [id^='panel-'].is-active img")].map((img) => (/ui_icons\/([A-Za-z0-9_]+)\.webp/.exec(img.getAttribute("src") || "") || [])[1]).filter(Boolean));
        return Object.entries(map).filter(([c, o]) => names.has(c) && names.has(o)).map(([c, o]) => `${c}+${o}`);
      }, REUSED_FROM);
      report.iconPagePairs[`${vp.tag}:${label}`] = pairs;
    };
    const attrIds = (attr, scope = "") =>
      page.evaluate(([a, sc]) => [...document.querySelectorAll(`${sc} [${a}]`.trim())].map((el) => Number(el.getAttribute(a))), [attr, scope]);
    const textOf = (sel) => page.evaluate((s) => document.querySelector(s)?.innerText || "", sel);

    // ---- load the crafted save ----
    await page.goto(`${base}/index.html`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.evaluate((save) => localStorage.setItem("mengling_idle_save_v1", JSON.stringify(save)), SAVE);
    await page.reload({ waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForSelector('#tab-functions[data-unlocked="1"]', { timeout: 20000 });
    await gotoTab("functions");
    await page.waitForSelector(".away-return", { timeout: 15000 });
    await page.waitForSelector(".park-header", { timeout: 15000 });
    await page.waitForSelector(".stargaze-header", { timeout: 15000 });
    await page.waitForFunction(
      () => [...document.querySelectorAll(".away-return img, .park-header img, .park-body img, .stargaze-header img, .stargaze-body img")].every((img) => img.complete && img.naturalWidth > 0),
      null,
      { timeout: 15000 },
    );

    // ---- one-click collect panel (top of the functions tab) ----
    await scrollToSel(".away-return");
    await shot("01-collect-panel");
    // The tick's「外出归来」hint pops up as a log toast on load; record it, then hide transient toasts so they do not cover the section shots
    vr.toastHint = await page.evaluate(() => [...document.querySelectorAll(".toast")].map((t) => t.innerText).find((t) => t.includes("外出归来")) || "");
    await page.addStyleTag({ content: ".toast-container{display:none !important}" });
    const panel = await page.evaluate(() => ({
      n: Number(document.querySelector("[data-away-return]")?.getAttribute("data-away-return") || -1),
      ready: Boolean(document.querySelector(".away-return.is-ready")),
      keys: [...document.querySelectorAll("[data-away-return-unit]")].map((el) => el.getAttribute("data-away-return-unit")),
      txt: document.querySelector(".away-return")?.innerText || "",
    }));
    vr.collectPanel = panel;
    if (panel.n !== 3 || !panel.ready) fail(vp.tag, `collect panel should list 3 returned units (got ${panel.n}, ready=${panel.ready})`);
    if (panel.keys.join() !== "stargazeCamp:1,balloonTravel:0,postOffice:meadow") fail(vp.tag, `collect panel units ${panel.keys.join()}`);
    for (const want of ["星空露营观测", "彩虹气球旅行", "萌灵邮局", "一键收取已归来伙伴（3）", "外出中 7 位"]) {
      if (!panel.txt.includes(want)) fail(vp.tag, `collect panel misses "${want}"`);
    }
    const panelTop = await page.evaluate(() => {
      const el = document.querySelector(".away-return");
      const sc = document.querySelector("#panel-functions");
      return el && sc ? Math.round(el.getBoundingClientRect().top - sc.getBoundingClientRect().top) : -1;
    });
    vr.collectPanelOffset = panelTop;
    const summaryBefore = await page.evaluate(() => {
      const rows = [...document.querySelectorAll("#panel-functions .row")];
      const idxSummary = rows.findIndex((r) => (r.innerText || "").includes("功能摘要"));
      const idxPanel = rows.findIndex((r) => r.classList.contains("away-return"));
      return { idxSummary, idxPanel, summary: idxSummary >= 0 ? rows[idxSummary].innerText : "" };
    });
    if (!(summaryBefore.idxPanel === summaryBefore.idxSummary + 1)) fail(vp.tag, `collect panel should sit right under 功能摘要 (${summaryBefore.idxSummary} / ${summaryBefore.idxPanel})`);
    if (!summaryBefore.summary.includes("外出归来待收取 3 处")) fail(vp.tag, "functions summary does not hint the returned partners");

    // ---- Cloud Amusement Park ----
    await scrollToSel(".park-header");
    await shot("02-park");
    await shotSection("03-park-body", ".park-body");
    const parkTxt = await textOf(".park-body");
    for (const want of ["游客满意度", "笑声不断", "售票亭", "340", "星光旋转木马", "云朵摩天轮", "彩虹过山车", "游园活动", "星空烟花秀", "上次活动"]) {
      if (!parkTxt.includes(want)) fail(vp.tag, `park body misses "${want}"`);
    }
    const ops = await attrIds("data-park-operator");
    if (ops.join() !== "6,7") fail(vp.tag, `park rides show operators ${ops.join()} (want 6,7)`);

    // ---- Starry Night Camp ----
    await scrollToSel(".stargaze-header");
    await shot("04-stargaze");
    await shotSection("05-stargaze-body", ".stargaze-body");
    const sgTxt = await textOf(".stargaze-body");
    for (const want of ["此刻的星空", "今天的流星雨", "萤火草坡", "镜湖星湾 · 天亮归营", "云巅观星台", "观测图鉴与营火徽章", "铜营火徽章", "上次收取"]) {
      if (!sgTxt.includes(want)) fail(vp.tag, `stargaze body misses "${want}"`);
    }
    const phases = await page.evaluate(() => [...document.querySelectorAll("[data-stargaze-phase]")].map((el) => el.getAttribute("data-stargaze-phase")));
    if (phases.join() !== "camping,returned,idle") fail(vp.tag, `campsites are ${phases.join()} (want camping,returned,idle)`);

    await checkPageOverflow("functions");
    await checkContained("functions", [".away-return", ".park-header", ".park-body", ".stargaze-header", ".stargaze-body"]);
    await checkNotOccluded(
      ".away-return__btns .btn, .park-header__btns .btn, .stargaze-header__btns .btn, .park-ride .btn, .park-event .btn, .stargaze-site__actions .btn",
    );
    await checkIconReuse("functions", [[".away-return"], [".park-header", ".park-body"], [".stargaze-header", ".stargaze-body"]]);
    await notePagePairs("functions");

    // Scroll drift across live ticks (satisfaction meter / ride bars / camp bar patching)
    await scrollToSel(".park-body");
    const y0 = await scrollPos(".park-body");
    await page.waitForTimeout(1500);
    const y1 = await scrollPos(".park-body");
    vr.scrollDrift = y1 - y0;
    if (Math.abs(y1 - y0) > 1) fail(vp.tag, `scroll drift ${y0} -> ${y1}`);

    // ---- park picker: only partners at home; the matched 镇岳巨岩尊 (#8, stone) ranks first for the coaster ----
    await scrollToSel('button[data-park-open="coaster"]');
    await page.locator('button[data-park-open="coaster"]').click({ timeout: 10000 });
    await page.waitForSelector('[data-park-modal-overlay="1"]', { timeout: 10000 });
    await settle();
    await shot("06-park-modal");
    const parkPick = await attrIds("data-park-modal-pick");
    if (!parkPick.length || parkPick.some((id) => AWAY_IDS.includes(id))) fail(vp.tag, `park picker lists ${parkPick.join()} (away partners must be hidden)`);
    // Ranking uses the same type resolution as the tick (save types → dex data): fastest first, a matched operator on top
    const parkRows = await page.evaluate(() =>
      [...document.querySelectorAll('[data-park-modal-overlay="1"] .func-mon-row')].map((row) => ({
        id: Number(row.querySelector("[data-park-modal-pick]")?.getAttribute("data-park-modal-pick")),
        match: row.innerText.includes("属性契合"),
        speed: Number((/速度 ×([0-9.]+)/.exec(row.innerText) || [])[1] || 0),
      })),
    );
    vr.parkPicker = parkRows;
    if (!parkRows.some((r) => r.match) || !parkRows[0].match) fail(vp.tag, `park picker should offer and rank a matched coaster operator first (${JSON.stringify(parkRows)})`);
    if (parkRows.some((r, i) => i > 0 && r.speed > parkRows[i - 1].speed + 1e-9)) fail(vp.tag, "park picker is not sorted by speed");
    await checkContained("park-modal", ['[data-park-modal-overlay="1"] .modal']);
    await checkIconReuse("park-modal", [['[data-park-modal-overlay="1"]']]);
    await page.locator(`button[data-park-modal-pick="${parkPick[0]}"]`).click({ timeout: 10000 });
    await settle();
    const ops2 = await attrIds("data-park-operator");
    if (ops2.join() !== `6,7,${parkPick[0]}`) fail(vp.tag, `coaster operator did not take the ride (${ops2.join()})`);
    const OPS_NOW = [6, 7, parkPick[0]];

    // ---- park event: 花车大游行 lights the catch buff ----
    await scrollToSel(".park-events");
    await page.locator('button[data-park-event="parade"]').click({ timeout: 10000 });
    await settle();
    const paradeOn = await page.evaluate(() => document.querySelector('[data-park-event-card="parade"]')?.classList.contains("is-on"));
    if (!paradeOn) fail(vp.tag, "花车大游行 did not light its buff");
    await scrollToSel(".park-events");
    await shot("07-park-events");

    // ---- stargaze picker: open the idle 云巅观星台, pick 2 home partners, depart ----
    await scrollToSel('button[data-stargaze-open="2"]');
    await page.locator('button[data-stargaze-open="2"]').click({ timeout: 10000 });
    await page.waitForSelector('[data-stargaze-modal-overlay="1"]', { timeout: 10000 });
    await settle();
    await shot("08-stargaze-modal");
    const awayNow = [...OPS_NOW, ...CAMPING, ...RETURNED];
    const sgPick = await attrIds("data-stargaze-modal-pick");
    if (!sgPick.length || sgPick.some((id) => awayNow.includes(id))) fail(vp.tag, `camp picker lists ${sgPick.join()} (away partners must be hidden)`);
    await checkContained("stargaze-modal", ['[data-stargaze-modal-overlay="1"] .modal']);
    await checkIconReuse("stargaze-modal", [['[data-stargaze-modal-overlay="1"]']]);
    const campers = sgPick.slice(0, 2);
    for (const id of campers) {
      await page.locator(`button[data-stargaze-modal-pick="${id}"]`).click({ timeout: 10000 });
      await settle();
    }
    await page.locator('button[data-stargaze-modal-go="1"]').click({ timeout: 10000 });
    await settle();
    const phases2 = await page.evaluate(() => [...document.querySelectorAll("[data-stargaze-phase]")].map((el) => el.getAttribute("data-stargaze-phase")));
    if (phases2.join() !== "camping,returned,camping") fail(vp.tag, `after departing the summit should be camping (${phases2.join()})`);
    const STILL_OUT = [...OPS_NOW, ...CAMPING, ...campers];

    // ---- unified exclusion: training picker ----
    await scrollToSel("button[data-train-open]");
    await page.locator("button[data-train-open]").first().click({ timeout: 10000 });
    await page.waitForSelector('[data-train-modal-overlay="1"]', { timeout: 10000 });
    await settle();
    const trainIds = await attrIds("data-train-modal-check");
    const trainDesc = await textOf('[data-train-modal-overlay="1"] .modal__desc');
    if (!trainIds.length || trainIds.some((id) => [...STILL_OUT, ...RETURNED].includes(id))) fail(vp.tag, `training picker lists away partners (${trainIds.join()})`);
    if (!trainDesc.includes("游乐园值班、夜营观星")) fail(vp.tag, `training picker hint: ${trainDesc}`);
    await shot("09-training-modal");
    await page.locator("button[data-train-modal-close]").first().click({ timeout: 10000 });
    await settle();

    // ---- one-click collect: the 3 returned units come home, everybody still out stays locked ----
    await scrollToSel(".away-return");
    await page.locator('button[data-away-collect-all="1"]').click({ timeout: 10000 });
    await settle();
    await scrollToSel(".away-return");
    await shot("10-collect-after");
    const after = await page.evaluate(() => ({
      n: Number(document.querySelector("[data-away-return]")?.getAttribute("data-away-return") || -1),
      ready: Boolean(document.querySelector(".away-return.is-ready")),
      btnDisabled: Boolean(document.querySelector('button[data-away-collect-all="1"]')?.disabled),
      phases: [...document.querySelectorAll("[data-stargaze-phase]")].map((el) => el.getAttribute("data-stargaze-phase")),
      balloon: [...document.querySelectorAll("[data-balloon-phase]")].map((el) => el.getAttribute("data-balloon-phase")),
    }));
    vr.afterCollect = after;
    if (after.n !== 0 || after.ready || !after.btnDisabled) fail(vp.tag, `collect panel should be empty after collecting (${JSON.stringify(after)})`);
    if (after.phases.join() !== "camping,idle,camping") fail(vp.tag, `the returned camp should be collected (${after.phases.join()})`);
    if (after.balloon.join() !== "idle,idle") fail(vp.tag, `the landed balloon should be collected (${after.balloon.join()})`);

    // ---- Mons tab: release locks — returned partners free, everybody still out locked ----
    await gotoTab("mons");
    const locks = await page.evaluate((ids) => ids.map((id) => {
      const b = document.querySelector(`button[data-mon-release="${id}"]`);
      return b ? { id, disabled: b.disabled, title: b.getAttribute("title") || "" } : { id, missing: true };
    }), [...STILL_OUT, ...RETURNED]);
    for (const l of locks) {
      if (l.missing) continue;
      if (RETURNED.includes(l.id)) {
        if (l.disabled && /星空露营|彩虹气球|邮局/.test(l.title)) fail(vp.tag, `returned partner #${l.id} is still locked after collecting (${l.title})`);
        continue;
      }
      const want = OPS_NOW.includes(l.id) ? "云端游乐园" : "星空露营地";
      if (!l.disabled || !l.title.includes(want)) fail(vp.tag, `release button of #${l.id} not locked (${l.title})`);
    }
    vr.releaseLocks = locks;
    if (await page.locator('button[data-mon-open="6"]').count()) {
      await page.locator('button[data-mon-open="6"]').first().click({ timeout: 10000 });
      await settle();
      const tags = await page.evaluate(() => document.getElementById("monDetail")?.innerText || document.querySelector("#panel-mons")?.innerText || "");
      if (!tags.includes("游乐园值班 · 星光旋转木马")) fail(vp.tag, "mon detail of #6 lacks the park operator tag");
      await page.evaluate(() => {
        const el = [...document.querySelectorAll(".tag--park-operator")][0];
        el?.closest(".row")?.setAttribute("data-ml16-shot", "1");
      });
      if (await page.locator('[data-ml16-shot="1"]').count()) await scrollToSel('[data-ml16-shot="1"]');
      await checkIconReuse("mon-detail", [['[data-ml16-shot="1"]']]);
    }
    await shot("11-mons-detail");
    await checkPageOverflow("mons");

    // ---- Help tab: ML-16 block ----
    await gotoTab("options").catch(() => {});
    const helpOk = await page.evaluate(() => {
      const d = [...document.querySelectorAll("details.helpBlock")].find((x) => (x.querySelector("summary")?.innerText || "").includes("云端游乐园与星空露营观测"));
      if (!d) return false;
      d.open = true;
      d.setAttribute("data-ml16-help", "1");
      return true;
    });
    if (!helpOk) fail(vp.tag, "help tab lacks the ML-16 block");
    else {
      await scrollToSel('[data-ml16-help="1"]');
      await shot("12-help-block");
      await checkContained("help", ['[data-ml16-help="1"]']);
      await checkIconReuse("help-block", [['[data-ml16-help="1"]']]);
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
    offSave.meta.cloudPark = { operators: { carousel: 6, ferrisWheel: 7 }, totalVisitors: 100, satisfaction: 40, tickets: 0 };
    offSave.meta.stargazeCamp = {
      sites: [{ trip: { siteId: "fireflyMeadow", camperIds: [11, 5], phase: "camping", elapsedSec: 0, skyIds: sky.visibleIds, showerId: sky.shower.id, night: true, departedAt: offSave.t } }, { trip: null }, { trip: null }],
    };
    delete offSave.meta.balloonTravel;
    delete offSave.meta.postOffice;
    await page.goto(`${base}/index.html`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.evaluate((save) => localStorage.setItem("mengling_idle_save_v1", JSON.stringify(save)), offSave);
    await page.reload({ waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForSelector('#tab-functions[data-unlocked="1"]', { timeout: 20000 });
    await page.locator("#tab-functions").click({ timeout: 10000 });
    await page.waitForSelector(".park-header", { timeout: 15000 });
    await page.waitForTimeout(400);
    const logToggle = page.locator("#logToggle");
    if ((await logToggle.count()) && (await logToggle.innerText()).includes("展开")) await logToggle.click({ timeout: 10000 });
    await page.waitForTimeout(600);
    const logTxt = await page.evaluate(() => document.getElementById("log")?.textContent || "");
    const off = await page.evaluate(() => ({
      tickets: Number((document.querySelector("[data-park-tickets-big]")?.textContent || "0").trim()),
      returned: document.querySelectorAll('[data-stargaze-phase="returned"]').length,
      panel: Number(document.querySelector("[data-away-return]")?.getAttribute("data-away-return") || -1),
    }));
    vr.offline = { ...off, logHasPark: logTxt.includes("云端游乐园：设施们转了"), logHasCamp: logTxt.includes("星空露营观测："), logHasHint: logTxt.includes("外出归来：") };
    if (!(off.tickets >= 100)) fail(tag, `2h offline should sell many tickets (${off.tickets})`);
    if (off.returned !== 1) fail(tag, `2h offline should bring the camp back (${off.returned} returned)`);
    if (off.panel !== 1) fail(tag, `the collect panel should show the returned camp after the offline catch-up (${off.panel})`);
    if (!vr.offline.logHasPark) fail(tag, "offline tick did not log the park rounds");
    if (!vr.offline.logHasCamp) fail(tag, "offline tick did not log the camp return");
    if (!vr.offline.logHasHint) fail(tag, "offline tick did not hint the one-click collect");
    await page.evaluate(() => document.querySelector(".away-return")?.scrollIntoView({ block: "start" }));
    await page.waitForTimeout(250);
    const file = path.join(outDir, `1440x900-13-offline-catchup.png`);
    await page.screenshot({ path: file });
    vr.shots.push(file);
    if (vr.consoleErrors.length) fail(tag, `console errors: ${vr.consoleErrors.join(" | ")}`);
    await context.close();
  }
} catch (err) {
  report.failures.push(`exception: ${err?.stack || err}`);
  console.error("ml16-screens: FAIL exception", err);
} finally {
  if (browser) await browser.close().catch(() => {});
  await new Promise((resolve) => server.close(() => resolve()));
  writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));
}

const shots = Object.values(report.viewports).reduce((n, v) => n + v.shots.length, 0);
if (report.failures.length) {
  console.error(`ml16-screens: ${report.failures.length} failure(s); ${shots} screenshot(s) in ${outDir}`);
  process.exitCode = 1;
} else {
  console.log(`ml16-screens: OK — ${shots} screenshots, 0 overflow / occlusion / icon-clash / console errors → ${outDir}`);
}
