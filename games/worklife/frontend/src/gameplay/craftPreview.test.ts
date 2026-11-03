import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { craftWhy, missingMaterials } from "./craftPreview";

describe("first equipment craft preview", () => {
  it("shows ATK 5 → 10 for the wooden sword on a naked woodcutter", () => {
    assert.equal(
      craftWhy({ id: "weapon_wooden_sword", atk: 5 }, { hp: 50, atk: 5, def: 0 }, { equippedMainAtk: 0 }),
      "ATK 5 → 10 (+5)"
    );
  });

  it("explains why the first board exists", () => {
    assert.equal(
      craftWhy({ id: "lumber_1" }, { hp: 50, atk: 5, def: 0 }, { equippedMainAtk: 0 }),
      "用于木头短剑。两根原木换一块。"
    );
  });

  it("shows DEF 0 → 8 for the wooden chest on an unarmored woodcutter", () => {
    assert.equal(
      craftWhy({ id: "armor_wood_chest", def: 8 }, { hp: 50, atk: 10, def: 0 }, { equippedMainAtk: 5 }),
      "DEF 0 → 8 (+8)"
    );
  });

  it("lists missing materials instead of an empty card", () => {
    assert.equal(
      missingMaterials(
        [
          { item: "lumber_1", count: 3 },
          { item: "wood_1", count: 0 },
        ],
        { lumber_1: 1 },
        (id) => (id === "lumber_1" ? "标准木板" : id)
      ),
      "还缺 标准木板 1/3"
    );
  });
});
