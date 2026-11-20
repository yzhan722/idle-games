import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import packJson from "../shared/enhanced_content_pack_chinese.json";
import type { EnhancedContentPack } from "../backend/src/types";
import * as BE from "../backend/src/progression2";
import { CRAFT_SKILL_BY_PROFESSION, GATHER_SKILL_BY_PROFESSION, defaultEnhancedPlayerState } from "../backend/src/storage";
import * as FE from "../frontend/src/gameplay/abyssGuild";
import { PALADIN_FOES as FE_PALADIN_FOES } from "../frontend/src/gameplay/airshipPaladin";
import { t1KeyFor } from "../frontend/src/assets/t1/keys";

const pack = packJson as EnhancedContentPack;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const CORE_START = "/* ---- 以下为与后端逐字对称的表与纯函数（WL-18 core） ---- */";
const CORE_END = "/* ---- 以上为 WL-18 core ---- */";

function coreOf(file: string): string {
  const src = readFileSync(path.join(root, file), "utf8").replace(/\r\n/g, "\n");
  const a = src.indexOf(CORE_START);
  const b = src.indexOf(CORE_END);
  assert.ok(a >= 0 && b > a, `WL-18 core markers missing in ${file}`);
  return src.slice(a, b + CORE_END.length);
}

/** Tiny deterministic PRNG for fixture generation (independent of the code under test). */
function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const items = new Map((pack.items as any[]).map((i) => [i.id, i]));
const monsters = new Map(((pack as any).monsters as any[]).map((m) => [m.id, m]));
const actions = pack.actions as any[];
const itemArt = (id: string) => existsSync(path.join(root, "frontend/src/assets/t1", `${t1KeyFor("item", id)}.webp`));

describe("WL-18 backend <-> frontend Abyss Ruin Dive & Guild War 1:1 parity", () => {
  it("keeps the WL-18 core source region byte-identical on both sides", () => {
    assert.equal(coreOf("frontend/src/gameplay/abyssGuild.ts"), coreOf("backend/src/progression2.ts"));
  });

  it("keeps every static WL-18 table 1:1 identical, backed by real materials, crafted goods and monster combat stats", () => {
    const keys = [
      "ABYSS_CURRENT_IDS",
      "GUILD_RIVAL_IDS",
      "ABYSS_TZ_OFFSET_MINUTES",
      "ABYSS_DIVES_PER_LAYER_PER_DAY",
      "ABYSS_COUNTER_CAP",
      "GUILD_WAR_WEEK_EPOCH_MS",
      "GUILD_WAR_WEEK_MS",
      "GUILD_WAR_WEEKLY_ATTEMPTS",
      "GUILD_WAR_SWEEP_BONUS",
      "GUILD_MEDAL_CAP",
      "ABYSS_CURRENTS",
      "ABYSS_RUINS",
      "ABYSS_GEARS",
      "GUILD_RIVALS",
      "GUILD_SEATS",
      "GUILD_STAT_KEYS",
      "GUILD_BONUS_CAPS",
      "GUILD_RANKS",
    ] as const;
    for (const k of keys) assert.deepEqual((FE as any)[k], (BE as any)[k], `table ${k} differs`);
    assert.deepEqual(FE_PALADIN_FOES, BE.PALADIN_FOES, "both sides reference the same monster stat table");
    assert.equal(FE.ABYSS_TZ_OFFSET_MINUTES, BE.MINE_TZ_OFFSET_MINUTES, "same UTC+8 day as the mine and the waystation");
    assert.equal(FE.GUILD_WAR_WEEK_EPOCH_MS, BE.PALADIN_WEEK_EPOCH_MS, "same Monday weeks as the paladin trial");
    assert.equal(FE.GUILD_WAR_WEEK_MS, BE.PALADIN_WEEK_MS);
    assert.equal(FE.ABYSS_CURRENTS.reduce((s, c) => s + c.weight, 0), 100);

    // ruins: two real materials each, consumed by real recipes (never a new item), with art; deeper = harder
    FE.ABYSS_RUINS.forEach((r, i) => {
      assert.equal(r.layer, i + 1);
      assert.equal(r.salvage.length, 2);
      for (const id of r.salvage) {
        assert.ok(items.has(id), `${id} is a pack item`);
        assert.ok(itemArt(id), `${id} art`);
        assert.ok(actions.some((a) => (a.consumes || []).some((c: any) => c.itemId === id)), `${id} feeds a real recipe`);
      }
      if (i > 0) {
        const p = FE.ABYSS_RUINS[i - 1];
        assert.ok(r.minChefLevel > p.minChefLevel && r.baseOxygen > p.baseOxygen && r.meters > p.meters);
      }
    });
    // gear: real crafted / husbandry goods with art, strictly improving
    const produced = (id: string) =>
      actions.some(
        (a) =>
          (Object.values(CRAFT_SKILL_BY_PROFESSION).includes(a.skillId) || Object.values(GATHER_SKILL_BY_PROFESSION).includes(a.skillId)) &&
          (a.yields || []).some((y: any) => y.itemId === id)
      );
    FE.ABYSS_GEARS.forEach((g, i) => {
      assert.equal(g.level, i + 1);
      if (i === 0) {
        assert.equal(g.costGold, 0);
        assert.deepEqual(g.materials, {});
        return;
      }
      for (const id of Object.keys(g.materials)) assert.ok(produced(id) && itemArt(id), `gear material ${id} is a real produced good with art`);
    });
    // guild seats: every pool monster is a real pack monster and the shared stat table matches the pack field by field
    for (const s of FE.GUILD_SEATS) {
      for (const id of s.pool) {
        const m = monsters.get(id);
        assert.ok(m, `${id} is a pack monster`);
        const f = FE_PALADIN_FOES.find((x) => x.monsterId === id);
        assert.ok(f, `${id} is in the shared stat table`);
        assert.equal(f!.hp, m.hp);
        assert.equal(f!.atk, m.atk);
        assert.equal(f!.def, m.def);
        assert.equal(f!.level, m.level);
        assert.equal(f!.attackIntervalMs, m.attackIntervalMs);
      }
    }
    FE.GUILD_RANKS.forEach((r, i) => {
      assert.equal(r.rank, i);
      if (i > 0) assert.ok(r.minMedals > FE.GUILD_RANKS[i - 1].minMedals);
    });
    const top = FE.getGuildWarBonuses({ guildWar: { totalMedals: FE.GUILD_MEDAL_CAP } });
    for (const k of FE.GUILD_STAT_KEYS) assert.equal(top[k], FE.GUILD_BONUS_CAPS[k], `cap ${k}`);
  });

  it("matches UTC+8 day / week keys, ruin maps, salvage and guild lineups across three years", () => {
    const start = Date.parse("2025-12-01T00:00:00.000Z");
    const rnd = lcg(18);
    for (let i = 0; i < 1500; i++) {
      const t = start + Math.floor(rnd() * 3 * 365 * 86_400_000);
      assert.equal(FE.abyssDayIndex(t), BE.abyssDayIndex(t));
      assert.equal(FE.abyssDayKey(t), BE.abyssDayKey(t));
      assert.equal(FE.abyssDayEndsAtMs(t), BE.abyssDayEndsAtMs(t));
      assert.equal(FE.guildWarWeekIndex(t), BE.guildWarWeekIndex(t));
      assert.equal(FE.guildWarWeekKey(t), BE.guildWarWeekKey(t));
      assert.equal(FE.guildWarWeekEndsAtMs(t), BE.guildWarWeekEndsAtMs(t));
      assert.equal(FE.guildWarWeekKey(t), BE.paladinWeekKey(t), "guild weeks line up with the paladin trial weeks");
      const d = FE.abyssDayIndex(t);
      assert.equal(FE.abyssDayIndexFromKey(FE.abyssDayKey(t)), d);
      assert.deepEqual(FE.getAbyssRuinMap(d), BE.getAbyssRuinMap(d));
      const layer = 1 + Math.floor(rnd() * 5);
      const gear = 1 + Math.floor(rnd() * 5);
      assert.deepEqual(FE.getAbyssSalvage(d, layer, gear), BE.getAbyssSalvage(d, layer, gear));
      const w = FE.guildWarWeekIndex(t);
      assert.equal(FE.guildWarWeekIndexFromKey(FE.guildWarWeekKey(t)), w);
      assert.deepEqual(FE.getGuildWarLineup(w), BE.getGuildWarLineup(w));
      assert.deepEqual(FE.getGuildRival(w), BE.getGuildRival(w));
    }
    // current frequencies over three years follow the published weights
    const counts: Record<string, number> = { calm: 0, surge: 0, wreck: 0 };
    const d0 = FE.abyssDayIndex(start);
    for (let d = d0; d < d0 + 1095; d++) for (const r of FE.getAbyssRuinMap(d)) counts[r.current] += 1;
    const total = 1095 * FE.ABYSS_RUINS.length;
    for (const c of FE.ABYSS_CURRENTS) assert.ok(Math.abs(counts[c.id] / total - c.weight / 100) < 0.03, `${c.id} ${counts[c.id]}`);
  });

  it("matches dive / gear / challenge plans and guild bonuses for random and dirty inputs, and the backend view agrees with the mirror", () => {
    const rnd = lcg(1818);
    const dirty = [undefined, null, -1, 0, 1.5, "3", NaN, Infinity, 1e12, "x", {}, []];
    const pick = () => (rnd() < 0.25 ? dirty[Math.floor(rnd() * dirty.length)] : Math.floor(rnd() * 8));
    const ids = ["leather_hide", "ingot_2", "dyed_cloth", "ingot_4", "ingot_6", "ingot_8"];
    for (let i = 0; i < 1500; i++) {
      const d = 20_000 + Math.floor(rnd() * 1200);
      const dives: Record<string, unknown> = {};
      for (let l = 0; l <= 6; l++) if (rnd() < 0.4) dives[String(l)] = pick();
      const inv: Record<string, unknown> = { gold: rnd() < 0.2 ? "x" : Math.floor(rnd() * 90_000) };
      for (const id of ids) if (rnd() < 0.5) inv[id] = rnd() < 0.15 ? pick() : Math.floor(rnd() * 30);
      const layer = rnd() < 0.2 ? pick() : 1 + Math.floor(rnd() * 5);
      const oxygen = rnd() < 0.2 ? pick() : Math.floor(rnd() * 320);
      const args = [d, layer, pick(), rnd() < 0.2 ? pick() : Math.floor(rnd() * 90), dives, oxygen] as const;
      assert.deepEqual(FE.planAbyssDive(...args), BE.planAbyssDive(...args));
      assert.deepEqual(FE.cleanAbyssDivesToday(dives), BE.cleanAbyssDivesToday(dives));
      const lv = pick();
      assert.deepEqual(FE.planAbyssGearUpgrade(lv, inv.gold, inv), BE.planAbyssGearUpgrade(lv, inv.gold, inv));
      const w = 2_800 + Math.floor(rnd() * 200);
      const cleared = rnd() < 0.2 ? pick() : [1, 2, 3, 4, 5, "2"].filter(() => rnd() < 0.5);
      const seat = rnd() < 0.2 ? pick() : 1 + Math.floor(rnd() * 5);
      const used = pick();
      assert.deepEqual(FE.planGuildWarChallenge(w, seat, cleared, used), BE.planGuildWarChallenge(w, seat, cleared, used));
      assert.deepEqual(FE.cleanGuildWarCleared(cleared), BE.cleanGuildWarCleared(cleared));
      const medals = rnd() < 0.2 ? pick() : Math.floor(rnd() * 500);
      assert.deepEqual(FE.getGuildRank(medals), BE.getGuildRank(medals));
      assert.deepEqual(FE.getGuildWarBonuses({ guildWar: { totalMedals: medals } }), BE.getGuildWarBonuses({ guildWar: { totalMedals: medals } }));
    }
    assert.deepEqual(FE.getGuildWarBonuses(null), BE.getGuildWarBonuses(null));
    assert.deepEqual(FE.getGuildWarBonuses({ guildWar: "x" as any }), BE.getGuildWarBonuses({ guildWar: "x" as any }));

    const s = defaultEnhancedPlayerState(pack.version);
    const now = new Date("2026-11-20T02:00:00.000Z");
    (s.skills as any).skill_chef.level = 40;
    BE.ensureAbyssDive(s, now).gearLevel = 3;
    const view = BE.getAbyssGuildInfo(s, pack, now);
    const d = FE.abyssDayIndex(now);
    for (const l of view.dive.layers) {
      const p = FE.planAbyssDive(d, l.layer, 3, 40, {}, 0);
      assert.equal(l.canDive, p.ok, `layer ${l.layer}`);
      assert.equal(l.ruin.itemId, p.salvage!.itemId);
      assert.equal(l.ruin.qty, p.salvage!.qty);
      assert.equal(l.ruin.oxygenCost, p.salvage!.oxygenCost);
    }
    const w = FE.guildWarWeekIndexFromKey(view.guild.weekKey)!;
    assert.deepEqual(
      view.guild.seats.map((x) => [x.seat, x.monsterId, x.hp, x.atk, x.def]),
      FE.getGuildWarLineup(w).map((x) => [x.seat, x.monsterId, x.hp, x.atk, x.def])
    );
    assert.equal(view.guild.rival.id, FE.getGuildRival(w).id);
  });
});
