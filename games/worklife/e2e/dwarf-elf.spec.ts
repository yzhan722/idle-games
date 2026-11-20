import { test, expect, type Page } from "@playwright/test";
import { E2E_API, assertNoHorizontalBleed, finishOnboarding, primaryNav, seedT1 } from "./helpers";

/**
 * WL-17 矮人地底矿脉 & 精灵林地驿站：从「生涯 → 远期」入口进入酒馆面板的新分页，真实派矿车下井、交付采集 / 远征委托，
 * 并确认顶栏胶囊数不变、手机宽度下六个分页都能点到。种子场景 dwarf-elf（backend/src/index.ts）：
 * 铁匠采矿 50 级、矿道第 3 层、2 级矿车；驿站好感 120，第 1 张采集委托与远征委托可交付，第 2 张采集委托差 3 件。
 */

async function apiGet(page: Page, p: string) {
  return page.evaluate(
    async ({ api, path }) => {
      const user = JSON.parse(localStorage.getItem("worklife_user") || "{}") as { token?: string };
      const r = await fetch(`${api}${path}`, { headers: { Authorization: `Bearer ${user.token}` } });
      return { status: r.status, body: await r.json() };
    },
    { api: E2E_API, path: p }
  );
}

async function openMinePanel(page: Page) {
  await page.locator(".header-menu-btn").click();
  const entry = page.getByRole("menuitem", { name: "矿脉驿站" });
  await entry.scrollIntoViewIfNeeded();
  await entry.click();
  await expect(page.locator('[data-testid="tavern-chronicle-panel"]')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('[data-testid="mine-view"]')).toBeVisible({ timeout: 20_000 });
}

/**
 * 登录页已改为账号 / 密码 + 「10 秒注册」（不再有设备 ID 输入框），这里走同一个后端的游客接口拿到会话，
 * 写进 SPA 读取的 localStorage「worklife_user」后再进游戏（与 WL-16 视觉自检脚本同一做法）。
 */
async function guestSession(page: Page) {
  const res = await page.request.post(`${E2E_API}/auth/guest`, { data: {} });
  expect(res.status()).toBe(200);
  const guest = (await res.json()) as { token: string; userId: string };
  expect(guest.token).toBeTruthy();
  await page.addInitScript((u) => {
    if (!localStorage.getItem("worklife_user")) localStorage.setItem("worklife_user", JSON.stringify(u));
  }, { id: guest.userId, token: guest.token });
  await page.goto("/");
  await expect(primaryNav(page)).toBeVisible({ timeout: 30_000 });
  await finishOnboarding(page);
}

async function seeded(page: Page) {
  await guestSession(page);
  await seedT1(page, "dwarf-elf");
  await page.reload();
  await expect(primaryNav(page)).toBeVisible({ timeout: 20_000 });
  await finishOnboarding(page);
}

test.describe("WL-17 dwarf mine & elf waystation", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("WL17-01 生涯 entry opens the merged tabs; a real haul goes down the mine and real commissions are handed in", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(String(err)));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await seeded(page);

    // header unchanged: 9 pills + 生涯, none of them for WL-17
    const headerButtons = page.locator(".header-right > button");
    await expect(headerButtons).toHaveCount(10);
    expect(await page.locator('header [data-testid*="mine"], header [class*="dwarf"], header [class*="waystation"]').count()).toBe(0);

    await openMinePanel(page);
    await expect(page.locator(".prog-title")).toContainText("矮人地底矿脉");
    await expect(page.locator('[data-testid="tavern-tab-mine"]')).toHaveClass(/active/);
    await expect(page.locator('[data-testid="mine-depth-name"]')).toContainText("隔热石拱矿道");
    await expect(page.locator('[data-testid="mine-cart-capacity"]')).toHaveText("12");
    await expect(page.locator('[data-testid^="mine-layer-"]')).toHaveCount(6);
    // depth 3 + mining 50: layers 1~3 open, 4~6 locked by the shaft
    await expect(page.locator('[data-testid="mine-haul-btn-4"]')).toBeDisabled();
    await expect(page.locator('[data-testid="mine-haul-btn-4"]')).toContainText("需掘进到第 4 层");
    await expect(page.locator('[data-testid="mine-depth-btn"]')).toContainText("材料不足");

    const before = await apiGet(page, "/progression2/mine");
    expect(before.status).toBe(200);
    const layer3 = before.body.mine.layers[2];
    expect(layer3.canHaul).toBe(true);
    const haulBtn = page.locator('[data-testid="mine-haul-btn-3"]');
    await expect(haulBtn).toBeEnabled();
    await haulBtn.click();
    await expect(page.locator('[data-testid="mine-haul"]')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('[data-testid="mine-status"]')).toContainText("第 3 层");
    await expect(page.locator('[data-testid="mine-haul-btn-1"]')).toBeDisabled();
    await expect(page.locator('[data-testid="mine-cart-btn"]')).toContainText("矿车在井下");
    const after = await apiGet(page, "/progression2/mine");
    expect(after.body.mine.haul.layer).toBe(3);
    expect(after.body.mine.haul.oreId).toBe(layer3.vein.oreId);
    expect(after.body.mine.haul.oreQty).toBe(layer3.yield.oreQty);
    expect(after.body.mine.layers[2].haulsLeft).toBe(layer3.haulsLeft - 1);
    await assertNoHorizontalBleed(page);

    // 精灵驿站 tab: hand in the stocked gather commission and the reached expedition commission
    await page.locator('[data-testid="tavern-tab-waystation"]').click();
    await expect(page.locator('[data-testid="elf-waystation-view"]')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(".prog-title")).toContainText("精灵林地驿站");
    await expect(page.locator('[data-testid="elf-favor-name"]')).toContainText("树语之友");
    await expect(page.locator('[data-testid="elf-favor-total"]')).toHaveText("120");
    await expect(page.locator('[data-testid="elf-bonuses"]')).toContainText("采集速度 +2%");
    const board = after.body.elf.commissions as Array<{ slot: number; kind: string; favor: number; itemId?: string; qty?: number }>;
    await expect(page.locator('[data-testid="elf-deliver-btn-1"]')).toBeDisabled();
    await page.locator('[data-testid="elf-deliver-btn-0"]').click();
    await expect(page.locator('[data-testid="elf-completed"]')).toHaveText("1", { timeout: 15_000 });
    await expect(page.locator('[data-testid="elf-favor-total"]')).toHaveText(String(120 + board[0].favor));
    await expect(page.locator('[data-testid="elf-deliver-btn-0"]')).toContainText("已完成");
    const expedition = page.locator('[data-testid="elf-deliver-btn-2"]');
    await expect(expedition).toBeEnabled();
    await expedition.click();
    await expect(page.locator('[data-testid="elf-completed"]')).toHaveText("2", { timeout: 15_000 });
    await expect(page.locator('[data-testid="elf-favor-total"]')).toHaveText(String(120 + board[0].favor + board[2].favor));
    const saved = await apiGet(page, "/progression2/mine");
    expect(saved.body.elf.completedCount).toBe(2);
    expect(saved.body.elf.favor.total).toBe(120 + board[0].favor + board[2].favor);
    expect(saved.body.mine.haul.layer).toBe(3);

    // the older tabs of the same panel still render
    await page.locator('[data-testid="tavern-tab-airship"]').click();
    await expect(page.locator('[data-testid="airship-view"]')).toBeVisible({ timeout: 15_000 });
    await page.locator('[data-testid="tavern-tab-tavern"]').click();
    await expect(page.locator('[data-testid="tavern-fame-name"]')).toBeVisible({ timeout: 15_000 });
    await assertNoHorizontalBleed(page);
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("WL17-02 phone 390: header keeps 5 visible buttons and all panel tabs (8 since WL-18) stay on screen and clickable", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seeded(page);
    const visible = await page.locator(".header-right > button").evaluateAll((els) =>
      els.filter((e) => e.getBoundingClientRect().width > 0 && getComputedStyle(e).display !== "none").length
    );
    expect(visible).toBe(5);
    await openMinePanel(page);
    const tabs = page.locator(".tv-tab-bar .prog-filter-btn");
    await expect(tabs).toHaveCount(8);
    for (let i = 0; i < 8; i++) {
      const box = await tabs.nth(i).boundingBox();
      expect(box, `tab ${i}`).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(390);
    }
    await page.locator('[data-testid="tavern-tab-waystation"]').click();
    await expect(page.locator('[data-testid="elf-waystation-view"]')).toBeVisible({ timeout: 15_000 });
    await page.locator('[data-testid="tavern-tab-mine"]').click();
    await expect(page.locator('[data-testid="mine-view"]')).toBeVisible({ timeout: 15_000 });
    await assertNoHorizontalBleed(page);
  });
});
