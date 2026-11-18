import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { randomUUID } from "node:crypto";
import packJson from "../../shared/enhanced_content_pack_chinese.json";
import type {
  EnhancedContentPack,
  EnhancedPlayerState,
  GuildTrialPactId,
  StarEmblemId,
} from "./types";
import { createMemoryStorage } from "./storage_memory";
import { progressionRoutes } from "./routes/progression";
import { progression2Routes } from "./routes/progression2";
import { mapThrownError } from "./http_errors";
import {
  GUILD_PACT_LINK_TIERS,
  GUILD_TRIAL_PACTS,
  SKY_FORGE_MAX_TOTAL_LEVELS,
  SKY_FORGE_TIERS,
  STAR_EMBLEMS,
  STAR_EMBLEM_FORGE_COSTS,
  STAR_EMBLEM_MAX_LEVEL,
  doPrestige,
  ensureAstralRelics,
  ensureCaravanTrade,
  ensureSkyForge,
  forgeStarEmblem,
  getSkyForgeBonuses,
  getSkyForgeInfo,
  performReincarnation,
  sanitizeActivePacts,
  setGuildTrialPact,
} from "./progression2";
import { hitDamage, monsterCombatant, playerCombatant } from "./first_hour_combat";
import { playerBuildExtras, startHpCombat } from "./hp_combat";
import {
  defaultEnhancedPlayerState,
  ensurePlayerExtensions,
  getActionRates,
  getRareFindMultiplier,
  simulateToNow,
  startLifeActionNow,
} from "./storage";

const pack = packJson as EnhancedContentPack;
const T0 = new Date("2026-11-17T09:00:00.000Z");

function fundedState(shards: number, dust: number): EnhancedPlayerState {
  const state = defaultEnhancedPlayerState(pack.version);
  ensureAstralRelics(state, T0).ancientRelicShards = shards;
  ensureCaravanTrade(state, T0).astralCrystalDust = dust;
  return state;
}

function setForge(
  state: EnhancedPlayerState,
  levels: Partial<Record<StarEmblemId, number>>,
  activePacts: GuildTrialPactId[] = []
) {
  const sf = ensureSkyForge(state);
  sf.emblemLevels = {
    star_blade: levels.star_blade ?? 0,
    crescent_bow: levels.crescent_bow ?? 0,
    star_hammer: levels.star_hammer ?? 0,
    amethyst_staff: levels.amethyst_staff ?? 0,
  };
  sf.activePacts = [...activePacts];
  return sf;
}

async function forgeRouteFixture(patch?: (state: EnhancedPlayerState) => void) {
  const storage = createMemoryStorage();
  const user = await storage.findOrCreateGuestUser(`wl10-forge-${randomUUID()}`);
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

  return { storage, userId: user.id, invoke };
}

describe("WL-10 Sky Forge Star Emblem Codex & Guild Trial Pact Array backend mechanics & routes", () => {
  it("loads old saves with safe defaults and sanitizes dirty skyForge data (levels, duplicate/locked/over-slot pacts)", () => {
    const legacy = defaultEnhancedPlayerState(pack.version);
    assert.equal(legacy.skyForge, undefined);
    ensurePlayerExtensions(legacy);
    assert.equal(legacy.skyForge, undefined, "ensurePlayerExtensions must not invent skyForge for old saves");

    const empty = getSkyForgeBonuses(legacy);
    assert.equal(empty.totalEmblemLevels, 0);
    assert.equal(empty.forgeTier, 0);
    assert.equal(empty.pactSlots, 0);
    assert.equal(empty.intervalMult, 1);
    assert.equal(empty.combatAtkPct, 0);
    assert.deepEqual(empty.activePacts, []);

    const info = getSkyForgeInfo(legacy, pack, T0);
    assert.deepEqual(legacy.skyForge, {
      emblemLevels: { star_blade: 0, crescent_bow: 0, star_hammer: 0, amethyst_staff: 0 },
      totalForges: 0,
      activePacts: [],
      totalPactsSigned: 0,
    });
    assert.equal(info.ancientRelicShards, 0, "info must not grant WL-9 starter shards as a side effect");
    assert.equal(legacy.astralRelics, undefined, "info must stay read-only for astralRelics");
    assert.equal(info.emblems.length, 4);
    assert.equal(info.pacts.length, 5);
    assert.equal(info.pactSlots.max, 0);

    (legacy as any).skyForge = {
      emblemLevels: { star_blade: 9, crescent_bow: -2, star_hammer: 2.8, amethyst_staff: "1" },
      totalForges: -5,
      activePacts: ["gale_hunt", "ember_vanguard", "ember_vanguard", "bogus", "verdant_harvest", "forge_oath"],
      totalPactsSigned: Number.NaN,
    };
    const sf = ensureSkyForge(legacy);
    assert.deepEqual(sf.emblemLevels, { star_blade: 5, crescent_bow: 0, star_hammer: 2, amethyst_staff: 1 });
    // total 8 -> forge tier 2 -> 2 slots; gale_hunt (needs 10) dropped, duplicates & bogus dropped, truncated at 2
    assert.deepEqual(sf.activePacts, ["ember_vanguard", "verdant_harvest"]);
    assert.equal(sf.totalForges, 8);
    assert.equal(sf.totalPactsSigned, 2);
    assert.deepEqual(
      sanitizeActivePacts(["astral_covenant", "ember_vanguard"], 2),
      ["ember_vanguard"],
      "1 slot at total 2, astral_covenant needs 15"
    );
  });

  it("forges emblems with exact shard + dust costs, rejects unaffordable / max / unknown requests without mutating state", () => {
    const state = fundedState(7, 100);
    const r0 = forgeStarEmblem(state, "star_blade", T0);
    assert.equal(r0.ok, false, "8 shards required for Lv.1");
    assert.match(r0.reason || "", /远古圣物残片不足/);
    assert.equal(state.astralRelics?.ancientRelicShards, 7);
    assert.equal(state.caravanTrade?.astralCrystalDust, 100);

    state.astralRelics!.ancientRelicShards = 500;
    state.caravanTrade!.astralCrystalDust = 3;
    const r1 = forgeStarEmblem(state, "star_blade", T0);
    assert.equal(r1.ok, false, "4 dust required for Lv.1");
    assert.match(r1.reason || "", /异域星晶尘不足/);
    assert.equal(state.astralRelics?.ancientRelicShards, 500);
    assert.equal(state.skyForge?.emblemLevels.star_blade, 0);

    assert.equal(forgeStarEmblem(state, "bogus" as StarEmblemId, T0).ok, false);

    state.caravanTrade!.astralCrystalDust = 1000;
    let shards = 500;
    let dust = 1000;
    for (const cost of STAR_EMBLEM_FORGE_COSTS) {
      const res = forgeStarEmblem(state, "star_blade", T0);
      assert.equal(res.ok, true);
      assert.equal(res.newLevel, cost.targetLevel);
      shards -= cost.ancientRelicShards;
      dust -= cost.astralCrystalDust;
      assert.equal(state.astralRelics?.ancientRelicShards, shards);
      assert.equal(state.caravanTrade?.astralCrystalDust, dust);
    }
    assert.equal(shards, 500 - 162);
    assert.equal(dust, 1000 - 95);
    const over = forgeStarEmblem(state, "star_blade", T0);
    assert.equal(over.ok, false);
    assert.match(over.reason || "", /满阶/);
    assert.equal(state.astralRelics?.ancientRelicShards, shards);
    assert.equal(state.skyForge?.totalForges, 5);
  });

  it("raises the forge tier with total emblem levels, unlocking pact slots and pacts at the configured thresholds", () => {
    const state = fundedState(5000, 5000);
    const r1 = forgeStarEmblem(state, "crescent_bow", T0);
    assert.equal(r1.totalEmblemLevels, 1);
    assert.equal(r1.forgeTierUpTo, undefined);
    const r2 = forgeStarEmblem(state, "star_hammer", T0);
    assert.equal(r2.totalEmblemLevels, 2);
    assert.equal(r2.forgeTierUpTo, 1);
    assert.equal(r2.newPactSlots, 1);
    assert.deepEqual(r2.unlockedPacts, ["ember_vanguard", "verdant_harvest"]);

    // total 2..20 walk: the 20th level reaches forge tier 4 (神兵谱圆满)
    const order: StarEmblemId[] = ["star_blade", "amethyst_staff", "crescent_bow", "star_hammer"];
    let total = 2;
    const tierUps: number[] = [];
    const unlocked: string[] = [];
    while (total < SKY_FORGE_MAX_TOTAL_LEVELS) {
      const id = order.find((e) => (state.skyForge!.emblemLevels[e] || 0) < STAR_EMBLEM_MAX_LEVEL)!;
      const res = forgeStarEmblem(state, id, T0);
      assert.equal(res.ok, true);
      total += 1;
      assert.equal(res.totalEmblemLevels, total);
      if (res.forgeTierUpTo) tierUps.push(total);
      unlocked.push(...(res.unlockedPacts || []));
    }
    assert.deepEqual(tierUps, [7, 13, 20]);
    assert.deepEqual(unlocked, ["forge_oath", "gale_hunt", "astral_covenant"]);
    const b = getSkyForgeBonuses(state);
    assert.equal(b.forgeTier, 4);
    assert.equal(b.pactSlots, 3);
    assert.equal(b.forgedCount, 4);
  });

  it("signs / revokes pacts with unlock, slot, duplicate and dust validation, charging the sign fee only", () => {
    const state = fundedState(0, 2);
    setForge(state, { star_blade: 1 });
    // total 1 -> tier 0 -> no slots, pacts locked
    const locked = setGuildTrialPact(state, "ember_vanguard", "sign", T0);
    assert.equal(locked.ok, false);
    assert.match(locked.reason || "", /总阶/);

    setForge(state, { star_blade: 1, amethyst_staff: 1 });
    const poor = setGuildTrialPact(state, "ember_vanguard", "sign", T0);
    assert.equal(poor.ok, false, "3 dust sign fee, only 2 held");
    assert.match(poor.reason || "", /星晶尘不足/);
    assert.deepEqual(state.skyForge?.activePacts, []);
    assert.equal(state.caravanTrade?.astralCrystalDust, 2);

    state.caravanTrade!.astralCrystalDust = 40;
    const s1 = setGuildTrialPact(state, "ember_vanguard", "sign", T0);
    assert.equal(s1.ok, true);
    assert.equal(s1.spentDust, 3);
    assert.equal(state.caravanTrade?.astralCrystalDust, 37);
    assert.equal(setGuildTrialPact(state, "ember_vanguard", "sign", T0).ok, false, "duplicate sign rejected");
    const full = setGuildTrialPact(state, "verdant_harvest", "sign", T0);
    assert.equal(full.ok, false, "tier 1 has a single slot");
    assert.match(full.reason || "", /阵位已满/);
    assert.equal(setGuildTrialPact(state, "forge_oath", "sign", T0).ok, false, "forge_oath needs total 6");
    assert.equal(setGuildTrialPact(state, "gale_hunt", "revoke", T0).ok, false, "cannot revoke unsigned pact");
    assert.equal(setGuildTrialPact(state, "ember_vanguard", "bogus" as any, T0).ok, false);

    // grow to total 13 -> 3 slots -> sign three pacts -> link tier 2
    setForge(state, { star_blade: 4, crescent_bow: 3, star_hammer: 3, amethyst_staff: 3 }, state.skyForge!.activePacts);
    const s2 = setGuildTrialPact(state, "verdant_harvest", "sign", T0);
    assert.equal(s2.ok, true);
    assert.equal(s2.linkTier, 1);
    assert.equal(s2.linkTitle, GUILD_PACT_LINK_TIERS[0].title);
    const s3 = setGuildTrialPact(state, "gale_hunt", "sign", T0);
    assert.equal(s3.ok, true);
    assert.equal(s3.spentDust, 6);
    assert.equal(s3.linkTier, 2);
    assert.equal(state.caravanTrade?.astralCrystalDust, 37 - 3 - 6);
    assert.equal(setGuildTrialPact(state, "forge_oath", "sign", T0).ok, false, "3/3 slots used");

    const dustBeforeRevoke = state.caravanTrade!.astralCrystalDust;
    const rv = setGuildTrialPact(state, "verdant_harvest", "revoke", T0);
    assert.equal(rv.ok, true);
    assert.equal(rv.spentDust, 0);
    assert.equal(rv.linkTier, 1);
    assert.deepEqual(rv.activePacts, ["ember_vanguard", "gale_hunt"]);
    assert.equal(state.caravanTrade?.astralCrystalDust, dustBeforeRevoke, "revoke is free and not refunded");
    assert.equal(state.skyForge?.totalPactsSigned, 3);
  });

  it("computes emblem + pact + trade-off + link bonuses exactly, halving trade-offs via aligned emblem Lv.4+ or forge tier 4", () => {
    const st = defaultEnhancedPlayerState(pack.version);
    setForge(st, { star_blade: 3, crescent_bow: 2, star_hammer: 2, amethyst_staff: 1 }, ["ember_vanguard", "forge_oath"]);
    const b = getSkyForgeBonuses(st);
    assert.equal(b.totalEmblemLevels, 8);
    assert.equal(b.forgeTier, 2);
    assert.equal(b.pactSlots, 2);
    assert.equal(b.linkTier, 1);
    assert.deepEqual(b.mitigatedPacts, []);
    assert.equal(b.bonusAtk, 16);
    assert.equal(b.bonusDef, 8);
    assert.equal(b.bonusHp, 15);
    assert.equal(b.combatAtkPct, 9 + 8 + 3);
    assert.equal(b.critRateBonusPct, 4.5);
    assert.equal(b.critDmgBonusPct, 19 + 12);
    assert.equal(b.intervalMult, 0.965);
    assert.equal(b.armorPenPct, 0.05);
    assert.equal(b.bossArmorBreakPct, 0.04);
    assert.equal(b.rareFindPct, 6);
    assert.equal(b.craftSpeedPct, 10 - 8 + 12 + 3);
    assert.equal(b.craftEfficiencyPct, 8 + 10);
    assert.equal(b.gatherSpeedPct, 5 - 6 + 3);
    assert.equal(b.gatherDoubleChance, 0.03);
    assert.equal(b.xpGainPct, 2);
    assert.equal(b.goldGainPct, 3);

    // Aligned emblem Lv.4 halves ember_vanguard's -8% craft speed to -4%
    setForge(st, { star_blade: 4, amethyst_staff: 1 }, ["ember_vanguard"]);
    const m = getSkyForgeBonuses(st);
    assert.deepEqual(m.mitigatedPacts, ["ember_vanguard"]);
    assert.equal(m.craftSpeedPct, -4);

    // Trade-offs can push a lane negative (wired into real production / combat formulas)
    setForge(st, { amethyst_staff: 2 }, ["verdant_harvest"]);
    const neg = getSkyForgeBonuses(st);
    assert.equal(neg.combatAtkPct, -4);
    assert.equal(neg.gatherSpeedPct, 10 + 10);
    assert.equal(neg.gatherEfficiencyPct, 8);

    // Forge tier 4 halves every trade-off, including astral_covenant (no aligned emblem)
    setForge(
      st,
      { star_blade: 5, crescent_bow: 5, star_hammer: 5, amethyst_staff: 5 },
      ["astral_covenant", "gale_hunt", "ember_vanguard"]
    );
    const max = getSkyForgeBonuses(st);
    assert.equal(max.forgeTier, 4);
    assert.deepEqual(max.mitigatedPacts, ["astral_covenant", "gale_hunt", "ember_vanguard"]);
    assert.equal(max.linkTier, 2);
    assert.equal(max.combatAtkPct, 17 + 8 - 3 + 6);
    assert.equal(max.craftSpeedPct, 30 - 3 - 4 + 6);
    assert.equal(max.goldGainPct, 12 - 4 + 6);
    assert.equal(max.intervalMult, Math.round((1 - (8 + 4 + 2) / 100) * 1000) / 1000);
    assert.equal(max.armorPenPct, 0.2);
    assert.equal(max.gatherDoubleChance, 0.22);
    assert.equal(max.critRateBonusPct, 11);
    assert.equal(max.xpGainPct, 14 + 10 + 4);
  });

  it("keeps every emblem level and signed pact through doPrestige and performReincarnation", () => {
    const state = defaultEnhancedPlayerState(pack.version);
    state.combatLevel = 60;
    state.skills.woodcutting = { level: 55, xp: 0 };
    state.inventory.gold = 50_000;
    setForge(state, { star_blade: 4, crescent_bow: 3, star_hammer: 3, amethyst_staff: 3 }, ["ember_vanguard", "gale_hunt"]);
    state.skyForge!.totalForges = 13;
    state.skyForge!.totalPactsSigned = 4;
    const snapshot = structuredClone(state.skyForge);

    assert.equal(doPrestige(state).ok, true);
    assert.deepEqual(state.skyForge, snapshot);

    state.combatLevel = 60;
    state.skills.woodcutting = { level: 55, xp: 0 };
    assert.equal(performReincarnation(state).ok, true);
    assert.deepEqual(state.skyForge, snapshot);
    const b = getSkyForgeBonuses(state);
    assert.equal(b.forgeTier, 3);
    assert.equal(b.linkTier, 1);
  });

  it("wires emblem + pact bonuses into gathering/crafting speed & efficiency, XP, gold, rare find, gather double-drop, and normal/Boss combat", () => {
    const base = defaultEnhancedPlayerState(pack.version);
    const boosted = defaultEnhancedPlayerState(pack.version);
    setForge(
      boosted,
      { star_blade: 5, crescent_bow: 5, star_hammer: 5, amethyst_staff: 5 },
      ["forge_oath", "verdant_harvest", "gale_hunt"]
    );

    const gatherAction = (pack.actions as any[]).find(
      (a) => !String(a.id).startsWith("act_combat_") && (!Array.isArray(a.consumes) || a.consumes.length === 0)
    )!;
    const craftAction = (pack.actions as any[]).find((a) => Array.isArray(a.consumes) && a.consumes.length > 0)!;

    const bg = getActionRates(base, pack, gatherAction, T0);
    const fg = getActionRates(boosted, pack, gatherAction, T0);
    assert.ok(fg.speedMul > bg.speedMul, "staff + verdant_harvest must speed up gathering");
    assert.ok(fg.efficiencyPct > bg.efficiencyPct, "verdant_harvest must add gather efficiency");
    assert.ok(fg.xpMul > bg.xpMul);
    assert.ok(fg.speedSources.some((s) => s.label.includes("天空锻炉")));

    const bc = getActionRates(base, pack, craftAction, T0);
    const fc = getActionRates(boosted, pack, craftAction, T0);
    assert.ok(fc.speedMul > bc.speedMul, "hammer + forge_oath must speed up crafting");
    assert.ok(fc.efficiencyPct > bc.efficiencyPct);
    assert.ok(getRareFindMultiplier(boosted, pack) > getRareFindMultiplier(base, pack));

    // gale_hunt's -8% gold trade-off is halved at forge tier 4 (-4%), link tier 2 adds +6% -> net +2%
    const forge = getSkyForgeBonuses(boosted);
    assert.equal(forge.goldGainPct, 2);
    assert.ok(Math.abs(fg.goldMul / bg.goldMul - 1.02) < 1e-9);

    // A pure trade-off build really slows the affected lane (negative speed reaches the formula)
    const penalised = defaultEnhancedPlayerState(pack.version);
    setForge(penalised, { star_blade: 1, crescent_bow: 1 }, ["ember_vanguard"]);
    const pc = getActionRates(penalised, pack, craftAction, T0);
    assert.ok(pc.speedMul < bc.speedMul, "ember_vanguard's -8% craft speed must slow crafting");

    // Gather double-drop: amethyst staff Lv.5 (0.17) feeds the simulator
    const oreAction = (pack.actions as any[]).find(
      (a) =>
        !String(a.id).startsWith("act_combat_") &&
        (!Array.isArray(a.consumes) || a.consumes.length === 0) &&
        Array.isArray(a.yields) &&
        a.yields.some((y: any) => y.itemId === "ore_1")
    )!;
    const gBase = defaultEnhancedPlayerState(pack.version);
    const gBoost = defaultEnhancedPlayerState(pack.version);
    setForge(gBoost, { amethyst_staff: 5 });
    for (const sk of Object.values(gBase.skills)) sk.level = 10;
    for (const sk of Object.values(gBoost.skills)) sk.level = 10;
    gBase.lastSimulatedAt = T0.toISOString();
    gBoost.lastSimulatedAt = T0.toISOString();
    startLifeActionNow(gBase, pack, oreAction.id, undefined, T0);
    startLifeActionNow(gBoost, pack, oreAction.id, undefined, T0);
    const later = new Date(T0.getTime() + 30_000);
    const outBase = simulateToNow({ state: gBase, contentPack: pack, now: later, rng: () => 0.1 });
    const outBoost = simulateToNow({ state: gBoost, contentPack: pack, now: later, rng: () => 0.1 });
    assert.ok((outBase.state.inventory.ore_1 || 0) > 0);
    assert.ok(
      (outBoost.state.inventory.ore_1 || 0) >= (outBase.state.inventory.ore_1 || 0) * 2,
      "staff gather speed + double chance must at least double ore_1 when rng=0.1"
    );

    // Combat: blade ATK/% + bow armor-pen / boss-break / interval feed the real combatant
    const fightPack = {
      ...pack,
      actions: (pack.actions as any[]).map((a: any) =>
        String(a.id).startsWith("act_combat_") ? { ...a, requirements: {} } : a
      ),
    } as EnhancedContentPack;
    const normalMob = (pack.monsters as any[])[0];
    const bossMob = { ...normalMob, id: "wl10_test_boss", name: "星穹锻炉守卫BOSS", isBoss: true, def: 70 };
    const eb = playerBuildExtras(base);
    const ef = playerBuildExtras(boosted);
    assert.ok(ef.atk > eb.atk);
    assert.ok(ef.def > eb.def);
    assert.ok(ef.hp > eb.hp);
    assert.ok(ef.combatAtkPct > eb.combatAtkPct);
    assert.ok(ef.armorPenPct > eb.armorPenPct);
    assert.ok(ef.bossArmorBreakPct > eb.bossArmorBreakPct);
    assert.ok(ef.intervalMult < eb.intervalMult);
    const pb = playerCombatant(base, fightPack, eb);
    const pf = playerCombatant(boosted, fightPack, ef);
    assert.ok(hitDamage(pf, monsterCombatant(normalMob)) > hitDamage(pb, monsterCombatant(normalMob)));
    assert.ok(hitDamage(pf, monsterCombatant(bossMob)) > hitDamage(pb, monsterCombatant(bossMob)));
    assert.ok(pf.intervalMs < pb.intervalMs);

    const enc = startHpCombat(boosted, fightPack, normalMob.id, T0);
    assert.equal(enc.playerMaxHp, pf.hp);
    assert.equal(enc.playerIntervalMs, pf.intervalMs);
  });

  it("exposes GET/POST /progression2/forge* with auth guard, schema validation, server-side cost checks and stateRevision concurrency", async () => {
    const fx = await forgeRouteFixture((s) => {
      ensureAstralRelics(s, T0).ancientRelicShards = 30;
      ensureCaravanTrade(s, T0).astralCrystalDust = 20;
    });

    assert.equal((await fx.invoke("GET", "/progression2/forge", undefined, null)).statusCode, 401);
    assert.equal(
      (await fx.invoke("POST", "/progression2/forge/emblem", { emblemId: "star_blade" }, null)).statusCode,
      401
    );

    const initial = await fx.invoke("GET", "/progression2/forge");
    assert.equal(initial.statusCode, 200);
    assert.equal(initial.payload.emblems.length, STAR_EMBLEMS.length);
    assert.equal(initial.payload.pacts.length, GUILD_TRIAL_PACTS.length);
    assert.equal(initial.payload.forgeTier.allTiers.length, SKY_FORGE_TIERS.length);
    assert.equal(initial.payload.ancientRelicShards, 30);
    assert.equal(initial.payload.astralCrystalDust, 20);
    const rev0 = initial.payload.stateRevision;

    const bad = await fx.invoke("POST", "/progression2/forge/emblem", { emblemId: "excalibur" });
    assert.ok(bad.statusCode >= 400 && bad.statusCode < 500, "unknown emblem id rejected by schema");
    const extra = await fx.invoke("POST", "/progression2/forge/pact", { pactId: "ember_vanguard", action: "sign", free: true });
    assert.ok(extra.statusCode >= 400 && extra.statusCode < 500, "strict schema rejects extra fields");

    const f1 = await fx.invoke("POST", "/progression2/forge/emblem", { emblemId: "star_blade", expectedRevision: rev0 });
    assert.equal(f1.statusCode, 200);
    assert.equal(f1.payload.forged.newLevel, 1);
    assert.equal(f1.payload.forge.ancientRelicShards, 22);
    assert.equal(f1.payload.forge.astralCrystalDust, 16);
    const rev1 = f1.payload.stateRevision;
    assert.ok(rev1 > rev0);

    const stale = await fx.invoke("POST", "/progression2/forge/emblem", { emblemId: "crescent_bow", expectedRevision: rev0 });
    assert.equal(stale.statusCode, 409);

    const f2 = await fx.invoke("POST", "/progression2/forge/emblem", { emblemId: "crescent_bow", expectedRevision: rev1 });
    assert.equal(f2.statusCode, 200);
    assert.equal(f2.payload.forge.totalEmblemLevels, 2);
    assert.equal(f2.payload.forge.pactSlots.max, 1);

    // 14 shards left: Lv.2 blade needs 16 -> server rejects with 400 and keeps balances
    const poor = await fx.invoke("POST", "/progression2/forge/emblem", { emblemId: "star_blade" });
    assert.equal(poor.statusCode, 400);
    const after = await fx.invoke("GET", "/progression2/forge");
    assert.equal(after.payload.ancientRelicShards, 14);
    assert.equal(after.payload.emblems.find((e: any) => e.id === "star_blade").level, 1);

    const lockedPact = await fx.invoke("POST", "/progression2/forge/pact", { pactId: "forge_oath", action: "sign" });
    assert.equal(lockedPact.statusCode, 400);
    const sign = await fx.invoke("POST", "/progression2/forge/pact", { pactId: "verdant_harvest", action: "sign" });
    assert.equal(sign.statusCode, 200);
    assert.deepEqual(sign.payload.forge.activePacts, ["verdant_harvest"]);
    const card = sign.payload.forge.pacts.find((p: any) => p.id === "verdant_harvest");
    assert.equal(card.active, true);
    assert.equal(sign.payload.forge.bonuses.combatAtkPct, 3 - 4);
    const revoke = await fx.invoke("POST", "/progression2/forge/pact", { pactId: "verdant_harvest", action: "revoke" });
    assert.equal(revoke.statusCode, 200);
    assert.deepEqual(revoke.payload.forge.activePacts, []);

    const saved = await fx.storage.getOrCreatePlayerState(fx.userId, pack.version);
    assert.equal(saved.skyForge?.emblemLevels.star_blade, 1);
    assert.equal(saved.skyForge?.emblemLevels.crescent_bow, 1);
    assert.equal(saved.skyForge?.totalPactsSigned, 1);
  });
});
