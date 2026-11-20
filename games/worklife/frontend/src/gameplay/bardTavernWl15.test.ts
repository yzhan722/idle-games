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
import { arenaCombatSheet, combatSheetFromPack, combinedBuildFromState, tavernChronicleCombatExtras } from "./combatSheet";
import { T1_ASSET_CACHE_VERSION, WL15_TAVERN_CHRONICLE_ART_IDS, withAssetCacheVersion } from "./t1Art";
import { generateArenaChampion, getArenaSeasonIndex, previewArenaDuel } from "./arenaTown";
import {
  CHRONICLE_CHAPTERS,
  TAVERN_BALLADS,
  TAVERN_FAME_TIERS,
  TAVERN_MENU,
  TAVERN_PERFECT_BONUS_FAME,
  TAVERN_VISITORS,
  TAVERN_VISITORS_PER_DAY,
  formatBalladRemaining,
  formatTavernStats,
  formatTavernVerdict,
  getChronicleMetrics,
  getChronicleProgress,
  getTavernBalladEffect,
  getTavernChronicleBonuses,
  getTavernFameTier,
  getTavernMenuItem,
  getTavernVisitorOrder,
  getTavernVisitorsForDay,
  planTavernServe,
  tavernDayIndex,
  tavernDayKey,
  tavernDayKeyFromIndex,
} from "./bardTavern";

const t1Root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../assets/t1");
const frontendSrcRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("WL-15 frontend art contract, navigation IA, header fit, zero-SVG/Emoji guard and Bard Tavern / Chronicle helpers", () => {
  it("registers the 6 WL-15 512x512 RGBA .webp icons in the T1 contract and keeps a dated wl cache version", () => {
    assert.match(T1_ASSET_CACHE_VERSION, /^\d{8}wl\d+$/);
    assert.deepEqual([...WL15_TAVERN_CHRONICLE_ART_IDS], [
      "bard_tavern",
      "bard_lute",
      "ale_mug",
      "chronicle_book",
      "quill_inkwell",
      "fame_laurel",
    ]);
    for (const id of WL15_TAVERN_CHRONICLE_ART_IDS) {
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
    assert.equal(withAssetCacheVersion("/assets/bard_tavern.webp"), `/assets/bard_tavern.webp?v=${T1_ASSET_CACHE_VERSION}`);
    // visitors render through the real character avatars; every menu item shown has raster item art
    for (const v of TAVERN_VISITORS) {
      const key = t1KeyFor("ui", v.avatarId)!;
      assert.ok((T1_ASSET_KEYS as readonly string[]).includes(key), `${v.id} avatar ${key} is registered`);
      assert.equal(existsSync(path.join(t1Root, `${key}.webp`)), true, `${v.id} avatar`);
    }
    for (const m of TAVERN_MENU) {
      assert.ok((packJson.items as Array<{ id: string }>).some((i) => i.id === m.itemId), `${m.itemId} is not a pack item`);
      assert.equal(existsSync(path.join(t1Root, `${t1KeyFor("item", m.itemId)}.webp`)), true, `missing item art for ${m.itemId}`);
    }
  });

  it("wires 'tavern' into CAREER_GROUPS, GameHeader (9th pill fits the icon range) and NewGameInterface, and keeps the panel free of SVG/Emoji/remount flicker", () => {
    const endgame = CAREER_GROUPS.find((g) => g.title === "远期");
    assert.ok(endgame);
    assert.equal(endgame.items.includes("tavern"), true);
    assert.ok(endgame.items.indexOf("tavern") > endgame.items.indexOf("ranch"));
    assert.ok(endgame.items.indexOf("tavern") < endgame.items.indexOf("prestige"));

    const advSrc = readFileSync(path.join(frontendSrcRoot, "components/AdvancementPanels.tsx"), "utf8");
    assert.ok(advSrc.indexOf("export function BardTavernChroniclePanel") > 0, "BardTavernChroniclePanel must be exported from AdvancementPanels.tsx");
    const slice = advSrc.slice(advSrc.lastIndexOf("吟游诗人酒馆 & 冒险者编年史 (WL-15)"));
    assert.equal(/<svg[\s>]/i.test(slice), false, "panel must not contain inline <svg>");
    assert.equal(/<canvas[\s>]/i.test(slice), false, "panel must not draw icons on <canvas>");
    assert.equal(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(slice), false, "panel must not contain Emoji");
    assert.equal(slice.includes("[toast]"), false, "load callback must use toastRef");
    assert.equal(slice.includes("loading && !info"), true, "panel root must stay mounted after first load");
    assert.equal(slice.includes('data-testid="tavern-chronicle-panel"'), true);
    for (const id of WL15_TAVERN_CHRONICLE_ART_IDS) {
      assert.equal(slice.includes(`id="${id}"`) || slice.includes(`'${id}'`), true, `panel must render T1Art ${id}`);
    }
    assert.equal(slice.includes('kind="ui" id={v.avatarId}'), true, "visitor portraits come from real character avatars");
    assert.equal(slice.includes("T1ItemIcon itemId={m.itemId}"), true, "menu items render real item art");
    assert.equal(slice.includes("formatTavernStats("), true, "stat lines come from the symmetric mirror");
    assert.equal(slice.includes("planTavernServe("), true, "the serve preview uses the symmetric planner");
    assert.equal(slice.includes("dayKey: info?.tavern.dayKey"), true, "the client tells the server which day it serves / sings for");

    const headerSrc = readFileSync(path.join(frontendSrcRoot, "components/GameHeader.tsx"), "utf8");
    assert.equal(headerSrc.includes('data-testid="header-tavern-chronicle-btn"'), true);
    assert.equal(headerSrc.includes('tavern: "酒馆编年"'), true);
    assert.ok(headerSrc.indexOf("header-tavern-chronicle-btn") < headerSrc.indexOf("header-beast-weather-btn"), "newest pill first");
    const ngiSrc = readFileSync(path.join(frontendSrcRoot, "components/NewGameInterface.tsx"), "utf8");
    assert.equal(ngiSrc.includes("<BardTavernChroniclePanel"), true);

    const css = readFileSync(path.join(frontendSrcRoot, "components/AdvancementPanels.css"), "utf8").replace(/\r\n/g, "\n");
    for (const cls of ["tv-serve-btn", "tv-ballad-btn", "tv-inscribe-btn"]) {
      assert.equal(css.includes(`.${cls}:not(:disabled)`), true, `${cls} gradient only when enabled`);
      assert.equal(new RegExp(`(^|\\n)\\s*\\.${cls}\\s*\\{`).test(css), false, `${cls} must not override .prog-claim-btn:disabled`);
    }
    // 9 header pills: the 9th joins the shared icon-only range (761~1599px), text pills from 1600px
    const mid = css.slice(css.indexOf("@media (max-width: 1599px)"));
    const midBlock = mid.slice(0, mid.indexOf("\n}\n"));
    for (const cls of ["tavern", "ranch", "arena", "academy", "harbor", "forge", "relics", "cauldron", "caravan"]) {
      assert.ok(midBlock.includes(`.header-${cls}-pill span`), `${cls} pill is icon-only at 761~1599px`);
    }
    // pills whose base rule sits after the shared block get the compact padding back (WL-14 measured them 8px wider)
    const late = css.slice(css.lastIndexOf("@media (max-width: 1599px)"));
    const lateBlock = late.slice(0, late.indexOf("\n}\n"));
    for (const cls of ["tavern", "ranch", "arena"]) assert.ok(lateBlock.includes(`.header-${cls}-pill`), `${cls} compact padding`);
    assert.ok(css.lastIndexOf("@media (max-width: 1599px)") > css.indexOf(".header-tavern-pill {"), "the compact override comes after the tavern pill base rule");
    const narrow = css.slice(css.lastIndexOf("@media (max-width: 760px)"));
    assert.ok(/\.header-tavern-pill,\s*\.header-ranch-pill\s*\{\s*display:\s*none;/.test(narrow.slice(0, narrow.indexOf("\n}\n"))), "tavern pill hidden at <=760px");
    const phone = css.slice(css.lastIndexOf("@media (max-width: 480px)"));
    assert.ok(/\.header-tavern-pill,\s*\.header-ranch-pill,\s*\.header-arena-pill,\s*\.header-academy-pill\s*\{\s*display:\s*none;/.test(phone), "header pills hidden at <=480px");
  });

  it("rotates the UTC+8 guest list, previews serves (order ×1.5, perfect bonus) and formats tavern lines", () => {
    assert.equal(tavernDayKey(Date.parse("2026-11-18T15:59:00.000Z")), "2026-11-18");
    assert.equal(tavernDayKey(Date.parse("2026-11-18T16:00:00.000Z")), "2026-11-19");
    const d = tavernDayIndex(Date.parse("2026-11-18T02:00:00.000Z"));
    assert.equal(tavernDayKeyFromIndex(d), "2026-11-18");
    const list = getTavernVisitorsForDay(d);
    assert.equal(list.length, TAVERN_VISITORS_PER_DAY);
    assert.deepEqual(getTavernVisitorsForDay(d), list);
    const v = list[0];
    const o = getTavernVisitorOrder(d, v);
    const fame = (id: string) => getTavernMenuItem(id)!.fame;
    const p = planTavernServe(d, v, o.dishId, o.drinkId);
    assert.equal(p.ok, true);
    assert.equal(p.verdict, "perfect");
    assert.equal(p.fame, Math.floor((fame(o.dishId) * 3) / 2) + Math.floor((fame(o.drinkId) * 3) / 2) + TAVERN_PERFECT_BONUS_FAME);
    const plainDish = o.dishId === "food_simple" ? "bread" : "food_simple";
    const plain = planTavernServe(d, v, plainDish, null);
    assert.equal(plain.verdict, "fine");
    assert.equal(plain.fame, fame(plainDish));
    assert.equal(planTavernServe(d, v, null, o.drinkId).verdict, "pleased");
    assert.equal(planTavernServe(d, v, null, null).ok, false);
    assert.equal(planTavernServe(d, v, "drink_basic", null).ok, false, "drinks cannot be served as the dish");
    const absent = TAVERN_VISITORS.map((x) => x.id).find((id) => !list.includes(id))!;
    assert.equal(planTavernServe(d, absent, "food_simple", null).ok, false, "only today's guests");
    assert.equal(planTavernServe(d, absent, "food_simple", null).visiting, false);

    assert.deepEqual(formatTavernStats({ gatherSpeedPct: 8, gatherEfficiencyPct: 4, bonusHp: 30 }), ["采集速度 +8%", "采集产出 +4%", "生命 +30"]);
    assert.equal(formatTavernVerdict("perfect"), "完美招待");
    assert.equal(formatTavernVerdict("pleased"), "合点单");
    assert.equal(formatTavernVerdict(null), "");
    assert.equal(formatBalladRemaining(12 * 60_000 + 30_000), "12 分 30 秒");
    assert.equal(formatBalladRemaining(45_000), "45 秒");
    assert.equal(getTavernFameTier(236).current.name, "冒险者驿站");
    assert.equal(getTavernFameTier(236).next!.minFame, 500);
    assert.equal(getTavernFameTier(99_999).next, null);

    const start = Date.parse("2026-11-18T02:00:00.000Z");
    const holder = { bardTavern: { fame: 0, activeBallad: { balladId: "forge_hearth", startedAt: new Date(start).toISOString(), endsAt: "2099-01-01T00:00:00.000Z" } } };
    const live = getTavernBalladEffect(holder, start + 10 * 60_000);
    assert.equal(live.active, true);
    assert.deepEqual(live.stats, TAVERN_BALLADS.find((b) => b.id === "forge_hearth")!.stats);
    assert.equal(live.remainingMs, 20 * 60_000, "ends after its real duration, not the stored endsAt");
    assert.equal(getTavernBalladEffect(holder, start + 30 * 60_000).active, false);
  });

  it("compiles the chronicle from real records and feeds fame / chapter bonuses into combinedBuildFromState, the combat sheet and arena previews", () => {
    const state: any = {
      stats: { totalBossKills: 31, killsByMonster: { forest_boss: 20, mine_boss: 6, swamp_boss: 3, snow_boss: 2, slime: 200 } },
      skyArena: { bestRung: 7, totalWins: 12, titles: ["bronze", "silver"] },
      beastRanch: { beasts: { bloom_bee: { xp: 0 } } },
    };
    const m = getChronicleMetrics(state);
    assert.equal(m.boss_kinds, 4);
    assert.equal(m.boss_kills, 31);
    assert.equal(m.arena_titles, 2);
    assert.equal(m.beasts_tamed, 1);
    const prog = getChronicleProgress(state);
    assert.deepEqual(prog.chapters.filter((c) => c.canInscribe).map((c) => c.id), ["slayer_saga", "arena_epic"]);
    assert.equal(prog.entriesTotal, CHRONICLE_CHAPTERS.length * 3);

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
    const famed: any = {
      ...baseState,
      bardTavern: { fame: TAVERN_FAME_TIERS[5].minFame },
      adventurerChronicle: { inscribed: ["slayer_saga", "arena_epic"], equippedTitle: "arena_epic" },
    };
    const t = tavernChronicleCombatExtras(famed);
    assert.equal(t.fameTier, 5);
    assert.equal(t.chaptersInscribed, 2);
    assert.equal(t.equippedTitle, "arena_epic");
    assert.deepEqual(getTavernChronicleBonuses(famed), t);
    const b0 = combinedBuildFromState(baseState);
    const b1 = combinedBuildFromState(famed);
    assert.equal(b1.atk - b0.atk, 6);
    assert.equal(b1.def - b0.def, 4);
    assert.equal(b1.hp - b0.hp, 30 + 40 + 30);
    assert.ok(Math.abs(b1.goldMult / b0.goldMult - 1.03) < 1e-3, "fame tier 5 → +3% gold");
    const s0 = combatSheetFromPack(baseState, packJson.items as any, packJson.equipmentSets as any);
    const s1 = arenaCombatSheet(famed, packJson.items as any, packJson.equipmentSets as any);
    assert.ok(s1.atk > s0.atk && s1.hp > s0.hp && s1.def > s0.def);
    const champ = generateArenaChampion(getArenaSeasonIndex(Date.parse("2026-11-18T02:00:00.000Z")), 4);
    const p0 = previewArenaDuel(arenaCombatSheet(baseState, packJson.items as any, packJson.equipmentSets as any), champ, [], packJson.bossMechanics as any);
    const p1 = previewArenaDuel(s1, champ, [], packJson.bossMechanics as any);
    assert.equal(p1.playerMaxHp - p0.playerMaxHp, 100);

    // a playing ballad and a dirty chronicle never leak into combat
    const bard: any = {
      ...baseState,
      bardTavern: { fame: 0, activeBallad: { balladId: "hero_epic", startedAt: new Date().toISOString() } },
      adventurerChronicle: { inscribed: "x", equippedTitle: "slayer_saga" },
    };
    assert.deepEqual(combatSheetFromPack(bard, packJson.items as any, packJson.equipmentSets as any), s0);
    assert.equal(getTavernChronicleBonuses(bard).equippedTitle, null);
  });
});
