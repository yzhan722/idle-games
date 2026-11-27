import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import * as backend from "../backend/src/growth_curves";
import * as frontend from "../frontend/src/gameplay/growthCurves";
import { derivedCombatLevel as backendCombatLevel, combatSkillContribution } from "../backend/src/combat_skills";
import { enhancementBonusPct as backendBonus, enhancementSuccessBreakdown } from "../backend/src/enhancement_math";
import { derivedCombatLevel as frontendCombatLevel, skillContribution } from "../frontend/src/gameplay/combatSheet";
import { enhancementBonusPct as frontendBonus, enhancementSuccessRate } from "../frontend/src/gameplay/enhancement";

// Lives under scripts/ on purpose: importing backend code from frontend/src would pull the
// backend into the frontend tsc project.
const root = path.resolve(__dirname, "..");
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8").replace(/\r\n/g, "\n");

describe("growth curves parity (one set of parameters, two identical copies)", () => {
  it("the two files are byte-for-byte the same", () => {
    assert.equal(read("frontend/src/gameplay/growthCurves.ts"), read("backend/src/growth_curves.ts"));
  });

  it("exports the same names and the same parameter values", () => {
    assert.deepEqual(Object.keys(frontend).sort(), Object.keys(backend).sort());
    for (const [name, value] of Object.entries(backend)) {
      if (typeof value !== "function") assert.deepEqual((frontend as Record<string, unknown>)[name], value, name);
    }
  });

  it("the enhancement page shows exactly what the server rolls and applies", () => {
    for (let target = 1; target <= backend.ENHANCE_MAX_LEVEL; target++) {
      assert.equal(frontendBonus(target), backendBonus(target));
      for (const skill of [1, 9, 40, 120, 200]) for (const item of [1, 12, 60, 150]) for (const tool of [0, 0.05, 0.069]) {
        assert.equal(enhancementSuccessRate(target, skill, item, tool), enhancementSuccessBreakdown(target, skill, item, tool).finalRate);
      }
    }
  });

  it("combat level and skill contributions agree for every mix of skills", () => {
    let seed = 7;
    const rnd = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
    for (let n = 0; n < 400; n++) {
      const skill = () => ({ level: 1 + Math.floor(rnd() * 200), xp: 0 });
      const cs = { stamina: skill(), intelligence: skill(), attack: skill(), defense: skill(), melee: skill(), ranged: skill(), magic: skill() };
      assert.equal(frontendCombatLevel({ combatSkills: cs }), backendCombatLevel(cs), JSON.stringify(cs));
      assert.deepEqual(skillContribution({ combatSkills: cs }), combatSkillContribution(cs, "melee"), JSON.stringify(cs));
    }
  });
});
