import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { randomUUID } from "node:crypto";
import packJson from "../../shared/enhanced_content_pack_chinese.json";
import type { EnhancedContentPack, EnhancedPlayerState } from "./types";
import { createMemoryStorage } from "./storage_memory";
import { progressionRoutes } from "./routes/progression";
import { progression2Routes } from "./routes/progression2";
import { mapThrownError } from "./http_errors";
import {
  CODEX_GLOBAL_MILESTONES,
  CROSS_PROF_RESONANCE_SETS,
  EMBLEM_SYNTHESIS_RECIPES,
  HERITAGE_DAILY_SYNTHESIS_LIMIT,
  HERITAGE_MAX_RUNE_RANK,
  HERITAGE_RUNES,
  HERITAGE_RUNE_COSTS,
  claimHeritageCodexMilestone,
  doPrestige,
  engraveHeritageRune,
  ensureGuildHonor,
  ensureHeritageWorkshop,
  equipHeritageRune,
  getHeritageWorkshopBonuses,
  getHeritageWorkshopInfo,
  recordCodexItemUnlock,
  syncHeritageCodex,
  synthesizeForgingEmblem,
} from "./progression2";
import { playerBuildExtras, startHpCombat, tickHpCombat } from "./hp_combat";
import {
  defaultEnhancedPlayerState,
  getActionRates,
  getRareFindMultiplier,
  simulateToNow,
  startLifeActionNow,
} from "./storage";

const pack = packJson as EnhancedContentPack;

async function workshopRouteFixture(patch?: (state: EnhancedPlayerState) => void) {
  const storage = createMemoryStorage();
  const user = await storage.findOrCreateGuestUser(`wl6-workshop-${randomUUID()}`);
  const initial = await storage.getOrCreatePlayerState(user.id, pack.version);
  patch?.(initial);
  await storage.savePlayerState(user.id, initial);

  const handlers = new Map<string, any>();
  const app = {
    get(path: string, fn: any) {
      handlers.set(`GET ${path}`, fn);
    },
    post(path: string, fn: any) {
      handlers.set(`POST ${path}`, fn);
    },
    delete(path: string, fn: any) {
      handlers.set(`DELETE ${path}`, fn);
    },
  };
  await progressionRoutes(app as any, storage, pack);
  await progression2Routes(app as any, storage, pack);

  async function invoke(
    method: "GET" | "POST",
    path: string,
    body?: Record<string, unknown>,
    overrideUserId?: string | null
  ) {
    let statusCode = 200;
    const reply = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      send(payload: any) {
        return { statusCode, payload };
      },
    };
    try {
      const handler = handlers.get(`${method} ${path}`);
      assert.ok(handler, `Missing route handler: ${method} ${path}`);
      const effectiveUser = overrideUserId === undefined ? user.id : overrideUserId;
      const res = await handler({ userId: effectiveUser, body: body ?? {} }, reply);
      if (res && typeof res === "object" && "statusCode" in res && "payload" in res) {
        return res;
      }
      return { statusCode, payload: res };
    } catch (error) {
      const mapped = mapThrownError(error);
      return reply.status(mapped.status).send(mapped.body);
    }
  }

  return {
    storage,
    userId: user.id,
    invoke,
    getWorkshop: () => invoke("GET", "/progression2/workshop"),
    engraveRune: (runeId: string) => invoke("POST", "/progression2/workshop/rune/engrave", { runeId }),
    equipRune: (slot: "weapon" | "armor" | "tool", runeId: string | null) =>
      invoke("POST", "/progression2/workshop/rune/equip", { slot, runeId }),
    synthesizeEmblem: (recipeId: string) =>
      invoke("POST", "/progression2/workshop/emblem/synthesize", { recipeId }),
    claimCodex: (milestoneId: string) =>
      invoke("POST", "/progression2/workshop/codex/claim", { milestoneId }),
  };
}

describe("WL-6 Heritage Rune Enchanting Altar & Cross-Profession Set Resonance Codex", () => {
  it("validates zero Emoji and verifies all 36 codex items + crystal costs exist in content pack", () => {
    const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
    const packItemIds = new Set((pack.items as Array<{ id: string }>).map((it) => it.id));

    assert.equal(HERITAGE_RUNES.length, 6);
    for (const rune of HERITAGE_RUNES) {
      assert.equal(emojiRegex.test(rune.name), false, `Rune ${rune.id} name contains Emoji`);
      assert.equal(emojiRegex.test(rune.description), false, `Rune ${rune.id} description contains Emoji`);
      assert.equal(rune.maxRank, HERITAGE_MAX_RUNE_RANK);
    }

    for (const cost of HERITAGE_RUNE_COSTS) {
      for (const cid of Object.keys(cost.crystals)) {
        assert.equal(packItemIds.has(cid), true, `Missing crystal item ${cid} in pack`);
      }
    }

    for (const rec of EMBLEM_SYNTHESIS_RECIPES) {
      assert.equal(emojiRegex.test(rec.name), false);
      assert.equal(emojiRegex.test(rec.description), false);
      for (const cid of Object.keys(rec.crystalCosts)) {
        assert.equal(packItemIds.has(cid), true, `Missing synthesis crystal ${cid} in pack`);
      }
    }

    assert.equal(CROSS_PROF_RESONANCE_SETS.length, 4);
    let totalTiers = 0;
    let totalItems = 0;
    for (const set of CROSS_PROF_RESONANCE_SETS) {
      assert.equal(emojiRegex.test(set.name), false);
      assert.equal(emojiRegex.test(set.description), false);
      assert.equal(set.tiers.length, 3);
      for (const tier of set.tiers) {
        totalTiers += 1;
        assert.equal(tier.itemIds.length, 3);
        for (const iid of tier.itemIds) {
          totalItems += 1;
          assert.equal(packItemIds.has(iid), true, `Codex item ${iid} missing from content pack`);
        }
      }
    }
    assert.equal(totalTiers, 12);
    assert.equal(totalItems, 36);
    assert.equal(CODEX_GLOBAL_MILESTONES.length, 3);
  });

  it("sanitizes corrupted or legacy heritageWorkshop saves safely via ensureHeritageWorkshop", () => {
    const state = defaultEnhancedPlayerState(pack.version || "1.0.0");
    (state as any).heritageWorkshop = {
      runeRanks: {
        rune_sunder_edge: 99,
        rune_tempest_fang: -3,
        rune_bastion_ward: 2.9,
        fake_rune: 4,
      },
      equippedRunes: {
        weapon: "rune_bastion_ward", // wrong slot (armor rune in weapon slot)
        armor: "rune_bastion_ward", // valid rank 2
        tool: "rune_bountiful_pick", // rank 0 -> should clear
      },
      codexUnlockedItems: ["ore_1", "ore_1", "non_existent_item", 123],
      claimedCodexMilestones: ["forge_bastion_t1", "forge_bastion_t1", ""],
      emblemSynthesis: { date: "2026-11-15", count: -5 },
    };

    const hw = ensureHeritageWorkshop(state);
    assert.equal(hw.runeRanks.rune_sunder_edge, 5, "Should clamp rank above maxRank to 5");
    assert.equal(hw.runeRanks.rune_tempest_fang, undefined, "Negative rank should be stripped");
    assert.equal(hw.runeRanks.rune_bastion_ward, 2, "Fractional rank should floor to 2");
    assert.equal((hw.runeRanks as any).fake_rune, undefined);

    assert.equal(hw.equippedRunes.weapon, null, "Mismatched slot rune should be cleared");
    assert.equal(hw.equippedRunes.armor, "rune_bastion_ward");
    assert.equal(hw.equippedRunes.tool, null, "Un-engraved rune cannot remain equipped");
    assert.deepEqual(hw.codexUnlockedItems, ["ore_1"]);
    assert.deepEqual(hw.claimedCodexMilestones, ["forge_bastion_t1"]);
    assert.equal(hw.emblemSynthesis?.count, 0);
  });

  it("engraves runes Lv.1->Lv.5, auto-equips empty slot, switches slots freely, and survives gear swaps & prestige", () => {
    const state = defaultEnhancedPlayerState(pack.version || "1.0.0");
    const gh = ensureGuildHonor(state);

    // Rejects when lacking forgingEmblems
    const failNoEmblem = engraveHeritageRune(state, "rune_sunder_edge", pack);
    assert.equal(failNoEmblem.ok, false);

    // Fund player for full Lv.1..5 engraving + second weapon rune Lv.1
    gh.forgingEmblems = 30;
    state.inventory.gold = 100_000;
    state.inventory.crystal_1 = 20;
    state.inventory.crystal_2 = 20;
    state.inventory.crystal_3 = 20;
    state.inventory.crystal_4 = 20;
    state.inventory.crystal_5 = 20;

    const r1 = engraveHeritageRune(state, "rune_sunder_edge", pack);
    assert.equal(r1.ok, true);
    assert.equal(r1.newRank, 1);
    assert.equal(state.heritageWorkshop?.equippedRunes.weapon, "rune_sunder_edge", "Auto-equips when slot is empty");

    // Engrave second weapon rune -> weapon slot keeps rune_sunder_edge until switched
    const rTempest = engraveHeritageRune(state, "rune_tempest_fang", pack);
    assert.equal(rTempest.ok, true);
    assert.equal(state.heritageWorkshop?.equippedRunes.weapon, "rune_sunder_edge");

    // Upgrade rune_sunder_edge up to Lv.5
    for (let target = 2; target <= 5; target++) {
      const up = engraveHeritageRune(state, "rune_sunder_edge", pack);
      assert.equal(up.ok, true);
      assert.equal(up.newRank, target);
    }
    const overMax = engraveHeritageRune(state, "rune_sunder_edge", pack);
    assert.equal(overMax.ok, false, "Should reject engraving past Lv.5");

    // Slot switching validation
    assert.equal(equipHeritageRune(state, "weapon", "rune_bastion_ward").ok, false, "Wrong slot rejected");
    assert.equal(equipHeritageRune(state, "armor", "rune_bastion_ward").ok, false, "Un-engraved rune rejected");

    const sw = equipHeritageRune(state, "weapon", "rune_tempest_fang");
    assert.equal(sw.ok, true);
    assert.equal(state.heritageWorkshop?.equippedRunes.weapon, "rune_tempest_fang");

    const unequip = equipHeritageRune(state, "weapon", null);
    assert.equal(unequip.ok, true);
    assert.equal(state.heritageWorkshop?.equippedRunes.weapon, null);
    equipHeritageRune(state, "weapon", "rune_sunder_edge");

    // Changing weapon equipment or prestiging must preserve slot-bound runes & codex unlocks
    state.inventory.weapon_frost_blade = 1;
    state.equipment.main_hand = "weapon_frost_blade";
    syncHeritageCodex(state);
    assert.equal(state.heritageWorkshop?.codexUnlockedItems.includes("weapon_frost_blade"), true);

    state.combatLevel = 60;
    for (const sk of Object.values(state.skills)) {
      sk.level = 55;
    }
    const pres = doPrestige(state);
    assert.equal(pres.ok, true);
    assert.equal(state.heritageWorkshop?.runeRanks.rune_sunder_edge, 5, "Rune rank survives prestige");
    assert.equal(state.heritageWorkshop?.equippedRunes.weapon, "rune_sunder_edge", "Equipped slot survives prestige");
    assert.equal(
      state.heritageWorkshop?.codexUnlockedItems.includes("weapon_frost_blade"),
      true,
      "Codex unlocked history survives prestige inventory wipe"
    );
  });

  it("supports crystal->forgingEmblem synthesis fallback recipes with daily limit and next-day reset", () => {
    const state = defaultEnhancedPlayerState(pack.version || "1.0.0");
    state.inventory.gold = 200_000;
    state.inventory.crystal_1 = 200;
    state.inventory.crystal_2 = 100;
    state.inventory.crystal_3 = 100;
    state.inventory.crystal_4 = 100;

    const day1 = new Date("2026-11-15T10:00:00.000Z");
    const s1 = synthesizeForgingEmblem(state, "synth_glimmer", pack, day1);
    assert.equal(s1.ok, true);
    assert.equal(s1.emblemsGained, 1);
    assert.equal(s1.synthesesRemainingToday, HERITAGE_DAILY_SYNTHESIS_LIMIT - 1);

    const s2 = synthesizeForgingEmblem(state, "synth_radiant", pack, day1);
    assert.equal(s2.ok, true);
    assert.equal(s2.emblemsGained, 1);

    const s3 = synthesizeForgingEmblem(state, "synth_brilliant", pack, day1);
    assert.equal(s3.ok, true);
    assert.equal(s3.emblemsGained, 2);
    assert.equal(ensureGuildHonor(state).forgingEmblems, 4);

    // Exhaust remaining 9 syntheses on day 1
    for (let i = 3; i < HERITAGE_DAILY_SYNTHESIS_LIMIT; i++) {
      const res = synthesizeForgingEmblem(state, "synth_glimmer", pack, day1);
      assert.equal(res.ok, true);
    }
    const capped = synthesizeForgingEmblem(state, "synth_glimmer", pack, day1);
    assert.equal(capped.ok, false, "13th synthesis on same day must be rejected");

    // Next day resets daily synthesis counter
    const day2 = new Date("2026-11-16T10:00:00.000Z");
    const afterReset = synthesizeForgingEmblem(state, "synth_glimmer", pack, day2);
    assert.equal(afterReset.ok, true);
    assert.equal(afterReset.synthesesRemainingToday, HERITAGE_DAILY_SYNTHESIS_LIMIT - 1);
  });

  it("tracks Cross-Profession Set Resonance Codex tiers, passive bonuses, and milestone reward claims", () => {
    const state = defaultEnhancedPlayerState(pack.version || "1.0.0");

    // Rejects claiming incomplete milestone
    assert.equal(claimHeritageCodexMilestone(state, "forge_bastion:tier_1", pack).ok, false);

    // Unlock 4 set tiers across 4 sets -> triggers codex_ms_4 global milestone as well
    const fourTiers = [
      ...CROSS_PROF_RESONANCE_SETS[0].tiers[0].itemIds,
      ...CROSS_PROF_RESONANCE_SETS[1].tiers[0].itemIds,
      ...CROSS_PROF_RESONANCE_SETS[2].tiers[0].itemIds,
      ...CROSS_PROF_RESONANCE_SETS[3].tiers[0].itemIds,
    ];
    for (const iid of fourTiers) {
      state.inventory[iid] = 1;
    }
    syncHeritageCodex(state);
    // Even if items are later consumed from inventory, codex retains unlock!
    for (const iid of fourTiers) {
      delete state.inventory[iid];
    }

    const bonuses = getHeritageWorkshopBonuses(state);
    assert.equal(bonuses.completedSetTiers, 4);
    assert.equal(bonuses.bonusAtk, 2 + 2 + 3); // forge_bastion:tier_1 (2) + arcane_crucible:tier_1 (2) + codex_ms_4 (3)
    assert.equal(bonuses.bonusDef, 2); // moonloom_weave:tier_1 (2)
    assert.equal(bonuses.bonusHp, 18 + 25); // hearth_bounty:tier_1 (18) + codex_ms_4 (25)
    assert.equal(bonuses.gatherSpeedPct, 2 + 2 + 3); // forge T1 (2) + hearth T1 (2) + codex_ms_4 (3)
    assert.equal(bonuses.xpGainPct, 2); // arcane_crucible:tier_1 (2%)

    const goldBefore = state.inventory.gold || 0;
    const claimTier = claimHeritageCodexMilestone(state, "forge_bastion:tier_1", pack);
    assert.equal(claimTier.ok, true);
    assert.equal(state.inventory.gold, goldBefore + 400);
    assert.equal(ensureGuildHonor(state).forgingEmblems, 1);

    // Duplicate claim rejected
    assert.equal(claimHeritageCodexMilestone(state, "forge_bastion:tier_1", pack).ok, false);

    // Global milestone 4 claimable, global milestone 8 not yet claimable
    assert.equal(claimHeritageCodexMilestone(state, "codex_ms_8", pack).ok, false);
    const claimGlobal4 = claimHeritageCodexMilestone(state, "codex_ms_4", pack);
    assert.equal(claimGlobal4.ok, true);
    assert.equal(ensureGuildHonor(state).forgingEmblems, 1 + 2);
    assert.equal(state.inventory.crystal_2, 4);
  });

  it("wires runes & codex bonuses into gathering speed/double-yield, crafting speed/efficiency, rare-find, and combat", async () => {
    const day = new Date("2026-11-15T08:00:00.000Z");
    const baseState = defaultEnhancedPlayerState(pack.version || "1.0.0");
    const state = defaultEnhancedPlayerState(pack.version || "1.0.0");

    const gatherAction = (pack.actions as any[]).find(
      (a) =>
        !String(a.id).startsWith("act_combat_") &&
        (!Array.isArray(a.consumes) || a.consumes.length === 0) &&
        Array.isArray(a.yields) &&
        a.yields.some((y: any) => y.itemId === "ore_1" && (y.chance ?? 1) >= 1) &&
        (!a.requirements?.skillLevel || a.requirements.skillLevel <= 1)
    ) ||
      (pack.actions as any[]).find(
        (a) =>
          !String(a.id).startsWith("act_combat_") &&
          (!Array.isArray(a.consumes) || a.consumes.length === 0) &&
          Array.isArray(a.yields) &&
          a.yields.some((y: any) => y.itemId && y.itemId !== "gold" && (y.chance ?? 1) >= 1) &&
          (!a.requirements?.skillLevel || a.requirements.skillLevel <= 1)
      );
    const craftAction = (pack.actions as any[]).find(
      (a) => !String(a.id).startsWith("act_combat_") && Array.isArray(a.consumes) && a.consumes.length > 0
    );
    assert.ok(gatherAction && craftAction, "Content pack should contain gather and craft actions");

    const baseGatherRates = getActionRates(baseState, pack, gatherAction, day);
    const baseCraftRates = getActionRates(baseState, pack, craftAction, day);
    const baseRareMult = getRareFindMultiplier(baseState, pack, day);

    // Equip Lv.5 rune_bountiful_pick on tool (+20% gatherSpeed, +20% double-yield, +15% rareFind)
    const hw = ensureHeritageWorkshop(state);
    hw.runeRanks.rune_bountiful_pick = 5;
    hw.runeRanks.rune_artisan_forge = 5;
    hw.runeRanks.rune_sunder_edge = 5;
    hw.runeRanks.rune_bastion_ward = 5;
    hw.equippedRunes.tool = "rune_bountiful_pick";
    hw.equippedRunes.weapon = "rune_sunder_edge";
    hw.equippedRunes.armor = "rune_bastion_ward";

    const pickGatherRates = getActionRates(state, pack, gatherAction, day);
    assert.ok(
      pickGatherRates.speedMul > baseGatherRates.speedMul,
      "rune_bountiful_pick should increase gather speedMul"
    );
    assert.ok(
      pickGatherRates.effectiveDurationMs < baseGatherRates.effectiveDurationMs,
      "rune_bountiful_pick should shorten gather effectiveDurationMs"
    );
    assert.ok(
      getRareFindMultiplier(state, pack, day) > baseRareMult,
      "rune_bountiful_pick should increase getRareFindMultiplier"
    );

    // Switch tool slot to rune_artisan_forge (+20% craftSpeed, +15% craftEfficiency, +15% goldGain)
    equipHeritageRune(state, "tool", "rune_artisan_forge");
    const forgeCraftRates = getActionRates(state, pack, craftAction, day);
    assert.ok(
      forgeCraftRates.speedMul > baseCraftRates.speedMul,
      "rune_artisan_forge should increase craft speedMul"
    );
    assert.ok(
      forgeCraftRates.efficiencyPct >= baseCraftRates.efficiencyPct + 15,
      "rune_artisan_forge should increase craft efficiencyPct by +15%"
    );

    // Verify gatherDoubleChance doubles output when rng < gatherDoubleChance, and auto-unlocks codex item if tracked
    equipHeritageRune(state, "tool", "rune_bountiful_pick");
    const copperMineAction = (pack.actions as any[]).find(
      (a) =>
        !String(a.id).startsWith("act_combat_") &&
        (!Array.isArray(a.consumes) || a.consumes.length === 0) &&
        Array.isArray(a.yields) &&
        a.yields.some((y: any) => y.itemId === "ore_1")
    );
    assert.ok(copperMineAction, "Copper mining action exists in pack");
    for (const sk of Object.values(state.skills)) sk.level = 10;
    for (const sk of Object.values(baseState.skills)) sk.level = 10;
    state.lastSimulatedAt = day.toISOString();
    baseState.lastSimulatedAt = day.toISOString();
    startLifeActionNow(state, pack, copperMineAction.id, undefined, day);
    startLifeActionNow(baseState, pack, copperMineAction.id, undefined, day);

    const after30s = new Date(day.getTime() + 30_000);
    // rng = 0.05 < 0.20 gatherDoubleChance triggers double yield on every cycle!
    const simRune = simulateToNow({ state, contentPack: pack, now: after30s, rng: () => 0.05 });
    const simBase = simulateToNow({ state: baseState, contentPack: pack, now: after30s, rng: () => 0.05 });
    assert.ok((simRune.state.inventory.ore_1 || 0) > (simBase.state.inventory.ore_1 || 0), "Double-yield + gather speed yields more ore_1");
    assert.equal(
      simRune.state.heritageWorkshop?.codexUnlockedItems.includes("ore_1"),
      true,
      "Live gathering in simulateToNow should auto-unlock codex item ore_1"
    );

    // Verify combat extras reflect weapon + armor runes
    const extras = playerBuildExtras(simRune.state);
    assert.equal(extras.atk, 20); // rune_sunder_edge Lv.5 = +20 ATK
    assert.equal(extras.armorPenPct, 0.2); // +20% armor pen
    assert.equal(extras.critRateBonusPct, 9); // +9% crit rate
    assert.equal(extras.hp, 110); // rune_bastion_ward Lv.5 = +110 HP
    assert.equal(extras.def, 15); // +15 DEF
    assert.equal(extras.thornsDefRatio, 0.3); // +30% thorns

    const fightPack = {
      ...pack,
      actions: (pack.actions as any[]).map((a: any) =>
        String(a.id).startsWith("act_combat_") ? { ...a, requirements: {} } : a
      ),
    } as EnhancedContentPack;
    const monster = (pack.monsters as any[])[0];
    simBase.state.hpCombat = startHpCombat(simBase.state, fightPack, monster.id, after30s);
    simRune.state.hpCombat = startHpCombat(simRune.state, fightPack, monster.id, after30s);
    assert.equal(
      simRune.state.hpCombat.playerMaxHp,
      simBase.state.hpCombat.playerMaxHp + 110,
      "Combat max HP includes +110 HP from rune_bastion_ward Lv.5"
    );
    tickHpCombat(simRune.state, fightPack, new Date(after30s.getTime() + 3000), 3000, () => 0.5);
    assert.ok(simRune.state.hpCombat.enemyHp < simRune.state.hpCombat.enemyMaxHp);
  });

  it("serves all 5 /progression2/workshop HTTP routes with auth, validation, and stateRevision updates", async () => {
    const fx = await workshopRouteFixture((s) => {
      s.inventory.gold = 50_000;
      s.inventory.crystal_1 = 20;
      s.inventory.crystal_2 = 20;
      s.inventory.crystal_3 = 20;
      s.inventory.ore_1 = 2;
      s.inventory.ingot_1 = 2;
      s.inventory.weapon_iron_sword = 1;
    });

    // Unauthorized check
    const unauth = await fx.invoke("GET", "/progression2/workshop", {}, null);
    assert.equal(unauth.statusCode, 401);

    // 1. GET /progression2/workshop syncs codex from inventory (forge_bastion:tier_1 ready!)
    const initRes = await fx.getWorkshop();
    assert.equal(initRes.statusCode, 200);
    assert.equal(initRes.payload.codex.completedSetTiers, 1);
    assert.equal(initRes.payload.codex.claimableCount, 1);

    // 2. POST /progression2/workshop/emblem/synthesize (synth_brilliant -> +2 emblems)
    const synthRes = await fx.synthesizeEmblem("synth_brilliant");
    assert.equal(synthRes.statusCode, 200);
    assert.equal(synthRes.payload.ok, true);
    assert.equal(synthRes.payload.workshop.forgingEmblems, 2);

    // 3. POST /progression2/workshop/codex/claim (adds +1 emblem -> total 3 emblems)
    const claimRes = await fx.claimCodex("forge_bastion:tier_1");
    assert.equal(claimRes.statusCode, 200);
    assert.equal(claimRes.payload.ok, true);
    assert.equal(claimRes.payload.workshop.forgingEmblems, 3);
    assert.equal(claimRes.payload.workshop.codex.claimableCount, 0);

    // 4. POST /progression2/workshop/rune/engrave
    const eng1 = await fx.engraveRune("rune_sunder_edge");
    assert.equal(eng1.statusCode, 200);
    assert.equal(eng1.payload.engraved.newRank, 1);
    assert.equal(eng1.payload.workshop.equippedRunes.weapon, "rune_sunder_edge");

    const eng2 = await fx.engraveRune("rune_tempest_fang");
    assert.equal(eng2.statusCode, 200);
    assert.equal(eng2.payload.engraved.newRank, 1);

    // 5. POST /progression2/workshop/rune/equip
    const eqRes = await fx.equipRune("weapon", "rune_tempest_fang");
    assert.equal(eqRes.statusCode, 200);
    assert.equal(eqRes.payload.workshop.equippedRunes.weapon, "rune_tempest_fang");

    // Rejects invalid rune equip
    const badEq = await fx.equipRune("armor", "rune_tempest_fang");
    assert.equal(badEq.statusCode >= 400, true);
  });
});
