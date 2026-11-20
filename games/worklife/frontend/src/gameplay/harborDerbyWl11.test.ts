import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import packJson from "../../../shared/enhanced_content_pack_chinese.json";
import { T1_ASSET_KEYS, t1KeyFor } from "../assets/t1/keys";
import { specByKey } from "../assets/t1/contract";
import { rasterSize } from "../../../scripts/art-image-meta";
import { CAREER_GROUPS } from "./ia";
import { combatSheetFromPack, combinedBuildFromState, harborAquariumCombatExtras } from "./combatSheet";
import { T1_ASSET_CACHE_VERSION, WL11_HARBOR_DERBY_ART_IDS, withAssetCacheVersion } from "./t1Art";
import {
  HARBOR_AQUARIUM_TIERS,
  HARBOR_BAITS,
  HARBOR_DERBY_TIERS,
  HARBOR_GROUNDS,
  HARBOR_SPECIES,
  HARBOR_SPECIES_IDS,
  HARBOR_TANK_THEMES,
  buildHarborCatchPool,
  computeHarborSettlement,
  getHarborAquariumBonuses,
  getHarborGroundForWeek,
  getHarborWeekIndex,
  harborPoolOdds,
  harborWeekEndsAtMs,
  harborWeekKey,
  rollHarborCatch,
  scoreHarborCatch,
} from "./harborDerby";

const t1Root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../assets/t1");
const frontendSrcRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("WL-11 frontend art contract, navigation IA, zero-SVG/Emoji guard and Harbor Derby helpers", () => {
  it("registers the 6 WL-11 512x512 RGBA .webp icons in the T1 contract and keeps a dated wl cache version", () => {
    assert.match(T1_ASSET_CACHE_VERSION, /^\d{8}wl\d+$/);
    assert.deepEqual([...WL11_HARBOR_DERBY_ART_IDS], [
      "fishing_trophy",
      "harbor_aquarium",
      "fish_sunscale_carp",
      "fish_abyss_lantern",
      "rare_bait_recipe",
      "master_fishing_rod",
    ]);
    for (const id of WL11_HARBOR_DERBY_ART_IDS) {
      const key = t1KeyFor("skills", id)!;
      assert.equal(key, `skills/${id}`);
      assert.ok((T1_ASSET_KEYS as readonly string[]).includes(key), `Missing T1 key ${key}`);
      const spec = specByKey(key);
      assert.ok(spec, `Missing T1 spec for ${key}`);
      assert.equal(spec?.profile, "icon");
      assert.equal(spec?.priority, "P2");
      const webp = path.join(t1Root, `${key}.webp`);
      assert.equal(existsSync(webp), true, `Missing .webp asset on disk: ${webp}`);
      assert.ok(statSync(webp).size > 2048, `Asset ${webp} unexpectedly small`);
      const size = rasterSize(readFileSync(webp), "webp");
      assert.ok(size, `Unreadable webp ${webp}`);
      assert.equal(size!.width, 512);
      assert.equal(size!.height, 512);
    }
    assert.equal(
      withAssetCacheVersion("/assets/fishing_trophy.webp"),
      `/assets/fishing_trophy.webp?v=${T1_ASSET_CACHE_VERSION}`
    );
    // the two exclusive species and every bait render through the registered art (data-driven icon ids)
    assert.equal(HARBOR_SPECIES.find((s) => s.id === "sunscale_carp")?.iconId, "fish_sunscale_carp");
    assert.equal(HARBOR_SPECIES.find((s) => s.id === "abyss_lantern")?.iconId, "fish_abyss_lantern");
    assert.ok(HARBOR_BAITS.every((b) => b.iconId === "rare_bait_recipe"));
    // pack-backed species / ground scenes resolve to existing raster art
    for (const sp of HARBOR_SPECIES.filter((s) => s.iconKind === "item")) {
      assert.equal(existsSync(path.join(t1Root, `${t1KeyFor("item", sp.iconId)}.webp`)), true, `missing item art for ${sp.id}`);
    }
    for (const g of HARBOR_GROUNDS) {
      assert.equal(existsSync(path.join(t1Root, `${t1KeyFor("tree", g.sceneId)}.webp`)), true, `missing scene art for ${g.id}`);
    }
  });

  it("wires 'harbor' into CAREER_GROUPS, GameHeader and NewGameInterface, and keeps HarborDerbyPanel free of SVG/Emoji/remount flicker", () => {
    const endgame = CAREER_GROUPS.find((g) => g.title === "远期");
    assert.ok(endgame);
    assert.equal(endgame.items.includes("harbor"), true);
    assert.ok(endgame.items.indexOf("harbor") > endgame.items.indexOf("forge"));
    assert.ok(endgame.items.indexOf("harbor") < endgame.items.indexOf("prestige"));

    const advSrc = readFileSync(path.join(frontendSrcRoot, "components/AdvancementPanels.tsx"), "utf8");
    assert.ok(advSrc.indexOf("export function HarborDerbyPanel") > 0, "HarborDerbyPanel must be exported from AdvancementPanels.tsx");
    const slice = advSrc.slice(advSrc.lastIndexOf("港湾垂钓大赛 & 海港水族馆收藏图鉴 (WL-11)"));
    assert.equal(/<svg[\s>]/i.test(slice), false, "HarborDerbyPanel must not contain inline <svg>");
    assert.equal(/<canvas[\s>]/i.test(slice), false, "HarborDerbyPanel must not draw icons on <canvas>");
    assert.equal(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(slice), false, "HarborDerbyPanel must not contain Emoji");
    assert.equal(slice.includes("[toast]"), false, "load callback must use toastRef");
    assert.equal(slice.includes("loading && !info"), true, "panel root must stay mounted after first load");
    assert.equal(slice.includes('data-testid="harbor-derby-panel"'), true);
    for (const id of ["fishing_trophy", "harbor_aquarium", "master_fishing_rod"]) {
      assert.equal(slice.includes(`id="${id}"`), true, `HarborDerbyPanel must render T1Art ${id}`);
    }
    assert.equal(slice.includes("buildHarborCatchPool("), true, "pool odds come from the symmetric mirror");

    const headerSrc = readFileSync(path.join(frontendSrcRoot, "components/GameHeader.tsx"), "utf8");
    assert.equal(headerSrc.includes('data-testid="header-harbor-derby-btn"'), true);
    assert.equal(headerSrc.includes('harbor: "港湾大赛"'), true);
    const ngiSrc = readFileSync(path.join(frontendSrcRoot, "components/NewGameInterface.tsx"), "utf8");
    assert.equal(ngiSrc.includes("<HarborDerbyPanel"), true);

    const css = readFileSync(path.join(frontendSrcRoot, "components/AdvancementPanels.css"), "utf8");
    assert.equal(css.includes(".hd-cast-btn:not(:disabled)"), true);
    assert.equal(css.includes(".hd-secondary-btn:not(:disabled)"), true);
    assert.equal(/\.hd-cast-btn\s*\{/.test(css), false, "cast gradient must not override .prog-claim-btn:disabled");
    assert.equal(/\.hd-secondary-btn\s*\{/.test(css), false, "secondary style must not override .prog-claim-btn:disabled");
  });

  it("evaluates weekly rotation, pools, odds, scoring and settlement previews", () => {
    const t = Date.parse("2026-11-17T09:00:00.000Z");
    assert.equal(harborWeekKey(t), "2026-11-16");
    const idx = getHarborWeekIndex(t);
    assert.equal(new Date(harborWeekEndsAtMs(idx)).toISOString(), "2026-11-22T16:00:00.000Z");
    assert.notEqual(getHarborGroundForWeek(idx).id, getHarborGroundForWeek(idx + 1).id);
    assert.equal(HARBOR_GROUNDS.length, 4);
    assert.equal(HARBOR_SPECIES.length, 12);
    assert.equal(HARBOR_TANK_THEMES.length, 5);
    assert.equal(HARBOR_DERBY_TIERS.length, 5);

    const odds = harborPoolOdds(buildHarborCatchPool("frost_mist_fjord", 60, "glow_shrimp"));
    assert.ok(Math.abs(odds.reduce((s, o) => s + o.pct, 0) - 100) < 0.5);
    assert.ok(odds.find((o) => o.speciesId === "fish_frost")?.featured);
    assert.equal(odds.some((o) => o.speciesId === "fish_dragon"), false, "dragon needs chef Lv.96");

    assert.deepEqual(scoreHarborCatch("fish_river", 30, true, 0), { score: 30, trophySize: false });
    const roll = rollHarborCatch("wl11-fe", { groundId: "dawn_pier", chefLevel: 30, baitId: "sunscale_lure", rodTier: 2 });
    assert.deepEqual(roll, rollHarborCatch("wl11-fe", { groundId: "dawn_pier", chefLevel: 30, baitId: "sunscale_lure", rodTier: 2 }));
    assert.ok(roll.score >= 1);

    const s = computeHarborSettlement([{ score: 900 }, { score: 800 }], []);
    assert.equal(s.tierId, "gold");
    assert.equal(s.goldReward, 2000);
    assert.deepEqual(s.unlockedRecipes, ["glow_shrimp", "sunscale_lure"]);
  });

  it("feeds aquarium gold income into combinedBuildFromState / combat sheet gold and stays inert without harborAquarium", () => {
    const baseState: any = {
      combatLevel: 15,
      combatSkills: {
        melee: { level: 22, xp: 0 },
        attack: { level: 18, xp: 0 },
        defense: { level: 16, xp: 0 },
        stamina: { level: 16, xp: 0 },
      },
      inventory: { weapon_iron_sword: 1 },
      equipment: { main_hand: "weapon_iron_sword" },
    };
    const species: Record<string, { count: number; bestSizeCm: number }> = {};
    for (const id of HARBOR_SPECIES_IDS) species[id] = { count: 1, bestSizeCm: 50 };
    const full: any = { ...baseState, harborAquarium: { species, featuredTank: "sunscale_palace" } };
    const b = harborAquariumCombatExtras(full);
    const top = HARBOR_AQUARIUM_TIERS[HARBOR_AQUARIUM_TIERS.length - 1];
    assert.equal(b.collectionTier, top.tier);
    assert.equal(b.featuredTankFull, true);
    assert.equal(b.goldGainPct, top.goldGainPct + 2 * 2);
    assert.equal(b.fishingSpeedPct, top.fishingSpeedPct + 3 * 2);
    assert.equal(b.cookingQualityPct, top.cookingQualityPct + 3 * 2);

    const b0 = combinedBuildFromState(baseState);
    const b1 = combinedBuildFromState(full);
    assert.ok(Math.abs(b1.goldMult / b0.goldMult - (1 + b.goldGainPct / 100)) < 1e-3);
    const s0 = combatSheetFromPack(baseState, packJson.items as any, packJson.equipmentSets as any);
    const s1 = combatSheetFromPack(full, packJson.items as any, packJson.equipmentSets as any);
    assert.ok((s1.goldMult || 1) > (s0.goldMult || 1));
    assert.equal(s1.atk, s0.atk, "the aquarium never touches combat power");

    const locked: any = { ...baseState, harborAquarium: { species: {}, featuredTank: "sunscale_palace" } };
    assert.equal(getHarborAquariumBonuses(locked).featuredTank, null);
    assert.deepEqual(combatSheetFromPack(locked, packJson.items as any, packJson.equipmentSets as any), s0);
  });
});
