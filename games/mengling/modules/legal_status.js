// 隐私政策 / 用户协议的状态开关：草案期为 true，页面顶部和入口都标「草案」。
// 改成 false 之前：补齐 legal/*.html 里所有「待填」、由用户找专业人士确认，并填生效日期。
export const LEGAL_DRAFT = true;
export const LEGAL_EFFECTIVE_DATE = "";

export const LEGAL_PAGES = Object.freeze({
  privacy: "./legal/privacy.html",
  terms: "./legal/terms.html",
});

export function legalLabel(name) {
  return LEGAL_DRAFT ? `${name}（草案）` : name;
}

/** legal/*.html 调用：非草案时收起草案横幅并写生效日期。脚本没跑起来时横幅保持可见。 */
export function applyLegalPage(doc) {
  const banner = doc?.getElementById?.("legalDraft");
  const date = doc?.getElementById?.("legalDate");
  if (!LEGAL_DRAFT && banner) banner.hidden = true;
  if (date) date.textContent = LEGAL_DRAFT ? "未生效" : LEGAL_EFFECTIVE_DATE || "未填写";
}
