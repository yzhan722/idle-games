import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { trimLoadout } from "./combatLoadout";

describe("战斗配置提交前收到现有格数", () => {
  it("摘下腰包：第 4 种饮品、多出来的食物不再提交，其余原样", () => {
    const drink = ["a", "b", "c", "d"].map((itemId) => ({ itemId }));
    const food = ["x", "y"].map((itemId) => ({ itemId, triggerMissingHp: 10 }));
    const lo = { food, drink, mp: [], autoRepeat: true };
    assert.deepEqual(trimLoadout(lo, { food: 1, drink: 3 }), { food: food.slice(0, 1), drink: drink.slice(0, 3), mp: [], autoRepeat: true });
    assert.deepEqual(trimLoadout(lo, { food: 3, drink: 4 }), lo);
    assert.deepEqual(trimLoadout({ autoRepeat: false } as any, { food: 1, drink: 3 }), { autoRepeat: false, food: [], drink: [] });
  });

  it("两处界面都走它", () => {
    for (const name of ["CombatLoadoutPanel", "CombatPotionBar"]) {
      assert.match(readFileSync(new URL(`../components/${name}.tsx`, import.meta.url), "utf8"), /trimLoadout\(/, name);
    }
  });
});
