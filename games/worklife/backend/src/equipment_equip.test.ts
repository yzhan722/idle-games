import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { canEquipItem } from "./equipment_equip";

const items = [
  { id: "armor_wood_chest", type: "armor", slot: "chest" },
  { id: "weapon_wooden_sword", type: "weapon" },
];

describe("equip invariants", () => {
  it("rejects items the player does not own", () => {
    const r = canEquipItem({}, "chest", "armor_wood_chest", items);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, "item_not_owned");
  });

  it("rejects unknown item ids", () => {
    const r = canEquipItem({ ghost_sword: 1 }, "main_hand", "ghost_sword", items);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, "unknown_item");
  });

  it("rejects slot mismatch", () => {
    const r = canEquipItem({ armor_wood_chest: 1 }, "head", "armor_wood_chest", items);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, "slot_mismatch");
  });

  it("allows a wooden chest on chest and a sword on main_hand", () => {
    assert.equal(canEquipItem({ armor_wood_chest: 1 }, "chest", "armor_wood_chest", items).ok, true);
    assert.equal(canEquipItem({ weapon_wooden_sword: 1 }, "main_hand", "weapon_wooden_sword", items).ok, true);
  });
});
