import { expect, test } from "@playwright/test";
import path from "path";
import { guestLogin, seedT1 } from "../helpers";

const out = (vp: string, name: string) =>
  path.join("docs", "vertical-slice", "phase7", vp, `${name}.png`);

async function assertBottomNav(page: import("@playwright/test").Page) {
  const box = await page.getByRole("button", { name: "工作" }).boundingBox();
  expect(box).toBeTruthy();
  expect(box!.y).toBeGreaterThan(page.viewportSize()!.height * 0.7);
  await expect(page.locator(".activity-status-center")).toBeVisible();
}

test("phase 7 mobile-first chrome at 390 and 430", async ({ page }) => {
  test.skip(!process.env.VS_CAPTURE, "opt-in: VS_CAPTURE=1");
  test.setTimeout(180_000);

  for (const vp of [
    { id: "mobile-390", width: 390, height: 844 },
    { id: "mobile-430", width: 430, height: 932 },
  ] as const) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await guestLogin(page, `vs-p7-${vp.id}-${Date.now()}`);
    await assertBottomNav(page);
    await page.screenshot({ path: out(vp.id, "01-work"), fullPage: false });

    await seedT1(page);
    await page.reload();
    await page.getByRole("button", { name: "制作" }).click();
    await expect(page.getByRole("heading", { name: "木工" })).toBeVisible();
    await assertBottomNav(page);
    await page.screenshot({ path: out(vp.id, "02-craft"), fullPage: false });

    await page.getByRole("button", { name: "冒险" }).click();
    await expect(page.locator(".monster-card").filter({ hasText: "果冻史莱姆" })).toBeVisible();
    await page.screenshot({ path: out(vp.id, "03-adventure"), fullPage: false });

    await page.getByRole("button", { name: "角色", exact: true }).click();
    await expect(page.getByRole("heading", { name: "角色" })).toBeVisible();
    await page.screenshot({ path: out(vp.id, "04-character"), fullPage: false });

    await page.getByRole("button", { name: "冒险" }).click();
    await page.locator(".monster-card").filter({ hasText: "森林管家" }).first().click();
    await page.getByRole("button", { name: /挑战BOSS/ }).click();
    await expect(page.getByRole("button", { name: /重劈/ })).toBeVisible({ timeout: 15_000 });
    await page.screenshot({ path: out(vp.id, "05-boss-combat"), fullPage: false });
    await page.keyboard.press("Escape");
  }
});
