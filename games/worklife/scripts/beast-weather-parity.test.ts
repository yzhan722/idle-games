import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import packJson from "../shared/enhanced_content_pack_chinese.json";
import type { ContractBeastId, EnhancedContentPack } from "../backend/src/types";
import * as BE from "../backend/src/progression2";
import { defaultEnhancedPlayerState } from "../backend/src/storage";
import { ensureCombatSkills } from "../backend/src/combat_skills";
import { abilityCatalog, learnFromBook, setAbilityLoadout } from "../backend/src/abilities";
import { hitDamage, monsterCombatant, playerCombatant } from "../backend/src/first_hour_combat";
import { chooseBuild, playerBuildExtras, startHpCombat } from "../backend/src/hp_combat";
import { abilitySlotCount, arenaCombatSheet, combatSheetFromPack, combinedBuildFromState } from "../frontend/src/gameplay/combatSheet";
import { previewAbilities, previewFight } from "../frontend/src/gameplay/fightPreview";
import { previewArenaDuel } from "../frontend/src/gameplay/arenaTown";
import * as FE from "../frontend/src/gameplay/beastWeather";

const pack = packJson as EnhancedContentPack;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const CORE_START = "/* ---- 以下为与后端逐字对称的表与纯函数（WL-14 core） ---- */";
const CORE_END = "/* ---- 以上为 WL-14 core ---- */";

function coreOf(file: string): string {
  const src = readFileSync(path.join(root, file), "utf8").replace(/\r\n/g, "\n");
  const a = src.indexOf(CORE_START);
  const b = src.indexOf(CORE_END);
  assert.ok(a >= 0 && b > a, `WL-14 core markers missing in ${file}`);
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

const BEASTS = ["bloom_bee", "echo_bat", "mire_toad", "frostmane_wolf", "ember_hound", "chrono_wyrm"] as const;
const WEATHERS = ["sunny", "rain", "fog", "storm", "aurora"] as const;

type Loadout = {
  weapon?: string;
  armor?: string[];
  build?: "sharpened_edge" | "thick_bark";
  chapter2?: "heavy_sunder" | "quenched_thorns";
  skills?: Partial<Record<"stamina" | "intelligence" | "attack" | "defense" | "melee" | "ranged" | "magic", number>>;
  abilities?: Array<{ abilityId: string; trigger?: { type: string; pct?: number } }>;
  beasts?: Partial<Record<ContractBeastId, number>>;
  active?: ContractBeastId | null;
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
  if (l.beasts) {
    const br = BE.ensureBeastRanch(state);
    for (const [id, level] of Object.entries(l.beasts)) {
      (br.beasts as any)[id] = { xp: BE.BEAST_LEVEL_XP[(level as number) - 1], fed: 0, tamedAt: "2026-11-01T00:00:00.000Z" };
    }
    br.activeBeastId = l.active ?? null;
    BE.ensureBeastRanch(state);
  }
  return state;
}

const LOADOUTS: Array<[string, Loadout]> = [
  ["unarmed, no ranch", {}],
  ["wooden sword + bee out (gather role: no combat stats)", { weapon: "weapon_wooden_sword", armor: ["armor_wood_chest"], build: "sharpened_edge", beasts: { bloom_bee: 6 }, active: "bloom_bee" }],
  ["iron sword + wolf Lv.3", {
    weapon: "weapon_iron_sword",
    armor: ["armor_wood_chest"],
    build: "thick_bark",
    skills: { stamina: 14, attack: 16, defense: 12, melee: 14, intelligence: 6 },
    beasts: { frostmane_wolf: 3, bloom_bee: 2 },
    active: "frostmane_wolf",
  }],
  ["bow + wolf Lv.10 benched (bond only)", {
    weapon: "weapon_wooden_bow",
    armor: ["armor_wood_chest"],
    skills: { ranged: 18, attack: 10, stamina: 12 },
    beasts: { frostmane_wolf: 10, echo_bat: 4 },
    active: "echo_bat",
  }],
  ["staff magic + wyrm Lv.5 + smash/heavy", {
    weapon: "weapon_staff_t1",
    armor: ["armor_wood_chest"],
    skills: { magic: 16, intelligence: 12, stamina: 12 },
    abilities: [{ abilityId: "smash" }, { abilityId: "heavy_chop" }],
    beasts: { chrono_wyrm: 5 },
    active: "chrono_wyrm",
  }],
  ["frost blade sunder + wolf Lv.10 + bond 24", {
    weapon: "weapon_frost_blade",
    armor: ["armor_frost_chest", "armor_frost_legs"],
    chapter2: "heavy_sunder",
    skills: { stamina: 40, attack: 38, defense: 32, melee: 40, intelligence: 22 },
    abilities: [{ abilityId: "heavy_chop", trigger: { type: "enemy_guard" } }, { abilityId: "smash" }],
    beasts: { frostmane_wolf: 10, bloom_bee: 8, mire_toad: 6 },
    active: "frostmane_wolf",
  }],
  ["thorns tank + wyrm Lv.8 + brace/heal", {
    weapon: "weapon_steel_axe",
    armor: ["armor_iron_chest", "armor_iron_legs"],
    chapter2: "quenched_thorns",
    skills: { stamina: 60, attack: 30, defense: 55, melee: 30, intelligence: 30 },
    abilities: [
      { abilityId: "brace" },
      { abilityId: "minor_heal", trigger: { type: "self_hp_below", pct: 60 } },
      { abilityId: "heavy_chop", trigger: { type: "enemy_guard" } },
    ],
    beasts: { chrono_wyrm: 8, frostmane_wolf: 9, ember_hound: 7 },
    active: "chrono_wyrm",
  }],
  ["myth endgame + full ranch (wyrm Lv.10 out, bond tier 5)", {
    weapon: "weapon_myth_blade",
    armor: ["armor_myth_chest", "armor_myth_legs", "armor_myth_head", "armor_myth_feet", "armor_myth_hands"],
    skills: { stamina: 120, attack: 120, defense: 110, melee: 125, intelligence: 60 },
    abilities: [
      { abilityId: "brace" },
      { abilityId: "minor_heal", trigger: { type: "self_hp_below", pct: 55 } },
      { abilityId: "heavy_chop" },
    ],
    beasts: { bloom_bee: 10, echo_bat: 10, mire_toad: 10, frostmane_wolf: 10, ember_hound: 10, chrono_wyrm: 10 },
    active: "chrono_wyrm",
  }],
];

describe("WL-14 backend <-> frontend Contract Beast Ranch & Weather Divination Tower 1:1 parity", () => {
  it("keeps the WL-14 core source region byte-identical on both sides", () => {
    assert.equal(coreOf("frontend/src/gameplay/beastWeather.ts"), coreOf("backend/src/progression2/beast_weather.ts"));
  });

  it("keeps every static WL-14 table and constant 1:1 identical, backed by real bosses, drops, cooked food, skills and art", () => {
    const keys = [
      "CONTRACT_BEAST_IDS",
      "BEAST_ROLE_IDS",
      "WEATHER_IDS",
      "WEATHER_TZ_OFFSET_MINUTES",
      "BEAST_MAX_LEVEL",
      "BEAST_LEVEL_XP",
      "BEAST_FAVORITE_XP_PCT",
      "BEAST_FEED_MAX_QTY",
      "WEATHER_DIVINE_DUST",
      "WEATHER_WISH_CHANCE_CAP",
      "WEATHER_HISTORY_DAYS",
      "BEAST_STAT_KEYS",
      "BEAST_ROLES",
      "BEAST_FOODS",
      "CONTRACT_BEASTS",
      "BEAST_BOND_TIERS",
      "WEATHER_LIFE_SKILLS",
      "WEATHER_TYPES",
      "WEATHER_INSIGHT_TIERS",
    ] as const;
    for (const k of keys) {
      assert.deepEqual((FE as any)[k], (BE as any)[k], `table ${k} differs`);
    }
    assert.deepEqual(FE.CONTRACT_BEASTS.map((b) => b.id), [...FE.CONTRACT_BEAST_IDS]);
    assert.deepEqual(FE.BEAST_ROLES.map((r) => r.id), [...FE.BEAST_ROLE_IDS]);
    assert.deepEqual(FE.WEATHER_TYPES.map((w) => w.id), [...FE.WEATHER_IDS]);
    assert.equal(FE.BEAST_LEVEL_XP.length, FE.BEAST_MAX_LEVEL);
    FE.BEAST_LEVEL_XP.forEach((x, i) => assert.ok(i === 0 ? x === 0 : x > FE.BEAST_LEVEL_XP[i - 1]));
    assert.equal(FE.WEATHER_TYPES.reduce((s, w) => s + w.weight, 0), 100);
    for (const role of FE.BEAST_ROLE_IDS) assert.equal(FE.CONTRACT_BEASTS.filter((b) => b.role === role).length, 2, `two ${role} beasts`);

    const itemIds = new Set((pack.items as Array<{ id: string }>).map((i) => i.id));
    const skillIds = new Set((pack.skills as Array<{ id: string }>).map((s) => s.id));
    const cooking = new Set(
      (pack.actions as any[]).filter((a) => a.skillId === "skill_cooking").flatMap((a) => (a.yields || []).map((y: any) => y.itemId))
    );
    for (const f of FE.BEAST_FOODS) assert.ok(cooking.has(f.itemId), `${f.itemId} is a cooking product`);
    let prevBossLevel = 0;
    for (const b of FE.CONTRACT_BEASTS) {
      const boss = (pack.monsters as any[]).find((m) => m.id === b.bossId);
      assert.ok(boss?.isBoss, `${b.id}: ${b.bossId} is a pack boss`);
      assert.ok(boss.level > prevBossLevel, "beasts unlock along the boss ladder");
      prevBossLevel = boss.level;
      assert.ok((pack.monsters as any[]).some((m) => m.id === b.artId), `${b.id}: portrait ${b.artId} is a pack monster`);
      const drops = new Set<string>((boss.drops || []).map((d: any) => d.itemId));
      const rare = (pack.items as Array<{ id: string; name?: string }>).find((i) => i.id === boss.rare || i.name === boss.rare);
      if (rare) drops.add(rare.id);
      const ids = Object.keys(b.tameItems);
      assert.ok(ids.some((id) => drops.has(id)), `${b.id} needs a real drop of ${b.bossId}`);
      assert.ok(ids.some((id) => cooking.has(id)), `${b.id} needs a cooked food`);
      for (const id of ids) assert.ok(itemIds.has(id) && (drops.has(id) || cooking.has(id)), `${b.id}: ${id}`);
      assert.ok(cooking.has(b.favoriteFood) && FE.getBeastFoodXp(b.favoriteFood) > 0, `${b.id} favourite ${b.favoriteFood} is feedable`);
      assert.ok(b.tameGold > 0);
    }
    for (const s of FE.WEATHER_LIFE_SKILLS) assert.ok(skillIds.has(s.skillId), `${s.skillId} is a pack skill`);
    for (const w of FE.WEATHER_TYPES) {
      for (const k of Object.keys(w.outputPct)) assert.ok(FE.WEATHER_LIFE_SKILLS.some((s) => s.skillId === k), `${w.id}: ${k} is a life skill`);
    }
  });

  it("matches UTC+8 day keys, natural weather, insight, wish chances and wish rolls across three years", () => {
    const start = Date.parse("2025-12-01T00:00:00.000Z");
    for (let t = start; t < start + 3 * 366 * 86_400_000; t += 5 * 3_600_000) {
      const idx = FE.weatherDayIndex(t);
      assert.equal(idx, BE.weatherDayIndex(new Date(t)));
      assert.equal(FE.weatherDayKey(new Date(t)), BE.weatherDayKey(t));
      assert.equal(FE.weatherDayEndsAtMs(t), BE.weatherDayEndsAtMs(t));
      assert.ok(FE.weatherDayEndsAtMs(t) > t && FE.weatherDayEndsAtMs(t) - t <= 86_400_000);
    }
    const first = FE.weatherDayIndex(start);
    for (let d = first - 5; d < first + 1100; d++) {
      assert.equal(FE.getNaturalWeather(d), BE.getNaturalWeather(d), `day ${d}`);
      const key = FE.weatherDayKeyFromIndex(d);
      assert.equal(key, BE.weatherDayKeyFromIndex(d));
      assert.equal(FE.weatherDayIndexFromKey(key), d);
      assert.equal(BE.weatherDayIndexFromKey(key), d);
      for (const w of WEATHERS) {
        assert.equal(FE.rollWeatherWish(d, w, 36), BE.rollWeatherWish(d, w, 36));
      }
    }
    for (const key of ["2026-11-18", "2026-02-30", "2026-13-01", "", null, 7, "2026-1-1", "2026-11-18T00"]) {
      assert.equal(FE.weatherDayIndexFromKey(key), BE.weatherDayIndexFromKey(key), `key ${String(key)}`);
    }
    for (let a = -5; a < 40; a++) for (let b = -2; b < 33; b++) assert.equal(FE.weatherHash(a, b), BE.weatherHash(a, b));
    for (const n of [-1, 0, 2, 3, 7, 8, 15, 16, 29, 30, 500, Number.NaN, "9" as any]) {
      assert.deepEqual(FE.getWeatherInsight(n), BE.getWeatherInsight(n));
      for (const w of [...WEATHERS, "hail"]) assert.equal(FE.getWeatherWishChance(n, w), BE.getWeatherWishChance(n, w));
    }
    for (const w of WEATHERS) {
      for (const s of [...FE.WEATHER_LIFE_SKILLS.map((x) => x.skillId), "skill_combat", "nope"]) {
        assert.equal(FE.getWeatherOutputPct(w, s), BE.getWeatherOutputPct(w, s));
      }
    }
  });

  it("matches beast levels, stats, feed plans, bond tiers and getBeastRanchBonuses for random and dirty ranches", () => {
    for (let xp = -20; xp <= 3700; xp += 7) {
      assert.equal(FE.getBeastLevel(xp), BE.getBeastLevel(xp));
      assert.deepEqual(FE.getBeastLevelProgress(xp), BE.getBeastLevelProgress(xp));
    }
    for (const id of BEASTS) {
      for (let lv = -1; lv <= 11; lv++) assert.deepEqual(FE.getBeastStatsAtLevel(id, lv), BE.getBeastStatsAtLevel(id, lv), `${id} Lv.${lv}`);
    }
    const rnd = lcg(14);
    const foods = [...FE.BEAST_FOODS.map((f) => f.itemId), "wood_1", ""];
    let plans = 0;
    for (let n = 0; n < 2000; n++) {
      const beast = rnd() < 0.05 ? "dragon" : BEASTS[Math.floor(rnd() * BEASTS.length)];
      const xp = Math.floor(rnd() * 3800) - (rnd() < 0.05 ? 50 : 0);
      const food = foods[Math.floor(rnd() * foods.length)];
      const qty = rnd() < 0.05 ? 0 : Math.floor(rnd() * 55);
      assert.deepEqual(FE.planBeastFeed(beast, xp, food, qty), BE.planBeastFeed(beast, xp, food, qty));
      plans += 1;
    }
    assert.equal(plans, 2000);

    let checked = 0;
    for (let n = 0; n < 600; n++) {
      const beasts: Record<string, unknown> = {};
      for (const id of BEASTS) {
        const r = rnd();
        if (r < 0.35) continue;
        beasts[id] = r < 0.4 ? "x" : { xp: Math.floor(rnd() * 4000) - (r < 0.45 ? 100 : 0) };
      }
      if (rnd() < 0.1) beasts.dragon = { xp: 500 };
      const pick = rnd();
      const activeBeastId = pick < 0.15 ? null : pick < 0.2 ? "dragon" : BEASTS[Math.floor(rnd() * BEASTS.length)];
      const holder = { beastRanch: { beasts, activeBeastId } };
      const fe = FE.getBeastRanchBonuses(holder);
      const be = BE.getBeastRanchBonuses(holder as any);
      if (JSON.stringify(fe) !== JSON.stringify(be)) assert.deepEqual(fe, be, JSON.stringify(holder));
      assert.deepEqual(FE.cleanBeastLevels(beasts), BE.cleanBeastLevels(beasts));
      assert.deepEqual(FE.getBeastBond(FE.cleanBeastLevels(beasts)), BE.getBeastBond(BE.cleanBeastLevels(beasts)));
      checked += 1;
    }
    assert.ok(checked >= 600);
    for (const d of [null, {}, { beastRanch: null }, { beastRanch: { beasts: [1, 2], activeBeastId: "bloom_bee" } }, { beastRanch: { beasts: "x" } }]) {
      assert.deepEqual(FE.getBeastRanchBonuses(d as any), BE.getBeastRanchBonuses(d as any));
    }
    const full = Object.fromEntries(BEASTS.map((id) => [id, { xp: 99999 }]));
    const top = FE.getBeastRanchBonuses({ beastRanch: { beasts: full, activeBeastId: "chrono_wyrm" } });
    assert.equal(top.bondTier, 5);
    assert.equal(top.bondLevels, 60);
    assert.equal(top.bonusAtk, 70 + 10);
    assert.equal(top.bonusHp, 320 + 60);
    assert.equal(top.goldGainPct, 5 + 4);
  });

  it("matches getWeatherForDay / getWeatherTowerEffect for random towers, forecasts and instants", () => {
    const rnd = lcg(141);
    const t0 = Date.parse("2026-11-01T00:00:00.000Z");
    for (let n = 0; n < 800; n++) {
      const t = t0 + Math.floor(rnd() * 90 * 86_400_000);
      const idx = FE.weatherDayIndex(t);
      const forecasts: unknown[] = [];
      for (let k = 0; k < 3; k++) {
        if (rnd() < 0.5) continue;
        forecasts.push({
          dayKey: FE.weatherDayKeyFromIndex(idx + Math.floor(rnd() * 3) - 1),
          wish: rnd() < 0.1 ? "hail" : WEATHERS[Math.floor(rnd() * WEATHERS.length)],
          granted: rnd() < 0.5 ? true : rnd() < 0.5 ? "yes" : false,
        });
      }
      if (rnd() < 0.05) forecasts.push("junk");
      const holder = rnd() < 0.15 ? {} : { weatherTower: rnd() < 0.05 ? { forecasts: "x" } : { forecasts } };
      assert.deepEqual(FE.getWeatherTowerEffect(holder as any, t), BE.getWeatherTowerEffect(holder as any, new Date(t)));
      const key = FE.weatherDayKeyFromIndex(idx);
      assert.equal(FE.getWeatherForDay(key, (holder as any).weatherTower), BE.getWeatherForDay(key, (holder as any).weatherTower));
    }
  });

  it("keeps combat build (companion atk / def / hp / gold), combat sheet, HP combat and hit damage 1:1", () => {
    const normalMonster = (pack.monsters as any[]).find((m) => !m.isBoss && Number(m.def || 0) > 10) || (pack.monsters as any[])[0];
    const fightPack = {
      ...pack,
      actions: (pack.actions as any[]).map((x: any) => (String(x.id).startsWith("act_combat_") ? { ...x, requirements: {} } : x)),
    } as EnhancedContentPack;
    const T0 = new Date("2026-11-18T12:00:00.000Z");
    for (const [label, l] of LOADOUTS) {
      const state = makePlayer(l);
      assert.deepEqual(FE.getBeastRanchBonuses(state as any), BE.getBeastRanchBonuses(state), label);
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

  it("replays WL-13 arena duels identically with combat companions out: backend hp_combat sandbox vs frontend previewFight", () => {
    const T0 = new Date("2026-11-18T12:00:00.000Z");
    const season = BE.getArenaSeasonIndex(T0);
    let duels = 0;
    let wins = 0;
    let companionMattered = 0;
    for (const [label, l] of LOADOUTS) {
      const state = makePlayer(l);
      const sheet = arenaCombatSheet(state as any, pack.items as any, pack.equipmentSets as any);
      const abilities = previewAbilities(state.abilityLoadout, state.abilities, abilityCatalog() as any, abilitySlotCount(state as any));
      const bare = makePlayer({ ...l, beasts: undefined, active: undefined });
      for (const rung of [1, 3, 5, 8, 10, 12, 15, 18, 20, 23, 25, 28, 30]) {
        const champion = BE.generateArenaChampion(season, rung);
        const be = BE.simulateArenaDuel(state, pack, champion, T0);
        const fe = previewArenaDuel(sheet, champion as any, abilities, pack.bossMechanics as any);
        const tag = `${label} / rung ${rung} (${champion.name})`;
        assert.equal(fe.won, be.won, `${tag}: outcome be=${JSON.stringify(be)} fe=${JSON.stringify(fe)}`);
        assert.equal(fe.timeout, be.timeout, `${tag}: timeout`);
        assert.equal(fe.playerMaxHp, be.playerMaxHp, `${tag}: max hp`);
        assert.equal(fe.enemyMaxHp, be.enemyMaxHp, `${tag}: enemy max hp`);
        if (!be.timeout) {
          assert.equal(fe.playerHpLeft, be.playerHpLeft, `${tag}: player hp left`);
          assert.equal(fe.enemyHpLeft, be.enemyHpLeft, `${tag}: enemy hp left`);
          assert.equal(fe.durationMs, be.durationMs, `${tag}: duration`);
        }
        if (BE.simulateArenaDuel(bare, pack, champion, T0).playerMaxHp !== be.playerMaxHp) companionMattered += 1;
        duels += 1;
        if (be.won) wins += 1;
      }
    }
    assert.equal(duels, LOADOUTS.length * 13);
    assert.ok(wins > 10 && duels - wins > 10, `both outcomes appear (w=${wins} / ${duels})`);
    assert.ok(companionMattered >= 13 * 4, "combat companions really change the arena build");
  });
});
