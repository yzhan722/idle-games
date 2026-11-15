import assert from "node:assert/strict";
import { describe, it } from "node:test";
import packJson from "../shared/enhanced_content_pack_chinese.json";
import type { EnhancedContentPack, HeritageRuneId } from "../backend/src/types";
import {
  CROSS_PROF_RESONANCE_SETS,
  HERITAGE_RUNES,
  ensureHeritageWorkshop,
  syncHeritageCodex,
} from "../backend/src/progression2";
import { defaultEnhancedPlayerState } from "../backend/src/storage";
import { playerBuildExtras, startHpCombat } from "../backend/src/hp_combat";
import { combatSheetFromPack, combinedBuildFromState } from "../frontend/src/gameplay/combatSheet";

const pack = packJson as EnhancedContentPack;

describe("WL-6 backend <-> frontend Heritage Workshop & Codex combat parity", () => {
  const T0 = new Date("2026-11-15T12:00:00.000Z");
  const fightPack = {
    ...pack,
    actions: (pack.actions as any[]).map((a: any) =>
      String(a.id).startsWith("act_combat_") ? { ...a, requirements: {} } : a
    ),
  } as EnhancedContentPack;
  const rawMonster = (pack.monsters as any[])[0];

  function assertBackendFrontendParity(state: ReturnType<typeof defaultEnhancedPlayerState>, label: string) {
    const be = playerBuildExtras(state);
    const fe = combinedBuildFromState(state as any);

    assert.equal(fe.atk, be.atk, `${label}: atk mismatch`);
    assert.equal(fe.def, be.def, `${label}: def mismatch`);
    assert.equal(fe.hp, be.hp, `${label}: hp mismatch`);
    assert.ok(Math.abs(fe.armorPenPct - be.armorPenPct) < 1e-9, `${label}: armorPenPct mismatch`);
    assert.ok(Math.abs(fe.thornsDefRatio - be.thornsDefRatio) < 1e-9, `${label}: thornsDefRatio mismatch`);
    assert.ok(Math.abs(fe.intervalMult - be.intervalMult) < 1e-9, `${label}: intervalMult mismatch`);
    assert.ok(Math.abs(fe.goldMult - be.goldMult) < 1e-9, `${label}: goldMult mismatch`);
    assert.ok(Math.abs(fe.potionBuffMult - be.potionBuffMult) < 1e-9, `${label}: potionBuffMult mismatch`);
    assert.ok(Math.abs(fe.foodHealMult - be.foodHealMult) < 1e-9, `${label}: foodHealMult mismatch`);
    assert.equal(fe.critRateBonusPct || 0, be.critRateBonusPct || 0, `${label}: critRateBonusPct mismatch`);
    assert.equal(fe.critDmgBonusPct || 0, be.critDmgBonusPct || 0, `${label}: critDmgBonusPct mismatch`);

    const enc = startHpCombat(state, fightPack, rawMonster.id, T0);
    const sheet = combatSheetFromPack(state as any, pack.items as any, pack.equipmentSets as any);
    assert.equal(sheet.hp, enc.playerMaxHp, `${label}: combatSheet hp !== startHpCombat playerMaxHp`);
    assert.equal(
      sheet.intervalMs,
      enc.playerIntervalMs,
      `${label}: combatSheet intervalMs !== startHpCombat playerIntervalMs`
    );
  }

  it("maintains 1:1 parity across every individual Heritage Rune at ranks 1, 3, and 5", () => {
    for (const rune of HERITAGE_RUNES) {
      for (const rank of [1, 3, 5]) {
        const state = defaultEnhancedPlayerState(pack.version || "1.0.0");
        state.inventory.weapon_wooden_sword = 1;
        state.inventory.armor_wood_chest = 1;
        (state.equipment as any).main_hand = "weapon_wooden_sword";
        (state.equipment as any).chest = "armor_wood_chest";

        const hw = ensureHeritageWorkshop(state);
        hw.runeRanks[rune.id as HeritageRuneId] = rank;
        hw.equippedRunes[rune.slot] = rune.id as HeritageRuneId;

        assertBackendFrontendParity(state, `${rune.id}@Lv${rank}`);
      }
    }
  });

  it("maintains 1:1 parity across progressive Codex Set tiers (0, 4, 8, and all 12 tiers) stacked with Chapter builds", () => {
    const allTiers = CROSS_PROF_RESONANCE_SETS.flatMap((s) => s.tiers);
    for (const tierCount of [0, 1, 4, 8, 12]) {
      const state = defaultEnhancedPlayerState(pack.version || "1.0.0");
      state.chapter1Build = "berserk";
      state.chapter2Build = "heavy_sunder";
      state.chapter3Build = "gale_flurry";
      state.chapter4Build = "feast_vitality";
      state.inventory.weapon_frost_blade = 1;
      state.inventory.armor_frost_chest = 1;
      (state.equipment as any).main_hand = "weapon_frost_blade";
      (state.equipment as any).chest = "armor_frost_chest";

      const hw = ensureHeritageWorkshop(state);
      hw.runeRanks = {
        rune_tempest_fang: 4,
        rune_vital_aegis: 5,
        rune_artisan_forge: 3,
      };
      hw.equippedRunes = {
        weapon: "rune_tempest_fang",
        armor: "rune_vital_aegis",
        tool: "rune_artisan_forge",
      };

      for (let i = 0; i < tierCount; i++) {
        for (const iid of allTiers[i].itemIds) {
          state.inventory[iid] = 1;
        }
      }
      syncHeritageCodex(state);
      assertBackendFrontendParity(state, `codexTiers=${tierCount}`);
    }
  });
});
