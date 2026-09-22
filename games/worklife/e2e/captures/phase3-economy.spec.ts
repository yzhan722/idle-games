import { expect, test } from "@playwright/test";
import path from "path";
import { guestLogin, seedT1 } from "../helpers";

const out = (vp: string, name: string) =>
  path.join("docs", "vertical-slice", "phase3", vp, `${name}.png`);

test("phase 3 first-hour start has no skip-loop gift", async ({ page }) => {
  test.skip(!process.env.VS_CAPTURE, "opt-in: VS_CAPTURE=1");
  test.setTimeout(90_000);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await guestLogin(page, `vs-p3-desktop-${Date.now()}`);
  await expect(page.locator(".header-gold-value")).toHaveText("0");
  await page.screenshot({ path: out("desktop-1440", "01-empty-start"), fullPage: false });

  await page.getByRole("button", { name: "工作" }).click();
  await page.getByRole("heading", { name: "伐木" }).waitFor();
  await page.screenshot({ path: out("desktop-1440", "02-logging"), fullPage: false });

  await expect(page.getByRole("button", { name: "冒险" })).toHaveAttribute("aria-disabled", "true");

  await seedT1(page);
  await page.reload();
  await page.getByRole("button", { name: "冒险" }).click();
  await page.getByText("果冻史莱姆").first().click();
  await expect(page.locator(".stat-line").filter({ hasText: "生命" })).toContainText("80");
  await expect(page.locator(".stat-line").filter({ hasText: "攻击" })).toContainText("3");
  await page.screenshot({ path: out("desktop-1440", "03-slime-retune"), fullPage: false });
  await page.keyboard.press("Escape");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "工作" }).click();
  await page.screenshot({ path: out("mobile-390", "01-logging"), fullPage: false });
});
