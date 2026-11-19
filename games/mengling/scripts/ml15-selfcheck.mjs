#!/usr/bin/env node
// ML-15 验证脚本：云朵甜点烘焙坊 + 彩虹气球旅行 + 统一外出登记表 + 冠军联盟 / 星轨回廊手动编入排除。
// 用法：node scripts/ml15-selfcheck.mjs（selfcheck.mjs 也会调用）
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
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

// ML-16 起全仓版本号升到 0.7.56（界面文案审视后为 0.7.57，ML-17 起为 0.7.58）：VERSION 校验当前构建的版本同步 / 图标缓存号，ML15_VERSION 校验 ML-15 自己的帮助块与样式块标签
const VERSION = "0.7.58";
const ML15_VERSION = "0.7.55";
const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = (...p) => readFileSync(path.join(rootDir, ...p), "utf8");
const ML15_ICONS = ["bakeryOven", "cloudCake", "recipeCard", "rainbowBalloon", "balloonIsles", "travelSouvenir", "balloonTicket"];

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
const seeded = (s0) => {
  let s = s0;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
};
const day = (d, h, m = 30) => new Date(2026, 10, d, h, m).getTime();

function webpInfo(buf) {
  // RIFF....WEBPVP8X: flags byte 20 (alpha = 0x10), canvas width-1 / height-1 as 24-bit LE at 24 / 27
  if (buf.slice(0, 4).toString() !== "RIFF" || buf.slice(8, 12).toString() !== "WEBP") return null;
  const chunk = buf.slice(12, 16).toString();
  if (chunk === "VP8X") {
    const w = 1 + buf.readUIntLE(24, 3);
    const h = 1 + buf.readUIntLE(27, 3);
    return { w, h, alpha: Boolean(buf[20] & 0x10), chunk };
  }
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

// ============================================================================
// 0) Icons (256×256 transparent WebP, original names), version sync, UI / tick / rebirth / load wiring
// ============================================================================
{
  for (const key of ML15_ICONS) {
    const file = path.join(rootDir, "assets", "ui_icons", `${key}.webp`);
    assert.ok(existsSync(file), `ML-15 icon asset exists: ${key}.webp`);
    const info = webpInfo(readFileSync(file));
    assert.ok(info, `${key}.webp is a real WebP file`);
    assert.ok(info.w === 256 && info.h === 256, `${key}.webp is 256×256 (got ${info.w}×${info.h})`);
    assert.ok(info.alpha, `${key}.webp carries an alpha channel (transparent background)`);
    assert.equal(WEBP_UI_ICONS[key], key, `WEBP_UI_ICONS registers ${key}`);
    assert.ok(
      renderUiIcon(key, 24).includes(`${key}.webp?v=${VERSION}`) && renderResSvg(key, 20).includes(`${key}.webp?v=${VERSION}`),
      `rpg_svg_icons wires ${key}.webp?v=${VERSION}`,
    );
  }
  // Version sync across every versioned file
  assert.ok(src("modules", "config.js").includes(`VERSION: "${VERSION}"`), "config.js version");
  assert.ok(src("modules", "app", "game_state.js").includes(`GAME_STATE_SYNC_VERSION = "${VERSION}"`), "game_state.js version");
  assert.ok(src("main.js").includes(`CURRENT_VERSION = "${VERSION}"`), "main.js version");
  assert.ok(src("app.js").includes(`gameVersion: "${VERSION}"`), "app.js version");
  assert.ok(src("sw.js").includes(`mengling-v${VERSION}`), "sw.js cache version");
  assert.ok(src("functions", "api", "health.js").includes(`version: "${VERSION}"`), "health.js version");
  const html = src("index.html");
  assert.ok((html.match(new RegExp(`\\?v=${VERSION.replace(/\./g, "\\.")}`, "g")) || []).length >= 9 && html.includes(`v${VERSION}</span>`) && !html.includes("0.7.54"), "index.html assets + topbar synced");
  const help = src("modules", "tabs", "help_tab.js");
  assert.ok(help.includes(`版本 v${VERSION}`) && help.includes(`v${ML15_VERSION} 新增`) && help.includes("云朵甜点烘焙坊与彩虹气球旅行"), "help tab version + ML-15 block");
  assert.ok(src("styles.css").includes(`ML-15 「云朵甜点烘焙坊」&「彩虹气球旅行」 (v${ML15_VERSION})`), "styles.css ML-15 block");

  const ft = src("modules", "tabs", "functions_tab.js");
  const iA = ft.indexOf("ML-15 Section: 萌灵「云朵甜点烘焙坊」");
  const iB = ft.indexOf("ML-15 Section: 萌灵「彩虹气球旅行」");
  const iC = ft.indexOf("ML-14 Section: 萌灵「梦境绘本馆」");
  assert.ok(iA > 0 && iB > iA && iC > iB, "ML-15 bakery + balloon UI sections exist ahead of ML-14");
  const ml15Ui = ft.slice(iA, iC);
  assert.ok(ml15Ui.length > 8000, "ML-15 UI sections are substantial");
  assert.ok(!/<svg/i.test(ml15Ui) && !/<canvas/i.test(ml15Ui), "ML-15 UI uses webp icons only (no inline svg / canvas)");
  assert.ok(!/\p{Extended_Pictographic}/u.test(ml15Ui.replace(/★/g, "")), "ML-15 UI has no emoji");
  assert.ok(!ml15Ui.includes('renderUiIcon("skyIsland"'), "ML-15 UI does not reuse the unrelated skyIsland icon");
  for (const key of ML15_ICONS) assert.ok(ml15Ui.includes(`renderUiIcon("${key}"`), `functions tab renders the ${key} icon`);
  assert.ok(ft.includes("patchBakeryLiveDom(stLive)") && ft.includes("patchBalloonTravelLiveDom(stLive)"), "ML-15 progress bars are live-patched between full re-renders");
  const tick = src("modules", "tick.js");
  assert.ok(tick.includes("advanceBakery(state, dtSec") && tick.includes("advanceBalloonTravel(state, dtSec"), "tick.js advances the bakery and the balloons");
  const era = src("modules", "systems", "era.js");
  assert.ok(era.includes("recallBakeryForRebirth(state)") && era.includes("recallBalloonTravelForRebirth(state)"), "confirmPrestige sends bakers home and turns balloons back");
  const stateSrc = src("modules", "state.js");
  assert.ok(stateSrc.includes("ensureBakeryState(s)") && stateSrc.includes("ensureBalloonTravelState(s)"), "loadFromRaw normalizes both trackers");
  const mr = src("modules", "systems", "mon_release.js");
  assert.ok(mr.includes("detachBakeryWorker(state, m.id)") && mr.includes("detachBalloonPassenger(state, m.id)"), "forced release detaches bakers / passengers");
  const sc = src("scripts", "selfcheck.mjs");
  assert.ok(sc.includes('"ml15-selfcheck.mjs"'), "selfcheck.mjs runs ml15-selfcheck");
}

// ============================================================================
// 1) Unified away registry: the two outings are ONE row each — no separate exclusion lists anywhere
// ============================================================================
{
  // ML-16 起登记表在前面追加了星空露营 / 云端游乐园两行：这里只校验 ML-9 ~ ML-15 的 10 项仍按原优先级登记在表尾
  const ids = CF.AWAY_ACTIVITY_DEFS.map((a) => a.id).slice(-10);
  assert.deepEqual(
    ids,
    ["balloonTravel", "cloudBakery", "fishingClub", "dreamLibrary", "hotSpring", "postOffice", "treasureVoyage", "skyIsland", "nightObservatory", "wishDock"],
    "away registry: 10 away activities (ML-9 ~ ML-15), the two ML-15 outings ahead of ML-14",
  );
  for (const a of CF.AWAY_ACTIVITY_DEFS) assert.ok(a.label && a.releaseHint && a.blockLog, `away activity ${a.id} has label / release hint / block log`);

  // Source guard: the raw readers are only used by the registry itself, their own systems and the mon-detail tag
  // （ML-16 同步：游乐园 / 星空露营的两个读取器同样只允许这三个文件直接调用，其他地方一律读外出登记表）
  const allowed = new Set([
    path.join(rootDir, "modules", "systems", "collection_fun.js"),
    path.join(rootDir, "modules", "systems", "pve_tower.js"),
    path.join(rootDir, "modules", "render", "mons.js"),
  ]);
  for (const file of walkJs(path.join(rootDir, "modules"))) {
    const text = readFileSync(file, "utf8");
    if (!/getBakeryWorkerMonIds|getBalloonTravelerMonIds|getCloudParkOperatorMonIds|getStargazeCamperMonIds/.test(text)) continue;
    assert.ok(allowed.has(file), `no separate exclusion list: ${path.relative(rootDir, file)} must read the away registry instead`);
  }
  const cfSrc = src("modules", "systems", "collection_fun.js");
  const reg = cfSrc.slice(cfSrc.indexOf("const AWAY_ACTIVITY_REGISTRY"), cfSrc.indexOf("export const AWAY_ACTIVITY_DEFS"));
  assert.ok(reg.includes("read: (s) => getBalloonTravelerMonIds(s)") && reg.includes("read: (s) => getBakeryWorkerMonIds(s)"), "both readers are wired as registry rows");
  assert.equal((cfSrc.match(/getBakeryWorkerMonIds\(/g) || []).length, 4, "collection_fun.js: bakery reader = definition + registry + rush guard + aura count");
  const ptSrc = src("modules", "systems", "pve_tower.js");
  assert.equal((ptSrc.match(/getBalloonTravelerMonIds\(/g) || []).length, 1, "pve_tower.js reads balloon travelers only for the bonus counter");
  const nonSandbox = cfSrc.slice(cfSrc.indexOf("export function getNonSandboxBusyIds"), cfSrc.indexOf("export function getEcoSandboxBusyIds"));
  assert.ok(nonSandbox.includes("getAwayMonIds(state)") && !nonSandbox.includes("Bakery") && !nonSandbox.includes("Balloon"), "getNonSandboxBusyIds still reads only the registry");

  // Behavior: baker #1 (fire @ 烤炉), traveller #2 (stone), angler #3 — everything else follows automatically
  const st = freshState();
  CF.ensureBakeryState(st);
  assert.ok(CF.assignBakeryWorker(st, "bake", 1).working, "partner #1 starts baking");
  PT.ensureBalloonTravelState(st);
  const now = day(18, 9);
  const openIsle = PT.getBalloonIsleRotation(now).openIds[0];
  assert.ok(PT.dispatchBalloon(st, 0, openIsle, [2], { nowMs: now }).ok, "partner #2 boards balloon 1");
  st.meta.fishingClub = { anglerIds: [3] };
  const away = CF.getAwayMonIds(st);
  assert.deepEqual([...away].sort((a, b) => a - b), [1, 2, 3], "getAwayMonIds unions baker + traveller + angler");
  const map = CF.getAwayActivityMap(st);
  assert.deepEqual([1, 2, 3].map((id) => map.get(id).label), ["烘焙中", "气球旅行中", "垂钓中"], "each away partner labelled by its activity");
  assert.ok(CF.getAwayActivityOfMon(st, 1).releaseHint.includes("烘焙坊") && CF.getAwayActivityOfMon(st, 2).blockLog.includes("彩虹气球"), "release hint / block log come from the registry row");
  for (const [name, set] of [
    ["busyMonIds", busyMonIds(st)],
    ["getNonSandboxBusyIds", CF.getNonSandboxBusyIds(st)],
    ["getCampUnavailableMonIds", CF.getCampUnavailableMonIds(st)],
    ["getAcrobatUnavailableMonIds", PT.getAcrobatUnavailableMonIds(st)],
    ["getBandUnavailableMonIds", PT.getBandUnavailableMonIds(st)],
  ]) {
    for (const id of away) assert.ok(set.has(id), `${name} covers away partner #${id}`);
  }
  assert.deepEqual(CF.excludeAwayMons(st, st.mons.list).map((m) => m.id), [4, 5, 6, 7, 8, 9], "excludeAwayMons (training / expedition / squads) drops baker + traveller");
  assert.deepEqual(CF.dropAwayMonIds(st, [9, 1, 2, 4]), [9, 4], "dropAwayMonIds (persisted expedition team) drops baker + traveller");
  const weak = pickWeakMonIds(st.mons.list, { softLimit: 1, batch: 20, protectIds: busyMonIds(st) });
  assert.ok(![1, 2].some((id) => weak.includes(id)), "box-overflow auto release never picks a baker / traveller");
  // Every other outing refuses them, and they refuse every other outing's partners
  for (const [name, list] of [
    ["dream", CF.getIdleDreamCandidates(st)],
    ["fishing", CF.getIdleFishingCandidates(st)],
    ["hot spring", CF.getIdleHotSpringCandidates(st)],
    ["post office", PT.getIdlePostMessengerCandidates(st)],
    ["voyage", CF.getIdleTreasureVoyageCandidates(st)],
    ["bakery", CF.getIdleBakeryCandidates(st)],
    ["balloon", CF.getIdleBalloonCandidates(st)],
  ]) {
    assert.ok(!list.some((m) => away.has(m.id)), `${name} candidates exclude every away partner`);
  }
  assert.equal(CF.assignBakeryWorker(st, "knead", 2).reason, "mon_busy", "a traveller cannot take a bakery station");
  assert.equal(CF.assignBakeryWorker(st, "knead", 3).reason, "mon_busy", "an angler cannot take a bakery station");
  assert.equal(PT.dispatchBalloon(st, 1, openIsle, [1], { nowMs: now }).reason, "mon_busy", "a baker cannot board a balloon");
  assert.equal(CF.toggleDreamer(st, 1).reason, "mon_busy", "a baker cannot dream");
  assert.equal(PT.toggleFishingAngler(st, 2).reason, "mon_busy", "a traveller cannot fish");
  // 三系冠军赛 picks them up through the same registry
  const tri = PT.toggleEcoTriSquadMon(st, 1);
  assert.ok(!tri.ok && tri.reason === "mon_away" && tri.awayLabel === "烘焙中", "tri-element championship refuses the baker via the registry");
  assert.ok(PT.autofillEcoTriSquad(st, (m) => m.types, monPower).squadIds.every((id) => !away.has(id)), "tri-element auto squad skips baker / traveller");
}

// ============================================================================
// 2) 冠军联盟 / 星轨回廊：manual entry refuses away partners; away squad members sit the match out
// ============================================================================
{
  const types = (m) => m.types;
  const st = freshState();
  CF.ensureBakeryState(st);
  PT.ensureChampionLeagueState(st);
  PT.ensureStarCorridorState(st);
  // Squads set while everybody is home
  assert.ok(PT.setChampionLeagueSquad(st, [5, 9, 1]).ok, "league squad 5 / 9 / 1");
  assert.ok(PT.setStarCorridorSquad(st, [5, 9, 1]).ok, "corridor squad 5 / 9 / 1");
  // Partner #1 goes baking, #2 boards a balloon, #3 fishes
  CF.assignBakeryWorker(st, "bake", 1);
  const now = day(18, 10);
  PT.dispatchBalloon(st, 0, PT.getBalloonIsleRotation(now).openIds[0], [2], { nowMs: now });
  st.meta.fishingClub = { anglerIds: [3] };

  // Manual toggle: explicit reason code + activity id + label
  for (const [fn, label] of [
    [PT.toggleChampionLeagueSquadMon, "冠军联盟"],
    [PT.toggleStarCorridorSquadMon, "星轨回廊"],
  ]) {
    for (const [id, actId, actLabel] of [
      [2, "balloonTravel", "气球旅行中"],
      [3, "fishingClub", "垂钓中"],
    ]) {
      const r = fn(st, id);
      assert.ok(!r.ok && r.reason === "mon_away" && r.awayId === actId && r.awayLabel === actLabel, `${label} manual entry refuses away partner #${id} (${actLabel})`);
    }
  }
  assert.ok(!st.pve.championLeague.squadIds.includes(3) && !st.pve.starCorridor.squadIds.includes(3), "the refused partner was not added");
  // Taking an away partner OUT of the squad is still allowed
  assert.ok(PT.toggleStarCorridorSquadMon(st, 1).ok && !st.pve.starCorridor.squadIds.includes(1), "an away partner (the baker) can still be removed from a squad");
  assert.equal(PT.toggleStarCorridorSquadMon(st, 1).reason, "mon_away", "…and cannot be put back while away");
  assert.ok(!st.pve.starCorridor.squadIds.includes(1), "…so the seat stays empty");
  // set*Squad (bulk manual entry) drops away partners and reports them
  const setL = PT.setChampionLeagueSquad(st, [3, 5, 9]);
  assert.ok(setL.squadIds.join() === "5,9" && setL.rejectedAway.join() === "3", "setChampionLeagueSquad rejects the angler");
  const setC = PT.setStarCorridorSquad(st, [2, 5, 9, 4]);
  assert.ok(setC.squadIds.join() === "5,9,4" && setC.rejectedAway.join() === "2", "setStarCorridorSquad rejects the traveller");

  // Already-in-squad partner goes away → sits this match out (seat kept)
  PT.setChampionLeagueSquad(st, [5, 9, 4]);
  PT.setStarCorridorSquad(st, [5, 9, 4, 6]);
  CF.assignBakeryWorker(st, "knead", 4); // #4 (grass) goes baking after joining both squads
  const lg = PT.simulateLeagueGauntlet(st, { mode: "single", getMonTypes: types, commit: false });
  assert.ok(lg.ok && lg.benchedAway.length === 1 && lg.benchedAway[0].monId === 4 && lg.benchedAway[0].awayLabel === "烘焙中", "league: the baking squad member is benched");
  assert.ok(lg.log.some((l) => l.includes("本场不出战") && l.includes("青萝幼龙")), "league log names the benched partner");
  assert.ok(lg.log.filter((l) => l.includes("青萝幼龙")).every((l) => l.includes("本场不出战")), "league: the benched partner never appears in a battle line");
  assert.ok(st.pve.championLeague.squadIds.includes(4), "league seat is kept for when the partner comes home");
  const cr = PT.simulateStarCorridorTrial(st, { mode: "single", getMonTypes: types, commit: false });
  assert.ok(cr.ok && cr.benchedAway.map((b) => b.monId).join() === "4", "corridor: the baking squad member is benched");
  assert.ok(st.pve.starCorridor.squadIds.includes(4), "corridor seat is kept");
  // Whole squad away → explicit squad_away (no fight, no autofill override)
  PT.setChampionLeagueSquad(st, [5]);
  PT.setStarCorridorSquad(st, [5]);
  CF.assignBakeryWorker(st, "decorate", 5);
  const lgAll = PT.simulateLeagueGauntlet(st, { mode: "full", getMonTypes: types });
  assert.ok(!lgAll.ok && lgAll.reason === "squad_away" && lgAll.log[0].includes("外出"), "league: an all-away squad cannot enter (squad_away)");
  const crAll = PT.simulateStarCorridorTrial(st, { mode: "surge", getMonTypes: types });
  assert.ok(!crAll.ok && crAll.reason === "squad_away" && crAll.log[0].includes("外出"), "corridor: an all-away squad cannot enter (squad_away)");
  assert.ok(st.pve.championLeague.squadIds.join() === "5" && st.pve.starCorridor.squadIds.join() === "5", "squads untouched by the refusal");
  // Coming home restores the seat
  CF.dismissAllBakers(st);
  const back = PT.simulateLeagueGauntlet(st, { mode: "single", getMonTypes: types, commit: false });
  assert.ok(back.ok && back.benchedAway.length === 0, "once home the partner fights again");
  // Auto squads still skip away partners
  CF.assignBakeryWorker(st, "bake", 1);
  assert.ok(PT.autofillChampionLeagueSquad(st, types, monPower).squadIds.every((id) => !CF.getAwayMonIds(st).has(id)), "league auto squad skips away partners");
  assert.ok(PT.autofillStarCorridorSquad(st, types, monPower).squadIds.every((id) => !CF.getAwayMonIds(st).has(id)), "corridor auto squad skips away partners");

  // UI wiring (PvE tab + functions tab)
  const pveTab = src("modules", "tabs", "pve_tab.js");
  assert.ok(pveTab.includes("const leagueReadyMons = squadMons.filter((m) => !leagueAway.has(m.id));") && pveTab.includes("const corridorReadyMons = corridorSquadMons.filter((m) => !corridorAway.has(m.id));"), "PvE tab benches away squad members");
  assert.ok(pveTab.includes("hall.squadIds.length >= ECO_TRI_SQUAD_SIZE || Boolean(awayAct)") && pveTab.includes("cl.squadIds.length >= CHAMPION_LEAGUE_SQUAD_SIZE || Boolean(lgAway)") && pveTab.includes("sc.squadIds.length >= STAR_CORRIDOR_SQUAD_SIZE || Boolean(corAway)"), "PvE tab pickers disable away partners");
  assert.ok((pveTab.match(/res\.reason === "mon_away"/g) || []).length >= 2, "PvE tab explains the refusal");
  const ft = src("modules", "tabs", "functions_tab.js");
  assert.ok(ft.includes("const leagueReadyMons = leagueSquadMons.filter((m) => !funcLeagueAway.has(m.id));") && ft.includes("Boolean(lgAway)"), "functions-tab league section benches / disables away partners");
}

// ============================================================================
// 3) 云朵甜点烘焙坊
// ============================================================================
{
  // Old saves: no tracker → neutral, nothing created
  const legacy = loadFromRaw(JSON.stringify({ version: 3, res: { futurecoin: { value: 5, cap: 999 } }, mons: { nextId: 2, list: [{ id: 1, dex: 4, pid: "p004", name: "炽尾幼麟", lvl: 5 }] } }));
  assert.ok(legacy && !legacy.meta.cloudBakery && !legacy.meta.balloonTravel, "legacy save loads without the ML-15 trackers");
  const la = CF.computeBakeryAura(legacy);
  assert.ok(la.prodMul === 1 && la.catchAdd === 0 && la.shinyChanceMul === 1 && la.pveOutAdd === 0 && la.recipesCollected === 0, "legacy bakery aura is neutral");
  assert.equal(CF.advanceBakery(legacy, 99_999).batches.length, 0, "advanceBakery is a no-op without a tracker");
  assert.ok(!busyMonIds(legacy).has(1) && !legacy.meta.cloudBakery, "legacy partner is not locked and no tracker was created");
  assert.equal(PT.computeDualSanctumBadgeBonus(legacy).bakeryOutAdd, 0, "PvE aggregator: no bakery bonus on legacy saves");

  // Tables
  assert.equal(CF.BAKERY_STATIONS.length, 3, "3 stations (揉面 / 烘烤 / 装饰)");
  assert.deepEqual(CF.BAKERY_STATIONS.map((s) => s.verb), ["揉面", "烘烤", "装饰"], "stations in pipeline order");
  const stationEls = CF.BAKERY_STATIONS.flatMap((s) => s.elements);
  assert.ok(stationEls.length === 9 && new Set(stationEls).size === 9, "the 3 stations split all 9 elements without overlap");
  assert.equal(CF.BAKERY_RECIPE_DEFS.length, 8, "8 recipes in the recipe book");
  assert.deepEqual(CF.BAKERY_RECIPE_DEFS.map((r) => r.unlockRecipes), [0, 0, 1, 2, 3, 4, 5, 6], "recipes unlock at 0 / 0 / 1 … 6 collected");
  assert.deepEqual(
    [...new Set(CF.BAKERY_RECIPE_DEFS.map((r) => r.buffId))].sort(),
    ["catch", "prod", "pveOut", "shiny"],
    "every timed buff has recipes",
  );
  assert.deepEqual([0, 1, 2, 3].map((n) => CF.getBakeryQualityFromMatches(n)), [1, 2, 2, 3], "quality ★1 / ★2 / ★2 / ★3 by matched stations");

  const st = freshState();
  const bk = CF.ensureBakeryState(st);
  assert.ok(bk.initialized && bk.recipeId === "cloudPuff" && Object.values(bk.workers).every((x) => x === 0), "fresh bakery opens on 云朵奶油泡芙 with empty stations");
  assert.ok(CF.isBakeryRecipeUnlocked(st, "lavaCocoa") && !CF.isBakeryRecipeUnlocked(st, "dewJelly"), "two recipes on the counter at the start");
  assert.equal(CF.selectBakeryRecipe(st, "galaxyTart").reason, "locked", "locked recipe cannot be selected");

  // Speeds: 1 工时/分 × 1.5 契合 × (1 + 亲密 / 200)
  st.mons.list[0].affection = 100;
  const evFire = CF.evaluateBakeryWorker(st.mons.list[0], "bake");
  const evFireKnead = CF.evaluateBakeryWorker(st.mons.list[0], "knead");
  assert.ok(evFire.match && evFire.perMin === 2.25 && !evFireKnead.match && evFireKnead.perMin === 1.5, "契合 + 亲密 100 → 2.25/min; mismatched → 1.5/min");
  st.mons.list[0].affection = 0;

  // Nobody → no progress; one worker → the other stations get the 0.4 helper speed
  assert.equal(CF.advanceBakery(st, 3600).workDone, 0, "an unstaffed bakery does not bake");
  CF.assignBakeryWorker(st, "knead", 3);
  assert.deepEqual(CF.getBakeryStationSpeeds(st), { knead: 1.5, bake: 0.4, decorate: 0.4 }, "empty stations get the 0.4 helper speed while someone works");
  assert.equal(CF.assignBakeryWorker(st, "knead", 4).reason, "station_full", "one partner per station");
  assert.ok(!CF.assignBakeryWorker(st, "", 3).working && CF.getBakeryWorkerMonIds(st).size === 0, "toggling a worker sends it home");

  // 一键排班: fastest (station, partner) pairs → every station gets an element-matched partner
  const staff = CF.autoStaffBakery(st);
  assert.ok(staff.ok && staff.added.length === 3 && staff.added.every((a) => a.match), "一键排班 fills all three stations with matched partners");
  assert.deepEqual(st.meta.cloudBakery.workers, { knead: 2, bake: 5, decorate: 9 }, "ties broken by level: 镇岳巨岩尊 / 星雷灵鼠 / 幻梦灵");
  assert.equal(CF.autoStaffBakery(st).reason, "stations_full", "3 stations max");
  assert.deepEqual(CF.getBakeryBatchQuality(st), { matched: 3, stars: 3 }, "three matched stations → ★3 preview");
  for (const id of [2, 5, 9]) assert.ok(busyMonIds(st).has(id), `busyMonIds protects baker #${id}`);
  assert.equal(releaseMonIds(st, [2, 5, 9], { protectIds: busyMonIds(st) }).removed, 0, "releaseMonIds refuses to release bakers");

  // Chronological catch-up is step-size independent
  const twinA = JSON.parse(JSON.stringify(st));
  const twinB = JSON.parse(JSON.stringify(st));
  CF.advanceBakery(twinA, 3 * 3600, { nowMs: day(18, 12, 0) });
  for (let i = 0; i < 180; i += 1) CF.advanceBakery(twinB, 60, { nowMs: day(18, 9, 0) + (i + 1) * 60_000 });
  assert.equal(twinA.meta.cloudBakery.showcase.length, twinB.meta.cloudBakery.showcase.length, "one 3h step bakes as many desserts as 180 one-minute steps");
  assert.equal(twinA.meta.cloudBakery.batch.stageIdx, twinB.meta.cloudBakery.batch.stageIdx, "…ends on the same step");
  assert.ok(Math.abs(twinA.meta.cloudBakery.batch.work - twinB.meta.cloudBakery.batch.work) < 1e-6, "…with the same work done");
  assert.deepEqual(twinA.mons.list.map((m) => m.affection), twinB.mons.list.map((m) => m.affection), "…and the same affection gains");
  assert.ok(Math.abs(twinA.meta.cloudBakery.lastBatch.at - twinB.meta.cloudBakery.lastBatch.at) < 5, "…and the last batch time-stamp matches (ms, not s)");

  // First batch: 8 / 12 / 10 工时 at 1.5/min = 1200 s
  const T0 = day(18, 9, 0);
  assert.equal(CF.advanceBakery(st, 1199, { nowMs: T0 }).batches.length, 0, "no dessert before 20 minutes");
  const b1 = CF.advanceBakery(st, 1, { nowMs: T0 + 1000 });
  assert.ok(b1.batches.length === 1 && b1.batches[0].stars === 3 && b1.batches[0].newRecipe, "first ★3 cloud puff after 20 minutes, recipe collected");
  assert.ok(st.meta.cloudBakery.showcase.length === 1 && st.meta.cloudBakery.recipes.cloudPuff.bestQ === 3, "dessert in the showcase, recipe book records ★3");
  assert.ok(st.mons.list[1].exp === 30 && st.mons.list[1].affection === 1, "bakers gain exp +30 and affection +1 per batch");
  assert.ok(CF.isBakeryRecipeUnlocked(st, "dewJelly") && st.meta.cloudBakery.recentLogs.some((l) => l.includes("【新食谱解锁】") && l.includes("晨露果冻杯")), "collecting 1 recipe unlocks 晨露果冻杯");

  // Offline catch-up: time-stamps are milliseconds (the ML-14 ms / s mix-up must not come back)
  const off = JSON.parse(JSON.stringify(st));
  off.meta.cloudBakery.showcase = [];
  off.meta.cloudBakery.batch = { stageIdx: 0, work: 0 };
  const Tend = day(18, 20, 0);
  const offStep = CF.advanceBakery(off, 3 * 3600, { nowMs: Tend });
  assert.ok(offStep.batches.length >= 8, "3h offline bakes many batches");
  assert.ok(offStep.batches.every((b) => b.at > Tend - 3 * 3600 * 1000 && b.at <= Tend), "every batch time-stamp lies inside the offline window (ms)");
  assert.ok(offStep.batches[0].at < offStep.batches[1].at && offStep.batches[0].at < Tend - 2 * 3600 * 1000, "batches are stamped in chronological order, the first one early in the window");
  const cap = CF.advanceBakery(off, 999_999, { nowMs: Tend + 999_999_000 });
  assert.ok(off.meta.cloudBakery.showcase.length === CF.BAKERY_CASE_CAP && cap.caseFull, "a long absence stops at a full showcase (12)");
  assert.equal(CF.advanceBakery(off, 3600).workDone, 0, "a full showcase stops the line");
  assert.equal(CF.performBakeryRush(off).reason, "case_full", "rush needs room in the showcase");

  // Rush: free once per local day, then futurecoin ×20
  const d0 = day(18, 21);
  const r1 = CF.performBakeryRush(st, { nowMs: d0 });
  assert.ok(r1.ok && r1.costKind === "free_daily" && st.meta.cloudBakery.showcase.length === 2 && st.meta.cloudBakery.batch.stageIdx === 0, "free rush finishes the batch at once");
  st.res.futurecoin.value = 25;
  const r2 = CF.performBakeryRush(st, { nowMs: d0 + 1000 });
  assert.ok(r2.ok && r2.costKind === "futurecoin" && st.res.futurecoin.value === 5, "paid rush costs futurecoin ×20");
  assert.equal(CF.performBakeryRush(st, { nowMs: d0 + 2000 }).reason, "insufficient_rush_cost", "rush blocked without coins");
  assert.ok(CF.getBakeryRushFreeLeft(st, d0) === 0 && CF.getBakeryRushFreeLeft(st, d0 + 86_400_000) === 1, "free rush resets the next local day");
  st.res.futurecoin.value = 500;

  // 享用 → timed buff (★3 ×1.5), stacks up to 6h, decays with real time
  const e1 = CF.enjoyBakeryDessert(st, "cloudPuff");
  assert.ok(e1.ok && e1.q === 3 && e1.buffId === "prod" && e1.addSec === 2700 && st.meta.cloudBakery.showcase.length === 2, "eating a ★3 cloud puff gives 甜香满屋 for 45 minutes");
  const aura1 = CF.computeBakeryAura(st);
  assert.ok(Math.abs(aura1.prodAdd - (0.0025 + 0.08)) < 1e-9 && aura1.activeBuffs.length === 1 && aura1.permPveOutAdd === 0.005, "aura: recipe +0.25% + buff +8% · ★3 recipe PvE +0.5%");
  st.meta.cloudBakery.buffs.prod = CF.BAKERY_BUFF_MAX_SEC - 60;
  assert.ok(CF.enjoyBakeryDessert(st, "cloudPuff").capped && st.meta.cloudBakery.buffs.prod === CF.BAKERY_BUFF_MAX_SEC, "buff stacking capped at 6 hours");
  assert.equal(CF.enjoyBakeryDessert(st, "lavaCocoa").reason, "no_dessert", "cannot eat a dessert that is not in the showcase");
  const dec = CF.advanceBakery(st, CF.BAKERY_BUFF_MAX_SEC + 5);
  assert.ok(dec.expiredBuffs.includes("prod") && st.meta.cloudBakery.buffs.prod === 0, "buffs count down with real time and expire");

  // 装盒送出: 灵果 25 × ★ + 未来币 tier × ★
  st.meta.cloudBakery.showcase = [{ recipeId: "cloudPuff", q: 3 }, { recipeId: "galaxyTart", q: 2 }, { recipeId: "lavaCocoa", q: 1 }];
  const cat0 = st.res.catnip?.value || 0;
  const coin0 = st.res.futurecoin.value;
  const box = CF.boxBakeryDesserts(st);
  assert.ok(box.ok && box.count === 3 && box.rewards.catnip === 150 && box.rewards.futurecoin === 3 + 4 + 1, "box rewards follow the recipe tier × stars table");
  assert.ok(st.res.futurecoin.value === coin0 + 8 && (st.res.catnip?.value || 0) >= cat0, "box rewards are credited");
  assert.equal(CF.boxBakeryDesserts(st).reason, "empty_case", "nothing to box twice");

  // ★1 when nobody matches; recipe unlock chain; full book
  const q1 = freshState();
  CF.ensureBakeryState(q1);
  CF.assignBakeryWorker(q1, "knead", 1); // fire at 揉面
  CF.assignBakeryWorker(q1, "bake", 2); // stone at 烤炉
  CF.assignBakeryWorker(q1, "decorate", 3); // water at 装饰
  assert.deepEqual(CF.getBakeryBatchQuality(q1), { matched: 0, stars: 1 }, "mismatched stations bake ★1");
  let guard = 0;
  while (CF.getBakeryCollectedCount(q1) < 8 && guard++ < 50) {
    const next = CF.BAKERY_RECIPE_DEFS.find((r) => CF.isBakeryRecipeUnlocked(q1, r.id) && !(q1.meta.cloudBakery.recipes[r.id]?.baked > 0));
    if (next && q1.meta.cloudBakery.recipeId !== next.id) CF.selectBakeryRecipe(q1, next.id);
    q1.meta.cloudBakery.showcase = [];
    CF.advanceBakery(q1, 4 * 3600);
  }
  assert.equal(CF.getBakeryCollectedCount(q1), 8, "all 8 recipes can be collected one unlock at a time");
  const qa = CF.computeBakeryAura(q1);
  assert.ok(qa.recipesCollected === 8 && qa.perfectRecipes === 0 && qa.permProdAdd === 0.02, "full recipe book: 全产 +2% (no ★3 yet)");

  // Aura wiring (production / effects / breeding / PvE)
  const ref = defaultState();
  const wired = freshState();
  wired.meta.cloudBakery = {
    recipes: Object.fromEntries(CF.BAKERY_RECIPE_DEFS.map((r) => [r.id, { baked: 1, bestQ: 3 }])),
    buffs: { prod: 600, catch: 600, shiny: 600, pveOut: 600 },
  };
  CF.ensureBakeryState(wired);
  const bare = { catnipPerSec: 10, woodPerSec: 10, mineralsPerSec: 10 };
  finalizeProductionRates(bare, ref, 1);
  const boosted = { catnipPerSec: 10, woodPerSec: 10, mineralsPerSec: 10 };
  finalizeProductionRates(boosted, wired, 1);
  assert.ok(boosted.catnipPerSec >= bare.catnipPerSec * 1.1 - 1e-6, "finalizeProductionRates applies the bakery aura (+2% + 8%)");
  const effS = computeTechEffects(wired, { tech: {} }, { serverBuffLevels: new Map() });
  const effR = computeTechEffects(ref, { tech: {} }, { serverBuffLevels: new Map() });
  assert.ok(effS.catchChanceAdd >= effR.catchChanceAdd + 0.012 - 1e-9 && effS.shinyChanceMul >= effR.shinyChanceMul * 1.1 - 1e-9, "computeTechEffects applies bakery catch / shiny buffs");
  assert.ok(computeBreedingShinyInfo(wired, wired.mons.list[0], wired.mons.list[1]).rate > computeBreedingShinyInfo(ref, wired.mons.list[0], wired.mons.list[1]).rate, "breeding shiny odds include the bakery aura");
  assert.ok(Math.abs(PT.computeDualSanctumBadgeBonus(wired).bakeryOutAdd - (0.06 + 0.04)) < 1e-9, "PvE damage aggregator includes 元气满满 + 8 perfect recipes");

  // Forced release, save / load, corrupt data, rebirth
  const forced = releaseMonIds(st, [5], { protectIds: new Set() });
  assert.ok(forced.removed === 1 && st.meta.cloudBakery.workers.bake === 0, "forced release takes the baker off its station");
  const saved = JSON.parse(JSON.stringify(serializeState(st)));
  const reloaded = loadFromRaw(saved);
  assert.ok(reloaded.meta.cloudBakery.recipes.cloudPuff.baked === st.meta.cloudBakery.recipes.cloudPuff.baked && reloaded.meta.cloudBakery.workers.knead === 2, "bakery survives serializeState -> loadFromRaw");
  assert.ok(busyMonIds(reloaded).has(2), "reloaded baker stays protected");
  const bogus = loadFromRaw(
    JSON.stringify({
      ...saved,
      meta: {
        ...saved.meta,
        cloudBakery: {
          workers: { knead: 9, bake: 9, decorate: 999 },
          recipeId: "galaxyTart",
          batch: { stageIdx: 7, work: 9999 },
          showcase: [...Array(30)].map(() => ({ recipeId: "cloudPuff", q: 9 })).concat([{ recipeId: "nope", q: 1 }]),
          recipes: { cloudPuff: { baked: 3, bestQ: 7 }, nope: { baked: 1 } },
          buffs: { prod: 999999, catch: -5, bogus: 10 },
        },
      },
    }),
  );
  const bb = bogus.meta.cloudBakery;
  assert.ok(bb.workers.knead === 9 && bb.workers.bake === 0 && bb.workers.decorate === 0, "duplicate / dead workers dropped");
  assert.ok(bb.recipeId === "cloudPuff" && bb.batch.stageIdx === 2 && bb.batch.work < 10, "locked recipe falls back, batch clamped");
  assert.ok(bb.showcase.length === 12 && bb.showcase.every((d) => d.q === 3), "showcase clamped to 12, stars clamped to 3");
  assert.ok(Object.keys(bb.recipes).join() === "cloudPuff" && bb.recipes.cloudPuff.bestQ === 3, "unknown recipes dropped");
  assert.ok(bb.buffs.prod === CF.BAKERY_BUFF_MAX_SEC && bb.buffs.catch === 0 && !("bogus" in bb.buffs), "buffs clamped to 0..6h");
  reloaded.dex.caught = Object.fromEntries([...Array(155)].map((_, i) => [String(i + 1), 1]));
  reloaded.tech = Object.fromEntries([...Array(16)].map((_, i) => [`t${i}`, true]));
  reloaded.buildings.field.owned = 60;
  reloaded.shinyCount = 5;
  reloaded.catchCount = 999;
  reloaded.era = emptyEraState(ERA_DEFS.length - 1);
  for (const k of ["catch_count", "pokeball_earned", "gather_total", "berry_earned"]) bumpEraCounter(reloaded, k, 999);
  syncEraQuests(reloaded);
  assert.equal(confirmPrestige(reloaded).ok, true, "confirmPrestige succeeds with partners baking");
  assert.ok(Object.values(reloaded.meta.cloudBakery.workers).every((x) => !x) && reloaded.meta.cloudBakery.recipes.cloudPuff.baked > 0, "rebirth sends every baker home; the recipe book is permanent");
}

// ============================================================================
// 4) 彩虹气球旅行
// ============================================================================
{
  const legacy = loadFromRaw(JSON.stringify({ version: 3, res: { futurecoin: { value: 5, cap: 999 } }, mons: { nextId: 2, list: [{ id: 1, dex: 4, pid: "p004", name: "炽尾幼麟", lvl: 5 }] } }));
  const lb = PT.computeBalloonTravelBonus(legacy);
  assert.ok(lb.prodMul === 1 && lb.catchAdd === 0 && lb.shinyChanceMul === 1 && lb.pveOutAdd === 0 && lb.species === 0, "legacy balloon bonus is neutral");
  assert.equal(PT.advanceBalloonTravel(legacy, 99_999).landed.length, 0, "advanceBalloonTravel is a no-op without a tracker");
  assert.ok(!legacy.meta.balloonTravel, "no tracker created on legacy saves");
  assert.equal(PT.computeDualSanctumBadgeBonus(legacy).balloonOutAdd, 0, "PvE aggregator: no balloon bonus on legacy saves");

  // Tables
  assert.equal(PT.BALLOON_ISLES.length, 5, "5 sky isles");
  assert.equal(PT.BALLOON_SOUVENIR_DEFS.length, 20, "20 souvenirs");
  assert.equal(new Set(PT.BALLOON_ISLES.flatMap((i) => i.elements)).size, 9, "the 5 isles cover all 9 elements");
  for (const isle of PT.BALLOON_ISLES) {
    assert.deepEqual(PT.getBalloonIsleSouvenirs(isle.id).map((x) => x.rarity).sort(), ["common", "common", "rare", "treasure"], `${isle.name}: 2 common / 1 rare / 1 treasure`);
  }
  assert.deepEqual(PT.BALLOON_BADGE_TIERS.map((t) => t.minSpecies), [5, 10, 15, 20], "travel badges at 5 / 10 / 15 / 20 souvenirs");
  assert.ok(PT.BALLOON_COUNT === 2 && PT.BALLOON_SEATS === 2, "2 balloons × 2 seats");

  // Rotation: every 8 local hours, 2 isles open, each rotation swaps one isle in (also across midnight)
  const blocks = [day(18, 2), day(18, 10), day(18, 18), day(19, 2), day(19, 10), day(19, 18)].map((t) => PT.getBalloonIsleRotation(t));
  assert.ok(blocks.every((r) => r.open.length === 2 && r.open[0].id !== r.open[1].id), "2 different isles open at a time");
  for (let i = 1; i < blocks.length; i += 1) {
    assert.equal(blocks[i].open[0].id, blocks[i - 1].open[1].id, `rotation ${i}: one isle stays, one new isle drifts in`);
  }
  assert.equal(new Set(blocks.slice(0, 5).flatMap((r) => r.openIds)).size, 5, "five consecutive rotations visit every isle");
  const r10 = PT.getBalloonIsleRotation(day(18, 10, 0));
  assert.ok(r10.msUntilNext === 6 * 3600 * 1000 && r10.incoming.id === blocks[2].open[1].id, "countdown to 16:00 and the incoming isle");

  // Passenger evaluation & odds
  const st = freshState();
  const bt = PT.ensureBalloonTravelState(st);
  assert.ok(bt.initialized && bt.balloons.length === 2 && bt.balloons.every((b) => b.trip === null), "fresh fleet: 2 idle balloons");
  const evWind = PT.evaluateBalloonPassenger(st.mons.list[5], "cottonCloud");
  const evFire = PT.evaluateBalloonPassenger(st.mons.list[0], "cottonCloud");
  assert.ok(evWind.match && evWind.extraChance === 0.4 && evWind.rareMul === 2 && !evFire.match && evFire.extraChance === 0, "wind partner matches 棉花糖云岛, fire does not");
  const w = (mon, isle) => Object.fromEntries(PT.getBalloonSouvenirOdds(mon, isle).map((o) => [PT.getBalloonSouvenirDef(o.souvenirId).rarity, o.weight]));
  assert.deepEqual(w(st.mons.list[5], "cottonCloud"), { common: 60, rare: 52, treasure: 14 }, "matched passenger: rare / treasure weight ×2");
  assert.deepEqual(w(st.mons.list[0], "cottonCloud"), { common: 60, rare: 26, treasure: 7 }, "plain passenger: base weights");

  // Dispatch validation
  const now = day(18, 10, 0); // open: blocks[1]
  const [isleA, isleB] = PT.getBalloonIsleRotation(now).openIds;
  const closed = PT.BALLOON_ISLES.find((i) => ![isleA, isleB].includes(i.id)).id;
  assert.equal(PT.dispatchBalloon(st, 0, closed, [6], { nowMs: now }).reason, "isle_closed", "only open isles can be chosen");
  assert.equal(PT.dispatchBalloon(st, 0, isleA, [], { nowMs: now }).reason, "no_passengers", "needs a passenger");
  assert.equal(PT.dispatchBalloon(st, 0, isleA, [4, 5, 6], { nowMs: now }).reason, "too_many_passengers", "2 seats per balloon");
  assert.equal(PT.dispatchBalloon(st, 5, isleA, [6], { nowMs: now }).reason, "unknown_balloon", "only balloons 1 and 2");

  // 一键派遣: matched passengers first, a different isle per balloon
  const auto = PT.autoDispatchBalloons(st, { nowMs: now });
  assert.ok(auto.ok && auto.dispatched.length === 2, "一键派遣 sends both balloons");
  assert.notEqual(auto.dispatched[0].isleId, auto.dispatched[1].isleId, "the two balloons fly to different open isles");
  for (const d of auto.dispatched) {
    const isle = PT.getBalloonIsleDef(d.isleId);
    assert.ok(d.passengerIds.length === 2 && d.matchCount >= 1, `balloon ${d.idx + 1} → ${isle.name} carries matched passengers`);
  }
  assert.equal(PT.autoDispatchBalloons(st, { nowMs: now }).reason, "balloons_busy", "no idle balloon left");
  const travellers = [...CF.getBalloonTravelerMonIds(st)];
  assert.equal(travellers.length, 4, "4 travellers aboard");
  for (const id of travellers) assert.ok(busyMonIds(st).has(id), `busyMonIds protects traveller #${id}`);
  assert.equal(releaseMonIds(st, travellers, { protectIds: busyMonIds(st) }).removed, 0, "releaseMonIds refuses to release travellers");

  // Flight → landing → claim
  const t0 = st.meta.balloonTravel.balloons[0].trip;
  const dur0 = t0.durationSec;
  assert.equal(dur0, PT.getBalloonIsleDef(t0.isleId).tripMin * 60, "flight time fixed by the isle");
  const shortest = Math.min(...st.meta.balloonTravel.balloons.map((b) => b.trip.durationSec));
  assert.equal(PT.advanceBalloonTravel(st, shortest - 1, { randFloat: () => 0 }).landed.length, 0, "no landing before the flight time");
  const land1 = PT.advanceBalloonTravel(st, 1, { randFloat: () => 0 });
  assert.ok(land1.landed.length >= 1, "the shorter flight lands on time");
  const landedIdx = land1.landed[0].idx;
  const ltrip = st.meta.balloonTravel.balloons[landedIdx].trip;
  const matched = ltrip.passengerIds.filter((id) => PT.evaluateBalloonPassenger(st.mons.list.find((m) => m.id === id), ltrip.isleId).match).length;
  assert.ok(ltrip.phase === "landed" && ltrip.haul.length === ltrip.passengerIds.length + matched, "each passenger brings 1 souvenir, matched ones +1 (rng 0)");
  assert.ok(ltrip.haul.every((h) => PT.getBalloonSouvenirDef(h.souvenirId).isleId === ltrip.isleId), "souvenirs come from the destination isle");
  for (const id of ltrip.passengerIds) assert.ok(CF.getAwayMonIds(st).has(id), "landed passengers stay away until the souvenirs are collected");
  const pax = ltrip.passengerIds.slice();
  const exp0 = Object.fromEntries(pax.map((id) => [id, st.mons.list.find((m) => m.id === id).exp]));
  const expected = {};
  for (const h of ltrip.haul) for (const [rid, n] of Object.entries(PT.BALLOON_RARITY[PT.getBalloonSouvenirDef(h.souvenirId).rarity].rewards)) expected[rid] = (expected[rid] || 0) + n;
  const claim = PT.claimBalloon(st, landedIdx);
  assert.ok(claim.ok && claim.count === ltrip.haul.length && st.meta.balloonTravel.balloons[landedIdx].trip === null, "收取纪念品 empties the balloon");
  assert.deepEqual(claim.rewards, expected, "rewards follow the rarity table");
  assert.ok(claim.newSouvenirs.length >= 1 && Object.keys(st.meta.balloonTravel.album).length === claim.newSouvenirs.length, "souvenirs registered in the album");
  for (const id of pax) {
    const m = st.mons.list.find((x) => x.id === id);
    assert.ok(m.exp - exp0[id] === PT.BALLOON_EXP_PER_TRIP && m.affection === PT.BALLOON_AFFECTION_PER_TRIP, `passenger #${id} gains exp +60 / affection +2`);
    assert.ok(!CF.getAwayMonIds(st).has(id), `passenger #${id} is home again`);
  }
  assert.equal(PT.claimBalloon(st, landedIdx).reason, "not_landed", "nothing to claim twice");

  // 收取纪念品 (all) + ticket: the longest remaining flight lands at once; free once per local day, then futurecoin ×20
  PT.advanceBalloonTravel(st, 3 * 3600, { randFloat: seeded(3) });
  const all = PT.claimAllBalloons(st);
  assert.ok(all.ok && st.meta.balloonTravel.balloons.every((b) => b.trip === null), "收取纪念品 (all) clears every landed balloon");
  assert.equal(PT.useBalloonTicket(st, { nowMs: day(18, 11) }).reason, "no_flying", "ticket needs a flying balloon");
  PT.dispatchBalloon(st, 0, isleA, [7], { nowMs: now });
  PT.dispatchBalloon(st, 1, isleB, [8], { nowMs: now });
  st.meta.balloonTravel.balloons[1].trip.elapsedSec = 600;
  const left = st.meta.balloonTravel.balloons.map((b) => b.trip.durationSec - b.trip.elapsedSec);
  const longestIdx = left[0] >= left[1] ? 0 : 1;
  const tk = PT.useBalloonTicket(st, { nowMs: day(18, 11), randFloat: seeded(3) });
  assert.ok(tk.ok && tk.costKind === "free_daily" && tk.idx === longestIdx, "free ticket picks the balloon with the longest remaining flight");
  assert.ok(st.meta.balloonTravel.balloons[longestIdx].trip.phase === "landed" && st.meta.balloonTravel.balloons[1 - longestIdx].trip.phase === "flying", "…and lands only that one");
  st.res.futurecoin.value = 25;
  const tk2 = PT.useBalloonTicket(st, { nowMs: day(18, 12), randFloat: seeded(5) });
  assert.ok(tk2.ok && tk2.costKind === "futurecoin" && tk2.idx === 1 - longestIdx && st.res.futurecoin.value === 5, "paid ticket costs futurecoin ×20");
  PT.claimAllBalloons(st);
  PT.dispatchBalloon(st, 0, isleA, [7], { nowMs: now });
  assert.equal(PT.useBalloonTicket(st, { nowMs: day(18, 12) }).reason, "insufficient_ticket_cost", "ticket blocked without coins");
  assert.ok(PT.getBalloonTicketFreeLeft(st, day(18, 12)) === 0 && PT.getBalloonTicketFreeLeft(st, day(19, 12)) === 1, "free ticket resets the next local day");
  st.res.futurecoin.value = 500;

  // Recall: flying only, no souvenirs
  const rc = PT.recallBalloon(st, 0);
  assert.ok(rc.ok && st.meta.balloonTravel.balloons[0].trip === null && !CF.getAwayMonIds(st).has(7), "召回 brings the passenger home without souvenirs");

  // Step-size independence with a seeded rng (two balloons, different flight times)
  const twin = freshState();
  PT.ensureBalloonTravelState(twin);
  const tw = day(18, 10, 0);
  PT.dispatchBalloon(twin, 0, isleA, [6, 7], { nowMs: tw });
  PT.dispatchBalloon(twin, 1, isleB, [2, 9], { nowMs: tw });
  const twinA = JSON.parse(JSON.stringify(twin));
  const twinB = JSON.parse(JSON.stringify(twin));
  PT.advanceBalloonTravel(twinA, 2 * 3600, { randFloat: seeded(11) });
  const rB = seeded(11);
  for (let i = 0; i < 120; i += 1) PT.advanceBalloonTravel(twinB, 60, { randFloat: rB });
  assert.deepEqual(twinA.meta.balloonTravel.balloons, twinB.meta.balloonTravel.balloons, "one 2h step lands the same balloons with the same souvenirs as 120 one-minute steps");

  // Forced release / detach: an emptied flying balloon turns back
  const fr = freshState();
  PT.ensureBalloonTravelState(fr);
  PT.dispatchBalloon(fr, 0, isleA, [6], { nowMs: now });
  const forced = releaseMonIds(fr, [6], { protectIds: new Set() });
  assert.ok(forced.removed === 1 && fr.meta.balloonTravel.balloons[0].trip === null, "forced release of the only passenger turns the balloon back");

  // Album / badge math on a crafted album
  const tro = freshState();
  tro.meta.balloonTravel = { album: Object.fromEntries(PT.BALLOON_SOUVENIR_DEFS.map((x) => [x.id, { count: 1 }])) };
  const tb = PT.computeBalloonTravelBonus(tro);
  assert.ok(tb.species === 20 && tb.treasures === 5 && tb.badgeTier === 4 && tb.badgeName === "彩虹旅行章", "20 souvenirs → 彩虹旅行章");
  assert.ok(tb.prodAdd === 0.04 && tb.catchAdd === 0.012 && tb.shinyAdd === 0.1 && tb.pveOutAdd === 0.04, "full album: 全产 +4% · 捕获 +1.2% · 闪光 +10% · PvE +4%");
  tro.meta.balloonTravel.album = Object.fromEntries(PT.BALLOON_SOUVENIR_DEFS.slice(0, 5).map((x) => [x.id, { count: 2 }]));
  assert.equal(PT.computeBalloonTravelBonus(tro).badgeName, "铜旅行章", "5 souvenirs → 铜旅行章");

  // Aura wiring
  const ref = defaultState();
  const full = freshState();
  full.meta.balloonTravel = { album: Object.fromEntries(PT.BALLOON_SOUVENIR_DEFS.map((x) => [x.id, { count: 1 }])) };
  const bare = { catnipPerSec: 10, woodPerSec: 10, mineralsPerSec: 10 };
  finalizeProductionRates(bare, ref, 1);
  const boosted = { catnipPerSec: 10, woodPerSec: 10, mineralsPerSec: 10 };
  finalizeProductionRates(boosted, full, 1);
  assert.ok(boosted.catnipPerSec >= bare.catnipPerSec * 1.04 - 1e-6, "finalizeProductionRates applies the balloon album bonus");
  const effS = computeTechEffects(full, { tech: {} }, { serverBuffLevels: new Map() });
  const effR = computeTechEffects(ref, { tech: {} }, { serverBuffLevels: new Map() });
  assert.ok(effS.catchChanceAdd >= effR.catchChanceAdd + 0.012 - 1e-9 && effS.shinyChanceMul >= effR.shinyChanceMul * 1.1 - 1e-9, "computeTechEffects applies balloon catch / shiny");
  assert.ok(computeBreedingShinyInfo(full, full.mons.list[0], full.mons.list[1]).rate > computeBreedingShinyInfo(ref, full.mons.list[0], full.mons.list[1]).rate, "breeding shiny odds include the balloon bonus");
  assert.ok(Math.abs(PT.computeDualSanctumBadgeBonus(full).balloonOutAdd - 0.04) < 1e-9, "PvE damage aggregator includes the travel badge");

  // Save / load, corrupt data, rebirth
  const sv = freshState();
  PT.ensureBalloonTravelState(sv);
  PT.dispatchBalloon(sv, 0, isleA, [6, 7], { nowMs: now });
  PT.dispatchBalloon(sv, 1, isleB, [2], { nowMs: now });
  sv.meta.balloonTravel.balloons[1].trip.elapsedSec = sv.meta.balloonTravel.balloons[1].trip.durationSec - 1;
  PT.advanceBalloonTravel(sv, 1, { randFloat: seeded(2) }); // only balloon 2 lands; balloon 1 keeps flying
  assert.ok(sv.meta.balloonTravel.balloons[0].trip.phase === "flying" && sv.meta.balloonTravel.balloons[1].trip.phase === "landed", "one balloon flying, one landed");
  const saved = JSON.parse(JSON.stringify(serializeState(sv)));
  const reloaded = loadFromRaw(saved);
  assert.deepEqual(reloaded.meta.balloonTravel.balloons, sv.meta.balloonTravel.balloons, "balloons survive serializeState -> loadFromRaw");
  assert.ok(busyMonIds(reloaded).has(6) && busyMonIds(reloaded).has(2), "reloaded travellers stay protected");
  const savedFresh = JSON.parse(JSON.stringify(serializeState(freshState())));
  const bogus = loadFromRaw(
    JSON.stringify({
      ...savedFresh,
      meta: {
        ...savedFresh.meta,
        balloonTravel: {
          balloons: [
            { trip: { isleId: "cottonCloud", passengerIds: [6, 6, 999, 7, 8], phase: "flying", elapsedSec: 99999 } },
            { trip: { isleId: "nowhere", passengerIds: [1] } },
            { trip: { isleId: "cottonCloud", passengerIds: [3] } },
          ],
          album: { cottonCandy: { count: 2 }, nope: { count: 5 } },
        },
      },
    }),
  );
  const bb = bogus.meta.balloonTravel;
  assert.ok(bb.balloons.length === 2 && bb.balloons[0].trip.passengerIds.join() === "6,7" && bb.balloons[0].trip.elapsedSec === bb.balloons[0].trip.durationSec, "passengers deduped / capped at 2, flight clamped");
  assert.ok(bb.balloons[1].trip === null && Object.keys(bb.album).join() === "cottonCandy", "unknown isle / souvenirs dropped, extra balloons ignored");
  const lt = PT.advanceBalloonTravel(bogus, 1, { randFloat: () => 0 });
  assert.equal(lt.landed.length, 1, "a clamped flight lands on the next tick");
  reloaded.dex.caught = Object.fromEntries([...Array(155)].map((_, i) => [String(i + 1), 1]));
  reloaded.tech = Object.fromEntries([...Array(16)].map((_, i) => [`t${i}`, true]));
  reloaded.buildings.field.owned = 60;
  reloaded.shinyCount = 5;
  reloaded.catchCount = 999;
  reloaded.era = emptyEraState(ERA_DEFS.length - 1);
  for (const k of ["catch_count", "pokeball_earned", "gather_total", "berry_earned"]) bumpEraCounter(reloaded, k, 999);
  syncEraQuests(reloaded);
  reloaded.meta.balloonTravel.album.cottonCandy = { count: 1 };
  assert.equal(confirmPrestige(reloaded).ok, true, "confirmPrestige succeeds with balloons out");
  const rb = reloaded.meta.balloonTravel;
  assert.ok(rb.balloons[0].trip === null, "rebirth turns the flying balloon back");
  assert.ok(rb.balloons[1].trip?.phase === "landed" && rb.balloons[1].trip.passengerIds.length === 0 && rb.balloons[1].trip.haul.length > 0, "a landed balloon keeps its souvenirs (claimable) while passengers go home");
  assert.ok(CF.getBalloonTravelerMonIds(reloaded).size === 0 && rb.album.cottonCandy.count === 1, "nobody is away after rebirth; the album is permanent");
  assert.ok(PT.claimBalloon(reloaded, 1).ok, "the kept souvenirs can still be collected");
}

console.log("ml15-selfcheck: OK");
