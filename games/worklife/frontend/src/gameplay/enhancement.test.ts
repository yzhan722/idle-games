import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MAX_ENHANCEMENT_LEVEL,
  baseEnhancementSuccess,
  enhancementBonusPct,
  enhancementSlotMultiplier,
  enhancementStatMultiplier,
  enhancementSuccessRate,
  toolEffectLine,
} from "./enhancement";

describe("frontend enhancement mirror", () => {
  it("covers +1…+20: the bonus only climbs, the base chance only falls", () => {
    assert.equal(MAX_ENHANCEMENT_LEVEL, 20);
    assert.equal(enhancementBonusPct(0), 0);
    assert.equal(enhancementBonusPct(MAX_ENHANCEMENT_LEVEL), 100);
    for (let n = 1; n <= MAX_ENHANCEMENT_LEVEL; n++) {
      assert.ok(enhancementBonusPct(n) > enhancementBonusPct(n - 1), `+${n}`);
      if (n > 1) assert.ok(baseEnhancementSuccess(n) < baseEnhancementSuccess(n - 1), `+${n}`);
    }
  });

  it("scales accessories and normal gear identically (jewelry is no longer 5×)", () => {
    assert.equal(enhancementSlotMultiplier({ type: "accessory" }), 1);
    assert.equal(enhancementSlotMultiplier({ type: "weapon" }), 1);
    assert.equal(enhancementStatMultiplier(10, { type: "weapon" }), 1 + enhancementBonusPct(10) / 100);
    assert.equal(enhancementStatMultiplier(10, { type: "accessory" }), enhancementStatMultiplier(10, { type: "weapon" }));
  });

  it("equal levels roll the base chance; a lower skill rolls less, a higher skill or a tool rolls more", () => {
    assert.equal(enhancementSuccessRate(5, 50, 50), baseEnhancementSuccess(5));
    assert.ok(enhancementSuccessRate(5, 10, 50) < baseEnhancementSuccess(5));
    assert.ok(enhancementSuccessRate(5, 80, 50) > baseEnhancementSuccess(5));
    assert.ok(enhancementSuccessRate(5, 50, 50, 0.05) > baseEnhancementSuccess(5));
    assert.ok(enhancementSuccessRate(1, 200, 1, 1) < 1, "never a sure thing");
  });

  it("describes speed tools and the enhancer without ever printing NaN", () => {
    const axe = { type: "material", toolFor: "skill_woodcutter", toolSpeed: 0.2 };
    assert.equal(toolEffectLine(axe, "伐木/木工"), "伐木/木工速度 +20%");
    const at10 = Math.round(0.2 * enhancementStatMultiplier(10, axe) * 1000) / 10;
    assert.equal(toolEffectLine(axe, "伐木/木工", 10), `伐木/木工速度 +${at10}%`);
    assert.equal(toolEffectLine(axe, undefined), "技能速度 +20%");
    // the enhancer has no toolSpeed and its skill is not a profession
    const enhancer = { type: "material", toolFor: "skill_enhancing", enhanceSuccess: 0.008 };
    assert.equal(toolEffectLine(enhancer, undefined), "强化成功率 ×1.008（随强化等级放大）");
    const at1 = Math.round((1 + 0.008 * enhancementStatMultiplier(1, enhancer)) * 10000) / 10000;
    assert.equal(toolEffectLine(enhancer, undefined, 1), `强化成功率 ×${at1}（随强化等级放大）`);
    assert.equal(toolEffectLine({ type: "weapon", atk: 3 } as never, "伐木"), "");
    assert.equal(toolEffectLine(undefined, "伐木"), "");
  });
});
