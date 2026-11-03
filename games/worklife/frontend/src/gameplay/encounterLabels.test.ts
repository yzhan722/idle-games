import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { archetypeLabel, encounterDifficulty, mechanicLabels } from "./encounterLabels";

describe("forest encounter labels", () => {
  it("names the three T1 archetypes and boss mechanics in Chinese", () => {
    assert.equal(archetypeLabel("ordinary"), "均衡");
    assert.equal(archetypeLabel("tank"), "高防");
    assert.equal(archetypeLabel("fast"), "快攻");
    assert.equal(archetypeLabel("boss"), "首领");
    assert.deepEqual(mechanicLabels(["guard_60", "nature_wrath_30"]), ["六成血格挡", "三成血狂怒"]);
  });

  it("grades difficulty from combat level, not a second HP table", () => {
    assert.equal(encounterDifficulty(1, 1), "适中");
    assert.equal(encounterDifficulty(1, 3), "危险");
  });
});
