import { test, expect } from "@playwright/test";
import { guestLogin } from "./helpers";

test("E2E-04 double click on craft start hits the backend once", async ({ page }) => {
  await guestLogin(page, `e2e-dbl-${Date.now()}`);
  await page.getByRole("button", { name: "木工" }).click();
  await page.getByText("制作标准木板").first().click();

  const starts: string[] = [];
  page.on("request", (req) => {
    if (req.method() === "POST" && req.url().includes("/actions/start")) {
      starts.push(req.url());
    }
  });

  const startBtn = page.getByRole("button", { name: /开始制作/ });
  await expect(startBtn).toBeEnabled();
  await startBtn.evaluate((el) => {
    const btn = el as HTMLButtonElement;
    btn.click();
    btn.click();
  });
  await page.waitForTimeout(800);
  expect(starts.length).toBe(1);
});
