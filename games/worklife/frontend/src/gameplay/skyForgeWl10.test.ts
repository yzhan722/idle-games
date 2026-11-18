import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import packJson from "../../../shared/enhanced_content_pack_chinese.json";
import { T1_ASSET_KEYS, t1KeyFor } from "../assets/t1/keys";
import { specByKey } from "../assets/t1/contract";
import { rasterSize } from "../../../scripts/art-image-meta";
import { CAREER_GROUPS } from "./ia";
import { combatSheetFromPack, combinedBuildFromState, skyForgeCombatExtras } from "./combatSheet";
import { previewFight } from "./fightPreview";
import { T1_ASSET_CACHE_VERSION, WL10_SKY_FORGE_ART_IDS, withAssetCacheVersion } from "./t1Art";
import {
  GUILD_PACT_LINK_TIERS,
  GUILD_TRIAL_PACTS,
  SKY_FORGE_TIERS,
  STAR_EMBLEMS,
  STAR_EMBLEM_FORGE_COSTS,
  effectivePactTradeoffs,
  getGuildPactLinkTier,
  getSkyForgeBonuses,
  getSkyForgeTier,
  sanitizeActivePacts,
} from "./skyForge";

const t1Root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../assets/t1");
const frontendSrcRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("WL-10 frontend art contract, navigation IA, zero-SVG/Emoji guard and Sky Forge helpers", () => {
  it("registers the 6 WL-10 512x512 RGBA .webp icons in the T1 contract and keeps a dated wl cache version", () => {
    assert.match(T1_ASSET_CACHE_VERSION, /^\d{8}wl\d+$/);
    assert.deepEqual([...WL10_SKY_FORGE_ART_IDS], [
      "sky_forge",
      "star_emblem_blade",
      "star_emblem_bow",
      "star_emblem_hammer",
      "star_emblem_staff",
      "guild_trial_pact",
    ]);
    for (const id of WL10_SKY_FORGE_ART_IDS) {
      const key = t1KeyFor("skills", id)!;
      assert.equal(key, `skills/${id}`);
      assert.ok((T1_ASSET_KEYS as readonly string[]).includes(key), `Missing T1 key ${key}`);
      const spec = specByKey(key);
      assert.ok(spec, `Missing T1 spec for ${key}`);
      assert.equal(spec?.profile, "icon");
      assert.equal(spec?.priority, "P2");
      const webp = path.join(t1Root, `${key}.webp`);
      assert.equal(existsSync(webp), true, `Missing .webp asset on disk: ${webp}`);
      assert.ok(statSync(webp).size > 2048, `Asset ${webp} unexpectedly small`);
      const size = rasterSize(readFileSync(webp), "webp");
      assert.ok(size, `Unreadable webp ${webp}`);
      assert.ok(Math.min(size!.width, size!.height) >= 256, `${webp} below icon masterMinPx`);
    }
    assert.equal(
      withAssetCacheVersion("/assets/sky_forge.webp"),
      `/assets/sky_forge.webp?v=${T1_ASSET_CACHE_VERSION}`
    );
  });

  it("wires 'forge' into CAREER_GROUPS, GameHeader and NewGameInterface, and keeps SkyForgePanel free of SVG/Emoji/remount flicker", () => {
    const endgame = CAREER_GROUPS.find((g) => g.title === "远期");
    assert.ok(endgame);
    assert.equal(endgame.items.includes("forge"), true);
    assert.ok(endgame.items.indexOf("forge") > endgame.items.indexOf("relics"));

    const advSrc = readFileSync(path.join(frontendSrcRoot, "components/AdvancementPanels.tsx"), "utf8");
    const at = advSrc.indexOf("export function SkyForgePanel");
    assert.ok(at > 0, "SkyForgePanel must be exported from AdvancementPanels.tsx");
    const slice = advSrc.slice(advSrc.lastIndexOf("天空锻炉星辰神兵谱 & 公会秘境试炼契约阵 (WL-10)"));
    assert.equal(/<svg[\s>]/i.test(slice), false, "SkyForgePanel must not contain inline <svg>");
    assert.equal(/<canvas[\s>]/i.test(slice), false, "SkyForgePanel must not draw icons on <canvas>");
    assert.equal(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(slice), false, "SkyForgePanel must not contain Emoji");
    assert.equal(slice.includes("[toast]"), false, "load callback must use toastRef");
    assert.equal(slice.includes("loading && !info"), true, "panel root must stay mounted after first load");
    assert.equal(slice.includes('data-testid="sky-forge-panel"'), true);
    for (const id of WL10_SKY_FORGE_ART_IDS) {
      if (id.startsWith("star_emblem_")) continue; // emblem icons are data-driven via iconId
      assert.equal(slice.includes(`id="${id}"`), true, `SkyForgePanel must render T1Art ${id}`);
    }

    const headerSrc = readFileSync(path.join(frontendSrcRoot, "components/GameHeader.tsx"), "utf8");
    assert.equal(headerSrc.includes('data-testid="header-sky-forge-btn"'), true);
    assert.equal(headerSrc.includes('forge: "天空锻炉"'), true);
    const ngiSrc = readFileSync(path.join(frontendSrcRoot, "components/NewGameInterface.tsx"), "utf8");
    assert.equal(ngiSrc.includes("<SkyForgePanel"), true);

    const css = readFileSync(path.join(frontendSrcRoot, "components/AdvancementPanels.css"), "utf8");
    assert.equal(css.includes(".sf-sign-btn:not(:disabled)"), true);
    assert.equal(css.includes(".sf-revoke-btn:not(:disabled)"), true);
    assert.equal(/\.sf-sign-btn\s*\{/.test(css), false, "sign gradient must not override .prog-claim-btn:disabled");
    assert.equal(/\.sf-revoke-btn\s*\{/.test(css), false, "revoke style must not override .prog-claim-btn:disabled");
  });

  it("evaluates forge tiers, pact sanitising, trade-off halving and link tiers", () => {
    assert.equal(STAR_EMBLEMS.length, 4);
    assert.deepEqual(
      STAR_EMBLEMS.map((e) => e.name),
      ["星辉圣剑", "新月长弓", "星铁战锤", "紫晶法杖"]
    );
    assert.deepEqual(
      STAR_EMBLEMS.map((e) => e.iconId),
      ["star_emblem_blade", "star_emblem_bow", "star_emblem_hammer", "star_emblem_staff"]
    );
    assert.equal(STAR_EMBLEM_FORGE_COSTS.length, 5);
    assert.equal(GUILD_TRIAL_PACTS.length, 5);
    assert.ok(GUILD_TRIAL_PACTS.every((p) => Object.values(p.tradeoffs).every((v) => typeof v === "number" && v < 0 && v % 2 === 0)));
    assert.equal(SKY_FORGE_TIERS.length, 5);
    assert.equal(GUILD_PACT_LINK_TIERS.length, 2);

    assert.equal(getSkyForgeTier(1).current.pactSlots, 0);
    assert.equal(getSkyForgeTier(2).current.pactSlots, 1);
    assert.equal(getSkyForgeTier(7).current.pactSlots, 2);
    assert.equal(getSkyForgeTier(13).current.pactSlots, 3);
    assert.equal(getSkyForgeTier(20).current.tier, 4);
    assert.equal(getSkyForgeTier(20).progressPct, 100);
    assert.equal(getSkyForgeTier(99).totalEmblemLevels, 20);

    assert.deepEqual(sanitizeActivePacts(["gale_hunt", "ember_vanguard", "verdant_harvest", "forge_oath"], 8), [
      "ember_vanguard",
      "verdant_harvest",
    ]);
    const ember = GUILD_TRIAL_PACTS.find((p) => p.id === "ember_vanguard")!;
    assert.deepEqual(effectivePactTradeoffs(ember, false), { craftSpeedPct: -8 });
    assert.deepEqual(effectivePactTradeoffs(ember, true), { craftSpeedPct: -4 });
    assert.equal(getGuildPactLinkTier(1), null);
    assert.equal(getGuildPactLinkTier(2)?.linkTier, 1);
    assert.equal(getGuildPactLinkTier(3)?.linkTier, 2);

    const b = getSkyForgeBonuses({
      skyForge: {
        emblemLevels: { star_blade: 3, crescent_bow: 2, star_hammer: 2, amethyst_staff: 1 },
        activePacts: ["ember_vanguard", "forge_oath"],
      },
    });
    assert.equal(b.combatAtkPct, 20);
    assert.equal(b.craftSpeedPct, 17);
    assert.equal(b.gatherSpeedPct, 2);
    assert.equal(b.linkTitle, "双契连携·星辉共振");
  });

  it("feeds emblem + pact bonuses into combatSheetFromPack and previewFight (incl. negative trade-offs) and stays inert without skyForge", () => {
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
    const forged: any = {
      ...baseState,
      skyForge: {
        emblemLevels: { star_blade: 5, crescent_bow: 5, star_hammer: 5, amethyst_staff: 5 },
        activePacts: ["ember_vanguard", "gale_hunt", "astral_covenant"],
      },
    };
    const extras = skyForgeCombatExtras(forged);
    assert.equal(extras.forgeTier, 4);
    assert.equal(extras.linkTier, 2);
    assert.ok(extras.bossArmorBreakPct > 0);

    const build = combinedBuildFromState(forged);
    assert.equal(build.combatAtkPct, extras.combatAtkPct);

    const s0 = combatSheetFromPack(baseState, packJson.items as any, packJson.equipmentSets as any);
    const s1 = combatSheetFromPack(forged, packJson.items as any, packJson.equipmentSets as any);
    assert.ok(s1.atk > s0.atk);
    assert.ok(s1.def > s0.def);
    assert.ok(s1.hp > s0.hp);
    assert.ok((s1.intervalMs || 0) < (s0.intervalMs || 0));
    assert.ok((s1.critRatePct || 0) > (s0.critRatePct || 0));
    assert.ok((s1.critDmgPct || 0) > (s0.critDmgPct || 0));
    assert.ok((s1.armorPenPct || 0) > (s0.armorPenPct || 0));
    assert.ok((s1.dropMult || 1) > (s0.dropMult || 1));

    const boss: any = { id: "sky_boss", name: "星穹锻炉守卫BOSS", isBoss: true, hp: 1500, atk: 30, def: 90, level: 25 };
    assert.ok(previewFight(s1, boss).normalHit > previewFight(s0, boss).normalHit);

    // verdant_harvest alone: -4% combat ATK trade-off really lowers the sheet ATK
    const penalised: any = {
      ...baseState,
      skyForge: { emblemLevels: { amethyst_staff: 2 }, activePacts: ["verdant_harvest"] },
    };
    const sp = combatSheetFromPack(penalised, packJson.items as any, packJson.equipmentSets as any);
    assert.equal(sp.combatAtkPct, -4);
    assert.ok(sp.atk < s0.atk);
    assert.ok(sp.hp > s0.hp, "amethyst staff still adds HP");

    const zero: any = {
      ...baseState,
      skyForge: {
        emblemLevels: { star_blade: 0, crescent_bow: 0, star_hammer: 0, amethyst_staff: 0 },
        activePacts: ["ember_vanguard"],
      },
    };
    assert.deepEqual(combatSheetFromPack(zero, packJson.items as any, packJson.equipmentSets as any), s0);
  });
});
