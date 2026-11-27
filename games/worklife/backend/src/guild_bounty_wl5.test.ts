import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { randomUUID } from "node:crypto";
import packJson from "../../shared/enhanced_content_pack_chinese.json";
import type { Bounty, EnhancedContentPack, EnhancedPlayerState } from "./types";
import { createMemoryStorage } from "./storage_memory";
import { progressionRoutes } from "./routes/progression";
import { progression2Routes } from "./routes/progression2";
import { mapThrownError } from "./http_errors";
import {
  BOUNTY_SLOTS,
  BOUNTY_TEMPLATES,
  GUILD_BOUNTY_AFFIXES,
  GUILD_COMBO_MILESTONES,
  GUILD_HONOR_SHOP,
  acceptBounty,
  claimBounty,
  ensureBounties,
  ensureGuildHonor,
  genDailyAffixBountyBoard,
  getActiveGuildAffixModifiers,
  getBountyInfo,
  getGuildHonorInfo,
  getReputationBonuses,
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

async function routeFixture(patch?: (state: EnhancedPlayerState) => void) {
  const storage = createMemoryStorage();
  const user = await storage.findOrCreateGuestUser(`wl5-bounty-${randomUUID()}`);
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

  async function invoke(method: "GET" | "POST", path: string, body?: Record<string, unknown>) {
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
      const res = await handler({ userId: user.id, body: body ?? {} }, reply);
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
    getBounties: () => invoke("GET", "/progression2/bounties"),
    accept: (bountyId: string) => invoke("POST", "/progression2/bounties/accept", { bountyId }),
    claim: (bountyId: string) => invoke("POST", "/progression2/bounties/claim", { bountyId }),
    reroll: () => invoke("POST", "/progression2/bounties/reroll", {}),
    claimCombo: (milestoneId: string) => invoke("POST", "/progression2/bounties/combo/claim", { milestoneId }),
    redeemHonor: (itemId: string) => invoke("POST", "/progression2/bounties/honor/redeem", { itemId }),
    equipFrame: (frameId: string | null) => invoke("POST", "/progression2/bounties/frame", { frameId }),
  };
}

describe("WL-5 Daily Affix Guild Bounty Board & Chain Honor System", () => {
  it("generates deterministic 4-slot daily affix boards with core ecological affixes and zero Emoji", () => {
    const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
    for (const tpl of BOUNTY_TEMPLATES) {
      assert.equal(emojiRegex.test(tpl.icon), false, `Template ${tpl.id} icon contains Emoji`);
      assert.equal(emojiRegex.test(tpl.name), false, `Template ${tpl.id} name contains Emoji`);
    }
    for (const afx of GUILD_BOUNTY_AFFIXES) {
      assert.equal(emojiRegex.test(afx.name), false, `Affix ${afx.id} name contains Emoji`);
      assert.equal(emojiRegex.test(afx.activeDesc), false, `Affix ${afx.id} activeDesc contains Emoji`);
    }

    const boardA = genDailyAffixBountyBoard("2026-11-15", 0);
    const boardB = genDailyAffixBountyBoard("2026-11-15", 0);
    assert.equal(boardA.length, BOUNTY_SLOTS);
    assert.deepEqual(
      boardA.map((b) => ({ templateId: b.templateId, affixId: b.affixId, honorReward: b.honorReward })),
      boardB.map((b) => ({ templateId: b.templateId, affixId: b.affixId, honorReward: b.honorReward }))
    );

    const templateIds = new Set(boardA.map((b) => b.templateId));
    const affixIds = new Set(boardA.map((b) => b.affixId));
    assert.equal(templateIds.size, 4, "4 daily contracts should have distinct templates");
    assert.equal(affixIds.size, 4, "4 daily contracts should carry distinct ecological affixes");
    assert.ok(affixIds.has("bountiful_harvest"), "Board must include 双倍采集产出");
    assert.ok(affixIds.has("scorching_sunder"), "Board must include 炽热护甲破防");
    assert.ok(affixIds.has("swift_assault"), "Board must include 迅捷攻速试炼");
  });

  it("rolls over cleanly across days while preserving permanent Guild Honor & legacy saves", () => {
    const player = defaultEnhancedPlayerState(pack.version || "1.0.0");
    // Simulate legacy save missing affixId, honorReward, comboClaimed, and guildHonor
    const legacyBounty: Bounty = {
      id: "legacy_b1",
      templateId: "bt_gather_50",
      name: "木材急单",
      description: "公会营地急需原木补给，采集任意资源 50 次",
      icon: "",
      metric: "gather",
      target: 50,
      baseline: 12,
      accepted: true,
      claimed: false,
      rarity: "common",
      reward: { gold: 400, reputation: 25 },
    };
    player.bounties = {
      date: "2026-11-15",
      bounties: [legacyBounty],
      rerollsUsed: 2,
    };

    const day1 = new Date("2026-11-15T08:00:00.000Z");
    const hydrated = ensureBounties(player, day1);
    assert.equal(hydrated.bounties.length, 1);
    assert.equal(hydrated.bounties[0].id, "legacy_b1");
    assert.equal(hydrated.bounties[0].accepted, true);
    assert.equal(hydrated.bounties[0].baseline, 12);
    assert.ok(hydrated.bounties[0].affixId, "Legacy bounty should receive hydrated affixId");
    assert.ok((hydrated.bounties[0].honorReward || 0) > 0, "Legacy bounty should receive hydrated honorReward");

    // Complete and claim on day 1, earn honor + equip frame
    player.stats!.totalGathered = 70;
    const claimRes = claimBounty(player, "legacy_b1", day1);
    assert.equal(claimRes.ok, true);
    assert.ok((claimRes.honorGained || 0) > 0);
    const gh = ensureGuildHonor(player);
    gh.forgingEmblems = 3;
    gh.unlockedFrames.push("frame_crimson_vanguard");
    gh.equippedFrame = "frame_crimson_vanguard";

    // Next UTC day rollover
    const day2 = new Date("2026-11-16T02:00:00.000Z");
    const rolled = ensureBounties(player, day2);
    assert.equal(rolled.date, "2026-11-16");
    assert.equal(rolled.bounties.length, BOUNTY_SLOTS);
    assert.equal(rolled.rerollsUsed, 0);
    assert.equal(rolled.claimedTodayCount, 0);
    assert.deepEqual(rolled.comboClaimed, []);
    assert.equal(player.guildHonor?.equippedFrame, "frame_crimson_vanguard");
    assert.equal(player.guildHonor?.forgingEmblems, 3);
    assert.ok((player.guildHonor?.honorPoints || 0) > 0);
  });

  it("integrates ecological affixes into gathering, crafting, and combat simulation", () => {
    const day = new Date("2026-11-15T10:00:00.000Z");

    // 1. Bountiful Harvest (双倍采集产出): doubles gather output while active, +12% lingering once completed
    const pBase = defaultEnhancedPlayerState(pack.version || "1.0.0");
    const pHarvest = defaultEnhancedPlayerState(pack.version || "1.0.0");
    ensureBounties(pHarvest, day);
    const harvestCard: Bounty = {
      id: "bh_test",
      templateId: "bt_gather_50",
      name: "木材急单",
      description: "采集 50 次",
      icon: "materials/wood_1",
      metric: "gather",
      target: 50,
      baseline: 0,
      accepted: false,
      claimed: false,
      rarity: "common",
      reward: { gold: 400, reputation: 25 },
      affixId: "bountiful_harvest",
      honorReward: 20,
    };
    pHarvest.bounties = {
      date: "2026-11-15",
      bounties: [harvestCard],
      rerollsUsed: 0,
      seedKey: "test-harvest",
      claimedTodayCount: 0,
      comboClaimed: [],
    };
    assert.equal(acceptBounty(pHarvest, "bh_test", day).ok, true);
    assert.equal(getActiveGuildAffixModifiers(pHarvest).gatherDoubleChance, 1);

    pBase.lastSimulatedAt = day.toISOString();
    pHarvest.lastSimulatedAt = day.toISOString();
    const gatherAction = (pack.actions as any[]).find(
      (a) =>
        !String(a.id).startsWith("act_combat_") &&
        (!Array.isArray(a.consumes) || a.consumes.length === 0) &&
        Array.isArray(a.yields) &&
        a.yields.some((y: any) => y.itemId && y.itemId !== "gold" && (y.chance ?? 1) >= 1) &&
        (!a.requirements?.skillLevel || a.requirements.skillLevel <= 1)
    );
    assert.ok(gatherAction, "Content pack should contain a level-1 gather action");
    const guaranteedYield = gatherAction.yields.find((y: any) => y.itemId !== "gold" && (y.chance ?? 1) >= 1);
    const firstYieldItemId = guaranteedYield.itemId as string;

    startLifeActionNow(pBase, pack, gatherAction.id, undefined, day);
    startLifeActionNow(pHarvest, pack, gatherAction.id, undefined, day);
    const after30s = new Date(day.getTime() + 30_000);
    const simBase = simulateToNow({ state: pBase, contentPack: pack, now: after30s, rng: () => 0.5 });
    const simHarvest = simulateToNow({ state: pHarvest, contentPack: pack, now: after30s, rng: () => 0.5 });
    const baseWood = simBase.state.inventory[firstYieldItemId] || 0;
    const harvestWood = simHarvest.state.inventory[firstYieldItemId] || 0;
    assert.ok(baseWood > 0, `Baseline gather (${gatherAction.id}) should produce ${firstYieldItemId}`);
    assert.equal(harvestWood, baseWood * 2, "Active bountiful_harvest must double gather output");

    // Once target is met and claimed, active double-gather shifts to +12% lingering aura
    pHarvest.stats!.totalGathered = 60;
    assert.equal(getActiveGuildAffixModifiers(pHarvest).gatherDoubleChance, 0);
    assert.equal(claimBounty(pHarvest, "bh_test", day).ok, true);
    assert.equal(getActiveGuildAffixModifiers(pHarvest).gatherDoubleChance, 0.12);

    // 2. Scorching Sunder (炽热护甲破防) & Swift Assault (迅捷攻速试炼) & Artisan Overdrive (巧匠炉火共鸣)
    const pCombat = defaultEnhancedPlayerState(pack.version || "1.0.0");
    pCombat.bounties = {
      date: "2026-11-15",
      rerollsUsed: 0,
      seedKey: "test-combat",
      claimedTodayCount: 0,
      comboClaimed: [],
      bounties: [
        {
          id: "ss_test",
          templateId: "bt_kill_30",
          name: "魔物清剿",
          description: "击败 30 只怪物",
          icon: "equipment/weapon_wooden_sword",
          metric: "kill",
          target: 30,
          baseline: 0,
          accepted: true,
          claimed: false,
          rarity: "rare",
          reward: { gold: 700, reputation: 45 },
          affixId: "scorching_sunder",
          honorReward: 30,
        },
        {
          id: "sa_test",
          templateId: "bt_kill_80",
          name: "深渊讨伐令",
          description: "击败 80 只怪物",
          icon: "skills/combat",
          metric: "kill",
          target: 80,
          baseline: 0,
          accepted: true,
          claimed: false,
          rarity: "epic",
          reward: { gold: 1500, reputation: 90 },
          affixId: "swift_assault",
          honorReward: 45,
        },
        {
          id: "ao_test",
          templateId: "bt_craft_25",
          name: "工坊军备",
          description: "制作 25 次",
          icon: "skills/crafting",
          metric: "craft",
          target: 25,
          baseline: 0,
          accepted: true,
          claimed: false,
          rarity: "common",
          reward: { gold: 500, reputation: 30 },
          affixId: "artisan_overdrive",
          honorReward: 20,
        },
        {
          id: "gs_test",
          templateId: "bt_craft_60",
          name: "商会注资",
          description: "制作 60 次",
          icon: "ui/gold",
          metric: "craft",
          target: 60,
          baseline: 0,
          accepted: true,
          claimed: false,
          rarity: "rare",
          reward: { gold: 600, reputation: 40 },
          affixId: "gilded_spoils",
          honorReward: 30,
        },
      ],
    };

    const extras = playerBuildExtras(pCombat);
    assert.equal(extras.atk, 6, "Scorching sunder grants +6 bonus ATK");
    assert.ok(Math.abs(extras.armorPenPct - 0.3) < 1e-6, "Scorching sunder grants 30% armor penetration");
    assert.ok(Math.abs(extras.intervalMult - 0.82) < 1e-6, "Swift assault reduces attack interval to 0.82x");
    assert.ok(extras.goldMult > 1.34, "Gilded spoils increases combat gold multiplier");
    // 稀有发现由 rare_find.ts 算，流派倍率里不再重复
    assert.equal(extras.dropMult, 1);
    assert.equal(Math.round((getRareFindMultiplier(pCombat, pack, day) - getRareFindMultiplier(pBase, pack, day)) * 100), 25);

    const craftAction = (pack.actions as any[]).find(
      (a) => !String(a.id).startsWith("act_combat_") && Array.isArray(a.consumes) && a.consumes.length > 0
    );
    assert.ok(craftAction, "Content pack should contain a craft action");
    const craftRates = getActionRates(pCombat, pack, craftAction, day);
    const baseCraftRates = getActionRates(pBase, pack, craftAction, day);
    assert.ok(craftRates.speedMul > baseCraftRates.speedMul, "Artisan overdrive boosts craft speed");
    assert.ok(craftRates.effectiveDurationMs < baseCraftRates.effectiveDurationMs, "Artisan overdrive shortens craft duration");
    assert.ok(craftRates.efficiencyPct >= baseCraftRates.efficiencyPct + 25, "Artisan overdrive grants +25% craft efficiency");
    assert.ok(getRareFindMultiplier(pCombat, pack, day) > getRareFindMultiplier(pBase, pack, day));

    // Verify real HP combat deals higher damage & faster swings with scorching_sunder + swift_assault
    const monster = (pack.monsters as any[])[0];
    assert.ok(monster, "Content pack should contain at least one monster");
    const fightPack = {
      ...pack,
      actions: (pack.actions as any[]).map((a: any) =>
        String(a.id).startsWith("act_combat_") ? { ...a, requirements: {} } : a
      ),
    } as EnhancedContentPack;
    pBase.hpCombat = startHpCombat(pBase, fightPack, monster.id, day);
    pCombat.hpCombat = startHpCombat(pCombat, fightPack, monster.id, day);
    assert.ok(pCombat.hpCombat.playerIntervalMs < pBase.hpCombat.playerIntervalMs);
    tickHpCombat(pBase, fightPack, new Date(day.getTime() + 3000), 3000, () => 0.5);
    tickHpCombat(pCombat, fightPack, new Date(day.getTime() + 3000), 3000, () => 0.5);
    assert.ok(pCombat.hpCombat.enemyHp < pBase.hpCombat.enemyHp, "Scorching sunder + swift assault deals greater damage in HP combat");
  });

  it("validates Chain Combo rewards, CAS concurrency, Exclusive Guild Frames, and Honor Exchange routes", async () => {
    const f = await routeFixture((s) => {
      const board = genDailyAffixBountyBoard("2026-11-15", 0);
      // Force current local date so routes see today's board without rollover
      const info = getBountyInfo(s);
      s.bounties = {
        date: info.date,
        bounties: board.map((b, idx) => ({
          ...b,
          id: `wl5_b${idx + 1}`,
          metric: "gather",
          target: 10,
          baseline: 0,
          accepted: true,
          claimed: false,
        })),
        rerollsUsed: 2,
        seedKey: info.seedKey,
        claimedTodayCount: 0,
        comboClaimed: [],
      };
      s.stats!.totalGathered = 50;
    });

    try {
      // Cannot claim 2-chain before claiming 2 contracts
      const earlyCombo = await f.claimCombo("chain_2");
      assert.equal(earlyCombo.statusCode, 400);

      // Claim first 2 contracts
      const c1 = await f.claim("wl5_b1");
      const c2 = await f.claim("wl5_b2");
      assert.equal(c1.statusCode, 200);
      assert.equal(c2.statusCode, 200);
      assert.ok(c1.payload.reward.honorGained > 0);

      // Concurrent 2-chain combo claim pays exactly once (CAS protection)
      const [comboOk, comboDup] = await Promise.all([f.claimCombo("chain_2"), f.claimCombo("chain_2")]);
      assert.deepEqual([comboOk.statusCode, comboDup.statusCode].sort(), [200, 400]);
      const chain2Def = GUILD_COMBO_MILESTONES.find((m) => m.id === "chain_2")!;
      const winCombo = comboOk.statusCode === 200 ? comboOk : comboDup;
      assert.equal(winCombo.payload.comboReward.honorGained, chain2Def.honorPoints);
      assert.equal(winCombo.payload.comboReward.emblemsGained, chain2Def.forgingEmblems);

      // Full-board combo still blocked at 2/4
      const prematureFull = await f.claimCombo("chain_full");
      assert.equal(prematureFull.statusCode, 400);

      // Claim remaining 2 contracts -> unlock Full-Board Clear (4/4)
      assert.equal((await f.claim("wl5_b3")).statusCode, 200);
      assert.equal((await f.claim("wl5_b4")).statusCode, 200);
      const fullCombo = await f.claimCombo("chain_full");
      assert.equal(fullCombo.statusCode, 200);
      assert.equal(fullCombo.payload.comboReward.emblemsGained, 3);

      // Top up honor & emblems to test full shop redemption + frame equip lifecycle
      const stMid = await f.storage.getOrCreatePlayerState(f.userId, pack.version);
      stMid.guildHonor!.honorPoints += 600;
      stMid.guildHonor!.forgingEmblems += 6;
      await f.storage.savePlayerState(f.userId, stMid);

      // Cannot equip locked frame before redeeming
      const lockedEquip = await f.equipFrame("frame_astral_sovereign");
      assert.equal(lockedEquip.statusCode, 400);

      // Redeem Crimson Frame & Astral Frame
      const redeemCrimson = await f.redeemHonor("frame_crimson_vanguard");
      assert.equal(redeemCrimson.statusCode, 200);
      assert.equal(redeemCrimson.payload.redemption.unlockedFrame, "frame_crimson_vanguard");

      // Duplicate frame redeem rejected
      const dupCrimson = await f.redeemHonor("frame_crimson_vanguard");
      assert.equal(dupCrimson.statusCode, 400);

      const redeemAstral = await f.redeemHonor("frame_astral_sovereign");
      assert.equal(redeemAstral.statusCode, 200);
      assert.equal(redeemAstral.payload.redemption.unlockedFrame, "frame_astral_sovereign");

      // Verify passive aura from equipped Astral Sovereign frame
      const stFramed = await f.storage.getOrCreatePlayerState(f.userId, pack.version);
      assert.equal(stFramed.guildHonor?.equippedFrame, "frame_astral_sovereign");
      const bonusesFramed = getReputationBonuses(stFramed);

      // Unequip frame -> bonuses drop; re-equip crimson frame -> works
      assert.equal((await f.equipFrame(null)).statusCode, 200);
      const stUnframed = await f.storage.getOrCreatePlayerState(f.userId, pack.version);
      const bonusesUnframed = getReputationBonuses(stUnframed);
      assert.ok(bonusesFramed.combatSpeed > bonusesUnframed.combatSpeed);
      assert.ok(bonusesFramed.xpGain > bonusesUnframed.xpGain);
      assert.equal((await f.equipFrame("frame_crimson_vanguard")).statusCode, 200);
      const stCrimson = await f.storage.getOrCreatePlayerState(f.userId, pack.version);
      const bonusesCrimson = getReputationBonuses(stCrimson);
      assert.ok(bonusesCrimson.goldGain > bonusesUnframed.goldGain);

      // Redeem Forging Emblem Pack -> grants mirror_protection + ingots + crystals
      const emblemPackRes = await f.redeemHonor("supply_forging_emblem_pack");
      assert.equal(emblemPackRes.statusCode, 200);
      const stAfterPack = await f.storage.getOrCreatePlayerState(f.userId, pack.version);
      assert.ok((stAfterPack.inventory.mirror_protection || 0) >= 1, "Forging emblem pack grants protection mirror");

      // Redeem Bounty Ration Kit -> restores 1 reroll & enforces daily limit (5/day)
      const ration1 = await f.redeemHonor("supply_bounty_ration_kit");
      assert.equal(ration1.statusCode, 200);
      assert.equal(ration1.payload.redemption.restoredReroll, true);
      for (let i = 2; i <= 5; i++) {
        const res = await f.redeemHonor("supply_bounty_ration_kit");
        assert.equal(res.statusCode, 200, `Ration purchase #${i} should succeed within dailyLimit=5`);
      }
      const ration6 = await f.redeemHonor("supply_bounty_ration_kit");
      assert.equal(ration6.statusCode, 400, "6th ration purchase on same day should hit dailyLimit=5");

      const honorView = getGuildHonorInfo(await f.storage.getOrCreatePlayerState(f.userId, pack.version));
      assert.equal(honorView.shopItems.length, GUILD_HONOR_SHOP.length);
      assert.equal(honorView.equippedFrame?.id, "frame_crimson_vanguard");
    } finally {
      await f.storage.close();
    }
  });
});
