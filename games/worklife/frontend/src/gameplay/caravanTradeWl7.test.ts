import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { T1_ASSET_KEYS, t1KeyFor } from "../assets/t1/keys";
import { specByKey } from "../assets/t1/contract";
import { CAREER_GROUPS } from "./ia";
import { combinedBuildFromState, caravanTradeCombatExtras } from "./combatSheet";
import { T1_ASSET_CACHE_VERSION, WL7_CARAVAN_ART_IDS, withAssetCacheVersion } from "./t1Art";
import {
  CARAVAN_REP_TIERS,
  CARAVAN_TRADE_ROUTES_META,
  buildCaravanScarcityShiftKey,
  getCaravanRouteScarcity,
  getCaravanTradeBonuses,
  previewCaravanCargoFrontend,
} from "./caravanTrade";

const t1Root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../assets/t1");
const frontendSrcRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("WL-7 frontend art contract, navigation IA, zero-SVG/Emoji guard, and caravan helpers", () => {
  it("registers all 6 WL-7 hand-drawn RGBA .webp caravan icons in T1 contract with cache version", () => {
    assert.match(T1_ASSET_CACHE_VERSION, /^\d{8}wl\d+$/);
    assert.equal(WL7_CARAVAN_ART_IDS.length, 6);

    for (const id of WL7_CARAVAN_ART_IDS) {
      const key = t1KeyFor("skills", id);
      assert.equal(key, `skills/${id}`);
      assert.ok((T1_ASSET_KEYS as readonly string[]).includes(key!), `Missing T1 key ${key}`);
      const spec = specByKey(key!);
      assert.ok(spec, `Missing T1 spec for ${key}`);
      assert.equal(spec?.profile, "icon");
      assert.equal(spec?.priority, "P2");
      const webpFile = path.join(t1Root, `${key}.webp`);
      assert.equal(existsSync(webpFile), true, `Missing .webp asset on disk: ${webpFile}`);
    }

    assert.equal(
      withAssetCacheVersion("/assets/caravan_hub_banner.webp"),
      `/assets/caravan_hub_banner.webp?v=${T1_ASSET_CACHE_VERSION}`
    );
  });

  it("wires 'caravan' into CAREER_GROUPS without breaking 4-group layout and enforces zero SVG/Emoji + anti-flicker", () => {
    assert.equal(CAREER_GROUPS.length, 4);
    const endgameGroup = CAREER_GROUPS.find((g) => g.title === "远期");
    assert.ok(endgameGroup);
    assert.equal(endgameGroup.items.includes("caravan"), true);

    const advSrc = readFileSync(path.join(frontendSrcRoot, "components/AdvancementPanels.tsx"), "utf8");
    const ctIndex = advSrc.indexOf("export function CaravanTradePanel");
    assert.ok(ctIndex > 0, "CaravanTradePanel must be exported in AdvancementPanels.tsx");
    const ctSlice = advSrc.slice(ctIndex);
    assert.equal(/<svg[\s>]/i.test(ctSlice), false, "CaravanTradePanel must not contain inline <svg>");
    assert.equal(
      /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(ctSlice),
      false,
      "CaravanTradePanel must not contain Emoji"
    );
    assert.equal(
      ctSlice.includes("[toast]"),
      false,
      "CaravanTradePanel load callback must use toastRef rather than [toast] dependency"
    );
    assert.equal(
      ctSlice.includes("loading && !info"),
      true,
      "CaravanTradePanel must preserve mounted .ct-panel-root once info is loaded"
    );
    assert.equal(
      ctSlice.includes('data-testid="caravan-trade-panel"'),
      true,
      "CaravanTradePanel must expose data-testid=\"caravan-trade-panel\""
    );

    const tradingSrc = readFileSync(path.join(frontendSrcRoot, "components/TradingMarketView.tsx"), "utf8");
    assert.equal(
      tradingSrc.includes('data-testid="open-caravan-trade-btn"'),
      true,
      "TradingMarketView must expose data-testid=\"open-caravan-trade-btn\""
    );
    assert.equal(/<svg[\s>]/i.test(tradingSrc), false, "TradingMarketView must not contain inline <svg>");
  });

  it("computes Caravan Reputation + Ledger bonuses, cargo dispatch preview, and combinedBuildFromState goldMult", () => {
    assert.equal(CARAVAN_REP_TIERS.length, 6);
    assert.equal(CARAVAN_TRADE_ROUTES_META.length, 3);

    const shiftKey = buildCaravanScarcityShiftKey(new Date(2026, 10, 15, 10, 0, 0));
    const sc = getCaravanRouteScarcity("frostport", shiftKey);
    assert.ok(sc.scarcityMultiplier >= 1.15 && sc.scarcityMultiplier <= 1.85);
    assert.equal(sc.hotItemIds.length, 2);

    const state = {
      combatLevel: 10,
      caravanTrade: {
        caravanRep: 580, // Lv.4: +10% gatherDouble, +12% craftSpeed, +13% goldGain, 2 wagons
        ledgerRank: 3, // +3% gatherDouble, +6% craftSpeed, +6% goldGain, +18% tradeYield, capacity 105
      },
    };
    const bonuses = getCaravanTradeBonuses(state);
    assert.equal(bonuses.level, 4);
    assert.equal(bonuses.maxWagons, 2);
    assert.equal(bonuses.maxCargoCapacity, 105);
    assert.equal(bonuses.gatherDoubleChance, 0.13);
    assert.equal(bonuses.craftSpeedPct, 18);
    assert.equal(bonuses.goldGainPct, 19);

    assert.deepEqual(caravanTradeCombatExtras(state), {
      goldGainPct: 19,
      craftSpeedPct: 18,
      gatherDoubleChance: 0.13,
    });
    const build = combinedBuildFromState(state);
    assert.ok(Math.abs(build.goldMult - 1.19) < 1e-9);

    const preview = previewCaravanCargoFrontend({
      routeId: "frostport",
      cargo: { wood_1: 20, lumber_1: 15 },
      catalog: [
        { itemId: "wood_1", name: "原木", idleQty: 50, unitValue: 5, category: "lumber_fish_dishes" },
        { itemId: "lumber_1", name: "木板", idleQty: 50, unitValue: 12, category: "lumber_fish_dishes" },
      ],
      shiftKey,
      caravanRep: 580,
      ledgerRank: 3,
    });
    assert.equal(preview.valid, true);
    assert.equal(preview.totalUnits, 35);
    assert.equal(preview.favoredUnits, 35);
    assert.ok(preview.effectiveCargoValue > preview.baseCargoValue);
    assert.ok(preview.expectedReward.gold >= 60);
    assert.ok(preview.expectedReward.astralCrystalDust >= 4);
  });
});
