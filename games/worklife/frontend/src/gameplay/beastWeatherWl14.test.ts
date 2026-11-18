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
import { arenaCombatSheet, beastRanchCombatExtras, combatSheetFromPack, combinedBuildFromState } from "./combatSheet";
import { T1_ASSET_CACHE_VERSION, WL14_BEAST_WEATHER_ART_IDS, withAssetCacheVersion } from "./t1Art";
import { generateArenaChampion, getArenaSeasonIndex, previewArenaDuel } from "./arenaTown";
import {
  BEAST_BOND_TIERS,
  BEAST_FEED_MAX_QTY,
  BEAST_FOODS,
  BEAST_LEVEL_XP,
  BEAST_MAX_LEVEL,
  BEAST_STAT_KEYS,
  CONTRACT_BEASTS,
  WEATHER_LIFE_SKILLS,
  WEATHER_TYPES,
  formatBeastWeatherStats,
  formatWeatherDayLabel,
  formatWeatherOutputs,
  getBeastBond,
  getBeastLevel,
  getBeastLevelProgress,
  getBeastRanchBonuses,
  getBeastStatsAtLevel,
  getNaturalWeather,
  getWeatherForDay,
  getWeatherTowerEffect,
  getWeatherWishChance,
  planBeastFeed,
  weatherDayIndex,
  weatherDayKey,
  weatherDayKeyFromIndex,
} from "./beastWeather";

const t1Root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../assets/t1");
const frontendSrcRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const xpAt = (level: number) => BEAST_LEVEL_XP[level - 1];

describe("WL-14 frontend art contract, navigation IA, zero-SVG/Emoji guard and Beast Ranch / Weather Tower helpers", () => {
  it("registers the 6 WL-14 512x512 RGBA .webp icons in the T1 contract and keeps a dated wl cache version", () => {
    assert.match(T1_ASSET_CACHE_VERSION, /^\d{8}wl\d+$/);
    assert.deepEqual([...WL14_BEAST_WEATHER_ART_IDS], [
      "beast_ranch",
      "contract_seal",
      "beast_feed",
      "weather_tower",
      "weather_orb",
      "star_dust_vial",
    ]);
    for (const id of WL14_BEAST_WEATHER_ART_IDS) {
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
    assert.equal(withAssetCacheVersion("/assets/beast_ranch.webp"), `/assets/beast_ranch.webp?v=${T1_ASSET_CACHE_VERSION}`);
    // beasts render through real monster art; every tame / food item shown has raster item art
    for (const b of CONTRACT_BEASTS) {
      assert.ok((packJson.monsters as Array<{ id: string }>).some((m) => m.id === b.artId), `${b.id} art ${b.artId} is a pack monster`);
      assert.equal(existsSync(path.join(t1Root, `${t1KeyFor("monster", b.artId)}.webp`)), true, `${b.id} portrait`);
    }
    const itemIds = new Set<string>();
    for (const b of CONTRACT_BEASTS) {
      Object.keys(b.tameItems).forEach((id) => itemIds.add(id));
      itemIds.add(b.favoriteFood);
    }
    for (const f of BEAST_FOODS) itemIds.add(f.itemId);
    for (const id of itemIds) {
      assert.ok((packJson.items as Array<{ id: string }>).some((i) => i.id === id), `${id} is not a pack item`);
      assert.equal(existsSync(path.join(t1Root, `${t1KeyFor("item", id)}.webp`)), true, `missing item art for ${id}`);
    }
  });

  it("wires 'ranch' into CAREER_GROUPS, GameHeader and NewGameInterface, and keeps BeastWeatherPanel free of SVG/Emoji/remount flicker", () => {
    const endgame = CAREER_GROUPS.find((g) => g.title === "远期");
    assert.ok(endgame);
    assert.equal(endgame.items.includes("ranch"), true);
    assert.ok(endgame.items.indexOf("ranch") > endgame.items.indexOf("arena"));
    assert.ok(endgame.items.indexOf("ranch") < endgame.items.indexOf("prestige"));

    const advSrc = readFileSync(path.join(frontendSrcRoot, "components/AdvancementPanels.tsx"), "utf8");
    assert.ok(advSrc.indexOf("export function BeastWeatherPanel") > 0, "BeastWeatherPanel must be exported from AdvancementPanels.tsx");
    const slice = advSrc.slice(advSrc.lastIndexOf("契约魔兽牧场 & 天候观星占卜塔 (WL-14)"));
    assert.equal(/<svg[\s>]/i.test(slice), false, "BeastWeatherPanel must not contain inline <svg>");
    assert.equal(/<canvas[\s>]/i.test(slice), false, "BeastWeatherPanel must not draw icons on <canvas>");
    assert.equal(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(slice), false, "BeastWeatherPanel must not contain Emoji");
    assert.equal(slice.includes("[toast]"), false, "load callback must use toastRef");
    assert.equal(slice.includes("loading && !info"), true, "panel root must stay mounted after first load");
    assert.equal(slice.includes('data-testid="beast-weather-panel"'), true);
    for (const id of WL14_BEAST_WEATHER_ART_IDS) {
      assert.equal(slice.includes(`id="${id}"`), true, `BeastWeatherPanel must render T1Art ${id}`);
    }
    assert.equal(slice.includes('kind="monster" id={b.artId}'), true, "beast portraits come from real monster art");
    assert.equal(slice.includes("formatBeastWeatherStats("), true, "stat lines come from the symmetric mirror");
    assert.equal(slice.includes("planBeastFeed("), true, "the feed preview uses the symmetric planner");
    assert.equal(slice.includes("dayKey: info?.weather.tomorrowKey"), true, "the client tells the server which day it divines / wishes for");

    const headerSrc = readFileSync(path.join(frontendSrcRoot, "components/GameHeader.tsx"), "utf8");
    assert.equal(headerSrc.includes('data-testid="header-beast-weather-btn"'), true);
    assert.equal(headerSrc.includes('ranch: "契约魔兽牧场与天候观星塔"'), true);
    const ngiSrc = readFileSync(path.join(frontendSrcRoot, "components/NewGameInterface.tsx"), "utf8");
    assert.equal(ngiSrc.includes("<BeastWeatherPanel"), true);

    const css = readFileSync(path.join(frontendSrcRoot, "components/AdvancementPanels.css"), "utf8").replace(/\r\n/g, "\n");
    for (const cls of ["bw-tame-btn", "bw-assign-btn", "bw-feed-btn", "bw-divine-btn", "bw-wish-btn"]) {
      assert.equal(css.includes(`.${cls}:not(:disabled)`), true, `${cls} gradient only when enabled`);
      assert.equal(new RegExp(`(^|\\n)\\s*\\.${cls}\\s*\\{`).test(css), false, `${cls} must not override .prog-claim-btn:disabled`);
    }
    // 8 header pills: 1440px squeezed the title / level boxes onto two lines → icon-only for 761~1599px, text from 1600px (WL-15 adds a 9th in the same block)
    assert.equal(css.includes("@media (max-width: 1439px)"), false, "the old 1439px pill block was widened");
    const mid = css.slice(css.indexOf("@media (max-width: 1599px)"));
    const midBlock = mid.slice(0, mid.indexOf("\n}\n"));
    for (const cls of ["ranch", "arena", "academy", "harbor", "forge", "relics", "cauldron", "caravan"]) {
      assert.ok(midBlock.includes(`.header-${cls}-pill span`), `${cls} pill is icon-only at 761~1599px`);
    }
    const narrow = css.slice(css.lastIndexOf("@media (max-width: 760px)"));
    assert.ok(/\.header-ranch-pill\s*\{\s*display:\s*none;/.test(narrow.slice(0, narrow.indexOf("\n}\n"))), "ranch pill hidden at <=760px");
    const phone = css.slice(css.lastIndexOf("@media (max-width: 480px)"));
    assert.ok(/\.header-ranch-pill,\s*\.header-arena-pill,\s*\.header-academy-pill\s*\{\s*display:\s*none;/.test(phone), "header pills hidden at <=480px");
  });

  it("evaluates UTC+8 daily weather, outputs, wish chances and the tower gate", () => {
    assert.equal(weatherDayKey(Date.parse("2026-11-18T15:59:00.000Z")), "2026-11-18");
    assert.equal(weatherDayKey(Date.parse("2026-11-18T16:00:00.000Z")), "2026-11-19");
    assert.equal(formatWeatherDayLabel("2026-11-19"), "11 月 19 日");
    const idx = weatherDayIndex(Date.parse("2026-11-18T02:00:00.000Z"));
    assert.equal(weatherDayKeyFromIndex(idx), "2026-11-18");
    assert.equal(getNaturalWeather(idx), getNaturalWeather(idx), "deterministic");
    assert.equal(WEATHER_TYPES.reduce((s, w) => s + w.weight, 0), 100);
    assert.deepEqual(formatWeatherOutputs("rain"), ["种植 +6%", "钓鱼 +14%", "畜牧 +8%", "烹饪 +6%", "炼金 +6%"]);
    assert.equal(formatWeatherOutputs("aurora").length, WEATHER_LIFE_SKILLS.length);
    assert.equal(getWeatherWishChance(0, "sunny"), 30);
    assert.equal(getWeatherWishChance(3, "sunny"), 36);
    assert.equal(getWeatherWishChance(30, "aurora"), 27);
    assert.equal(getWeatherWishChance(5, "hail"), 0);

    const key = weatherDayKeyFromIndex(idx);
    const natural = getNaturalWeather(idx);
    const other = natural === "storm" ? "fog" : "storm";
    assert.equal(getWeatherForDay(key, { forecasts: [{ dayKey: key, wish: other, granted: true }] }), other);
    assert.equal(getWeatherForDay(key, { forecasts: [{ dayKey: key, wish: other, granted: false }] }), natural);
    const now = Date.parse("2026-11-18T02:00:00.000Z");
    assert.equal(getWeatherTowerEffect({}, now).active, false, "no tower, no weather bonus");
    const fx = getWeatherTowerEffect({ weatherTower: { forecasts: [] } }, now);
    assert.equal(fx.active, true);
    assert.equal(fx.weather, natural);
    assert.deepEqual(Object.keys(fx.outputPct).sort(), Object.keys(WEATHER_TYPES.find((w) => w.id === natural)!.outputPct).sort());
  });

  it("grows beasts level by level (every level improves, none regresses), plans feeding and sums the ranch bond", () => {
    assert.equal(getBeastLevel(0), 1);
    assert.equal(getBeastLevel(xpAt(4) + 5), 4);
    assert.equal(getBeastLevel(99_999), BEAST_MAX_LEVEL);
    assert.deepEqual(getBeastLevelProgress(xpAt(4) + 70), { xp: xpAt(4) + 70, level: 4, levelXp: xpAt(4), nextXp: xpAt(5), progressPct: 29 });
    for (const b of CONTRACT_BEASTS) {
      assert.deepEqual(getBeastStatsAtLevel(b.id, 0), {});
      assert.deepEqual(getBeastStatsAtLevel(b.id, 1), Object.fromEntries(Object.entries(b.statsLv1).filter(([, v]) => v)));
      for (let lv = 2; lv <= BEAST_MAX_LEVEL; lv++) {
        const prev = getBeastStatsAtLevel(b.id, lv - 1);
        const cur = getBeastStatsAtLevel(b.id, lv);
        let improved = false;
        for (const k of BEAST_STAT_KEYS) {
          assert.ok((cur[k] || 0) >= (prev[k] || 0), `${b.id} Lv.${lv} ${k} must not regress`);
          if ((cur[k] || 0) > (prev[k] || 0)) improved = true;
        }
        assert.ok(improved, `${b.id} Lv.${lv} must improve at least one stat`);
      }
    }
    assert.deepEqual(formatBeastWeatherStats({ gatherSpeedPct: 4, gatherEfficiencyPct: 2, bonusHp: 30 }), ["采集速度 +4%", "采集产出 +2%", "生命 +30"]);

    const fav = planBeastFeed("bloom_bee", 0, "food_honey_cake", 3);
    assert.equal(fav.ok, true);
    assert.equal(fav.favorite, true);
    assert.equal(fav.perItem, 63);
    assert.equal(fav.xpGained, 189);
    assert.equal(fav.levelAfter, getBeastLevel(189));
    const plain = planBeastFeed("frostmane_wolf", 0, "food_honey_cake", 3);
    assert.equal(plain.favorite, false);
    assert.equal(plain.xpGained, 126);
    const capped = planBeastFeed("bloom_bee", xpAt(BEAST_MAX_LEVEL) - 10, "food_simple", BEAST_FEED_MAX_QTY);
    assert.equal(capped.qtyUsed, 2, "only the meals needed for the last 10 xp");
    assert.equal(capped.xpAfter, xpAt(BEAST_MAX_LEVEL));
    assert.equal(planBeastFeed("bloom_bee", xpAt(BEAST_MAX_LEVEL), "food_simple", 1).ok, false);
    assert.equal(planBeastFeed("bloom_bee", 0, "wood_1", 1).ok, false);
    assert.equal(planBeastFeed("bloom_bee", 0, "food_simple", 0).ok, false);
    assert.equal(planBeastFeed("bloom_bee", 0, "food_simple", BEAST_FEED_MAX_QTY + 1).ok, false);
    assert.equal(planBeastFeed("dragon", 0, "food_simple", 1).ok, false);

    assert.equal(getBeastBond({}).current.tier, 0);
    assert.equal(getBeastBond({ bloom_bee: 1 }).current.name, "契约小牧场");
    assert.equal(getBeastBond({ bloom_bee: 10, echo_bat: 10, mire_toad: 10, frostmane_wolf: 10, ember_hound: 10, chrono_wyrm: 10 }).current.tier, 5);
    assert.equal(BEAST_BOND_TIERS[BEAST_BOND_TIERS.length - 1].minLevels, CONTRACT_BEASTS.length * BEAST_MAX_LEVEL);
  });

  it("feeds the combat companion into combinedBuildFromState, the combat sheet and arena previews; other roles leave combat untouched", () => {
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
    const withWolf: any = {
      ...baseState,
      beastRanch: { beasts: { frostmane_wolf: { xp: xpAt(10) }, bloom_bee: { xp: xpAt(2) } }, activeBeastId: "frostmane_wolf" },
    };
    const b = beastRanchCombatExtras(withWolf);
    const wolf10 = getBeastStatsAtLevel("frostmane_wolf", 10);
    assert.equal(b.activeRole, "combat");
    assert.equal(b.bondLevels, 12);
    assert.equal(b.bonusAtk, wolf10.bonusAtk);
    assert.equal(b.bonusDef, wolf10.bonusDef);
    assert.equal(b.bonusHp, wolf10.bonusHp);
    const b0 = combinedBuildFromState(baseState);
    const b1 = combinedBuildFromState(withWolf);
    assert.equal(b1.atk - b0.atk, 32);
    assert.equal(b1.def - b0.def, 12);
    assert.equal(b1.hp - b0.hp, 160);
    assert.ok(Math.abs(b1.goldMult / b0.goldMult - 1.01) < 1e-3, "bond tier 2 → +1% gold");
    const s0 = combatSheetFromPack(baseState, packJson.items as any, packJson.equipmentSets as any);
    const s1 = arenaCombatSheet(withWolf, packJson.items as any, packJson.equipmentSets as any);
    assert.ok(s1.atk > s0.atk && s1.hp > s0.hp && s1.def > s0.def);

    const withBee: any = { ...baseState, beastRanch: { beasts: { bloom_bee: { xp: xpAt(10) } }, activeBeastId: "bloom_bee" } };
    const beeBuild = combinedBuildFromState(withBee);
    assert.equal(beeBuild.atk, b0.atk, "a gathering companion adds no attack");
    assert.equal(beeBuild.hp, b0.hp);
    assert.equal(getBeastRanchBonuses(withBee).gatherSpeedPct, getBeastStatsAtLevel("bloom_bee", 10).gatherSpeedPct);

    const season = getArenaSeasonIndex(Date.parse("2026-11-18T02:00:00.000Z"));
    const champ = generateArenaChampion(season, 4);
    const p0 = previewArenaDuel(arenaCombatSheet(baseState, packJson.items as any, packJson.equipmentSets as any), champ, [], packJson.bossMechanics as any);
    const p1 = previewArenaDuel(s1, champ, [], packJson.bossMechanics as any);
    assert.equal(p1.playerMaxHp - p0.playerMaxHp, 160);

    const dirty: any = { ...baseState, beastRanch: { beasts: "x", activeBeastId: "frostmane_wolf" } };
    assert.equal(getBeastRanchBonuses(dirty).activeBeastId, null);
    assert.deepEqual(combatSheetFromPack(dirty, packJson.items as any, packJson.equipmentSets as any), s0);
  });
});
