import { test, expect, type Page } from "@playwright/test";
import { guestLogin, seedT1 } from "./helpers";

async function assertNoHorizontalBleed(page: Page) {
  const m = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
  }));
  expect(m.scrollWidth, JSON.stringify(m)).toBeLessThanOrEqual(m.innerWidth + 1);
}

async function openCraftModal(page: Page) {
  await page.getByRole("button", { name: "木工" }).click();
  await expect(page.getByRole("heading", { name: "木工" })).toBeVisible();
  const recipe = page.locator(".craft-card").filter({ hasText: "制作标准木板" }).first();
  await expect(recipe).toBeVisible({ timeout: 15_000 });
  await recipe.click();
  await expect(page.getByRole("button", { name: /开始制作/ })).toBeVisible();
  await page.keyboard.press("Escape");
}

test.describe("desktop 1280", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("UX-01 desktop T1 shell has usable nav and no page errors", async ({ page }) => {
    const errors: string[] = [];
    const consoleErrors: string[] = [];
    page.on("pageerror", (err) => errors.push(String(err)));
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    await guestLogin(page, `e2e-ux-desk-${Date.now()}`);
    await seedT1(page);
    await page.reload();
    await expect(page.getByRole("button", { name: "伐木" })).toBeVisible({ timeout: 20_000 });
    await assertNoHorizontalBleed(page);

    await openCraftModal(page);

    await page.getByRole("button", { name: "冒险" }).click();
    await page.getByText("果冻史莱姆").first().click();
    await expect(page.getByRole("button", { name: /开始战斗|挑战BOSS/ })).toBeVisible();
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "组队" }).click();
    await expect(page.getByRole("button", { name: "创建队伍" })).toBeVisible();

    const expandRight = page.getByRole("button", { name: "展开角色面板" });
    if (await expandRight.isVisible()) await expandRight.click();
    await page.getByRole("button", { name: "装备" }).last().click();
    await expect(page.getByText("上衣", { exact: true })).toBeVisible();

    expect(errors, errors.join("\n")).toEqual([]);
    const fatalConsole = consoleErrors.filter((t) => !/Failed to load resource|net::ERR_/i.test(t));
    expect(fatalConsole, fatalConsole.join("\n")).toEqual([]);
  });
});

test.describe("mobile 375", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("UX-02 375px mobile T1 shell stays playable", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(String(err)));
    await guestLogin(page, `e2e-ux-mobi-${Date.now()}`);
    await seedT1(page);
    await page.reload();
    await expect(page.getByRole("button", { name: "伐木" })).toBeVisible({ timeout: 20_000 });
    await assertNoHorizontalBleed(page);
    await expect(page.getByRole("button", { name: "生涯" })).toBeVisible();
    await expect(page.locator(".header-gold-value")).toBeVisible();

    await openCraftModal(page);
    await assertNoHorizontalBleed(page);

    await page.getByRole("button", { name: "冒险" }).click();
    await page.getByText("果冻史莱姆").first().click();
    await expect(page.getByRole("button", { name: /开始战斗|挑战BOSS/ })).toBeVisible();
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "组队" }).click();
    await expect(page.getByRole("button", { name: "创建队伍" })).toBeVisible();

    const expandRight = page.getByRole("button", { name: "展开角色面板" });
    if (await expandRight.isVisible()) await expandRight.click();
    await page.getByRole("button", { name: "装备" }).last().click();
    await expect(page.getByText("上衣", { exact: true })).toBeVisible();
    await page.getByText("上衣", { exact: true }).click();
    await expect(page.getByText("木制胸甲").first()).toBeVisible();
    await page.getByRole("button", { name: "取消" }).click();
    await assertNoHorizontalBleed(page);

    await page.getByRole("button", { name: "展开聊天" }).click();
    await expect(page.getByPlaceholder(/发送到/)).toBeVisible();
    await expect(page.getByRole("button", { name: "伐木" })).toBeVisible();

    expect(errors, errors.join("\n")).toEqual([]);
  });
});
