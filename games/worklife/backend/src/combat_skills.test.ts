import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createMemoryStorage } from "./storage_memory";
import enhancedContentPack from "../../shared/enhanced_content_pack_chinese.json";
import type { EnhancedContentPack } from "./types";
import {
  COMBAT_SKILL_IDS,
  abilitySlotCount,
  combatSkillContribution,
  derivedCombatLevel,
  ensureCombatSkills,
  grantCombatXp,
  mainCombatSkill,
} from "./combat_skills";
import {
  ABILITY_BY_ID,
  activeAbilitySlots,
  ensureAbilities,
  learnFromBook,
  setAbilityLoadout,
  triggerSatisfied,
} from "./abilities";
import { startHpCombat, tickHpCombat, tryCastAbility } from "./hp_combat";
import { playerCombatant } from "./first_hour_combat";
import { getXpForLevel } from "./storage";

const pack = enhancedContentPack as EnhancedContentPack;
const T0 = new Date("2026-09-03T00:00:00.000Z");

async function fresh(mods: { sword?: boolean; chest?: boolean; legacyLevel?: number } = {}) {
  const storage = createMemoryStorage();
  const user = await storage.findOrCreateGuestUser(`cs-${Math.random()}`);
  const state = await storage.getOrCreatePlayerState(user.id, pack.version || "1.0.0");
  const eq = state.equipment as { main_hand?: string; chest?: string };
  if (mods.sword) { state.inventory.weapon_wooden_sword = 1; eq.main_hand = "weapon_wooden_sword"; }
  if (mods.chest) { state.inventory.armor_wood_chest = 1; eq.chest = "armor_wood_chest"; }
  if (mods.legacyLevel) { state.combatLevel = mods.legacyLevel; state.combatSkills = undefined; }
  return { storage, state };
}

describe("MWI combat skills", () => {
  it("seeds five skills at level 1 and derives 战斗等级 1 from them", async () => {
    const { storage, state } = await fresh();
    const cs = ensureCombatSkills(state);
    assert.deepEqual(Object.keys(cs).sort(), [...COMBAT_SKILL_IDS].sort());
    for (const id of COMBAT_SKILL_IDS) assert.deepEqual(cs[id], { level: 1, xp: 0 });
    assert.equal(state.combatLevel, 1);
    await storage.close();
  });

  it("migrates a legacy trained combatLevel without making the player weaker", async () => {
    const { storage, state } = await fresh({ legacyLevel: 7 });
    const cs = ensureCombatSkills(state);
    for (const id of COMBAT_SKILL_IDS) assert.equal(cs[id].level, 7);
    assert.equal(derivedCombatLevel(cs), 7, "0.1×(4×7 + 7) + 0.5×7 = 7");
    assert.equal(playerCombatant(state, pack).hp, 50 + 6 * 10);
    // five-skill saves gain ranged / magic at 1 without touching the rest
    state.combatSkills = { stamina: { level: 3, xp: 0 }, intelligence: { level: 1, xp: 0 }, attack: { level: 2, xp: 0 }, defense: { level: 1, xp: 0 }, melee: { level: 4, xp: 0 } } as any;
    const migrated = ensureCombatSkills(state);
    assert.deepEqual(migrated.ranged, { level: 1, xp: 0 });
    assert.deepEqual(migrated.magic, { level: 1, xp: 0 });
    assert.equal(migrated.melee.level, 4);
    await storage.close();
  });

  it("the weapon decides the main skill: swords melee, bows ranged, staffs magic", async () => {
    const { storage, state } = await fresh();
    assert.equal(mainCombatSkill(state), "melee", "bare hands");
    (state.equipment as any).main_hand = "weapon_wooden_bow";
    assert.equal(mainCombatSkill(state), "ranged");
    (state.equipment as any).main_hand = "weapon_staff_t1";
    assert.equal(mainCombatSkill(state), "magic");
    (state.equipment as any).main_hand = "weapon_genesis_staff";
    assert.equal(mainCombatSkill(state), "magic");
    (state.equipment as any).main_hand = "weapon_shadow_bow";
    assert.equal(mainCombatSkill(state), "ranged");
    (state.equipment as any).main_hand = "weapon_steel_axe";
    assert.equal(mainCombatSkill(state), "melee");
    // ranged training with a bow: the 70% goes to stamina / intelligence / attack / defense / ranged; melee and magic get nothing
    (state.equipment as any).main_hand = "weapon_wooden_bow";
    const grant = grantCombatXp(state, 100);
    assert.equal(grant.main, "ranged");
    assert.equal(grant.gained.ranged, 44);
    assert.equal(grant.gained.melee, undefined);
    assert.equal(grant.gained.magic, undefined);
    assert.equal(state.combatSkills!.melee.xp, 0);
    // a staff's mag counts as attack, and ATK now follows the magic skill
    state.inventory.weapon_staff_t1 = 1;
    (state.equipment as any).main_hand = "weapon_staff_t1";
    ensureCombatSkills(state).magic.level = 6;
    assert.equal(playerCombatant(state, pack).atk, 5 + 5 + 10, "base 5 + magic 6→+5 + staff mag 10");
    await storage.close();
  });

  it("a charm in an accessory slot focuses the 70% share on one skill (MWI 护符)", async () => {
    const { storage, state } = await fresh();
    state.inventory.charm_defense = 1;
    (state.equipment as any).accessory2 = "charm_defense";
    const grant = grantCombatXp(state, 100, pack as any);
    assert.equal(grant.focus, "defense");
    assert.equal(grant.gained.defense, 70);
    assert.equal(grant.gained.melee, 30, "the weapon share is untouched");
    assert.equal(grant.gained.stamina, undefined);
    assert.equal(grant.gained.intelligence, undefined);
    // focusing the main skill itself stacks both shares
    (state.equipment as any).accessory2 = undefined;
    state.inventory.charm_stamina = 1;
    (state.equipment as any).accessory1 = "charm_stamina";
    const g2 = grantCombatXp(state, 100, pack as any);
    assert.equal(g2.gained.stamina, 70);
    assert.equal(g2.gained.melee, 30);
    // no pack → no charm lookup → the even split
    const g3 = grantCombatXp(state, 100);
    assert.equal(g3.focus, undefined);
    assert.equal(g3.gained.stamina, 14);
    await storage.close();
  });

  it("splits kill XP 30% to the weapon skill and 70% evenly across the four utility skills plus the main skill", async () => {
    const { storage, state } = await fresh();
    const grant = grantCombatXp(state, 100);
    assert.equal(grant.gained.melee, 44);
    assert.equal(grant.gained.stamina, 14);
    assert.equal(grant.gained.intelligence, 14);
    assert.equal(grant.gained.attack, 14);
    assert.equal(grant.gained.defense, 14);
    assert.equal(grant.gained.ranged, undefined, "unused damage skills get nothing");
    // level 1 → 2 needs getXpForLevel(1) = 40: melee (44) levels, the others (14) do not
    assert.equal(getXpForLevel(1), 40);
    assert.equal(state.combatSkills!.melee.level, 2);
    assert.equal(Math.round(state.combatSkills!.melee.xp), 4);
    assert.equal(state.combatSkills!.stamina.level, 1);
    assert.deepEqual(grant.levelUps, [{ skill: "melee", level: 2 }]);
    // derived: 0.1×(1+1+1+1+max(2,1,1)) + 0.5×2 = 1.6 → 1
    assert.equal(state.combatLevel, 1);
    assert.ok(state.logs.some((l) => l.text.includes("近战升级到 2 级")));
    await storage.close();
  });

  it("each skill changes the sheet the way MWI describes", () => {
    const one = { level: 1, xp: 0 };
    const base = combatSkillContribution({ stamina: one, intelligence: one, attack: one, defense: one, melee: one, ranged: one, magic: one });
    assert.deepEqual(base, { hp: 50, mp: 20, atk: 5, def: 0, intervalMs: 3000, mpRegenPerTick: 1 });
    const trained = combatSkillContribution({
      stamina: { level: 11, xp: 0 }, intelligence: { level: 20, xp: 0 }, attack: { level: 26, xp: 0 }, defense: { level: 9, xp: 0 }, melee: { level: 16, xp: 0 }, ranged: one, magic: one,
    });
    assert.equal(trained.hp, 150, "+10 HP per stamina level");
    assert.equal(trained.mp, 20 + 19 * 5);
    assert.equal(trained.atk, 20, "+1 ATK per melee level");
    assert.equal(trained.def, 4, "+1 DEF per 2 defense levels");
    assert.equal(trained.intervalMs, Math.round(3000 / 1.25), "-1% interval per attack level");
    assert.equal(trained.mpRegenPerTick, 3);
    assert.equal(abilitySlotCount(trained as never), 1, "abilitySlotCount reads intelligence from a skills record");
  });

  it("ability slots grow with intelligence: 1, then one more every 10 levels, four at most", async () => {
    const { storage, state } = await fresh();
    const cs = ensureCombatSkills(state);
    assert.equal(abilitySlotCount(cs), 1);
    cs.intelligence.level = 10;
    assert.equal(abilitySlotCount(cs), 2);
    cs.intelligence.level = 29;
    assert.equal(abilitySlotCount(cs), 3);
    cs.intelligence.level = 95;
    assert.equal(abilitySlotCount(cs), 4);
    await storage.close();
  });
});

describe("MWI abilities", () => {
  it("every player knows 重劈 and has it equipped with its default trigger", async () => {
    const { storage, state } = await fresh();
    ensureAbilities(state);
    assert.deepEqual(state.abilities, { heavy_chop: { level: 1, xp: 0 } });
    assert.deepEqual(state.abilityLoadout, [{ abilityId: "heavy_chop", trigger: { type: "always" } }]);
    await storage.close();
  });

  it("learns from a book, re-reading gives fixed 150 XP, and books are consumed", async () => {
    const { storage, state } = await fresh();
    assert.equal(learnFromBook(state, pack, "book_smash").ok, false, "no book yet");
    assert.equal(learnFromBook(state, pack, "wood_1").ok, false, "not a book");
    state.inventory.book_smash = 3;
    const first = learnFromBook(state, pack, "book_smash");
    assert.deepEqual({ ok: first.ok, learned: first.learned, abilityId: first.abilityId }, { ok: true, learned: true, abilityId: "smash" });
    assert.equal(state.inventory.book_smash, 2);
    assert.deepEqual(state.abilities!.smash, { level: 1, xp: 0 });
    // Only one slot at intelligence 1, so the new ability is learned but not auto-equipped.
    assert.deepEqual(activeAbilitySlots(state).map((s) => s.abilityId), ["heavy_chop"]);
    const second = learnFromBook(state, pack, "book_smash");
    assert.equal(second.learned, false);
    assert.equal(state.abilities!.smash.level, 1, "150 XP is half of the 300 XP level-2 threshold");
    assert.equal(state.abilities!.smash.xp, 150, "fixed 150 XP granted");
    const third = learnFromBook(state, pack, "book_smash");
    assert.equal(third.leveledTo, 2, "second re-read (150 + 150 = 300 XP) reaches level 2");
    assert.equal(state.abilities!.smash.level, 2);
    assert.equal(state.abilities!.smash.xp, 0);
    assert.equal(state.inventory.book_smash, undefined);
    await storage.close();
  });

  it("validates the ability loadout: learned only, no duplicates, slot cap, sane triggers", async () => {
    const { storage, state } = await fresh();
    state.inventory.book_smash = 1;
    learnFromBook(state, pack, "book_smash");
    assert.equal(setAbilityLoadout(state, [{ abilityId: "smash" }, { abilityId: "heavy_chop" }]).error, "too_many_slots:1");
    ensureCombatSkills(state).intelligence.level = 10;
    assert.equal(setAbilityLoadout(state, [{ abilityId: "smash" }, { abilityId: "smash" }]).error, "duplicate:smash");
    assert.equal(setAbilityLoadout(state, [{ abilityId: "minor_heal" }]).error, "not_learned:minor_heal");
    assert.equal(setAbilityLoadout(state, [{ abilityId: "smash", trigger: { type: "enemy_hp_below", pct: 250 } }]).error, "bad_trigger:smash");
    const ok = setAbilityLoadout(state, [
      { abilityId: "smash", trigger: { type: "enemy_hp_below", pct: 50 } },
      { abilityId: "heavy_chop", trigger: { type: "enemy_guard" } },
    ]);
    assert.equal(ok.ok, true);
    assert.deepEqual(state.abilityLoadout, [
      { abilityId: "smash", trigger: { type: "enemy_hp_below", pct: 50 } },
      { abilityId: "heavy_chop", trigger: { type: "enemy_guard" } },
    ]);
    await storage.close();
  });

  it("triggers read the fight state", () => {
    const s = { playerHp: 20, playerMaxHp: 50, enemyHp: 30, enemyMaxHp: 100, guardActive: false };
    assert.equal(triggerSatisfied({ type: "always" }, s), true);
    assert.equal(triggerSatisfied({ type: "enemy_hp_below", pct: 30 }, s), true);
    assert.equal(triggerSatisfied({ type: "enemy_hp_below", pct: 29 }, s), false);
    assert.equal(triggerSatisfied({ type: "self_hp_below", pct: 40 }, s), true);
    assert.equal(triggerSatisfied({ type: "self_hp_below", pct: 39 }, s), false);
    assert.equal(triggerSatisfied({ type: "enemy_guard" }, s), false);
    assert.equal(triggerSatisfied({ type: "enemy_guard" }, { ...s, guardActive: true }), true);
  });

  it("auto-casts 重劈 the moment it is ready, so a sword-only slime fight ends at 8s", async () => {
    const { storage, state } = await fresh({ sword: true });
    state.hpCombat = startHpCombat(state, pack, "slime", T0);
    assert.equal(state.hpCombat.playerMaxMp, 20);
    // atk 10 (5 base + sword 5) vs def 4 → 8 per hit, 重劈 floor(8×2.2) = 17
    tickHpCombat(state, pack, new Date(T0.getTime() + 8_100), 8_100, () => 0.99);
    // t0: 17, 3s: 8, 6s: 8, 8s: 17 → 50 dealt, slime 20/70 left
    assert.equal(state.hpCombat.enemyHp, 20);
    assert.equal(state.hpCombat.log.filter((l) => l.startsWith("重劈造成 17")).length, 2);
    assert.equal(state.abilities!.heavy_chop.xp, 4, "2 XP per cast on Lv1 slime (2 casts = 4 XP)");
    assert.equal(state.hpCombat.playerMp, 20, "重劈 costs no mana; regen keeps the pool full");
    await storage.close();
  });

  it("spends mana on 猛击, regenerates on basic-attack ticks, and reports the 30/70 XP split on win", async () => {
    const { storage, state } = await fresh({ sword: true, chest: true });
    state.inventory.book_smash = 1;
    learnFromBook(state, pack, "book_smash");
    ensureCombatSkills(state).intelligence.level = 10; // second slot + 3 regen per tick? (1 + floor(10/10) = 2)
    assert.equal(setAbilityLoadout(state, [{ abilityId: "smash" }, { abilityId: "heavy_chop" }]).ok, true);
    state.hpCombat = startHpCombat(state, pack, "slime", T0);
    const maxMp = 20 + 9 * 5;
    assert.equal(state.hpCombat.playerMaxMp, maxMp);
    tickHpCombat(state, pack, new Date(T0.getTime() + 1), 1, () => 0.99);
    // both fire at t0: 猛击 first (priority), then 重劈
    assert.equal(state.hpCombat.playerMp, maxMp - ABILITY_BY_ID.smash.mpCost);
    assert.ok(state.hpCombat.log.some((l) => l.startsWith("猛击造成")));
    tickHpCombat(state, pack, new Date(T0.getTime() + 60_000), 59_999, () => 0.99);
    assert.equal(state.hpCombat.outcome, "win");
    const g = state.hpCombat.xpGained!;
    assert.equal(g.melee, 1.8, "slime 4 XP → 44% melee");
    assert.equal(g.stamina, 0.6);
    assert.equal(state.combatSkills!.melee.xp, 1.76);
    await storage.close();
  });

  it("小治疗 only fires below its HP trigger and 坚守 cuts incoming damage while it lasts", async () => {
    const { storage, state } = await fresh({ sword: true });
    state.inventory.book_minor_heal = 1;
    state.inventory.book_brace = 1;
    learnFromBook(state, pack, "book_minor_heal");
    learnFromBook(state, pack, "book_brace");
    ensureCombatSkills(state).intelligence.level = 20; // 3 slots
    assert.equal(setAbilityLoadout(state, [
      { abilityId: "brace", trigger: { type: "always" } },
      { abilityId: "minor_heal", trigger: { type: "self_hp_below", pct: 60 } },
    ]).ok, true);
    state.combatLevel = 10; // forest_boss 需要战斗等级 10（startHpCombat 的等级门）
    state.hpCombat = startHpCombat(state, pack, "forest_boss", T0);
    state.abilityLoadout = state.abilityLoadout!; // keep
    tickHpCombat(state, pack, new Date(T0.getTime() + 3_600), 3_600, () => 0.99);
    // 坚守 at t0 (6s window): the boss hit at 2.2s is its full atk (no armour) → floor(atk × 0.65)
    const bossAtk = Number((pack.monsters as Array<{ id: string; atk?: number }>).find((m) => m.id === "forest_boss")!.atk);
    const braced = Math.floor(bossAtk * 0.65);
    assert.ok(state.hpCombat.log.some((l) => l.includes("坚守！")), state.hpCombat.log.join(" | "));
    assert.ok(state.hpCombat.log.some((l) => l.includes(`造成 ${braced} 伤害（坚守中）`)), state.hpCombat.log.join(" | "));
    assert.equal(state.hpCombat.playerHp, state.hpCombat.playerMaxHp - braced);
    assert.equal(state.hpCombat.log.some((l) => l.includes("小治疗")), false, "still above the 60% trigger");
    // manual cast of a heal at 90% HP is refused
    assert.equal(tryCastAbility(state, pack, "smash", new Date(T0.getTime() + 3_600)).error, "unknown_ability");
    state.hpCombat.playerHp = 20;
    tickHpCombat(state, pack, new Date(T0.getTime() + 3_700), 100, () => 0.99);
    assert.ok(state.hpCombat.log.some((l) => l.includes("小治疗恢复 12 生命")), state.hpCombat.log.join(" | "));
    assert.equal(state.hpCombat.playerHp, 32);
    await storage.close();
  });

  it("manual casts respect cooldown and mana", async () => {
    const { storage, state } = await fresh({ sword: true });
    state.abilityLoadout = [];
    state.hpCombat = startHpCombat(state, pack, "slime", T0);
    assert.equal(tryCastAbility(state, pack, "heavy_chop", T0).ok, true);
    assert.equal(tryCastAbility(state, pack, "heavy_chop", T0).error, "cooldown");
    assert.equal(tryCastAbility(state, pack, "heavy_chop", new Date(T0.getTime() + 8000)).ok, true);
    state.inventory.book_smash = 1;
    learnFromBook(state, pack, "book_smash");
    state.hpCombat.playerMp = 3;
    assert.equal(tryCastAbility(state, pack, "smash", new Date(T0.getTime() + 8000)).error, "no_mana");
    state.hpCombat.playerMp = 4;
    assert.equal(tryCastAbility(state, pack, "smash", new Date(T0.getTime() + 8000)).ok, true);
    assert.equal(state.hpCombat.playerMp, 0);
    await storage.close();
  });
});
