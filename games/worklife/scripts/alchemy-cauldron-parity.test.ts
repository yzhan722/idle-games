import assert from "node:assert/strict";
import { describe, it } from "node:test";
import packJson from "../shared/enhanced_content_pack_chinese.json";
import type { AlchemicalPotionId, EnhancedContentPack } from "../backend/src/types";
import {
  ALCHEMICAL_POTIONS as BE_POTIONS,
  ALCHEMY_RECIPE_UPGRADE_COSTS as BE_UPGRADE_COSTS,
  CAULDRON_MASTERY_TIERS as BE_MASTERY_TIERS,
  TWIN_ALCHEMICAL_RESONANCES as BE_RESONANCES,
  ensureAlchemyCauldron,
  getAlchemyCauldronBonuses as beCauldronBonuses,
} from "../backend/src/progression2";
import { defaultEnhancedPlayerState } from "../backend/src/storage";
import { hitDamage, monsterCombatant, playerCombatant } from "../backend/src/first_hour_combat";
import { playerBuildExtras, startHpCombat } from "../backend/src/hp_combat";
import { combatSheetFromPack, combinedBuildFromState } from "../frontend/src/gameplay/combatSheet";
import { previewFight } from "../frontend/src/gameplay/fightPreview";
import {
  ALCHEMICAL_POTIONS_META as FE_POTIONS,
  ALCHEMY_RECIPE_UPGRADE_COSTS as FE_UPGRADE_COSTS,
  CAULDRON_MASTERY_TIERS as FE_MASTERY_TIERS,
  TWIN_ALCHEMICAL_RESONANCES as FE_RESONANCES,
  getAlchemyCauldronBonuses as feCauldronBonuses,
} from "../frontend/src/gameplay/alchemyCauldron";

const pack = packJson as EnhancedContentPack;

describe("WL-8 backend <-> frontend Chimera Alchemy Cauldron & Twin Resonance 1:1 parity", () => {
  const T0 = new Date("2026-11-15T12:00:00.000Z");
  const fightPack = {
    ...pack,
    actions: (pack.actions as any[]).map((a: any) =>
      String(a.id).startsWith("act_combat_") ? { ...a, requirements: {} } : a
    ),
  } as EnhancedContentPack;

  const normalMonster =
    (pack.monsters as any[]).find((m) => !m.isBoss && Number(m.def || 0) > 10) || (pack.monsters as any[])[0];
  const bossMonster =
    (pack.monsters as any[]).find((m) => m.isBoss && Number(m.def || 0) > 10) || {
      ...(pack.monsters as any[])[0],
      id: "parity_boss",
      name: "深渊奇美拉BOSS",
      isBoss: true,
      hp: 800,
      atk: 25,
      def: 80,
    };

  it("keeps static potion definitions, upgrade costs, mastery tiers, and all 6 Twin Resonance tables identical", () => {
    assert.deepEqual(FE_POTIONS, BE_POTIONS);
    assert.deepEqual(FE_MASTERY_TIERS, BE_MASTERY_TIERS);
    assert.deepEqual(FE_UPGRADE_COSTS, BE_UPGRADE_COSTS);
    assert.deepEqual(FE_RESONANCES, BE_RESONANCES);
  });

  it("maintains 1:1 parity across all 6 Cauldron Mastery Ranks, single potions, and all 6 unordered Twin Resonance pairs (normal & Boss combat)", () => {
    const loadoutCases: Array<{
      slots: [AlchemicalPotionId | null, AlchemicalPotionId | null];
      ranks: [number, number];
      charges: [number, number];
    }> = [
      { slots: [null, null], ranks: [1, 1], charges: [0, 0] },
      { slots: ["dragon_fury", null], ranks: [3, 1], charges: [5, 0] },
      { slots: [null, "elven_bounty"], ranks: [1, 4], charges: [0, 5] },
      // Depleted charge edge case: slotted but 0 charges!
      { slots: ["dragon_fury", "dwarven_temper"], ranks: [5, 5], charges: [5, 0] },
    ];

    // Add all 6 unordered pairs in both [A, B] and [B, A] orders at mixed & max ranks
    for (const res of BE_RESONANCES) {
      loadoutCases.push({ slots: [res.pair[0], res.pair[1]], ranks: [2, 5], charges: [6, 6] });
      loadoutCases.push({ slots: [res.pair[1], res.pair[0]], ranks: [5, 5], charges: [10, 10] });
    }

    for (const tier of BE_MASTERY_TIERS) {
      for (const lc of loadoutCases) {
        const state = defaultEnhancedPlayerState(pack.version || "1.0.0");
        state.combatLevel = 18;
        state.chapter1Build = "berserk";
        state.chapter2Build = "heavy_sunder";
        state.chapter4Build = "alchemy_potent";
        state.inventory.weapon_iron_sword = 1;
        state.inventory.armor_cloth_chest = 1;
        (state.equipment as any).main_hand = "weapon_iron_sword";
        (state.equipment as any).chest = "armor_cloth_chest";

        const ac = ensureAlchemyCauldron(state, T0);
        ac.cauldronPoints = tier.minPoints;
        ac.alchemyCauldronRank = tier.level;
        ac.equippedPotions = [...lc.slots];
        if (lc.slots[0]) {
          ac.recipeRanks[lc.slots[0]] = lc.ranks[0];
          ac.potionCharges[lc.slots[0]] = lc.charges[0];
        }
        if (lc.slots[1]) {
          ac.recipeRanks[lc.slots[1]] = lc.ranks[1];
          ac.potionCharges[lc.slots[1]] = lc.charges[1];
        }

        const bBon = beCauldronBonuses(state);
        const fBon = feCauldronBonuses(state as any);
        assert.deepEqual(
          fBon,
          bBon,
          `Cauldron bonuses mismatch at Tier=${tier.level} slots=${JSON.stringify(lc.slots)}`
        );

        const beExt = playerBuildExtras(state);
        const feExt = combinedBuildFromState(state as any);
        assert.equal(feExt.combatAtkPct, beExt.combatAtkPct);
        assert.ok(Math.abs(feExt.bossArmorBreakPct - beExt.bossArmorBreakPct) < 1e-9);
        assert.ok(Math.abs(feExt.armorPenPct - beExt.armorPenPct) < 1e-9);
        assert.ok(Math.abs(feExt.goldMult - beExt.goldMult) < 1e-9);

        const enc = startHpCombat(state, fightPack, normalMonster.id, T0);
        const sheet = combatSheetFromPack(state as any, pack.items as any, pack.equipmentSets as any);
        assert.equal(sheet.hp, enc.playerMaxHp);
        assert.equal(sheet.intervalMs, enc.playerIntervalMs);

        const bePlayer = playerCombatant(state, fightPack, {
          atk: beExt.atk,
          combatAtkPct: beExt.combatAtkPct,
          def: beExt.def,
          hp: beExt.hp,
          armorPenPct: beExt.armorPenPct,
          bossArmorBreakPct: beExt.bossArmorBreakPct,
          intervalMult: beExt.intervalMult,
        });
        assert.equal(sheet.atk, bePlayer.atk, `ATK mismatch at Tier=${tier.level} slots=${JSON.stringify(lc.slots)}`);
        assert.equal(sheet.def, bePlayer.def);

        // Verify 1:1 hit damage against both normal monster AND Boss monster
        const beNormalHit = hitDamage(bePlayer, monsterCombatant(normalMonster));
        const feNormalHit = previewFight(sheet, normalMonster as any).normalHit;
        assert.equal(feNormalHit, beNormalHit, "Normal monster hit damage mismatch");

        const beBossHit = hitDamage(bePlayer, monsterCombatant(bossMonster));
        const feBossHit = previewFight(sheet, bossMonster as any).normalHit;
        assert.equal(feBossHit, beBossHit, "Boss monster hit damage (with bossArmorBreakPct) mismatch");
      }
    }
  });
});
