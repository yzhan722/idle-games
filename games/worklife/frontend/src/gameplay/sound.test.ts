import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GAME_SOUNDS, isGameSoundEnabled, playGameSound, setGameSoundEnabled } from "./sound";

describe("game sound cues", () => {
  it("names every high-value first-hour event and respects soundEnabled", () => {
    assert.deepEqual([...GAME_SOUNDS], [
      "gather-complete",
      "craft-complete",
      "equip",
      "level-up",
      "unlock",
      "combat-hit",
      "combat-crit",
      "skill",
      "skill-ready",
      "boss-phase",
      "victory",
      "boss-win",
      "rare-drop",
    ]);
    setGameSoundEnabled(false);
    assert.equal(isGameSoundEnabled(), false);
    playGameSound("boss-win");
    setGameSoundEnabled(true);
    assert.equal(isGameSoundEnabled(), true);
    playGameSound("gather-complete");
  });
});
