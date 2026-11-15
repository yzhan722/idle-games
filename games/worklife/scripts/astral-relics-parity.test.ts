import assert from "node:assert/strict";
import { describe, it } from "node:test";
import packJson from "../shared/enhanced_content_pack_chinese.json";
import type {
  AstralRuinStratumId,
  EnhancedContentPack,
  ExpeditionSurveyMode,
  SacredRelicId,
} from "../backend/src/types";
import {
  ASTRAL_CURATOR_TIERS as BE_CURATOR_TIERS,
  ASTRAL_RUIN_STRATA as BE_STRATA,
  FULL_GALLERY_RESONANCE_TIERS as BE_RESONANCE_TIERS,
  RELIC_PEDESTAL_UPGRADE_COSTS as BE_UPGRADE_COSTS,
  SACRED_RELIC_PEDESTALS as BE_PEDESTALS,
  ensureAlchemyCauldron,
  ensureAstralRelics,
  getAstralRelicsBonuses as beRelicsBonuses,
  previewExpeditionSurveyYield as bePreviewSurvey,
} from "../backend/src/progression2";
import { defaultEnhancedPlayerState } from "../backend/src/storage";
import { hitDamage, monsterCombatant, playerCombatant } from "../backend/src/first_hour_combat";
import { playerBuildExtras, startHpCombat } from "../backend/src/hp_combat";
import { combatSheetFromPack, combinedBuildFromState } from "../frontend/src/gameplay/combatSheet";
import { previewFight } from "../frontend/src/gameplay/fightPreview";
import {
  ASTRAL_CURATOR_TIERS as FE_CURATOR_TIERS,
  ASTRAL_RUIN_STRATA as FE_STRATA,
  FULL_GALLERY_RESONANCE_TIERS as FE_RESONANCE_TIERS,
  RELIC_PEDESTAL_UPGRADE_COSTS as FE_UPGRADE_COSTS,
  SACRED_RELIC_PEDESTALS as FE_PEDESTALS,
  getAstralRelicsBonuses as feRelicsBonuses,
  previewExpeditionSurveyYield as fePreviewSurvey,
} from "../frontend/src/gameplay/astralRelics";

const pack = packJson as EnhancedContentPack;

describe("WL-9 backend <-> frontend Astral Ruin Expedition & Sacred Relic Gallery 1:1 parity", () => {
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
      id: "parity_astral_boss",
      name: "神代星穹守卫BOSS",
      isBoss: true,
      hp: 1200,
      atk: 30,
      def: 95,
    };

  it("keeps all 5 static WL-9 tables and deterministic expedition survey yield previews 1:1 identical", () => {
    assert.deepEqual(FE_STRATA, BE_STRATA);
    assert.deepEqual(FE_CURATOR_TIERS, BE_CURATOR_TIERS);
    assert.deepEqual(FE_PEDESTALS, BE_PEDESTALS);
    assert.deepEqual(FE_UPGRADE_COSTS, BE_UPGRADE_COSTS);
    assert.deepEqual(FE_RESONANCE_TIERS, BE_RESONANCE_TIERS);

    const modes: ExpeditionSurveyMode[] = ["free", "coin", "astral_dust"];
    const strataIds: AstralRuinStratumId[] = ["outpost_ruins", "obsidian_sanctum", "primordial_corridor"];
    for (const stId of strataIds) {
      for (const mode of modes) {
        for (let rank = 1; rank <= 6; rank++) {
          for (let surveys = 0; surveys <= 6; surveys++) {
            assert.deepEqual(
              fePreviewSurvey(stId, mode, surveys, rank),
              bePreviewSurvey(stId, mode, surveys, rank)
            );
          }
        }
      }
    }
  });

  it("maintains 1:1 parity across Curator Ranks 1..6, single/mixed pedestals, Full-Gallery Resonance Lv.1..5, and WL-8 Cauldron stacks (normal & Boss combat)", () => {
    const pedestalCases: Array<Record<SacredRelicId, number>> = [
      { solar_spear: 0, verdant_chalice: 0, titan_anvil: 0, chimera_censer: 0 },
      { solar_spear: 2, verdant_chalice: 0, titan_anvil: 0, chimera_censer: 0 },
      { solar_spear: 0, verdant_chalice: 3, titan_anvil: 4, chimera_censer: 2 },
      { solar_spear: 5, verdant_chalice: 1, titan_anvil: 2, chimera_censer: 0 },
      // Full-Gallery Resonance Lv.1..5
      { solar_spear: 1, verdant_chalice: 1, titan_anvil: 1, chimera_censer: 1 },
      { solar_spear: 2, verdant_chalice: 3, titan_anvil: 2, chimera_censer: 4 },
      { solar_spear: 3, verdant_chalice: 3, titan_anvil: 3, chimera_censer: 3 },
      { solar_spear: 4, verdant_chalice: 5, titan_anvil: 4, chimera_censer: 5 },
      { solar_spear: 5, verdant_chalice: 5, titan_anvil: 5, chimera_censer: 5 },
    ];

    for (const tier of BE_CURATOR_TIERS) {
      for (const ranks of pedestalCases) {
        const state = defaultEnhancedPlayerState(pack.version || "1.0.0");
        state.combatLevel = 20;
        state.chapter1Build = "sharpened_edge";
        state.chapter2Build = "heavy_sunder";
        state.chapter3Build = "gale_flurry";
        state.chapter4Build = "elixir_frenzy";
        state.inventory.weapon_iron_sword = 1;
        state.inventory.armor_cloth_chest = 1;
        (state.equipment as any).main_hand = "weapon_iron_sword";
        (state.equipment as any).chest = "armor_cloth_chest";

        // Also stack WL-8 Alchemy Cauldron Twin Resonance on higher tiers to verify cross-milestone stacking parity!
        if (tier.level >= 4) {
          const ac = ensureAlchemyCauldron(state, T0);
          ac.cauldronPoints = 180;
          ac.alchemyCauldronRank = 3;
          ac.equippedPotions = ["dragon_fury", "dwarven_temper"];
          ac.recipeRanks.dragon_fury = 3;
          ac.recipeRanks.dwarven_temper = 3;
          ac.potionCharges.dragon_fury = 5;
          ac.potionCharges.dwarven_temper = 5;
        }

        const ar = ensureAstralRelics(state, T0);
        ar.expeditionXp = tier.minXp;
        ar.curatorRank = tier.level;
        ar.pedestalRanks = { ...ranks };

        const bBon = beRelicsBonuses(state);
        const fBon = feRelicsBonuses(state as any);
        assert.deepEqual(
          fBon,
          bBon,
          `Astral relics bonuses mismatch at Curator Lv.${tier.level} pedestals=${JSON.stringify(ranks)}`
        );

        const beExt = playerBuildExtras(state);
        const feExt = combinedBuildFromState(state as any);
        assert.equal(feExt.combatAtkPct, beExt.combatAtkPct);
        assert.equal(feExt.relicCritAmpPct, beExt.relicCritAmpPct);
        assert.ok(Math.abs(feExt.bossArmorBreakPct - beExt.bossArmorBreakPct) < 1e-9);
        assert.ok(Math.abs(feExt.armorPenPct - beExt.armorPenPct) < 1e-9);
        assert.ok(Math.abs(feExt.intervalMult - beExt.intervalMult) < 1e-9);
        assert.ok(Math.abs(feExt.goldMult - beExt.goldMult) < 1e-9);
        assert.ok(Math.abs(feExt.dropMult - beExt.dropMult) < 1e-9);
        assert.ok(Math.abs(feExt.potionBuffMult - beExt.potionBuffMult) < 1e-9);

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
          relicCritAmpPct: beExt.relicCritAmpPct,
          intervalMult: beExt.intervalMult,
        });
        assert.equal(sheet.atk, bePlayer.atk, `ATK mismatch at Curator Lv.${tier.level}`);
        assert.equal(sheet.def, bePlayer.def);

        // Verify 1:1 hit damage (including relicCritAmpPct & bossArmorBreakPct) against normal & Boss monsters!
        const beNormalHit = hitDamage(bePlayer, monsterCombatant(normalMonster));
        const feNormalHit = previewFight(sheet, normalMonster as any).normalHit;
        assert.equal(feNormalHit, beNormalHit, "Normal monster hit damage mismatch");

        const beBossHit = hitDamage(bePlayer, monsterCombatant(bossMonster));
        const feBossHit = previewFight(sheet, bossMonster as any).normalHit;
        assert.equal(feBossHit, beBossHit, "Boss monster hit damage mismatch");
      }
    }
  });
});
