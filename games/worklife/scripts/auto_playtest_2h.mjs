import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const outDesktop = path.join(rootDir, "playtest_live_desktop.png");
const outCombat = path.join(rootDir, "playtest_live_combat.png");
const outMobile = path.join(rootDir, "playtest_live_mobile.png");
const logFile = path.join(rootDir, "playtest_audit_log.md");
const targetUrl = process.env.PLAYTEST_URL || "https://worklife.yinosites.com";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const issues = [];
  const consoleErrors = [];
  const failedRequests = [];

  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    page.on("pageerror", (err) => consoleErrors.push(`PAGEERROR: ${err.message}`));
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(`CONSOLE_ERROR: ${msg.text()}`);
    });
    page.on("requestfailed", (req) => {
      const url = req.url();
      if (!url.includes("favicon")) {
        failedRequests.push(`${req.method()} ${url} -> ${req.failure()?.errorText || "failed"}`);
      }
    });

    await page.goto(targetUrl, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(1500);

    // Complete guest login / character creation if shown
    const guestBtn = page.locator("button:has-text('游客'), button:has-text('开始'), button:has-text('进入异世界')").first();
    if (await guestBtn.isVisible().catch(() => false)) {
      await guestBtn.click().catch(() => {});
      await page.waitForTimeout(1500);
    }
    const createBtn = page.locator("button:has-text('踏入异世界'), button:has-text('完成创建'), button:has-text('开始冒险')").first();
    if (await createBtn.isVisible().catch(() => false)) {
      await createBtn.click().catch(() => {});
      await page.waitForTimeout(1500);
    }

    await page.screenshot({ path: outDesktop, fullPage: false });

    // Check broken images on desktop view
    const brokenImgs = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("img"))
        .filter((img) => !img.complete || img.naturalWidth === 0)
        .map((img) => img.getAttribute("src") || img.getAttribute("data-t1-key") || "unknown-img");
    });
    if (brokenImgs.length > 0) {
      issues.push(`Broken images detected (${brokenImgs.length}): ${brokenImgs.slice(0, 5).join(", ")}`);
    }

    // Navigate to Adventure / Combat tab and capture screenshot
    const advTab = page.locator("button:has-text('冒险'), [aria-label*='冒险']").first();
    if (await advTab.isVisible().catch(() => false)) {
      await advTab.click().catch(() => {});
      await page.waitForTimeout(1200);
    }
    await page.screenshot({ path: outCombat, fullPage: false });

    // Switch to Mobile viewport (390x844) and verify layout
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: outMobile, fullPage: false });

    const overflowPx = await page.evaluate(() => {
      return document.documentElement.scrollWidth - document.documentElement.clientWidth;
    });
    if (overflowPx > 8) {
      issues.push(`Mobile horizontal overflow detected: +${overflowPx}px`);
    }
  } finally {
    await browser.close();
  }

  if (consoleErrors.length > 0) {
    issues.push(...consoleErrors.slice(0, 5));
  }
  if (failedRequests.length > 0) {
    issues.push(...failedRequests.slice(0, 5));
  }

  const stamp = new Date().toISOString();
  const status = issues.length === 0 ? "PASS" : `ISSUES_FOUND (${issues.length})`;
  const entry = [
    `## [${stamp}] Autonomous Playtest — ${status}`,
    `- Target: \`${targetUrl}\``,
    `- Screenshots: \`playtest_live_desktop.png\`, \`playtest_live_combat.png\`, \`playtest_live_mobile.png\``,
    issues.length === 0
      ? `- Result: Zero console errors, zero broken images, zero layout overflow.`
      : `- Issues:\n${issues.map((i) => `  - ${i}`).join("\n")}`,
    "",
  ].join("\n");

  const prev = fs.existsSync(logFile) ? fs.readFileSync(logFile, "utf8") : "# WorkLife Autonomous Playtest Audit Log\n\n";
  fs.writeFileSync(logFile, prev + entry + "\n", "utf8");
  console.log(entry);
  if (issues.length > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error("Playtest failed:", err);
  process.exitCode = 1;
});
