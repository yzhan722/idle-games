import { expect, type Page } from "@playwright/test";

export async function guestLogin(page: Page, deviceId: string) {
  await page.goto("/");
  await page.getByLabel(/设备 ID/).fill(deviceId);
  await page.getByRole("button", { name: "开始打工" }).click();
  await expect(page.getByRole("button", { name: "伐木" })).toBeVisible({ timeout: 20_000 });
}

export async function seedT1(page: Page) {
  const res = await page.evaluate(async () => {
    const raw = localStorage.getItem("worklife_user");
    if (!raw) throw new Error("missing worklife_user");
    const user = JSON.parse(raw) as { token: string };
    const r = await fetch("http://127.0.0.1:3101/e2e/seed", {
      method: "POST",
      headers: { Authorization: `Bearer ${user.token}` },
    });
    return { status: r.status, body: await r.json() };
  });
  expect(res.status).toBe(200);
  expect(res.body.ok).toBe(true);
}
