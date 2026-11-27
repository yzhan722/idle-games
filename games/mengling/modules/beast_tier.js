// beast_tier.js — 物种稀有度与驯服率查询。数值由 scripts/beast_rules.mjs 生成进 data/beasts.js。
// 与 beast_defs.js 分开：这里在 import 时不读全局数据，存档迁移可以放心引用。

const pad3 = (n) => String(n).padStart(3, "0");

export const TIER_ORDER = ["common", "uncommon", "rare", "epic"];

/** 驯服率：每次投球的基础成功率（%）；图鉴外的旧物种按 20 算。 */
export function getTameRate(dex) {
  const v = globalThis.BEAST_TAME?.[`p${pad3(dex)}`];
  return typeof v === "number" && v > 0 && v <= 100 ? v : 20;
}

export function getBeastTier(dex) {
  const v = globalThis.BEAST_TIER?.[`p${pad3(dex)}`];
  return TIER_ORDER.includes(v) ? v : "common";
}

/** 两个稀有度取高的：已捕获的伙伴不因规则调整而降稀有度 */
export function higherTier(a, b) {
  return TIER_ORDER.indexOf(a) > TIER_ORDER.indexOf(b) ? a : TIER_ORDER.includes(b) ? b : "common";
}
