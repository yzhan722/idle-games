import {
  ATLAS_ELEMENTS,
  ATLAS_ELEMENT_ZH,
  buildShinyShareText,
  computeElementalBondResonance,
  computeShinyShowcaseAura,
  SHINY_SHOWCASE_MAX,
  shinyGalleryEntries,
  shinyUniqueCount,
  syncShinyGalleryFromMons,
} from "../systems/collection_fun.js";
import { typeZh } from "../systems/gameplay_fun.js";
import { ZONE_IDS, ZONE_LABELS } from "../beast_defs.js";
import { renderDexStageHtml, setHtmlPreservingStage } from "./tab_stages.js";
import { renderResSvg, renderUiIcon } from "./rpg_svg_icons.js";

export function createRenderDex({
  elDexSummary,
  elDexList,
  elDexPrev,
  elDexNext,
  elDexPageInfo,
  elDexArea,
  elDexRegionInfo,
  ui,
  defs,
  getState,
  clamp,
  pad3,
  escapeHtml,
  renderBeastIcon,
  dexCaughtCount,
  computeDexEffects,
  getCaptureAreas,
  canClaimDexRegion,
  markDexRegionClaimed,
}) {
  return function renderDex() {
    const state = getState();
    if (!elDexSummary || !elDexList || !elDexPrev || !elDexNext || !elDexPageInfo) return;
    if (ui.activeTab !== "dex") return;
    if (!ui.dexDirty) return;

    syncShinyGalleryFromMons(state);

    const totalSpecies = defs.beasts.length;
    const { unique, total } = dexCaughtCount();
    const dexEff = computeDexEffects();
    const dexPct = totalSpecies > 0 ? Math.round((unique / totalSpecies) * 100) : 0;
    const shinyCount = Math.max(0, Math.floor(Number.isFinite(state.shinyCount) ? state.shinyCount : 0));
    const shinyUnique = shinyUniqueCount(state);
    const shinyFromMons = Array.isArray(state.mons?.list)
      ? state.mons.list.filter((m) => m && m.isShiny).length
      : 0;
    const shinyShow = Math.max(shinyCount, shinyFromMons, shinyUnique);

    const areas = getCaptureAreas();
    const areaId = ui.dexAreaId || "all";
    const area = areaId === "all" ? null : areas.find((a) => a.id === areaId) ?? null;
    if (areaId !== "all" && !area) ui.dexAreaId = "all";

    let regionGoalHtml = "";
    if (area && typeof area.pool === "function") {
      const regionPool = defs.beasts.filter(area.pool);
      const regionTotal = regionPool.length;
      let regionCaught = 0;
      const caughtMap = state.dex?.caught || {};
      for (const p of regionPool) {
        if (typeof caughtMap[p.id] === "number" && caughtMap[p.id] > 0) regionCaught += 1;
      }
      const regionPct = regionTotal > 0 ? Math.round((regionCaught / regionTotal) * 100) : 0;
      const regionDone = regionTotal > 0 && regionCaught >= regionTotal;
      if (!state.meta || typeof state.meta !== "object") state.meta = {};
      const canClaim = regionDone && canClaimDexRegion(state.meta, area.id);
      const claimed = regionDone && !canClaimDexRegion(state.meta, area.id);
      regionGoalHtml = `
        <div class="row__desc">区域目标：${escapeHtml(area.name)} ${regionCaught}/${regionTotal}（${regionPct}%）
          ${regionDone ? `<span class="badge badge--ok">区域完成</span>` : ""}
          ${canClaim ? `<button type="button" class="btn btn--small btn--primary" data-dex-claim-region="${escapeHtml(area.id)}">领取 +10 未来币</button>` : ""}
          ${claimed ? `<span class="badge">已领区域奖</span>` : ""}
        </div>`;
    }

    let nextCatchRightHtml = "";
    {
      const caughtMap = state.dex?.caught || {};
      const pool = area && typeof area.pool === "function" ? defs.beasts.filter(area.pool) : defs.beasts;
      const missing = pool.find((p) => !(typeof caughtMap[p.id] === "number" && caughtMap[p.id] > 0));
      if (missing) {
        nextCatchRightHtml = `<span class="tag">下一推荐：${escapeHtml(missing.name)}</span><button type="button" class="btn btn--small btn--primary" data-dex-goto-capture="1">${renderUiIcon("tab_capture", 14)}<span>去捕捉</span></button>`;
      } else if (dexPct >= 100) {
        nextCatchRightHtml = `<span class="badge badge--ok">当前范围已全收集</span>`;
      }
    }

    const gallery = shinyGalleryEntries(state, 24);
    const shareText = buildShinyShareText(state);
    const tierByPid = (pid) => defs.beasts.find((b) => b.id === pid)?.tier || "common";
    const showcaseAura = computeShinyShowcaseAura(state, tierByPid);
    const showcasedSet = new Set(showcaseAura.pids);
    const pedestalSlotsHtml = Array.from({ length: SHINY_SHOWCASE_MAX }, (_, idx) => {
      const slotEntry = showcaseAura.entries[idx];
      if (slotEntry) {
        return `
          <button type="button" class="shiny-pedestal-slot is-filled tier-${escapeHtml(slotEntry.tier)}" data-dex-showcase-toggle="${escapeHtml(slotEntry.pid)}" title="点击撤下「${escapeHtml(slotEntry.name)}」（${escapeHtml(slotEntry.tierLabel)}星座）">
            <span class="shiny-pedestal-slot__art">${renderBeastIcon(slotEntry.dex, slotEntry.name, true)}</span>
            <span class="shiny-pedestal-slot__name">${escapeHtml(slotEntry.name)}</span>
            <span class="shiny-pedestal-slot__tier">${escapeHtml(slotEntry.tierLabel)}</span>
          </button>`;
      }
      return `
        <div class="shiny-pedestal-slot is-empty">
          <span class="shiny-pedestal-slot__art">${renderResSvg("shinyHall", 22)}</span>
          <span class="shiny-pedestal-slot__name">空置圣座 #${idx + 1}</span>
          <span class="shiny-pedestal-slot__tier">待供奉</span>
        </div>`;
    }).join("");

    const showcaseRackHtml = `
      <div class="shiny-showcase-rack">
        <div class="shiny-showcase-rack__head">
          <div class="shiny-showcase-rack__title">
            ${renderResSvg("shinyHall", 18)}
            <span>闪光殿堂展柜（${showcaseAura.count}/${SHINY_SHOWCASE_MAX} 席）</span>
            ${showcaseAura.fullResonance ? `<span class="badge badge--ok">✦ 六席星芒共鸣生效</span>` : `<span class="tag">满 6 席激活星芒共鸣</span>`}
          </div>
          <div class="shiny-showcase-rack__actions">
            ${gallery.length > 0 ? `<button type="button" class="btn btn--small btn--primary" data-dex-showcase-autofill="1">一键优选满配</button>` : ""}
            ${gallery.length > 0 ? `<button type="button" class="btn btn--small btn--ghost" data-dex-shiny-showcase="all">${renderResSvg("shinyCharm", 14)}<span>全屏殿堂调配</span></button>` : ""}
          </div>
        </div>
        <div class="shiny-showcase-rack__auras">
          <span class="shiny-aura-pill ${showcaseAura.prodAdd > 0 ? "is-on" : ""}">全资源产出 +${Math.round(showcaseAura.prodAdd * 1000) / 10}%</span>
          <span class="shiny-aura-pill ${showcaseAura.trainExpAdd > 0 ? "is-on" : ""}">训练经验 +${Math.round(showcaseAura.trainExpAdd * 1000) / 10}%</span>
          <span class="shiny-aura-pill ${showcaseAura.catchAdd > 0 ? "is-on" : ""}">全局捕获率 +${Math.round(showcaseAura.catchAdd * 1000) / 10}%</span>
        </div>
        <div class="shiny-pedestal-grid">${pedestalSlotsHtml}</div>
      </div>`;

    const galleryHtml =
      gallery.length > 0
        ? `<div class="row__desc" style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:6px">
            ${gallery
              .map(
                (e) =>
                  `<button type="button" class="shiny-gallery-chip ${showcasedSet.has(e.pid) ? "is-showcased" : ""}" data-dex-showcase-toggle="${escapeHtml(e.pid)}" title="${showcasedSet.has(e.pid) ? "已在展柜供奉 · 点击撤下" : "点击供奉至闪光展柜"}">${renderBeastIcon(e.dex, e.name, true)}<span class="shiny-gallery-chip__name">${escapeHtml(e.name)}${showcasedSet.has(e.pid) ? " ★展" : ""}</span></button>`
              )
              .join("")}
            <button type="button" class="btn btn--small btn--ghost" data-dex-shiny-share data-share="${escapeHtml(shareText)}">${renderUiIcon("tab_social", 14)}<span>复制分享</span></button>
            <button type="button" class="btn btn--small btn--ghost" data-dex-shiny-card>${renderUiIcon("tab_dex", 14)}<span>保存分享卡</span></button>
          </div>`
        : `<div class="row__desc muted">闪光馆空空如也 — 捕捉或孵出闪光后即可点亮图鉴并供奉至 6 席星芒展柜，永久提供全队产出、训练经验与捕获率光环。</div>`;

    const dexStageHtml = renderDexStageHtml({
      state,
      defs,
      unique,
      totalSpecies,
      dexPct,
      shinyUnique,
      dexEff,
      gallery,
      renderBeastIcon,
      escapeHtml,
    });

    const bondResonance = computeElementalBondResonance(state);
    const activeElemFilter = typeof ui.dexElemFilter === "string" ? ui.dexElemFilter : "";
    const elemStripHtml = ATLAS_ELEMENTS.map((el) => {
      const cnt = bondResonance.elemSpeciesCounts[el] || 0;
      const isSel = activeElemFilter === el;
      return `<button type="button" class="bond-elem-chip type-${escapeHtml(el)} ${isSel ? "is-active" : ""}" data-bond-elem-filter="${escapeHtml(el)}" title="点击按「${escapeHtml(ATLAS_ELEMENT_ZH[el] || el)}」属性筛选图鉴">
        <span class="badge type type-${escapeHtml(el)}">${escapeHtml(ATLAS_ELEMENT_ZH[el] || el)}</span>
        <span class="bond-elem-chip__cnt">已录 ${cnt} 种</span>
      </button>`;
    }).join("");

    const pairBarInnerHtml = bondResonance.activePair.valid
      ? `
        <div class="bond-pair-slots">
          ${bondResonance.activePair.mons
            .map(
              (pm, idx) => `
              <span class="bond-pair-mon">
                ${renderBeastIcon(pm.dex, pm.name, pm.isShiny)}
                <span>${idx === 0 ? "契灵A" : "契灵B"} · ${escapeHtml(pm.name)} Lv.${pm.lvl}${pm.stars > 0 ? ` (${pm.stars}星)` : ""}</span>
              </span>`,
            )
            .join('<span class="bond-pair-link">+</span>')}
          ${
            bondResonance.activePair.pairAmpActive
              ? `<span class="badge badge--ok">双灵结契共鸣生效</span>`
              : `<span class="tag">需覆盖主星图至少 2 种元素激活增幅</span>`
          }
        </div>`
      : `<span class="muted">暂未结契双灵 — 选定 2 只契合主星图元素的伙伴结契，可额外激发全局产出、攻防速与捕获加成。</span>`;

    const bondCardsHtml = bondResonance.bonds
      .map((b) => {
        const tierLabel = b.tier === 3 ? "III阶·星冕" : b.tier === 2 ? "II阶·谐振" : b.tier === 1 ? "I阶·初鸣" : "未点亮";
        const elemTags = b.elements
          .map(
            (el) =>
              `<span class="badge type type-${escapeHtml(el)}">${escapeHtml(ATLAS_ELEMENT_ZH[el] || el)} ${b.elemCounts[el] || 0}</span>`,
          )
          .join("");
        const bonusParts = [];
        if (b.bonus.prodAdd > 0) bonusParts.push(`产出+${Math.round(b.bonus.prodAdd * 1000) / 10}%`);
        if (b.bonus.atkAdd > 0) bonusParts.push(`攻+${Math.round(b.bonus.atkAdd * 1000) / 10}%`);
        if (b.bonus.defAdd > 0) bonusParts.push(`防+${Math.round(b.bonus.defAdd * 1000) / 10}%`);
        if (b.bonus.speAdd > 0) bonusParts.push(`速+${Math.round(b.bonus.speAdd * 1000) / 10}%`);
        if (b.bonus.trainExpAdd > 0) bonusParts.push(`历练+${Math.round(b.bonus.trainExpAdd * 1000) / 10}%`);
        if (b.bonus.catchAdd > 0) bonusParts.push(`捕获+${Math.round(b.bonus.catchAdd * 1000) / 10}%`);

        return `
          <div class="bond-atlas-card ${b.tier > 0 ? "is-unlocked" : "is-locked"} ${b.isAttuned ? "is-attuned" : ""}">
            <div class="bond-atlas-card__top">
              <div class="bond-atlas-card__nameWrap">
                <span class="bond-atlas-card__name">${escapeHtml(b.name)}</span>
                <span class="tag ${b.tier > 0 ? "tag--bond-on" : ""}">${escapeHtml(tierLabel)}</span>
                ${b.isAttuned ? `<span class="badge badge--ok">主星图 ×1.5</span>` : ""}
              </div>
              <div class="bond-atlas-card__sub">${escapeHtml(b.subtitle)}</div>
            </div>
            <div class="bond-atlas-card__elems">${elemTags}<span class="tag">升星伙伴 ${b.starredCount}</span></div>
            <div class="bond-atlas-card__bonus">
              ${
                b.tier > 0
                  ? escapeHtml(bonusParts.join(" · "))
                  : "集齐该图谱各系至少 1 种萌灵即可点亮 I 阶共鸣"
              }
            </div>
            <div class="bond-atlas-card__foot">
              <span class="bond-atlas-card__req">${escapeHtml(b.nextReqText)}</span>
              ${
                b.tier > 0 && !b.isAttuned
                  ? `<button type="button" class="btn btn--small" data-bond-attune="${escapeHtml(b.id)}">设为主星图</button>`
                  : b.isAttuned
                    ? `<span class="tag">当前主共鸣</span>`
                    : ""
              }
            </div>
          </div>`;
      })
      .join("");

    const bondMilestonesHtml = bondResonance.milestones
      .map((ms) => {
        const rwText = Object.entries(ms.rewards)
          .map(([k, v]) => {
            if (k === "futurecoin") return `未来币+${v}`;
            if (k === "expCandy") return `历练糖丸+${v}`;
            if (k === "evolutionStone") return `灵晶石+${v}`;
            if (k === "rareCandy") return `跃级糖丸+${v}`;
            if (k === "linkRope") return `灵契绳+${v}`;
            if (k === "shinyCharm") return `虹彩护符+${v}`;
            return `${k}+${v}`;
          })
          .join("、");
        if (ms.canClaim) {
          return `<button type="button" class="btn btn--small btn--primary" data-bond-claim-mile="${escapeHtml(ms.id)}">领取 ${escapeHtml(ms.label)}（${escapeHtml(rwText)}）</button>`;
        }
        return `<span class="bond-mile-pill ${ms.claimed ? "is-claimed" : ""}">${escapeHtml(ms.label)} · ${ms.claimed ? "已领取" : escapeHtml(rwText)}</span>`;
      })
      .join("");

    const monCountOwned = Array.isArray(state.mons?.list) ? state.mons.list.filter(Boolean).length : 0;
    const bondAtlasHtml = `
      <div class="row bond-atlas-panel">
        <div class="row__left" style="width:100%">
          <div class="bond-atlas-head">
            <div class="row__title row__titleLine">
              ${renderResSvg("bondAtlas", 20)}
              <span>属性羁绊共鸣图谱</span>
              <span class="tag">已点亮 ${bondResonance.unlockedBondsCount}/${bondResonance.totalBondsCount} 组</span>
              <span class="tag">共鸣总阶 ${bondResonance.totalTierScore}/${bondResonance.maxTierScore}</span>
              ${activeElemFilter ? `<button type="button" class="btn btn--small btn--ghost" data-bond-elem-filter="clear">清除属性筛选</button>` : ""}
            </div>
            <div class="bond-atlas-actions">
              <button type="button" class="btn btn--small btn--primary" data-bond-autofill="1" ${bondResonance.unlockedBondsCount > 0 || monCountOwned >= 2 ? "" : "disabled"}>一键优选共鸣</button>
              <button type="button" class="btn btn--small" data-bond-open-pair="1" ${monCountOwned >= 2 ? "" : "disabled"}>${renderResSvg("duoCombo", 14)}<span>调配结契双灵</span></button>
            </div>
          </div>
          <div class="bond-elem-strip">${elemStripHtml}</div>
          <div class="bond-atlas-auras">
            <span class="shiny-aura-pill ${bondResonance.prodAdd > 0 ? "is-on" : ""}">全资源产出 +${Math.round(bondResonance.prodAdd * 1000) / 10}%</span>
            <span class="shiny-aura-pill ${bondResonance.atkAdd > 0 || bondResonance.defAdd > 0 || bondResonance.speAdd > 0 ? "is-on" : ""}">战斗加成 攻+${Math.round(bondResonance.atkAdd * 1000) / 10}% · 防+${Math.round(bondResonance.defAdd * 1000) / 10}% · 速+${Math.round(bondResonance.speAdd * 1000) / 10}%</span>
            <span class="shiny-aura-pill ${bondResonance.trainExpAdd > 0 ? "is-on" : ""}">训练经验 +${Math.round(bondResonance.trainExpAdd * 1000) / 10}%</span>
            <span class="shiny-aura-pill ${bondResonance.catchAdd > 0 ? "is-on" : ""}">全局捕获率 +${Math.round(bondResonance.catchAdd * 1000) / 10}%</span>
          </div>
          <div class="bond-active-pair-bar">
            <span class="bond-active-pair-label">${renderResSvg("duoCombo", 16)}<span>结契双灵</span></span>
            ${pairBarInnerHtml}
          </div>
          <div class="bond-atlas-grid">${bondCardsHtml}</div>
          <div class="bond-atlas-milestones">${bondMilestonesHtml}</div>
        </div>
      </div>`;

    setHtmlPreservingStage(
      elDexSummary,
      `
      ${dexStageHtml}
      <div class="row dex-summary">
        <div class="row__left">
          <div class="row__title row__titleLine">
            ${renderResSvg("shinyCharm", 18)}<span>闪光馆与收集进度</span>
            <span class="tag">已登记 ${unique}/${totalSpecies} (${dexPct}%)</span>
            <span class="tag">总捕获 ${total}</span>
            ${shinyUnique > 0 ? `<span class="tag">闪光 ${shinyUnique}</span>` : ""}
          </div>
          ${regionGoalHtml}
          ${showcaseRackHtml}
          ${galleryHtml}
        </div>
        <div class="row__right">
          ${nextCatchRightHtml}
        </div>
      </div>
      ${bondAtlasHtml}
    `,
    );

    const caught = state.dex.caught;
    const q = (ui.dexQuery || "").trim();
    const onlyCaught = Boolean(ui.dexOnlyCaught);
    const onlyMissing = Boolean(ui.dexOnlyMissing);
    const onlyShiny = Boolean(ui.dexOnlyShiny);
    const shinyMap = state.dex?.shiny && typeof state.dex.shiny === "object" ? state.dex.shiny : {};

    if (elDexArea) {
      const allSelected = (ui.dexAreaId || "all") === "all";
      elDexArea.innerHTML = [`<option value="all" ${allSelected ? "selected" : ""}>所有区域</option>`]
        .concat(
          areas.map((a) => {
            const sel = a.id === ui.dexAreaId;
            const suffix = a.unlocked ? "" : "（未解锁）";
            return `<option value="${a.id}" ${sel ? "selected" : ""}>${escapeHtml(a.name)}${suffix}</option>`;
          })
        )
        .join("");
    }

    if (elDexRegionInfo) {
      const label = area ? area.name : "所有区域";
      elDexRegionInfo.textContent = onlyShiny ? `闪光收藏 · ${label}` : `当前区域：${label}`;
    }

    const poolFn = area ? area.pool : null;
    const elemFilter = typeof ui.dexElemFilter === "string" ? ui.dexElemFilter : "";
    const typesMapForFilter = globalThis.BEAST_TYPES ?? {};

    const filtered = defs.beasts.filter((p) => {
      if (poolFn && !poolFn(p)) return false;
      if (elemFilter) {
        const pt = Array.isArray(typesMapForFilter[p.dex]) ? typesMapForFilter[p.dex] : [];
        if (!pt.includes(elemFilter)) return false;
      }
      if (onlyShiny) return Boolean(shinyMap[p.id]);
      const n = typeof caught[p.id] === "number" ? caught[p.id] : 0;
      const seen = n > 0;
      if (onlyMissing && seen) return false;
      if (!onlyMissing && onlyCaught && !seen) return false;
      if (!q) return true;
      const qLower = q.toLowerCase();
      const dexStr = String(p.dex);
      const orderStr = String(p.order || p.dex);
      if (dexStr === qLower || pad3(p.dex) === qLower || orderStr === qLower || pad3(p.order || p.dex) === qLower) return true;
      if (p.title && p.title.toLowerCase().includes(qLower)) return true;
      return p.name.toLowerCase().includes(qLower);
    });

    const pageSize = ui.dexPageSize;
    const maxPage = Math.max(0, Math.ceil(filtered.length / pageSize) - 1);
    ui.dexPage = clamp(ui.dexPage, 0, maxPage);

    const start = ui.dexPage * pageSize;
    const slice = filtered.slice(start, start + pageSize);

    if (elDexPageInfo) {
      elDexPageInfo.textContent = `第 ${ui.dexPage + 1}/${maxPage + 1} 页（共 ${filtered.length} 条）`;
    }
    if (elDexPrev) elDexPrev.disabled = ui.dexPage <= 0;
    if (elDexNext) elDexNext.disabled = ui.dexPage >= maxPage;

    const typesMap = globalThis.BEAST_TYPES ?? {};
    const TIER_LABELS = { common: "常见", uncommon: "少见", rare: "稀有", epic: "史诗" };

    const rows = [];
    for (const p of slice) {
      const n = typeof caught[p.id] === "number" ? caught[p.id] : 0;
      const seen = n > 0;
      const isShinyEntry = Boolean(shinyMap[p.id]);
      const revealMissing = onlyMissing;
      const locked = !seen && !revealMissing && !isShinyEntry;
      const displayNo = pad3(p.order || p.dex);
      const title = locked ? "????" : p.name;
      const subtitleTag = !locked && p.title ? `<span class="beast-title-tag">【${escapeHtml(p.title)}】</span>` : "";
      const zoneId = ZONE_IDS[p.zone] || "meadow";
      const zoneName = ZONE_LABELS[zoneId] || "芽芽草甸";
      const tierLabel = TIER_LABELS[p.tier] || "常见";
      const pTypes = Array.isArray(typesMap[p.dex]) ? typesMap[p.dex] : [];
      const typeBadgesHtml = !locked
        ? pTypes
            .map((t) => `<span class="badge type type-${escapeHtml(t)}">${escapeHtml(typeZh(t))}</span>`)
            .join("")
        : "";
      const loreHtml = locked
        ? `<div class="row__desc dex-lore muted">栖息地线索：${escapeHtml(zoneName)} · 探索捕捉后解锁《星野灵兽录》生态传记。</div>`
        : p.desc
          ? `<div class="row__desc dex-lore">${escapeHtml(p.desc)}</div>`
          : "";

      const icon = locked
        ? `<span class="dex-silhouette" aria-hidden="true">${renderBeastIcon(p.dex, "未知萌灵", false)}</span>`
        : renderBeastIcon(p.dex, p.name, isShinyEntry);

      rows.push(`
        <div class="row dex-card ${locked ? "is-locked" : ""}">
          <div class="row__left">
            <div class="row__title row__titleLine">${icon}<span>No.${displayNo} ${escapeHtml(title)}</span>${subtitleTag}${isShinyEntry ? ' <span class="badge badge--ok">★ 闪光</span>' : ""}${typeBadgesHtml}</div>
            ${loreHtml}
          </div>
          <div class="row__right">
            <div class="badge badge--muted">${escapeHtml(zoneName)} · ${escapeHtml(tierLabel)}</div>
            <div class="badge ${isShinyEntry ? "badge--ok" : seen ? "badge--ok" : "badge--muted"}">${isShinyEntry ? `已捕获 ${n} · ★` : seen ? `已捕获 ${n}` : "未登记"}</div>
            ${!seen ? `<button type="button" class="btn btn--small" data-dex-goto-capture="${escapeHtml(p.id)}">去捕捉</button>` : ""}
          </div>
        </div>
      `);
    }

    elDexList.innerHTML = rows.join("");
    ui.dexDirty = false;
  };
}
