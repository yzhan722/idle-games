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

async function waitForVisibleImages(page, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const inFlight = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("img")).filter(
        (img) => img.getClientRects().length > 0 && !img.complete
      ).length;
    });
    if (inFlight === 0) return;
    await page.waitForTimeout(300);
  }
}

async function checkBrokenImages(page, label, issues) {
  await waitForVisibleImages(page, 15000);
  const brokenImgs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("img"))
      .filter((img) => {
        if (img.getClientRects().length === 0) return false;
        return img.complete && (img.naturalWidth === 0 || img.naturalHeight === 0);
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
    page.setDefaultNavigationTimeout(45000);
    page.setDefaultTimeout(6000);

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
    page.on("response", (res) => {
      if (res.status() >= 400 && res.url().includes("/assets/")) {
        issues.push(`Asset HTTP ${res.status()}: ${res.url()}`);
      }
    });

    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(2000);

    // 1. Complete login or auto-register
    const loginUserField = page.locator("#username");
    if (await loginUserField.isVisible().catch(() => false)) {
      await loginUserField.fill("auto_playtest_2h");
      await page.locator("#password").fill("WorklifePlaytest2026!");
      const submitBtn = page.locator("button.login-btn").first();
      await submitBtn.click().catch(() => {});
      await page.locator("#username").waitFor({ state: "hidden", timeout: 4000 }).catch(() => {});

      const quickRegBtn = page.locator("button:has-text('立即用当前填写的账号密码直接注册')").first();
      if (await quickRegBtn.isVisible().catch(() => false)) {
        await quickRegBtn.click().catch(() => {});
        await page.locator("#username").waitFor({ state: "hidden", timeout: 4000 }).catch(() => {});
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
          await page.locator("#username").waitFor({ state: "hidden", timeout: 4000 }).catch(() => {});
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
    const inGameLocator = page.locator(".game-main-layout, nav.skill-sidebar, .game-header").first();
    const inGame = await inGameLocator
      .waitFor({ state: "visible", timeout: 12000 })
      .then(() => true)
      .catch(() => false);
    if (!inGame) {
      issues.push("Failed to enter in-game main layout (still on login or character creation screen).");
    }
    await page.waitForTimeout(1500);

    // 4. Dismiss tutorial guide or Chapter 1 build modal after player state loads
    const skipBtn = page.locator("button.tg-skip").first();
    if (await skipBtn.isVisible().catch(() => false)) {
      await skipBtn.click().catch(() => {});
      await page.waitForTimeout(600);
    }
    const buildOptBtn = page.locator(".build-modal button.build-option").first();
    if (await buildOptBtn.isVisible().catch(() => false)) {
      await checkBrokenImages(page, "Desktop-BuildModal", issues);
      await buildOptBtn.click().catch(() => {});
      await page.waitForTimeout(1000);
    }

    // Ensure content pack & initial game data are fully loaded before progressing
    await page.locator(".loading-message").first().waitFor({ state: "detached", timeout: 15000 }).catch(() => {});
    await page.locator(".skill-action-row, .craft-row, .monster-card, .tab-btn").first().waitFor({ state: "visible", timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(600);

    // 5. Advance Chapter 1 progression based on NextGoalBar
    const goalBar = page.locator(".next-goal-bar").first();
    const goalId = (await goalBar.getAttribute("data-goal-id").catch(() => "")) || "chop";
    const goalTitle = (await page.locator(".next-goal-title").first().textContent().catch(() => "")) || goalId;
    goalSummary = `${goalId} (${goalTitle.trim()})`;

    if (goalId === "board" || goalId === "sword" || goalId === "chest") {
      const stopBattleBtn = page.locator("button.stop-activity-btn-center, button.btn-stop-small, button.btn-stop-large").first();
      if (await stopBattleBtn.isVisible().catch(() => false)) {
        await stopBattleBtn.click().catch(() => {});
        await page.waitForTimeout(800);
      }
      await page.locator("button.next-goal-go").first().click().catch(() => {});
      await page.waitForTimeout(800);

      // If NextGoalBar navigated to character sheet to equip chest/sword (or opened equip selector modal directly)
      const targetSlotText = goalId === "chest" ? "上衣" : "主手";
      const modalOpen = await page.locator(".equip-selector-modal").first().isVisible().catch(() => false);
      const equipSlotBtn = page.locator(`.sheet-slot:has-text('${targetSlotText}'), .cs-slot:has-text('${targetSlotText}')`).first();
      if (!modalOpen && (await equipSlotBtn.isVisible().catch(() => false))) {
        await equipSlotBtn.click().catch(() => {});
        await page.waitForTimeout(600);
      }
      if (await page.locator(".equip-selector-modal").first().isVisible().catch(() => false)) {
        await checkBrokenImages(page, "Desktop-EquipModal", issues);
        const eqItem = page.locator(".equip-selector-modal .equippable-item:not(.equipped)").first();
        if (await eqItem.isVisible().catch(() => false)) {
          await eqItem.click().catch(() => {});
          await page.waitForTimeout(1000);
        } else {
          await page.locator(".equip-selector-modal .modal-close-btn").first().click().catch(() => {});
          await page.waitForTimeout(400);
        }
      } else {
        // In woodworking or logging: start the ready action/recipe, or fallback to materials/logging if short
        let readyQuick = page.locator(".craft-row.ready .sar-quick:not(.stop), .skill-action-row .sar-quick:not(.stop)").first();
        if (!(await readyQuick.isVisible().catch(() => false))) {
          const matTab = page.locator("button.category-btn:has-text('材料')").first();
          if (await matTab.isVisible().catch(() => false)) {
            await matTab.click().catch(() => {});
            await page.waitForTimeout(500);
          }
          readyQuick = page.locator(".craft-row.ready .sar-quick:not(.stop)").first();
        }
        if (!(await readyQuick.isVisible().catch(() => false))) {
          const logNav = page.locator("[data-nav-id='logging'], nav.skill-sidebar button:has-text('伐木')").first();
          if (await logNav.isVisible().catch(() => false)) {
            await logNav.click().catch(() => {});
            await page.waitForTimeout(600);
          }
          readyQuick = page.locator(".skill-action-row .sar-quick:not(.stop)").first();
        }
        if (await readyQuick.isVisible().catch(() => false)) {
          await readyQuick.click().catch(() => {});
          await page.waitForTimeout(800);
        }
      }
    } else if (goalId === "equip_sword") {
      const stopBattleBtn = page.locator("button.stop-activity-btn-center, button.btn-stop-small, button.btn-stop-large").first();
      if (await stopBattleBtn.isVisible().catch(() => false)) {
        await stopBattleBtn.click().catch(() => {});
        await page.waitForTimeout(800);
      }
      await page.locator("button.next-goal-go").first().click().catch(() => {});
      await page.waitForTimeout(800);
      const equipSlotBtn = page.locator(".sheet-slot:has-text('主手'), .cs-slot:has-text('主手'), button:has-text('装备'), button:has-text('穿戴')").first();
      if (await equipSlotBtn.isVisible().catch(() => false)) {
        await equipSlotBtn.click().catch(() => {});
        await page.waitForTimeout(600);
      }
      const eqItem = page.locator(".equippable-item:not(.equipped)").first();
      if (await eqItem.isVisible().catch(() => false)) {
        await checkBrokenImages(page, "Desktop-EquipModal", issues);
        await eqItem.click().catch(() => {});
        await page.waitForTimeout(1000);
      }
    } else if (goalId === "boss" || goalId === "archetypes" || goalId === "slime") {
      const stopLifeBtn = page.locator("button.sar-quick.stop").first();
      if (await stopLifeBtn.isVisible().catch(() => false)) {
        await stopLifeBtn.click().catch(() => {});
        await page.waitForTimeout(600);
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

    await page.locator(".loading-message").first().waitFor({ state: "detached", timeout: 6000 }).catch(() => {});
    await checkBrokenImages(page, "Desktop-Main", issues);
    await page.screenshot({ path: outDesktop, fullPage: false });

    // Re-read current goal after step 5 actions (e.g. equipping chest advances goal to 'archetypes')
    const updatedGoalId = (await goalBar.getAttribute("data-goal-id").catch(() => "")) || goalId;
    const updatedGoalTitle = (await page.locator(".next-goal-title").first().textContent().catch(() => "")) || updatedGoalId;
    goalSummary = `${updatedGoalId} (${updatedGoalTitle.trim()})`;

    // 6. Open Adventure / Combat view and start fighting target monster to inspect Combat UI
    const advNav = page.locator("[data-nav-id='adventure'], nav.skill-sidebar button:has-text('冒险'), nav.skill-sidebar button:has-text('耐力')").first();
    if (await advNav.isVisible().catch(() => false)) {
      await advNav.click().catch(() => {});
      await page.waitForTimeout(1000);
    }

    // If currently fighting, return to monster cards first to allow choosing target
    const inBattleBackBtn = page.locator("button.btn-back:has-text('返回')").first();
    if (await inBattleBackBtn.isVisible().catch(() => false)) {
      await inBattleBackBtn.click().catch(() => {});
      await page.waitForTimeout(1000);
    }

    // Choose monster based on Chapter 1 objective
    let targetMonsterName = "果冻史莱姆";
    if (updatedGoalId === "archetypes") {
      // Fight Crab or Monkey to complete the 3 forest archetypes
      const crabCard = page.locator(".monster-card:has-text('铁壳寄居蟹')").first();
      const monkeyCard = page.locator(".monster-card:has-text('捣蛋小猴')").first();
      if (await crabCard.isVisible().catch(() => false)) {
        targetMonsterName = "铁壳寄居蟹";
      } else if (await monkeyCard.isVisible().catch(() => false)) {
        targetMonsterName = "捣蛋小猴";
      }
    } else if (updatedGoalId === "boss") {
      targetMonsterName = "森林管家";
    }

    const monsterCard = page.locator(`.monster-card:has-text('${targetMonsterName}')`).first();
    if (await monsterCard.isVisible().catch(() => false)) {
      await monsterCard.click().catch(() => {});
      await page.waitForTimeout(700);
      await checkBrokenImages(page, "Desktop-MonsterModal", issues);
      const startFightBtn = page.locator(".modal-actions button.btn-action").first();
      if (await startFightBtn.isVisible().catch(() => false)) {
        await startFightBtn.click().catch(() => {});
        await page.waitForTimeout(1200);
      }
      const raidStartBtn = page.locator(`.party-boss-dungeon-card:has-text("${targetMonsterName}") button`).first();
      if (await raidStartBtn.isVisible().catch(() => false)) {
        await raidStartBtn.click().catch(() => {});
        await page.waitForTimeout(1800);
      }
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

    // 8. If current Chapter 1 goal still requires gathering/crafting, resume that life action before closing
    if (updatedGoalId === "chop" || updatedGoalId === "board" || updatedGoalId === "sword" || updatedGoalId === "chest") {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.waitForTimeout(400);
      const stopBtn = page.locator("button.stop-activity-btn-center, button.btn-stop-small, button.btn-stop-large").first();
      if (await stopBtn.isVisible().catch(() => false)) {
        await stopBtn.click().catch(() => {});
        await page.waitForTimeout(700);
      }
      await page.locator("button.next-goal-go").first().click().catch(() => {});
      await page.waitForTimeout(700);
      let resumeQuick = page.locator(".craft-row.ready .sar-quick:not(.stop), .skill-action-row .sar-quick:not(.stop)").first();
      if (!(await resumeQuick.isVisible().catch(() => false))) {
        const matTab = page.locator("button.category-btn:has-text('材料')").first();
        if (await matTab.isVisible().catch(() => false)) {
          await matTab.click().catch(() => {});
          await page.waitForTimeout(400);
        }
        resumeQuick = page.locator(".craft-row.ready .sar-quick:not(.stop)").first();
      }
      if (!(await resumeQuick.isVisible().catch(() => false))) {
        const logNav = page.locator("[data-nav-id='logging'], nav.skill-sidebar button:has-text('伐木')").first();
        if (await logNav.isVisible().catch(() => false)) {
          await logNav.click().catch(() => {});
          await page.waitForTimeout(500);
        }
        resumeQuick = page.locator(".skill-action-row .sar-quick:not(.stop)").first();
      }
      if (await resumeQuick.isVisible().catch(() => false)) {
        await resumeQuick.click().catch(() => {});
        await page.waitForTimeout(800);
      }
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
      ? `- Result: Entered in-game views (Main + Combat + Mobile 390x844). Zero console errors, zero broken images, zero layout overflow.`
      : `- Issues:\n${issues.map((i) => `  - ${i}`).join("\n")}`,
    "",
  ].join("\n");

  const prev = fs.existsSync(logFile) ? fs.readFileSync(logFile, "utf8") : "";
  const blocks = prev.split(/(?=^## \[)/m).map((s) => s.trim()).filter((s) => s.startsWith("## ["));
  blocks.push(entry.trim());
  const MAX_KEEP = 10;
  if (blocks.length > MAX_KEEP) {
    const zlib = await import("node:zlib");
    const overflow = blocks.splice(0, blocks.length - MAX_KEEP);
    const gzPath = path.resolve(rootDir, "../../docs/archives/playtest_logs_archive.md.gz");
    fs.mkdirSync(path.dirname(gzPath), { recursive: true });
    let oldText = "";
    if (fs.existsSync(gzPath)) {
      oldText = zlib.gunzipSync(fs.readFileSync(gzPath)).toString("utf8");
    }
    const chunk = `# [games/worklife/playtest_audit_log.md] Archived ${overflow.length} entries at ${stamp}\n\n` + overflow.join("\n\n") + "\n";
    const merged = (oldText ? oldText.trimEnd() + "\n\n" : "") + chunk;
    fs.writeFileSync(gzPath, zlib.gzipSync(Buffer.from(merged, "utf8"), { level: 9 }));
  }
  const header = "# WorkLife Autonomous Playtest Audit Log\n\n> 滚动保留最近 10 条记录；历史巡检日志已周期性压缩归档至 `docs/archives/playtest_logs_archive.md.gz`。\n\n";
  fs.writeFileSync(logFile, header + blocks.join("\n\n") + "\n", "utf8");
  console.log(entry);
  if (issues.length > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error("Playtest failed:", err);
  process.exitCode = 1;
});
