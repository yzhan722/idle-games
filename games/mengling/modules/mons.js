import { clamp, nowMs, randFloat } from "./utils.js";
import { getStarBonusMul } from "./stars.js";
import { getAbilityInfo, monPassive, rollAbility } from "./abilities.js";
import { carryVeteran, normalizeStatKeep } from "./own_numbers_compat.js";

// ========== 性格系统 ==========
export const NATURES = [
  { id: "hardy",   name: "踏实",  up: null,   down: null },
  { id: "lonely",  name: "独处",  up: "atk",  down: "def" },
  { id: "brave",   name: "豪爽",  up: "atk",  down: "spe" },
  { id: "adamant", name: "倔强",  up: "atk",  down: "spa" },
  { id: "naughty", name: "捣蛋",  up: "atk",  down: "spd" },
  { id: "bold",    name: "敢闯",  up: "def",  down: "atk" },
  { id: "docile",  name: "老实",  up: null,   down: null },
  { id: "relaxed", name: "慵懒",  up: "def",  down: "spe" },
  { id: "impish",  name: "机灵",  up: "def",  down: "spa" },
  { id: "lax",     name: "随缘",  up: "def",  down: "spd" },
  { id: "timid",   name: "怯生",  up: "spe",  down: "atk" },
  { id: "hasty",   name: "风火",  up: "spe",  down: "def" },
  { id: "serious", name: "较真",  up: null,   down: null },
  { id: "jolly",   name: "爱笑",  up: "spe",  down: "spa" },
  { id: "naive",   name: "好奇",  up: "spe",  down: "spd" },
  { id: "modest",  name: "文静",  up: "spa",  down: "atk" },
  { id: "mild",    name: "慢热",  up: "spa",  down: "def" },
  { id: "quiet",   name: "沉静",  up: "spa",  down: "spe" },
  { id: "bashful", name: "腼腆",  up: null,   down: null },
  { id: "rash",    name: "冒失",  up: "spa",  down: "spd" },
  { id: "calm",    name: "恬静",  up: "spd",  down: "atk" },
  { id: "gentle",  name: "暖心",  up: "spd",  down: "def" },
  { id: "sassy",   name: "傲娇",  up: "spd",  down: "spe" },
  { id: "careful", name: "心细",  up: "spd",  down: "spa" },
  { id: "quirky",  name: "善变",  up: null,   down: null },
];

// 特殊性格的被动技能加成
// @deprecated 效果已迁至 abilities.js；保留映射仅供旧代码/测试对照，运行时请用 monPassive()
export const NATURE_PASSIVE = {
  adamant: { desc: "训练经验 +5%", key: "trainExpBonus", val: 0.05 },
  timid: { desc: "捕获省球（10%概率）", key: "ballSaveChance", val: 0.1 },
  serious: { desc: "研究速度 +3%", key: "researchSpeedBonus", val: 0.03 },
  relaxed: { desc: "饱腹恢复 +10%", key: "satietyRegenBonus", val: 0.1 },
  impish: { desc: "远征时间 -5%", key: "expeditionTimeBonus", val: 0.05 },
  jolly: { desc: "亲密度获取 +5%", key: "affectionBonus", val: 0.05 },
  modest: { desc: "图鉴加成 +2%", key: "dexBonusExtra", val: 0.02 },
  calm: { desc: "资源产量 +3%", key: "resProdBonus", val: 0.03 },
  lonely: { desc: "单独上阵训练经验 +8%", key: "soloTrainExpBonus", val: 0.08 },
  bold: { desc: "被攻击时减伤 +5%", key: "defDamageReduce", val: 0.05 },
  hasty: { desc: "遭遇充能恢复 +10%", key: "encounterRechargeBonus", val: 0.1 },
  naive: { desc: "高级遭遇未捕获偏好 +10%", key: "advEncMissingBonus", val: 0.1 },
  mild: { desc: "繁殖速度 +5%", key: "breedSpeedBonus", val: 0.05 },
  lax: { desc: "资源上限 +2%", key: "resCapBonus", val: 0.02 },
  naughty: { desc: "逃跑必定成功", key: "alwaysEscape", val: 1.0 },
  gentle: { desc: "饱腹消耗 -5%", key: "satietyDecayReduce", val: 0.05 },
  hardy: { desc: "均衡型·保底积累 +20%", key: "pityAccelBonus", val: 0.2 },
  docile: { desc: "均衡型·保底积累 +20%", key: "pityAccelBonus", val: 0.2 },
  bashful: { desc: "均衡型·保底积累 +20%", key: "pityAccelBonus", val: 0.2 },
  quirky: { desc: "均衡型·保底积累 +20%", key: "pityAccelBonus", val: 0.2 },
};

export function rollNature() {
  return NATURES[Math.floor(randFloat() * NATURES.length)].id;
}

export function getNatureInfo(natureId) {
  return NATURES.find((n) => n.id === natureId) ?? NATURES[0];
}

// 性格改为纯风味标签，不再影响数值（修正并入特性池）；
// up/down 字段保留供 UI 展示「倾向」，不参与计算。
export function getNatureMul() {
  return 1;
}

// ========== ML-5: 性格薄荷定向调律工坊 ==========
export const TUNABLE_STATS = Object.freeze(["atk", "def", "spa", "spd", "spe"]);

export const STAT_ZH = Object.freeze({
  hp: "生命",
  atk: "物攻",
  def: "物防",
  spa: "灵攻",
  spd: "灵防",
  spe: "速度",
});

export const MINT_TUNING_PRESETS = Object.freeze([
  { id: "breaker",     name: "破军调律", up: "atk", down: "spa", desc: "物攻 +10% · 灵攻 -10%（物理主C优选）" },
  { id: "starweaver",  name: "星咏调律", up: "spa", down: "atk", desc: "灵攻 +10% · 物攻 -10%（法系主C优选）" },
  { id: "gale_blade",  name: "疾风物袭", up: "spe", down: "spa", desc: "速度 +10% · 灵攻 -10%（先手物攻优选）" },
  { id: "gale_arc",    name: "流光灵袭", up: "spe", down: "atk", desc: "速度 +10% · 物攻 -10%（先手灵攻优选）" },
  { id: "bastion",     name: "磐岩守御", up: "def", down: "spa", desc: "物防 +10% · 灵攻 -10%（重装前排优选）" },
  { id: "mirror_ward", name: "灵镜障壁", up: "spd", down: "atk", desc: "灵防 +10% · 物攻 -10%（圣盾辅助优选）" },
  { id: "neutral",     name: "心平归元", up: null,  down: null,  desc: "均衡调律 · 全六维倍率归复 1.00x" },
]);

export function normalizeMintTuning(raw) {
  if (!raw || typeof raw !== "object") return null;
  if (raw.up === null && raw.down === null) {
    return { up: null, down: null };
  }
  const up = typeof raw.up === "string" ? raw.up.trim() : "";
  const down = typeof raw.down === "string" ? raw.down.trim() : "";
  if (TUNABLE_STATS.includes(up) && TUNABLE_STATS.includes(down) && up !== down) {
    return { up, down };
  }
  return null;
}

export function getMintTuningPresetLabel(tuning) {
  const t = normalizeMintTuning(tuning);
  if (!t) return "";
  const hit = MINT_TUNING_PRESETS.find((p) => p.up === t.up && p.down === t.down);
  return hit ? hit.name : "定向调律";
}

export function describeMintTuning(tuning) {
  const t = normalizeMintTuning(tuning);
  if (!t) return "未调律";
  if (t.up === null && t.down === null) return "心平归元（全维±0%）";
  return `${getMintTuningPresetLabel(t)}（${STAT_ZH[t.up]}+10% / ${STAT_ZH[t.down]}-10%）`;
}

export function formatMonNatureWithTuning(mon, { compact = false } = {}) {
  const origName = getNatureInfo(mon?.nature)?.name || "踏实";
  const t = normalizeMintTuning(mon?.mintTuning);
  if (!t) return origName;
  if (t.up === null && t.down === null) {
    return compact ? `${origName} → 心平归元` : `${origName} → 心平归元（全维±0%）`;
  }
  return compact
    ? `${origName} → ${STAT_ZH[t.up]}+10%/${STAT_ZH[t.down]}-10%`
    : `${origName} → ${describeMintTuning(t)}`;
}

export function getMonTuningMul(mon, statKey) {
  const t = normalizeMintTuning(mon?.mintTuning);
  if (!t || !statKey || t.up === null || t.down === null) return 1;
  if (statKey === t.up) return 1.1;
  if (statKey === t.down) return 0.9;
  return 1;
}

export function recommendMintTuningForMon(mon, getBeastDataByDex = null) {
  const api = typeof getBeastDataByDex === "function" && mon?.dex != null ? getBeastDataByDex(mon.dex) : null;
  const base = api?.baseStats && typeof api.baseStats === "object" ? api.baseStats : mon?.baseStats || {};
  const iv = mon?.iv && typeof mon.iv === "object" ? mon.iv : {};
  const atkScore = (Number(base.atk) || 25) + (Number(iv.atk) || 0);
  const spaScore = (Number(base.spa) || 25) + (Number(iv.spa) || 0);
  const defScore = (Number(base.def) || 25) + (Number(iv.def) || 0);
  const spdScore = (Number(base.spd) || 25) + (Number(iv.spd) || 0);
  const speScore = (Number(base.spe) || 25) + (Number(iv.spe) || 0);
  if (defScore + spdScore >= Math.max(atkScore, spaScore) * 2.35) {
    return defScore >= spdScore
      ? { up: "def", down: spaScore <= atkScore ? "spa" : "atk" }
      : { up: "spd", down: atkScore <= spaScore ? "atk" : "spa" };
  }
  if (speScore >= Math.max(atkScore, spaScore) * 1.18) {
    return atkScore >= spaScore ? { up: "spe", down: "spa" } : { up: "spe", down: "atk" };
  }
  return spaScore > atkScore ? { up: "spa", down: "atk" } : { up: "atk", down: "spa" };
}

export function applyMintTuningToMon(state, monId, tuningSpec) {
  if (!state || typeof state !== "object") return { ok: false, reason: "no_state" };
  const id = Number(monId);
  if (!Number.isFinite(id) || id <= 0) return { ok: false, reason: "invalid_mon" };
  const list = Array.isArray(state.mons?.list) ? state.mons.list : [];
  const mon = list.find((m) => m && m.id === id);
  if (!mon) return { ok: false, reason: "missing_mon" };

  const norm = normalizeMintTuning(tuningSpec);
  if (!norm) return { ok: false, reason: "invalid_tuning" };

  const cur = normalizeMintTuning(mon.mintTuning);
  if (cur && cur.up === norm.up && cur.down === norm.down) {
    return { ok: false, reason: "same_tuning" };
  }

  const have = Math.max(0, Math.floor(Number(state.res?.tuningMint?.value) || 0));
  if (have < 1) return { ok: false, reason: "insufficient_mint" };

  state.res.tuningMint.value = have - 1;
  mon.mintTuning = { up: norm.up, down: norm.down };
  if (!state.meta || typeof state.meta !== "object") state.meta = {};
  state.meta.mintTuningsApplied = Math.max(0, Math.floor(state.meta.mintTuningsApplied || 0)) + 1;

  return {
    ok: true,
    monId: mon.id,
    origNature: mon.nature,
    mintTuning: { ...mon.mintTuning },
    label: formatMonNatureWithTuning(mon),
  };
}
// ============================

export function expNeedForLevel(lvl) {
  // 优化经验曲线：低等级平缓，高等级有成长感但不过于陡峭
  // Lv1-20: 快速，Lv21-60: 二次加速，Lv61-100: 三次曲线
  if (lvl <= 20) return Math.floor(15 + lvl * 4);
  if (lvl <= 60) return Math.floor(80 + (lvl - 20) * (lvl - 20) * 1.8);
  return Math.floor(2960 + (lvl - 60) * (lvl - 60) * 4.5);
}

function makeStatObj(v) {
  return { hp: v, atk: v, def: v, spa: v, spd: v, spe: v };
}

function rollIv() {
  return {
    hp: Math.floor(randFloat() * 32),
    atk: Math.floor(randFloat() * 32),
    def: Math.floor(randFloat() * 32),
    spa: Math.floor(randFloat() * 32),
    spd: Math.floor(randFloat() * 32),
    spe: Math.floor(randFloat() * 32),
  };
}

function createBaseStats(species) {
  const tierBonus = species.tier === "epic" ? 42 : species.tier === "rare" ? 26 : species.tier === "uncommon" ? 12 : 0;
  const base = 18 + (species.dex % 28) + tierBonus;
  const s = makeStatObj(base);
  s.hp = base + 12;
  s.spe = base + ((species.dex % 7) - 3);
  return s;
}

export function getMonCurrentStats(mon, getBeastDataByDex) {
  const lvl = clamp(mon.lvl, 1, 100);
  const aff = clamp(typeof mon.affection === "number" && Number.isFinite(mon.affection) ? mon.affection : 0, 0, 100);
  const affMul = 1 + Math.floor(aff) * 0.01;
  const starMul = getStarBonusMul(mon.stars);
  // 性格对能力值的影响
  const natureId = typeof mon.nature === "string" ? mon.nature : "hardy";
  const totalMul = affMul * starMul;

  const bonus = mon.statBonus && typeof mon.statBonus === "object" ? mon.statBonus : {};
  const bHp = typeof bonus.hp === "number" && Number.isFinite(bonus.hp) ? bonus.hp : 0;
  const bAtk = typeof bonus.atk === "number" && Number.isFinite(bonus.atk) ? bonus.atk : 0;
  const bDef = typeof bonus.def === "number" && Number.isFinite(bonus.def) ? bonus.def : 0;
  const bSpa = typeof bonus.spa === "number" && Number.isFinite(bonus.spa) ? bonus.spa : 0;
  const bSpd = typeof bonus.spd === "number" && Number.isFinite(bonus.spd) ? bonus.spd : 0;
  const bSpe = typeof bonus.spe === "number" && Number.isFinite(bonus.spe) ? bonus.spe : 0;

  const api = typeof getBeastDataByDex === "function" ? getBeastDataByDex(mon.dex) : null;
  const fromTable = api?.baseStats && typeof api.baseStats === "object";
  const base = fromTable ? api.baseStats : mon.baseStats;
  // 数值规则换代前的伙伴：物种表变低的部分按存档里的 statKeep 补回
  const keep = fromTable ? normalizeStatKeep(mon.statKeep) ?? 1 : 1;
  const iv = mon.iv && typeof mon.iv === "object" ? mon.iv : {};
  const mul = 1 + (lvl - 1) * 0.03;
  return {
    hp:  Math.max(1, Math.floor(((base?.hp ?? 30) * keep + (iv.hp ?? 0))  * mul * totalMul) + bHp),
    atk: Math.max(1, Math.floor(((base?.atk ?? 25) * keep + (iv.atk ?? 0)) * mul * totalMul * getNatureMul(natureId, "atk") * getMonTuningMul(mon, "atk")) + bAtk),
    def: Math.max(1, Math.floor(((base?.def ?? 25) * keep + (iv.def ?? 0)) * mul * totalMul * getNatureMul(natureId, "def") * getMonTuningMul(mon, "def")) + bDef),
    spa: Math.max(1, Math.floor(((base?.spa ?? 25) * keep + (iv.spa ?? 0)) * mul * totalMul * getNatureMul(natureId, "spa") * getMonTuningMul(mon, "spa")) + bSpa),
    spd: Math.max(1, Math.floor(((base?.spd ?? 25) * keep + (iv.spd ?? 0)) * mul * totalMul * getNatureMul(natureId, "spd") * getMonTuningMul(mon, "spd")) + bSpd),
    spe: Math.max(1, Math.floor(((base?.spe ?? 25) * keep + (iv.spe ?? 0)) * mul * totalMul * getNatureMul(natureId, "spe") * getMonTuningMul(mon, "spe")) + bSpe),
  };
}

export function monPower(mon, getBeastDataByDex) {
  const s = getMonCurrentStats(mon, getBeastDataByDex);
  let p = s.hp + s.atk + s.def + s.spa + s.spd + s.spe;
  const pass = monPassive(mon);
  if (pass?.key === "pvePowerBonus" && typeof pass.val === "number") {
    p = Math.floor(p * (1 + pass.val));
  }
  const ribbons = typeof mon?.hallOfFameRibbons === "number" && Number.isFinite(mon.hallOfFameRibbons)
    ? Math.max(0, Math.min(5, Math.floor(mon.hallOfFameRibbons)))
    : 0;
  if (ribbons > 0) {
    p = Math.floor(p * (1 + ribbons * 0.04));
  }
  return p;
}

export function createMonInstance(species, opts = {}) {
  const idOverride = opts?.idOverride;
  const idFallback = opts?.idFallback;
  const createdAt = opts?.createdAt;

  const id = Number.isFinite(idOverride)
    ? Math.max(1, Math.floor(idOverride))
    : Number.isFinite(idFallback)
      ? Math.max(1, Math.floor(idFallback))
      : 1;

  const iv = rollIv();
  const baseStats = createBaseStats(species);
  const nature =
    typeof opts?.nature === "string" && NATURES.some((n) => n.id === opts.nature) ? opts.nature : rollNature();
  const ability =
    typeof opts?.ability === "string" && getAbilityInfo(opts.ability) ? opts.ability : rollAbility();

  return {
    id,
    pid: species.id,
    dex: species.dex,
    name: species.name,
    tier: species.tier,
    lvl: 1,
    exp: 0,
    satiety: 50,
    affection: 0,
    stars: 0,
    nature,
    ability,
    autoExpCarry: 0,
    affectionCarry: 0,
    baseStats,
    iv,
    statBonus: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    created: typeof createdAt === "number" && Number.isFinite(createdAt) ? createdAt : nowMs(),
  };
}

export function addExpToMon(mon, expAdd) {
  let exp = Math.max(0, Math.floor(mon.exp + expAdd));
  let lvl = mon.lvl;
  while (lvl < 100) {
    const need = expNeedForLevel(lvl);
    if (exp < need) break;
    exp -= need;
    lvl += 1;
  }
  mon.exp = exp;
  mon.lvl = lvl;
}

export function evolveMon(mon, toPid, getSpeciesByPid) {
  const to = typeof getSpeciesByPid === "function" ? getSpeciesByPid(toPid) : null;
  if (!to) return false;

  const before = { dex: mon.dex, tier: mon.tier, statKeep: mon.statKeep };
  mon.pid = to.id;
  mon.dex = to.dex;
  mon.name = to.name;
  mon.tier = to.tier;
  carryVeteran(mon, before);

  const bump = 1.12;
  mon.baseStats = {
    hp:  Math.floor(mon.baseStats.hp  * bump + 6),
    atk: Math.floor(mon.baseStats.atk * bump + 5),
    def: Math.floor(mon.baseStats.def * bump + 5),
    spa: Math.floor(mon.baseStats.spa * bump + 5),
    spd: Math.floor(mon.baseStats.spd * bump + 5),
    spe: Math.floor(mon.baseStats.spe * bump + 5),
  };
  return true;
}
