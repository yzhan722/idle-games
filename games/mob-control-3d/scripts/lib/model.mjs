// 强度表与战役模拟共用的简化模型。所有简化假设都写在这里，改假设就改这里。
// 它算的是「理论兵力」，不是真实胜率：没有走位、没有碰撞、没有地形与机关、没有大招。

export const ASSUME = {
  /** 参考战斗时长（秒）。主战役没有时间限制，这里只用来把每秒兵力换成一局兵力。 */
  battleSec: 45,
  /** 到达敌塔的一只波波平均能打几下（敌塔前有敌人出兵，活不久）。 */
  bossHitsPerUnit: 8,
  /** 散弹左右两发偏出主航道，过门效率按这个折算。 */
  scatterSideEff: 0.6,
  /** 我方每座 +N 门的生效上限：World3D applyGateEffect 里 addCooldown = 0.09 秒一次。 */
  addGateProcPerSec: 1 / 0.09,
  /** 参考过门路线（强度表用）：先 +2 门，再 ×2 门。 */
  refGates: [
    { op: 'add', value: 2 },
    { op: 'mul', value: 2 },
  ],
  /** 范围技能平均打到几个敌人（前期 / 中期 / 后期）。 */
  aoeTargets: { early: 3, mid: 4, late: 6 },
  /** 一只自爆虫平均换掉几只波波。 */
  banelingTrade: 1.5,
  /** 一关领一次三选一：期望层数（普通 1、稀有 2、史诗 3、传说 4，按 68/23/7/2%）。 */
  rewardStacks: 0.68 * 1 + 0.23 * 2 + 0.07 * 3 + 0.02 * 4,
  /** 三选一里至少出现一张输出向强化（战力 / 射速 / 高能 / 齐射）的概率：1 - C(5,3)/C(9,3)。 */
  offenseOfferRate: 1 - 10 / 84,
};

/** 我方一只普通 / 高能 / 小巨人的血量与攻击（走真实 getter）。 */
export function trooper(state, tables, kind) {
  const pwr = state.getPowerMultiplier();
  const swarm = state.getSwarmTrooperSpec();
  const bastion = state.getBastionTrooperSpec();
  const giant = state.getGiantTrooperSpec();
  const tech = state.getBoboTechCombatBonuses();
  if (giant.isGiantMode && kind !== 'miniGiant') {
    const t = tables.computeGiantTierStats(pwr, giant, giant.startFusionTier, kind === 'charged');
    return { hp: t.maxHp * tech.boboHpMult, dmg: t.dmg, dr: giant.dmgReduction };
  }
  const base = tables.BLUE_TROOPER_BASE[kind];
  const raceHp = (kind === 'miniGiant' ? 1 : swarm.hpMult) * bastion.trooperHpMult * tech.boboHpMult;
  const crit = kind === 'charged' ? 1 + state.getSkillNodeRank('plasma_t1') * 0.16 : 1;
  return {
    hp: base.maxHp * pwr * raceHp,
    dmg: base.dmg * pwr * (kind === 'miniGiant' ? 1 : swarm.dmgMult) * crit,
    dr: bastion.trooperDmgReduction,
  };
}

/** 每次开火的出兵构成：{ straight, side, miniGiant, beam }（单位：只 / 炮）。 */
export function volley(state, weaponId, stateModule) {
  const spec = stateModule.WEAPON_SPECS[weaponId];
  const extra = state.getExtraCloneChance();
  const pBonus = Math.min(1, extra);
  if (weaponId === 'scatter') {
    return { straight: 1 + pBonus, side: 2, miniGiant: 0, beamPerShot: 0 };
  }
  if (weaponId === 'rainbow') {
    return { straight: 0.75 * (1 + extra), side: 0, miniGiant: 0.25, beamPerShot: 0.25 };
  }
  return { straight: (spec.baseVolley ?? 1) + extra, side: 0, miniGiant: 0, beamPerShot: 0 };
}

/** 过门后的数量：输入每秒流量，返回 { flow, dmgMult, hpMult }。 */
export function passGates(state, gates, flowIn) {
  const g2 = state.getSkillNodeRank('gate_t2');
  const g3 = state.getSkillNodeRank('gate_t3');
  const g4 = state.getSkillNodeRank('gate_t4');
  const swarmExtra = state.getSwarmTrooperSpec().gateExtraCloneChance;
  const giant = state.getGiantTrooperSpec().isGiantMode;
  const cap = 6 + g2;
  let flow = flowIn;
  let dmgMult = 1;
  let hpMult = 1;
  for (const g of gates) {
    const p = g.cover ?? 1;
    if (g.op === 'add' || g.op === 'mul') {
      const raw = (g.op === 'add' ? g.value + state.getGateBonusAdd() : g.value - 1) + swarmExtra;
      const base = Math.min(cap, raw);
      const normal = giant ? Math.max(1, Math.min(3, Math.ceil(base * 0.6))) : base;
      const crit = Math.min(cap + 2, base * 2);
      const critN = giant ? Math.max(1, Math.min(3, Math.ceil(crit * 0.6))) : crit;
      const copies = g4 > 0 ? normal * 0.78 + critN * 0.22 : normal;
      const proc = g.op === 'add' ? Math.min(flow * p, ASSUME.addGateProcPerSec) : flow * p;
      flow += proc * copies;
      if (g3 > 0) {
        hpMult *= 1 + p * g3 * 0.16;
        dmgMult *= 1 + p * g3 * 0.1;
      }
    } else if (g.op === 'sub') {
      flow *= 1 - p;
    } else if (g.op === 'div') {
      flow *= 1 - p * (1 - 1 / Math.max(2, g.value));
    } else if (g.op === 'giant_jelly') {
      hpMult *= 1 + p;
      dmgMult *= 1 + p;
    }
  }
  return { flow, dmgMult, hpMult };
}

/** 一只波波在近战里能打几下（连续值）：蓝方先手，至少 1 下；向上取整的期望近似为 +0.5。 */
export const strikes = (hp, dr, redDmg) => Math.max(1, hp / Math.max(1e-6, redDmg * (1 - dr)) + 0.5);

/** 从关卡数据里挑一条理论收益最高的直线航道（忽略挡板、齿轮与地形）。 */
export function bestLane(state, level, flowIn) {
  const gates = [...level.gates].sort((a, b) => b.z - a.z);
  let best = null;
  for (let x = -9.5; x <= 9.5001; x += 0.5) {
    const lane = gates.map((g) => {
      const range = g.moveRangeX || 0;
      let hit = 0;
      for (let k = 0; k < 16; k++) {
        const cx = g.x + Math.sin((k / 16) * Math.PI * 2) * range;
        if (Math.abs(x - cx) <= g.width * 0.52) hit++;
      }
      return { op: g.op, value: g.value, cover: hit / 16 };
    });
    const r = passGates(state, lane, flowIn);
    const score = r.flow * r.dmgMult;
    if (!best || score > best.score) best = { ...r, score, x };
  }
  return best;
}

/** 一局（参考时长内）敌人的数量。 */
export function redCounts(level, stage, sec) {
  const bursts = Math.floor(sec / level.enemySpawnInterval);
  const total = bursts * level.enemyBurstCount;
  const bane = Math.min(0.16, 0.06 + (stage - 1) * 0.01);
  return {
    normal: total * (1 - bane),
    baneling: total * bane,
    brute: level.bruteSpawnInterval > 0 ? Math.floor((sec + 2) / level.bruteSpawnInterval) : 0,
    shaman: stage >= 2 ? Math.floor((sec + 2.5) / 12) : 0,
  };
}

/** 参考玩家打第 stage 关时的局内成长：战力 / 射速等级按池子买到买不起（本关算一半），强化按期望层数累加。 */
export function applyRunProgress(state, stage, perStage) {
  state.fireRateLevel = 1;
  state.powerLevel = 1;
  let timePool = 0;
  let killPool = 0;
  for (let s = 1; s <= stage; s++) {
    const part = s === stage ? 0.5 : 1;
    timePool += perStage.sec * part;
    killPool += perStage.kills(s) * part;
    while (timePool >= state.getFireRateCost()) {
      timePool -= state.getFireRateCost();
      state.fireRateLevel += 1;
    }
    while (killPool >= state.getPowerCost()) {
      killPool -= state.getPowerCost();
      state.powerLevel += 1;
    }
  }
  const each = ((stage - 1) * ASSUME.rewardStacks * ASSUME.offenseOfferRate) / 4;
  state.buffStacks = { hyper_gene: each, rapid_fire: each, plasma_crit: each, split_chamber: each };
}
