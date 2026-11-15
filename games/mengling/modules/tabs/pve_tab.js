// PvE 关卡挑战 Tab — UI 渲染与交互
import { PVE_CHAPTERS, PVE_DAILY_MAX, getStageById, isStageUnlocked } from "../pve_defs.js";
import { simulateBattle, simulateDualBattle, recommendedTypes, typeMatchScore, estimateStageEnemyPower, pveFightModifiers } from "../pve_battle.js";
import { getEraDefById } from "../defs_eras.js";
import { natureIncomingDamageMul, abilityOutgoingDamageMul, bumpPveWinStreak, resetPveWinStreak, pveDailyFirstWinMul, bumpSessionPveWin, localDateStr } from "../systems/gameplay_fun.js";
import { ensureEra } from "../systems/era.js";
import {
  ensureTowerState,
  getTowerFloor,
  isTowerCleared,
  isEndlessTowerUnlocked,
  getWeeklyTowerAffix,
  unitMatchesWeather,
  countWeatherResonantMons,
  getNextTowerMilestone,
  TOWER_SEASON_EXCHANGES,
  PVE_TOWER_FLOORS,
  DUAL_SANCTUM_TRIALS,
  DUAL_SANCTUM_MILESTONES,
  ensureDualSanctumState,
  getDualSanctumTrial,
  isDualSanctumTrialUnlocked,
  evaluateDuoSynergy,
  selectDualSanctumDuo,
  autofillDualSanctumDuo,
  recordDualSanctumVictory,
  claimDualSanctumMilestone,
  computeDualSanctumBadgeBonus,
  CHAMPION_LEAGUE_MAX_TIER,
  CHAMPION_LEAGUE_SQUAD_SIZE,
  CHAMPION_LEAGUE_STAGES,
  ensureChampionLeagueState,
  computeChampionLeagueBonus,
  autofillChampionLeagueSquad,
  toggleChampionLeagueSquadMon,
  resetChampionLeagueProgress,
  evaluateLeagueSquadSynergy,
  estimateLeagueStagePower,
  simulateLeagueGauntlet,
  STAR_CORRIDOR_MAX_TIER,
  STAR_CORRIDOR_SQUAD_SIZE,
  STAR_CORRIDOR_SURGE_STEPS,
  STAR_CORRIDOR_EXCHANGES,
  ensureStarCorridorState,
  getStarCorridorFloorDef,
  computeStarCorridorBonus,
  autofillStarCorridorSquad,
  toggleStarCorridorSquadMon,
  rotateOrResetStarCorridorOrbit,
  evaluateCorridorSquadSynergy,
  estimateCorridorFloorPower,
  simulateStarCorridorTrial,
  canExchangeCorridorMedals,
  exchangeCorridorMedals,
} from "../systems/pve_tower.js";
import { getMonBoutiqueBonus, getMonPrimalImprintBonus } from "../systems/collection_fun.js";
import { normalizeMintTuning } from "../mons.js";
import { renderPveStageHtml, setHtmlPreservingStage } from "../render/tab_stages.js";
import { renderResSvg, renderUiIcon } from "../render/rpg_svg_icons.js";

// ponytail: blurbs live here — pve_defs is data-only, no chapter copy field yet
const PVE_CHAPTER_BLURBS = {
  "1": "原野巡礼八连试炼：草/岩/水/电/暗/火轮转，循序渐进熟悉属性克制。",
  "2": "林野进阶挑战：风/暗/岩/幻轮番上阵，终盘幻系需要克制与练度。",
  "3": "沙海巡礼：草岩火水起步，终盘暗系需光系压制。",
  "4": "峰顶巡礼：岩→草→风加压，终盘幻系需幻系对轰与高练度。",
};

const PVE_STAR_NARRATIVE = {
  3: "三星征服：对手再无还手之力，可冲击下一章。",
  2: "两星通关：胜利有余，仍可打磨克制拿满星。",
  1: "一星险胜：下次带上推荐属性与更高练度更稳。",
  loss: "失利也是情报：先看推荐属性、关卡建议等级与物特分路。",
};

const PVE_STAGE_HINTS = {
  "1-1": "首关教学：火系克制草系；先训练到 Lv.3+ 更稳。",
  "1-2": "碎石岩场：电系有优势，注意石长长耐久。",
  "1-3": "潮汐浅湾：草系优先；宝星辉特攻偏高。",
  "2-1": "风语高台：电系克制风系；对手等级低，适合练手。",
  "2-4": "幽影古塔：光系克制暗系；耿胖胖高星需克制与练度。",
  "2-8": "龙眠深窟终盘：幻系互克；胖胖龙高星，建议满编再挑战。",
};

export function createRenderPve({
  elPveList,
  ui,
  clamp,
  escapeHtml,
  monPower,
  renderBeastIcon,
  getMonCurrentStats,
  getBeastDataByDex,
  markPveDirty,
  addLog,
  addRes,
  addExpToMon,
  render,
  getState,
  TYPE_ZH,
  dexCaughtUnique,
  onPveAttempt,
  onPveWin,
}) {
  function ensurePveState(state) {
    if (!state.pve || typeof state.pve !== "object") {
      state.pve = { progress: {}, dailyAttempts: 0, dailyResetDate: "", selectedIds: [] };
    }
    if (!state.pve.progress || typeof state.pve.progress !== "object") state.pve.progress = {};
    if (typeof state.pve.dailyAttempts !== "number") state.pve.dailyAttempts = 0;
    if (typeof state.pve.dailyResetDate !== "string") state.pve.dailyResetDate = "";
    if (!Array.isArray(state.pve.selectedIds)) state.pve.selectedIds = [];

    // 每日重置
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    if (state.pve.dailyResetDate !== todayStr) {
      state.pve.dailyAttempts = 0;
      state.pve.dailyResetDate = todayStr;
    }
  }

  function getMonTypes(m) {
    // 优先从本地属性表获取（同步、可靠）
    const localTypes = globalThis.BEAST_TYPES;
    if (localTypes && typeof localTypes === "object") {
      const lt = localTypes[m.dex];
      if (Array.isArray(lt) && lt.length > 0) return lt;
    }
    // fallback: 本地萌灵属性表
    const api = typeof getBeastDataByDex === "function" ? getBeastDataByDex(m.dex) : null;
    const types = Array.isArray(api?.types) ? api.types.slice(0, 2) : [];
    return types.filter((x) => typeof x === "string");
  }

  function selectedStageType() {
    const stageId = typeof ui.pveStage === "string" ? ui.pveStage : "";
    return getStageById(stageId)?.stage?.type ?? null;
  }

  return function renderPve() {
    if (!elPveList) return;
    if (ui.activeTab !== "pve") return;
    if (!ui.pveDirty) return;
    ui.pveDirty = false;

    const state = typeof getState === "function" ? getState() : null;
    if (!state) return;
    ensurePveState(state);

    const list = Array.isArray(state.mons?.list) ? state.mons.list : [];
    if ((!Array.isArray(state.pve.selectedIds) || state.pve.selectedIds.length === 0) && list.length > 0) {
      state.pve.selectedIds = list
        .slice()
        .sort((a, b) => monPower(b) - monPower(a))
        .slice(0, 3)
        .map((m) => m.id);
    }
    const progress = state.pve.progress;
    const dexCount = typeof dexCaughtUnique === "function" ? dexCaughtUnique() : 0;
    const typeMap = TYPE_ZH && typeof TYPE_ZH === "object" ? TYPE_ZH : {};
    const era = ensureEra(state);
    const eraDef = getEraDefById(era.id);

    const rows = [];

    const practiceOn = false;
    const practiceHalf = false;

    const tower = ensureTowerState(state);
    const towerDone = isTowerCleared(tower);
    const weatherAffix = getWeeklyTowerAffix(tower.week);
    const floorDef = getTowerFloor(tower.floor, tower.week);

    const selChapterPre = typeof ui.pveChapter === "string" ? ui.pveChapter : PVE_CHAPTERS[0]?.id ?? "";
    const chapterPre = PVE_CHAPTERS.find((c) => c.id === selChapterPre) ?? PVE_CHAPTERS[0];
    const selStagePre = typeof ui.pveStage === "string" ? ui.pveStage : "";
    const stageObjPre =
      (selStagePre && getStageById(selStagePre)?.stage) ||
      chapterPre?.stages?.find((st) => isStageUnlocked(st.id, progress) && !progress[st.id]) ||
      chapterPre?.stages?.[0] ||
      null;
    if ((!ui.pveStage || !chapterPre?.stages?.some((st) => st.id === ui.pveStage)) && stageObjPre?.id) {
      ui.pveStage = stageObjPre.id;
    }
    const selTeamIdsPre = Array.isArray(state.pve.selectedIds) ? state.pve.selectedIds : [];
    const teamMonsPre =
      selTeamIdsPre.length > 0
        ? selTeamIdsPre.map((id) => list.find((m) => m && m.id === id)).filter(Boolean)
        : list.slice().sort((a, b) => monPower(b) - monPower(a)).slice(0, 3);

    rows.unshift(
      renderPveStageHtml({
        chapter: chapterPre,
        stage: stageObjPre,
        teamMons: teamMonsPre,
        tower,
        towerDone,
        weatherAffix,
        TYPE_ZH: typeMap,
        renderBeastIcon,
        monPower,
        estimateStageEnemyPower,
        recommendedTypes,
        escapeHtml,
      }),
    );

    // ML-8 「双系星轨回廊无尽试炼」 (Dual-Element Star-Rail Corridor Endless Trial)
    let corridorPickerModalHtml = "";
    {
      const sc = ensureStarCorridorState(state);
      if (sc.squadIds.length === 0 && list.length > 0) {
        autofillStarCorridorSquad(state, getMonTypes, monPower);
      }
      const corridorBonus = computeStarCorridorBonus(state);
      const curCorridorFloorDef = getStarCorridorFloorDef(sc.currentFloor, sc.rotationOffset);
      const corridorSquadMons = sc.squadIds
        .map((id) => list.find((m) => m && m.id === id) || null)
        .filter(Boolean);
      const corridorSynergy = evaluateCorridorSquadSynergy(state, corridorSquadMons, curCorridorFloorDef, {
        getMonTypes,
        getBeastDataByDex,
      });
      const medalStock = Math.max(0, Math.floor(Number(state.res?.corridorStarMedals?.value) || 0));
      const amberStock = Math.max(0, Math.floor(Number(state.res?.ancientGeneAmber?.value) || 0));

      const corridorRoles = ["星轨主锋", "双极副将", "破阵奇兵", "镇枢王牌"];
      const corridorBenchHtml = [0, 1, 2, 3]
        .map((slotIdx) => {
          const m = corridorSquadMons[slotIdx] || null;
          if (!m) {
            return `
              <div class="league-squad-slot is-empty">
                <div class="row__title row__titleLine"><span class="tag">${corridorRoles[slotIdx]}</span><span>待选派伙伴</span></div>
                <div class="row__desc" style="margin-top:4px">点击右上「编排四灵」或「一键优选四灵」上阵</div>
              </div>`;
          }
          const tBadges = getMonTypes(m)
            .map((t) => `<span class="badge type type-${escapeHtml(t)}">${escapeHtml(typeMap[t] || t)}</span>`)
            .join("");
          const bq = getMonBoutiqueBonus(state, m.id);
          const imp = getMonPrimalImprintBonus(state, m.id);
          const ribbons = Math.max(0, Math.floor(Number(m.hallOfFameRibbons) || 0));
          return `
            <div class="league-squad-slot">
              <div class="row__title row__titleLine">
                <span class="tag">${corridorRoles[slotIdx]}</span>
                ${renderBeastIcon(m.dex, m.name, Boolean(m.isShiny))}
                <span>${escapeHtml(m.name)}</span>
                <span class="tag">Lv.${m.lvl || 1}</span>
                ${imp.imprinted ? `<span class="tag tag--amber-stock">${renderUiIcon(imp.imprintIcon || "amberRevivalPod", 13)}<span>Lv.${imp.imprintLevel}</span></span>` : ""}
                ${ribbons > 0 ? `<span class="tag tag--hof-ribbon">${renderUiIcon("leagueChampionRibbon", 13)}<span>×${ribbons}</span></span>` : ""}
              </div>
              <div class="row__desc" style="margin-top:4px">${tBadges} 战力 ${Math.floor(monPower(m))}${imp.imprinted ? ` · 印记+${Math.round(imp.combatAdd * 100)}%` : ""}${bq.styled ? ` · 配饰+${Math.round(bq.combatAdd * 100)}%` : ""}${normalizeMintTuning(m.mintTuning) ? " · 已调律" : ""}</div>
            </div>`;
        })
        .join("");

      const previewFloors = [sc.currentFloor, sc.currentFloor + 1, sc.currentFloor + 2];
      const corridorFloorsHtml = previewFloors
        .map((fNum, idx) => {
          const fDef = getStarCorridorFloorDef(fNum, sc.rotationOffset);
          const cInfo = sc.clearedFloors[String(fNum)] || null;
          const isCurrent = idx === 0;
          const bossIcons = fDef.enemies.map((e) => renderBeastIcon(e.dex, e.name, false)).join("");
          const dualLabels = fDef.dualElements.map((el) => typeMap[el] || el).join(" / ");
          const recLabels = fDef.recTypes.map((el) => typeMap[el] || el).join("、");
          const rw = cInfo ? fDef.repeatRewards : fDef.firstRewards;
          return `
            <div class="corridor-floor-node ${isCurrent ? "is-active" : ""} ${cInfo ? "is-cleared" : ""} ${fDef.isMilestone ? "is-milestone" : ""}">
              <div>
                <div class="row__title row__titleLine">
                  ${renderUiIcon(fDef.isMilestone ? "corridorStarCrest" : "starCorridorGate", 16)}
                  <span>第 ${fNum} 重 · ${escapeHtml(fDef.orbitShortName)}</span>
                  <span class="tag">${escapeHtml(dualLabels)}</span>
                </div>
                <div class="row__desc" style="margin-top:2px">推荐破阵：${escapeHtml(recLabels)} · 推荐战力 ${estimateCorridorFloorPower(fDef)}</div>
                <div class="league-stage-node__icons" style="margin-top:4px">${bossIcons}</div>
              </div>
              <div>
                <div class="row__desc">${cInfo ? "复刷" : "首通"}：勋章+${rw.corridorStarMedals} · 远古琥珀+${rw.ancientGeneAmber}</div>
                <div style="margin-top:4px">
                  ${
                    cInfo
                      ? `<span class="badge badge--ok">已破阵 · ${cInfo.stars}星</span>`
                      : isCurrent
                        ? `<span class="tag">当前主攻重数</span>`
                        : `<span class="tag">连战递进层</span>`
                  }
                </div>
              </div>
            </div>`;
        })
        .join("");

      const corridorExchangeHtml = STAR_CORRIDOR_EXCHANGES.map((ex) => {
        const canEx = canExchangeCorridorMedals(state, ex.id);
        return `<button type="button" class="btn btn--small ${canEx ? "btn--primary" : ""}" data-pve-corridor-exchange="${escapeHtml(ex.id)}" ${canEx ? "" : "disabled"} title="${escapeHtml(ex.desc)}">${renderResSvg(ex.rid, 13)}<span>${escapeHtml(ex.label)}（-${ex.costMedals}勋章）</span></button>`;
      }).join("");

      const latestCorridorRec = sc.records[0] || null;
      const corridorWallText = latestCorridorRec
        ? `最新星轨战报：突破至星轨回廊第 ${sc.highestFloorCleared} 重（阶位 Tier ${corridorBonus.corridorTier}/${STAR_CORRIDOR_MAX_TIER} · ${latestCorridorRec.orbitName}） · 出战阵容：${latestCorridorRec.squadNames.join(" · ")}`
        : "攀登双属性轮转的「星轨回廊第 1..N 重」（第 1/3/5/8/10 重晋升永久回廊阶位 Tier 1~5），联动羁绊、薄荷调律、露营料理、星辉配饰与太古血脉印记五维共鸣，赢取星轨回廊勋章与远古基因琥珀！";

      rows.push(`
        <div class="row star-corridor-card">
          <div class="row__left" style="width:100%">
            <div class="dual-sanctum-head">
              <div class="row__title row__titleLine">
                ${renderUiIcon("starCorridorGate", 20)}
                <span>双系星轨回廊无尽试炼 · 五维共鸣挑战</span>
                <span class="tag tag--corridor-medal">${renderUiIcon("corridorStarCrest", 14)}<span>回廊阶位 Tier ${corridorBonus.corridorTier}/${STAR_CORRIDOR_MAX_TIER}</span></span>
                <span class="tag">第 ${sc.currentFloor} 重（最高通关第 ${sc.highestFloorCleared} 重）</span>
                <span class="tag tag--corridor-medal">${renderResSvg("corridorStarMedals", 13)}<span>回廊勋章 ×${medalStock}</span></span>
                <span class="tag tag--amber-stock">${renderResSvg("ancientGeneAmber", 13)}<span>远古琥珀 ×${amberStock}</span></span>
              </div>
              <div class="corridor-header__btns">
                <button type="button" class="btn btn--small" data-pve-corridor-auto="1" ${list.length > 0 ? "" : "disabled"}>一键优选四灵</button>
                <button type="button" class="btn btn--small" data-pve-corridor-open-modal="1" ${list.length > 0 ? "" : "disabled"}>编排四灵 (${corridorSquadMons.length}/${STAR_CORRIDOR_SQUAD_SIZE})</button>
                <button type="button" class="btn btn--small btn--ghost" data-pve-corridor-rotate="1" title="轮换双系星轨相位并调整克制窗口">轮转双系星轨</button>
                <button type="button" class="btn btn--small" data-pve-corridor-fight="single" ${corridorSquadMons.length > 0 ? "" : "disabled"}>逐重挑战（第 ${sc.currentFloor} 重）</button>
                <button type="button" class="btn btn--primary btn--small" data-pve-corridor-fight="surge" ${corridorSquadMons.length > 0 ? "" : "disabled"}>五重连战冲层（第 ${sc.currentFloor}~${sc.currentFloor + STAR_CORRIDOR_SURGE_STEPS - 1} 重）</button>
              </div>
            </div>

            <div class="eco-aura-strip" style="margin-top:6px">
              <span class="shiny-aura-pill ${corridorSynergy.totalOutAdd > 0 ? "is-on" : ""}">五维总增伤 +${Math.round(corridorSynergy.totalOutAdd * 100)}%（羁绊+${Math.round(corridorSynergy.bondOutAdd * 100)}% / 调律+${Math.round(corridorSynergy.tuningOutAdd * 100)}% / 盛宴+${Math.round(corridorSynergy.campOutAdd * 100)}% / 配饰+${Math.round(corridorSynergy.boutiqueOutAdd * 100)}% / 太古印记+${Math.round(corridorSynergy.amberOutAdd * 100)}% · 双轨破阵+${Math.round(corridorSynergy.orbitOutAdd * 100)}%）</span>
              <span class="shiny-aura-pill ${corridorBonus.corridorTier > 0 ? "is-on" : ""}">回廊全局：全产 +${Math.round(corridorBonus.prodAdd * 1000) / 10}% · 捕获 +${Math.round(corridorBonus.catchAdd * 1000) / 10}% · 闪光 +${Math.round(corridorBonus.shinyAdd * 100)}% · 潜能训练 +${Math.round(corridorBonus.ivTrainAdd * 100)}% · 增伤 +${Math.round(corridorBonus.pveOutAdd * 1000) / 10}%</span>
            </div>

            <div class="corridor-squad-bench">${corridorBenchHtml}</div>
            <div class="corridor-floors-track">${corridorFloorsHtml}</div>
            <div class="corridor-exchange-bar">
              <span class="tag tag--corridor-medal">${renderUiIcon("corridorStarCrest", 14)}<span>星轨勋章补给所</span></span>
              ${corridorExchangeHtml}
            </div>
            <div class="league-hof-wall">${escapeHtml(corridorWallText)}</div>
          </div>
        </div>
      `);

      if (ui.pveCorridorModalOpen) {
        const sortedMons = list
          .filter(Boolean)
          .slice()
          .sort((a, b) => {
            const aIn = sc.squadIds.includes(a.id) ? 1 : 0;
            const bIn = sc.squadIds.includes(b.id) ? 1 : 0;
            if (aIn !== bIn) return bIn - aIn;
            return monPower(b) - monPower(a);
          });
        const modalRowsHtml = sortedMons
          .map((m) => {
            const checked = sc.squadIds.includes(m.id);
            const disabled = !checked && sc.squadIds.length >= STAR_CORRIDOR_SQUAD_SIZE;
            const tStr = getMonTypes(m).map((t) => typeMap[t] || t).join("/") || "-";
            const bq = getMonBoutiqueBonus(state, m.id);
            const imp = getMonPrimalImprintBonus(state, m.id);
            return `
              <div class="row func-mon-row ${checked ? "is-active" : ""}">
                <div class="row__left">
                  <div class="row__title row__titleLine">
                    ${renderBeastIcon(m.dex, m.name, Boolean(m.isShiny))}
                    <span>${escapeHtml(m.name)}</span>
                    <span class="tag">Lv.${m.lvl || 1}</span>
                    ${imp.imprinted ? `<span class="tag tag--amber-stock">${escapeHtml(imp.imprintName)} Lv.${imp.imprintLevel}</span>` : ""}
                  </div>
                  <div class="row__desc">${escapeHtml(tStr)} · 战力 ${Math.floor(monPower(m))}${imp.imprinted ? ` · 太古印记 +${Math.round(imp.combatAdd * 100)}%` : ""}${bq.styled ? ` · 配饰 +${Math.round(bq.combatAdd * 100)}%` : ""}</div>
                </div>
                <div class="row__right">
                  <input class="chk" type="checkbox" data-pve-corridor-check="${m.id}" ${checked ? "checked" : ""} ${disabled ? "disabled" : ""} />
                </div>
              </div>`;
          })
          .join("");

        corridorPickerModalHtml = `
          <div class="modalOverlay" data-pve-corridor-modal-overlay="1">
            <div class="modal">
              <div class="modal__header">
                <div class="modal__title">
                  ${renderUiIcon("starCorridorGate", 20)}
                  <span>编排双系星轨回廊四灵阵容</span>
                  <span class="tag">已选 ${sc.squadIds.length}/${STAR_CORRIDOR_SQUAD_SIZE}</span>
                </div>
                <div class="modal__right">
                  <button type="button" class="btn btn--small" data-pve-corridor-auto="1">一键优选</button>
                  <button type="button" class="btn btn--small" data-pve-corridor-modal-close="1">关闭</button>
                </div>
              </div>
              <div class="modal__body">${modalRowsHtml || '<div class="badge badge--muted">暂无可选伙伴</div>'}</div>
              <div class="actions">
                <button type="button" class="btn btn--primary" data-pve-corridor-modal-close="1">完成回廊编队</button>
              </div>
            </div>
          </div>`;
      }
    }

    // 星穹无尽试炼塔 + 每周天象场地词缀 + 赛季军需兑换
    if (floorDef) {
      const towerUnlocked = dexCount >= 10;
      const endlessActive = isEndlessTowerUnlocked(tower) || Boolean(floorDef.isEndless);
      const selectedMonsTower = selTeamIdsPre.slice(0, 6).map((id) => list.find((m) => m && m.id === id)).filter(Boolean);
      const wxResonant = countWeatherResonantMons(selectedMonsTower, getMonTypes, weatherAffix);
      const wxBoostLabels = (weatherAffix?.boostTypes || []).map((t) => `${typeMap[t] ?? t}系`).join(" / ");
      const towerRecTypes = recommendedTypes(floorDef.type);
      const towerRecText = towerRecTypes.map((t) => typeMap[t] ?? t).join("、") || "自由搭配";
      const floorTypeZh = typeMap[floorDef.type] ?? floorDef.type;
      const floorRw = floorDef.rewards || {};
      const rwPreviewParts = [];
      if (floorRw.futurecoin) rwPreviewParts.push(`未来币 +${floorRw.futurecoin}`);
      if (floorRw.evolutionStone) rwPreviewParts.push(`灵晶石 +${floorRw.evolutionStone}`);
      if (floorRw.rareCandy) rwPreviewParts.push(`跃级糖丸 +${floorRw.rareCandy}`);
      if (floorRw.seasonMark) rwPreviewParts.push(`赛季印记 +${floorRw.seasonMark}`);
      if (floorRw.linkRope) rwPreviewParts.push(`灵契绳 +${floorRw.linkRope}`);
      if (floorRw.exp) rwPreviewParts.push(`经验 +${floorRw.exp}`);
      const nextMile = getNextTowerMilestone(floorDef.floor, tower.week);
      const mileRw = nextMile?.rewards || {};
      const mileSummary = nextMile
        ? `${nextMile.floor}F 里程碑：灵晶石 +${mileRw.evolutionStone || 1} · 跃级糖丸 +${mileRw.rareCandy || 1} · 赛季印记 +${mileRw.seasonMark || 1}${mileRw.linkRope ? ` · 灵契绳 +${mileRw.linkRope}` : ""}`
        : "";
      const canTowerFight = towerUnlocked && selectedMonsTower.length > 0;
      const towerBtnLabel = !towerUnlocked
        ? `需 10 图鉴（${dexCount}/10）`
        : !selectedMonsTower.length
          ? "请先编队"
          : `挑战 ${floorDef.floor}F`;
      const seasonMarkOwned = Math.max(0, Math.floor(state.res?.seasonMark?.value ?? 0));
      const exchangeBtnsHtml = TOWER_SEASON_EXCHANGES.map((ex) => {
        const affordable = seasonMarkOwned >= ex.cost;
        return `<button type="button" class="btn btn--small" data-tower-exchange="${escapeHtml(ex.id)}" ${affordable ? "" : "disabled"} title="消耗 ${ex.cost} 枚赛季印记兑换 ${escapeHtml(ex.label)}">${escapeHtml(ex.label)}（${ex.cost}印记）</button>`;
      }).join("");
      const towerEnemyIcons = floorDef.enemies.slice(0, 3).map((e) => renderBeastIcon(e.dex, e.name)).join("");

      rows.push(`
        <div class="row pve-tower-card">
          <div class="row__left">
            <div class="row__title row__titleLine">
              ${renderResSvg("towerWeather", 20)}
              <span>星穹无尽试炼塔</span>
              <span class="tag pve-tower-floor-tag">${endlessActive && floorDef.floor > 8 ? `无尽 ${floorDef.floor}F` : `经典 ${floorDef.floor}/8F`}</span>
              <span class="tag pve-tower-wx-tag">天象 · ${escapeHtml(weatherAffix?.name || "晴空")}</span>
              <span class="tag">周最佳 ${tower.best || 0}F${(tower.allTimeBest || 0) > (tower.best || 0) ? ` · 历史 ${tower.allTimeBest}F` : ""}</span>
            </div>
            <div class="pve-tower-pills">
              <span class="pve-tower-pill is-wx">${escapeHtml(weatherAffix?.desc || "")}（增益：${escapeHtml(wxBoostLabels)}）</span>
              <span class="pve-tower-pill ${wxResonant > 0 ? "is-resonant" : ""}">天象共鸣队员 ${wxResonant}/${selectedMonsTower.length || 0}</span>
              ${mileSummary ? `<span class="pve-tower-pill is-mile">${escapeHtml(mileSummary)}</span>` : ""}
            </div>
            <div class="row__desc pve-tower-floor-line">
              ${towerEnemyIcons}
              <span>当前守层：<strong>${escapeHtml(floorDef.name)}</strong>（${escapeHtml(floorTypeZh)}系 · 推荐克制：${escapeHtml(towerRecText)}） · 守卫：${floorDef.enemies.map((e) => `${escapeHtml(e.name)} Lv.${e.lvl}${e.stars ? ` ★${e.stars}` : ""}`).join("、")}</span>
            </div>
            <div class="row__desc muted">本层通关掉落：${escapeHtml(rwPreviewParts.join("、") || "未来币与经验")}（不消耗每日主线挑战次数，突破 8F 解锁无限轮换层）</div>
            <div class="pve-tower-exchange-bar">
              <span class="pve-tower-exchange-label">${renderResSvg("seasonMark", 16)} <span>赛季军需库</span> <span class="tag">赛季印记 ${seasonMarkOwned}</span></span>
              <div class="pve-tower-exchange-actions">${exchangeBtnsHtml}</div>
            </div>
          </div>
          <div class="row__right pve-tower-actions">
            <button type="button" class="btn btn--small" data-pve-tower-auto ${list.length > 0 ? "" : "disabled"} title="按守层属性克制 + 本周天象共鸣自动编入最多 6 只萌灵">天象克制编队</button>
            <button type="button" class="btn btn--primary btn--small" data-pve-tower-fight ${canTowerFight ? "" : "disabled"}>${escapeHtml(towerBtnLabel)}</button>
          </div>
        </div>
      `);
    }

    // ML-4 「双打圣殿试炼」 (Dual-Pet Sanctum Challenge Trials)
    let dualPickerModalHtml = "";
    {
      const dualState = ensureDualSanctumState(state);
      if ((!dualState.primaryId || !dualState.partnerId) && list.length >= 2) {
        autofillDualSanctumDuo(state, dualState.selectedTrialId, getMonTypes, monPower);
      }
      const primaryMon = dualState.primaryId ? list.find((m) => m && m.id === dualState.primaryId) || null : null;
      const partnerMon = dualState.partnerId ? list.find((m) => m && m.id === dualState.partnerId && m.id !== primaryMon?.id) || null : null;
      const pTypes = primaryMon ? getMonTypes(primaryMon) : [];
      const sTypes = partnerMon ? getMonTypes(partnerMon) : [];
      const duoSynergy = evaluateDuoSynergy(pTypes, sTypes, state);
      const badgeBonus = computeDualSanctumBadgeBonus(state);
      const selTrial = getDualSanctumTrial(dualState.selectedTrialId) || DUAL_SANCTUM_TRIALS[0];
      const selTrialUnlocked = isDualSanctumTrialUnlocked(selTrial.id, dualState);
      const selTrialCleared = dualState.cleared[selTrial.id] || null;

      const badgeSlotsHtml = DUAL_SANCTUM_TRIALS.map((tr) => {
        const earned = dualState.badges.includes(tr.badgeId);
        return `
          <div class="dual-badge-slot ${earned ? "is-earned" : ""}" title="${escapeHtml(tr.name)} · ${escapeHtml(tr.badgeName)}">
            ${renderResSvg("sanctumBadge", 18)}
            <span class="dual-badge-slot__name">${escapeHtml(tr.badgeName)}</span>
          </div>`;
      }).join("");

      const dualMilestonesHtml = DUAL_SANCTUM_MILESTONES.map((ms) => {
        const unlocked = badgeBonus.badgeCount >= ms.reqBadges;
        const claimed = Boolean(dualState.claimedMilestones[ms.id]);
        const rwSummary = Object.entries(ms.rewards)
          .map(([k, v]) => {
            if (k === "futurecoin") return `未来币+${v}`;
            if (k === "rareCandy") return `跃级糖丸+${v}`;
            if (k === "evolutionStone") return `灵晶石+${v}`;
            if (k === "linkRope") return `灵契绳+${v}`;
            if (k === "megaStone") return `觉醒石+${v}`;
            if (k === "goldBottleCap") return `金桂冠+${v}`;
            if (k === "shinyCharm") return `虹彩护符+${v}`;
            if (k === "seasonMark") return `赛季印记+${v}`;
            return `${k}+${v}`;
          })
          .join("、");
        if (unlocked && !claimed) {
          return `<button type="button" class="btn btn--small btn--primary" data-dual-claim-mile="${escapeHtml(ms.id)}">领取 ${escapeHtml(ms.label)}（${escapeHtml(rwSummary)}）</button>`;
        }
        return `<span class="pve-tower-pill ${claimed ? "is-resonant" : ""}">${escapeHtml(ms.label)} · ${claimed ? "已领取" : escapeHtml(rwSummary)}</span>`;
      }).join("");

      const renderDuoSlot = (roleLabel, slotKey, mon, typesArr) => {
        if (!mon) {
          return `
            <div class="dual-duo-slot is-empty">
              <div class="dual-duo-slot__head">
                <span class="tag">${escapeHtml(roleLabel)}</span>
                <button type="button" class="btn btn--small" data-dual-pick-slot="${escapeHtml(slotKey)}" ${list.length > 0 ? "" : "disabled"}>点选上阵</button>
              </div>
              <div class="dual-duo-slot__empty">待选派${escapeHtml(roleLabel)}萌灵（需拥有至少 2 只伙伴）</div>
            </div>`;
        }
        const tLabels = typesArr.map((t) => `<span class="badge type type-${escapeHtml(t)}">${escapeHtml(typeMap[t] || t)}</span>`).join("");
        return `
          <div class="dual-duo-slot is-filled">
            <div class="dual-duo-slot__head">
              <span class="tag tag--dual-role">${escapeHtml(roleLabel)}</span>
              <button type="button" class="btn btn--small" data-dual-pick-slot="${escapeHtml(slotKey)}">更换</button>
            </div>
            <div class="dual-duo-slot__body">
              ${renderBeastIcon(mon.dex, mon.name, Boolean(mon.isShiny))}
              <div class="dual-duo-slot__info">
                <div class="dual-duo-slot__name">${escapeHtml(mon.name)} <span class="tag">Lv.${mon.lvl || 1}</span>${(mon.stars || 0) > 0 ? `<span class="tag">${mon.stars}星</span>` : ""}</div>
                <div class="dual-duo-slot__meta">${tLabels}<span>战力 ${Math.floor(monPower(mon))}</span></div>
              </div>
            </div>
          </div>`;
      };

      const trialCardsHtml = DUAL_SANCTUM_TRIALS.map((tr) => {
        const unlocked = isDualSanctumTrialUnlocked(tr.id, dualState);
        const cInfo = dualState.cleared[tr.id] || null;
        const isSel = selTrial.id === tr.id;
        const bossIcons = tr.enemies.map((e) => renderBeastIcon(e.dex, e.name, false)).join("");
        const elemLabels = tr.elements.map((el) => typeMap[el] || el).join("+");
        return `
          <div class="dual-trial-item ${isSel ? "is-selected" : ""} ${unlocked ? "" : "is-locked"}">
            <div class="dual-trial-item__top">
              <div class="dual-trial-item__icons">${bossIcons}</div>
              <div class="dual-trial-item__titleWrap">
                <div class="dual-trial-item__name">${tr.order}. ${escapeHtml(tr.name)}</div>
                <div class="dual-trial-item__sub">${escapeHtml(tr.masterTitle)}（${escapeHtml(elemLabels)}）</div>
              </div>
            </div>
            <div class="dual-trial-item__foot">
              ${
                cInfo
                  ? `<span class="badge badge--ok">已夺徽章 · ${cInfo.stars}星</span>`
                  : unlocked
                    ? `<span class="tag">首通授勋</span>`
                    : `<span class="tag">通关前殿解锁</span>`
              }
              <button type="button" class="btn btn--small ${isSel ? "btn--primary" : ""}" data-dual-select-trial="${escapeHtml(tr.id)}" ${unlocked ? "" : "disabled"}>
                ${isSel ? "当前选定" : "选定"}
              </button>
            </div>
          </div>`;
      }).join("");

      const activeRw = selTrialCleared ? selTrial.repeatRewards : selTrial.rewards;
      const activeRwText = Object.entries(activeRw)
        .map(([k, v]) => {
          if (k === "futurecoin") return `未来币 +${v}`;
          if (k === "exp") return `经验 +${v}（双灵各得）`;
          if (k === "evolutionStone") return `灵晶石 +${v}`;
          if (k === "rareCandy") return `跃级糖丸 +${v}`;
          if (k === "linkRope") return `灵契绳 +${v}`;
          if (k === "megaStone") return `觉醒石 +${v}`;
          if (k === "seasonMark") return `赛季印记 +${v}`;
          return `${k} +${v}`;
        })
        .join("、");

      const canDualFight = Boolean(primaryMon && partnerMon && selTrialUnlocked);
      const dualFightLabel = list.length < 2
        ? "需拥有 2 只萌灵"
        : !primaryMon || !partnerMon
          ? "请选齐主副双灵"
          : !selTrialUnlocked
            ? "前殿通关后开启"
            : `挑战 · ${selTrial.name}`;

      rows.push(`
        <div class="row pve-dual-sanctum-card">
          <div class="row__left" style="width:100%">
            <div class="dual-sanctum-head">
              <div class="row__title row__titleLine">
                ${renderResSvg("dualSanctum", 20)}
                <span>双打圣殿挑战试炼 · 双灵连携演武</span>
                <span class="tag dual-sanctum-badge-tag">圣殿徽章 ${badgeBonus.badgeCount}/${badgeBonus.maxBadges}</span>
                ${badgeBonus.pveOutAdd > 0 ? `<span class="badge badge--ok">徽章全局增伤 +${Math.round(badgeBonus.pveOutAdd * 1000) / 10}%</span>` : ""}
              </div>
              <div class="dual-sanctum-actions">
                <button type="button" class="btn btn--small" data-dual-auto="1" ${list.length >= 2 ? "" : "disabled"}>共鸣最优双打编组</button>
                <button type="button" class="btn btn--small" data-dual-swap="1" ${primaryMon && partnerMon ? "" : "disabled"}>主副互换</button>
                <button type="button" class="btn btn--primary btn--small" data-dual-fight="${escapeHtml(selTrial.id)}" ${canDualFight ? "" : "disabled"}>${escapeHtml(dualFightLabel)}</button>
              </div>
            </div>
            <div class="dual-badge-rack">${badgeSlotsHtml}</div>
            <div class="pve-tower-pills">${dualMilestonesHtml}</div>
            <div class="dual-duo-bench">
              ${renderDuoSlot("主战先锋", "primary", primaryMon, pTypes)}
              ${renderDuoSlot("协战搭档", "partner", partnerMon, sTypes)}
            </div>
            <div class="dual-synergy-banner ${duoSynergy.resonant ? "is-resonant" : ""}">
              <div class="dual-synergy-banner__title">
                ${renderResSvg("duoCombo", 18)}
                <strong>${escapeHtml(duoSynergy.name)}</strong>
                <span class="tag">合体连携技《${escapeHtml(duoSynergy.comboSkill)}》</span>
              </div>
              <div class="dual-synergy-banner__desc">${escapeHtml(duoSynergy.desc)}</div>
            </div>
            <div class="dual-trials-grid">${trialCardsHtml}</div>
            <div class="row__desc muted" style="margin-top:8px">
              当前目标：<strong>${escapeHtml(selTrial.name)}</strong>（守殿双宗师：${selTrial.enemies.map((e) => `${escapeHtml(e.name)} Lv.${e.lvl}`).join(" ＆ ")}） · ${selTrialCleared ? "重复历练奖励" : `首通授勋【${escapeHtml(selTrial.badgeName)}】及奖励`}：${escapeHtml(activeRwText)}
            </div>
          </div>
        </div>
      `);

      if (ui.pveDualPickSlot === "primary" || ui.pveDualPickSlot === "partner") {
        const slot = ui.pveDualPickSlot;
        const otherMon = slot === "primary" ? partnerMon : primaryMon;
        const otherTypes = otherMon ? getMonTypes(otherMon) : [];
        const candidates = list
          .filter((m) => m && m.id !== otherMon?.id)
          .map((m) => {
            const mTypes = getMonTypes(m);
            const syn = otherTypes.length ? evaluateDuoSynergy(slot === "primary" ? mTypes : otherTypes, slot === "primary" ? otherTypes : mTypes) : null;
            const pwr = monPower(m);
            return { m, mTypes, syn, pwr, score: pwr * (syn?.outMul || 1) + (syn?.resonant ? 200 : 0) };
          })
          .sort((a, b) => b.score - a.score);

        const pickRowsHtml = candidates
          .map(({ m, mTypes, syn, pwr }) => {
            const isCur = (slot === "primary" && primaryMon?.id === m.id) || (slot === "partner" && partnerMon?.id === m.id);
            const typeStr = mTypes.map((t) => typeMap[t] || t).join("/") || "-";
            return `
              <div class="row func-mon-row ${isCur ? "is-active" : ""}">
                <div class="row__left">
                  <div class="row__title row__titleLine">
                    ${renderBeastIcon(m.dex, m.name, Boolean(m.isShiny))}
                    <span>${escapeHtml(m.name)}</span>
                    <span class="tag">Lv.${m.lvl || 1}</span>
                    ${syn?.resonant ? `<span class="badge badge--ok">${escapeHtml(syn.name)}</span>` : ""}
                  </div>
                  <div class="row__desc">${escapeHtml(typeStr)} · 战力 ${Math.floor(pwr)}${syn ? ` · 连携《${escapeHtml(syn.comboSkill)}》` : ""}</div>
                </div>
                <div class="row__right">
                  <button type="button" class="btn btn--small ${isCur ? "btn--primary" : ""}" data-dual-confirm-mon="${m.id}">
                    ${isCur ? "当前在席" : `设为${slot === "primary" ? "主战" : "协战"}`}
                  </button>
                </div>
              </div>`;
          })
          .join("");

        dualPickerModalHtml = `
          <div class="modalOverlay" data-dual-modal-overlay="1">
            <div class="modal">
              <div class="modal__header">
                <div class="modal__title">
                  ${renderResSvg("dualSanctum", 20)}
                  <span>选派双打${slot === "primary" ? "主战先锋" : "协战搭档"}</span>
                </div>
                <div class="modal__right">
                  <button type="button" class="btn btn--small" data-dual-modal-close="1">关闭</button>
                </div>
              </div>
              <div class="modal__body">${pickRowsHtml || '<div class="badge badge--muted">暂无可选伙伴</div>'}</div>
            </div>
          </div>`;
      }
    }

    // ML-7 「冠军联盟四天王殿堂赛」 (Champion League Elite Four & Grand Champion Gauntlet)
    let leaguePickerModalHtml = "";
    {
      const cl = ensureChampionLeagueState(state);
      if (cl.squadIds.length === 0 && list.length > 0) {
        autofillChampionLeagueSquad(state, getMonTypes, monPower);
      }
      const leagueBonus = computeChampionLeagueBonus(state);
      const squadMons = cl.squadIds
        .map((id) => list.find((m) => m && m.id === id) || null)
        .filter(Boolean);
      const leagueSynergy = evaluateLeagueSquadSynergy(state, squadMons, {
        getMonTypes,
        getBeastDataByDex,
      });
      const sandStock = Math.max(0, Math.floor(Number(state.res?.shinyStarSand?.value) || 0));

      const roleTitles = ["先锋主将", "中坚奇兵", "压阵王牌"];
      const leagueBenchHtml = [0, 1, 2]
        .map((slotIdx) => {
          const m = squadMons[slotIdx] || null;
          if (!m) {
            return `
              <div class="league-squad-slot is-empty">
                <div class="row__title row__titleLine"><span class="tag">${roleTitles[slotIdx]}</span><span>待选派伙伴</span></div>
                <div class="row__desc" style="margin-top:4px">点击右上「编排三灵」或「一键优选三灵」上阵</div>
              </div>`;
          }
          const tBadges = getMonTypes(m)
            .map((t) => `<span class="badge type type-${escapeHtml(t)}">${escapeHtml(typeMap[t] || t)}</span>`)
            .join("");
          const bq = getMonBoutiqueBonus(state, m.id);
          const ribbons = Math.max(0, Math.floor(Number(m.hallOfFameRibbons) || 0));
          return `
            <div class="league-squad-slot">
              <div class="row__title row__titleLine">
                <span class="tag">${roleTitles[slotIdx]}</span>
                ${renderBeastIcon(m.dex, m.name, Boolean(m.isShiny))}
                <span>${escapeHtml(m.name)}</span>
                <span class="tag">Lv.${m.lvl || 1}</span>
                ${ribbons > 0 ? `<span class="tag tag--hof-ribbon">${renderUiIcon("leagueChampionRibbon", 13)}<span>绶带×${ribbons}</span></span>` : ""}
              </div>
              <div class="row__desc" style="margin-top:4px">${tBadges} 战力 ${Math.floor(monPower(m))}${bq.styled ? ` · 配饰+${Math.round(bq.combatAdd * 100)}%` : ""}${normalizeMintTuning(m.mintTuning) ? " · 已调律" : ""}</div>
            </div>`;
        })
        .join("");

      const leagueStagesHtml = CHAMPION_LEAGUE_STAGES.map((stg, idx) => {
        const cInfo = cl.clearedStages[stg.id] || null;
        const isActive = cl.activeStageIdx === idx;
        const bossIcons = stg.enemies.map((e) => renderBeastIcon(e.dex, e.name, false)).join("");
        const elemLabels = stg.elements.map((el) => typeMap[el] || el).join("/");
        const rwSand = cInfo ? stg.repeatRewards.shinyStarSand : stg.firstRewards.shinyStarSand;
        return `
          <div class="league-stage-node ${isActive ? "is-active" : ""} ${cInfo ? "is-cleared" : ""} ${stg.isChampion ? "is-champion" : ""}">
            <div>
              <div class="row__title row__titleLine">
                ${renderUiIcon(stg.isChampion ? "leagueChampionRibbon" : "leagueEliteCrest", 16)}
                <span>${stg.order}. ${escapeHtml(stg.shortTitle)}</span>
              </div>
              <div class="row__desc" style="margin-top:2px">${escapeHtml(stg.masterTitle)}（${escapeHtml(elemLabels)}）</div>
              <div class="league-stage-node__icons" style="margin-top:4px">${bossIcons}</div>
            </div>
            <div>
              <div class="row__desc">推荐战力 ${estimateLeagueStagePower(stg)} · ${cInfo ? `重复星砂+${rwSand}` : `首通星砂+${rwSand}`}</div>
              <div style="margin-top:4px">
                ${
                  cInfo
                    ? `<span class="badge badge--ok">已攻克 · ${cInfo.stars}星</span>`
                    : isActive
                      ? `<span class="tag">当前驻殿</span>`
                      : `<span class="tag">待突破</span>`
                }
              </div>
            </div>
          </div>`;
      }).join("");

      const latestHof = cl.hallOfFameRecords[0] || null;
      const hofBannerText = latestHof
        ? `冠军殿堂荣誉留名（Tier ${latestHof.tier}/${CHAMPION_LEAGUE_MAX_TIER}）：${latestHof.squad.map((s) => `${s.name} Lv.${s.lvl}（绶带×${s.ribbons}）`).join(" · ")}`
        : "击败「炎狱天王 → 沧溟天王 → 翠岚天王 → 星穹天王 → 圣殿总冠军」五重强敌，即可为出征伙伴刻印【冠军殿堂绶带】并晋升全局殿堂阶位！";

      rows.push(`
        <div class="row champion-league-card">
          <div class="row__left" style="width:100%">
            <div class="dual-sanctum-head">
              <div class="row__title row__titleLine">
                ${renderUiIcon("leagueEliteCrest", 20)}
                <span>冠军联盟四天王殿堂赛 · 巅峰五连挑战</span>
                <span class="tag tag--hof-ribbon">${renderUiIcon("leagueChampionRibbon", 14)}<span>殿堂阶位 Tier ${leagueBonus.hallOfFameTier}/${CHAMPION_LEAGUE_MAX_TIER}</span></span>
                <span class="tag tag--sand-stock">${renderResSvg("shinyStarSand", 13)}<span>星砂 ×${sandStock}</span></span>
                ${leagueBonus.pveOutAdd > 0 ? `<span class="badge badge--ok">殿堂增伤 +${Math.round(leagueBonus.pveOutAdd * 100)}%</span>` : ""}
              </div>
              <div class="league-header__btns">
                <button type="button" class="btn btn--small" data-pve-league-auto="1" ${list.length > 0 ? "" : "disabled"}>一键优选三灵</button>
                <button type="button" class="btn btn--small" data-pve-league-open-modal="1" ${list.length > 0 ? "" : "disabled"}>编排三灵 (${squadMons.length}/${CHAMPION_LEAGUE_SQUAD_SIZE})</button>
                ${cl.activeStageIdx > 0 ? `<button type="button" class="btn btn--small btn--ghost" data-pve-league-reset="1">重置进度</button>` : ""}
                <button type="button" class="btn btn--small" data-pve-league-fight="single" ${squadMons.length > 0 ? "" : "disabled"}>逐殿挑战（第 ${cl.activeStageIdx + 1} 殿）</button>
                <button type="button" class="btn btn--primary btn--small" data-pve-league-fight="full" ${squadMons.length > 0 ? "" : "disabled"}>五连战冲击总冠军</button>
              </div>
            </div>

            <div class="eco-aura-strip" style="margin-top:6px">
              <span class="shiny-aura-pill ${leagueSynergy.totalOutAdd > 0 ? "is-on" : ""}">四维总增伤 +${Math.round(leagueSynergy.totalOutAdd * 100)}%（羁绊+${Math.round(leagueSynergy.bondOutAdd * 100)}% / 调律+${Math.round(leagueSynergy.tuningOutAdd * 100)}% / 盛宴+${Math.round(leagueSynergy.campOutAdd * 100)}% / 星辉配饰+${Math.round(leagueSynergy.boutiqueOutAdd * 100)}%）</span>
              <span class="shiny-aura-pill ${leagueBonus.hallOfFameTier > 0 ? "is-on" : ""}">殿堂全局：全产 +${Math.round(leagueBonus.prodAdd * 100)}% · 捕获 +${Math.round(leagueBonus.catchAdd * 1000) / 10}%</span>
            </div>

            <div class="league-squad-bench">${leagueBenchHtml}</div>
            <div class="league-stages-track">${leagueStagesHtml}</div>
            <div class="league-hof-wall">${escapeHtml(hofBannerText)}</div>
          </div>
        </div>
      `);

      if (ui.pveLeagueModalOpen) {
        const sortedMons = list
          .filter(Boolean)
          .slice()
          .sort((a, b) => {
            const aIn = cl.squadIds.includes(a.id) ? 1 : 0;
            const bIn = cl.squadIds.includes(b.id) ? 1 : 0;
            if (aIn !== bIn) return bIn - aIn;
            return monPower(b) - monPower(a);
          });
        const modalRowsHtml = sortedMons
          .map((m) => {
            const checked = cl.squadIds.includes(m.id);
            const disabled = !checked && cl.squadIds.length >= CHAMPION_LEAGUE_SQUAD_SIZE;
            const tStr = getMonTypes(m).map((t) => typeMap[t] || t).join("/") || "-";
            const bq = getMonBoutiqueBonus(state, m.id);
            const ribbons = Math.max(0, Math.floor(Number(m.hallOfFameRibbons) || 0));
            return `
              <div class="row func-mon-row ${checked ? "is-active" : ""}">
                <div class="row__left">
                  <div class="row__title row__titleLine">
                    ${renderBeastIcon(m.dex, m.name, Boolean(m.isShiny))}
                    <span>${escapeHtml(m.name)}</span>
                    <span class="tag">Lv.${m.lvl || 1}</span>
                    ${ribbons > 0 ? `<span class="tag tag--hof-ribbon">殿堂绶带×${ribbons}</span>` : ""}
                  </div>
                  <div class="row__desc">${escapeHtml(tStr)} · 战力 ${Math.floor(monPower(m))}${bq.styled ? ` · 星辉配饰 +${Math.round(bq.combatAdd * 100)}%` : ""}</div>
                </div>
                <div class="row__right">
                  <input class="chk" type="checkbox" data-pve-league-check="${m.id}" ${checked ? "checked" : ""} ${disabled ? "disabled" : ""} />
                </div>
              </div>`;
          })
          .join("");

        leaguePickerModalHtml = `
          <div class="modalOverlay" data-pve-league-modal-overlay="1">
            <div class="modal">
              <div class="modal__header">
                <div class="modal__title">
                  ${renderUiIcon("leagueEliteCrest", 20)}
                  <span>编排冠军联盟三灵阵容</span>
                  <span class="tag">已选 ${cl.squadIds.length}/${CHAMPION_LEAGUE_SQUAD_SIZE}</span>
                </div>
                <div class="modal__right">
                  <button type="button" class="btn btn--small" data-pve-league-auto="1">一键优选</button>
                  <button type="button" class="btn btn--small" data-pve-league-modal-close="1">关闭</button>
                </div>
              </div>
              <div class="modal__body">${modalRowsHtml || '<div class="badge badge--muted">暂无可选伙伴</div>'}</div>
              <div class="actions">
                <button type="button" class="btn btn--primary" data-pve-league-modal-close="1">完成冠军编队</button>
              </div>
            </div>
          </div>`;
      }
    }

    // 当前选中的章节/关卡
    const selChapter = typeof ui.pveChapter === "string" ? ui.pveChapter : PVE_CHAPTERS[0]?.id ?? "";
    const selStage = typeof ui.pveStage === "string" ? ui.pveStage : "";

    // 章节选择
    const chapterOptions = PVE_CHAPTERS.map((ch) => {
      const locked = dexCount < ch.unlockDex;
      return `<option value="${ch.id}" ${selChapter === ch.id ? "selected" : ""} ${locked ? "disabled" : ""}>${escapeHtml(ch.name)}${locked ? `（需${ch.unlockDex}图鉴）` : ""}</option>`;
    }).join("");

    const chapter = PVE_CHAPTERS.find((c) => c.id === selChapter) ?? PVE_CHAPTERS[0];
    const chapterBlurb = chapter ? (PVE_CHAPTER_BLURBS[chapter.id] || "") : "";
    const eraHintText = eraDef?.pveHint ? ` · ${eraDef.pveHint}` : "";

    rows.push(`
      <div class="row pve-chapter-bar">
        <div class="row__left">
          <div class="row__title row__titleLine">
            ${renderUiIcon("tab_pve", 18)}
            <span>${escapeHtml(chapter ? chapter.name : "PvE 关卡挑战")}</span>
            <span class="tag">今日剩余 ${Math.max(0, PVE_DAILY_MAX - state.pve.dailyAttempts)}/${PVE_DAILY_MAX}</span>
          </div>
          ${chapterBlurb ? `<div class="row__desc">${escapeHtml(chapterBlurb)}</div>` : ""}
          <div class="row__desc muted">自动编入最高战力萌灵，随时可调换队伍${escapeHtml(eraHintText)}</div>
        </div>
        <div class="row__right">
          <select class="input" data-pve-chapter>${chapterOptions}</select>
        </div>
      </div>
    `);

    if (!chapter) {
      setHtmlPreservingStage(elPveList, rows.join(""));
      bindEvents(elPveList, state);
      return;
    }

    const chapterLocked = dexCount < chapter.unlockDex;
    if (chapterLocked) {
      rows.push(`<div class="row is-locked"><div class="row__left"><div class="row__title">章节未解锁</div><div class="row__desc">需要图鉴登记 ${chapter.unlockDex} 种。</div></div></div>`);
    } else {
    // 关卡列表（2列网格）
    const stageCards = [];
    for (const st of chapter.stages) {
      const unlocked = isStageUnlocked(st.id, progress);
      const cleared = Boolean(progress[st.id]);
      const starsVal = typeof progress[`${st.id}_stars`] === "number" ? progress[`${st.id}_stars`] : 0;
      const starIcons = [1, 2, 3].map((i) => `<span style="color:${i <= starsVal ? "#f5c542" : "#666"}">★</span>`).join("");
      const typeZh = typeMap[st.type] ?? st.type;
      const selected = selStage === st.id;

      if (!unlocked) {
        stageCards.push(`
          <div class="row is-locked pve-stage-row">
            <div class="row__left">
              <div class="row__title row__titleLine"><span class="tag">未解锁</span><span>${escapeHtml(st.name)}</span></div>
              <div class="row__desc">通关 ${escapeHtml(st.unlockReq ?? "")} 后开启</div>
            </div>
          </div>
        `);
      } else {
        const enemyIcons = st.enemies.slice(0, 2).map((e) => renderBeastIcon(e.dex, e.name)).join("");
        stageCards.push(`
          <div class="row pve-stage-row ${selected ? "is-active" : ""}">
            <div class="row__left">
              <div class="row__title row__titleLine">${enemyIcons}<span>${escapeHtml(st.name)}</span> <span class="tag tag--type-${escapeHtml(st.type)}">${escapeHtml(typeZh)}系</span> ${cleared ? starIcons : ""}</div>
              <div class="row__desc">守关：${st.enemies.map((e) => `${escapeHtml(e.name)} Lv.${e.lvl}`).join("、")}</div>
            </div>
            <div class="row__right">
              <button class="btn btn--small ${selected ? "btn--primary" : ""}" data-pve-select="${st.id}">${selected ? "已选定" : "选定"}</button>
            </div>
          </div>
        `);
      }
    }
    rows.push(`<div class="pve-stages-grid">${stageCards.join("")}</div>`);

    // 选中关卡的详情 + 队伍选择 + 开战
    const stageInfo = selStage ? getStageById(selStage) : null;
    if (stageInfo && isStageUnlocked(selStage, progress)) {
      const st = stageInfo.stage;
      const cleared = Boolean(progress[st.id]);
      const recTypes = recommendedTypes(st.type);
      const recText = recTypes.map((t) => typeMap[t] ?? t).join("、") || "无";
      const enemyAvgLvl = Math.round(
        st.enemies.reduce((s, e) => s + (e.lvl || 1), 0) / Math.max(1, st.enemies.length)
      );
      const rewards = cleared ? (st.repeatRewards ?? st.rewards) : st.rewards;
      const rewardText = Object.entries(rewards).map(([k, v]) => {
        if (k === "exp") return `经验 +${v}（每只）`;
        if (k === "futurecoin") return `未来币 +${v}`;
        if (k === "evolutionEnergy") return `灵晶石 +${v}`;
        if (k === "evolutionStone") return `灵晶石 +${v}`;
        if (k === "linkRope") return `灵契绳 +${v}`;
        return `${k} +${v}`;
      }).join("、");

      rows.push(`<div class="sidebar__divider"></div>`);
      const enemyPower = estimateStageEnemyPower(st);
      const stageHint = PVE_STAGE_HINTS[st.id];
      const tutNote = st.id === "1-1" && !cleared ? " · 首关试炼加成" : "";
      rows.push(`
        <div class="row">
          <div class="row__left">
            <div class="row__title row__titleLine">${renderResSvg("futurecoin", 18)}<span>${cleared ? "重复挑战" : "首次通关"}奖励</span><span class="tag">推荐：${escapeHtml(recText)}</span></div>
            <div class="row__desc">${escapeHtml(rewardText)}</div>
            <div class="row__desc muted">敌人战力约 ${enemyPower} · 建议队伍 ${Math.floor(enemyPower * 0.65)}+ · 等级 ${enemyAvgLvl}+${tutNote}</div>
            ${stageHint ? `<div class="row__desc">${escapeHtml(stageHint)}</div>` : ""}
          </div>
        </div>
      `);

      // 队伍选择
      const selectedIds = state.pve.selectedIds.slice(0, 6);
      const selectedMons = selectedIds.map((id) => list.find((m) => m && m.id === id)).filter(Boolean);
      const teamPower = selectedMons.reduce((s, m) => s + monPower(m), 0);
      let matchSe = 0;
      let matchWeak = 0;
      let matchResist = 0;
      for (const m of selectedMons) {
        const ms = typeMatchScore(getMonTypes(m), st.type);
        if (ms.se) matchSe += 1;
        if (ms.weak) matchWeak += 1;
        if (ms.resist) matchResist += 1;
      }
      const matchDesc = selectedMons.length
        ? `克制 ${matchSe}/${selectedMons.length} · 抗性 ${matchResist} · 被克 ${matchWeak}`
        : "未选择队员";
      const matchWarn =
        matchWeak > matchSe && selectedMons.length > 0
          ? `<div class="row__desc" style="color:#f59e0b">编队偏被克，建议换推荐属性</div>`
          : "";

      const powerGap = teamPower < enemyPower * 0.5;
      const powerHint = powerGap
        ? `<div class="row__desc" style="color:#f59e0b">队伍战力偏低，建议训练或换克制属性</div>`
        : "";

      rows.push(`
        <div class="row">
          <div class="row__left">
            <div class="row__title row__titleLine">${renderUiIcon("tab_mons", 18)}<span>挑战队伍</span><span class="tag">已选 ${selectedMons.length}/6</span><span class="tag">战力 ${Math.floor(teamPower)}</span></div>
            <div class="row__desc">${escapeHtml(matchDesc)} · 建议战力 ${Math.floor(enemyPower * 0.65)}+</div>
            ${matchWarn}
            ${powerHint}
          </div>
          <div class="row__right">
            <button class="btn btn--small" data-pve-team-open>选择队员</button>
            <button class="btn btn--small" data-pve-team-clear>清空</button>
          </div>
        </div>
      `);

      // 开战按钮
      const dailyLeft = state.pve.dailyAttempts < PVE_DAILY_MAX;
      const canFight = selectedMons.length > 0 && (practiceOn || dailyLeft);
      const fightLabel = !selectedMons.length
        ? "请选择队员"
        : practiceOn
          ? practiceHalf
            ? "练习开战（半奖励）"
            : "练习开战（无奖励）"
          : dailyLeft
            ? "开战！"
            : "今日次数已用完 · 可开练习";
      rows.push(`
        <div class="row">
          <div class="row__left">
            <div class="row__title row__titleLine">${renderUiIcon("tab_pve", 18)}<span>开始挑战</span><span class="tag">${escapeHtml(st.name)}</span></div>
            <div class="row__desc">${
              practiceOn
                ? practiceHalf
                  ? "练习不扣次数；胜利给半奖励，且不改通关/星级进度。"
                  : "练习不扣每日次数，胜利无奖励，用来测阵容。"
                : "正式挑战消耗 1 次每日额度。"
            }</div>
          </div>
          <div class="row__right">
            <button class="btn btn--primary" data-pve-fight="${st.id}" ${canFight ? "" : "disabled"}>${fightLabel}</button>
          </div>
        </div>
      `);
    }
    }

    // 队伍选择弹窗
    let teamModalHtml = "";
    if (ui.pveTeamModalOpen) {
      const selectedIds = state.pve.selectedIds.slice(0, 6);
      const selSet = new Set(selectedIds);
      const stageType = selectedStageType();
      const candidates = list
        .filter((m) => m)
        .map((m) => {
          const types = getMonTypes(m);
          const match = typeMatchScore(types, stageType);
          return { m, power: monPower(m), types, match };
        })
        .sort((a, b) => b.match.score - a.match.score || b.power - a.power);

      const candidateRows = candidates.map(({ m, power, match }) => {
        const checked = selSet.has(m.id);
        const disabled = !checked && selectedIds.length >= 6;
        const types = getMonTypes(m).map((t) => typeMap[t] ?? t).join("/");
        const stats = typeof getMonCurrentStats === "function" ? getMonCurrentStats(m) : null;
        const lean = stats && (stats.spa ?? 0) >= (stats.atk ?? 0) ? "特" : "物";
        const tag = match.se && match.resist ? "克+抗" : match.se ? "克制" : match.resist ? "抗性" : match.weak ? "被克" : "普通";
        return `
          <div class="row func-mon-row">
            <div class="row__left">
              <div class="row__title row__titleLine">${renderBeastIcon(m.dex, m.name, Boolean(m.isShiny))}<span>${escapeHtml(m.name)}</span><span class="tag">Lv.${m.lvl}</span></div>
              <div class="row__desc">${escapeHtml(types || "-")} · ${lean} · ${tag} · 战力 ${Math.floor(power)}</div>
            </div>
            <div class="row__right">
              <input class="chk" type="checkbox" data-pve-team-check="${m.id}" ${checked ? "checked" : ""} ${disabled ? "disabled" : ""} />
            </div>
          </div>
        `;
      }).join("");

      teamModalHtml = `
        <div class="modalOverlay" data-pve-team-overlay="1">
          <div class="modal">
            <div class="modal__header">
              <div class="modal__title">${renderUiIcon("tab_pve", 20)}<span>选择挑战队伍</span><span class="tag">已选 ${selectedIds.length}/6</span></div>
              <div class="modal__right">
                <button class="btn btn--small" data-pve-team-auto>克制优先</button>
                <button class="btn btn--small" data-pve-team-clear>清空</button>
                <button class="btn btn--small" data-pve-team-close>关闭</button>
              </div>
            </div>
            <div class="modal__body">${candidateRows || '<div class="badge badge--muted">暂无萌灵</div>'}</div>
            <div class="actions">
              <button class="btn btn--primary" data-pve-team-close>完成编队</button>
            </div>
          </div>
        </div>
      `;
    }

    // 战斗结果弹窗
    let resultModalHtml = "";
    if (ui.pveBattleResult) {
      const r = ui.pveBattleResult;
      const starIcons = [1, 2, 3].map((i) => `<span style="color:${i <= r.stars ? "#f5c542" : "#666"};font-size:1.5em">★</span>`).join("");
      const logHtml = r.log
        .map((l) => {
          const isTurn = /^—\s*第\s*\d+\s*回合|^—\s*战斗/.test(l);
          const isKo = /倒下了|击败|胜利|全灭/.test(l);
          const isSe = /效果拔群|暴击/.test(l);
          const cls = isTurn
            ? "battle-log__line battle-log__line--turn"
            : isKo
              ? "battle-log__line battle-log__line--ko"
              : isSe
                ? "battle-log__line battle-log__line--se"
                : "battle-log__line";
          return `<div class="${cls}">${escapeHtml(l)}</div>`;
        })
        .join("");
      const stageTypeZh =
        Array.isArray(r.stageElements) && r.stageElements.length > 0
          ? r.stageElements.map((t) => typeMap[t] ?? t).join(" + ")
          : r.stageType
            ? (typeMap[r.stageType] ?? r.stageType)
            : "";
      const recText = Array.isArray(r.recTypes)
        ? r.recTypes.map((t) => typeMap[t] ?? t).join("、") || "无"
        : "";
      const typeTipHtml = stageTypeZh
        ? `<div class="row"><div class="row__left"><div class="row__title row__titleLine">${renderResSvg("megaStone", 18)}<span>属性提示</span><span class="tag">推荐：${escapeHtml(recText)}</span></div><div class="row__desc">关卡属性：${escapeHtml(stageTypeZh)} · 推荐克制属性：${escapeHtml(recText)}</div></div></div>`
        : "";

      let summaryHtml = "";
      let tipHtml = "";
      if (r.win) {
        const hpPct = Math.round((r.teamHpPct ?? 0) * 100);
        const winLine =
          r.endReason === "decision"
            ? `险胜（超时判定，剩余生命 ${hpPct}%）`
            : r.stars >= 3
              ? `完胜（${r.stars}星，剩余生命 ${hpPct}%）`
              : `胜利（${r.stars}星，剩余生命 ${hpPct}%）`;
        summaryHtml = `<div class="row"><div class="row__left"><div class="row__title row__titleLine">${renderResSvg("shinyCharm", 18)}<span>结果摘要</span><span class="tag">${r.stars}★ 评价</span></div><div class="row__desc hint hint--ok">${escapeHtml(winLine)}${typeof r.winStreak === "number" && r.winStreak > 0 ? ` · 连胜 ×${r.winStreak}` : ""}</div><div class="row__meta">${escapeHtml(PVE_STAR_NARRATIVE[r.stars] || PVE_STAR_NARRATIVE[1])}</div>${r.rewardText ? `<div class="row__desc">奖励：${escapeHtml(r.rewardText)}</div>` : ""}</div></div>`;
        if (r.endReason === "decision") {
          tipHtml = `<div class="row"><div class="row__left"><div class="row__title">提升建议</div><div class="row__desc">超时按剩余生命险胜。想稳定三星请再练级或换推荐属性。</div></div></div>`;
        } else if (r.stars < 3 && r.superEffectiveHits === 0) {
          tipHtml = `<div class="row"><div class="row__left"><div class="row__title">提升建议</div><div class="row__desc">胜利但克制不足，换推荐属性可拿更高星级。</div></div></div>`;
        }
      } else {
        const failReason =
          r.endReason === "timeout"
            ? "回合用尽：敌方剩余生命比例更高"
            : r.endReason === "wipe"
              ? "队伍全灭：敌人输出压过你的防线"
              : r.endReason === "empty"
                ? "未派出萌灵"
                : r.superEffectiveHits === 0
                  ? "全程无克制伤害：属性不对路"
                  : "练度不足：有克制但仍打不过";
        const fixTip =
          r.endReason === "timeout" || r.endReason === "wipe"
            ? "提高等级/星级，或换「能打又抗」的推荐属性。"
            : r.superEffectiveHits === 0
              ? `试试推荐属性：${escapeHtml(recText)}。`
              : "参考关卡建议等级，升星/喂糖果后再战。";
        summaryHtml = `<div class="row"><div class="row__left"><div class="row__title row__titleLine">${renderUiIcon("tab_pve", 18)}<span>失败原因</span></div><div class="row__desc hint hint--danger">${escapeHtml(failReason)}</div><div class="row__meta">${escapeHtml(PVE_STAR_NARRATIVE.loss)}</div><div class="row__desc">${fixTip}</div></div></div>`;
      }

      resultModalHtml = `
        <div class="modalOverlay" data-pve-result-overlay="1">
          <div class="modal">
            <div class="modal__header">
              <div class="modal__title">${renderUiIcon("tab_pve", 20)}<span>${r.win ? "挑战成功！" : "挑战失败"}</span> ${r.win ? starIcons : ""}</div>
              <div class="modal__right">
                <button class="btn btn--small" data-pve-result-close>关闭</button>
              </div>
            </div>
            <div class="modal__body">
              <div class="pve-result-block ${r.win ? "pve-result-block--win" : "pve-result-block--lose"}">
                ${summaryHtml}
                ${typeTipHtml}
                ${tipHtml}
              </div>
              <div class="row" style="padding:8px 12px">
                <div class="row__left"><div class="row__title row__titleLine">${renderResSvg("library", 16)}<span>战斗日志</span><span class="tag">共 ${r.rounds} 回合</span></div></div>
              </div>
              <div class="battle-log">${logHtml}</div>
              <div class="actions" style="margin-top:8px;justify-content:flex-end">
                <button class="btn btn--primary" data-pve-result-close>完成</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    setHtmlPreservingStage(
      elPveList,
      rows.join("") + teamModalHtml + dualPickerModalHtml + leaguePickerModalHtml + corridorPickerModalHtml + resultModalHtml,
    );
    bindEvents(elPveList, state);
  };

  function doFight(state, stageId) {
    ensurePveState(state);
    const info = getStageById(stageId);
    if (!info) return;
    const st = info.stage;
    const list = Array.isArray(state.mons?.list) ? state.mons.list : [];
    const selectedIds = state.pve.selectedIds.slice(0, 6);
    const selectedMons = selectedIds.map((id) => list.find((m) => m && m.id === id)).filter(Boolean);
    if (selectedMons.length === 0) return;

    const practice = Boolean(ui.pvePracticeMode);
    const practiceHalf = practice && Boolean(ui.pvePracticeHalf);
    // 正式挑战才扣次数；练习不扣
    if (!practice) state.pve.dailyAttempts++;

    // 准备玩家队伍数据
    const team = selectedMons.map((m) => {
      const stats0 = typeof getMonCurrentStats === "function" ? getMonCurrentStats(m) : { hp: 50, atk: 20, def: 20, spa: 20, spd: 20, spe: 20 };
      const hasMegaAura =
        typeof m.megaAuraRemainingSec === "number" && Number.isFinite(m.megaAuraRemainingSec) && m.megaAuraRemainingSec > 0;
      const stats = hasMegaAura
        ? Object.fromEntries(Object.entries(stats0).map(([k, v]) => [k, Math.max(1, Math.floor((typeof v === "number" ? v : 0) * 1.2))]))
        : stats0;
      return {
        id: m.id,
        name: m.name,
        types: getMonTypes(m),
        stats,
      };
    });

    const darkBoostOn =
      typeof state.skills?.darkPveDamageBoostRemainingSec === "number" &&
      Number.isFinite(state.skills.darkPveDamageBoostRemainingSec) &&
      state.skills.darkPveDamageBoostRemainingSec > 0;
    const clearedBefore = Boolean(state.pve.progress[st.id]);
    const tut = pveFightModifiers(st.id, clearedBefore);
    const badgeMul = computeDualSanctumBadgeBonus(state).pveOutMul;
    const result = simulateBattle(team, st.enemies, st.type, {
      playerDamageMul: (darkBoostOn ? 1.5 : 1) * tut.playerDamageMul * abilityOutgoingDamageMul(state) * badgeMul,
      incomingDamageMul: natureIncomingDamageMul(state) * tut.incomingDamageMul,
      enemyHpMul: tut.enemyHpMul,
    });
    result.stageType = st.type;
    result.stageName = st.name;
    result.recTypes = recommendedTypes(st.type);
    result.practice = practice;
    result.practiceHalf = practiceHalf;
    if (typeof onPveAttempt === "function" && !practice) onPveAttempt();

    function grantRewards(mulExtra, { ignoreStarBonus = false } = {}) {
      const cleared = Boolean(state.pve.progress[st.id]);
      const rewards = cleared ? (st.repeatRewards ?? st.rewards) : st.rewards;
      const starMul = ignoreStarBonus ? 1 : result.stars >= 3 ? 1.5 : 1;
      const mul = starMul * mulExtra;
      const rewardParts = [];

      if (rewards.futurecoin) {
        const v = Math.floor(rewards.futurecoin * mul);
        if (typeof addRes === "function") addRes("futurecoin", v);
        rewardParts.push(`未来币 +${v}`);
      }
      if (rewards.evolutionEnergy) {
        const v = Math.floor(rewards.evolutionEnergy * mul);
        if (typeof addRes === "function") addRes("evolutionStone", v);
        rewardParts.push(`灵晶石 +${v}`);
      }
      if (rewards.evolutionStone) {
        const v = Math.floor(rewards.evolutionStone * mul);
        if (typeof addRes === "function") addRes("evolutionStone", v);
        rewardParts.push(`灵晶石 +${v}`);
      }
      if (rewards.linkRope) {
        const v = Math.floor(rewards.linkRope * mul);
        if (typeof addRes === "function") addRes("linkRope", v);
        rewardParts.push(`灵契绳 +${v}`);
      }
      if (rewards.exp) {
        const v = Math.floor(rewards.exp * mul);
        for (const m of selectedMons) {
          if (typeof addExpToMon === "function") addExpToMon(m, v);
        }
        rewardParts.push(`经验 +${v}（每只）`);
      }
      return rewardParts.join("、");
    }

    if (practice && !practiceHalf) {
      result.rewardText = "练习模式：无奖励";
      result.winStreak = 0;
      if (typeof addLog === "function") {
        addLog(result.win ? `PvE 练习通关：${st.name}（${result.stars}星）` : `PvE 练习失败：${st.name}`);
      }
    } else if (practice && practiceHalf) {
      // 半奖励练习：不改通关进度，不扣次数
      if (result.win) {
        result.rewardText = grantRewards(0.5, { ignoreStarBonus: true }) || "半奖励：无";
        result.rewardText = `练习半奖：${result.rewardText}`;
        result.winStreak = 0;
        if (typeof addLog === "function") addLog(`PvE 练习半奖通关：${st.name}（${result.stars}星）`, true);
      } else {
        result.rewardText = "";
        result.winStreak = 0;
        if (typeof addLog === "function") addLog(`PvE 练习失败：${st.name}`);
      }
    } else if (result.win) {
      if (typeof onPveWin === "function") onPveWin();
      const bestStars = typeof state.pve.progress[`${st.id}_stars`] === "number" ? state.pve.progress[`${st.id}_stars`] : 0;
      state.pve.progress[st.id] = true;
      if (result.stars > bestStars) state.pve.progress[`${st.id}_stars`] = result.stars;

      if (!state.meta || typeof state.meta !== "object") state.meta = {};
      state.meta.pveWins = Math.max(0, Math.floor(state.meta.pveWins || 0)) + 1;
      bumpSessionPveWin(state);
      const firstWin = pveDailyFirstWinMul(state.meta, localDateStr());
      result.rewardText = grantRewards(firstWin.mul);
      if (firstWin.isFirst && result.rewardText) {
        result.rewardText = `首胜日加成×1.5：${result.rewardText}`;
      }
      const streakInfo = bumpPveWinStreak(state);
      result.winStreak = streakInfo.streak;
      if (streakInfo.milestone && typeof addLog === "function") {
        addLog(`★ ${streakInfo.milestone}`, true);
      }
      if (typeof addLog === "function") {
        addLog(`PvE 通关：${st.name}（${result.stars}星 · 连胜 ×${streakInfo.streak}${firstWin.isFirst ? " · 今日首胜" : ""}）`, true);
      }
      const goals = state.meta.dailyGoals;
      if (goals && typeof goals === "object") goals.pveDone = true;
    } else {
      resetPveWinStreak(state);
      result.rewardText = "";
      result.winStreak = 0;
      if (typeof addLog === "function") addLog(`PvE 失败：${st.name}（连胜中断）`);
    }

    ui.pveBattleResult = result;
    ui.pveDirty = true;
    if (typeof render === "function") render();
  }

  function doTowerFight(state) {
    ensurePveState(state);
    const tower = ensureTowerState(state);
    const floorDef = getTowerFloor(tower.floor, tower.week);
    if (!floorDef) return;
    const weatherAffix = getWeeklyTowerAffix(tower.week);
    const dexCount = typeof dexCaughtUnique === "function" ? dexCaughtUnique() : 0;
    if (dexCount < 10) return;

    const list = Array.isArray(state.mons?.list) ? state.mons.list : [];
    const selectedIds = state.pve.selectedIds.slice(0, 6);
    const selectedMons = selectedIds.map((id) => list.find((m) => m && m.id === id)).filter(Boolean);
    if (selectedMons.length === 0) return;

    const team = selectedMons.map((m) => {
      const stats0 = typeof getMonCurrentStats === "function" ? getMonCurrentStats(m) : { hp: 50, atk: 20, def: 20, spa: 20, spd: 20, spe: 20 };
      const hasMegaAura =
        typeof m.megaAuraRemainingSec === "number" && Number.isFinite(m.megaAuraRemainingSec) && m.megaAuraRemainingSec > 0;
      const stats = hasMegaAura
        ? Object.fromEntries(Object.entries(stats0).map(([k, v]) => [k, Math.max(1, Math.floor((typeof v === "number" ? v : 0) * 1.2))]))
        : stats0;
      return { id: m.id, name: m.name, types: getMonTypes(m), stats };
    });

    const darkBoostOn =
      typeof state.skills?.darkPveDamageBoostRemainingSec === "number" &&
      Number.isFinite(state.skills.darkPveDamageBoostRemainingSec) &&
      state.skills.darkPveDamageBoostRemainingSec > 0;
    const hpScale = floorDef.floor <= 8 ? 1 + (floorDef.floor - 1) * 0.05 : 1.35 + (floorDef.floor - 8) * 0.04;
    const badgeMul = computeDualSanctumBadgeBonus(state).pveOutMul;
    const result = simulateBattle(team, floorDef.enemies, floorDef.type, {
      playerDamageMul: (darkBoostOn ? 1.5 : 1) * abilityOutgoingDamageMul(state) * badgeMul,
      incomingDamageMul: natureIncomingDamageMul(state),
      enemyHpMul: hpScale,
      weatherAffix,
    });
    result.stageType = floorDef.type;
    result.stageName = floorDef.name;
    result.recTypes = recommendedTypes(floorDef.type);
    result.practice = false;
    result.practiceHalf = false;

    if (result.win) {
      const rw = floorDef.rewards || {};
      const parts = [];
      if (rw.futurecoin && typeof addRes === "function") {
        addRes("futurecoin", rw.futurecoin);
        parts.push(`未来币 +${rw.futurecoin}`);
      }
      if (rw.evolutionStone && typeof addRes === "function") {
        addRes("evolutionStone", rw.evolutionStone);
        parts.push(`灵晶石 +${rw.evolutionStone}`);
      }
      if (rw.rareCandy && typeof addRes === "function") {
        addRes("rareCandy", rw.rareCandy);
        parts.push(`跃级糖丸 +${rw.rareCandy}`);
      }
      if (rw.seasonMark && typeof addRes === "function") {
        addRes("seasonMark", rw.seasonMark);
        parts.push(`赛季印记 +${rw.seasonMark}`);
      }
      if (rw.linkRope && typeof addRes === "function") {
        addRes("linkRope", rw.linkRope);
        parts.push(`灵契绳 +${rw.linkRope}`);
      }
      if (rw.exp) {
        for (const m of selectedMons) {
          if (typeof addExpToMon === "function") addExpToMon(m, rw.exp);
        }
        parts.push(`经验 +${rw.exp}（每只）`);
      }
      result.rewardText = parts.join("、") || "通关";
      tower.best = Math.max(tower.best || 0, floorDef.floor);
      tower.allTimeBest = Math.max(tower.allTimeBest || 0, tower.best);
      if (floorDef.floor >= PVE_TOWER_FLOORS.length) {
        tower.cleared = true;
      }
      tower.floor = floorDef.floor + 1;
      result.winStreak = 0;
      bumpSessionPveWin(state);
      if (typeof addLog === "function") {
        addLog(`试炼塔通关：${floorDef.name} → 晋升 ${tower.floor}F（${result.rewardText}）`, true);
      }
      if (typeof onPveWin === "function") onPveWin();
    } else {
      result.rewardText = "";
      result.winStreak = 0;
      if (typeof addLog === "function") addLog(`试炼塔受阻：${floorDef.name}（天象：${weatherAffix?.name || "晴空"}）`);
    }

    ui.pveBattleResult = result;
    ui.pveDirty = true;
    if (typeof render === "function") render();
  }

  function doDualSanctumFight(state, trialId) {
    ensurePveState(state);
    const ds = ensureDualSanctumState(state);
    const trial = getDualSanctumTrial(trialId || ds.selectedTrialId);
    if (!trial || !isDualSanctumTrialUnlocked(trial.id, ds)) return;

    const list = Array.isArray(state.mons?.list) ? state.mons.list : [];
    const primaryRaw = ds.primaryId ? list.find((m) => m && m.id === ds.primaryId) : null;
    const partnerRaw = ds.partnerId ? list.find((m) => m && m.id === ds.partnerId) : null;
    if (!primaryRaw || !partnerRaw || primaryRaw.id === partnerRaw.id) return;

    const buildCombatMon = (m) => {
      const stats0 =
        typeof getMonCurrentStats === "function"
          ? getMonCurrentStats(m)
          : { hp: 50, atk: 20, def: 20, spa: 20, spd: 20, spe: 20 };
      const hasMegaAura =
        typeof m.megaAuraRemainingSec === "number" && Number.isFinite(m.megaAuraRemainingSec) && m.megaAuraRemainingSec > 0;
      const stats = hasMegaAura
        ? Object.fromEntries(
            Object.entries(stats0).map(([k, v]) => [k, Math.max(1, Math.floor((typeof v === "number" ? v : 0) * 1.2))]),
          )
        : stats0;
      return { id: m.id, name: m.name, types: getMonTypes(m), stats };
    };

    const pMon = buildCombatMon(primaryRaw);
    const sMon = buildCombatMon(partnerRaw);
    const duoSynergy = evaluateDuoSynergy(pMon.types, sMon.types, state);
    const darkBoostOn =
      typeof state.skills?.darkPveDamageBoostRemainingSec === "number" &&
      Number.isFinite(state.skills.darkPveDamageBoostRemainingSec) &&
      state.skills.darkPveDamageBoostRemainingSec > 0;
    const badgeMul = computeDualSanctumBadgeBonus(state).pveOutMul;

    const result = simulateDualBattle(pMon, sMon, trial.enemies, trial.stageType, {
      duoSynergy,
      playerDamageMul: (darkBoostOn ? 1.5 : 1) * abilityOutgoingDamageMul(state) * badgeMul,
      incomingDamageMul: natureIncomingDamageMul(state),
    });
    const stageElems = Array.isArray(trial.elements) && trial.elements.length > 0 ? trial.elements : [trial.stageType];
    result.stageType = trial.stageType;
    result.stageElements = stageElems;
    result.stageName = trial.name;
    result.recTypes = Array.from(new Set(stageElems.flatMap((el) => recommendedTypes(el))));
    result.practice = false;
    result.practiceHalf = false;

    if (result.win) {
      const rec = recordDualSanctumVictory(state, trial.id, result);
      const rw = rec.rewards || {};
      const parts = [];
      if (rec.badgeEarned) parts.push(`圣殿授勋【${rec.badgeName}】`);
      if (rw.futurecoin && typeof addRes === "function") {
        addRes("futurecoin", rw.futurecoin);
        parts.push(`未来币 +${rw.futurecoin}`);
      }
      if (rw.evolutionStone && typeof addRes === "function") {
        addRes("evolutionStone", rw.evolutionStone);
        parts.push(`灵晶石 +${rw.evolutionStone}`);
      }
      if (rw.rareCandy && typeof addRes === "function") {
        addRes("rareCandy", rw.rareCandy);
        parts.push(`跃级糖丸 +${rw.rareCandy}`);
      }
      if (rw.linkRope && typeof addRes === "function") {
        addRes("linkRope", rw.linkRope);
        parts.push(`灵契绳 +${rw.linkRope}`);
      }
      if (rw.megaStone && typeof addRes === "function") {
        addRes("megaStone", rw.megaStone);
        parts.push(`觉醒石 +${rw.megaStone}`);
      }
      if (rw.seasonMark && typeof addRes === "function") {
        addRes("seasonMark", rw.seasonMark);
        parts.push(`赛季印记 +${rw.seasonMark}`);
      }
      if (rw.exp) {
        if (typeof addExpToMon === "function") {
          addExpToMon(primaryRaw, rw.exp);
          addExpToMon(partnerRaw, rw.exp);
        }
        parts.push(`经验 +${rw.exp}（双灵）`);
      }
      result.rewardText = parts.join("、") || "双打通关";
      bumpSessionPveWin(state);
      if (typeof addLog === "function") {
        addLog(`双打圣殿试炼通关：${trial.name}（${result.stars}星 · 连携 ${result.comboHits} 次 · ${result.rewardText}）`, true);
      }
      if (typeof onPveWin === "function") onPveWin();
    } else {
      result.rewardText = "";
      if (typeof addLog === "function") {
        addLog(`双打圣殿试炼受挫：${trial.name} — 尝试编入属性共鸣搭档以触发高阶合体连携技！`);
      }
    }

    ui.pveBattleResult = result;
    ui.pveDirty = true;
    if (typeof render === "function") render();
  }

  function doChampionLeagueFight(state, mode = "full") {
    ensurePveState(state);
    ensureChampionLeagueState(state);
    const res = simulateLeagueGauntlet(state, {
      mode: mode === "single" ? "single" : "full",
      getMonTypes,
      getMonCurrentStats,
      getBeastDataByDex,
      monPower,
      addRes,
      addExpToMon,
    });
    if (!res.ok) return;

    const rw = res.rewardsEarned || {};
    const parts = [];
    if (res.championCleared) {
      parts.push(`冠军殿堂授勋（Tier ${res.hallOfFameTier} · 参战伙伴刻印【冠军殿堂绶带】）`);
    }
    if (rw.shinyStarSand) parts.push(`闪光祈愿星砂 +${rw.shinyStarSand}`);
    if (rw.futurecoin) parts.push(`未来币 +${rw.futurecoin}`);
    if (rw.seasonMark) parts.push(`赛季印记 +${rw.seasonMark}`);
    if (rw.exp) parts.push(`经验 +${rw.exp}（参战伙伴）`);

    const lastResult = res.stageResults[res.stageResults.length - 1] || null;
    const stars = res.win ? Math.max(1, lastResult?.stars || 2) : 0;
    const teamHpPct = lastResult ? lastResult.teamHpPct : 0;

    if (res.win) {
      bumpSessionPveWin(state);
      if (typeof onPveWin === "function") onPveWin();
      if (typeof addLog === "function") {
        addLog(
          res.championCleared
            ? `冠军联盟登顶捷报：连克四天王与圣殿总冠军！（${parts.join("、")}）`
            : `冠军联盟捷报：攻克当前天王殿（${parts.join("、")}）`,
          true,
        );
      }
    } else if (typeof addLog === "function") {
      addLog(
        `冠军联盟战报：连闯 ${res.stagesCleared} 殿后止步于【${res.stoppedTitle || "四天王"}】${parts.length ? `（已获 ${parts.join("、")}）` : ""}`,
      );
    }

    ui.pveBattleResult = {
      win: res.win,
      stars,
      rounds: res.totalRounds || 1,
      teamHpPct,
      endReason: res.win ? "ko" : "wipe",
      superEffectiveHits: 1,
      stageType: "light",
      stageElements: ["fire", "water", "grass", "light"],
      stageName: res.mode === "full" ? "冠军联盟四天王五连战" : lastResult?.title || "冠军联盟天王殿",
      recTypes: ["water", "grass", "fire", "dark"],
      rewardText: parts.join("、"),
      practice: false,
      practiceHalf: false,
      championCleared: res.championCleared,
      hallOfFameTier: res.hallOfFameTier,
      stagesCleared: res.stagesCleared,
      log: res.log,
    };
    ui.pveDirty = true;
    if (typeof render === "function") render();
  }

  function doStarCorridorFight(state, mode = "surge") {
    ensurePveState(state);
    ensureStarCorridorState(state);
    const res = simulateStarCorridorTrial(state, {
      mode: mode === "single" ? "single" : "surge",
      getMonTypes,
      getMonCurrentStats,
      getBeastDataByDex,
      monPower,
      addRes,
      addExpToMon,
    });
    if (!res.ok) return;

    const rw = res.rewardsEarned || {};
    const parts = [];
    parts.push(`星轨回廊突破至第 ${res.highestFloorCleared} 重（阶位 Tier ${res.corridorTier}/${STAR_CORRIDOR_MAX_TIER}）`);
    if (rw.corridorStarMedals) parts.push(`星轨回廊勋章 +${rw.corridorStarMedals}`);
    if (rw.ancientGeneAmber) parts.push(`远古基因琥珀 +${rw.ancientGeneAmber}`);
    if (rw.futurecoin) parts.push(`未来币 +${rw.futurecoin}`);
    if (rw.exp) parts.push(`经验 +${rw.exp}（参战伙伴）`);

    const lastResult = res.floorResults[res.floorResults.length - 1] || null;
    const stars = res.win ? Math.max(1, lastResult?.stars || 2) : 0;
    const teamHpPct = lastResult ? lastResult.teamHpPct : 0;

    if (res.win) {
      bumpSessionPveWin(state);
      if (typeof onPveWin === "function") onPveWin();
      if (typeof addLog === "function") {
        addLog(`双系星轨回廊捷报：连破 ${res.floorsCleared} 重！（${parts.join("、")}）`, true);
      }
    } else if (typeof addLog === "function") {
      addLog(`双系星轨回廊战报：止步于【${res.stoppedTitle || "双系星轨"}】`);
    }

    ui.pveBattleResult = {
      win: res.win,
      stars,
      rounds: res.totalRounds || 1,
      teamHpPct,
      endReason: res.win ? "ko" : "wipe",
      superEffectiveHits: 1,
      stageType: lastResult?.dualElements?.[0] || "fire",
      stageElements: lastResult?.dualElements || ["fire", "wind"],
      stageName: res.mode === "surge" ? `双系星轨回廊连战（第 ${res.startFloor}~${res.startFloor + Math.max(0, res.floorsCleared - 1)} 重）` : lastResult?.title || "双系星轨回廊",
      recTypes: ["water", "stone", "grass", "electric"],
      rewardText: parts.join("、"),
      practice: false,
      practiceHalf: false,
      corridorCleared: res.win,
      corridorTier: res.corridorTier,
      floorsCleared: res.floorsCleared,
      highestFloorCleared: res.highestFloorCleared,
      log: res.log,
    };
    ui.pveDirty = true;
    if (typeof render === "function") render();
  }

  function bindEvents(el, fallbackState) {
    if (!el) return;
    el.__pveLatestState = fallbackState;
    if (el.__pveDelegatedBound) return;
    el.__pveDelegatedBound = true;

    const resolveState = () => (typeof getState === "function" ? getState() : null) || el.__pveLatestState;

    el.addEventListener("change", (e) => {
      const target = e.target;
      if (!target || typeof target.closest !== "function") return;
      const state = resolveState();
      if (!state) return;

      const practiceChk = target.closest("[data-pve-practice]");
      if (practiceChk) {
        ui.pvePracticeMode = Boolean(practiceChk.checked);
        if (!ui.pvePracticeMode) ui.pvePracticeHalf = false;
        ui.pveDirty = true;
        if (typeof render === "function") render();
        return;
      }
      const halfChk = target.closest("[data-pve-practice-half]");
      if (halfChk) {
        ui.pvePracticeHalf = Boolean(halfChk.checked);
        if (ui.pvePracticeHalf) ui.pvePracticeMode = true;
        ui.pveDirty = true;
        if (typeof render === "function") render();
        return;
      }

      const chapterSel = target.closest("[data-pve-chapter]");
      if (chapterSel) {
        ui.pveChapter = chapterSel.value;
        ui.pveStage = "";
        ui.pveDirty = true;
        if (typeof render === "function") render();
        return;
      }

      const corridorChk = target.closest("[data-pve-corridor-check]");
      if (corridorChk) {
        const id = Number(corridorChk.getAttribute("data-pve-corridor-check"));
        if (Number.isFinite(id) && id > 0) {
          const res = toggleStarCorridorSquadMon(state, id);
          if (!res.ok) corridorChk.checked = false;
          ui.pveDirty = true;
          if (typeof render === "function") render();
        }
        return;
      }

      const leagueChk = target.closest("[data-pve-league-check]");
      if (leagueChk) {
        const id = Number(leagueChk.getAttribute("data-pve-league-check"));
        if (Number.isFinite(id) && id > 0) {
          const res = toggleChampionLeagueSquadMon(state, id);
          if (!res.ok) leagueChk.checked = false;
          ui.pveDirty = true;
          if (typeof render === "function") render();
        }
        return;
      }

      const teamChk = target.closest("[data-pve-team-check]");
      if (teamChk) {
        ensurePveState(state);
        const id = Number(teamChk.getAttribute("data-pve-team-check"));
        if (!Number.isFinite(id)) return;
        const sel = state.pve.selectedIds.slice(0, 6);
        if (teamChk.checked) {
          if (!sel.includes(id) && sel.length < 6) sel.push(id);
        } else {
          const idx = sel.indexOf(id);
          if (idx >= 0) sel.splice(idx, 1);
        }
        state.pve.selectedIds = sel;
        ui.pveDirty = true;
        if (typeof render === "function") render();
      }
    });

    el.addEventListener("click", (e) => {
      const target = e.target;
      if (!target || typeof target.closest !== "function") return;
      const state = resolveState();
      if (!state) return;

      if (target.hasAttribute?.("data-pve-team-overlay")) {
        ui.pveTeamModalOpen = false;
        ui.pveDirty = true;
        if (typeof render === "function") render();
        return;
      }
      if (target.hasAttribute?.("data-dual-modal-overlay")) {
        ui.pveDualPickSlot = null;
        ui.pveDirty = true;
        if (typeof render === "function") render();
        return;
      }
      if (target.hasAttribute?.("data-pve-corridor-modal-overlay")) {
        ui.pveCorridorModalOpen = false;
        ui.pveDirty = true;
        if (typeof render === "function") render();
        return;
      }
      if (target.hasAttribute?.("data-pve-league-modal-overlay")) {
        ui.pveLeagueModalOpen = false;
        ui.pveDirty = true;
        if (typeof render === "function") render();
        return;
      }
      if (target.hasAttribute?.("data-pve-result-overlay")) {
        ui.pveBattleResult = null;
        ui.pveDirty = true;
        if (typeof render === "function") render();
        return;
      }

      const corridorAutoBtn = target.closest("[data-pve-corridor-auto]");
      if (corridorAutoBtn && !corridorAutoBtn.disabled) {
        const res = autofillStarCorridorSquad(state, getMonTypes, monPower);
        if (res.ok && typeof addLog === "function") {
          addLog(`双系星轨回廊：已优选 ${res.squadIds.length} 只双系精锐伙伴组建星轨阵容`, true);
        }
        ui.pveDirty = true;
        if (typeof render === "function") render();
        return;
      }

      const corridorOpenModalBtn = target.closest("[data-pve-corridor-open-modal]");
      if (corridorOpenModalBtn && !corridorOpenModalBtn.disabled) {
        ui.pveCorridorModalOpen = true;
        ui.pveDirty = true;
        if (typeof render === "function") render();
        return;
      }

      const corridorCloseModalBtn = target.closest("[data-pve-corridor-modal-close]");
      if (corridorCloseModalBtn) {
        ui.pveCorridorModalOpen = false;
        ui.pveDirty = true;
        if (typeof render === "function") render();
        return;
      }

      const corridorRotateBtn = target.closest("[data-pve-corridor-rotate]");
      if (corridorRotateBtn && !corridorRotateBtn.disabled) {
        rotateOrResetStarCorridorOrbit(state, { rotateOrbit: true });
        if (typeof addLog === "function") {
          addLog("双系星轨回廊：已切换当前星轨双系相位", true);
        }
        ui.pveDirty = true;
        if (typeof render === "function") render();
        return;
      }

      const corridorExchangeBtn = target.closest("[data-pve-corridor-exchange]");
      if (corridorExchangeBtn && !corridorExchangeBtn.disabled) {
        const exId = corridorExchangeBtn.getAttribute("data-pve-corridor-exchange") || "";
        const res = exchangeCorridorMedals(state, exId, { addRes });
        if (res.ok && typeof addLog === "function") {
          addLog(`星轨勋章补给所：消耗 ${res.costMedals} 枚星轨回廊勋章兑换了「${res.label}」！`, true);
        }
        ui.pveDirty = true;
        if (typeof render === "function") render();
        return;
      }

      const corridorFightBtn = target.closest("[data-pve-corridor-fight]");
      if (corridorFightBtn && !corridorFightBtn.disabled) {
        const mode = corridorFightBtn.getAttribute("data-pve-corridor-fight") || "surge";
        doStarCorridorFight(state, mode);
        return;
      }

      const leagueAutoBtn = target.closest("[data-pve-league-auto]");
      if (leagueAutoBtn && !leagueAutoBtn.disabled) {
        const res = autofillChampionLeagueSquad(state, getMonTypes, monPower);
        if (res.ok && typeof addLog === "function") {
          addLog(`冠军联盟：已优选 ${res.squadIds.length} 只精锐伙伴组建殿堂挑战小队`, true);
        }
        ui.pveDirty = true;
        if (typeof render === "function") render();
        return;
      }

      const leagueOpenModalBtn = target.closest("[data-pve-league-open-modal]");
      if (leagueOpenModalBtn && !leagueOpenModalBtn.disabled) {
        ui.pveLeagueModalOpen = true;
        ui.pveDirty = true;
        if (typeof render === "function") render();
        return;
      }

      const leagueCloseModalBtn = target.closest("[data-pve-league-modal-close]");
      if (leagueCloseModalBtn) {
        ui.pveLeagueModalOpen = false;
        ui.pveDirty = true;
        if (typeof render === "function") render();
        return;
      }

      const leagueResetBtn = target.closest("[data-pve-league-reset]");
      if (leagueResetBtn && !leagueResetBtn.disabled) {
        resetChampionLeagueProgress(state);
        ui.pveDirty = true;
        if (typeof render === "function") render();
        return;
      }

      const leagueFightBtn = target.closest("[data-pve-league-fight]");
      if (leagueFightBtn && !leagueFightBtn.disabled) {
        const mode = leagueFightBtn.getAttribute("data-pve-league-fight") || "full";
        doChampionLeagueFight(state, mode);
        return;
      }

      const stageBtn = target.closest("[data-pve-select]");
      if (stageBtn && !stageBtn.disabled) {
        ui.pveStage = stageBtn.getAttribute("data-pve-select");
        ui.pveDirty = true;
        if (typeof render === "function") render();
        return;
      }

      const teamOpenBtn = target.closest("[data-pve-team-open]");
      if (teamOpenBtn && !teamOpenBtn.disabled) {
        ui.pveTeamModalOpen = true;
        ui.pveDirty = true;
        if (typeof render === "function") render();
        return;
      }

      const teamCloseBtn = target.closest("[data-pve-team-close]");
      if (teamCloseBtn) {
        ui.pveTeamModalOpen = false;
        ui.pveDirty = true;
        if (typeof render === "function") render();
        return;
      }

      const teamAutoBtn = target.closest("[data-pve-team-auto]");
      if (teamAutoBtn && !teamAutoBtn.disabled) {
        ensurePveState(state);
        const mons = Array.isArray(state.mons?.list) ? state.mons.list : [];
        const stageType = selectedStageType();
        const sorted = mons
          .filter(Boolean)
          .map((m) => {
            const match = typeMatchScore(getMonTypes(m), stageType);
            return { m, p: monPower(m), match };
          })
          .sort((a, b) => b.match.score - a.match.score || b.p - a.p);
        state.pve.selectedIds = sorted.slice(0, 6).map((x) => x.m.id);
        ui.pveDirty = true;
        if (typeof render === "function") render();
        return;
      }

      const teamClearBtn = target.closest("[data-pve-team-clear]");
      if (teamClearBtn && !teamClearBtn.disabled) {
        ensurePveState(state);
        state.pve.selectedIds = [];
        ui.pveDirty = true;
        if (typeof render === "function") render();
        return;
      }

      const fightBtn = target.closest("[data-pve-fight]");
      if (fightBtn && !fightBtn.disabled) {
        const stageId = fightBtn.getAttribute("data-pve-fight");
        doFight(state, stageId);
        return;
      }

      const towerFightBtn = target.closest("[data-pve-tower-fight]");
      if (towerFightBtn && !towerFightBtn.disabled) {
        doTowerFight(state);
        return;
      }

      const towerAutoBtn = target.closest("[data-pve-tower-auto]");
      if (towerAutoBtn && !towerAutoBtn.disabled) {
        ensurePveState(state);
        const tower = ensureTowerState(state);
        const floorDef = getTowerFloor(tower.floor, tower.week);
        const weatherAffix = getWeeklyTowerAffix(tower.week);
        const mons = Array.isArray(state.mons?.list) ? state.mons.list : [];
        const sorted = mons
          .filter(Boolean)
          .map((m) => {
            const types = getMonTypes(m);
            const match = typeMatchScore(types, floorDef?.type ?? null);
            const wxBonus = unitMatchesWeather(types, weatherAffix) ? 65 : 0;
            return { m, p: monPower(m), totalScore: match.score + wxBonus };
          })
          .sort((a, b) => b.totalScore - a.totalScore || b.p - a.p);
        state.pve.selectedIds = sorted.slice(0, 6).map((x) => x.m.id);
        if (typeof addLog === "function") {
          addLog(`试炼塔编队已按【${weatherAffix?.name || "天象"}】与守层克制自动优化`);
        }
        ui.pveDirty = true;
        if (typeof render === "function") render();
        return;
      }

      const exBtn = target.closest("[data-tower-exchange]");
      if (exBtn && !exBtn.disabled) {
        const exId = exBtn.getAttribute("data-tower-exchange");
        const ex = TOWER_SEASON_EXCHANGES.find((x) => x.id === exId);
        if (!ex || typeof addRes !== "function") return;
        const owned = Math.max(0, Math.floor(state.res?.seasonMark?.value ?? 0));
        if (owned < ex.cost) return;
        addRes("seasonMark", -ex.cost);
        addRes(ex.rid, ex.amount);
        if (typeof addLog === "function") {
          addLog(`赛季军需兑换：消耗 ${ex.cost} 枚赛季印记，获得 ${ex.label}`, true);
        }
        ui.pveDirty = true;
        if (typeof render === "function") render();
        return;
      }

      const dualSelTrialBtn = target.closest("[data-dual-select-trial]");
      if (dualSelTrialBtn && !dualSelTrialBtn.disabled) {
        const ds = ensureDualSanctumState(state);
        const tid = dualSelTrialBtn.getAttribute("data-dual-select-trial");
        if (tid && isDualSanctumTrialUnlocked(tid, ds)) {
          ds.selectedTrialId = tid;
          ui.pveDirty = true;
          if (typeof render === "function") render();
        }
        return;
      }

      const dualAutoBtn = target.closest("[data-dual-auto]");
      if (dualAutoBtn && !dualAutoBtn.disabled) {
        const ds = ensureDualSanctumState(state);
        const res = autofillDualSanctumDuo(state, ds.selectedTrialId, getMonTypes, monPower);
        if (res.ok && typeof addLog === "function") {
          addLog("双打圣殿：已按目标圣殿克制与元素双灵共鸣自动优选主副搭档", true);
        }
        ui.pveDirty = true;
        if (typeof render === "function") render();
        return;
      }

      const dualSwapBtn = target.closest("[data-dual-swap]");
      if (dualSwapBtn && !dualSwapBtn.disabled) {
        const ds = ensureDualSanctumState(state);
        if (ds.primaryId && ds.partnerId) {
          selectDualSanctumDuo(state, ds.partnerId, ds.primaryId);
          ui.pveDirty = true;
          if (typeof render === "function") render();
        }
        return;
      }

      const dualPickBtn = target.closest("[data-dual-pick-slot]");
      if (dualPickBtn && !dualPickBtn.disabled) {
        ui.pveDualPickSlot = dualPickBtn.getAttribute("data-dual-pick-slot") || null;
        ui.pveDirty = true;
        if (typeof render === "function") render();
        return;
      }

      const dualConfirmBtn = target.closest("[data-dual-confirm-mon]");
      if (dualConfirmBtn && !dualConfirmBtn.disabled) {
        const ds = ensureDualSanctumState(state);
        const monId = Number(dualConfirmBtn.getAttribute("data-dual-confirm-mon"));
        if (Number.isFinite(monId) && monId > 0) {
          if (ui.pveDualPickSlot === "primary") {
            selectDualSanctumDuo(state, monId, ds.partnerId === monId ? null : ds.partnerId);
          } else if (ui.pveDualPickSlot === "partner") {
            selectDualSanctumDuo(state, ds.primaryId === monId ? null : ds.primaryId, monId);
          }
        }
        ui.pveDualPickSlot = null;
        ui.pveDirty = true;
        if (typeof render === "function") render();
        return;
      }

      const dualModalCloseBtn = target.closest("[data-dual-modal-close]");
      if (dualModalCloseBtn) {
        ui.pveDualPickSlot = null;
        ui.pveDirty = true;
        if (typeof render === "function") render();
        return;
      }

      const dualFightBtn = target.closest("[data-dual-fight]");
      if (dualFightBtn && !dualFightBtn.disabled) {
        const tid = dualFightBtn.getAttribute("data-dual-fight");
        doDualSanctumFight(state, tid);
        return;
      }

      const dualMileBtn = target.closest("[data-dual-claim-mile]");
      if (dualMileBtn && !dualMileBtn.disabled) {
        const mId = dualMileBtn.getAttribute("data-dual-claim-mile");
        const claimed = claimDualSanctumMilestone(state, mId);
        if (claimed.ok) {
          if (typeof addRes === "function") {
            for (const [rid, amt] of Object.entries(claimed.rewards)) {
              addRes(rid, amt);
            }
          }
          if (typeof addLog === "function") {
            addLog(`圣殿徽章里程碑达成：领取【${claimed.label}】奖励！`, true);
          }
          ui.pveDirty = true;
          if (typeof render === "function") render();
        }
        return;
      }

      const resCloseBtn = target.closest("[data-pve-result-close]");
      if (resCloseBtn) {
        ui.pveBattleResult = null;
        ui.pveDirty = true;
        if (typeof render === "function") render();
      }
    });
  }
}
