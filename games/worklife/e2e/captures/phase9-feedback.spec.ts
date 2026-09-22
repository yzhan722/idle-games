import { expect, test } from "@playwright/test";
import path from "path";
import { guestLogin, seedT1 } from "../helpers";

const out = (vp: string, name: string) =>
  path.join("docs", "vertical-slice", "phase9", vp, `${name}.png`);

test("phase 9 combat has no fake win-rate and idle activity does not pulse", async ({ page }) => {
  test.skip(!process.env.VS_CAPTURE, "opt-in: VS_CAPTURE=1");
  test.setTimeout(180_000);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await guestLogin(page, `vs-p9-${Date.now()}`);
  await expect(page.locator(".activity-status-center.activity-idle")).toBeVisible();
  await page.screenshot({ path: out("desktop-1440", "01-idle-no-pulse"), fullPage: false });

  await seedT1(page);
  await page.reload();
  await page.getByRole("button", { name: "冒险" }).click();
  await page.locator(".monster-card").filter({ hasText: "果冻史莱姆" }).first().click();
  await page.getByRole("button", { name: /开始战斗/ }).click();
  await expect(page.getByRole("button", { name: /重劈/ })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("胜率预测")).toHaveCount(0);
  await page.screenshot({ path: out("desktop-1440", "02-combat-no-winrate"), fullPage: false });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByText("胜率预测")).toHaveCount(0);
  await page.screenshot({ path: out("mobile-390", "01-combat-no-winrate"), fullPage: false });
});
