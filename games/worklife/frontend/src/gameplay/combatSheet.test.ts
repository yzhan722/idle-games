import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { abilitySlotCount, activeSetBonuses, combatSheetFromPack, derivedCombatLevel, mainCombatSkill } from "./combatSheet";

const items = [
  { id: "weapon_wooden_sword", atk: 5 },
  { id: "armor_wood_chest", def: 8 },
  { id: "weapon_wooden_bow", atk: 8 },
  { id: "weapon_staff_t1", mag: 10 },
];

const BASE = { hp: 50, atk: 5, def: 0, intervalMs: 3000, mp: 20, mpRegenPerTick: 1, accuracyPct: 86, evasionPct: 6, critRatePct: 14, critDmgPct: 160 };

describe("combat sheet from content pack", () => {
  it("matches unarmed level-1 woodcutter used by HP combat", () => {
    assert.deepEqual(combatSheetFromPack({ combatLevel: 1 }, items), BASE);
  });

  it("reads MWI combat skills like the server: stamina → HP, melee → ATK, attack → interval, defense → DEF, intelligence → MP", () => {
    const state = {
      combatLevel: 1,
      combatSkills: {
        stamina: { level: 11, xp: 0 },
        intelligence: { level: 20, xp: 0 },
        attack: { level: 26, xp: 0 },
        defense: { level: 9, xp: 0 },
        melee: { level: 16, xp: 0 },
      },
    };
    assert.deepEqual(combatSheetFromPack(state, items), {
      hp: 150,
      atk: 20,
      def: 4,
      intervalMs: Math.round(3000 / 1.25),
      mp: 115,
      mpRegenPerTick: 3,
      accuracyPct: 94.8,
      evasionPct: 8.6,
      critRatePct: 23.1,
      critDmgPct: 180,
    });
    assert.equal(abilitySlotCount(state), 3);
    // 0.1 × (11+20+26+9+max(16,1,1)) + 0.5 × 26 = 8.2 + 13 = 21.2 → 21
    assert.equal(derivedCombatLevel(state), 21);
    // legacy saves: every skill defaults to combatLevel
    assert.equal(combatSheetFromPack({ combatLevel: 4 }, items).hp, 80);
    assert.equal(abilitySlotCount({ combatLevel: 4 }), 1);
  });

  it("the weapon picks the damage skill (mirrors backend weaponMainSkill) and staffs count mag as attack", () => {
    const skills = {
      stamina: { level: 1, xp: 0 }, intelligence: { level: 1, xp: 0 }, attack: { level: 1, xp: 0 }, defense: { level: 1, xp: 0 },
      melee: { level: 3, xp: 0 }, ranged: { level: 6, xp: 0 }, magic: { level: 11, xp: 0 },
    };
    assert.equal(mainCombatSkill({ equipment: { main_hand: "weapon_wooden_sword" } }), "melee");
    assert.equal(mainCombatSkill({ equipment: { main_hand: "weapon_wooden_bow" } }), "ranged");
    assert.equal(mainCombatSkill({ equipment: { main_hand: "weapon_staff_t1" } }), "magic");
    assert.equal(mainCombatSkill({}), "melee");
    assert.equal(combatSheetFromPack({ combatSkills: skills, equipment: { main_hand: "weapon_wooden_sword" } }, items).atk, 5 + 2 + 5);
    assert.equal(combatSheetFromPack({ combatSkills: skills, equipment: { main_hand: "weapon_wooden_bow" } }, items).atk, 5 + 5 + 8);
    assert.equal(combatSheetFromPack({ combatSkills: skills, equipment: { main_hand: "weapon_staff_t1" } }, items).atk, 5 + 10 + 10);
    // best damage skill drives the derived level: 0.1 × (1+1+1+1+11) + 0.5 × 11 = 1.5 + 5.5 = 7
    assert.equal(derivedCombatLevel({ combatSkills: skills }), 7);
  });

  it("applies wooden sword and chest from the pack, not a React table", () => {
    const sheet = combatSheetFromPack(
      {
        combatLevel: 1,
        equipment: { main_hand: "weapon_wooden_sword", chest: "armor_wood_chest" },
      },
      items
    );
    assert.equal(sheet.atk, 10);
    assert.equal(sheet.def, 8);
    assert.equal(sheet.hp, 50);
  });

  it("adds the 2-piece woodcutter set bonus that the server grants for sword + chest", () => {
    const sets = [
      {
        id: "woodcutter_basic_set",
        name: "伐木工基础套装",
        pieces: [
          { slot: "main_hand", itemId: "weapon_wooden_sword" },
          { slot: "chest", itemId: "armor_wood_chest" },
          { slot: "legs", itemId: "armor_wood_legs" },
        ],
        bonuses: [
          { requiredPieces: 2, stats: { atk: 5, def: 3 }, description: "2件套：攻击+5，防御+3" },
          { requiredPieces: 3, stats: { atk: 10, def: 8 } },
        ],
      },
    ];
    const state = { combatLevel: 1, equipment: { main_hand: "weapon_wooden_sword", chest: "armor_wood_chest" } };
    assert.deepEqual(combatSheetFromPack(state, items, sets), { ...BASE, atk: 15, def: 11, critDmgPct: 161 });
    assert.deepEqual(activeSetBonuses(state.equipment, sets), [
      { setId: "woodcutter_basic_set", name: "伐木工基础套装", pieces: 2, atk: 5, def: 3, description: "2件套：攻击+5，防御+3" },
    ]);
    // sword only: no bonus
    assert.deepEqual(activeSetBonuses({ main_hand: "weapon_wooden_sword" }, sets), []);
  });

  it("applies thick bark the same way the server does", () => {
    const sheet = combatSheetFromPack(
      {
        combatLevel: 1,
        chapter1Build: "thick_bark",
        equipment: { main_hand: "weapon_wooden_sword" },
      },
      items
    );
    assert.equal(sheet.hp, 70);
    assert.equal(sheet.def, 4);
    assert.equal(sheet.atk, 10);
  });

  it("stacks Chapter 2 and Chapter 3 builds symmetrically with backend", () => {
    const offensive = combatSheetFromPack(
      {
        combatLevel: 1,
        chapter1Build: "sharpened_edge",
        chapter2Build: "heavy_sunder",
        chapter3Build: "gale_flurry",
        equipment: { main_hand: "weapon_wooden_sword" },
      },
      items
    );
    assert.equal(offensive.atk, 10 + 4 + 6 + 5);
    assert.equal(offensive.armorPenPct, 0.25);
    assert.equal(offensive.intervalMs, Math.round(3000 * 0.85));

    const defensiveLoot = combatSheetFromPack(
      {
        combatLevel: 1,
        chapter1Build: "thick_bark",
        chapter2Build: "quenched_thorns",
        chapter3Build: "relic_hunter",
        equipment: { main_hand: "weapon_wooden_sword" },
      },
      items
    );
    assert.equal(defensiveLoot.hp, 50 + 20 + 35 + 25);
    assert.equal(defensiveLoot.def, 4 + 8 + 4);
    assert.equal(defensiveLoot.thornsDefRatio, 0.45);
    assert.equal(defensiveLoot.goldMult, 1.25);
    assert.equal(defensiveLoot.dropMult, 1.3);

    const ch4Elixir = combatSheetFromPack(
      {
        combatLevel: 10,
        chapter4Build: "elixir_frenzy",
        equipment: { main_hand: "weapon_wooden_sword" },
        activeBuffs: [
          {
            expiresAt: new Date(Date.now() + 60_000).toISOString(),
            stats: { atk: 6, def: 4 },
          },
        ],
      },
      items
    );
    assert.equal(ch4Elixir.potionBuffMult, 1.5);
    assert.equal(ch4Elixir.atk, 14 + 5 + 8 + 9);

    const ch4Feast = combatSheetFromPack(
      {
        combatLevel: 1,
        chapter4Build: "feast_vitality",
        equipment: { main_hand: "weapon_wooden_sword" },
      },
      items
    );
    assert.equal(ch4Feast.hp, 50 + 55);
    assert.equal(ch4Feast.def, 8);
    assert.equal(ch4Feast.foodHealMult, 1.35);
  });
});
