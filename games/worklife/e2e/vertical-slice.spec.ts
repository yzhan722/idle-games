import { expect, test } from "@playwright/test";
import path from "path";
import {
  assertNoHorizontalBleed,
  craftNamed,
  fightNamed,
  guestLogin,
  startPoplar,
  stopActivity,
  waitGoal,
  waitIdle,
  waitPackAtLeast,
} from "./helpers";

const shot = (name: string) => path.join("docs", "vertical-slice", "phase10", name);

test("VS-01 first-hour vertical slice on real UI and backend", async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(String(err)));

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await guestLogin(page, `vs-chapter-${Date.now()}`);
  await waitGoal(page, "chop");
  await page.screenshot({ path: shot("01-guest-work.png"), fullPage: false });

  await startPoplar(page);
  await waitGoal(page, "board", 20_000);
  // Gather enough for three boards before stopping. The UI now mirrors pack timing exactly, so the
  // goal flips on the very first log instead of after a slow client refresh had banked a dozen.
  await waitPackAtLeast(page, "原木", 6);
  await stopActivity(page);
  await page.getByRole("button", { name: "工作" }).click();
  await page.screenshot({ path: shot("02-first-wood.png"), fullPage: false });

  await craftNamed(page, "制作标准木板", "材料");
  await waitGoal(page, "sword", 20_000);
  await waitPackAtLeast(page, "木板", 3);
  await stopActivity(page);

  await craftNamed(page, "制作木头短剑", "武器");
  await waitGoal(page, "equip_sword", 20_000);
  await stopActivity(page);

  await page.getByRole("button", { name: "角色", exact: true }).click();
  await page.getByRole("button", { name: "主手" }).click();
  await page.locator(".equip-selector-modal").getByText("木头短剑").first().click();
  await waitGoal(page, "first_kill", 15_000);
  await page.screenshot({ path: shot("03-sword-on.png"), fullPage: false });
  await page.getByRole("button", { name: "冒险" }).click();
  await expect(page.getByRole("button", { name: "去做护甲" })).toHaveCount(0);

  await fightNamed(page, "果冻史莱姆", { pickBark: true });
  await waitGoal(page, "archetypes", 15_000);
  await page.screenshot({ path: shot("04-slime-build.png"), fullPage: false });

  await fightNamed(page, "铁壳寄居蟹");
  await fightNamed(page, "捣蛋小猴");
  await waitGoal(page, "chest", 20_000);

  await startPoplar(page);
  await waitPackAtLeast(page, "原木", 12);
  await stopActivity(page);
  await craftNamed(page, "制作标准木板", "材料");
  await waitPackAtLeast(page, "木板", 6);
  await stopActivity(page);
  await craftNamed(page, "制作木制胸甲", "防具");
  // A single craft finishes on its own; clicking 停止 here could cancel it before the item lands.
  await waitIdle(page);
  await page.getByRole("button", { name: "角色", exact: true }).click();
  await page.getByRole("button", { name: "上衣" }).click();
  await page.locator(".equip-selector-modal").getByText("木制胸甲").first().click();
  await waitGoal(page, "boss", 20_000);

  await page.getByRole("button", { name: "冒险" }).click();
  await page.locator(".monster-card").filter({ hasText: "森林管家" }).first().click();
  await page.getByRole("button", { name: /挑战BOSS/ }).click();
  await expect(page.getByRole("button", { name: /重劈/ })).toBeVisible({ timeout: 15_000 });
  // 重劈 auto-casts by trigger now (MWI); a manual click is only an override when it is off cooldown.
  const guard = page.getByText("格挡中");
  if (await guard.isVisible({ timeout: 20_000 }).catch(() => false)) {
    const heavy = page.getByRole("button", { name: /重劈/ });
    if (await heavy.isEnabled().catch(() => false)) await heavy.click().catch(() => undefined);
  }
  await expect(page.locator(".log-entry").filter({ hasText: "森林管家(BOSS) 被击败了！" })).toBeVisible({
    timeout: 45_000,
  });
  await stopActivity(page);
  await waitGoal(page, "complete", 20_000);
  await page.getByRole("button", { name: "冒险" }).click();
  // Chapter done: the whole forest is listed (MWI), boss last, each card with its own forecast.
  await expect(page.locator(".monster-card")).toHaveCount(7);
  await expect(page.locator(".monster-card").last()).toContainText("森林管家");
  // Zones open in pack order once their roster has art (MWI lists zones by level); the first zone
  // without art is the locked door.
  await expect(page.locator(".map-btn.locked")).toHaveText("熔岩深渊（未开放）");
  await expect(page.locator(".map-btn.locked")).toBeDisabled();
  await page.getByRole("button", { name: "叮当响矿山", exact: true }).click();
  await expect(page.locator(".monster-card")).toHaveCount(7);
  await expect(page.locator(".monster-card").first()).toContainText("碎石傀儡");
  await expect(page.locator(".monster-card").last()).toContainText("矿山霸主");
  await expect(page.locator(".monster-card img.t1-art")).toHaveCount(7);
  await page.getByRole("button", { name: "雾蒙蒙沼泽", exact: true }).click();
  await expect(page.locator(".monster-card")).toHaveCount(7);
  await expect(page.locator(".monster-card").first()).toContainText("毒雾青蛙");
  await expect(page.locator(".monster-card").last()).toContainText("沼泽之王");
  await expect(page.locator(".monster-card img.t1-art")).toHaveCount(7);
  await page.getByRole("button", { name: "冰封雪山", exact: true }).click();
  await expect(page.locator(".monster-card")).toHaveCount(7);
  await expect(page.locator(".monster-card").first()).toContainText("冰原雪狼");
  await expect(page.locator(".monster-card").last()).toContainText("霜冠雪魔");
  await expect(page.locator(".monster-card img.t1-art")).toHaveCount(7);
  await page.getByRole("button", { name: "呼呼大睡森林", exact: true }).click();
  await expect(page.locator(".monster-card").first()).toContainText("果冻史莱姆");
  await page.screenshot({ path: shot("05-chapter-complete-desktop.png"), fullPage: false });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".next-goal-bar")).toHaveAttribute("data-goal-id", "complete");
  await assertNoHorizontalBleed(page);
  await page.screenshot({ path: shot("06-chapter-complete-mobile.png"), fullPage: false });

  expect(errors, errors.join("\n")).toEqual([]);
});
