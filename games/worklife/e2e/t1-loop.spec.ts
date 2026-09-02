import { test, expect } from "@playwright/test";
import { guestLogin, seedT1 } from "./helpers";

test("E2E-02 T1 gear can be equipped in the live UI", async ({ page }) => {
  await guestLogin(page, `e2e-t1-${Date.now()}`);
  await seedT1(page);
  await page.reload();
  await expect(page.getByRole("button", { name: "伐木" })).toBeVisible({ timeout: 20_000 });

  const expand = page.getByRole("button", { name: "展开角色面板" });
  if (await expand.isVisible()) await expand.click();

  await page.getByRole("button", { name: "装备" }).last().click();
  await page.getByText("上衣", { exact: true }).click();
  await page.getByText("木制胸甲").first().click();
  await expect(page.getByText("木制胸甲").first()).toBeVisible();
  await expect(page.getByText("+8").first()).toBeVisible();
});
