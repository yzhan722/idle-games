import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runFirstHourSimulation } from "./first_hour_sim";

describe("first-hour simulation checkpoints", () => {
  it("starts with no skip-the-loop materials and hits the required beats", async () => {
    const report = await runFirstHourSimulation();
    const byId = Object.fromEntries(report.checkpoints.map((c) => [c.id, c]));

    assert.equal(byId.start.wood, 0);
    assert.equal(byId.start.lumber, 0);
    assert.equal(byId.start.gold, 0);

    assert.ok(byId.first_action.atMs < 3 * 60_000);
    assert.ok(byId.first_action.wood >= 1);

    assert.ok(byId.first_upgrade.lumber >= 3);
    assert.equal(byId.first_equipment.sword, 1);
    assert.equal(byId.first_equipment.equippedSword, true);
    assert.equal(byId.first_armor.chest, 1);
    assert.equal(byId.first_armor.equippedChest, true);

    // The new forest curve: the crafted sword buys exactly the first kill — crab's
    // shell and the monkey's speed need the wood armor set (and levels) that come
    // after the sword. The boss is out of first-hour reach no matter the build.
    assert.equal(report.unarmedSlime.won, false);
    assert.equal(report.swordSlime.won, true);
    assert.equal(report.swordCrab.won, false);
    assert.equal(report.swordMonkey.won, false);
    assert.ok(report.swordMonkey.durationMs < report.swordSlime.durationMs, "fast mob ends a losing fight quickly");

    assert.equal(report.bossBark.won, false);
    assert.equal(report.bossEdge.won, false);
    assert.ok(report.bossBark.durationMs > report.bossEdge.durationMs, "the defensive build survives the boss longer");
  });
});
