import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createMemoryStorage } from "./storage_memory";
import enhancedContentPack from "../../shared/enhanced_content_pack_chinese.json";
import type { EnhancedContentPack } from "./types";
import { HOUSE_MAX_LEVEL, HOUSE_ROOMS, houseLevelForSkill, houseView, roomUpgradeCost, totalHouseLevel, upgradeRoom } from "./houses";
import { getActionRates, getRareFindMultiplier } from "./storage";
import { startHpCombat, tickHpCombat } from "./hp_combat";

const pack = enhancedContentPack as EnhancedContentPack;
const T0 = new Date("2026-09-03T00:00:00.000Z");

async function fresh() {
  const storage = createMemoryStorage();
  const user = await storage.findOrCreateGuestUser(`house-${Math.random()}`);
  const state = await storage.getOrCreatePlayerState(user.id, pack.version || "1.0.0");
  return { storage, state };
}

describe("MWI houses", () => {
  it("every room's materials exist in the content pack", () => {
    const ids = new Set((pack.items as Array<{ id: string }>).map((i) => i.id));
    for (const room of HOUSE_ROOMS) for (const m of room.materials) assert.ok(ids.has(m), `${room.id}: ${m}`);
  });

  it("upgrades cost gold + the skill's own materials, refuse when short, and stop at the cap", async () => {
    const { storage, state } = await fresh();
    assert.equal(upgradeRoom(state, pack, "nope").error, "unknown_room");
    const cost1 = roomUpgradeCost(HOUSE_ROOMS[0], 1);
    assert.deepEqual(cost1, { gold: 200, materials: [{ itemId: "wood_1", qty: 20 }] });
    assert.equal(upgradeRoom(state, pack, "lumber_yard").error, "missing_materials");
    state.inventory.wood_1 = 20;
    assert.equal(upgradeRoom(state, pack, "lumber_yard").error, "no_gold");
    state.inventory.gold = 200;
    const up = upgradeRoom(state, pack, "lumber_yard");
    assert.equal(up.ok, true);
    assert.equal(up.level, 1);
    assert.equal(state.inventory.gold, 0);
    assert.equal(state.inventory.wood_1, undefined);
    assert.equal(houseLevelForSkill(state, "skill_woodcutter"), 1);
    // level 3 moves to the next material band
    assert.equal(roomUpgradeCost(HOUSE_ROOMS[0], 3).materials[0].itemId, "wood_2");
    state.house!.rooms.lumber_yard = HOUSE_MAX_LEVEL;
    assert.equal(upgradeRoom(state, pack, "lumber_yard").error, "max_level");
    assert.equal(totalHouseLevel(state), HOUSE_MAX_LEVEL);
    await storage.close();
  });

  it("a profession room adds +1% efficiency and +1% XP per level to that skill only", async () => {
    const { storage, state } = await fresh();
    const chop = (pack.actions as any[]).find((a) => a.id === "act_chop_wood_t1");
    const mine = (pack.actions as any[]).find((a) => a.id === "act_mine_ore_t1");
    const before = getActionRates(state, pack, chop, T0);
    state.house = { rooms: { lumber_yard: 5 } };
    const after = getActionRates(state, pack, chop, T0);
    assert.equal(after.efficiencyPct - before.efficiencyPct, 5);
    assert.ok(after.efficiencySources.some((s) => s.label.includes("木料场") && s.pct === 5));
    assert.equal(Math.round((after.xpMul / before.xpMul) * 100) / 100, 1.05);
    const mineRates = getActionRates(state, pack, mine, T0);
    assert.equal(mineRates.efficiencyPct, 0, "other skills untouched");
    await storage.close();
  });

  it("训练场 adds combat XP and rare find", async () => {
    const { storage, state } = await fresh();
    assert.equal(getRareFindMultiplier(state, pack), 1);
    state.house = { rooms: { training_ground: 4 } };
    assert.equal(Math.round(getRareFindMultiplier(state, pack) * 100) / 100, 1.04);
    state.inventory.weapon_wooden_sword = 1;
    (state.equipment as any).main_hand = "weapon_wooden_sword";
    state.hpCombat = startHpCombat(state, pack, "slime", T0);
    tickHpCombat(state, pack, new Date(T0.getTime() + 60_000), 60_000, () => 0.99);
    assert.equal(state.hpCombat?.outcome, "win");
    // slime 4 XP × 1.04 = 4.16 → melee 44% = 1.8304 → 1.8
    assert.equal(state.hpCombat?.xpGained?.melee, 1.8);
    await storage.close();
  });

  it("the view lists every room with level, bonus and an affordable flag for the next cost", async () => {
    const { storage, state } = await fresh();
    state.inventory.gold = 200;
    state.inventory.wood_1 = 20;
    const view = houseView(state, pack);
    assert.equal(view.rooms.length, HOUSE_ROOMS.length);
    const lumber = view.rooms.find((r) => r.id === "lumber_yard")!;
    assert.equal(lumber.level, 0);
    assert.equal(lumber.nextCost?.affordable, true);
    assert.equal(lumber.nextCost?.materials[0].have, 20);
    assert.equal(view.rooms.find((r) => r.id === "forge")!.nextCost?.affordable, false);
    await storage.close();
  });
});
