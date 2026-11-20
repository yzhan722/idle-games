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
import { T1_ASSET_CACHE_VERSION, WL18_ABYSS_GUILD_ART_IDS, withAssetCacheVersion } from "./t1Art";
import { PALADIN_FOES } from "./airshipPaladin";
import {
  ABYSS_CURRENTS,
  ABYSS_DIVES_PER_LAYER_PER_DAY,
  ABYSS_GEARS,
  ABYSS_RUINS,
  GUILD_BONUS_CAPS,
  GUILD_RANKS,
  GUILD_RIVALS,
  GUILD_SEATS,
  GUILD_WAR_SWEEP_BONUS,
  GUILD_WAR_WEEKLY_ATTEMPTS,
  abyssCurrentTone,
  abyssDayEndsAtMs,
  abyssDayIndex,
  abyssDayIndexFromKey,
  abyssDayKey,
  cleanAbyssDivesToday,
  cleanGuildWarCleared,
  formatAbyssCurrent,
  formatGuildStats,
  generateGuildWarOpponent,
  getAbyssRuinMap,
  getAbyssSalvage,
  getGuildRank,
  getGuildRival,
  getGuildWarBonuses,
  getGuildWarLineup,
  getGuildWarSeatReward,
  guildWarOpponentMonster,
  guildWarWeekEndsAtMs,
  guildWarWeekIndex,
  guildWarWeekIndexFromKey,
  guildWarWeekKey,
  planAbyssDive,
  planAbyssGearUpgrade,
  planGuildWarChallenge,
} from "./abyssGuild";

const here = path.dirname(fileURLToPath(import.meta.url));
const t1Root = path.resolve(here, "../assets/t1");
const frontendSrcRoot = path.resolve(here, "..");
const T = Date.parse("2026-11-20T02:00:00.000Z");

describe("WL-18 frontend art contract, merged entry (no new header pill), zero-SVG/Emoji guard and Abyss Dive / Guild War helpers", () => {
  it("registers the 6 WL-18 512x512 RGBA .webp icons in the T1 contract, bumps the cache version and only uses real item / monster art", () => {
    assert.equal(T1_ASSET_CACHE_VERSION, "20261120wl18");
    assert.deepEqual([...WL18_ABYSS_GUILD_ART_IDS], ["abyss_dive", "diving_gear", "oxygen_tank", "guild_war", "guild_medal", "rival_banner"]);
    for (const id of WL18_ABYSS_GUILD_ART_IDS) {
      const key = t1KeyFor("skills", id)!;
      assert.equal(key, `skills/${id}`);
      assert.ok((T1_ASSET_KEYS as readonly string[]).includes(key), `Missing T1 key ${key}`);
      const spec = specByKey(key);
      assert.equal(spec?.profile, "icon");
      assert.equal(spec?.priority, "P2");
      const webp = path.join(t1Root, `${key}.webp`);
      assert.equal(existsSync(webp), true, `Missing .webp asset on disk: ${webp}`);
      assert.ok(statSync(webp).size > 2048, `Asset ${webp} unexpectedly small`);
      const size = rasterSize(readFileSync(webp), "webp");
      assert.equal(size?.width, 512);
      assert.equal(size?.height, 512);
    }
    assert.equal(withAssetCacheVersion("/assets/abyss_dive.webp"), "/assets/abyss_dive.webp?v=20261120wl18");
    const items = packJson.items as Array<{ id: string }>;
    const monsters = (packJson as any).monsters as Array<{ id: string }>;
    const art = (id: string) => existsSync(path.join(t1Root, `${t1KeyFor("item", id)}.webp`));
    for (const r of ABYSS_RUINS) {
      for (const id of r.salvage) {
        assert.ok(items.some((i) => i.id === id), `${id} is a pack item`);
        assert.equal(art(id), true, `item art for ${id}`);
      }
    }
    for (const g of ABYSS_GEARS) for (const id of Object.keys(g.materials)) assert.equal(art(id), true, `item art for ${id}`);
    for (const s of GUILD_SEATS) {
      for (const id of s.pool) {
        assert.ok(monsters.some((m) => m.id === id), `${id} is a pack monster`);
        assert.equal(existsSync(path.join(t1Root, `${t1KeyFor("monster", id)}.webp`)), true, `monster art for ${id}`);
      }
    }
    // the acceptance doc tells the truth about the reused icons
    const doc = readFileSync(path.resolve(here, "../../../docs/art/T1_ASSET_VISUAL_ACCEPTANCE.md"), "utf8");
    const row = doc.split(/\r?\n/).find((l) => l.includes("`skills/abyss_dive`"));
    assert.ok(row && row.includes("复用待补"), "WL-18 icons are marked 复用待补 in the visual acceptance doc");
  });

  it("merges the entry into the existing tavern panel (two new tabs) and the 远期 drawer, keeping the header at 9 pills and the view free of SVG/Emoji/remount flicker", () => {
    const endgame = CAREER_GROUPS.find((g) => g.title === "远期")!;
    assert.ok(endgame.items.includes("abyss"));
    assert.ok(endgame.items.indexOf("abyss") === endgame.items.indexOf("mine") + 1, "drawer entry sits right after the mine");
    assert.ok(endgame.items.indexOf("abyss") < endgame.items.indexOf("prestige"));
    assert.equal(CAREER_GROUPS.length, 4);

    const headerSrc = readFileSync(path.join(frontendSrcRoot, "components/GameHeader.tsx"), "utf8");
    const label = /abyss: "([^"]+)"/.exec(headerSrc)?.[1] ?? "";
    assert.equal(label, "潜航会战");
    assert.ok([...label].length <= 4, "menu name <= 4 chars");
    const pills = [...headerSrc.matchAll(/className="header-([a-z]+)-pill"/g)].map((m) => m[1]);
    assert.deepEqual(pills, ["tavern", "ranch", "arena", "academy", "harbor", "forge", "relics", "cauldron", "caravan"], "still exactly 9 header pills");
    assert.equal(/header-(abyss|dive|guild-?war)/.test(headerSrc), false, "no WL-18 header pill");
    assert.equal(/onOpenProg\("abyss"\)/.test(headerSrc), false, "no direct header button for WL-18");

    const ngiSrc = readFileSync(path.join(frontendSrcRoot, "components/NewGameInterface.tsx"), "utf8");
    assert.equal(ngiSrc.includes("{progPanel === 'abyss' && ("), true);
    assert.equal(ngiSrc.includes('initialTab="dive"'), true);

    const advSrc = readFileSync(path.join(frontendSrcRoot, "components/AdvancementPanels.tsx"), "utf8");
    const tavern = advSrc.slice(advSrc.indexOf("export function BardTavernChroniclePanel"), advSrc.indexOf("浮空飞艇商路 & 圣骑士团荣誉试炼 (WL-16)"));
    for (const id of ["tavern-tab-dive", "tavern-tab-guildwar"]) {
      assert.equal(tavern.includes(`data-testid="${id}"`), true, `${id} tab`);
    }
    // short tab names (<= 4 chars) and full names only in the panel title
    assert.ok(/>\s*遗迹潜航\s*</.test(tavern) && />\s*公会战\s*</.test(tavern));
    assert.equal(advSrc.includes("dive: '深海遗迹潜航'"), true);
    assert.equal(advSrc.includes("guildwar: '冒险者行会公会战'"), true);
    assert.equal(tavern.includes("<AbyssGuildView"), true, "WL-18 renders inside the existing panel");
    assert.equal(tavern.includes("view={tab === 'guildwar' ? 'guildwar' : 'dive'}"), true);
    assert.equal(
      advSrc.includes("export type TavernPanelTab = 'tavern' | 'chronicle' | 'airship' | 'trial' | 'mine' | 'waystation' | 'dive' | 'guildwar';"),
      true
    );
    const slice = advSrc.slice(advSrc.lastIndexOf("深海遗迹潜航 & 冒险者行会公会战 (WL-18)"));
    assert.ok(slice.length > 5000);
    assert.equal(/<svg[\s>]/i.test(slice), false, "no inline <svg>");
    assert.equal(/<canvas[\s>]/i.test(slice), false, "no <canvas> icons");
    assert.equal(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(slice), false, "no Emoji");
    assert.equal(slice.includes("[toast]"), false, "load callback must use toastRef");
    assert.equal(slice.includes("loading && !info"), true, "view stays mounted after first load");
    for (const id of WL18_ABYSS_GUILD_ART_IDS) assert.equal(slice.includes(`id="${id}"`), true, `view renders T1Art ${id}`);
    assert.equal(slice.includes("T1ItemIcon itemId={l.ruin.itemId}"), true, "ruins use the real salvage item art");
    assert.equal(slice.includes('kind="monster" id={s.monsterId}'), true, "seats reuse the real monster art");
    for (const fn of ["planAbyssDive(", "planGuildWarChallenge(", "getAbyssRuinMap(", "formatGuildStats(", "formatAbyssCurrent(", "abyssCurrentTone("]) {
      assert.equal(slice.includes(fn), true, `${fn} comes from the symmetric mirror`);
    }
    assert.equal(slice.includes("dayKey: d.dayKey"), true, "dives tell the server which ruin day they dive");
    assert.equal(slice.includes("weekKey: g.weekKey"), true, "challenges tell the server which week they fight");
    // the reused icons never sit next to their source art in the same view
    for (const src of ["fish_abyss_lantern", "harbor_aquarium", "star_dust_vial", "guild_honor_crest", "arena_medal", "trial_banner"]) {
      assert.equal(slice.includes(`id="${src}"`), false, `${src} (copy source) not shown next to its copy`);
    }

    const css = readFileSync(path.join(frontendSrcRoot, "components/AdvancementPanels.css"), "utf8").replace(/\r\n/g, "\n");
    for (const cls of ["ad-dive-btn", "ad-gear-btn", "gw-challenge-btn"]) {
      assert.equal(css.includes(`.${cls}:not(:disabled)`), true, `${cls} gradient only when enabled`);
      assert.equal(new RegExp(`(^|\\n)\\s*\\.${cls}\\s*\\{`).test(css), false, `${cls} must not override .prog-claim-btn:disabled`);
    }
    const wl18 = css.indexOf("(WL-18)");
    assert.ok(wl18 > css.indexOf("(WL-17)"));
    assert.ok(wl18 < css.lastIndexOf("@media (max-width: 1599px)"));
    assert.ok(wl18 < css.lastIndexOf("@media (max-width: 760px)") && wl18 < css.lastIndexOf("@media (max-width: 480px)"));
    assert.ok(/\.tv-tab-bar\s*\{[^}]*flex-wrap:\s*wrap/.test(css), "tab bar wraps");
  });

  it("generates the UTC+8 daily ruin map deterministically and plans dives by gear depth, chef level, daily dives and oxygen", () => {
    assert.equal(abyssDayKey(Date.parse("2026-11-19T15:59:00.000Z")), "2026-11-19");
    assert.equal(abyssDayKey(Date.parse("2026-11-19T16:00:00.000Z")), "2026-11-20");
    assert.equal(abyssDayEndsAtMs(T), Date.parse("2026-11-20T16:00:00.000Z"));
    assert.equal(abyssDayIndexFromKey("2026-02-30"), null);
    const d = abyssDayIndex(T);
    const map = getAbyssRuinMap(d);
    assert.deepEqual(getAbyssRuinMap(d), map, "same day, same ruins");
    let changed = false;
    for (let k = 1; k <= 7; k++) if (JSON.stringify(getAbyssRuinMap(d + k)) !== JSON.stringify(map)) changed = true;
    assert.ok(changed, "new days bring new ruins");
    map.forEach((r, i) => {
      assert.equal(r.layer, i + 1);
      assert.ok(ABYSS_RUINS[i].salvage.includes(r.itemId));
      const c = ABYSS_CURRENTS.find((x) => x.id === r.current)!;
      assert.equal(r.oxygenCost, Math.round((ABYSS_RUINS[i].baseOxygen * c.oxygenPct) / 100));
    });
    assert.equal(ABYSS_CURRENTS.reduce((s, c) => s + c.weight, 0), 100);

    // salvage = base × current × gear (floor, at least 1)
    const s1 = getAbyssSalvage(d, 1, 1);
    const c1 = ABYSS_CURRENTS.find((x) => x.id === s1.current)!;
    assert.equal(s1.qty, Math.floor((ABYSS_RUINS[0].baseQty * c1.salvagePct * 100) / 10_000));
    assert.ok(getAbyssSalvage(d, 1, 5).qty > s1.qty, "better gear salvages more");

    // gates: gear depth, chef level, dives per day, oxygen
    assert.equal(planAbyssDive(d, 1, 1, 1, {}, 0).ok, true);
    const deep = planAbyssDive(d, 2, 1, 99, {}, 0);
    assert.equal(deep.ok, false);
    assert.equal(deep.gearOk, false);
    const lowChef = planAbyssDive(d, 2, 2, 19, {}, 0);
    assert.equal(lowChef.gearOk, true);
    assert.equal(lowChef.levelOk, false);
    assert.equal(planAbyssDive(d, 2, 2, 20, {}, 0).ok, true);
    const spent = planAbyssDive(d, 1, 1, 1, { "1": ABYSS_DIVES_PER_LAYER_PER_DAY }, 0);
    assert.equal(spent.ok, false);
    assert.equal(spent.divesLeft, 0);
    const breathless = planAbyssDive(d, 1, 1, 1, {}, 100 - map[0].oxygenCost + 1);
    assert.equal(breathless.oxygenOk, false);
    assert.equal(breathless.ok, false);
    assert.equal(planAbyssDive(d, 1, 1, 1, {}, 100 - map[0].oxygenCost).ok, true, "exactly enough oxygen is enough");
    assert.equal(planAbyssDive(d, 6, 5, 999, {}, 0).ok, false, "no sixth layer");
    assert.deepEqual(cleanAbyssDivesToday({ "1": 9, "2": -1, "7": 1, x: 2, "3": 1.7 }), { "1": 2, "3": 1 });

    // gear upgrades use real crafted goods, strictly improving
    ABYSS_GEARS.forEach((g, i) => {
      assert.equal(g.level, i + 1);
      if (i > 0) {
        const p = ABYSS_GEARS[i - 1];
        assert.ok(g.oxygen > p.oxygen && g.salvagePct > p.salvagePct && g.maxLayer > p.maxLayer && g.costGold > p.costGold);
      }
    });
    assert.equal(ABYSS_GEARS[ABYSS_GEARS.length - 1].maxLayer, ABYSS_RUINS.length);
    const up = planAbyssGearUpgrade(1, 2000, { leather_hide: 8, ingot_2: 12 });
    assert.equal(up.ok, true);
    assert.equal(planAbyssGearUpgrade(1, 1999, { leather_hide: 8, ingot_2: 12 }).goldOk, false);
    assert.equal(planAbyssGearUpgrade(1, 2000, { leather_hide: 7, ingot_2: 12 }).materialsOk, false);
    assert.equal(planAbyssGearUpgrade(5, 1e9, {}).maxed, true);
    assert.equal(abyssCurrentTone("nope"), "calm");
    assert.equal(formatAbyssCurrent("surge"), "暗涌 · 氧气 ×125% · 打捞 ×130%");
  });

  it("rotates the rival guild weekly (UTC+8 Monday), builds five seats from real monster stats and caps the guild-rank bonuses", () => {
    assert.equal(guildWarWeekKey(Date.parse("2026-11-22T15:59:00.000Z")), "2026-11-16");
    assert.equal(guildWarWeekKey(Date.parse("2026-11-22T16:00:00.000Z")), "2026-11-23");
    assert.equal(guildWarWeekIndexFromKey("2026-11-18"), null, "week keys are Mondays");
    const w = guildWarWeekIndex(T);
    assert.equal(guildWarWeekIndexFromKey("2026-11-16"), w);
    assert.equal(guildWarWeekEndsAtMs(T), Date.parse("2026-11-22T16:00:00.000Z"));
    const rivals = new Set([0, 1, 2, 3].map((k) => getGuildRival(w + k).id));
    assert.equal(rivals.size, GUILD_RIVALS.length, "four rival guilds take turns");
    assert.equal(getGuildRival(w).id, getGuildRival(w + GUILD_RIVALS.length).id);

    const lineup = getGuildWarLineup(w);
    assert.deepEqual(getGuildWarLineup(w), lineup);
    assert.equal(lineup.length, GUILD_SEATS.length);
    const rival = getGuildRival(w);
    lineup.forEach((o, i) => {
      const seat = GUILD_SEATS[i];
      assert.ok(seat.pool.includes(o.monsterId));
      const foe = PALADIN_FOES.find((f) => f.monsterId === o.monsterId)!;
      assert.ok(foe, "opponents come from the real monster stat table");
      assert.equal(o.hp, Math.max(1, Math.round((foe.hp * seat.hpPct * rival.hpPct) / 10_000)));
      assert.equal(o.atk, Math.max(1, Math.round((foe.atk * rival.atkPct) / 100)));
      assert.equal(o.def, Math.max(0, Math.round((foe.def * rival.defPct) / 100)));
      assert.equal(o.level, foe.level);
      assert.equal(o.isBoss, i === GUILD_SEATS.length - 1);
      const m = guildWarOpponentMonster(o);
      assert.equal(m.gold, 0);
      assert.equal(m.xp, 0);
      if (i > 0) assert.ok(o.level > lineup[i - 1].level, "seats get stronger");
    });
    assert.equal(generateGuildWarOpponent(w, 99).seat, GUILD_SEATS.length);

    assert.deepEqual(cleanGuildWarCleared([2, 1, 4]), [1, 2]);
    assert.deepEqual(cleanGuildWarCleared([3]), []);
    const p1 = planGuildWarChallenge(w, 1, [], 0);
    assert.equal(p1.ok, true);
    assert.equal(planGuildWarChallenge(w, 2, [], 0).inOrder, false);
    assert.equal(planGuildWarChallenge(w, 1, [1], 0).already, true);
    assert.equal(planGuildWarChallenge(w, 2, [1], GUILD_WAR_WEEKLY_ATTEMPTS).attemptsLeft, 0);
    assert.equal(planGuildWarChallenge(w, 2, [1], GUILD_WAR_WEEKLY_ATTEMPTS).ok, false);
    assert.deepEqual(getGuildWarSeatReward(5), { seat: 5, medals: GUILD_SEATS[4].medals + GUILD_WAR_SWEEP_BONUS, base: GUILD_SEATS[4].medals, sweep: true });

    assert.equal(getGuildRank(0).current.rank, 0);
    assert.equal(getGuildRank(GUILD_RANKS[3].minMedals).current.rank, 3);
    assert.equal(getGuildRank(1e9).current.rank, GUILD_RANKS.length - 1);
    const top = getGuildWarBonuses({ guildWar: { totalMedals: 1e9 } });
    assert.equal(top.goldGainPct, GUILD_BONUS_CAPS.goldGainPct);
    assert.equal(top.xpGainPct, GUILD_BONUS_CAPS.xpGainPct);
    assert.deepEqual(getGuildWarBonuses(null), { totalMedals: 0, rank: 0, rankName: "见习团员", goldGainPct: 0, xpGainPct: 0 });
    assert.deepEqual(formatGuildStats({ goldGainPct: 2, xpGainPct: 1 }), ["金币 +2%", "经验 +1%"]);
  });
});
