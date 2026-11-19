#!/usr/bin/env node
// ML-17 验证脚本：冰晶溜冰场 + 花田蜜蜂工坊 + 统一外出登记表（第 13 / 14 项）+ 接入「一键收取已归来伙伴」+ 伙伴量词「位」。
// 用法：node scripts/ml17-selfcheck.mjs（selfcheck.mjs 也会调用）
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
import { WEBP_UI_ICONS, renderResSvg, renderUiIcon } from "../modules/render/rpg_svg_icons.js";

// ML-17 起全仓版本号为 0.7.58：VERSION 校验版本同步 / 图标缓存号，PREV_VERSION 为不得残留的旧号
const VERSION = "0.7.58";
const PREV_VERSION = "0.7.57";
const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = (...p) => readFileSync(path.join(rootDir, ...p), "utf8");
const ML17_ICONS = ["iceRink", "skateScore", "rinkBuff", "beeWorkshop", "beeHive", "honeyJar", "hiveBadge"];
/** This round re-uses existing art under new names: copy → original. A copy must never share a section / modal with its original. */
const REUSED_FROM = Object.freeze({
  iceRink: "workshop",
  skateScore: "showStarTrophy",
  rinkBuff: "shinyCharm",
  beeWorkshop: "field",
  beeHive: "granary",
  honeyJar: "bigBerry",
  hiveBadge: "sanctumBadge",
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
const near = (a, b) => Math.abs(a - b) < 1e-9;

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

// ============================================================================
// 0) Icons (256×256 transparent WebP, reused art under new names), version sync, UI / tick / rebirth / load wiring, 量词「位」
// ============================================================================
{
  for (const key of ML17_ICONS) {
    const file = path.join(rootDir, "assets", "ui_icons", `${key}.webp`);
    assert.ok(existsSync(file), `ML-17 icon asset exists: ${key}.webp`);
    const info = webpInfo(readFileSync(file));
    assert.ok(info, `${key}.webp is a real WebP file`);
    assert.ok(info.w === 256 && info.h === 256, `${key}.webp is 256×256 (got ${info.w}×${info.h})`);
    assert.ok(info.alpha, `${key}.webp carries an alpha channel (transparent background)`);
    assert.equal(WEBP_UI_ICONS[key], key, `WEBP_UI_ICONS registers ${key}`);
    assert.ok(
      renderUiIcon(key, 24).includes(`${key}.webp?v=${VERSION}`) && renderResSvg(key, 20).includes(`${key}.webp?v=${VERSION}`),
      `rpg_svg_icons wires ${key}.webp?v=${VERSION}`,
    );
    assert.ok(existsSync(path.join(rootDir, "assets", "ui_icons", `${REUSED_FROM[key]}.webp`)), `${key}.webp documents its source art ${REUSED_FROM[key]}.webp`);
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
  for (const f of [["modules", "render", "rpg_svg_icons.js"], ["modules", "config.js"], ["main.js"], ["app.js"], ["modules", "tabs", "help_tab.js"], ["scripts", "playwright-smoke.mjs"]]) {
    assert.ok(!src(...f).includes(PREV_VERSION), `${f.join("/")} has no stale version`);
  }
  const help = src("modules", "tabs", "help_tab.js");
  assert.ok(help.includes(`版本 v${VERSION}`) && help.includes(`v${VERSION} 新增`) && help.includes("冰晶溜冰场与花田蜜蜂工坊"), "help tab version + ML-17 block");
  const helpBlock = help.slice(help.indexOf('rows.push(block("冰晶溜冰场与花田蜜蜂工坊"'), help.indexOf('rows.push(block("云端游乐园与星空露营观测"'));
  assert.ok(helpBlock.length > 500 && helpBlock.includes("一键收取") && helpBlock.includes("外出登记表现有 14 项") && helpBlock.includes('renderUiIcon("iceRink"'), "help block documents the rules, the registry and one-click collect");
  assert.ok(!/renderUiIcon\("(workshop|showStarTrophy|shinyCharm|field|granary|bigBerry|sanctumBadge)"/.test(helpBlock), "help block shows no original of a reused icon");
  assert.ok(src("styles.css").includes(`ML-17 「冰晶溜冰场」&「花田蜜蜂工坊」 (v${VERSION})`), "styles.css ML-17 block");

  const ft = src("modules", "tabs", "functions_tab.js");
  const iA = ft.indexOf("ML-16 Section: 外出归来「一键收取已归来伙伴」");
  const iR = ft.indexOf("ML-17 Section: 萌灵「冰晶溜冰场」");
  const iB = ft.indexOf("ML-17 Section: 萌灵「花田蜜蜂工坊」");
  const iP = ft.indexOf("ML-16 Section: 萌灵「云端游乐园」");
  assert.ok(iA > 0 && iR > iA && iB > iR && iP > iB, "ML-17 rink + bee sections sit right under the one-click collect panel, ahead of ML-16");
  const ml17Ui = ft.slice(iR, iP);
  assert.ok(ml17Ui.length > 12000, "ML-17 UI sections are substantial");
  assert.ok(!/<svg/i.test(ml17Ui) && !/<canvas/i.test(ml17Ui), "ML-17 UI uses webp icons only (no inline svg / canvas)");
  assert.ok(!/\p{Extended_Pictographic}/u.test(ml17Ui), "ML-17 UI has no emoji");
  for (const key of ML17_ICONS) assert.ok(ml17Ui.includes(`renderUiIcon("${key}"`), `functions tab renders the ${key} icon`);
  for (const [name, a, b] of [
    ["ice rink", iR, iB],
    ["bee workshop", iB, iP],
    ["collect panel", iA, iR],
  ]) {
    const sec = ft.slice(a, b);
    for (const [copy, orig] of Object.entries(REUSED_FROM)) assert.ok(!sec.includes(`renderUiIcon("${orig}"`), `${name} section never renders the original ${orig} (reused as ${copy})`);
  }
  // One-sentence intros (≤ ~40 chars) for both new panels
  for (const [cls, label] of [["rink-header", "ice rink"], ["bee-header", "bee workshop"]]) {
    const head = ft.slice(ft.indexOf(`<div class="row ${cls}`), ft.indexOf("</div>\n        <div class=\"row__right", ft.indexOf(`<div class="row ${cls}`)));
    const desc = (/<div class="row__desc">([^<]+)<\/div>/.exec(head) || [])[1] || "";
    assert.ok(desc.length > 10 && desc.length <= 40 && (desc.match(/。/g) || []).length === 1, `${label} intro is one sentence ≤40 chars (${desc.length}: ${desc})`);
  }
  assert.ok(ft.includes("patchIceRinkLiveDom(stLive)") && ft.includes("patchBeeLiveDom(stLive)"), "ML-17 bars / countdowns are live-patched between full re-renders");
  assert.ok(ft.includes('iceRink: "iceRink", beeWorkshop: "beeHive"'), "the collect panel has icons for both new outings");
  assert.ok(ft.includes('data-func-toggle="iceRink"') && ft.includes('data-func-toggle="beeWorkshop"') && ft.includes("ui.functionsHideIceRink") && ft.includes("ui.functionsHideBeeWorkshop"), "both panels fold with 收起 / 展开");
  // 伙伴量词统一用「位」：功能页里指伙伴 / 萌灵的「只」全部改成「位」（只改界面文案；「只」作副词或给瓶子 / 气球计数时保留）
  const code = ft
    .split("\n")
    .filter((l) => !l.trim().startsWith("//"))
    .join("\n");
  const leftover = code.match(/(?:[\d}两一每这第]) ?只(?!(漂流瓶|气球|最多 \$\{BALLOON|开出 1 封))/g) || [];
  assert.equal(leftover.length, 0, `functions tab still counts partners with 只: ${leftover.slice(0, 5).join(" | ")}`);
  assert.ok(ft.includes("已过滤 ${Math.max(0, skipped)} 位忙碌中的伙伴") && ft.includes("这位伙伴正在忙"), "picker hints and busy logs use 位");

  const tick = src("modules", "tick.js");
  assert.ok(tick.includes("advanceIceRink(state, dtSec") && tick.includes("advanceBeeWorkshop(state, dtSec"), "tick.js advances the rink and the hives");
  assert.ok(tick.includes("限时增益结束了"), "tick.js logs expired rink buffs");
  const era = src("modules", "systems", "era.js");
  assert.ok(era.includes("recallIceRinkForRebirth(state)") && era.includes("recallBeeWorkshopForRebirth(state)"), "confirmPrestige ends the rehearsal and recalls the hives");
  const stateSrc = src("modules", "state.js");
  assert.ok(stateSrc.includes("ensureIceRinkState(s)") && stateSrc.includes("ensureBeeWorkshopState(s)"), "loadFromRaw normalizes both trackers");
  const mr = src("modules", "systems", "mon_release.js");
  assert.ok(mr.includes("detachIceRinkSkater(state, m.id)") && mr.includes("detachBeeKeeper(state, m.id)"), "forced release detaches skaters / keepers");
  const monsSrc = src("modules", "render", "mons.js");
  assert.ok(monsSrc.includes('renderUiIcon("iceRink", 13)') && monsSrc.includes('renderUiIcon("beeHive", 13)'), "mon detail tags for skaters / keepers");
  const sc = src("scripts", "selfcheck.mjs");
  assert.ok(sc.includes('"ml17-selfcheck.mjs"'), "selfcheck.mjs runs ml17-selfcheck");
  assert.ok(existsSync(path.join(rootDir, "scripts", "ml17-screens.mjs")) && src("scripts", "ml17-screens.mjs").includes("ML17_SHOT_DIR"), "ml17-screens.mjs exists and honours ML17_SHOT_DIR");
}

// ============================================================================
// 1) Unified away registry: the two outings are ONE row each; their returned readers feed the one-click collect
// ============================================================================
{
  const ids = CF.AWAY_ACTIVITY_DEFS.map((a) => a.id);
  assert.equal(ids.length, 14, "away registry: 14 away activities (ML-9 ~ ML-17)");
  assert.deepEqual(ids.slice(0, 2), ["iceRink", "beeWorkshop"], "the two ML-17 outings are registered first");
  assert.deepEqual(CF.AWAY_RETURNABLE_ACTIVITY_IDS.slice(0, 2), ["iceRink", "beeWorkshop"], "both ML-17 outings have a returned-but-uncollected state");
  assert.deepEqual([...PT.AWAY_RETURN_COLLECTOR_IDS].sort(), [...CF.AWAY_RETURNABLE_ACTIVITY_IDS].sort(), "every returnable registry row has exactly one collector (and vice versa)");
  for (const a of CF.AWAY_ACTIVITY_DEFS.slice(0, 2)) assert.ok(a.title && a.label && a.releaseHint && a.blockLog && a.returnable, `away activity ${a.id} has title / label / hints and is returnable`);

  const allowed = new Set([
    path.join(rootDir, "modules", "systems", "collection_fun.js"),
    path.join(rootDir, "modules", "render", "mons.js"),
  ]);
  for (const file of walkJs(path.join(rootDir, "modules"))) {
    const text = readFileSync(file, "utf8");
    if (!/getIceRinkSkaterMonIds|getBeeKeeperMonIds/.test(text)) continue;
    assert.ok(allowed.has(file), `no separate exclusion list: ${path.relative(rootDir, file)} must read the away registry instead`);
  }
  const cfSrc = src("modules", "systems", "collection_fun.js");
  const reg = cfSrc.slice(cfSrc.indexOf("const AWAY_ACTIVITY_REGISTRY"), cfSrc.indexOf("export const AWAY_ACTIVITY_DEFS"));
  assert.ok(reg.includes("read: (s) => getIceRinkSkaterMonIds(s)") && reg.includes("read: (s) => getBeeKeeperMonIds(s)"), "both readers are wired as registry rows");
  assert.ok(reg.includes("returned: (s) => listIceRinkReturnedUnits(s)") && reg.includes("returned: (s) => listBeeReturnedUnits(s)"), "both returned readers are wired on the registry rows");
  const ptSrc = src("modules", "systems", "pve_tower.js");
  const coll = ptSrc.slice(ptSrc.indexOf("const AWAY_RETURN_COLLECTORS"), ptSrc.indexOf("export const AWAY_RETURN_COLLECTOR_IDS"));
  assert.ok(coll.includes("claimIceRinkShow(") && coll.includes("claimBeeHive("), "one-click collect reuses each activity's own claim function");
  assert.deepEqual(PT.ICE_RINK_PROGRAMS.map((p) => p.name), Object.values(CF.ICE_RINK_PROGRAM_NAMES), "program names in sync");
  assert.deepEqual(PT.BEE_HIVES.map((h) => h.name), [...CF.BEE_HIVE_NAMES], "hive names in sync");

  // Behavior: skaters #1 #2 #3 on the ice, keeper #4 at a hive — everything else follows automatically
  const st = freshState();
  assert.ok(PT.startIceRinkShow(st, "crystalTango", [1, 2, 3], { nowMs: day(18, 9) }).ok, "three partners go on the ice");
  assert.ok(PT.dispatchBeeHive(st, 0, [4], { nowMs: day(18, 9) }).ok, "partner #4 tends a hive");
  const away = CF.getAwayMonIds(st);
  assert.deepEqual([...away].sort((a, b) => a - b), [1, 2, 3, 4], "getAwayMonIds unions skaters + keeper");
  const map = CF.getAwayActivityMap(st);
  assert.deepEqual([1, 4].map((id) => map.get(id).label), ["溜冰排练中", "照料花田中"], "each away partner labelled by its activity");
  assert.ok(CF.getAwayActivityOfMon(st, 1).releaseHint.includes("冰晶溜冰场") && CF.getAwayActivityOfMon(st, 4).blockLog.includes("花田蜜蜂工坊"), "release hint / block log come from the registry row");
  for (const [name, set] of [
    ["busyMonIds", busyMonIds(st)],
    ["getNonSandboxBusyIds", CF.getNonSandboxBusyIds(st)],
    ["getCampUnavailableMonIds", CF.getCampUnavailableMonIds(st)],
    ["getAcrobatUnavailableMonIds", PT.getAcrobatUnavailableMonIds(st)],
    ["getBandUnavailableMonIds", PT.getBandUnavailableMonIds(st)],
  ]) {
    for (const id of away) assert.ok(set.has(id), `${name} covers away partner #${id}`);
  }
  assert.ok(!CF.excludeAwayMons(st, st.mons.list).some((m) => away.has(m.id)), "excludeAwayMons drops skaters + keeper");
  assert.deepEqual(CF.dropAwayMonIds(st, [9, 1, 4, 5]), [9, 5], "dropAwayMonIds drops skaters + keeper");
  const weak = pickWeakMonIds(st.mons.list, { softLimit: 1, batch: 20, protectIds: busyMonIds(st) });
  assert.ok(![1, 2, 3, 4].some((id) => weak.includes(id)), "box-overflow auto release never picks a skater / keeper");
  for (const [name, list] of [
    ["stargaze", CF.getIdleStargazeCandidates(st)],
    ["fishing", CF.getIdleFishingCandidates(st)],
    ["rink", CF.getIdleIceRinkCandidates(st)],
    ["bee", CF.getIdleBeeCandidates(st)],
  ]) {
    assert.ok(!list.some((m) => away.has(m.id)), `${name} idle candidates exclude skaters + keeper`);
  }
  const blocked = releaseMonIds(st, [1], { protectIds: busyMonIds(st) });
  assert.equal(blocked.removed, 0, "a skater cannot be released while on the ice");
}

// ============================================================================
// 2) 冰晶溜冰场：scoring, grades, rehearsal (seconds), claim rewards, timed buffs (merge / cap / countdown), leave, detach, rebirth, load
// ============================================================================
{
  assert.equal(PT.ICE_RINK_PROGRAMS.length, 3, "3 programs");
  for (const p of PT.ICE_RINK_PROGRAMS) assert.ok(p.moves.length === 3 && p.moves.every((m) => m.elements.length === 2), `${p.name}: 3 moves × 2 elements`);
  assert.deepEqual(PT.ICE_RINK_PROGRAMS.map((p) => [p.rehearseMin, p.buffKind]), [[30, "prod"], [45, "catch"], [60, "pveOut"]], "durations 30 / 45 / 60 min, buffs 全产 / 捕获 / PvE");
  assert.deepEqual(PT.ICE_RINK_GRADES.map((g) => [g.grade, g.minScore]), [["S", 90], ["A", 75], ["B", 60], ["C", 0]], "grade thresholds");
  assert.ok(PT.getIceRinkGrade(90).grade === "S" && PT.getIceRinkGrade(89).grade === "A" && PT.getIceRinkGrade(60).grade === "B" && PT.getIceRinkGrade(59).grade === "C", "grade boundaries");

  const st = freshState();
  // per move: 上场 50 + 契合 30 + 等级分 floor(lvl/5) ≤ 20
  const ev = PT.evaluateIceRinkSkater(st.mons.list[2], "snowWaltz", 0); // #3 water Lv.50 on 雪花旋转 (水/风)
  assert.ok(ev.match && ev.lvlScore === 10 && ev.score === 90, "matched Lv.50: 50 + 30 + 10 = 90");
  const ev2 = PT.evaluateIceRinkSkater(st.mons.list[0], "snowWaltz", 0); // #1 fire Lv.60, no match
  assert.ok(!ev2.match && ev2.score === 62, "unmatched Lv.60: 50 + 12 = 62");
  const ev3 = PT.evaluateIceRinkSkater(mk(99, 1, "x", ["water"], 150), "snowWaltz", 0);
  assert.equal(ev3.score, 100, "level points cap at 20 (score ≤100 per move)");
  const half = PT.scoreIceRinkArrangement(st, "snowWaltz", [3, 0, 0]);
  assert.ok(half.score === 30 && half.grade === "C", "empty moves count 0: (90 + 0 + 0) / 3 = 30");
  const pre = PT.previewIceRinkArrangement(st, "snowWaltz");
  assert.deepEqual(pre.skaterIds, [3, 4, 9], "一键编排 picks the best idle partner per move (水 Lv.50 / 草 Lv.48 / 幻 Lv.70 beats 岩 Lv.55)");
  assert.ok(pre.matchCount === 3 && pre.score === 91 && pre.grade === "S", `matched trio (90 + 89 + 94) / 3 → 91 S (${pre.score})`);

  // Start validation
  assert.equal(PT.startIceRinkShow(st, "nope", [1]).reason, "unknown_program", "unknown program");
  assert.equal(PT.startIceRinkShow(st, "snowWaltz", [0, 0, 0]).reason, "no_skaters", "needs a skater");
  st.meta.fishingClub = { anglerIds: [5] };
  assert.equal(PT.startIceRinkShow(st, "snowWaltz", [5]).reason, "mon_busy", "a partner away elsewhere cannot skate");
  delete st.meta.fishingClub;
  const go = PT.autoArrangeIceRink(st, "snowWaltz", { nowMs: day(18, 10) });
  assert.ok(go.ok && go.expectScore === 91 && go.durationSec === 1800, "一键编排开演 starts a 30-minute rehearsal");
  assert.equal(PT.startIceRinkShow(st, "auroraDuet", [6]).reason, "rink_busy", "one program at a time");
  assert.equal(CF.getAwayReturnedUnits(st).filter((u) => u.activityId === "iceRink").length, 0, "a rehearsal is not collectable yet");

  // Rehearsal advances in SECONDS (1799 s is not enough, the next second finishes it)
  let r = PT.advanceIceRink(st, 1799);
  assert.ok(!r.finished && st.meta.iceRink.show.phase === "rehearsing" && st.meta.iceRink.show.elapsedSec === 1799, "1799 s: still rehearsing");
  r = PT.advanceIceRink(st, 1);
  assert.ok(r.finished && r.finished.score === 91 && st.meta.iceRink.show.phase === "finished" && st.meta.iceRink.show.grade === "S", "1800 s: finished, score locked at 91 (S)");
  const unit = CF.getAwayReturnedUnits(st).find((u) => u.activityId === "iceRink");
  assert.ok(unit && unit.key === "iceRink:show" && unit.monIds.join() === "3,4,9" && unit.text.includes("91 分"), "a finished show is a returned unit naming its skaters");
  for (const id of [3, 4, 9]) assert.ok(busyMonIds(st).has(id), `skater #${id} stays locked until the score is claimed`);

  // Claim: rewards, best score, buff, exp / affection, skaters home
  const coin0 = resOf(st, "futurecoin");
  const min0 = resOf(st, "minerals");
  const exp0 = st.mons.list[2].exp;
  const cl = PT.claimIceRinkShow(st, { nowMs: day(18, 11) });
  assert.ok(cl.ok && cl.grade === "S" && cl.newBest && cl.rewards.futurecoin === 12 + 5 && cl.rewards.minerals === 30, "S claim: 未来币 12 + 最高分 5, 灵晶碎片 30");
  assert.ok(resOf(st, "futurecoin") === coin0 + 17 && (resOf(st, "minerals") === Math.min(st.res.minerals.cap || 9999, min0 + 30) || resOf(st, "minerals") > min0), "rewards credited");
  assert.ok(st.mons.list[2].exp === exp0 + 40 && st.mons.list[2].affection === 2, "skaters exp +40, affection +2");
  assert.ok(st.meta.iceRink.show === null && !busyMonIds(st).has(3), "skaters come home");
  assert.deepEqual(st.meta.iceRink.buffs.prod, { add: 0.08, leftSec: 3600 }, "S 雪花圆舞曲 → 全产 +8% for 60 minutes");
  assert.ok(st.meta.iceRink.best.snowWaltz === 91 && st.meta.iceRink.totalShows === 1 && st.meta.iceRink.gradeCounts.S === 1, "records kept");
  assert.equal(PT.claimIceRinkShow(st).reason, "not_finished", "nothing to claim twice");
  const b1 = PT.computeIceRinkBuffs(st);
  assert.ok(b1.prodAdd === 0.08 && b1.prodMul === 1.08 && b1.catchAdd === 0 && b1.pveOutAdd === 0, "active buff aggregates");

  // Buff countdown in seconds (not milliseconds); a weaker same-kind buff keeps the higher add and the longer time; cap 60 min
  PT.advanceIceRink(st, 600);
  assert.equal(st.meta.iceRink.buffs.prod.leftSec, 3000, "600 s off the clock (seconds, not ms)");
  st.meta.iceRink.show = { programId: "snowWaltz", skaterIds: [10, 0, 0], phase: "rehearsing", elapsedSec: 0 };
  PT.ensureIceRinkState(st);
  PT.advanceIceRink(st, 1800);
  assert.ok(st.meta.iceRink.show.phase === "finished" && st.meta.iceRink.show.grade === "C", "a lone unmatched skater → C");
  PT.claimIceRinkShow(st);
  assert.deepEqual(st.meta.iceRink.buffs.prod, { add: 0.08, leftSec: 1200 }, "C after S: keeps +8%, keeps the longer remaining time (1200 s > C's 1200 s cap)");
  st.meta.iceRink.buffs.prod.leftSec = 100;
  st.meta.iceRink.show = { programId: "snowWaltz", skaterIds: [3, 4, 2], phase: "finished", score: 95 };
  PT.ensureIceRinkState(st);
  PT.claimIceRinkShow(st);
  assert.deepEqual(st.meta.iceRink.buffs.prod, { add: 0.08, leftSec: 3600 }, "a new S refreshes to 60 minutes, never above the cap");
  // Other kinds: 极光双人滑 catch ×0.25, 冰晶探戈 PvE
  assert.deepEqual(PT.getIceRinkBuffFor("auroraDuet", "S"), { kind: "catch", add: 0.02, sec: 3600 }, "S 极光双人滑: 捕获 +2% 60 min");
  assert.deepEqual(PT.getIceRinkBuffFor("crystalTango", "B"), { kind: "pveOut", add: 0.03, sec: 1800 }, "B 冰晶探戈: PvE +3% 30 min");
  st.meta.iceRink.buffs.catch = { add: 0.02, leftSec: 50 };
  st.meta.iceRink.buffs.pveOut = { add: 0.05, leftSec: 2700 };
  const exp = PT.advanceIceRink(st, 60);
  assert.ok(exp.expiredBuffs.join() === "catch" && !st.meta.iceRink.buffs.catch && st.meta.iceRink.buffs.pveOut.leftSec === 2640, "a buff expires when its seconds run out");
  const big = PT.advanceIceRink(st, 99 * 3600);
  assert.ok(big.expiredBuffs.includes("prod") && big.expiredBuffs.includes("pveOut") && Object.keys(st.meta.iceRink.buffs).length === 0, "long offline: every buff expires (step capped at 12 h)");

  // Wiring: production / effects / PvE damage
  const ref = defaultState();
  const lit = freshState();
  lit.meta.iceRink = { buffs: { prod: { add: 0.08, leftSec: 600 }, catch: { add: 0.02, leftSec: 600 }, pveOut: { add: 0.05, leftSec: 600 } } };
  PT.ensureIceRinkState(lit);
  const bare = { catnipPerSec: 10, woodPerSec: 10, mineralsPerSec: 10 };
  finalizeProductionRates(bare, ref, 1);
  const boosted = { catnipPerSec: 10, woodPerSec: 10, mineralsPerSec: 10 };
  finalizeProductionRates(boosted, lit, 1);
  assert.ok(boosted.catnipPerSec >= bare.catnipPerSec * 1.08 - 1e-6, "finalizeProductionRates applies the 全产 buff");
  const effS = computeTechEffects(lit, { tech: {} }, { serverBuffLevels: new Map() });
  const effR = computeTechEffects(ref, { tech: {} }, { serverBuffLevels: new Map() });
  assert.ok(effS.catchChanceAdd >= effR.catchChanceAdd + 0.02 - 1e-9, "computeTechEffects applies the 捕获 buff");
  assert.ok(near(PT.computeDualSanctumBadgeBonus(lit).iceRinkOutAdd, 0.05), "PvE damage aggregator includes the PvE buff");

  // Leave / detach / rebirth / load
  const lv = freshState();
  PT.startIceRinkShow(lv, "auroraDuet", [7, 6, 1]);
  assert.ok(PT.leaveIceRinkShow(lv).ok && lv.meta.iceRink.show === null && !busyMonIds(lv).has(7), "提前退场 ends the rehearsal, nobody away");
  assert.equal(PT.leaveIceRinkShow(lv).reason, "no_show", "nothing to leave");
  const dt = freshState();
  PT.startIceRinkShow(dt, "auroraDuet", [7, 0, 0]);
  const forced = releaseMonIds(dt, [7], { protectIds: new Set() });
  assert.ok(forced.removed === 1 && dt.meta.iceRink.show === null, "forced release of the only skater ends the rehearsal");
  const dt2 = freshState();
  PT.startIceRinkShow(dt2, "auroraDuet", [7, 6, 0]);
  PT.detachIceRinkSkater(dt2, 6);
  assert.deepEqual(dt2.meta.iceRink.show.skaterIds, [7, 0, 0], "detach empties just that move");

  const twinA = freshState();
  const twinB = freshState();
  for (const t of [twinA, twinB]) PT.startIceRinkShow(t, "crystalTango", [1, 8, 3], { nowMs: day(18, 10) });
  PT.advanceIceRink(twinA, 2 * 3600);
  for (let i = 0; i < 120; i += 1) PT.advanceIceRink(twinB, 60);
  assert.deepEqual(twinA.meta.iceRink.show, twinB.meta.iceRink.show, "one 2h step finishes the same show as 120 one-minute steps");

  const sv = freshState();
  PT.startIceRinkShow(sv, "crystalTango", [1, 8, 3]);
  sv.meta.iceRink.buffs = { prod: { add: 0.05, leftSec: 900 } };
  const reloaded = loadFromRaw(JSON.parse(JSON.stringify(serializeState(sv))));
  assert.deepEqual(reloaded.meta.iceRink.show, sv.meta.iceRink.show, "the show survives serializeState -> loadFromRaw");
  assert.deepEqual(reloaded.meta.iceRink.buffs, sv.meta.iceRink.buffs, "buffs survive the reload");
  assert.ok(busyMonIds(reloaded).has(8), "reloaded skaters stay protected");
  const savedFresh = JSON.parse(JSON.stringify(serializeState(freshState())));
  const bogus = loadFromRaw(
    JSON.stringify({
      ...savedFresh,
      meta: {
        ...savedFresh.meta,
        iceRink: {
          show: { programId: "snowWaltz", skaterIds: [6, 6, 999, 7], phase: "rehearsing", elapsedSec: 999999 },
          buffs: { prod: { add: 0.9, leftSec: 99999 }, catch: { add: 0.01, leftSec: -5 }, nope: { add: 1, leftSec: 10 } },
          best: { snowWaltz: 300, nope: 50 },
        },
      },
    }),
  );
  const bb = bogus.meta.iceRink;
  assert.deepEqual(bb.show.skaterIds, [6, 0, 0], "skaters deduped, unknown ids dropped, aligned to the 3 moves");
  assert.ok(bb.show.elapsedSec === bb.show.durationSec && bb.buffs.prod.add === 0.08 && bb.buffs.prod.leftSec === 3600 && !bb.buffs.catch && !bb.buffs.nope, "elapsed / buffs clamped, junk dropped");
  assert.ok(bb.best.snowWaltz === 100 && !("nope" in bb.best), "best score clamped to 100");
  assert.ok(PT.advanceIceRink(bogus, 1).finished, "a clamped rehearsal finishes on the next tick");

  const rb = freshState();
  PT.startIceRinkShow(rb, "snowWaltz", [3, 4, 2]);
  PT.advanceIceRink(rb, 1800);
  rb.dex.caught = Object.fromEntries([...Array(155)].map((_, i) => [String(i + 1), 1]));
  rb.tech = Object.fromEntries([...Array(16)].map((_, i) => [`t${i}`, true]));
  rb.buildings.field.owned = 60;
  rb.shinyCount = 5;
  rb.catchCount = 999;
  rb.era = emptyEraState(ERA_DEFS.length - 1);
  for (const k of ["catch_count", "pokeball_earned", "gather_total", "berry_earned"]) bumpEraCounter(rb, k, 999);
  syncEraQuests(rb);
  assert.equal(confirmPrestige(rb).ok, true, "confirmPrestige succeeds with a finished show waiting");
  assert.ok(rb.meta.iceRink.show?.phase === "finished" && CF.getIceRinkSkaterMonIds(rb).size === 0, "rebirth: the finished score stays claimable, skaters go home");
  assert.ok(PT.claimIceRinkShow(rb).ok && rb.meta.iceRink.buffs.prod, "the kept score can still be claimed for its buff");
}

// ============================================================================
// 3) 花田蜜蜂工坊：local-date flower rotation, tending (seconds), haul, claim, codex / badges, bonuses, recall, detach, rebirth, load
// ============================================================================
{
  assert.equal(PT.BEE_FLOWERS.length, 8, "8 flowers");
  assert.deepEqual(PT.BEE_HIVES.map((h) => h.tendMin), [40, 60, 90], "hives tend for 40 / 60 / 90 minutes");
  assert.deepEqual(PT.BEE_BADGE_TIERS.map((t) => t.minHoneys), [2, 4, 6, 8], "hive badges at 2 / 4 / 6 / 8 honeys");
  const r18 = PT.getBeeBloomRotation(day(18, 12));
  assert.ok(r18.blooms.length === 3 && new Set(r18.bloomIds).size === 3, "3 different flowers bloom each day");
  assert.deepEqual(PT.getBeeBloomRotation(day(18, 0, 1)).bloomIds, PT.getBeeBloomRotation(day(18, 23, 59)).bloomIds, "the blooms hold for the whole local day");
  assert.notDeepEqual(PT.getBeeBloomRotation(day(19, 0, 1)).bloomIds, r18.bloomIds, "the blooms change at local midnight");
  assert.deepEqual(r18.nextBlooms.map((f) => f.id), PT.getBeeBloomRotation(day(19, 12)).bloomIds, "「明天」matches tomorrow's rotation");
  assert.equal(new Set([18, 19, 20].flatMap((d) => PT.getBeeBloomRotation(day(d, 12)).bloomIds)).size, 8, "3 consecutive days show all 8 flowers");
  assert.ok(r18.msUntilChange > 0 && r18.msUntilChange <= 24 * 3600 * 1000, "countdown to the next change in ms");

  const st = freshState();
  const now = day(18, 12);
  const flowers = r18.blooms;
  // pick a keeper whose element equals hive 0's flower, and one that only matches the hive
  const flowerMatch = st.mons.list.find((m) => m.types.includes(flowers[0].element));
  const hiveOnly = st.mons.list.find((m) => m !== flowerMatch && !m.types.includes(flowers[0].element) && m.types.some((t) => PT.BEE_HIVES[0].elements.includes(t)));
  const evF = PT.evaluateBeeKeeper(flowerMatch, "sunnyHive", flowers[0].id);
  const evH = PT.evaluateBeeKeeper(hiveOnly, "sunnyHive", flowers[0].id);
  assert.ok(evF.flowerMatch && evF.baseJars === 2, "flower-matched keeper: 2 jars");
  assert.ok(!evH.flowerMatch && evH.hiveMatch && evH.baseJars === 1 && evH.extraChance === 0.5, "hive-matched keeper: 1 jar + 50% chance");
  assert.equal(PT.dispatchBeeHive(st, 0, [1, 2, 3]).reason, "too_many_keepers", "max 2 per hive");
  assert.equal(PT.dispatchBeeHive(st, 5, [1]).reason, "unknown_hive", "unknown hive");
  const d0 = PT.dispatchBeeHive(st, 0, [flowerMatch.id, hiveOnly.id], { nowMs: now });
  assert.ok(d0.ok && d0.flowerId === flowers[0].id && d0.durationSec === 2400, "hive 0 locks today's first flower for 40 minutes");
  assert.equal(PT.dispatchBeeHive(st, 0, [9]).reason, "hive_busy", "a hive takes one party");
  assert.equal(PT.dispatchBeeHive(st, 1, [flowerMatch.id]).reason, "mon_busy", "a keeper cannot tend two hives");
  // Tending advances in seconds
  PT.advanceBeeWorkshop(st, 2399, { randFloat: () => 0 });
  assert.equal(st.meta.beeWorkshop.hives[0].trip.phase, "tending", "2399 s: still tending");
  const step = PT.advanceBeeWorkshop(st, 1, { randFloat: () => 0 });
  assert.ok(step.done.length === 1 && step.done[0].jars === 2 + 2, "rng 0: flower keeper 2 jars (+1 if also hive-matched cap 3), hive keeper 1 + 1");
  const unit = CF.getAwayReturnedUnits(st).find((u) => u.activityId === "beeWorkshop");
  assert.ok(unit && unit.key === "beeWorkshop:0" && unit.text.includes("罐蜂蜜待收取"), "a done hive is a returned unit");
  assert.ok(busyMonIds(st).has(flowerMatch.id), "keepers stay locked until the honey is collected");
  const cat0 = resOf(st, "catnip");
  const coin0 = resOf(st, "futurecoin");
  const cl = PT.claimBeeHive(st, 0, { nowMs: now });
  const jars = cl.jars;
  assert.ok(cl.ok && cl.newHoney && cl.rewards.catnip === 40 * jars && cl.rewards.wood === 20 * jars && cl.rewards.futurecoin === 6, "per jar 灵果 40 + 灵木 20, new honey +6 未来币");
  assert.ok(resOf(st, "futurecoin") === coin0 + 6 && resOf(st, "catnip") >= cat0, "rewards credited");
  assert.ok(st.meta.beeWorkshop.codex[flowers[0].id].count === jars && st.meta.beeWorkshop.hives[0].trip === null && !busyMonIds(st).has(flowerMatch.id), "codex counts jars; keepers home");
  assert.ok(flowerMatch.exp === 40 && flowerMatch.affection === 2, "keepers exp +40, affection +2");
  // rng high: hive-matched keeper gets no extra jar; jars cap at 3
  const st2 = freshState();
  PT.dispatchBeeHive(st2, 0, [hiveOnly.id], { nowMs: now });
  PT.advanceBeeWorkshop(st2, 2400, { randFloat: () => 0.99 });
  assert.equal(st2.meta.beeWorkshop.hives[0].trip.haul.length, 1, "rng 0.99: the hive-matched keeper fills just 1 jar");
  const triple = freshState();
  triple.mons.list.push(mk(20, 1, "全能", [flowers[0].element, ...PT.BEE_HIVES[0].elements], 50));
  PT.dispatchBeeHive(triple, 0, [20], { nowMs: now });
  PT.advanceBeeWorkshop(triple, 2400, { randFloat: () => 0 });
  assert.equal(triple.meta.beeWorkshop.hives[0].trip.haul.length, 3, "flower + hive match at rng 0: 3 jars (the cap)");

  // Auto dispatch: flower-matched first
  const au = freshState();
  const res = PT.autoDispatchBeeHives(au, { nowMs: now });
  assert.ok(res.ok && res.dispatched.length === 3, "一键照料 fills all 3 hives");
  for (const d of res.dispatched) {
    const fl = PT.getBeeFlowerDef(d.flowerId);
    const hasMatch = au.mons.list.some((m) => m.types.includes(fl.element) && !res.dispatched.some((x) => x.idx < d.idx && x.keeperIds.includes(m.id)));
    if (hasMatch) assert.ok(d.flowerMatch >= 1, `hive ${d.idx}: a flower-matched keeper is picked first`);
  }
  assert.equal(PT.autoDispatchBeeHives(au).reason, "hives_busy", "all hives busy");
  assert.ok(PT.recallBeeHive(au, 2).ok && au.meta.beeWorkshop.hives[2].trip === null, "召回 empties the hive (no honey)");

  // Codex / badge math + wiring
  const full = freshState();
  full.meta.beeWorkshop = { codex: Object.fromEntries(PT.BEE_FLOWERS.map((f) => [f.id, { count: 1 }])) };
  const fb = PT.computeBeeWorkshopBonus(full);
  assert.ok(fb.honeys === 8 && fb.badgeTier === 4 && fb.badgeName === "琥珀蜂巢徽章", "8 honeys → 琥珀蜂巢徽章");
  assert.ok(fb.prodAdd === 0.02 && fb.catchAdd === 0.01 && fb.shinyAdd === 0.04, "full codex: 全产 +2% · 捕获 +1% · 闪光 +4%");
  const two = freshState();
  two.meta.beeWorkshop = { codex: { sunflower: { count: 3 }, lotus: { count: 1 } } };
  assert.equal(PT.computeBeeWorkshopBonus(two).badgeName, "铜蜂巢徽章", "2 honeys → 铜蜂巢徽章");
  const ref = defaultState();
  const bare = { catnipPerSec: 10, woodPerSec: 10, mineralsPerSec: 10 };
  finalizeProductionRates(bare, ref, 1);
  const boosted = { catnipPerSec: 10, woodPerSec: 10, mineralsPerSec: 10 };
  finalizeProductionRates(boosted, full, 1);
  assert.ok(boosted.catnipPerSec >= bare.catnipPerSec * 1.02 - 1e-6, "finalizeProductionRates applies the honey codex");
  const effS = computeTechEffects(full, { tech: {} }, { serverBuffLevels: new Map() });
  const effR = computeTechEffects(ref, { tech: {} }, { serverBuffLevels: new Map() });
  assert.ok(effS.catchChanceAdd >= effR.catchChanceAdd + 0.01 - 1e-9 && effS.shinyChanceMul >= effR.shinyChanceMul * 1.04 - 1e-9, "computeTechEffects applies the hive badge catch / shiny");
  assert.ok(computeBreedingShinyInfo(full, full.mons.list[0], full.mons.list[1]).rate > computeBreedingShinyInfo(ref, full.mons.list[0], full.mons.list[1]).rate, "breeding shiny odds include the hive badge");

  // Offline equivalence, detach, rebirth, load
  const twinA = freshState();
  const twinB = freshState();
  for (const t of [twinA, twinB]) {
    PT.dispatchBeeHive(t, 0, [1], { nowMs: now });
    PT.dispatchBeeHive(t, 2, [2, 3], { nowMs: now });
  }
  PT.advanceBeeWorkshop(twinA, 2 * 3600, { randFloat: seeded(5) });
  const rB = seeded(5);
  for (let i = 0; i < 120; i += 1) PT.advanceBeeWorkshop(twinB, 60, { randFloat: rB });
  assert.deepEqual(twinA.meta.beeWorkshop.hives, twinB.meta.beeWorkshop.hives, "one 2h step = 120 one-minute steps");
  const frs = freshState();
  PT.dispatchBeeHive(frs, 1, [6], { nowMs: now });
  const forced = releaseMonIds(frs, [6], { protectIds: new Set() });
  assert.ok(forced.removed === 1 && frs.meta.beeWorkshop.hives[1].trip === null, "forced release of the only keeper stops the hive");

  const sv = freshState();
  PT.dispatchBeeHive(sv, 0, [6, 7], { nowMs: now });
  PT.dispatchBeeHive(sv, 1, [3], { nowMs: now });
  sv.meta.beeWorkshop.hives[1].trip.elapsedSec = sv.meta.beeWorkshop.hives[1].trip.durationSec - 1;
  PT.advanceBeeWorkshop(sv, 1, { randFloat: seeded(2) });
  assert.ok(sv.meta.beeWorkshop.hives[0].trip.phase === "tending" && sv.meta.beeWorkshop.hives[1].trip.phase === "done", "one hive tending, one done");
  const reloaded = loadFromRaw(JSON.parse(JSON.stringify(serializeState(sv))));
  assert.deepEqual(reloaded.meta.beeWorkshop.hives, sv.meta.beeWorkshop.hives, "hives survive serializeState -> loadFromRaw");
  assert.ok(busyMonIds(reloaded).has(6) && busyMonIds(reloaded).has(3), "reloaded keepers stay protected");
  const savedFresh = JSON.parse(JSON.stringify(serializeState(freshState())));
  const bogus = loadFromRaw(
    JSON.stringify({
      ...savedFresh,
      meta: {
        ...savedFresh.meta,
        beeWorkshop: {
          hives: [
            { trip: { keeperIds: [6, 6, 999, 7, 8], phase: "tending", elapsedSec: 99999, flowerId: "nope", departedAt: now } },
            { trip: { phase: "done", keeperIds: [6], flowerId: "lotus", haul: [{ flowerId: "lotus", monId: 6 }, { flowerId: "bogus" }] } },
            { trip: { phase: "tending", keeperIds: [] } },
            { trip: { phase: "tending", keeperIds: [9] } },
          ],
          codex: { lotus: { count: 2 }, nope: { count: 5 } },
        },
      },
    }),
  );
  const bb = bogus.meta.beeWorkshop;
  assert.ok(bb.hives.length === 3 && bb.hives[0].trip.keeperIds.join() === "6,7" && bb.hives[0].trip.elapsedSec === bb.hives[0].trip.durationSec, "keepers deduped / capped at 2, tending clamped");
  assert.ok(bb.hives[0].trip.flowerId === PT.getBeeBloomRotation(now).bloomIds[0], "a broken flower falls back to the hive's bloom at departure");
  assert.ok(bb.hives[1].trip.phase === "done" && bb.hives[1].trip.keeperIds.length === 0 && bb.hives[1].trip.haul.length === 1, "a keeper cannot be at two hives; unknown jars dropped");
  assert.ok(bb.hives[2].trip === null && Object.keys(bb.codex).join() === "lotus", "empty tending hive dropped, unknown codex entries dropped, extra hives ignored");

  reloaded.dex.caught = Object.fromEntries([...Array(155)].map((_, i) => [String(i + 1), 1]));
  reloaded.tech = Object.fromEntries([...Array(16)].map((_, i) => [`t${i}`, true]));
  reloaded.buildings.field.owned = 60;
  reloaded.shinyCount = 5;
  reloaded.catchCount = 999;
  reloaded.era = emptyEraState(ERA_DEFS.length - 1);
  for (const k of ["catch_count", "pokeball_earned", "gather_total", "berry_earned"]) bumpEraCounter(reloaded, k, 999);
  syncEraQuests(reloaded);
  reloaded.meta.beeWorkshop.codex.lotus = { count: 1 };
  assert.equal(confirmPrestige(reloaded).ok, true, "confirmPrestige succeeds with hives out");
  const rb = reloaded.meta.beeWorkshop;
  assert.ok(rb.hives[0].trip === null, "rebirth recalls the tending hive");
  assert.ok(rb.hives[1].trip?.phase === "done" && rb.hives[1].trip.keeperIds.length === 0 && rb.hives[1].trip.haul.length > 0, "a done hive keeps its honey while keepers go home");
  assert.ok(CF.getBeeKeeperMonIds(reloaded).size === 0 && rb.codex.lotus.count === 1, "nobody is away after rebirth; the codex is permanent");
  assert.ok(PT.claimBeeHive(reloaded, 1).ok, "the kept honey can still be collected");
}

// ============================================================================
// 4) 一键收取已归来伙伴 covers both new outings, reuses their own claim, keeps the still-out partners locked
// ============================================================================
{
  const st = freshState();
  const now = day(18, 12);
  PT.startIceRinkShow(st, "snowWaltz", [3, 4, 2], { nowMs: now });
  PT.advanceIceRink(st, 1800);
  PT.dispatchBeeHive(st, 0, [5], { nowMs: now });
  PT.advanceBeeWorkshop(st, 2400, { randFloat: () => 0 });
  PT.dispatchBeeHive(st, 2, [9], { nowMs: now });
  const units = CF.getAwayReturnedUnits(st);
  assert.deepEqual(units.map((u) => u.key), ["iceRink:show", "beeWorkshop:0"], "returned units: the finished show and the done hive — not the hive still tending");
  assert.deepEqual(units.map((u) => u.monIds.join()), ["3,4,2", "5"], "each unit names the partners it frees");
  const sum = PT.getReturnedPartnersSummary(st);
  assert.ok(sum.count === 2 && sum.partnerCount === 4 && sum.byActivity.map((g) => g.title).join() === "冰晶溜冰场,花田蜜蜂工坊", "summary groups by activity");
  const saved = loadFromRaw(JSON.parse(JSON.stringify(serializeState(st))));
  const coin0 = resOf(st, "futurecoin");
  const res = PT.collectAllReturnedPartners(st, { randFloat: seeded(3) });
  assert.ok(res.ok && res.collected.length === 2 && res.failed.length === 0, "both units collected");
  assert.deepEqual(res.freedMonIds, [2, 3, 4, 5], "skaters and the keeper come home");
  assert.ok(res.byActivity.iceRink === 1 && res.byActivity.beeWorkshop === 1, "byActivity counts");
  assert.ok(resOf(st, "futurecoin") > coin0 && st.meta.iceRink.buffs.prod && Object.keys(st.meta.beeWorkshop.codex).length === 1, "rewards, the buff and the codex are granted as usual");
  assert.ok(busyMonIds(st).has(9) && !busyMonIds(st).has(5), "the keeper still tending stays locked");
  assert.equal(PT.collectAllReturnedPartners(st).reason, "nothing_returned", "nothing left to collect");
  assert.equal(CF.getAwayReturnedUnits(saved).length, 2, "returned units survive serializeState -> loadFromRaw");
  assert.equal(PT.collectAllReturnedPartners(saved, { randFloat: seeded(4) }).collected.length, 2, "collect works after reload");
}

console.log("ml17-selfcheck: OK");
