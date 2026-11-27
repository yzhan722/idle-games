/** 野外遭遇闪光：基础 1/4096，虹彩护符 ×2，再乘科技等加成。投掷与捕捉页的几率公示共用。 */
export const WILD_SHINY_BASE_DENOM = 4096;

/** 高级遭遇的闪光基础几率 */
export const ADV_SHINY_BASE_DENOM = 1024;

export function wildShinyRate({ charmOn = false, shinyMul = 1, advanced = false } = {}) {
  const base = 1 / (advanced ? ADV_SHINY_BASE_DENOM : WILD_SHINY_BASE_DENOM);
  const mul = Math.max(0, typeof shinyMul === "number" && Number.isFinite(shinyMul) ? shinyMul : 1);
  return (charmOn ? base * 2 : base) * mul;
}

/**
 * 几率一行字：「闪光 1/4096」；护符正好翻倍「闪光 1/2048（基础 1/4096）」；
 * 除不尽才写「约」：「闪光约 1/1862（基础 1/4096）」。advanced：高级遭遇，基础 1/1024。
 */
export function wildShinyOddsLine(rate, { advanced = false } = {}) {
  const baseDenom = advanced ? ADV_SHINY_BASE_DENOM : WILD_SHINY_BASE_DENOM;
  const label = advanced ? "高级遭遇闪光" : "闪光";
  const base = `1/${baseDenom}`;
  if (!(rate > 0)) return `${label} ${base}`;
  const exact = 1 / rate;
  const denom = Math.max(1, Math.round(exact));
  if (denom === baseDenom) return `${label} ${base}`;
  return `${label}${Math.abs(exact - denom) > 1e-9 ? "约" : ""} 1/${denom}（基础 ${base}）`;
}

/** Shared catch-ball multipliers for throw + UI preview. */
export function ballCatchMult(ballType, { types = null, caughtCount = 0, hour = new Date().getHours() } = {}) {
  if (ballType === "ultraball") return 2;
  if (ballType === "quickball") return caughtCount === 0 ? 5 : 1;
  if (ballType === "luxuryball") return 1;
  if (ballType === "netball") {
    const list = Array.isArray(types) ? types : [];
    for (const t of list) {
      const x = String(t || "").toLowerCase();
      if (x === "water" || x === "grass") return 3;
    }
    return 1;
  }
  if (ballType === "duskball") {
    const h = typeof hour === "number" && Number.isFinite(hour) ? hour : new Date().getHours();
    return h >= 18 || h < 6 ? 3 : 1.2;
  }
  return 1;
}
