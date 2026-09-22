import { expect, test } from "@playwright/test";
import path from "path";
import { guestLogin } from "../helpers";

const out = (vp: string, name: string) =>
  path.join("docs", "vertical-slice", "phase5", vp, `${name}.png`);

test("phase 5 next goal is visible without reading docs", async ({ page }) => {
  test.skip(!process.env.VS_CAPTURE, "opt-in: VS_CAPTURE=1");
  test.setTimeout(90_000);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await guestLogin(page, `vs-p5-desktop-${Date.now()}`);
  await expect(page.getByText("当前目标")).toBeVisible();
  await expect(page.getByText("砍第一棵小白杨")).toBeVisible();
  await expect(page.getByRole("heading", { name: "伐木" })).toBeVisible();
  await page.screenshot({ path: out("desktop-1440", "01-next-goal-chop"), fullPage: false });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByText("砍第一棵小白杨")).toBeVisible();
  await page.screenshot({ path: out("mobile-390", "01-next-goal-chop"), fullPage: false });
});
