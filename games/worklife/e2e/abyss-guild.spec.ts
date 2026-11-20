import { test, expect, type Page } from "@playwright/test";
import { E2E_API, assertNoHorizontalBleed, finishOnboarding, primaryNav, seedT1 } from "./helpers";

/**
 * WL-18 深海遗迹潜航 & 冒险者行会公会战：从「生涯 → 远期」入口进入酒馆面板的新分页，真实下潜遗迹、发起一场公会战，
 * 并确认顶栏胶囊数不变、手机宽度下八个分页都能点到。种子场景 abyss-guild（backend/src/index.ts）：
 * 厨师 40 级、3 级「黄金头盔潜装」（可下前三层），第 1 层今天已下潜 1 次；行会勋章 60（银徽骑手），本周已击败第 1 席、用掉 2 次挑战。
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

async function openAbyssPanel(page: Page) {
  await page.locator(".header-menu-btn").click();
  const entry = page.getByRole("menuitem", { name: "潜航会战" });
  await entry.scrollIntoViewIfNeeded();
  await entry.click();
  await expect(page.locator('[data-testid="tavern-chronicle-panel"]')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('[data-testid="abyss-dive-view"]')).toBeVisible({ timeout: 20_000 });
}

/** 登录页已改版（无设备 ID 输入框）：直接调游客接口拿会话，写进 SPA 读取的 localStorage 后进游戏（同 WL-17 spec）。 */
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
  await seedT1(page, "abyss-guild");
  await page.reload();
  await expect(primaryNav(page)).toBeVisible({ timeout: 20_000 });
  await finishOnboarding(page);
}

test.describe("WL-18 abyss ruin dive & adventurer guild war", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("WL18-01 远期 entry opens the merged tabs; a real dive brings back real salvage and a real guild-war duel is fought", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(String(err)));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await seeded(page);

    // header unchanged: 9 pills + 生涯, none of them for WL-18
    await expect(page.locator(".header-right > button")).toHaveCount(10);
    expect(await page.locator('header [data-testid*="abyss"], header [class*="abyss"], header [class*="guild-war"]').count()).toBe(0);

    await openAbyssPanel(page);
    await expect(page.locator(".prog-title")).toContainText("深海遗迹潜航");
    await expect(page.locator('[data-testid="tavern-tab-dive"]')).toHaveClass(/active/);
    await expect(page.locator('[data-testid="abyss-gear-name"]')).toContainText("黄金头盔潜装");
    await expect(page.locator('[data-testid^="abyss-layer-"]')).toHaveCount(5);
    await expect(page.locator('[data-testid="abyss-dive-btn-4"]')).toBeDisabled();
    await expect(page.locator('[data-testid="abyss-dive-btn-4"]')).toContainText("需升级潜水装备");
    await expect(page.locator('[data-testid="abyss-gear-btn"]')).toContainText("材料不足");

    const before = await apiGet(page, "/progression2/abyss");
    expect(before.status).toBe(200);
    const layer2 = before.body.dive.layers[1];
    expect(layer2.canDive).toBe(true);
    const bagBefore = Number(layer2.salvage.find((x: any) => x.id === layer2.ruin.itemId)?.have || 0);
    await expect(page.locator('[data-testid="abyss-oxygen-left"]')).toHaveText(String(before.body.dive.oxygen.left));
    await page.locator('[data-testid="abyss-dive-btn-2"]').click();
    await expect(page.locator('[data-testid="abyss-total-dives"]')).toHaveText(String(before.body.dive.totals.dives + 1), { timeout: 15_000 });
    await expect(page.locator('[data-testid="abyss-oxygen-left"]')).toHaveText(String(before.body.dive.oxygen.left - layer2.ruin.oxygenCost));
    const after = await apiGet(page, "/progression2/abyss");
    expect(after.body.dive.layers[1].divesUsed).toBe(layer2.divesUsed + 1);
    expect(after.body.dive.lastDive.itemId).toBe(layer2.ruin.itemId);
    expect(after.body.dive.lastDive.qty).toBe(layer2.ruin.qty);
    const bagAfter = Number(after.body.dive.layers[1].salvage.find((x: any) => x.id === layer2.ruin.itemId)?.have || 0);
    expect(bagAfter).toBe(bagBefore + layer2.ruin.qty);
    await assertNoHorizontalBleed(page);

    // 公会战 tab: rank / medals / attempts from the seed, then one real sandbox duel against seat 2
    await page.locator('[data-testid="tavern-tab-guildwar"]').click();
    await expect(page.locator('[data-testid="guild-war-view"]')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(".prog-title")).toContainText("冒险者行会公会战");
    await expect(page.locator('[data-testid="guild-rank-name"]')).toContainText("银徽骑手");
    await expect(page.locator('[data-testid="guild-medals"]')).toHaveText("60");
    await expect(page.locator('[data-testid="guild-attempts-left"]')).toHaveText("6");
    await expect(page.locator('[data-testid="guild-bonuses"]')).toContainText("金币 +1%");
    await expect(page.locator('[data-testid^="guild-seat-"]')).toHaveCount(5);
    await expect(page.locator('[data-testid="guild-seat-1"]')).toContainText("本周已击败");
    const fight = page.locator('[data-testid="guild-challenge-btn"]');
    await expect(fight).toContainText("挑战第 2 席");
    await fight.click();
    await expect(page.locator('[data-testid="guild-attempts-left"]')).toHaveText("5", { timeout: 20_000 });
    const saved = await apiGet(page, "/progression2/abyss");
    expect(saved.body.guild.attemptsUsed).toBe(3);
    expect(saved.body.guild.lastDuel.seat).toBe(2);
    expect(saved.body.guild.rank.totalMedals).toBe(saved.body.guild.lastDuel.won ? 60 + 5 : 60);

    // the older tabs of the same panel still render
    await page.locator('[data-testid="tavern-tab-mine"]').click();
    await expect(page.locator('[data-testid="mine-view"]')).toBeVisible({ timeout: 15_000 });
    await page.locator('[data-testid="tavern-tab-dive"]').click();
    await expect(page.locator('[data-testid="abyss-dive-view"]')).toBeVisible({ timeout: 15_000 });
    await assertNoHorizontalBleed(page);
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("WL18-02 phone 390: header keeps 5 visible buttons and all eight panel tabs stay on screen and clickable", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seeded(page);
    const visible = await page.locator(".header-right > button").evaluateAll((els) =>
      els.filter((e) => e.getBoundingClientRect().width > 0 && getComputedStyle(e).display !== "none").length
    );
    expect(visible).toBe(5);
    await openAbyssPanel(page);
    const tabs = page.locator(".tv-tab-bar .prog-filter-btn");
    await expect(tabs).toHaveCount(8);
    for (let i = 0; i < 8; i++) {
      const box = await tabs.nth(i).boundingBox();
      expect(box, `tab ${i}`).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(390);
    }
    await assertNoHorizontalBleed(page);
    await page.locator('[data-testid="tavern-tab-guildwar"]').click();
    await expect(page.locator('[data-testid="guild-war-view"]')).toBeVisible({ timeout: 15_000 });
    await assertNoHorizontalBleed(page);
    await page.locator('[data-testid="tavern-tab-dive"]').click();
    await expect(page.locator('[data-testid="abyss-dive-view"]')).toBeVisible({ timeout: 15_000 });
    await assertNoHorizontalBleed(page);
  });
});
