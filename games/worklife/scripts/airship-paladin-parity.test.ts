import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import packJson from "../shared/enhanced_content_pack_chinese.json";
import type { EnhancedContentPack, PaladinVirtueId } from "../backend/src/types";
import * as BE from "../backend/src/progression2";
import { defaultEnhancedPlayerState } from "../backend/src/storage";
import { ensureCombatSkills } from "../backend/src/combat_skills";
import { abilityCatalog, learnFromBook, setAbilityLoadout } from "../backend/src/abilities";
import { hitDamage, monsterCombatant, playerCombatant } from "../backend/src/first_hour_combat";
import { chooseBuild, playerBuildExtras, startHpCombat } from "../backend/src/hp_combat";
import { abilitySlotCount, arenaCombatSheet, combatSheetFromPack, combinedBuildFromState } from "../frontend/src/gameplay/combatSheet";
import { previewAbilities, previewFight } from "../frontend/src/gameplay/fightPreview";
import * as FE from "../frontend/src/gameplay/airshipPaladin";
import { t1KeyFor } from "../frontend/src/assets/t1/keys";

const pack = packJson as EnhancedContentPack;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const CORE_START = "/* ---- 以下为与后端逐字对称的表与纯函数（WL-16 core） ---- */";
const CORE_END = "/* ---- 以上为 WL-16 core ---- */";

function coreOf(file: string): string {
  const src = readFileSync(path.join(root, file), "utf8").replace(/\r\n/g, "\n");
  const a = src.indexOf(CORE_START);
  const b = src.indexOf(CORE_END);
  assert.ok(a >= 0 && b > a, `WL-16 core markers missing in ${file}`);
  return src.slice(a, b + CORE_END.length);
}

/** Tiny deterministic PRNG for fixture generation (independent of the code under test). */
function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const TOWNS = FE.AIRSHIP_TOWN_IDS;
const GOODS = FE.AIRSHIP_GOOD_IDS;
const ROUTES = FE.AIRSHIP_ROUTE_IDS;
const VIRTUES = FE.PALADIN_VIRTUE_IDS;

type Loadout = {
  weapon?: string;
  armor?: string[];
  build?: "sharpened_edge" | "thick_bark";
  chapter2?: "heavy_sunder" | "quenched_thorns";
  skills?: Partial<Record<"stamina" | "intelligence" | "attack" | "defense" | "melee" | "ranged" | "magic", number>>;
  abilities?: Array<{ abilityId: string; trigger?: { type: string; pct?: number } }>;
  virtues?: Partial<Record<PaladinVirtueId, number>>;
};

function makePlayer(l: Loadout) {
  const state = defaultEnhancedPlayerState(pack.version || "1.0.0");
  const eq = state.equipment as Record<string, unknown>;
  if (l.weapon) {
    state.inventory[l.weapon] = 1;
    eq.main_hand = l.weapon;
  }
  for (const id of l.armor || []) {
    const item = (pack.items as any[]).find((i) => i.id === id);
    state.inventory[id] = 1;
    eq[item?.slot || "chest"] = id;
  }
  const cs = ensureCombatSkills(state);
  for (const [id, level] of Object.entries(l.skills || {})) (cs as any)[id].level = level;
  ensureCombatSkills(state);
  if (l.build) chooseBuild(state, l.build);
  if (l.chapter2) state.chapter2Build = l.chapter2;
  if (l.abilities) {
    for (const s of l.abilities) {
      const book = abilityCatalog().find((a) => a.id === s.abilityId)?.bookItemId;
      if (book) {
        state.inventory[book] = 1;
        learnFromBook(state, pack, book);
      }
    }
    const res = setAbilityLoadout(state, l.abilities as any);
    assert.equal(res.ok, true, res.error);
  }
  if (l.virtues) {
    const pt = BE.ensurePaladinTrial(state, new Date("2026-11-18T02:00:00.000Z"));
    pt.virtues = { ...pt.virtues, ...l.virtues };
    pt.totalMedals = 500;
    BE.ensurePaladinTrial(state);
  }
  return state;
}

const LOADOUTS: Array<[string, Loadout]> = [
  ["unarmed, no vows", {}],
  ["wooden sword + valor 1", { weapon: "weapon_wooden_sword", armor: ["armor_wood_chest"], build: "sharpened_edge", virtues: { valor: 1 } }],
  ["iron sword + aegis 3 + vigor 2", {
    weapon: "weapon_iron_sword",
    armor: ["armor_wood_chest"],
    build: "thick_bark",
    skills: { stamina: 14, attack: 16, defense: 12, melee: 14, intelligence: 6 },
    virtues: { aegis: 3, vigor: 2 },
  }],
  ["steel axe tank + glory 5", {
    weapon: "weapon_steel_axe",
    armor: ["armor_iron_chest", "armor_iron_legs"],
    chapter2: "heavy_sunder",
    skills: { stamina: 40, attack: 40, defense: 40, melee: 40 },
    virtues: { glory: 5, vigor: 1 },
  }],
  ["staff magic + smash/heavy + valor 4", {
    weapon: "weapon_staff_t1",
    armor: ["armor_wood_chest"],
    skills: { magic: 16, intelligence: 12, stamina: 12 },
    abilities: [{ abilityId: "smash" }, { abilityId: "heavy_chop" }],
    virtues: { valor: 4 },
  }],
  ["frost blade sunder + all vows 3", {
    weapon: "weapon_frost_blade",
    armor: ["armor_frost_chest", "armor_frost_legs"],
    chapter2: "heavy_sunder",
    skills: { stamina: 60, attack: 58, defense: 52, melee: 60, intelligence: 22 },
    abilities: [{ abilityId: "heavy_chop", trigger: { type: "enemy_guard" } }, { abilityId: "smash" }],
    virtues: { valor: 3, aegis: 3, vigor: 3, glory: 3 },
  }],
  ["thorns tank + full vows", {
    weapon: "weapon_steel_axe",
    armor: ["armor_iron_chest", "armor_iron_legs"],
    chapter2: "quenched_thorns",
    skills: { stamina: 90, attack: 80, defense: 90, melee: 85, intelligence: 30 },
    abilities: [
      { abilityId: "brace" },
      { abilityId: "minor_heal", trigger: { type: "self_hp_below", pct: 60 } },
      { abilityId: "heavy_chop", trigger: { type: "enemy_guard" } },
    ],
    virtues: { valor: 5, aegis: 5, vigor: 5, glory: 5 },
  }],
  ["myth endgame + full vows", {
    weapon: "weapon_myth_blade",
    armor: ["armor_myth_chest", "armor_myth_legs", "armor_myth_head", "armor_myth_feet", "armor_myth_hands"],
    skills: { stamina: 120, attack: 120, defense: 110, melee: 125, intelligence: 60 },
    abilities: [
      { abilityId: "brace" },
      { abilityId: "minor_heal", trigger: { type: "self_hp_below", pct: 55 } },
      { abilityId: "heavy_chop" },
    ],
    virtues: { valor: 5, aegis: 5, vigor: 5, glory: 5 },
  }],
];

describe("WL-16 backend <-> frontend Airship Trade & Paladin Trial 1:1 parity", () => {
  it("keeps the WL-16 core source region byte-identical on both sides", () => {
    assert.equal(coreOf("frontend/src/gameplay/airshipPaladin.ts"), coreOf("backend/src/progression2.ts"));
  });

  it("keeps every static WL-16 table 1:1 identical, backed by real towns, items, monsters and boss mechanics", () => {
    const keys = [
      "AIRSHIP_TOWN_IDS",
      "AIRSHIP_GOOD_IDS",
      "AIRSHIP_ROUTE_IDS",
      "PALADIN_VIRTUE_IDS",
      "PALADIN_THEME_IDS",
      "AIRSHIP_TZ_OFFSET_MINUTES",
      "AIRSHIP_DAILY_STOCK",
      "AIRSHIP_MAX_TRADE_QTY",
      "AIRSHIP_BUY_MIN_PCT",
      "AIRSHIP_BUY_SWING_PCT",
      "AIRSHIP_SELL_SWING_PCT",
      "AIRSHIP_COUNTER_CAP",
      "AIRSHIP_XP_CARGO_CAP",
      "AIRSHIP_MIN_DURATION_PCT",
      "PALADIN_TZ_OFFSET_MINUTES",
      "PALADIN_WEEK_MS",
      "PALADIN_WEEK_EPOCH_MS",
      "PALADIN_WEEKLY_ATTEMPTS",
      "PALADIN_MAX_FIGHT_MS",
      "PALADIN_FULL_CLEAR_BONUS",
      "PALADIN_MEDAL_CAP",
      "PALADIN_VIRTUE_MAX_RANK",
      "PALADIN_VIRTUE_COSTS",
      "AIRSHIP_TOWNS",
      "AIRSHIP_GOODS",
      "AIRSHIP_HULLS",
      "AIRSHIP_ROUTES",
      "AIRSHIP_ROUTE_LEVELS",
      "PALADIN_STAT_KEYS",
      "PALADIN_BONUS_CAPS",
      "PALADIN_FOES",
      "PALADIN_STAGES",
      "PALADIN_THEMES",
      "PALADIN_VIRTUES",
      "PALADIN_HONOR_RANKS",
    ] as const;
    for (const k of keys) assert.deepEqual((FE as any)[k], (BE as any)[k], `table ${k} differs`);
    assert.deepEqual(FE.AIRSHIP_TOWNS.map((t) => t.id), [...TOWNS]);
    assert.deepEqual(FE.AIRSHIP_GOODS.map((g) => g.id), [...GOODS]);
    assert.deepEqual(FE.AIRSHIP_ROUTES.map((r) => r.id), [...ROUTES]);
    assert.deepEqual(FE.PALADIN_VIRTUES.map((v) => v.id), [...VIRTUES]);
    assert.deepEqual(FE.PALADIN_THEMES.map((v) => v.id), [...FE.PALADIN_THEME_IDS]);
    assert.equal(FE.PALADIN_MAX_FIGHT_MS, BE.ARENA_MAX_FIGHT_MS, "same sandbox limit as the sky arena");
    assert.equal(FE.PALADIN_TZ_OFFSET_MINUTES, BE.HARBOR_TZ_OFFSET_MINUTES);
    assert.equal(FE.PALADIN_WEEK_EPOCH_MS, BE.HARBOR_WEEK_EPOCH_MS, "weeks start on the same UTC+8 Monday as the harbor derby");

    // towns: the WL-13 guild town + the three WL-7 caravan towns (names and art are the existing ones)
    const guild = FE.AIRSHIP_TOWNS.find((t) => t.id === "guild_town")!;
    assert.equal(guild.artId, "guild_town");
    assert.ok(BE.TOWN_FACILITIES.length > 0, "guild town facilities exist");
    for (const t of FE.AIRSHIP_TOWNS.filter((x) => x.id !== "guild_town")) {
      const caravan = BE.CARAVAN_TRADE_ROUTES.find((r) => r.id === t.id)!;
      assert.ok(caravan, `${t.id} is a WL-7 caravan town`);
      assert.equal(t.name, caravan.townName);
      assert.equal(t.artId, caravan.iconId);
    }
    for (const t of FE.AIRSHIP_TOWNS) assert.ok(existsSync(path.join(root, "frontend/src/assets/t1/skills", `${t.artId}.webp`)), `${t.id} art`);
    // goods: real pack items priced at their item value, two specialties per town, every other town buys them
    const items = new Map((pack.items as any[]).map((i) => [i.id, i]));
    for (const g of FE.AIRSHIP_GOODS) {
      assert.equal(items.get(g.id)?.value, g.basePrice, `${g.id} base price = pack value`);
      assert.ok(existsSync(path.join(root, "frontend/src/assets/t1", `${t1KeyFor("item", g.id)}.webp`)), `${g.id} art`);
      assert.deepEqual(Object.keys(g.demand).sort(), TOWNS.filter((t) => t !== g.origin).sort(), `${g.id} demand covers every other town`);
      assert.ok(FE.AIRSHIP_HULLS.some((h) => h.level === g.minHull));
    }
    for (const t of TOWNS) assert.equal(FE.AIRSHIP_GOODS.filter((g) => g.origin === t).length, 2, `${t} has two specialties`);
    // routes form the complete graph between the four towns
    const pairs = new Set(FE.AIRSHIP_ROUTES.map((r) => [r.from, r.to].sort().join("|")));
    assert.equal(pairs.size, (TOWNS.length * (TOWNS.length - 1)) / 2);
    // hulls / route levels strictly improve; hull materials are real crafted goods
    FE.AIRSHIP_HULLS.forEach((h, i) => {
      assert.equal(h.level, i + 1);
      for (const id of Object.keys(h.materials)) assert.ok(items.has(id), `hull material ${id}`);
      if (i > 0) assert.ok(h.capacity > FE.AIRSHIP_HULLS[i - 1].capacity && h.speedPct > FE.AIRSHIP_HULLS[i - 1].speedPct && h.costGold > 0);
    });
    FE.AIRSHIP_ROUTE_LEVELS.forEach((l, i) => {
      assert.equal(l.level, i + 1);
      if (i > 0) assert.ok(l.minXp > FE.AIRSHIP_ROUTE_LEVELS[i - 1].minXp && l.sellBonusPct > FE.AIRSHIP_ROUTE_LEVELS[i - 1].sellBonusPct);
    });
    // phantoms copy the real monster combat attributes verbatim
    const monsters = new Map((pack.monsters as any[]).map((m) => [m.id, m]));
    for (const f of FE.PALADIN_FOES) {
      const m = monsters.get(f.monsterId);
      assert.ok(m, `${f.monsterId} is a pack monster`);
      assert.deepEqual(
        { name: f.name, level: f.level, hp: f.hp, atk: f.atk, def: f.def, attackIntervalMs: f.attackIntervalMs },
        { name: m.name, level: m.level, hp: m.hp, atk: m.atk, def: m.def, attackIntervalMs: m.attackIntervalMs },
        f.monsterId
      );
      assert.equal(Number(m.incomingDamageMult || 1), 1);
      assert.equal(Number(m.outgoingDamageMult || 1), 1);
    }
    for (const s of FE.PALADIN_STAGES) for (const id of s.pool) assert.ok(FE.PALADIN_FOES.some((f) => f.monsterId === id), `stage ${s.stage} foe ${id}`);
    const mechanicIds = new Set((pack.bossMechanics as any[]).map((m) => m.id));
    for (const t of FE.PALADIN_THEMES) for (const id of t.mechanics) assert.ok(mechanicIds.has(id), `${t.id} mechanic ${id} is a pack boss mechanic`);
    // every vow at max rank lands exactly on the published cap
    const maxed = FE.getPaladinTrialBonuses({ paladinTrial: { virtues: { valor: 5, aegis: 5, vigor: 5, glory: 5 } } });
    for (const k of FE.PALADIN_STAT_KEYS) assert.equal(maxed[k], FE.PALADIN_BONUS_CAPS[k], `cap ${k}`);
    assert.equal(FE.PALADIN_VIRTUE_COSTS.length, FE.PALADIN_VIRTUE_MAX_RANK);
  });

  it("matches UTC+8 day keys, daily market quotes, week keys, themes and phantoms across three years", () => {
    const start = Date.parse("2025-12-01T00:00:00.000Z");
    for (let t = start; t < start + 3 * 366 * 86_400_000; t += 5 * 3_600_000) {
      assert.equal(FE.airshipDayIndex(t), BE.airshipDayIndex(new Date(t)));
      assert.equal(FE.airshipDayKey(new Date(t)), BE.airshipDayKey(t));
      assert.equal(FE.airshipDayEndsAtMs(t), BE.airshipDayEndsAtMs(t));
      assert.equal(FE.paladinWeekIndex(t), BE.paladinWeekIndex(new Date(t)));
      assert.equal(FE.paladinWeekKey(t), BE.paladinWeekKey(new Date(t)));
      assert.equal(FE.paladinWeekEndsAtMs(t), BE.paladinWeekEndsAtMs(t));
    }
    const first = FE.airshipDayIndex(start);
    const seen = new Set<number>();
    for (let d = first - 5; d < first + 1100; d++) {
      const key = FE.airshipDayKeyFromIndex(d);
      assert.equal(key, BE.airshipDayKeyFromIndex(d));
      assert.equal(FE.airshipDayIndexFromKey(key), d);
      assert.equal(BE.airshipDayIndexFromKey(key), d);
      const market = FE.getAirshipMarket(d);
      assert.deepEqual(market, BE.getAirshipMarket(d), `day ${d}`);
      for (const m of market) for (const s of m.sells) seen.add(s.pct);
    }
    assert.ok(seen.size > 60, "sell prices really swing day to day");
    const w0 = FE.paladinWeekIndex(start);
    for (let w = w0 - 3; w < w0 + 160; w++) {
      const key = FE.paladinWeekKeyFromIndex(w);
      assert.equal(key, BE.paladinWeekKeyFromIndex(w));
      assert.equal(new Date(`${key}T00:00:00Z`).getUTCDay(), 1, "week keys are Mondays");
      assert.equal(FE.paladinWeekIndexFromKey(key), w);
      assert.equal(BE.paladinWeekIndexFromKey(key), w);
      assert.deepEqual(FE.getPaladinTheme(w), BE.getPaladinTheme(w));
      assert.deepEqual(FE.getPaladinTrialLineup(w), BE.getPaladinTrialLineup(w), `week ${w}`);
    }
    for (const key of ["2026-11-16", "2026-11-17", "2026-02-30", "2026-13-01", "", null, 7, "2026-1-1", "1970-01-05"]) {
      assert.equal(FE.airshipDayIndexFromKey(key), BE.airshipDayIndexFromKey(key), `day key ${String(key)}`);
      assert.equal(FE.paladinWeekIndexFromKey(key), BE.paladinWeekIndexFromKey(key), `week key ${String(key)}`);
    }
    for (let a = -5; a < 40; a++) for (let b = -2; b < 33; b++) assert.equal(FE.airshipHash(a, b), BE.airshipHash(a, b));
    for (const x of [Number.NaN, Number.POSITIVE_INFINITY, -1, 0.5]) {
      assert.deepEqual(FE.getAirshipMarket(x), BE.getAirshipMarket(x));
      assert.deepEqual(FE.getPaladinTrialLineup(x), BE.getPaladinTrialLineup(x));
      assert.deepEqual(FE.generatePaladinOpponent(0, x), BE.generatePaladinOpponent(0, x));
    }
  });

  it("matches buy / sell / hull / voyage / route-level plans and vow math for random and dirty inputs", () => {
    const rnd = lcg(16);
    const pick = <T>(list: readonly T[]) => list[Math.floor(rnd() * list.length)];
    const dirty = <T>(v: T) => (rnd() < 0.1 ? (pick([null, "x", -3, 1e12, Number.NaN, [], 2.5]) as unknown) : v);
    const d0 = FE.airshipDayIndex(Date.parse("2026-11-01T00:00:00.000Z"));
    let buys = 0;
    let sells = 0;
    for (let n = 0; n < 4000; n++) {
      const d = d0 + Math.floor(rnd() * 90);
      const town = rnd() < 0.05 ? "atlantis" : pick(TOWNS);
      const good = rnd() < 0.05 ? "gem_1" : pick(GOODS);
      const cargo: Record<string, unknown> = {};
      for (const g of GOODS) if (rnd() < 0.3) cargo[g] = dirty(Math.floor(rnd() * 30));
      const cost: Record<string, unknown> = {};
      for (const g of GOODS) if (rnd() < 0.4) cost[g] = dirty(Math.floor(rnd() * 4000));
      const bought: Record<string, unknown> = {};
      for (const g of GOODS) if (rnd() < 0.3) bought[g] = dirty(Math.floor(rnd() * 50));
      const hull = dirty(1 + Math.floor(rnd() * 6));
      const qty = dirty(1 + Math.floor(rnd() * 60));
      const gold = dirty(Math.floor(rnd() * 20000));
      const bonus = dirty(Math.floor(rnd() * 10));
      const fb = FE.planAirshipBuy(d, town, hull, good, qty, cargo, bought, gold);
      assert.deepEqual(fb, BE.planAirshipBuy(d, town, hull, good, qty, cargo, bought, gold));
      if (fb.ok) {
        buys += 1;
        assert.ok(fb.qty <= fb.maxQty && fb.total === fb.qty * fb.unitPrice);
      }
      const fs = FE.planAirshipSell(d, town, good, qty, cargo, cost, bonus);
      assert.deepEqual(fs, BE.planAirshipSell(d, town, good, qty, cargo, cost, bonus));
      if (fs.ok) sells += 1;
      assert.deepEqual(FE.cleanAirshipCargo(cargo), BE.cleanAirshipCargo(cargo));
      assert.equal(FE.airshipCargoUnits(cargo), BE.airshipCargoUnits(cargo));
      const route = rnd() < 0.05 ? "moon_route" : pick(ROUTES);
      const xp = dirty(Math.floor(rnd() * 120));
      assert.equal(FE.getAirshipVoyageMs(route, xp, hull), BE.getAirshipVoyageMs(route, xp, hull));
      assert.deepEqual(FE.getAirshipRouteLevel(xp), BE.getAirshipRouteLevel(xp));
      assert.equal(FE.airshipRouteDestination(route, town), BE.airshipRouteDestination(route, town));
      assert.equal(FE.airshipVoyageXp(qty), BE.airshipVoyageXp(qty));
      const inv: Record<string, unknown> = { lumber_3: dirty(Math.floor(rnd() * 30)), ingot_2: dirty(Math.floor(rnd() * 20)), lumber_4: Math.floor(rnd() * 30) };
      assert.deepEqual(FE.planAirshipHullUpgrade(hull, gold, inv), BE.planAirshipHullUpgrade(hull, gold, inv));
    }
    assert.ok(buys > 100 && sells > 100, `fixtures exercise successful trades (buy ${buys}, sell ${sells})`);

    const rnd2 = lcg(161);
    let upgrades = 0;
    for (let n = 0; n < 2000; n++) {
      const virtues: Record<string, unknown> = {};
      for (const v of VIRTUES) if (rnd2() < 0.7) virtues[v] = rnd2() < 0.1 ? "x" : Math.floor(rnd2() * 8) - 1;
      const id = rnd2() < 0.05 ? "wisdom" : VIRTUES[Math.floor(rnd2() * VIRTUES.length)];
      const medals = Math.floor(rnd2() * 80);
      const total = rnd2() < 0.1 ? "lots" : Math.floor(rnd2() * 600);
      const fp = FE.planPaladinVirtue(virtues, id, medals, total);
      assert.deepEqual(fp, BE.planPaladinVirtue(virtues, id, medals, total));
      if (fp.ok) upgrades += 1;
      assert.deepEqual(FE.getPaladinHonorRank(total), BE.getPaladinHonorRank(total));
      const holder = rnd2() < 0.05 ? null : { paladinTrial: rnd2() < 0.05 ? "x" : { virtues, totalMedals: total } };
      const fbz = FE.getPaladinTrialBonuses(holder as any);
      assert.deepEqual(fbz, BE.getPaladinTrialBonuses(holder as any));
      for (const k of FE.PALADIN_STAT_KEYS) assert.ok(fbz[k] >= 0 && fbz[k] <= FE.PALADIN_BONUS_CAPS[k], `capped ${k}`);
      const cleared = [1, 2, 3, 4, 5, 6, 7, "2", null].filter(() => rnd2() < 0.6);
      assert.deepEqual(FE.cleanPaladinCleared(cleared), BE.cleanPaladinCleared(cleared));
      const stage = Math.floor(rnd2() * 9) - 1;
      assert.deepEqual(FE.getPaladinStageReward(stage), BE.getPaladinStageReward(stage));
    }
    assert.ok(upgrades > 100, `fixtures exercise affordable upgrades (${upgrades})`);
  });

  it("keeps the combat build (vow atk / def / hp / gold), combat sheet, HP combat and hit damage 1:1", () => {
    const normalMonster = (pack.monsters as any[]).find((m) => !m.isBoss && Number(m.def || 0) > 10) || (pack.monsters as any[])[0];
    const fightPack = {
      ...pack,
      actions: (pack.actions as any[]).map((x: any) => (String(x.id).startsWith("act_combat_") ? { ...x, requirements: {} } : x)),
    } as EnhancedContentPack;
    const T0 = new Date("2026-11-18T12:00:00.000Z");
    for (const [label, l] of LOADOUTS) {
      const state = makePlayer(l);
      assert.deepEqual(FE.getPaladinTrialBonuses(state as any), BE.getPaladinTrialBonuses(state), label);
      const beExt = playerBuildExtras(state);
      const feExt = combinedBuildFromState(state as any);
      assert.ok(Math.abs(feExt.goldMult - beExt.goldMult) < 1e-9, label);
      assert.equal(feExt.atk, beExt.atk, label);
      assert.equal(feExt.hp, beExt.hp, label);
      assert.equal(feExt.def, beExt.def, label);
      const enc = startHpCombat(state, fightPack, normalMonster.id, T0);
      const sheet = combatSheetFromPack(state as any, pack.items as any, pack.equipmentSets as any);
      assert.equal(sheet.hp, enc.playerMaxHp, label);
      assert.equal(sheet.intervalMs, enc.playerIntervalMs, label);
      const bePlayer = playerCombatant(state, fightPack, beExt as any);
      assert.equal(previewFight(sheet, normalMonster as any).normalHit, hitDamage(bePlayer, monsterCombatant(normalMonster)), label);
    }
  });

  it("replays every weekly trial stage identically: backend simulatePaladinTrialDuel (hp_combat sandbox) vs frontend previewPaladinTrialDuel", () => {
    const T0 = new Date("2026-11-18T12:00:00.000Z");
    const w0 = BE.paladinWeekIndex(T0);
    let duels = 0;
    let wins = 0;
    let mattered = 0;
    const themes = new Set<string>();
    for (const [label, l] of LOADOUTS) {
      const state = makePlayer(l);
      const sheet = arenaCombatSheet(state as any, pack.items as any, pack.equipmentSets as any);
      const abilities = previewAbilities(state.abilityLoadout, state.abilities, abilityCatalog() as any, abilitySlotCount(state as any));
      const bare = makePlayer({ ...l, virtues: undefined });
      for (let w = w0; w < w0 + FE.PALADIN_THEMES.length; w++) {
        themes.add(FE.getPaladinTheme(w).id);
        for (const s of FE.PALADIN_STAGES) {
          const opponent = BE.generatePaladinOpponent(w, s.stage);
          const be = BE.simulatePaladinTrialDuel(state, pack, opponent, T0);
          const fe = FE.previewPaladinTrialDuel(sheet, opponent as any, abilities, pack.bossMechanics as any);
          const tag = `${label} / week ${w} stage ${s.stage} (${opponent.name})`;
          assert.equal(fe.won, be.won, `${tag}: outcome be=${JSON.stringify(be)} fe=${JSON.stringify(fe)}`);
          assert.equal(fe.timeout, be.timeout, `${tag}: timeout`);
          assert.equal(fe.playerMaxHp, be.playerMaxHp, `${tag}: max hp`);
          assert.equal(fe.enemyMaxHp, be.enemyMaxHp, `${tag}: enemy max hp`);
          if (!be.timeout) {
            assert.equal(fe.playerHpLeft, be.playerHpLeft, `${tag}: player hp left`);
            assert.equal(fe.enemyHpLeft, be.enemyHpLeft, `${tag}: enemy hp left`);
            assert.equal(fe.durationMs, be.durationMs, `${tag}: duration`);
          }
          if (l.virtues && BE.simulatePaladinTrialDuel(bare, pack, opponent, T0).playerMaxHp !== be.playerMaxHp) mattered += 1;
          duels += 1;
          if (be.won) wins += 1;
        }
      }
    }
    assert.equal(themes.size, FE.PALADIN_THEMES.length, "all four weekly vows (and their boss mechanics) are replayed");
    assert.equal(duels, LOADOUTS.length * FE.PALADIN_THEMES.length * FE.PALADIN_STAGES.length);
    assert.ok(wins > 20 && duels - wins > 20, `both outcomes appear (w=${wins} / ${duels})`);
    assert.ok(mattered > 0, "vow hp really changes the trial build");
  });
});
