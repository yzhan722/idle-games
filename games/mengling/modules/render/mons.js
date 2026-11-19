import {
  BOX_SOFT_LIMIT,
  busyMonIds,
  pickWeakMonIds,
} from "../systems/mon_release.js";
import {
  describeMintTuning,
  formatMonNatureWithTuning,
  getNatureInfo,
  MINT_TUNING_PRESETS,
  normalizeMintTuning,
} from "../mons.js";
import { getAbilityInfo } from "../abilities.js";
import {
  IMPLEMENTED_SKILL_TYPES,
  TYPE_SKILL_DESC,
  isSkillImplemented,
  listActiveSkillBuffs,
} from "../type_skills.js";
import { beastZone, ZONE_INDEX } from "../beast_defs.js";
import {
  getMonBoutiqueBonus,
  getMonNocturnalFormBonus,
  getMonPrimalImprintBonus,
  getNightObservatoryStationedMonIds,
  getSkyIslandCrewMonIds,
  getTreasureIslandDef,
  getTreasureVoyageCrewMonIds,
  getWishDockAwayMonIds,
  getHotSpringPoolOfMon,
  getHotSpringSoakingMonIds,
  getPostMessengerMonIds,
  getAwayActivityMap,
  getDreamBookDef,
  getDreamLibraryDreamerIds,
  getFishingAnglerMonIds,
  getBakeryStationOfMon,
  getBalloonTravelerMonIds,
  getCloudParkRideOfMon,
  getStargazeCamperMonIds,
  getIceRinkSkaterMonIds,
  getBeeKeeperMonIds,
} from "../systems/collection_fun.js";
import {
  BAND_PARTS,
  getBalloonIsleDef,
  getFishingSection,
  getMigrantDef,
  getMigrantFriendMonIds,
  getPostRouteDef,
  getStargazeSiteDef,
  getIceRinkProgramDef,
  getBeeHiveDef,
} from "../systems/pve_tower.js";
import { renderMonsStageHtml, setHtmlPreservingStage } from "./tab_stages.js";
import { renderResSvg, renderUiIcon } from "./rpg_svg_icons.js";

export function createRenderMons({
  elMonList,
  elMonDetail,
  elMonBack,
  elMonRegion,
  elMonType,
  elMonPrev,
  elMonNext,
  elMonPageInfo,
  ui,
  clamp,
  escapeHtml,
  pad3,
  renderBeastIcon,
  TYPE_ZH,
  TYPE_SKILLS,
  monPower,
  clampStar,
  renderStars,
  getStarUpgradeNeed,
  getStarUpgradeGate,
  meetsStarUpgradeGate,
  isSameEvoFamily,
  getMonCurrentStats,
  expNeedForLevel,
  getBeastDataByDex,
  getEvoMap,
  stageIndex,
  getSpeciesByPid,
  getEvoReqLevel,
  defaultReqLvlByStage,
  isTradeEvo,
  isAffectionEvo,
  getState,
}) {
  return function renderMons() {
    const state = getState();
    if (!elMonList || !elMonDetail || !elMonBack) return;
    if (ui.activeTab !== "mons") return;
    if (!ui.monsDirty) return;

    const list = state.mons?.list ?? [];
    const selectedId = ui.monSelectedId;
    const selected = typeof selectedId === "number" ? list.find((m) => m.id === selectedId) : null;

    const showDetail = Boolean(selected);
    const actBar = elMonBack.closest?.(".actions");
    if (actBar) {
      actBar.classList.toggle("is-detail-mode", showDetail);
      if (showDetail && elMonDetail?.parentElement && actBar.parentElement !== elMonDetail.parentElement) {
        elMonDetail.parentElement.insertBefore(actBar, elMonDetail);
      }
    }
    elMonBack.hidden = !showDetail;
    elMonDetail.hidden = !showDetail;
    elMonList.hidden = showDetail;

    if (elMonRegion) elMonRegion.disabled = showDetail;
    if (elMonType) elMonType.disabled = showDetail;
    if (elMonPrev) elMonPrev.disabled = showDetail;
    if (elMonNext) elMonNext.disabled = showDetail;
    if (elMonPageInfo && showDetail) elMonPageInfo.textContent = "";

    if (!showDetail) {
      let prevStarUpBodyScrollTop = 0;
      try {
        const prevBody = elMonList.querySelector('.modalOverlay[data-mon-starup-overlay="1"] .modal__body');
        if (prevBody) prevStarUpBodyScrollTop = prevBody.scrollTop;
      } catch {}

      const rows = [];
      let starUpModalHtml = "";

      const fmtRemain = (sec) => {
        const s = Math.max(0, Math.ceil(typeof sec === "number" && Number.isFinite(sec) ? sec : 0));
        const mm = Math.floor(s / 60);
        const ss = s % 60;
        const pad2 = (x) => String(x).padStart(2, "0");
        return `${mm}:${pad2(ss)}`;
      };

      const hasResearch = Boolean(state.research && typeof state.research === "object" && state.research.tid);
      const anyPlanting = Array.isArray(state.mons?.list) && state.mons.list.some((x) => x && x.skillActiveType === "grass" && (x.skillActiveRemainingSec ?? 0) > 0);
      const eggRemain0 =
        typeof state.breeding?.eggRemainingSec === "number" && Number.isFinite(state.breeding.eggRemainingSec) ? state.breeding.eggRemainingSec : 0;
      const eggOn = Boolean(state.breeding?.on) && eggRemain0 > 0;

      const region = ui.monRegion || "all";
      const typeFilter = ui.monType || "all";
      const searchQ = typeof ui.monSearch === "string" ? ui.monSearch.trim().toLowerCase() : "";
      const regionOk = (m) => {
        if (!m || typeof m.dex !== "number") return false;
        if (region === "all") return true;
        return beastZone(m.dex) === ZONE_INDEX[region];
      };

      const typeOk = (m) => {
        if (!m || typeof m.dex !== "number") return false;
        if (typeFilter === "all") return true;
        const api = getBeastDataByDex(m.dex);
        const types = Array.isArray(api?.types) ? api.types : null;
        if (!types) return true;
        return types.includes(typeFilter);
      };

      const searchOk = (m) => {
        if (!searchQ) return true;
        const name = typeof m?.name === "string" ? m.name.toLowerCase() : "";
        return name.includes(searchQ);
      };

      const filtered = list.filter((m) => regionOk(m) && typeOk(m) && searchOk(m)).sort((a, b) => {
        const sort = ui.monSort || "created";
        if (sort === "dex") {
          return a.dex - b.dex;
        }
        if (sort === "lvl") {
          return b.lvl - a.lvl;
        }
        if (sort === "power") {
          return monPower(b) - monPower(a);
        }
        if (sort === "satiety") {
          const sa = clamp(typeof a.satiety === "number" ? a.satiety : 100, 0, 100);
          const sb = clamp(typeof b.satiety === "number" ? b.satiety : 100, 0, 100);
          return sa - sb; // 饱腹度升序，最饿的排最前
        }
        return (b.created ?? 0) - (a.created ?? 0);
      });
      const total = filtered.length;
      const pageSize = Math.max(1, Math.floor(ui.monPageSize || 20));
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      ui.monPage = clamp(Math.floor(ui.monPage || 0), 0, totalPages - 1);

      const pageStart = ui.monPage * pageSize;
      const pageItems = filtered.slice(pageStart, pageStart + pageSize);

      ui.monPageIds = pageItems.map((m) => m.id);

      const canFeedAll =
        (state.res?.catnip?.value ?? 0) >= 100 &&
        filtered.some((m) => clamp(typeof m?.satiety === "number" ? m.satiety : 100, 0, 100) < 100);
      const feedAllCount = filtered.filter((m) => clamp(typeof m?.satiety === "number" ? m.satiety : 100, 0, 100) < 100).length;
      const hungryCount = filtered.filter((m) => clamp(typeof m?.satiety === "number" ? m.satiety : 100, 0, 100) < 50).length;
      const canFeedHungry =
        (state.res?.catnip?.value ?? 0) >= 100 && hungryCount > 0;
      const skillReadyCount = filtered.filter((m) => {
        const sat0 = clamp(typeof m?.satiety === "number" ? m.satiety : 100, 0, 100);
        if (sat0 < 50) return false;
        const cd = typeof m?.skillCdRemainingSec === "number" && Number.isFinite(m.skillCdRemainingSec) ? Math.max(0, m.skillCdRemainingSec) : 0;
        return cd <= 0;
      }).length;

      const candyHave = Math.max(0, Math.floor(state.res.rareCandy?.value ?? 0));
      const candyTargets = filtered.filter((m) => m && m.lvl < 100);
      const canBatchCandy = candyHave >= 1 && candyTargets.length > 0;
      const batchCandyCount = Math.min(candyHave, candyTargets.length);

      const evoMap = typeof getEvoMap === "function" ? getEvoMap() : {};
      let evoReadyCount = 0;
      let firstEvoMonId = null;
      for (const m of filtered) {
        if (!m || typeof m !== "object") continue;
        const outs = evoMap[m.pid];
        if (!Array.isArray(outs) || outs.length === 0) continue;
        const ready = outs.some((toPid) => {
          const reqLvl = typeof getEvoReqLevel === "function" ? getEvoReqLevel(m.pid, toPid) : 0;
          return (m.lvl || 0) >= (reqLvl || 0);
        });
        if (ready) {
          evoReadyCount += 1;
          if (firstEvoMonId == null) firstEvoMonId = m.id;
        }
      }
      ui._monsFirstEvoId = firstEvoMonId;

      const REGION_LABELS = {
        all: "全部地区",
        meadow: "芽芽草甸",
        woods: "蜜露林径",
        brook: "溪光浅滩",
        plateau: "风铃高原",
        dunes: "星砂荒漠",
        garden: "月见花园",
        ridge: "霜晶山脊",
        hollow: "龙眠幽谷",
        sanctum: "幻梦秘境",
      };
      const TYPE_ZH_MAP = TYPE_ZH && typeof TYPE_ZH === "object" ? TYPE_ZH : {};
      const SORT_LABELS = { created: "获取时间", dex: "图鉴", lvl: "等级", power: "战力", satiety: "饱腹" };
      const filterChips = [];
      if (region !== "all") filterChips.push(`地区：${REGION_LABELS[region] ?? region}`);
      if (typeFilter !== "all") filterChips.push(`属性：${TYPE_ZH_MAP[typeFilter] ?? typeFilter}`);
      if (searchQ) filterChips.push(`搜索：${searchQ}`);
      if ((ui.monSort || "created") !== "created") {
        const sortLabel = SORT_LABELS[ui.monSort || "created"] ?? ui.monSort;
        filterChips.push(`排序：${sortLabel}`);
      }

      // 批量技能：统计各属性可用萌灵数（18 系全开）
      const BATCH_SKILL_TYPES = IMPLEMENTED_SKILL_TYPES;
      const batchSkillCounts = {};
      const batchSkillCooldownCounts = {}; // 冷却中的数量
      const expOn =
        Boolean(state.expedition?.on) &&
        (typeof state.expedition?.remainingSec === "number" ? state.expedition.remainingSec : 0) > 0;
      for (const t of BATCH_SKILL_TYPES) {
        const cnt = filtered.filter((m) => {
          const sat0 = clamp(typeof m.satiety === "number" ? m.satiety : 100, 0, 100);
          if (sat0 < 50) return false;
          const cd = typeof m.skillCdRemainingSec === "number" && Number.isFinite(m.skillCdRemainingSec) ? Math.max(0, m.skillCdRemainingSec) : 0;
          if (cd > 0) return false;
          const api = getBeastDataByDex(m.dex);
          const types = Array.isArray(api?.types) ? api.types : [];
          return types.includes(t);
        }).length;
        if (cnt > 0) batchSkillCounts[t] = cnt;
        // 统计冷却中但有资格的萌灵数量
        const cdCnt = filtered.filter((m) => {
          const sat0 = clamp(typeof m.satiety === "number" ? m.satiety : 100, 0, 100);
          if (sat0 < 50) return false;
          const cd = typeof m.skillCdRemainingSec === "number" && Number.isFinite(m.skillCdRemainingSec) ? Math.max(0, m.skillCdRemainingSec) : 0;
          if (cd <= 0) return false; // 已就绪的不算这里
          const api = getBeastDataByDex(m.dex);
          const types = Array.isArray(api?.types) ? api.types : [];
          return types.includes(t);
        }).length;
        if (cdCnt > 0) batchSkillCooldownCounts[t] = cdCnt;
      }
      const hasBatchSkill = Object.keys(batchSkillCounts).length > 0 || Object.keys(batchSkillCooldownCounts).length > 0;
      const batchReleaseIds = pickWeakMonIds(filtered, {
        protectIds: busyMonIds(state),
        smartProtect: true,
      });
      const canBatchRelease = batchReleaseIds.length > 0;

      if (elMonPageInfo) {
        elMonPageInfo.textContent = `第 ${ui.monPage + 1}/${totalPages} 页（共 ${total} 只）`;
      }
      if (elMonPrev) elMonPrev.disabled = ui.monPage <= 0;
      if (elMonNext) elMonNext.disabled = ui.monPage >= totalPages - 1;

      rows.push(
        renderMonsStageHtml({
          list,
          evoReadyCount,
          hungryCount,
          skillReadyCount,
          renderBeastIcon,
          monPower,
          escapeHtml,
        }),
      );

      if (total > 80) {
        rows.push(`
          <div class="row row--full is-locked">
            <div class="row__left">
              <div class="row__title">盒子较满（${total} 只）</div>
              <div class="row__desc">低战力萌灵可放生换取跃级糖丸；智能放生会保留闪光、稀有及以上、高星、忙碌萌灵，以及同种/同进化系最后一只。</div>
            </div>
          </div>
        `);
      }

      rows.push(`
        <div class="row row--full mons-toolbar-row">
          <div class="row__left" style="flex:1 1 240px">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
              <input class="input input--search" data-mon-search type="search" placeholder="搜索萌灵名称…" value="${escapeHtml(searchQ)}" style="max-width:220px" />
              <span class="row__desc">技能就绪 <strong>${skillReadyCount}</strong> 只 · 跃级糖丸 <strong>${candyHave}</strong>${evoReadyCount > 0 ? ` · 可进化 <strong>${evoReadyCount}</strong> 只` : ""}</span>
            </div>
            ${filterChips.length ? `<div class="filter-chips">${filterChips.map((c) => `<span class="filter-chip">${escapeHtml(c)}</span>`).join("")}</div>` : ""}
          </div>
          <div class="row__right">
            <button class="btn btn--small${evoReadyCount > 0 ? ' btn--warning' : ''}" data-mons-focus-evo="1" ${evoReadyCount > 0 ? "" : "disabled"}>${renderUiIcon("shinySparkle", 14)} 查看可进化${evoReadyCount > 0 ? `（${evoReadyCount}）` : ""}</button>
            <button class="btn btn--small" data-mon-batch-candy="1" ${canBatchCandy ? "" : "disabled"}>${renderResSvg("rareCandy", 14)} 各喂1糖${canBatchCandy ? `（${batchCandyCount}只）` : ""}</button>
            <button class="btn btn--small btn--danger" data-mon-batch-release="1" ${canBatchRelease ? "" : "disabled"}>${renderUiIcon("speciesTag", 14)} 批量放生弱宠${canBatchRelease ? `（${batchReleaseIds.length}只）` : ""}</button>
          </div>
        </div>
      `);

      if (hasBatchSkill) {
        // 合并就绪和冷却中的属性
        const allBatchTypes = new Set([...Object.keys(batchSkillCounts), ...Object.keys(batchSkillCooldownCounts)]);
        const batchBtns = [...allBatchTypes].map((t) => {
          const zh = TYPE_ZH_MAP[t] ?? t;
          const readyCnt = batchSkillCounts[t] ?? 0;
          const cdCnt = batchSkillCooldownCounts[t] ?? 0;
          const isReady = readyCnt > 0;
          const label = isReady
            ? `${escapeHtml(zh)}技能 <span class="badge--count">${readyCnt}</span>`
            : `${escapeHtml(zh)}技能 <span style="opacity:0.5;font-size:11px">冷却中(${cdCnt})</span>`;
          return `<button class="btn btn--small type type-${escapeHtml(t)}${isReady ? ' btn--ready' : ''}" data-mon-batch-skill="${escapeHtml(t)}" title="${escapeHtml(TYPE_SKILL_DESC[t] || "")}" ${isReady ? '' : 'disabled'}>${label}</button>`;
        }).join("");
        rows.push(`
          <div class="row row--full mon-batch-skills">
            <div class="row__left">
              <div class="row__title row__titleLine">${renderResSvg("energyDrink", 18)}<span>批量技能</span><span class="tag">冷却完毕一键释放</span></div>
            </div>
            <div class="row__right quickActions">${batchBtns}</div>
          </div>
        `);
      }

      const buffLines = listActiveSkillBuffs(state.skills);
      if (buffLines.length > 0) {
        rows.push(`
          <div class="row row--full">
            <div class="row__left">
              <div class="row__title">技能增益</div>
              <div class="row__desc">${escapeHtml(buffLines.join(" · "))}</div>
            </div>
          </div>
        `);
      }

      if (total === 0) {
        const emptyHint =
          searchQ || region !== "all" || typeFilter !== "all"
            ? "当前筛选无结果，试试放宽地区/属性或清空搜索。"
            : "去「捕捉」页抓一只吧。";
        rows.push(`
          <div class="row row--full is-locked">
            <div class="row__left">
              <div class="row__title">暂无萌灵</div>
              <div class="row__desc">${escapeHtml(emptyHint)}</div>
            </div>
          </div>
        `);
      } else {
        for (const m of pageItems) {
          const power = monPower(m);
          const sat0 = clamp(typeof m.satiety === "number" ? m.satiety : 100, 0, 100);
          const sat = Math.ceil(sat0);
          const aff = Math.floor(clamp(typeof m.affection === "number" ? m.affection : 0, 0, 100));
          const stars = clampStar(m.stars);
          const starsHtml = renderStars(stars);
          const shinyBadge = Boolean(m.isShiny) ? `<span class="badge badge--ok" style="margin-left:6px">闪光</span>` : "";

          const api = getBeastDataByDex(m.dex);
          const types = Array.isArray(api?.types) ? api.types.slice(0, 2) : null;
          const cd = typeof m.skillCdRemainingSec === "number" && Number.isFinite(m.skillCdRemainingSec) ? Math.max(0, m.skillCdRemainingSec) : 0;
          const satOk = sat0 >= 50;
          const activeType = typeof m.skillActiveType === "string" && m.skillActiveType ? m.skillActiveType : null;
          const activeRem =
            typeof m.skillActiveRemainingSec === "number" && Number.isFinite(m.skillActiveRemainingSec) ? Math.max(0, m.skillActiveRemainingSec) : 0;
          const inExpedition =
            Boolean(state.expedition?.on) &&
            (typeof state.expedition?.remainingSec === "number" ? state.expedition.remainingSec : 0) > 0 &&
            Array.isArray(state.expedition?.activeIds) &&
            state.expedition.activeIds.includes(m.id);

          const skillHtml = types
            ? `<div class="monSkills">${types
                .map((t) => {
                  const tSafe = escapeHtml(t);
                  const rawName = TYPE_SKILLS?.[t] ?? "技能";
                  let label = escapeHtml(rawName);
                  let disabled = false;
                  const implemented = isSkillImplemented(t);
                  if (!implemented) {
                    disabled = true;
                    label = `${label}（未实装）`;
                  }
                  if (!satOk) disabled = true;
                  if (cd > 0) {
                    disabled = true;
                    label = `${label} ${fmtRemain(cd)}`;
                  }
                  if (activeType && activeType === t && activeRem > 0) {
                    disabled = true;
                    label = `${label} ${fmtRemain(activeRem)}`;
                  }
                  if (inExpedition) {
                    disabled = true;
                    label = `${label}（远征中）`;
                  }
                  if (t === "electric" && !hasResearch) disabled = true;
                  if (t === "fire" && !eggOn) disabled = true;
                  if (t === "flying" && !expOn) disabled = true;
                  if (t === "water" && !anyPlanting) disabled = true;
                  if (t === "grass" && (state.res.catnip?.value ?? 0) < 10000) disabled = true;
                  const isReady = !disabled;
                  const tip = TYPE_SKILL_DESC[t] ? ` title="${escapeHtml(TYPE_SKILL_DESC[t])}"` : "";
                  return `<button class="btn btn--small type type-${tSafe}${isReady ? ' btn--ready' : ''}" data-mon-skill="${tSafe}" data-mon-skill-mon="${m.id}"${tip} ${disabled ? "disabled" : ""}>${label}</button>`;
                })
                .join("")}</div>`
            : `<div class="badge badge--muted">技能加载中</div>`;

          const starUpOpen = ui.starUpTargetId === m.id;
          const need = getStarUpgradeNeed(stars);
          const gate = getStarUpgradeGate(stars);
          const gateOk = meetsStarUpgradeGate(m, stars);
          // ML-14 统一忙碌排除：外出 / 驻场中的伙伴（码头 / 观察站 / 浮岛 / 远航 / 温泉 / 邮局 / 绘本馆 / 钓鱼会）不能作升星材料，放生按钮禁用
          const awayMap = getAwayActivityMap(state);
          const candidates = (state.mons?.list ?? []).filter(
            (x) => x && x.id !== m.id && isSameEvoFamily(x.pid, m.pid) && !awayMap.has(x.id),
          );
          const selIds = Array.isArray(ui.starUpSelectedIds) ? ui.starUpSelectedIds : [];
          const validSel = selIds.filter((id) => candidates.some((x) => x.id === id));
          const canStarUp =
            stars < 5 && Number.isFinite(need) && need > 0 && gateOk && validSel.length === need;

          const natureName = formatMonNatureWithTuning(m, { compact: true }) || "—";
          const ab = getAbilityInfo(m.ability);
          const mPid = `p${pad3(m.dex)}`;
          const mTitle = globalThis.BEAST_TITLE?.[mPid] || "";
          const mOrder = globalThis.BEAST_ORDER?.[mPid] || m.dex;
          const mTitleHtml = mTitle ? `<span class="beast-title-tag">【${escapeHtml(mTitle)}】</span>` : "";
          const evoOuts = Array.isArray(evoMap[m.pid]) ? evoMap[m.pid] : [];
          const isEvoReady = evoOuts.some((toPid) => {
            const reqLvl = typeof getEvoReqLevel === "function" ? getEvoReqLevel(m.pid, toPid) : 0;
            return (m.lvl || 0) >= (reqLvl || 0);
          });
          const evoBadgeHtml = isEvoReady ? `<span class="badge badge--evo-ready">✦ 可进化</span>` : "";
          const isNatalBond = state?.meta?.natalBondMonId === m.id;
          const nocturnalForm = getMonNocturnalFormBonus(state, m.id);
          const showNatalBtn = isNatalBond || (state?.meta?.legacy?.perks?.natalBond ?? 0) > 0 || Boolean(state?.era?.prestigeUnlocked);
          const natalBadgeHtml = isNatalBond ? `<span class="badge badge--natal">${renderUiIcon("natalBond", 12)}<span>本命灵契</span></span>` : "";
          const nocturnalBadgeHtml = nocturnalForm.hasForm
            ? `<span class="badge badge--nocturnal-form" title="${escapeHtml(nocturnalForm.formDesc)}">${renderUiIcon("nocturnalCrest", 12)}<span>夜行·${escapeHtml(nocturnalForm.formName)}</span></span>`
            : "";
          const cardExtraCls = `${nocturnalForm.hasForm ? " row--nocturnal-form" : ""}${m.isShiny ? " row--shiny-mon" : ""}${m.tier === "epic" ? " row--mythic-mon" : m.tier === "rare" ? " row--rare-mon" : m.tier === "uncommon" ? " row--uncommon-mon" : ""}${isEvoReady ? " row--evo-ready" : ""}`;
          rows.push(`
            <div class="row mon-card${cardExtraCls}">
              <div class="row__left">
                <div class="row__title row__titleLine">${renderBeastIcon(m.dex, m.name, Boolean(m.isShiny))}<span>${escapeHtml(m.name)}</span>${mTitleHtml}${shinyBadge}${natalBadgeHtml}${nocturnalBadgeHtml}${evoBadgeHtml}<span class="tag">No.${pad3(mOrder)}</span><span style="margin-left:auto">${starsHtml}</span></div>
                <div class="row__desc">Lv.${m.lvl} · 战力 ${power} · 性格 ${escapeHtml(natureName)} · 特性 ${escapeHtml(ab?.name || "—")} · 亲密 ${aff}/100${"caughtWith" in m && m.caughtWith && m.caughtWith !== "pokeball" ? " · " + ({"pokeball":"灵球","ultraball":"高级灵球","quickball":"迅捷灵球","luxuryball":"豪华灵球","masterball":"究极灵球","netball":"捕灵球","duskball":"暗夜灵球"}[m.caughtWith] ?? m.caughtWith) : ""}</div>
              </div>
              <div class="row__right">
                <div class="mon-card__skills">${skillHtml}</div>
                <div class="mon-card__btns">
                  <button class="btn btn--small" data-mon-open="${m.id}">查看</button>
                  <button class="btn btn--small" data-mon-starup="${m.id}" ${stars >= 5 ? "disabled" : ""}>升星</button>
                  ${showNatalBtn ? `<button class="btn btn--small${isNatalBond ? " btn--primary" : ""}" data-mon-natal="${m.id}" title="缔结/解除跨周目本命灵契">${isNatalBond ? "★本命" : "缔契"}</button>` : ""}
                  <button class="btn btn--small btn--danger" data-mon-release="${m.id}" ${isNatalBond ? 'disabled title="本命灵契保护中，解除缔契后方可放生"' : awayMap.has(m.id) ? `disabled title="${escapeHtml(awayMap.get(m.id).releaseHint)}"` : ""}>放生</button>
                </div>
              </div>
            </div>
          `);

          if (starUpOpen) {
            const candidateRows = candidates
              .map((x) => {
                const checked = validSel.includes(x.id);
                const label = `${x.name}`;
                return `
                  <div class="row func-mon-row">
                    <div class="row__left">
                      <div class="row__title row__titleLine">${renderBeastIcon(x.dex, x.name, x.isShiny)}<span>${escapeHtml(label)}</span><span class="tag">Lv.${x.lvl}</span></div>
                      <div class="row__desc">同进化系材料</div>
                    </div>
                    <div class="row__right">
                      <input class="chk" type="checkbox" data-mon-starup-check="${x.id}" data-mon-starup-target="${m.id}" ${checked ? "checked" : ""} />
                    </div>
                  </div>
                `;
              })
              .join("");

            const title = `升星：${m.name}`;
            const gateText = gate ? `需 Lv.${gate.lvl}+ 且亲密度 ${gate.aff}+` : "";
            const sub = `选择材料萌灵（下一星需要 ${need} 只同进化系材料${gateText ? `；${gateText}` : ""}）`;
            const statusText =
              stars >= 5
                ? "已达最高星级（5★）"
                : !gateOk && gate
                  ? `未达升星门槛：当前 Lv.${m.lvl} / 亲密度 ${aff}（需要 Lv.${gate.lvl}+ 且亲密度 ${gate.aff}+）`
                  : candidates.length === 0
                    ? "暂无可用同进化系材料萌灵（可前往捕捉同进化系伙伴作为升星材料）"
                    : validSel.length !== need
                      ? `材料待选择：下一星需要勾选 ${need} 只同进化系材料萌灵`
                      : `已选齐 ${need} 只材料萌灵，点击下方确认即可升星`;

            starUpModalHtml = `
              <div class="modalOverlay" data-mon-starup-overlay="1">
                <div class="modal">
                  <div class="modal__header">
                    <div class="modal__title">${renderResSvg("shinyCharm", 20)}<span>${escapeHtml(title)}</span><span class="tag">${stars < 5 ? `${stars}★ → ${stars + 1}★` : "满星 5★"}</span></div>
                    <div class="modal__right">
                      <button class="btn btn--small" data-mon-starup-auto="${m.id}">自动选择</button>
                      <button class="btn btn--small" data-mon-starup-clear="${m.id}">清空</button>
                      <button class="btn btn--small" data-mon-starup-close="1">关闭</button>
                    </div>
                  </div>
                  <div class="modal__desc">${escapeHtml(sub)}</div>
                  <div class="modal__body">
                    <div class="row func-mon-row">
                      <div class="row__left">
                        <div class="row__title row__titleLine">${renderBeastIcon(m.dex, m.name, m.isShiny)}<span>${escapeHtml(m.name)}</span><span class="tag">Lv.${m.lvl} · 亲密 ${aff}</span></div>
                        <div class="row__desc">${escapeHtml(statusText)}</div>
                      </div>
                      <div class="row__right">
                        <span class="tag">材料 ${validSel.length}/${need}</span>
                      </div>
                    </div>
                    ${candidateRows}
                  </div>
                  <div class="actions">
                    <button class="btn btn--ghost" data-mon-starup-close="1">取消</button>
                    <button class="btn btn--primary" data-mon-starup-confirm="${m.id}" ${canStarUp ? "" : "disabled"}>确认升星</button>
                  </div>
                </div>
              </div>
            `;
          }
        }
      }

      if (starUpModalHtml) rows.push(starUpModalHtml);
      setHtmlPreservingStage(elMonList, rows.join(""));
      if (ui.monSearchFocus) {
        const searchInput = elMonList.querySelector("input[data-mon-search]");
        if (searchInput) {
          searchInput.focus();
          const len = searchInput.value.length;
          try {
            searchInput.setSelectionRange(len, len);
          } catch {
          }
        }
      }
      try {
        const nextBody = elMonList.querySelector('.modalOverlay[data-mon-starup-overlay="1"] .modal__body');
        if (nextBody) nextBody.scrollTop = prevStarUpBodyScrollTop;
      } catch {}
      ui.monsDirty = false;
      return;
    }

    const s = getMonCurrentStats(selected);
    const need = expNeedForLevel(selected.lvl);
    const api = getBeastDataByDex(selected.dex);
    const types = Array.isArray(api?.types) ? api.types : null;
    const base = api?.baseStats && typeof api.baseStats === "object" ? api.baseStats : null;

    const typeBadges = types
      ? types
          .slice(0, 2)
          .map((t) => {
            const zh = TYPE_ZH[t] ?? t;
            return `<div class="badge type type-${escapeHtml(t)}">${escapeHtml(zh)}</div>`;
          })
          .join("")
      : `<div class="badge badge--muted">属性加载中</div>`;

    const baseBadges = base
      ? `
        <div class="badge">生命 ${base.hp}</div>
        <div class="badge">物攻 ${base.atk}</div>
        <div class="badge">物防 ${base.def}</div>
        <div class="badge">灵攻 ${base.spa}</div>
        <div class="badge">灵防 ${base.spd}</div>
        <div class="badge">速度 ${base.spe}</div>
      `
      : `<div class="badge badge--muted">种族值加载中</div>`;
    const evo = getEvoMap();
    const next = Array.isArray(evo[selected.pid]) ? evo[selected.pid] : [];
    const st = stageIndex(selected.pid);
    const candyHave = Math.max(0, Math.floor(state.res.rareCandy?.value ?? 0));
    const canFeedCandy = candyHave >= 1;

    const evoRows = [];
    if (!next || next.length === 0) {
      evoRows.push(`<div class="badge badge--muted">暂无可用进化</div>`);
    } else {
      for (const toPid of next) {
        const sp = getSpeciesByPid(toPid);
        const label = sp ? sp.name : toPid;

        const needRope = typeof isTradeEvo === "function" ? isTradeEvo(selected.pid, toPid) : false;
        const needAff = !needRope && (typeof isAffectionEvo === "function" ? isAffectionEvo(selected.pid, toPid) : false);
        const reqLvl = getEvoReqLevel(selected.pid, toPid);
        const reqRid = needRope ? "linkRope" : "evolutionStone";
        const reqText = needRope
          ? "灵契绳 x1"
          : needAff
            ? "亲密度20+ · 灵晶石 x1"
            : "灵晶石 x1";
        const evoOkRes = (state.res?.[reqRid]?.value ?? 0) >= 1;
        const evoOkAff = !needAff || (typeof selected.affection === "number" && selected.affection >= 20);

        const fallbackReqLvl = defaultReqLvlByStage(selected.pid);
        const effReqLvl = typeof reqLvl === "number" ? reqLvl : fallbackReqLvl;
        const evoOkLvl = reqLvl === null ? selected.lvl >= fallbackReqLvl : selected.lvl >= effReqLvl;
        const lvlText = reqLvl === null ? `Lv.${fallbackReqLvl}+` : reqLvl === 0 ? "无等级" : `Lv.${effReqLvl}+`;
        const disabled = evoOkLvl && evoOkRes && evoOkAff ? "" : "disabled";
        evoRows.push(
          `<button class="btn btn--small" data-mon-evo="${selected.id}" data-evo-to="${toPid}" ${disabled}>进化为 ${escapeHtml(label)}（${lvlText} · ${reqText}）</button>`
        );
      }
    }

    const selPid = `p${pad3(selected.dex)}`;
    const selTitle = globalThis.BEAST_TITLE?.[selPid] || "";
    const selDesc = globalThis.BEAST_DESC?.[selPid] || "";
    const selOrder = globalThis.BEAST_ORDER?.[selPid] || selected.dex;

    elMonDetail.innerHTML = `
      <div class="row">
        <div class="row__left">
          <div class="row__title row__titleLine">${renderBeastIcon(selected.dex, selected.name, Boolean(selected.isShiny))}<span>${escapeHtml(selected.name)}</span>${selTitle ? `<span class="beast-title-tag">【${escapeHtml(selTitle)}】</span>` : ""}${Boolean(selected.isShiny) ? `<span class="badge badge--ok" style="margin-left:6px">闪光</span>` : ""}<span style="margin-left:8px">${renderStars(selected.stars)}</span></div>
          <div class="row__desc">No.${pad3(selOrder)} · ${selected.tier === "common" ? "常见" : selected.tier === "uncommon" ? "少见" : selected.tier === "rare" ? "稀有" : "史诗"}</div>
          ${selDesc ? `<div class="row__desc dex-lore">${escapeHtml(selDesc)}</div>` : ""}
        </div>
        <div class="row__right">
          <span class="tag">Lv.${selected.lvl}</span>
          <span class="tag">EXP ${selected.exp}/${need}</span>
          <span class="tag">亲密度 ${Math.floor(clamp(typeof selected.affection === "number" ? selected.affection : 0, 0, 100))}/100</span>
          <span class="tag">战力 ${monPower(selected)}</span>
          ${(() => {
            const ribbons = Math.max(0, Math.floor(selected.hallOfFameRibbons || 0));
            const bq = getMonBoutiqueBonus(state, selected.id);
            const imp = getMonPrimalImprintBonus(state, selected.id);
            const parts = [];
            if (ribbons > 0) {
              parts.push(`<span class="tag tag--hof-ribbon">${renderUiIcon("leagueChampionRibbon", 13)}<span>冠军殿堂绶带 ×${ribbons}</span></span>`);
            }
            if (imp.imprintName) {
              parts.push(`<span class="tag tag--amber-stock">${renderUiIcon(imp.imprintIcon || "amberRevivalPod", 13)}<span>${escapeHtml(imp.imprintName)} Lv.${imp.imprintLevel}</span></span>`);
            }
            if (getWishDockAwayMonIds(state).has(selected.id)) {
              parts.push(`<span class="tag tag--dock-bottle">${renderUiIcon("driftBottle", 13)}<span>心愿码头出海中</span></span>`);
            }
            if (getNightObservatoryStationedMonIds(state).has(selected.id)) {
              parts.push(`<span class="tag tag--night-obs">${renderUiIcon("nightObservatory", 13)}<span>月光观察站派驻中</span></span>`);
            }
            if (getSkyIslandCrewMonIds(state).has(selected.id)) {
              parts.push(`<span class="tag tag--sky-crew">${renderUiIcon("buildHammer", 13)}<span>云顶浮岛建造中</span></span>`);
            }
            if (getTreasureVoyageCrewMonIds(state).has(selected.id)) {
              const voyIsland = getTreasureIslandDef(state.meta?.treasureVoyage?.voyage?.islandId)?.name || "宝岛";
              parts.push(`<span class="tag tag--voyage-crew">${renderUiIcon("treasureMap", 13)}<span>寻宝远航中 · ${escapeHtml(voyIsland)}</span></span>`);
            }
            const soakPool = getHotSpringPoolOfMon(state, selected.id);
            if (soakPool) {
              parts.push(`<span class="tag tag--spring-soak">${renderUiIcon("bathBucket", 13)}<span>温泉泡汤中 · ${escapeHtml(soakPool.name)}</span></span>`);
            }
            const postTrip = Array.isArray(state.meta?.postOffice?.trips) ? state.meta.postOffice.trips.find((t) => t && Number(t.monId) === selected.id) : null;
            if (postTrip && getPostMessengerMonIds(state).has(selected.id)) {
              parts.push(`<span class="tag tag--post-messenger">${renderUiIcon("messengerBag", 13)}<span>信使送信中 · ${escapeHtml(getPostRouteDef(postTrip.routeId)?.name || "邮路")}</span></span>`);
            }
            if (getDreamLibraryDreamerIds(state).has(selected.id)) {
              const dreamBook = getDreamBookDef(state.meta?.dreamLibrary?.bookId)?.name || "童话绘本";
              parts.push(`<span class="tag tag--dream-writer">${renderUiIcon("pictureBook", 13)}<span>入梦写绘本 · 《${escapeHtml(dreamBook)}》</span></span>`);
            }
            if (getFishingAnglerMonIds(state).has(selected.id)) {
              parts.push(`<span class="tag tag--fishing-angler">${renderUiIcon("fishingRod", 13)}<span>溪畔垂钓中 · ${escapeHtml(getFishingSection().name)}</span></span>`);
            }
            const bakeryStation = getBakeryStationOfMon(state, selected.id);
            if (bakeryStation) {
              parts.push(`<span class="tag tag--bakery-worker">${renderUiIcon("bakeryOven", 13)}<span>烘焙坊上岗 · ${escapeHtml(bakeryStation.name)}</span></span>`);
            }
            if (getBalloonTravelerMonIds(state).has(selected.id)) {
              const balloonTrip = (state.meta?.balloonTravel?.balloons || []).map((b) => b?.trip).find((t) => t && Array.isArray(t.passengerIds) && t.passengerIds.includes(selected.id));
              const balloonIsle = balloonTrip ? getBalloonIsleDef(balloonTrip.isleId)?.name || "空中群岛" : "空中群岛";
              parts.push(`<span class="tag tag--balloon-traveler">${renderUiIcon("rainbowBalloon", 13)}<span>${balloonTrip?.phase === "landed" ? "气球已降落" : "乘气球旅行中"} · ${escapeHtml(balloonIsle)}</span></span>`);
            }
            const parkRide = getCloudParkRideOfMon(state, selected.id);
            if (parkRide) {
              parts.push(`<span class="tag tag--park-operator">${renderUiIcon("carouselRide", 13)}<span>游乐园值班 · ${escapeHtml(parkRide.name)}</span></span>`);
            }
            if (getStargazeCamperMonIds(state).has(selected.id)) {
              const campTrip = (state.meta?.stargazeCamp?.sites || []).map((x) => x?.trip).find((t) => t && Array.isArray(t.camperIds) && t.camperIds.includes(selected.id));
              const campSite = campTrip ? getStargazeSiteDef(campTrip.siteId)?.name || "星空营地" : "星空营地";
              parts.push(`<span class="tag tag--stargaze-camper">${renderUiIcon("starCamp", 13)}<span>${campTrip?.phase === "returned" ? "夜营已归来" : "夜营观星中"} · ${escapeHtml(campSite)}</span></span>`);
            }
            if (getIceRinkSkaterMonIds(state).has(selected.id)) {
              const rinkShow = state.meta?.iceRink?.show;
              const rinkProgram = getIceRinkProgramDef(rinkShow?.programId)?.name || "花样滑冰";
              parts.push(`<span class="tag tag--rink-skater">${renderUiIcon("iceRink", 13)}<span>${rinkShow?.phase === "finished" ? "演出已结束" : "溜冰排练中"} · ${escapeHtml(rinkProgram)}</span></span>`);
            }
            if (getBeeKeeperMonIds(state).has(selected.id)) {
              const beeTrip = (state.meta?.beeWorkshop?.hives || []).map((x) => x?.trip).find((t) => t && Array.isArray(t.keeperIds) && t.keeperIds.includes(selected.id));
              const beeHive = beeTrip ? getBeeHiveDef(beeTrip.hiveId)?.name || "花田蜂箱" : "花田蜂箱";
              parts.push(`<span class="tag tag--bee-keeper">${renderUiIcon("beeHive", 13)}<span>${beeTrip?.phase === "done" ? "蜂蜜已酿好" : "照料花田中"} · ${escapeHtml(beeHive)}</span></span>`);
            }
            const bandLineup = state.meta?.bandConcert?.lineup;
            const bandPart = bandLineup && typeof bandLineup === "object" ? BAND_PARTS.find((p) => Number(bandLineup[p.id]) === selected.id) : null;
            if (bandPart) {
              parts.push(`<span class="tag tag--band-member">${renderUiIcon("instrumentSet", 13)}<span>萌灵乐队 · ${escapeHtml(bandPart.name)}声部</span></span>`);
            }
            const selMigrant = getMigrantFriendMonIds(state).get(selected.id);
            if (selMigrant) {
              parts.push(`<span class="tag tag--migrant-friend">${renderUiIcon("migratingBird", 13)}<span>候鸟之友 · ${escapeHtml(getMigrantDef(selMigrant)?.name || "候鸟萌灵")}</span></span>`);
            }
            const selForm = getMonNocturnalFormBonus(state, selected.id);
            if (selForm.hasForm) {
              parts.push(`<span class="tag tag--nocturnal-form" title="${escapeHtml(selForm.formDesc)}">${renderUiIcon("nocturnalCrest", 13)}<span>夜行形态「${escapeHtml(selForm.formName)}」${selForm.nightActive ? " · 夜间战斗 +5%" : " · 白昼 +2%"}</span></span>`);
            }
            if (bq.accessoryName) {
              parts.push(`<span class="tag tag--sand-stock">${renderUiIcon(bq.accessoryIcon || "boutiqueMirrorStar", 13)}<span>${escapeHtml(bq.accessoryName)} Lv.${bq.accessoryLevel}</span></span>`);
            }
            if (bq.sheenName) {
              parts.push(`<span class="tag">${escapeHtml(bq.sheenName)}</span>`);
            }
            return parts.join("");
          })()}
        </div>
      </div>

      <div class="row">
        <div class="row__left">
          <div class="row__title row__titleLine">${renderResSvg("tuningMint", 18)}<span>性格与心性调律</span><span class="tag">心性调律薄荷 ×${Math.max(0, Math.floor(state.res?.tuningMint?.value ?? 0))}</span></div>
          <div class="row__desc">原性格作为纪念标签永久保留；消耗心性调律薄荷可定向重塑六维成长偏向（+10% / -10% 或归元均衡）。</div>
        </div>
        <div class="row__right">
          <div class="badge badge--nature">性格：${escapeHtml(formatMonNatureWithTuning(selected))}</div>
          <div class="badge">${(() => {
            const ab = getAbilityInfo(selected.ability);
            return ab ? `特性：${escapeHtml(ab.name)} · ${escapeHtml(ab.desc)}` : "特性：—";
          })()}</div>
        </div>
      </div>

      <div class="row">
        <div class="row__left">
          <div class="row__title row__titleLine">${renderResSvg("tuningMint", 18)}<span>快捷薄荷调律</span><span class="tag">${normalizeMintTuning(selected.mintTuning) ? escapeHtml(describeMintTuning(selected.mintTuning)) : "当前未调律"}</span></div>
          <div class="row__desc">点击下方预设消耗 1 株心性调律薄荷立即生效，或前往「育灵中枢 · 调律工坊」自由组合任意加减项。</div>
        </div>
        <div class="row__right">
          ${MINT_TUNING_PRESETS.map((p) => {
            const curT = normalizeMintTuning(selected.mintTuning);
            const isSame = Boolean(curT && curT.up === p.up && curT.down === p.down);
            const canUse = !isSame && Math.max(0, Math.floor(state.res?.tuningMint?.value ?? 0)) >= 1;
            return `<button class="btn btn--small${isSame ? " btn--primary" : ""}" data-mon-mint-preset="${escapeHtml(p.id)}" data-mon-mint-target="${selected.id}" title="${escapeHtml(p.desc)}" ${canUse ? "" : "disabled"}>${escapeHtml(p.name)}${isSame ? "（当前）" : ""}</button>`;
          }).join("")}
        </div>
      </div>

      <div class="row row--mon-stats">
        <div class="row__left">
          <div class="row__title row__titleLine">${renderResSvg("energyDrink", 18)}<span>能力值</span><span class="tag">当前六维</span></div>
          <div class="row__desc">生命 / 物攻 / 物防 / 灵攻 / 灵防 / 速度</div>
        </div>
        <div class="row__right mon-stat-grid">
          ${[
            ["生命", s.hp, "hp"],
            ["物攻", s.atk, "atk"],
            ["物防", s.def, "def"],
            ["灵攻", s.spa, "spa"],
            ["灵防", s.spd, "spd"],
            ["速度", s.spe, "spe"],
          ]
            .map(([lbl, val, key]) => {
              const pct = Math.max(10, Math.min(100, Math.round((Number(val || 0) / 160) * 100)));
              return `<div class="mon-stat-cell mon-stat-cell--${key}"><div class="mon-stat-cell__head"><span>${lbl}</span><strong>${val}</strong></div><div class="mon-stat-cell__bar"><i style="width:${pct}%"></i></div></div>`;
            })
            .join("")}
        </div>
      </div>

      <div class="row">
        <div class="row__left">
          <div class="row__title row__titleLine">${renderResSvg("hpPotion", 18)}<span>药剂强化</span><span class="tag">单项上限 +50</span></div>
          <div class="row__desc">消耗药剂：对应六维永久 +5（单项上限 +50）</div>
        </div>
        <div class="row__right">
          <button class="btn btn--small" data-mon-potion="hpPotion" data-mon-potion-mon="${selected.id}" ${(state.res.hpPotion?.value ?? 0) >= 1 ? "" : "disabled"}>疗伤药剂</button>
          <button class="btn btn--small" data-mon-potion="atkPotion" data-mon-potion-mon="${selected.id}" ${(state.res.atkPotion?.value ?? 0) >= 1 ? "" : "disabled"}>攻击药剂</button>
          <button class="btn btn--small" data-mon-potion="defPotion" data-mon-potion-mon="${selected.id}" ${(state.res.defPotion?.value ?? 0) >= 1 ? "" : "disabled"}>防御药剂</button>
          <button class="btn btn--small" data-mon-potion="spaPotion" data-mon-potion-mon="${selected.id}" ${(state.res.spaPotion?.value ?? 0) >= 1 ? "" : "disabled"}>特攻药剂</button>
          <button class="btn btn--small" data-mon-potion="spdPotion" data-mon-potion-mon="${selected.id}" ${(state.res.spdPotion?.value ?? 0) >= 1 ? "" : "disabled"}>特防药剂</button>
          <button class="btn btn--small" data-mon-potion="spePotion" data-mon-potion-mon="${selected.id}" ${(state.res.spePotion?.value ?? 0) >= 1 ? "" : "disabled"}>速度药剂</button>
        </div>
      </div>

      <div class="row">
        <div class="row__left">
          <div class="row__title row__titleLine">${renderResSvg("megaStone", 18)}<span>属性</span><span class="tag">元素共鸣</span></div>
          <div class="row__desc">星野元素属性共鸣 · 影响属性技能与试炼克制</div>
        </div>
        <div class="row__right">
          ${typeBadges}
        </div>
      </div>

      <div class="row">
        <div class="row__left">
          <div class="row__title row__titleLine">${renderResSvg("science", 18)}<span>种族值</span><span class="tag">本源潜能</span></div>
          <div class="row__desc">星野灵兽本源六维潜能</div>
        </div>
        <div class="row__right">
          ${baseBadges}
        </div>
      </div>

      <div class="row">
        <div class="row__left">
          <div class="row__title row__titleLine">
            ${renderResSvg("rareCandy", 18)}<span>升级</span>
            <span class="tag">跃级糖丸 ×${candyHave}</span>
            <span class="tag">历练糖丸 ×${Math.max(0, Math.floor(state.res.expCandy?.value ?? 0))}</span>
          </div>
          <div class="row__desc">跃级糖丸可提升等级，历练糖丸可增加经验值。</div>
        </div>
        <div class="row__right">
          <button class="btn btn--small" data-mon-feed="${selected.id}" data-feed="rareCandy" ${canFeedCandy ? "" : "disabled"}>跃级糖丸(1)+1Lv</button>
          <button class="btn btn--small" data-mon-exp="${selected.id}" data-exp="expCandy" ${(state.res.expCandy?.value ?? 0) >= 1 ? "" : "disabled"}>历练糖丸+1000</button>
        </div>
      </div>

      <div class="row">
        <div class="row__left">
          <div class="row__title row__titleLine">
            ${renderResSvg("evolutionStone", 18)}<span>进化</span>
            <span class="tag">灵晶石 ×${Math.max(0, Math.floor(state.res.evolutionStone?.value ?? 0))}</span>
          </div>
          <div class="row__desc">需求：达到对应分支等级（见按钮）且 消耗灵晶石 x1</div>
        </div>
        <div class="row__right">
          ${evoRows.join("")}
        </div>
      </div>
    `;

    ui.monsDirty = false;
  };
}
