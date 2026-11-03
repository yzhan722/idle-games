import { test, expect } from "@playwright/test";
import { guestLogin, seedT1 } from "./helpers";

test("E2E-02 T1 gear can be equipped in the live UI", async ({ page }) => {
  await guestLogin(page, `e2e-t1-${Date.now()}`);
  await seedT1(page);
  await page.reload();
  await expect(page.getByRole("button", { name: "工作" })).toBeVisible({ timeout: 20_000 });

  await page.getByRole("button", { name: "角色", exact: true }).click();
  await expect(page.getByRole("heading", { name: "角色" })).toBeVisible();
  await page.getByRole("button", { name: "上衣" }).click();
  await page.locator(".equip-selector-modal").getByText("木制胸甲").first().click();
  await expect(page.locator(".character-sheet")).toContainText("木制胸甲");
  // Seeded player already wears the sword: chest 8 + the 2-piece 伐木工基础套装 bonus 3 = 11,
  // which is what the server actually uses in combat (the sheet used to hide the set bonus).
  await expect(page.locator(".sheet-stat").filter({ hasText: "防御" })).toContainText("11");
  await expect(page.locator(".sheet-set-bonus")).toContainText("伐木工基础套装");
});
