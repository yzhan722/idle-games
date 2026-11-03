import assert from "node:assert/strict";
import { describe, it } from "node:test";
import pack from "../../../shared/enhanced_content_pack_chinese.json";
import { nextUnlock, skillActionRows, type PackAction } from "./skillActions";

const actions = (pack as { actions: PackAction[] }).actions;

describe("pack-driven skill action rows", () => {
  it("orders woodcutting by the server's level requirement, not the legacy table", () => {
    const rows = skillActionRows(actions, "skill_woodcutter", "gathering", 1);
    assert.equal(rows[0].action.id, "act_chop_wood_t1");
    assert.equal(rows[0].unlocked, true);
    const fir = rows.find((r) => r.action.id === "act_chop_wood_t2")!;
    assert.equal(fir.requiredLevel, 12); // legacy table said 20
    assert.equal(fir.action.duration, 8200); // legacy table said 10s
    assert.equal(fir.unlocked, false);
    assert.equal(fir.levelsToGo, 11);
    assert.equal(nextUnlock(rows)?.action.id, "act_chop_wood_t2");
    for (let i = 1; i < rows.length; i++) assert.ok(rows[i].requiredLevel >= rows[i - 1].requiredLevel);
  });

  it("splits the farmer's gathering into 种植 and 畜牧 pages and never mixes production in", () => {
    const plant = skillActionRows(actions, "skill_farmer", "gathering", 1, { page: "primary" });
    const raise = skillActionRows(actions, "skill_farmer", "gathering", 1, { page: "secondary" });
    assert.ok(plant.every((r) => r.action.id.startsWith("act_plant_")));
    assert.ok(raise.every((r) => r.action.id.startsWith("act_raise_")));
    assert.ok(plant.length > 0 && raise.length > 0);
    const prod = skillActionRows(actions, "skill_farmer", "production", 1);
    assert.ok(prod.every((r) => (r.action.consumes || []).length > 0));
  });

  it("exposes primary and rare yields separately", () => {
    const rows = skillActionRows(actions, "skill_blacksmith", "gathering", 200);
    assert.ok(rows.every((r) => r.unlocked));
    assert.equal(rows[0].primaryYield?.itemId, "ore_1");
    assert.deepEqual(rows[0].rareYields, []);
  });
});
