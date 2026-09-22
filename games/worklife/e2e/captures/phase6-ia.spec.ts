import { expect, test } from "@playwright/test";
import path from "path";
import { guestLogin, seedT1 } from "../helpers";

const out = (vp: string, name: string) =>
  path.join("docs", "vertical-slice", "phase6", vp, `${name}.png`);

test("phase 6 desktop IA has four domains and a character sheet", async ({ page }) => {
  test.skip(!process.env.VS_CAPTURE, "opt-in: VS_CAPTURE=1");
  test.setTimeout(120_000);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await guestLogin(page, `vs-p6-desktop-${Date.now()}`);
  await expect(page.getByRole("button", { name: "工作" })).toBeVisible();
  await expect(page.getByRole("button", { name: "制作" })).toBeVisible();
  await expect(page.getByRole("button", { name: "冒险" })).toBeVisible();
  await expect(page.getByRole("button", { name: "角色", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "组队" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "伐木" })).toBeVisible();
  await page.screenshot({ path: out("desktop-1440", "01-four-tabs-locked"), fullPage: false });

  await seedT1(page);
  await page.reload();
  await page.getByRole("button", { name: "制作" }).click();
  await expect(page.getByText("用于木头短剑")).toBeVisible();
  await page.screenshot({ path: out("desktop-1440", "02-craft-why"), fullPage: false });

  await page.getByRole("button", { name: "冒险" }).click();
  await expect(page.locator(".monster-card").filter({ hasText: "果冻史莱姆" })).toBeVisible();
  await expect(page.getByText("六成血格挡")).toBeVisible();
  await page.screenshot({ path: out("desktop-1440", "03-forest-identity"), fullPage: false });

  await page.getByRole("button", { name: "角色", exact: true }).click();
  await expect(page.getByRole("heading", { name: "角色" })).toBeVisible();
  await expect(page.locator(".sheet-stat").filter({ hasText: "生命" })).toBeVisible();
  await page.screenshot({ path: out("desktop-1440", "04-character-sheet"), fullPage: false });

  await page.getByRole("button", { name: "生涯" }).click();
  await expect(page.getByRole("menuitem", { name: "设置" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "成就" })).toHaveCount(0);
  await page.screenshot({ path: out("desktop-1440", "05-career-settings-only"), fullPage: false });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "工作" }).click();
  await page.screenshot({ path: out("mobile-390", "01-four-tabs"), fullPage: false });
});
