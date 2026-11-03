import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CAREER_GROUPS, PRIMARY_TABS, CHAPTER1_CRAFT_OUTPUTS, CHAPTER1_MONSTERS } from "./ia";

describe("desktop IA", () => {
  it("exposes exactly four primary domains", () => {
    assert.equal(PRIMARY_TABS.length, 4);
    assert.deepEqual(
      PRIMARY_TABS.map((t) => t.name),
      ["工作", "制作", "冒险", "角色"]
    );
  });

  it("keeps career entries in grouped secondary menus", () => {
    const flat = CAREER_GROUPS.flatMap((g) => g.items);
    assert.ok(flat.includes("settings"));
    assert.ok(!flat.includes("party" as never));
    assert.ok(!flat.includes("trading" as never));
    assert.equal(CAREER_GROUPS.length, 4);
    assert.deepEqual([...CHAPTER1_MONSTERS], ["slime", "crab", "monkey", "forest_boss"]);
    assert.deepEqual([...CHAPTER1_CRAFT_OUTPUTS], ["lumber_1", "weapon_wooden_sword", "armor_wood_chest"]);
    assert.equal(CHAPTER1_MONSTERS.length, 4);
  });
});
