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
  let lastKeyframeYear = null;
  let lastToastText = "";
  let dwellTicks = 0;
  let idleDrift = false;
  let activeTheaterId = "world";

  const svgEl = document.getElementById("world-map");
  const renderer = new MapRenderer(svgEl, REGIONS, RIVERS, TRADE_ROUTES, EMPIRES, (regionId) => {
    audio.playClickPop();
    selectedRegionId = regionId;
    renderer.setHighlightEmpire(null);
    updateView();
  });

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

  function renderInspector(regionId, state) {
    const regObj = REGIONS.find(r => r.id === regionId);
    if (!regObj) return;

    const ownerName = state.owners[regionId];
    document.getElementById("card-region").textContent = `${regObj.continent} · ${regObj.name}`;

    if (ownerName && EMPIRES[ownerName]) {
      const emp = EMPIRES[ownerName];
      const count = Object.values(state.owners).filter(v => v === ownerName).length;
      document.getElementById("card-empire").textContent = ownerName;
      const darkColors = ["#222629", "#2f3640", "#1e272e", "#2c3e50"];
      document.getElementById("card-empire").style.color = darkColors.includes((emp.color || "").toLowerCase()) ? "#e2e8f0" : emp.color;
      document.getElementById("card-desc").textContent = emp.desc;
      document.getElementById("card-capital").textContent = emp.capital;
      document.getElementById("card-regime").textContent = emp.regime;
      document.getElementById("card-area").textContent = `${emp.peak_area} (当前统辖 ${count} 区)`;
      document.getElementById("card-span").textContent = emp.era_span;
    } else {
      document.getElementById("card-empire").textContent = "远古早期古国";
      document.getElementById("card-empire").style.color = "#9aa5b1";
      document.getElementById("card-desc").textContent = "该时期此地理区域处于早期方国或古国孕育阶段，尚未建立跨区域中央集权王朝。";
      document.getElementById("card-capital").textContent = "早期王邑";
      document.getElementById("card-regime").textContent = "早期古国王制";
      document.getElementById("card-area").textContent = "1 个独立地理区";
      document.getElementById("card-span").textContent = "远古 - 古典";
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
  }

  // Initialize Comparison Selectors
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

  function initCompareSelectors(defaultA = "大唐帝国", defaultB = "阿拔斯王朝") {
    const selA = document.getElementById("cmp-select-a");
    const selB = document.getElementById("cmp-select-b");
    if (!selA || !selB) return;
    const names = Object.keys(EMPIRES);
    selA.innerHTML = names.map(n => `<option value="${n}">${n}</option>`).join("");
    selB.innerHTML = names.map(n => `<option value="${n}">${n}</option>`).join("");
    selA.value = resolveEmpireKey(defaultA, names[0]);
    selB.value = resolveEmpireKey(defaultB, names[1]);
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
    openCompareModal(empA, empB) {
      audio.playClickPop();
      initCompareSelectors(empA || "大汉帝国", empB || "罗马共和国 / 罗马帝国");
      document.getElementById("compare-modal").style.display = "flex";
      this.renderComparison();
    },
    compareCurrentEmpire() {
      const state = engine.getStateAtYear(currentYear);
      const curEmp = state.owners[selectedRegionId] || "大唐帝国";
      const secondEmp = curEmp === "罗马共和国 / 罗马帝国" ? "大汉帝国" : "罗马共和国 / 罗马帝国";
      this.openCompareModal(curEmp, secondEmp);
    },
    closeCompareModal() {
      document.getElementById("compare-modal").style.display = "none";
    },
    renderComparison() {
      const empA = document.getElementById("cmp-select-a").value;
      const empB = document.getElementById("cmp-select-b").value;
      const cmp = engine.getEmpireComparison(empA, empB);
      const maxArea = Math.max(100, cmp.a.areaNum, cmp.b.areaNum);
      const maxRegs = Math.max(1, cmp.a.maxRegions, cmp.b.maxRegions);
      const maxDur = Math.max(50, cmp.a.duration, cmp.b.duration);

      const renderCol = (d) => `
        <div class="cmp-col">
          <div class="cmp-title" style="color:${d.color}">${d.name}</div>
          <div class="cmp-sub">${d.era_span} · 首都：${d.capital}</div>
          <div class="cmp-metric">
            <div class="cmp-metric-head"><span>鼎盛疆域面积</span><strong>${d.peak_area}</strong></div>
            <div class="cmp-bar-bg"><div class="cmp-bar-fill" style="width:${Math.round((d.areaNum / maxArea) * 100)}%; background:${d.color}"></div></div>
          </div>
          <div class="cmp-metric">
            <div class="cmp-metric-head"><span>沙盘最大统辖区块</span><strong>${d.maxRegions} 个核心区</strong></div>
            <div class="cmp-bar-bg"><div class="cmp-bar-fill" style="width:${Math.round((d.maxRegions / maxRegs) * 100)}%; background:${d.color}"></div></div>
          </div>
          <div class="cmp-metric">
            <div class="cmp-metric-head"><span>政权延续跨度</span><strong>约 ${d.duration} 年 (${d.regime})</strong></div>
            <div class="cmp-bar-bg"><div class="cmp-bar-fill" style="width:${Math.round((d.duration / maxDur) * 100)}%; background:${d.color}"></div></div>
          </div>
          <div class="cmp-desc">${d.desc}</div>
          <button class="cmp-jump-btn" onclick="AtlasApp.jumpToEmpirePeak('${d.name}', ${d.peakYear})">
            ▶ 跳转至其鼎盛年 (${formatYear(d.peakYear)}) 并高亮版图
          </button>
        </div>
      `;

      document.getElementById("compare-body").innerHTML = `<div class="cmp-grid">${renderCol(cmp.a)}${renderCol(cmp.b)}</div>`;
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
