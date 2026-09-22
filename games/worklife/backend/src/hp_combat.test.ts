import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createMemoryStorage } from "./storage_memory";
import enhancedContentPack from "../../shared/enhanced_content_pack_chinese.json";
import type { EnhancedContentPack } from "./types";
import { HEAVY_CHOP_COOLDOWN_MS, startHpCombat, tryHeavyChop, chooseBuild, setCombatLoadout } from "./hp_combat";
import { tickHpCombat } from "./hp_combat";

const contentPack = enhancedContentPack as EnhancedContentPack;

async function armedWoodcutter(options: { withChest?: boolean } = { withChest: true }) {
  const storage = createMemoryStorage();
  const user = await storage.findOrCreateGuestUser(`hp-${Math.random()}`);
  const state = await storage.getOrCreatePlayerState(user.id, contentPack.version || "1.0.0");
  state.inventory.weapon_wooden_sword = 1;
  (state.equipment as { main_hand?: string; chest?: string }).main_hand = "weapon_wooden_sword";
  if (options.withChest !== false) {
    state.inventory.armor_wood_chest = 1;
    (state.equipment as { main_hand?: string; chest?: string }).chest = "armor_wood_chest";
  }
  await storage.savePlayerState(user.id, state);
  return { storage, user, state };
}

describe("woodcutter HP combat", () => {
  it("lets a sword-only player win slime without boss phases and leaves unarmed players losing", async () => {
    const { storage, state } = await armedWoodcutter({ withChest: false });
    const t0 = new Date("2026-09-02T00:00:00.000Z");
    state.hpCombat = startHpCombat(state, contentPack, "slime", t0);
    tickHpCombat(state, contentPack, new Date(t0.getTime() + 45_000), 45_000);
    assert.equal(state.hpCombat?.outcome, "win");
    assert.equal(state.hpCombat?.guardActive, false);
    assert.equal(state.hpCombat?.wrathActive, false);
    assert.equal(state.hpCombat?.log.some((line) => line.includes("森林管家")), false);
    assert.ok((state.inventory.gold || 0) >= 10);
    await storage.close();

    const storage2 = createMemoryStorage();
    const u2 = await storage2.findOrCreateGuestUser("bare");
    const naked = await storage2.getOrCreatePlayerState(u2.id, contentPack.version || "1.0.0");
    naked.hpCombat = startHpCombat(naked, contentPack, "slime", t0);
    tickHpCombat(naked, contentPack, new Date(t0.getTime() + 45_000), 45_000);
    assert.equal(naked.hpCombat?.outcome, "loss");
    await storage2.close();
  });

  it("rejects heavy chop while on cooldown and ignores client damage", async () => {
    const { storage, state } = await armedWoodcutter();
    const t0 = new Date("2026-09-02T00:00:00.000Z");
    state.hpCombat = startHpCombat(state, contentPack, "slime", t0);
    const first = tryHeavyChop(state, contentPack, t0);
    assert.equal(first.ok, true);
    const hpAfter = state.hpCombat!.enemyHp;
    const second = tryHeavyChop(state, contentPack, t0);
    assert.equal(second.ok, false);
    assert.equal(second.error, "cooldown");
    assert.equal(state.hpCombat!.enemyHp, hpAfter);
    const later = tryHeavyChop(state, contentPack, new Date(t0.getTime() + HEAVY_CHOP_COOLDOWN_MS));
    assert.equal(later.ok, true);
    assert.ok(state.hpCombat!.enemyHp < hpAfter);
    await storage.close();
  });

  it("triggers Forest Boss guard then wrath", async () => {
    const { storage, state } = await armedWoodcutter();
    chooseBuild(state, "thick_bark");
    state.abilityLoadout = []; // manual-only: the boss mechanics are tested without auto-cast
    const t0 = new Date("2026-09-02T00:00:00.000Z");
    state.hpCombat = startHpCombat(state, contentPack, "forest_boss", t0);
    const max = state.hpCombat!.enemyMaxHp;
    state.hpCombat!.enemyHp = Math.floor(max * 0.59);
    tickHpCombat(state, contentPack, new Date(t0.getTime() + 50), 50);
    assert.equal(state.hpCombat?.guardActive, true);
    const chopped = tryHeavyChop(state, contentPack, t0);
    assert.equal(chopped.ok, true);
    assert.equal(state.hpCombat?.guardActive, false);
    state.hpCombat!.enemyHp = Math.floor(max * 0.25);
    tickHpCombat(state, contentPack, new Date(t0.getTime() + 100), 50);
    assert.equal(state.hpCombat?.wrathActive, true);
    assert.ok((state.hpCombat?.enemyIntervalMs || 9999) < state.hpCombat!.enemyBaseIntervalMs);
    await storage.close();
  });

  it("telegraphs the guard before 60% and never punishes a heavy chop that crosses the threshold", async () => {
    const { storage, state } = await armedWoodcutter();
    state.abilityLoadout = [];
    const t0 = new Date("2026-09-02T00:00:00.000Z");
    state.hpCombat = startHpCombat(state, contentPack, "forest_boss", t0);
    const max = state.hpCombat!.enemyMaxHp;
    state.hpCombat!.enemyHp = Math.floor(max * 0.64);
    tickHpCombat(state, contentPack, new Date(t0.getTime() + 1), 1);
    assert.equal(state.hpCombat?.guardActive, false);
    assert.ok(state.hpCombat!.log.some((l) => l.includes("蓄力举盾")), "telegraph line logged");
    // Heavy chop from 64% lands well below 60%: the guard is raised and shattered in the same swing.
    const chopped = tryHeavyChop(state, contentPack, t0);
    assert.equal(chopped.ok, true);
    assert.ok(state.hpCombat!.enemyHp / max < 0.6);
    assert.equal(state.hpCombat?.guardActive, false);
    assert.equal(state.hpCombat?.guardUsed, true);
    assert.ok(state.hpCombat!.log.some((l) => l.includes("震碎")));
    // The guard does not come back later in the fight.
    tickHpCombat(state, contentPack, new Date(t0.getTime() + 3001), 3000);
    assert.equal(state.hpCombat?.guardActive, false);
    await storage.close();
  });

  it("grants the advertised rare drop on win and records it on the encounter", async () => {
    const { storage, state } = await armedWoodcutter();
    const t0 = new Date("2026-09-02T00:00:00.000Z");
    state.hpCombat = startHpCombat(state, contentPack, "slime", t0);
    tickHpCombat(state, contentPack, new Date(t0.getTime() + 45_000), 45_000, () => 0);
    assert.equal(state.hpCombat?.outcome, "win");
    // rng 0 hits every roll: the advertised rare plus the slime's ability-book drop table
    assert.deepEqual(state.hpCombat?.drops, [
      { itemId: "crystal_1", name: "微光水晶", qty: 1 },
      { itemId: "book_smash", name: "技能书：猛击", qty: 1 },
    ]);
    assert.equal(state.inventory.crystal_1, 1);
    assert.equal(state.inventory.book_smash, 1);
    assert.ok(state.logs.at(-1)?.text.includes("掉落 微光水晶 ×1"));
    await storage.close();

    const miss = await armedWoodcutter();
    miss.state.hpCombat = startHpCombat(miss.state, contentPack, "slime", t0);
    tickHpCombat(miss.state, contentPack, new Date(t0.getTime() + 45_000), 45_000, () => 0.99);
    assert.equal(miss.state.hpCombat?.outcome, "win");
    assert.deepEqual(miss.state.hpCombat?.drops, []);
    assert.equal(miss.state.inventory.crystal_1, undefined);
    await miss.storage.close();
  });

  it("eats the food slot when missing HP reaches the trigger, once per 30s, and reports it", async () => {
    const { storage, state } = await armedWoodcutter({ withChest: false });
    state.inventory.food_simple = 2; // heals 50
    assert.equal(setCombatLoadout(state, contentPack, { food: [{ itemId: "food_simple", triggerMissingHp: 20 }] }).ok, true);
    const t0 = new Date("2026-09-02T00:00:00.000Z");
    state.hpCombat = startHpCombat(state, contentPack, "forest_boss", t0); // boss hits for 8 unarmored
    // Unarmored vs boss without food we lose; with two bites we survive longer and both bites are used ≥30s apart.
    // Boss hits for 8 every 3.5s: at 10.5s the player is missing 24 → eat; a second bite can only
    // happen after the 30s cooldown (40.5s), by which time an unarmored player is already down.
    tickHpCombat(state, contentPack, new Date(t0.getTime() + 12_000), 12_000, () => 0.99);
    const eaten = state.hpCombat!.consumed?.find((c) => c.itemId === "food_simple");
    assert.equal(eaten?.qty, 1, "ate exactly once so far");
    assert.ok(state.hpCombat!.log.some((l) => l.includes("吃了 简单料理，恢复 50 生命")));
    assert.equal(state.inventory.food_simple, 1);
    assert.equal(state.hpCombat!.playerHp, 50, "healed back to full (26 + 50 capped)");
    tickHpCombat(state, contentPack, new Date(t0.getTime() + 60_000), 48_000, () => 0.99);
    assert.equal(state.hpCombat!.consumed?.find((c) => c.itemId === "food_simple")?.qty, 1, "cooldown blocked a second bite");
    await storage.close();
  });

  it("drinks the drink slot at fight start and applies its buff stats to the first swing", async () => {
    const { storage, state } = await armedWoodcutter();
    state.inventory.potion_battle_fury = 1; // +20 atk buff
    assert.equal(setCombatLoadout(state, contentPack, { drink: [{ itemId: "potion_battle_fury" }] }).ok, true);
    const t0 = new Date("2026-09-02T00:00:00.000Z");
    state.hpCombat = startHpCombat(state, contentPack, "slime", t0);
    assert.equal(state.inventory.potion_battle_fury, undefined, "drank at start");
    assert.deepEqual(state.hpCombat!.consumed, [{ itemId: "potion_battle_fury", name: "狂战药剂", qty: 1 }]);
    tickHpCombat(state, contentPack, new Date(t0.getTime() + 3_000), 3_000, () => 0.99);
    // sword 5 + set bonus 5 + base 5 = 15 atk, + fury 20 = 35, minus floor(4/2) = 33 per hit (13 without the drink)
    assert.ok(state.hpCombat!.log.some((l) => l.includes("普通攻击造成 33 伤害")), state.hpCombat!.log.join(" | "));
    await storage.close();
  });

  it("auto-repeat rolls into the next fight after the intermission, including offline catch-up", async () => {
    const { storage, state } = await armedWoodcutter();
    setCombatLoadout(state, contentPack, { autoRepeat: true });
    const t0 = new Date("2026-09-02T00:00:00.000Z");
    state.hpCombat = startHpCombat(state, contentPack, "slime", t0);
    // sword+chest hits slime for 13; 重劈 auto-casts for 28 at 0s and 8s: 28+13+13+28 = 82 ≥ 80,
    // so a kill lands at 8s, +3s intermission → 11s per cycle. 100s = 9 full cycles + 1s into the tenth.
    tickHpCombat(state, contentPack, new Date(t0.getTime() + 100_000), 100_000, () => 0.99);
    assert.equal(state.stats?.killsByMonster?.slime, 9);
    assert.equal(state.hpCombat?.streak, 9);
    assert.equal(state.hpCombat?.outcome, undefined, "tenth fight in progress");
    assert.ok(state.hpCombat!.log.some((l) => l.includes("连续战斗 · 第 10 场")));
    assert.ok((state.inventory.gold || 0) >= 90, "nine wins paid out");
    await storage.close();
  });

  it("keeps MWI battle statistics for the whole auto-repeat run: kills, xp, gold, loot", async () => {
    const { storage, state } = await armedWoodcutter();
    setCombatLoadout(state, contentPack, { autoRepeat: true });
    const t0 = new Date("2026-09-02T00:00:00.000Z");
    state.hpCombat = startHpCombat(state, contentPack, "slime", t0);
    assert.deepEqual(state.hpCombat!.runStats, { startedAt: t0.getTime(), kills: 0, xp: 0, gold: 0, loot: {} });
    // rng 0 → every drop lands: each slime win adds crystal_1 + book_smash
    tickHpCombat(state, contentPack, new Date(t0.getTime() + 100_000), 100_000, () => 0);
    const run = state.hpCombat!.runStats!;
    assert.equal(run.startedAt, t0.getTime(), "the tally started with the first fight, not the current one");
    assert.equal(run.kills, 9);
    assert.equal(run.xp, 90);
    assert.equal(run.gold, 90);
    assert.deepEqual(run.loot, { crystal_1: 9, book_smash: 9 });
    await storage.close();
  });

  it("a defeat during auto-repeat respawns after 30s and continues the run (MWI), counting deaths", async () => {
    const { storage, state } = await armedWoodcutter({ withChest: false });
    state.abilityLoadout = [];
    setCombatLoadout(state, contentPack, { autoRepeat: true });
    const t0 = new Date("2026-09-02T00:00:00.000Z");
    state.hpCombat = startHpCombat(state, contentPack, "forest_boss", t0); // unarmored sword-only loses to the boss
    tickHpCombat(state, contentPack, new Date(t0.getTime() + 60_000), 60_000, () => 0.99);
    // sword-only: boss hits 8 every 3.5s → 50 HP gone after the 7th hit at 24.5s; respawn timer 30s → 54.5s
    assert.equal(state.stats?.totalDeaths, 1);
    assert.equal(state.hpCombat?.outcome, undefined, "second attempt already running at 60s");
    assert.equal(state.hpCombat?.deaths, 1);
    assert.equal(state.hpCombat?.streak, 0);
    assert.ok(state.hpCombat!.log.some((l) => l.includes("重生完毕")), state.hpCombat!.log.join(" | "));
    // without auto-repeat a loss is final and has no respawn timer
    const { storage: s2, state: st2 } = await armedWoodcutter({ withChest: false });
    st2.abilityLoadout = [];
    st2.hpCombat = startHpCombat(st2, contentPack, "forest_boss", t0);
    tickHpCombat(st2, contentPack, new Date(t0.getTime() + 60_000), 60_000, () => 0.99);
    assert.equal(st2.hpCombat?.outcome, "loss");
    assert.equal(st2.hpCombat?.nextFightAt, undefined);
    await storage.close(); await s2.close();
  });

  it("simulateToNow keeps ticking a won fight that auto-repeat is about to restart", async () => {
    const { storage, state } = await armedWoodcutter();
    setCombatLoadout(state, contentPack, { autoRepeat: true });
    const t0 = new Date("2026-09-02T00:00:00.000Z");
    state.lastSimulatedAt = t0.toISOString();
    state.hpCombat = startHpCombat(state, contentPack, "slime", t0);
    const { simulateToNow } = await import("./storage");
    // First poll lands right after the win (8s fight with auto 重劈): outcome win, nextFightAt set, no new fight yet.
    let s = simulateToNow({ state, now: new Date(t0.getTime() + 9_000), contentPack, rng: () => 0.99 }).state as typeof state;
    assert.equal(s.hpCombat?.outcome, "win");
    assert.equal(s.hpCombat?.nextFightAt, t0.getTime() + 11_000);
    // A later poll (client polls once a second, or 15s in the background) must restart the fight.
    s = simulateToNow({ state: s, now: new Date(t0.getTime() + 15_000), contentPack, rng: () => 0.99 }).state as typeof state;
    assert.equal(s.hpCombat?.outcome, undefined, "second fight running");
    assert.equal(s.hpCombat?.streak, 1);
    await storage.close();
  });

  it("enrages a fight that drags on: +10% monster damage per 3 minutes, capped at 10 stacks", async () => {
    const { storage, state } = await armedWoodcutter({ withChest: false });
    const t0 = new Date("2026-09-02T00:00:00.000Z");
    state.hpCombat = startHpCombat(state, contentPack, "forest_boss", t0); // boss atk 8, interval 3.5s, boss enrage every 10 min
    // Freeze the fight so only the timer moves: nobody can die.
    state.hpCombat.enemyHp = 1_000_000; state.hpCombat.enemyMaxHp = 1_000_000;
    state.hpCombat.playerHp = 1_000_000; state.hpCombat.playerMaxHp = 1_000_000;
    tickHpCombat(state, contentPack, new Date(t0.getTime() + 60_000), 60_000, () => 0.99);
    assert.equal(state.hpCombat!.enrageStacks, 0);
    const hitBefore = state.hpCombat!.log.filter((l) => l.includes("森林管家(BOSS) 造成")).pop();
    assert.ok(hitBefore?.includes("造成 8 伤害"), hitBefore);
    // Boss: first stack at 10 minutes. Tick to 9:59 then cross the line by 2 seconds so the log is still visible.
    for (let i = 2; i <= 9; i++) tickHpCombat(state, contentPack, new Date(t0.getTime() + i * 60_000), 60_000, () => 0.99);
    tickHpCombat(state, contentPack, new Date(t0.getTime() + 599_000), 59_000, () => 0.99);
    tickHpCombat(state, contentPack, new Date(t0.getTime() + 602_000), 3_000, () => 0.99);
    assert.equal(state.hpCombat!.enrageStacks, 1);
    assert.ok(state.hpCombat!.log.some((l) => l.includes("狂暴了！伤害 +10%")), state.hpCombat!.log.join(" | "));
    // 8 × 1.1 = 8.8 → floor 8 still; at 3 stacks 8 × 1.3 = 10.4 → 10
    for (let i = 11; i <= 31; i++) tickHpCombat(state, contentPack, new Date(t0.getTime() + i * 60_000), 60_000, () => 0.99);
    assert.equal(state.hpCombat!.enrageStacks, 3);
    const hitAfter = state.hpCombat!.log.filter((l) => l.includes("森林管家(BOSS) 造成")).pop();
    assert.ok(hitAfter?.includes("造成 10 伤害"), hitAfter);
    // normal monsters: 3-minute interval, capped at 10 stacks after 30+ minutes
    const { storage: s2, state: st2 } = await armedWoodcutter();
    st2.hpCombat = startHpCombat(st2, contentPack, "slime", t0);
    st2.hpCombat.enemyHp = 1_000_000; st2.hpCombat.enemyMaxHp = 1_000_000;
    st2.hpCombat.playerHp = 1_000_000; st2.hpCombat.playerMaxHp = 1_000_000;
    for (let i = 1; i <= 40; i++) tickHpCombat(st2, contentPack, new Date(t0.getTime() + i * 60_000), 60_000, () => 0.99);
    assert.equal(st2.hpCombat!.enrageStacks, 10);
    await storage.close(); await s2.close();
  });

  it("rare find multiplies the base drop chance instead of adding to it", async () => {
    const { storage, state } = await armedWoodcutter();
    const { getRareFindMultiplier } = await import("./storage");
    assert.equal(getRareFindMultiplier(state, contentPack), 1);
    // fake a rare-find buff of +10%
    state.activeBuffs = [{ id: "rf", name: "rf", sourceItemId: "x", expiresAt: new Date(Date.now() + 3600_000).toISOString(), multipliers: {}, stats: {} } as any];
    (state.activeBuffs[0] as any).rareFind = 10; // not wired through buffs (buffs expose multipliers/stats only) → still 1
    assert.equal(getRareFindMultiplier(state, contentPack), 1);
    // equipment stat path: pretend the chest has rareFind 10 via a pack clone
    const packClone = JSON.parse(JSON.stringify(contentPack));
    packClone.items.find((i: any) => i.id === "armor_wood_chest").rareFind = 10;
    assert.equal(Math.round(getRareFindMultiplier(state, packClone) * 100) / 100, 1.1);
    // slime rare 50% → 55% with +10%: rng 0.52 misses at 1.0, hits at 1.1
    const t0 = new Date("2026-09-02T00:00:00.000Z");
    state.hpCombat = startHpCombat(state, packClone, "slime", t0);
    tickHpCombat(state, packClone, new Date(t0.getTime() + 45_000), 45_000, () => 0.52);
    assert.equal(state.hpCombat?.outcome, "win");
    assert.equal(state.hpCombat?.drops?.length, 1, "0.52 < 0.55");
    await storage.close();
  });

  it("pouch accessories add food/drink slots (1 base, capped at 3) and extra slots are actually eaten from", async () => {
    const { storage, state } = await armedWoodcutter({ withChest: false });
    const { combatSlotCounts } = await import("./hp_combat");
    assert.deepEqual(combatSlotCounts(state, contentPack), { food: 1, drink: 1 });
    state.inventory.accessory_pouch_small = 1;
    (state.equipment as any).accessory1 = "accessory_pouch_small";
    assert.deepEqual(combatSlotCounts(state, contentPack), { food: 2, drink: 2 });
    state.inventory.food_simple = 5;
    state.inventory.potion_hp_t1 = 5;
    const set = setCombatLoadout(state, contentPack, {
      food: [{ itemId: "food_simple", triggerMissingHp: 20 }, { itemId: "potion_hp_t1", triggerMissingHp: 30 }],
    });
    assert.equal(set.ok, true);
    assert.equal(state.combatLoadout!.food.length, 2, "second food slot kept");
    const t0 = new Date("2026-09-02T00:00:00.000Z");
    state.hpCombat = startHpCombat(state, contentPack, "forest_boss", t0);
    // slot 1 eats at 10.5s (missing 24 ≥ 20); slot 2 needs missing ≥ 30, reached at 24.5s while slot 1 is still cooling down
    tickHpCombat(state, contentPack, new Date(t0.getTime() + 30_000), 30_000, () => 0.99);
    const consumed = state.hpCombat!.consumed || [];
    assert.ok(consumed.some((c) => c.itemId === "food_simple"), "slot 1 ate");
    assert.ok(consumed.some((c) => c.itemId === "potion_hp_t1"), "slot 2 ate (independent cooldown)");
    // without the pouch the second slot is dropped
    (state.equipment as any).accessory1 = undefined;
    setCombatLoadout(state, contentPack, { food: [{ itemId: "food_simple" }, { itemId: "potion_hp_t1" }] });
    assert.equal(state.combatLoadout!.food.length, 1);
    await storage.close();
  });

  it("rejects non-food in the food slot and non-buff items in the drink slot", async () => {
    const { storage, state } = await armedWoodcutter();
    assert.equal(setCombatLoadout(state, contentPack, { food: [{ itemId: "wood_1" }] }).ok, false);
    assert.equal(setCombatLoadout(state, contentPack, { drink: [{ itemId: "lumber_1" }] }).ok, false);
    assert.equal(setCombatLoadout(state, contentPack, { food: [{ itemId: "potion_hp_t1", triggerMissingHp: 40 }], drink: [{ itemId: "food_simple" }] }).ok, true);
    assert.deepEqual(state.combatLoadout, { food: [{ itemId: "potion_hp_t1", triggerMissingHp: 40 }], drink: [{ itemId: "food_simple" }], autoRepeat: false });
    await storage.close();
  });

  it("locks the build choice to a single pick", async () => {
    const { storage, state } = await armedWoodcutter();
    assert.equal(chooseBuild(state, "sharpened_edge").ok, true);
    assert.equal(chooseBuild(state, "thick_bark").ok, false);
    assert.equal(state.chapter1Build, "sharpened_edge");
    await storage.close();
  });
});
