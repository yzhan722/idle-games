import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { nextChapter1Goal, nextChapterGoal } from "./chapter1";

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
    const chestNoWood = nextChapter1Goal({ ...base, chapter1Build: "thick_bark" });
    assert.equal(chestNoWood.id, "chest");
    assert.equal(chestNoWood.tab, "logging");
    const chestWithWood = nextChapter1Goal({
      ...base,
      inventory: { ...base.inventory, wood_1: 4, lumber_1: 2 },
      chapter1Build: "thick_bark",
      skills: { skill_woodworking: { level: 3 } },
    });
    assert.equal(chestWithWood.id, "chest");
    assert.equal(chestWithWood.tab, "woodworking");
    assert.equal(chestWithWood.craftCategory, "materials");
    const chestReadyToCraft = nextChapter1Goal({
      ...base,
      inventory: { ...base.inventory, lumber_1: 6 },
      chapter1Build: "thick_bark",
      skills: { skill_woodworking: { level: 3 } },
    });
    assert.equal(chestReadyToCraft.id, "chest");
    assert.equal(chestReadyToCraft.tab, "woodworking");
    assert.equal(chestReadyToCraft.craftCategory, "equipment");
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

  it("seamlessly chains Chapter 2 (Mine/Smithing) and Chapter 3 (Swamp/Tailoring) after forest_boss", () => {
    const ch1Veteran = {
      inventory: { weapon_wooden_sword: 1, armor_wood_chest: 1 },
      equipment: { main_hand: "weapon_wooden_sword", chest: "armor_wood_chest" },
      chapter1Build: "sharpened_edge",
      stats: { totalKills: 6, totalBossKills: 1, killsByMonster: { forest_boss: 1 } },
    };
    const gMine = nextChapterGoal(ch1Veteran);
    assert.equal(gMine.chapter, 2);
    assert.equal(gMine.id, "ch2_mine_ore");
    assert.equal(gMine.tab, "mining");

    const gSmelt = nextChapterGoal({ ...ch1Veteran, inventory: { ...ch1Veteran.inventory, ore_2: 4 } });
    assert.equal(gSmelt.id, "ch2_smelt_ingot");
    assert.equal(gSmelt.tab, "smithing");

    const gForgeWep = nextChapterGoal({ ...ch1Veteran, inventory: { ...ch1Veteran.inventory, ingot_2: 4 } });
    assert.equal(gForgeWep.id, "ch2_forge_weapon");

    const gCh2Build = nextChapterGoal({
      ...ch1Veteran,
      inventory: { ...ch1Veteran.inventory, ingot_2: 4, weapon_iron_sword: 1 },
    });
    assert.equal(gCh2Build.id, "ch2_build");
    assert.equal(gCh2Build.buildChapter, 2);

    const gMineBoss = nextChapterGoal({
      ...ch1Veteran,
      chapter2Build: "heavy_sunder",
      inventory: { ...ch1Veteran.inventory, weapon_iron_sword: 1, armor_iron_chest: 1 },
      stats: {
        totalKills: 12,
        totalBossKills: 1,
        killsByMonster: { forest_boss: 1, rock_golem: 1, crystal_bat: 1, ore_rat: 1 },
      },
    });
    assert.equal(gMineBoss.id, "ch2_boss");
    assert.equal(gMineBoss.adventureZone, "mine");

    const ch2Veteran = {
      ...ch1Veteran,
      chapter2Build: "heavy_sunder",
      stats: {
        totalKills: 15,
        totalBossKills: 2,
        killsByMonster: { forest_boss: 1, mine_boss: 1 },
      },
    };
    const gCh3Start = nextChapterGoal(ch2Veteran);
    assert.equal(gCh3Start.chapter, 3);
    assert.equal(gCh3Start.id, "ch3_gather_fiber");

    const gCh3Build = nextChapterGoal({
      ...ch2Veteran,
      inventory: { ...ch2Veteran.inventory, fiber_1: 2, yarn_1: 2, armor_cloth_chest: 1, armor_cloth_boots: 1 },
    });
    assert.equal(gCh3Build.id, "ch3_build");
    assert.equal(gCh3Build.buildChapter, 3);

    const ch3Veteran = {
      ...ch2Veteran,
      chapter3Build: "relic_hunter",
      stats: {
        totalKills: 25,
        totalBossKills: 3,
        killsByMonster: { forest_boss: 1, mine_boss: 1, swamp_boss: 1 },
      },
    };
    const gCh4Start = nextChapterGoal(ch3Veteran);
    assert.equal(gCh4Start.chapter, 4);
    assert.equal(gCh4Start.id, "ch4_farm_fish");
    assert.equal(gCh4Start.tab, "fishing");

    const gCh4Farmer = nextChapterGoal({ ...ch3Veteran, activeClassId: "farmer" });
    assert.equal(gCh4Farmer.id, "ch4_farm_fish");
    assert.equal(gCh4Farmer.tab, "farming");

    const gCh4Cook = nextChapterGoal({
      ...ch3Veteran,
      inventory: { fish_river: 3 },
    });
    assert.equal(gCh4Cook.id, "ch4_cook_feast");
    assert.equal(gCh4Cook.tab, "cooking");

    const gCh4Crystal = nextChapterGoal({
      ...ch3Veteran,
      inventory: { food_hearty_stew: 2 },
    });
    assert.equal(gCh4Crystal.id, "ch4_mine_crystal");
    assert.equal(gCh4Crystal.tab, "crystal_mining");

    const gCh4Brew = nextChapterGoal({
      ...ch3Veteran,
      inventory: { food_hearty_stew: 2, crystal_1: 3 },
    });
    assert.equal(gCh4Brew.id, "ch4_brew_elixir");
    assert.equal(gCh4Brew.tab, "alchemy");

    const gCh4Build = nextChapterGoal({
      ...ch3Veteran,
      inventory: { food_hearty_stew: 2, potion_battle_fury: 1 },
    });
    assert.equal(gCh4Build.id, "ch4_build");
    assert.equal(gCh4Build.buildChapter, 4);

    const gCh4Snow = nextChapterGoal({
      ...ch3Veteran,
      chapter4Build: "elixir_frenzy",
      inventory: { food_hearty_stew: 2, potion_battle_fury: 1 },
    });
    assert.equal(gCh4Snow.id, "ch4_snow_boss");
    assert.equal(gCh4Snow.adventureZone, "snow");

    const gCh4Volcano = nextChapterGoal({
      ...ch3Veteran,
      chapter4Build: "elixir_frenzy",
      stats: {
        totalKills: 32,
        totalBossKills: 4,
        killsByMonster: { forest_boss: 1, mine_boss: 1, swamp_boss: 1, snow_boss: 1 },
      },
    });
    assert.equal(gCh4Volcano.id, "ch4_volcano_boss");
    assert.equal(gCh4Volcano.adventureZone, "volcano");

    const gCh4Done = nextChapterGoal({
      ...ch3Veteran,
      chapter4Build: "feast_vitality",
      stats: {
        totalKills: 40,
        totalBossKills: 5,
        killsByMonster: { forest_boss: 1, mine_boss: 1, swamp_boss: 1, snow_boss: 1, volcano_boss: 1 },
      },
    });
    assert.equal(gCh4Done.id, "ch4_complete");
  });
});
