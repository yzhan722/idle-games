import assert from "node:assert/strict";
import { describe, it } from "node:test";
import packJson from "../../shared/enhanced_content_pack_chinese.json";
import type { EnhancedContentPack } from "./types";
import { defaultEnhancedPlayerState, getXpForLevel } from "./storage";
import { createMemoryStorage } from "./storage_memory";
import {
  ENHANCEMENT_BASE_SUCCESS,
  MAX_ENHANCEMENT_LEVEL,
  PROTECTION_MIRROR_ID,
  enhancementBonusPct,
  enhancementMaterials,
  enhancementSlotMultiplier,
  enhancementStatMultiplier,
  enhancementSuccessBreakdown,
  enhancementXp,
  itemLevelForEnhancement,
  performEnhancementAttempt,
} from "./enhancement_math";
import { findEnhancementRuleForItem } from "./enhancement_utils";

const pack = packJson as EnhancedContentPack;
const sword = pack.items.find((i: any) => i.id === "weapon_wooden_sword") as any;
const woodRule = findEnhancementRuleForItem(sword, pack)!.rule;

describe("MWI enhancement math", () => {
  it("uses the exact +1…+20 nonlinear stat table and 5× jewelry multiplier", () => {
    assert.equal(MAX_ENHANCEMENT_LEVEL, 20);
    assert.equal(enhancementBonusPct(0), 0);
    assert.equal(enhancementBonusPct(1), 2);
    assert.equal(enhancementBonusPct(10), 29);
    assert.equal(enhancementBonusPct(15), 57);
    assert.equal(enhancementBonusPct(20), 100);
    assert.equal(enhancementSlotMultiplier({ type: "weapon" }), 1);
    assert.equal(enhancementSlotMultiplier({ type: "accessory" }), 5);
    assert.equal(enhancementStatMultiplier(10, { type: "weapon" }), 1.29);
    assert.equal(enhancementStatMultiplier(10, { type: "accessory" }), 2.45);
  });

  it("uses MWI's target-level base rates and level modifier", () => {
    assert.deepEqual(
      [...ENHANCEMENT_BASE_SUCCESS.slice(1, 12)],
      [0.5, 0.45, 0.45, 0.4, 0.4, 0.4, 0.35, 0.35, 0.35, 0.35, 0.3]
    );
    // Wiki example: enhancing 10 vs item 50 at +5, +0.6% tool:
    // 40% × ((10/50+1)/2 + 0.6%) = 24.24%.
    const under = enhancementSuccessBreakdown(5, 10, 50, 0.006);
    assert.equal(under.levelModifier, 0.6);
    assert.equal(Math.round(under.finalRate * 10_000) / 10_000, 0.2424);
    const over = enhancementSuccessBreakdown(11, 80, 50, 0.0491);
    assert.equal(over.baseRate, 0.3);
    assert.equal(over.levelModifier, 1);
    assert.equal(over.overLevelBonus, 0.015);
    assert.equal(Math.round(over.finalRate * 100_000) / 100_000, 0.31923);
  });

  it("derives item level from the producing action and awards 10% XP on failure", () => {
    assert.equal(itemLevelForEnhancement(sword, pack), 1);
    assert.equal(enhancementXp(50, 5, true), 504);
    assert.equal(enhancementXp(50, 5, false), 50.4);
  });

  it("success raises one level; unprotected failure resets to +0; a mirror failure loses one", () => {
    const state = defaultEnhancedPlayerState(pack.version);
    state.inventory.weapon_wooden_sword = 1;
    state.inventory.lumber_1 = 100;
    state.inventory.gold = 20_000;
    state.inventory[PROTECTION_MIRROR_ID] = 1;

    const success = performEnhancementAttempt({
      player: state,
      item: sword,
      rule: woodRule,
      request: {
        itemId: sword.id,
        targetLevel: 1,
        materials: {},
      },
      pack,
      rng: () => 0,
      xpForLevel: getXpForLevel,
    });
    assert.equal(success.success, true);
    assert.equal(success.previousLevel, 0);
    assert.equal(success.newLevel, 1);
    assert.equal(success.statBonusPct, 2);
    assert.equal(state.equipment.enhancementLevels[sword.id], 1);

    state.equipment.enhancementLevels[sword.id] = 5;
    const beforeFailXp = state.skills.skill_enhancing.xp;
    const failure = performEnhancementAttempt({
      player: state,
      item: sword,
      rule: woodRule,
      request: {
        itemId: sword.id,
        targetLevel: 6,
        materials: {},
      },
      pack,
      rng: () => 1,
      xpForLevel: getXpForLevel,
    });
    assert.equal(failure.success, false);
    assert.equal(failure.newLevel, 0);
    assert.equal(failure.protected, false);
    assert.match(failure.failureReason || "", /重置为 \+0/);
    assert.equal(failure.xpGained, 9.2);
    assert.equal(
      Math.round((state.skills.skill_enhancing.xp - beforeFailXp) * 10) / 10,
      9.2
    );

    state.equipment.enhancementLevels[sword.id] = 5;
    const protectedFailure = performEnhancementAttempt({
      player: state,
      item: sword,
      rule: woodRule,
      request: {
        itemId: sword.id,
        targetLevel: 6,
        materials: {},
        protectionItemId: PROTECTION_MIRROR_ID,
      },
      pack,
      rng: () => 1,
      xpForLevel: getXpForLevel,
    });
    assert.equal(protectedFailure.success, false);
    assert.equal(protectedFailure.protected, true);
    assert.equal(protectedFailure.newLevel, 4);
    assert.equal(state.inventory[PROTECTION_MIRROR_ID], undefined);
    assert.match(protectedFailure.failureReason || "", /降到 \+4/);
    assert.equal(state.stats!.totalEnhancements, 3);
  });

  it("an equipped enhancer tool adds its success bonus, scaled by its own enhancement level", async () => {
    const { equippedEnhanceToolBonus } = await import("./enhancement_math");
    const state = defaultEnhancedPlayerState(pack.version);
    assert.equal(equippedEnhanceToolBonus(state, pack), 0);
    state.inventory.tool_enhancer_t1 = 1;
    state.equipment.tool = "tool_enhancer_t1";
    assert.equal(equippedEnhanceToolBonus(state, pack), 0.006);
    state.equipment.enhancementLevels.tool_enhancer_t1 = 10; // +29% → 0.6% × 1.29
    assert.equal(Math.round(equippedEnhanceToolBonus(state, pack) * 1e6) / 1e6, 0.00774);
    // a skilling tool in the slot gives nothing to enhancing
    state.inventory.weapon_logging_axe_t1 = 1;
    state.equipment.tool = "weapon_logging_axe_t1";
    assert.equal(equippedEnhanceToolBonus(state, pack), 0);
    // the smithing recipe exists and yields the tool
    const recipe = (pack.actions as any[]).find((a) => a.id === "act_forge_enhancer_t1");
    assert.equal(recipe?.yields?.[0]?.itemId, "tool_enhancer_t1");
    assert.equal(recipe?.skillId, "skill_blacksmith");
  });

  it("validation consumes nothing and all equipped slots count as owned", async () => {
    const storage = createMemoryStorage();
    const user = await storage.findOrCreateGuestUser(`enhance-${Math.random()}`);
    const state = await storage.getOrCreatePlayerState(user.id, pack.version);
    state.equipment.chest = "armor_wood_chest";
    state.inventory.lumber_1 = 2;
    state.inventory.gold = 100;
    await storage.savePlayerState(user.id, state);

    const info = await storage.getEnhancementInfo({
      userId: user.id,
      itemId: "armor_wood_chest",
      contentPack: pack,
    });
    assert.equal(info.maxLevel, 20);
    assert.equal(info.isOwned, true, "equipped chest is owned without a bag duplicate");
    assert.equal(info.canEnhance, true);
    assert.equal(info.canAfford, true);
    assert.equal(info.enhancingLevel, 1);
    assert.equal(info.itemLevel, 3);
    assert.equal(info.successRate, 1 / 3, "50% base × ((1/3+1)/2) level modifier");
    assert.deepEqual(
      info.nextLevelCost,
      enhancementMaterials(woodRule, 1)
    );

    const result = await storage.enhanceEquipment({
      userId: user.id,
      request: {
        itemId: "armor_wood_chest",
        targetLevel: 1,
        materials: {},
      },
      contentPack: pack,
      rng: () => 0,
    });
    assert.equal(result.success, true);
    assert.equal(result.newLevel, 1);
    const after = await storage.getOrCreatePlayerState(user.id, pack.version);
    assert.equal(after.equipment.enhancementLevels.armor_wood_chest, 1);

    const inventoryBefore = { ...after.inventory };
    const bad = await storage.enhanceEquipment({
      userId: user.id,
      request: {
        itemId: "armor_wood_chest",
        targetLevel: 3,
        materials: {},
      },
      contentPack: pack,
      rng: () => 0,
    });
    assert.equal(bad.success, false);
    assert.deepEqual(after.inventory, inventoryBefore);
    await storage.close();
  });
});
