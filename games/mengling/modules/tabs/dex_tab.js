import { canClaimDexRegion, markDexRegionClaimed } from "../systems/gameplay_fun.js";
import {
  autofillShinyShowcase,
  buildShinyShareText,
  computeShinyShowcaseAura,
  SHINY_SHOWCASE_MAX,
  shinyGalleryEntries,
  shinyShareCardPayload,
  shinyUniqueCount,
  toggleShinyShowcasePid,
} from "../systems/collection_fun.js";
import { downloadDataUrl, drawShinyShareCard } from "../render/shiny_share.js";
import { renderResSvg } from "../render/rpg_svg_icons.js";
import { renderBeastIcon } from "../sprites.js";
import { escapeHtml, pad3 } from "../utils.js";

function openShinyShowcaseModal(state, focusDex = null, onChanged = null) {
  if (typeof document === "undefined") return;
  const existing = document.getElementById("shinyShowcaseOverlay");
  if (existing) existing.remove();

  const entries = shinyGalleryEntries(state, 48);
  if (!entries.length) return;
  const unique = shinyUniqueCount(state);
  let currentSpotlight =
    focusDex && focusDex !== "all"
      ? entries.find((e) => String(e.dex) === String(focusDex)) || entries[0]
      : entries[0];

  const overlay = document.createElement("div");
  overlay.id = "shinyShowcaseOverlay";
  overlay.className = "modalOverlay shiny-showcase-overlay";

  const renderContent = (spotlight) => {
    currentSpotlight = spotlight;
    const pid = spotlight.pid || `p${pad3(spotlight.dex)}`;
    const spTitle = globalThis.BEAST_TITLE?.[pid] || "星野灵兽";
    const spDesc = globalThis.BEAST_DESC?.[pid] || "概率珍稀的星芒异色个体 · 永久铭刻于图鉴殿堂";
    const spOrder = globalThis.BEAST_ORDER?.[pid] || spotlight.dex;
    const aura = computeShinyShowcaseAura(state);
    const showcasedSet = new Set(aura.pids);
    const inRack = showcasedSet.has(pid);

    const cardsHtml = entries
      .map((e) => {
        const active = e.dex === spotlight.dex;
        const ePid = e.pid || `p${pad3(e.dex)}`;
        const eOrder = globalThis.BEAST_ORDER?.[ePid] || e.dex;
        const isMounted = showcasedSet.has(ePid);
        return `
          <button type="button" class="shiny-showcase__pedestal ${active ? "is-active" : ""} ${isMounted ? "is-mounted" : ""}" data-showcase-pick="${escapeHtml(String(e.dex))}">
            <div class="shiny-showcase__pedestalArt">${renderBeastIcon(e.dex, e.name, true)}</div>
            <div class="shiny-showcase__pedestalName">#${pad3(eOrder)} ${escapeHtml(e.name)}${isMounted ? " ★展" : ""}</div>
          </button>
        `;
      })
      .join("");

    overlay.innerHTML = `
      <div class="modal shiny-showcase" role="dialog" aria-modal="true" aria-label="闪光馆全屏陈列台">
        <div class="shiny-showcase__header">
          <div>
            <div class="shiny-showcase__eyebrow">${renderResSvg("shinyHall", 16)}<span>SHINY GALLERY · 闪光星芒殿堂</span></div>
            <div class="shiny-showcase__title"><span>已点亮 ${unique} 种闪光萌灵 · 展柜 ${aura.count}/${SHINY_SHOWCASE_MAX}</span><span class="tag">产出 +${Math.round(aura.prodAdd * 1000) / 10}% · 训练 +${Math.round(aura.trainExpAdd * 1000) / 10}% · 捕获 +${Math.round(aura.catchAdd * 1000) / 10}%</span></div>
          </div>
          <div style="display:flex;gap:6px;align-items:center">
            <button type="button" class="btn btn--small btn--primary" data-modal-showcase-autofill="1">一键优选满配</button>
            <button type="button" class="btn btn--small btn--ghost" data-showcase-close>关闭 ✕</button>
          </div>
        </div>
        <div class="shiny-showcase__stage">
          <div class="shiny-showcase__rays" aria-hidden="true"></div>
          <div class="shiny-showcase__heroArt">${renderBeastIcon(spotlight.dex, spotlight.name, true)}</div>
          <div class="shiny-showcase__heroMeta">
            <span class="badge badge--ok">★ 闪光珍藏 #${pad3(spOrder)} · 【${escapeHtml(spTitle)}】</span>
            <div class="shiny-showcase__heroName">${escapeHtml(spotlight.name)}</div>
            <div class="shiny-showcase__heroSub">${escapeHtml(spDesc)}</div>
            <div style="margin-top:8px">
              <button type="button" class="btn btn--small ${inRack ? "btn--ghost" : "btn--primary"}" data-modal-showcase-toggle="${escapeHtml(pid)}">${inRack ? "撤下展柜圣座" : "供奉至展柜圣座"}</button>
            </div>
          </div>
        </div>
        <div class="shiny-showcase__grid">
          ${cardsHtml}
        </div>
      </div>
    `;
  };

  renderContent(currentSpotlight);
  document.body.appendChild(overlay);

  overlay.addEventListener("click", (ev) => {
    if (ev.target === overlay || ev.target?.closest?.("[data-showcase-close]")) {
      overlay.remove();
      return;
    }
    const autoBtn = ev.target?.closest?.("[data-modal-showcase-autofill]");
    if (autoBtn && overlay.contains(autoBtn)) {
      autofillShinyShowcase(state);
      if (typeof onChanged === "function") onChanged("已为闪光殿堂展柜一键优选满配");
      renderContent(currentSpotlight);
      return;
    }
    const toggleBtn = ev.target?.closest?.("[data-modal-showcase-toggle]");
    if (toggleBtn && overlay.contains(toggleBtn)) {
      const targetPid = toggleBtn.getAttribute("data-modal-showcase-toggle");
      const res = toggleShinyShowcasePid(state, targetPid);
      if (typeof onChanged === "function") {
        if (res.ok) onChanged(res.action === "added" ? "已供奉闪光萌灵至殿堂展柜" : "已从殿堂展柜撤下闪光萌灵");
        else if (res.reason === "full") onChanged("闪光展柜 6 席已满，请先撤下一席再更换");
      }
      renderContent(currentSpotlight);
      return;
    }
    const pickBtn = ev.target?.closest?.("[data-showcase-pick]");
    if (pickBtn && overlay.contains(pickBtn)) {
      const d = Number(pickBtn.getAttribute("data-showcase-pick"));
      const found = entries.find((e) => e.dex === d);
      if (found) renderContent(found);
    }
  });
}

export function initDexTab({
  ui,
  elDexArea,
  elDexSearch,
  elDexOnlyCaught,
  elDexOnlyMissing,
  elDexOnlyShiny,
  elDexPrev,
  elDexNext,
  elDexList,
  elDexSummary,
  markDexDirty,
  setActiveTab,
  getState,
  addRes,
  addLog,
  render,
}) {
  if (typeof setActiveTab === "function") {
    for (const host of [elDexList, elDexSummary]) {
      if (!host) continue;
      host.addEventListener("click", (e) => {
        const btn = e.target?.closest?.("[data-dex-goto-capture]");
        if (!btn || !host.contains(btn)) return;
        setActiveTab("capture");
      });
    }
  }

  if (elDexSummary) {
    elDexSummary.addEventListener("click", async (e) => {
      const autofillBtn = e.target?.closest?.("[data-dex-showcase-autofill]");
      if (autofillBtn && elDexSummary.contains(autofillBtn)) {
        const state = typeof getState === "function" ? getState() : null;
        if (!state) return;
        const res = autofillShinyShowcase(state);
        if (res.ok && typeof addLog === "function") {
          const aura = computeShinyShowcaseAura(state);
          addLog(`闪光殿堂展柜：已优选供奉 ${aura.count}/${SHINY_SHOWCASE_MAX} 席（全资源产出 +${Math.round(aura.prodAdd * 1000) / 10}%）`, true);
        }
        markDexDirty(false);
        if (typeof render === "function") render();
        return;
      }

      const toggleRackBtn = e.target?.closest?.("[data-dex-showcase-toggle]");
      if (toggleRackBtn && elDexSummary.contains(toggleRackBtn)) {
        const state = typeof getState === "function" ? getState() : null;
        if (!state) return;
        const pid = toggleRackBtn.getAttribute("data-dex-showcase-toggle");
        const res = toggleShinyShowcasePid(state, pid);
        if (typeof addLog === "function") {
          if (res.ok) {
            const aura = computeShinyShowcaseAura(state);
            addLog(
              res.action === "added"
                ? `闪光展柜：已供奉至圣座（${aura.count}/${SHINY_SHOWCASE_MAX} 席 · 产出 +${Math.round(aura.prodAdd * 1000) / 10}%）`
                : `闪光展柜：已撤下一席圣座（当前 ${aura.count}/${SHINY_SHOWCASE_MAX} 席）`,
              true
            );
          } else if (res.reason === "full") {
            addLog("闪光殿堂展柜 6 席圣座已满，请先点击展柜席位撤下一只再更换", true);
          }
        }
        markDexDirty(false);
        if (typeof render === "function") render();
        return;
      }

      const showcaseBtn = e.target?.closest?.("[data-dex-shiny-showcase]");
      if (showcaseBtn && elDexSummary.contains(showcaseBtn)) {
        const state = typeof getState === "function" ? getState() : null;
        const focusDex = showcaseBtn.getAttribute("data-dex-shiny-showcase");
        openShinyShowcaseModal(state, focusDex, (msg) => {
          if (msg && typeof addLog === "function") addLog(msg, true);
          markDexDirty(false);
          if (typeof render === "function") render();
        });
        return;
      }

      const cardBtn = e.target?.closest?.("[data-dex-shiny-card]");
      if (cardBtn && elDexSummary.contains(cardBtn)) {
        const state = typeof getState === "function" ? getState() : null;
        const payload = shinyShareCardPayload(state);
        const dataUrl = drawShinyShareCard(payload);
        if (dataUrl && downloadDataUrl(dataUrl)) {
          if (typeof addLog === "function") addLog("已保存闪光馆分享卡", true);
        } else {
          const text = buildShinyShareText(state);
          try {
            if (text && navigator?.clipboard?.writeText) await navigator.clipboard.writeText(text);
            if (typeof addLog === "function") addLog(text ? "画布不可用，已复制分享文案" : "闪光馆还是空的");
          } catch {
            if (typeof addLog === "function") addLog("分享卡生成失败");
          }
        }
        return;
      }
      const btn = e.target?.closest?.("[data-dex-shiny-share]");
      if (!btn || !elDexSummary.contains(btn)) return;
      const text = btn.getAttribute("data-share") || "";
      if (!text) return;
      try {
        if (navigator?.clipboard?.writeText) await navigator.clipboard.writeText(text);
        else {
          const ta = document.createElement("textarea");
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
        }
        if (typeof addLog === "function") addLog("已复制闪光馆分享文案", true);
      } catch {
        if (typeof addLog === "function") addLog("复制失败，请手动选中分享");
      }
    });
  }

  const claimHost = elDexSummary || elDexList;
  if (claimHost) {
    claimHost.addEventListener("click", (e) => {
      const btn = e.target?.closest?.("button[data-dex-claim-region]");
      if (!btn || !claimHost.contains(btn)) return;
      if (btn.disabled) return;
      const areaId = btn.getAttribute("data-dex-claim-region");
      if (!areaId) return;
      const state = typeof getState === "function" ? getState() : null;
      if (!state || typeof state !== "object") return;
      if (!state.meta || typeof state.meta !== "object") state.meta = {};
      if (!canClaimDexRegion(state.meta, areaId)) {
        if (typeof addLog === "function") addLog("该区域奖励已领取");
        return;
      }
      if (!markDexRegionClaimed(state.meta, areaId)) return;
      if (typeof addRes === "function") addRes("futurecoin", 10);
      if (typeof addLog === "function") addLog(`图鉴区域完成奖励：未来币 +10`, true);
      markDexDirty(false);
      if (typeof render === "function") render();
    });
  }

  if (elDexSearch) {
    elDexSearch.value = ui.dexQuery;
    elDexSearch.addEventListener("input", () => {
      ui.dexQuery = elDexSearch.value ?? "";
      markDexDirty(true);
    });
  }

  if (elDexArea) {
    elDexArea.addEventListener("change", () => {
      ui.dexAreaId = elDexArea.value || "all";
      markDexDirty(true);
    });
  }

  if (elDexOnlyCaught) {
    elDexOnlyCaught.checked = ui.dexOnlyCaught;
    elDexOnlyCaught.addEventListener("change", () => {
      ui.dexOnlyCaught = Boolean(elDexOnlyCaught.checked);
      if (ui.dexOnlyCaught) {
        ui.dexOnlyMissing = false;
        ui.dexOnlyShiny = false;
        if (elDexOnlyMissing) elDexOnlyMissing.checked = false;
        if (elDexOnlyShiny) elDexOnlyShiny.checked = false;
      }
      markDexDirty(true);
    });
  }

  if (elDexOnlyMissing) {
    elDexOnlyMissing.checked = ui.dexOnlyMissing;
    elDexOnlyMissing.addEventListener("change", () => {
      ui.dexOnlyMissing = Boolean(elDexOnlyMissing.checked);
      if (ui.dexOnlyMissing) {
        ui.dexOnlyCaught = false;
        ui.dexOnlyShiny = false;
        if (elDexOnlyCaught) elDexOnlyCaught.checked = false;
        if (elDexOnlyShiny) elDexOnlyShiny.checked = false;
      }
      markDexDirty(true);
    });
  }

  if (elDexOnlyShiny) {
    elDexOnlyShiny.checked = ui.dexOnlyShiny;
    elDexOnlyShiny.addEventListener("change", () => {
      ui.dexOnlyShiny = Boolean(elDexOnlyShiny.checked);
      if (ui.dexOnlyShiny) {
        ui.dexOnlyCaught = false;
        ui.dexOnlyMissing = false;
        if (elDexOnlyCaught) elDexOnlyCaught.checked = false;
        if (elDexOnlyMissing) elDexOnlyMissing.checked = false;
      }
      markDexDirty(true);
    });
  }

  if (elDexPrev) {
    elDexPrev.addEventListener("click", () => {
      ui.dexPage -= 1;
      markDexDirty(false);
    });
  }

  if (elDexNext) {
    elDexNext.addEventListener("click", () => {
      ui.dexPage += 1;
      markDexDirty(false);
    });
  }
}
