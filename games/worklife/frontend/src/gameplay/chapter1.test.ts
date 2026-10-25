import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { nextChapter1Goal } from "./chapter1";

describe("chapter 1 next goal", () => {
  it("keeps a forest veteran complete after selling starter gear and changing weapons", () => {
    assert.equal(nextChapter1Goal({ inventory: {}, equipment: { main_hand: "weapon_frost_blade" },
      stats: { killsByMonster: { forest_boss: 1 } } }).id, "complete");
  });
  it("does not count a different boss as completing the forest", () => {
    const state = { inventory: { weapon_wooden_sword: 1, armor_wood_chest: 1 },
      equipment: { main_hand: "weapon_wooden_sword", chest: "armor_wood_chest" }, chapter1Build: "thick_bark",
      stats: { totalKills: 4, totalBossKills: 1, killsByMonster: { slime: 1, crab: 1, monkey: 1, mine_boss: 1 } } };
    assert.equal(nextChapter1Goal(state).id, "boss");
  });
  it("starts with chop, then board, sword, equip, slime", () => {
    assert.equal(nextChapter1Goal({ inventory: {} }).id, "chop");
    assert.equal(nextChapter1Goal({ inventory: { wood_1: 2 } }).id, "board");
    assert.equal(nextChapter1Goal({ inventory: { wood_1: 0, lumber_1: 3 } }).id, "sword");
    assert.equal(
      nextChapter1Goal({ inventory: { weapon_wooden_sword: 1 }, equipment: {} }).id,
      "equip_sword"
    );
    assert.equal(
      nextChapter1Goal({
        inventory: { weapon_wooden_sword: 1 },
        equipment: { main_hand: "weapon_wooden_sword" },
        stats: { totalKills: 0 },
      }).id,
      "first_kill"
    );
  });

  it("asks for a build after the first kill, then chest, then three archetypes, then boss", () => {
    const base = {
      inventory: { weapon_wooden_sword: 1, armor_wood_chest: 0 },
      equipment: { main_hand: "weapon_wooden_sword" as const },
      stats: { totalKills: 1, killsByMonster: { slime: 1 } },
    };
    assert.equal(nextChapter1Goal(base).id, "build");
    assert.equal(nextChapter1Goal({ ...base, chapter1Build: "thick_bark" }).id, "chest");
    assert.equal(
      nextChapter1Goal({
        inventory: { weapon_wooden_sword: 1, armor_wood_chest: 1 },
        equipment: { main_hand: "weapon_wooden_sword", chest: "armor_wood_chest" },
        chapter1Build: "thick_bark",
        stats: { totalKills: 1, killsByMonster: { slime: 1 } },
      }).id,
      "archetypes"
    );
    assert.equal(
      nextChapter1Goal({
        inventory: { weapon_wooden_sword: 1, armor_wood_chest: 1 },
        equipment: { main_hand: "weapon_wooden_sword", chest: "armor_wood_chest" },
        chapter1Build: "thick_bark",
        stats: {
          totalKills: 5,
          killsByMonster: { slime: 1, crab: 1, monkey: 1 },
        },
      }).id,
      "boss"
    );
    assert.equal(
      nextChapter1Goal({
        inventory: { weapon_wooden_sword: 1, armor_wood_chest: 1 },
        equipment: { main_hand: "weapon_wooden_sword", chest: "armor_wood_chest" },
        chapter1Build: "thick_bark",
        stats: {
          totalKills: 6,
          totalBossKills: 1,
          killsByMonster: { slime: 1, crab: 1, monkey: 1, forest_boss: 1 },
        },
      }).id,
      "complete"
    );
  });
});
