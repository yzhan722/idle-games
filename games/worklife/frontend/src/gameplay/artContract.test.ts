import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  T1_ASSET_CONTRACT,
  T1_ASSET_KEYS,
  T1_EXTENSION_PRIORITY,
  p0RequiredKeys,
  profileForKey,
} from "../assets/t1/contract";
import { CHAPTER1_MONSTERS, CHAPTER1_CRAFT_OUTPUTS, PRIMARY_TABS } from "./ia";

describe("T1 commercial art contract", () => {
  it("has unique canonical keys and webp>png>svg priority", () => {
    const keys = T1_ASSET_CONTRACT.map((s) => s.key);
    assert.equal(new Set(keys).size, keys.length);
    assert.deepEqual([...T1_EXTENSION_PRIORITY], ["webp", "png", "svg"]);
  });

  it("lists every P0 first-hour key the slice actually shows", () => {
    const p0 = p0RequiredKeys();
    assert.equal(p0.length, 19);
    for (const id of CHAPTER1_MONSTERS) {
      assert.ok(p0.includes(`monsters/${id}`));
    }
    assert.ok(p0.includes("materials/lumber_1"));
    for (const output of CHAPTER1_CRAFT_OUTPUTS.filter((id) => id !== "lumber_1")) {
      assert.ok(p0.includes(`equipment/${output}`));
    }
    for (const tab of PRIMARY_TABS) {
      assert.ok(p0.includes(`ui/nav-${tab.id}`));
    }
    assert.ok(p0.includes("character/woodcutter"));
    assert.ok(p0.includes("trees/poplar"));
    assert.deepEqual(
      T1_ASSET_KEYS,
      T1_ASSET_CONTRACT.filter((s) => s.status !== "MISSING").map((s) => s.key)
    );
    assert.ok(T1_ASSET_CONTRACT.every((s) => s.priority !== "P0" || s.status === "PLACEHOLDER"));
  });

  it("maps character and monsters to illustration, gear to item, nav to icon", () => {
    assert.equal(profileForKey("character/woodcutter"), "illustration");
    assert.equal(profileForKey("monsters/forest_boss"), "illustration");
    assert.equal(profileForKey("equipment/weapon_wooden_sword"), "item");
    assert.equal(profileForKey("materials/wood_1"), "item");
    assert.equal(profileForKey("ui/nav-logging"), "icon");
    assert.equal(profileForKey("skills/heavy_chop"), "icon");
  });
});
