import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import packJson from "../shared/enhanced_content_pack_chinese.json";
import type { ArenaDivisionId, EnhancedContentPack, TownFacilityId } from "../backend/src/types";
import * as BE from "../backend/src/progression2";
import { defaultEnhancedPlayerState } from "../backend/src/storage";
import { ensureCombatSkills } from "../backend/src/combat_skills";
import { abilityCatalog, learnFromBook, setAbilityLoadout } from "../backend/src/abilities";
import { mechanicDefsFor } from "../backend/src/boss_mechanics";
import { hitDamage, monsterCombatant, playerCombatant } from "../backend/src/first_hour_combat";
import { chooseBuild, playerBuildExtras, startHpCombat } from "../backend/src/hp_combat";
import { abilitySlotCount, arenaCombatSheet, combatSheetFromPack, combinedBuildFromState } from "../frontend/src/gameplay/combatSheet";
import { previewAbilities, previewFight } from "../frontend/src/gameplay/fightPreview";
import { resolveMechanicDefs } from "../frontend/src/gameplay/bossMechanics";
import * as FE from "../frontend/src/gameplay/arenaTown";

const pack = packJson as EnhancedContentPack;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const CORE_START = "/* ---- 以下为与后端逐字对称的表与纯函数（WL-13 core） ---- */";
const CORE_END = "/* ---- 以上为 WL-13 core ---- */";

function coreOf(file: string): string {
  const src = readFileSync(path.join(root, file), "utf8").replace(/\r\n/g, "\n");
  const a = src.indexOf(CORE_START);
  const b = src.indexOf(CORE_END);
  assert.ok(a >= 0 && b > a, `WL-13 core markers missing in ${file}`);
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

const DIVISIONS = ["bronze", "silver", "gold", "platinum", "diamond", "sky_king"] as const;
const FACILITIES = ["town_hall", "artisan_row", "harvest_market", "training_grounds", "guild_bank", "sage_library"] as const;

type Loadout = {
  weapon?: string;
  armor?: string[];
  build?: "sharpened_edge" | "thick_bark";
  chapter2?: "heavy_sunder" | "quenched_thorns";
  skills?: Partial<Record<"stamina" | "intelligence" | "attack" | "defense" | "melee" | "ranged" | "magic", number>>;
  abilities?: Array<{ abilityId: string; trigger?: { type: string; pct?: number } }>;
  titles?: ArenaDivisionId[];
  facilities?: Partial<Record<TownFacilityId, number>>;
  buff?: boolean;
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
  if (l.titles || l.facilities) {
    const sa = BE.ensureSkyArena(state);
    sa.titles = [...(l.titles || [])];
    const gt = BE.ensureGuildTown(state);
    gt.facilities = { ...gt.facilities, ...(l.facilities || {}) };
    BE.ensureSkyArena(state);
    BE.ensureGuildTown(state);
  }
  if (l.buff) {
    // 竞技场规则：临时药剂增益不计入（两端都应忽略）
    state.activeBuffs = [{ id: "potion_battle_fury", expiresAt: "2099-01-01T00:00:00.000Z", stats: { atk: 40, def: 30 } } as any];
  }
  return state;
}

const LOADOUTS: Array<[string, Loadout]> = [
  ["unarmed", {}],
  ["wooden sword + chest + edge", { weapon: "weapon_wooden_sword", armor: ["armor_wood_chest"], build: "sharpened_edge" }],
  ["iron sword trained + bark + buff ignored", {
    weapon: "weapon_iron_sword",
    armor: ["armor_wood_chest"],
    build: "thick_bark",
    skills: { stamina: 14, attack: 16, defense: 12, melee: 14, intelligence: 6 },
    buff: true,
  }],
  ["bow ranged main", { weapon: "weapon_wooden_bow", armor: ["armor_wood_chest"], skills: { ranged: 18, attack: 10, stamina: 12 } }],
  ["staff magic + smash/heavy", {
    weapon: "weapon_staff_t1",
    armor: ["armor_wood_chest"],
    skills: { magic: 16, intelligence: 12, stamina: 12 },
    abilities: [{ abilityId: "smash" }, { abilityId: "heavy_chop" }],
  }],
  ["frost blade sunder + titles/town", {
    weapon: "weapon_frost_blade",
    armor: ["armor_frost_chest", "armor_frost_legs"],
    chapter2: "heavy_sunder",
    skills: { stamina: 40, attack: 38, defense: 32, melee: 40, intelligence: 22 },
    abilities: [{ abilityId: "heavy_chop", trigger: { type: "enemy_guard" } }, { abilityId: "smash" }],
    titles: ["bronze", "silver", "gold"],
    facilities: { town_hall: 3, training_grounds: 3, guild_bank: 2 },
  }],
  ["thorns tank + brace/heal", {
    weapon: "weapon_steel_axe",
    armor: ["armor_iron_chest", "armor_iron_legs"],
    chapter2: "quenched_thorns",
    skills: { stamina: 60, attack: 30, defense: 55, melee: 30, intelligence: 30 },
    abilities: [
      { abilityId: "brace" },
      { abilityId: "minor_heal", trigger: { type: "self_hp_below", pct: 60 } },
      { abilityId: "heavy_chop", trigger: { type: "enemy_guard" } },
    ],
    titles: ["silver"],
    facilities: { town_hall: 2, training_grounds: 2 },
  }],
  ["magma glass cannon", {
    weapon: "weapon_magma_blade",
    armor: ["armor_magma_chest"],
    skills: { stamina: 50, attack: 70, defense: 40, melee: 72, intelligence: 30 },
    abilities: [{ abilityId: "heavy_chop" }, { abilityId: "smash" }],
    titles: ["bronze", "silver", "gold", "platinum"],
    facilities: { town_hall: 5, training_grounds: 5, artisan_row: 4, guild_bank: 5, sage_library: 3, harvest_market: 2 },
  }],
  ["myth endgame", {
    weapon: "weapon_myth_blade",
    armor: ["armor_myth_chest", "armor_myth_legs", "armor_myth_head", "armor_myth_feet", "armor_myth_hands"],
    skills: { stamina: 120, attack: 120, defense: 110, melee: 125, intelligence: 60 },
    abilities: [
      { abilityId: "brace" },
      { abilityId: "minor_heal", trigger: { type: "self_hp_below", pct: 55 } },
      { abilityId: "heavy_chop" },
    ],
    titles: [...DIVISIONS],
    facilities: { town_hall: 5, training_grounds: 5, artisan_row: 5, guild_bank: 5, sage_library: 5, harvest_market: 5 },
  }],
];

describe("WL-13 backend <-> frontend Sky Arena Season Ladder & Guild Town 1:1 parity", () => {
  it("keeps the WL-13 core source region byte-identical on both sides", () => {
    assert.equal(coreOf("frontend/src/gameplay/arenaTown.ts"), coreOf("backend/src/progression2/arena_town.ts"));
  });

  it("keeps every static WL-13 table and constant 1:1 identical, backed by real pack items, products and mechanics", () => {
    const keys = [
      "ARENA_DIVISION_IDS",
      "ARENA_ARCHETYPE_IDS",
      "TOWN_FACILITY_IDS",
      "ARENA_TZ_OFFSET_MINUTES",
      "ARENA_RUNG_COUNT",
      "ARENA_RUNGS_PER_DIVISION",
      "ARENA_DAILY_ATTEMPTS",
      "ARENA_MAX_FIGHT_MS",
      "ARENA_MEDAL_CAP",
      "ARENA_GATEKEEPER_HP_MULT",
      "TOWN_MAX_LEVEL",
      "ARENA_TOWN_STAT_KEYS",
      "ARENA_RUNGS",
      "ARENA_ARCHETYPES",
      "ARENA_CHAMPION_EPITHETS",
      "ARENA_DIVISIONS",
      "TOWN_FACILITIES",
      "TOWN_PROSPERITY_TIERS",
    ] as const;
    for (const k of keys) {
      assert.deepEqual((FE as any)[k], (BE as any)[k], `table ${k} differs`);
    }
    assert.deepEqual(FE.ARENA_DIVISIONS.map((d) => d.id), [...FE.ARENA_DIVISION_IDS]);
    assert.deepEqual(FE.ARENA_ARCHETYPES.map((d) => d.id), [...FE.ARENA_ARCHETYPE_IDS]);
    assert.deepEqual(FE.TOWN_FACILITIES.map((d) => d.id), [...FE.TOWN_FACILITY_IDS]);
    assert.equal(FE.ARENA_RUNGS.length, FE.ARENA_RUNG_COUNT);
    FE.ARENA_RUNGS.forEach((r, i) => {
      assert.equal(r.rung, i + 1);
      if (i > 0) {
        const p = FE.ARENA_RUNGS[i - 1];
        assert.ok(r.level > p.level && r.hp > p.hp && r.atk >= p.atk && r.def >= p.def && r.gold > p.gold, `rung ${r.rung} must not be weaker than ${p.rung}`);
      }
    });
    // divisions tile 1..30 without gaps, 5 rungs each
    let expect = 1;
    for (const d of FE.ARENA_DIVISIONS) {
      assert.equal(d.minRung, expect);
      assert.equal(d.maxRung - d.minRung + 1, FE.ARENA_RUNGS_PER_DIVISION);
      expect = d.maxRung + 1;
    }
    assert.equal(expect - 1, FE.ARENA_RUNG_COUNT);
    const mechIds = new Set(((pack.bossMechanics as any[]) || []).map((m) => m.id));
    for (const d of FE.ARENA_DIVISIONS) {
      assert.ok(d.gatekeeperMechanics.length > 0);
      for (const set of d.gatekeeperMechanics) for (const id of set) assert.ok(mechIds.has(id), `${d.id}: mechanic ${id} missing from pack table`);
    }
    const itemIds = new Set((pack.items as Array<{ id: string }>).map((i) => i.id));
    const lifeProducts = new Set(
      (pack.actions as any[])
        .filter((a) => !String(a.id).startsWith("act_combat_"))
        .flatMap((a) => (a.yields || []).map((y: any) => y.itemId))
    );
    for (const f of FE.TOWN_FACILITIES) {
      assert.equal(f.levels.length, FE.TOWN_MAX_LEVEL);
      f.levels.forEach((lv, i) => {
        assert.equal(lv.level, i + 1);
        assert.ok(lv.gold > 0);
        for (const id of Object.keys(lv.items)) assert.ok(lifeProducts.has(id), `${f.id} L${lv.level}: ${id} is not a life-skill product`);
        if (i > 0) assert.ok(lv.gold > f.levels[i - 1].gold);
      });
    }
    for (const t of FE.TOWN_PROSPERITY_TIERS) {
      for (const id of Object.keys(t.chestItems)) assert.ok(itemIds.has(id), `prosperity ${t.tier}: ${id} is not a pack item`);
    }
    const maxPoints = FE.TOWN_FACILITIES.reduce((s, f) => s + f.prosperityPerLevel * FE.TOWN_MAX_LEVEL, 0);
    assert.ok(FE.TOWN_PROSPERITY_TIERS[FE.TOWN_PROSPERITY_TIERS.length - 1].minPoints <= maxPoints, "top prosperity tier must be reachable");
  });

  it("matches UTC+8 month seasons, day keys, ends and dirty keys across three years of boundaries", () => {
    const start = Date.parse("2025-12-01T00:00:00.000Z");
    for (let t = start; t < start + 3 * 366 * 86_400_000; t += 7 * 3_600_000) {
      const idx = FE.getArenaSeasonIndex(t);
      assert.equal(idx, BE.getArenaSeasonIndex(new Date(t)));
      assert.equal(FE.arenaSeasonKey(new Date(t)), BE.arenaSeasonKey(t));
      assert.equal(FE.arenaDayKey(t), BE.arenaDayKey(new Date(t)));
      assert.equal(FE.arenaDayEndsAtMs(t), BE.arenaDayEndsAtMs(t));
      assert.ok(FE.arenaSeasonStartMs(idx) <= t && t < FE.arenaSeasonEndsAtMs(idx), `t=${new Date(t).toISOString()}`);
      assert.ok(FE.arenaDayEndsAtMs(t) > t && FE.arenaDayEndsAtMs(t) - t <= 86_400_000);
    }
    for (let idx = 24300; idx < 24340; idx++) {
      assert.equal(FE.arenaSeasonKeyFromIndex(idx), BE.arenaSeasonKeyFromIndex(idx));
      assert.equal(FE.arenaSeasonStartMs(idx), BE.arenaSeasonStartMs(idx));
      assert.equal(FE.arenaSeasonEndsAtMs(idx), BE.arenaSeasonEndsAtMs(idx));
      assert.equal(BE.arenaSeasonIndexFromKey(BE.arenaSeasonKeyFromIndex(idx)), idx);
    }
    for (const key of ["2026-11", "2026-12", "2026-13", "2026-00", "2026-1", "", null, 7, "26-11", "2026-11-01"]) {
      assert.equal(FE.arenaSeasonIndexFromKey(key), BE.arenaSeasonIndexFromKey(key), `key ${String(key)}`);
    }
    for (const key of ["2026-11-18", "2026-02-30x", "2026-13-01", "", null, "2026-1-1"]) {
      assert.equal(FE.isValidArenaDayKey(key), BE.isValidArenaDayKey(key), `day ${String(key)}`);
    }
  });

  it("generates identical champions / ladders for 60 seasons x 30 rungs and identical settlements", () => {
    for (let season = 24300; season < 24360; season++) {
      assert.deepEqual(FE.getArenaLadder(season), BE.getArenaLadder(season), `season ${season}`);
    }
    for (const dirty of [Number.NaN, -3, 0, 31, 2.7, "5" as any]) {
      assert.deepEqual(FE.generateArenaChampion(24320, dirty), BE.generateArenaChampion(24320, dirty), `rung ${dirty}`);
    }
    for (let a = -5; a < 40; a++) for (let b = -2; b < 33; b++) assert.equal(FE.arenaHash(a, b), BE.arenaHash(a, b));
    for (let r = -2; r <= 33; r++) {
      assert.deepEqual(FE.getArenaSettlement(r), BE.getArenaSettlement(r));
      assert.deepEqual(FE.getArenaDivisionForRung(r), BE.getArenaDivisionForRung(r));
    }
    const rnd = lcg(13);
    for (let n = 0; n < 300; n++) {
      const titles = DIVISIONS.filter(() => rnd() < 0.4) as string[];
      if (rnd() < 0.2) titles.push("bogus", titles[0] || "gold");
      assert.deepEqual(FE.cleanArenaTitles(titles), BE.cleanArenaTitles(titles));
      assert.deepEqual(FE.getArenaBestTitle(titles), BE.getArenaBestTitle(titles));
      const facilities: Record<string, unknown> = {};
      for (const f of FACILITIES) facilities[f] = rnd() < 0.1 ? "x" : Math.floor(rnd() * 8) - (rnd() < 0.05 ? 3 : 0);
      assert.deepEqual(FE.cleanTownFacilities(facilities), BE.cleanTownFacilities(facilities));
      assert.deepEqual(FE.getTownProsperity(facilities), BE.getTownProsperity(facilities));
      for (const f of FACILITIES) assert.equal(FE.getTownFacilityCap(f, facilities), BE.getTownFacilityCap(f, facilities));
      const chests = [1, 2, 3, 4, 5, 9, -1, 2].filter(() => rnd() < 0.5);
      assert.deepEqual(FE.cleanTownChests(chests), BE.cleanTownChests(chests));
    }
  });

  it("matches getArenaTownBonuses for every title x hall/facility level combo plus dirty data", () => {
    let checked = 0;
    for (let mask = 0; mask < 64; mask += 3) {
      const titles = DIVISIONS.filter((_, i) => mask & (1 << i));
      for (let hall = 0; hall <= 5; hall++) {
        for (let lv = 0; lv <= 5; lv++) {
          const holder = {
            skyArena: { titles },
            guildTown: {
              facilities: { town_hall: hall, artisan_row: lv, harvest_market: 5 - lv, training_grounds: lv, guild_bank: hall, sage_library: (lv + hall) % 6 },
            },
          };
          const fe = FE.getArenaTownBonuses(holder);
          const be = BE.getArenaTownBonuses(holder as any);
          if (JSON.stringify(fe) !== JSON.stringify(be)) assert.deepEqual(fe, be, JSON.stringify(holder));
          checked += 1;
        }
      }
    }
    assert.ok(checked >= 22 * 36);
    const dirty: unknown[] = [
      null,
      { skyArena: null, guildTown: null },
      { skyArena: { titles: "gold" }, guildTown: { facilities: "x" } },
      { skyArena: { titles: ["sky_king", "sky_king", "bogus"] }, guildTown: { facilities: { town_hall: 9, guild_bank: "4", artisan_row: 2.9 } } },
      { guildTown: { facilities: { town_hall: 0, training_grounds: 5 } } },
    ];
    for (const d of dirty) assert.deepEqual(FE.getArenaTownBonuses(d as any), BE.getArenaTownBonuses(d as any));
    const top = FE.getArenaTownBonuses({
      skyArena: { titles: [...DIVISIONS] },
      guildTown: { facilities: { town_hall: 5, artisan_row: 5, harvest_market: 5, training_grounds: 5, guild_bank: 5, sage_library: 5 } },
    });
    assert.equal(top.prosperityPoints, 95);
    assert.equal(top.prosperityTier, 5);
    assert.equal(top.titleName, "天空竞技之王");
    assert.equal(top.gatherSpeedPct, 3 + 12 + 2 + 3);
    assert.equal(top.craftSpeedPct, 12 + 3 + 2 + 3);
    assert.equal(top.xpGainPct, 2 + 2 + 7 + 4);
    assert.equal(top.goldGainPct, 3 + 2 + 8 + 6);
    assert.equal(top.bonusAtk, 45 + 26 + 10);
    assert.equal(top.bonusDef, 22 + 12);
    assert.equal(top.bonusHp, 200 + 100 + 60);
  });

  it("keeps combat build (titles / town atk / def / hp / gold), combat sheet, HP combat and hit damage 1:1", () => {
    const normalMonster = (pack.monsters as any[]).find((m) => !m.isBoss && Number(m.def || 0) > 10) || (pack.monsters as any[])[0];
    const fightPack = {
      ...pack,
      actions: (pack.actions as any[]).map((x: any) => (String(x.id).startsWith("act_combat_") ? { ...x, requirements: {} } : x)),
    } as EnhancedContentPack;
    const T0 = new Date("2026-11-18T12:00:00.000Z");
    for (const [label, l] of LOADOUTS) {
      const state = makePlayer({ ...l, buff: false });
      assert.deepEqual(FE.getArenaTownBonuses(state as any), BE.getArenaTownBonuses(state), label);
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

  it("replays every arena duel identically: backend hp_combat engine (simulateArenaDuel) vs frontend previewFight (previewArenaDuel)", () => {
    const T0 = new Date("2026-11-18T12:00:00.000Z");
    const seasons = [BE.getArenaSeasonIndex(T0), BE.getArenaSeasonIndex(T0) + 1, BE.getArenaSeasonIndex(T0) + 7];
    let wins = 0;
    let losses = 0;
    let duels = 0;
    for (const [label, l] of LOADOUTS) {
      const state = makePlayer(l);
      const sheet = arenaCombatSheet(state as any, pack.items as any, pack.equipmentSets as any);
      const abilities = previewAbilities(state.abilityLoadout, state.abilities, abilityCatalog() as any, abilitySlotCount(state as any));
      for (const season of seasons) {
        for (const rung of [1, 2, 3, 5, 6, 8, 10, 12, 15, 17, 20, 22, 25, 27, 30]) {
          const champion = BE.generateArenaChampion(season, rung);
          assert.deepEqual(
            resolveMechanicDefs(champion.mechanics, pack.bossMechanics as any),
            mechanicDefsFor(pack, BE.arenaChampionMonster(champion)),
            `${label} r${rung}: mechanics resolve identically`
          );
          const be = BE.simulateArenaDuel(state, pack, champion, T0);
          const fe = FE.previewArenaDuel(sheet, champion as any, abilities, pack.bossMechanics as any);
          const tag = `${label} / season ${season} / rung ${rung} (${champion.name})`;
          assert.equal(fe.won, be.won, `${tag}: outcome be=${JSON.stringify(be)} fe=${JSON.stringify(fe)}`);
          assert.equal(fe.timeout, be.timeout, `${tag}: timeout`);
          assert.equal(fe.playerMaxHp, be.playerMaxHp, `${tag}: max hp`);
          assert.equal(fe.enemyMaxHp, be.enemyMaxHp, `${tag}: enemy max hp`);
          if (!be.timeout) {
            assert.equal(fe.playerHpLeft, be.playerHpLeft, `${tag}: player hp left`);
            assert.equal(fe.enemyHpLeft, be.enemyHpLeft, `${tag}: enemy hp left`);
            assert.equal(fe.durationMs, be.durationMs, `${tag}: duration`);
          }
          duels += 1;
          if (be.won) wins += 1;
          else losses += 1;
        }
      }
    }
    assert.ok(duels >= LOADOUTS.length * 45);
    assert.ok(wins > 20 && losses > 20, `ladder must contain both beatable and unbeatable champions (w=${wins} l=${losses})`);
  });
});
