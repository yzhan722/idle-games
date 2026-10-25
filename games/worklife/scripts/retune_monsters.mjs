// Monster gradient retune: model the player at each level, then solve every
// monster's hp/atk/def/interval from a target fight duration and target player
// HP loss. Archetypes get distinct fight shapes instead of uniform +15hp/+2atk.
//
//   node scripts/retune_monsters.mjs           # dry-run: print the new table
//   node scripts/retune_monsters.mjs --write   # rewrite pack monsters in place
//
// Player model (melee): main damage skill = L, the four spread skills = 0.8L.
// Gear: on-tier weapon + armor from the pack (best def per slot at that tier).
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const packPath = join(root, "shared/enhanced_content_pack_chinese.json");
const pack = JSON.parse(readFileSync(packPath, "utf8"));

// ---- combat math (mirrors backend/src/first_hour_combat.ts) ----------------
const BASE_HP = 50, HP_PER_STA = 10, BASE_ATK = 5, BASE_INT = 3000, INT_PER_ATK = 0.01;
const hitDamage = (a, d) => Math.max(1, Math.floor(a.atk - Math.floor(d.def / 2)));

function simulateFight(p, m, maxMs = 10 * 60_000) {
  let php = p.hp, mhp = m.hp, t = 0, pcd = 0, mcd = 0;
  while (php > 0 && mhp > 0 && t < maxMs) {
    const step = Math.max(1, Math.min(p.intervalMs - pcd, m.intervalMs - mcd));
    t += step; pcd += step; mcd += step;
    if (pcd >= p.intervalMs) { mhp -= hitDamage(p, m); pcd = 0; }
    if (mhp <= 0) break;
    if (mcd >= m.intervalMs) { php -= hitDamage(m, p); mcd = 0; }
  }
  return { won: mhp <= 0 && php > 0, durationMs: t, playerHpLeft: Math.max(0, php), enemyHpLeft: Math.max(0, mhp) };
}

// ---- player model ----------------------------------------------------------
// Design contract (zone_progression.test.ts): a zone's trash falls to a
// same-level player wearing the PREVIOUS zone's gear; the boss falls to the
// zone's OWN gear and kills a naked player. Gear figures come from the real
// loadout items; locked zones extrapolate the same step.
//   { trash: gear fought against for tuning trash, own: gear for the boss }
const GEAR = {
  forest:    { trash: { atk: 5, def: 10 },  own: { atk: 5, def: 29 } },
  mine:      { trash: { atk: 5, def: 29 },  own: { atk: 18, def: 60 } },
  swamp:     { trash: { atk: 18, def: 60 }, own: { atk: 20, def: 92 } },
  snow:      { trash: { atk: 20, def: 92 }, own: { atk: 50, def: 125 } },
  volcano:   { trash: { atk: 50, def: 125 }, own: { atk: 75, def: 160 } },
  abyss:     { trash: { atk: 75, def: 160 }, own: { atk: 130, def: 210 } },
  celestial: { trash: { atk: 130, def: 210 }, own: { atk: 180, def: 250 } },
  rift:      { trash: { atk: 180, def: 250 }, own: { atk: 225, def: 290 } },
  inferno:   { trash: { atk: 225, def: 290 }, own: { atk: 250, def: 330 } },
  genesis:   { trash: { atk: 250, def: 330 }, own: { atk: 330, def: 370 } },
  omega:     { trash: { atk: 330, def: 370 }, own: { atk: 450, def: 410 } },
};

// All skills at the level (matches the progression test's player — the
// strongest reasonable build; real players sit below this and still win trash).
function playerAt(level, gear) {
  const l = Math.max(1, level);
  return {
    hp: BASE_HP + (l - 1) * HP_PER_STA,
    atk: BASE_ATK + (l - 1) + gear.atk,
    def: Math.floor((l - 1) / 2) + gear.def,
    intervalMs: Math.round(BASE_INT / (1 + (l - 1) * INT_PER_ATK)),
  };
}

// ---- archetypes ------------------------------------------------------------
// defRatio: monster def as a fraction of the model player's atk (keeps player
// damage per hit meaningful). interval shapes the fight's feel.
// perHitCap: monster damage per hit, as a fraction of model player hp — what
// actually separates a tank (chip damage, forever) from a brute (huge hits).
const ARCH = {
  fast:     { defRatio: 0.25, interval: 1500, perHitCap: 0.028, xpMult: 0.85 },
  ordinary: { defRatio: 0.35, interval: 2400, perHitCap: 0.045, xpMult: 1.0 },
  slow:     { defRatio: 0.40, interval: 3200, perHitCap: 0.065, xpMult: 1.1 },
  tank:     { defRatio: 0.75, interval: 3000, perHitCap: 0.035, xpMult: 1.25 },
  brute:    { defRatio: 0.40, interval: 3400, perHitCap: 0.085, xpMult: 1.15 },
  boss:     { defRatio: 0.45, interval: 2200, perHitCap: 0.10,  xpMult: 8.0 },
};

// Which archetype each monster plays, by identity.
const ARCH_OF = {
  slime: "ordinary", caterpillar: "slow", monkey: "fast", mushroom: "tank", bee: "fast", crab: "tank",
  rock_golem: "tank", crystal_bat: "fast", ore_rat: "fast", magma_worm: "brute", iron_spider: "ordinary", gem_thief: "fast",
  poison_frog: "fast", swamp_zombie: "tank", mud_elemental: "slow", vine_snake: "fast", ghost_light: "brute", swamp_troll: "brute",
  snow_wolf: "fast", frost_imp: "fast", ice_golem: "tank", snow_harpy: "brute", frozen_knight: "ordinary", yeti: "tank",
  lava_slug: "tank", fire_bat: "fast", cinder_hound: "fast", magma_titan: "brute", flame_wraith: "brute", inferno_drake: "tank",
  shadow_crawler: "fast", void_specter: "brute", dread_knight: "ordinary", abyss_maw: "brute", nightmare_weaver: "slow", void_behemoth: "tank",
  light_sprite: "fast", sky_guardian: "ordinary", radiant_griffin: "fast", seraph_sentinel: "tank", divine_colossus: "brute", archon: "slow",
  chrono_phantom: "fast", paradox_beast: "brute", rift_stalker: "fast", temporal_wyrm: "tank", void_emperor: "slow", reality_render: "brute",
  hellhound: "fast", flame_imp: "fast", soul_reaper: "brute", lava_titan: "tank", infernal_dragon: "brute", doom_bringer: "slow", archfiend: "brute", hell_sovereign: "tank",
  star_seraph: "fast", cosmic_guardian: "tank", light_avatar: "fast", creation_golem: "slow", divine_phoenix: "fast", astral_judge: "ordinary", demigod: "brute", genesis_herald: "brute",
  void_devourer: "brute", entropy_beast: "brute", reality_eater: "slow", dimension_lord: "ordinary", cosmic_horror: "tank", world_ender: "brute", paradox_god: "slow", omega_herald: "fast",
};

// ---- fight targets ----------------------------------------------------------
// Trash: duration and player-hp-loss scale with position inside the zone
// (0 = zone entry fodder, 1 = last trash before the boss).
const TRASH_D0 = 22, TRASH_D1 = 65;   // seconds
const TRASH_X0 = 0.35, TRASH_X1 = 0.80; // fraction of player hp lost
const BOSS_D = 105, BOSS_X = 0.82;      // win in own gear with ~18% hp left

function solveMonster(level, zone, archetype, posFrac) {
  const a = ARCH[archetype];
  const boss = archetype === "boss";
  const p = playerAt(level, boss ? GEAR[zone].own : GEAR[zone].trash);
  const durS = boss ? BOSS_D : TRASH_D0 + (TRASH_D1 - TRASH_D0) * posFrac;
  const xFrac = boss ? BOSS_X : TRASH_X0 + (TRASH_X1 - TRASH_X0) * posFrac;

  // def from ratio of player atk, then hp from the hit count that fills durS.
  let def = Math.round(p.atk * a.defRatio * (boss ? 1.1 : 1 + posFrac * 0.35));
  const pDmg = Math.max(1, p.atk - Math.floor(def / 2));
  const hits = durS * 1000 / p.intervalMs;
  const hp = Math.max(10, Math.round(hits * pDmg));

  // monster atk: total damage over the fight should equal xFrac * player hp,
  // but per-hit is capped by archetype so a tank can't out-hit a brute.
  const enemyHits = durS * 1000 / a.interval;
  const perHit = Math.min((xFrac * p.hp) / Math.max(1, enemyHits), p.hp * a.perHitCap);
  const atk = Math.max(1, Math.round(perHit + p.def / 2));

  return { hp, atk, def, attackIntervalMs: a.interval, incomingDamageMult: 1, outgoingDamageMult: 1 };
}

// ---- rewards ----------------------------------------------------------------
function xpForLevel(level) {
  if (level < 1) return 0;
  if (level >= 200) return Infinity;
  if (level <= 15) return Math.floor(40 * Math.pow(level, 1.35));
  const l15 = Math.floor(40 * Math.pow(15, 1.35));
  if (level <= 30) return Math.floor(l15 + 65 * Math.pow(level - 15, 1.65));
  const l30 = Math.floor(l15 + 65 * Math.pow(15, 1.65));
  if (level <= 100) return Math.floor(l30 + 56 * Math.pow(level - 30, 1.96));
  const l100 = Math.floor(l30 + 56 * Math.pow(70, 1.96));
  const d = level - 100;
  return Math.floor(l100 + 9500 * d + 110 * Math.pow(d, 2.15));
}
const killsPerLevel = (l) => (l <= 15 ? 10 + 0.5 * l : 17.5 + 1.2 * (l - 15) + 0.022 * Math.pow(l - 15, 2));

// ---- generate ---------------------------------------------------------------
const stageOf = {};
for (const s of pack.stages) (s.monsters || []).forEach((id) => (stageOf[id] = s.id));

// New level layout: wider intra-zone spread so each zone is a real climb.
const LEVEL_OF = {
  forest:      [1, 2, 4, 6, 8, 9, 10],
  mine:        [11, 13, 15, 17, 18, 19, 20],
  swamp:       [21, 23, 25, 27, 28, 29, 30],
  snow:        [31, 34, 37, 40, 42, 44, 45],
  volcano:     [46, 49, 52, 55, 57, 59, 60],
  abyss:       [61, 64, 67, 70, 72, 74, 75],
  celestial:   [76, 79, 82, 85, 87, 89, 90],
  rift:        [91, 94, 97, 100, 102, 104, 105],
  inferno:     [106, 108, 111, 114, 116, 118, 119, 120],
  genesis:     [121, 123, 126, 129, 131, 133, 134, 135],
  omega:       [136, 138, 141, 144, 146, 148, 149, 150],
};

const newStats = {};
const report = [];
for (const stage of pack.stages) {
  const zone = stage.id;
  const ids = stage.monsters || [];
  const levels = LEVEL_OF[zone] || ids.map((_, i) => 1 + i * 2);
  const trashIds = ids.filter((id) => !id.endsWith("_boss"));
  ids.forEach((id, i) => {
    const m = pack.monsters.find((x) => x.id === id);
    if (!m) return;
    const boss = m.isBoss || id.endsWith("_boss");
    const arch = boss ? "boss" : (ARCH_OF[id] || "ordinary");
    const trashIdx = trashIds.indexOf(id);
    const posFrac = boss ? 1 : trashIds.length <= 1 ? 0 : trashIdx / (trashIds.length - 1);
    const level = levels[i] ?? m.level;
    const stats = solveMonster(level, zone, arch, posFrac);
    // Tutorial monster: winnable with nothing but the crafted wooden sword
    // (atk 10, no armor). Naked hands still lose — crafting stays mandatory.
    if (id === "slime") Object.assign(stats, { hp: 70, atk: 4, def: 4, attackIntervalMs: 2600 });
    // Early bosses quantize into knife-edge wins (perHit steps of 1 at low def):
    // shave one atk step so own-gear wins by a real margin, not 0% HP.
    if (id === "forest_boss") stats.atk = 18;
    if (id === "mine_boss") stats.atk = 37;
    const xp = Math.max(1, Math.round((xpForLevel(level) / killsPerLevel(level)) * ARCH[arch].xpMult));
    const gold = Math.max(1, Math.round(xp * (boss ? 1.5 : 0.9)));
    newStats[id] = { level, ...stats, xp, gold, archetype: arch, isBoss: boss };

    // sanity: player at the monster's own level with on-tier gear
    // sanity: trash must fall to a same-level player in the tuning gear
    // (previous zone's kit); the boss must fall to own gear but beat a naked one.
    const gear = boss ? GEAR[zone].own : GEAR[zone].trash;
    const p = playerAt(level, gear);
    const mc = { hp: stats.hp, atk: stats.atk, def: stats.def, intervalMs: stats.attackIntervalMs, incomingDamageMult: 1, outgoingDamageMult: 1 };
    const r = simulateFight({ ...p, outgoingDamageMult: 1, incomingDamageMult: 1 }, mc);
    let note = r.won ? "WIN " : "LOSS";
    if (boss) {
      const naked = simulateFight({ ...playerAt(level, { atk: 0, def: 0 }), outgoingDamageMult: 1, incomingDamageMult: 1 }, mc);
      note += naked.won ? "(naked WINS — too easy!)" : "(naked loses ✓)";
    }
    report.push({ zone, id, level, archetype: arch, ...stats, xp, gold, fight: `${(r.durationMs / 1000).toFixed(0)}s hpLeft ${((r.playerHpLeft / p.hp) * 100).toFixed(0)}%`, won: note });
  });
}

// ---- report -----------------------------------------------------------------
let lastZone = "";
for (const r of report) {
  if (r.zone !== lastZone) { console.log(`\n== ${r.zone} ==`); lastZone = r.zone; }
  console.log(
    `  ${r.id.padEnd(16)} lv${String(r.level).padEnd(3)} ${r.archetype.padEnd(8)}` +
    ` hp${String(r.hp).padStart(5)} atk${String(r.atk).padStart(4)} def${String(r.def).padStart(4)} int${r.attackIntervalMs}` +
    ` xp${String(r.xp).padStart(6)} gold${String(r.gold).padStart(6)}  | ${r.won} ${r.fight}`
  );
}

// ---- write ------------------------------------------------------------------
if (process.argv.includes("--write")) {
  for (const m of pack.monsters) {
    const s = newStats[m.id];
    if (!s) continue;
    Object.assign(m, {
      level: s.level, hp: s.hp, atk: s.atk, def: s.def,
      xp: s.xp, gold: s.gold, archetype: s.archetype,
      attackIntervalMs: s.attackIntervalMs,
      incomingDamageMult: s.incomingDamageMult,
      outgoingDamageMult: s.outgoingDamageMult,
      isBoss: s.isBoss,
    });
  }
  writeFileSync(packPath, JSON.stringify(pack, null, 2) + "\n");
  console.log(`\nwrote ${Object.keys(newStats).length} monsters -> ${packPath}`);
}
