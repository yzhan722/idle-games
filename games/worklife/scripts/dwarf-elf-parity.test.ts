import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import packJson from "../shared/enhanced_content_pack_chinese.json";
import type { EnhancedContentPack } from "../backend/src/types";
import * as BE from "../backend/src/progression2";
import { GATHER_SKILL_BY_PROFESSION, CRAFT_SKILL_BY_PROFESSION, defaultEnhancedPlayerState } from "../backend/src/storage";
import * as FE from "../frontend/src/gameplay/dwarfElf";
import { t1KeyFor } from "../frontend/src/assets/t1/keys";

const pack = packJson as EnhancedContentPack;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const CORE_START = "/* ---- 以下为与后端逐字对称的表与纯函数（WL-17 core） ---- */";
const CORE_END = "/* ---- 以上为 WL-17 core ---- */";

function coreOf(file: string): string {
  const src = readFileSync(path.join(root, file), "utf8").replace(/\r\n/g, "\n");
  const a = src.indexOf(CORE_START);
  const b = src.indexOf(CORE_END);
  assert.ok(a >= 0 && b > a, `WL-17 core markers missing in ${file}`);
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

const items = new Map((pack.items as any[]).map((i) => [i.id, i]));
const actions = pack.actions as any[];
const GATHER_SKILLS = new Set(Object.values(GATHER_SKILL_BY_PROFESSION));
const isGather = (a: any) => GATHER_SKILLS.has(a.skillId) && !(Array.isArray(a.consumes) && a.consumes.length > 0);
const smithingUses = (id: string) => actions.filter((a) => a.skillId === "skill_smithing" && (a.consumes || []).some((c: any) => c.itemId === id));
const itemArt = (id: string) => existsSync(path.join(root, "frontend/src/assets/t1", `${t1KeyFor("item", id)}.webp`));

describe("WL-17 backend <-> frontend Dwarf Mine & Elf Waystation 1:1 parity", () => {
  it("keeps the WL-17 core source region byte-identical on both sides", () => {
    assert.equal(coreOf("frontend/src/gameplay/dwarfElf.ts"), coreOf("backend/src/progression2.ts"));
  });

  it("keeps every static WL-17 table 1:1 identical, backed by real ores, forging materials, gather actions and expedition records", () => {
    const keys = [
      "MINE_GRADE_IDS",
      "ELF_EXPEDITION_SOURCE_IDS",
      "MINE_TZ_OFFSET_MINUTES",
      "MINE_HAULS_PER_LAYER_PER_DAY",
      "MINE_METERS_PER_LAYER",
      "MINE_COUNTER_CAP",
      "ELF_BOARD_SLOTS",
      "ELF_EXPEDITION_SLOT",
      "ELF_FULL_BOARD_BONUS",
      "ELF_FAVOR_CAP",
      "MINE_GRADES",
      "MINE_LAYERS",
      "MINE_DEPTHS",
      "MINE_CARTS",
      "ELF_STAT_KEYS",
      "ELF_BONUS_CAPS",
      "ELF_FAVOR_TIERS",
      "ELF_EXPEDITION_SOURCES",
      "ELF_GATHER_COMMISSIONS",
      "ELF_EXPEDITION_COMMISSIONS",
    ] as const;
    for (const k of keys) assert.deepEqual((FE as any)[k], (BE as any)[k], `table ${k} differs`);
    assert.equal(FE.MINE_TZ_OFFSET_MINUTES, BE.AIRSHIP_TZ_OFFSET_MINUTES, "same UTC+8 day as the airship market and the tavern");
    assert.equal(FE.MINE_TZ_OFFSET_MINUTES, BE.TAVERN_TZ_OFFSET_MINUTES);
    assert.equal(FE.MINE_GRADES.reduce((s, g) => s + g.weight, 0), 100);
    FE.MINE_GRADES.forEach((g, i) => i > 0 && assert.ok(g.yieldPct > FE.MINE_GRADES[i - 1].yieldPct && g.byproduct >= FE.MINE_GRADES[i - 1].byproduct));

    // layers: two real ores each, mined by a real blacksmith gather action and smelted by a real smithing recipe; the layer's
    // mining gate is the pack's requirement for its first ore; by-products are consumed by real forging recipes
    FE.MINE_LAYERS.forEach((l, i) => {
      assert.equal(l.layer, i + 1);
      assert.equal(l.ores.length, 2);
      for (const ore of l.ores) {
        assert.ok(items.has(ore), `${ore} is a pack item`);
        assert.ok(itemArt(ore), `${ore} art`);
        const mine = actions.find((a) => a.skillId === "skill_blacksmith" && isGather(a) && a.yields.some((y: any) => y.itemId === ore));
        assert.ok(mine, `${ore} is mined by a real blacksmith action`);
        assert.ok(smithingUses(ore).length > 0, `${ore} feeds a real smithing recipe`);
      }
      const first = actions.find((a) => a.skillId === "skill_blacksmith" && a.yields.some((y: any) => y.itemId === l.ores[0]));
      assert.equal(l.minMiningLevel, first.requirements.skillLevel, `layer ${l.layer} gate = pack mining requirement`);
      assert.ok(items.has(l.byproductId) && itemArt(l.byproductId), `${l.byproductId} is a real item with art`);
      assert.ok(smithingUses(l.byproductId).length > 0, `${l.byproductId} is a real forging material`);
      if (i > 0) assert.ok(l.minMiningLevel > FE.MINE_LAYERS[i - 1].minMiningLevel && l.baseMinutes > FE.MINE_LAYERS[i - 1].baseMinutes);
    });
    assert.deepEqual(
      [...new Set(FE.MINE_LAYERS.flatMap((l) => l.ores))].sort(),
      actions.filter((a) => a.id.startsWith("act_smelt_ingot_t")).map((a) => a.consumes[0].itemId).sort(),
      "the six layers cover every ore the smelting recipes consume"
    );
    // shaft / cart upgrades: real crafted goods (lumber = woodworking, ingots = smithing), strictly improving
    const crafted = (id: string) => actions.some((a) => a.skillId === CRAFT_SKILL_BY_PROFESSION.woodcutter || a.skillId === CRAFT_SKILL_BY_PROFESSION.blacksmith ? a.yields.some((y: any) => y.itemId === id) : false);
    for (const [list, label] of [[FE.MINE_DEPTHS, "depth"], [FE.MINE_CARTS, "cart"]] as const) {
      (list as readonly any[]).forEach((d, i) => {
        if (i === 0) {
          assert.equal(d.costGold, 0);
          assert.deepEqual(d.materials, {});
          return;
        }
        assert.ok(d.costGold > (list as readonly any[])[i - 1].costGold, `${label} ${i} cost rises`);
        for (const id of Object.keys(d.materials)) assert.ok(crafted(id) && itemArt(id), `${label} material ${id} is a real crafted good with art`);
      });
    }
    FE.MINE_DEPTHS.forEach((d, i) => assert.equal(d.depth, i + 1));
    FE.MINE_CARTS.forEach((c, i) => {
      assert.equal(c.level, i + 1);
      if (i > 0) assert.ok(c.capacity > FE.MINE_CARTS[i - 1].capacity && c.speedPct > FE.MINE_CARTS[i - 1].speedPct);
    });
    assert.equal(FE.MINE_DEPTHS.length, FE.MINE_LAYERS.length);

    // gather commissions: real gather actions (no inputs) whose yield is the requested item; gold beats the item value
    for (const c of FE.ELF_GATHER_COMMISSIONS) {
      const a = actions.find((x) => x.id === c.actionId);
      assert.ok(a, `${c.actionId} exists`);
      assert.ok(isGather(a), `${c.actionId} is a gathering action`);
      assert.ok(a.yields.some((y: any) => y.itemId === c.itemId), `${c.actionId} yields ${c.itemId}`);
      assert.ok(itemArt(c.itemId), `${c.itemId} art`);
      assert.ok(c.gold >= c.qty * items.get(c.itemId).value, `${c.id} pays at least the item value`);
      assert.ok(c.minTier >= 0 && c.minTier < FE.ELF_FAVOR_TIERS.length);
    }
    assert.equal(new Set(FE.ELF_GATHER_COMMISSIONS.map((c) => c.id)).size, FE.ELF_GATHER_COMMISSIONS.length);
    assert.ok(FE.ELF_GATHER_COMMISSIONS.filter((c) => c.minTier === 0).length >= 2, "a fresh waystation can post two distinct gather commissions");
    for (const src of FE.ELF_EXPEDITION_SOURCE_IDS) {
      assert.ok(FE.ELF_EXPEDITION_COMMISSIONS.some((c) => c.sourceId === src && c.minTier === 0), `${src} commission open from tier 0`);
    }
    for (const s of FE.ELF_EXPEDITION_SOURCES) assert.ok(existsSync(path.join(root, "frontend/src/assets/t1/skills", `${s.artId}.webp`)), `${s.id} reuses existing art`);
    // expedition counters read the real fields the existing systems increment
    const st = defaultEnhancedPlayerState(pack.version);
    const now = new Date("2026-11-18T02:00:00.000Z");
    BE.ensureCaravanTrade(st, now).totalRunsCompleted = 3;
    BE.ensureAstralRelics(st, now).totalSurveys = 5;
    BE.ensureAirshipTrade(st, now).totalVoyages = 7;
    assert.deepEqual(BE.getElfExpeditionCounters(st), { caravan_runs: 3, relic_surveys: 5, airship_voyages: 7 });
    assert.deepEqual(FE.getElfExpeditionCounters(JSON.parse(JSON.stringify(st))), BE.getElfExpeditionCounters(st));
    // favor tiers: strictly rising, the top tier lands exactly on the published cap
    FE.ELF_FAVOR_TIERS.forEach((t, i) => {
      assert.equal(t.tier, i);
      if (i > 0) assert.ok(t.minFavor > FE.ELF_FAVOR_TIERS[i - 1].minFavor);
    });
    const top = FE.getElfWaystationBonuses({ elfWaystation: { favor: FE.ELF_FAVOR_CAP } });
    for (const k of FE.ELF_STAT_KEYS) assert.equal(top[k], FE.ELF_BONUS_CAPS[k], `cap ${k}`);
  });

  it("matches UTC+8 day keys, vein maps, haul times / yields and waystation boards across three years", () => {
    const start = Date.parse("2025-12-01T00:00:00.000Z");
    const rnd = lcg(17);
    for (let i = 0; i < 1500; i++) {
      const t = start + Math.floor(rnd() * 3 * 365 * 86_400_000);
      assert.equal(FE.mineDayIndex(t), BE.mineDayIndex(t));
      assert.equal(FE.mineDayKey(t), BE.mineDayKey(t));
      assert.equal(FE.mineDayEndsAtMs(t), BE.mineDayEndsAtMs(t));
      const d = FE.mineDayIndex(t);
      assert.equal(FE.mineDayIndexFromKey(FE.mineDayKey(t)), d);
      assert.deepEqual(FE.getMineVeinMap(d), BE.getMineVeinMap(d));
      const layer = 1 + Math.floor(rnd() * 6);
      const cart = 1 + Math.floor(rnd() * 5);
      assert.equal(FE.getMineHaulMs(layer, cart), BE.getMineHaulMs(layer, cart));
      assert.deepEqual(FE.getMineHaulYield(d, layer, cart), BE.getMineHaulYield(d, layer, cart));
      const tier = Math.floor(rnd() * 6);
      const board = FE.getElfBoard(d, tier);
      assert.deepEqual(board, BE.getElfBoard(d, tier));
      assert.notEqual(board.gather[0].id, board.gather[1].id);
      assert.ok(board.gather.every((g) => g.minTier <= tier) && board.expedition.minTier <= tier);
    }
    // UTC+8 midnight boundary
    assert.equal(FE.mineDayKey(Date.parse("2026-11-18T15:59:59.999Z")), "2026-11-18");
    assert.equal(FE.mineDayKey(Date.parse("2026-11-18T16:00:00.000Z")), "2026-11-19");
    // grade frequencies over three years follow the published weights (deterministic, so a loose band is exact enough)
    const counts: Record<string, number> = { lean: 0, common: 0, rich: 0, bonanza: 0 };
    const d0 = FE.mineDayIndex(start);
    for (let d = d0; d < d0 + 1095; d++) for (const v of FE.getMineVeinMap(d)) counts[v.grade] += 1;
    const total = 1095 * 6;
    for (const g of FE.MINE_GRADES) assert.ok(Math.abs(counts[g.id] / total - g.weight / 100) < 0.03, `${g.id} ${counts[g.id]}`);
  });

  it("matches haul / upgrade / commission plans and favor bonuses for random and dirty inputs", () => {
    const rnd = lcg(4242);
    const dirty = [undefined, null, -1, 0, 1.5, "3", NaN, Infinity, 1e12, "x", {}, []];
    const pick = () => (rnd() < 0.25 ? dirty[Math.floor(rnd() * dirty.length)] : Math.floor(rnd() * 8));
    const ids = [...new Set([...FE.MINE_LAYERS.flatMap((l) => [...l.ores, l.byproductId]), ...FE.ELF_GATHER_COMMISSIONS.map((c) => c.itemId), "lumber_2", "ingot_2", "lumber_4", "ingot_4"])];
    for (let i = 0; i < 1500; i++) {
      const d = 20_000 + Math.floor(rnd() * 1200);
      const hauls: Record<string, unknown> = {};
      for (let l = 0; l <= 7; l++) if (rnd() < 0.4) hauls[String(l)] = pick();
      const inv: Record<string, unknown> = { gold: rnd() < 0.2 ? "x" : Math.floor(rnd() * 300_000) };
      for (const id of ids) if (rnd() < 0.5) inv[id] = rnd() < 0.15 ? pick() : Math.floor(rnd() * 40);
      const layer = rnd() < 0.2 ? pick() : 1 + Math.floor(rnd() * 6);
      const args = [d, layer, pick(), pick(), rnd() < 0.2 ? pick() : Math.floor(rnd() * 140), hauls, rnd() < 0.3] as const;
      assert.deepEqual(FE.planMineHaul(...args), BE.planMineHaul(...args));
      assert.deepEqual(FE.cleanMineHaulsToday(hauls), BE.cleanMineHaulsToday(hauls));
      const lv = pick();
      assert.deepEqual(FE.planMineDepthUpgrade(lv, inv.gold, inv), BE.planMineDepthUpgrade(lv, inv.gold, inv));
      assert.deepEqual(FE.planMineCartUpgrade(lv, inv.gold, inv), BE.planMineCartUpgrade(lv, inv.gold, inv));
      const counters = { caravan_runs: pick(), relic_surveys: pick(), airship_voyages: pick() };
      const base = { caravan_runs: pick(), relic_surveys: pick(), airship_voyages: pick() };
      const completed = rnd() < 0.2 ? pick() : [0, 1, 2, 3, "1"].filter(() => rnd() < 0.4);
      const slot = rnd() < 0.2 ? pick() : Math.floor(rnd() * 3);
      const tier = pick();
      assert.deepEqual(
        FE.planElfCommission(d, tier, slot, completed, inv, counters, base),
        BE.planElfCommission(d, tier, slot, completed, inv, counters, base)
      );
      assert.deepEqual(FE.cleanElfCompleted(completed), BE.cleanElfCompleted(completed));
      const favor = rnd() < 0.2 ? pick() : Math.floor(rnd() * 900);
      assert.deepEqual(FE.getElfFavorTier(favor), BE.getElfFavorTier(favor));
      assert.deepEqual(FE.getElfWaystationBonuses({ elfWaystation: { favor } }), BE.getElfWaystationBonuses({ elfWaystation: { favor } }));
      assert.equal(FE.getElfExpeditionProgress(counters.caravan_runs, base.caravan_runs), BE.getElfExpeditionProgress(counters.caravan_runs, base.caravan_runs));
    }
    assert.deepEqual(FE.getElfWaystationBonuses(null), BE.getElfWaystationBonuses(null));
    assert.deepEqual(FE.getElfWaystationBonuses({ elfWaystation: "x" as any }), BE.getElfWaystationBonuses({ elfWaystation: "x" as any }));
    // the backend state sanitizers and the view agree with the mirror's planners
    const s = defaultEnhancedPlayerState(pack.version);
    const now = new Date("2026-11-18T02:00:00.000Z");
    (s.skills as any).skill_blacksmith.level = 50;
    BE.ensureDwarfMine(s, now).depth = 3;
    const view = BE.getDwarfElfInfo(s, pack, now);
    const d = FE.mineDayIndex(now);
    for (const l of view.mine.layers) {
      const p = FE.planMineHaul(d, l.layer, 3, 1, 50, {}, false);
      assert.equal(l.canHaul, p.ok, `layer ${l.layer}`);
      assert.deepEqual(l.yield, p.yield);
      assert.deepEqual({ ...l.vein, oreName: undefined, byproductName: undefined }, { ...FE.getMineVein(d, l.layer), oreName: undefined, byproductName: undefined });
    }
    const board = FE.getElfBoard(FE.mineDayIndexFromKey(view.elf.dayKey)!, view.elf.boardTier);
    assert.deepEqual(view.elf.commissions.map((c) => c.id), [board.gather[0].id, board.gather[1].id, board.expedition.id]);
  });
});
