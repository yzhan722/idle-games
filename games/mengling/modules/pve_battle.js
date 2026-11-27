// PvE 战斗模拟引擎 — 自动回合制
import { clamp } from "./utils.js";
import { getStarBonusMul } from "./stars.js";
import { getTypeMul, calcTypeMul, TYPE_KEYS } from "./type_chart.js";

export const PVE_MAX_ROUNDS = 500;

/**
 * 属性对关卡的适配分：进攻克制 + 防御抗性 − 防御弱点
 * @param {string[]} monTypes
 * @param {string|null} stageType
 */
export function typeMatchScore(monTypes, stageType) {
  const types = Array.isArray(monTypes) ? monTypes.filter((t) => typeof t === "string") : [];
  let se = false;
  let resist = false;
  let weak = false;
  if (stageType) {
    for (const t of types) {
      if (getTypeMul(t, stageType) > 1) se = true;
      const incoming = getTypeMul(stageType, t);
      if (incoming > 1) weak = true;
      else if (incoming > 0 && incoming < 1) resist = true;
      else if (incoming === 0) resist = true;
    }
  }
  let score = 0;
  if (se) score += 100;
  if (resist) score += 45;
  if (weak) score -= 70;
  if (se && resist) score += 35;
  if (se && weak) score -= 25; // 互克陷阱（如幻系关带幻系）
  return { se, resist, weak, score };
}

/** 推荐属性：优先「能打又抗」 */
export function recommendedTypes(stageType, limit = 3) {
  if (!stageType) return [];
  const n = Math.max(1, Math.min(6, Math.floor(limit) || 3));
  return TYPE_KEYS.map((t) => ({ t, ...typeMatchScore([t], stageType) }))
    .filter((x) => x.se)
    .sort((a, b) => b.score - a.score || a.t.localeCompare(b.t))
    .slice(0, n)
    .map((x) => x.t);
}

/**
 * 为敌人生成 stats（与玩家成长公式对等，使战斗有真实挑战性）
 */
function makeEnemyStats(enemy, stageType) {
  const lvl = clamp(enemy.lvl ?? 1, 1, 100);
  const tierBonus = enemy.stars >= 3 ? 42 : enemy.stars >= 2 ? 26 : enemy.stars >= 1 ? 12 : 0;
  const dexBase = enemy.dex ?? 1;
  const specialTypes = new Set(["fire", "water", "electric", "grass", "wind", "mystic", "light"]);
  const specialLean = specialTypes.has(stageType);
  const baseHp = 50 + (dexBase % 45) + tierBonus;
  const baseAtk = 45 + (dexBase % 40) + tierBonus;
  const baseSpa = 43 + ((dexBase * 7) % 42) + tierBonus;
  const baseDef = 40 + (dexBase % 35) + tierBonus;
  const baseSpd = 38 + ((dexBase * 5) % 36) + tierBonus;
  const baseSpe = 42 + (dexBase % 38) + tierBonus;
  const starMul = getStarBonusMul(enemy.stars ?? 0);
  const extraStatMul =
    typeof enemy.statMul === "number" && Number.isFinite(enemy.statMul) && enemy.statMul > 0 ? enemy.statMul : 1;
  // 略缓于旧版 0.035，减轻终盘血牛拖回合
  const lvlMul = (1 + (lvl - 1) * 0.032) * starMul * extraStatMul;
  return {
    hp: Math.max(1, Math.floor(baseHp * lvlMul)),
    atk: Math.max(1, Math.floor((baseAtk + (specialLean ? -3 : 5)) * lvlMul)),
    spa: Math.max(1, Math.floor((baseSpa + (specialLean ? 5 : -3)) * lvlMul)),
    def: Math.max(1, Math.floor((baseDef + (specialLean ? -2 : 3)) * lvlMul)),
    spd: Math.max(1, Math.floor((baseSpd + (specialLean ? 3 : -2)) * lvlMul)),
    spe: Math.max(1, Math.floor(baseSpe * lvlMul)),
  };
}

/** Sum of combat stats for stage enemies — used for PvE power hints. */
export function estimateStageEnemyPower(stage) {
  if (!stage || !Array.isArray(stage.enemies)) return 0;
  const stype = stage.type || "wind";
  return stage.enemies.reduce((sum, e) => {
    const s = makeEnemyStats(e, stype);
    return sum + s.hp + s.atk + s.def + s.spa + s.spd + s.spe;
  }, 0);
}

/** First-clear tutorial tuning for early stages. */
export function pveFightModifiers(stageId, cleared) {
  if (stageId === "1-1" && !cleared) {
    return { playerDamageMul: 1.35, incomingDamageMul: 0.82, enemyHpMul: 0.2 };
  }
  return { playerDamageMul: 1, incomingDamageMul: 1, enemyHpMul: 1 };
}

/**
 * 计算单次攻击伤害（物/特分路 + 关卡压迫 + 保底伤害避免磨皮假负）
 */
export function calcDamage(attacker, defender, stageType, opts = {}) {
  const isSpecial = (attacker.spa ?? 0) >= (attacker.atk ?? 0);
  const atkStat = Math.max(1, isSpecial ? (attacker.spa ?? attacker.atk ?? 1) : (attacker.atk ?? 1));
  const defStat = Math.max(1, isSpecial ? (defender.spd ?? defender.def ?? 1) : (defender.def ?? 1));
  const typeMul = calcTypeMul(attacker.types ?? [], defender.types ?? []);
  if (typeMul === 0) return { damage: 1, typeMul: 0, immune: true, pressureMul: 1, category: isSpecial ? "special" : "physical" };

  let pressureMul = 1;
  if (attacker.side === "enemy" && defender.side === "player" && stageType) {
    let weak = false;
    let resist = false;
    for (const t of defender.types ?? []) {
      const m = getTypeMul(stageType, t);
      if (m > 1) weak = true;
      else if (m < 1) resist = true;
    }
    pressureMul = weak ? 1.4 : resist ? 0.7 : 1;
  }

  const power = atkStat * 1.75;
  const raw = Math.floor((power * typeMul * pressureMul) / defStat * (0.85 + Math.random() * 0.3));
  // 保底：至少造成 atk/20 的推进伤害，但保留物/特分路差异（加法而非 max 抹平）
  const progress = Math.max(0, Math.floor(atkStat / 20));
  const playerDamageMul =
    attacker.side === "player" && typeof opts?.playerDamageMul === "number" && Number.isFinite(opts.playerDamageMul)
      ? Math.max(0, opts.playerDamageMul)
      : 1;
  let damage = Math.max(1, Math.floor((raw + progress) * playerDamageMul));
  if (
    defender.side === "player" &&
    typeof opts?.incomingDamageMul === "number" &&
    Number.isFinite(opts.incomingDamageMul)
  ) {
    damage = Math.max(1, Math.floor(damage * Math.max(0, opts.incomingDamageMul)));
  }

  let weatherOutMul = 1;
  let weatherInMul = 1;
  const wx = opts?.weatherAffix;
  if (wx && Array.isArray(wx.boostTypes) && wx.boostTypes.length > 0) {
    const atkMatches = (attacker.types ?? []).some((t) => wx.boostTypes.includes(t));
    if (atkMatches) {
      if (attacker.side === "player") {
        weatherOutMul = typeof wx.outMul === "number" && Number.isFinite(wx.outMul) ? wx.outMul : 1.28;
      } else if (attacker.side === "enemy") {
        weatherOutMul = typeof wx.enemyOutMul === "number" && Number.isFinite(wx.enemyOutMul) ? wx.enemyOutMul : 1.12;
      }
    }
    if (defender.side === "player" && (defender.types ?? []).some((t) => wx.boostTypes.includes(t))) {
      weatherInMul = typeof wx.inMul === "number" && Number.isFinite(wx.inMul) ? wx.inMul : 0.82;
    }
    if (weatherOutMul !== 1 || weatherInMul !== 1) {
      damage = Math.max(1, Math.floor(damage * weatherOutMul * weatherInMul));
    }
  }

  return {
    damage,
    typeMul,
    immune: false,
    pressureMul,
    weatherMul: Number((weatherOutMul * weatherInMul).toFixed(3)),
    category: isSpecial ? "special" : "physical",
  };
}

function sideHpPct(units) {
  const max = units.reduce((s, u) => s + (u.maxHp || 0), 0);
  const cur = units.reduce((s, u) => s + Math.max(0, u.hp || 0), 0);
  return max > 0 ? cur / max : 0;
}

/**
 * 模拟一场 PvE 战斗
 * @returns {{ win, stars, rounds, log, teamHpPct, superEffectiveHits, endReason, enemyHpPct }}
 */
export function simulateBattle(team, enemies, stageType, opts = {}) {
  const log = [];
  const playerDamageMul =
    typeof opts?.playerDamageMul === "number" && Number.isFinite(opts.playerDamageMul)
      ? Math.max(0, opts.playerDamageMul)
      : 1;
  const incomingDamageMul =
    typeof opts?.incomingDamageMul === "number" && Number.isFinite(opts.incomingDamageMul)
      ? Math.max(0, opts.incomingDamageMul)
      : 1;
  const enemyHpMul =
    typeof opts?.enemyHpMul === "number" && Number.isFinite(opts.enemyHpMul)
      ? Math.max(0.1, opts.enemyHpMul)
      : 1;
  const weatherAffix = opts?.weatherAffix && typeof opts.weatherAffix === "object" ? opts.weatherAffix : null;
  const dmgOpts = { playerDamageMul, incomingDamageMul, weatherAffix };

  const playerUnits = team.map((m, i) => ({
    side: "player",
    idx: i,
    name: m.name,
    types: Array.isArray(m.types) ? m.types : [],
    maxHp: m.stats.hp,
    hp: m.stats.hp,
    atk: m.stats.atk,
    spa: m.stats.spa ?? m.stats.atk,
    def: m.stats.def,
    spd: m.stats.spd ?? m.stats.def,
    spe: m.stats.spe,
  }));

  const enemyUnits = enemies.map((e, i) => {
    const s = makeEnemyStats(e, stageType);
    const eTypes =
      Array.isArray(e.types) && e.types.length
        ? e.types.filter((t) => typeof t === "string").slice(0, 2)
        : [stageType || "wind"];
    return {
      side: "enemy",
      idx: i,
      name: e.name || `敌人${i + 1}`,
      types: eTypes,
      maxHp: Math.max(1, Math.floor(s.hp * enemyHpMul)),
      hp: Math.max(1, Math.floor(s.hp * enemyHpMul)),
      atk: s.atk,
      spa: s.spa,
      def: s.def,
      spd: s.spd,
      spe: s.spe,
    };
  });

  let pIdx = 0;
  let eIdx = 0;
  let rounds = 0;
  const totalPlayerHp = playerUnits.reduce((s, u) => s + u.maxHp, 0);
  let superEffectiveHits = 0;

  if (!playerUnits.length) {
    return {
      win: false,
      stars: 0,
      rounds: 0,
      log: ["— 没有出战萌灵 —"],
      teamHpPct: 0,
      enemyHpPct: 1,
      superEffectiveHits: 0,
      endReason: "empty",
    };
  }

  log.push(`— 战斗开始 —`);
  if (weatherAffix?.name) {
    log.push(`— 天象场地：【${weatherAffix.name}】${weatherAffix.desc ? `（${weatherAffix.desc}）` : ""} —`);
  }
  log.push(`派出 ${playerUnits[pIdx].name}！`);
  log.push(`对手派出 ${enemyUnits[eIdx].name}！`);

  while (pIdx < playerUnits.length && eIdx < enemyUnits.length && rounds < PVE_MAX_ROUNDS) {
    rounds++;
    const p = playerUnits[pIdx];
    const e = enemyUnits[eIdx];

    if (p.hp <= 0) {
      pIdx++;
      if (pIdx < playerUnits.length) log.push(`派出 ${playerUnits[pIdx].name}！`);
      continue;
    }
    if (e.hp <= 0) {
      eIdx++;
      if (eIdx < enemyUnits.length) log.push(`对手派出 ${enemyUnits[eIdx].name}！`);
      continue;
    }

    const pFirst = p.spe >= e.spe;
    const first = pFirst ? p : e;
    const second = pFirst ? e : p;
    if (Math.max(p.spe, e.spe) >= Math.min(p.spe, e.spe) * 1.1) {
      log.push(`R${rounds}: ${first.name} 先手！`);
    }

    const hit1 = calcDamage(first, second, stageType, dmgOpts);
    second.hp = Math.max(0, second.hp - hit1.damage);
    if (first.side === "player" && hit1.typeMul > 1) superEffectiveHits += 1;
    const eff1 = hit1.immune ? "（无效）" : hit1.typeMul > 1 ? "（克制命中）" : hit1.typeMul < 1 ? "（收效甚微）" : "";
    log.push(`R${rounds}: ${first.name} → ${second.name} ${hit1.damage}伤害${eff1} (${second.hp}/${second.maxHp})`);

    if (second.hp <= 0) {
      log.push(`${second.name} 倒下了！`);
      if (second.side === "enemy") {
        eIdx++;
        if (eIdx < enemyUnits.length) log.push(`对手派出 ${enemyUnits[eIdx].name}！`);
      } else {
        pIdx++;
        if (pIdx < playerUnits.length) log.push(`派出 ${playerUnits[pIdx].name}！`);
      }
      continue;
    }

    const hit2 = calcDamage(second, first, stageType, dmgOpts);
    first.hp = Math.max(0, first.hp - hit2.damage);
    if (second.side === "player" && hit2.typeMul > 1) superEffectiveHits += 1;
    const eff2 = hit2.immune ? "（无效）" : hit2.typeMul > 1 ? "（克制命中）" : hit2.typeMul < 1 ? "（收效甚微）" : "";
    log.push(`R${rounds}: ${second.name} → ${first.name} ${hit2.damage}伤害${eff2} (${first.hp}/${first.maxHp})`);

    if (first.hp <= 0) {
      log.push(`${first.name} 倒下了！`);
      if (first.side === "enemy") {
        eIdx++;
        if (eIdx < enemyUnits.length) log.push(`对手派出 ${enemyUnits[eIdx].name}！`);
      } else {
        pIdx++;
        if (pIdx < playerUnits.length) log.push(`派出 ${playerUnits[pIdx].name}！`);
      }
    }
  }

  const remainingHp = playerUnits.reduce((s, u) => s + Math.max(0, u.hp), 0);
  const teamHpPct = totalPlayerHp > 0 ? remainingHp / totalPlayerHp : 0;
  const enemyHpPct = sideHpPct(enemyUnits);

  let win = eIdx >= enemyUnits.length;
  let endReason = win ? "clear" : pIdx >= playerUnits.length ? "wipe" : "ongoing";
  let stars = 0;

  if (!win && rounds >= PVE_MAX_ROUNDS && pIdx < playerUnits.length && eIdx < enemyUnits.length) {
    if (teamHpPct > enemyHpPct) {
      win = true;
      endReason = "decision";
      stars = 1;
      log.push(`— 超时判定：我方剩余生命更优（${Math.round(teamHpPct * 100)}% vs ${Math.round(enemyHpPct * 100)}%），险胜！—`);
    } else {
      endReason = "timeout";
      log.push(`— 超时判定：未能压过对手生命（${Math.round(teamHpPct * 100)}% vs ${Math.round(enemyHpPct * 100)}%）—`);
    }
  }

  if (win && endReason === "clear") {
    if (teamHpPct > 0.7) stars = 3;
    else if (teamHpPct > 0.3) stars = 2;
    else stars = 1;
  }

  if (win && endReason === "clear") log.push(`— 战斗胜利！（${stars}星）—`);
  else if (win && endReason === "decision") log.push(`— 战斗胜利！（判定 ${stars}星）—`);
  else log.push(`— 战斗失败 —`);

  return { win, stars, rounds, log, teamHpPct, enemyHpPct, superEffectiveHits, endReason, weatherAffix };
}

/**
 * ML-4 模拟一场 2v2 双打圣殿试炼战斗（主战 Primary + 协战 Partner 同场协同作战 + 元素合体连携技）
 */
export function simulateDualBattle(primaryMon, partnerMon, enemies, stageType, opts = {}) {
  const log = [];
  if (!primaryMon || !partnerMon || primaryMon.id === partnerMon.id) {
    return {
      win: false,
      stars: 0,
      rounds: 0,
      log: ["— 需编入 2 只不同的主战与协战萌灵方可开启双打试炼 —"],
      teamHpPct: 0,
      enemyHpPct: 1,
      superEffectiveHits: 0,
      comboHits: 0,
      synergy: null,
      endReason: "empty",
    };
  }

  const synergy =
    opts?.duoSynergy && typeof opts.duoSynergy === "object"
      ? opts.duoSynergy
      : {
          id: "tactical_duo",
          name: "双星协战",
          comboSkill: "双星夹击阵",
          resonant: false,
          outMul: 1.12,
          inMul: 0.95,
          speMul: 1.04,
          comboMul: 1.24,
          healPct: 0,
        };

  const basePlayerMul =
    typeof opts?.playerDamageMul === "number" && Number.isFinite(opts.playerDamageMul)
      ? Math.max(0, opts.playerDamageMul)
      : 1;
  const baseIncomingMul =
    typeof opts?.incomingDamageMul === "number" && Number.isFinite(opts.incomingDamageMul)
      ? Math.max(0, opts.incomingDamageMul)
      : 1;
  const enemyHpMul =
    typeof opts?.enemyHpMul === "number" && Number.isFinite(opts.enemyHpMul)
      ? Math.max(0.1, opts.enemyHpMul)
      : 1;

  const dmgOpts = {
    playerDamageMul: basePlayerMul * (synergy.outMul || 1),
    incomingDamageMul: baseIncomingMul * (synergy.inMul || 1),
    weatherAffix: opts?.weatherAffix || null,
  };

  const speScale = synergy.speMul || 1;
  const playerUnits = [primaryMon, partnerMon].map((m, i) => ({
    side: "player",
    role: i === 0 ? "主战" : "协战",
    idx: i,
    id: m.id,
    name: m.name,
    types: Array.isArray(m.types) ? m.types : [],
    maxHp: Math.max(1, m.stats?.hp ?? 50),
    hp: Math.max(1, m.stats?.hp ?? 50),
    atk: Math.max(1, m.stats?.atk ?? 20),
    spa: Math.max(1, m.stats?.spa ?? m.stats?.atk ?? 20),
    def: Math.max(1, m.stats?.def ?? 20),
    spd: Math.max(1, m.stats?.spd ?? m.stats?.def ?? 20),
    spe: Math.max(1, Math.floor((m.stats?.spe ?? 20) * speScale)),
  }));

  const enemyUnits = (Array.isArray(enemies) ? enemies : []).map((e, i) => {
    const s = makeEnemyStats(e, stageType);
    const eTypes =
      Array.isArray(e.types) && e.types.length
        ? e.types.filter((t) => typeof t === "string").slice(0, 2)
        : [stageType || "wind"];
    return {
      side: "enemy",
      idx: i,
      name: e.name || `守卫${i + 1}`,
      types: eTypes,
      maxHp: Math.max(1, Math.floor(s.hp * enemyHpMul)),
      hp: Math.max(1, Math.floor(s.hp * enemyHpMul)),
      atk: s.atk,
      spa: s.spa,
      def: s.def,
      spd: s.spd,
      spe: s.spe,
    };
  });

  if (!enemyUnits.length) {
    return {
      win: true,
      stars: 3,
      rounds: 0,
      log: ["— 圣殿无守卫，直接晋级 —"],
      teamHpPct: 1,
      enemyHpPct: 0,
      superEffectiveHits: 0,
      comboHits: 0,
      synergy,
      endReason: "clear",
    };
  }

  const totalPlayerHp = playerUnits.reduce((s, u) => s + u.maxHp, 0);
  let rounds = 0;
  let superEffectiveHits = 0;
  let comboHits = 0;

  log.push(`— 双打圣殿试炼开幕 —`);
  log.push(`我方双灵登场：【主战】${playerUnits[0].name} ＆ 【协战】${playerUnits[1].name}！`);
  log.push(`圣殿宗师派出：${enemyUnits.map((e) => e.name).join(" ＆ ")}！`);
  if (synergy?.name) {
    log.push(`✦ 双灵共鸣激活：【${synergy.name}】（连携技《${synergy.comboSkill}》· 伤害×${Number(synergy.outMul || 1).toFixed(2)}）`);
  }

  function pickTarget(actor, foes) {
    const alive = foes.filter((u) => u.hp > 0);
    if (!alive.length) return null;
    if (actor.side === "player") {
      return alive
        .slice()
        .sort((a, b) => calcTypeMul(actor.types, b.types) - calcTypeMul(actor.types, a.types) || a.hp - b.hp)[0];
    }
    return alive.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
  }

  const maxDualRounds = Math.min(PVE_MAX_ROUNDS, 200);
  while (
    playerUnits.some((u) => u.hp > 0) &&
    enemyUnits.some((u) => u.hp > 0) &&
    rounds < maxDualRounds
  ) {
    rounds++;
    const order = [...playerUnits, ...enemyUnits]
      .filter((u) => u.hp > 0)
      .sort((a, b) => b.spe - a.spe || (a.side === "player" ? -1 : 1));

    for (const actor of order) {
      if (actor.hp <= 0) continue;
      const foes = actor.side === "player" ? enemyUnits : playerUnits;
      const target = pickTarget(actor, foes);
      if (!target) break;

      const hit = calcDamage(actor, target, stageType, dmgOpts);
      target.hp = Math.max(0, target.hp - hit.damage);
      if (actor.side === "player" && hit.typeMul > 1) superEffectiveHits += 1;
      const effTag = hit.immune ? "（无效）" : hit.typeMul > 1 ? "（克制命中）" : hit.typeMul < 1 ? "（收效甚微）" : "";
      log.push(`R${rounds}: ${actor.name} → ${target.name} ${hit.damage}伤害${effTag} (${target.hp}/${target.maxHp})`);
      if (target.hp <= 0) {
        log.push(`${target.name} 倒下了！`);
      }
    }

    // Linked Combo Skill: fires on Round 1 and every even round while BOTH Primary & Partner stand!
    const bothAlliesAlive = playerUnits[0].hp > 0 && playerUnits[1].hp > 0;
    const anyEnemyAlive = enemyUnits.some((u) => u.hp > 0);
    if (bothAlliesAlive && anyEnemyAlive && (rounds === 1 || rounds % 2 === 0)) {
      const comboTypes = Array.from(new Set([...playerUnits[0].types, ...playerUnits[1].types]));
      const comboAtk = Math.floor((Math.max(playerUnits[0].atk, playerUnits[0].spa) + Math.max(playerUnits[1].atk, playerUnits[1].spa)) * 0.58);
      const syntheticDuo = {
        side: "player",
        name: `${playerUnits[0].name}＆${playerUnits[1].name}`,
        types: comboTypes,
        atk: comboAtk,
        spa: comboAtk,
      };
      const focusEnemy = pickTarget(syntheticDuo, enemyUnits);
      if (focusEnemy) {
        const comboHit = calcDamage(syntheticDuo, focusEnemy, stageType, {
          ...dmgOpts,
          playerDamageMul: dmgOpts.playerDamageMul * (synergy.comboMul || 1.25),
        });
        focusEnemy.hp = Math.max(0, focusEnemy.hp - comboHit.damage);
        comboHits += 1;
        if (comboHit.typeMul > 1) superEffectiveHits += 1;
        const effTag = comboHit.typeMul > 1 ? "（克制命中）" : "";
        log.push(
          `✦ R${rounds} 合体连携技【${synergy.comboSkill}】→ ${focusEnemy.name} ${comboHit.damage}伤害${effTag} (${focusEnemy.hp}/${focusEnemy.maxHp})`,
        );
        if (focusEnemy.hp <= 0) {
          log.push(`${focusEnemy.name} 被连携技击溃倒下！`);
        }
      }
      if ((synergy.healPct || 0) > 0) {
        for (const u of playerUnits) {
          if (u.hp > 0 && u.hp < u.maxHp) {
            const heal = Math.max(1, Math.floor(u.maxHp * synergy.healPct));
            u.hp = Math.min(u.maxHp, u.hp + heal);
          }
        }
        log.push(`✦ 共鸣生机回复：${playerUnits[0].name}、${playerUnits[1].name} 生命恢复 ${Math.round(synergy.healPct * 100)}%！`);
      }
    }
  }

  const remainingHp = playerUnits.reduce((s, u) => s + Math.max(0, u.hp), 0);
  const teamHpPct = totalPlayerHp > 0 ? remainingHp / totalPlayerHp : 0;
  const enemyHpPct = sideHpPct(enemyUnits);
  const allEnemiesDown = enemyUnits.every((u) => u.hp <= 0);
  const allPlayersDown = playerUnits.every((u) => u.hp <= 0);

  let win = allEnemiesDown;
  let endReason = win ? "clear" : allPlayersDown ? "wipe" : "ongoing";
  let stars = 0;

  if (!win && rounds >= maxDualRounds && !allPlayersDown && !allEnemiesDown) {
    if (teamHpPct > enemyHpPct) {
      win = true;
      endReason = "decision";
      stars = 1;
      log.push(`— 超时判定：我方双灵剩余生命更优（${Math.round(teamHpPct * 100)}% vs ${Math.round(enemyHpPct * 100)}%），险胜！—`);
    } else {
      endReason = "timeout";
      log.push(`— 超时判定：未能压过圣殿宗师生命（${Math.round(teamHpPct * 100)}% vs ${Math.round(enemyHpPct * 100)}%）—`);
    }
  }

  if (win && endReason === "clear") {
    const bothStanding = playerUnits[0].hp > 0 && playerUnits[1].hp > 0;
    if (bothStanding && teamHpPct >= 0.65) stars = 3;
    else if (teamHpPct >= 0.3) stars = 2;
    else stars = 1;
    log.push(`— 双打试炼胜利！（${stars}星 · 连携发动 ${comboHits} 次）—`);
  } else if (win && endReason === "decision") {
    log.push(`— 双打试炼险胜！（判定 ${stars}星）—`);
  } else {
    log.push(`— 双打试炼惜败 —`);
  }

  return {
    win,
    stars,
    rounds,
    log,
    teamHpPct,
    enemyHpPct,
    superEffectiveHits,
    comboHits,
    synergy,
    endReason,
    isDualSanctum: true,
  };
}

