import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { T1_ASSET_KEYS, t1KeyFor } from "../assets/t1/keys";
import { CHAPTER1_MONSTERS, CHAPTER1_CRAFT_OUTPUTS, PRIMARY_TABS } from "./ia";
import { OPEN_ZONE_IDS, encounterStages, zoneDoors } from "./encounters";
import pack from "../../../shared/enhanced_content_pack_chinese.json";

const t1Root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../assets/t1");

describe("open zones ship with art", () => {
  const stages = encounterStages(pack as never);

  it("every monster of every open zone has a registered illustration", () => {
    for (const zoneId of OPEN_ZONE_IDS) {
      const stage = stages.find((s) => s.id === zoneId);
      assert.ok(stage, zoneId);
      for (const e of stage.encounters) {
        assert.ok((T1_ASSET_KEYS as readonly string[]).includes(`monsters/${e.id}`), `${zoneId}/${e.id}`);
      }
    }
  });

  it("lists only the forest before chapter 1, then the open zones with the next one as the locked door", () => {
    const before = zoneDoors(stages, false);
    assert.deepEqual(before.open.map((s) => s.id), ["forest"]);
    assert.equal(before.locked?.id, "mine");
    const after = zoneDoors(stages, true);
    assert.deepEqual(after.open.map((s) => s.id), [...OPEN_ZONE_IDS]);
    assert.equal(after.locked?.id, stages[OPEN_ZONE_IDS.length]?.id);
  });
});

describe("T1 asset keys", () => {
  it("covers chapter 1 forest monsters, gear, and primary nav with files on disk", () => {
    for (const id of CHAPTER1_MONSTERS) {
      assert.ok((T1_ASSET_KEYS as readonly string[]).includes(`monsters/${id}`));
    }
    for (const output of CHAPTER1_CRAFT_OUTPUTS) {
      const key = output === "lumber_1" ? `materials/${output}` : `equipment/${output}`;
      assert.ok((T1_ASSET_KEYS as readonly string[]).includes(key));
    }
    for (const tab of PRIMARY_TABS) {
      assert.ok((T1_ASSET_KEYS as readonly string[]).includes(`ui/nav-${tab.id}`));
    }
    assert.equal(t1KeyFor("ui", "nav-logging"), "ui/nav-logging");
    assert.equal(t1KeyFor("craft", "act_craft_weapon_wooden_sword"), "equipment/weapon_wooden_sword");
    assert.equal(t1KeyFor("item", "wood_1"), "materials/wood_1");
    // gear prefixes route to equipment/ (offhand shields and task-shop charms included), edibles to consumables/
    assert.equal(t1KeyFor("item", "offhand_frost_shield"), "equipment/offhand_frost_shield");
    assert.equal(t1KeyFor("item", "charm_stamina"), "equipment/charm_stamina");
    assert.equal(t1KeyFor("item", "dish_grilled_lake"), "consumables/dish_grilled_lake");
    assert.equal(t1KeyFor("item", "gold"), "ui/gold");
    for (const key of T1_ASSET_KEYS) {
      const found = ["webp", "png", "svg"].some((ext) => existsSync(path.join(t1Root, `${key}.${ext}`)));
      assert.ok(found, key);
    }
  });
});
