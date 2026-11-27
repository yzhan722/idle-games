import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clampToRange, estimateLine, outOfRange, type MarketEstimate } from "./marketEstimate";

const est: MarketEstimate = { itemId: "ore_5", estimate: 120, priceRange: { min: 40, max: 360 }, samples: 0, source: "base" };

describe("market estimate (display side)", () => {
  it("prints one short line", () => {
    assert.equal(estimateLine(est), "估价 120 · 可挂 40～360");
    assert.equal(estimateLine(null), "");
  });

  it("clamps the default price into the range and leaves it alone before the range arrives", () => {
    assert.equal(clampToRange(10, est), 40);
    assert.equal(clampToRange(9999, est), 360);
    assert.equal(clampToRange(100.4, est), 100);
    assert.equal(clampToRange(Number.NaN, est), 40);
    assert.equal(clampToRange(9999, null), 9999);
    assert.equal(clampToRange(-5, undefined), 1);
  });

  it("flags prices outside the range, bounds included", () => {
    assert.equal(outOfRange(40, est), false);
    assert.equal(outOfRange(360, est), false);
    assert.equal(outOfRange(39, est), true);
    assert.equal(outOfRange(361, est), true);
    assert.equal(outOfRange(1, null), false);
  });
});
