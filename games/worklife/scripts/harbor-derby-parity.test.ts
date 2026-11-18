import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import packJson from "../shared/enhanced_content_pack_chinese.json";
import type { EnhancedContentPack, HarborBaitId, HarborGroundId, HarborSpeciesId, HarborTankThemeId } from "../backend/src/types";
import * as BE from "../backend/src/progression2";
import { defaultEnhancedPlayerState } from "../backend/src/storage";
import { hitDamage, monsterCombatant, playerCombatant } from "../backend/src/first_hour_combat";
import { playerBuildExtras, startHpCombat } from "../backend/src/hp_combat";
import { combatSheetFromPack, combinedBuildFromState } from "../frontend/src/gameplay/combatSheet";
import { previewFight } from "../frontend/src/gameplay/fightPreview";
import * as FE from "../frontend/src/gameplay/harborDerby";

const pack = packJson as EnhancedContentPack;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const CORE_START = "/* ---- 以下为与后端逐字对称的表与纯函数（WL-11 core） ---- */";
const CORE_END = "/* ---- 以上为 WL-11 core ---- */";

function coreOf(file: string): string {
  const src = readFileSync(path.join(root, file), "utf8").replace(/\r\n/g, "\n");
  const a = src.indexOf(CORE_START);
  const b = src.indexOf(CORE_END);
  assert.ok(a >= 0 && b > a, `WL-11 core markers missing in ${file}`);
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

describe("WL-11 backend <-> frontend Harbor Fishing Derby & Harbor Aquarium 1:1 parity", () => {
  it("keeps the WL-11 core source region byte-identical on both sides", () => {
    assert.equal(coreOf("frontend/src/gameplay/harborDerby.ts"), coreOf("backend/src/progression2.ts"));
  });

  it("keeps every static WL-11 table and constant 1:1 identical", () => {
    const keys = [
      "HARBOR_GROUND_IDS",
      "HARBOR_BAIT_IDS",
      "HARBOR_SPECIES_IDS",
      "HARBOR_TANK_THEME_IDS",
      "HARBOR_TROPHY_TIER_IDS",
      "HARBOR_TZ_OFFSET_MINUTES",
      "HARBOR_WEEK_MS",
      "HARBOR_WEEK_EPOCH_MS",
      "HARBOR_WEEKLY_ENTRY_CAP",
      "HARBOR_CASTS_PER_ENTRY",
      "HARBOR_MAX_ENTRIES_PER_REQUEST",
      "HARBOR_LEADERBOARD_SIZE",
      "HARBOR_FEATURED_SCORE_PCT",
      "HARBOR_TROPHY_SIZE_SCORE_PCT",
      "HARBOR_FEATURED_WEIGHT_MULT",
      "HARBOR_EXCLUSIVE_LURE_WEIGHT_MULT",
      "HARBOR_BAIT_STOCK_CAP",
      "HARBOR_MAX_CRAFT_BATCHES",
      "HARBOR_FISHING_ACTION_PREFIX",
      "HARBOR_RARITY_WEIGHTS",
      "HARBOR_RARITY_LABELS",
      "HARBOR_FULL_TANK_RESONANCE_MULT",
      "HARBOR_SPECIES",
      "HARBOR_GROUNDS",
      "HARBOR_BAITS",
      "HARBOR_DERBY_TIERS",
      "HARBOR_ROD_TIERS",
      "HARBOR_TANK_THEMES",
      "HARBOR_AQUARIUM_TIERS",
    ] as const;
    for (const k of keys) {
      assert.deepEqual((FE as any)[k], (BE as any)[k], `table ${k} differs`);
    }
    // every pack-backed species must be a real fishing product yielded by an act_fish_* action
    const fishYields = new Set(
      (pack.actions as any[])
        .filter((a) => String(a.id).startsWith(FE.HARBOR_FISHING_ACTION_PREFIX))
        .flatMap((a) => (a.yields || []).map((y: any) => y.itemId))
    );
    for (const sp of FE.HARBOR_SPECIES) {
      if (sp.iconKind === "item") assert.ok(fishYields.has(sp.id), `${sp.id} is not a fishing product`);
    }
    for (const b of FE.HARBOR_BAITS) {
      for (const itemId of Object.keys(b.craftItems)) assert.ok(fishYields.has(itemId), `${b.id} uses non-fishing input ${itemId}`);
    }
  });

  it("matches week index / key / rotation / end time across week boundaries and dirty keys", () => {
    const start = Date.parse("2026-10-01T00:00:00.000Z");
    for (let t = start; t < start + 70 * 86_400_000; t += 3 * 3_600_000) {
      assert.equal(FE.getHarborWeekIndex(t), BE.getHarborWeekIndex(new Date(t)));
      assert.equal(FE.harborWeekKey(new Date(t)), BE.harborWeekKey(t));
    }
    // Monday 00:00 UTC+8 boundary (= Sunday 16:00 UTC) ±1 ms
    const boundary = Date.parse("2026-11-15T16:00:00.000Z");
    assert.equal(BE.harborWeekKey(boundary - 1), "2026-11-09");
    assert.equal(BE.harborWeekKey(boundary), "2026-11-16");
    assert.equal(FE.harborWeekKey(boundary - 1), "2026-11-09");
    assert.equal(FE.harborWeekKey(boundary), "2026-11-16");
    for (let i = -3; i < 40; i++) {
      const idx = 2914 + i;
      assert.equal(FE.harborWeekKeyFromIndex(idx), BE.harborWeekKeyFromIndex(idx));
      assert.equal(FE.harborWeekEndsAtMs(idx), BE.harborWeekEndsAtMs(idx));
      assert.deepEqual(FE.getHarborGroundForWeek(idx), BE.getHarborGroundForWeek(idx));
      assert.equal(BE.harborWeekIndexFromKey(BE.harborWeekKeyFromIndex(idx)), idx);
    }
    const seen = new Set<string>();
    for (let i = 0; i < 4; i++) seen.add(BE.getHarborGroundForWeek(2914 + i).id);
    assert.equal(seen.size, 4, "4 consecutive weeks rotate through all 4 grounds");
    for (const key of ["2026-11-16", "2026-11-17", "garbage", "", null, 7, "2026-13-01", "1970-01-05", "1969-12-29"]) {
      assert.equal(FE.harborWeekIndexFromKey(key), BE.harborWeekIndexFromKey(key), `key ${String(key)}`);
    }
  });

  it("matches fishing-action counting, casts, tiers, rod tiers, trophy points, leaderboard and settlement", () => {
    const dirtyActions: unknown[] = [
      null,
      7,
      { act_fish_river_t1: 4, act_fish_t9: "3", act_chop_wood_t1: 50, act_fish_sea_t2: -2, act_fish_t3: 2.7 },
      { act_fish_shrimp_t1: Number.NaN, act_fish_t4: 1e6 },
    ];
    for (const raw of dirtyActions) assert.equal(FE.countHarborFishingActions(raw), BE.countHarborFishingActions(raw));
    for (let f = -2; f <= 40; f += 3) {
      for (let u = -1; u <= 32; u += 3) assert.equal(FE.getHarborCastsAvailable(f, u), BE.getHarborCastsAvailable(f, u));
    }
    for (let s = -5; s <= 5000; s += 7) assert.deepEqual(FE.getHarborDerbyTier(s), BE.getHarborDerbyTier(s));
    for (let p = -1; p <= 30; p++) assert.deepEqual(FE.getHarborRodTier(p), BE.getHarborRodTier(p));
    for (const t of [null, {}, { bronze: 2, silver: "1", gold: 1.9, legend: -1 }, { bronze: 1, silver: 1, gold: 1, legend: 1 }]) {
      assert.equal(FE.harborTrophyPoints(t as any), BE.harborTrophyPoints(t as any));
    }
    const rnd = lcg(11);
    const recipeSets: string[][] = [[], ["glow_shrimp"], ["glow_shrimp", "sunscale_lure"], ["abyss_lantern_lure"]];
    for (let n = 0; n < 300; n++) {
      const len = Math.floor(rnd() * 12);
      const catches = Array.from({ length: len }, () => ({ score: Math.floor(rnd() * 2400) - (rnd() < 0.05 ? 5000 : 0) }));
      assert.deepEqual(FE.getHarborLeaderboard(catches), BE.getHarborLeaderboard(catches));
      assert.equal(FE.computeHarborWeeklyScore(catches), BE.computeHarborWeeklyScore(catches));
      const known = recipeSets[n % recipeSets.length];
      assert.deepEqual(FE.computeHarborSettlement(catches, known), BE.computeHarborSettlement(catches, known));
    }
  });

  it("matches the species pool, scoring and deterministic rolls for every ground x bait x chef level x rod tier", () => {
    const levels = [0, 1, 9, 10, 20, 24, 36, 47, 48, 60, 72, 84, 96, 150];
    let rolls = 0;
    for (const g of FE.HARBOR_GROUND_IDS as readonly HarborGroundId[]) {
      for (const b of FE.HARBOR_BAIT_IDS as readonly HarborBaitId[]) {
        for (const lv of levels) {
          assert.deepEqual(FE.buildHarborCatchPool(g, lv, b), BE.buildHarborCatchPool(g, lv, b), `${g}/${b}/${lv}`);
        }
        for (const lv of [1, 24, 50, 100]) {
          for (let rod = 0; rod <= 4; rod++) {
            for (let i = 0; i < 25; i++) {
              const seed = BE.buildHarborEntrySeedKey("2026-11-16", i, i + rod, `parity-${lv}`);
              assert.equal(seed, FE.buildHarborEntrySeedKey("2026-11-16", i, i + rod, `parity-${lv}`));
              const ctx = { groundId: g, chefLevel: lv, baitId: b, rodTier: rod };
              assert.deepEqual(FE.rollHarborCatch(seed, ctx), BE.rollHarborCatch(seed, ctx));
              rolls += 1;
            }
          }
        }
      }
    }
    assert.equal(rolls, 4 * 4 * 4 * 5 * 25);
    for (const seed of ["", "a", "wl11-harbor:2026-11-16#e0#t0#", "长种子-测试"]) {
      const fr = FE.createHarborRng(seed);
      const br = BE.createSeededRng(seed);
      const bh = BE.createHarborRng(seed);
      for (let i = 0; i < 20; i++) {
        const v = fr();
        assert.equal(v, br());
        assert.equal(v, bh());
      }
    }
    for (const sp of FE.HARBOR_SPECIES) {
      for (const size of [0, -1, sp.minSizeCm, sp.refSizeCm, sp.maxSizeCm - 0.1, sp.maxSizeCm, sp.maxSizeCm * 1.2]) {
        for (const featured of [false, true]) {
          for (const bonus of [-5, 0, 8, 33]) {
            assert.deepEqual(
              FE.scoreHarborCatch(sp.id, size, featured, bonus),
              BE.scoreHarborCatch(sp.id as HarborSpeciesId, size, featured, bonus)
            );
          }
        }
      }
    }
  });

  it("matches getHarborAquariumBonuses for all 4096 collection subsets x 6 featured-tank choices plus dirty data", () => {
    const featuredChoices: Array<HarborTankThemeId | null | string> = [null, ...FE.HARBOR_TANK_THEME_IDS];
    let checked = 0;
    for (let mask = 0; mask < 1 << FE.HARBOR_SPECIES_IDS.length; mask++) {
      const species: Record<string, { count: number; bestSizeCm: number }> = {};
      FE.HARBOR_SPECIES_IDS.forEach((id, i) => {
        if (mask & (1 << i)) species[id] = { count: 1 + (i % 3), bestSizeCm: 10 + i };
      });
      for (const featuredTank of featuredChoices) {
        const holder = { harborAquarium: { species, featuredTank } };
        const fe = FE.getHarborAquariumBonuses(holder);
        const be = BE.getHarborAquariumBonuses(holder as any);
        if (JSON.stringify(fe) !== JSON.stringify(be)) assert.deepEqual(fe, be, `mask=${mask} featured=${featuredTank}`);
        checked += 1;
      }
    }
    assert.equal(checked, 4096 * 6);
    const dirty: unknown[] = [
      null,
      { harborAquarium: null },
      { harborAquarium: { species: "x", featuredTank: 9 } },
      { harborAquarium: { species: { fish_river: { count: "2", bestSizeCm: "41.26" }, bogus: { count: 3 } }, featuredTank: "stream_shallows" } },
      { harborAquarium: { species: { fish_river: { count: 0 } }, featuredTank: "stream_shallows" } },
    ];
    for (const d of dirty) {
      assert.deepEqual(FE.getHarborAquariumBonuses(d as any), BE.getHarborAquariumBonuses(d as any));
      const raw = d && typeof d === "object" ? (d as any).harborAquarium?.species : undefined;
      assert.deepEqual(FE.cleanHarborAquariumSpecies(raw), BE.cleanHarborAquariumSpecies(raw));
    }
  });

  it("keeps combat build (incl. aquarium gold income), combat sheet, HP combat and hit damage 1:1", () => {
    const fightPack = {
      ...pack,
      actions: (pack.actions as any[]).map((x: any) => (String(x.id).startsWith("act_combat_") ? { ...x, requirements: {} } : x)),
    } as EnhancedContentPack;
    const normalMonster = (pack.monsters as any[]).find((m) => !m.isBoss && Number(m.def || 0) > 10) || (pack.monsters as any[])[0];
    const T0 = new Date("2026-11-17T12:00:00.000Z");
    const subsets = [0, 1, 0b111, 0b11111, 0b11111111, 0b11111111111, 0b111111111111];
    const tanks: Array<HarborTankThemeId | null> = [null, "stream_shallows", "coral_harbor", "frost_grotto", "ember_starlight", "sunscale_palace"];
    for (const mask of subsets) {
      for (const featuredTank of tanks) {
        const state = defaultEnhancedPlayerState(pack.version || "1.0.0");
        state.combatLevel = 18;
        state.chapter1Build = "sharpened_edge";
        state.chapter2Build = "heavy_sunder";
        state.inventory.weapon_iron_sword = 1;
        (state.equipment as any).main_hand = "weapon_iron_sword";
        const aq = BE.ensureHarborAquarium(state);
        BE.HARBOR_SPECIES_IDS.forEach((id, i) => {
          if (mask & (1 << i)) aq.species[id] = { count: 2, bestSizeCm: 30 };
        });
        aq.featuredTank = featuredTank;
        BE.ensureHarborAquarium(state);
        const tag = `mask=${mask} tank=${featuredTank}`;
        assert.deepEqual(FE.getHarborAquariumBonuses(state as any), BE.getHarborAquariumBonuses(state), tag);

        const beExt = playerBuildExtras(state);
        const feExt = combinedBuildFromState(state as any);
        assert.ok(Math.abs(feExt.goldMult - beExt.goldMult) < 1e-9, tag);
        assert.ok(Math.abs(feExt.dropMult - beExt.dropMult) < 1e-9, tag);
        assert.equal(feExt.atk, beExt.atk, tag);
        assert.equal(feExt.hp, beExt.hp, tag);
        assert.equal(feExt.def, beExt.def, tag);
        const expectedGold = BE.getHarborAquariumBonuses(state).goldGainPct;
        if (expectedGold > 0) assert.ok(beExt.goldMult > 1, tag);

        const enc = startHpCombat(state, fightPack, normalMonster.id, T0);
        const sheet = combatSheetFromPack(state as any, pack.items as any, pack.equipmentSets as any);
        assert.equal(sheet.hp, enc.playerMaxHp, tag);
        assert.equal(sheet.intervalMs, enc.playerIntervalMs, tag);
        const bePlayer = playerCombatant(state, fightPack, {
          atk: beExt.atk,
          combatAtkPct: beExt.combatAtkPct,
          def: beExt.def,
          hp: beExt.hp,
          armorPenPct: beExt.armorPenPct,
          bossArmorBreakPct: beExt.bossArmorBreakPct,
          relicCritAmpPct: beExt.relicCritAmpPct,
          intervalMult: beExt.intervalMult,
        });
        assert.equal(previewFight(sheet, normalMonster as any).normalHit, hitDamage(bePlayer, monsterCombatant(normalMonster)), tag);
      }
    }
  });
});
