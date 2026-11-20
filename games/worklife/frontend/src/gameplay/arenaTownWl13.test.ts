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
import { arenaCombatSheet, arenaTownCombatExtras, combatSheetFromPack, combinedBuildFromState } from "./combatSheet";
import { T1_ASSET_CACHE_VERSION, WL13_ARENA_TOWN_ART_IDS, withAssetCacheVersion } from "./t1Art";
import {
  ARENA_DIVISIONS,
  ARENA_RUNG_COUNT,
  TOWN_FACILITIES,
  TOWN_PROSPERITY_TIERS,
  arenaDayKey,
  arenaSeasonEndsAtMs,
  arenaSeasonKey,
  formatArenaTownStats,
  formatDuelDuration,
  generateArenaChampion,
  getArenaBestTitle,
  getArenaDivisionForRung,
  getArenaSeasonIndex,
  getArenaSettlement,
  getArenaTownBonuses,
  getTownFacilityCap,
  getTownProsperity,
  previewArenaDuel,
} from "./arenaTown";

const t1Root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../assets/t1");
const frontendSrcRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("WL-13 frontend art contract, navigation IA, zero-SVG/Emoji guard and Sky Arena / Guild Town helpers", () => {
  it("registers the 6 WL-13 512x512 RGBA .webp icons in the T1 contract and keeps a dated wl cache version", () => {
    assert.match(T1_ASSET_CACHE_VERSION, /^\d{8}wl\d+$/);
    assert.deepEqual([...WL13_ARENA_TOWN_ART_IDS], [
      "sky_arena",
      "arena_medal",
      "season_title",
      "guild_town",
      "town_hall",
      "prosperity_chest",
    ]);
    for (const id of WL13_ARENA_TOWN_ART_IDS) {
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
      assert.equal(size!.width, 512);
      assert.equal(size!.height, 512);
    }
    assert.equal(withAssetCacheVersion("/assets/sky_arena.webp"), `/assets/sky_arena.webp?v=${T1_ASSET_CACHE_VERSION}`);
    // facilities render through registered art (data-driven icon ids); every real cost / chest item has raster art
    for (const f of TOWN_FACILITIES) {
      const key = t1KeyFor(f.iconKind, f.iconId);
      assert.ok(key && existsSync(path.join(t1Root, `${key}.webp`)), `${f.id} icon ${f.iconKind}/${f.iconId}`);
    }
    const itemIds = new Set<string>();
    for (const f of TOWN_FACILITIES) for (const lv of f.levels) Object.keys(lv.items).forEach((id) => itemIds.add(id));
    for (const t of TOWN_PROSPERITY_TIERS) Object.keys(t.chestItems).forEach((id) => itemIds.add(id));
    for (const id of itemIds) {
      assert.ok((packJson.items as Array<{ id: string }>).some((i) => i.id === id), `${id} is not a pack item`);
      assert.equal(existsSync(path.join(t1Root, `${t1KeyFor("item", id)}.webp`)), true, `missing item art for ${id}`);
    }
  });

  it("wires 'arena' into CAREER_GROUPS, GameHeader and NewGameInterface, and keeps SkyArenaTownPanel free of SVG/Emoji/remount flicker", () => {
    const endgame = CAREER_GROUPS.find((g) => g.title === "远期");
    assert.ok(endgame);
    assert.equal(endgame.items.includes("arena"), true);
    assert.ok(endgame.items.indexOf("arena") > endgame.items.indexOf("academy"));
    assert.ok(endgame.items.indexOf("arena") < endgame.items.indexOf("prestige"));

    const advSrc = readFileSync(path.join(frontendSrcRoot, "components/AdvancementPanels.tsx"), "utf8");
    assert.ok(advSrc.indexOf("export function SkyArenaTownPanel") > 0, "SkyArenaTownPanel must be exported from AdvancementPanels.tsx");
    const slice = advSrc.slice(advSrc.lastIndexOf("天空竞技场赛季排位 & 公会领地城镇建设 (WL-13)"));
    assert.equal(/<svg[\s>]/i.test(slice), false, "SkyArenaTownPanel must not contain inline <svg>");
    assert.equal(/<canvas[\s>]/i.test(slice), false, "SkyArenaTownPanel must not draw icons on <canvas>");
    assert.equal(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(slice), false, "SkyArenaTownPanel must not contain Emoji");
    assert.equal(slice.includes("[toast]"), false, "load callback must use toastRef");
    assert.equal(slice.includes("loading && !info"), true, "panel root must stay mounted after first load");
    assert.equal(slice.includes('data-testid="arena-town-panel"'), true);
    for (const id of WL13_ARENA_TOWN_ART_IDS) {
      assert.equal(slice.includes(`id="${id}"`), true, `SkyArenaTownPanel must render T1Art ${id}`);
    }
    assert.equal(slice.includes("formatArenaTownStats("), true, "stat lines come from the symmetric mirror");
    assert.equal(slice.includes("apiClient.challengeSkyArena({ rung: next.rung })"), true, "the client tells the server which rung it expects");

    const headerSrc = readFileSync(path.join(frontendSrcRoot, "components/GameHeader.tsx"), "utf8");
    assert.equal(headerSrc.includes('data-testid="header-arena-town-btn"'), true);
    assert.equal(headerSrc.includes('arena: "竞技城镇"'), true);
    const ngiSrc = readFileSync(path.join(frontendSrcRoot, "components/NewGameInterface.tsx"), "utf8");
    assert.equal(ngiSrc.includes("<SkyArenaTownPanel"), true);

    const css = readFileSync(path.join(frontendSrcRoot, "components/AdvancementPanels.css"), "utf8").replace(/\r\n/g, "\n");
    for (const cls of ["at-challenge-btn", "at-build-btn", "at-chest-btn"]) {
      assert.equal(css.includes(`.${cls}:not(:disabled)`), true, `${cls} gradient only when enabled`);
      // layout-only descendant rules (e.g. `.at-champion-foot .at-challenge-btn { width }`) are fine; a bare colour rule is not
      assert.equal(new RegExp(`(^|\\n)\\s*\\.${cls}\\s*\\{`).test(css), false, `${cls} must not override .prog-claim-btn:disabled`);
    }
    // header pills: icon-only for the mid range (1280px overflowed with 7 text pills; WL-14's 8th pill pushed it to 1599px)
    const mid = css.slice(css.indexOf("@media (max-width: 1599px)"));
    const midBlock = mid.slice(0, mid.indexOf("\n}\n"));
    for (const cls of ["arena", "academy", "harbor", "forge", "relics", "cauldron", "caravan"]) {
      assert.ok(midBlock.includes(`.header-${cls}-pill span`), `${cls} pill is icon-only at 761~1439px`);
    }
    const phone = css.slice(css.lastIndexOf("@media (max-width: 480px)"));
    assert.ok(/\.header-arena-pill,\s*\.header-academy-pill\s*\{\s*display:\s*none;/.test(phone), "header pills hidden at <=480px (career menu entry instead)");
  });

  it("evaluates UTC+8 month seasons, champions, divisions, settlements and town prosperity", () => {
    const t = Date.parse("2026-11-18T02:00:00.000Z");
    assert.equal(arenaSeasonKey(t), "2026-11");
    assert.equal(new Date(arenaSeasonEndsAtMs(getArenaSeasonIndex(t))).toISOString(), "2026-11-30T16:00:00.000Z");
    assert.equal(arenaDayKey(Date.parse("2026-11-30T16:30:00.000Z")), "2026-12-01");
    assert.equal(ARENA_DIVISIONS.map((d) => d.name).join("/"), "青铜/白银/黄金/铂金/钻石/天空王者");
    const season = getArenaSeasonIndex(t);
    const c5 = generateArenaChampion(season, 5);
    assert.equal(c5.gatekeeper, true);
    assert.equal(c5.isBoss, true);
    assert.ok(c5.name.startsWith("青铜守擂人·"));
    assert.ok(c5.mechanics.length > 0);
    assert.deepEqual(generateArenaChampion(season, 5), c5, "deterministic per season + rung");
    const c30 = generateArenaChampion(season, 99);
    assert.equal(c30.rung, ARENA_RUNG_COUNT, "rung is clamped");
    assert.equal(getArenaDivisionForRung(0), null);
    assert.equal(getArenaDivisionForRung(16)?.id, "platinum");
    assert.deepEqual(getArenaSettlement(23), { rung: 23, division: "diamond", divisionName: "钻石", medals: 22, titleName: "钻石传奇" });
    assert.equal(getArenaBestTitle(["bronze", "diamond", "silver"])?.titleName, "钻石传奇");

    assert.equal(getTownFacilityCap("town_hall", { town_hall: 0 }), 5);
    assert.equal(getTownFacilityCap("guild_bank", { town_hall: 2 }), 2);
    const p = getTownProsperity({ town_hall: 3, artisan_row: 2, harvest_market: 3, training_grounds: 2, guild_bank: 2, sage_library: 1 });
    assert.equal(p.points, 42);
    assert.equal(p.current.name, "领地城镇");
    assert.equal(p.next?.name, "天空城邦");
    assert.deepEqual(formatArenaTownStats({ craftSpeedPct: 6, bonusDef: 3 }), ["制作速度 +6%", "防御 +3"]);
    assert.equal(formatDuelDuration(65_000), "1 分 5 秒");
    assert.equal(formatDuelDuration(9_000), "9 秒");
    assert.equal(formatDuelDuration(120_000), "2 分钟");
  });

  it("feeds titles / town into combinedBuildFromState and the arena combat sheet, ignores temporary buffs in the arena, and previews duels", () => {
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
    const champion: any = {
      ...baseState,
      skyArena: { titles: ["bronze", "silver", "gold"] },
      guildTown: { facilities: { town_hall: 3, training_grounds: 3, guild_bank: 3 } },
    };
    const b = arenaTownCombatExtras(champion);
    assert.equal(b.titleName, "黄金霸者");
    assert.equal(b.bonusAtk, 12 + 13);
    assert.equal(b.bonusDef, 6 + 6);
    assert.equal(b.bonusHp, 50 + 50);
    // 4×3 + 3×3 + 3×3 = 30 → 繁荣小镇 (+2% gold, +1% xp)
    assert.equal(b.prosperityTier, 2);
    assert.equal(b.goldGainPct, 1 + 4 + 2);

    const b0 = combinedBuildFromState(baseState);
    const b1 = combinedBuildFromState(champion);
    assert.equal(b1.atk - b0.atk, 25);
    assert.equal(b1.hp - b0.hp, 100);
    assert.equal(b1.def - b0.def, 12);
    assert.ok(Math.abs(b1.goldMult / b0.goldMult - 1.07) < 1e-3);
    const s0 = combatSheetFromPack(baseState, packJson.items as any, packJson.equipmentSets as any);
    const s1 = combatSheetFromPack(champion, packJson.items as any, packJson.equipmentSets as any);
    assert.ok(s1.atk > s0.atk && s1.hp > s0.hp && s1.def > s0.def);

    const buffed: any = { ...baseState, activeBuffs: [{ expiresAt: "2099-01-01T00:00:00.000Z", stats: { atk: 30, def: 30 } }] };
    const normal = combatSheetFromPack(buffed, packJson.items as any, packJson.equipmentSets as any);
    const arena = arenaCombatSheet(buffed, packJson.items as any, packJson.equipmentSets as any);
    assert.ok(normal.atk > s0.atk, "potion buffs count in normal combat");
    assert.deepEqual(arena, s0, "the arena ignores temporary potion buffs");

    const season = getArenaSeasonIndex(Date.parse("2026-11-18T02:00:00.000Z"));
    const easy = previewArenaDuel(s1, generateArenaChampion(season, 1), [], packJson.bossMechanics as any);
    assert.equal(easy.won, true);
    assert.equal(easy.playerMaxHp, s1.hp);
    const wall = previewArenaDuel(s0, generateArenaChampion(season, 30), [], packJson.bossMechanics as any);
    assert.equal(wall.won, false);
    assert.ok(wall.durationMs <= 600_000);

    const dirty: any = { ...baseState, skyArena: { titles: "x" }, guildTown: { facilities: ["bogus"] } };
    assert.equal(getArenaTownBonuses(dirty).titleDivision, null);
    assert.deepEqual(combatSheetFromPack(dirty, packJson.items as any, packJson.equipmentSets as any), s0);
  });
});
