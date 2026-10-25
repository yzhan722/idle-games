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
import { mechanicParam, resolveMechanicDefs } from "../frontend/src/gameplay/bossMechanics";
import { mechanicDefsFor } from "../backend/src/boss_mechanics";

const pack = enhancedContentPack as EnhancedContentPack;
// 本测试对照的是战斗数学而非等级门：摘掉 act_combat_* 的 skillLevel 需求，
// 否则低等级配装打不进 monkey/crab/forest_boss
const fightPack = {
  ...pack,
  actions: (pack.actions as any[]).map((a: any) =>
    String(a.id).startsWith("act_combat_") ? { ...a, requirements: {} } : a
  ),
} as EnhancedContentPack;
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

/** A pack monster the way the UI sees it: `encounterStages` attaches `mechanicDefs` resolved from the pack table. */
const monster = (id: string) => {
  const m = (pack.monsters as any[]).find((x) => x.id === id);
  return { ...m, mechanicDefs: resolveMechanicDefs(m.mechanics, pack.bossMechanics as any) };
};

/** Replay through the real backend in 1s ticks (the client polls once a second). */
function replayBackend(state: any, monsterId: string) {
  state.hpCombat = startHpCombat(state, fightPack, monsterId, T0);
  let ms = 0;
  while (!state.hpCombat.outcome && ms < 10 * 60_000) {
    tickHpCombat(state, fightPack, new Date(T0.getTime() + ms + 1000), 1000, () => 0.99);
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
  // big HP pool: a 5%-of-max-HP charged hit out-damages the boss's normal swing here
  ["stamina 40 sword+chest+bark", { sword: true, chest: true, build: "thick_bark", skills: { stamina: 40, attack: 20, defense: 20, melee: 20 } }],
  ["stamina 40 + 坚守 auto + heavy", { sword: true, chest: true, skills: { stamina: 40, attack: 20, defense: 20, melee: 20, intelligence: 20 }, abilities: [{ abilityId: "brace" }, { abilityId: "heavy_chop" }] }],
  ["stamina 60 + heal below 50%", { sword: true, chest: true, skills: { stamina: 60, attack: 25, defense: 25, melee: 25, intelligence: 20 }, abilities: [{ abilityId: "minor_heal", trigger: { type: "self_hp_below", pct: 50 } }, { abilityId: "heavy_chop" }] }],
  // Long fights: timed mechanics (miasma ticks, frost windows, eruptions) only matter once a fight outlasts
  // the first 15-20 s, so these loadouts trade damage for survivability and drag the fight out.
  ["grinder: big pool, tiny damage, nothing equipped", { sword: true, chest: true, skills: { stamina: 80, defense: 60, attack: 8, melee: 8 }, abilities: [] }],
  ["grinder + heavy always", { sword: true, chest: true, skills: { stamina: 80, defense: 60, attack: 10, melee: 10, intelligence: 10 }, abilities: [{ abilityId: "heavy_chop" }] }],
  ["grinder + heavy only on guard", { sword: true, chest: true, skills: { stamina: 80, defense: 60, attack: 12, melee: 12, intelligence: 10 }, abilities: [{ abilityId: "heavy_chop", trigger: { type: "enemy_guard" } }] }],
  ["grinder + brace + heal + heavy(guard)", {
    sword: true,
    chest: true,
    skills: { stamina: 70, defense: 50, attack: 15, melee: 15, intelligence: 30 },
    abilities: [
      { abilityId: "brace" },
      { abilityId: "minor_heal", trigger: { type: "self_hp_below", pct: 70 } },
      { abilityId: "heavy_chop", trigger: { type: "enemy_guard" } },
    ],
  }],
  ["strong tank + brace + heal + heavy(guard)", {
    sword: true,
    chest: true,
    skills: { stamina: 100, defense: 80, attack: 30, melee: 30, intelligence: 40 },
    abilities: [
      { abilityId: "brace" },
      { abilityId: "minor_heal", trigger: { type: "self_hp_below", pct: 70 } },
      { abilityId: "heavy_chop", trigger: { type: "enemy_guard" } },
    ],
  }],
  ["strong tank + heal only", {
    sword: true,
    chest: true,
    skills: { stamina: 100, defense: 80, attack: 30, melee: 30, intelligence: 40 },
    abilities: [{ abilityId: "minor_heal", trigger: { type: "self_hp_below", pct: 70 } }],
  }],
  ["fragile glass cannon (dies mid-fight)", { sword: true, chest: true, skills: { stamina: 15, defense: 15, attack: 30, melee: 30, intelligence: 20 }, abilities: [{ abilityId: "brace" }, { abilityId: "heavy_chop" }] }],
];

describe("boss mechanic table", () => {
  const KINDS: Record<string, string[]> = {
    guard: ["telegraphRatio", "startRatio", "endRatio", "incomingMult"],
    wrath: ["startRatio", "intervalMult", "minIntervalMs"],
    charge: ["everyNth", "maxHpPct"],
    miasma: ["maxStacks", "tickMs", "maxHpPctPerStack"],
    frost: ["periodMs", "durationMs", "incomingMult"],
    eruption: ["periodMs", "warnMs", "maxHpPct"],
  };
  it("every mechanic a monster lists exists in the pack table, with a kind both sides implement and all its numbers", () => {
    const table = (pack.bossMechanics || []) as any[];
    assert.ok(table.length >= 2, "pack has a bossMechanics table");
    assert.equal(new Set(table.map((d) => d.id)).size, table.length, "unique ids");
    for (const d of table) {
      assert.ok(KINDS[d.kind], `${d.id}: kind "${d.kind}" is not implemented`);
      assert.ok(d.label, `${d.id}: label`);
      for (const key of KINDS[d.kind]) assert.doesNotThrow(() => mechanicParam(d, key), `${d.id}.${key}`);
    }
    for (const m of pack.monsters as any[]) {
      for (const id of m.mechanics || []) assert.ok(table.some((d) => d.id === id), `${m.id} lists unknown mechanic ${id}`);
    }
  });

  it("backend and frontend resolve the same definitions for every monster", () => {
    for (const m of pack.monsters as any[]) {
      assert.deepEqual(resolveMechanicDefs(m.mechanics, pack.bossMechanics as any), mechanicDefsFor(pack, m), m.id);
    }
  });

  it("the forest boss resolves its guard and wrath from data", () => {
    const defs = monster("forest_boss").mechanicDefs;
    assert.deepEqual(defs.map((d: any) => d.kind), ["guard", "wrath"]);
    assert.equal(defs[0].params.incomingMult, 0.45);
  });
});

describe("fight preview parity with backend hp_combat", () => {
  // every zone boss too: new boss mechanics land per boss, and each must replay identically in the preview
  for (const monsterId of ["slime", "monkey", "crab", "forest_boss", "mine_boss", "swamp_boss", "snow_boss", "volcano_boss"]) {
    for (const [label, loadout] of LOADOUTS) {
      it(`${monsterId} / ${label}`, async () => {
        const { storage, state } = await makePlayer(loadout);
        const sheet = combatSheetFromPack(state as any, pack.items as any, (pack as any).equipmentSets);
        const abilities = previewAbilities(state.abilityLoadout, state.abilities, abilityCatalog() as any, abilitySlotCount(state as any));
        const preview = previewFight(sheet, monster(monsterId), abilities);
        const real = replayBackend(state, monsterId);
        if (process.env.PARITY_DEBUG) console.log(`DBG ${monsterId} / ${label}: ${preview.won ? "win" : "loss"} ${Math.round(preview.durationMs / 1000)}s hp ${preview.playerHpLeft}`);
        assert.equal(preview.won, real.outcome === "win", `outcome (${JSON.stringify(real)} vs ${JSON.stringify(preview)})`);
        assert.equal(preview.playerHpLeft, real.playerHp, "player hp left");
        assert.equal(preview.enemyHpLeft, real.enemyHp, "enemy hp left");
        await storage.close();
      });
    }
  }

  it("labels follow outcome: sword-only beats slime, but monkey's speed is a real wall", async () => {
    const { storage, state } = await makePlayer({ sword: true });
    const sheet = combatSheetFromPack(state as any, pack.items as any, (pack as any).equipmentSets);
    const abilities = previewAbilities(state.abilityLoadout, state.abilities, abilityCatalog() as any, 1);
    const slime = previewFight(sheet, monster("slime"), abilities);
    assert.equal(slime.won, true);
    assert.notEqual(difficultyFromPreview(slime), "危险");
    // The fast mob shreds an unarmored swordsman — forest's first real gear check.
    const monkey = previewFight(sheet, monster("monkey"), abilities);
    assert.equal(monkey.won, false);
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
