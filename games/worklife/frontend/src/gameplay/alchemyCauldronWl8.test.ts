import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { readAdvancementPanels } from "./advancementSource";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import packJson from "../../../shared/enhanced_content_pack_chinese.json";
import { T1_ASSET_KEYS, t1KeyFor } from "../assets/t1/keys";
import { specByKey } from "../assets/t1/contract";
import { CAREER_GROUPS } from "./ia";
import {
  alchemyCauldronCombatExtras,
  combatSheetFromPack,
  combinedBuildFromState,
} from "./combatSheet";
import { previewFight } from "./fightPreview";
import {
  T1_ASSET_CACHE_VERSION,
  WL8_ALCHEMY_CAULDRON_ART_IDS,
  withAssetCacheVersion,
} from "./t1Art";
import {
  ALCHEMICAL_POTIONS_META,
  CAULDRON_MASTERY_TIERS,
  TWIN_ALCHEMICAL_RESONANCES,
  findTwinResonance,
  getAlchemyCauldronBonuses,
} from "./alchemyCauldron";

const t1Root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../assets/t1");
const frontendSrcRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("WL-8 frontend art contract, navigation IA, zero-SVG/Emoji guard, and Chimera Cauldron helpers", () => {
  it("registers all 6 WL-8 hand-painted RGBA .webp icons in T1 contract and bumps cache version", () => {
    assert.match(T1_ASSET_CACHE_VERSION, /^\d{8}wl\d+$/);
    assert.equal(WL8_ALCHEMY_CAULDRON_ART_IDS.length, 6);

    for (const id of WL8_ALCHEMY_CAULDRON_ART_IDS) {
      const key = t1KeyFor("skills", id);
      assert.equal(key, `skills/${id}`);
      assert.ok((T1_ASSET_KEYS as readonly string[]).includes(key!), `Missing T1 key ${key}`);
      const spec = specByKey(key!);
      assert.ok(spec, `Missing T1 spec for ${key}`);
      assert.equal(spec?.profile, "icon");
      assert.equal(spec?.priority, "P2");
      const webpFile = path.join(t1Root, `${key}.webp`);
      assert.equal(existsSync(webpFile), true, `Missing .webp asset on disk: ${webpFile}`);
      assert.ok(statSync(webpFile).size > 2048, `Asset ${webpFile} unexpectedly small`);
    }

    assert.equal(
      withAssetCacheVersion("/assets/alchemy_cauldron_hub.webp"),
      `/assets/alchemy_cauldron_hub.webp?v=${T1_ASSET_CACHE_VERSION}`
    );
  });

  it("wires 'cauldron' into CAREER_GROUPS, GameHeader, NewGameInterface, and enforces zero SVG/Emoji + anti-remount", () => {
    assert.equal(CAREER_GROUPS.length, 4);
    const endgameGroup = CAREER_GROUPS.find((g) => g.title === "远期");
    assert.ok(endgameGroup);
    assert.equal(endgameGroup.items.includes("cauldron"), true);

    const advSrc = readAdvancementPanels(frontendSrcRoot);
    const acIndex = advSrc.indexOf("export function AlchemyCauldronPanel");
    assert.ok(acIndex > 0, "AlchemyCauldronPanel must be exported in AdvancementPanels.tsx");
    const acSlice = advSrc.slice(acIndex);
    assert.equal(/<svg[\s>]/i.test(acSlice), false, "AlchemyCauldronPanel must not contain inline <svg>");
    assert.equal(
      /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(acSlice),
      false,
      "AlchemyCauldronPanel must not contain Emoji"
    );
    assert.equal(
      acSlice.includes("[toast]"),
      false,
      "AlchemyCauldronPanel load callback must use toastRef rather than [toast] dependency"
    );
    assert.equal(
      acSlice.includes("loading && !info"),
      true,
      "AlchemyCauldronPanel must preserve mounted .ac-panel-root once info is loaded"
    );
    assert.equal(
      acSlice.includes('data-testid="alchemy-cauldron-panel"'),
      true,
      'AlchemyCauldronPanel must expose data-testid="alchemy-cauldron-panel"'
    );

    const ngiSrc = readFileSync(path.join(frontendSrcRoot, "components/NewGameInterface.tsx"), "utf8");
    assert.equal(
      ngiSrc.includes('data-testid="open-alchemy-cauldron-btn"'),
      true,
      'NewGameInterface must expose data-testid="open-alchemy-cauldron-btn" on the alchemy craft page'
    );
    assert.equal(
      ngiSrc.includes("<AlchemyCauldronPanel"),
      true,
      "NewGameInterface must mount <AlchemyCauldronPanel />"
    );
  });

  it("evaluates all 6 Twin Alchemical Resonance combos, combatSheet ATK% / goldMult, and Boss Armor Break % in previewFight", () => {
    assert.equal(ALCHEMICAL_POTIONS_META.length, 4);
    assert.equal(CAULDRON_MASTERY_TIERS.length, 6);
    assert.equal(TWIN_ALCHEMICAL_RESONANCES.length, 6);

    for (const r of TWIN_ALCHEMICAL_RESONANCES) {
      assert.equal(findTwinResonance(r.pair[0], r.pair[1])?.id, r.id);
      assert.equal(findTwinResonance(r.pair[1], r.pair[0])?.id, r.id);
    }
    assert.equal(findTwinResonance("dragon_fury", "dragon_fury"), null);

    const baseState: any = {
      combatLevel: 12,
      combatSkills: {
        melee: { level: 20, xp: 0 },
        defense: { level: 15, xp: 0 },
        stamina: { level: 15, xp: 0 },
      },
      inventory: { weapon_iron_sword: 1 },
      equipment: { main_hand: "weapon_iron_sword" },
    };

    const cauldronState: any = {
      ...baseState,
      alchemyCauldron: {
        alchemyCauldronRank: 4, // +7% combatAtk, +10% goldGain
        cauldronPoints: 250,
        recipeRanks: {
          dragon_fury: 4, // +16% combatAtk, +0.21 bossArmorBreak
          elven_bounty: 3,
          dwarven_temper: 4, // +21% craftSpeed, +19% craftEfficiency
          astral_fortune: 3,
        },
        potionCharges: {
          dragon_fury: 8,
          elven_bounty: 5,
          dwarven_temper: 8,
          astral_fortune: 5,
        },
        equippedPotions: ["dragon_fury", "dwarven_temper"], // 熔炉龙炎共鸣 Lv.4 (mult 1.45) -> +9% combatAtk, +0.116 bossArmorBreak
      },
    };

    const bonuses = getAlchemyCauldronBonuses(cauldronState);
    assert.equal(bonuses.activeResonanceId, "res_forge_dragonflame");
    assert.equal(bonuses.resonanceTier, 4);
    assert.equal(bonuses.combatAtkPct, 7 + 16 + 9);
    assert.ok(Math.abs(bonuses.bossArmorBreakPct - (0.21 + 0.116)) < 1e-9);

    const extras = alchemyCauldronCombatExtras(cauldronState);
    assert.equal(extras.combatAtkPct, 32);
    assert.ok(Math.abs(extras.bossArmorBreakPct - 0.326) < 1e-9);

    const build = combinedBuildFromState(cauldronState);
    assert.equal(build.combatAtkPct, 32);
    assert.ok(Math.abs(build.bossArmorBreakPct - 0.326) < 1e-9);
    assert.ok(build.goldMult > 1);

    const baseSheet = combatSheetFromPack(baseState, (packJson as any).items, (packJson as any).equipmentSets);
    const buffSheet = combatSheetFromPack(cauldronState, (packJson as any).items, (packJson as any).equipmentSets);
    assert.ok(buffSheet.atk > baseSheet.atk);

    // Verify bossArmorBreakPct only pierces Boss DEF in previewFight
    const sheetNoBreak = { ...buffSheet, bossArmorBreakPct: 0 };
    const normalMob = { id: "m_norm", hp: 400, atk: 15, def: 120, isBoss: false };
    const bossMob = { id: "m_boss", hp: 400, atk: 15, def: 120, isBoss: true };

    assert.equal(previewFight(buffSheet, normalMob).normalHit, previewFight(sheetNoBreak, normalMob).normalHit);
    assert.ok(previewFight(buffSheet, bossMob).normalHit > previewFight(sheetNoBreak, bossMob).normalHit);
  });
});
