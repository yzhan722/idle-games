import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createMemoryStorage } from "./storage_memory";
import enhancedContentPack from "../../shared/enhanced_content_pack_chinese.json";
import type { EnhancedContentPack } from "./types";
import {
  BASE_COOLDOWN_MS,
  GIFT_POINTS,
  TASK_SLOTS,
  buyTaskShop,
  claimGift,
  claimTask,
  cooldownMs,
  deleteTask,
  ensureTasks,
  rerollCost,
  rerollTask,
  setTaskBlock,
  taskBoardView,
  taskProgress,
  taskSummary,
} from "./tasks";
import { simulateToNow } from "./storage";

const pack = enhancedContentPack as EnhancedContentPack;
const T0 = new Date("2026-09-03T00:00:00.000Z");
const seq = (...vals: number[]) => {
  let i = 0;
  return () => vals[Math.min(i++, vals.length - 1)];
};

async function fresh() {
  const storage = createMemoryStorage();
  const user = await storage.findOrCreateGuestUser(`tasks-${Math.random()}`);
  const state = await storage.getOrCreatePlayerState(user.id, pack.version || "1.0.0");
  return { storage, state };
}

describe("MWI task board", () => {
  it("hands out the first task immediately and the next one after the cooldown", async () => {
    const { storage, state } = await fresh();
    const s = ensureTasks(state, pack, T0, () => 0.5);
    assert.equal(s.tasks.length, 1);
    assert.equal(Date.parse(s.nextTaskAt), T0.getTime() + BASE_COOLDOWN_MS);
    ensureTasks(state, pack, new Date(T0.getTime() + BASE_COOLDOWN_MS - 1), () => 0.5);
    assert.equal(state.tasksState!.tasks.length, 1, "not yet");
    ensureTasks(state, pack, new Date(T0.getTime() + BASE_COOLDOWN_MS), () => 0.5);
    assert.equal(state.tasksState!.tasks.length, 2);
    await storage.close();
  });

  it("catches up offline time but never past the slot cap, and resumes when a slot frees", async () => {
    const { storage, state } = await fresh();
    ensureTasks(state, pack, T0, () => 0.5);
    ensureTasks(state, pack, new Date(T0.getTime() + 30 * BASE_COOLDOWN_MS), () => 0.5);
    assert.equal(state.tasksState!.tasks.length, TASK_SLOTS);
    const now = new Date(T0.getTime() + 30 * BASE_COOLDOWN_MS);
    assert.equal(state.tasksState!.nextTaskAt, now.toISOString(), "timer parks while the board is full");
    const del = deleteTask(state, pack, state.tasksState!.tasks[0].id, now);
    assert.equal(del.ok, true);
    assert.equal(state.tasksState!.tasks.length, TASK_SLOTS - 1);
    ensureTasks(state, pack, now, () => 0.5);
    assert.equal(state.tasksState!.tasks.length, TASK_SLOTS, "freed slot fills at once because the timer had elapsed");
    await storage.close();
  });

  it("tasks name a real action or monster and read progress from stats deltas", async () => {
    const { storage, state } = await fresh();
    // rng: pickSkill → woodcutter (first weighted entry), minutes → low, action pick → first eligible
    const s = ensureTasks(state, pack, T0, seq(0.01, 0.0, 0.0, 0.0));
    const t = s.tasks[0];
    assert.equal(t.kind, "action");
    assert.equal(t.actionId, "act_chop_wood_t1");
    assert.ok(t.name.startsWith("砍伐小白杨 ×"), t.name);
    assert.ok(t.target >= 100 && t.target <= 300, `20–45 min of 5s chops → ${t.target}`);
    assert.equal(taskProgress(state, t), 0);
    // progress comes from the per-action tally, offset by the baseline at assignment
    state.stats!.actionsById = { act_chop_wood_t1: 50 };
    assert.equal(taskProgress(state, t), 50);
    assert.equal(claimTask(state, pack, t.id, T0).error, "task_incomplete");
    state.stats!.actionsById = { act_chop_wood_t1: t.target + 5 };
    const claimed = claimTask(state, pack, t.id, T0);
    assert.equal(claimed.ok, true);
    assert.equal(state.inventory.gold, t.reward.gold);
    assert.equal(state.tasksState!.tokens, t.reward.tokens);
    assert.equal(state.tasksState!.points, t.reward.tokens);
    assert.equal(state.tasksState!.tasks.length, 0);
    assert.equal(state.tasksState!.completed, 1);
    await storage.close();
  });

  it("combat tasks target beaten monsters (slime for beginners) and read killsByMonster", async () => {
    const { storage, state } = await fresh();
    state.tasksState = undefined;
    // pickSkill: total weight = 6 skills×1 + combat 1 = 7; rng 0.95×7 = 6.65 → skill_combat (last)
    const s = ensureTasks(state, pack, T0, seq(0.95, 0.5, 0.0));
    const t = s.tasks[0];
    assert.equal(t.kind, "kill");
    assert.equal(t.monsterId, "slime");
    assert.ok(/击败果冻史莱姆 ×\d+/.test(t.name), t.name);
    state.stats!.killsByMonster = { slime: t.target };
    assert.equal(taskProgress(state, t), t.target);
    await storage.close();
  });

  it("taskSummary (the nav badge) counts claimable tasks and a ready gift", async () => {
    const { storage, state } = await fresh();
    assert.deepEqual(taskSummary(state), { total: 0, ready: 0, giftReady: false }, "no board yet");
    const s = ensureTasks(state, pack, T0, seq(0.01, 0.0, 0.0, 0.0));
    assert.deepEqual(taskSummary(state), { total: 1, ready: 0, giftReady: false });
    state.stats!.actionsById = { [s.tasks[0].actionId!]: s.tasks[0].target };
    s.points = GIFT_POINTS;
    assert.deepEqual(taskSummary(state), { total: 1, ready: 1, giftReady: true });
    await storage.close();
  });

  it("the simulator assigns tasks as time passes", async () => {
    const { storage, state } = await fresh();
    state.lastSimulatedAt = T0.toISOString();
    // A save meets the board for the first time: one task, timer starts now.
    let out = simulateToNow({ state, now: new Date(T0.getTime() + 1000), contentPack: pack, rng: () => 0.5 }).state as typeof state;
    assert.equal(out.tasksState!.tasks.length, 1);
    // Two cooldowns later (offline) the board caught up.
    out = simulateToNow({ state: out, now: new Date(T0.getTime() + 2 * BASE_COOLDOWN_MS + 2000), contentPack: pack, rng: () => 0.5 }).state as typeof state;
    assert.equal(out.tasksState!.tasks.length, 3, "t0, +8h, +16h");
    await storage.close();
  });

  it("reroll costs gold and doubles within the day; blocked skills are skipped", async () => {
    const { storage, state } = await fresh();
    ensureTasks(state, pack, T0, () => 0.5);
    const id = state.tasksState!.tasks[0].id;
    assert.equal(rerollTask(state, pack, id, T0).error, "no_gold");
    state.inventory.gold = 10_000;
    assert.equal(rerollCost(state.tasksState!, "2026-09-03"), 200);
    const r1 = rerollTask(state, pack, id, T0, () => 0.5);
    assert.equal(r1.ok, true);
    assert.equal(r1.cost, 200);
    assert.equal(r1.nextCost, 400);
    assert.equal(state.inventory.gold, 9_800);
    assert.notEqual(state.tasksState!.tasks[0].id, id);
    // next day the cost resets
    assert.equal(rerollCost(state.tasksState!, "2026-09-04"), 200);
    // blocking needs a purchased slot
    assert.equal(setTaskBlock(state, pack, "skill_woodcutter", true, T0).error, "no_block_slot");
    state.tasksState!.blockSlots = 1;
    assert.equal(setTaskBlock(state, pack, "skill_woodcutter", true, T0).ok, true);
    assert.equal(setTaskBlock(state, pack, "skill_blacksmith", true, T0).error, "no_block_slot");
    for (let i = 0; i < 20; i++) {
      const r = rerollTask(state, pack, state.tasksState!.tasks[0].id, T0, () => Math.random());
      if (!r.ok) break;
      assert.notEqual(state.tasksState!.tasks[0].skillId, "skill_woodcutter");
    }
    await storage.close();
  });

  it("token shop: cooldown upgrade shortens the pending timer, crates pay out, gifts unlock at 50 points", async () => {
    const { storage, state } = await fresh();
    ensureTasks(state, pack, T0, () => 0.5);
    const s = state.tasksState!;
    assert.equal(buyTaskShop(state, pack, "cooldown", T0).error, "no_tokens");
    s.tokens = 100;
    const before = Date.parse(s.nextTaskAt);
    const buy = buyTaskShop(state, pack, "cooldown", T0);
    assert.equal(buy.ok, true);
    assert.equal(s.cooldownLevel, 1);
    assert.equal(cooldownMs(s), BASE_COOLDOWN_MS - 30 * 60_000);
    assert.equal(Date.parse(s.nextTaskAt), before - 30 * 60_000);
    assert.equal(s.tokens, 80);
    const crate = buyTaskShop(state, pack, "crate", T0, () => 0.5);
    assert.equal(crate.ok, true);
    assert.ok((state.inventory.gold || 0) >= 800);
    assert.equal(s.tokens, 65);
    assert.equal(claimGift(state, pack, T0).error, "gift_not_ready");
    s.points = GIFT_POINTS;
    const gift = claimGift(state, pack, T0, () => 0);
    assert.equal(gift.ok, true);
    assert.equal(gift.book, "book_smash");
    assert.equal(state.inventory.book_smash, 1);
    assert.equal(s.giftsClaimed, 1);
    const view = taskBoardView(state, pack, T0);
    assert.equal(view.giftReady, false);
    assert.equal(view.shop.find((i) => i.id === "cooldown")?.cost, 30);
    // charms: one per player, sold out once owned (in the bag or worn)
    assert.equal(view.shop.find((i) => i.id === "charm_defense")?.soldOut, false);
    const charm = buyTaskShop(state, pack, "charm_defense", T0);
    assert.equal(charm.ok, true);
    assert.equal(state.inventory.charm_defense, 1);
    assert.equal(buyTaskShop(state, pack, "charm_defense", T0).error, "sold_out");
    (state.equipment as any).accessory1 = "charm_defense";
    delete state.inventory.charm_defense;
    assert.equal(taskBoardView(state, pack, T0).shop.find((i) => i.id === "charm_defense")?.soldOut, true, "worn counts as owned");
    assert.equal(taskBoardView(state, pack, T0).shop.find((i) => i.id === "charm_attack")?.soldOut, false);
    await storage.close();
  });
});
