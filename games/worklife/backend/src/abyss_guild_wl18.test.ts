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
import { defaultCombatSkills } from "./combat_skills";
import {
  ABYSS_DIVES_PER_LAYER_PER_DAY,
  ABYSS_GEARS,
  ABYSS_RUINS,
  GUILD_BONUS_CAPS,
  GUILD_RANKS,
  GUILD_SEATS,
  GUILD_WAR_SWEEP_BONUS,
  GUILD_WAR_WEEKLY_ATTEMPTS,
  abyssDayIndex,
  abyssDayKey,
  abyssDayKeyFromIndex,
  challengeGuildWar,
  diveAbyssRuin,
  doPrestige,
  ensureAbyssDive,
  ensureGuildWar,
  generateGuildWarOpponent,
  getAbyssGuildInfo,
  getAbyssRuin,
  getAbyssSalvage,
  getGuildWarBonuses,
  guildWarOpponentMonster,
  guildWarWeekIndex,
  guildWarWeekKey,
  guildWarWeekKeyFromIndex,
  performReincarnation,
  simulateSandboxDuel,
  upgradeAbyssGear,
} from "./progression2";
import { playerBuildExtras } from "./hp_combat";
import { defaultEnhancedPlayerState, ensurePlayerExtensions, getActionRates } from "./storage";

const pack = packJson as EnhancedContentPack;
/** 历史时刻：2026 年 7 月 8 日（周三，东八区 17:00），与墙钟日期不同，确保「无参 ensure 不按墙钟推进」的断言有意义。 */
const T0 = new Date("2026-07-08T09:00:00.000Z");
const DAY_MS = 86_400_000;
const T0_DAY = abyssDayIndex(T0);
const at = (dayIdx: number, hourUtc8 = 12) => new Date(dayIdx * DAY_MS + (hourUtc8 - 8) * 3_600_000);
const snap = (s: EnhancedPlayerState) => JSON.stringify([s.inventory, s.abyssDive ?? null, s.guildWar ?? null]);

/** 厨师（钓鱼）练到 chef 级、战斗技能全 combat 级的冒险者（金币充足）。 */
function diver(chef = 1, combat = 1, gold = 1_000_000) {
  const s = defaultEnhancedPlayerState(pack.version);
  (s.skills as any).skill_chef.level = chef;
  s.combatSkills = defaultCombatSkills(combat);
  (s as any).chapter1Build = "thick_bark";
  s.inventory.gold = gold;
  return s;
}

async function routeFixture(patch?: (state: EnhancedPlayerState) => void) {
  const storage = createMemoryStorage();
  const user = await storage.findOrCreateGuestUser(`wl18-abyss-${randomUUID()}`);
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

describe("WL-18 Abyss Ruin Dive & Adventurer Guild War backend mechanics & routes", () => {
  it("loads old saves with safe defaults (no gifts, no bonus) and sanitizes dirty dive / guild-war data", () => {
    const old = diver(50, 50);
    ensurePlayerExtensions(old);
    assert.equal(old.abyssDive, undefined, "old saves stay untouched until the panel is opened");
    assert.equal(old.guildWar, undefined);
    const fresh = diver(50, 50);
    const ad = ensureAbyssDive(fresh, T0);
    assert.deepEqual(ad, {
      dayKey: abyssDayKey(T0),
      gearLevel: 1,
      oxygenUsed: 0,
      divesToday: {},
      totalDives: 0,
      totalSalvage: 0,
      deepestLayer: 0,
      lastDive: null,
    });
    const gw = ensureGuildWar(fresh, T0);
    assert.equal(gw.weekKey, guildWarWeekKey(T0));
    assert.equal(gw.totalMedals, 0);
    assert.deepEqual(getGuildWarBonuses(fresh), { totalMedals: 0, rank: 0, rankName: GUILD_RANKS[0].name, goldGainPct: 0, xpGainPct: 0 });
    assert.deepEqual(playerBuildExtras(fresh), playerBuildExtras(old), "the guild war never touches the combat build");
    assert.equal(fresh.inventory.gold, old.inventory.gold);

    const dirty = diver();
    (dirty as any).abyssDive = {
      dayKey: "2026-13-40",
      gearLevel: 99,
      oxygenUsed: 1e9,
      divesToday: { "1": 7, "9": 1, x: "y" },
      totalDives: -3,
      totalSalvage: "lots",
      deepestLayer: 42,
      lastDive: { layer: 2, itemId: "ore_12", qty: 5, current: "calm", oxygen: 1, at: "x" },
    };
    (dirty as any).guildWar = {
      weekKey: "2026-07-08",
      attemptsUsed: 99,
      cleared: [2, 3],
      totalMedals: 1e12,
      totalDuels: 3,
      totalWins: 10,
      sweeps: 10,
      lastDuel: { weekKey: "nope", seat: 1 },
    };
    ensurePlayerExtensions(dirty);
    const a = dirty.abyssDive!;
    assert.equal(a.dayKey, abyssDayKeyFromIndex(0), "invalid keys fall back to the epoch day, never the wall clock");
    assert.equal(a.gearLevel, ABYSS_GEARS.length);
    assert.equal(a.oxygenUsed, ABYSS_GEARS[ABYSS_GEARS.length - 1].oxygen);
    assert.deepEqual(a.divesToday, { "1": ABYSS_DIVES_PER_LAYER_PER_DAY });
    assert.equal(a.totalDives, 0);
    assert.equal(a.totalSalvage, 0);
    assert.equal(a.deepestLayer, ABYSS_RUINS.length);
    assert.equal(a.lastDive, null, "salvage must match the layer's real pool");
    const g = dirty.guildWar!;
    assert.equal(g.weekKey, guildWarWeekKeyFromIndex(0), "week keys must be Mondays");
    assert.equal(g.attemptsUsed, GUILD_WAR_WEEKLY_ATTEMPTS);
    assert.deepEqual(g.cleared, [], "cleared seats must be a prefix from seat 1");
    assert.equal(g.totalMedals, 99_999);
    assert.equal(g.totalWins, 3);
    assert.equal(g.sweeps, 3);
    assert.equal(g.lastDuel, null);
  });

  it("rolls the ruin day and the guild-war week only on an explicit now (forward only)", () => {
    const s = diver(50, 50);
    ensureAbyssDive(s, T0);
    ensureGuildWar(s, T0);
    s.abyssDive!.oxygenUsed = 40;
    s.abyssDive!.divesToday = { "1": 1 };
    s.guildWar!.attemptsUsed = 3;
    s.guildWar!.cleared = [1];
    const before = snap(s);
    ensurePlayerExtensions(s);
    ensureAbyssDive(s);
    ensureGuildWar(s);
    assert.equal(snap(s), before, "no-arg calls never advance anything");
    ensureAbyssDive(s, at(T0_DAY - 1));
    ensureGuildWar(s, new Date(T0.getTime() - 9 * DAY_MS));
    assert.equal(snap(s), before, "clock going backwards never rolls back");
    ensureAbyssDive(s, at(T0_DAY + 1, 0));
    assert.equal(s.abyssDive!.dayKey, abyssDayKeyFromIndex(T0_DAY + 1));
    assert.equal(s.abyssDive!.oxygenUsed, 0);
    assert.deepEqual(s.abyssDive!.divesToday, {});
    const w = guildWarWeekIndex(T0);
    ensureGuildWar(s, new Date(guildWarWeekKeyFromIndex(w + 1) + "T00:00:00.000+08:00"));
    assert.equal(s.guildWar!.weekKey, guildWarWeekKeyFromIndex(w + 1));
    assert.equal(s.guildWar!.attemptsUsed, 0);
    assert.deepEqual(s.guildWar!.cleared, []);
  });

  it("dives by gear depth, real chef level, daily dives and oxygen, putting real salvage into the bag; rejects without mutation", () => {
    const s = diver(25);
    ensureAbyssDive(s, T0);
    const before = snap(s);
    assert.match(diveAbyssRuin(s, pack, 2, T0).reason!, /潜水装备/);
    assert.match(diveAbyssRuin(s, pack, 9, T0).reason!, /未知/);
    assert.match(diveAbyssRuin(s, pack, 1, T0, "2001-01-01").reason!, /日期已更替/);
    assert.equal(snap(s), before, "rejections never mutate");

    const s1 = getAbyssSalvage(T0_DAY, 1, 1);
    const r1 = diveAbyssRuin(s, pack, 1, T0, abyssDayKey(T0));
    assert.equal(r1.ok, true);
    assert.equal(r1.itemId, s1.itemId);
    assert.equal(r1.qty, s1.qty);
    assert.equal(s.inventory[s1.itemId], s1.qty, "salvage lands in the bag as an existing material");
    assert.equal(s.abyssDive!.oxygenUsed, s1.oxygenCost);
    assert.equal(s.abyssDive!.divesToday["1"], 1);
    assert.equal(s.abyssDive!.totalDives, 1);
    assert.equal(s.abyssDive!.deepestLayer, 1);
    assert.ok(ABYSS_RUINS[0].salvage.includes(s.abyssDive!.lastDive!.itemId));
    const r2 = diveAbyssRuin(s, pack, 1, T0);
    if (s1.oxygenCost * 2 <= ABYSS_GEARS[0].oxygen) {
      assert.equal(r2.ok, true);
      assert.match(diveAbyssRuin(s, pack, 1, T0).reason!, /已下潜/);
    } else {
      assert.match(r2.reason!, /氧气不足/);
    }

    // chef gate on a deeper layer
    const g2 = diver(19);
    ensureAbyssDive(g2, T0).gearLevel = 2;
    assert.match(diveAbyssRuin(g2, pack, 2, T0).reason!, /厨师/);
    (g2.skills as any).skill_chef.level = 20;
    assert.equal(diveAbyssRuin(g2, pack, 2, T0).ok, true);

    // oxygen runs out: layer 2 costs more than what is left
    const o = diver(99);
    ensureAbyssDive(o, T0).gearLevel = 2;
    o.abyssDive!.oxygenUsed = ABYSS_GEARS[1].oxygen - getAbyssRuin(T0_DAY, 2).oxygenCost + 1;
    const ob = snap(o);
    assert.match(diveAbyssRuin(o, pack, 2, T0).reason!, /氧气不足/);
    assert.equal(snap(o), ob);
  });

  it("upgrades the diving gear with real crafted goods and gold", () => {
    const s = diver(1, 1, 1999);
    ensureAbyssDive(s, T0);
    assert.match(upgradeAbyssGear(s, pack, T0).reason!, /金币不足/);
    s.inventory.gold = 2000;
    assert.match(upgradeAbyssGear(s, pack, T0).reason!, /材料不足/);
    s.inventory.leather_hide = 8;
    s.inventory.ingot_2 = 12;
    const r = upgradeAbyssGear(s, pack, T0);
    assert.equal(r.ok, true);
    assert.equal(r.gearLevel, 2);
    assert.equal(s.inventory.gold, 0);
    assert.equal(s.inventory.leather_hide, undefined);
    assert.equal(s.inventory.ingot_2, undefined);
    assert.equal(s.abyssDive!.gearLevel, 2);
    s.abyssDive!.gearLevel = ABYSS_GEARS.length;
    assert.match(upgradeAbyssGear(s, pack, T0).reason!, /最高等级/);
  });

  it("settles guild-war seats with the arena sandbox (simulateSandboxDuel) on real monster stats, in order, with weekly attempts and medals", () => {
    const weak = diver(1, 1);
    ensureGuildWar(weak, T0);
    const w = guildWarWeekIndex(T0);
    const o1 = generateGuildWarOpponent(w, 1);
    const expected = simulateSandboxDuel(weak, pack, guildWarOpponentMonster(o1), T0);
    const before = JSON.stringify(weak.inventory);
    const lose = challengeGuildWar(weak, pack, 1, T0, guildWarWeekKey(T0));
    assert.equal(lose.ok, true);
    assert.deepEqual(lose.duel, expected, "the result is exactly the shared arena sandbox duel");
    assert.equal(lose.won, false);
    assert.equal(lose.medals, 0);
    assert.equal(weak.guildWar!.attemptsUsed, 1, "losses still cost an attempt");
    assert.deepEqual(weak.guildWar!.cleared, []);
    assert.equal(JSON.stringify(weak.inventory), before, "the sandbox never touches the real save");
    assert.match(challengeGuildWar(weak, pack, 2, T0).reason!, /需先击败/);
    assert.match(challengeGuildWar(weak, pack, 1, T0, "2001-01-01").reason!, /已换周/);
    assert.match(challengeGuildWar(weak, undefined, 1, T0).reason!, /缺少内容包/);

    const strong = diver(1, 100);
    ensureGuildWar(strong, T0);
    const win = challengeGuildWar(strong, pack, 1, T0);
    assert.equal(win.won, true);
    assert.equal(win.medals, GUILD_SEATS[0].medals);
    assert.deepEqual(strong.guildWar!.cleared, [1]);
    assert.equal(strong.guildWar!.totalMedals, GUILD_SEATS[0].medals);
    assert.match(challengeGuildWar(strong, pack, 1, T0).reason!, /本周已击败/);

    // weekly attempts run out
    strong.guildWar!.attemptsUsed = GUILD_WAR_WEEKLY_ATTEMPTS;
    const sb = snap(strong);
    assert.match(challengeGuildWar(strong, pack, 2, T0).reason!, /次数已用完/);
    assert.equal(snap(strong), sb);

    // the fifth seat gives the sweep bonus
    const champ = diver(1, 100);
    ensureGuildWar(champ, T0).cleared = [1, 2, 3, 4];
    const o5 = generateGuildWarOpponent(w, 5);
    const d5 = simulateSandboxDuel(champ, pack, guildWarOpponentMonster(o5), T0);
    const r5 = challengeGuildWar(champ, pack, 5, T0);
    assert.equal(r5.won, d5.won);
    if (r5.won) {
      assert.equal(r5.medals, GUILD_SEATS[4].medals + GUILD_WAR_SWEEP_BONUS);
      assert.equal(champ.guildWar!.sweeps, 1);
    }
  });

  it("wires capped guild-rank bonuses into getActionRates (xp / gold) but never into the combat build", () => {
    const base = diver(30, 30);
    const vet = diver(30, 30);
    ensureGuildWar(vet, T0).totalMedals = 1e9;
    ensurePlayerExtensions(vet);
    const b = getGuildWarBonuses(vet);
    assert.equal(b.goldGainPct, GUILD_BONUS_CAPS.goldGainPct);
    assert.equal(b.xpGainPct, GUILD_BONUS_CAPS.xpGainPct);
    const act = (pack.actions as any[]).find((a) => a.id === "act_chop_wood_t1");
    const r0 = getActionRates(base, act, pack, T0);
    const r1 = getActionRates(vet, act, pack, T0);
    assert.ok(Math.abs(r1.xpMul / r0.xpMul - (1 + GUILD_BONUS_CAPS.xpGainPct / 100)) < 1e-9);
    assert.ok(Math.abs(r1.goldMul / r0.goldMul - (1 + GUILD_BONUS_CAPS.goldGainPct / 100)) < 1e-9);
    assert.deepEqual(playerBuildExtras(vet), playerBuildExtras(base));
  });

  it("keeps the diving gear, today's ruin progress, records and guild medals through doPrestige / performReincarnation", () => {
    const s = diver(60, 60);
    const ad = ensureAbyssDive(s, T0);
    ad.gearLevel = 4;
    assert.equal(diveAbyssRuin(s, pack, 1, T0).ok, true);
    const gw = ensureGuildWar(s, T0);
    gw.totalMedals = 120;
    gw.cleared = [1, 2];
    gw.attemptsUsed = 3;
    s.combatLevel = 60;
    const snapState = structuredClone([s.abyssDive, s.guildWar]);
    const bonus = getGuildWarBonuses(s);
    assert.equal(doPrestige(s).ok, true);
    assert.deepEqual([s.abyssDive, s.guildWar], snapState, "kept verbatim: no day roll, no week roll, no refill");
    assert.deepEqual(getGuildWarBonuses(s), bonus);
    // the new life must re-train fishing before the deep layers open again
    const deep = diveAbyssRuin(s, pack, 3, new Date(T0.getTime() + 60_000));
    assert.equal(deep.ok, false);
    assert.match(deep.reason!, /厨师（钓鱼）等级 36/);
    s.combatLevel = 60;
    s.skills.woodcutting = { level: 55, xp: 0 } as any;
    assert.equal(performReincarnation(s).ok, true);
    assert.deepEqual([s.abyssDive, s.guildWar], snapState);
  });

  it("keeps the WL-18 backend logic off the wall clock (explicit now only)", () => {
    const src = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "progression2/abyss_guild.ts"), "utf8");
    const wl18 = src.slice(src.indexOf("深海遗迹潜航 & 冒险者行会公会战 (WL-18)"));
    assert.ok(wl18.length > 10_000);
    assert.equal(/Date\.now\(/.test(wl18), false);
    assert.equal(/new Date\(\)/.test(wl18), false);
    assert.equal(/Math\.random/.test(wl18), false);
    assert.equal(/now: Date = new Date\(\)/.test(wl18), false, "every WL-18 command takes an explicit now");
    assert.ok(wl18.includes("simulateSandboxDuel(player, contentPack, guildWarOpponentMonster(opponent), now)"), "guild war reuses the arena sandbox");
  });

  it("exposes GET /progression2/abyss and POST abyss/* + guild-war/challenge with auth guard, strict zod schemas, server-side checks and stateRevision 409", async () => {
    const now = new Date();
    const fx = await routeFixture((s) => {
      s.inventory.gold = 50_000;
      (s.skills as any).skill_chef.level = 30;
    });
    for (const [p, body] of [
      ["/progression2/abyss/dive", { layer: 1 }],
      ["/progression2/abyss/gear", {}],
      ["/progression2/guild-war/challenge", { seat: 1 }],
    ] as const) {
      assert.equal((await fx.invoke("POST", p, body as any, null)).statusCode, 401, p);
    }
    assert.equal((await fx.invoke("GET", "/progression2/abyss", undefined, null)).statusCode, 401);

    const initial = await fx.invoke("GET", "/progression2/abyss");
    assert.equal(initial.statusCode, 200);
    assert.equal(initial.payload.dive.dayKey, abyssDayKey(now));
    assert.equal(initial.payload.dive.layers.length, ABYSS_RUINS.length);
    assert.equal(initial.payload.dive.layers[0].canDive, true);
    assert.equal(initial.payload.dive.layers[1].block, "需升级潜水装备");
    assert.ok(initial.payload.dive.layers[0].salvage.some((x: any) => x.use), "salvage links to an existing recipe");
    assert.equal(initial.payload.guild.weekKey, guildWarWeekKey(now));
    assert.equal(initial.payload.guild.seats.length, GUILD_SEATS.length);
    assert.equal(initial.payload.guild.seats[0].canChallenge, true);
    assert.equal(initial.payload.guild.attemptsLeft, GUILD_WAR_WEEKLY_ATTEMPTS);
    assert.equal(initial.payload.bonuses.goldGainPct, 0);
    const rev0 = initial.payload.stateRevision;
    const persisted = await fx.storage.getOrCreatePlayerState(fx.userId, pack.version);
    assert.ok(persisted.abyssDive && persisted.guildWar, "first GET persists both new states");

    const bad = [
      ["/progression2/abyss/dive", { layer: 0 }],
      ["/progression2/abyss/dive", { layer: 6 }],
      ["/progression2/abyss/dive", { layer: 1.5 }],
      ["/progression2/abyss/dive", { layer: "1" }],
      ["/progression2/abyss/dive", { layer: 1, qty: 99 }],
      ["/progression2/abyss/dive", { layer: 1, dayKey: "today" }],
      ["/progression2/abyss/gear", { level: 5 }],
      ["/progression2/guild-war/challenge", { seat: 0 }],
      ["/progression2/guild-war/challenge", { seat: 6 }],
      ["/progression2/guild-war/challenge", { seat: 1, won: true }],
      ["/progression2/guild-war/challenge", {}],
    ] as const;
    for (const [p, body] of bad) {
      const r = await fx.invoke("POST", p, body as any);
      assert.ok(r.statusCode >= 400 && r.statusCode < 500, `${p} ${JSON.stringify(body)} → ${r.statusCode}`);
    }
    assert.equal((await fx.invoke("POST", "/progression2/abyss/dive", { layer: 2 })).statusCode, 400, "gear too shallow");
    assert.equal((await fx.invoke("POST", "/progression2/abyss/gear", {})).statusCode, 400, "no materials");
    assert.equal((await fx.invoke("POST", "/progression2/guild-war/challenge", { seat: 2 })).statusCode, 400, "seats go in order");

    const latest = await fx.storage.getOrCreatePlayerState(fx.userId, pack.version);
    const dive = await fx.invoke("POST", "/progression2/abyss/dive", { layer: 1, dayKey: initial.payload.dive.dayKey, expectedRevision: latest.stateRevision });
    assert.equal(dive.statusCode, 200, JSON.stringify(dive.payload));
    assert.equal(dive.payload.dive.layer, 1);
    assert.equal(dive.payload.abyss.dive.layers[0].divesUsed, 1);
    assert.equal(dive.payload.inventory[dive.payload.dive.itemId], dive.payload.dive.qty);
    const rev1 = dive.payload.stateRevision;
    assert.ok(rev1 > rev0);
    const stale = await fx.invoke("POST", "/progression2/abyss/gear", { expectedRevision: rev0 });
    assert.equal(stale.statusCode, 409);

    const fight = await fx.invoke("POST", "/progression2/guild-war/challenge", { seat: 1, weekKey: initial.payload.guild.weekKey });
    assert.equal(fight.statusCode, 200, JSON.stringify(fight.payload));
    assert.equal(typeof fight.payload.challenge.won, "boolean");
    assert.equal(fight.payload.abyss.guild.attemptsLeft, GUILD_WAR_WEEKLY_ATTEMPTS - 1);
    const saved = await fx.storage.getOrCreatePlayerState(fx.userId, pack.version);
    assert.equal(saved.guildWar?.attemptsUsed, 1);
    assert.equal(getAbyssGuildInfo(saved, pack, now).dive.totals.dives, 1);
  });
});
