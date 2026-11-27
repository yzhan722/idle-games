// UI 组装层：全部 init*Tab / createRender* 调用（SECTION:TAB_AND_RENDER_WIRE + RENDER_FUNCTIONS 拆出）
// 维护者窗口：A/C
// 所有玩法函数经由 ctx 注入；本文件只做「把能力接到面板」的声明式组装

import { clamp, escapeHtml, fmt, fmtDuration, pad3, randFloat } from "../utils.js";
import { TYPE_SKILLS } from "../type_skills.js";
import { renderBeastIcon } from "../sprites.js";
import { BUILDING_MAX_LEVEL } from "../state.js";
import {
  evoConditionText,
  getEvoStatus,
  getEvoTargets,
  isSameEvoFamily,
} from "../evo_utils.js";
import { clampStar, getStarUpgradeNeed, getStarUpgradeGate, meetsStarUpgradeGate, renderStars } from "../stars.js";
import { bumpEraCounter } from "../systems/era.js";
import { canClaimDexRegion, markDexRegionClaimed } from "../systems/gameplay_fun.js";
import { LB_NAME_KEY, LB_AVATAR_KEY } from "./storage.js";

import { initBuildingsTab } from "../tabs/buildings_tab.js";
import { initTechTab } from "../tabs/tech_tab.js";
import { createRenderBonfireActions, initBonfireTab } from "../tabs/bonfire_tab.js";
import { initCaptureTab } from "../tabs/capture_tab.js";
import { createLazyPanel, preloadWhenIdle } from "./lazy_panel.js";
import { createItemUsage } from "../item_usage.js";
import { createTabController } from "../tabs/tabs_controller.js";
import { createTick } from "../tick.js";
import { createRenderResources } from "../render/resources.js";
import { createRenderLog } from "../render/log.js";
import { createRenderBuildings } from "../render/buildings.js";
import { createRenderTech } from "../render/tech.js";
import { createRenderCapture } from "../render/capture.js";
import { createRenderServerBuffBar } from "../render/server_buff_bar.js";
import { createRenderOverlays, bindOverlayEvents } from "../render/overlays.js";

// ctx: app.js 组出的完整上下文（state/ui/els/各能力函数/thunk 引用）
export function initGameUi(ctx) {
  const {
    ui, defs, els, getState, analytics,
    hint, addLog,
    markDexDirty, markCaptureDirty, markMonsDirty, markMonListDirty, markFunctionsDirty, markPveDirty, markLeaderboardDirty,
    markOverlaysDirty, syncEraProgress, tryAdvanceEra,
    getSpeciesByPid, getMonCurrentStats, createMonInstance, addExpToMon, evolveMon, expNeedForLevel, monPower,
    dexCaughtCount, computeDexEffects, computeTechEffects, getBuildingCost, getResearchCost, computeResearchTimeSec,
    getResearchEfficiency, canAfford, pay, addRes, getOrbMakeCost, canStartResearch, startResearchByTid,
    tryAutoResearch, computeDerived, dexCaughtUnique,
    pickRandomBeast, awardCaughtBeast, doCatch,
    getCaptureAreas, getUnlockedCaptureAreas, ensureCaptureAreaValid, getActiveCaptureArea, getCapturePool,
    getMythicPool, baseCatchChanceByDex, baseCatchChanceByTier, pickRandomFromPool,
    save, render, activateTab,
    lbBaseUrl, lbFetchJson,
    refreshLeaderboards, submitScoreAndRefresh, ensureLeaderboardAutoRefresh,
    avatarFileToDataUrl, renderOwnerIcon, renderSelfAvatarPreview, trainerIconSrc,
    calcTopMons, calcTeamPower, calcTotalPower,
    getServerBuffLevel, serverBuffMul, serverBuffEffectText,
    buyServerBuff, closeServerBuffBuyModal,
    closeBossBullyRewardModal, claimBossBullyReward,
    onBossBullyMaybeReward,
    getBeastDataByDex,
    createOptionsGoalsFn,
    getSocialTab,
  } = ctx;

  const renders = {};

  initBonfireTab({
    elBonfireActions: els.elBonfireActions,
    elBtnGather: els.elBtnGather,
    ui,
    getOrbMakeCost,
    canAfford,
    pay,
    addRes,
    addLog,
    render,
    doCatch,
    getState,
    activateTab,
    onGather: (intendedOrGained, maybeGained) => {
      const intended =
        typeof maybeGained === "number"
          ? Math.max(0, Number(intendedOrGained) || 0)
          : Math.max(0, Number(intendedOrGained) || 0);
      const catnipGained =
        typeof maybeGained === "number" ? Math.max(0, maybeGained) : intended;
      bumpEraCounter(getState(), "gather_total", 1);
      // ponytail: era berry quest counts gather yield even when warehouse is full
      bumpEraCounter(getState(), "berry_earned", intended > 0 ? intended : catnipGained);
      syncEraProgress();
      markCaptureDirty();
    },
    onOrbCraft: (qty) => {
      bumpEraCounter(getState(), "pokeball_earned", qty);
      syncEraProgress();
      markCaptureDirty();
    },
  });

  // 标签页切换
  const tabController = createTabController({
    ui,
    elTabs: els.elTabs,
    elPanels: els.elPanels,
    renderBonfire: () => {
      renders.renderBonfireActions?.();
      renders.renderBuildings?.();
    },
    renderScience: () => renders.renderTech?.(),
    renderFutureShop: () => renders.renderFutureShop?.(),
    renderDex: () => renders.renderDex(),
    renderCapture: () => renders.renderCapture(),
    renderItems: () => renders.renderItems(),
    renderMons: () => renders.renderMons(),
    renderFunctions: () => renders.renderFunctions(),
    renderLeaderboard: () => renders.renderLeaderboard(),
    renderHelp: () => renders.renderHelp(),
    renderPve: () => renders.renderPve(),
    renderOptions: () => createOptionsGoalsFn(),
    renderSocial: () => {
      try {
        getSocialTab()?.refreshSocial?.();
      } catch {
      }
    },
  });

  // Initial chrome before first render tick
  try {
    document.querySelectorAll(".tab[data-tab]").forEach((t) => t.setAttribute("data-unlocked", "1"));
    tabController.refreshTabChrome();
  } catch {
  }

  const itemUsage = createItemUsage({
    getState,
    addRes,
    addLog,
    addExpToMon,
    render,
  });

  // 暴露到全局以便事件处理
  window.itemUsage = itemUsage;

  initCaptureTab({
    elCaptureArea: els.elCaptureArea,
    elCaptureInfo: els.elCaptureInfo,
    elCaptureActions: els.elCaptureActions,
    ui,
    getState,
    clamp,
    randFloat,
    getOrbMakeCost,
    canAfford,
    pay,
    addRes,
    addLog,
    render,
    markCaptureDirty,
    getCapturePool,
    getMythicPool,
    pickRandomFromPool,
    getSpeciesByPid,
    computeTechEffects,
    baseCatchChanceByDex,
    awardCaughtBeast,
    doCatch,
    pushTickerEvent: ctx.pushTickerEvent,
    onOrbCraft: (qty) => {
      bumpEraCounter(getState(), "pokeball_earned", qty);
      syncEraProgress();
      markCaptureDirty();
    },
    onEraAdvance: tryAdvanceEra,
    getCaptureAreas,
    starterMonFactory: () => {
      const pool = (defs.beasts || []).filter((b) => b && (b.tier === "rare" || b.tier === "epic"));
      const pick = pool[Math.floor(randFloat() * pool.length)] || pool[0];
      return pick ? createMonInstance(pick) : null;
    },
    onPrestige: () => analytics.trackOnce("first_rebirth", { already: (getState().era?.prestigeCount || 0) > 1 }),
  });

  initBuildingsTab({
    elBuildings: els.elBuildings,
    getState,
    BUILDING_MAX_LEVEL,
    getBuildingCost,
    canAfford,
    pay,
    addLog,
    render,
    defs,
  });

  initTechTab({
    elTech: els.elTech,
    elAutoResearchToggle: els.elAutoResearchToggle,
    elAutoResearchMode: els.elAutoResearchMode,
    getState,
    startResearchByTid,
    tryAutoResearch,
    render,
  });

  renders.renderResources = createRenderResources({
    elResources: els.elResources,
    defs,
    fmt,
    getState,
  });

  renders.renderBuildings = createRenderBuildings({
    elBuildings: els.elBuildings,
    defs,
    canAfford,
    getBuildingCost,
    getState,
  });

  renders.renderTech = createRenderTech({
    elTech: els.elTech,
    elAutoResearchToggle: els.elAutoResearchToggle,
    elAutoResearchMode: els.elAutoResearchMode,
    elResearchEff: els.elResearchEff,
    defs,
    canAfford,
    computeResearchTimeSec,
    fmtDuration,
    getResearchEfficiency,
    getState,
  });

  const tick = createTick({
    ui,
    defs,
    computeDerived,
    addRes,
    addLog,
    tryAutoResearch,
    markMonsDirty,
    addExpToMon,
    createMonInstance,
    getServerBuffLevel,
    getSpeciesByPid,
    BUILDING_MAX_LEVEL,
    getBuildingCost,
    canAfford,
    pay,
    getOrbMakeCost,
    getState,
    pushTickerEvent: ctx.pushTickerEvent,
  });

  renders.renderCapture = createRenderCapture({
    elCaptureInfo: els.elCaptureInfo,
    elCaptureActions: els.elCaptureActions,
    elCaptureArea: els.elCaptureArea,
    elCaptureChance: els.elCaptureChance,
    ui,
    defs,
    getState,
    clamp,
    escapeHtml,
    renderBeastIcon,
    ensureCaptureAreaValid,
    getCaptureAreas,
    getUnlockedCaptureAreas,
    getActiveCaptureArea,
    dexCaughtUnique,
    getOrbMakeCost,
    canAfford,
    computeTechEffects,
    baseCatchChanceByDex,
    getSpeciesByPid,
  });

  renders.renderBonfireActions = createRenderBonfireActions({
    elBonfireActions: els.elBonfireActions,
    elBtnGather: els.elBtnGather,
    ui,
    getState,
  });

  // 打开到才下载的面板：首屏不带它们的模块，空闲时预取（见 lazy_panel.js）；「刷新」前先存一次档
  const reload = () => {
    save();
    window.location.reload();
  };
  const lazy = {
    functions: createLazyPanel({
      reload,
      load: (q) => Promise.all([import(`../tabs/functions_tab.js${q}`)]),
      setup: ([{ createRenderFunctions, initFunctionsTab }]) => {
        initFunctionsTab({
          elFunctionsTraining: els.elFunctionsTraining,
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
          getSpeciesByPid,
          createMonInstance,
        });
        return createRenderFunctions({
          elFunctionsTraining: els.elFunctionsTraining,
          ui,
          TYPE_ZH: ctx.TYPE_ZH,
          getBeastDataByDex,
          getSpeciesByPid,
          getMonCurrentStats,
          computeTechEffects,
          clamp,
          escapeHtml,
          fmtDuration,
          expNeedForLevel0: expNeedForLevel,
          monPower,
          renderBeastIcon,
          markFunctionsDirty,
          markMonListDirty,
          addLog,
          render,
          getState,
        });
      },
      getHost: () => els.elFunctionsTraining,
      isActive: () => ui.activeTab === "functions",
    }),
    mons: createLazyPanel({
      reload,
      load: (q) => Promise.all([import(`../render/mons.js${q}`), import(`../tabs/mons_tab.js${q}`)]),
      setup: ([{ createRenderMons }, { initMonsTab }]) => {
        initMonsTab({
          elMonBack: els.elMonBack,
          elMonList: els.elMonList,
          elMonDetail: els.elMonDetail,
          elMonRegion: els.elMonRegion,
          elMonType: els.elMonType,
          elMonSort: els.elMonSort,
          elMonPrev: els.elMonPrev,
          elMonNext: els.elMonNext,
          ui,
          clamp,
          TYPE_ZH: ctx.TYPE_ZH,
          TYPE_SKILLS,
          monPower,
          clampStar,
          getStarUpgradeNeed,
          getStarUpgradeGate,
          meetsStarUpgradeGate,
          isSameEvoFamily,
          getEvoStatus,
          evolveMon,
          addRes,
          addLog,
          render,
          markMonsDirty,
          markMonListDirty,
          getState,
          pushTickerEvent: ctx.pushTickerEvent,
          lbFetchJson,
          lbBaseUrl,
          onBossBullyMaybeReward,
          getBeastDataByDex,
        });
        return createRenderMons({
          elMonList: els.elMonList,
          elMonDetail: els.elMonDetail,
          elMonBack: els.elMonBack,
          elMonRegion: els.elMonRegion,
          elMonType: els.elMonType,
          elMonPrev: els.elMonPrev,
          elMonNext: els.elMonNext,
          elMonPageInfo: els.elMonPageInfo,
          ui,
          clamp,
          escapeHtml,
          pad3,
          renderBeastIcon,
          TYPE_ZH: ctx.TYPE_ZH,
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
          getSpeciesByPid,
          getEvoTargets,
          getEvoStatus,
          evoConditionText,
          getState,
        });
      },
      getHost: () => els.elMonList,
      isActive: () => ui.activeTab === "mons",
    }),
    dex: createLazyPanel({
      reload,
      load: (q) => Promise.all([import(`../render/dex.js${q}`), import(`../tabs/dex_tab.js${q}`)]),
      setup: ([{ createRenderDex }, { initDexTab }]) => {
        initDexTab({
          ui,
          elDexArea: els.elDexArea,
          elDexSearch: els.elDexSearch,
          elDexOnlyCaught: els.elDexOnlyCaught,
          elDexOnlyMissing: els.elDexOnlyMissing,
          elDexOnlyShiny: els.elDexOnlyShiny,
          elDexPrev: els.elDexPrev,
          elDexNext: els.elDexNext,
          elDexList: els.elDexList,
          elDexSummary: els.elDexSummary,
          markDexDirty,
          getState,
          addRes,
          addLog,
          render: () => render(),
          setActiveTab: (name) => {
            try {
              document.querySelector(`.tab[data-tab="${name}"]`)?.click();
            } catch {}
          },
        });
        return createRenderDex({
          elDexSummary: els.elDexSummary,
          elDexList: els.elDexList,
          elDexPrev: els.elDexPrev,
          elDexNext: els.elDexNext,
          elDexPageInfo: els.elDexPageInfo,
          elDexArea: els.elDexArea,
          elDexRegionInfo: els.elDexRegionInfo,
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
        });
      },
      getHost: () => els.elDexSummary,
      isActive: () => ui.activeTab === "dex",
    }),
    future: createLazyPanel({
      reload,
      load: (q) => Promise.all([import(`../render/future.js${q}`), import(`../tabs/future_tab.js${q}`)]),
      setup: ([{ createRenderFutureShop }, { initFutureTab }]) => {
        initFutureTab({
          elFutureShop: els.elFutureShop,
          ui,
          defs,
          getState,
          addRes,
          addLog,
          render,
        });
        return createRenderFutureShop({
          elFutureShop: els.elFutureShop,
          ui,
          defs,
          fmt,
          getState,
        });
      },
      getHost: () => els.elFutureShop,
      isActive: () => ui.activeTab === "future",
    }),
    items: createLazyPanel({
      reload,
      load: (q) => Promise.all([import(`../tabs/items_tab.js${q}`)]),
      setup: ([{ createRenderItems }]) => {
        return createRenderItems({
          defs,
          getState,
          itemUsage,
          ui,
          render,
          markMonsDirty,
          addLog,
        });
      },
      getHost: () => document.getElementById("items"),
      isActive: () => ui.activeTab === "future",
    }),
    leaderboard: createLazyPanel({
      reload,
      load: (q) => Promise.all([import(`../render/leaderboard.js${q}`), import(`../tabs/leaderboard_tab.js${q}`)]),
      setup: ([{ createRenderLeaderboard }, { initLeaderboardTab }]) => {
        initLeaderboardTab({
          elLeaderboard: els.elLeaderboard,
          ui,
          LB_NAME_KEY,
          LB_AVATAR_KEY,
          avatarFileToDataUrl,
          markLeaderboardDirty,
          render,
          submitScoreAndRefresh,
          getState,
          addRes,
          addLog,
          dexCaughtUnique,
          activateTab,
        });
        return createRenderLeaderboard({
          elLeaderboard: els.elLeaderboard,
          ui,
          escapeHtml,
          fmtDuration,
          renderBeastIcon,
          renderOwnerIcon,
          renderSelfAvatarPreview,
          trainerIconSrc,
          dexCaughtUnique,
          calcTeamPower,
          calcTotalPower,
          calcTopMons,
          getState,
          ensureLeaderboardAutoRefresh,
          refreshLeaderboards,
        });
      },
      getHost: () => els.elLeaderboard,
      isActive: () => ui.activeTab === "leaderboard",
    }),
    pve: createLazyPanel({
      reload,
      load: (q) => Promise.all([import(`../tabs/pve_tab.js${q}`)]),
      setup: ([{ createRenderPve }]) => {
        return createRenderPve({
          elPveList: els.elPveList,
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
          TYPE_ZH: ctx.TYPE_ZH,
          dexCaughtUnique,
          onPveAttempt: () => analytics.trackOnce("first_battle", { already: Object.keys(getState().pve?.progress || {}).length > 0 }),
        });
      },
      getHost: () => els.elPveList,
      isActive: () => ui.activeTab === "pve",
    }),
    help: createLazyPanel({
      reload,
      load: (q) => Promise.all([import(`../tabs/help_tab.js${q}`)]),
      setup: ([{ createRenderHelp }]) => {
        return createRenderHelp({
          elHelp: els.elHelp,
          ui,
          escapeHtml,
          getState,
          getCaptureAreas,
          dexCaughtUnique,
          defs,
          addRes,
          addLog,
          render: () => render(),
        });
      },
      getHost: () => els.elHelp,
      isActive: () => ui.activeTab === "options",
    }),
  };
  renders.renderFunctions = lazy.functions.render;
  renders.renderMons = lazy.mons.render;
  renders.renderDex = lazy.dex.render;
  renders.renderFutureShop = lazy.future.render;
  renders.renderItems = lazy.items.render;
  renders.renderLeaderboard = lazy.leaderboard.render;
  renders.renderPve = lazy.pve.render;
  renders.renderHelp = lazy.help.render;

  renders.renderLog = createRenderLog({
    elLog: els.elLog,
    escapeHtml,
    getState,
  });

  renders.renderServerBuffBar = createRenderServerBuffBar({
    elServerBuffBar: els.elServerBuffBar,
    ui,
    serverBuffEffectText,
  });

  renders.renderOverlays = createRenderOverlays({
    elOverlays: els.elOverlays,
    ui,
    defs,
  });

  function closeExpeditionRewardModal() {
    ui.expeditionRewardModalOpen = false;
    ui.expeditionRewardModalData = null;
    markOverlaysDirty();
    render();
  }

  bindOverlayEvents({
    elOverlays: els.elOverlays,
    ui,
    addLog,
    buyServerBuff,
    closeServerBuffBuyModal,
    closeExpeditionRewardModal,
    closeBossBullyRewardModal,
    claimBossBullyReward,
  });

  const preloadPanels = (extra = []) => preloadWhenIdle([lazy.mons, lazy.functions, lazy.dex, lazy.future, lazy.items, lazy.leaderboard, ...extra, lazy.pve, lazy.help]);

  return { renders, tabController, itemUsage, tick, preloadPanels };
}
