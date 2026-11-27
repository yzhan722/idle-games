/**
 * 组队副本：波次构成、小队编成、每一下伤害，以及「打完一波最少要多久 / 大约要多久」。
 *
 * - 前后端各有一份拷贝：backend/src/party_combat.ts 与 frontend/src/gameplay/partyCombat.ts，
 *   除了引用 combat_secondary / combatSecondary 的那一行，逐字相同（scripts/party-combat-parity.test.ts 会比对）。
 * - 画面上的战斗由前端按这里的公式演出；服务端不重打一遍，只用同一组公式算出时间下界和期望用时，
 *   早于下界的清波请求不结算（见 backend/src/party_run.ts）。
 * - 命中、闪避、抗性按期望值折进每一下伤害，演出里不单独出现「落空」。
 */
import { MISS_FULL, levelAccuracy, missBp, resistAgainst, resistMult, type DamageType, type SecondaryStats } from "./combatSecondary";

export const PARTY_RULES = {
  maxSize: 6,
  /** 演出每拍的间隔。 */
  tickMs: 60,
  /** 清波后到下一波出场的间隔。 */
  waveGapMs: 650,
  /** 团灭后重整的间隔。 */
  wipeResetMs: 2200,
  /** 普攻浮动：0.92 ～ 1.14，平均 1.03。 */
  rollMin: 0.92,
  rollSpan: 0.22,
  /** 队友（陪练与其他玩家在自己画面里的分身）的暴击与闪避。 */
  mateCritRatePct: 16,
  mateCritDmgPct: 165,
  mateEvasionPct: 9,
  /** 暴击率上限（含光环）。 */
  critCap: 0.85,
  /** 技能在组队战里的最短冷却。 */
  minCooldownMs: 1500,
  /** 首领护盾期间的受伤倍率（破盾技能无视）。 */
  shieldMult: 0.55,
} as const;

export type PartyMonster = {
  id: string;
  name?: string;
  level: number;
  hp: number;
  atk: number;
  def: number;
  xp: number;
  gold: number;
  icon?: string;
} & Partial<SecondaryStats> & { damageType?: DamageType };

export type PartyDungeon = { boss: PartyMonster; minions: PartyMonster[] };

export type PartyEnemyRole = "boss" | "guard" | "minion";

export type PartyEnemy = {
  role: PartyEnemyRole;
  monster: PartyMonster;
  level: number;
  hp: number;
  atk: number;
  def: number;
  xp: number;
  gold: number;
  castMs: number;
  intervalMs: number;
};

type Secondary = Partial<SecondaryStats> & { damageType?: DamageType };

export type PartyFighter = {
  isSelf: boolean;
  level: number;
  hp: number;
  atk: number;
  def: number;
  intervalMs: number;
  critRatePct: number;
  critDmgPct: number;
  evasionPct: number;
} & Secondary;

/** 出战技能里会造成伤害或给全队加攻的部分。 */
export type PartySkill = {
  damageMult: number;
  targetCount: number;
  cooldownMs: number;
  /** 等级带来的伤害倍率。 */
  levelMult: number;
  /** 全队光环：攻击、暴击率加成（百分比，未乘等级倍率）与持续时间。 */
  auraAtkPct?: number;
  auraCritPct?: number;
  auraMs?: number;
};

// ---------------------------------------------------------------------------
// 1. 副本与波次
// ---------------------------------------------------------------------------

const num = (v: unknown, fallback: number) => Number(v) || fallback;

export function isBossMonster(m: { id?: unknown; isBoss?: unknown } | null | undefined): boolean {
  return Boolean(m?.isBoss) || String(m?.id || "").endsWith("_boss");
}

function partyMonster(m: any, fallback: { level: number; hp: number; atk: number; def: number; xp: number; gold: number }): PartyMonster {
  return {
    id: m.id,
    name: m.name || m.id,
    level: num(m.level, fallback.level),
    hp: num(m.hp, fallback.hp),
    atk: num(m.atk, fallback.atk),
    def: num(m.def, fallback.def),
    xp: num(m.xp, fallback.xp),
    gold: num(m.gold, fallback.gold),
    icon: m.icon,
    accuracy: Number(m.accuracy || 0),
    evasion: Number(m.evasion || 0),
    physResist: Number(m.physResist || 0),
    elemResist: Number(m.elemResist || 0),
    damageType: m.damageType === "elemental" ? "elemental" : "physical",
  };
}

/** 一个关卡的副本：首领一只，其余都是小怪。关卡里没有怪时返回 undefined。 */
export function partyDungeonOf(stageMonsters: any[]): PartyDungeon | undefined {
  const list = stageMonsters.filter(Boolean);
  const boss = list.find(isBossMonster) || list[list.length - 1];
  if (!boss) return undefined;
  return {
    boss: partyMonster(boss, { level: 10, hp: 300, atk: 20, def: 8, xp: 80, gold: 50 }),
    minions: list
      .filter((m) => m.id !== boss.id)
      .map((m) => partyMonster(m, { level: 1, hp: 60, atk: 8, def: 2, xp: 14, gold: 8 })),
  };
}

/** 进副本的最低战斗等级：这个关卡里最容易打的那只怪的要求。 */
export function partyStageLevel(stageMonsterIds: string[], requiredLevelOf: (monsterId: string) => number): number {
  const levels = stageMonsterIds.map((id) => Math.max(1, requiredLevelOf(id)));
  return levels.length ? Math.min(...levels) : 1;
}

export function isBossWave(wave: number): boolean {
  return wave % 10 === 0;
}

/** Dynamically scale wave monster count with party size: 1p->2, 2p->3, 3p->4, 4p->5, 5-6p->6 */
export function getWaveMinionCount(partySize: number): number {
  const n = Math.max(1, partySize);
  return Math.max(2, Math.min(6, n <= 1 ? 2 : n + 1));
}

/** Dynamically scale Boss Elite Guards on Wave 10 with party size: 1-2p->0, 3-4p->1, 5-6p->2 */
export function getBossGuardCount(partySize: number): number {
  const n = Math.max(1, partySize);
  return n >= 5 ? 2 : n >= 3 ? 1 : 0;
}

/** 一波的敌人。第 10、20… 波是首领（3 人起带亲卫），其余是小怪；每 10 波一轮，逐轮变强。 */
export function partyWave(dungeon: PartyDungeon, wave: number, partySize: number): PartyEnemy[] {
  const cycleIndex = Math.floor((wave - 1) / 10);
  const waveScale = 1 + cycleIndex * 0.38 + ((wave - 1) % 10) * 0.045;
  const teamScale = 1 + Math.max(0, partySize - 1) * 0.42;
  const pool = dungeon.minions.length > 0 ? dungeon.minions : [dungeon.boss];

  if (isBossWave(wave)) {
    const b = dungeon.boss;
    const units: PartyEnemy[] = [
      {
        role: "boss",
        monster: b,
        level: b.level + cycleIndex * 3,
        hp: Math.max(420, Math.round(b.hp * waveScale * teamScale * 2.15)),
        atk: Math.max(18, Math.round(b.atk * (1.35 + cycleIndex * 0.28 + Math.max(0, partySize - 1) * 0.12))),
        def: Math.max(5, Math.round(b.def * (1.2 + cycleIndex * 0.18))),
        xp: Math.max(25, Math.round((b.xp || 80) * (1 + cycleIndex * 0.3))),
        gold: Math.max(15, Math.round((b.gold || 50) * (1 + cycleIndex * 0.3))),
        castMs: 900,
        intervalMs: 2300,
      },
    ];
    const guardCount = getBossGuardCount(partySize);
    for (let g = 0; g < guardCount; g++) {
      const gm = pool[(pool.length - 1 - g + pool.length) % pool.length];
      units.push({
        role: "guard",
        monster: gm,
        level: gm.level + cycleIndex * 2 + 1,
        hp: Math.max(120, Math.round(gm.hp * waveScale * (1.1 + partySize * 0.18))),
        atk: Math.max(8, Math.round(gm.atk * (1.1 + cycleIndex * 0.2))),
        def: Math.max(3, Math.round(gm.def * (1.1 + cycleIndex * 0.15))),
        xp: Math.max(10, Math.round((gm.xp || 16) * (1.2 + cycleIndex * 0.2))),
        gold: Math.max(5, Math.round((gm.gold || 10) * (1.2 + cycleIndex * 0.2))),
        castMs: 500 + g * 550,
        intervalMs: 2400 + g * 220,
      });
    }
    return units;
  }

  const waveOffset = (wave - 1) % 10;
  const units: PartyEnemy[] = [];
  for (let i = 0; i < getWaveMinionCount(partySize); i++) {
    const m = pool[(waveOffset + i) % pool.length];
    units.push({
      role: "minion",
      monster: m,
      level: m.level + cycleIndex * 2,
      hp: Math.max(40, Math.round(m.hp * waveScale * (0.85 + partySize * 0.16))),
      atk: Math.max(5, Math.round(m.atk * (0.95 + cycleIndex * 0.18 + Math.max(0, partySize - 2) * 0.05))),
      def: Math.max(1, Math.round(m.def * (1 + cycleIndex * 0.12))),
      xp: Math.max(5, Math.round((m.xp || 12) * (1 + cycleIndex * 0.2))),
      gold: Math.max(2, Math.round((m.gold || 6) * (1 + cycleIndex * 0.2))),
      castMs: (i * 480) % 2200,
      intervalMs: 2400 + (i % 3) * 240,
    });
  }
  return units;
}

// ---------------------------------------------------------------------------
// 2. 小队
// ---------------------------------------------------------------------------

/** 组队战专用的闪避、暴击（百分比），由技能等级与攻防推出。 */
export function squadRates(input: {
  attackLevel: number;
  intelligenceLevel: number;
  defenseLevel: number;
  atk: number;
  def: number;
  critRateBonusPct?: number;
  critDmgBonusPct?: number;
}): { evasionPct: number; critRatePct: number; critDmgPct: number } {
  return {
    evasionPct: Math.min(45, Math.round((6 + (input.defenseLevel - 1) * 0.32 + Math.floor(input.def / 24)) * 10) / 10),
    critRatePct: Math.min(
      65,
      Math.round((14 + (input.attackLevel - 1) * 0.25 + (input.intelligenceLevel - 1) * 0.15 + Math.floor(input.atk / 28) + (input.critRateBonusPct || 0)) * 10) / 10
    ),
    critDmgPct: Math.min(300, Math.round(160 + (input.attackLevel - 1) * 0.75 + Math.floor(input.atk / 14) + (input.critDmgBonusPct || 0))),
  };
}

/** 自己在组队战里的样子：面板数值加上下限。 */
export function squadSelf(
  sheet: { hp?: number; atk?: number; def?: number; intervalMs?: number; evasionPct?: number; critRatePct?: number; critDmgPct?: number } & Secondary,
  level: number
): PartyFighter {
  return {
    isSelf: true,
    level,
    hp: Math.max(60, sheet.hp || 100),
    atk: Math.max(10, sheet.atk || 14),
    def: Math.max(2, sheet.def || 4),
    intervalMs: Math.max(1200, Math.min(2600, sheet.intervalMs || 2000)),
    critRatePct: sheet.critRatePct ?? 18,
    critDmgPct: sheet.critDmgPct ?? 165,
    evasionPct: sheet.evasionPct ?? 8,
    accuracy: sheet.accuracy,
    evasion: sheet.evasion,
    physResist: sheet.physResist,
    elemResist: sheet.elemResist,
    damageType: sheet.damageType ?? "physical",
  };
}

/** 整支小队：自己在第 0 位，队友按队伍里的顺序排。队友数值由自己的面板与双方等级推出。 */
export function buildSquad(self: PartyFighter, mateLevels: ReadonlyArray<number | undefined>): PartyFighter[] {
  const mates = mateLevels.map((raw, i): PartyFighter => {
    const idx = i + 1;
    const lv = Math.max(self.level, Number(raw || 12));
    return {
      isSelf: false,
      level: lv,
      hp: Math.max(90, 70 + lv * 14, Math.round(self.hp * (0.88 + (idx % 3) * 0.12))),
      atk: Math.max(9, 8 + Math.round(lv * 2.4), Math.round(self.atk * (0.78 + (idx % 3) * 0.1))),
      def: Math.max(3, 2 + Math.round(lv * 0.85), Math.round(self.def * 0.85)),
      intervalMs: 1950 + (idx % 3) * 260,
      critRatePct: PARTY_RULES.mateCritRatePct,
      critDmgPct: PARTY_RULES.mateCritDmgPct,
      evasionPct: PARTY_RULES.mateEvasionPct,
      accuracy: levelAccuracy(lv),
      evasion: 0,
      physResist: 0,
      elemResist: 0,
      damageType: "physical",
    };
  });
  return [self, ...mates];
}

// ---------------------------------------------------------------------------
// 3. 每一下伤害（命中、闪避、抗性按期望值折算）
// ---------------------------------------------------------------------------

/** 普攻的期望倍率：命中率 × 抗性。 */
export function swingMult(attacker: Secondary, defender: Secondary): number {
  return (1 - missBp(attacker.accuracy, defender.evasion) / MISS_FULL) * skillMult(attacker, defender);
}

/** 技能、秘技必中，只吃抗性。 */
export function skillMult(attacker: Secondary, defender: Secondary): number {
  return resistMult(resistAgainst(attacker.damageType, defender));
}

export function allySwing(input: { atk: number; auraMult: number; roll: number; targetDef: number; critMult: number; shieldMult: number; mult: number }): number {
  return Math.max(4, Math.round((input.atk * input.auraMult * input.roll - input.targetDef * 0.25) * input.critMult * input.shieldMult * input.mult));
}

export function allySkillHit(input: { atk: number; auraMult: number; damageMult: number; levelMult: number; targetDef: number; shieldMult: number; mult: number }): number {
  return Math.max(6, Math.round((input.atk * input.auraMult * input.damageMult * input.levelMult - input.targetDef * 0.2) * input.shieldMult * input.mult));
}

export function enemySwing(input: { atk: number; roll: number; targetDef: number; mult: number }): number {
  return Math.max(2, Math.round((input.atk * input.roll - input.targetDef * 0.42) * input.mult));
}

// ---------------------------------------------------------------------------
// 4. 一波的时间：下界与期望
// ---------------------------------------------------------------------------

type Output = { damage: number; everyMs: number };

/** 每个出手来源对每只敌人的单次伤害（不超过那只敌人的血量）。 */
function outputs(
  enemies: ReadonlyArray<PartyEnemy>,
  squad: ReadonlyArray<PartyFighter>,
  skills: ReadonlyArray<PartySkill>,
  mode: "best" | "expected"
): { swings: Output[]; casts: Output[]; totalHp: number; bossHp: number; bossSwings: Output[]; bossCasts: Output[] } {
  const totalHp = enemies.reduce((sum, e) => sum + e.hp, 0);
  const best = mode === "best";
  // 光环：最乐观按一直在算，期望按覆盖率算
  const auraOf = (pick: (s: PartySkill) => number | undefined) =>
    Math.max(
      0,
      ...skills.map((s) => {
        const pct = Math.round(Number(pick(s) || 0) * s.levelMult);
        return best ? pct : pct * Math.min(1, Number(s.auraMs || 0) / Math.max(PARTY_RULES.minCooldownMs, s.cooldownMs));
      })
    );
  const aura = 1 + auraOf((s) => s.auraAtkPct) / 100;
  const auraCrit = auraOf((s) => s.auraCritPct) / 100;
  const roll = best ? PARTY_RULES.rollMin + PARTY_RULES.rollSpan : PARTY_RULES.rollMin + PARTY_RULES.rollSpan / 2;

  const swingOn = (f: PartyFighter, e: PartyEnemy) => {
    const critMult = best ? f.critDmgPct / 100 : 1 + Math.min(PARTY_RULES.critCap, f.critRatePct / 100 + auraCrit) * (f.critDmgPct / 100 - 1);
    return Math.min(e.hp, allySwing({ atk: f.atk, auraMult: aura, roll, targetDef: e.def, critMult, shieldMult: 1, mult: swingMult(f, e.monster) }));
  };
  const self = squad[0];
  const castOn = (s: PartySkill, e: PartyEnemy) =>
    Math.min(e.hp, allySkillHit({ atk: self.atk, auraMult: aura, damageMult: s.damageMult, levelMult: s.levelMult, targetDef: e.def, shieldMult: 1, mult: skillMult(self, e.monster) }));
  const top = (values: number[], count: number) => [...values].sort((a, b) => b - a).slice(0, count).reduce((sum, v) => sum + v, 0);

  const swings = squad.map((f) => {
    const hits = enemies.map((e) => swingOn(f, e));
    const damage = best ? Math.max(...hits) : enemies.reduce((sum, e, i) => sum + hits[i] * e.hp, 0) / totalHp;
    return { damage, everyMs: f.intervalMs };
  });
  const attacks = skills.filter((s) => s.damageMult > 0);
  const casts = attacks.map((s) => {
    const targets = Math.min(enemies.length, Math.max(1, s.targetCount));
    const hits = enemies.map((e) => castOn(s, e));
    const damage = best ? top(hits, targets) : (hits.reduce((sum, v) => sum + v, 0) / enemies.length) * targets;
    return { damage, everyMs: Math.max(PARTY_RULES.minCooldownMs, s.cooldownMs) };
  });
  const boss = enemies.find((e) => e.role === "boss");
  return {
    swings,
    casts,
    totalHp,
    bossHp: boss?.hp ?? 0,
    bossSwings: boss ? squad.map((f) => ({ damage: swingOn(f, boss), everyMs: f.intervalMs })) : [],
    bossCasts: boss ? attacks.map((s) => ({ damage: castOn(s, boss), everyMs: Math.max(PARTY_RULES.minCooldownMs, s.cooldownMs) })) : [],
  };
}

/** 从满读条、全技能就绪开始，打出 hp 点伤害至少要多久。 */
function fastestMs(hp: number, sources: Output[]): number {
  const dealt = (t: number) => sources.reduce((sum, s) => sum + s.damage * (1 + Math.floor(t / s.everyMs)), 0);
  if (hp <= 0 || dealt(0) >= hp) return 0;
  let high = 1000;
  while (dealt(high) < hp && high < 24 * 3600_000) high *= 2;
  let low = 0;
  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2);
    if (dealt(mid) >= hp) high = mid;
    else low = mid;
  }
  return high;
}

/**
 * 这一波最少要多久：读条全满、技能全就绪、每下都暴击且打满、没有一点伤害浪费、自己这边没人倒下。
 * 真打只会更慢；比这更快的清波请求不可能是真的。
 */
export function minWaveMs(enemies: ReadonlyArray<PartyEnemy>, squad: ReadonlyArray<PartyFighter>, skills: ReadonlyArray<PartySkill>): number {
  if (!enemies.length || !squad.length) return 0;
  const o = outputs(enemies, squad, skills, "best");
  return Math.max(fastestMs(o.totalHp, [...o.swings, ...o.casts]), o.bossHp ? fastestMs(o.bossHp, [...o.bossSwings, ...o.bossCasts]) : 0);
}

/** 这一波大约要多久（持续输出的期望值，不算倒下与换目标的耽搁，所以仍偏快）。 */
export function expectedWaveMs(enemies: ReadonlyArray<PartyEnemy>, squad: ReadonlyArray<PartyFighter>, skills: ReadonlyArray<PartySkill>): number {
  if (!enemies.length || !squad.length) return 0;
  const o = outputs(enemies, squad, skills, "expected");
  const rate = (list: Output[]) => list.reduce((sum, s) => sum + s.damage / s.everyMs, 0);
  const all = rate([...o.swings, ...o.casts]);
  const boss = rate([...o.bossSwings, ...o.bossCasts]);
  return Math.round(Math.max(all > 0 ? o.totalHp / all : 0, boss > 0 ? o.bossHp / boss : 0));
}

/** 这段时间里一个技能最多放几次。 */
export function maxCasts(cooldownMs: number, elapsedMs: number): number {
  return 1 + Math.floor(Math.max(0, elapsedMs) / Math.max(PARTY_RULES.minCooldownMs, cooldownMs));
}
