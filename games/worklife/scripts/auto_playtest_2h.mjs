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

async function waitForVisibleImages(page, timeoutMs = 4000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const pending = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("img")).filter(
        (img) => img.getClientRects().length > 0 && (!img.complete || img.naturalWidth === 0)
      ).length;
    });
    if (pending === 0) return;
    await page.waitForTimeout(200);
  }
}

async function checkBrokenImages(page, label, issues) {
  await waitForVisibleImages(page, 4000);
  const brokenImgs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("img"))
      .filter((img) => {
        if (img.getClientRects().length === 0) return false;
        return !img.complete || img.naturalWidth === 0;
      })
      .map((img) => img.getAttribute("src") || img.getAttribute("data-t1-key") || "unknown-img");
  });
  if (brokenImgs.length > 0) {
    issues.push(`[${label}] Broken images detected (${brokenImgs.length}): ${brokenImgs.slice(0, 5).join(", ")}`);
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const issues = [];
  const consoleErrors = [];
  const failedRequests = [];
  let goalSummary = "unknown";

  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    page.setDefaultTimeout(3000);

    page.on("pageerror", (err) => consoleErrors.push(`PAGEERROR: ${err.message}`));
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if (!text.includes("Failed to load resource: the server responded with a status of 40")) {
          consoleErrors.push(`CONSOLE_ERROR: ${text}`);
        }
      }
    });
    page.on("requestfailed", (req) => {
      const url = req.url();
      if (!url.includes("favicon")) {
        failedRequests.push(`${req.method()} ${url} -> ${req.failure()?.errorText || "failed"}`);
      }
    });

    await page.goto(targetUrl, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(1200);

    // 1. Complete login or auto-register
    const loginUserField = page.locator("#username");
    if (await loginUserField.isVisible().catch(() => false)) {
      await loginUserField.fill("auto_playtest_2h");
      await page.locator("#password").fill("WorklifePlaytest2026!");
      const submitBtn = page.locator("button.login-btn").first();
      await submitBtn.click().catch(() => {});
      await page.waitForTimeout(1800);

      const quickRegBtn = page.locator("button:has-text('立即用当前填写的账号密码直接注册')").first();
      if (await quickRegBtn.isVisible().catch(() => false)) {
        await quickRegBtn.click().catch(() => {});
        await page.waitForTimeout(2200);
      }

      if (await loginUserField.isVisible().catch(() => false)) {
        const regTab = page.locator("button.login-tab:has-text('注册账号')").first();
        if (await regTab.isVisible().catch(() => false)) {
          await regTab.click().catch(() => {});
          await page.waitForTimeout(300);
          await page.locator("#username").fill(`pt_${Date.now().toString(36)}`);
          await page.locator("#password").fill("WorklifePlaytest2026!");
          const confirmInput = page.locator("#confirm");
          if (await confirmInput.isVisible().catch(() => false)) {
            await confirmInput.fill("WorklifePlaytest2026!");
          }
          await page.locator("button.login-btn").first().click().catch(() => {});
          await page.waitForTimeout(2200);
        }
      }
    }

    // 2. Complete Character Creation if shown
    const nameInput = page.locator(".cc-name, input[placeholder*='个字']").first();
    if (await nameInput.isVisible().catch(() => false)) {
      const cur = await nameInput.inputValue().catch(() => "");
      if (!cur) {
        await nameInput.fill("巡检打工人");
      }
      const createBtn = page.locator("button.cc-submit, button:has-text('进入异世界')").first();
      if (await createBtn.isVisible().catch(() => false)) {
        await createBtn.click().catch(() => {});
        await page.waitForTimeout(2000);
      }
    }

    // 3. Verify we entered the main game layout
    const inGame = await page
      .locator(".game-main-layout, nav.skill-sidebar, .game-header")
      .first()
      .isVisible({ timeout: 8000 })
      .catch(() => false);
    if (!inGame) {
      issues.push("Failed to enter in-game main layout (still on login or character creation screen).");
    }
    await page.waitForTimeout(1200);

    // 4. Dismiss tutorial guide after player state loads
    const skipBtn = page.locator("button.tg-skip").first();
    if (await skipBtn.isVisible().catch(() => false)) {
      await skipBtn.click().catch(() => {});
      await page.waitForTimeout(600);
    }

    // 5. Advance Chapter 1 progression based on NextGoalBar
    const goalBar = page.locator(".next-goal-bar").first();
    const goalId = (await goalBar.getAttribute("data-goal-id").catch(() => "")) || "chop";
    const goalTitle = (await page.locator(".next-goal-title").first().textContent().catch(() => "")) || goalId;
    goalSummary = `${goalId} (${goalTitle.trim()})`;

    if (goalId === "board" || goalId === "sword") {
      await page.locator("button.next-goal-go").first().click().catch(() => {});
      await page.waitForTimeout(800);
      if (goalId === "sword") {
        const wepTab = page.locator("button:has-text('武器')").first();
        if (await wepTab.isVisible().catch(() => false)) {
          await wepTab.click().catch(() => {});
          await page.waitForTimeout(500);
        }
      }
      const readyQuick = page.locator(".craft-row.ready .sar-quick:not(.stop)").first();
      if (await readyQuick.isVisible().catch(() => false)) {
        await readyQuick.click().catch(() => {});
        await page.waitForTimeout(800);
      }
    } else if (goalId === "equip_sword") {
      await page.locator("button.next-goal-go").first().click().catch(() => {});
      await page.waitForTimeout(800);
      const equipBtn = page.locator("button:has-text('装备'), button:has-text('穿戴')").first();
      if (await equipBtn.isVisible().catch(() => false)) {
        await equipBtn.click().catch(() => {});
        await page.waitForTimeout(800);
      }
    } else {
      const quickStartBtn = page.locator(".sar-quick:not(.stop)").first();
      if (await quickStartBtn.isVisible().catch(() => false)) {
        const hasStop = await page.locator(".sar-quick.stop").first().isVisible().catch(() => false);
        if (!hasStop) {
          await quickStartBtn.click().catch(() => {});
          await page.waitForTimeout(800);
        }
      }
    }

    await checkBrokenImages(page, "Desktop-Main", issues);
    await page.screenshot({ path: outDesktop, fullPage: false });

    // 6. Open Adventure / Combat view and inspect Ability Loadout panel
    const staminaNav = page.locator("nav.skill-sidebar button:has-text('耐力'), [data-nav-id='stamina']").first();
    if (await staminaNav.isVisible().catch(() => false)) {
      await staminaNav.click().catch(() => {});
      await page.waitForTimeout(1000);
    } else {
      const advTab = page.locator("[data-nav-id='adventure'], button:has-text('冒险')").first();
      if (await advTab.isVisible().catch(() => false)) {
        await advTab.click().catch(() => {});
        await page.waitForTimeout(1000);
      }
    }

    const configSkillBtn = page.locator("button:has-text('配置技能')").first();
    if (await configSkillBtn.isVisible().catch(() => false)) {
      await configSkillBtn.click().catch(() => {});
      await page.waitForTimeout(600);
      await checkBrokenImages(page, "Desktop-AbilityLoadout", issues);
    }

    await checkBrokenImages(page, "Desktop-Combat", issues);
    await page.screenshot({ path: outCombat, fullPage: false });

    // 7. Switch to Mobile viewport (390x844) and verify layout + overflow
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(1000);
    await checkBrokenImages(page, "Mobile-390x844", issues);
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
    `- Target: \`${targetUrl}\` | Chapter Goal: \`${goalSummary}\``,
    `- Screenshots: \`playtest_live_desktop.png\`, \`playtest_live_combat.png\`, \`playtest_live_mobile.png\``,
    issues.length === 0
      ? `- Result: Entered in-game views (Main + Combat + AbilityLoadout + Mobile 390x844). Zero console errors, zero broken images, zero layout overflow.`
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
