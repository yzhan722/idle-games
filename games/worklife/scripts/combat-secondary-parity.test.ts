import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import packJson from "../shared/enhanced_content_pack_chinese.json";
import type { EnhancedContentPack } from "../backend/src/types";
import { createMemoryStorage } from "../backend/src/storage_memory";
import { startHpCombat, tickHpCombat } from "../backend/src/hp_combat";
import { abilityCatalog } from "../backend/src/abilities";
import { playerCombatant } from "../backend/src/first_hour_combat";
import { getBuffEffects } from "../backend/src/storage";
import { combatSheetFromPack, abilitySlotCount } from "../frontend/src/gameplay/combatSheet";
import { previewAbilities, previewFight } from "../frontend/src/gameplay/fightPreview";
import { resolveMechanicDefs } from "../frontend/src/gameplay/bossMechanics";
import { encounterStages } from "../frontend/src/gameplay/encounters";

const P = packJson as any;
const pack = {
  ...P,
  actions: P.actions.map((a: any) => (String(a.id).startsWith("act_combat_") ? { ...a, requirements: {} } : a)),
} as EnhancedContentPack;
const T0 = new Date("2026-09-03T00:00:00.000Z");
const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const monster = (id: string) => {
  const m = P.monsters.find((x: any) => x.id === id);
  return { ...m, mechanicDefs: resolveMechanicDefs(m.mechanics, P.bossMechanics) };
};

async function player(level: number, equipment: Record<string, string>, enhance = 0) {
  const storage = createMemoryStorage();
  const user = await storage.findOrCreateGuestUser(`sec-parity-${Math.random()}`);
  const state = (await storage.getOrCreatePlayerState(user.id, P.version)) as any;
  state.combatLevel = level;
  state.combatSkills = undefined;
  for (const [slot, id] of Object.entries(equipment)) {
    state.equipment[slot] = id;
    state.inventory[id] = 1;
    if (enhance) state.equipment.enhancementLevels[id] = enhance;
  }
  return { storage, state };
}

const LOADOUTS: Array<[string, number, Record<string, string>, number]> = [
  ["bow + leather", 24, { main_hand: "weapon_wooden_bow", chest: "armor_leather_chest", legs: "armor_leather_legs", feet: "armor_leather_boots", hands: "armor_leather_gloves" }, 0],
  ["bow + leather +10", 40, { main_hand: "weapon_wooden_bow_t2", chest: "armor_leather_chest", legs: "armor_leather_legs" }, 10],
  ["staff + cloth", 30, { main_hand: "weapon_staff_t3", chest: "armor_cloth_chest", legs: "armor_cloth_legs", accessory1: "swamp_crown" }, 0],
  ["steel + shield", 45, { main_hand: "weapon_steel_axe", chest: "armor_steel_chest", legs: "armor_steel_legs", feet: "armor_steel_boots", hands: "armor_steel_gloves", off_hand: "offhand_wooden_shield" }, 5],
  ["warden", 100, { main_hand: "weapon_warden_bow", head: "armor_warden_helm", chest: "armor_warden_chest", legs: "armor_warden_legs" }, 0],
  ["sage", 100, { main_hand: "weapon_arcane_scepter", head: "armor_arcane_sage_hood", chest: "armor_arcane_sage_robe", legs: "armor_arcane_sage_legs" }, 7],
  ["broken staff falls back to bare hands", 30, { main_hand: "weapon_staff_t3", chest: "armor_cloth_chest" }, 0],
];
const MONSTERS = ["slime", "crystal_bat", "rock_golem", "mine_boss", "vine_snake", "swamp_boss", "ice_golem", "snow_boss", "fire_bat", "volcano_boss", "shadow_crawler", "sky_guardian", "rift_stalker", "hellhound", "divine_phoenix", "omega_boss"];

describe("combat secondary stats: one formula on both sides", () => {
  it("the two copies of the formula file are identical", () => {
    assert.equal(read("../frontend/src/gameplay/combatSecondary.ts"), read("../backend/src/combat_secondary.ts"));
  });

  it("the character sheet shows exactly the stats the server fights with (gear, enhancement, buffs)", async () => {
    for (const [label, level, eq, enh] of LOADOUTS) {
      const { storage, state } = await player(level, eq, enh);
      if (label.startsWith("broken")) state.equipment.durability = { weapon_staff_t3: 0 };
      state.activeBuffs = ["tea_spirit", "drink_fine", "potion_iron_skin", "potion_arcane_surge", "soup_herbal"].map((id) => {
        const b = P.items.find((i: any) => i.id === id).effect.buff;
        return { id: b.id, name: b.name, sourceItemId: id, expiresAt: new Date(Date.now() + 3_600_000).toISOString(), stats: b.stats };
      });
      const server = playerCombatant(state, pack, { secondary: getBuffEffects(state).secondary });
      const sheet = combatSheetFromPack(state, P.items, P.equipmentSets);
      for (const key of ["accuracy", "evasion", "physResist", "elemResist", "damageType"] as const) {
        assert.equal(sheet[key], server[key], `${label}: ${key}`);
      }
      assert.ok(server.accuracy! > 0 && server.evasion! >= 12);
      await storage.close();
    }
  });

  for (const monsterId of MONSTERS) {
    it(`preview replays the server fight against ${monsterId}`, async () => {
      for (const [label, level, eq, enh] of LOADOUTS) {
        const { storage, state } = await player(level, eq, enh);
        if (label.startsWith("broken")) state.equipment.durability = { weapon_staff_t3: 0 };
        const sheet = combatSheetFromPack(state, P.items, P.equipmentSets);
        const abilities = previewAbilities(state.abilityLoadout, state.abilities, abilityCatalog() as any, abilitySlotCount(state));
        const preview = previewFight(sheet, monster(monsterId), abilities);
        state.hpCombat = startHpCombat(state, pack, monsterId, T0);
        let ms = 0;
        while (!state.hpCombat.outcome && ms < 10 * 60_000) {
          tickHpCombat(state, pack, new Date(T0.getTime() + ms + 1000), 1000, () => 0.99);
          ms += 1000;
        }
        const real = state.hpCombat;
        // a fight that outlasts the preview's 10-minute window has no outcome on the server yet
        if (real.outcome) assert.equal(preview.won, real.outcome === "win", `${label}: outcome`);
        assert.equal(preview.playerHpLeft, real.playerHp, `${label}: player hp`);
        assert.equal(preview.enemyHpLeft, real.enemyHp, `${label}: enemy hp`);
        await storage.close();
      }
    });
  }

  it("encounter cards carry the numbers the preview needs", () => {
    for (const stage of encounterStages(P)) for (const e of stage.encounters as any[]) {
      const m = P.monsters.find((x: any) => x.id === e.id);
      for (const key of ["accuracy", "evasion", "physResist", "elemResist", "damageType"]) assert.equal(e[key], m[key], `${e.id}.${key}`);
    }
  });
});
