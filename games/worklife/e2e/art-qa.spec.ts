import { expect, test } from "@playwright/test";
import path from "path";
import { assertNoHorizontalBleed, guestLogin, seedT1, stopActivity } from "./helpers";

const root = path.join("docs", "art", "visual-qa", "baseline");

test("ART-QA deterministic T1 commercial-art surfaces", async ({ page }) => {
  test.setTimeout(180_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await guestLogin(page, "art-qa-fixture");
  await seedT1(page);
  await page.reload();
  await expect(page.getByRole("button", { name: "工作" })).toBeVisible({ timeout: 20_000 });

  const shot = async (folder: string, name: string) => {
    await page.screenshot({ path: path.join(root, folder, name), fullPage: false });
  };

  const boxOf = async (selector: string) =>
    page.locator(selector).first().evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    });
  const expectWebp = async (key: string) => {
    await expect(page.locator(`img[data-t1-key="${key}"]`).first()).toHaveAttribute("src", /\.webp(\?|$)/);
  };
  const expectFullyInViewport = async (selector: string) => {
    const bounds = await page.locator(selector).first().evaluate((el) => {
      const r = el.getBoundingClientRect();
      return {
        left: r.left,
        right: r.right,
        top: r.top,
        bottom: r.bottom,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      };
    });
    expect(bounds.left, JSON.stringify(bounds)).toBeGreaterThanOrEqual(0);
    expect(bounds.right, JSON.stringify(bounds)).toBeLessThanOrEqual(bounds.viewportWidth);
    expect(bounds.top, JSON.stringify(bounds)).toBeGreaterThanOrEqual(0);
    expect(bounds.bottom, JSON.stringify(bounds)).toBeLessThanOrEqual(bounds.viewportHeight);
  };

  const surfaces = async (folder: string) => {
    const mobile = folder === "mobile-390";
    const itemHero = mobile ? 56 : 72;
    const itemMid = mobile ? 32 : 48;

    const workTab = page.getByRole("button", { name: "工作" });
    await expectWebp("ui/logo");
    await expectWebp("ui/gold");
    await expectWebp("ui/nav-logging");
    await expectWebp("ui/nav-woodworking");
    await expectWebp("ui/nav-adventure");
    await expectWebp("ui/nav-character");
    await workTab.click();
    await expect(page.locator(".skill-action-row img.t1-art")).toBeVisible();
    await expectWebp("trees/poplar");
    await expect(workTab).toHaveClass(/active/);
    await expect(workTab.locator('img[data-t1-key="ui/nav-logging"]')).toBeVisible();
    await shot(folder, "work.png");

    await page.getByRole("button", { name: "制作" }).click();
    await expect(workTab).not.toHaveClass(/active/);
    await expect(workTab.locator('img[data-t1-key="ui/nav-logging"]')).toBeVisible();
    await page.getByRole("button", { name: "材料" }).click();
    await expect(page.locator('img[data-t1-key="materials/lumber_1"]').first()).toBeVisible();
    expect(await boxOf('img[data-t1-key="materials/lumber_1"]')).toEqual({ w: itemHero, h: itemHero });
    await page.getByRole("button", { name: "武器" }).click();
    await expect(page.locator('img[data-t1-key="equipment/weapon_wooden_sword"]').first()).toBeVisible();
    expect(await boxOf('img[data-t1-key="equipment/weapon_wooden_sword"]')).toEqual({ w: itemHero, h: itemHero });
    await page.getByRole("button", { name: "防具" }).click();
    await expect(page.locator('img[data-t1-key="equipment/armor_wood_chest"]').first()).toBeVisible();
    expect(await boxOf('img[data-t1-key="equipment/armor_wood_chest"]')).toEqual({ w: itemHero, h: itemHero });
    await page.getByRole("button", { name: "材料" }).click();
    await shot(folder, "craft.png");

    await page.getByRole("button", { name: "角色", exact: true }).click();
    await expect(page.locator(".sheet-portrait img.t1-art")).toBeVisible();
    await expect(page.locator('img[data-t1-key="character/woodcutter"]')).toHaveAttribute("src", /\.webp(\?|$)/);
    const portraitRadius = await page.locator(".sheet-portrait").evaluate((el) => getComputedStyle(el).borderRadius);
    expect(portraitRadius.includes("50%")).toBeFalsy();
    expect((await boxOf(".sheet-portrait")).w).toBeGreaterThanOrEqual(mobile ? 180 : 260);
    expect(await boxOf('.sheet-slot img[data-t1-key="equipment/weapon_wooden_sword"]')).toEqual({
      w: itemHero,
      h: itemHero,
    });
    expect(await boxOf('.sheet-pack-line img[data-t1-key="materials/wood_1"]')).toEqual({ w: itemMid, h: itemMid });
    expect(await boxOf('.sheet-pack-line img[data-t1-key="materials/lumber_1"]')).toEqual({ w: itemMid, h: itemMid });
    await shot(folder, "character.png");

    await page.getByRole("button", { name: "冒险" }).click();
    await expect(page.locator(".monster-card img.t1-art").first()).toBeVisible();
    await expect(page.locator('img[data-t1-key="monsters/slime"]')).toHaveAttribute("src", /\.webp(\?|$)/);
    await expect(page.locator('img[data-t1-key="monsters/forest_boss"]')).toHaveAttribute("src", /\.svg(\?|$)/);
    const slime = await boxOf('img[data-t1-key="monsters/slime"]');
    const crab = await boxOf('img[data-t1-key="monsters/crab"]');
    const monkey = await boxOf('img[data-t1-key="monsters/monkey"]');
    expect(slime).toEqual(crab);
    expect(slime).toEqual(monkey);
    expect(slime.w).toBeGreaterThanOrEqual(mobile ? 120 : 180);
    await shot(folder, "forest.png");

    await page.locator(".monster-card").filter({ hasText: "果冻史莱姆" }).first().click();
    await page.getByRole("button", { name: /开始战斗/ }).click();
    await expect(page.getByRole("button", { name: /重劈/ })).toBeVisible({ timeout: 15_000 });
    await expectWebp("skills/heavy_chop");
    expect(await boxOf('img[data-t1-key="skills/heavy_chop"]')).toEqual({ w: 28, h: 28 });
    const playerRadius = await page
      .locator(".player-entity .entity-avatar")
      .evaluate((el) => getComputedStyle(el).borderRadius);
    expect(playerRadius.includes("50%")).toBeFalsy();
    await expectFullyInViewport(".player-entity .entity-avatar");
    await expectFullyInViewport(".enemy-entity .entity-avatar");
    await assertNoHorizontalBleed(page);
    await shot(folder, "combat-slime.png");
    await stopActivity(page);

    await page.getByRole("button", { name: "冒险" }).click();
    await page.locator(".monster-card").filter({ hasText: "森林管家" }).first().click();
    await page.getByRole("button", { name: /挑战BOSS/ }).click();
    await expect(page.getByRole("button", { name: /重劈/ })).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(".entity-avatar.is-boss-art")).toBeVisible();
    await expectFullyInViewport(".player-entity .entity-avatar");
    await expectFullyInViewport(".enemy-entity .entity-avatar");
    await assertNoHorizontalBleed(page);
    await shot(folder, "combat-boss.png");
    await stopActivity(page);
  };

  await page.setViewportSize({ width: 1440, height: 900 });
  await surfaces("desktop-1440");
  await seedT1(page, "chapter-complete");
  await page.reload();
  await page.getByRole("button", { name: "冒险" }).click();
  await expect(page.locator(".next-goal-bar")).toHaveAttribute("data-goal-id", "complete");
  await shot("desktop-1440", "chapter-complete.png");

  await page.setViewportSize({ width: 390, height: 844 });
  await seedT1(page);
  await page.reload();
  await surfaces("mobile-390");
  await assertNoHorizontalBleed(page);
});

test("ART-QA generated build-skill candidates at desktop and mobile sizes", async ({ page }) => {
  test.setTimeout(180_000);
  await page.emulateMedia({ reducedMotion: "reduce" });

  for (const scene of [
    { folder: "desktop-1440", width: 1440, height: 900, icon: 40 },
    { folder: "mobile-390", width: 390, height: 844, icon: 36 },
  ]) {
    await page.setViewportSize({ width: scene.width, height: scene.height });
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await guestLogin(page, `art-qa-skills-${scene.folder}-${Date.now()}`);
    await seedT1(page);
    await page.reload();

    await page.getByRole("button", { name: "冒险" }).click();
    await page.locator(".monster-card").filter({ hasText: "果冻史莱姆" }).first().click();
    await page.getByRole("button", { name: /开始战斗/ }).click();
    await expect(page.locator(".log-entry").filter({ hasText: "果冻史莱姆 被击败了！" })).toBeVisible({
      timeout: 45_000,
    });
    await expect(page.getByRole("heading", { name: "选择你的第一刀" })).toBeVisible({ timeout: 15_000 });

    for (const key of ["skills/sharpened_edge", "skills/thick_bark"]) {
      await expect(page.locator(`img[data-t1-key="${key}"]`)).toHaveAttribute("src", /\.webp(\?|$)/);
      const box = await page.locator(`img[data-t1-key="${key}"]`).evaluate((el) => {
        const r = el.getBoundingClientRect();
        return { w: Math.round(r.width), h: Math.round(r.height) };
      });
      expect(box).toEqual({ w: scene.icon, h: scene.icon });
    }

    await page.screenshot({ path: path.join(root, scene.folder, "build-skills.png"), fullPage: false });
    if (scene.width === 390) await assertNoHorizontalBleed(page);
    await page.getByRole("button", { name: /厚树皮/ }).click({ force: true });
    await stopActivity(page);
  }
});
