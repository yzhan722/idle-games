import assert from "node:assert/strict";
import { describe, it } from "node:test";
import packJson from "../../shared/enhanced_content_pack_chinese.json";
import type { EnhancedContentPack } from "./types";
import { defaultEnhancedPlayerState, getTotalXpForLevel, getXpForLevel } from "./storage";
import { ENHANCE_BONUS, ENHANCE_XP } from "./growth_curves";
import { createMemoryStorage } from "./storage_memory";
import {
  MAX_ENHANCEMENT_LEVEL,
  PROTECTION_MIRROR_ID,
  baseEnhancementSuccess,
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

/** Enhancing XP ever earned, so a level-up between two reads does not hide the gain. */
function totalEnhancingXp(state: ReturnType<typeof defaultEnhancedPlayerState>): number {
  const { level, xp } = state.skills.skill_enhancing;
  return Math.round((getTotalXpForLevel(level) + xp) * 10) / 10;
}

describe("enhancement math", () => {
  it("uses one accelerating +1…+20 bonus curve and the same multiplier for jewelry as for gear", () => {
    assert.equal(MAX_ENHANCEMENT_LEVEL, 20);
    assert.equal(enhancementBonusPct(0), 0);
    assert.equal(enhancementBonusPct(MAX_ENHANCEMENT_LEVEL), ENHANCE_BONUS.maxPct);
    assert.equal(enhancementBonusPct(99), ENHANCE_BONUS.maxPct, "clamped past the cap");
    for (let n = 1; n <= MAX_ENHANCEMENT_LEVEL; n++) assert.ok(enhancementBonusPct(n) > enhancementBonusPct(n - 1));
    assert.equal(enhancementSlotMultiplier({ type: "weapon" }), 1);
    // jewelry used to be 5× (a +20 ring ×6.0 out-scaled a whole tier of gear ×2.0); it is normal now
    assert.equal(enhancementSlotMultiplier({ type: "accessory" }), 1);
    for (const n of [1, 10, 20]) {
      assert.equal(enhancementStatMultiplier(n, { type: "weapon" }), 1 + enhancementBonusPct(n) / 100);
      assert.equal(enhancementStatMultiplier(n, { type: "accessory" }), enhancementStatMultiplier(n, { type: "weapon" }));
    }
  });

  it("applies target-level base rates and the craft factor", () => {
    const close = (a: number, b: number, what: string) => assert.ok(Math.abs(a - b) < 1e-12, `${what}: ${a} vs ${b}`);
    // the breakdown the UI prints always recombines into the rate that is rolled
    const under = enhancementSuccessBreakdown(5, 10, 50, 0.05);
    assert.ok(under.levelModifier < 1, "below the item's level is a penalty");
    assert.equal(under.overLevelBonus, 0);
    close(under.finalRate, under.baseRate * (under.levelModifier + under.toolBonus), "under");
    const over = enhancementSuccessBreakdown(11, 80, 50, 0.05);
    assert.equal(over.baseRate, baseEnhancementSuccess(11));
    assert.equal(over.levelModifier, 1);
    assert.ok(over.overLevelBonus > 0, "above the item's level is a bonus");
    close(over.finalRate, over.baseRate * (1 + over.overLevelBonus + over.toolBonus), "over");
    const even = enhancementSuccessBreakdown(1, 50, 50);
    close(even.finalRate, baseEnhancementSuccess(1), "equal levels");
  });

  it("derives item level from the producing action and awards a share of the XP on failure", () => {
    assert.equal(itemLevelForEnhancement(sword, pack), 1);
    assert.ok(enhancementXp(50, 5, true) > enhancementXp(50, 4, true), "harder targets teach more");
    assert.ok(enhancementXp(50, 5, true) > enhancementXp(40, 5, true), "higher items teach more");
    assert.ok(Math.abs(enhancementXp(50, 5, false) - enhancementXp(50, 5, true) * ENHANCE_XP.failShare) <= 0.1);
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
    assert.equal(success.statBonusPct, enhancementBonusPct(1));
    assert.equal(state.equipment.enhancementLevels[sword.id], 1);

    state.equipment.enhancementLevels[sword.id] = 5;
    const beforeFailXp = totalEnhancingXp(state);
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
    assert.equal(failure.xpGained, enhancementXp(itemLevelForEnhancement(sword, pack), 5, false));
    assert.equal(totalEnhancingXp(state) - beforeFailXp, failure.xpGained);

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
    const base = Number((pack.items as any[]).find((i) => i.id === "tool_enhancer_t1").enhanceSuccess);
    assert.ok(base > 0);
    assert.equal(equippedEnhanceToolBonus(state, pack), base);
    state.equipment.enhancementLevels.tool_enhancer_t1 = 10;
    assert.equal(equippedEnhanceToolBonus(state, pack), base * enhancementStatMultiplier(10));
    // a skilling tool in the slot gives nothing to enhancing
    state.inventory.weapon_logging_axe_t1 = 1;
    state.equipment.tool = "weapon_logging_axe_t1";
    assert.equal(equippedEnhanceToolBonus(state, pack), 0);
    // the smithing recipe exists and yields the tool
    const recipe = (pack.actions as any[]).find((a) => a.id === "act_forge_enhancer_t1");
    assert.equal(recipe?.yields?.[0]?.itemId, "tool_enhancer_t1");
    assert.equal(recipe?.skillId, "skill_smithing");
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
    assert.equal(info.successRate, enhancementSuccessBreakdown(1, 1, 3).finalRate);
    assert.ok(info.successRate < baseEnhancementSuccess(1), "a level-1 enhancer is below the item's level 3");
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
