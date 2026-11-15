import assert from "node:assert/strict";
import { describe, it } from "node:test";
import packJson from "../shared/enhanced_content_pack_chinese.json";
import type { EnhancedContentPack } from "../backend/src/types";
import {
  CARAVAN_REP_TIERS as BE_REP_TIERS,
  CARAVAN_TRADE_ROUTES as BE_ROUTES,
  buildCaravanScarcityShiftKey as beShiftKey,
  classifyCaravanCargoCategory as beClassify,
  ensureCaravanTrade,
  getCaravanRouteScarcity as beScarcity,
  getCaravanTradeBonuses as beBonuses,
  getCaravanTradeInfo,
  previewCaravanDispatch,
} from "../backend/src/progression2";
import { defaultEnhancedPlayerState } from "../backend/src/storage";
import { playerBuildExtras, startHpCombat } from "../backend/src/hp_combat";
import { combatSheetFromPack, combinedBuildFromState } from "../frontend/src/gameplay/combatSheet";
import {
  CARAVAN_REP_TIERS as FE_REP_TIERS,
  CARAVAN_TRADE_ROUTES_META as FE_ROUTES,
  buildCaravanScarcityShiftKey as feShiftKey,
  classifyCaravanCargoCategory as feClassify,
  getCaravanRouteScarcity as feScarcity,
  getCaravanTradeBonuses as feBonuses,
  previewCaravanCargoFrontend,
} from "../frontend/src/gameplay/caravanTrade";

const pack = packJson as EnhancedContentPack;

describe("WL-7 backend <-> frontend Expedition Caravan Trade parity", () => {
  const T0 = new Date("2026-11-15T12:00:00.000Z");
  const fightPack = {
    ...pack,
    actions: (pack.actions as any[]).map((a: any) =>
      String(a.id).startsWith("act_combat_") ? { ...a, requirements: {} } : a
    ),
  } as EnhancedContentPack;
  const rawMonster = (pack.monsters as any[])[0];

  it("maintains 1:1 parity across all 399 content pack items for cargo category classification and route scarcity", () => {
    assert.deepEqual(FE_REP_TIERS, BE_REP_TIERS);
    assert.equal(FE_ROUTES.length, BE_ROUTES.length);

    for (const item of pack.items as Array<{ id: string; type?: string; toolFor?: string }>) {
      assert.equal(
        feClassify(item.id, item),
        beClassify(item.id, item),
        `Cargo category mismatch on item ${item.id}`
      );
    }

    for (let d = 0; d < 4; d++) {
      for (const h of [0, 6, 12, 18]) {
        const dt = new Date(2026, 10, 15 + d, h, 30, 0);
        assert.equal(feShiftKey(dt), beShiftKey(dt));
        for (const r of BE_ROUTES) {
          assert.deepEqual(
            feScarcity(r.id, dt),
            beScarcity(r.id, dt),
            `Scarcity mismatch for ${r.id} at ${dt.toISOString()}`
          );
        }
      }
    }
  });

  it("maintains 1:1 parity across all 6 Caravan Rep levels × 6 Ledger ranks for bonuses, combat build, and cargo preview", () => {
    for (const tier of BE_REP_TIERS) {
      for (const ledgerRank of [0, 1, 2, 3, 4, 5]) {
        const state = defaultEnhancedPlayerState(pack.version || "1.0.0");
        state.chapter1Build = "berserk";
        state.chapter4Build = "alchemy_potent";
        state.inventory.weapon_iron_sword = 1;
        state.inventory.armor_cloth_chest = 1;
        (state.equipment as any).main_hand = "weapon_iron_sword";
        (state.equipment as any).chest = "armor_cloth_chest";

        const ct = ensureCaravanTrade(state, T0);
        ct.caravanRep = tier.minRep;
        ct.ledgerRank = ledgerRank;

        const bBonus = beBonuses(state);
        const fBonus = feBonuses(state as any);
        assert.deepEqual(fBonus, bBonus, `Bonuses mismatch at RepLv${tier.level} Ledger${ledgerRank}`);

        const be = playerBuildExtras(state);
        const fe = combinedBuildFromState(state as any);
        assert.ok(
          Math.abs(fe.goldMult - be.goldMult) < 1e-9,
          `goldMult mismatch at RepLv${tier.level} Ledger${ledgerRank}: fe=${fe.goldMult} vs be=${be.goldMult}`
        );

        const enc = startHpCombat(state, fightPack, rawMonster.id, T0);
        const sheet = combatSheetFromPack(state as any, pack.items as any, pack.equipmentSets as any);
        assert.equal(sheet.hp, enc.playerMaxHp);
        assert.equal(sheet.intervalMs, enc.playerIntervalMs);
      }
    }

    // Verify 1:1 cargo dispatch preview across all 3 routes
    const sampleState = defaultEnhancedPlayerState(pack.version || "1.0.0");
    sampleState.inventory = {
      gold: 1000,
      wood_1: 50,
      lumber_1: 30,
      fish_river: 30,
      ore_1: 50,
      ingot_1: 30,
      crystal_1: 30,
      potion_hp_t1: 25,
    };
    const ct = ensureCaravanTrade(sampleState, T0);
    ct.caravanRep = 580;
    ct.ledgerRank = 2;
    const info = getCaravanTradeInfo(sampleState, pack, T0);

    const cargoCases = [
      { routeId: "frostport" as const, cargo: { wood_1: 20, lumber_1: 12, fish_river: 10 } },
      { routeId: "emberoasis" as const, cargo: { ore_1: 24, ingot_1: 12, wood_1: 6 } },
      { routeId: "starfallspire" as const, cargo: { crystal_1: 15, potion_hp_t1: 12 } },
    ];

    for (const c of cargoCases) {
      const bePrev = previewCaravanDispatch(sampleState, pack, c.routeId, c.cargo, info.shiftKey);
      const fePrev = previewCaravanCargoFrontend({
        routeId: c.routeId,
        cargo: c.cargo,
        catalog: info.idleCargoCatalog,
        shiftKey: info.shiftKey,
        caravanRep: ct.caravanRep,
        ledgerRank: ct.ledgerRank,
      });
      assert.equal(bePrev.ok, true);
      assert.equal(fePrev.valid, true);
      assert.equal(fePrev.totalUnits, bePrev.totalUnits);
      assert.equal(fePrev.baseCargoValue, bePrev.baseCargoValue);
      assert.equal(fePrev.effectiveCargoValue, bePrev.effectiveCargoValue);
      assert.deepEqual(fePrev.expectedReward, bePrev.expectedReward, `Preview reward mismatch on ${c.routeId}`);
    }
  });
});
