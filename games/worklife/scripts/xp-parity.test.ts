import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getXpForLevel } from "../backend/src/storage";
import { xpToNextLevel, xpProgress } from "../frontend/src/gameplay/xp";
import packJson from "../shared/enhanced_content_pack_chinese.json";

const pack = packJson as unknown as { actions: Array<{ id: string; xp?: number }> };

// Lives under scripts/ on purpose: importing backend code from frontend/src would pull the
// backend into the frontend tsc project.
describe("xp curve parity (frontend mirror vs backend truth)", () => {
  it("matches the backend level-up threshold for every level", () => {
    for (let level = 0; level <= 205; level++) {
      assert.equal(xpToNextLevel(level), getXpForLevel(level), `level ${level}`);
    }
  });

  it("first woodcutter level-up takes four poplar chops", () => {
    const chop = pack.actions.find((a) => a.id === "act_chop_wood_t1")!.xp!;
    const need = xpToNextLevel(1);
    assert.equal(Math.ceil(need / chop), 4);
    assert.deepEqual(xpProgress(1, need - chop), { need, pct: ((need - chop) / need) * 100, remaining: chop });
  });

  it("caps at max level without dividing by infinity", () => {
    assert.deepEqual(xpProgress(200, 999), { need: Infinity, pct: 100, remaining: 0 });
  });
});
