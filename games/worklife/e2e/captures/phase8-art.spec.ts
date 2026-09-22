import { expect, test } from "@playwright/test";
import path from "path";
import { guestLogin, seedT1 } from "../helpers";

const out = (vp: string, name: string) =>
  path.join("docs", "vertical-slice", "phase8", vp, `${name}.png`);

test("phase 8 T1 art on desktop 1440 and mobile 390", async ({ page }) => {
  test.skip(!process.env.VS_CAPTURE, "opt-in: VS_CAPTURE=1");
  test.setTimeout(180_000);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await guestLogin(page, `vs-p8-desktop-${Date.now()}`);
  await expect(page.locator(".game-tabs .tab-btn .tab-icon img.t1-art")).toHaveCount(27);
  await expect(page.locator(".skill-action-row img.t1-art")).toBeVisible();
  await expect(page.locator(".logo-icon img.t1-art")).toBeVisible();
  await page.screenshot({ path: out("desktop-1440", "01-work-poplar"), fullPage: false });

  await seedT1(page);
  await page.reload();
  await page.getByRole("button", { name: "制作" }).click();
  await expect(page.locator(".craft-row img.t1-art").first()).toBeVisible();
  await page.screenshot({ path: out("desktop-1440", "02-craft"), fullPage: false });

  await page.getByRole("button", { name: "冒险" }).click();
  await expect(page.locator(".monster-card img.t1-art")).toHaveCount(4);
  await page.screenshot({ path: out("desktop-1440", "03-forest"), fullPage: false });

  await page.getByRole("button", { name: "角色", exact: true }).click();
  await expect(page.locator(".sheet-portrait img.t1-art")).toBeVisible();
  await expect(page.locator(".sheet-slot img.t1-art").first()).toBeVisible();
  await page.screenshot({ path: out("desktop-1440", "04-character"), fullPage: false });

  await page.getByRole("button", { name: "冒险" }).click();
  await page.locator(".monster-card").filter({ hasText: "果冻史莱姆" }).first().click();
  await page.getByRole("button", { name: /开始战斗/ }).click();
  await expect(page.getByRole("button", { name: /重劈/ })).toBeVisible({ timeout: 15_000 });
  await expect(page.locator(".player-entity img.t1-art")).toBeVisible();
  await expect(page.locator(".enemy-entity img.t1-art")).toBeVisible();
  await page.screenshot({ path: out("desktop-1440", "05-combat"), fullPage: false });

  await page.getByRole("button", { name: "停止", exact: true }).click();
  await expect(page.locator(".monster-card").filter({ hasText: "果冻史莱姆" })).toBeVisible({ timeout: 10_000 });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "工作" }).click();
  await expect(page.locator(".skill-action-row img.t1-art")).toBeVisible();
  await expect(page.locator("nav.mobile-nav .mobile-nav-btn .tab-icon img.t1-art")).toHaveCount(5);
  await page.screenshot({ path: out("mobile-390", "01-work-tabs"), fullPage: false });

  await page.getByRole("button", { name: "制作" }).click();
  await expect(page.locator(".craft-row img.t1-art").first()).toBeVisible();
  await page.screenshot({ path: out("mobile-390", "02-craft"), fullPage: false });

  await page.getByRole("button", { name: "冒险" }).click();
  await expect(page.locator(".monster-card img.t1-art")).toHaveCount(4);
  await page.screenshot({ path: out("mobile-390", "03-forest"), fullPage: false });

  await page.getByRole("button", { name: "角色", exact: true }).click();
  await expect(page.locator(".sheet-portrait img.t1-art")).toBeVisible();
  await page.screenshot({ path: out("mobile-390", "04-character"), fullPage: false });
});
