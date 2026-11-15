#!/usr/bin/env node
// P2 转生循环自检（无测试框架，assert 风格）
import {
  emptyEraState,
  instantiateQuests,
  previewPrestige,
  confirmPrestige,
  canPrestige,
  syncEraQuests,
  bumpEraCounter,
  PRESTIGE_KEEP_FIELDS,
} from "../modules/systems/era.js";
import {
  LEGACY_PERKS,
  LEGACY_PERK_ORDER,
  normalizeLegacy,
  ensureLegacy,
  perkLevel,
  perkCost,
  canBuyPerk,
  buyPerk,
  computeEssence,
  legacyProdMul,
  legacyCatchAdd,
  legacyCapMul,
  legacyBreedTimeMul,
  legacyHatchAffectionAdd,
  legacyExpeditionTimeMul,
  legacyExpeditionRewardMul,
  setNatalBondMonId,
  REBIRTH_SHINY_REQ,
} from "../modules/systems/rebirth.js";
import {
  autofillShinyShowcase,
  computeShinyShowcaseAura,
  noteShinySpecies,
  SHINY_SHOWCASE_MAX,
  toggleShinyShowcasePid,
} from "../modules/systems/collection_fun.js";
import { busyMonIds } from "../modules/systems/mon_release.js";
import { ERA_DEFS, getEraDefByIndex } from "../modules/defs_eras.js";

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error(`FAIL: ${msg}`);
  }
}

const paradoxDef = getEraDefByIndex(ERA_DEFS.length - 1);

/** 构造「悖梦主线全清」的可转生存档夹具。 */
function clearedState(overrides = {}) {
  const state = {
    dex: { caught: Object.fromEntries([...Array(155)].map((_, i) => [String(i + 1), 1])) },
    tech: Object.fromEntries([...Array(16)].map((_, i) => [`t${i}`, true])),
    buildings: { field: { owned: 60 } },
    res: { catnip: { value: 999, cap: 1000 } },
    mons: { list: [{ id: 1, pid: "test", level: 50 }], nextId: 2 },
    auto: { clicker: true },
    permanentBoosts: { exp: 2 },
    shinyCount: REBIRTH_SHINY_REQ,
    catchCount: 999,
    meta: { createdAt: Date.now() - 200 * 3600e3, legacy: { essence: 0, essenceEarned: 0, perks: {} } },
    era: emptyEraState(ERA_DEFS.length - 1),
    ...overrides,
  };
  bumpEraCounter(state, "catch_count", 999);
  bumpEraCounter(state, "pokeball_earned", 999);
  bumpEraCounter(state, "gather_total", 999);
  bumpEraCounter(state, "berry_earned", 999);
  syncEraQuests(state);
  return state;
}

// ── 门槛 ──────────────────────────────────────────────
{
  const state = clearedState({ shinyCount: 0 });
  const p = previewPrestige(state);
  assert(p.ok === false && p.reason === "need_shiny", "no shiny → need_shiny");
  assert(canPrestige(state) === false, "canPrestige blocked without shiny");
}
{
  const state = clearedState();
  const p = previewPrestige(state);
  assert(p.ok === true, "paradox cleared + shiny → can prestige");
  assert(p.essence > 0, "preview exposes essence");
  assert(p.prestigeCountAfter === 1, "first prestige → count 1");
  assert(p.keeps.length === PRESTIGE_KEEP_FIELDS.length, "keeps list intact");
}

// ── 灵珀公式 ──────────────────────────────────────────
{
  const state = clearedState();
  state.era.cycleStartMs = 1000; // 旧 cycle → 无速度加成
  const noSpeed = computeEssence(state, 200 * 3600e3);
  assert(noSpeed === 50 + 155 + REBIRTH_SHINY_REQ * 10 + 0, "essence = 50+dex+shiny*10, slow cycle");
  const fast = computeEssence(state, 1000 + 10 * 3600e3);
  assert(fast === noSpeed + 80, "fast cycle <36h → +80 speed bonus");
  const mid = computeEssence(state, 1000 + 50 * 3600e3);
  assert(mid === noSpeed + 40, "cycle <72h → +40 speed bonus");
}

// ── 转生执行：重置/保留/奖励 ──────────────────────────
{
  const state = clearedState();
  state.meta.legacy.perks.startTech = 1;
  state.meta.legacy.perks.starterMon = 1;
  const expectedEssence = computeEssence(state); // 结算用重置前的 era.cycleStartMs
  let starterCalled = 0;
  const result = confirmPrestige(state, {
    addLog: () => {},
    starterMonFactory: () => {
      starterCalled += 1;
      return { id: 77, pid: "giftmon", level: 5 };
    },
  });
  assert(result.ok === true, "confirmPrestige ok");
  assert(state.era.mode === "distortion", "mode → distortion");
  assert(state.era.index === 0 && state.era.id === "dawn", "era restarts at dawn");
  assert(state.era.prestigeCount === 1, "prestigeCount 1");
  assert(state.res.catnip.value === 0, "res reset");
  assert(state.buildings.field.owned === 0, "buildings reset");
  assert(state.tech.t0 !== true && state.tech.berryCultivation === true && state.tech.pokeballBasics === true,
    "tech reset but startTech perk grants starter techs");
  assert(state.auto.clicker === false, "auto reset");
  assert(state.mons.list.length === 1 && state.mons.list[0].pid === "giftmon", "mons cleared + starterMon perk grants gift");
  assert(state.dex.caught["1"] === 1, "dex kept");
  assert(state.permanentBoosts.exp === 2, "permanentBoosts kept");
  assert(starterCalled === 1, "starterMonFactory invoked once");
  assert(state.meta.legacy.essence > 0 && state.meta.legacy.essenceEarned === state.meta.legacy.essence,
    "essence granted to meta.legacy");
  assert(state.meta.legacy.essence === expectedEssence, "granted essence matches preview formula");
}

// ── 扭曲循环：第二次转生（旧 canPrestige 在 distortion 下永远 false）──
{
  const state = clearedState();
  confirmPrestige(state, { addLog: () => {} });
  // 二周目再打到悖梦
  state.era.index = ERA_DEFS.length - 1;
  state.era.id = paradoxDef.id;
  state.era.quests = instantiateQuests(paradoxDef, state.era.prestigeCount);
  bumpEraCounter(state, "catch_count", 9999);
  bumpEraCounter(state, "pokeball_earned", 9999);
  state.tech = Object.fromEntries([...Array(16)].map((_, i) => [`t${i}`, true]));
  syncEraQuests(state);
  const p2 = previewPrestige(state);
  assert(p2.ok === true, "distortion cycle can prestige again (loop)");
  assert(p2.prestigeCountAfter === 2, "second prestige → count 2");
  const catchQ = state.era.quests.find((q) => q.id === "paradox_catch_360");
  assert(catchQ.target === Math.ceil(360 * 1.5), "cycle-2 era target scaled ×1.5");
  const dexQ = state.era.quests.find((q) => q.id === "paradox_dex_150");
  assert(dexQ.target === 150, "absolute quest not scaled");
}

// ── 加成树 ────────────────────────────────────────────
{
  const state = clearedState();
  ensureLegacy(state);
  state.meta.legacy.essence = 100;
  assert(canBuyPerk(state, "prod") === true, "can buy prod lvl1");
  const r1 = buyPerk(state, "prod");
  assert(r1.ok && r1.cost === LEGACY_PERKS.prod.baseCost, "prod lvl1 costs baseCost");
  assert(perkLevel(state, "prod") === 1, "prod lvl 1");
  assert(Math.abs(legacyProdMul(state) - 1.12) < 1e-9, "prod mul +12%");
  assert(legacyCatchAdd(state) === 0, "catch add 0 before perk");
  buyPerk(state, "catch");
  assert(Math.abs(legacyCatchAdd(state) - 0.04) < 1e-9, "catch add +4% at lvl1");
  buyPerk(state, "cap");
  assert(Math.abs(legacyCapMul(state) - 1.15) < 1e-9, "cap mul +15% at lvl1");
  const depleted = buyPerk(state, "starterMon");
  assert(depleted.ok === false && depleted.reason === "essence", "insufficient essence blocked");
  state.meta.legacy.essence = 500;
  for (let i = 0; i < 12; i += 1) buyPerk(state, "prod");
  assert(perkLevel(state, "prod") === 10, "prod caps at max 10");
  assert(buyPerk(state, "prod").ok === false, "maxed perk rejected");
  assert(LEGACY_PERK_ORDER.every((id) => LEGACY_PERKS[id]), "perk order ⊆ defs");
}

// ── normalizeLegacy 容错 ─────────────────────────────
{
  const n = normalizeLegacy({ essence: 12.7, perks: { prod: 99, catch: "x" } });
  assert(n.essence === 12, "essence floored");
  assert(n.perks.prod === 10, "perk level clamped to max");
  assert(n.perks.catch === 0, "non-number perk → 0");
  const n2 = normalizeLegacy(null);
  assert(n2.essence === 0 && n2.perks.prod === 0, "null legacy → defaults");
}

// ── ML-3：本命灵契 / 极速孵育 / 远征达人 / 闪光殿堂展柜 ─────
{
  const state = clearedState({
    mons: {
      list: [
        { id: 10, pid: "p004", dex: 4, name: "普通火幼兽", tier: "common", lvl: 42, isShiny: false, stars: 0 },
        {
          id: 25,
          pid: "p150",
          dex: 150,
          name: "星辉本命兽",
          tier: "epic",
          lvl: 88,
          exp: 999,
          isShiny: true,
          stars: 4,
          nature: "adamant",
          ability: "blaze",
          affection: 96,
          iv: { hp: 31, atk: 31, def: 30, spa: 31, spd: 29, spe: 31 },
        },
      ],
      nextId: 26,
    },
  });
  ensureLegacy(state);
  state.meta.legacy.essence = 2000;
  assert(buyPerk(state, "natalBond").ok === true, "ML-3 buy natalBond");
  assert(buyPerk(state, "starterMon").ok === true, "ML-3 buy starterMon");
  for (let i = 0; i < 5; i += 1) {
    assert(buyPerk(state, "swiftHatch").ok === true, `ML-3 buy swiftHatch ${i + 1}`);
    assert(buyPerk(state, "expeditionMaster").ok === true, `ML-3 buy expeditionMaster ${i + 1}`);
  }
  assert(Math.abs(legacyBreedTimeMul(state) - 0.4) < 1e-9, "swiftHatch max -60% breed time");
  assert(legacyHatchAffectionAdd(state) === 30, "swiftHatch max +30 initial affection");
  assert(Math.abs(legacyExpeditionTimeMul(state) - 0.6) < 1e-9, "expeditionMaster max -40% time");
  assert(Math.abs(legacyExpeditionRewardMul(state) - 1.75) < 1e-9, "expeditionMaster max +75% reward");

  setNatalBondMonId(state, 25);
  assert(busyMonIds(state).has(25), "natalBond mon protected in busyMonIds");

  const res = confirmPrestige(state, {
    addLog: () => {},
    starterMonFactory: () => ({ id: 1, pid: "p025", dex: 25, name: "轮回赠礼兽", lvl: 5 }),
  });
  assert(res.ok === true, "ML-3 confirmPrestige with natalBond + starterMon");
  assert(state.mons.list.length === 2, "ML-3 keeps 1 natal pet + 1 starter gift pet");
  const carried = state.mons.list.find((m) => m.pid === "p150");
  const gift = state.mons.list.find((m) => m.pid === "p025");
  assert(Boolean(carried) && Boolean(gift) && carried.id !== gift.id, "ML-3 distinct ids for natal + gift");
  assert(carried.lvl === 1 && carried.exp === 0, "ML-3 natal pet reset to Lv.1 exp 0");
  assert(carried.isShiny === true && carried.stars === 4 && carried.iv?.atk === 31 && carried.affection === 96,
    "ML-3 natal pet preserves shiny/stars/IV/affection");
  assert(state.meta.natalBondMonId === carried.id, "ML-3 natalBondMonId rebound to carried pet id");

  // 闪光殿堂 6 席展柜 + 六席共鸣
  for (let i = 1; i <= 7; i += 1) {
    noteShinySpecies(
      state,
      { id: `p00${i}`, dex: i, name: `星芒兽${i}`, tier: i <= 2 ? "epic" : i <= 4 ? "rare" : "uncommon" },
      { silent: true }
    );
  }
  assert(computeShinyShowcaseAura(state).prodMul === 1, "empty showcase → 1.0x aura");
  const t1 = toggleShinyShowcasePid(state, "p001");
  assert(t1.ok && t1.action === "added", "toggle add shiny showcase");
  assert(computeShinyShowcaseAura(state).prodMul > 1.09, "1 epic shiny showcase boosts prod > +9%");
  const af = autofillShinyShowcase(state);
  assert(af.ok && af.pids.length === SHINY_SHOWCASE_MAX, "autofill fills 6 pedestals");
  const fullAura = computeShinyShowcaseAura(state);
  assert(fullAura.fullResonance === true, "6/6 shiny pedestals trigger full resonance");
  assert(fullAura.prodAdd > 0.5 && fullAura.trainExpAdd > 0.7 && fullAura.catchAdd > 0.1,
    "6/6 shiny showcase grants prod + trainExp + catch auras");
  const overflow = toggleShinyShowcasePid(state, "p007");
  assert(overflow.ok === false && overflow.reason === "full", "7th shiny blocked when 6 pedestals full");
}

if (failed) {
  console.error(`rebirth-selfcheck: ${failed} failed`);
  process.exit(1);
}
console.log("rebirth-selfcheck: OK");
