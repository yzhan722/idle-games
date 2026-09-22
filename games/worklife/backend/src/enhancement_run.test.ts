import assert from "node:assert/strict";
import { describe, it } from "node:test";
import packJson from "../../shared/enhanced_content_pack_chinese.json";
import type { EnhancedContentPack } from "./types";
import { defaultEnhancedPlayerState, simulateToNow } from "./storage";
import { PROTECTION_MIRROR_ID } from "./enhancement_math";
import { ENHANCE_BASE_INTERVAL_MS, startEnhanceRun, stopEnhanceRun, tickEnhanceRun } from "./enhancement_run";

const pack = packJson as EnhancedContentPack;
const T0 = new Date("2026-09-03T00:00:00.000Z");
const at = (ms: number) => T0.getTime() + ms;

function rich() {
  const state = defaultEnhancedPlayerState(pack.version);
  state.lastSimulatedAt = T0.toISOString();
  state.inventory.weapon_wooden_sword = 1;
  state.equipment.main_hand = "weapon_wooden_sword";
  state.inventory.lumber_1 = 1000;
  state.inventory.gold = 100_000;
  return state;
}

describe("MWI enhancing as a timed action", () => {
  it("start validates target / materials / combat and switches the player to the enhancing mode", () => {
    const state = rich();
    assert.equal(startEnhanceRun(state, pack, { itemId: "weapon_wooden_sword", targetLevel: 0 }, T0).ok, false);
    assert.equal(startEnhanceRun(state, pack, { itemId: "weapon_wooden_sword", targetLevel: 21 }, T0).ok, false);
    assert.equal(startEnhanceRun(state, pack, { itemId: "nope", targetLevel: 1 }, T0).ok, false);
    const poor = rich();
    poor.inventory.gold = 10;
    const short = startEnhanceRun(poor, pack, { itemId: "weapon_wooden_sword", targetLevel: 1 }, T0);
    assert.equal(short.ok, false);
    assert.match((short as { message: string }).message, /材料不足/);
    state.hpCombat = { outcome: undefined } as any;
    assert.equal(startEnhanceRun(state, pack, { itemId: "weapon_wooden_sword", targetLevel: 1 }, T0).ok, false);
    state.hpCombat = undefined;
    state.mode = "life_action";
    state.lifeActionState = { actionId: "act_chop_wood_t1", startedAt: T0.toISOString() } as any;
    const ok = startEnhanceRun(state, pack, { itemId: "weapon_wooden_sword", targetLevel: 3 }, T0);
    assert.equal(ok.ok, true);
    assert.equal(state.mode, "enhancing", "the run replaces the skilling action");
    assert.equal(state.lifeActionState, undefined);
    assert.equal(state.enhanceRun?.nextAttemptAt, at(ENHANCE_BASE_INTERVAL_MS));
  });

  it("settles one attempt per interval and stops exactly when the target is reached", () => {
    const state = rich();
    startEnhanceRun(state, pack, { itemId: "weapon_wooden_sword", targetLevel: 3 }, T0);
    // Not yet due: nothing happens.
    assert.equal(tickEnhanceRun(state, pack, at(ENHANCE_BASE_INTERVAL_MS - 1), () => 0), null);
    assert.equal(state.enhanceRun!.attempts, 0);
    // Ten intervals later with guaranteed success: only three attempts were needed.
    const ended = tickEnhanceRun(state, pack, at(10 * ENHANCE_BASE_INTERVAL_MS), () => 0);
    assert.equal(ended?.getTime(), at(3 * ENHANCE_BASE_INTERVAL_MS));
    assert.equal(state.enhanceRun!.attempts, 3);
    assert.equal(state.enhanceRun!.successes, 3);
    assert.equal(state.enhanceRun!.outcome?.reason, "reached");
    assert.equal(state.enhanceRun!.outcome?.level, 3);
    assert.equal(state.equipment.enhancementLevels.weapon_wooden_sword, 3);
    assert.equal(state.mode, "idle");
    // cost: +1 (2 lumber, 100 gold) + +2 (4, 200) + +3 (6, 300)
    assert.equal(state.inventory.lumber_1, 1000 - 12);
    assert.equal(state.inventory.gold, 100_000 - 600);
    assert.ok(state.enhanceRun!.xpGained > 0);
    assert.equal(state.skills.skill_enhancing.xp > 0 || state.skills.skill_enhancing.level > 1, true);
  });

  it("keeps failing (reset to +0) until the materials run out, then parks without spending more", () => {
    const state = rich();
    state.inventory.lumber_1 = 5; // two +1 attempts (2 each), then short
    startEnhanceRun(state, pack, { itemId: "weapon_wooden_sword", targetLevel: 2 }, T0);
    const ended = tickEnhanceRun(state, pack, at(100 * ENHANCE_BASE_INTERVAL_MS), () => 1);
    assert.equal(state.enhanceRun!.attempts, 2);
    assert.equal(state.enhanceRun!.failures, 2);
    assert.equal(state.enhanceRun!.outcome?.reason, "materials");
    assert.equal(ended?.getTime(), at(3 * ENHANCE_BASE_INTERVAL_MS), "the third attempt could not be paid");
    assert.equal(state.inventory.lumber_1, 1);
    assert.equal(state.equipment.enhancementLevels.weapon_wooden_sword, 0);
    assert.equal(state.mode, "idle");
  });

  it("with protection a failure only drops one level and the run parks when the mirrors are gone", () => {
    const state = rich();
    state.equipment.enhancementLevels.weapon_wooden_sword = 5;
    state.inventory[PROTECTION_MIRROR_ID] = 2;
    startEnhanceRun(state, pack, { itemId: "weapon_wooden_sword", targetLevel: 8, useProtection: true }, T0);
    tickEnhanceRun(state, pack, at(100 * ENHANCE_BASE_INTERVAL_MS), () => 1);
    assert.equal(state.enhanceRun!.attempts, 2, "two mirrors → two protected failures");
    assert.equal(state.equipment.enhancementLevels.weapon_wooden_sword, 3);
    assert.equal(state.inventory[PROTECTION_MIRROR_ID], undefined);
    assert.equal(state.enhanceRun!.outcome?.reason, "no_protection");
  });

  it("simulateToNow settles the run offline, and a competing activity closes it", () => {
    const state = rich();
    startEnhanceRun(state, pack, { itemId: "weapon_wooden_sword", targetLevel: 2 }, T0);
    const out = simulateToNow({ state, now: new Date(at(5 * ENHANCE_BASE_INTERVAL_MS)), contentPack: pack, rng: () => 0 }).state as typeof state;
    assert.equal(out.enhanceRun?.outcome?.reason, "reached");
    assert.equal(out.equipment.enhancementLevels.weapon_wooden_sword, 2);
    assert.equal(out.mode, "idle");

    const other = rich();
    startEnhanceRun(other, pack, { itemId: "weapon_wooden_sword", targetLevel: 5 }, T0);
    other.mode = "life_action"; // e.g. the player started chopping
    tickEnhanceRun(other, pack, at(ENHANCE_BASE_INTERVAL_MS), () => 0);
    assert.equal(other.enhanceRun?.outcome?.reason, "stopped");
    assert.equal(other.enhanceRun?.attempts, 0);
    assert.equal(other.mode, "life_action");

    const manual = rich();
    startEnhanceRun(manual, pack, { itemId: "weapon_wooden_sword", targetLevel: 5 }, T0);
    stopEnhanceRun(manual, new Date(at(1000)));
    assert.equal(manual.mode, "idle");
    assert.equal(manual.enhanceRun?.outcome?.reason, "stopped");
  });
});
