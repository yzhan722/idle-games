import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { readAdvancementPanels } from "./advancementSource";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import packJson from "../../../shared/enhanced_content_pack_chinese.json";
import { T1_ASSET_KEYS, t1KeyFor } from "../assets/t1/keys";
import { specByKey } from "../assets/t1/contract";
import { rasterSize } from "../../../scripts/art-image-meta";
import { CAREER_GROUPS } from "./ia";
import { T1_ASSET_CACHE_VERSION, WL17_DWARF_ELF_ART_IDS, withAssetCacheVersion } from "./t1Art";
import {
  ELF_BONUS_CAPS,
  ELF_EXPEDITION_SOURCES,
  ELF_FAVOR_TIERS,
  ELF_FULL_BOARD_BONUS,
  ELF_GATHER_COMMISSIONS,
  MINE_CARTS,
  MINE_DEPTHS,
  MINE_GRADES,
  MINE_HAULS_PER_LAYER_PER_DAY,
  MINE_LAYERS,
  cleanElfCompleted,
  cleanMineHaulsToday,
  formatElfStats,
  formatMineGrade,
  getElfBoard,
  getElfExpeditionProgress,
  getElfFavorTier,
  getElfWaystationBonuses,
  getMineHaulMs,
  getMineHaulYield,
  getMineVein,
  getMineVeinMap,
  mineDayEndsAtMs,
  mineDayIndex,
  mineDayIndexFromKey,
  mineDayKey,
  mineGradeTone,
  planElfCommission,
  planMineCartUpgrade,
  planMineDepthUpgrade,
  planMineHaul,
} from "./dwarfElf";

const here = path.dirname(fileURLToPath(import.meta.url));
const t1Root = path.resolve(here, "../assets/t1");
const frontendSrcRoot = path.resolve(here, "..");
const T = Date.parse("2026-11-18T02:00:00.000Z");

describe("WL-17 frontend art contract, merged entry (no new header pill), zero-SVG/Emoji guard and Dwarf Mine / Elf Waystation helpers", () => {
  it("registers the 6 WL-17 square RGBA .webp icons (shipped size, see docs/PERF.md) in the T1 contract, keeps a dated wl cache version and only uses real ore / item / expedition art", () => {
    assert.match(T1_ASSET_CACHE_VERSION, /^\d{8}wl\d+$/);
    assert.deepEqual([...WL17_DWARF_ELF_ART_IDS], ["dwarf_mine", "mine_cart", "ore_vein", "elf_waystation", "elf_favor", "forest_commission"]);
    for (const id of WL17_DWARF_ELF_ART_IDS) {
      const key = t1KeyFor("skills", id)!;
      assert.ok((T1_ASSET_KEYS as readonly string[]).includes(key), `Missing T1 key ${key}`);
      const spec = specByKey(key);
      assert.equal(spec?.profile, "icon");
      assert.equal(spec?.priority, "P2");
      const webp = path.join(t1Root, `${key}.webp`);
      assert.equal(existsSync(webp), true, `Missing .webp asset on disk: ${webp}`);
      assert.ok(statSync(webp).size > 2048, `Asset ${webp} unexpectedly small`);
      const size = rasterSize(readFileSync(webp), "webp");
      assert.ok(size!.width >= 256 && size!.width <= 512, `${key} ${size!.width}`);
      assert.equal(size!.height, size!.width);
    }
    assert.equal(withAssetCacheVersion("/assets/dwarf_mine.webp"), `/assets/dwarf_mine.webp?v=${T1_ASSET_CACHE_VERSION}`);
    const items = packJson.items as Array<{ id: string }>;
    const art = (id: string) => existsSync(path.join(t1Root, `${t1KeyFor("item", id)}.webp`));
    for (const l of MINE_LAYERS) {
      for (const id of [...l.ores, l.byproductId]) {
        assert.ok(items.some((i) => i.id === id), `${id} is a pack item`);
        assert.equal(art(id), true, `item art for ${id}`);
      }
    }
    for (const list of [MINE_DEPTHS, MINE_CARTS]) {
      for (const d of list) for (const id of Object.keys(d.materials)) assert.equal(art(id), true, `item art for ${id}`);
    }
    for (const c of ELF_GATHER_COMMISSIONS) assert.equal(art(c.itemId), true, `item art for ${c.itemId}`);
    for (const s of ELF_EXPEDITION_SOURCES) assert.equal(existsSync(path.join(t1Root, `skills/${s.artId}.webp`)), true, `${s.id} reuses existing art`);
    // the acceptance doc tells the truth about the reused icons
    const doc = readFileSync(path.resolve(here, "../../../docs/art/T1_ASSET_VISUAL_ACCEPTANCE.md"), "utf8");
    const row = doc.split(/\r?\n/).find((l) => l.includes("`skills/dwarf_mine`"));
    assert.ok(row && row.includes("复用待补"), "WL-17 icons are marked 复用待补 in the visual acceptance doc");
  });

  it("merges the entry into the existing tavern panel (two new tabs) and the 生涯 drawer, keeping the header at 9 pills and the view free of SVG/Emoji/remount flicker", () => {
    const endgame = CAREER_GROUPS.find((g) => g.title === "远期")!;
    assert.ok(endgame.items.includes("mine"));
    assert.ok(endgame.items.indexOf("mine") === endgame.items.indexOf("airship") + 1, "drawer entry sits right after the airship");
    assert.ok(endgame.items.indexOf("mine") < endgame.items.indexOf("prestige"));
    assert.equal(CAREER_GROUPS.length, 4);

    const headerSrc = readFileSync(path.join(frontendSrcRoot, "components/GameHeader.tsx"), "utf8");
    assert.equal(headerSrc.includes('mine: "矿脉驿站"'), true);
    const pills = [...headerSrc.matchAll(/className="header-([a-z]+)-pill"/g)].map((m) => m[1]);
    assert.deepEqual(pills, ["tavern", "ranch", "arena", "academy", "harbor", "forge", "relics", "cauldron", "caravan"], "still exactly 9 header pills");
    assert.equal(/header-(mine|dwarf|elf|waystation)/.test(headerSrc), false, "no WL-17 header pill");
    assert.equal(/onOpenProg\("mine"\)/.test(headerSrc), false, "no direct header button for WL-17");

    const ngiSrc = readFileSync(path.join(frontendSrcRoot, "components/NewGameInterface.tsx"), "utf8");
    assert.equal(ngiSrc.includes("{progPanel === 'mine' && ("), true);
    assert.equal(ngiSrc.includes('initialTab="mine"'), true);

    const advSrc = readAdvancementPanels(frontendSrcRoot);
    const tavern = advSrc.slice(advSrc.indexOf("export function BardTavernChroniclePanel"), advSrc.indexOf("浮空飞艇商路 & 圣骑士团荣誉试炼 (WL-16)"));
    for (const id of ["tavern-tab-tavern", "tavern-tab-chronicle", "tavern-tab-airship", "tavern-tab-trial", "tavern-tab-mine", "tavern-tab-waystation"]) {
      assert.equal(tavern.includes(`data-testid="${id}"`), true, `${id} tab`);
    }
    assert.equal(tavern.includes("<DwarfElfView"), true, "WL-17 renders inside the existing panel");
    assert.equal(tavern.includes("view={tab === 'waystation' ? 'waystation' : 'mine'}"), true);
    assert.equal(advSrc.includes("export type TavernPanelTab = 'tavern' | 'chronicle' | 'airship' | 'trial' | 'mine' | 'waystation'"), true);
    const slice = advSrc.slice(advSrc.lastIndexOf("矮人地底矿脉 & 精灵林地驿站 (WL-17)"));
    assert.ok(slice.length > 5000);
    assert.equal(/<svg[\s>]/i.test(slice), false, "no inline <svg>");
    assert.equal(/<canvas[\s>]/i.test(slice), false, "no <canvas> icons");
    assert.equal(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(slice), false, "no Emoji");
    assert.equal(slice.includes("[toast]"), false, "load callback must use toastRef");
    assert.equal(slice.includes("loading && !info"), true, "view stays mounted after first load");
    for (const id of WL17_DWARF_ELF_ART_IDS) assert.equal(slice.includes(`id="${id}"`), true, `view renders T1Art ${id}`);
    assert.equal(slice.includes("T1ItemIcon itemId={l.vein.oreId}"), true, "veins use the real ore art");
    assert.equal(slice.includes("T1ItemIcon itemId={c.itemId}"), true, "gather commissions use the real item art");
    assert.equal(slice.includes('kind="skills" id={c.artId}'), true, "expedition commissions reuse the existing system art");
    for (const fn of ["planMineHaul(", "planElfCommission(", "getMineVeinMap(", "formatElfStats(", "formatMineGrade(", "mineGradeTone("]) {
      assert.equal(slice.includes(fn), true, `${fn} comes from the symmetric mirror`);
    }
    assert.equal(slice.includes("dayKey: m.dayKey"), true, "hauls tell the server which vein day they dig");
    assert.equal(slice.includes("dayKey: e.dayKey"), true, "commissions tell the server which board they answer");

    const css = readFileSync(path.join(frontendSrcRoot, "components/AdvancementPanels.css"), "utf8").replace(/\r\n/g, "\n");
    for (const cls of ["dm-haul-btn", "dm-depth-btn", "dm-cart-btn", "ew-deliver-btn"]) {
      assert.equal(css.includes(`.${cls}:not(:disabled)`), true, `${cls} gradient only when enabled`);
      assert.equal(new RegExp(`(^|\\n)\\s*\\.${cls}\\s*\\{`).test(css), false, `${cls} must not override .prog-claim-btn:disabled`);
    }
    // WL-17 rules sit before WL-15's trailing breakpoints so the header-pill breakpoint blocks stay the last ones
    const wl17 = css.indexOf("(WL-17)");
    assert.ok(wl17 > css.indexOf("(WL-16)"));
    assert.ok(wl17 < css.lastIndexOf("@media (max-width: 1599px)"));
    assert.ok(wl17 < css.lastIndexOf("@media (max-width: 760px)") && wl17 < css.lastIndexOf("@media (max-width: 480px)"));
    // six tabs must wrap on phones instead of overflowing
    assert.ok(/\.tv-tab-bar\s*\{[^}]*flex-wrap:\s*wrap/.test(css), "tab bar wraps");
  });

  it("generates the UTC+8 daily vein map deterministically and plans hauls by depth, mining level, reserve and cart", () => {
    assert.equal(mineDayKey(Date.parse("2026-11-18T15:59:00.000Z")), "2026-11-18");
    assert.equal(mineDayKey(Date.parse("2026-11-18T16:00:00.000Z")), "2026-11-19");
    assert.equal(mineDayEndsAtMs(T), Date.parse("2026-11-18T16:00:00.000Z"));
    assert.equal(mineDayIndexFromKey("2026-02-30"), null);
    const d = mineDayIndex(T);
    const map = getMineVeinMap(d);
    assert.deepEqual(getMineVeinMap(d), map, "same day, same veins");
    assert.notDeepEqual(getMineVeinMap(d + 1), map, "a new day digs new veins");
    map.forEach((v, i) => {
      assert.equal(v.layer, i + 1);
      assert.ok(MINE_LAYERS[i].ores.includes(v.oreId));
      assert.equal(v.byproductId, MINE_LAYERS[i].byproductId);
      const g = MINE_GRADES.find((x) => x.id === v.grade)!;
      assert.equal(v.yieldPct, g.yieldPct);
      const y = getMineHaulYield(d, v.layer, 3);
      assert.equal(y.oreQty, Math.max(1, Math.floor((MINE_CARTS[2].capacity * g.yieldPct) / 100)));
      assert.equal(y.byproductQty, g.byproduct);
    });
    assert.equal(getMineHaulMs(1, 1), 10 * 60_000);
    assert.equal(getMineHaulMs(6, 5), Math.round((30 * 60_000 * 80) / 100));
    const ok = planMineHaul(d, 2, 2, 1, 24, {}, false);
    assert.equal(ok.ok, true);
    assert.equal(ok.haulsLeft, MINE_HAULS_PER_LAYER_PER_DAY);
    assert.equal(planMineHaul(d, 3, 2, 1, 99, {}, false).depthOk, false, "shaft not dug that deep");
    assert.equal(planMineHaul(d, 2, 6, 1, 23, {}, false).levelOk, false, "silver veins need mining 24");
    assert.equal(planMineHaul(d, 1, 1, 1, 1, { "1": 2 }, false).haulsLeft, 0);
    assert.equal(planMineHaul(d, 1, 1, 1, 1, {}, true).ok, false, "only one cart underground at a time");
    assert.equal(planMineHaul(d, 1.5, 6, 1, 99, {}, false).ok, false);
    assert.deepEqual(cleanMineHaulsToday({ "1": 5, "2": "1", "9": 1, x: 3 }), { "1": MINE_HAULS_PER_LAYER_PER_DAY, "2": 1 });
    const dig = planMineDepthUpgrade(1, 2500, { lumber_2: 20, ingot_2: 15 });
    assert.equal(dig.ok, true);
    assert.equal(planMineDepthUpgrade(1, 2499, { lumber_2: 20, ingot_2: 15 }).goldOk, false);
    assert.equal(planMineDepthUpgrade(6, 1e9, {}).maxed, true);
    assert.equal(planMineCartUpgrade(1, 1200, { lumber_1: 12, ingot_2: 9 }).materialsOk, false);
    assert.equal(planMineCartUpgrade(5, 1e9, {}).maxed, true);
    assert.equal(formatMineGrade("bonanza"), "极品 ×180% · 伴生 3");
    assert.equal(formatMineGrade("common"), "中品 ×100%");
    assert.equal(mineGradeTone("rich"), "rich");
    assert.equal(mineGradeTone("gold"), "common");
    // the rarest grade really shows up (about 8% of layer-days)
    let bonanza = 0;
    for (let x = d; x < d + 365; x++) bonanza += getMineVeinMap(x).filter((v) => v.grade === "bonanza").length;
    assert.ok(bonanza > 100 && bonanza < 250, `bonanza layer-days ${bonanza}`);
    assert.equal(getMineVein(d, 99).layer, 6, "dirty layers clamp");
  });

  it("posts the daily waystation board by favor tier, plans commissions and caps the favor bonuses", () => {
    const d = mineDayIndex(T);
    const b0 = getElfBoard(d, 0);
    assert.notEqual(b0.gather[0].id, b0.gather[1].id);
    assert.ok(b0.gather.every((g) => g.minTier === 0) && b0.expedition.minTier === 0);
    assert.deepEqual(getElfBoard(d, 0), b0, "deterministic within a day");
    const seen = new Set<string>();
    for (let x = d; x < d + 120; x++) for (const g of getElfBoard(x, 5).gather) seen.add(g.id);
    assert.ok(seen.size >= 15, "the full pool rotates through the board");
    const g = b0.gather[0];
    const p = planElfCommission(d, 0, 0, [], { [g.itemId]: g.qty }, {}, {});
    assert.deepEqual({ ok: p.ok, kind: p.kind, favor: p.favor, gold: p.gold, full: p.fullBoard }, { ok: true, kind: "gather", favor: g.favor, gold: g.gold, full: false });
    assert.equal(planElfCommission(d, 0, 0, [], { [g.itemId]: g.qty - 1 }, {}, {}).ok, false);
    assert.equal(planElfCommission(d, 0, 0, [0], { [g.itemId]: g.qty }, {}, {}).done, true);
    const last = planElfCommission(d, 0, 0, [1, 2], { [g.itemId]: g.qty }, {}, {});
    assert.equal(last.fullBoard, true);
    assert.equal(last.bonusFavor, ELF_FULL_BOARD_BONUS);
    const x = b0.expedition;
    const ex = planElfCommission(d, 0, 2, [], {}, { [x.sourceId]: 10 }, { [x.sourceId]: 10 - x.target });
    assert.equal(ex.ok, true);
    assert.equal(ex.kind, "expedition");
    assert.equal(planElfCommission(d, 0, 2, [], {}, { [x.sourceId]: 10 }, { [x.sourceId]: 10 }).ok, false, "old expeditions do not count");
    assert.equal(planElfCommission(d, 0, 3, [], {}, {}, {}).slot, null);
    assert.equal(getElfExpeditionProgress(9, 4), 5);
    assert.equal(getElfExpeditionProgress(2, 7), 2, "a reset counter restarts from zero");
    assert.deepEqual(cleanElfCompleted([2, 0, 0, "1", 7]), [0, 2]);
    assert.equal(getElfFavorTier(120).current.name, "树语之友");
    assert.equal(getElfFavorTier(120).next!.name, "月桂同伴");
    const top = getElfWaystationBonuses({ elfWaystation: { favor: ELF_FAVOR_TIERS[ELF_FAVOR_TIERS.length - 1].minFavor } });
    assert.deepEqual(
      { s: top.gatherSpeedPct, e: top.gatherEfficiencyPct, x: top.gatherXpPct },
      { s: ELF_BONUS_CAPS.gatherSpeedPct, e: ELF_BONUS_CAPS.gatherEfficiencyPct, x: ELF_BONUS_CAPS.gatherXpPct }
    );
    assert.equal(getElfWaystationBonuses({ elfWaystation: { favor: "lots" } }).gatherSpeedPct, 0);
    assert.equal(getElfWaystationBonuses({ elfWaystation: { favor: 1e15 } }).gatherSpeedPct, ELF_BONUS_CAPS.gatherSpeedPct);
    assert.deepEqual(formatElfStats(ELF_BONUS_CAPS), ["采集速度 +5%", "采集产出效率 +4%", "采集经验 +3%"]);
    assert.deepEqual(formatElfStats({}), []);
  });

  it("keeps the shared core pure: no wall clock, no Math.random", () => {
    const src = readFileSync(path.join(here, "dwarfElf.ts"), "utf8");
    const core = src.slice(src.indexOf("WL-17 core） ----"), src.indexOf("以上为 WL-17 core"));
    assert.ok(core.length > 1000);
    assert.equal(/Date\.now\(/.test(core), false);
    assert.equal(/new Date\(\)/.test(core), false);
    assert.equal(/Math\.random/.test(core), false);
  });
});
