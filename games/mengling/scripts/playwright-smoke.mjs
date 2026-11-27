#!/usr/bin/env node
/**
 * Browser smoke via local static server + Playwright.
 * SKIP exit 0 when playwright is not installed (local dev without npm ci).
 */
import { createRequire } from "node:module";
import http from "node:http";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

let playwright;
try {
  playwright = require("playwright");
} catch {
  console.log("playwright-smoke: SKIP (playwright not installed)");
  process.exit(0);
}

const indexPath = path.join(root, "index.html");
if (!existsSync(indexPath)) {
  console.error("playwright-smoke: FAIL missing index.html");
  process.exit(1);
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

function startServer() {
  const server = http.createServer((req, res) => {
    let urlPath = (req.url || "/").split("?")[0];
    if (urlPath === "/") urlPath = "/index.html";
    const file = path.normalize(path.join(root, urlPath.replace(/^\//, "")));
    if (!file.startsWith(path.normalize(root)) || !existsSync(file)) {
      res.writeHead(404);
      res.end("not found");
      return;
    }
    const ext = path.extname(file).toLowerCase();
    const type = MIME[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
    res.end(readFileSync(file));
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      resolve({ server, base: `http://127.0.0.1:${addr.port}` });
    });
  });
}

const { server, base } = await startServer();
const { chromium } = playwright;
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`${base}/index.html`, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForSelector("#btnGather", { timeout: 30000 });
  const title = await page.title();
  const status = await page.locator("#topbarStatus").innerText();
  if (!title.includes("萌灵")) {
    console.error("playwright-smoke: FAIL unexpected title:", title);
    process.exit(1);
  }
  if (!status.includes("v0.7.63")) {
    console.error("playwright-smoke: FAIL unexpected topbar:", status);
    process.exit(1);
  }

  await page.locator("#tab-capture").click({ timeout: 10000 });
  await page.waitForFunction(
    () => {
      const p = document.getElementById("panel-capture");
      return p && !p.hasAttribute("hidden") && p.classList.contains("is-active");
    },
    null,
    { timeout: 15000 }
  );
  const captureEncounter = await page.locator("#captureActions .row__title", { hasText: "遭遇" }).count();
  const captureLocked = await page.locator("#captureActions", { hasText: "灵球基础" }).count();
  if (captureEncounter < 1 && captureLocked < 1) {
    console.error("playwright-smoke: FAIL capture tab unexpected empty state");
    process.exit(1);
  }

  const pveTab = page.locator("#tab-pve");
  const pveVisible = await pveTab.isVisible().catch(() => false);
  if (pveVisible) {
    await pveTab.click();
    await page.waitForFunction(
      () => {
        const p = document.getElementById("panel-pve");
        return p && !p.hasAttribute("hidden") && p.classList.contains("is-active");
      },
      null,
      { timeout: 15000 }
    );
    const pveTitle = await page.locator("#pveList .row__title").first().innerText().catch(() => "");
    if (!pveTitle.includes("PvE") && !pveTitle.includes("挑战")) {
      console.error("playwright-smoke: FAIL pve tab missing challenge list:", pveTitle);
      process.exit(1);
    }
  } else {
    console.log("playwright-smoke: pve tab locked (fresh save) — capture path OK");
  }

  await page.evaluate(() => {
    localStorage.setItem(
      "mengling_idle_save_v1",
      JSON.stringify({
        version: 3,
        unlocks: { pokeball: true },
        dex: { caught: { p001: 1, p002: 1, p003: 1, p006: 1, p009: 1, p025: 1 } },
        tech: { pokeballBasic: true, trainingBasic: true, expeditionBasic: true },
        res: {
          pokeball: { value: 5, cap: 50 },
          catnip: { value: 180, cap: 200 },
          wood: { value: 110, cap: 120 },
          minerals: { value: 80, cap: 90 },
          futurecoin: { value: 260, cap: 99999 },
          tuningMint: { value: 3, cap: 999 },
          shinyStarSand: { value: 0, cap: 9999 },
          ancientGeneAmber: { value: 0, cap: 9999 },
          corridorStarMedals: { value: 0, cap: 9999 },
          driftBottle: { value: 0, cap: 999 },
          fireflyLantern: { value: 6, cap: 999 },
          mapFragment: { value: 6, cap: 99 },
        },
        mons: {
          nextId: 6,
          list: [
            {
              id: 1,
              dex: 6,
              pid: "p006",
              name: "炽翼炎龙",
              lvl: 82,
              stars: 3,
              types: ["fire", "wind"],
              ability: "blaze",
              nature: "modest",
              mintTuning: { up: "spa", down: "atk" },
              baseStats: { hp: 92, atk: 84, def: 82, spa: 118, spd: 92, spe: 108 },
              iv: { hp: 14, atk: 12, def: 12, spa: 15, spd: 13, spe: 15 },
            },
            {
              id: 2,
              dex: 9,
              pid: "p009",
              name: "沧澜重龟",
              lvl: 80,
              stars: 3,
              types: ["water"],
              ability: "torrent",
              nature: "bold",
              mintTuning: { up: "spa", down: "atk" },
              baseStats: { hp: 95, atk: 83, def: 108, spa: 102, spd: 110, spe: 86 },
              iv: { hp: 14, atk: 10, def: 14, spa: 14, spd: 14, spe: 12 },
            },
            {
              id: 3,
              dex: 3,
              pid: "p003",
              name: "花蓬蓬",
              lvl: 80,
              stars: 3,
              types: ["grass", "wind"],
              ability: "harvest",
              nature: "timid",
              mintTuning: { up: "spa", down: "atk" },
              baseStats: { hp: 90, atk: 82, def: 88, spa: 112, spd: 108, spe: 96 },
              iv: { hp: 14, atk: 10, def: 13, spa: 15, spd: 14, spe: 14 },
            },
            {
              id: 4,
              dex: 25,
              pid: "p025",
              name: "雷光鼠",
              lvl: 80,
              stars: 3,
              types: ["electric", "light"],
              ability: "static",
              nature: "timid",
              mintTuning: { up: "spa", down: "atk" },
              baseStats: { hp: 85, atk: 82, def: 78, spa: 108, spd: 92, spe: 118 },
              iv: { hp: 14, atk: 11, def: 12, spa: 15, spd: 13, spe: 15 },
            },
          ],
        },
      })
    );
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.reload({ waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector('#tab-functions[data-unlocked="1"]', { timeout: 15000 });
  await page.locator("#tab-functions").click({ timeout: 10000 });
  await page.waitForFunction(
    () => {
      const p = document.getElementById("panel-functions");
      return p && !p.hasAttribute("hidden") && p.classList.contains("is-active");
    },
    null,
    { timeout: 15000 }
  );
  const funcText = await page.locator("#panel-functions").innerText();
  if (
    !funcText.includes("外出归来 · 一键收取") ||
    !funcText.includes("云端游乐园") ||
    !funcText.includes("星空露营观测") ||
    !funcText.includes("云朵甜点烘焙坊") ||
    !funcText.includes("彩虹气球旅行") ||
    !funcText.includes("梦境绘本馆") ||
    !funcText.includes("溪畔钓鱼会") ||
    !funcText.includes("温泉疗愈乡") ||
    !funcText.includes("萌灵邮局信使网络") ||
    !funcText.includes("寻宝地图远航") ||
    !funcText.includes("萌灵乐队合奏音乐会") ||
    !funcText.includes("云顶浮空岛建造") ||
    !funcText.includes("季节迁徙候鸟萌灵") ||
    !funcText.includes("月光夜行生态观察站") ||
    !funcText.includes("萌灵杂技舞台表演赛") ||
    !funcText.includes("星海漂流瓶心愿码头") ||
    !funcText.includes("远古琥珀基因复苏所") ||
    !funcText.includes("星辉配饰流彩造型屋") ||
    !funcText.includes("星冠殿堂挑战赛") ||
    !funcText.includes("星界羁绊露营野餐屋") ||
    !funcText.includes("料理食谱风味增益工坊") ||
    !funcText.includes("秘境生态探索沙盘") ||
    !funcText.includes("性格薄荷定向调律工坊")
  ) {
    console.error("playwright-smoke: FAIL functions tab missing ML-16 Collect Panel/Cloud Park/Stargaze Camp, ML-15 Cloud Bakery/Balloon Travel, ML-14 Dream Library/Fishing Club, ML-13 Hot Spring/Post Office, ML-12 Treasure Voyage/Band, ML-11 Sky Island/Migration, ML-10 Observatory/Show, ML-9 Wish Dock, ML-8 Amber Lab, ML-7 Boutique/League, ML-6 Camp/Cuisine, or ML-5 Sandbox/Mint");
    process.exit(1);
  }

  // Interactive ML-10 Acrobat Stage Show: one-click routine → perform → scored result card + trophy cabinet
  await page.locator('button[data-show-autofill="1"]').first().click({ timeout: 10000 });
  const routineSlots = await page.evaluate(() => document.querySelectorAll(".show-slot.is-filled").length);
  if (routineSlots < 3) {
    console.error(`playwright-smoke: FAIL Acrobat Show autofill filled ${routineSlots}/3 routine slots`);
    process.exit(1);
  }
  await page.locator('button[data-show-perform="plain"]').click({ timeout: 10000 });
  const afterShowTxt = await page.locator("#panel-functions").innerText();
  if (!/\d+ 分 · (铜星|银星|金星|璀璨星光|未入围)/.test(afterShowTxt) || !afterShowTxt.includes("舞台星光奖杯陈列柜")) {
    console.error("playwright-smoke: FAIL Acrobat Show perform did not show a scored result card");
    process.exit(1);
  }

  // Interactive ML-10 Moonlit Observatory: station 3 observers (release lock) → free lantern patrol → journal entries
  await page.locator('button[data-night-autofill="1"]').first().click({ timeout: 10000 });
  const stationedIds = await page.evaluate(() =>
    [...document.querySelectorAll("button[data-night-recall]")].map((b) => Number(b.getAttribute("data-night-recall"))),
  );
  if (stationedIds.length !== 3) {
    console.error(`playwright-smoke: FAIL Observatory autofill stationed ${stationedIds.length}/3 observers`);
    process.exit(1);
  }
  await page.locator('button[data-night-patrol="1"]').click({ timeout: 10000 });
  const afterPatrolTxt = await page.locator("#panel-functions").innerText();
  if (!afterPatrolTxt.includes("记录 · ") || !afterPatrolTxt.includes("观测中 · 本场不登台")) {
    console.error("playwright-smoke: FAIL Observatory patrol did not write journal entries or stage did not bench observers");
    process.exit(1);
  }
  // Release lock on the Mons tab for stationed observers
  await page.locator("#tab-mons").click({ timeout: 10000 });
  await page.waitForFunction(
    () => {
      const p = document.getElementById("panel-mons");
      return p && !p.hasAttribute("hidden") && p.classList.contains("is-active");
    },
    null,
    { timeout: 15000 }
  );
  await page.waitForTimeout(300);
  const releaseLock = await page.evaluate((ids) => {
    return ids.map((id) => {
      const b = document.querySelector(`button[data-mon-release="${id}"]`);
      return b ? (b.disabled ? "locked" : "open") : "missing";
    });
  }, stationedIds);
  if (releaseLock.some((s) => s !== "locked")) {
    console.error(`playwright-smoke: FAIL stationed observers are releasable (${releaseLock.join(",")})`);
    process.exit(1);
  }
  await page.locator("#tab-functions").click({ timeout: 10000 });
  await page.waitForFunction(
    () => {
      const p = document.getElementById("panel-functions");
      return p && !p.hasAttribute("hidden") && p.classList.contains("is-active");
    },
    null,
    { timeout: 15000 }
  );
  for (const id of stationedIds) {
    await page.locator(`button[data-night-recall="${id}"]`).click({ timeout: 10000 });
  }
  const leftStationed = await page.evaluate(() => document.querySelectorAll("button[data-night-recall]").length);
  if (leftStationed !== 0) {
    console.error(`playwright-smoke: FAIL Observatory recall left ${leftStationed} observers stationed`);
    process.exit(1);
  }

  // Interactive ML-11 Cloudtop Sky Island: open a Lv.1 cloud-field site → 3-partner crew (release lock + stage bench) → free rally finishes it → recall
  await page.locator('button[data-island-build="cloudField"]').click({ timeout: 10000 });
  const siteOpenTxt = await page.evaluate(() => document.querySelector(".sky-site-banner")?.innerText || "");
  if (!siteOpenTxt.includes("云海灵田") || !siteOpenTxt.includes("工地停工中")) {
    console.error("playwright-smoke: FAIL Sky Island did not open a paused cloud-field site");
    process.exit(1);
  }
  await page.locator('button[data-island-autofill="1"]').first().click({ timeout: 10000 });
  const crewIds = await page.evaluate(() =>
    [...document.querySelectorAll("button[data-island-recall]")].map((b) => Number(b.getAttribute("data-island-recall"))),
  );
  if (crewIds.length !== 3) {
    console.error(`playwright-smoke: FAIL Sky Island autofill assigned ${crewIds.length}/3 builders`);
    process.exit(1);
  }
  const crewBenchTxt = await page.locator("#panel-functions").innerText();
  if (!crewBenchTxt.includes("出工速度 ×") || !crewBenchTxt.includes("建造中 · 本场不登台")) {
    console.error("playwright-smoke: FAIL Sky Island crew speed missing or stage did not bench builders");
    process.exit(1);
  }
  await page.locator("#tab-mons").click({ timeout: 10000 });
  await page.waitForFunction(
    () => {
      const p = document.getElementById("panel-mons");
      return p && !p.hasAttribute("hidden") && p.classList.contains("is-active");
    },
    null,
    { timeout: 15000 }
  );
  await page.waitForTimeout(300);
  const crewLock = await page.evaluate((ids) => {
    return ids.map((id) => {
      const b = document.querySelector(`button[data-mon-release="${id}"]`);
      return b ? (b.disabled ? "locked" : "open") : "missing";
    });
  }, crewIds);
  if (crewLock.some((s) => s !== "locked")) {
    console.error(`playwright-smoke: FAIL sky-island builders are releasable (${crewLock.join(",")})`);
    process.exit(1);
  }
  await page.locator("#tab-functions").click({ timeout: 10000 });
  await page.waitForFunction(
    () => {
      const p = document.getElementById("panel-functions");
      return p && !p.hasAttribute("hidden") && p.classList.contains("is-active");
    },
    null,
    { timeout: 15000 }
  );
  await page.locator('button[data-island-rally="1"]').click({ timeout: 10000 });
  const fieldLv = await page.evaluate(() => document.querySelector('[data-sky-facility="cloudField"] .tag')?.textContent || "");
  const siteIdle = await page.evaluate(() => Boolean(document.querySelector(".sky-site-banner.is-idle")));
  if (!fieldLv.includes("Lv.1/5") || !siteIdle) {
    console.error(`playwright-smoke: FAIL Sky Island rally did not finish the cloud field (${fieldLv})`);
    process.exit(1);
  }
  for (const id of crewIds) {
    await page.locator(`button[data-island-recall="${id}"]`).click({ timeout: 10000 });
  }
  const leftCrew = await page.evaluate(() => document.querySelectorAll("button[data-island-recall]").length);
  if (leftCrew !== 0) {
    console.error(`playwright-smoke: FAIL Sky Island recall left ${leftCrew} builders on site`);
    process.exit(1);
  }

  // Interactive ML-11 Seasonal Migration: welcome this season's visitor onto the perch → free feed writes an observation record
  await page.locator('button[data-migration-autohost="1"]').click({ timeout: 10000 });
  const hostedCount = await page.evaluate(() => document.querySelectorAll(".migrant-card.is-hosted").length);
  if (hostedCount < 1) {
    console.error("playwright-smoke: FAIL Migration auto-host did not seat a visitor");
    process.exit(1);
  }
  await page.locator('button[data-migration-feed="1"]').click({ timeout: 10000 });
  const afterFeedTxt = await page.evaluate(() => document.querySelector(".migration-body")?.innerText || "");
  if (!afterFeedTxt.includes("驻留观察记录 +1") || !/本季记录 \d+\/8 条/.test(afterFeedTxt)) {
    console.error("playwright-smoke: FAIL Migration feed did not write an observation record");
    process.exit(1);
  }

  // Interactive ML-12 Treasure Map Voyage: assemble a map → auto crew → set sail (release lock + stage bench) → gull arrival → explore a tile → auto-explore home
  const gotoTab = async (tab) => {
    await page.locator(`#tab-${tab}`).click({ timeout: 10000 });
    await page.waitForFunction(
      (id) => {
        const p = document.getElementById(`panel-${id}`);
        return p && !p.hasAttribute("hidden") && p.classList.contains("is-active");
      },
      tab,
      { timeout: 15000 }
    );
    await page.waitForTimeout(300);
  };
  await page.locator('button[data-treasure-assemble="1"]').click({ timeout: 10000 });
  const mapTxt = await page.evaluate(() => document.querySelector(".treasure-header")?.innerText || "");
  if (!mapTxt.includes("藏宝图 ×1/5")) {
    console.error("playwright-smoke: FAIL Treasure Voyage did not assemble a treasure map", mapTxt.slice(0, 200));
    process.exit(1);
  }
  await page.locator('button[data-treasure-autocrew="1"]').first().click({ timeout: 10000 });
  const stagedCrew = await page.evaluate(() => document.querySelectorAll(".voyage-crew-slot.is-filled").length);
  if (stagedCrew !== 3) {
    console.error(`playwright-smoke: FAIL Treasure Voyage auto crew staged ${stagedCrew}/3`);
    process.exit(1);
  }
  await page.locator('button[data-treasure-sail="palmCove"]').click({ timeout: 10000 });
  const voyageCrewIds = await page.evaluate(() => [...document.querySelectorAll("[data-voyage-crew]")].map((el) => Number(el.getAttribute("data-voyage-crew"))));
  const sailingOk = await page.evaluate(() => Boolean(document.querySelector(".voyage-sail-banner [data-treasure-sail-fill]")));
  if (!sailingOk || voyageCrewIds.length !== 3) {
    console.error(`playwright-smoke: FAIL Treasure Voyage did not set sail (crew ${voyageCrewIds.length})`);
    process.exit(1);
  }
  const voyageBenchTxt = await page.locator("#panel-functions").innerText();
  if (!voyageBenchTxt.includes("寻宝远航中 · 本场不登台")) {
    console.error("playwright-smoke: FAIL stage did not bench the voyage crew");
    process.exit(1);
  }
  await gotoTab("mons");
  const voyageLock = await page.evaluate((ids) => ids.map((id) => {
    const b = document.querySelector(`button[data-mon-release="${id}"]`);
    return b ? (b.disabled && (b.getAttribute("title") || "").includes("寻宝") ? "locked" : "open") : "missing";
  }), voyageCrewIds);
  if (voyageLock.some((x) => x !== "locked")) {
    console.error(`playwright-smoke: FAIL voyage crew are releasable (${voyageLock.join(",")})`);
    process.exit(1);
  }
  await gotoTab("functions");
  await page.locator('button[data-treasure-gull="1"]').click({ timeout: 10000 });
  const frontierCount = await page.evaluate(() => document.querySelectorAll("button[data-treasure-tile]").length);
  if (frontierCount !== 3) {
    console.error(`playwright-smoke: FAIL gull assist did not land the crew on the island grid (frontier ${frontierCount})`);
    process.exit(1);
  }
  await page.locator('button[data-treasure-tile]').first().click({ timeout: 10000 });
  const revealedCount = await page.evaluate(() => document.querySelectorAll(".treasure-tile.is-revealed").length);
  if (revealedCount !== 2) {
    console.error(`playwright-smoke: FAIL exploring a tile revealed ${revealedCount} tiles`);
    process.exit(1);
  }
  await page.locator('button[data-treasure-auto="1"]').click({ timeout: 10000 });
  const voyageDoneTxt = await page.evaluate(() => document.querySelector(".treasure-body")?.innerText || "");
  if (!voyageDoneTxt.includes("上次远航「椰影珊瑚岛」")) {
    console.error("playwright-smoke: FAIL auto-explore did not bring the crew home with a voyage summary");
    process.exit(1);
  }
  await gotoTab("mons");
  const voyageUnlock = await page.evaluate((ids) => ids.map((id) => {
    const b = document.querySelector(`button[data-mon-release="${id}"]`);
    return b ? (b.disabled && (b.getAttribute("title") || "").includes("寻宝") ? "locked" : "open") : "missing";
  }), voyageCrewIds);
  if (voyageUnlock.some((x) => x === "locked")) {
    console.error(`playwright-smoke: FAIL returned voyage crew are still locked (${voyageUnlock.join(",")})`);
    process.exit(1);
  }
  await gotoTab("functions");

  // Interactive ML-12 Band Ensemble Concert: one-click lineup → compose (feel rule met) → toggle a beat → perform → tour trophy cabinet
  await page.locator('button[data-band-autofill="1"]').click({ timeout: 10000 });
  const bandFilled = await page.evaluate(() => document.querySelectorAll(".band-part.is-filled").length);
  if (bandFilled !== 4) {
    console.error(`playwright-smoke: FAIL band autofill filled ${bandFilled}/4 parts`);
    process.exit(1);
  }
  await page.locator('button[data-band-compose="1"]').click({ timeout: 10000 });
  const feelOk = await page.evaluate(() => Boolean(document.querySelector(".band-rule.is-feel.is-ok")));
  if (!feelOk) {
    console.error("playwright-smoke: FAIL band compose did not meet the stop's feel rule");
    process.exit(1);
  }
  const beatBefore = await page.evaluate(() => document.querySelector('button[data-band-beat="3"]')?.className || "");
  await page.locator('button[data-band-beat="3"]').click({ timeout: 10000 });
  const beatAfter = await page.evaluate(() => document.querySelector('button[data-band-beat="3"]')?.className || "");
  if (beatBefore === beatAfter) {
    console.error("playwright-smoke: FAIL clicking a beat did not toggle it");
    process.exit(1);
  }
  await page.locator('button[data-band-beat="3"]').click({ timeout: 10000 });
  await page.locator('button[data-band-beat="3"]').click({ timeout: 10000 });
  await page.locator('button[data-band-perform="1"]').click({ timeout: 10000 });
  const bandResultTxt = await page.evaluate(() => document.querySelector(".band-body")?.innerText || "");
  if (!/\d+ 分 · (铜音|银音|金音|满堂喝彩|未入围)/.test(bandResultTxt) || !bandResultTxt.includes("巡演奖杯陈列柜")) {
    console.error("playwright-smoke: FAIL band concert did not show a scored result card");
    process.exit(1);
  }

  // Interactive ML-13 Hot Spring: one-click soak (release lock + stage bench) → free hot towel lights the timed states → everyone out
  await page.locator('button[data-spring-autofill="1"]').click({ timeout: 10000 });
  const soakIds = await page.evaluate(() => [...document.querySelectorAll("[data-spring-soaker]")].map((el) => Number(el.getAttribute("data-spring-soaker"))));
  if (soakIds.length < 2) {
    console.error(`playwright-smoke: FAIL Hot Spring auto-fill seated ${soakIds.length} soakers`);
    process.exit(1);
  }
  const soakBenchTxt = await page.locator("#panel-functions").innerText();
  if (!soakBenchTxt.includes("泡汤中 · 本场不登台")) {
    console.error("playwright-smoke: FAIL stage did not bench the soakers");
    process.exit(1);
  }
  await gotoTab("mons");
  const soakLock = await page.evaluate((ids) => ids.map((id) => {
    const b = document.querySelector(`button[data-mon-release="${id}"]`);
    return b ? (b.disabled && (b.getAttribute("title") || "").includes("温泉") ? "locked" : "open") : "missing";
  }), soakIds);
  if (soakLock.some((x) => x !== "locked")) {
    console.error(`playwright-smoke: FAIL soakers are releasable (${soakLock.join(",")})`);
    process.exit(1);
  }
  await gotoTab("functions");
  await page.locator('button[data-spring-towel="1"]').click({ timeout: 10000 });
  const statesOn = await page.evaluate(() => document.querySelectorAll(".spring-state.is-on").length);
  const towelTxt = await page.evaluate(() => document.querySelector(".spring-body")?.innerText || "");
  if (statesOn < 1 || !towelTxt.includes("热毛巾招待")) {
    console.error(`playwright-smoke: FAIL hot towel did not light a timed state (${statesOn})`);
    process.exit(1);
  }
  await page.locator('button[data-spring-recall="1"]').click({ timeout: 10000 });
  const leftSoak = await page.evaluate(() => document.querySelectorAll("[data-spring-soaker]").length);
  const statesKept = await page.evaluate(() => document.querySelectorAll(".spring-state.is-on").length);
  if (leftSoak !== 0 || statesKept < 1) {
    console.error(`playwright-smoke: FAIL 全部出浴 left ${leftSoak} soakers or dropped the timed states (${statesKept})`);
    process.exit(1);
  }

  // Interactive ML-13 Post Office: one-click dispatch (release lock) → free express → open every reply → postmarks stamped → lock lifted
  await page.locator('button[data-post-autodispatch="1"]').click({ timeout: 10000 });
  const messengerIds = await page.evaluate(() => [...document.querySelectorAll("[data-post-messenger]")].map((el) => Number(el.getAttribute("data-post-messenger"))));
  if (messengerIds.length < 1 || !(await page.evaluate(() => Boolean(document.querySelector("[data-post-fill]"))))) {
    console.error(`playwright-smoke: FAIL Post Office auto-dispatch sent ${messengerIds.length} messengers`);
    process.exit(1);
  }
  await gotoTab("mons");
  const postLock = await page.evaluate((ids) => ids.map((id) => {
    const b = document.querySelector(`button[data-mon-release="${id}"]`);
    return b ? (b.disabled && (b.getAttribute("title") || "").includes("邮局") ? "locked" : "open") : "missing";
  }), messengerIds);
  if (postLock.some((x) => x !== "locked")) {
    console.error(`playwright-smoke: FAIL messengers are releasable (${postLock.join(",")})`);
    process.exit(1);
  }
  await gotoTab("functions");
  await page.locator('button[data-post-express="1"]').click({ timeout: 10000 });
  const backCount = await page.evaluate(() => document.querySelectorAll("button[data-post-claim]").length);
  if (backCount !== messengerIds.length) {
    console.error(`playwright-smoke: FAIL express brought back ${backCount}/${messengerIds.length} messengers`);
    process.exit(1);
  }
  await page.locator('button[data-post-claim-all="1"]').click({ timeout: 10000 });
  const postTxt = await page.evaluate(() => document.querySelector(".post-body")?.innerText || "");
  const stamped = await page.evaluate(() => document.querySelectorAll(".post-album__stamp.tier-1").length);
  if (!postTxt.includes("的回信") || stamped < messengerIds.length) {
    console.error(`playwright-smoke: FAIL opening replies did not show a letter or stamp postmarks (${stamped})`);
    process.exit(1);
  }
  await gotoTab("mons");
  const postUnlock = await page.evaluate((ids) => ids.map((id) => {
    const b = document.querySelector(`button[data-mon-release="${id}"]`);
    return b ? (b.disabled && (b.getAttribute("title") || "").includes("邮局") ? "locked" : "open") : "missing";
  }), messengerIds);
  if (postUnlock.some((x) => x === "locked")) {
    console.error(`playwright-smoke: FAIL messengers stay locked after their replies were opened (${postUnlock.join(",")})`);
    process.exit(1);
  }
  await gotoTab("functions");

  // Interactive ML-14 Dream Library: one-click dream (release lock + stage bench via the unified away registry) → bedtime story → wake everyone
  const releaseLockOf = (ids, word) =>
    page.evaluate(
      ([list, w]) =>
        list.map((id) => {
          const b = document.querySelector(`button[data-mon-release="${id}"]`);
          return b ? (b.disabled && (b.getAttribute("title") || "").includes(w) ? "locked" : "open") : "missing";
        }),
      [ids, word],
    );
  await page.locator('button[data-dream-autofill="1"]').click({ timeout: 10000 });
  const dreamIds = await page.evaluate(() => [...document.querySelectorAll("[data-dream-writer]")].map((el) => Number(el.getAttribute("data-dream-writer"))));
  if (dreamIds.length < 2) {
    console.error(`playwright-smoke: FAIL Dream Library auto-fill put ${dreamIds.length} partners to sleep`);
    process.exit(1);
  }
  const dreamBenchTxt = await page.locator("#panel-functions").innerText();
  if (!dreamBenchTxt.includes("入梦中 · 本场不登台")) {
    console.error("playwright-smoke: FAIL stage did not bench the dreamers");
    process.exit(1);
  }
  await gotoTab("mons");
  const dreamLock = await releaseLockOf(dreamIds, "绘本馆");
  if (dreamLock.some((x) => x !== "locked")) {
    console.error(`playwright-smoke: FAIL dreamers are releasable (${dreamLock.join(",")})`);
    process.exit(1);
  }
  await gotoTab("functions");
  await page.locator('button[data-dream-story="1"]').click({ timeout: 10000 });
  const dreamTxt = await page.evaluate(() => document.querySelector(".dream-body")?.innerText || "");
  const inkTxt = await page.evaluate(() => document.querySelector("[data-dream-ink-txt]")?.textContent || "");
  if (!dreamTxt.includes("晚安朗读") || !/灵感 1[89]\d\//.test(inkTxt)) {
    console.error(`playwright-smoke: FAIL bedtime story did not add inspiration (${inkTxt})`);
    process.exit(1);
  }
  await page.locator('button[data-dream-wake-all="1"]').click({ timeout: 10000 });
  if ((await page.evaluate(() => document.querySelectorAll("[data-dream-writer]").length)) !== 0) {
    console.error("playwright-smoke: FAIL 全部醒来 left dreamers on the pillows");
    process.exit(1);
  }

  // Interactive ML-14 Fishing Club: pick anglers (release lock) → free chum fills the creel and the catch dex → claim the creel → reel in
  await page.locator('button[data-fish-autopick="1"]').click({ timeout: 10000 });
  const anglerIds = await page.evaluate(() => [...document.querySelectorAll("[data-fish-angler]")].map((el) => Number(el.getAttribute("data-fish-angler"))));
  if (anglerIds.length < 1) {
    console.error("playwright-smoke: FAIL Fishing Club auto-pick seated no anglers");
    process.exit(1);
  }
  await gotoTab("mons");
  const fishLock = await releaseLockOf(anglerIds, "钓鱼会");
  if (fishLock.some((x) => x !== "locked")) {
    console.error(`playwright-smoke: FAIL anglers are releasable (${fishLock.join(",")})`);
    process.exit(1);
  }
  await gotoTab("functions");
  await page.locator('button[data-fish-chum="1"]').click({ timeout: 10000 });
  const dexCaught = await page.evaluate(() => document.querySelectorAll(".fish-dex__cell.is-caught").length);
  const claimLabel = await page.locator('button[data-fish-claim="1"]').innerText();
  if (dexCaught < 1 || !claimLabel.includes(`（${anglerIds.length}）`)) {
    console.error(`playwright-smoke: FAIL chum did not land a fish per angler (dex ${dexCaught}, ${claimLabel})`);
    process.exit(1);
  }
  await page.locator('button[data-fish-claim="1"]').click({ timeout: 10000 });
  const fishTxt = await page.evaluate(() => document.querySelector(".fish-body")?.innerText || "");
  if (!fishTxt.includes("上次收鱼篓")) {
    console.error("playwright-smoke: FAIL claiming the creel did not show the haul");
    process.exit(1);
  }
  await page.locator('button[data-fish-recall="1"]').click({ timeout: 10000 });
  await gotoTab("mons");
  const fishUnlock = await releaseLockOf(anglerIds, "钓鱼会");
  if (fishUnlock.some((x) => x === "locked")) {
    console.error(`playwright-smoke: FAIL anglers stay locked after reeling in (${fishUnlock.join(",")})`);
    process.exit(1);
  }
  await gotoTab("functions");

  // Interactive ML-15 Cloud Dessert Bakery: one-click staffing (release lock via the unified away registry) → free rush bakes a dessert → eat it (timed buff) → everybody off duty
  await page.locator('button[data-bakery-autostaff="1"]').click({ timeout: 10000 });
  const bakerIds = await page.evaluate(() => [...document.querySelectorAll("[data-bakery-worker]")].map((el) => Number(el.getAttribute("data-bakery-worker"))));
  if (bakerIds.length < 1) {
    console.error("playwright-smoke: FAIL Cloud Bakery auto-staff put nobody on a station");
    process.exit(1);
  }
  await gotoTab("mons");
  const bakerLock = await releaseLockOf(bakerIds, "烘焙坊");
  if (bakerLock.some((x) => x !== "locked")) {
    console.error(`playwright-smoke: FAIL bakers are releasable (${bakerLock.join(",")})`);
    process.exit(1);
  }
  await gotoTab("functions");
  await page.locator('button[data-bakery-rush="1"]').click({ timeout: 10000 });
  const dessertN = await page.evaluate(() => document.querySelectorAll("[data-bakery-dessert]").length);
  const boxLabel = await page.locator('button[data-bakery-box="1"]').innerText();
  if (dessertN < 1 || !boxLabel.includes("（1）")) {
    console.error(`playwright-smoke: FAIL free rush did not bake a dessert (${dessertN}, ${boxLabel})`);
    process.exit(1);
  }
  await page.locator("button[data-bakery-eat]").first().click({ timeout: 10000 });
  const buffOn = await page.evaluate(() => document.querySelectorAll(".bakery-buff.is-on").length);
  if (buffOn < 1) {
    console.error("playwright-smoke: FAIL eating a dessert did not light a timed buff");
    process.exit(1);
  }
  await page.locator('button[data-bakery-dismiss="1"]').click({ timeout: 10000 });
  if ((await page.evaluate(() => document.querySelectorAll("[data-bakery-worker]").length)) !== 0) {
    console.error("playwright-smoke: FAIL 全部下班 left bakers on the stations");
    process.exit(1);
  }

  // Interactive ML-15 Rainbow Balloon Travel: one-click dispatch (release lock) → free tail-wind ticket lands a balloon → collect souvenirs (album) → recall the rest → unlocked
  await page.locator('button[data-balloon-autodispatch="1"]').click({ timeout: 10000 });
  const travellerIds = await page.evaluate(() =>
    [...document.querySelectorAll('[data-balloon-phase="flying"] .balloon-pax')].length,
  );
  const flyingN = await page.evaluate(() => document.querySelectorAll('[data-balloon-phase="flying"]').length);
  if (flyingN < 1 || travellerIds < 1) {
    console.error(`playwright-smoke: FAIL Balloon auto-dispatch sent nobody (${flyingN} balloons)`);
    process.exit(1);
  }
  await gotoTab("mons");
  const travelLocks = await page.evaluate(() =>
    [...document.querySelectorAll("button[data-mon-release]")].filter((b) => b.disabled && (b.getAttribute("title") || "").includes("彩虹气球")).length,
  );
  if (travelLocks < 1) {
    console.error("playwright-smoke: FAIL balloon travellers are releasable");
    process.exit(1);
  }
  await gotoTab("functions");
  await page.locator('button[data-balloon-ticket="1"]').click({ timeout: 10000 });
  if ((await page.evaluate(() => document.querySelectorAll('[data-balloon-phase="landed"]').length)) < 1) {
    console.error("playwright-smoke: FAIL the tail-wind ticket did not land a balloon");
    process.exit(1);
  }
  await page.locator('button[data-balloon-claim-all="1"]').click({ timeout: 10000 });
  const albumGot = await page.evaluate(() => document.querySelectorAll(".balloon-album__cell.is-got").length);
  const balloonTxt = await page.evaluate(() => document.querySelector(".balloon-body")?.innerText || "");
  if (albumGot < 1 || !balloonTxt.includes("上次收取")) {
    console.error(`playwright-smoke: FAIL collecting souvenirs did not fill the album (${albumGot})`);
    process.exit(1);
  }
  for (let i = 0; i < 2; i += 1) {
    const recall = page.locator("button[data-balloon-recall]").first();
    if (await recall.count()) await recall.click({ timeout: 10000 });
  }
  await gotoTab("mons");
  const travelUnlocks = await page.evaluate(() =>
    [...document.querySelectorAll("button[data-mon-release]")].filter((b) => b.disabled && (b.getAttribute("title") || "").includes("彩虹气球")).length,
  );
  if (travelUnlocks !== 0) {
    console.error("playwright-smoke: FAIL travellers stay locked after their balloons came home");
    process.exit(1);
  }
  await gotoTab("functions");

  // Interactive ML-16 Cloud Amusement Park: one-click staffing (release lock via the unified away registry) → free extra show sells tickets → everybody off duty
  await page.locator('button[data-park-autostaff="1"]').click({ timeout: 10000 });
  const parkOps = await page.evaluate(() => [...document.querySelectorAll("[data-park-operator]")].map((el) => Number(el.getAttribute("data-park-operator"))));
  if (parkOps.length < 1) {
    console.error("playwright-smoke: FAIL Cloud Park auto-staff put nobody on a ride");
    process.exit(1);
  }
  await gotoTab("mons");
  const parkLock = await releaseLockOf(parkOps, "云端游乐园");
  if (parkLock.some((x) => x !== "locked")) {
    console.error(`playwright-smoke: FAIL park operators are releasable (${parkLock.join(",")})`);
    process.exit(1);
  }
  await gotoTab("functions");
  await page.locator('button[data-park-show="1"]').click({ timeout: 10000 });
  const parkTickets = await page.evaluate(() => Number((document.querySelector("[data-park-tickets-big]")?.textContent || "0").trim()));
  if (!(parkTickets >= 5)) {
    console.error(`playwright-smoke: FAIL the free extra show sold no tickets (${parkTickets})`);
    process.exit(1);
  }
  await page.locator('button[data-park-dismiss="1"]').click({ timeout: 10000 });
  if ((await page.evaluate(() => document.querySelectorAll("[data-park-operator]").length)) !== 0) {
    console.error("playwright-smoke: FAIL 全部换班 left operators on the rides");
    process.exit(1);
  }

  // Interactive ML-16 Starry Night Camp + one-click collect: dispatch (release lock) → free campfire brings one camp back at dawn →
  // the collect panel lights up → 一键收取已归来伙伴 registers the records and frees the campers → pack up the rest → unlocked
  await page.locator('button[data-stargaze-autodispatch="1"]').click({ timeout: 10000 });
  const campingN = await page.evaluate(() => document.querySelectorAll('[data-stargaze-phase="camping"]').length);
  const camperN = await page.evaluate(() => document.querySelectorAll('[data-stargaze-phase="camping"] .stargaze-camper').length);
  if (campingN < 1 || camperN < 1) {
    console.error(`playwright-smoke: FAIL Stargaze auto-dispatch sent nobody (${campingN} camps)`);
    process.exit(1);
  }
  await gotoTab("mons");
  const campLocks = await page.evaluate(() =>
    [...document.querySelectorAll("button[data-mon-release]")].filter((b) => b.disabled && (b.getAttribute("title") || "").includes("星空露营地")).length,
  );
  if (campLocks < 1) {
    console.error("playwright-smoke: FAIL campers are releasable");
    process.exit(1);
  }
  await gotoTab("functions");
  if ((await page.evaluate(() => Number(document.querySelector("[data-away-return]")?.getAttribute("data-away-return") || -1))) !== 0) {
    console.error("playwright-smoke: FAIL the collect panel shows returned partners before anyone came back");
    process.exit(1);
  }
  await page.locator('button[data-stargaze-fire="1"]').click({ timeout: 10000 });
  if ((await page.evaluate(() => document.querySelectorAll('[data-stargaze-phase="returned"]').length)) < 1) {
    console.error("playwright-smoke: FAIL the free campfire did not bring a camp back");
    process.exit(1);
  }
  const readyN = await page.evaluate(() => (document.querySelector(".away-return.is-ready") ? Number(document.querySelector("[data-away-return]").getAttribute("data-away-return")) : 0));
  const collectLabel = await page.locator('button[data-away-collect-all="1"]').innerText();
  if (readyN < 1 || !collectLabel.includes(`（${readyN}）`)) {
    console.error(`playwright-smoke: FAIL the collect panel does not hint the returned camp (${readyN}, ${collectLabel})`);
    process.exit(1);
  }
  await page.locator('button[data-away-collect-all="1"]').click({ timeout: 10000 });
  const atlasGot = await page.evaluate(() => document.querySelectorAll(".stargaze-atlas__cell.is-got").length);
  const afterCollect = await page.evaluate(() => ({
    n: Number(document.querySelector("[data-away-return]")?.getAttribute("data-away-return") || -1),
    returned: document.querySelectorAll('[data-stargaze-phase="returned"]').length,
    last: document.querySelector(".stargaze-body")?.innerText || "",
  }));
  if (atlasGot < 1 || afterCollect.n !== 0 || afterCollect.returned !== 0 || !afterCollect.last.includes("上次收取")) {
    console.error(`playwright-smoke: FAIL one-click collect did not register the records (${atlasGot}, ${JSON.stringify({ n: afterCollect.n, returned: afterCollect.returned })})`);
    process.exit(1);
  }
  for (let i = 0; i < 3; i += 1) {
    const recall = page.locator("button[data-stargaze-recall]").first();
    if (await recall.count()) await recall.click({ timeout: 10000 });
  }
  await gotoTab("mons");
  const campUnlocks = await page.evaluate(() =>
    [...document.querySelectorAll("button[data-mon-release]")].filter((b) => b.disabled && (b.getAttribute("title") || "").includes("星空露营地")).length,
  );
  if (campUnlocks !== 0) {
    console.error("playwright-smoke: FAIL campers stay locked after collecting / packing up");
    process.exit(1);
  }
  await gotoTab("functions");

  // Interactive ML-17 Crystal Ice Rink + Flower-Field Bee Workshop: one-click arrange / tend (release lock via the unified away registry) → leave / recall → unlocked
  const ml17Txt = await page.locator("#panel-functions").innerText();
  if (!ml17Txt.includes("冰晶溜冰场") || !ml17Txt.includes("花田蜜蜂工坊") || !ml17Txt.includes("节目单") || !ml17Txt.includes("今天开的花")) {
    console.error("playwright-smoke: FAIL functions tab missing the ML-17 Ice Rink / Bee Workshop panels");
    process.exit(1);
  }
  await page.locator('button[data-rink-arrange="snowWaltz"]').click({ timeout: 10000 });
  if ((await page.evaluate(() => document.querySelector("[data-rink-phase]")?.getAttribute("data-rink-phase"))) !== "rehearsing") {
    console.error("playwright-smoke: FAIL 一键编排开演 did not put anyone on the ice");
    process.exit(1);
  }
  await page.locator('button[data-bee-autodispatch="1"]').click({ timeout: 10000 });
  const tendingN = await page.evaluate(() => document.querySelectorAll('[data-bee-phase="tending"]').length);
  if (tendingN < 1) {
    console.error("playwright-smoke: FAIL 一键照料 sent nobody to the hives");
    process.exit(1);
  }
  await gotoTab("mons");
  const ml17Locks = await page.evaluate(() => {
    const titles = [...document.querySelectorAll("button[data-mon-release]")].filter((b) => b.disabled).map((b) => b.getAttribute("title") || "");
    return { rink: titles.filter((t) => t.includes("冰晶溜冰场")).length, bee: titles.filter((t) => t.includes("花田蜜蜂工坊")).length };
  });
  if (ml17Locks.rink < 1 || ml17Locks.bee < 1) {
    console.error(`playwright-smoke: FAIL skaters / keepers are releasable (${JSON.stringify(ml17Locks)})`);
    process.exit(1);
  }
  await gotoTab("functions");
  await page.locator("button[data-rink-leave]").first().click({ timeout: 10000 });
  for (let i = 0; i < 3; i += 1) {
    const recall = page.locator("button[data-bee-recall]").first();
    if (await recall.count()) await recall.click({ timeout: 10000 });
  }
  await gotoTab("mons");
  const ml17Unlocks = await page.evaluate(() =>
    [...document.querySelectorAll("button[data-mon-release]")].filter((b) => b.disabled && /冰晶溜冰场|花田蜜蜂工坊/.test(b.getAttribute("title") || "")).length,
  );
  if (ml17Unlocks !== 0) {
    console.error("playwright-smoke: FAIL skaters / keepers stay locked after leaving / recalling");
    process.exit(1);
  }
  await gotoTab("functions");

  // Interactive ML-8 Amber Gene Revival Lab check: claim free daily Ancient Amber (+6), awaken Lv.1 Primal Claw Totem, and refine IV
  await page.locator('button[data-amber-claim-daily="1"]').click({ timeout: 10000 });
  await page.locator('button[data-amber-awaken="primalClaw"]').click({ timeout: 10000 });
  await page.locator('button[data-amber-refine-iv="1"]').click({ timeout: 10000 });
  const afterAmberTxt = await page.locator("#panel-functions").innerText();
  if (!afterAmberTxt.includes("太古印记共鸣保护生效")) {
    console.error("playwright-smoke: FAIL Amber Revival Lab awaken did not imprint/protect partner");
    process.exit(1);
  }

  // Interactive ML-7 Boutique check: claim free daily Star Sand (+6) & craft Lv.1 Aurora Crown
  await page.locator('button[data-bq-claim-daily="1"]').click({ timeout: 10000 });
  await page.locator('button[data-bq-craft="accAuroraCrown"]').click({ timeout: 10000 });
  const afterCraftTxt = await page.locator("#panel-functions").innerText();
  if (!afterCraftTxt.includes("造型配饰穿戴中保护生效")) {
    console.error("playwright-smoke: FAIL Boutique craft did not equip/protect partner");
    process.exit(1);
  }

  // Interactive ML-9 Wish Dock check: claim tide gift (+2 bottles), open one bottle (wish-reply letter), dispatch crews (busy lock)
  await page.locator('button[data-dock-claim-daily="1"]').click({ timeout: 10000 });
  await page.locator('button[data-dock-open="1"]').click({ timeout: 10000 });
  const afterOpenTxt = await page.locator("#panel-functions").innerText();
  if (!afterOpenTxt.includes("的回信") || !afterOpenTxt.includes("拾回")) {
    console.error("playwright-smoke: FAIL Wish Dock bottle did not reveal a wish-reply letter");
    process.exit(1);
  }
  await page.locator('button[data-dock-auto-all="1"]').click({ timeout: 10000 });
  const awayCount = await page.evaluate(() => document.querySelectorAll("[data-dock-fill]").length);
  const afterDispatchTxt = await page.locator("#panel-functions").innerText();
  if (awayCount < 1 || !afterDispatchTxt.includes("拾贝进度") || !afterDispatchTxt.includes("召回船员")) {
    console.error("playwright-smoke: FAIL Wish Dock auto dispatch did not start a beachcombing trip");
    process.exit(1);
  }

  // Verify 0px scroll drift on Functions tab across live background ticks & 0px horizontal overflow at 1440x900
  await page.evaluate(() => window.scrollTo(0, 320));
  const scrollBefore = await page.evaluate(() => window.scrollY);
  await page.waitForTimeout(1300);
  const scrollAfter = await page.evaluate(() => window.scrollY);
  if (Math.abs(scrollAfter - scrollBefore) > 1) {
    console.error(`playwright-smoke: FAIL scrollDrift detected (${scrollBefore} -> ${scrollAfter})`);
    process.exit(1);
  }
  const desktopOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (desktopOverflow > 0) {
    console.error(`playwright-smoke: FAIL 1440x900 horizontal overflow ${desktopOverflow}px`);
    process.exit(1);
  }

  // ML-9: partners at sea sit out the tournament — recall the shoal crew so the championship hall has a squad on shore
  await page.locator('button[data-dock-recall="shoal"]').click({ timeout: 10000 });
  const afterRecallAway = await page.evaluate(() => document.querySelectorAll("[data-dock-fill]").length);
  if (afterRecallAway !== awayCount - 1) {
    console.error(`playwright-smoke: FAIL Wish Dock recall did not free the shoal crew (${awayCount} -> ${afterRecallAway})`);
    process.exit(1);
  }

  // Interactive ML-9 Tri-Element Championship, ML-8 Star-Rail Corridor & ML-7 Champion League check on PvE tab + 390x844 mobile horizontal overflow check
  await page.locator('[data-tab-more="1"]').click({ timeout: 10000 });
  await page.locator('[data-more-tab="pve"]').click({ timeout: 10000 });
  await page.waitForFunction(
    () => {
      const p = document.getElementById("panel-pve");
      return p && !p.hasAttribute("hidden") && p.classList.contains("is-active");
    },
    null,
    { timeout: 15000 }
  );
  const pveText = await page.locator("#panel-pve").innerText();
  if (
    !pveText.includes("三系生态大师锦标殿") ||
    !pveText.includes("双系星轨回廊无尽试炼") ||
    !pveText.includes("星冠殿堂挑战赛")
  ) {
    console.error("playwright-smoke: FAIL PvE tab missing Tri-Element Championship Hall, Star-Rail Corridor or Champion League card");
    process.exit(1);
  }
  await page.locator('button[data-pve-tri-fight="climb"]').click({ timeout: 10000 });
  await page.waitForSelector('[data-pve-result-overlay="1"]', { timeout: 10000 });
  const triModalText = await page.locator('[data-pve-result-overlay="1"]').innerText();
  if (!triModalText.includes("三系锦标赛晋级")) {
    console.error("playwright-smoke: FAIL Tri-Element Championship result modal missing ladder summary");
    process.exit(1);
  }
  await page.locator("[data-pve-result-close]").first().click({ timeout: 10000 });
  await page.locator('button[data-pve-corridor-fight="surge"]').click({ timeout: 10000 });
  await page.waitForSelector('[data-pve-result-overlay="1"]', { timeout: 10000 });
  const corridorModalText = await page.locator('[data-pve-result-overlay="1"]').innerText();
  if (
    !corridorModalText.includes("星轨回廊突破") ||
    !corridorModalText.includes("星轨回廊勋章") ||
    !corridorModalText.includes("远古基因琥珀")
  ) {
    console.error("playwright-smoke: FAIL Star-Rail Corridor result modal missing corridor / medal / amber summary");
    process.exit(1);
  }
  await page.locator("[data-pve-result-close]").first().click({ timeout: 10000 });

  await page.locator('button[data-pve-league-fight="full"]').click({ timeout: 10000 });
  await page.waitForSelector('[data-pve-result-overlay="1"]', { timeout: 10000 });
  const modalText = await page.locator('[data-pve-result-overlay="1"]').innerText();
  if (!modalText.includes("冠军殿堂授勋") || !modalText.includes("闪光祈愿星砂")) {
    console.error("playwright-smoke: FAIL Champion League result modal missing Hall-of-Fame / Star Sand summary");
    process.exit(1);
  }
  await page.locator("[data-pve-result-close]").first().click({ timeout: 10000 });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(150);
  const mobilePveOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  await page.locator("#tab-functions").click({ timeout: 10000 });
  await page.waitForTimeout(150);
  const mobileFuncOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (mobilePveOverflow > 0 || mobileFuncOverflow > 0) {
    console.error(`playwright-smoke: FAIL 390x844 horizontal overflow (pve=${mobilePveOverflow}px, func=${mobileFuncOverflow}px)`);
    process.exit(1);
  }

  console.log("playwright-smoke: OK");
} finally {
  await browser.close();
  server.close();
}
