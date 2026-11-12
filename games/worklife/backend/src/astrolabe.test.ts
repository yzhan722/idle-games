import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createMemoryStorage } from "./storage_memory";
import enhancedContentPack from "../../shared/enhanced_content_pack_chinese.json";
import type { EnhancedContentPack } from "./types";
import {
  PRESTIGE_ASTROLABE_NODES,
  doPrestige,
  getAstrolabeBonuses,
  getAvailablePrestigePoints,
  getPrestigeInfo,
  getPrestigeMultiplier,
  respecAstrolabe,
  upgradeAstrolabeNode,
} from "./progression2";
import { getActionQueueMax, getActionRates, getRareFindMultiplier, simulateToNow } from "./storage";
import { playerBuildExtras, startHpCombat, tickHpCombat } from "./hp_combat";
import { COMBAT_SKILL_IDS, derivedCombatLevel, ensureCombatSkills } from "./combat_skills";

const pack = enhancedContentPack as EnhancedContentPack;
const T0 = new Date("2026-11-12T00:00:00.000Z");

async function fresh() {
  const storage = createMemoryStorage();
  const user = await storage.findOrCreateGuestUser(`astro-${Math.random()}`);
  const state = await storage.getOrCreatePlayerState(user.id, pack.version || "1.0.0");
  return { storage, user, state };
}

function makeReadyForPrestige(state: any) {
  ensureCombatSkills(state);
  for (const id of COMBAT_SKILL_IDS) state.combatSkills[id].level = 70;
  state.combatLevel = derivedCombatLevel(state.combatSkills);
}

describe("WL-3 Inheritance Astrolabe (异世界传承星盘)", () => {
  it("preserves legacy save compatibility and never reduces base prestige yield when spending dust", async () => {
    const { storage, state } = await fresh();
    state.prestige = { count: 2, points: 10 }; // legacy save without spentPoints/astrolabe
    assert.equal(getPrestigeMultiplier(state), 1.2);
    assert.equal(getAvailablePrestigePoints(state), 10);

    const up1 = upgradeAstrolabeNode(state, "astro_queue_cap");
    assert.equal(up1.ok, true);
    assert.equal(up1.newRank, 1);
    assert.equal(up1.cost, 2);
    assert.equal(getAvailablePrestigePoints(state), 8);
    // Global yield multiplier stays 1.20 (+20%) based on cumulative earned points!
    assert.equal(getPrestigeMultiplier(state), 1.2);

    const info = getPrestigeInfo(state);
    assert.equal(info.points, 10);
    assert.equal(info.spentPoints, 2);
    assert.equal(info.availablePoints, 8);
    assert.equal(info.astrolabeNodes.length, PRESTIGE_ASTROLABE_NODES.length);
    await storage.close();
  });

  it("validates unknown nodes, max rank caps, insufficient points, and respec queue guards", async () => {
    const { storage, state } = await fresh();
    state.prestige = { count: 1, points: 6 };
    assert.equal(upgradeAstrolabeNode(state, "non_existent").ok, false);

    // astro_starter_kit costs [1, 2, 3] = 6 total
    assert.equal(upgradeAstrolabeNode(state, "astro_starter_kit").ok, true);
    assert.equal(upgradeAstrolabeNode(state, "astro_starter_kit").ok, true);
    assert.equal(upgradeAstrolabeNode(state, "astro_starter_kit").ok, true);
    assert.equal(getAvailablePrestigePoints(state), 0);
    // 4th upgrade rejected at maxRank
    assert.equal(upgradeAstrolabeNode(state, "astro_starter_kit").ok, false);
    // Another node rejected due to 0 available points
    assert.equal(upgradeAstrolabeNode(state, "astro_queue_cap").ok, false);

    // Respec blocked if queue has >5 items
    state.activityQueue = Array.from({ length: 6 }, (_, i) => ({ id: `q${i}`, actionId: "act_chop_wood_t1" }));
    assert.equal(respecAstrolabe(state).ok, false);

    state.activityQueue = [];
    const rs = respecAstrolabe(state);
    assert.equal(rs.ok, true);
    assert.equal(rs.refundedPoints, 6);
    assert.equal(getAvailablePrestigePoints(state), 6);
    await storage.close();
  });

  it("applies astro_house_keep and astro_starter_kit across prestige with valid contentPack items", async () => {
    const { storage, state } = await fresh();
    const validIds = new Set((pack.items as Array<{ id: string }>).map((i) => i.id));
    for (const rank of [1, 2, 3]) {
      const b = getAstrolabeBonuses({ prestige: { count: 1, points: 20, astrolabe: { astro_starter_kit: rank } } });
      for (const itemId of Object.keys(b.starterItems)) {
        assert.ok(validIds.has(itemId), `starter item ${itemId} must exist in contentPack`);
      }
    }

    // Without astro_house_keep, prestige resets rooms
    makeReadyForPrestige(state);
    state.house = { rooms: { lumber_yard: 7, forge: 4 } };
    const r0 = doPrestige(state);
    assert.equal(r0.ok, true);
    assert.deepEqual(state.house.rooms, {});
    assert.equal(state.inventory.gold, 100);

    // Rank 1 astro_house_keep + Rank 2 astro_starter_kit
    state.prestige = { count: 1, points: 20, spentPoints: 5, astrolabe: { astro_house_keep: 1, astro_starter_kit: 2 } };
    makeReadyForPrestige(state);
    state.house = { rooms: { lumber_yard: 8, forge: 5, kitchen: 1 } };
    const r1 = doPrestige(state);
    assert.equal(r1.ok, true);
    // Top 1 room (lumber_yard=8) kept intact; forge clamped to Lv.2; kitchen stays Lv.1
    assert.deepEqual(state.house.rooms, { lumber_yard: 8, forge: 2, kitchen: 1 });
    assert.equal(state.inventory.gold, 4100);
    assert.equal(state.inventory.weapon_logging_axe_t1, 1);
    assert.equal(state.inventory.weapon_iron_sword, 1);
    assert.equal(state.inventory.potion_hp_t1, 10);
    // Star nodes survive prestige
    assert.equal(state.prestige.astrolabe?.astro_house_keep, 1);
    assert.equal(state.prestige.spentPoints, 5);
    await storage.close();
  });

  it("wires queue cap, rareFind, craft efficiency, gather double-crit, and combat vigor into core math", async () => {
    const { storage, state } = await fresh();
    state.prestige = {
      count: 3,
      points: 30,
      spentPoints: 18,
      astrolabe: {
        astro_queue_cap: 3,
        astro_boss_fortune: 2,
        astro_craft_eff: 2,
        astro_gather_crit: 3,
        astro_battle_vigor: 2,
      },
    };
    assert.equal(getActionQueueMax(state), 8);
    assert.equal(Math.round(getRareFindMultiplier(state, pack, T0) * 100) / 100, 1.24);

    const chop = (pack.actions as any[]).find((a) => a.id === "act_chop_wood_t1");
    const rates = getActionRates(state, pack, chop, T0);
    assert.ok(rates.efficiencySources.some((s) => s.label.includes("巧匠星轨") && s.pct === 16));

    // Gathering double-yield crit triggers when rng < 0.24 (isolate from craft efficiency repeats by using 0.20 > 0.16)
    state.mode = "life_action";
    state.lifeActionState = { actionId: "act_chop_wood_t1", startedAt: T0.toISOString() };
    state.lastSimulatedAt = T0.toISOString();
    const tDone = new Date(T0.getTime() + Number(chop.duration));
    const snapCrit = JSON.parse(JSON.stringify(state));
    const snapPlain = JSON.parse(JSON.stringify(state));
    const settledCrit = simulateToNow({ state: snapCrit, now: tDone, contentPack: pack, rng: () => 0.2 }).state;
    const settledPlain = simulateToNow({ state: snapPlain, now: tDone, contentPack: pack, rng: () => 0.95 }).state;
    assert.equal(settledCrit.inventory.wood_1 || 0, (settledPlain.inventory.wood_1 || 0) * 2);

    // Combat vigor adds +8 ATK, +50 HP, and ×1.20 combat XP
    const build = playerBuildExtras(state);
    assert.equal(build.atk, 8);
    assert.equal(build.hp, 50);
    state.mode = "idle";
    state.inventory.weapon_wooden_sword = 1;
    (state.equipment as any).main_hand = "weapon_wooden_sword";
    state.hpCombat = startHpCombat(state, pack, "slime", T0);
    tickHpCombat(state, pack, new Date(T0.getTime() + 60_000), 60_000, () => 0.99);
    assert.equal(state.hpCombat?.outcome, "win");
    assert.ok((state.combatXp || 0) > 6);
    await storage.close();
  });
});
