import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import packJson from "../shared/enhanced_content_pack_chinese.json";
import type { ChronicleChapterId, EnhancedContentPack } from "../backend/src/types";
import * as BE from "../backend/src/progression2";
import { defaultEnhancedPlayerState } from "../backend/src/storage";
import { ensureCombatSkills } from "../backend/src/combat_skills";
import { abilityCatalog, learnFromBook, setAbilityLoadout } from "../backend/src/abilities";
import { hitDamage, monsterCombatant, playerCombatant } from "../backend/src/first_hour_combat";
import { chooseBuild, playerBuildExtras, startHpCombat } from "../backend/src/hp_combat";
import { abilitySlotCount, arenaCombatSheet, combatSheetFromPack, combinedBuildFromState } from "../frontend/src/gameplay/combatSheet";
import { previewAbilities, previewFight } from "../frontend/src/gameplay/fightPreview";
import { previewArenaDuel } from "../frontend/src/gameplay/arenaTown";
import * as FE from "../frontend/src/gameplay/bardTavern";
import { t1KeyFor } from "../frontend/src/assets/t1/keys";

const pack = packJson as EnhancedContentPack;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const CORE_START = "/* ---- 以下为与后端逐字对称的表与纯函数（WL-15 core） ---- */";
const CORE_END = "/* ---- 以上为 WL-15 core ---- */";

function coreOf(file: string): string {
  const src = readFileSync(path.join(root, file), "utf8").replace(/\r\n/g, "\n");
  const a = src.indexOf(CORE_START);
  const b = src.indexOf(CORE_END);
  assert.ok(a >= 0 && b > a, `WL-15 core markers missing in ${file}`);
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

const VISITORS = FE.TAVERN_VISITOR_IDS;
const BALLADS = FE.TAVERN_BALLAD_IDS;
const CHAPTERS = FE.CHRONICLE_CHAPTER_IDS;

/** Random, partly dirty save-shaped holder touching every record the chronicle reads. */
function randomHolder(rnd: () => number): Record<string, unknown> {
  const pick = <T>(list: readonly T[]) => list[Math.floor(rnd() * list.length)];
  const num = (max: number) => (rnd() < 0.08 ? (pick([-5, "7", null, Number.NaN, 1e12]) as unknown) : Math.floor(rnd() * max));
  const maybe = <T>(v: T) => (rnd() < 0.12 ? (pick([null, "x", 3, []]) as unknown) : v);
  const kills: Record<string, unknown> = {};
  for (const id of [...FE.CHRONICLE_BOSS_IDS, "slime", "fake_boss"]) if (rnd() < 0.4) kills[id] = num(30);
  const trophies: Record<string, unknown> = {};
  for (const t of [...FE.CHRONICLE_TROPHY_TIERS, "platinum"]) if (rnd() < 0.5) trophies[t] = num(4);
  const species: Record<string, unknown> = {};
  for (const id of [...FE.CHRONICLE_AQUARIUM_SPECIES, "kraken"]) if (rnd() < 0.5) species[id] = rnd() < 0.1 ? 5 : { count: num(4), bestSizeCm: 20 };
  const credits: Record<string, unknown> = {};
  for (const d of [...FE.CHRONICLE_ACADEMY_DEPTS, "magic"]) if (rnd() < 0.6) credits[d] = num(40);
  const beasts: Record<string, unknown> = {};
  for (const id of ["bloom_bee", "echo_bat", "mire_toad", "frostmane_wolf", "ember_hound", "chrono_wyrm", "dragon"]) {
    if (rnd() < 0.4) beasts[id] = rnd() < 0.1 ? "x" : { xp: num(4000) };
  }
  const inscribed = CHAPTERS.filter(() => rnd() < 0.35) as unknown[];
  if (rnd() < 0.15) inscribed.push("volume_9", inscribed[0]);
  const startedAt = new Date(Date.parse("2026-11-01T00:00:00.000Z") + Math.floor(rnd() * 20 * 86_400_000)).toISOString();
  return {
    stats: maybe({ totalBossKills: num(80), killsByMonster: maybe(kills) }),
    astralRelics: maybe({ totalSurveys: num(12), curatorRank: num(5) }),
    caravanTrade: maybe({ totalRunsCompleted: num(12) }),
    harborDerby: maybe({ trophies: maybe(trophies) }),
    harborAquarium: maybe({ species: maybe(species) }),
    adventurerAcademy: maybe({ credits: maybe(credits), totalGraduations: num(6) }),
    festivalCalendar: maybe({ keepsakes: maybe(FE.CHRONICLE_FESTIVAL_SEASONS.filter(() => rnd() < 0.4).concat(rnd() < 0.2 ? ["monsoon"] : [])) }),
    skyArena: maybe({ bestRung: num(31), totalWins: num(30), titles: maybe(FE.CHRONICLE_ARENA_DIVISIONS.filter(() => rnd() < 0.3)) }),
    beastRanch: maybe({ beasts: maybe(beasts) }),
    prestige: maybe({ count: num(4) }),
    bardTavern: maybe({
      fame: num(2400),
      activeBallad: maybe({ balladId: rnd() < 0.1 ? "lullaby" : pick(BALLADS), startedAt: rnd() < 0.1 ? "nope" : startedAt, endsAt: "2099-01-01T00:00:00.000Z" }),
    }),
    adventurerChronicle: maybe({ inscribed: maybe(inscribed), equippedTitle: rnd() < 0.2 ? "nope" : pick(CHAPTERS) }),
  };
}

type Loadout = {
  weapon?: string;
  armor?: string[];
  build?: "sharpened_edge" | "thick_bark";
  chapter2?: "heavy_sunder" | "quenched_thorns";
  skills?: Partial<Record<"stamina" | "intelligence" | "attack" | "defense" | "melee" | "ranged" | "magic", number>>;
  abilities?: Array<{ abilityId: string; trigger?: { type: string; pct?: number } }>;
  fame?: number;
  chapters?: ChronicleChapterId[];
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
  if (l.fame !== undefined) BE.ensureBardTavern(state, new Date("2026-11-18T02:00:00.000Z")).fame = l.fame;
  if (l.chapters) {
    BE.ensureAdventurerChronicle(state).inscribed = [...l.chapters];
    BE.ensureAdventurerChronicle(state);
  }
  return state;
}

const LOADOUTS: Array<[string, Loadout]> = [
  ["unarmed, no tavern", {}],
  ["wooden sword + fame tier 1 (gold only)", { weapon: "weapon_wooden_sword", armor: ["armor_wood_chest"], build: "sharpened_edge", fame: 80 }],
  ["iron sword + slayer saga", {
    weapon: "weapon_iron_sword",
    armor: ["armor_wood_chest"],
    build: "thick_bark",
    skills: { stamina: 14, attack: 16, defense: 12, melee: 14, intelligence: 6 },
    chapters: ["slayer_saga"],
  }],
  ["bow + arena epic + fame tier 3", {
    weapon: "weapon_wooden_bow",
    armor: ["armor_wood_chest"],
    skills: { ranged: 18, attack: 10, stamina: 12 },
    fame: 650,
    chapters: ["arena_epic", "harbor_log"],
  }],
  ["staff magic + slayer + arena + smash/heavy", {
    weapon: "weapon_staff_t1",
    armor: ["armor_wood_chest"],
    skills: { magic: 16, intelligence: 12, stamina: 12 },
    abilities: [{ abilityId: "smash" }, { abilityId: "heavy_chop" }],
    chapters: ["slayer_saga", "arena_epic"],
  }],
  ["frost blade sunder + fame tier 5", {
    weapon: "weapon_frost_blade",
    armor: ["armor_frost_chest", "armor_frost_legs"],
    chapter2: "heavy_sunder",
    skills: { stamina: 40, attack: 38, defense: 32, melee: 40, intelligence: 22 },
    abilities: [{ abilityId: "heavy_chop", trigger: { type: "enemy_guard" } }, { abilityId: "smash" }],
    fame: 1900,
  }],
  ["thorns tank + legend finale + all chapters", {
    weapon: "weapon_steel_axe",
    armor: ["armor_iron_chest", "armor_iron_legs"],
    chapter2: "quenched_thorns",
    skills: { stamina: 60, attack: 30, defense: 55, melee: 30, intelligence: 30 },
    abilities: [
      { abilityId: "brace" },
      { abilityId: "minor_heal", trigger: { type: "self_hp_below", pct: 60 } },
      { abilityId: "heavy_chop", trigger: { type: "enemy_guard" } },
    ],
    fame: 1000,
    chapters: [...CHAPTERS],
  }],
  ["myth endgame + full chronicle + fame tier 5", {
    weapon: "weapon_myth_blade",
    armor: ["armor_myth_chest", "armor_myth_legs", "armor_myth_head", "armor_myth_feet", "armor_myth_hands"],
    skills: { stamina: 120, attack: 120, defense: 110, melee: 125, intelligence: 60 },
    abilities: [
      { abilityId: "brace" },
      { abilityId: "minor_heal", trigger: { type: "self_hp_below", pct: 55 } },
      { abilityId: "heavy_chop" },
    ],
    fame: 5000,
    chapters: [...CHAPTERS],
  }],
];

describe("WL-15 backend <-> frontend Bard Tavern & Adventurer Chronicle 1:1 parity", () => {
  it("keeps the WL-15 core source region byte-identical on both sides", () => {
    assert.equal(coreOf("frontend/src/gameplay/bardTavern.ts"), coreOf("backend/src/progression2/bard_tavern.ts"));
  });

  it("keeps every static WL-15 table and constant 1:1 identical, backed by real cooked dishes / drinks, bosses, avatars and WL-11/12/13 ids", () => {
    const keys = [
      "TAVERN_VISITOR_IDS",
      "TAVERN_BALLAD_IDS",
      "CHRONICLE_CHAPTER_IDS",
      "CHRONICLE_METRIC_IDS",
      "TAVERN_TZ_OFFSET_MINUTES",
      "TAVERN_VISITORS_PER_DAY",
      "TAVERN_BALLADS_PER_DAY",
      "TAVERN_ORDER_MATCH_PCT",
      "TAVERN_PERFECT_BONUS_FAME",
      "CHRONICLE_METRIC_CAP",
      "CHRONICLE_BOSS_IDS",
      "CHRONICLE_TROPHY_TIERS",
      "CHRONICLE_AQUARIUM_SPECIES",
      "CHRONICLE_ACADEMY_DEPTS",
      "CHRONICLE_FESTIVAL_SEASONS",
      "CHRONICLE_ARENA_DIVISIONS",
      "TAVERN_STAT_KEYS",
      "TAVERN_MENU",
      "TAVERN_VISITORS",
      "TAVERN_BALLADS",
      "TAVERN_FAME_TIERS",
      "CHRONICLE_METRICS",
      "CHRONICLE_CHAPTERS",
    ] as const;
    for (const k of keys) {
      assert.deepEqual((FE as any)[k], (BE as any)[k], `table ${k} differs`);
    }
    assert.deepEqual(FE.TAVERN_VISITORS.map((v) => v.id), [...FE.TAVERN_VISITOR_IDS]);
    assert.deepEqual(FE.TAVERN_BALLADS.map((b) => b.id), [...FE.TAVERN_BALLAD_IDS]);
    assert.deepEqual(FE.CHRONICLE_CHAPTERS.map((c) => c.id), [...FE.CHRONICLE_CHAPTER_IDS]);
    assert.deepEqual(FE.CHRONICLE_METRICS.map((m) => m.id), [...FE.CHRONICLE_METRIC_IDS]);
    assert.ok(FE.TAVERN_VISITORS_PER_DAY < FE.TAVERN_VISITOR_IDS.length, "the guest list rotates");

    // menu = real cooking products; drinks are the MP-only consumables, dishes everything else cooked
    const items = new Map((pack.items as any[]).map((i) => [i.id, i]));
    const cooking = new Set(
      (pack.actions as any[]).filter((a) => a.skillId === "skill_cooking").flatMap((a) => (a.yields || []).map((y: any) => y.itemId))
    );
    for (const m of FE.TAVERN_MENU) {
      assert.ok(cooking.has(m.itemId), `${m.itemId} is a cooking product`);
      const fx = items.get(m.itemId)?.effect || {};
      const isDrink = Number(fx.mp || 0) > 0 && !Number(fx.hp || 0);
      assert.equal(m.kind, isDrink ? "drink" : "dish", `${m.itemId} kind`);
      assert.ok(m.fame > 0);
      assert.ok(existsSync(path.join(root, "frontend/src/assets/t1", `${t1KeyFor("item", m.itemId)}.webp`)), `${m.itemId} art`);
    }
    assert.equal(new Set(FE.TAVERN_MENU.map((m) => m.itemId)).size, FE.TAVERN_MENU.length);
    for (const v of FE.TAVERN_VISITORS) {
      assert.ok(existsSync(path.join(root, "frontend/src/assets/t1", `${t1KeyFor("ui", v.avatarId)}.webp`)), `${v.id} avatar art`);
      for (const d of v.dishes) assert.equal(FE.getTavernMenuItem(d)?.kind, "dish", `${v.id} likes dish ${d}`);
      for (const d of v.drinks) assert.equal(FE.getTavernMenuItem(d)?.kind, "drink", `${v.id} likes drink ${d}`);
      assert.ok(v.tipPerFame > 0);
    }
    // ballads unlock along real fame tiers; fame tiers strictly increase and never shrink a bonus
    for (const b of FE.TAVERN_BALLADS) assert.ok(FE.TAVERN_FAME_TIERS.some((t) => t.tier === b.minFameTier));
    FE.TAVERN_FAME_TIERS.forEach((t, i) => {
      assert.equal(t.tier, i);
      if (i === 0) return;
      const prev = FE.TAVERN_FAME_TIERS[i - 1];
      assert.ok(t.minFame > prev.minFame);
      for (const k of FE.TAVERN_STAT_KEYS) assert.ok((t.stats[k] || 0) >= (prev.stats[k] || 0), `fame tier ${i} ${k}`);
    });
    // chronicle readers point at the real ids of the systems they read
    const bosses = (pack.monsters as any[]).filter((m) => m.isBoss).sort((a, b) => a.level - b.level).map((m) => m.id);
    assert.deepEqual([...FE.CHRONICLE_BOSS_IDS], bosses);
    assert.deepEqual([...FE.CHRONICLE_TROPHY_TIERS], [...BE.HARBOR_TROPHY_TIER_IDS]);
    assert.deepEqual([...FE.CHRONICLE_AQUARIUM_SPECIES], [...BE.HARBOR_SPECIES_IDS]);
    assert.deepEqual([...FE.CHRONICLE_ACADEMY_DEPTS], [...BE.ACADEMY_DEPARTMENT_IDS]);
    assert.deepEqual([...FE.CHRONICLE_FESTIVAL_SEASONS], [...BE.FESTIVAL_SEASON_IDS]);
    assert.deepEqual([...FE.CHRONICLE_ARENA_DIVISIONS], [...BE.ARENA_DIVISION_IDS]);
    for (const c of FE.CHRONICLE_CHAPTERS) {
      assert.equal(c.entries.length, 3, `${c.id} has three milestones`);
      for (const e of c.entries) assert.ok(FE.CHRONICLE_METRIC_IDS.includes(e.metric) && e.target > 0, `${c.id}/${e.metric}`);
      assert.ok(FE.formatTavernStats(c.stats).length > 0, `${c.id} grants a bonus`);
    }
    const finale = FE.CHRONICLE_CHAPTERS.find((c) => c.id === "legend_finale")!;
    assert.equal(finale.entries.find((e) => e.metric === "chapters_inscribed")!.target, FE.CHRONICLE_CHAPTERS.length - 1);
  });

  it("matches UTC+8 day keys, the daily guest list, orders and the hash across three years", () => {
    const start = Date.parse("2025-12-01T00:00:00.000Z");
    for (let t = start; t < start + 3 * 366 * 86_400_000; t += 5 * 3_600_000) {
      assert.equal(FE.tavernDayIndex(t), BE.tavernDayIndex(new Date(t)));
      assert.equal(FE.tavernDayKey(new Date(t)), BE.tavernDayKey(t));
      assert.equal(FE.tavernDayEndsAtMs(t), BE.tavernDayEndsAtMs(t));
    }
    const first = FE.tavernDayIndex(start);
    for (let d = first - 5; d < first + 1100; d++) {
      const key = FE.tavernDayKeyFromIndex(d);
      assert.equal(key, BE.tavernDayKeyFromIndex(d));
      assert.equal(FE.tavernDayIndexFromKey(key), d);
      assert.equal(BE.tavernDayIndexFromKey(key), d);
      const list = FE.getTavernVisitorsForDay(d);
      assert.deepEqual(list, BE.getTavernVisitorsForDay(d), `day ${d}`);
      for (const v of VISITORS) assert.deepEqual(FE.getTavernVisitorOrder(d, v), BE.getTavernVisitorOrder(d, v));
    }
    for (const key of ["2026-11-18", "2026-02-30", "2026-13-01", "", null, 7, "2026-1-1", "2026-11-18T00"]) {
      assert.equal(FE.tavernDayIndexFromKey(key), BE.tavernDayIndexFromKey(key), `key ${String(key)}`);
    }
    for (let a = -5; a < 40; a++) for (let b = -2; b < 33; b++) assert.equal(FE.tavernHash(a, b), BE.tavernHash(a, b));
    for (const d of [Number.NaN, Number.POSITIVE_INFINITY, -1, 0.5]) {
      assert.deepEqual(FE.getTavernVisitorsForDay(d), BE.getTavernVisitorsForDay(d));
    }
  });

  it("matches planTavernServe, fame tiers and ballad effects for random and dirty inputs", () => {
    const rnd = lcg(15);
    const menuIds = [...FE.TAVERN_MENU.map((m) => m.itemId), "wood_1", "", null, undefined];
    const t0 = FE.tavernDayIndex(Date.parse("2026-11-01T00:00:00.000Z"));
    let perfect = 0;
    for (let n = 0; n < 4000; n++) {
      const d = t0 + Math.floor(rnd() * 120);
      const visitor = rnd() < 0.05 ? "dragon" : VISITORS[Math.floor(rnd() * VISITORS.length)];
      const order = FE.TAVERN_VISITOR_IDS.includes(visitor as any) ? FE.getTavernVisitorOrder(d, visitor as any) : null;
      const dish = order && rnd() < 0.35 ? order.dishId : menuIds[Math.floor(rnd() * menuIds.length)];
      const drink = order && rnd() < 0.35 ? order.drinkId : menuIds[Math.floor(rnd() * menuIds.length)];
      const fe = FE.planTavernServe(d, visitor, dish, drink);
      assert.deepEqual(fe, BE.planTavernServe(d, visitor, dish, drink));
      if (fe.perfect) perfect += 1;
      if (fe.ok) assert.equal(fe.tipGold, fe.fame * FE.getTavernVisitorDef(visitor as any).tipPerFame);
    }
    assert.ok(perfect > 50, "perfect serves happen in the fixture");
    for (const f of [-1, 0, 59, 60, 199, 200, 499, 500, 999, 1000, 1799, 1800, 99999, Number.NaN, "300" as any]) {
      assert.deepEqual(FE.getTavernFameTier(f), BE.getTavernFameTier(f));
    }
    const rnd2 = lcg(151);
    for (let n = 0; n < 800; n++) {
      const h = randomHolder(rnd2);
      const t = Date.parse("2026-11-01T00:00:00.000Z") + Math.floor(rnd2() * 21 * 86_400_000);
      assert.deepEqual(FE.getTavernBalladEffect(h as any, t), BE.getTavernBalladEffect(h as any, new Date(t)));
    }
  });

  it("matches chronicle metrics, chapter progress and permanent bonuses for random and dirty saves", () => {
    const rnd = lcg(1515);
    let complete = 0;
    let inscribed = 0;
    for (let n = 0; n < 1200; n++) {
      const h = randomHolder(rnd);
      const fe = FE.getChronicleMetrics(h);
      assert.deepEqual(fe, BE.getChronicleMetrics(h), JSON.stringify(h));
      const pf = FE.getChronicleProgress(h);
      assert.deepEqual(pf, BE.getChronicleProgress(h));
      complete += pf.completeCount;
      inscribed += pf.inscribedCount;
      const bf = FE.getTavernChronicleBonuses(h as any);
      assert.deepEqual(bf, BE.getTavernChronicleBonuses(h as any));
      for (const v of Object.values(fe)) assert.ok(Number.isInteger(v) && v >= 0 && v <= FE.CHRONICLE_METRIC_CAP);
    }
    assert.ok(complete > 50 && inscribed > 50, `fixtures exercise complete (${complete}) and inscribed (${inscribed}) chapters`);
    for (const d of [null, undefined, {}, { adventurerChronicle: null }, { bardTavern: "x" }, { stats: [1, 2] }, 7]) {
      assert.deepEqual(FE.getChronicleMetrics(d), BE.getChronicleMetrics(d));
      assert.deepEqual(FE.getTavernChronicleBonuses(d as any), BE.getTavernChronicleBonuses(d as any));
    }
  });

  it("keeps the combat build (chronicle / fame atk / def / hp / gold), combat sheet, HP combat and hit damage 1:1", () => {
    const normalMonster = (pack.monsters as any[]).find((m) => !m.isBoss && Number(m.def || 0) > 10) || (pack.monsters as any[])[0];
    const fightPack = {
      ...pack,
      actions: (pack.actions as any[]).map((x: any) => (String(x.id).startsWith("act_combat_") ? { ...x, requirements: {} } : x)),
    } as EnhancedContentPack;
    const T0 = new Date("2026-11-18T12:00:00.000Z");
    for (const [label, l] of LOADOUTS) {
      const state = makePlayer(l);
      assert.deepEqual(FE.getTavernChronicleBonuses(state as any), BE.getTavernChronicleBonuses(state), label);
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

  it("replays WL-13 arena duels identically with chronicle / fame bonuses: backend hp_combat sandbox vs frontend previewFight", () => {
    const T0 = new Date("2026-11-18T12:00:00.000Z");
    const season = BE.getArenaSeasonIndex(T0);
    let duels = 0;
    let wins = 0;
    let mattered = 0;
    for (const [label, l] of LOADOUTS) {
      const state = makePlayer(l);
      const sheet = arenaCombatSheet(state as any, pack.items as any, pack.equipmentSets as any);
      const abilities = previewAbilities(state.abilityLoadout, state.abilities, abilityCatalog() as any, abilitySlotCount(state as any));
      const bare = makePlayer({ ...l, fame: undefined, chapters: undefined });
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
        if (BE.simulateArenaDuel(bare, pack, champion, T0).playerMaxHp !== be.playerMaxHp) mattered += 1;
        duels += 1;
        if (be.won) wins += 1;
      }
    }
    assert.equal(duels, LOADOUTS.length * 13);
    assert.ok(wins > 10 && duels - wins > 10, `both outcomes appear (w=${wins} / ${duels})`);
    assert.ok(mattered >= 13 * 4, "chronicle / fame bonuses really change the arena build");
  });
});
