import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createMemoryStorage } from "./storage_memory";
import { getActionRates, getRareFindMultiplier, simulateToNow } from "./storage";
import { consumeItem } from "./systems";
import { currentCombatHp, persistCombatHp, startHpCombat, tickHpCombat } from "./hp_combat";
import enhancedContentPack from "../../shared/enhanced_content_pack_chinese.json";
import type { EnhancedContentPack, EnhancedPlayerState } from "./types";

const pack = enhancedContentPack as EnhancedContentPack;
const T0 = new Date("2026-09-03T00:00:00.000Z");

async function freshPlayer(activeClassId = "woodcutter") {
  const storage = createMemoryStorage();
  const user = await storage.findOrCreateGuestUser(`perk-${Math.random()}`);
  const state = (await storage.getOrCreatePlayerState(user.id, pack.version || "1.0.0")) as EnhancedPlayerState;
  state.activeClassId = activeClassId;
  return { storage, user, state };
}

describe("lightweight profession perks (zero combat stat inflation)", () => {
  it("grants +5% speed and +1%/5-levels efficiency on matching main profession skills starting at level 5", async () => {
    const { storage, state } = await freshPlayer("woodcutter");
    const chop = (pack.actions as any[]).find((a) => a.id === "act_chop_wood_t1");
    const mine = (pack.actions as any[]).find((a) => a.id === "act_mine_ore_t1");

    // Below level 5: no mastery bonus
    state.skills.skill_woodcutter.level = 4;
    const rLow = getActionRates(state, pack, chop, T0);
    assert.equal(rLow.speedMul, 1);
    assert.equal(rLow.efficiencySources.some((s) => s.label === "本职专精"), false);

    // At level 15 in own profession: +5% speed and +3% mastery efficiency
    state.skills.skill_woodcutter.level = 15;
    const rOwn = getActionRates(state, pack, chop, T0);
    assert.equal(Math.round(rOwn.speedMul * 100) / 100, 1.05);
    assert.ok(rOwn.speedSources.some((s) => s.label === "本职专精" && s.pct === 5));
    assert.ok(rOwn.efficiencySources.some((s) => s.label === "本职专精" && s.pct === 3));

    // Non-matching skill (mining while activeClassId is woodcutter) gets no mastery bonus even at level 15
    state.skills.skill_blacksmith.level = 15;
    const rOff = getActionRates(state, pack, mine, T0);
    assert.equal(rOff.speedMul, 1);
    assert.equal(rOff.efficiencySources.some((s) => s.label === "本职专精"), false);
    await storage.close();
  });

  it("woodcutter halves tool durability wear and earns +15% forest gold after character creation", async () => {
    const { storage, user, state } = await freshPlayer("woodcutter");
    state.inventory.weapon_logging_axe_t2 = 1;
    (state.equipment as any).tool = "weapon_logging_axe_t2";
    await storage.savePlayerState(user.id, state);
    let next = await storage.startLifeAction({ userId: user.id, actionId: "act_chop_wood_t1", now: T0, contentPack: pack });
    next = simulateToNow({ state: next, now: new Date(T0.getTime() + 50_000), contentPack: pack, rng: () => 0.99 }).state as EnhancedPlayerState;
    const dWood = (next.equipment as any).durability?.weapon_logging_axe_t2;
    assert.ok(dWood > 99.3, `woodcutter tool wear halved (~0.05/cycle), got ${dWood}`);

    // Forest gold bonus (+15%) when characterCreated is set
    next.settings = { ...(next.settings as any), characterCreated: true };
    next.inventory.weapon_wooden_sword = 1;
    (next.equipment as any).main_hand = "weapon_wooden_sword";
    next.inventory.gold = 0;
    next.hpCombat = startHpCombat(next, pack, "caterpillar", T0); // caterpillar base gold is 9 → round(9 * 1.15) = 10
    tickHpCombat(next, pack, new Date(T0.getTime() + 45_000), 45_000, () => 0.99);
    assert.equal(next.hpCombat.outcome, "win");
    assert.equal(next.inventory.gold, Math.round(9 * 1.15));
    await storage.close();
  });

  it("blacksmith reduces combat gear durability wear by 40%", async () => {
    const { storage, state } = await freshPlayer("blacksmith");
    state.inventory.weapon_wooden_sword = 1;
    (state.equipment as any).main_hand = "weapon_wooden_sword";
    state.hpCombat = startHpCombat(state, pack, "slime", T0);
    tickHpCombat(state, pack, new Date(T0.getTime() + 45_000), 45_000, () => 0.99);
    assert.equal(state.hpCombat.outcome, "win");
    // Normal win wear is 0.2; blacksmith pays 0.12 → durability 99.88
    assert.equal((state.equipment as any).durability?.weapon_wooden_sword, 99.88);
    await storage.close();
  });

  it("farmer regenerates out-of-combat HP 50% faster (full in 40s instead of 60s)", async () => {
    const { storage, state } = await freshPlayer("farmer");
    persistCombatHp(state, 20, T0.getTime());
    // After 20s out of combat: farmer recovers 20/40 = 50% of maxHp (50) → 20 + 25 = 45
    assert.equal(currentCombatHp(state, 50, T0.getTime() + 20_000), 45);
    await storage.close();
  });

  it("chef boosts food healing by 20% and alchemist extends drink buff duration by 25%", async () => {
    const { storage: s1, state: chef } = await freshPlayer("chef");
    chef.inventory.food_simple = 1; // base 50 HP
    const rChef = consumeItem(chef, pack, "food_simple", T0);
    assert.equal(rChef.ok && rChef.healed?.hp, 60);
    await s1.close();

    const { storage: s2, state: alch } = await freshPlayer("alchemist");
    alch.inventory.potion_battle_fury = 1; // base 600s duration
    const rAlch = consumeItem(alch, pack, "potion_battle_fury", T0);
    assert.equal(rAlch.ok, true);
    if (rAlch.ok && rAlch.buff) {
      const durSec = Math.round((Date.parse(rAlch.buff.expiresAt) - T0.getTime()) / 1000);
      assert.equal(durSec, 750, "600s * 1.25 = 750s");
    }
    await s2.close();
  });

  it("tailor grants +15% Rare Find multiplier", async () => {
    const { storage, state } = await freshPlayer("tailor");
    assert.equal(getRareFindMultiplier(state, pack, T0), 1.15);
    await storage.close();
  });
});
