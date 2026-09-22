import { expect, test } from "@playwright/test";
import path from "path";
import { guestLogin, seedT1 } from "../helpers";

const out = (vp: string, name: string) =>
  path.join("docs", "vertical-slice", "phase4", vp, `${name}.png`);

test("phase 4 server HP combat shows heavy chop", async ({ page }) => {
  test.skip(!process.env.VS_CAPTURE, "opt-in: VS_CAPTURE=1");
  test.setTimeout(90_000);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await guestLogin(page, `vs-p4-desktop-${Date.now()}`);
  await seedT1(page);
  await page.reload();
  await page.getByRole("button", { name: "冒险" }).click();
  await page.getByText("果冻史莱姆").first().click();
  await page.getByRole("button", { name: /开始战斗/ }).click();
  await expect(page.getByRole("button", { name: /重劈/ })).toBeVisible({ timeout: 15_000 });
  await page.screenshot({ path: out("desktop-1440", "01-slime-hp-combat"), fullPage: false });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: out("mobile-390", "01-slime-hp-combat"), fullPage: false });
});
