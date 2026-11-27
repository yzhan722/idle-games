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
  astralRelicsCombatExtras,
  combatSheetFromPack,
  combinedBuildFromState,
} from "./combatSheet";
import { previewFight } from "./fightPreview";
import {
  T1_ASSET_CACHE_VERSION,
  WL9_ASTRAL_RELICS_ART_IDS,
  withAssetCacheVersion,
} from "./t1Art";
import {
  ASTRAL_CURATOR_TIERS,
  ASTRAL_RUIN_STRATA,
  ASTRAL_VEIN_CADENCE,
  FULL_GALLERY_RESONANCE_TIERS,
  SACRED_RELIC_PEDESTALS,
  getAstralCuratorTier,
  getAstralRelicsBonuses,
  getFullGalleryResonance,
  previewExpeditionSurveyYield,
} from "./astralRelics";

const t1Root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../assets/t1");
const frontendSrcRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("WL-9 frontend art contract, navigation IA, zero-SVG/Emoji/flicker guard, and Sacred Relic helpers", () => {
  it("registers all 6 WL-9 hand-painted RGBA .webp icons in T1 contract and keeps a dated wl cache version", () => {
    assert.match(T1_ASSET_CACHE_VERSION, /^\d{8}wl\d+$/);
    assert.equal(WL9_ASTRAL_RELICS_ART_IDS.length, 6);

    for (const id of WL9_ASTRAL_RELICS_ART_IDS) {
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
      withAssetCacheVersion("/assets/astral_ruin_compass.webp"),
      `/assets/astral_ruin_compass.webp?v=${T1_ASSET_CACHE_VERSION}`
    );
  });

  it("wires 'relics' into CAREER_GROUPS, GameHeader, AdventurePanel, NewGameInterface, and enforces zero SVG/Emoji + anti-remount", () => {
    assert.equal(CAREER_GROUPS.length, 4);
    const endgameGroup = CAREER_GROUPS.find((g) => g.title === "远期");
    assert.ok(endgameGroup);
    assert.equal(endgameGroup.items.includes("relics"), true);

    const advSrc = readAdvancementPanels(frontendSrcRoot);
    const arIndex = advSrc.indexOf("export function AstralRelicsPanel");
    assert.ok(arIndex > 0, "AstralRelicsPanel must be exported in AdvancementPanels.tsx");
    const arSlice = advSrc.slice(arIndex);
    assert.equal(/<svg[\s>]/i.test(arSlice), false, "AstralRelicsPanel must not contain inline <svg>");
    assert.equal(
      /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(arSlice),
      false,
      "AstralRelicsPanel must not contain Emoji"
    );
    assert.equal(
      arSlice.includes("[toast]"),
      false,
      "AstralRelicsPanel load callback must use toastRef rather than [toast] dependency"
    );
    assert.equal(
      arSlice.includes("loading && !info"),
      true,
      "AstralRelicsPanel must preserve mounted .ar-panel-root once info is loaded"
    );
    assert.equal(
      arSlice.includes('data-testid="astral-relics-panel"'),
      true,
      'AstralRelicsPanel must expose data-testid="astral-relics-panel"'
    );

    const adventureSrc = readFileSync(path.join(frontendSrcRoot, "components/AdventurePanel.tsx"), "utf8");
    assert.equal(
      adventureSrc.includes('data-testid="open-astral-relics-btn"'),
      true,
      'AdventurePanel must expose data-testid="open-astral-relics-btn" on the adventure banner'
    );

    const headerSrc = readFileSync(path.join(frontendSrcRoot, "components/GameHeader.tsx"), "utf8");
    assert.equal(headerSrc.includes('"header-relics-shortcut-btn"'), true);

    const ngiSrc = readFileSync(path.join(frontendSrcRoot, "components/NewGameInterface.tsx"), "utf8");
    assert.equal(ngiSrc.includes("<AstralRelicsPanel"), true, "NewGameInterface must mount <AstralRelicsPanel />");

    const advCss = readFileSync(path.join(frontendSrcRoot, "components/AdvancementPanels.css"), "utf8");
    assert.equal(
      advCss.includes(".ar-survey-btn.astral:not(:disabled)"),
      true,
      "AdvancementPanels.css must scope astral button gradient to :not(:disabled) to preserve disabled contrast"
    );
    assert.equal(
      /\.ar-survey-btn\.astral\s*\{/.test(advCss),
      false,
      "AdvancementPanels.css must not define unscoped .ar-survey-btn.astral overriding .prog-claim-btn:disabled"
    );
  });

  it("evaluates Astral Expedition survey previews, Full-Gallery Resonance, combatSheet stats, and Solar Spear hit amp in previewFight", () => {
    assert.equal(ASTRAL_RUIN_STRATA.length, 3);
    assert.equal(ASTRAL_CURATOR_TIERS.length, 6);
    assert.equal(SACRED_RELIC_PEDESTALS.length, 4);
    assert.equal(FULL_GALLERY_RESONANCE_TIERS.length, 5);
    assert.equal(ASTRAL_VEIN_CADENCE, 3);

    // 2 completed surveys -> next (#3) is vein jackpot!
    const pNormal = previewExpeditionSurveyYield("outpost_ruins", "free", 0, 1);
    const pJackpot = previewExpeditionSurveyYield("outpost_ruins", "free", 2, 1);
    assert.equal(pNormal.isVeinJackpot, false);
    assert.equal(pJackpot.isVeinJackpot, true);
    assert.ok(pJackpot.shardsGained > pNormal.shardsGained);

    assert.equal(getAstralCuratorTier(300, 1).current.level, 4);
    assert.equal(getFullGalleryResonance({ solar_spear: 2, verdant_chalice: 2, titan_anvil: 2, chimera_censer: 0 }), null);
    assert.equal(
      getFullGalleryResonance({ solar_spear: 3, verdant_chalice: 4, titan_anvil: 5, chimera_censer: 3 })?.tier,
      3
    );

    const baseState: any = {
      combatLevel: 15,
      combatSkills: {
        melee: { level: 22, xp: 0 },
        attack: { level: 18, xp: 0 },
        defense: { level: 16, xp: 0 },
        stamina: { level: 16, xp: 0 },
      },
      inventory: { weapon_iron_sword: 1 },
      equipment: { main_hand: "weapon_iron_sword" },
    };

    const boostedState: any = {
      ...baseState,
      astralRelics: {
        expeditionXp: 900,
        curatorRank: 6,
        pedestalRanks: {
          solar_spear: 5,
          verdant_chalice: 5,
          titan_anvil: 5,
          chimera_censer: 5,
        },
      },
    };

    const extras = astralRelicsCombatExtras(boostedState);
    assert.equal(extras.fullGalleryResonanceTier, 5);
    assert.ok(extras.relicCritAmpPct > 0);
    assert.ok(extras.armorPenPct > 0);
    assert.ok(extras.bossArmorBreakPct > 0);

    const build = combinedBuildFromState(boostedState);
    assert.equal(build.relicCritAmpPct, extras.relicCritAmpPct);

    const baseSheet = combatSheetFromPack(baseState, packJson.items as any, packJson.equipmentSets as any);
    const boostSheet = combatSheetFromPack(boostedState, packJson.items as any, packJson.equipmentSets as any);
    assert.ok(boostSheet.atk > baseSheet.atk);
    assert.ok(boostSheet.def > baseSheet.def);
    assert.ok(boostSheet.hp > baseSheet.hp);
    assert.ok((boostSheet.critRatePct || 0) > (baseSheet.critRatePct || 0));
    assert.ok((boostSheet.critDmgPct || 0) > (baseSheet.critDmgPct || 0));
    assert.ok((boostSheet.goldMult || 1) > (baseSheet.goldMult || 1));
    assert.equal(boostSheet.dropMult, baseSheet.dropMult, "rare find is applied once, by the server (getRareFindMultiplier)");

    const bossTarget: any = {
      id: "astral_boss",
      name: "太初星骸巨神BOSS",
      isBoss: true,
      hp: 1500,
      atk: 30,
      def: 90,
      level: 25,
    };
    const basePreview = previewFight(baseSheet, bossTarget);
    const boostPreview = previewFight(boostSheet, bossTarget);
    assert.ok(boostPreview.normalHit > basePreview.normalHit);
    assert.ok(boostPreview.heavyHit > basePreview.heavyHit);

    const bonuses = getAstralRelicsBonuses(boostedState);
    assert.equal(bonuses.alchemyBatchBonusCharges, 3);
  });

  it("leaves combatSheetFromPack and previewFight 100% untouched when astralRelics is absent or all pedestals are Lv.0", () => {
    const cleanState: any = {
      combatLevel: 10,
      inventory: { weapon_wooden_sword: 1 },
      equipment: { main_hand: "weapon_wooden_sword" },
    };
    const emptyRelicsState: any = {
      ...cleanState,
      astralRelics: {
        expeditionXp: 0,
        curatorRank: 1,
        pedestalRanks: {
          solar_spear: 0,
          verdant_chalice: 0,
          titan_anvil: 0,
          chimera_censer: 0,
        },
      },
    };
    const s1 = combatSheetFromPack(cleanState, packJson.items as any, packJson.equipmentSets as any);
    const s2 = combatSheetFromPack(emptyRelicsState, packJson.items as any, packJson.equipmentSets as any);
    assert.deepEqual(s2, s1);
    assert.equal("relicCritAmpPct" in s1, false);
  });

  it("caps Curator Tier progress at 100% on Lv.6 and honors storedRank XP floor on legacy saves", () => {
    const repaired = getAstralCuratorTier(0, 5);
    assert.equal(repaired.current.level, 5);
    assert.equal(repaired.effectiveXp, ASTRAL_CURATOR_TIERS[4].minXp);
    const maxed = getAstralCuratorTier(9999, 6);
    assert.equal(maxed.current.level, 6);
    assert.equal(maxed.progressPct, 100);
    assert.equal(maxed.next, null);
  });
});
