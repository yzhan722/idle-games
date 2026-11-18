import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { randomUUID } from "node:crypto";
import packJson from "../../shared/enhanced_content_pack_chinese.json";
import type { EnhancedContentPack, EnhancedPlayerState, WeatherId } from "./types";
import { createMemoryStorage } from "./storage_memory";
import { progressionRoutes } from "./routes/progression";
import { progression2Routes } from "./routes/progression2";
import { mapThrownError } from "./http_errors";
import {
  BEAST_BOND_TIERS,
  BEAST_FEED_MAX_QTY,
  BEAST_FOODS,
  BEAST_LEVEL_XP,
  BEAST_MAX_LEVEL,
  CONTRACT_BEASTS,
  WEATHER_DIVINE_DUST,
  WEATHER_HISTORY_DAYS,
  WEATHER_IDS,
  WEATHER_INSIGHT_TIERS,
  WEATHER_LIFE_SKILLS,
  WEATHER_TYPES,
  WEATHER_WISH_CHANCE_CAP,
  assignBeastCompanion,
  divineTomorrowWeather,
  doPrestige,
  ensureBeastRanch,
  ensureWeatherTower,
  feedContractBeast,
  getBeastLevel,
  getBeastRanchBonuses,
  getBeastStatsAtLevel,
  getBeastWeatherInfo,
  getNaturalWeather,
  getWeatherForDay,
  getWeatherTowerEffect,
  getWeatherWishChance,
  performReincarnation,
  rollWeatherWish,
  simulateArenaDuel,
  generateArenaChampion,
  getArenaSeasonIndex,
  tameContractBeast,
  weatherDayEndsAtMs,
  weatherDayIndex,
  weatherDayKey,
  weatherDayKeyFromIndex,
  wishTomorrowWeather,
} from "./progression2";
import { playerBuildExtras, startHpCombat } from "./hp_combat";
import { ensureCombatSkills } from "./combat_skills";
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
const T0_IDX = weatherDayIndex(T0);
const at = (dayIdx: number, hourUtc8 = 12) => new Date(dayIdx * DAY_MS + (hourUtc8 - 8) * 3_600_000);

/** 从 T0 起找第一个天然天候为 w 的东八区日。 */
function firstDayWith(w: WeatherId, from = T0_IDX): number {
  for (let d = from; d < from + 400; d++) if (getNaturalWeather(d) === w) return d;
  throw new Error(`no ${w} day`);
}

function withDust(state: EnhancedPlayerState, dust: number) {
  (state as any).caravanTrade = {
    caravanRep: 0,
    astralCrystalDust: dust,
    expressPermits: 0,
    ledgerRank: 0,
    totalRunsCompleted: 0,
    totalContractsFulfilled: 0,
    wagons: {},
  };
  return state;
}

function ranchState(beasts: Partial<Record<string, number>>, active: string | null = null): EnhancedPlayerState {
  const state = defaultEnhancedPlayerState(pack.version);
  const br = ensureBeastRanch(state);
  for (const [id, level] of Object.entries(beasts)) {
    (br.beasts as any)[id] = { xp: BEAST_LEVEL_XP[(level as number) - 1], fed: 0, tamedAt: T0.toISOString() };
  }
  br.activeBeastId = active as any;
  ensureBeastRanch(state);
  return state;
}

async function routeFixture(patch?: (state: EnhancedPlayerState) => void) {
  const storage = createMemoryStorage();
  const user = await storage.findOrCreateGuestUser(`wl14-ranch-${randomUUID()}`);
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

describe("WL-14 Contract Beast Ranch & Weather Divination Tower backend mechanics & routes", () => {
  it("loads old saves with safe defaults (no gifts, no weather) and sanitizes dirty ranch / tower data", () => {
    const legacy = defaultEnhancedPlayerState(pack.version);
    ensurePlayerExtensions(legacy);
    assert.equal(legacy.beastRanch, undefined, "ensurePlayerExtensions must not invent the ranch for old saves");
    assert.equal(legacy.weatherTower, undefined);
    const empty = getBeastRanchBonuses(legacy);
    assert.equal(empty.activeBeastId, null);
    assert.equal(empty.bondTier, 0);
    for (const k of ["gatherSpeedPct", "craftSpeedPct", "gatherEfficiencyPct", "craftEfficiencyPct", "xpGainPct", "goldGainPct", "bonusAtk", "bonusDef", "bonusHp"] as const) {
      assert.equal(empty[k], 0, k);
    }
    const fx = getWeatherTowerEffect(legacy, T0);
    assert.equal(fx.active, false, "old saves are not affected by the weather until they visit the tower");
    assert.deepEqual(fx.outputPct, {});

    const goldBefore = legacy.inventory.gold || 0;
    const info = getBeastWeatherInfo(legacy, pack, T0);
    assert.deepEqual(legacy.beastRanch?.beasts, {});
    assert.equal(legacy.beastRanch?.activeBeastId, null);
    assert.equal(legacy.weatherTower?.dayKey, "2026-07-10");
    assert.deepEqual(legacy.weatherTower?.forecasts, []);
    assert.equal(legacy.inventory.gold || 0, goldBefore, "opening the panel gifts nothing");
    assert.equal(info.ranch.beasts.length, CONTRACT_BEASTS.length);
    assert.equal(info.ranch.beasts.every((b) => !b.tamed && b.level === 0), true);
    assert.equal(info.weather.today.weather, getNaturalWeather(T0_IDX));
    assert.equal(info.weather.tomorrowKey, "2026-07-11");
    assert.equal(info.weather.canDivine, false, "no dust, no divination");
    assert.equal(info.weather.divineBlock, "星晶尘不足");
    assert.equal(info.weather.insight.wishChancePct, WEATHER_INSIGHT_TIERS[0].wishChancePct);
    assert.equal(getWeatherTowerEffect(legacy, T0).active, true, "after the first visit the daily weather applies");

    const dirty = defaultEnhancedPlayerState(pack.version);
    (dirty as any).beastRanch = {
      beasts: {
        bloom_bee: { xp: 999999, fed: 3, tamedAt: "nope" },
        echo_bat: "x",
        dragon: { xp: 10 },
        frostmane_wolf: { xp: -40, fed: -2 },
      },
      activeBeastId: "echo_bat",
      totalTamed: 1,
      totalFeedings: "lots",
      lastEvent: { kind: "feed", beastId: "dragon" },
    };
    (dirty as any).weatherTower = {
      dayKey: "2026-07-10",
      forecasts: [
        { dayKey: "2026-07-11", natural: "aurora", wish: "storm", chancePct: 300, granted: true, final: "aurora" },
        { dayKey: "2026-07-11", natural: "sunny" },
        { dayKey: "2026-07-09", natural: "rain" },
        { dayKey: "2026-07-30", natural: "rain" },
        { dayKey: "bad" },
      ],
      history: [{ dayKey: "2026-07-09", weather: "hail" }, { dayKey: "2026-07-12", weather: "rain" }, "x"],
      totalDivinations: -3,
      totalWishes: 5,
      wishesGranted: 9,
      dustSpent: "x",
    };
    ensurePlayerExtensions(dirty);
    const br = dirty.beastRanch!;
    assert.deepEqual(Object.keys(br.beasts).sort(), ["bloom_bee", "frostmane_wolf"]);
    assert.equal(br.beasts.bloom_bee!.xp, BEAST_LEVEL_XP[BEAST_MAX_LEVEL - 1], "xp is capped at the max level");
    assert.equal(getBeastLevel(br.beasts.bloom_bee!.xp), BEAST_MAX_LEVEL);
    assert.equal(br.beasts.frostmane_wolf!.xp, 0);
    assert.equal(br.activeBeastId, null, "the companion must be a tamed beast");
    assert.equal(br.totalTamed, 2);
    assert.equal(br.totalFeedings, 3);
    assert.equal(br.lastEvent, null);
    const wt = dirty.weatherTower!;
    assert.equal(wt.dayKey, "2026-07-10", "no-arg ensure never moves the tower day by the wall clock");
    assert.equal(wt.forecasts.length, 1, "only today / tomorrow forecasts survive, duplicates dropped");
    const f = wt.forecasts[0];
    assert.equal(f.dayKey, "2026-07-11");
    assert.equal(f.natural, getNaturalWeather(T0_IDX + 1), "the natural weather is always recomputed from the date");
    if (f.natural === "storm") {
      assert.equal(f.wish, null);
    } else {
      assert.equal(f.wish, "storm");
      assert.equal(f.chancePct, WEATHER_WISH_CHANCE_CAP);
      assert.equal(f.final, "storm");
    }
    assert.deepEqual(wt.history, [{ dayKey: "2026-07-09", weather: getNaturalWeather(T0_IDX - 1), wished: false }]);
    assert.equal(wt.totalDivinations, 0);
    assert.equal(wt.totalWishes, 0);
    assert.equal(wt.wishesGranted, 0);
    assert.equal(wt.dustSpent, 0);
  });

  it("generates deterministic UTC+8 daily weather with the configured weights and only rolls the tower day on an explicit now", () => {
    assert.equal(weatherDayKey(new Date("2026-11-18T15:59:59.999Z")), "2026-11-18");
    assert.equal(weatherDayKey(new Date("2026-11-18T16:00:00.000Z")), "2026-11-19", "midnight in UTC+8");
    assert.equal(new Date(weatherDayEndsAtMs(Date.parse("2026-11-18T03:00:00.000Z"))).toISOString(), "2026-11-18T16:00:00.000Z");
    assert.equal(weatherDayKeyFromIndex(weatherDayIndex(T0)), "2026-07-10");
    const counts: Record<string, number> = {};
    for (let d = T0_IDX; d < T0_IDX + 3650; d++) {
      const w = getNaturalWeather(d);
      assert.equal(getNaturalWeather(d), w, "same day, same weather");
      counts[w] = (counts[w] || 0) + 1;
    }
    for (const w of WEATHER_TYPES) {
      const share = (counts[w.id] || 0) / 3650;
      assert.ok(Math.abs(share - w.weight / 100) < 0.03, `${w.id} share ${share} vs weight ${w.weight}`);
    }
    // every life skill benefits from at least one weather; aurora lifts all of them
    for (const s of WEATHER_LIFE_SKILLS) {
      assert.ok(WEATHER_TYPES.some((w) => w.id !== "aurora" && (w.outputPct[s.skillId] || 0) > 0), `${s.skillId} has a favourable weather`);
      assert.ok((WEATHER_TYPES.find((w) => w.id === "aurora")!.outputPct[s.skillId] || 0) > 0);
    }

    const state = withDust(defaultEnhancedPlayerState(pack.version), 200);
    ensureWeatherTower(state, at(T0_IDX));
    divineTomorrowWeather(state, at(T0_IDX));
    const wt = state.weatherTower!;
    ensureWeatherTower(state);
    ensurePlayerExtensions(state);
    assert.equal(wt.dayKey, weatherDayKeyFromIndex(T0_IDX), "no-arg ensure only sanitizes");
    assert.equal(wt.forecasts.length, 1);
    // explicit next day: yesterday is archived, the divined forecast now drives today's weather
    const tomorrowFinal = wt.forecasts[0].final;
    ensureWeatherTower(state, at(T0_IDX + 1, 9));
    assert.equal(wt.dayKey, weatherDayKeyFromIndex(T0_IDX + 1));
    assert.deepEqual(wt.history, [{ dayKey: weatherDayKeyFromIndex(T0_IDX), weather: getNaturalWeather(T0_IDX), wished: false }]);
    assert.equal(getWeatherForDay(wt.dayKey, wt), tomorrowFinal);
    // clock rollback never rewinds
    ensureWeatherTower(state, at(T0_IDX - 3));
    assert.equal(wt.dayKey, weatherDayKeyFromIndex(T0_IDX + 1));
    // a long absence archives at most 7 days and drops the stale forecast
    ensureWeatherTower(state, at(T0_IDX + 20));
    assert.equal(wt.dayKey, weatherDayKeyFromIndex(T0_IDX + 20));
    assert.equal(wt.forecasts.length, 0);
    assert.equal(wt.history.length, WEATHER_HISTORY_DAYS);
    assert.equal(wt.history[wt.history.length - 1].dayKey, weatherDayKeyFromIndex(T0_IDX + 19));
  });

  it("divines tomorrow for dust once per day and wishes with an insight-based, capped, deterministic chance", () => {
    const state = withDust(defaultEnhancedPlayerState(pack.version), 100);
    const now = at(T0_IDX);
    const tomorrowKey = weatherDayKeyFromIndex(T0_IDX + 1);
    assert.equal(wishTomorrowWeather(state, "sunny", now).ok, false, "a wish needs a divination first");
    assert.equal(divineTomorrowWeather(state, now, "2026-01-01").ok, false, "stale client day is rejected");
    assert.equal(state.caravanTrade!.astralCrystalDust, 100);
    const d = divineTomorrowWeather(state, now, tomorrowKey);
    assert.equal(d.ok, true, d.reason);
    assert.equal(d.natural, getNaturalWeather(T0_IDX + 1));
    assert.equal(state.caravanTrade!.astralCrystalDust, 100 - WEATHER_DIVINE_DUST);
    assert.equal(state.weatherTower!.totalDivinations, 1);
    const again = divineTomorrowWeather(state, now);
    assert.equal(again.ok, false, "one divination per day");
    assert.equal(state.caravanTrade!.astralCrystalDust, 100 - WEATHER_DIVINE_DUST, "rejection does not spend dust");

    const natural = d.natural!;
    assert.equal(wishTomorrowWeather(state, natural, now).ok, false, "wishing for the natural weather is pointless");
    const target: WeatherId = natural === "sunny" ? "rain" : "sunny";
    const chance = getWeatherWishChance(1, target);
    assert.equal(chance, WEATHER_INSIGHT_TIERS[0].wishChancePct);
    const w = wishTomorrowWeather(state, target, now, tomorrowKey);
    assert.equal(w.ok, true, w.reason);
    assert.equal(w.chancePct, chance);
    assert.equal(w.granted, rollWeatherWish(T0_IDX + 1, target, chance), "the server uses the shared deterministic roll");
    assert.equal(w.final, w.granted ? target : natural);
    assert.equal(getWeatherForDay(tomorrowKey, state.weatherTower), w.final);
    const spent = WEATHER_DIVINE_DUST + WEATHER_TYPES.find((x) => x.id === target)!.wishDust;
    assert.equal(state.caravanTrade!.astralCrystalDust, 100 - spent);
    assert.equal(state.weatherTower!.dustSpent, spent);
    assert.equal(wishTomorrowWeather(state, "fog", now).ok, false, "one wish per day");

    // insight raises the chance, the cap holds and aurora is halved
    assert.equal(getWeatherWishChance(0, "rain"), 30);
    assert.equal(getWeatherWishChance(8, "rain"), 42);
    assert.equal(getWeatherWishChance(999, "rain"), WEATHER_WISH_CHANCE_CAP);
    assert.equal(getWeatherWishChance(999, "aurora"), Math.floor(WEATHER_WISH_CHANCE_CAP / 2));
    let granted = 0;
    for (let day = T0_IDX; day < T0_IDX + 2000; day++) if (rollWeatherWish(day, "storm", 42)) granted += 1;
    assert.ok(Math.abs(granted / 2000 - 0.42) < 0.04, `granted share ${granted / 2000}`);
    assert.equal(rollWeatherWish(T0_IDX, "storm", 0), false);
    assert.equal(rollWeatherWish(T0_IDX, "bogus" as any, 55), false);

    // both outcomes really happen: find a granted and a missed day for the same wish
    let seenGrant = false;
    let seenMiss = false;
    for (let day = T0_IDX; day < T0_IDX + 60 && !(seenGrant && seenMiss); day++) {
      const s = withDust(defaultEnhancedPlayerState(pack.version), 50);
      const nat = getNaturalWeather(day + 1);
      const wish: WeatherId = nat === "storm" ? "fog" : "storm";
      divineTomorrowWeather(s, at(day));
      const r = wishTomorrowWeather(s, wish, at(day));
      assert.equal(r.ok, true, r.reason);
      if (r.granted) seenGrant = true;
      else seenMiss = true;
    }
    assert.ok(seenGrant && seenMiss);

    const broke = withDust(defaultEnhancedPlayerState(pack.version), WEATHER_DIVINE_DUST);
    assert.equal(divineTomorrowWeather(broke, now).ok, true);
    const nat2 = broke.weatherTower!.forecasts[0].natural;
    const res = wishTomorrowWeather(broke, nat2 === "aurora" ? "sunny" : "aurora", now);
    assert.equal(res.ok, false, "not enough dust for the wish");
    assert.equal(broke.weatherTower!.forecasts[0].wish, null);
  });

  it("feeds the day's weather into real getActionRates efficiency (only for its life skills, only after visiting the tower) and the simulator", () => {
    const rainDay = firstDayWith("rain");
    const sunnyDay = firstDayWith("sunny");
    const find = (id: string) => (pack.actions as any[]).find((a) => a.id === id);
    const fish = find("act_fish_river_t1");
    const chop = find("act_chop_wood_t1");
    const smith = find("act_smelt_ingot_t1");
    const base = defaultEnhancedPlayerState(pack.version);
    const tower = defaultEnhancedPlayerState(pack.version);
    ensureWeatherTower(tower, at(rainDay));
    const rain = WEATHER_TYPES.find((w) => w.id === "rain")!;
    const r0 = getActionRates(base, pack, fish, at(rainDay));
    const r1 = getActionRates(tower, pack, fish, at(rainDay));
    assert.equal(r1.efficiencyPct - r0.efficiencyPct, rain.outputPct.skill_chef, "rain: fishing +14% output");
    assert.ok(r1.efficiencySources.some((s) => s.label === "天候 · 绵绵细雨" && s.pct === rain.outputPct.skill_chef));
    assert.equal(getActionRates(tower, pack, smith, at(rainDay)).efficiencyPct, getActionRates(base, pack, smith, at(rainDay)).efficiencyPct, "rain does nothing for smithing");
    const sunny = WEATHER_TYPES.find((w) => w.id === "sunny")!;
    assert.equal(
      getActionRates(tower, pack, chop, at(sunnyDay)).efficiencyPct - getActionRates(base, pack, chop, at(sunnyDay)).efficiencyPct,
      sunny.outputPct.skill_woodcutter
    );
    // a granted wish overrides the natural weather of that day
    const wished = defaultEnhancedPlayerState(pack.version);
    const wt = ensureWeatherTower(wished, at(rainDay - 1));
    wt.forecasts = [
      { dayKey: weatherDayKeyFromIndex(rainDay), natural: "rain", wish: "storm", chancePct: 30, granted: true, final: "storm", at: T0.toISOString() },
    ];
    ensureWeatherTower(wished);
    assert.equal(getWeatherTowerEffect(wished, at(rainDay)).weather, "storm");
    assert.equal(getActionRates(wished, pack, fish, at(rainDay)).efficiencyPct, r0.efficiencyPct, "storm brings no fishing bonus");

    // real simulator: an hour of fishing on a rain day yields more fish with the tower than without
    const sBase = defaultEnhancedPlayerState(pack.version);
    const sTower = defaultEnhancedPlayerState(pack.version);
    ensureWeatherTower(sTower, at(rainDay, 9));
    for (const s of [sBase, sTower]) {
      s.lastSimulatedAt = at(rainDay, 9).toISOString();
      startLifeActionNow(s, pack, "act_fish_river_t1", undefined, at(rainDay, 9));
    }
    const later = at(rainDay, 10);
    let seed = 7;
    const rng = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const oBase = simulateToNow({ state: sBase, contentPack: pack, now: later, rng });
    seed = 7;
    const oTower = simulateToNow({ state: sTower, contentPack: pack, now: later, rng });
    assert.ok((oTower.state.inventory.fish_river || 0) > (oBase.state.inventory.fish_river || 0));
  });

  it("tames beasts with real boss drops + cooked food + gold, rejecting without mutation, and reserves equipped copies", () => {
    const state = defaultEnhancedPlayerState(pack.version);
    const bee = CONTRACT_BEASTS.find((b) => b.id === "bloom_bee")!;
    const toad = CONTRACT_BEASTS.find((b) => b.id === "mire_toad")!;
    state.inventory.gold = 0;
    state.inventory.mirror_protection = 1;
    state.inventory.food_simple = 10;
    const noGold = tameContractBeast(state, pack, "bloom_bee", T0);
    assert.equal(noGold.ok, false);
    assert.equal(state.inventory.mirror_protection, 1, "rejection consumes nothing");
    state.inventory.gold = bee.tameGold + 50;
    state.inventory.food_simple = 9;
    assert.equal(tameContractBeast(state, pack, "bloom_bee", T0).ok, false, "one simple meal short");
    state.inventory.food_simple = 12;
    const ok = tameContractBeast(state, pack, "bloom_bee", T0);
    assert.equal(ok.ok, true, ok.reason);
    assert.equal(ok.autoAssigned, true, "the first beast becomes the companion");
    assert.equal(state.inventory.mirror_protection, undefined);
    assert.equal(state.inventory.food_simple, 2);
    assert.equal(state.inventory.gold, 50);
    assert.equal(state.beastRanch!.activeBeastId, "bloom_bee");
    assert.equal(getBeastLevel(state.beastRanch!.beasts.bloom_bee!.xp), 1);
    assert.equal(tameContractBeast(state, pack, "bloom_bee", T0).ok, false, "already in the ranch");
    assert.equal(tameContractBeast(state, pack, "bogus" as any, T0).ok, false);

    // the swamp crown is an accessory: an equipped copy is never consumed
    state.inventory.gold = 99999;
    state.inventory.swamp_crown = 1;
    (state.equipment as any).accessory = "swamp_crown";
    state.inventory.food_hearty_stew = 8;
    const blocked = tameContractBeast(state, pack, "mire_toad", T0);
    assert.equal(blocked.ok, false);
    assert.match(blocked.reason!, /当前可用 0/);
    state.inventory.swamp_crown = 2;
    const toadRes = tameContractBeast(state, pack, "mire_toad", T0);
    assert.equal(toadRes.ok, true, toadRes.reason);
    assert.equal(toadRes.autoAssigned, false, "an existing companion stays out");
    assert.equal(state.inventory.swamp_crown, 1);
    assert.equal(state.inventory.food_hearty_stew, undefined);
    assert.equal(state.inventory.gold, 99999 - toad.tameGold);
    assert.equal(state.beastRanch!.totalTamed, 2);

    // every beast's tame recipe is real: the boss drops it, the food is a cooking product
    const cooking = new Set(
      (pack.actions as any[]).filter((a) => a.skillId === "skill_cooking").flatMap((a) => (a.yields || []).map((y: any) => y.itemId))
    );
    for (const b of CONTRACT_BEASTS) {
      const boss = (pack.monsters as any[]).find((m) => m.id === b.bossId);
      assert.ok(boss?.isBoss, `${b.id}: ${b.bossId} is a real boss`);
      const items = pack.items as Array<{ id: string; name?: string }>;
      const bossDrops = new Set<string>((boss.drops || []).map((x: any) => x.itemId));
      const rare = items.find((i) => i.id === boss.rare || i.name === boss.rare);
      if (rare) bossDrops.add(rare.id);
      const ids = Object.keys(b.tameItems);
      assert.ok(ids.some((id) => bossDrops.has(id)), `${b.id} needs a real ${b.bossId} drop`);
      for (const id of ids) assert.ok(bossDrops.has(id) || cooking.has(id), `${b.id}: ${id} must be a boss drop or a cooked food`);
      assert.ok(cooking.has(b.favoriteFood), `${b.id}: favourite food ${b.favoriteFood} is cooked`);
    }
    for (const f of BEAST_FOODS) assert.ok(cooking.has(f.itemId), `${f.itemId} is a cooking product`);
  });

  it("feeds cooked food for xp (favourite ×1.5), only spends what reaching max needs, and switches / recalls the companion", () => {
    const state = ranchState({ bloom_bee: 1, frostmane_wolf: 1 }, "frostmane_wolf");
    state.inventory.food_simple = 3;
    state.inventory.food_honey_cake = 200;
    assert.equal(feedContractBeast(state, pack, "echo_bat", "food_simple", 1, T0).ok, false, "not tamed");
    assert.equal(feedContractBeast(state, pack, "bloom_bee", "wood_1", 1, T0).ok, false, "not a food");
    assert.equal(feedContractBeast(state, pack, "bloom_bee", "food_simple", 4, T0).ok, false, "only 3 in the bag");
    assert.equal(feedContractBeast(state, pack, "bloom_bee", "food_simple", BEAST_FEED_MAX_QTY + 1, T0).ok, false);
    assert.equal(state.inventory.food_simple, 3);

    const plain = feedContractBeast(state, pack, "bloom_bee", "food_simple", 3, T0);
    assert.equal(plain.ok, true, plain.reason);
    assert.equal(plain.xpGained, 3 * 8);
    assert.equal(plain.favorite, false);
    assert.equal(state.inventory.food_simple, undefined);

    const fav = feedContractBeast(state, pack, "bloom_bee", "food_honey_cake", 2, T0);
    assert.equal(fav.favorite, true);
    assert.equal(fav.xpGained, 2 * Math.floor((42 * 150) / 100), "favourite food ×1.5");
    assert.equal(fav.levelAfter, getBeastLevel(24 + 126));
    // overfeeding: ask for 50, only the cakes needed for Lv.10 are eaten
    let cakes = state.inventory.food_honey_cake;
    let fed = 0;
    while (getBeastLevel(state.beastRanch!.beasts.bloom_bee!.xp) < BEAST_MAX_LEVEL) {
      const r = feedContractBeast(state, pack, "bloom_bee", "food_honey_cake", BEAST_FEED_MAX_QTY, T0);
      assert.equal(r.ok, true, r.reason);
      fed += r.qtyUsed!;
    }
    assert.equal(state.beastRanch!.beasts.bloom_bee!.xp, BEAST_LEVEL_XP[BEAST_MAX_LEVEL - 1]);
    assert.equal(cakes - state.inventory.food_honey_cake, fed);
    assert.ok(fed < 60, `${fed} cakes are enough for Lv.10`);
    cakes = state.inventory.food_honey_cake;
    assert.equal(feedContractBeast(state, pack, "bloom_bee", "food_honey_cake", 1, T0).ok, false, "max level");
    assert.equal(state.inventory.food_honey_cake, cakes);

    assert.equal(assignBeastCompanion(state, "frostmane_wolf", T0).ok, false, "already out");
    assert.equal(assignBeastCompanion(state, "echo_bat", T0).ok, false, "not tamed");
    assert.equal(assignBeastCompanion(state, "bloom_bee", T0).ok, true);
    assert.equal(state.beastRanch!.activeBeastId, "bloom_bee");
    assert.equal(assignBeastCompanion(state, null, T0).ok, true);
    assert.equal(state.beastRanch!.activeBeastId, null);
    assert.equal(assignBeastCompanion(state, null, T0).ok, false);
  });

  it("wires the active companion and the ranch bond into real production / combat formulas (and the arena sandbox)", () => {
    const find = (id: string) => (pack.actions as any[]).find((a) => a.id === id);
    const chop = find("act_chop_wood_t1");
    const plank = find("act_craft_lumber_t1");
    const fight = (pack.actions as any[]).find((a) => String(a.id).startsWith("act_combat_"));
    const base = defaultEnhancedPlayerState(pack.version);
    // bat Lv.10 out + wolf Lv.2 → 12 levels → bond tier 2 (gold +1%, xp +1%)
    const gatherer = ranchState({ echo_bat: 10, frostmane_wolf: 2 }, "echo_bat");
    const b = getBeastRanchBonuses(gatherer);
    assert.equal(b.bondLevels, 12);
    assert.equal(b.bondTier, 2);
    assert.deepEqual(b.activeStats, getBeastStatsAtLevel("echo_bat", 10));
    assert.deepEqual(getBeastStatsAtLevel("echo_bat", 10), { gatherSpeedPct: 12, gatherEfficiencyPct: 8, xpGainPct: 3 });
    const g0 = getActionRates(base, pack, chop, T0);
    const g1 = getActionRates(gatherer, pack, chop, T0);
    assert.ok(Math.abs(g1.speedMul / g0.speedMul - 1.12) < 1e-9, "gather speed +12%");
    assert.ok(g1.speedSources.some((s) => s.label === "契约魔兽牧场" && s.pct === 12));
    assert.equal(g1.efficiencyPct - g0.efficiencyPct, 8);
    assert.ok(Math.abs(g1.xpMul / g0.xpMul - 1.04) < 1e-9, "xp +3% companion +1% bond");
    assert.ok(Math.abs(g1.goldMul / g0.goldMul - 1.01) < 1e-9, "gold +1% bond");
    const c1 = getActionRates(gatherer, pack, plank, T0);
    const c0 = getActionRates(base, pack, plank, T0);
    assert.equal(c1.speedMul, c0.speedMul, "a gathering companion does not speed up crafting");
    assert.equal(c1.efficiencyPct, c0.efficiencyPct);
    assert.equal(getActionRates(gatherer, pack, fight, T0).speedMul, getActionRates(base, pack, fight, T0).speedMul, "combat speed untouched");

    const crafter = ranchState({ ember_hound: 5 }, "ember_hound");
    const hound5 = getBeastStatsAtLevel("ember_hound", 5);
    assert.ok(Math.abs(getActionRates(crafter, pack, plank, T0).speedMul / c0.speedMul - (1 + hound5.craftSpeedPct! / 100)) < 1e-9);
    assert.equal(getActionRates(crafter, pack, plank, T0).efficiencyPct - c0.efficiencyPct, hound5.craftEfficiencyPct);

    // combat companion: flat atk / def / hp + gold through playerBuildExtras → real HP combat
    const fighterState = ranchState({ chrono_wyrm: 10, bloom_bee: 1 }, "chrono_wyrm");
    const wyrm = getBeastStatsAtLevel("chrono_wyrm", 10);
    const e0 = playerBuildExtras(base);
    const e1 = playerBuildExtras(fighterState);
    assert.equal(e1.atk - e0.atk, wyrm.bonusAtk);
    assert.equal(e1.def - e0.def, wyrm.bonusDef);
    assert.equal(e1.hp - e0.hp, wyrm.bonusHp);
    assert.ok(Math.abs(e1.goldMult / e0.goldMult - 1.05 * 1.01) < 1e-3, "wyrm +5% gold, bond +1%");
    const monster = (pack.monsters as any[]).find((m) => m.id === "slime");
    const fightPack = {
      ...pack,
      actions: (pack.actions as any[]).map((x: any) => (String(x.id).startsWith("act_combat_") ? { ...x, requirements: {} } : x)),
    } as EnhancedContentPack;
    const hp0 = startHpCombat(defaultEnhancedPlayerState(pack.version), fightPack, monster.id, T0).playerMaxHp;
    const hp1 = startHpCombat(ranchState({ chrono_wyrm: 10, bloom_bee: 1 }, "chrono_wyrm"), fightPack, monster.id, T0).playerMaxHp;
    assert.equal(hp1 - hp0, wyrm.bonusHp);
    // the WL-13 arena sandbox copies the save, so the combat companion fights there too
    const champ = generateArenaChampion(getArenaSeasonIndex(T0), 3);
    const duel0 = simulateArenaDuel(defaultEnhancedPlayerState(pack.version), pack, champ, T0);
    const duel1 = simulateArenaDuel(ranchState({ chrono_wyrm: 10 }, "chrono_wyrm"), pack, champ, T0);
    assert.equal(duel1.playerMaxHp - duel0.playerMaxHp, wyrm.bonusHp);
    assert.equal(duel1.player.atk - duel0.player.atk > 0, true);
    // benched beasts only contribute through the bond
    const benched = ranchState({ chrono_wyrm: 10 }, null);
    const bb = getBeastRanchBonuses(benched);
    assert.equal(bb.bonusAtk, 0);
    assert.equal(bb.bondTier, BEAST_BOND_TIERS.filter((t) => t.minLevels <= 10).length - 1);
  });

  it("keeps the whole ranch and the tower (insight, forecasts) through doPrestige and performReincarnation", () => {
    const state = withDust(ranchState({ bloom_bee: 4, frostmane_wolf: 6 }, "frostmane_wolf"), 80);
    ensureWeatherTower(state, at(T0_IDX));
    divineTomorrowWeather(state, at(T0_IDX));
    state.combatLevel = 60;
    state.skills.woodcutting = { level: 55, xp: 0 } as any;
    const snapBr = structuredClone(state.beastRanch);
    const snapWt = structuredClone(state.weatherTower);
    const bonus = getBeastRanchBonuses(state);
    assert.equal(doPrestige(state).ok, true);
    assert.deepEqual(state.beastRanch, snapBr);
    assert.deepEqual(state.weatherTower, snapWt);
    state.combatLevel = 60;
    state.skills.woodcutting = { level: 55, xp: 0 } as any;
    assert.equal(performReincarnation(state).ok, true);
    assert.deepEqual(state.beastRanch, snapBr);
    assert.deepEqual(state.weatherTower, snapWt);
    assert.deepEqual(getBeastRanchBonuses(state), bonus);
  });

  it("exposes GET /progression2/ranch and POST ranch/* + weather/* with auth guard, strict zod schemas, server-side checks and stateRevision 409", async () => {
    const fx = await routeFixture((s) => {
      s.inventory.gold = 5000;
      s.inventory.mirror_protection = 1;
      s.inventory.food_simple = 20;
      withDust(s, 40);
    });
    for (const [path, body] of [
      ["/progression2/ranch/tame", { beastId: "bloom_bee" }],
      ["/progression2/ranch/feed", { beastId: "bloom_bee", foodId: "food_simple", qty: 1 }],
      ["/progression2/ranch/companion", { beastId: null }],
      ["/progression2/weather/divine", {}],
      ["/progression2/weather/wish", { weather: "sunny" }],
    ] as const) {
      assert.equal((await fx.invoke("POST", path, body as any, null)).statusCode, 401, path);
    }
    assert.equal((await fx.invoke("GET", "/progression2/ranch", undefined, null)).statusCode, 401);

    const initial = await fx.invoke("GET", "/progression2/ranch");
    assert.equal(initial.statusCode, 200);
    assert.equal(initial.payload.ranch.beasts.length, CONTRACT_BEASTS.length);
    assert.equal(initial.payload.ranch.beasts.find((b: any) => b.id === "bloom_bee").tame.canTame, true);
    assert.equal(initial.payload.weather.dust, 40);
    assert.equal(initial.payload.weather.canDivine, true);
    assert.equal(initial.payload.weather.types.length, WEATHER_IDS.length);
    const rev0 = initial.payload.stateRevision;
    const persisted = await fx.storage.getOrCreatePlayerState(fx.userId, pack.version);
    assert.ok(persisted.beastRanch && persisted.weatherTower, "first GET persists both new states");

    const bad = [
      ["/progression2/ranch/tame", { beastId: "dragon" }],
      ["/progression2/ranch/tame", { beastId: "bloom_bee", gold: 0 }],
      ["/progression2/ranch/feed", { beastId: "bloom_bee", foodId: "wood_1", qty: 1 }],
      ["/progression2/ranch/feed", { beastId: "bloom_bee", foodId: "food_simple", qty: 0 }],
      ["/progression2/ranch/feed", { beastId: "bloom_bee", foodId: "food_simple", qty: BEAST_FEED_MAX_QTY + 1 }],
      ["/progression2/ranch/companion", { beastId: "dragon" }],
      ["/progression2/weather/divine", { dayKey: "tomorrow" }],
      ["/progression2/weather/wish", { weather: "hail" }],
      ["/progression2/weather/wish", { weather: "sunny", force: true }],
    ] as const;
    for (const [path, body] of bad) {
      const r = await fx.invoke("POST", path, body as any);
      assert.ok(r.statusCode >= 400 && r.statusCode < 500, `${path} ${JSON.stringify(body)} → ${r.statusCode}`);
    }
    const notTamed = await fx.invoke("POST", "/progression2/ranch/feed", { beastId: "bloom_bee", foodId: "food_simple", qty: 1 });
    assert.equal(notTamed.statusCode, 400, "server rejects feeding an untamed beast");
    const noDivination = await fx.invoke("POST", "/progression2/weather/wish", { weather: "sunny" });
    assert.equal(noDivination.statusCode, 400);
    const noBat = await fx.invoke("POST", "/progression2/ranch/tame", { beastId: "echo_bat" });
    assert.equal(noBat.statusCode, 400, "server checks the boss drop");

    const latest = await fx.storage.getOrCreatePlayerState(fx.userId, pack.version);
    const tame = await fx.invoke("POST", "/progression2/ranch/tame", { beastId: "bloom_bee", expectedRevision: latest.stateRevision });
    assert.equal(tame.statusCode, 200);
    assert.equal(tame.payload.tame.autoAssigned, true);
    assert.equal(tame.payload.ranch.ranch.activeBeastId, "bloom_bee");
    assert.equal(tame.payload.inventory.mirror_protection, undefined);
    const rev1 = tame.payload.stateRevision;
    assert.ok(rev1 > rev0);

    const stale = await fx.invoke("POST", "/progression2/ranch/feed", { beastId: "bloom_bee", foodId: "food_simple", qty: 2, expectedRevision: rev0 });
    assert.equal(stale.statusCode, 409);
    const feed = await fx.invoke("POST", "/progression2/ranch/feed", { beastId: "bloom_bee", foodId: "food_simple", qty: 2, expectedRevision: rev1 });
    assert.equal(feed.statusCode, 200);
    assert.equal(feed.payload.feed.xpGained, 16);
    const recall = await fx.invoke("POST", "/progression2/ranch/companion", { beastId: null });
    assert.equal(recall.statusCode, 200);
    assert.equal(recall.payload.ranch.ranch.activeBeastId, null);

    const tomorrowKey = initial.payload.weather.tomorrowKey;
    const divine = await fx.invoke("POST", "/progression2/weather/divine", { dayKey: tomorrowKey });
    assert.equal(divine.statusCode, 200);
    assert.equal(divine.payload.divination.dayKey, tomorrowKey);
    assert.equal(divine.payload.ranch.weather.tomorrow.divined, true);
    assert.equal(divine.payload.ranch.weather.dust, 40 - WEATHER_DIVINE_DUST);
    const twice = await fx.invoke("POST", "/progression2/weather/divine", {});
    assert.equal(twice.statusCode, 400, "one divination per day, enforced server-side");
    const natural = divine.payload.divination.natural as WeatherId;
    const target: WeatherId = natural === "fog" ? "rain" : "fog";
    const wish = await fx.invoke("POST", "/progression2/weather/wish", { weather: target, dayKey: tomorrowKey });
    assert.equal(wish.statusCode, 200);
    assert.equal(typeof wish.payload.wish.granted, "boolean");
    assert.equal(wish.payload.ranch.weather.tomorrow.wish, target);

    const saved = await fx.storage.getOrCreatePlayerState(fx.userId, pack.version);
    assert.equal(saved.beastRanch?.beasts.bloom_bee?.xp, 16);
    assert.equal(saved.beastRanch?.activeBeastId, null);
    assert.equal(saved.weatherTower?.totalDivinations, 1);
    assert.equal(saved.weatherTower?.forecasts.find((f) => f.dayKey === tomorrowKey)?.wish, target);
    assert.equal(saved.inventory.food_simple, 20 - 10 - 2, "10 simple meals for the bee contract, 2 fed");
  });
});
