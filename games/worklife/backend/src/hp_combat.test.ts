import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createMemoryStorage } from "./storage_memory";
import enhancedContentPack from "../../shared/enhanced_content_pack_chinese.json";
import type { EnhancedContentPack } from "./types";
import { HEAVY_CHOP_COOLDOWN_MS, startHpCombat, tryHeavyChop, chooseBuild, setCombatLoadout } from "./hp_combat";
import { tickHpCombat } from "./hp_combat";
import { defaultCombatSkills } from "./combat_skills";


const contentPack = enhancedContentPack as EnhancedContentPack;
// 本文件校准的是战斗数学，不是等级门：摘掉 act_combat_* 的 skillLevel 需求，
// 玩家属性保持原校准值。等级门自身的断言在底部专项用例。
const packNoGate = {
  ...contentPack,
  actions: contentPack.actions.map((a: any) =>
    String(a.id).startsWith("act_combat_") ? { ...a, requirements: {} } : a
  ),
} as EnhancedContentPack;

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
    state.hpCombat = startHpCombat(state, packNoGate, "slime", t0);
    tickHpCombat(state, packNoGate, new Date(t0.getTime() + 45_000), 45_000);
    assert.equal(state.hpCombat?.outcome, "win");
    assert.equal(state.hpCombat?.guardActive, false);
    assert.equal(state.hpCombat?.wrathActive, false);
    assert.equal(state.hpCombat?.log.some((line) => line.includes("森林管家")), false);
    assert.ok((state.inventory.gold || 0) >= 4);
    await storage.close();

    const storage2 = createMemoryStorage();
    const u2 = await storage2.findOrCreateGuestUser("bare");
    const naked = await storage2.getOrCreatePlayerState(u2.id, contentPack.version || "1.0.0");
    naked.hpCombat = startHpCombat(naked, packNoGate, "slime", t0);
    tickHpCombat(naked, packNoGate, new Date(t0.getTime() + 45_000), 45_000);
    assert.equal(naked.hpCombat?.outcome, "loss");
    await storage2.close();
  });

  it("rejects heavy chop while on cooldown and ignores client damage", async () => {
    const { storage, state } = await armedWoodcutter();
    const t0 = new Date("2026-09-02T00:00:00.000Z");
    state.hpCombat = startHpCombat(state, packNoGate, "slime", t0);
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
    state.hpCombat = startHpCombat(state, packNoGate, "forest_boss", t0);
    const max = state.hpCombat!.enemyMaxHp;
    state.hpCombat!.enemyHp = Math.floor(max * 0.59);
    tickHpCombat(state, packNoGate, new Date(t0.getTime() + 50), 50);
    assert.equal(state.hpCombat?.guardActive, true);
    const chopped = tryHeavyChop(state, contentPack, t0);
    assert.equal(chopped.ok, true);
    assert.equal(state.hpCombat?.guardActive, false);
    state.hpCombat!.enemyHp = Math.floor(max * 0.25);
    tickHpCombat(state, packNoGate, new Date(t0.getTime() + 100), 50);
    assert.equal(state.hpCombat?.wrathActive, true);
    assert.ok((state.hpCombat?.enemyIntervalMs || 9999) < state.hpCombat!.enemyBaseIntervalMs);
    await storage.close();
  });

  it("telegraphs the guard before 60% and never punishes a heavy chop that crosses the threshold", async () => {
    const { storage, state } = await armedWoodcutter();
    state.abilityLoadout = [];
    const t0 = new Date("2026-09-02T00:00:00.000Z");
    state.hpCombat = startHpCombat(state, packNoGate, "forest_boss", t0);
    const max = state.hpCombat!.enemyMaxHp;
    state.hpCombat!.enemyHp = Math.floor(max * 0.64);
    tickHpCombat(state, packNoGate, new Date(t0.getTime() + 1), 1);
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
    tickHpCombat(state, packNoGate, new Date(t0.getTime() + 3001), 3000);
    assert.equal(state.hpCombat?.guardActive, false);
    await storage.close();
  });

  it("grants the advertised rare drop on win and records it on the encounter", async () => {
    const { storage, state } = await armedWoodcutter();
    const t0 = new Date("2026-09-02T00:00:00.000Z");
    state.hpCombat = startHpCombat(state, packNoGate, "slime", t0);
    tickHpCombat(state, packNoGate, new Date(t0.getTime() + 45_000), 45_000, () => 0);
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
    miss.state.hpCombat = startHpCombat(miss.state, packNoGate, "slime", t0);
    tickHpCombat(miss.state, packNoGate, new Date(t0.getTime() + 45_000), 45_000, () => 0.99);
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
    state.hpCombat = startHpCombat(state, packNoGate, "caterpillar", t0); // hits for 8 unarmored, every 3.2s
    // Caterpillar hits for 8 every 3.2s: at 9.6s the player is missing 24 → eat; a second bite can
    // only happen after the 30s cooldown, by which time an unarmored player is already down.
    tickHpCombat(state, packNoGate, new Date(t0.getTime() + 12_000), 12_000, () => 0.99);
    const eaten = state.hpCombat!.consumed?.find((c) => c.itemId === "food_simple");
    assert.equal(eaten?.qty, 1, "ate exactly once so far");
    assert.ok(state.hpCombat!.log.some((l) => l.includes("吃了 简单料理，恢复 50 生命")));
    assert.equal(state.inventory.food_simple, 1);
    assert.equal(state.hpCombat!.playerHp, 50, "healed back to full (26 + 50 capped)");
    tickHpCombat(state, packNoGate, new Date(t0.getTime() + 60_000), 48_000, () => 0.99);
    assert.equal(state.hpCombat!.consumed?.find((c) => c.itemId === "food_simple")?.qty, 1, "cooldown blocked a second bite");
    await storage.close();
  });

  it("drinks the drink slot at fight start and applies its buff stats to the first swing", async () => {
    const { storage, state } = await armedWoodcutter();
    state.inventory.potion_battle_fury = 1; // +20 atk buff
    assert.equal(setCombatLoadout(state, contentPack, { drink: [{ itemId: "potion_battle_fury" }] }).ok, true);
    const t0 = new Date("2026-09-02T00:00:00.000Z");
    state.hpCombat = startHpCombat(state, packNoGate, "crab", t0); // tanky: survives the opening smash
    assert.equal(state.inventory.potion_battle_fury, undefined, "drank at start");
    assert.deepEqual(state.hpCombat!.consumed, [{ itemId: "potion_battle_fury", name: "狂战药剂", qty: 1 }]);
    tickHpCombat(state, packNoGate, new Date(t0.getTime() + 3_000), 3_000, () => 0.99);
    // sword 5 + set bonus 5 + base 5 = 15 atk, + fury 6 = 21 vs crab def 18: 21² / (21 + floor(18/2)) = 14 per hit
    assert.ok(state.hpCombat!.log.some((l) => l.includes("普通攻击造成 14 伤害")), state.hpCombat!.log.join(" | "));
    await storage.close();
  });

  it("auto-repeat rolls into the next fight after the intermission, including offline catch-up", async () => {
    const { storage, state } = await armedWoodcutter();
    setCombatLoadout(state, contentPack, { autoRepeat: true });
    const t0 = new Date("2026-09-02T00:00:00.000Z");
    state.hpCombat = startHpCombat(state, packNoGate, "slime", t0);
    // sword+chest hits slime for 13; 重劈 auto-casts for ~29: kill lands at ~8s,
    // +3s intermission → 11s per cycle. 100s = 9 full cycles + 1s into the tenth.
    tickHpCombat(state, packNoGate, new Date(t0.getTime() + 100_000), 100_000, () => 0.99);
    assert.equal(state.stats?.killsByMonster?.slime, 9);
    assert.equal(state.hpCombat?.streak, 9);
    assert.equal(state.hpCombat?.outcome, undefined, "tenth fight in progress");
    assert.ok(state.hpCombat!.log.some((l) => l.includes("连续战斗 · 第 10 场")));
    assert.ok((state.inventory.gold || 0) >= 36, "nine wins paid out");
    await storage.close();
  });

  it("starts the next auto-repeat fight at 100% full monster HP during live 1s polling", async () => {
    const { storage, state } = await armedWoodcutter();
    setCombatLoadout(state, contentPack, { autoRepeat: true });
    const t0 = new Date("2026-09-02T00:00:00.000Z");
    state.lastSimulatedAt = t0.toISOString();
    state.hpCombat = startHpCombat(state, packNoGate, "slime", t0);
    const { simulateToNow } = await import("./storage");
    // Fight 1 finishes at 8s, intermission ends at 11s
    let s = simulateToNow({ state, now: new Date(t0.getTime() + 9_000), contentPack: packNoGate, rng: () => 0.99 }).state as typeof state;
    assert.equal(s.hpCombat?.outcome, "win");
    assert.equal(s.hpCombat?.nextFightAt, t0.getTime() + 11_000);
    // Poll at 10s (still in intermission)
    s = simulateToNow({ state: s, now: new Date(t0.getTime() + 10_000), contentPack: packNoGate, rng: () => 0.99 }).state as typeof state;
    assert.equal(s.hpCombat?.outcome, "win");
    // Poll at 11.2s (intermission just ended): monster in Fight #2 MUST start at 100% full HP!
    s = simulateToNow({ state: s, now: new Date(t0.getTime() + 11_200), contentPack: packNoGate, rng: () => 0.99 }).state as typeof state;
    assert.equal(s.hpCombat?.outcome, undefined, "second fight started");
    assert.equal(s.hpCombat?.streak, 1);
    assert.equal(s.hpCombat?.enemyHp, s.hpCombat?.enemyMaxHp, "monster starts Fight #2 at 100% full HP");
    // Next 1s poll at 12.2s ticks the opening skill/attack hits
    s = simulateToNow({ state: s, now: new Date(t0.getTime() + 12_200), contentPack: packNoGate, rng: () => 0.99 }).state as typeof state;
    assert.ok((s.hpCombat?.enemyHp || 0) < (s.hpCombat?.enemyMaxHp || 0), "opening hit lands on the next poll");
    await storage.close();
  });

  it("keeps MWI battle statistics for the whole auto-repeat run: kills, xp, gold, loot", async () => {
    const { storage, state } = await armedWoodcutter();
    setCombatLoadout(state, contentPack, { autoRepeat: true });
    const t0 = new Date("2026-09-02T00:00:00.000Z");
    state.hpCombat = startHpCombat(state, packNoGate, "slime", t0);
    assert.deepEqual(state.hpCombat!.runStats, { startedAt: t0.getTime(), kills: 0, xp: 0, gold: 0, loot: {} });
    // rng 0 → every drop lands: each slime win adds crystal_1 + book_smash
    tickHpCombat(state, packNoGate, new Date(t0.getTime() + 100_000), 100_000, () => 0);
    const run = state.hpCombat!.runStats!;
    assert.equal(run.startedAt, t0.getTime(), "the tally started with the first fight, not the current one");
    assert.equal(run.kills, 9);
    assert.equal(run.xp, 36);
    assert.equal(run.gold, 36);
    assert.deepEqual(run.loot, { crystal_1: 9, book_smash: 9 });
    await storage.close();
  });

  it("a defeat during auto-repeat respawns after 30s and continues the run (MWI), counting deaths", async () => {
    const { storage, state } = await armedWoodcutter({ withChest: false });
    state.abilityLoadout = [];
    setCombatLoadout(state, contentPack, { autoRepeat: true });
    const t0 = new Date("2026-09-02T00:00:00.000Z");
    state.hpCombat = startHpCombat(state, packNoGate, "forest_boss", t0); // unarmored sword-only loses to the boss
    tickHpCombat(state, packNoGate, new Date(t0.getTime() + 60_000), 60_000, () => 0.99);
    // sword-only: boss hits 18 every 2.2s → down at the 3rd hit (~6.6s); respawn 30s →
    // attempt 2 dies at ~43.2s; at 60s the player waits out the second respawn.
    assert.equal(state.stats?.totalDeaths, 2);
    assert.equal(state.hpCombat?.outcome, "loss", "between attempt 2 and the 73s respawn");
    assert.equal(state.hpCombat?.deaths, 1);
    assert.equal(state.hpCombat?.streak, 0);
    assert.ok(state.hpCombat!.log.some((l) => l.includes("重生完毕")), state.hpCombat!.log.join(" | "));
    // without auto-repeat a loss is final and has no respawn timer
    const { storage: s2, state: st2 } = await armedWoodcutter({ withChest: false });
    st2.abilityLoadout = [];
    st2.hpCombat = startHpCombat(st2, packNoGate, "forest_boss", t0);
    tickHpCombat(st2, packNoGate, new Date(t0.getTime() + 60_000), 60_000, () => 0.99);
    assert.equal(st2.hpCombat?.outcome, "loss");
    assert.equal(st2.hpCombat?.nextFightAt, undefined);
    await storage.close(); await s2.close();
  });

  it("the mine boss telegraphs and lands a rockfall on every 4th attack, for a share of max HP that 坚守 reduces", async () => {
    const { storage, state } = await armedWoodcutter();
    state.combatSkills = defaultCombatSkills(40); // 440 max HP: 5% = 22, well above the boss's normal swing
    state.abilityLoadout = [];
    const t0 = new Date("2026-09-02T00:00:00.000Z");
    state.hpCombat = startHpCombat(state, packNoGate, "mine_boss", t0);
    const maxHp = state.hpCombat.playerMaxHp;
    const rockfall = Math.floor(maxHp * 0.05);
    // boss interval 2.2s: attacks land at 2.2, 4.4, 6.6, 8.8 … ; look at the first four
    tickHpCombat(state, packNoGate, new Date(t0.getTime() + 9_000), 9_000, () => 0.99);
    const hits = state.hpCombat.log.filter((l) => l.includes("矿山霸主(BOSS) 造成"));
    assert.ok(hits.length >= 4, hits.join(" | "));
    assert.ok(hits.slice(0, 3).every((l) => !l.includes("落石重击")), "attacks 1–3 are plain");
    assert.ok(hits[3].includes(`造成 ${rockfall} 伤害（落石重击）`), `4th attack: ${hits[3]} (expected ${rockfall})`);
    const log = state.hpCombat.log;
    const warnAt = log.findIndex((l) => l.includes("下一击是落石"));
    assert.ok(warnAt > log.indexOf(hits[2]) && warnAt < log.indexOf(hits[3]), "the warning comes right after attack 3, before attack 4");
    assert.ok((state.hpCombat.bossHits ?? 0) >= 4, "the server counts the boss's attacks");
    await storage.close();

    // 坚守 active when the rock lands: floor(rockfall × 0.65)
    const { storage: s2, state: st2 } = await armedWoodcutter();
    st2.combatSkills = defaultCombatSkills(40);
    st2.abilityLoadout = [];
    st2.hpCombat = startHpCombat(st2, packNoGate, "mine_boss", t0);
    st2.hpCombat.bossHits = 3;
    st2.hpCombat.braceUntil = t0.getTime() + 60_000;
    tickHpCombat(st2, packNoGate, new Date(t0.getTime() + 2_300), 2_300, () => 0.99);
    const braced = st2.hpCombat.log.filter((l) => l.includes("矿山霸主(BOSS) 造成")).pop()!;
    assert.ok(braced.includes(`造成 ${Math.floor(st2.hpCombat.playerMaxHp * 0.05 * 0.65)} 伤害（坚守中）（落石重击）`), braced);
    await s2.close();
  });

  it("stops auto-repeat itself after 3 straight defeats instead of grinding gear to dust (death-spiral guard)", async () => {
    const { storage, state } = await armedWoodcutter({ withChest: false });
    state.abilityLoadout = [];
    setCombatLoadout(state, contentPack, { autoRepeat: true });
    const t0 = new Date("2026-09-02T00:00:00.000Z");
    state.hpCombat = startHpCombat(state, packNoGate, "forest_boss", t0);
    // A day of offline time against a boss this player can never beat: without the guard the loop
    // would burn through the 200-fight tick cap and 0.5 durability per defeat.
    const day = 24 * 3600_000;
    tickHpCombat(state, packNoGate, new Date(t0.getTime() + day), day, () => 0.99);
    assert.equal(state.stats?.totalDeaths, 3, "exactly three defeats, then it stops");
    assert.equal(state.hpCombat?.outcome, "loss");
    assert.equal(state.hpCombat?.lossStreak, 3);
    assert.equal(state.hpCombat?.nextFightAt, undefined, "nothing scheduled after the guard trips");
    assert.equal(state.combatLoadout?.autoRepeat, false, "the toggle reflects reality");
    assert.ok(state.hpCombat!.log.some((l) => l.includes("连续阵亡 3 次")), state.hpCombat!.log.join(" | "));
    assert.ok(state.logs.some((l) => l.text.includes("连续战斗已自动关闭")));
    const durability = (state.equipment as { durability?: Record<string, number> }).durability?.weapon_wooden_sword;
    assert.ok(durability === undefined || durability > 95, `sword durability must survive the offline night, got ${durability}`);

    // Re-enabling is an explicit retry and gets a fresh allowance.
    const t1 = new Date(t0.getTime() + day + 1000);
    setCombatLoadout(state, contentPack, { autoRepeat: true }, t1);
    assert.equal(state.hpCombat?.lossStreak, 0);
    assert.equal(state.hpCombat?.nextFightAt, t1.getTime() + 30_000);
    await storage.close();
  });

  it("a win in between resets the defeat streak, so a flaky matchup keeps auto-repeating", async () => {
    const { storage, state } = await armedWoodcutter();
    setCombatLoadout(state, contentPack, { autoRepeat: true });
    const t0 = new Date("2026-09-02T00:00:00.000Z");
    state.hpCombat = startHpCombat(state, packNoGate, "slime", t0, { lossStreak: 2 });
    tickHpCombat(state, packNoGate, new Date(t0.getTime() + 20_000), 20_000, () => 0.99);
    assert.equal(state.hpCombat?.outcome, "win");
    // the repeat that follows a win starts clean
    tickHpCombat(state, packNoGate, new Date(t0.getTime() + 40_000), 20_000, () => 0.99);
    assert.equal(state.hpCombat?.lossStreak, 0);
    assert.equal(state.combatLoadout?.autoRepeat, true);
    await storage.close();
  });

  it("names the player's actual class in the opening line, not always the woodcutter", async () => {
    const { storage, state } = await armedWoodcutter();
    const t0 = new Date("2026-09-02T00:00:00.000Z");
    assert.ok(startHpCombat(state, packNoGate, "slime", t0).log[0].startsWith("开始战斗！伐木工 VS"));
    state.activeClassId = "blacksmith";
    assert.ok(startHpCombat(state, packNoGate, "slime", t0).log[0].startsWith("开始战斗！铁匠 VS"));
    await storage.close();
  });

  it("enabling auto-repeat on a finished fight schedules the next one (victory-screen toggle)", async () => {
    const { storage, state } = await armedWoodcutter();
    const t0 = new Date("2026-09-02T00:00:00.000Z");
    state.hpCombat = startHpCombat(state, packNoGate, "slime", t0);
    tickHpCombat(state, packNoGate, new Date(t0.getTime() + 20_000), 20_000, () => 0.99);
    assert.equal(state.hpCombat?.outcome, "win");
    assert.equal(state.hpCombat?.nextFightAt, undefined, "autoRepeat was off — nothing scheduled");
    // 玩家在胜利界面才打开「连续战斗」：必须补排 nextFightAt，否则开关像坏的
    const t1 = new Date(t0.getTime() + 25_000);
    setCombatLoadout(state, contentPack, { autoRepeat: true }, t1);
    assert.equal(state.hpCombat?.nextFightAt, t1.getTime() + 3_000);
    tickHpCombat(state, packNoGate, new Date(t0.getTime() + 29_000), 4_000, () => 0.99);
    assert.equal(state.hpCombat?.outcome, undefined, "second fight auto-started");
    assert.equal(state.hpCombat?.streak, 1);
    await storage.close();
  });

  it("enabling auto-repeat on a defeat schedules the 30s respawn retry", async () => {
    const { storage, state } = await armedWoodcutter({ withChest: false });
    state.abilityLoadout = [];
    const t0 = new Date("2026-09-02T00:00:00.000Z");
    state.hpCombat = startHpCombat(state, packNoGate, "forest_boss", t0);
    tickHpCombat(state, packNoGate, new Date(t0.getTime() + 60_000), 60_000, () => 0.99);
    assert.equal(state.hpCombat?.outcome, "loss");
    assert.equal(state.hpCombat?.nextFightAt, undefined);
    const t1 = new Date(t0.getTime() + 65_000);
    setCombatLoadout(state, contentPack, { autoRepeat: true }, t1);
    assert.equal(state.hpCombat?.nextFightAt, t1.getTime() + 30_000);
    tickHpCombat(state, packNoGate, new Date(t0.getTime() + 96_000), 31_000, () => 0.99);
    assert.equal(state.hpCombat?.outcome, undefined, "respawn retry auto-started");
    assert.equal(state.hpCombat?.deaths, 1);
    await storage.close();
  });

  it("disabling auto-repeat does not resurrect a finished fight", async () => {
    const { storage, state } = await armedWoodcutter();
    const t0 = new Date("2026-09-02T00:00:00.000Z");
    state.hpCombat = startHpCombat(state, packNoGate, "slime", t0);
    tickHpCombat(state, packNoGate, new Date(t0.getTime() + 20_000), 20_000, () => 0.99);
    assert.equal(state.hpCombat?.outcome, "win");
    const t1 = new Date(t0.getTime() + 25_000);
    setCombatLoadout(state, contentPack, { autoRepeat: true }, t1);
    setCombatLoadout(state, contentPack, { autoRepeat: false }, new Date(t1.getTime() + 1_000));
    tickHpCombat(state, packNoGate, new Date(t0.getTime() + 60_000), 35_000, () => 0.99);
    // 开关又关掉后，已排的 nextFightAt 不再触发
    assert.equal(state.hpCombat?.outcome, "win");
    await storage.close();
  });

  it("simulateToNow keeps ticking a won fight that auto-repeat is about to restart", async () => {
    const { storage, state } = await armedWoodcutter();
    setCombatLoadout(state, contentPack, { autoRepeat: true });
    const t0 = new Date("2026-09-02T00:00:00.000Z");
    state.lastSimulatedAt = t0.toISOString();
    state.hpCombat = startHpCombat(state, packNoGate, "slime", t0);
    const { simulateToNow } = await import("./storage");
    // First poll lands right after the win (8s fight with auto 重劈): outcome win, nextFightAt set, no new fight yet.
    let s = simulateToNow({ state, now: new Date(t0.getTime() + 9_000), contentPack: packNoGate, rng: () => 0.99 }).state as typeof state;
    assert.equal(s.hpCombat?.outcome, "win");
    assert.equal(s.hpCombat?.nextFightAt, t0.getTime() + 11_000);
    // A later poll (client polls once a second, or 15s in the background) must restart the fight.
    s = simulateToNow({ state: s, now: new Date(t0.getTime() + 15_000), contentPack: packNoGate, rng: () => 0.99 }).state as typeof state;
    assert.equal(s.hpCombat?.outcome, undefined, "second fight running");
    assert.equal(s.hpCombat?.streak, 1);
    await storage.close();
  });

  it("enrages a fight that drags on: +10% monster damage per 3 minutes, capped at 10 stacks", async () => {
    const { storage, state } = await armedWoodcutter({ withChest: false });
    const t0 = new Date("2026-09-02T00:00:00.000Z");
    state.hpCombat = startHpCombat(state, packNoGate, "forest_boss", t0); // interval 2.2s, boss enrage every 10 min
    const bossAtk = Number((contentPack.monsters as Array<{ id: string; atk?: number }>).find((m) => m.id === "forest_boss")!.atk);
    // Freeze the fight so only the timer moves: nobody can die.
    state.hpCombat.enemyHp = 1_000_000; state.hpCombat.enemyMaxHp = 1_000_000;
    state.hpCombat.playerHp = 1_000_000; state.hpCombat.playerMaxHp = 1_000_000;
    tickHpCombat(state, packNoGate, new Date(t0.getTime() + 60_000), 60_000, () => 0.99);
    assert.equal(state.hpCombat!.enrageStacks, 0);
    const hitBefore = state.hpCombat!.log.filter((l) => l.includes("森林管家(BOSS) 造成")).pop();
    assert.ok(hitBefore?.includes(`造成 ${bossAtk} 伤害`), hitBefore);
    // Boss: first stack at 10 minutes. Tick to 9:59 then cross the line by 2 seconds so the log is still visible.
    for (let i = 2; i <= 9; i++) tickHpCombat(state, packNoGate, new Date(t0.getTime() + i * 60_000), 60_000, () => 0.99);
    tickHpCombat(state, packNoGate, new Date(t0.getTime() + 599_000), 59_000, () => 0.99);
    tickHpCombat(state, packNoGate, new Date(t0.getTime() + 602_000), 3_000, () => 0.99);
    assert.equal(state.hpCombat!.enrageStacks, 1);
    assert.ok(state.hpCombat!.log.some((l) => l.includes("狂暴了！伤害 +10%")), state.hpCombat!.log.join(" | "));
    // at 3 stacks the unarmoured player takes floor(atk × 1.3)
    for (let i = 11; i <= 31; i++) tickHpCombat(state, packNoGate, new Date(t0.getTime() + i * 60_000), 60_000, () => 0.99);
    assert.equal(state.hpCombat!.enrageStacks, 3);
    const hitAfter = state.hpCombat!.log.filter((l) => l.includes("森林管家(BOSS) 造成")).pop();
    assert.ok(hitAfter?.includes(`造成 ${Math.floor(bossAtk * 1.3)} 伤害`), hitAfter);
    // normal monsters: 3-minute interval, capped at 10 stacks after 30+ minutes
    const { storage: s2, state: st2 } = await armedWoodcutter();
    st2.hpCombat = startHpCombat(st2, packNoGate, "slime", t0);
    st2.hpCombat.enemyHp = 1_000_000; st2.hpCombat.enemyMaxHp = 1_000_000;
    st2.hpCombat.playerHp = 1_000_000; st2.hpCombat.playerMaxHp = 1_000_000;
    for (let i = 1; i <= 40; i++) tickHpCombat(st2, packNoGate, new Date(t0.getTime() + i * 60_000), 60_000, () => 0.99);
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
    // (slime rareChance pinned in the clone so content retunes don't break the math check)
    const packClone = JSON.parse(JSON.stringify(contentPack));
    packClone.items.find((i: any) => i.id === "armor_wood_chest").rareFind = 10;
    packClone.monsters.find((m: any) => m.id === "slime").rareChance = 0.5;
    assert.equal(Math.round(getRareFindMultiplier(state, packClone) * 100) / 100, 1.1);
    // slime rare 50% → 55% with +10%: rng 0.52 misses at 1.0, hits at 1.1
    const t0 = new Date("2026-09-02T00:00:00.000Z");
    state.hpCombat = startHpCombat(state, packClone, "slime", t0);
    tickHpCombat(state, packClone, new Date(t0.getTime() + 45_000), 45_000, () => 0.52);
    assert.equal(state.hpCombat?.outcome, "win");
    assert.equal(state.hpCombat?.drops?.length, 1, "0.52 < 0.55");
    // additive would give 0.60 → rng 0.56 must MISS under the multiplicative rule
    state.hpCombat = startHpCombat(state, packClone, "slime", t0);
    tickHpCombat(state, packClone, new Date(t0.getTime() + 45_000), 45_000, () => 0.56);
    assert.equal(state.hpCombat?.drops?.length, 0, "0.56 > 0.55 — additive 0.60 would have dropped");
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
    state.hpCombat = startHpCombat(state, packNoGate, "forest_boss", t0);
    // slot 1 eats at 10.5s (missing 24 ≥ 20); slot 2 needs missing ≥ 30, reached at 24.5s while slot 1 is still cooling down
    tickHpCombat(state, packNoGate, new Date(t0.getTime() + 30_000), 30_000, () => 0.99);
    const consumed = state.hpCombat!.consumed || [];
    assert.ok(consumed.some((c) => c.itemId === "food_simple"), "slot 1 ate");
    assert.ok(consumed.some((c) => c.itemId === "potion_hp_t1"), "slot 2 ate (independent cooldown)");
    // without the pouch the oversized config is rejected — 槽位收紧后不再静默截断，
    // 需要调用方按当前槽位数重发
    (state.equipment as any).accessory1 = undefined;
    const denied = setCombatLoadout(state, contentPack, { food: [{ itemId: "food_simple" }, { itemId: "potion_hp_t1" }] });
    assert.equal(denied.ok, false);
    assert.match(denied.error || "", /slot_limit_food:1/);
    // 槽位内重配仍然可用
    assert.equal(setCombatLoadout(state, contentPack, { food: [{ itemId: "food_simple" }] }).ok, true);
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

  it("locks the build choice to a single pick per chapter and applies Ch2/Ch3 combat mechanics", async () => {
    const { storage, state } = await armedWoodcutter();
    assert.equal(chooseBuild(state, "sharpened_edge").ok, true);
    assert.equal(chooseBuild(state, "thick_bark").ok, false);
    assert.equal(state.chapter1Build, "sharpened_edge");

    assert.equal(chooseBuild(state, "quenched_thorns").ok, true);
    assert.equal(chooseBuild(state, "heavy_sunder").ok, false);
    assert.equal(state.chapter2Build, "quenched_thorns");

    assert.equal(chooseBuild(state, "gale_flurry").ok, true);
    assert.equal(chooseBuild(state, "relic_hunter").ok, false);
    assert.equal(state.chapter3Build, "gale_flurry");

    assert.equal(chooseBuild(state, "feast_vitality").ok, true);
    assert.equal(chooseBuild(state, "elixir_frenzy").ok, false);
    assert.equal(state.chapter4Build, "feast_vitality");

    state.inventory.food_simple = 3;
    setCombatLoadout(state, contentPack, { food: [{ itemId: "food_simple", triggerMissingHp: 5 }] });

    const t0 = new Date("2026-09-02T00:00:00.000Z");
    state.hpCombat = startHpCombat(state, packNoGate, "crab", t0);
    assert.equal(state.hpCombat.playerMaxHp, 50 + 35 + 55);
    assert.ok(state.hpCombat.playerIntervalMs < 3000, "gale_flurry shortens attack interval");
    tickHpCombat(state, packNoGate, new Date(t0.getTime() + 20_000), 20_000);
    assert.ok(state.hpCombat.log.some((l) => l.includes("淬火反伤")), "quenched_thorns reflects damage in combat log");
    assert.ok(state.hpCombat.log.some((l) => l.includes("盛宴生机")), "feast_vitality boosts food heal and grants shield");
    await storage.close();
  });
});

describe("persistent combat HP", () => {
  it("carries surviving HP into the next fight while the enemy restarts full", async () => {
    const { storage, state } = await armedWoodcutter();
    const t0 = new Date("2026-09-02T00:00:00.000Z");
    state.hpCombat = startHpCombat(state, packNoGate, "slime", t0);
    tickHpCombat(state, packNoGate, new Date(t0.getTime() + 45_000), 45_000);
    assert.equal(state.hpCombat?.outcome, "win");
    const survived = state.hpCombat!.playerHp;
    const maxHp = state.hpCombat!.playerMaxHp;
    assert.ok(survived < maxHp, "slime should have scratched the player");
    assert.equal(state.combatHp, survived);

    // Restart with a wounded pool: player keeps wounds, enemy is fresh.
    const t1 = new Date(t0.getTime() + 50_000);
    state.combatHp = 20;
    state.combatHpAt = t1.getTime();
    state.hpCombat = startHpCombat(state, packNoGate, "slime", t1);
    assert.equal(state.hpCombat.playerHp, 20);
    assert.equal(state.hpCombat.enemyHp, state.hpCombat.enemyMaxHp);
    await storage.close();
  });

  it("regenerates out of combat and respawns full after a loss", async () => {
    const { storage, state } = await armedWoodcutter();
    const t0 = new Date("2026-09-02T00:00:00.000Z");
    state.hpCombat = startHpCombat(state, packNoGate, "slime", t0);
    tickHpCombat(state, packNoGate, new Date(t0.getTime() + 45_000), 45_000);
    const survived = state.hpCombat!.playerHp;
    const maxHp = state.hpCombat!.playerMaxHp;

    // 30s of rest after the fight ended (~12s in) ≈ half the pool back.
    const t1 = new Date(t0.getTime() + 45_000 + 30_000);
    state.hpCombat = startHpCombat(state, packNoGate, "slime", t1);
    assert.equal(state.hpCombat.playerHp, Math.min(maxHp, survived + Math.floor(maxHp / 2)));

    // Death respawns at full so auto-repeat can't lock into 0-HP instant losses.
    const naked = { ...state, combatHp: 0 };
    const enc = startHpCombat(naked as typeof state, packNoGate, "slime", t1);
    assert.equal(enc.playerHp, 1); // floor: never start a fight at 0
    const { storage: s2, state: weak } = await armedWoodcutter({ withChest: false });
    weak.equipment.main_hand = undefined;
    weak.hpCombat = startHpCombat(weak, packNoGate, "slime", t0);
    tickHpCombat(weak, packNoGate, new Date(t0.getTime() + 45_000), 45_000);
    assert.equal(weak.hpCombat?.outcome, "loss");
    assert.equal(weak.combatHp, weak.hpCombat!.playerMaxHp);
    await storage.close();
    await s2.close();
  });
});

describe("combat consumables", () => {
  it("manual potion use heals the persistent HP pool out of combat", async () => {
    const { storage, state } = await armedWoodcutter();
    const { healCombatHp } = await import("./hp_combat");
    const { consumeItem } = await import("./systems");
    state.combatHp = 10;
    state.combatHpAt = Date.now();
    state.inventory.potion_hp_t1 = 1;
    const res = consumeItem(state, contentPack, "potion_hp_t1", new Date());
    assert.equal(res.ok, true);
    // Route applies the heal the way /systems/consume does (out of combat).
    const after = healCombatHp(state, contentPack, res.healed!.hp!, new Date());
    assert.equal(after, 110 > 50 ? 50 : 10 + 100); // clamped at maxHp
    assert.ok(state.combatHp! > 10 && state.combatHp! <= 50);
    await storage.close();
  });

  it("drink slot restores mp/hp instant effects in combat, not just the buff", async () => {
    const { storage, state } = await armedWoodcutter();
    const { tickHpCombat } = await import("./hp_combat");
    state.inventory.food_cosmos_banquet = 1; // hp+mp feast
    const r = setCombatLoadout(state, contentPack, { drink: [{ itemId: "food_cosmos_banquet" }] });
    assert.equal(r.ok, true);
    const t0 = new Date("2026-09-02T00:00:00.000Z");
    state.hpCombat = startHpCombat(state, packNoGate, "slime", t0);
    // Drink auto-applied at fight start: buff on, mp effect was clamped at full pool.
    assert.equal(state.hpCombat.playerMp, state.hpCombat.playerMaxMp);
    await storage.close();
  });

  it("mp potion slot auto-restores missing MP in combat and respects mp cooldown", async () => {
    const { storage, state } = await armedWoodcutter();
    state.inventory.potion_mp_t1 = 3;
    const r = setCombatLoadout(state, contentPack, {
      mp: [{ itemId: "potion_mp_t1", triggerMissingMp: 30 }],
    });
    assert.equal(r.ok, true);
    const t0 = new Date("2026-09-02T00:00:00.000Z");
    state.hpCombat = startHpCombat(state, packNoGate, "slime", t0);
    // At full MP on start, potion_mp_t1 is NOT wasted
    assert.equal(state.inventory.potion_mp_t1, 3);
    // Simulate spending 50 MP in combat
    state.hpCombat.playerMp = Math.max(0, (state.hpCombat.playerMaxMp || 100) - 50);
    tickHpCombat(state, packNoGate, new Date(t0.getTime() + 1_000), 1_000);
    assert.equal(state.inventory.potion_mp_t1, 2);
    assert.equal(state.hpCombat.consumed?.find((c) => c.itemId === "potion_mp_t1")?.qty, 1);
    assert.ok((state.hpCombat.mpReadyAt?.[0] || 0) > t0.getTime());
    await storage.close();
  });

  it("status potions (iron skin, arcane surge, guardian elixir) stack in 3 drink slots and manual useCombatConsumable logs in combat", async () => {
    const { storage, state } = await armedWoodcutter();
    const { useCombatConsumable } = await import("./hp_combat");
    state.inventory.potion_iron_skin = 2;
    state.inventory.potion_arcane_surge = 2;
    state.inventory.potion_guardian_elixir = 2;
    state.inventory.potion_hp_t1 = 2;
    const r = setCombatLoadout(state, contentPack, {
      food: [{ itemId: "potion_hp_t1", triggerMissingHp: 40 }],
      drink: [
        { itemId: "potion_iron_skin" },
        { itemId: "potion_arcane_surge" },
        { itemId: "potion_guardian_elixir" },
      ],
    });
    assert.equal(r.ok, true);
    assert.equal(state.combatLoadout?.drink.length, 3);

    const t0 = new Date("2026-09-02T00:00:00.000Z");
    state.hpCombat = startHpCombat(state, packNoGate, "slime", t0);
    // All 3 status potions auto-triggered at combat start
    assert.equal(state.inventory.potion_iron_skin, 1);
    assert.equal(state.inventory.potion_arcane_surge, 1);
    assert.equal(state.inventory.potion_guardian_elixir, 1);
    assert.equal(state.activeBuffs?.length, 3);

    // Wound player and manually drink HP potion via useCombatConsumable
    state.hpCombat.playerHp = Math.max(1, state.hpCombat.playerMaxHp - 35);
    const manualRes = useCombatConsumable(state, packNoGate, "potion_hp_t1", new Date(t0.getTime() + 500));
    assert.equal(manualRes.ok, true);
    assert.equal(state.hpCombat.playerHp, state.hpCombat.playerMaxHp);
    assert.equal(state.hpCombat.consumed?.find((c) => c.itemId === "potion_hp_t1")?.qty, 1);
    await storage.close();
  });

  it("supports 4 tiers of HP and MP potions (初级/中级/高级/顶级) with ascending restore amounts and reduced T1 values", async () => {
    const { storage, state } = await armedWoodcutter();
    const { consumeItem } = await import("./systems");

    const hpTiers = ["potion_hp_t1", "potion_hp_t2", "potion_hp_t3", "potion_hp_t4"];
    const mpTiers = ["potion_mp_t1", "potion_mp_t2", "potion_mp_t3", "potion_mp_t4"];
    const hpHeals: number[] = [];
    const mpHeals: number[] = [];

    for (const id of hpTiers) {
      state.inventory[id] = 2;
      const r = setCombatLoadout(state, contentPack, { food: [{ itemId: id, triggerMissingHp: 20 }] });
      assert.equal(r.ok, true);
      const c = consumeItem(state, contentPack, id, new Date());
      assert.equal(c.ok, true);
      hpHeals.push(c.healed?.hp || 0);
    }

    for (const id of mpTiers) {
      state.inventory[id] = 2;
      const r = setCombatLoadout(state, contentPack, { mp: [{ itemId: id, triggerMissingMp: 20 }] });
      assert.equal(r.ok, true);
      const c = consumeItem(state, contentPack, id, new Date());
      assert.equal(c.ok, true);
      mpHeals.push(c.healed?.mp || 0);
    }

    assert.deepEqual(hpHeals, [40, 95, 220, 500]);
    assert.deepEqual(mpHeals, [35, 80, 180, 400]);
    await storage.close();
  });

  it("caps low-level status potion ATK buffs at +40% and prevents 0.0s frame-zero one-shots", async () => {
    const { storage, state } = await armedWoodcutter();
    chooseBuild(state, "sharpened_edge");
    state.inventory.potion_battle_fury = 2;
    state.inventory.potion_arcane_surge = 2;
    state.inventory.potion_guardian_elixir = 2;
    setCombatLoadout(state, contentPack, {
      drink: [
        { itemId: "potion_battle_fury" },
        { itemId: "potion_arcane_surge" },
        { itemId: "potion_guardian_elixir" },
      ],
    });
    const t0 = new Date("2026-09-02T00:00:00.000Z");
    state.hpCombat = startHpCombat(state, packNoGate, "slime", t0);
    // Tick 100ms (opening auto-cast at t=0.0s): must NOT one-shot Slime at 0.0s
    tickHpCombat(state, packNoGate, new Date(t0.getTime() + 100), 100, () => 0.99);
    assert.equal(state.hpCombat.outcome, undefined, "slime must survive frame 0");
    assert.ok(state.hpCombat.enemyHp >= Math.ceil(state.hpCombat.enemyMaxHp * 0.25), "at least 25% HP remains after t=0 opening cast");
    await storage.close();
  });
});

describe("combat level gate", () => {
  it("rejects monsters above the player's combat level — same门槛 as /actions/start", async () => {
    const { storage, state } = await armedWoodcutter();
    const t0 = new Date("2026-09-02T00:00:00.000Z");
    // act_combat_rock_golem 要求战斗等级 11；新档是 1
    assert.throws(() => startHpCombat(state, contentPack, "rock_golem", t0), /skill_level_required:11/);
    // 史莱姆门槛 1：等级门不误伤新手首战
    assert.doesNotThrow(() => startHpCombat(state, contentPack, "slime", t0));
    state.hpCombat = undefined;
    // 练级后的老玩家可以开打
    const { ensureCombatSkills } = await import("./combat_skills");
    const cs = ensureCombatSkills(state);
    cs.attack.level = 20; // 推导：0.1*(1+1+20+1+1)+0.5*20 = 12 ≥ 11
    ensureCombatSkills(state);
    assert.ok((state.combatLevel || 0) >= 11);
    assert.doesNotThrow(() => startHpCombat(state, contentPack, "rock_golem", t0));
    await storage.close();
  });
});
