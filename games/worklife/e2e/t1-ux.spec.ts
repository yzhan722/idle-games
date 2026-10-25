import { test, expect, type Page } from "@playwright/test";
import { assertNoHorizontalBleed, guestLogin, openNav, seedT1 } from "./helpers";

async function openCraftModal(page: Page) {
  await openNav(page, "woodworking");
  await expect(page.getByRole("heading", { name: "木工" })).toBeVisible();
  const recipe = page.locator(".craft-row").filter({ hasText: "标准木板" }).first();
  await expect(recipe).toBeVisible({ timeout: 15_000 });
  await expect(recipe.getByText("用于木头短剑")).toBeVisible();
  await recipe.click();
  await expect(page.getByRole("button", { name: /开始制作/ })).toBeVisible();
  await page.keyboard.press("Escape");
}

test.describe("desktop 1280", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("UX-01 desktop MWI-style skill rail: every skill visible, chapter-1 rows recommended", async ({ page }) => {
    const errors: string[] = [];
    const consoleErrors: string[] = [];
    page.on("pageerror", (err) => errors.push(String(err)));
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    await guestLogin(page, `e2e-ux-desk-${Date.now()}`);
    await seedT1(page);
    await page.reload();
    await expect(page.getByRole("button", { name: "工作" })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("button", { name: "制作" })).toBeVisible();
    await expect(page.getByRole("button", { name: "冒险" })).toBeVisible();
    await expect(page.getByRole("button", { name: "角色", exact: true })).toBeVisible();

    // MWI: one row per skill, grouped, with level + XP bar; the whole game is visible from minute one.
    const rail = page.locator("nav.skill-sidebar");
    await expect(rail.locator(".tab-btn.skill-row")).toHaveCount(27);
    await expect(rail.locator(".skill-group")).toHaveCount(4);
    await expect(rail.locator(".skill-group-title")).toHaveText(["采集", "生产", "战斗", "其他"]);
    await expect(rail.locator('[data-nav-id="mining"] .skill-level')).toHaveText("1");
    await expect(rail.locator('[data-nav-id="logging"] .skill-xp-bar')).toBeVisible();
    // MWI combat skills are rows of their own; they read out level + XP and open the combat page.
    await expect(rail.locator('.skill-group[data-group="combat"] .tab-btn.skill-row')).toHaveCount(8);
    await expect(rail.locator('[data-nav-id="combat_melee"] .skill-level')).toHaveText("1");
    await expect(rail.locator('[data-nav-id="combat_intelligence"] .skill-xp-bar')).toBeVisible();
    // Chapter 1 only *recommends* the woodcutter loop; party / trading stay reachable but unmarked.
    await expect(rail.locator(".tab-btn.skill-row.recommended")).toHaveCount(4);
    await expect(rail.locator('[data-nav-id="party"]')).toBeVisible();
    await expect(rail.locator('[data-nav-id="party"]')).not.toHaveClass(/recommended/);
    await expect(rail.locator('[data-nav-id="mining"] .skill-recommended')).toHaveCount(0);
    // MWI puts an icon on every skill row: all 27 rail rows render real art, none fall back to glyphs
    await expect(page.locator(".game-tabs .tab-btn .tab-icon img.t1-art")).toHaveCount(27);
    await expect(page.locator("nav.mobile-nav")).toBeHidden();
    await expect(page.locator(".skill-action-row img.t1-art").first()).toBeVisible();
    await assertNoHorizontalBleed(page);

    await openCraftModal(page);

    // Other skills are real pages, not dead rows.
    await openNav(page, "mining");
    await expect(page.getByRole("heading", { name: /挖矿/ })).toBeVisible();
    await expect(page.locator(".skill-action-row").first()).toBeVisible();
    // MWI gives every gather action its own scene: the locked tier-2 row shows the iron vein, not the ore icon.
    await expect(
      page.locator(".skill-action-row").filter({ hasText: "铁矿脉" }).locator('img.t1-art[data-t1-key="trees/iron"]')
    ).toBeVisible();

    // Tool recipes describe their effect; the enhancer has no speed stat and must not print NaN.
    await openNav(page, "smithing");
    const enhancerRow = page.locator(".craft-row").filter({ hasText: "初级强化器" }).first();
    await expect(enhancerRow).toBeVisible({ timeout: 15_000 });
    await expect(enhancerRow).toContainText("强化成功率 +0.6%");
    await expect(page.locator(".craft-row").filter({ hasText: "NaN" })).toHaveCount(0);
    // Locked level 21–35 recipes already carry their art (the frost set is the deepest of that sweep).
    await page.locator(".craft-categories .category-btn", { hasText: "武器" }).click();
    await expect(
      page.locator(".craft-row").filter({ hasText: "霜寒战刃" }).locator('img.t1-art[data-t1-key="equipment/weapon_frost_blade"]')
    ).toBeVisible();

    await openNav(page, "adventure");
    await expect(page.locator(".monster-card img.t1-art").first()).toBeVisible();
    await expect(page.locator(".monster-card").filter({ hasText: "果冻史莱姆" })).toBeVisible();
    await page.locator(".monster-card").filter({ hasText: "果冻史莱姆" }).first().click();
    await expect(page.getByRole("button", { name: /开始战斗|挑战BOSS/ })).toBeVisible();
    // MWI monster panel: every drop line (rare + ability book) carries the item's art, not text alone.
    await expect(page.locator(".modal-overlay .stat-drop img.t1-art")).toHaveCount(2);
    await page.getByRole("button", { name: /开始战斗/ }).click();
    await expect(page.getByRole("button", { name: /重劈/ })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/格挡中|自然之怒/)).toHaveCount(0);
    // MWI mana + auto-cast: the fight screen shows an MP bar and the equipped ability row.
    await expect(page.locator(".mp-bar")).toBeVisible();
    await expect(page.locator(".ability-bar .ability-btn")).toHaveCount(1);
    const combatControls = await page.locator(".battle-controls-center").boundingBox();
    expect(combatControls).toBeTruthy();
    expect(combatControls!.y + combatControls!.height).toBeLessThanOrEqual(800);
    await expect(page.getByText("胜率预测")).toHaveCount(0);
    await expect(page.locator(".battle-earnings")).toContainText("XP");
    await expect(rail.locator('[data-nav-id="adventure"]')).toHaveClass(/running/);
    await page.getByRole("button", { name: "停止", exact: true }).click();
    // Clicking a combat-skill row opens the combat page (it is a readout, not a page of its own).
    await openNav(page, "logging");
    await rail.locator('[data-nav-id="combat_attack"]').click();
    await expect(page.getByRole("heading", { name: "冒险" })).toBeVisible();
    await expect(rail.locator('[data-nav-id="adventure"]')).toHaveClass(/active/);

    await openNav(page, "character");
    await expect(page.getByRole("heading", { name: "角色" })).toBeVisible();
    await expect(page.locator(".sheet-portrait img.t1-art")).toBeVisible();
    await expect(page.locator(".sheet-stat").filter({ hasText: "生命" })).toBeVisible();
    await expect(page.locator(".sheet-stat").filter({ hasText: "攻击" })).toBeVisible();
    await expect(page.locator(".sheet-combat-skills .sheet-skill")).toHaveCount(7);
    await expect(page.locator('.sheet-skill[data-combat-skill="melee"] .sheet-skill-level')).toHaveText("Lv.1");
    await expect(page.locator('.sheet-skill[data-combat-skill="melee"]')).toHaveClass(/main/); // sword → melee 主修
    await expect(page.locator(".sheet-secondary-stats")).toContainText("魔力 20");
    await expect(page.getByRole("button", { name: "上衣" })).toBeVisible();

    // MWI bag page: grouped tiles with counts; the seeded sword is equipped, wood/boards are materials.
    await page.getByRole("button", { name: "打开背包" }).click();
    await expect(page.getByRole("heading", { name: "背包" })).toBeVisible();
    await expect(page.locator('.inv-group[aria-label="装备"] .inv-tile[data-item-id="weapon_wooden_sword"]')).toHaveClass(/equipped/);
    await expect(page.locator('.inv-group[aria-label="材料"] .inv-tile[data-item-id="wood_1"] .inv-tile-count')).toHaveText("×20");
    // 装备中的物品后端拒绝挂单——先卸下这把剑（成功后模态自动关闭），后面市场环节才能卖出
    await page.locator('.inv-tile[data-item-id="weapon_wooden_sword"]').click();
    await expect(page.getByRole("heading", { name: "木头短剑" })).toBeVisible();
    await page.getByRole("button", { name: "卸下", exact: true }).click();
    await expect(page.locator('.inv-group[aria-label="装备"] .inv-tile[data-item-id="weapon_wooden_sword"]')).not.toHaveClass(/equipped/);
    await page.locator('.inv-tile[data-item-id="lumber_1"]').click();
    await expect(page.getByRole("heading", { name: "标准木板" })).toBeVisible();
    await page.keyboard.press("Escape");

    // MWI task board: the first task is handed out on first sight, the rest of the slots wait on the cooldown.
    await openNav(page, "tasks");
    await expect(page.locator(".tasks-page .section-title")).toContainText("任务");
    await expect(page.locator(".task-card:not(.empty)")).toHaveCount(1, { timeout: 15_000 });
    await expect(page.locator(".task-card:not(.empty) .task-name")).toContainText("×");
    await expect(page.locator(".task-card.empty")).toHaveAttribute("data-empty-slots", "7");
    await expect(page.locator(".task-card.empty")).toContainText("还有 6 个空槽");
    await expect(page.locator(".tasks-shop .task-shop-item")).toHaveCount(7); // 3 upgrades + 4 training charms
    await expect(page.locator(".tasks-shop .task-shop-icon img.t1-art")).toHaveCount(4);

    // MWI houses: one room per skill; the seeded 20 wood + 100 gold afford the first 木料场 level.
    await openNav(page, "houses");
    await expect(page.locator(".houses-page .section-title")).toContainText("房屋");
    await expect(page.locator(".house-room")).toHaveCount(7);
    await expect(page.locator(".house-room .house-room-emoji img.t1-art")).toHaveCount(7);
    const lumberYard = page.locator('.house-room[data-room-id="lumber_yard"]');
    await expect(lumberYard.locator(".house-upgrade")).toHaveText("金币不足"); // 100 gold < 200 (wood is enough, so only gold is short)
    await expect(page.locator('.house-room[data-room-id="forge"] .house-cost-lines .short')).toHaveCount(2);

    // MWI market: searchable grid, the owned shelf, an order-book detail, and cancelling own orders.
    await openNav(page, "trading");
    await expect(page.locator(".market-grid-page")).toBeVisible();
    await expect(page.locator('.inv-group[aria-label="我能卖的"] .inv-tile[data-item-id="lumber_1"]')).toBeVisible();
    await page.getByRole("searchbox", { name: "搜索市场物品" }).fill("短剑");
    await expect(page.locator(".market-grid .inv-tile")).toHaveCount(1);
    await page.locator('.market-grid .inv-tile[data-item-id="weapon_wooden_sword"]').click();
    await expect(page.locator(".trading-detail-title")).toContainText("拥有 1");
    await page.getByRole("button", { name: /挂出售单/ }).click();
    await page.locator(".sell-form input.form-input").first().fill("1");
    await page.locator(".sell-form input.form-input").nth(1).fill("300");
    await page.locator(".sell-form").getByRole("button", { name: "确认挂单" }).click();
    await expect(page.locator(".order-item-compact.sell")).toHaveCount(1, { timeout: 10_000 });
    await page.locator(".btn-back-trading").click();
    await expect(page.locator(".market-order-row")).toHaveCount(1);
    await expect(page.locator(".market-order-row")).toContainText("木头短剑 ×1");
    // MWI: the grid tile shows the live market (best ask) instead of the shop value while an order is open.
    await page.getByRole("searchbox", { name: "搜索市场物品" }).fill("短剑");
    await expect(page.locator('.market-grid .inv-tile[data-item-id="weapon_wooden_sword"] .market-quote')).toContainText("卖 300");
    await page.getByRole("searchbox", { name: "搜索市场物品" }).fill("");
    await page.locator(".market-order-row button").click();
    await expect(page.locator(".market-order-row")).toHaveCount(0);
    await page.getByRole("searchbox", { name: "搜索市场物品" }).fill("短剑");
    await expect(page.locator('.market-grid .inv-tile[data-item-id="weapon_wooden_sword"] .inv-tile-value')).toContainText("店价", { timeout: 10_000 });
    await page.getByRole("searchbox", { name: "搜索市场物品" }).fill("");

    // MWI enhancing: own skill row, +1…+20 table, exact base rate, materials shown, risk stated.
    await openNav(page, "enhance");
    await expect(page.locator(".enhancement-panel .section-title")).toContainText("强化");
    await expect(rail.locator('[data-nav-id="enhance"] .skill-level')).toHaveText("1");
    await expect(page.locator('.enhancement-item[data-item-id="weapon_wooden_sword"]')).toHaveClass(/selected/);
    await expect(page.locator(".enhancement-rate-main strong")).toHaveText("50%");
    await expect(page.locator(".enhancement-stat-preview strong")).toHaveText("+0% → +2%");
    await expect(page.locator(".enhancement-risk")).toHaveText("失败：+0 → +0");
    // MWI: enhancing is a timed action — pick a target, the server attempts every interval (400ms in E2E).
    const attempt = page.locator(".enhancement-attempt");
    await expect(attempt).toHaveText(/开始强化 → \+1（本次 50%）/); // 10 lumber + 100 gold seeded → one attempt affordable
    await attempt.click();
    // The single affordable attempt ends the run either way: reached (+1) or parked for materials (+0).
    await expect(page.locator(".enhance-run")).toHaveAttribute("data-run-state", /reached|materials/, { timeout: 15_000 });
    await expect(page.locator(".enhance-run")).toContainText("已尝试 1 次");
    await expect(page.locator(".enhance-run")).toContainText("强化经验 +");
    await expect(page.locator(".header-gold-value")).toHaveText("0");
    await expect(page.locator(".enhancing-skill-progress small")).not.toHaveText("0/40");
    await expect(page.locator(".activity-status-center")).toHaveClass(/activity-idle/);

    expect(errors, errors.join("\n")).toEqual([]);
    const fatalConsole = consoleErrors.filter((t) => !/Failed to load resource|net::ERR_/i.test(t));
    expect(fatalConsole, fatalConsole.join("\n")).toEqual([]);
  });
});

test.describe("mobile 375", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("UX-02 375px mobile: five-group bottom bar with skill sheets stays playable", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(String(err)));
    await guestLogin(page, `e2e-ux-mobi-${Date.now()}`);
    await seedT1(page);
    await page.reload();
    const bar = page.locator("nav.mobile-nav");
    await expect(bar).toBeVisible({ timeout: 20_000 });
    await expect(page.locator("nav.skill-sidebar")).toBeHidden();
    await expect(bar.locator(".mobile-nav-btn")).toHaveCount(5);
    await expect(bar.locator(".mobile-nav-btn .tab-name")).toHaveText(["采集", "生产", "战斗", "角色", "更多"]);
    await expect(bar.locator(".mobile-nav-btn .tab-icon img.t1-art")).toHaveCount(5);
    await assertNoHorizontalBleed(page);
    await expect(page.locator(".activity-status-center")).toBeVisible();
    const barBox = await bar.boundingBox();
    expect(barBox).toBeTruthy();
    expect(barBox!.y).toBeGreaterThan(600);
    await expect(page.getByRole("button", { name: "生涯" })).toBeVisible();
    await expect(page.locator(".header-gold-value")).toBeVisible();

    // Gathering sheet lists the six gathering skills with level + XP; 伐木 is recommended in chapter 1.
    await bar.locator('[data-mobile-group="gathering"]').click();
    const sheet = page.getByRole("dialog", { name: "采集技能" });
    await expect(sheet).toBeVisible();
    await expect(sheet.locator(".mobile-sheet-row")).toHaveCount(6);
    await expect(sheet.locator('[data-nav-id="logging"]')).toHaveClass(/recommended/);
    await expect(sheet.locator('[data-nav-id="mining"]')).not.toHaveClass(/recommended/);
    await expect(sheet.locator('[data-nav-id="mining"] .skill-level')).toHaveText("Lv.1");
    await assertNoHorizontalBleed(page);
    await sheet.locator('[data-nav-id="logging"]').click();
    await expect(sheet).toBeHidden();
    await expect(page.locator(".skill-action-row").filter({ hasText: "路边的小白杨" })).toBeVisible();
    await expect(bar.locator('[data-mobile-group="gathering"]')).toHaveClass(/active/);

    await openCraftModal(page);
    await assertNoHorizontalBleed(page);

    await openNav(page, "adventure");
    await page.locator(".monster-card").filter({ hasText: "果冻史莱姆" }).first().click();
    await expect(page.getByRole("button", { name: /开始战斗|挑战BOSS/ })).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /开始战斗/ }).click();
    await expect(page.getByRole("button", { name: /重劈/ })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/格挡中|自然之怒/)).toHaveCount(0);
    const combatControls = await page.locator(".battle-controls-center").boundingBox();
    expect(combatControls).toBeTruthy();
    expect(combatControls!.y + combatControls!.height).toBeLessThanOrEqual(barBox!.y + 1);
    await expect(bar.locator('[data-mobile-group="combat"]')).toHaveClass(/running/);
    await page.getByRole("button", { name: "停止", exact: true }).click();

    await openNav(page, "character");
    await expect(page.getByRole("heading", { name: "角色" })).toBeVisible();
    await page.getByRole("button", { name: "上衣" }).click();
    await expect(page.locator(".equip-selector-modal").getByText("木制胸甲")).toBeVisible();
    await page.getByRole("button", { name: "取消" }).click();
    await assertNoHorizontalBleed(page);

    // 更多 sheet keeps trading / party reachable without crowding the bar.
    await bar.locator('[data-mobile-group="more"]').click();
    const more = page.getByRole("dialog", { name: "更多" });
    await expect(more.locator('[data-nav-id="trading"]')).toBeVisible();
    await expect(more.locator('[data-nav-id="party"]')).toBeVisible();
    await more.getByRole("button", { name: "关闭" }).click();
    await expect(more).toBeHidden();

    await page.getByRole("button", { name: "展开聊天" }).click();
    await expect(page.getByPlaceholder(/发送到/)).toBeVisible();
    await expect(bar).toBeVisible();

    expect(errors, errors.join("\n")).toEqual([]);
  });
});
