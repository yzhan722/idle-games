import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import packJson from "../shared/enhanced_content_pack_chinese.json";
import type { AcademyCourseId, AcademyDepartmentId, EnhancedContentPack, FestivalSeasonId } from "../backend/src/types";
import * as BE from "../backend/src/progression2";
import { defaultEnhancedPlayerState } from "../backend/src/storage";
import { hitDamage, monsterCombatant, playerCombatant } from "../backend/src/first_hour_combat";
import { playerBuildExtras, startHpCombat } from "../backend/src/hp_combat";
import { combatSheetFromPack, combinedBuildFromState } from "../frontend/src/gameplay/combatSheet";
import { previewFight } from "../frontend/src/gameplay/fightPreview";
import * as FE from "../frontend/src/gameplay/academyFestival";

const pack = packJson as EnhancedContentPack;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const CORE_START = "/* ---- 以下为与后端逐字对称的表与纯函数（WL-12 core） ---- */";
const CORE_END = "/* ---- 以上为 WL-12 core ---- */";

function coreOf(file: string): string {
  const src = readFileSync(path.join(root, file), "utf8").replace(/\r\n/g, "\n");
  const a = src.indexOf(CORE_START);
  const b = src.indexOf(CORE_END);
  assert.ok(a >= 0 && b > a, `WL-12 core markers missing in ${file}`);
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

const DEPTS = ["gathering", "crafting", "tactics", "commerce"] as const;
const SEASONS = ["spring", "summer", "autumn", "winter"] as const;

describe("WL-12 backend <-> frontend Adventurer Academy & Four-Season Festival Calendar 1:1 parity", () => {
  it("keeps the WL-12 core source region byte-identical on both sides", () => {
    assert.equal(coreOf("frontend/src/gameplay/academyFestival.ts"), coreOf("backend/src/progression2/academy_festival.ts"));
  });

  it("keeps every static WL-12 table and constant 1:1 identical, backed by real pack items and actions", () => {
    const keys = [
      "ACADEMY_DEPARTMENT_IDS",
      "ACADEMY_COURSE_IDS",
      "FESTIVAL_SEASON_IDS",
      "FESTIVAL_COMMISSION_IDS",
      "FESTIVAL_SHOP_ITEM_IDS",
      "ACADEMY_COURSE_SLOTS",
      "ACADEMY_CREDIT_CAP",
      "FESTIVAL_TZ_OFFSET_MINUTES",
      "FESTIVAL_TOKEN_CAP",
      "FESTIVAL_TOKEN_GOLD_RATE",
      "ACADEMY_STAT_KEYS",
      "ACADEMY_DEPARTMENTS",
      "ACADEMY_BADGES",
      "ACADEMY_COURSES",
      "FESTIVAL_SEASONS",
      "FESTIVAL_FULL_CYCLE_STATS",
      "FESTIVAL_COMMISSIONS",
      "FESTIVAL_SHOP_ITEMS",
    ] as const;
    for (const k of keys) {
      assert.deepEqual((FE as any)[k], (BE as any)[k], `table ${k} differs`);
    }
    assert.deepEqual(FE.ACADEMY_COURSES.map((c) => c.id), [...FE.ACADEMY_COURSE_IDS]);
    assert.deepEqual(FE.FESTIVAL_COMMISSIONS.map((c) => c.id), [...FE.FESTIVAL_COMMISSION_IDS]);
    assert.deepEqual(FE.FESTIVAL_SHOP_ITEMS.map((c) => c.id), [...FE.FESTIVAL_SHOP_ITEM_IDS]);
    const itemIds = new Set((pack.items as Array<{ id: string }>).map((i) => i.id));
    const lifeProducts = new Set(
      (pack.actions as any[])
        .filter((a) => !String(a.id).startsWith("act_combat_"))
        .flatMap((a) => (a.yields || []).map((y: any) => y.itemId))
    );
    for (const c of FE.ACADEMY_COURSES) {
      for (const id of Object.keys(c.itemCost)) assert.ok(lifeProducts.has(id), `${c.id}: ${id} is not a life-skill product`);
    }
    for (const c of FE.FESTIVAL_COMMISSIONS) {
      for (const id of Object.keys(c.items)) assert.ok(lifeProducts.has(id), `${c.id}: ${id} is not a life-skill product`);
      if (c.kind === "actions") {
        assert.ok((pack.actions as any[]).some((a) => String(a.id).startsWith(c.actionPrefix!)), `${c.id}: no pack action ${c.actionPrefix}*`);
      }
    }
    for (const s of FE.FESTIVAL_SHOP_ITEMS) {
      for (const id of Object.keys(s.items)) assert.ok(itemIds.has(id), `${s.id}: ${id} is not a pack item`);
    }
  });

  it("matches the UTC+8 season index / key / id / start / end across three years of boundaries and dirty keys", () => {
    const start = Date.parse("2025-12-01T00:00:00.000Z");
    for (let t = start; t < start + 3 * 366 * 86_400_000; t += 5 * 3_600_000) {
      const idx = FE.getFestivalSeasonIndex(t);
      assert.equal(idx, BE.getFestivalSeasonIndex(new Date(t)));
      assert.equal(FE.festivalSeasonKey(new Date(t)), BE.festivalSeasonKey(t));
      assert.ok(FE.festivalSeasonStartMs(idx) <= t && t < FE.festivalSeasonEndsAtMs(idx), `t=${new Date(t).toISOString()}`);
    }
    for (let idx = 8090; idx < 8130; idx++) {
      assert.equal(FE.festivalSeasonKeyFromIndex(idx), BE.festivalSeasonKeyFromIndex(idx));
      assert.equal(FE.festivalSeasonIdFromIndex(idx), BE.festivalSeasonIdFromIndex(idx));
      assert.equal(FE.festivalSeasonStartMs(idx), BE.festivalSeasonStartMs(idx));
      assert.equal(FE.festivalSeasonEndsAtMs(idx), BE.festivalSeasonEndsAtMs(idx));
      assert.equal(BE.festivalSeasonIndexFromKey(BE.festivalSeasonKeyFromIndex(idx)), idx);
    }
    for (const key of ["2026-autumn", "2026-winter", "2026-monsoon", "", null, 7, "2026-13", "0000-spring", "2026-Spring"]) {
      assert.equal(FE.festivalSeasonIndexFromKey(key), BE.festivalSeasonIndexFromKey(key), `key ${String(key)}`);
    }
    for (const s of SEASONS) {
      assert.deepEqual(FE.getFestivalSeasonDef(s), BE.getFestivalSeasonDef(s));
      assert.deepEqual(FE.getFestivalCommissionsForSeason(s), BE.getFestivalCommissionsForSeason(s));
      assert.deepEqual(FE.getFestivalShopForSeason(s), BE.getFestivalShopForSeason(s));
    }
  });

  it("matches department tiers, badges, graduation previews, course progress, counters and commission progress", () => {
    for (const d of DEPTS) {
      for (let c = -2; c <= 120; c++) assert.deepEqual(FE.getAcademyDepartmentTier(d, c), BE.getAcademyDepartmentTier(d, c));
    }
    for (let c = -2; c <= 200; c++) assert.deepEqual(FE.getAcademyBadgeTier(c), BE.getAcademyBadgeTier(c));
    const rnd = lcg(12);
    for (let n = 0; n < 400; n++) {
      const credits: Record<string, unknown> = {};
      for (const d of DEPTS) credits[d] = rnd() < 0.1 ? "x" : Math.floor(rnd() * 90) - (rnd() < 0.05 ? 20 : 0);
      if (rnd() < 0.05) credits.commerce = 1e9;
      assert.deepEqual(FE.cleanAcademyCredits(credits), BE.cleanAcademyCredits(credits));
      assert.equal(FE.sumAcademyCredits(credits as any), BE.sumAcademyCredits(credits as any));
      for (const id of FE.ACADEMY_COURSE_IDS as readonly AcademyCourseId[]) {
        assert.deepEqual(FE.previewAcademyGraduation(credits as any, id), BE.previewAcademyGraduation(credits as any, id));
      }
      const keeps = SEASONS.filter(() => rnd() < 0.5) as string[];
      if (rnd() < 0.2) keeps.push("bogus", keeps[0] || "spring");
      assert.deepEqual(FE.cleanFestivalKeepsakes(keeps), BE.cleanFestivalKeepsakes(keeps));
    }
    const t0 = Date.parse("2026-11-18T00:00:00.000Z");
    for (const id of FE.ACADEMY_COURSE_IDS as readonly AcademyCourseId[]) {
      assert.equal(FE.academyCourseDurationMs(id), BE.academyCourseDurationMs(id));
      const active = { courseId: id, startedAt: new Date(t0).toISOString(), endsAt: new Date(t0 + FE.academyCourseDurationMs(id)).toISOString() };
      for (let m = -10; m <= 260; m += 7) {
        assert.deepEqual(FE.getAcademyCourseProgress(active, t0 + m * 60_000), BE.getAcademyCourseProgress(active, t0 + m * 60_000));
      }
    }
    for (const dirty of [null, {}, { startedAt: "x", endsAt: "y" }, { startedAt: "2026-11-18T02:00:00.000Z", endsAt: "2026-11-18T01:00:00.000Z" }]) {
      assert.deepEqual(FE.getAcademyCourseProgress(dirty as any, t0), BE.getAcademyCourseProgress(dirty as any, t0));
    }
    const statsCases: unknown[] = [
      null,
      7,
      { actionsById: { act_plant_grain_t1: 4, act_plant_corn_t2: "3", act_fish_river_t1: 9, act_raise_sheep_t1: -2, act_raise_bee_t3: 2.7 }, totalKills: 41.9 },
      { actionsById: "x", totalKills: "12" },
      { actionsById: { act_fish_t4: 1e6, act_raise_dung: Number.NaN }, totalKills: -3 },
    ];
    for (const def of FE.FESTIVAL_COMMISSIONS) {
      const beDef = BE.FESTIVAL_COMMISSIONS.find((c) => c.id === def.id)!;
      for (const s of statsCases) {
        assert.equal(FE.countFestivalCommissionCounter(def, s as any), BE.countFestivalCommissionCounter(beDef, s as any), def.id);
      }
      for (let count = -3; count <= 50; count += 4) {
        for (let claims = -1; claims <= 4; claims++) {
          assert.deepEqual(FE.getFestivalCommissionProgress(def, count, claims), BE.getFestivalCommissionProgress(beDef, count, claims));
        }
      }
    }
  });

  it("matches getAcademyFestivalBonuses for every department tier combo x all 16 keepsake subsets plus dirty data", () => {
    const thresholds = [0, 8, 20, 40, 70];
    let checked = 0;
    for (const g of thresholds) {
      for (const c of thresholds) {
        for (const t of thresholds) {
          for (const m of thresholds) {
            for (let mask = 0; mask < 16; mask++) {
              const keepsakes = SEASONS.filter((_, i) => mask & (1 << i));
              const holder = {
                adventurerAcademy: { credits: { gathering: g, crafting: c, tactics: t, commerce: m } },
                festivalCalendar: { keepsakes },
              };
              const fe = FE.getAcademyFestivalBonuses(holder);
              const be = BE.getAcademyFestivalBonuses(holder as any);
              if (JSON.stringify(fe) !== JSON.stringify(be)) assert.deepEqual(fe, be, JSON.stringify(holder));
              checked += 1;
            }
          }
        }
      }
    }
    assert.equal(checked, 625 * 16);
    const dirty: unknown[] = [
      null,
      { adventurerAcademy: null, festivalCalendar: null },
      { adventurerAcademy: { credits: "x" }, festivalCalendar: { keepsakes: "spring" } },
      { adventurerAcademy: { credits: { gathering: "41", tactics: 70.9, bogus: 300 } }, festivalCalendar: { keepsakes: ["winter", "winter", "bogus"] } },
      { adventurerAcademy: { credits: { commerce: 1e12 } } },
    ];
    for (const d of dirty) assert.deepEqual(FE.getAcademyFestivalBonuses(d as any), BE.getAcademyFestivalBonuses(d as any));
    const top = FE.getAcademyFestivalBonuses({
      adventurerAcademy: { credits: { gathering: 70, crafting: 70, tactics: 70, commerce: 70 } },
      festivalCalendar: { keepsakes: [...SEASONS] },
    });
    assert.equal(top.badgeTier, 4);
    assert.equal(top.gatherSpeedPct, 15 + 3 + 2);
    assert.equal(top.craftSpeedPct, 15 + 3 + 2);
    assert.equal(top.xpGainPct, 8 + 3);
    assert.equal(top.goldGainPct, 10 + 3 + 2);
    assert.equal(top.bonusAtk, 24 + 5);
    assert.equal(top.bonusDef, 10);
    assert.equal(top.bonusHp, 80 + 20);
  });

  it("keeps combat build (academy atk / def / hp / gold), combat sheet, HP combat and hit damage 1:1", () => {
    const fightPack = {
      ...pack,
      actions: (pack.actions as any[]).map((x: any) => (String(x.id).startsWith("act_combat_") ? { ...x, requirements: {} } : x)),
    } as EnhancedContentPack;
    const normalMonster = (pack.monsters as any[]).find((m) => !m.isBoss && Number(m.def || 0) > 10) || (pack.monsters as any[])[0];
    const T0 = new Date("2026-11-18T12:00:00.000Z");
    const creditSets: Array<Partial<Record<AcademyDepartmentId, number>>> = [
      {},
      { tactics: 8 },
      { tactics: 20, commerce: 8 },
      { tactics: 40, commerce: 40, gathering: 20 },
      { tactics: 70, commerce: 70, gathering: 70, crafting: 70 },
    ];
    const keepSets: FestivalSeasonId[][] = [[], ["winter"], ["summer"], [...SEASONS]];
    for (const credits of creditSets) {
      for (const keepsakes of keepSets) {
        const state = defaultEnhancedPlayerState(pack.version || "1.0.0");
        state.combatLevel = 18;
        state.chapter1Build = "sharpened_edge";
        state.chapter2Build = "heavy_sunder";
        state.inventory.weapon_iron_sword = 1;
        (state.equipment as any).main_hand = "weapon_iron_sword";
        const ac = BE.ensureAdventurerAcademy(state);
        ac.credits = { ...ac.credits, ...credits };
        BE.ensureFestivalCalendar(state, T0).keepsakes = keepsakes;
        BE.ensureAdventurerAcademy(state);
        BE.ensureFestivalCalendar(state);
        const tag = `credits=${JSON.stringify(credits)} keepsakes=${keepsakes.join(",")}`;
        assert.deepEqual(FE.getAcademyFestivalBonuses(state as any), BE.getAcademyFestivalBonuses(state), tag);

        const beExt = playerBuildExtras(state);
        const feExt = combinedBuildFromState(state as any);
        assert.ok(Math.abs(feExt.goldMult - beExt.goldMult) < 1e-9, tag);
        assert.ok(Math.abs(feExt.dropMult - beExt.dropMult) < 1e-9, tag);
        assert.equal(feExt.atk, beExt.atk, tag);
        assert.equal(feExt.hp, beExt.hp, tag);
        assert.equal(feExt.def, beExt.def, tag);
        const expected = BE.getAcademyFestivalBonuses(state);
        if (expected.goldGainPct > 0) assert.ok(beExt.goldMult > 1, tag);

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
