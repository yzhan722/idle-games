export type CaravanRouteId = "frostport" | "emberoasis" | "starfallspire";

export type CaravanCargoCategory =
  | "lumber_fish_dishes"
  | "ore_ingot_tools"
  | "herb_cloth_crystal_alchemy";

export const CARAVAN_MAX_LEDGER_RANK = 5;
export const CARAVAN_LEDGER_COSTS: readonly number[] = [25, 50, 85, 135, 195];
export const CARAVAN_BASE_WAGON_CAPACITY = 60;
export const CARAVAN_LEDGER_CAPACITY_PER_RANK = 15;
export const CARAVAN_MIN_CARGO_VALUE = 40;
export const CARAVAN_MAX_CARGO_TYPES = 6;

export interface CaravanRepTierDef {
  level: number;
  minRep: number;
  title: string;
  maxWagons: 1 | 2 | 3;
  gatherDoubleChance: number;
  craftSpeedPct: number;
  goldGainPct: number;
}

export const CARAVAN_REP_TIERS: readonly CaravanRepTierDef[] = [
  { level: 1, minRep: 0, title: "初途行商", maxWagons: 1, gatherDoubleChance: 0, craftSpeedPct: 0, goldGainPct: 0 },
  { level: 2, minRep: 100, title: "驿路熟客", maxWagons: 1, gatherDoubleChance: 0.03, craftSpeedPct: 4, goldGainPct: 4 },
  { level: 3, minRep: 280, title: "跨镇领航商", maxWagons: 2, gatherDoubleChance: 0.06, craftSpeedPct: 8, goldGainPct: 8 },
  { level: 4, minRep: 580, title: "皇家特许行会", maxWagons: 2, gatherDoubleChance: 0.1, craftSpeedPct: 12, goldGainPct: 13 },
  { level: 5, minRep: 1050, title: "星界远航巨贾", maxWagons: 3, gatherDoubleChance: 0.14, craftSpeedPct: 17, goldGainPct: 18 },
  { level: 6, minRep: 1700, title: "万邦星途总商会", maxWagons: 3, gatherDoubleChance: 0.19, craftSpeedPct: 22, goldGainPct: 24 },
];

export interface CaravanRouteMeta {
  id: CaravanRouteId;
  name: string;
  townName: string;
  iconId: string;
  favoredCategory: CaravanCargoCategory;
  favoredLabel: string;
  baseDurationMs: number;
  goldReturnRatio: number;
  baseDust: number;
  dustDivisor: number;
  baseRep: number;
  emblemThreshold: number;
  hotCandidateIds: string[];
}

export const CARAVAN_TRADE_ROUTES_META: readonly CaravanRouteMeta[] = [
  {
    id: "frostport",
    name: "凛风冰港航路",
    townName: "极北凛风冰港",
    iconId: "caravan_route_frostport",
    favoredCategory: "lumber_fish_dishes",
    favoredLabel: "原木 / 板材 / 渔获 / 料理补给",
    baseDurationMs: 12 * 60 * 1000,
    goldReturnRatio: 1.32,
    baseDust: 4,
    dustDivisor: 88,
    baseRep: 24,
    emblemThreshold: 340,
    hotCandidateIds: [
      "wood_1",
      "lumber_1",
      "fish_river",
      "food_simple",
      "lumber_2",
      "fish_sea",
      "food_fine",
      "dish_grilled_lake",
    ],
  },
  {
    id: "emberoasis",
    name: "赤砂绿洲航路",
    townName: "炎阳赤砂绿洲",
    iconId: "caravan_route_emberoasis",
    favoredCategory: "ore_ingot_tools",
    favoredLabel: "矿石 / 金属锭 / 锻造工具与军备",
    baseDurationMs: 20 * 60 * 1000,
    goldReturnRatio: 1.38,
    baseDust: 6,
    dustDivisor: 80,
    baseRep: 32,
    emblemThreshold: 300,
    hotCandidateIds: [
      "ore_1",
      "ingot_1",
      "ore_2",
      "ingot_2",
      "weapon_iron_sword",
      "weapon_logging_axe_t1",
      "weapon_forge_hammer_t1",
      "ingot_3",
    ],
  },
  {
    id: "starfallspire",
    name: "星坠秘塔航路",
    townName: "云巅星坠秘塔",
    iconId: "caravan_route_starfallspire",
    favoredCategory: "herb_cloth_crystal_alchemy",
    favoredLabel: "灵草 / 纺织丝布 / 辉光水晶 / 秘药炼金",
    baseDurationMs: 30 * 60 * 1000,
    goldReturnRatio: 1.44,
    baseDust: 8,
    dustDivisor: 72,
    baseRep: 42,
    emblemThreshold: 270,
    hotCandidateIds: [
      "fiber_1",
      "yarn_1",
      "crystal_1",
      "potion_hp_t1",
      "crystal_2",
      "potion_mp_t2",
      "herb_farm",
      "dyed_cloth",
    ],
  },
];

function createSeededRng(seedKey: string): () => number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seedKey.length; i++) {
    h ^= seedKey.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  let state = h >>> 0;
  if (state === 0) state = 0x9e3779b9;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function todayLocalStr(d: Date): string {
  const shifted = new Date(d.getTime() + 8 * 60 * 60_000);
  return shifted.toISOString().slice(0, 10);
}

export function buildCaravanScarcityShiftKey(now: Date = new Date()): string {
  const date = todayLocalStr(now);
  const shift = Math.min(3, Math.max(0, Math.floor(now.getHours() / 6)));
  return `wl7-scarcity:${date}#S${shift}`;
}

export function getCaravanRouteScarcity(
  routeId: CaravanRouteId,
  nowOrShiftKey: Date | string = new Date()
) {
  const shiftKey =
    typeof nowOrShiftKey === "string" && nowOrShiftKey.length > 0
      ? nowOrShiftKey
      : buildCaravanScarcityShiftKey(nowOrShiftKey instanceof Date ? nowOrShiftKey : new Date());
  const route = CARAVAN_TRADE_ROUTES_META.find((r) => r.id === routeId) || CARAVAN_TRADE_ROUTES_META[0];
  const rng = createSeededRng(`${shiftKey}::route:${route.id}`);
  const rawSteps = Math.floor(rng() * 58);
  const scarcityMultiplier = Math.round((1.15 + rawSteps * 0.01) * 100) / 100;
  const hotMultiplier = Math.min(1.85, Math.round((scarcityMultiplier + 0.13) * 100) / 100);

  const pool = [...route.hotCandidateIds];
  const hotItemIds: string[] = [];
  while (hotItemIds.length < 2 && pool.length > 0) {
    const idx = Math.floor(rng() * pool.length);
    hotItemIds.push(pool.splice(idx, 1)[0]);
  }
  return {
    shiftKey,
    scarcityMultiplier,
    hotItemIds,
    hotMultiplier,
  };
}

export function classifyCaravanCargoCategory(
  itemId: string,
  itemDef?: { id?: string; type?: string; toolFor?: string } | null
): CaravanCargoCategory | null {
  const id = String(itemId || "").trim();
  if (!id || id === "gold") return null;

  if (
    /^(crystal|fiber|yarn|potion|elixir|drink|herb|flower)_/.test(id) ||
    id === "wool" ||
    id === "rabbit_fur" ||
    id === "dyed_cloth" ||
    id === "tea_spirit" ||
    id === "poison_sac" ||
    id === "rotten_heart" ||
    id === "elemental_core" ||
    id === "snake_venom" ||
    id === "ghost_essence" ||
    /^armor_(cloth|farmer_cloth|alchemist_cloth|traveler_cloak)/.test(id) ||
    /^weapon_(scissors|staff|alchemy_bottle)_/.test(id)
  ) {
    return "herb_cloth_crystal_alchemy";
  }

  if (
    /^(wood|lumber|fish|dish|food)_/.test(id) ||
    id === "shrimp" ||
    id === "egg" ||
    id === "milk" ||
    id === "pork" ||
    id === "honey" ||
    id === "grain" ||
    id === "corn" ||
    id === "vegetable" ||
    id === "hay" ||
    id === "feed_animal" ||
    id === "flour" ||
    id === "oil" ||
    id === "bread" ||
    id === "butter" ||
    id === "cheese_wheel" ||
    id === "sauce_secret" ||
    id === "soup_herbal"
  ) {
    return "lumber_fish_dishes";
  }

  if (
    /^(ore|ingot|tool)_/.test(id) ||
    id === "charcoal" ||
    id === "resin" ||
    id === "leather_hide" ||
    id === "mirror_protection" ||
    Boolean(itemDef?.toolFor) ||
    /^(weapon|armor|offhand)_/.test(id)
  ) {
    return "ore_ingot_tools";
  }

  return null;
}

export function getCaravanRepTier(caravanRep: number) {
  const rep = Number.isFinite(caravanRep) && caravanRep > 0 ? Math.floor(caravanRep) : 0;
  let current = CARAVAN_REP_TIERS[0];
  for (const t of CARAVAN_REP_TIERS) {
    if (rep >= t.minRep) current = t;
  }
  const next = CARAVAN_REP_TIERS.find((t) => t.level === current.level + 1) || null;
  const progressPct = !next
    ? 100
    : Math.min(100, Math.max(0, Math.floor(((rep - current.minRep) / Math.max(1, next.minRep - current.minRep)) * 100)));
  return { current, next, progressPct };
}

export function getCaravanTradeBonuses(
  state?: { caravanTrade?: { caravanRep?: number; ledgerRank?: number } | null } | null
) {
  const ct = state?.caravanTrade;
  const rawRep = Number(ct?.caravanRep || 0);
  const cleanRep = Number.isFinite(rawRep) && rawRep > 0 ? Math.floor(rawRep) : 0;
  const rawLedger = Number(ct?.ledgerRank || 0);
  const ledgerRank =
    Number.isFinite(rawLedger) && rawLedger > 0
      ? Math.min(CARAVAN_MAX_LEDGER_RANK, Math.floor(rawLedger))
      : 0;

  const { current } = getCaravanRepTier(cleanRep);
  const gatherDoubleChance = Math.min(
    0.5,
    Math.round((current.gatherDoubleChance + ledgerRank * 0.01) * 1000) / 1000
  );
  const craftSpeedPct = current.craftSpeedPct + ledgerRank * 2;
  const goldGainPct = current.goldGainPct + ledgerRank * 2;
  const tradeYieldPct = ledgerRank * 6;
  const durationReductionPct = ledgerRank * 6;
  const maxCargoCapacity = CARAVAN_BASE_WAGON_CAPACITY + ledgerRank * CARAVAN_LEDGER_CAPACITY_PER_RANK;

  return {
    level: current.level,
    title: current.title,
    ledgerRank,
    maxWagons: current.maxWagons,
    maxCargoCapacity,
    gatherDoubleChance,
    craftSpeedPct,
    goldGainPct,
    tradeYieldPct,
    durationReductionPct,
  };
}

export function previewCaravanCargoFrontend(params: {
  routeId: CaravanRouteId;
  cargo: Record<string, number>;
  catalog: Array<{ itemId: string; name: string; idleQty: number; unitValue: number; category: CaravanCargoCategory | null }>;
  shiftKey: string;
  caravanRep: number;
  ledgerRank: number;
}) {
  const route = CARAVAN_TRADE_ROUTES_META.find((r) => r.id === params.routeId) || CARAVAN_TRADE_ROUTES_META[0];
  const bonuses = getCaravanTradeBonuses({
    caravanTrade: { caravanRep: params.caravanRep, ledgerRank: params.ledgerRank },
  });
  const scarcity = getCaravanRouteScarcity(route.id, params.shiftKey);
  const catMap = new Map(params.catalog.map((c) => [c.itemId, c]));

  let totalUnits = 0;
  let baseCargoValue = 0;
  let rawEffectiveScore = 0;
  let favoredUnits = 0;
  const entries = Object.entries(params.cargo).filter(([, q]) => Number(q) > 0);

  for (const [iid, rawQty] of entries) {
    const qty = Math.max(0, Math.floor(Number(rawQty)));
    if (qty <= 0) continue;
    const item = catMap.get(iid);
    const unitValue = Math.max(4, Math.floor(Number(item?.unitValue || 8)));
    const cat = item?.category ?? classifyCaravanCargoCategory(iid);
    const isHot = scarcity.hotItemIds.includes(iid);
    const isFavored = isHot || cat === route.favoredCategory;
    const mult = isHot ? scarcity.hotMultiplier : isFavored ? scarcity.scarcityMultiplier : 1.0;

    totalUnits += qty;
    baseCargoValue += unitValue * qty;
    rawEffectiveScore += Math.round(unitValue * qty * mult * 100) / 100;
    if (isFavored) favoredUnits += qty;
  }

  const effectiveCargoValue = Math.round(rawEffectiveScore * (1 + bonuses.tradeYieldPct / 100));
  const favoredRatio = totalUnits > 0 ? favoredUnits / totalUnits : 0;

  const gold = totalUnits > 0 ? Math.max(60, Math.round(effectiveCargoValue * route.goldReturnRatio)) : 0;
  const astralCrystalDust =
    totalUnits > 0
      ? Math.max(route.baseDust, route.baseDust + Math.floor(effectiveCargoValue / route.dustDivisor))
      : 0;
  const baseEmblems = Math.floor(effectiveCargoValue / route.emblemThreshold);
  const favoredBonusEmblem =
    totalUnits > 0 && favoredRatio >= 0.5 && effectiveCargoValue >= Math.round(route.emblemThreshold * 0.55) ? 1 : 0;
  const forgingEmblems = totalUnits > 0 ? Math.min(4, baseEmblems + favoredBonusEmblem) : 0;
  const caravanRepOut =
    totalUnits > 0 ? Math.max(route.baseRep, route.baseRep + Math.floor(effectiveCargoValue / 45)) : 0;

  const valid =
    entries.length > 0 &&
    entries.length <= CARAVAN_MAX_CARGO_TYPES &&
    totalUnits <= bonuses.maxCargoCapacity &&
    baseCargoValue >= CARAVAN_MIN_CARGO_VALUE;

  return {
    valid,
    totalUnits,
    maxCapacity: bonuses.maxCargoCapacity,
    baseCargoValue,
    effectiveCargoValue,
    favoredUnits,
    scarcityMultiplier: scarcity.scarcityMultiplier,
    hotMultiplier: scarcity.hotMultiplier,
    expectedReward: {
      gold,
      astralCrystalDust,
      forgingEmblems,
      caravanRep: caravanRepOut,
    },
  };
}
