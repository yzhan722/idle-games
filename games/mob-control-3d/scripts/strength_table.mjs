// 强度对比表：node scripts/strength_table.mjs [--json]
// 直接读 src 里的真实数值（State getter、CombatTables），假设集中在 lib/model.mjs；算的是理论输出，不是真实胜率。
import { loadTs, newHeadlessState } from './lib/load_ts.mjs';
import { ASSUME, applyRunProgress, passGates, redCounts, strikes, trooper, volley } from './lib/model.mjs';

const { S, L, C } = await loadTs({
  S: 'src/game/State.ts',
  L: 'src/levels/LevelData.ts',
  C: 'src/game/CombatTables.ts',
});

const PHASES = [
  { id: 'early', name: '前期（第 3 关）', stage: 3 },
  { id: 'mid', name: '中期（第 12 关）', stage: 12 },
  { id: 'late', name: '后期（第 25 关）', stage: 25 },
];

function freshState(stage) {
  const st = newHeadlessState(S);
  applyRunProgress(st, stage, {
    sec: ASSUME.battleSec,
    kills: (s) => {
      const r = redCounts(L.generateDynamicLevel(s, 1009), s, ASSUME.battleSec);
      return r.normal + r.baneling + r.brute + r.shaman;
    },
  });
  return st;
}

/** 理论每秒输出：波波兵近战总伤害 + 自动技能伤害；另给每秒出兵与过门后流量。 */
function output(st, weaponId, phase, opt = {}) {
  st.weapon = weaponId;
  const red = C.computeRedUnitStats('normal', phase.stage);
  const aoe = ASSUME.aoeTargets[phase.id];
  const pwr = st.getPowerMultiplier();
  const shots = st.getFireRatePerSec();
  const v = volley(st, weaponId, S);
  const spec = S.WEAPON_SPECS[weaponId];
  const crit = Math.min(1, st.getChargedCritChance() + (spec.chargedBonus ?? 0));

  const straight = passGates(st, ASSUME.refGates, shots * v.straight);
  const side = passGates(st, ASSUME.refGates, shots * v.side);
  const mini = passGates(st, ASSUME.refGates, shots * v.miniGiant);
  const flow = straight.flow + side.flow * ASSUME.scatterSideEff + shots * v.side * (1 - ASSUME.scatterSideEff);

  const perUnit = (kind, g) => {
    const t = trooper(st, C, kind);
    const hp = t.hp * g.hpMult;
    const dmg = t.dmg * g.dmgMult;
    let perStrike = dmg;
    // 喵喵族 T2：高能兵 50% 触发 r+1 道电弧
    const chain = st.getSkillNodeRank('plasma_t2');
    if (chain > 0 && kind !== 'normal') perStrike += dmg * 0.5 * Math.min(chain + 1, aoe) * C.CHAIN_ARC_DMG_RATIO(chain);
    // 布丁族顺劈
    const giant = st.getGiantTrooperSpec();
    if (giant.isGiantMode && st.getSkillNodeRank('titan_t3') > 0) perStrike += dmg * giant.cleaveRatio * (aoe - 1);
    let total = perStrike * strikes(hp, t.dr, red.dmg);
    // 波波族 T3：退场自爆（半径 2.15，只算范围技能的六成目标）
    total += dmg * st.getSwarmTrooperSpec().kamikazeDmgRatio * aoe * 0.6;
    return total;
  };
  let dps = flow * (perUnit('normal', straight) * (1 - crit) + perUnit('charged', straight) * crit);
  if (v.miniGiant) dps += mini.flow * perUnit('miniGiant', mini);
  // 集群加速：场上 45 只时的攻速
  const s2 = st.getSkillNodeRank('swarm_t2');
  if (s2 > 0) dps *= 1 + Math.min(s2 * 0.1, 3 * s2 * 0.02);

  let auto = 0;
  if (v.beamPerShot) auto += shots * v.beamPerShot * C.RAINBOW_BEAM_DMG * pwr * aoe;
  const A = C.RACE_AUTO_SKILLS;
  const r = (id) => st.getSkillNodeRank(id);
  if (r('gate_t3') > 0) {
    const g = A.gatePulse(r('gate_t3'));
    const blueGates = opt.blueGates ?? 4;
    auto += (g.dmg * pwr * Math.min(aoe, 3) * blueGates) / g.intervalSec;
    dps += ((g.clonesPerGate * blueGates) / g.intervalSec) * perUnit(r('gate_t4') > 0 ? 'charged' : 'normal', { hpMult: 1, dmgMult: 1 });
  }
  if (r('plasma_t3') > 0) {
    const t = A.plasmaThunder(r('plasma_t3'));
    auto += (t.dmg * pwr * (1 + 0.4 * Math.min(2, aoe - 1))) / t.intervalSec;
  }
  if (r('plasma_t4') > 0) auto += (shots / 15) * 54 * pwr * aoe * 2;
  if (r('orbital_t1') > 0) {
    const t4 = r('orbital_t4') > 0;
    const t = A.orbitalStarfall(r('orbital_t1'), t4);
    auto += (t.dmg * pwr * aoe * (t4 ? 2 : 1)) / t.intervalSec;
  }
  if (r('bastion_t2') > 0) {
    const t = A.bastionTurret(r('bastion_t2'));
    auto += (t.dmg * pwr * 2) / t.intervalSec;
  }
  if (r('bastion_t3') > 0) {
    const every = Math.max(7, 13 - r('bastion_t3') * 2);
    const g = passGates(st, ASSUME.refGates, shots / every);
    dps += g.flow * perUnit('miniGiant', { hpMult: 1.35 + r('bastion_t3') * 0.2, dmgMult: 1.2 + r('bastion_t3') * 0.12 });
  }
  if (r('bastion_t4') > 0) {
    const g = passGates(st, ASSUME.refGates, 4 / 9.5);
    dps += g.flow * perUnit('charged', g);
  }
  if (r('swarm_t4') > 0) {
    const g = passGates(st, ASSUME.refGates, A.swarmBrood.count / A.swarmBrood.intervalSec);
    dps += g.flow * perUnit('charged', g);
  }
  return { shots, spawnPerSec: shots * (v.straight + v.side + v.miniGiant), flow, dps, auto, total: dps + auto };
}

const pct = (x) => `${Math.round(x * 100)}%`;

function weaponTable() {
  const rows = [];
  for (const id of S.WEAPON_ORDER) {
    const spec = S.WEAPON_SPECS[id];
    const row = { id, name: spec.name, fireRateMult: spec.fireRateMult, baseVolley: id === 'scatter' ? 3 : spec.baseVolley ?? 1, chargedBonus: spec.chargedBonus ?? 0 };
    for (const ph of PHASES) {
      const st = freshState(ph.stage);
      const base = output(st, 'gatling', ph).total;
      const o = output(st, id, ph);
      row[ph.id] = o.total / base;
      row[`${ph.id}Spawn`] = o.spawnPerSec;
    }
    rows.push(row);
  }
  return rows;
}

const RACE_STEPS = [
  { name: 'T1 满（3 点）', ranks: [3, 0, 0, 0], phase: 0 },
  { name: 'T1+T2 满（6 点）', ranks: [3, 3, 0, 0], phase: 1 },
  { name: 'T1~T3 满（12 点）', ranks: [3, 3, 3, 0], phase: 2 },
  { name: '全满（16 点）', ranks: [3, 3, 3, 1], phase: 2 },
];

function raceTable() {
  const rows = [];
  for (const b of S.SKILL_TREE_BRANCHES) {
    const row = { id: b.id, name: b.name };
    for (const step of RACE_STEPS) {
      const ph = PHASES[step.phase];
      const base = output(freshState(ph.stage), 'gatling', ph).total;
      const st = freshState(ph.stage);
      st.selectedRaceId = b.id;
      st.skillNodes = {};
      step.ranks.forEach((r, i) => {
        if (r > 0) st.skillNodes[`${b.id}_t${i + 1}`] = r;
      });
      if (b.id === 'tycoon') st.gold = 5000;
      row[step.name] = output(st, 'gatling', ph).total / base;
    }
    rows.push(row);
  }
  return rows;
}

function cannonModTable() {
  const rows = [];
  for (const id of S.CANNON_CORE_MOD_ORDER) {
    const spec = S.CANNON_CORE_MODS[id];
    for (const lvl of [1, 3, 5]) {
      const st = freshState(12);
      st.activeCannonMod = id;
      st.cannonModLevels = { overdrive_breech: 0, prism_splitter: 0, heavy_mortar: 0 };
      const ph = PHASES[1];
      const base = output(st, 'gatling', ph).total;
      st.cannonModLevels[id] = lvl;
      const m = st.getCannonModCombatSpec(id);
      const o = output(st, 'gatling', ph);
      const red = C.computeRedUnitStats('normal', ph.stage);
      const unitDmg = (kind, hpMul, dmgMul) => {
        const t = trooper(st, C, kind);
        return t.dmg * dmgMul * strikes(t.hp * hpMul, t.dr, red.dmg);
      };
      let extra = 0;
      const shots = st.getFireRatePerSec();
      if (m.overdriveEveryShots) {
        const g = passGates(st, ASSUME.refGates, (shots / m.overdriveEveryShots) * 2);
        const g2 = passGates(st, ASSUME.refGates, (shots / m.overdriveEveryShots) * m.overdriveExtraBursts);
        extra = g.flow * unitDmg('normal', 1, 1) + g2.flow * unitDmg('charged', 1, 1);
      } else if (m.prismEveryShots) {
        const g = passGates(st, ASSUME.refGates, (shots / m.prismEveryShots) * m.prismSplitCount);
        extra = g.flow * unitDmg('charged', 1.12, m.prismDmgMult);
      } else if (m.mortarEveryShots) {
        const t = trooper(st, C, 'miniGiant');
        const g = passGates(st, ASSUME.refGates, shots / m.mortarEveryShots);
        extra = g.flow * unitDmg('miniGiant', m.mortarHpMult, 1.32);
        extra += (shots / m.mortarEveryShots) * t.dmg * 1.32 * m.mortarSiegeMult * 0.55 * ASSUME.aoeTargets.mid;
      }
      const medals = spec.medalCosts.slice(0, lvl).reduce((a, x) => a + x, 0);
      const gold = spec.goldCosts.slice(0, lvl).reduce((a, x) => a + x, 0);
      const gain = (o.total + extra) / base - 1;
      rows.push({ name: spec.name, lvl, gain, medals, gold, perMedal: gain / medals });
    }
  }
  return rows;
}

function tacticTable() {
  const rows = [];
  for (const id of S.TACTIC_CARD_ORDER) {
    const c = S.TACTIC_CARDS[id];
    const camp = S.TACTIC_CAMPAIGN_EFFECT_MULT;
    const isCount = c.category !== 'rush';
    const lobby = isCount ? c.value : c.value * Math.min(S.TACTIC_RUSH_MAX_SEC, c.durationSec);
    const campaign = isCount
      ? S.scaleTacticValue(c.value, camp, true)
      : S.scaleTacticValue(c.value, camp, false) * Math.min(S.TACTIC_RUSH_MAX_SEC, c.durationSec);
    rows.push({
      id,
      name: c.name,
      family: S.TACTIC_CATEGORY_LABEL[c.category],
      trigger: S.TACTIC_TRIGGER_LABEL[c.trigger],
      lobby,
      campaign,
      unit: c.category === 'rush' ? '秒（省下的行进时间）' : c.category === 'shield' ? '个护盾' : '只波波',
      cost: `${c.cost} ${S.TACTIC_CURRENCY_LABEL[c.currency]}`,
      /** 占 16 只起步小队的比例（冲锋卡按一局 60 秒赛道折算）。 */
      share: c.category === 'rush' ? lobby / 60 : lobby / 16,
    });
  }
  return rows;
}

const out = { weapons: weaponTable(), races: raceTable(), cannonMods: cannonModTable(), tactics: tacticTable() };
if (process.argv.includes('--json')) {
  console.log(JSON.stringify(out));
} else {
  console.log('### 炮台（默认无种族；速射连发炮 = 100%）\n');
  console.log('| 炮台 | 射速倍率 | 每炮出兵 | 高能概率 + | 前期 | 中期 | 后期 | 前期每秒出兵 |');
  console.log('| :-- | --: | --: | --: | --: | --: | --: | --: |');
  for (const r of out.weapons)
    console.log(`| ${r.name} | ${r.fireRateMult} | ${r.baseVolley} | ${pct(r.chargedBonus)} | ${pct(r.early)} | ${pct(r.mid)} | ${pct(r.late)} | ${r.earlySpawn.toFixed(2)} |`);
  console.log('\n### 种族（速射连发炮；无种族 = 100%）\n');
  console.log(`| 种族 | ${RACE_STEPS.map((s) => `${s.name}·${PHASES[s.phase].name}`).join(' | ')} |`);
  console.log(`| :-- | ${RACE_STEPS.map(() => '--:').join(' | ')} |`);
  for (const r of out.races) console.log(`| ${r.name} | ${RACE_STEPS.map((s) => pct(r[s.name])).join(' | ')} |`);
  console.log('\n### 炮芯改装（中期，速射连发炮，提升 = 相对不装）\n');
  console.log('| 改装 | 等级 | 提升 | 累计奖章 | 累计金币 | 每枚奖章 |');
  console.log('| :-- | --: | --: | --: | --: | --: |');
  for (const r of out.cannonMods)
    console.log(`| ${r.name} | ${r.lvl} | +${pct(r.gain)} | ${r.medals} | ${r.gold} | +${(r.perMedal * 100).toFixed(1)}% |`);
  console.log('\n### 战术卡\n');
  console.log('| 卡 | 类 | 触发 | 大厅模式 | 主战役 | 单位 | 价格 | 占比 |');
  console.log('| :-- | :-- | :-- | --: | --: | :-- | :-- | --: |');
  for (const r of out.tactics)
    console.log(`| ${r.name} | ${r.family} | ${r.trigger} | ${Number(r.lobby.toFixed(2))} | ${Number(r.campaign.toFixed(2))} | ${r.unit} | ${r.cost} | ${pct(r.share)} |`);
}
