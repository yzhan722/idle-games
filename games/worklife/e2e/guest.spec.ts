import { test, expect } from "@playwright/test";
import { guestLogin } from "./helpers";

test("E2E-01 guest bootstrap loads the main shell", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(String(err)));
  await guestLogin(page, `e2e-guest-${Date.now()}`);
  await expect(page.getByText("打工生活").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "工作" })).toBeVisible();
  await expect(page.getByRole("button", { name: "制作" })).toBeVisible();
  await expect(page.getByRole("button", { name: "冒险" })).toBeVisible();
  await expect(page.getByRole("button", { name: "角色", exact: true })).toBeVisible();
  expect(errors, errors.join("\n")).toEqual([]);
});
