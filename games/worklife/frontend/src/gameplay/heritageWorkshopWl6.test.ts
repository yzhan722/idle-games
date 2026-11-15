import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { T1_ASSET_KEYS, t1KeyFor } from "../assets/t1/keys";
import { specByKey } from "../assets/t1/contract";
import { CAREER_GROUPS } from "./ia";
import {
  combatSheetFromPack,
  combinedBuildFromState,
  heritageWorkshopCombatExtras,
} from "./combatSheet";
import { T1_ASSET_CACHE_VERSION, withAssetCacheVersion } from "./guildFrame";

const t1Root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../assets/t1");
const frontendSrcRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const WL6_ART_IDS = [
  "rune_altar_core",
  "rune_slot_weapon",
  "rune_slot_armor",
  "rune_slot_tool",
  "codex_set_forge",
  "codex_set_loom",
  "codex_set_hearth",
  "codex_set_arcane",
] as const;

describe("WL-6 frontend art contract, navigation IA, zero-SVG/Emoji guard, and combat sheet", () => {
  it("registers all 8 WL-6 hand-drawn RGBA .webp workshop icons in T1 contract with active cache-buster", () => {
    assert.match(T1_ASSET_CACHE_VERSION, /^20261115wl\d+$/);
    for (const id of WL6_ART_IDS) {
      const key = t1KeyFor("skills", id);
      assert.equal(key, `skills/${id}`);
      assert.ok((T1_ASSET_KEYS as readonly string[]).includes(key!), `Missing T1 key ${key}`);
      const spec = specByKey(key!);
      assert.ok(spec, `Missing T1 spec for ${key}`);
      assert.equal(spec?.profile, "icon");
      assert.equal(spec?.priority, "P2");
      const webpFile = path.join(t1Root, `${key}.webp`);
      assert.equal(existsSync(webpFile), true, `Missing .webp asset on disk: ${webpFile}`);
    }
    assert.equal(
      withAssetCacheVersion("/assets/rune_altar_core.webp"),
      `/assets/rune_altar_core.webp?v=${T1_ASSET_CACHE_VERSION}`
    );
  });

  it("wires 'workshop' into CAREER_GROUPS without breaking 4-group layout and enforces zero SVG/Emoji in WL-6 UI", () => {
    assert.equal(CAREER_GROUPS.length, 4);
    const endgameGroup = CAREER_GROUPS.find((g) => g.title === "远期");
    assert.ok(endgameGroup);
    assert.equal(endgameGroup.items.includes("workshop"), true);

    const advSrc = readFileSync(path.join(frontendSrcRoot, "components/AdvancementPanels.tsx"), "utf8");
    const hwIndex = advSrc.indexOf("export function HeritageWorkshopPanel");
    assert.ok(hwIndex > 0, "HeritageWorkshopPanel must be exported in AdvancementPanels.tsx");
    const hwSlice = advSrc.slice(hwIndex);
    assert.equal(/<svg[\s>]/i.test(hwSlice), false, "HeritageWorkshopPanel must not contain inline <svg>");
    assert.equal(
      /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(hwSlice),
      false,
      "HeritageWorkshopPanel must not contain Emoji"
    );
    assert.equal(
      hwSlice.includes("[toast]"),
      false,
      "HeritageWorkshopPanel load callback must use toastRef rather than [toast] dependency"
    );
    assert.equal(
      hwSlice.includes("loading && !info"),
      true,
      "HeritageWorkshopPanel must preserve mounted .hw-panel-root once info is loaded"
    );

    const enhSrc = readFileSync(path.join(frontendSrcRoot, "components/EnhancementPanel.tsx"), "utf8");
    assert.equal(
      enhSrc.includes('data-testid="open-heritage-workshop-btn"'),
      true,
      "EnhancementPanel should expose Heritage Workshop entry banner"
    );
  });

  it("computes heritageWorkshopCombatExtras and combatSheetFromPack accurately across runes & codex tiers", () => {
    const items = [
      { id: "weapon_wooden_sword", atk: 5 },
      { id: "armor_wood_chest", def: 8 },
    ];
    const baseState = {
      combatLevel: 1,
      inventory: { weapon_wooden_sword: 1, armor_wood_chest: 1 },
      equipment: { main_hand: "weapon_wooden_sword", chest: "armor_wood_chest" },
    };
    const baseSheet = combatSheetFromPack(baseState, items);
    assert.equal("armorPenPct" in baseSheet, false);
    assert.equal("thornsDefRatio" in baseSheet, false);

    const enrichedState = {
      ...baseState,
      heritageWorkshop: {
        runeRanks: {
          rune_sunder_edge: 4,
          rune_tempest_fang: 3,
          rune_bastion_ward: 3,
          rune_artisan_forge: 2,
        },
        equippedRunes: {
          weapon: "rune_sunder_edge" as const,
          armor: "rune_bastion_ward" as const,
          tool: "rune_artisan_forge" as const,
        },
        codexUnlockedItems: [
          "ore_1",
          "ingot_1",
          "weapon_iron_sword",
          "fiber_1",
          "yarn_1",
          "armor_cloth_chest",
          "wool",
          "food_simple",
          "armor_farmer_cloth_chest",
          "crystal_1",
          "potion_hp_t1",
          "weapon_staff_t1",
        ],
        claimedCodexMilestones: [],
      },
    };

    const hwExtras = heritageWorkshopCombatExtras(enrichedState);
    // rune_sunder_edge Lv.4: +16 ATK, +0.16 armorPen, +7.2% critRate
    // codex 4 tiers + codex_ms_4: +2 (forge T1) +2 (arcane T1) +3 (ms_4) = +7 ATK => total +23 ATK
    assert.equal(hwExtras.bonusAtk, 23);
    // rune_bastion_ward Lv.3: +9 DEF, +66 HP, +0.18 thorns; codex loom T1 (+2 DEF), hearth T1 (+18 HP), ms_4 (+25 HP)
    assert.equal(hwExtras.bonusDef, 11);
    assert.equal(hwExtras.bonusHp, 109);
    assert.equal(hwExtras.armorPenPct, 0.16);
    assert.equal(hwExtras.thornsDefRatio, 0.18);
    assert.equal(hwExtras.critRateBonusPct, 7.2);
    assert.equal(hwExtras.goldGainPct, 6);

    const sheet = combatSheetFromPack(enrichedState, items);
    assert.equal(sheet.atk, baseSheet.atk + 23);
    assert.equal(sheet.def, baseSheet.def + 11);
    assert.equal(sheet.hp, baseSheet.hp + 109);
    assert.equal(sheet.armorPenPct, 0.16);
    assert.equal(sheet.thornsDefRatio, 0.18);
    assert.ok((sheet.critRatePct ?? 0) > (baseSheet.critRatePct ?? 0));

    // Switch weapon rune to rune_tempest_fang Lv.3 -> faster intervalMs + critDmgPct
    enrichedState.heritageWorkshop.equippedRunes.weapon = "rune_tempest_fang" as any;
    const tempestSheet = combatSheetFromPack(enrichedState, items);
    assert.ok((tempestSheet.intervalMs ?? 0) < (baseSheet.intervalMs ?? 0), "rune_tempest_fang reduces attack intervalMs");
    assert.ok((tempestSheet.critDmgPct ?? 0) >= (baseSheet.critDmgPct ?? 0) + 24, "rune_tempest_fang increases critDmgPct");

    const build = combinedBuildFromState(enrichedState);
    assert.equal(build.goldMult, 1.06);
  });
});
