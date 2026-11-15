import assert from "node:assert/strict";
import { describe, it } from "node:test";
import packJson from "../shared/enhanced_content_pack_chinese.json";
import type { EnhancedContentPack } from "../backend/src/types";
import { defaultEnhancedPlayerState } from "../backend/src/storage";
import { playerBuildExtras, startHpCombat } from "../backend/src/hp_combat";
import { combatSheetFromPack, combinedBuildFromState } from "../frontend/src/gameplay/combatSheet";

const pack = packJson as EnhancedContentPack;

describe("WL-5 backend <-> frontend combat affix parity", () => {
  it("matches playerBuildExtras and playerIntervalMs across active & lingering guild affixes", () => {
    const T0 = new Date("2026-11-15T12:00:00.000Z");
    const fightPack = {
      ...pack,
      actions: (pack.actions as any[]).map((a: any) =>
        String(a.id).startsWith("act_combat_") ? { ...a, requirements: {} } : a
      ),
    } as EnhancedContentPack;
    const rawMonster = (pack.monsters as any[])[0];

    const state = defaultEnhancedPlayerState(pack.version || "1.0.0");
    state.inventory.weapon_wooden_sword = 1;
    state.inventory.armor_wood_chest = 1;
    (state.equipment as any).main_hand = "weapon_wooden_sword";
    (state.equipment as any).chest = "armor_wood_chest";
    state.bounties = {
      date: "2026-11-15",
      rerollsUsed: 0,
      seedKey: "parity-active",
      claimedTodayCount: 0,
      comboClaimed: [],
      bounties: [
        {
          id: "b_ss",
          templateId: "bt_kill_30",
          name: "讨伐",
          description: "",
          icon: "skills/combat",
          metric: "kill",
          target: 30,
          baseline: 0,
          accepted: true,
          claimed: false,
          rarity: "rare",
          reward: { gold: 700, reputation: 45 },
          affixId: "scorching_sunder",
        },
        {
          id: "b_sa",
          templateId: "bt_kill_80",
          name: "疾袭",
          description: "",
          icon: "skills/combat",
          metric: "kill",
          target: 80,
          baseline: 0,
          accepted: true,
          claimed: false,
          rarity: "epic",
          reward: { gold: 1500, reputation: 90 },
          affixId: "swift_assault",
        },
        {
          id: "b_gs",
          templateId: "bt_craft_60",
          name: "悬赏",
          description: "",
          icon: "ui/gold",
          metric: "craft",
          target: 60,
          baseline: 0,
          accepted: true,
          claimed: false,
          rarity: "rare",
          reward: { gold: 600, reputation: 40 },
          affixId: "gilded_spoils",
        },
      ],
    };

    const beActive = playerBuildExtras(state);
    const feActive = combinedBuildFromState(state as any);
    assert.equal(feActive.atk, beActive.atk);
    assert.ok(Math.abs(feActive.armorPenPct - beActive.armorPenPct) < 1e-9);
    assert.ok(Math.abs(feActive.intervalMult - beActive.intervalMult) < 1e-9);
    assert.ok(Math.abs(feActive.goldMult - beActive.goldMult) < 1e-9);
    assert.ok(Math.abs(feActive.dropMult - beActive.dropMult) < 1e-9);

    const encActive = startHpCombat(state, fightPack, rawMonster.id, T0);
    const sheetActive = combatSheetFromPack(state as any, pack.items as any, pack.equipmentSets as any);
    assert.equal(sheetActive.intervalMs, encActive.playerIntervalMs);
    assert.equal(sheetActive.hp, encActive.playerMaxHp);

    // Transition all 3 contracts to completed/claimed -> lingering aura parity
    state.stats!.totalKills = 120;
    state.stats!.totalCrafted = 100;
    state.bounties.claimedAffixesToday = ["scorching_sunder", "swift_assault", "gilded_spoils"];
    for (const b of state.bounties.bounties) b.claimed = true;

    const beLingering = playerBuildExtras(state);
    const feLingering = combinedBuildFromState(state as any);
    assert.equal(feLingering.atk, beLingering.atk);
    assert.ok(Math.abs(feLingering.armorPenPct - beLingering.armorPenPct) < 1e-9);
    assert.ok(Math.abs(feLingering.intervalMult - beLingering.intervalMult) < 1e-9);

    const encLingering = startHpCombat(state, fightPack, rawMonster.id, T0);
    const sheetLingering = combatSheetFromPack(state as any, pack.items as any, pack.equipmentSets as any);
    assert.equal(sheetLingering.intervalMs, encLingering.playerIntervalMs);
    assert.equal(sheetLingering.hp, encLingering.playerMaxHp);
  });
});
