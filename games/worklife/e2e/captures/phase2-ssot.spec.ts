import { expect, test } from "@playwright/test";
import path from "path";
import { guestLogin, seedT1 } from "../helpers";

const out = (vp: string, name: string) =>
  path.join("docs", "vertical-slice", "phase2", vp, `${name}.png`);

test("phase 2 SSOT adventure uses content-pack names and stats", async ({ page }) => {
  test.skip(!process.env.VS_CAPTURE, "opt-in: VS_CAPTURE=1");
  test.setTimeout(120_000);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await guestLogin(page, `vs-p2-desktop-${Date.now()}`);
  await seedT1(page);
  await page.reload();
  await page.getByRole("button", { name: "冒险" }).click();
  await page.getByRole("heading", { name: "冒险" }).waitFor();
  await expect(page.getByText("生气蘑菇精")).toBeVisible();
  await expect(page.getByText("生气蘑菇怪")).toHaveCount(0);
  await page.screenshot({ path: out("desktop-1440", "01-forest-pack-names"), fullPage: false });

  await page.getByText("果冻史莱姆").first().click();
  await expect(page.getByText("均衡")).toBeVisible();
  await expect(page.locator(".stat-line").filter({ hasText: "生命" })).toContainText("80");
  await expect(page.locator(".stat-line").filter({ hasText: "攻击" })).toContainText("3");
  await page.screenshot({ path: out("desktop-1440", "02-slime-pack-stats"), fullPage: false });
  await page.keyboard.press("Escape");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "冒险" }).click();
  await page.screenshot({ path: out("mobile-390", "01-forest"), fullPage: false });
});
