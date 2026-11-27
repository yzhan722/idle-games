import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { readAdvancementPanels } from "./advancementSource";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import packJson from "../../../shared/enhanced_content_pack_chinese.json";
import { T1_ASSET_KEYS, t1KeyFor } from "../assets/t1/keys";
import { specByKey } from "../assets/t1/contract";
import { rasterSize } from "../../../scripts/art-image-meta";
import { CAREER_GROUPS } from "./ia";
import { arenaCombatSheet, combatSheetFromPack, combinedBuildFromState, paladinTrialCombatExtras } from "./combatSheet";
import { T1_ASSET_CACHE_VERSION, WL16_AIRSHIP_PALADIN_ART_IDS, withAssetCacheVersion } from "./t1Art";
import {
  AIRSHIP_DAILY_STOCK,
  AIRSHIP_GOODS,
  AIRSHIP_HULLS,
  AIRSHIP_ROUTES,
  AIRSHIP_TOWNS,
  PALADIN_BONUS_CAPS,
  PALADIN_FOES,
  PALADIN_FULL_CLEAR_BONUS,
  PALADIN_STAGES,
  PALADIN_THEMES,
  PALADIN_VIRTUE_COSTS,
  airshipDayKey,
  airshipDayIndex,
  airshipRouteDestination,
  airshipVoyageXp,
  cleanPaladinCleared,
  formatAirshipDuration,
  formatAirshipProfit,
  formatAirshipTrend,
  formatPaladinStats,
  generatePaladinOpponent,
  getAirshipBuyQuote,
  getAirshipRouteLevel,
  getAirshipSellQuote,
  getAirshipVoyageMs,
  getPaladinHonorRank,
  getPaladinStageReward,
  getPaladinTheme,
  getPaladinTrialBonuses,
  paladinWeekEndsAtMs,
  paladinWeekIndex,
  paladinWeekIndexFromKey,
  paladinWeekKey,
  planAirshipBuy,
  planAirshipHullUpgrade,
  planAirshipSell,
  planPaladinVirtue,
  previewPaladinTrialDuel,
} from "./airshipPaladin";

const here = path.dirname(fileURLToPath(import.meta.url));
const t1Root = path.resolve(here, "../assets/t1");
const frontendSrcRoot = path.resolve(here, "..");
const T = Date.parse("2026-11-18T02:00:00.000Z");

describe("WL-16 frontend art contract, merged entry (no new header pill), zero-SVG/Emoji guard and Airship / Paladin helpers", () => {
  it("registers the 6 WL-16 square RGBA .webp icons (shipped size, see docs/PERF.md) in the T1 contract, keeps a dated wl cache version and only uses real town / item / monster art", () => {
    assert.match(T1_ASSET_CACHE_VERSION, /^\d{8}wl\d+$/);
    assert.deepEqual([...WL16_AIRSHIP_PALADIN_ART_IDS], ["airship_dock", "trade_airship", "cargo_crate", "paladin_trial", "honor_medal", "trial_banner"]);
    for (const id of WL16_AIRSHIP_PALADIN_ART_IDS) {
      const key = t1KeyFor("skills", id)!;
      assert.ok((T1_ASSET_KEYS as readonly string[]).includes(key), `Missing T1 key ${key}`);
      const spec = specByKey(key);
      assert.equal(spec?.profile, "icon");
      assert.equal(spec?.priority, "P2");
      const webp = path.join(t1Root, `${key}.webp`);
      assert.equal(existsSync(webp), true, `Missing .webp asset on disk: ${webp}`);
      assert.ok(statSync(webp).size > 2048, `Asset ${webp} unexpectedly small`);
      const size = rasterSize(readFileSync(webp), "webp");
      assert.ok(size!.width >= 256 && size!.width <= 512, `${key} ${size!.width}`);
      assert.equal(size!.height, size!.width);
    }
    assert.equal(withAssetCacheVersion("/assets/trade_airship.webp"), `/assets/trade_airship.webp?v=${T1_ASSET_CACHE_VERSION}`);
    for (const town of AIRSHIP_TOWNS) {
      assert.equal(existsSync(path.join(t1Root, `skills/${town.artId}.webp`)), true, `${town.id} reuses existing town art`);
    }
    const items = packJson.items as Array<{ id: string }>;
    const monsters = packJson.monsters as Array<{ id: string }>;
    for (const g of AIRSHIP_GOODS) {
      assert.ok(items.some((i) => i.id === g.id), `${g.id} is a pack item`);
      assert.equal(existsSync(path.join(t1Root, `${t1KeyFor("item", g.id)}.webp`)), true, `item art for ${g.id}`);
    }
    for (const h of AIRSHIP_HULLS) {
      for (const itemId of Object.keys(h.materials)) {
        assert.ok(items.some((i) => i.id === itemId), `${itemId} is a pack item`);
        assert.equal(existsSync(path.join(t1Root, `${t1KeyFor("item", itemId)}.webp`)), true, `item art for ${itemId}`);
      }
    }
    for (const f of PALADIN_FOES) {
      assert.ok(monsters.some((m) => m.id === f.monsterId), `${f.monsterId} is a pack monster`);
      assert.equal(existsSync(path.join(t1Root, `monsters/${f.monsterId}.webp`)), true, `monster art for ${f.monsterId}`);
    }
  });

  it("merges the entry into the existing tavern panel (two new tabs) and the 生涯 drawer, keeping the header at 9 pills and the panel free of SVG/Emoji/remount flicker", () => {
    const endgame = CAREER_GROUPS.find((g) => g.title === "远期")!;
    assert.ok(endgame.items.includes("airship"));
    assert.ok(endgame.items.indexOf("airship") === endgame.items.indexOf("tavern") + 1, "drawer entry sits right after the tavern");
    assert.ok(endgame.items.indexOf("airship") < endgame.items.indexOf("prestige"));
    assert.equal(CAREER_GROUPS.length, 4);

    const headerSrc = readFileSync(path.join(frontendSrcRoot, "components/GameHeader.tsx"), "utf8");
    assert.equal(headerSrc.includes('airship: "飞艇试炼"'), true);
    const pills = [...headerSrc.matchAll(/className="header-([a-z]+)-pill"/g)].map((m) => m[1]);
    assert.deepEqual(pills, ["tavern", "ranch", "arena", "academy", "harbor", "forge", "relics", "cauldron", "caravan"], "still exactly 9 header pills");
    assert.equal(/header-(airship|paladin|trial)/.test(headerSrc), false, "no WL-16 header pill");
    assert.equal(/onOpenProg\("airship"\)/.test(headerSrc), false, "no direct header button for WL-16");

    const ngiSrc = readFileSync(path.join(frontendSrcRoot, "components/NewGameInterface.tsx"), "utf8");
    assert.equal(ngiSrc.includes("(progPanel === 'tavern' || progPanel === 'airship') && ("), true);
    assert.equal(ngiSrc.includes("initialTab={progPanel === 'airship' ? 'airship' : 'tavern'}"), true);

    const advSrc = readAdvancementPanels(frontendSrcRoot);
    const tavern = advSrc.slice(advSrc.indexOf("export function BardTavernChroniclePanel"), advSrc.indexOf("浮空飞艇商路 & 圣骑士团荣誉试炼 (WL-16)"));
    for (const id of ["tavern-tab-tavern", "tavern-tab-chronicle", "tavern-tab-airship", "tavern-tab-trial"]) {
      assert.equal(tavern.includes(`data-testid="${id}"`), true, `${id} tab`);
    }
    assert.equal(tavern.includes("<AirshipPaladinView"), true, "WL-16 renders inside the existing panel");
    const slice = advSrc.slice(advSrc.lastIndexOf("浮空飞艇商路 & 圣骑士团荣誉试炼 (WL-16)"));
    assert.equal(/<svg[\s>]/i.test(slice), false, "no inline <svg>");
    assert.equal(/<canvas[\s>]/i.test(slice), false, "no <canvas> icons");
    assert.equal(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(slice), false, "no Emoji");
    assert.equal(slice.includes("[toast]"), false, "load callback must use toastRef");
    assert.equal(slice.includes("loading && !info"), true, "view stays mounted after first load");
    for (const id of WL16_AIRSHIP_PALADIN_ART_IDS) assert.equal(slice.includes(`id="${id}"`), true, `view renders T1Art ${id}`);
    assert.equal(slice.includes('kind="monster" id={s.monsterId}'), true, "trial phantoms use real monster art");
    assert.equal(slice.includes("T1ItemIcon itemId={g.id}"), true, "specialties use real item art");
    assert.equal(slice.includes('kind="skills" id={m.artId}'), true, "towns use their existing art");
    for (const fn of ["planAirshipBuy(", "planAirshipSell(", "formatPaladinStats(", "formatAirshipTrend("]) {
      assert.equal(slice.includes(fn), true, `${fn} comes from the symmetric mirror`);
    }
    assert.equal(slice.includes("dayKey: a.dayKey"), true, "trades tell the server which market day they price");
    assert.equal(slice.includes("weekKey: t.weekKey"), true, "challenges tell the server which trial week they target");

    const css = readFileSync(path.join(frontendSrcRoot, "components/AdvancementPanels.css"), "utf8").replace(/\r\n/g, "\n");
    for (const cls of ["as-buy-btn", "as-sell-btn", "as-launch-btn", "as-open-btn", "as-hull-btn", "ht-challenge-btn", "ht-virtue-btn"]) {
      assert.equal(css.includes(`.${cls}:not(:disabled)`), true, `${cls} gradient only when enabled`);
      assert.equal(new RegExp(`(^|\\n)\\s*\\.${cls}\\s*\\{`).test(css), false, `${cls} must not override .prog-claim-btn:disabled`);
    }
    // WL-16 rules sit before WL-15's trailing breakpoints so the header-pill breakpoint blocks stay the last ones
    const wl16 = css.indexOf("(WL-16)");
    assert.ok(wl16 > 0 && wl16 < css.lastIndexOf("@media (max-width: 1599px)"));
    assert.ok(wl16 < css.lastIndexOf("@media (max-width: 760px)") && wl16 < css.lastIndexOf("@media (max-width: 480px)"));
  });

  it("prices the UTC+8 daily market, plans buys / sells and voyages", () => {
    assert.equal(airshipDayKey(Date.parse("2026-11-18T15:59:00.000Z")), "2026-11-18");
    assert.equal(airshipDayKey(Date.parse("2026-11-18T16:00:00.000Z")), "2026-11-19");
    const d = airshipDayIndex(T);
    for (const g of AIRSHIP_GOODS) {
      const q = getAirshipBuyQuote(d, g.id)!;
      assert.equal(q.townId, g.origin);
      assert.ok(q.pct >= 80 && q.pct <= 92);
      assert.equal(q.price, Math.floor((g.basePrice * q.pct) / 100));
      assert.equal(getAirshipSellQuote(d, g.origin, g.id), null, "origin never buys its own specialty");
      for (const t of AIRSHIP_TOWNS.filter((x) => x.id !== g.origin)) {
        const s = getAirshipSellQuote(d, t.id, g.id, 4)!;
        assert.ok(Math.abs(s.pct - g.demand[t.id]!) <= 25);
        assert.equal(s.price, Math.max(1, Math.floor((s.listPrice * 104) / 100)));
      }
    }
    // buy plan: origin only, hull-gated, capped by stock, space and gold
    const ok = planAirshipBuy(d, "frostport", 1, "fish_deepsea", 5, {}, { fish_deepsea: 30 }, 100_000);
    assert.equal(ok.ok, true);
    assert.equal(ok.maxQty, AIRSHIP_DAILY_STOCK - 30);
    assert.equal(ok.total, 5 * ok.unitPrice);
    assert.equal(planAirshipBuy(d, "guild_town", 1, "fish_deepsea", 5, {}, {}, 100_000).ok, false, "not at the origin");
    assert.equal(planAirshipBuy(d, "frostport", 1, "snow_pelt", 1, {}, {}, 100_000).hullOk, false, "pelts need hull 2");
    assert.equal(planAirshipBuy(d, "frostport", 1, "fish_deepsea", 1, { cheese_wheel: 20 }, {}, 100_000).spaceLeft, 0);
    assert.equal(planAirshipBuy(d, "frostport", 1, "fish_deepsea", 1, {}, {}, 10).maxQty, 0);
    assert.equal(planAirshipBuy(d, "frostport", 1, "fish_deepsea", 1.5, {}, {}, 100_000).ok, false);
    // sell plan: proportional cost share
    const sell = planAirshipSell(d, "emberoasis", "fish_deepsea", 4, { fish_deepsea: 10 }, { fish_deepsea: 700 }, 0);
    assert.equal(sell.ok, true);
    assert.equal(sell.costShare, 280);
    assert.equal(sell.profit, sell.total - 280);
    assert.equal(planAirshipSell(d, "emberoasis", "fish_deepsea", 11, { fish_deepsea: 10 }, {}, 0).ok, false);
    assert.equal(planAirshipSell(d, "frostport", "fish_deepsea", 1, { fish_deepsea: 10 }, {}, 0).ok, false);
    // routes, levels, durations
    assert.equal(airshipRouteDestination("guild_frostport", "guild_town"), "frostport");
    assert.equal(airshipRouteDestination("guild_frostport", "frostport"), "guild_town");
    assert.equal(airshipRouteDestination("guild_frostport", "emberoasis"), null);
    assert.equal(getAirshipVoyageMs("guild_frostport", 0, 1), 20 * 60_000);
    assert.equal(getAirshipVoyageMs("starfall_frost", 75, 5), Math.round((40 * 60_000 * 64) / 100));
    assert.equal(getAirshipRouteLevel(17).level, 2);
    assert.equal(getAirshipRouteLevel(75).level, 5);
    assert.equal(getAirshipRouteLevel(75).next, null);
    assert.deepEqual([0, 1, 9, 10, 20, 500].map(airshipVoyageXp), [0, 1, 1, 2, 3, 11]);
    const hull = planAirshipHullUpgrade(1, 1500, { lumber_3: 20, ingot_2: 12 });
    assert.equal(hull.ok, true);
    assert.equal(planAirshipHullUpgrade(1, 1499, { lumber_3: 20, ingot_2: 12 }).goldOk, false);
    assert.equal(planAirshipHullUpgrade(5, 1e9, {}).maxed, true);
    assert.equal(AIRSHIP_ROUTES.length, 6);

    assert.equal(formatAirshipDuration(25 * 60_000), "25 分钟");
    assert.equal(formatAirshipDuration(95_000), "1 分 35 秒");
    assert.equal(formatAirshipDuration(45_000), "45 秒");
    assert.equal(formatAirshipTrend(50, 47), "涨 3");
    assert.equal(formatAirshipTrend(47, 50), "跌 3");
    assert.equal(formatAirshipTrend(5, 5), "持平");
    assert.equal(formatAirshipProfit(-30), "亏 30");
    assert.equal(formatAirshipProfit(120), "盈 120");
  });

  it("rotates the weekly trial on UTC+8 Mondays, builds phantoms from real monster stats and caps the virtue bonuses", () => {
    // 2026-11-16 is a Monday; Sunday 23:59 UTC+8 is still the old week
    assert.equal(paladinWeekKey(Date.parse("2026-11-15T15:59:00.000Z")), "2026-11-09");
    assert.equal(paladinWeekKey(Date.parse("2026-11-15T16:00:00.000Z")), "2026-11-16");
    assert.equal(paladinWeekIndexFromKey("2026-11-17"), null, "week keys are Mondays");
    const w = paladinWeekIndex(T);
    assert.equal(paladinWeekIndexFromKey("2026-11-16"), w);
    assert.equal(paladinWeekEndsAtMs(T), Date.parse("2026-11-22T16:00:00.000Z"));
    assert.notEqual(getPaladinTheme(w).id, getPaladinTheme(w + 1).id, "the vow theme rotates every week");
    assert.equal(getPaladinTheme(w).id, getPaladinTheme(w + PALADIN_THEMES.length).id);
    for (const s of PALADIN_STAGES) {
      const o = generatePaladinOpponent(w, s.stage);
      assert.deepEqual(generatePaladinOpponent(w, s.stage), o, "deterministic within a week");
      assert.ok(s.pool.includes(o.monsterId));
      const foe = PALADIN_FOES.find((f) => f.monsterId === o.monsterId)!;
      const theme = getPaladinTheme(w);
      assert.equal(o.hp, Math.round((foe.hp * s.hpPct * theme.hpPct) / 10_000));
      assert.equal(o.isBoss, s.boss);
      assert.deepEqual(o.mechanics, s.boss ? [...theme.mechanics] : []);
    }
    assert.deepEqual(cleanPaladinCleared([1, 2, 4, "3"]), [1, 2]);
    assert.equal(getPaladinStageReward(6).medals, PALADIN_STAGES[5].medals + PALADIN_FULL_CLEAR_BONUS);
    assert.equal(getPaladinHonorRank(74).current.name, "白银骑士");
    const v = planPaladinVirtue({ valor: 2 }, "valor", 100, 74);
    assert.equal(v.ok, true);
    assert.equal(v.cost, PALADIN_VIRTUE_COSTS[2]);
    assert.equal(planPaladinVirtue({ valor: 3 }, "valor", 100, 74).rankOk, false, "rank 4 needs 圣殿骑士");
    assert.equal(planPaladinVirtue({ valor: 5 }, "valor", 999, 999).maxed, true);
    const full = getPaladinTrialBonuses({ paladinTrial: { virtues: { valor: 5, aegis: 5, vigor: 5, glory: 5 } } });
    assert.deepEqual(
      { atk: full.bonusAtk, def: full.bonusDef, hp: full.bonusHp, gold: full.goldGainPct, xp: full.xpGainPct },
      { atk: PALADIN_BONUS_CAPS.bonusAtk, def: PALADIN_BONUS_CAPS.bonusDef, hp: PALADIN_BONUS_CAPS.bonusHp, gold: PALADIN_BONUS_CAPS.goldGainPct, xp: PALADIN_BONUS_CAPS.xpGainPct }
    );
    assert.deepEqual(getPaladinTrialBonuses({ paladinTrial: { virtues: { valor: 99, aegis: "x", vigor: -3 } } }).bonusAtk, 15, "dirty ranks never exceed the cap");
    assert.deepEqual(formatPaladinStats({ bonusAtk: 6, bonusHp: 30, goldGainPct: 1, xpGainPct: 1 }), ["攻击 +6", "生命 +30", "单人战斗金币 +1%", "生活技能经验 +1%"]);
  });

  it("feeds capped vow bonuses into combinedBuildFromState / combat sheets and previews trial duels with the real fight simulator", () => {
    const base: any = {
      combatLevel: 30,
      combatSkills: { melee: { level: 40, xp: 0 }, attack: { level: 40, xp: 0 }, defense: { level: 40, xp: 0 }, stamina: { level: 40, xp: 0 } },
      inventory: { weapon_steel_axe: 1 },
      equipment: { main_hand: "weapon_steel_axe" },
    };
    const sworn: any = { ...base, paladinTrial: { virtues: { valor: 5, aegis: 5, vigor: 5, glory: 5 }, totalMedals: 500 } };
    const b0 = combinedBuildFromState(base);
    const b1 = combinedBuildFromState(sworn);
    assert.equal(b1.atk - b0.atk, 15);
    assert.equal(b1.def - b0.def, 10);
    assert.equal(b1.hp - b0.hp, 150);
    assert.ok(Math.abs(b1.goldMult / b0.goldMult - 1.05) < 1e-3);
    assert.deepEqual(paladinTrialCombatExtras(sworn), getPaladinTrialBonuses(sworn));
    const s0 = arenaCombatSheet(base, packJson.items as any, packJson.equipmentSets as any);
    const s1 = arenaCombatSheet(sworn, packJson.items as any, packJson.equipmentSets as any);
    assert.equal(s1.hp - s0.hp, 150);
    const w = paladinWeekIndex(T);
    const p1 = previewPaladinTrialDuel(s1, generatePaladinOpponent(w, 1), [], packJson.bossMechanics as any);
    assert.equal(p1.won, true, "a level-40 fighter clears the squire trial");
    const p6 = previewPaladinTrialDuel(s1, generatePaladinOpponent(w, 6), [], packJson.bossMechanics as any);
    assert.equal(p6.won, false, "but not the paladin-commander trial");
    assert.equal(p6.enemyMaxHp, generatePaladinOpponent(w, 6).hp);
    // dirty trial data never leaks into combat
    const dirty: any = { ...base, paladinTrial: { virtues: "x" } };
    assert.deepEqual(combatSheetFromPack(dirty, packJson.items as any, packJson.equipmentSets as any), combatSheetFromPack(base, packJson.items as any, packJson.equipmentSets as any));
  });

  it("keeps the shared core pure: no wall clock, no Math.random", () => {
    const src = readFileSync(path.join(here, "airshipPaladin.ts"), "utf8");
    const core = src.slice(src.indexOf("WL-16 core） ----"), src.indexOf("以上为 WL-16 core"));
    assert.ok(core.length > 1000);
    assert.equal(/Date\.now\(/.test(core), false);
    assert.equal(/new Date\(\)/.test(core), false);
    assert.equal(/Math\.random/.test(core), false);
  });
});
