import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { randomUUID } from "node:crypto";
import packJson from "../../shared/enhanced_content_pack_chinese.json";
import type { ChronicleChapterId, EnhancedContentPack, EnhancedPlayerState, TavernVisitorId } from "./types";
import { createMemoryStorage } from "./storage_memory";
import { progressionRoutes } from "./routes/progression";
import { progression2Routes } from "./routes/progression2";
import { mapThrownError } from "./http_errors";
import {
  BEAST_LEVEL_XP,
  CHRONICLE_CHAPTERS,
  CHRONICLE_CHAPTER_IDS,
  TAVERN_BALLADS,
  TAVERN_BALLADS_PER_DAY,
  TAVERN_FAME_TIERS,
  TAVERN_MENU,
  TAVERN_PERFECT_BONUS_FAME,
  TAVERN_VISITORS,
  TAVERN_VISITORS_PER_DAY,
  doPrestige,
  ensureAdventurerChronicle,
  ensureBardTavern,
  equipChronicleTitle,
  generateArenaChampion,
  getArenaSeasonIndex,
  getChronicleMetrics,
  getChronicleProgress,
  getTavernBalladEffect,
  getTavernChronicleBonuses,
  getTavernChronicleInfo,
  getTavernFameTier,
  getTavernMenuItem,
  getTavernVisitorDef,
  getTavernVisitorOrder,
  getTavernVisitorsForDay,
  inscribeChronicleChapter,
  performReincarnation,
  planTavernServe,
  requestBardBallad,
  serveTavernVisitor,
  simulateArenaDuel,
  tavernDayEndsAtMs,
  tavernDayIndex,
  tavernDayKey,
  tavernDayKeyFromIndex,
} from "./progression2";
import { playerBuildExtras, startHpCombat } from "./hp_combat";
import {
  defaultEnhancedPlayerState,
  ensurePlayerExtensions,
  getActionRates,
  simulateToNow,
  startLifeActionNow,
} from "./storage";

const pack = packJson as EnhancedContentPack;
/** 历史时刻：2026 年 7 月 10 日（东八区 17:00），与墙钟日期不同，确保「无参 ensure 不按墙钟换日」的断言有意义。 */
const T0 = new Date("2026-07-10T09:00:00.000Z");
const DAY_MS = 86_400_000;
const T0_IDX = tavernDayIndex(T0);
const at = (dayIdx: number, hourUtc8 = 12, minute = 0) => new Date(dayIdx * DAY_MS + (hourUtc8 - 8) * 3_600_000 + minute * 60_000);
const fameOf = (itemId: string) => getTavernMenuItem(itemId)!.fame;

/** 把某位来访者当日点单的料理与饮品放进背包。 */
function stockOrder(state: EnhancedPlayerState, dayIdx: number, visitorId: TavernVisitorId, qty = 1) {
  const o = getTavernVisitorOrder(dayIdx, visitorId);
  state.inventory[o.dishId] = (state.inventory[o.dishId] || 0) + qty;
  state.inventory[o.drinkId] = (state.inventory[o.drinkId] || 0) + qty;
  return o;
}

/** 编年史 6 卷 + 终章全部达成所需的真实记录（直接写进各系统已有的存档字段）。 */
function legendaryRecords(state: EnhancedPlayerState) {
  state.stats!.totalBossKills = 40;
  state.stats!.killsByMonster = { ...state.stats!.killsByMonster, forest_boss: 20, mine_boss: 10, swamp_boss: 6, snow_boss: 4 };
  (state as any).astralRelics = { ancientRelicShards: 0, expeditionXp: 60, curatorRank: 2, totalSurveys: 6, totalRestorations: 0, pedestalRanks: {} };
  (state as any).caravanTrade = { caravanRep: 0, astralCrystalDust: 0, expressPermits: 0, ledgerRank: 0, totalRunsCompleted: 5, totalContractsFulfilled: 0, wagons: {} };
  (state as any).harborDerby = { trophies: { bronze: 1, silver: 1, gold: 0, legend: 0 } };
  (state as any).harborAquarium = {
    species: Object.fromEntries(["fish_river", "shrimp", "fish_sea", "fish_lake", "fish_deepsea", "fish_abyss"].map((id) => [id, { count: 1, bestSizeCm: 30 }])),
    featuredTank: null,
  };
  (state as any).adventurerAcademy = { credits: { gathering: 20, crafting: 20, tactics: 10, commerce: 10 }, completedCourses: {}, activeCourse: null, totalEnrollments: 2, totalGraduations: 2, lastGraduation: null };
  (state as any).festivalCalendar = { keepsakes: ["summer"] };
  (state as any).skyArena = { bestRung: 5, totalWins: 10, titles: ["bronze"] };
  (state as any).beastRanch = {
    beasts: {
      bloom_bee: { xp: BEAST_LEVEL_XP[9], fed: 0, tamedAt: T0.toISOString() },
      frostmane_wolf: { xp: BEAST_LEVEL_XP[9], fed: 0, tamedAt: T0.toISOString() },
      echo_bat: { xp: BEAST_LEVEL_XP[3], fed: 0, tamedAt: T0.toISOString() },
    },
    activeBeastId: null,
    totalTamed: 3,
    totalFeedings: 0,
    lastEvent: null,
  };
  ensurePlayerExtensions(state);
  return state;
}

async function routeFixture(patch?: (state: EnhancedPlayerState) => void) {
  const storage = createMemoryStorage();
  const user = await storage.findOrCreateGuestUser(`wl15-tavern-${randomUUID()}`);
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

describe("WL-15 Bard Tavern & Adventurer Chronicle backend mechanics & routes", () => {
  it("loads old saves with safe defaults (no gifts, no bonus) and sanitizes dirty tavern / chronicle data", () => {
    const legacy = defaultEnhancedPlayerState(pack.version);
    ensurePlayerExtensions(legacy);
    assert.equal(legacy.bardTavern, undefined, "ensurePlayerExtensions must not invent the tavern for old saves");
    assert.equal(legacy.adventurerChronicle, undefined);
    const empty = getTavernChronicleBonuses(legacy);
    assert.equal(empty.fameTier, 0);
    assert.equal(empty.chaptersInscribed, 0);
    for (const k of ["gatherSpeedPct", "craftSpeedPct", "gatherEfficiencyPct", "craftEfficiencyPct", "xpGainPct", "goldGainPct", "bonusAtk", "bonusDef", "bonusHp"] as const) {
      assert.equal(empty[k], 0, k);
    }
    assert.equal(getTavernBalladEffect(legacy, T0).active, false);

    const goldBefore = legacy.inventory.gold || 0;
    const info = getTavernChronicleInfo(legacy, pack, T0);
    assert.equal(legacy.bardTavern?.dayKey, "2026-07-10");
    assert.deepEqual(legacy.bardTavern?.served, []);
    assert.equal(legacy.bardTavern?.fame, 0);
    assert.deepEqual(legacy.adventurerChronicle?.inscribed, []);
    assert.equal(legacy.inventory.gold || 0, goldBefore, "opening the panel gifts nothing");
    assert.equal(info.tavern.visitors.length, TAVERN_VISITORS_PER_DAY);
    assert.deepEqual(info.tavern.visitors.map((v) => v.id), getTavernVisitorsForDay(T0_IDX));
    const forest = info.tavern.ballads.find((b) => b.id === "forest_wander")!;
    assert.equal(forest.unlocked, true, "the first ballads need no fame");
    assert.equal(forest.block, goldBefore >= forest.costGold ? null : "金币不足");
    assert.equal(info.tavern.ballads.find((b) => b.id === "hero_epic")!.block, `需「${TAVERN_FAME_TIERS[3].name}」`);
    assert.equal(info.chronicle.chapters.length, CHRONICLE_CHAPTERS.length);
    assert.equal(info.chronicle.chapters.every((c) => !c.complete && !c.inscribed && !c.canInscribe), true, "a fresh save has no milestones");
    assert.equal(info.chronicle.entriesDone, 0);

    const dirty = defaultEnhancedPlayerState(pack.version);
    const visitors = getTavernVisitorsForDay(T0_IDX);
    const stranger = (TAVERN_VISITORS.map((v) => v.id) as TavernVisitorId[]).find((id) => !visitors.includes(id))!;
    (dirty as any).bardTavern = {
      dayKey: "2026-07-10",
      served: [visitors[1], stranger, "dragon", visitors[1]],
      balladsToday: 9,
      activeBallad: { balladId: "hero_epic", startedAt: T0.toISOString(), endsAt: "2099-01-01T00:00:00.000Z" },
      fame: "lots",
      totalServed: 0,
      totalPerfect: 7,
      totalBallads: 1,
      tipsEarned: -50,
      lastServe: { visitorId: "dragon", dayKey: "2026-07-10" },
    };
    (dirty as any).adventurerChronicle = {
      inscribed: ["arena_epic", "nope", "slayer_saga", "arena_epic"],
      inscribedAt: { arena_epic: "bad", slayer_saga: T0.toISOString(), harbor_log: T0.toISOString() },
      equippedTitle: "harbor_log",
      lastInscription: { chapterId: "harbor_log", at: T0.toISOString() },
    };
    ensurePlayerExtensions(dirty);
    const tv = dirty.bardTavern!;
    assert.equal(tv.dayKey, "2026-07-10", "no-arg ensure never moves the tavern day by the wall clock");
    assert.deepEqual(tv.served, [visitors[1]], "only real visitors of that day, deduplicated");
    assert.equal(tv.balladsToday, TAVERN_BALLADS_PER_DAY);
    assert.equal(tv.activeBallad!.endsAt, new Date(T0.getTime() + 45 * 60_000).toISOString(), "ballad end is recomputed from its duration");
    assert.equal(tv.fame, 0);
    assert.equal(tv.totalServed, 1);
    assert.equal(tv.totalPerfect, 1, "perfect serves never exceed serves");
    assert.equal(tv.totalBallads, TAVERN_BALLADS_PER_DAY);
    assert.equal(tv.tipsEarned, 0);
    assert.equal(tv.lastServe, null);
    const ch = dirty.adventurerChronicle!;
    assert.deepEqual(ch.inscribed, ["slayer_saga", "arena_epic"], "valid ids only, table order, deduplicated");
    assert.deepEqual(Object.keys(ch.inscribedAt).sort(), ["arena_epic", "slayer_saga"]);
    assert.equal(ch.inscribedAt.arena_epic, new Date(0).toISOString());
    assert.equal(ch.equippedTitle, null, "a title must come from an inscribed chapter");
    assert.equal(ch.lastInscription, null);
    // a 45-minute ballad: active from its start, gone after
    assert.equal(getTavernBalladEffect(dirty, new Date(T0.getTime() + 44 * 60_000)).active, true);
    assert.equal(getTavernBalladEffect(dirty, new Date(T0.getTime() + 45 * 60_000)).active, false);
    assert.equal(getTavernBalladEffect(dirty, new Date(T0.getTime() - 1)).active, false);
  });

  it("rotates 4 of 8 regulars deterministically per UTC+8 day, orders come from their tastes, and only rolls the day on an explicit now", () => {
    assert.equal(tavernDayKey(new Date("2026-11-18T15:59:59.999Z")), "2026-11-18");
    assert.equal(tavernDayKey(new Date("2026-11-18T16:00:00.000Z")), "2026-11-19", "midnight in UTC+8");
    assert.equal(new Date(tavernDayEndsAtMs(Date.parse("2026-11-18T03:00:00.000Z"))).toISOString(), "2026-11-18T16:00:00.000Z");
    const seen: Record<string, number> = {};
    for (let d = T0_IDX; d < T0_IDX + 800; d++) {
      const list = getTavernVisitorsForDay(d);
      assert.equal(list.length, TAVERN_VISITORS_PER_DAY);
      assert.equal(new Set(list).size, TAVERN_VISITORS_PER_DAY, "no duplicates");
      assert.deepEqual(getTavernVisitorsForDay(d), list, "deterministic");
      for (const id of list) {
        seen[id] = (seen[id] || 0) + 1;
        const def = getTavernVisitorDef(id);
        const o = getTavernVisitorOrder(d, id);
        assert.ok(def.dishes.includes(o.dishId) && getTavernMenuItem(o.dishId)!.kind === "dish", `${id} orders a dish it likes`);
        assert.ok(def.drinks.includes(o.drinkId) && getTavernMenuItem(o.drinkId)!.kind === "drink", `${id} orders a drink it likes`);
      }
    }
    for (const v of TAVERN_VISITORS) {
      assert.ok(seen[v.id] > 800 * 0.4 && seen[v.id] < 800 * 0.6, `${v.id} visits about half the days (${seen[v.id]})`);
    }
    let changed = 0;
    for (let d = T0_IDX; d < T0_IDX + 30; d++) if (getTavernVisitorsForDay(d).join() !== getTavernVisitorsForDay(d + 1).join()) changed += 1;
    assert.ok(changed >= 25, "the guest list really rotates day to day");

    const state = defaultEnhancedPlayerState(pack.version);
    const tv = ensureBardTavern(state, at(T0_IDX, 10));
    const v0 = getTavernVisitorsForDay(T0_IDX)[0];
    tv.served = [v0];
    tv.balladsToday = 2;
    ensureBardTavern(state);
    assert.deepEqual(state.bardTavern!.served, [v0], "no-arg ensure keeps today's records");
    ensureBardTavern(state, at(T0_IDX, 23, 59));
    assert.equal(state.bardTavern!.balladsToday, 2, "same UTC+8 day: nothing resets");
    ensureBardTavern(state, at(T0_IDX - 3, 12));
    assert.equal(state.bardTavern!.dayKey, tavernDayKeyFromIndex(T0_IDX), "the clock never rolls back");
    ensureBardTavern(state, at(T0_IDX + 1, 0, 1));
    assert.equal(state.bardTavern!.dayKey, tavernDayKeyFromIndex(T0_IDX + 1));
    assert.deepEqual(state.bardTavern!.served, []);
    assert.equal(state.bardTavern!.balladsToday, 0);
  });

  it("serves real dishes / drinks for fame and tips (order ×1.5, perfect +5), once per visitor per day, rejecting without mutation", () => {
    const state = defaultEnhancedPlayerState(pack.version);
    const now = at(T0_IDX, 19);
    const [a, b, c] = getTavernVisitorsForDay(T0_IDX);
    const order = stockOrder(state, T0_IDX, a);
    state.inventory.gold = 100;
    const goldEarnedBefore = state.stats!.totalGoldEarned;
    const expectedFame = Math.floor((fameOf(order.dishId) * 150) / 100) + Math.floor((fameOf(order.drinkId) * 150) / 100) + TAVERN_PERFECT_BONUS_FAME;
    assert.equal(planTavernServe(T0_IDX, a, order.dishId, order.drinkId).fame, expectedFame);
    const res = serveTavernVisitor(state, pack, a, order.dishId, order.drinkId, now);
    assert.equal(res.ok, true, res.reason);
    assert.equal(res.verdict, "perfect");
    assert.equal(res.fame, expectedFame);
    assert.equal(res.tipGold, expectedFame * getTavernVisitorDef(a).tipPerFame);
    assert.equal(state.inventory[order.dishId], undefined, "the dish is served from the bag");
    assert.equal(state.inventory[order.drinkId], undefined);
    assert.equal(state.inventory.gold, 100 + res.tipGold!);
    assert.equal(state.stats!.totalGoldEarned, goldEarnedBefore + res.tipGold!);
    assert.equal(state.bardTavern!.fame, expectedFame);
    assert.deepEqual(state.bardTavern!.served, [a]);
    assert.equal(state.bardTavern!.totalPerfect, 1);
    assert.equal(state.bardTavern!.lastServe!.visitorId, a);

    stockOrder(state, T0_IDX, a);
    const twice = serveTavernVisitor(state, pack, a, getTavernVisitorOrder(T0_IDX, a).dishId, null, now);
    assert.equal(twice.ok, false, "once per visitor per day");
    const stranger = (TAVERN_VISITORS.map((v) => v.id) as TavernVisitorId[]).find((id) => !getTavernVisitorsForDay(T0_IDX).includes(id))!;
    state.inventory.food_simple = 3;
    assert.equal(serveTavernVisitor(state, pack, stranger, "food_simple", null, now).ok, false, "only today's visitors");
    assert.equal(serveTavernVisitor(state, pack, b, null, null, now).ok, false, "something must be served");
    assert.equal(serveTavernVisitor(state, pack, b, "drink_basic", null, now).ok, false, "a drink is not a dish");
    assert.equal(serveTavernVisitor(state, pack, b, "wood_1", null, now).ok, false, "only the menu");
    assert.equal(serveTavernVisitor(state, pack, b, "food_simple", null, now, "2026-07-09").ok, false, "stale day key");
    const snap = JSON.stringify(state.inventory);
    const fameSnap = state.bardTavern!.fame;
    assert.equal(serveTavernVisitor(state, pack, b, "dish_dragon_delicacy", null, now).ok, false, "not in the bag");
    assert.equal(JSON.stringify(state.inventory), snap, "rejections consume nothing");
    assert.equal(state.bardTavern!.fame, fameSnap);

    // a plain dish that is not the order: base fame, verdict "fine" (or "pleased" when it happens to be the order)
    const bOrder = getTavernVisitorOrder(T0_IDX, b);
    const plain = bOrder.dishId === "food_simple" ? "bread" : "food_simple";
    state.inventory[plain] = (state.inventory[plain] || 0) + 1;
    const r2 = serveTavernVisitor(state, pack, b, plain, null, now);
    assert.equal(r2.ok, true, r2.reason);
    assert.equal(r2.verdict, "fine");
    assert.equal(r2.fame, fameOf(plain));
    // only the drink matches → "pleased", drink ×1.5
    const cOrder = getTavernVisitorOrder(T0_IDX, c);
    state.inventory[cOrder.drinkId] = 1;
    const r3 = serveTavernVisitor(state, pack, c, null, cOrder.drinkId, now);
    assert.equal(r3.verdict, "pleased");
    assert.equal(r3.fame, Math.floor((fameOf(cOrder.drinkId) * 150) / 100));
    assert.equal(state.bardTavern!.totalServed, 3);

    // the next UTC+8 day brings a new list and frees every visitor again
    const tomorrow = getTavernVisitorsForDay(T0_IDX + 1)[0];
    stockOrder(state, T0_IDX + 1, tomorrow);
    const r4 = serveTavernVisitor(state, pack, tomorrow, getTavernVisitorOrder(T0_IDX + 1, tomorrow).dishId, null, at(T0_IDX + 1, 9));
    assert.equal(r4.ok, true, r4.reason);
    assert.deepEqual(state.bardTavern!.served, [tomorrow]);
  });

  it("plays fame-gated bard ballads (3 a day, one at a time) whose timed buff feeds real getActionRates and the simulator", () => {
    const find = (id: string) => (pack.actions as any[]).find((x) => x.id === id);
    const chop = find("act_chop_wood_t1");
    const plank = find("act_craft_lumber_t1");
    const fight = (pack.actions as any[]).find((x) => String(x.id).startsWith("act_combat_"));
    const base = defaultEnhancedPlayerState(pack.version);
    const state = defaultEnhancedPlayerState(pack.version);
    state.inventory.gold = 10_000;
    const t = at(T0_IDX, 10);
    assert.equal(requestBardBallad(state, "sage_chant", t).ok, false, "sage chant needs fame tier 1");
    assert.equal(state.inventory.gold, 10_000);
    const r = requestBardBallad(state, "forest_wander", t);
    assert.equal(r.ok, true, r.reason);
    assert.equal(state.inventory.gold, 10_000 - 300);
    assert.equal(state.bardTavern!.fame, 4);
    assert.equal(state.bardTavern!.balladsToday, 1);
    assert.equal(requestBardBallad(state, "forge_hearth", new Date(t.getTime() + 10 * 60_000)).ok, false, "one ballad at a time");

    const during = new Date(t.getTime() + 10 * 60_000);
    const g0 = getActionRates(base, pack, chop, during);
    const g1 = getActionRates(state, pack, chop, during);
    assert.ok(Math.abs(g1.speedMul / g0.speedMul - 1.08) < 1e-9, "forest ballad: gather speed +8%");
    assert.equal(g1.efficiencyPct - g0.efficiencyPct, 4);
    assert.ok(g1.speedSources.some((s) => s.label === "吟游诗篇 · 林野采风谣" && s.pct === 8));
    assert.ok(g1.efficiencySources.some((s) => s.label === "吟游诗篇 · 林野采风谣" && s.pct === 4));
    assert.equal(getActionRates(state, pack, plank, during).speedMul, getActionRates(base, pack, plank, during).speedMul, "a gathering ballad leaves crafting alone");
    assert.equal(getActionRates(state, pack, fight, during).speedMul, getActionRates(base, pack, fight, during).speedMul, "combat untouched");
    const after = new Date(t.getTime() + 30 * 60_000);
    assert.equal(getActionRates(state, pack, chop, after).speedMul, getActionRates(base, pack, chop, after).speedMul, "the buff ends on time");

    const r2 = requestBardBallad(state, "forge_hearth", after);
    assert.equal(r2.ok, true, r2.reason);
    const mid = new Date(after.getTime() + 5 * 60_000);
    assert.ok(Math.abs(getActionRates(state, pack, plank, mid).speedMul / getActionRates(base, pack, plank, mid).speedMul - 1.08) < 1e-9);
    state.bardTavern!.fame = TAVERN_FAME_TIERS[2].minFame;
    const r3 = requestBardBallad(state, "golden_toast", new Date(after.getTime() + 31 * 60_000));
    assert.equal(r3.ok, true, r3.reason);
    const toast = new Date(after.getTime() + 40 * 60_000);
    assert.ok(Math.abs(getActionRates(state, pack, chop, toast).goldMul / getActionRates(base, pack, chop, toast).goldMul - 1.1 * 1.01) < 1e-9, "toast +10% gold × fame tier 2 +1%");
    assert.ok(Math.abs(getActionRates(state, pack, chop, toast).xpMul / getActionRates(base, pack, chop, toast).xpMul - 1.01) < 1e-9, "fame tier 2 +1% xp");
    assert.equal(state.bardTavern!.balladsToday, TAVERN_BALLADS_PER_DAY);
    assert.equal(requestBardBallad(state, "forest_wander", new Date(after.getTime() + 90 * 60_000)).ok, false, "three ballads a day");
    const nextDay = requestBardBallad(state, "forest_wander", at(T0_IDX + 1, 9));
    assert.equal(nextDay.ok, true, "the next UTC+8 day (explicit now) resets the count");
    state.inventory.gold = 10;
    assert.equal(requestBardBallad(state, "forge_hearth", at(T0_IDX + 1, 11)).ok, false, "gold is checked");

    // real simulator: 20 minutes of chopping inside the ballad window yields more wood than without it
    const sBase = defaultEnhancedPlayerState(pack.version);
    const sBard = defaultEnhancedPlayerState(pack.version);
    sBard.inventory.gold = 1000;
    const start = at(T0_IDX + 3, 9);
    assert.equal(requestBardBallad(sBard, "forest_wander", start).ok, true);
    for (const s of [sBase, sBard]) {
      s.lastSimulatedAt = start.toISOString();
      startLifeActionNow(s, pack, "act_chop_wood_t1", undefined, start);
    }
    let seed = 15;
    const rng = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const later = new Date(start.getTime() + 20 * 60_000);
    const oBase = simulateToNow({ state: sBase, contentPack: pack, now: later, rng });
    seed = 15;
    const oBard = simulateToNow({ state: sBard, contentPack: pack, now: later, rng });
    assert.ok((oBard.state.inventory.wood_1 || 0) > (oBase.state.inventory.wood_1 || 0), "the ballad really speeds up offline chopping");
  });

  it("compiles chronicle chapters from real save records (no new counters) and inscribes them server-side", () => {
    const state = defaultEnhancedPlayerState(pack.version);
    const before = JSON.stringify(state);
    const m0 = getChronicleMetrics(state);
    assert.equal(JSON.stringify(state), before, "reading the chronicle never writes counters");
    assert.equal(Object.values(m0).every((v) => v === 0), true);

    // boss kills come straight from the career kill statistics
    state.stats!.killsByMonster = { ...state.stats!.killsByMonster, forest_boss: 12, mine_boss: 3, slime: 99, fake_boss: 50 };
    state.stats!.totalBossKills = 15;
    let m = getChronicleMetrics(state);
    assert.equal(m.boss_kinds, 2, "only real pack bosses count");
    assert.equal(m.boss_kills, 15);
    assert.equal(inscribeChronicleChapter(state, "slayer_saga", T0).ok, false, "4 kinds needed");
    state.stats!.killsByMonster.swamp_boss = 2;
    state.stats!.killsByMonster.snow_boss = 1;
    state.stats!.totalBossKills = 18;
    m = getChronicleMetrics(state);
    assert.equal(m.boss_kinds, 4);
    const notYet = inscribeChronicleChapter(state, "slayer_saga", T0);
    assert.equal(notYet.ok, false);
    assert.match(notYet.reason!, /18 \/ 30/);
    state.stats!.totalBossKills = 30;
    const ok = inscribeChronicleChapter(state, "slayer_saga", T0);
    assert.equal(ok.ok, true, ok.reason);
    assert.equal(ok.title, "首领讨伐者");
    assert.equal(ok.autoEquipped, true, "the first title is worn automatically");
    assert.deepEqual(state.adventurerChronicle!.inscribed, ["slayer_saga"]);
    assert.equal(inscribeChronicleChapter(state, "slayer_saga", T0).ok, false, "only once");
    const bonus = getTavernChronicleBonuses(state);
    assert.equal(bonus.bonusAtk, 6);
    assert.equal(bonus.bonusHp, 30);
    assert.equal(bonus.equippedTitle, "slayer_saga");

    // the rest read WL-7/9/11/12/13/14 state that those systems already keep
    legendaryRecords(state);
    m = getChronicleMetrics(state);
    assert.equal(m.relic_surveys, 6);
    assert.equal(m.curator_rank, 2);
    assert.equal(m.caravan_runs, 5);
    assert.equal(m.derby_trophies, 2);
    assert.equal(m.derby_best_tier, 2, "silver is tier 2");
    assert.equal(m.aquarium_species, 6);
    assert.equal(m.academy_graduations, 2);
    assert.equal(m.academy_credits, 60);
    assert.equal(m.festival_keepsakes, 1);
    assert.equal(m.arena_best_rung, 5);
    assert.equal(m.arena_wins, 10);
    assert.equal(m.arena_titles, 1);
    assert.equal(m.beasts_tamed, 3);
    assert.equal(m.beast_top_level, 10);
    assert.equal(m.ranch_bond_levels, 24);
    const progress = getChronicleProgress(state);
    assert.deepEqual(
      progress.chapters.filter((c) => c.canInscribe).map((c) => c.id),
      ["expedition_journal", "harbor_log", "academy_annals", "arena_epic", "beast_bond"]
    );
    assert.equal(inscribeChronicleChapter(state, "legend_finale", T0).ok, false, "the finale needs six chapters, fame and a rebirth");
    for (const id of ["expedition_journal", "harbor_log", "academy_annals", "arena_epic", "beast_bond"] as ChronicleChapterId[]) {
      const r = inscribeChronicleChapter(state, id, T0);
      assert.equal(r.ok, true, `${id}: ${r.reason}`);
      assert.equal(r.autoEquipped, false);
    }
    assert.equal(getChronicleMetrics(state).chapters_inscribed, 6);
    state.bardTavern = undefined;
    ensureBardTavern(state, T0).fame = 500;
    assert.equal(inscribeChronicleChapter(state, "legend_finale", T0).ok, false, "no rebirth yet");
    state.prestige = { count: 1, points: 3, spentPoints: 0, astrolabe: {} };
    const legend = inscribeChronicleChapter(state, "legend_finale", T0);
    assert.equal(legend.ok, true, legend.reason);
    assert.equal(state.adventurerChronicle!.inscribed.length, CHRONICLE_CHAPTER_IDS.length);
    const all = getTavernChronicleBonuses(state);
    const sum = (k: "bonusAtk" | "bonusHp" | "goldGainPct") => CHRONICLE_CHAPTERS.reduce((s, c) => s + (c.stats[k] || 0), 0);
    assert.equal(all.bonusAtk, sum("bonusAtk"));
    assert.equal(all.bonusHp, sum("bonusHp") + (TAVERN_FAME_TIERS[3].stats.bonusHp || 0));
    assert.equal(all.goldGainPct, sum("goldGainPct") + TAVERN_FAME_TIERS[3].stats.goldGainPct!);

    // titles: wear only inscribed ones
    assert.equal(equipChronicleTitle(state, "legend_finale", T0).ok, true);
    assert.equal(state.adventurerChronicle!.equippedTitle, "legend_finale");
    assert.equal(equipChronicleTitle(state, "legend_finale", T0).ok, false, "already worn");
    assert.equal(equipChronicleTitle(state, null, T0).ok, true);
    assert.equal(equipChronicleTitle(state, null, T0).ok, false);
    const fresh = defaultEnhancedPlayerState(pack.version);
    assert.equal(equipChronicleTitle(fresh, "arena_epic", T0).ok, false, "not inscribed");
  });

  it("wires fame tiers and inscribed chapters into real production / combat formulas (getActionRates, playerBuildExtras, HP combat, arena sandbox)", () => {
    const find = (id: string) => (pack.actions as any[]).find((x) => x.id === id);
    const chop = find("act_chop_wood_t1");
    const plank = find("act_craft_lumber_t1");
    const base = defaultEnhancedPlayerState(pack.version);
    const famed = defaultEnhancedPlayerState(pack.version);
    ensureBardTavern(famed, T0).fame = TAVERN_FAME_TIERS[4].minFame; // 传奇酒馆: gold 2, xp 2, craft speed 2, gather speed 1
    const tier4 = TAVERN_FAME_TIERS[4].stats;
    assert.ok(Math.abs(getActionRates(famed, pack, chop, T0).speedMul / getActionRates(base, pack, chop, T0).speedMul - (1 + tier4.gatherSpeedPct! / 100)) < 1e-9);
    assert.ok(Math.abs(getActionRates(famed, pack, plank, T0).speedMul / getActionRates(base, pack, plank, T0).speedMul - (1 + tier4.craftSpeedPct! / 100)) < 1e-9);
    assert.ok(getActionRates(famed, pack, plank, T0).speedSources.some((s) => s.label === "酒馆名望与冒险者编年史"));
    assert.ok(Math.abs(getActionRates(famed, pack, chop, T0).xpMul / getActionRates(base, pack, chop, T0).xpMul - 1.02) < 1e-9);
    assert.ok(Math.abs(getActionRates(famed, pack, chop, T0).goldMul / getActionRates(base, pack, chop, T0).goldMul - 1.02) < 1e-9);

    // chronicle efficiency: expedition (+1% gather output) and beast bond (+1% craft output)
    const chron = defaultEnhancedPlayerState(pack.version);
    ensureAdventurerChronicle(chron).inscribed = ["expedition_journal", "harbor_log", "beast_bond"];
    assert.equal(getActionRates(chron, pack, chop, T0).efficiencyPct - getActionRates(base, pack, chop, T0).efficiencyPct, 1 + 2);
    assert.equal(getActionRates(chron, pack, plank, T0).efficiencyPct - getActionRates(base, pack, plank, T0).efficiencyPct, 1);
    assert.ok(getActionRates(chron, pack, chop, T0).efficiencySources.some((s) => s.label === "冒险者编年史" && s.pct === 3));

    // combat: slayer (+6 atk +30 hp) + arena (+4 def +40 hp) + fame tier 5 (+30 hp, +3% gold)
    const fighter = defaultEnhancedPlayerState(pack.version);
    ensureAdventurerChronicle(fighter).inscribed = ["slayer_saga", "arena_epic"];
    ensureBardTavern(fighter, T0).fame = TAVERN_FAME_TIERS[5].minFame;
    const e0 = playerBuildExtras(base);
    const e1 = playerBuildExtras(fighter);
    assert.equal(e1.atk - e0.atk, 6);
    assert.equal(e1.def - e0.def, 4);
    assert.equal(e1.hp - e0.hp, 30 + 40 + 30);
    assert.ok(Math.abs(e1.goldMult / e0.goldMult - 1.03) < 1e-3, "fame tier 5 +3% combat gold");
    const monster = (pack.monsters as any[]).find((x) => x.id === "slime");
    const fightPack = {
      ...pack,
      actions: (pack.actions as any[]).map((x: any) => (String(x.id).startsWith("act_combat_") ? { ...x, requirements: {} } : x)),
    } as EnhancedContentPack;
    const hp0 = startHpCombat(defaultEnhancedPlayerState(pack.version), fightPack, monster.id, T0).playerMaxHp;
    const hp1 = startHpCombat(fighter, fightPack, monster.id, T0).playerMaxHp;
    assert.equal(hp1 - hp0, 100);
    const champ = generateArenaChampion(getArenaSeasonIndex(T0), 3);
    const d0 = simulateArenaDuel(defaultEnhancedPlayerState(pack.version), pack, champ, T0);
    const d1 = simulateArenaDuel(fighter, pack, champ, T0);
    assert.equal(d1.playerMaxHp - d0.playerMaxHp, 100, "the arena sandbox copies the chronicle too");
    // a timed ballad never touches combat
    const bard = defaultEnhancedPlayerState(pack.version);
    bard.inventory.gold = 5000;
    ensureBardTavern(bard, T0).fame = TAVERN_FAME_TIERS[3].minFame;
    requestBardBallad(bard, "hero_epic", T0);
    const eb = playerBuildExtras(bard);
    assert.equal(eb.atk, e0.atk);
    assert.ok(Math.abs(eb.goldMult / e0.goldMult - 1.02) < 1e-3, "only the permanent fame tier reaches combat gold");
  });

  it("keeps the tavern (fame, records, playing ballad) and the chronicle (chapters, title) through doPrestige and performReincarnation", () => {
    const state = legendaryRecords(defaultEnhancedPlayerState(pack.version));
    state.inventory.gold = 5000;
    ensureBardTavern(state, T0).fame = 640;
    requestBardBallad(state, "forest_wander", T0);
    const [a] = getTavernVisitorsForDay(T0_IDX);
    stockOrder(state, T0_IDX, a);
    serveTavernVisitor(state, pack, a, getTavernVisitorOrder(T0_IDX, a).dishId, null, T0);
    assert.equal(inscribeChronicleChapter(state, "arena_epic", T0).ok, true);
    state.combatLevel = 60;
    state.skills.woodcutting = { level: 55, xp: 0 } as any;
    const snapTv = structuredClone(state.bardTavern);
    const snapCh = structuredClone(state.adventurerChronicle);
    const bonus = getTavernChronicleBonuses(state);
    assert.equal(doPrestige(state).ok, true);
    assert.deepEqual(state.bardTavern, snapTv);
    assert.deepEqual(state.adventurerChronicle, snapCh);
    state.combatLevel = 60;
    state.skills.woodcutting = { level: 55, xp: 0 } as any;
    assert.equal(performReincarnation(state).ok, true);
    assert.deepEqual(state.bardTavern, snapTv);
    assert.deepEqual(state.adventurerChronicle, snapCh);
    assert.deepEqual(getTavernChronicleBonuses(state), bonus);
    assert.equal(getChronicleMetrics(state).prestige_count, 2, "rebirths are themselves a chronicle milestone");
    assert.equal(getChronicleMetrics(state).boss_kills, 40, "career statistics survive rebirth");
  });

  it("exposes GET /progression2/tavern and POST tavern/* + chronicle/* with auth guard, strict zod schemas, server-side checks and stateRevision 409", async () => {
    const now = new Date();
    const today = tavernDayIndex(now);
    const [a, b] = getTavernVisitorsForDay(today);
    const fx = await routeFixture((s) => {
      s.inventory.gold = 5000;
      stockOrder(s, today, a, 2);
      s.inventory.food_simple = (s.inventory.food_simple || 0) + 4;
      s.stats!.totalBossKills = 30;
      s.stats!.killsByMonster = { ...s.stats!.killsByMonster, forest_boss: 10, mine_boss: 10, swamp_boss: 5, snow_boss: 5 };
    });
    for (const [path, body] of [
      ["/progression2/tavern/serve", { visitorId: a, dishId: "food_simple" }],
      ["/progression2/tavern/ballad", { balladId: "forest_wander" }],
      ["/progression2/chronicle/inscribe", { chapterId: "slayer_saga" }],
      ["/progression2/chronicle/title", { chapterId: null }],
    ] as const) {
      assert.equal((await fx.invoke("POST", path, body as any, null)).statusCode, 401, path);
    }
    assert.equal((await fx.invoke("GET", "/progression2/tavern", undefined, null)).statusCode, 401);

    const initial = await fx.invoke("GET", "/progression2/tavern");
    assert.equal(initial.statusCode, 200);
    assert.equal(initial.payload.tavern.visitors.length, TAVERN_VISITORS_PER_DAY);
    assert.equal(initial.payload.tavern.dayKey, tavernDayKeyFromIndex(today));
    assert.equal(initial.payload.tavern.menu.length, TAVERN_MENU.length);
    assert.equal(initial.payload.tavern.ballads.length, TAVERN_BALLADS.length);
    assert.equal(initial.payload.chronicle.chapters.find((c: any) => c.id === "slayer_saga").canInscribe, true);
    const rev0 = initial.payload.stateRevision;
    const persisted = await fx.storage.getOrCreatePlayerState(fx.userId, pack.version);
    assert.ok(persisted.bardTavern && persisted.adventurerChronicle, "first GET persists both new states");

    const bad = [
      ["/progression2/tavern/serve", { visitorId: "dragon", dishId: "food_simple" }],
      ["/progression2/tavern/serve", { visitorId: a, dishId: "wood_1" }],
      ["/progression2/tavern/serve", { visitorId: a, dishId: "drink_basic" }],
      ["/progression2/tavern/serve", { visitorId: a, drinkId: "food_simple" }],
      ["/progression2/tavern/serve", { visitorId: a, dishId: "food_simple", tip: 999 }],
      ["/progression2/tavern/serve", { visitorId: a, dishId: "food_simple", dayKey: "today" }],
      ["/progression2/tavern/ballad", { balladId: "lullaby" }],
      ["/progression2/tavern/ballad", { balladId: "forest_wander", free: true }],
      ["/progression2/chronicle/inscribe", { chapterId: "volume_9" }],
      ["/progression2/chronicle/title", { chapterId: "nope" }],
      ["/progression2/chronicle/title", {}],
    ] as const;
    for (const [path, body] of bad) {
      const r = await fx.invoke("POST", path, body as any);
      assert.ok(r.statusCode >= 400 && r.statusCode < 500, `${path} ${JSON.stringify(body)} → ${r.statusCode}`);
    }
    const nothing = await fx.invoke("POST", "/progression2/tavern/serve", { visitorId: a });
    assert.equal(nothing.statusCode, 400, "server rejects an empty tray");
    const locked = await fx.invoke("POST", "/progression2/tavern/ballad", { balladId: "hero_epic" });
    assert.equal(locked.statusCode, 400, "server checks the fame tier");
    const notDone = await fx.invoke("POST", "/progression2/chronicle/inscribe", { chapterId: "arena_epic" });
    assert.equal(notDone.statusCode, 400, "server checks the real milestones");
    const noTitle = await fx.invoke("POST", "/progression2/chronicle/title", { chapterId: "slayer_saga" });
    assert.equal(noTitle.statusCode, 400);

    const latest = await fx.storage.getOrCreatePlayerState(fx.userId, pack.version);
    const order = getTavernVisitorOrder(today, a);
    const serve = await fx.invoke("POST", "/progression2/tavern/serve", {
      visitorId: a,
      dishId: order.dishId,
      drinkId: order.drinkId,
      dayKey: initial.payload.tavern.dayKey,
      expectedRevision: latest.stateRevision,
    });
    assert.equal(serve.statusCode, 200, JSON.stringify(serve.payload));
    assert.equal(serve.payload.serve.verdict, "perfect");
    assert.equal(serve.payload.tavern.tavern.servedToday, 1);
    assert.equal(serve.payload.tavern.tavern.visitors.find((v: any) => v.id === a).served, true);
    const rev1 = serve.payload.stateRevision;
    assert.ok(rev1 > rev0);
    const again = await fx.invoke("POST", "/progression2/tavern/serve", { visitorId: a, dishId: order.dishId });
    assert.equal(again.statusCode, 400, "once per visitor per day, enforced server-side");

    const stale = await fx.invoke("POST", "/progression2/tavern/ballad", { balladId: "forest_wander", expectedRevision: rev0 });
    assert.equal(stale.statusCode, 409);
    const ballad = await fx.invoke("POST", "/progression2/tavern/ballad", { balladId: "forest_wander", expectedRevision: rev1 });
    assert.equal(ballad.statusCode, 200);
    assert.equal(ballad.payload.tavern.ballad.active, true);
    assert.equal(ballad.payload.tavern.ballad.balladId, "forest_wander");
    const busy = await fx.invoke("POST", "/progression2/tavern/ballad", { balladId: "forge_hearth" });
    assert.equal(busy.statusCode, 400, "one ballad at a time");

    const inscribe = await fx.invoke("POST", "/progression2/chronicle/inscribe", { chapterId: "slayer_saga" });
    assert.equal(inscribe.statusCode, 200);
    assert.equal(inscribe.payload.inscribe.autoEquipped, true);
    assert.equal(inscribe.payload.tavern.chronicle.equippedTitleName, "首领讨伐者");
    assert.equal(inscribe.payload.tavern.bonuses.bonusAtk, 6);
    const off = await fx.invoke("POST", "/progression2/chronicle/title", { chapterId: null });
    assert.equal(off.statusCode, 200);
    assert.equal(off.payload.tavern.chronicle.equippedTitle, null);

    const saved = await fx.storage.getOrCreatePlayerState(fx.userId, pack.version);
    assert.deepEqual(saved.bardTavern?.served, [a]);
    assert.equal(saved.bardTavern?.activeBallad?.balladId, "forest_wander");
    assert.equal(saved.bardTavern?.balladsToday, 1);
    assert.deepEqual(saved.adventurerChronicle?.inscribed, ["slayer_saga"]);
    assert.equal(saved.adventurerChronicle?.equippedTitle, null);
    assert.equal(saved.inventory[order.dishId] || 0, (persisted.inventory[order.dishId] || 0) - 1, "one portion of the ordered dish served");
    assert.ok(getTavernVisitorsForDay(today).includes(b));
  });
});
