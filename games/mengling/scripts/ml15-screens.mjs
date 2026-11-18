#!/usr/bin/env node
/**
 * ML-15 视觉自审 + UI 交互验证（云朵甜点烘焙坊 / 彩虹气球旅行 / 冠军联盟 & 星轨回廊手动编入排除）。
 * 用法：node scripts/ml15-screens.mjs
 *   ML15_SHOT_DIR=<目录>  截图与 report.json 输出目录（默认 <系统临时目录>/mengling-ml15）
 * 每个视口（1440×900、390×844）加载同一份构造存档，截图功能页两大新板块、上岗 / 登机两个选人弹窗、训练 / 远征选人弹窗、
 * PvE 页冠军联盟 / 星轨回廊战队与编队弹窗、伙伴页放生锁，并检查：横向溢出、板块内子元素越界、按钮遮挡、滚动漂移、控制台报错，
 * 以及外出伙伴（烘焙 / 气球旅行）不会出现在任何候选里、手动编入被拒绝、已在队中的外出伙伴显示「本场不出战」。
 * 浏览器与静态服务器在 finally 中关闭；任何检查失败时退出码为 1。
 */
import { createRequire } from "node:module";
import http from "node:http";
import os from "node:os";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getBalloonIsleDef, getBalloonIsleRotation } from "../modules/systems/pve_tower.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.resolve(process.env.ML15_SHOT_DIR || path.join(os.tmpdir(), "mengling-ml15"));
const require = createRequire(import.meta.url);

let playwright;
try {
  playwright = require("playwright");
} catch {
  console.log("ml15-screens: SKIP (playwright not installed)");
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

// Away partners: 1 (烤炉) + 2 (揉面台) baking; 4 + 5 flying; 3 on the landed balloon (until collected). 6~12 stay home.
const rot = getBalloonIsleRotation(Date.now());
const FLY_ISLE = rot.openIds[0];
const flyDur = getBalloonIsleDef(FLY_ISLE).tripMin * 60;
const BAKERS = [1, 2];
const TRAVELLERS = [3, 4, 5];
const AWAY_IDS = [...BAKERS, ...TRAVELLERS];
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
  expedition: { selectedIds: [1, 8, 9] },
  pve: {
    championLeague: { squadIds: [1, 8, 9] },
    starCorridor: { squadIds: [4, 8, 9, 10] },
  },
  meta: {
    cloudBakery: {
      workers: { knead: 2, bake: 1, decorate: 0 },
      recipeId: "rainbowRoll",
      batch: { stageIdx: 1, work: 7 },
      showcase: [
        { recipeId: "cloudPuff", q: 3 },
        { recipeId: "cloudPuff", q: 2 },
        { recipeId: "lavaCocoa", q: 2 },
        { recipeId: "starMacaron", q: 2 },
      ],
      recipes: {
        cloudPuff: { baked: 3, bestQ: 3 },
        lavaCocoa: { baked: 2, bestQ: 2 },
        dewJelly: { baked: 1, bestQ: 2 },
        starMacaron: { baked: 1, bestQ: 2 },
      },
      buffs: { prod: 1800, shiny: 600 },
      totalBatches: 7,
      totalEaten: 3,
      lastBox: { count: 3, rewards: { catnip: 175, futurecoin: 7 }, at: 0 },
      recentLogs: ["【出炉】星糖马卡龙 ★★ 放进了甜点柜（揉面：沧澜重龟 · 烘烤：炽翼炎龙）", "【新食谱解锁】「雷莓脆脆饼」可以开始烤了"],
    },
    balloonTravel: {
      balloons: [
        { trip: { isleId: FLY_ISLE, passengerIds: [4, 5], phase: "flying", elapsedSec: Math.round(flyDur * 0.4), durationSec: flyDur, haul: [] } },
        {
          trip: {
            isleId: "starLighthouse",
            passengerIds: [3],
            phase: "landed",
            haul: [
              { souvenirId: "starsandVial", monId: 3 },
              { souvenirId: "starCompass", monId: 3 },
            ],
          },
        },
      ],
      album: { cottonCandy: { count: 2 }, skyChime: { count: 1 }, rainbowQuill: { count: 1 }, fallsPostcard: { count: 1 }, sunsetPebble: { count: 3 }, lavaCandy: { count: 1 } },
      totalTrips: 4,
      totalSouvenirs: 9,
      lastClaim: { count: 3, isleId: "sunsetVolcano", rewards: { catnip: 120, wood: 80, futurecoin: 6, minerals: 40 }, souvenirIds: ["sunsetPebble", "sunsetPebble", "lavaCandy"], at: 0 },
      recentLogs: ["【气球降落】2 号气球从「星砂灯塔岛」回来了，带回 2 件纪念品，快去草坪迎接", "【旅行徽章】纪念品图鉴登记 5 种，徽章升为「铜旅行章」"],
    },
  },
};

const VIEWPORTS = [
  { tag: "1440x900", width: 1440, height: 900 },
  { tag: "390x844", width: 390, height: 844 },
];

const report = { outDir, flyIsle: FLY_ISLE, viewports: {}, failures: [] };
const fail = (vp, msg) => {
  report.failures.push(`[${vp}] ${msg}`);
  console.error(`ml15-screens: FAIL [${vp}] ${msg}`);
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
    const attrIds = (attr, scope = "") =>
      page.evaluate(([a, sc]) => [...document.querySelectorAll(`${sc} [${a}]`.trim())].map((el) => Number(el.getAttribute(a))), [attr, scope]);
    const textOf = (sel) => page.evaluate((s) => document.querySelector(s)?.innerText || "", sel);

    // ---- load the crafted save ----
    await page.goto(`${base}/index.html`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.evaluate((save) => localStorage.setItem("mengling_idle_save_v1", JSON.stringify(save)), SAVE);
    await page.reload({ waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForSelector('#tab-functions[data-unlocked="1"]', { timeout: 20000 });
    await gotoTab("functions");
    await page.waitForSelector(".bakery-header", { timeout: 15000 });
    await page.waitForSelector(".balloon-header", { timeout: 15000 });
    await page.waitForFunction(
      () => [...document.querySelectorAll(".bakery-header img, .bakery-body img, .balloon-header img, .balloon-body img")].every((img) => img.complete && img.naturalWidth > 0),
      null,
      { timeout: 15000 },
    );

    // ---- Cloud Dessert Bakery ----
    await scrollToSel(".bakery-header");
    await shot("01-bakery");
    await shotSection("02-bakery-body", ".bakery-body");
    const bakeryTxt = await textOf(".bakery-body");
    for (const want of ["「彩虹云朵卷」", "预计品质 ★★", "甜点柜", "甜点食谱图鉴", "甜香满屋", "云朵奶油泡芙 ×2", "上次装盒"]) {
      if (!bakeryTxt.includes(want)) fail(vp.tag, `bakery body misses "${want}"`);
    }
    const workers = await attrIds("data-bakery-worker");
    if (workers.join() !== "2,1") fail(vp.tag, `bakery stations show ${workers.join()} (want 2,1)`);

    // ---- Rainbow Balloon Travel ----
    await scrollToSel(".balloon-header");
    await shot("03-balloon");
    await shotSection("04-balloon-body", ".balloon-body");
    const balloonTxt = await textOf(".balloon-body");
    for (const want of ["当前开放的空中群岛", "旅行纪念品图鉴与旅行章", "铜旅行章", "从「星砂灯塔岛」回来了", "星辰罗盘", "上次收取"]) {
      if (!balloonTxt.includes(want)) fail(vp.tag, `balloon body misses "${want}"`);
    }
    const phases = await page.evaluate(() => [...document.querySelectorAll("[data-balloon-phase]")].map((el) => el.getAttribute("data-balloon-phase")));
    if (phases.join() !== "flying,landed") fail(vp.tag, `balloon cards are ${phases.join()} (want flying,landed)`);

    await checkPageOverflow("functions");
    await checkContained("functions", [".bakery-header", ".bakery-body", ".balloon-header", ".balloon-body"]);
    await checkNotOccluded(
      ".bakery-header__btns .btn, .balloon-header__btns .btn, .bakery-station .btn, .bakery-dessert .btn, .bakery-recipe__foot .btn, .balloon-card__actions .btn",
    );

    // Scroll drift across live ticks (stage bar / buff countdown / flight bar patching)
    await scrollToSel(".bakery-body");
    const y0 = await scrollPos(".bakery-body");
    await page.waitForTimeout(1500);
    const y1 = await scrollPos(".bakery-body");
    vr.scrollDrift = y1 - y0;
    if (Math.abs(y1 - y0) > 1) fail(vp.tag, `scroll drift ${y0} -> ${y1}`);

    // ---- bakery picker: only partners at home; staffing the empty decoration station → ★3 preview ----
    await scrollToSel(".bakery-stations");
    await page.locator('button[data-bakery-open="decorate"]').click({ timeout: 10000 });
    await page.waitForSelector('[data-bakery-modal-overlay="1"]', { timeout: 10000 });
    await settle();
    await shot("05-bakery-modal");
    const bakeryPick = await attrIds("data-bakery-modal-pick");
    if (!bakeryPick.length || bakeryPick.some((id) => AWAY_IDS.includes(id))) fail(vp.tag, `bakery picker lists ${bakeryPick.join()} (away partners must be hidden)`);
    if (bakeryPick[0] !== 6) fail(vp.tag, `bakery picker should rank the matched 幻梦灵 (#6) first, got #${bakeryPick[0]}`);
    await checkContained("bakery-modal", ['[data-bakery-modal-overlay="1"] .modal']);
    await page.locator('button[data-bakery-modal-pick="6"]').click({ timeout: 10000 });
    await settle();
    const ovenLabel = await textOf(".bakery-oven__label");
    if (!ovenLabel.includes("★★★")) fail(vp.tag, `staffing the matched decorator should preview ★★★ (${ovenLabel})`);
    if ((await attrIds("data-bakery-worker")).join() !== "2,1,6") fail(vp.tag, "decorator #6 did not take the station");
    const BAKERS_NOW = [1, 2, 6];

    // ---- balloon: collect the landed balloon, then open the boarding picker for it ----
    await scrollToSel(".balloon-fleet");
    await page.locator('button[data-balloon-claim="1"]').click({ timeout: 10000 });
    await settle();
    const albumGot = await page.evaluate(() => document.querySelectorAll(".balloon-album__cell.is-got").length);
    if (albumGot < 8) fail(vp.tag, `collecting the landed balloon should register 2 more souvenirs (album ${albumGot})`);
    await scrollToSel(".balloon-fleet");
    await page.locator('button[data-balloon-open="1"]').click({ timeout: 10000 });
    await page.waitForSelector('[data-balloon-modal-overlay="1"]', { timeout: 10000 });
    await settle();
    await shot("06-balloon-modal");
    const awayNow = [...BAKERS_NOW, 4, 5];
    const balloonPick = await attrIds("data-balloon-modal-pick");
    if (!balloonPick.length || balloonPick.some((id) => awayNow.includes(id))) fail(vp.tag, `boarding picker lists ${balloonPick.join()} (away partners must be hidden)`);
    if (!balloonPick.includes(3)) fail(vp.tag, "the passenger who just came home (#3) should be able to board again");
    await checkContained("balloon-modal", ['[data-balloon-modal-overlay="1"] .modal']);
    const boardId = balloonPick[0];
    await page.locator(`button[data-balloon-modal-pick="${boardId}"]`).click({ timeout: 10000 });
    await settle();
    await page.locator('button[data-balloon-modal-go="1"]').click({ timeout: 10000 });
    await settle();
    const phases2 = await page.evaluate(() => [...document.querySelectorAll("[data-balloon-phase]")].map((el) => el.getAttribute("data-balloon-phase")));
    if (phases2.join() !== "flying,flying") fail(vp.tag, `after boarding both balloons should fly (${phases2.join()})`);
    await scrollToSel(".balloon-fleet");
    await shot("07-balloon-fleet");
    const AWAY_FINAL = [...BAKERS_NOW, 4, 5, boardId];

    // ---- unified exclusion: training picker ----
    await scrollToSel("button[data-train-open]");
    await page.locator("button[data-train-open]").first().click({ timeout: 10000 });
    await page.waitForSelector('[data-train-modal-overlay="1"]', { timeout: 10000 });
    await settle();
    const trainIds = await attrIds("data-train-modal-check");
    const trainDesc = await textOf('[data-train-modal-overlay="1"] .modal__desc');
    if (!trainIds.length || trainIds.some((id) => AWAY_FINAL.includes(id))) fail(vp.tag, `training picker lists away partners (${trainIds.join()})`);
    if (!trainDesc.includes(`已过滤 ${AWAY_FINAL.length} 只外出中的伙伴`) || !trainDesc.includes("烘焙、气球旅行")) fail(vp.tag, `training picker hint: ${trainDesc}`);
    await shot("08-training-modal");
    await page.locator("button[data-train-modal-close]").first().click({ timeout: 10000 });

    // ---- unified exclusion: expedition picker (+ persisted team sanitized) ----
    await scrollToSel("button[data-exp-team-open]");
    await page.locator("button[data-exp-team-open]").first().click({ timeout: 10000 });
    await page.waitForSelector('[data-exp-team-overlay="1"]', { timeout: 10000 });
    await settle();
    const expIds = await attrIds("data-exp-team-check");
    const expChecked = await page.evaluate(() => [...document.querySelectorAll("[data-exp-team-check]:checked")].map((el) => Number(el.getAttribute("data-exp-team-check"))));
    if (!expIds.length || expIds.some((id) => AWAY_FINAL.includes(id))) fail(vp.tag, `expedition picker lists away partners (${expIds.join()})`);
    if (expChecked.slice().sort().join() !== "8,9") fail(vp.tag, `persisted expedition team should drop the baker #1 (checked ${expChecked.join()})`);
    await page.locator("button[data-exp-team-close]").first().click({ timeout: 10000 });

    // ---- functions-tab Champion League modal: away partners cannot be ticked ----
    await scrollToSel(".champion-league-header");
    await page.locator("button[data-func-league-open-modal]").first().click({ timeout: 10000 });
    await page.waitForSelector('[data-func-league-modal-overlay="1"]', { timeout: 10000 });
    await settle();
    const funcLeague = await page.evaluate(() =>
      [...document.querySelectorAll("[data-func-league-check]")].map((el) => ({ id: Number(el.getAttribute("data-func-league-check")), disabled: el.disabled, checked: el.checked })),
    );
    for (const id of AWAY_FINAL) {
      const row = funcLeague.find((r) => r.id === id);
      if (row && !row.checked && !row.disabled) fail(vp.tag, `functions-tab league picker lets away partner #${id} be ticked`);
    }
    await shot("09-func-league-modal");
    await checkContained("func-league-modal", ['[data-func-league-modal-overlay="1"] .modal']);
    await page.locator("button[data-func-league-modal-close]").first().click({ timeout: 10000 });
    await checkPageOverflow("functions-after");

    // ---- PvE tab: league / corridor benches + pickers ----
    await gotoTab("pve");
    const leagueBench = page.locator(".champion-league-card .league-squad-bench").first();
    await leagueBench.waitFor({ timeout: 10000 });
    await scrollToSel(".champion-league-card .league-squad-bench");
    await shot("10-pve-league-bench");
    const leagueTxt = await leagueBench.innerText();
    if (!leagueTxt.includes("烘焙中 · 本场不出战")) fail(vp.tag, `league bench does not bench the baker: ${leagueTxt.replace(/\s+/g, " ").slice(0, 160)}`);
    await page.locator("button[data-pve-league-open-modal]").first().click({ timeout: 10000 });
    await page.waitForSelector('[data-pve-league-modal-overlay="1"]', { timeout: 10000 });
    await settle();
    const pveLeague = await page.evaluate(() =>
      [...document.querySelectorAll("[data-pve-league-check]")].map((el) => ({ id: Number(el.getAttribute("data-pve-league-check")), disabled: el.disabled, checked: el.checked })),
    );
    for (const id of AWAY_FINAL) {
      const row = pveLeague.find((r) => r.id === id);
      if (row && !row.checked && !row.disabled) fail(vp.tag, `PvE league picker lets away partner #${id} be ticked`);
    }
    await shot("11-pve-league-modal");
    await checkContained("pve-league-modal", ['[data-pve-league-modal-overlay="1"] .modal']);
    await page.locator("button[data-pve-league-modal-close]").first().click({ timeout: 10000 });
    await settle();

    const corridorBench = page.locator(".star-corridor-card .corridor-squad-bench").first();
    await corridorBench.waitFor({ timeout: 10000 });
    await scrollToSel(".star-corridor-card .corridor-squad-bench");
    await shot("12-pve-corridor-bench");
    const corridorTxt = await corridorBench.innerText();
    if (!corridorTxt.includes("气球旅行中 · 本场不出战")) fail(vp.tag, `corridor bench does not bench the traveller: ${corridorTxt.replace(/\s+/g, " ").slice(0, 160)}`);
    await page.locator("button[data-pve-corridor-open-modal]").first().click({ timeout: 10000 });
    await page.waitForSelector('[data-pve-corridor-modal-overlay="1"]', { timeout: 10000 });
    await settle();
    const pveCorr = await page.evaluate(() =>
      [...document.querySelectorAll("[data-pve-corridor-check]")].map((el) => ({ id: Number(el.getAttribute("data-pve-corridor-check")), disabled: el.disabled, checked: el.checked })),
    );
    for (const id of AWAY_FINAL) {
      const row = pveCorr.find((r) => r.id === id);
      if (row && !row.checked && !row.disabled) fail(vp.tag, `PvE corridor picker lets away partner #${id} be ticked`);
    }
    if (!pveCorr.find((r) => r.id === 4)?.checked) fail(vp.tag, "the travelling corridor member #4 keeps its seat (checked)");
    await shot("13-pve-corridor-modal");
    await checkContained("pve-corridor-modal", ['[data-pve-corridor-modal-overlay="1"] .modal']);
    await page.locator("button[data-pve-corridor-modal-close]").first().click({ timeout: 10000 });
    await checkPageOverflow("pve");

    // ---- Mons tab: release locks read the unified registry ----
    await gotoTab("mons");
    const locks = await page.evaluate((ids) => ids.map((id) => {
      const b = document.querySelector(`button[data-mon-release="${id}"]`);
      return b ? { id, disabled: b.disabled, title: b.getAttribute("title") || "" } : { id, missing: true };
    }), AWAY_FINAL);
    for (const l of locks) {
      if (l.missing) continue;
      const want = BAKERS_NOW.includes(l.id) ? "烘焙坊" : "彩虹气球";
      if (!l.disabled || !l.title.includes(want)) fail(vp.tag, `release button of #${l.id} not locked (${l.title})`);
    }
    vr.releaseLocks = locks;
    if (await page.locator('button[data-mon-release="1"]').count()) {
      await page.evaluate(() => {
        const b = document.querySelector('button[data-mon-release="1"]');
        b?.closest(".row, .mon-card, [data-mon-open]")?.setAttribute("data-ml15-shot", "1");
      });
      if (await page.locator('[data-ml15-shot="1"]').count()) await scrollToSel('[data-ml15-shot="1"]');
    }
    await shot("14-mons-locks");
    await checkPageOverflow("mons");

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
    offSave.meta.cloudBakery = { workers: { knead: 2, bake: 1, decorate: 6 }, recipeId: "cloudPuff", recipes: { cloudPuff: { baked: 1, bestQ: 3 } } };
    offSave.meta.balloonTravel = { balloons: [{ trip: { isleId: FLY_ISLE, passengerIds: [4, 5], phase: "flying", elapsedSec: 0 } }, { trip: null }] };
    await page.goto(`${base}/index.html`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.evaluate((save) => localStorage.setItem("mengling_idle_save_v1", JSON.stringify(save)), offSave);
    await page.reload({ waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForSelector('#tab-functions[data-unlocked="1"]', { timeout: 20000 });
    await page.locator("#tab-functions").click({ timeout: 10000 });
    await page.waitForSelector(".bakery-header", { timeout: 15000 });
    await page.waitForTimeout(400);
    // The event log only renders while expanded
    const logToggle = page.locator("#logToggle");
    if ((await logToggle.count()) && (await logToggle.innerText()).includes("展开")) await logToggle.click({ timeout: 10000 });
    await page.waitForTimeout(600);
    const logTxt = await page.evaluate(() => document.getElementById("log")?.textContent || "");
    const caseTxt = await page.evaluate(() => document.querySelector(".bakery-header")?.innerText || "");
    const caseN = Number((caseTxt.match(/甜点柜 (\d+)\/12/) || [])[1] || 0);
    const landed = await page.evaluate(() => document.querySelectorAll('[data-balloon-phase="landed"]').length);
    vr.offline = { caseN, landed, logHasBakery: logTxt.includes("炉甜点出炉"), logHasBalloon: logTxt.includes("号气球从"), logHead: logTxt.slice(0, 600) };
    if (!(caseN >= 4)) fail(tag, `2h offline should bake several desserts (showcase ${caseN})`);
    if (landed !== 1) fail(tag, `2h offline should land the balloon (${landed} landed)`);
    if (!logTxt.includes("云朵甜点烘焙坊：") || !logTxt.includes("炉甜点出炉")) fail(tag, "offline tick did not log the bakery batches");
    if (!logTxt.includes("彩虹气球旅行：") || !logTxt.includes("号气球从")) fail(tag, "offline tick did not log the balloon landing");
    await page.evaluate(() => document.querySelector(".bakery-header")?.scrollIntoView({ block: "start" }));
    await page.waitForTimeout(250);
    const file = path.join(outDir, `1440x900-15-offline-catchup.png`);
    await page.screenshot({ path: file });
    vr.shots.push(file);
    if (vr.consoleErrors.length) fail(tag, `console errors: ${vr.consoleErrors.join(" | ")}`);
    await context.close();
  }
} catch (err) {
  report.failures.push(`exception: ${err?.stack || err}`);
  console.error("ml15-screens: FAIL exception", err);
} finally {
  if (browser) await browser.close().catch(() => {});
  await new Promise((resolve) => server.close(() => resolve()));
  writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));
}

const shots = Object.values(report.viewports).reduce((n, v) => n + v.shots.length, 0);
if (report.failures.length) {
  console.error(`ml15-screens: ${report.failures.length} failure(s); ${shots} screenshot(s) in ${outDir}`);
  process.exitCode = 1;
} else {
  console.log(`ml15-screens: OK — ${shots} screenshots, 0 overflow / occlusion / console errors → ${outDir}`);
}
