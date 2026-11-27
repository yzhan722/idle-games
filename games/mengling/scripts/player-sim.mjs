#!/usr/bin/env node
/**
 * Long-run headless player simulation — find softlocks / bugs / closed-loop breaks.
 * Usage: node scripts/player-sim.mjs
 * Env: SIM_HOURS=48 SIM_DT=30 SIM_SEED=1
 */
import { createPlayerSim } from "./_player_sim_core.mjs";
import { BOX_SOFT_LIMIT } from "../modules/systems/mon_release.js";

const SIM_HOURS = Math.max(1, Number(process.env.SIM_HOURS) || 48);
const SIM_DT = Math.max(1, Number(process.env.SIM_DT) || 30);
const SEED = Math.max(1, Number(process.env.SIM_SEED) || 1);

const sim = createPlayerSim({ seed: SEED, dt: SIM_DT });
const { state, stats, findings, fail, warn, note, computeDerived, syncEraProgress } = sim;

const totalSec = Math.floor(SIM_HOURS * 3600);
for (let t = 0; t < totalSec; t += SIM_DT) sim.step(t);

// --- end assertions / closed loop ---
computeDerived();
syncEraProgress();

const uniqueDex = Object.values(state.dex?.caught || {}).filter((v) => typeof v === "number" && v > 0).length;
const techDone = Object.values(state.tech || {}).filter(Boolean).length;
const eraId = state.era?.id || "?";
const eraIndex = state.era?.index ?? -1;

note(`sim ${SIM_HOURS}h dt=${SIM_DT}s seed=${SEED}`);
note(`stats ${JSON.stringify(stats)}`);
note(`end: dex=${uniqueDex} catch=${state.catchCount||0} tech=${techDone} era=${eraId}(#${eraIndex}) mons=${state.mons?.list?.length||0}`);
note(`res catnip=${Math.floor(state.res.catnip?.value||0)}/${Math.floor(state.res.catnip?.cap||0)} wood=${Math.floor(state.res.wood?.value||0)} balls=${Math.floor(state.res.pokeball?.value||0)}`);
note(`buildings field=${state.buildings.field?.owned||0} hut=${state.buildings.hut?.owned||0} workshop=${state.buildings.workshop?.owned||0} train=${state.buildings.trainingGround?.owned||0} breed=${state.buildings.breedingHouse?.owned||0} exp=${state.buildings.expeditionPost?.owned||0}`);
note(`minerals=${Math.floor(state.res.minerals?.value||0)}/${Math.floor(state.res.minerals?.cap||0)}`);
note(`pve wins=${stats.pveWins} losses=${stats.pveLosses} progress=${Object.keys(state.pve?.progress||{}).filter(k=>!k.includes('_')).length}`);
note(`fun streakBest=${state.fun?.catchStreakBest||0} lucky=${state.luckyDay?.type} week=${state.luckyWeek?.type}`);

// Closed-loop expectations for a 48h smart player
if (!state.tech.pokeballBasics) fail("loop break: never researched pokeballBasics");
if ((state.catchCount || 0) < 1) fail("loop break: zero catches after sim");
if (uniqueDex < 1) fail("loop break: empty dex");
if (stats.gathers < 10) fail("loop break: almost no gathers");
if ((state.buildings.hut?.owned || 0) < 1 && SIM_HOURS >= 12) warn("slow: no hut after long sim");
if (eraIndex < 0) fail("era missing");
if (SIM_HOURS >= 24 && (state.catchCount || 0) < 30) warn("slow catch pace for 24h+ sim");
  if (SIM_HOURS >= 24 && eraIndex < 1) {
    const berry = state.era?.questCounters?.berry_earned || 0;
    const gather = state.era?.questCounters?.gather_total || 0;
    const catchC = state.era?.questCounters?.catch_count || 0;
    warn(`era slow: still dawn after ${SIM_HOURS}h (gather=${gather} catch=${catchC} berry=${berry})`);
  }
  if (SIM_HOURS >= 24 && stats.pveWins < 1 && (state.mons?.list?.length || 0) >= 6) {
    warn("PvE: no wins in 24h with 6+ mons — check battle balance / training");
  }
  if (SIM_HOURS >= 12 && (state.buildings.trainingGround?.owned || 0) >= 1 && (state.buildings.breedingHouse?.owned || 0) >= 1 && (state.buildings.expeditionPost?.owned || 0) < 1) {
    warn(`mid-game: train+breed built but no expeditionPost after ${SIM_HOURS}h (minerals=${Math.floor(state.res.minerals?.value || 0)}/${Math.floor(state.res.minerals?.cap || 0)})`);
  }
  if (SIM_HOURS >= 24 && (state.buildings.expeditionPost?.owned || 0) >= 1 && stats.expeditionsStarted < 1) {
    warn("mid-game: expeditionPost built but no expedition started in 24h+");
  }
  if (SIM_HOURS >= 24 && stats.expeditionsStarted > 0 && stats.expeditionsCompleted < 1) {
    warn("mid-game: expedition started but none completed in 24h+");
  }
  if ((state.mons?.list?.length || 0) > 2000) {
    warn(`mons box unbounded growth: ${state.mons.list.length} (release sink too weak)`);
  } else if ((state.mons?.list?.length || 0) > BOX_SOFT_LIMIT * 2 && (stats.released || 0) < 1) {
    warn(`mons box large (${state.mons.list.length}) without releases`);
  }
  if (SIM_HOURS >= 24) {
    const anyTrainLvl = (state.mons?.list || []).some((m) => (m.lvl || 1) >= 5);
    if ((state.buildings.trainingGround?.owned || 0) >= 1 && !anyTrainLvl) {
      warn("training ground owned but no mon reached lvl 5");
    }
  }

// Expedition complete path: if started, remaining should eventually finish via tick
if (stats.expeditionsStarted > 0 && state.expedition?.on && (state.expedition.remainingSec || 0) > 3600 * 10) {
  warn("expedition still running with huge remaining after sim window");
}

  // Deduplicate findings
  const seen = new Set();
  const uniq = [];
  for (const f of findings) {
    const k = `${f.sev}:${f.msg}`;
    if (seen.has(k)) continue;
    seen.add(k);
    uniq.push(f);
  }
  findings.length = 0;
  findings.push(...uniq);

  const fails = findings.filter((f) => f.sev === "FAIL");
  const warns = findings.filter((f) => f.sev === "WARN");
  const notes = findings.filter((f) => f.sev === "NOTE");

for (const f of findings) {
  const line = `${f.sev}: ${f.msg}`;
  if (f.sev === "FAIL") console.error(line);
  else if (f.sev === "WARN") console.warn(line);
  else console.log(line);
}

console.log(`player-sim: ${fails.length} FAIL, ${warns.length} WARN, ${notes.length} NOTE`);
process.exit(fails.length ? 1 : 0);
