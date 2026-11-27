import type { EnhancedContentPack, EnhancedPlayerState } from "./types";
import { appendLog, getBuffEffects, getRareFindMultiplier } from "./storage";
import { abilityCastXp, abilityCooldownMsForLevel, abilityLevelMult, activeAbilitySlots, grantAbilityXp, ABILITY_BY_ID } from "./abilities";
import { ensureCombatSkills, grantCombatXp } from "./combat_skills";
import { currentCombatant, dropTableFor, playerBuildExtras, rareDropFor } from "./hp_combat";
import { HOUSE_XP_PER_LEVEL, houseLevelForSkill } from "./houses";
import { syncAchievements } from "./progression";
import { getPrestigeMultiplier, getReputationBonuses } from "./progression2";
import {
  PARTY_RULES,
  buildSquad,
  expectedWaveMs,
  isBossMonster,
  isBossWave,
  maxCasts,
  minWaveMs,
  partyDungeonOf,
  partyStageLevel,
  partyWave,
  squadRates,
  squadSelf,
  type PartyDungeon,
  type PartyFighter,
  type PartySkill,
} from "./party_combat";

/**
 * 组队副本的服务端裁判（WL-G2 / WL-G4）。
 *
 * 演出在客户端，能不能结算由服务端说了算：
 * - 每名玩家各有一份进度 `partyRun`，存在自己的存档里；编号是「队伍 + 活动开始时刻 + 关卡」，换一场就重开。
 * - 波次只能逐波推进；刚结算过的那一波重发，返回上次的结果，不再发奖；其余波次拒绝，并告诉客户端该打第几波。
 * - 早于最短可能时间（party_combat.minWaveMs，取最乐观情形）的请求拒绝。
 * - 再用「时间额度」管住长期速度：额度按真实时间攒（有上限，挂着不打攒不多），每清一波花掉期望用时的 paceFloor；
 *   额度跟着人走，重开一场、换一支队伍、团灭重整都不会重新给满。
 * - 被拒绝的请求只记数，不动进度；客户端按 retryAfterMs 等一下再报同一波即可，真打的玩家最多晚几秒。
 * - 技能释放次数按冷却与经过时间封顶；奖励由服务端按这一波真正的敌人结算。
 *
 * 掉线：进度停在没打完的那一波，重连后从这一波重新打起；离线多久都只够结算这一波，额度与技能次数不会因此变多。
 * 团灭：客户端调用 /party/wave-reset，回到第 1 波重新计时。
 */
export const PARTY_JUDGE = {
  /** 长期速度下限：平均每波至少要花期望用时的这个比例。演出平均用时约为期望的 1.0～1.3 倍（party-combat-parity.test.ts 守着）。 */
  paceFloor: 0.6,
  /** 时间额度的上限与起始值（毫秒）：给开场技能全就绪、偶尔手顺留余地。 */
  budgetCapMs: 30_000,
  /** 计算技能次数时，一波最多算多久：期望用时的倍数，且不少于 minCastWindowMs。 */
  castWindowFactor: 4,
  minCastWindowMs: 30_000,
  /** 一个技能一波最多算几次。 */
  maxCastsPerWave: 20,
} as const;

export type PartyWaveReply = {
  ok: true;
  wave: number;
  isBossWave: boolean;
  nextWave: number;
  xpGained: number;
  xpSplit: Record<string, number>;
  levelUps: Array<{ skill: string; level: number }>;
  abilityXpGained: Record<string, number>;
  abilityLevelUps: Array<{ id: string; name: string; level: number }>;
  combatLevel: number;
  goldGained: number;
  drops: Array<{ itemId: string; name: string; qty: number }>;
  /** 同一波重复上报：返回的是上次的结果，没有再发奖。 */
  duplicate?: boolean;
};

export type PartyRunState = {
  partyId: string;
  /** 活动开始时刻，与队伍、关卡一起当作这一轮的编号。 */
  startedAt: string;
  stageId: string;
  /** 该打第几波。 */
  nextWave: number;
  /** 第几次从第 1 波打起（团灭加一）。 */
  attempt: number;
  /** 当前这一波从什么时候开始计时（毫秒）。 */
  waveStartedAt: number;
  /** 这一波开始时的队伍人数，敌人按它来。 */
  size: number;
  /** 按开始时的小队算出的最短时间与期望用时：中途有人退出、装备变差，不会让这一波变得更难报。 */
  minMs: number;
  expectedMs?: number;
  budgetMs: number;
  last?: { wave: number; attempt: number; reply: PartyWaveReply };
  rejects?: Partial<Record<PartyRejectKind, number>>;
};

export type PartyRejectKind = "early" | "order" | "level";
export type PartyVerdict =
  | { kind: "ok" }
  | { kind: "duplicate"; reply: PartyWaveReply }
  | { kind: "order"; expectedWave: number }
  | { kind: "early"; expectedWave: number; retryAfterMs: number }
  | { kind: "level"; requiredLevel: number };

type PackMonster = Record<string, unknown> & { id: string };

function stageMonsters(pack: EnhancedContentPack, stageId: string): PackMonster[] {
  const stage = (pack.stages as Array<{ id: string; monsters?: string[] }>).find((s) => s.id === stageId);
  return (stage?.monsters ?? []).map((id) => (pack.monsters as unknown as PackMonster[]).find((m) => m.id === id)).filter((m): m is PackMonster => Boolean(m));
}

export function partyDungeonFor(pack: EnhancedContentPack, stageId: string): PartyDungeon | undefined {
  return partyDungeonOf(stageMonsters(pack, stageId));
}

/** 进这个副本要的战斗等级：与单人战斗同一张表（act_combat_* 的 skillLevel），取关卡里最低的一档。 */
export function partyRequiredLevel(pack: EnhancedContentPack, stageId: string): number {
  const need = new Map(
    (pack.actions as Array<{ id: string; requirements?: { skillLevel?: number } }>).map((a) => [a.id, Number(a.requirements?.skillLevel || 1)])
  );
  return partyStageLevel(stageMonsters(pack, stageId).map((m) => m.id), (id) => need.get(`act_combat_${id}`) ?? 1);
}

/** 自己在组队战里的样子，与前端角色面板同一套数值。 */
export function partySelf(player: EnhancedPlayerState, pack: EnhancedContentPack, now: Date): PartyFighter {
  const skills = ensureCombatSkills(player);
  const pc = currentCombatant(player, pack, now);
  const build = playerBuildExtras(player);
  const rates = squadRates({
    attackLevel: skills.attack.level,
    intelligenceLevel: skills.intelligence.level,
    defenseLevel: skills.defense.level,
    atk: pc.atk,
    def: pc.def,
    critRateBonusPct: build.critRateBonusPct,
    critDmgBonusPct: build.critDmgBonusPct,
  });
  return squadSelf({ ...pc, ...rates }, player.combatLevel || 1);
}

export function partySkills(player: EnhancedPlayerState): PartySkill[] {
  return activeAbilitySlots(player).map((slot) => {
    const def = ABILITY_BY_ID[slot.abilityId];
    const level = player.abilities?.[def.id]?.level || 1;
    return {
      damageMult: def.damageMult ?? 0,
      targetCount: def.targetCount ?? 1,
      cooldownMs: abilityCooldownMsForLevel(def, level),
      levelMult: abilityLevelMult(def, level),
      auraAtkPct: def.auraAtkPct,
      auraCritPct: def.auraCritPct,
      auraMs: def.auraDurationMs,
    };
  });
}

export type PartyContext = {
  partyId: string;
  startedAt: string;
  stageId: string;
  /** 这名玩家什么时候进的队：晚进队的从进队时刻开始计时。 */
  joinedAt?: string;
  /** 其余队员（真人与陪练）的等级，顺序与队伍一致。 */
  mateLevels: Array<number | undefined>;
};

function timing(player: EnhancedPlayerState, pack: EnhancedContentPack, ctx: PartyContext, wave: number, size: number, now: Date) {
  const dungeon = partyDungeonFor(pack, ctx.stageId);
  if (!dungeon) return { minMs: 0, expectedMs: 0 };
  const squad = buildSquad(partySelf(player, pack, now), ctx.mateLevels);
  const skills = partySkills(player);
  const enemies = partyWave(dungeon, wave, size);
  return { minMs: minWaveMs(enemies, squad, skills), expectedMs: expectedWaveMs(enemies, squad, skills) };
}

function beginWave(run: PartyRunState, player: EnhancedPlayerState, pack: EnhancedContentPack, ctx: PartyContext, wave: number, startedAtMs: number, now: Date) {
  run.nextWave = wave;
  run.waveStartedAt = startedAtMs;
  run.size = Math.min(PARTY_RULES.maxSize, 1 + ctx.mateLevels.length);
  const t = timing(player, pack, ctx, wave, run.size, now);
  run.minMs = t.minMs;
  run.expectedMs = t.expectedMs;
}

/**
 * 取这一轮的进度；没有或不是这一场的，从第 1 波重新开始。
 * 重开、换队都不会白得时间：额度剩多少带多少，这一波的起点不早于上一轮最后一次结算
 * （所以重开之后才落到存档的上一场请求，也领不到东西）。
 */
export function ensurePartyRun(player: EnhancedPlayerState, pack: EnhancedContentPack, ctx: PartyContext, now: Date): PartyRunState {
  const current = player.partyRun;
  if (current) {
    // 时钟往回拨过、或存档从走得快的机器搬来：起点不能在将来，否则会一直「太早」
    current.waveStartedAt = Math.min(current.waveStartedAt, now.getTime());
    if (current.partyId === ctx.partyId && current.startedAt === ctx.startedAt && current.stageId === ctx.stageId) return current;
  }
  const opened = Math.max(Date.parse(ctx.startedAt) || now.getTime(), Date.parse(ctx.joinedAt ?? "") || 0);
  const startedAtMs = Math.max(opened, current?.waveStartedAt ?? 0);
  const run: PartyRunState = {
    partyId: ctx.partyId,
    startedAt: ctx.startedAt,
    stageId: ctx.stageId,
    nextWave: 1,
    attempt: 1,
    waveStartedAt: startedAtMs,
    size: 1,
    minMs: 0,
    budgetMs: current ? Math.min(PARTY_JUDGE.budgetCapMs, current.budgetMs + startedAtMs - current.waveStartedAt) : PARTY_JUDGE.budgetCapMs,
  };
  beginWave(run, player, pack, ctx, 1, startedAtMs, now);
  player.partyRun = run;
  return run;
}

function note(run: PartyRunState, kind: PartyRejectKind) {
  run.rejects = { ...run.rejects, [kind]: (run.rejects?.[kind] ?? 0) + 1 };
}

/** 清这一波要花掉的时间额度：开打时与现在的小队，取快的那个。 */
function waveCost(run: PartyRunState, expectedMs: number): number {
  return Math.round(Math.min(run.expectedMs ?? Infinity, expectedMs) * PARTY_JUDGE.paceFloor);
}

/** 判一个清波请求。拒绝时只记数；通过时不改进度，由 settlePartyWave 推进。 */
export function judgeWaveClear(player: EnhancedPlayerState, pack: EnhancedContentPack, ctx: PartyContext, wave: number, now: Date): PartyVerdict {
  const run = ensurePartyRun(player, pack, ctx, now);
  const requiredLevel = partyRequiredLevel(pack, ctx.stageId);
  ensureCombatSkills(player);
  if ((player.combatLevel || 1) < requiredLevel) {
    note(run, "level");
    return { kind: "level", requiredLevel };
  }
  if (run.last && run.last.attempt === run.attempt && run.last.wave === wave && run.nextWave === wave + 1) {
    return { kind: "duplicate", reply: run.last.reply };
  }
  if (wave !== run.nextWave) {
    note(run, "order");
    return { kind: "order", expectedWave: run.nextWave };
  }
  const elapsed = Math.max(0, now.getTime() - run.waveStartedAt);
  const t = timing(player, pack, ctx, wave, run.size, now);
  const gap = wave > 1 ? PARTY_RULES.waveGapMs : 0;
  const earliest = Math.min(run.minMs, t.minMs) + gap;
  const cost = waveCost(run, t.expectedMs);
  const budget = Math.min(Math.max(PARTY_JUDGE.budgetCapMs, cost), run.budgetMs + elapsed);
  const wait = Math.max(earliest - elapsed, cost - budget);
  if (wait > 0) {
    note(run, "early");
    return { kind: "early", expectedWave: wave, retryAfterMs: Math.ceil(wait) };
  }
  return { kind: "ok" };
}

/** 客户端上报的技能次数：只认出战的技能，按冷却与经过时间封顶；没上报时按每个出战技能 1 次（首领波 2 次）算。 */
export function cappedCasts(
  player: EnhancedPlayerState,
  reported: Record<string, number> | undefined,
  opts: { elapsedMs: number; expectedMs: number; bossWave: boolean }
): Record<string, number> {
  const window = Math.min(opts.elapsedMs, Math.max(PARTY_JUDGE.minCastWindowMs, opts.expectedMs * PARTY_JUDGE.castWindowFactor));
  const hasReport = Boolean(reported && Object.keys(reported).length > 0);
  const out: Record<string, number> = {};
  for (const slot of activeAbilitySlots(player)) {
    const def = ABILITY_BY_ID[slot.abilityId];
    const asked = hasReport ? Number(reported![def.id] || 0) : opts.bossWave ? 2 : 1;
    const limit = maxCasts(abilityCooldownMsForLevel(def, player.abilities?.[def.id]?.level || 1), window);
    const count = Math.max(0, Math.min(PARTY_JUDGE.maxCastsPerWave, limit, Math.floor(asked)));
    if (count > 0) out[def.id] = count;
  }
  return out;
}

/** 结算一波（先过 judgeWaveClear）：按这一波真正的敌人发经验、金币、掉落、技能经验，然后推进到下一波。 */
export function settlePartyWave(
  player: EnhancedPlayerState,
  pack: EnhancedContentPack,
  ctx: PartyContext,
  wave: number,
  reportedCasts: Record<string, number> | undefined,
  now: Date,
  rng: () => number = Math.random
): PartyWaveReply {
  const run = ensurePartyRun(player, pack, ctx, now);
  const dungeon = partyDungeonFor(pack, ctx.stageId);
  if (!dungeon) throw new Error("副本不存在");
  const bossWave = isBossWave(wave);
  const enemies = partyWave(dungeon, wave, run.size);
  const elapsedMs = Math.max(0, now.getTime() - run.waveStartedAt);
  const expectedMs = timing(player, pack, ctx, wave, run.size, now).expectedMs;

  const stats = (player.stats = player.stats || ({} as NonNullable<EnhancedPlayerState["stats"]>));
  stats.killsByMonster = stats.killsByMonster || {};
  const buffEff = getBuffEffects(player, now);
  const repBuffs = getReputationBonuses(player, now);
  const prestigeMul = getPrestigeMultiplier(player);
  const trainingLevel = houseLevelForSkill(player, "skill_combat");
  const xpBonusMul = (1 + trainingLevel * HOUSE_XP_PER_LEVEL) * (buffEff.xpGain || 1) * repBuffs.xpGain * prestigeMul;
  const goldBonusMul = (buffEff.goldGain || 1) * repBuffs.goldGain * prestigeMul;
  const rareFind = getRareFindMultiplier(player, pack, now);
  const sizeBonus = 1 + Math.min(PARTY_RULES.maxSize - 1, Math.max(0, run.size - 1)) * 0.08;

  let totalXp = 0;
  let totalGold = 0;
  const drops = new Map<string, { itemId: string; name: string; qty: number }>();
  const give = (itemId: string, name: string, qty: number) => {
    player.inventory[itemId] = (player.inventory[itemId] || 0) + qty;
    drops.set(itemId, { itemId, name, qty: (drops.get(itemId)?.qty || 0) + qty });
  };
  for (const enemy of enemies) {
    const m = (pack.monsters as unknown as PackMonster[]).find((x) => x.id === enemy.monster.id);
    if (!m) continue;
    const boss = bossWave && enemy.role === "boss";
    const mult = (boss ? 2.2 : 0.75) * sizeBonus;
    totalXp += Math.max(2, Math.round(Number(m.xp || 10) * mult * xpBonusMul));
    totalGold += Math.max(1, Math.round(Number(m.gold || 5) * mult * goldBonusMul));
    stats.totalKills = (stats.totalKills || 0) + 1;
    stats.totalActions = (stats.totalActions || 0) + 1;
    stats.killsByMonster[m.id] = (stats.killsByMonster[m.id] || 0) + 1;
    if (isBossMonster(m)) stats.totalBossKills = (stats.totalBossKills || 0) + 1;
    for (const d of dropTableFor(pack, m)) if (rng() < Math.min(1, d.chance * rareFind)) give(d.itemId, d.name, d.qty);
    const rare = rareDropFor(pack, m);
    if (rare && rng() < Math.min(1, rare.chance * (boss ? 1.5 : 1) * rareFind)) give(rare.itemId, rare.name, 1);
  }

  player.inventory.gold = (player.inventory.gold || 0) + totalGold;
  stats.totalGoldEarned = (stats.totalGoldEarned || 0) + totalGold;
  stats.totalXpEarned = (stats.totalXpEarned || 0) + totalXp;
  const grant = grantCombatXp(player, totalXp, pack as any);

  const abilityXpGained: Record<string, number> = {};
  const abilityLevelUps: PartyWaveReply["abilityLevelUps"] = [];
  for (const [id, count] of Object.entries(cappedCasts(player, reportedCasts, { elapsedMs, expectedMs, bossWave }))) {
    const def = ABILITY_BY_ID[id];
    const xp = abilityCastXp(def, dungeon.boss.level) * count;
    const res = grantAbilityXp(player, id, xp);
    abilityXpGained[id] = xp;
    if (res.leveledTo) abilityLevelUps.push({ id, name: def.name, level: res.leveledTo });
  }

  syncAchievements(player);
  appendLog(
    player,
    bossWave
      ? `组队首领战第 ${wave} 波大捷！击败 ${dungeon.boss.name || "区域首领"}，获得 ${totalXp} 战斗经验、${totalGold} 金币`
      : `组队副本第 ${wave} 波清剿完成，获得 ${totalXp} 战斗经验、${totalGold} 金币`
  );

  const reply: PartyWaveReply = {
    ok: true,
    wave,
    isBossWave: bossWave,
    nextWave: wave + 1,
    xpGained: totalXp,
    xpSplit: { ...grant.gained },
    levelUps: grant.levelUps,
    abilityXpGained,
    abilityLevelUps,
    combatLevel: player.combatLevel || 1,
    goldGained: totalGold,
    drops: [...drops.values()],
  };
  const cost = waveCost(run, expectedMs);
  run.budgetMs = Math.max(0, Math.min(Math.max(PARTY_JUDGE.budgetCapMs, cost), run.budgetMs + elapsedMs) - cost);
  run.last = { wave, attempt: run.attempt, reply };
  beginWave(run, player, pack, ctx, wave + 1, now.getTime(), now);
  return reply;
}

/** 团灭：回到第 1 波重新计时。 */
export function resetPartyRun(player: EnhancedPlayerState, pack: EnhancedContentPack, ctx: PartyContext, now: Date): PartyRunState {
  const run = ensurePartyRun(player, pack, ctx, now);
  if (run.nextWave === 1) return run;
  run.budgetMs = Math.min(PARTY_JUDGE.budgetCapMs, run.budgetMs + Math.max(0, now.getTime() - run.waveStartedAt));
  run.attempt += 1;
  run.last = undefined;
  beginWave(run, player, pack, ctx, 1, now.getTime(), now);
  return run;
}
