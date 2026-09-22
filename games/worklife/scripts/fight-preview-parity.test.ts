import { describe, it } from "node:test";
import assert from "node:assert/strict";
import enhancedContentPack from "../shared/enhanced_content_pack_chinese.json";
import type { EnhancedContentPack } from "../backend/src/types";
import { createMemoryStorage } from "../backend/src/storage_memory";
import { startHpCombat, tickHpCombat, chooseBuild } from "../backend/src/hp_combat";
import { abilityCatalog, learnFromBook, setAbilityLoadout } from "../backend/src/abilities";
import { ensureCombatSkills } from "../backend/src/combat_skills";
import { previewFight, previewAbilities, difficultyFromPreview } from "../frontend/src/gameplay/fightPreview";
import { abilitySlotCount, combatSheetFromPack } from "../frontend/src/gameplay/combatSheet";

const pack = enhancedContentPack as EnhancedContentPack;
const T0 = new Date("2026-09-03T00:00:00.000Z");

type Loadout = {
  sword?: boolean;
  /** Any other main-hand weapon id (bow → ranged, staff → magic). */
  weapon?: string;
  chest?: boolean;
  build?: "sharpened_edge" | "thick_bark";
  /** Set every combat skill to this level (legacy combatLevel migration path). */
  combatLevel?: number;
  /** Individual skill overrides. */
  skills?: Partial<Record<"stamina" | "intelligence" | "attack" | "defense" | "melee", number>>;
  /** Ability slots (ids + optional trigger); undefined = innate 重劈 on "always", [] = no abilities. */
  abilities?: Array<{ abilityId: string; trigger?: { type: string; pct?: number } }>;
};

async function makePlayer(l: Loadout) {
  const storage = createMemoryStorage();
  const user = await storage.findOrCreateGuestUser(`parity-${Math.random()}`);
  const state = await storage.getOrCreatePlayerState(user.id, pack.version || "1.0.0");
  const eq = state.equipment as { main_hand?: string; chest?: string };
  if (l.sword) { state.inventory.weapon_wooden_sword = 1; eq.main_hand = "weapon_wooden_sword"; }
  if (l.weapon) { state.inventory[l.weapon] = 1; eq.main_hand = l.weapon; }
  if (l.chest) { state.inventory.armor_wood_chest = 1; eq.chest = "armor_wood_chest"; }
  if (l.combatLevel) { state.combatLevel = l.combatLevel; state.combatSkills = undefined; }
  const cs = ensureCombatSkills(state);
  for (const [id, level] of Object.entries(l.skills || {})) cs[id as keyof typeof cs].level = level as number;
  ensureCombatSkills(state);
  if (l.build) chooseBuild(state, l.build);
  if (l.abilities) {
    for (const s of l.abilities) {
      const book = abilityCatalog().find((a) => a.id === s.abilityId)?.bookItemId;
      if (book) { state.inventory[book] = 1; learnFromBook(state, pack, book); }
    }
    const res = setAbilityLoadout(state, l.abilities);
    assert.equal(res.ok, true, res.error);
  }
  return { storage, state };
}

const monster = (id: string) => (pack.monsters as any[]).find((m) => m.id === id);

/** Replay through the real backend in 1s ticks (the client polls once a second). */
function replayBackend(state: any, monsterId: string) {
  state.hpCombat = startHpCombat(state, pack, monsterId, T0);
  let ms = 0;
  while (!state.hpCombat.outcome && ms < 10 * 60_000) {
    tickHpCombat(state, pack, new Date(T0.getTime() + ms + 1000), 1000, () => 0.99);
    ms += 1000;
  }
  return { outcome: state.hpCombat.outcome as string | undefined, playerHp: state.hpCombat.playerHp as number, enemyHp: state.hpCombat.enemyHp as number };
}

const LOADOUTS: Array<[string, Loadout]> = [
  ["unarmed", {}],
  ["unarmed, no abilities", { abilities: [] }],
  ["sword", { sword: true }],
  ["sword+edge", { sword: true, build: "sharpened_edge" }],
  ["sword+chest+edge", { sword: true, chest: true, build: "sharpened_edge" }],
  ["sword+chest+bark", { sword: true, chest: true, build: "thick_bark" }],
  ["legacy lvl3 sword+chest+edge", { sword: true, chest: true, build: "sharpened_edge", combatLevel: 3 }],
  ["trained skills sword+chest", { sword: true, chest: true, skills: { stamina: 6, attack: 12, defense: 5, melee: 4, intelligence: 3 } }],
  ["int10 smash+heavy", { sword: true, chest: true, skills: { intelligence: 10 }, abilities: [{ abilityId: "smash" }, { abilityId: "heavy_chop" }] }],
  ["int20 brace+heal+heavy(guard)", {
    sword: true,
    skills: { intelligence: 20 },
    abilities: [
      { abilityId: "brace" },
      { abilityId: "minor_heal", trigger: { type: "self_hp_below", pct: 50 } },
      { abilityId: "heavy_chop", trigger: { type: "enemy_guard" } },
    ],
  }],
  ["int10 heavy below 50%", { sword: true, chest: true, skills: { intelligence: 10 }, abilities: [{ abilityId: "heavy_chop", trigger: { type: "enemy_hp_below", pct: 50 } }] }],
  ["bow (ranged main) + chest", { weapon: "weapon_wooden_bow", chest: true, skills: { ranged: 5, melee: 9 } }],
  ["staff (magic main, mag as atk)", { weapon: "weapon_staff_t1", chest: true, skills: { magic: 4 } }],
];

describe("fight preview parity with backend hp_combat", () => {
  for (const monsterId of ["slime", "monkey", "crab", "forest_boss"]) {
    for (const [label, loadout] of LOADOUTS) {
      it(`${monsterId} / ${label}`, async () => {
        const { storage, state } = await makePlayer(loadout);
        const sheet = combatSheetFromPack(state as any, pack.items as any, (pack as any).equipmentSets);
        const abilities = previewAbilities(state.abilityLoadout, state.abilities, abilityCatalog() as any, abilitySlotCount(state as any));
        const preview = previewFight(sheet, monster(monsterId), abilities);
        const real = replayBackend(state, monsterId);
        assert.equal(preview.won, real.outcome === "win", `outcome (${JSON.stringify(real)} vs ${JSON.stringify(preview)})`);
        assert.equal(preview.playerHpLeft, real.playerHp, "player hp left");
        assert.equal(preview.enemyHpLeft, real.enemyHp, "enemy hp left");
        await storage.close();
      });
    }
  }

  it("labels follow outcome, not level gap: fresh sword player vs Lv3 monkey is not 危险", async () => {
    const { storage, state } = await makePlayer({ sword: true });
    const sheet = combatSheetFromPack(state as any, pack.items as any, (pack as any).equipmentSets);
    const abilities = previewAbilities(state.abilityLoadout, state.abilities, abilityCatalog() as any, 1);
    const monkey = previewFight(sheet, monster("monkey"), abilities);
    assert.equal(monkey.won, true);
    assert.notEqual(difficultyFromPreview(monkey), "危险");
    const bossUnarmored = previewFight(sheet, monster("forest_boss"), abilities);
    assert.equal(difficultyFromPreview(bossUnarmored), "危险");
    await storage.close();
  });

  it("the innate loadout previews as heavy chop on 'always' even without a content catalog", async () => {
    const { storage, state } = await makePlayer({ sword: true });
    const sheet = combatSheetFromPack(state as any, pack.items as any, (pack as any).equipmentSets);
    const withCatalog = previewFight(sheet, monster("slime"), previewAbilities(state.abilityLoadout, state.abilities, abilityCatalog() as any, 1));
    const withoutCatalog = previewFight(sheet, monster("slime"), previewAbilities(state.abilityLoadout, state.abilities, undefined, 1));
    assert.deepEqual(withoutCatalog, withCatalog);
    assert.ok(withCatalog.heavyChops >= 1);
    await storage.close();
  });
});
