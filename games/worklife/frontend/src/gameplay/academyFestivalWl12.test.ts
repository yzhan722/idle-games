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
import { academyFestivalCombatExtras, combatSheetFromPack, combinedBuildFromState } from "./combatSheet";
import { T1_ASSET_CACHE_VERSION, WL12_ACADEMY_FESTIVAL_ART_IDS, withAssetCacheVersion } from "./t1Art";
import {
  ACADEMY_COURSES,
  ACADEMY_DEPARTMENTS,
  FESTIVAL_COMMISSIONS,
  FESTIVAL_SEASONS,
  FESTIVAL_SHOP_ITEMS,
  festivalSeasonEndsAtMs,
  festivalSeasonKey,
  formatAcademyCountdown,
  formatAcademyStats,
  formatCourseDuration,
  getAcademyBadgeTier,
  getAcademyCourseProgress,
  getAcademyDepartmentTier,
  getAcademyFestivalBonuses,
  getFestivalCommissionProgress,
  getFestivalSeasonIndex,
  getFestivalShopForSeason,
  previewAcademyGraduation,
} from "./academyFestival";

const t1Root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../assets/t1");
const frontendSrcRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("WL-12 frontend art contract, navigation IA, zero-SVG/Emoji guard and Academy / Festival helpers", () => {
  it("registers the 6 WL-12 512x512 RGBA .webp icons in the T1 contract and keeps a dated wl cache version", () => {
    assert.match(T1_ASSET_CACHE_VERSION, /^\d{8}wl\d+$/);
    assert.deepEqual([...WL12_ACADEMY_FESTIVAL_ART_IDS], [
      "academy_crest",
      "course_scroll",
      "graduation_cap",
      "festival_calendar",
      "festival_harvest_basket",
      "festival_shop_tent",
    ]);
    for (const id of WL12_ACADEMY_FESTIVAL_ART_IDS) {
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
    assert.equal(
      withAssetCacheVersion("/assets/academy_crest.webp"),
      `/assets/academy_crest.webp?v=${T1_ASSET_CACHE_VERSION}`
    );
    // badges / shop goods render through registered art (data-driven icon ids); every real item shown has raster art
    const wl12 = new Set<string>(WL12_ACADEMY_FESTIVAL_ART_IDS);
    for (const s of FESTIVAL_SHOP_ITEMS) {
      if (s.iconKind === "skills") assert.ok(wl12.has(s.iconId), `${s.id} icon ${s.iconId}`);
    }
    const itemIds = new Set<string>();
    for (const c of ACADEMY_COURSES) Object.keys(c.itemCost).forEach((id) => itemIds.add(id));
    for (const c of FESTIVAL_COMMISSIONS) Object.keys(c.items).forEach((id) => itemIds.add(id));
    for (const s of FESTIVAL_SHOP_ITEMS) {
      Object.keys(s.items).forEach((id) => itemIds.add(id));
      if (s.iconKind === "item") itemIds.add(s.iconId);
    }
    for (const id of itemIds) {
      assert.ok((packJson.items as Array<{ id: string }>).some((i) => i.id === id), `${id} is not a pack item`);
      assert.equal(existsSync(path.join(t1Root, `${t1KeyFor("item", id)}.webp`)), true, `missing item art for ${id}`);
    }
  });

  it("wires 'academy' into CAREER_GROUPS, GameHeader and NewGameInterface, and keeps AcademyFestivalPanel free of SVG/Emoji/remount flicker", () => {
    const endgame = CAREER_GROUPS.find((g) => g.title === "远期");
    assert.ok(endgame);
    assert.equal(endgame.items.includes("academy"), true);
    assert.ok(endgame.items.indexOf("academy") > endgame.items.indexOf("harbor"));
    assert.ok(endgame.items.indexOf("academy") < endgame.items.indexOf("prestige"));

    const advSrc = readFileSync(path.join(frontendSrcRoot, "components/AdvancementPanels.tsx"), "utf8");
    assert.ok(advSrc.indexOf("export function AcademyFestivalPanel") > 0, "AcademyFestivalPanel must be exported from AdvancementPanels.tsx");
    const slice = advSrc.slice(advSrc.lastIndexOf("冒险者学院进修课程 & 四季节庆活动日历 (WL-12)"));
    assert.equal(/<svg[\s>]/i.test(slice), false, "AcademyFestivalPanel must not contain inline <svg>");
    assert.equal(/<canvas[\s>]/i.test(slice), false, "AcademyFestivalPanel must not draw icons on <canvas>");
    assert.equal(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(slice), false, "AcademyFestivalPanel must not contain Emoji");
    assert.equal(slice.includes("[toast]"), false, "load callback must use toastRef");
    assert.equal(slice.includes("loading && !info"), true, "panel root must stay mounted after first load");
    assert.equal(slice.includes('data-testid="academy-festival-panel"'), true);
    for (const id of WL12_ACADEMY_FESTIVAL_ART_IDS) {
      assert.equal(slice.includes(`id="${id}"`), true, `AcademyFestivalPanel must render T1Art ${id}`);
    }
    assert.equal(slice.includes("getAcademyDepartmentTier("), true, "graduation previews come from the symmetric mirror");
    assert.equal(slice.includes("formatAcademyStats("), true);

    const headerSrc = readFileSync(path.join(frontendSrcRoot, "components/GameHeader.tsx"), "utf8");
    assert.equal(headerSrc.includes('data-testid="header-academy-festival-btn"'), true);
    assert.equal(headerSrc.includes('academy: "学院节庆"'), true);
    const ngiSrc = readFileSync(path.join(frontendSrcRoot, "components/NewGameInterface.tsx"), "utf8");
    assert.equal(ngiSrc.includes("<AcademyFestivalPanel"), true);

    const css = readFileSync(path.join(frontendSrcRoot, "components/AdvancementPanels.css"), "utf8").replace(/\r\n/g, "\n");
    assert.equal(css.includes(".af-primary-btn:not(:disabled)"), true);
    assert.equal(css.includes(".af-festival-btn:not(:disabled)"), true);
    assert.equal(/\.af-primary-btn\s*\{/.test(css), false, "primary gradient must not override .prog-claim-btn:disabled");
    assert.equal(/\.af-festival-btn\s*\{/.test(css), false, "festival gradient must not override .prog-claim-btn:disabled");
    const phone = css.slice(css.lastIndexOf("@media (max-width: 480px)"));
    assert.ok(/\.header-academy-pill\s*\{\s*display:\s*none;/.test(phone), "header pill hidden at <=480px (career menu entry instead)");
  });

  it("evaluates UTC+8 seasons, department tiers, badges, graduation previews and commission progress", () => {
    const t = Date.parse("2026-11-18T02:00:00.000Z");
    assert.equal(festivalSeasonKey(t), "2026-autumn");
    const idx = getFestivalSeasonIndex(t);
    assert.equal(new Date(festivalSeasonEndsAtMs(idx)).toISOString(), "2026-11-30T16:00:00.000Z");
    assert.equal(festivalSeasonKey(Date.parse("2027-01-20T00:00:00.000Z")), "2026-winter");
    assert.equal(FESTIVAL_SEASONS.map((s) => s.name).join("/"), "春耕节/夏渔节/秋收节/冬猎节");
    assert.equal(getFestivalShopForSeason("autumn").length, 4);
    assert.equal(ACADEMY_DEPARTMENTS.length, 4);
    assert.equal(ACADEMY_COURSES.length, 8);

    assert.equal(getAcademyDepartmentTier("gathering", 19).current.tier, 1);
    assert.equal(getAcademyDepartmentTier("gathering", 20).current.tier, 2);
    assert.equal(getAcademyDepartmentTier("gathering", 999).next, null);
    assert.equal(getAcademyBadgeTier(36).current.name, "银穗进修徽章");
    assert.deepEqual(previewAcademyGraduation({ gathering: 16 }, "field_survey"), {
      department: "gathering",
      credits: 4,
      departmentTierBefore: 1,
      departmentTierAfter: 2,
      badgeTierBefore: 1,
      badgeTierAfter: 1,
    });
    const start = "2026-11-18T00:00:00.000Z";
    const end = "2026-11-18T02:00:00.000Z";
    assert.deepEqual(getAcademyCourseProgress({ courseId: "master_artisan", startedAt: start, endsAt: end }, Date.parse(start) + 30 * 60_000), {
      remainingMs: 90 * 60_000,
      progressPct: 25,
      finished: false,
    });
    assert.equal(getAcademyCourseProgress({ courseId: "master_artisan", startedAt: start, endsAt: end }, Date.parse(end)).finished, true);

    const fair = FESTIVAL_COMMISSIONS.find((c) => c.id === "autumn_livestock_fair")!;
    assert.deepEqual(getFestivalCommissionProgress(fair, 34, 1), { seasonCount: 34, progress: 15, required: 30, ready: true, completed: false });
    assert.deepEqual(getFestivalCommissionProgress(fair, 20, 1), { seasonCount: 20, progress: 5, required: 30, ready: false, completed: false });
    assert.equal(getFestivalCommissionProgress(fair, 99, 3).completed, true);

    assert.deepEqual(formatAcademyStats({ gatherSpeedPct: 6, bonusAtk: 4 }), ["采集速度 +6%", "攻击 +4"]);
    assert.equal(formatAcademyCountdown(70 * 60_000), "1 小时 10 分");
    assert.equal(formatAcademyCountdown(13 * 86_400_000 + 5 * 3_600_000), "13 天 5 小时");
    assert.equal(formatAcademyCountdown(0), "已到点");
    assert.equal(formatCourseDuration(45), "45 分钟");
    assert.equal(formatCourseDuration(120), "2 小时");
  });

  it("feeds tactics passives, badges and keepsakes into combinedBuildFromState / combat sheet, and stays inert without the academy", () => {
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
    const scholar: any = {
      ...baseState,
      adventurerAcademy: { credits: { gathering: 0, crafting: 0, tactics: 70, commerce: 40 } },
      festivalCalendar: { keepsakes: ["spring", "summer", "autumn", "winter"] },
    };
    const b = academyFestivalCombatExtras(scholar);
    assert.equal(b.badgeTier, 3, "110 credits → 金冠学士徽章");
    assert.equal(b.fullCycle, true);
    assert.equal(b.bonusAtk, 24 + 5);
    assert.equal(b.bonusHp, 80 + 20);
    assert.equal(b.bonusDef, 10);
    assert.equal(b.goldGainPct, 7 + 2 + 2);

    const b0 = combinedBuildFromState(baseState);
    const b1 = combinedBuildFromState(scholar);
    assert.equal(b1.atk - b0.atk, 29);
    assert.equal(b1.hp - b0.hp, 100);
    assert.equal(b1.def - b0.def, 10);
    assert.ok(Math.abs(b1.goldMult / b0.goldMult - 1.11) < 1e-3);
    const s0 = combatSheetFromPack(baseState, packJson.items as any, packJson.equipmentSets as any);
    const s1 = combatSheetFromPack(scholar, packJson.items as any, packJson.equipmentSets as any);
    assert.ok(s1.atk > s0.atk);
    assert.ok(s1.hp > s0.hp);
    assert.ok((s1.goldMult || 1) > (s0.goldMult || 1));

    const dirty: any = { ...baseState, adventurerAcademy: { credits: "x" }, festivalCalendar: { keepsakes: ["bogus"] } };
    assert.deepEqual(getAcademyFestivalBonuses(dirty).keepsakes, []);
    assert.deepEqual(combatSheetFromPack(dirty, packJson.items as any, packJson.equipmentSets as any), s0);
  });
});
