import assert from "node:assert/strict";
import { describe, it } from "node:test";
import pack from "../../shared/enhanced_content_pack_chinese.json";
import type { BossMechanicDef, EnhancedContentPack, HpCombatState } from "./types";
import {
  advancePhases,
  chargeTelegraph,
  chargedHit,
  cleanseMiasma,
  enemyDamageHook,
  guardIncomingMult,
  mechanicDefsFor,
  mechanicEventOffset,
  mechanicMessage,
  mechanicParam,
  nextMechanicEventAt,
  onBossHit,
  runMechanicEvents,
} from "./boss_mechanics";
import { CHAINS, realBossFight } from "./zone_chains_fixture";

const contentPack = pack as unknown as EnhancedContentPack;
const forestBoss = (contentPack.monsters as Array<Record<string, unknown>>).find((m) => m.id === "forest_boss")!;
const slime = (contentPack.monsters as Array<Record<string, unknown>>).find((m) => m.id === "slime")!;

const fresh = (hpRatio: number): HpCombatState =>
  ({
    monsterId: "forest_boss", monsterName: "森林管家(BOSS)",
    playerHp: 100, playerMaxHp: 100, enemyHp: Math.round(1000 * hpRatio), enemyMaxHp: 1000,
    playerIntervalMs: 2000, enemyIntervalMs: 2200, enemyBaseIntervalMs: 2200,
    playerCooldownMs: 0, enemyCooldownMs: 0, heavyChopReadyAt: 0,
    guardActive: false, wrathActive: false, log: [],
  }) as HpCombatState;
const logger = (enc: HpCombatState, line: string) => void (enc.log = [...enc.log, line]);

describe("boss mechanics (data-driven)", () => {
  it("resolves a monster's mechanic ids against the pack table and ignores unknown ids", () => {
    assert.deepEqual(mechanicDefsFor(contentPack, forestBoss).map((d) => d.id), ["guard_60", "nature_wrath_30"]);
    assert.deepEqual(mechanicDefsFor(contentPack, slime), []);
    assert.deepEqual(mechanicDefsFor(contentPack, { mechanics: ["no_such_mechanic", "guard_60"] }).map((d) => d.id), ["guard_60"]);
    assert.deepEqual(mechanicDefsFor({}, forestBoss), [], "a pack without the table has no mechanics");
  });

  it("walks telegraph → guard → wrath on the HP thresholds from the table, logging each once", () => {
    const defs = mechanicDefsFor(contentPack, forestBoss);
    const enc = fresh(0.7);
    advancePhases(enc, defs, logger);
    assert.deepEqual([enc.guardActive, enc.guardTelegraphed, enc.log.length], [false, undefined, 0], "above 66%: nothing yet");

    enc.enemyHp = 650; // 65%
    advancePhases(enc, defs, logger);
    assert.equal(enc.guardTelegraphed, true);
    assert.equal(enc.guardActive, false);
    assert.equal(enc.log.length, 1);

    enc.enemyHp = 590; // 59%
    advancePhases(enc, defs, logger);
    advancePhases(enc, defs, logger); // idempotent: no second guard line
    assert.equal(enc.guardActive, true);
    assert.equal(enc.guardUsed, true);
    assert.equal(enc.log.length, 2);

    enc.enemyHp = 290; // 29%
    advancePhases(enc, defs, logger);
    assert.equal(enc.wrathActive, true);
    assert.equal(enc.guardActive, false, "wrath drops the guard");
    assert.equal(enc.enemyIntervalMs, Math.floor(2200 * 0.6));
    assert.equal(enc.log.length, 3);
  });

  it("a fight that skips straight past the guard band (a big hit) never raises it", () => {
    const defs = mechanicDefsFor(contentPack, forestBoss);
    const enc = fresh(0.9);
    enc.enemyHp = 250; // 90% → 25% in one blow
    advancePhases(enc, defs, logger);
    assert.equal(enc.guardActive, false);
    assert.equal(enc.wrathActive, true);
  });

  it("scrubs boss-only state off monsters that have no such mechanic", () => {
    const enc = fresh(0.5);
    Object.assign(enc, { guardActive: true, guardUsed: true, wrathActive: true, enemyIntervalMs: 100 });
    advancePhases(enc, [], logger);
    assert.deepEqual([enc.guardActive, enc.guardUsed, enc.wrathActive, enc.enemyIntervalMs], [false, false, false, 2200]);
  });

  it("exposes the guard multiplier, fills message placeholders and rejects missing parameters", () => {
    const defs = mechanicDefsFor(contentPack, forestBoss);
    assert.equal(guardIncomingMult(defs), 0.45);
    assert.equal(guardIncomingMult([]), undefined);
    assert.equal(mechanicMessage(defs[0], "shatter", { ability: "重劈" }), "重劈震碎了刚举起的树皮盾！");
    assert.equal(mechanicMessage(defs[0], "nope"), undefined);
    const broken: BossMechanicDef = { id: "x", kind: "guard", label: "x", params: { startRatio: 0.5 } };
    assert.throws(() => mechanicParam(broken, "incomingMult"), /missing numeric param/);
  });
});

describe("charge mechanic (mine boss rockfall)", () => {
  const mineBoss = (contentPack.monsters as Array<Record<string, unknown>>).find((m) => m.id === "mine_boss")!;
  const defs = mechanicDefsFor(contentPack, mineBoss);

  it("the mine boss carries the rockfall from data", () => {
    assert.deepEqual(defs.map((d) => [d.id, d.kind]), [["rockfall_charge", "charge"]]);
    assert.equal(mechanicParam(defs[0], "everyNth"), 4);
    assert.equal(mechanicParam(defs[0], "maxHpPct"), 0.05);
  });

  it("every 4th attack is charged for 5% of max HP, floored, and only those", () => {
    const flags = [1, 2, 3, 4, 5, 6, 7, 8, 9, 12].map((n) => chargedHit(defs, n, 440)?.damage);
    assert.deepEqual(flags, [undefined, undefined, undefined, 22, undefined, undefined, undefined, 22, undefined, 22]);
    assert.equal(chargedHit(defs, 4, 333)?.damage, 16, "floor(333 × 0.05)");
    assert.equal(chargedHit(defs, 4, 440)?.label, "落石重击");
    assert.equal(chargedHit([], 4, 440), undefined, "no charge mechanic → never charged");
  });

  it("warns after attack 3, 7, 11 … (the attack before a charged one) and no other", () => {
    const warned = [1, 2, 3, 4, 5, 6, 7, 8].filter((n) => chargeTelegraph(defs, n));
    assert.deepEqual(warned, [3, 7]);
  });

  it("the simulateFight hook takes max(normal hit, charged damage) so a charge is never weaker than a swing", () => {
    const hook = enemyDamageHook(defs)!;
    assert.equal(hook(4, 5, 440), 22);
    assert.equal(hook(4, 30, 440), 30, "a strong normal swing wins over a small charge");
    assert.equal(hook(3, 5, 440), 5);
    assert.equal(enemyDamageHook([]), undefined);
    assert.equal(enemyDamageHook(mechanicDefsFor(contentPack, forestBoss)), undefined, "guard/wrath do not use the damage hook");
  });
});

describe("timed mechanics (miasma / frost armour / eruption)", () => {
  const monster = (id: string) => (contentPack.monsters as Array<Record<string, unknown>>).find((m) => m.id === id)!;
  const swamp = mechanicDefsFor(contentPack, monster("swamp_boss"));
  const snow = mechanicDefsFor(contentPack, monster("snow_boss"));
  const volcano = mechanicDefsFor(contentPack, monster("volcano_boss"));
  const T0 = 1_000_000;
  const started = (): HpCombatState => ({ ...fresh(1), startedAt: T0, playerHp: 1000, playerMaxHp: 1000 }) as HpCombatState;

  it("each boss carries its mechanics from data", () => {
    assert.deepEqual(swamp.map((d) => d.kind), ["miasma"]);
    assert.deepEqual(snow.map((d) => d.kind), ["frost"]);
    assert.deepEqual(volcano.map((d) => d.kind), ["eruption", "wrath"]);
  });

  it("event schedules: frost windows [15s,20s) [30s,35s); miasma every 3s; eruption warns 3s before every 20s", () => {
    assert.deepEqual([0, 1, 2, 3].map((e) => mechanicEventOffset(snow[0], e)), [15000, 20000, 30000, 35000]);
    assert.deepEqual([0, 1, 2].map((e) => mechanicEventOffset(swamp[0], e)), [3000, 6000, 9000]);
    assert.deepEqual([0, 1, 2, 3].map((e) => mechanicEventOffset(volcano[0], e)), [17000, 20000, 37000, 40000]);
    assert.equal(mechanicEventOffset(volcano[1], 0), undefined, "wrath is HP-driven, not timed");
  });

  it("nextMechanicEventAt is the earliest unprocessed event on the fight clock", () => {
    const enc = started();
    assert.equal(nextMechanicEventAt(enc, []), Infinity);
    assert.equal(nextMechanicEventAt(enc, swamp), T0 + 3000);
    assert.equal(nextMechanicEventAt(enc, [...snow, ...swamp]), T0 + 3000);
    runMechanicEvents(enc, swamp, T0 + 3000, "damage", 1, logger);
    assert.equal(nextMechanicEventAt(enc, swamp), T0 + 6000);
  });

  it("frost armour raises guardActive for 5 s every 15 s and logs both edges; a broken armour is not re-announced", () => {
    const enc = started();
    runMechanicEvents(enc, snow, T0 + 14999, "state", 1, logger);
    assert.equal(enc.guardActive, false);
    runMechanicEvents(enc, snow, T0 + 15000, "state", 1, logger);
    assert.equal(enc.guardActive, true);
    assert.equal(guardIncomingMult(snow), 0.45);
    runMechanicEvents(enc, snow, T0 + 20000, "state", 1, logger);
    assert.equal(enc.guardActive, false);
    assert.equal(enc.log.length, 2);
    runMechanicEvents(enc, snow, T0 + 30000, "state", 1, logger);
    enc.guardActive = false; // 重劈 broke it
    runMechanicEvents(enc, snow, T0 + 35000, "state", 1, logger);
    assert.equal(enc.log.length, 3, "no 'armour fell' line when it was already broken");
  });

  it("a frost monster keeps its armour through the phase reset; a monster with no shield does not", () => {
    const enc = started();
    enc.guardActive = true;
    advancePhases(enc, snow, logger);
    assert.equal(enc.guardActive, true);
    advancePhases(enc, [], logger);
    assert.equal(enc.guardActive, false);
  });

  it("miasma stacks per boss hit (max 5), ticks 0.6% of max HP per stack every 3 s, and a heal or meal cleanses it", () => {
    const enc = started();
    runMechanicEvents(enc, swamp, T0 + 3000, "damage", 1, logger);
    assert.equal(enc.playerHp, 1000, "no stacks, no damage");
    for (let i = 0; i < 7; i++) onBossHit(enc, swamp);
    assert.equal(enc.mech?.["miasma.stacks"], 5, "capped");
    runMechanicEvents(enc, swamp, T0 + 6000, "damage", 0.5, logger);
    assert.equal(enc.playerHp, 1000 - 30, "floor(1000 × 0.006 × 5), ignoring brace");
    assert.match(enc.log.at(-1)!, /瘴气侵蚀！30 点伤害（5 层）/);
    cleanseMiasma(enc, swamp, "小治疗", logger);
    assert.equal(enc.mech?.["miasma.stacks"], 0);
    assert.match(enc.log.at(-1)!, /小治疗驱散了瘴气/);
    const lines = enc.log.length;
    cleanseMiasma(enc, swamp, "小治疗", logger);
    assert.equal(enc.log.length, lines, "nothing to cleanse");
    onBossHit(enc, [], );
    assert.equal(enc.mech?.["miasma.stacks"], 0, "monsters without miasma never stack it");
  });

  it("eruption warns first (state stage), then hits for 10% of max HP ignoring defence; 坚守 halves it", () => {
    const enc = started();
    runMechanicEvents(enc, volcano, T0 + 17000, "damage", 1, logger);
    assert.equal(enc.log.length, 0, "the warning belongs to the state stage");
    runMechanicEvents(enc, volcano, T0 + 17000, "state", 1, logger);
    assert.match(enc.log.at(-1)!, /即将喷发/);
    runMechanicEvents(enc, volcano, T0 + 20000, "state", 1, logger);
    assert.equal(enc.playerHp, 1000, "the eruption itself belongs to the damage stage");
    runMechanicEvents(enc, volcano, T0 + 20000, "damage", 1, logger);
    assert.equal(enc.playerHp, 900);
    runMechanicEvents(enc, volcano, T0 + 37000, "state", 0.5, logger);
    runMechanicEvents(enc, volcano, T0 + 40000, "damage", 0.5, logger);
    assert.equal(enc.playerHp, 850);
    assert.match(enc.log.at(-1)!, /熔岩喷发！50 点伤害（坚守中）/);
  });
});

describe("boss mechanics on the real engine (innate 重劈 only, zone chain, 1 s ticks)", () => {
  const fightOf = (zone: string, id: string) => {
    const m = (contentPack.monsters as Array<Record<string, unknown>>).find((x) => x.id === id)!;
    return realBossFight(CHAINS[zone], Number(m.level), id, Number(m.atk));
  };

  it("swamp boss: miasma eats HP on its 3 s clock", async () => {
    const r = await fightOf("swamp", "swamp_boss");
    assert.ok(r.log.some((l) => /瘴气侵蚀！/.test(l)), r.log.join("\n"));
  });

  it("snow boss: the frost armour goes up and falls again", async () => {
    const r = await fightOf("snow", "snow_boss");
    assert.ok(r.durationMs > 20_000);
    assert.ok(r.log.some((l) => /寒冰甲/.test(l)), "armour up");
    assert.ok(r.log.some((l) => /冰甲碎裂|破防/.test(l)), "armour down or broken");
  });

  it("volcano boss: warns, then erupts", async () => {
    const r = await fightOf("volcano", "volcano_boss");
    const warn = r.log.findIndex((l) => /即将喷发/.test(l));
    const boom = r.log.findIndex((l) => /熔岩喷发！/.test(l));
    assert.ok(warn >= 0 && boom > warn, r.log.join("\n"));
  });
});
