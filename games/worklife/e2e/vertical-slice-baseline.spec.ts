import { test } from "@playwright/test";
import path from "path";
import { guestLogin, seedT1 } from "./helpers";

const out = (vp: string, name: string) =>
  path.join("docs", "vertical-slice", "baseline", vp, `${name}.png`);

const VIEWPORTS = [
  { id: "desktop-1440", width: 1440, height: 900 },
  { id: "tablet-1024", width: 1024, height: 768 },
  { id: "mobile-390", width: 390, height: 844 },
] as const;

test("capture vertical-slice product baseline screenshots", async ({ page }) => {
  test.skip(!process.env.VS_CAPTURE, "opt-in: VS_CAPTURE=1");
  test.setTimeout(180_000);

  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.getByRole("button", { name: "开始打工" }).waitFor({ timeout: 20_000 });
    await page.screenshot({ path: out(vp.id, "01-login"), fullPage: false });

    await guestLogin(page, `vs-base-${vp.id}-${Date.now()}`);
    await seedT1(page);
    await page.reload();
    await page.getByRole("button", { name: "工作" }).waitFor({ timeout: 20_000 });
    await page.screenshot({ path: out(vp.id, "02-idle"), fullPage: false });

    await page.getByRole("button", { name: "工作" }).click();
    await page.getByRole("heading", { name: "伐木" }).waitFor();
    await page.screenshot({ path: out(vp.id, "03-logging"), fullPage: false });

    await page.getByRole("button", { name: "制作" }).click();
    await page.getByRole("heading", { name: "木工" }).waitFor();
    await page.screenshot({ path: out(vp.id, "04-crafting"), fullPage: false });

    const expand = page.getByRole("button", { name: "展开角色面板" });
    if (await expand.isVisible()) await expand.click();
    await page.getByRole("button", { name: "装备" }).last().click();
    await page.getByText("上衣", { exact: true }).waitFor();
    await page.screenshot({ path: out(vp.id, "05-equipment"), fullPage: false });
    const collapse = page.getByRole("button", { name: "收起角色面板" });
    if (await collapse.isVisible()) await collapse.click();

    await page.getByRole("button", { name: "冒险" }).click();
    await page.getByRole("heading", { name: "冒险" }).waitFor();
    await page.screenshot({ path: out(vp.id, "06-forest"), fullPage: false });
    await page.getByText("果冻史莱姆").first().click();
    await page.getByRole("button", { name: /开始战斗/ }).waitFor();
    await page.screenshot({ path: out(vp.id, "07-combat-modal"), fullPage: false });
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "生涯" }).click();
    await page.getByRole("menuitem", { name: "成就" }).waitFor();
    await page.screenshot({ path: out(vp.id, "08-career-menu"), fullPage: false });
  }
});
