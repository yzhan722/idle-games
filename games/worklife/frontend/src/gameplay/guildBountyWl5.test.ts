import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { T1_ASSET_KEYS, t1KeyFor } from "../assets/t1/keys";
import { specByKey } from "../assets/t1/contract";
import { combatSheetFromPack, combinedBuildFromState } from "./combatSheet";
import {
  GUILD_FRAME_META,
  T1_ASSET_CACHE_VERSION,
  resolveEquippedGuildFrame,
  withAssetCacheVersion,
} from "./guildFrame";

const t1Root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../assets/t1");
const frontendSrcRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const WL5_ART_IDS = [
  "affix_bountiful_harvest",
  "affix_scorching_sunder",
  "affix_swift_assault",
  "affix_artisan_overdrive",
  "affix_gilded_spoils",
  "guild_honor_crest",
  "forging_emblem",
  "guild_frame_crimson",
  "guild_frame_astral",
] as const;

describe("WL-5 frontend art contract, guild frame helpers, and combat sheet affixes", () => {
  it("registers all 9 WL-5 hand-drawn RGBA .webp icons in T1 contract with cache-busting helper", () => {
    for (const id of WL5_ART_IDS) {
      const key = t1KeyFor("skills", id);
      assert.equal(key, `skills/${id}`);
      assert.ok((T1_ASSET_KEYS as readonly string[]).includes(key!), `Missing T1 key ${key}`);
      const spec = specByKey(key!);
      assert.ok(spec, `Missing T1 spec for ${key}`);
      assert.equal(spec?.profile, "icon");
      const webpFile = path.join(t1Root, `${key}.webp`);
      assert.equal(existsSync(webpFile), true, `Missing .webp asset on disk: ${webpFile}`);
    }

    assert.equal(
      withAssetCacheVersion("/assets/affix_scorching_sunder.webp"),
      `/assets/affix_scorching_sunder.webp?v=${T1_ASSET_CACHE_VERSION}`
    );
    assert.equal(
      withAssetCacheVersion("/assets/guild_frame_astral.webp?url"),
      `/assets/guild_frame_astral.webp?url&v=${T1_ASSET_CACHE_VERSION}`
    );
    assert.equal(withAssetCacheVersion("data:image/png;base64,AAAA"), "data:image/png;base64,AAAA");
  });

  it("enforces zero inline <svg> and zero Emoji in GuildBountyBoard.tsx", () => {
    const src = readFileSync(path.join(frontendSrcRoot, "components/GuildBountyBoard.tsx"), "utf8");
    assert.equal(/<svg[\s>]/i.test(src), false, "GuildBountyBoard.tsx must not contain inline <svg>");
    assert.equal(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(src), false, "GuildBountyBoard.tsx must not contain Emoji");
  });

  it("resolves equipped Exclusive Guild Frame metadata safely", () => {
    assert.equal(resolveEquippedGuildFrame(null), null);
    assert.equal(
      resolveEquippedGuildFrame({ unlockedFrames: [], equippedFrame: "frame_crimson_vanguard" }),
      null,
      "Locked frame should not render even if equippedFrame is set"
    );
    const crimson = resolveEquippedGuildFrame({
      unlockedFrames: ["frame_crimson_vanguard"],
      equippedFrame: "frame_crimson_vanguard",
    });
    assert.deepEqual(crimson, GUILD_FRAME_META.frame_crimson_vanguard);

    const astral = resolveEquippedGuildFrame({
      unlockedFrames: ["frame_crimson_vanguard", "frame_astral_sovereign"],
      equippedFrame: "frame_astral_sovereign",
    });
    assert.deepEqual(astral, GUILD_FRAME_META.frame_astral_sovereign);
  });

  it("applies active and lingering guild bounty affixes to combatSheetFromPack", () => {
    const items = [
      { id: "weapon_wooden_sword", atk: 5 },
      { id: "armor_wood_chest", def: 8 },
    ];
    const baseSheet = combatSheetFromPack(
      {
        combatLevel: 1,
        inventory: { weapon_wooden_sword: 1, armor_wood_chest: 1 },
        equipment: { main_hand: "weapon_wooden_sword", chest: "armor_wood_chest" },
      },
      items
    );

    const activeState = {
      combatLevel: 1,
      inventory: { weapon_wooden_sword: 1, armor_wood_chest: 1 },
      equipment: { main_hand: "weapon_wooden_sword", chest: "armor_wood_chest" },
      stats: { totalKills: 5 },
      bounties: {
        date: "2026-11-15",
        claimedAffixesToday: [],
        bounties: [
          {
            id: "b1",
            affixId: "scorching_sunder",
            metric: "kill" as const,
            target: 30,
            baseline: 0,
            accepted: true,
            claimed: false,
          },
          {
            id: "b2",
            affixId: "swift_assault",
            metric: "kill" as const,
            target: 80,
            baseline: 0,
            accepted: true,
            claimed: false,
          },
        ],
      },
    };
    const activeExtras = combinedBuildFromState(activeState);
    const activeSheet = combatSheetFromPack(activeState, items);
    assert.equal(activeExtras.atk, 6);
    assert.equal(activeExtras.armorPenPct, 0.3);
    assert.equal(activeExtras.intervalMult, 0.82);
    assert.equal(activeSheet.atk, baseSheet.atk + 6);
    assert.ok((activeSheet.intervalMs ?? 3000) < (baseSheet.intervalMs ?? 3000));

    const lingeringState = {
      ...activeState,
      stats: { totalKills: 100 },
      bounties: {
        ...activeState.bounties,
        claimedAffixesToday: ["scorching_sunder", "swift_assault"],
        bounties: activeState.bounties.bounties.map((b) => ({ ...b, claimed: true })),
      },
    };
    const lingeringExtras = combinedBuildFromState(lingeringState);
    const lingeringSheet = combatSheetFromPack(lingeringState, items);
    assert.equal(lingeringExtras.atk, 2);
    assert.equal(lingeringExtras.armorPenPct, 0.08);
    assert.equal(lingeringExtras.intervalMult, 0.95);
    assert.equal(lingeringSheet.atk, baseSheet.atk + 2);
    assert.ok((lingeringSheet.intervalMs ?? 3000) < (baseSheet.intervalMs ?? 3000));
    assert.ok((lingeringSheet.intervalMs ?? 3000) > (activeSheet.intervalMs ?? 3000));
  });
});
