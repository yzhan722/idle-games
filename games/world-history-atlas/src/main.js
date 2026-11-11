// World History Evolution Atlas - Main Controller
(function () {
  const {
    REGIONS, RIVERS, TRADE_ROUTES, THEATERS, MACRO_METRICS,
    EMPIRES, TIMELINE, TimelineEngine, MapRenderer, AudioSynthesizer
  } = window.HistoryAtlas;

  const engine = new TimelineEngine(REGIONS, EMPIRES, TIMELINE);
  const audio = new AudioSynthesizer();

  let currentYear = -3000;
  let yearFloat = -3000;
  let isPlaying = true;
  let speed = 1;
  let selectedRegionId = "guanzhong";
  let selectedRouteId = null;
  let lastKeyframeYear = null;
  let lastToastText = "";
  let dwellTicks = 0;
  let idleDrift = false;
  let activeTheaterId = "world";

  const svgEl = document.getElementById("world-map");
  const renderer = new MapRenderer(
    svgEl,
    REGIONS,
    RIVERS,
    TRADE_ROUTES,
    EMPIRES,
    (regionId) => {
      audio.playClickPop();
      selectedRegionId = regionId;
      renderer.setHighlightEmpire(null);
      updateView();
    },
    (routeId, hub) => {
      audio.playClickPop();
      selectedRouteId = routeId;
      if (hub && hub.regionId) {
        selectedRegionId = hub.regionId;
      }
      renderer.setFocusedRoute(selectedRouteId);
      renderer.setHighlightEmpire(null);
      updateView();
    }
  );

  function formatYear(y) {
    return y < 0 ? `公元前 ${Math.abs(y)} 年` : `公元 ${y} 年`;
  }

  // 5-Stage Non-Linear Historical Time Scale (Early eras compressed, Modern eras expanded)
  const TIME_ANCHORS = [
    { year: -3000, norm: 0.00 },
    { year: -500,  norm: 0.22 },
    { year: 500,   norm: 0.44 },
    { year: 1500,  norm: 0.68 },
    { year: 1900,  norm: 0.85 },
    { year: 2026,  norm: 1.00 }
  ];

  function yearToNorm(yr) {
    const y = Math.max(-3000, Math.min(2026, yr));
    for (let i = 0; i < TIME_ANCHORS.length - 1; i++) {
      const a = TIME_ANCHORS[i];
      const b = TIME_ANCHORS[i + 1];
      if (y <= b.year) {
        const ratio = (y - a.year) / (b.year - a.year);
        return a.norm + ratio * (b.norm - a.norm);
      }
    }
    return 1.0;
  }

  function normToYear(norm) {
    const n = Math.max(0, Math.min(1, norm));
    for (let i = 0; i < TIME_ANCHORS.length - 1; i++) {
      const a = TIME_ANCHORS[i];
      const b = TIME_ANCHORS[i + 1];
      if (n <= b.norm) {
        const ratio = (n - a.norm) / (b.norm - a.norm);
        return Math.round(a.year + ratio * (b.year - a.year));
      }
    }
    return 2026;
  }

  // Continuous Non-Linear Time Velocity (Fast in early antiquity -> Progressively slower toward modernity)
  function getNonLinearYearsPerSec(yr, spd) {
    const u = Math.max(0, Math.min(1, (yr - (-3000)) / 5026));
    // Smooth exponential-power decay from 25 yr/s at -3000 BC down to 0.18 yr/s at 2026 AD (at 1x speed)
    let baseYps;
    if (yr < -1200) {
      baseYps = 25.0 - ((yr - (-3000)) / 1800) * 14.5; // 25.0 -> 10.5 yr/s
    } else if (yr < 0) {
      baseYps = 10.5 - ((yr - (-1200)) / 1200) * 6.3;  // 10.5 -> 4.2 yr/s
    } else if (yr < 1000) {
      baseYps = 4.2 - (yr / 1000) * 2.4;               // 4.2 -> 1.8 yr/s
    } else if (yr < 1600) {
      baseYps = 1.8 - ((yr - 1000) / 600) * 1.05;      // 1.8 -> 0.75 yr/s
    } else if (yr < 1850) {
      baseYps = 0.75 - ((yr - 1600) / 250) * 0.37;     // 0.75 -> 0.38 yr/s
    } else if (yr < 1945) {
      baseYps = 0.38 - ((yr - 1850) / 95) * 0.16;      // 0.38 -> 0.22 yr/s
    } else {
      baseYps = 0.22 - ((yr - 1945) / 81) * 0.04;      // 0.22 -> 0.18 yr/s
    }
    return Math.max(0.08, baseYps * spd);
  }

  function formatPaceLabel(yr, spd) {
    const yps = getNonLinearYearsPerSec(yr, spd);
    const numStr = yps >= 10 ? Math.round(yps) : yps >= 1 ? yps.toFixed(1) : yps.toFixed(2);
    let tag = "现代慢放";
    if (yr < -1000) tag = "远古快进";
    else if (yr < 300) tag = "古典演进";
    else if (yr < 1500) tag = "中古流转";
    else if (yr < 1900) tag = "近代细读";
    return `${numStr}年/秒 · ${tag}`;
  }

  // Initialize Regional Theater Focus Bar
  function initTheaterBar() {
    const container = document.getElementById("theater-buttons");
    if (!container || !THEATERS) return;
    container.innerHTML = "";
    THEATERS.forEach(th => {
      const btn = document.createElement("button");
      btn.className = "theater-pill" + (th.id === activeTheaterId ? " active" : "");
      btn.id = "th-" + th.id;
      btn.textContent = th.name;
      btn.onclick = () => {
        audio.playClickPop();
        activeTheaterId = th.id;
        document.querySelectorAll(".theater-pill").forEach(el => el.classList.remove("active"));
        btn.classList.add("active");
        renderer.animateCameraTo(th.scale, th.panX, th.panY);
      };
      container.appendChild(btn);
    });
  }

  // Render Macro Tech & East/West Share Curve SVG
  function renderMacroChart(state) {
    const popEl = document.getElementById("macro-pop-badge");
    const techEl = document.getElementById("macro-tech-text");
    const svgChart = document.getElementById("macro-chart-svg");
    if (!svgChart || !MACRO_METRICS || !MACRO_METRICS.length) return;

    if (state.macro) {
      popEl.textContent = `全球人口 ${state.macro.pop}`;
      techEl.textContent = state.macro.tech;
    }

    const w = 210;
    const h = 68;
    const padX = 8;
    const padY = 8;
    const xOf = (yr) => padX + yearToNorm(yr) * (w - padX * 2);
    const yOf = (val) => h - padY - (val / 80) * (h - padY * 2);

    const eastPts = MACRO_METRICS.map(m => `${xOf(m.year).toFixed(1)},${yOf(m.gdp_east).toFixed(1)}`).join(" ");
    const westPts = MACRO_METRICS.map(m => `${xOf(m.year).toFixed(1)},${yOf(m.gdp_west).toFixed(1)}`).join(" ");
    const curX = xOf(currentYear).toFixed(1);

    svgChart.innerHTML = `
      <polyline fill="none" stroke="#f5c542" stroke-width="1.8" points="${eastPts}" />
      <polyline fill="none" stroke="#38bdf8" stroke-width="1.8" points="${westPts}" />
      <line x1="${curX}" y1="2" x2="${curX}" y2="${h - 2}" stroke="#ffffff" stroke-width="1.2" stroke-dasharray="2 2" />
      <circle cx="${curX}" cy="${h / 2}" r="2.8" fill="#f5c542" />
    `;

    svgChart.onclick = (e) => {
      const rect = svgChart.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const targetYr = normToYear(ratio);
      window.AtlasApp.jumpToYear(targetYr);
    };
  }

  function updateView() {
    const state = engine.getStateAtYear(currentYear);

    if (lastKeyframeYear !== null && state.keyframeYear !== lastKeyframeYear) {
      audio.playEraChime();
      // Gentle dwell pause on new historical keyframe in relaxed idle modes
      if (speed <= 1) {
        dwellTicks = 22;
      }
      if (idleDrift && state.landmarks && state.landmarks.length > 0) {
        const lm = state.landmarks[0];
        renderer.focusOnPoint(lm.x, lm.y, 1.32);
      }
    }
    lastKeyframeYear = state.keyframeYear;

    document.body.className = state.theme || "era-ancient";

    document.getElementById("year-text").textContent = formatYear(currentYear);
    document.getElementById("era-text").textContent = state.era;
    const paceEl = document.getElementById("pace-badge");
    if (paceEl) paceEl.textContent = formatPaceLabel(currentYear, speed);

    const bannerEl = document.getElementById("event-banner");
    if (lastToastText !== state.toast) {
      lastToastText = state.toast;
      bannerEl.classList.remove("toast-fade");
      void bannerEl.offsetWidth;
      bannerEl.textContent = state.toast;
      bannerEl.classList.add("toast-fade");
    }
    document.getElementById("timeline-slider").value = Math.round(yearToNorm(currentYear) * 1000);

    renderer.renderState(state, selectedRegionId);
    renderMacroChart(state);

    // Render Left Leaderboard (Top 6 Powers)
    const lbContainer = document.getElementById("leaderboard-list");
    lbContainer.innerHTML = "";
    if (state.leaderboard.length === 0) {
      lbContainer.innerHTML = '<div class="empty-tip">尚无大一统帝国</div>';
    } else {
      const maxCount = Math.max(1, state.leaderboard[0].count);
      state.leaderboard.forEach((item, index) => {
        const row = document.createElement("div");
        row.className = "lb-row";
        row.onmouseenter = () => {
          renderer.setHoveredEmpire(item.name);
        };
        row.onmouseleave = () => {
          renderer.setHoveredEmpire(null);
        };
        row.onclick = () => {
          audio.playClickPop();
          renderer.setHighlightEmpire(item.name);
          const firstReg = Object.keys(state.owners).find(k => state.owners[k] === item.name);
          if (firstReg) selectedRegionId = firstReg;
          updateView();
        };

        const pct = Math.round((item.count / maxCount) * 100);
        const dispName = item.displayName || item.name.split(" ")[0];
        row.innerHTML = `
          <div class="lb-head">
            <span class="lb-rank">#${index + 1}</span>
            <span class="lb-dot" style="background:${item.color}"></span>
            <span class="lb-name">${dispName}</span>
            <span class="lb-count">${item.count} 区</span>
          </div>
          <div class="lb-bar-bg">
            <div class="lb-bar-fill" style="width:${pct}%; background:${item.color}"></div>
          </div>
        `;
        lbContainer.appendChild(row);
      });
    }

    if (selectedRegionId) {
      renderInspector(selectedRegionId, state);
    }
  }

  function formatShortYear(y) {
    return y < 0 ? `前${Math.abs(y)}` : `${y}`;
  }

  function readableInkColor(hex) {
    const darkColors = ["#222629", "#2f3640", "#1e272e", "#2c3e50", "#1b2631"];
    if (!hex || darkColors.includes(hex.toLowerCase())) return "#d8c7a8";
    return hex;
  }

  function renderInspectorTrajectory(ownerName) {
    const box = document.getElementById("card-trajectory-box");
    const svg = document.getElementById("card-trajectory-svg");
    const summaryEl = document.getElementById("card-traj-summary");
    const msRow = document.getElementById("card-milestones-row");
    const peersRow = document.getElementById("card-peers-row");
    if (!box || !svg || !msRow || !peersRow) return;

    const traj = ownerName ? engine.getEmpireTrajectory(ownerName) : null;
    if (!traj || !traj.points || traj.points.length === 0) {
      box.style.display = "none";
      return;
    }
    box.style.display = "";
    const strokeColor = readableInkColor(traj.color);
    if (summaryEl) {
      summaryEl.textContent = `国祚约 ${traj.duration} 年 · 点击跳转`;
    }

    const W = 276;
    const H = 82;
    const padL = 8;
    const padR = 8;
    const padT = 12;
    const padB = 15;
    const minY = traj.startY;
    const maxY = Math.max(minY + 1, traj.endY);
    const maxArea = Math.max(10, traj.peakAreaNum);

    const toX = (yr) => padL + ((yr - minY) / (maxY - minY)) * (W - padL - padR);
    const toY = (area) => (H - padB) - (Math.min(maxArea, Math.max(0, area)) / maxArea) * (H - padT - padB);

    const pts = traj.points.map(p => `${toX(p.year).toFixed(1)},${toY(p.area).toFixed(1)}`);
    const areaPoly = `${toX(traj.points[0].year).toFixed(1)},${(H - padB).toFixed(1)} ${pts.join(" ")} ${toX(traj.points[traj.points.length - 1].year).toFixed(1)},${(H - padB).toFixed(1)}`;
    const curClamped = Math.max(minY, Math.min(maxY, currentYear));
    const curX = toX(curClamped).toFixed(1);
    const inEra = currentYear >= minY && currentYear <= maxY;

    const msDots = traj.milestones.map(m => {
      const mx = toX(m.year).toFixed(1);
      const my = toY(m.area).toFixed(1);
      const isPeak = m.phase === "peak";
      return `
        <circle cx="${mx}" cy="${my}" r="${isPeak ? 3.2 : 2.3}" fill="#171411" stroke="${isPeak ? "#e5c67b" : strokeColor}" stroke-width="${isPeak ? 1.6 : 1.2}" />
      `;
    }).join("");

    svg.innerHTML = `
      <line x1="${padL}" y1="${padT}" x2="${W - padR}" y2="${padT}" stroke="rgba(216,179,101,0.12)" stroke-dasharray="2 2" stroke-width="0.7" />
      <line x1="${padL}" y1="${((padT + H - padB) / 2).toFixed(1)}" x2="${W - padR}" y2="${((padT + H - padB) / 2).toFixed(1)}" stroke="rgba(216,179,101,0.10)" stroke-dasharray="2 2" stroke-width="0.7" />
      <line x1="${padL}" y1="${H - padB}" x2="${W - padR}" y2="${H - padB}" stroke="rgba(216,179,101,0.24)" stroke-width="0.8" />
      <polygon points="${areaPoly}" fill="${strokeColor}" fill-opacity="0.16" />
      <polyline points="${pts.join(" ")}" fill="none" stroke="${strokeColor}" stroke-width="1.55" stroke-linejoin="round" stroke-linecap="round" />
      ${inEra ? `<line x1="${curX}" y1="${padT - 3}" x2="${curX}" y2="${H - padB}" stroke="#e5c67b" stroke-width="1" stroke-dasharray="2 1.5" />` : ""}
      ${msDots}
      <text x="${padL}" y="${H - 3}" fill="#8e8577" font-size="8.5">${formatShortYear(minY)}</text>
      <text x="${(W / 2).toFixed(0)}" y="${H - 3}" fill="#b7aa93" font-size="8.5" text-anchor="middle">极盛 ${formatShortYear(traj.peakYear)} (${traj.peak_area})</text>
      <text x="${W - padR}" y="${H - 3}" fill="#8e8577" font-size="8.5" text-anchor="end">${traj.isAliveToday ? "至今" : formatShortYear(maxY)}</text>
    `;

    svg.onclick = (e) => {
      const rect = svg.getBoundingClientRect();
      if (!rect.width) return;
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const targetYr = Math.round(minY + ratio * (maxY - minY));
      window.AtlasApp.jumpToYear(Math.max(-3000, Math.min(2026, targetYr)));
    };

    msRow.innerHTML = traj.milestones.map(m => `
      <button class="traj-ms-chip" onclick="AtlasApp.jumpToYear(${Math.min(2026, m.year)})" title="跳转至 ${formatYear(m.year)}">
        <span class="ms-tag">${m.label}</span><span>${formatShortYear(m.year)}</span>
      </button>
    `).join("");

    const peers = engine.getContemporaryPeers(ownerName, currentYear, 2);
    if (peers.length > 0) {
      const p1 = peers[0];
      const p2 = peers[1] || null;
      peersRow.innerHTML = `
        <span class="peers-label">同代列国：</span>
        ${peers.map(p => `
          <button class="peer-chip" onclick="AtlasApp.openCompareModal('${ownerName.replace(/'/g, "\\'")}', '${p.name.replace(/'/g, "\\'")}', '${p2 && p2.name !== p.name ? p2.name.replace(/'/g, "\\'") : (p1.name !== p.name ? p1.name.replace(/'/g, "\\'") : "")}')">
            <i class="peer-dot" style="background:${readableInkColor(p.color)}"></i>${p.name}
          </button>
        `).join("")}
      `;
    } else {
      peersRow.innerHTML = "";
    }
  }

  function renderInspector(regionId, state) {
    const regObj = REGIONS.find(r => r.id === regionId);
    if (!regObj) return;

    const ownerName = state.owners[regionId];
    document.getElementById("card-region").textContent = `${regObj.continent} · ${regObj.name}`;

    if (ownerName && EMPIRES[ownerName]) {
      const emp = EMPIRES[ownerName];
      const count = Object.values(state.owners).filter(v => v === ownerName).length;
      document.getElementById("card-empire").textContent = ownerName;
      document.getElementById("card-empire").style.color = readableInkColor(emp.color);
      document.getElementById("card-desc").textContent = emp.desc;
      document.getElementById("card-capital").textContent = emp.capital;
      document.getElementById("card-regime").textContent = emp.regime;
      document.getElementById("card-area").textContent = `${emp.peak_area} (当前统辖 ${count} 区)`;
      document.getElementById("card-span").textContent = emp.era_span;
      renderInspectorTrajectory(ownerName);
    } else {
      document.getElementById("card-empire").textContent = "远古早期古国";
      document.getElementById("card-empire").style.color = "#9aa5b1";
      document.getElementById("card-desc").textContent = "该时期此地理区域处于早期方国或古国孕育阶段，尚未建立跨区域中央集权王朝。";
      document.getElementById("card-capital").textContent = "早期王邑";
      document.getElementById("card-regime").textContent = "早期古国王制";
      document.getElementById("card-area").textContent = "1 个独立地理区";
      document.getElementById("card-span").textContent = "远古 - 古典";
      renderInspectorTrajectory(null);
    }

    const historyList = engine.getRegionHistory(regionId, currentYear);
    const histContainer = document.getElementById("card-history-list");
    histContainer.innerHTML = "";
    if (historyList.length === 0) {
      histContainer.innerHTML = '<div class="hist-item">远古以来维持原始部落聚落</div>';
    } else {
      historyList.slice(0, 6).forEach(h => {
        const div = document.createElement("div");
        div.className = "hist-item";
        div.innerHTML = `<span class="hist-year">${formatYear(h.year)}</span> <span class="hist-owner">${h.owner}</span>`;
        histContainer.appendChild(div);
      });
    }

    renderInspectorRoutes(state, regionId);
  }

  function renderInspectorRoutes(state, regionId) {
    const pillsEl = document.getElementById("card-routes-pills");
    const detailEl = document.getElementById("card-route-detail");
    const countEl = document.getElementById("card-routes-count");
    if (!pillsEl || !detailEl) return;

    const activeIds = (state.routes || []).filter(id => Boolean(TRADE_ROUTES[id]));
    if (countEl) {
      countEl.textContent = activeIds.length > 0 ? `通行 ${activeIds.length} 条干线` : "跨洲干线未通";
    }

    if (activeIds.length === 0) {
      if (selectedRouteId) {
        selectedRouteId = null;
        renderer.setFocusedRoute(null);
      }
      pillsEl.innerHTML = `
        <button class="traj-ms-chip" onclick="AtlasApp.jumpToYear(-119)"><span class="ms-tag">凿空西域</span>前119</button>
        <button class="traj-ms-chip" onclick="AtlasApp.jumpToYear(750)"><span class="ms-tag">盛唐海陆</span>750</button>
        <button class="traj-ms-chip" onclick="AtlasApp.jumpToYear(1572)"><span class="ms-tag">白银帆船</span>1572</button>
      `;
      detailEl.innerHTML = `<div class="route-empty-note">当前处于远古区域物产交换时期，跨大陆驼道与季风远洋航线尚未贯通。</div>`;
      return;
    }

    let activeRouteId = selectedRouteId && activeIds.includes(selectedRouteId) ? selectedRouteId : null;
    if (!activeRouteId) {
      const regMatch = activeIds.find(rid => (TRADE_ROUTES[rid].hubs || []).some(h => h.regionId === regionId));
      activeRouteId = regMatch || activeIds[0];
    }

    pillsEl.innerHTML = activeIds.map(rid => {
      const rt = TRADE_ROUTES[rid];
      const isFocused = rid === activeRouteId;
      const isPinned = rid === selectedRouteId;
      return `
        <button class="route-pill-btn${isFocused ? " active" : ""}" onclick="AtlasApp.selectRoute('${rid}')" title="${rt.name}">
          <i class="peer-dot" style="background:${rt.color || "#cfa55a"}"></i>
          <span>${rt.short_name || rt.name}</span>
          ${isPinned ? '<span class="route-pin-mark">·定</span>' : ""}
        </button>
      `;
    }).join("");

    const rt = TRADE_ROUTES[activeRouteId];
    if (!rt) {
      detailEl.innerHTML = "";
      return;
    }
    const hubsHtml = (rt.hubs || []).map((h, idx) => `
      <button class="route-hub-chip${h.regionId === regionId ? " is-here" : ""}" onclick="AtlasApp.focusRouteHub('${activeRouteId}', ${idx})" title="${h.role} · ${h.goods}">
        ◎ ${h.name}
      </button>
    `).join("");

    detailEl.innerHTML = `
      <div class="route-meta-head">
        <span class="route-cat-tag" style="border-color:${rt.color || "#cfa55a"};color:${rt.color || "#cfa55a"}">${rt.category || "跨洲商道"}</span>
        <span class="route-span-txt">${rt.active_span || ""}</span>
      </div>
      <div class="route-goods-line"><strong>流通货殖：</strong>${rt.commodities || "-"}</div>
      <div class="route-hubs-wrap">${hubsHtml}</div>
      <div class="route-impact-note">${rt.historical_impact || ""}</div>
    `;
  }

  // Initialize Comparison Selectors (2 required + 1 optional contemporary polity)
  function resolveEmpireKey(query, fallback) {
    const names = Object.keys(EMPIRES);
    if (!query) return fallback || names[0];
    if (EMPIRES[query]) return query;
    const hit = names.find(n => n.includes(query) || query.includes(n));
    if (hit) return hit;
    const tokens = query.split(/[\s/()（）·]+/).filter(t => t.length >= 2);
    const tokHit = names.find(n => tokens.some(t => n.includes(t)));
    return tokHit || fallback || names[0];
  }

  function initCompareSelectors(defaultA = "大唐帝国", defaultB = "阿拔斯王朝", defaultC = "拜占庭帝国") {
    const selA = document.getElementById("cmp-select-a");
    const selB = document.getElementById("cmp-select-b");
    const selC = document.getElementById("cmp-select-c");
    if (!selA || !selB) return;
    const names = Object.keys(EMPIRES);
    const optsHtml = names.map(n => `<option value="${n}">${n}</option>`).join("");
    selA.innerHTML = optsHtml;
    selB.innerHTML = optsHtml;
    selA.value = resolveEmpireKey(defaultA, names[0]);
    selB.value = resolveEmpireKey(defaultB, names[1]);
    if (selC) {
      selC.innerHTML = `<option value="">（不叠加第三政权 · 仅双国对比）</option>${optsHtml}`;
      selC.value = defaultC ? resolveEmpireKey(defaultC, "") : "";
    }
  }

  // Close search dropdown when clicking outside
  document.addEventListener("click", (e) => {
    const wrap = document.querySelector(".search-wrap");
    const dd = document.getElementById("search-dropdown");
    if (dd && wrap && !wrap.contains(e.target)) {
      dd.style.display = "none";
    }
  });

  window.AtlasApp = {
    togglePlay() {
      isPlaying = !isPlaying;
      const btn = document.getElementById("btn-play");
      btn.textContent = isPlaying ? "II 暂停演化" : "▶ 继续演化";
      btn.classList.toggle("active", isPlaying);
    },
    setSpeed(s) {
      speed = s;
      [0.5, 1, 2, 5].forEach(k => {
        const el = document.getElementById("btn-" + k + "x");
        if (el) el.classList.toggle("active", k === s);
      });
      const paceEl = document.getElementById("pace-badge");
      if (paceEl) paceEl.textContent = formatPaceLabel(currentYear, speed);
    },
    jumpToYear(y) {
      audio.playClickPop();
      currentYear = y;
      yearFloat = y;
      dwellTicks = 0;
      updateView();
    },
    onSliderInput(val) {
      const num = parseFloat(val);
      currentYear = normToYear(num / 1000);
      yearFloat = currentYear;
      dwellTicks = 0;
      updateView();
    },
    toggleIdleDrift() {
      audio.playClickPop();
      idleDrift = !idleDrift;
      const btn = document.getElementById("btn-drift");
      if (btn) btn.classList.toggle("active", idleDrift);
      if (idleDrift) {
        const state = engine.getStateAtYear(currentYear);
        if (state.landmarks && state.landmarks.length > 0) {
          renderer.focusOnPoint(state.landmarks[0].x, state.landmarks[0].y, 1.32);
        }
      } else {
        renderer.resetView();
      }
    },
    toggleCampaigns() {
      audio.playClickPop();
      const on = renderer.toggleCampaigns();
      const btn = document.getElementById("btn-campaigns");
      if (btn) btn.classList.toggle("active", on);
      updateView();
    },
    toggleRoutes() {
      audio.playClickPop();
      const on = renderer.toggleRoutes();
      const btn = document.getElementById("btn-routes");
      if (btn) btn.classList.toggle("active", on);
      updateView();
    },
    selectRoute(routeId) {
      audio.playClickPop();
      selectedRouteId = selectedRouteId === routeId ? null : routeId;
      renderer.setFocusedRoute(selectedRouteId);
      updateView();
    },
    focusRouteHub(routeId, hubIndex) {
      audio.playClickPop();
      const rt = TRADE_ROUTES[routeId];
      const hub = rt && rt.hubs ? rt.hubs[hubIndex] : null;
      selectedRouteId = routeId;
      renderer.setFocusedRoute(routeId);
      renderer.setHighlightEmpire(null);
      if (hub) {
        if (hub.regionId) selectedRegionId = hub.regionId;
        renderer.focusOnPoint(hub.x, hub.y, 1.95);
      }
      updateView();
    },
    resetCamera() {
      audio.playClickPop();
      activeTheaterId = "world";
      document.querySelectorAll(".theater-pill").forEach(el => el.classList.toggle("active", el.id === "th-world"));
      renderer.resetView();
    },
    toggleMute() {
      const muted = audio.toggleMute();
      document.getElementById("btn-mute").textContent = muted ? "× 音效：关" : "♪ 音效：开";
    },
    onSearchInput(val) {
      const dd = document.getElementById("search-dropdown");
      if (!dd) return;
      const hits = engine.search(val);
      if (hits.length === 0) {
        dd.style.display = "none";
        return;
      }
      dd.innerHTML = "";
      hits.forEach(h => {
        const item = document.createElement("div");
        item.className = "s-item";
        item.innerHTML = `
          <div>
            <div class="s-title">${h.title}</div>
            <div class="s-sub">${h.sub}</div>
          </div>
          <span class="s-badge">${h.type}</span>
        `;
        item.onclick = () => {
          audio.playClickPop();
          dd.style.display = "none";
          if (typeof h.year === "number") {
            currentYear = h.year;
            yearFloat = h.year;
          }
          if (h.routeId) {
            selectedRouteId = h.routeId;
            renderer.setFocusedRoute(h.routeId);
          }
          if (h.empireName) {
            renderer.setHighlightEmpire(h.empireName);
          }
          if (h.regionId) {
            selectedRegionId = h.regionId;
          }
          if (h.x && h.y) {
            renderer.focusOnPoint(h.x, h.y, 2.0);
          }
          updateView();
        };
        dd.appendChild(item);
      });
      dd.style.display = "block";
    },
    openCompareModal(empA, empB, empC) {
      audio.playClickPop();
      initCompareSelectors(
        empA || "大汉帝国",
        empB || "罗马帝国",
        typeof empC === "string" ? empC : "安息帝国"
      );
      document.getElementById("compare-modal").style.display = "flex";
      this.renderComparison();
    },
    applyComparePreset(empA, empB, empC = "") {
      audio.playClickPop();
      initCompareSelectors(empA, empB, empC);
      this.renderComparison();
    },
    compareCurrentEmpire() {
      const state = engine.getStateAtYear(currentYear);
      const curEmp = state.owners[selectedRegionId] || "大唐帝国";
      const peers = engine.getContemporaryPeers(curEmp, currentYear, 2);
      const secondEmp = peers[0] ? peers[0].name : (curEmp === "罗马帝国" ? "大汉帝国" : "罗马帝国");
      const thirdEmp = peers[1] ? peers[1].name : "";
      this.openCompareModal(curEmp, secondEmp, thirdEmp);
    },
    closeCompareModal() {
      document.getElementById("compare-modal").style.display = "none";
    },
    renderComparison() {
      const empA = document.getElementById("cmp-select-a").value;
      const empB = document.getElementById("cmp-select-b").value;
      const selC = document.getElementById("cmp-select-c");
      const empC = selC ? selC.value : "";
      const cmp = engine.getEmpireComparison(empA, empB, empC);
      const items = cmp.list;
      if (!items.length) return;

      const maxArea = Math.max(80, ...items.map(d => d.areaNum));
      const maxRegs = Math.max(1, ...items.map(d => d.maxRegions));
      const maxDur = Math.max(50, ...items.map(d => d.duration));
      const [minYear, maxYear] = cmp.domain;
      const spanYears = Math.max(1, maxYear - minYear);

      // Build unified multi-polity chronological copperplate chart
      const W = 796;
      const H = 186;
      const padL = 46;
      const padR = 18;
      const padT = 34;
      const padB = 24;
      const plotW = W - padL - padR;
      const plotH = H - padT - padB;
      const toX = (yr) => padL + ((yr - minYear) / spanYears) * plotW;
      const toY = (area) => (H - padB) - (Math.min(maxArea, Math.max(0, area)) / maxArea) * plotH;

      const dashStyles = ["", "5 2.5", "2 2"];
      const tickCount = 6;
      let gridSvg = "";
      for (let t = 0; t <= tickCount; t++) {
        const ty = minYear + Math.round((spanYears * t) / tickCount);
        const tx = toX(ty).toFixed(1);
        gridSvg += `
          <line x1="${tx}" y1="${padT}" x2="${tx}" y2="${H - padB}" stroke="rgba(216,179,101,0.10)" stroke-width="0.8" stroke-dasharray="2 3" />
          <text x="${tx}" y="${H - 7}" fill="#948a78" font-size="10" text-anchor="${t === 0 ? "start" : t === tickCount ? "end" : "middle"}">${formatShortYear(ty)}</text>
        `;
      }
      [0, 0.5, 1].forEach((ratio) => {
        const gy = (H - padB - ratio * plotH).toFixed(1);
        const val = Math.round(maxArea * ratio);
        gridSvg += `
          <line x1="${padL}" y1="${gy}" x2="${W - padR}" y2="${gy}" stroke="rgba(216,179,101,${ratio === 0 ? "0.28" : "0.11"})" stroke-width="0.8" />
          <text x="${padL - 6}" y="${(parseFloat(gy) + 3.5).toFixed(1)}" fill="#8e8577" font-size="9.5" text-anchor="end">${val}</text>
        `;
      });

      const placedPeakLabels = [];
      const seriesSvg = items.map((d, idx) => {
        const traj = d.trajectory;
        if (!traj || !traj.points.length) return "";
        const col = readableInkColor(d.color);
        const pts = traj.points.map(p => `${toX(p.year).toFixed(1)},${toY(p.area).toFixed(1)}`);
        const areaPoly = `${toX(traj.points[0].year).toFixed(1)},${(H - padB).toFixed(1)} ${pts.join(" ")} ${toX(traj.points[traj.points.length - 1].year).toFixed(1)},${(H - padB).toFixed(1)}`;
        const spanY = 10 + idx * 7.5;
        const sx1 = toX(traj.startY).toFixed(1);
        const sx2 = toX(traj.endY).toFixed(1);
        const pkXNum = toX(traj.peakYear);
        const pkYNum = toY(traj.peakAreaNum);
        const dashAttr = dashStyles[idx] ? `stroke-dasharray="${dashStyles[idx]}"` : "";

        let lblY = Math.max(padT + 9, pkYNum - 7);
        let lblAnchor = pkXNum < padL + 58 ? "start" : pkXNum > W - padR - 58 ? "end" : "middle";
        for (let pass = 0; pass < 3; pass++) {
          const hit = placedPeakLabels.find(pl => Math.abs(pl.x - pkXNum) < 118 && Math.abs(pl.y - lblY) < 12);
          if (!hit) break;
          lblY = Math.min(H - padB - 8, hit.y + 13);
        }
        placedPeakLabels.push({ x: pkXNum, y: lblY });

        const msMarkers = traj.milestones.map(m => {
          const mx = toX(m.year).toFixed(1);
          const my = toY(m.area).toFixed(1);
          return `<circle cx="${mx}" cy="${my}" r="${m.phase === "peak" ? 3.5 : 2.3}" fill="#161411" stroke="${col}" stroke-width="1.4" />`;
        }).join("");

        return `
          <line x1="${sx1}" y1="${spanY}" x2="${sx2}" y2="${spanY}" stroke="${col}" stroke-width="2.4" stroke-linecap="round" opacity="0.72" />
          <polygon points="${areaPoly}" fill="${col}" fill-opacity="0.10" />
          <polyline points="${pts.join(" ")}" fill="none" stroke="${col}" stroke-width="1.9" ${dashAttr} stroke-linejoin="round" stroke-linecap="round" />
          ${msMarkers}
          <text x="${pkXNum.toFixed(1)}" y="${lblY.toFixed(1)}" fill="${col}" font-size="9.5" font-weight="bold" text-anchor="${lblAnchor}">${d.name}·极盛(${formatShortYear(traj.peakYear)})</text>
        `;
      }).join("");

      const curInDomain = currentYear >= minYear && currentYear <= maxYear;
      const curLineSvg = curInDomain
        ? `<line x1="${toX(currentYear).toFixed(1)}" y1="${padT - 4}" x2="${toX(currentYear).toFixed(1)}" y2="${H - padB}" stroke="#e5c67b" stroke-width="1" stroke-dasharray="3 2" />`
        : "";

      const legendHtml = items.map((d) => {
        const col = readableInkColor(d.color);
        const msText = (d.trajectory ? d.trajectory.milestones : [])
          .map(m => `${m.label}:${formatShortYear(m.year)}`)
          .join(" · ");
        return `
          <div class="cmp-leg-item">
            <span class="cmp-leg-swatch" style="background:${col}"></span>
            <strong>${d.name}</strong>
            <span class="cmp-leg-ms">(${msText})</span>
          </div>
        `;
      }).join("");

      const renderCol = (d) => {
        const col = readableInkColor(d.color);
        return `
          <div class="cmp-col">
            <div class="cmp-title" style="color:${col}">${d.name}</div>
            <div class="cmp-sub">${d.era_span} · ${d.continent} · 首都：${d.capital}</div>
            <div class="cmp-metric">
              <div class="cmp-metric-head"><span>鼎盛疆域面积</span><strong>${d.peak_area}</strong></div>
              <div class="cmp-bar-bg"><div class="cmp-bar-fill" style="width:${Math.round((d.areaNum / maxArea) * 100)}%; background:${col}"></div></div>
            </div>
            <div class="cmp-metric">
              <div class="cmp-metric-head"><span>沙盘最大统辖区块</span><strong>${d.maxRegions} 个核心区</strong></div>
              <div class="cmp-bar-bg"><div class="cmp-bar-fill" style="width:${Math.round((d.maxRegions / maxRegs) * 100)}%; background:${col}"></div></div>
            </div>
            <div class="cmp-metric">
              <div class="cmp-metric-head"><span>国祚延续跨度</span><strong>约 ${d.duration} 年 (${d.regime})</strong></div>
              <div class="cmp-bar-bg"><div class="cmp-bar-fill" style="width:${Math.round((d.duration / maxDur) * 100)}%; background:${col}"></div></div>
            </div>
            <div class="cmp-desc">${d.desc}</div>
            <button class="cmp-jump-btn" onclick="AtlasApp.jumpToEmpirePeak('${d.name.replace(/'/g, "\\'")}', ${d.peakYear})">
              ▶ 跳转至其极盛年 (${formatYear(d.peakYear)}) 并高亮版图
            </button>
          </div>
        `;
      };

      document.getElementById("compare-body").innerHTML = `
        <div class="cmp-trajectory-panel">
          <div class="cmp-traj-top">
            <div class="cmp-leg-list">${legendHtml}</div>
            <span class="cmp-axis-note">纵轴：万 km² · 点击图谱任意纪年即刻穿越</span>
          </div>
          <svg id="cmp-overlay-svg" viewBox="0 0 ${W} ${H}">
            ${gridSvg}
            ${seriesSvg}
            ${curLineSvg}
          </svg>
        </div>
        <div class="cmp-grid ${items.length === 3 ? "cmp-grid-3" : ""}">
          ${items.map(renderCol).join("")}
        </div>
      `;

      const overlaySvg = document.getElementById("cmp-overlay-svg");
      if (overlaySvg) {
        overlaySvg.onclick = (e) => {
          const rect = overlaySvg.getBoundingClientRect();
          if (!rect.width) return;
          const svgX = ((e.clientX - rect.left) / rect.width) * W;
          const ratio = Math.max(0, Math.min(1, (svgX - padL) / plotW));
          const targetYr = Math.max(-3000, Math.min(2026, Math.round(minYear + ratio * spanYears)));
          this.closeCompareModal();
          this.jumpToYear(targetYr);
        };
      }
    },
    jumpToEmpirePeak(empName, peakYear) {
      this.closeCompareModal();
      currentYear = peakYear;
      yearFloat = peakYear;
      renderer.setHighlightEmpire(empName);
      const state = engine.getStateAtYear(currentYear);
      const firstReg = Object.keys(state.owners).find(k => state.owners[k] === empName);
      if (firstReg) selectedRegionId = firstReg;
      updateView();
    },
    openChronicleModal() {
      audio.playClickPop();
      const modal = document.getElementById("chronicle-modal");
      if (!modal) return;
      modal.style.display = "flex";
      this.renderChronicleList();
    },
    closeChronicleModal() {
      const modal = document.getElementById("chronicle-modal");
      if (modal) modal.style.display = "none";
    },
    renderChronicleList() {
      const listEl = document.getElementById("chronicle-list");
      const countEl = document.getElementById("chr-count-badge");
      if (!listEl) return;
      const eraGroup = (document.getElementById("chr-era-filter") || {}).value || "ALL";
      const theater = (document.getElementById("chr-theater-filter") || {}).value || "ALL";
      const category = (document.getElementById("chr-cat-filter") || {}).value || "ALL";
      const query = (document.getElementById("chr-search-input") || {}).value || "";

      const items = engine.filterChronicles({ eraGroup, theater, category, query });
      if (countEl) countEl.textContent = `共 ${items.length} 条史实`;

      if (items.length === 0) {
        listEl.innerHTML = `<div class="chr-empty">未找到匹配的编年史条目，请尝试切换筛选条件或搜索关键词。</div>`;
        return;
      }

      listEl.innerHTML = items.map(ev => `
        <div class="chr-row" onclick="AtlasApp.jumpToChronicleEvent(${ev.year}, '${ev.regionId || ""}', ${ev.x || 0}, ${ev.y || 0})">
          <div class="chr-left">
            <span class="chr-year-badge">${ev.date_label}</span>
            <span class="chr-region-badge">${ev.region_name || "全球"}</span>
          </div>
          <div class="chr-main">
            <div class="chr-head-line">
              <span class="chr-title">${ev.title}</span>
              <div class="chr-tags">
                <span class="chr-tag chr-tag-theater">${ev.theater}</span>
                <span class="chr-tag chr-tag-cat">${ev.category}</span>
              </div>
            </div>
            <div class="chr-detail">${ev.detail}</div>
          </div>
          <div class="chr-action">▶ 穿越定位</div>
        </div>
      `).join("");
    },
    jumpToChronicleEvent(yr, regId, x, y) {
      audio.playClickPop();
      this.closeChronicleModal();
      engine.pinnedChronicleYear = yr;
      currentYear = yr;
      yearFloat = yr;
      dwellTicks = 25;
      if (regId) {
        selectedRegionId = regId;
      }
      if (x && y) {
        renderer.focusOnPoint(x, y, 1.85);
      }
      updateView();
    }
  };

  initTheaterBar();

  // Non-Linear Idle-Game Evolution Loop (Fast in early antiquity -> Progressively slower toward modernity)
  setInterval(() => {
    if (!isPlaying) return;

    let ratePerTick = getNonLinearYearsPerSec(currentYear, speed) * 0.1;

    if (dwellTicks > 0) {
      dwellTicks -= 1;
      ratePerTick *= 0.25;
    }

    yearFloat += ratePerTick;
    if (yearFloat >= 2026) {
      yearFloat = 2026;
      currentYear = 2026;
      if (isPlaying) window.AtlasApp.togglePlay();
      updateView();
      return;
    }

    const nextIntYear = Math.round(yearFloat);
    if (nextIntYear !== currentYear) {
      currentYear = nextIntYear;
      updateView();
    }
  }, 100);

  updateView();
})();
