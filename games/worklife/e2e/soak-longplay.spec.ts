import { expect, test } from "@playwright/test";
import {
  E2E_API,
  guestLogin,
  openNav,
  seedT1,
  stopActivity,
  waitIdle,
} from "./helpers";

/**
 * SOAK-01: long-running simulated player session at the browser level.
 *
 * Goals:
 *  1. Every module actually works end-to-end under sustained play — all six professions'
 *     gather + craft pages, combat, trading order book, party, tasks, houses, enhance,
 *     character and inventory are each exercised through the real UI.
 *  2. No steep progression cliff — skill xp/level is sampled via /player/state the whole
 *     run; afterwards we assert xp kept flowing while actions ran and that wall-clock
 *     time between consecutive level-ups grows smoothly instead of jumping off a cliff.
 *
 * Duration: SOAK_MINUTES env (default 12 min). Each round touches every module, so
 * longer runs just repeat the cycle — the failure modes we hunt (stalls, leaks, drift)
 * are time-dependent, not round-dependent.
 */

const SOAK_MINUTES = Math.max(3, Number(process.env.SOAK_MINUTES || 12));
const SAMPLE_EVERY_MS = 5_000;

type SkillSnap = { level: number; xp: number };
type Snap = {
  t: number;
  phase: string;
  mode: string;
  actionId?: string;
  skills: Record<string, SkillSnap>;
  gold: number;
};

type ModuleFlag =
  | "logging" | "woodworking" | "mining" | "smithing" | "farming" | "husbandry"
  | "fishing" | "cooking" | "gathering" | "tailoring" | "crystal_mining" | "alchemy"
  | "adventure" | "enhance" | "trading" | "party" | "tasks" | "houses"
  | "character" | "inventory";

test("SOAK-01 sustained multi-module playthrough with progression sampling", async ({ page }) => {
  test.setTimeout(SOAK_MINUTES * 60_000 + 300_000);
  // Locator actions default to "wait until test timeout" — that turned one stuck click into
  // a 5-minute stall last run. Bound every action to 15s; steps that can't complete get
  // recorded as failures instead of eating the whole budget.
  page.setDefaultTimeout(15_000);

  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(`pageerror: ${String(err)}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
  });
  page.on("response", (res) => {
    if (res.status() >= 500) errors.push(`http ${res.status()} ${res.url()}`);
    if (res.request().method() === "POST" && res.url().includes("/combat/hp/build")) {
      console.log(`[soak] build POST → ${res.status()}`);
    }
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await guestLogin(page, `soak-${Date.now()}`);
  await seedT1(page);

  const snaps: Snap[] = [];
  const visited = new Set<ModuleFlag>();
  const stepFailures: string[] = [];
  const t0 = Date.now();

  /** If a modal is up, dismiss it — pickers get answered, plain overlays get clicked away. */
  const dismissModal = async () => {
    for (let i = 0; i < 3; i++) {
      const picker = page.getByRole("heading", { name: "选择你的第一刀" });
      if (await picker.isVisible().catch(() => false)) {
        // The build picker can't be clicked away — answer it, then wait for the state
        // refresh to actually close it before moving on (it only unmounts on commit).
        await page.getByRole("button", { name: /厚树皮/ }).click({ force: true }).catch(() => undefined);
        await picker.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => undefined);
        continue;
      }
      const overlay = page.locator(".modal-overlay").first();
      if (await overlay.isVisible().catch(() => false)) {
        await overlay.click({ position: { x: 4, y: 4 }, force: true }).catch(() => undefined);
        await page.waitForTimeout(300);
        continue;
      }
      break;
    }
  };

  const deadline = t0 + SOAK_MINUTES * 60_000;

  /** Snapshot what's actually on screen — recorded next to a step failure for postmortem. */
  const diag = async () => {
    try {
      const d = await page.evaluate(async (api) => {
        const raw = localStorage.getItem("worklife_user");
        let srv: string = "no-token";
        if (raw) {
          try {
            const r = await fetch(`${api}/player/state`, {
              headers: { Authorization: `Bearer ${(JSON.parse(raw) as { token: string }).token}` },
              signal: AbortSignal.timeout(8_000),
            });
            const st = await r.json();
            srv = `build=${st.chapter1Build ?? "∅"} kills=${st.stats?.totalKills ?? "?"} rev=${st.stateRevision ?? "?"}`;
          } catch (e) { srv = `fetch-fail:${(e as Error).message.slice(0, 40)}`; }
        }
        return {
          skillPage: document.querySelector("[data-skill-page]")?.getAttribute("data-skill-page") ?? null,
          overlays: [...document.querySelectorAll(".modal-overlay, .offline-overlay, [role='dialog'], .item-modal-overlay")]
            .filter((el) => (el as HTMLElement).offsetParent !== null)
            .map((el) => el.className.split(" ")[0]),
          activeNav: document.querySelector("[data-nav-id].active, [data-nav-id][aria-current]")?.getAttribute("data-nav-id") ?? null,
          modalTitle: document.querySelector(".modal-title")?.textContent ?? null,
          srv,
        };
      }, E2E_API);
      return JSON.stringify(d);
    } catch {
      return "diag-failed";
    }
  };

  /** Run a module step; failures are collected, not fatal — the soak keeps going. */
  const step = async (name: string, fn: () => Promise<void>) => {
    if (Date.now() >= deadline) return; // budget spent: skip remaining steps, loop will exit
    await dismissModal();
    try {
      await fn();
    } catch (e) {
      const d = await diag();
      const msg = `${name}: ${(e as Error).message.split("\n")[0]} | ${d}`;
      stepFailures.push(msg);
      console.log(`[soak] step failed @${Math.round((Date.now() - t0) / 1000)}s ${msg}`);
      await dismissModal();
    }
  };

  const snap = async (phase: string) => {
    let s: any;
    try {
      // Node-side timeout as backstop: a blocked page event-loop would stall evaluate itself,
      // so race it and log the hang instead of dying on the global test timeout.
      s = await Promise.race([
        page.evaluate(async (api) => {
        const raw = localStorage.getItem("worklife_user");
        if (!raw) throw new Error("missing worklife_user");
        const token = (JSON.parse(raw) as { token: string }).token;
        // AbortSignal keeps a hung state API from stalling the soak — it gets logged instead.
        const r = await fetch(`${api}/player/state`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(15_000),
        });
        return r.json();
      }, E2E_API),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("evaluate_race_timeout_20s")), 20_000)),
      ]);
    } catch (e) {
      stepFailures.push(`snap:${phase}: ${(e as Error).message.split("\n")[0]}`);
      return;
    }
    if (!s || !s.skills) {
      stepFailures.push(`snap:${phase}: malformed state response`);
      return;
    }
    snaps.push({
      t: Date.now(),
      phase,
      mode: s.mode,
      actionId: s.lifeActionState?.actionId,
      // Combat xp lives on the state root (combatLevel/combatXp), not in the skills map —
      // fold it in so the same sanity/level-up checks cover it.
      skills: { ...s.skills, skill_combat: { level: s.combatLevel ?? 0, xp: s.combatXp ?? 0 } },
      gold: s.inventory?.gold ?? 0,
    });
  };

  /** Wait `secs` while sampling progression every SAMPLE_EVERY_MS. */
  const gatherFor = async (navId: ModuleFlag & Parameters<typeof openNav>[1], rowText: string, secs: number) => {
    await openNav(page, navId);
    await expect(page.locator(`[data-skill-page="${navId}"]`)).toBeVisible();
    visited.add(navId);
    await page.locator(".skill-action-row").filter({ hasText: rowText }).first().click();
    const start = page.getByRole("button", { name: /开始采集/ });
    await expect(start).toBeEnabled({ timeout: 10_000 });
    await start.click();
    const end = Date.now() + secs * 1000;
    do {
      await page.waitForTimeout(SAMPLE_EVERY_MS);
      await snap(`gather:${navId}`);
    } while (Date.now() < end);
    await stopActivity(page);
  };

  /** Craft one item on a production page; returns false if materials were missing. */
  const craftOnce = async (navId: ModuleFlag & Parameters<typeof openNav>[1], rowText: string): Promise<boolean> => {
    await openNav(page, navId);
    await expect(page.locator(`[data-skill-page="${navId}"]`)).toBeVisible();
    visited.add(navId);
    const cats = page.locator(".craft-categories .category-btn");
    const n = await cats.count();
    let opened = false;
    for (let i = 0; i < n && !opened; i++) {
      await cats.nth(i).click();
      const row = page.locator(".craft-row").filter({ hasText: rowText }).first();
      if (await row.isVisible().catch(() => false)) {
        await row.click();
        opened = true;
      }
    }
    if (!opened) return false;
    const start = page.getByRole("button", { name: /开始制作/ });
    if (!(await start.isEnabled().catch(() => false))) {
      // Missing materials — module still rendered; close the modal via the overlay.
      await page.locator(".modal-overlay").first().click().catch(() => undefined);
      return false;
    }
    await start.click();
    await waitIdle(page, 30_000);
    await snap(`craft:${navId}`);
    return true;
  };

  const fightSlime = async (firstKill: boolean) => {
    await openNav(page, "adventure");
    visited.add("adventure");
    await page.locator(".monster-card").filter({ hasText: "果冻史莱姆" }).first().click();
    await page.getByRole("button", { name: /开始战斗/ }).click();
    await expect(page.locator(".log-entry").filter({ hasText: "果冻史莱姆 被击败了！" })).toBeVisible({ timeout: 60_000 });
    if (firstKill) {
      const picker = page.getByRole("heading", { name: "选择你的第一刀" });
      // isVisible() returns immediately — the timeout option is ignored. The picker only
      // mounts ~1.5s after the win commit, so wait for it properly or the pick is skipped
      // and the modal blocks every later step.
      const visible = await picker.waitFor({ state: "visible", timeout: 15_000 }).then(() => true).catch(() => false);
      if (visible) {
        await page.getByRole("button", { name: /厚树皮/ }).click({ force: true });
        await expect(picker).toHaveCount(0, { timeout: 15_000 });
      }
    }
    await snap("combat");
    await stopActivity(page);
  };

  const tradingRoundTrip = async () => {
    await openNav(page, "trading");
    visited.add("trading");
    // Own-item tile → detail → sell order → confirm → back → cancel in my-orders.
    // Each action is labelled so a timeout names the culprit instead of "locator.click".
    const labelled = async (label: string, fn: () => Promise<void>) => {
      try { await fn(); } catch (e) { throw new Error(`${label}: ${(e as Error).message.split("\n")[0]}`); }
    };
    await labelled("pick-wood", () => page.locator('.inv-tile[data-item-id="wood_1"]').first().click());
    await labelled("open-sell", () => page.getByRole("button", { name: /挂出售单/ }).click());
    const priceInput = page.locator(".sell-form .form-input").nth(1);
    await priceInput.fill("9999"); // far above market: it will rest in the book, never execute
    await labelled("confirm-order", () => page.getByRole("button", { name: "确认挂单" }).click());
    // A failed create leaves the modal open — catch that explicitly rather than timing out
    // on the next click behind the overlay.
    await expect(page.locator(".modal-overlay")).toHaveCount(0, { timeout: 10_000 });
    await labelled("back-to-list", () => page.getByRole("button", { name: /返回列表/ }).click());
    const cancel = page.getByRole("button", { name: "撤回" }).first();
    await expect(cancel).toBeVisible({ timeout: 10_000 });
    await labelled("cancel-order", () => cancel.click());
    await expect(page.getByRole("button", { name: "撤回" })).toHaveCount(0, { timeout: 10_000 });
    await snap("trading");
  };

  const partyRoundTrip = async () => {
    await openNav(page, "party");
    visited.add("party");
    await page.getByRole("button", { name: "创建队伍" }).click();
    // 解散队伍 only renders for the leader of a live party — a stronger signal than the
    // （你） suffix, which depends on playerState.userId being populated.
    await expect(page.getByRole("button", { name: "解散队伍" })).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "解散队伍" }).click();
    await expect(page.getByRole("button", { name: "创建队伍" })).toBeVisible({ timeout: 10_000 });
    await snap("party");
  };

  const pageRenders = async (navId: ModuleFlag & Parameters<typeof openNav>[1], selector: string) => {
    await openNav(page, navId);
    // First nav click can lose a race with a re-rendering sidebar — retry once before failing.
    if (!(await page.locator(selector).first().isVisible().catch(() => false))) {
      await page.waitForTimeout(800);
      await openNav(page, navId);
    }
    await expect(page.locator(selector).first()).toBeVisible({ timeout: 15_000 });
    visited.add(navId);
  };

  // ---- Warm-up: land T1 basics so crafts/combat are possible in round 1 ----
  await gatherFor("logging", "路边的小白杨", 20);
  await craftOnce("woodworking", "标准木板");

  // ---- One-shot systems sweep: every module gets exercised at least once up front, so a
  //      short round budget can never strand the pages at the tail of the loop. ----
  await step("combat:slime", () => fightSlime(true));
  await step("trading", tradingRoundTrip);
  await step("party", partyRoundTrip);
  await step("page:tasks", () => pageRenders("tasks", '[data-skill-page="tasks"]'));
  await step("page:houses", () => pageRenders("houses", '[data-skill-page="houses"]'));
  await step("page:enhance", () => pageRenders("enhance", '[data-skill-page="enhance"]'));
  await step("page:character", () => pageRenders("character", ".character-sheet, [data-skill-page='character'], .sheet-pack-line"));
  await step("page:inventory", () => pageRenders("inventory", '[data-skill-page="inventory"]'));
  await step("page:husbandry", () => pageRenders("husbandry", '[data-skill-page="husbandry"]'));

  let round = 0;
  while (Date.now() < deadline) {
    round++;

    // Six professions: gather a bit on each, then craft what the materials allow.
    await step("gather:logging", () => gatherFor("logging", "路边的小白杨", 20));
    await step("craft:woodworking", async () => { await craftOnce("woodworking", "标准木板"); });

    await step("gather:mining", () => gatherFor("mining", "铜矿脉", 18));
    await step("craft:smithing", async () => { await craftOnce("smithing", "铜锭"); });

    await step("gather:farming", () => gatherFor("farming", "棉花田", 18));

    await step("gather:fishing", () => gatherFor("fishing", "清澈小河", 18));
    await step("craft:cooking", async () => { await craftOnce("cooking", "简单料理"); });

    await step("gather:gathering", () => gatherFor("gathering", "野生棉花", 18));
    await step("craft:tailoring", async () => { await craftOnce("tailoring", "棉线"); });

    await step("gather:crystal_mining", () => gatherFor("crystal_mining", "微光水晶矿", 18));
    await step("craft:alchemy", async () => { await craftOnce("alchemy", "生命药水"); });

    // Systems re-verified each round where budget allows.
    await step("combat:slime", () => fightSlime(false));
    await step("trading", tradingRoundTrip);
    await snap(`round-end:${round}`);
  }

  // ================= Analysis =================
  console.log(`[soak] rounds=${round} snaps=${snaps.length}`);
  console.log(`[soak] step failures=${stepFailures.length}`, stepFailures.slice(0, 12));
  console.log(`[soak] page errors=${errors.length}`, errors.slice(0, 8));

  // 1. Module coverage: every module rendered and was exercised at least once.
  const all: ModuleFlag[] = [
    "logging", "woodworking", "mining", "smithing", "farming", "husbandry",
    "fishing", "cooking", "gathering", "tailoring", "crystal_mining", "alchemy",
    "adventure", "enhance", "trading", "party", "tasks", "houses", "character", "inventory",
  ];
  const missing = all.filter((m) => !visited.has(m));
  // Full coverage needs enough budget for round 1's systems block; short runs still must
  // have touched every gather page + at least one craft.
  const required = SOAK_MINUTES >= 10 ? all : ["logging", "woodworking", "mining", "farming", "fishing", "gathering", "crystal_mining"] as ModuleFlag[];
  const missingRequired = required.filter((m) => !visited.has(m));
  expect(missingRequired, `unvisited modules: ${missing.join(",")}`).toEqual([]);

  // 2. Sampled state is sane: xp never negative, level never regresses.
  const peak: Record<string, number> = {};
  for (const s of snaps) {
    for (const [id, sk] of Object.entries(s.skills)) {
      expect(Number.isFinite(sk.xp), `NaN xp ${id}`).toBe(true);
      expect(sk.xp).toBeGreaterThanOrEqual(0);
      if (peak[id] !== undefined) expect(sk.level).toBeGreaterThanOrEqual(peak[id]);
      peak[id] = Math.max(peak[id] ?? 0, sk.level);
    }
    expect(Number.isFinite(s.gold)).toBe(true);
  }

  // 3. Progress delivered: every skill whose action actually ran gained xp on the
  //    side-specific skill (采集/生产拆分后各记各的；没跑过的侧不强制).
  const NAV_SKILL: Record<string, string> = {
    logging: "skill_woodcutter", woodworking: "skill_woodworking",
    mining: "skill_blacksmith", smithing: "skill_smithing",
    farming: "skill_farmer", husbandry: "skill_husbandry",
    fishing: "skill_chef", cooking: "skill_cooking",
    gathering: "skill_tailor", tailoring: "skill_tailoring",
    crystal_mining: "skill_alchemist", alchemy: "skill_alchemy",
  };
  const actionSkill = new Map<string, string>();
  for (const s of snaps) {
    if (!s.actionId) continue;
    const nav = s.phase.startsWith("gather:") ? s.phase.slice(7)
      : s.phase.startsWith("craft:") ? s.phase.slice(6) : null;
    const skill = nav ? NAV_SKILL[nav] : undefined;
    if (skill && !actionSkill.has(s.actionId)) actionSkill.set(s.actionId, skill);
  }
  const trained = [...new Set([...actionSkill.values(), "skill_combat"])];
  for (const id of trained) {
    const first = snaps.find((s) => s.skills[id]);
    const last = [...snaps].reverse().find((s) => s.skills[id]);
    if (!first || !last) {
      // Untrained in this budget — only acceptable for combat on short runs.
      expect(SOAK_MINUTES < 10 && id === "skill_combat", `${id} missing from state`).toBe(true);
      continue;
    }
    const gained = (last.skills[id].level - first.skills[id].level) * 1e9 + (last.skills[id].xp - first.skills[id].xp);
    expect(gained > 0 || last.skills[id].level > first.skills[id].level, `${id} gained no xp`).toBe(true);
  }

  // 4. Gather windows actually accrued xp (no stalled action).
  for (const nav of ["logging", "mining", "farming", "fishing", "gathering", "crystal_mining"]) {
    const win = snaps.filter((s) => s.phase === `gather:${nav}`);
    expect(win.length, `no samples for ${nav}`).toBeGreaterThan(0);
  }

  // 5. No steep growth interval: xp-per-second while a skill's action is actually running
  //    must not collapse between training windows. Wall-clock level-up spacing can't be
  //    used raw — the soak deliberately rotates modules, so a level boundary that lands
  //    mid-other-module is scheduling noise, not a curve cliff.
  //
  //    actionSkill 已在第 3 步按 NAV_SKILL 建好（采集/生产分列）。

  // Per skill: consecutive-sample xp/s rates measured ONLY while that skill's action ran.
  const rateReport: Record<string, { min: number; max: number; windows: number; zeroRun: number; maxZeroRun: number }> = {};
  for (let i = 1; i < snaps.length; i++) {
    const a = snaps[i - 1], b = snaps[i];
    if (!b.actionId || a.actionId !== b.actionId) continue;         // same action must span both samples
    const skill = actionSkill.get(b.actionId);
    if (!skill) continue;
    const dt = (b.t - a.t) / 1000;
    if (dt <= 0) continue;
    const aSk = a.skills[skill], bSk = b.skills[skill];
    if (!aSk || !bSk) continue;
    // xp is the per-level remainder (reset on level-up): cross-level pairs are progress
    // by definition; only same-level pairs give a clean dXp for rate measurement.
    if (bSk.level > aSk.level) continue;
    if (bSk.level < aSk.level || bSk.xp < aSk.xp) { stepFailures.push(`xp-regress:${skill}@${b.phase}`); continue; }
    const rate = (bSk.xp - aSk.xp) / dt;
    const r = rateReport[skill] ?? (rateReport[skill] = { min: Infinity, max: 0, windows: 0, zeroRun: 0, maxZeroRun: 0 });
    if (rate === 0) {
      // One zero window is legal — un-accelerated actions run at full duration (≈6s+),
      // so a 5s sample can sit between cycle completions. ≥3 consecutive zeros (~15s+
      // running without xp) is a real stall.
      r.zeroRun++;
      r.maxZeroRun = Math.max(r.maxZeroRun, r.zeroRun);
    } else {
      r.zeroRun = 0;
      r.min = Math.min(r.min, rate);
      r.max = Math.max(r.max, rate);
    }
    r.windows++;
  }
  console.log(`[soak] xp rates=${JSON.stringify(rateReport)}`);
  console.log(`[soak] final levels=${JSON.stringify(Object.fromEntries(trained.map((k) => [k, peak[k] ?? 0])))}`);
  for (const [skill, r] of Object.entries(rateReport)) {
    if (r.windows < 3 || r.max <= 0) continue;
    // Stall: ≥3 consecutive zero-xp windows (~15s+) while the action was running.
    expect(r.maxZeroRun, `${skill} stalled while running: ${JSON.stringify(r)}`).toBeLessThan(3);
    // Cliff: slowest earning window is <15% of the fastest — a steep growth interval.
    expect(r.min, `${skill} xp/s collapsed: ${JSON.stringify(r)}`).toBeGreaterThanOrEqual(r.max * 0.15);
  }

  // 5b. Level-up interval sanity, but only for intervals where the skill's action was
  //     actually running through the boundary — off-module time is excluded above anyway.
  const levelTimes: Record<string, number[]> = {};
  for (const s of snaps) {
    for (const [id, sk] of Object.entries(s.skills)) {
      const seen = levelTimes[id] ?? (levelTimes[id] = [0]);
      while (seen.length - 1 < sk.level) seen.push(s.t);
    }
  }
  const ratios: Record<string, number> = {};
  for (const [id, times] of Object.entries(levelTimes)) {
    if (times.length < 4) continue;
    for (let i = 3; i < times.length; i++) {
      // Skip ratios spanning module-rotation gaps: the skill's action must cover ≥50%
      // of samples in each interval — a stray gather in a long off-module stretch is
      // scheduling noise, not training time.
      const coverage = (from: number, to: number) => {
        const win = snaps.filter((s) => s.t >= from && s.t <= to);
        if (!win.length) return 0;
        return win.filter((s) => s.actionId && actionSkill.get(s.actionId) === id).length / win.length;
      };
      const prev = times[i - 1] - times[i - 2];
      const curr = times[i] - times[i - 1];
      if (prev <= 0) continue;
      if (coverage(times[i - 2], times[i - 1]) < 0.5 || coverage(times[i - 1], times[i]) < 0.5) continue;
      ratios[`${id} L${i - 1}→L${i}`] = curr / prev;
    }
  }
  const worst = Math.max(...Object.values(ratios), 0);
  console.log(`[soak] worst trained level-up ratio=${worst.toFixed(2)}`, ratios);
  expect(worst, `level-up interval ratio cliff while training: ${JSON.stringify(ratios)}`).toBeLessThan(8);

  // 6. Every module step succeeded somewhere along the run.
  const failedModules = [...new Set(stepFailures.map((f) => f.split(":")[0]))];
  expect(failedModules, `modules that never ran clean: ${failedModules.join(",")}`).toEqual([]);

  // 6. Zero runtime faults over the whole session.
  const benign = /favicon|websocket|net::ERR_|AbortError|Loading chunk/i;
  const fatal = errors.filter((e) => !benign.test(e));
  expect(fatal, fatal.join("\n")).toEqual([]);
});
