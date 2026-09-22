import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ENHANCEMENT_BASE_SUCCESS,
  ENHANCEMENT_BONUS_PCT,
  enhancementBonusPct,
  enhancementSlotMultiplier,
  enhancementStatMultiplier,
  enhancementSuccessRate,
  toolEffectLine,
} from "./enhancement";

describe("frontend MWI enhancement mirror", () => {
  it("has all +1…+20 bonus and success entries", () => {
    assert.equal(ENHANCEMENT_BONUS_PCT.length, 21);
    assert.equal(ENHANCEMENT_BASE_SUCCESS.length, 21);
    assert.equal(enhancementBonusPct(1), 2);
    assert.equal(enhancementBonusPct(10), 29);
    assert.equal(enhancementBonusPct(20), 100);
  });

  it("scales accessories at 5× and normal gear at 1×", () => {
    assert.equal(enhancementSlotMultiplier({ type: "accessory" }), 5);
    assert.equal(enhancementSlotMultiplier({ type: "weapon" }), 1);
    assert.equal(enhancementStatMultiplier(10, { type: "accessory" }), 2.45);
    assert.equal(enhancementStatMultiplier(10, { type: "weapon" }), 1.29);
  });

  it("matches the documented success-rate examples", () => {
    assert.equal(
      Math.round(enhancementSuccessRate(5, 10, 50, 0.006) * 10_000) /
        10_000,
      0.2424
    );
    assert.equal(
      Math.round(enhancementSuccessRate(11, 80, 50, 0.0491) * 100_000) /
        100_000,
      0.31923
    );
  });

  it("describes speed tools and the enhancer without ever printing NaN", () => {
    const axe = { type: "material", toolFor: "skill_woodcutter", toolSpeed: 0.2 };
    assert.equal(toolEffectLine(axe, "伐木/木工"), "伐木/木工速度 +20%");
    assert.equal(toolEffectLine(axe, "伐木/木工", 10), "伐木/木工速度 +25.8%");
    assert.equal(toolEffectLine(axe, undefined), "技能速度 +20%");
    // the enhancer has no toolSpeed and its skill is not a profession
    const enhancer = { type: "material", toolFor: "skill_enhancing", enhanceSuccess: 0.006 };
    assert.equal(toolEffectLine(enhancer, undefined), "强化成功率 +0.6%（随强化等级放大）");
    assert.equal(toolEffectLine(enhancer, undefined, 1), "强化成功率 +0.6%（随强化等级放大）");
    assert.equal(toolEffectLine({ type: "weapon", atk: 3 } as never, "伐木"), "");
    assert.equal(toolEffectLine(undefined, "伐木"), "");
  });
});
