#!/usr/bin/env node
// ML-14 验证脚本：梦境绘本馆 + 溪畔钓鱼会 + 统一忙碌排除（外出登记表）。
// 用法：node scripts/ml14-selfcheck.mjs（selfcheck.mjs 也会调用）
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defaultState, serializeState, loadFromRaw } from "../modules/state.js";
import * as CF from "../modules/systems/collection_fun.js";
import * as PT from "../modules/systems/pve_tower.js";
import { busyMonIds, pickWeakMonIds, releaseMonIds } from "../modules/systems/mon_release.js";
import { computeTechEffects } from "../modules/systems/effects.js";
import { finalizeProductionRates } from "../modules/systems/production.js";
import { computeBreedingShinyInfo } from "../modules/systems/breeding.js";
import { confirmPrestige, emptyEraState, bumpEraCounter, syncEraQuests } from "../modules/systems/era.js";
import { ERA_DEFS } from "../modules/defs_eras.js";
import { monPower } from "../modules/mons.js";
import { WEBP_UI_ICONS, renderResSvg, renderUiIcon } from "../modules/render/rpg_svg_icons.js";

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = (...p) => readFileSync(path.join(rootDir, ...p), "utf8");
const ML14_ICONS = ["dreamLibrary", "pictureBook", "dreamPage", "fishingDock", "fishingRod", "creekFish", "fishingTrophy"];

const mk = (id, dex, name, types, lvl = 40, extra = {}) => ({
  id,
  dex,
  pid: `p${String(dex).padStart(3, "0")}`,
  name,
  lvl,
  stars: 1,
  types,
  affection: 0,
  exp: 0,
  baseStats: { hp: 60, atk: 60, def: 60, spa: 60, spd: 60, spe: 60 },
  iv: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 },
  ...extra,
});
const roster = () => [
  mk(1, 4, "炽尾幼麟", ["fire"], 60),
  mk(2, 76, "镇岳巨岩尊", ["stone"], 55),
  mk(3, 7, "沧澜幼龟", ["water"], 50),
  mk(4, 1, "青萝幼龙", ["grass"], 48),
  mk(5, 25, "星雷灵鼠", ["electric"], 90),
  mk(6, 17, "疾风灵隼", ["wind"], 44),
  mk(7, 36, "月华星后", ["light"], 43),
  mk(8, 94, "噬影夜魔王", ["dark"], 42),
  mk(9, 150, "幻梦灵",  ["mystic"], 70),
];
const freshState = () => {
  const st = defaultState();
  st.mons.list = roster();
  st.mons.nextId = 10;
  st.res.futurecoin = { value: 500, cap: 99999 };
  return st;
};
let seed = 7;
const rng = () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};

// ============================================================================
// 0) Icons, version cache-busting, UI / tick / rebirth wiring
// ============================================================================
{
  for (const key of ML14_ICONS) {
    assert.ok(existsSync(path.join(rootDir, "assets", "ui_icons", `${key}.webp`)), `ML-14 icon asset exists: ${key}.webp`);
    assert.equal(WEBP_UI_ICONS[key], key, `WEBP_UI_ICONS registers ${key}`);
    assert.ok(
      renderUiIcon(key, 24).includes(`${key}.webp?v=0.7.58`) && renderResSvg(key, 20).includes(`${key}.webp?v=0.7.58`),
      `rpg_svg_icons wires ${key}.webp?v=0.7.58`,
    );
    const buf = readFileSync(path.join(rootDir, "assets", "ui_icons", `${key}.webp`));
    assert.ok(buf.slice(0, 4).toString() === "RIFF" && buf.slice(8, 12).toString() === "WEBP", `${key}.webp is a real WebP file`);
  }
  const ft = src("modules", "tabs", "functions_tab.js");
  const ml14Ui = ft.slice(ft.indexOf("ML-14 Section: 萌灵「梦境绘本馆」"), ft.indexOf("ML-13 Section: 萌灵「温泉疗愈乡」"));
  assert.ok(ml14Ui.length > 6000 && ml14Ui.includes("ML-14 Section: 萌灵「溪畔钓鱼会」"), "ML-14 dream library + fishing club UI sections exist ahead of ML-13");
  assert.ok(!/<svg/i.test(ml14Ui) && !/<canvas/i.test(ml14Ui), "ML-14 UI uses webp icons only (no inline svg / canvas)");
  assert.ok(!/\p{Extended_Pictographic}/u.test(ml14Ui), "ML-14 UI has no emoji");
  for (const key of ML14_ICONS) assert.ok(ft.includes(`renderUiIcon("${key}"`), `functions tab renders the ${key} icon`);
  assert.ok(ft.includes("patchDreamLibraryLiveDom(stLive)") && ft.includes("patchFishingClubLiveDom(stLive)"), "ML-14 progress bars are live-patched between full re-renders");
  const tick = src("modules", "tick.js");
  assert.ok(tick.includes("advanceDreamLibrary(state, dtSec") && tick.includes("advanceFishingClub(state, dtSec"), "tick.js advances the dream library and the fishing club");
  const era = src("modules", "systems", "era.js");
  assert.ok(era.includes("recallDreamLibraryForRebirth(state)") && era.includes("recallFishingClubForRebirth(state)"), "confirmPrestige wakes dreamers and reels anglers in");
  const stateSrc = src("modules", "state.js");
  assert.ok(stateSrc.includes("ensureDreamLibraryState(s)") && stateSrc.includes("ensureFishingClubState(s)"), "loadFromRaw normalizes both trackers");
}

// ============================================================================
// 1) Unified busy exclusion: ONE registry feeds every busy list / picker
// ============================================================================
{
  // ML-15 起登记表在前面追加了烘焙坊 / 气球旅行两行：这里只校验 ML-9 ~ ML-14 的 8 项仍按原优先级登记在表尾
  assert.deepEqual(
    CF.AWAY_ACTIVITY_DEFS.map((a) => a.id).slice(-8),
    ["fishingClub", "dreamLibrary", "hotSpring", "postOffice", "treasureVoyage", "skyIsland", "nightObservatory", "wishDock"],
    "away registry lists all 8 away activities (ML-9 ~ ML-14)",
  );
  for (const a of CF.AWAY_ACTIVITY_DEFS) assert.ok(a.label && a.releaseHint && a.blockLog, `away activity ${a.id} has label / release hint / block log`);

  // Source: every consumer reads the registry instead of re-listing the systems
  const cfSrc = src("modules", "systems", "collection_fun.js");
  const nonSandbox = cfSrc.slice(cfSrc.indexOf("export function getNonSandboxBusyIds"), cfSrc.indexOf("export function getEcoSandboxBusyIds"));
  assert.ok(nonSandbox.includes("getAwayMonIds(state)") && !nonSandbox.includes("getHotSpringSoakingMonIds"), "getNonSandboxBusyIds reads the registry");
  const camp = cfSrc.slice(cfSrc.indexOf("export function getCampUnavailableMonIds"), cfSrc.indexOf("export function getAvailableStarCampCandidates"));
  assert.ok(camp.includes("getAwayMonIds(state)") && !camp.includes("getPostMessengerMonIds"), "getCampUnavailableMonIds reads the registry");
  const mrSrc = src("modules", "systems", "mon_release.js");
  assert.ok(mrSrc.includes("getAwayMonIds(state)") && !mrSrc.includes("getWishDockAwayMonIds"), "busyMonIds reads the registry");
  const ptSrc = src("modules", "systems", "pve_tower.js");
  for (const fn of ["autofillEcoTriSquad", "autofillChampionLeagueSquad", "autofillStarCorridorSquad"]) {
    const body = ptSrc.slice(ptSrc.indexOf(`export function ${fn}(`), ptSrc.indexOf(`export function ${fn}(`) + 700);
    assert.ok(body.includes("excludeAwayMons(state"), `${fn} uses the shared excludeAwayMons helper`);
  }
  const ft = src("modules", "tabs", "functions_tab.js");
  const trainModal = ft.slice(ft.indexOf("if (ui.trainingModalOpen) {"), ft.indexOf("if (ui.trainingModalOpen) {") + 1200);
  assert.ok(trainModal.includes("excludeAwayMons(state, trainNotTraining)"), "training picker excludes away partners via excludeAwayMons");
  assert.ok(ft.includes("const pickMons = excludeAwayMons("), "training confirm re-filters away partners via excludeAwayMons");
  assert.ok((ft.match(/chk\.checked && getAwayMonIds\(state\)\.has\(id\)/g) || []).length === 2, "training + expedition checkboxes refuse away partners");
  assert.ok(ft.includes("dropAwayMonIds(state, state.expedition.selectedIds.slice(0, 20))"), "persisted expedition team drops away partners");
  assert.ok(ft.includes("const candidates = excludeAwayMons(state, list).filter("), "expedition picker / 一键选择 excludes away partners via excludeAwayMons");
  assert.ok(ft.includes("const selIds = dropAwayMonIds(state, Array.isArray(state.expedition.selectedIds)"), "expedition start re-filters away partners");
  const pveTab = src("modules", "tabs", "pve_tab.js");
  assert.ok(pveTab.includes("const triAway = getAwayActivityMap(state);") && !pveTab.includes("getWishDockAwayMonIds"), "tri-element hall UI reads the registry");

  // Behavior: one partner on each of the 8 away activities
  const st = freshState();
  st.mons.list.push(mk(10, 10, "翠玉灵蚕", ["grass"], 30), mk(11, 11, "茧团团", ["grass"], 30));
  st.mons.nextId = 12;
  st.meta.wishDock = { routes: { reef: { active: true, completed: false, crewIds: [1], elapsedSec: 0, durationSec: 1200 } } };
  st.meta.nightObservatory = { stationedIds: [2] };
  st.meta.skyIsland = { crewIds: [3] };
  st.meta.treasureVoyage = { voyage: { crewIds: [4], phase: "sailing" } };
  st.meta.hotSpring = { pools: { emberRock: { seatIds: [5] } } };
  st.meta.postOffice = { trips: [{ routeId: "meadow", monId: 6, tripSec: 600, elapsedSec: 0 }] };
  st.meta.dreamLibrary = { dreamerIds: [7] };
  st.meta.fishingClub = { anglerIds: [8] };
  const away = CF.getAwayMonIds(st);
  assert.deepEqual([...away].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8], "getAwayMonIds unions all 8 away activities");
  const labels = CF.getAwayActivityMap(st);
  assert.deepEqual(
    [1, 2, 3, 4, 5, 6, 7, 8].map((id) => labels.get(id).label),
    ["出海中", "观测中", "建造中", "寻宝远航中", "泡汤中", "送信中", "入梦中", "垂钓中"],
    "each away partner is labelled by its activity",
  );
  assert.equal(CF.getAwayActivityOfMon(st, 9), null, "an idle partner has no away activity");
  for (const [name, set] of [
    ["busyMonIds", busyMonIds(st)],
    ["getNonSandboxBusyIds", CF.getNonSandboxBusyIds(st)],
    ["getCampUnavailableMonIds", CF.getCampUnavailableMonIds(st)],
    ["getAcrobatUnavailableMonIds", PT.getAcrobatUnavailableMonIds(st)],
    ["getBandUnavailableMonIds", PT.getBandUnavailableMonIds(st)],
  ]) {
    for (const id of away) assert.ok(set.has(id), `${name} covers away partner #${id}`);
  }
  assert.deepEqual(CF.excludeAwayMons(st, st.mons.list).map((m) => m.id), [9, 10, 11], "excludeAwayMons keeps only partners at home");
  assert.deepEqual(CF.dropAwayMonIds(st, [9, 7, 1, 10]), [9, 10], "dropAwayMonIds keeps order and drops away partners");
  const weak = pickWeakMonIds(st.mons.list, { softLimit: 1, batch: 20, protectIds: busyMonIds(st) });
  assert.ok([...away].every((id) => !weak.includes(id)), "box-overflow auto release never picks an away partner");

  // 三系冠军赛：auto squad / manual toggle / tournament all skip away partners (incl. the older hot spring & post office)
  const triTypes = (m) => m.types;
  const auto = PT.autofillEcoTriSquad(st, triTypes, monPower);
  assert.ok(auto.ok && auto.squadIds.every((id) => !away.has(id)), "autofillEcoTriSquad skips every away partner");
  assert.equal(PT.toggleEcoTriSquadMon(st, 1).reason, "mon_at_sea", "toggle keeps the legacy reason for partners at sea");
  for (const id of [5, 6, 7, 8]) {
    const r = PT.toggleEcoTriSquadMon(st, id);
    assert.ok(!r.ok && r.reason === "mon_away" && r.awayLabel === labels.get(id).label, `toggle refuses away partner #${id} (${labels.get(id).label})`);
  }
  PT.setEcoTriSquad(st, [7, 8]);
  const sit = PT.simulateEcoTriTournament(st, { mode: "single", getMonTypes: triTypes });
  assert.ok(!sit.ok && sit.reason === "squad_away", "a squad made only of away partners (dreaming / fishing) cannot enter the tournament");
  PT.setEcoTriSquad(st, [7, 9]);
  const half = PT.simulateEcoTriTournament(st, { mode: "single", getMonTypes: triTypes, commit: false });
  assert.ok(!["squad_away", "squad_at_sea", "empty_squad"].includes(half.reason), "a squad with one partner at home still fights (the away one sits out)");

  // 冠军联盟 / 星轨回廊 自动编队同样跳过
  const league = PT.autofillChampionLeagueSquad(st, triTypes, monPower);
  assert.ok(league.squadIds.length > 0 && league.squadIds.every((id) => !away.has(id)), "autofillChampionLeagueSquad skips away partners");
  const corridor = PT.autofillStarCorridorSquad(st, triTypes, monPower);
  assert.ok(corridor.squadIds.length > 0 && corridor.squadIds.every((id) => !away.has(id)), "autofillStarCorridorSquad skips away partners");

  // Mutual exclusion between outings: dreamers / anglers cannot be sent anywhere else and vice versa
  const idleDream = CF.getIdleDreamCandidates(st).map((m) => m.id);
  const idleFish = CF.getIdleFishingCandidates(st).map((m) => m.id);
  assert.ok([...away].every((id) => !idleDream.includes(id) && !idleFish.includes(id)), "away partners are never dream / fishing candidates");
  assert.ok(!CF.getIdleHotSpringCandidates(st).some((m) => m.id === 7 || m.id === 8), "dreamers / anglers cannot soak in the hot spring");
  assert.ok(!PT.getIdlePostMessengerCandidates(st).some((m) => m.id === 7 || m.id === 8), "dreamers / anglers cannot carry letters");
  assert.ok(!CF.getIdleTreasureVoyageCandidates(st).some((m) => m.id === 7 || m.id === 8), "dreamers / anglers cannot join the voyage crew");
  assert.equal(CF.toggleDreamer(st, 8).reason, "mon_busy", "an angler cannot lie down on a dream pillow");
  assert.equal(PT.toggleFishingAngler(st, 7).reason, "mon_busy", "a dreamer cannot take a fishing spot");
  assert.equal(CF.toggleDreamer(st, 5).reason, "mon_busy", "a soaker cannot dream");
  assert.equal(PT.toggleFishingAngler(st, 6).reason, "mon_busy", "a messenger cannot fish");
}

// ============================================================================
// 2) 梦境绘本馆
// ============================================================================
{
  // Old saves: no tracker → neutral, nothing created
  const legacy = loadFromRaw(JSON.stringify({ version: 3, res: { futurecoin: { value: 5, cap: 999 } }, mons: { nextId: 2, list: [{ id: 1, dex: 4, pid: "p004", name: "炽尾幼麟", lvl: 5 }] } }));
  assert.ok(legacy && !legacy.meta.dreamLibrary && !legacy.meta.fishingClub, "legacy save loads without the ML-14 trackers");
  const la = CF.computeDreamLibraryAura(legacy);
  assert.ok(la.prodMul === 1 && la.catchAdd === 0 && la.shinyChanceMul === 1 && la.pveOutAdd === 0 && la.pageCount === 0, "legacy dream aura is neutral");
  assert.equal(CF.advanceDreamLibrary(legacy, 99_999).chapters.length, 0, "advanceDreamLibrary is a no-op without a tracker");
  assert.ok(!busyMonIds(legacy).has(1) && !legacy.meta.dreamLibrary, "legacy partner is not locked and no tracker was created");
  assert.equal(PT.computeDualSanctumBadgeBonus(legacy).dreamOutAdd, 0, "PvE aggregator: no dream bonus on legacy saves");

  // Tables
  assert.equal(CF.DREAM_BOOK_DEFS.length, 5, "5 picture books");
  assert.ok(CF.DREAM_BOOK_DEFS.every((b) => b.chapters.length === 4 && b.chapters.every((c) => c.title && c.text)), "each book has 4 titled chapters");
  assert.equal(new Set(CF.DREAM_BOOK_DEFS.flatMap((b) => b.elements)).size, 9, "the 5 books cover all 9 elements");
  assert.deepEqual(CF.DREAM_BOOK_DEFS.map((b) => b.unlockPages), [0, 0, 3, 7, 12], "books unlock at 0 / 0 / 3 / 7 / 12 pages");
  assert.equal(CF.DREAM_TOTAL_PAGES, 20, "20 pages in total");
  assert.deepEqual([0, 1, 2, 3].map((c) => CF.getDreamChapterNeed("volcano", c)), [360, 450, 540, 630], "chapter cost 360 × (1 + 0.25 × 章序)");
  assert.equal(CF.getDreamChapterNeed("starfall", 3), 1890, "last chapter of the 5th book costs 360 × 3 × 1.75");

  const st = freshState();
  const dl = CF.ensureDreamLibraryState(st);
  assert.ok(dl.initialized && dl.bookId === "volcano" && dl.dreamerIds.length === 0, "fresh tracker opens 《会唱歌的小火山》");
  assert.ok(CF.isDreamBookUnlocked(st, "honeyForest") && !CF.isDreamBookUnlocked(st, "windbell"), "two books on the shelf at the start");
  assert.equal(CF.selectDreamBook(st, "windbell").reason, "locked", "locked book cannot be selected");

  // Writing speed: 1 / min × 1.5 契合 × (1 + 亲密 / 200)
  st.mons.list[0].affection = 100;
  const evFire = CF.evaluateDreamWriter(st.mons.list[0], "volcano");
  const evWater = CF.evaluateDreamWriter(st.mons.list[2], "volcano");
  assert.ok(evFire.match && evFire.inkPerMin === 2.25 && !evWater.match && evWater.inkPerMin === 1, "契合 + 亲密 100 → 2.25/min; plain → 1/min");

  // Pillows
  assert.ok(CF.toggleDreamer(st, 3).dreaming, "a partner lies down on a pillow");
  const fill = CF.autoFillDreamers(st);
  assert.deepEqual(fill.added, [1, 2], "一键入梦 picks the fastest writers for the current book (契合 fire / stone)");
  assert.equal(CF.autoFillDreamers(st).reason, "pillows_full", "3 pillows max");
  assert.equal(CF.toggleDreamer(st, 4).reason, "pillows_full", "no 4th dreamer");
  const dreamers = [1, 2, 3];
  for (const id of dreamers) assert.ok(busyMonIds(st).has(id), `busyMonIds protects dreamer #${id}`);
  assert.equal(releaseMonIds(st, dreamers, { protectIds: busyMonIds(st) }).removed, 0, "releaseMonIds refuses to release dreamers");
  assert.equal(CF.getDreamInkRatePerMin(st), 2.25 + 1.5 + 1, "combined ink rate of the three dreamers");

  // Chronological catch-up is step-size independent
  const twinA = JSON.parse(JSON.stringify(st));
  const twinB = JSON.parse(JSON.stringify(st));
  CF.advanceDreamLibrary(twinA, 4 * 3600);
  for (let i = 0; i < 240; i += 1) CF.advanceDreamLibrary(twinB, 60);
  assert.deepEqual(twinA.meta.dreamLibrary.pages, twinB.meta.dreamLibrary.pages, "one 4h step collects the same pages as 240 one-minute steps");
  assert.ok(Math.abs(twinA.meta.dreamLibrary.books.volcano.ink - twinB.meta.dreamLibrary.books.volcano.ink) < 1e-6, "…and lands on the same ink");

  // First chapter: 360 ink at 4.75/min ≈ 75.8 min
  const coin0 = st.res.futurecoin.value;
  assert.equal(CF.advanceDreamLibrary(st, 75 * 60).chapters.length, 0, "no chapter before 360 ink");
  const c1 = CF.advanceDreamLibrary(st, 60);
  assert.ok(c1.chapters.length === 1 && c1.chapters[0].newPage && c1.chapters[0].chapterIdx === 0, "chapter 1 completes and becomes a page");
  assert.equal(CF.getDreamPageAuthors(st, "volcano", 0), "沧澜幼龟、炽尾幼麟、镇岳巨岩尊", "the page records its authors in pillow order");
  assert.ok(st.res.futurecoin.value === coin0 + 6, "first-edition chapter of book 1 gives futurecoin +6");
  assert.ok(st.mons.list[1].exp === 60 && st.mons.list[1].affection === 2, "dreamers gain exp +60 and affection +2");

  // Bedtime story: free once per local day, then futurecoin ×20
  const d0 = new Date(2026, 10, 18, 21).getTime();
  const s1 = CF.performDreamStory(st, { nowMs: d0 });
  assert.ok(s1.ok && s1.costKind === "free_daily" && s1.ink === 180, "free bedtime story adds 180 ink");
  st.res.futurecoin.value = 25;
  const s2 = CF.performDreamStory(st, { nowMs: d0 + 1000 });
  const s2Coins = s2.chapters.reduce((s, c) => s + (c.rewards.futurecoin || 0), 0);
  assert.ok(s2.ok && s2.costKind === "futurecoin" && st.res.futurecoin.value === 5 + s2Coins, "paid story costs futurecoin ×20");
  st.res.futurecoin.value = 0;
  assert.equal(CF.performDreamStory(st, { nowMs: d0 + 2000 }).reason, "insufficient_story_cost", "story blocked without coins");
  assert.ok(CF.getDreamStoryFreeLeft(st, d0) === 0 && CF.getDreamStoryFreeLeft(st, d0 + 86_400_000) === 1, "free story resets the next local day");
  st.res.futurecoin.value = 500;

  // Finish book 1 → bonus coins, aura lights up, auto-advance to the next unfinished book
  let guard = 0;
  while (!CF.isDreamBookComplete(st, "volcano") && guard++ < 50) CF.advanceDreamLibrary(st, 1800);
  assert.ok(CF.isDreamBookComplete(st, "volcano"), "《会唱歌的小火山》 completes after 4 chapters");
  assert.equal(st.meta.dreamLibrary.bookId, "honeyForest", "a finished book auto-advances to the next unlocked one");
  assert.ok(st.meta.dreamLibrary.recentLogs.some((l) => l.includes("【绘本完成】") && l.includes("PvE 增伤 +4%")), "completion is logged with its aura");
  const aura1 = CF.computeDreamLibraryAura(st);
  assert.ok(aura1.completeBooks === 1 && aura1.pveOutAdd === 0.04 && aura1.prodAdd >= 0.008, "book aura PvE +4% plus +0.2% per page");

  // Reread edition: rewards but no new page
  assert.ok(CF.selectDreamBook(st, "volcano").reread, "a completed book can be reread");
  const pagesBefore = CF.getDreamPageCount(st);
  st.meta.dreamLibrary.books.volcano.ink = CF.getDreamChapterNeed("volcano", st.meta.dreamLibrary.books.volcano.written) - 0.01;
  const rr = CF.advanceDreamLibrary(st, 10);
  assert.ok(rr.chapters.length === 1 && !rr.chapters[0].newPage && rr.chapters[0].rewards.catnip > 0 && CF.getDreamPageCount(st) === pagesBefore, "reread chapters give catnip + coins, no page");
  CF.selectDreamBook(st, "honeyForest");

  // 12h offline cap, books unlock by page count
  const off = CF.advanceDreamLibrary(st, 999_999);
  assert.ok(off.inkAdded > 0 && off.inkAdded <= 12 * 60 * 3 * 2.25 + 1e-6, "offline catch-up capped at 12 hours (max 3 × 2.25 ink/min)");
  guard = 0;
  while (CF.getDreamPageCount(st) < 20 && guard++ < 200) CF.advanceDreamLibrary(st, 12 * 3600);
  assert.equal(CF.getDreamPageCount(st), 20, "all 20 pages can be collected");
  assert.ok(CF.DREAM_BOOK_DEFS.every((b) => CF.isDreamBookUnlocked(st, b.id) && CF.isDreamBookComplete(st, b.id)), "all books unlocked and complete");
  const full = CF.computeDreamLibraryAura(st);
  assert.ok(
    full.title === "梦境绘本大师" && full.prodAdd === 0.08 && full.catchAdd === 0.008 && full.shinyAdd === 0.12 && full.pveOutAdd === 0.04,
    "full shelf: 全产 +8% · 捕获 +0.8% · 闪光 +12% · PvE +4%",
  );

  // Aura wiring
  const ref = defaultState();
  const bare = { catnipPerSec: 10, woodPerSec: 10, mineralsPerSec: 10 };
  finalizeProductionRates(bare, ref, 1);
  const boosted = { catnipPerSec: 10, woodPerSec: 10, mineralsPerSec: 10 };
  finalizeProductionRates(boosted, st, 1);
  assert.ok(boosted.catnipPerSec >= bare.catnipPerSec * 1.08 - 1e-6, "finalizeProductionRates applies the dream aura");
  const effS = computeTechEffects(st, { tech: {} }, { serverBuffLevels: new Map() });
  const effR = computeTechEffects(ref, { tech: {} }, { serverBuffLevels: new Map() });
  assert.ok(effS.catchChanceAdd >= effR.catchChanceAdd + 0.008 - 1e-9 && effS.shinyChanceMul >= effR.shinyChanceMul * 1.12 - 1e-9, "computeTechEffects applies dream catch / shiny");
  assert.ok(computeBreedingShinyInfo(st, st.mons.list[0], st.mons.list[1]).rate > computeBreedingShinyInfo(ref, st.mons.list[0], st.mons.list[1]).rate, "breeding shiny odds include the dream aura");
  assert.ok(Math.abs(PT.computeDualSanctumBadgeBonus(st).dreamOutAdd - 0.04) < 1e-9, "PvE damage aggregator includes the dream aura");

  // Forced release, save / load, corrupt data, rebirth
  const forced = releaseMonIds(st, [3], { protectIds: new Set() });
  assert.ok(forced.removed === 1 && !CF.getDreamLibraryDreamerIds(st).has(3), "forced release wakes the dreamer");
  const saved = JSON.parse(JSON.stringify(serializeState(st)));
  const reloaded = loadFromRaw(saved);
  assert.ok(CF.getDreamPageCount(reloaded) === 20 && reloaded.meta.dreamLibrary.dreamerIds.join() === "1,2", "dream library survives serializeState -> loadFromRaw");
  assert.ok(busyMonIds(reloaded).has(1), "reloaded dreamer stays protected");
  const bogus = loadFromRaw(
    JSON.stringify({
      ...saved,
      meta: {
        ...saved.meta,
        dreamLibrary: { dreamerIds: [1, 1, 999, 2, 4, 5], bookId: "starfall", books: { volcano: { written: 9, ink: 99999 } }, pages: { "volcano:0": "A", "bogus:1": "x", "volcano:7": "y" } },
      },
    }),
  );
  const bd = bogus.meta.dreamLibrary;
  assert.ok(bd.dreamerIds.join() === "1,2,4", "dead / duplicate dreamers dropped, capped at 3 pillows");
  assert.ok(bd.bookId === "volcano" && bd.books.volcano.written === 3 && bd.books.volcano.ink < 630, "locked book falls back, progress clamped");
  assert.deepEqual(Object.keys(bd.pages), ["volcano:0"], "unknown page keys dropped");
  reloaded.dex.caught = Object.fromEntries([...Array(155)].map((_, i) => [String(i + 1), 1]));
  reloaded.tech = Object.fromEntries([...Array(16)].map((_, i) => [`t${i}`, true]));
  reloaded.buildings.field.owned = 60;
  reloaded.shinyCount = 5;
  reloaded.catchCount = 999;
  reloaded.era = emptyEraState(ERA_DEFS.length - 1);
  for (const k of ["catch_count", "pokeball_earned", "gather_total", "berry_earned"]) bumpEraCounter(reloaded, k, 999);
  syncEraQuests(reloaded);
  assert.equal(confirmPrestige(reloaded).ok, true, "confirmPrestige succeeds with partners dreaming");
  assert.ok(reloaded.meta.dreamLibrary.dreamerIds.length === 0 && CF.getDreamPageCount(reloaded) === 20, "rebirth wakes every dreamer; pages are permanent");
}

// ============================================================================
// 3) 溪畔钓鱼会
// ============================================================================
{
  const legacy = loadFromRaw(JSON.stringify({ version: 3, mons: { nextId: 2, list: [{ id: 1, dex: 4, pid: "p004", name: "炽尾幼麟", lvl: 5 }] } }));
  const lb = PT.computeFishingClubBonus(legacy);
  assert.ok(lb.prodMul === 1 && lb.catchAdd === 0 && lb.shinyChanceMul === 1 && lb.pveOutAdd === 0 && lb.species === 0, "legacy fishing bonus is neutral");
  assert.equal(PT.advanceFishingClub(legacy, 99_999).casts, 0, "advanceFishingClub is a no-op without a tracker");
  assert.equal(PT.computeDualSanctumBadgeBonus(legacy).fishingOutAdd, 0, "PvE aggregator: no fishing bonus on legacy saves");

  // Tables
  assert.equal(PT.FISHING_SECTIONS.length, 4, "4 creek sections");
  assert.equal(PT.FISHING_FISH_DEFS.length, 16, "16 fish species");
  assert.equal(new Set(PT.FISHING_SECTIONS.flatMap((s) => s.elements)).size, 9, "the 4 sections cover all 9 elements");
  for (const s of PT.FISHING_SECTIONS) {
    const fish = PT.getFishingSectionFish(s.id);
    assert.deepEqual(fish.map((f) => f.rarity).sort(), ["common", "common", "legend", "rare"], `${s.name}: 2 common / 1 rare / 1 legend`);
    assert.ok(fish.every((f) => s.elements.includes(f.element)), `${s.name}: every fish belongs to one of the section's elements`);
  }
  assert.deepEqual(PT.FISHING_TROPHY_TIERS.map((t) => t.minSpecies), [4, 8, 12, 16], "trophy tiers at 4 / 8 / 12 / 16 species");

  // Rotation: every 6 local hours, all 4 sections each day, shifted by one section per day
  const day = (d, h) => new Date(2026, 10, d, h, 30).getTime();
  const today = [0, 6, 12, 18].map((h) => PT.getFishingSection(day(18, h)).id);
  const tomorrow = [0, 6, 12, 18].map((h) => PT.getFishingSection(day(19, h)).id);
  assert.equal(new Set(today).size, 4, "all 4 sections open once per day");
  assert.equal(tomorrow[0], today[1], "the schedule shifts by one section per day");
  const sec = PT.getFishingSection(day(18, 7));
  assert.ok(sec.msUntilNext > 0 && sec.msUntilNext <= 6 * 3600 * 1000 && sec.next.id !== sec.id, "rotation countdown to the next section");

  // Angler evaluation: 「按属性挑选钓手」
  const st = freshState();
  const fc = PT.ensureFishingClubState(st);
  assert.ok(fc.initialized && fc.anglerIds.length === 0 && fc.creel.length === 0, "fresh fishing club");
  const willow = "willowBay";
  const evWater = PT.evaluateFishingAngler(st.mons.list[2], willow);
  const evFire = PT.evaluateFishingAngler(st.mons.list[0], willow);
  assert.ok(evWater.sectionMatch && evWater.biteChance === 0.85 && evWater.favFishIds.join() === "willowMinnow,bubbleFin", "water angler at 柳荫浅湾: 契合, bite 85%, favours the water fish");
  assert.ok(!evFire.sectionMatch && evFire.biteChance === 0.66 && evFire.favFishIds.length === 0, "fire angler at 柳荫浅湾: bite 60% + Lv.60 bonus");
  const weight = (mon, id) => PT.getFishingCatchOdds(mon, willow).find((o) => o.fishId === id).weight;
  assert.ok(weight(st.mons.list[2], "bubbleFin") === 35 && weight(st.mons.list[0], "bubbleFin") === 14, "matching element ×2.5 weight on that fish (14 → 35)");
  assert.ok(Math.abs(weight(st.mons.list[3], "jadeWhisker") - 12) < 1e-9 && weight(st.mons.list[0], "jadeWhisker") === 3, "section match ×1.6 × element ×2.5 on the 溪王 (3 → 12)");
  const oddsSum = PT.getFishingCatchOdds(st.mons.list[2], willow).reduce((s, o) => s + o.chance, 0);
  assert.ok(Math.abs(oddsSum - 1) < 0.01, "catch odds sum to 100%");

  // Spots
  const now = day(18, 7); // 卵石急滩 or whatever is open — use the live section
  const open = PT.getFishingSection(now);
  const pick = PT.autoPickFishingAnglers(st, { nowMs: now });
  assert.ok(pick.ok && pick.added.length === 3 && pick.sectionId === open.id, "一键选钓手 fills 3 spots for the open section");
  const matchedIdle = CF.getIdleFishingCandidates(st).filter((m) => PT.evaluateFishingAngler(m, open.id).sectionMatch);
  const unmatchedPicked = pick.added.filter((id) => !PT.evaluateFishingAngler(st.mons.list.find((m) => m.id === id), open.id).sectionMatch);
  assert.ok(!(matchedIdle.length && unmatchedPicked.length), "一键选钓手 never leaves a section-matched partner idle while an unmatched one fishes");
  assert.equal(PT.toggleFishingAngler(st, CF.getIdleFishingCandidates(st)[0].id).reason, "spots_full", "no 4th angler");
  const anglers = [...CF.getFishingAnglerMonIds(st)];
  for (const id of anglers) assert.ok(busyMonIds(st).has(id), `busyMonIds protects angler #${id}`);
  assert.equal(releaseMonIds(st, anglers, { protectIds: busyMonIds(st) }).removed, 0, "releaseMonIds refuses to release anglers");

  // Casting: every 15 min, creel cap 24, dex registration
  seed = 11;
  assert.equal(PT.advanceFishingClub(st, 899, { nowMs: now, randFloat: rng }).casts, 0, "no cast before 15 minutes");
  const c1 = PT.advanceFishingClub(st, 1, { nowMs: now + 1000, randFloat: rng });
  assert.ok(c1.casts === 1 && c1.caught.length <= 3, "one cast round at 15 minutes (≤1 fish per angler)");
  assert.ok(c1.caught.every((c) => PT.getFishingFishDef(c.fishId).sectionId === open.id), "fish come from the open section");
  const off = PT.advanceFishingClub(st, 999_999, { nowMs: now + 13 * 3600 * 1000, randFloat: rng });
  assert.ok(off.casts === 48 && st.meta.fishingClub.creel.length === PT.FISHING_CREEL_CAP && off.creelFull, "12h catch-up = 48 rounds; the creel stops at 24");
  // Offline casts use the section that was open at each cast: 1 angler, always bites, 12h ending at 12:00 → casts 00:15 … 06:00
  const ot = freshState();
  PT.ensureFishingClubState(ot);
  PT.toggleFishingAngler(ot, 9);
  const noon = new Date(2026, 10, 18, 12, 0).getTime();
  const oc = PT.advanceFishingClub(ot, 12 * 3600, { nowMs: noon, randFloat: () => 0 });
  const secA = PT.getFishingSection(new Date(2026, 10, 18, 3, 0).getTime()).id;
  const secB = PT.getFishingSection(new Date(2026, 10, 18, 6, 0).getTime()).id;
  assert.ok(oc.creelFull && ot.meta.fishingClub.creel.length === 24, "one angler fills the creel after 24 casts (6h)");
  assert.ok(
    ot.meta.fishingClub.creel.slice(0, 23).every((c) => c.sectionId === secA) && ot.meta.fishingClub.creel[23].sectionId === secB && secA !== secB,
    "casts before 06:00 fish the night section, the 06:00 cast already fishes the next one",
  );
  const dex = st.meta.fishingClub.dex;
  const caughtTotal = Object.values(dex).reduce((s, e) => s + e.count, 0);
  assert.equal(caughtTotal, st.meta.fishingClub.totalCaught, "every catch is registered in the dex");
  assert.ok(Object.entries(dex).every(([id, e]) => { const f = PT.getFishingFishDef(id); return e.best >= f.size[0] && e.best <= f.size[1]; }), "best sizes stay within each species' range");
  assert.equal(PT.performFishingChum(st).reason, "creel_full", "chum needs room in the creel");

  // Claim: rewards by rarity, angler exp / affection
  const exp0 = Object.fromEntries(anglers.map((id) => [id, st.mons.list.find((m) => m.id === id).exp]));
  const expected = {};
  const perMon = {};
  for (const c of st.meta.fishingClub.creel) {
    const f = PT.getFishingFishDef(c.fishId);
    for (const [rid, n] of Object.entries(PT.FISHING_RARITY[f.rarity].rewards)) expected[rid] = (expected[rid] || 0) + n;
    perMon[c.monId] = (perMon[c.monId] || 0) + 1;
  }
  const claim = PT.claimFishingCreel(st);
  assert.ok(claim.ok && claim.count === 24 && st.meta.fishingClub.creel.length === 0, "收鱼篓 empties the creel");
  assert.deepEqual(claim.rewards, expected, "rewards follow the rarity table");
  for (const id of anglers) {
    const m = st.mons.list.find((x) => x.id === id);
    assert.equal(m.exp - exp0[id], (perMon[id] || 0) * PT.FISHING_EXP_PER_FISH, `angler #${id} gains +40 exp per fish`);
  }
  assert.equal(PT.claimFishingCreel(st).reason, "empty_creel", "nothing to claim twice");

  // Chum: free once per local day, then futurecoin ×20
  const d0 = day(18, 9);
  const ch1 = PT.performFishingChum(st, { nowMs: d0, randFloat: rng });
  assert.ok(ch1.ok && ch1.costKind === "free_daily" && ch1.caught.length === anglers.length, "free chum: every angler lands a fish (guaranteed bite)");
  st.res.futurecoin.value = 25;
  const ch2 = PT.performFishingChum(st, { nowMs: d0 + 1000, randFloat: rng });
  assert.ok(ch2.ok && ch2.costKind === "futurecoin" && st.res.futurecoin.value === 5, "paid chum costs futurecoin ×20");
  assert.equal(PT.performFishingChum(st, { nowMs: d0 + 2000, randFloat: rng }).reason, "insufficient_chum_cost", "chum blocked without coins");
  assert.ok(PT.getFishingChumFreeLeft(st, d0) === 0 && PT.getFishingChumFreeLeft(st, d0 + 86_400_000) === 1, "free chum resets the next local day");

  // Trophy / bonus math on a crafted dex
  const tro = freshState();
  tro.meta.fishingClub = { dex: Object.fromEntries(PT.FISHING_FISH_DEFS.map((f) => [f.id, { count: 1, best: f.size[1] }])) };
  const tb = PT.computeFishingClubBonus(tro);
  assert.ok(tb.species === 16 && tb.legends === 4 && tb.trophyTier === 4 && tb.trophyName === "彩虹鱼杯", "16 species → 彩虹鱼杯");
  assert.ok(tb.prodAdd === 0.032 && tb.catchAdd === 0.01 && tb.shinyAdd === 0.1 && tb.pveOutAdd === 0.04, "full dex: 全产 +3.2% · 捕获 +1% · 闪光 +10% · PvE +4%");
  tro.meta.fishingClub.dex = { willowMinnow: { count: 3, best: 10 }, mossDace: { count: 1, best: 12 }, pebbleGoby: { count: 2, best: 9 }, mapleBream: { count: 1, best: 15 } };
  assert.equal(PT.computeFishingClubBonus(tro).trophyName, "铜鱼杯", "4 species → 铜鱼杯");

  // Aura wiring
  const ref = defaultState();
  const bare = { catnipPerSec: 10, woodPerSec: 10, mineralsPerSec: 10 };
  finalizeProductionRates(bare, ref, 1);
  const full = freshState();
  full.meta.fishingClub = { dex: Object.fromEntries(PT.FISHING_FISH_DEFS.map((f) => [f.id, { count: 1, best: f.size[0] }])) };
  const boosted = { catnipPerSec: 10, woodPerSec: 10, mineralsPerSec: 10 };
  finalizeProductionRates(boosted, full, 1);
  assert.ok(boosted.catnipPerSec >= bare.catnipPerSec * 1.032 - 1e-6, "finalizeProductionRates applies the fishing bonus");
  const effS = computeTechEffects(full, { tech: {} }, { serverBuffLevels: new Map() });
  const effR = computeTechEffects(ref, { tech: {} }, { serverBuffLevels: new Map() });
  assert.ok(effS.catchChanceAdd >= effR.catchChanceAdd + 0.01 - 1e-9 && effS.shinyChanceMul >= effR.shinyChanceMul * 1.1 - 1e-9, "computeTechEffects applies fishing catch / shiny");
  assert.ok(computeBreedingShinyInfo(full, full.mons.list[0], full.mons.list[1]).rate > computeBreedingShinyInfo(ref, full.mons.list[0], full.mons.list[1]).rate, "breeding shiny odds include the fishing bonus");
  assert.ok(Math.abs(PT.computeDualSanctumBadgeBonus(full).fishingOutAdd - 0.04) < 1e-9, "PvE damage aggregator includes the fishing trophy");

  // Forced release, recall, save / load, corrupt data, rebirth
  const victim = anglers[0];
  const forced = releaseMonIds(st, [victim], { protectIds: new Set() });
  assert.ok(forced.removed === 1 && !CF.getFishingAnglerMonIds(st).has(victim), "forced release reels the angler in");
  assert.ok(st.meta.fishingClub.creel.every((c) => c.monId !== victim), "its creel fish lose their owner");
  const saved = JSON.parse(JSON.stringify(serializeState(st)));
  const reloaded = loadFromRaw(saved);
  assert.ok(reloaded.meta.fishingClub.totalCaught === st.meta.fishingClub.totalCaught && reloaded.meta.fishingClub.anglerIds.length === 2, "fishing club survives serializeState -> loadFromRaw");
  const savedFresh = JSON.parse(JSON.stringify(serializeState(freshState())));
  const bogus = loadFromRaw(
    JSON.stringify({
      ...savedFresh,
      meta: {
        ...savedFresh.meta,
        fishingClub: {
          anglerIds: [9, 9, 999, 4, 5, 6],
          creel: [...Array(40)].map(() => ({ fishId: "willowMinnow", size: 999 })).concat([{ fishId: "nope" }]),
          dex: { willowMinnow: { count: 2, best: -5 }, nope: { count: 9 } },
        },
      },
    }),
  );
  const bf = bogus.meta.fishingClub;
  assert.ok(bf.anglerIds.join() === "9,4,5" && bf.creel.length === 24 && bf.creel[0].size === 14, "anglers deduped / capped, creel clamped to 24, sizes clamped");
  assert.ok(Object.keys(bf.dex).join() === "willowMinnow" && bf.dex.willowMinnow.best === 6, "unknown species dropped, best size clamped");
  assert.ok(PT.recallFishingAnglers(st).recalled === 2 && CF.getFishingAnglerMonIds(st).size === 0, "全部收竿 frees every angler");
  PT.autoPickFishingAnglers(st);
  const rb = PT.recallFishingClubForRebirth(st);
  assert.ok(rb.recalled > 0 && st.meta.fishingClub.anglerIds.length === 0 && st.meta.fishingClub.totalCaught > 0, "rebirth reels everyone in; the dex is permanent");
}

console.log("ml14-selfcheck: OK");
