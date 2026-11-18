import assert from "node:assert/strict";
import { describe, it } from "node:test";
import packJson from "../shared/enhanced_content_pack_chinese.json";
import type { EnhancedContentPack, GuildTrialPactId, StarEmblemId } from "../backend/src/types";
import {
  GUILD_PACT_LINK_TIERS as BE_LINK_TIERS,
  GUILD_PACT_MAX_SLOTS as BE_MAX_SLOTS,
  GUILD_TRIAL_PACTS as BE_PACTS,
  GUILD_TRIAL_PACT_IDS as BE_PACT_IDS,
  PACT_MITIGATION_EMBLEM_LEVEL as BE_MIT_LEVEL,
  PACT_MITIGATION_FORGE_TIER as BE_MIT_TIER,
  SKY_FORGE_MAX_TOTAL_LEVELS as BE_MAX_TOTAL,
  SKY_FORGE_NEGATIVE_FLOOR_PCT as BE_FLOOR,
  SKY_FORGE_TIERS as BE_FORGE_TIERS,
  STAR_EMBLEMS as BE_EMBLEMS,
  STAR_EMBLEM_FORGE_COSTS as BE_FORGE_COSTS,
  STAR_EMBLEM_IDS as BE_EMBLEM_IDS,
  STAR_EMBLEM_MAX_LEVEL as BE_MAX_LEVEL,
  effectivePactTradeoffs as beEffectiveTradeoffs,
  ensureAstralRelics,
  ensureSkyForge,
  getGuildPactLinkTier as beLinkTier,
  getSkyForgeBonuses as beForgeBonuses,
  getSkyForgeTier as beForgeTier,
  isPactTradeoffMitigated as beMitigated,
  sanitizeActivePacts as beSanitize,
} from "../backend/src/progression2";
import { defaultEnhancedPlayerState } from "../backend/src/storage";
import { hitDamage, monsterCombatant, playerCombatant } from "../backend/src/first_hour_combat";
import { playerBuildExtras, startHpCombat } from "../backend/src/hp_combat";
import { combatSheetFromPack, combinedBuildFromState } from "../frontend/src/gameplay/combatSheet";
import { previewFight } from "../frontend/src/gameplay/fightPreview";
import {
  GUILD_PACT_LINK_TIERS as FE_LINK_TIERS,
  GUILD_PACT_MAX_SLOTS as FE_MAX_SLOTS,
  GUILD_TRIAL_PACTS as FE_PACTS,
  GUILD_TRIAL_PACT_IDS as FE_PACT_IDS,
  PACT_MITIGATION_EMBLEM_LEVEL as FE_MIT_LEVEL,
  PACT_MITIGATION_FORGE_TIER as FE_MIT_TIER,
  SKY_FORGE_MAX_TOTAL_LEVELS as FE_MAX_TOTAL,
  SKY_FORGE_NEGATIVE_FLOOR_PCT as FE_FLOOR,
  SKY_FORGE_TIERS as FE_FORGE_TIERS,
  STAR_EMBLEMS as FE_EMBLEMS,
  STAR_EMBLEM_FORGE_COSTS as FE_FORGE_COSTS,
  STAR_EMBLEM_IDS as FE_EMBLEM_IDS,
  STAR_EMBLEM_MAX_LEVEL as FE_MAX_LEVEL,
  effectivePactTradeoffs as feEffectiveTradeoffs,
  getGuildPactLinkTier as feLinkTier,
  getSkyForgeBonuses as feForgeBonuses,
  getSkyForgeTier as feForgeTier,
  isPactTradeoffMitigated as feMitigated,
  sanitizeActivePacts as feSanitize,
} from "../frontend/src/gameplay/skyForge";

const pack = packJson as EnhancedContentPack;

/** Every ordered selection of 0..3 distinct pacts (1 + 5 + 20 + 60 = 86 sequences). */
function pactSequences(): GuildTrialPactId[][] {
  const out: GuildTrialPactId[][] = [[]];
  const ids = BE_PACT_IDS as readonly GuildTrialPactId[];
  for (const a of ids) {
    out.push([a]);
    for (const b of ids) {
      if (b === a) continue;
      out.push([a, b]);
      for (const c of ids) {
        if (c === a || c === b) continue;
        out.push([a, b, c]);
      }
    }
  }
  return out;
}

describe("WL-10 backend <-> frontend Sky Forge Star Emblem Codex & Guild Trial Pact Array 1:1 parity", () => {
  const T0 = new Date("2026-11-17T12:00:00.000Z");

  it("keeps every static WL-10 table, constant and pure helper 1:1 identical", () => {
    assert.deepEqual(FE_EMBLEM_IDS, BE_EMBLEM_IDS);
    assert.deepEqual(FE_PACT_IDS, BE_PACT_IDS);
    assert.deepEqual(FE_EMBLEMS, BE_EMBLEMS);
    assert.deepEqual(FE_FORGE_COSTS, BE_FORGE_COSTS);
    assert.deepEqual(FE_FORGE_TIERS, BE_FORGE_TIERS);
    assert.deepEqual(FE_PACTS, BE_PACTS);
    assert.deepEqual(FE_LINK_TIERS, BE_LINK_TIERS);
    assert.equal(FE_MAX_LEVEL, BE_MAX_LEVEL);
    assert.equal(FE_MAX_TOTAL, BE_MAX_TOTAL);
    assert.equal(FE_MAX_SLOTS, BE_MAX_SLOTS);
    assert.equal(FE_MIT_LEVEL, BE_MIT_LEVEL);
    assert.equal(FE_MIT_TIER, BE_MIT_TIER);
    assert.equal(FE_FLOOR, BE_FLOOR);

    for (let total = -2; total <= 22; total++) {
      assert.deepEqual(feForgeTier(total), beForgeTier(total), `forge tier mismatch at total ${total}`);
    }
    for (let n = 0; n <= 4; n++) assert.deepEqual(feLinkTier(n), beLinkTier(n));

    const dirty: unknown[] = [
      null,
      "ember_vanguard",
      ["ember_vanguard", "ember_vanguard", "bogus", 7, "astral_covenant", "gale_hunt", "forge_oath"],
      ["astral_covenant", "verdant_harvest", "gale_hunt", "forge_oath", "ember_vanguard"],
    ];
    for (const raw of dirty) {
      for (let total = 0; total <= 20; total++) {
        assert.deepEqual(feSanitize(raw, total), beSanitize(raw, total));
      }
    }
    for (const pact of BE_PACTS) {
      const fePact = FE_PACTS.find((p) => p.id === pact.id)!;
      for (const mitigated of [false, true]) {
        assert.deepEqual(feEffectiveTradeoffs(fePact, mitigated), beEffectiveTradeoffs(pact, mitigated));
      }
      for (let lv = 0; lv <= 5; lv++) {
        for (let tier = 0; tier <= 4; tier++) {
          const levels = { star_blade: lv, crescent_bow: lv, star_hammer: lv, amethyst_staff: lv };
          assert.equal(feMitigated(fePact, levels, tier), beMitigated(pact, levels, tier));
        }
      }
    }
  });

  it("matches getSkyForgeBonuses across all 1296 emblem level combos x 86 ordered pact sequences", () => {
    const seqs = pactSequences();
    assert.equal(seqs.length, 86);
    let checked = 0;
    for (let a = 0; a <= 5; a++) {
      for (let b = 0; b <= 5; b++) {
        for (let c = 0; c <= 5; c++) {
          for (let d = 0; d <= 5; d++) {
            const emblemLevels: Record<StarEmblemId, number> = {
              star_blade: a,
              crescent_bow: b,
              star_hammer: c,
              amethyst_staff: d,
            };
            for (const activePacts of seqs) {
              const holder = { skyForge: { emblemLevels, activePacts, totalForges: 0, totalPactsSigned: 0 } };
              const be = beForgeBonuses(holder as any);
              const fe = feForgeBonuses(holder);
              if (JSON.stringify(fe) !== JSON.stringify(be)) {
                assert.deepEqual(fe, be, `bonus mismatch levels=${JSON.stringify(emblemLevels)} pacts=${activePacts}`);
              }
              checked += 1;
            }
          }
        }
      }
    }
    assert.equal(checked, 1296 * 86);
    assert.deepEqual(feForgeBonuses(null), beForgeBonuses(null));
    assert.deepEqual(feForgeBonuses({ skyForge: null }), beForgeBonuses({ skyForge: undefined }));
  });

  it("keeps combat build, combat sheet, HP combat and normal/Boss hit damage 1:1 with WL-9 relics stacked", () => {
    const fightPack = {
      ...pack,
      actions: (pack.actions as any[]).map((x: any) =>
        String(x.id).startsWith("act_combat_") ? { ...x, requirements: {} } : x
      ),
    } as EnhancedContentPack;
    const normalMonster =
      (pack.monsters as any[]).find((m) => !m.isBoss && Number(m.def || 0) > 10) || (pack.monsters as any[])[0];
    const bossMonster =
      (pack.monsters as any[]).find((m) => m.isBoss && Number(m.def || 0) > 10) || {
        ...(pack.monsters as any[])[0],
        id: "parity_sky_forge_boss",
        name: "星穹锻炉守卫BOSS",
        isBoss: true,
        hp: 1400,
        atk: 32,
        def: 96,
      };

    const cases: Array<{ levels: Record<StarEmblemId, number>; pacts: GuildTrialPactId[]; relics: boolean }> = [
      { levels: { star_blade: 0, crescent_bow: 0, star_hammer: 0, amethyst_staff: 0 }, pacts: [], relics: false },
      { levels: { star_blade: 1, crescent_bow: 1, star_hammer: 0, amethyst_staff: 0 }, pacts: ["ember_vanguard"], relics: false },
      { levels: { star_blade: 0, crescent_bow: 0, star_hammer: 1, amethyst_staff: 2 }, pacts: ["verdant_harvest"], relics: true },
      { levels: { star_blade: 3, crescent_bow: 2, star_hammer: 2, amethyst_staff: 1 }, pacts: ["ember_vanguard", "forge_oath"], relics: true },
      { levels: { star_blade: 4, crescent_bow: 4, star_hammer: 3, amethyst_staff: 2 }, pacts: ["gale_hunt", "verdant_harvest", "ember_vanguard"], relics: false },
      { levels: { star_blade: 2, crescent_bow: 5, star_hammer: 5, amethyst_staff: 4 }, pacts: ["astral_covenant", "gale_hunt", "forge_oath"], relics: true },
      { levels: { star_blade: 5, crescent_bow: 5, star_hammer: 5, amethyst_staff: 5 }, pacts: ["astral_covenant", "ember_vanguard", "gale_hunt"], relics: true },
    ];

    for (const cs of cases) {
      const state = defaultEnhancedPlayerState(pack.version || "1.0.0");
      state.combatLevel = 22;
      state.chapter1Build = "sharpened_edge";
      state.chapter2Build = "heavy_sunder";
      state.chapter3Build = "gale_flurry";
      state.inventory.weapon_iron_sword = 1;
      state.inventory.armor_cloth_chest = 1;
      (state.equipment as any).main_hand = "weapon_iron_sword";
      (state.equipment as any).chest = "armor_cloth_chest";
      if (cs.relics) {
        const ar = ensureAstralRelics(state, T0);
        ar.expeditionXp = 300;
        ar.curatorRank = 4;
        ar.pedestalRanks = { solar_spear: 3, verdant_chalice: 2, titan_anvil: 2, chimera_censer: 2 };
      }
      const sf = ensureSkyForge(state);
      sf.emblemLevels = { ...cs.levels };
      sf.activePacts = [...cs.pacts];

      const tag = `levels=${JSON.stringify(cs.levels)} pacts=${cs.pacts.join(",")}`;
      assert.deepEqual(feForgeBonuses(state as any), beForgeBonuses(state), tag);

      const beExt = playerBuildExtras(state);
      const feExt = combinedBuildFromState(state as any);
      assert.equal(feExt.atk, beExt.atk, tag);
      assert.equal(feExt.hp, beExt.hp, tag);
      assert.equal(feExt.def, beExt.def, tag);
      assert.equal(feExt.combatAtkPct, beExt.combatAtkPct, tag);
      assert.ok(Math.abs(feExt.armorPenPct - beExt.armorPenPct) < 1e-9, tag);
      assert.ok(Math.abs(feExt.bossArmorBreakPct - beExt.bossArmorBreakPct) < 1e-9, tag);
      assert.ok(Math.abs(feExt.intervalMult - beExt.intervalMult) < 1e-9, tag);
      assert.ok(Math.abs(feExt.goldMult - beExt.goldMult) < 1e-9, tag);
      assert.ok(Math.abs(feExt.dropMult - beExt.dropMult) < 1e-9, tag);
      assert.equal(feExt.critRateBonusPct, beExt.critRateBonusPct, tag);
      assert.equal(feExt.critDmgBonusPct, beExt.critDmgBonusPct, tag);

      const enc = startHpCombat(state, fightPack, normalMonster.id, T0);
      const sheet = combatSheetFromPack(state as any, pack.items as any, pack.equipmentSets as any);
      assert.equal(sheet.hp, enc.playerMaxHp, tag);
      assert.equal(sheet.intervalMs, enc.playerIntervalMs, tag);

      const bePlayer = playerCombatant(state, fightPack, {
        atk: beExt.atk,
        combatAtkPct: beExt.combatAtkPct,
        def: beExt.def,
        hp: beExt.hp,
        armorPenPct: beExt.armorPenPct,
        bossArmorBreakPct: beExt.bossArmorBreakPct,
        relicCritAmpPct: beExt.relicCritAmpPct,
        intervalMult: beExt.intervalMult,
      });
      assert.equal(sheet.atk, bePlayer.atk, `ATK mismatch ${tag}`);
      assert.equal(sheet.def, bePlayer.def, `DEF mismatch ${tag}`);
      assert.equal(
        previewFight(sheet, normalMonster as any).normalHit,
        hitDamage(bePlayer, monsterCombatant(normalMonster)),
        `normal hit mismatch ${tag}`
      );
      assert.equal(
        previewFight(sheet, bossMonster as any).normalHit,
        hitDamage(bePlayer, monsterCombatant(bossMonster)),
        `boss hit mismatch ${tag}`
      );
    }
  });
});
