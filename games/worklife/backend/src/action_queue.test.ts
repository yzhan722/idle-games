import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createMemoryStorage } from "./storage_memory";
import { simulateToNow, startNextQueuedAction, queuedActionBlocker } from "./storage";
import enhancedContentPack from "../../shared/enhanced_content_pack_chinese.json";
import type { EnhancedContentPack, EnhancedPlayerState } from "./types";

const pack = enhancedContentPack as EnhancedContentPack;
const T0 = new Date("2026-09-03T00:00:00.000Z");
const at = (ms: number) => new Date(T0.getTime() + ms);

async function fresh() {
  const storage = createMemoryStorage();
  const user = await storage.findOrCreateGuestUser(`q-${Math.random()}`);
  const state = (await storage.getOrCreatePlayerState(user.id, pack.version || "1.0.0")) as EnhancedPlayerState;
  return { storage, user, state };
}

// rng 0.99: no efficiency repeats, no chance yields → counts below are exact
function sim(state: EnhancedPlayerState, now: Date, rng: () => number = () => 0.99): EnhancedPlayerState {
  return simulateToNow({ state, now, contentPack: pack, rng }).state as EnhancedPlayerState;
}

describe("action timing is anchored on the cycle start, not on the last poll", () => {
  it("gives exactly one log per 5s regardless of poll jitter", async () => {
    const { storage, user } = await fresh();
    let state = await storage.startLifeAction({ userId: user.id, actionId: "act_chop_wood_t1", now: T0, contentPack: pack });
    // Polls land 300ms after each boundary (the client refresh) plus a 600ms follow-up, like the real UI.
    const polls = [5300, 5900, 10300, 10900, 15300, 15900, 20300, 20900, 25300];
    for (const ms of polls) state = sim(state as EnhancedPlayerState, at(ms));
    assert.equal(state.inventory.wood_1, 5, "5 boundaries crossed in 25.3s");
    // Progress of the current (6th) cycle must be carried, not reset by the poll.
    const startedAt = new Date(state.lifeActionState!.startedAt).getTime();
    assert.equal(startedAt, at(25000).getTime());
    await storage.close();
  });

  it("does not lose the remainder when a poll arrives 4.9s after the last one", async () => {
    const { storage, user } = await fresh();
    let state = await storage.startLifeAction({ userId: user.id, actionId: "act_chop_wood_t1", now: T0, contentPack: pack });
    state = sim(state as EnhancedPlayerState, at(4900));
    assert.equal(state.inventory.wood_1 || 0, 0);
    state = sim(state, at(9800));
    assert.equal(state.inventory.wood_1, 1, "cycle 1 finished at 5.0s");
    state = sim(state, at(10100));
    assert.equal(state.inventory.wood_1, 2, "cycle 2 finished at 10.0s, seen by the 10.1s poll");
    await storage.close();
  });
});

describe("efficiency (MWI): free instant repeats per completed cycle", () => {
  it("gives +1% per level above the requirement and repeats without consuming time", async () => {
    const { storage, user } = await fresh();
    let state = (await storage.getOrCreatePlayerState(user.id, pack.version || "1.0.0")) as EnhancedPlayerState;
    state.skills.skill_woodcutter.level = 3; // poplar requires 1 → efficiency 2%
    state = await storage.startLifeAction({ userId: user.id, actionId: "act_chop_wood_t1", now: T0, contentPack: pack }) as EnhancedPlayerState;
    const { getActionRates } = await import("./storage");
    const action = (pack.actions as any[]).find((a) => a.id === "act_chop_wood_t1");
    const rates = getActionRates(state, pack, action, T0);
    assert.equal(rates.efficiencyPct, 2);
    assert.deepEqual(rates.efficiencySources, [{ label: "等级高出 2 级", pct: 2 }]);
    const snapshot = JSON.parse(JSON.stringify(state)); // simulateToNow mutates nested inventory in place
    // rng below 0.02 → the bonus repeat triggers every cycle: 5 time-cycles → 10 logs, still 25s of time
    const lucky = sim(state, at(25_300), () => 0.01);
    assert.equal(lucky.inventory.wood_1, 10);
    assert.equal(new Date(lucky.lifeActionState!.startedAt).getTime(), at(25_000).getTime());
    assert.ok(lucky.logs.some((l) => l.text.includes("效率额外 5 次")));
    // rng above → plain 5
    const plain = sim(snapshot, at(25_300), () => 0.99);
    assert.equal(plain.inventory.wood_1, 5);
    await storage.close();
  });

  it("does not apply to combat actions and stops a batch at its count even mid-repeat", async () => {
    const { storage, user } = await fresh();
    let state = (await storage.getOrCreatePlayerState(user.id, pack.version || "1.0.0")) as EnhancedPlayerState;
    state.skills.skill_woodcutter.level = 3;
    const { getActionRates } = await import("./storage");
    const combat = (pack.actions as any[]).find((a) => a.id === "act_combat_slime");
    assert.equal(getActionRates(state, pack, combat, T0).efficiencyPct, 0);
    state = await storage.startLifeAction({ userId: user.id, actionId: "act_chop_wood_t1", quantity: 3, now: T0, contentPack: pack }) as EnhancedPlayerState;
    const s = sim(state, at(60_000), () => 0.01); // 2 per cycle → 3 done within 2 cycles (10s)
    assert.equal(s.inventory.wood_1, 3);
    assert.equal(s.mode, "idle");
    await storage.close();
  });
});

describe("tool slot (MWI tool speed)", () => {
  it("speeds up only the tool's own profession and never counts in combat stats", async () => {
    const { storage, user } = await fresh();
    const state = (await storage.getOrCreatePlayerState(user.id, pack.version || "1.0.0")) as EnhancedPlayerState;
    state.inventory.weapon_logging_axe_t2 = 1; // +20% woodcutting
    (state.equipment as any).tool = "weapon_logging_axe_t2";
    const { getActionRates, getEquippedCombatStats } = await import("./storage");
    const chop = (pack.actions as any[]).find((a) => a.id === "act_chop_wood_t1");
    const mine = (pack.actions as any[]).find((a) => a.id === "act_mine_ore_t1");
    const r1 = getActionRates(state, pack, chop, T0);
    assert.equal(Math.round(r1.speedMul * 100) / 100, 1.2);
    assert.equal(Math.round(r1.effectiveDurationMs), Math.round(5000 / 1.2));
    assert.ok(r1.speedSources.some((s) => s.label.startsWith("工具") && s.pct === 20));
    const r2 = getActionRates(state, pack, mine, T0);
    assert.equal(r2.speedMul, 1, "mining not affected by an axe");
    // the axe has atk 20 but the tool slot must not add to combat
    assert.deepEqual(getEquippedCombatStats(state, pack), { atk: 0, def: 0 });
    await storage.close();
  });

  it("equips a tool into the tool slot but rejects non-tools there", async () => {
    const { canEquipItem } = await import("./equipment_equip");
    const items = pack.items as any[];
    assert.equal(canEquipItem({ weapon_logging_axe_t1: 1 }, "tool", "weapon_logging_axe_t1", items).ok, true);
    assert.equal(canEquipItem({ weapon_wooden_sword: 1 }, "tool", "weapon_wooden_sword", items).ok, false);
    // a tool is still a weapon for the main hand
    assert.equal(canEquipItem({ weapon_logging_axe_t1: 1 }, "main_hand", "weapon_logging_axe_t1", items).ok, true);
    // pack accessories say slot "accessory": both accessory slots accept them (this was rejected before)
    assert.equal(canEquipItem({ accessory_pouch_small: 1 }, "accessory1", "accessory_pouch_small", items).ok, true);
    assert.equal(canEquipItem({ accessory_pouch_small: 1 }, "accessory2", "accessory_pouch_small", items).ok, true);
    assert.equal(canEquipItem({ accessory_pouch_small: 1 }, "head", "accessory_pouch_small", items).ok, false);
  });
});

describe("action queue", () => {
  it("chains queued actions inside one offline window with exact hand-off times", async () => {
    const { storage, user } = await fresh();
    let state = (await storage.getOrCreatePlayerState(user.id, pack.version || "1.0.0")) as EnhancedPlayerState;
    state.inventory.wood_1 = 4;
    state = await storage.startLifeAction({ userId: user.id, actionId: "act_craft_lumber_t1", quantity: 2, now: T0, contentPack: pack }) as EnhancedPlayerState;
    state.activityQueue = [
      { id: "a", actionId: "act_chop_wood_t1", quantity: 3 },
      { id: "b", actionId: "act_craft_lumber_t1" }, // infinite until materials run out
    ];
    // boards: 2 × 4s = 8s → chops: 3 × 5s = 15s (ends 23s) → boards: 3 wood → 1 board (4s, ends 27s) then stop
    state = sim(state, at(30_000));
    assert.equal(state.inventory.lumber_1, 3);
    assert.equal(state.inventory.wood_1, 1);
    assert.equal(state.mode, "idle");
    assert.deepEqual(state.activityQueue, []);
    const logs = state.logs.map((l) => l.text);
    assert.ok(logs.some((l) => l.includes("队列：开始 砍伐小白杨 ×3")));
    assert.ok(logs.some((l) => l.includes("队列：开始 标准木板")));
    assert.ok(logs.some((l) => l.includes("材料不足，已停止")));
    await storage.close();
  });

  it("keeps sub-second precision across the hand-off (chop ×2 then craft continues from 10.0s)", async () => {
    const { storage, user } = await fresh();
    let state = await storage.startLifeAction({ userId: user.id, actionId: "act_chop_wood_t1", quantity: 2, now: T0, contentPack: pack }) as EnhancedPlayerState;
    state.activityQueue = [{ id: "c", actionId: "act_craft_lumber_t1", quantity: 1 }];
    state = sim(state, at(13_500)); // chops end at 10s; craft (4s) started at 10s → 3.5s in
    assert.equal(state.inventory.wood_1, 2);
    assert.equal(state.mode, "life_action");
    assert.equal(state.lifeActionState?.actionId, "act_craft_lumber_t1");
    assert.equal(new Date(state.lifeActionState!.startedAt).getTime(), at(10_000).getTime());
    state = sim(state, at(14_100));
    assert.equal(state.inventory.lumber_1, 1, "craft finished at exactly 14.0s");
    assert.equal(state.mode, "idle");
    await storage.close();
  });

  it("skips queue items that cannot start and reports why", async () => {
    const { storage, state } = await fresh();
    state.activityQueue = [
      { id: "x", actionId: "act_craft_weapon_wooden_sword", quantity: 1 }, // no lumber
      { id: "y", actionId: "act_chop_wood_t1", quantity: 1 },
    ];
    assert.equal(startNextQueuedAction(state, pack, T0), true);
    assert.equal(state.lifeActionState?.actionId, "act_chop_wood_t1");
    assert.ok(state.logs.some((l) => l.text.includes("队列跳过") && l.text.includes("材料不足")));
    assert.equal(queuedActionBlocker(state, pack, "act_combat_slime"), "combat_not_queueable");
    assert.equal(queuedActionBlocker(state, pack, "nope"), "unknown_action");
    await storage.close();
  });
});
