import type { CombatSheet } from "./combatSheet";
import { combatSheetFromPack } from "./combatSheet";
import { previewFight, type FightOptions, type PreviewAbility, type PreviewMonster, type PreviewSupply } from "./fightPreview";
import { tierRespawnMs } from "./zoneTiers";

/**
 * 连打一小时的预览：一场接一场，血量带到下一场，胜了歇 3 秒、败了按档位重生、连败 3 次停手，
 * 食物与魔力药按背包里的数量吃，吃出来的状态从下一场起算。规则与 backend/src/hp_combat.ts 的连续战斗相同
 * （scripts/zone-tiers-parity.test.ts 用真实结算逐场比对）。掉落、途中升级不算。
 */
export const FARM_RULES = { hourMs: 3_600_000, restMs: 3000, maxLossStreak: 3, foodCooldownMs: 30_000, mpCooldownMs: 20_000 } as const;

export type FarmPreview = {
  wins: number;
  losses: number;
  /** 胜率（百分比，整数）。 */
  winPct: number;
  xpPerHour: number;
  goldPerHour: number;
  /** 连败太多，自动停手。 */
  stopped: boolean;
};

export type FarmOptions = Omit<FightOptions, "startHp"> & {
  /** 满血回一遍要多久（农夫 40 秒，其余 60 秒）。 */
  regenSpanMs?: number;
  /** 难度档位（只影响重生时间，怪物数值由调用方先换成那一档）。 */
  tier?: number;
  /** 加上这些状态之后的面板（吃东西得到的状态）。 */
  sheetWith?: (buffIds: string[]) => CombatSheet;
  /** 服务端算好的个人倍率（GET /player/state 的 combatGains）。 */
  gains?: { xp: number; gold: number };
  forMs?: number;
};

export function previewFarm(sheet: CombatSheet, monster: PreviewMonster & { xp?: number; gold?: number }, abilities: PreviewAbility[], opts: FarmOptions = {}): FarmPreview {
  const end = opts.forMs ?? FARM_RULES.hourMs;
  const supplies = opts.supplies?.map((s) => ({ ...s }));
  const regen = Math.floor((FARM_RULES.restMs / (opts.regenSpanMs ?? 60_000)) * sheet.hp);
  const buffUntil: Record<string, number> = {};
  const sheets = new Map<string, CombatSheet>();
  const sheetAt = (atMs: number): CombatSheet => {
    const ids = Object.keys(buffUntil).filter((id) => buffUntil[id] > atMs).sort();
    if (!ids.length || !opts.sheetWith) return sheet;
    const key = ids.join();
    if (!sheets.has(key)) sheets.set(key, opts.sheetWith(ids));
    return sheets.get(key)!;
  };
  let xp = 0;
  let gold = 0;
  let t = 0;
  let hp = sheet.hp;
  let wins = 0;
  let losses = 0;
  let streak = 0;
  while (t < end && streak < FARM_RULES.maxLossStreak) {
    const startedAt = t;
    const p = previewFight(sheetAt(t), monster, abilities, end - t, { startHp: hp, supplies, feast: opts.feast });
    // 到点还没分胜负的那一场不算
    if (p.durationMs > end - t || (!p.won && p.playerHpLeft > 0)) break;
    for (const { index, atMs } of p.eaten ?? []) {
      const buff = supplies![index].buff;
      if (buff) buffUntil[buff.id] = Math.max(buffUntil[buff.id] ?? 0, startedAt + atMs) + buff.durationMs;
    }
    t += p.durationMs;
    if (p.won) {
      let xpMult = opts.gains?.xp ?? 1;
      let goldMult = opts.gains?.gold ?? 1;
      for (const s of new Map(supplies?.map((x) => [x.buff?.id, x.buff])).values()) {
        if (!s || !(buffUntil[s.id] > startedAt)) continue;
        xpMult *= s.xpGain;
        goldMult *= s.goldGain;
      }
      xp += Math.round(Number(monster.xp || 0) * xpMult * 10) / 10;
      gold += Math.round(Number(monster.gold || 0) * goldMult);
      wins += 1;
      streak = 0;
      hp = Math.max(1, Math.min(sheet.hp, p.playerHpLeft + regen));
      t += FARM_RULES.restMs;
    } else {
      losses += 1;
      streak += 1;
      hp = sheet.hp;
      t += tierRespawnMs(opts.tier);
    }
  }
  const perHour = FARM_RULES.hourMs / end;
  return {
    wins,
    losses,
    winPct: wins + losses > 0 ? Math.floor((wins / (wins + losses)) * 100) : 0,
    xpPerHour: Math.round(xp * perHour),
    goldPerHour: Math.round(gold * perHour),
    stopped: streak >= FARM_RULES.maxLossStreak,
  };
}

type Buff = { id: string; name: string; durationSec?: number; stats?: Record<string, number>; multipliers?: Record<string, number> };
type Item = { id: string; effect?: { hp?: number; mp?: number; buff?: Buff } };
type FarmState = Omit<NonNullable<Parameters<typeof combatSheetFromPack>[0]>, "activeBuffs"> & {
  activeClassId?: string;
  chapter4Build?: string;
  inventory?: Record<string, number>;
  activeBuffs?: Array<{ id: string; name?: string; sourceItemId?: string; expiresAt: string; stats?: Record<string, number>; multipliers?: Record<string, number> }>;
  combatLoadout?: {
    food: Array<{ itemId: string; triggerMissingHp: number }>;
    drink: Array<{ itemId: string; triggerMissingMp?: number }>;
    mp?: Array<{ itemId: string; triggerMissingMp: number }>;
  };
};

/** 这名玩家连打时的面板与自动吃喝：饮品槽里有存货的状态药剂按一直续着算。 */
export function farmSetup(
  state: FarmState,
  items: Item[] | undefined,
  sets: Parameters<typeof combatSheetFromPack>[2],
  slots: { food: number; drink: number },
  now = Date.now()
): { sheet: CombatSheet; sheetWith: (buffIds: string[]) => CombatSheet; supplies: PreviewSupply[]; feast?: { ms: number; mult: number }; regenSpanMs: number; drinkGains: { xp: number; gold: number } } {
  const item = (id: string) => items?.find((i) => i.id === id);
  const stock = (id: string) => Math.max(0, Number(state.inventory?.[id] || 0));
  const lo = state.combatLoadout;
  const running = (id: string) => (state.activeBuffs || []).some((b) => b.id === id && Date.parse(b.expiresAt) > now);
  const asActive = (buff: Buff) => ({ id: buff.id, name: buff.name, sourceItemId: "", expiresAt: "9999-12-31T00:00:00.000Z", stats: buff.stats, multipliers: buff.multipliers });
  const buffs = [...(state.activeBuffs || [])];
  const drinkGains = { xp: 1, gold: 1 };
  const drinks = (lo?.drink || []).slice(0, slots.drink).filter((d) => d?.itemId && stock(d.itemId) > 0);
  for (const d of drinks) {
    const buff = item(d.itemId)?.effect?.buff;
    if (!buff || running(buff.id)) continue;
    buffs.push(asActive(buff));
    drinkGains.xp *= Number(buff.multipliers?.xpGain || 1);
    drinkGains.gold *= Number(buff.multipliers?.goldGain || 1);
  }
  const sheetOf = (extra: ReturnType<typeof asActive>[]) =>
    combatSheetFromPack({ ...state, activeBuffs: [...buffs, ...extra] } as Parameters<typeof combatSheetFromPack>[0], items as Parameters<typeof combatSheetFromPack>[1], sets);
  const sheet = sheetOf([]);
  const foodBuffs = new Map<string, Buff>();
  const chef = state.activeClassId === "chef" ? 1.2 : 1;
  const supplyBuff = (buff: Buff) => {
    foodBuffs.set(buff.id, buff);
    const seconds = Number(buff.durationSec || 0);
    return {
      id: buff.id,
      durationMs: (state.activeClassId === "alchemist" ? Math.round(seconds * 1.25) : seconds) * 1000,
      xpGain: Number(buff.multipliers?.xpGain || 1),
      goldGain: Number(buff.multipliers?.goldGain || 1),
    };
  };
  const supplies: PreviewSupply[] = [];
  for (const d of drinks) {
    const e = item(d.itemId)?.effect;
    if (!e || e.buff || !(Number(e.mp) > 0)) continue;
    supplies.push({ kind: "mp", amount: Number(e.mp), trigger: d.triggerMissingMp || Math.floor((sheet.mp || 50) * 0.4), cooldownMs: FARM_RULES.mpCooldownMs, stock: stock(d.itemId) });
  }
  for (const f of (lo?.food || []).slice(0, slots.food)) {
    const e = f?.itemId ? item(f.itemId)?.effect : undefined;
    if (!e || !(Number(e.hp) > 0)) continue;
    const heal = chef > 1 ? Math.round(Number(e.hp) * chef) : Number(e.hp);
    supplies.push({
      kind: "food",
      amount: Math.round(heal * (sheet.foodHealMult ?? 1)),
      mp: Number(e.mp) || 0,
      trigger: f.triggerMissingHp,
      cooldownMs: FARM_RULES.foodCooldownMs,
      stock: stock(f.itemId),
      ...(e.buff && !buffs.some((b) => b.id === e.buff!.id && Date.parse(b.expiresAt) > now) ? { buff: supplyBuff(e.buff) } : {}),
    });
  }
  for (const m of (lo?.mp || []).slice(0, 3)) {
    const e = m?.itemId ? item(m.itemId)?.effect : undefined;
    if (!e || !(Number(e.mp) > 0)) continue;
    supplies.push({ kind: "mp", amount: Math.round(Number(e.mp) * (state.chapter4Build === "elixir_frenzy" ? 1.35 : 1)), trigger: m.triggerMissingMp, cooldownMs: FARM_RULES.mpCooldownMs, stock: stock(m.itemId) });
  }
  return {
    sheet,
    sheetWith: (ids) => sheetOf(ids.flatMap((id) => (foodBuffs.has(id) ? [asActive(foodBuffs.get(id)!)] : []))),
    drinkGains,
    supplies,
    ...(state.chapter4Build === "feast_vitality" ? { feast: { ms: 4500, mult: 0.72 } } : {}),
    regenSpanMs: state.activeClassId === "farmer" ? 40_000 : 60_000,
  };
}

/** 怪物卡片里的一行：「胜率 100% · 2,500 经验/时 · 120 金/时」。 */
export function farmLine(p: FarmPreview): string {
  if (p.wins === 0) return "打不过";
  return `胜率 ${p.winPct}% · ${p.xpPerHour.toLocaleString("en-US")} 经验/时 · ${p.goldPerHour.toLocaleString("en-US")} 金/时${p.stopped ? " · 会停手" : ""}`;
}
