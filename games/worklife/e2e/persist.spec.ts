import { test, expect } from "@playwright/test";
import { E2E_API, guestLogin, seedT1 } from "./helpers";

test("E2E-03 progress survives a full reload", async ({ page }) => {
  const deviceId = `e2e-persist-${Date.now()}`;
  await guestLogin(page, deviceId);
  await seedT1(page);
  await page.reload();
  await expect(page.getByRole("button", { name: "工作" })).toBeVisible({ timeout: 20_000 });

  const gold = await page.evaluate(async (api) => {
    const user = JSON.parse(localStorage.getItem("worklife_user") || "{}") as { token: string };
    const r = await fetch(`${api}/player/state`, {
      headers: { Authorization: `Bearer ${user.token}` },
    });
    const state = await r.json();
    return {
      gold: state.inventory.gold,
      chest: state.inventory.armor_wood_chest,
      userId: user.token ? true : false,
    };
  }, E2E_API);
  expect(gold.chest).toBeGreaterThanOrEqual(1);
  expect(gold.gold).toBeGreaterThanOrEqual(100);

  await page.goto("/");
  await expect(page.getByRole("button", { name: "工作" })).toBeVisible({ timeout: 20_000 });
});
