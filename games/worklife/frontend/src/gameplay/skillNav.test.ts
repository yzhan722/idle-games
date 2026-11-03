import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CHAPTER1_NAV_IDS,
  MOBILE_NAV_GROUPS,
  SKILL_NAV,
  mobileGroupForTab,
  navIdForAction,
  recommendedSkillNavIds,
  visibleSkillNav,
} from "./skillNav";

describe("MWI-style skill nav model", () => {
  it("shows every skill from the first minute and only highlights the chapter-1 loop", () => {
    assert.equal(visibleSkillNav(false).length, SKILL_NAV.length);
    assert.equal(visibleSkillNav(true).length, SKILL_NAV.length);
    assert.deepEqual([...recommendedSkillNavIds(false)].sort(), [...CHAPTER1_NAV_IDS].sort());
    assert.equal(recommendedSkillNavIds(true).size, 0);
    // every profession has exactly one gathering and one production row
    for (const p of ["woodcutter", "blacksmith", "farmer", "chef", "tailor", "alchemist"]) {
      assert.equal(SKILL_NAV.filter((s) => s.profession === p && s.group === "gathering").length, 1, p);
      assert.equal(SKILL_NAV.filter((s) => s.profession === p && s.group === "production").length, 1, p);
    }
  });

  it("routes a running action to its row by skill + consumes, not by id prefix", () => {
    assert.equal(navIdForAction({ id: "act_chop_wood_t1", skillId: "skill_woodcutter" }), "logging");
    assert.equal(navIdForAction({ id: "act_craft_lumber_t1", skillId: "skill_woodcutter", consumes: [{}] }), "woodworking");
    assert.equal(navIdForAction({ id: "act_craft_hoe_t1", skillId: "skill_farmer", consumes: [{}] }), "husbandry");
    assert.equal(navIdForAction({ id: "act_mine_crystal_t1", skillId: "skill_alchemist" }), "crystal_mining");
    assert.equal(navIdForAction({ id: "act_combat_slime", skillId: "skill_combat" }), "adventure");
    assert.equal(navIdForAction(null), undefined);
  });

  it("maps every tab onto one of the five mobile groups", () => {
    assert.deepEqual(MOBILE_NAV_GROUPS.map((g) => g.id), ["gathering", "production", "combat", "character", "more"]);
    assert.equal(mobileGroupForTab("logging"), "gathering");
    assert.equal(mobileGroupForTab("alchemy"), "production");
    assert.equal(mobileGroupForTab("enhance"), "production");
    assert.equal(mobileGroupForTab("adventure"), "combat");
    assert.equal(mobileGroupForTab("character"), "character");
    assert.equal(mobileGroupForTab("trading"), "more");
    assert.equal(mobileGroupForTab("nope"), "more");
  });
});
