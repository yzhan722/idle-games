// beast_rules.mjs — 萌灵自有数值规则（ML-COM1）。参数全部集中在 RULES，公式在下方；只在构建期使用，不随站点发布。
// 输入只有本作自己的设定：图鉴编号 n、9 系属性 el、生态区 hab、家族关系 next（data/beast_traits.json）。
// 不读 scripts/_srcdata（那里只供 own-numbers-selfcheck 比对）。
//
// 设计目标
//  1. 稀有度 = 出没习性，不等于进化阶段：幼崽多半躲在窝里（少见），亚成体四处巡游（最常见），
//     成体各占一片领地（少见到稀有）；每个家族再有自己的「群居—独居」倾向。幻梦秘境原生种恒为史诗。
//  2. 驯服率（每次投球的基础成功率，%）= 稀有度 × 生态区野性 × 体型 × 个体差异；越深的区越野，越大只越难哄。
//  3. 基础属性 = 家族潜力 × 成熟度 × 稀有度，再按「属性 + 体格」分到六维；两段家族的幼崽比三段家族的更壮。
//  4. 进化条件分三条路：岁长（看等级 + 灵晶石）、结契（看亲密度 + 灵晶石，等级要求低）、系绳（等级 + 灵契绳）。
//     等级来自家族的生长节奏与栖息地深浅；材料总量与改前相当。

export const ZONES_TOTAL = 9;
export const STAT_KEYS = ["hp", "atk", "def", "spa", "spd", "spe"];

export const RULES = {
  salt: "ml10385",

  rarity: {
    // 活跃度基准：越高越常见
    activity: { cub: 0.47, roamer: 0.64, elder: 0.36, loner: 0.45 },
    lineageSpread: 0.5, // 同一家族共用的群居—独居倾向
    selfSpread: 0.5, // 个体差异
    depthShy: 0.2, // 栖息地越深越怕生
    commonAt: 0.56,
    uncommonAt: 0.27,
  },

  tame: {
    base: { common: 41, uncommon: 22, rare: 8, epic: 5.6 }, // %
    habitat: [0.86, 0.78, 1.02, 0.91, 0.82, 0.88, 0.92, 0.66, 1], // 各生态区野性
    bulkHard: 0.28, // 体型每满 1 减多少
    rollSpread: 0.3, // 个体差异总幅度
    min: 2,
    max: 60,
  },

  stats: {
    potential: 324, // 单段家族的满成熟总和
    perLink: 24, // 家族每多一段
    potentialSpread: 26, // 家族差异总幅度
    seed: 0.38, // 刚出生占潜力的比例
    curve: 1.25, // 成熟曲线指数
    rarityMul: { common: 0.82, uncommon: 0.98, rare: 1.12, epic: 1.36 },
    // 9 系倾向（六维权重）
    element: {
      fire: [0.92, 1.12, 0.9, 1.14, 0.9, 1.02],
      water: [1.14, 0.94, 1.02, 1.0, 1.08, 0.82],
      grass: [1.08, 0.9, 1.06, 1.04, 1.1, 0.82],
      electric: [0.86, 0.98, 0.86, 1.14, 0.92, 1.24],
      wind: [1.0, 1.02, 0.9, 0.94, 0.94, 1.2],
      stone: [1.04, 1.16, 1.24, 0.78, 0.94, 0.84],
      light: [1.06, 0.8, 0.94, 1.12, 1.2, 0.88],
      dark: [0.9, 1.1, 0.9, 1.08, 0.92, 1.1],
      mystic: [0.92, 0.86, 0.92, 1.24, 1.12, 0.94],
    },
    // 5 种体格（家族共用）
    build: {
      stout: [1.16, 0.98, 1.1, 0.92, 1.0, 0.84],
      blade: [0.92, 1.16, 0.94, 0.92, 0.94, 1.12],
      sage: [0.96, 0.86, 0.96, 1.14, 1.1, 0.98],
      even: [1, 1, 1, 1, 1, 1],
      swift: [0.94, 1.02, 0.9, 1.0, 0.96, 1.18],
    },
    rollSpread: 0.14, // 单项差异总幅度
  },

  growth: {
    first: { base: 13, pace: 12, depth: 8 }, // 第一次进化：13 + 节奏 × 12 + 栖息地深浅 × 8
    gap: { base: 12, pace: 9, depth: 5 }, // 之后每一次再加
    bondLvlMul: 0.6,
    bondAff: { base: 20, step: 5, steps: 4 }, // 20～35
    // 走哪条路：掷值 + 属性倾向
    bondAt: 0.8,
    ropeAt: 0.14,
    lean: { light: 0.12, mystic: 0.08, grass: 0.04, stone: -0.06, electric: -0.06, dark: -0.02 },
    maxLvl: 60,
  },
};

const pad3 = (n) => String(n).padStart(3, "0");
export const pidOf = (dex) => `p${pad3(dex)}`;

/** 图鉴编号 + 用途 → [0,1) 的固定掷值（FNV-1a + 末位搅拌） */
export function roll(n, key, salt = RULES.salt) {
  const s = `${salt}|${key}|${n}`;
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 15;
  h = Math.imul(h, 2246822507);
  h ^= h >>> 13;
  h = Math.imul(h, 3266489909);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const round1 = (v) => Math.round(v * 10) / 10;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** 家族关系：根、第几段（0 起）、全家一共几段 */
export function buildLineage(traits) {
  const byDex = new Map(traits.map((t) => [t.dex, t]));
  const parent = new Map();
  for (const t of traits) for (const d of t.next ?? []) parent.set(d, t.dex);
  const below = (dex) => Math.max(0, ...(byDex.get(dex)?.next ?? []).map((d) => 1 + below(d)));
  const out = new Map();
  for (const t of traits) {
    let root = t.dex;
    let stage = 0;
    while (parent.has(root)) {
      root = parent.get(root);
      stage += 1;
    }
    const links = stage + below(t.dex) + 1;
    const role = links === 1 ? "loner" : stage === 0 ? "cub" : stage === links - 1 ? "elder" : "roamer";
    out.set(t.dex, { root, rootN: byDex.get(root).n, stage, links, role, maturity: links === 1 ? 1 : (stage + 1) / links });
  }
  return out;
}

export function rarityOf(t, fam, R = RULES) {
  if (t.hab === ZONES_TOTAL - 1) return "epic";
  const r = R.rarity;
  const activity =
    r.activity[fam.role] +
    r.lineageSpread * (roll(fam.rootN, "lineage", R.salt) - 0.5) +
    r.selfSpread * (roll(t.n, "habit", R.salt) - 0.5) -
    r.depthShy * (t.hab / (ZONES_TOTAL - 1) - 0.4);
  if (activity >= r.commonAt) return "common";
  return activity >= r.uncommonAt ? "uncommon" : "rare";
}

/** 体型 0～1：越成熟越大，个体有差 */
export const bulkOf = (t, fam, R = RULES) => 0.65 * fam.maturity + 0.35 * roll(t.n, "bulk", R.salt);

export function tameOf(t, fam, tier, R = RULES) {
  const c = R.tame;
  const v =
    c.base[tier] *
    c.habitat[t.hab] *
    (1 + c.bulkHard * (0.5 - bulkOf(t, fam, R))) *
    (1 + c.rollSpread * (roll(t.n, "tame", R.salt) - 0.5));
  return round1(clamp(v, c.min, c.max));
}

const mixWeights = (el, build) => {
  const w = STAT_KEYS.map(() => 0);
  for (const e of el) RULES.stats.element[e].forEach((v, i) => { w[i] += v / el.length; });
  return w.map((v, i) => v * RULES.stats.build[build][i]);
};

export const statTotalOf = (fam, tier, R = RULES) => {
  const s = R.stats;
  const potential = s.potential + s.perLink * (fam.links - 1) + s.potentialSpread * (roll(fam.rootN, "potential", R.salt) - 0.5);
  return potential * (s.seed + (1 - s.seed) * fam.maturity ** s.curve) * s.rarityMul[tier];
};

export function statsOf(t, fam, tier, R = RULES) {
  const builds = Object.keys(R.stats.build);
  const build = builds[Math.floor(roll(fam.rootN, "build", R.salt) * builds.length)];
  const raw = mixWeights(t.el, build).map((v, i) => v * (1 + R.stats.rollSpread * (roll(t.n, STAT_KEYS[i], R.salt) - 0.5)));
  const sum = raw.reduce((a, b) => a + b, 0);
  const total = statTotalOf(fam, tier, R);
  return Object.fromEntries(STAT_KEYS.map((k, i) => [k, Math.max(5, Math.round((total * raw[i]) / sum))]));
}

/** 进化条件：从 from 变成 to */
export function evoConditionOf(from, to, fam, R = RULES) {
  const g = R.growth;
  const depth = from.hab / (ZONES_TOTAL - 1);
  const pace = roll(fam.rootN, "pace", R.salt);
  let lvl = g.first.base + g.first.pace * pace + g.first.depth * depth;
  for (let i = 1; i <= fam.stage; i++) lvl += g.gap.base + g.gap.pace * roll(fam.rootN, `pace${i}`, R.salt) + g.gap.depth * depth;
  const lean = to.el.reduce((a, e) => a + (g.lean[e] ?? 0), 0) / to.el.length;
  const way = roll(to.n, "turn", R.salt) + lean;
  const path = way >= g.bondAt ? "bond" : way < g.ropeAt ? "rope" : "stone";
  if (path === "bond") {
    const aff = g.bondAff.base + g.bondAff.step * Math.floor(roll(to.n, "bond", R.salt) * g.bondAff.steps);
    return { path, lvl: Math.round(clamp(lvl * g.bondLvlMul, 1, g.maxLvl)), aff };
  }
  return { path, lvl: Math.round(clamp(lvl, 1, g.maxLvl)), aff: 0 };
}

/** 由 traits 生成全部自有数值 */
export function buildOwnNumbers(traits, R = RULES) {
  const fams = buildLineage(traits);
  const byDex = new Map(traits.map((t) => [t.dex, t]));
  const out = { types: {}, zones: {}, evo: {}, evoReq: {}, tier: {}, tame: {}, stats: {} };
  for (const t of traits) {
    const id = pidOf(t.dex);
    const fam = fams.get(t.dex);
    const tier = rarityOf(t, fam, R);
    out.types[t.dex] = t.el;
    out.zones[t.dex] = t.hab;
    out.tier[id] = tier;
    out.tame[id] = tameOf(t, fam, tier, R);
    out.stats[t.dex] = statsOf(t, fam, tier, R);
    if (t.next?.length) {
      out.evo[id] = t.next.map(pidOf);
      out.evoReq[id] = Object.fromEntries(t.next.map((d) => [pidOf(d), evoConditionOf(t, byDex.get(d), fam, R)]));
    }
  }
  return out;
}
