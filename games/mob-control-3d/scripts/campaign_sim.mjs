// 主战役难度曲线：node scripts/campaign_sim.mjs [--to 60] [--json]
// 只算「玩家理论兵力 / 通关所需兵力」的相对曲线，用来找断层；不是真实胜率（假设见 lib/model.mjs 与 docs/BALANCE.md）。
import { loadTs, newHeadlessState } from './lib/load_ts.mjs';
import { ASSUME, applyRunProgress, bestLane, redCounts, strikes, trooper, volley } from './lib/model.mjs';

const args = process.argv.slice(2);
const TO = Number(args[args.indexOf('--to') + 1]) || 60;
const JSON_OUT = args.includes('--json');
const SEEDS = Array.from({ length: 16 }, (_, i) => 1009 + i * 7919);

const { S, L, C } = await loadTs({
  S: 'src/game/State.ts',
  L: 'src/levels/LevelData.ts',
  C: 'src/game/CombatTables.ts',
});

/** 两档参考玩家：裸装（只有局内成长）；养成（局外全军攻击 / 基础射速按关卡慢慢升到 20 级）。 */
const PROFILES = {
  bare: () => 0,
  meta: (stage) => Math.min(20, Math.floor(stage * 0.4)),
};

function stageRow(stage, profile) {
  const state = newHeadlessState(S);
  const lv = PROFILES[profile](stage);
  state.metaLevels = { meta_attack: lv, meta_firerate: lv };
  const T = ASSUME.battleSec;
  const levels = SEEDS.map((seed) => L.generateDynamicLevel(stage, seed));
  const ref = levels[0];
  applyRunProgress(state, stage, {
    sec: T,
    kills: (s) => {
      const r = redCounts(L.generateDynamicLevel(s, SEEDS[0]), s, T);
      return r.normal + r.baneling + r.brute + r.shaman;
    },
  });

  // 供给：默认主炮每秒兵力流，过门后的平均流量（16 个随机种子各取最优直线航道再平均）
  const v = volley(state, 'gatling', S);
  const shots = state.getFireRatePerSec();
  const crit = state.getChargedCritChance();
  const flowIn = shots * v.straight;
  let flow = 0;
  let dmgMult = 0;
  let hpMult = 0;
  for (const level of levels) {
    const lane = bestLane(state, level, flowIn);
    flow += lane.flow / levels.length;
    dmgMult += lane.dmgMult / levels.length;
    hpMult += lane.hpMult / levels.length;
  }
  const n = trooper(state, C, 'normal');
  const c = trooper(state, C, 'charged');
  const unit = {
    hp: (n.hp * (1 - crit) + c.hp * crit) * hpMult,
    dmg: (n.dmg * (1 - crit) + c.dmg * crit) * dmgMult,
    dr: n.dr,
  };

  // 需求：换掉一局敌人 + 拆掉敌塔（含副塔）要多少只波波
  const reds = redCounts(ref, stage, T);
  let need = reds.baneling * ASSUME.banelingTrade;
  for (const kind of ['normal', 'brute', 'shaman']) {
    const r = C.computeRedUnitStats(kind, stage);
    need += (reds[kind] * r.maxHp) / (unit.dmg * strikes(unit.hp, unit.dr, r.dmg));
  }
  const armyNeed = need;
  const towerHp = ref.bossMaxHp + (ref.bossSubTowers || []).reduce((a, t) => a + t.hp, 0);
  const bossNeed = towerHp / (unit.dmg * 0.25 * state.getSiegeDamageMultiplier() * ASSUME.bossHitsPerUnit);
  const have = flow * T;
  return {
    stage,
    kind: ref.isMegaBoss ? '大Boss' : ref.isMiniBoss ? '小Boss' : ref.isMilestoneBoss ? '决战' : '普通',
    have,
    armyNeed,
    bossNeed,
    ratio: have / (armyNeed + bossNeed),
    bossMaxHp: ref.bossMaxHp,
    burstPerSec: ref.enemyBurstCount / ref.enemySpawnInterval,
    shots,
    pwr: state.getPowerMultiplier(),
    gate: flow / flowIn,
  };
}

/**
 * 断层判定（比值 = 供给 / 需求，越小越难）：
 *   1) 普通关之间（两头都不是逢 5 / 逢 10）的相邻变化超出 0.78～1.15；
 *   2) Boss 关的尖峰深度 = 本关比值 / 前后两关的几何平均，低于 0.70；
 *   3) 坡度折点：前 5 步与后 5 步普通关的平均每关变化相差超过 0.08。
 */
export function findBreaks(rows) {
  const out = [];
  const isBoss = (r) => r.stage % 5 === 0;
  const normal = rows.filter((r) => !isBoss(r));
  const steps = [];
  for (let i = 1; i < normal.length; i++) {
    const gap = normal[i].stage - normal[i - 1].stage;
    const step = Math.pow(normal[i].ratio / normal[i - 1].ratio, 1 / gap);
    steps.push({ to: normal[i].stage, step });
    if (step < 0.78 || step > 1.15) out.push(`普通 ${normal[i - 1].stage}→${normal[i].stage} 每关 ×${step.toFixed(2)}`);
  }
  for (let i = 1; i < rows.length - 1; i++) {
    if (!isBoss(rows[i])) continue;
    const depth = rows[i].ratio / Math.sqrt(rows[i - 1].ratio * rows[i + 1].ratio);
    if (depth < 0.7) out.push(`Boss ${rows[i].stage} 尖峰深度 ${depth.toFixed(2)}`);
  }
  const avg = (a) => a.reduce((x, y) => x + y.step, 0) / a.length;
  let worst = null;
  for (let i = 5; i + 5 <= steps.length; i++) {
    const diff = avg(steps.slice(i, i + 5)) - avg(steps.slice(i - 5, i));
    if (!worst || Math.abs(diff) > Math.abs(worst.diff)) worst = { at: steps[i].to, diff };
  }
  if (worst && Math.abs(worst.diff) > 0.08) out.push(`坡度折点 ${worst.at} 关附近，每关变化差 ${worst.diff.toFixed(2)}`);
  return out;
}

const result = {};
for (const profile of Object.keys(PROFILES)) {
  const rows = [];
  for (let s = 1; s <= TO; s++) rows.push(stageRow(s, profile));
  result[profile] = { rows, breaks: findBreaks(rows) };
}

if (JSON_OUT) {
  console.log(JSON.stringify(result));
} else {
  for (const [profile, { rows, breaks }] of Object.entries(result)) {
    console.log(`\n== ${profile === 'bare' ? '裸装（只有局内成长）' : '养成（局外攻击 / 射速 0.4 级每关，封顶 20）'} ==`);
    console.log('关\t类型\t理论兵力\t换敌需求\t拆塔需求\t比值\t相邻变化\t敌塔血\t敌兵/秒\t战力\t炮/秒\t过门×');
    rows.forEach((r, i) => {
      const step = i ? (r.ratio / rows[i - 1].ratio).toFixed(2) : '';
      console.log(
        [r.stage, r.kind, r.have.toFixed(0), r.armyNeed.toFixed(0), r.bossNeed.toFixed(0), r.ratio.toFixed(3), step, r.bossMaxHp, r.burstPerSec.toFixed(1), r.pwr.toFixed(2), r.shots.toFixed(2), r.gate.toFixed(2)].join('\t')
      );
    });
    console.log(`断层 ${breaks.length} 处：` + breaks.join('；'));
  }
}
