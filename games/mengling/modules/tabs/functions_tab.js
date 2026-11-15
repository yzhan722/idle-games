import { EXP_LEVELS, getExpLevelDef } from "../expedition_defs.js";
import {
  applyQuickExpeditionDuration,
  applyQuickExpeditionReward,
  ensureExpeditionDungeonTiers,
  expeditionTypeMul,
  getExpeditionSeasonBlurb,
  getMonTypesForExpedition,
  pickExpeditionDungeons,
  resolveExpeditionSeasonLabel,
  resolveSeasonId,
} from "../systems/expedition.js";
import { expeditionNatureTimeMul, natureTrainExpMul, expeditionDailyProgress, markExpeditionDailyClaimed, localDateStr } from "../systems/gameplay_fun.js";
import {
  legacyBreedTimeMul,
  legacyHatchAffectionAdd,
  legacyExpeditionRewardMul,
  legacyExpeditionTimeMul,
} from "../systems/rebirth.js";
import {
  AMBER_IMPRINT_MAX_LEVEL,
  AMBER_IV_REFINE_COST,
  AMBER_REVIVAL_DAILY_GRANT,
  autoDispatchAllEcoSandbox,
  autoFillStarCampSquad,
  autoPickEcoSandboxSquad,
  awakenOrUpgradePrimalImprint,
  BOUTIQUE_ACCESSORY_DEFS,
  BOUTIQUE_SHEEN_STYLES,
  CAMP_RECIPE_DEFS,
  canAffordCampRecipe,
  canAwakenOrUpgradeImprint,
  canClaimDailyAncientAmber,
  canClaimDailyStarSand,
  cancelEcoSandboxZone,
  canCraftOrUpgradeAccessory,
  canRefinePartnerIvWithAmber,
  canSynthesizeAncientAmber,
  canSynthesizeStarSand,
  claimAllEcoSandboxZones,
  claimDailyAncientAmber,
  claimDailyStarSand,
  claimEcoSandboxZone,
  clearStarCampSquad,
  computeAmberRevivalAura,
  computeEcoRelicAura,
  computeStarBoutiqueAura,
  computeStarCampAura,
  cookCampRecipe,
  craftOrUpgradeBoutiqueAccessory,
  dispatchEcoSandboxZone,
  ECO_SANDBOX_ZONES,
  ensureAmberRevivalState,
  ensureEcoSandboxState,
  ensureStarBoutiqueState,
  ensureStarCampState,
  equipBoutiqueAccessory,
  equipPrimalImprint,
  evaluateEcoSquadAffinity,
  getAccessoryNextCost,
  getAvailableStarCampCandidates,
  getCampUnavailableMonIds,
  getEcoSandboxFreeSurveysLeft,
  getEcoZoneDef,
  getIdleEcoSandboxCandidates,
  getMonBoutiqueBonus,
  getMonPrimalImprintBonus,
  getNonSandboxBusyIds,
  getPrimalImprintNextCost,
  getRecipeMasteryInfo,
  getStarCampEnsembleLeft,
  instantCompleteEcoSandboxZone,
  performStarCampEnsemble,
  PRIMAL_IMPRINT_DEFS,
  refinePartnerIvWithAmber,
  seasonRelicLines,
  STAR_BOUTIQUE_DAILY_SAND_GRANT,
  STAR_BOUTIQUE_MAX_LEVEL,
  STAR_CAMP_DAILY_ENSEMBLE_LIMIT,
  STAR_CAMP_FORAGE_CYCLE_SEC,
  STAR_CAMP_MAX_LEVEL,
  STAR_CAMP_MAX_SLOTS,
  synthesizeAncientAmber,
  synthesizeStarSand,
  toggleEcoSandboxStagedMon,
  toggleStarCampCompanion,
  unequipBoutiqueAccessory,
  unequipBoutiqueStyle,
  unequipMonPrimalImprints,
  unequipPrimalImprint,
  unlockOrApplyBoutiqueSheen,
} from "../systems/collection_fun.js";
import {
  autofillChampionLeagueSquad,
  CHAMPION_LEAGUE_MAX_TIER,
  CHAMPION_LEAGUE_SQUAD_SIZE,
  CHAMPION_LEAGUE_STAGES,
  computeChampionLeagueBonus,
  computeStarCorridorBonus,
  ensureChampionLeagueState,
  estimateLeagueStagePower,
  evaluateLeagueSquadSynergy,
  resetChampionLeagueProgress,
  simulateLeagueGauntlet,
  STAR_CORRIDOR_MAX_TIER,
  toggleChampionLeagueSquadMon,
} from "../systems/pve_tower.js";
import {
  applyMintTuningToMon,
  describeMintTuning,
  formatMonNatureWithTuning,
  getMonCurrentStats as getMonCurrentStatsFallback,
  getNatureInfo,
  MINT_TUNING_PRESETS,
  monPower as monPowerFallback,
  normalizeMintTuning,
  recommendMintTuningForMon,
  STAT_ZH,
  TUNABLE_STATS,
} from "../mons.js";
import {
  computeBreedingPreview,
  ensureBreedingState,
  ivGradeTag,
  normalizeAbilityLock,
  resolveParentAbilityId,
  sumMonIv,
} from "../systems/breeding.js";
import { getAbilityInfo, monPassive } from "../abilities.js";
import { beastZone, ZONE_IDS, ZONE_LABELS } from "../beast_defs.js";
import { renderFunctionsStageHtml, setHtmlPreservingStage } from "../render/tab_stages.js";
import { renderBuildingSvg, renderResSvg, renderUiIcon } from "../render/rpg_svg_icons.js";

export function createRenderFunctions({
  elFunctionsTraining,
  ui,
  TYPE_ZH,
  getBeastDataByDex,
  getSpeciesByPid,
  getMonCurrentStats,
  computeTechEffects,
  clamp,
  escapeHtml,
  fmtDuration,
  expNeedForLevel0,
  monPower,
  renderBeastIcon,
  markFunctionsDirty,
  markMonListDirty,
  addLog,
  render,
  getState,
}) {
  const RES_LABEL_ZH = {
    tuningMint: "心性调律薄荷",
    evolutionStone: "灵晶石",
    megaStone: "觉醒石",
    rareCandy: "跃级糖丸",
    expCandy: "历练糖丸",
    catnip: "灵果",
    wood: "灵木",
    minerals: "灵晶碎片",
    futurecoin: "未来币",
    picnicHerb: "野餐香草",
    starBerry: "星露灵果",
    campToken: "星营徽章",
    shinyStarSand: "闪光祈愿星砂",
    ancientGeneAmber: "远古基因琥珀",
    corridorStarMedals: "星轨回廊勋章",
  };

  function patchAmberRevivalLiveDom(state) {
    if (!elFunctionsTraining || !state) return;
    const amberVal = Math.max(0, Math.floor(Number(state.res?.ancientGeneAmber?.value) || 0));
    const amberEl = elFunctionsTraining.querySelector("[data-amber-stock]");
    if (amberEl) amberEl.textContent = `远古基因琥珀 ×${amberVal}`;
    const ecoBtn = elFunctionsTraining.querySelector('button[data-amber-synth="eco"]');
    if (ecoBtn instanceof HTMLButtonElement) ecoBtn.disabled = !canSynthesizeAncientAmber(state, "eco");
    const leagueBtn = elFunctionsTraining.querySelector('button[data-amber-synth="league"]');
    if (leagueBtn instanceof HTMLButtonElement) leagueBtn.disabled = !canSynthesizeAncientAmber(state, "league");
    const refineBtn = elFunctionsTraining.querySelector("button[data-amber-refine-iv]");
    if (refineBtn instanceof HTMLButtonElement) refineBtn.disabled = !canRefinePartnerIvWithAmber(state);
    const selIvEl = elFunctionsTraining.querySelector("[data-amber-sel-iv]");
    if (selIvEl) {
      const selId = state.meta?.amberRevival?.selectedMonId;
      const mon = (state.mons?.list || []).find((m) => m && m.id === selId) || state.mons?.list?.[0] || null;
      if (mon) selIvEl.textContent = `个体总值 ${sumMonIv(mon)}/186`;
    }
  }

  function patchBoutiqueLiveDom(state) {
    if (!elFunctionsTraining || !state) return;
    const sandVal = Math.max(0, Math.floor(Number(state.res?.shinyStarSand?.value) || 0));
    const sandEl = elFunctionsTraining.querySelector("[data-bq-sand-stock]");
    if (sandEl) sandEl.textContent = `闪光祈愿星砂 ×${sandVal}`;
    const goldBtn = elFunctionsTraining.querySelector('button[data-bq-synth="gold"]');
    if (goldBtn instanceof HTMLButtonElement) goldBtn.disabled = !canSynthesizeStarSand(state, "gold");
    const herbBtn = elFunctionsTraining.querySelector('button[data-bq-synth="herb"]');
    if (herbBtn instanceof HTMLButtonElement) herbBtn.disabled = !canSynthesizeStarSand(state, "herb");
  }

  function patchStarCampLiveDom(state) {
    if (!state?.meta?.starCamp || !elFunctionsTraining) return;
    const camp = ensureStarCampState(state);
    const campAura = computeStarCampAura(state, { getBeastDataByDex });
    const foragePct =
      campAura.stationedCount > 0
        ? Math.max(2, Math.min(99, Math.round(((camp.forageCarrySec || 0) / STAR_CAMP_FORAGE_CYCLE_SEC) * 100)))
        : 0;
    const forageRemSec =
      campAura.stationedCount > 0
        ? Math.max(1, Math.ceil((STAR_CAMP_FORAGE_CYCLE_SEC - (camp.forageCarrySec || 0)) / Math.max(1, campAura.campSpeedMul || 1)))
        : STAR_CAMP_FORAGE_CYCLE_SEC;

    const barEl = elFunctionsTraining.querySelector("[data-camp-forage-fill]");
    if (barEl instanceof HTMLElement) barEl.style.width = `${foragePct}%`;
    const txtEl = elFunctionsTraining.querySelector("[data-camp-forage-txt]");
    if (txtEl) {
      txtEl.textContent =
        campAura.stationedCount > 0
          ? `营火伴游采集 ${foragePct}% · 约 ${fmtDuration(forageRemSec)} 后收获野餐香草与星露灵果（加速 x${(campAura.campSpeedMul || 1).toFixed(2)}）`
          : "邀请 1~4 只萌灵入驻营地，即可持续累积亲密度并自动寻获野餐香草与星露灵果";
    }
    for (const f of campAura.activeFeasts) {
      const remEl = elFunctionsTraining.querySelector(`[data-camp-feast-rem="${f.recipeId}"]`);
      if (remEl) remEl.textContent = fmtDuration(Math.max(0, Math.ceil(f.remainingSec || 0)));
      const fillEl = elFunctionsTraining.querySelector(`[data-camp-feast-fill="${f.recipeId}"]`);
      if (fillEl instanceof HTMLElement) {
        const pct = Math.max(2, Math.min(100, Math.round(((f.remainingSec || 0) / Math.max(1, f.totalSec || 1800)) * 100)));
        fillEl.style.width = `${pct}%`;
      }
    }
  }

  return function renderFunctions() {
    if (!elFunctionsTraining) return;
    if (ui.activeTab !== "functions") return;
    if (!ui.functionsDirty) {
      const stLive = typeof getState === "function" ? getState() : null;
      if (stLive && !ui.functionsFocus) {
        patchStarCampLiveDom(stLive);
        patchBoutiqueLiveDom(stLive);
        patchAmberRevivalLiveDom(stLive);
      }
      return;
    }
    if (ui.functionsFocus) return;

    const state = typeof getState === "function" ? getState() : null;
    if (!state || typeof state !== "object") return;

    let prevPageScrollY = 0;
    let prevTrainModalBodyScrollTop = 0;
    let prevBreedModalBodyScrollTop = 0;
    let prevExpTeamModalBodyScrollTop = 0;
    let prevFocusKind = "";
    let prevFocusStart = null;
    let prevFocusEnd = null;
    try {
      prevPageScrollY = typeof window !== "undefined" ? (window.scrollY || 0) : 0;
      const prevBody = elFunctionsTraining.querySelector('.modalOverlay[data-train-modal-overlay="1"] .modal__body');
      if (prevBody) prevTrainModalBodyScrollTop = prevBody.scrollTop;
      const prevBreedBody = elFunctionsTraining.querySelector('.modalOverlay[data-breed-modal-overlay="1"] .modal__body');
      if (prevBreedBody) prevBreedModalBodyScrollTop = prevBreedBody.scrollTop;
      const prevExpTeamBody = elFunctionsTraining.querySelector('.modalOverlay[data-exp-team-overlay="1"] .modal__body');
      if (prevExpTeamBody) prevExpTeamModalBodyScrollTop = prevExpTeamBody.scrollTop;
      const prevEcoSquadBody = elFunctionsTraining.querySelector('.modalOverlay[data-eco-modal-overlay="1"] .modal__body');
      if (prevEcoSquadBody) ui.__ecoModalScrollTop = prevEcoSquadBody.scrollTop;
      const prevCampSquadBody = elFunctionsTraining.querySelector('.modalOverlay[data-camp-modal-overlay="1"] .modal__body');
      if (prevCampSquadBody) ui.__campModalScrollTop = prevCampSquadBody.scrollTop;
      const prevLeagueSquadBody = elFunctionsTraining.querySelector('.modalOverlay[data-func-league-modal-overlay="1"] .modal__body');
      if (prevLeagueSquadBody) ui.__leagueModalScrollTop = prevLeagueSquadBody.scrollTop;

      const ae = typeof document !== "undefined" ? document.activeElement : null;
      if (ae && ae instanceof HTMLElement && elFunctionsTraining.contains(ae)) {
        if (ae.matches('input[data-train-modal-q]')) prevFocusKind = "train";
        else if (ae.matches('input[data-breed-modal-q]')) prevFocusKind = "breed";
        if (prevFocusKind) {
          const inp = ae;
          prevFocusStart = typeof inp.selectionStart === "number" ? inp.selectionStart : null;
          prevFocusEnd = typeof inp.selectionEnd === "number" ? inp.selectionEnd : null;
        }
      }
    } catch {
    }

    const list = state.mons?.list ?? [];
    if (!state.training || typeof state.training !== "object") state.training = { activeIds: [], slotSize: 0 };
    if (!Array.isArray(state.training.activeIds)) state.training.activeIds = [];
    const slotSize =
      typeof state.training.slotSize === "number" && Number.isFinite(state.training.slotSize)
        ? Math.max(0, Math.floor(state.training.slotSize))
        : 0;

    const active = state.training.activeIds
      .map((id) => list.find((m) => m && m.id === id) ?? null)
      .filter((x) => x);

    const rows = [];

    const hideTraining = Boolean(ui.functionsHideTraining);
    const statusExpOn = Boolean(state.expedition?.on);
    const statusExpRem =
      statusExpOn && typeof state.expedition?.remainingSec === "number" && Number.isFinite(state.expedition.remainingSec)
        ? Math.max(0, state.expedition.remainingSec)
        : 0;
    const trainN = active.length;
    const trainExpTotal = Math.max(0, Math.floor(state.meta?.trainingExpGained || 0));
    const ecoSb = ensureEcoSandboxState(state);
    const ecoRelicAura = computeEcoRelicAura(state);
    const starCamp = ensureStarCampState(state);
    const starCampAura = computeStarCampAura(state, { getBeastDataByDex });
    const starBoutique = ensureStarBoutiqueState(state);
    const boutiqueAura = computeStarBoutiqueAura(state);
    const amberRevival = ensureAmberRevivalState(state);
    const amberAura = computeAmberRevivalAura(state);
    const champLeague = ensureChampionLeagueState(state);
    const leagueBonus = computeChampionLeagueBonus(state);
    const corridorBonus = computeStarCorridorBonus(state);
    const activeEcoZonesCount = ECO_SANDBOX_ZONES.filter((z) => ecoSb?.zones?.[z.id]?.active).length;
    const readyEcoZonesCount = ECO_SANDBOX_ZONES.filter((z) => ecoSb?.zones?.[z.id]?.completed).length;
    const mintOwnedCount = Math.max(0, Math.floor(state.res?.tuningMint?.value ?? 0));
    const sandOwnedCount = Math.max(0, Math.floor(state.res?.shinyStarSand?.value ?? 0));
    const amberOwnedCount = Math.max(0, Math.floor(state.res?.ancientGeneAmber?.value ?? 0));

    const statusBits = [];
    if (amberAura.awakenedCount > 0 || amberOwnedCount > 0) {
      statusBits.push(`琥珀复苏 ${amberAura.equippedCount}/4 刻印 · 远古琥珀 ×${amberOwnedCount}`);
    }
    if (corridorBonus.corridorTier > 0 || corridorBonus.highestFloorCleared > 0) {
      statusBits.push(`星轨回廊第 ${corridorBonus.highestFloorCleared} 重 · Tier ${corridorBonus.corridorTier}/${STAR_CORRIDOR_MAX_TIER}`);
    }
    if (boutiqueAura.craftedCount > 0 || sandOwnedCount > 0) {
      statusBits.push(`星辉造型 ${boutiqueAura.equippedCount}/3 穿戴 · 星砂 ×${sandOwnedCount}`);
    }
    if (leagueBonus.hallOfFameTier > 0) {
      statusBits.push(`冠军殿堂 Tier ${leagueBonus.hallOfFameTier}/${CHAMPION_LEAGUE_MAX_TIER}`);
    }
    if (starCampAura.stationedCount > 0) {
      statusBits.push(`星界露营 ${starCampAura.stationedCount}/4 只（Lv.${starCamp.level}）`);
    }
    if (starCampAura.activeFeasts.length > 0) {
      statusBits.push(`营地盛宴 ×${starCampAura.activeFeasts.length} 生效中`);
    }
    if (trainN > 0) statusBits.push(`训练中 ${trainN} 只`);
    if (activeEcoZonesCount > 0) statusBits.push(`生态沙盘探索 ${activeEcoZonesCount}/4 区${readyEcoZonesCount > 0 ? `（可领 ${readyEcoZonesCount}）` : ""}`);
    if (mintOwnedCount > 0) statusBits.push(`心性调律薄荷 ×${mintOwnedCount}`);
    if (statusExpOn) statusBits.push(`远征剩余 ${fmtDuration(statusExpRem)}`);
    else if (Math.max(0, Math.floor(state.meta?.expeditionsCompleted || 0)) > 0) {
      statusBits.push(`远征已完成 ${Math.floor(state.meta.expeditionsCompleted)} 次`);
    }
    if (trainExpTotal > 0) statusBits.push(`累计训练经验 ${trainExpTotal}`);
    const expDaily = expeditionDailyProgress(state, localDateStr());
    const expDailyDesc = expDaily.claimed
      ? "今日远征任务已领"
      : expDaily.done
        ? "今日远征完成 → 可领 +10 未来币"
        : "今日远征任务：完成 1 次远征 → +10 未来币";

    rows.push(
      renderFunctionsStageHtml({
        state,
        activeTrain: active,
        slotSize,
        renderBeastIcon,
        fmtDuration,
        escapeHtml,
      }),
    );

    rows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title row__titleLine">${renderUiIcon("tab_functions", 18)}<span>功能摘要</span><span class="tag">${expDaily.claimed ? "今日已领" : "每日 +10 币"}</span></div>
          <div class="row__desc">${statusBits.length ? escapeHtml(statusBits.join(" · ")) : "派遣训练或远征后，回来这里看进度与收获。"}</div>
          <div class="row__desc">${escapeHtml(expDailyDesc)}</div>
        </div>
        <div class="row__right">
          <button type="button" class="btn btn--primary btn--small" data-func-exp-daily-claim ${expDaily.canClaim ? "" : "disabled"}>${expDaily.claimed ? "已领" : "领取 +10"}</button>
        </div>
      </div>
    `);

    // ========== ML-8 Section: 萌灵「远古琥珀基因复苏所」(Ancient Amber Gene Revival Lab) ==========
    const hideAmberRevival = Boolean(ui.functionsHideAmberRevival);
    const canClaimDailyAmber = canClaimDailyAncientAmber(state);
    const canSynthAmberEco = canSynthesizeAncientAmber(state, "eco");
    const canSynthAmberLeague = canSynthesizeAncientAmber(state, "league");

    rows.push(`
      <div class="row amber-revival-header">
        <div class="row__left">
          <div class="row__title row__titleLine">
            ${renderUiIcon("amberRevivalPod", 20)}
            <span>远古琥珀基因复苏所</span>
            <span class="tag">印记苏醒 ${amberAura.awakenedCount}/${PRIMAL_IMPRINT_DEFS.length}（阶位 ${amberAura.totalLevels}/${amberAura.maxTotalLevels}）</span>
            <span class="tag">共鸣刻印 ${amberAura.equippedCount}/${PRIMAL_IMPRINT_DEFS.length}</span>
            <span class="tag tag--amber-stock">${renderResSvg("ancientGeneAmber", 14)}<span data-amber-stock="1">远古基因琥珀 ×${amberOwnedCount}</span></span>
          </div>
          <div class="row__desc">勘探地脉或凝炼秘境生态沙盘、冠军联盟殿堂特产获取「远古基因琥珀」，鉴定并升阶四大太古血脉印记（Lv.1~3）刻印至心仪伙伴；承载太古印记的伙伴自动享防放生保护，集齐四印更可唤醒「四太古血脉苏醒共鸣」，全面增幅全资源产出、个体潜能训练、捕获率、闪光奇遇率与回廊战力！</div>
        </div>
        <div class="row__right amber-revival-header__btns">
          <button type="button" class="btn btn--small${canClaimDailyAmber ? " btn--primary" : ""}" data-amber-claim-daily="1" ${canClaimDailyAmber ? "" : "disabled"}>${canClaimDailyAmber ? `每日地脉掘珀 +${AMBER_REVIVAL_DAILY_GRANT}` : "今日琥珀已掘"}</button>
          <button type="button" class="btn btn--small" data-amber-synth="eco" ${canSynthAmberEco ? "" : "disabled"} title="消耗调律薄荷×1 + 灵晶碎片×30 凝结 +4 远古基因琥珀">生态沙盘凝珀 (+4)</button>
          <button type="button" class="btn btn--small" data-amber-synth="league" ${canSynthAmberLeague ? "" : "disabled"} title="消耗闪光祈愿星砂×3 + 未来币×40 萃炼 +5 远古基因琥珀">殿堂星辉凝珀 (+5)</button>
          <button type="button" class="btn btn--small btn--ghost" data-func-toggle="amberRevival">${hideAmberRevival ? "展开" : "收起"}</button>
        </div>
      </div>
    `);

    if (!hideAmberRevival) {
      const selectedAmberMon =
        (amberRevival.selectedMonId ? list.find((m) => m && m.id === amberRevival.selectedMonId) : null) ||
        list[0] ||
        null;
      if (selectedAmberMon && amberRevival.selectedMonId !== selectedAmberMon.id) {
        amberRevival.selectedMonId = selectedAmberMon.id;
      }
      const selAmberImprint = selectedAmberMon ? getMonPrimalImprintBonus(state, selectedAmberMon.id) : null;
      const canRefineSelIv = selectedAmberMon ? canRefinePartnerIvWithAmber(state, selectedAmberMon.id) : false;

      const amberPartnerOptsHtml = list.length
        ? list
            .map((m) => {
              const mb = getMonPrimalImprintBonus(state, m.id);
              const ivSum = sumMonIv(m);
              return `<option value="${m.id}" ${selectedAmberMon?.id === m.id ? "selected" : ""}>Lv.${m.lvl || 1} ${escapeHtml(m.name)}（个体 ${ivSum}/186${mb.imprintName ? ` · ${escapeHtml(mb.imprintName)}Lv.${mb.imprintLevel}` : ""}）</option>`;
            })
            .join("")
        : `<option value="">暂无伙伴（先去捕获萌灵吧）</option>`;

      const formatAmberCostPills = (costObj) => {
        if (!costObj) return `<span class="tag">已臻满阶 Lv.${AMBER_IMPRINT_MAX_LEVEL}</span>`;
        const pills = [];
        for (const [rid, amt] of Object.entries(costObj.res || {})) {
          const have = Math.floor(Number(state.res?.[rid]?.value) || 0);
          const ok = have >= amt;
          pills.push(
            `<span class="camp-cost-pill ${ok ? "is-ok" : "is-lack"}">${renderResSvg(rid, 12)}<span>${escapeHtml(RES_LABEL_ZH[rid] || rid)} ${have}/${amt}</span></span>`,
          );
        }
        return pills.join("");
      };

      const imprintCardsHtml = PRIMAL_IMPRINT_DEFS.map((def) => {
        const entry = amberRevival.imprints[def.id] || { level: 0, equippedMonId: null };
        const curLvl = entry.level || 0;
        const wornMon = entry.equippedMonId ? list.find((m) => m && m.id === entry.equippedMonId) || null : null;
        const previewLvl = curLvl > 0 ? curLvl : 1;
        const b = def.bonusesByLevel[previewLvl] || {};
        const nextCost = getPrimalImprintNextCost(state, def.id);
        const canAwaken = canAwakenOrUpgradeImprint(state, def.id);
        const isWornBySelected = Boolean(wornMon && selectedAmberMon && wornMon.id === selectedAmberMon.id);

        return `
          <div class="amber-imprint-card ${curLvl > 0 ? "is-awakened" : ""} ${wornMon ? "is-equipped" : ""}">
            <div>
              <div class="row__title row__titleLine">
                ${renderUiIcon(def.icon, 24)}
                <span>${escapeHtml(def.name)}</span>
                <span class="tag">${curLvl > 0 ? `Lv.${curLvl}/${AMBER_IMPRINT_MAX_LEVEL}` : "待鉴定"}</span>
                <span class="tag">${escapeHtml(def.slotLabel)}</span>
              </div>
              <div class="row__desc" style="margin-top:4px">${escapeHtml(def.desc)}</div>
              <div class="row__desc" style="margin-top:5px;color:#fde68a">
                ${curLvl > 0 ? `当前 Lv.${curLvl} 血脉增益` : "Lv.1 苏醒预览"}：全产 +${Math.round((b.prodAdd || 0) * 100)}% · 潜能训练 +${Math.round((b.ivTrainAdd || 0) * 100)}% · 捕获 +${Math.round((b.catchAdd || 0) * 1000) / 10}% · 闪光 +${Math.round((b.shinyAdd || 0) * 100)}% · 战力 +${Math.round((b.combatAdd || 0) * 100)}%
              </div>
              <div class="row__desc" style="margin-top:4px">
                ${
                  wornMon
                    ? `刻印伙伴：<strong>${escapeHtml(wornMon.name)}</strong>（Lv.${wornMon.lvl || 1} · 太古印记共鸣保护生效）`
                    : curLvl > 0
                      ? "状态：陈列于琥珀复苏舱（复苏舱被动生效 45%，刻印至伙伴激活 100% 血脉威能）"
                      : "状态：沉睡琥珀原石，集齐远古基因琥珀即可唤醒太古血脉"
                }
              </div>
              <div class="camp-recipe-card__costs" style="margin-top:6px">${formatAmberCostPills(nextCost)}</div>
            </div>
            <div class="boutique-acc-card__foot">
              ${
                curLvl < AMBER_IMPRINT_MAX_LEVEL
                  ? `<button type="button" class="btn btn--small ${canAwaken ? "btn--primary" : ""}" data-amber-awaken="${escapeHtml(def.id)}" ${canAwaken ? "" : "disabled"}>${curLvl === 0 ? "鉴定苏醒 Lv.1" : `基因升阶 Lv.${curLvl + 1}`}</button>`
                  : `<button type="button" class="btn btn--small" disabled>满阶太古印记 Lv.3</button>`
              }
              ${
                curLvl > 0 && selectedAmberMon
                  ? `<button type="button" class="btn btn--small ${isWornBySelected ? "" : "btn--primary"}" data-amber-equip="${escapeHtml(def.id)}" ${isWornBySelected ? "disabled" : ""}>${isWornBySelected ? "当前刻印中" : `为 ${escapeHtml(selectedAmberMon.name)} 刻印`}</button>`
                  : ""
              }
              ${
                wornMon
                  ? `<button type="button" class="btn btn--small btn--ghost" data-amber-unequip="${escapeHtml(def.id)}">卸下归舱</button>`
                  : ""
              }
            </div>
          </div>
        `;
      }).join("");

      const amberLogsHtml =
        amberRevival.recentLogs.length > 0
          ? amberRevival.recentLogs.slice(0, 2).map((ln) => `<div class="camp-log-line">${escapeHtml(ln)}</div>`).join("")
          : `<div class="camp-log-line">今日可免费点击右上「每日地脉掘珀 +${AMBER_REVIVAL_DAILY_GRANT}」获取远古基因琥珀，苏醒四大太古血脉印记！</div>`;

      rows.push(`
        <div class="row amber-revival-body">
          <div class="row__left" style="width:100%">
            <div class="amber-aura-panel">
              <div class="amber-aura-panel__top">
                ${renderUiIcon("amberFossilGem", 18)}
                <strong>四太古血脉苏醒共鸣与基因潜能光环</strong>
                <span class="tag">${amberAura.quadResonanceActive ? "四太古血脉苏醒共鸣生效中" : `苏醒满 4 枚印记激活四太古血脉苏醒共鸣（${amberAura.awakenedCount}/4）`}</span>
                <span class="tag">受保护太古印记伙伴 ${amberAura.imprintedMonCount} 只</span>
              </div>
              <div class="eco-aura-strip">
                <span class="shiny-aura-pill ${amberAura.prodAdd > 0 ? "is-on" : ""}">全资源产出 +${Math.round(amberAura.prodAdd * 1000) / 10}%</span>
                <span class="shiny-aura-pill ${amberAura.ivTrainAdd > 0 ? "is-on" : ""}">个体潜能训练 +${Math.round(amberAura.ivTrainAdd * 1000) / 10}%</span>
                <span class="shiny-aura-pill ${amberAura.catchAdd > 0 ? "is-on" : ""}">全局捕获率 +${Math.round(amberAura.catchAdd * 1000) / 10}%</span>
                <span class="shiny-aura-pill ${amberAura.shinyAdd > 0 ? "is-on" : ""}">闪光奇遇率 +${Math.round(amberAura.shinyAdd * 1000) / 10}%</span>
                <span class="shiny-aura-pill ${amberAura.combatAdd > 0 ? "is-on" : ""}">PvE 回廊战力 +${Math.round(amberAura.combatAdd * 1000) / 10}%</span>
              </div>
            </div>

            <div class="amber-pod-bar">
              <div class="amber-pod-bar__left">
                ${selectedAmberMon ? renderBeastIcon(selectedAmberMon.dex, selectedAmberMon.name, Boolean(selectedAmberMon.isShiny)) : renderUiIcon("amberRevivalPod", 22)}
                <span class="tag">复苏舱目标伙伴</span>
                <select class="input" data-amber-target-mon="1" ${list.length ? "" : "disabled"}>${amberPartnerOptsHtml}</select>
                ${selectedAmberMon ? `<span class="tag" data-amber-sel-iv="1">个体总值 ${sumMonIv(selectedAmberMon)}/186</span>` : ""}
                ${
                  selAmberImprint?.imprinted
                    ? `<span class="badge badge--ok">已刻印「${escapeHtml(selAmberImprint.imprintName)} Lv.${selAmberImprint.imprintLevel}」· 太古印记共鸣保护生效</span>`
                    : `<span class="tag">尚未刻印太古血脉印记</span>`
                }
              </div>
              <div class="amber-pod-bar__right">
                <button type="button" class="btn btn--small ${canRefineSelIv ? "btn--primary" : ""}" data-amber-refine-iv="1" ${canRefineSelIv ? "" : "disabled"} title="消耗 ${AMBER_IV_REFINE_COST} 枚远古基因琥珀，立即提升目标伙伴最低单项个体值">琥珀潜能淬炼 (-${AMBER_IV_REFINE_COST}琥珀)</button>
                ${
                  selectedAmberMon && selAmberImprint?.imprinted
                    ? `<button type="button" class="btn btn--small btn--ghost" data-amber-clear-mon="${selectedAmberMon.id}">卸下伙伴印记</button>`
                    : ""
                }
              </div>
            </div>

            <div class="amber-imprint-grid">${imprintCardsHtml}</div>
            <div class="star-camp-logs" style="margin-top:8px">${amberLogsHtml}</div>
          </div>
        </div>
      `);
    }

    // ========== ML-7 Section A: 萌灵「星辉配饰流彩造型屋」(Starlight Accessory & Aurora Styling Boutique) ==========
    const hideStarBoutique = Boolean(ui.functionsHideStarBoutique);
    const canClaimDailySand = canClaimDailyStarSand(state);
    const canSynthGold = canSynthesizeStarSand(state, "gold");
    const canSynthHerb = canSynthesizeStarSand(state, "herb");

    rows.push(`
      <div class="row star-boutique-header">
        <div class="row__left">
          <div class="row__title row__titleLine">
            ${renderUiIcon("boutiqueMirrorStar", 20)}
            <span>星辉配饰流彩造型屋</span>
            <span class="tag">信物裁制 ${boutiqueAura.craftedCount}/${BOUTIQUE_ACCESSORY_DEFS.length}（阶位 ${boutiqueAura.totalLevels}/${boutiqueAura.maxTotalLevels}）</span>
            <span class="tag">穿戴中 ${boutiqueAura.equippedCount}/3</span>
            <span class="tag">极光流彩 ${boutiqueAura.unlockedSheenCount}/${BOUTIQUE_SHEEN_STYLES.length}</span>
            <span class="tag tag--sand-stock">${renderResSvg("shinyStarSand", 14)}<span data-bq-sand-stock="1">闪光祈愿星砂 ×${sandOwnedCount}</span></span>
          </div>
          <div class="row__desc">使用「闪光祈愿星砂」、野餐香草、星露灵果或未来币，为心爱伙伴裁制升阶三大星辉信物配饰（Lv.1~3）并调染极光流彩光晕；穿戴或染色中的伙伴自动纳入防放生保护，持续赋予亲密升温、全资源产出、训练经验、闪光祈愿与殿堂战力加成！</div>
        </div>
        <div class="row__right star-boutique-header__btns">
          <button type="button" class="btn btn--small${canClaimDailySand ? " btn--primary" : ""}" data-bq-claim-daily="1" ${canClaimDailySand ? "" : "disabled"}>${canClaimDailySand ? `每日星辉凝砂 +${STAR_BOUTIQUE_DAILY_SAND_GRANT}` : "今日星砂已领"}</button>
          <button type="button" class="btn btn--small" data-bq-synth="gold" ${canSynthGold ? "" : "disabled"} title="消耗 50 未来币凝炼 +4 闪光祈愿星砂">未来币凝砂 (+4)</button>
          <button type="button" class="btn btn--small" data-bq-synth="herb" ${canSynthHerb ? "" : "disabled"} title="消耗野餐香草×2 + 星露灵果×2 萃取 +5 闪光祈愿星砂">香草星露凝砂 (+5)</button>
          <button type="button" class="btn btn--small btn--ghost" data-func-toggle="starBoutique">${hideStarBoutique ? "展开" : "收起"}</button>
        </div>
      </div>
    `);

    if (!hideStarBoutique) {
      const selectedBoutiqueMon =
        (starBoutique.selectedMonId ? list.find((m) => m && m.id === starBoutique.selectedMonId) : null) ||
        list[0] ||
        null;
      if (selectedBoutiqueMon && starBoutique.selectedMonId !== selectedBoutiqueMon.id) {
        starBoutique.selectedMonId = selectedBoutiqueMon.id;
      }
      const selMonBonus = selectedBoutiqueMon ? getMonBoutiqueBonus(state, selectedBoutiqueMon.id) : null;

      const partnerOptsHtml = list.length
        ? list
            .map((m) => {
              const mb = getMonBoutiqueBonus(state, m.id);
              const badgeTxt = [
                mb.accessoryName ? `${mb.accessoryName}Lv.${mb.accessoryLevel}` : "",
                mb.sheenName || "",
              ]
                .filter(Boolean)
                .join(" · ");
              return `<option value="${m.id}" ${selectedBoutiqueMon?.id === m.id ? "selected" : ""}>Lv.${m.lvl || 1} ${escapeHtml(m.name)}${badgeTxt ? `（${escapeHtml(badgeTxt)}）` : ""}</option>`;
            })
            .join("")
        : `<option value="">暂无伙伴（先去捕获萌灵吧）</option>`;

      const formatBoutiqueCostPills = (costObj) => {
        if (!costObj) return `<span class="tag">已臻满阶 Lv.${STAR_BOUTIQUE_MAX_LEVEL}</span>`;
        const pills = [];
        for (const [rid, amt] of Object.entries(costObj.res || {})) {
          const have = Math.floor(Number(state.res?.[rid]?.value) || 0);
          const ok = have >= amt;
          pills.push(
            `<span class="camp-cost-pill ${ok ? "is-ok" : "is-lack"}">${renderResSvg(rid, 12)}<span>${escapeHtml(RES_LABEL_ZH[rid] || rid)} ${have}/${amt}</span></span>`,
          );
        }
        for (const [pid, amt] of Object.entries(costObj.pantry || {})) {
          const have = Math.floor(Number(starCamp.pantry?.[pid]) || 0);
          const ok = have >= amt;
          pills.push(
            `<span class="camp-cost-pill ${ok ? "is-ok" : "is-lack"}">${renderResSvg(pid, 12)}<span>${escapeHtml(RES_LABEL_ZH[pid] || pid)} ${have}/${amt}</span></span>`,
          );
        }
        return pills.join("");
      };

      const accessoryCardsHtml = BOUTIQUE_ACCESSORY_DEFS.map((def) => {
        const entry = starBoutique.accessories[def.id] || { level: 0, equippedMonId: null };
        const curLvl = entry.level || 0;
        const wornMon = entry.equippedMonId ? list.find((m) => m && m.id === entry.equippedMonId) || null : null;
        const previewLvl = curLvl > 0 ? curLvl : 1;
        const b = def.bonusesByLevel[previewLvl] || {};
        const nextCost = getAccessoryNextCost(state, def.id);
        const canCraft = canCraftOrUpgradeAccessory(state, def.id);
        const isWornBySelected = Boolean(wornMon && selectedBoutiqueMon && wornMon.id === selectedBoutiqueMon.id);

        return `
          <div class="boutique-acc-card ${curLvl > 0 ? "is-crafted" : ""} ${wornMon ? "is-equipped" : ""}">
            <div>
              <div class="row__title row__titleLine">
                ${renderUiIcon(def.icon, 24)}
                <span>${escapeHtml(def.name)}</span>
                <span class="tag">${curLvl > 0 ? `Lv.${curLvl}/${STAR_BOUTIQUE_MAX_LEVEL}` : "待裁制"}</span>
                <span class="tag">${escapeHtml(def.slotLabel)}</span>
              </div>
              <div class="row__desc" style="margin-top:4px">${escapeHtml(def.desc)}</div>
              <div class="row__desc" style="margin-top:5px;color:#fde68a">
                ${curLvl > 0 ? `当前 Lv.${curLvl} 增益` : "Lv.1 裁制预览"}：全产 +${Math.round((b.prodAdd || 0) * 100)}% · 亲密 +${Math.round((b.affGainAdd || 0) * 100)}% · 训练 +${Math.round((b.trainExpAdd || 0) * 100)}% · 闪光 +${Math.round((b.shinyAdd || 0) * 100)}% · 战力 +${Math.round((b.combatAdd || 0) * 100)}%
              </div>
              <div class="row__desc" style="margin-top:4px">
                ${
                  wornMon
                    ? `穿戴伙伴：<strong>${escapeHtml(wornMon.name)}</strong>（Lv.${wornMon.lvl || 1} · 造型配饰穿戴中保护生效）`
                    : curLvl > 0
                      ? "状态：陈列于星辉展柜（展柜被动生效 40%，穿戴后激活 100% 辉光）"
                      : "状态：尚未裁制，集齐星砂即可打造信物"
                }
              </div>
              <div class="camp-recipe-card__costs" style="margin-top:6px">${formatBoutiqueCostPills(nextCost)}</div>
            </div>
            <div class="boutique-acc-card__foot">
              ${
                curLvl < STAR_BOUTIQUE_MAX_LEVEL
                  ? `<button type="button" class="btn btn--small ${canCraft ? "btn--primary" : ""}" data-bq-craft="${escapeHtml(def.id)}" ${canCraft ? "" : "disabled"}>${curLvl === 0 ? "星砂裁制 Lv.1" : `升阶至 Lv.${curLvl + 1}`}</button>`
                  : `<button type="button" class="btn btn--small" disabled>满阶信物 Lv.3</button>`
              }
              ${
                curLvl > 0 && selectedBoutiqueMon
                  ? `<button type="button" class="btn btn--small ${isWornBySelected ? "" : "btn--primary"}" data-bq-equip="${escapeHtml(def.id)}" ${isWornBySelected ? "disabled" : ""}>${isWornBySelected ? "当前穿戴中" : `为 ${escapeHtml(selectedBoutiqueMon.name)} 穿戴`}</button>`
                  : ""
              }
              ${
                wornMon
                  ? `<button type="button" class="btn btn--small btn--ghost" data-bq-unequip="${escapeHtml(def.id)}">卸下收纳</button>`
                  : ""
              }
            </div>
          </div>
        `;
      }).join("");

      const sheenCardsHtml = BOUTIQUE_SHEEN_STYLES.map((sDef) => {
        const unlocked = starBoutique.unlockedSheens.includes(sDef.id);
        const activeOnSel = Boolean(
          selectedBoutiqueMon && starBoutique.sheenByMon[String(selectedBoutiqueMon.id)] === sDef.id,
        );
        const canAffordUnlock = unlocked || sandOwnedCount >= sDef.unlockCostSand;
        return `
          <div class="boutique-sheen-card ${unlocked ? "is-unlocked" : ""} ${activeOnSel ? "is-active" : ""}">
            <div>
              <div class="row__title row__titleLine">
                ${renderUiIcon("boutiqueMirrorStar", 18)}
                <span>${escapeHtml(sDef.name)}</span>
                <span class="tag">${activeOnSel ? "穿戴生效" : unlocked ? "已解锁" : `${sDef.unlockCostSand} 星砂`}</span>
              </div>
              <div class="row__desc" style="margin-top:4px">${escapeHtml(sDef.desc)}</div>
            </div>
            <div class="boutique-acc-card__foot">
              <button
                type="button"
                class="btn btn--small ${!activeOnSel && canAffordUnlock ? "btn--primary" : ""}"
                data-bq-sheen="${escapeHtml(sDef.id)}"
                ${activeOnSel || !canAffordUnlock || (!selectedBoutiqueMon && unlocked) ? "disabled" : ""}
              >${
                activeOnSel
                  ? "当前流彩生效"
                  : unlocked
                    ? selectedBoutiqueMon
                      ? `为 ${escapeHtml(selectedBoutiqueMon.name)} 调染`
                      : "需先拥有伙伴"
                    : canAffordUnlock
                      ? `解锁调染 (-${sDef.unlockCostSand}星砂)`
                      : `需 ${sDef.unlockCostSand} 星砂`
              }</button>
            </div>
          </div>
        `;
      }).join("");

      const bqLogsHtml =
        starBoutique.recentLogs.length > 0
          ? starBoutique.recentLogs.slice(0, 2).map((ln) => `<div class="camp-log-line">${escapeHtml(ln)}</div>`).join("")
          : `<div class="camp-log-line is-muted">点击右上「每日星辉凝砂 +${STAR_BOUTIQUE_DAILY_SAND_GRANT}」免费领取星砂，即可立即为心仪伙伴裁制第一件星辉配饰！</div>`;

      rows.push(`
        <div class="row star-boutique-body">
          <div class="row__left" style="width:100%">
            <div class="boutique-aura-panel">
              <div class="boutique-aura-panel__top">
                ${renderUiIcon("boutiqueMirrorStar", 18)}
                <strong>星辉梳妆台全局辉光</strong>
                <span class="tag">${boutiqueAura.trioSetActive ? "三星辉套装共鸣生效中" : `穿戴满 3 件激活三星辉套装共鸣（${boutiqueAura.equippedCount}/3）`}</span>
                <span class="tag">受保护造型伙伴 ${boutiqueAura.styledMonCount} 只</span>
              </div>
              <div class="eco-aura-strip">
                <span class="shiny-aura-pill ${boutiqueAura.prodAdd > 0 ? "is-on" : ""}">全资源产出 +${Math.round(boutiqueAura.prodAdd * 1000) / 10}%</span>
                <span class="shiny-aura-pill ${boutiqueAura.affGainAdd > 0 ? "is-on" : ""}">亲密升温 +${Math.round(boutiqueAura.affGainAdd * 1000) / 10}%</span>
                <span class="shiny-aura-pill ${boutiqueAura.trainExpAdd > 0 ? "is-on" : ""}">训练经验 +${Math.round(boutiqueAura.trainExpAdd * 1000) / 10}%</span>
                <span class="shiny-aura-pill ${boutiqueAura.shinyAdd > 0 ? "is-on" : ""}">闪光祈愿气运 +${Math.round(boutiqueAura.shinyAdd * 1000) / 10}%</span>
                <span class="shiny-aura-pill ${boutiqueAura.combatAdd > 0 ? "is-on" : ""}">殿堂战力辉光 +${Math.round(boutiqueAura.combatAdd * 1000) / 10}%</span>
                ${boutiqueAura.catchAdd > 0 ? `<span class="shiny-aura-pill is-on">全局捕获率 +${Math.round(boutiqueAura.catchAdd * 1000) / 10}%</span>` : ""}
              </div>
            </div>

            <div class="boutique-dresser-bar">
              <div class="boutique-dresser-bar__left">
                ${selectedBoutiqueMon ? renderBeastIcon(selectedBoutiqueMon.dex, selectedBoutiqueMon.name, Boolean(selectedBoutiqueMon.isShiny)) : renderUiIcon("boutiqueMirrorStar", 22)}
                <label style="font-size:12px;font-weight:600">梳妆模特伙伴：</label>
                <select class="input" data-boutique-target-mon="1" ${list.length ? "" : "disabled"}>${partnerOptsHtml}</select>
                ${
                  selMonBonus?.styled
                    ? `<span class="tag tag--hof-ribbon">造型配饰穿戴中保护 · 战力+${Math.round(selMonBonus.combatAdd * 100)}% / 亲密+${Math.round(selMonBonus.affGainAdd * 100)}%</span>`
                    : `<span class="tag">未穿戴专属配饰</span>`
                }
              </div>
              <div class="boutique-dresser-bar__right">
                ${
                  selectedBoutiqueMon && selMonBonus?.styled
                    ? `<button type="button" class="btn btn--small btn--ghost" data-bq-clear-mon="${selectedBoutiqueMon.id}">卸下该伙伴全部装扮</button>`
                    : ""
                }
              </div>
            </div>

            <div class="boutique-acc-grid">${accessoryCardsHtml}</div>

            <div class="boutique-sheen-section">
              <div class="row__title row__titleLine">
                ${renderUiIcon("boutiqueMirrorStar", 18)}
                <span>极光流彩染色光晕坊</span>
                <span class="tag">最多同时为 3 只伙伴调染流彩光晕</span>
              </div>
              <div class="boutique-sheen-grid">${sheenCardsHtml}</div>
            </div>

            <div class="star-camp-logs" style="margin-top:8px">${bqLogsHtml}</div>
          </div>
        </div>
      `);
    }

    // ========== ML-7 Section B: 萌灵「冠军联盟四天王殿堂赛」(Champion League Elite Four & Grand Champion Gauntlet) ==========
    const hideChampionLeague = Boolean(ui.functionsHideChampionLeague);
    const resolveLeagueTypes = (m) =>
      Array.isArray(m?.types) && m.types.length ? m.types : getBeastDataByDex?.(m?.dex)?.types || ["wind"];
    if (champLeague.squadIds.length === 0 && list.length > 0) {
      autofillChampionLeagueSquad(state, resolveLeagueTypes, monPower);
    }
    const leagueSquadMons = champLeague.squadIds
      .map((id) => list.find((m) => m && m.id === id) || null)
      .filter(Boolean);
    const leagueSynergy = evaluateLeagueSquadSynergy(state, leagueSquadMons, {
      getMonTypes: resolveLeagueTypes,
      getBeastDataByDex,
    });
    let funcLeagueModalHtml = "";

    rows.push(`
      <div class="row champion-league-header">
        <div class="row__left">
          <div class="row__title row__titleLine">
            ${renderUiIcon("leagueEliteCrest", 20)}
            <span>冠军联盟四天王殿堂赛</span>
            <span class="tag tag--hof-ribbon">${renderUiIcon("leagueChampionRibbon", 14)}<span>殿堂阶位 Tier ${leagueBonus.hallOfFameTier}/${CHAMPION_LEAGUE_MAX_TIER}</span></span>
            <span class="tag">累计登顶 ${leagueBonus.championClears} 次</span>
            <span class="tag">当前驻殿 ${champLeague.activeStageIdx + 1}/${CHAMPION_LEAGUE_STAGES.length}</span>
          </div>
          <div class="row__desc">选派 3 只精锐伙伴组成冠军小队，连续迎战「炎狱天王 → 沧溟天王 → 翠岚天王 → 星穹天王 → 圣殿总冠军」五重巅峰试炼！全面汇聚【元素双灵羁绊 + 薄荷性格调律 + 星营料理盛宴 + 星辉造型配饰】四维共鸣，赢取「闪光祈愿星砂」、参战伙伴永久「冠军殿堂绶带」与全局殿堂阶位加成！</div>
        </div>
        <div class="row__right league-header__btns">
          <button type="button" class="btn btn--small" data-func-league-auto="1" ${list.length > 0 ? "" : "disabled"}>一键优选三灵</button>
          <button type="button" class="btn btn--small" data-func-league-open-modal="1" ${list.length > 0 ? "" : "disabled"}>编排阵容 (${leagueSquadMons.length}/${CHAMPION_LEAGUE_SQUAD_SIZE})</button>
          <button type="button" class="btn btn--small" data-func-league-fight="single" ${leagueSquadMons.length > 0 ? "" : "disabled"}>逐殿挑战（第 ${champLeague.activeStageIdx + 1} 殿）</button>
          <button type="button" class="btn btn--small btn--primary" data-func-league-fight="full" ${leagueSquadMons.length > 0 ? "" : "disabled"}>五连战冲击总冠军</button>
          <button type="button" class="btn btn--small btn--ghost" data-func-toggle="championLeague">${hideChampionLeague ? "展开" : "收起"}</button>
        </div>
      </div>
    `);

    if (!hideChampionLeague) {
      const roleLabels = ["先锋主将", "中坚奇兵", "压阵王牌"];
      const benchHtml = [0, 1, 2]
        .map((slotIdx) => {
          const m = leagueSquadMons[slotIdx] || null;
          if (!m) {
            return `
              <div class="league-squad-slot is-empty">
                <div class="row__title row__titleLine"><span class="tag">${roleLabels[slotIdx]}</span><span>待选派伙伴</span></div>
                <div class="row__desc" style="margin-top:4px">点击「编排阵容」或「一键优选三灵」上阵伙伴</div>
              </div>
            `;
          }
          const mTypes = resolveLeagueTypes(m)
            .map((t) => `<span class="badge type type-${escapeHtml(t)}">${escapeHtml(TYPE_ZH?.[t] || t)}</span>`)
            .join("");
          const bq = getMonBoutiqueBonus(state, m.id);
          const ribbons = Math.max(0, Math.floor(Number(m.hallOfFameRibbons) || 0));
          return `
            <div class="league-squad-slot">
              <div class="row__title row__titleLine">
                <span class="tag">${roleLabels[slotIdx]}</span>
                ${renderBeastIcon(m.dex, m.name, Boolean(m.isShiny))}
                <span>${escapeHtml(m.name)}</span>
                <span class="tag">Lv.${m.lvl || 1}</span>
                ${ribbons > 0 ? `<span class="tag tag--hof-ribbon">${renderUiIcon("leagueChampionRibbon", 13)}<span>绶带×${ribbons}</span></span>` : ""}
              </div>
              <div class="row__desc" style="margin-top:4px">
                ${mTypes} 战力 ${Math.floor(monPower(m))}${bq.styled ? ` · 穿戴加成 +${Math.round(bq.combatAdd * 100)}%` : ""}${normalizeMintTuning(m.mintTuning) ? " · 已调律" : ""}
              </div>
            </div>
          `;
        })
        .join("");

      const stageTrackHtml = CHAMPION_LEAGUE_STAGES.map((stg, idx) => {
        const cInfo = champLeague.clearedStages[stg.id] || null;
        const isActive = champLeague.activeStageIdx === idx;
        const enemyIcons = stg.enemies.map((e) => renderBeastIcon(e.dex, e.name, false)).join("");
        const elemText = stg.elements.map((el) => TYPE_ZH?.[el] || el).join("/");
        const estPower = estimateLeagueStagePower(stg);
        const rwSand = cInfo ? stg.repeatRewards.shinyStarSand : stg.firstRewards.shinyStarSand;
        return `
          <div class="league-stage-node ${isActive ? "is-active" : ""} ${cInfo ? "is-cleared" : ""} ${stg.isChampion ? "is-champion" : ""}">
            <div>
              <div class="row__title row__titleLine">
                ${renderUiIcon(stg.isChampion ? "leagueChampionRibbon" : "leagueEliteCrest", 16)}
                <span>${stg.order}. ${escapeHtml(stg.shortTitle)}</span>
              </div>
              <div class="row__desc" style="margin-top:2px">${escapeHtml(stg.masterTitle)}（${escapeHtml(elemText)}）</div>
              <div class="league-stage-node__icons" style="margin-top:5px">${enemyIcons}</div>
            </div>
            <div>
              <div class="row__desc">推荐战力 ${estPower} · ${cInfo ? `重复星砂+${rwSand}` : `首通星砂+${rwSand}`}</div>
              <div style="margin-top:4px">
                ${
                  cInfo
                    ? `<span class="badge badge--ok">已攻克 · ${cInfo.stars}星（累计 ${cInfo.clears} 次）</span>`
                    : isActive
                      ? `<span class="tag">当前驻殿目标</span>`
                      : `<span class="tag">连战待突破</span>`
                }
              </div>
            </div>
          </div>
        `;
      }).join("");

      const lastRun = champLeague.lastRunSummary;
      const lastRunText = lastRun
        ? lastRun.championCleared
          ? `最近战报：成功连破五殿荣登总冠军（共 ${lastRun.totalRounds} 回合 · 获闪光祈愿星砂 +${lastRun.rewardsEarned?.shinyStarSand || 0} · 殿堂阶位 Tier ${lastRun.hallOfFameTier}）`
          : lastRun.stoppedTitle
            ? `最近战报：连闯 ${lastRun.stagesCleared} 殿后止步于【${lastRun.stoppedTitle}】（获闪光祈愿星砂 +${lastRun.rewardsEarned?.shinyStarSand || 0}）`
            : `最近战报：已攻克 ${lastRun.stagesCleared} 殿（获闪光祈愿星砂 +${lastRun.rewardsEarned?.shinyStarSand || 0}）`
        : "尚未发起殿堂挑战：集结元素羁绊、薄荷调律、露营盛宴与星辉配饰，向四天王与圣殿总冠军发起冲击吧！";

      const latestHof = champLeague.hallOfFameRecords[0] || null;
      const hofLine = latestHof
        ? `最新殿堂留名（Tier ${latestHof.tier}）：${latestHof.squad.map((s) => `${s.name} Lv.${s.lvl}（绶带×${s.ribbons}）`).join(" · ")}`
        : "冠军殿堂荣誉墙：首次击败第 5 殿「圣殿总冠军 · 曜宸」即可为参战三灵刻印专属【冠军殿堂绶带】！";

      rows.push(`
        <div class="row champion-league-body">
          <div class="row__left" style="width:100%">
            <div class="league-aura-panel">
              <div class="league-aura-panel__top">
                ${renderUiIcon("leagueChampionRibbon", 18)}
                <strong>四维巅峰共鸣与冠军殿堂全局辉光</strong>
                <span class="tag">小队总增伤 +${Math.round(leagueSynergy.totalOutAdd * 100)}% · 减伤 ${Math.round((1 - leagueSynergy.incomingDamageMul) * 100)}% · 殿间休整回复 ${Math.round(leagueSynergy.interStageHealPct * 100)}%</span>
                ${champLeague.activeStageIdx > 0 ? `<button type="button" class="btn btn--small btn--ghost" data-func-league-reset="1">重置至第 1 殿</button>` : ""}
              </div>
              <div class="eco-aura-strip">
                <span class="shiny-aura-pill ${leagueSynergy.bondOutAdd > 0 ? "is-on" : ""}">元素羁绊共鸣 +${Math.round(leagueSynergy.bondOutAdd * 100)}%</span>
                <span class="shiny-aura-pill ${leagueSynergy.tuningOutAdd > 0 ? "is-on" : ""}">薄荷调律加成 +${Math.round(leagueSynergy.tuningOutAdd * 100)}%（已调律 ${leagueSynergy.tunedCount}/3）</span>
                <span class="shiny-aura-pill ${leagueSynergy.campOutAdd > 0 ? "is-on" : ""}">星营料理盛宴 +${Math.round(leagueSynergy.campOutAdd * 100)}%</span>
                <span class="shiny-aura-pill ${leagueSynergy.boutiqueOutAdd > 0 ? "is-on" : ""}">星辉造型配饰 +${Math.round(leagueSynergy.boutiqueOutAdd * 100)}%（穿戴 ${leagueSynergy.squadStyledCount}/3）</span>
                <span class="shiny-aura-pill ${leagueBonus.hallOfFameTier > 0 ? "is-on" : ""}">殿堂 Tier ${leagueBonus.hallOfFameTier} 全局：全产 +${Math.round(leagueBonus.prodAdd * 100)}% · 捕获 +${Math.round(leagueBonus.catchAdd * 1000) / 10}% · 增伤 +${Math.round(leagueBonus.pveOutAdd * 100)}%</span>
              </div>
            </div>

            <div class="league-squad-bench">${benchHtml}</div>
            <div class="league-stages-track">${stageTrackHtml}</div>

            <div class="league-hof-wall">
              <div>${escapeHtml(hofLine)}</div>
              <div style="margin-top:3px;opacity:0.88">${escapeHtml(lastRunText)}</div>
            </div>
          </div>
        </div>
      `);

      if (ui.funcLeagueModalOpen) {
        const modalCandidates = list
          .slice()
          .sort((a, b) => {
            const aIn = champLeague.squadIds.includes(a.id) ? 1 : 0;
            const bIn = champLeague.squadIds.includes(b.id) ? 1 : 0;
            if (aIn !== bIn) return bIn - aIn;
            return monPower(b) - monPower(a);
          });
        const modalRows = modalCandidates
          .map((m) => {
            const checked = champLeague.squadIds.includes(m.id);
            const disableAdd = !checked && champLeague.squadIds.length >= CHAMPION_LEAGUE_SQUAD_SIZE;
            const mTypes = resolveLeagueTypes(m)
              .map((t) => `<span class="badge type type-${escapeHtml(t)}">${escapeHtml(TYPE_ZH?.[t] || t)}</span>`)
              .join("");
            const bq = getMonBoutiqueBonus(state, m.id);
            const ribbons = Math.max(0, Math.floor(Number(m.hallOfFameRibbons) || 0));
            return `
              <label class="modalPick ${checked ? "is-checked" : ""}">
                <input type="checkbox" data-func-league-check="${m.id}" ${checked ? "checked" : ""} ${disableAdd ? "disabled" : ""} />
                ${renderBeastIcon(m.dex, m.name, Boolean(m.isShiny))}
                <div class="modalPick__main">
                  <div class="modalPick__title">${escapeHtml(m.name)} <span class="tag">Lv.${m.lvl || 1}</span> ${mTypes} ${ribbons > 0 ? `<span class="tag tag--hof-ribbon">殿堂绶带×${ribbons}</span>` : ""}</div>
                  <div class="modalPick__sub">战力 ${Math.floor(monPower(m))}${bq.styled ? ` · 星辉配饰增幅 +${Math.round(bq.combatAdd * 100)}%` : ""}${normalizeMintTuning(m.mintTuning) ? " · 已薄荷调律" : ""}</div>
                </div>
              </label>
            `;
          })
          .join("");

        funcLeagueModalHtml = `
          <div class="modalOverlay" data-func-league-modal-overlay="1">
            <div class="modal" role="dialog" aria-modal="true" aria-label="冠军联盟三灵小队编排">
              <div class="modal__head">
                <div class="modal__title">${renderUiIcon("leagueEliteCrest", 20)} <span>冠军联盟三灵编队（${champLeague.squadIds.length}/${CHAMPION_LEAGUE_SQUAD_SIZE}）</span></div>
                <div class="modal__headActions">
                  <button type="button" class="btn btn--small" data-func-league-auto="1">一键优选三灵</button>
                  <button type="button" class="btn btn--small" data-func-league-modal-close="1">关闭</button>
                </div>
              </div>
              <div class="modal__desc">选派最多 3 只伙伴出征四天王殿堂赛（出征席位自动受防放生保护；搭配元素双灵共鸣、薄荷调律与星辉配饰可获巨额连战增幅）。</div>
              <div class="modal__body">${modalRows || '<div class="muted" style="padding:12px">暂无可编入伙伴。</div>'}</div>
              <div class="actions">
                <button type="button" class="btn btn--primary" data-func-league-modal-close="1">完成冠军编队</button>
              </div>
            </div>
          </div>
        `;
      }
    }

    // ========== ML-6: 萌灵「星界羁绊露营野餐屋」与料理食谱风味增益工坊 ==========
    const hideStarCamp = Boolean(ui.functionsHideStarCamp);
    const ensembleLeft = getStarCampEnsembleLeft(state);
    const campCandidates = getAvailableStarCampCandidates(state);
    const canAutoFillCamp = campCandidates.length > 0;
    const canEnsemble = starCampAura.stationedCount > 0 && ensembleLeft > 0;
    let starCampModalHtml = "";

    rows.push(`
      <div class="row star-camp-header">
        <div class="row__left">
          <div class="row__title row__titleLine">
            ${renderUiIcon("campTentStar", 20)}
            <span>星界羁绊露营野餐屋</span>
            <span class="tag tag--camp-lvl">营地 Lv.${starCamp.level}/${STAR_CAMP_MAX_LEVEL}（${starCamp.exp}/${starCampAura.expNeed}）</span>
            <span class="tag">驻营 ${starCampAura.stationedCount}/${STAR_CAMP_MAX_SLOTS}</span>
            <span class="tag">食谱图鉴 ${starCampAura.codexCount}/${starCampAura.totalRecipes}</span>
            <span class="tag tag--camp-pantry">${renderResSvg("picnicHerb", 13)}<span>野餐香草 ×${starCamp.pantry.picnicHerb}</span></span>
            <span class="tag tag--camp-pantry">${renderResSvg("starBerry", 13)}<span>星露灵果 ×${starCamp.pantry.starBerry}</span></span>
            <span class="tag tag--camp-pantry">${renderResSvg("campToken", 13)}<span>星营徽章 ×${starCamp.pantry.campToken}</span></span>
          </div>
          <div class="row__desc">邀请 1~4 只伙伴围坐星光篝火（自动纳入防放生保护且支持随时换班），持续累积亲密度、营地经验与野餐食材；每日开启「营火合奏互动」并在铜锅工坊烹制六大风味料理，为全营赋予强力盛宴增益！</div>
        </div>
        <div class="row__right star-camp-header__btns">
          <button type="button" class="btn btn--small btn--primary" data-camp-autofill="1" ${canAutoFillCamp ? "" : "disabled"}>一键温馨入驻</button>
          <button type="button" class="btn btn--small" data-camp-open-squad="1">更换驻营 (${starCampAura.stationedCount}/${STAR_CAMP_MAX_SLOTS})</button>
          <button type="button" class="btn btn--small${canEnsemble ? " btn--primary" : ""}" data-camp-ensemble="1" ${canEnsemble ? "" : "disabled"}>营火合奏（${ensembleLeft}/${STAR_CAMP_DAILY_ENSEMBLE_LIMIT}）</button>
          <button type="button" class="btn btn--small btn--ghost" data-func-toggle="starCamp">${hideStarCamp ? "展开" : "收起"}</button>
        </div>
      </div>
    `);

    if (!hideStarCamp) {
      const stationedMons = starCamp.stationedIds
        .map((id) => list.find((m) => m && m.id === id) ?? null)
        .filter(Boolean);

      const campForagePct =
        stationedMons.length > 0
          ? Math.max(2, Math.min(99, Math.round(((starCamp.forageCarrySec || 0) / STAR_CAMP_FORAGE_CYCLE_SEC) * 100)))
          : 0;
      const campForageRemSec =
        stationedMons.length > 0
          ? Math.max(1, Math.ceil((STAR_CAMP_FORAGE_CYCLE_SEC - (starCamp.forageCarrySec || 0)) / Math.max(1, starCampAura.campSpeedMul || 1)))
          : STAR_CAMP_FORAGE_CYCLE_SEC;

      const campSlotsHtml = Array.from({ length: STAR_CAMP_MAX_SLOTS }, (_, idx) => {
        const mon = stationedMons[idx];
        if (!mon) {
          return `
            <div class="camp-companion-slot is-empty">
              <div class="camp-companion-slot__emptyHead">
                ${renderUiIcon("campTentStar", 20)}
                <span>星火营席 ${idx + 1}</span>
              </div>
              <div class="camp-companion-slot__emptyHint">虚席以待 · 入驻享防放生保护</div>
              <button type="button" class="btn btn--small" data-camp-open-squad="1" ${canAutoFillCamp ? "" : "disabled"}>邀请入驻</button>
            </div>
          `;
        }
        const mTypes = (Array.isArray(mon.types) && mon.types.length ? mon.types : getBeastDataByDex?.(mon.dex)?.types || []).slice(0, 2);
        const typePills = mTypes
          .map((t) => `<span class="badge type type-${escapeHtml(t)}">${escapeHtml(TYPE_ZH?.[t] ?? t)}</span>`)
          .join("");
        const natZh = getNatureInfo(mon.nature)?.name || "纯真";
        const affVal = Math.min(100, Math.max(0, Math.floor(Number(mon.affection) || 0)));
        return `
          <div class="camp-companion-slot is-filled">
            <div class="camp-companion-slot__top">
              ${renderBeastIcon(mon.dex, mon.name, Boolean(mon.isShiny))}
              <div class="camp-companion-slot__info">
                <div class="camp-companion-slot__nameRow">
                  <span class="camp-companion-slot__name">${escapeHtml(mon.name)}</span>
                  <span class="tag">Lv.${mon.lvl}</span>
                </div>
                <div class="camp-companion-slot__types">${typePills}<span class="camp-companion-slot__nat">${escapeHtml(natZh)}</span></div>
              </div>
            </div>
            <div class="camp-companion-slot__bondBar">
              <div class="camp-companion-slot__bondTrack"><i style="width:${affVal}%"></i></div>
              <div class="camp-companion-slot__bondMeta">
                <span>亲密 ${affVal}/100</span>
                <span class="camp-protect-badge">防放生保护</span>
                <button type="button" class="btn btn--small btn--ghost camp-slot-remove-btn" data-camp-toggle-mon="${mon.id}" title="结束驻营休息">移出</button>
              </div>
            </div>
          </div>
        `;
      }).join("");

      const activeFeastsHtml =
        starCampAura.activeFeasts.length > 0
          ? starCampAura.activeFeasts
              .map((f) => {
                const pct = Math.max(2, Math.min(100, Math.round(((f.remainingSec || 0) / Math.max(1, f.totalSec || 1800)) * 100)));
                return `
                  <div class="camp-feast-chip">
                    <div class="camp-feast-chip__head">
                      ${renderUiIcon(f.icon, 22)}
                      <span class="camp-feast-chip__name">${escapeHtml(f.name)}</span>
                      <span class="tag">${f.stars}星风味</span>
                      <span class="camp-feast-chip__timer" data-camp-feast-rem="${escapeHtml(f.recipeId)}">${escapeHtml(fmtDuration(Math.ceil(f.remainingSec || 0)))}</span>
                    </div>
                    <div class="camp-feast-chip__bar"><i data-camp-feast-fill="${escapeHtml(f.recipeId)}" style="width:${pct}%"></i></div>
                  </div>
                `;
              })
              .join("")
          : `<div class="camp-feast-empty">${renderUiIcon("campPicnicBasket", 18)}<span>当前野餐桌暂无生效料理 — 在下方铜锅工坊选择食谱开火烹制，即可为全营呈上风味盛宴增益！</span></div>`;

      const formatRecipeBuffs = (def, scale = 1) => {
        const b = def.buffs || {};
        const out = [];
        if (b.prodAdd) out.push(`全资源产出 +${Math.round(b.prodAdd * scale * 1000) / 10}%`);
        if (b.trainExpAdd) out.push(`训练经验 +${Math.round(b.trainExpAdd * scale * 1000) / 10}%`);
        if (b.catchAdd) out.push(`全局捕获率 +${Math.round(b.catchAdd * scale * 1000) / 10}%`);
        if (b.ecoAffinityAdd) out.push(`沙盘契合 +${Math.round(b.ecoAffinityAdd * scale * 100) / 100}`);
        if (b.ecoYieldAdd) out.push(`沙盘收获 +${Math.round(b.ecoYieldAdd * scale * 1000) / 10}%`);
        if (b.pveComboAdd) out.push(`试炼与双打连携 +${Math.round(b.pveComboAdd * scale * 1000) / 10}%`);
        return out;
      };

      const recipeCardsHtml = CAMP_RECIPE_DEFS.map((rDef) => {
        const cooks = starCamp.recipes[rDef.id]?.cooks || 0;
        const mInfo = getRecipeMasteryInfo(cooks);
        const effScale = mInfo.discovered ? mInfo.potencyMul : 1;
        const effDurSec = Math.round(rDef.durationSec * (mInfo.discovered ? mInfo.durationMul : 1));
        const affordable = canAffordCampRecipe(state, rDef.id);
        const isActiveFeast = starCampAura.activeFeasts.some((f) => f.recipeId === rDef.id);

        const costBits = [];
        for (const [rid, need] of Object.entries(rDef.costRes || {})) {
          const have = Math.max(0, Math.floor(Number(state.res?.[rid]?.value) || 0));
          const ok = have >= need;
          costBits.push(
            `<span class="camp-cost-pill ${ok ? "is-ok" : "is-lack"}">${renderResSvg(rid, 13)}<span>${escapeHtml(RES_LABEL_ZH[rid] || rid)} ${have}/${need}</span></span>`,
          );
        }
        for (const [pid, need] of Object.entries(rDef.costPantry || {})) {
          const have = Math.max(0, Math.floor(Number(starCamp.pantry?.[pid]) || 0));
          const ok = have >= need;
          costBits.push(
            `<span class="camp-cost-pill ${ok ? "is-ok" : "is-lack"}">${renderResSvg(pid, 13)}<span>${escapeHtml(RES_LABEL_ZH[pid] || pid)} ${have}/${need}</span></span>`,
          );
        }

        const buffLines = formatRecipeBuffs(rDef, effScale)
          .map((txt) => `<span class="camp-buff-pill">${escapeHtml(txt)}</span>`)
          .join("");

        const nextHint = mInfo.nextNeed
          ? `累计 ${cooks}/${mInfo.nextNeed} 次升星`
          : `已达 3星满阶（烹制 ${cooks} 次）`;

        return `
          <div class="camp-recipe-card tier-${rDef.tier} ${mInfo.discovered ? "is-discovered" : ""} ${isActiveFeast ? "is-serving" : ""}">
            <div class="camp-recipe-card__head">
              <div class="camp-recipe-card__iconWrap">${renderUiIcon(rDef.icon, 38)}</div>
              <div class="camp-recipe-card__titleBox">
                <div class="camp-recipe-card__titleRow">
                  <span class="camp-recipe-card__name">${escapeHtml(rDef.name)}</span>
                  <span class="tag">${escapeHtml(rDef.tierLabel)}</span>
                </div>
                <div class="camp-recipe-card__masteryRow">
                  <span class="camp-mastery-badge stars-${mInfo.stars}">${escapeHtml(mInfo.label)}</span>
                  <span class="camp-recipe-card__next">${escapeHtml(nextHint)}</span>
                </div>
              </div>
            </div>
            <div class="camp-recipe-card__desc">${escapeHtml(rDef.desc)}</div>
            <div class="camp-recipe-card__buffs">${buffLines}</div>
            <div class="camp-recipe-card__meta">持续 ${escapeHtml(fmtDuration(effDurSec))} · 驻营伙伴亲密 +${Math.round(rDef.bondGain * effScale)} · 营地经验 +${rDef.campExp}</div>
            <div class="camp-recipe-card__costs">${costBits.join("")}</div>
            <div class="camp-recipe-card__foot">
              <button type="button" class="btn btn--small ${affordable ? "btn--primary" : ""}" data-camp-cook="${rDef.id}" ${affordable ? "" : "disabled"}>
                ${affordable ? (isActiveFeast ? "续烹顺延盛宴" : mInfo.discovered ? "开火烹制呈盘" : "首次试作解锁") : "食材不足"}
              </button>
            </div>
          </div>
        `;
      }).join("");

      const campLogsHtml =
        starCamp.recentLogs.length > 0
          ? starCamp.recentLogs.slice(0, 3).map((ln) => `<div class="camp-log-line">${escapeHtml(ln)}</div>`).join("")
          : `<div class="camp-log-line is-muted">星火微漾，邀请萌灵入驻并开启「营火合奏」或烹制佳肴，这里将记录伙伴们的温馨野餐趣闻。</div>`;

      rows.push(`
        <div class="row star-camp-body">
          <div class="row__left" style="width:100%">
            <div class="star-camp-aura-panel">
              <div class="star-camp-aura-panel__top">
                ${renderUiIcon("campTentStar", 18)}
                <span class="star-camp-aura-panel__name">星营伙伴共鸣 · ${escapeHtml(starCampAura.harmony.name)}</span>
                <span class="tag">${starCampAura.harmony.active ? "共鸣生效中" : "待激活"}</span>
                <span class="star-camp-aura-panel__desc">${escapeHtml(starCampAura.harmony.desc)}</span>
              </div>
              <div class="eco-aura-strip">
                <span class="shiny-aura-pill ${starCampAura.prodAdd > 0 ? "is-on" : ""}">营地与盛宴全产 +${Math.round(starCampAura.prodAdd * 1000) / 10}%</span>
                <span class="shiny-aura-pill ${starCampAura.trainExpAdd > 0 ? "is-on" : ""}">训练经验 +${Math.round(starCampAura.trainExpAdd * 1000) / 10}%</span>
                <span class="shiny-aura-pill ${starCampAura.catchAdd > 0 ? "is-on" : ""}">全局捕获率 +${Math.round(starCampAura.catchAdd * 1000) / 10}%</span>
                <span class="shiny-aura-pill ${starCampAura.ecoAffinityAdd > 0 || starCampAura.ecoYieldAdd > 0 ? "is-on" : ""}">沙盘契合 +${starCampAura.ecoAffinityAdd.toFixed(2)} · 收获 +${Math.round(starCampAura.ecoYieldAdd * 1000) / 10}%</span>
                <span class="shiny-aura-pill ${starCampAura.pveComboAdd > 0 ? "is-on" : ""}">试炼与双打连携伤害 +${Math.round(starCampAura.pveComboAdd * 1000) / 10}%</span>
              </div>
              <div class="star-camp-feast-strip">${activeFeastsHtml}</div>
            </div>

            <div class="star-camp-slots-grid">${campSlotsHtml}</div>

            <div class="star-camp-forage-box">
              <div class="eco-zone-progress">
                <div class="eco-zone-progress__bar"><i data-camp-forage-fill="1" style="width:${campForagePct}%"></i></div>
                <span class="eco-zone-progress__txt" data-camp-forage-txt="1">${
                  stationedMons.length > 0
                    ? `营火伴游采集 ${campForagePct}% · 约 ${escapeHtml(fmtDuration(campForageRemSec))} 后收获野餐香草与星露灵果（加速 x${(starCampAura.campSpeedMul || 1).toFixed(2)}）`
                    : "邀请 1~4 只萌灵入驻营地，即可持续累积亲密度并自动寻获野餐香草与星露灵果"
                }</span>
              </div>
              <div class="star-camp-logs">${campLogsHtml}</div>
            </div>

            <div class="star-camp-kitchen">
              <div class="star-camp-kitchen__head">
                <div class="star-camp-kitchen__title">
                  ${renderUiIcon("campCookingPot", 22)}
                  <span>料理食谱风味增益工坊</span>
                  <span class="tag">食谱图鉴 ${starCampAura.codexCount}/${starCampAura.totalRecipes}</span>
                  <span class="tag">3星极意 ${starCampAura.masteredCount}/${starCampAura.totalRecipes}</span>
                </div>
                <div class="star-camp-kitchen__hint">首烹点亮图鉴（每道永久全产+1% · 捕获+0.2%）；烹满 3/6 次晋升 2星/3星（盛宴强度与时长 +15%/+30%，3星额外永久连携伤害+1.5%）</div>
              </div>
              <div class="star-camp-recipe-grid">${recipeCardsHtml}</div>
            </div>
          </div>
        </div>
      `);

      if (ui.starCampModalOpen) {
        const awaySet = getCampUnavailableMonIds(state);
        const modalSorted = campCandidates
          .slice()
          .sort((a, b) => {
            const aIn = starCamp.stationedIds.includes(a.id) ? 1 : 0;
            const bIn = starCamp.stationedIds.includes(b.id) ? 1 : 0;
            if (aIn !== bIn) return bIn - aIn;
            const aAff = Number(a.affection) || 0;
            const bAff = Number(b.affection) || 0;
            if (aAff !== bAff) return aAff - bAff;
            return monPower(b) - monPower(a);
          });

        const modalRowsHtml = modalSorted.length
          ? modalSorted
              .map((m) => {
                const checked = starCamp.stationedIds.includes(m.id);
                const disableAdd = !checked && starCamp.stationedIds.length >= STAR_CAMP_MAX_SLOTS;
                const mTypes = (Array.isArray(m.types) && m.types.length ? m.types : getBeastDataByDex?.(m.dex)?.types || []).slice(0, 2);
                const tBadges = mTypes
                  .map((t) => `<span class="badge type type-${escapeHtml(t)}">${escapeHtml(TYPE_ZH?.[t] ?? t)}</span>`)
                  .join("");
                const aff = Math.min(100, Math.max(0, Math.floor(Number(m.affection) || 0)));
                return `
                  <label class="modalPick ${checked ? "is-checked" : ""}">
                    <input type="checkbox" data-camp-modal-check="${m.id}" ${checked ? "checked" : ""} ${disableAdd ? "disabled" : ""} />
                    ${renderBeastIcon(m.dex, m.name, Boolean(m.isShiny))}
                    <div class="modalPick__main">
                      <div class="modalPick__title">${escapeHtml(m.name)} <span class="tag">Lv.${m.lvl}</span> ${tBadges}</div>
                      <div class="modalPick__sub">亲密度 ${aff}/100 · 性格：${escapeHtml(getNatureInfo(m.nature)?.name || "纯真")} · 战力 ${monPower(m)}</div>
                    </div>
                  </label>
                `;
              })
              .join("")
          : `<div class="muted" style="padding:12px">暂无可入驻伙伴（正在远征/生态沙盘勘探/孵育中的伙伴需归队后方可入驻）。</div>`;

        starCampModalHtml = `
          <div class="modalOverlay" data-camp-modal-overlay="1">
            <div class="modal" role="dialog" aria-modal="true" aria-label="星界露营伙伴编排">
              <div class="modal__head">
                <div class="modal__title">${renderUiIcon("campTentStar", 20)} <span>星界露营驻营伙伴（${starCamp.stationedIds.length}/${STAR_CAMP_MAX_SLOTS}）</span></div>
                <div class="modal__headActions">
                  <button type="button" class="btn btn--small" data-camp-autofill="1">一键温馨优选</button>
                  <button type="button" class="btn btn--small" data-camp-clear="1">清空驻营</button>
                  <button type="button" class="btn btn--small" data-camp-modal-close="1">关闭</button>
                </div>
              </div>
              <div class="modal__desc">驻营伙伴自动获得放生保护（已跳过 ${awaySet.size} 只正在外出远征/沙盘勘探/孵育的伙伴），凑齐多系或同系伙伴可激活【星营伙伴共鸣】。</div>
              <div class="modal__body">${modalRowsHtml}</div>
              <div class="actions">
                <button type="button" class="btn btn--primary" data-camp-modal-close="1">完成驻营编排</button>
              </div>
            </div>
          </div>
        `;
      }
    }

    // ========== ML-5 Section 1: 秘境生态探索沙盘 (Secret Realm Eco-Exploration Sandbox) ==========
    const hideEcoSandbox = Boolean(ui.functionsHideEcoSandbox);
    const freeSurveysLeft = getEcoSandboxFreeSurveysLeft(state);
    const idleAnyCount = getIdleEcoSandboxCandidates(state, null).length;
    const canAutoDispatchAll = ECO_SANDBOX_ZONES.some((z) => !ecoSb.zones[z.id].active) && idleAnyCount > 0;
    const canClaimAllEco = readyEcoZonesCount > 0;
    let ecoSquadModalHtml = "";

    rows.push(`
      <div class="row eco-sandbox-header">
        <div class="row__left">
          <div class="row__title row__titleLine">
            ${renderUiIcon("ecoRelic", 20)}
            <span>秘境生态探索沙盘</span>
            <span class="tag">探索中 ${activeEcoZonesCount}/4 区</span>
            <span class="tag">古遗物 ${ecoRelicAura.unlockedCount}/${ecoRelicAura.totalRelics}</span>
            <span class="tag tag--mint-stock">${renderResSvg("tuningMint", 13)}<span>心性调律薄荷 ×${mintOwnedCount}</span></span>
            <span class="tag">今日免费速勘 ${freeSurveysLeft}/2</span>
          </div>
          <div class="row__desc">派遣空闲萌灵编队深入四大元素生态秘境（自动避开出战、受训、远征、孵育与本命锁），按属性与特性亲和带回心性调律薄荷、灵晶石、觉醒石与秘境古遗物。</div>
        </div>
        <div class="row__right eco-sandbox-header__btns">
          <button type="button" class="btn btn--small btn--primary" data-eco-auto-dispatch-all="1" ${canAutoDispatchAll ? "" : "disabled"}>全生态一键优选派遣</button>
          <button type="button" class="btn btn--small${canClaimAllEco ? " btn--primary" : ""}" data-eco-claim-all-redispatch="1" ${canClaimAllEco ? "" : "disabled"}>一键全收并续派${canClaimAllEco ? `（${readyEcoZonesCount}）` : ""}</button>
          <button type="button" class="btn btn--small btn--ghost" data-func-toggle="ecoSandbox">${hideEcoSandbox ? "展开" : "收起"}</button>
        </div>
      </div>
    `);

    if (!hideEcoSandbox) {
      const auraPillsHtml = `
        <div class="eco-aura-strip">
          <span class="shiny-aura-pill ${ecoRelicAura.prodAdd > 0 ? "is-on" : ""}">全资源产出 +${Math.round(ecoRelicAura.prodAdd * 1000) / 10}%</span>
          <span class="shiny-aura-pill ${ecoRelicAura.atkAdd > 0 || ecoRelicAura.defAdd > 0 || ecoRelicAura.speAdd > 0 ? "is-on" : ""}">遗物战力 攻+${Math.round(ecoRelicAura.atkAdd * 1000) / 10}% · 防+${Math.round(ecoRelicAura.defAdd * 1000) / 10}% · 速+${Math.round(ecoRelicAura.speAdd * 1000) / 10}%</span>
          <span class="shiny-aura-pill ${ecoRelicAura.trainExpAdd > 0 ? "is-on" : ""}">训练经验 +${Math.round(ecoRelicAura.trainExpAdd * 1000) / 10}%</span>
          <span class="shiny-aura-pill ${ecoRelicAura.catchAdd > 0 ? "is-on" : ""}">全局捕获率 +${Math.round(ecoRelicAura.catchAdd * 1000) / 10}%</span>
          <span class="shiny-aura-pill ${ecoRelicAura.sandboxSpeedAdd > 0 ? "is-on" : ""}">沙盘耗时 -${Math.round(ecoRelicAura.sandboxSpeedAdd * 1000) / 10}%</span>
        </div>
      `;

      const relicCardsHtml = ecoRelicAura.entries
        .map((r) => {
          const zDef = getEcoZoneDef(r.zoneId);
          return `
            <div class="eco-relic-chip ${r.unlocked ? "is-unlocked" : ""}">
              <div class="eco-relic-chip__top">
                ${renderUiIcon("ecoRelic", 18)}
                <span class="eco-relic-chip__name">${escapeHtml(r.name)}</span>
                <span class="tag">${r.unlocked ? `阶 ${r.rank}/${r.maxRank}` : "未发掘"}</span>
              </div>
              <div class="eco-relic-chip__desc">${escapeHtml(r.desc)} · 产自${escapeHtml(zDef?.name || r.zoneId)}</div>
            </div>
          `;
        })
        .join("");

      const zoneCardsHtml = ECO_SANDBOX_ZONES.map((zDef) => {
        const zState = ecoSb.zones[zDef.id];
        const activeIds = zState.active ? zState.squadIds : zState.stagedIds;
        const squadMons = activeIds
          .map((id) => list.find((m) => m && m.id === id) ?? null)
          .filter(Boolean);
        const evalSnap = evaluateEcoSquadAffinity(zDef.id, squadMons, state, { getBeastDataByDex });
        const effMul = zState.active ? Math.max(zState.affinityMul || 1, evalSnap.affinityMul) : evalSnap.affinityMul;
        const durSec = zState.active ? zState.durationSec : evalSnap.durationSec;
        const remSec = zState.active ? Math.max(0, Math.ceil(durSec - zState.elapsedSec)) : durSec;
        const pct = zState.active
          ? zState.completed
            ? 100
            : Math.max(3, Math.min(99, Math.round((zState.elapsedSec / Math.max(1, durSec)) * 100)))
          : 0;

        const prefTypeBadges = zDef.preferredTypes
          .map((t) => `<span class="badge type type-${escapeHtml(t)}">${escapeHtml(TYPE_ZH?.[t] ?? t)}</span>`)
          .join("");
        const prefTraitNames = zDef.preferredAbilities
          .slice(0, 3)
          .map((aid) => escapeHtml(getAbilityInfo(aid)?.name || aid))
          .join(" / ");

        const slotHtml = Array.from({ length: zDef.maxSquad }, (_, idx) => {
          const mon = squadMons[idx];
          if (!mon) {
            return `<div class="eco-squad-slot is-empty">空位 ${idx + 1}</div>`;
          }
          return `
            <div class="eco-squad-slot is-filled">
              ${renderBeastIcon(mon.dex, mon.name, Boolean(mon.isShiny))}
              <div class="eco-squad-slot__meta">
                <span class="eco-squad-slot__name">${escapeHtml(mon.name)}</span>
                <span class="eco-squad-slot__lvl">Lv.${mon.lvl}</span>
              </div>
            </div>
          `;
        }).join("");

        const rewardPreviewBits = Object.entries(evalSnap.previewRewards)
          .map(([rid, amt]) => `<span class="eco-reward-pill">${renderResSvg(rid, 13)}<span>${escapeHtml(RES_LABEL_ZH[rid] || rid)} +${amt}</span></span>`)
          .join("");

        const idleZoneCandidates = getIdleEcoSandboxCandidates(state, zDef.id);
        const clears = ecoSb.zoneClears?.[zDef.id] || 0;
        const canInstant =
          zState.active &&
          !zState.completed &&
          (freeSurveysLeft > 0 || (state.res?.searchFlare?.value ?? 0) >= 1 || (state.res?.futurecoin?.value ?? 0) >= 15);
        const instantLabel =
          freeSurveysLeft > 0
            ? "免费速勘"
            : (state.res?.searchFlare?.value ?? 0) >= 1
              ? "信号弹速勘"
              : "速勘(15币)";

        let footerHtml = "";
        if (!zState.active) {
          footerHtml = `
            <div class="eco-zone-card__foot">
              <div class="eco-zone-card__btns">
                <button type="button" class="btn btn--small" data-eco-open-squad="${zDef.id}">编队 (${squadMons.length}/${zDef.maxSquad})</button>
                <button type="button" class="btn btn--small" data-eco-autopick="${zDef.id}" ${idleZoneCandidates.length > 0 ? "" : "disabled"}>优选亲和</button>
              </div>
              <button type="button" class="btn btn--small btn--primary" data-eco-dispatch="${zDef.id}" ${squadMons.length > 0 ? "" : "disabled"}>派遣勘探（${escapeHtml(fmtDuration(durSec))}）</button>
            </div>
          `;
        } else if (zState.completed) {
          footerHtml = `
            <div class="eco-zone-progress is-done">
              <div class="eco-zone-progress__bar"><i style="width:100%"></i></div>
              <span class="eco-zone-progress__txt">勘探圆满 · 待领取秘境收获</span>
            </div>
            <div class="eco-zone-card__foot">
              <button type="button" class="btn btn--small" data-eco-claim="${zDef.id}">领取收获</button>
              <button type="button" class="btn btn--small btn--primary" data-eco-claim-redispatch="${zDef.id}">收获并原队续派</button>
            </div>
          `;
        } else {
          footerHtml = `
            <div class="eco-zone-progress">
              <div class="eco-zone-progress__bar"><i style="width:${pct}%"></i></div>
              <span class="eco-zone-progress__txt">勘探进度 ${pct}% · 剩余 ${escapeHtml(fmtDuration(remSec))}</span>
            </div>
            <div class="eco-zone-card__foot">
              <button type="button" class="btn btn--small" data-eco-instant="${zDef.id}" ${canInstant ? "" : "disabled"}>${escapeHtml(instantLabel)}</button>
              <button type="button" class="btn btn--small btn--danger" data-eco-cancel="${zDef.id}">撤回编队</button>
            </div>
          `;
        }

        return `
          <div class="eco-zone-card ${zState.completed ? "is-ready" : zState.active ? "is-active" : ""}">
            <div class="eco-zone-card__head">
              <div class="eco-zone-card__iconWrap">${renderUiIcon(zDef.icon, 36)}</div>
              <div class="eco-zone-card__titleBox">
                <div class="eco-zone-card__titleRow">
                  <span class="eco-zone-card__name">${escapeHtml(zDef.name)}</span>
                  <span class="tag">契合 x${effMul.toFixed(2)}</span>
                  <span class="tag">${clears > 0 ? `已探 ${clears} 次` : "首探必出遗物"}</span>
                </div>
                <div class="eco-zone-card__sub">${escapeHtml(zDef.subtitle)}</div>
              </div>
            </div>
            <div class="eco-zone-card__affinities">
              <span class="eco-zone-card__label">亲和元素：</span>${prefTypeBadges}
              <span class="eco-zone-card__traits">共鸣特性：${prefTraitNames}</span>
            </div>
            <div class="eco-squad-row">${slotHtml}</div>
            <div class="eco-reward-strip">
              ${rewardPreviewBits}
              <span class="eco-reward-pill">队内经验 +${evalSnap.monExp}</span>
            </div>
            ${footerHtml}
          </div>
        `;
      }).join("");

      rows.push(`
        <div class="row eco-sandbox-body">
          <div class="row__left" style="width:100%">
            <div class="eco-relic-panel">
              <div class="eco-relic-panel__title">
                ${renderUiIcon("ecoRelic", 16)}
                <span>秘境古遗物图鉴与全局共鸣光环</span>
                <span class="tag">累计阶数 ${ecoRelicAura.totalRank}/${ecoRelicAura.maxTotalRank}</span>
              </div>
              ${auraPillsHtml}
              <div class="eco-relic-grid">${relicCardsHtml}</div>
            </div>
            <div class="eco-zone-grid">${zoneCardsHtml}</div>
          </div>
        </div>
      `);

      if (typeof ui.ecoModalZoneId === "string" && getEcoZoneDef(ui.ecoModalZoneId)) {
        const modalZone = getEcoZoneDef(ui.ecoModalZoneId);
        const modalZState = ecoSb.zones[modalZone.id];
        const stagedSet = new Set(modalZState.stagedIds);
        const extBusySet = getNonSandboxBusyIds(state);
        const idleCandidates = getIdleEcoSandboxCandidates(state, modalZone.id);
        const busyCountSkipped = list.filter((m) => m && extBusySet.has(m.id)).length;

        const modalRowsHtml = idleCandidates.length
          ? idleCandidates
              .slice()
              .sort((a, b) => monPower(b) - monPower(a))
              .map((m) => {
                const checked = stagedSet.has(m.id);
                const disableNew = !checked && stagedSet.size >= modalZone.maxSquad;
                const mTypes = getMonTypesForExpedition(m, getBeastDataByDex);
                const typeMatch = mTypes.some((t) => modalZone.preferredTypes.includes(t));
                const traitMatch = modalZone.preferredAbilities.includes(m.ability);
                const abName = getAbilityInfo(m.ability)?.name || "—";
                const synTags = [
                  typeMatch ? "元素契合" : "",
                  traitMatch ? "特性共鸣" : "",
                ].filter(Boolean).join(" · ");
                return `
                  <div class="row func-mon-row">
                    <div class="row__left">
                      <div class="row__title row__titleLine">${renderBeastIcon(m.dex, m.name, Boolean(m.isShiny))}<span>${escapeHtml(m.name)}</span><span class="tag">Lv.${m.lvl}</span>${synTags ? `<span class="tag tag--bond-on">${escapeHtml(synTags)}</span>` : ""}</div>
                      <div class="row__desc">战力 ${monPower(m)} · 特性 ${escapeHtml(abName)} · 性格 ${escapeHtml(formatMonNatureWithTuning(m, { compact: true }))}</div>
                    </div>
                    <div class="row__right">
                      <input class="chk" type="checkbox" data-eco-modal-check="${m.id}" data-eco-modal-zone="${modalZone.id}" ${checked ? "checked" : ""} ${disableNew ? "disabled" : ""} />
                    </div>
                  </div>
                `;
              })
              .join("")
          : `<div class="muted" style="padding:12px">当前暂无可派遣的空闲萌灵（出战、训练、远征、孵育及本命灵契保护中的萌灵已被安全过滤）。</div>`;

        ecoSquadModalHtml = `
          <div class="modalOverlay" data-eco-modal-overlay="1">
            <div class="modal">
              <div class="modal__header">
                <div class="modal__title">${renderUiIcon(modalZone.icon, 20)}<span>${escapeHtml(modalZone.name)} · 勘探编队</span><span class="tag">已选 ${modalZState.stagedIds.length}/${modalZone.maxSquad}</span></div>
                <div class="modal__right">
                  <button type="button" class="btn btn--small" data-eco-autopick="${modalZone.id}">一键优选</button>
                  <button type="button" class="btn btn--small" data-eco-modal-clear="${modalZone.id}">清空</button>
                  <button type="button" class="btn btn--small" data-eco-modal-close="1">关闭</button>
                </div>
              </div>
              <div class="modal__desc">仅展示空闲萌灵（已自动保护 ${busyCountSkipped} 只处于主力阵容/训练/远征/孵育/本命契约中的伙伴）。</div>
              <div class="modal__body">${modalRowsHtml}</div>
              <div class="actions">
                <button type="button" class="btn btn--ghost" data-eco-modal-close="1">完成编队</button>
                <button type="button" class="btn btn--primary" data-eco-dispatch="${modalZone.id}" ${modalZState.stagedIds.length > 0 ? "" : "disabled"}>立即派遣勘探</button>
              </div>
            </div>
          </div>
        `;
      }
    }

    // ========== ML-5 Section 2: 性格薄荷定向调律工坊 (Temperament Mint Directed Tuning Workshop) ==========
    const hideMintWorkshop = Boolean(ui.functionsHideMintWorkshop);
    const totalTuningsApplied = Math.max(0, Math.floor(state.meta?.mintTuningsApplied || 0));

    rows.push(`
      <div class="row mint-workshop-header">
        <div class="row__left">
          <div class="row__title row__titleLine">
            ${renderResSvg("tuningMint", 20)}
            <span>性格薄荷定向调律工坊</span>
            <span class="tag tag--mint-stock">${renderResSvg("tuningMint", 13)}<span>库存 ×${mintOwnedCount}</span></span>
            <span class="tag">累计调律 ${totalTuningsApplied} 次</span>
          </div>
          <div class="row__desc">消耗「心性调律薄荷」定向重塑任意萌灵的六维成长倍率（+10% / -10% 或归元均衡），永久保留初始纪念性格标签，实时同步战力、星穹试炼与双圣殿对决。</div>
        </div>
        <div class="row__right">
          <button type="button" class="btn btn--small btn--ghost" data-func-toggle="mintWorkshop">${hideMintWorkshop ? "展开" : "收起"}</button>
        </div>
      </div>
    `);

    if (!hideMintWorkshop) {
      const validMons = list.filter(Boolean);
      const selectedMintMonId =
        typeof ui.mintWorkshopMonId === "number" && validMons.some((m) => m.id === ui.mintWorkshopMonId)
          ? ui.mintWorkshopMonId
          : validMons[0]?.id ?? null;
      const targetMon = selectedMintMonId != null ? validMons.find((m) => m.id === selectedMintMonId) ?? null : null;

      if (!targetMon) {
        rows.push(`
          <div class="row mint-workshop-body">
            <div class="row__left">
              <div class="row__desc muted">尚未拥有可调律的萌灵。前往「九域猎场」捕捉第一只伙伴后，即可在此使用心性调律薄荷定制六维偏向。</div>
            </div>
          </div>
        `);
      } else {
        const recSpec = recommendMintTuningForMon(targetMon, getBeastDataByDex);
        const curNorm = normalizeMintTuning(targetMon.mintTuning);

        let draftUp = ui.mintWorkshopUp;
        let draftDown = ui.mintWorkshopDown;
        const draftNeutral = Boolean(ui.mintWorkshopNeutral);
        if (!draftNeutral) {
          if (!TUNABLE_STATS.includes(draftUp)) draftUp = curNorm?.up || recSpec.up || "atk";
          if (!TUNABLE_STATS.includes(draftDown) || draftDown === draftUp) {
            draftDown = curNorm?.down && curNorm.down !== draftUp ? curNorm.down : draftUp === "spa" ? "atk" : "spa";
          }
        }
        const draftSpec = draftNeutral ? { up: null, down: null } : { up: draftUp, down: draftDown };
        const isSameAsCurrent = Boolean(curNorm && curNorm.up === draftSpec.up && curNorm.down === draftSpec.down);

        const calcStatsFn =
          typeof getMonCurrentStats === "function"
            ? (m) => getMonCurrentStats(m)
            : (m) => getMonCurrentStatsFallback(m, getBeastDataByDex);
        const calcPowerFn =
          typeof monPower === "function"
            ? (m) => monPower(m)
            : (m) => monPowerFallback(m, getBeastDataByDex);

        const statsBefore = calcStatsFn(targetMon);
        const powerBefore = calcPowerFn(targetMon);
        const previewClone = { ...targetMon, mintTuning: draftSpec };
        const statsAfter = calcStatsFn(previewClone);
        const powerAfter = calcPowerFn(previewClone);
        const powerDelta = powerAfter - powerBefore;

        const origNatureName = getNatureInfo(targetMon.nature)?.name || "勤奋";
        const curTuningText = curNorm ? describeMintTuning(curNorm) : "未调律（全维 1.00x）";
        const draftTuningText = describeMintTuning(draftSpec);

        const monOptionsHtml = validMons
          .slice()
          .sort((a, b) => calcPowerFn(b) - calcPowerFn(a))
          .map((m) => {
            const label = `${m.name}（Lv.${m.lvl} · 战力${calcPowerFn(m)} · ${formatMonNatureWithTuning(m, { compact: true })}）`;
            return `<option value="${m.id}" ${m.id === targetMon.id ? "selected" : ""}>${escapeHtml(label)}</option>`;
          })
          .join("");

        const presetsHtml = MINT_TUNING_PRESETS.map((p) => {
          const activePreset =
            (p.up === null && draftNeutral) || (!draftNeutral && p.up === draftUp && p.down === draftDown);
          return `<button type="button" class="btn btn--small${activePreset ? " btn--primary" : ""}" data-mint-preset="${escapeHtml(p.id)}" title="${escapeHtml(p.desc)}">${escapeHtml(p.name)}</button>`;
        }).join("");

        const upChipsHtml = TUNABLE_STATS.map((sk) => {
          const on = !draftNeutral && draftUp === sk;
          return `<button type="button" class="btn btn--small${on ? " btn--primary" : ""}" data-mint-up="${sk}">${escapeHtml(STAT_ZH[sk])} +10%</button>`;
        }).join("") + `<button type="button" class="btn btn--small${draftNeutral ? " btn--primary" : ""}" data-mint-up="neutral">归元均衡 (±0%)</button>`;

        const downChipsHtml = TUNABLE_STATS.map((sk) => {
          const on = !draftNeutral && draftDown === sk;
          const disabled = draftNeutral || draftUp === sk;
          return `<button type="button" class="btn btn--small${on ? " btn--danger" : ""}" data-mint-down="${sk}" ${disabled ? "disabled" : ""}>${escapeHtml(STAT_ZH[sk])} -10%</button>`;
        }).join("");

        const statDiffCellsHtml = ["hp", "atk", "def", "spa", "spd", "spe"]
          .map((sk) => {
            const bVal = statsBefore[sk] ?? 1;
            const aVal = statsAfter[sk] ?? 1;
            const diff = aVal - bVal;
            const cls = diff > 0 ? "is-up" : diff < 0 ? "is-down" : "";
            const diffTxt = diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : "±0";
            return `
              <div class="mint-stat-cell ${cls}">
                <span class="mint-stat-cell__lbl">${escapeHtml(STAT_ZH[sk])}</span>
                <span class="mint-stat-cell__vals">${bVal} → <strong>${aVal}</strong></span>
                <span class="mint-stat-cell__delta">${diffTxt}</span>
              </div>
            `;
          })
          .join("") + `
            <div class="mint-stat-cell mint-stat-cell--cp ${powerDelta > 0 ? "is-up" : powerDelta < 0 ? "is-down" : ""}">
              <span class="mint-stat-cell__lbl">总战力</span>
              <span class="mint-stat-cell__vals">${powerBefore} → <strong>${powerAfter}</strong></span>
              <span class="mint-stat-cell__delta">${powerDelta > 0 ? `+${powerDelta}` : powerDelta < 0 ? `${powerDelta}` : "±0"}</span>
            </div>
          `;

        const canApplyMint = mintOwnedCount >= 1 && !isSameAsCurrent;
        const applyBtnLabel = isSameAsCurrent
          ? "已处于该调律偏向"
          : mintOwnedCount < 1
            ? "心性调律薄荷不足（可通过上方秘境沙盘获取）"
            : `消耗 1 株心性调律薄荷 · 应用「${draftTuningText}」`;

        rows.push(`
          <div class="row mint-workshop-body">
            <div class="row__left" style="width:100%">
              <div class="mint-workshop-ControlsRow">
                <div class="mint-mon-picker">
                  <label class="mint-picker-label">选择调律伙伴：</label>
                  <select class="input mint-mon-select" data-mint-mon="1">${monOptionsHtml}</select>
                  <button type="button" class="btn btn--small" data-mint-recommend="1">智能推荐偏向</button>
                </div>
              </div>
              <div class="mint-commemorative-banner">
                <div class="mint-commemorative-mon">
                  ${renderBeastIcon(targetMon.dex, targetMon.name, Boolean(targetMon.isShiny))}
                  <div>
                    <div class="mint-commemorative-title">
                      <strong>${escapeHtml(targetMon.name)}</strong>
                      <span class="tag">Lv.${targetMon.lvl}</span>
                      <span class="badge badge--nature">原性格：${escapeHtml(origNatureName)}（永久纪念）</span>
                      <span class="mint-arrow">→</span>
                      <span class="badge badge--mint-active">当前偏向：${escapeHtml(curTuningText)}</span>
                    </div>
                    <div class="mint-commemorative-sub">拟定调律预览：<strong>${escapeHtml(origNatureName)} → ${escapeHtml(draftTuningText)}</strong></div>
                  </div>
                </div>
              </div>
              <div class="mint-presets-bar">
                <span class="mint-section-label">流派预设：</span>
                <div class="mint-chip-group">${presetsHtml}</div>
              </div>
              <div class="mint-custom-matrix">
                <div class="mint-matrix-row">
                  <span class="mint-section-label">增益维度 (+10%)：</span>
                  <div class="mint-chip-group">${upChipsHtml}</div>
                </div>
                <div class="mint-matrix-row">
                  <span class="mint-section-label">折损维度 (-10%)：</span>
                  <div class="mint-chip-group">${downChipsHtml}</div>
                </div>
              </div>
              <div class="mint-stat-diff-grid">${statDiffCellsHtml}</div>
              <div class="mint-workshop-foot">
                <span class="muted">提示：原性格风味与纪念标签永不丢失；调律结果即时作用于主线试炼、无尽塔、双圣殿与演武场。</span>
                <button type="button" class="btn btn--primary" data-mint-apply="1" ${canApplyMint ? "" : "disabled"}>${escapeHtml(applyBtnLabel)}</button>
              </div>
            </div>
          </div>
        `);
      }
    }

    rows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title row__titleLine">${renderBuildingSvg("trainingGround", 18)}<span>训练场</span><span class="tag">槽位 ${active.length}/${slotSize}</span></div>
          <div class="row__desc">训练中的萌灵：持续获取 10 倍实战经验，加速突破等级瓶颈。</div>
        </div>
        <div class="row__right">
          <button class="btn btn--small btn--ghost" data-func-toggle="training">${hideTraining ? "▸" : "▾"}</button>
        </div>
      </div>
    `);

    if (!hideTraining) {
      if (slotSize < 1) {
        rows.push(`
          <div class="row is-locked">
            <div class="row__left">
              <div class="row__title">未解锁</div>
              <div class="row__desc">建造“训练场”（功能建筑）后可用。</div>
            </div>
          </div>
        `);
      } else if (list.length === 0) {
        rows.push(`
          <div class="row is-locked">
            <div class="row__left">
              <div class="row__title">暂无萌灵</div>
              <div class="row__desc">先去捕捉一只吧。</div>
            </div>
          </div>
        `);
      } else {
        const trainingSet = new Set(active.map((m) => m.id));
        const used = active.length;
        const canTrainStart = used < slotSize;

        rows.push(`
          <div class="row">
            <div class="row__left">
              <div class="row__title row__titleLine">${renderResSvg("expCandy", 18)}<span>选择训练萌灵</span><span class="tag">已用 ${used}/${slotSize}</span></div>
              <div class="row__desc">派遣闲置萌灵进入训练槽位，自动积累实战经验。</div>
            </div>
            <div class="row__right">
              <button class="btn btn--primary" data-train-open ${canTrainStart ? "" : "disabled"}>选择训练萌灵</button>
            </div>
          </div>
        `);

        if (active.length > 0) {
          for (const m of active) {
            const exp = Math.max(0, Math.floor(typeof m.exp === "number" && Number.isFinite(m.exp) ? m.exp : 0));
            const needExp = m.lvl >= 100 ? 0 : Math.max(0, Math.floor(expNeedForLevel0(m.lvl)));
            const expText = needExp > 0 ? `${exp}/${needExp}` : `${exp}/MAX`;
            const nMul = natureTrainExpMul(m, active.length);
            const pass = monPassive(m);
            const abName = getAbilityInfo(m.ability)?.name || pass?.desc || "";
            const nHint =
              nMul > 1
                ? ` · 特性「${escapeHtml(abName)}」经验×${nMul.toFixed(2)}`
                : pass
                  ? ` · 特性「${escapeHtml(getAbilityInfo(m.ability)?.name || "")}」`
                  : "";
            rows.push(`
              <div class="row func-mon-row">
                <div class="row__left">
                  <div class="row__title row__titleLine">${renderBeastIcon(m.dex, m.name, Boolean(m.isShiny))}<span>训练中：${escapeHtml(m.name)}</span> <span class="tag">Lv.${m.lvl}</span></div>
                  <div class="row__desc">经验进度：${expText}${nHint}</div>
                </div>
                <div class="row__right">
                  <button class="btn btn--danger btn--small" data-train-cancel="${m.id}">取消训练</button>
                </div>
              </div>
            `);
          }
        }
      }
    }

    rows.push(`<div class="sidebar__divider"></div>`);

    const hideBreeding = Boolean(ui.functionsHideBreeding);

    rows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title row__titleLine">${renderBuildingSvg("breedingHouse", 18)}<span>育灵屋</span><span class="tag">经验 ×50</span></div>
          <div class="row__desc">饲养中的萌灵：双亲配对温养灵蛋（经验获取 ×50，消耗灵果 10/秒）。</div>
        </div>
        <div class="row__right">
          <button class="btn btn--small btn--ghost" data-func-toggle="breeding">${hideBreeding ? "▸" : "▾"}</button>
        </div>
      </div>
    `);

    const breedingUnlocked = (state.buildings?.breedingHouse?.owned ?? 0) > 0;
    ensureBreedingState(state);
    const breedingOn = Boolean(state.breeding.on);
    const techEffForBreed = typeof computeTechEffects === "function" ? computeTechEffects(state) : null;
    const shinyChanceMulForBreed =
      typeof techEffForBreed?.shinyChanceMul === "number" && Number.isFinite(techEffForBreed.shinyChanceMul)
        ? techEffForBreed.shinyChanceMul
        : 1;

    const renderAbilityLockControls = (abInfoA, abInfoB, curLock) => {
      const lock = normalizeAbilityLock(curLock);
      const labelA = abInfoA ? `锁定 A·${escapeHtml(abInfoA.name)}` : "锁定伙伴 A";
      const labelB = abInfoB ? `锁定 B·${escapeHtml(abInfoB.name)}` : "锁定伙伴 B";
      return `
        <div class="breed-lock-group" role="group" aria-label="被动特性遗传锁定">
          <button type="button" class="btn btn--small ${lock === "auto" ? "btn--primary" : "btn--ghost"}" data-breed-ability-lock="auto">双亲优选 (70%)</button>
          <button type="button" class="btn btn--small ${lock === "a" ? "btn--primary" : "btn--ghost"}" data-breed-ability-lock="a">${labelA}</button>
          <button type="button" class="btn btn--small ${lock === "b" ? "btn--primary" : "btn--ghost"}" data-breed-ability-lock="b">${labelB}</button>
        </div>
      `;
    };

    const renderEugenicsPreviewCard = (pA, pB, contextLabel = "优生孵蛋 2.0 · 遗传预览与虹光提率") => {
      const prev = computeBreedingPreview(state, pA, pB, {
        getSpeciesByPid,
        shinyChanceMul: shinyChanceMulForBreed,
      });
      const si = prev.shinyInfo;
      const charmBadge = si.charmActive ? "虹彩护符 +3判" : "虹彩护符 未启用";
      const parentBadge = si.shinyParentsCount > 0 ? `异色亲代 ×${si.shinyParentsCount} (+${si.parentRolls}判)` : "常色亲代 (+0判)";
      const pityBadge = `孵化保底 ${si.pity}/${si.pityCap} (+${si.pityRolls}判${si.softPityActive ? "·高热提升" : ""})`;

      let geneticsLine = "配对同进化链双亲（或与幻彩星泥配对）后，自动开启高个体潜力与星级成长底子优生继承。";
      if (prev.hasPair) {
        if (!prev.eligible) {
          geneticsLine = "当前两只萌灵不属于同一进化链且不含幻彩星泥，仅享受经验×50温养，不会产蛋。";
        } else {
          const spName = prev.offspringSpecies?.name ? escapeHtml(prev.offspringSpecies.name) : escapeHtml(prev.basePid || "子代萌灵");
          const starPart =
            prev.starBounds.maxStarsOut > 0
              ? `星级底子 ${prev.starBounds.guaranteedStars === prev.starBounds.maxStarsOut ? `必承 ${prev.starBounds.guaranteedStars}星` : `保底 ${prev.starBounds.guaranteedStars}星 / 最高 ${prev.starBounds.maxStarsOut}星`}`
              : "星级底子 0星（提升亲代星级可直承至3星）";
          geneticsLine = `子代：${spName} · 优选遗传 ${prev.inheritedIvCount}/6 项高个体（预计潜力 ${prev.expectedMinIvSum}~${prev.expectedMaxIvSum}/186） · ${starPart}`;
        }
      }

      return `
        <div class="row breed-eugenics-card">
          <div class="row__left">
            <div class="row__title row__titleLine">
              ${renderResSvg("eugenicsCharm", 18)}
              <span>${escapeHtml(contextLabel)}</span>
              <span class="tag breed-shiny-odds-tag">${renderResSvg("shinyCharm", 13)} 实际闪光率 1/${si.oddsDenom}（${si.pctText}%）</span>
            </div>
            <div class="row__desc">${geneticsLine}</div>
            <div class="breed-pills-row">
              <span class="breed-meta-pill">图鉴虹印：${escapeHtml(si.dexTier.label)}</span>
              <span class="breed-meta-pill ${si.charmActive ? "is-active" : ""}">${charmBadge}</span>
              <span class="breed-meta-pill ${si.shinyParentsCount > 0 ? "is-active" : ""}">${parentBadge}</span>
              <span class="breed-meta-pill ${si.pity > 0 ? "is-active" : ""}">${pityBadge}</span>
            </div>
            <div class="row__desc breed-ability-line">特性血脉规则：${escapeHtml(prev.abilityPreviewText)}</div>
          </div>
          <div class="row__right">
            ${renderAbilityLockControls(prev.abInfoA, prev.abInfoB, prev.abilityLock)}
          </div>
        </div>
      `;
    };

    if (!hideBreeding) {
      if (!breedingUnlocked) {
        rows.push(`
          <div class="row is-locked">
            <div class="row__left">
              <div class="row__title">未解锁</div>
              <div class="row__desc">建造“育灵屋”（功能建筑）后可用。</div>
            </div>
          </div>
        `);
      } else if (list.length < 2) {
        rows.push(`
          <div class="row is-locked">
            <div class="row__left">
              <div class="row__title">萌灵不足</div>
              <div class="row__desc">至少需要 2 只萌灵才能开始饲养。</div>
            </div>
          </div>
        `);
      } else {
        if (!breedingOn) {
          rows.push(`
            <div class="row">
              <div class="row__left">
                <div class="row__title row__titleLine">${renderResSvg("luckyEgg", 18)}<span>选择饲养萌灵</span><span class="tag">双亲优生配对</span></div>
                <div class="row__desc">选择两只萌灵开始饲养（同进化链或幻彩星泥会自动温养产蛋，高概率承袭双亲高潜力与指定特性）。</div>
              </div>
              <div class="row__right">
                <button class="btn btn--primary" data-breed-open>选择饲养萌灵</button>
              </div>
            </div>
          `);
        }

        const aId = typeof state.breeding.aId === "number" && Number.isFinite(state.breeding.aId) ? state.breeding.aId : null;
        const bId = typeof state.breeding.bId === "number" && Number.isFinite(state.breeding.bId) ? state.breeding.bId : null;
        const aMon = typeof aId === "number" ? list.find((m) => m && m.id === aId) ?? null : null;
        const bMon = typeof bId === "number" ? list.find((m) => m && m.id === bId) ?? null : null;

        rows.push(renderEugenicsPreviewCard(breedingOn ? aMon : null, breedingOn ? bMon : null));

        if (breedingOn) {
          const rem =
            typeof state.breeding.eggRemainingSec === "number" && Number.isFinite(state.breeding.eggRemainingSec)
              ? Math.max(0, state.breeding.eggRemainingSec)
              : 0;
          const lvl = clamp(state.buildings?.breedingHouse?.owned ?? 0, 0, 10);
          const breedTimeMul = legacyBreedTimeMul(state);
          const hatchAffAdd = legacyHatchAffectionAdd(state);
          const swiftNote =
            breedTimeMul < 0.999
              ? ` · 极速孵育 -${Math.round((1 - breedTimeMul) * 100)}%（破壳亲密 +${hatchAffAdd}）`
              : "";
          const eggText = rem > 0 ? `正在温养灵蛋：剩余 ${fmtDuration(rem)}（育灵屋 Lv.${lvl}${swiftNote}）` : `双亲温养中 · 尚未产蛋${swiftNote}`;

          rows.push(`
        <div class="row">
          <div class="row__left">
            <div class="row__title row__titleLine">${renderResSvg("luckyEgg", 18)}<span>饲养中</span><span class="tag">育灵屋 Lv.${lvl}</span></div>
            <div class="row__desc">${eggText}</div>
          </div>
          <div class="row__right">
            <button class="btn btn--danger btn--small" data-breed-cancel="1">取消饲养</button>
          </div>
        </div>
      `);

          if (aMon) {
            const expA = Math.max(0, Math.floor(typeof aMon.exp === "number" && Number.isFinite(aMon.exp) ? aMon.exp : 0));
            const needExpA = aMon.lvl >= 100 ? 0 : Math.max(0, Math.floor(expNeedForLevel0(aMon.lvl)));
            const expTextA = needExpA > 0 ? `${expA}/${needExpA}` : `${expA}/MAX`;
            const ivA = sumMonIv(aMon);
            const abA = getAbilityInfo(resolveParentAbilityId(aMon));
            const starTagA = (aMon.stars ?? 0) > 0 ? `<span class="tag">${aMon.stars}星</span>` : "";
            rows.push(`
          <div class="row func-mon-row">
            <div class="row__left">
              <div class="row__title row__titleLine">${renderBeastIcon(aMon.dex, aMon.name, Boolean(aMon.isShiny))}<span>饲养伙伴 A：${escapeHtml(aMon.name)}</span> <span class="tag">Lv.${aMon.lvl}</span>${starTagA}<span class="tag">潜力 ${ivA}/186 (${ivGradeTag(ivA)})</span></div>
              <div class="row__desc">经验进度：${expTextA}${abA ? ` · 特性「${escapeHtml(abA.name)}」（${escapeHtml(abA.desc)}）` : ""}</div>
            </div>
            <div class="row__right">
              <button class="btn btn--danger btn--small" data-breed-cancel="1">取消饲养</button>
            </div>
          </div>
        `);
          }
          if (bMon) {
            const expB = Math.max(0, Math.floor(typeof bMon.exp === "number" && Number.isFinite(bMon.exp) ? bMon.exp : 0));
            const needExpB = bMon.lvl >= 100 ? 0 : Math.max(0, Math.floor(expNeedForLevel0(bMon.lvl)));
            const expTextB = needExpB > 0 ? `${expB}/${needExpB}` : `${expB}/MAX`;
            const ivB = sumMonIv(bMon);
            const abB = getAbilityInfo(resolveParentAbilityId(bMon));
            const starTagB = (bMon.stars ?? 0) > 0 ? `<span class="tag">${bMon.stars}星</span>` : "";
            rows.push(`
          <div class="row func-mon-row">
            <div class="row__left">
              <div class="row__title row__titleLine">${renderBeastIcon(bMon.dex, bMon.name, Boolean(bMon.isShiny))}<span>饲养伙伴 B：${escapeHtml(bMon.name)}</span> <span class="tag">Lv.${bMon.lvl}</span>${starTagB}<span class="tag">潜力 ${ivB}/186 (${ivGradeTag(ivB)})</span></div>
              <div class="row__desc">经验进度：${expTextB}${abB ? ` · 特性「${escapeHtml(abB.name)}」（${escapeHtml(abB.desc)}）` : ""}</div>
            </div>
            <div class="row__right">
              <button class="btn btn--danger btn--small" data-breed-cancel="1">取消饲养</button>
            </div>
          </div>
        `);
          }
        }
      }
    }

    const TYPE_ZH_MAP = TYPE_ZH && typeof TYPE_ZH === "object" ? TYPE_ZH : {};
    const TYPE_KEYS_UI = Object.keys(TYPE_ZH_MAP);
    const monRegionByDex = (dex) => {
      const z = beastZone(dex);
      return typeof z === "number" ? (ZONE_IDS[z] ?? "other") : "other";
    };
    const regionLabel = (k) => ZONE_LABELS[k] ?? "其他";
    const getMonTypesSimple = (m) => {
      const localTypes = globalThis.BEAST_TYPES;
      if (localTypes && typeof localTypes === "object") {
        const lt = localTypes[m.dex];
        if (Array.isArray(lt) && lt.length > 0) return lt;
      }
      const api = getBeastDataByDex(m.dex);
      const types = Array.isArray(api?.types) ? api.types.slice(0, 2) : [];
      return types.filter((x) => typeof x === "string");
    };
    const sortMons = (arr, sortKey, dir0) => {
      const k = sortKey === "lvl" || sortKey === "dex" || sortKey === "iv" || sortKey === "power" ? sortKey : "power";
      const dir = dir0 === "asc" || dir0 === "desc" ? dir0 : "desc";
      const dirMul = dir === "asc" ? 1 : -1;
      const withPower = arr.map((m) => ({ m, p: monPower(m), iv: sumMonIv(m) }));
      const cmpAsc = (a, b) => {
        if (k === "iv") return (a.iv ?? 0) - (b.iv ?? 0) || (a.p ?? 0) - (b.p ?? 0) || (a.m.lvl ?? 0) - (b.m.lvl ?? 0);
        if (k === "dex") return (a.m.dex ?? 0) - (b.m.dex ?? 0) || (a.p ?? 0) - (b.p ?? 0) || (a.m.lvl ?? 0) - (b.m.lvl ?? 0);
        if (k === "lvl") return (a.m.lvl ?? 0) - (b.m.lvl ?? 0) || (a.p ?? 0) - (b.p ?? 0) || (a.m.dex ?? 0) - (b.m.dex ?? 0);
        return (a.p ?? 0) - (b.p ?? 0) || (a.m.lvl ?? 0) - (b.m.lvl ?? 0) || (a.m.dex ?? 0) - (b.m.dex ?? 0);
      };
      withPower.sort((a, b) => dirMul * cmpAsc(a, b));
      return withPower.map((x) => x.m);
    };

    let trainingModalHtml = "";
    if (ui.trainingModalOpen) {
      const trainingSet = new Set(active.map((m) => m.id));
      const used = active.length;
      const capLeft = Math.max(0, slotSize - used);
      const allCandidates = list.filter((m) => m && !trainingSet.has(m.id));

      const q0 = typeof ui.trainingModalQuery === "string" ? ui.trainingModalQuery : "";
      const q = String(q0 || "").trim();
      ui.trainingModalQuery = q;
      const qIsDigits = /^\d+$/.test(q);
      const qDex = qIsDigits ? Math.max(1, Math.floor(Number(q))) : null;
      const qLower = q.toLowerCase();

      const region0 = typeof ui.trainingModalRegion === "string" ? ui.trainingModalRegion : "all";
      const region = ["all", "meadow", "woods", "brook", "plateau", "dunes", "garden", "ridge", "hollow"].includes(region0) ? region0 : "all";
      const type0 = typeof ui.trainingModalType === "string" ? ui.trainingModalType : "all";
      const type = type0 === "all" || TYPE_KEYS_UI.includes(type0) ? type0 : "all";
      const sort0 = typeof ui.trainingModalSort === "string" ? ui.trainingModalSort : "power";
      const sort = ["power", "lvl", "dex"].includes(sort0) ? sort0 : "power";

      const dir0 = typeof ui.trainingModalSortDir === "string" ? ui.trainingModalSortDir : "";
      const dir = dir0 === "asc" || dir0 === "desc" ? dir0 : sort === "dex" ? "asc" : "desc";
      if (dir !== ui.trainingModalSortDir) ui.trainingModalSortDir = dir;

      const filtered = allCandidates
        .filter((m) => (region === "all" ? true : monRegionByDex(m.dex) === region))
        .filter((m) => (type === "all" ? true : getMonTypesSimple(m).includes(type)))
        .filter((m) => {
          if (!q) return true;
          if (qDex && Number.isFinite(qDex)) return Math.floor(m.dex ?? 0) === qDex;
          const nm = typeof m.name === "string" ? m.name : "";
          return nm.toLowerCase().includes(qLower);
        });

      const sorted = sortMons(filtered, sort, dir);

      const aliveSet = new Set(allCandidates.map((m) => m.id));
      const sel0 = Array.isArray(ui.trainingModalSelectedIds) ? ui.trainingModalSelectedIds : [];
      const sel = sel0.filter((id) => aliveSet.has(id)).slice(0, capLeft);
      ui.trainingModalSelectedIds = sel;

      const regionOptions = [
        { k: "all", n: "全部区域" },
        { k: "meadow", n: "芽芽草甸" },
        { k: "woods", n: "蜜露林径" },
        { k: "brook", n: "溪光浅滩" },
        { k: "plateau", n: "风铃高原" },
        { k: "dunes", n: "星砂荒漠" },
        { k: "garden", n: "月见花园" },
        { k: "ridge", n: "霜晶山脊" },
        { k: "hollow", n: "龙眠幽谷" },
      ]
        .map((x) => `<option value="${x.k}" ${region === x.k ? "selected" : ""}>${x.n}</option>`)
        .join("");

      const typeOptions = [
        `<option value="all" ${type === "all" ? "selected" : ""}>全部属性</option>`,
        ...TYPE_KEYS_UI.map((k) => `<option value="${escapeHtml(k)}" ${type === k ? "selected" : ""}>${escapeHtml(TYPE_ZH_MAP[k] ?? k)}</option>`),
      ].join("");

      const sortOptions = [
        `<option value="power" ${sort === "power" ? "selected" : ""}>战力</option>`,
        `<option value="lvl" ${sort === "lvl" ? "selected" : ""}>等级</option>`,
        `<option value="dex" ${sort === "dex" ? "selected" : ""}>图鉴</option>`,
      ].join("");

      const dirOptions = [
        `<option value="desc" ${dir === "desc" ? "selected" : ""}>倒序</option>`,
        `<option value="asc" ${dir === "asc" ? "selected" : ""}>正序</option>`,
      ].join("");

      const candidateRows = sorted
        .map((m) => {
          const checked = sel.includes(m.id);
          const pow = monPower(m);
          const types = getMonTypesSimple(m);
          const typeText = types.map((t) => TYPE_ZH_MAP[t] ?? t).join("/");
          const reg = regionLabel(monRegionByDex(m.dex));
          return `
            <div class="row func-mon-row">
              <div class="row__left">
                <div class="row__title row__titleLine">${renderBeastIcon(m.dex, m.name, Boolean(m.isShiny))}<span>${escapeHtml(m.name)}</span><span class="tag">Lv.${m.lvl}</span></div>
                <div class="row__desc">${escapeHtml(reg)} · ${escapeHtml(typeText || "-")} · 战力 ${Math.floor(pow)}</div>
              </div>
              <div class="row__right">
                <input class="chk" type="checkbox" data-train-modal-check="${m.id}" ${checked ? "checked" : ""} ${capLeft <= 0 && !checked ? "disabled" : ""} />
              </div>
            </div>
          `;
        })
        .join("");

      const title = `训练：选择萌灵（剩余槽位 ${capLeft}）`;
      const sub = `支持筛选/排序与多选，点击“开始训练”后会直接加入训练。`;
      const empty = sorted.length === 0 ? `<div class="row"><div class="row__left"><div class="row__desc muted">暂无可选萌灵</div></div></div>` : "";
      const statusHint = capLeft <= 0 ? " · 训练槽位已满" : "";
      const canConfirm = capLeft > 0 && sel.length > 0;

      trainingModalHtml = `
        <div class="modalOverlay" data-train-modal-overlay="1">
          <div class="modal">
            <div class="modal__header">
              <div class="modal__title">${renderBuildingSvg("trainingGround", 20)}<span>训练：选择萌灵</span><span class="tag">剩余槽位 ${capLeft}</span></div>
              <div class="modal__right">
                <button class="btn btn--small" data-train-modal-clear="1">清空</button>
                <button class="btn btn--small" data-train-modal-close="1">关闭</button>
              </div>
            </div>
            <div class="modal__desc">${escapeHtml(sub)}</div>
            <div class="modal__body">
              <div class="row modal-filter-row">
                <div class="row__left">
                  <div class="row__title row__titleLine">${renderResSvg("searchFlare", 18)}<span>筛选 / 排序</span><span class="tag">已选 ${sel.length}/${capLeft}</span></div>
                  <div class="row__desc">按栖息地、属性或战力筛选候补萌灵${statusHint}</div>
                </div>
                <div class="row__right">
                  <select class="input" data-train-modal-region>${regionOptions}</select>
                  <select class="input" data-train-modal-type>${typeOptions}</select>
                  <select class="input" data-train-modal-sort>${sortOptions}</select>
                  <select class="input" data-train-modal-dir>${dirOptions}</select>
                  <input class="input" type="text" inputmode="search" placeholder="搜索：图鉴编号或名称" value="${escapeHtml(q)}" data-train-modal-q />
                </div>
              </div>
              ${empty}
              ${candidateRows}
            </div>
            <div class="actions">
              <button class="btn btn--ghost" data-train-modal-close="1">取消</button>
              <button class="btn btn--primary" data-train-modal-confirm="1" ${canConfirm ? "" : "disabled"}>开始训练</button>
            </div>
          </div>
        </div>
      `;
    }

    let breedingModalHtml = "";
    if (ui.breedingModalOpen) {
      // 远征与饲养互斥：远征中的萌灵不可进饲养位
      const expBusyIds = new Set(
        Boolean(state.expedition?.on) && Array.isArray(state.expedition.activeIds) ? state.expedition.activeIds : [],
      );
      const allCandidates = list.filter((m) => m && !expBusyIds.has(m.id));

      const q0 = typeof ui.breedingModalQuery === "string" ? ui.breedingModalQuery : "";
      const q = String(q0 || "").trim();
      ui.breedingModalQuery = q;
      const qIsDigits = /^\d+$/.test(q);
      const qDex = qIsDigits ? Math.max(1, Math.floor(Number(q))) : null;
      const qLower = q.toLowerCase();

      const region0 = typeof ui.breedingModalRegion === "string" ? ui.breedingModalRegion : "all";
      const region = ["all", "meadow", "woods", "brook", "plateau", "dunes", "garden", "ridge", "hollow"].includes(region0) ? region0 : "all";
      const type0 = typeof ui.breedingModalType === "string" ? ui.breedingModalType : "all";
      const type = type0 === "all" || TYPE_KEYS_UI.includes(type0) ? type0 : "all";
      const sort0 = typeof ui.breedingModalSort === "string" ? ui.breedingModalSort : "power";
      const sort = ["power", "lvl", "dex", "iv"].includes(sort0) ? sort0 : "power";

      const dir0 = typeof ui.breedingModalSortDir === "string" ? ui.breedingModalSortDir : "";
      const dir = dir0 === "asc" || dir0 === "desc" ? dir0 : sort === "dex" ? "asc" : "desc";
      if (dir !== ui.breedingModalSortDir) ui.breedingModalSortDir = dir;

      const filtered = allCandidates
        .filter((m) => (region === "all" ? true : monRegionByDex(m.dex) === region))
        .filter((m) => (type === "all" ? true : getMonTypesSimple(m).includes(type)))
        .filter((m) => {
          if (!q) return true;
          if (qDex && Number.isFinite(qDex)) return Math.floor(m.dex ?? 0) === qDex;
          const nm = typeof m.name === "string" ? m.name : "";
          return nm.toLowerCase().includes(qLower);
        });

      const sorted = sortMons(filtered, sort, dir);

      const aliveSet = new Set(allCandidates.map((m) => m.id));
      const sel0 = Array.isArray(ui.breedingModalSelectedIds) ? ui.breedingModalSelectedIds : [];
      const sel = sel0.filter((id) => aliveSet.has(id)).slice(0, 2);
      ui.breedingModalSelectedIds = sel;
      const selMonA = typeof sel[0] === "number" ? allCandidates.find((m) => m.id === sel[0]) ?? null : null;
      const selMonB = typeof sel[1] === "number" ? allCandidates.find((m) => m.id === sel[1]) ?? null : null;

      const regionOptions = [
        { k: "all", n: "全部区域" },
        { k: "meadow", n: "芽芽草甸" },
        { k: "woods", n: "蜜露林径" },
        { k: "brook", n: "溪光浅滩" },
        { k: "plateau", n: "风铃高原" },
        { k: "dunes", n: "星砂荒漠" },
        { k: "garden", n: "月见花园" },
        { k: "ridge", n: "霜晶山脊" },
        { k: "hollow", n: "龙眠幽谷" },
      ]
        .map((x) => `<option value="${x.k}" ${region === x.k ? "selected" : ""}>${x.n}</option>`)
        .join("");

      const typeOptions = [
        `<option value="all" ${type === "all" ? "selected" : ""}>全部属性</option>`,
        ...TYPE_KEYS_UI.map((k) => `<option value="${escapeHtml(k)}" ${type === k ? "selected" : ""}>${escapeHtml(TYPE_ZH_MAP[k] ?? k)}</option>`),
      ].join("");

      const sortOptions = [
        `<option value="power" ${sort === "power" ? "selected" : ""}>战力</option>`,
        `<option value="iv" ${sort === "iv" ? "selected" : ""}>潜力</option>`,
        `<option value="lvl" ${sort === "lvl" ? "selected" : ""}>等级</option>`,
        `<option value="dex" ${sort === "dex" ? "selected" : ""}>图鉴</option>`,
      ].join("");

      const dirOptions = [
        `<option value="desc" ${dir === "desc" ? "selected" : ""}>倒序</option>`,
        `<option value="asc" ${dir === "asc" ? "selected" : ""}>正序</option>`,
      ].join("");

      const candidateRows = sorted
        .map((m) => {
          const checked = sel.includes(m.id);
          const pow = monPower(m);
          const ivSum = sumMonIv(m);
          const abInfo = getAbilityInfo(resolveParentAbilityId(m));
          const types = getMonTypesSimple(m);
          const typeText = types.map((t) => TYPE_ZH_MAP[t] ?? t).join("/");
          const reg = regionLabel(monRegionByDex(m.dex));
          const starBadge = (m.stars ?? 0) > 0 ? `<span class="tag">${m.stars}星</span>` : "";
          return `
            <div class="row func-mon-row">
              <div class="row__left">
                <div class="row__title row__titleLine">${renderBeastIcon(m.dex, m.name, Boolean(m.isShiny))}<span>${escapeHtml(m.name)}</span><span class="tag">Lv.${m.lvl}</span>${starBadge}<span class="tag">潜力 ${ivSum}/186</span></div>
                <div class="row__desc">${escapeHtml(reg)} · ${escapeHtml(typeText || "-")} · 战力 ${Math.floor(pow)}${abInfo ? ` · 特性「${escapeHtml(abInfo.name)}」` : ""}</div>
              </div>
              <div class="row__right">
                <input class="chk" type="checkbox" data-breed-modal-check="${m.id}" ${checked ? "checked" : ""} ${sel.length >= 2 && !checked ? "disabled" : ""} />
              </div>
            </div>
          `;
        })
        .join("");

      const title = `饲养：选择萌灵（需要 2 只）`;
      const sub = `支持按潜力/战力筛选排序（最多选 2 只），勾选双亲可实时预览优生子代潜力、闪光概率并锁定遗传特性。`;
      const empty = sorted.length === 0 ? `<div class="row"><div class="row__left"><div class="row__desc muted">暂无可选萌灵</div></div></div>` : "";
      const canConfirm = sel.length === 2;

      breedingModalHtml = `
        <div class="modalOverlay" data-breed-modal-overlay="1">
          <div class="modal">
            <div class="modal__header">
              <div class="modal__title">${renderBuildingSvg("breedingHouse", 20)}<span>饲养：选择萌灵</span><span class="tag">需要 2 只</span></div>
              <div class="modal__right">
                <button class="btn btn--small" data-breed-modal-clear="1">清空</button>
                <button class="btn btn--small" data-breed-modal-close="1">关闭</button>
              </div>
            </div>
            <div class="modal__desc">${escapeHtml(sub)}</div>
            <div class="modal__body">
              <div class="row modal-filter-row">
                <div class="row__left">
                  <div class="row__title row__titleLine">${renderResSvg("searchFlare", 18)}<span>筛选 / 排序</span><span class="tag">已选 ${sel.length}/2</span></div>
                  <div class="row__desc">同进化链双亲或幻彩星泥配对可温养产蛋</div>
                </div>
                <div class="row__right">
                  <select class="input" data-breed-modal-region>${regionOptions}</select>
                  <select class="input" data-breed-modal-type>${typeOptions}</select>
                  <select class="input" data-breed-modal-sort>${sortOptions}</select>
                  <select class="input" data-breed-modal-dir>${dirOptions}</select>
                  <input class="input" type="text" inputmode="search" placeholder="搜索：图鉴编号或名称" value="${escapeHtml(q)}" data-breed-modal-q />
                </div>
              </div>
              ${renderEugenicsPreviewCard(selMonA, selMonB, "配对优生预览 · 闪光提率与特性遗传")}
              ${empty}
              ${candidateRows}
            </div>
            <div class="actions">
              <button class="btn btn--ghost" data-breed-modal-close="1">取消</button>
              <button class="btn btn--primary" data-breed-modal-confirm="1" ${canConfirm ? "" : "disabled"}>开始饲养</button>
            </div>
          </div>
        </div>
      `;
    }

    rows.push(`<div class="sidebar__divider"></div>`);

    const hideExpedition = Boolean(ui.functionsHideExpedition);
    const expeditionSeasonLabel = resolveExpeditionSeasonLabel(ui.remoteConfig);
    const expeditionSeasonBlurb = getExpeditionSeasonBlurb(resolveSeasonId(ui.remoteConfig));
    const relicLines = seasonRelicLines(state);
    const relicDesc =
      relicLines.length > 0
        ? `本季印记：${relicLines.map((r) => `${r.name}×${r.count}`).join(" · ")}`
        : "本季印记：尚未获得（远征完成有概率掉落独特印记道具）";

    rows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title row__titleLine">${renderBuildingSvg("expeditionPost", 18)}<span>远征所</span><span class="tag">${escapeHtml(expeditionSeasonLabel)}</span></div>
          <div class="row__desc">${escapeHtml(expeditionSeasonBlurb)}。派遣萌灵下副本：完成后获得经验与未来币，并概率掉落药剂。属性克制可提高远征收益。</div>
          <div class="row__desc">${escapeHtml(relicDesc)}</div>
        </div>
        <div class="row__right">
          <button class="btn btn--small btn--ghost" data-func-toggle="expedition">${hideExpedition ? "▸" : "▾"}</button>
        </div>
      </div>
    `);

    const postLvl = clamp(state.buildings?.expeditionPost?.owned ?? 0, 0, 10);
    const expeditionUnlocked = postLvl > 0;
    if (!state.expedition || typeof state.expedition !== "object") {
      state.expedition = {
        on: false,
        selectedLevel: "basic",
        selectedDungeonKey: null,
        selectedIds: [],
        activeIds: [],
        remainingSec: 0,
        totalSec: 0,
        rewardExp: 0,
        rewardCoin: 0,
        rewardPotionTotal: 0,
        dungeonType: null,
        dungeons: null,
      };
    }
    if (!Array.isArray(state.expedition.selectedIds)) state.expedition.selectedIds = [];
    if (!Array.isArray(state.expedition.activeIds)) state.expedition.activeIds = [];

    const expOn = Boolean(state.expedition.on) && (state.expedition.remainingSec ?? 0) > 0;

    const typeMap = TYPE_ZH && typeof TYPE_ZH === "object" ? TYPE_ZH : {};
    const TYPE_KEYS = Object.keys(typeMap);
    const getMonTypes = (m) => getMonTypesForExpedition(m, getBeastDataByDex);
    const typeMul = (m, dungeonType) => expeditionTypeMul(m, dungeonType, getBeastDataByDex);
    const expeditionRewardMul = (mons, dungeonType) => {
      if (!Array.isArray(mons) || mons.length === 0) return 1;
      const avg = mons.reduce((acc, m) => acc + typeMul(m, dungeonType), 0) / mons.length;
      return clamp(avg, 0.75, 1.5);
    };

    const regenAllDungeons = () => {
      if (!Array.isArray(TYPE_KEYS) || TYPE_KEYS.length === 0) return;
      const dungeons = {};
      for (const lvl of EXP_LEVELS) dungeons[lvl.key] = pickExpeditionDungeons(TYPE_KEYS);
      state.expedition.dungeons = dungeons;
    };

    if (!state.expedition.dungeons || typeof state.expedition.dungeons !== "object") {
      regenAllDungeons();
    } else {
      ensureExpeditionDungeonTiers(state.expedition.dungeons, TYPE_KEYS);
    }

    const selLvl = typeof state.expedition.selectedLevel === "string" ? state.expedition.selectedLevel : "basic";
    const lvlDef = getExpLevelDef(selLvl);

    const levelOptions = EXP_LEVELS.map((x) => {
      const unlocked = postLvl >= x.unlockLvl;
      const sel = selLvl === x.key;
      return `<option value="${x.key}" ${sel ? "selected" : ""} ${unlocked ? "" : "disabled"}>${x.name}${unlocked ? "" : "（未解锁）"}</option>`;
    }).join("");

    if (!hideExpedition) {
      if (!expeditionUnlocked) {
        const trainOk = (state.buildings.trainingGround?.owned ?? 0) > 0;
        const breedOk = (state.buildings.breedingHouse?.owned ?? 0) > 0;
        const chainHint = trainOk && breedOk
          ? "训练场与育灵屋已就绪，在「建筑」页建造远征所即可解锁。"
          : "需先建造训练场与育灵屋，再建造远征所。";
        rows.push(`
          <div class="row is-locked">
            <div class="row__left">
              <div class="row__title">未解锁</div>
              <div class="row__desc">${escapeHtml(chainHint)}</div>
            </div>
          </div>
        `);
      } else {
        rows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title row__titleLine">${renderResSvg("searchFlare", 18)}<span>远征等级</span><span class="tag">远征所 Lv.${postLvl}</span></div>
          <div class="row__desc">提升远征所建筑等级可解锁更高阶远征秘境</div>
        </div>
        <div class="row__right">
          <select class="input" data-exp-lvl ${expOn ? "disabled" : ""}>${levelOptions}</select>
        </div>
      </div>
    `);

        const dungeons = state.expedition.dungeons?.[selLvl];
        const dlist = Array.isArray(dungeons) ? dungeons : [];
        if (!state.expedition.selectedDungeonKey || !dlist.some((x) => x.key === state.expedition.selectedDungeonKey)) {
          state.expedition.selectedDungeonKey = dlist[0]?.key ?? null;
        }
        const dungeonObj = dlist.find((x) => x && x.key === state.expedition.selectedDungeonKey) ?? dlist[0] ?? null;
        const dungeonType = dungeonObj?.type ?? null;

        const dungeonBtnsHtml = dlist
          .map((d) => {
            const zh = typeMap[d.type] ?? d.type;
            const selected = d.key === state.expedition.selectedDungeonKey;
            return `<button class="btn btn--small ${selected ? "btn--primary" : "btn--ghost"}" data-exp-dungeon="${escapeHtml(d.key)}" ${expOn ? "disabled" : ""}>${escapeHtml(zh)}副本${selected ? " ✓" : ""}</button>`;
          })
          .join("");
        const selDungeonZh = dungeonType ? (typeMap[dungeonType] ?? dungeonType) : "默认";
        rows.push(`
        <div class="row modal-filter-row">
          <div class="row__left">
            <div class="row__title row__titleLine">${renderResSvg("megaStone", 18)}<span>远征秘境属性</span><span class="tag">当前：${escapeHtml(selDungeonZh)}副本</span><span class="tag">需求战力 ${lvlDef.req}</span></div>
            <div class="row__desc">选择克制目标属性的队伍出征，可获得最高 1.5× 收益加成。</div>
          </div>
          <div class="row__right">
            ${dungeonBtnsHtml}
          </div>
        </div>
      `);

        // 远征与饲养互斥：饲养中的萌灵不可远征
        const breedBusyIds = new Set(
          state.breeding?.on
            ? [state.breeding.aId, state.breeding.bId].filter((x) => typeof x === "number")
            : [],
        );
        const selectedIds0 = state.expedition.selectedIds.slice(0, 20);
        const selectedIds1 = selectedIds0.filter((id) => {
          if (breedBusyIds.has(id)) return false;
          const m = list.find((x) => x && x.id === id) ?? null;
          if (!m) return false;
          const cd0 =
            typeof m.skillCdRemainingSec === "number" && Number.isFinite(m.skillCdRemainingSec)
              ? Math.max(0, m.skillCdRemainingSec)
              : 0;
          return cd0 <= 0;
        });
        state.expedition.selectedIds = selectedIds1;
        const selectedIds = selectedIds1;
        const selectedMons = selectedIds.map((id) => list.find((m) => m && m.id === id) ?? null).filter((x) => x);

        const selectedSet = new Set(selectedIds);

        let expTeamModalHtml = "";

        const effPower = selectedMons.reduce((acc, m) => acc + monPower(m) * typeMul(m, dungeonType), 0);
        const canStartExp = !expOn && selectedMons.length > 0 && effPower >= lvlDef.req;
        const baseSec = 7200;
        const excessPct = canStartExp ? Math.max(0, (effPower - lvlDef.req) / lvlDef.req) : 0;
        const natureTimeMul = expeditionNatureTimeMul(selectedMons);
        const expPerkTimeMul = legacyExpeditionTimeMul(state);
        const expPerkRewardMul = legacyExpeditionRewardMul(state);
        const totalSec = canStartExp
          ? Math.max(60, Math.ceil((baseSec / Math.pow(1.01, excessPct * 100)) * natureTimeMul * expPerkTimeMul))
          : Math.max(60, Math.ceil(baseSec * expPerkTimeMul));
        const rewardMul = expeditionRewardMul(selectedMons, dungeonType);
        const natureHint =
          natureTimeMul < 0.999
            ? ` · 性格加速 ×${(1 / natureTimeMul).toFixed(2)}`
            : "";
        const perkHint =
          expPerkTimeMul < 0.999
            ? ` · 远征达人 -${Math.round((1 - expPerkTimeMul) * 100)}%耗时/+${Math.round((expPerkRewardMul - 1) * 100)}%收益`
            : "";
        const rewardExp = Math.floor(lvlDef.exp * rewardMul * expPerkRewardMul);
        const rewardCoin = Math.floor(lvlDef.coin * rewardMul * expPerkRewardMul);

        rows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title row__titleLine">${renderUiIcon("tab_mons", 18)}<span>远征队伍</span><span class="tag">已选 ${selectedMons.length}/20</span><span class="tag">战力 ${Math.floor(effPower)}/${lvlDef.req}</span></div>
          <div class="row__desc">预计用时：${fmtDuration(totalSec)}${natureHint}${perkHint} · 属性相性 x${rewardMul.toFixed(2)}</div>
        </div>
        <div class="row__right">
          <button class="btn btn--small" data-exp-team-open ${expOn ? "disabled" : ""}>选择队员</button>
          <button class="btn btn--small" data-exp-clear ${expOn ? "disabled" : ""}>清空</button>
        </div>
      </div>
    `);

        if (ui.expeditionTeamModalOpen) {
          const filter0 = typeof ui.expeditionTeamTypeFilter === "string" ? ui.expeditionTeamTypeFilter : "all";
          const filter = filter0 && (filter0 === "all" || TYPE_KEYS.includes(filter0)) ? filter0 : "all";
          if (filter !== ui.expeditionTeamTypeFilter) ui.expeditionTeamTypeFilter = filter;

          const typeOptions = [
            `<option value="all" ${filter === "all" ? "selected" : ""}>全部属性</option>`,
            ...TYPE_KEYS.map((k) => `<option value="${k}" ${filter === k ? "selected" : ""}>${escapeHtml(typeMap[k] ?? k)}</option>`),
          ].join("");

          const candidates = list.filter((m) => {
            if (breedBusyIds.has(m.id)) return false;
            const cd0 =
              typeof m.skillCdRemainingSec === "number" && Number.isFinite(m.skillCdRemainingSec)
                ? Math.max(0, m.skillCdRemainingSec)
                : 0;
            return cd0 <= 0;
          });

          const candidates1 = filter === "all" ? candidates : candidates.filter((m) => getMonTypes(m).includes(filter));

          const candidateWithPower = candidates1
            .map((m) => ({ m, effPower: monPower(m) * typeMul(m, dungeonType) }))
            .sort((a, b) => (b.effPower ?? 0) - (a.effPower ?? 0));

          if (ui.expeditionTeamAutoPick) {
            ui.expeditionTeamAutoPick = false;
            state.expedition.selectedIds = candidateWithPower.slice(0, 20).map((x) => x.m.id);
          }

          const selNow = Array.isArray(state.expedition.selectedIds) ? state.expedition.selectedIds.slice(0, 20) : [];
          const selSetNow = new Set(selNow);

          const candidateRows = candidateWithPower
            .map(({ m, effPower }) => {
              const checked = selSetNow.has(m.id);
              const power = Math.floor(effPower);
              const mul = typeMul(m, dungeonType);
              const disabled = expOn || (!checked && selNow.length >= 20);
              const rightText = expOn ? "远征中" : "";
              return `
            <div class="row func-mon-row">
              <div class="row__left">
                <div class="row__title row__titleLine">${renderBeastIcon(m.dex, m.name, Boolean(m.isShiny))}<span>${escapeHtml(m.name)}</span><span class="tag">Lv.${m.lvl}</span></div>
                <div class="row__desc">战力 ${power} · 属性相性 x${mul.toFixed(2)}${rightText ? ` · ${escapeHtml(rightText)}` : ""}</div>
              </div>
              <div class="row__right">
                <input class="chk" type="checkbox" data-exp-team-check="${m.id}" ${checked ? "checked" : ""} ${disabled ? "disabled" : ""} />
              </div>
            </div>
          `;
            })
            .join("");

          expTeamModalHtml = `
        <div class="modalOverlay" data-exp-team-overlay="1">
          <div class="modal">
            <div class="modal__header">
              <div class="modal__title">${renderBuildingSvg("expeditionPost", 20)}<span>选择远征队员</span><span class="tag">已选 ${selNow.length}/20</span></div>
              <div class="modal__right">
                <select class="input" data-exp-team-type>${typeOptions}</select>
                <button class="btn btn--small" data-exp-team-auto ${expOn ? "disabled" : ""}>一键选择</button>
                <button class="btn btn--small" data-exp-clear ${expOn ? "disabled" : ""}>清空</button>
                <button class="btn btn--small" data-exp-team-close="1">关闭</button>
              </div>
            </div>
            <div class="modal__desc">多选请直接勾选（最多 20 只，技能冷却或饲养中的萌灵不会出现在列表中）。</div>
            <div class="modal__body">${candidateRows}</div>
            <div class="actions">
              <button class="btn btn--primary" data-exp-team-close="1">完成编队</button>
            </div>
          </div>
        </div>
      `;
        }

        if (!expOn) {
          const quickOn = Boolean(ui.expeditionQuick);
          rows.push(`
        <div class="row">
          <div class="row__left">
            <div class="row__title row__titleLine">${renderResSvg("futurecoin", 18)}<span>开始远征</span><span class="tag">+${rewardCoin} 未来币</span></div>
            <div class="row__desc">奖励：经验 +${rewardExp}（每只参与萌灵）· 未来币 +${rewardCoin} · 药剂掉落总数 ${lvlDef.pot} · 属性相性 x${rewardMul.toFixed(2)}</div>
            <div class="row__desc muted">急行：时长约 ×0.3，奖励约 ×0.7</div>
          </div>
          <div class="row__right">
            <label class="check" style="margin-right:8px">
              <input type="checkbox" data-exp-quick ${quickOn ? "checked" : ""} />
              <span>急行</span>
            </label>
            <button class="btn btn--primary" data-exp-start ${canStartExp ? "" : "disabled"}>${quickOn ? "急行出征" : "出征"}</button>
          </div>
        </div>
      `);
        } else {
          const rem =
            typeof state.expedition.remainingSec === "number" && Number.isFinite(state.expedition.remainingSec)
              ? Math.max(0, state.expedition.remainingSec)
              : 0;
          rows.push(`
        <div class="row">
          <div class="row__left">
            <div class="row__title row__titleLine">${renderBuildingSvg("expeditionPost", 18)}<span>远征中</span><span class="tag">剩余 ${fmtDuration(rem)}</span></div>
            <div class="row__desc">秘境探索进行中，归来后自动结算经验与未来币收益。</div>
          </div>
          <div class="row__right">
            <button class="btn btn--danger btn--small" data-exp-cancel>取消远征</button>
          </div>
        </div>
      `);
        }

        if (expTeamModalHtml) rows.push(expTeamModalHtml);
      }
    }

    if (trainingModalHtml) rows.push(trainingModalHtml);
    if (breedingModalHtml) rows.push(breedingModalHtml);
    if (ecoSquadModalHtml) rows.push(ecoSquadModalHtml);
    if (starCampModalHtml) rows.push(starCampModalHtml);
    if (funcLeagueModalHtml) rows.push(funcLeagueModalHtml);
    setHtmlPreservingStage(elFunctionsTraining, rows.join(""));

    try {
      const body = elFunctionsTraining.querySelector('.modalOverlay[data-train-modal-overlay="1"] .modal__body');
      if (body) body.scrollTop = prevTrainModalBodyScrollTop;
      const breedBody = elFunctionsTraining.querySelector('.modalOverlay[data-breed-modal-overlay="1"] .modal__body');
      if (breedBody) breedBody.scrollTop = prevBreedModalBodyScrollTop;
      const expTeamBody = elFunctionsTraining.querySelector('.modalOverlay[data-exp-team-overlay="1"] .modal__body');
      if (expTeamBody) prevExpTeamModalBodyScrollTop = expTeamBody.scrollTop;
      const ecoModalBody = elFunctionsTraining.querySelector('.modalOverlay[data-eco-modal-overlay="1"] .modal__body');
      if (ecoModalBody && typeof ui.__ecoModalScrollTop === "number") ecoModalBody.scrollTop = ui.__ecoModalScrollTop;
      const campModalBody = elFunctionsTraining.querySelector('.modalOverlay[data-camp-modal-overlay="1"] .modal__body');
      if (campModalBody && typeof ui.__campModalScrollTop === "number") campModalBody.scrollTop = ui.__campModalScrollTop;
      const leagueModalBody = elFunctionsTraining.querySelector('.modalOverlay[data-func-league-modal-overlay="1"] .modal__body');
      if (leagueModalBody && typeof ui.__leagueModalScrollTop === "number") leagueModalBody.scrollTop = ui.__leagueModalScrollTop;

      if (prevFocusKind === "train") {
        const inp = elFunctionsTraining.querySelector('input[data-train-modal-q]');
        if (inp && typeof inp.focus === "function") {
          inp.focus();
          if (typeof inp.setSelectionRange === "function" && typeof prevFocusStart === "number" && typeof prevFocusEnd === "number") {
            inp.setSelectionRange(prevFocusStart, prevFocusEnd);
          }
        }
      } else if (prevFocusKind === "breed") {
        const inp = elFunctionsTraining.querySelector('input[data-breed-modal-q]');
        if (inp && typeof inp.focus === "function") {
          inp.focus();
          if (typeof inp.setSelectionRange === "function" && typeof prevFocusStart === "number" && typeof prevFocusEnd === "number") {
            inp.setSelectionRange(prevFocusStart, prevFocusEnd);
          }
        }
      }
      if (prevPageScrollY > 0 && typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
        window.requestAnimationFrame(() => {
          try {
            const nowY = window.scrollY || 0;
            if (Math.abs(nowY - prevPageScrollY) > 2) window.scrollTo(window.scrollX || 0, prevPageScrollY);
          } catch {
          }
        });
      }
    } catch {
    }
    ui.functionsDirty = false;
  };
}

export function initFunctionsTab({
  elFunctionsTraining,
  ui,
  clamp,
  fmtDuration,
  monPower,
  getBeastDataByDex,
  markFunctionsDirty,
  markMonListDirty,
  markMonsDirty,
  addExpToMon,
  addLog,
  addRes,
  render,
  getState,
}) {
  if (!elFunctionsTraining) return;

  const stateRef = () => (typeof getState === "function" ? getState() : null);

  const SELECT_FOCUS_SELECTOR =
    "select[data-exp-lvl],select[data-exp-team-type],select[data-train-modal-region],select[data-train-modal-type],select[data-train-modal-sort],select[data-breed-modal-region],select[data-breed-modal-type],select[data-breed-modal-sort],select[data-mint-mon],select[data-boutique-target-mon],select[data-amber-target-mon]";

  const focusOn = () => { ui.functionsFocus = true; };
  const focusOff = () => {
    ui.functionsFocus = false;
    markFunctionsDirty();
    render();
  };

  for (const [evt, handler] of [
    ["pointerdown", focusOn],
    ["mousedown", focusOn],
    ["touchstart", focusOn],
    ["focusin", focusOn],
    ["focusout", focusOff],
  ]) {
    elFunctionsTraining.addEventListener(evt, (ev) => {
      const sel = ev.target?.closest?.(SELECT_FOCUS_SELECTOR);
      if (!sel || !elFunctionsTraining.contains(sel)) return;
      handler();
    }, true);
  }

  elFunctionsTraining.addEventListener("input", (ev) => {
    const tQ = ev.target?.closest?.("input[data-train-modal-q]");
    if (tQ && elFunctionsTraining.contains(tQ)) {
      ui.trainingModalQuery = String(tQ.value || "");
      markFunctionsDirty();
      render();
      return;
    }

    const bQ = ev.target?.closest?.("input[data-breed-modal-q]");
    if (bQ && elFunctionsTraining.contains(bQ)) {
      ui.breedingModalQuery = String(bQ.value || "");
      markFunctionsDirty();
      render();
    }
  });

  elFunctionsTraining.addEventListener("change", (ev) => {
    const sel = ev.target?.closest?.("select[data-exp-team-type]");
    if (!sel || !elFunctionsTraining.contains(sel)) return;
    ui.expeditionTeamTypeFilter = String(sel.value || "all");
    ui.functionsFocus = false;
    markFunctionsDirty();
    render();
  });

  elFunctionsTraining.addEventListener("change", (ev) => {
    const lvlSel = ev.target?.closest?.("select[data-exp-lvl]");
    if (lvlSel && elFunctionsTraining.contains(lvlSel)) {
      const state = stateRef();
      if (!state || !state.expedition || typeof state.expedition !== "object") return;
      state.expedition.selectedLevel = String(lvlSel.value || "basic");
      state.expedition.selectedDungeonKey = null;
      markFunctionsDirty();
      render();
      return;
    }
  });

  elFunctionsTraining.addEventListener("change", (ev) => {
    const tRegion = ev.target?.closest?.("select[data-train-modal-region]");
    if (tRegion && elFunctionsTraining.contains(tRegion)) {
      ui.trainingModalRegion = String(tRegion.value || "all");
      markFunctionsDirty();
      render();
      return;
    }
    const tType = ev.target?.closest?.("select[data-train-modal-type]");
    if (tType && elFunctionsTraining.contains(tType)) {
      ui.trainingModalType = String(tType.value || "all");
      markFunctionsDirty();
      render();
      return;
    }
    const tSort = ev.target?.closest?.("select[data-train-modal-sort]");
    if (tSort && elFunctionsTraining.contains(tSort)) {
      ui.trainingModalSort = String(tSort.value || "power");
      markFunctionsDirty();
      render();
      return;
    }
    const tDir = ev.target?.closest?.("select[data-train-modal-dir]");
    if (tDir && elFunctionsTraining.contains(tDir)) {
      ui.trainingModalSortDir = String(tDir.value || "");
      markFunctionsDirty();
      render();
      return;
    }
    const bRegion = ev.target?.closest?.("select[data-breed-modal-region]");
    if (bRegion && elFunctionsTraining.contains(bRegion)) {
      ui.breedingModalRegion = String(bRegion.value || "all");
      markFunctionsDirty();
      render();
      return;
    }
    const bType = ev.target?.closest?.("select[data-breed-modal-type]");
    if (bType && elFunctionsTraining.contains(bType)) {
      ui.breedingModalType = String(bType.value || "all");
      markFunctionsDirty();
      render();
      return;
    }
    const bSort = ev.target?.closest?.("select[data-breed-modal-sort]");
    if (bSort && elFunctionsTraining.contains(bSort)) {
      ui.breedingModalSort = String(bSort.value || "power");
      markFunctionsDirty();
      render();
      return;
    }
    const bDir = ev.target?.closest?.("select[data-breed-modal-dir]");
    if (bDir && elFunctionsTraining.contains(bDir)) {
      ui.breedingModalSortDir = String(bDir.value || "");
      markFunctionsDirty();
      render();
      return;
    }
  });

  elFunctionsTraining.addEventListener("change", (ev) => {
    const state = stateRef();
    if (!state || typeof state !== "object") return;

    const chk = ev.target?.closest?.("input[data-train-modal-check]");
    if (chk && elFunctionsTraining.contains(chk)) {
      const id = Number(chk.getAttribute("data-train-modal-check"));
      if (!Number.isFinite(id)) return;
      if (!state.training || typeof state.training !== "object") state.training = { activeIds: [], slotSize: 0 };
      if (!Array.isArray(state.training.activeIds)) state.training.activeIds = [];
      const slotSize =
        typeof state.training.slotSize === "number" && Number.isFinite(state.training.slotSize)
          ? Math.max(0, Math.floor(state.training.slotSize))
          : 0;
      const used = state.training.activeIds.length;
      const capLeft = Math.max(0, slotSize - used);

      const trainingSet = new Set(state.training.activeIds);
      if (trainingSet.has(id)) {
        chk.checked = false;
        return;
      }

      const sel0 = Array.isArray(ui.trainingModalSelectedIds) ? ui.trainingModalSelectedIds : [];
      const aliveSet = new Set(
        (state.mons?.list ?? [])
          .map((m) => (m && typeof m.id === "number" ? m.id : null))
          .filter((x) => typeof x === "number")
      );
      let sel = sel0.filter((x) => aliveSet.has(x) && !trainingSet.has(x));

      if (chk.checked) {
        if (!sel.includes(id)) {
          if (sel.length >= capLeft) {
            chk.checked = false;
            return;
          }
          sel = sel.concat([id]);
        }
      } else {
        sel = sel.filter((x) => x !== id);
      }

      ui.trainingModalSelectedIds = sel;
      markFunctionsDirty();
      render();
      return;
    }

    const bchk = ev.target?.closest?.("input[data-breed-modal-check]");
    if (bchk && elFunctionsTraining.contains(bchk)) {
      const id = Number(bchk.getAttribute("data-breed-modal-check"));
      if (!Number.isFinite(id)) return;
      const sel0 = Array.isArray(ui.breedingModalSelectedIds) ? ui.breedingModalSelectedIds : [];
      const aliveSet = new Set(
        (state.mons?.list ?? [])
          .map((m) => (m && typeof m.id === "number" ? m.id : null))
          .filter((x) => typeof x === "number")
      );
      let sel = sel0.filter((x) => aliveSet.has(x)).slice(0, 2);

      if (bchk.checked) {
        if (!sel.includes(id)) {
          if (sel.length >= 2) {
            bchk.checked = false;
            return;
          }
          sel = sel.concat([id]);
        }
      } else {
        sel = sel.filter((x) => x !== id);
      }

      ui.breedingModalSelectedIds = sel;
      markFunctionsDirty();
      render();
      return;
    }
  });

  elFunctionsTraining.addEventListener("click", (ev) => {
    const state = stateRef();
    if (!state || typeof state !== "object") return;

    const expDailyClaim = ev.target?.closest?.("button[data-func-exp-daily-claim]");
    if (expDailyClaim && elFunctionsTraining.contains(expDailyClaim)) {
      if (expDailyClaim.disabled) return;
      if (!markExpeditionDailyClaimed(state, localDateStr())) {
        addLog("今日远征任务未完成或已领取");
        return;
      }
      addRes("futurecoin", 10);
      addLog("今日远征任务：未来币 +10", true);
      markFunctionsDirty();
      render();
      return;
    }

    const toggleBtn = ev.target?.closest?.("button[data-func-toggle]");
    if (toggleBtn && elFunctionsTraining.contains(toggleBtn)) {
      const key = toggleBtn.getAttribute("data-func-toggle");
      if (key === "training") ui.functionsHideTraining = !Boolean(ui.functionsHideTraining);
      if (key === "breeding") ui.functionsHideBreeding = !Boolean(ui.functionsHideBreeding);
      if (key === "expedition") ui.functionsHideExpedition = !Boolean(ui.functionsHideExpedition);
      if (key === "ecoSandbox") ui.functionsHideEcoSandbox = !Boolean(ui.functionsHideEcoSandbox);
      if (key === "mintWorkshop") ui.functionsHideMintWorkshop = !Boolean(ui.functionsHideMintWorkshop);
      if (key === "starCamp") ui.functionsHideStarCamp = !Boolean(ui.functionsHideStarCamp);
      if (key === "amberRevival") ui.functionsHideAmberRevival = !Boolean(ui.functionsHideAmberRevival);
      if (key === "starBoutique") ui.functionsHideStarBoutique = !Boolean(ui.functionsHideStarBoutique);
      if (key === "championLeague") ui.functionsHideChampionLeague = !Boolean(ui.functionsHideChampionLeague);
      markFunctionsDirty();
      render();
      return;
    }

    // --- ML-8 Ancient Amber Gene Revival Lab Actions ---
    const amberClaimDailyBtn = ev.target?.closest?.("button[data-amber-claim-daily]");
    if (amberClaimDailyBtn && elFunctionsTraining.contains(amberClaimDailyBtn)) {
      if (amberClaimDailyBtn.disabled) return;
      const keepY = typeof window !== "undefined" ? window.scrollY : 0;
      const res = claimDailyAncientAmber(state);
      if (res.ok) {
        addLog(res.logLine, true);
      } else {
        addLog("今日免费地脉掘珀已领取，明日再来勘探吧");
      }
      markFunctionsDirty();
      render();
      if (typeof window !== "undefined" && Math.abs(window.scrollY - keepY) > 0) window.scrollTo(window.scrollX || 0, keepY);
      return;
    }

    const amberSynthBtn = ev.target?.closest?.("button[data-amber-synth]");
    if (amberSynthBtn && elFunctionsTraining.contains(amberSynthBtn)) {
      if (amberSynthBtn.disabled) return;
      const keepY = typeof window !== "undefined" ? window.scrollY : 0;
      const method = amberSynthBtn.getAttribute("data-amber-synth") || "eco";
      const res = synthesizeAncientAmber(state, method);
      if (res.ok) {
        addLog(res.logLine, true);
      } else {
        addLog("凝炼远古基因琥珀所需材料不足");
      }
      markFunctionsDirty();
      render();
      if (typeof window !== "undefined" && Math.abs(window.scrollY - keepY) > 0) window.scrollTo(window.scrollX || 0, keepY);
      return;
    }

    const amberAwakenBtn = ev.target?.closest?.("button[data-amber-awaken]");
    if (amberAwakenBtn && elFunctionsTraining.contains(amberAwakenBtn)) {
      if (amberAwakenBtn.disabled) return;
      const keepY = typeof window !== "undefined" ? window.scrollY : 0;
      const impId = amberAwakenBtn.getAttribute("data-amber-awaken") || "";
      const res = awakenOrUpgradePrimalImprint(state, impId);
      if (res.ok) {
        addLog(res.logLine, true);
        markMonListDirty?.(false);
        markMonsDirty?.();
      } else {
        addLog("鉴定或升阶太古血脉印记所需琥珀或材料不足");
      }
      markFunctionsDirty();
      render();
      if (typeof window !== "undefined" && Math.abs(window.scrollY - keepY) > 0) window.scrollTo(window.scrollX || 0, keepY);
      return;
    }

    const amberEquipBtn = ev.target?.closest?.("button[data-amber-equip]");
    if (amberEquipBtn && elFunctionsTraining.contains(amberEquipBtn)) {
      if (amberEquipBtn.disabled) return;
      const keepY = typeof window !== "undefined" ? window.scrollY : 0;
      const impId = amberEquipBtn.getAttribute("data-amber-equip") || "";
      const lab = ensureAmberRevivalState(state);
      const targetMonId = lab?.selectedMonId ?? state.mons?.list?.[0]?.id ?? null;
      const res = equipPrimalImprint(state, impId, targetMonId);
      if (res.ok && res.logLine) {
        addLog(res.logLine, true);
        markMonListDirty?.(false);
        markMonsDirty?.();
      }
      markFunctionsDirty();
      render();
      if (typeof window !== "undefined" && Math.abs(window.scrollY - keepY) > 0) window.scrollTo(window.scrollX || 0, keepY);
      return;
    }

    const amberUnequipBtn = ev.target?.closest?.("button[data-amber-unequip]");
    if (amberUnequipBtn && elFunctionsTraining.contains(amberUnequipBtn)) {
      const keepY = typeof window !== "undefined" ? window.scrollY : 0;
      const impId = amberUnequipBtn.getAttribute("data-amber-unequip") || "";
      const res = unequipPrimalImprint(state, impId);
      if (res.ok) {
        addLog("琥珀基因复苏所：已将太古血脉印记卸下并归入复苏舱", true);
        markMonListDirty?.(false);
        markMonsDirty?.();
      }
      markFunctionsDirty();
      render();
      if (typeof window !== "undefined" && Math.abs(window.scrollY - keepY) > 0) window.scrollTo(window.scrollX || 0, keepY);
      return;
    }

    const amberRefineIvBtn = ev.target?.closest?.("button[data-amber-refine-iv]");
    if (amberRefineIvBtn && elFunctionsTraining.contains(amberRefineIvBtn)) {
      if (amberRefineIvBtn.disabled) return;
      const keepY = typeof window !== "undefined" ? window.scrollY : 0;
      const lab = ensureAmberRevivalState(state);
      const targetMonId = lab?.selectedMonId ?? state.mons?.list?.[0]?.id ?? null;
      const res = refinePartnerIvWithAmber(state, targetMonId);
      if (res.ok) {
        addLog(res.logLine, true);
        markMonListDirty?.(false);
        markMonsDirty?.();
      } else {
        addLog("琥珀潜能淬炼条件不足（需至少 2 枚远古基因琥珀且伙伴个体值未满 6V）");
      }
      markFunctionsDirty();
      render();
      if (typeof window !== "undefined" && Math.abs(window.scrollY - keepY) > 0) window.scrollTo(window.scrollX || 0, keepY);
      return;
    }

    const amberClearMonBtn = ev.target?.closest?.("button[data-amber-clear-mon]");
    if (amberClearMonBtn && elFunctionsTraining.contains(amberClearMonBtn)) {
      const keepY = typeof window !== "undefined" ? window.scrollY : 0;
      const monId = Number(amberClearMonBtn.getAttribute("data-amber-clear-mon"));
      if (Number.isFinite(monId) && monId > 0) {
        unequipMonPrimalImprints(state, monId);
        addLog("琥珀基因复苏所：已卸下该伙伴承载的太古血脉印记", true);
        markMonListDirty?.(false);
        markMonsDirty?.();
      }
      markFunctionsDirty();
      render();
      if (typeof window !== "undefined" && Math.abs(window.scrollY - keepY) > 0) window.scrollTo(window.scrollX || 0, keepY);
      return;
    }

    // --- ML-7 Starlight Accessory & Aurora Styling Boutique Actions ---
    const bqClaimDailyBtn = ev.target?.closest?.("button[data-bq-claim-daily]");
    if (bqClaimDailyBtn && elFunctionsTraining.contains(bqClaimDailyBtn)) {
      if (bqClaimDailyBtn.disabled) return;
      const res = claimDailyStarSand(state);
      if (res.ok) {
        addLog(res.logLine, true);
      } else {
        addLog("今日免费星辉凝砂已领取，明日再来祈愿吧");
      }
      markFunctionsDirty();
      render();
      return;
    }

    const bqSynthBtn = ev.target?.closest?.("button[data-bq-synth]");
    if (bqSynthBtn && elFunctionsTraining.contains(bqSynthBtn)) {
      if (bqSynthBtn.disabled) return;
      const method = bqSynthBtn.getAttribute("data-bq-synth") || "gold";
      const res = synthesizeStarSand(state, method);
      if (res.ok) {
        addLog(res.logLine, true);
      } else {
        addLog("星砂凝炼所需材料不足");
      }
      markFunctionsDirty();
      render();
      return;
    }

    const bqCraftBtn = ev.target?.closest?.("button[data-bq-craft]");
    if (bqCraftBtn && elFunctionsTraining.contains(bqCraftBtn)) {
      if (bqCraftBtn.disabled) return;
      const accId = bqCraftBtn.getAttribute("data-bq-craft") || "";
      const res = craftOrUpgradeBoutiqueAccessory(state, accId);
      if (res.ok) {
        addLog(res.logLine, true);
        markMonListDirty?.(false);
        markMonsDirty?.();
      } else {
        addLog("裁制或升阶星辉配饰所需材料不足");
      }
      markFunctionsDirty();
      render();
      return;
    }

    const bqEquipBtn = ev.target?.closest?.("button[data-bq-equip]");
    if (bqEquipBtn && elFunctionsTraining.contains(bqEquipBtn)) {
      if (bqEquipBtn.disabled) return;
      const accId = bqEquipBtn.getAttribute("data-bq-equip") || "";
      const bq = ensureStarBoutiqueState(state);
      const targetMonId = bq?.selectedMonId ?? state.mons?.list?.[0]?.id ?? null;
      const res = equipBoutiqueAccessory(state, accId, targetMonId);
      if (res.ok && res.logLine) {
        addLog(res.logLine, true);
        markMonListDirty?.(false);
        markMonsDirty?.();
      }
      markFunctionsDirty();
      render();
      return;
    }

    const bqUnequipBtn = ev.target?.closest?.("button[data-bq-unequip]");
    if (bqUnequipBtn && elFunctionsTraining.contains(bqUnequipBtn)) {
      const accId = bqUnequipBtn.getAttribute("data-bq-unequip") || "";
      const res = unequipBoutiqueAccessory(state, accId);
      if (res.ok) {
        addLog("星辉造型屋：已将配饰卸下并收纳至展柜", true);
        markMonListDirty?.(false);
        markMonsDirty?.();
      }
      markFunctionsDirty();
      render();
      return;
    }

    const bqSheenBtn = ev.target?.closest?.("button[data-bq-sheen]");
    if (bqSheenBtn && elFunctionsTraining.contains(bqSheenBtn)) {
      if (bqSheenBtn.disabled) return;
      const sheenId = bqSheenBtn.getAttribute("data-bq-sheen") || "";
      const bq = ensureStarBoutiqueState(state);
      const targetMonId = bq?.selectedMonId ?? state.mons?.list?.[0]?.id ?? null;
      const res = unlockOrApplyBoutiqueSheen(state, sheenId, targetMonId);
      if (res.ok) {
        addLog(
          res.newlyUnlocked
            ? "星辉造型屋：成功解锁极光流彩光晕并为伙伴调染生效！"
            : "星辉造型屋：已为伙伴切换极光流彩光晕！",
          true,
        );
        markMonListDirty?.(false);
        markMonsDirty?.();
      } else {
        addLog("闪光祈愿星砂不足，无法解锁该极光流彩光晕");
      }
      markFunctionsDirty();
      render();
      return;
    }

    const bqClearMonBtn = ev.target?.closest?.("button[data-bq-clear-mon]");
    if (bqClearMonBtn && elFunctionsTraining.contains(bqClearMonBtn)) {
      const monId = Number(bqClearMonBtn.getAttribute("data-bq-clear-mon"));
      if (Number.isFinite(monId) && monId > 0) {
        unequipBoutiqueStyle(state, monId);
        addLog("星辉造型屋：已卸下该伙伴的配饰与流彩光晕", true);
        markMonListDirty?.(false);
        markMonsDirty?.();
      }
      markFunctionsDirty();
      render();
      return;
    }

    // --- ML-7 Champion League Elite Four & Grand Champion Gauntlet Actions ---
    const funcLeagueAutoBtn = ev.target?.closest?.("button[data-func-league-auto]");
    if (funcLeagueAutoBtn && elFunctionsTraining.contains(funcLeagueAutoBtn)) {
      if (funcLeagueAutoBtn.disabled) return;
      const resolveTypes = (m) =>
        Array.isArray(m?.types) && m.types.length ? m.types : getBeastDataByDex?.(m?.dex)?.types || ["wind"];
      const res = autofillChampionLeagueSquad(state, resolveTypes, monPower);
      if (res.ok) {
        addLog(`冠军联盟：已优选 ${res.squadIds.length} 只精锐伙伴组建殿堂挑战小队`, true);
        markMonListDirty?.(false);
      }
      markFunctionsDirty();
      render();
      return;
    }

    const funcLeagueOpenModalBtn = ev.target?.closest?.("button[data-func-league-open-modal]");
    if (funcLeagueOpenModalBtn && elFunctionsTraining.contains(funcLeagueOpenModalBtn)) {
      ui.funcLeagueModalOpen = true;
      ui.__leagueModalScrollTop = 0;
      markFunctionsDirty();
      render();
      return;
    }

    const funcLeagueCloseModalBtn = ev.target?.closest?.("button[data-func-league-modal-close]");
    if (funcLeagueCloseModalBtn && elFunctionsTraining.contains(funcLeagueCloseModalBtn)) {
      ui.funcLeagueModalOpen = false;
      markFunctionsDirty();
      render();
      return;
    }

    const funcLeagueOverlay = ev.target?.closest?.("div[data-func-league-modal-overlay]");
    if (funcLeagueOverlay && elFunctionsTraining.contains(funcLeagueOverlay) && ev.target === funcLeagueOverlay) {
      ui.funcLeagueModalOpen = false;
      markFunctionsDirty();
      render();
      return;
    }

    const funcLeagueResetBtn = ev.target?.closest?.("button[data-func-league-reset]");
    if (funcLeagueResetBtn && elFunctionsTraining.contains(funcLeagueResetBtn)) {
      resetChampionLeagueProgress(state);
      addLog("冠军联盟：已将逐殿挑战进度重置回第 1 殿「炎狱天王」");
      markFunctionsDirty();
      render();
      return;
    }

    const funcLeagueFightBtn = ev.target?.closest?.("button[data-func-league-fight]");
    if (funcLeagueFightBtn && elFunctionsTraining.contains(funcLeagueFightBtn)) {
      if (funcLeagueFightBtn.disabled) return;
      const mode = funcLeagueFightBtn.getAttribute("data-func-league-fight") === "single" ? "single" : "full";
      const res = simulateLeagueGauntlet(state, {
        mode,
        getBeastDataByDex,
        monPower,
        addRes,
        addExpToMon,
      });
      if (res.ok) {
        const sandGot = res.rewardsEarned?.shinyStarSand || 0;
        if (res.championCleared) {
          addLog(
            `冠军联盟登顶捷报：连破四天王与圣殿总冠军！获闪光祈愿星砂 +${sandGot}，参战伙伴刻印【冠军殿堂绶带】（殿堂 Tier ${res.hallOfFameTier}）！`,
            true,
          );
        } else if (res.win) {
          addLog(`冠军联盟捷报：成功攻克当前天王殿，获得闪光祈愿星砂 +${sandGot}！`, true);
        } else {
          addLog(
            `冠军联盟战报：攻克 ${res.stagesCleared} 殿后止步于【${res.stoppedTitle || "四天王"}】${sandGot > 0 ? `（已获星砂 +${sandGot}）` : ""}，提升配饰或烹制盛宴后再战吧！`,
          );
        }
        markMonListDirty?.(false);
        markMonsDirty?.();
      }
      markFunctionsDirty();
      render();
      return;
    }

    // --- ML-6 Starlight Camp & Cuisine Workshop Actions ---
    const campAutoFillBtn = ev.target?.closest?.("button[data-camp-autofill]");
    if (campAutoFillBtn && elFunctionsTraining.contains(campAutoFillBtn)) {
      if (campAutoFillBtn.disabled) return;
      const res = autoFillStarCampSquad(state, { getBeastDataByDex });
      if (res.ok) {
        addLog(`星界露营野餐屋：已邀请 ${res.stationedIds.length} 只伙伴温馨入驻（激活【${res.harmony?.name || "星营共鸣"}】）`, true);
        markMonListDirty?.(false);
      } else {
        addLog("星界露营野餐屋：暂无空闲可入驻伙伴");
      }
      markFunctionsDirty();
      render();
      return;
    }

    const campOpenSquadBtn = ev.target?.closest?.("button[data-camp-open-squad]");
    if (campOpenSquadBtn && elFunctionsTraining.contains(campOpenSquadBtn)) {
      ui.starCampModalOpen = true;
      ui.__campModalScrollTop = 0;
      markFunctionsDirty();
      render();
      return;
    }

    const campCloseModalBtn = ev.target?.closest?.("button[data-camp-modal-close]");
    if (campCloseModalBtn && elFunctionsTraining.contains(campCloseModalBtn)) {
      ui.starCampModalOpen = false;
      markFunctionsDirty();
      render();
      return;
    }

    const campOverlay = ev.target?.closest?.("div[data-camp-modal-overlay]");
    if (campOverlay && elFunctionsTraining.contains(campOverlay) && ev.target === campOverlay) {
      ui.starCampModalOpen = false;
      markFunctionsDirty();
      render();
      return;
    }

    const campClearBtn = ev.target?.closest?.("button[data-camp-clear]");
    if (campClearBtn && elFunctionsTraining.contains(campClearBtn)) {
      clearStarCampSquad(state);
      markMonListDirty?.(false);
      markFunctionsDirty();
      render();
      return;
    }

    const campToggleMonBtn = ev.target?.closest?.("button[data-camp-toggle-mon]");
    if (campToggleMonBtn && elFunctionsTraining.contains(campToggleMonBtn)) {
      const monId = Number(campToggleMonBtn.getAttribute("data-camp-toggle-mon"));
      if (Number.isFinite(monId) && monId > 0) {
        toggleStarCampCompanion(state, monId);
        markMonListDirty?.(false);
        markFunctionsDirty();
        render();
      }
      return;
    }

    const campEnsembleBtn = ev.target?.closest?.("button[data-camp-ensemble]");
    if (campEnsembleBtn && elFunctionsTraining.contains(campEnsembleBtn)) {
      if (campEnsembleBtn.disabled) return;
      const res = performStarCampEnsemble(state);
      if (res.ok) {
        addLog(res.flavorLine, true);
        markMonsDirty?.();
      } else if (res.reason === "daily_limit_reached") {
        addLog("星界露营：今日营火合奏次数已用完，明日再来围炉欢聚吧！");
      } else {
        addLog("星界露营：请先邀请至少 1 只萌灵入驻营地再开启营火合奏");
      }
      markFunctionsDirty();
      render();
      return;
    }

    const campCookBtn = ev.target?.closest?.("button[data-camp-cook]");
    if (campCookBtn && elFunctionsTraining.contains(campCookBtn)) {
      if (campCookBtn.disabled) return;
      const recipeId = campCookBtn.getAttribute("data-camp-cook");
      const res = cookCampRecipe(state, recipeId);
      if (res.ok) {
        addLog(`料理工坊：${res.logLine}`, true);
        markMonsDirty?.();
      } else {
        addLog("料理工坊：所需食材或野餐香草不足，可通过驻营伴游、营火合奏或生态沙盘收集");
      }
      markFunctionsDirty();
      render();
      return;
    }

    // --- ML-5 Eco-Sandbox Actions ---
    const ecoAutoDispatchAllBtn = ev.target?.closest?.("button[data-eco-auto-dispatch-all]");
    if (ecoAutoDispatchAllBtn && elFunctionsTraining.contains(ecoAutoDispatchAllBtn)) {
      if (ecoAutoDispatchAllBtn.disabled) return;
      const res = autoDispatchAllEcoSandbox(state, { getBeastDataByDex });
      if (res.ok) {
        addLog(`秘境生态沙盘：已优选空闲伙伴派遣至 ${res.dispatched.length} 处生态区`, true);
        markMonListDirty?.(false);
      } else {
        addLog("秘境生态沙盘：当前无可派遣的空闲萌灵或全部生态区已在勘探中");
      }
      markFunctionsDirty();
      render();
      return;
    }

    const ecoClaimAllBtn = ev.target?.closest?.("button[data-eco-claim-all-redispatch]");
    if (ecoClaimAllBtn && elFunctionsTraining.contains(ecoClaimAllBtn)) {
      if (ecoClaimAllBtn.disabled) return;
      const res = claimAllEcoSandboxZones(state, {
        redispatch: true,
        addRes,
        addExpToMon,
        getBeastDataByDex,
      });
      if (res.ok) {
        const mintGot = res.totalRewards.tuningMint || 0;
        const relicTxt = res.relicsFound.length
          ? ` · 发掘古遗物：${res.relicsFound.map((r) => `${r.name}(阶${r.rank})`).join("、")}`
          : "";
        addLog(`秘境沙盘全收续派：共结算 ${res.claimed.length} 区，心性调律薄荷 +${mintGot}${relicTxt}`, true);
        ui.futureDirty = true;
        ui.itemsDirty = true;
        ui.pveDirty = true;
        markMonsDirty?.();
        markMonListDirty?.(false);
      }
      markFunctionsDirty();
      render();
      return;
    }

    const ecoOpenSquadBtn = ev.target?.closest?.("button[data-eco-open-squad]");
    if (ecoOpenSquadBtn && elFunctionsTraining.contains(ecoOpenSquadBtn)) {
      const zoneId = ecoOpenSquadBtn.getAttribute("data-eco-open-squad");
      if (zoneId && getEcoZoneDef(zoneId)) {
        ui.ecoModalZoneId = zoneId;
        markFunctionsDirty();
        render();
      }
      return;
    }

    const ecoModalCloseBtn = ev.target?.closest?.("button[data-eco-modal-close]");
    if (ecoModalCloseBtn && elFunctionsTraining.contains(ecoModalCloseBtn)) {
      ui.ecoModalZoneId = null;
      markFunctionsDirty();
      render();
      return;
    }

    const ecoOverlay = ev.target?.closest?.("div[data-eco-modal-overlay]");
    if (ecoOverlay && elFunctionsTraining.contains(ecoOverlay) && ev.target === ecoOverlay) {
      ui.ecoModalZoneId = null;
      markFunctionsDirty();
      render();
      return;
    }

    const ecoModalClearBtn = ev.target?.closest?.("button[data-eco-modal-clear]");
    if (ecoModalClearBtn && elFunctionsTraining.contains(ecoModalClearBtn)) {
      const zoneId = ecoModalClearBtn.getAttribute("data-eco-modal-clear");
      const sb = ensureEcoSandboxState(state);
      if (zoneId && sb?.zones?.[zoneId] && !sb.zones[zoneId].active) {
        sb.zones[zoneId].stagedIds = [];
        markMonListDirty?.(false);
        markFunctionsDirty();
        render();
      }
      return;
    }

    const ecoAutoPickBtn = ev.target?.closest?.("button[data-eco-autopick]");
    if (ecoAutoPickBtn && elFunctionsTraining.contains(ecoAutoPickBtn)) {
      if (ecoAutoPickBtn.disabled) return;
      const zoneId = ecoAutoPickBtn.getAttribute("data-eco-autopick");
      const res = autoPickEcoSandboxSquad(state, zoneId, { getBeastDataByDex });
      if (res.ok) {
        markMonListDirty?.(false);
      } else {
        addLog("该生态区暂无空闲伙伴可供优选编队");
      }
      markFunctionsDirty();
      render();
      return;
    }

    const ecoDispatchBtn = ev.target?.closest?.("button[data-eco-dispatch]");
    if (ecoDispatchBtn && elFunctionsTraining.contains(ecoDispatchBtn)) {
      if (ecoDispatchBtn.disabled) return;
      const zoneId = ecoDispatchBtn.getAttribute("data-eco-dispatch");
      const res = dispatchEcoSandboxZone(state, zoneId, null, { getBeastDataByDex });
      if (res.ok) {
        const zDef = getEcoZoneDef(zoneId);
        ui.ecoModalZoneId = null;
        addLog(`秘境沙盘派遣：${zDef?.name || zoneId}（编队 ${res.squadIds.length} 只 · 契合度 x${res.affinityMul.toFixed(2)}）`, true);
        markMonListDirty?.(false);
      }
      markFunctionsDirty();
      render();
      return;
    }

    const ecoCancelBtn = ev.target?.closest?.("button[data-eco-cancel]");
    if (ecoCancelBtn && elFunctionsTraining.contains(ecoCancelBtn)) {
      const zoneId = ecoCancelBtn.getAttribute("data-eco-cancel");
      const res = cancelEcoSandboxZone(state, zoneId);
      if (res.ok) {
        const zDef = getEcoZoneDef(zoneId);
        addLog(`秘境沙盘撤回：${zDef?.name || zoneId} 勘探队已返回营地`);
        markMonListDirty?.(false);
      }
      markFunctionsDirty();
      render();
      return;
    }

    const ecoInstantBtn = ev.target?.closest?.("button[data-eco-instant]");
    if (ecoInstantBtn && elFunctionsTraining.contains(ecoInstantBtn)) {
      if (ecoInstantBtn.disabled) return;
      const zoneId = ecoInstantBtn.getAttribute("data-eco-instant");
      const res = instantCompleteEcoSandboxZone(state, zoneId);
      if (res.ok) {
        const zDef = getEcoZoneDef(zoneId);
        const costZh =
          res.costKind === "free_daily"
            ? "消耗今日免费速勘次数"
            : res.costKind === "searchFlare"
              ? "消耗搜索信号弹 ×1"
              : "消耗未来币 ×15";
        addLog(`灵能速勘完成：${zDef?.name || zoneId}（${costZh}），可立即领取收获！`, true);
      }
      markFunctionsDirty();
      render();
      return;
    }

    const ecoClaimBtn = ev.target?.closest?.("button[data-eco-claim],button[data-eco-claim-redispatch]");
    if (ecoClaimBtn && elFunctionsTraining.contains(ecoClaimBtn)) {
      const redispatch = ecoClaimBtn.hasAttribute("data-eco-claim-redispatch");
      const zoneId = ecoClaimBtn.getAttribute(redispatch ? "data-eco-claim-redispatch" : "data-eco-claim");
      const res = claimEcoSandboxZone(state, zoneId, {
        redispatch,
        addRes,
        addExpToMon,
        getBeastDataByDex,
      });
      if (res.ok) {
        const mintGot = res.rewards.tuningMint || 0;
        const relicNote = res.relicFound ? ` · 发掘遗物「${res.relicFound.name}」阶${res.relicFound.rank}` : "";
        addLog(
          `秘境收获（${res.zoneName}）：心性调律薄荷 +${mintGot}${relicNote}${res.redispatched ? "（已自动原队续派）" : ""}`,
          true,
        );
        ui.futureDirty = true;
        ui.itemsDirty = true;
        ui.pveDirty = true;
        markMonsDirty?.();
        markMonListDirty?.(false);
      }
      markFunctionsDirty();
      render();
      return;
    }

    // --- ML-5 Temperament Mint Workshop Actions ---
    const mintPresetBtn = ev.target?.closest?.("button[data-mint-preset]");
    if (mintPresetBtn && elFunctionsTraining.contains(mintPresetBtn)) {
      const pid = mintPresetBtn.getAttribute("data-mint-preset");
      const preset = MINT_TUNING_PRESETS.find((p) => p.id === pid);
      if (preset) {
        if (preset.up === null && preset.down === null) {
          ui.mintWorkshopNeutral = true;
        } else {
          ui.mintWorkshopNeutral = false;
          ui.mintWorkshopUp = preset.up;
          ui.mintWorkshopDown = preset.down;
        }
        markFunctionsDirty();
        render();
      }
      return;
    }

    const mintUpBtn = ev.target?.closest?.("button[data-mint-up]");
    if (mintUpBtn && elFunctionsTraining.contains(mintUpBtn)) {
      const val = mintUpBtn.getAttribute("data-mint-up");
      if (val === "neutral") {
        ui.mintWorkshopNeutral = true;
      } else if (TUNABLE_STATS.includes(val)) {
        ui.mintWorkshopNeutral = false;
        ui.mintWorkshopUp = val;
        if (!TUNABLE_STATS.includes(ui.mintWorkshopDown) || ui.mintWorkshopDown === val) {
          ui.mintWorkshopDown = val === "spa" ? "atk" : "spa";
        }
      }
      markFunctionsDirty();
      render();
      return;
    }

    const mintDownBtn = ev.target?.closest?.("button[data-mint-down]");
    if (mintDownBtn && elFunctionsTraining.contains(mintDownBtn)) {
      if (mintDownBtn.disabled) return;
      const val = mintDownBtn.getAttribute("data-mint-down");
      if (TUNABLE_STATS.includes(val) && val !== ui.mintWorkshopUp) {
        ui.mintWorkshopNeutral = false;
        ui.mintWorkshopDown = val;
        markFunctionsDirty();
        render();
      }
      return;
    }

    const mintRecBtn = ev.target?.closest?.("button[data-mint-recommend]");
    if (mintRecBtn && elFunctionsTraining.contains(mintRecBtn)) {
      const listNow = (state.mons?.list ?? []).filter(Boolean);
      const monId =
        typeof ui.mintWorkshopMonId === "number" && listNow.some((m) => m.id === ui.mintWorkshopMonId)
          ? ui.mintWorkshopMonId
          : listNow[0]?.id ?? null;
      const targetMon = monId != null ? listNow.find((m) => m.id === monId) : null;
      if (targetMon) {
        const rec = recommendMintTuningForMon(targetMon, getBeastDataByDex);
        ui.mintWorkshopNeutral = false;
        ui.mintWorkshopUp = rec.up;
        ui.mintWorkshopDown = rec.down;
        markFunctionsDirty();
        render();
      }
      return;
    }

    const mintApplyBtn = ev.target?.closest?.("button[data-mint-apply]");
    if (mintApplyBtn && elFunctionsTraining.contains(mintApplyBtn)) {
      if (mintApplyBtn.disabled) return;
      const listNow = (state.mons?.list ?? []).filter(Boolean);
      const monId =
        typeof ui.mintWorkshopMonId === "number" && listNow.some((m) => m.id === ui.mintWorkshopMonId)
          ? ui.mintWorkshopMonId
          : listNow[0]?.id ?? null;
      const targetMon = monId != null ? listNow.find((m) => m.id === monId) : null;
      if (!targetMon) return;
      const recSpec = recommendMintTuningForMon(targetMon, getBeastDataByDex);
      const curNorm = normalizeMintTuning(targetMon.mintTuning);
      let up = ui.mintWorkshopUp;
      let down = ui.mintWorkshopDown;
      const isNeutral = Boolean(ui.mintWorkshopNeutral);
      if (!isNeutral) {
        if (!TUNABLE_STATS.includes(up)) up = curNorm?.up || recSpec.up || "atk";
        if (!TUNABLE_STATS.includes(down) || down === up) {
          down = curNorm?.down && curNorm.down !== up ? curNorm.down : up === "spa" ? "atk" : "spa";
        }
      }
      const spec = isNeutral ? { up: null, down: null } : { up, down };
      const res = applyMintTuningToMon(state, targetMon.id, spec);
      if (res.ok) {
        addLog(`心性调律完成：${targetMon.name} 偏向更新为「${res.label}」`, true);
        ui.pveDirty = true;
        ui.futureDirty = true;
        ui.itemsDirty = true;
        markMonsDirty?.();
        markMonListDirty?.(false);
      } else {
        addLog("心性调律未生效：请确认拥有心性调律薄荷且目标偏向与当前不同");
      }
      markFunctionsDirty();
      render();
      return;
    }

    const trainOpenBtn = ev.target?.closest?.("button[data-train-open]");
    if (trainOpenBtn && elFunctionsTraining.contains(trainOpenBtn)) {
      const slotSize =
        typeof state.training?.slotSize === "number" && Number.isFinite(state.training.slotSize)
          ? Math.max(0, Math.floor(state.training.slotSize))
          : 0;
      if (slotSize < 1) return;
      const activeIds = Array.isArray(state.training?.activeIds) ? state.training.activeIds : [];
      if (activeIds.length >= slotSize) return;
      ui.trainingModalOpen = true;
      ui.trainingModalSelectedIds = [];
      markFunctionsDirty();
      render();
      return;
    }

    const trainCloseBtn = ev.target?.closest?.("button[data-train-modal-close]");
    if (trainCloseBtn && elFunctionsTraining.contains(trainCloseBtn)) {
      ui.trainingModalOpen = false;
      markFunctionsDirty();
      render();
      return;
    }
    const trainOverlay = ev.target?.closest?.("div[data-train-modal-overlay]");
    if (trainOverlay && elFunctionsTraining.contains(trainOverlay)) {
      if (ev.target === trainOverlay) {
        ui.trainingModalOpen = false;
        markFunctionsDirty();
        render();
        return;
      }
    }
    const trainClearBtn = ev.target?.closest?.("button[data-train-modal-clear]");
    if (trainClearBtn && elFunctionsTraining.contains(trainClearBtn)) {
      ui.trainingModalSelectedIds = [];
      markFunctionsDirty();
      render();
      return;
    }
    const trainConfirmBtn = ev.target?.closest?.("button[data-train-modal-confirm]");
    if (trainConfirmBtn && elFunctionsTraining.contains(trainConfirmBtn)) {
      if (!state.training || typeof state.training !== "object") state.training = { activeIds: [], slotSize: 0 };
      if (!Array.isArray(state.training.activeIds)) state.training.activeIds = [];
      const slotSize =
        typeof state.training.slotSize === "number" && Number.isFinite(state.training.slotSize)
          ? Math.max(0, Math.floor(state.training.slotSize))
          : 0;
      const used = state.training.activeIds.length;
      const capLeft = Math.max(0, slotSize - used);
      if (capLeft <= 0) return;
      const sel0 = Array.isArray(ui.trainingModalSelectedIds) ? ui.trainingModalSelectedIds : [];
      const alive = state.mons?.list ?? [];
      const pickMons = sel0
        .map((id) => alive.find((m) => m && m.id === id) ?? null)
        .filter((x) => x)
        .slice(0, capLeft);
      if (pickMons.length <= 0) return;
      for (const mon of pickMons) {
        if (!state.training.activeIds.includes(mon.id) && state.training.activeIds.length < slotSize) {
          state.training.activeIds.push(mon.id);
          addLog(`训练开始：${mon.name}`);
        }
      }
      ui.trainingModalOpen = false;
      ui.trainingModalSelectedIds = [];
      markFunctionsDirty();
      render();
      return;
    }

    const feedBtn = ev.target?.closest?.("button[data-train-feed]");
    if (feedBtn && elFunctionsTraining.contains(feedBtn)) {
      if (feedBtn.disabled) return;
      const id = Number(feedBtn.getAttribute("data-train-feed"));
      if (!Number.isFinite(id)) return;
      const m = (state.mons?.list ?? []).find((x) => x.id === id);
      if (!m) return;

      const sat0 = clamp(typeof m.satiety === "number" && Number.isFinite(m.satiety) ? m.satiety : 100, 0, 100);
      if (sat0 >= 100) return;

      const needSat = Math.max(0, 100 - sat0);
      const stepsNeed = Math.max(0, Math.ceil(needSat / 5));
      const needCatnip = stepsNeed * 100;
      const haveCatnip = Math.max(0, Math.floor(state.res.catnip.value ?? 0));

      if (haveCatnip < 100) {
        addLog(`喂食失败：灵果不足（需要 ${needCatnip}，当前 ${haveCatnip}）`, true);
        return;
      }

      if (haveCatnip >= needCatnip) {
        state.res.catnip.value = Math.max(0, state.res.catnip.value - needCatnip);
        m.satiety = 100;
        addLog(`喂食：${m.name} 饱腹度补满（消耗灵果 ${needCatnip}）`, true);
      } else {
        const steps = Math.max(0, Math.floor(haveCatnip / 100));
        const cost = steps * 100;
        const addSat = steps * 5;
        const sat1 = clamp(sat0 + addSat, 0, 100);
        state.res.catnip.value = Math.max(0, state.res.catnip.value - cost);
        m.satiety = sat1;
        const miss = Math.max(0, needCatnip - cost);
        addLog(`喂食：${m.name} 饱腹度 +${Math.floor(sat1 - sat0)}（灵果不足，距离喂满还差 ${miss}）`, true);
      }

      markMonListDirty(false);
      render();
      return;
    }

    const cancelBtn = ev.target?.closest?.("button[data-train-cancel]");
    if (cancelBtn && elFunctionsTraining.contains(cancelBtn)) {
      const cid = Number(cancelBtn.getAttribute("data-train-cancel"));
      if (state.training && typeof state.training === "object") {
        if (!Array.isArray(state.training.activeIds)) state.training.activeIds = [];
        state.training.activeIds = state.training.activeIds.filter((x) => x !== cid);
      }
      addLog("训练已取消");
      markFunctionsDirty();
      render();
    }

    const breedLockBtn = ev.target?.closest?.("button[data-breed-ability-lock]");
    if (breedLockBtn && elFunctionsTraining.contains(breedLockBtn)) {
      const bState = ensureBreedingState(state);
      const nextLock = normalizeAbilityLock(breedLockBtn.getAttribute("data-breed-ability-lock"));
      if (bState.abilityLock !== nextLock) {
        bState.abilityLock = nextLock;
        const lockLabel = nextLock === "a" ? "锁定伙伴 A 特性" : nextLock === "b" ? "锁定伙伴 B 特性" : "双亲优选遗传";
        addLog(`优生特性规则：${lockLabel}`, true);
        markFunctionsDirty();
        render();
      }
      return;
    }

    const breedOpenBtn = ev.target?.closest?.("button[data-breed-open]");
    if (breedOpenBtn && elFunctionsTraining.contains(breedOpenBtn)) {
      ensureBreedingState(state);
      if (Boolean(state.breeding.on)) return;
      ui.breedingModalOpen = true;
      ui.breedingModalSelectedIds = [];
      markFunctionsDirty();
      render();
      return;
    }

    const breedCloseBtn = ev.target?.closest?.("button[data-breed-modal-close]");
    if (breedCloseBtn && elFunctionsTraining.contains(breedCloseBtn)) {
      ui.breedingModalOpen = false;
      markFunctionsDirty();
      render();
      return;
    }
    const breedOverlay = ev.target?.closest?.("div[data-breed-modal-overlay]");
    if (breedOverlay && elFunctionsTraining.contains(breedOverlay)) {
      if (ev.target === breedOverlay) {
        ui.breedingModalOpen = false;
        markFunctionsDirty();
        render();
        return;
      }
    }
    const breedClearBtn = ev.target?.closest?.("button[data-breed-modal-clear]");
    if (breedClearBtn && elFunctionsTraining.contains(breedClearBtn)) {
      ui.breedingModalSelectedIds = [];
      markFunctionsDirty();
      render();
      return;
    }
    const breedConfirmBtn = ev.target?.closest?.("button[data-breed-modal-confirm]");
    if (breedConfirmBtn && elFunctionsTraining.contains(breedConfirmBtn)) {
      ensureBreedingState(state);
      if (Boolean(state.breeding.on)) return;
      const sel0 = Array.isArray(ui.breedingModalSelectedIds) ? ui.breedingModalSelectedIds : [];
      const alive = state.mons?.list ?? [];
      const expBusyIds = new Set(
        Boolean(state.expedition?.on) && Array.isArray(state.expedition.activeIds) ? state.expedition.activeIds : [],
      );
      const sel = sel0
        .map((id) => alive.find((m) => m && m.id === id) ?? null)
        .filter((x) => x && !expBusyIds.has(x.id))
        .slice(0, 2);
      if (sel.length !== 2) return;
      if (sel[0].id === sel[1].id) return;
      state.breeding.aId = sel[0].id;
      state.breeding.bId = sel[1].id;
      state.breeding.on = true;
      state.breeding.eggRemainingSec = 0;
      state.breeding.eggTotalSec = 0;
      ui.breedingModalOpen = false;
      ui.breedingModalSelectedIds = [];
      addLog("开始饲养", true);
      markFunctionsDirty();
      render();
      return;
    }

    const breedCancelBtn = ev.target?.closest?.("button[data-breed-cancel]");
    if (breedCancelBtn && elFunctionsTraining.contains(breedCancelBtn)) {
      if (state.breeding && typeof state.breeding === "object") {
        state.breeding.on = false;
        state.breeding.eggRemainingSec = 0;
        state.breeding.eggTotalSec = 0;
      }
      addLog("饲养已取消", true);
      markFunctionsDirty();
      render();
    }

    const expTeamOpenBtn = ev.target?.closest?.("button[data-exp-team-open]");
    if (expTeamOpenBtn && elFunctionsTraining.contains(expTeamOpenBtn)) {
      if (!state.expedition || typeof state.expedition !== "object") return;
      const expOn = Boolean(state.expedition.on) && (state.expedition.remainingSec ?? 0) > 0;
      if (expOn) return;
      ui.expeditionTeamModalOpen = true;
      markFunctionsDirty();
      render();
      return;
    }

    const expTeamCloseBtn = ev.target?.closest?.("button[data-exp-team-close]");
    if (expTeamCloseBtn && elFunctionsTraining.contains(expTeamCloseBtn)) {
      ui.expeditionTeamModalOpen = false;
      markFunctionsDirty();
      render();
      return;
    }

    const expTeamOverlay = ev.target?.closest?.("div[data-exp-team-overlay]");
    if (expTeamOverlay && elFunctionsTraining.contains(expTeamOverlay)) {
      if (ev.target === expTeamOverlay) {
        ui.expeditionTeamModalOpen = false;
        markFunctionsDirty();
        render();
        return;
      }
    }

    const expDungeonBtn = ev.target?.closest?.("button[data-exp-dungeon]");
    if (expDungeonBtn && elFunctionsTraining.contains(expDungeonBtn)) {
      if (!state.expedition || typeof state.expedition !== "object") return;
      const key = expDungeonBtn.getAttribute("data-exp-dungeon");
      if (!key) return;
      state.expedition.selectedDungeonKey = String(key);
      markFunctionsDirty();
      render();
      return;
    }

    const expClearBtn = ev.target?.closest?.("button[data-exp-clear]");
    if (expClearBtn && elFunctionsTraining.contains(expClearBtn)) {
      if (!state.expedition || typeof state.expedition !== "object") return;
      state.expedition.selectedIds = [];
      markFunctionsDirty();
      render();
      return;
    }

    const expAutoBtn = ev.target?.closest?.("button[data-exp-team-auto]");
    if (expAutoBtn && elFunctionsTraining.contains(expAutoBtn)) {
      if (!state.expedition || typeof state.expedition !== "object") return;
      const expOn = Boolean(state.expedition.on) && (state.expedition.remainingSec ?? 0) > 0;
      if (expOn) return;
      ui.expeditionTeamAutoPick = true;
      markFunctionsDirty();
      render();
      return;
    }

    const expRemoveBtn = ev.target?.closest?.("button[data-exp-remove]");
    if (expRemoveBtn && elFunctionsTraining.contains(expRemoveBtn)) {
      if (!state.expedition || typeof state.expedition !== "object") return;
      const id = Number(expRemoveBtn.getAttribute("data-exp-remove"));
      if (!Number.isFinite(id)) return;
      if (!Array.isArray(state.expedition.selectedIds)) state.expedition.selectedIds = [];
      state.expedition.selectedIds = state.expedition.selectedIds.filter((x) => x !== id);
      markFunctionsDirty();
      render();
      return;
    }

    const expStartBtn = ev.target?.closest?.("button[data-exp-start]");
    if (expStartBtn && elFunctionsTraining.contains(expStartBtn)) {
      if (!state.expedition || typeof state.expedition !== "object") return;
      ui.expeditionTeamModalOpen = false;
      const postLvl = clamp(state.buildings?.expeditionPost?.owned ?? 0, 0, 10);
      if (postLvl < 1) return;
      const selLvl = typeof state.expedition.selectedLevel === "string" ? state.expedition.selectedLevel : "basic";
      const lvlDef = getExpLevelDef(selLvl);
      if (postLvl < lvlDef.unlockLvl) return;

      const dungeons = state.expedition.dungeons?.[selLvl];
      const dlist = Array.isArray(dungeons) ? dungeons : [];
      const d = dlist.find((x) => x && x.key === state.expedition.selectedDungeonKey) ?? dlist[0] ?? null;
      if (!d) return;

      const typeMul = (m, dungeonType) => expeditionTypeMul(m, dungeonType, getBeastDataByDex);

      const selIds = Array.isArray(state.expedition.selectedIds) ? state.expedition.selectedIds.slice(0, 20) : [];
      const mons = state.mons?.list ?? [];
      const selMons = selIds.map((id) => mons.find((x) => x && x.id === id) ?? null).filter((x) => x);
      if (selMons.length <= 0) return;
      if (state.breeding?.on && selMons.some((m) => m.id === state.breeding.aId || m.id === state.breeding.bId)) return;
      for (const m of selMons) {
        const cd0 =
          typeof m.skillCdRemainingSec === "number" && Number.isFinite(m.skillCdRemainingSec)
            ? Math.max(0, m.skillCdRemainingSec)
            : 0;
        if (cd0 > 0) return;
      }

      const selMonsSorted = selMons
        .map((m) => ({ m, effPower: monPower(m) * typeMul(m, d.type) }))
        .sort((a, b) => (b.effPower ?? 0) - (a.effPower ?? 0))
        .map((x) => x.m);

      const effPower = selMonsSorted.reduce((acc, m) => acc + monPower(m) * typeMul(m, d.type), 0);
      if (effPower < lvlDef.req) return;
      const baseSec = 7200;
      const excessPct = Math.max(0, (effPower - lvlDef.req) / lvlDef.req);
      const natureTimeMul = expeditionNatureTimeMul(selMonsSorted);
      const expPerkTimeMul = legacyExpeditionTimeMul(state);
      const expPerkRewardMul = legacyExpeditionRewardMul(state);
      const totalSec0 = Math.max(60, Math.ceil((baseSec / Math.pow(1.01, excessPct * 100)) * natureTimeMul * expPerkTimeMul));
      const quick = Boolean(ui.expeditionQuick);
      const totalSec = applyQuickExpeditionDuration(totalSec0, quick);
      const rewardMul0 = selMonsSorted.reduce((acc, m) => acc + typeMul(m, d.type), 0) / selMonsSorted.length;
      const rewardMul = Math.max(0.75, Math.min(1.5, rewardMul0));

      state.expedition.on = true;
      state.expedition.activeIds = selMonsSorted.map((m) => m.id);
      state.expedition.remainingSec = totalSec;
      state.expedition.totalSec = totalSec;
      state.expedition.quick = quick;
      state.expedition.milestonesFired = {};
      state.expedition.rewardExp = applyQuickExpeditionReward(Math.floor(lvlDef.exp * rewardMul * expPerkRewardMul), quick);
      state.expedition.rewardCoin = applyQuickExpeditionReward(Math.floor(lvlDef.coin * rewardMul * expPerkRewardMul), quick);
      state.expedition.rewardPotionTotal = applyQuickExpeditionReward(lvlDef.pot, quick);
      state.expedition.dungeonType = d.type;
      const impishN = selMonsSorted.filter((m) => monPassive(m)?.key === "expeditionTimeBonus").length;
      const quickLabel = quick ? "（急行）" : "";
      addLog(impishN > 0 ? `开始远征${quickLabel}（淘气性格加速 ×${impishN}）` : `开始远征${quickLabel}`, true);
      markFunctionsDirty();
      render();
      return;
    }

    const expCancelBtn = ev.target?.closest?.("button[data-exp-cancel]");
    if (expCancelBtn && elFunctionsTraining.contains(expCancelBtn)) {
      if (!state.expedition || typeof state.expedition !== "object") return;
      ui.expeditionTeamModalOpen = false;
      state.expedition.on = false;
      state.expedition.activeIds = [];
      state.expedition.remainingSec = 0;
      state.expedition.totalSec = 0;
      state.expedition.rewardExp = 0;
      state.expedition.rewardCoin = 0;
      state.expedition.rewardPotionTotal = 0;
      state.expedition.dungeonType = null;
      state.expedition.quick = false;
      state.expedition.milestonesFired = {};
      addLog("远征已取消", true);
      markFunctionsDirty();
      render();
    }
  });

  elFunctionsTraining.addEventListener("change", (ev) => {
    const mintMonSel = ev.target?.closest?.("select[data-mint-mon]");
    if (mintMonSel && elFunctionsTraining.contains(mintMonSel)) {
      const monId = Number(mintMonSel.value);
      if (Number.isFinite(monId) && monId > 0) {
        ui.mintWorkshopMonId = monId;
        const st = stateRef();
        const mon = (st?.mons?.list ?? []).find((m) => m && m.id === monId);
        if (mon) {
          const cur = normalizeMintTuning(mon.mintTuning);
          if (cur) {
            ui.mintWorkshopNeutral = cur.up === null && cur.down === null;
            if (!ui.mintWorkshopNeutral) {
              ui.mintWorkshopUp = cur.up;
              ui.mintWorkshopDown = cur.down;
            }
          } else {
            const rec = recommendMintTuningForMon(mon, getBeastDataByDex);
            ui.mintWorkshopNeutral = false;
            ui.mintWorkshopUp = rec.up;
            ui.mintWorkshopDown = rec.down;
          }
        }
      }
      ui.functionsFocus = false;
      markFunctionsDirty();
      render();
      return;
    }

    const amberTargetSel = ev.target?.closest?.("select[data-amber-target-mon]");
    if (amberTargetSel && elFunctionsTraining.contains(amberTargetSel)) {
      const monId = Number(amberTargetSel.value);
      const st = stateRef();
      if (st && Number.isFinite(monId) && monId > 0) {
        const lab = ensureAmberRevivalState(st);
        if (lab) lab.selectedMonId = Math.floor(monId);
      }
      ui.functionsFocus = false;
      markFunctionsDirty();
      render();
      return;
    }

    const bqTargetSel = ev.target?.closest?.("select[data-boutique-target-mon]");
    if (bqTargetSel && elFunctionsTraining.contains(bqTargetSel)) {
      const monId = Number(bqTargetSel.value);
      const st = stateRef();
      if (st && Number.isFinite(monId) && monId > 0) {
        const bq = ensureStarBoutiqueState(st);
        if (bq) bq.selectedMonId = Math.floor(monId);
      }
      ui.functionsFocus = false;
      markFunctionsDirty();
      render();
      return;
    }

    const funcLeagueChk = ev.target?.closest?.("input[data-func-league-check]");
    if (funcLeagueChk && elFunctionsTraining.contains(funcLeagueChk)) {
      const st = stateRef();
      const monId = Number(funcLeagueChk.getAttribute("data-func-league-check"));
      if (st && Number.isFinite(monId) && monId > 0) {
        const res = toggleChampionLeagueSquadMon(st, monId);
        if (!res.ok) funcLeagueChk.checked = false;
        markMonListDirty?.(false);
        markFunctionsDirty();
        render();
      }
      return;
    }

    const campChk = ev.target?.closest?.("input[data-camp-modal-check]");
    if (campChk && elFunctionsTraining.contains(campChk)) {
      const st = stateRef();
      const monId = Number(campChk.getAttribute("data-camp-modal-check"));
      if (st && Number.isFinite(monId) && monId > 0) {
        const res = toggleStarCampCompanion(st, monId);
        if (!res.ok) campChk.checked = false;
        markMonListDirty?.(false);
        markFunctionsDirty();
        render();
      }
      return;
    }

    const ecoChk = ev.target?.closest?.("input[data-eco-modal-check]");
    if (ecoChk && elFunctionsTraining.contains(ecoChk)) {
      const st = stateRef();
      const zoneId = ecoChk.getAttribute("data-eco-modal-zone");
      const monId = Number(ecoChk.getAttribute("data-eco-modal-check"));
      if (st && zoneId && Number.isFinite(monId)) {
        const res = toggleEcoSandboxStagedMon(st, zoneId, monId);
        if (!res.ok) ecoChk.checked = false;
        markMonListDirty?.(false);
        markFunctionsDirty();
        render();
      }
      return;
    }

    const quickChk = ev.target?.closest?.("input[data-exp-quick]");
    if (quickChk && elFunctionsTraining.contains(quickChk)) {
      ui.expeditionQuick = Boolean(quickChk.checked);
      markFunctionsDirty();
      render();
      return;
    }
    const state = stateRef();
    if (!state || typeof state !== "object") return;

    const chk = ev.target?.closest?.("input[data-exp-team-check]");
    if (!chk || !elFunctionsTraining.contains(chk)) return;
    if (!state.expedition || typeof state.expedition !== "object") return;

    const id = Number(chk.getAttribute("data-exp-team-check"));
    if (!Number.isFinite(id)) return;

    const expOn = Boolean(state.expedition.on) && (state.expedition.remainingSec ?? 0) > 0;
    if (expOn) {
      const sel0 = Array.isArray(state.expedition.selectedIds) ? state.expedition.selectedIds : [];
      chk.checked = sel0.includes(id);
      return;
    }

    const list = state.mons?.list ?? [];
    const m = list.find((x) => x && x.id === id);
    if (!m) return;

    const cd0 =
      typeof m.skillCdRemainingSec === "number" && Number.isFinite(m.skillCdRemainingSec)
        ? Math.max(0, m.skillCdRemainingSec)
        : 0;
    if (cd0 > 0) {
      chk.checked = false;
      return;
    }

    const aliveSet = new Set(list.map((x) => (x && typeof x.id === "number" ? x.id : null)).filter((x) => typeof x === "number"));
    const sel0 = Array.isArray(state.expedition.selectedIds) ? state.expedition.selectedIds : [];
    let sel = sel0.filter((x) => aliveSet.has(x)).slice(0, 20);

    const checked = Boolean(chk.checked);
    if (checked) {
      if (!sel.includes(id)) {
        if (sel.length >= 20) {
          chk.checked = false;
          return;
        }
        sel = sel.concat([id]);
      }
    } else {
      sel = sel.filter((x) => x !== id);
    }

    state.expedition.selectedIds = sel;
    markFunctionsDirty();
    render();
  });
}
