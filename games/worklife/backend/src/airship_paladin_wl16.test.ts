import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import packJson from "../../shared/enhanced_content_pack_chinese.json";
import type { EnhancedContentPack, EnhancedPlayerState } from "./types";
import { createMemoryStorage } from "./storage_memory";
import { progressionRoutes } from "./routes/progression";
import { progression2Routes } from "./routes/progression2";
import { mapThrownError } from "./http_errors";
import { ensureCombatSkills } from "./combat_skills";
import {
  AIRSHIP_DAILY_STOCK,
  AIRSHIP_HULLS,
  AIRSHIP_ROUTES,
  AIRSHIP_TOWNS,
  PALADIN_BONUS_CAPS,
  PALADIN_FULL_CLEAR_BONUS,
  PALADIN_STAGES,
  PALADIN_VIRTUE_COSTS,
  PALADIN_WEEKLY_ATTEMPTS,
  airshipDayIndex,
  airshipDayKey,
  airshipDayKeyFromIndex,
  buyAirshipCargo,
  challengePaladinTrial,
  doPrestige,
  ensureAirshipTrade,
  ensurePaladinTrial,
  generatePaladinOpponent,
  getAirshipBuyQuote,
  getAirshipPaladinInfo,
  getAirshipRouteLevel,
  getAirshipSellQuote,
  getAirshipVoyageMs,
  getPaladinTrialBonuses,
  launchAirshipVoyage,
  openAirshipRoute,
  paladinWeekIndex,
  paladinWeekKey,
  paladinWeekKeyFromIndex,
  performReincarnation,
  sellAirshipCargo,
  simulatePaladinTrialDuel,
  upgradeAirshipHull,
  upgradePaladinVirtue,
} from "./progression2";
import { playerBuildExtras, startHpCombat } from "./hp_combat";
import { defaultEnhancedPlayerState, ensurePlayerExtensions, getActionRates } from "./storage";

const pack = packJson as EnhancedContentPack;
/** 历史时刻：2026 年 7 月 8 日周三（东八区 17:00），与墙钟日期不同，确保「无参 ensure 不按墙钟推进」的断言有意义。 */
const T0 = new Date("2026-07-08T09:00:00.000Z");
const DAY_MS = 86_400_000;
const T0_DAY = airshipDayIndex(T0);
const at = (dayIdx: number, hourUtc8 = 12, minute = 0) => new Date(dayIdx * DAY_MS + (hourUtc8 - 8) * 3_600_000 + minute * 60_000);
const snap = (s: EnhancedPlayerState) => JSON.stringify([s.inventory, s.airshipTrade ?? null, s.paladinTrial ?? null]);

/** 练过战斗技能的钢斧战士（能稳过第 1 关、打不过终关）。 */
function fighter(level = 40) {
  const s = defaultEnhancedPlayerState(pack.version);
  s.inventory.weapon_steel_axe = 1;
  (s.equipment as any).main_hand = "weapon_steel_axe";
  const cs = ensureCombatSkills(s);
  for (const k of ["stamina", "attack", "defense", "melee"] as const) (cs as any)[k].level = level;
  ensureCombatSkills(s);
  return s;
}

async function routeFixture(patch?: (state: EnhancedPlayerState) => void) {
  const storage = createMemoryStorage();
  const user = await storage.findOrCreateGuestUser(`wl16-airship-${randomUUID()}`);
  const initial = await storage.getOrCreatePlayerState(user.id, pack.version);
  patch?.(initial);
  await storage.savePlayerState(user.id, initial);

  const handlers = new Map<string, any>();
  const app = {
    get(p: string, fn: any) {
      handlers.set(`GET ${p}`, fn);
    },
    post(p: string, fn: any) {
      handlers.set(`POST ${p}`, fn);
    },
    delete(p: string, fn: any) {
      handlers.set(`DELETE ${p}`, fn);
    },
  };
  await progressionRoutes(app as any, storage, pack);
  await progression2Routes(app as any, storage, pack);

  async function invoke(method: "GET" | "POST", p: string, body?: Record<string, unknown>, overrideUserId?: string | null) {
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
      const handler = handlers.get(`${method} ${p}`);
      assert.ok(handler, `Missing route handler: ${method} ${p}`);
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

describe("WL-16 Airship Trade & Paladin Trial backend mechanics & routes", () => {
  it("loads old saves with safe defaults (no gifts, no bonus) and sanitizes dirty airship / trial data", () => {
    const old = defaultEnhancedPlayerState(pack.version);
    ensurePlayerExtensions(old);
    assert.equal(old.airshipTrade, undefined, "old saves are not touched until the panel opens");
    assert.equal(old.paladinTrial, undefined);
    const base = playerBuildExtras(old);

    const fresh = defaultEnhancedPlayerState(pack.version);
    const at0 = ensureAirshipTrade(fresh, T0);
    assert.equal(at0.location, "guild_town");
    assert.equal(at0.hullLevel, 1);
    assert.deepEqual(at0.routes, {});
    assert.deepEqual(at0.cargo, {});
    assert.equal(at0.dayKey, airshipDayKey(T0));
    const pt0 = ensurePaladinTrial(fresh, T0);
    assert.equal(pt0.weekKey, paladinWeekKey(T0));
    assert.equal(pt0.medals, 0);
    assert.deepEqual(pt0.virtues, { valor: 0, aegis: 0, vigor: 0, glory: 0 });
    assert.deepEqual(playerBuildExtras(fresh), base, "joining the order grants nothing by itself");

    // no-arg ensure never reads the wall clock: invalid keys fall back to the epoch, not to today
    const blank = defaultEnhancedPlayerState(pack.version);
    assert.equal(ensureAirshipTrade(blank).dayKey, "1970-01-01");
    assert.equal(ensurePaladinTrial(blank).weekKey, "1970-01-05");

    const dirty = defaultEnhancedPlayerState(pack.version);
    (dirty as any).airshipTrade = {
      dayKey: "nope",
      location: "atlantis",
      voyage: { routeId: "guild_frostport", from: "guild_town", departedAt: T0.toISOString(), arrivesAt: "2099-01-01T00:00:00.000Z" },
      arrivedVia: "moon_route",
      hullLevel: 99,
      routes: { guild_frostport: { xp: -5, voyages: "x" }, moon_route: { xp: 9 }, guild_starfall: "x" },
      cargo: { fish_deepsea: 50, obsidian_chunk: 50, gem: 9, snow_pelt: -1 },
      cargoCost: { fish_deepsea: 900, gem: 5 },
      boughtToday: { fish_deepsea: 99, cheese_wheel: 3 },
      totalProfit: "lots",
      lastSale: { goodId: "gem" },
    };
    const d = ensureAirshipTrade(dirty);
    assert.equal(d.hullLevel, 5, "hull clamps to the top level");
    assert.deepEqual(Object.keys(d.routes), ["guild_frostport"]);
    assert.deepEqual(d.routes.guild_frostport, { xp: 0, voyages: 0, openedAt: new Date(0).toISOString() });
    assert.deepEqual(d.cargo, { fish_deepsea: 50, obsidian_chunk: 26 }, "cargo trimmed to the 76-slot hull in table order");
    assert.deepEqual(d.cargoCost, { fish_deepsea: 900 });
    assert.deepEqual(d.boughtToday, { fish_deepsea: AIRSHIP_DAILY_STOCK, cheese_wheel: 3 });
    assert.ok(d.voyage);
    assert.equal(d.voyage!.to, "frostport");
    assert.equal(Date.parse(d.voyage!.arrivesAt) - Date.parse(d.voyage!.departedAt), getAirshipVoyageMs("guild_frostport", 0, 5), "arrival time recomputed, not trusted");
    assert.equal(d.voyage!.cargoUnits, 76);
    assert.equal(d.location, "guild_town", "a ship in flight sits at its departure port");
    assert.equal(d.arrivedVia, null);
    assert.equal(d.totalProfit, 0);
    assert.equal(d.lastSale, null);

    (dirty as any).paladinTrial = {
      weekKey: "2026-07-07",
      cleared: [1, 2, 4],
      attemptsUsed: 99,
      medals: 120,
      totalMedals: 10,
      virtues: { valor: 9, aegis: -2, vigor: "3", glory: 1.7, wisdom: 5 },
      lastDuel: { weekKey: "bad" },
    };
    const p = ensurePaladinTrial(dirty);
    assert.equal(p.weekKey, "1970-01-05", "a non-Monday week key is invalid");
    assert.deepEqual(p.cleared, [1, 2]);
    assert.equal(p.attemptsUsed, PALADIN_WEEKLY_ATTEMPTS);
    assert.equal(p.totalMedals, 120, "lifetime medals never below the wallet");
    assert.deepEqual(p.virtues, { valor: 5, aegis: 0, vigor: 3, glory: 1 });
    assert.equal(p.lastDuel, null);
  });

  it("rolls the market day, lands voyages and rotates the trial week only on an explicit now", () => {
    const s = defaultEnhancedPlayerState(pack.version);
    s.inventory.gold = 50_000;
    ensureAirshipTrade(s, T0);
    assert.equal(openAirshipRoute(s, "guild_frostport", T0).ok, true);
    assert.equal(buyAirshipCargo(s, pack, "cheese_wheel", 12, T0).ok, true);
    const launch = launchAirshipVoyage(s, "guild_frostport", T0);
    assert.equal(launch.ok, true);
    assert.equal(launch.durationMs, 20 * 60_000);
    assert.equal(launch.xpOnArrival, 2);
    ensurePaladinTrial(s, T0);

    const before = snap(s);
    ensurePlayerExtensions(s);
    ensureAirshipTrade(s);
    ensurePaladinTrial(s);
    assert.equal(snap(s), before, "no-arg ensure never moves the day, the ship or the week");

    // trading is blocked while flying
    assert.match(buyAirshipCargo(s, pack, "cheese_wheel", 1, at(T0_DAY, 17, 5)).reason!, /航行中/);
    assert.match(upgradeAirshipHull(s, pack, at(T0_DAY, 17, 5)).reason!, /航行中/);
    assert.equal(s.airshipTrade!.voyage !== null, true);
    // explicit now past arrival lands the ship
    const later = new Date(T0.getTime() + 20 * 60_000);
    ensureAirshipTrade(s, later);
    assert.equal(s.airshipTrade!.voyage, null);
    assert.equal(s.airshipTrade!.location, "frostport");
    assert.equal(s.airshipTrade!.arrivedVia, "guild_frostport");
    assert.equal(s.airshipTrade!.routes.guild_frostport!.xp, 2);
    assert.equal(s.airshipTrade!.lastArrival!.at, launch.arrivesAt, "arrival stamped with the real arrival time");
    assert.ok(s.logs.some((l) => l.text.includes("抵达极北凛风冰港")));

    // the next UTC+8 day restocks; a clock moving backwards never rolls back
    s.airshipTrade!.boughtToday = { fish_deepsea: 40 };
    ensureAirshipTrade(s, at(T0_DAY + 1, 0, 1));
    assert.equal(s.airshipTrade!.dayKey, airshipDayKeyFromIndex(T0_DAY + 1));
    assert.deepEqual(s.airshipTrade!.boughtToday, {});
    ensureAirshipTrade(s, T0);
    assert.equal(s.airshipTrade!.dayKey, airshipDayKeyFromIndex(T0_DAY + 1));

    const w = paladinWeekIndex(T0);
    s.paladinTrial!.cleared = [1];
    s.paladinTrial!.attemptsUsed = 3;
    ensurePaladinTrial(s, new Date(paladinWeekKeyFromIndex(w + 1) + "T00:00:00.000+08:00"));
    assert.equal(s.paladinTrial!.weekKey, paladinWeekKeyFromIndex(w + 1));
    assert.deepEqual(s.paladinTrial!.cleared, []);
    assert.equal(s.paladinTrial!.attemptsUsed, 0);
  });

  it("opens routes, buys specialties at their origin and sells them elsewhere at the UTC+8 daily price, rejecting without mutation", () => {
    const s = defaultEnhancedPlayerState(pack.version);
    s.inventory.gold = 200;
    ensureAirshipTrade(s, T0);
    let b = snap(s);
    assert.match(openAirshipRoute(s, "guild_frostport", T0).reason!, /金币不足/);
    assert.match(openAirshipRoute(s, "frost_ember", T0).reason!, /船体/);
    assert.match(openAirshipRoute(s, "nope" as any, T0).reason!, /未知/);
    assert.equal(snap(s), b);
    s.inventory.gold = 20_000;
    assert.equal(openAirshipRoute(s, "guild_frostport", T0).ok, true);
    assert.equal(s.inventory.gold, 20_000 - AIRSHIP_ROUTES[0].openCost);
    assert.match(openAirshipRoute(s, "guild_frostport", T0).reason!, /已经开通/);

    const today = T0_DAY;
    const cheese = getAirshipBuyQuote(today, "cheese_wheel")!;
    b = snap(s);
    assert.match(buyAirshipCargo(s, pack, "fish_deepsea", 1, T0).reason!, /只在极北凛风冰港出售/);
    assert.match(buyAirshipCargo(s, pack, "cheese_wheel", 0, T0).reason!, /整数/);
    assert.match(buyAirshipCargo(s, pack, "cheese_wheel", 21, T0).reason!, /货舱只剩 20/);
    assert.match(buyAirshipCargo(s, pack, "cheese_wheel", 5, T0, "2020-01-01").reason!, /日期已更替/);
    assert.equal(snap(s), b, "rejected trades change nothing");
    const gold0 = s.inventory.gold;
    const buy = buyAirshipCargo(s, pack, "cheese_wheel", 20, T0, airshipDayKey(T0));
    assert.equal(buy.ok, true);
    assert.equal(buy.total, 20 * cheese.price);
    assert.equal(s.inventory.gold, gold0 - buy.total!);
    assert.deepEqual(s.airshipTrade!.cargo, { cheese_wheel: 20 });
    assert.equal(s.airshipTrade!.cargoCost.cheese_wheel, buy.total);
    assert.equal(s.airshipTrade!.boughtToday.cheese_wheel, 20);
    assert.match(sellAirshipCargo(s, pack, "cheese_wheel", 5, T0).reason!, /产地/);

    assert.equal(launchAirshipVoyage(s, "guild_frostport", T0).ok, true);
    const landed = new Date(T0.getTime() + 20 * 60_000);
    const sale = getAirshipSellQuote(today, "frostport", "cheese_wheel", 0)!;
    b = snap(s);
    assert.match(sellAirshipCargo(s, pack, "cheese_wheel", 21, landed).reason!, /只有 20 件/);
    assert.match(sellAirshipCargo(s, pack, "dyed_cloth", 1, landed).reason!, /没有/);
    // the failing call above already landed the ship (explicit now) — compare against the post-landing state
    const landedSnap = snap(s);
    assert.notEqual(landedSnap, b);
    assert.match(sellAirshipCargo(s, pack, "cheese_wheel", 0, landed).reason!, /整数/);
    assert.equal(snap(s), landedSnap);
    const sold = sellAirshipCargo(s, pack, "cheese_wheel", 8, landed);
    assert.equal(sold.ok, true);
    assert.equal(sold.unitPrice, sale.price, "route Lv.1 adds no bonus yet");
    assert.equal(sold.total, 8 * sale.price);
    assert.equal(sold.profit, sold.total! - Math.floor((buy.total! * 8) / 20));
    assert.equal(s.airshipTrade!.cargo.cheese_wheel, 12);
    assert.equal(s.airshipTrade!.cargoCost.cheese_wheel, buy.total! - Math.floor((buy.total! * 8) / 20));
    assert.equal(s.airshipTrade!.totalProfit, sold.profit);
    assert.equal(s.airshipTrade!.lastSale!.qty, 8);

    // daily stock is a hard limit
    const stock = defaultEnhancedPlayerState(pack.version);
    stock.inventory.gold = 1e6;
    ensureAirshipTrade(stock, T0).hullLevel = 5;
    assert.equal(buyAirshipCargo(stock, pack, "dyed_cloth", AIRSHIP_DAILY_STOCK, T0).ok, true);
    assert.match(buyAirshipCargo(stock, pack, "dyed_cloth", 1, T0).reason!, /售罄/);
    assert.match(buyAirshipCargo(stock, pack, "obsidian_chunk", 1, T0).reason!, /只在炎阳赤砂绿洲出售/);
  });

  it("levels routes from laden voyages (faster trips, sale bonus) and upgrades the hull with real crafted goods", () => {
    const s = defaultEnhancedPlayerState(pack.version);
    s.inventory.gold = 1e6;
    ensureAirshipTrade(s, T0);
    openAirshipRoute(s, "guild_frostport", T0);
    let t = T0.getTime();
    // empty voyages do not count
    assert.equal(launchAirshipVoyage(s, "guild_frostport", new Date(t)).xpOnArrival, 0);
    t += getAirshipVoyageMs("guild_frostport", 0, 1);
    ensureAirshipTrade(s, new Date(t));
    assert.equal(s.airshipTrade!.routes.guild_frostport!.xp, 0);
    assert.equal(s.airshipTrade!.routes.guild_frostport!.voyages, 1);
    assert.match(launchAirshipVoyage(s, "guild_emberoasis", new Date(t)).reason!, /尚未开辟/);
    openAirshipRoute(s, "guild_emberoasis", new Date(t));
    assert.match(launchAirshipVoyage(s, "guild_emberoasis", new Date(t)).reason!, /不经过/);
    // 3 laden round trips (20 fish each way → 3 xp per leg) reach Lv.2 at 6 xp
    for (let i = 0; i < 2; i++) {
      const here = s.airshipTrade!.location;
      if (here === "frostport") assert.equal(buyAirshipCargo(s, pack, "fish_deepsea", 20, new Date(t)).ok, true);
      else assert.equal(buyAirshipCargo(s, pack, "cheese_wheel", 20, new Date(t)).ok, true);
      const leg = launchAirshipVoyage(s, "guild_frostport", new Date(t));
      assert.equal(leg.xpOnArrival, 3);
      t += leg.durationMs!;
      const sellAt = new Date(t);
      const dest = leg.to!;
      ensureAirshipTrade(s, sellAt);
      const good = here === "frostport" ? "fish_deepsea" : "cheese_wheel";
      assert.equal(s.airshipTrade!.location, dest);
      assert.equal(sellAirshipCargo(s, pack, good, 20, sellAt).ok, true);
    }
    const route = s.airshipTrade!.routes.guild_frostport!;
    assert.equal(route.xp, 6);
    const lv = getAirshipRouteLevel(route.xp);
    assert.equal(lv.level, 2);
    assert.equal(getAirshipVoyageMs("guild_frostport", route.xp, 1), Math.round((20 * 60_000 * 96) / 100));
    // the sale bonus applies at the port reached via the levelled route
    const day = airshipDayIndex(new Date(t));
    const here = s.airshipTrade!.location;
    const good = here === "frostport" ? "cheese_wheel" : "fish_deepsea";
    s.airshipTrade!.cargo = { [good]: 5 };
    s.airshipTrade!.cargoCost = {};
    const q = getAirshipSellQuote(day, here, good, lv.sellBonusPct)!;
    if (q) {
      const r = sellAirshipCargo(s, pack, good as any, 5, new Date(t));
      assert.equal(r.ok, true);
      assert.equal(r.bonusPct, 2);
      assert.equal(r.unitPrice, q.price);
    }

    // hull upgrade: gold + real lumber / ingots, refused while short, consumed on success
    const h = defaultEnhancedPlayerState(pack.version);
    h.inventory.gold = 5000;
    ensureAirshipTrade(h, T0);
    h.inventory.lumber_3 = 19;
    h.inventory.ingot_2 = 12;
    const before = snap(h);
    assert.match(upgradeAirshipHull(h, pack, T0).reason!, /材料不足/);
    assert.equal(snap(h), before);
    h.inventory.lumber_3 = 25;
    const up = upgradeAirshipHull(h, pack, T0);
    assert.equal(up.ok, true);
    assert.equal(up.capacity, AIRSHIP_HULLS[1].capacity);
    assert.equal(h.inventory.lumber_3, 5);
    assert.equal(h.inventory.ingot_2, undefined);
    assert.equal(h.inventory.gold, 5000 - AIRSHIP_HULLS[1].costGold);
    h.inventory.gold = 2000;
    assert.match(openAirshipRoute(h, "frost_ember", T0).reason!, /金币不足/, "hull 2 is enough, gold is not");
    h.inventory.gold = 10_000;
    assert.equal(openAirshipRoute(h, "frost_ember", T0).ok, true, "hull 2 unlocks the cross route");
  });

  it("runs the weekly six-stage trial through the real hp_combat sandbox: order, attempts, medals, full-clear bonus and logs", () => {
    const s = fighter(40);
    const w = paladinWeekIndex(T0);
    ensurePaladinTrial(s, T0);
    assert.equal(challengePaladinTrial(s, undefined, 1, T0).ok, false, "needs the content pack");
    assert.match(challengePaladinTrial(s, pack, 2, T0).reason!, /按顺序/);
    assert.match(challengePaladinTrial(s, pack, 1, T0, "2020-01-06").reason!, /轮换/);
    const opponent = generatePaladinOpponent(w, 1);
    const expected = simulatePaladinTrialDuel(s, pack, opponent, T0);
    assert.equal(expected.won, true);
    const r1 = challengePaladinTrial(s, pack, 1, T0, paladinWeekKey(T0));
    assert.equal(r1.ok, true);
    assert.equal(r1.won, true);
    assert.equal(r1.medals, PALADIN_STAGES[0].medals);
    assert.deepEqual(r1.duel, expected, "settles with exactly the sandbox duel");
    assert.deepEqual(s.paladinTrial!.cleared, [1]);
    assert.equal(s.paladinTrial!.medals, PALADIN_STAGES[0].medals);
    assert.equal(s.paladinTrial!.attemptsUsed, 1);
    assert.ok(s.logs.some((l) => l.text.includes("圣骑士团荣誉试炼第 1 关")));
    // a hopeless stage costs attempts but no medals
    s.paladinTrial!.cleared = [1, 2, 3, 4, 5];
    const lost = challengePaladinTrial(s, pack, 6, T0);
    assert.equal(lost.ok, true);
    assert.equal(lost.won, false);
    assert.equal(lost.medals, 0);
    assert.equal(s.paladinTrial!.totalLosses, 1);
    s.paladinTrial!.attemptsUsed = PALADIN_WEEKLY_ATTEMPTS;
    assert.match(challengePaladinTrial(s, pack, 6, T0).reason!, /次数已用完/);

    // a myth-tier champion clears all six and earns the full-clear bonus
    const hero = fighter(400);
    ensurePaladinTrial(hero, T0);
    let medals = 0;
    for (const st of PALADIN_STAGES) {
      const r = challengePaladinTrial(hero, pack, st.stage, T0);
      assert.equal(r.won, true, `stage ${st.stage}`);
      medals += r.medals!;
    }
    assert.equal(medals, PALADIN_STAGES.reduce((x, st) => x + st.medals, 0) + PALADIN_FULL_CLEAR_BONUS);
    assert.equal(hero.paladinTrial!.weeksFullCleared, 1);
    assert.match(challengePaladinTrial(hero, pack, 1, T0).reason!, /全部通过/);
  });

  it("spends honor medals on vows (rank-gated, capped) and wires them into getActionRates, playerBuildExtras, HP combat and the trial sandbox", () => {
    const s = fighter(40);
    const pt = ensurePaladinTrial(s, T0);
    pt.medals = 10;
    pt.totalMedals = 10;
    assert.equal(upgradePaladinVirtue(s, "valor", T0).ok, true);
    assert.equal(pt.medals, 10 - PALADIN_VIRTUE_COSTS[0]);
    assert.match(upgradePaladinVirtue(s, "valor", T0).reason!, /荣誉位阶|勋章不足/);
    pt.medals = 15;
    pt.totalMedals = 15;
    assert.match(upgradePaladinVirtue(s, "valor", T0).reason!, /荣誉位阶/, "rank 2 needs 圣骑士团侍从 (20 lifetime medals)");
    pt.medals = 999;
    pt.totalMedals = 999;
    for (let i = 0; i < 4; i++) assert.equal(upgradePaladinVirtue(s, "valor", T0).ok, true);
    assert.match(upgradePaladinVirtue(s, "valor", T0).reason!, /封顶/);
    for (const v of ["aegis", "vigor", "glory"] as const) for (let i = 0; i < 5; i++) assert.equal(upgradePaladinVirtue(s, v, T0).ok, true);
    const bonus = getPaladinTrialBonuses(s);
    assert.equal(bonus.bonusAtk, PALADIN_BONUS_CAPS.bonusAtk);
    assert.equal(bonus.bonusHp, PALADIN_BONUS_CAPS.bonusHp);

    const base = fighter(40);
    const e0 = playerBuildExtras(base);
    const e1 = playerBuildExtras(s);
    assert.equal(e1.atk - e0.atk, 15);
    assert.equal(e1.def - e0.def, 10);
    assert.equal(e1.hp - e0.hp, 150);
    assert.ok(Math.abs(e1.goldMult / e0.goldMult - 1.05) < 1e-3);
    const chop = (pack.actions as any[]).find((x) => x.id === "act_chop_wood_t1");
    assert.ok(Math.abs(getActionRates(s, pack, chop, T0).xpMul / getActionRates(base, pack, chop, T0).xpMul - 1.05) < 1e-9);
    assert.ok(Math.abs(getActionRates(s, pack, chop, T0).goldMul / getActionRates(base, pack, chop, T0).goldMul - 1.05) < 1e-9);
    const fightPack = {
      ...pack,
      actions: (pack.actions as any[]).map((x: any) => (String(x.id).startsWith("act_combat_") ? { ...x, requirements: {} } : x)),
    } as EnhancedContentPack;
    assert.equal(startHpCombat(s, fightPack, "slime", T0).playerMaxHp - startHpCombat(base, fightPack, "slime", T0).playerMaxHp, 150);
    const o = generatePaladinOpponent(paladinWeekIndex(T0), 2);
    assert.equal(simulatePaladinTrialDuel(s, pack, o, T0).playerMaxHp - simulatePaladinTrialDuel(base, pack, o, T0).playerMaxHp, 150);
    // dirty ranks are clamped and stay capped
    (s.paladinTrial as any).virtues = { valor: 99, aegis: 99, vigor: 99, glory: 99 };
    assert.equal(playerBuildExtras(s).atk - e0.atk, 15);
  });

  it("keeps routes, hull, port, trial medals and vows through doPrestige / performReincarnation, but empties the cargo hold", () => {
    const s = fighter(60);
    s.inventory.gold = 1e6;
    ensureAirshipTrade(s, T0).hullLevel = 3;
    openAirshipRoute(s, "guild_frostport", T0);
    s.airshipTrade!.routes.guild_frostport!.xp = 20;
    buyAirshipCargo(s, pack, "cheese_wheel", 30, T0);
    const pt = ensurePaladinTrial(s, T0);
    pt.medals = 40;
    pt.totalMedals = 200;
    pt.virtues = { valor: 3, aegis: 2, vigor: 1, glory: 4 };
    pt.cleared = [1, 2];
    pt.attemptsUsed = 2;
    s.combatLevel = 60;
    ensurePaladinTrial(s);
    const snapTrial = structuredClone(s.paladinTrial);
    const bonus = getPaladinTrialBonuses(s);
    assert.equal(doPrestige(s).ok, true);
    assert.deepEqual(s.paladinTrial, snapTrial);
    assert.deepEqual(getPaladinTrialBonuses(s), bonus);
    assert.equal(s.airshipTrade!.hullLevel, 3);
    assert.equal(s.airshipTrade!.routes.guild_frostport!.xp, 20);
    assert.deepEqual(s.airshipTrade!.cargo, {}, "cargo cannot smuggle gold into the next life");
    assert.deepEqual(s.airshipTrade!.cargoCost, {});
    assert.ok(s.logs.some((l) => l.text.includes("货舱里的 30 件特产")));
    s.combatLevel = 60;
    s.skills.woodcutting = { level: 55, xp: 0 } as any;
    assert.equal(performReincarnation(s).ok, true);
    assert.equal(s.airshipTrade!.hullLevel, 3);
    assert.deepEqual(s.paladinTrial, snapTrial);
  });

  it("keeps the WL-16 backend logic off the wall clock (explicit now only)", () => {
    const src = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "progression2/airship_paladin.ts"), "utf8");
    const wl16 = src.slice(src.indexOf("浮空飞艇商路 & 圣骑士团荣誉试炼 (WL-16)"));
    assert.ok(wl16.length > 10_000);
    assert.equal(/Date\.now\(/.test(wl16), false);
    assert.equal(/new Date\(\)/.test(wl16), false);
    assert.equal(/Math\.random/.test(wl16), false);
    assert.equal(/now: Date = new Date\(\)/.test(wl16), false, "every WL-16 command takes an explicit now");
  });

  it("exposes GET /progression2/airship and POST airship/* + paladin/* with auth guard, strict zod schemas, server-side checks and stateRevision 409", async () => {
    const now = new Date();
    const fx = await routeFixture((s) => {
      s.inventory.gold = 50_000;
      s.inventory.weapon_steel_axe = 1;
      (s.equipment as any).main_hand = "weapon_steel_axe";
      const cs = ensureCombatSkills(s);
      for (const k of ["stamina", "attack", "defense", "melee"] as const) (cs as any)[k].level = 40;
      ensureCombatSkills(s);
    });
    for (const [p, body] of [
      ["/progression2/airship/route", { routeId: "guild_frostport" }],
      ["/progression2/airship/buy", { goodId: "cheese_wheel", qty: 1 }],
      ["/progression2/airship/sell", { goodId: "cheese_wheel", qty: 1 }],
      ["/progression2/airship/launch", { routeId: "guild_frostport" }],
      ["/progression2/airship/hull", {}],
      ["/progression2/paladin/challenge", { stage: 1 }],
      ["/progression2/paladin/virtue", { virtueId: "valor" }],
    ] as const) {
      assert.equal((await fx.invoke("POST", p, body as any, null)).statusCode, 401, p);
    }
    assert.equal((await fx.invoke("GET", "/progression2/airship", undefined, null)).statusCode, 401);

    const initial = await fx.invoke("GET", "/progression2/airship");
    assert.equal(initial.statusCode, 200);
    assert.equal(initial.payload.airship.dayKey, airshipDayKey(now));
    assert.equal(initial.payload.airship.location.id, "guild_town");
    assert.equal(initial.payload.airship.towns.length, AIRSHIP_TOWNS.length);
    assert.equal(initial.payload.airship.routes.length, AIRSHIP_ROUTES.length);
    assert.equal(initial.payload.airship.market.length, AIRSHIP_TOWNS.length);
    assert.equal(initial.payload.trial.weekKey, paladinWeekKey(now));
    assert.equal(initial.payload.trial.stages.length, PALADIN_STAGES.length);
    assert.equal(initial.payload.trial.stages[0].isNext, true);
    assert.ok(initial.payload.trial.stages[0].preview, "uncleared stages carry a real-engine preview");
    assert.equal(initial.payload.trial.stages[5].mechanicsInfo.length > 0, true);
    const rev0 = initial.payload.stateRevision;
    const persisted = await fx.storage.getOrCreatePlayerState(fx.userId, pack.version);
    assert.ok(persisted.airshipTrade && persisted.paladinTrial, "first GET persists both new states");

    const bad = [
      ["/progression2/airship/route", { routeId: "moon_route" }],
      ["/progression2/airship/buy", { goodId: "gem_1", qty: 1 }],
      ["/progression2/airship/buy", { goodId: "cheese_wheel", qty: 0 }],
      ["/progression2/airship/buy", { goodId: "cheese_wheel", qty: 1.5 }],
      ["/progression2/airship/buy", { goodId: "cheese_wheel", qty: 1000 }],
      ["/progression2/airship/buy", { goodId: "cheese_wheel", qty: 1, price: 1 }],
      ["/progression2/airship/buy", { goodId: "cheese_wheel", qty: 1, dayKey: "today" }],
      ["/progression2/airship/sell", { goodId: "cheese_wheel" }],
      ["/progression2/airship/launch", {}],
      ["/progression2/airship/hull", { level: 5 }],
      ["/progression2/paladin/challenge", { stage: 0 }],
      ["/progression2/paladin/challenge", { stage: 7 }],
      ["/progression2/paladin/challenge", { stage: 1, win: true }],
      ["/progression2/paladin/virtue", { virtueId: "wisdom" }],
    ] as const;
    for (const [p, body] of bad) {
      const r = await fx.invoke("POST", p, body as any);
      assert.ok(r.statusCode >= 400 && r.statusCode < 500, `${p} ${JSON.stringify(body)} → ${r.statusCode}`);
    }
    assert.equal((await fx.invoke("POST", "/progression2/airship/launch", { routeId: "guild_frostport" })).statusCode, 400, "route not opened");
    assert.equal((await fx.invoke("POST", "/progression2/airship/buy", { goodId: "fish_deepsea", qty: 1 })).statusCode, 400, "not at origin");
    assert.equal((await fx.invoke("POST", "/progression2/paladin/challenge", { stage: 2 })).statusCode, 400, "stages in order");
    assert.equal((await fx.invoke("POST", "/progression2/paladin/virtue", { virtueId: "valor" })).statusCode, 400, "no medals yet");
    assert.equal((await fx.invoke("POST", "/progression2/airship/hull", {})).statusCode, 400, "no materials");

    const latest = await fx.storage.getOrCreatePlayerState(fx.userId, pack.version);
    const open = await fx.invoke("POST", "/progression2/airship/route", { routeId: "guild_frostport", expectedRevision: latest.stateRevision });
    assert.equal(open.statusCode, 200, JSON.stringify(open.payload));
    assert.equal(open.payload.airship.airship.routesOpened, 1);
    const rev1 = open.payload.stateRevision;
    assert.ok(rev1 > rev0);
    const stale = await fx.invoke("POST", "/progression2/airship/buy", { goodId: "cheese_wheel", qty: 5, expectedRevision: rev0 });
    assert.equal(stale.statusCode, 409);
    const buy = await fx.invoke("POST", "/progression2/airship/buy", {
      goodId: "cheese_wheel",
      qty: 12,
      dayKey: initial.payload.airship.dayKey,
      expectedRevision: rev1,
    });
    assert.equal(buy.statusCode, 200, JSON.stringify(buy.payload));
    assert.equal(buy.payload.buy.qty, 12);
    assert.equal(buy.payload.airship.airship.cargoUnits, 12);
    const launch = await fx.invoke("POST", "/progression2/airship/launch", { routeId: "guild_frostport" });
    assert.equal(launch.statusCode, 200);
    assert.equal(launch.payload.airship.airship.voyage.to, "frostport");
    assert.equal((await fx.invoke("POST", "/progression2/airship/sell", { goodId: "cheese_wheel", qty: 1 })).statusCode, 400, "still flying");

    const fight = await fx.invoke("POST", "/progression2/paladin/challenge", { stage: 1, weekKey: initial.payload.trial.weekKey });
    assert.equal(fight.statusCode, 200, JSON.stringify(fight.payload));
    assert.equal(fight.payload.challenge.won, true);
    assert.equal(fight.payload.airship.trial.cleared.length, 1);
    assert.equal(fight.payload.airship.trial.medals, PALADIN_STAGES[0].medals);
    const poor = await fx.invoke("POST", "/progression2/paladin/virtue", { virtueId: "vigor" });
    assert.equal(poor.statusCode, 400, "stage 1 pays 3 medals, the first vow costs 6");
    assert.match(String(poor.payload.error), /勋章不足/);
    const rich = await fx.storage.getOrCreatePlayerState(fx.userId, pack.version);
    rich.paladinTrial!.medals = 10;
    rich.paladinTrial!.totalMedals = 10;
    await fx.storage.savePlayerState(fx.userId, rich);
    const vow = await fx.invoke("POST", "/progression2/paladin/virtue", { virtueId: "vigor" });
    assert.equal(vow.statusCode, 200, JSON.stringify(vow.payload));
    assert.equal(vow.payload.airship.trial.medals, 4);
    assert.equal(vow.payload.airship.bonuses.bonusHp, 30);

    const saved = await fx.storage.getOrCreatePlayerState(fx.userId, pack.version);
    assert.deepEqual(saved.airshipTrade?.cargo, { cheese_wheel: 12 });
    assert.equal(saved.airshipTrade?.voyage?.routeId, "guild_frostport");
    assert.deepEqual(saved.paladinTrial?.cleared, [1]);
    assert.equal(saved.paladinTrial?.virtues.vigor, 1);
    assert.equal(getAirshipPaladinInfo(saved, pack, now).trial.attemptsUsed, 1);
  });
});
