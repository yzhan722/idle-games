import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createMemoryStorage } from "./storage_memory";
import { simulateToNow } from "./storage";
import { buildOfflineReport, reportHasContent, snapshotForReport } from "./offline_report";
import enhancedContentPack from "../../shared/enhanced_content_pack_chinese.json";
import type { EnhancedContentPack, EnhancedPlayerState } from "./types";

const pack = enhancedContentPack as EnhancedContentPack;
const T0 = new Date("2026-09-03T00:00:00.000Z");

describe("offline report", () => {
  it("summarises an 8-hour chop → boards → stop run: actions, items, xp with level-ups, stop reason", async () => {
    const storage = createMemoryStorage();
    const user = await storage.findOrCreateGuestUser("offline-1");
    let state = (await storage.getOrCreatePlayerState(user.id, pack.version || "1.0.0")) as EnhancedPlayerState;
    state = await storage.startLifeAction({ userId: user.id, actionId: "act_chop_wood_t1", quantity: 40, now: T0, contentPack: pack }) as EnhancedPlayerState;
    state.activityQueue = [{ id: "q1", actionId: "act_craft_lumber_t1" }]; // infinite → stops when wood runs out
    const before = snapshotForReport(state);
    const to = new Date(T0.getTime() + 8 * 3600_000);
    const after = simulateToNow({ state, now: to, contentPack: pack, rng: () => 0.99 }).state as EnhancedPlayerState;
    const report = buildOfflineReport(before, after, pack, T0, to);
    assert.equal(reportHasContent(report), true);
    assert.equal(report.durationMs, 8 * 3600_000);
    assert.deepEqual(report.actions.find((a) => a.name === "砍伐小白杨"), { name: "砍伐小白杨", count: 40 });
    assert.deepEqual(report.actions.find((a) => a.name === "制作标准木板"), { name: "制作标准木板", count: 20 });
    assert.deepEqual(report.items, [{ itemId: "lumber_1", qty: 20 }]); // wood was all consumed
    const wc = report.skills.find((s) => s.skillId === "skill_woodcutter")!;
    assert.equal(wc.xp, 40 * 10 + 20 * 8);
    assert.equal(wc.fromLevel, 1);
    assert.ok(wc.toLevel > wc.fromLevel);
    assert.ok(report.stopped && report.stopped.includes("材料不足"), report.stopped);
    assert.equal(report.running, undefined);
    await storage.close();
  });

  it("summarises an offline enhancing run: attempts as one action line, the stop reason, enhancing XP", async () => {
    const { startEnhanceRun } = await import("./enhancement_run");
    const storage = createMemoryStorage();
    const user = await storage.findOrCreateGuestUser("offline-enh");
    const state = (await storage.getOrCreatePlayerState(user.id, pack.version || "1.0.0")) as EnhancedPlayerState;
    state.lastSimulatedAt = T0.toISOString();
    state.inventory.weapon_wooden_sword = 1;
    state.equipment.main_hand = "weapon_wooden_sword";
    state.inventory.lumber_1 = 100;
    state.inventory.gold = 10_000;
    assert.equal(startEnhanceRun(state, pack, { itemId: "weapon_wooden_sword", targetLevel: 3 }, T0).ok, true);
    const before = snapshotForReport(state);
    const to = new Date(T0.getTime() + 3600_000);
    const after = simulateToNow({ state, now: to, contentPack: pack, rng: () => 0 }).state as EnhancedPlayerState;
    const report = buildOfflineReport(before, after, pack, T0, to);
    assert.deepEqual(report.actions.find((a) => a.name.startsWith("强化 木头短剑")), { name: "强化 木头短剑（现在 +3）", count: 3 });
    assert.ok(report.stopped && report.stopped.includes("达到目标 +3"), report.stopped);
    assert.equal(report.running, undefined);
    assert.ok(report.skills.some((s) => s.skillId === "skill_enhancing" && s.xp > 0));
    // a run that is still going shows as running instead
    const live = (await storage.getOrCreatePlayerState((await storage.findOrCreateGuestUser("offline-enh2")).id, pack.version || "1.0.0")) as EnhancedPlayerState;
    live.lastSimulatedAt = T0.toISOString();
    live.inventory.weapon_wooden_sword = 1;
    live.inventory.lumber_1 = 100_000;
    live.inventory.gold = 100_000_000;
    assert.equal(startEnhanceRun(live, pack, { itemId: "weapon_wooden_sword", targetLevel: 20 }, T0).ok, true);
    const liveBefore = snapshotForReport(live);
    const liveAfter = simulateToNow({ state: live, now: new Date(T0.getTime() + 10 * 60_000), contentPack: pack, rng: () => 1 }).state as EnhancedPlayerState;
    const liveReport = buildOfflineReport(liveBefore, liveAfter, pack, T0, new Date(T0.getTime() + 10 * 60_000));
    assert.equal(liveReport.running, "强化：木头短剑 → 目标 +20");
    assert.equal(liveReport.stopped, undefined);
    await storage.close();
  });

  it("reports a still-running infinite action and no stop reason", async () => {
    const storage = createMemoryStorage();
    const user = await storage.findOrCreateGuestUser("offline-2");
    let state = (await storage.getOrCreatePlayerState(user.id, pack.version || "1.0.0")) as EnhancedPlayerState;
    state = await storage.startLifeAction({ userId: user.id, actionId: "act_chop_wood_t1", now: T0, contentPack: pack }) as EnhancedPlayerState;
    const before = snapshotForReport(state);
    const to = new Date(T0.getTime() + 10 * 60_000);
    const after = simulateToNow({ state, now: to, contentPack: pack, rng: () => 0.99 }).state as EnhancedPlayerState;
    const report = buildOfflineReport(before, after, pack, T0, to);
    assert.equal(report.running, "砍伐小白杨");
    assert.equal(report.stopped, undefined);
    assert.equal(report.items[0]?.itemId, "wood_1");
    assert.equal(report.items[0]?.qty, 120);
    await storage.close();
  });

  it("has no content when nothing happened while idle", async () => {
    const storage = createMemoryStorage();
    const user = await storage.findOrCreateGuestUser("offline-3");
    const state = (await storage.getOrCreatePlayerState(user.id, pack.version || "1.0.0")) as EnhancedPlayerState;
    const before = snapshotForReport(state);
    const to = new Date(T0.getTime() + 60 * 60_000);
    const after = simulateToNow({ state, now: to, contentPack: pack }).state as EnhancedPlayerState;
    assert.equal(reportHasContent(buildOfflineReport(before, after, pack, T0, to)), false);
    await storage.close();
  });
});
