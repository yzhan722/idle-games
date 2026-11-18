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
  ARENA_DAILY_ATTEMPTS,
  ARENA_DIVISIONS,
  ARENA_RUNG_COUNT,
  TOWN_FACILITIES,
  TOWN_PROSPERITY_TIERS,
  arenaDayEndsAtMs,
  arenaDayKey,
  arenaSeasonEndsAtMs,
  arenaSeasonKey,
  arenaSeasonStartMs,
  challengeSkyArena,
  claimTownProsperityChest,
  doPrestige,
  ensureGuildTown,
  ensureSkyArena,
  generateArenaChampion,
  getArenaLadder,
  getArenaSeasonIndex,
  getArenaSettlement,
  getArenaTownBonuses,
  getSkyArenaTownInfo,
  getTownProsperity,
  performReincarnation,
  simulateArenaDuel,
  upgradeTownFacility,
} from "./progression2";
import { chooseBuild, playerBuildExtras } from "./hp_combat";
import { ensureCombatSkills } from "./combat_skills";
import {
  defaultEnhancedPlayerState,
  ensurePlayerExtensions,
  getActionRates,
  simulateToNow,
  startLifeActionNow,
} from "./storage";

const pack = packJson as EnhancedContentPack;
/** 历史时刻：2026 年 7 月（东八区），与墙钟所在赛季不同，确保「无参 ensure 不按墙钟翻季 / 换日」的断言有意义。 */
const T0 = new Date("2026-07-10T09:00:00.000Z");
const NEXT_DAY = new Date("2026-07-11T01:00:00.000Z");
const AUGUST = new Date("2026-08-02T09:00:00.000Z");
const OCTOBER = new Date("2026-10-05T09:00:00.000Z");

/** 一名能稳定击败前几级擂主的真实构建：铁剑 + 木胸甲 + 锐锋构筑 + 练过的战斗技能。 */
function fighter(level = 14): EnhancedPlayerState {
  const state = defaultEnhancedPlayerState(pack.version);
  state.inventory.weapon_iron_sword = 1;
  state.inventory.armor_wood_chest = 1;
  (state.equipment as any).main_hand = "weapon_iron_sword";
  (state.equipment as any).chest = "armor_wood_chest";
  const cs = ensureCombatSkills(state);
  for (const k of ["stamina", "attack", "defense", "melee"] as const) (cs as any)[k].level = level;
  ensureCombatSkills(state);
  chooseBuild(state, "sharpened_edge");
  return state;
}

function townState(facilities?: Partial<Record<string, number>>): EnhancedPlayerState {
  const state = defaultEnhancedPlayerState(pack.version);
  const gt = ensureGuildTown(state);
  if (facilities) gt.facilities = { ...gt.facilities, ...(facilities as any) };
  ensureGuildTown(state);
  return state;
}

async function arenaRouteFixture(patch?: (state: EnhancedPlayerState) => void) {
  const storage = createMemoryStorage();
  const user = await storage.findOrCreateGuestUser(`wl13-arena-${randomUUID()}`);
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

describe("WL-13 Sky Arena Season Ladder & Guild Town backend mechanics & routes", () => {
  it("loads old saves with safe defaults (no gifts) and sanitizes dirty arena / town data", () => {
    const legacy = defaultEnhancedPlayerState(pack.version);
    assert.equal(legacy.skyArena, undefined);
    ensurePlayerExtensions(legacy);
    assert.equal(legacy.skyArena, undefined, "ensurePlayerExtensions must not invent the arena for old saves");
    assert.equal(legacy.guildTown, undefined);
    const empty = getArenaTownBonuses(legacy);
    assert.equal(empty.titleDivision, null);
    assert.equal(empty.prosperityTier, 0);
    for (const k of ["gatherSpeedPct", "craftSpeedPct", "xpGainPct", "goldGainPct", "bonusAtk", "bonusDef", "bonusHp"] as const) {
      assert.equal(empty[k], 0, k);
    }

    const goldBefore = legacy.inventory.gold || 0;
    const info = getSkyArenaTownInfo(legacy, pack, T0);
    assert.equal(legacy.skyArena?.seasonKey, "2026-07");
    assert.equal(legacy.skyArena?.dayKey, "2026-07-10");
    assert.equal(legacy.skyArena?.rung, 0);
    assert.equal(legacy.skyArena?.medals, 0);
    assert.deepEqual(legacy.skyArena?.titles, []);
    assert.deepEqual(legacy.guildTown?.facilities, {
      town_hall: 0,
      artisan_row: 0,
      harvest_market: 0,
      training_grounds: 0,
      guild_bank: 0,
      sage_library: 0,
    });
    assert.equal(legacy.inventory.gold || 0, goldBefore, "opening the panel gifts nothing");
    assert.equal(info.arena.attemptsLeft, ARENA_DAILY_ATTEMPTS);
    assert.equal(info.arena.ladder.length, ARENA_RUNG_COUNT);
    assert.equal(info.arena.next?.rung, 1);
    assert.ok(info.arena.next?.preview, "the next champion comes with a real-engine preview");
    assert.equal(info.town.facilities.length, TOWN_FACILITIES.length);
    assert.equal(info.town.prosperity.maxPoints, 95);

    const dirty = defaultEnhancedPlayerState(pack.version);
    (dirty as any).skyArena = {
      seasonKey: "2026-13",
      rung: 99,
      bestRung: -4,
      dayKey: "yesterday",
      attemptsUsed: 9,
      seasonWins: "x",
      medals: -5,
      totalMedalsEarned: 2,
      titles: ["gold", "bogus", "gold", "bronze"],
      lastSettlement: { seasonKey: "2026-06", rung: 12, division: "sky_king", medals: 999, newTitle: "nope" },
      lastDuel: { seasonKey: "bad" },
    };
    (dirty as any).guildTown = {
      facilities: { town_hall: 2, artisan_row: 5, guild_bank: "3", sage_library: 9.7, bogus: 4 },
      chestsClaimed: [1, 1, 5, 9],
      totalUpgrades: -1,
      lastUpgrade: { facilityId: "castle", level: 3 },
    };
    ensurePlayerExtensions(dirty);
    const sa = dirty.skyArena!;
    assert.equal(sa.seasonKey, arenaSeasonKey(new Date()), "invalid season key falls back to the current month");
    assert.equal(sa.rung, ARENA_RUNG_COUNT);
    assert.equal(sa.bestRung, ARENA_RUNG_COUNT);
    assert.equal(sa.attemptsUsed, ARENA_DAILY_ATTEMPTS);
    assert.equal(sa.medals, 0);
    assert.deepEqual(sa.titles, ["bronze", "gold"]);
    assert.deepEqual(sa.lastSettlement, { seasonKey: "2026-06", rung: 12, division: "gold", medals: 10, newTitle: null }, "settlement record is recomputed from its rung");
    assert.equal(sa.lastDuel, null);
    const gt = dirty.guildTown!;
    assert.deepEqual(gt.facilities, { town_hall: 2, artisan_row: 2, harvest_market: 0, training_grounds: 0, guild_bank: 2, sage_library: 2 });
    assert.equal(getTownProsperity(gt.facilities).points, 4 * 2 + 3 * 6, "facilities above the hall are clamped to Lv.2");
    assert.equal(getTownProsperity(gt.facilities).current.tier, 2);
    assert.deepEqual(gt.chestsClaimed, [1], "duplicates and claims above the reached prosperity tier are dropped");
    assert.equal(gt.totalUpgrades, 8);
    assert.equal(gt.lastUpgrade, null);
  });

  it("maps UTC+8 calendar months to seasons and UTC+8 dates to attempt days", () => {
    assert.equal(arenaSeasonKey(new Date("2026-11-30T15:59:59.999Z")), "2026-11");
    assert.equal(arenaSeasonKey(new Date("2026-11-30T16:00:00.000Z")), "2026-12", "Dec 1st 00:00 in UTC+8");
    assert.equal(arenaSeasonKey(new Date("2026-12-31T16:00:00.000Z")), "2027-01");
    const idx = getArenaSeasonIndex(new Date("2026-11-18T02:00:00.000Z"));
    assert.equal(new Date(arenaSeasonStartMs(idx)).toISOString(), "2026-10-31T16:00:00.000Z");
    assert.equal(new Date(arenaSeasonEndsAtMs(idx)).toISOString(), "2026-11-30T16:00:00.000Z");
    assert.equal(arenaDayKey(new Date("2026-11-18T15:59:59.000Z")), "2026-11-18");
    assert.equal(arenaDayKey(new Date("2026-11-18T16:00:00.000Z")), "2026-11-19");
    assert.equal(new Date(arenaDayEndsAtMs(Date.parse("2026-11-18T03:00:00.000Z"))).toISOString(), "2026-11-18T16:00:00.000Z");
    // the ladder is a pure function of season + rung: same season same champions, a new month brings new ones
    assert.deepEqual(getArenaLadder(idx), getArenaLadder(idx));
    const a = getArenaLadder(idx).map((c) => c.name).join("/");
    const b = getArenaLadder(idx + 1).map((c) => c.name).join("/");
    assert.notEqual(a, b);
    for (const c of getArenaLadder(idx)) {
      assert.equal(c.gatekeeper, c.rung % 5 === 0);
      assert.equal(c.isBoss, c.gatekeeper);
      assert.equal(c.mechanics.length > 0, c.gatekeeper, "only division gatekeepers carry boss mechanics");
    }
    assert.deepEqual(getArenaSettlement(0), { rung: 0, division: null, divisionName: "未定级", medals: 0, titleName: null });
    assert.equal(getArenaSettlement(7).division, "silver");
    assert.equal(getArenaSettlement(30).medals, ARENA_DIVISIONS[5].medals);
  });

  it("fights champions with the player's real build through the real hp_combat engine without touching the real save", () => {
    const state = fighter();
    state.inventory.potion_hp_t1 = 5;
    state.combatLoadout = { food: [{ itemId: "potion_hp_t1", triggerMissingHp: 1 }], drink: [], autoRepeat: true } as any;
    state.combatHp = 3;
    state.combatHpAt = T0.getTime();
    const snapshot = JSON.stringify(state);
    const season = getArenaSeasonIndex(T0);
    const duel = simulateArenaDuel(state, pack, generateArenaChampion(season, 1), T0);
    assert.equal(JSON.stringify(state), snapshot, "the duel runs in a sandbox copy");
    assert.equal(duel.won, true);
    assert.equal(duel.playerMaxHp, duel.player.hp);
    assert.ok(duel.durationMs > 0 && duel.durationMs < 600_000);
    assert.ok(duel.log.length > 0);
    // arena rules: full HP at the gate (persistent HP pool ignored), no consumables
    const weak = defaultEnhancedPlayerState(pack.version);
    const lost = simulateArenaDuel(weak, pack, generateArenaChampion(season, 1), T0);
    assert.equal(lost.won, false, "an unarmed fresh character cannot beat the first champion");
    assert.equal(lost.playerHpLeft, 0);
    // stronger permanent bonuses (titles + training grounds) change real outcomes
    const champion = generateArenaChampion(season, 8);
    const plain = simulateArenaDuel(state, pack, champion, T0);
    const boosted = fighter();
    ensureSkyArena(boosted, T0).titles = ["bronze", "silver", "gold", "platinum"];
    ensureGuildTown(boosted).facilities = { ...boosted.guildTown!.facilities, town_hall: 5, training_grounds: 5 };
    const strong = simulateArenaDuel(boosted, pack, champion, T0);
    assert.ok(strong.player.atk > plain.player.atk && strong.player.hp > plain.player.hp && strong.player.def > plain.player.def);
    assert.ok(
      strong.won && (!plain.won || strong.durationMs < plain.durationMs || strong.playerHpLeft > plain.playerHpLeft),
      "titles + training grounds make the same champion easier"
    );
  });

  it("challenges with limited daily attempts, climbs on wins, records losses and resets attempts only on an explicit new day", () => {
    const state = fighter();
    state.inventory.gold = 0;
    const sa = ensureSkyArena(state, T0);
    const season = getArenaSeasonIndex(T0);
    const first = challengeSkyArena(state, pack, T0, 1);
    assert.equal(first.ok, true, first.reason);
    assert.equal(first.won, true);
    assert.equal(first.gold, generateArenaChampion(season, 1).gold);
    assert.equal(state.inventory.gold, first.gold);
    assert.equal(sa.rung, 1);
    assert.equal(sa.attemptsUsed, 1);
    assert.equal(sa.lastDuel?.won, true);

    const mismatch = challengeSkyArena(state, pack, T0, 1);
    assert.equal(mismatch.ok, false, "stale rung (double click) is rejected");
    assert.equal(sa.attemptsUsed, 1, "rejection does not consume an attempt");

    // climb until the real build hits a wall; every attempt (win or loss) consumes one of 4 daily attempts
    while (sa.attemptsUsed < ARENA_DAILY_ATTEMPTS) {
      const res = challengeSkyArena(state, pack, T0);
      assert.equal(res.ok, true, res.reason);
      const preview = simulateArenaDuel(state, pack, generateArenaChampion(season, res.rung!), T0);
      if (!res.won) assert.equal(preview.won, false, "a lost challenge matches the deterministic preview");
    }
    const snap = JSON.stringify(state);
    const tired = challengeSkyArena(state, pack, T0);
    assert.equal(tired.ok, false);
    assert.match(tired.reason!, /今日挑战次数已用完/);
    assert.equal(JSON.stringify(state), snap, "a rejected challenge changes nothing");

    // no-arg ensure / ensurePlayerExtensions never reset the day, even though the wall clock is months later
    ensureSkyArena(state);
    ensurePlayerExtensions(state);
    assert.equal(sa.attemptsUsed, ARENA_DAILY_ATTEMPTS);
    ensureSkyArena(state, new Date(T0.getTime() - 86_400_000));
    assert.equal(sa.attemptsUsed, ARENA_DAILY_ATTEMPTS, "a clock running backwards never resets attempts");
    ensureSkyArena(state, NEXT_DAY);
    assert.equal(sa.dayKey, "2026-07-11");
    assert.equal(sa.attemptsUsed, 0);
    assert.equal(sa.seasonWins + sa.seasonLosses, ARENA_DAILY_ATTEMPTS);
    assert.equal(sa.totalWins, sa.seasonWins);
    assert.equal(sa.bestRung, sa.rung);
  });

  it("settles the season only on an explicit new month: medals + permanent title once, ladder reset, multi-month skip settles once", () => {
    const state = fighter();
    const sa = ensureSkyArena(state, T0);
    sa.rung = 12;
    sa.bestRung = 12;
    sa.seasonWins = 12;
    sa.totalWins = 12;
    sa.titles = ["bronze"];
    sa.medals = 3;
    sa.totalMedalsEarned = 3;
    const snapshot = structuredClone(sa);
    ensureSkyArena(state);
    ensurePlayerExtensions(state);
    assert.deepEqual(state.skyArena, snapshot, "no-arg ensure never settles by wall clock");
    ensureSkyArena(state, new Date("2026-06-20T00:00:00.000Z"));
    assert.equal(sa.seasonKey, "2026-07", "a clock running backwards never rolls the season back");

    const logsBefore = (state as any).logs.length;
    ensureSkyArena(state, AUGUST);
    assert.equal(sa.seasonKey, "2026-08");
    assert.equal(sa.rung, 0);
    assert.equal(sa.seasonWins, 0);
    assert.equal(sa.bestRung, 12, "career best survives the reset");
    assert.equal(sa.medals, 3 + 10, "gold division pays 10 medals");
    assert.equal(sa.totalMedalsEarned, 13);
    assert.deepEqual(sa.titles, ["bronze", "gold"]);
    assert.deepEqual(sa.lastSettlement, { seasonKey: "2026-07", rung: 12, division: "gold", medals: 10, newTitle: "gold" });
    assert.equal(sa.seasonsSettled, 1);
    assert.ok((state as any).logs.length > logsBefore);
    const once = structuredClone(sa);
    ensureSkyArena(state, new Date(AUGUST.getTime() + 3_600_000));
    assert.deepEqual(state.skyArena, once, "a season never settles twice");

    // skipping two months: the August season (rung 4) settles once, empty September pays nothing
    sa.rung = 4;
    sa.seasonWins = 4;
    ensureSkyArena(state, OCTOBER);
    assert.equal(sa.seasonKey, "2026-10");
    assert.equal(sa.medals, 13 + 3);
    assert.deepEqual(sa.lastSettlement, { seasonKey: "2026-08", rung: 4, division: "bronze", medals: 3, newTitle: null });
    assert.equal(sa.seasonsSettled, 2);

    // the best title drives the permanent combat bonus
    const b = getArenaTownBonuses(state);
    assert.equal(b.titleDivision, "gold");
    assert.equal(b.titleName, "黄金霸者");
    assert.equal(b.bonusAtk, 12);
    const base = fighter();
    const e0 = playerBuildExtras(base);
    const e1 = playerBuildExtras(state);
    assert.equal(e1.atk - e0.atk, 12);
    assert.equal(e1.def - e0.def, 6);
    assert.equal(e1.hp - e0.hp, 50);

    // the top rung cannot be challenged again until the month ends
    sa.rung = ARENA_RUNG_COUNT;
    const top = challengeSkyArena(state, pack, OCTOBER);
    assert.equal(top.ok, false);
    assert.match(top.reason!, /已登顶/);
  });

  it("builds town facilities with gold + real life-skill products (and arena medals), hall-capped, rejecting without mutation", () => {
    const state = townState();
    state.inventory.gold = 100_000;
    const noHall = upgradeTownFacility(state, pack, "artisan_row", T0);
    assert.equal(noHall.ok, false);
    assert.match(noHall.reason!, /公会议事厅/);

    const hallDef = TOWN_FACILITIES.find((f) => f.id === "town_hall")!;
    const short = upgradeTownFacility(state, pack, "town_hall", T0);
    assert.equal(short.ok, false, "hall needs real planks + ingots");
    assert.match(short.reason!, /标准木板|铜锭/);
    for (const [id, qty] of Object.entries(hallDef.levels[0].items)) state.inventory[id] = qty;
    const hall = upgradeTownFacility(state, pack, "town_hall", T0);
    assert.equal(hall.ok, true, hall.reason);
    assert.equal(state.guildTown!.facilities.town_hall, 1);
    assert.equal(state.inventory.gold, 100_000 - hallDef.levels[0].gold);
    assert.equal(state.inventory.lumber_1, undefined, "spent products are removed");

    const tg = TOWN_FACILITIES.find((f) => f.id === "training_grounds")!;
    for (const [id, qty] of Object.entries(tg.levels[0].items)) state.inventory[id] = qty;
    assert.equal(upgradeTownFacility(state, pack, "training_grounds", T0).ok, true);
    for (const [id, qty] of Object.entries(tg.levels[1].items)) state.inventory[id] = qty;
    const capped = upgradeTownFacility(state, pack, "training_grounds", T0);
    assert.equal(capped.ok, false);
    assert.match(capped.reason!, /议事厅升至 Lv\.2/);

    // raise the hall to 3, then training grounds Lv.3 needs 4 arena medals
    for (const lv of [1, 2]) {
      for (const [id, qty] of Object.entries(hallDef.levels[lv].items)) state.inventory[id] = qty;
      assert.equal(upgradeTownFacility(state, pack, "town_hall", T0).ok, true);
    }
    // the hall Lv.2 upgrade also ate the iron ingots: restock the training-grounds Lv.2 bill
    for (const [id, qty] of Object.entries(tg.levels[1].items)) state.inventory[id] = qty;
    const tg2 = upgradeTownFacility(state, pack, "training_grounds", T0);
    assert.equal(tg2.ok, true, tg2.reason);
    for (const [id, qty] of Object.entries(tg.levels[2].items)) state.inventory[id] = qty;
    const snap = JSON.stringify([state.guildTown, state.inventory]);
    const noMedals = upgradeTownFacility(state, pack, "training_grounds", T0);
    assert.equal(noMedals.ok, false);
    assert.match(noMedals.reason!, /竞技场勋章/);
    assert.equal(JSON.stringify([state.guildTown, state.inventory]), snap, "rejection mutates nothing");
    state.skyArena!.medals = 6;
    const withMedals = upgradeTownFacility(state, pack, "training_grounds", T0);
    assert.equal(withMedals.ok, true, withMedals.reason);
    assert.equal(withMedals.spentMedals, 4);
    assert.equal(state.skyArena!.medals, 2);
    assert.equal(state.guildTown!.lastUpgrade?.facilityId, "training_grounds");
    assert.equal(state.guildTown!.totalUpgrades, 6);
  });

  it("feeds facilities, prosperity and titles into real production / combat formulas and pays each prosperity chest once", () => {
    const base = defaultEnhancedPlayerState(pack.version);
    const town = townState({ town_hall: 3, artisan_row: 3, harvest_market: 3, guild_bank: 3, sage_library: 2, training_grounds: 1 });
    const b = getArenaTownBonuses(town);
    // 4×3 + 3×(3+3+3+2+1) = 48 → 领地城镇 (tier 3)
    assert.equal(b.prosperityPoints, 48);
    assert.equal(b.prosperityTier, 3);
    assert.equal(b.gatherSpeedPct, 2 + 6 + 1);
    assert.equal(b.craftSpeedPct, 6 + 2 + 1);
    assert.equal(b.xpGainPct, 1 + 2 + 2);
    assert.equal(b.goldGainPct, 4 + 3);
    assert.equal(b.bonusAtk, 4);
    assert.equal(b.bonusHp, 15);

    const find = (id: string) => (pack.actions as any[]).find((a) => a.id === id);
    const chop = find("act_chop_wood_t1");
    const plank = find("act_craft_lumber_t1");
    const fight = (pack.actions as any[]).find((a) => String(a.id).startsWith("act_combat_"));
    const g0 = getActionRates(base, pack, chop, T0);
    const g1 = getActionRates(town, pack, chop, T0);
    assert.ok(Math.abs(g1.speedMul / g0.speedMul - 1.09) < 1e-9, "gathering speed +9%");
    assert.ok(g1.speedSources.some((s) => s.label === "公会城镇设施与繁荣度" && s.pct === 9));
    assert.ok(Math.abs(g1.xpMul / g0.xpMul - 1.05) < 1e-9, "xp +5%");
    assert.ok(Math.abs(g1.goldMul / g0.goldMul - 1.07) < 1e-9, "gold +7%");
    const c0 = getActionRates(base, pack, plank, T0);
    const c1 = getActionRates(town, pack, plank, T0);
    assert.ok(Math.abs(c1.speedMul / c0.speedMul - 1.09) < 1e-9, "crafting speed +9%");
    assert.equal(getActionRates(town, pack, fight, T0).speedMul, getActionRates(base, pack, fight, T0).speedMul, "combat actions keep their speed");
    const e0 = playerBuildExtras(base);
    const e1 = playerBuildExtras(town);
    assert.equal(e1.atk - e0.atk, 4);
    assert.equal(e1.hp - e0.hp, 15);
    assert.ok(Math.abs(e1.goldMult / e0.goldMult - 1.07) < 1e-9, "combat gold +7%");

    // Real simulator: 10 minutes of woodcutting yields more logs with the market + workshop passives.
    const sBase = defaultEnhancedPlayerState(pack.version);
    const sTown = townState({ town_hall: 5, harvest_market: 5, artisan_row: 5 });
    for (const s of [sBase, sTown]) {
      s.lastSimulatedAt = T0.toISOString();
      startLifeActionNow(s, pack, "act_chop_wood_t1", undefined, T0);
    }
    const later = new Date(T0.getTime() + 10 * 60_000);
    const oBase = simulateToNow({ state: sBase, contentPack: pack, now: later, rng: () => 0.5 });
    const oTown = simulateToNow({ state: sTown, contentPack: pack, now: later, rng: () => 0.5 });
    assert.ok((oTown.state.inventory.wood_1 || 0) > (oBase.state.inventory.wood_1 || 0));

    // prosperity chests: tiers 1..3 reached, each once; tier 4 locked
    town.inventory.gold = 0;
    const tier3 = TOWN_PROSPERITY_TIERS[3];
    const locked = claimTownProsperityChest(town, pack, 4, T0);
    assert.equal(locked.ok, false);
    const c3 = claimTownProsperityChest(town, pack, 3, T0);
    assert.equal(c3.ok, true, c3.reason);
    assert.equal(town.inventory.gold, tier3.chestGold);
    for (const [id, qty] of Object.entries(tier3.chestItems)) assert.equal(town.inventory[id], qty);
    assert.equal(claimTownProsperityChest(town, pack, 3, T0).ok, false, "a chest pays once");
    assert.deepEqual(town.guildTown!.chestsClaimed, [3]);
  });

  it("keeps the arena season, titles, medals and the whole town through doPrestige and performReincarnation", () => {
    const state = townState({ town_hall: 4, training_grounds: 3, guild_bank: 4 });
    state.combatLevel = 60;
    state.skills.woodcutting = { level: 55, xp: 0 } as any;
    const sa = ensureSkyArena(state, T0);
    sa.rung = 9;
    sa.bestRung = 14;
    sa.seasonWins = 9;
    sa.titles = ["bronze", "silver", "gold"];
    sa.medals = 21;
    sa.totalMedalsEarned = 40;
    claimTownProsperityChest(state, pack, 1, T0);
    const snapSa = structuredClone(state.skyArena);
    const snapGt = structuredClone(state.guildTown);
    const bonus = getArenaTownBonuses(state);

    assert.equal(doPrestige(state).ok, true);
    assert.deepEqual(state.skyArena, snapSa);
    assert.deepEqual(state.guildTown, snapGt);

    state.combatLevel = 60;
    state.skills.woodcutting = { level: 55, xp: 0 } as any;
    assert.equal(performReincarnation(state).ok, true);
    assert.deepEqual(state.skyArena, snapSa);
    assert.deepEqual(state.guildTown, snapGt);
    assert.deepEqual(getArenaTownBonuses(state), bonus);
  });

  it("exposes GET/POST /progression2/arena* and /town/* with auth guard, strict zod schemas, server-side checks and stateRevision 409", async () => {
    const hallDef = TOWN_FACILITIES.find((f) => f.id === "town_hall")!;
    const fx = await arenaRouteFixture((s) => {
      s.inventory.gold = 5000;
      s.inventory.weapon_iron_sword = 1;
      s.inventory.armor_wood_chest = 1;
      (s.equipment as any).main_hand = "weapon_iron_sword";
      (s.equipment as any).chest = "armor_wood_chest";
      const cs = ensureCombatSkills(s);
      for (const k of ["stamina", "attack", "defense", "melee"] as const) (cs as any)[k].level = 14;
      ensureCombatSkills(s);
      for (const [id, qty] of Object.entries(hallDef.levels[0].items)) s.inventory[id] = qty;
    });

    assert.equal((await fx.invoke("GET", "/progression2/arena", undefined, null)).statusCode, 401);
    assert.equal((await fx.invoke("POST", "/progression2/arena/challenge", {}, null)).statusCode, 401);
    assert.equal((await fx.invoke("POST", "/progression2/town/build", { facilityId: "town_hall" }, null)).statusCode, 401);
    assert.equal((await fx.invoke("POST", "/progression2/town/chest", { tier: 1 }, null)).statusCode, 401);

    const initial = await fx.invoke("GET", "/progression2/arena");
    assert.equal(initial.statusCode, 200);
    assert.equal(initial.payload.arena.seasonKey, arenaSeasonKey(new Date()));
    assert.equal(initial.payload.arena.rung, 0);
    assert.equal(initial.payload.arena.next.rung, 1);
    assert.equal(initial.payload.arena.next.preview.won, true, "the trained iron-sword build beats rung 1");
    assert.equal(initial.payload.town.facilities.length, TOWN_FACILITIES.length);
    const rev0 = initial.payload.stateRevision;
    const persisted = await fx.storage.getOrCreatePlayerState(fx.userId, pack.version);
    assert.ok(persisted.skyArena && persisted.guildTown, "first GET persists both new states");

    const bad = await fx.invoke("POST", "/progression2/town/build", { facilityId: "castle" });
    assert.ok(bad.statusCode >= 400 && bad.statusCode < 500, "unknown facility rejected by schema");
    const extra = await fx.invoke("POST", "/progression2/arena/challenge", { rung: 1, champion: "me" });
    assert.ok(extra.statusCode >= 400 && extra.statusCode < 500, "strict schema rejects extra fields");
    const badRung = await fx.invoke("POST", "/progression2/arena/challenge", { rung: 31 });
    assert.ok(badRung.statusCode >= 400 && badRung.statusCode < 500);
    const badTier = await fx.invoke("POST", "/progression2/town/chest", { tier: 0 });
    assert.ok(badTier.statusCode >= 400 && badTier.statusCode < 500);
    const noChest = await fx.invoke("POST", "/progression2/town/chest", { tier: 1 });
    assert.equal(noChest.statusCode, 400, "server rejects a chest above the reached prosperity");
    const capped = await fx.invoke("POST", "/progression2/town/build", { facilityId: "guild_bank" });
    assert.equal(capped.statusCode, 400, "server enforces the hall cap");

    const latest = await fx.storage.getOrCreatePlayerState(fx.userId, pack.version);
    const fight = await fx.invoke("POST", "/progression2/arena/challenge", { rung: 1, expectedRevision: latest.stateRevision });
    assert.equal(fight.statusCode, 200);
    assert.equal(fight.payload.challenge.won, true);
    assert.equal(fight.payload.challenge.rung, 1);
    assert.equal(fight.payload.arena.arena.rung, 1);
    assert.equal(fight.payload.arena.arena.attemptsLeft, ARENA_DAILY_ATTEMPTS - 1);
    assert.ok(fight.payload.inventory.gold > 5000);
    const rev1 = fight.payload.stateRevision;
    assert.ok(rev1 > rev0);

    const stale = await fx.invoke("POST", "/progression2/town/build", { facilityId: "town_hall", expectedRevision: rev0 });
    assert.equal(stale.statusCode, 409);
    const again = await fx.invoke("POST", "/progression2/arena/challenge", { rung: 1 });
    assert.equal(again.statusCode, 400, "the client's stale rung is rejected server-side");

    const build = await fx.invoke("POST", "/progression2/town/build", { facilityId: "town_hall", expectedRevision: rev1 });
    assert.equal(build.statusCode, 200);
    assert.equal(build.payload.upgrade.level, 1);
    assert.equal(build.payload.arena.town.facilities.find((f: any) => f.id === "town_hall").level, 1);

    const saved = await fx.storage.getOrCreatePlayerState(fx.userId, pack.version);
    assert.equal(saved.skyArena?.rung, 1);
    assert.equal(saved.skyArena?.attemptsUsed, 1);
    assert.equal(saved.guildTown?.facilities.town_hall, 1);
    assert.equal(saved.inventory.lumber_1, undefined);

    // daily limit enforced server-side
    saved.skyArena!.attemptsUsed = ARENA_DAILY_ATTEMPTS;
    await fx.storage.savePlayerState(fx.userId, saved);
    const tired = await fx.invoke("POST", "/progression2/arena/challenge", {});
    assert.equal(tired.statusCode, 400);
  });
});
