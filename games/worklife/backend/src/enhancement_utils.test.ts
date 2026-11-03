import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  findEnhancementRuleForItem,
  hasEnhancementSkill,
  itemMatchesEnhancementRule,
} from "./enhancement_utils";
import type { EnhancedContentPack } from "./types";

const mockContentPack = {
  enhancementRules: [
    {
      itemType: "all_wooden_equipment",
      requiredProfession: "woodcutter",
      materials: [{ itemId: "lumber_1", quantity: 2 }],
      successRate: 0.8,
      maxLevel: 10,
    },
    {
      itemType: "all_metal_equipment",
      requiredProfession: "blacksmith",
      materials: [{ itemId: "ingot_1", quantity: 2 }],
      successRate: 0.75,
      maxLevel: 10,
    },
    {
      itemType: "cloth_and_leather_equipment",
      requiredProfession: "tailor",
      materials: [{ itemId: "yarn_1", quantity: 2 }],
      successRate: 0.8,
      maxLevel: 10,
    },
  ],
} as EnhancedContentPack;

describe("enhancement_utils", () => {
  it("matches wooden equipment to all_wooden_equipment rule", () => {
    assert.equal(
      itemMatchesEnhancementRule({ id: "weapon_wooden_sword", name: "木剑", type: "weapon" }, "all_wooden_equipment"),
      true
    );
    assert.equal(itemMatchesEnhancementRule({ id: "weapon_wooden_sword", name: "木剑", type: "weapon" }, "wooden_equipment"), false);
  });

  it("finds enhancement rule for wooden weapon", () => {
    const match = findEnhancementRuleForItem(
      { id: "weapon_wooden_sword", name: "木剑", type: "weapon" },
      mockContentPack
    );
    assert.ok(match);
    assert.equal(match!.rule.itemType, "all_wooden_equipment");
    assert.equal(match!.requiredProfession, "woodcutter");
  });

  it("accepts enhancement skill via node id or rule item type", () => {
    assert.equal(hasEnhancementSkill(["woodcutter_enhancement"], "woodcutter", "all_wooden_equipment"), true);
    assert.equal(hasEnhancementSkill(["all_wooden_equipment"], "woodcutter", "all_wooden_equipment"), true);
    assert.equal(hasEnhancementSkill(["woodcutter_basic_cutting"], "woodcutter", "all_wooden_equipment"), false);
  });
});
