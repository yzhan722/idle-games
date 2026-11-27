#!/usr/bin/env node
// ML-16 验证脚本：云端游乐园 + 星空露营观测 + 统一外出登记表（第 11 / 12 项）+「一键收取已归来伙伴」。
// 用法：node scripts/ml16-selfcheck.mjs（selfcheck.mjs 也会调用）
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defaultState, serializeState, loadFromRaw } from "../modules/state.js";
import * as CF from "../modules/systems/collection_fun.js";
import { COLLECTION_FILES, collectionSource } from "./_collection_src.mjs";
import * as PT from "../modules/systems/pve_tower.js";
import { busyMonIds, pickWeakMonIds, releaseMonIds } from "../modules/systems/mon_release.js";
import { computeTechEffects } from "../modules/systems/effects.js";
import { finalizeProductionRates } from "../modules/systems/production.js";
import { computeBreedingShinyInfo } from "../modules/systems/breeding.js";
import { confirmPrestige, emptyEraState, bumpEraCounter, syncEraQuests } from "../modules/systems/era.js";
import { ERA_DEFS } from "../modules/defs_eras.js";
import { monPower } from "../modules/mons.js";
import { WEBP_UI_ICONS, renderResSvg, renderUiIcon } from "../modules/render/rpg_svg_icons.js";

// 界面文案审视后全仓版本号升到 0.7.57，ML-17 起为 0.7.58，商业化欠账轮起为 0.7.59，自有数值轮起为 0.7.60，首屏与安全轮为 0.7.61，其审查修复起为 0.7.62，交流管控轮（ML-COM3）起为 0.7.63：VERSION 校验当前构建的版本同步 / 图标缓存号（PREV_VERSION 为不得残留的旧号），
// ML16_VERSION / ML15_VERSION 校验 ML-16、ML-15 自己的帮助块与样式块标签
const VERSION = "0.7.63";
const PREV_VERSION = "0.7.57";
const ML16_VERSION = "0.7.56";
const ML15_VERSION = "0.7.55";
const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = (...p) => readFileSync(path.join(rootDir, ...p), "utf8");
const ML16_ICONS = ["cloudPark", "carouselRide", "parkTicket", "starCamp", "campfireBadge", "meteorSighting"];
/** This round re-uses existing art under new names: copy → original. A copy must never share a section / modal with its original. */
const REUSED_FROM = Object.freeze({
  cloudPark: "skyIsland",
  carouselRide: "bandStage",
  parkTicket: "mapFragment",
  starCamp: "campTentStar",
  campfireBadge: "nocturnalCrest",
  meteorSighting: "nightObservatory",
});

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
  mk(9, 150, "幻梦灵", ["mystic"], 70),
  mk(10, 10, "翠玉灵蚕", ["grass"], 30),
  mk(11, 11, "茧团团", ["grass"], 31),
  mk(12, 12, "粉蝶蝶", ["wind"], 32),
];
const freshState = () => {
  const st = defaultState();
  st.mons.list = roster();
  st.mons.nextId = 13;
  st.res.futurecoin = { value: 500, cap: 99999 };
  return st;
};
const seeded = (s0) => {
  let s = s0;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
};
const day = (d, h, m = 30) => new Date(2026, 10, d, h, m).getTime();
const clone = (x) => JSON.parse(JSON.stringify(x));
const resOf = (st, rid) => Math.floor(Number(st.res?.[rid]?.value) || 0);

function webpInfo(buf) {
  if (buf.slice(0, 4).toString() !== "RIFF" || buf.slice(8, 12).toString() !== "WEBP") return null;
  const chunk = buf.slice(12, 16).toString();
  if (chunk === "VP8X") return { w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3), alpha: Boolean(buf[20] & 0x10), chunk };
  if (chunk === "VP8L") {
    const b = buf.readUInt32LE(21);
    return { w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1, alpha: Boolean((b >> 28) & 1), chunk };
  }
  return { w: 0, h: 0, alpha: false, chunk };
}

function* walkJs(dir) {
  for (const e of readdirSync(dir)) {
    const p = path.join(dir, e);
    if (statSync(p).isDirectory()) yield* walkJs(p);
    else if (/\.(js|mjs)$/.test(e)) yield p;
  }
}

/** Builds a save with one partner on every kind of away state, some returned, some still out. */
function returnedFixture() {
  const st = freshState();
  const now = day(18, 21, 0);
  // 星空露营：营地 0 归营待收取（#1），营地 1 夜营中（#2）
  PT.ensureStargazeCampState(st);
  assert.ok(PT.dispatchStargazeCamp(st, 0, [1], { nowMs: now }).ok, "fixture: camper #1 at 萤火草坡");
  PT.advanceStargazeCamp(st, PT.STARGAZE_SITES[0].campMin * 60, { randFloat: () => 0 });
  assert.ok(PT.dispatchStargazeCamp(st, 1, [2], { nowMs: now }).ok, "fixture: camper #2 at 镜湖星湾");
  // 彩虹气球：1 号已降落（#3），2 号飞行中（#4）
  PT.ensureBalloonTravelState(st);
  const [isleA, isleB] = PT.getBalloonIsleRotation(now).openIds;
  assert.ok(PT.dispatchBalloon(st, 0, isleA, [3], { nowMs: now }).ok, "fixture: traveller #3");
  PT.advanceBalloonTravel(st, PT.getBalloonIsleDef(isleA).tripMin * 60, { randFloat: () => 0 });
  assert.ok(PT.dispatchBalloon(st, 1, isleB, [4], { nowMs: now }).ok, "fixture: traveller #4");
  // 邮局：草原邮路已回来（#5），林地邮路还在路上（#6）
  st.meta.postOffice = {
    letters: 2,
    trips: [
      { routeId: "meadow", monId: 5, tripSec: 600, elapsedSec: 600 },
      { routeId: "woods", monId: 6, tripSec: 900, elapsedSec: 100 },
    ],
  };
  PT.ensurePostOfficeState(st);
  // 心愿码头：星砂浅滩满载归港（#7）
  assert.ok(CF.dispatchWishDockRoute(st, "shoal", [7], { nowMs: now }).ok, "fixture: dock crew #7");
  CF.advanceWishDock(st, 99999);
  // 寻宝远航：登岛后体力耗尽却还挂在岛上（#8）
  const tv = CF.ensureTreasureVoyageState(st);
  tv.maps = 1;
  assert.ok(CF.startTreasureVoyage(st, "palmCove", { crewIds: [8], seed: 7, nowMs: now }).ok, "fixture: voyage crew #8");
  tv.voyage.phase = "exploring";
  tv.voyage.sailSec = tv.voyage.sailNeedSec;
  tv.voyage.steps = 3;
  tv.voyage.stamina = 0;
  // 驻场类：游乐园值班（#9）、烘焙坊（#10）——它们不属于「已归来」
  CF.ensureCloudParkState(st);
  assert.ok(CF.assignParkOperator(st, "carousel", 9).operating, "fixture: park operator #9");
  CF.ensureBakeryState(st);
  assert.ok(CF.assignBakeryWorker(st, "knead", 10).working, "fixture: baker #10");
  return st;
}

// ============================================================================
// 0) Icons (128×128 transparent WebP — shown at 44px at most, resampled in 0.7.61, reused art under new names), version sync, UI / tick / rebirth / load wiring
// ============================================================================
{
  for (const key of ML16_ICONS) {
    const file = path.join(rootDir, "assets", "ui_icons", `${key}.webp`);
    assert.ok(existsSync(file), `ML-16 icon asset exists: ${key}.webp`);
    const buf = readFileSync(file);
    const info = webpInfo(buf);
    assert.ok(info, `${key}.webp is a real WebP file`);
    assert.ok(info.w === 128 && info.h === 128, `${key}.webp is 128×128 (got ${info.w}×${info.h})`);
    assert.ok(info.alpha, `${key}.webp carries an alpha channel (transparent background)`);
    assert.equal(WEBP_UI_ICONS[key], key, `WEBP_UI_ICONS registers ${key}`);
    assert.ok(
      renderUiIcon(key, 24).includes(`${key}.webp?v=${VERSION}`) && renderResSvg(key, 20).includes(`${key}.webp?v=${VERSION}`),
      `rpg_svg_icons wires ${key}.webp?v=${VERSION}`,
    );
    const orig = readFileSync(path.join(rootDir, "assets", "ui_icons", `${REUSED_FROM[key]}.webp`));
    assert.ok(Buffer.compare(buf, orig) === 0, `${key}.webp is the reused ${REUSED_FROM[key]}.webp art (documented reuse)`);
  }
  // Version sync across every versioned file
  assert.ok(src("modules", "config.js").includes(`VERSION: "${VERSION}"`), "config.js version");
  assert.ok(src("modules", "app", "game_state.js").includes(`GAME_STATE_SYNC_VERSION = "${VERSION}"`), "game_state.js version");
  assert.ok(src("main.js").includes(`CURRENT_VERSION = "${VERSION}"`), "main.js version");
  assert.ok(src("app.js").includes(`gameVersion: "${VERSION}"`), "app.js version");
  assert.ok(src("sw.js").includes(`mengling-v${VERSION}`) && !src("sw.js").includes(PREV_VERSION), "sw.js cache version");
  assert.ok(src("functions", "api", "health.js").includes(`version: "${VERSION}"`), "health.js version");
  const html = src("index.html");
  assert.ok(
    (html.match(new RegExp(`\\?v=${VERSION.replace(/\./g, "\\.")}`, "g")) || []).length >= 9 && html.includes(`v${VERSION}</span>`) && !html.includes(PREV_VERSION),
    "index.html assets + topbar synced",
  );
  assert.ok(!src("modules", "render", "rpg_svg_icons.js").includes(PREV_VERSION), "rpg_svg_icons.js has no stale version");
  const help = src("modules", "tabs", "help_tab.js");
  assert.ok(help.includes(`版本 v${VERSION}`) && help.includes(`v${ML16_VERSION} 新增`) && help.includes("云端游乐园与星空露营观测") && help.includes(`v${ML15_VERSION} 新增`), "help tab version + ML-16 block (ML-15 block kept)");
  const helpBlock = help.slice(help.indexOf('rows.push(block("云端游乐园与星空露营观测"'), help.indexOf('rows.push(block("云朵甜点烘焙坊与彩虹气球旅行"'));
  assert.ok(helpBlock.includes("一键收取已归来伙伴") && helpBlock.includes('renderUiIcon("carouselRide"'), "help block documents one-click collect, uses the carouselRide icon");
  assert.ok(!/renderUiIcon\("(skyIsland|bandStage|mapFragment|campTentStar|nocturnalCrest|nightObservatory)"/.test(helpBlock), "help block shows no original of a reused icon");
  assert.ok(src("styles.css").includes(`ML-16 「云端游乐园」&「星空露营观测」&「一键收取已归来伙伴」 (v${ML16_VERSION})`), "styles.css ML-16 block");

  const ft = src("modules", "tabs", "functions_tab.js");
  const iA = ft.indexOf("ML-16 Section: 外出归来「一键收取已归来伙伴」");
  const iB = ft.indexOf("ML-16 Section: 萌灵「云端游乐园」");
  const iC = ft.indexOf("ML-16 Section: 萌灵「星空露营观测」");
  const iD = ft.indexOf("ML-15 Section: 萌灵「云朵甜点烘焙坊」");
  assert.ok(iA > 0 && iB > iA && iC > iB && iD > iC, "ML-16 collect + park + stargaze UI sections exist ahead of ML-15");
  assert.ok(ft.indexOf("功能摘要") < iA, "the one-click collect panel sits right under the functions summary (top of the tab)");
  const ml16Ui = ft.slice(iA, iD);
  assert.ok(ml16Ui.length > 12000, "ML-16 UI sections are substantial");
  assert.ok(!/<svg/i.test(ml16Ui) && !/<canvas/i.test(ml16Ui), "ML-16 UI uses webp icons only (no inline svg / canvas)");
  assert.ok(!/\p{Extended_Pictographic}/u.test(ml16Ui), "ML-16 UI has no emoji");
  for (const key of ML16_ICONS) assert.ok(ml16Ui.includes(`renderUiIcon("${key}"`), `functions tab renders the ${key} icon`);
  // Reused art: inside each ML-16 section (and its modal) the copy and its original never appear together
  for (const [name, a, b] of [
    ["collect panel", iA, iB],
    ["cloud park", iB, iC],
    ["stargaze camp", iC, iD],
  ]) {
    const sec = ft.slice(a, b);
    for (const [copy, orig] of Object.entries(REUSED_FROM)) {
      assert.ok(!sec.includes(`renderUiIcon("${orig}"`), `${name} section never renders the original ${orig} (reused as ${copy})`);
    }
  }
  assert.ok(ft.includes("patchCloudParkLiveDom(stLive)") && ft.includes("patchStargazeLiveDom(stLive)"), "ML-16 progress bars are live-patched between full re-renders");
  assert.ok(ft.includes("collectAllReturnedPartners(state, ml16Opts)") && ft.includes('data-away-collect-all="1"'), "functions tab wires the one-click collect button");
  assert.ok(ft.includes("外出归来待收取") && ft.includes("getReturnedPartnersSummary(state)"), "functions summary hints when partners wait to be collected");
  const tick = src("modules", "tick.js");
  assert.ok(tick.includes("advanceCloudPark(state, dtSec") && tick.includes("advanceStargazeCamp(state, dtSec"), "tick.js advances the park and the night camps");
  assert.ok(tick.includes("getAwayReturnedUnits(state).length") && tick.includes("一键收取已归来伙伴"), "tick.js hints in the log when more partners come back");
  const era = src("modules", "systems", "era.js");
  assert.ok(era.includes("recallCloudParkForRebirth(state)") && era.includes("recallStargazeCampForRebirth(state)"), "confirmPrestige sends operators home and packs up camps");
  const stateSrc = src("modules", "state.js");
  assert.ok(stateSrc.includes("ensureCloudParkState(s)") && stateSrc.includes("ensureStargazeCampState(s)"), "loadFromRaw normalizes both trackers");
  const mr = src("modules", "systems", "mon_release.js");
  assert.ok(mr.includes("detachCloudParkOperator(state, m.id)") && mr.includes("detachStargazeCamper(state, m.id)"), "forced release detaches operators / campers");
  const monsSrc = src("modules", "render", "mons.js");
  assert.ok(monsSrc.includes('renderUiIcon("carouselRide", 13)') && monsSrc.includes('renderUiIcon("starCamp", 13)'), "mon detail tags for operators / campers");
  const sc = src("scripts", "selfcheck.mjs");
  assert.ok(sc.includes('"ml16-selfcheck.mjs"'), "selfcheck.mjs runs ml16-selfcheck");
}

// ============================================================================
// 1) Unified away registry: the two outings are ONE row each; the returned readers are the one-click collect's only source
// ============================================================================
{
  // ML-17 起登记表前面又加了冰晶溜冰场 / 花田蜜蜂工坊两行（ml17-selfcheck 校验），这里只核对 ML-9 ~ ML-16 的 12 行
  const ids = CF.AWAY_ACTIVITY_DEFS.map((a) => a.id).slice(-12);
  assert.deepEqual(
    ids,
    ["stargazeCamp", "cloudPark", "balloonTravel", "cloudBakery", "fishingClub", "dreamLibrary", "hotSpring", "postOffice", "treasureVoyage", "skyIsland", "nightObservatory", "wishDock"],
    "away registry: 12 away activities (ML-9 ~ ML-16), the two ML-16 outings registered first",
  );
  for (const a of CF.AWAY_ACTIVITY_DEFS) assert.ok(a.title && a.label && a.releaseHint && a.blockLog, `away activity ${a.id} has title / label / release hint / block log`);
  assert.deepEqual(CF.AWAY_RETURNABLE_ACTIVITY_IDS.slice(-5), ["stargazeCamp", "balloonTravel", "postOffice", "treasureVoyage", "wishDock"], "returnable activities: every outing with a returned-but-uncollected state");
  assert.deepEqual([...PT.AWAY_RETURN_COLLECTOR_IDS].sort(), [...CF.AWAY_RETURNABLE_ACTIVITY_IDS].sort(), "every returnable registry row has exactly one collector (and vice versa)");

  // Source guard: the raw readers are only used by the registry itself, their own systems and the mon-detail tag
  const allowed = new Set([
    ...COLLECTION_FILES,
    path.join(rootDir, "modules", "systems", "pve_tower.js"),
    path.join(rootDir, "modules", "render", "mons.js"),
  ]);
  for (const file of walkJs(path.join(rootDir, "modules"))) {
    const text = readFileSync(file, "utf8");
    if (!/getCloudParkOperatorMonIds|getStargazeCamperMonIds/.test(text)) continue;
    assert.ok(allowed.has(file), `no separate exclusion list: ${path.relative(rootDir, file)} must read the away registry instead`);
  }
  const cfSrc = collectionSource();
  const reg = cfSrc.slice(cfSrc.indexOf("const AWAY_ACTIVITY_REGISTRY"), cfSrc.indexOf("export const AWAY_ACTIVITY_DEFS"));
  assert.ok(reg.includes("read: (s) => getCloudParkOperatorMonIds(s)") && reg.includes("read: (s) => getStargazeCamperMonIds(s)"), "both readers are wired as registry rows");
  for (const fn of ["listStargazeReturnedUnits", "listBalloonReturnedUnits", "listPostReturnedUnits", "listTreasureVoyageReturnedUnits", "listWishDockReturnedUnits"]) {
    assert.ok(reg.includes(`returned: (s) => ${fn}(s)`), `${fn} is wired as a registry returned reader`);
  }
  assert.equal((cfSrc.match(/getCloudParkOperatorMonIds\(/g) || []).length, 3, "collection modules: park reader = definition + registry + aura count");
  assert.equal((cfSrc.match(/getStargazeCamperMonIds\(/g) || []).length, 2, "collection modules: camper reader = definition + registry");
  const ptSrc = src("modules", "systems", "pve_tower.js");
  assert.ok(!/getStargazeCamperMonIds|getCloudParkOperatorMonIds/.test(ptSrc), "pve_tower.js never re-lists campers / operators (registry only)");
  const nonSandbox = cfSrc.slice(cfSrc.indexOf("export function getNonSandboxBusyIds"), cfSrc.indexOf("export function getEcoSandboxBusyIds"));
  assert.ok(nonSandbox.includes("getAwayMonIds(state)") && !nonSandbox.includes("Park") && !nonSandbox.includes("Stargaze"), "getNonSandboxBusyIds still reads only the registry");
  const coll = ptSrc.slice(ptSrc.indexOf("const AWAY_RETURN_COLLECTORS"), ptSrc.indexOf("export const AWAY_RETURN_COLLECTOR_IDS"));
  for (const fn of ["claimStargazeSite(", "claimBalloon(", "claimPostTrip(", "returnFromTreasureVoyage(", "claimWishDockRoute("]) {
    assert.ok(coll.includes(fn), `one-click collect reuses the activity's own ${fn.slice(0, -1)}`);
  }

  // Behavior: operator #1 (carousel), camper #2 — everything else follows automatically
  const st = freshState();
  CF.ensureCloudParkState(st);
  assert.ok(CF.assignParkOperator(st, "carousel", 1).operating, "partner #1 operates the carousel");
  PT.ensureStargazeCampState(st);
  assert.ok(PT.dispatchStargazeCamp(st, 0, [2], { nowMs: day(18, 9) }).ok, "partner #2 goes on a night camp");
  st.meta.fishingClub = { anglerIds: [3] };
  const away = CF.getAwayMonIds(st);
  assert.deepEqual([...away].sort((a, b) => a - b), [1, 2, 3], "getAwayMonIds unions operator + camper + angler");
  const map = CF.getAwayActivityMap(st);
  assert.deepEqual([1, 2, 3].map((id) => map.get(id).label), ["游乐园值班中", "夜营观星中", "垂钓中"], "each away partner labelled by its activity");
  assert.ok(CF.getAwayActivityOfMon(st, 1).releaseHint.includes("云端游乐园") && CF.getAwayActivityOfMon(st, 2).blockLog.includes("星空露营地"), "release hint / block log come from the registry row");
  for (const [name, set] of [
    ["busyMonIds", busyMonIds(st)],
    ["getNonSandboxBusyIds", CF.getNonSandboxBusyIds(st)],
    ["getCampUnavailableMonIds", CF.getCampUnavailableMonIds(st)],
    ["getAcrobatUnavailableMonIds", PT.getAcrobatUnavailableMonIds(st)],
    ["getBandUnavailableMonIds", PT.getBandUnavailableMonIds(st)],
  ]) {
    for (const id of away) assert.ok(set.has(id), `${name} covers away partner #${id}`);
  }
  assert.ok(!CF.excludeAwayMons(st, st.mons.list).some((m) => away.has(m.id)), "excludeAwayMons (training / expedition / squads) drops operator + camper");
  assert.deepEqual(CF.dropAwayMonIds(st, [9, 1, 2, 4]), [9, 4], "dropAwayMonIds (persisted expedition team) drops operator + camper");
  const weak = pickWeakMonIds(st.mons.list, { softLimit: 1, batch: 20, protectIds: busyMonIds(st) });
  assert.ok(![1, 2].some((id) => weak.includes(id)), "box-overflow auto release never picks an operator / camper");
  for (const [name, list] of [
    ["dream", CF.getIdleDreamCandidates(st)],
    ["fishing", CF.getIdleFishingCandidates(st)],
    ["hot spring", CF.getIdleHotSpringCandidates(st)],
    ["post office", PT.getIdlePostMessengerCandidates(st)],
    ["voyage", CF.getIdleTreasureVoyageCandidates(st)],
    ["bakery", CF.getIdleBakeryCandidates(st)],
    ["balloon", CF.getIdleBalloonCandidates(st)],
    ["park", CF.getIdleParkCandidates(st)],
    ["stargaze", CF.getIdleStargazeCandidates(st)],
  ]) {
    assert.ok(!list.some((m) => away.has(m.id)), `${name} candidates exclude every away partner`);
  }
  assert.equal(CF.assignParkOperator(st, "ferrisWheel", 2).reason, "ride_locked", "the ferris wheel is not built yet");
  st.meta.cloudPark.totalVisitors = 500;
  assert.equal(CF.assignParkOperator(st, "ferrisWheel", 2).reason, "mon_busy", "a camper cannot operate a ride");
  assert.equal(CF.assignParkOperator(st, "ferrisWheel", 3).reason, "mon_busy", "an angler cannot operate a ride");
  assert.equal(PT.dispatchStargazeCamp(st, 1, [1], { nowMs: day(18, 9) }).reason, "mon_busy", "an operator cannot go camping");
  assert.equal(CF.assignBakeryWorker(st, "bake", 1).reason, "mon_busy", "an operator cannot bake");
  assert.equal(PT.dispatchBalloon(st, 0, PT.getBalloonIsleRotation(day(18, 9)).openIds[0], [2], { nowMs: day(18, 9) }).reason, "mon_busy", "a camper cannot board a balloon");
  const tri = PT.toggleEcoTriSquadMon(st, 1);
  assert.ok(!tri.ok && tri.reason === "mon_away" && tri.awayLabel === "游乐园值班中", "tri-element championship refuses the operator via the registry");
  PT.ensureChampionLeagueState(st);
  PT.ensureStarCorridorState(st);
  const lg = PT.toggleChampionLeagueSquadMon(st, 2);
  assert.ok(!lg.ok && lg.reason === "mon_away" && lg.awayId === "stargazeCamp", "champion league manual entry refuses the camper");
  const cr = PT.toggleStarCorridorSquadMon(st, 1);
  assert.ok(!cr.ok && cr.reason === "mon_away" && cr.awayId === "cloudPark", "star corridor manual entry refuses the operator");
  assert.ok(PT.autofillChampionLeagueSquad(st, (m) => m.types, monPower).squadIds.every((id) => !away.has(id)), "league auto squad skips operator / camper");
}

// ============================================================================
// 2) 云端游乐园
// ============================================================================
{
  const legacy = loadFromRaw(JSON.stringify({ version: 3, res: { futurecoin: { value: 5, cap: 999 } }, mons: { nextId: 2, list: [{ id: 1, dex: 4, pid: "p004", name: "炽尾幼麟", lvl: 5 }] } }));
  assert.ok(legacy && !legacy.meta.cloudPark && !legacy.meta.stargazeCamp, "legacy save loads without the ML-16 trackers");
  const la = CF.computeCloudParkAura(legacy);
  assert.ok(la.prodMul === 1 && la.catchAdd === 0 && la.shinyChanceMul === 1 && la.pveOutAdd === 0 && la.stars === 0, "legacy park aura is neutral");
  assert.equal(CF.advanceCloudPark(legacy, 99_999).rounds.length, 0, "advanceCloudPark is a no-op without a tracker");
  assert.ok(!busyMonIds(legacy).has(1) && !legacy.meta.cloudPark, "legacy partner is not locked and no tracker was created");
  assert.equal(PT.computeDualSanctumBadgeBonus(legacy).parkOutAdd, 0, "PvE aggregator: no park bonus on legacy saves");

  // Tables
  assert.equal(CF.PARK_RIDES.length, 3, "3 rides (旋转木马 / 摩天轮 / 过山车)");
  assert.deepEqual(CF.PARK_RIDES.map((r) => r.short), ["旋转木马", "摩天轮", "过山车"], "rides named after the roadmap");
  const els = CF.PARK_RIDES.flatMap((r) => r.elements);
  assert.ok(els.length === 9 && new Set(els).size === 9, "the 3 rides split all 9 elements without overlap");
  assert.deepEqual(CF.PARK_RIDES.map((r) => r.unlockVisitors), [0, 60, 200], "rides open at 0 / 60 / 200 visitors");
  assert.deepEqual([...new Set(CF.PARK_EVENT_DEFS.map((e) => e.stat))].sort(), ["catch", "prod", "pveOut", "shiny"], "4 events = 4 different timed buffs");
  assert.deepEqual([0, 19, 20, 49, 50, 79, 80, 100].map((s) => CF.getParkSatisfactionTier(s).bonusVisitors), [0, 0, 0, 0, 1, 1, 2, 2], "satisfaction ≥50 / ≥80 adds 1 / 2 visitors per round");
  assert.deepEqual([0, 149, 150, 600, 1500, 3500, 8000, 99999].map((n) => CF.getParkStars(n)), [0, 0, 1, 2, 3, 4, 5, 5], "park stars at 150 / 600 / 1500 / 3500 / 8000 visitors");

  const st = freshState();
  const pk = CF.ensureCloudParkState(st);
  assert.ok(pk.initialized && pk.satisfaction === CF.PARK_SAT_START && pk.tickets === 0 && Object.values(pk.operators).every((x) => x === 0), "fresh park: satisfaction 30, no tickets, no operators");
  assert.ok(CF.isParkRideUnlocked(st, "carousel") && !CF.isParkRideUnlocked(st, "ferrisWheel") && !CF.isParkRideUnlocked(st, "coaster"), "only the carousel is open at first");

  // Speeds: 1 × 1.5 契合 × (1 + 亲密 / 200)
  st.mons.list[3].affection = 100; // 青萝幼龙 grass
  const evGrass = CF.evaluateParkOperator(st.mons.list[3], "carousel");
  const evFire = CF.evaluateParkOperator(st.mons.list[0], "carousel");
  assert.ok(evGrass.match && evGrass.speed === 2.25 && evGrass.satGain === 3 && evGrass.roundSec === 160, "契合 + 亲密 100 → ×2.25, a 6-minute round in 160 s, satisfaction +3");
  assert.ok(!evFire.match && evFire.speed === 1 && evFire.satGain === 1 && evFire.roundSec === 360, "mismatched operator → ×1, 360 s, satisfaction +1");
  st.mons.list[3].affection = 0;

  // Nobody → nothing turns, satisfaction still decays
  const decay0 = CF.advanceCloudPark(st, 3600);
  assert.ok(decay0.rounds.length === 0 && Math.abs(st.meta.cloudPark.satisfaction - 18) < 1e-9, "an empty park only loses satisfaction (12 / hour)");
  assert.equal(CF.assignParkOperator(st, "coaster", 1).reason, "ride_locked", "locked rides cannot be staffed");

  // 一键排班 fills only the open ride with the matched partner
  const staff = CF.autoStaffCloudPark(st);
  assert.ok(staff.ok && staff.added.length === 1 && staff.added[0].rideId === "carousel" && staff.added[0].match, "一键排班 staffs the open carousel with a matched partner");
  assert.equal(st.meta.cloudPark.operators.carousel, 9, "fastest matched candidate: 幻梦灵 (mystic, Lv.70) wins the tie on level");
  assert.equal(CF.autoStaffCloudPark(st).reason, "rides_full", "no more open rides");
  for (const id of [9]) assert.ok(busyMonIds(st).has(id), `busyMonIds protects operator #${id}`);
  assert.equal(releaseMonIds(st, [9], { protectIds: busyMonIds(st) }).removed, 0, "releaseMonIds refuses to release an operator");

  // One round of the carousel: 360 / 1.5 = 240 s → 6 visitors (sat 18 → tier 0), tickets +6, satisfaction +3, exp +6
  const T0 = day(18, 10, 0);
  assert.equal(CF.advanceCloudPark(st, 239, { nowMs: T0 }).rounds.length, 0, "no round before 240 s");
  const r1 = CF.advanceCloudPark(st, 1, { nowMs: T0 + 1000 });
  assert.ok(r1.rounds.length === 1 && r1.visitors === 6 && st.meta.cloudPark.tickets === 6, "first round: 6 visitors → 6 tickets");
  const satAfter1 = 18 - (240 * 12) / 3600 + 3;
  assert.ok(Math.abs(st.meta.cloudPark.satisfaction - satAfter1) < 1e-6, "satisfaction decayed during the round, then +3 for the matched operator");
  assert.ok(st.mons.list[8].exp === 6 && st.mons.list[8].affection === 0, "operator exp +6 (affection every 5 rounds)");
  assert.ok(Math.abs(r1.rounds[0].at - (T0 + 1000)) < 5, "round time-stamp in ms at the end of the step");

  // Step-size independence (3h in one step vs 180 one-minute steps), with the ferris wheel open as well
  st.meta.cloudPark.totalVisitors = 100;
  CF.assignParkOperator(st, "ferrisWheel", 7); // 月华星后 light — matched
  const twinA = clone(st);
  const twinB = clone(st);
  const ra = CF.advanceCloudPark(twinA, 3 * 3600, { nowMs: day(18, 13, 0) });
  for (let i = 0; i < 180; i += 1) CF.advanceCloudPark(twinB, 60, { nowMs: day(18, 10, 0) + (i + 1) * 60_000 });
  assert.equal(twinA.meta.cloudPark.totalRounds, twinB.meta.cloudPark.totalRounds, "one 3h step turns as many rounds as 180 one-minute steps");
  assert.equal(twinA.meta.cloudPark.tickets, twinB.meta.cloudPark.tickets, "…same tickets");
  assert.ok(Math.abs(twinA.meta.cloudPark.satisfaction - twinB.meta.cloudPark.satisfaction) < 1e-6, "…same satisfaction");
  for (const rid of CF.PARK_RIDE_IDS) assert.ok(Math.abs(twinA.meta.cloudPark.rides[rid].work - twinB.meta.cloudPark.rides[rid].work) < 1e-6, `…same ${rid} progress`);
  assert.deepEqual(twinA.mons.list.map((m) => [m.exp, m.affection]), twinB.mons.list.map((m) => [m.exp, m.affection]), "…same operator exp / affection");
  assert.ok(ra.rounds.length > 60 && twinA.meta.cloudPark.satisfaction > 80, "3 matched hours fill the park with laughter (satisfaction > 80)");
  assert.ok(ra.rounds.some((r) => r.visitors === 6 + 2) && ra.rounds.some((r) => r.rideId === "ferrisWheel" && r.visitors >= 9), "high satisfaction brings extra visitors per round");

  // Offline catch-up: round time-stamps are milliseconds inside the window, in chronological order
  const off = clone(st);
  const Tend = day(18, 20, 0);
  const offStep = CF.advanceCloudPark(off, 2 * 3600, { nowMs: Tend });
  assert.ok(offStep.rounds.every((r) => r.at > Tend - 2 * 3600 * 1000 && r.at <= Tend), "every round time-stamp lies inside the offline window (ms, not s)");
  assert.ok(offStep.rounds.every((r, i, a) => i === 0 || r.at >= a[i - 1].at), "rounds are settled in chronological order");
  assert.ok(offStep.rounds[0].at < Tend - 1.9 * 3600 * 1000, "the first offline round is stamped early in the window");
  const capped = CF.advanceCloudPark(off, 999_999, { nowMs: Tend + 999_999_000 });
  assert.ok(capped.rounds.length < 12 * 3600 / 60, "offline catch-up is capped at 12 hours");
  assert.ok(off.meta.cloudPark.tickets === CF.PARK_TICKET_CAP && off.meta.cloudPark.ticketsLost > 0, "the ticket booth caps at 600; overflow is lost and counted");
  assert.ok(off.meta.cloudPark.recentLogs.some((l) => l.includes("售票亭满了")), "a full booth is logged once");

  // Events: cost, duration × satisfaction multiplier, satisfaction +8, 4h cap
  const ev = clone(st);
  ev.meta.cloudPark.tickets = 400;
  ev.meta.cloudPark.satisfaction = 85;
  const e1 = CF.launchParkEvent(ev, "fireworks");
  assert.ok(e1.ok && e1.addSec === 2700 && e1.eventMul === 1.5 && ev.meta.cloudPark.tickets === 280 && ev.meta.cloudPark.satisfaction === 93, "星空烟花秀: 120 tickets, 30 min ×1.5 = 45 min, satisfaction +8");
  ev.meta.cloudPark.satisfaction = 55;
  assert.equal(CF.launchParkEvent(ev, "lightShow").addSec, Math.round(1800 * 1.25), "≥50 → ×1.25");
  ev.meta.cloudPark.satisfaction = 10;
  ev.meta.cloudPark.tickets = 600;
  assert.equal(CF.launchParkEvent(ev, "parade").addSec, 1800, "below 50 → base 30 minutes");
  ev.meta.cloudPark.buffs.parade = CF.PARK_BUFF_MAX_SEC - 60;
  const capEv = CF.launchParkEvent(ev, "parade");
  assert.ok(capEv.capped && ev.meta.cloudPark.buffs.parade === CF.PARK_BUFF_MAX_SEC, "event buffs stack up to 4 hours");
  assert.equal(CF.launchParkEvent(ev, "parade").reason, "buff_full", "a full buff cannot be extended");
  ev.meta.cloudPark.tickets = 50;
  assert.equal(CF.launchParkEvent(ev, "carnival").reason, "not_enough_tickets", "events need tickets");
  const aura = CF.computeCloudParkAura(ev);
  assert.ok(aura.activeBuffs.length === 3 && Math.abs(aura.catchAdd - 0.01) < 1e-9 && Math.abs(aura.shinyAdd - 0.08) < 1e-9, "aura: parade catch +1%, light show shiny +8%");
  const decayEv = CF.advanceCloudPark(ev, CF.PARK_BUFF_MAX_SEC + 5);
  assert.ok(decayEv.expiredBuffs.includes("parade") && ev.meta.cloudPark.buffs.parade === 0, "buffs count down with real time and expire");

  // Gift exchange
  const gift = clone(st);
  gift.meta.cloudPark.tickets = 120;
  const coin0 = resOf(gift, "futurecoin");
  const gx = CF.exchangeParkTickets(gift);
  assert.ok(gx.ok && gift.meta.cloudPark.tickets === 70 && resOf(gift, "futurecoin") === coin0 + 4, "兑换礼包: 50 tickets → 未来币 +4 (灵果 / 灵木 as well)");
  gift.meta.cloudPark.tickets = 10;
  assert.equal(CF.exchangeParkTickets(gift).reason, "not_enough_tickets", "gift needs 50 tickets");

  // Extra show: free once per local day, then futurecoin ×20
  const show = clone(st);
  const d0 = day(18, 21);
  const rounds0 = show.meta.cloudPark.totalRounds;
  const s1 = CF.performParkExtraShow(show, { nowMs: d0 });
  assert.ok(s1.ok && s1.costKind === "free_daily" && s1.rounds.length === 2 && show.meta.cloudPark.totalRounds === rounds0 + 2, "free extra show turns every operated ride once");
  show.res.futurecoin.value = 25;
  const s2 = CF.performParkExtraShow(show, { nowMs: d0 + 1000 });
  assert.ok(s2.ok && s2.costKind === "futurecoin" && show.res.futurecoin.value === 5, "paid extra show costs futurecoin ×20");
  assert.equal(CF.performParkExtraShow(show, { nowMs: d0 + 2000 }).reason, "insufficient_show_cost", "extra show blocked without coins");
  assert.ok(CF.getParkShowFreeLeft(show, d0) === 0 && CF.getParkShowFreeLeft(show, d0 + 86_400_000) === 1, "free extra show resets the next local day");
  CF.dismissParkOperators(show);
  assert.equal(CF.performParkExtraShow(show, { nowMs: d0 + 86_400_000 }).reason, "no_operators", "an empty park cannot put on a show");

  // Unlocks / stars through visitors
  const grow = freshState();
  CF.ensureCloudParkState(grow);
  grow.meta.cloudPark.totalVisitors = 58;
  CF.assignParkOperator(grow, "carousel", 4);
  const g1 = CF.advanceCloudPark(grow, 400);
  assert.ok(g1.unlockedRides.includes("ferrisWheel") && grow.meta.cloudPark.recentLogs.some((l) => l.includes("云朵摩天轮")), "60 visitors open the ferris wheel (logged)");
  grow.meta.cloudPark.totalVisitors = 146;
  const g2 = CF.advanceCloudPark(grow, 400);
  assert.equal(g2.newStars, 1, "150 visitors → ★1");

  // Aura wiring (production / effects / breeding / PvE)
  const ref = defaultState();
  const wired = freshState();
  wired.meta.cloudPark = { totalVisitors: 8000, satisfaction: 100, buffs: { fireworks: 600, parade: 600, lightShow: 600, carnival: 600 } };
  CF.ensureCloudParkState(wired);
  const wa = CF.computeCloudParkAura(wired);
  assert.ok(wa.stars === 5 && Math.abs(wa.prodAdd - (0.02 + 0.03 + 0.06)) < 1e-9 && Math.abs(wa.pveOutAdd - (0.025 + 0.05)) < 1e-9, "★5 + satisfaction 100 + fireworks: 全产 +11% · PvE +7.5%");
  const bare = { catnipPerSec: 10, woodPerSec: 10, mineralsPerSec: 10 };
  finalizeProductionRates(bare, ref, 1);
  const boosted = { catnipPerSec: 10, woodPerSec: 10, mineralsPerSec: 10 };
  finalizeProductionRates(boosted, wired, 1);
  assert.ok(boosted.catnipPerSec >= bare.catnipPerSec * 1.11 - 1e-6, "finalizeProductionRates applies the park aura");
  const effS = computeTechEffects(wired, { tech: {} }, { serverBuffLevels: new Map() });
  const effR = computeTechEffects(ref, { tech: {} }, { serverBuffLevels: new Map() });
  assert.ok(effS.catchChanceAdd >= effR.catchChanceAdd + 0.01 - 1e-9 && effS.shinyChanceMul >= effR.shinyChanceMul * 1.08 - 1e-9, "computeTechEffects applies park catch / shiny");
  assert.ok(computeBreedingShinyInfo(wired, wired.mons.list[0], wired.mons.list[1]).rate > computeBreedingShinyInfo(ref, wired.mons.list[0], wired.mons.list[1]).rate, "breeding shiny odds include the park aura");
  assert.ok(Math.abs(PT.computeDualSanctumBadgeBonus(wired).parkOutAdd - 0.075) < 1e-9, "PvE damage aggregator includes the park");

  // Forced release, save / load, corrupt data, rebirth
  const forced = clone(st);
  const fr = releaseMonIds(forced, [9], { protectIds: new Set() });
  assert.ok(fr.removed === 1 && forced.meta.cloudPark.operators.carousel === 0, "forced release takes the operator off its ride");
  const saved = JSON.parse(JSON.stringify(serializeState(st)));
  const reloaded = loadFromRaw(saved);
  assert.ok(reloaded.meta.cloudPark.operators.carousel === 9 && reloaded.meta.cloudPark.tickets === st.meta.cloudPark.tickets && Math.abs(reloaded.meta.cloudPark.satisfaction - st.meta.cloudPark.satisfaction) < 1e-9, "park survives serializeState -> loadFromRaw");
  assert.ok(busyMonIds(reloaded).has(9), "reloaded operator stays protected");
  const bogus = loadFromRaw(
    JSON.stringify({
      ...saved,
      meta: {
        ...saved.meta,
        cloudPark: {
          operators: { carousel: 9, ferrisWheel: 9, coaster: 4 },
          rides: { carousel: { work: 99999, rounds: -3 }, nope: { work: 1 } },
          satisfaction: 250,
          tickets: 99999,
          totalVisitors: 20,
          buffs: { fireworks: 999999, parade: -5, bogus: 10 },
        },
      },
    }),
  );
  const bp = bogus.meta.cloudPark;
  assert.ok(bp.operators.carousel === 9 && bp.operators.ferrisWheel === 0 && bp.operators.coaster === 0, "duplicate operators and locked rides dropped");
  assert.ok(bp.rides.carousel.work < 360 && bp.rides.carousel.rounds === 0 && !("nope" in bp.rides), "ride progress clamped, unknown rides dropped");
  assert.ok(bp.satisfaction === 100 && bp.tickets === CF.PARK_TICKET_CAP, "satisfaction ≤100, tickets ≤600");
  assert.ok(bp.buffs.fireworks === CF.PARK_BUFF_MAX_SEC && bp.buffs.parade === 0 && !("bogus" in bp.buffs), "buffs clamped to 0..4h");
  reloaded.dex.caught = Object.fromEntries([...Array(155)].map((_, i) => [String(i + 1), 1]));
  reloaded.tech = Object.fromEntries([...Array(16)].map((_, i) => [`t${i}`, true]));
  reloaded.buildings.field.owned = 60;
  reloaded.shinyCount = 5;
  reloaded.catchCount = 999;
  reloaded.era = emptyEraState(ERA_DEFS.length - 1);
  for (const k of ["catch_count", "pokeball_earned", "gather_total", "berry_earned"]) bumpEraCounter(reloaded, k, 999);
  syncEraQuests(reloaded);
  const visitorsBefore = reloaded.meta.cloudPark.totalVisitors;
  assert.equal(confirmPrestige(reloaded).ok, true, "confirmPrestige succeeds with partners on duty");
  assert.ok(Object.values(reloaded.meta.cloudPark.operators).every((x) => !x) && reloaded.meta.cloudPark.totalVisitors === visitorsBefore, "rebirth sends every operator home; visitors / stars are permanent");
}

// ============================================================================
// 3) 星空露营观测
// ============================================================================
{
  const legacy = loadFromRaw(JSON.stringify({ version: 3, res: { futurecoin: { value: 5, cap: 999 } }, mons: { nextId: 2, list: [{ id: 1, dex: 4, pid: "p004", name: "炽尾幼麟", lvl: 5 }] } }));
  const lb = PT.computeStargazeCampBonus(legacy);
  assert.ok(lb.prodMul === 1 && lb.catchAdd === 0 && lb.shinyChanceMul === 1 && lb.pveOutAdd === 0 && lb.entries === 0, "legacy stargaze bonus is neutral");
  assert.equal(PT.advanceStargazeCamp(legacy, 99_999).returned.length, 0, "advanceStargazeCamp is a no-op without a tracker");
  assert.ok(!legacy.meta.stargazeCamp, "no tracker created on legacy saves");
  assert.equal(PT.computeDualSanctumBadgeBonus(legacy).stargazeOutAdd, 0, "PvE aggregator: no stargaze bonus on legacy saves");

  // Tables
  assert.equal(PT.STARGAZE_SITES.length, CF.STARGAZE_SITE_COUNT, "3 campsites");
  assert.deepEqual(PT.STARGAZE_SITES.map((x) => x.name), [...CF.STARGAZE_SITE_NAMES], "campsite names in collection_fun.js stay in sync");
  assert.equal(new Set(PT.STARGAZE_SITES.flatMap((x) => x.elements)).size, 9, "the 3 campsites cover all 9 elements");
  assert.equal(PT.STARGAZE_CONSTELLATIONS.length, 12, "12 constellations");
  assert.equal(new Set(PT.STARGAZE_CONSTELLATIONS.map((c) => c.element)).size, 9, "constellations cover all 9 elements");
  assert.equal(PT.STARGAZE_SHOWERS.length, 6, "6 meteor showers");
  assert.equal(PT.STARGAZE_ATLAS_SIZE, 18, "18 atlas entries");
  assert.deepEqual(PT.STARGAZE_BADGE_TIERS.map((t) => t.minEntries), [4, 8, 12, 18], "campfire badges at 4 / 8 / 12 / 18 entries");

  // Local-time rotation: 3 visible, every 6 local hours one constellation drifts in (also across midnight); showers change daily
  const blocks = [day(18, 1), day(18, 7), day(18, 13), day(18, 19), day(19, 1), day(19, 7)].map((t) => PT.getStargazeSkyRotation(t));
  assert.ok(blocks.every((r) => r.visible.length === 3 && new Set(r.visibleIds).size === 3), "3 different constellations visible");
  for (let i = 1; i < blocks.length; i += 1) {
    assert.deepEqual(blocks[i].visibleIds.slice(0, 2), blocks[i - 1].visibleIds.slice(1), `rotation ${i}: two stay, one new constellation rises`);
  }
  const allBlocks = Array.from({ length: 12 }, (_, i) => PT.getStargazeSkyRotation(day(18, 1) + i * 6 * 3600 * 1000));
  assert.equal(new Set(allBlocks.flatMap((r) => r.visibleIds)).size, 12, "12 consecutive rotations (3 days) show every constellation");
  assert.ok(blocks[0].shower.id === blocks[3].shower.id && blocks[0].shower.id !== blocks[4].shower.id, "the meteor shower changes with the local date");
  assert.equal(new Set([18, 19, 20, 21, 22, 23].map((d) => PT.getStargazeSkyRotation(day(d, 12)).shower.id)).size, 6, "six days → six different showers");
  assert.ok(PT.getStargazeSkyRotation(day(18, 22)).isNight && PT.getStargazeSkyRotation(day(18, 3)).isNight && !PT.getStargazeSkyRotation(day(18, 12)).isNight, "19:00~05:00 is the night watch");
  const r13 = PT.getStargazeSkyRotation(day(18, 13, 0));
  assert.ok(r13.msUntilNext === 5 * 3600 * 1000 && r13.incoming.id === blocks[3].visibleIds[2], "countdown to 18:00 and the rising constellation");

  // Camper evaluation & odds
  const st = freshState();
  const sg = PT.ensureStargazeCampState(st);
  assert.ok(sg.initialized && sg.sites.length === 3 && sg.sites.every((x) => x.trip === null), "fresh camp: 3 empty campsites");
  const evGrassDay = PT.evaluateStargazeCamper(st.mons.list[3], "fireflyMeadow", { night: false });
  const evGrassNight = PT.evaluateStargazeCamper(st.mons.list[3], "fireflyMeadow", { night: true });
  const evFire = PT.evaluateStargazeCamper(st.mons.list[0], "fireflyMeadow", { night: true });
  assert.ok(evGrassDay.match && evGrassDay.extraChance === 0.5 && evGrassDay.meteorChance === 0.3, "grass matches 萤火草坡: +50% extra star, meteor 20% + 10%");
  assert.equal(evGrassNight.meteorChance, 0.4, "night watch ×1.5 before the match bonus");
  assert.ok(!evFire.match && evFire.meteorChance === 0.3, "fire does not match 萤火草坡");
  assert.equal(PT.evaluateStargazeCamper(st.mons.list[1], "summitDeck", { night: true }).meteorChance, 0.775, "summit at night, matched: 45% × 1.5 + 10%");
  const sky = PT.getStargazeSkyRotation(day(18, 22));
  const odds = PT.getStargazeStarOdds(st.mons.list[0], ["emberPhoenix", "tideWhale", "windKite"]);
  assert.deepEqual(odds.map((o) => o.weight), [2, 1, 1], "same-element constellations weigh ×2");

  // Dispatch validation
  const now = day(18, 22, 0);
  assert.equal(PT.dispatchStargazeCamp(st, 0, [], { nowMs: now }).reason, "no_campers", "needs a camper");
  assert.equal(PT.dispatchStargazeCamp(st, 0, [4, 5, 6], { nowMs: now }).reason, "too_many_campers", "2 campers per site");
  assert.equal(PT.dispatchStargazeCamp(st, 5, [4], { nowMs: now }).reason, "unknown_site", "only sites 1~3");

  // 一键夜营: site-matched campers first
  const auto = PT.autoDispatchStargazeCamps(st, { nowMs: now });
  assert.ok(auto.ok && auto.dispatched.length === 3, "一键夜营 fills all three campsites");
  for (const d of auto.dispatched) assert.ok(d.camperIds.length === 2 && d.matchCount >= 1, `site ${d.idx + 1} gets matched campers`);
  assert.equal(PT.autoDispatchStargazeCamps(st, { nowMs: now }).reason, "sites_busy", "no free campsite left");
  const campers = [...CF.getStargazeCamperMonIds(st)];
  assert.equal(campers.length, 6, "6 campers out");
  for (const id of campers) assert.ok(busyMonIds(st).has(id), `busyMonIds protects camper #${id}`);
  assert.equal(releaseMonIds(st, campers, { protectIds: busyMonIds(st) }).removed, 0, "releaseMonIds refuses to release campers");
  const trip0 = st.meta.stargazeCamp.sites[0].trip;
  assert.ok(trip0.night && trip0.skyIds.join() === sky.visibleIds.join() && trip0.showerId === sky.shower.id, "the sky, shower and night watch are locked at departure");

  // Dawn: each camper 1 star (+1 matched at rng 0) + a meteor at rng 0; the locked sky is used even after the rotation moved on
  const dur0 = trip0.durationSec;
  assert.equal(dur0, PT.STARGAZE_SITES[0].campMin * 60, "camp length fixed by the site");
  assert.equal(PT.advanceStargazeCamp(st, dur0 - 1, { randFloat: () => 0 }).returned.length, 0, "no dawn before the camp length");
  const back = PT.advanceStargazeCamp(st, 1, { randFloat: () => 0 });
  assert.ok(back.returned.length === 1 && back.returned[0].idx === 0, "the shortest camp returns first");
  const rt = st.meta.stargazeCamp.sites[0].trip;
  const matched = rt.camperIds.filter((id) => PT.evaluateStargazeCamper(st.mons.list.find((m) => m.id === id), rt.siteId, { night: true }).match).length;
  assert.ok(rt.phase === "returned" && rt.haul.filter((h) => h.kind === "star").length === rt.camperIds.length + matched, "every camper notes 1 constellation, matched ones +1 (rng 0)");
  assert.ok(rt.haul.filter((h) => h.kind === "meteor").length === rt.camperIds.length && rt.haul.every((h) => h.kind === "meteor" ? h.id === trip0.showerId : trip0.skyIds.includes(h.id)), "records come from the locked sky and today's shower");
  for (const id of rt.camperIds) assert.ok(CF.getAwayMonIds(st).has(id), "returned campers stay away until the records are collected");

  // Claim: rewards table + new-entry bonus, exp / affection, atlas
  const exp0 = Object.fromEntries(rt.camperIds.map((id) => [id, st.mons.list.find((m) => m.id === id).exp]));
  const expected = {};
  const seen = new Set();
  for (const h of rt.haul) {
    for (const [rid, n] of Object.entries(PT.STARGAZE_REWARDS[h.kind])) expected[rid] = (expected[rid] || 0) + n;
    if (!seen.has(h.id)) {
      seen.add(h.id);
      expected.futurecoin = (expected.futurecoin || 0) + PT.STARGAZE_NEW_ENTRY_COIN;
    }
  }
  const pax = rt.camperIds.slice();
  const claim = PT.claimStargazeSite(st, 0);
  assert.ok(claim.ok && st.meta.stargazeCamp.sites[0].trip === null, "收取观测记录 empties the campsite");
  assert.deepEqual(claim.rewards, expected, "rewards follow the record table (+5 coin per new entry)");
  assert.equal(Object.keys(st.meta.stargazeCamp.atlas).length, seen.size, "records registered in the atlas");
  for (const id of pax) {
    const m = st.mons.list.find((x) => x.id === id);
    assert.ok(m.exp - exp0[id] === PT.STARGAZE_EXP_PER_NIGHT && m.affection === PT.STARGAZE_AFFECTION_PER_NIGHT, `camper #${id} gains exp +50 / affection +2`);
    assert.ok(!CF.getAwayMonIds(st).has(id), `camper #${id} is home again`);
  }
  assert.equal(PT.claimStargazeSite(st, 0).reason, "not_returned", "nothing to claim twice");

  // Campfire: the longest remaining camp sees dawn; free once per local day, then futurecoin ×20
  const left = st.meta.stargazeCamp.sites.map((x) => (x.trip ? x.trip.durationSec - x.trip.elapsedSec : -1));
  const longestIdx = left.indexOf(Math.max(...left));
  const fire = PT.useStargazeCampfire(st, { nowMs: day(18, 23), randFloat: seeded(3) });
  assert.ok(fire.ok && fire.costKind === "free_daily" && fire.idx === longestIdx && st.meta.stargazeCamp.sites[longestIdx].trip.phase === "returned", "free campfire returns the longest camp");
  st.res.futurecoin.value = 25;
  const fire2 = PT.useStargazeCampfire(st, { nowMs: day(18, 23, 40), randFloat: seeded(5) });
  assert.ok(fire2.ok && fire2.costKind === "futurecoin" && st.res.futurecoin.value === 5, "paid campfire costs futurecoin ×20");
  assert.equal(PT.useStargazeCampfire(st, { nowMs: day(18, 23, 50) }).reason, "no_camping", "campfire needs a camping site");
  const all = PT.claimAllStargazeSites(st);
  assert.ok(all.ok && all.claimed === 2 && st.meta.stargazeCamp.sites.every((x) => x.trip === null), "收取观测记录 (all) clears every returned site");
  PT.dispatchStargazeCamp(st, 0, [4], { nowMs: now });
  st.res.futurecoin.value = 5; // the claimed records paid out coins: drop below the price again
  assert.equal(PT.useStargazeCampfire(st, { nowMs: day(18, 23, 55) }).reason, "insufficient_fire_cost", "campfire blocked without coins");
  assert.ok(PT.getStargazeFireFreeLeft(st, day(18, 23)) === 0 && PT.getStargazeFireFreeLeft(st, day(19, 12)) === 1, "free campfire resets the next local day");
  st.res.futurecoin.value = 500;
  const rc = PT.recallStargazeCamp(st, 0);
  assert.ok(rc.ok && st.meta.stargazeCamp.sites[0].trip === null && !CF.getAwayMonIds(st).has(4), "撤营 brings the camper home without records");

  // Step-size independence with a seeded rng (three sites, different lengths)
  const twin = freshState();
  PT.ensureStargazeCampState(twin);
  PT.dispatchStargazeCamp(twin, 0, [4, 7], { nowMs: now });
  PT.dispatchStargazeCamp(twin, 1, [3, 9], { nowMs: now });
  PT.dispatchStargazeCamp(twin, 2, [2, 8], { nowMs: now });
  const twinA = clone(twin);
  const twinB = clone(twin);
  PT.advanceStargazeCamp(twinA, 2 * 3600, { randFloat: seeded(11) });
  const rB = seeded(11);
  for (let i = 0; i < 120; i += 1) PT.advanceStargazeCamp(twinB, 60, { randFloat: rB });
  assert.deepEqual(twinA.meta.stargazeCamp.sites, twinB.meta.stargazeCamp.sites, "one 2h step returns the same camps with the same records as 120 one-minute steps");

  // Forced release / detach: an emptied camping site packs up
  const frs = freshState();
  PT.ensureStargazeCampState(frs);
  PT.dispatchStargazeCamp(frs, 0, [6], { nowMs: now });
  const forced = releaseMonIds(frs, [6], { protectIds: new Set() });
  assert.ok(forced.removed === 1 && frs.meta.stargazeCamp.sites[0].trip === null, "forced release of the only camper packs the site up");

  // Atlas / badge math on a crafted atlas
  const full = freshState();
  full.meta.stargazeCamp = { atlas: Object.fromEntries([...PT.STARGAZE_CONSTELLATIONS, ...PT.STARGAZE_SHOWERS].map((x) => [x.id, { count: 1 }])) };
  const tb = PT.computeStargazeCampBonus(full);
  assert.ok(tb.entries === 18 && tb.badgeTier === 4 && tb.badgeName === "星辉营火徽章", "18 entries → 星辉营火徽章");
  assert.ok(tb.prodAdd === 0.018 && tb.shinyAdd === 0.09 && tb.catchAdd === 0.012 && tb.pveOutAdd === 0.04, "full atlas: 全产 +1.8% · 闪光 +9% · 捕获 +1.2% · PvE +4%");
  const part = freshState();
  part.meta.stargazeCamp = { atlas: Object.fromEntries(PT.STARGAZE_CONSTELLATIONS.slice(0, 4).map((x) => [x.id, { count: 2 }])) };
  assert.equal(PT.computeStargazeCampBonus(part).badgeName, "铜营火徽章", "4 entries → 铜营火徽章");

  // Aura wiring
  const ref = defaultState();
  const bare = { catnipPerSec: 10, woodPerSec: 10, mineralsPerSec: 10 };
  finalizeProductionRates(bare, ref, 1);
  const boosted = { catnipPerSec: 10, woodPerSec: 10, mineralsPerSec: 10 };
  finalizeProductionRates(boosted, full, 1);
  assert.ok(boosted.catnipPerSec >= bare.catnipPerSec * 1.018 - 1e-6, "finalizeProductionRates applies the atlas bonus");
  const effS = computeTechEffects(full, { tech: {} }, { serverBuffLevels: new Map() });
  const effR = computeTechEffects(ref, { tech: {} }, { serverBuffLevels: new Map() });
  assert.ok(effS.catchChanceAdd >= effR.catchChanceAdd + 0.012 - 1e-9 && effS.shinyChanceMul >= effR.shinyChanceMul * 1.09 - 1e-9, "computeTechEffects applies stargaze catch / shiny");
  assert.ok(computeBreedingShinyInfo(full, full.mons.list[0], full.mons.list[1]).rate > computeBreedingShinyInfo(ref, full.mons.list[0], full.mons.list[1]).rate, "breeding shiny odds include the stargaze bonus");
  assert.ok(Math.abs(PT.computeDualSanctumBadgeBonus(full).stargazeOutAdd - 0.04) < 1e-9, "PvE damage aggregator includes the campfire badge");

  // Save / load, corrupt data, rebirth
  const sv = freshState();
  PT.ensureStargazeCampState(sv);
  PT.dispatchStargazeCamp(sv, 0, [6, 7], { nowMs: now });
  PT.dispatchStargazeCamp(sv, 1, [3], { nowMs: now });
  sv.meta.stargazeCamp.sites[1].trip.elapsedSec = sv.meta.stargazeCamp.sites[1].trip.durationSec - 1;
  PT.advanceStargazeCamp(sv, 1, { randFloat: seeded(2) });
  assert.ok(sv.meta.stargazeCamp.sites[0].trip.phase === "camping" && sv.meta.stargazeCamp.sites[1].trip.phase === "returned", "one site camping, one returned");
  const saved = JSON.parse(JSON.stringify(serializeState(sv)));
  const reloaded = loadFromRaw(saved);
  assert.deepEqual(reloaded.meta.stargazeCamp.sites, sv.meta.stargazeCamp.sites, "camps survive serializeState -> loadFromRaw");
  assert.ok(busyMonIds(reloaded).has(6) && busyMonIds(reloaded).has(3), "reloaded campers stay protected");
  const savedFresh = JSON.parse(JSON.stringify(serializeState(freshState())));
  const bogus = loadFromRaw(
    JSON.stringify({
      ...savedFresh,
      meta: {
        ...savedFresh.meta,
        stargazeCamp: {
          sites: [
            { trip: { siteId: "x", camperIds: [6, 6, 999, 7, 8], phase: "camping", elapsedSec: 99999, skyIds: ["nope"], showerId: "nope", departedAt: now } },
            { trip: { phase: "returned", camperIds: [6], haul: [{ id: "moonRabbit", monId: 6 }, { id: "bogus" }] } },
            { trip: { phase: "camping", camperIds: [] } },
            { trip: { phase: "camping", camperIds: [9] } },
          ],
          atlas: { moonRabbit: { count: 2 }, nope: { count: 5 } },
        },
      },
    }),
  );
  const bb = bogus.meta.stargazeCamp;
  assert.ok(bb.sites.length === 3 && bb.sites[0].trip.camperIds.join() === "6,7" && bb.sites[0].trip.elapsedSec === bb.sites[0].trip.durationSec, "campers deduped / capped at 2, camp clamped");
  assert.ok(bb.sites[0].trip.skyIds.length === 3 && PT.getStargazeShowerDef(bb.sites[0].trip.showerId), "a broken locked sky falls back to the sky at departure");
  assert.ok(bb.sites[1].trip.phase === "returned" && bb.sites[1].trip.camperIds.length === 0 && bb.sites[1].trip.haul.length === 1, "a camper cannot be in two camps; unknown records dropped");
  assert.ok(bb.sites[2].trip === null && Object.keys(bb.atlas).join() === "moonRabbit", "empty camping site dropped, unknown atlas entries dropped, extra sites ignored");
  assert.equal(PT.advanceStargazeCamp(bogus, 1, { randFloat: () => 0 }).returned.length, 1, "a clamped camp returns on the next tick");
  reloaded.dex.caught = Object.fromEntries([...Array(155)].map((_, i) => [String(i + 1), 1]));
  reloaded.tech = Object.fromEntries([...Array(16)].map((_, i) => [`t${i}`, true]));
  reloaded.buildings.field.owned = 60;
  reloaded.shinyCount = 5;
  reloaded.catchCount = 999;
  reloaded.era = emptyEraState(ERA_DEFS.length - 1);
  for (const k of ["catch_count", "pokeball_earned", "gather_total", "berry_earned"]) bumpEraCounter(reloaded, k, 999);
  syncEraQuests(reloaded);
  reloaded.meta.stargazeCamp.atlas.moonRabbit = { count: 1 };
  assert.equal(confirmPrestige(reloaded).ok, true, "confirmPrestige succeeds with camps out");
  const rb = reloaded.meta.stargazeCamp;
  assert.ok(rb.sites[0].trip === null, "rebirth packs up the camping site");
  assert.ok(rb.sites[1].trip?.phase === "returned" && rb.sites[1].trip.camperIds.length === 0 && rb.sites[1].trip.haul.length > 0, "a returned site keeps its records (claimable) while campers go home");
  assert.ok(CF.getStargazeCamperMonIds(reloaded).size === 0 && rb.atlas.moonRabbit.count === 1, "nobody is away after rebirth; the atlas is permanent");
  assert.ok(PT.claimStargazeSite(reloaded, 1).ok, "the kept records can still be collected");
}

// ============================================================================
// 4) 一键收取已归来伙伴：covers every returned-but-uncollected outing, reuses each activity's own claim, rewards as usual
// ============================================================================
{
  const st = returnedFixture();
  const units = CF.getAwayReturnedUnits(st);
  assert.deepEqual(
    units.map((u) => u.key),
    ["stargazeCamp:0", "balloonTravel:0", "postOffice:meadow", "treasureVoyage:voyage", "wishDock:shoal"],
    "returned units: camp at dawn, landed balloon, messenger back, exhausted voyage, dock back home — and nothing still out",
  );
  assert.deepEqual(units.map((u) => u.monIds.join()), ["1", "3", "5", "8", "7"], "each unit names the partners it frees");
  assert.deepEqual([...CF.getAwayReturnedMonIds(st)].sort((a, b) => a - b), [1, 3, 5, 7, 8], "returned partners (still locked)");
  for (const id of [1, 3, 5, 7, 8]) assert.ok(busyMonIds(st).has(id), `returned partner #${id} is still locked before collecting`);
  const sum = PT.getReturnedPartnersSummary(st);
  assert.ok(sum.count === 5 && sum.partnerCount === 5 && sum.byActivity.length === 5, "summary for the functions tab banner");

  // Reference: the same claims called one by one on a twin with the same rng
  const twin = clone(st);
  const rngA = seeded(42);
  const rngB = seeded(42);
  const before = Object.fromEntries(["futurecoin", "catnip", "wood", "minerals", "driftBottle"].map((rid) => [rid, resOf(st, rid)]));
  const res = PT.collectAllReturnedPartners(st, { randFloat: rngA });
  assert.ok(res.ok && res.collected.length === 5 && res.failed.length === 0, "one-click collect settles all 5 units");
  assert.deepEqual(res.freedMonIds, [1, 3, 5, 7, 8], "exactly the returned partners come home");
  for (const id of [2, 4, 6, 9, 10]) assert.ok(CF.getAwayMonIds(st).has(id), `partner #${id} (still camping / flying / on the road / on duty) stays away`);
  PT.claimStargazeSite(twin, 0, { randFloat: rngB });
  PT.claimBalloon(twin, 0, { randFloat: rngB });
  PT.claimPostTrip(twin, "meadow", { randFloat: rngB });
  CF.returnFromTreasureVoyage(twin, { randFloat: rngB, reason: "exhausted" });
  CF.claimWishDockRoute(twin, "shoal", { randFloat: rngB });
  for (const rid of Object.keys(before)) assert.equal(resOf(st, rid), resOf(twin, rid), `rewards as usual: ${rid} matches calling every claim by hand`);
  assert.ok(Object.keys(before).some((rid) => resOf(st, rid) > before[rid]), "rewards were actually granted");
  assert.deepEqual(st.meta.stargazeCamp.atlas, twin.meta.stargazeCamp.atlas, "stargaze atlas registered as usual");
  assert.deepEqual(st.meta.balloonTravel.album, twin.meta.balloonTravel.album, "balloon album registered as usual");
  assert.deepEqual(st.meta.postOffice.postmarks, twin.meta.postOffice.postmarks, "postmark stamped as usual");
  assert.equal(st.meta.treasureVoyage.totalVoyages, twin.meta.treasureVoyage.totalVoyages, "voyage counted as usual");
  assert.deepEqual(st.mons.list.map((m) => [m.exp, m.affection]), twin.mons.list.map((m) => [m.exp, m.affection]), "partner exp / affection as usual");
  assert.ok(res.collected.every((c) => c.logLine), "every collected unit reports its own log line");
  assert.equal(PT.collectAllReturnedPartners(st).reason, "nothing_returned", "nothing left to collect");
  assert.equal(CF.getAwayReturnedUnits(st).length, 0, "no returned units afterwards");

  // A voyage that has reached the island counts as returned even with stamina left (user decision 2026-11-19):
  // collecting it is the same as a manual "return" and ends the exploration early, and the panel text says so.
  const exploring = returnedFixture();
  exploring.meta.treasureVoyage.voyage.stamina = 4;
  const arrivedUnit = CF.getAwayReturnedUnits(exploring).find((u) => u.activityId === "treasureVoyage");
  assert.ok(arrivedUnit, "an island being explored (stamina left) is collectable");
  assert.equal(arrivedUnit.ref.reason, "return", "arrived voyage settles as a normal return");
  assert.ok(/还剩体力 4/.test(arrivedUnit.text) && /提前结束探索/.test(arrivedUnit.text), "panel text warns that collecting ends the exploration early");
  const arrivedTwin = returnedFixture();
  arrivedTwin.meta.treasureVoyage.voyage.stamina = 4;
  const arrivedRes = PT.collectAllReturnedPartners(exploring, { randFloat: seeded(5) });
  assert.ok(arrivedRes.ok && arrivedRes.collected.some((c) => c.key === "treasureVoyage:voyage"), "one-tap collect settles the arrived voyage");
  CF.returnFromTreasureVoyage(arrivedTwin, { reason: "return" });
  assert.equal(exploring.meta.treasureVoyage.voyage, null, "voyage ended after collecting");
  assert.equal(exploring.meta.treasureVoyage.totalVoyages, arrivedTwin.meta.treasureVoyage.totalVoyages, "arrived voyage counted like a manual return");
  assert.ok(!CF.getAwayMonIds(exploring).has(8), "voyage crew #8 is no longer away after collecting");
  // A voyage still at sea is NOT a returned unit
  const sailing = returnedFixture();
  sailing.meta.treasureVoyage.voyage.phase = "sailing";
  sailing.meta.treasureVoyage.voyage.sailSec = 0;
  assert.ok(!CF.getAwayReturnedUnits(sailing).some((u) => u.activityId === "treasureVoyage"), "a voyage still sailing is not collected");
  // Rebirth: a landed balloon / returned camp without passengers still shows up (souvenirs / records only)
  const reb = returnedFixture();
  PT.recallBalloonTravelForRebirth(reb);
  PT.recallStargazeCampForRebirth(reb);
  const rebUnits = CF.getAwayReturnedUnits(reb);
  assert.ok(rebUnits.find((u) => u.key === "balloonTravel:0").monIds.length === 0 && rebUnits.find((u) => u.key === "stargazeCamp:0").monIds.length === 0, "after rebirth the kept souvenirs / records are still listed");
  const rebRes = PT.collectAllReturnedPartners(reb, { randFloat: seeded(9) });
  assert.ok(rebRes.ok && rebRes.byActivity.balloonTravel === 1 && rebRes.byActivity.stargazeCamp === 1, "…and collected");
  // Save / load keeps the returned state, and the collector works on the reloaded save
  const sv = returnedFixture();
  const reloaded = loadFromRaw(JSON.parse(JSON.stringify(serializeState(sv))));
  assert.equal(CF.getAwayReturnedUnits(reloaded).length, 5, "returned units survive serializeState -> loadFromRaw");
  assert.equal(PT.collectAllReturnedPartners(reloaded, { randFloat: seeded(4) }).collected.length, 5, "collect works after reload");
}

console.log("ml16-selfcheck: OK");
