import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { randomUUID } from "node:crypto";
import packJson from "../../shared/enhanced_content_pack_chinese.json";
import type {
  EnhancedContentPack,
  EnhancedPlayerState,
  HarborBaitId,
  HarborCatchRecord,
  HarborSpeciesId,
} from "./types";
import { createMemoryStorage } from "./storage_memory";
import { progressionRoutes } from "./routes/progression";
import { progression2Routes } from "./routes/progression2";
import { mapThrownError } from "./http_errors";
import {
  HARBOR_AQUARIUM_TIERS,
  HARBOR_BAITS,
  HARBOR_BAIT_STOCK_CAP,
  HARBOR_DERBY_TIERS,
  HARBOR_GROUNDS,
  HARBOR_SPECIES,
  HARBOR_SPECIES_IDS,
  HARBOR_TANK_THEMES,
  HARBOR_WEEKLY_ENTRY_CAP,
  buildHarborCatchPool,
  buildHarborEntrySeedKey,
  computeHarborSettlement,
  computeHarborWeeklyScore,
  craftHarborBait,
  doPrestige,
  enterHarborDerby,
  ensureHarborAquarium,
  ensureHarborDerby,
  getHarborAquariumBonuses,
  getHarborDerbyInfo,
  getHarborGroundForWeek,
  getHarborRodTier,
  getHarborWeekIndex,
  harborTrophyPoints,
  harborWeekEndsAtMs,
  harborWeekIndexFromKey,
  harborWeekKey,
  performReincarnation,
  rollHarborCatch,
  scoreHarborCatch,
  setHarborFeaturedTank,
} from "./progression2";
import { playerBuildExtras } from "./hp_combat";
import {
  defaultEnhancedPlayerState,
  ensurePlayerExtensions,
  getActionRates,
  simulateToNow,
  startLifeActionNow,
} from "./storage";

const pack = packJson as EnhancedContentPack;
/** 一个与墙钟不同的历史业务周（2026-11-02 周一），确保「无参 ensure 不按墙钟翻周」的断言有意义。 */
const T0 = new Date("2026-11-03T09:00:00.000Z");
const NEXT_WEEK = new Date(T0.getTime() + 7 * 86_400_000);

function catchRec(speciesId: HarborSpeciesId, score: number, sizeCm = 50, baitId: HarborBaitId = "harbor_worm"): HarborCatchRecord {
  return { speciesId, sizeCm, score, baitId, featured: false, trophySize: false, at: T0.toISOString() };
}

/** 写入一周渔获，并让参赛次数 / 累计参赛 / 历史最佳周榜与之自洽（与 ensureHarborDerby 的净化规则一致）。 */
function setWeek(state: EnhancedPlayerState, catches: HarborCatchRecord[]) {
  const hd = state.harborDerby!;
  hd.weeklyCatches = catches;
  hd.entriesUsed = catches.length;
  hd.totalEntries = Math.max(hd.totalEntries, catches.length);
  hd.bestWeeklyScore = Math.max(hd.bestWeeklyScore, computeHarborWeeklyScore(catches));
}

/** 厨师 Lv.chef、累计钓鱼行动 fishing、首周基线让剩余竿次 = casts。 */
function anglerState(opts: { chef?: number; fishing?: number; casts?: number } = {}): EnhancedPlayerState {
  const state = defaultEnhancedPlayerState(pack.version);
  state.skills.skill_chef.level = opts.chef ?? 50;
  const fishing = opts.fishing ?? 60;
  state.stats!.actionsById = { act_fish_river_t1: fishing };
  const hd = ensureHarborDerby(state, T0);
  hd.fishingBaseline = fishing - (opts.casts ?? 10);
  return state;
}

async function harborRouteFixture(patch?: (state: EnhancedPlayerState) => void) {
  const storage = createMemoryStorage();
  const user = await storage.findOrCreateGuestUser(`wl11-harbor-${randomUUID()}`);
  const initial = await storage.getOrCreatePlayerState(user.id, pack.version);
  patch?.(initial);
  await storage.savePlayerState(user.id, initial);

  const handlers = new Map<string, any>();
  const app = {
    get(path: string, fn: any) {
      handlers.set(`GET ${path}`, fn);
    },
    post(path: string, fn: any) {
      handlers.set(`POST ${path}`, fn);
    },
    delete(path: string, fn: any) {
      handlers.set(`DELETE ${path}`, fn);
    },
  };
  await progressionRoutes(app as any, storage, pack);
  await progression2Routes(app as any, storage, pack);

  async function invoke(method: "GET" | "POST", path: string, body?: Record<string, unknown>, overrideUserId?: string | null) {
    let statusCode = 200;
    const reply = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      send(payload: any) {
        return { statusCode, payload };
      },
    };
    try {
      const handler = handlers.get(`${method} ${path}`);
      assert.ok(handler, `Missing route handler: ${method} ${path}`);
      const effectiveUser = overrideUserId === undefined ? user.id : overrideUserId;
      const res = await handler({ userId: effectiveUser, body: body ?? {} }, reply);
      if (res && typeof res === "object" && "statusCode" in res && "payload" in res) return res;
      return { statusCode, payload: res };
    } catch (error) {
      const mapped = mapThrownError(error);
      return reply.status(mapped.status).send(mapped.body);
    }
  }

  return { storage, userId: user.id, invoke };
}

describe("WL-11 Harbor Fishing Derby & Harbor Aquarium Codex backend mechanics & routes", () => {
  it("loads old saves with safe defaults (no gifts) and sanitizes dirty derby / aquarium data", () => {
    const legacy = defaultEnhancedPlayerState(pack.version);
    assert.equal(legacy.harborDerby, undefined);
    ensurePlayerExtensions(legacy);
    assert.equal(legacy.harborDerby, undefined, "ensurePlayerExtensions must not invent harborDerby for old saves");
    assert.equal(legacy.harborAquarium, undefined);

    const empty = getHarborAquariumBonuses(legacy);
    assert.equal(empty.collectedCount, 0);
    assert.equal(empty.fishingSpeedPct, 0);
    assert.equal(empty.cookingQualityPct, 0);
    assert.equal(empty.goldGainPct, 0);
    assert.equal(empty.featuredTank, null);

    const goldBefore = legacy.inventory.gold || 0;
    const info = getHarborDerbyInfo(legacy, pack, T0);
    assert.equal(legacy.harborDerby?.weekKey, "2026-11-02");
    assert.deepEqual(legacy.harborDerby?.baitStock, { harbor_worm: 0, glow_shrimp: 0, sunscale_lure: 0, abyss_lantern_lure: 0 });
    assert.deepEqual(legacy.harborDerby?.knownRecipes, []);
    assert.deepEqual(legacy.harborDerby?.trophies, { bronze: 0, silver: 0, gold: 0, legend: 0 });
    assert.deepEqual(legacy.harborAquarium, { species: {}, featuredTank: null });
    assert.equal(legacy.inventory.gold || 0, goldBefore, "opening the panel must not grant gold");
    assert.equal(info.castsAvailable, 0, "no fishing actions → no casts");
    assert.equal(info.ground.id, getHarborGroundForWeek(getHarborWeekIndex(T0)).id);
    assert.equal(info.baits.length, 4);
    assert.equal(info.baits.find((b) => b.id === "harbor_worm")?.known, true);
    assert.equal(info.baits.find((b) => b.id === "glow_shrimp")?.known, false);
    assert.equal(info.aquarium.tanks.length, 5);
    assert.equal(info.aquarium.collectedCount, 0);
    assert.equal(info.weekEndsAtMs, Date.parse("2026-11-08T16:00:00.000Z"), "week ends Monday 00:00 UTC+8");

    const valid = Array.from({ length: 35 }, (_, i) => catchRec("fish_river", 10 + i));
    (legacy as any).harborDerby = {
      weekKey: "not-a-week",
      fishingBaseline: -5,
      entriesUsed: 99,
      weeklyCatches: [
        { speciesId: "bogus", sizeCm: 10, score: 5, baitId: "harbor_worm" },
        { speciesId: "fish_river", sizeCm: -1, score: 5, baitId: "harbor_worm" },
        { speciesId: "fish_river", sizeCm: 30.04, score: 12.9, baitId: "harbor_worm", featured: "yes" },
        ...valid,
      ],
      baitStock: { harbor_worm: 500, glow_shrimp: -3, sunscale_lure: 2.9, bogus: 4 },
      knownRecipes: ["harbor_worm", "sunscale_lure", "sunscale_lure", "bogus"],
      trophies: { bronze: 2.7, silver: "x", legend: -1 },
      totalEntries: Number.NaN,
      bestWeeklyScore: -4,
      lastSettlement: { weekKey: "2026-11-03", groundId: "dawn_pier", tier: "gold" },
    };
    (legacy as any).harborAquarium = {
      species: {
        fish_river: { count: 2.5, bestSizeCm: "40.06" },
        shrimp: { count: 0, bestSizeCm: 12 },
        bogus: { count: 4, bestSizeCm: 10 },
        fish_sea: { count: 1, bestSizeCm: -3 },
      },
      featuredTank: "frost_grotto",
    };
    const hd = ensureHarborDerby(legacy, T0);
    assert.equal(hd.weekKey, "2026-11-02", "illegal week key is repaired without settlement");
    assert.equal(hd.weeklyCatches.length, HARBOR_WEEKLY_ENTRY_CAP);
    assert.equal(hd.weeklyCatches[0].score, 12);
    assert.equal(hd.weeklyCatches[0].sizeCm, 30);
    assert.equal(hd.weeklyCatches[0].featured, false);
    assert.equal(hd.entriesUsed, HARBOR_WEEKLY_ENTRY_CAP);
    assert.equal(hd.fishingBaseline, 0);
    assert.deepEqual(hd.baitStock, { harbor_worm: HARBOR_BAIT_STOCK_CAP, glow_shrimp: 0, sunscale_lure: 2, abyss_lantern_lure: 0 });
    assert.deepEqual(hd.knownRecipes, ["sunscale_lure"], "basic recipes are implicit; duplicates / bogus dropped");
    assert.deepEqual(hd.trophies, { bronze: 2, silver: 0, gold: 0, legend: 0 });
    assert.equal(hd.totalEntries, HARBOR_WEEKLY_ENTRY_CAP);
    assert.equal(hd.lastSettlement, null, "settlement keyed to a non-Monday is dropped");
    assert.ok(hd.bestWeeklyScore >= computeHarborWeeklyScore(hd.weeklyCatches));

    const aq = ensureHarborAquarium(legacy);
    assert.deepEqual(aq.species, {
      fish_river: { count: 2, bestSizeCm: 40.1 },
      fish_sea: { count: 1, bestSizeCm: 0 },
    });
    assert.equal(aq.featuredTank, null, "frost_grotto needs 5 species; 2 collected → reset");
  });

  it("only rolls the week on an explicitly passed now: no-arg ensure / ensurePlayerExtensions / prestige never reset by wall clock", () => {
    const state = anglerState({ casts: 10 });
    const hd = state.harborDerby!;
    setWeek(state, [catchRec("fish_abyss", 260), catchRec("fish_deepsea", 140), catchRec("fish_sea", 90)]);
    hd.baitStock.harbor_worm = 4;
    const snapshot = structuredClone(hd);

    // The real wall clock is weeks after T0 — none of these may settle or reset the T0 week.
    ensureHarborDerby(state);
    ensurePlayerExtensions(state);
    assert.deepEqual(state.harborDerby, snapshot);

    // Same business week (Sunday 23:59 UTC+8) → nothing changes.
    ensureHarborDerby(state, new Date("2026-11-08T15:59:00.000Z"));
    assert.deepEqual(state.harborDerby, snapshot);
    // A clock that runs backwards never rolls back.
    ensureHarborDerby(state, new Date("2026-10-20T09:00:00.000Z"));
    assert.deepEqual(state.harborDerby, snapshot);

    // Monday 00:00 UTC+8 → settle 490 points (bronze), reset weekly progress and re-anchor the cast baseline.
    const goldBefore = state.inventory.gold || 0;
    state.stats!.actionsById!.act_fish_river_t1 = 75;
    ensureHarborDerby(state, new Date("2026-11-08T16:00:00.000Z"));
    const rolled = state.harborDerby!;
    assert.equal(rolled.weekKey, "2026-11-09");
    assert.equal(rolled.entriesUsed, 0);
    assert.deepEqual(rolled.weeklyCatches, []);
    assert.equal(rolled.fishingBaseline, 75);
    assert.equal(rolled.lastSettlement?.weekKey, "2026-11-02");
    assert.equal(rolled.lastSettlement?.groundId, getHarborGroundForWeek(harborWeekIndexFromKey("2026-11-02")!).id);
    assert.equal(rolled.lastSettlement?.weeklyScore, 490);
    assert.equal(rolled.lastSettlement?.tier, "bronze");
    assert.equal(rolled.trophies.bronze, 1);
    assert.equal(rolled.baitStock.harbor_worm, 4 + 3);
    assert.equal(state.inventory.gold, goldBefore + 300);

    // Re-running with the same (or a later same-week) clock never settles twice.
    const afterOnce = structuredClone(state.harborDerby);
    ensureHarborDerby(state, new Date("2026-11-10T09:00:00.000Z"));
    assert.deepEqual(state.harborDerby, afterOnce);
    assert.equal(state.inventory.gold, goldBefore + 300);

    // An empty week rolls forward without a new settlement record.
    ensureHarborDerby(state, new Date("2026-11-17T09:00:00.000Z"));
    assert.equal(state.harborDerby!.weekKey, "2026-11-16");
    assert.equal(state.harborDerby!.lastSettlement?.weekKey, "2026-11-02");
    assert.equal(state.harborDerby!.trophies.bronze, 1);
  });

  it("settles every weekly tier into trophies, gold, bait and first-time rare bait recipes (including lower tiers)", () => {
    const expected: Array<[number, string, string[]]> = [
      [99, "none", []],
      [100, "bronze", []],
      [500, "silver", ["glow_shrimp"]],
      [1600, "gold", ["glow_shrimp", "sunscale_lure"]],
      [4200, "legend", ["glow_shrimp", "sunscale_lure", "abyss_lantern_lure"]],
    ];
    for (const [score, tierId, recipes] of expected) {
      const s = computeHarborSettlement([{ score }], []);
      assert.equal(s.tierId, tierId, `score ${score}`);
      assert.deepEqual(s.unlockedRecipes, recipes, `score ${score}`);
    }
    // Only the best 5 catches count.
    assert.equal(computeHarborWeeklyScore([10, 50, 40, 30, 20, 60, 5].map((score) => ({ score }))), 60 + 50 + 40 + 30 + 20);
    assert.deepEqual(computeHarborSettlement([{ score: 4200 }], ["glow_shrimp"]).unlockedRecipes, ["sunscale_lure", "abyss_lantern_lure"]);

    const state = anglerState();
    const hd = state.harborDerby!;
    setWeek(state, [catchRec("fish_dragon", 2100), catchRec("fish_star", 1300), catchRec("fish_lava", 900)]);
    hd.baitStock.abyss_lantern_lure = 98;
    const goldBefore = state.inventory.gold || 0;
    const earnedBefore = state.stats!.totalGoldEarned || 0;
    ensureHarborDerby(state, NEXT_WEEK);
    const settled = state.harborDerby!;
    const legend = HARBOR_DERBY_TIERS.find((t) => t.id === "legend")!;
    assert.equal(settled.lastSettlement?.tier, "legend");
    assert.equal(settled.lastSettlement?.weeklyScore, 4300);
    assert.equal(settled.trophies.legend, 1);
    assert.deepEqual(settled.knownRecipes, ["glow_shrimp", "sunscale_lure", "abyss_lantern_lure"]);
    assert.deepEqual(settled.lastSettlement?.unlockedRecipes, ["glow_shrimp", "sunscale_lure", "abyss_lantern_lure"]);
    assert.equal(settled.baitStock.sunscale_lure, 2);
    assert.equal(settled.baitStock.abyss_lantern_lure, HARBOR_BAIT_STOCK_CAP, "bait rewards respect the stock cap");
    assert.equal(state.inventory.gold, goldBefore + legend.goldReward);
    assert.equal(state.stats!.totalGoldEarned, earnedBefore + legend.goldReward);
    assert.equal(settled.bestWeeklyScore, 4300);
    assert.equal(harborTrophyPoints(settled.trophies), 8);
    assert.equal(getHarborRodTier(8).current.title, "银纹远投竿");
  });

  it("enters the derby consuming 1 weekly fishing action + 1 bait per cast, deterministic catches, rejecting casts/bait/cap shortfalls without mutation", () => {
    const state = anglerState({ casts: 3 });
    state.inventory.fish_river = 5;
    state.inventory.gold = 1000;
    const craft = craftHarborBait(state, pack, "harbor_worm", 2, T0);
    assert.equal(craft.ok, true);
    assert.equal(craft.crafted, 6);
    assert.equal(state.harborDerby!.baitStock.harbor_worm, 6);
    assert.equal(state.inventory.fish_river, 3);
    assert.equal(state.inventory.gold, 960);

    const before = structuredClone(state.harborDerby);
    const short = enterHarborDerby(state, "harbor_worm", 4, T0);
    assert.equal(short.ok, false);
    assert.match(short.reason || "", /竿次不足/);
    assert.deepEqual(state.harborDerby, before);
    assert.equal(state.harborAquarium, undefined, "rejected entries must not create the aquarium");

    assert.equal(enterHarborDerby(state, "glow_shrimp", 1, T0).ok, false, "no glow shrimp bait in stock");
    assert.equal(enterHarborDerby(state, "bogus" as HarborBaitId, 1, T0).ok, false);
    assert.equal(enterHarborDerby(state, "harbor_worm", 0, T0).ok, false);
    assert.equal(enterHarborDerby(state, "harbor_worm", 6, T0).ok, false);
    assert.deepEqual(state.harborDerby, before);

    const twin = structuredClone(state);
    const res = enterHarborDerby(state, "harbor_worm", 2, T0);
    const resTwin = enterHarborDerby(twin, "harbor_worm", 2, T0);
    assert.equal(res.ok, true);
    assert.deepEqual(res.catches, resTwin.catches, "same state + same clock → identical deterministic catches");
    assert.equal(res.catches!.length, 2);
    assert.equal(res.castsLeft, 1);
    assert.equal(state.harborDerby!.baitStock.harbor_worm, 4);
    assert.equal(state.harborDerby!.entriesUsed, 2);
    assert.equal(state.harborDerby!.totalEntries, 2);
    assert.equal(res.weeklyScore, computeHarborWeeklyScore(state.harborDerby!.weeklyCatches));

    const ground = getHarborGroundForWeek(getHarborWeekIndex(T0));
    const salt = String(state.stats?.firstPlayedAt || "");
    for (let i = 0; i < 2; i++) {
      const expected = rollHarborCatch(buildHarborEntrySeedKey("2026-11-02", i, i, salt), {
        groundId: ground.id,
        chefLevel: 50,
        baitId: "harbor_worm",
        rodTier: 0,
      });
      const rec = state.harborDerby!.weeklyCatches[i];
      assert.equal(rec.speciesId, expected.speciesId);
      assert.equal(rec.sizeCm, expected.sizeCm);
      assert.equal(rec.score, expected.score);
      assert.equal(rec.featured, expected.featured);
      assert.equal(state.harborAquarium!.species[rec.speciesId]!.count >= 1, true, "catch is displayed in the aquarium");
    }

    // Weekly cap: 29 used + 2 requested → rejected; the last cast still works, then the cap holds.
    const capped = anglerState({ casts: 40, fishing: 200 });
    capped.harborDerby!.entriesUsed = HARBOR_WEEKLY_ENTRY_CAP - 1;
    capped.harborDerby!.fishingBaseline = 0;
    capped.harborDerby!.baitStock.harbor_worm = 5;
    const capRes = enterHarborDerby(capped, "harbor_worm", 2, T0);
    assert.equal(capRes.ok, false);
    assert.match(capRes.reason || "", /上限/);
    assert.equal(enterHarborDerby(capped, "harbor_worm", 1, T0).ok, true);
    assert.equal(enterHarborDerby(capped, "harbor_worm", 1, T0).ok, false);
    assert.equal(capped.harborDerby!.baitStock.harbor_worm, 4);
  });

  it("crafts bait only from known recipes, real fishing products and gold, within the 99 stock cap", () => {
    const state = anglerState();
    state.inventory.gold = 50;
    const poor = craftHarborBait(state, pack, "harbor_worm", 1, T0);
    assert.equal(poor.ok, false);
    assert.match(poor.reason || "", /鱼获不足.*河鱼/);
    state.inventory.fish_river = 4;
    const broke = craftHarborBait(state, pack, "harbor_worm", 3, T0);
    assert.equal(broke.ok, false, "3 batches need 60 gold");
    assert.match(broke.reason || "", /金币不足/);
    assert.equal(state.inventory.fish_river, 4);
    assert.equal(state.inventory.gold, 50);

    const locked = craftHarborBait(state, pack, "sunscale_lure", 1, T0);
    assert.equal(locked.ok, false);
    assert.match(locked.reason || "", /黄金钓王/);

    state.harborDerby!.knownRecipes = ["sunscale_lure"];
    state.inventory.fish_lake = 4;
    state.inventory.fish_sea = 1;
    state.inventory.gold = 1000;
    const lure = craftHarborBait(state, pack, "sunscale_lure", 1, T0);
    assert.equal(lure.ok, true);
    assert.deepEqual(lure.spentItems, { fish_lake: 2, fish_sea: 1 });
    assert.equal(state.inventory.fish_sea, undefined, "fully consumed stacks are removed");
    assert.equal(state.inventory.fish_lake, 2);
    assert.equal(state.harborDerby!.baitStock.sunscale_lure, 2);
    assert.equal(craftHarborBait(state, pack, "sunscale_lure", 11, T0).ok, false, "max 10 batches per craft");

    state.harborDerby!.baitStock.harbor_worm = 97;
    const full = craftHarborBait(state, pack, "harbor_worm", 1, T0);
    assert.equal(full.ok, false);
    assert.match(full.reason || "", /上限/);
  });

  it("gates the species pool by chef level and exclusive lures, weights featured species and scores by rarity / size", () => {
    assert.deepEqual(buildHarborCatchPool("dawn_pier", 1, "harbor_worm"), [{ speciesId: "fish_river", weight: 800, featured: true }]);
    const lurePool = buildHarborCatchPool("dawn_pier", 24, "sunscale_lure");
    assert.deepEqual(
      lurePool.find((p) => p.speciesId === "sunscale_carp"),
      { speciesId: "sunscale_carp", weight: 10 * (4 + 2 * 4) * 2 * 3, featured: true }
    );
    assert.equal(buildHarborCatchPool("dawn_pier", 24, "harbor_worm").some((p) => p.speciesId === "sunscale_carp"), false);
    assert.equal(buildHarborCatchPool("starlit_abyss_port", 47, "abyss_lantern_lure").some((p) => p.speciesId === "abyss_lantern"), false);
    assert.equal(buildHarborCatchPool("starlit_abyss_port", 48, "abyss_lantern_lure").some((p) => p.speciesId === "abyss_lantern"), true);
    for (const g of HARBOR_GROUNDS) {
      for (const lv of [1, 30, 96]) {
        assert.ok(buildHarborCatchPool(g.id, lv, "harbor_worm").every((p) => HARBOR_SPECIES.find((s) => s.id === p.speciesId)!.minChefLevel <= lv));
      }
    }

    assert.deepEqual(scoreHarborCatch("fish_river", 30, false, 0), { score: 20, trophySize: false });
    assert.deepEqual(scoreHarborCatch("fish_river", 30, true, 0), { score: 30, trophySize: false });
    assert.deepEqual(scoreHarborCatch("fish_river", 42, false, 0), { score: 34, trophySize: true }, "trophy size +20%");
    assert.deepEqual(scoreHarborCatch("fish_river", 42, true, 10), { score: 55, trophySize: true });
    assert.equal(scoreHarborCatch("fish_dragon", 210, false, 0).score, 600);
    assert.equal(scoreHarborCatch("bogus" as HarborSpeciesId, 10, false, 0).score, 0);

    let carp = 0;
    let wormCarp = 0;
    for (let i = 0; i < 1500; i++) {
      const lure = rollHarborCatch(`wl11-pool-${i}`, { groundId: "dawn_pier", chefLevel: 50, baitId: "sunscale_lure", rodTier: 3 });
      if (lure.speciesId === "sunscale_carp") carp += 1;
      const sp = HARBOR_SPECIES.find((s) => s.id === lure.speciesId)!;
      assert.ok(lure.sizeCm >= sp.minSizeCm && lure.sizeCm <= Math.round(sp.maxSizeCm * 1.16 * 10) / 10 + 0.1);
      assert.ok(lure.score >= 1);
      if (rollHarborCatch(`wl11-pool-${i}`, { groundId: "dawn_pier", chefLevel: 50, baitId: "harbor_worm", rodTier: 0 }).speciesId === "sunscale_carp") wormCarp += 1;
    }
    assert.ok(carp > 50, `sunscale lure must attract the exclusive carp (got ${carp})`);
    assert.equal(wormCarp, 0);
  });

  it("collects species into themed tanks and feeds fishing speed, cooking quality and gold into the real production / combat formulas", () => {
    const base = defaultEnhancedPlayerState(pack.version);
    const coll = defaultEnhancedPlayerState(pack.version);
    const aq = ensureHarborAquarium(coll);
    const take = (n: number) => {
      aq.species = {};
      for (const id of HARBOR_SPECIES_IDS.slice(0, n)) aq.species[id] = { count: 1, bestSizeCm: 10 };
    };
    for (const tier of HARBOR_AQUARIUM_TIERS) {
      take(tier.minSpecies);
      const b = getHarborAquariumBonuses(coll);
      assert.equal(b.collectionTier, tier.tier);
      assert.equal(b.fishingSpeedPct, tier.fishingSpeedPct);
      assert.equal(b.cookingQualityPct, tier.cookingQualityPct);
      assert.equal(b.goldGainPct, tier.goldGainPct);
      assert.deepEqual(b.unlockedTanks, HARBOR_TANK_THEMES.filter((t) => t.unlockSpecies <= tier.minSpecies).map((t) => t.id));
    }

    // 5 species → tier 3; stream_shallows (river, shrimp, lake) is full → its +2% fishing resonance doubles.
    take(5);
    assert.equal(setHarborFeaturedTank(coll, "ember_starlight").ok, false, "needs 8 species");
    assert.equal(setHarborFeaturedTank(coll, "bogus" as any).ok, false);
    assert.equal(setHarborFeaturedTank(coll, null).ok, false, "nothing to unset");
    assert.equal(setHarborFeaturedTank(coll, "stream_shallows").ok, true);
    assert.equal(setHarborFeaturedTank(coll, "stream_shallows").ok, false, "already featured");
    const b = getHarborAquariumBonuses(coll);
    assert.equal(b.featuredTank, "stream_shallows");
    assert.equal(b.featuredTankFull, true);
    assert.equal(b.fishingSpeedPct, 10 + 2 * 2);
    assert.equal(b.cookingQualityPct, 8);
    assert.equal(b.goldGainPct, 4);
    // river, shrimp, sea, lake, deepsea → coral_harbor (sea + deepsea) is full too: +2% gold doubles to +4%.
    assert.equal(setHarborFeaturedTank(coll, "coral_harbor").ok, true);
    const coral = getHarborAquariumBonuses(coll);
    assert.equal(coral.featuredTankFull, true);
    assert.equal(coral.goldGainPct, 4 + 2 * 2);
    // frost_grotto is unlocked at 5 species but empty → +4% cooking quality, not doubled.
    assert.equal(setHarborFeaturedTank(coll, "frost_grotto").ok, true);
    const half = getHarborAquariumBonuses(coll);
    assert.equal(half.featuredTankFull, false, "frost_grotto has no abyss / frost fish yet");
    assert.equal(half.cookingQualityPct, 8 + 4);
    assert.equal(half.goldGainPct, 4);
    assert.equal(half.fishingSpeedPct, 10);

    const fishAct = (pack.actions as any[]).find((a) => a.id === "act_fish_river_t1");
    const chopAct = (pack.actions as any[]).find(
      (a) => !String(a.id).startsWith("act_fish_") && !String(a.id).startsWith("act_combat_") && (!a.consumes || a.consumes.length === 0)
    );
    const cookAct = (pack.actions as any[]).find((a) => a.id === "act_cook_food_t1");
    const smithAct = (pack.actions as any[]).find((a) => a.skillId !== "skill_cooking" && Array.isArray(a.consumes) && a.consumes.length > 0);

    const bf = getActionRates(base, pack, fishAct, T0);
    const cf = getActionRates(coll, pack, fishAct, T0);
    assert.ok(Math.abs(cf.speedMul / bf.speedMul - 1.1) < 1e-9, "fishing speed +10%");
    assert.ok(cf.speedSources.some((s) => s.label === "海港水族馆 · 钓鱼速度" && s.pct === 10));
    assert.ok(Math.abs(cf.goldMul / bf.goldMul - 1.04) < 1e-9, "gold income +4%");
    assert.equal(getActionRates(coll, pack, chopAct, T0).speedMul, getActionRates(base, pack, chopAct, T0).speedMul, "non-fishing gathering unaffected");

    const bc = getActionRates(base, pack, cookAct, T0);
    const cc = getActionRates(coll, pack, cookAct, T0);
    assert.equal(cc.efficiencyPct - bc.efficiencyPct, 12, "cooking quality → cooking efficiency +12%");
    assert.ok(cc.efficiencySources.some((s) => s.label === "海港水族馆 · 料理品质"));
    assert.equal(getActionRates(coll, pack, smithAct, T0).efficiencyPct, getActionRates(base, pack, smithAct, T0).efficiencyPct);

    const eb = playerBuildExtras(base);
    const ec = playerBuildExtras(coll);
    assert.ok(Math.abs(ec.goldMult / eb.goldMult - 1.04) < 1e-9, "combat gold income +4%");
    assert.equal(ec.atk, eb.atk);
    assert.equal(ec.hp, eb.hp);

    // Real simulator: 10 minutes of river fishing yields more fish with the aquarium bonus.
    const sBase = defaultEnhancedPlayerState(pack.version);
    const sAq = defaultEnhancedPlayerState(pack.version);
    sAq.harborAquarium = structuredClone(coll.harborAquarium);
    for (const s of [sBase, sAq]) {
      s.lastSimulatedAt = T0.toISOString();
      startLifeActionNow(s, pack, "act_fish_river_t1", undefined, T0);
    }
    const later = new Date(T0.getTime() + 10 * 60_000);
    const oBase = simulateToNow({ state: sBase, contentPack: pack, now: later, rng: () => 0.5 });
    const oAq = simulateToNow({ state: sAq, contentPack: pack, now: later, rng: () => 0.5 });
    assert.ok((oAq.state.inventory.fish_river || 0) > (oBase.state.inventory.fish_river || 0));
  });

  it("keeps the aquarium, trophies, recipes, bait stock and weekly entries through doPrestige and performReincarnation", () => {
    const state = anglerState({ casts: 8 });
    state.combatLevel = 60;
    state.skills.woodcutting = { level: 55, xp: 0 } as any;
    state.inventory.gold = 50_000;
    const hd = state.harborDerby!;
    setWeek(state, [catchRec("fish_abyss", 180)]);
    hd.knownRecipes = ["glow_shrimp", "sunscale_lure"];
    hd.trophies = { bronze: 3, silver: 2, gold: 1, legend: 0 };
    hd.baitStock = { harbor_worm: 7, glow_shrimp: 3, sunscale_lure: 1, abyss_lantern_lure: 0 };
    const aq = ensureHarborAquarium(state);
    aq.species = { fish_river: { count: 3, bestSizeCm: 40 }, shrimp: { count: 1, bestSizeCm: 12 }, fish_lake: { count: 2, bestSizeCm: 60 } };
    aq.featuredTank = "stream_shallows";
    const snapDerby = structuredClone(state.harborDerby);
    const snapAq = structuredClone(state.harborAquarium);

    assert.equal(doPrestige(state).ok, true);
    assert.deepEqual(state.harborDerby, snapDerby);
    assert.deepEqual(state.harborAquarium, snapAq);

    state.combatLevel = 60;
    state.skills.woodcutting = { level: 55, xp: 0 } as any;
    assert.equal(performReincarnation(state).ok, true);
    assert.deepEqual(state.harborDerby, snapDerby);
    assert.deepEqual(state.harborAquarium, snapAq);
    assert.equal(getHarborAquariumBonuses(state).featuredTankFull, true);
  });

  it("exposes GET/POST /progression2/harbor* with auth guard, strict zod schemas, server-side cost/cap checks and stateRevision 409", async () => {
    const fx = await harborRouteFixture((s) => {
      s.stats!.actionsById = { act_fish_river_t1: 12 };
      s.inventory.fish_river = 5;
      s.inventory.gold = 1000;
    });

    assert.equal((await fx.invoke("GET", "/progression2/harbor", undefined, null)).statusCode, 401);
    assert.equal((await fx.invoke("POST", "/progression2/harbor/enter", { baitId: "harbor_worm" }, null)).statusCode, 401);
    assert.equal((await fx.invoke("POST", "/progression2/harbor/bait", { baitId: "harbor_worm" }, null)).statusCode, 401);
    assert.equal((await fx.invoke("POST", "/progression2/harbor/tank", { themeId: null }, null)).statusCode, 401);

    const initial = await fx.invoke("GET", "/progression2/harbor");
    assert.equal(initial.statusCode, 200);
    assert.equal(initial.payload.weekKey, harborWeekKey(new Date()));
    assert.equal(initial.payload.castsAvailable, 12);
    assert.equal(initial.payload.baits.length, HARBOR_BAITS.length);
    assert.equal(initial.payload.aquarium.tanks.length, HARBOR_TANK_THEMES.length);
    assert.equal(initial.payload.weekEndsAtMs, harborWeekEndsAtMs(initial.payload.weekIndex));
    const rev0 = initial.payload.stateRevision;
    const persisted = await fx.storage.getOrCreatePlayerState(fx.userId, pack.version);
    assert.ok(persisted.harborDerby && persisted.harborAquarium, "first GET persists the new derby + aquarium state");

    const bad = await fx.invoke("POST", "/progression2/harbor/enter", { baitId: "golden_worm" });
    assert.ok(bad.statusCode >= 400 && bad.statusCode < 500, "unknown bait rejected by schema");
    const tooMany = await fx.invoke("POST", "/progression2/harbor/enter", { baitId: "harbor_worm", count: 6 });
    assert.ok(tooMany.statusCode >= 400 && tooMany.statusCode < 500);
    const extra = await fx.invoke("POST", "/progression2/harbor/bait", { baitId: "harbor_worm", batches: 1, free: true });
    assert.ok(extra.statusCode >= 400 && extra.statusCode < 500, "strict schema rejects extra fields");
    const badTank = await fx.invoke("POST", "/progression2/harbor/tank", { themeId: "lava_palace" });
    assert.ok(badTank.statusCode >= 400 && badTank.statusCode < 500);

    const noBait = await fx.invoke("POST", "/progression2/harbor/enter", { baitId: "harbor_worm" });
    assert.equal(noBait.statusCode, 400, "server rejects entering without bait");

    const latest = await fx.storage.getOrCreatePlayerState(fx.userId, pack.version);
    const craft = await fx.invoke("POST", "/progression2/harbor/bait", {
      baitId: "harbor_worm",
      batches: 2,
      expectedRevision: latest.stateRevision,
    });
    assert.equal(craft.statusCode, 200);
    assert.equal(craft.payload.bait.crafted, 6);
    assert.equal(craft.payload.harbor.baits.find((b: any) => b.id === "harbor_worm").stock, 6);
    assert.equal(craft.payload.inventory.fish_river, 3);
    const rev1 = craft.payload.stateRevision;
    assert.ok(rev1 > rev0);

    const stale = await fx.invoke("POST", "/progression2/harbor/enter", { baitId: "harbor_worm", count: 2, expectedRevision: rev0 });
    assert.equal(stale.statusCode, 409);

    const entered = await fx.invoke("POST", "/progression2/harbor/enter", { baitId: "harbor_worm", count: 2, expectedRevision: rev1 });
    assert.equal(entered.statusCode, 200);
    assert.equal(entered.payload.entry.catches.length, 2);
    assert.equal(entered.payload.harbor.castsAvailable, 10);
    assert.equal(entered.payload.harbor.entriesUsed, 2);
    assert.equal(entered.payload.harbor.baits.find((b: any) => b.id === "harbor_worm").stock, 4);
    assert.ok(entered.payload.harbor.aquarium.collectedCount >= 1);
    assert.equal(entered.payload.harbor.leaderboard.length, 2);

    const tank = await fx.invoke("POST", "/progression2/harbor/tank", { themeId: "stream_shallows" });
    assert.equal(tank.statusCode, 200);
    assert.equal(tank.payload.harbor.aquarium.featuredTank, "stream_shallows");
    const lockedTank = await fx.invoke("POST", "/progression2/harbor/tank", { themeId: "sunscale_palace" });
    assert.equal(lockedTank.statusCode, 400);

    const saved = await fx.storage.getOrCreatePlayerState(fx.userId, pack.version);
    assert.equal(saved.harborDerby?.entriesUsed, 2);
    assert.equal(saved.harborDerby?.baitStock.harbor_worm, 4);
    assert.equal(saved.harborAquarium?.featuredTank, "stream_shallows");
  });
});
