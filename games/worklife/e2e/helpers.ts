import { expect, type Page } from "@playwright/test";

/** Backend base URL for direct API calls in specs (seeding, raw state); mirrors playwright.config.ts. */
export const E2E_API = `http://127.0.0.1:${Number(process.env.E2E_API_PORT || 43101)}`;

export async function assertNoHorizontalBleed(page: Page) {
  const m = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
  }));
  expect(m.scrollWidth, JSON.stringify(m)).toBeLessThanOrEqual(m.innerWidth + 1);
}

/** Either primary navigation: desktop skill rail or the mobile five-group bar. */
export const primaryNav = (page: Page) => page.locator("nav.skill-sidebar:visible, nav.mobile-nav:visible").first();

/**
 * First-run overlays — 创建角色, then 新手指引 — sit on top of the whole shell for a fresh guest.
 * A player clears them once (the flags are saved on the account); specs must do the same before they click.
 */
export async function finishOnboarding(page: Page) {
  const create = page.getByRole("dialog", { name: "创建角色" });
  if (await create.waitFor({ state: "visible", timeout: 5_000 }).then(() => true, () => false)) {
    await create.locator(".cc-name").fill("E2E 打工人");
    await create.getByRole("button", { name: "进入异世界" }).click();
    await expect(create).toBeHidden({ timeout: 10_000 });
  }
  const guide = page.getByRole("dialog", { name: "新手指引" });
  if (await guide.waitFor({ state: "visible", timeout: 3_000 }).then(() => true, () => false)) {
    await guide.getByRole("button", { name: "跳过" }).click();
    await expect(guide).toBeHidden({ timeout: 10_000 });
  }
}

export async function guestLogin(page: Page, deviceId: string) {
  await page.goto("/");
  await page.getByLabel(/设备 ID/).fill(deviceId);
  await page.getByRole("button", { name: "开始打工" }).click();
  await expect(primaryNav(page)).toBeVisible({ timeout: 20_000 });
  await finishOnboarding(page);
}

type NavId =
  | "logging" | "mining" | "farming" | "fishing" | "gathering" | "crystal_mining"
  | "woodworking" | "smithing" | "husbandry" | "cooking" | "tailoring" | "alchemy" | "enhance"
  | "adventure" | "character" | "inventory" | "tasks" | "houses" | "trading" | "party";

const MOBILE_GROUP: Record<NavId, "gathering" | "production" | "combat" | "character" | "more"> = {
  logging: "gathering", mining: "gathering", farming: "gathering", fishing: "gathering", gathering: "gathering", crystal_mining: "gathering",
  woodworking: "production", smithing: "production", husbandry: "production", cooking: "production", tailoring: "production", alchemy: "production", enhance: "production",
  adventure: "combat",
  character: "character",
  inventory: "more", tasks: "more", houses: "more", trading: "more", party: "more",
};

/**
 * Open a skill page the way a player would on the current viewport: click the rail row on desktop,
 * or tap the bottom-bar group and pick the row from its sheet on mobile.
 */
export async function openNav(page: Page, id: NavId) {
  const mobileBar = page.locator("nav.mobile-nav");
  if (await mobileBar.isVisible().catch(() => false)) {
    const group = MOBILE_GROUP[id];
    const groupBtn = mobileBar.locator(`[data-mobile-group="${group}"]`);
    if (group === "combat" || group === "character") {
      await groupBtn.click();
      return;
    }
    const sheetRow = page.locator(`.mobile-nav-sheet [data-nav-id="${id}"]`);
    if (!(await sheetRow.isVisible().catch(() => false))) {
      await groupBtn.click();
    }
    await sheetRow.click();
    return;
  }
  await page.locator(`nav.skill-sidebar [data-nav-id="${id}"]`).click();
}

export async function seedT1(page: Page, scene?: "chapter-complete" | "combat-levels") {
  const res = await page.evaluate(async ({ sceneName, api }) => {
    const raw = localStorage.getItem("worklife_user");
    if (!raw) throw new Error("missing worklife_user");
    const user = JSON.parse(raw) as { token: string };
    const r = await fetch(`${api}/e2e/seed`, {
      method: "POST",
      headers: { Authorization: `Bearer ${user.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(sceneName ? { scene: sceneName } : {}),
    });
    return { status: r.status, body: await r.json() };
  }, { sceneName: scene, api: E2E_API });
  expect(res.status).toBe(200);
  expect(res.body.ok).toBe(true);
}

export async function waitGoal(page: Page, id: string, timeout = 60_000) {
  await expect(page.locator(".next-goal-bar")).toHaveAttribute("data-goal-id", id, { timeout });
}

/** Wait until the server-driven header shows no running activity (single crafts auto-complete). */
export async function waitIdle(page: Page, timeout = 15_000) {
  await expect(page.locator(".activity-status-center")).toHaveClass(/activity-idle/, { timeout });
}

export async function stopActivity(page: Page) {
  const stop = page.getByRole("button", { name: "停止", exact: true });
  if (await stop.isVisible().catch(() => false)) {
    // The header now mirrors the server: a batch that finishes while we reach for 停止 removes
    // the button, so a click that loses that race is fine.
    await stop.click({ timeout: 3_000 }).catch(() => undefined);
  }
  const back = page.getByRole("button", { name: "← 返回" });
  if (await back.isVisible().catch(() => false)) {
    await back.click();
  }
}

export async function startPoplar(page: Page) {
  await openNav(page, "logging");
  await page.locator(".skill-action-row").filter({ hasText: "路边的小白杨" }).click();
  await page.getByRole("button", { name: "开始采集" }).click();
}

export async function craftNamed(page: Page, cardText: string, category: "材料" | "武器" | "防具") {
  await openNav(page, "woodworking");
  await page.getByRole("button", { name: category }).click();
  await page.locator(".craft-row").filter({ hasText: cardText }).first().click();
  const maxBtn = page.getByRole("button", { name: "最大" });
  if (await maxBtn.isEnabled()) {
    await maxBtn.click();
  }
  const start = page.getByRole("button", { name: /开始制作/ });
  await expect(start).toBeEnabled({ timeout: 20_000 });
  await start.click();
}

export async function waitPackAtLeast(page: Page, label: "原木" | "木板", n: number) {
  await openNav(page, "character");
  await expect
    .poll(async () => {
      const t = await page.locator(".sheet-pack-line").innerText();
      const m = t.match(new RegExp(`${label}\\s+(\\d+)`));
      return m ? Number(m[1]) : 0;
    }, { timeout: 45_000 })
    .toBeGreaterThanOrEqual(n);
}

export async function fightNamed(
  page: Page,
  monster: string,
  opts: { boss?: boolean; pickBark?: boolean } = {}
) {
  await openNav(page, "adventure");
  await page.locator(".monster-card").filter({ hasText: monster }).first().click();
  await page.getByRole("button", { name: opts.boss ? /挑战BOSS/ : /开始战斗/ }).click();
  await expect(page.locator(".log-entry").filter({ hasText: `${monster} 被击败了！` })).toBeVisible({
    timeout: 45_000,
  });
  await expect(page.locator(".log-entry").filter({ hasText: "你被击败了" })).toHaveCount(0);
  if (opts.pickBark) {
    await expect(page.getByRole("heading", { name: "选择你的第一刀" })).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /厚树皮/ }).click({ force: true });
    await expect(page.getByRole("heading", { name: "选择你的第一刀" })).toHaveCount(0);
  }
  await stopActivity(page);
  await expect(page.locator(".monster-card").first()).toBeVisible({ timeout: 15_000 });
}
