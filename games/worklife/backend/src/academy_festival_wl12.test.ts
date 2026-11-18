import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { randomUUID } from "node:crypto";
import packJson from "../../shared/enhanced_content_pack_chinese.json";
import type { EnhancedContentPack, EnhancedPlayerState } from "./types";
import { createMemoryStorage } from "./storage_memory";
import { progressionRoutes } from "./routes/progression";
import { progression2Routes } from "./routes/progression2";
import { mapThrownError } from "./http_errors";
import {
  ACADEMY_BADGES,
  ACADEMY_COURSES,
  ACADEMY_CREDIT_CAP,
  ACADEMY_DEPARTMENTS,
  FESTIVAL_COMMISSIONS,
  FESTIVAL_FULL_CYCLE_STATS,
  FESTIVAL_SEASONS,
  FESTIVAL_SHOP_ITEMS,
  FESTIVAL_TOKEN_CAP,
  FESTIVAL_TOKEN_GOLD_RATE,
  buyFestivalShopItem,
  claimFestivalCommission,
  doPrestige,
  enrollAcademyCourse,
  ensureAdventurerAcademy,
  ensureFestivalCalendar,
  festivalSeasonEndsAtMs,
  festivalSeasonIdFromIndex,
  festivalSeasonIndexFromKey,
  festivalSeasonKey,
  festivalSeasonKeyFromIndex,
  festivalSeasonStartMs,
  getAcademyBadgeTier,
  getAcademyDepartmentTier,
  getAcademyFestivalBonuses,
  getAcademyFestivalInfo,
  getFestivalCommissionsForSeason,
  getFestivalSeasonIndex,
  performReincarnation,
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
/** 历史时刻：2026 夏渔节（东八区 7 月），与墙钟所在季节不同，确保「无参 ensure 不按墙钟结业 / 翻季」的断言有意义。 */
const T0 = new Date("2026-07-10T09:00:00.000Z");
const AUTUMN = new Date("2026-09-10T09:00:00.000Z");
const WINTER = new Date("2026-12-10T09:00:00.000Z");

function academyState(credits?: Partial<Record<"gathering" | "crafting" | "tactics" | "commerce", number>>): EnhancedPlayerState {
  const state = defaultEnhancedPlayerState(pack.version);
  const ac = ensureAdventurerAcademy(state, T0);
  if (credits) ac.credits = { ...ac.credits, ...credits };
  return state;
}

function festivalState(now: Date = T0): EnhancedPlayerState {
  const state = defaultEnhancedPlayerState(pack.version);
  state.stats!.actionsById = { act_fish_river_t1: 40, act_plant_grain_t1: 12, act_raise_sheep_t1: 7 };
  state.stats!.totalKills = 30;
  ensureFestivalCalendar(state, now);
  return state;
}

async function academyRouteFixture(patch?: (state: EnhancedPlayerState) => void) {
  const storage = createMemoryStorage();
  const user = await storage.findOrCreateGuestUser(`wl12-academy-${randomUUID()}`);
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

describe("WL-12 Adventurer Academy & Four-Season Festival Calendar backend mechanics & routes", () => {
  it("loads old saves with safe defaults (no gifts, no retroactive progress) and sanitizes dirty academy / festival data", () => {
    const legacy = defaultEnhancedPlayerState(pack.version);
    legacy.stats!.actionsById = { act_fish_river_t1: 25, act_plant_grain_t1: 9 };
    legacy.stats!.totalKills = 44;
    assert.equal(legacy.adventurerAcademy, undefined);
    ensurePlayerExtensions(legacy);
    assert.equal(legacy.adventurerAcademy, undefined, "ensurePlayerExtensions must not invent the academy for old saves");
    assert.equal(legacy.festivalCalendar, undefined);

    const empty = getAcademyFestivalBonuses(legacy);
    assert.equal(empty.totalCredits, 0);
    assert.equal(empty.badgeTier, 0);
    for (const k of ["gatherSpeedPct", "craftSpeedPct", "xpGainPct", "goldGainPct", "bonusAtk", "bonusDef", "bonusHp"] as const) {
      assert.equal(empty[k], 0, k);
    }

    const goldBefore = legacy.inventory.gold || 0;
    const info = getAcademyFestivalInfo(legacy, pack, T0);
    assert.deepEqual(legacy.adventurerAcademy?.credits, { gathering: 0, crafting: 0, tactics: 0, commerce: 0 });
    assert.equal(legacy.adventurerAcademy?.activeCourse, null);
    assert.equal(legacy.festivalCalendar?.seasonKey, "2026-summer");
    assert.equal(legacy.festivalCalendar?.tokens, 0);
    assert.deepEqual(legacy.festivalCalendar?.keepsakes, []);
    assert.equal(legacy.festivalCalendar?.baselines.summer_net_casting, 25, "season baseline = current fishing counter (no retro credit)");
    assert.equal(legacy.inventory.gold || 0, goldBefore, "opening the panel must not grant gold");
    assert.equal(info.academy.courses.length, ACADEMY_COURSES.length);
    assert.equal(info.academy.departments.length, 4);
    assert.equal(info.academy.badge.current.tier, 0);
    assert.equal(info.festival.season.id, "summer");
    assert.equal(info.festival.commissions.length, 4);
    assert.ok(info.festival.commissions.every((c) => c.claims === 0));
    assert.equal(info.festival.commissions.find((c) => c.id === "summer_net_casting")?.seasonCount, 0);
    assert.equal(info.festival.shop.length, 4, "gold pouch + 3 summer exclusives");
    assert.equal(info.festival.startsAtMs, Date.parse("2026-05-31T16:00:00.000Z"), "summer opens on 1 June 00:00 UTC+8");
    assert.equal(info.festival.endsAtMs, Date.parse("2026-08-31T16:00:00.000Z"), "summer ends on 1 September 00:00 UTC+8");

    (legacy as any).adventurerAcademy = {
      credits: { gathering: 12.7, crafting: -3, tactics: "x", commerce: 1e9, bogus: 5 },
      completedCourses: { field_survey: 2.9, bogus: 4, master_artisan: -1 },
      activeCourse: { courseId: "field_survey", startedAt: T0.toISOString(), endsAt: "2099-01-01T00:00:00.000Z" },
      totalEnrollments: -5,
      totalGraduations: "7",
      lastGraduation: { courseId: "bogus" },
    };
    const ac = ensureAdventurerAcademy(legacy);
    assert.deepEqual(ac.credits, { gathering: 12, crafting: 0, tactics: 0, commerce: ACADEMY_CREDIT_CAP });
    assert.deepEqual(ac.completedCourses, { field_survey: 2 });
    assert.equal(ac.activeCourse?.endsAt, new Date(T0.getTime() + 30 * 60_000).toISOString(), "tampered endsAt is recomputed");
    assert.equal(ac.totalGraduations, 2);
    assert.equal(ac.totalEnrollments, 3);
    assert.equal(ac.lastGraduation, null);
    (legacy as any).adventurerAcademy.activeCourse = { courseId: "bogus", startedAt: T0.toISOString() };
    assert.equal(ensureAdventurerAcademy(legacy).activeCourse, null);

    (legacy as any).festivalCalendar = {
      seasonKey: "2026-monsoon",
      tokens: 5000,
      claims: { summer_fish_feast: 9, spring_rice_offering: 2, bogus: 1, summer_net_casting: 1.5 },
      baselines: { summer_net_casting: 1e9, spring_planting_drive: 3 },
      purchases: { festival_gold_pouch: 99, spring_keepsake: 1, summer_keepsake: "1" },
      keepsakes: ["winter", "bogus", "spring", "winter"],
      totalTokensEarned: -1,
      totalClaims: 0,
      lastRollover: { seasonKey: "garbage" },
    };
    const fc = ensureFestivalCalendar(legacy, T0);
    assert.equal(fc.seasonKey, "2026-summer", "illegal season key is repaired without a rollover");
    assert.equal(fc.tokens, FESTIVAL_TOKEN_CAP);
    assert.deepEqual(fc.claims, { summer_fish_feast: 3, summer_net_casting: 1 });
    assert.deepEqual(fc.baselines, { summer_net_casting: 25 }, "baseline never above the live counter; off-season keys dropped");
    assert.deepEqual(fc.purchases, { festival_gold_pouch: 6 });
    assert.deepEqual(fc.keepsakes, ["spring", "winter"]);
    assert.equal(fc.totalTokensEarned, 0);
    assert.equal(fc.totalClaims, 4);
    assert.equal(fc.lastRollover, null);
  });

  it("maps UTC+8 dates to spring / summer / autumn / winter festivals, keys and boundaries", () => {
    const cases: Array<[string, string]> = [
      ["2026-02-28T15:59:59.999Z", "2025-winter"],
      ["2026-02-28T16:00:00.000Z", "2026-spring"],
      ["2026-05-31T15:59:59.999Z", "2026-spring"],
      ["2026-05-31T16:00:00.000Z", "2026-summer"],
      ["2026-08-31T16:00:00.000Z", "2026-autumn"],
      ["2026-11-18T02:00:00.000Z", "2026-autumn"],
      ["2026-11-30T16:00:00.000Z", "2026-winter"],
      ["2027-01-15T00:00:00.000Z", "2026-winter"],
      ["2028-02-29T15:59:59.999Z", "2027-winter"],
      ["2028-02-29T16:00:00.000Z", "2028-spring"],
    ];
    for (const [iso, key] of cases) assert.equal(festivalSeasonKey(new Date(iso)), key, iso);
    for (let idx = 8096; idx < 8120; idx++) {
      assert.equal(festivalSeasonIndexFromKey(festivalSeasonKeyFromIndex(idx)), idx);
      assert.equal(getFestivalSeasonIndex(festivalSeasonStartMs(idx)), idx);
      assert.equal(getFestivalSeasonIndex(festivalSeasonEndsAtMs(idx) - 1), idx);
      assert.equal(festivalSeasonEndsAtMs(idx), festivalSeasonStartMs(idx + 1));
    }
    assert.equal(festivalSeasonIdFromIndex(getFestivalSeasonIndex(T0)), "summer");
    for (const key of ["2026-monsoon", "", null, 7, "26-spring", "2026-Spring"]) assert.equal(festivalSeasonIndexFromKey(key), null);
    for (const s of FESTIVAL_SEASONS) {
      assert.equal(getFestivalCommissionsForSeason(s.id).length, 4, `${s.id} offers 4 limited commissions`);
    }
  });

  it("graduates only on an explicitly passed now: no-arg ensure / ensurePlayerExtensions / prestige never graduate by wall clock", () => {
    const state = academyState();
    state.inventory.gold = 1000;
    state.inventory.lumber_1 = 6;
    state.inventory.food_simple = 3;
    const res = enrollAcademyCourse(state, pack, "field_survey", T0);
    assert.equal(res.ok, true, res.reason);
    assert.equal(res.endsAt, new Date(T0.getTime() + 30 * 60_000).toISOString());
    assert.equal(state.inventory.gold, 800);
    assert.equal(state.inventory.lumber_1, 2);
    assert.equal(state.inventory.food_simple, 1);
    const snapshot = structuredClone(state.adventurerAcademy);

    // The wall clock is months after T0 — none of these may graduate the course.
    ensureAdventurerAcademy(state);
    ensurePlayerExtensions(state);
    assert.deepEqual(state.adventurerAcademy, snapshot);
    // 1 ms before the end: still studying; a clock running backwards never graduates either.
    ensureAdventurerAcademy(state, new Date(T0.getTime() + 30 * 60_000 - 1));
    ensureAdventurerAcademy(state, new Date("2026-01-01T00:00:00.000Z"));
    assert.deepEqual(state.adventurerAcademy, snapshot);

    const ac = ensureAdventurerAcademy(state, new Date(T0.getTime() + 30 * 60_000));
    assert.equal(ac.activeCourse, null);
    assert.equal(ac.credits.gathering, 4);
    assert.deepEqual(ac.completedCourses, { field_survey: 1 });
    assert.equal(ac.totalGraduations, 1);
    assert.equal(ac.lastGraduation?.at, snapshot!.activeCourse!.endsAt, "graduation time is the course end, not the viewing time");
    const once = structuredClone(ac);
    ensureAdventurerAcademy(state, new Date(T0.getTime() + 90 * 60_000));
    assert.deepEqual(state.adventurerAcademy, once, "a course never graduates twice");
  });

  it("enrolls with gold + real life-skill products, one slot at a time, badge-gated advanced courses, rejecting without mutation", () => {
    const state = academyState();
    state.inventory.gold = 150;
    state.inventory.lumber_1 = 4;
    state.inventory.food_simple = 1;
    const before = structuredClone(state);
    assert.equal(enrollAcademyCourse(state, pack, "bogus" as any, T0).ok, false);
    const short = enrollAcademyCourse(state, pack, "field_survey", T0);
    assert.equal(short.ok, false);
    assert.match(short.reason || "", /简单料理/);
    state.inventory.food_simple = 2;
    before.inventory.food_simple = 2;
    const broke = enrollAcademyCourse(state, pack, "field_survey", T0);
    assert.match(broke.reason || "", /金币不足/);
    const gated = enrollAcademyCourse(state, pack, "spirit_botany", T0);
    assert.match(gated.reason || "", /铜叶学徒徽章/);
    assert.deepEqual(state.inventory, before.inventory);
    assert.deepEqual(state.adventurerAcademy, before.adventurerAcademy);

    state.inventory.gold = 5000;
    assert.equal(enrollAcademyCourse(state, pack, "field_survey", T0).ok, true);
    state.inventory.ingot_1 = 4;
    state.inventory.lumber_1 = 2;
    const busy = enrollAcademyCourse(state, pack, "forge_practicum", new Date(T0.getTime() + 10 * 60_000));
    assert.equal(busy.ok, false);
    assert.match(busy.reason || "", /正在进修「野外博物考察」（还剩 20 分钟）/);
    // Enrolling after the end graduates the old course inside the same command, then takes the slot.
    const next = enrollAcademyCourse(state, pack, "forge_practicum", new Date(T0.getTime() + 31 * 60_000));
    assert.equal(next.ok, true, next.reason);
    assert.equal(state.adventurerAcademy!.credits.gathering, 4);
    assert.equal(state.adventurerAcademy!.activeCourse?.courseId, "forge_practicum");
    assert.equal(state.adventurerAcademy!.totalEnrollments, 2);

    // Every course is paid with real pack products made by a life skill (never combat drops).
    const lifeProducts = new Set(
      (pack.actions as any[])
        .filter((a) => !String(a.id).startsWith("act_combat_"))
        .flatMap((a) => (a.yields || []).map((y: any) => y.itemId))
    );
    for (const c of ACADEMY_COURSES) {
      for (const itemId of Object.keys(c.itemCost)) assert.ok(lifeProducts.has(itemId), `${c.id} uses ${itemId}`);
    }
    for (const c of FESTIVAL_COMMISSIONS) {
      for (const itemId of Object.keys(c.items)) assert.ok(lifeProducts.has(itemId), `${c.id} uses ${itemId}`);
    }
  });

  it("unlocks department passives and academy badges by credits and feeds them into the real production / combat formulas", () => {
    for (const dept of ACADEMY_DEPARTMENTS) {
      for (const tier of dept.tiers) {
        assert.equal(getAcademyDepartmentTier(dept.id, tier.minCredits).current.tier, tier.tier);
        if (tier.minCredits > 0) assert.equal(getAcademyDepartmentTier(dept.id, tier.minCredits - 1).current.tier, tier.tier - 1);
      }
    }
    for (const b of ACADEMY_BADGES) assert.equal(getAcademyBadgeTier(b.minCredits).current.tier, b.tier);

    const base = defaultEnhancedPlayerState(pack.version);
    const scholar = academyState({ gathering: 20, crafting: 40, tactics: 8, commerce: 70 });
    const b = getAcademyFestivalBonuses(scholar);
    assert.equal(b.totalCredits, 138);
    assert.equal(b.badgeTier, 3, "138 credits → 金冠学士徽章");
    assert.deepEqual(b.departmentTiers, { gathering: 2, crafting: 3, tactics: 1, commerce: 4 });
    assert.equal(b.gatherSpeedPct, 6);
    assert.equal(b.craftSpeedPct, 10);
    assert.equal(b.xpGainPct, 6);
    assert.equal(b.goldGainPct, 10 + 2);
    assert.equal(b.bonusAtk, 4);
    assert.equal(b.bonusDef, 2);
    assert.equal(b.bonusHp, 12);

    const find = (id: string) => (pack.actions as any[]).find((a) => a.id === id);
    const chop = find("act_chop_wood_t1");
    const plank = find("act_craft_lumber_t1");
    const fight = (pack.actions as any[]).find((a) => String(a.id).startsWith("act_combat_"));
    const g0 = getActionRates(base, pack, chop, T0);
    const g1 = getActionRates(scholar, pack, chop, T0);
    assert.ok(Math.abs(g1.speedMul / g0.speedMul - 1.06) < 1e-9, "gathering speed +6%");
    assert.ok(g1.speedSources.some((s) => s.label === "冒险者学院与四季纪念章" && s.pct === 6));
    assert.ok(Math.abs(g1.xpMul / g0.xpMul - 1.06) < 1e-9, "badge xp +6%");
    assert.ok(Math.abs(g1.goldMul / g0.goldMul - 1.12) < 1e-9, "gold income +12%");
    const c0 = getActionRates(base, pack, plank, T0);
    const c1 = getActionRates(scholar, pack, plank, T0);
    assert.ok(Math.abs(c1.speedMul / c0.speedMul - 1.1) < 1e-9, "crafting speed +10%");
    assert.equal(getActionRates(scholar, pack, fight, T0).speedMul, getActionRates(base, pack, fight, T0).speedMul, "combat actions keep their speed");

    // Winter keepsake stacks atk / hp; the full four-season cycle adds +3% xp.
    ensureFestivalCalendar(scholar, T0).keepsakes = ["winter"];
    const e0 = playerBuildExtras(base);
    const e1 = playerBuildExtras(scholar);
    assert.equal(e1.atk - e0.atk, 4 + 5);
    assert.equal(e1.hp - e0.hp, 12 + 20);
    assert.equal(e1.def - e0.def, 2);
    assert.ok(Math.abs(e1.goldMult / e0.goldMult - 1.12) < 1e-9, "combat gold +12%");
    scholar.festivalCalendar!.keepsakes = ["spring", "summer", "autumn", "winter"];
    const full = getAcademyFestivalBonuses(scholar);
    assert.equal(full.fullCycle, true);
    assert.equal(full.xpGainPct, 6 + (FESTIVAL_FULL_CYCLE_STATS.xpGainPct || 0));
    assert.equal(full.gatherSpeedPct, 6 + 2);
    assert.equal(full.craftSpeedPct, 10 + 2);
    assert.equal(full.goldGainPct, 12 + 2);

    // Real simulator: 10 minutes of woodcutting yields more logs with the gathering passive.
    const sBase = defaultEnhancedPlayerState(pack.version);
    const sAc = academyState({ gathering: 70 });
    for (const s of [sBase, sAc]) {
      s.lastSimulatedAt = T0.toISOString();
      startLifeActionNow(s, pack, "act_chop_wood_t1", undefined, T0);
    }
    const later = new Date(T0.getTime() + 10 * 60_000);
    const oBase = simulateToNow({ state: sBase, contentPack: pack, now: later, rng: () => 0.5 });
    const oAc = simulateToNow({ state: sAc, contentPack: pack, now: later, rng: () => 0.5 });
    assert.ok((oAc.state.inventory.wood_1 || 0) > (oBase.state.inventory.wood_1 || 0));
  });

  it("rolls the festival season only on an explicitly passed now, converting leftover tokens once and re-anchoring baselines", () => {
    const state = festivalState();
    const fc = state.festivalCalendar!;
    fc.tokens = 13;
    fc.claims = { summer_fish_feast: 1 };
    fc.totalClaims = 1;
    fc.purchases = { festival_gold_pouch: 1 };
    fc.keepsakes = ["spring"];
    const snapshot = structuredClone(fc);

    ensureFestivalCalendar(state);
    ensurePlayerExtensions(state);
    assert.deepEqual(state.festivalCalendar, snapshot, "no-arg ensure never rolls by wall clock");
    ensureFestivalCalendar(state, new Date("2026-08-31T15:59:59.999Z"));
    ensureFestivalCalendar(state, new Date("2026-03-10T00:00:00.000Z"));
    assert.deepEqual(state.festivalCalendar, snapshot, "same season / clock running backwards change nothing");

    const goldBefore = state.inventory.gold || 0;
    state.stats!.actionsById = { ...state.stats!.actionsById, act_raise_sheep_t1: 19 };
    ensureFestivalCalendar(state, new Date("2026-08-31T16:00:00.000Z"));
    const rolled = state.festivalCalendar!;
    assert.equal(rolled.seasonKey, "2026-autumn");
    assert.equal(rolled.tokens, 0);
    assert.deepEqual(rolled.claims, {});
    assert.deepEqual(rolled.purchases, {});
    assert.deepEqual(rolled.baselines, { autumn_livestock_fair: 19 });
    assert.deepEqual(rolled.keepsakes, ["spring"], "keepsakes are permanent");
    assert.deepEqual(rolled.lastRollover, {
      seasonKey: "2026-summer",
      claims: 1,
      tokensConverted: 13,
      goldConverted: 13 * FESTIVAL_TOKEN_GOLD_RATE,
    });
    assert.equal(state.inventory.gold, goldBefore + 13 * FESTIVAL_TOKEN_GOLD_RATE);

    const once = structuredClone(rolled);
    ensureFestivalCalendar(state, AUTUMN);
    assert.deepEqual(state.festivalCalendar, once, "re-running inside the same season never converts twice");
    assert.equal(state.inventory.gold, goldBefore + 13 * FESTIVAL_TOKEN_GOLD_RATE);

    ensureFestivalCalendar(state, WINTER);
    assert.equal(state.festivalCalendar!.seasonKey, "2026-winter");
    assert.equal(state.festivalCalendar!.lastRollover?.seasonKey, "2026-summer", "an idle season leaves the last rollover record");
    ensureFestivalCalendar(state, new Date("2027-02-15T00:00:00.000Z"));
    assert.equal(state.festivalCalendar!.seasonKey, "2026-winter", "January / February still belong to the winter festival");
    ensureFestivalCalendar(state, new Date("2027-02-28T16:00:00.000Z"));
    assert.equal(state.festivalCalendar!.seasonKey, "2027-spring");
  });

  it("claims limited commissions by delivering real products or this season's real actions / kills, up to 3 times each", () => {
    const state = festivalState();
    state.inventory.food_simple = 4;
    const before = structuredClone(state.festivalCalendar);
    const short = claimFestivalCommission(state, pack, "summer_fish_feast", T0);
    assert.equal(short.ok, false);
    assert.match(short.reason || "", /简单料理/);
    assert.match(claimFestivalCommission(state, pack, "spring_rice_offering", T0).reason || "", /春耕节限定委托/);
    assert.equal(claimFestivalCommission(state, pack, "bogus" as any, T0).ok, false);
    assert.match(claimFestivalCommission(state, pack, "summer_net_casting", T0).reason || "", /进度不足/);
    assert.deepEqual(state.festivalCalendar, before);
    assert.equal(state.inventory.food_simple, 4);

    state.inventory.food_simple = 15;
    const goldBefore = state.inventory.gold || 0;
    for (let i = 1; i <= 3; i++) {
      const r = claimFestivalCommission(state, pack, "summer_fish_feast", T0);
      assert.equal(r.ok, true, r.reason);
      assert.equal(r.claims, i);
    }
    assert.equal(state.inventory.food_simple, undefined, "15 simple meals delivered");
    assert.equal(state.festivalCalendar!.tokens, 21);
    assert.equal(state.inventory.gold, goldBefore + 360);
    assert.match(claimFestivalCommission(state, pack, "summer_fish_feast", T0).reason || "", /本季已完成 3 次/);

    // Fishing actions after the season baseline (40) count; the second claim needs 30 in total.
    state.stats!.actionsById!.act_fish_river_t1 = 54;
    assert.equal(claimFestivalCommission(state, pack, "summer_net_casting", T0).ok, false, "14 < 15");
    state.stats!.actionsById!.act_fish_sea_t2 = 1;
    assert.equal(claimFestivalCommission(state, pack, "summer_net_casting", T0).ok, true);
    const second = claimFestivalCommission(state, pack, "summer_net_casting", T0);
    assert.match(second.reason || "", /第 2 次领取需累计 30/);
    assert.equal(state.festivalCalendar!.totalClaims, 4);
    assert.equal(state.festivalCalendar!.totalTokensEarned, 21 + 8);

    // Winter hunt patrol counts kills made after the winter season opened.
    const hunter = festivalState(WINTER);
    hunter.stats!.totalKills = 54;
    assert.equal(claimFestivalCommission(hunter, pack, "winter_hunt_patrol", WINTER).ok, false);
    hunter.stats!.totalKills = 55;
    const hunt = claimFestivalCommission(hunter, pack, "winter_hunt_patrol", WINTER);
    assert.equal(hunt.ok, true, hunt.reason);
    assert.equal(hunt.tokens, 9);
  });

  it("sells seasonal shop goods for tokens: gold pouch, real-item bundles, academy credit letters and permanent keepsakes", () => {
    const state = festivalState();
    assert.match(buyFestivalShopItem(state, pack, "festival_gold_pouch", T0).reason || "", /不足/);
    state.festivalCalendar!.tokens = 80;
    const goldBefore = state.inventory.gold || 0;
    assert.equal(buyFestivalShopItem(state, pack, "festival_gold_pouch", T0).ok, true);
    assert.equal(state.inventory.gold, goldBefore + 500);
    assert.match(buyFestivalShopItem(state, pack, "spring_seed_bundle", T0).reason || "", /只在春耕节上架/);

    const bundle = buyFestivalShopItem(state, pack, "summer_catch_bundle", T0);
    assert.equal(bundle.ok, true);
    assert.equal(state.inventory.fish_deepsea, 4);
    assert.equal(state.inventory.shrimp, 6);

    assert.equal(state.adventurerAcademy?.credits.commerce, 0, "every WL-12 command keeps both clocks (academy + festival) in step");
    const letter = buyFestivalShopItem(state, pack, "summer_academy_letter", T0);
    assert.equal(letter.ok, true);
    assert.equal(state.adventurerAcademy?.credits.commerce, 3, "summer letter → 商会经营系 +3 credits");
    assert.equal(buyFestivalShopItem(state, pack, "summer_academy_letter", T0).ok, true);
    assert.match(buyFestivalShopItem(state, pack, "summer_academy_letter", T0).reason || "", /限购 2 次/);

    const keep = buyFestivalShopItem(state, pack, "summer_keepsake", T0);
    assert.equal(keep.ok, true, keep.reason);
    assert.equal(keep.keepsake, "summer");
    assert.deepEqual(state.festivalCalendar!.keepsakes, ["summer"]);
    assert.equal(state.festivalCalendar!.tokens, 80 - 4 - 6 - 10 - 10 - 30);
    assert.equal(getAcademyFestivalBonuses(state).goldGainPct, 2 + 0, "summer keepsake +2% gold (commerce 6 credits < tier 1)");

    // A keepsake bought last year cannot be re-bought next summer; the gold pouch is capped at 6 per season.
    const again = festivalState();
    again.festivalCalendar!.keepsakes = ["summer"];
    again.festivalCalendar!.tokens = 200;
    assert.match(buyFestivalShopItem(again, pack, "summer_keepsake", T0).reason || "", /已拥有/);
    for (let i = 0; i < 6; i++) assert.equal(buyFestivalShopItem(again, pack, "festival_gold_pouch", T0).ok, true);
    assert.match(buyFestivalShopItem(again, pack, "festival_gold_pouch", T0).reason || "", /限购 6 次/);
    assert.equal(FESTIVAL_SHOP_ITEMS.filter((s) => s.kind === "keepsake").length, 4);
  });

  it("keeps academy credits, the running course, keepsakes and season progress through doPrestige and performReincarnation", () => {
    const state = academyState({ gathering: 25, tactics: 41 });
    state.combatLevel = 60;
    state.skills.woodcutting = { level: 55, xp: 0 } as any;
    state.inventory.gold = 50_000;
    state.inventory.lumber_1 = 4;
    state.inventory.food_simple = 2;
    assert.equal(enrollAcademyCourse(state, pack, "field_survey", T0).ok, true);
    const fc = ensureFestivalCalendar(state, T0);
    fc.tokens = 17;
    fc.keepsakes = ["autumn", "winter"];
    fc.claims = { summer_cool_drinks: 2 };
    fc.totalClaims = 2;
    const snapAc = structuredClone(state.adventurerAcademy);
    const snapFc = structuredClone(state.festivalCalendar);
    const bonus = getAcademyFestivalBonuses(state);

    assert.equal(doPrestige(state).ok, true);
    assert.deepEqual(state.adventurerAcademy, snapAc);
    assert.deepEqual(state.festivalCalendar, snapFc);

    state.combatLevel = 60;
    state.skills.woodcutting = { level: 55, xp: 0 } as any;
    assert.equal(performReincarnation(state).ok, true);
    assert.deepEqual(state.adventurerAcademy, snapAc);
    assert.deepEqual(state.festivalCalendar, snapFc);
    assert.deepEqual(getAcademyFestivalBonuses(state), bonus);
    // The course paid before rebirth still graduates afterwards.
    assert.equal(ensureAdventurerAcademy(state, new Date(T0.getTime() + 30 * 60_000)).credits.gathering, 29);
  });

  it("exposes GET/POST /progression2/academy* and /festival/* with auth guard, strict zod schemas, server-side checks and stateRevision 409", async () => {
    const seasonId = festivalSeasonIdFromIndex(getFestivalSeasonIndex(new Date()));
    const deliver = getFestivalCommissionsForSeason(seasonId).find((c) => c.kind === "deliver")!;
    const fx = await academyRouteFixture((s) => {
      s.inventory.gold = 2000;
      s.inventory.lumber_1 = 4;
      s.inventory.food_simple = 2;
      for (const [itemId, qty] of Object.entries(deliver.items)) s.inventory[itemId] = (s.inventory[itemId] || 0) + qty;
    });

    assert.equal((await fx.invoke("GET", "/progression2/academy", undefined, null)).statusCode, 401);
    assert.equal((await fx.invoke("POST", "/progression2/academy/enroll", { courseId: "field_survey" }, null)).statusCode, 401);
    assert.equal((await fx.invoke("POST", "/progression2/festival/commission", { commissionId: deliver.id }, null)).statusCode, 401);
    assert.equal((await fx.invoke("POST", "/progression2/festival/shop", { itemId: "festival_gold_pouch" }, null)).statusCode, 401);

    const initial = await fx.invoke("GET", "/progression2/academy");
    assert.equal(initial.statusCode, 200);
    assert.equal(initial.payload.festival.seasonKey, festivalSeasonKey(new Date()));
    assert.equal(initial.payload.academy.courses.length, ACADEMY_COURSES.length);
    assert.equal(initial.payload.academy.activeCourse, null);
    const rev0 = initial.payload.stateRevision;
    const persisted = await fx.storage.getOrCreatePlayerState(fx.userId, pack.version);
    assert.ok(persisted.adventurerAcademy && persisted.festivalCalendar, "first GET persists both new states");

    const bad = await fx.invoke("POST", "/progression2/academy/enroll", { courseId: "dragon_slaying_101" });
    assert.ok(bad.statusCode >= 400 && bad.statusCode < 500, "unknown course rejected by schema");
    const extra = await fx.invoke("POST", "/progression2/festival/shop", { itemId: "festival_gold_pouch", qty: 9 });
    assert.ok(extra.statusCode >= 400 && extra.statusCode < 500, "strict schema rejects extra fields");
    const badCommission = await fx.invoke("POST", "/progression2/festival/commission", { commissionId: "free_tokens" });
    assert.ok(badCommission.statusCode >= 400 && badCommission.statusCode < 500);
    const broke = await fx.invoke("POST", "/progression2/festival/shop", { itemId: "festival_gold_pouch" });
    assert.equal(broke.statusCode, 400, "server rejects buying without tokens");

    const latest = await fx.storage.getOrCreatePlayerState(fx.userId, pack.version);
    const enroll = await fx.invoke("POST", "/progression2/academy/enroll", {
      courseId: "field_survey",
      expectedRevision: latest.stateRevision,
    });
    assert.equal(enroll.statusCode, 200);
    assert.equal(enroll.payload.enrollment.courseId, "field_survey");
    assert.equal(enroll.payload.academy.academy.activeCourse.courseId, "field_survey");
    assert.equal(enroll.payload.inventory.gold, 1800);
    const rev1 = enroll.payload.stateRevision;
    assert.ok(rev1 > rev0);

    const stale = await fx.invoke("POST", "/progression2/festival/commission", { commissionId: deliver.id, expectedRevision: rev0 });
    assert.equal(stale.statusCode, 409);

    const busy = await fx.invoke("POST", "/progression2/academy/enroll", { courseId: "ledger_basics" });
    assert.equal(busy.statusCode, 400, "the single course slot is taken");

    const claim = await fx.invoke("POST", "/progression2/festival/commission", { commissionId: deliver.id, expectedRevision: rev1 });
    assert.equal(claim.statusCode, 200);
    assert.equal(claim.payload.commission.tokens, deliver.tokens);
    assert.equal(claim.payload.academy.festival.tokens, deliver.tokens);
    const buy = await fx.invoke("POST", "/progression2/festival/shop", { itemId: "festival_gold_pouch" });
    assert.equal(buy.statusCode, 200);
    assert.equal(buy.payload.academy.festival.tokens, deliver.tokens - 4);

    const saved = await fx.storage.getOrCreatePlayerState(fx.userId, pack.version);
    assert.equal(saved.adventurerAcademy?.activeCourse?.courseId, "field_survey");
    assert.equal(saved.festivalCalendar?.claims[deliver.id], 1);
    assert.equal(saved.festivalCalendar?.purchases.festival_gold_pouch, 1);
  });
});
