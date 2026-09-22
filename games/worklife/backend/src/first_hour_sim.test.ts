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

    assert.equal(report.unarmedSlime.won, false);
    assert.equal(report.swordSlime.won, true);
    assert.equal(report.swordCrab.won, true);
    assert.equal(report.swordMonkey.won, true);
    assert.ok(report.swordCrab.durationMs > report.swordSlime.durationMs);
    assert.ok(report.swordMonkey.durationMs < report.swordSlime.durationMs);

    assert.equal(report.bossBark.won, true);
    assert.ok(report.bossBark.playerHpLeft > report.bossEdge.playerHpLeft);
  });
});
