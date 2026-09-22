import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getXpForLevel } from "../backend/src/storage";
import { xpToNextLevel, xpProgress } from "../frontend/src/gameplay/xp";

// Lives under scripts/ on purpose: importing backend code from frontend/src would pull the
// backend into the frontend tsc project.
describe("xp curve parity (frontend mirror vs backend truth)", () => {
  it("matches the backend level-up threshold for every level", () => {
    for (let level = 0; level <= 205; level++) {
      assert.equal(xpToNextLevel(level), getXpForLevel(level), `level ${level}`);
    }
  });

  it("first woodcutter level-up happens at 40 xp (4 poplar chops), not 100", () => {
    assert.equal(xpToNextLevel(1), 40);
    assert.deepEqual(xpProgress(1, 30), { need: 40, pct: 75, remaining: 10 });
  });

  it("caps at max level without dividing by infinity", () => {
    assert.deepEqual(xpProgress(200, 999), { need: Infinity, pct: 100, remaining: 0 });
  });
});
