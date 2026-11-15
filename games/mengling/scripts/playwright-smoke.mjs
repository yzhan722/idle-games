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
  if (!status.includes("v0.7.48")) {
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
          futurecoin: { value: 260, cap: 99999 },
          tuningMint: { value: 3, cap: 999 },
          shinyStarSand: { value: 0, cap: 9999 },
          ancientGeneAmber: { value: 0, cap: 9999 },
          corridorStarMedals: { value: 0, cap: 9999 },
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
    !funcText.includes("远古琥珀基因复苏所") ||
    !funcText.includes("星辉配饰流彩造型屋") ||
    !funcText.includes("冠军联盟四天王殿堂赛") ||
    !funcText.includes("星界羁绊露营野餐屋") ||
    !funcText.includes("料理食谱风味增益工坊") ||
    !funcText.includes("秘境生态探索沙盘") ||
    !funcText.includes("性格薄荷定向调律工坊")
  ) {
    console.error("playwright-smoke: FAIL functions tab missing ML-8 Amber Lab, ML-7 Boutique/League, ML-6 Camp/Cuisine, or ML-5 Sandbox/Mint");
    process.exit(1);
  }

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

  // Interactive ML-8 Star-Rail Corridor & ML-7 Champion League check on PvE tab + 390x844 mobile horizontal overflow check
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
  if (!pveText.includes("双系星轨回廊无尽试炼") || !pveText.includes("冠军联盟四天王殿堂赛")) {
    console.error("playwright-smoke: FAIL PvE tab missing Star-Rail Corridor or Champion League card");
    process.exit(1);
  }
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
